import { buildThemeGraph, CANONICAL_COLOR_VARS, getRepoRoot, resolveTheme } from '../scripts/theme-contract.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const graph = buildThemeGraph(getRepoRoot(import.meta.url));

function hexToRgb(hex) {
  const value = hex.trim().replace('#', '');
  const expanded = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const int = Number.parseInt(expanded, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const file of graph.themeFiles) {
  const parsed = graph.parsedByFile.get(file);
  assert.ok(parsed, `theme file missing from parsed map: ${file}`);
  const rawVars = parsed.vars;
  const vars = resolveTheme(file, graph);

  test(`${file} overrides required palette vars`, () => {
    for (const key of CANONICAL_COLOR_VARS) {
      assert.ok(rawVars.has(key), `${file} missing ${key}`);
    }

    assert.equal(rawVars.size, CANONICAL_COLOR_VARS.length, `${file} has extra theme variables`);

    for (const [key, value] of rawVars) {
      assert.ok(CANONICAL_COLOR_VARS.includes(key), `${file} has non-color override ${key}`);
      assert.ok(!value.includes('var('), `${file} has inherited value for ${key}`);
      assert.ok(!value.startsWith('url('), `${file} has non-color value for ${key}`);
    }
  });

  test(`${file} keeps text readable on the base surface`, () => {
    assert.ok(vars.has('--text'), `${file} missing --text`);
    assert.ok(vars.has('--bg_base'), `${file} missing --bg_base`);
    assert.ok(contrastRatio(vars.get('--text'), vars.get('--bg_base')) >= 4.5, `${file} text/base contrast too low`);
  });

  test(`${file} keeps inverse text readable on hover buttons`, () => {
    assert.ok(vars.has('--text_inverse'), `${file} missing --text_inverse`);
    assert.ok(vars.has('--button_bg_hover'), `${file} missing --button_bg_hover`);
    assert.ok(contrastRatio(vars.get('--text_inverse'), vars.get('--button_bg_hover')) >= 4.5, `${file} inverse/button contrast too low`);
  });
}
