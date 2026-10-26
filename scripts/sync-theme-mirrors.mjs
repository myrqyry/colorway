import { readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMingcuteIcons, ICON_ASSET_PARTS } from './build-mingcute-icons.mjs';
import { decodeObsFunctionValue, quoteObsThemeFunctions } from '../src/theme-value-codec.js';
import { buildPaletteComment, injectCommentBlock } from './theme-palette-comments.mjs';
import { injectStateOverrides, renderStateOverrides, normalizeBaseIcons, injectButtonIconRules } from './theme-state-tokens.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const themesDir = path.join(repoRoot, 'themes');
const publicThemesDir = path.join(repoRoot, 'public', 'themes');

function parseMeta(text) {
  const nameMatch = text.match(/name:\s*'([^']+)'/);
  const idMatch = text.match(/id:\s*'([^']+)'/);
  const extendsMatch = text.match(/extends:\s*'([^']+)'/);

  return {
    name: nameMatch?.[1] ?? 'Unknown',
    id: idMatch?.[1],
    extends: extendsMatch?.[1],
  };
}

function parseVars(text) {
  const match = text.match(/@OBSThemeVars\s*\{([\s\S]*?)\}/);
  if (!match) {
    throw new Error('theme vars block missing');
  }

  const cleanBody = match[1].replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = new Map();
  for (const line of cleanBody.split('\n')) {
    const parsed = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?);\s*$/);
    if (parsed) vars.set(parsed[1], decodeObsFunctionValue(parsed[2].trim()));
  }
  return vars;
}

function buildGraph() {
  const rootTheme = readFileSync(path.join(themesDir, 'Colorway.obt'), 'utf8');
  const themeFiles = readdirSync(themesDir)
    .filter((name) => /^Colorway-.*\.ovt$/.test(name))
    .sort();

  const parsedByFile = new Map();
  parsedByFile.set('Colorway.obt', { meta: parseMeta(rootTheme), vars: parseVars(rootTheme) });

  for (const file of themeFiles) {
    const text = readFileSync(path.join(themesDir, file), 'utf8');
    parsedByFile.set(file, { meta: parseMeta(text), vars: parseVars(text) });
  }

  const fileByThemeId = new Map([['com.myrqyry.Colorway', 'Colorway.obt']]);
  for (const file of themeFiles) {
    const parsed = parsedByFile.get(file);
    if (parsed?.meta.id) {
      fileByThemeId.set(parsed.meta.id, file);
    }
  }

  return { themeFiles, parsedByFile, fileByThemeId };
}

function resolveValue(value, resolvedVars) {
  let current = value;
  const seen = new Set();

  while (true) {
    const match = current.match(/^var\((--[\w-]+)\)$/);
    if (!match) return current;

    const ref = match[1];
    if (seen.has(ref)) {
      throw new Error(`cyclic variable reference: ${[...seen, ref].join(' -> ')}`);
    }
    seen.add(ref);

    const next = resolvedVars.get(ref);
    if (!next) {
      return current;
    }
    current = next;
  }
}

function resolveTheme(file, graph, seen = new Set()) {
  if (seen.has(file)) {
    throw new Error(`cyclic theme inheritance detected for ${file}`);
  }

  const parsed = graph.parsedByFile.get(file);
  if (!parsed) {
    throw new Error(`theme file missing from graph: ${file}`);
  }

  seen.add(file);

  const resolved = new Map();
  const parentThemeId = parsed.meta.extends;
  if (parentThemeId) {
    const parentFile = graph.fileByThemeId.get(parentThemeId);
    if (!parentFile) {
      throw new Error(`${file} extends unknown theme id ${parentThemeId}`);
    }

    for (const [key, value] of resolveTheme(parentFile, graph, seen)) {
      resolved.set(key, value);
    }
  }

  for (const [key, value] of parsed.vars) {
    resolved.set(key, resolveValue(value, resolved));
  }

  return resolved;
}

