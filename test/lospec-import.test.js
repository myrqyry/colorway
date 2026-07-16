import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { assignRoles, lospecSlugFromUrl, fromLospecPalette } from '../src/theme-workbench.js';

// Moonside-8 palette from Lospec: 8 colors, pixel-art palette
const MOONSIDE_8 = [
  '#0f0518', '#36275b', '#505a96', '#7387c6',
  '#93b0da', '#b4cbdc', '#d2e0e0', '#efe8d8',
];

test('lospecSlugFromUrl extracts slug from full URL', () => {
  assert.equal(lospecSlugFromUrl('https://lospec.com/palette-list/moonside-8'), 'moonside-8');
  assert.equal(lospecSlugFromUrl('https://lospec.com/palette-list/moonside-8?foo=bar'), 'moonside-8');
  assert.equal(lospecSlugFromUrl('moonside-8'), 'moonside-8');
  assert.equal(lospecSlugFromUrl(''), null);
  assert.equal(lospecSlugFromUrl('   '), null);
});

describe('assignRoles', () => {
  test('returns null for fewer than 2 colors', () => {
    assert.equal(assignRoles(['#ff0000'], 'test'), null);
    assert.equal(assignRoles([], 'test'), null);
  });

  test('returns a normalized theme with all core tokens for moonside-8', () => {
    const theme = assignRoles(MOONSIDE_8, 'Moonside-8');
    assert.ok(theme);
    assert.equal(theme.name, 'Moonside-8');
    assert.equal(theme.author, 'Lospec');
    assert.equal(theme.extendsId, 'com.myrqyry.Colorway');
    assert.match(theme.id, /^com\.myrqyry\.Colorway\.moonside/);

    // Verify all required keys are present
    const required = [
      '--bg_window', '--bg_base', '--bg_dock', '--bg_preview', '--bg_hover',
      '--text', '--text_light', '--text_muted', '--text_inactive', '--text_disabled', '--text_inverse',
      '--primary', '--primary_light', '--primary_lighter', '--primary_dark', '--primary_darker',
      '--input_bg', '--input_bg_hover', '--input_border', '--input_border_hover',
      '--button_bg', '--button_bg_hover', '--button_bg_disabled',
      '--list_item_bg_hover', '--border_color', '--ico', '--ico_selected',
      '--warning', '--danger', '--success',
    ];
    for (const key of required) {
      assert.ok(theme.tokens[key], `missing token ${key}`);
      assert.match(theme.tokens[key], /^#/, `${key} is not a hex color: ${theme.tokens[key]}`);
    }
  });

  test('produces a dark theme for moonside-8 (which has very dark colors)', () => {
    const theme = assignRoles(MOONSIDE_8, 'test');
    assert.equal(theme.dark, true);
  });

  test('generates distinct background/text/accent values', () => {
    const theme = assignRoles(MOONSIDE_8, 'test');
    assert.notEqual(theme.tokens['--bg_base'], theme.tokens['--text']);
    assert.notEqual(theme.tokens['--bg_base'], theme.tokens['--primary']);
  });
});

test('fromLospecPalette fetches and assigns from live API', { timeout: 15000, skip: 'requires network' }, async () => {
  const theme = await fromLospecPalette('nintendo-entertainment-system');
  assert.ok(theme);
  assert.ok(theme.tokens['--bg_base']);
  assert.ok(theme.tokens['--text']);
  assert.ok(theme.tokens['--primary']);
});
