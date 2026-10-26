<!-- meristem-template:v1 -->
# Active Work

## Remove unused OBS state-test popup and launcher (2026-10-26)

The user explicitly rejected the fake alert/crash-recovery stress-test popup
and asked to remove the button that opens it. Removed the entire popup
(including the nested recently added control playground) and both launchers
(the hidden heading button and the dynamically injected Appearance button),
plus event, focus-management and modal inert wiring, obsolete CSS, and tests
that treated this feature as required. The existing main Colorway sample
widgets, OBS mock controls, status indicators, Appearance controller, and
shared 27px dropdown minimum are preserved. The old feature and prior
implementation remain in repository history only. The Chromium preview parity
check asserts there is no modal or launcher after mounting. Do not revive the
removed popup without a specific request.



## Browser element playground — focused showcase (2026-10-26)

**Intent:** User clarified the Colorway web preview is meant to be a **fun
interface that showcases elements**, not a literal clone of OBS Settings.
Keep the existing OBS-themed scene and theme switching. Avoid building an
entire fake Output Settings page.

**Implementation:** The existing accessible `data-state-lab` overlay,
reachable from the permanent Appearance controller, now contains a compact
interactive Colorway playground. It showcases independent checkboxes, circular
audio-track radio selectors, a transition select, a bitrate spinbox with
the generated MingCute compact arrow SVGs, icon tool buttons including
hover/checked/disabled, an audio monitoring toggle, and bounded zoom controls.
The labels explicitly mark these as preview-only. All changes stay inside
the browser simulator, never in OBS config. Existing alerts and crash recovery
specimens remain below the new playground. The launcher is labeled
"Explore elements" instead of the utilitarian "Test UI states".
Standard simulated dropdowns now have a 27px minimum height and gallery
tool buttons use theme hover/border/foreground tokens.

**Asset mapping correction:** `browserThemeAssetValue` only recognized
`normal|selected|status` MingCute icon subdirectories, while the new
spinbox arrows and recently generated mixer/zoom assets live in
`spin|mixer|zoom`. Browsers cannot fetch literal `theme:` URLs. The
existing safe path translation was extended only to those packaged asset
directories, preserving source `.obt/.ovt` and rejecting traversal.

**Verification:** Added red-first `test/obs-preview-showcase.test.js`
and expanded `test/obs-preview-parity.test.js`. `pnpm test`:
706 total, **705 passed, 0 failed, 1 intentional network skip**.
`pnpm check:preview`: production Vite build and Chromium parity passed,
including real interactions, zoom/monitor/track/bitrate state and HTTP-loaded
spinner SVG. A Chromium settled-state screenshot verified layout with no
ghosted intro animation. The site is a showcase, not a functional OBS
configuration frontend; interactions only affect demo DOM state.

**Checkpoint:** local git commit is appropriate after final verification.
No push or deployment requested in this turn. Preserve existing project
state and do not treat a tested simulator as proof of all native OBS surfaces.

## Hover affordance fixes — generated tool icons and AdaptaEvergreen (2026-10-26)

**Request and causal context:** User approved fixes for the two verified issues
in the read-only audit below. Do not generalize into changing unrelated
control semantics, palettes, or state styling.

**Changes made:**
- `scripts/theme-state-tokens.mjs:renderButtonIconRules`: 32 generated
  icon/tool-button selector groups no longer alias idle and hover styles.
  `QToolButton.icon-*` and `QToolButton[themeID=...]` use the variant's
  `--button_bg_hover` and `--input_border_hover` when hovered; the checked
  hover uses `--primary_lighter` for its border. Pressed and disabled
  behavior remains separately defined. The generator was changed rather
  than hand-editing its repeated generated base rules.
- `themes/Colorway-AdaptaEvergreen.ovt`: `--input_bg_hover` now uses the
  palette's *pre-existing* focus surface `#38444a` rather than repeating
  the normal background `#29353b`. The border and text tokens are otherwise
  untouched; combo boxes and line edits now visibly change on hover.
- `pnpm sync:themes` regenerated authored/public theme mirrors.

**Testing:** A new Qt paint-level `hover-feedback` probe verifies classed
and themeID tool buttons in both unchecked and checked states, plus ordinary
combo and line-edit input hovers. The fixture must be its own raised Qt window
rather than obscured by earlier top-level test windows; its hover asserts
`underMouse()` and a minimum pixel difference. Both original defects were
reintroduced as isolated mutations and detected. Focused regression green
on RosePineMoon Gold and AdaptaEvergreen. Full `pnpm test`: 703 total,
702 passed, zero failed, one intentional skip. Production `pnpm build` passed.
`pnpm check:obs-native` passed all five isolated native OBS theme profiles,
which also validates generated theme references. The user's running OBS was
not reloaded; the refreshed live result has not been visually confirmed.

**Installation:** On yuzu-mint, byte-verified
`~/.config/obs-studio/themes/Colorway.obt` and
`~/.config/obs-studio/themes/Colorway-AdaptaEvergreen.ovt` against their
authored/public counterparts. Old installed versions were backed up to
`~/.config/obs-studio/theme-backups/` with suffix
`.before-hover-feedback-20261026-145531`. SHA256 base:
`40f66512498aba22145265c27c2487785d9d405197d260d35d9cc48384adcea3`,
Evergreen:
`c310d03cfccd9b9cb71c2c955350599ec964420acf5771ac2673977af4f887e9`.
`user.ini` hash unchanged; running OBS deliberately left alone.

**Preservation:** Many source, generated, test, and doc files had pre-existing
uncommitted changes before this pass; no unrelated work was reset, staged, or
pushed. No commit was created because these particular files already contain
other uncommitted work not part of the hover fix.

## Read-only hover affordance audit (2026-10-26)

**Request:** Find hover states with no visual feedback in Colorway. This was an
inspection, not an authorization to apply a new visual design. Do not
automatically change the user theme or restart OBS on the basis of this audit.

**Confirmed shared defect:** The generator in
`scripts/theme-state-tokens.mjs:renderButtonIconRules` emits 32
`QToolButton.icon-*` / `QToolButton[themeID=...]` class-selector groups where
normal, hovered, checked, and pressed all share the same background/foreground
declarations. The checked/pressed border remains primary but **hovering does
not change it**. A Qt offscreen probe of the composed RosePineMoon Gold style
found **0 changed pixels** for `QToolButton.icon-plus` in both unchecked and
checked hover. In the same test, the generic QToolButton changed 5,457 pixels
unchecked and 435 checked; the classed QPushButton changed 816 unchecked and
5,564 checked. Fix belongs in the generator, followed by `pnpm sync:themes`,
rather than manually editing its generated 32 blocks.

**Confirmed palette defect:** Across all 161 base/variant token sets,
`Colorway-AdaptaEvergreen.ovt` alone resolves the normal and hover values
equal for all three common input feedback channels:
`--input_bg == --input_bg_hover`,
`--border_base == --input_border_hover`, and
`--on_input == --on_input_hover`. An offscreen Qt probe confirmed **zero
changed pixels** for a normal QComboBox and QLineEdit under hover in this
variant. A correction should choose a palette-coherent distinct hover color,
not a global hard-coded color.

**Do not mistake for no-op:** The generic button border and button background
changed in Qt; standard tool buttons did change. Ordinary QCheckBox
`::indicator:hover` visibly changed when hovering the indicator itself,
but not when hovering the label outside it. Some `:hover` rules intentionally
keep an icon constant while other paint properties respond; this alone is not
a visual failure. Input background matches hover in 15 palettes but other
paint channels often still change; only AdaptaEvergreen had the whole
three-channel match in the source audit. Sliders in NightOwl and OsakaJade
share normal/hover accent tokens but showed some changed pixels in a quick
probe, so their visual status remains unproven.

