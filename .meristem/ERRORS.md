<!-- meristem-template:v1 -->
# Errors

Preserve costly, recurring, or non-obvious failures that future agents could plausibly repeat.

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
