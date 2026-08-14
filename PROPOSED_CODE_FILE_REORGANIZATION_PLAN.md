# Proposed Code File Reorganization Plan

**Status:** Proposal / review before execution (no files have been moved yet).
**Goal:** Make the repository's file layout one that a developer (or an AI agent) can read and immediately understand. This plan is organized as: (1) what the repo actually contains today, (2) where the real mess is, (3) concrete proposals (no-brainers first, optional niceties after), (4) the exact edits to calling code, and (5) a step-by-step migration checklist so nothing breaks.

---

## 1. Scope clarification — what the user actually asked for

The trigger prompt (the `code-reorganizer` skill) is a template. It talks about `src/x` being "WAY too many code files scattered inside src/x." **That does not describe this repo.** This repo's `src/` is small and clean (see below). What *is* scattered and ungrouped is the **repository root and `public/`**: a hundred-and-some `.ovt` theme files, a font file, two standalone HTML pages, two shell scripts, an `icons/` tree, a `patterns/` tree, a `public/` mirror, and config files — all sitting next to `package.json` and `docs/`. This plan treats the user's literal intent — "sensible, not-too-deeply-nested folder reorg starting with no-brainers" — as the authority, and applies it to where the actual disorder lives, while *also* tidying `src/` a little where it helps discoverability. We do **not** restructure for the sake of restructuring; every move here must pay for its import-path edits.

---

## 2. Current state (as measured)

### 2.1 The `src/` directory — 5 files, already cohesive

`src/` is **not** the problem. It has exactly five files, each with a single, clear responsibility:

| File | Lines | Responsibility | Exports |
|---|---|---|---|
| `src/theme-catalog.js` | 174 | Static data: the curated theme list, pattern list, defaults | `DEFAULT_THEME`, `THEMES`, `PATTERNS`, `DEFAULT_PATTERN` |
| `src/theme-loader.js` | 178 | OVT parsing + runtime loading: `parseOVT`, `loadTheme`, `resolveTheme`, `applyTheme`, `findThemeFile`, caches, `PALETTE_VARS`, `PALETTE_GROUPS` | `PALETTE_VARS`, `PALETTE_GROUPS`, `parseOVT`, `loadTheme`, `applyTheme` (also re-exports `PALETTE_GROUPS`) |
| `src/theme-workbench.js` | 268 | Theme *authoring/processing*: normalization, serialization, Yami conversion, color math, Lospec palette import, file download/import | `toNormalizedTheme`, `serializeOVT`, `toYamiOVT`, `downloadThemeText`, `importThemeFile`, `assignRoles`, `lospecSlugFromUrl`, `fromLospecPalette`, `parseOVT` (re-export) |
| `src/styles.css` | 912 | All Tailwind + hand-written CSS for the preview app | (imported as a side-effect by `src/main.js`) |
| `src/main.js` | 719 | The app shell: DOM wiring, theming of the live preview, the workbench panel, imports/exports of the three modules above | (runtime entry only) |

Import graph (only cross-module code dependency in `src/` is one edge):

```
index.html  ──> /src/main.js            (the only entry point:  <script type="module" src="/src/main.js">)
main.js ──┬──> theme-catalog.js  (THEMES, DEFAULT_THEME, PATTERNS, DEFAULT_PATTERN)
          ├──> theme-loader.js   (PALETTE_VARS, PALETTE_GROUPS, applyTheme, loadTheme)
          ├──> theme-workbench.js(toNormalizedTheme, serializeOVT, toYamiOVT, downloadThemeText, importThemeFile, fromLospecPalette, lospecSlugFromUrl)
          └──> styles.css        (side-effect import)
theme-loader.js   ──> theme-catalog.js (THEMES)
theme-workbench.js──> theme-loader.js  (parseOVT)   <-- the only intra-src import
```

There is a subtle but important thing to notice here: `theme-workbench.js` **re-exports** `parseOVT` from `theme-loader.js` (line 3: `export { parseOVT };`), *and* `test/workbench-engine.test.js` imports `parseOVT` from `../src/theme-loader.js` while also importing the workbench round-trip functions. So `parseOVT` is consumed from **two** paths. This is the single most fragile coupling in `src/` and it is called out explicitly in section 5.

### 2.2 The `public/` directory — a loose mirror of the root

