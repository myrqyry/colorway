import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8 } from 'fflate';
import { readFileSync } from 'node:fs';
import { THEMES } from '../src/theme-catalog.js';
import { parseOVT } from '../src/theme-loader.js';
import {
  resolveExportPalette, toOpenCodeTui, toOpenCodeDesktop,
  createNativeBuildKit, exportSlug,
} from '../src/theme-conversions.js';
const tokens = {
  _name: 'Rose Pine Moon — Love', _dark: true,
  '--primary': '#eb6f92', '--primary_light': '#ea9a97',
  '--bg_window': '#232136', '--bg_base': '#232136',
  '--bg_preview': '#2a273f', '--bg_dock': '#2a273f', '--bg_hover': '#393552',
  '--text': '#e0def4', '--text_muted': '#908caa', '--border_color': '#393552',
  '--danger': 'var(--primary)', '--warning': '#f6c177', '--success': '#37d247',
};

test('normalizes resolved Colorway tokens into self-contained opaque snapshot', () => {
  const p = resolveExportPalette(tokens);
  assert.equal(p.format, 'colorway-palette/v1');
  assert.equal(p.name, 'Rose Pine Moon — Love');
  assert.equal(p.dark, true);
  assert.equal(p.palette.primary, '#eb6f92');
  assert.equal(p.palette.danger, '#eb6f92');
  assert.equal(p.palette.bg_window, '#232136');
  assert.equal(p.palette.primary_light, '#ea9a97');
  assert.deepEqual(Object.keys(p.palette).includes('foo'), false);
});

test('all catalog Colorway palettes have convertible semantic colors', () => {
  const base = parseOVT(readFileSync(new URL('../themes/Colorway.obt', import.meta.url), 'utf8'));
  assert.equal(THEMES.length, 160);
  for (const entry of THEMES) {
    const variant = parseOVT(readFileSync(new URL('../themes/' + entry.file, import.meta.url), 'utf8'));
    const snapshot = resolveExportPalette({
      ...base.vars, ...variant.vars,
      _name: variant.meta._name, _dark: variant.meta._dark,
    });
    assert.match(snapshot.palette.primary, /^#[0-9a-f]{6}$/, entry.file);
    assert.equal(snapshot.dark, variant.meta._dark, entry.file);
  }
});

test('flattens alpha, catches invalid color and circular variable references', () => {
  const p = resolveExportPalette({...tokens, '--bg_hover': '#ffffffff'});
  assert.equal(p.palette.bg_hover, '#ffffff');
  assert.throws(() => resolveExportPalette({...tokens,'--primary':'var(--danger)'}), /Circular/);
  assert.throws(() => resolveExportPalette({...tokens,'--primary':'url(javascript:evil)'}), /Unsupported/);
  assert.throws(() => resolveExportPalette({...tokens,'--warning':undefined}), /Missing/);
});

test('OpenCode terminal theme uses supported TUI schema keys and resolved colors', () => {
  const json = toOpenCodeTui(resolveExportPalette(tokens));
  assert.equal(json.$schema, 'https://opencode.ai/theme.json');
  assert.equal(json.defs.primary, '#eb6f92');
  assert.equal(json.theme.background, 'bg');
  assert.equal(json.theme.text, 'fg');
  assert.equal(json.theme.diffAdded, 'success');
  assert.equal(json.theme.syntaxComment, 'muted');
  assert.equal(json.theme.primary, 'primary');
});

test('OpenCode TUI export covers all theme roles required by installed source', () => {
  const roles = [
    'primary','secondary','accent','error','warning','success','info',
    'text','textMuted','background','backgroundPanel','backgroundElement',
    'border','borderActive','borderSubtle',
    'diffAdded','diffRemoved','diffContext','diffHunkHeader',
    'diffHighlightAdded','diffHighlightRemoved','diffAddedBg','diffRemovedBg',
    'diffContextBg','diffLineNumber','diffAddedLineNumberBg','diffRemovedLineNumberBg',
    'markdownText','markdownHeading','markdownLink','markdownLinkText',
    'markdownCode','markdownBlockQuote','markdownEmph','markdownStrong',
    'markdownHorizontalRule','markdownListItem','markdownListEnumeration',
    'markdownImage','markdownImageText','markdownCodeBlock',
    'syntaxComment','syntaxKeyword','syntaxFunction','syntaxVariable',
    'syntaxString','syntaxNumber','syntaxType','syntaxOperator','syntaxPunctuation',
  ];
  const theme = toOpenCodeTui(resolveExportPalette(tokens));
  assert.deepEqual(roles.filter((role) => !theme.theme[role]), []);
  for (const role of roles) {
    const value = theme.theme[role];
    assert.ok(value.startsWith('#') || Object.hasOwn(theme.defs,value), role+' unresolved: '+value);
  }
});

test('OpenCode desktop theme has validated light+dark palette variants', () => {
  const json = toOpenCodeDesktop(resolveExportPalette(tokens));
  assert.equal(json.$schema, 'https://opencode.ai/desktop-theme.json');
  assert.match(json.id, /^[a-z0-9-]+$/);
  assert.equal(json.dark.palette.neutral, '#232136');
  assert.equal(json.dark.palette.ink, '#e0def4');
  for (const name of ['light','dark']) {
    assert.deepEqual(Object.keys(json[name]), ['palette']);
    for (const role of ['neutral','ink','primary','success','warning','error','info']) {
      assert.match(json[name].palette[role], /^#[a-f0-9]{6}$/);
    }
  }
  assert.notEqual(json.light.palette.neutral, json.dark.palette.neutral);
});

test('native build ZIP includes frozen palette, source, runnable recipe and no binary fake theme', () => {
  const palette = resolveExportPalette(tokens);
  for (const kind of ['orchis','bibata']) {
    const zip = unzipSync(createNativeBuildKit(kind, palette, 'original OBS theme'));
    assert.deepEqual(Object.keys(zip).sort(), ['README.md','build.sh','palette.json','source.ovt']);
    assert.deepEqual(JSON.parse(strFromU8(zip['palette.json'])), palette);
    assert.equal(strFromU8(zip['source.ovt']), 'original OBS theme');
    assert.match(strFromU8(zip['build.sh']), new RegExp('colorway-to-' + kind));
    assert.match(strFromU8(zip['build.sh']), /--palette-json/);
    assert.doesNotMatch(strFromU8(zip['build.sh']), /sudo|curl.*\|.*bash/);
    assert.match(strFromU8(zip['README.md']), /local build/i);
    assert.equal(zip['build.sh'].length > 40, true);
  }
  assert.throws(() => createNativeBuildKit('other', palette, ''), /Unsupported/);
  assert.equal(exportSlug('Rose Pine Moon — Love'), 'rose-pine-moon-love');
});
