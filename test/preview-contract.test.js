import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const themeLoader = readFileSync(new URL('../src/theme-loader.js', import.meta.url), 'utf8');
const rootThemesDir = new URL('../themes/', import.meta.url);
const publicThemesDir = new URL('../public/themes/', import.meta.url);
const rootPatternsDir = new URL('../patterns/', import.meta.url);
const publicPatternsDir = new URL('../public/patterns/', import.meta.url);
const rootFontsDir = new URL('../fonts/', import.meta.url);
const publicFontsDir = new URL('../public/fonts/', import.meta.url);

function readTheme(dir, file) {
  return readFileSync(new URL(file, dir), 'utf8');
}

test('showcase has header with title and theme picker', () => {
  assert.match(main, /class="showcase-header"/);
  assert.match(main, /class="theme-list-container"/);
  assert.match(main, /id="pattern-select"/);
  assert.doesNotMatch(main, /id="theme-select"/);
});

test('showcase has card-based grid layout', () => {
  assert.match(main, /class="showcase-card"/);
  assert.match(main, /class="card-header"/);
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
  assert.match(styles, /\.showcase-card > summary/);
  assert.match(main, /class="palette-grid"/);
  assert.match(main, /class="palette-chip"/);
  assert.match(themeLoader, /\['--success', 'Success'\]/);
});

test('showcase has theme picker with palette previews', () => {
  assert.match(main, /class="theme-list-container"/);
  assert.match(main, /class="theme-row \$\{active\}"/);
  assert.match(main, /class="theme-palette"/);
  assert.match(main, /class="palette-swatch"/);
  assert.match(main, /<details class="showcase-card card-palette">/);
  assert.match(main, /<summary class="card-header">/);
  assert.doesNotMatch(main, /id="theme-select"/);
});

test('theme pipeline loads and applies theme on change', () => {
  assert.match(main, /setTheme\(/);
  assert.match(main, /loadTheme\(/);
  assert.match(main, /applyTheme\(/);
});

test('extractPalettePreview extracts correct variables', () => {
  assert.match(main, /function extractPalettePreview\(vars\)/);
  assert.match(main, /PALETTE_PREVIEW_VARS\.map\(varName => vars\[varName\] \|\| '#000000'\)/);
  assert.match(main, /'--bg_base'/);
  assert.match(main, /'--border_color'/);
});

test('public patterns mirror the root patterns', () => {
  const rootFiles = readdirSync(rootPatternsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
    .map((entry) => entry.name)
    .sort();
  const publicFiles = new Set(
    readdirSync(publicPatternsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
      .map((entry) => entry.name),
  );

  assert.equal(publicFiles.size, rootFiles.length, 'public patterns count mismatch');

  for (const file of rootFiles) {
    assert.ok(publicFiles.has(file), `${file} missing from public/patterns`);
    const rootText = readTheme(rootPatternsDir, file);
    const publicText = readTheme(publicPatternsDir, file);
    assert.equal(publicText, rootText, `${file} is out of sync with public/patterns`);
  }
});

test('public fonts mirror the root fonts', () => {
  const rootFiles = readdirSync(rootFontsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ttf|otf|woff2?)$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const publicFiles = new Set(
    readdirSync(publicFontsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(ttf|otf|woff2?)$/.test(entry.name))
      .map((entry) => entry.name),
  );

  assert.equal(publicFiles.size, rootFiles.length, 'public fonts count mismatch');

  for (const file of rootFiles) {
    assert.ok(publicFiles.has(file), `${file} missing from public/fonts`);
    const rootBuf = readFileSync(new URL(file, rootFontsDir));
    const publicBuf = readFileSync(new URL(file, publicFontsDir));
    assert.equal(rootBuf.compare(publicBuf), 0, `${file} is out of sync with public/fonts`);
  }
});

test('public themes mirror the root themes and keep palette comments', () => {
  const rootFiles = readdirSync(rootThemesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^Colorway-.*\.ovt$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const publicFiles = new Set(
    readdirSync(publicThemesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^Colorway-.*\.ovt$/.test(entry.name))
      .map((entry) => entry.name),
  );

  assert.equal(publicFiles.size, rootFiles.length, 'public themes count mismatch');

  for (const file of rootFiles) {
    assert.ok(publicFiles.has(file), `${file} missing from public/themes`);
    const rootText = readTheme(rootThemesDir, file);
    const publicText = readTheme(publicThemesDir, file);

    assert.equal(publicText, rootText, `${file} is out of sync with public/themes`);
    assert.match(rootText, /Official palette reference:/, `${file} is missing a palette comment`);
  }
});