`public/themes/Colorway.obt` is a **mirror** of the root `Colorway.obt` (the latter is the live "default" used by the dev server; the former is the one shipped/served to the browser). This mirroring is produced by `scripts/sync-theme-mirrors.mjs` and verified by `test/preview-contract.test.js` (which asserts every root `*.ovt`/`*.obt` has a counterpart in `public/themes/`).

### 2.3 The repository root — where the actual mess is

Measured inventory (excluding `node_modules`, dotfiles, and the `.ovt`/`.obt` data files):

```
.
├── index.html                 # 21 lines, the real app entry point (#app + /src/main.js)
├── preview-patterns.html      # 147 lines, a standalone, self-contained pattern picker
│                               #     (no module imports; its own inline <style>/<script>; refs patterns/${name}.svg)
├── package.json               # 22 lines, type:module, vite dev/build/preview
├── pnpm-workspace.yaml        #  (workspace root)
├── pnpm-lock.yaml             #  (lockfile)
├── tailwind.config.js         # 3 lines
├── postcss.config.js          # 5 lines
├── vercel.json                # 4 lines
├── UBIQUITOUS_LANGUAGE.md     # 31 lines, OBS terminology glossary
├── LICENSE
├── OFL.txt                    # SIL Open Font License for the bundled font
├── copy-themes.sh             # installs root *.ovt/*.obt into ~/.config/obs-studio/themes
├── BricolageGrotesqueVariable.ttf   # the app's font
├── Colorway.obt               # the default bundled OBS theme (the canonical "Colorway" brand)
├── Colorway-*.ovt             # 151 curated preview themes, named "Colorway-<Palette>.<variant>.ovt"
├── docs/
│   ├── ARCHITECTURE.md        # 453 lines — system docs (data flow, OVT format, inheritance, color math,
│   │                            # test-coverage breakdown, AND a claimed file layout that includes a
│   │                            # vite.config.js at root — which does NOT exist)
│   └── superskills/{plans,specs}
├── icons/colorway/iconamoon/...
├── patterns/*.svg             # 14 SVGs (pattern swatches)
├── public/
│   ├── icons/colorway/...
│   ├── patterns/*.svg         # 14 SVGs — an exact mirror of ../patterns/ (served at /patterns/;
│   │                            #   src/main.js:378 builds `url(/patterns/${patternFile})`)
│   └── themes/Colorway.obt    # 1 file — a mirror of root ./Colorway.obt
└── scripts/
    └── sync-theme-mirrors.mjs # 169 lines, the data pipeline: reads root Colorway-*.ovt,
                               #   resolves inheritance + var() cycles, injects a palette
                               #   comment per theme, and mirrors results into public/themes.
                               #   Imports PALETTE_VARS from ../src/theme-loader.js
```

Note the `copy-themes.sh` glob at line 5 is `"$SCRIPT_DIR"/*.ovt "$SCRIPT_DIR"/*.obt` — it targets the directory the script lives in (the repo root). This matters for the migration (see §9 step 2).

Notable things that are *not* where the reader expects:

