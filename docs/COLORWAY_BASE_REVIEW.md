# Colorway base theme review

Reviewed 2026-10-06. Scope: the complete `themes/Colorway.obt`, its referenced assets,
existing theme contracts, and the download path needed to deliver those dependencies.
Line references below describe the theme at review time.

## Delivery update — fixes applied

All eight findings and the asset-delivery issue are implemented. The original findings
below remain as the rationale; their line numbers refer to the pre-fix theme.

- **Contrast:** generated `--on_primary`, `--on_primary_hover`, and `--on_primary_dark`
  choose readable ink without replacing palette seeds. Scene grids, YouTube selections,
  primary buttons, and other accent-filled selections consume the corresponding role.
  The source picker uses a stable neutral surface and accent selection border: real Qt
  testing showed that a parent pseudo-state does not reliably update its child label.
- **Icons:** generated `--cw_icon_*` URL tokens select existing fixed-color SVGs by
  contrast, including light variants. Ordinary checkbox glyphs and source indicators have
  stable neutral surfaces. QPushButtons use render-time `icon:` state rules; QToolButtons
  keep neutral surfaces with accent state borders. Unsupported item-descendant/pseudo-state
  `qproperty-icon` swaps are removed; valid repolished Idian runtime classes are retained.
- **Fonts:** removed QSS `@font-face` and browser-only family aliases. Qt-compatible
  fallbacks remain, and the bundled font has explicit OS-installation instructions.
  Also repaired the browser preview's separate, genuinely supported web-font URL.
- **Selectors/cascade:** corrected `:flat` and tab placement, restored combo focus colors,
  isolated pressed scrollbar handles from page areas, and restored font-scaled group-title
  spacing in pixel units. Removed late tab rules that erased the selected top-tab border.
  Inputs and list rows reserve their focus/hover border widths where practical.
- **Hover semantics:** replay/virtual-camera active hover uses the existing contrast-tested
  hover surface/text pair rather than a baked lavender gradient.
- **Delivery:** the visible Settings action now defaults to a complete catalog ZIP; its
  menu retains explicit raw `.ovt` exports. External imported/generated snapshots retain
  their raw export path. The ZIP has the required `themes/icons/` and `themes/patterns/`
  layout, base inclusion, font/OFL license, and `INSTALL.md`. The legacy Browse download
  uses the same package builder. The local copy script also copies icon/pattern dependencies.

`scripts/theme-state-tokens.mjs` owns the generated state-token and button-icon blocks.
`pnpm sync:themes` updates those blocks, mirrors the base and variants/assets, and emits
the browser's asset manifest. Generated sibling output remains contract-tested.

### Verified delivery evidence

- `pnpm test`: **601 tests, 600 pass, 0 fail, 1 skipped** in the local environment.
- `pnpm build`: **passes**, with the prior unresolved browser-font warning eliminated.
- `git diff --check`: **passes**.
- Independent contrast calculations cover the composed base plus all **159 variants**:
  generated ink is at least **4.5:1**, and generated glyph silhouettes at least **3:1**
  on their designated surfaces. Filled-checkbox interior ticks are checked separately.
- Offscreen **Qt/PyQt 6.11** checks exercise normal/pressed/checked/checked-hover icons,
  checked tool icons, source-picker labels, combo focus, scrollbar pages, and group geometry
  on the base and representative light/dark variants. These tests also reject deliberately
  broken controls. Qt tests skip explicitly when PyQt6 is unavailable.
- The same Qt probes fail on the prior base revision for the actual pressed-icon,
  combo-focus, scrollbar-page, and group-title failure mechanisms. Only expected-value
  token definitions were supplied to that old QSS; its rules were not repaired for the probe.
- **Chromium runtime:** the visible Settings “Download ZIP” action successfully downloads
  a package, with no JavaScript exceptions or failed ordinary asset responses. A forced
  missing-icon response displays the HTTP error, re-enables the action, and downloads
  no partial ZIP.
