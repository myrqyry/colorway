<!-- meristem-template:v1 -->
# Learnings

Project-local reusable lessons. A learning should prevent future work or error, not merely narrate what happened.

## 2026-09-27 — A guard that hardcodes the string it protects is not a guard

**Signal / failure:** `SOURCE_VALUES_COMMENT_RE` matched one exact 66-character annotation
wording, while the stripper directly above it had already generalized the same shape with
`\([^)]*\)`. All 22 light themes happened to match, so the suite was green.

**Mechanism:** When a check exists to protect a property of some data, encoding the data's
current exact text makes the check a hostage note. It validates today's bytes, not the
property. It fails safe in appearance (green) and unsafe in reality (a reworded annotation
silently loses its protection while every existing test still passes).

**Scope:** Any regex or predicate guarding a property over data whose wording may legitimately
change — comments, annotations, messages, labels.

**Evidence:** Mutating one theme's annotation to `(source values; accessibility-adjusted below
may differ)` left the old regex returning `false`, i.e. the stripper would have fallen back to
the generated comment and deleted the record. The generalized form returned `true`.

**Recommended behavior:** Match the *shape* that carries the meaning — a parenthesized
annotation — not one instance of it. When a specific phrase is genuinely the requirement, assert
the phrase in the contract and keep the destructive path permissive; see DECISIONS.md.

**Validation status:** tested

## 2026-09-27 — An optional-chained index followed by a method call throws instead of asserting

**Signal / failure:** `body.match(RE)?.[1].trim()` reads as defensive but is not. `null?.[1]`
is `undefined`, and `.trim()` on `undefined` is a `TypeError`.

**Mechanism:** `?.` guards the property access, not the receiver of the *next* call. The guard
appears to cover the whole expression and converts a would-be assertion failure into a crash
whose stack names no file, no theme, and no contract.

**Scope:** Any `x?.[i].method()` or `x?.y.method()` chain, especially inside a loop over files
where the message is the only diagnostic.

**Evidence:** Replaced with an explicit `if (!frozen) { unfrozen.push(file); continue; }` that
records the offending file and asserts on the collected list, so the failure names the file
instead of throwing.

**Recommended behavior:** Either compare inside a single optional chain, or branch explicitly
and keep the file identity for the message. Never chain a method call onto an optional result
and expect a graceful skip.

**Validation status:** tested

## 2026-09-27 — A `continue` in a guard loop can turn an assertion into a vacuous pass

**Signal / failure:** A contract iterated light themes and skipped any without a frozen
comment, while asserting only that the file list was non-empty. Stripping one theme's annotation
left all assertions passing — the test walked 22 files, matched 21, and reported success.

**Mechanism:** `continue` on the interesting case is only safe if something else asserts on what
was skipped. Otherwise the guard converts a hard failure into silence, and the test degrades to
a smoke check whose scope silently depends on the data.

**Scope:** Guard-and-skip loops in contract tests, especially where a sibling contract in
another file treats the same state as a hard failure — two contracts, opposite verdicts, one
file.

**Evidence:** Now collects skipped files and asserts the list is empty, naming them. Verified
that removing one annotation produces `Colorway-CaveOfThePast.ovt: light theme(s) need a
(source values; ...) palette annotation, …`.

**Recommended behavior:** If you skip, accumulate and assert the accumulator is empty. Also
check whether a sibling test asserts the opposite for the same input.

**Validation status:** tested

## 2026-09-27 — Mutation testing separates a real guard from a green test

**Signal / failure:** Several checks in this session reported false confidence: a harness
mutation that broke an unrelated byte-identity test, a regex over one mirror only, and a runner
invocation that bypassed the pinned script.

**Mechanism:** A test that passes tells you nothing about whether it would fail for the right
reason. Without deliberately breaking the input, "green" is indistinguishable from "not
testing anything."

**Scope:** Any new contract test, and any verification of an existing one.

**Evidence:** Six mutations were used to characterize the palette-comment contracts: reworded
annotation preserved; differently-worded annotation preserved; unannotated theme skipped
without crashing; bare comment still replaced; `souce` typo rejected; rename rejected. Three
earlier harness runs reported failures that turned out to be artifacts — mutating `themes/`
without mirroring `public/themes/`, and running `node --test` directly instead of `pnpm test`.

**Recommended behavior:** Before trusting a contract, mutate the input to produce the failure it
promises, and read the actual assertion message. When a mutation "fails" for an unrelated
reason, that is a harness bug, not a result.

**Validation status:** tested

## 2026-09-27 — Verify claims about defaults against the code that owns the default

**Signal / failure:** A review asserted that a theme omitting the `dark:` key "is treated as
light." The actual runtime rule in `src/theme-loader.js` is
`meta._dark = darkMatch ? … : true` — absent means **dark**.

**Mechanism:** Intuition about how a format "obviously" behaves, or a review's paraphrase,
replaces the value the running system actually uses. Following it would have inverted the
shared predicate.

**Scope:** Any default, fallback, or normalization applied when input is missing.

**Evidence:** `src/theme-loader.js:92`; confirmed programmatically that the derived predicate
and `parseOVT` agree, and that the result is dark.

**Recommended behavior:** Locate the code that owns the default and quote it. When a check
discovers "light" for a theme with no `dark:` key, suspect the check, not the format.

**Validation status:** tested

## 2026-09-27 — This repository's `/*` gitignore rule hides new top-level directories

**Signal / failure:** The Meristem initializer's own doctor check reported the privacy boundary
as `ok`, but `git check-ignore` showed all six canonical `.meristem/*.md` files ignored by
`.gitignore` line 1 (`/*`), with `git add .meristem` refusing to stage them.

**Mechanism:** The repo uses a whitelist shape — ignore everything at root, then negate the
directories that should be tracked. Any new top-level directory is invisible to git until
negated. Doctor verified that `.meristem/local/` was ignored and that canonical files were not
*ignored by the Meristem block*, which is true but not the same as being committable.

**Scope:** Adding any new top-level directory or root file to this repository.

**Evidence:** `git check-ignore -v` before and after adding `!.meristem/`; `git add -n
.meristem` staged all six files only afterwards.

**Recommended behavior:** When adding a top-level path here, add it to the `!` allowlist next to
`!docs/`, `!scripts/`, etc., and verify with `git check-ignore -v` — do not rely on a
tool-reported status to prove a file is committable.

**Validation status:** tested
