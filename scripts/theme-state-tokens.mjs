import { encodeObsFunctionValue } from '../src/theme-value-codec.js';

/* OBS cannot choose contrasting ink or recolor theme SVGs through CSS variables.
 * Bake the state choices at authoring time, leaving the palette itself intact. */
export const ICON_FILES = [
  'arrow-down.svg', 'arrow-up.svg', 'audio.svg', 'brush.svg', 'check.svg',
  'checkbox_fill.svg', 'checkbox_line.svg', 'chevron-down.svg', 'chevron-right.svg',
  'chevron-up.svg', 'close.svg', 'cogs.svg', 'default.svg', 'display.svg',
  'dots-vert.svg', 'eye-off.svg', 'eye.svg', 'filter.svg', 'gamepad.svg', 'globe.svg',
  'group.svg', 'image.svg', 'interact.svg', 'layout-horizontal.svg',
  'layout-vertical.svg', 'lock.svg', 'media-play.svg', 'media-stop.svg', 'microphone.svg',
  'minus.svg', 'output.svg', 'pause.svg', 'pin.svg', 'plus.svg', 'popout.svg',
  'refresh.svg', 'revert.svg', 'save.svg', 'scene.svg', 'settings.svg', 'slideshow.svg',
  'skip_forward.svg', 'skip_previous.svg', 'text.svg', 'trash.svg', 'unlock.svg',
  'video.svg', 'volume-high.svg', 'volume-mute.svg', 'window.svg', 'download.svg',
];

export const iconToken = (file, role = 'base') =>
  `--cw_icon_${file.replace(/\.svg$/, '').replace(/-/g, '_')}_${role}`;

export function resolveAlias(vars, key, seen = new Set()) {
  if (seen.has(key)) throw new Error(`cyclic state token: ${key}`);
  seen.add(key);
  const value = vars.get(key);
  if (!value) throw new Error(`missing state token input: ${key}`);
  const alias = value.match(/^var\((--\w+)\)$/);
  return alias ? resolveAlias(vars, alias[1], seen) : value;
}

