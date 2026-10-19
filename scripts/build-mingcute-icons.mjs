import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const meta = JSON.parse(readFileSync(path.join(root, 'icons/mingcute-map.json'), 'utf8'));
export const MINGCUTE_ICON_FILES = Object.keys(meta.icons)
  .filter((name) => !name.startsWith('status/')).map((name) => name + '.svg');

const base = path.join(root, 'icons/colorway/mingcute');
const vendor = path.join(root, 'icons/vendor/mingcute');

// OBS Settings keeps one QIcon per category for both ordinary and selected
// QListWidget rows. A restrained dual-ink keyline makes that same glyph
// readable on both the neutral navigation pane and the accent selection.
export const SETTINGS_NAV_ICONS = [
  'settings', 'brush', 'output', 'media-play', 'audio', 'display',
  'gamepad', 'eye', 'cogs',
];

export function buildMingcuteIcons() {
  for (const part of ['normal', 'selected', 'status', 'nav']) {
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
    const output = (ink) => upstream.replaceAll('currentColor', ink)
      .replace('<svg ', '<svg width="16" height="16" ');
    for (const polarity of name.startsWith('status/') ? [''] : ['normal/', 'selected/']) {
      const ink = polarity === 'selected/' ? meta.selectedInk : meta.normalInk;
      const file = path.join(base, polarity + name + '.svg');
      writeFileSync(file, output(ink));
    }
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
