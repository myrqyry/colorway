import { cleanupBrowserProfile } from './browser-profile-cleanup.mjs';
// Runtime gate: compare browser paint with OBS QSS-derived roles and asset URLs.
// Run via pnpm check:preview; requires local Chromium, no external network.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
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
  if (process.argv.includes('--qt-reference') || process.argv.includes('--qt-skins')) {
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
    if (process.argv.includes('--qt-skins')) {
      for (let i=0;i<80;i++) {
        if (await evaluate('document.documentElement.getAttribute("data-colorway-skin")') === file) break;
        if (i===79) fail('Native skin failed to load', file);
        await delay(100);
      }
      const skin = await evaluate(`(() => {
        const root=document.documentElement;
        const combo=document.querySelector('[data-obs-pattern-select]');
        const check=document.querySelector('.demo-check input:not(:disabled)');
        const input=document.querySelector('.demo-input:not(:disabled)');
        const button=document.querySelector('.demo-button:not(.primary):not(.recording):not(:disabled)');
        const slider=document.querySelector('.demo-slider');
        const radio=document.querySelector('.demo-radio input:not(:disabled):checked');
        return {combo:getComputedStyle(combo).borderImageSource, field:getComputedStyle(input).borderImageSource,
          button:getComputedStyle(button).borderImageSource, check:getComputedStyle(check).backgroundImage,
          radio:getComputedStyle(radio).backgroundImage, slider:getComputedStyle(slider,'::-webkit-slider-thumb').backgroundImage,
          widths:[combo,input,button,check,radio,slider].map(el=>el.getBoundingClientRect().width),
          variables:getComputedStyle(root).getPropertyValue('--qt-combo-normal').trim()};
      })()`);
      for(const family of ['combo','field','button','check','radio'])
        if(!skin[family].includes('data:image/')) fail('Native skin not used by ' + family, {file,skin:skin[family].slice(0,80)});
      if(skin.widths.some(w=>w<=0)) fail('Native control not laid out', skin.widths);
      const pack=JSON.parse(readFileSync('public/qt-skins/'+file+'.json','utf8'));
      if (!skin.combo.includes(pack.skins.combo.normal.src) && !skin.combo.includes(pack.skins.combo.hover.src)
          && !skin.combo.includes(pack.skins.combo.focus.src)) fail('Stale combo asset',file);
      const point = await evaluate(`(() => {
        const check=document.querySelector('.demo-check input:not(:disabled)');
        check.scrollIntoView({block:'center',behavior:'instant'});
        const r=check.getBoundingClientRect();
        return {x:r.x+r.width/2,y:r.y+r.height/2,checked:check.checked};
      })()`);
      if (!await evaluate('document.elementFromPoint('+point.x+','+point.y+') === document.querySelector(".demo-check input:not(:disabled)")')) fail('Checkbox is obscured',point);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});
      await send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
      const toggled = await evaluate(`(() => {
        const check=document.querySelector('.demo-check input:not(:disabled)');
        return {checked:check.checked, image:getComputedStyle(check).backgroundImage};
      })()`);
      if(toggled.checked===point.checked)fail('Native-backed checkbox did not toggle',file);
      const state=toggled.checked?'checkedHover':'hover';
      if(!toggled.image.includes(pack.skins.checkbox[state].src))fail('Checkbox image state did not update',state);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
      const clip=await evaluate(`(() => {
        const check=document.querySelector('.demo-check input:not(:disabled)');
        check.blur();
        const r=check.getBoundingClientRect();
        return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};
      })()`);
      const expected=pack.skins.checkbox[toggled.checked?'checked':'normal'];
      if(clip.width!==expected.width||clip.height!==expected.height)fail('Indicator dimensions differ from Qt',{clip,expected:[expected.width,expected.height]});
      const shot=await send('Page.captureScreenshot',{format:'png',clip});
      const comparison=await evaluate(`(async () => {
        const decode=async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
        const a=await decode(${JSON.stringify(expected.src)}), b=await decode(${JSON.stringify('data:image/png;base64,'+shot.data)});
        let compared=0, matching=0;
        for(let i=0;i<a.length;i+=4)if(a[i+3]===255){
          compared++;
          if(Math.max(...[0,1,2].map(c=>Math.abs(a[i+c]-b[i+c])))<=1)matching++;
        }
        return {compared,matching};
      })()`);
      if(comparison.compared<50||comparison.matching/comparison.compared<0.95)fail('Visible indicator paint differs from Qt',comparison);
      // Real browser keyboard text editing; do not bake the specimen's text into its skin.
      const original=await evaluate(`(() => {
        const el=document.querySelector('.demo-input:not(:disabled)');const value=el.value;el.scrollIntoView({block:'center',behavior:'instant'});el.focus();el.select();return value;
      })()`);
      await send('Input.insertText',{text:'Live value'});
      if(await evaluate('document.querySelector(".demo-input:not(:disabled)").value')!=='Live value')fail('Native-backed field is not editable',file);
      await evaluate('document.querySelector(".demo-input:not(:disabled)").value='+JSON.stringify(original)+';document.querySelector(".demo-input:not(:disabled)").blur()');
      // The Pattern selector remains a genuine select; exercise its keyboard
      // selection and assert the entire native arrow strip is painted.
      const comboClip=await evaluate(`(() => {
        const el=document.querySelector('[data-obs-pattern-select]');
        el.scrollIntoView({block:'center',behavior:'instant'});el.blur();
        const r=el.getBoundingClientRect();
        return {x:r.right+scrollX-30,y:r.y+scrollY,width:30,height:r.height,scale:1};
      })()`);
      const comboShot=await send('Page.captureScreenshot',{format:'png',clip:comboClip});
      const arrow=await evaluate(`(async () => {
        async function decode(src){const img=new Image();img.src=src;await img.decode();return img;}
        const a=await decode(${JSON.stringify(pack.skins.combo.normal.src)}),b=await decode(${JSON.stringify('data:image/png;base64,'+comboShot.data)});
        const c=document.createElement('canvas');c.width=30;c.height=b.naturalHeight;
        const ctx=c.getContext('2d');
        ctx.drawImage(a,a.naturalWidth-30,0,30,a.naturalHeight,0,0,30,c.height);
        const expected=ctx.getImageData(0,0,c.width,c.height).data;
        ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(b,0,0);
        const seen=ctx.getImageData(0,0,c.width,c.height).data;
        let matching=0,total=0;
        for(let y=2;y<c.height-2;y++)for(let x=2;x<28;x++){
          let i=(y*c.width+x)*4;total++;
          if(Math.max(...[0,1,2].map(n=>Math.abs(expected[i+n]-seen[i+n])))<=3)matching++;
        }
        return {matching,total,height:c.height,nativeHeight:a.naturalHeight};
      })()`);
      if(arrow.matching/arrow.total<0.85)fail('Visible combo arrow strip differs from Qt',arrow);
      const pattern=await evaluate(`(() => {
        const el=document.querySelector('[data-obs-pattern-select]');el.focus();return {index:el.selectedIndex,count:el.options.length};
      })()`);
      if(pattern.count<2)fail('Pattern catalog missing options',file);
      const key=pattern.index<pattern.count-1?'ArrowDown':'ArrowUp';
      await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:key==='ArrowDown'?40:38});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:key==='ArrowDown'?40:38});
      if(await evaluate('document.querySelector("[data-obs-pattern-select]").selectedIndex')===pattern.index)fail('Native-backed select did not change option',file);
      await evaluate('(()=>{const el=document.querySelector("[data-obs-pattern-select]");el.selectedIndex='+pattern.index+';el.dispatchEvent(new Event("change",{bubbles:true}));el.blur()})()');
      const before=await evaluate(`(() => {
        const el=document.querySelector('.demo-slider');el.scrollIntoView({block:'center',behavior:'instant'});el.focus();return Number(el.value);
      })()`);
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
      const slider=await evaluate(`(() => {
        const el=document.querySelector('.demo-slider'), r=el.getBoundingClientRect(), root=getComputedStyle(document.documentElement);
        el.blur();const w=parseFloat(root.getPropertyValue('--qt-slider-normal-w')), h=parseFloat(root.getPropertyValue('--qt-slider-normal-h'));
        const pct=(Number(el.value)-Number(el.min))/(Number(el.max)-Number(el.min));
        return {value:Number(el.value),clip:{x:r.x+scrollX+(r.width-w)*pct,y:r.y+scrollY+(r.height-h)/2,width:w,height:h,scale:1}};
      })()`);
      if(slider.value===before)fail('Native-backed slider did not change value',file);
      const sliderShot=await send('Page.captureScreenshot',{format:'png',clip:slider.clip});
      const thumb=await evaluate(`(async () => {
        const decode=async(src)=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
        const a=await decode(${JSON.stringify(pack.skins.slider.normal.src)}),b=await decode(${JSON.stringify('data:image/png;base64,'+sliderShot.data)});
        let matching=0,total=0;
        for(let i=0;i<a.length;i+=4)if(a[i+3]===255){total++;if(Math.max(...[0,1,2].map(c=>Math.abs(a[i+c]-b[i+c])))<=3)matching++;}
        return {matching,total};
      })()`);
      if(thumb.total<30||thumb.matching/thumb.total<0.9)fail('Visible slider thumb differs from Qt',thumb);
      await evaluate('(()=>{const el=document.querySelector(".demo-slider");el.value='+before+';el.dispatchEvent(new Event("input",{bubbles:true}));})()');
      const atlas=await evaluate(`(async () => {
        const details=document.querySelector('[data-qt-atlas]'), image=details.querySelector('img');
        const loadedWhileClosed=!details.open && image.hasAttribute('src');
        if(!details.open)details.open=true;
        for(let i=0;i<50&&!image.getAttribute('src');i++) await new Promise(r=>setTimeout(r,20));
        await image.decode();
        return {hidden:details.hidden,src:image.getAttribute('src'),width:image.naturalWidth,loadedWhileClosed};
      })()`);
      if(atlas.hidden||atlas.loadedWhileClosed||atlas.src!=='/qt-skins/'+encodeURIComponent(file)+'.webp'||atlas.width<1000)fail('Native WebP reference failed',atlas);
      console.log('Native packs and visible Qt paint PASS',file,{indicator:comparison,arrow,thumb,atlas:atlas.width});
    }
    const data = await evaluate('(' + inspect.toString() + ')()');
    if (process.argv.includes('--qt-reference')) {
      // Keep the original color-role gate for the CSS fallback, separately
      // from the image-backed preview gate.
      for (let i=0;i<80;i++) {
        if (await evaluate('document.documentElement.getAttribute("data-colorway-skin")') === file) break;
        if (i===79) fail('Native skin failed to settle before fallback test',file);
        await delay(100);
      }
      const mountedSkin = await evaluate('document.documentElement.getAttribute("data-colorway-skin")');
      await evaluate('document.documentElement.removeAttribute("data-colorway-skin")');
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
      if (mountedSkin) await evaluate('document.documentElement.setAttribute("data-colorway-skin", ' + JSON.stringify(mountedSkin) + ')');
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
