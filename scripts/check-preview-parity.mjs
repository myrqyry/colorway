import { cleanupBrowserProfile } from './browser-profile-cleanup.mjs';
// Runtime gate: compare browser paint with OBS QSS-derived roles and asset URLs.
// Run via pnpm check:preview; requires local Chromium, no external network.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const chromium = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
if (!existsSync(chromium)) throw new Error('Chromium unavailable; set CHROMIUM_PATH');
const profile = mkdtempSync('/tmp/colorway-parity-');
const port = Number(process.env.COLORWAY_PREVIEW_PORT || 5189);
// The served document must be Colorway's own build. A bare HTTP 200 is not enough:
// any unrelated dev server left on this port would satisfy a status-only probe and
// the run would then fail later with a misleading "catalog did not mount".
// `pnpm build` emits a hashed /assets/ bundle and rewrites the module entry, so the
// title plus an #app mount point is the stable marker across dev and preview.
const servedAsColorway = async (url) => {
  try {
    const body = await (await fetch(url)).text();
    return body.includes('Colorway OBS Theme Preview') && body.includes('id="app"');
  } catch {
    return false;
  }
};
if (await servedAsColorway(`http://127.0.0.1:${port}/`)) {
  throw Error(`Port ${port} already serves a Colorway build; refusing to reuse a foreign server. ` +
    'Stop it or set COLORWAY_PREVIEW_PORT to a free port.');
}
const server = spawn('./node_modules/.bin/vite', ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const browser = spawn(chromium, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--no-first-run', '--remote-debugging-port=0', '--remote-allow-origins=*',
  '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });

let ws;
const fail = (message, details) => { throw Error(message + ': ' + JSON.stringify(details)); };

function inspect() {
  const root = document.documentElement;
  const vars = getComputedStyle(root);
  const eye = document.querySelector('.obs-sim-row-actions [data-source-action="visible"] .obs-sim-svg-icon');
  const selected = document.querySelector('.obs-sim-list-row.selected');
  const pattern = getComputedStyle(document.querySelector('.obs-sim-dialog-content')).backgroundImage;
  const status = document.querySelector('.obs-sim-status-icon');
  const actualAsset = vars.getPropertyValue('--cw_icon_eye_base').trim();
  const renderedAsset = getComputedStyle(eye).backgroundImage;
  const probe = document.createElement('span');
  probe.style.color = 'var(--on_primary)';
  root.append(probe);
  const expectedInk = getComputedStyle(probe).color;
  probe.remove();
  for (const button of document.querySelectorAll('.obs-sim-control[data-control]')) {
    if (button.getAttribute('aria-pressed') !== 'true') button.click();
  }
  const roles = { stream: '--live', record: '--recording', virtualcam: '--lavender_accent', studio: '--primary' };
  const controls = [...document.querySelectorAll('.obs-sim-control[data-control]')].map((button) => {
    probe.style.color = 'var(' + roles[button.dataset.control] + ')';
    root.append(probe);
    const expectedBorder = getComputedStyle(probe).color;
    probe.remove();
    return { role: button.dataset.control, expectedBorder, border: getComputedStyle(button).borderTopColor };
  });
  return {
    file: document.querySelector('.theme-row.active')?.dataset.file,
    actualAsset, renderedAsset, expectedInk, selectedInk: getComputedStyle(selected).color,
    pattern, statusMask: getComputedStyle(status).maskImage, controls,
    statusActive: [
      document.querySelector('[data-stream-indicator]')?.dataset.state,
      document.querySelector('[data-record-indicator]')?.dataset.state,
      document.querySelector('[data-network-indicator]')?.dataset.state,
    ],
  };
}

try {
  for (let i = 0; i < 100; i++) {
    try {
      if (await servedAsColorway('http://127.0.0.1:' + port + '/')) break;
    } catch {}
    if (i === 99) throw Error(`Vite preview did not start serving Colorway on port ${port}`);
    await delay(100);
  }
  let chromePort;
  for (let i = 0; i < 100; i++) {
    try {
      chromePort = Number(readFileSync(profile + '/DevToolsActivePort', 'utf8').split('\n')[0]);
      if (chromePort) break;
    } catch {}
    if (i === 99) throw Error('Chromium DevTools did not start');
    await delay(100);
  }
  const pages = await (await fetch('http://127.0.0.1:' + chromePort + '/json')).json();
  const target = pages.find((x) => x.type === 'page');
  if (!target) throw Error('Chromium page unavailable');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let seq = 0;
  const calls = new Map();
  ws.addEventListener('message', (event) => {
    const result = JSON.parse(event.data);
    if (!result.id || !calls.has(result.id)) return;
    const { resolve, reject } = calls.get(result.id);
    calls.delete(result.id);
    if (result.error) reject(Error(JSON.stringify(result.error)));
    else resolve(result.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    calls.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  if (process.argv.includes('--qt-reference') || process.argv.includes('--obs-screenshots') || process.argv.includes('--replica-reference')) {
    await send('Emulation.setFocusEmulationEnabled', {enabled: true});
    await send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
    await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false});
  }
  await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/' });
  for (let i = 0; i < 120; i++) {
    if (await evaluate('document.querySelectorAll(".theme-row").length') >= 166) break;
    if (i === 119) throw Error('Theme catalog did not mount');
    await delay(100);
  }
  // Pause the shuffle so it cannot change variants during the fidelity comparison.
  if (await evaluate('document.querySelector("#slideshow-pause")?.getAttribute("aria-pressed")') === 'false') {
    await evaluate('document.querySelector("#slideshow-pause").click()');
  }

  for (const file of ['Colorway-CatppuccinLatte-Blue.ovt', 'Colorway-Monokai.ovt']) {
    await evaluate('document.querySelector("#theme-category-filter").value = "all"');
    await evaluate('document.querySelector("#theme-category-filter").dispatchEvent(new Event("change",{bubbles:true}))');
    await evaluate('document.querySelector("#theme-search").value = ""');
    await evaluate('document.querySelector("#theme-search").dispatchEvent(new Event("input",{bubbles:true}))');
    await evaluate('document.querySelector(' + JSON.stringify('.theme-row[data-file="' + file + '"]') + ')?.click()');
    for (let i = 0; i < 60; i++) {
      if (await evaluate('document.querySelector(".theme-row.active")?.dataset.file') === file) break;
      if (i === 59) throw Error('Theme selection did not settle: ' + file);
      await delay(100);
    }
    if (process.argv.includes('--replica-reference')) {
      // The state gate exercises active controls after each capture. Start
      // each screenshot with the same idle controls as the OBS reference.
      await evaluate('document.querySelectorAll(".obs-sim-control[data-control][aria-pressed=true]").forEach(button => button.click())');
      // Actual production replica: use its own layout and the normal visible UI.
      const geometry=await evaluate(`(async()=>{
        await document.fonts.ready;
        const root=document.querySelector('.obs-sim-window');
        root.scrollIntoView({block:'start',behavior:'instant'});
        const origin=root.getBoundingClientRect();
        const rect=selector=>{
          const r=root.querySelector(selector).getBoundingClientRect();
          return {x:r.x-origin.x,y:r.y-origin.y,width:r.width,height:r.height};
        };
        const boxes=Object.fromEntries(Object.entries({
          sceneBody:'.scenes .obs-sim-dock-body',sourceBody:'.sources .obs-sim-dock-body',
          sceneTitle:'.scenes .obs-sim-dock-title',sceneFooter:'.scenes .obs-sim-dock-footer',
          mixerBody:'.mixer .obs-sim-dock-body',controlsBody:'.controls .obs-sim-dock-body',
          left:'.obs-sim-left-column',right:'.obs-sim-main-column',
          mixer:'.obs-sim-mixer-slot',transitions:'.obs-sim-transition-slot',controls:'.obs-sim-controls-slot',
          sceneRow:'.scenes .obs-sim-list-row.selected',sourceRow:'.sources .obs-sim-list-row.selected',
          indicator:'.sources .obs-sim-icon-button',title:'.obs-sim-titlebar'
        }).map(([key,selector])=>[key,rect(selector)]));
        return {clip:{x:origin.x+scrollX,y:origin.y+scrollY,width:origin.width,height:origin.height,scale:1},boxes};
      })()`);
      const shot=await send('Page.captureScreenshot',{format:'png',clip:geometry.clip,captureBeyondViewport:true});
      const path=profile+'/'+file+'.png';
      writeFileSync(path,Buffer.from(shot.data,'base64'));
      if(process.env.COLORWAY_REPLICA_REPORT){
        writeFileSync(process.env.COLORWAY_REPLICA_REPORT+'/'+file+'.png',Buffer.from(shot.data,'base64'));
        writeFileSync(process.env.COLORWAY_REPLICA_REPORT+'/'+file+'.json',JSON.stringify(geometry,null,2));
      }
      const compare=spawnSync('/usr/bin/python3',['scripts/compare-replica-regions.py','public/obs-renders/'+file+'.webp',path,JSON.stringify(geometry)],{encoding:'utf8'});
      console.log(compare.stdout);
      if(compare.status!==0)fail('Replica differs from measured native regions',compare.stderr);
      const mixer=await evaluate(`(()=>{
        const ch=document.querySelector('.obs-sim-vchannel');
        const stage=ch.querySelector('.obs-sim-vchannel-stage').getBoundingClientRect();
        const fader=ch.querySelector('.obs-sim-vfader').getBoundingClientRect();
        const meter=ch.querySelector('.obs-sim-vmeter').getBoundingClientRect();
        const action=ch.querySelector('.obs-sim-vchannel-actions').getBoundingClientRect();
        const mute=ch.querySelector('[data-mute]'), monitor=ch.querySelector('[data-monitor]');
        const vars=getComputedStyle(document.documentElement);
        const check=(button,token)=>{
          button.click();
          const img=getComputedStyle(button.querySelector('.obs-sim-svg-icon')).backgroundImage;
          const expected=vars.getPropertyValue(token).trim().match(/url\(["']?([^"')]+)["']?\)/)?.[1];
          const good=button.getAttribute('aria-pressed')==='true'&&expected&&img.includes(expected);
          button.click();
          return good&&button.getAttribute('aria-pressed')==='false';
        };
        return {stageBottom:stage.bottom,faderBottom:fader.bottom,meterBottom:meter.bottom,actionTop:action.top,
          mute:check(mute,'--cw_mixer_muted'),monitor:check(monitor,'--cw_mixer_monitor')};
      })()`);
      if(Math.max(mixer.faderBottom,mixer.meterBottom,mixer.stageBottom)>mixer.actionTop+1 || !mixer.mute || !mixer.monitor)
        fail('Mixer controls overlap or use incorrect authored state icons',mixer);
      console.log('Mixer bounds and authored mute/monitor icons PASS',file);

    }
    if (process.argv.includes('--obs-screenshots')) {
      const expected='/obs-renders/'+encodeURIComponent(file)+'.webp';
      for(let i=0;i<100;i++){
        const ready=await evaluate('document.querySelector("[data-obs-capture-image]")?.dataset.file === '+JSON.stringify(file));
        if(ready)break;
        if(i===99)fail('Native OBS screenshot did not load',file);
        await delay(100);
      }
      const info=await evaluate(`(() => {
        const im=document.querySelector('[data-obs-capture-image]');
        const panel=document.querySelector('[data-obs-capture]');
        const picker=panel.querySelector('select');
        const r=im.getBoundingClientRect();
        return {src:im.getAttribute('src'),width:im.naturalWidth,height:im.naturalHeight,
          visible:!im.hidden && r.width>0 && r.height>0,
          selected:picker.value, count:picker.options.length, href:panel.querySelector('[data-obs-capture-full]').getAttribute('href')};
      })()`);
      if(info.src!==expected||info.href!==expected||info.width!==1280||info.height!==960||
         !info.visible||info.selected!==file||info.count!==166)fail('Wrong or invisible real OBS screenshot',{file,info});
      const bytes=await evaluate(`(async()=>{
        const response=await fetch(${JSON.stringify(expected)});
        const digest=await crypto.subtle.digest('SHA-256',await response.arrayBuffer());
        return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
      })()`);
      const manifest=JSON.parse(readFileSync('public/obs-renders/index.json','utf8')).themes.find(t=>t.file===file);
      if(bytes!==manifest.sha256)fail('Browser fetched incorrect native screenshot',file);
      console.log('Actual OBS WebP PASS',file,info.width+'x'+info.height);
    }
    const data = await evaluate('(' + inspect.toString() + ')()');
    if (process.argv.includes('--qt-reference')) {
      const result = spawnSync(process.env.COLORWAY_QT_PYTHON || '/usr/bin/python3',
        ['scripts/qt-preview-reference.py'], {
          input: JSON.stringify({ base: readFileSync('themes/Colorway.obt', 'utf8'),
            variant: readFileSync('themes/' + file, 'utf8'), root: process.cwd() }),
          encoding: 'utf8', timeout: 15000,
        });
      if (result.status !== 0) fail('Qt reference unavailable', result.stderr);
      if (!await evaluate('document.documentElement.hasAttribute("data-colorway-catalog")')) fail('Catalog projection not active', file);
      const reference = JSON.parse(result.stdout);
      for (const [family, selector] of [
        ['combo', '[data-obs-pattern-select]'],
        ['lineEdit', '.demo-input:not(:disabled)'],
      ]) {
        const native = reference[family];
        await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 0, y: 0});
        const web = await evaluate(`(async () => {
          const combo = document.querySelector(${JSON.stringify(selector)});
          if (!combo || !combo.getBoundingClientRect().height) throw Error('Mapped control not visible');
          const hex = value => '#' + value.match(/\\d+/g).slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('');
          const sample = () => { const css = getComputedStyle(combo); return {
            background: hex(css.backgroundColor), border: hex(css.borderLeftColor),
            height: combo.getBoundingClientRect().height, borderWidth: css.borderLeftWidth,
            focused: combo.matches(':focus'), hovered: combo.matches(':hover')
          }; };
          const settle = () => new Promise(resolve => setTimeout(resolve, 250));
          combo.blur();
          await settle();
          const normal = sample();
          combo.focus({preventScroll: true});
          if (document.activeElement !== combo) throw Error('Mapped control cannot receive focus');
          await settle();
          const focus = sample();
          combo.blur();
          combo.scrollIntoView({block: 'center', inline: 'center', behavior: 'instant'});
          const rect = combo.getBoundingClientRect();
          const point = {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
          if (document.elementFromPoint(point.x, point.y) !== combo) throw Error('Mapped control is obscured: ' + JSON.stringify({point, hit: document.elementFromPoint(point.x, point.y)?.outerHTML.slice(0, 300)}));
          return {normal, focus, point};
        })()`);
        await send('Input.dispatchMouseEvent', {type: 'mouseMoved', ...web.point});
        await delay(250);
        web.hover = await evaluate(`(() => {
          const combo = document.querySelector(${JSON.stringify(selector)});
          const css = getComputedStyle(combo);
          const hex = value => '#' + value.match(/\\d+/g).slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('');
          return {background: hex(css.backgroundColor), border: hex(css.borderLeftColor),
            height: combo.getBoundingClientRect().height, borderWidth: css.borderLeftWidth,
            focused: combo.matches(':focus'), hovered: combo.matches(':hover')};
        })()`);
        if (!web.hover.hovered || web.hover.focused || !web.focus.focused || web.focus.hovered || web.normal.focused || web.normal.hovered)
          fail('Browser combo state did not settle', web);
        await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 0, y: 0});
        delete web.point;
        console.log('Qt comparison', file, family, JSON.stringify({native, web}));
        for (const state of ['normal', 'focus', 'hover']) {
          for (const field of ['background', 'border']) {
            if (web[state][field] !== native[state][field])
              fail('Qt ' + family + ' ' + state + ' ' + field + ' mismatch', {file, native: native[state], web: web[state]});
          }
          if (web[state].borderWidth !== '2px') fail('Browser combo frame differs from native QSS', web[state]);
          if (web[state].height < native[state].minimumHeight)
            fail('Browser control below Qt minimum', {file, native: native[state], web: web[state]});
        }
      }
      // Validate the actual visible showcase, rather than detached test elements.
      const projected = await evaluate(`(() => {
        const probe = document.createElement('span');
        document.body.append(probe);
        const color = token => { probe.style.color = 'var(' + token + ')'; return getComputedStyle(probe).color; };
        const checks = [
          ['.demo-check input:checked:not(:disabled)', 'backgroundColor', '--bg_base'],
          ['.demo-check input:checked:not(:disabled)', 'borderTopColor', '--primary'],
          ['.demo-radio input:checked:not(:disabled)', 'backgroundColor', '--primary'],
          ['.demo-radio input:checked:not(:disabled)', 'borderTopColor', '--bg_base'],
          ['.demo-check input:disabled', 'backgroundColor', '--button_bg_disabled'],
          ['.demo-list-item.selected', 'backgroundColor', '--primary'],
          ['.demo-tab.active', 'backgroundColor', '--surface1'],
          ['.demo-progress-fill', 'backgroundColor', '--primary'],
          ['.demo-button:not(.primary):not(.recording):not(:disabled)', 'color', '--on_button'],
        ].map(([selector, property, token]) => {
          const el = document.querySelector(selector);
          return {selector, property, visible: !!el?.getClientRects().length,
            actual: el ? getComputedStyle(el)[property] : null, expected: color(token)};
        });
        const check = document.querySelector('.demo-check input:checked:not(:disabled)');
        const icon = getComputedStyle(check).backgroundImage;
        probe.remove();
        return {checks, icon};
      })()`);
      if (projected.checks.some(x => !x.visible || x.actual !== x.expected))
        fail('Visible QSS projection mismatch', projected.checks.filter(x => !x.visible || x.actual !== x.expected));
      if (!projected.icon.includes('/mingcute/') || !projected.icon.includes('check'))
        fail('Native checkbox SVG missing from the browser', projected.icon);
      console.log('CSS fallback projection PASS', file, projected.checks.length, 'checks');
    }
    if (!data.actualAsset.includes('/icons/colorway/mingcute/') || !data.renderedAsset.includes('/icons/colorway/mingcute/'))
      fail('Icon is not the authored OBS SVG', data);
    const polarity = data.actualAsset.match(/\/(normal|selected)\/eye\.svg/)?.[0];
    if (!polarity || !data.renderedAsset.includes(polarity)) fail('Icon polarity differs from OBS theme', data);
    if (!data.pattern.includes('/patterns/') || !data.statusMask.includes('/mingcute/status/'))
      fail('Pattern or semantic status asset is missing', data);
    if (data.selectedInk !== data.expectedInk) fail('QSS selected ink mismatch', data);
    if (data.controls.some((control) => control.border !== control.expectedBorder))
      fail('OBS active-control color mismatch', data);
    if (data.statusActive.some((value) => value !== 'active')) fail('Status states did not react', data);
    console.log('PASS', file, polarity, 'icon, ink, QSS active roles, pattern, statuses');
  }
  if(process.argv.includes('--obs-screenshots')){
    // Exercise the new visible browser, rather than only the hidden data rows.
    const point=await evaluate(`(()=>{
      const search=document.querySelector('[data-obs-capture] input');
      search.scrollIntoView({block:'center',behavior:'instant'});
      const r=search.getBoundingClientRect();
      return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    if(!await evaluate('document.elementFromPoint('+point.x+','+point.y+') === document.querySelector("[data-obs-capture] input")'))fail('Native preview search is obscured',point);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
    await send('Input.insertText',{text:'Fairyfloss'});
    const matches=await evaluate('Array.from(document.querySelector("[data-obs-capture] select").options).map(o=>o.value)');
    if(matches.length!==1||matches[0]!=='Colorway-Fairyfloss.ovt')fail('Screenshot search did not filter catalog',matches);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    for(let i=0;i<80;i++){
      if(await evaluate('document.querySelector("[data-obs-capture-image]").dataset.file')==='Colorway-Fairyfloss.ovt')break;
      if(i===79)fail('Visible search did not select real screenshot',matches);
      await delay(100);
    }
    await evaluate('(()=>{const el=document.querySelector("[data-obs-capture] input");el.value="";el.dispatchEvent(new Event("input",{bubbles:true}));el.blur()})()');
    const next=await evaluate(`(()=>{
      const panel=document.querySelector('[data-obs-capture]');
      const picker=panel.querySelector('select'), btn=panel.querySelector('[data-obs-capture-step="1"]');
      const expected=picker.options[(picker.selectedIndex+1)%picker.options.length].value;
      btn.scrollIntoView({block:'center',behavior:'instant'});
      const r=btn.getBoundingClientRect();
      return {expected,x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:next.x,y:next.y,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:next.x,y:next.y,button:'left',clickCount:1});
    for(let i=0;i<80;i++){
      if(await evaluate('document.querySelector("[data-obs-capture-image]").dataset.file')===next.expected)break;
      if(i===79)fail('Next theme button did not select real screenshot',next);
      await delay(100);
    }
    console.log('Visible screenshot search and next-theme navigation PASS');
  }
  const discardedPopup = await evaluate(`(() => ({
    lab: !!document.querySelector('[data-state-lab]'),
    launcher: !!document.querySelector('[data-open-state-lab], [data-permanent-open-state-lab]')
  }))()`)
  if (discardedPopup.lab || discardedPopup.launcher) fail('Removed state lab is still mounted', discardedPopup);

  console.log('Chromium preview parity PASS');
} finally {
  ws?.close();
  server.kill('SIGTERM');
  await cleanupBrowserProfile(browser, profile);
}