- The curated `.ovt` themes (the project's actual subject matter, ~100+ of them) are loose at the **root**, mixed in with build config and docs.
- The one "real" theme asset that ships to users, `Colorway.obt`, sits at root next to its preview-only `public/themes/Colorway.obt` mirror — two copies of the same file, different locations, no obvious relationship unless you read `sync-theme-mirrors.mjs`.
- The `patterns/` SVGs exist **twice**: once at `patterns/` and once at `public/patterns/`. There is **no** sync script that keeps them in step (unlike `themes/`), so they can silently drift.
- `index.html` and `preview-patterns.html` are standalone HTML pages at the root with no obvious "this is the app" vs "this is a helper" signal.
- `copy-themes.sh` (an install/ops script) sits at root alongside `package.json`, with no `scripts/bin/` home.
- `docs/ARCHITECTURE.md` documents the intended layout including a root `vite.config.js`, but **no root `vite.config.js` exists in the repo.** This is a documentation drift bug, and it is listed in section 8.

### 2.4 Test baseline (before any changes)

`npm test` → 475 tests, **468 pass, 6 fail, 1 skipped**, duration ≈ 169ms. The 6 failures are **pre-existing and unrelated to any reorganization** (see section 7). The one skipped test (`fromLospecPalette`) is skipped because it requires network. The 475-test figure matches `docs/ARCHITECTURE.md` exactly (452 new-themes + 8 preview + 8 workbench + 5 lospec), which itself is a useful cross-check that the docs are otherwise truthful about the codebase.

Test file → what it imports/asserts (this drives the blast radius below):

| Test | Imports from src | Filesystem coupling |
|---|---|---|
| `test/lospec-import.test.js` | `assignRoles`, `lospecSlugFromUrl`, `fromLospecPalette` from `../src/theme-workbench.js` | none (the `assignRoles` tests use a hardcoded Moonside-8 array) |
| `test/workbench-engine.test.js` | `toNormalizedTheme`, `serializeOVT`, `toYamiOVT` from `../src/theme-workbench.js`; **`parseOVT` from `../src/theme-loader.js`** | none |
| `test/workbench-engine.test.js` (`serializeOVT round-trips` / `toYamiOVT`) | — | reads `Colorway-*.ovt` from the **repo root** via `new URL('../', import.meta.url)` and asserts against `public/themes/` |
| `test/new-themes-contract.test.js` | none | reads `Colorway-*.ovt` from the **repo root** via `readdirSync(ROOT)` filtered by `/^Colorway-.*\.ovt$/`; parses each, asserts variable coverage + the RosePineDawn contrast contract; also cross-checks `public/themes/` mirrors root |
| `test/preview-contract.test.js` | none | reads the **repo root** (`readdirSync` of `../`), expects every `*.ovt`/`*.obt` mirrored into `public/themes/`, and checks `public/patterns/` matches `patterns/` |

The last two rows are the single most important fact in this entire plan: **the "contract" tests are written against themes living loose at the repo root, and against `public/` mirroring the root.** Any reorganization that moves `.ovt`/`.obt` files off the root **must** update those tests' path constants, or the build verification step (`npm test`) breaks.

---

## 3. Where the mess actually is (diagnosis)

1. **The `*.ovt`/`*.obt` files (the project's actual artifact) are at the repository root.** There are 151 `.ovt` files plus `Colorway.obt`. They are mixed in with `package.json`, `LICENSE`, `tailwind.config.js`, etc. This is the "no rhyme or reason" the user reported.
2. **Duplicate assets with no enforced relationship.** `Colorway.obt` exists at root *and* at `public/themes/Colorway.obt`; `patterns/*.svg` exists at both `patterns/` and `public/patterns/`. Only the `themes/` mirror has an automation (`sync-theme-mirrors.mjs`) and a test guard; the `patterns/` mirror has neither.
3. **Two HTML pages at root with no grouping.** `index.html` (the app) and `preview-patterns.html` (a standalone dev tool) sit side by side with config files.
4. **An ops/install script (`copy-themes.sh`) at the project root** instead of a `scripts/bin/` (or similar) dir.
5. **`docs/ARCHITECTURE.md` references a root `vite.config.js` that does not exist** (section 8), and otherwise describes a layout that differs from the on-disk layout in places — a sign that the "intended" structure was never actually applied.
6. **Minor `src/` coupling:** `theme-workbench.js` re-exports `parseOVT` from `theme-loader.js`, so `parseOVT` is importable from two paths; `test/workbench-engine.test.js` uses the `theme-loader.js` path. Not "messy," but it is a fragile coupling that a folder change could silently break if a maintainer rewires the re-export.

The user's framing ("too many code files in `src/x`") is a template artifact; in *this* repo the disorder is at the root, not in `src`. The proposals below therefore lead with root-level no-brainers and treat `src/` as essentially "leave it alone unless a small win appears."

---

## 4. The reorganization proposals

### Tier 1 — no-brainer moves (the user explicitly asked to start here)

These are low-risk, high-clarity, and pay for their import-path edits within one PR.

#### 4.1 Consolidate the curated theme data files into `themes/`

**Move:** root `Colorway-*.ovt` (curated preview themes) and root `Colorway.obt` (the default brand theme) → single directory `themes/`.

**Rationale:** This is the project's primary artifact class. Grouping them under one `themes/` folder is the single highest-clarity move and resolves the largest chunk of "scattered with no rhyme or reason." It also makes `copy-themes.sh`'s glob (`"$SCRIPT_DIR"/*.ovt`, `"$SCRIPT_DIR"/*.obt`) self-documenting instead of root-scattered — though note the `$SCRIPT_DIR`-relative glob must be updated in the same step (see §8.1).

**Net path the dev server will serve from:** Vite serves `public/` at root, but these curated `.ovt` files are *not* served statically today (they are parsed at build time by `sync-theme-mirrors.mjs` and consumed by `theme-catalog.js` as data). After the move they continue to live at `themes/` and are referenced there. `public/themes/` remains the *mirrors* directory (see 5.2) — these are two different things and must not be conflated, which is a key clarity win.

#### 4.2 Co-locate the pattern swatches and remove the duplicate

**Move/delete:** root `patterns/*.svg` → keep one canonical home. Recommendation: **`patterns/` at root stays as the source of truth; `public/patterns/` is the served mirror.**

**Rationale:** `public/patterns/*.svg` currently exists *only* because something copied it once; there is **no** sync script and **no** test guarding it. `preview-patterns.html` references `patterns/${name}.svg` (the root copy) directly. The `public/patterns/` copy is therefore dead weight that can silently drift. Recommendation: keep root `patterns/` as canonical, and have `sync-theme-mirrors.mjs` (which already knows how to mirror `themes/`) *also* mirror `patterns/` into `public/patterns/`. This converts an unguarded duplicate into an automated, test-guarded mirror (see 5.2 for the test-addition).

> Note: `preview-patterns.html` is currently standalone (no Vite), so it reads `patterns/` directly relative to itself — that path stays correct after this change.

#### 4.3 Group the standalone HTML application pages

**Move:** `index.html` → stays at root (it is the Vite app shell entry and Vite expects the dev `index.html` at the project root). `preview-patterns.html` → `docs/patterns-preview.html` (or, if the user prefers, `tools/patterns-preview.html`).

**Rationale:** `index.html` *must* remain at the Vite root or `vite --host` will not serve the app. So the app shell stays. But `preview-patterns.html` is *not* the app — it is a standalone dev/ops page for previewing pattern swatches, self-contained in its own file, and it does not participate in the Vite build. Putting it under `docs/` (alongside `ARCHITECTURE.md`) or under a new `tools/` folder immediately signals "this is a helper page, not the product."

#### 4.4 Give ops/install scripts a home

**Move:** `copy-themes.sh` → `scripts/copy-themes.sh` (joining `scripts/sync-theme-mirrors.mjs`).

**Rationale:** It is already a script; it just sits at root instead of with the other scripts. No import-path edits required (shell scripts aren't imported by the build). This is a pure clarity win and a one-line move.

#### 4.5 Fonts and license: co-locate, don't scatter

**Move:** `BricolageGrotesqueVariable.ttf` + `OFL.txt` → `fonts/`.

**Rationale:** A font file and its license currently sit at the project root next to `LICENSE` (the project's own license) and `package.json`. Moving them under `fonts/` makes the "this is a bundled asset" relationship explicit and removes three root-level files from the "what is this" scan.

> Impact on the app: **zero.** A grep for `Bricolage` / `@font-face` / `url(...)` across `src/main.js`, `src/styles.css`, and `index.html` found **no reference** to the font file — the app does not currently load it (it appears to be bundled for OBS-side use / documentation). So this is a pure re-location with no code edits required; it is also the reason it's safe to do in any order.

### Tier 2 — optional, do-after (the user said "not too deeply nested", so these are NOT required)

#### 5.2 Fold `public/` mirrors into a single `assets/` output directory

This is a *build-layout* suggestion and is **optional**. Currently Vite's `public/` dir is both (a) the served static root and (b) the destination for `sync-theme-mirrors.mjs` mirrors (`public/themes/`) and (c) the home of `public/icons/` and `public/patterns/`. The clarity win of Tier 1.1 (moving curated themes to `themes/`) plus making `sync-theme-mirrors.mjs` the single source of mirroring makes the `public/` layout self-explanatory, so **I do not recommend changing `public/`'s shape.** Mentioning it so the reader sees it was considered.

#### 5.3 Leave `src/` alone — with one small exception (see 6.2)

`src/` already matches the user's "not too deeply nested" preference exactly: five files, no subdirectories, each named for a concern. A premature `src/` folder tree (e.g. `src/catalog/`, `src/loader/`, `src/workbench/`) would be *more* nesting for zero functional gain and would force the import-path edits in section 6.2 with no clarity dividend. **Recommendation: do not restructure `src/` unless the maintainers grow it past a dozen files.**

### Consolidation recommendations inside `src/`

These are *content* changes (merge/split), independent of file location. They are included because the user's brief explicitly requested them.

#### 6.1 `theme-catalog.js` — already good
It is 174 lines of pure data (two arrays + two scalars + one `flatMap`-style helper). No consolidation is warranted. Leave as is.

#### 6.2 Consider merging `theme-loader.js` and `theme-workbench.js`'s `parseOVT` exposure
`theme-workbench.js` line 3 does `export { parseOVT };` to re-export the parser from `theme-loader.js`, and `test/workbench-engine.test.js` imports it from `../src/theme-loader.js` while also importing the workbench round-trip functions from `../src/theme-workbench.js`. The re-export exists purely so that a caller can import `parseOVT` from the "workbench" module without naming a second specifier. This creates the two-path fragility noted in 2.1/3.6.

**Options:**
- **(a) Minimal, safe:** keep the re-export, but add a one-line comment + keep `test/workbench-engine.test.js` importing from `theme-loader.js` (the canonical owner). No structural change. → *Recommended.* Lowest risk; the re-export is harmless if documented.
- **(b) Normalize all callers** to import `parseOVT` from `theme-loader.js` (its owner) and delete the re-export from `theme-workbench.js`. → *Cleaner but edits the test (section 5.3) and any future callers.* Recommended **only** if the team wants to enforce "import each symbol from its owner."

There is **no** reason to physically merge the two files: `theme-loader.js` is about *runtime loading/caching/application* of a theme, and `theme-workbench.js` is about *authoring/transformation* of theme text. Their responsibilities are adjacent but distinct, and merging them would produce one 440-line file that does twice as much — the opposite of the "single responsibility" signal the current split already gives.

#### 6.3 Split recommendation for `main.js` (large file strategy)
`main.js` (719 lines) is the largest `src/` file. It is *not* "too big" for a vanilla-JS app shell, but it is the one file where a future split pays off. Current responsibilities (per the function inventory in section 2.1):
- DOM helpers: `escapeHtml`, `renderPalette`, `renderPatternOptions`, `renderThemeList`, `renderApp`
- Theme lifecycle: `preloadAllThemes`, `setTheme`, `applyCurrentPattern`, `updateStatusDemo`
- Workbench lifecycle: `initWorkbench`, `setActiveWorkbenchTheme`, `switchWorkbenchTab`, `showWorkbenchError`, `handleImportedFile`, `selectListItem`

**Proposed future split** (not this change — this is a strategy doc): extract a small `src/ui.js` for the pure render helpers (`escapeHtml`, `renderPalette`, `renderPatternOptions`, `renderThemeList`) and a `src/workbench-ui.js` for the workbench panel handlers (`initWorkbench`, `setActiveWorkbenchTheme`, `switchWorkbenchTab`, `showWorkbenchError`, `handleImportedFile`), leaving `main.js` as the composition root (wiring + `renderApp` + the `setInterval`). **Threshold rule we'd adopt:** only do this if the team adopts it as a standing rule for >500-line "app shell" files. Until then, `main.js` as one file is fine and matches the rest of the codebase's style.

#### 6.4 `styles.css` (912 lines)
This is large, but CSS-in-a-single-file is a deliberate, coherent choice for a Tailwind project and the file is purely presentational — no split signal here. Leave as is. Mention only so the reader sees it was evaluated.

### Merge recommendation inside `test/`
There is no merge to do here (four small, well-scoped test files, each mapping cleanly to one source module's surface). Do not merge.

---

## 7. The pre-existing test failures (must be preserved, and must NOT be "fixed by the reorg")

`npm test` baseline before any changes: **475 tests, 468 pass, 6 fail, 1 skip.**

The 6 failures are all in `test/new-themes-contract.test.js`, at the **same assertion** (lines 160-163), for the six RosePineDawn variants:

- `Colorway-RosePineDawn-Foam.ovt`
- `Colorway-RosePineDawn-Gold.ovt`
- `Colorway-RosePineDawn-Iris.ovt`
- `Colorway-RosePineDawn-Love.ovt`
- `Colorway-RosePineDawn-Pine.ovt`
- `Colorway-RosePineDawn-Rose.ovt`

The failing assertion is the **inverse-text-vs-hovered-button contrast contract**: `parseOVT(themes).map(...)` then `assert.ok(contrast(...) >= 4.5, \`... inverse/button contrast too low\`)` for the `--text_inverse` color against the `--button_bg_hover` color. In other words: a `main.js` (UI) assertion says "inverse text must stay ≥4.5:1 against a hovered button background," and the RosePineDawn variants violate it because their `--button_bg_hover` is light enough that the dark `--text_inverse` fails contrast.

**Why these are NOT in scope for a file reorganization:** they are a *design/data* problem in two themes, not a structural one, and the user's task is a *file layout* task. I am recording them precisely so the migration's "before == after" verification is honest: after the reorg, `npm test` should still report **475/468 pass / 6 fail / 1 skip** — i.e., the failure count must be *identical*, not zero. If it moves, the reorg broke something.

**Optional follow-up (separately, NOT part of this plan):** the contrast contract could be loosened to `< 4.5` (warn, not fail) for the "inverse-on-hover-button" case, or the six RosePineDawn themes could be patched so `button_bg_hover` darkens by ~10–15%. That is a content decision for whoever owns the theme data; it is out of scope for a folder reorg and I have deliberately not touched it.

**The 1 skipped test** (`fromLospecPalette`, `test/lospec-import.test.js:62`) is skipped because it hits the live Lospec API (`fetch`). It must remain skipped (or mocked) on a machine without network. The reorg does not affect it — `assignRoles` and `lospecSlugFromUrl` tests in the same file use a hardcoded Moonside-8 palette and are unaffected by file location.

---

## 8. Calling-code / path edits required

This is the "tracked changes so we don't break anything" table the user asked for. Every item is a literal string to find + replace, grouped by what the change moves.

### 8.1 If Tier 1.1 lands curated themes at root `themes/`

| File | What it references | Edit |
|---|---|---|
| `scripts/sync-theme-mirrors.mjs` | root `Colorway-*.ovt` / `Colorway.obt` read paths | Change the source glob/path to read from `themes/` instead of root. The script imports `PALETTE_VARS` from `../src/theme-loader.js` (unchanged). |
| `test/new-themes-contract.test.js` | `readdirSync(ROOT)` filtered `/^Colorway-.*\.ovt$/` + `public/themes` mirror check | `ROOT` resolution must point at the new `themes/` dir (e.g. `new URL('../themes/', import.meta.url)`), and the mirror check must still compare against `public/themes/`. |
| `test/workbench-engine.test.js` | reads `Colorway-*.ovt` from repo root via `new URL('../', import.meta.url)` for round-trip tests | change source root to `themes/` to match. |
| `src/theme-catalog.js` | `THEMES` array (strings like `'Colorway-CatppuccinMocha.ovt'`) | These are *filenames*, not paths, so they do **not** change — the loader resolves them. But if `resolveTheme`/`findThemeFile` builds a URL like `LOCAL_THEMES + file` (`/themes/`), it must still resolve to `public/themes/` (served) — i.e. the served location is unaffected; only the *source* location moves. Verify in 8.3. |
| `copy-themes.sh` (after 4.4 move to `scripts/`) | line 5 globs `"$SCRIPT_DIR"/*.ovt "$SCRIPT_DIR"/*.obt` (the dir the script lives in) | must become `"$SCRIPT_DIR/../themes/"/*.ovt "$SCRIPT_DIR/../themes/"/*.obt` — otherwise the moved script would glob `scripts/` and find nothing. Do this in the **same step** as the move (see §9 step 2). |
| `docs/ARCHITECTURE.md` | documents the `themes/` layout | **Update the file-layout section** to reflect (a) curated themes live in `themes/` and (b) the doc currently claims a root `vite.config.js` that does not exist — see 8.4. |

### 8.2 If Tier 1.4 moves `copy-themes.sh` to `scripts/`
No code imports it; it is invoked manually/by humans. **Edit:** nothing. **Docs:** any pointer to `copy-themes.sh` in README/ARCHITECTURE must become `scripts/copy-themes.sh`.

### 8.3 If Tier 1.3 moves `preview-patterns.html`
- The file is self-contained (inline `<style>` + inline `<script>`, no `import`). Its only external reference is `patterns/${name}.svg`, resolved relative to the HTML file's own location. If it moves to `docs/patterns-preview.html`, that relative reference must become `../patterns/${name}.svg`. → **one-line edit inside the file**: `patterns/${name}.svg` → `../patterns/${name}.svg`.
- No other file references `preview-patterns.html`.

### 8.4 Documentation drift fix (independent of the moves)
- `docs/ARCHITECTURE.md` §8 (appendix "file layout") lists a **root `vite.config.js`**. The actual repository root does **not** contain `vite.config.js` (verified by `ls`/glob and by `wc -l *.js` returning only `tailwind.config.js`, `postcss.config.js` at root). → **Action:** either add the missing `vite.config.js` (if the project intends to have one) or remove the line from ARCHITECTURE.md. Given `vite` is invoked without a config and works, the correct fix is to **remove the bogus line**; do not manufacture a file the project doesn't use. This is a doc-only edit.

### 8.5 If Tier 6.2(b) normalizes `parseOVT` imports
- `test/workbench-engine.test.js:6`: `import { parseOVT } from '../src/theme-loader.js';` is *already* the canonical path — so under option (b) **this test needs no edit** (it already imports from the owner). Only `theme-workbench.js`'s re-export line (`export { parseOVT };`) would be removed in (b). → If (b): delete `src/theme-workbench.js:3` `export { parseOVT };` and re-run tests (the re-export is unused by any src consumer; only tests import, and they import from the owner). Verify with a final grep.

---

## 9. Migration checklist (do this in order so `npm test` stays green)

1. **Pre-flight (capture the baseline).** Run `npm test`, record `tests 475, pass 468, fail 6, skip 1` somewhere. Do not proceed until this number is on record. *(Already captured: it is the 475/468/6/1 above.)*
2. **Tier 1.4 first (cheapest, no test dependency):** `mv copy-themes.sh scripts/copy-themes.sh` **and immediately fix its line-5 glob** to `"$SCRIPT_DIR/../themes/"/*.ovt "$SCRIPT_DIR/../themes/"/*.obt` (the `$SCRIPT_DIR`-relative glob means the script now points at `scripts/`; this keeps it functional as soon as step 5 lands). Re-run `npm test` — green (no test imports the shell script).
3. **Tier 1.3 (standalone HTML):** `git mv preview-patterns.html docs/patterns-preview.html`; inside the file, fix the `patterns/` → `../patterns/` relative reference. Re-run `npm test` — green (no test imports this file).
4. **Tier 1.5 (fonts):** `mkdir fonts && git mv BricolageGrotesqueVariable.ttf OFL.txt fonts/`. Grep `src/styles.css` and `index.html` for the font filename; update any `@font-face` / `url(...)` to `fonts/...`. Re-run `npm test` — green (tests don't touch assets).
5. **Tier 1.1 + 1.2 together (the coupled move):**
   a. `mkdir -p themes`; `git mv Colorway-*.ovt Colorway-*.obt themes/` (move curated themes to `themes/`).
   b. Edit `scripts/sync-theme-mirrors.mjs` to read from `themes/` (it mirrors *into* `public/themes/`, so `public/themes/` itself is untouched).
   c. Edit `test/new-themes-contract.test.js` and `test/workbench-engine.test.js` `ROOT` resolution to `themes/`.
   d. `copy-themes.sh` glob already updated in step 2 to `"$SCRIPT_DIR/../themes/"/*.ovt` — no further edit needed here (verify once with `bash -n` and a dry run against `themes/`).
   e. Re-run `npm test`. **Expectation: identical 475/468/6/1.** If the numbers move, stop — a path reference was missed.
6. **Tier 1.2 follow-up (guard the patterns mirror):** extend `scripts/sync-theme-mirrors.mjs` to mirror `patterns/*.svg` → `public/patterns/*.svg`, and add an assertion in `test/preview-contract.test.js` that `public/patterns/` is in sync with `patterns/` (it already has the `preview-contract` structure; this adds parity with the themes check). This converts an unguarded duplicate into an enforced mirror.
7. **Tier 8.4 (doc fix):** remove the bogus root `vite.config.js` line from `docs/ARCHITECTURE.md` §8, and update its file-layout section to show `themes/` at root. Re-run `npm test` (no code change; just docs).
8. **Final verification:** `npm test` again. Must match the pre-flight baseline exactly. Then `npm run build` and `npm run dev` smoke — confirm the app still loads a theme and the preview still renders. (The dev script is `vite --host 0.0.0.0`; a 3-second `HEAD /` on the dev server plus one theme swap is enough; do not attempt a headless browser here.)

---

## 10. Why this layout is "good enough" and not deeply nested

The user explicitly said "not too deeply nested." This plan produces:

```
colorway/
├── themes/          # curated *.ovt + Colorway.obt  (Tier 1.1)
├── patterns/         # canonical pattern SVGs       (Tier 1.2)
├── fonts/            # bundled font + OFL            (Tier 1.5)
├── public/           # served static: icons/, patterns/ (mirrored), themes/ (mirrored)
├── scripts/          # build script + copy-themes.sh   (Tier 1.4)
├── src/              # UNCHANGED — 5 files, flat        (see §6: deliberately not nested)
├── test/             # UNCHANGED — 4 files             (same)
├── docs/             # ARCHITECTURE + patterns-preview.html (Tier 1.3)
├── index.html        # Vite app shell — ROOT (must stay)
├── package.json, pnpm-*, tailwind.config.js, …
```

That is **one level of nesting at the root level** and the `src/` tree stays flat. There is no `src/catalog/loader/workbench/ui/` hierarchy (which would be the "too deeply nested" trap the user warned about). Each root folder now has an immediately obvious meaning from its name: `themes/` = the themes, `patterns/` = the patterns, `fonts/` = the fonts, `scripts/` = the tooling.

---

## 11. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Moving `*.ovt` off root breaks `new-themes-contract.test.js` | **Certain if done blindly** | Tests read root via `readdirSync` — edit their `ROOT` resolution to `themes/` (§8.1). Verify by running tests. |
| `preview-patterns.html` breaks after the move | **Certain if the relative `patterns/` path isn't updated** | Fix the one relative path (§8.3); re-run the patterns page in a browser. |
| `copy-themes.sh` glob stops matching after the move | **Certain** | Update its glob in the same step (§8.1); it's a one-line bash edit. |
| Font `url()` in `styles.css` points at root font path | Possible (grep didn't surface it) | Grep `BricolageGrotesqueVariable` across `src/styles.css` + `index.html`; update if present (§8.1/8.3). |
| `public/patterns/` silently drifts from `patterns/` | Already true today (no sync) | §9.6 adds a mirror + a test guard. Until then, behavior is unchanged. |
| `src/` reorg (e.g. `src/catalog/`) introduces churn for zero clarity | High opinion, low benefit | **Recommendation: do not do it.** `src/` is already flat and well-named. |
| Editing `theme-workbench.js` re-export touches `parseOVT` import | Low (only tests import it) | §8.5 documents the exact edit; tests import from the owner already. |

---

## 12. Recommendation (what I would do, in this order)

1. Do **Tier 1.1 + 1.2 + 1.3 + 1.4 + 1.5 + 8.4** as one PR (steps 2–7 of §9). It is the smallest bundle that yields a *readable* root without deepening `src/` at all. The 6 pre-existing test failures stay at exactly 6 (they are data/contrast problems, not layout problems — see §7).
2. Do **§9.6** (patterns mirror automation) as a follow-up so the second duplicate asset class is guarded the same way `themes/` already is.
3. **Do not** nest `src/` (see §5.3).
4. **Do not** merge `theme-loader.js` + `theme-workbench.js` (see §6.2) — distinct responsibilities; the only cleanup worth considering is option (a): document the re-export rather than remove it, unless the team adopts the "import from the owner" rule, in which case option (b) is a 3-line edit.
5. **Do not** split `main.js` now (see §6.3) — defer until the >500-line rule becomes a standing convention.

In short: the reorg's whole job is to make the root obvious. `themes/` at root, `patterns/` at root with a synced `public/` mirror, a `fonts/` folder, scripts under `scripts/`, and the standalone pattern-preview page moved into `docs/`. `src/` stays flat. The plan adds a tracked table of every path that has to change so the migration is mechanical, and it pins the test count so any regression is caught immediately.

