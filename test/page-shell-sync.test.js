import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const script = readFileSync(new URL('../src/page-shell-sync.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/page-shell-sync.css', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Colorway identity lives in the main page header', () => {
  assert.match(script, /className = 'colorway-page-header'/);
  assert.match(script, /data-colorway-page-title/);
  assert.match(script, /data-colorway-page-title-chars/);
  assert.match(script, /class="colorway-page-title-chars intro-pending"/);
  assert.match(script, /data-colorway-page-theme/);
  assert.match(script, /data-colorway-page-palette/);
  assert.match(styles, /\.colorway-page-title-copy h1/);
  assert.match(styles, /\.colorway-page-title-chars\.intro-pending\s*\{\s*visibility: hidden;/);
});

test('legacy Browse Import Export workbench chrome is hidden but remains mounted', () => {
  assert.match(styles, /\.workbench-tabs,\s*\n\.workbench-panel\s*\{\s*display: none !important;/m);
  assert.doesNotMatch(script, /\.remove\(\).*workbench/);
});

test('Settings titlebar is restored to OBS Settings rather than product branding', () => {
  assert.match(script, /title\.textContent = 'Settings'/);
  assert.match(script, /title\.id = 'obs-settings-title'/);
  assert.match(script, /data-colorway-dialog-brand/);
});

test('theme changes explicitly republish live colors to the OBS preview', () => {
  assert.match(script, /'--cw-live-primary': '--primary'/);
  assert.match(script, /'--cw-live-button-bg': '--button_bg'/);
  assert.match(script, /'--cw-live-warning': '--warning'/);
  assert.match(script, /'--cw-live-danger': '--danger'/);
  assert.match(script, /root\.style\.setProperty\(localName, value\)/);
  assert.match(styles, /var\(--cw-live-primary, var\(--primary\)\)/);
});

test('mixer faders update slider paint, dB readout, meter level and peak', () => {
  assert.match(script, /function syncMixerChannel\(slider\)/);
  assert.match(script, /db\.textContent = sliderDb\(value\)/);
  assert.match(script, /fill\.style\.height = `\$\{level\}%`/);
  assert.match(script, /peak\.style\.bottom = `\$\{Math\.min\(98, level \+ 4\)\}%`/);
  assert.match(script, /slider\.addEventListener\('input', \(\) => syncMixerChannel\(slider\)\)/);
});

test('font size number and slider stay bidirectionally synchronized', () => {
  assert.match(script, /number\.addEventListener\('input', \(\) => apply\(number\.value\)\)/);
  assert.match(script, /slider\.addEventListener\('input', \(\) => apply\(slider\.value\)\)/);
  assert.match(script, /--obs-sim-font-scale/);
});

test('page sync loads after preview, product actions, and ambient source', () => {
  const preview = index.indexOf('/src/obs-preview.js');
  const actions = index.indexOf('/src/obs-preview-actions.js');
  const ambient = index.indexOf('/src/obs-preview-ambient.js');
  const pageSync = index.indexOf('/src/page-shell-sync.js');
  assert.ok(preview >= 0);
  assert.ok(actions > preview);
  assert.ok(ambient > actions);
  assert.ok(pageSync > ambient);
});
