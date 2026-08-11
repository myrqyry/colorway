import './obs-preview-refine.css';
import { THEMES, PATTERNS, DEFAULT_PATTERN } from './theme-catalog.js';

const PALETTE_PREVIEW_VARS = [
  '--bg_base',
  '--primary',
  '--warning',
  '--danger',
  '--text',
  '--border_color',
];

function activeThemeRow() {
  return document.querySelector('#theme-list .theme-row.active')
    || document.querySelector('.theme-row.active');
}

function activeThemeName() {
  return document.querySelector('#active-theme-name')?.textContent?.trim()
    || activeThemeRow()?.querySelector('.theme-name')?.textContent?.trim()
    || 'Current Colorway variant';
}

function isExternalThemeState() {
  const status = document.querySelector('#theme-status')?.textContent?.trim() || '';
  if (/^(Imported|Generated)\b/i.test(status)) return true;

  const row = activeThemeRow();
  const rowName = row?.querySelector('.theme-name')?.textContent?.trim();
  const displayedName = document.querySelector('#active-theme-name')?.textContent?.trim();
  return Boolean(row && rowName && displayedName && rowName !== displayedName);
}

function activeThemeFile() {
  if (isExternalThemeState()) return null;
  return activeThemeRow()?.dataset.file || null;
}

function sourceThemeRow(file) {
  if (!file) return null;
  return Array.from(document.querySelectorAll('#theme-list .theme-row'))
    .find((item) => item.dataset.file === file) || null;
}

function selectTheme(file) {
  if (!file || file === '__current__') return;
  sourceThemeRow(file)?.click();
}

function applyPattern(file) {
  const sourceSelect = document.querySelector('#pattern-select');
  if (sourceSelect) {
    const changed = sourceSelect.value !== file;
    sourceSelect.value = file;
    if (changed) sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Browser previews cannot resolve OBS's theme: URL scheme, so always restore
  // the equivalent public asset after a theme application changes root vars.
  const url = file ? `url("/patterns/${encodeURIComponent(file)}")` : 'none';
  document.documentElement.style.setProperty('--pattern_eyes', url);
}

function currentPattern() {
  return document.querySelector('#pattern-select')?.value || DEFAULT_PATTERN;
}

function paletteClone(row) {
  const palette = row?.querySelector('.theme-palette');
  if (!palette) return document.createElement('span');
  const clone = palette.cloneNode(true);
  clone.removeAttribute('id');
  return clone;
}

function appliedPaletteColors() {
  const styles = getComputedStyle(document.documentElement);
  return PALETTE_PREVIEW_VARS.map((name) => styles.getPropertyValue(name).trim() || 'transparent');
}

function rowPaletteColors(row) {
  if (!row) return appliedPaletteColors();
  const colors = Array.from(row.querySelectorAll('.palette-swatch'))
    .map((swatch) => swatch.style.background || swatch.style.backgroundColor)
    .filter(Boolean);
  return colors.length ? colors : appliedPaletteColors();
}

function paintPalette(container, colors) {
  if (!container) return;
  const signature = colors.join('|');
  if (container.dataset.paletteSignature === signature) return;

  container.dataset.paletteSignature = signature;
  const swatches = colors.map((color) => {
    const swatch = document.createElement('span');
    swatch.className = 'palette-swatch';
    swatch.style.background = color;
    return swatch;
  });
  container.replaceChildren(...swatches);
}

function makeThemeOption(sourceRow, root) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'colorway-theme-option';
  button.dataset.file = sourceRow.dataset.file;
  button.setAttribute('role', 'option');

  const name = document.createElement('span');
  name.className = 'colorway-theme-option-name';
  name.textContent = sourceRow.querySelector('.theme-name')?.textContent?.trim()
    || sourceRow.dataset.file;

  button.append(name, paletteClone(sourceRow));
  button.addEventListener('click', () => {
    selectTheme(button.dataset.file);
    const list = button.closest('[data-colorway-theme-options]');
    const trigger = root.querySelector('[data-colorway-theme-trigger]');
    if (list) list.hidden = true;
    trigger?.setAttribute('aria-expanded', 'false');
  });

  return button;
}

