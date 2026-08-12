import './page-shell-sync.css';

const HEADER_PALETTE_VARS = [
  '--bg_base',
  '--primary',
  '--warning',
  '--danger',
  '--text',
  '--border_color',
];

const LIVE_VARS = {
  '--cw-live-primary': '--primary',
  '--cw-live-primary-light': '--primary_light',
  '--cw-live-button-bg': '--button_bg',
  '--cw-live-handle': '--text_light',
  '--cw-live-meter-bg': '--bg_hover',
  '--cw-live-warning': '--warning',
  '--cw-live-danger': '--danger',
  '--cw-live-success': '--success',
  '--cw-live-border': '--border_color',
  '--cw-live-text': '--text',
  '--cw-live-muted': '--text_muted',
};

function activeThemeName() {
  return document.querySelector('#active-theme-name')?.textContent?.trim()
    || document.querySelector('#theme-list .theme-row.active .theme-name')?.textContent?.trim()
    || 'Current Colorway variant';
}

function computedVariable(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function paletteColors() {
  return HEADER_PALETTE_VARS.map((name) => computedVariable(name) || 'transparent');
}

function ensurePageHeader(root) {
  let header = document.querySelector('[data-colorway-page-header]');
  if (header) return header;

  header = document.createElement('header');
  header.className = 'colorway-page-header';
  header.dataset.colorwayPageHeader = 'true';
  header.innerHTML = `
    <div class="colorway-page-wordmark">
      <span class="colorway-page-mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <div class="colorway-page-title-copy">
        <h1>Colorway</h1>
        <span>OBS theme</span>
      </div>
    </div>
    <div class="colorway-page-current">
      <span class="colorway-page-current-label">Current theme</span>
      <strong data-colorway-page-theme></strong>
      <span class="colorway-page-palette" data-colorway-page-palette aria-hidden="true"></span>
    </div>
  `;

  root.parentElement?.insertBefore(header, root);
  return header;
}

function restoreSettingsTitle(root) {
  const titlebar = root.querySelector('.obs-sim-dialog-titlebar');
  if (!titlebar) return;

  if (titlebar.querySelector('[data-colorway-dialog-brand]') || titlebar.textContent?.trim() !== 'Settings') {
    const title = document.createElement('strong');
    title.id = 'obs-settings-title';
    title.textContent = 'Settings';
    titlebar.replaceChildren(title);
  }
}

function paintHeaderPalette(header, colors) {
  const palette = header?.querySelector('[data-colorway-page-palette]');
  if (!palette) return;
  const signature = colors.join('|');
  if (palette.dataset.signature === signature) return;
  palette.dataset.signature = signature;
  palette.replaceChildren(...colors.map((color) => {
    const swatch = document.createElement('i');
    swatch.style.background = color;
    return swatch;
  }));
}

function syncLivePaint(root) {
  const styles = getComputedStyle(document.documentElement);
  for (const [localName, sourceName] of Object.entries(LIVE_VARS)) {
    const value = styles.getPropertyValue(sourceName).trim();
    if (value) root.style.setProperty(localName, value);
  }

  // Give range pseudo-elements and browser-native controls an explicit style
  // invalidation point after each theme swap. CSS vars normally repaint on
  // their own, but range controls are notoriously inconsistent across engines.
  root.dataset.colorwayPaintRevision = String((Number(root.dataset.colorwayPaintRevision) || 0) + 1);
}

function syncPageIdentity(root) {
  const header = ensurePageHeader(root);
  const name = activeThemeName();
  const theme = header?.querySelector('[data-colorway-page-theme]');
  if (theme && theme.textContent !== name) theme.textContent = name;
  paintHeaderPalette(header, paletteColors());
  syncLivePaint(root);
  restoreSettingsTitle(root);
}

function sliderPercent(input) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value || min);
  if (!Number.isFinite(value) || max <= min) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function sliderDb(value) {
  if (value <= 0) return '-∞ dB';
  const db = Math.max(-60, 20 * Math.log10(value / 100));
  return `${db.toFixed(1)} dB`;
}

function syncMixerChannel(slider) {
  const channel = slider.closest('.obs-sim-vchannel');
  if (!channel) return;

  const pct = sliderPercent(slider);
  const value = Number(slider.value || 0);
  slider.style.setProperty('--slider-pct', `${pct}%`);

  const db = channel.querySelector('.obs-sim-vchannel-db');
  if (db) db.textContent = sliderDb(value);

  const fill = channel.querySelector('.obs-sim-vmeter-fill');
  const peak = channel.querySelector('.obs-sim-vmeter-peak');
  const level = Math.max(0, Math.min(100, value));
  if (fill) fill.style.height = `${level}%`;
  if (peak) peak.style.bottom = `${Math.min(98, level + 4)}%`;
}

function wireMixer(root) {
  root.querySelectorAll('.obs-sim-vfader').forEach((slider) => {
    syncMixerChannel(slider);
    if (slider.dataset.colorwayMixerWired === 'true') return;
    slider.dataset.colorwayMixerWired = 'true';
    slider.addEventListener('input', () => syncMixerChannel(slider));
  });
}

function wireFontSize(root) {
  const slider = root.querySelector('.obs-sim-font-slider');
  const number = root.querySelector('.obs-sim-settings-row.font-size .obs-sim-number');
  const window = root.querySelector('[data-obs-window]');
  if (!slider || !number || !window || number.dataset.colorwayFontWired === 'true') return;

  number.dataset.colorwayFontWired = 'true';
  const apply = (raw) => {
    const min = Number(slider.min || 8);
    const max = Number(slider.max || 14);
    const value = Math.max(min, Math.min(max, Number(raw) || 10));
    number.value = String(value);
    slider.value = String(value);
    slider.style.setProperty('--slider-pct', `${sliderPercent(slider)}%`);
    window.style.setProperty('--obs-sim-font-scale', String(value / 10));
  };

  number.addEventListener('input', () => apply(number.value));
  slider.addEventListener('input', () => apply(slider.value));
  apply(slider.value);
}

function wireDynamicPanel(root) {
  const panel = root.querySelector('[data-settings-panel]');
  if (!panel || panel.dataset.colorwayPageSyncWired === 'true') return;
  panel.dataset.colorwayPageSyncWired = 'true';
  new MutationObserver(() => {
    requestAnimationFrame(() => {
      restoreSettingsTitle(root);
      wireMixer(root);
      wireFontSize(root);
      syncLivePaint(root);
    });
  }).observe(panel, { childList: true });
}

function wireRoot(root) {
  if (root.dataset.colorwayPageShellWired === 'true') return;
  root.dataset.colorwayPageShellWired = 'true';

  syncPageIdentity(root);
  wireMixer(root);
  wireFontSize(root);
  wireDynamicPanel(root);

  const themeName = document.querySelector('#active-theme-name');
  if (themeName) {
    new MutationObserver(() => requestAnimationFrame(() => syncPageIdentity(root)))
      .observe(themeName, { childList: true, subtree: true, characterData: true });
  }

  const themeList = document.querySelector('#theme-list');
  if (themeList) {
    new MutationObserver(() => requestAnimationFrame(() => syncLivePaint(root)))
      .observe(themeList, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'aria-selected'],
      });
  }
}

function boot() {
  const root = document.querySelector('.obs-real-preview');
  if (!root) return false;
  wireRoot(root);
  return true;
}

if (!boot()) {
  const observer = new MutationObserver(() => {
    if (boot()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
