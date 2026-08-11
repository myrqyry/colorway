import './obs-preview-refine.css';
import { THEMES, PATTERNS, DEFAULT_PATTERN } from './theme-catalog.js';

function activeThemeFile() {
  return document.querySelector('.theme-row.active')?.dataset.file || null;
}

function activeThemeName() {
  return document.querySelector('#active-theme-name')?.textContent?.trim() || 'Current Colorway variant';
}

function selectTheme(file) {
  if (!file || file === '__current__') return;
  const row = Array.from(document.querySelectorAll('.theme-row'))
    .find((item) => item.dataset.file === file);
  row?.click();
}

function applyPattern(file) {
  const sourceSelect = document.querySelector('#pattern-select');
  if (sourceSelect) {
    sourceSelect.value = file;
    sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const url = file ? `url("/patterns/${encodeURIComponent(file)}")` : 'none';
  document.documentElement.style.setProperty('--pattern_eyes', url);
}

function hasFullThemeList(select) {
  if (select.options.length < THEMES.length) return false;
  return THEMES.every((theme) => Array.from(select.options).some((option) => option.value === theme.file));
}

function populateStyleSelect(root) {
  const select = root.querySelector('[data-style-select]');
  if (!select || select.dataset.colorwayPopulating === 'true') return;

  if (!hasFullThemeList(select)) {
    select.dataset.colorwayPopulating = 'true';
    select.replaceChildren(...THEMES.map((theme) => new Option(theme.name, theme.file)));
    delete select.dataset.colorwayPopulating;
  }

  if (select.dataset.colorwayWired !== 'true') {
    select.dataset.colorwayWired = 'true';
    select.setAttribute('aria-label', 'Colorway style');
    select.addEventListener('change', () => selectTheme(select.value));
  }

  const current = activeThemeFile();
  if (current && Array.from(select.options).some((option) => option.value === current)) {
    select.value = current;
  }
}

function populatePatternSelect(root) {
  const appearance = root.querySelector('.obs-sim-appearance-card');
  if (!appearance || appearance.querySelector('[data-obs-pattern-select]')) return;

  const row = document.createElement('div');
  row.className = 'obs-sim-pattern-row';
  row.innerHTML = `
    <label for="obs-pattern-select">Pattern</label>
    <select id="obs-pattern-select" class="obs-sim-select" data-obs-pattern-select aria-label="Colorway pattern"></select>
  `;

  const styleRow = root.querySelector('[data-style-select]')?.closest('.obs-sim-settings-row');
  if (styleRow) styleRow.insertAdjacentElement('afterend', row);
  else appearance.append(row);

  const select = row.querySelector('[data-obs-pattern-select]');
  select.replaceChildren(...PATTERNS.map((pattern) => new Option(pattern.name, pattern.file)));
  select.value = document.querySelector('#pattern-select')?.value || DEFAULT_PATTERN;
  select.addEventListener('change', () => applyPattern(select.value));
}

function syncVisibleControls(root) {
  populateStyleSelect(root);

  const styleSelect = root.querySelector('[data-style-select]');
  const file = activeThemeFile();
  const name = activeThemeName();

  if (styleSelect) {
    if (file && Array.from(styleSelect.options).some((option) => option.value === file)) {
      styleSelect.value = file;
    } else {
      let current = Array.from(styleSelect.options).find((option) => option.value === '__current__');
      if (!current) {
        current = new Option(name, '__current__');
        styleSelect.add(current, 0);
      }
      current.textContent = name;
      styleSelect.value = '__current__';
    }
  }

  const patternSelect = root.querySelector('[data-obs-pattern-select]');
  const pattern = document.querySelector('#pattern-select')?.value;
  if (patternSelect && pattern) patternSelect.value = pattern;
}

function ensureAppearanceControls(root) {
  populateStyleSelect(root);
  populatePatternSelect(root);
  syncVisibleControls(root);
}

function placeDialogOverPreview(root) {
  const dialog = root.querySelector('[data-settings-dialog]');
  const preview = root.querySelector('.obs-sim-preview-area');
  if (!dialog || !preview) return;

  if (dialog.parentElement !== preview) preview.append(dialog);
  dialog.hidden = false;
}

function wireRoot(root) {
  if (root.dataset.colorwayRefined === 'true') return;
  root.dataset.colorwayRefined = 'true';

  placeDialogOverPreview(root);
  ensureAppearanceControls(root);
  applyPattern(document.querySelector('#pattern-select')?.value || DEFAULT_PATTERN);

  const panel = root.querySelector('[data-settings-panel]');
  if (panel) {
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        ensureAppearanceControls(root);
      });
    }).observe(panel, { childList: true, subtree: true });
  }

  const themeName = document.querySelector('#active-theme-name');
  if (themeName) {
    new MutationObserver(() => syncVisibleControls(root))
      .observe(themeName, { childList: true, subtree: true, characterData: true });
  }

  const sourcePatternSelect = document.querySelector('#pattern-select');
  sourcePatternSelect?.addEventListener('change', () => syncVisibleControls(root));

  root.querySelectorAll('[data-open-settings]').forEach((button) => {
    button.addEventListener('click', () => {
      placeDialogOverPreview(root);
      ensureAppearanceControls(root);
    });
  });
}

function boot() {
  const root = document.querySelector('.obs-real-preview');
  if (!root) return false;

  wireRoot(root);

  if (document.querySelectorAll('.theme-row').length === 0) {
    const app = document.querySelector('#app') || document.body;
    const observer = new MutationObserver(() => {
      if (document.querySelectorAll('.theme-row').length > 0) {
        ensureAppearanceControls(root);
        syncVisibleControls(root);
        observer.disconnect();
      }
    });
    observer.observe(app, { childList: true, subtree: true });
  }

  return true;
}

if (!boot()) {
  const observer = new MutationObserver(() => {
    if (boot()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
