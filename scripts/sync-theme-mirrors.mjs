import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PALETTE_VARS } from '../src/theme-loader.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
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

  const vars = new Map();
  for (const line of match[1].split('\n')) {
    const parsed = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?);\s*$/);
    if (parsed) vars.set(parsed[1], parsed[2].trim());
  }
  return vars;
}

function buildGraph() {
  const rootTheme = readFileSync(path.join(repoRoot, 'Colorway.obt'), 'utf8');
  const themeFiles = readdirSync(repoRoot)
    .filter((name) => /^Colorway-.*\.ovt$/.test(name))
    .sort();

  const parsedByFile = new Map();
  parsedByFile.set('Colorway.obt', { meta: parseMeta(rootTheme), vars: parseVars(rootTheme) });

  for (const file of themeFiles) {
    const text = readFileSync(path.join(repoRoot, file), 'utf8');
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

function buildPaletteComment(themeName, resolvedVars) {
  const hexLines = [];
  const derivedLines = [];

  for (const [varName] of PALETTE_VARS) {
    const value = resolvedVars.get(varName);
    if (!value) continue;

    const line = `       ${varName}: ${value};`;
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
      hexLines.push(line);
    } else {
      derivedLines.push(line);
    }
  }

  const lines = [`    /* Official palette reference: ${themeName}`];
  if (hexLines.length) {
    lines.push('       Hex colors:');
    lines.push(...hexLines);
  }
  if (derivedLines.length) {
    lines.push('       Derived colors:');
    lines.push(...derivedLines);
  }
  lines.push('    */');
  return lines.join('\n');
}

function injectCommentBlock(text, commentBlock) {
  return text.replace(/(@OBSThemeVars\s*\{)([\s\S]*?)(\n\})/, (_match, open, body, close) => {
    const lines = body.split('\n');
    const firstVarIndex = lines.findIndex((line) => /^\s*--[\w-]+\s*:/.test(line));
    const preserved = firstVarIndex === -1 ? body.trimStart() : lines.slice(firstVarIndex).join('\n');
    return `${open}\n${commentBlock}\n${preserved}${close}`;
  });
}

function syncFile(file, graph) {
  const sourcePath = path.join(repoRoot, file);
  const publicPath = path.join(publicThemesDir, file);
  const sourceText = readFileSync(sourcePath, 'utf8');
  const resolved = resolveTheme(file, graph);
  const commentBlock = buildPaletteComment(graph.parsedByFile.get(file).meta.name, resolved);
  const nextText = injectCommentBlock(sourceText, commentBlock);

  writeFileSync(sourcePath, nextText);
  writeFileSync(publicPath, nextText);
}

const graph = buildGraph();
for (const file of graph.themeFiles) {
  syncFile(file, graph);
}

console.log(`synced ${graph.themeFiles.length} theme files to public/themes`);
