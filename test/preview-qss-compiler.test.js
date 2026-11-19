import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { compilePreviewCSS } from '../scripts/generate-preview-css.mjs';

const base = readFileSync(new URL('../themes/Colorway.obt', import.meta.url), 'utf8');
const declarations = (source, selector) => {
  const values = {};
  postcss.parse(source).walkRules(rule => {
    if (rule.selectors.includes(':where(:root[data-colorway-catalog]) ' + selector)) rule.walkDecls(d => {values[d.prop] = d.value;});
  });
  return values;
};

test('mapped browser controls derive their state declarations from actual QSS', () => {
  const css = compilePreviewCSS(base);
  assert.equal(declarations(css, '.demo-check input:checked')['background-color'], 'var(--bg_base)');
  assert.equal(declarations(css, '.demo-check input:checked')['background-image'], 'var(--checkbox_check_icon)');
  assert.equal(declarations(css, '.demo-radio input:checked').border, '3px solid var(--bg_base)');
  assert.equal(declarations(css, '.demo-input:focus').color, 'var(--on_input_focus)');
  assert.equal(declarations(css, '.demo-list-item.selected').background, 'var(--primary)');
  assert.equal(declarations(css, '.demo-tab.active').background, 'var(--surface1)');
  assert.equal(declarations(css, '.demo-progress-fill').background, 'var(--primary)');
  assert.equal(declarations(css, '.demo-slider::-webkit-slider-thumb').background, 'var(--text_bright)');
  assert.doesNotMatch(css, /qproperty-|qradialgradient|@OBSTheme|::indicator/);
  postcss.parse(css).walkRules(rule => assert.ok(rule.selectors.every(s => s.startsWith(':where(:root[data-colorway-catalog]) '))));
  const changed = compilePreviewCSS(base.replace(/(QRadioButton::indicator:checked\s*\{\s*background:\s*)var\(--primary\)/, '$1#123456'));
  assert.equal(declarations(changed, '.demo-radio input:checked')['background-color'], '#123456');
});

test('checked-in browser projection matches the current base theme', () => {
  assert.equal(readFileSync(new URL('../src/qt-preview.generated.css', import.meta.url), 'utf8'), compilePreviewCSS(base));
});
