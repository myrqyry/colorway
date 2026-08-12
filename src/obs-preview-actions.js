import './obs-preview-actions.css';
import { applyTheme } from './theme-loader.js';
import {
  downloadThemeText,
  importThemeFile,
  serializeOVT,
  toYamiOVT,
} from './theme-workbench.js';

let appliedExternalTheme = null;
let stagedImportedTheme = null;
let stagedImportedGeneration = 0;
let stagedGeneratedTheme = null;
let settingsImportGeneration = 0;

function activeThemeName() {
  return document.querySelector('#active-theme-name')?.textContent?.trim()
    || document.querySelector('#theme-list .theme-row.active .theme-name')?.textContent?.trim()
    || 'Current theme';
}

function activeThemeFile() {
  return document.querySelector('#theme-list .theme-row.active')?.dataset.file || null;
}

function themeStatus() {
  return document.querySelector('#theme-status')?.textContent?.trim() || '';
}

function isImportedTheme() {
  return /^Imported\b/i.test(themeStatus());
}

function isGeneratedTheme() {
  return /^Generated\b/i.test(themeStatus());
}

function externalThemeIsActive() {
  return isImportedTheme() || isGeneratedTheme();
}

function downloadBuiltInColorway() {
  const file = activeThemeFile();
  if (!file) return false;

  const existing = Array.from(document.querySelectorAll('#workbench-export-list a[download]'))
    .find((link) => link.getAttribute('download') === file);
  if (existing) {
    existing.click();
    return true;
  }

  const link = document.createElement('a');
  link.href = `/themes/${encodeURIComponent(file)}`;
  link.download = file;
  document.body.append(link);
  link.click();
  link.remove();
  return true;
}

function downloadBuiltInYami() {
  const file = activeThemeFile();
  if (!file) return false;

  const button = Array.from(document.querySelectorAll('[data-yami-for]'))
    .find((control) => control.dataset.yamiFor === file);
  if (!button) return false;
  button.click();
  return true;
}

function safeFilenameStem(theme) {
  return String(theme?.id || theme?.name || 'colorway-theme')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    || 'colorway-theme';
}

function downloadAppliedExternal(kind = 'colorway') {
  const theme = appliedExternalTheme?.theme;
  if (!theme) return false;

  const text = kind === 'yami' ? toYamiOVT(theme) : serializeOVT(theme);
  const stem = safeFilenameStem(theme);
  downloadThemeText(text, kind === 'yami' ? `${stem}-yami.ovt` : `${stem}.ovt`);
  return true;
}

function downloadCurrent(kind = 'colorway') {
  if (externalThemeIsActive()) return downloadAppliedExternal(kind);
  return kind === 'yami' ? downloadBuiltInYami() : downloadBuiltInColorway();
}

function syncBrand(root) {
  if (!externalThemeIsActive()) appliedExternalTheme = null;

  const name = activeThemeName();
  const brandTheme = root.querySelector('[data-colorway-brand-theme]');
  const actionTheme = root.querySelector('[data-colorway-action-theme]');
  if (brandTheme && brandTheme.textContent !== name) brandTheme.textContent = name;
  if (actionTheme && actionTheme.textContent !== name) actionTheme.textContent = name;
  document.title = `${name} · Colorway OBS Theme`;
}

function ensureBrand(root) {
  const titlebar = root.querySelector('.obs-sim-dialog-titlebar');
  if (!titlebar) return;

  let brand = titlebar.querySelector('[data-colorway-dialog-brand]');
  if (!brand) {
    titlebar.replaceChildren();
    brand = document.createElement('div');
    brand.id = 'obs-settings-title';
    brand.className = 'colorway-dialog-brand';
    brand.dataset.colorwayDialogBrand = 'true';
    brand.innerHTML = `
      <span class="colorway-brand-mark" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
      <span class="colorway-brand-copy">
        <strong>Colorway</strong>
        <small data-colorway-brand-theme></small>
      </span>
      <span class="colorway-brand-context">OBS theme preview</span>
    `;
    titlebar.append(brand);
  }

  syncBrand(root);
}

function closeDownloadMenu(root) {
  const menu = root.querySelector('[data-colorway-download-menu]');
  const toggle = root.querySelector('[data-colorway-download-toggle]');
  if (menu) menu.hidden = true;
  toggle?.setAttribute('aria-expanded', 'false');
}

function clearCatalogSelection() {
  document.querySelectorAll('#theme-list .theme-row.active').forEach((row) => {
    row.classList.remove('active');
    row.setAttribute('aria-selected', 'false');
  });
}

