import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const actions = readFileSync(new URL('../src/obs-preview-actions.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/obs-preview-actions.css', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Colorway branding owns the permanent Settings titlebar', () => {
  assert.match(actions, /className = 'colorway-dialog-brand'/);
  assert.match(actions, /<strong>Colorway<\/strong>/);
  assert.match(actions, /data-colorway-brand-theme/);
  assert.match(actions, /document\.title = `\$\{name\} · Colorway OBS Theme`/);
  assert.match(styles, /\.colorway-brand-copy strong/);
  assert.match(styles, /var\(--primary_light/);
});

test('Settings footer exposes Import and split Download actions', () => {
  assert.match(actions, /data-colorway-import/);
  assert.match(actions, /data-colorway-download-main/);
  assert.match(actions, /data-colorway-download-toggle/);
  assert.match(actions, /data-colorway-download-kind="colorway"/);
  assert.match(actions, /data-colorway-download-kind="yami"/);
  assert.match(styles, /\.obs-sim-dialog-actions\.colorway-dialog-actions/);
  assert.match(styles, /display: flex !important/);
});

test('Colorway remains the default download while Yami is an optional compatibility export', () => {
  assert.match(actions, /downloadCurrent\('colorway'\)/);
  assert.match(actions, /<strong>Colorway \.ovt<\/strong><small>Native variant<\/small>/);
  assert.match(actions, /<strong>Yami-compatible \.ovt<\/strong><small>Compatibility export<\/small>/);
  assert.match(actions, /kind === 'yami'/);
});

test('Settings Import reuses the existing importer and auto-applies only after parsing completes', () => {
  assert.match(actions, /document\.querySelector\('#workbench-file'\)/);
  assert.match(actions, /document\.querySelector\('#workbench-apply'\)/);
  assert.match(actions, /apply\.disabled = true/);
  assert.match(actions, /observer\.observe\(apply, \{ attributes: true, attributeFilter: \['disabled'\] \}\)/);
  assert.match(actions, /apply\.click\(\)/);
});

test('preview polish follows Colorway theme variables rather than fixed product colors', () => {
  assert.match(styles, /var\(--button_border_width, 1px\)/);
  assert.match(styles, /var\(--button_bg\)/);
  assert.match(styles, /var\(--input_border_width, 1px\)/);
  assert.match(styles, /var\(--input_text_padding, 8px\)/);
  assert.match(styles, /var\(--border_radius_large, 12px\)/);
  assert.match(styles, /var\(--pattern_eyes, none\)/);
});

test('product action module loads after preview refinement', () => {
  const refine = index.indexOf('/src/obs-preview-refine.js');
  const product = index.indexOf('/src/obs-preview-actions.js');
  assert.ok(refine >= 0);
  assert.ok(product > refine);
});
