<!-- meristem-template:v1 -->
# Errors

Preserve costly, recurring, or non-obvious failures that future agents could plausibly repeat.

## 2026-10-17 — Commented historical colors parsed as active OBS palette declarations

**Observed failure:** A source audit seemed to show 142/143 unrelated Colorway
variants using Rosé Pine meter and selected-row colors. The generated
`/* Official palette reference ... */` snapshots in those `.ovt` files
indeed contain those values. But they are *comments*, not executable theme
overrides. The actual native OBS theme variables for Carbonfox, for example,
have no `--meter_fg_nom` override and inherit the semantic base default.

**Root cause:** `src/theme-loader.js` `parseOVT` extracted variables by
line without removing block comments, unlike the sync script's native parser.
The browser preview/workbench and generated offline dock could therefore
render and export phantom palette values. Even "Official palette reference"
was a misleading name for locally generated resolved snapshots, not proof
of an official external color.

**Fix:** Strip block comments inside the vars block before parsing and test
the complete 160-file corpus against an independent active-declaration
inventory. A failing Carbonfox regression went green. Never mutate all the
real `.ovt` themes to "fix" a parsed list before confirming that the values
are actually active in native OBS. Credit upstream creators separately,
with an evidence-level registry and unverified unknowns, in packaged
`THEME_CREDITS.md` and the offline dock.

## 2026-10-16 — OBS Settings native backdrop requires the owning widget AND final QSS order

**Observed failure:** In an actual OBS 32.2 Settings window, the thin outer
frame/gutters remained black across variants after scroll-page backgrounds
and text/control contrast had been fixed. Generic `QDialog` background
changes did not affect this frame. A scoped `OBSBasicSettings` backdrop
worked in a dark experimental stylesheet appended at end, but failed in
a light theme when the rule was placed earlier in the QSS.

**Root mechanism:** Native widget inspection showed the owning top-level
`OBSBasicSettings` QWidget retained `QPalette::Window = #000000`.
The final Qt stylesheet declaration order was consequential: even an
otherwise correct opaque `OBSBasicSettings` declaration placed before the
large generated icon block did not reliably paint the root on a light variant.

**Verified correction:** Emit `OBSBasicSettings { background:
var(--bg_window); }` as the final declaration of the generated button-icon
block in `scripts/theme-state-tokens.mjs`. This preserves the required
cascade position through regeneration while leaving child scroll-page and
sidebar SVG patterns intact. The actual captured Settings outer-frame pixels
matched `#191a2e` for dark EvondevDracula and `#eff1f5` for light
Catppuccin Latte Blue. The root QWidget palette also matched.

**How to detect:** Do not substitute an isolated Qt mimic for a native
OBS dialog: that Qt-only replica can report correctly themed pixels even when OBS has
a black root window. Verify the actual Settings window ID and widget palette
and sample known margin pixels in the screenshot. A source contract pins the
final opaque declaration, but the native visual gate is the stronger evidence.

## 2026-10-16 — OBS theme contrast validation checked ink without its actual surface

**Observed failure:** Native OBS Settings showed invisible disabled labels and unchecked checkbox outlines and barely legible sidebar items. 94/161 palettes had disabled text below 3:1 on their dock/group background; all 161 had unchecked checkbox base fill below 3:1 there. Generic state-token tests still passed because they checked foreground on the *base* or *selected* background, not the rendered control's background. There were also button, header, tab, and hover surface contrast failures.

**Root mechanism:** A palette contains multiple surfaces with different luminances. Generic `--text_muted` and `--text_disabled` values do not guarantee contrast on `--bg_dock`, `--button_bg`, `--bg_preview`, or hover surfaces. Disabled/hover text and the checkbox border cannot be tested by a palette-only token presence check.

**Correction:** Derive specific ink tokens from each effective foreground/background pair, including separately for focus and hover, compose 8-digit alpha colors over their backing surfaces, and check the shipped tokens for every base/variant with an independent contrast oracle. Add Qt paint/palette tests for actual disabled widgets and indicator borders, plus mutations that would re-break them. Preserve curated palette seeds and frozen source comments.

