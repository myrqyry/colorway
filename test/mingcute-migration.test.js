import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { ICON_FILES, stateTokens, contrast } from '../scripts/theme-state-tokens.mjs';
import { SETTINGS_NAV_ICONS } from '../scripts/build-mingcute-icons.mjs';
import { parseOVT } from '../src/theme-loader.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const assets = () => JSON.parse(read('public/theme-assets.json'));
const base = () => read('themes/Colorway.obt');
const mapping = JSON.parse(read('icons/mingcute-map.json'));

test('every Colorway icon shipped to OBS is a real MingCute SVG with both contrasting variants', () => {
  const manifest = assets();
  assert.equal(manifest.filter((path) => path.startsWith('icons/colorway/mingcute/') && path.endsWith('.svg')).length, ICON_FILES.length * 2 + 6 + SETTINGS_NAV_ICONS.length);
  assert.equal(manifest.filter((path) => path.includes('iconamoon')).length, 0);
  assert.ok(manifest.includes('icons/colorway/mingcute/LICENSE'));
  assert.match(read('icons/colorway/mingcute/LICENSE'), /Apache License/);
  assert.equal(mapping.revision, 'ca98bb55513a22ff0dab713aaf7870b512944653');
  for (const file of ICON_FILES) {
    const normal = read('icons/colorway/mingcute/normal/' + file);
    const selected = read('icons/colorway/mingcute/selected/' + file);
    for (const svg of [normal, selected]) {
      assert.match(svg, /viewBox="0 0 24 24"/);
      assert.match(svg, /<path\b/);
      assert.doesNotMatch(svg, /currentColor/);
    }
    assert.notEqual(normal, selected, file + ': state ink must differ');
    const pinned = read('icons/vendor/mingcute/' + mapping.icons[file.slice(0, -4)] + '.svg');
    assert.equal(normal, pinned.replaceAll('currentColor', mapping.normalInk)
      .replace('<svg ', '<svg width="16" height="16" '), file + ': real pinned normal glyph');
    assert.equal(selected, pinned.replaceAll('currentColor', mapping.selectedInk)
      .replace('<svg ', '<svg width="16" height="16" '), file + ': real pinned selected glyph');
    assert.equal(read('public/icons/colorway/mingcute/normal/' + file), normal);
    assert.equal(read('public/icons/colorway/mingcute/selected/' + file), selected);
    assert.ok(manifest.includes('icons/colorway/mingcute/normal/' + file));
    assert.ok(manifest.includes('icons/colorway/mingcute/selected/' + file));
  }
});

test('Settings navigation glyphs have a calm two-tone keyline for neutral and accent selected rows', () => {
  const manifest = assets();
  for (const name of SETTINGS_NAV_ICONS) {
    const path = 'icons/colorway/mingcute/nav/' + name + '.svg';
    assert.ok(manifest.includes(path), name + ': navigation icon missing from installs');
    const svg = read(path);
    const source = read('icons/vendor/mingcute/' + mapping.icons[name] + '.svg');
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.ok(svg.includes('#191724') && svg.includes('#f8f8f2'), name + ': requires both ink colors');
    assert.equal((svg.match(/<path\b/g) || []).length, 2 * (source.match(/<path\b/g) || []).length,
      name + ': preserve pinned MingCute geometry in two layers');
    assert.doesNotMatch(svg, /currentColor/);
    assert.equal(read('public/' + path), svg, name + ': mirror drift');
    assert.match(base(), new RegExp('theme:icons/colorway/mingcute/nav/' + name + '\\.svg'));
  }
  // Light and dark parts offer a legible silhouette on both the Settings
  // navigation surface and the per-variant selected accent background.
  const baseVars = parseOVT(base()).vars;
  for (const name of readdirSync(new URL('themes/', root)).filter(x => x.endsWith('.ovt'))) {
    const vars = { ...baseVars, ...parseOVT(read('themes/' + name)).vars };
    for (const role of ['--bg_dock', '--primary']) {
      const surface = vars[role];
      if (!/^#[0-9a-f]{6}$/i.test(surface)) continue;
      assert.ok(Math.max(contrast('#191724', surface), contrast('#f8f8f2', surface)) >= 3,
        name + ': navigation icon has no contrasting edge on ' + role);
    }
  }
});

test('OBS base and generated variant theme references use only MingCute icon paths', () => {
  const source = base();
  assert.match(source, /theme:icons\/colorway\/mingcute\/normal\/eye.svg/);
  assert.doesNotMatch(source, /iconamoon/i);
  const baseVars = new Map(Object.entries(parseOVT(source.replace(/\/\*[^]*?\*\//g, '')).vars));
  const generated = [...stateTokens(baseVars).values()].join('\n');
  assert.match(generated, /mingcute/);
  assert.doesNotMatch(generated, /iconamoon/);
  for (const file of readdirSync(new URL('themes/', root)).filter((x) => x.endsWith('.ovt'))) {
    const variant = read('themes/' + file);
    assert.doesNotMatch(variant, /iconamoon/i, file);
  }
});

test('Colorway browser and ZIP packaging load MingCute rather than legacy artwork', () => {
  assert.doesNotMatch(read('src/main.js'), /iconamoon/);
  assert.doesNotMatch(read('src/obs-preview.js'), /iconamoon|obs-design/);
  assert.match(read('src/obs-preview.js'), /mingcute/);
  assert.match(read('src/theme-package.js'), /mingcute/);
  assert.match(read('scripts/sync-theme-mirrors.mjs'), /icons.colorway.*mingcute/);
  assert.match(read('scripts/copy-themes.sh'), /icons\/colorway\/mingcute/);
  for (const name of ['streaming-active','streaming-inactive','recording-active','recording-inactive','network-good','network-inactive']) {
    const path = 'icons/colorway/mingcute/status/' + name + '.svg';
    assert.ok(assets().includes(path));
    const spec = mapping.icons['status/' + name];
    assert.ok(spec, 'missing pinned status source: ' + name);
    assert.equal(read(path), read('icons/vendor/mingcute/' + spec + '.svg')
      .replaceAll('currentColor', mapping.normalInk)
      .replace('<svg ', '<svg width="16" height="16" '));
  }
});

test('slideshow pause and per-theme download glyphs use theme-tintable MingCute masks', () => {
  const main = read('src/main.js');
  const css = read('src/styles.css');
  assert.match(main, /class="theme-download-icon"/);
  assert.match(main, /class="pause-icon"/);
  assert.match(main, /icon\.style\.setProperty\('--cw-browser-icon'/);
  assert.match(main, /paused \? 'media-play' : 'pause'/);
  assert.match(css, /mask:\s*var\(--cw-browser-icon\)/);
  assert.match(css, /background:\s*currentColor/);
});