**Status:** No theme, generator, or installed OBS files edited by this audit;
no build or deployment claimed. Validated findings are ready for narrow
TDD-backed fixes if requested.

## Follow-up — shared QComboBox sizing instead of one-off transition rule (2026-10-26)

**User correction:** The Scene Transitions minimum should follow the same
normal dropdown behavior as other combos, not have a special `#transitions`
fix. The earlier approach was too narrowly scoped.

**Evidence:** Isolated native OBS 32.2 inspection showed the standard
`QComboBox#transitions` (main dock) and wizard `QComboBox` rows behave as
ordinary selectors, while `OBSPreviewScalingComboBox#previewScalingMode`
is genuinely custom-sized at 16px. With a naive global 21px QSS minimum,
that compact preview scaler enlarged to 23px. This exception is observed, not
an inferred collection of hypothetical controls.

**Change:** Remove special `QComboBox#transitions` rule and use shared
`QComboBox { min-height: var(--shared_combo_min_height); }`, with a font-scaled
theme variable `calc(1.9px * var(--font_base_value))`.
Keep only the known preview scaling exception at a rendered 16px.
Qt regression asserts ordinary dock and Scene Transitions combo minimums,
and checks that preview scaling remains 16px; started RED, now GREEN.

**Verified:** Final native OBS with current RosePineMoon Gold:
Scene Transitions actual/min/sizeHint 27px; AutoConfig FPS and canvas
combos 27px; preview scaling remains 16px. Focused Qt tests passed on Gold
and Latte Blue. Full `pnpm test`: 700 tests, 699 passed, 0 failed,
1 intentional skip. `pnpm build` passed, `pnpm check:obs-native` passed
five isolated themes. `pnpm sync:themes` refreshed the base mirror.
Installed corrected base on yuzu-mint with prior theme backup
`~/.config/obs-studio/theme-backups/Colorway.obt.before-shared-combo-min-20261026-142856`.
Source/public/installed SHA256:
`34e22fa2a1b200899a3a1098b8596c773f3e3ed4daff5ee43b61a33d84e28d6f`.
User `user.ini` unchanged. Live OBS was not restarted or reloaded.
User's live screenshot after reload is not yet verified.

**Preservation:** The pre-existing large dirty worktree is intact; no unrelated
changes staged, committed, pushed, or reset.

## Scene Transitions dock selector minimum-height fix (2026-10-26)

**User-visible issue:** Scene Transitions dropdown collapsed to a thin strip in a
compact dock despite appearing normal when the dock had room.

**Root cause verified in isolated actual OBS 32.2 on yuzu-mint:** The visible
`QComboBox#transitions` is a child of `QFrame#transitionsFrame` under
`OBSDock#transitionsDock`. It had `sizeHint().height() == 26` but
`minimumHeight() == 8`, allowing dock layout to squeeze it. The generic
QComboBox size hint was not a meaningful minimum. The other preview scaling
combo is `OBSPreviewScalingComboBox#previewScalingMode` with its own
16px sizing and is intentionally outside this fix.

**Scoped correction:** Add only
`QComboBox#transitions { min-height: var(--settings_combo_min_height); }`
below the existing `#transitionsFrame` rule in the authored
`themes/Colorway.obt`. Avoid global QComboBox rules or changing dock dimensions.

**Verification:** New red-first PyQt6 tests in
`test/helpers/qss-probe.py` + `test/theme-qt-render.test.js` failed with
minimumHeight=8 versus required 24 on Gold and light Latte, and passed after.
They also assert an unrelated combo remains unchanged.
`pnpm sync:themes` generated the matching public mirror.
`pnpm test`: 700 tests; 699 passed; 0 failed; 1 intentional skip.
`pnpm build` passed. `pnpm check:obs-native` passed five isolated themes.
Another isolated *real OBS* subprocess using the new base + RosePineMoon Gold
confirmed `transitions` geometry 175x26, minHeight=26, sizeHint=26, while
`previewScalingMode` remains minHeight=16. This establishes the corrected
minimum in native OBS, not necessarily the user's running dock after reload.

**Installed:** Backed up previous installed base to
`~/.config/obs-studio/theme-backups/Colorway.obt.before-transition-combo-height-20261026-134904`.
Installed and byte-verified base against authored source and public mirror;
SHA256 `ccd3822fe0c1d3400e701144149213d20dffda8387b3e1a7c503bb53d9ee44b2`.
`user.ini` unchanged, live OBS deliberately not restarted or theme-reloaded.
Large pre-existing shared dirty worktree retained, no broad commit or push.

## Verified root cause — square Audio Track selectors in OBS Output (2026-10-25)

**User's actual report:** Under OBS Output > Simple > Recording, Audio Track 1–6
showed **square-cornered indicators**, unlike other rounded checkboxes.
There was no report of disabled/uneditable controls. Earlier attempts misread
this as a disabled-state issue and tested the wrong widget types.

**Real native OBS evidence:** A disposable OBS 32.2.0 instance with Colorway
RosePineMoon Gold and an injected diagnostic hook opened Settings > Output.
The visible `simpleRecTrackWidget` stack page is `simpleFlvTracks`; its
`simpleFlvTrack1` through `simpleFlvTrack6` are **QRadioButton** controls.
Another hidden stack page `simpleRecTracks` holds different
`simpleOutRecTrack1` through `simpleOutRecTrack6` **QCheckBox** controls.
The previous probes accidentally targeted this hidden page. The native
screenshot demonstrated all six visible audio radio indicators drawing as
square despite the ordinary checkbox style being rounded.

**Actual rendering defect:** `QRadioButton::indicator` inherited
`border-radius: var(--shape_full)`, which resolves to 999px; Qt 6 draws
this as a square on a roughly 20px radio subcontrol. In a native OBS
stylesheet A/B test, overriding that rule with 10px rounded every audio
radio (both selected and unselected); fixing only `:unchecked` left the
selected track square. This was directly verified visually in the six-image
comparison.

**Smallest fix:** In authored `themes/Colorway.obt`, add
`--radio_indicator_radius: calc(var(--icon_base) / 2)` and apply it to
`QRadioButton::indicator` instead of `--shape_full`.
Do **not** change `QCheckBox` shape or audio enabled states.
Red-first `output-track-radio-shape` Qt probe tests assert circular
actual rendered pixels for six OBS-named radios in Gold and Latte Blue;
these failed before the fix and passed after. `pnpm sync:themes` updated
mirror. `pnpm test`: 698 tests, 697 passed, 0 failed, 1 skipped.
`pnpm build` passed; `pnpm check:obs-native` passed five isolated themes.
A **second real OBS 32.2 Gold render with the authored fix** was captured and
visually confirmed to show all six round radio indicators.
User's running OBS was **not** reloaded or restarted.

**Deployment:** Installed source-identical base theme in
`~/.config/obs-studio/themes/Colorway.obt` on yuzu-mint; backed up its
previous version to
`~/.config/obs-studio/theme-backups/Colorway.obt.before-audio-radio-circles-20261025-232549`.
SHA256 source+installed =
`97443d91cf7702dea758b05b65a421bb9ac8fd11f03a992bbf448b24b7d0e97a`.
`user.ini` was unchanged. The next live screenshot **after a theme reload**
remains to be checked. Repository contains a large pre-existing shared dirty
worktree; no broad commit/push made. Do not confuse this verified fix with the
earlier incorrect assumption about disabled checkboxes.

