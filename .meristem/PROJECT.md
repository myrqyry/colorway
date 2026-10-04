<!-- meristem-template:v1 -->
# Project

## Purpose

Colorway is a browser-based workbench for authoring, previewing, and installing OBS Studio
color themes (`.ovt`). It ships 159 curated themes plus a generator for Catppuccin-inspired
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
pnpm test                        # 589 tests, 588 pass, 0 fail, 1 skipped (network-gated)
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

- Before claiming a change works, run `pnpm test`. The suite is fast (~300ms) and is the gate.
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
