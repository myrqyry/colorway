import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseOVT, browserThemeAssetValue } from '../src/theme-loader.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const qss = read('themes/Colorway.obt');
const preview = read('src/obs-preview.js');
const css = read('src/obs-preview.css') + read('src/page-shell-sync.css') + read('src/obs-preview-refine.css');

test('browser resolves only real local OBS theme assets without mutating theme source', () => {
  assert.equal(browserThemeAssetValue('url(theme:icons/colorway/mingcute/normal/eye.svg)'),
    'url("/icons/colorway/mingcute/normal/eye.svg")');
  assert.equal(browserThemeAssetValue('url(theme:icons/colorway/mingcute/selected/eye.svg)'),
    'url("/icons/colorway/mingcute/selected/eye.svg")');
  assert.equal(browserThemeAssetValue('url(theme:patterns/pattern.svg)'),
    'url("/patterns/pattern.svg")');
  assert.equal(browserThemeAssetValue('var(--primary)'), 'var(--primary)');
  assert.equal(browserThemeAssetValue('#123456'), '#123456');
  assert.equal(browserThemeAssetValue('url(theme:icons/../../private.svg)'),
    'url(theme:icons/../../private.svg)');
  const light = parseOVT(read('themes/Colorway-CatppuccinLatte-Blue.ovt'));
  const source = light.vars['--cw_icon_eye_base'] || parseOVT(qss).vars['--cw_icon_eye_base'];
  assert.match(browserThemeAssetValue(source), /^url\("\/icons\/colorway\/mingcute\/(?:normal|selected)\/eye\.svg"\)$/);
});

test('preview uses the exact themed MingCute SVG instead of recoloring a mask', () => {
  assert.match(preview, /--cw_icon_\$\{name\.replaceAll\('-', '_'\)\}_base/);
  assert.match(preview, /class="obs-sim-svg-icon/);
  assert.match(css, /\.obs-sim-svg-icon\s*\{[^}]*background-image:\s*var\(--obs-icon\)/s);
  assert.match(css, /\.obs-sim-status-icon\s*\{[^}]*mask:\s*var\(--obs-icon\)/s);
  assert.match(read('src/theme-loader.js'), /browserThemeAssetValue\(value\)/);
});

test('selected tree rows and palette picker match OBS selection ink and hover semantics', () => {
  assert.match(qss, /QTreeView::item:selected[^{}]*\{[^}]*background:\s*var\(--primary\);[^}]*color:\s*var\(--on_primary\)/s);
  assert.match(css, /\.obs-sim-list-row\.selected\s*\{[^}]*background:\s*var\(--primary\);[^}]*color:\s*var\(--on_primary\)/s);
  assert.match(css, /\.obs-sim-list-row\.selected:hover\s*\{[^}]*background:\s*var\(--primary_light\);[^}]*color:\s*var\(--on_primary_hover\)/s);
  assert.match(css, /\.colorway-theme-option\.selected\s*\{[^}]*background:\s*var\(--primary\);[^}]*color:\s*var\(--on_primary\)/s);
});

test('streaming, recording, virtual camera, and studio states reflect the real OBS QSS roles', () => {
  for (const [selector, border] of [
    ['stream', 'live'], ['record', 'recording'], ['virtualcam', 'lavender_accent'],
    ['studio', 'primary'],
  ]) assert.match(css, new RegExp('\\.obs-sim-control\\[data-control="' + selector
    + '"\\]\\.active\\s*\\{[^}]*border-color:\\s*var\\(--' + border + '\\)', 's'));
  assert.match(qss, /#streamButton\.state-active[^{}]*\{[^}]*border-color:\s*var\(--live\)/s);
  assert.match(qss, /#recordButton\.state-active[^{}]*\{[^}]*border-color:\s*var\(--recording\)/s);
  assert.match(preview, /data-control="stream"/);
  assert.match(preview, /data-control="record"/);
  assert.match(preview, /data-control="virtualcam"/);
  assert.match(preview, /data-control="studio"/);
});

test('selected density control uses authored OBS selection ink', () => {
  assert.match(css, /\.obs-sim-density button\.selected\s*\{[^}]*background:\s*var\(--primary\);[^}]*color:\s*var\(--on_primary\)/s);
});

test('non-Appearance preview pages never invent options as actual OBS settings', () => {
  assert.doesNotMatch(preview, /Example option|\$\{page\} setting/);
  assert.match(preview, /class=\"obs-sim-settings-notice\"/);
  assert.match(preview, /Only Appearance is interactive in this theme preview/);
});
