import './obs-preview-ambient.css';

const AMBIENT_PALETTE_VARS = [
  '--bg_base',
  '--bg_preview',
  '--primary',
  '--primary_light',
  '--warning',
  '--danger',
  '--success',
  '--text',
];

const MODES = ['ribbons', 'cells', 'orbit', 'lattice', 'waves'];

function activeThemeName() {
  return document.querySelector('#active-theme-name')?.textContent?.trim()
    || document.querySelector('#theme-list .theme-row.active .theme-name')?.textContent?.trim()
    || 'Colorway';
}

function activePatternName() {
  const select = document.querySelector('#pattern-select');
  return select?.selectedOptions?.[0]?.textContent?.trim()
    || select?.value
    || 'Diagonal';
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function appliedPalette() {
  const styles = getComputedStyle(document.documentElement);
  return AMBIENT_PALETTE_VARS.map((name) => styles.getPropertyValue(name).trim() || 'transparent');
}

function ensureAmbientLayer(root) {
  const preview = root.querySelector('.obs-sim-preview-area');
  if (!preview) return null;

  let layer = preview.querySelector('[data-colorway-ambient]');
  if (layer) return layer;

  layer = document.createElement('div');
  layer.className = 'colorway-ambient';
  layer.dataset.colorwayAmbient = 'true';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <div class="colorway-ambient-field"></div>
    <div class="colorway-ambient-structure"></div>
    <div class="colorway-ambient-light"></div>
  `;

  const dialog = preview.querySelector(':scope > .obs-sim-dialog-backdrop');
  if (dialog) preview.insertBefore(layer, dialog);
  else preview.append(layer);
  return layer;
}

function syncAmbient(root) {
  const layer = ensureAmbientLayer(root);
  if (!layer) return;

  const theme = activeThemeName();
  const pattern = activePatternName();
  const seed = hashString(`${theme}::${pattern}`);
  const random = mulberry32(seed);
  const palette = appliedPalette();
  const mode = MODES[seed % MODES.length];

  layer.dataset.ambientMode = mode;
  layer.dataset.ambientTheme = theme;
  layer.dataset.ambientPattern = pattern;

  palette.forEach((color, index) => {
    layer.style.setProperty(`--ambient-c${index + 1}`, color);
  });

  const angle = Math.round(random() * 150 + 15);
  const angleCross = (angle + 90) % 360;
  const angleWave = (angle + 35) % 360;
  const tile = Math.round(random() * 42 + 34);
  const tileSecondary = Math.round(tile * (0.55 + random() * 0.45));
  const x = Math.round(random() * 70 + 15);
  const y = Math.round(random() * 70 + 15);
  const x2 = Math.round(random() * 70 + 15);
  const y2 = Math.round(random() * 70 + 15);
  const driftX = Math.round(random() * 70 + 30);
  const driftY = Math.round(random() * 55 + 20);
  const speedA = 18 + random() * 18;
  const speedB = 28 + random() * 26;
  const spin = random() > 0.5 ? 1 : -1;

  layer.style.setProperty('--ambient-angle', `${angle}deg`);
  layer.style.setProperty('--ambient-angle-cross', `${angleCross}deg`);
  layer.style.setProperty('--ambient-angle-wave', `${angleWave}deg`);
  layer.style.setProperty('--ambient-tile', `${tile}px`);
  layer.style.setProperty('--ambient-tile-secondary', `${tileSecondary}px`);
  layer.style.setProperty('--ambient-half-tile', `${Math.round(tile / 2)}px`);
  layer.style.setProperty('--ambient-x', `${x}%`);
  layer.style.setProperty('--ambient-y', `${y}%`);
  layer.style.setProperty('--ambient-x2', `${x2}%`);
  layer.style.setProperty('--ambient-y2', `${y2}%`);
  layer.style.setProperty('--ambient-drift-x', `${driftX}px`);
  layer.style.setProperty('--ambient-drift-y', `${driftY}px`);
  layer.style.setProperty('--ambient-drift-x-start', `${Math.round(driftX * -0.35)}px`);
  layer.style.setProperty('--ambient-drift-y-start', `${Math.round(driftY * -0.25)}px`);
  layer.style.setProperty('--ambient-drift-x-reverse', `${Math.round(driftX * -0.7)}px`);
  layer.style.setProperty('--ambient-drift-y-soft', `${Math.round(driftY * 0.6)}px`);
  layer.style.setProperty('--ambient-speed-a', `${speedA.toFixed(2)}s`);
  layer.style.setProperty('--ambient-speed-b', `${speedB.toFixed(2)}s`);
  layer.style.setProperty('--ambient-speed-breathe', `${(speedA * 1.35).toFixed(2)}s`);
  layer.style.setProperty('--ambient-spin-angle', spin > 0 ? '360deg' : '-360deg');
}

function wireRoot(root) {
  if (root.dataset.colorwayAmbientWired === 'true') return;
  root.dataset.colorwayAmbientWired = 'true';

  syncAmbient(root);

  const themeName = document.querySelector('#active-theme-name');
  if (themeName) {
    new MutationObserver(() => syncAmbient(root))
      .observe(themeName, { childList: true, subtree: true, characterData: true });
  }

  const themeList = document.querySelector('#theme-list');
  if (themeList) {
    new MutationObserver(() => syncAmbient(root)).observe(themeList, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-selected'],
    });
  }

  const sourcePattern = document.querySelector('#pattern-select');
  sourcePattern?.addEventListener('change', () => syncAmbient(root));

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-obs-pattern-select]')) syncAmbient(root);
  });
}

function boot() {
  const root = document.querySelector('.obs-real-preview');
  if (!root?.querySelector('.obs-sim-preview-area')) return false;
  wireRoot(root);
  return true;
}

if (!boot()) {
  const observer = new MutationObserver(() => {
    if (boot()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
