import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TEST_DIR, '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const base = read('themes/Colorway.obt');
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '');
const uncommentedBase = stripComments(base);
const selectorRules = [...uncommentedBase.matchAll(/(^|\})\s*([^{}]+?)\s*\{/gm)]
  .flatMap((match) => match[2].split(','))
  .map((selector) => selector.replace(/\s+/g, ' ').trim())
  .filter(Boolean);
const hasSelectorRule = (selector) =>
  selectorRules.some((rule) => rule === selector || rule.startsWith(selector + ' '));

test('source and public theme distributions are byte-identical', () => {
  const sourceDir = join(ROOT, 'themes');
  const publicDir = join(ROOT, 'public', 'themes');
  const sourceFiles = readdirSync(sourceDir)
    .filter((name) => /\.(?:obt|ovt)$/.test(name))
    .sort();
  const publicFiles = readdirSync(publicDir)
    .filter((name) => /\.(?:obt|ovt)$/.test(name))
    .sort();

  assert.deepEqual(publicFiles, sourceFiles);

  for (const file of sourceFiles) {
    assert.equal(
      readFileSync(join(sourceDir, file), 'utf8'),
      readFileSync(join(publicDir, file), 'utf8'),
      `public/themes/${file} drifted from themes/${file}`,
    );
  }
});

test('Colorway covers current OBS widget hooks without dropping legacy compatibility', () => {
  for (const selector of [
    '.btn-mute.mute-warning',
    '.btn-create-new',
    'QToolButton:checked',
    '.btn-tool:disabled',
    'QDateTimeEdit',
    'QMenu > QMenu',
    'QTableView::indicator',
    'idian--ListHeader',
    'idian--RowList',
    'idian--RowInfo',
    'idian--CollapsibleGroup',
    'idian--InlineButton',
  ]) {
    assert.ok(hasSelectorRule(selector), `missing current OBS hook: ${selector}`);
  }

  for (const legacy of [
    '.btn-mute.mute-unassigned',
    'idian--Group',
    'idian--PropertiesList',
    'idian--CollapsibleRow',
  ]) {
    assert.ok(hasSelectorRule(legacy), `legacy compatibility disappeared: ${legacy}`);
  }
});

