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
