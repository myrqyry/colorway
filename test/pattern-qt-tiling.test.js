import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const base = readFileSync(new URL('themes/Colorway.obt', root), 'utf8');
const python = process.env.COLORWAY_QT_PYTHON || '/usr/bin/python3';
const qtAvailable = spawnSync(python, ['-c', 'import PyQt6.QtSvg, PyQt6.QtWidgets'], { encoding: 'utf8' }).status === 0;

test('OBS repeating SVG pattern QSS does not disable Qt tiling', () => {
  const qss = base.replace(/\/\*[\s\S]*?\*\//g, '');
  const patternRules = [...qss.matchAll(/([^{}]+)\{([^{}]*background-image:\s*var\(--pattern_eyes\)[^{}]*)\}/g)];
  assert.ok(patternRules.length >= 7, 'Must cover all base pattern-bearing widgets');
  for (const [full, selector, declarations] of patternRules) {
    assert.doesNotMatch(declarations, /background-repeat\s*:/, selector.trim());
  }
});

test('real Qt paints contrasting pixels from the authored SceneTree pattern SVG', { skip: !qtAvailable }, () => {
  const result = spawnSync(python,
    [fileURLToPath(new URL('test/helpers/pattern-render-probe.py', root))], {
      input: JSON.stringify({ base, root: fileURLToPath(root) }),
      encoding: 'utf8', timeout: 15000,
      env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' },
    });
  assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
  assert.equal(JSON.parse(result.stdout).qt, 'passed');
});
