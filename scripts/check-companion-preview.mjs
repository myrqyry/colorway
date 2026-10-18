// Verify the offline single-file Colorway dock in a real Chromium renderer.
// Run after build-obs-companion. No localhost server or external network.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

const profile=mkdtempSync('/tmp/cw-companion-browser-');
const chrome=spawn(process.env.CHROMIUM_PATH || '/usr/bin/chromium',
 ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',
  '--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let ws;
try{
 let port=0;
 for(let i=0;i<110;i++){try{port=Number(readFileSync(profile+'/DevToolsActivePort','utf8').split('\n')[0]);if(port)break;}catch{}await wait(100);}
 if(!port)throw Error('Chromium did not start');
 const targets=await(await fetch('http://127.0.0.1:'+port+'/json')).json();
 const page=targets.find(t=>t.type==='page');
 if(!page)throw Error('No Chromium page');
 ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((done,fail)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});});
 let index=0;const pending=new Map();
 ws.addEventListener('message',event=>{
  const msg=JSON.parse(event.data),p=pending.get(msg.id);
  if(!p)return;pending.delete(msg.id);
  if(msg.error)p.reject(Error(JSON.stringify(msg.error)));else p.resolve(msg.result);
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++index;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async expression=>{
  const resp=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(resp.exceptionDetails)throw Error(JSON.stringify(resp.exceptionDetails));
  return resp.result.value;
 };
 await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:940,height:850,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:pathToFileURL(resolve('obs-companion/colorway-preview.html')).href});
 for(let i=0;i<70;i++){if(await evaluate('document.querySelectorAll(".theme-row").length')===160)break;if(i===69)throw Error('Theme rows failed');await wait(100);}
 const initial=await evaluate('({rows:document.querySelectorAll(".theme-row").length,patterns:document.querySelectorAll(".pattern-card").length,selected:document.querySelector("#theme-name").textContent,background:getComputedStyle(document.documentElement).getPropertyValue("--canvas")})');
 if(initial.rows!==160||initial.patterns!==14||!initial.background.startsWith('#'))throw Error('Initial dock failed '+JSON.stringify(initial));
 const sidebarButton=await evaluate(`(()=>{
   const b=document.querySelector('.theme-row .theme-label');
   return {background:getComputedStyle(b).backgroundColor,color:getComputedStyle(b).color};
 })()`);
 if(sidebarButton.background!=='rgba(0, 0, 0, 0)')
   throw Error('Theme buttons retain native white background: '+JSON.stringify(sidebarButton));

 const selected=await evaluate(`(()=>{
  const input=document.querySelector('#theme-search');
  input.value='Catppuccin Latte — Blue';input.dispatchEvent(new Event('input',{bubbles:true}));
  const choices=[...document.querySelectorAll('.theme-row')];
  const count=choices.length;
  choices[0]?.querySelector('.theme-label')?.click();
  const before=getComputedStyle(document.documentElement).getPropertyValue('--tile');
  const tiles=document.querySelectorAll('.pattern-card');
  tiles[8].click();
  const after=getComputedStyle(document.documentElement).getPropertyValue('--tile');
  return {count, name:document.querySelector('#theme-name').textContent,
          bg:getComputedStyle(document.documentElement).getPropertyValue('--canvas'),
          selectedBackground:getComputedStyle(document.querySelector('.item.selected')).backgroundColor,
          patternChanged:before!==after,patternName:tiles[8].textContent,
          credit:document.querySelector('#theme-credit').textContent,
          source:document.querySelector('#theme-credit .origin-link')?.getAttribute('href')}
 })()`);
 if(selected.count!==1||selected.name!=='Catppuccin Latte — Blue'||selected.bg.toLowerCase()!=='#eff1f5'||!selected.patternChanged||!selected.credit.includes('Catppuccin contributors')||selected.source!=='https://github.com/catppuccin/catppuccin')
  throw Error('Actual theme/pattern interaction failed '+JSON.stringify(selected));
 const filter=await evaluate(`(()=>{
  document.querySelector('#theme-search').value='';
  document.querySelector('#theme-search').dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('[data-filter="light"]').click();
  return {count:document.querySelectorAll('.theme-row').length,active:document.querySelector('[data-filter="light"]').getAttribute('aria-pressed')}
 })()`);
 if(filter.active!=='true'||filter.count>=160||filter.count===0)throw Error('Light filter failed '+JSON.stringify(filter));
 // Return to a rich example for a reproducible offline visual inspection.
 await evaluate(`(()=>{
  document.querySelector('[data-filter="all"]').click();
  const inp=document.querySelector('#theme-search');
  inp.value='Everforest Dark Hard';inp.dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('.theme-row .theme-label')?.click();
  inp.value='';inp.dispatchEvent(new Event('input',{bubbles:true}));
 })()`);
 await wait(200);
 const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 if(process.env.COLORWAY_COMPANION_SCREENSHOT)
   writeFileSync(process.env.COLORWAY_COMPANION_SCREENSHOT,Buffer.from(shot.data,'base64'));
 console.log('PASS offline dock: 160 theme cards, 14 patterns, palette change, pattern change, light filter; no network server');
 console.log('Selected palette',JSON.stringify(selected));
}finally{ws?.close();chrome.kill('SIGTERM');rmSync(profile,{recursive:true,force:true});}
