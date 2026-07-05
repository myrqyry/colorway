const LOCAL_THEMES = '/themes/';

const cache = new Map();

const PALETTE_GROUPS = [
  {
    label: 'Backgrounds',
    vars: [
      ['--bg_window', 'Window'],
      ['--bg_base', 'Base'],
      ['--bg_preview', 'Preview'],
      ['--bg_dock', 'Dock'],
      ['--bg_hover', 'Hover'],
    ],
  },
  {
    label: 'Text',
    vars: [
      ['--text', 'Text'],
      ['--text_light', 'Text light'],
      ['--text_muted', 'Muted'],
      ['--text_inactive', 'Inactive'],
      ['--text_inverse', 'Inverse'],
      ['--text_disabled', 'Disabled'],
    ],
  },
  {
    label: 'Accent / Primary',
    vars: [
      ['--primary', 'Primary'],
      ['--primary_light', 'Light'],
      ['--primary_lighter', 'Lighter'],
      ['--primary_dark', 'Dark'],
      ['--primary_darker', 'Darker'],
    ],
  },
  {
    label: 'Inputs & Borders',
    vars: [
      ['--input_bg', 'Input bg'],
      ['--input_bg_hover', 'Input bg hover'],
      ['--input_bg_focus', 'Input bg focus'],
      ['--input_border', 'Input border'],
      ['--input_border_hover', 'Border hover'],
    ],
  },
  {
    label: 'Buttons & Lists',
    vars: [
      ['--button_bg', 'Button bg'],
      ['--button_bg_hover', 'Button hover'],
      ['--button_bg_disabled', 'Button disabled'],
      ['--list_item_bg_hover', 'List hover'],
      ['--list_item_bg_selected', 'List selected'],
    ],
  },
  {
    label: 'UI Elements',
    vars: [
      ['--border_color', 'Border'],
      ['--ico', 'Icon'],
      ['--ico_selected', 'Icon selected'],
      ['--accent_bg_start', 'Accent start'],
      ['--accent_bg_end', 'Accent end'],
      ['--warning', 'Warning'],
      ['--danger', 'Danger'],
      ['--success', 'Success'],
      ['--meter_bg_nom', 'Meter bg norm'],
      ['--meter_bg_war', 'Meter bg warn'],
      ['--meter_bg_err', 'Meter bg error'],
      ['--meter_fg_nom', 'Meter fg norm'],
      ['--meter_fg_war', 'Meter fg warn'],
      ['--meter_fg_err', 'Meter fg error'],
    ],
  },
];

export const PALETTE_VARS = PALETTE_GROUPS.flatMap((g) => g.vars);
export { PALETTE_GROUPS };

export function parseOVT(text) {
  const meta = {};
  const vars = {};

  const nameMatch = text.match(/name:\s*'([^']+)'/);
  const darkMatch = text.match(/dark:\s*'([^']+)'/);
  const extendsMatch = text.match(/extends:\s*'([^']+)'/);

  if (nameMatch) meta._name = nameMatch[1];
  meta._dark = darkMatch ? darkMatch[1].toLowerCase() === 'true' : true;
  if (extendsMatch) meta._extends = extendsMatch[1];

  const blockMatch = text.match(/@OBSThemeVars\s*\{([\s\S]*?)\}/);
  if (blockMatch) {
    for (const line of blockMatch[1].split('\n')) {
      const match = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?);/);
      if (match) vars[match[1]] = match[2].trim();
    }
  }

  return { meta, vars };
}

async function loadRaw(file) {
  if (cache.has(file)) return cache.get(file);

  const response = await fetch(`${LOCAL_THEMES}${encodeURIComponent(file)}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${file}: HTTP ${response.status}`);
  }

  const parsed = parseOVT(await response.text());
  cache.set(file, parsed);
  return parsed;
}

async function resolveTheme(file) {
  const parsed = await loadRaw(file);

  if (parsed.meta._extends) {
    const baseId = parsed.meta._extends;
    const parentFile = file.endsWith('.ovt')
      ? findThemeFile(baseId)
      : null;

    if (parentFile) {
      const parentParsed = await resolveTheme(parentFile);
      return { ...parentParsed, ...parsed.vars, _name: parsed.meta._name, _dark: parsed.meta._dark };
    }
  }

  return { ...parsed.vars, _name: parsed.meta._name, _dark: parsed.meta._dark };
}

function findThemeFile(baseId) {
  if (baseId === 'com.myrqyry.Colorway' || baseId.endsWith('.Colorway')) {
    return 'Colorway.obt';
  }
  return 'Colorway.obt';
}

export async function loadTheme(file) {
  const cachedKey = `resolved:${file}`;
  if (cache.has(cachedKey)) return cache.get(cachedKey);

  const vars = await resolveTheme(file);
  cache.set(cachedKey, vars);
  return vars;
}

let _appliedVars = new Set();

export function applyTheme(vars) {
  const root = document.documentElement;

  for (const key of _appliedVars) {
    root.style.removeProperty(key);
  }
  _appliedVars = new Set();

  for (const [key, value] of Object.entries(vars)) {
    if (key.startsWith('--')) {
      root.style.setProperty(key, value);
      _appliedVars.add(key);
    }
  }
}
