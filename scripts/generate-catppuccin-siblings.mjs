import { renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildPaletteComment } from './theme-palette-comments.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const themesDir = path.join(repoRoot, 'themes');

export const neutralLC = {
  "text": [
    0.879,
    0.03
  ],
  "subtext1": [
    0.817,
    0.029
  ],
  "subtext0": [
    0.751,
    0.028
  ],
  "overlay2": [
    0.687,
    0.026
  ],
  "overlay1": [
    0.618,
    0.026
  ],
  "overlay0": [
    0.55,
    0.024
  ],
  "surface2": [
    0.477,
    0.024
  ],
  "surface1": [
    0.404,
    0.022
  ],
  "surface0": [
    0.324,
    0.024
  ],
  "base": [
    0.243,
    0.03
  ],
  "mantle": [
    0.216,
    0.025
  ],
  "crust": [
    0.183,
    0.02
  ]
};
export const accentLC = {
  "rosewater": [
    0.923,
    0.024
  ],
  "flamingo": [
    0.88,
    0.042
  ],
  "pink": [
    0.87,
    0.075
  ],
  "mauve": [
    0.787,
    0.119
  ],
  "red": [
    0.756,
    0.13
  ],
  "maroon": [
    0.782,
    0.09
  ],
  "peach": [
    0.824,
    0.101
  ],
  "yellow": [
    0.919,
    0.07
  ],
  "green": [
    0.858,
    0.109
  ],
  "teal": [
    0.858,
    0.079
  ],
  "sky": [
    0.847,
    0.083
  ],
  "sapphire": [
    0.791,
    0.096
  ],
  "blue": [
    0.766,
    0.111
  ],
  "lavender": [
    0.817,
    0.091
  ]
};
export const families = {
  "affogato": {
    "name": "Affogato",
    "description": "warm espresso / cocoa",
    "neutral_hue": 55,
    "neutral_chroma_scale": 1,
    "accent_chroma_scale": 0.88,
    "accent_hues": {
      "rosewater": 48,
      "flamingo": 28,
      "pink": 350,
      "mauve": 322,
      "red": 15,
      "maroon": 25,
      "peach": 55,
      "yellow": 82,
      "green": 132,
      "teal": 170,
      "sky": 195,
      "sapphire": 220,
      "blue": 244,
      "lavender": 286
    }
  },
  "garnet": {
    "name": "Garnet",
    "description": "burgundy / wine-dark crimson",
    "neutral_hue": 12,
    "neutral_chroma_scale": 0.88,
    "accent_chroma_scale": 0.83,
    "accent_hues": {
      "rosewater": 28,
      "flamingo": 8,
      "pink": 344,
      "mauve": 314,
      "red": 18,
      "maroon": 2,
      "peach": 42,
      "yellow": 76,
      "green": 132,
      "teal": 172,
      "sky": 202,
      "sapphire": 226,
      "blue": 250,
      "lavender": 288
    }
  },
  "lichen": {
    "name": "Lichen",
    "description": "olive-laced stone / muted yellow-green",
    "neutral_hue": 108,
    "neutral_chroma_scale": 0.62,
    "accent_chroma_scale": 0.76,
    "accent_hues": {
      "rosewater": 45,
      "flamingo": 22,
      "pink": 342,
      "mauve": 303,
      "red": 12,
      "maroon": 26,
      "peach": 56,
      "yellow": 88,
      "green": 123,
      "teal": 162,
      "sky": 188,
      "sapphire": 214,
      "blue": 238,
      "lavender": 278
    }
  },
  "matcha": {
    "name": "Matcha",
    "description": "deep moss / botanical green",
    "neutral_hue": 138,
    "neutral_chroma_scale": 0.95,
    "accent_chroma_scale": 0.82,
    "accent_hues": {
      "rosewater": 42,
      "flamingo": 25,
      "pink": 342,
      "mauve": 305,
      "red": 12,
      "maroon": 26,
      "peach": 58,
      "yellow": 96,
      "green": 137,
      "teal": 165,
      "sky": 188,
      "sapphire": 210,
      "blue": 235,
      "lavender": 278
    }
  },
  "petal": {
    "name": "Petal",
    "description": "dusty rose / soft mauve-brown",
    "neutral_hue": 8,
    "neutral_chroma_scale": 0.68,
    "accent_chroma_scale": 0.74,
    "accent_hues": {
      "rosewater": 24,
      "flamingo": 6,
      "pink": 336,
      "mauve": 306,
      "red": 12,
      "maroon": 356,
      "peach": 40,
      "yellow": 74,
      "green": 130,
      "teal": 170,
      "sky": 198,
      "sapphire": 224,
      "blue": 248,
      "lavender": 286
    }
  },
  "sesame": {
    "name": "Sesame",
    "description": "warm charcoal / near-neutral",
    "neutral_hue": 72,
    "neutral_chroma_scale": 0.32,
    "accent_chroma_scale": 0.7,
    "accent_hues": {
      "rosewater": 38,
      "flamingo": 18,
      "pink": 338,
      "mauve": 305,
      "red": 10,
      "maroon": 20,
      "peach": 52,
      "yellow": 85,
      "green": 135,
      "teal": 174,
      "sky": 202,
      "sapphire": 226,
      "blue": 252,
      "lavender": 288
    }
  },
  "terracotta": {
    "name": "Terracotta",
    "description": "baked clay / earthen red-brown",
    "neutral_hue": 32,
    "neutral_chroma_scale": 1.08,
    "accent_chroma_scale": 0.86,
    "accent_hues": {
      "rosewater": 40,
      "flamingo": 18,
      "pink": 350,
      "mauve": 320,
      "red": 20,
      "maroon": 14,
      "peach": 44,
      "yellow": 72,
      "green": 125,
      "teal": 170,
      "sky": 198,
      "sapphire": 222,
      "blue": 245,
      "lavender": 286
    }
  },
  "ube": {
    "name": "Ube",
    "description": "mulberry / red-plum",
    "neutral_hue": 330,
    "neutral_chroma_scale": 0.95,
    "accent_chroma_scale": 0.86,
    "accent_hues": {
      "rosewater": 22,
      "flamingo": 355,
      "pink": 328,
      "mauve": 302,
      "red": 8,
      "maroon": 350,
      "peach": 46,
      "yellow": 78,
      "green": 132,
      "teal": 172,
      "sky": 202,
      "sapphire": 226,
      "blue": 252,
      "lavender": 286
    }
  }
};
const semanticMap = [
  [
    "--bg_window",
    "mantle"
  ],
  [
    "--bg_base",
    "base"
  ],
  [
    "--bg_preview",
    "crust"
  ],
  [
    "--bg_dock",
    "mantle"
  ],
  [
    "--bg_hover",
    "surface0"
  ],
  [
    "--text",
    "text"
  ],
  [
    "--text_light",
    "rosewater"
  ],
  [
    "--text_muted",
    "overlay1"
  ],
  [
    "--text_inactive",
    "subtext0"
  ],
  [
    "--text_inverse",
    "crust"
  ],
  [
    "--text_disabled",
    "subtext0"
  ],
  [
    "--primary",
    "mauve"
  ],
  [
    "--primary_light",
    "lavender"
  ],
  [
    "--primary_lighter",
    "pink"
  ],
  [
    "--primary_dark",
    "blue"
  ],
  [
    "--primary_darker",
    "surface2"
  ],
  [
    "--input_bg",
    "surface0"
  ],
  [
    "--input_bg_hover",
    "surface1"
  ],
  [
    "--input_bg_focus",
    "surface1"
  ],
  [
    "--input_border",
    "surface1"
  ],
  [
    "--input_border_hover",
    "mauve"
  ],
  [
    "--button_bg",
    "mantle"
  ],
  [
    "--button_bg_hover",
    "surface0"
  ],
  [
    "--button_hover_text",
    "text"
  ],
  [
    "--button_bg_disabled",
    "base"
  ],
  [
    "--list_item_bg_hover",
    "surface0"
  ],
  [
    "--list_item_bg_selected",
    "mauve"
  ],
  [
    "--border_color",
    "surface0"
  ],
  [
    "--warning",
    "yellow"
  ],
  [
    "--danger",
    "red"
  ],
  [
    "--success",
    "green"
  ],
  [
    "--meter_bg_nom",
    "surface0"
  ],
  [
    "--meter_bg_war",
    "surface0"
  ],
  [
    "--meter_bg_err",
    "surface0"
  ],
  [
    "--meter_fg_nom",
    "green"
  ],
  [
    "--meter_fg_war",
    "yellow"
  ],
  [
    "--meter_fg_err",
    "red"
  ]
];

