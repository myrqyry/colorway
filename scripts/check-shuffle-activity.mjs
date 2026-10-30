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
const port = 5195;
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
await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await send('Page.navigate',{url:'http://127.0.0.1:' + port + '/'});
await until(() => evaluate('document.querySelectorAll(".theme-row").length >= 166'), 'theme catalog');
await until(() => evaluate('!document.querySelector("#colorway-intro")'), 'intro handoff');
await until(() => evaluate('document.querySelector("#slideshow-pause")?.getAttribute("aria-pressed") === "false"'), 'initial slideshow playing');
// System/app initiated pattern changes should not stop it.
await evaluate('document.querySelector("#pattern-select").dispatchEvent(new Event("change", {bubbles:true}))');
assert.equal(await evaluate('document.querySelector("#slideshow-pause").getAttribute("aria-pressed")'),'false');
await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:378,y:147});
await until(() => evaluate('document.querySelector("#slideshow-pause").getAttribute("aria-pressed") === "true"'), 'pointer movement stops slideshow');
assert.equal(await evaluate('document.querySelector(".colorway-page-pause").getAttribute("aria-label")'), 'Resume slideshow');
const progressPaused = await evaluate('document.querySelector("#slideshow-progress-fill").parentElement.getAttribute("aria-valuenow")');
await delay(500);
assert.equal(await evaluate('document.querySelector("#slideshow-progress-fill").parentElement.getAttribute("aria-valuenow")'),progressPaused,'shuffle countdown continues after stop');
console.log('PASS pointer movement stops slideshow and freezes remaining countdown');
// Visible header Play is the only intended automatic-resume path.
const pausePoint=await evaluate(`(() => {
  const r=document.querySelector('.colorway-page-pause').getBoundingClientRect();
  return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};
})()`);
await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:pausePoint.x,y:pausePoint.y});
await send('Input.dispatchMouseEvent',{type:'mousePressed',x:pausePoint.x,y:pausePoint.y,button:'left',clickCount:1});
await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pausePoint.x,y:pausePoint.y,button:'left',clickCount:1});
await until(() => evaluate('document.querySelector("#slideshow-pause").getAttribute("aria-pressed") === "false"'), 'visible header resume');
await delay(400);
const countdownAfter = await evaluate('Number(document.querySelector("#slideshow-progress-fill").parentElement.getAttribute("aria-valuenow"))');
assert.ok(countdownAfter < Number(progressPaused), 'countdown must advance after resume');
console.log('PASS visible Play resumes slideshow countdown');
await send('Page.bringToFront');
await send('Emulation.setFocusEmulationEnabled',{enabled:true});
await evaluate('document.querySelector(".demo-input").focus()');
await send('Input.insertText',{text:'x'});
await until(() => evaluate('document.querySelector("#slideshow-pause").getAttribute("aria-pressed") === "true"'), 'typing into visible field stops slideshow');
console.log('PASS real keyboard input pauses slideshow');
// A manual theme choice works while stopped and does not restart timer.
const before=await evaluate('document.querySelector("#active-theme-name").textContent');
await evaluate('document.querySelector("[data-colorway-theme-trigger]").click()');
await until(() => evaluate('document.querySelector("[data-colorway-theme-options]")?.hidden === false'), 'visible style picker opens');
await evaluate('document.querySelector(".colorway-theme-option:not(.selected)").click()');
await until(() => evaluate('document.querySelector("#active-theme-name").textContent !== '+JSON.stringify(before)), 'manual theme selection');
assert.equal(await evaluate('document.querySelector("#slideshow-pause").getAttribute("aria-pressed")'), 'true');
console.log('PASS manual theme selection works while auto cycling remains paused');
// A visible picker path must work; DOM-only catalog entries are not enough.
const pointerClick = async (selector) => {
  const expression='(() => {const el=document.querySelector('+JSON.stringify(selector)+');'
    +'if (!el) return {error:"missing selector"};'
    +'el.scrollIntoView({block:"nearest"});const r=el.getBoundingClientRect();'
    +'const x=Math.round(r.left+r.width/2), y=Math.round(r.top+r.height/2);'
    +'return {x,y,hit:document.elementFromPoint(x,y)?.closest('+JSON.stringify(selector)+')===el,rect:r.toJSON()};})()';
  const pos=await evaluate(expression);
  assert.equal(pos.hit,true,'Cannot pointer-click Settings picker: '+selector+' '+JSON.stringify(pos));
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:pos.x,y:pos.y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:pos.x,y:pos.y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pos.x,y:pos.y,button:'left',clickCount:1});
};
for(const [file,name,base,primary,author] of [
  ['Colorway-ScreenBurnMonitor.ovt','Screen Burn Monitor','#05090f','#208763','SteelSoldier'],
  ['Colorway-Silkpukian24.ovt','Silkpukian 24','#e8ddca','#17695b','Chicknhawk'],
  ['Colorway-OminousOlives.ovt','Ominous Olives','#0c1013','#8a7a22','StellarBee'],
  ['Colorway-Fogfire.ovt','Fogfire','#1c1820','#e75c13','Quemis guy'],
  ['Colorway-Vanitas.ovt','Vanitas','#1d1e19','#a39c75','Vsigos'],
  ['Colorway-PumpkinBrew.ovt','Pumpkin Brew','#2a1838','#ee9048','g0nebatty'],
]){
  await pointerClick('[data-colorway-theme-trigger]');
  await until(() => evaluate('document.querySelector("[data-colorway-theme-options]")?.hidden === false'),name+' picker');
  await pointerClick('.colorway-theme-option[data-file="'+file+'"]');
  await until(() => evaluate('document.querySelector("#active-theme-name")?.textContent === '+JSON.stringify(name)),name+' selection');
  const painted=await evaluate('(() => ({'
    +'base:getComputedStyle(document.documentElement).getPropertyValue("--bg_base").trim().toLowerCase(),'
    +'primary:getComputedStyle(document.documentElement).getPropertyValue("--primary").trim().toLowerCase(),'
    +'credit:document.querySelector("#active-theme-credit")?.textContent,'
    +'source:document.querySelector("#active-theme-credit a")?.href,'
    +'paused:document.querySelector("#slideshow-pause")?.getAttribute("aria-pressed")'
    +'}))()');
  assert.equal(painted.base,base,name+' background');
  assert.equal(painted.primary,primary,name+' accent');
  assert.ok(painted.credit?.includes(author),name+' credited creator');
  assert.ok(painted.source?.startsWith('https://lospec.com/palette-list/'),name+' source link');
  assert.equal(painted.paused,'true',name+' slideshow remains stopped');
  if(process.env.COLORWAY_CURATED_SCREENSHOT_DIR){
    const snap=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    const dest=join(process.env.COLORWAY_CURATED_SCREENSHOT_DIR,'Colorway-'+name.replaceAll(' ','')+'.png');
    writeFileSync(dest,Buffer.from(snap.data,'base64'));
  }
  await delay(200); // Let the reduced-motion theme transition settle before reopening the picker.
  console.log('PASS real pointer selection, painted colors and credited source',name);
}
console.log('Chromium slideshow activity and curated themes PASS');
} finally {
  ws?.close();
  server.kill('SIGTERM');
  await cleanupBrowserProfile(browser, profile);
}