## Correction to earlier icon claims — exact MingCute small-fill arrows (2026-10-25)

The user's critique was correct: the previous spinbox arrows were *not*
MingCute small-fill icons or the same graphics as the dropdowns. They were
bespoke viewport-cropped derivatives of MingCute's generic up/down icons.
The description that they already used the appropriate icon was inaccurate,
and geometric tests alone missed the visual mismatch.

The user linked `https://icon-sets.iconify.design/mingcute/up-small-fill/`.
The exact Iconify MingCute `up-small-fill` and `down-small-fill` SVGs were
fetched to `icons/vendor/mingcute/`. The generator now preserves their path
data (only recoloring and cropping the viewport for a 9px Qt slot), rather than
altering strokes or drawing a new substitute. Both normal and selected
polarity assets are generated under `icons/colorway/mingcute/spin/`.
The test was red against the previous arrows, then passed; the Qt compact
control tests passed. All 696 repo tests: 695 passed, 0 failed,
1 intentional skip. Production build and native OBS checks across five themes
passed. Installed updated base and four small-fill SVG assets on yuzu-mint;
installed and source base SHA256:
`f5f070d00ce449764317ecb671531ee6dc45a7a9ea0257cbd1b29c87ad5a5547`.
Prior installed base was backed up in the user theme-backups folder;
`user.ini` remained byte-identical. No active OBS restart/theme reload
or modification to Output settings. The current live screenshot after reload
has **not** been verified. Existing dirty user worktree remains preserved;
no broad commit/push.

The isolated OBS Settings inspection confirmed actual
`simpleOutRecTrack1` through `simpleOutRecTrack6` QCheckBox widgets
and a `simpleOutputVBitrate` QSpinBox; the six track checkboxes happened to be
enabled in the disposable test profile. That **does not establish** why
the user's specific track controls appear disabled under Same as stream.

## Follow-up — visually rounded controls and symmetric spin chevrons (2026-10-25)

**User feedback:** Source/test geometry was correct, but actual Output Settings
still showed near-square Audio Track checkboxes and a down arrow resembling an
asymmetric checkmark. The earlier 9px rendering of the unchanged 24x24 MingCute
path lost too many pixels. A Qt offscreen comparison of 9px spin arrows showed
that a tighter `4 6 16 12` viewport preserves the *original* pinned MingCute
path while rendering both chevrons evenly. No new hand-drawn paths were used.

**Correction:** QCheckBox and checkable QGroupBox indicator corners now use a
distinct 7px radius, leaving QRadioButton geometry alone. The spinboxes use
dedicated 9px, viewport-cropped MingCute SVGs in both resolved palette
polarities. Their variant-specific URL tokens and distribution assets are
generated by the existing pipelines. Installed four SVGs *before* replacing
the base theme; backed up the previous base; OBS preferences unchanged. The
running OBS process was not touched or restarted.

**Evidence:** New Qt behavior tests initially failed on the prior compact
checkbox/chevron rendering and passed after the correction for both
RosePineMoon Gold and light Catppuccin Latte Blue. The pinned-source geometry
and four shipped image assets are contract-tested. `pnpm test`: 696 tests,
695 passed, zero failed, one intentional network skip. Production build passed.
Isolated native OBS integration passed on all five supported test themes.
`themes/Colorway.obt`, `public/themes/Colorway.obt`, and installed base
were byte-verified equal. The user's actual refreshed live Output Settings
appearance still requires theme reload and visual confirmation.

**Preservation:** Previous changes in this shared dirty worktree are retained;
no commit or push of unrelated work. Machine-specific restore receipt belongs
in `.meristem/local/`, not in commit-safe project notes.

## Current continuation — OBS Settings checkbox and spinbox repair (2026-10-25)

**Observed failure:** In the user's Output Settings screenshot, compact QSpinBox/
QDoubleSpinBox up/down controls overlapped. Direct PyQt6 reproduction showed 14px
up/down button rectangles colliding in 20/24/28px-high fields. Checkable group
headings (Replay Buffer) also used a separate MingCute checkbox glyph family:
the unchecked asset itself included a check stroke, unlike ordinary QCheckBox.

**Correction:** In authored `themes/Colorway.obt`, let Qt calculate half-height
spin buttons instead of forcing the oversized `--spinbox_button_height`; use
9px MingCute chevrons without extra arrow padding. Style QGroupBox indicators
with ordinary empty/checked boxes and an accent border. The theme mirror was
regenerated with `pnpm sync:themes`; neither custom palette seeds nor the
installed selected variant was modified.

**Verification:** New red-first native-Qt-style regressions passed after the
fix for the user's selected RosePineMoon Gold and Catppuccin Latte Blue. Restoring
the prior overlapping buttons, checked-looking unchecked group SVG, or missing
checked accent all fails the new probe. `pnpm test`: 693 total, 692 passed,
0 failed, 1 intentional skipped. `pnpm build` passed. `pnpm check:obs-native`
passed five isolated native OBS 32.2 theme selections (base, Latte Blue,
Monokai, Fairyfloss, 90s Anime). Offscreen Qt renders inspected visually.

**Installation and boundary:** The source and public mirrored base theme were
byte-verified; the installed OBS base `Colorway.obt` was backed up to
`~/.config/obs-studio/theme-backups/Colorway.obt.before-checkbox-spinbox-20261025-220142`
and replaced with an identical source copy. `user.ini` hash unchanged; user's
running OBS process was not restarted or theme-reloaded. Its actual refreshed
Output Settings screen remains to be confirmed after the user reloads the theme.
The large prior uncommitted worktree remains intact; no commit or push made.

## Current continuation — mixer state glyphs and crisp preview zoom (2026-10-25)

**Outcome:** Implemented the native audit's mute/monitor icon repairs and zoom
legibility improvement. See `docs/NATIVE_CONTROL_AUDIT.md` and
`docs/MINGCUTE_MIGRATION.md` for the mechanism and verification boundaries.

**Current state:** Uncommitted working-tree changes include the earlier docs,
Properties/Filters, and source-outline fixes plus this delivery. No commit or
push was requested. Existing branch context remains `main` at `618cbcb`.
The mixer uses distinct speaker/mute, headphone/slashed-off, and warning glyphs.
Palette-derived danger/success/warning inks are baked into deduplicated SVGs;
all curated theme references and public mirrors are generated by `pnpm sync:themes`.
Zoom uses pixel-aligned 8px artwork without enlarging its native 20×16 controls.

**Locked decisions / constraints:** Mixer states stay on `--bg_base` so the
derived semantic ink keeps its independently tested 3:1 contrast guarantee.
Warning classes override checked mute imagery, including the legacy spelling.
Preserve the prior context-button/source-outline corrections, authored palette
seeds, frozen comments, user patterns, and audio-routing behavior. The native
state-consumer probe does not emit `clicked()` or alter real OBS routing.

**Verification:** 684 tests / 683 passed / 0 failed / 1 intentional skip;
build passed. Native OBS base, Latte Blue, Monokai, Fairyfloss, and 90s Anime
passed at compact and normal density. Each checks 21 mixer render/state cases
and both zoom controls, alongside the earlier corrections. The same native
probe rejects the pre-fix installed base for all mixer cases and both zoom
glyphs. Native state captures were visually inspected. The complete corpus is
checked for semantic ink contrast, pinned/derived SVG geometry, package assets,
and source/public mirror parity.

