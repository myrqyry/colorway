import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const preview = readFileSync(new URL('../src/obs-preview.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/obs-preview.css', import.meta.url), 'utf8');
const reference = readFileSync(new URL('../docs/OBS_DESIGN_REFERENCE.md', import.meta.url), 'utf8');
const iconDir = new URL('../public/icons/obs-design/', import.meta.url);

test('OBS simulator replaces source/status placeholder glyphs with icon primitives', () => {
  assert.match(preview, /function iconMarkup\(/);
  assert.match(preview, /iconMarkup\(source\.icon\)/);
  assert.match(preview, /iconMarkup\('eye'\)/);
  assert.match(preview, /iconMarkup\(locked \? 'lock' : 'unlock'\)/);
  assert.doesNotMatch(preview, /\{ name: 'Browser', icon: '▧' \}/);
  assert.doesNotMatch(preview, /data-source-action="visible"[^\n]*>◉</);
  assert.doesNotMatch(preview, /data-source-action="lock"[^\n]*[◆◇]/);
});

test('Sources toolbar keeps OBS-informed grouped and trailing static actions', () => {
  assert.match(preview, /data-toolbar-group="source-edit"/);
  assert.match(preview, /data-toolbar-group="source-order"/);
  assert.match(preview, /data-toolbar-group="source-static"/);
  assert.match(preview, /buttonIcon\('settings', 'Source properties'\)/);
  assert.match(preview, /buttonIcon\('filter', 'Source filters'\)/);
});

test('status bar uses imported OBS design state families', () => {
  const files = new Set(readdirSync(iconDir));
  for (const file of [
    'streaming-active.svg',
    'streaming-inactive.svg',
    'recording-active.svg',
    'recording-inactive.svg',
    'network-good.svg',
    'network-inactive.svg',
  ]) assert.ok(files.has(file), `${file} is missing`);

  assert.match(preview, /data-stream-indicator data-state="inactive"/);
  assert.match(preview, /data-record-indicator data-state="inactive"/);
  assert.match(preview, /data-network-indicator data-state="inactive"/);
  assert.match(preview, /streamIndicator\.dataset\.state = streaming \? 'active' : 'inactive'/);
  assert.match(preview, /recordIndicator\.dataset\.state = recording \? 'active' : 'inactive'/);
});

test('imported OBS geometry stays themeable', () => {
  assert.match(styles, /mask: var\(--obs-icon\) center \/ contain no-repeat/);
  assert.match(styles, /background: currentColor/);
  assert.match(styles, /--cw-live-primary/);
  assert.match(styles, /--cw-live-danger/);
  assert.match(styles, /--cw-live-success/);
});

test('reference docs pin provenance and reject mockup-as-spec drift', () => {
  assert.match(reference, /6a7639840dc6d88546da127c18374541b3fadfa2/);
  assert.match(reference, /2024-04-19/);
  assert.match(reference, /CC0-1\.0/);
  assert.match(reference, /not as a current OBS UI specification/i);
});


test('state stress lab exercises all Colorway semantic state roles', () => {
  assert.match(preview, /function stateLabMarkup\(\)/);
  assert.match(preview, /data-open-state-lab/);
  assert.match(preview, /data-state-kind="info"/);
  assert.match(preview, /data-state-kind="warning"/);
  assert.match(preview, /data-state-kind="error"/);
  assert.match(preview, /data-state-kind="success"/);
  assert.match(styles, /\.obs-sim-state-card\.info\s*\{\s*--state-color:\s*var\(--cw-live-primary, var\(--primary\)\)/);
  assert.match(styles, /\.obs-sim-state-card\.warning\s*\{\s*--state-color:\s*var\(--cw-live-warning, var\(--warning\)\)/);
  assert.match(styles, /\.obs-sim-state-card\.error\s*\{\s*--state-color:\s*var\(--cw-live-danger, var\(--danger\)\)/);
  assert.match(styles, /\.obs-sim-state-card\.success\s*\{\s*--state-color:\s*var\(--cw-live-success, var\(--success\)\)/);
});

test('state stress lab carries source-backed OBS vocabulary without claiming current placement', () => {
  assert.match(preview, />Secondary information</);
  assert.match(preview, />Warning</);
  assert.match(preview, />Error</);
  assert.match(preview, />Crash Recovery</);
  assert.match(preview, />Run in Safe Mode</);
  assert.match(preview, />Run Normally</);
  assert.match(reference, /testing surface, not a claim about current OBS notification placement/i);
  assert.match(reference, /Colorway does not define a separate info token/i);
});