test('live and recording controls inherit each variant semantic colors', () => {
  assert.match(base, /--live:\s*var\(--primary\);/);
  assert.match(base, /--recording:\s*var\(--danger\);/);
  assert.match(base, /--live_bg_start:\s*var\(--accent_bg_start\);/);
  assert.doesNotMatch(base, /rgba\(56,\s*189,\s*248/);
  assert.doesNotMatch(base, /rgba\(251,\s*77,\s*93/);
});

test('current input sizing and tab placement guards are present', () => {
  assert.match(base, /--spinbox_min_width:/);
  assert.match(base, /min-width:\s*var\(--spinbox_min_width\);/);
  assert.match(base, /QTabBar::top/);
  assert.match(base, /QTabBar::bottom/);
  assert.match(base, /QDateTimeEdit:focus/);
  assert.match(base, /QToolButton:disabled/);
});


test('widget rules consume semantic tokens instead of raw OBS palette ramps', () => {
  const vars = base.match(/@OBSThemeVars\s*\{[\s\S]*?\n\}/);
  assert.ok(vars, 'Colorway vars block missing');
  const qss = base.slice(base.indexOf(vars[0]) + vars[0].length);
  assert.doesNotMatch(
    qss,
    /var\(--(?:blue|red|pink|teal|purple|green|yellow|grey|white|black)\d+\)/,
    'widget QSS must use semantic Colorway tokens rather than raw palette ramps',
  );
  assert.match(base, /--scrollbar_bg:\s*var\(--bg_base\);/);
  assert.match(base, /--scrollbar_border:\s*var\(--border_color\);/);
  assert.match(base, /--palette_dark:\s*var\(--bg_dock\);/);
  assert.match(base, /--surface_dim:\s*var\(--button_bg_disabled\);/);
});


test('light variants keep warning and success text readable', () => {
  const sourceDir = join(ROOT, 'themes');

  const channel = (value) => {
    const srgb = value / 255;
    return srgb <= 0.04045
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex) => {
    const value = hex.slice(1);
    const [r, g, b] = [0, 2, 4]
      .map((offset) => parseInt(value.slice(offset, offset + 2), 16))
      .map(channel);
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
  };
  const contrast = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };

  const warnings = new Set();
  const successes = new Set();

  for (const file of readdirSync(sourceDir).filter((name) => name.endsWith('.ovt'))) {
    const theme = readFileSync(join(sourceDir, file), 'utf8');
    if (!/\bdark:\s*'false';/.test(theme)) continue;

    const vars = theme.match(/@OBSThemeVars\s*\{([\s\S]*?)\n\}/);
    assert.ok(vars, file + ': vars block missing');
    const declarations = stripComments(vars[1]);

    const warning = declarations.match(/--warning:\s*(#[0-9a-fA-F]{6})\s*;/)?.[1];
    const success = declarations.match(/--success:\s*(#[0-9a-fA-F]{6})\s*;/)?.[1];
    const hover = declarations.match(/--bg_hover:\s*(#[0-9a-fA-F]{6})\s*;/)?.[1];

    assert.ok(warning, file + ': light variant must override --warning');
    assert.ok(success, file + ': light variant must override --success');
    assert.ok(hover, file + ': light variant must define a concrete --bg_hover');

    warnings.add(warning.toLowerCase());
    successes.add(success.toLowerCase());

    assert.match(
      declarations,
      /--checkbox_check_icon:\s*url\(theme:icons\/colorway\/iconamoon\/selected\/check\.svg\)\s*;/,
      file + ': light variant must use the dark checkbox glyph on light surfaces',
    );

    assert.ok(
      contrast(warning, hover) >= 4.5,
      file + ': --warning must keep at least 4.5:1 contrast against --bg_hover',
    );
    assert.ok(
      contrast(success, hover) >= 4.5,
      file + ': --success must keep at least 4.5:1 contrast against --bg_hover',
    );
  }

  assert.ok(
    warnings.size >= 5,
    'light variants must preserve multiple warning palette families',
  );
  assert.ok(
    successes.size >= 5,
    'light variants must preserve multiple success palette families',
  );
});

test('light palette comments distinguish source values from accessibility overrides', () => {
  const sourceDir = join(ROOT, 'themes');
  for (const file of readdirSync(sourceDir).filter((name) => name.endsWith('.ovt'))) {
    const theme = readFileSync(join(sourceDir, file), 'utf8');
    if (!/\bdark:\s*'false';/.test(theme)) continue;

    assert.match(
      theme,
      /Official palette reference \(source values; live accessibility overrides below may differ\):/,
      file + ': palette reference must explain accessibility divergence',
    );
  }
});

test('monitor checked states keep success on the contrast-tested surface', () => {
  assert.match(
    base,
    /\.btn-monitor\.checked\s*\{[^}]*background:\s*var\(--bg_hover\);[^}]*color:\s*var\(--success\);[^}]*\}/,
  );
  assert.match(
    base,
    /\.btn-monitor\.checked:focus,\s*\.btn-monitor:checked:focus,\s*\.btn-monitor\.checked:hover\s*\{[^}]*background:\s*var\(--bg_hover\);[^}]*color:\s*var\(--success\);[^}]*\}/,
  );
});

test('current OBS runtime state classes receive visible styling', () => {
  assert.match(base, /#modeSwitch:!hover:!pressed\.state-active/);
  assert.match(base, /#modeSwitch:hover:!pressed\.state-active/);
  assert.match(base, /#modeSwitch:pressed\.state-active,\s*#modeSwitch:pressed:checked/);
  assert.match(base, /QSpinBox::up-button:hover/);
  assert.match(base, /QDoubleSpinBox::down-button:disabled/);
  assert.match(base, /QGroupBox::indicator:checked:disabled/);
  assert.match(base, /QTabBar::tab:bottom:selected/);
});

test('active button rules use the contracted foreground/surface pairs', () => {
  assert.match(
    base,
    /#streamButton:hover:!pressed\.state-active,\s*#broadcastButton:hover:!pressed\.state-active\s*\{[^}]*background:\s*var\(--button_bg_hover\);[^}]*color:\s*var\(--button_hover_text\);[^}]*\}/,
  );
  assert.match(
    base,
    /#recordButton:hover:!pressed\.state-active,\s*#pauseRecordButton:hover:!pressed\.state-active\s*\{[^}]*background:\s*var\(--button_bg_hover\);[^}]*color:\s*var\(--button_hover_text\);[^}]*\}/,
  );
  assert.match(
    base,
    /#modeSwitch:!hover:!pressed\.state-active,\s*#modeSwitch:!hover:!pressed:checked\s*\{[^}]*background:\s*var\(--bg_base\);[^}]*color:\s*var\(--text\);[^}]*\}/,
  );
  assert.match(
    base,
    /#modeSwitch:hover:!pressed\.state-active,\s*#modeSwitch:hover:!pressed:checked\s*\{[^}]*background:\s*var\(--button_bg_hover\);[^}]*color:\s*var\(--button_hover_text\);[^}]*\}/,
  );
  assert.match(
    base,
    /#modeSwitch:pressed\.state-active,\s*#modeSwitch:pressed:checked\s*\{[^}]*background:\s*var\(--bg_base\);[^}]*border:\s*2px inset var\(--primary_dark\);[^}]*color:\s*var\(--text\);[^}]*\}/,
  );
});

test('default mixer category uses the guaranteed text/base contrast pair', () => {
  assert.match(
    base,
    /VolumeControl \.mixer-category\s*\{[^}]*background:\s*var\(--bg_base\);[^}]*color:\s*var\(--text\);[^}]*\}/,
  );
});

test('QTableView checkbox indicators keep a shape signal and hover/focus affordance', () => {
  assert.match(
    base,
    /QTableView::indicator:unchecked\s*\{[^}]*background:\s*var\(--bg_base\);[^}]*border:\s*2px solid var\(--text\);[^}]*\}/,
  );
  assert.match(
    base,
    /QTableView::indicator:checked\s*\{[^}]*image:\s*var\(--checkbox_check_icon\);[^}]*background:\s*var\(--bg_base\);[^}]*border:\s*2px solid var\(--text\);[^}]*\}/,
  );
  assert.match(
    base,
    /QTableView::indicator:unchecked:hover,[^{}]*QTableView::indicator:checked:focus\s*\{[^}]*background:\s*var\(--bg_hover\);[^}]*border:\s*3px solid var\(--primary\);[^}]*\}/,
  );
});

