import { readFileSync, readdirSync } from 'node:fs';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { toNormalizedTheme, serializeOVT, toYamiOVT } from '../src/theme-workbench.js';
import { parseOVT } from '../src/theme-loader.js';

const ROOT = new URL('../themes/', import.meta.url);

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

  test('preserves Yami-native color tokens and name', () => {
    const t = toNormalizedTheme(FIXTURE_TEXT);
    const out = toYamiOVT(t);
    assert.match(out, /name:\s*'Test Theme'/);
    assert.match(out, /--bg_base:\s*#1a1a2e/);
    assert.match(out, /--primary:\s*#ff6b6b/);
  });

  test('recolors stock Yami palette slots that its QSS references directly', () => {
    const theme = toNormalizedTheme(read('Colorway-RosePineMoon-Love.ovt'));
    const vars = parseOVT(toYamiOVT(theme)).vars;

    assert.equal(vars['--grey1'], '#56526e');
    assert.equal(vars['--grey3'], '#44415a');
    assert.equal(vars['--grey6'], '#232136');
    assert.equal(vars['--grey7'], '#232136');
    assert.equal(vars['--grey8'], '#2a273f');
    assert.equal(vars['--blue1'], '#f6c177');
    assert.equal(vars['--blue2'], '#ea9a97');
    assert.equal(vars['--blue3'], '#eb6f92');
  });

  test('does not carry Colorway-only or geometry tokens into stock Yami', () => {
    const theme = toNormalizedTheme(read('Colorway-RosePineMoon-Love.ovt'));
    theme.tokens['--border_radius'] = '99px';
    const vars = parseOVT(toYamiOVT(theme)).vars;

    assert.equal(vars['--bg_dock'], undefined);
    assert.equal(vars['--on_panel_muted'], undefined);
    assert.equal(vars['--border_radius'], undefined);
  });

  test('produces stock-Yami color-only variants for every built-in theme', () => {
    const files = readdirSync(ROOT)
      .filter((n) => /^Colorway-.*\.ovt$/.test(n));

    for (const file of files) {
      const theme = toNormalizedTheme(read(file));
      const reparsed = parseOVT(toYamiOVT(theme));
      const vars = reparsed.vars;

      assert.equal(reparsed.meta._name, theme.name, file);
      assert.equal(reparsed.meta._extends, 'com.obsproject.Yami', file);
      assert.equal(vars['--bg_base'], theme.tokens['--bg_base'], file);
      assert.equal(vars['--primary'], theme.tokens['--primary'], file);
      assert.equal(vars['--text'], theme.tokens['--text'], file);
      assert.equal(vars['--grey6'], theme.tokens['--bg_base'], file);
      assert.equal(vars['--grey7'], theme.tokens['--bg_window'], file);
      assert.equal(vars['--grey8'], theme.tokens['--bg_preview'], file);
      assert.equal(vars['--blue3'], theme.tokens['--primary'], file);
      assert.equal(vars['--white1'], theme.tokens['--text_light'], file);

      assert.equal(vars['--bg_dock'], undefined, file);
      assert.equal(vars['--ico'], undefined, file);
      assert.equal(vars['--warning'], undefined, file);
      assert.equal(vars['--border_radius'], undefined, file);
      assert.equal(Object.keys(vars).some((key) => key.startsWith('--on_')), false, file);
    }
  });
});
