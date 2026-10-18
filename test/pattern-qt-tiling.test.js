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
  assert.ok(patternRules.length >= 3, 'Decorative background and Settings page must retain tiling');
  for (const [full, selector, declarations] of patternRules) {
    assert.doesNotMatch(declarations, /background-repeat\s*:/, selector.trim());
  }
});

test('patterns decorate structural surfaces, not dense lists, tree data, or dock contents', () => {
  const qss = base.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [...qss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([,selector,style]) => ({selector: selector.trim(), style}));
  const rulesFor = (name) => blocks.filter(({selector}) => selector.split(',').some(part => part.trim() === name));
  for (const name of ['OBSBasic > QWidget', 'OBSBasicSettings QScrollArea > QWidget > QWidget']) {
    assert.ok(rulesFor(name).some(({style}) => /background-image:\s*var\(--pattern_eyes\)/.test(style)), name + ' lost decorative texture');
  }
  for (const name of ['SceneTree', 'SourceTree', 'QListWidget', 'QTreeView', 'QTableView',
    'OBSBasicSettings QListWidget', 'OBSBasicFilters QListWidget', 'QAbstractItemView',
    'OBSDock > QWidget']) {
    assert.ok(rulesFor(name).length, name + ' is missing from the theme');
    for (const {style} of rulesFor(name))
      assert.doesNotMatch(style, /background-image:\s*var\(--pattern_eyes\)/, name + ' must have a calm readable content surface');
  }
});

test('real Qt paints contrasting pixels from the authored Settings page pattern SVG', { skip: !qtAvailable }, () => {
  const result = spawnSync(python,
    [fileURLToPath(new URL('test/helpers/pattern-render-probe.py', root))], {
      input: JSON.stringify({ base, root: fileURLToPath(root) }),
      encoding: 'utf8', timeout: 15000,
      env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' },
    });
  assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
  assert.equal(JSON.parse(result.stdout).qt, 'passed');
});
