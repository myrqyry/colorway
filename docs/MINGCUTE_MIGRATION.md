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
based on CSS variables. The generator runs automatically during
`pnpm sync:themes` and requires no network or new package dependency.

## Coverage

- 50 semantic glyph names, two color polarities each (100 OBS-compatible SVGs)
- Six state indicator SVGs generated from MingCute filled/regular shapes
- `Colorway.obt` uses only `theme:icons/colorway/mingcute/...` paths
- Light-theme direct checkbox references and generated state tokens also use
  the new paths
- Downloads package all 106 icons, patterns, font license, and MingCute license
- `scripts/copy-themes.sh` installs the MingCute tree without modifying OBS
  settings or deleting files from the user's active OBS installation

For regeneration run `pnpm sync:themes`. The migration contract compares each
shipped SVG byte-for-byte to its transformation from the pinned source,
validates the public mirror and generated OBS references, and checks full ZIPs.

## Verification limits

The generated SVGs are valid XML and were accepted by Qt SVG rendering.
Colorway's Qt stylesheet/state tests and the browser preview check integration,
but a visual pass in the user's actual OBS version is still required for
pixel-level icon clarity, scaling and placement.

Older installed Iconamoon files may remain unused in an OBS theme directory.
They are not required by the new themes. Installation is deliberately
non-destructive; uninstall old assets manually only after confirming no other
installed themes reference them.
