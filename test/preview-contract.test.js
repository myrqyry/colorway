import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const themeLoader = readFileSync(new URL('../src/theme-loader.js', import.meta.url), 'utf8');

test('titlebar renders caption row separately from menubar', () => {
  assert.match(main, /class="obs-caption-row"/);
  assert.match(styles, /\.obs-titlebar\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(styles, /\.obs-caption-row\s*\{/);
  assert.doesNotMatch(styles, /\.obs-menubar\s*\{[^}]*flex:\s*1/s);
});

test('workspace has OBS-like left docks and right controls', () => {
  assert.match(main, /<aside class="left-panel">/);
  assert.match(main, /class="dock-panel transitions-dock"/);
  assert.match(main, /<aside class="right-panel">/);
  assert.match(styles, /grid-template-columns:\s*200px 1fr 260px/);
});

test('canvas overlays use theme-driven overlay background', () => {
  assert.match(styles, /--overlay-bg:/);
  assert.match(styles, /\.canvas-source\s*\{[^}]*background:\s*var\(--overlay-bg\)/s);
  assert.match(styles, /\.canvas-hud\s*\{[^}]*background:\s*var\(--overlay-bg\)/s);
  assert.match(styles, /\.canvas-palette\s*\{[^}]*background:\s*var\(--overlay-bg\)/s);
  assert.match(styles, /\.canvas-theme-info\s*\{[^}]*background:\s*var\(--overlay-bg\)/s);
});

test('live status uses success color and exposes it in palette', () => {
  assert.match(styles, /--success:\s*#/);
  assert.match(styles, /\.status-dot\.live\s*\{[^}]*background:\s*var\(--success/s);
  assert.match(themeLoader, /\['--success', 'Success'\]/);
});

test('refinements keep a visible frame and keyboard focus', () => {
  assert.match(styles, /\.canvas-palette\s*\{[^}]*width:\s*270px/s);
  assert.match(styles, /\.canvas-palette \.palette-group-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s);
  assert.match(styles, /\.theme-picker select:focus-visible,/);
  assert.match(styles, /\.dock-row\.selected\s*\{[^}]*box-shadow:/s);
});

test('mixer slider updates its filled range while dragged', () => {
  assert.match(main, /\.mixer-slider/);
  assert.match(main, /addEventListener\('input'/);
  assert.match(main, /--slider-pct/);
  assert.match(main, /slider\.value/);
});

test('status metrics refresh independently of theme changes', () => {
  assert.match(main, /setInterval\(updateStatusDemo,\s*2000\)/);
  assert.doesNotMatch(main, /applyTheme\(theme\);[\s\S]*?updateStatusDemo\(\);[\s\S]*?\} catch/);
});