function syncFile(file, graph) {
  const sourcePath = path.join(themesDir, file);
  const publicPath = path.join(publicThemesDir, file);
  const sourceText = readFileSync(sourcePath, 'utf8');
  const resolved = resolveTheme(file, graph);
  const commentBlock = buildPaletteComment(graph.parsedByFile.get(file).meta.name, resolved);
  const nextText = quoteObsThemeFunctions(injectStateOverrides(injectCommentBlock(sourceText, commentBlock),
    renderStateOverrides(resolved, graph.parsedByFile.get('Colorway.obt').vars)));

  writeFileSync(sourcePath, nextText);
  writeFileSync(publicPath, nextText);
}

const graph = buildGraph();
const basePath = path.join(themesDir, 'Colorway.obt');
const baseText = quoteObsThemeFunctions(injectButtonIconRules(injectStateOverrides(normalizeBaseIcons(readFileSync(basePath, 'utf8')),
  renderStateOverrides(graph.parsedByFile.get('Colorway.obt').vars))));
writeFileSync(basePath, baseText);
mkdirSync(publicThemesDir, { recursive: true });
writeFileSync(path.join(publicThemesDir, 'Colorway.obt'), baseText);
for (const file of graph.themeFiles) {
  syncFile(file, graph);
}

const patternsDir = path.join(repoRoot, 'patterns');
const publicPatternsDir = path.join(repoRoot, 'public', 'patterns');
for (const name of readdirSync(patternsDir)) {
  if (!/\.svg$/.test(name)) continue;
  writeFileSync(path.join(publicPatternsDir, name), readFileSync(path.join(patternsDir, name)));
}

const fontsDir = path.join(repoRoot, 'fonts');
const publicFontsDir = path.join(repoRoot, 'public', 'fonts');
mkdirSync(publicFontsDir, { recursive: true });
for (const name of readdirSync(fontsDir)) {
  if (!/\.(ttf|otf|woff2?)$/.test(name) && name !== 'OFL.txt') continue;
  writeFileSync(path.join(publicFontsDir, name), readFileSync(path.join(fontsDir, name)));
}

buildMingcuteIcons();
const iconsDir = path.join(repoRoot, 'icons', 'colorway', 'mingcute');
const publicIconsDir = path.join(repoRoot, 'public', 'icons', 'colorway', 'mingcute');
rmSync(publicIconsDir, { recursive: true, force: true });
cpSync(iconsDir, publicIconsDir, { recursive: true });
// Drop obsolete generated assets; installed user themes and settings are never modified.
rmSync(path.join(repoRoot, 'public', 'icons', 'colorway', 'iconamoon'), { recursive: true, force: true });
rmSync(path.join(repoRoot, 'public', 'icons', 'obs-design'), { recursive: true, force: true });
const assets = ICON_ASSET_PARTS.flatMap((polarity) =>
  readdirSync(path.join(iconsDir, polarity)).filter((name) => name.endsWith('.svg')).sort()
    .map((name) => `icons/colorway/mingcute/${polarity}/${name}`));
assets.push('icons/colorway/mingcute/LICENSE');
assets.push(...readdirSync(patternsDir).filter((name) => name.endsWith('.svg')).sort().map((name) => `patterns/${name}`));
assets.push('fonts/BricolageGrotesqueVariable.ttf', 'fonts/OFL.txt');
writeFileSync(path.join(repoRoot, 'public', 'theme-assets.json'), JSON.stringify(assets, null, 2) + '\n');
writeFileSync(path.join(repoRoot, 'public', 'INSTALL.md'), readFileSync(path.join(repoRoot, 'docs', 'INSTALL.md')));
writeFileSync(path.join(repoRoot, 'public', 'THEME_CREDITS.md'), readFileSync(path.join(repoRoot, 'docs', 'THEME_CREDITS.md')));

console.log(`synced base, ${graph.themeFiles.length} variants, and ${assets.length} package assets`);
