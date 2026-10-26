# Colorway — OBS Theme System Architecture

## Executive Summary

Colorway is a theme system for OBS Studio that distributes custom `.ovt` (OBS Variant Theme) files through a static preview site. A variant theme is a small text file that overrides the 40 tracked palette tokens — backgrounds, text colors, accent hues, borders — on top of a full base theme (`Colorway.obt`, 274 variables). Each variant also restates a handful of layout properties (72 custom properties per variant in total); everything else cascades from the base. The site provides real-time previews of all 160 variants, direct downloads, upload-based conversion from any `.ovt` into the Colorway format, and algorithmic generation of OBS themes from any Lospec palette.

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
│  │  (160 themes) │  │  (parse,     │  │  (normalize,         │ │
│  │               │  │   resolve,   │  │   serialize,         │ │
│  │               │  │   apply)     │  │   Lospec import)     │ │
│  └──────────────┘  └──────┬───────┘  └──────────┬───────────┘ │
│                           │                     │              │
│                    ┌──────▼───────┐     ┌────────▼──────────┐ │
│                    │   main.js    │     │  src/styles.css   │ │
│                    │  (UI shell)  │     │  (1163 lines CSS)  │ │
│                    └──────┬───────┘     └───────────────────┘ │
│                           │                                     │
│         ┌─────────────────▼──────────────────┐                  │
│         │  OBS preview layer (side-effect)   │                  │
│         │  no exports; loaded by index.html  │                  │
│         │  shares state through the DOM      │                  │
│         ├────────────────────────────────────┤                  │
│         │  obs-preview.js         654 lines  │ ← builds the UI  │
│         │  obs-preview-refine.js  520 lines  │ ← fidelity       │
│         │  obs-preview-actions.js 414 lines  │ ← import/export  │
│         │  page-shell-sync.js     290 lines  │ ← page chrome    │
│         │  obs-preview-ambient.js 175 lines  │ ← backdrop       │
│         └─────────────────┬──────────────────┘                  │
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
                    │   ~3659 lines      │
                    │   ~274 variables   │
                    └───────────────────┘
         Each variant extends this via `extends:`
```

### Data flow

1. **Page load**: `renderApp()` renders the shell, including a fixed full-viewport intro overlay (`#colorway-intro`) with a large per-character "Colorway" word (manual char spans, no SplitText). `runIntro()` starts `preloadAllThemes()` (chunks all 160 themes, fetches each `.ovt` from `public/themes/`, parses via `parseOVT()`, resolves inheritance chains, extracts a 6-color palette preview) and the GSAP `playColorwayIntroOpening()` concurrently. Only when both settle (`Promise.all`) does the app prepare the initial random theme under the overlay (`setTheme(initialTheme, { transition: false, animateTitle: false })`), init the workbench, then hand the settled word off into the sticky header title via `handoffColorway()` before `startShuffle()` begins. The handoff lands directly into the final header state; it does not trigger a second title animation.
2. **Theme selection**: Clicking a theme row calls `setTheme(file, { patternFile })` → `loadTheme(file)` → cache check → `resolveTheme(file)` → fetch raw `.ovt` → `parseOVT()` → recursively resolve `extends:` chain → merge variables → `applyThemeState(file, theme, patternFile)` applies the theme, updates the palette/status, syncs the pattern select (via a dispatched `change` event that also drives the OBS Appearance mirror and ambient generator), and toggles the active theme row. The swap is committed atomically through the View Transition API when available, with a GSAP fade (`crossfadeShowcase`, promise-based) as the fallback; `transition: false` skips animation entirely. After the transition, `animateHeaderColorway()` plays a full per-character 3D turn on the header title; retriggers queue one additional roll rather than snapping an in-flight animation back to its start. The slideshow advances through shuffle bags for both theme and pattern (current pick excluded, `pattern.svg` skipped) so neither repeats until the bag is exhausted. A 12s cadence (`SHUFFLE_MS`) drives it; the circular shuffle button skips to the next theme immediately, the `❚❚` button beside the theme name toggles pause/resume, and a thin linear progress bar (plus the ring) shows time until the next change.
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

