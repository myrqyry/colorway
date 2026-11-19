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
const formatsAvailable = available && spawnSync(python, ['-c', 'from PyQt6.QtSvg import QSvgGenerator; from PyQt6.QtGui import QImageWriter; from PIL import Image; assert b"webp" in [bytes(f) for f in QImageWriter.supportedImageFormats()]']).status === 0;
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

test('optional native image exports include true Qt SVG and pixel-exact lossless WebP', { skip: !formatsAvailable }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'colorway-image-formats-'));
  try {
    const result = spawnSync(python, [join(root, 'scripts/qt-preview-reference.py'), '--output', dir,
      '--family', 'combo', '--family', 'checkbox', '--format', 'png', '--format', 'webp', '--format', 'svg'], {
      input: JSON.stringify({ base, root }), encoding: 'utf8', timeout: 15000,
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const report = JSON.parse(result.stdout);
    for (const [family, states] of Object.entries({combo: report.combo, checkbox: report.checkbox})) {
      for (const [state, sample] of Object.entries(states)) {
        const stem = join(dir, family + '-' + state);
        const svg = readFileSync(stem + '.svg', 'utf8');
        assert.match(svg, /<svg\b/);
        assert.match(svg, /<(path|rect|text)\b/);
        assert.equal(readFileSync(stem + '.webp').subarray(8, 12).toString(), 'WEBP');
        assert.equal(sample.formats.webp.pixelExact, true);
        assert.ok(sample.formats.svg.bytes > 0);
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('catalog exports lossless WebP sheets and optional individual SVG specimens', { skip: !formatsAvailable }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'colorway-catalog-formats-'));
  try {
    const result = spawnSync(process.execPath, [join(root, 'scripts/build-qt-reference-atlas.mjs'),
      '--output', dir, '--theme', 'Colorway-Monokai.ovt', '--format', 'webp', '--format', 'svg', '--specimens'], {
      encoding: 'utf8', timeout: 15000, env: { ...process.env, COLORWAY_QT_PYTHON: python },
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const entry = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')).themes[0];
    assert.equal(readFileSync(join(dir, entry.image)).subarray(8, 12).toString(), 'WEBP');
    const report = JSON.parse(readFileSync(join(dir, entry.report), 'utf8'));
    assert.ok(report.combo.normal.formats.webp.pixelExact);
    assert.equal(report.combo.normal.preferredRaster, 'webp');
    assert.equal(report.slider.normal.hasTransparency, true);
    assert.equal(report.slider.normal.preferredRaster, 'png');
    assert.match(readFileSync(join(dir, 'Colorway-Monokai/combo-normal.svg'), 'utf8'), /<svg\b/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
