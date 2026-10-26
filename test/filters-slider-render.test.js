import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const python = process.env.COLORWAY_QT_PYTHON || '/usr/bin/python3';
const available = spawnSync(python, ['-c', 'import PyQt6.QtWidgets']).status === 0;
const probe = (base, variant, check) => spawnSync(python,
  [fileURLToPath(new URL('test/helpers/qss-probe.py', root))], {
    input: JSON.stringify({ base, variant, checks: [check], root: fileURLToPath(root), obsPadding: 1 }),
    encoding: 'utf8', timeout: 15000, env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' },
  });

for (const file of [null, 'Colorway-Fairyfloss.ovt', 'Colorway-CatppuccinLatte-Blue.ovt']) {
  for (const check of ['filters-surface', 'slider-endpoints']) {
    test(`Qt ${check} retains the intended surface and full handle: ${file || 'base'}`, { skip: !available }, () => {
      const result = probe(read('themes/Colorway.obt'), file ? read('themes/' + file) : '', check);
      assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
    });
  }
}