function byteHex(value) {
  return Math.round(value).toString(16).padStart(2, '0');
}

function oklchToHex(L, C, h, context) {
  const radians = h * Math.PI / 180;
  const a = C * Math.cos(radians);
  const b = C * Math.sin(radians);
  const lPrime = L + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = L - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];

  const epsilon = 1e-9;
  if (linear.some((channel) => channel < -epsilon || channel > 1 + epsilon)) {
    throw new RangeError(
      `${context} is outside sRGB gamut: linear channels ${linear.map((channel) => channel.toFixed(6)).join(', ')}`,
    );
  }

  const bounded = linear.map((channel) => Math.max(0, Math.min(1, channel)));
  const srgb = bounded.map((channel) =>
    channel <= 0.0031308
      ? 12.92 * channel
      : 1.055 * (channel ** (1 / 2.4)) - 0.055,
  );

  return '#' + srgb.map((channel) => byteHex(channel * 255)).join('');
}

function toRgba(hex, alpha) {
  const rgb = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `rgba(${rgb.join(', ')}, ${alpha})`;
}

export function makePalette(config) {
  const palette = {};
  for (const [name, [L, C]] of Object.entries(neutralLC)) {
    palette[name] = oklchToHex(
      L,
      C * config.neutral_chroma_scale,
      config.neutral_hue,
      `${config.name} neutral ${name}`,
    );
  }
  for (const [name, [L, C]] of Object.entries(accentLC)) {
    palette[name] = oklchToHex(
      L,
      C * config.accent_chroma_scale,
      config.accent_hues[name],
      `${config.name} accent ${name}`,
    );
  }
  return palette;
}

