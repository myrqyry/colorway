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

test('native atlas automatically emits standard widget families and their states', { skip: !available }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'colorway-atlas-'));
  try {
    const result = spawnSync(python, [join(root, 'scripts/qt-preview-reference.py'), '--output', dir], {
      input: JSON.stringify({ base, root }), encoding: 'utf8', timeout: 15000,
      env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' },
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const report = JSON.parse(result.stdout);
    const families = ['combo', 'lineEdit', 'spinbox', 'doubleSpinbox', 'textEdit', 'pushButton', 'toolButton', 'checkbox', 'radio', 'slider', 'verticalSlider', 'scrollbar', 'horizontalScrollbar', 'list', 'tabs', 'progress', 'group'];
    for (const family of families) {
      const states = report[family];
      assert.ok(states?.normal, family + ' has no normal specimen');
      assert.ok(states?.disabled, family + ' has no disabled specimen');
      for (const [state, sample] of Object.entries(states)) {
        assert.ok(sample.width > 0 && sample.height > 0, family + ' ' + state);
        assert.equal(readFileSync(join(dir, family + '-' + state + '.png')).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      }
    }
    for (const family of ['checkbox', 'radio', 'pushButton', 'toolButton'])
      assert.ok(report[family].checked && report[family].checkedDisabled, family);
    assert.ok(report.list.selected && report.tabs.selected);
    assert.equal(readFileSync(join(dir, 'atlas.png')).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('atlas catalog resolves actual parent chain, including nested variants', async () => {
  const { referenceCatalog, themeLayers } = await import('../scripts/build-qt-reference-atlas.mjs');
  const catalog = referenceCatalog(root);
  const { THEMES } = await import('../src/theme-catalog.js');
  assert.equal(catalog.size, THEMES.length + 1);
  const chain = themeLayers(catalog, 'Colorway-DraculaRefined.ovt');
  assert.deepEqual(chain.map(entry => entry.file), ['Colorway.obt', 'Colorway-Dracula.ovt', 'Colorway-DraculaRefined.ovt']);
  assert.throws(() => themeLayers(catalog, 'not-a-theme.ovt'), /Unknown theme/);
});

test('atlas batch writes a real contact sheet and index for a nested theme', { skip: !available }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'colorway-catalog-'));
  try {
    const result = spawnSync(process.execPath, [join(root, 'scripts/build-qt-reference-atlas.mjs'), '--output', dir, '--theme', 'Colorway-DraculaRefined.ovt'], {
      encoding: 'utf8', timeout: 15000, env: { ...process.env, COLORWAY_QT_PYTHON: python },
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
    assert.equal(index.themes.length, 1);
    assert.deepEqual(index.themes[0].layers, ['Colorway.obt', 'Colorway-Dracula.ovt', 'Colorway-DraculaRefined.ovt']);
    assert.equal(readFileSync(join(dir, index.themes[0].image)).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
