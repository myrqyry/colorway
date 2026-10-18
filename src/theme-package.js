import { zipSync, strToU8 } from 'fflate';

const safePath = (path) => typeof path === 'string' && /^[\w./-]+$/.test(path)
  && !path.startsWith('/') && !path.split('/').some((part) => part === '..' || part === '.' || !part);

export async function buildThemePackage(file, includeBase = true, fetcher = fetch) {
  if (!/^Colorway-[\w-]+\.ovt$/.test(file)) throw new Error('Invalid Colorway variant filename');
  const get = async (path) => {
    const response = await fetcher('/' + path);
    if (!response.ok) throw new Error(`Could not package ${path}: HTTP ${response.status}`);
    return response;
  };
  const manifest = await (await get('theme-assets.json')).json();
  if (!Array.isArray(manifest) || !manifest.length || !manifest.every((path) => safePath(path)
    && /^(icons\/colorway\/mingcute\/|patterns\/|fonts\/)/.test(path))) {
    throw new Error('Invalid theme asset manifest');
  }
  const companion = [
    'companion/colorway-patterns.lua',
    'companion/colorway-preview.html',
    'companion/README.md',
  ];
  const sources = [`themes/${file}`, ...(includeBase ? ['themes/Colorway.obt'] : []),
    ...new Set(manifest), ...companion];
  const entries = {};
  // Keep network demand bounded rather than firing a hundred requests at once.
  for (let i = 0; i < sources.length; i += 8) {
    await Promise.all(sources.slice(i, i + 8).map(async (path) => {
      const bytes = new Uint8Array(await (await get(path)).arrayBuffer());
      entries[path.startsWith('fonts/') || path.startsWith('themes/') || path.startsWith('companion/') ? path : 'themes/' + path] = bytes;
    }));
  }
  const instructions = await (await get('INSTALL.md')).text();
  entries['INSTALL.md'] = strToU8(instructions);
  // Attribution ships with the actual original palette rather than relying
  // on a website or a misleading locally generated comment.
  entries['THEME_CREDITS.md'] = strToU8(await (await get('THEME_CREDITS.md')).text());
  return zipSync(entries, { level: 6 });
}

export async function downloadThemePackage(file, includeBase = true) {
  const bytes = await buildThemePackage(file, includeBase);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.replace(/\.ovt$/, '') + '.zip';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Leave enough time for the browser to begin reading the download URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
