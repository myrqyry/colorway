import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const meta = JSON.parse(readFileSync(path.join(root, 'icons/mingcute-map.json'), 'utf8'));
export const MINGCUTE_ICON_FILES = Object.keys(meta.icons)
  .filter((name) => !name.startsWith('status/')).map((name) => name + '.svg');

const base = path.join(root, 'icons/colorway/mingcute');
const vendor = path.join(root, 'icons/vendor/mingcute');

export function buildMingcuteIcons() {
  for (const part of ['normal', 'selected', 'status']) {
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
  cpSync(path.join(vendor, 'LICENSE'), path.join(base, 'LICENSE'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildMingcuteIcons();
  console.log('Built ' + MINGCUTE_ICON_FILES.length + ' MingCute glyphs in two OBS polarities and 6 status glyphs');
}
