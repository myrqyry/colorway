import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const preview = read('src/obs-preview.js');
const css = read('src/obs-preview.css');
const refine = read('src/obs-preview-refine.js');

test('the theme showcase offers real, isolated, interactive control examples', () => {
  assert.match(preview, /data-component-showcase/);
  assert.match(preview, /input type="checkbox"[^>]*data-showcase-check/);
  assert.match(preview, /input type="radio"[^>]*name="showcase-track"/);
  assert.match(preview, /type="number"[^>]*data-showcase-spin/);
  assert.match(preview, /data-showcase-step="up"/);
  assert.match(preview, /data-showcase-step="down"/);
  assert.match(preview, /data-showcase-toggle/);
  assert.match(preview, /data-showcase-monitor/);
  assert.match(preview, /data-showcase-zoom="in"/);
  assert.match(preview, /data-showcase-zoom="out"/);
  assert.match(preview, /Preview only/);
});

test('showcase buttons adjust only local demo state, with native input semantics', () => {
  assert.match(preview, /const showcase = root\.querySelector\('\[data-component-showcase\]'\)/);
  assert.match(preview, /stepUp\(\)/);
  assert.match(preview, /stepDown\(\)/);
  assert.match(preview, /setAttribute\('aria-pressed'/);
  assert.match(preview, /data-showcase-zoom-value/);
  assert.match(preview, /setIcon\(.*'headphone'/);
  assert.match(preview, /setIcon\(.*'headphone-off'/);
});

test('showcase paints with actual Colorway tokens and preserves compact selection geometry', () => {
  assert.match(css, /\.obs-sim-showcase-grid\s*\{/);
  assert.match(css, /\.obs-sim-showcase-option input\[type="radio"\][^{]*\{[^}]*border-radius:\s*50%/s);
  assert.match(css, /\.obs-sim-showcase-step\.up[^}]*--cw_spin_chevron_up/s);
  assert.match(css, /\.obs-sim-showcase-step\.down[^}]*--cw_spin_chevron_down/s);
  assert.match(css, /\.obs-sim-showcase-icon:hover[^}]*--input_border_hover/s);
  assert.match(css, /\.obs-sim-select,[^}]*min-height:\s*27px/s);
  assert.match(refine, /Explore elements/);
});