function refreshThemeOptions(root) {
  const picker = root.querySelector('[data-colorway-theme-picker]');
  const list = picker?.querySelector('[data-colorway-theme-options]');
  if (!picker || !list) return;

  const rows = Array.from(document.querySelectorAll('#theme-list .theme-row'));
  if (!rows.length) return;

  const signature = rows.map((row) => row.dataset.file).join('|');
  if (list.dataset.signature !== signature) {
    list.dataset.signature = signature;
    list.replaceChildren(...rows.map((row) => makeThemeOption(row, root)));
  }

  syncThemePicker(root);
}

function syncThemePicker(root) {
  const picker = root.querySelector('[data-colorway-theme-picker]');
  if (!picker) return;

  const file = activeThemeFile();
  const name = activeThemeName();
  const row = sourceThemeRow(file);
  const triggerName = picker.querySelector('[data-colorway-theme-name]');
  const triggerPalette = picker.querySelector('[data-colorway-theme-palette]');

  if (triggerName && triggerName.textContent !== name) triggerName.textContent = name;
  paintPalette(triggerPalette, rowPaletteColors(row));

  picker.querySelectorAll('.colorway-theme-option').forEach((option) => {
    const selected = Boolean(file) && option.dataset.file === file;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
}

function buildThemePicker(root) {
  const nativeSelect = root.querySelector('[data-style-select]');
  const row = nativeSelect?.closest('.obs-sim-settings-row');
  if (!nativeSelect || !row) return;

  row.classList.add('colorway-style-row');
  nativeSelect.classList.add('colorway-native-style-select');
  nativeSelect.setAttribute('aria-hidden', 'true');
  nativeSelect.tabIndex = -1;

  let picker = row.querySelector('[data-colorway-theme-picker]');
  if (!picker) {
    picker = document.createElement('div');
    picker.className = 'colorway-theme-picker';
    picker.dataset.colorwayThemePicker = 'true';
    picker.innerHTML = `
      <button type="button" class="colorway-theme-trigger" data-colorway-theme-trigger aria-haspopup="listbox" aria-expanded="false">
        <span class="colorway-theme-trigger-main">
          <span class="colorway-theme-trigger-name" data-colorway-theme-name>${activeThemeName()}</span>
          <span class="colorway-theme-trigger-palette" data-colorway-theme-palette></span>
        </span>
        <span class="colorway-theme-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="colorway-theme-options" data-colorway-theme-options role="listbox" aria-label="Colorway styles" hidden></div>
    `;
    row.append(picker);

    const trigger = picker.querySelector('[data-colorway-theme-trigger]');
    const list = picker.querySelector('[data-colorway-theme-options]');
    trigger?.addEventListener('click', (event) => {
      event.stopPropagation();
      const opening = list.hidden;
      list.hidden = !opening;
      trigger.setAttribute('aria-expanded', opening ? 'true' : 'false');
      if (opening) refreshThemeOptions(root);
    });

    root.addEventListener('click', (event) => {
      if (event.target.closest('[data-colorway-theme-picker]')) return;
      if (list && !list.hidden) list.hidden = true;
      trigger?.setAttribute('aria-expanded', 'false');
    });
  }

  refreshThemeOptions(root);
}

function hasFullThemeList(select) {
  if (select.options.length < THEMES.length) return false;
  return THEMES.every((theme) => Array.from(select.options).some((option) => option.value === theme.file));
}

function populateNativeStyleSelect(root) {
  const select = root.querySelector('[data-style-select]');
  if (!select || select.dataset.colorwayPopulating === 'true') return;

  // obs-preview.js keeps this select synced by replacing its options. Keep a
  // full hidden copy because the custom picker is the visible control now.
  if (!hasFullThemeList(select)) {
    select.dataset.colorwayPopulating = 'true';
    select.replaceChildren(...THEMES.map((theme) => new Option(theme.name, theme.file)));
    delete select.dataset.colorwayPopulating;
  }

  if (select.dataset.colorwayWired !== 'true') {
    select.dataset.colorwayWired = 'true';
    select.addEventListener('change', () => selectTheme(select.value));
  }

  const current = activeThemeFile();
  if (current && Array.from(select.options).some((option) => option.value === current)) {
    select.value = current;
  } else if (!current) {
    select.selectedIndex = -1;
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
  select.value = currentPattern();
  select.addEventListener('change', () => applyPattern(select.value));
}

function sliderPercent(input) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value || min);
  if (!Number.isFinite(value) || max <= min) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function syncSlider(input) {
  input.style.setProperty('--slider-pct', `${sliderPercent(input)}%`);
}

function wireSliders(root) {
  const sliders = [
    ...root.querySelectorAll('.obs-sim-font-slider, .obs-sim-vfader'),
    ...document.querySelectorAll('.demo-slider, .mixer-slider-mini'),
  ];

  sliders.forEach((slider) => {
    syncSlider(slider);
    if (slider.dataset.colorwaySliderWired === 'true') return;
    slider.dataset.colorwaySliderWired = 'true';
    slider.addEventListener('input', () => syncSlider(slider));
  });
}

function syncVisibleControls(root) {
  populateNativeStyleSelect(root);
  buildThemePicker(root);
  syncThemePicker(root);

  const patternSelect = root.querySelector('[data-obs-pattern-select]');
  if (patternSelect) patternSelect.value = currentPattern();

  // setTheme() reapplies the OBS theme's theme: URL. Restore the browser URL
  // and refresh range paint after every style swap.
  applyPattern(currentPattern());
  wireSliders(root);
}

function ensureAppearanceControls(root) {
  populateNativeStyleSelect(root);
  buildThemePicker(root);
  populatePatternSelect(root);
  syncVisibleControls(root);
}

function makeSettingsPermanent(root) {
  const dialog = root.querySelector('[data-settings-dialog]');
  const preview = root.querySelector('.obs-sim-preview-area');
  if (!dialog || !preview) return;

  if (dialog.parentElement !== preview) preview.append(dialog);
  dialog.hidden = false;
  dialog.removeAttribute('hidden');
  dialog.dataset.permanent = 'true';

  // This is now the page's primary controller, not a dismissible demo modal.
  dialog.querySelectorAll('[data-close-settings], .obs-sim-dialog-close').forEach((element) => element.remove());
  dialog.querySelector('.obs-sim-dialog-actions')?.remove();

  if (dialog.dataset.permanentObserver !== 'true') {
    dialog.dataset.permanentObserver = 'true';
    new MutationObserver(() => {
      if (dialog.hidden || dialog.hasAttribute('hidden')) {
        dialog.hidden = false;
        dialog.removeAttribute('hidden');
      }
    }).observe(dialog, { attributes: true, attributeFilter: ['hidden'] });
  }
}

function removeTopYamiShortcut() {
  document.querySelector('#workbench-download-yami')?.remove();
}

function wireRoot(root) {
  if (root.dataset.colorwayRefined === 'true') return;
  root.dataset.colorwayRefined = 'true';

  makeSettingsPermanent(root);
  removeTopYamiShortcut();
  ensureAppearanceControls(root);
  applyPattern(currentPattern());
  wireSliders(root);

  const panel = root.querySelector('[data-settings-panel]');
  if (panel) {
    // Only react when obs-preview.js replaces the settings panel itself.
    // Observing the whole subtree made our own palette synchronization feed
    // back into this observer forever.
    new MutationObserver(() => {
      ensureAppearanceControls(root);
      makeSettingsPermanent(root);
    }).observe(panel, { childList: true });
  }

  const themeName = document.querySelector('#active-theme-name');
  if (themeName) {
    new MutationObserver(() => syncVisibleControls(root))
      .observe(themeName, { childList: true, subtree: true, characterData: true });
  }

  const themeList = document.querySelector('#theme-list');
  if (themeList) {
    new MutationObserver(() => {
      refreshThemeOptions(root);
      syncThemePicker(root);
    }).observe(themeList, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-selected'],
    });
  }

  const sourcePatternSelect = document.querySelector('#pattern-select');
  sourcePatternSelect?.addEventListener('change', () => {
    const patternSelect = root.querySelector('[data-obs-pattern-select]');
    if (patternSelect) patternSelect.value = currentPattern();
    applyPattern(currentPattern());
  });

  // Base preview code still has a Settings button for visual fidelity. It no
  // longer controls visibility because the Appearance window is permanent.
  root.querySelectorAll('[data-open-settings]').forEach((button) => {
    button.addEventListener('click', () => {
      makeSettingsPermanent(root);
      ensureAppearanceControls(root);
    });
  });
}

function boot() {
  const root = document.querySelector('.obs-real-preview');
  if (!root) return false;

  wireRoot(root);

  if (document.querySelectorAll('#theme-list .theme-row').length === 0) {
    const app = document.querySelector('#app') || document.body;
    const observer = new MutationObserver(() => {
      if (document.querySelectorAll('#theme-list .theme-row').length > 0) {
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
