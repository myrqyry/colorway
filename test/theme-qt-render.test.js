import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const python = process.env.COLORWAY_QT_PYTHON || '/usr/bin/python3';
const available = spawnSync(python, ['-c', 'import PyQt6.QtWidgets'], { encoding: 'utf8' }).status === 0;
const base = readFileSync(new URL('themes/Colorway.obt', root), 'utf8');
const probe = (source, variant = '', checks) => spawnSync(python,
  [fileURLToPath(new URL('test/helpers/qss-probe.py', root))], {
    input: JSON.stringify({ base: source, variant, checks, root: fileURLToPath(root) }),
    encoding: 'utf8', timeout: 15000, env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' },
  });
for (const file of [null, 'Colorway-CatppuccinLatte-Teal.ovt', 'Colorway-RosePine-Pine.ovt']) {
  test(`real Qt renders the corrected state/cascade rules: ${file || 'base'}`, { skip: !available }, () => {
    const result = probe(base, file ? readFileSync(new URL('themes/' + file, root), 'utf8') : '');
    assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
    assert.equal(JSON.parse(result.stdout).qt, 'passed');
  });
}

for (const file of [null, 'Colorway-Carbonfox.ovt', 'Colorway-SLSO8Pixels.ovt', 'Colorway-CatppuccinLatte-Blue.ovt', 'Colorway-Cursor.ovt', 'Colorway-Everforest-Light-Soft.ovt']) {
  test(`real Qt paints Settings scroll content using the variant background: ${file || 'base'}`, { skip: !available }, () => {
    const variant = file ? readFileSync(new URL('themes/' + file, root), 'utf8') : '';
    const result = probe(base, variant, ['settings']);
    assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
  });
}

for (const file of ['Colorway-EvondevDracula.ovt', 'Colorway-CatppuccinLatte-Blue.ovt']) {
  test(`Settings combo stays tall enough for the font in compact layout: ${file}`, { skip: !available }, () => {
    const variant = readFileSync(new URL('themes/' + file, root), 'utf8');
    const result = probe(base, variant, ['combo-size']);
    assert.equal(result.status, 0, result.stderr + '\\n' + result.stdout);
  });
}

for (const file of ['Colorway-EvondevDracula.ovt', 'Colorway-CatppuccinLatte-Blue.ovt']) {
  test(`Settings text and numeric fields retain usable compact height: ${file}`, { skip: !available }, () => {
    const variant = readFileSync(new URL('themes/' + file, root), 'utf8');
    const result = probe(base, variant, ['form-size']);
    assert.equal(result.status, 0, result.stderr + '\\n' + result.stdout);
  });
}

test('Qt probe rejects deliberate reintroductions of the reviewed defects', { skip: !available }, () => {
  for (const [check, mutation, message] of [
    ['icons', 'QPushButton.icon-plus:pressed { icon: var(--cw_icon_plus_base); }', 'pressed icon'],
    ['focus', 'QComboBox:focus { border-color: var(--input_border_hover); }', 'combo focus border'],
    ['scroll', 'QScrollBar::add-page:vertical { background: var(--scrollbar_down); }', 'scroll page'],
    ['settings', 'OBSBasicSettings QScrollArea > QWidget > QWidget { background: transparent; }', 'settings background'],
    ['combo-size', 'OBSBasicSettings QComboBox { min-height: 0px; }', 'settings combo minimum height'],
    ['form-size', 'OBSBasicSettings QAbstractSpinBox, OBSBasicSettings QLineEdit { min-height: 0px; }', 'settings form minimum height'],
    ['settings', 'OBSBasicSettings QGroupBox QCheckBox:disabled { color: var(--text_disabled); }', 'settings disabled checkbox ink'],
    ['settings', 'OBSBasicSettings QGroupBox QCheckBox::indicator:unchecked { border: 1px solid var(--border_base); }', 'unchecked checkbox outline'],
    ['group', 'QGroupBox { margin-top: 0px; }', 'group title reservation'],
  ]) {
    const variant = check === 'settings' ? readFileSync(new URL('themes/Colorway-SLSO8Pixels.ovt', root), 'utf8') : '';
    const result = probe(base + '\n' + mutation, variant, [check]);
    assert.notEqual(result.status, 0, `probe failed to detect ${check} mutant`);
    assert.match(result.stderr, new RegExp(message));
  }
});
