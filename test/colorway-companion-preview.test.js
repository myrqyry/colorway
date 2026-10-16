import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {THEMES,PATTERNS} from '../src/theme-catalog.js';
const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('standalone OBS dock preview is built from the complete real theme and pattern catalog',()=>{
 const html=read('obs-companion/colorway-preview.html');
 assert.match(html, /id="theme-search"/);
 assert.match(html, /id="theme-list"/);
 assert.match(html, /id="pattern-list"/);
 assert.match(html, /id="theme-workspace"/);
 assert.match(html, /Preview only/);
 assert.doesNotMatch(html,/Status Indicators|setInterval|https?:\/\//i);
 const match=html.match(/<script id="colorway-data" type="application\/json">([\s\S]*?)<\/script>/);
 assert.ok(match,'offline preview JSON must be embedded, not fetched');
 assert.equal(html,read('public/companion/colorway-preview.html'),
   'web-distributed dock must exactly match the standalone source');
 assert.equal(read('obs-companion/colorway-patterns.lua'),read('public/companion/colorway-patterns.lua'));
 const data=JSON.parse(match[1]);
 assert.equal(data.themes.length,THEMES.length);
 assert.equal(data.patterns.length,PATTERNS.length);
 assert.deepEqual(data.themes.map(x=>x.file),THEMES.map(x=>x.file));
 for(const item of data.themes){
   assert.match(item.colors.bg_window,/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/);
   assert.match(item.colors.text,/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/);
   assert.match(item.id,/^com\.myrqyry\.Colorway/);
 }
 for(const p of data.patterns){
   assert.ok(p.image.startsWith('data:image/svg+xml,'),p.file);
   assert.ok(p.image.includes('%3Csvg'),p.file);
 }
});
