import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const meta = JSON.parse(readFileSync(path.join(root, 'icons/mingcute-map.json'), 'utf8'));
export const MINGCUTE_ICON_FILES = Object.keys(meta.icons)
  .filter((name) => !name.startsWith('status/')).map((name) => name + '.svg');

const base = path.join(root, 'icons/colorway/mingcute');
const vendor = path.join(root, 'icons/vendor/mingcute');
export const ICON_ASSET_PARTS = ['normal', 'selected', 'status', 'nav', 'zoom', 'mixer', 'spin'];

// A documented Colorway off-state derivative of the pinned headphone path.
// Qt SVG Tiny support does not require filters/masks for this cancellation mark.
export const HEADPHONE_OFF_MARK = '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3 3l18 18"/>';

export function referencedMixerIcons() {
  const names = new Set();
  for (const file of readdirSync(path.join(root, 'themes')).filter((name) => /\.(obt|ovt)$/.test(name))) {
    const source = readFileSync(path.join(root, 'themes', file), 'utf8');
    for (const [, name] of source.matchAll(/theme:icons\/colorway\/mingcute\/mixer\/((?:volume-mute|headphone|warning)-[a-f0-9]{6}\.svg)/g)) names.add(name);
  }
  return [...names].sort();
}

// OBS Settings keeps one QIcon per category for both ordinary and selected
// QListWidget rows. A restrained dual-ink keyline makes that same glyph
// readable on both the neutral navigation pane and the accent selection.
export const SETTINGS_NAV_ICONS = [
  'settings', 'brush', 'output', 'media-play', 'audio', 'display',
  'gamepad', 'eye', 'cogs',
];

export function buildMingcuteIcons() {
  for (const part of ICON_ASSET_PARTS) {
    const directory = path.join(base, part);
    mkdirSync(directory, { recursive: true });
    for (const name of readdirSync(directory)) {
      if (name.endsWith('.svg')) rmSync(path.join(directory, name));
    }
  }

  for (const [name, spec] of Object.entries(meta.icons)) {
    const upstream = readFileSync(path.join(vendor, spec + '.svg'), 'utf8');
    if (!upstream.startsWith('<svg ') || !upstream.includes('viewBox="0 0 24 24"')
      || !upstream.includes('currentColor') || /<script|<image|onload=|href=/i.test(upstream)) {
      throw new Error('Unexpected pinned MingCute source: ' + spec);
    }
    const source = name === 'headphone-off' ? upstream.replace('</svg>', HEADPHONE_OFF_MARK + '</svg>') : upstream;
    const output = (ink) => source.replaceAll('currentColor', ink)
      .replace('<svg ', '<svg width="16" height="16" ');
    for (const polarity of name.startsWith('status/') ? [''] : ['normal/', 'selected/']) {
      const ink = polarity === 'selected/' ? meta.selectedInk : meta.normalInk;
      const file = path.join(base, polarity + name + '.svg');
      writeFileSync(file, output(ink));
    }
  }
  // The actual MingCute up-small-fill and down-small-fill icons.
  // Pin upstream SVGs in icons/vendor/mingcute; change only color and viewport
  // to make their intended compact geometry legible in Qt's 9px spin slot.
  for (const direction of ['up', 'down']) {
    const upstream = readFileSync(path.join(vendor, direction + '-small-fill.svg'), 'utf8');
    if (!upstream.includes('fill-rule="evenodd"') || !upstream.includes('fill="currentColor"')) {
      throw new Error('Unexpected MingCute small-fill icon: ' + direction);
    }
    for (const [polarity, ink] of [['normal', meta.normalInk], ['selected', meta.selectedInk]]) {
      const resized = upstream.replaceAll('currentColor', ink)
        .replace('width="1em" height="1em"', 'width="9" height="9"')
        .replace('viewBox="0 0 24 24"', 'viewBox="8 8 8 8"');
      writeFileSync(path.join(base, 'spin', direction + '-small-fill-' + polarity + '.svg'), resized);
    }
  }
  // Pixel-aligned derivatives for OBSBasic.ui's explicit 8px zoom canvas.
  // The ordinary 24-unit paths become faint fractional-pixel strokes there.
  for (const [name, d] of [['plus', 'M1 3.5h6M3.5 1v6'], ['minus', 'M1 3.5h6']]) {
    for (const [polarity, ink] of [['normal', meta.normalInk], ['selected', meta.selectedInk]]) {
      writeFileSync(path.join(base, 'zoom', `${name}-${polarity}.svg`),
        `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path fill="none" stroke="${ink}" stroke-width="1" d="${d}"/></svg>`);
    }
  }
  // Ink-addressed assets are shared between themes with the same semantic ink.
  // The compiled theme token URLs are the complete inventory; no user state is read.
  for (const name of referencedMixerIcons()) {
    const [, glyph, hex] = name.match(/^(volume-mute|headphone|warning)-([a-f0-9]{6})\.svg$/);
    const source = readFileSync(path.join(vendor, meta.icons[glyph] + '.svg'), 'utf8');
    writeFileSync(path.join(base, 'mixer', name), source.replaceAll('currentColor', '#' + hex)
      .replace('<svg ', '<svg width="16" height="16" '));
  }
  for (const name of SETTINGS_NAV_ICONS) {
    const upstream = readFileSync(path.join(vendor, meta.icons[name] + '.svg'), 'utf8');
    if (!upstream.startsWith('<svg ') || !upstream.includes('viewBox="0 0 24 24"')
      || /<script|<image|onload=|href=/i.test(upstream)) {
      throw new Error('Unexpected Settings navigation glyph: ' + name);
    }
    const paths = upstream.slice(upstream.indexOf('>') + 1, upstream.lastIndexOf('</svg>'));
    // The dark 0.6–0.7px keyline remains visible on light/bright accents;
    // the original-width light path remains visible on dark dock surfaces.
    const keyline = paths.replaceAll('currentColor', meta.selectedInk)
      .replace(/stroke-width="2"/g, 'stroke-width="3.4"')
      .replace(/fill="#191724"/g,
        'fill="#191724" stroke="#191724" stroke-width="1.2" stroke-linejoin="round"');
    const face = paths.replaceAll('currentColor', '#f8f8f2');
    const output = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" '
      + 'viewBox="0 0 24 24">' + keyline + face + '</svg>';
    writeFileSync(path.join(base, 'nav', name + '.svg'), output);
  }
  cpSync(path.join(vendor, 'LICENSE'), path.join(base, 'LICENSE'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildMingcuteIcons();
  console.log('Built ' + MINGCUTE_ICON_FILES.length + ' MingCute glyphs in two OBS polarities and 6 status glyphs');
}
