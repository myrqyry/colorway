import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseOVT, browserThemeAssetValue } from '../src/theme-loader.js';
import { serializeOVT } from '../src/theme-workbench.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => readFileSync(join(root, name), 'utf8');
const files = readdirSync(join(root, 'themes')).filter((name) => /\.(obt|ovt)$/.test(name)).sort();
const functionValues = (src) => {
  const block = src.match(/@OBSThemeVars\s*\{([\s\S]*?)\}/)?.[1] || '';
  const clean = block.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)]
    .filter(([, , value]) => /^['"]?(?:url|rgba)\(/.test(value))
    .map(([, name, value]) => ({ name, value: value.trim() }));
};

test('the entire shipped corpus uses OBS-lexable complete quoted function strings', () => {
  let count = 0;
  for (const file of files) {
    const text = read('themes/' + file);
    for (const { name, value } of functionValues(text)) {
      assert.match(value, /^(['"])(?:url|rgba)\([\s\S]*\)\1$/, file + ': ' + name);
      count++;
    }
  }
  assert.ok(count > 2000, 'guard must cover the full MingCute asset and opacity corpus');
});

test('web parser ignores source palette comments rather than treating them as OBS overrides', () => {
  const carbonfox = parseOVT(read('themes/Colorway-Carbonfox.ovt')).vars;
  assert.equal(carbonfox['--primary'], '#33b1ff');
  assert.equal(carbonfox['--list_item_bg_selected'], undefined,
    'Rosé Pine selection exists only in a historical reference comment');
  assert.equal(carbonfox['--meter_fg_nom'], undefined,
    'Rosé Pine meter color exists only in a reference comment');
  assert.equal(carbonfox['--success'], undefined,
    'neon fallback was not authored as a Carbonfox override');
  const literal = '@OBSThemeVars {\n  /* --primary: #ff0000; */\n  --primary: #00ff00;\n  /*\n  --success: #123456;\n  */\n}';
  assert.deepEqual(parseOVT(literal).vars, { '--primary': '#00ff00' });
  // Verify the whole real catalog against an independent comment-stripped
  // line parser, not a second call to parseOVT with pre-stripped text.
  for (const file of files.filter(name => name.endsWith('.ovt'))) {
    const source = read('themes/' + file);
    const varsBlock = source.match(/@OBSThemeVars\s*\{([\s\S]*?)\}/)?.[1] || '';
    const actual = varsBlock.replace(/\/\*[\s\S]*?\*\//g, '');
    const active = new Set([...actual.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(x => x[1]));
    const observed = Object.keys(parseOVT(source).vars);
    assert.deepEqual(observed.sort(), [...active].sort(), file + ': parser included comment-only declarations');
  }
});

test('web importer and serializer expose browser-safe values while preserving OBS-compatible disk syntax', () => {
  const input = "@OBSThemeVars {\n    --cw_icon_eye_base: 'url(theme:icons/colorway/mingcute/normal/eye.svg)';\n    --accent_bg_start: 'rgba(1, 2, 3, 0.3)';\n}";
  const vars = parseOVT(input).vars;
  assert.equal(vars['--cw_icon_eye_base'], 'url(theme:icons/colorway/mingcute/normal/eye.svg)');
  assert.equal(vars['--accent_bg_start'], 'rgba(1, 2, 3, 0.3)');
  assert.equal(browserThemeAssetValue(vars['--cw_icon_eye_base']),
    'url("/icons/colorway/mingcute/normal/eye.svg")');
  const generated = serializeOVT({
    id: 'com.example.test', name: 'Test', dark: false,
    tokens: {
      '--cw_icon_eye_base': vars['--cw_icon_eye_base'],
      '--accent_bg_start': vars['--accent_bg_start'],
      '--primary': '#123456',
      '--on_primary': 'var(--text)',
    },
  });
  assert.match(generated, /--cw_icon_eye_base: 'url\(theme:icons\/colorway\/mingcute\/normal\/eye\.svg\)';/);
  assert.match(generated, /--accent_bg_start: 'rgba\(1, 2, 3, 0\.3\)';/);
  assert.equal(parseOVT(generated).vars['--cw_icon_eye_base'], vars['--cw_icon_eye_base']);
});

test('OBS base does not leak unrelated widget selectors into item-view background or menu indicators', () => {
  const qss = read('themes/Colorway.obt').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(qss, /QCheckBox\s*,\s*QGroupBox\s*,\s*QMenuBar\s*,\s*QAbstractItemView/);
  assert.doesNotMatch(qss, /QListWidget\s*,\s*SceneTree\s*,\s*QMenu::indicator/);
  assert.match(qss, /QAbstractItemView\s*\{\s*background-color:/);
  assert.match(qss, /QMenu::indicator\s*\{\s*left:/);
});

test('OBS base source icon roles distinguish slideshow and media from monitor output', () => {
  const qss = read('themes/Colorway.obt');
  assert.match(qss, /qproperty-slideshowIcon:\s*var\(--cw_icon_slideshow_base\)/);
  assert.match(qss, /qproperty-mediaIcon:\s*var\(--cw_icon_media_play_base\)/);
});

test('installed libobs lexer accepts all distributed function strings', { timeout: 25000 }, (t) => {
  const flags = spawnSync('pkg-config', ['--cflags', '--libs', 'libobs'], { encoding: 'utf8' });
  const compiler = spawnSync('cc', ['--version'], { encoding: 'utf8' });
  if (flags.status !== 0 || compiler.status !== 0) {
    t.diagnostic('libobs development headers unavailable; source-level contract still required');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'colorway-libobs-'));
  try {
    const target = join(dir, 'audit');
    const build = spawnSync('cc', [
      join(root, 'test/helpers/obs-theme-lexer.c'), '-o', target,
      ...flags.stdout.trim().split(/\s+/),
    ], { encoding: 'utf8' });
    assert.equal(build.status, 0, build.stderr);
    for (const file of files) {
      const run = spawnSync(target, [], { input: read('themes/' + file), encoding: 'utf8' });
      assert.equal(run.status, 0, file + ': ' + run.stdout + run.stderr);
    }
    const broken = spawnSync(target, [], { input: '@OBSThemeVars { --bad: url(theme:icons/a.svg); }', encoding: 'utf8' });
    assert.equal(broken.status, 2, 'real lexer must distinguish broken from quoted declarations');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('OBS base has no inert empty QSS rules', () => {
  const stripped = read('themes/Colorway.obt')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@OBSTheme(?:Vars|Meta)\s*\{[\s\S]*?\}/g, '');
  const emptyRules = [...stripped.matchAll(/([^{}]+)\{\s*\}/g)].map((match) => match[1].trim());
  assert.deepEqual(emptyRules, []);
});
