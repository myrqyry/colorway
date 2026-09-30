# Agent Instructions

<!-- meristem:start -->
## Meristem project continuity

This repository uses Meristem project state.

Before non-trivial work:

1. Treat current repository/runtime evidence as the authority for what exists now.
2. Read `.meristem/PROJECT.md` for durable project purpose, invariants, and architecture boundaries when relevant.
3. If `ACTIVE_WORK.md` exists, read it for the current objective, locked decisions, constraints, verification state, and unresolved uncertainty.
4. Consult `.meristem/DECISIONS.md`, `LEARNINGS.md`, `ERRORS.md`, or `FEATURE_REQUESTS.md` only when they can materially change the current task.
5. Do not promote session detail into durable files merely because it is recent. Persist consequential state before dependent continuation when losing it would make later work expensive or misleading.
6. Preserve existing project conventions and working state. Do not broadly rewrite configuration or clean up unrelated code for convenience.
7. Verify user-visible outcomes before claiming completion.
8. Treat canonical `.meristem/*.md` files and `ACTIVE_WORK.md` as commit-safe repository knowledge. Keep secrets, personal continuity, raw conversations, and machine-specific state out of them; use `.meristem/local/` only for repo-local private/machine state.

Use the narrowest capable tool or specialist. Current source and runtime truth outrank stale continuation notes.
<!-- meristem:end -->

## Where things are

Durable project truth lives in `.meristem/PROJECT.md` (purpose, invariants, architecture
boundaries, verification, known uncertainty). Read it before non-trivial work rather than
re-deriving the layout. This file intentionally does not restate those invariants.

- **Changing a theme (`themes/*.ovt`)** — read `.meristem/PROJECT.md` §Invariants first. The
  palette comments in light themes are frozen records, not generated output. Run
  `pnpm sync:themes`; the `public/` mirror is generated, never hand-edited.
- **Changing generator or sync tooling (`scripts/`)** — the sibling generator's checked-in
  output is contract-tested against the generator source, so a green `pnpm test` is the proof
  the artifacts still match. See `.meristem/DECISIONS.md` for the preservation rationale.
- **Changing tests (`test/`)** — `pnpm test` is pinned to `test/**/*.test.js`; helper modules
  are safe under `test/`. New test files must be named `*.test.js` to run.
- **Architecture questions** — `docs/ARCHITECTURE.md` is the reference; `UBIQUITOUS_LANGUAGE.md`
  is the domain glossary and its terms should be used in code and discussion.
- **Deciding what to work on** — `ACTIVE_WORK.md`, then `.meristem/FEATURE_REQUESTS.md`.

Verify with `pnpm test` (589 tests, ~300ms). It is the only quality gate; there is no lint
script, so do not report a lint result.

No nested `AGENTS.md` files are used. `src/`, `scripts/`, `test/`, and `themes/` are distinct
enough to be worth describing, but each one's gotchas already live in `.meristem/PROJECT.md`,
so per-directory files would only duplicate them. Add one when a subtree develops local commands
or constraints that the root genuinely cannot state.
