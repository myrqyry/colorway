import { parseOVT } from './theme-loader.js';

export { parseOVT };

const META_RE = /@OBSThemeMeta\s*\{([\s\S]*?)\}/;
const VARS_RE = /@OBSThemeVars\s*\{([\s\S]*?)\}/;
const META_FIELD_RE = /^\s*([a-zA-Z_]+)\s*:\s*['"]([^'"]*)['"]/;
const VAR_LINE_RE = /^\s*(--[\w-]+)\s*:\s*(.+?);/;

function readMetaFields(text) {
  const meta = {};
  const block = text.match(META_RE);
  if (!block) return meta;
  for (const line of block[1].split('\n')) {
    const m = line.match(META_FIELD_RE);
    if (m) meta[m[1]] = m[2];
  }
  return meta;
}

export function toNormalizedTheme(text) {
  const parsed = parseOVT(text);
  const meta = readMetaFields(text);
  return {
    id: meta.id || parsed.meta._name || 'imported',
    name: parsed.meta._name || meta.name || 'Imported',
    author: meta.author,
    dark: parsed.meta._dark,
    extendsId: parsed.meta._extends || meta.extends,
    tokens: parsed.vars,
    sourceFormat: parsed.meta._extends ? 'colorway' : 'external',
  };
}

function formatMeta({ name, author, dark, extendsId, id }) {
  const lines = ['@OBSThemeMeta {'];
  if (name) lines.push(`    name: '${name.replace(/'/g, "\\'")}';`);
  if (id) lines.push(`    id: '${id.replace(/'/g, "\\'")}';`);
  if (extendsId) lines.push(`    extends: '${extendsId.replace(/'/g, "\\'")}';`);
  if (author) lines.push(`    author: '${author.replace(/'/g, "\\'")}';`);
  if (typeof dark === 'boolean') lines.push(`    dark: '${dark ? 'true' : 'false'}';`);
  lines.push('}');
  return lines.join('\n');
}

function formatVars(tokens) {
  const entries = Object.entries(tokens).filter(([k]) => k.startsWith('--'));
  if (!entries.length) return '@OBSThemeVars {\n}';
  const body = entries
    .map(([k, v]) => `    ${k}: ${v};`)
    .join('\n');
  return `@OBSThemeVars {\n${body}\n}`;
}

export function serializeOVT(theme) {
  return [formatMeta(theme), '', formatVars(theme.tokens), ''].join('\n');
}

const YAMI_EXCLUDED = new Set([
  '--accent_bg_start', '--accent_bg_end',
  '--bg_dock', '--bg_hover',
  '--ico', '--ico_selected',
  '--meter_bg_nom', '--meter_bg_war', '--meter_bg_err',
  '--meter_fg_nom', '--meter_fg_war', '--meter_fg_err',
  '--success', '--text_inverse',
]);

export function toYamiOVT(theme) {
  const tokens = { ...theme.tokens };
  for (const k of YAMI_EXCLUDED) delete tokens[k];
  const yami = {
    ...theme,
    name: theme.name,
    author: theme.author,
    dark: theme.dark,
    extendsId: 'com.obsproject.Yami',
    id: theme.id ? theme.id.replace(/^com\.myrqyry\./, 'com.yami.') : undefined,
    tokens,
  };
  return serializeOVT(yami);
}

export function downloadThemeText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return url;
}

export async function importThemeFile(file) {
  const text = await file.text();
  return toNormalizedTheme(text);
}

// ---- Colour conversion (sRGB ↔ OKLCH, no deps) ----

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function hexToLinear(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
}

function hexToOklch(hex) {
  const [lr, lg, lb] = hexToLinear(hex);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  return { L, C: Math.hypot(a, b), h: Math.atan2(b, a) * (180 / Math.PI) };
}

