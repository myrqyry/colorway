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

test('preview parity refuses a port that is not serving this Colorway build', () => {
  // The readiness probe used to accept any HTTP 200. An unrelated dev server left
  // on the port then satisfied it, and the run failed later with the misleading
  // "Theme catalog did not mount" instead of naming the real conflict.
  assert.match(parity, /COLORWAY_PREVIEW_PORT/);
  assert.match(parity, /servedAsColorway/);
  assert.match(parity, /Colorway OBS Theme Preview/);
  assert.match(parity, /did not start serving Colorway/);
  assert.doesNotMatch(parity, /if \(\(await fetch\('http:\/\/127\.0\.0\.1:' \+ port\)\)\.ok\) break;/);
});