export function contrast(a, b) {
  const luminance = (hex) => {
    if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error(`expected hex color: ${hex}`);
    const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

/* Palette colors remain the authored source values. These are derived ink roles
 * for concrete Qt surfaces: unlike a generic "muted" or "disabled" token, the
 * role includes the background it must actually be legible on. */
function mixHex(source, target, fraction) {
  const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const from = channels(source), to = channels(target);
  return '#' + from.map((n, i) => Math.round(n + (to[i] - n) * fraction)
    .toString(16).padStart(2, '0')).join('');
}

export function legibleInk(preferred, surfaces, minimum) {
  if (!/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(preferred)) throw new Error('invalid ink seed: ' + preferred);
  if (!Array.isArray(surfaces) || !surfaces.length) throw new Error('ink needs surfaces');
  // #RRGGBBAA is legal in curated palettes. Resolve translucent ink against
  // its actual surface before checking or improving contrast; treating it as
  // opaque would substantially overstate legibility.
  if (preferred.length === 9) {
    const alpha = parseInt(preferred.slice(7), 16) / 255;
    preferred = mixHex(surfaces[0], preferred.slice(0, 7), alpha);
  }
  const passes = (color) => surfaces.every((background) => contrast(color, background) >= minimum);
  if (passes(preferred)) return preferred;
  const candidates = ['#000000', '#ffffff'].flatMap((target) => {
    if (!passes(target)) return [];
    let lo = 0, hi = 1;
    for (let i = 0; i < 22; i++) {
      const t = (lo + hi) / 2;
      if (passes(mixHex(preferred, target, t))) hi = t;
      else lo = t;
    }
    return [{ color: mixHex(preferred, target, hi), amount: hi }];
  });
  if (!candidates.length) throw new Error('no shared accessible ink for ' + surfaces.join(','));
  candidates.sort((a, b) => a.amount - b.amount);
  return candidates[0].color;
}

export const LEGIBILITY_ROLES = [
  ['--on_panel', '--text', ['--bg_dock'], 4.5],
  ['--on_panel_muted', '--text_muted', ['--bg_dock'], 4.5],
  ['--on_base_muted', '--text_muted', ['--bg_base'], 4.5],
  ['--on_preview_muted', '--text_muted', ['--bg_preview'], 4.5],
  ['--on_preview', '--text_light', ['--bg_preview'], 4.5],
  ['--on_list_hover', '--text_light', ['--list_item_bg_hover'], 4.5],
  ['--on_hover', '--text_light', ['--bg_hover'], 4.5],
  ['--on_panel_disabled', '--text_disabled', ['--bg_dock'], 3],
  ['--on_base_disabled', '--text_disabled', ['--bg_base'], 3],
  ['--on_panel_outline', '--border_color', ['--bg_dock'], 3],
  ['--on_section_heading', '--primary', ['--bg_window'], 4.5],
  ['--on_panel_accent', '--primary', ['--bg_dock'], 4.5],
  ['--on_button', '--text', ['--button_bg'], 4.5],
  ['--on_button_disabled', '--text_disabled', ['--button_bg_disabled'], 3],
  ['--on_input', '--text', ['--input_bg'], 4.5],
  ['--on_input_hover', '--text', ['--input_bg_hover'], 4.5],
  ['--on_input_focus', '--text', ['--input_bg_focus'], 4.5],
  ['--on_nav_hover', '--text_light', ['--bg_preview'], 4.5],
];

export function flattenSurface(vars, key) {
  const color = resolveAlias(vars, key);
  if (!/^#[\da-f]{8}$/i.test(color)) return color;
  // A translucent list hover overlays the list's base background; do not
  // pretend the RGBA token's RGB channels are an opaque visible surface.
  const under = resolveAlias(vars, '--bg_base');
  return mixHex(under, color.slice(0, 7), parseInt(color.slice(7), 16) / 255);
}

export function stateTokens(vars) {
  const tokens = new Map();
  for (const [name, foreground, backgrounds, minimum] of LEGIBILITY_ROLES) {
    tokens.set(name, legibleInk(resolveAlias(vars, foreground),
      backgrounds.map((key) => flattenSurface(vars, key)), minimum));
  }
  for (const [role, background] of [
    ['primary', '--primary'], ['primary_hover', '--primary_light'],
    ['primary_dark', '--primary_dark'], ['base', '--bg_base'],
  ]) {
    const bg = resolveAlias(vars, background);
    const preferred = role === 'base' ? ['--text'] : ['--text_inverse', '--text', '--bg_base'];
    const ink = preferred.map((key) => [key, resolveAlias(vars, key)])
      .find(([, color]) => contrast(color, bg) >= 4.5);
    tokens.set(`--on_${role}`, ink ? `var(${ink[0]})`
      : contrast('#000000', bg) >= contrast('#ffffff', bg) ? '#000000' : '#ffffff');
    // A glyph that contrasts with a button can still be the *opposite*
    // color from its label (Fairyfloss, Twitch Dark, Vercel). Prefer the
    // polarity closest to the actual foreground when it remains readable;
    // fall back to maximal surface contrast only when necessary.
    const foreground = tokens.get(`--on_${role}`);
    const visibleInk = foreground.startsWith('var(')
      ? resolveAlias(vars, foreground.slice(4, -1)) : foreground;
    const candidates = [
      ['normal', '#e0def4'],
      ['selected', '#191724'],
    ];
    const matching = candidates
      .filter(([, color]) => contrast(color, bg) >= 3)
      .sort((a, b) => contrast(a[1], visibleInk) - contrast(b[1], visibleInk));
    const polarity = matching.length ? matching[0][0]
      : candidates.sort((a, b) => contrast(b[1], bg) - contrast(a[1], bg))[0][0];
    if (role === 'primary_dark') continue;
    // State glyphs use existing fixed-color assets; no SVG currentColor assumption.
    for (const file of ICON_FILES) {
      tokens.set(iconToken(file, role), `url(theme:icons/colorway/mingcute/${polarity}/${file})`);
    }
  }
  return tokens;
}

export function renderStateOverrides(vars, baseVars = null) {
  const defaults = baseVars ? stateTokens(baseVars) : new Map();
  const lines = [...stateTokens(vars)]
    .filter(([key, value]) => defaults.get(key) !== value)
    .map(([key, value]) => `    ${key}: ${encodeObsFunctionValue(value)};`);
  return lines.length ? [
    '    /* colorway:state-tokens:start — generated by pnpm sync:themes */',
    ...lines,
    '    /* colorway:state-tokens:end */',
  ].join('\n') : '';
}

export function injectStateOverrides(text, block) {
  const clean = text.replace(/\n\s*\/\* colorway:state-tokens:start[^]*?\/\* colorway:state-tokens:end \*\/\n?/g, '\n');
  const match = clean.match(/@OBSThemeVars\s*\{[^]*?\n\}/);
  if (!match) throw new Error('theme vars block missing for state tokens');
  if (!block) return clean;
  const end = match.index + match[0].length - 2;
  return clean.slice(0, end).replace(/\n+$/, '') + '\n\n' + block + '\n' + clean.slice(end);
}

export function normalizeBaseIcons(text) {
  // Normalize the legacy literal icon rules once; generated token definitions are
  // excluded so a second sync cannot turn their URLs into self-referencing aliases.
  const clean = text.replace(/\n\s*\/\* colorway:state-tokens:start[^]*?\/\* colorway:state-tokens:end \*\/\n?/g, '\n');
  return clean.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selectors, body) => {
    if (!/qproperty-icon:|image:/.test(body) || /@OBSTheme/.test(selectors)) return rule;
    const kept = selectors.split(',').filter((selector) =>
      !/::item:selected:hover\s+|SourceTreeItem:selected:hover\s+|QMenu::item:selected:hover\s+/.test(selector));
    return kept.some((selector) => selector.trim()) ? kept.join(',') + '{' + body + '}' : '';
  }).replace(/url\(theme:icons\/colorway\/mingcute\/normal\/([\w-]+)\.svg\)/g,
    (_, file) => `var(${iconToken(file + '.svg')})`);
}

export function renderButtonIconRules(base) {
  const uncommented = base.replace(/\/\*[^]*?\*\//g, '');
  const bindings = [...uncommented.matchAll(/([^{}]+)\{\s*qproperty-icon:\s*var\(--cw_icon_(\w+)_base\);\s*\}/g)]
    .flatMap(([, selectors, name]) => selectors.trim().split(',').map((selector) => [selector.trim(), name]))
    .filter(([selector]) => /^\.icon-[\w-]+$|^\*\[themeID="\w+"\]$/.test(selector));
  bindings.push(['.btn-create-new', 'plus']);
  for (const [id, name] of Object.entries({ addIconSmall: 'plus', removeIconSmall: 'minus',
    upArrowIconSmall: 'chevron_up', downArrowIconSmall: 'chevron_down', refreshIconSmall: 'refresh' })) {
    bindings.push([`*[themeID="${id}"]`, name]);
  }
  const rules = [];
  for (const [selector, name] of bindings) {
    const button = selector.startsWith('*') ? selector.replace('*', 'QPushButton') : `QPushButton${selector}`;
    const tool = selector.startsWith('*') ? selector.replace('*', 'QToolButton') : `QToolButton${selector}`;
    rules.push(
      `${button}, ${button}:hover { background: var(--bg_base); color: var(--text); icon: var(--cw_icon_${name}_base); }`,
      `${button}:checked, ${button}:pressed { background: var(--primary); color: var(--on_primary); icon: var(--cw_icon_${name}_primary); }`,
      `${button}:checked:hover:!pressed { background: var(--primary_light); color: var(--on_primary_hover); icon: var(--cw_icon_${name}_primary_hover); }`,
      `${button}:disabled { background: var(--button_bg_disabled); color: var(--on_button_disabled); }`,
      `${tool}, ${tool}:hover, ${tool}:checked, ${tool}:pressed { background: var(--bg_base); color: var(--text); }`,
      `${tool}:checked, ${tool}:pressed { border-color: var(--primary); }`,
    );
  }
  // OBS 32.2 Qt applies the effective Settings window backdrop only when
  // its concrete class rule is the final QSS declaration. Earlier placements
  // leave QPalette::Window black in light variants despite resolved tokens.
  // Keep this footer inside the generated region so theme sync always leaves
  // it after all icon selectors. Child pages still paint their SVG patterns.
  return '/* colorway:button-icons:start — generated render-time QPushButton icons */\n'
    + rules.join('\n')
    + '\n/* Native Settings window backdrop — order matters in Qt */\n'
    + 'OBSBasicSettings { background-color: var(--bg_window); background-image: var(--pattern_eyes); }\n'
    + '/* colorway:button-icons:end */\n';
}

export function injectButtonIconRules(base) {
  const clean = base.replace(/\n?\/\* colorway:button-icons:start[^]*?\/\* colorway:button-icons:end \*\/\n?/g, '');
  return clean.trimEnd() + '\n\n' + renderButtonIconRules(clean);
}
