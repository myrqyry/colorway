import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CANONICAL_COLOR_VARS = [
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
  '--ico',
  '--ico_selected',
];

const META_KEY_ORDER = ['name', 'id', 'extends', 'author', 'dark'];

export function getRepoRoot(moduleUrl) {
  return fileURLToPath(new URL('../', moduleUrl));
}

export function parseThemeText(text) {
  const metaMatch = text.match(/@OBSThemeMeta\s*\{([\s\S]*?)\}/);
  const varsMatch = text.match(/@OBSThemeVars\s*\{([\s\S]*?)\}/);

  if (!metaMatch) {
    throw new Error('theme meta block missing');
  }

  if (!varsMatch) {
    throw new Error('theme vars block missing');
  }

  const meta = new Map();
  for (const line of metaMatch[1].split('\n')) {
    const parsed = line.match(/^\s*([\w-]+)\s*:\s*'([^']*)';\s*$/);
    if (parsed) meta.set(parsed[1], parsed[2]);
  }

  const vars = new Map();
  for (const line of varsMatch[1].split('\n')) {
    const parsed = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?);\s*$/);
    if (parsed) vars.set(parsed[1], parsed[2].trim());
  }

  return { meta, vars };
}

function buildThemeIdIndex(baseThemeFile, files, parsedByFile) {
  const fileByThemeId = new Map([[ 'com.myrqyry.Colorway', baseThemeFile ]]);

  for (const file of files) {
    const parsed = parsedByFile.get(file);
    const themeId = parsed?.meta.get('id');
    if (themeId) fileByThemeId.set(themeId, file);
  }

  return fileByThemeId;
}

export function buildThemeGraph(repoRoot, baseThemeFile = 'Colorway.obt') {
  const themeFiles = readdirSync(repoRoot)
    .filter((name) => /^Colorway-.*\.ovt$/.test(name))
    .sort();

  const parsedByFile = new Map();
  for (const file of [baseThemeFile, ...themeFiles]) {
    const text = readFileSync(path.join(repoRoot, file), 'utf8');
    parsedByFile.set(file, parseThemeText(text));
  }

  return {
    repoRoot,
    baseThemeFile,
    themeFiles,
    parsedByFile,
    fileByThemeId: buildThemeIdIndex(baseThemeFile, themeFiles, parsedByFile),
  };
}

function resolveValue(value, vars) {
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

    const next = vars.get(ref);
    if (!next) {
      throw new Error(`unresolved variable reference: ${ref}`);
    }
    current = next;
  }
}

export function resolveTheme(file, graph, seen = new Set()) {
  if (seen.has(file)) {
    throw new Error(`cyclic theme inheritance detected for ${file}`);
  }

  const parsed = graph.parsedByFile.get(file);
  if (!parsed) {
    throw new Error(`theme file missing from graph: ${file}`);
  }

  seen.add(file);

  const resolved = new Map();
  const parentThemeId = parsed.meta.get('extends');

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
    if (!CANONICAL_COLOR_VARS.includes(key)) {
      continue;
    }

    resolved.set(key, resolveValue(value, resolved));
  }

  return resolved;
}

function renderMeta(meta) {
  const lines = ['@OBSThemeMeta {'];

  for (const key of META_KEY_ORDER) {
    const value = meta.get(key);
    if (value !== undefined && value !== '') {
      lines.push(`    ${key}: '${value}';`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

function renderVars(vars) {
  const lines = ['@OBSThemeVars {'];

  for (const key of CANONICAL_COLOR_VARS) {
    lines.push(`    ${key}: ${vars.get(key)};`);
  }

  lines.push('}');
  return lines.join('\n');
}

export function renderThemeFile(file, graph) {
  const parsed = graph.parsedByFile.get(file);
  const vars = resolveTheme(file, graph);

  return `${renderMeta(parsed.meta)}\n\n${renderVars(vars)}\n`;
}
