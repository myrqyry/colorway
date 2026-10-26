<!-- meristem-template:v1 -->
# Project

## Purpose

Colorway is a browser-based workbench for authoring, previewing, and installing OBS Studio
color themes (`.ovt`). It ships 160 curated themes plus a generator for Catppuccin-inspired
sibling palettes, a Lospec palette importer that distills an arbitrary palette into the full
OBS token set, a live two-way OBS theme mirror, and a set of contracts that treat the theme
files themselves as the product artifact rather than as generated noise.

The distinctive premise: the theme corpus is the deliverable, so the repo is built around
keeping hand-curated `.ovt` files, their generated `public/` mirrors, and their documented
palette provenance mutually consistent and provably so.

## Invariants

- `themes/` is the source of truth for `.ovt` files; `public/themes/` is a byte-identical
  mirror. Enforced by `test/theme-base-contract.test.js` ("source and public theme
  distributions are byte-identical") and produced by `scripts/sync-theme-mirrors.mjs`.
  Edit one and the other drifts until you run `pnpm sync:themes`.
- `src/theme-loader.js` owns `parseOVT` and is the single parser authority. Its `dark` rule is
  authoritative: `dark: 'false'` means light, and an absent `dark:` key means **dark**. Do not
  re-derive this in new code; import the parser (see `test/helpers/themes.mjs` for the pattern).
- Generated sibling palettes must keep the 12-neutral + 14-accent seed shape and use only
  OBS-safe lowercase hex seeds. Contract: `test/catppuccin-siblings-contract.test.js`.
- A light theme whose palette comment carries a parenthesized annotation is a **frozen
  historical record** of upstream source values. `injectCommentBlock` preserves such a comment
  verbatim and never regenerates it. Do not "fix" a frozen comment to match current code.
- Regeneration must be a no-op on a clean tree. `pnpm sync:themes` on pristine HEAD must leave
  `git status` empty; a first run that dirties the tree is a defect, not a formatting change.
- The test suite is the only quality gate. There is no lint script; do not claim a lint pass.

## Architecture and boundaries

- `src/theme-catalog.js` — static curated theme/pattern lists and defaults. No logic.
- `src/theme-loader.js` — OVT parsing (`parseOVT`), recursive `extends` resolution, runtime
  loading, and `PALETTE_VARS` / `PALETTE_GROUPS` (the token vocabulary).
- `src/theme-workbench.js` — theme authoring: normalization, `serializeOVT`, Yami conversion,
  OKLCH color math, Lospec import. **Re-exports `parseOVT` from `theme-loader.js`**, so the
  parser is importable from two paths. New code should import from the owner
  (`theme-loader.js`); the re-export is retained for compatibility.
- `src/main.js` + `obs-preview*.js` / `obs-preview-ambient.*` / `obs-preview-refine.*` /
  `page-shell-sync.*` / `styles.css` — the Vite app shell. `index.html` must stay at the repo
  root for Vite.
- `scripts/sync-theme-mirrors.mjs` — produces the `public/` mirror. The only sanctioned way to
  change a `themes/` file's mirrored copy.
- `scripts/generate-catppuccin-siblings.mjs` — sibling palette generator. The generator is the
  source of truth for those eight themes; the contract asserts the checked-in files are exactly
  its output.
- `scripts/theme-palette-comments.mjs` — shared `buildPaletteComment` / `injectCommentBlock`
  used by both the generator and the sync script.
- `scripts/check-obs-upstream.mjs` — weekly OBS theme-format drift watch.

Existing authority, preferred over duplicating it here:

- `docs/ARCHITECTURE.md` — architecture, token tables, color math, and the intended file layout.
- `UBIQUITOUS_LANGUAGE.md` — domain glossary. Use its terms (Theme, Palette, Pattern, Slop).
- `docs/CATPPUCCIN_SIBLINGS_V2.md` — the sibling palette recipe; its JSON blocks are contract-
  tested against the generator source.
- `docs/OBS_DESIGN_REFERENCE.md`, `docs/OBS_THEME_COMPATIBILITY.md` — OBS format/compat detail.
- `.github/workflows/` — CI is authoritative for what must pass.

## Known-good workflows

```bash
pnpm install --frozen-lockfile   # CI's install; pnpm 11.17.0 is the pinned packageManager
pnpm test                        # Node suite; optional offscreen Qt tests when PyQt6 is available
pnpm build                       # vite build
pnpm sync:themes                 # regenerate public/ mirror from themes/
pnpm generate:siblings           # regenerate the 8 sibling themes, then sync
pnpm check:obs-upstream          # OBS theme format drift check
pnpm dev                         # vite dev server
```

CI runs `pnpm install --frozen-lockfile`, `pnpm test`, and `pnpm build` on every pull request
and on pushes to `main` (Node 22). `pnpm test` is pinned to `test/**/*.test.js` so helper
modules under `test/` are not collected as tests that pass on containing no assertions.

## Verification

- Before claiming a change works, run `pnpm test` and inspect the current pass/skip summary. Qt/native coverage now takes several seconds; do not rely on historical test counts or timing.
- The one skipped test (`fromLospecPalette`) is network-gated by design; it is not a failure.
- For generator work, assert the checked-in artifacts still equal generator output — the
  contract already does this, so a green suite is the proof.
- For sync/mirror work, `git status` must be clean after `pnpm sync:themes` on a clean tree.
- Verify user-visible claims in a browser (`pnpm dev`) rather than inferring them from code.

## Open structural uncertainty

- ~~`docs/ARCHITECTURE.md` §"Test coverage" still reports 475 tests and credits
  `new-themes-contract.test.js` with 452; the real figure is 589 total.~~
  **Closed 2026-09-29** — the section now reports 589/588/0/1 with a per-file table measured by
  running `node --test` on each `test/*.test.js` individually (12 files summing to 589,
  cross-checked programmatically). The bogus root `vite.config.js` line had already been
  removed.
- src/ remains intentionally flat; main.js is large enough that a future split may be worthwhile,
  but only for a concrete maintenance or feature need.
- There is no root `README.md`. `docs/ARCHITECTURE.md` is the de facto entry document; whether a
  root README should exist or point at it is undecided.
- `patterns/` has a `public/patterns/` mirror that, unlike the themes mirror, has no generator
  script and no parity assertion. Whether that unguarded duplicate should be brought under the
  same contract as `themes/` is undecided.
- **The five OBS preview-layer modules have no behavioral test coverage.** `obs-preview.js`,
  `obs-preview-refine.js`, `obs-preview-actions.js`, `obs-preview-ambient.js`, and
  `page-shell-sync.js` export nothing, so their tests assert on source text via regex. A green suite
  proves those literals are present, not that the UI works. Documented in `docs/ARCHITECTURE.md` §3.6
  as of 2026-10-04; whether to add a DOM-based harness is undecided.

## Closed 2026-10-04

- **`docs/ARCHITECTURE.md` §3 omitted the entire OBS preview layer.** It documented only the theme
  engine while `index.html` loads five more modules totalling 2,048 of the 3,859 lines of JS in `src/`.
  Added §3.6–§3.11 covering the side-effect module contract, the `boot()`/`MutationObserver` retry,
  DOM-based state sharing, and the source-text testing limitation; added the layer to the §1 diagram.
- **Stale figures in `docs/ARCHITECTURE.md`.** Corrected against measurement: `PALETTE_VARS` is 40
  (was "~25"), the base theme declares 274 variables (was "~150"), there are 160 variants
  (was "~150"), `Colorway.obt` is 3,659 lines (was 3,293), `styles.css` is 1,163 lines (was 679).
  The "~25 vs all 150" framing in §7.5 was wrong on all three numbers and is now explained: 40 is the
  tracked *palette* vocabulary, while a shipped variant declares 72 custom properties in total.
- **`npm run` in documentation.** Seven invocations in `docs/ARCHITECTURE.md` corrected to `pnpm`. The
  repo pins `pnpm@11.17.0` and CI uses pnpm; the lockfile is pnpm's, so the two are not interchangeable.
- **`.gitignore` allowlist omitted `!themes/` and `!fonts/`.** A new theme or font file was silently
  ignored and never appeared in `git status`, while tracked files were unaffected so the repository
  looked healthy. Fixed by adding both entries. This closed an instance of the failure class already
   recorded in `LEARNINGS.md` (2026-09-27), which had fixed only `.meristem/`.

## State contrast and asset delivery (2026-10-06)

- `scripts/theme-state-tokens.mjs` owns the marked generated state-token blocks in the
  base/variants and render-time button-icon block in the base. Edit palette/QSS inputs,
  then run `pnpm sync:themes`; do not hand-edit these generated blocks. It derives
  on-accent ink and fixed-color SVG polarity without changing palette seeds or frozen
  palette comments. The sibling generator uses the same helper, preserving its contract.
- `pnpm sync:themes` also mirrors `Colorway.obt`, icons, patterns, and font/license assets,
  and produces `public/theme-assets.json` plus `public/INSTALL.md`. Repeat runs must be
  byte-idempotent across source themes and public artifacts.
- `src/theme-package.js` creates complete catalog ZIPs with `fflate`. Both the legacy
  Browse action and the visible Settings action call it. The visible catalog default is
  now ZIP; raw `.ovt`/external snapshot exports remain explicit. Required asset fetch
  failures reject the package and must surface in the UI rather than download partial output.
- `docs/INSTALL.md` owns installation layout/font instructions. `copy-themes.sh` accepts
  an explicit destination and includes icons/patterns. QSS cannot load bundled fonts via
  `@font-face`; Bricolage must be OS-installed or the tested Qt fallback list is used.
- Qt's render-time `icon:` property supports QPushButton state changes; `qproperty-icon`
  in hover pseudo-states is not an equivalent mechanism. QToolButton/source-indicator
  surfaces stay neutral where reliable dynamic icon/child-palette propagation is absent.
  Valid OBS Idian runtime class/repolish mechanisms remain intact.
- `test/theme-state-contrast.test.js` independently checks composed corpus contrast and
  generated fixed points; `test/theme-package.test.js` exercises real asset bytes and
  failure paths. `test/theme-qt-render.test.js` adds optional offscreen PyQt6 behavior
  checks with known-bad controls. No Python package is required for the normal Node path.

Delivery evidence and OBS-specific verification limits: `docs/COLORWAY_BASE_REVIEW.md`
§Delivery update. Its test counts/measurements are an observation of that verified change,
not a permanent inventory; recover current counts by running the suite.
