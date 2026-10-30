import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOVT } from '../src/theme-loader.js';
import { THEMES } from '../src/theme-catalog.js';
import { getThemeCategory } from '../src/theme-categories.js';

const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const checkpoints = JSON.parse(read('data/official-palette-checkpoints.json')).lospec;
const provenance = JSON.parse(read('data/theme-provenance.json')).themes;

const candidates = [
  { file: 'Colorway-ScreenBurnMonitor.ovt', name: 'Screen Burn Monitor', author: 'SteelSoldier',
    category: 'retro', dark: true, slug: 'screen-burn-monitor',
    base: '#05090f', primary: '#208763', text: '#cccbc2', colorCount: 16 },
  { file: 'Colorway-Silkpukian24.ovt', name: 'Silkpukian 24', author: 'Chicknhawk',
    category: 'nature', dark: false, slug: 'silkpukian-24',
    base: '#e8ddca', primary: '#17695b', text: '#331c18', colorCount: 24 },
  { file: 'Colorway-OminousOlives.ovt', name: 'Ominous Olives', author: 'StellarBee',
    category: 'nature', dark: true, slug: 'ominous-olives',
    base: '#0c1013', primary: '#8a7a22', text: '#e6d472', colorCount: 16 },
];

const contrast = (a, b) => {
  const luma = (color) => {
    const [r,g,b] = color.match(/[0-9a-f]{2}/gi).map((x) => parseInt(x,16)/255).map(
      (v) => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4);
    return r*0.2126+g*0.7152+b*0.0722;
  };
  const x=luma(a),y=luma(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
};

test('all three verified Lospec candidates are discoverable and attributed', () => {
  assert.equal(THEMES.length, 166);
  for (const c of candidates) {
    assert.deepEqual(THEMES.find((theme) => theme.file === c.file), {file:c.file,name:c.name});
    assert.equal(getThemeCategory(c.file), c.category);
    const source = checkpoints[c.file];
    assert.equal(source.name,c.name);
    assert.equal(source.author.trim(),c.author);
    assert.equal(source.url,'https://lospec.com/palette-list/'+c.slug+'.json');
    assert.equal(source.colors.length,c.colorCount);
    assert.match(source.sha256,/^[0-9a-f]{64}$/);
    assert.equal(provenance[c.file].creator,c.author);
    assert.equal(provenance[c.file].url,'https://lospec.com/palette-list/'+c.slug);
    assert.equal(provenance[c.file].relation,'adapted');
  }
});

test('each curated Colorway theme preserves its authored anchor colors and accessible roles', () => {
  for (const c of candidates) {
    const original=read('themes/'+c.file);
    const parsed=parseOVT(original);
    const vars=parsed.vars;
    const colors=new Set(checkpoints[c.file].colors);
    assert.equal(parsed.meta._dark, c.dark, c.name+' polarity');
    assert.equal(vars['--bg_base'],c.base);
    assert.equal(vars['--primary'],c.primary);
    assert.equal(vars['--text'],c.text);
    for (const role of ['--bg_base','--bg_window','--bg_preview','--bg_dock',
      '--primary','--primary_light','--primary_dark','--text','--text_muted',
      '--button_bg_hover','--border_color']) {
      assert.ok(colors.has(vars[role].toLowerCase()), c.name+' '+role+' missing source color');
    }
    assert.ok(contrast(vars['--text'],vars['--bg_base'])>=4.5,c.name+' body text');
    assert.ok(contrast(vars['--text_muted'],vars['--bg_base'])>=3,c.name+' muted text');
    assert.ok(contrast(vars['--text'],vars['--input_bg'])>=4.5,c.name+' input text');
    assert.ok(contrast(vars['--button_hover_text'],vars['--button_bg_hover'])>=4.5,c.name+' hovered button');
    for (const role of ['--warning','--danger','--success']) {
      assert.ok(contrast(vars[role],vars['--bg_base'])>=3,c.name+' '+role+' contrast');
    }
    assert.match(original,/Lospec palette[^*]*https:\/\/lospec.com\/palette-list\//s,c.name+' source attribution');
  }
});
