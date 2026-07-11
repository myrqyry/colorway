import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const REQUIRED_VARS = [
  '--bg_window',
  '--bg_base',
  '--bg_preview',
  '--bg_dock',
  '--bg_hover',
  '--text',
  '--text_light',
  '--text_muted',
  '--text_disabled',
  '--text_inactive',
  '--text_inverse',
  '--primary',
  '--primary_light',
  '--primary_lighter',
  '--primary_dark',
  '--primary_darker',
  '--input_bg',
  '--input_bg_hover',
  '--input_bg_focus',
  '--input_border',
  '--input_border_hover',
  '--button_bg',
  '--button_bg_hover',
  '--button_bg_disabled',
  '--list_item_bg_hover',
  '--list_item_bg_selected',
  '--border_color',
  '--accent_bg_start',
  '--accent_bg_end',
  '--warning',
  '--danger',
  '--success',
  '--meter_bg_nom',
  '--meter_bg_war',
  '--meter_bg_err',
  '--meter_fg_nom',
  '--meter_fg_war',
  '--meter_fg_err',
];

const THEMES = [
  'Colorway-Hydrangea11.ovt',
  'Colorway-Soapy10.ovt',
  'Colorway-SailorMoonBackground.ovt',
];

function readTheme(file) {
  return readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
}

function parseVars(text) {
  const match = text.match(/@OBSThemeVars\s*\{([\s\S]*?)\}/);
  assert.ok(match, 'theme vars block missing');

  const vars = new Map();
  for (const line of match[1].split('\n')) {
    const parsed = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?);\s*$/);
    if (parsed) vars.set(parsed[1], parsed[2].trim());
  }
  return vars;
}

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

for (const file of THEMES) {
  const theme = readTheme(file);
  const vars = parseVars(theme);

  test(`${file} overrides required palette vars`, () => {
    for (const key of REQUIRED_VARS) {
      assert.ok(vars.has(key), `${file} missing ${key}`);
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
