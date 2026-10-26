import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const python = process.env.COLORWAY_QT_PYTHON || '/usr/bin/python3';
const available = spawnSync(python, ['-c', 'import PyQt6.QtWidgets'], { encoding: 'utf8' }).status === 0;
const base = readFileSync(new URL('themes/Colorway.obt', root), 'utf8');
const probe = (source, variant = '', checks, obsPadding = 4) => spawnSync(python,
  [fileURLToPath(new URL('test/helpers/qss-probe.py', root))], {
    input: JSON.stringify({ base: source, variant, checks, obsPadding, root: fileURLToPath(root) }),
    encoding: 'utf8', timeout: 15000, env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' },
  });
for (const padding of [1, 4, 8]) {
  test(`source visibility/lock outlines fit compact rows at OBS padding ${padding}`, { skip: !available }, () => {
    const result = probe(base, '', ['source-outline'], padding);
    assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
  });
}
for (const file of [null, 'Colorway-Fairyfloss.ovt', 'Colorway-CatppuccinLatte-Blue.ovt']) {
  test(`source context buttons replace native dark icons in real Qt: ${file || 'base'}`, { skip: !available }, () => {
    const variant = file ? readFileSync(new URL('themes/' + file, root), 'utf8') : '';
    const result = probe(base, variant, ['source-context']);
    assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
  });
}
for (const file of [null, 'Colorway-CatppuccinLatte-Teal.ovt', 'Colorway-RosePine-Pine.ovt', 'Colorway-Fairyfloss.ovt', 'Colorway-TwitchDark.ovt', 'Colorway-Vercel.ovt']) {
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

for (const file of ['Colorway-90sAnime.ovt', 'Colorway-CatppuccinLatte-Blue.ovt']) {
  test(`Settings sidebar focus does not draw an accent frame: ${file}`, { skip: !available }, () => {
    const variant = readFileSync(new URL('themes/' + file, root), 'utf8');
    const result = probe(base, variant, ['sidebar-focus']);
    assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
  });
}

for (const file of ['Colorway-RosePineMoon-Gold.ovt', 'Colorway-CatppuccinLatte-Blue.ovt']) {
  test(`Qt keeps compact OBS spinbox buttons separate and group checkbox states distinct: ${file}`, { skip: !available }, () => {
    const variant = readFileSync(new URL('themes/' + file, root), 'utf8');
    const result = probe(base, variant, ['control-glyphs']);
    assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
  });
}

for (const file of ['Colorway-RosePineMoon-Gold.ovt', 'Colorway-CatppuccinLatte-Blue.ovt']) {
  test(`Qt renders visibly rounded track checkboxes and matching compact spin chevrons: ${file}`, { skip: !available }, () => {
    const variant = readFileSync(new URL('themes/' + file, root), 'utf8');
    const result = probe(base, variant, ['control-polish']);
    assert.equal(result.status, 0, result.stderr + '\\n' + result.stdout);
  });
}

for (const file of ['Colorway-RosePineMoon-Gold.ovt', 'Colorway-CatppuccinLatte-Blue.ovt']) {
  test(`OBS Simple Audio Track radio indicators are visibly circular: ${file}`, { skip: !available }, () => {
    const variant = readFileSync(new URL('themes/' + file, root), 'utf8');
    const result = probe(base, variant, ['output-track-radio-shape']);
    assert.equal(result.status, 0, result.stderr + '\\n' + result.stdout);
  });
}

for (const file of ['Colorway-RosePineMoon-Gold.ovt', 'Colorway-CatppuccinLatte-Blue.ovt']) {
  test(`Standard OBS combos share a usable minimum while preview scaling stays compact: ${file}`, { skip: !available }, () => {
    const variant = readFileSync(new URL('themes/' + file, root), 'utf8');
    const result = probe(base, variant, ['transition-dock-combo-height']);
    assert.equal(result.status, 0, result.stderr + '\\n' + result.stdout);
  });
}

for (const file of ['Colorway-RosePineMoon-Gold.ovt', 'Colorway-AdaptaEvergreen.ovt']) {
  test(`hover changes rendered icon tools and input pixels: ${file}`, { skip: !available }, () => {
    const variant = readFileSync(new URL('themes/' + file, root), 'utf8');
    const result = probe(base, variant, ['hover-feedback']);
    assert.equal(result.status, 0, result.stderr + '\\n' + result.stdout);
  });
}

test('Qt hover probe catches the original no-op icon-tool generator and Adapta input palette', { skip: !available }, () => {
  const gold = readFileSync(new URL('themes/Colorway-RosePineMoon-Gold.ovt', root), 'utf8');
  const tool = 'QToolButton.icon-plus';
  const oldNormal = `${tool}, ${tool}:checked, ${tool}:pressed { background: var(--bg_base); color: var(--text); }`;
  const oldHover = `${tool}:hover:!pressed:!disabled { background: var(--button_bg_hover); border-color: var(--input_border_hover); }`;
  const oldChecked = `${tool}:checked, ${tool}:pressed { border-color: var(--primary); }`;
  const oldCheckedHover = `${tool}:checked:hover:!pressed { background: var(--button_bg_hover); border-color: var(--primary_lighter); }`;
  const noOp = base.replace(
    [oldNormal, oldHover, oldChecked, oldCheckedHover].join('\n'),
    [`${tool}, ${tool}:hover, ${tool}:checked, ${tool}:pressed { background: var(--bg_base); color: var(--text); }`, oldChecked].join('\n'),
  );
  assert.notEqual(noOp, base, 'generator mutant must actually modify the stylesheet');
  const badTool = probe(noOp, gold, ['hover-feedback']);
  assert.notEqual(badTool.status, 0);
  assert.match(badTool.stderr, /hover is visually unchanged.*classed-tool/);

  const evergreen = readFileSync(new URL('themes/Colorway-AdaptaEvergreen.ovt', root), 'utf8');
  const noOpPalette = evergreen.replace(/^    --input_bg_hover: #38444a;$/m, '    --input_bg_hover: #29353b;');
  assert.notEqual(noOpPalette, evergreen, 'palette mutant must actually modify the variant');
  const badPalette = probe(base, noOpPalette, ['hover-feedback']);
  assert.notEqual(badPalette.status, 0);
  assert.match(badPalette.stderr, /hover is visually unchanged.*(?:combo|line)/);
});

test('Qt control probe rejects clipped arrows and misleading group checkbox glyphs', { skip: !available }, () => {
  const variant = readFileSync(new URL('themes/Colorway-RosePineMoon-Gold.ovt', root), 'utf8');
  for (const [mutation, failure] of [
    ['QSpinBox::up-button, QSpinBox::down-button { height: 14px; }', 'spinbox button overlap'],
    ['QGroupBox::indicator:unchecked { image: var(--cw_icon_checkbox_line_base); }', 'unchecked group indicator has a check glyph'],
    ['QGroupBox::indicator:checked { image: var(--cw_icon_checkbox_fill_base); border-color: transparent; }', 'checked group indicator missing accent outline'],
  ]) {
    const result = probe(base + '\n' + mutation, variant, ['control-glyphs']);
    assert.notEqual(result.status, 0, `mutation escaped: ${mutation}`);
    assert.ok(result.stderr.includes(failure), result.stderr);
  }
});

test('Qt probe rejects deliberate reintroductions of the reviewed defects', { skip: !available }, () => {
  for (const [check, mutation, message] of [
    ['source-outline', 'SourceTreeItem .checkbox-icon::indicator { width: var(--icon_base); height: var(--icon_base); }', 'source indicator clipping'],
    ['source-context', 'QPushButton#sourcePropertiesButton { icon: url(theme:icons/colorway/mingcute/selected/cogs.svg); }', 'source context icon'],
    ['icons', 'QPushButton.icon-plus:pressed { icon: var(--cw_icon_plus_base); }', 'pressed icon'],
    ['focus', 'QComboBox:focus { border-color: var(--input_border_hover); }', 'combo focus border'],
    ['scroll', 'QScrollBar::add-page:vertical { background: var(--scrollbar_down); }', 'scroll page'],
    ['settings', 'OBSBasicSettings QScrollArea > QWidget > QWidget { background: transparent; }', 'settings background'],
    ['combo-size', 'OBSBasicSettings QComboBox { min-height: 0px; }', 'settings combo minimum height'],
    ['form-size', 'OBSBasicSettings QAbstractSpinBox, OBSBasicSettings QLineEdit { min-height: 0px; }', 'settings form minimum height'],
    ['sidebar-focus', 'OBSBasicSettings QListWidget:focus { border: 2px solid var(--primary); }', 'settings sidebar focus frame'],
    ['settings', 'OBSBasicSettings QGroupBox QCheckBox:disabled { color: var(--text_disabled); }', 'settings disabled checkbox ink'],
    ['settings', 'OBSBasicSettings QGroupBox QCheckBox::indicator:unchecked { border: 1px solid var(--border_base); }', 'unchecked checkbox outline'],
    ['group', 'QGroupBox { margin-top: 0px; }', 'group title reservation'],
  ]) {
    const variant = check === 'settings' ? readFileSync(new URL('themes/Colorway-SLSO8Pixels.ovt', root), 'utf8') : '';
    const result = probe(base + '\n' + mutation, variant, [check], check === 'source-outline' ? 1 : 4);
    assert.notEqual(result.status, 0, `probe failed to detect ${check} mutant`);
    assert.match(result.stderr, new RegExp(message));
  }
});
