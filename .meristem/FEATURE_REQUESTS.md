<!-- meristem-template:v1 -->
# Feature Requests

Requested capabilities that are not currently implemented.

This is not a backlog priority order. Keep requests here when remembering the capability prevents repeated rediscovery.

## Reconcile the superseded reorg plan with the tree

> **Closed 2026-09-29** — executed. `PROPOSED_CODE_FILE_REORGANIZATION_PLAN.md` now carries a
> status-correction header naming commit `90bbbe4` as the executor of Tier 1, and its
> "themes loose at the root" premise line was annotated as pre-execution. The body otherwise
> retains its pre-execution snapshot by design. Residual open items (§8.1–8.5, §9, §12) are
> listed in the header and in PROJECT.md §Open structural uncertainty.

**Capability:** Annotate, archive, or update `PROPOSED_CODE_FILE_REORGANIZATION_PLAN.md`.

**Why it matters:** The plan opens with "Status: Proposal / review before execution (no files
have been moved yet)" and describes themes loose at the repository root, `copy-themes.sh` at
root, and the font at root. Commit `90bbbe4` executed all of Tier 1, so the *status line* and
the *root-layout premises* are false, while the body's pre-execution snapshot is accurate as
history. Its test baseline (475 tests, 468 pass, 6 fail) is also wrong — the suite is 589/588/0.
An agent that opens it to find current work will act on a completed plan.

**Current gap:** Closed — see the status-correction header added to the plan itself.

**Constraints:** Its Tier 1–2 recommendations and the tracked path-edit table remain useful as a
record of what changed and why. Do not delete it; mark it.

**Related project state / references:** Recorded under "Open structural uncertainty" in
PROJECT.md; the reorg commit is `90bbbe4`.

## Update the stale test counts in docs/ARCHITECTURE.md

> **Closed 2026-09-29** — fully done. The "Test coverage" section now reports **589 tests, 588
> pass, 0 fail, 1 skipped**, with a per-file table measured by running `node --test` on each
> `test/*.test.js` individually (12 files; 477 + 29 + 17 + 8 + 8 + 9 + 12 + 7 + 5 + 6 + 3 + 8 =
> 589, cross-checked programmatically). The `npm run test` line matches. The bogus root
> `vite.config.js` line had already been removed.

**Capability:** Correct the "Test coverage (475 tests)" section to the real 589, and re-check
the per-file counts it attributes (it credits `new-themes-contract.test.js` with 452).

**Why it matters:** ARCHITECTURE.md is the de facto entry document for this repository. Wrong
counts there undermine trust in every other number it reports, and the reorg plan used a
matching count as a cross-check that the docs were "otherwise truthful" — so two documents
currently agree on a figure that is wrong.

**Current gap:** Doc-only change; no code is involved.

**Constraints:** The bogus root `vite.config.js` line the reorg plan flagged in this same
document has already been removed, so that part is closed.

**Related project state / references:** `docs/ARCHITECTURE.md` §"Test coverage"; also noted in
PROJECT.md.

## Guard the `patterns/` mirror the way the `themes/` mirror is guarded

**Capability:** Mirror `patterns/*.svg` into `public/patterns/` from a script, and assert parity
in `test/preview-contract.test.js`.

**Why it matters:** `themes/` and `patterns/` are both duplicated into `public/`, but only the
themes duplicate has a generator and a byte-identity contract. The patterns copy is an
unguarded duplicate, which is the same class of risk the themes mirror was hardened against.
`test/preview-contract.test.js` already checks `public/patterns/` against `patterns/`, so the
assertion partly exists; the missing half is a sanctioned way to regenerate.

**Current gap:** No `sync` path for patterns; the check exists but the producer does not.

**Constraints:** The reorg plan's step 6 proposed exactly this and it was not executed. Keep
`patterns/` and `public/patterns/` both at the repository root as the `/*` allowlist requires.

**Related project state / references:** `scripts/sync-theme-mirrors.mjs`,
`test/preview-contract.test.js`, and step 6 of the reorg plan.

## Decide whether `src/` should be reorganized or `main.js` split

**Capability:** A recorded decision, not necessarily code.

**Why it matters:** The reorg plan explicitly recommended leaving `src/` flat and not splitting
`main.js` "until the >500-line rule becomes a standing convention." `src/` now holds 15 entries
and `main.js` is 1183 lines, so both are past the stated trigger. Continuing to follow a
superseded recommendation by default is how drift becomes policy.

**Current gap:** No decision has been recorded either way. `src/` currently mixes modules
(`theme-catalog.js`, `theme-loader.js`, `theme-workbench.js`) with flat feature files
(`obs-preview*.js/.css`, `page-shell-sync.*`) and one 1183-line `main.js`.

**Constraints:** `index.html` must remain at the Vite root. `parseOVT` must remain importable
from `theme-loader.js`; the `theme-workbench.js` re-export is load-bearing for at least one
existing import path.

**Related project state / references:** §5.3 and §6.3 of the reorg plan; DECISIONS.md records
"do not nest `src/`" as a current constraint, which this request may revisit.

## Decide whether a root README should exist

**Capability:** A root `README.md`, or an explicit decision that `docs/ARCHITECTURE.md` is the
entry point.

**Why it matters:** The repository root has no README. A new contributor or agent starts at
`docs/ARCHITECTURE.md` by convention rather than by instruction. Note that the `/*` allowlist
means a root README is trackable by default, but a new root file still needs verifying against
the ignore rules.

**Current gap:** No entry document at the root, and no statement of which document is canonical.

**Constraints:** The allowlist in `.gitignore` negates specific directories; a new root file
should be confirmed with `git check-ignore -v`.

**Related project state / references:** `docs/ARCHITECTURE.md`, `UBIQUITOUS_LANGUAGE.md`.

## Give the frozen palette blocks a way to prove completeness

**Capability:** A contract asserting the frozen `(source values; …)` comments list the full
current `PALETTE_VARS` set, or an explicit decision that they are frozen snapshots exempt from
such a check.

**Why it matters:** `injectCommentBlock` preserves the entire frozen comment verbatim, so a
palette variable added to `src/theme-loader.js` is documented by the dark themes but silently
absent from the 22 light ones. The divergence is invisible because the comment still reads
authoritatively. Freezing is the right trade-off, but the scope of the freeze is currently
undefined — this records it either way.

**Current gap:** No contract on frozen-block contents, and no documented statement that frozen
blocks are exempt.

**Constraints:** Must not regenerate the frozen values. A completeness check is informational
about drift, not a repair mechanism.

**Related project state / references:** `scripts/theme-palette-comments.mjs` (preservation
rationale in DECISIONS.md), `src/theme-loader.js` (`PALETTE_VARS`).
