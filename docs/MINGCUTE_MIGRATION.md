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

`scripts/build-mingcute-icons.mjs` preserves the upstream 24×24 path geometry,
adds 16×16 dimensions for Qt, and replaces `currentColor` with fixed, contrast-
tested foregrounds (`#e0def4` and `#191724`). Qt does not re-tint the SVGs
based on CSS variables. Function-valued OBS variables in `@OBSThemeVars` are written as quoted strings
(`'url(theme:...)'`), as required by the OBS 32.2 lexer. The browser parser
decodes these values for CSS; Qt/OBS receives unquoted CSS after theme substitution.
The generator runs automatically during
`pnpm sync:themes` and requires no network or new package dependency.

## Coverage

- 51 semantic glyph names, two color polarities each (102 OBS-compatible SVGs)
- Six state indicator SVGs generated from MingCute filled/regular shapes
- Nine Settings-only two-tone MingCute glyphs that remain visible on both
  ordinary navigation surfaces and selected accent rows
- `Colorway.obt` uses only `theme:icons/colorway/mingcute/...` paths
- Light-theme direct checkbox references and generated state tokens also use
  the new paths
- Downloads package all 117 icons, patterns, font license, and MingCute license
- `scripts/copy-themes.sh` installs the MingCute tree without modifying OBS
  settings or deleting files from the user's active OBS installation

For regeneration run `pnpm sync:themes`. The migration contract compares each
shipped SVG byte-for-byte to its transformation from the pinned source,
validates the public mirror and generated OBS references, and checks full ZIPs.

## Active icon color coherence — 2026-10-18

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

## Verification limits

The generated SVGs are valid XML and were accepted by Qt SVG rendering.
Colorway's Qt stylesheet/state tests and the browser preview check integration,
but a visual pass in the user's actual OBS version is still required for
pixel-level icon clarity, scaling and placement.

Older installed Iconamoon files may remain unused in an OBS theme directory.
They are not required by the new themes. Installation is deliberately
non-destructive; uninstall old assets manually only after confirming no other
installed themes reference them.
