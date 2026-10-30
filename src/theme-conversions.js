import { zipSync, strToU8 } from 'fflate';

// The native Orchis and Bibata converters consume these same semantic roles.
const NATIVE_ROLES = [
  'primary', 'text', 'text_muted', 'border_color', 'bg_window',
  'bg_base', 'bg_preview', 'bg_hover', 'bg_dock',
  'warning', 'danger', 'success',
];
const OPTIONAL_ROLES = ['primary_light', 'primary_dark'];

export function exportSlug(value) {
  const slug = String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  if (!slug || slug.length > 80) throw new Error('Invalid theme name for export');
  return slug;
}

function rgb(hex) {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}
function hex(channels) {
  return '#' + channels.map((value) => Math.min(255, Math.max(0, Math.round(value)))
    .toString(16).padStart(2, '0')).join('');
}
function mix(first, second, amount) {
  const a = rgb(first), b = rgb(second);
  return hex(a.map((n, i) => n * (1 - amount) + b[i] * amount));
}
function relativeLuminance(value) {
  const linear = (v) => {
    const c = v / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(value).map(linear);
  return .2126 * r + .7152 * g + .0722 * b;
}
function contrast(a, b) {
  const l1 = relativeLuminance(a), l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
}
function readableOn(value, background) {
  if (contrast(value, background) >= 4.5) return value;
  const target = relativeLuminance(background) > .18 ? '#000000' : '#ffffff';
  for (let step = 1; step <= 100; step++) {
    const adjusted = mix(value, target, step / 100);
    if (contrast(adjusted, background) >= 4.5) return adjusted;
  }
  return target;
}

export function resolveExportPalette(tokens) {
  if (!tokens || typeof tokens !== 'object') throw new Error('Missing active palette');
  const name = tokens._name || tokens.name;
  if (!name) throw new Error('Missing theme name');
  exportSlug(name);
  const resolve = (key, seen = new Set()) => {
    if (seen.has(key)) throw new Error('Circular theme variable: ' + key);
    const value = tokens['--' + key];
    if (typeof value !== 'string' || !value.trim()) throw new Error('Missing theme variable: --' + key);
    const next = new Set(seen);
    next.add(key);
    const resolved = value.trim().replace(/var\(\s*--([\w-]+)\s*\)/g, (_match, ref) => resolve(ref, next));
    if (!/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(resolved)) {
      throw new Error('Unsupported palette color for --' + key + ': ' + resolved);
    }
    return resolved.toLowerCase();
  };
  const window = resolve('bg_window');
  if (window.length !== 7) throw new Error('Window color must be opaque');
  const palette = {};
  for (const key of NATIVE_ROLES) {
    const value = resolve(key);
    if (value.length === 7) {
      palette[key] = value;
      continue;
    }
    const alpha = parseInt(value.slice(7, 9), 16) / 255;
    palette[key] = mix(window, value.slice(0, 7), alpha);
  }
  for (const key of OPTIONAL_ROLES) {
    if (tokens['--' + key] != null) {
      const value = resolve(key);
      const alpha = value.length === 9 ? parseInt(value.slice(7, 9), 16) / 255 : 1;
      palette[key] = mix(window, value.slice(0, 7), alpha);
    }
  }
  return { format: 'colorway-palette/v1', name, dark: tokens._dark !== false && tokens.dark !== false, palette };
}

export function toOpenCodeTui(snapshot) {
  const p = snapshot.palette;
  const defs = {
    bg: p.bg_window, panel: p.bg_preview, element: p.bg_hover,
    fg: p.text, muted: p.text_muted, border: p.border_color,
    primary: p.primary, secondary: p.primary_light || p.primary,
    success: p.success, warning: p.warning, error: p.danger,
    info: p.primary_light || p.primary,
    diffAddBg: mix(p.bg_window, p.success, .17),
    diffRemoveBg: mix(p.bg_window, p.danger, .17),
  };
  const theme = {
    text: 'fg', textMuted: 'muted', background: 'bg',
    backgroundPanel: 'panel', backgroundElement: 'element',
    primary: 'primary', secondary: 'secondary', accent: 'primary',
    success: 'success', warning: 'warning', error: 'error', info: 'info',
    border: 'border', borderActive: 'primary', borderSubtle: 'panel',
    diffAdded: 'success', diffRemoved: 'error', diffContext: 'muted',
    diffHunkHeader: 'secondary',
    diffHighlightAdded: 'success', diffHighlightRemoved: 'error',
    diffAddedBg: 'diffAddBg', diffRemovedBg: 'diffRemoveBg',
    diffContextBg: 'panel', diffLineNumber: 'muted',
    diffAddedLineNumberBg: 'diffAddBg', diffRemovedLineNumberBg: 'diffRemoveBg',
    markdownText: 'fg', markdownHeading: 'primary',
    markdownLink: 'primary', markdownLinkText: 'secondary',
    markdownCode: 'success', markdownBlockQuote: 'muted',
    markdownEmph: 'secondary', markdownStrong: 'fg',
    markdownHorizontalRule: 'border', markdownListItem: 'primary',
    markdownListEnumeration: 'secondary', markdownImage: 'primary',
    markdownImageText: 'secondary', markdownCodeBlock: 'fg',
    syntaxComment: 'muted', syntaxKeyword: 'primary', syntaxFunction: 'secondary',
    syntaxString: 'success', syntaxNumber: 'warning', syntaxVariable: 'fg',
    syntaxProperty: 'secondary', syntaxType: 'secondary',
    syntaxConstant: 'warning', syntaxOperator: 'fg',
    syntaxPunctuation: 'muted', syntaxObject: 'fg',
  };
  return { $schema: 'https://opencode.ai/theme.json', defs, theme };
}

export function toOpenCodeDesktop(snapshot) {
  const p = snapshot.palette;
  const native = {
    neutral: p.bg_window, ink: p.text, primary: p.primary,
    success: p.success, warning: p.warning, error: p.danger,
    info: p.primary_light || p.primary, accent: p.primary_light || p.primary,
  };
  // OpenCode desktop requires both appearances. We preserve the original
  // colorway exactly for its native mode and derive a readable counterpart.
  const oppositeBg = snapshot.dark
    ? mix(p.bg_window, '#ffffff', .93)
    : mix(p.bg_window, '#000000', .84);
  const oppositeInk = readableOn(p.text, oppositeBg);
  const other = { ...native, neutral: oppositeBg, ink: oppositeInk };
  for (const key of ['primary', 'success', 'warning', 'error', 'info', 'accent']) {
    other[key] = readableOn(native[key], oppositeBg);
  }
  return {
    $schema: 'https://opencode.ai/desktop-theme.json',
    name: 'Colorway — ' + snapshot.name,
    id: 'colorway-' + exportSlug(snapshot.name),
    light: { palette: snapshot.dark ? other : native },
    dark: { palette: snapshot.dark ? native : other },
  };
}

export function createNativeBuildKit(kind, snapshot, sourceOVT) {
  if (!['orchis', 'bibata'].includes(kind)) throw new Error('Unsupported native export target');
  if (!snapshot.dark && kind === 'orchis') throw new Error('Orchis converter currently requires a dark Colorway palette');
  const executable = 'colorway-to-' + kind;
  const location = kind === 'orchis' ? '~/.themes' : '~/.icons';
  const readme = [
    'Colorway → ' + (kind === 'orchis' ? 'Orchis Dark Compact' : 'Bibata XCursor'),
    '',
    'LOCAL BUILD REQUIRED — this ZIP is not an installable theme.',
    'It contains the resolved palette, original OBS source and a build script,',
    'NOT the compiled GTK or XCursor files. Browser exports cannot invoke your',
    'Linux Sass, Inkscape, or XCursor compiler directly.',
    '',
    'If you already have ~/loam/orchis-colorways, no repository setup is needed.',
    'On another Linux machine, obtain that converter checkout and dependencies.',
    'Required converter: ' + executable + ' and its build dependencies.',
    'Orchis requires the upstream Orchis theme source, sassc, Inkscape and Pillow.',
    'Bibata requires the official Bibata_Cursor source, Inkscape, uvx and clickgen.',
    '',
    'Run from this extracted folder:',
    '    bash build.sh',
    '',
    'The converter checks for existing destinations and NEVER overwrites them.',
    'The output installs to ' + location + ', but is not automatically selected.',
    'Select the result in Linux Mint Themes after a successful native build.',
    '',
    'Palette: ' + snapshot.name,
    'Generated from the active Colorway theme, not the original upstream art.',
    '',
  ].join('\n');
  // No theme name or palette content is executed as shell code; only the
  // fixed converter name is interpolated here.
  const buildScript = [
    '#!/usr/bin/env bash', 'set -euo pipefail',
    'cd "$(dirname "$0")"',
    'converters="${COLORWAY_CONVERTERS:-$HOME/loam/orchis-colorways}"',
    'if [[ ! -x "$converters/' + executable + '" ]]; then',
    '  echo "Missing local Colorway converter: $converters/' + executable + '" >&2',
    '  exit 1',
    'fi',
    'exec "$converters/' + executable + '" --palette-json "$PWD/palette.json"',
    '',
  ].join('\n');
  return zipSync({
    'palette.json': strToU8(JSON.stringify(snapshot, null, 2) + '\n'),
    'source.ovt': strToU8(sourceOVT),
    'README.md': strToU8(readme),
    'build.sh': strToU8(buildScript),
  }, { level: 6 });
}
