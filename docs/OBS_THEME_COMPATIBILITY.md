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

## Pattern placement hierarchy — 2026-10-17

The old stylesheet repeated the same SVG across the window, Settings page,
Settings navigation, dense scenes/sources trees, every `QAbstractItemView`,
filters lists, and whole plugin-dock content surfaces. On the user's real OBS
capture at 300% pattern strength, the same diagonal texture competed with
scene labels, mixer controls and embedded shader-browser content.

**Verified placement update:** Retain the repeating pattern on the larger
window/shell and Settings page background, where it creates visual depth
outside controls. Use solid theme palette colors instead for
`SceneTree`, `SourceTree`, `QListWidget`, `QTreeView`, `QTableView`,
`QAbstractItemView`, `OBSBasicSettings QListWidget`,
`OBSBasicFilters QListWidget`, and `OBSDock > QWidget`.
These surfaces are for reading and editing, not decoration. Native OBS
before/after screenshots show clean scene lists, source lists, audio
controls, Settings sidebar, and dock bodies while the pattern remains
visible around them and behind the Settings groups.

The test now pins **which Qt selectors may carry the artwork**, rather than
merely counting repeated background rules. An actual QtSVG probe renders the
remaining Settings page tile (the original probe targeted a now-solid
SceneTree). Do not add `background-repeat`; the Linux Qt renderer omits
the pattern with CSS-style repeat overrides.

Pattern choice and strength remain wholly owned by the Lua Pattern Manager.
This patch does not replace `pattern.svg`, alter its authored color,
reduce a user's selected intensity, or change `user.ini`. A separate
unresolved limitation: bundled SVGs use a common hardcoded ink color,
not a per-palette semantic tint. Qt does not interpolate QSS variables
inside external SVGs. Avoid claiming palette-aware pattern recoloring
until an asset-generation/selection path exists and is verified across
variant changes.

## Settings scroll surfaces — 2026-10-16

The OBS Settings dialog's pages include `QScrollArea` contents that Qt sets
to `autoFillBackground`. Our general `QScrollArea > QWidget > QWidget {
background: transparent; }` rule made those pages paint **black** regardless
of the selected variant, even while `--bg_window` resolved correctly. The
transparent SVG tile then painted its ink over black rather than the theme's
background. This affected light variants too.

The base now overrides only `OBSBasicSettings QScrollArea > QWidget > QWidget`
with `background-color: var(--bg_window)` and the existing SVG image; it does
not change scroll areas in other OBS dialogs. The real Qt regression in
`test/theme-qt-render.test.js` exercises the Settings scroll hierarchy under
base, Carbonfox and Catppuccin Latte palettes and rejects a deliberate return
to transparent. Native OBS theme parsing is checked separately.

## OBS Settings combo-box geometry under Compact density — 2026-10-16

The Advanced page's Qt `QComboBox` widgets were squeezed to **16 px**
despite a **26 px sizeHint** with FontScale=10 and Density=-3 (Compact).
Native OBS's Settings form layouts compressed the rows because the generic
QSS `min-height: var(--input_min_height)` produced only a nominal size hint
and left the widget's effective `minimumHeight` at **8 px**.

A targeted `OBSBasicSettings QComboBox` rule uses
`--settings_combo_min_height` (a font-scaled token, 18px at scale 10).
In native OBS 32.2 with the unchanged Compact density this forces an actual
minimum and rendered height of **26 px** for Color Format, Color Space,
Color Range, IP Family and Bind to IP. It leaves combos outside Settings,
their icons, and OBS's density preference untouched.

`test/theme-qt-render.test.js` and `test/helpers/qss-probe.py` check
the **actual Qt minimumHeight**, not only sizeHint. The test fails on the
original QSS (`minimumHeight=8`) and on a deliberately regressed rule
setting the Settings combo minimum to zero. The final variable-driven rule
was also verified in an isolated native OBS Settings window.

## OBS Settings numeric/text input geometry — 2026-10-16

