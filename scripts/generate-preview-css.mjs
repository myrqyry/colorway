import postcss from 'postcss';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Only map selectors we own and understand. Do not translate arbitrary QSS,
// QObject selectors, or custom-painted OBS widgets into fictitious CSS.
const mapping = new Map();
const map = (qt, web) => mapping.set(qt, web);
const field = ['.demo-input', '.obs-sim-window input.obs-sim-number', '.obs-sim-window input.obs-sim-input'];
const combo = ['.demo-select', '.obs-sim-select'];
const button = '.demo-button:not(.primary):not(.recording)';
for (const state of ['', ':focus', ':hover']) {
  map('QLineEdit' + state, field.map(s => s + state));
  map('QComboBox' + state, combo.map(s => s + state));
}
for (const [qt, css] of [['',''],[':focus',':focus-visible'],[':hover',':hover'],[':pressed',':active'],[':disabled',':disabled']])
  map('QPushButton' + qt, [button + css]);
for (const [qt, css] of [['QCheckBox','.demo-check input'],['QRadioButton','.demo-radio input']]) {
  for (const [state, suffix] of [
    ['', ''], [':hover', ':hover'], [':unchecked', ':not(:checked)'],
    [':unchecked:hover', ':not(:checked):hover'], [':checked', ':checked'],
    [':checked:hover', ':checked:hover'], [':disabled', ':disabled'],
    [':unchecked:disabled', ':not(:checked):disabled'], [':checked:disabled', ':checked:disabled'],
  ]) map(qt + '::indicator' + state, [css + suffix]);
}
map('QListWidget::item:selected', ['.demo-list-item.selected']);
map('QListWidget::item:hover:!selected', ['.demo-list-item:not(.selected):hover']);
map('QTabBar::tab', ['.demo-tab']);
map('QTabBar::tab:selected', ['.demo-tab.active']);
map('QTabBar::tab:hover:!selected', ['.demo-tab:not(.active):hover']);
map('QTabBar::tab:pressed', ['.demo-tab:active']);
map('QProgressBar', ['.demo-progress']);
map('QProgressBar::chunk', ['.demo-progress-fill']);
for (const state of ['', ':hover', ':pressed', ':disabled']) {
  const suffix = state === ':pressed' ? ':active' : state;
  const selectors = [];
  // Engine-specific pseudo selectors must be emitted separately: an unknown
  // pseudo invalidates an entire comma-separated CSS selector list.
  for (const engine of ['::-webkit-slider-thumb', '::-moz-range-thumb'])
    selectors.push('.demo-slider' + suffix + engine);
  map('QSlider::handle:horizontal' + state, selectors);
}
map('QSlider::handle:disabled', ['.demo-slider:disabled::-webkit-slider-thumb', '.demo-slider:disabled::-moz-range-thumb']);

const supported = new Set([
  'background', 'background-color', 'color', 'border', 'border-color',
  'border-width', 'border-radius', 'border-bottom', 'font-weight',
]);

function translate(prop, value, qt) {
  if (prop === 'image' && qt.includes('::indicator')) {
    if (value === 'none' || /^var\(--[\w-]+\)$/.test(value))
      return ['background-image', value];
    throw Error('Unsupported indicator image: ' + value);
  }
  if (!supported.has(prop)) return null;
  if (prop === 'background' && qt.includes('::indicator')) return ['background-color', value];
  if (/qradialgradient\(/.test(value)) {
    // The exact Qt coordinate model is not CSS. Keep a deliberately bounded
    // visual approximation only for the existing standard button showcase.
    const m = value.match(/^qradialgradient\(\s*cx:0\.5,\s*cy:0\.5,\s*radius:\s*0\.9,\s*fx:0\.5,\s*fy:0\.5,\s*stop:0\s+(var\(--[\w-]+\)),\s*stop:0\.5\s+(var\(--[\w-]+\)),\s*stop:1\s+(var\(--[\w-]+\))\s*\)$/s);
    if (!m) throw Error('Unsupported radial gradient in ' + qt + ': ' + value);
    return [prop, `radial-gradient(ellipse at center, ${m[1]} 0%, ${m[2]} 50%, ${m[3]} 100%)`];
  }
  if (/q(?:linear|conical)gradient\(/.test(value)) throw Error('Unsupported gradient in ' + qt);
  return [prop, value];
}

export function compilePreviewCSS(source) {
  const qss = postcss.parse(source.replace(/@OBSTheme(?:Meta|Vars)\s*\{[^}]*\}/gs, ''));
  const rules = [];
  const seen = new Set();
  qss.walkRules(rule => {
    for (const qt of rule.selectors) {
      const targets = mapping.get(qt);
      if (!targets) continue;
      seen.add(qt);
      const declarations = [];
      rule.walkDecls(d => {
        const result = translate(d.prop, d.value, qt);
        if (result) declarations.push(result.join(': ') + ';');
      });
      if (declarations.length)
        for (const target of targets) rules.push(target + ' { ' + declarations.join(' ') + ' }');
    }
  });
  // Missing state selectors may be intentional; fail closed on missing
  // core selectors rather than silently shipping an empty projection.
  for (const qt of ['QLineEdit','QComboBox','QPushButton','QCheckBox::indicator',
      'QRadioButton::indicator','QSlider::handle:horizontal','QListWidget::item:selected',
      'QTabBar::tab','QProgressBar::chunk'])
    if (!seen.has(qt)) throw Error('Missing QSS anchor: ' + qt);
  const css = [
    '/* Generated from themes/Colorway.obt by scripts/generate-preview-css.mjs. Do not edit. */',
    // Existing browser-only glyphs would otherwise obscure the Qt-authored
    // checkbox SVG and solid radio indicator.
    '.demo-check input, .demo-radio input { opacity: 1; background-repeat: no-repeat; background-position: center; background-size: contain; }',
    '.demo-check input::after, .demo-radio input::after { display: none; }',
    ...rules,
    // QSS background shorthand can reset background-image sizing/position.
    '.demo-check input, .demo-radio input { background-repeat: no-repeat; background-position: center; background-size: contain; }',
    '',
  ].join('\n');
  // Imported/Lospec palettes can lack the base's full QSS token vocabulary.
  // Preserve their previous preview path rather than rendering missing vars.
  const scoped = postcss.parse(css);
  scoped.walkRules(rule => {
    rule.selectors = rule.selectors.map(s => ':where(:root[data-colorway-catalog]) ' + s);
  });
  return scoped.toString();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = readFileSync(new URL('../themes/Colorway.obt', import.meta.url), 'utf8');
  writeFileSync(new URL('../src/qt-preview.generated.css', import.meta.url), compilePreviewCSS(source));
}