The base theme `Colorway.obt` (3659 lines) defines 274 variables including gray scales, color ramps, spacing tokens, icon paths, and sizing. Variants only override the 40 tracked palette variables (`PALETTE_VARS`) plus a few layout properties — everything else cascades via the base theme.

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
- `THEMES` — Array of `{ file, name }` for all 160 built-in variants (generated by `scripts/sync-theme-mirrors.mjs`)
- `PATTERNS` — 14 SVG background patterns for the preview backdrop
- `DEFAULT_THEME` — `'Colorway-CatppuccinMocha.ovt'`
- `DEFAULT_PATTERN` — `'pattern.svg'`

### 3.5 `scripts/sync-theme-mirrors.mjs` — Build Pipeline

Node.js script (run via `pnpm sync:themes`) that:
1. Reads all `Colorway-*.ovt` from `themes/`
2. Parses each via the same regex parser
3. Resolves inheritance chains (handles `var()` references, detects cycles)
4. Injects a palette reference comment block into each source file
5. Mirrors the augmented file into `public/themes/`

This ensures every theme file in `public/themes/` is identical to the `themes/` version and includes a human-readable palette reference comment.

### 3.6 The OBS preview layer — five side-effect modules

Sections 3.1–3.5 describe the *theme engine*, which owns parsing, resolution, and the workbench. The other half of `src/` is the **OBS preview layer**: five modules that build and drive the simulated OBS Studio window that the whole site exists to show. Together they are the majority of the shipped UI code (2,048 of 3,859 lines of JS in `src/`).

They do not behave like the engine modules, and the difference matters when you change them.

| Property | Theme engine (§3.1–3.4) | OBS preview layer (§3.6–3.11) |
|---|---|---|
| Exports | Explicit named exports | **None** — side effects on import |
| Loaded by | `import` from other modules | `<script type="module">` in `index.html` |
| Share state via | Function calls and imports | **The DOM** and `MutationObserver` |
| Mount point | n/a | `.obs-real-preview` |
| Test style | Import and call the function | **Assert on source text** via regex |

**The boot contract.** Each module defines a `boot()` that returns `false` if its mount point is not in the DOM yet. On failure it installs a `MutationObserver` on `document.documentElement` that retries `boot()` until it succeeds, then disconnects:

```js
function boot() {
  const root = document.querySelector('.obs-real-preview');
  if (!root) return false;
  wireRoot(root);
  return true;
}

if (!boot()) {
  const observer = new MutationObserver(() => {
    if (boot()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
```

This decouples the preview layer from `main.js`'s render order — the modules do not need `main.js` to have finished. Individual modules add extra preconditions (`obs-preview-actions` also waits for `.obs-sim-dialog`, `obs-preview-ambient` for `.obs-sim-preview-area`) and `obs-preview-refine` additionally waits for `#theme-list .theme-row` before calling `ensureAppearanceControls`.

**Shared state is read out of the DOM.** The modules observe state that `main.js` owns — `#theme-list .theme-row.active`, `#active-theme-name`, `#pattern-select` — and re-derive from it via `MutationObserver`. There is no shared store and no event bus except one `CustomEvent` (`colorway:shuffle-state`, dispatched by `main.js`). When adding a module, follow the same pattern: read the DOM, observe mutations, do not reach into another module's internals.

**Testing consequence — read this before trusting a green suite for these modules.** Because the modules export nothing, their tests cannot exercise behavior. `test/obs-preview-actions.test.js`, `test/obs-preview-refine.test.js`, `test/obs-preview-ambient.test.js`, and `test/page-shell-sync.test.js` all `readFileSync` the source and assert on **regex matches of literal source text**:

```js
const actions = readFileSync(new URL('../src/obs-preview-actions.js', import.meta.url), 'utf8');
assert.match(actions, /className = 'colorway-dialog-brand'/);
```

So for these five modules a green `pnpm test` proves the source still contains certain strings. It does **not** prove the UI works, and it can break on a behavior-preserving refactor that changes a literal. Interaction and visual claims about the preview must be verified in a browser (`pnpm dev`). The theme engine and the generator contracts are different — those are real behavioral tests.

### 3.7 `src/obs-preview.js` — Shell construction (654 lines)

The only module that *creates* the OBS UI. `mountObsPreview()` (line 638) is the entry point; everything else builds its markup.

