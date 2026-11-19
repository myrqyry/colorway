import { mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { cleanupBrowserProfile } from './browser-profile-cleanup.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { referenceCatalog, referencePayload } from './build-qt-reference-atlas.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'colorway-format-parity-'));
const catalog = referenceCatalog();
const files = ['Colorway-Monokai.ovt', 'Colorway-CatppuccinLatte-Blue.ovt'];
try {
  const data = [];
  for (const file of files) {
    const folder = join(dir, file);
    const result = spawnSync(process.env.COLORWAY_QT_PYTHON || '/usr/bin/python3',
      [join(root, 'scripts/qt-preview-reference.py'), '--output', folder, '--format', 'png', '--format', 'webp', '--format', 'svg'],
      {input: JSON.stringify(referencePayload(catalog, file)), encoding:'utf8', timeout:30000});
    if (result.status !== 0) throw Error(result.error || result.stderr);
    const report = JSON.parse(result.stdout);
    for (const [family, states] of Object.entries(report)) {
      if (typeof states !== 'object') continue;
      for (const [state, sample] of Object.entries(states)) {
        const stem = family + '-' + state;
        const images = Object.fromEntries(['png', 'webp', 'svg'].map(format => {
          const bytes = readFileSync(join(folder, stem + '.' + format));
          return [format, 'data:image/' + (format === 'svg' ? 'svg+xml' : format) + ';base64,' + bytes.toString('base64')];
        }));
        data.push({file, stem, width:sample.width, height:sample.height, images, formats:sample.formats, hasTransparency:sample.hasTransparency});
      }
    }
    const images=Object.fromEntries(['png','webp'].map(format=>[format,'data:image/'+format+';base64,'+readFileSync(join(folder,'atlas.'+format)).toString('base64')]));
    data.push({file,stem:'atlas',images,hasTransparency:false});
  }
  const page = join(dir, 'compare.html');
  writeFileSync(page, '<!doctype html><meta charset="utf-8"><pre id="result">PENDING</pre><script>\n' +
    'const samples = ' + JSON.stringify(data) + ';\n' + String.raw`
    (async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', {willReadFrequently: true});
      async function pixels(url, width, height) {
        const img = new Image();
        img.src = url;
        await img.decode();
        canvas.width = width ?? img.naturalWidth; canvas.height = height ?? img.naturalHeight;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      }
      function compare(a, b) {
        let changed = 0, sum = 0;
        for (let i = 0; i < a.length; i += 4) {
          let pixel = 0;
          for (let c = 0; c < 4; c++) pixel += Math.abs(a[i+c]-b[i+c]);
          changed += Number(pixel !== 0);
          sum += pixel;
        }
        return {changed, pixels:a.length/4, meanChannelError:sum/a.length};
      }
      const reports = [];
      for (const sample of samples) {
        const {file, stem, width, height, images, formats, hasTransparency} = sample;
        const png = await pixels(images.png, width, height);
        const webp = await pixels(images.webp, width, height);
        const svg = images.svg ? compare(png,await pixels(images.svg,width,height)) : null;
        reports.push({file, stem, webp:compare(png,webp), svg, formats, hasTransparency});
      }
      document.getElementById('result').textContent = JSON.stringify(reports);
    })().catch(error => document.getElementById('result').textContent = 'ERROR: ' + error.message);
    ` + '</script>');
  const profile = join(dir, 'browser');
  const browser = spawn(process.env.CHROMIUM_PATH || '/usr/bin/chromium', [
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run',
    '--user-data-dir=' + profile,'--remote-debugging-port=0','--remote-allow-origins=*','about:blank',
  ], {stdio:'ignore'});
  let ws, report;
  try {
    let port;
    for (let i=0; i<100; i++) {
      try { port = Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]); } catch {}
      if (port) break;
      await delay(100);
    }
    if (!port) throw Error('Chromium did not start');
    const pages = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
    ws = new WebSocket(pages.find(p => p.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject) => {
      ws.addEventListener('open',resolve,{once:true});
      ws.addEventListener('error',reject,{once:true});
    });
    let id=0;
    const pending=new Map();
    ws.addEventListener('message',event=>{
      const message=JSON.parse(event.data);
      const callback=pending.get(message.id);
      if(callback) { pending.delete(message.id); callback(message); }
    });
    const send=(method,params={})=>new Promise((resolve,reject)=>{
      const key=++id;
      pending.set(key, message=> message.error ? reject(Error(JSON.stringify(message.error))) : resolve(message.result));
      ws.send(JSON.stringify({id:key,method,params}));
    });
    await send('Page.navigate',{url:pathToFileURL(page).href});
    for (let i=0;i<300;i++) {
      const value=await send('Runtime.evaluate',{expression:'document.querySelector("#result")?.textContent',returnByValue:true});
      report=value.result.value;
      if (report && report!=='PENDING') break;
      await delay(100);
    }
    if (!report || !report.startsWith('[')) throw Error('Browser comparison incomplete: ' + report);
  } finally {
    ws?.close();
    await cleanupBrowserProfile(browser,profile);
  }
  const results = JSON.parse(report);
  if (results.length !== data.length || results.some(r => !r.hasTransparency && r.webp.changed !== 0))
    throw Error('Opaque WebP browser parity failed: ' + JSON.stringify(results.filter(r => !r.hasTransparency && r.webp.changed)));
  const specimens = results.filter(r=>r.stem!=='atlas');
  console.log('Chromium: exact WebP pixels for', specimens.filter(r=>r.webp.changed===0).length, 'of', specimens.length, 'specimens');
  console.log('Chromium: exact SVG pixels for', specimens.filter(r=>r.svg.changed===0).length, 'of', specimens.length, 'specimens');
  console.log('Chromium: exact WebP atlas pixels for', results.filter(r=>r.stem==='atlas' && r.webp.changed===0).length, 'sheets');
  console.log('Transparent specimens using PNG for strict browser parity:', specimens.filter(r=>r.hasTransparency).length);
  for (const file of files) {
    const rows = specimens.filter(r=>r.file===file);
    console.log(file, JSON.stringify({
      pngBytes:readdirSync(join(dir,file)).filter(f=>f.endsWith('.png') && f!=='atlas.png').reduce((n,f)=>n+readFileSync(join(dir,file,f)).length,0),
      webpBytes:rows.reduce((n,r)=>n+r.formats.webp.bytes,0),
      svgBytes:rows.reduce((n,r)=>n+r.formats.svg.bytes,0),
      svgPixelsChanged:rows.reduce((n,r)=>n+r.svg.changed,0),
      pixels:rows.reduce((n,r)=>n+r.svg.pixels,0),
      webpPixelsChanged:rows.reduce((n,r)=>n+r.webp.changed,0),
      pngAtlasBytes:readFileSync(join(dir,file,'atlas.png')).length,
      webpAtlasBytes:readFileSync(join(dir,file,'atlas.webp')).length,
    }));
  }
} finally {
  rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:100});
}
