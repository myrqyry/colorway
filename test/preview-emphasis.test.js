import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('primary theme preview prioritizes OBS widgets, not duplicated status decorations', () => {
  const source = read('src/main.js');
  assert.doesNotMatch(source, /<div class="card-header">Status Indicators<\/div>/);
  assert.doesNotMatch(source, /function updateStatusDemo\(/);
  assert.doesNotMatch(source, /setInterval\(updateStatusDemo/);
  assert.doesNotMatch(read('src/styles.css'), /\.status-(?:demo|badge|row|stats)\b|@keyframes pulse-dot/,
    'dead status showcase styling should not be shipped');
  for (const title of ['Buttons', 'Text Inputs', 'List Items', 'Audio Mixer']) {
    assert.ok(source.includes('<div class="card-header">' + title + '</div>'), title);
  }
  const obs = read('src/obs-preview.js');
  for (const label of ['Scenes', 'Sources', 'Audio Mixer']) {
    assert.ok(obs.includes("dock('" + label + "'"), label);
  }
  assert.match(obs, /class="obs-sim-statusbar"/, 'actual OBS status bar is retained in its real location');
});