**Installation:** The 150 changed installed theme files were backed up before
replacement; 190 new icon assets were installed first. All 161 installed themes
and 308 required icon/license assets are byte-identical to source. OBS user.ini
and the custom pattern SVG are hash-verified unchanged. Repeated theme sync is a
fixed point across source/public themes and icon assets. Native delivery captures
are in the ignored audit directory's `delivery/` subdirectory.

**Remaining:** Reload the theme or restart the user's OBS instance to consume
the installed files. Its refreshed UI is not yet manually verified.

## Follow-up inspection — native control audit (2026-10-25)

Completed a native control audit after the two installed icon fixes. See
`docs/NATIVE_CONTROL_AUDIT.md` for evidence, repair directions, and coverage
limits. Two open findings: actual mixer `.btn-mute` and `.btn-monitor`
QPushButtons retain black resource glyphs on dark surfaces despite light text
palettes; they are not covered by the generated icon-class bindings. No further
clipping was confirmed in the inspected Sources and Settings controls.

An apparent preview-zoom clipping issue was **not** confirmed: removing excess
padding changed the reported content rectangle but not the rendered glyph.
The tiny native 8px icon remains a legibility observation, not a proven padding
defect or a verified theme-only fix. This pass changed no theme/installed files;
its diagnostic captures are in the ignored local audit directory.

## Previous continuation — source visibility outline clipping (2026-10-25)

**Outcome:** Sources-row visibility and lock indicator outlines fit their native
widget bounds at compact and normal OBS density. The source/public base and
installed base contain the fix; the installed predecessor was backed up.

**Mechanism:** Native OBS allocated a visibility control only 18×14px while its
indicator occupied 16×16px at (3, -1), clipping the top, bottom, and right edge.
Normal density also retained a 14px row while enlarging the indicator. The
SourceTreeItem-only rule removes extra outer padding/frame and uses a 12px glyph
plus its one-pixel indicator outline (14×14px total), independently of density.
Pinned SVG geometry, other checkbox styles, source-row height, palette seeds,
and the prior Properties/Filters fix are preserved.

**Current state / constraints:** This is additional uncommitted working-tree
work on top of the earlier icon fix and documentation reconciliation. Native
test fixtures create a disposable color source only in their isolated OBS
processes; never run fixture creation against the user's OBS instance.

**Verification:** `pnpm test`: 674 tests / 673 passed / 0 failed / 1 intentional
skip; build passed. Native OBS base, Latte Blue, Monokai, and Fairyfloss passed
at Density=-2 and Density=1, with actual visibility/lock geometry and row captures.
The native gate fails against the pre-fix installed base, reproducing the
out-of-bounds indicator. Offscreen Qt tests cover OBS padding 1/4/8, both toggle
states, and a deliberately restored oversized indicator. Captured native rows
were visually inspected. Installation was byte-verified against source.

**Remaining:** Reload the theme or restart the running OBS instance to pick up
the installed base. Its refreshed UI has not been manually verified.

## Previous continuation — source context button icon ink (2026-10-25)

**Outcome:** Properties and Filters in the native OBS source context bar use
readable MingCute glyphs matching their button text, including Fairyfloss.

**Why it matters:** The existing icon-state checks covered class/themeID-bound
buttons, but these two OBSBasic.ui controls have neither binding and retained
their dark native resource icons.

**Current state:** Branch context is `main` at `618cbcb`, matching the local
`origin/main` tracking ref. The current working tree has earlier documentation
reconciliation edits plus this uncommitted icon fix, regression probes, and
generated source/public themes. The generator binds `sourcePropertiesButton`
and `sourceFiltersButton` explicitly and derives two normal-button ink tokens
from `--button_bg` / `--on_button`. Only 36 source theme files need new tokens
or QSS; their public mirrors are regenerated.

**Locked decisions / constraints:** Preserve palette seeds, frozen comments,
button backgrounds and geometry, patterns, and OBS user settings. Native resource
icons must be challenged at the actual object-name boundary, not inferred from
an icon-class test. Existing documentation edits predate this fix.

**Verification:** `pnpm test`: 671 tests / 670 passed / 0 failed / 1 intentional
network-gated skip. `pnpm build` passed. The native OBS gate checks glyph pixels
on both actual controls across five enabled states in base, Latte Blue, Monokai,
and Fairyfloss. All passed; the same native probe fails on the previous base
stylesheet. Offscreen Qt regressions and a deliberately dark-icon mutation also
exercise the failure. The 36 changed installed theme files were backed up and
byte-verified against source; existing icon assets already match.

**Current objective / open uncertainty:** The running user instance still needs
a theme reload or OBS restart to consume the installed fix. No interaction with
that instance or manual approval of its refreshed screenshot is claimed. Older
continuation entries below are historical receipts, including their publication
and verification claims.

## Latest continuation — MingCute icon color coherence (2026-10-18)

User requested a focused real OBS icon-color review and explicitly trusted
us to make the icons look good, without changing unrelated styling.
Observed current Fairyfloss theme and reviewed authored MingCute SVG inks,
the semantic state-token generator, actual Qt icon state rendering, and
disposable native OBS Settings captures.

**Two verified problems, two targeted corrections:**

1. Colorway previously chose normal/selected MingCute icon polarity based
   *only* on maximum background contrast. This produced dark pressed/checked
   button glyphs beside white text in Fairyfloss, Twitch Dark, and Vercel.
   `scripts/theme-state-tokens.mjs` now prefers the polarity visually
   matching the semantic button text ink, when it preserves at least 3:1
   icon-silhouette contrast; otherwise it falls back to maximum surface
   contrast. Only those three variant state-token blocks changed.
2. Settings navigation exposes nine **single QIcons** shared between
   ordinary and selected rows; a single light/dark glyph can get lost
   when an accent-selected row uses the opposite luminance. The original
   MingCute geometry is now baked into nine small dedicated
   `icons/colorway/mingcute/nav/` glyphs with a subtle two-tone edge.
   The base QSS uses them solely for Settings categories. Fairyfloss
   and Catppuccin Latte Blue were rendered and visually inspected
   in separate, isolated native OBS 32.2 Settings instances.
   No changes to the pink focus border, selected-row fill, patterns,
   fonts, sizing, or any user's scenes/profile.

**Verification:** 667 tests / 666 passed / 0 failed / 1 existing skip;
native OBS base/Latte/Monokai stylesheet acceptance passed;
Chromium parity passed; nine navigation glyphs checked against pinned
upstream MingCute paths and distributed asset manifest, including light
and dark ink. Source/public mirrors synchronized and byte-verified.
Installed the four modified theme files and nine SVGs with a prechange
backup, without modifying user.ini, currently selected theme,
custom pattern SVG, or active OBS process. Changes committed locally,
not pushed.

See `docs/MINGCUTE_MIGRATION.md`. The fixed-color nature of Qt QIcon
remains a platform limitation; this is a tested design solution for
the Settings navbar, not a general claim of dynamic SVG colorization.

## Independent verification checkpoint — 2026-10-18