- **Markup builders** — `dock`, `controlsDock`, `settingsMarkup`, `previewMarkup`, `sceneRows`, `sourceRows`, `mixerChannel`.
- **Icon system** — `escapeHtml`, `iconPath`, `iconMarkup`, `setIcon`, `buttonIcon` resolve icons from `icons/` and inject them as inline SVG.
- **Wiring** — `wirePreview` (docks, action buttons, menus), `wireDensity`, `setAppearancePanel`, `syncStyleName`, `toggleControl`.
- Simulates the studio-mode controls (`data-control="stream" | "record" | "virtualcam" | "studio"`) with their status labels and the stream/network indicators and bitrate readout.

A `MutationObserver` inside `syncStyleName` keeps the displayed style name current as the host element changes.

### 3.8 `src/obs-preview-refine.js` — Control fidelity (520 lines)

Replaces the page's default form controls with OBS-like equivalents. Imports `THEMES`, `PATTERNS`, and `DEFAULT_PATTERN` from `theme-catalog.js`.

- **Theme picker** — `buildThemePicker`, `refreshThemeOptions`, `syncThemePicker`, `makeThemeOption`, `hasFullThemeList` turn theme selection into an OBS-style dropdown with a palette preview, delegating to `selectTheme` / `applyPattern`.
- **Appearance controls** — `syncVisibleControls` and `ensureAppearanceControls` keep the permanent theme/pattern picker aligned with the active theme. The obsolete state-test modal and launcher have been removed.
- `makeSettingsPermanent` pins the Settings dock open; `removeTopYamiShortcut` strips a shortcut that should not be there.

### 3.9 `src/obs-preview-actions.js` — Import, export, branding (414 lines)

The user-facing I/O layer of the preview. Imports `applyTheme` from `theme-loader.js` plus workbench functions.

- **Branding** — `syncBrand` / `ensureBrand` write Colorway into the permanent Settings titlebar (`data-colorway-brand-theme`) and keep `document.title` in step with the active theme.
- **Download** — `downloadCurrent` dispatches to `downloadBuiltInColorway`, `downloadBuiltInYami`, or `downloadAppliedExternal` (with `safeFilenameStem` for filenames), chosen by `isImportedTheme` / `isGeneratedTheme` / `externalThemeIsActive`. The split Download menu (`closeDownloadMenu`) offers Colorway `.ovt` as the native variant and Yami as an optional compatibility export.
- **Import** — `stageImportedFile`, `triggerImport`, `importFromSettings`, `applyExternalTheme`. A `settingsImportGeneration` token guards against a slow workbench initialization clobbering a fast Settings-path import; the contract test asserts the observer is *not* attached to the apply button.
- **Lospec** — `parseGeneratedPreview`, `generatedId`, `wireWorkbenchSnapshots` keep the generated-palette preview current.

### 3.10 `src/obs-preview-ambient.js` — Ambient backdrop (175 lines)

The smallest of the five. Derives a deterministic ambient gradient for the preview area from the active theme and pattern names: `hashString` seeds `mulberry32`, and `appliedPalette` supplies the colors that `ensureAmbientLayer` / `syncAmbient` paint.

Because the backdrop is seeded from *names* rather than time or randomness, the same theme + pattern always produces the same gradient — re-rendering never causes a visible shift.

### 3.11 `src/page-shell-sync.js` — Page chrome mirror (290 lines)

Mirrors theme state to the parts of the page *outside* `.obs-real-preview`, so the marketing shell around the simulated OBS window agrees with it.

- **Header** — `ensurePageHeader`, `paintHeaderPalette`, `syncPageIdentity`, `restoreSettingsTitle`, `syncLivePaint`.
- **Mixer** — `sliderDb` and `syncMixerChannel` map fader positions onto meter fill/peak, reading live values via `computedVariable`.
- **Font scale** — `wireFontSize` writes `--obs-sim-font-scale` to `window.style`.
- **Slideshow** — `wirePageSlideshow` listens for the `colorway:shuffle-state` `CustomEvent` dispatched by `main.js`, then mirrors pause state and progress into the page header by proxy-clicking `#slideshow-pause` and reading `#slideshow-progress-fill`.

