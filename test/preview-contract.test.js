import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const themeLoader = readFileSync(new URL('../src/theme-loader.js', import.meta.url), 'utf8');

test('showcase has header with title and theme picker', () => {
  assert.match(main, /class="showcase-header"/);
  assert.match(styles, /\.showcase-header\s*\{/);
  assert.match(main, /id="theme-select"/);
  assert.match(main, /id="pattern-select"/);
});

test('showcase has card-based grid layout', () => {
  assert.match(styles, /grid-template-columns:\s*repeat\(auto-fill/);
  assert.match(main, /class="showcase-card"/);
  assert.match(main, /class="card-header"/);
  assert.match(main, /class="showcase-card"/);
});

test('showcase renders demo widgets for OBS styling', () => {
  assert.match(main, /class="demo-button"/);
  assert.match(main, /class="demo-input"/);
  assert.match(main, /class="demo-slider"/);
  assert.match(main, /class="demo-list-item"/);
  assert.match(main, /class="demo-tab"/);
  assert.match(main, /class="demo-progress"/);
});

test('palette still renders CSS variable swatches', () => {
  assert.match(styles, /--overlay-bg:/);
  assert.match(main, /class="palette-grid"/);
  assert.match(main, /class="palette-chip"/);
  assert.match(themeLoader, /\['--success', 'Success'\]/);
});

test('live status uses theme live color', () => {
  assert.match(styles, /--live:\s*#38bdf8/);
  assert.match(styles, /\.status-dot\.live\s*\{[^}]*background:\s*var\(--live/s);
});

test('slider updates its filled range on input', () => {
  assert.match(main, /\.demo-slider/);
  assert.match(main, /addEventListener\('input'/);
  assert.match(main, /--slider-pct/);
  assert.match(main, /slider\.value/);
});

test('theme pipeline loads and applies theme on change', () => {
  assert.match(main, /setTheme\(themeSelect\.value\)/);
  assert.match(main, /loadTheme\(file\)/);
  assert.match(main, /applyTheme\(theme\)/);
});