- **Scope:** audited the current `main` with nine existing unpublished commits above public `origin/main` (no remote-only commits). The changes cover native OBS Settings contrast/geometry/focus, source-attributed palettes, pattern placement and adjustable pattern strength. The prior authored source theme corpus and user OBS settings were not changed by this pass.
- **Real checks:** `pnpm test` **662 total / 661 passed / 0 failed / 1 intentional network-gated Lospec skip** after a new 3-case regression. `pnpm build` passed. Isolated OBS 32.2/QSS test passed base, light Catppuccin Latte and Monokai (fully resolved QSS and MingCute icons). Actual Chromium Vite preview parity passed Latte/Monokai selected-ink, icons, active-status styling and patterns. Offline Chromium dock preview passed 160 themes/14 patterns, selection, palette and pattern interaction, light filter, upstream credit link.
- **Generator fixed point:** `pnpm sync:themes` completed and left no tracked generated changes. All **161** authored theme files (160 variants + Colorway base) match `public/themes/` byte-for-byte; all **14** pattern SVGs match public mirrors. Separately, all 161 installed OBS themes and the three installed optional companion files already match source **byte-for-byte**. There is no need to install or restart anything; the running OBS theme remains 90s Anime.
- **Reproduced and repaired a test-harness bug:** after successful offline Chromium interaction, `check-companion-preview.mjs` returned ENOTEMPTY on profile deletion because it immediately removed files after terminating Chrome. New shared `scripts/browser-profile-cleanup.mjs` waits for browser process exit (bounded timeout, cleared on prompt exit), then retries transient removal failures without hiding unrelated errors. Both Chromium parity scripts now use it. Three new red-first tests verify exit ordering, ENOTEMPTY retry/error propagation and absence of lingering timeout. Focused tests and the real Chromium checks passed after repair.
- **Publication safety:** this is a **public repository**; outbound commits were inspected for leaked credential material, private paths and source changes. No obvious credentials, user home paths or tailnet addresses detected in the 1 MB diff; this is a scoped scan, not a full forensic history audit. The normal global SafeShip hook initially found the word "mock" in an existing documented Qt-only-replica failure; clarified the wording without dropping its warning. SafeShip now passes without bypass.
- **Boundaries:** representative real OBS/QSS and browser checks are not a manual visual approval of every theme or an installation test of every optional control. Provenance registry retains unverified/unknown source origins; automatic pattern ink tinting on theme switch remains unresolved. Do not alter handcrafted theme seed values or overwrite current OBS profile for convenience. Preserve authored patterns and frozen light-theme palette comments.
- **Private receipt:** `.meristem/local/verification-2026-10-18.md` (machine-specific local test logs and install comparison).

## Latest continuation — traced and fixed Settings sidebar focus frame (2026-10-17)

User's 90s Anime Settings screenshot still showed a pink outline around the
entire left navigation after the earlier pattern-placement pass. Rather than
guessing, compared `fadaf55^` with `fadaf55`: the last change removed
`--pattern_eyes` from six types of content surfaces, including the Settings
sidebar, but left the main Settings scroll pattern. The focus frame was
**not** the pattern. A generic `QListWidget:focus` rule dating to July
sets `border: 2px solid var(--border_focus)`, overriding the Settings
navigation's nonfocused `border: none`.

Reproduced in real Qt against 90s Anime: inactive border `#13062b`,
focused border `#ff3864`; narrow Settings-specific focused border rule
restores the correct `#13062b`. Qt regression tests were red before and
green afterward for dark 90s Anime and light Catppuccin Latte. In a
disposable native OBS 32.2 instance, compared 90s Anime screenshots using
the old/updated base: pink full-sidebar frame count on left edge dropped
from 1180 to zero, with patterned Settings page and row styles retained.
No wallpaper rearrangement or global focus styling changed. Installed base
backed up and verified against source; running OBS and user settings left
untouched. See `docs/OBS_THEME_COMPATIBILITY.md`.

## Latest continuation — pattern placement hierarchy in native OBS (2026-10-17)

User requested a better application of patterns after the theme-provenance
review. Inspected the real OBS 32.2 window and Settings screenshots at the
user's active 300% pattern strength (current SVG unchanged). The diagonal
tile covered data-heavy scene/source trees, filter lists, Settings navigation,
plugin and regular dock bodies, and every generic item view. This made the
same texture compete with nearly every interactive control.

Kept the chosen SVG on the broader window shell and the Settings page
backdrop, but removed `background-image: var(--pattern_eyes)` from dense
list/table/tree views, the Settings/Filters navigation lists, and
`OBSDock > QWidget`. All these are now solid semantic theme surfaces.
A targeted test failed before the change and passed afterward; offscreen
QtSVG confirms the Settings backdrop still tiles. Before/after screenshots
in isolated real OBS dark EvondevDracula capture show calm navigation,
scenes, sources, dock bodies and mixer with decorative texture still around
the content. A light Catppuccin Latte snapshot was also checked. No theme
palette changes, user.ini edits, pattern SVG modifications, or user-scene
changes. Tests and native probes passed; previous installed base backed
up before replacement, with current OBS session left running.

Pattern ink remains statically authored #908caa in bundled SVGs; true
automatic tint adaptation on theme switch is a separate unresolved design
problem (Qt does not resolve widget QSS colors into external SVG files).
See `docs/OBS_THEME_COMPATIBILITY.md` for selectors and evidence.

## Previous continuation — Colorway provenance and active palette parsing (2026-10-17)

