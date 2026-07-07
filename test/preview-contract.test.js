import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const themeLoader = readFileSync(new URL('../src/theme-loader.js', import.meta.url), 'utf8');

test('showcase has header with title and theme picker', () => {
  assert.match(main, /class="showcase-header"/);
  assert.match(styles, /\.showcase-header\s*\{/);
  assert.match(main, /class="theme-list-container"/);
  assert.match(main, /id="pattern-select"/);
  assert.doesNotMatch(main, /id="theme-select"/);
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

test('showcase has theme picker with palette previews', () => {
  assert.match(main, /class="theme-list-container"/);
  assert.match(main, /class="theme-row"/);
  assert.match(main, /class="theme-palette"/);
  assert.match(main, /class="palette-swatch"/);
  assert.doesNotMatch(main, /id="theme-select"/);
});

test('theme pipeline loads and applies theme on change', () => {
  assert.match(main, /setTheme\(/);
  assert.match(main, /loadTheme\(/);
  assert.match(main, /applyTheme\(/);
});

// Test palette preview extraction
const { extractPalettePreview } = require('../src/main.js');

test('extractPalettePreview extracts correct variables', () => {
  const mockVars = {
    '--bg_base': '#1e1e2e',
    '--primary': '#cba6f7',
    '--warning': '#fab387',
    '--danger': '#f38ba8',
    '--text': '#cdd6f4',
    '--border_color': '#313244',
    '--other': '#ffffff'
  };
  const palette = extractPalettePreview(mockVars);
  assert.deepEqual(palette, [
    '#1e1e2e', '#cba6f7', '#fab387', 
    '#f38ba8', '#cdd6f4', '#313244'
  ]);
});
