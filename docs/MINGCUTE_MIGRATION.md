# MingCute icons in Colorway

The **Colorway OBS base theme**, all 160 curated variants, the web preview, ZIP
exports and the direct installer use MingCute SVG assets. There is no Iconamoon
or legacy OBS-design status artwork in the distribution.

## Provenance

- Original project: https://github.com/mingcute-design/mingcute-icons
- Pinned upstream revision: `ca98bb55513a22ff0dab713aaf7870b512944653`
- Original SVG paths: `packages/svg/core-regular/*.svg` and
  `packages/svg/core-filled/*.svg` at that revision
- License: Apache-2.0 (bundled with every package at
  `themes/icons/colorway/mingcute/LICENSE`)

`icons/mingcute-map.json` is the explicit meaning-preserving mapping from
Colorway's OBS roles to upstream icon names, including six active/inactive
streaming, recording and network state indicators. Original SVGs are vendored
under `icons/vendor/mingcute/`. These are the original upstream paths, not
reconstructed or fabricated glyphs. Generated 16-pixel SVGs live under
`icons/colorway/mingcute/` and are copied to the web distribution.

`scripts/build-mingcute-icons.mjs` preserves the standard upstream 24×24 paths,
adds 16×16 dimensions for Qt, and replaces `currentColor` with fixed, contrast-
tested foregrounds (`#e0def4` and `#191724`). The monitoring-off derivative adds
an explicit cancellation slash to the pinned headphone path. The dedicated
`zoom/` assets use pixel-aligned 8×8 plus/minus geometry for the native preview
toolbar; they are documented adaptations, not unchanged upstream SVGs.
Qt does not re-tint the SVGs
based on CSS variables. Function-valued OBS variables in `@OBSThemeVars` are written as quoted strings
(`'url(theme:...)'`), as required by the OBS 32.2 lexer. The browser parser
decodes these values for CSS; Qt/OBS receives unquoted CSS after theme substitution.
The generator runs automatically during
`pnpm sync:themes` and requires no network or new package dependency.

## Coverage

- Semantic glyph names and their pinned sources are listed in `icons/mingcute-map.json`
- Six state indicator SVGs generated from MingCute filled/regular shapes
- Nine Settings-only two-tone MingCute glyphs that remain visible on both
  ordinary navigation surfaces and selected accent rows
- `Colorway.obt` uses only `theme:icons/colorway/mingcute/...` paths
- Light-theme direct checkbox references and generated state tokens also use
  the new paths
- Mixer muted/monitoring/warning assets bake palette-derived, surface-tested
  semantic ink; themes with the same ink share the same generated SVG
- Four dedicated pixel-aligned zoom assets cover both glyphs and ink polarities
- Downloads package every asset in `public/theme-assets.json`, including patterns,
  font license, and MingCute license
- `scripts/copy-themes.sh` installs the MingCute tree without modifying OBS
  settings or deleting files from the user's active OBS installation

For regeneration run `pnpm sync:themes`. The migration contract compares standard
and mixer SVGs to their pinned-source transformations, validates the documented
derivatives, public mirror, generated OBS references, and full ZIPs. Real Qt pixel
checks cover the dedicated zoom artwork at its native size.

## Active icon color coherence — 2026-10-18

The source context bar's Properties and Filters buttons are bound by their
`sourcePropertiesButton` / `sourceFiltersButton` object names: OBS supplies
resource icons without an icon class or `themeID`. Their normal/hover glyphs
use the derived button-background ink role; pressed/checked states use the
corresponding accent ink roles. The native OBS gate renders both actual
controls, including Fairyfloss, instead of relying on class-bound test buttons.

OBS SVG assets are fixed-color MingCute glyphs (light `#e0def4`, dark
`#191724`); QSS does not recolor them at runtime. Previously, the
generator selected whichever asset had maximum contrast with the button
surface. This sometimes picked a **dark glyph next to white button text**
on the same medium-dark accent. The affected shipped variants were
**Fairyfloss**, **Twitch Dark**, and **Vercel**.

`scripts/theme-state-tokens.mjs` now prefers the asset polarity that
matches `--on_primary` or `--on_primary_hover` text *when* the asset still
meets 3:1 minimum silhouette contrast. It uses the maximally contrasting
polarity only if the matching one cannot be read. This keeps the intended
accent backgrounds and 160 authored palette seed colors unchanged.

All corpus-wide contrast checks, Qt normal/pressed/checked icon checks for
these variants, and native stylesheet/parser checks must continue to pass.
This fixes an identified visual inconsistency, not arbitrary SVG recoloring.

**Settings navigation:** Qt uses one QIcon for each Settings category
for both ordinary and selected rows; QSS does not dynamically recolor
its original SVG by item selection. A single normal/dark asset was too
faint on saturated selected accents across the catalog. We now bake
nine dedicated `nav/` icons directly from the same pinned MingCute paths:
a restrained 0.6–0.7px dark contour supports the original-width light
glyph. Qt/OBS captures of Fairyfloss and Catppuccin Latte Blue confirmed
the visual treatment on dark and light navigation, without changing
the existing selection fills, focus outline, or interface layout. All
nine SVGs are shipped with the catalog; they are not runtime-generated
or downloaded from a new provider.

## Native mixer states and preview zoom

OBS's real mixer controls are `.btn-mute` / `.btn-monitor` QPushButtons, not
`QCheckBox[themeID="muteCheckBox"]`. Their render-time `icon:` rules select
distinct unmuted, muted, monitoring-on/off, and warning glyphs. Both native
`.checked` classes and Qt `:checked` states are supported. Monitor Only warning
classes (`mute-warning` and legacy `mute-unassigned`) take precedence over a
checked mute glyph.

The mixer stays on `--bg_base` in normal, checked, hover, and pressed states.
`--on_mixer_muted`, `--on_mixer_monitor`, and `--on_mixer_warning` derive readable
ink from the original danger/success/warning seeds, with at least 3:1 contrast
against that surface. The generator bakes matching `mixer/` SVGs and state-token
URLs without changing palette seeds. Preserve this ink/surface pairing; a generic
primary-button hover fill can invalidate its contrast guarantee.

Preview zoom retains its native 20×16 button footprint and explicit 8px icon
canvas. The `zoom/` glyphs have whole-pixel strokes instead of scaling 24-unit
paths into faint fractional pixels. Padding is bounded without relying on an
ineffective native icon-size override. The general toolbar add/remove assets
remain unchanged.

`pnpm check:obs-native` renders the actual mixer/zoom controls across representative
dark/light variants and checks distinct state glyphs, warning precedence, crisp
zoom strokes, and the retained source-context/visibility corrections. Mixer state
consumers are tested without clicking controls or changing audio routing.

## Verification limits

The generated SVGs are valid XML and were accepted by Qt SVG rendering.
Colorway's Qt stylesheet/state tests and the browser preview check integration,
but a visual pass in the user's actual OBS version is still required for
pixel-level icon clarity, scaling and placement.

Older installed Iconamoon files may remain unused in an OBS theme directory.
They are not required by the new themes. Installation is deliberately
non-destructive; uninstall old assets manually only after confirming no other
installed themes reference them.
