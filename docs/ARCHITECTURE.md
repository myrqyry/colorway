# Colorway — OBS Theme System Architecture

## Executive Summary

Colorway is a theme system for OBS Studio that distributes custom `.ovt` (OBS Variant Theme) files through a static preview site. A variant theme is a small text file that overrides ~25 CSS custom property tokens — backgrounds, text colors, accent hues, borders — on top of a full base theme (`Colorway.obt`, ~150+ variables). The site provides real-time previews of all ~150 variants, direct downloads, upload-based conversion from any `.ovt` into the Colorway format, and algorithmic generation of OBS themes from any Lospec palette.

The system is entirely client-side (no server), deployed as a Vite-built static site on Vercel.

---

## 1. Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                     Browser (static SPA)                       │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  theme-       │  │  theme-      │  │  theme-              │ │
│  │  catalog.js   │──│  loader.js   │  │  workbench.js        │ │
│  │  (150 themes) │  │  (parse,     │  │  (normalize,         │ │
│  │               │  │   resolve,   │  │   serialize,         │ │
│  │               │  │   apply)     │  │   Lospec import)     │ │
│  └──────────────┘  └──────┬───────┘  └──────────┬───────────┘ │
│                           │                     │              │
│                    ┌──────▼───────┐     ┌────────▼──────────┐ │
│                    │   main.js    │     │  src/styles.css   │ │
│                    │  (UI shell)  │     │  (679 lines CSS)  │ │
│                    └──────┬───────┘     └───────────────────┘ │
│                           │                                     │
│                    ┌──────▼───────┐                             │
│                    │  /public/    │                             │
│                    │  themes/     │ ← mirrored .ovt files       │
│                    │  patterns/   │ ← SVG background patterns   │
│                    │  icons/      │ ← OBS-inspired icons        │
│                    └──────────────┘                             │
└──────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Colorway.obt     │
                    │   (base theme)     │
                    │   ~3293 lines      │
                    │   ~150+ variables  │
                    └───────────────────┘
         Each variant extends this via `extends:`
```

### Data flow

1. **Page load**: `main.js` calls `preloadAllThemes()` which chunks all 150 themes, fetches each `.ovt` from `public/themes/`, parses via `parseOVT()`, resolves inheritance chains, and extracts a 6-color palette preview.
2. **Theme selection**: Clicking a theme row calls `setTheme(file)` → `loadTheme(file)` → cache check → `resolveTheme(file)` → fetch raw `.ovt` → `parseOVT()` → recursively resolve `extends:` chain → merge variables → `applyTheme()` sets CSS custom properties on `:root`.
3. **Import**: Drop a `.ovt` file → `importThemeFile()` → `file.text()` → `toNormalizedTheme()` → `parseOVT()` → preview. "Apply" writes tokens to CSS. "Download" serializes via `serializeOVT()`.
4. **Lospec generation**: Paste a slug → `fromLospecPalette(slug)` → fetch `https://lospec.com/palette-list/<slug>.json` → `assignRoles()` sorts hexes by OKLCH lightness → maps darkest→bg, lightest→text, most saturated→accent → derives ~30 OBS tokens → preview/download.

---

## 2. The OVT Format

OVT (OBS Variant Theme) is a text-based format with two blocks:

### @OBSThemeMeta

```
@OBSThemeMeta {
    name: 'Catppuccin Mocha';
    id: 'com.myrqyry.Colorway.CatppuccinMocha';
    extends: 'com.myrqyry.Colorway';
    author: 'myrqyry';
    dark: 'true';
}
```

Fields parsed by `parseOVT()` in `src/theme-loader.js:83`:
- `name` — display name
- `id` — unique reverse-domain identifier
- `extends` — parent theme ID (resolved to a file by `findThemeFile()`)
- `author` — creator
- `dark` — `'true'` or `'false'` for dark/light variant

### @OBSThemeVars

```
@OBSThemeVars {
    --bg_base: #1e1e2e;
    --text: #cdd6f4;
    --primary: #cba6f7;
    --border_color: #313244;
    /* ... ~25 more variables */
}
```

Each line is `--<name>: <value>;`. Values can be:
- Hex colors: `#cdd6f4`
- `var()` references: `var(--primary)` — resolved during inheritance
- `rgba()`: `rgba(130, 170, 255, 0.3)` — used for accent gradient overlays

The base theme `Colorway.obt` (3293 lines) defines ~150 variables including gray scales, color ramps, spacing tokens, icon paths, and sizing. Variants only override ~25 core visual variables — everything else cascades via the base theme.