function refreshPaletteGrid() {
  const styles = getComputedStyle(document.documentElement);
  document.querySelectorAll('#palette-grid .palette-chip').forEach((chip) => {
    const variable = chip.title?.split(':')[0]?.trim();
    if (!variable?.startsWith('--')) return;
    const value = styles.getPropertyValue(variable).trim();
    if (!value) return;
    const swatch = chip.querySelector('.palette-swatch');
    const label = chip.querySelector('.palette-hex');
    if (swatch) swatch.style.background = value;
    if (label) label.textContent = value;
    chip.title = `${variable}: ${value}`;
  });
}

function applyExternalTheme(theme, kind = 'imported') {
  applyTheme({ ...theme.tokens, _name: theme.name, _dark: theme.dark });
  appliedExternalTheme = { kind, theme };
  clearCatalogSelection();

  const name = document.querySelector('#active-theme-name');
  const status = document.querySelector('#theme-status');
  if (name) name.textContent = theme.name;
  if (status) {
    const label = kind === 'generated' ? 'Generated' : 'Imported';
    status.textContent = `${label} — ${Object.keys(theme.tokens).length} vars`;
  }
  refreshPaletteGrid();
}

async function stageImportedFile(file) {
  if (!file) return;
  const generation = ++stagedImportedGeneration;
  try {
    const theme = await importThemeFile(file);
    if (generation === stagedImportedGeneration) stagedImportedTheme = theme;
  } catch {
    if (generation === stagedImportedGeneration) stagedImportedTheme = null;
  }
}

function generatedId(name) {
  const slug = String(name || 'lospec')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'lospec';
  return `com.myrqyry.Colorway.${slug}`;
}

function parseGeneratedPreview() {
  const preview = document.querySelector('#workbench-lospec-preview');
  const text = preview?.textContent || '';
  const name = text.match(/^Palette:\s*(.+)$/m)?.[1]?.trim();
  const darkRaw = text.match(/^Dark mode:\s*(true|false)$/mi)?.[1];
  if (!name || darkRaw == null) return null;

  const tokens = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*(--[\w-]+):\s*(.+)$/);
    if (match) tokens[match[1]] = match[2].trim();
  }
  if (!Object.keys(tokens).length) return null;

  return {
    id: generatedId(name),
    name,
    author: 'Lospec',
    dark: darkRaw.toLowerCase() === 'true',
    extendsId: 'com.myrqyry.Colorway',
    tokens,
    sourceFormat: 'external',
  };
}