function oklchToHex(L, C, h) {
  const hr = h * (Math.PI / 180);
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const clamp = (v) => Math.round(Math.max(0, Math.min(255, (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255)));
  return `#${[lr, lg, lb].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')}`;
}

function derive(L, C, h, dL, dC) {
  return oklchToHex(Math.max(0, Math.min(1, L + dL)), Math.max(0, C + dC), h);
}

// ---- Role assignment ----

const CORE_ROLES = [
  ['--bg_window', 'bg', 0],
  ['--bg_base', 'bg', 0],
  ['--bg_dock', 'bg', 0.02],
  ['--bg_preview', 'bg', 0.04],
  ['--bg_hover', 'bg', 0.08],
  ['--text', 'text', 0],
  ['--text_light', 'text', 0.04],
  ['--text_muted', 'text', -0.07],
  ['--text_inactive', 'text', -0.15],
  ['--text_disabled', 'text', -0.2],
  ['--text_inverse', 'inv', 0],
  ['--primary', 'accent', 0],
  ['--primary_light', 'accent', 0.05],
  ['--primary_lighter', 'accent', 0.1],
  ['--primary_dark', 'accent', -0.05],
  ['--primary_darker', 'accent', -0.1],
  ['--input_bg', 'mid', 0],
  ['--input_bg_hover', 'mid', 0.04],
  ['--input_border', 'mid', -0.06],
  ['--input_border_hover', 'accent', 0],
  ['--button_bg', 'mid', 0.02],
  ['--button_bg_hover', 'mid', 0.06],
  ['--button_bg_disabled', 'mid', -0.04],
  ['--list_item_bg_hover', 'mid', 0.04],
  ['--border_color', 'mid', -0.04],
  ['--ico', 'text', 0],
  ['--ico_selected', 'inv', 0],
];

const SEMANTIC_ROLES = [
  ['--warning', 'warm', 0],
  ['--danger', 'cool', 0],
  ['--success', 'ok', 0],
];

export function assignRoles(hexes, paletteName) {
  const normalizedHexes = hexes.map((h) => h.startsWith('#') ? h : `#${h}`);
  const parsed = normalizedHexes.filter((h) => /^#[0-9a-f]{6}$/i.test(h)).map((hex) => ({ hex, ...hexToOklch(hex) }));
  if (parsed.length < 2) return null;

  const byLightness = [...parsed].sort((a, b) => a.L - b.L);
  const darkest = byLightness[0];
  const secondDarkest = byLightness[1];
  const lightest = byLightness[byLightness.length - 1];
  const secondLightest = byLightness[byLightness.length - 1];
  const byChroma = [...parsed].sort((a, b) => b.C - a.C);
  const mostChroma = byChroma[0];

  const isDark = darkest.L < 0.55;
  const bg = isDark ? darkest : lightest;
  const fg = isDark ? lightest : darkest;
  const accent = mostChroma.hex === bg.hex || mostChroma.hex === fg.hex ? byChroma[1] : mostChroma;

  const pick = (role, offset) => {
    const { L, C, h } = accent;
    if (role === 'bg') return isDark ? derive(bg.L, bg.C, bg.h, offset, 0) : derive(bg.L, bg.C, bg.h, -offset, 0);
    if (role === 'text') return isDark ? derive(fg.L, fg.C, fg.h, offset, 0) : derive(fg.L, fg.C, fg.h, -offset, 0);
    if (role === 'accent') return derive(accent.L, accent.C, accent.h, offset, 0);
    if (role === 'mid') {
      const mL = (bg.L + fg.L) / 2;
      return derive(mL, Math.min(bg.C, fg.C), bg.h, offset, 0);
    }
    if (role === 'inv') {
      const invL = isDark ? Math.min(1, bg.L + 0.85) : Math.max(0, bg.L - 0.75);
      return oklchToHex(invL, 0.02, 0);
    }
    if (role === 'warm') return derive(accent.L, accent.C, 60, offset, 0);
    if (role === 'cool') return derive(accent.L, accent.C, 0, offset, 0);
    if (role === 'ok') return derive(accent.L, accent.C, 140, offset, 0);
    return bg.hex;
  };

  const tokens = {};
  for (const [key, role, offset] of CORE_ROLES) {
    tokens[key] = pick(role, offset);
  }
  for (const [key, role, offset] of SEMANTIC_ROLES) {
    tokens[key] = pick(role, offset);
  }

  const slug = paletteName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lospec';

  return {
    id: `com.myrqyry.Colorway.${slug}`,
    name: paletteName,
    author: 'Lospec',
    dark: isDark,
    extendsId: 'com.myrqyry.Colorway',
    tokens,
    sourceFormat: 'external',
  };
}

export function lospecSlugFromUrl(url) {
  const m = url.match(/lospec\.com\/palette-list\/([^/?#]+)/);
  return m ? m[1] : url.trim() || null;
}

export async function fromLospecPalette(slug) {
  const res = await fetch(`https://lospec.com/palette-list/${slug}.json`);
  if (!res.ok) throw new Error(`Lospec API returned HTTP ${res.status} for "${slug}"`);
  const data = await res.json();
  if (!data.colors || !data.colors.length) throw new Error(`Palette "${slug}" has no colors`);
  if (!data.name) data.name = slug;
  const theme = assignRoles(data.colors, data.name);
  if (!theme) throw new Error(`Palette "${slug}" has fewer than 2 colors`);
  return theme;
}


