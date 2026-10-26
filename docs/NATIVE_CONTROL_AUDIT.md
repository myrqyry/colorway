# Native OBS control audit — 2026-10-25

Status: mixer findings repaired and pixel-aligned zoom improvement verified.
The original observations below are retained as the failure record.

## Scope and evidence

Inspected actual OBS 32.2.0 / Qt 6.4.2 controls under isolated X11/Xvfb
configurations, using the current working-tree themes. Compared 90s Anime and
Catppuccin Latte Blue at Appearance Density=-2 and Density=1, FontScale=10.
The main window, Sources, scene/source toolbars, mixer controls, source context
bar, preview scaling controls, and all nine Settings categories were visited.
The dark Hotkeys page was revisited after its asynchronous loading completed.

The audit collected native widget geometry, effective text palettes, indicator
rectangles, and rendered control/window captures. Suspicious measurements were
checked against actual pixels instead of treating every small control as broken.
Only disposable OBS instances were instrumented. This inspection made no further
theme or installed-configuration changes.

Machine-local captures and diagnostic records are retained under
`.meristem/local/native-control-audit-2026-10-25/` (ignored).

## Findings and repairs

### 1. Mixer mute buttons retain black resource glyphs on dark themes

**Observed:** Enabled `.btn-mute` controls render black speaker glyphs on the
dark mixer surface. In the 90s Anime capture the normal button-text palette is
`#e0e1dd`, but the glyph pixels are RGB `#000000`, including 40 fully opaque black
pixels in each captured 20×18px button. The surrounding mixer surface is
`#13062b`. The native icon is not adopting the light text ink.

**Implementation before repair:** `themes/Colorway.obt`, “Volume Control Buttons” and
“Mute Button” sections. These rules set color and state styling, but do not bind
the native button's icon. `scripts/theme-state-tokens.mjs` generates render-time
icon rules for icon classes, theme IDs, and the two source-context button IDs;
`.btn-mute` is not included. The separate
`QCheckBox[themeID="muteCheckBox"]` indicator rules do not target the actual
`QPushButton` mixer controls observed in this OBS version.

**Repair direction:** Add explicit native mixer icon-state bindings. Exercise
unmuted, muted, pressed/hover, and Monitor Only warning states on the actual
controls. Preserve mute/warning semantics rather than supplying one permanent
speaker image for every state. Existing `volume-high.svg` and `volume-mute.svg`
assets cover the ordinary states; a warning state needs its own meaningful
glyph and readable ink.

**Resolution:** Render-time mixer rules bind distinct speaker/mute glyphs and a
separate warning asset. Muted/warning inks are derived from each palette's
danger/warning colors, then contrast-corrected against the stable neutral mixer
surface. The idle active-state outline shares that semantic ink. Native checked/hover/
pressed states and both warning class names are covered, including warning
precedence when the button is also checked.

### 2. Mixer monitoring buttons have the same missing ink integration

**Observed:** Enabled `.btn-monitor` controls beside the mute buttons render
black headphone glyphs on the same dark surface. Their effective button-text
palette is also light. The normal-state captures contain only black RGB values
where the glyph has nonzero alpha; this is not a disabled-control effect.

**Implementation before repair:** `themes/Colorway.obt`, “Monitor Button” section.
The stylesheet provides checked/success and focus styling, but no monitor icon
binding. These controls also fall outside the generated icon-class rules.

**Repair direction:** Bind distinct monitoring-on/off glyphs with readable
normal-state ink and the intended active-state treatment. Verify both monitoring
states without changing the user's audio-routing configuration. Do not substitute
a volume glyph merely because that asset already exists.

**Resolution:** Added a pinned MingCute headphone source, a documented slashed
off-state derivative, and per-palette success-ink assets for the on state.
Native monitoring buttons render the correct off/on shapes with readable ink.
The fixes affect painting, not OBS audio-routing behavior.

## Suspicions not promoted to confirmed defects

- **Preview zoom `+`/`−`:** The native UI uses an 8×8px icon size. Its tiny `+`
  has low-alpha antialiased arms and looks nearly dot-like at display size.
  Generic button padding also produces a negative reported content width.
  However, an isolated zero-padding/zero-margin stylesheet control corrected
  that reported rectangle without changing the actual glyph pixels: the `+`
  remained a complete 6×6px footprint, with only four pixels at alpha ≥128.
  A stylesheet `icon-size: 12px` request did not change the native rendering
  either. These observations do not establish padding-induced clipping or a
  working theme-only enlargement. Do not claim that a padding edit fixes it.
  **Improvement:** Dedicated pixel-aligned `zoom/` plus/minus glyphs provide
  opaque strokes at the original eight-pixel size. Padding was bounded while
  preserving the native 20×16 button footprint; no enlargement is claimed.
- **Toolbar action labels:** Icon-only QToolButtons retain action text such as
  “Move Down” for tooltips/accessibility. Text wider than their button rectangles
  is not evidence of clipped visible labels; rendered captures show icons.
- **Inactive status indicators:** Dim/inactive signals were not treated as
  enabled icon-color failures without exercising their active states.

## Checks that found no additional clipping

- Native visibility/lock indicator rectangles remain inside both their widgets
  and Sources rows after the prior fix, at both audited densities.
- Source Properties/Filters glyphs retain the prior light/dark state correction.
- No additional checkbox-indicator overflow or button-text-height overflow was
  found in the collected Settings controls, including loaded Hotkeys controls.
- The observed Settings icon-class bindings have corresponding theme rules.

These are scoped observations, not approval of every widget/state in the corpus.
This pass did not exhaustively scroll every Settings page, exercise every combo
popup, test high-DPI/font-scale combinations, open every source-specific dialog,
or inspect third-party plugin controls. The running user's refreshed UI still
requires a theme reload/restart and manual approval.

## Delivery verification

- The full Node suite, including real Qt mixer/zoom rendering and negative
  controls, passes. Read `pnpm test` for the current totals.
- `pnpm build` passes; the source/public mirror and complete asset manifest are
  verified by the packaging and icon contracts.
- Native OBS base, Latte Blue, Monokai, Fairyfloss, and 90s Anime pass at compact
  and normal density. Each run checks 21 mixer state/glyph combinations and
  both zoom controls, alongside the earlier context-button and source-row fixes.
- The native probe fails against the pre-fix installed base for all mixer cases
  and both faint zoom glyphs. The new checks therefore detect the actual prior
  failure rather than merely accepting new token names.
- Native mixer state consumers are exercised on the actual QPushButtons without
  emitting `clicked()` or changing real mute/monitor routing. Actual audio
  recording/monitoring behavior is outside this styling change's verification.
- Changed installed theme files were backed up; source, public mirrors, and
  installed themes/icon assets were byte-verified. User settings and the custom
  pattern were hash-verified unchanged. The running OBS instance was not restarted.
