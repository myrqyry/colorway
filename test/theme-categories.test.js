import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES } from '../src/theme-catalog.js';
import { THEME_CATEGORIES, getThemeCategory, filterThemeCatalog, sortThemesByDisplayName, UPSTREAM_THEME_PRESETS } from '../src/theme-categories.js';

const categories = new Set(THEME_CATEGORIES.map((entry) => entry.id));

test('each existing theme belongs to a recognized, deterministic category', () => {
  for (const theme of THEMES) {
    const category = getThemeCategory(theme.file);
    assert.ok(categories.has(category), theme.file);
    assert.notEqual(category, 'uncategorized', theme.file);
    assert.equal(getThemeCategory(theme.file), category);
  }
  assert.equal(getThemeCategory('Colorway-NewUnclassified.ovt'), 'uncategorized');
});

test('theme categories preserve collection identity ahead of broad aesthetics', () => {
  assert.equal(getThemeCategory('Colorway-CatppuccinMocha-Blue.ovt'), 'catppuccin');
  assert.equal(getThemeCategory('Colorway-RosePineDawn-Rose.ovt'), 'rose-pine');
  assert.equal(getThemeCategory('Colorway-EarthBound.ovt'), 'earthbound');
});

test('filtering supports category and search together without mutating the source', () => {
  const sample = [
    { file: 'Colorway-EarthBound.ovt', name: 'Earthbound' },
    { file: 'Colorway-Magicant.ovt', name: 'Magicant' },
    { file: 'Colorway-Nord.ovt', name: 'Nord' },
  ];
  const original = structuredClone(sample);
  assert.deepEqual(filterThemeCatalog(sample, { category: 'earthbound', query: 'mag' }).map((x) => x.name), ['Magicant']);
  assert.deepEqual(filterThemeCatalog(sample, { query: 'NORD' }).map((x) => x.name), ['Nord']);
  assert.deepEqual(filterThemeCatalog(sample, { category: 'unknown' }), []);
  assert.deepEqual(sample, original);
});

test('all 35 linked upstream presets have distinct sources and curated categories', () => {
  assert.equal(UPSTREAM_THEME_PRESETS.length, 35);
  const names = new Set();
  for (const preset of UPSTREAM_THEME_PRESETS) {
    assert.ok(!names.has(preset.file), preset.file);
    names.add(preset.file);
    assert.ok(categories.has(preset.category), preset.file);
    assert.notEqual(preset.category, 'uncategorized', preset.file);
    assert.equal(preset.url, `https://raw.githubusercontent.com/silentoplayz/theme-designer-pro-presets/main/themes/${preset.file}`);
    assert.equal(preset.status, 'source-only');
  }
});

test('display sorting keeps EarthBound family together while preserving source order', () => {
  const source = [
    { file: 'Colorway-Magicant.ovt', name: 'EarthBound — Magicant' },
    { file: 'Colorway-Nord.ovt', name: 'Nord' },
    { file: 'Colorway-EarthBound.ovt', name: 'EarthBound' },
    { file: 'Colorway-Moonside.ovt', name: 'EarthBound — Moonside' },
  ];
  const order = sortThemesByDisplayName(source, {});
  assert.deepEqual(order.map((theme) => theme.name), [
    'EarthBound',
    'EarthBound — Magicant',
    'EarthBound — Moonside',
    'Nord',
  ]);
  assert.equal(source[0].file, 'Colorway-Magicant.ovt');
});