**False-positive test found during verification:** A disposable native-OBS screenshot script clicked a stale Settings coordinate, failed to open the dialog, and nevertheless sampled nonblack pixels from the OBS main window. A passing RGB assertion did not prove the requested window was visible. Future native probes must locate the actual `Settings` window ID, capture that window, and fail if it is absent. The narrow black dialog gutters were still unresolved at this checkpoint; they were closed later the same day by targeting the actual native Settings widget and ensuring the rule is last in the generated QSS (see the next entry).

**Evidence:** `test/theme-surface-legibility.test.js`, `test/theme-qt-render.test.js`, `test/helpers/qss-probe.py`, `docs/OBS_THEME_COMPATIBILITY.md`. Confirm source/runtime again before generalizing across OBS versions.

## 2026-09-27 — Sync silently deleted light-theme palette comments

**Observed failure:** Running theme sync replaced a light theme's `/* Official palette
reference (source values; live accessibility overrides below may differ): … */` block with a
freshly generated comment, erasing the only record of the theme's upstream source values. The
live token values (which carry accessibility overrides) were left in place, so the divergence
stayed invisible.

**Root mechanism:** Sync regenerated the palette comment from current code. For light themes the
shipped tokens no longer match the upstream palette, so the regenerated comment described
tokens that had never been the theme's source values — and the original record was overwritten
rather than kept alongside.

**Affected environment:** Any light theme whose shipped palette diverges from its source. All 22
light themes carry the annotation; 0 dark themes do. The concrete known case is
`Everforest-Light-Hard.ovt`, which documents `--warning: #DFA000` while shipping `#896200`.

**Recovery / fix:** Preserve annotated comments verbatim — `f369c68`. Then generalized the
preservation rule so it survives rewording, and added contracts pinning the frozen header name
and the annotation's required phrasing.

**How to detect earlier:** A first sync run that dirties the tree is the signal, not a
formatters' change. `git status` after `pnpm sync:themes` on a clean checkout must be empty.
Also: a palette comment whose documented hex values do not match the theme's own tokens is
either the intended record of divergence or a bug — never assume it is fine.

**Evidence / references:** `08a9b8d`, `f369c68`; `scripts/theme-palette-comments.mjs`.

## 2026-09-27 — The fix for the above would itself have re-broken it

**Observed failure:** The preservation rule initially hardcoded the exact 66-character
annotation wording. Every current light theme matched, so the suite was green — but reword the
annotation, or add a light theme that phrases it differently, and preservation silently stopped
while the stripper kept generalizing. The protection was one string narrower than the thing it
protected.

**Root mechanism:** Writing the guard against the concrete instance instead of the property.
The stripper two lines above already matched any parenthesized annotation, so the fragile half
was precisely the half doing the protecting.

**Affected environment:** Any future light theme, and any edit to an existing annotation's
wording.

**Recovery / fix:** Match any parenthesized annotation — `f369c68`.

**How to detect earlier:** Compare a guard's specificity against the property it protects. If a
stripper/remover generalizes and a preserver/validator on the same input does not, the
preserver is the bug.

**Evidence / references:** `f369c68`; verified the old regex returns `false` on a reworded
annotation the new one matches.

## 2026-09-27 — Generalizing a contract until it asserts nothing

**Observed failure:** After the annotation regex was relaxed from one exact sentence to any
parenthetical, `test/theme-base-contract.test.js` was checking only for a pair of parentheses.
A theme annotated `(todo: ask someone about this)` passed — and the newly permissive stripper
would then freeze that text into the file permanently.

**Root mechanism:** Removing brittleness by loosening the matcher without separating *shape*
from *content*. The matcher stopped constraining meaning while the test name and failure message
still claimed it constrained accessibility divergence.

**Affected environment:** Every light theme's annotation, now permanent once frozen.

**Recovery / fix:** Keep the shape general, pin the semantics — require `source values` inside
the parentheses, and say so in the failure message.

**How to detect earlier:** After loosening a matcher, re-read the test's own name and message.
If the assertion is now satisfied by input the message would reject, the matcher is too loose.
Mutation-test with a plausible-but-wrong annotation such as `(todo: …)`.

**Evidence / references:** `9759123`; verified `(souce values)` and `(todo: …)` are rejected
while a legitimate rephrase passes.

