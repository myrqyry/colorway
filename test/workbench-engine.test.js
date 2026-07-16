import { readFileSync, readdirSync } from 'node:fs';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { toNormalizedTheme, serializeOVT, toYamiOVT } from '../src/theme-workbench.js';
import { parseOVT } from '../src/theme-loader.js';

const ROOT = new URL('../', import.meta.url);

function read(file) {
  return readFileSync(new URL(file, ROOT), 'utf8');
}

const FIXTURE_TEXT = `@OBSThemeMeta {
    name: 'Test Theme';
    id: 'com.test.Test';
    extends: 'com.myrqyry.Colorway';
    author: 'tester';
    dark: 'true';
}

@OBSThemeVars {
    --bg_base: #1a1a2e;
    --text: #e0e0e0;
    --primary: #ff6b6b;
    --border_color: var(--primary);
    --input_bg: #16213e;
}`;

test('toNormalizedTheme extracts all meta fields', () => {
  const t = toNormalizedTheme(FIXTURE_TEXT);
  assert.equal(t.name, 'Test Theme');
  assert.equal(t.id, 'com.test.Test');
  assert.equal(t.author, 'tester');
  assert.equal(t.extendsId, 'com.myrqyry.Colorway');
  assert.equal(t.dark, true);
  assert.equal(t.sourceFormat, 'colorway');
});

test('toNormalizedTheme extracts all tokens', () => {
  const t = toNormalizedTheme(FIXTURE_TEXT);
  assert.equal(t.tokens['--bg_base'], '#1a1a2e');
  assert.equal(t.tokens['--text'], '#e0e0e0');
  assert.equal(t.tokens['--primary'], '#ff6b6b');
});

test('toNormalizedTheme parses external (no extends) theme', () => {
  const text = `@OBSThemeMeta { name: 'Standalone'; dark: 'false'; }\n@OBSThemeVars { --bg_base: #fff; --text: #000; }`;
  const t = toNormalizedTheme(text);
  assert.equal(t.name, 'Standalone');
  assert.equal(t.extendsId, undefined);
  assert.equal(t.sourceFormat, 'external');
  assert.equal(t.dark, false);
});

describe('serializeOVT round-trips', () => {
  test('produces valid @OBSThemeMeta and @OBSThemeVars blocks', () => {
    const t = toNormalizedTheme(FIXTURE_TEXT);
    const out = serializeOVT(t);
    assert.match(out, /@OBSThemeMeta\s*\{/);
    assert.match(out, /@OBSThemeVars\s*\{/);
    assert.match(out, /name:\s*'Test Theme'/);
    assert.match(out, /--bg_base:\s*#1a1a2e/);
  });

  test('round-trips through parseOVT', () => {
    const t = toNormalizedTheme(FIXTURE_TEXT);
    const out = serializeOVT(t);
    const reparsed = parseOVT(out);
    assert.equal(reparsed.meta._name, 'Test Theme');
    assert.equal(reparsed.vars['--bg_base'], '#1a1a2e');
    assert.equal(reparsed.vars['--primary'], '#ff6b6b');
  });
});

describe('toYamiOVT', () => {
  test('forces extends to Yami base id', () => {
    const t = toNormalizedTheme(FIXTURE_TEXT);
    const out = toYamiOVT(t);
    assert.match(out, /extends:\s*'com\.obsproject\.Yami'/);
  });

  test('preserves original tokens and name', () => {
    const t = toNormalizedTheme(FIXTURE_TEXT);
    const out = toYamiOVT(t);
    assert.match(out, /name:\s*'Test Theme'/);
    assert.match(out, /--bg_base:\s*#1a1a2e/);
    assert.match(out, /--primary:\s*#ff6b6b/);
  });

  test('round-trips for every built-in theme', () => {
    const files = readdirSync(ROOT)
      .filter((n) => /^Colorway-.*\.ovt$/.test(n));
    const excluded = new Set([
      '--accent_bg_start', '--accent_bg_end',
      '--bg_dock', '--bg_hover',
      '--ico', '--ico_selected',
      '--meter_bg_nom', '--meter_bg_war', '--meter_bg_err',
      '--meter_fg_nom', '--meter_fg_war', '--meter_fg_err',
      '--success', '--text_inverse',
    ]);
    for (const file of files) {
      const text = read(file);
      const t = toNormalizedTheme(text);
      const out = toYamiOVT(t);
      const reparsed = parseOVT(out);
      assert.equal(reparsed.meta._name, t.name, file);
      assert.equal(reparsed.meta._extends, 'com.obsproject.Yami', file);
      for (const [k, v] of Object.entries(t.tokens)) {
        if (excluded.has(k)) {
          assert.equal(reparsed.vars[k], undefined, `${file} should NOT have ${k} in Yami output`);
        } else if (!v.startsWith('var(')) {
          assert.equal(reparsed.vars[k], v, `${file} token ${k}`);
        }
      }
    }
  });
});