### Inheritance Resolution

File: `src/theme-loader.js:119`

```
resolveTheme(file):
  1. Fetch and parse raw .ovt
  2. If `extends` is set, find the parent theme file via `findThemeFile()`
  3. Recursively resolve the parent
  4. Merge: parent vars → child vars (child wins)
  5. Resolve `var()` references within the merged map
```

The browser-side resolver at `src/theme-workbench.js` uses `parseOVT()` (pure parser, no `var()` resolution) for the imported/Lospec themes since generated themes always emit concrete hex values.

---

## 3. Core Components

### 3.1 `src/theme-loader.js` — Parser, Resolver, Applier

**Exports:**

| Function | Purpose |
|---|---|
| `parseOVT(text)` | Extracts `{ meta, vars }` via regex. Pure function, no I/O. |
| `loadTheme(file)` | Fetches from `/themes/<file>`, caches raw + resolved, returns inherited var map |
| `applyTheme(vars)` | Sets each `--var: value` on `document.documentElement.style`, cleans previous |
| `PALETTE_VARS` | Flat array of `[name, label]` pairs for the 30 previewed variables |
| `PALETTE_GROUPS` | Grouped by UI role (Backgrounds, Text, Accent, Inputs, Buttons, UI Elements) |

**Parser detail** (`parseOVT`, line 83): Uses three regex passes:
1. Match `@OBSThemeVars \{(...)\}` block
2. Split into lines, match `^\s*(--[\w-]+)\s*:\s*(.+?);`
3. Separate regex for meta fields (`name`, `dark`, `extends`)

Supports `rgba()` values, `var()` references, hex colors, and numeric tokens.

### 3.2 `src/theme-workbench.js` — Normalization, Serialization, Lospec Import

The shared engine that both the browser UI and any future build pipeline use.

**Normalized theme shape:**

```js
{
  id:        'com.myrqyry.Colorway.catppuccin-mocha',
  name:      'Catppuccin Mocha',
  author:    'myrqyry',
  dark:      true,
  extendsId: 'com.myrqyry.Colorway',
  tokens:    { '--bg_base': '#1e1e2e', ... },
  sourceFormat: 'colorway' | 'external',
}
```

**Export matrix:**

| Function | Input | Output |
|---|---|---|
| `toNormalizedTheme(text)` | Raw `.ovt` text | Normalized theme object |
| `serializeOVT(theme)` | Normalized theme | Colorway `.ovt` text (extends: `com.myrqyry.Colorway`) |
| `toYamiOVT(theme)` | Normalized theme | Yami `.ovt` text (extends forced to `com.myrqyry.Colorway`) |
| `importThemeFile(file)` | Browser `File` object | Normalized theme |
| `downloadThemeText(text, name)` | Text + filename | Triggers browser download, returns blob URL |

### 3.3 `src/main.js` — UI Shell

Single-page app with four screen regions:

1. **Header**: Theme picker (scrollable list with 6-color palette previews), pattern selector, active theme info
2. **Workbench tabs**: Browse / Import / Export
3. **Showcase grid**: 9 demo widgets (buttons, inputs, sliders, checkboxes, radio buttons, list items, tabs, audio mixer, status indicators, progress bar) that reflect the current CSS variables
4. **Palette details**: Collapsible group showing all 30 tracked variables with live swatches

**Tab functionality (Post-workbench addition):**

| Tab | Content |
|---|---|
| Browse | Active theme name, "Download Yami variant" button |
| Import | Upload `.ovt` (drag-drop or file picker) + Lospec palette generator (URL input) |
| Export | Download active theme as Colorway `.ovt` or Yami-compatible `.ovt` |

### 3.4 `src/theme-catalog.js` — Registry

Static catalog containing:
- `THEMES` — Array of `{ file, name }` for all 150+ built-in variants (generated by `scripts/sync-theme-mirrors.mjs`)
- `PATTERNS` — 14 SVG background patterns for the preview backdrop
- `DEFAULT_THEME` — `'Colorway-CatppuccinMocha.ovt'`
- `DEFAULT_PATTERN` — `'pattern.svg'`

### 3.5 `scripts/sync-theme-mirrors.mjs` — Build Pipeline

