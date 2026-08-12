import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ambient = readFileSync(new URL('../src/obs-preview-ambient.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/obs-preview-ambient.css', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('ambient preview is seeded by both active Colorway theme and selected pattern', () => {
  assert.match(ambient, /hashString\(`\$\{theme\}::\$\{pattern\}`\)/);
  assert.match(ambient, /const MODES = \['ribbons', 'cells', 'orbit', 'lattice', 'waves'\]/);
  assert.match(ambient, /layer\.dataset\.ambientMode = mode/);
});

test('ambient colors come from the applied Colorway palette', () => {
  assert.match(ambient, /'--bg_base'/);
  assert.match(ambient, /'--primary'/);
  assert.match(ambient, /'--warning'/);
  assert.match(ambient, /'--danger'/);
  assert.match(ambient, /getComputedStyle\(document\.documentElement\)/);
  assert.match(ambient, /--ambient-c\$\{index \+ 1\}/);
});

test('ambient source sits behind the permanent Settings controller', () => {
  assert.match(styles, /\.colorway-ambient \{[\s\S]*z-index: 2/);
  assert.match(styles, /\.obs-sim-preview-area > \.obs-sim-dialog-backdrop \{[\s\S]*z-index: 100/);
  assert.match(styles, /background: color-mix\(in srgb, var\(--bg_preview, var\(--bg_base\)\) 40%, transparent\) !important/);
});

test('generator responds to theme and pattern changes and honors reduced motion', () => {
  assert.match(ambient, /new MutationObserver\(\(\) => syncAmbient\(root\)\)/);
  assert.match(ambient, /sourcePattern\?\.addEventListener\('change', \(\) => syncAmbient\(root\)\)/);
  assert.match(ambient, /event\.target\.matches\('\[data-obs-pattern-select\]'\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test('ambient module loads after product-surface controls', () => {
  const actions = index.indexOf('/src/obs-preview-actions.js');
  const ambientModule = index.indexOf('/src/obs-preview-ambient.js');
  assert.ok(actions >= 0);
  assert.ok(ambientModule > actions);
});
