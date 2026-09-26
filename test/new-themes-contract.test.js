import { readdirSync, readFileSync } from 'node:fs';
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

const THEMES_DIR = new URL('../themes/', import.meta.url);
const ICONS_DIR = new URL('../icons/colorway/', import.meta.url);
const BASE_THEME_FILE = 'Colorway.obt';

const THEME_FILES = readdirSync(THEMES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /^Colorway-.*\.ovt$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

function readTheme(file) {
  return readFileSync(new URL(`../themes/${file}`, import.meta.url), 'utf8');
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

function parseMeta(text) {
  const meta = {};
  const nameMatch = text.match(/name:\s*'([^']+)'/);
  const darkMatch = text.match(/dark:\s*'([^']+)'/);
  const extendsMatch = text.match(/extends:\s*'([^']+)'/);

  if (nameMatch) meta.name = nameMatch[1];
  if (darkMatch) meta.dark = darkMatch[1] === 'true';
  if (extendsMatch) meta.extends = extendsMatch[1];
  return meta;
}

const fileByThemeId = new Map([[ 'com.myrqyry.Colorway', BASE_THEME_FILE ]]);
const parsedThemes = new Map();

for (const file of [BASE_THEME_FILE, ...THEME_FILES]) {
  const text = readTheme(file);
  const meta = parseMeta(text);
  parsedThemes.set(file, { meta, vars: parseVars(text) });
  if (meta.extends && file !== BASE_THEME_FILE) {
    const idMatch = text.match(/id:\s*'([^']+)'/);
    if (idMatch) fileByThemeId.set(idMatch[1], file);
  }
}

function resolveTheme(file, seen = new Set()) {
  if (seen.has(file)) {
    throw new Error(`cyclic theme inheritance detected for ${file}`);
  }
  seen.add(file);

  if (file === BASE_THEME_FILE) {
    return new Map(parsedThemes.get(file).vars);
  }

  const parsed = parsedThemes.get(file);
  assert.ok(parsed, `theme file missing from parsed map: ${file}`);

  const resolved = new Map();
  if (parsed.meta.extends) {
    const parentFile = fileByThemeId.get(parsed.meta.extends);
    assert.ok(parentFile, `${file} extends unknown theme id ${parsed.meta.extends}`);
    for (const [key, value] of resolveTheme(parentFile, seen)) {
      resolved.set(key, value);
    }
  }

  for (const [key, value] of parsed.vars) {
    resolved.set(key, value);
  }

  return resolved;
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

function resolveToken(vars, key, seen = new Set()) {
  assert.ok(vars.has(key), `missing ${key}`);
  if (seen.has(key)) throw new Error(`cyclic variable alias: ${key}`);
  seen.add(key);

  const value = vars.get(key);
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  return alias ? resolveToken(vars, alias[1], seen) : value;
}

function themeIconColor(value) {
  const match = value.match(/^url\(theme:icons\/colorway\/(.+)\)$/);
  assert.ok(match, `unsupported theme icon value: ${value}`);

  const svg = readFileSync(new URL(match[1], ICONS_DIR), 'utf8');
  const color = svg.match(/(?:stroke|fill)="(#[0-9a-fA-F]{6})"/)?.[1];
  assert.ok(color, `theme icon has no hex stroke/fill color: ${match[1]}`);
  return color;
}

for (const file of THEME_FILES) {
  const vars = resolveTheme(file);

  test(`${file} overrides required palette vars`, () => {
    for (const key of REQUIRED_VARS) {
      assert.ok(vars.has(key), `${file} missing ${key}`);
    }
  });

  test(`${file} keeps contracted text/surface pairs readable`, () => {
    const text = resolveToken(vars, '--text');
    const baseSurface = resolveToken(vars, '--bg_base');
    const hoverText = resolveToken(vars, '--button_hover_text');
    const hoverSurface = resolveToken(vars, '--button_bg_hover');

    assert.ok(
      contrastRatio(text, baseSurface) >= 4.5,
      `${file} text/base contrast too low`,
    );
    assert.ok(
      contrastRatio(hoverText, hoverSurface) >= 4.5,
      `${file} button-hover text contrast too low`,
    );
  });

  test(`${file} keeps the checkbox check glyph visible on its surface`, () => {
    const background = resolveToken(vars, '--bg_base');
    const iconValue = resolveToken(vars, '--checkbox_check_icon');
    const glyph = themeIconColor(iconValue);

    assert.ok(
      contrastRatio(glyph, background) >= 3,
      `${file} checkbox glyph contrast too low`,
    );
  });
}
