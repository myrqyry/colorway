import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const python = process.env.COLORWAY_QT_PYTHON || '/usr/bin/python3';
const available = spawnSync(python, ['-c', 'import PyQt6.QtWidgets']).status === 0;
const base = readFileSync(join(root, 'themes/Colorway.obt'), 'utf8');
test('standalone Qt reference renders theme-dependent combo pixels and real PNG files', { skip: !available }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'colorway-reference-'));
  try {
    const reports = ['Colorway-Monokai.ovt', 'Colorway-CatppuccinLatte-Blue.ovt'].map(file => {
      const variant = readFileSync(join(root, 'themes', file), 'utf8');
      const result = spawnSync(python, [join(root, 'scripts/qt-preview-reference.py'), '--output', dir], {
        input: JSON.stringify({ base, variant, root }), encoding: 'utf8', timeout: 15000,
        env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' },
      });
      assert.equal(result.status, 0, result.stderr + result.stdout);
      const report = JSON.parse(result.stdout);
      for (const state of ['normal', 'focus', 'hover']) {
        const sample = report.combo[state];
        assert.ok(sample.width >= 200 && sample.height >= 24);
        assert.match(sample.background, /^#[0-9a-f]{6}$/);
        assert.match(sample.border, /^#[0-9a-f]{6}$/);
        assert.equal(readFileSync(join(dir, 'combo-' + state + '.png')).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      }
      assert.notEqual(report.combo.normal.background, report.combo.focus.background);
      assert.notEqual(report.combo.normal.border, report.combo.focus.border);
      return report;
    });
    assert.notEqual(reports[0].combo.normal.background, reports[1].combo.normal.background);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
