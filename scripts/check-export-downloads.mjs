// Exercise Colorway's *browser* export buttons and inspect real downloaded bytes.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { unzipSync, strFromU8 } from 'fflate';
import { cleanupBrowserProfile } from './browser-profile-cleanup.mjs';

const chromium = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
assert.ok(existsSync(chromium), 'Chromium required for export smoke');
const profile = mkdtempSync(join(tmpdir(), 'colorway-exports-'));
const port = 5194;
const server = spawn('./node_modules/.bin/vite', ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const browser = spawn(chromium, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--window-size=1400,960',
  '--no-first-run', '--remote-debugging-port=0', '--remote-allow-origins=*',
  '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });
let ws;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:' + port)).ok) break; } catch {}
    if (i === 99) throw Error('Vite preview failed to start');
    await delay(100);
  }
  let debugPort;
  for (let i = 0; i < 100; i++) {
    try {
      debugPort = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      if (debugPort) break;
    } catch {}
    if (i === 99) throw Error('Chromium DevTools did not start');
    await delay(100);
  }
  const target = (await (await fetch('http://127.0.0.1:' + debugPort + '/json')).json())
    .find((item) => item.type === 'page');
  assert.ok(target, 'Chromium page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let counter = 0;
  const pending = new Map();
  ws.addEventListener('message', ({data}) => {
    const packet = JSON.parse(data);
    if (!packet.id || !pending.has(packet.id)) return;
    const {resolve, reject} = pending.get(packet.id);
    pending.delete(packet.id);
    packet.error ? reject(Error(JSON.stringify(packet.error))) : resolve(packet.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++counter;
    pending.set(id, {resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate = async (expression) => {
    const reply = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    if (reply.exceptionDetails) throw Error('Page JavaScript failed: '+JSON.stringify(reply.exceptionDetails));
    return reply.result.value;
  };
  const until = async (check, message) => {
    for (let i = 0; i < 160; i++) {
      const value = await check();
      if (value) return value;
      await delay(100);
    }
    throw Error('Timed out: '+message);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  // UI hit-testing must not target a view-transition snapshot or intro overlay.
  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await send('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: profile});
  await send('Page.navigate', {url: 'http://127.0.0.1:' + port + '/'});
  await until(() => evaluate('document.querySelectorAll(".theme-row").length >= 166'), 'theme catalog');
  await until(() => evaluate('!document.querySelector("#colorway-intro")'), 'opening animation and handoff completed');
  await until(() => evaluate('!!document.querySelector("#workbench-export-list [data-export-kind]")'), 'export panel mount');
  await evaluate('document.querySelector("#slideshow-pause")?.getAttribute("aria-pressed") === "false" && document.querySelector("#slideshow-pause").click()');
  const chosen = 'Colorway-RosePineMoon-Love.ovt';
  await evaluate('document.querySelector('+JSON.stringify('.theme-row[data-file="'+chosen+'"]')+').click()');
  await until(() => evaluate('document.querySelector(".theme-row.active")?.dataset.file === '+JSON.stringify(chosen)), 'theme selection');
  // The real Colorway product surface hides workbench tabs. Require a
  // pointer-reachable route through the visible Download ZIP split menu.
  const visibleToggle = await evaluate(`(() => {
    const el=document.querySelector('[data-colorway-download-toggle]');
    if (!el) return false;
    const rect=el.getBoundingClientRect();
    return rect.width>0 && rect.height>0 && getComputedStyle(el).visibility==='visible';
  })()`);
  assert.ok(visibleToggle, 'visible product Download menu toggle missing');
  const clickExportToggle = async () => {
    await evaluate('document.querySelector("[data-colorway-download-toggle]").scrollIntoView({block:"center"})');
    const hit = await evaluate(`(() => {
      const button = document.querySelector('[data-colorway-download-toggle]');
      const rect = button.getBoundingClientRect();
      const x = Math.round(rect.left + rect.width / 2);
      const y = Math.round(rect.top + rect.height / 2);
      return {x, y, reachable:document.elementFromPoint(x,y)?.closest('[data-colorway-download-toggle]') === button};
    })()`);
    assert.equal(hit.reachable, true, 'Export button is not pointer-reachable');
    await send('Input.dispatchMouseEvent', {type:'mousePressed',x:hit.x,y:hit.y,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent', {type:'mouseReleased',x:hit.x,y:hit.y,button:'left',clickCount:1});
  };
  await clickExportToggle();
  const realMenu = await evaluate(`(() => {
    const menu=document.querySelector('[data-colorway-download-menu]');
    return !!menu && !menu.hidden && getComputedStyle(menu).display !== 'none';
  })()`);
  assert.ok(realMenu, 'visible product Download menu did not open');
  for (const kind of ['opencode-tui','opencode-desktop','orchis','bibata']) {
    assert.ok(await evaluate('!!document.querySelector('+JSON.stringify('[data-colorway-download-kind="'+kind+'"]')+')'), 'missing visible Download option: '+kind);
  }
  await clickExportToggle();
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".workbench-tabs")).display'), 'none',
    'real product surface should not depend on hidden workbench');
  const pointerClick = async (kind) => {
    await clickExportToggle();
    const point = await evaluate(`(() => {
      const menu=document.querySelector('[data-colorway-download-menu]');
      const option=menu.querySelector('[data-colorway-download-kind="${kind}"]');
      if (!option || menu.hidden || option.disabled) return { error: 'missing or disabled' };
      option.scrollIntoView({block:'nearest'});
      const rect=option.getBoundingClientRect();
      const x=Math.round(rect.left+rect.width/2), y=Math.round(rect.top+rect.height/2);
      const hit=document.elementFromPoint(x,y)?.closest('[data-colorway-download-kind]');
      return {x,y,hit:hit?.dataset.colorwayDownloadKind,element:document.elementFromPoint(x,y)?.tagName};
    })()`);
    if (point.hit !== kind) {
      const snap=await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
      writeFileSync('/tmp/colorway-export-hit-failure.png',Buffer.from(snap.data,'base64'));
    }
    assert.equal(point.hit, kind, 'visible product option is not pointer-reachable: '+JSON.stringify(point));
    await send('Input.dispatchMouseEvent', {type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent', {type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
  };
  for (const [kind, filename] of [
    ['opencode-tui', 'colorway-rose-pine-moon-love-opencode-tui.json'],
    ['opencode-desktop','colorway-rose-pine-moon-love-opencode-desktop.json'],
    ['orchis','colorway-rose-pine-moon-love-orchis-build-kit.zip'],
    ['bibata','colorway-rose-pine-moon-love-bibata-build-kit.zip'],
  ]) {
    await pointerClick(kind);
    const path = join(profile, filename);
    await until(() => existsSync(path) && readFileSync(path).length > 64, filename + ' download');
    if (filename.endsWith('.json')) {
      const json = JSON.parse(readFileSync(path, 'utf8'));
      assert.equal(json.$schema, kind === 'opencode-tui' ? 'https://opencode.ai/theme.json' : 'https://opencode.ai/desktop-theme.json');
      assert.equal(kind === 'opencode-tui' ? json.defs.primary : json.dark.palette.primary, '#eb6f92');
    } else {
      const entries = unzipSync(readFileSync(path));
      assert.deepEqual(Object.keys(entries).sort(), ['README.md','build.sh','palette.json','source.ovt']);
      const palette = JSON.parse(strFromU8(entries['palette.json']));
      assert.equal(palette.palette.primary, '#eb6f92');
      const bash = spawnSync('bash', ['-n'], { input: strFromU8(entries['build.sh']), encoding: 'utf8' });
      assert.equal(bash.status, 0, bash.stderr);
      const cli = join(process.env.HOME, 'loam/orchis-colorways/colorway-to-' + kind);
      if (existsSync(cli)) {
        const input = join(profile, kind+'-palette.json');
        writeFileSync(input, strFromU8(entries['palette.json']));
        const check = spawnSync(cli, ['--palette-json', input, '--dry-run',
          '--dest', join(profile, kind+'-dry-run')], {encoding:'utf8'});
        assert.equal(check.status, 0, check.stderr);
      }
    }
    console.log('PASS pointer-clicked visible product download', filename);
  }
  // Imported palettes replace the export source; don't silently export the
  // previously selected catalog item after Apply.
  await evaluate(`(async () => {
    const source = await fetch('/themes/Colorway-RosePineMoon-Love.ovt').then(r => r.text());
    const custom = source.replace('Rose Pine Moon — Love', 'Imported Sandbox');
    const data = new DataTransfer();
    data.items.add(new File([custom], 'custom.ovt', { type: 'text/plain' }));
    const input = document.querySelector('[data-colorway-settings-file]');
    input.files = data.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await until(() => evaluate('document.querySelector("#theme-status")?.textContent?.startsWith("Imported")'), 'visible Settings import applied');
  assert.equal(await evaluate('document.querySelector("#active-theme-name").textContent'), 'Imported Sandbox');
  await pointerClick('opencode-tui');
  const importedFile = join(profile, 'colorway-imported-sandbox-opencode-tui.json');
  await until(() => existsSync(importedFile), 'imported Colorway TUI export');
  assert.equal(JSON.parse(readFileSync(importedFile, 'utf8')).defs.primary, '#eb6f92');
  console.log('PASS visible Settings import exports its applied palette');

  // The converter cannot build light GTK themes; don't offer a fake build.
  await evaluate('document.querySelector('+JSON.stringify('.theme-row[data-file="Colorway-CatppuccinLatte-Blue.ovt"]')+').click()');
  await until(() => evaluate('document.querySelector(".theme-row.active")?.dataset.file === "Colorway-CatppuccinLatte-Blue.ovt"'), 'light theme selection');
  assert.equal(await evaluate('document.querySelector("[data-colorway-download-kind=orchis]").disabled'), true);
  assert.equal(await evaluate('document.querySelector("[data-colorway-download-kind=bibata]").disabled'), false);
  console.log('PASS light palette disables unsupported Orchis export');
  console.log('Browser export smoke PASS');
} finally {
  ws?.close();
  server.kill('SIGTERM');
  await cleanupBrowserProfile(browser, profile);
}
