import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const preview = read('src/obs-preview.js');
const css = read('src/obs-preview.css');
const refine = read('src/obs-preview-refine.js');
const refineStyles = read('src/obs-preview-refine.css');
const parity = read('scripts/check-preview-parity.mjs');

test('OBS-themed web preview keeps playful controls without a fake state-test modal or launcher', () => {
  assert.match(preview, /OBS Studio preview/);
  assert.match(preview, /data-open-settings/);
  assert.match(preview, /data-scene-row/);
  assert.doesNotMatch(preview, /data-(?:state-lab|open-state-lab|close-state-lab|component-showcase)/);
  assert.doesNotMatch(preview, /Secondary information|Crash Recovery|Run in Safe Mode/);
  assert.doesNotMatch(refine, /data-permanent-open-state-lab|populateStateLabControl|wireStateLabModality/);
  assert.doesNotMatch(css, /\.obs-sim-(?:showcase|state-lab|state-card|crash-recovery|state-grid)/);
  assert.doesNotMatch(refineStyles, /\.obs-sim-(?:state-test|state-lab)/);
  assert.match(parity, /Removed state lab is still mounted/);
});
