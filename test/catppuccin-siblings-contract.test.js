import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const themesDir = new URL('../themes/', import.meta.url);
const catalogText = readFileSync(new URL('../src/theme-catalog.js', import.meta.url), 'utf8');
const siblingFiles = readdirSync(themesDir)
  .filter((file) => /^Colorway-CatppuccinSibling-[A-Za-z]+\.ovt$/.test(file))
  .sort();

const expectedSeedNames = [
  "--sibling_text",
  "--sibling_subtext1",
  "--sibling_subtext0",
  "--sibling_overlay2",
  "--sibling_overlay1",
  "--sibling_overlay0",
  "--sibling_surface2",
  "--sibling_surface1",
  "--sibling_surface0",
  "--sibling_base",
  "--sibling_mantle",
  "--sibling_crust",
  "--sibling_rosewater",
  "--sibling_flamingo",
  "--sibling_pink",
  "--sibling_mauve",
  "--sibling_red",
  "--sibling_maroon",
  "--sibling_peach",
  "--sibling_yellow",
  "--sibling_green",
  "--sibling_teal",
  "--sibling_sky",
  "--sibling_sapphire",
  "--sibling_blue",
  "--sibling_lavender"
];

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

function parseCatalog() {
  const entries = new Map();
  for (const match of catalogText.matchAll(/\{ file: '([^']+)', name: '([^']+)' \}/g)) {
    entries.set(match[1], match[2]);
  }
  return entries;
}

test('ships exactly eight discoverable Catppuccin sibling palettes', () => {
  assert.equal(siblingFiles.length, 8);
});

test('sibling identities are unique and catalog labels match theme metadata', () => {
  const catalog = parseCatalog();
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
    const actualSeedNames = [...vars.keys()].filter((name) => name.startsWith('--sibling_')).sort();
    assert.deepEqual(actualSeedNames, [...expectedSeedNames].sort(), `${file} sibling seed set drifted`);
    assert.doesNotMatch(source, /--sibling-/);
    for (const name of expectedSeedNames) {
      assert.match(vars.get(name) ?? '', /^#[0-9a-f]{6}$/);
    }
  }
});

test('all eight sibling palette seeds are distinct', () => {
  const blocks = siblingFiles.map((file) => {
    const source = readFileSync(new URL(`../themes/${file}`, import.meta.url), 'utf8');
    const vars = parseVars(source);
    return expectedSeedNames.map((name) => `${name}=${vars.get(name)}`).join('\n');
  });
  assert.equal(new Set(blocks).size, siblingFiles.length);
});
