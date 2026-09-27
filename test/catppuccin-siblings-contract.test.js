import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const catalog = readFileSync(new URL('../src/theme-catalog.js', import.meta.url), 'utf8');
const seedTokens = ["text","subtext1","subtext0","overlay2","overlay1","overlay0","surface2","surface1","surface0","base","mantle","crust","rosewater","flamingo","pink","mauve","red","maroon","peach","yellow","green","teal","sky","sapphire","blue","lavender"];
const siblings = [
  {
    "name": "Affogato",
    "file": "Colorway-CatppuccinSibling-Affogato.ovt"
  },
  {
    "name": "Matcha",
    "file": "Colorway-CatppuccinSibling-Matcha.ovt"
  },
  {
    "name": "Ube",
    "file": "Colorway-CatppuccinSibling-Ube.ovt"
  },
  {
    "name": "Sesame",
    "file": "Colorway-CatppuccinSibling-Sesame.ovt"
  },
  {
    "name": "Terracotta",
    "file": "Colorway-CatppuccinSibling-Terracotta.ovt"
  },
  {
    "name": "Lichen",
    "file": "Colorway-CatppuccinSibling-Lichen.ovt"
  },
  {
    "name": "Garnet",
    "file": "Colorway-CatppuccinSibling-Garnet.ovt"
  },
  {
    "name": "Petal",
    "file": "Colorway-CatppuccinSibling-Petal.ovt"
  }
];

test('catalog exposes all Colorway Catppuccin sibling palettes', () => {
  for (const sibling of siblings) {
    assert.match(catalog, new RegExp(sibling.file.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&')));
    assert.match(catalog, new RegExp(`Catppuccin Sibling — ${sibling.name}`));
  }
});

for (const sibling of siblings) {
  test(`${sibling.file} preserves the complete V2 sibling seed`, () => {
    const source = readFileSync(new URL(`../themes/${sibling.file}`, import.meta.url), 'utf8');
    assert.match(source, /extends:\\s*'com\\.myrqyry\\.Colorway'/);
    assert.match(source, /dark:\\s*'true'/);
    assert.match(source, /Colorway-original Catppuccin-inspired sibling palette/);
    assert.match(source, /Not an official Catppuccin flavor/);
    for (const token of seedTokens) {
      assert.match(source, new RegExp(`--sibling-${token}:\\\\s*#[0-9a-f]{6};`, 'i'));
    }
  });
}