Node.js script (run via `npm run sync:themes`) that:
1. Reads all `Colorway-*.ovt` from `themes/`
2. Parses each via the same regex parser
3. Resolves inheritance chains (handles `var()` references, detects cycles)
4. Injects a palette reference comment block into each source file
5. Mirrors the augmented file into `public/themes/`

This ensures every theme file in `public/themes/` is identical to the `themes/` version and includes a human-readable palette reference comment.

---

## 4. Lospec Palette Import — Role Assignment Algorithm

File: `src/theme-workbench.js:115`

The algorithm that converts any flat hex color array into semantically assigned OBS tokens.

### Step 1: Perceptual Color Sorting

All hex colors are converted to **OKLCH** (perceptual color space) using the standard CSS Color Level 4 sRGB↔OKLab↔OKLCH transform, implemented inline with no dependencies:

```
hex → linear sRGB → LMS → cube-root LMS → OKLab → OKLCH (L, C, h)
```

OKLCH is chosen over HSL because it aligns with human perception of lightness — a color that appears "equally light" to the eye will have the same L value, regardless of hue or chroma.

### Step 2: Role Assignment Rules

```
Colors sorted by L (lightness):
  [darkest ... lightest]

isDark = darkest.L < 0.55
bg     = isDark ? darkest : lightest      (darkest for dark, lightest for light)
fg     = isDark ? lightest : darkest      (opposite)
accent = mostChroma among remaining       (highest saturation, not bg/fg)
```

### Step 3: Derived Token Generation

Each OBS role is derived from one of the three source colors with OKLCH light/dark offsets:

| Role | Source | L offset | Rationale |
|---|---|---|---|
| `--bg_window`, `--bg_base` | bg | 0 | Primary surface |
| `--bg_dock` | bg | +0.02 | Slightly elevated panel |
| `--bg_preview` | bg | +0.04 | Preview area |
| `--bg_hover` | bg | +0.08 | Interactive hover state |
| `--text` | fg | 0 | Primary text |
| `--text_light` | fg | +0.04 | Emphasized text |
| `--text_muted` | fg | -0.07 | Secondary text |
| `--text_inactive` | fg | -0.15 | Diminished |
| `--text_disabled` | fg | -0.20 | Lowest contrast |
| `--text_inverse` | inv | N/A | Near-white on dark, near-black on light |
| `--primary` | accent | 0 | Main accent |
| `--primary_light` | accent | +0.05 | Hover/highlight |
| `--primary_lighter` | accent | +0.10 | Subtle highlight |
| `--primary_dark` | accent | -0.05 | Pressed state |
| `--primary_darker` | accent | -0.10 | Strong contrast |
| `--input_bg` | mid | 0 | Midpoint between bg and fg |
| `--input_bg_hover` | mid | +0.04 | Hover |
| `--input_border` | mid | -0.06 | Subtle border |
| `--input_border_hover` | accent | 0 | Focus indicator |
| `--button_bg` | mid | +0.02 | Button surface |
| `--button_bg_hover` | mid | +0.06 | Button hover |
| `--button_bg_disabled` | mid | -0.04 | Diminished |
| `--border_color` | mid | -0.04 | Subtle separators |
| `--warning` | accent | 0, hue=60° | Yellow-orange rotated |
| `--danger` | accent | 0, hue=0° | Red rotated |
| `--success` | accent | 0, hue=140° | Green rotated |

### Step 4: Small Palette Fallback

For palettes with only 2–3 colors, the same derivation system works naturally because all non-source roles are derived by OKLCH offset rather than requiring a distinct color. A 2-color palette produces a functional theme — it just won't have a distinct accent color separate from the text.

---

## 5. Color Space Conversions

The complete sRGB↔OKLCH pipeline in `src/theme-workbench.js`:

```
sRGB (hex) → Linear sRGB → LMS → cube-root LMS → OKLab → OKLCH
```

**Forward (hex → OKLCH):**
- `srgbToLinear(c)`: sRGB gamma → linear, standard piecewise (0.04045 threshold)
- `hexToLinear(hex)`: Parse hex to `[r,g,b]` → linearize each
- Linear → LMS via 3×3 matrix (Bradford-like, using the OKLab M1 matrix)
- Cube-root each LMS component (sRGB nonlinearity removal in OKLab space)
- LMS → OKLab via M2 matrix
- OKLab → OKLCH: `L = L`, `C = hypot(a,b)`, `h = atan2(b,a)` in degrees

