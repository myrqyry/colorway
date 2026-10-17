import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { parseOVT } from '../src/theme-loader.js';
import { LEGIBILITY_ROLES, legibleInk } from '../scripts/theme-state-tokens.mjs';

const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const vars = (file) => parseOVT(read('themes/' + file).replace(/\/\*[^]*?\*\//g, '')).vars;
const base = vars('Colorway.obt');
const toRGB = (hex) => [1, 3, 5].map((n) => Number.parseInt(hex.slice(n, n + 2), 16) / 255);
const luminance = (hex) => toRGB(hex).map((v) =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05)
  / (Math.min(luminance(a), luminance(b)) + 0.05);
const resolve = (map, key, seen = new Set()) => {
  assert.ok(!seen.has(key), 'cycle at ' + key);
  seen.add(key);
  const value = map[key];
  assert.ok(value, 'missing ' + key);
  const match = value.match(/^var\((--[\w]+)\)$/);
  return match ? resolve(map, match[1], seen) : value;
};

test('all base/variant derived legibility roles meet independent surface contrast checks', () => {
  let checked = 0;
  for (const file of ['Colorway.obt', ...readdirSync(new URL('themes/', root)).filter((x) => x.endsWith('.ovt'))]) {
    const map = { ...base, ...vars(file) };
    for (const [name, , backgrounds, minimum] of LEGIBILITY_ROLES) {
      const ink = resolve(map, name);
      assert.match(ink, /^#[0-9a-f]{6}$/i, file + ' ' + name);
      for (const background of backgrounds) {
        let surface = resolve(map, background);
        if (/^#[0-9a-f]{8}$/i.test(surface)) {
          const alpha = Number.parseInt(surface.slice(7), 16) / 255;
          const beneath = toRGB(resolve(map, '--bg_base'));
          const overlay = toRGB(surface);
          surface = '#' + overlay.map((v, i) => Math.round((v * alpha + beneath[i] * (1 - alpha)) * 255)
            .toString(16).padStart(2, '0')).join('');
        }
        assert.match(surface, /^#[0-9a-f]{6}$/i, file + ' ' + background);
        const score = contrast(ink, surface);
        assert.ok(score >= minimum - 0.0001,
          `${file} ${name} on ${background}: ${score.toFixed(2)}:1 < ${minimum}:1`);
        checked++;
      }
    }
  }
  assert.equal(checked, (1 + readdirSync(new URL('themes/', root)).filter((x) => x.endsWith('.ovt')).length)
    * LEGIBILITY_ROLES.reduce((sum, x) => sum + x[2].length, 0));
});

test('generated ink preserves a legible seed and corrects transparent foregrounds', () => {
  assert.equal(legibleInk('#eeeeee', ['#121212'], 4.5), '#eeeeee');
  const background = '#544e68';
  const fromAlpha = legibleInk('#e4e4e45e', [background], 4.5);
  assert.match(fromAlpha, /^#[0-9a-f]{6}$/i);
  assert.ok(contrast(fromAlpha, background) >= 4.5);
  const repaired = legibleInk(background, [background], 3);
  assert.ok(contrast(repaired, background) >= 3);
});

test('shared Colorway stylesheet consumes the surface-matched text and control tokens', () => {
  const qss = read('themes/Colorway.obt').replace(/\/\*[^]*?\*\//g, '');
  for (const [selector, token] of [
    ['OBSBasicSettings QListWidget::item', '--on_panel_muted'],
    ['OBSBasicSettings QGroupBox QCheckBox:disabled', '--on_panel_disabled'],
    ['OBSBasicSettings QGroupBox QCheckBox::indicator:unchecked', '--on_panel_outline'],
    ['OBSBasicSettings QGroupBox::title', '--on_section_heading'],
    ['QPushButton:disabled', '--on_button_disabled'],
    ['QPushButton', '--on_button'],
    ['QComboBox:focus', '--on_input_focus'],
  ]) {
    // Follow the first concrete selector declaration, excluding commented-out QSS.
    const body = [...qss.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .find((match) => match[1].split(',').some((s) => s.trim() === selector))?.[2];
    assert.ok(body, 'selector not found: ' + selector);
    assert.ok(body.includes('var(' + token + ')'), `${selector} must use ${token}`);
  }
});
