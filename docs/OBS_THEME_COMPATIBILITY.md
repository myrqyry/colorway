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


## Automated upstream watch

`pnpm check:obs-upstream` checks the real `obsproject/obs-studio` repository against the reviewed baseline in `scripts/obs-upstream-baseline.json`.

It watches:

- `frontend/data/themes/Yami.obt` for theme-variable and selector drift.
- `frontend/OBSApp_Themes.cpp` for theme-parser drift.

When an upstream source changes, the command prints the new upstream commit plus structural additions/removals and exits non-zero. It does **not** automatically copy Yami rules into Colorway or advance the baseline. The baseline only moves after a human review determines whether the upstream change matters to Colorway.

`.github/workflows/obs-upstream-watch.yml` runs the same deterministic check weekly and can also be triggered manually.