- Python's independent ZIP reader verifies CRCs and source byte identity for the downloaded
  archive: **117 entries**, including all **98 icons**.
- The local copy script was exercised against an isolated destination and delivered the
  base and all required icon/pattern assets.
- A repeated sync leaves every source-theme/public artifact byte-identical to its previous
  run. All **22 frozen palette comments** remain identical to their pre-change records.

**Remaining verification boundary:** the actual OBS Appearance UI, source tree, menus,
disabled states, and high-contrast mode still need a visual pass in OBS. Real Qt checks
are stronger than source assertions, but they do not replace OBS integration or human
visual review. No installed OBS theme or user configuration was changed by this work.

Installation instructions: [`INSTALL.md`](INSTALL.md).

## Original review summary

The standalone base architecture is sound. Metadata is valid, every `var(--name)`
reference has a definition (including OBS's two injected runtime variables), font and
density hooks are present, and the public theme mirror matches the source byte-for-byte.
The most worthwhile corrections are state-specific contrast, ineffective icon swaps,
unsupported font loading, and a handful of selector/cascade mistakes.

No theme, asset, application, or test implementation was changed during this review.

## Findings, in priority order

### 1. Several selected controls use the wrong foreground — high

**Locations:** `themes/Colorway.obt:1345–1367`, `1397–1417`, and `1661–1664`.

- Scene grid items explicitly start with `color: var(--text)`. The selected and
  checked rules replace the background with the accent without replacing the foreground;
  only selected-plus-hover supplies `--text_inverse`.
- YouTube event labels explicitly use `--text`. The selected rule changes only the
  background, and selected-plus-hover explicitly keeps `--text` on `--primary_light`.
- Checked `SourceSelectButton` changes the background to `--primary`, while its labels
  have no matching selected foreground rule.

With the base palette, `--text` on `--primary` is **1.59:1**, and `--text` on
`--primary_light` is **1.00:1**: the latter is literally the same color.
These are source-level color-pair defects; the exact affected widget rendering still
needs an OBS check.

**Correction:** specify the corresponding on-accent foreground for each selected/checked
rule and, where necessary, for child labels. Audit the normal, hovered, selected, and
selected-plus-hover pairs together. The source-picker icon also needs an appropriate
fixed-color asset for the selected surface.

Related: `.button-primary` at lines **472–486** uses the normal button foreground on
`--primary_dark` (base contrast **2.87:1**) and on `--primary` when focused/hovered.
Give this role an explicit foreground/background contract too.

### 2. Icon polarity and the state-swap mechanism both need correction — high

**Locations:** `themes/Colorway.obt:581–730`, `1228–1263`, `1293–1303`,
`2526–2534`, and `3134–3171`.

There are two independent problems:

1. The ordinary checked checkbox uses `--icon_check`, whose SVG stroke is
   `#e0def4`, on the base accent `#c4a7e7`: **1.59:1**. On checked hover, the surface
   becomes `#e0def4`, giving the glyph **1.00:1**. The selected/dark `check.svg`
   already exists but this rule does not use it. Table checkboxes have a different
   surface contract, so their separate `--checkbox_check_icon` should stay separate.
2. The purported source-row hover swaps still point at `normal/` assets. Meanwhile,
   the large generic swap blocks assign `qproperty-icon` under `:selected:hover`.
   Qt documents that `qproperty-*` assignments happen when widgets are polished,
   rather than being reevaluated as hover pseudo-states change. These blocks therefore
   do not provide a reliable hover-driven icon swap. Item sub-controls also are not
   actual QObject parents of descendant buttons; those selectors should not be treated
   as item-to-widget state propagation.

**Correction:** use the proper fixed-color glyph for the checkbox's actual background;
use state-aware `image:` rules for indicator sub-controls. For real button icons,
verify the widget's supported state/update mechanism rather than relying on a
pseudo-state `qproperty-icon` assignment. OBS runtime class changes that explicitly
repolish widgets are a separate mechanism and should not be removed indiscriminately.

The previously recorded light-variant icon issue in `.meristem/ERRORS.md:124–154`
also remains relevant: baked SVG colors do not follow text tokens. `--ico` overrides
cannot tint these SVG files. Do not retry `currentColor` or CSS-variable fills as a fix.

### 3. The bundled font is not loaded by `@font-face` — medium

**Locations:** `themes/Colorway.obt:732–738` and `3185–3193`.

Qt widget QSS does not implement browser web-font loading through `@font-face`.
Qt's stylesheet parser skips unknown at-rules, and the inspected OBS theme loader
contains no font-registration step that implements this block. Downloading or placing
the TTF beside the theme does not make the family available to Qt.

The root family list also includes browser-specific names (`system-ui`,
`-apple-system`, `BlinkMacSystemFont`), which are not portable Qt system-font aliases.
The working root `font-family` property itself is valid and need not be removed.

**Correction:** if Bricolage Grotesque is part of the intended design, install it as a
real OS font and verify OBS resolves it. Replace the misleading loading comment/rule
and use a deliberately tested Qt fallback list or inherit the host font. Preserve
`--font_base` and its `--obsFontScale` dependency.

### 4. Three rules use sub-control syntax for pseudo-states — medium

**Locations:** `themes/Colorway.obt:2154`, `2797`, and `2802`.

- `QPushButton::flat` should be `QPushButton:flat`.
- `QTabBar::top` and `QTabBar::bottom` refer to nonexistent sub-controls.
  `:top` / `:bottom` are states; when styling the tabs themselves the intended
  targets are `QTabBar::tab:top` and `QTabBar::tab:bottom`.

These rules do not target what their names imply. Valid tab-placement rules already
exist elsewhere in the file, so first decide whether the invalid pair was meant to
style the whole bar or individual tabs, then consolidate accordingly.

**Verification gap:** `test/theme-base-contract.test.js:79–86` explicitly checks for
the invalid `QTabBar::top` / `::bottom` strings. Passing that test currently preserves
the mistake. Change the contract to check valid, intentional placement selectors when
fixing the theme.

### 5. A later combo-box rule overrides the keyboard-focus colors — medium

**Locations:** `themes/Colorway.obt:2277–2280` versus `3586–3592`.

The first `QComboBox:focus` rule uses `--border_focus` and `--input_bg_focus`.
The later rule repeats the same selector with `--input_border_hover` and
`--input_bg_hover`. Equal specificity means the later colors win.
The 2px focus border remains, but its intended accent color and focus surface are lost
for a focused, non-editable combo box with its popup closed.

**Correction:** keep hover and focus separate, or restore a final focus rule with the
intended tokens. Check keyboard-only navigation, not just mouse hover and popup-open
states. More generally, keep border widths stable where practical: several inputs and
rows gain border thickness on focus/hover, which can shift their content boxes.

### 6. Scrollbar page areas accidentally get the pressed-handle color — medium

**Locations:** `themes/Colorway.obt:2754–2756`, `2788–2790`, and `3471–3482`.

The early horizontal/vertical add-page rules make page areas transparent. The later
comma-separated block includes both `QScrollBar::add-page:vertical` and
`QScrollBar::add-page:horizontal` before `QScrollBar::handle:pressed`.
All listed selectors receive the same declarations: the page areas get
`--scrollbar_down` **unconditionally**, not only while the handle is pressed.

**Correction:** split the pressed-handle rule from arrow/page rules and specify the
intended page background explicitly. Verify both orientations and short/long scroll
ranges; a colored page segment can otherwise look like part of the thumb.

### 7. A late reset removes the group-box title reservation — medium

**Locations:** `themes/Colorway.obt:2870–2887` versus `3221–3228`.

`QGroupBox` reserves `margin-top: 16px`, with its title positioned in the margin.
A later selector list includes `QGroupBox` and sets `margin-top: 0` at equal
specificity. The intended title reservation is therefore overridden.

**Correction:** exclude group boxes from the generic margin reset or deliberately
restore their title spacing. Derive that spacing from the font-size graph where
appropriate. Title overlap/clipping needs a rendered OBS check, especially at large
Appearance font sizes.

### 8. Replay/virtual-camera hover still bakes in the base lavender — low

**Location:** `themes/Colorway.obt:795–800`.

The normal active state consumes variant-overridable `--accent_bg_start/end`, but
active hover switches to literal `rgba(196, 167, 231, ...)` stops. Variants can change
the normal active accent but cannot change this hovered gradient.

**Correction:** introduce explicit semantic hover-gradient tokens, or use an existing
contrast-tested semantic surface. The current `--text_light` foreground also deserves
a light-variant contrast check on that resulting surface.

## Supporting delivery issue

The base depends on the entire `icons/colorway/mingcute/` tree and
`patterns/pattern.svg`; these are valid workspace assets outside `themes/` and must
be installed under the registered `theme:` search root with that directory structure.
Their absence beside the workspace `.obt` alone is not a broken URL.

However, `src/main.js:717–722`'s `downloadThemeBundle` downloads the variant,
optional base, font, and pattern files, **but no icons**. It also downloads patterns
under their bare filenames rather than constructing the required installation tree.
This bundle is insufficient by itself to reproduce the base's icons and pattern paths.
Deliver a package with the correct structure or make the prerequisite asset installation
explicit. The font still requires real registration/installation, as above.

## Verification and boundaries

- Read the complete 3,659-line source base theme and relevant theme contracts.
- Deterministic variable-reference scan: **no undefined references** after allowing
  `--obsFontScale` and `--obsPadding`.
- Source/public base comparison: **byte-identical**.
- Referenced SVG/pattern assets exist in the workspace's asset layout. The font lives
  under `fonts/`, not at the theme-relative root named in the unsupported at-rule.
- `pnpm test`: exit **0**; **589 tests, 588 pass, 0 fail, 1 skipped**.
- Contrast figures above are calculations from concrete base tokens and SVG strokes;
  they are not a screenshot-based accessibility assessment.
- OBS discovery, installation, actual font resolution, and rendered interactive states
  were **not** exercised. The browser preview is not proof of Qt/QSS behavior or baked
  SVG color, and many theme tests assert source strings rather than runtime behavior.

## Recommended order

1. Fix foreground pairs and the checked glyph; correct icon-state wiring.
2. Correct invalid state selectors and the focus/scrollbar/group-box cascade errors.
3. Make font and asset delivery match what OBS can actually load.
4. Move the remaining literal hover accent into semantic tokens.
5. Run `pnpm sync:themes` and `pnpm test` after any theme edits, then inspect the
   affected states in OBS with the base palette and representative light/dark variants,
   including increased font size and both mixer orientations.

## External mechanism references

- [Qt stylesheet syntax](https://doc.qt.io/qt-6/stylesheet-syntax.html), especially
  QObject-property polishing and conflict resolution.
- [Qt stylesheet reference](https://doc.qt.io/qt-6/stylesheet-reference.html), including
  `:flat`, `:top`, `:bottom`, and the documented sub-controls.
- [Qt stylesheet parser](https://github.com/qt/qtbase/blob/dev/src/gui/text/qcssparser.cpp),
  `Parser::parse`: unknown at-rules are skipped rather than loaded as fonts
  (source inspected during this review; `dev` is a moving reference).
- [OBS theme loader at the supplied audited commit](https://github.com/obsproject/obs-studio/blob/cffa83ba552f1ef6a0a05851c3aa07b3811d7e58/frontend/OBSApp_Themes.cpp).
