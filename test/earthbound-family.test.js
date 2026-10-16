import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES } from '../src/theme-catalog.js';
import { getThemeCategory, THEME_CATEGORIES } from '../src/theme-categories.js';
import { parseOVT } from '../src/theme-loader.js';

const FAMILY = [
  ['EarthBound', 'EarthBound', 'com.myrqyry.Colorway.EarthBound'],
  ['EarthBound-Darker', 'EarthBound — Darker', 'com.myrqyry.Colorway.EarthBound.Darker'],
  ['Moonside', 'EarthBound — Moonside', 'com.myrqyry.Colorway.Moonside'],
  ['Magicant', 'EarthBound — Magicant', 'com.myrqyry.Colorway.Magicant'],
  ['ZombieThreed', 'EarthBound — Zombie Threed', 'com.myrqyry.Colorway.ZombieThreed'],
  ['ZombieThreed-Darker', 'EarthBound — Zombie Threed Darker', 'com.myrqyry.Colorway.ZombieThreed.Darker'],
  ['DustyDunes', 'EarthBound — Dusty Dunes', 'com.myrqyry.Colorway.DustyDunes'],
  ['DustyDunes-Darker', 'EarthBound — Dusty Dunes Darker', 'com.myrqyry.Colorway.DustyDunes.Darker'],
  ['FireSpring', 'EarthBound — Fire Spring', 'com.myrqyry.Colorway.FireSpring'],
  ['FireSpring-Darker', 'EarthBound — Fire Spring Darker', 'com.myrqyry.Colorway.FireSpring.Darker'],
  ['CaveOfThePast', 'EarthBound — Cave of the Past', 'com.myrqyry.Colorway.CaveOfThePast'],
  ['DevilsMachine', 'EarthBound — Devil’s Machine', 'com.myrqyry.Colorway.DevilsMachine'],
];

test('EarthBound collection contains all twelve source palettes under consistent names and stable IDs', () => {
  assert.ok(THEME_CATEGORIES.some((category) => category.id === 'earthbound'));
  assert.equal(THEMES.filter((theme) => getThemeCategory(theme.file) === 'earthbound').length, FAMILY.length);
  for (const [stem, display, id] of FAMILY) {
    const file = 'Colorway-' + stem + '.ovt';
    const entry = THEMES.find((theme) => theme.file === file);
    assert.ok(entry, file + ' missing from catalog');
    assert.equal(entry.name, display, file + ' catalog name');
    assert.equal(getThemeCategory(file), 'earthbound', file + ' category');
    const source = readFileSync(new URL('../themes/' + file, import.meta.url), 'utf8');
    const parsed = parseOVT(source);
    assert.equal(parsed.meta._name, display, file + ' metadata name');
    assert.ok(source.includes("    id: '" + id + "';"), file + ' stable theme id');
    const expectedParent = stem === 'DustyDunes-Darker' ? 'com.myrqyry.Colorway.DustyDunes' : 'com.myrqyry.Colorway';
    assert.equal(parsed.meta._extends, expectedParent, file + ' parent');
  }
});

test('Devil’s Machine adapts original VS Code background, ink and focus colors rather than creating a placeholder', () => {
  const source = readFileSync(new URL('../themes/Colorway-DevilsMachine.ovt', import.meta.url), 'utf8');
  const parsed = parseOVT(source);
  assert.equal(parsed.vars['--bg_base'], '#040001');
  assert.equal(parsed.vars['--text'], '#ffcccc');
  assert.equal(parsed.vars['--primary'], '#938198');
  assert.equal(parsed.vars['--input_bg'], '#170000');
});
