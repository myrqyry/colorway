# Theme override normalization design

**Status**: Draft
**Author**: opencode
**Date**: 2026-07-11

## Goal

Make every `Colorway-*.ovt` file declare the same explicit set of color
variables, in the same order, so every theme file has a consistent shape.
Theme-specific styling stays in `Colorway.obt`; `.ovt` files only override
colors.

## Background

The current theme set is inconsistent in two ways:

- Some `.ovt` files omit variables that other themes declare.
- Some `.ovt` files repeat styling defaults that belong in the base theme.

That creates uneven file sizes, uneven override density, and drift between
themes. The user wants full consistency across all themes, with no missing
overrides in any `.ovt` file.

The repo already has a base theme file, `Colorway.obt`, that is the right
place for shared styling, layout defaults, and non-palette token behavior.

## Design

### 1. Canonical `.ovt` contract

Every `Colorway-*.ovt` file must declare the same 40 variables:

- `--bg_window`
- `--bg_base`
- `--bg_preview`
- `--bg_dock`
- `--bg_hover`
- `--text`
- `--text_light`
- `--text_muted`
- `--text_disabled`
- `--text_inactive`
- `--text_inverse`
- `--primary`
- `--primary_light`
- `--primary_lighter`
- `--primary_dark`
- `--primary_darker`
- `--input_bg`
- `--input_bg_hover`
- `--input_bg_focus`
- `--input_border`
- `--input_border_hover`
- `--button_bg`
- `--button_bg_hover`
- `--button_bg_disabled`
- `--list_item_bg_hover`
- `--list_item_bg_selected`
- `--border_color`
- `--accent_bg_start`
- `--accent_bg_end`
- `--warning`
- `--danger`
- `--success`
- `--meter_bg_nom`
- `--meter_bg_war`
- `--meter_bg_err`
- `--meter_fg_nom`
- `--meter_fg_war`
- `--meter_fg_err`
- `--ico`
- `--ico_selected`

These keys are the full required `.ovt` surface. No theme file may omit one of
them.

### 2. Color-only override rule

`.ovt` files must contain only color tokens. That means:

- No typography overrides.
- No spacing, sizing, layout, or border-radius overrides.
- No component structure overrides.
- No style defaults that can live in `Colorway.obt`.

If a token is part of the canonical color set, the theme file may declare it.
If it is not a color token, it belongs in `Colorway.obt`.

### 3. Base theme responsibility

`Colorway.obt` remains the shared styling base. It owns:

- Layout and component defaults.
- Shared structural styling.
- Shared fallback values for the preview and interface.

The base theme can still define default values for tokens, but `.ovt` files must
override the full canonical color set so each theme file stays self-contained
and consistent.

### 4. File normalization

All `.ovt` files must use the same variable order. The normalization pass will:

- Sort theme variables to the canonical order.
- Replace inherited or indirect variable references with explicit values.
- Keep the color values theme-specific, but make the declaration set identical.
- Leave `Colorway.obt` as the single source of truth for non-color styling.

### 5. Validation

The contract test must enforce three things:

- Every `.ovt` file declares all 40 canonical variables.
- Every `.ovt` file declares no non-color tokens.
- Readability checks still pass for base text and inverse button text.

The test should fail if a theme file adds a non-color override or omits one of
the canonical keys.

## Alternatives considered

### Patch only the missing keys

- **Pros**: Lowest churn.
- **Cons**: Leaves inconsistent file shapes and does not satisfy the goal.

### Generate `.ovt` files from a template

- **Pros**: Strongest long-term consistency.
- **Cons**: Adds generation tooling and makes hand-edits less direct.

### Keep inheritance-only enforcement

- **Pros**: Easy to validate resolved theme values.
- **Cons**: Still allows missing declarations in the `.ovt` files themselves.

## Decision

Use explicit per-file normalization. Every `.ovt` file declares the same 40
color variables, in the same order, and nothing else.

## Files expected to change

- `Colorway-*.ovt`
- `Colorway.obt`
- `test/new-themes-contract.test.js`

## Validation

Before implementation is considered complete, verify:

1. Every `Colorway-*.ovt` file contains the same canonical key set.
2. No `.ovt` file contains non-color overrides.
3. `node --test test/new-themes-contract.test.js` passes.
4. `node --test` passes.

## Next steps

After user review, write the implementation plan and normalize the theme files.
