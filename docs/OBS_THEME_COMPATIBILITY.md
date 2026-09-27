# OBS Theme Compatibility

Colorway is a custom OBS base theme, so it owns the styling contract for widgets that OBS adds or changes.

## Upstream baseline

Compatibility was audited against:

- `obsproject/obs-studio@ea7536c49cb84420296d3831cda526c232fed3bc`
- `frontend/data/themes/Yami.obt`

OBS currently recommends using Yami as a base for custom themes because standalone `.obt` base themes do not automatically receive new widget styling. Colorway intentionally remains a base theme for now because it has substantial custom QSS, icon, surface, mixer, and layout behavior. A future Yami-inheritance migration should be tested in OBS before changing that architecture.

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

The wiki explicitly permits a variant to extend another variant as long as the dependency chain ends at a base theme. That makes a future `Yami.obt → Colorway.ovt → Colorway-*.ovt` migration a supported architecture. It still needs OBS runtime testing before replacing Colorway's standalone base because variant QSS is appended after its parent and specificity determines which rule wins.


## Automated upstream watch

`pnpm check:obs-upstream` checks the real `obsproject/obs-studio` repository against the reviewed baseline in `scripts/obs-upstream-baseline.json`.

It watches:

- `frontend/data/themes/Yami.obt` for theme-variable and selector drift.
- `frontend/OBSApp_Themes.cpp` for theme-parser drift.

When an upstream source changes, the command prints the new upstream commit plus structural additions/removals and exits non-zero. It does **not** automatically copy Yami rules into Colorway or advance the baseline. The baseline only moves after a human review determines whether the upstream change matters to Colorway.

`.github/workflows/obs-upstream-watch.yml` runs the same deterministic check weekly and can also be triggered manually.