**Reverse (OKLCH → hex):**
- OKLCH → OKLab via polar-to-cartesian
- OKLab → LMS via inverse M2
- Cube each LMS component (inverse of cube root)
- LMS → Linear sRGB via inverse M1
- Linear sRGB → sRGB (piecewise gamma, clamped to [0,255])

All matrix values are the standard OKLab constants from Björn Ottosson's 2020 paper.

---

## 6. Integration Points

### File system layout

```
colorway/
├── themes/
│   ├── Colorway.obt                       # Base theme (~3293 lines, ~150 vars)
│   └── Colorway-*.ovt                     # ~150 variant themes (~25 vars each)
├── patterns/                              # 14 SVG background patterns (source of truth)
├── fonts/                                 # Bundled font (BricolageGrotesqueVariable.ttf) + OFL.txt
├── public/
│   ├── themes/                            # Mirrored variants (served by Vite)
│   ├── patterns/                          # Mirrored SVG patterns (served by Vite)
│   └── icons/                             # OBS-style SVG icon set
├── src/
│   ├── main.js                            # UI shell, event wiring
│   ├── styles.css                         # All preview + workbench CSS
│   ├── theme-catalog.js                   # Static theme/pattern registry
│   ├── theme-loader.js                    # Parser, resolver, applier
│   └── theme-workbench.js                 # Normalizer, serializer, Lospec
├── test/
│   ├── preview-contract.test.js           # 8 UI contract tests
│   ├── new-themes-contract.test.js        # 461 per-theme validation tests
│   ├── workbench-engine.test.js           # Serializer round-trip tests
│   └── lospec-import.test.js              # Color math + role assignment tests
├── scripts/
│   ├── sync-theme-mirrors.mjs             # Build-time mirror + palette comments
│   └── copy-themes.sh                     # Install themes into ~/.config/obs-studio/themes
├── docs/
│   └── patterns-preview.html              # Standalone pattern picker helper page
├── package.json                           # Vite + Tailwind v4 + autoprefixer
└── vercel.json                            # pnpm build, dist/ output
```

### Test coverage (475 tests)

| Test file | Tests | What it validates |
|---|---|---|
| `test/new-themes-contract.test.js` | 452 | Every `.ovt` overrides required vars, passes WCAG contrast (text→bg, inverse→hover-button) |
| `test/preview-contract.test.js` | 8 | UI structure classes exist, theme pipeline functions present, public themes mirror root |
| `test/workbench-engine.test.js` | 8 | Normalized theme shape, serializeOVT round-trip, toYamiOVT extends injection, full catalog round-trip |
| `test/lospec-import.test.js` | 5 | Slug extraction, minimum-color guard, all 31 tokens present, hex format, dark mode detection |

### Build & deploy

- `npm run dev` — Vite dev server (host 0.0.0.0)
- `npm run build` — Vite build to `dist/`
- `npm run sync:themes` — Mirror themes to `public/themes/` with palette comments
- `npm run test` — Node test runner, 475 tests, ~500ms
- `npm run preview` — Vite preview of built output

Deployed on Vercel via `vercel.json` using pnpm as package manager.

---

## 7. Design Decisions

### 7.1 Why client-side only?

The `.ovt` format is plain text with no binary assets. Parsing, serialization, and color math are all deterministic and fast (< 2ms per theme). There is no database, no user accounts, no job queue — every operation completes in the browser before the user perceives delay. Moving to a server would add latency, deployment complexity, and cost without any functional benefit.

### 7.2 Why OKLCH instead of HSL?

HSL lightness (the L in `hsl()`) has well-known perceptual non-uniformity: a yellow and a blue with identical HSL L will not appear equally bright. OKLCH's L axis maps directly to perceived lightness, which is critical for the role assignment algorithm — "darkest becomes background" only works if "darkest" matches what a human sees.

### 7.3 Why inline color math instead of a library?

The OKLab transform is ~30 lines of matrix math with zero dependencies. Adding a color library (Chroma.js, Culori, Color.js) would add ~10-30KB to the bundle for functionality that's already expressible in a few matrix multiplications. The tradeoff is maintainability of the inline math vs. dependency risk — the matrices are well-established standards that won't change.

### 7.4 Why `extends: 'com.myrqyry.Colorway'` for Yami?

Yami themes use the same `.ovt` format but target a different base theme. By forcing `extends: 'com.myrqyry.Colorway'`, the Yami variant layers on top of the user's installed Colorway base — they only need to drop the `.ovt` file, not replace the entire theme. This makes Yami output a simple `extends` rewrite of the same token set.

