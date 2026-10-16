# OBS Theme Compatibility

Colorway is a custom OBS base theme, so it owns the styling contract for widgets that OBS adds or changes.

## Upstream baseline

Compatibility was audited against:

- `obsproject/obs-studio@ea7536c49cb84420296d3831cda526c232fed3bc`
- `frontend/data/themes/Yami.obt`

OBS's wiki recommends using Yami as a base for custom themes, on the grounds that standalone `.obt` base themes do not automatically receive new widget styling. **Colorway deliberately does not follow that recommendation.** It is its own base theme (`themes/Colorway.obt`) and its 159 variants extend `com.myrqyry.Colorway`.

**This is settled and not up for reconsideration.** Colorway's standalone base carries substantial custom QSS, its own icon set, custom surfaces, mixer, and layout behavior; that is the product, not an accident to be migrated away. Do not propose a `Yami.obt` base, a `Yami.obt → Colorway.ovt → Colorway-*.ovt` inheritance chain, or copying Yami rules into Colorway. Upstream Yami is tracked **only** as a format-drift reference for `pnpm check:obs-upstream`; it is not an architectural target. The cost of owning the base theme is tracked-upstream maintenance, and that is accepted deliberately.

## Current compatibility cuttings

The base theme carries Colorway-styled coverage for newer OBS mechanics while keeping older selectors when they are harmless:

- current Idian names: `ListHeader`, `RowList`, `RowInfo`, `CollapsibleGroup`, `InlineButton`
- legacy Idian names remain for older OBS releases
- `mute-warning` plus legacy `mute-unassigned`
- Add Source `.btn-create-new`
- checked `QToolButton` / `.btn-tool` states
- nested `QMenu > QMenu` surfaces
- `QTableView` checkbox indicators
- newer spinbox minimum-width behavior
- top and bottom tab-bar placement

## Colorway semantic rules

OBS interaction states should be driven by variant semantics rather than a single baked palette:

- streaming/live → `--primary`
- recording → `--danger`
- warning → `--warning`
- healthy/monitor state → `--success`

Avoid adding new fixed RGB values for these roles in QSS. Prefer semantic aliases and neutral theme surfaces so light, dark, AMOLED, and palette-derived variants remain coherent.

## Distribution invariant

`themes/` is the source distribution and `public/themes/` is its static-site mirror. The two sets of `.obt/.ovt` files must stay byte-identical. `test/theme-base-contract.test.js` enforces this for every shipped theme file.


## Official theme-system contract

The OBS Studio Theme System wiki is the parser-level reference for this repository:

- https://github.com/obsproject/obs-studio/wiki/OBS-Studio-Theme-System

Colorway follows these constraints:

- `@OBSThemeMeta` and `@OBSThemeVars` stay at the top of theme files.
- OBS variable names use only alphanumeric characters and underscores after the `--` prefix.
- Variables are declared only inside `@OBSThemeVars`.
- Theme assets use the `theme:` Qt search-path prefix.
- `calc()` is evaluated by the OBS theme parser only inside `@OBSThemeVars`; widget QSS consumes precomputed variables instead.
- Current OBS source also supports `min()` and `max()` in the variable parser, even though the wiki currently documents only `calc()`.

The wiki permits a variant to extend another variant as long as the dependency chain ends at a base theme, and OBS's parser confirms it: `PrepareQSS` concatenates the chain base-first, so a variant's rules are appended after its parent's and win at equal specificity. Colorway uses exactly this — every variant extends `com.myrqyry.Colorway`, and light variants append their own icon `url()` overrides after the base's. No inheritance change is planned or wanted; see the settled decision in *Upstream baseline* above.


## Qt SVG background tiling — 2026-10-16

The Colorway base uses a small, transparent SVG tile at
`theme:patterns/pattern.svg`. On the installed Linux Qt6 engine,
`background-image: var(--pattern_eyes)` alone renders and repeats the SVG,
but adding CSS-style `background-repeat: repeat` to the Qt stylesheet makes
the pattern disappear, leaving only the flat background color. Qt does not
follow browser CSS background-repeat semantics here.

Keep the authored `background-image` properties, but omit
`background-repeat` in these Qt widget rules. Browser preview CSS is
separate and retains its own supported repeat behavior.

`test/pattern-qt-tiling.test.js` verifies all pattern-bearing QSS blocks,
then renders the actual SceneTree declarations and shipped SVG under
offscreen PyQt6 to require multiple background pixel colors (not a uniform
fill). The native isolated `pnpm check:obs-native` gate continues to verify
the actual OBS stylesheet, whereas this test adds rendered-pixel coverage.

## OBS 32.2 parser boundary — verified 2026-10-16

OBS's `@OBSThemeVars` parser (`frontend/OBSApp_Themes.cpp`) evaluates
`var()`, `calc()`, `min()`, `max()` and hex colors as special forms. It
treats other values as **one lexical string token**, which means an unquoted
`url(theme:...)` or `rgba(...)` is truncated to the function name and cannot
be substituted as working QSS. This differs from an ordinary browser CSS
variable declaration.

- Theme source and exported packages use `'url(theme:...)'` and `'rgba(...)'`.
- `src/theme-value-codec.js` is the single disk-format codec. It quotes only
  actual declarations inside `@OBSThemeVars`, preserves comment provenance
  verbatim, and decodes function tokens for browser import and export.
- `pnpm sync:themes`, the Catppuccin sibling generator, palette import/export,
  and state-token generation all preserve the quoted format.
