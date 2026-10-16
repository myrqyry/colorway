import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { THEMES, PATTERNS } from '../src/theme-catalog.js';
import { parseOVT } from '../src/theme-loader.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (name) => readFileSync(join(root, name), 'utf8');
const base = parseOVT(read('themes/Colorway.obt'));
const required = ['--bg_window', '--bg_base', '--bg_dock', '--bg_hover', '--primary', '--primary_light',
  '--border_color', '--text', '--text_muted', '--text_inverse', '--button_bg', '--meter_fg_nom',
  '--on_primary', '--on_base'];
const themeId = (source) => source.match(/^\s*id:\s*['"]([^'"]+)['"]/m)?.[1];
function resolveColor(vars, name, trail = []) {
  if (trail.includes(name)) throw new Error('Theme token cycle: ' + trail.join(' -> ') + ' -> ' + name);
  const value = vars[name];
  if (typeof value !== 'string') throw new Error('Missing color token ' + name);
  if (/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(value)) return value;
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  if (alias) return resolveColor(vars, alias[1], [...trail, name]);
  throw new Error('Non-solid preview color: ' + name + ' = ' + value);
}
const sourceThemes = THEMES.map(({ file, name }) => {
  const source = read('themes/' + file);
  const variant = parseOVT(source);
  const id = themeId(source);
  if (!id) throw new Error('Theme missing ID: ' + file);
  return { file, name, id, variant };
});
const byId = new Map(sourceThemes.map((item) => [item.id, item]));
if (byId.size !== sourceThemes.length) throw new Error('Duplicate OBS theme IDs');
const ancestry = new Map();
function resolvedTokens(theme, seen = new Set()) {
  if (ancestry.has(theme.id)) return ancestry.get(theme.id);
  if (seen.has(theme.id)) throw new Error('Theme parent cycle: ' + theme.id);
  seen.add(theme.id);
  const parent = theme.variant.meta._extends;
  const parentVars = parent === 'com.myrqyry.Colorway' ? base.vars :
    byId.has(parent) ? resolvedTokens(byId.get(parent), seen) :
    (() => { throw new Error('Unknown parent for ' + theme.file + ': ' + parent); })();
  const merged = { ...parentVars, ...theme.variant.vars };
  ancestry.set(theme.id, merged);
  seen.delete(theme.id);
  return merged;
}
const themes = sourceThemes.map(({ file, name, id, variant }) => {
  const vars = resolvedTokens(byId.get(id));
  const colors = Object.fromEntries(required.map((key) => [key.slice(2), resolveColor(vars, key)]));
  return { file, id, name, dark: variant.meta._dark, colors };
});
const patterns = PATTERNS.map(({ file, name }) => ({
  file, name, image: 'data:image/svg+xml,' + encodeURIComponent(read('patterns/' + file)),
}));
const template = read('obs-companion/preview.template.html');
const key = '<!-- INSERT_COLORWAY_JSON -->';
if (!template.includes(key)) throw new Error('Companion template lacks injection marker');
const data = JSON.stringify({ themes, patterns }).replaceAll('<', '\\u003c');
const result = template.replace(key, '<script id="colorway-data" type="application/json">' + data + '</script>');
writeFileSync(join(root, 'obs-companion/colorway-preview.html'), result);
const publicDir = join(root, 'public/companion');
mkdirSync(publicDir, { recursive: true });
for (const name of ['colorway-preview.html', 'colorway-patterns.lua', 'README.md']) {
  copyFileSync(join(root, 'obs-companion', name),
    join(publicDir, name));
}
console.log('Generated offline OBS dock preview:', themes.length, 'real themes,', patterns.length, 'SVG patterns');