function wireWorkbenchSnapshots() {
  const input = document.querySelector('#workbench-file');
  if (input && input.dataset.colorwaySnapshotWired !== 'true') {
    input.dataset.colorwaySnapshotWired = 'true';
    input.addEventListener('change', () => stageImportedFile(input.files?.[0]));
  }

  const drop = document.querySelector('#workbench-drop');
  if (drop && drop.dataset.colorwaySnapshotWired !== 'true') {
    drop.dataset.colorwaySnapshotWired = 'true';
    drop.addEventListener('drop', (event) => stageImportedFile(event.dataTransfer?.files?.[0]));
  }

  const applyImport = document.querySelector('#workbench-apply');
  if (applyImport && applyImport.dataset.colorwaySnapshotWired !== 'true') {
    applyImport.dataset.colorwaySnapshotWired = 'true';
    applyImport.addEventListener('click', () => {
      if (stagedImportedTheme) appliedExternalTheme = { kind: 'imported', theme: stagedImportedTheme };
    });
  }

  const lospecPreview = document.querySelector('#workbench-lospec-preview');
  if (lospecPreview && lospecPreview.dataset.colorwaySnapshotWired !== 'true') {
    lospecPreview.dataset.colorwaySnapshotWired = 'true';
    const update = () => {
      const parsed = parseGeneratedPreview();
      if (parsed) stagedGeneratedTheme = parsed;
    };
    new MutationObserver(update).observe(lospecPreview, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    update();
  }

  const applyGenerated = document.querySelector('#workbench-lospec-apply');
  if (applyGenerated && applyGenerated.dataset.colorwaySnapshotWired !== 'true') {
    applyGenerated.dataset.colorwaySnapshotWired = 'true';
    applyGenerated.addEventListener('click', () => {
      if (stagedGeneratedTheme) appliedExternalTheme = { kind: 'generated', theme: stagedGeneratedTheme };
    });
  }
}

async function importFromSettings(root, file) {
  if (!file) return;
  const generation = ++settingsImportGeneration;
  const button = root.querySelector('[data-colorway-import]');
  if (button) {
    button.disabled = true;
    button.textContent = 'Importing…';
  }

  try {
    const theme = await importThemeFile(file);
    if (generation !== settingsImportGeneration) return;
    applyExternalTheme(theme, 'imported');
    syncBrand(root);
  } finally {
    if (generation === settingsImportGeneration && button) {
      button.disabled = false;
      button.textContent = 'Import';
    }
  }
}

function triggerImport(root) {
  const input = root.querySelector('[data-colorway-settings-file]');
  if (!input) return;
  input.value = '';
  input.click();
}

function ensureActions(root) {
  const dialog = root.querySelector('.obs-sim-dialog');
  if (!dialog) return;

  let actions = dialog.querySelector('[data-colorway-dialog-actions]');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'obs-sim-dialog-actions colorway-dialog-actions';
    actions.dataset.colorwayDialogActions = 'true';
    actions.innerHTML = `
      <div class="colorway-action-current">
        <span>Current</span>
        <strong data-colorway-action-theme></strong>
      </div>
      <div class="colorway-action-spacer"></div>
      <input type="file" accept=".ovt,text/plain" data-colorway-settings-file hidden>
      <button type="button" class="colorway-settings-action" data-colorway-import>
        Import
      </button>
      <div class="colorway-download-split">
        <button type="button" class="colorway-settings-action primary" data-colorway-download-main>
          Download
        </button>
        <button
          type="button"
          class="colorway-settings-action primary colorway-download-toggle"
          data-colorway-download-toggle
          aria-haspopup="menu"
          aria-expanded="false"
          aria-label="Download options"
        >⌄</button>
        <div class="colorway-download-menu" data-colorway-download-menu role="menu" hidden>
          <button type="button" role="menuitem" data-colorway-download-kind="colorway">
            <span><strong>Colorway .ovt</strong><small>Native variant</small></span>
            <span aria-hidden="true">↓</span>
          </button>
          <button type="button" role="menuitem" data-colorway-download-kind="yami">
            <span><strong>Yami-compatible .ovt</strong><small>Compatibility export</small></span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    `;
    dialog.append(actions);

    const settingsFile = actions.querySelector('[data-colorway-settings-file]');
    settingsFile?.addEventListener('change', () => importFromSettings(root, settingsFile.files?.[0]));
    actions.querySelector('[data-colorway-import]')?.addEventListener('click', () => triggerImport(root));
    actions.querySelector('[data-colorway-download-main]')?.addEventListener('click', () => {
      downloadCurrent('colorway');
      closeDownloadMenu(root);
    });

    const toggle = actions.querySelector('[data-colorway-download-toggle]');
    const menu = actions.querySelector('[data-colorway-download-menu]');
    toggle?.addEventListener('click', (event) => {
      event.stopPropagation();
      const opening = menu.hidden;
      menu.hidden = !opening;
      toggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });

    actions.querySelectorAll('[data-colorway-download-kind]').forEach((button) => {
      button.addEventListener('click', () => {
        downloadCurrent(button.dataset.colorwayDownloadKind);
        closeDownloadMenu(root);
      });
    });
  }

  syncBrand(root);
}

function wireRoot(root) {
  if (root.dataset.colorwayProductWired === 'true') return;
  root.dataset.colorwayProductWired = 'true';

  ensureBrand(root);
  ensureActions(root);
  wireWorkbenchSnapshots();

  const dialog = root.querySelector('.obs-sim-dialog');
  if (dialog) {
    // Restore our direct product row if older preview code replaces dialog children.
    new MutationObserver(() => {
      ensureBrand(root);
      ensureActions(root);
      wireWorkbenchSnapshots();
    }).observe(dialog, { childList: true });
  }

  const themeName = document.querySelector('#active-theme-name');
  if (themeName) {
    new MutationObserver(() => syncBrand(root))
      .observe(themeName, { childList: true, subtree: true, characterData: true });
  }

  root.addEventListener('click', (event) => {
    if (!event.target.closest('.colorway-download-split')) closeDownloadMenu(root);
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDownloadMenu(root);
  });
}

function boot() {
  const root = document.querySelector('.obs-real-preview');
  if (!root?.querySelector('.obs-sim-dialog')) return false;
  wireRoot(root);
  return true;
}

if (!boot()) {
  const observer = new MutationObserver(() => {
    if (boot()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