User reported themes had been damaged by prior polishing and requested a full
review with original-source attribution and correct OBS palette adaptation.
Compared all 160 authored `.ovt` palette variable values against the last
pre-fix checkpoint `946a2bf`: **zero changes to authored palette seed
values**. This does not validate every QSS/widget state; the existing native
stylesheet passes still require visual scrutiny. Osaka Jade also has
source base/text identity but an adapted accent (#2DD5B7 in Colorway
versus #509475 documented upstream); this difference is recorded and
not changed without an intentional palette decision.

**Actual bug discovered:** `src/theme-loader.js` `parseOVT` was reading
`--variable` lines inside `/* Official palette reference ... */` comments
as active declarations. This injected old Rosé Pine meter and selected-row
colors into unrelated palettes in the **web workbench and generated offline
OBS library**; no corresponding 142/143 `--meter_fg_nom` overrides were active
in the installed OBS variants. Do not "repair" these real theme files based
on comment-only values. Added an independent active-variable contract that
checks all 160 variants and confirmed Carbonfox no longer receives the
comment-only colors.

**Attribution:** `data/theme-provenance.json` now tracks all 160 variants,
original source/creator URLs and evidence level. Current coverage:
60 with palette roles checked (including Aura), 10 source palettes
identified (nine Lospec plus Osaka Jade), 62 named sources identified
but without complete palette verification, 5 brand-inspired without exact
palette verification, and 23 still unresolved. `data/official-palette-checkpoints.json` stores
hash-identified source colors (Catppuccin 1.8.0, Rosé Pine and Lospec).
All 41 standard Catppuccin variants use official named accents, original
surface tiers and foregrounds. All 18 Rosé Pine variants match source
surface and named accents; six Dawn variants retain historical `#575279`
text rather than the snapshot's `#464261`; intentionally not altered.

`scripts/build-theme-credits.py` generates the complete
`docs/THEME_CREDITS.md`; `pnpm sync:themes` mirrors it to `public/`.
Each downloaded theme ZIP now includes credits. The offline OBS library
displays original creator and source links or an explicit unknown status.
No new native OBS theme colors, scene configurations or installed patterns
were overwritten. See `test/theme-provenance.test.js`,
`test/obs-theme-parser-contract.test.js` and `docs/THEME_CREDITS.md`.

Verified at this checkpoint: complete suite, Chromium parity, real offline
companion controls, native base/Latte/Monokai acceptance. Installed companion
preview backed up before replacing; no OBS process/theme settings touched.
Meaningful work locally committed; **do not push without a reason**.

## Latest continuation — adjustable OBS background-pattern strength (2026-10-16)

Added a `Pattern strength (%)` 0–300 slider to the existing Colorway
OBS Lua Pattern Manager in Tools → Scripts. Default 100 preserves the exact
authored SVG; 0 hides the ink, 50 halves alpha, 200 doubles it, and 300
triples it. All 14 bundled patterns use original `fill-opacity="0.12"`
so scaling those source attributes changes actual QtSvg-rendered visibility,
rather than applying Qt widget opacity and fading labels/controls.

Changes are applied only on **Apply pattern**, using the fresh original SVG
or unmodified named SVG on every apply to prevent cumulative drift.
Restore Original copies the exact preserved source and resets the UI selection
and strength to Original/100. Invalid strength and disallowed paths are
rejected without writes. Live refresh still requires OBS's preexisting
AutoReload preference; the script never edits user.ini or theme QSS.

Verified the old Lua script failed the new regression; the extended LuaJIT
file-I/O harness passes 0/50/100/200/300 strengths, restore, invalid input,
and auto-reload opt-in. Offscreen real QtSvg rendering confirmed monotonic
visibility for all 14 patterns (max alpha 0 → 30 → 92 at strengths
0/100/300). `pnpm test`: 649 total / 648 pass / 0 fail / 1 existing skip;
`pnpm build` and real Chromium `pnpm check:companion` passed.
Regenerated public companion mirrors, installed the updated optional
companion through its backup-preserving installer, and left the selected OBS
theme, actual pattern, and OBS settings unchanged. Repo changes committed
locally; no push.

## Latest continuation — Settings input-size polish (2026-10-16)

After the dropdown and native-window backdrop fixes, reviewed the live
OBS Settings interface using a bounded Impeccable-style critique and a
native Qt geometry pass. The full Impeccable CLI was not installed in
this project; no automated design-detector or dual-agent critique was
claimed. The user-approved focus was the existing OBS Settings screen,
not a redesign of the Colorway web workbench.

Found the related numeric/text input regression at FontScale=10 and
Density=-3: `QSpinBox`, `QDoubleSpinBox`, and `QLineEdit` had
`minimumHeight=8` and could render at 16px alongside already-correct
26px dropdowns. Added Settings-only `--settings_form_min_height`
and an `OBSBasicSettings QAbstractSpinBox, OBSBasicSettings QLineEdit`
selector to preserve the same font-relative 26px control rhythm.
A Qt regression was red before the patch and green afterward.
The actual isolated OBS 32.2 Advanced form measured 26px rendered
height/minimum for nine combo, spin, and text controls. `pnpm test`,
`pnpm check:obs-native`, and `pnpm check:preview` passed (647 passed,
0 failed, 1 skipped). Source/public mirrors match; no palette changes.
The installed base theme was backed up and replaced with the verified copy;
the selected variant, density, scenes, and pattern remained untouched.

The API Documentation Checker was invoked separately on the existing
Lospec response schema in `docs/ARCHITECTURE.md`. It returned success
with zero extracted endpoints, so no completeness/correctness conclusion
follows. It does not inspect QSS or Qt geometry.

## Latest continuation — OBS Compact Settings dropdown height (2026-10-16)

User-provided Advanced Settings screenshot showed cramped dropdowns. With
FontScale=10 and Density=-3 (Compact), native OBS 32.2 instrumentation
demonstrated `QComboBox` sizeHint=26px but the Settings form layout
compressed instances to 16px because the effective `minimumHeight`
was only 8px. The shared base now adds a scoped `OBSBasicSettings QComboBox`
minimum via font-relative `--settings_combo_min_height`. In an isolated
native OBS Settings window, Color Format, Color Space, Color Range,
IP Family, and Bind to IP all retained 26px heights/minima, without
changing global density or the variant palettes.

Regression coverage: `test/helpers/qss-probe.py` verifies the real
minimum rather than the hint; `test/theme-qt-render.test.js` covers
EvondevDracula, Catppuccin Latte and a deliberately broken zero minimum.
The regression failed on the old theme and passed on the patch.
Latest integration: 645 tests, 644 passed, 0 failed, 1 existing skip;
native OBS base/Latte/Monokai checks and Chromium preview parity passed.
Source/public base files synchronized and the existing installation
updated by a backed-up, byte-verified copy. Selected theme, user.ini and
pattern assets were left alone.

Follow-up during the same investigation closed the separate black
Settings frame issue: a late-generated opaque `OBSBasicSettings` backdrop
must override the native root widget, which otherwise retains a black
palette. Both a dark and a light native OBS window were inspected.

## Latest continuation — native OBS surface legibility audit (2026-10-16)

A Settings screenshot exposed an incomplete prior Colorway fix: the page
background was repaired, but disabled labels and unchecked checkboxes were
still nearly invisible in some variants, and muted navigation ink lacked
contrast. This is a surface-pairing failure, not missing base color tokens.

Audited all 160 variants plus the base for text and control contrasts on the
actual dock, base, button, input/focus/hover, preview, list-hover, and heading
surfaces. Derived additional legibility roles from the original palettes;
preserved variant identities, seed colors, annotated historical comments, and
the intentional standalone Colorway base. Extended sibling generation to
include inherited inputs, and accounted for RGBA palette colors against their
backing surfaces. Fixed shared OBS selectors for Settings group labels,
checkbox indicators, tabs, tooltips, menus, headers, button states, and input
states. Generated all 160 variant overrides and public mirrors with
`pnpm sync:themes`.

**Verified:** `pnpm test` 643 total / 642 pass / 0 fail / 1 existing skip;
`pnpm check:obs-native` base, Latte, Monokai; `pnpm check:preview`
including Chromium parity and build; independent all-corpus contrast contract;
Qt pixel and palette probes with deliberately broken variants rejected.
An isolated real OBS 32.2 Settings window using SLSO8 Pixels confirmed the
disabled-label/checkbox/sidebar improvements; the validation captured the
actual Settings window ID. The corrected 161 installed theme files were all
confirmed byte-identical to their source counterparts, after backing up the
pre-change installed files. OBS user configuration, scene collections, pattern
SVG, and selected theme were not modified by installation.

**Closed by later follow-up (2026-10-16):** The small black Settings
outer frame was not a QDialog class styling problem. Native widget inspection
located the owning `OBSBasicSettings` QWidget with a black palette. An
opaque window rule at the absolute end of the generated QSS fixes it while
preserving patterned child surfaces. The light variant required end-of-QSS
ordering; an earlier placement passed on one dark theme but failed on Latte.
See `docs/OBS_THEME_COMPATIBILITY.md` and `.meristem/ERRORS.md` for evidence.

## Latest continuation — Colorway optional OBS companion (2026-10-16)

User requested easier pattern changes, theme previews in OBS, and a web
preview that prioritizes common widgets rather than colorful status counters.
Removed the redundant standalone status showcase and its randomized telemetry;
kept OBS's own tiny status bar. Added standalone OBS Lua pattern manager
(`obs-companion/colorway-patterns.lua`): 14 whitelisted bundled SVGs,
first-use exact-original backup, safe atomic replacement, restore original,
manual-apply semantics, and optional live OBS reload via the existing
`AutoReload=true` theme watcher. Does not edit OBS's user.ini or selected theme.

Built a **self-contained, local/offline Browser Dock** from all 160 real
theme palettes, their parent inheritance chains, and 14 embedded SVG
patterns. Features search, dark/light filters, favorites and a
workstation-focused preview of scenes/sources/mixer/controls; theme selection
is clearly preview-only. `pnpm sync:themes` builds the portable HTML and
`public/companion` mirrors; website ZIP now includes the optional companion
outside the themes directory. `scripts/install-obs-companion.sh` copies
companions into a stable local directory while preserving previous copies.

**Verification:** `pnpm test` 634 total, 633 passed, 1 pre-existing
network-gated skip; `pnpm build`; existing `pnpm check:preview`; and
`pnpm check:companion` (real Chromium file://) all passed. Actual LuaJIT
exercised pattern selection/restore/traversal rejection and AutoReload opt-in
against isolated real SVG files, without changing user.ini or QSS bytes. The
native OBS 32.2 Xvfb watcher was independently observed logging a successful
theme reload after the exact same one-byte touch. Source/mirror/companion sync
was byte-idempotent; ZIP tests verified companion files in both download modes;
real installer tests verified recovery of overwritten user files and refusal of
symlink install targets. `pnpm check:obs-native` continues to pass on three
variants.

Companion files were installed separately at the user's OBS companion
directory, but **neither the Lua script nor browser dock was auto-activated**;
no live OBS scenes, theme selection, or settings were changed. A live OBS
Scripts-window click-through remains unverified until user setup. Preserve
that boundary in user-facing summaries.

## Latest continuation — OBS patterned background regression (2026-10-16)

User saw a flat background after the verified fresh installation. The source
`patterns/pattern.svg` was byte-identical to the installed asset, and
`QSvgRenderer` loaded it. In direct offscreen Qt6 tests the six
`background-repeat: repeat` declarations in the base `.obt` prevented
the small transparent SVG background image from painting, while the same
`background-image` with no explicit repeat tiled correctly. Remove only those
six declarations and preserve all background colors/asset paths. The new
`test/pattern-qt-tiling.test.js` and Python helper require actual alternating
SVG pixel colors as well as the no-repeat source contract.

The live OBS session was open while debugging. Avoid changing its selected
variant or quitting/restarting OBS without user approval. Validate through
isolated Qt/OBS before updating the installed base; preserve the previous
base in the dedicated theme-backups directory. The installed folder was a
clean 161-theme MingCute distribution matching `c41ed4b` before this fix.

## Latest continuation — base OBT forensic repairs (2026-10-16)

Repository `Colorway.obt` is the authority. The installed user's OBS profile
was older (Iconamoon) and **has not been modified**.

OBS 32.2 theme parser source and compiled libobs lexer exposed a release-blocking
contract violation: raw `url()` and `rgba()` in `@OBSThemeVars` were not full
lexical string values. Added a narrow codec at the OBS disk boundary, updated
generators/synchronization, web import/export and Qt test adapter, and
regenerated all 161 source themes plus byte-identical public mirrors, keeping
22 frozen reference comments unchanged. Added a compiled libobs lexer contract
and corpus static tests. Removed two inherited QSS selector spills and three
empty rules. Pinned the official MingCute slideshow/photo-album artwork, with
51 named icons across both polarities and 6 state indicators.

**Verification:** `pnpm test` (627 total/626 pass/1 network-gated skip),
production build, byte-idempotent sync, 22 frozen source palette comments
unchanged, and `pnpm check:obs-native` against real OBS 32.2 under isolated
Xvfb. Qt actually applied base (90,547 QSS bytes), Catppuccin Latte Blue
(90,728) and Monokai (90,549); each has 194 MingCute asset references and
zero unresolved variables. The isolated profile is under a disposable
`/tmp/colorway-native-*` directory. See
`docs/OBS_THEME_COMPATIBILITY.md` for checks and remaining pixel-level limits.

## Latest continuation — OBS browser preview parity (2026-10-15)

The MingCute migration and previously integrated Colorway base/EarthBound
changes were published on `main` in `946a2bf` and `343489b`; remote HEAD
was verified. The subsequent web-preview alignment keeps source OBS themes
unchanged: browser-side `theme:` asset URL resolution, actual QSS SVG polarity
and baked foregrounds, selection ink/hover roles, and separate OBS control
active roles. Non-Appearance pages no longer claim invented options.

**Verified:** `pnpm test` 621 total/620 pass/1 skipped; `pnpm build` pass;
isolated Chromium checked the rendered normal and selected MingCute paths,
pattern, status masks, selected ink and QSS active control border roles for
Monokai and Catppuccin Latte Blue. The repeatable check is
`pnpm check:preview`. See `docs/OBS_THEME_COMPATIBILITY.md` for boundary.
**Still open:** live OBS Studio visual comparison of widget geometry/native
style under OBS 32.2. Browser and offscreen Qt checks do not establish full
pixel-level parity.

## Latest continuation — MingCute migration (2026-10-15)

Migrated Colorway's real OBS icon paths and browser preview to pinned MingCute
artwork, including all 160 variants and six streaming/recording/network state
icons. Added an offline reproducible generator, vendored pinned upstream SVGs,
Apache-2.0 license in packages, and a path/byte/Qt migration contract. Removed
the obsolete local Iconamoon and OBS-design icon assets. Preserved existing
theme IDs, color roles, and the unrelated ongoing base-theme work.

**Evidence:** `pnpm test` 615 total, 614 passed, 1 intentionally skipped;
`pnpm build` passed; all 106 MingCute assets valid under Qt SVG; repeated
`pnpm sync:themes` byte-idempotent; Chromium passed preview/mask transitions
and status asset loading. **Not yet verified in the user's running OBS UI.**
No user OBS installation or settings were changed; migration was subsequently
published to `origin/main` in `946a2bf`. Details and provenance: `docs/MINGCUTE_MIGRATION.md`.


## Current continuation — base-theme review fixes

The requested base-theme fixes and asset delivery are implemented and published in `946a2bf`.
`docs/COLORWAY_BASE_REVIEW.md` §Delivery update owns the detailed outcome/evidence;
`docs/INSTALL.md` owns installation instructions. Current source/runtime evidence takes
precedence over the older documentation-only snapshot preserved below.

**Implemented:** accessible state ink/fixed-color icon roles, correct Qt state selectors,
font policy, combo/scrollbar/group/tab cascade fixes, semantic hover surfaces, complete
ZIP downloads through the visible Settings action, and dependency-aware local copying.
Marked generated state/icon blocks are owned by `scripts/theme-state-tokens.mjs` and
updated through `pnpm sync:themes`. Preserve frozen palette comments and the standalone
Colorway base architecture.

**Verified:** Node suite and build pass; optional real-Qt probes pass locally and detect
the reviewed failures on the prior QSS; Chromium's visible download path succeeds and
surfaces missing assets without partial output; independent ZIP CRC/byte checks pass;
repeat sync is byte-idempotent. See the delivery update for environment/count details.

**Next verification:** a visual pass in actual OBS, particularly source-tree selection,
menus, disabled states, and high contrast. Offscreen Qt evidence does not close that gate.
No user OBS configuration or installed theme was changed.

The documentation/continuity edits predate the implementation and are preserved in
the published checkpoint. Use `git status` for the current change set; the old
“only two dirty files” statements below are a historical inventory only.

## Earlier documentation-only snapshot (historical)

## Outcome

Two documentation-reconciliation changes are staged on `main` at `86a1023`: the `.gitignore` allowlist
now covers `themes/` and `fonts/`, and `docs/ARCHITECTURE.md` documents the five OBS preview-layer
modules that carry half the shipped UI while correcting stale token and theme counts. `pnpm test` is
green (589 tests, 588 pass, 0 fail, 1 skipped). Nothing is committed; the tree carries `.gitignore`
and `docs/ARCHITECTURE.md` as the only modified files.

## Why it matters

The allowlist gap was a live data-loss trap on the project's primary content type. `.gitignore` line 1
is `/*/`, and the allowlist omitted `!themes/` and `!fonts/`. A newly created theme was ignored and
never appeared in `git status`, while already-tracked themes were unaffected — so the repository looked
perfectly healthy. Anyone adding a theme would have concluded the file was lost.

The `ARCHITECTURE.md` gap was a completeness failure. §3 documented only the theme engine
(`theme-loader`, `theme-workbench`, `main`, `theme-catalog`, `sync-theme-mirrors`) and never mentioned
`obs-preview.js`, `obs-preview-refine.js`, `obs-preview-actions.js`, `page-shell-sync.js`, or
`obs-preview-ambient.js` — 2,048 of the 3,859 lines of JS in `src/`, and every module `index.html`
actually loads. Following §3 alone would give a false picture of the codebase.

## Current state

**Branch context (committed, on `main`, in sync with `origin/main`):**

`HEAD` is `86a1023`, a fast-forward of the previous `a9e39d2`. Two PRs landed since this file was
last accurate, and both invalidate its previous text:

- `a9e39d2` — PR #8, `aster/catppuccin-siblings-v2`: eight Catppuccin-inspired sibling palettes plus
  the hardened non-destructive sync path. **This is the work the previous version of this file
  described as "pushed, unmerged, awaiting a merge decision." It is merged.**
- `86a1023` — PR #9, `aster/meristem-project-state`: the Meristem substrate itself, plus a stale-authority
  reconciliation pass. It added `ACTIVE_WORK.md` and `AGENTS.md`, populated all six `.meristem/*.md`
  files, **deleted `PROPOSED_CODE_FILE_REORGANIZATION_PLAN.md` as obsolete**, and fixed the
  `docs/ARCHITECTURE.md` test-coverage section to the measured 589/588/0/1 with a per-file table.

**Current working tree (uncommitted, the only dirty state):**

- `M .gitignore` — adds `!themes/` and `!fonts/` to the allowlist. This is the substantive fix;
  everything else in this file is documentation.
- `M docs/ARCHITECTURE.md` — adds §3.6–§3.11 (the preview layer and its boot/testing contract),
  adds the layer to the §1 diagram, and corrects measured figures: 40 `PALETTE_VARS` (not "~25"),
  274 base-theme variables (not "~150"), 159 variants (not "~150"), `Colorway.obt` at 3,659 lines
  (not 3,293), `styles.css` at 1,163 lines (not 679), and seven `npm run` invocations corrected to
  `pnpm`.

No implementation code, theme file, script, or test is modified. Nothing is staged.

## Locked decisions

- **The OBS preview layer stays a set of side-effect modules with no exports.** They are loaded by
  `index.html`, mount on `.obs-real-preview`, and share state through the DOM. This is now documented
  in `ARCHITECTURE.md` §3.6; treat that section as the contract when changing any of the five.
- **The `boot()` + `MutationObserver` retry is deliberate, not boilerplate to remove.** Each module
  returns `false` when its mount point is absent and retries until it appears, which is what decouples
  the preview layer from `main.js`'s render order.
- **Theme-layer and preview-layer tests are not the same kind of test.** The preview-layer tests assert
  on source text by regex because the modules export nothing. A green suite proves those source strings
  are present; it does not prove the UI works. Do not treat `pnpm test` as UI verification.
- **`.gitignore` last-match-wins ordering must not be reordered.** `!.meristem/` re-includes the
  canonical directory and the later `.meristem/local/` block re-ignores only the private lane.
- **The palette-comment stripper and the light-theme contract stay deliberately different rules**, and
  frozen `(source values; …)` comments are never regenerated. Carried forward unchanged from the
  previous version of this file; see `.meristem/DECISIONS.md`.

## Constraints / do-not-regress

- `pnpm sync:themes` on a clean tree must leave `git status` empty. A dirty first run is a regression,
  not formatting.
- Do not regenerate or "correct" the frozen `(source values; …)` comments in the light themes.
- Do not merge `theme-loader.js` into `theme-workbench.js`; `theme-loader.js` owns `parseOVT`.
- Do not nest `src/`. The reorg proposal that once argued for it was **deleted** in `86a1023` as
  obsolete — there is no live proposal to revisit.
- **Colorway stays its own base theme. Do not propose a Yami migration.** No `Yami.obt` base, no
  `Yami.obt → Colorway.ovt → Colorway-*.ovt` chain, no copying Yami rules in. This is settled — see
  `.meristem/DECISIONS.md` (2026-10-04). OBS's wiki recommends Yami as a base; we decline that
  deliberately. New OBS widgets get Colorway-styled rules added to `Colorway.obt` directly. Upstream
  Yami is a format-drift reference for `pnpm check:obs-upstream` only, never an architecture target.
  This has been proposed repeatedly by agents reading the wiki recommendation without the project
  context; do not be the next one.
- There is no lint script. Do not report a lint result.
- Use `pnpm`, not `npm`; the lockfile is pnpm's.

## Current objective

No active implementation objective. The documentation reconciliation that this file tracks is
complete and uncommitted; the decision to commit it, and on which branch, is the only open thread.

## Verification

Run against the current tree before extending any claim:

- `pnpm test` → **589 tests, 588 pass, 0 fail, 1 skipped** (~480ms). Re-run after the `ARCHITECTURE.md`
  edits: still green. No test reads `docs/ARCHITECTURE.md` or `.gitignore` (grep-confirmed), so these
  edits cannot affect the suite — that is why the green result is expected rather than surprising.
- `pnpm sync:themes` on pristine HEAD → left `git status` empty, checked by stashing the local edits,
  running sync, and confirming a clean tree. The do-not-regress invariant holds.
- `git check-ignore -v` → new `themes/*.ovt` and `fonts/*` paths are visible; `.meristem/local/`,
  `.vercel/`, `node_modules/`, `dist/`, and `docs/superpowers/` remain ignored.
- `meristem_init.py doctor --root .` → `Status: ready`.
- `PALETTE_VARS.length === 40` verified by counting the `PALETTE_GROUPS` literals in
  `src/theme-loader.js`; base variable count (274) and variant property count (72) counted directly
  from `themes/Colorway.obt` and two sibling `.ovt` files.

**Not verified:** the OBS preview layer's runtime behavior in a browser. Its modules export nothing, so
no test in this repository can confirm the UI still works after a change to them — `pnpm dev` and a
visual pass are required, and have not been done for these edits (the edits were documentation-only,
so no behavior changed).

## Open uncertainty

- **Whether to commit these two changes, and where.** Not decided. They are the only dirty state.
- **`patterns/` still has no generator.** Unlike the themes mirror, `public/patterns/` is an unguarded
  duplicate with no parity assertion. Recorded in `.meristem/FEATURE_REQUESTS.md`; undecided.
- **No root `README.md`.** `docs/ARCHITECTURE.md` is the de facto entry document. Whether a root README
  should exist or point at it is undecided; note that the allowlist makes a root file trackable.
- **`src/` flatness and `main.js` length** (1,183 lines) remain a possible future split, but there is no
  proposal on record and no agreed trigger.
- **The preview layer has no behavioral test coverage at all.** Documenting the limitation in §3.6 makes
  it visible but does not fix it. Whether to introduce a DOM-based test harness for those five modules
  is undecided and would be a real piece of work.
