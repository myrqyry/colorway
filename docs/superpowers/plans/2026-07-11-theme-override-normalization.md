# Theme Override Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize every `Colorway-*.ovt` file so each one declares the same
explicit set of color variables, in the same order, with no non-color overrides.

**Architecture:** Keep shared styling in `Colorway.obt` and make each `.ovt`
file a pure color override layer. Add a repo-local normalization script that
rewrites the full theme corpus from the resolved palette data, then harden the
contract test so it rejects missing keys and non-color drift.

**Tech Stack:** Node.js, native `node:test`, plain JavaScript, existing Vite
project files.

## Global Constraints

- Every `Colorway-*.ovt` file must declare the same 40 color variables.
- `.ovt` files must contain only color tokens.
- `Colorway.obt` must remain the shared styling base.
- `node --test test/new-themes-contract.test.js` must pass.
- `node --test` must pass.

---

### Task 1: Lock the canonical color contract in the test suite

**Files:**
- Modify: `test/new-themes-contract.test.js`

**Interfaces:**
- Consumes: raw `.ovt` file text, resolved theme variable maps.
- Produces: a single canonical color-token set and assertions that every theme
  file declares only that set.

- [ ] **Step 1: Add the canonical color-variable list.**

  ```js
  const CANONICAL_COLOR_VARS = [
    '--bg_window',
    '--bg_base',
    '--bg_preview',
    '--bg_dock',
    '--bg_hover',
    '--text',
    '--text_light',
    '--text_muted',
    '--text_disabled',
    '--text_inactive',
    '--text_inverse',
    '--primary',
    '--primary_light',
    '--primary_lighter',
    '--primary_dark',
    '--primary_darker',
    '--input_bg',
    '--input_bg_hover',
    '--input_bg_focus',
    '--input_border',
    '--input_border_hover',
    '--button_bg',
    '--button_bg_hover',
    '--button_bg_disabled',
    '--list_item_bg_hover',
    '--list_item_bg_selected',
    '--border_color',
    '--accent_bg_start',
    '--accent_bg_end',
    '--warning',
    '--danger',
    '--success',
    '--meter_bg_nom',
    '--meter_bg_war',
    '--meter_bg_err',
    '--meter_fg_nom',
    '--meter_fg_war',
    '--meter_fg_err',
    '--ico',
    '--ico_selected',
  ];
  ```

- [ ] **Step 2: Add a shape assertion for raw declarations.**

  ```js
  function assertCanonicalThemeShape(file, vars) {
    for (const key of CANONICAL_COLOR_VARS) {
      assert.ok(vars.has(key), `${file} missing ${key}`);
    }

    for (const key of vars.keys()) {
      assert.ok(
        CANONICAL_COLOR_VARS.includes(key),
        `${file} has non-color override ${key}`,
      );
    }
  }
  ```

- [ ] **Step 3: Keep the readability checks.**

  ```js
  test(`${file} keeps text readable on the base surface`, () => {
    assert.ok(
      contrastRatio(vars.get('--text'), vars.get('--bg_base')) >= 4.5,
      `${file} text/base contrast too low`,
    );
  });

  test(`${file} keeps inverse text readable on hover buttons`, () => {
    assert.ok(
      contrastRatio(vars.get('--text_inverse'), vars.get('--button_bg_hover')) >= 4.5,
      `${file} inverse/button contrast too low`,
    );
  });
  ```

- [ ] **Step 4: Run the focused test.**

  Run: `node --test test/new-themes-contract.test.js`

  Expected: fail until the corpus is normalized, then pass.

**Files for review:**
- `test/new-themes-contract.test.js`

---

### Task 2: Add a normalization script for the full theme corpus

**Files:**
- Create: `scripts/normalize-theme-overrides.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: all `Colorway-*.ovt` files and `Colorway.obt`.
- Produces: rewritten `.ovt` files with the same canonical key order and only
  the 40 color variables.

- [ ] **Step 1: Create the script with parse, resolve, and rewrite helpers.**

  ```js
  import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
  import { fileURLToPath } from 'node:url';
  import path from 'node:path';

  const CANONICAL_COLOR_VARS = [/* same list as Task 1 */];

  function parseTheme(text) { /* parse @OBSThemeMeta and @OBSThemeVars */ }
  function resolveTheme(file, graph, seen = new Set()) { /* inheritance */ }
  function renderTheme(meta, vars) { /* emit canonical @OBSThemeVars block */ }

  const checkOnly = process.argv.includes('--check');
  const root = path.dirname(fileURLToPath(import.meta.url));
  const themeFiles = readdirSync(root).filter((name) => /^Colorway-.*\.ovt$/.test(name));

  for (const file of themeFiles) {
    const next = renderTheme(meta, resolvedVars);
    if (checkOnly && next !== originalText) {
      process.exitCode = 1;
      console.error(`out of date: ${file}`);
    }
    if (!checkOnly && next !== originalText) {
      writeFileSync(path.join(root, '..', file), next);
    }
  }
  ```

- [ ] **Step 2: Expose the script through `package.json`.**

  ```json
  {
    "scripts": {
      "normalize:themes": "node scripts/normalize-theme-overrides.mjs",
      "normalize:themes:check": "node scripts/normalize-theme-overrides.mjs --check"
    }
  }
  ```

- [ ] **Step 3: Verify the check mode fails before rewriting.**

  Run: `node scripts/normalize-theme-overrides.mjs --check`

  Expected: non-zero exit until the files are rewritten.

**Files for review:**
- `scripts/normalize-theme-overrides.mjs`
- `package.json`

---

### Task 3: Rewrite every `.ovt` file to the canonical color-only shape

**Files:**
- Modify: `Colorway-*.ovt`

**Interfaces:**
- Consumes: the normalization script from Task 2 and the canonical color set
  from Task 1.
- Produces: every `.ovt` file with the same explicit 40-key color block.

- [ ] **Step 1: Run the normalizer across the full corpus.**

  Run: `node scripts/normalize-theme-overrides.mjs`

  Expected: all `Colorway-*.ovt` files rewrite in place, with identical key
  order and no non-color overrides.

- [ ] **Step 2: Spot-check representative themes.**

  Run: `wc -c Colorway-RosePine*.ovt Colorway-Solarized*.ovt Colorway-NOPAL12.ovt`

  Expected: file sizes still differ by palette content, but the declared key
  set is identical across all files.

- [ ] **Step 3: Confirm the diff is corpus-only.**

  Run: `git diff --stat`

  Expected: changes only in `Colorway-*.ovt`, `Colorway.obt`, and the contract
  test if it needs any final tightening.

**Files for review:**
- `Colorway-*.ovt`

---

### Task 4: Verify the normalized corpus and commit

**Files:**
- Modify: any files left from Tasks 1 to 3.

**Interfaces:**
- Consumes: the normalized theme corpus.
- Produces: a clean git commit with passing tests.

- [ ] **Step 1: Run the full test suite.**

  Run: `node --test`

  Expected: all tests pass.

- [ ] **Step 2: Verify the tree is clean apart from intended changes.**

  Run: `git status --short`

  Expected: only the intended theme and test changes are present.

- [ ] **Step 3: Commit the normalization work.**

  ```bash
  git add -A
  git commit -m "fix(themes): normalize color overrides across themes"
  ```

**Files for review:**
- All files changed in the normalization pass.