test('OBS parser-only math never leaks into Qt QSS rules', () => {
  const vars = base.match(/@OBSThemeVars\s*\{[\s\S]*?\n\}/);
  assert.ok(vars, 'Colorway vars block missing');
  const qss = base.slice(base.indexOf(vars[0]) + vars[0].length);
  assert.doesNotMatch(
    qss,
    /\b(?:calc|min|max)\s*\(/,
    'calc/min/max are OBS theme-parser features and must stay inside @OBSThemeVars',
  );
});

test('OBS theme declarations follow parser naming and placement rules', () => {
  assert.ok(base.startsWith('@OBSThemeMeta'), '@OBSThemeMeta must be the first theme block');
  const metaEnd = base.indexOf('}', base.indexOf('@OBSThemeMeta'));
  const varsStart = base.indexOf('@OBSThemeVars');
  assert.ok(varsStart > metaEnd, '@OBSThemeVars must follow @OBSThemeMeta before QSS');

  const vars = base.match(/@OBSThemeVars\s*\{([\s\S]*?)\n\}/);
  assert.ok(vars, 'Colorway vars block missing');
  for (const match of vars[1].matchAll(/^\s*(--[^:\s]+)\s*:/gm)) {
    assert.match(match[1], /^--[A-Za-z0-9_]+$/, `invalid OBS theme variable name: ${match[1]}`);
  }
});

test('QSS asset URLs use the OBS theme search path', () => {
  const vars = base.match(/@OBSThemeVars\s*\{[\s\S]*?\n\}/);
  assert.ok(vars, 'Colorway vars block missing');
  const qss = base.slice(base.indexOf(vars[0]) + vars[0].length);
  const urls = [...qss.matchAll(/url\(([^)]+)\)/g)].map((match) => match[1].trim());
  for (const rawUrl of urls) {
    const url = rawUrl.replace(/^(["'])(.*)\1$/, '$2');
    assert.ok(url.startsWith('theme:'), `theme asset must use theme: search path: ${rawUrl}`);
  }
});
