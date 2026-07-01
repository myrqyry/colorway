const LOCAL_THEMES = '/themes/';

const cache = new Map();

export const PALETTE_VARS = [
  ['--bg_window', 'Window'],
  ['--bg_base', 'Base'],
  ['--bg_preview', 'Preview'],
  ['--bg_dock', 'Dock'],
  ['--bg_hover', 'Hover'],
  ['--button_bg', 'Button'],
  ['--button_bg_hover', 'Button hover'],
  ['--button_bg_disabled', 'Button disabled'],
  ['--input_bg', 'Input'],
  ['--input_bg_hover', 'Input hover'],
  ['--input_bg_focus', 'Input focus'],
  ['--input_border', 'Input border'],
  ['--input_border_hover', 'Input border hover'],
  ['--list_item_bg_hover', 'List hover'],
  ['--primary', 'Primary'],
  ['--primary_light', 'Primary light'],
  ['--primary_lighter', 'Primary lighter'],
  ['--primary_dark', 'Primary dark'],
  ['--primary_darker', 'Primary darker'],
  ['--accent_bg_start', 'Accent start'],
  ['--accent_bg_end', 'Accent end'],
  ['--text', 'Text'],
  ['--text_light', 'Text light'],
  ['--text_muted', 'Muted'],
  ['--text_inactive', 'Inactive'],
  ['--text_inverse', 'Inverse'],
  ['--text_disabled', 'Disabled'],
  ['--border_color', 'Border'],
  ['--ico', 'Icon'],
  ['--ico_selected', 'Icon selected'],
  ['--warning', 'Warning'],
  ['--danger', 'Danger'],
];

export function parseOVT(text) {
  const vars = {};
  const nameMatch = text.match(/name:\s*'([^']+)'/);
  const darkMatch = text.match(/dark:\s*'([^']+)'/);

  if (nameMatch) vars._name = nameMatch[1];
  vars._dark = darkMatch ? darkMatch[1].toLowerCase() === 'true' : true;

  const blockMatch = text.match(/@OBSThemeVars\s*\{([\s\S]*?)\}/);
  if (!blockMatch) return vars;

  for (const line of blockMatch[1].split('\n')) {
    const match = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?);/);
    if (match) vars[match[1]] = match[2].trim();
  }

  return vars;
}

export async function loadTheme(file) {
  if (cache.has(file)) return cache.get(file);

  const response = await fetch(`${LOCAL_THEMES}${encodeURIComponent(file)}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${file}: HTTP ${response.status}`);
  }

  const theme = parseOVT(await response.text());
  cache.set(file, theme);
  return theme;
}

export function applyTheme(vars) {
  const root = document.documentElement;

  for (const [key, value] of Object.entries(vars)) {
    if (key.startsWith('--')) root.style.setProperty(key, value);
  }
}
