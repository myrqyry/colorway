# Catppuccin-inspired sibling palettes V2

These eight palettes are original Colorway sibling palettes inspired by Catppuccin's role-based palette structure. They are **not official Catppuccin flavors**.

The goal is to move the neutral/base hue family itself—not merely swap the accent—while retaining a harmonious Catppuccin-like ladder of text, overlays, surfaces and named accents.

The checked-in source of truth is `scripts/generate-catppuccin-siblings.mjs`. Run:

```bash
pnpm generate:siblings
```

That regenerates the eight source themes from the recipe below, then runs the normal theme sync to inject resolved palette comments and refresh `public/themes/`.

## Shared OKLCH ladders

Neutral roles use these `[L, C]` pairs. **C is the pre-scale chroma**; each family multiplies it by its `neutral_chroma_scale`.

```json
{
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
}
```

Accent roles use these `[L, C]` pairs. **C is the pre-scale chroma**; each family multiplies it by its `accent_chroma_scale`.

```json
{
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
}
```

## Family recipes

```json
{
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
}
```

## Conversion and gamut handling

Generation converts OKLCH → OKLab → linear sRGB. Each linear sRGB channel is clamped independently to `[0, 1]` **before** sRGB transfer encoding. Encoded channels are then clamped defensively to `[0, 1]`, multiplied by 255, and rounded to the nearest integer to produce six-digit hex colors.

Each resulting `.ovt` stores the complete 12-neutral + 14-accent seed as OBS-safe `--sibling_*` tokens, then maps Colorway semantic roles onto that seed. The human-authored “not an official Catppuccin flavor” notice lives outside `@OBSThemeVars`, so `sync-theme-mirrors.mjs` cannot erase it when regenerating the resolved palette comment.
