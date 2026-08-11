import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const refine = readFileSync(new URL('../src/obs-preview-refine.js', import.meta.url), 'utf8');
const refineStyles = readFileSync(new URL('../src/obs-preview-refine.css', import.meta.url), 'utf8');

test('Appearance is a permanent controller over the OBS preview', () => {
  assert.match(refine, /function makeSettingsPermanent\(root\)/);
  assert.match(refine, /dialog\.removeAttribute\('hidden'\)/);
  assert.match(refine, /querySelectorAll\('\[data-close-settings\], \.obs-sim-dialog-close'\)/);
  assert.match(refineStyles, /\.obs-sim-dialog-close,\s*\.obs-sim-dialog-actions\s*\{\s*display: none !important;/s);
});

test('visible Colorway style picker restores palette previews', () => {
  assert.match(refine, /function buildThemePicker\(root\)/);
  assert.match(refine, /querySelector\('\.theme-palette'\)/);
  assert.match(refine, /querySelectorAll\('\.palette-swatch'\)/);
  assert.match(refineStyles, /\.colorway-theme-option \.palette-swatch/);
  assert.match(refineStyles, /\.colorway-theme-trigger-palette \.palette-swatch/);
});

test('theme switching refreshes browser-only theme state', () => {
  assert.match(refine, /new MutationObserver\(\(\) => syncVisibleControls\(root\)\)/);
  assert.match(refine, /applyPattern\(currentPattern\(\)\)/);
  assert.match(refine, /wireSliders\(root\)/);
});

test('fake OBS sliders use Colorway slider variables instead of native accent styling', () => {
  assert.match(refineStyles, /\.obs-sim-font-slider\s*\{[^}]*appearance: none/s);
  assert.match(refineStyles, /var\(--slider_groove_thickness, 14px\)/);
  assert.match(refineStyles, /var\(--slider_handle_size, 14px\)/);
  assert.match(refineStyles, /\.obs-sim-vfader\s*\{[^}]*writing-mode: vertical-lr/s);
  assert.doesNotMatch(refineStyles, /\.obs-sim-font-slider[^}]*accent-color:/s);
});

test('Yami remains an export nicety rather than the Browse-page call to action', () => {
  assert.match(refine, /querySelector\('#workbench-download-yami'\)\?\.remove\(\)/);
  assert.match(refineStyles, /#workbench-download-yami\s*\{\s*display: none !important;/s);
});
