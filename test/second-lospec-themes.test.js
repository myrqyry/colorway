import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseOVT } from '../src/theme-loader.js';
import { THEMES } from '../src/theme-catalog.js';
import { getThemeCategory } from '../src/theme-categories.js';

const read = (path) => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const refs = JSON.parse(read('data/official-palette-checkpoints.json')).lospec;
const credit = JSON.parse(read('data/theme-provenance.json')).themes;
const cases = [
  { stem:'Fogfire', name:'Fogfire', author:'Quemis guy', slug:'fogfire', category:'atmospheric',
    dark:true, count:12, base:'#1c1820', primary:'#e75c13', text:'#deddec' },
  { stem:'Vanitas', name:'Vanitas', originalName:'vanitas', author:'Vsigos', slug:'vanitas', category:'nature',
    dark:true, count:16, base:'#1d1e19', primary:'#a39c75', text:'#beb2ab' },
  { stem:'PumpkinBrew', name:'Pumpkin Brew', author:'g0nebatty', slug:'pumpkin-brew', category:'playful',
    dark:true, count:8, base:'#2a1838', primary:'#ee9048', text:'#f4ecff' },
];
function contrast(a,b){
  const luma=(hex)=>{
    const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
      .map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
    return .2126*v[0]+.7152*v[1]+.0722*v[2];
  };
  const x=luma(a), y=luma(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}

test('three second-batch themes are attributed and available in the visible catalog', () => {
  assert.equal(THEMES.length,166);
  for(const c of cases){
    const file='Colorway-'+c.stem+'.ovt';
    assert.deepEqual(THEMES.find(t=>t.file===file),{file,name:c.name});
    assert.equal(getThemeCategory(file),c.category);
    const data=refs[file];
    assert.equal(data.name,c.originalName||c.name);
    assert.equal(data.author.trim(),c.author);
    assert.equal(data.colors.length,c.count);
    assert.match(data.sha256,/^[0-9a-f]{64}$/);
    assert.equal(data.url,'https://lospec.com/palette-list/'+c.slug+'.json');
    assert.equal(credit[file].creator,c.author);
    assert.equal(credit[file].url,'https://lospec.com/palette-list/'+c.slug);
    assert.equal(credit[file].relation,'adapted');
  }
});
test('source swatches are used for all surfaces and each theme has readable UI states',()=>{
  for(const c of cases){
    const file='Colorway-'+c.stem+'.ovt';
    const theme=read('themes/'+file);
    const {meta,vars}=parseOVT(theme);
    assert.equal(meta._dark,c.dark,c.name);
    assert.equal(vars['--bg_base'],c.base,c.name);
    assert.equal(vars['--primary'],c.primary,c.name);
    assert.equal(vars['--text'],c.text,c.name);
    const colors=new Set(refs[file].colors);
    for(const key of ['--bg_window','--bg_base','--bg_preview','--bg_dock','--bg_hover',
      '--primary','--primary_dark','--text','--text_muted','--input_bg','--border_color']){
      assert.ok(colors.has(vars[key]),c.name+' '+key+' does not use original color');
    }
    for(const [fg,bg,min] of [
      ['--text','--bg_base',4.5],['--text_muted','--bg_base',3],
      ['--text','--input_bg',4.5],['--button_hover_text','--button_bg_hover',4.5],
      ['--text_inverse','--primary',4.5],
      ['--warning','--bg_base',3],['--danger','--bg_base',3],['--success','--bg_base',3],
    ]){
      assert.ok(contrast(vars[fg],vars[bg])>=min,
        c.name+' contrast '+fg+'/'+bg+' below '+min);
    }
    assert.match(theme,/Lospec palette[^*]*https:\/\/lospec.com\/palette-list\//s);
  }
});