## 2026-09-27 — Helper modules reported as passing tests

**Observed failure:** `node --test` printed `✔ test/helpers/themes.mjs` and the suite count rose
from 589 to 590, because the default glob collects every file under `test/`. A module with zero
assertions was counted as a passing test.

**Root mechanism:** The default `node --test` glob includes `**/test/**/*.?(c|m)js`, not just
`*.test.js`. Any non-test module placed in a `test/` directory becomes a green test.

**Affected environment:** Any helper, fixture, or utility added under `test/`.

**Recovery / fix:** Pin the script to `node --test "test/**/*.test.js"` — `9759123`.

**How to detect earlier:** Watch the test count when adding a file under `test/`. An unexplained
increment with zero new assertions means a module is being collected.

**Evidence / references:** Count returned to 589/588/0 after the pin; the helper no longer appears
in output.

## 2026-09-27 — Verification harness produced three false results

**Observed failure:** Three separate checks in this session reported the wrong thing: a
mutation that "broke" a test it was meant to exercise (an unrelated byte-identity test saw a
`themes/` file edited without its `public/` mirror), a runner invoked as `node --test` that
bypassed the pinned `test` script, and an assertion-message extractor that silently found
nothing and reported "no message captured" without flagging as a failure.

**Root mechanism:** Treating a harness as trustworthy, and treating a "no output matched my
regex" result as a result rather than as evidence the regex was wrong. Each failure mode looked
like a code problem.

**Affected environment:** Any mutation-based verification.

**Recovery / fix:** Mutate every mirror the contracts read; invoke the project's own test
script; and read the raw failure block instead of pattern-matching an expected message.

**How to detect earlier:** When a verification harness's own output is empty or "not found",
that is a harness defect until proven otherwise. Print the raw text before concluding anything
about the code.

**Evidence / references:** All three were caught by re-running with visible output; in each case
the code was correct and the harness was wrong.

## 2026-10-04 — Theme-supplied SVG icons do not tint; stop trying to make them

**Observed failure:** Repeated attempts to make OBS recolor the theme's own SVG icons — via
`currentColor`, theme-token fills, or CSS-variable indirection — have failed across multiple
maintainer passes. Each attempt was re-derived from scratch because the conclusion was never
recorded. This is a recurring, non-obvious platform limitation, not a bug in the current icons.

**Root mechanism:** OBS renders QSS `image: url(theme:…)` through Qt's SVG rasterizer, which honors
the fill authored in the file. It does not propagate `currentColor` or CSS custom properties into
the SVG, so a theme-supplied icon's color is fixed at authoring time. Corroborating evidence: the
upstream Yami theme (tracked by `scripts/check-obs-upstream.mjs`) bakes `fill="#fefefe"` into
`frontend/data/themes/Dark/plus.svg` rather than attempting theming. Baked color is the OBS norm.

**Affected environment:** `themes/Colorway.obt` and every icon under
`icons/colorway/iconamoon/{normal,selected}/` (98 files, referenced 142× via `url(theme:…)`).

**Recovery / fix:** None needed for the limitation itself — accept baked color and design around it.
The follow-on consequence is the real defect: all 98 icons are baked to exactly two Catppuccin Mocha
values, `#e0def4` and `#191724`, while the catalog spans 159 variants. The 22 light variants have
near-white icons on near-white surfaces, e.g. `#e0def4` on CatppuccinLatte `--bg_base: #e6e9ef`
= **1.08:1**. Icons must be authored per polarity, or per variant, not once.

**How to detect earlier:** Before proposing any icon theming, assume baked color and check the
contrast of the baked fill against the *target* surface. Note that this class of defect is invisible
to both the test suite and the preview site: `src/obs-preview.css` renders icons as CSS
`mask: var(--obs-icon)`, and a mask discards fill entirely, so the preview is faithful for shape and
structurally blind to icon color. Only OBS itself shows this.

**Evidence / references:** `icons/colorway/iconamoon/` (98 files, two hex values across all of them);
`themes/Colorway.obt` `url(theme:…)` references; `src/obs-preview.css` mask rendering; upstream
Yami `Dark/plus.svg`; `docs/OBS_THEME_COMPATIBILITY.md` (which does not currently discuss icon color).
