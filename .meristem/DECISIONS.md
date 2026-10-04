<!-- meristem-template:v1 -->
# Decisions

Record decisions only when the choice or its rationale is likely to matter later.

## 2026-09-27 — Preserve annotated palette comments verbatim; never regenerate them

**Decision:** `injectCommentBlock` (`scripts/theme-palette-comments.mjs`) keeps an existing
palette comment byte-for-byte when it carries a parenthesized annotation, discarding the freshly
generated comment for that theme. Only unannotated comments are replaced.

**Why:** Light themes are the only ones whose shipped tokens diverge from the upstream palette
they were derived from, because accessibility overrides are applied after distillation. The
annotated comment is the sole surviving record of the original source values. Regenerating it
silently destroys that history and makes a divergence like `Everforest-Light-Hard.ovt` shipping
`--warning: #896200` while documenting `#DFA000` indistinguishable from a bug.

**Alternatives considered:** (a) Regenerate the comment from current code — rejected, this is
the actual bug. (b) Drop the comments for light themes — rejected, destroys the record too.
(c) Preserve verbatim — chosen; a stale-but-honest record beats an accurate-but-fictional one.

**Constraints / consequences:** The preserved block is frozen. Its header embeds the theme name
and its payload embeds the `PALETTE_VARS` set, so both can drift from source. That drift is
accepted and is now pinned by contract rather than left to chance (see next entry).

**Evidence / references:** `f369c68`, `747813c`; 22 light themes carry the annotation, 0 dark
themes do. `Everforest-Light-Hard.ovt` is the concrete divergence case.

**Supersedes:** none

## 2026-09-27 — The preservation rule and the annotation contract stay two different rules

**Decision:** `SOURCE_VALUES_COMMENT_RE` (stripper, in `scripts/theme-palette-comments.mjs`)
matches *any* parenthesized annotation. The light-theme contract in
`test/theme-base-contract.test.js` accepts only an annotation containing the phrase
`source values`. The two are intentionally not unified.

**Why:** They answer different questions. Preservation is a safety rule, and its costs are
asymmetric: freezing something redundant costs a stale comment, while failing to freeze costs a
destroyed historical record — so it must be maximally permissive. The contract is an authoring
rule describing what a well-formed annotation says. Collapsing them forces a choice that makes
either preservation unsafe or the contract vacuous.

**Alternatives considered:** (a) Export the stripper regex and assert against it — proposed in
review, **rejected**: it reduces the contract to "contains parentheses" and re-opens the hole
that rejected `(souce values)` and `(todo: ask someone about this)`, both of which the
permissive stripper would otherwise freeze permanently. (b) Require one exact sentence in both —
rejected, that was the original brittleness. (c) Keep both rules, distinct — chosen.

**Constraints / consequences:** A hand-written annotation such as `(values frozen from
upstream)` is preserved by the stripper but fails the contract. That is the intended signal, not
a contradiction. The stripper carries a comment recording the asymmetry so it is not
"fixed" later.

**Evidence / references:** Verified by mutation — `(souce values)` and `(todo: …)` rejected;
`(source values; accessibility-adjusted below may differ)` accepted and preserved.

**Supersedes:** none

## 2026-09-27 — Light-theme tests derive "is light" from `parseOVT`, not from a regex

**Decision:** All three call sites that filter light themes use `isLightTheme()` from
`test/helpers/themes.mjs`, which delegates to `parseOVT(source).meta._dark === false`.

**Why:** The call sites had drifted to two opposite hand-written regexes (`dark: 'false'`
positively matched in one file, `dark: 'true'` negated in another). A theme omitting the `dark:`
key landed in one and not the other. Routing through the parser makes the tests agree with
runtime by construction instead of by two regexes staying in sync.

**Alternatives considered:** (a) Hoist a shared regex — rejected, it would still encode a second
definition of `dark` that could drift from the parser. (b) Delegate to `parseOVT` — chosen.

**Constraints / consequences:** Note the parser's rule, which a naive negated-`dark` regex gets
backwards: an **absent** `dark:` key means **dark** (`true`), not light.

**Evidence / references:** `src/theme-loader.js:92`; `9759123`. Confirmed that
`isLightTheme` and `parseOVT` agree on a theme with no `dark:` key.

**Supersedes:** none

## 2026-09-27 — `pnpm test` is pinned to `test/**/*.test.js`

**Decision:** The `test` script is `node --test "test/**/*.test.js"` rather than bare
`node --test`.

**Why:** `node --test`'s default glob collects every file under a `test/` directory. When
`test/helpers/themes.mjs` was added, the reporter printed `✔ test/helpers/themes.mjs` — a
module with zero assertions counted as a passing test, inflating the count and manufacturing
green. The `**/*.test.js` glob keeps nested discovery while excluding helpers.

**Alternatives considered:** (a) Move helpers outside `test/` — rejected, it would work against
the conventional location for clarity. (b) Pin the glob — chosen.

**Constraints / consequences:** A new test file must match `*.test.js` to run. Adding a helper
under `test/` is now safe.

**Evidence / references:** Count returned to 589/588/0 after the change; `9759123`.

**Supersedes:** the previous `"test": "node --test"`.

## 2026-09-27 — `themes/` is the source of truth and `public/themes/` is a generated mirror

**Decision:** Curated `.ovt` files live in `themes/`. `public/themes/` holds generated,
byte-identical copies produced by `pnpm sync:themes` and enforced by contract.

**Why:** The app serves `public/`; the theme corpus is the editable artifact. Making the mirror
generated rather than hand-maintained means the served copy can never silently diverge from the
curated source.

**Alternatives considered:** Editing files in `public/themes/` directly — rejected; the
byte-identity contract fails immediately.

**Constraints / consequences:** Any edit to a `themes/` file must be followed by
`pnpm sync:themes` or committed together with the mirrored change. `patterns/` still has an
unguarded duplicate mirror of this kind (see FEATURE_REQUESTS.md).

**Evidence / references:** `test/theme-base-contract.test.js` "source and public theme
distributions are byte-identical"; executed in `90bbbe4`.

**Supersedes:** the pre-reorg layout, where themes sat loose at the repository root.
