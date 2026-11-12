import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { parseOVT } from '../src/theme-loader.js';
import { extractQssSelectors } from '../scripts/check-obs-upstream.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const baseText = read('themes/Colorway.obt');
const baseVars = parseOVT(baseText).vars;
const STATUS = ['primary', 'secondary', 'info', 'warning', 'danger', 'success'];

function cssRules(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = withoutComments.match(/@OBSThemeVars\s*\{[\s\S]*?\n\}/);
  return withoutComments.slice(vars.index + vars[0].length);
}

function ruleBody(css, selector) {
  const rules = cssRules(css);
  return [...rules.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .find((match) => match[1].split(',').some((name) => name.trim() === selector))?.[2];
}

function resolve(vars, name, seen = new Set()) {
  assert.ok(!seen.has(name), 'cyclic token ' + name);
  seen.add(name);
  const value = vars[name];
  assert.ok(value, 'missing ' + name);
  const alias = value.match(/^var\((--[\w]+)\)$/);
  return alias ? resolve(vars, alias[1], seen) : value;
}

function luminance(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test('OBS 33 status chips use Colorway semantic background and foreground pairs', () => {
  const selectors = extractQssSelectors(baseText);
  assert.ok(selectors.has('InfoChip'), 'OBS 33 InfoChip geometry missing');
  assert.match(ruleBody(baseText, 'InfoChip') || '', /border-radius:\s*var\(--shape_/);
  for (const role of STATUS) {
    const background = '.bg-' + role;
    const pair = background + '.text-' + role;
    assert.ok(selectors.has(background), background + ' selector missing');
    assert.ok(selectors.has(pair), pair + ' selector missing');
    assert.match(ruleBody(baseText, background) || '',
      new RegExp('background-color:\\s*var\\(--chip_bg_' + role + '\\)'));
    assert.match(ruleBody(baseText, pair) || '',
      new RegExp('color:\\s*var\\(--chip_fg_' + role + '\\)'));
  }
  // Avoid a silent regression to Yami hardcoded color ramps or a Yami base.
  assert.doesNotMatch(cssRules(baseText), /var\(--(?:red|green|yellow|teal|grey)\d+\)/);
});

test('OBS 33 property row title and description selectors retain legacy hooks', () => {
  const selectors = extractQssSelectors(baseText);
  for (const selector of [
    'idian--RowList .title', 'idian--RowList .description',
    'idian--ListHeader .title', 'idian--ListHeader .description',
    'idian--RowInfo QLabel.description',
  ]) assert.ok(selectors.has(selector), 'missing ' + selector);
  assert.match(ruleBody(baseText, 'idian--RowList .description') || '',
    /color:\s*var\(--on_preview_muted\)/);
});

test('all 166 Colorway variants produce accessible OBS 33 status chips', () => {
  const variants = readdirSync(new URL('themes/', root)).filter((name) => name.endsWith('.ovt'));
  assert.equal(variants.length, 166);
  for (const file of ['Colorway.obt', ...variants]) {
    const map = { ...baseVars, ...parseOVT(read('themes/' + file)).vars };
    for (const role of STATUS) {
      const background = resolve(map, '--chip_bg_' + role);
      const ink = resolve(map, '--chip_fg_' + role);
      const ratio = contrast(background, ink);
      assert.ok(ratio >= 4.5 - 0.0001, file + ' ' + role + ' chip ' + ratio.toFixed(2) + ':1');
    }
  }
});