This is the only module that consumes a custom event rather than inferring state from the DOM, because slideshow progress has no DOM attribute to observe.

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
│   ├── Colorway.obt                       # Base theme (~3659 lines, 274 vars)
│   └── Colorway-*.ovt                     # 160 variant themes (40 palette tokens each)
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

### Test coverage

The Node suite lives under `test/**/*.test.js` and is run with `pnpm test`.
Totals and duration change as Qt/native checks are added; read the current pass/skip/fail
summary from the command output instead of treating a number in this document as current.
`fromLospecPalette` in `lospec-import.test.js` remains the one network-gated skip by design.

Representative contracts:

| Test file | What it validates |
|---|---|
| `test/new-themes-contract.test.js` | Every `.ovt` overrides required vars, passes WCAG contrast (text→bg, inverse→hover-button), sibling palettes keep the 12-neutral + 14-accent seed shape |
| `test/preview-contract.test.js` | UI structure classes, theme pipeline functions, public themes/patterns mirrors |
| `test/theme-base-contract.test.js` | Source/public theme identity, `parseOVT` dark rule, `extends` resolution |
| `test/workbench-engine.test.js` | Normalized theme shape, `serializeOVT` round-trip, `toYamiOVT`, full catalog round-trip |
| `test/obs-preview-actions.test.js` | OBS preview action handlers |
| `test/obs-preview-refine.test.js` | OBS preview refine behavior |
| `test/catppuccin-siblings-contract.test.js` | Generated sibling sources exactly match the generator |
| `test/obs-design-source-contract.test.js` | OBS design source contracts |
| `test/obs-preview-ambient.test.js` | OBS preview ambient behavior |
| `test/lospec-import.test.js` | Slug extraction, role/token guards, (1 skip: `fromLospecPalette`) |
| `test/obs-upstream-watch.test.js` | OBS upstream format drift watch |
| `test/page-shell-sync.test.js` | Page shell sync behavior |
| `test/browser-profile-cleanup.test.js`, `test/mingcute-migration.test.js`, `test/pattern-qt-tiling.test.js`, `test/theme-qt-render.test.js`, `test/theme-state-contrast.test.js`, `test/theme-surface-legibility.test.js`, `test/theme-provenance.test.js`, `test/theme-package.test.js`, `test/colorway-patterns-script.test.js`, `test/colorway-companion-*.test.js`, `test/preview-emphasis.test.js`, `test/theme-categories.test.js`, `test/earthbound-family.test.js`, `test/obs-preview-parity.test.js`, `test/obs-theme-parser-contract.test.js` | Pattern/Qt/browser checks and additional theme-source contracts |

### Build & deploy

This repo pins `pnpm@11.17.0` via `packageManager`, and CI installs and runs with pnpm. Use `pnpm`, not `npm` — the two are not interchangeable here because the lockfile is pnpm's.

- `pnpm dev` — Vite dev server (host 0.0.0.0)
- `pnpm build` — Vite build to `dist/`
- `pnpm sync:themes` — Mirror themes to `public/themes/` with palette comments
- `pnpm test` — Node test runner for `test/**/*.test.js`; test count and duration evolve with the suite. See the latest `ACTIVE_WORK.md` checkpoint for current totals; `fromLospecPalette` remains network-gated and skipped.
- `pnpm preview` — Vite preview of built output

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

### 7.5 Why only 40 palette tokens per variant instead of the base's 274?

The base theme (`Colorway.obt`) defines all infrastructure variables: spacing, font sizes, border radii, icon paths, gray scale ramps, color scales (`--blue1`–`--blue6`, etc.), scrollbar sizing, toggle dimensions, and padding. A variant only needs to override the color tokens tracked in `PALETTE_VARS` — everything else cascades. This makes each variant small (~100 lines), easy to read, and focused on what it actually changes.

The 40 tracked tokens are the *palette* vocabulary, not the variant's total property count: a shipped variant declares 72 custom properties, because the palette tokens plus a small set of layout overrides together cover what OBS needs to render correctly. The number that matters for review is `PALETTE_VARS.length` (40), because that is what the palette comment, the frozen-source contract, and the Lospec role assignment are all keyed to.

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
3. Run `pnpm sync:themes` to mirror to `public/themes/`
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
