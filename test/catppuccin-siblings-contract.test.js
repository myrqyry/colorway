import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { THEMES } from '../src/theme-catalog.js';
import {
  accentLC,
  families,
  neutralLC,
  renderTheme,
  resolvedPaletteVars,
} from '../scripts/generate-catppuccin-siblings.mjs';
import { buildPaletteComment, injectCommentBlock } from '../scripts/theme-palette-comments.mjs';

const themesDir = new URL('../themes/', import.meta.url);
const docs = readFileSync(new URL('../docs/CATPPUCCIN_SIBLINGS_V2.md', import.meta.url), 'utf8');
const solarizedLight = readFileSync(new URL('../themes/Colorway-SolarizedLight.ovt', import.meta.url), 'utf8');
const siblingFiles = readdirSync(themesDir)
  .filter((file) => file.startsWith('Colorway-CatppuccinSibling-') && file.endsWith('.ovt'))
  .sort();
const expectedFiles = Object.values(families)
  .map((config) => `Colorway-CatppuccinSibling-${config.name}.ovt`)
  .sort();
const expectedSeedNames = [
  ...Object.keys(neutralLC),
  ...Object.keys(accentLC),
].map((name) => `--sibling_${name}`).sort();

test('V2 sibling recipe keeps its promised 12-neutral + 14-accent shape', () => {
  assert.equal(Object.keys(neutralLC).length, 12);
  assert.equal(Object.keys(accentLC).length, 14);
});

function parseMeta(source) {
  const value = (field) => source.match(new RegExp(`${field}:\\s*'([^']+)'`))?.[1];
  return {
    name: value('name'),
    id: value('id'),
    extends: value('extends'),
    dark: value('dark'),
  };
}

function parseVars(source) {
  const block = source.match(/@OBSThemeVars\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(block, 'theme vars block missing');
  const clean = block.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = new Map();
  for (const line of clean.split('\n')) {
    const match = line.match(/^\s*(--[A-Za-z0-9_]+)\s*:\s*(.+?);\s*$/);
    if (match) vars.set(match[1], match[2].trim());
  }
  return vars;
}

test('every generated sibling ships exactly one source theme and catalog entry', () => {
  assert.deepEqual(siblingFiles, expectedFiles);

  const catalogFiles = THEMES
    .filter(({ file }) => file.startsWith('Colorway-CatppuccinSibling-'))
    .map(({ file }) => file)
    .sort();
  assert.deepEqual(catalogFiles, expectedFiles);
});

test('sibling identities are unique and catalog labels match theme metadata', () => {
  const catalog = new Map(THEMES.map(({ file, name }) => [file, name]));
  const ids = new Set();

  for (const file of siblingFiles) {
    const source = readFileSync(new URL(`../themes/${file}`, import.meta.url), 'utf8');
    const meta = parseMeta(source);
    assert.equal(meta.extends, 'com.myrqyry.Colorway');
    assert.equal(meta.dark, 'true');
    assert.equal(catalog.get(file), meta.name, `${file} catalog name differs from @OBSThemeMeta name`);
    assert.ok(meta.id, `${file} is missing its id`);
    assert.ok(!ids.has(meta.id), `duplicate sibling theme id: ${meta.id}`);
    ids.add(meta.id);
  }
});

test('every sibling has exactly the complete OBS-safe V2 seed', () => {
  for (const file of siblingFiles) {
    const source = readFileSync(new URL(`../themes/${file}`, import.meta.url), 'utf8');
    const vars = parseVars(source);
    const actualSeedNames = [...vars.keys()]
      .filter((name) => name.startsWith('--sibling_'))
      .sort();
    assert.deepEqual(actualSeedNames, expectedSeedNames, `${file} sibling seed set drifted`);
    assert.doesNotMatch(source, /--sibling-/);
    for (const name of expectedSeedNames) {
      assert.match(vars.get(name) ?? '', /^#[0-9a-f]{6}$/);
    }
  }
});

test('all sibling palette seeds are distinct', () => {
  const blocks = siblingFiles.map((file) => {
    const source = readFileSync(new URL(`../themes/${file}`, import.meta.url), 'utf8');
    const vars = parseVars(source);
    return expectedSeedNames.map((name) => `${name}=${vars.get(name)}`).join('\n');
  });
  assert.equal(new Set(blocks).size, siblingFiles.length);
});

test('generator reproduces the checked-in post-sync sibling sources exactly', () => {
  for (const config of Object.values(families)) {
    const file = `Colorway-CatppuccinSibling-${config.name}.ovt`;
    const checkedIn = readFileSync(new URL(`../themes/${file}`, import.meta.url), 'utf8');
    assert.equal(
      checkedIn,
      renderTheme(config),
      `${file} drifted from scripts/generate-catppuccin-siblings.mjs`,
    );
  }
});

test('rendered sibling themes are fixed points of palette-comment synchronization', () => {
  for (const config of Object.values(families)) {
    const rendered = renderTheme(config);
    const { resolved } = resolvedPaletteVars(config);
    const comment = buildPaletteComment(`Catppuccin Sibling — ${config.name}`, resolved);
    assert.equal(injectCommentBlock(rendered, comment), rendered);
  }
});

test('documentation recipe stays synchronized with the generator source of truth', () => {
  const jsonBlocks = [...docs.matchAll(/```json\n([\s\S]*?)\n```/g)]
    .map((match) => JSON.parse(match[1]));
  assert.equal(jsonBlocks.length, 3);
  assert.deepEqual(jsonBlocks[0], neutralLC);
  assert.deepEqual(jsonBlocks[1], accentLC);
  assert.deepEqual(jsonBlocks[2], families);
});

test('palette sync replaces generic palette comments without duplicating them', () => {
  const nextComment = '/* Official palette reference: Replacement\n    */';
  const generic = '@OBSThemeVars {\n    /* Official palette reference: Old\n    */\n\n    --text: #ffffff;\n}';
  const next = injectCommentBlock(generic, nextComment);

  assert.equal((next.match(/Official palette reference/g) ?? []).length, 1);
  assert.match(next, /Official palette reference: Replacement/);
  assert.match(next, /--text: #ffffff;/);
});

test('palette sync preserves real light-theme source-value annotations verbatim', () => {
  const sourceComment = solarizedLight.match(
    /\/\* Official palette reference \(source values; live accessibility overrides below may differ\):[\s\S]*?\*\//,
  )?.[0];
  assert.ok(sourceComment, 'Solarized Light source-values annotation missing from fixture');

  const replacement = '/* Official palette reference: Accessibility-adjusted replacement\n    */';
  const next = injectCommentBlock(solarizedLight, replacement);

  assert.equal((next.match(/Official palette reference/g) ?? []).length, 1);
  assert.ok(next.includes(sourceComment), 'sync must preserve the original source-values palette comment');
  assert.doesNotMatch(next, /Accessibility-adjusted replacement/);
  assert.match(next, /--warning:\s*#745800;/);
});

test('out-of-gamut families fail loudly instead of clipping', () => {
  assert.throws(
    () => renderTheme({ ...families.terracotta, accent_chroma_scale: 5 }),
    /Terracotta accent \w+ is outside sRGB gamut/,
  );
});