- `test/obs-theme-parser-contract.test.js` enforces this across all 161 theme
  files; when libobs headers/compiler are present it also compiles a probe
  against the actual libobs lexer. Other platforms retain the source-format
  contract. The Qt rendering harness decodes these values to mirror OBS's
  substitution before constructing the QSS.
- The two accidentally joined QSS selector lists were separated so checkbox,
  group box, and menubar backgrounds no longer inherit item-view pattern
  rules, and unrelated source-tree selectors no longer bleed into menu icons.
- Source types now use distinct MingCute photo-album slideshow and playback
  media glyphs, plus the existing general output monitor glyph.

**Native OBS verification:** on a Linux development machine with OBS,
Xvfb, C++ and Qt6Widgets headers installed, run
`pnpm check:obs-native`. This copies the current source theme and assets into
new temporary OBS configurations and launches isolated OBS sessions for the
base, Catppuccin Latte Blue and Monokai. An observation-only Qt6 hook records
the real `QApplication::setStyleSheet` argument. The check verifies the exact
variant palette, MingCute/pattern URLs and absence of unresolved `var()`
references. It stops all test processes and removes its temporary config;
the user's existing OBS installation/settings are never edited. This is an
**optional local integration gate**, not an assumed headless CI prerequisite.

Do not reintroduce unquoted `url()` / `rgba()` values in OBS-theme variable
blocks. The normal web-preview appearance cannot verify this lexer contract.
Use the actual native parser check and an isolated OBS configuration before
claiming a new icon or pattern path works in OBS.

## Colorway companion and preview emphasis — 2026-10-16

The main web showcase no longer dedicates a large card to status indicators
or randomly changes nominal CPU, FPS and bitrate values. The real OBS status
bar stays inside its representative workspace geometry. Scene/source lists,
mixer, controls and their real theme surfaces now get the visual attention.

An optional, portable Colorway companion ships as `companion/` in the theme
ZIP, separate from the OBS theme search directory:

- The Lua manager safely backs up and replaces the installed
  `patterns/pattern.svg` with a selected bundled SVG, never changing the
  theme ID, QSS, scene collection, or live OBS configuration.
- With existing `AutoReload=true` in `[Appearance]`, re-writing the first
  unchanged byte of the base triggers OBS 32.2's QFileSystemWatcher; this was
  tested in disposable OBS/Xvfb and confirmed in native logs. Without that
  setting a restart is reported as required.
- The single-file browser dock embeds **all 160 source palettes** with their
  actual `.ovt` ancestry and 14 SVG patterns, rendered without a server.
  It offers search, favorites, light/dark filters, and focused OBS widget
  previews. It is not a native Qt screenshot or theme-changing control.
- Generated `obs-companion/colorway-preview.html` and `public/companion/`
  are reproduced from the source theme and pattern catalogs by
  `pnpm sync:themes`; local Chromium checks verify real interactions.
  The ZIP packages all three companion files.

Do not invent OBS frontend theme-switching from Lua: the supported API
exposes theme-change events, not a theme-setting function.

## Browser preview fidelity — 2026-10-15

The web preview is a representative OBS Studio interaction surface, **not a
pixel-identical OBS screenshot**. The theme files remain the authority:

- Browser-only `theme:` to `/` URL translation occurs in
  `src/theme-loader.js` when applying variables to the DOM. Neither exported
  `.obt/.ovt` content nor the parser's returned values are rewritten.
- QWidget icon samples use the exact `--cw_icon_*_base` token from the selected
  theme variant. Their authored MingCute ink and selected/normal SVG polarity
  are preserved; CSS does not retint them. Status *indicators*, which are
  semantic rather than Qt `qproperty-icon` widgets, use theme-colored masks.
- Selected rows use OBS's `--primary` with `--on_primary`, and its selected
  hover uses `--primary_light` with `--on_primary_hover`.
- Stream/record/virtual-camera/studio controls use the respective Colorway QSS
  active colors and surfaces, not one universal active tint.
- Only Appearance settings are actually represented; other settings pages
  explain that they must be changed in OBS, rather than inventing controls.

**Reproducible checks:** `pnpm test` validates QSS-matched CSS/URL semantics
and token origin; `pnpm check:preview` builds then launches a temporary
localhost Vite preview and isolated headless Chromium profile to check a light
and a dark theme, actual MingCute background image URL/polarity, selected ink,
active control borders, pattern rendering, and status transitions. This
requires Chromium installed on the local machine (`CHROMIUM_PATH` can override
`/usr/bin/chromium`). It does not change a real OBS configuration or
installed theme files.

Qt rendering, window-manager chrome, native focus/scroll behavior, platform
fonts, dock arrangement, and plugin-controlled widgets can still differ.
Actual OBS 32.2 rendering remains the final visual gate. Do not market the
browser representation as a screenshot or authoritative OBS geometry.

## Automated upstream watch

`pnpm check:obs-upstream` checks the real `obsproject/obs-studio` repository against the reviewed baseline in `scripts/obs-upstream-baseline.json`.

It watches:

- `frontend/data/themes/Yami.obt` for theme-variable and selector drift.
- `frontend/OBSApp_Themes.cpp` for theme-parser drift.

When an upstream source changes, the command prints the new upstream commit plus structural additions/removals and exits non-zero. It does **not** automatically copy Yami rules into Colorway or advance the baseline. The baseline only moves after a human review determines whether the upstream change matters to Colorway.

`.github/workflows/obs-upstream-watch.yml` runs the same deterministic check weekly and can also be triggered manually.
