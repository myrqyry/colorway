import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { THEMES } from '../src/theme-catalog.js';
import { toNormalizedTheme } from '../src/theme-workbench.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export function referenceCatalog(directory = root) {
  const entries = ['Colorway.obt', ...THEMES.map(t => t.file)].map(file => {
    const source = readFileSync(join(directory, 'themes', file), 'utf8');
    const { id, name, extendsId } = toNormalizedTheme(source);
    return [file, { file, source, id, name, extendsId }];
  });
  const catalog = new Map(entries);
  if (catalog.size !== entries.length || new Set(entries.map(([, t]) => t.id)).size !== entries.length)
    throw Error('Duplicate theme file or ID');
  return catalog;
}

export function themeLayers(catalog, file) {
  const ids = new Map([...catalog.values()].map(entry => [entry.id, entry]));
  const chain = [];
  let entry = catalog.get(file);
  if (!entry) throw Error('Unknown theme: ' + file);
  while (entry) {
    if (chain.includes(entry)) throw Error('Theme inheritance cycle: ' + file);
    chain.unshift(entry);
    if (!entry.extendsId) break;
    const parent = ids.get(entry.extendsId);
    if (!parent) throw Error('Missing theme parent: ' + entry.extendsId);
    entry = parent;
  }
  if (chain[0].file !== 'Colorway.obt') throw Error('Unsupported base: ' + file);
  return chain;
}

export function referencePayload(catalog, file, directory = root) {
  const layers = themeLayers(catalog, file);
  return { base: layers[0].source, ancestors: layers.slice(1, -1).map(t => t.source),
    variant: layers.length > 1 ? layers.at(-1).source : '', root: directory };
}

function main() {
  const { values } = parseArgs({ options: { output: {type:'string'}, theme: {type:'string', multiple:true} } });
  if (!values.output) throw Error('Use --output DIRECTORY (optional --theme FILE, repeatable)');
  const output = resolve(values.output);
  const catalog = referenceCatalog();
  const files = [...new Set(values.theme || catalog.keys())];
  // Validate all selections before writing anything.
  for (const file of files) themeLayers(catalog, file);
  mkdirSync(output, { recursive: true });
  const themes = [];
  for (const file of files) {
    const dir = basename(file, file.endsWith('.ovt') ? '.ovt' : '.obt');
    const destination = join(output, dir);
    const result = spawnSync(process.env.COLORWAY_QT_PYTHON || '/usr/bin/python3',
      [join(root, 'scripts/qt-preview-reference.py'), '--output', destination, '--atlas-only'],
      { input: JSON.stringify(referencePayload(catalog, file)), encoding: 'utf8', timeout: 15000 });
    if (result.status !== 0) throw Error(file + ': ' + (result.error || result.stderr));
    const report = JSON.parse(result.stdout);
    const {qtVersion, style, ...families} = report;
    const specimens = Object.values(families).reduce((sum, states) => sum + Object.keys(states).length, 0);
    themes.push({ file, name: catalog.get(file).name, layers: themeLayers(catalog, file).map(t => t.file),
      image: dir + '/atlas.png', qtVersion, style, specimens, families: Object.keys(families) });
    console.log(file + ': ' + specimens + ' specimens');
  }
  writeFileSync(join(output, 'index.json'), JSON.stringify({ themes }, null, 2) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
