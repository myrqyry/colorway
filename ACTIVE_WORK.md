<!-- meristem-template:v1 -->
# Active Work

## Outcome

PR #8 (`aster/catppuccin-siblings-v2` → `main`) — eight Catppuccin-inspired sibling palettes
plus a hardened, non-destructive theme sync path — is code-complete, pushed, and green, awaiting
review and a merge decision. A second, smaller strand — the Meristem substrate — is scaffolded
in the working tree and not yet committed.

## Why it matters

The sync path originally had a destructive failure mode: regenerating a light theme's palette
comment could silently delete the frozen record of where that theme's colors came from. The
branch's purpose is to make sync idempotent and provably non-destructive, so the theme corpus
can be regenerated without fear of losing hand-curated provenance. That property is now
enforced by contracts rather than by convention, and it is easy to regress by "tidying up" the
preservation logic.

## Current state

**Branch context (committed and pushed, 12 commits ahead of `main`, 0 behind):**

- `a5f6d26` feat: add Catppuccin-inspired sibling palettes
- `5c2e506`…`08a9b8d` — generator/sync hardening, including `08a9b8d fix: preserve light-theme
  source palette notes` (the originating preservation bug).
- `f369c68` fix: preserve any annotated palette reference, not one wording
- `9759123` test: derive light-theme checks from the runtime parser
- `747813c` test: make the frozen-comment contract non-vacuous and self-explaining

`HEAD` is `747813c` and matches `origin/aster/catppuccin-siblings-v2`. The branch is **not**
merged into `main`; `main` does not contain any of these commits.

**Current working tree (uncommitted, and the only dirty state):**

- `?? .meristem/` — new substrate (`README.md`, `PROJECT.md`, `DECISIONS.md`, `LEARNINGS.md`,
  `ERRORS.md`, `FEATURE_REQUESTS.md`, plus an ignored `local/`).
- `?? AGENTS.md`, `?? ACTIVE_WORK.md` — new agent entry point and this file.
- `M .gitignore` — two additions: `!.meristem/` (see Locked decisions) and the
  `<!-- meristem:local-ignore -->` block.

No implementation code is dirty. The review-response work is finished and pushed; the
Meristem files are the only uncommitted artifacts.

## Locked decisions

- **The palette-comment stripper and the light-theme contract are deliberately different
  rules, and must not be collapsed into one.** `SOURCE_VALUES_COMMENT_RE` in
  `scripts/theme-palette-comments.mjs` freezes *any* parenthesized annotation; the contract in
  `test/theme-base-contract.test.js` accepts only an annotation containing `source values`.
  Rationale: preservation is a safety rule (freezing too much costs a redundant comment,
  freezing too little destroys a historical record), while the contract is an authoring rule.
  A review round proposed exporting the stripper regex and asserting against it; doing so would
  have re-opened a permissiveness hole an earlier round had closed. If a future round proposes
  this again, it has already been considered and rejected.
- **Preserve frozen palette comments verbatim rather than regenerating them.** Rewriting source
  values would be the actual bug; a stale-but-honest record beats an accurate-but-fictional one.
- **A light theme's frozen comment header must name its current `@OBSThemeMeta` name.** Asserted
  by `test/catppuccin-siblings-contract.test.js`, including a non-vacuity check that names the
  offending files, so a rename fails loudly instead of drifting invisibly.
- **`pnpm test` is pinned to `test/**/*.test.js`.** `node --test`'s default glob collects every
  file under `test/`, which reported helper modules as passing tests that contain no assertions.
  Do not widen the glob.
- **`.meristem/` must be explicitly allowlisted in `.gitignore`.** The repo's first rule is `/*`,
  which hid the entire canonical Meristem directory; `!.meristem/` restores the canonical files
  as commit-safe repository knowledge while the later `.meristem/local/` block re-ignores only
  the private lane. Last-match-wins ordering is what makes this correct — do not reorder those
  two blocks.

## Constraints / do-not-regress

- `pnpm sync:themes` on a clean tree must leave `git status` empty. A dirty first run is a
  regression, not formatting.
- Do not regenerate or "correct" the frozen `(source values; …)` comments in the 22 light themes.
  Their values intentionally differ from the live tokens (e.g. `Everforest-Light-Hard.ovt`
  documents `--warning: #DFA000` while shipping `#896200`). That divergence is the record.
- Do not merge `theme-loader.js` into `theme-workbench.js`; `parseOVT` is consumed from both
  paths today and `theme-loader.js` is the owner. Import from the owner in new code.
- Do not nest `src/`. A reorg proposal exists but is not adopted (see PROJECT.md uncertainty).
- There is no lint script. Do not report a lint result.

## Current objective

No active implementation objective is recorded here. The previous repository reorganization and
documentation-reconciliation work is complete. Choose future work from current runtime needs or
the remaining open uncertainties in `.meristem/PROJECT.md`.

## Verification

Before making a fresh verification claim, run against the current tree:

- `pnpm test` → **589 tests, 588 pass, 0 fail, 1 skipped**. Re-run after the doc edits; still
  green. The per-file breakdown was independently measured (not inherited from the suite
  summary) and matches the table now in `docs/ARCHITECTURE.md`.
- `meristem_init.py doctor --root .` → `Status: ready`, all 9 checks `ok`, including after the
  `.meristem/FEATURE_REQUESTS.md` and `PROJECT.md` updates.
- `pnpm sync:themes` on pristine HEAD → left `git status` clean (checked via stash/restore).
- `pnpm build` was **not** run in this session. CI runs it on the PR; confirm it there.

Behavior was validated by mutation rather than by inspection: rewording an annotation is still
preserved, a `souce` typo is rejected, a `(todo: …)` annotation is rejected, a legitimate
rephrase is accepted, a rename fails loudly, and an unannotated light theme fails the non-vacuity
check. A theme omitting `dark:` was confirmed to resolve to **dark**, matching
`src/theme-loader.js`.

## Open uncertainty

- **PR #8's review and CI state is unverified.** This machine has no `gh` authentication, so
  `gh pr view` / `gh pr checks` were unavailable. PR state here is inferred from git: the
  branch is pushed, level with its remote, 12 commits ahead of `main`, and unmerged. Whether
  reviewers have responded, whether CI is green, and whether Kilo Code's review loop considers
  the branch done are all unknown. Check on an authenticated machine before assuming the PR is
  ready to merge.
- Whether the maintainer wants the Meristem substrate committed at all, and on which branch.
- `src/` flatness and `main.js` length (15 entries, 1183 lines) are past the reorg plan's stated
  triggers; no decision recorded on whether to revisit. The reorg plan's remaining
  recommendations (§8.1–8.5, §9, §12) are unexecuted by design.
- The `patterns/` mirror still has no generator script; only the themes mirror is guarded.