### 7.5 Why only 25 tokens per variant instead of all 150?

The base theme (`Colorway.obt`) defines all infrastructure variables: spacing, font sizes, border radii, icon paths, gray scale ramps, color scales (`--blue1`–`--blue6`, etc.), scrollbar sizing, toggle dimensions, and padding. A variant only needs to override the color tokens — everything else cascades. This makes each variant small (~99 lines), easy to read, and focused on what it actually changes.

---

## 8. Appendices

### A. Complete token reference

All variables tracked in `PALETTE_GROUPS`:

| Variable | Group | Typical range |
|---|---|---|
| `--bg_window` | Backgrounds | Dark surface |
| `--bg_base` | Backgrounds | Same as window |
| `--bg_preview` | Backgrounds | Slightly lighter/darker |
| `--bg_dock` | Backgrounds | Slightly separate |
| `--bg_hover` | Backgrounds | Interactive surface |
| `--text` | Text | Highest contrast |
| `--text_light` | Text | Brightest variant |
| `--text_muted` | Text | Reduced contrast |
| `--text_inactive` | Text | Dimmed |
| `--text_inverse` | Text | Opposite of text |
| `--text_disabled` | Text | Lowest contrast |
| `--primary` | Accent | Most saturated |
| `--primary_light` | Accent | Lighter accent |
| `--primary_lighter` | Accent | Even lighter |
| `--primary_dark` | Accent | Darker accent |
| `--primary_darker` | Accent | Even darker |
| `--input_bg` | Inputs | Between bg_base and preview |
| `--input_bg_hover` | Inputs | Lifted surface |
| `--input_bg_focus` | Inputs | Focused surface |
| `--input_border` | Inputs | Subtle border |
| `--input_border_hover` | Inputs | Accent-tinted |
| `--button_bg` | Buttons | Similar to input_bg |
| `--button_bg_hover` | Buttons | Lifted |
| `--button_bg_disabled` | Buttons | Dimmed |
| `--list_item_bg_hover` | Buttons | Hover highlight |
| `--list_item_bg_selected` | Buttons | Selection highlight |
| `--border_color` | UI | Subtle separators |
| `--ico` | UI | Same as text |
| `--ico_selected` | UI | Inverse/selected |
| `--accent_bg_start` | UI | Gradient start (rgba) |
| `--accent_bg_end` | UI | Gradient end (rgba) |
| `--warning` | UI | Yellow-orange |
| `--danger` | UI | Red |
| `--success` | UI | Green |
| `--meter_bg_nom` | UI | Normal meter bg |
| `--meter_bg_war` | UI | Warning meter bg |
| `--meter_bg_err` | UI | Error meter bg |
| `--meter_fg_nom` | UI | Normal meter fg |
| `--meter_fg_war` | UI | Warning meter fg |
| `--meter_fg_err` | UI | Error meter fg |

### B. Lospec API format

Request: `GET https://lospec.com/palette-list/<slug>.json`

Response:
```json
{
  "name": "Nintendo Entertainment System",
  "author": "",
  "colors": ["000000", "fcfcfc", "f8f8f8", "bcbcbc", ...]
}
```

The `colors` array is hex strings without `#` prefix. The `assignRoles()` function normalizes them by prepending `#` and filtering for valid 6-character hex values.

### C. Adding a new built-in theme

1. Create `Colorway-MyTheme.ovt` in `themes/` with `@OBSThemeMeta` and `@OBSThemeVars` blocks, extending `com.myrqyry.Colorway`
2. Add entry to `THEMES` array in `src/theme-catalog.js`
3. Run `npm run sync:themes` to mirror to `public/themes/`
4. Run `npm test` — the per-theme contract tests will validate variable overrides and contrast ratios
5. Build and deploy

### D. Glossary

| Term | Definition |
|---|---|
| OBT | OBS Base Theme — full theme file defining all variables |
| OVT | OBS Variant Theme — small file overriding a subset of variables on top of a base |
| Colorway | The design system and base theme (`Colorway.obt`) |
| Yami | An alternative OBS base theme format; Colorway-to-Yami conversion wraps the same tokens with a different `extends` target |
| OKLCH | Perceptual color space (Lightness, Chroma, Hue) — the standard for color science in CSS Color Level 4 |
| Lospec | A directory of pixel-art palettes with a JSON API at `lospec.com/palette-list/<slug>.json` |
| PALETTE_VARS | The 30 tracked variables displayed in the preview palette details pane |