export function resolvedPaletteVars(config) {
  const palette = makePalette(config);
  const resolved = new Map();

  for (const [token, seed] of semanticMap) {
    resolved.set(token, palette[seed]);
  }
  resolved.set('--ico', palette.text);
  resolved.set('--ico_selected', palette.crust);
  resolved.set('--accent_bg_start', toRgba(palette.mauve, '0.3'));
  resolved.set('--accent_bg_end', toRgba(palette.mauve, '0.1'));

  return { palette, resolved };
}

export function renderTheme(config) {
  const { palette, resolved } = resolvedPaletteVars(config);
  const themeName = `Catppuccin Sibling — ${config.name}`;
  const lines = [
    '@OBSThemeMeta {',
    `    name: '${themeName}';`,
    `    id: 'com.myrqyry.Colorway.CatppuccinSibling.${config.name}';`,
    "    extends: 'com.myrqyry.Colorway';",
    "    author: 'myrqyry';",
    "    dark: 'true';",
    '}',
    '',
    '/*',
    ' * Colorway-original Catppuccin-inspired sibling palette.',
    ' * Not an official Catppuccin flavor.',
    ` * Family: ${config.description}.`,
    ' */',
    '@OBSThemeVars {',
    buildPaletteComment(themeName, resolved),
    '',
    '    /* Full V2 sibling palette seed. */',
  ];

  for (const name of Object.keys(neutralLC)) {
    lines.push(`    --sibling_${name}: ${palette[name]};`);
  }
  lines.push('');
  for (const name of Object.keys(accentLC)) {
    lines.push(`    --sibling_${name}: ${palette[name]};`);
  }

  lines.push('', '    /* Colorway semantic roles. */');
  for (const [token, seed] of semanticMap) {
    lines.push(`    ${token}: var(--sibling_${seed});`);
  }
  lines.push(
    '    --ico: var(--text);',
    '    --ico_selected: var(--sibling_crust);',
    `    --accent_bg_start: ${toRgba(palette.mauve, '0.3')};`,
    `    --accent_bg_end: ${toRgba(palette.mauve, '0.1')};`,
    '}',
    '',
  );

  return lines.join('\n');
}

function generatedOutputs() {
  return Object.values(families).map((config) => ({
    file: `Colorway-CatppuccinSibling-${config.name}.ovt`,
    content: renderTheme(config),
  }));
}

function writeGeneratedThemes(outputs) {
  const staged = [];
  let currentFile = 'rendered payloads';

  try {
    for (const output of outputs) {
      currentFile = output.file;
      const target = path.join(themesDir, output.file);
      const temp = `${target}.tmp-${process.pid}`;
      writeFileSync(temp, output.content);
      staged.push({ target, temp, file: output.file });
    }

    for (const entry of staged) {
      currentFile = entry.file;
      renameSync(entry.temp, entry.target);
    }
    return true;
  } catch (error) {
    for (const entry of staged) {
      try {
        unlinkSync(entry.temp);
      } catch {
        // The temp may already have been renamed.
      }
    }
    console.error(`failed to generate Catppuccin sibling palettes while writing ${currentFile}`, error);
    process.exitCode = 1;
    return false;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    const outputs = generatedOutputs();
    if (writeGeneratedThemes(outputs)) {
      console.log(`generated ${outputs.length} Catppuccin-inspired sibling palettes`);
    }
  } catch (error) {
    console.error('failed to render Catppuccin sibling palettes', error);
    process.exitCode = 1;
  }
}
