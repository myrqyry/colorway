const REPO_RAW = 'https://raw.githubusercontent.com/myrqyry/colorway/main/';

const cache = new Map();

export const PALETTE_VARS = [
  ['--primary', 'Primary'],
  ['--primary_light', 'Primary light'],
  ['--primary_lighter', 'Primary lighter'],
  ['--primary_dark', 'Primary dark'],
  ['--primary_darker', 'Primary darker'],
  ['--bg_window', 'Window'],
  ['--bg_base', 'Base'],
  ['--bg_preview', 'UI'],
  ['--bg_dock', 'Dock'],
  ['--input_bg', 'Input'],
  ['--border_color', 'Border'],
  ['--text', 'Text'],
  ['--text_muted', 'Muted'],
  ['--text_disabled', 'Disabled'],
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

  const response = await fetch(`${REPO_RAW}${file}`);
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
