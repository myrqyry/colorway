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
  if (process.argv.includes('--qt-reference')) {
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
    const data = await evaluate('(' + inspect.toString() + ')()');
    if (process.argv.includes('--qt-reference')) {
      const result = spawnSync(process.env.COLORWAY_QT_PYTHON || '/usr/bin/python3',
        ['scripts/qt-preview-reference.py'], {
          input: JSON.stringify({ base: readFileSync('themes/Colorway.obt', 'utf8'),
            variant: readFileSync('themes/' + file, 'utf8'), root: process.cwd() }),
          encoding: 'utf8', timeout: 15000,
        });
      if (result.status !== 0) fail('Qt reference unavailable', result.stderr);
      const native = JSON.parse(result.stdout).combo;
      const selector = '[data-obs-pattern-select]';
      await send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 0, y: 0});
      const web = await evaluate(`(async () => {
        const combo = document.querySelector(${JSON.stringify(selector)});
        if (!combo || !combo.getBoundingClientRect().height) throw Error('Pattern combo not visible');
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
        if (document.activeElement !== combo) throw Error('Pattern combo cannot receive focus');
        await settle();
        const focus = sample();
        combo.blur();
        combo.scrollIntoView({block: 'center', inline: 'center', behavior: 'instant'});
        const rect = combo.getBoundingClientRect();
        const point = {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
        if (document.elementFromPoint(point.x, point.y) !== combo) throw Error('Pattern combo is obscured: ' + JSON.stringify({point, hit: document.elementFromPoint(point.x, point.y)?.outerHTML.slice(0, 300)}));
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
      console.log('Qt comparison', file, JSON.stringify({native, web}));
      for (const state of ['normal', 'focus', 'hover']) {
        for (const field of ['background', 'border']) {
          if (web[state][field] !== native[state][field])
            fail('Qt combo ' + state + ' ' + field + ' mismatch', {file, native: native[state], web: web[state]});
        }
        if (web[state].borderWidth !== '2px') fail('Browser combo frame differs from native QSS', web[state]);
        if (web[state].height < native[state].minimumHeight)
          fail('Browser combo below Qt minimum', {file, native: native[state], web: web[state]});
      }
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
