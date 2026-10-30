import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {parseOVT} from '../src/theme-loader.js';
import {THEMES} from '../src/theme-catalog.js';

const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const registry=JSON.parse(read('data/theme-provenance.json')).themes;
const official=JSON.parse(read('data/official-palette-checkpoints.json'));
const varsOf=file=>parseOVT(read('themes/'+file)).vars;

test('every shipped variant has a bounded attribution or explicit uncertainty',()=>{
  const keys=Object.keys(registry).sort();
  assert.deepEqual(keys,readdirSync(new URL('themes/',root)).filter(f=>f.endsWith('.ovt')).sort());
  assert.deepEqual(keys,THEMES.map(t=>t.file).sort());
  for(const [file,record] of Object.entries(registry)){
    assert.ok(['adapted','inspired','unverified'].includes(record.relation),file);
    if(record.relation==='unverified'){
      assert.equal(record.url,null,file);
      assert.equal(record.creator,null,file);
    }else{
      assert.ok(record.url?.startsWith('https://'),file);
      assert.ok(record.creator?.length>2,file);
    }
  }
});
test('Catppuccin standard flavors preserve official base, foreground and named accent',()=>{
  let checked=0;
  for(const file of Object.keys(registry)){
    const match=file.match(/^Colorway-Catppuccin(Frappe|Latte|Macchiato|Mocha)(?:-([A-Za-z]+))?\.ovt$/);
    if(!match)continue;
    const [_,flav,acc]=match, upstream=official.catppuccin[flav.toLowerCase()];
    const colors=varsOf(file);
    assert.ok(['base','mantle','crust','surface0','surface1','surface2'].some(k => colors['--bg_base'].toLowerCase()===upstream[k]),file+' background outside official surface ramp');
    assert.ok(['text','subtext0','subtext1'].some(k => colors['--text'].toLowerCase()===upstream[k]),file+' foreground outside official text ramp');
    assert.equal(colors['--primary'].toLowerCase(),upstream[(acc||'mauve').toLowerCase()],file+' accent');
    checked++;
  }
  assert.equal(checked,41);
});
test('Rosé Pine variants preserve official base and accent; Dawn text drift is recorded',()=>{
  let checked=0, historicalDawn=0;
  for(const file of Object.keys(registry)){
    const match=file.match(/^Colorway-RosePine(Moon|Dawn)?-([A-Za-z]+)\.ovt$/);
    if(!match)continue;
    const [_,flav,acc]=match,upstream=official['rose-pine'][(flav||'main').toLowerCase()];
    const colors=varsOf(file);
    assert.ok(['base','surface','overlay'].some(k => colors['--bg_base'].toLowerCase()===upstream[k]),file+' background outside official surfaces');
    assert.equal(colors['--primary'].toLowerCase(),upstream[acc.toLowerCase()],file+' accent');
    if(flav==='Dawn'){
      assert.equal(colors['--text'].toLowerCase(),'#575279',file+' intentional historical text');
      assert.equal(upstream.text,'#464261','official checkpoint drift must be updated deliberately');
      assert.match(registry[file].note,/historical/i);
      historicalDawn++;
    }else assert.equal(colors['--text'].toLowerCase(),upstream.text,file+' foreground');
    checked++;
  }
  assert.equal(checked,18);
  assert.equal(historicalDawn,6);
});
test('identified Lospec palette ports use sourced base and primary, and disclose adapted text',()=>{
  const entries=Object.entries(official.lospec);
  assert.equal(entries.length,12);
  for(const [file,source] of entries){
    const palette=new Set(source.colors);
    const colors=varsOf(file);
    assert.ok(palette.has(colors['--bg_base'].toLowerCase()),file+' background outside upstream palette');
    assert.ok(palette.has(colors['--primary'].toLowerCase()),file+' accent outside upstream palette');
    assert.equal(registry[file].creator?.trim().length>0,true,file+' missing creator');
  }
});
test('credits documentation is generated for all variants and mirrored for downloads',()=>{
  const text=read('docs/THEME_CREDITS.md');
  assert.equal(text,read('public/THEME_CREDITS.md'));
  for(const theme of THEMES)assert.ok(text.includes('| '+theme.file+' |'),theme.file);
  assert.match(text,/original source not established/i);
  assert.match(text,/source drift/i);
});
