import './obs-preview-actions.css';

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

function clickEnabled(selector) {
  const control = document.querySelector(selector);
  if (!control || control.disabled) return false;
  control.click();
  return true;
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

function downloadCurrent(kind = 'colorway') {
  if (isImportedTheme()) {
    return clickEnabled(kind === 'yami'
      ? '#workbench-download-import-yami'
      : '#workbench-download-import');
  }

  if (isGeneratedTheme()) {
    return clickEnabled(kind === 'yami'
      ? '#workbench-lospec-download-yami'
      : '#workbench-lospec-download');
  }

  return kind === 'yami' ? downloadBuiltInYami() : downloadBuiltInColorway();
}

function syncBrand(root) {
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

function wireImportAutoApply() {
  const input = document.querySelector('#workbench-file');
  if (!input || input.dataset.colorwaySettingsWired === 'true') return;
  input.dataset.colorwaySettingsWired = 'true';

  input.addEventListener('change', () => {
    if (!input.files?.[0]) return;
    const apply = document.querySelector('#workbench-apply');
    if (!apply) return;

    // main.js parses the file asynchronously and enables Apply when it is
    // ready. Disable the old state now so we never apply a previous import.
    apply.disabled = true;
    const observer = new MutationObserver(() => {
      if (apply.disabled) return;
      observer.disconnect();
      apply.click();
    });
    observer.observe(apply, { attributes: true, attributeFilter: ['disabled'] });
  });
}

function triggerImport() {
  wireImportAutoApply();
  const input = document.querySelector('#workbench-file');
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

    actions.querySelector('[data-colorway-import]')?.addEventListener('click', triggerImport);
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
  wireImportAutoApply();

  const dialog = root.querySelector('.obs-sim-dialog');
  if (dialog) {
    // obs-preview-refine keeps Settings permanent and older code may remove
    // the stock action row again when switching settings pages. Restore only
    // our direct child when that happens; do not observe the whole subtree.
    new MutationObserver(() => {
      ensureBrand(root);
      ensureActions(root);
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
