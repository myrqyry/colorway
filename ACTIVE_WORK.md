<!-- meristem-template:v1 -->
# Active Work

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
No user OBS installation or settings were changed; migration is local and
uncommitted, not pushed. Details and provenance: `docs/MINGCUTE_MIGRATION.md`.


## Current continuation — base-theme review fixes

The requested base-theme fixes and asset delivery are implemented and uncommitted.
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

Existing documentation/continuity edits predate this implementation and remain in the
working tree. Use `git status` and scoped diffs to recover the current change set; do not
treat the old “only two dirty files” statements below as a current inventory.

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