The Impeccable-focused review of the native Settings UI found an additional
Compact-density mismatch after the dropdown repair: `QSpinBox`,
`QDoubleSpinBox`, and `QLineEdit` instances in Settings could be compressed
to 16 px while the font's line height was 16 px and the control sizeHint was
26 px. The existing generic input height rule did not constrain their actual
minimumHeight (8 px).

The base theme now applies a **Settings-scoped** minimum to
`OBSBasicSettings QAbstractSpinBox` and `OBSBasicSettings QLineEdit`.
`--settings_form_min_height` shares the existing font-scaled
`--settings_combo_min_height`; the fix does **not** change global OBS
density, icons, variant colors, or non-Settings widgets.

The offscreen Qt regression in `test/theme-qt-render.test.js` failed on
the old source (`QSpinBox minimumHeight=8`) and passed with this rule,
including a deliberate invalid-minimum mutation. A separate real OBS 32.2
capture of the Advanced page confirmed actual 26 px heights **and actual
minimumHeight=26** for `colorFormat`, `colorSpace`, `colorRange`,
`sdrWhiteLevel`, `hdrNominalPeakLevel`, `filenameFormatting`,
`simpleRBPrefix`, `reconnectRetryDelay`, and `reconnectMaxRetries`.
All captures used FontScale=10, Density=-3 in an isolated OBS profile.

This is a bounded interface-polish change. The wider Settings layout is
owned by OBS forms; no global typography, panel, or navigation redesign
is implied by this result.

## Surface-aware legibility roles — 2026-10-16

A real OBS 32.2 Settings screenshot exposed unreadable disabled labels,
unselected category labels, and checkbox outlines. These were not absent
palette tokens: the styled controls were painted on a different surface from
the one their source foregrounds had been chosen for.

An audit of the 160 variants plus base found, before repair:
- 94/161 with disabled text below 3:1 on group panels;
- 83/161 with sidebar muted text below 4.5:1 on dock surfaces;
- 20/161 with ordinary button text below 4.5:1 on button surfaces;
- 161/161 with unchecked checkbox base fill below 3:1 on group panels.

`scripts/theme-state-tokens.mjs` now derives background-specific inks for
dock/base/preview panels, headings, buttons, inputs (normal/hover/focus),
interactive list hover, and subdued and disabled states. Normal readable
text targets 4.5:1; deliberately disabled text and checkbox outlines target
3:1. Derived token values are produced for each variant using its actual
resolved palette; the source palette seeds, annotated historical comments,
and theme identities are preserved. Eight-digit RGBA ink and translucent
list-hover backgrounds are composited over their intended backing surfaces
before contrast is evaluated. The sparse Catppuccin sibling generator
inherits base variables before computing these roles.

`test/theme-surface-legibility.test.js` independently checks the shipped
roles against their surfaces across all 161 files.
`test/helpers/qss-probe.py` now checks the Settings group children through
real Qt painting/palette state, and its deliberately broken controls are
rejected. An isolated OBS 32.2 Settings window with SLSO8 Pixels visibly
confirmed that disabled labels and unchecked control outlines had returned,
and that unselected sidebar labels were readable.

**Native Settings outer frame — closed 2026-10-16:** The earlier
QDialog-level attempts did not fix the black gutters. Direct native OBS 32.2
widget inspection via `QApplication::widgetAt` found that the actual
`OBSBasicSettings` top-level QWidget had `QPalette::Window = #000000`,
even while its scroll pages were correctly themed. An opaque
`OBSBasicSettings { background: var(--bg_window); }` rule corrects the
actual owner, but **its ordering is significant**: applying it before the
generated icon rules still left light variants black. The final rule emitted
by `renderButtonIconRules` is now the opaque Settings background, keeping
the behavior stable across `pnpm sync:themes`. Native captures of the actual
Settings window verified dark EvondevDracula (`#191a2e`) and light
Catppuccin Latte Blue (`#eff1f5`) margins instead of black, without
removing SVG patterns from the child panes. The smaller offscreen Qt fixture
did not reproduce the failing native window, so the source-level contract
and actual native capture are complementary evidence, not interchangeable.

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
