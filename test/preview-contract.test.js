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

test('slideshow passes both theme and pattern into the transition', () => {
  assert.match(main, /setTheme\(pickRandomTheme\(\),\s*\{\s*patternFile:\s*pickRandomPattern\(\)\s*\}\)/);
  assert.match(main, /function pickRandomPattern\(\)/);
  assert.match(main, /function applyThemeState\(file, theme, patternFile\)/);
});

test('shuffle bags refill only when exhausted and skip the current value', () => {
  assert.match(main, /function shuffled\(values\)/);
  assert.match(main, /function nextFromBag\(values, current, bag\)/);
  assert.match(main, /values\.filter\(\(value\) => value !== current\)/);
  assert.match(main, /\.filter\(\(file\) => file !== 'pattern\.svg'\)/);
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

test('intro overlay renders backdrop, three passes, and a final word', () => {
  assert.match(main, /id="colorway-intro"/);
  assert.match(main, /class="colorway-intro-backdrop"/);
  assert.match(main, /class="colorway-intro-pass/);
  assert.match(main, /class="colorway-intro-final"/);
});

test('animated words render per-character spans without SplitText', () => {
  assert.match(main, /function renderWordChars\(text\)/);
  assert.match(main, /<span class="colorway-char"/);
  assert.doesNotMatch(main, /SplitText/);
});

test('header colorway word stays measurable during the intro', () => {
  assert.match(main, /class="header-colorway"/);
  assert.match(main, /class="header-colorway-chars intro-hidden"/);
  assert.match(main, /class="showcase-title-subtitle"/);
});

test('intro opening and preload run concurrently, never serialized', () => {
  assert.match(main, /function playColorwayIntroOpening\(\)/);
  assert.match(main, /function runIntro\(\)/);
  assert.match(main, /Promise\.all\(\[preloadPromise, introPromise\]\)/);
});

test('initial theme is set without transition under the intro', () => {
  assert.match(main, /setTheme\(initialTheme, \{ transition: false, animateTitle: false \}\)/);
});

test('slideshow starts only after the intro handoff completes', () => {
  assert.match(main, /function handoffColorway\(/);
  assert.match(main, /await handoffColorway\([^)]*\)/);
  assert.match(main, /startShuffle\(\)/);
});

test('header colorway word animates only when the theme changes', () => {
  assert.match(main, /function animateHeaderColorway\(\)/);
  assert.match(main, /if \(animateTitle\) animateHeaderColorway\(\)/);
  assert.match(main, /setTheme\(file, \{ patternFile = null, transition = true, animateTitle = true \} = \{\}\)/);
});

test('animated chars respect reduced motion', () => {
  assert.match(main, /prefers-reduced-motion: reduce/);
  assert.match(main, /crossfadeShowcase\(commit, reduceMotion\)/);
});

test('intro styles are fixed, centered, and above the header', () => {
  assert.match(styles, /\.colorway-intro\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*100;/s);
  assert.match(styles, /\.colorway-intro\s*\{[^}]*place-items:\s*center/s);
});

test('animated chars preserve 3D transforms', () => {
  assert.match(styles, /\.colorway-char\s*\{[^}]*backface-visibility:\s*hidden/s);
  assert.match(styles, /\.colorway-intro-stage\s*\{[^}]*perspective:/s);
});

test('all three rolling passes are visible, not opacity-zero', () => {
  assert.match(main, /gsap\.set\(\[pass1, pass2, pass3\],/);
  assert.match(main, /gsap\.set\(\[pass1, pass2, pass3\],\s*\{[\s\S]*?opacity: 1/s);
  assert.doesNotMatch(main, /gsap\.set\(passes,\s*\{ autoAlpha: 0 \}\)/);
});

test('intro passes overlap on the reference timing grid', () => {
  assert.match(main, /timeline\.to\(pass1, \{ rotationX: 90, duration: 0\.9, ease: 'none', stagger: 0\.08 \}, 0\)/);
  assert.match(main, /timeline\.to\(pass2, \{ rotationX: 90, duration: 0\.9, ease: 'none', stagger: 0\.08 \}, 0\.45\)/);
  assert.match(main, /timeline\.to\(pass3, \{ rotationX: 90, duration: 0\.9, ease: 'none', stagger: 0\.08 \}, 0\.9\)/);
  assert.match(main, /timeline\.to\(finalChars, \{ rotationX: 0, opacity: 1, duration: 1\.62, ease: 'expo\.out', stagger: 0\.06 \}, 1\.6\)/);
});

test('header word stays hidden until the moving word lands on it', () => {
  assert.match(main, /const from = finalWord\.getBoundingClientRect\(\);[\s\S]*?headerChars\.classList\.remove\('intro-hidden'\)/);
  assert.match(main, /gsap\.set\(finalWord, \{ visibility: 'hidden' \}\)/);
  assert.doesNotMatch(main, /headerChars\.classList\.remove\('intro-hidden'\);\s*\n\s*const from/s);
});

test('handoff never fades the intro wrapper containing the moving word', () => {
  assert.doesNotMatch(main, /\.to\(intro, \{ autoAlpha: 0/);
  assert.match(main, /\.to\(backdrop, \{ autoAlpha: 0, duration: 0\.9, ease: 'power2\.inOut' \}, 0\.15\)/);
});

test('intro wrapper is transparent so the backdrop fade actually reveals the app', () => {
  assert.match(styles, /\.colorway-intro\s*\{[^}]*background:\s*transparent/s);
  assert.match(styles, /\.colorway-intro-backdrop\s*\{[^}]*background:\s*var\(--colorway-intro-bg/s);
  assert.doesNotMatch(styles, /\.colorway-intro-pass\s*\{\s*visibility:\s*hidden/s);
});
