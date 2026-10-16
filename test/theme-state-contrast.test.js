import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseOVT } from '../src/theme-loader.js';
import { injectStateOverrides, renderStateOverrides, normalizeBaseIcons, injectButtonIconRules } from '../scripts/theme-state-tokens.mjs';

const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const base = read('themes/Colorway.obt');
const varsOf = (source) => parseOVT(source.replace(/\/\*[^]*?\*\//g, '')).vars;
const baseVars = varsOf(base);
const resolve = (vars, name, seen = []) => {
  assert.ok(!seen.includes(name), `cycle at ${name}`);
  assert.ok(vars[name], `missing ${name}`);
  const match = vars[name].match(/^var\((--\w+)\)$/);
  return match ? resolve(vars, match[1], [...seen, name]) : vars[name];
};
// Independent oracle: do not import the generator's contrast implementation.
const luminance = (hex) => {
  assert.match(hex, /^#[\da-f]{6}$/i);
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return rgb.reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
};
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05)
  / (Math.min(luminance(a), luminance(b)) + 0.05);

test('state foregrounds and baked glyphs remain legible across the whole composed corpus', () => {
  for (const file of readdirSync(new URL('themes/', root)).filter((name) => /\.(obt|ovt)$/.test(name))) {
    const vars = { ...baseVars, ...varsOf(read('themes/' + file)) };
    for (const [role, bg] of [['base', '--bg_base'], ['primary', '--primary'],
      ['primary_hover', '--primary_light'], ['primary_dark', '--primary_dark']]) {
      assert.ok(ratio(resolve(vars, `--on_${role}`), resolve(vars, bg)) >= 4.5, `${file}: ${role} ink`);
      if (role === 'primary_dark') continue;
      for (const key of Object.keys(vars).filter((key) => key.startsWith('--cw_icon_') && key.endsWith('_' + role))) {
        // primary_hover must not be mistaken for primary, and vice versa.
        const url = resolve(vars, key).match(/^url\(theme:([^)]*)\)$/);
        assert.ok(url, `${file}: ${key} URL`);
        const svg = read(url[1]);
        const colors = [...new Set([...svg.matchAll(/(?:fill|stroke)="(#[\da-f]{6})"/gi)].map((m) => m[1]))];
        assert.ok(colors.length, `${key}: no authored glyph color`);
        assert.ok(ratio(colors[0], resolve(vars, bg)) >= 3, `${file}: ${key} silhouette`);
        // The filled checkbox intentionally paints its inverse tick inside a solid rect.
        if (colors.length > 1) assert.ok(ratio(colors[0], colors[1]) >= 3, `${file}: ${key} interior tick`);
      }
    }
    for (const match of read('themes/' + file).matchAll(/var\((--\w+)\)/g)) {
      if (['--obsFontScale', '--obsPadding'].includes(match[1])) continue;
      assert.ok(vars[match[1]], `${file}: undefined ${match[1]}`);
    }
  }
});

test('base icon normalization is idempotent and preserves a real selector in a mixed legacy list', () => {
  const mixed = 'QComboBox::down-arrow, QListView::item:selected:hover QComboBox::down-arrow { image: url(theme:icons/colorway/mingcute/normal/chevron-down.svg); }';
  const result = normalizeBaseIcons(mixed);
  assert.match(result, /^QComboBox::down-arrow\s*\{/);
  assert.doesNotMatch(result, /::item:selected:hover/);
  assert.equal(normalizeBaseIcons(result), result);
  assert.match(result, /var\(--cw_icon_chevron_down_base\)/);
});

test('generated state and render-time icon blocks are fixed points', () => {
  const block = renderStateOverrides(new Map(Object.entries(baseVars)));
  const normalized = injectButtonIconRules(injectStateOverrides(normalizeBaseIcons(base), block));
  assert.equal(normalized, base);
  assert.equal(injectButtonIconRules(normalized), normalized);
  for (const file of readdirSync(new URL('themes/', root)).filter((name) => name.endsWith('.ovt'))) {
    const source = read('themes/' + file);
    const vars = new Map(Object.entries({ ...baseVars, ...varsOf(source) }));
    assert.equal(injectStateOverrides(source, renderStateOverrides(vars, new Map(Object.entries(baseVars)))), source, file);
  }
});

test('supported icon-state rules do not rely on item-subcontrol ancestry or pseudo-state qproperty assignments', () => {
  const qss = base.replace(/@OBSThemeVars\s*\{[^]*?\n\}/, '').replace(/\/\*[^]*?\*\//g, '');
  for (const [, selectors, body] of qss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/qproperty-icon:/.test(body)) assert.doesNotMatch(selectors, /:(?:hover|pressed|selected|checked)\b/);
    assert.doesNotMatch(selectors, /::item[^,{}]*\s+(?:\.icon-|\*\[themeID|QComboBox|QSpinBox|QDoubleSpinBox)/);
  }
  assert.doesNotMatch(qss, /@font-face|system-ui|-apple-system|BlinkMacSystemFont|QPushButton::flat|QTabBar::(?:top|bottom)\b/);
  assert.match(qss, /QPushButton\.icon-plus:checked[^{}]*\{[^}]*icon: var\(--cw_icon_plus_primary\)/);
  assert.doesNotMatch(qss, /rgba\(196,\s*167,\s*231/);
});
