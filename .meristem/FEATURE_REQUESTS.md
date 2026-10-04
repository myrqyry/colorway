<!-- meristem-template:v1 -->
# Feature Requests

Requested capabilities that are not currently implemented.

This is not a backlog priority order. Keep requests here when remembering the capability prevents repeated rediscovery.

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
