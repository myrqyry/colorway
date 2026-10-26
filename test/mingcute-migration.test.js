import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { ICON_FILES, stateTokens, contrast, resolveAlias } from '../scripts/theme-state-tokens.mjs';
import { SETTINGS_NAV_ICONS, referencedMixerIcons, HEADPHONE_OFF_MARK } from '../scripts/build-mingcute-icons.mjs';
import { parseOVT } from '../src/theme-loader.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const assets = () => JSON.parse(read('public/theme-assets.json'));
const base = () => read('themes/Colorway.obt');
const mapping = JSON.parse(read('icons/mingcute-map.json'));

test('every Colorway icon shipped to OBS is a real MingCute SVG with both contrasting variants', () => {
  const manifest = assets();
  assert.equal(manifest.filter((path) => path.startsWith('icons/colorway/mingcute/') && path.endsWith('.svg')).length,
    ICON_FILES.length * 2 + 6 + SETTINGS_NAV_ICONS.length + 8 + referencedMixerIcons().length);
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
    const original = read('icons/vendor/mingcute/' + mapping.icons[file.slice(0, -4)] + '.svg');
    const pinned = file === 'headphone-off.svg' ? original.replace('</svg>', HEADPHONE_OFF_MARK + '</svg>') : original;
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

test('spinboxes use real MingCute up-small-fill/down-small-fill, not altered generic chevrons', () => {
  const manifest = assets();
  const vars = new Map(Object.entries(parseOVT(base()).vars));
  const generated = stateTokens(vars);
  for (const direction of ['up', 'down']) {
    const polarity = generated.get('--cw_icon_chevron_' + direction + '_base').includes('/normal/') ? 'normal' : 'selected';
    assert.equal(generated.get('--cw_spin_chevron_' + direction),
      `url(theme:icons/colorway/mingcute/spin/${direction}-small-fill-${polarity}.svg)`);
    for (const ink of ['normal', 'selected']) {
      const path = `icons/colorway/mingcute/spin/${direction}-small-fill-${ink}.svg`;
      const svg = read(path);
      const original = read(`icons/vendor/mingcute/${direction}-small-fill.svg`);
      assert.match(original, /fill-rule="evenodd"/);
      assert.match(original, /fill="currentColor"/);
      assert.equal(svg, original.replaceAll('currentColor', mapping[ink + 'Ink'])
        .replace('width="1em" height="1em"', 'width="9" height="9"')
        .replace('viewBox="0 0 24 24"', 'viewBox="8 8 8 8"'));
      assert.equal(read('public/' + path), svg);
      assert.ok(manifest.includes(path));
    }
  }
});

test('mixer semantic assets preserve pinned geometry, correct ink, and complete distribution', () => {
  const manifest = assets();
  const baseVars = parseOVT(base().replace(/\/\*[^]*?\*\//g, '')).vars;
  for (const file of ['Colorway.obt', ...readdirSync(new URL('themes/', root)).filter(x => x.endsWith('.ovt'))]) {
    const vars = { ...baseVars, ...parseOVT(read('themes/' + file).replace(/\/\*[^]*?\*\//g, '')).vars };
    for (const [role, glyph] of [['muted', 'volume-mute'], ['monitor', 'headphone'], ['warning', 'warning']]) {
      const url = vars['--cw_mixer_' + role].replace(/^['"]|['"]$/g, '');
      const path = url.match(/^url\(theme:([^)]*)\)$/)?.[1];
      assert.ok(path, file + ': invalid mixer asset URL');
      const ink = vars['--on_mixer_' + role];
      assert.ok(contrast(ink, resolveAlias(new Map(Object.entries(vars)), '--bg_base')) >= 3, file + ': ' + role + ' ink');
      assert.equal(read(path), read('icons/vendor/mingcute/' + mapping.icons[glyph] + '.svg')
        .replaceAll('currentColor', ink.toLowerCase()).replace('<svg ', '<svg width="16" height="16" '));
      assert.equal(read('public/' + path), read(path));
      assert.ok(manifest.includes(path));
    }
  }
  assert.notEqual(read('icons/colorway/mingcute/normal/headphone-off.svg'), read('icons/colorway/mingcute/normal/headphone.svg'));
  assert.match(read('icons/colorway/mingcute/normal/headphone-off.svg'), /d="M3 3l18 18"/);
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
