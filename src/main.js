import './styles.css';
import { THEMES, DEFAULT_THEME, PATTERNS, DEFAULT_PATTERN } from './theme-catalog.js';
import { PALETTE_VARS, PALETTE_GROUPS, applyTheme, loadTheme } from './theme-loader.js';
import { toNormalizedTheme, serializeOVT, toYamiOVT, downloadThemeText, importThemeFile, fromLospecPalette, lospecSlugFromUrl } from './theme-workbench.js';

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Fixed set of variables for palette preview
const PALETTE_PREVIEW_VARS = [
  '--bg_base',
  '--primary',
  '--warning',
  '--danger',
  '--text',
  '--border_color'
];

/**
 * Extracts a fixed set of 6 palette variables for preview
 * @param {Object} vars - Theme variables object
 * @returns {string[]} Array of 6 hex color strings
 */
function extractPalettePreview(vars) {
  return PALETTE_PREVIEW_VARS.map(varName => vars[varName] || '#000000');
}

/**
 * Preloads all theme files and extracts palette previews
 * @returns {Promise<Object>} Map of theme file to { name, palette }
 */
async function preloadAllThemes() {
  const themeData = {};
  const CHUNK = 10;
  for (let i = 0; i < THEMES.length; i += CHUNK) {
    await Promise.all(THEMES.slice(i, i + CHUNK).map(async (theme) => {
      try {
        const resolved = await loadTheme(theme.file);
        themeData[theme.file] = { name: resolved._name || theme.name, palette: extractPalettePreview(resolved) };
      } catch (error) {
        console.warn(`Failed to load theme ${theme.file}:`, error);
        themeData[theme.file] = {
          name: theme.name,
          palette: Array(6).fill('#808080')
        };
      }
    }));
  }
  return themeData;
}

/**
 * Renders the theme list with palette previews
 * @param {Object} themeData - Preloaded theme data
 * @param {string} activeTheme - Currently active theme file
 * @returns {string} HTML string for the theme list
 */
function renderThemeList(themeData, activeTheme) {
  return THEMES.map((theme) => {
    const { name, palette } = themeData[theme.file];
    const active = theme.file === activeTheme ? 'active' : '';
    const swatches = palette.map(color => `
      <span class="palette-swatch" style="background:${color}"></span>
    `).join('');
    return `
      <button type="button" class="theme-row ${active}" data-file="${escapeHtml(theme.file)}" role="option" aria-selected="${active === 'active'}">
        <span class="theme-name">${escapeHtml(name)}</span>
        <span class="theme-palette">
          ${swatches}
        </span>
        <a class="theme-download" href="/themes/${encodeURIComponent(theme.file)}" download="${escapeHtml(theme.file)}" title="Download .ovt" aria-label="Download ${escapeHtml(name)}">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1.5a.75.75 0 0 1 .75.75v6.69l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 8.03a.75.75 0 0 1 1.06-1.06l1.97 1.97V2.25A.75.75 0 0 1 8 1.5Zm-5.5 11a.75.75 0 0 1 .75.75v.5h9.5v-.5a.75.75 0 0 1 1.5 0v.5A1.5 1.5 0 0 1 12.75 15H3.25A1.5 1.5 0 0 1 1.75 13.75v-.5a.75.75 0 0 1 .75-.75Z"/></svg>
        </a>
      </button>
    `;
  }).join('');
}

const app = document.querySelector('#app');

function renderPalette() {
  const styles = getComputedStyle(document.documentElement);
  return PALETTE_GROUPS.map((group) => {
    const chips = group.vars.map(([variable, label]) => {
      const color = styles.getPropertyValue(variable).trim();
      return `
        <div class="palette-chip" title="${variable}: ${color}">
          <span class="palette-swatch" style="background:${color}"></span>
          <span class="palette-label">${label}</span>
          <span class="palette-hex">${color}</span>
        </div>
      `;
    }).join('');
    return `
      <div class="palette-group">
        <div class="palette-group-label">${group.label}</div>
        <div class="palette-group-grid">${chips}</div>
      </div>
    `;
  }).join('');
}



function renderPatternOptions() {
  return PATTERNS.map(p => `<option value="${p.file}" ${p.file === DEFAULT_PATTERN ? 'selected' : ''}>${p.name}</option>`).join('');
}

function renderApp() {
  app.innerHTML = `
    <div class="showcase-shell">
      <header class="showcase-header">
        <div class="showcase-title">Colorway <span style="font-weight:400;color:var(--text_muted)">OBS Theme Preview</span></div>
        <div class="showcase-controls">
          <div class="showcase-picker">
            <label for="theme-list">Theme</label>
            <div class="theme-list-container">
              <div id="theme-list" class="theme-list" role="listbox">
                <!-- Theme list will be rendered here -->
              </div>
            </div>
          </div>
          <div class="showcase-picker">
            <label for="pattern-select">Pattern</label>
            <select id="pattern-select">${renderPatternOptions()}</select>
          </div>
          <div class="showcase-info" id="theme-info">
            <span id="active-theme-name">Loading…</span>
            <span id="theme-status" aria-live="polite">Fetching theme variables</span>
          </div>
        </div>
      </header>

      <nav class="workbench-tabs" role="tablist" aria-label="Theme workbench">
        <button type="button" class="workbench-tab active" role="tab" aria-selected="true" data-tab="themes">Browse</button>
        <button type="button" class="workbench-tab" role="tab" aria-selected="false" data-tab="import">Import</button>
        <button type="button" class="workbench-tab" role="tab" aria-selected="false" data-tab="export">Export</button>
      </nav>

      <section id="panel-themes" class="workbench-panel" role="tabpanel" data-panel="themes">
        <div class="workbench-active-bar">
          <span class="workbench-active-label">Active theme: <strong id="workbench-active-name">—</strong></span>
          <button type="button" class="workbench-btn" id="workbench-download-yami">Yami variant</button>
        </div>
      </section>

      <section id="panel-import" class="workbench-panel" role="tabpanel" data-panel="import" hidden>
        <details class="workbench-import-section" open>
          <summary class="workbench-section-label">Upload an .ovt file</summary>
          <div class="workbench-drop" id="workbench-drop" tabindex="0" aria-label="Drop a .ovt file or click to browse">
            <p>Drop a <code>.ovt</code> file here, or <label class="workbench-file-label" for="workbench-file">choose a file</label>.</p>
            <input type="file" id="workbench-file" accept=".ovt,text/plain" hidden />
            <pre class="workbench-preview" id="workbench-preview" aria-live="polite">No file imported yet.</pre>
            <div class="workbench-import-actions">
              <button type="button" class="workbench-btn" id="workbench-apply" disabled>Apply imported theme</button>
              <button type="button" class="workbench-btn" id="workbench-download-import" disabled>Download as Colorway .ovt</button>
              <button type="button" class="workbench-btn" id="workbench-download-import-yami" disabled>Download as Yami .ovt</button>
            </div>
            <p class="workbench-error" id="workbench-error" role="alert" hidden></p>
          </div>
        </details>
        <details class="workbench-import-section">
          <summary class="workbench-section-label">Generate from Lospec palette</summary>
          <div class="workbench-lospec">
            <p class="workbench-help">Paste a Lospec palette URL or slug. The palette colors will be algorithmically assigned to OBS UI roles (background, text, accent) by perceptual lightness and contrast.</p>
            <div class="workbench-lospec-row">
              <input type="text" id="workbench-lospec-input" class="workbench-lospec-input" placeholder="e.g. moonside-8 or https://lospec.com/palette-list/moonside-8" spellcheck="false" />
              <button type="button" class="workbench-btn" id="workbench-lospec-fetch">Generate theme</button>
            </div>
            <pre class="workbench-preview" id="workbench-lospec-preview" aria-live="polite" hidden></pre>
            <div class="workbench-import-actions" id="workbench-lospec-actions" hidden>
              <button type="button" class="workbench-btn" id="workbench-lospec-apply" disabled>Apply generated theme</button>
              <button type="button" class="workbench-btn" id="workbench-lospec-download" disabled>Download as Colorway .ovt</button>
              <button type="button" class="workbench-btn" id="workbench-lospec-download-yami" disabled>Download as Yami .ovt</button>
            </div>
            <p class="workbench-error" id="workbench-lospec-error" role="alert" hidden></p>
          </div>
        </details>
      </section>

      <section id="panel-export" class="workbench-panel" role="tabpanel" data-panel="export" hidden>
        <p class="workbench-help">The active Colorway theme can be downloaded as a native <code>.ovt</code> or as a Yami-compatible variant. Yami output forces <code>extends: 'com.myrqyry.Colorway'</code> so it layers on top of your installed Colorway base.</p>
        <div class="workbench-export-list" id="workbench-export-list"></div>
      </section>

      <div class="showcase-grid">
        <details class="showcase-card card-palette">
          <summary class="card-header">
            <span>Palette</span>
            <span class="var-count">${PALETTE_VARS.length} vars</span>
          </summary>
          <div id="palette-grid" class="palette-grid">${renderPalette()}</div>
        </details>

        <section class="showcase-card">
          <div class="card-header">Buttons</div>
          <div class="card-body buttons-demo">
            <button class="demo-button" type="button">Default</button>
            <button class="demo-button primary" type="button">Primary</button>
            <button class="demo-button recording" type="button">Recording</button>
            <button class="demo-button" type="button" disabled>Disabled</button>
            <button class="demo-button" type="button" style="background:var(--button_bg);border-color:transparent">Flat</button>
          </div>
        </section>

        <section class="showcase-card">
          <div class="card-header">Text Inputs</div>
          <div class="card-body inputs-demo">
            <input class="demo-input" type="text" value="Normal text" aria-label="Normal input" autocomplete="off" name="normal-input" />
            <input class="demo-input" type="text" value="Focused" aria-label="Focused input" autocomplete="off" name="focused-input" />
            <input class="demo-input" type="text" value="Disabled" disabled aria-label="Disabled input" autocomplete="off" name="disabled-input" />
            <select class="demo-select" aria-label="Demo select">
              <option>Option A</option>
              <option>Option B</option>
              <option>Option C</option>
            </select>
          </div>
        </section>

        <section class="showcase-card">
          <div class="card-header">Sliders</div>
          <div class="card-body sliders-demo">
            <input class="demo-slider" type="range" min="0" max="100" value="65" style="--slider-pct:65%" name="slider-1" aria-label="Slider 1" />
            <input class="demo-slider" type="range" min="0" max="100" value="35" style="--slider-pct:35%" name="slider-2" aria-label="Slider 2" />
            <input class="demo-slider" type="range" min="0" max="100" value="80" style="--slider-pct:80%" name="slider-3" aria-label="Slider 3" />
          </div>
        </section>

        <section class="showcase-card">
          <div class="card-header">Checkboxes</div>
          <div class="card-body checkboxes-demo">
            <label class="demo-check"><input type="checkbox" checked /> Checked</label>
            <label class="demo-check"><input type="checkbox" /> Unchecked</label>
            <label class="demo-check"><input type="checkbox" disabled checked /> Disabled checked</label>
            <label class="demo-check"><input type="checkbox" disabled /> Disabled unchecked</label>
          </div>
        </section>

        <section class="showcase-card">
          <div class="card-header">Radio Buttons</div>
          <div class="card-body radios-demo">
            <label class="demo-radio"><input type="radio" name="rg" checked /> Selected</label>
            <label class="demo-radio"><input type="radio" name="rg" /> Unselected</label>
            <label class="demo-radio"><input type="radio" disabled checked /> Disabled selected</label>
            <label class="demo-radio"><input type="radio" disabled /> Disabled unselected</label>
          </div>
        </section>

        <section class="showcase-card">
          <div class="card-header">List Items</div>
          <div class="card-body lists-demo">
            <div class="demo-list-item" role="option" tabindex="0" aria-selected="false">
              <img class="list-icon" src="/icons/colorway/iconamoon/normal/display.svg" alt="" aria-hidden="true" />
              <span class="list-label">Normal item</span>
              <span class="list-actions">
                <img class="list-action" src="/icons/colorway/iconamoon/normal/eye.svg" alt="" aria-hidden="true" />
                <img class="list-action" src="/icons/colorway/iconamoon/normal/lock.svg" alt="" aria-hidden="true" />
              </span>
            </div>
            <div class="demo-list-item selected" role="option" tabindex="0" aria-selected="true">
              <img class="list-icon" src="/icons/colorway/iconamoon/normal/default.svg" alt="" aria-hidden="true" />
              <span class="list-label">Selected item</span>
              <span class="list-actions">
                <img class="list-action" src="/icons/colorway/iconamoon/normal/eye.svg" alt="" aria-hidden="true" />
                <img class="list-action" src="/icons/colorway/iconamoon/normal/lock.svg" alt="" aria-hidden="true" />
              </span>
            </div>
            <div class="demo-list-item inactive" role="option" tabindex="0" aria-selected="false">
              <img class="list-icon" src="/icons/colorway/iconamoon/normal/group.svg" alt="" aria-hidden="true" />
              <span class="list-label">Inactive item</span>
              <span class="list-actions">
                <img class="list-action" src="/icons/colorway/iconamoon/normal/eye.svg" alt="" aria-hidden="true" />
              </span>
            </div>
            <div class="demo-list-item" role="option" tabindex="0" aria-selected="false">
              <img class="list-icon" src="/icons/colorway/iconamoon/normal/globe.svg" alt="" aria-hidden="true" />
              <span class="list-label">Hover me</span>
              <span class="list-actions">
                <img class="list-action" src="/icons/colorway/iconamoon/normal/eye.svg" alt="" aria-hidden="true" />
              </span>
            </div>
          </div>
        </section>

        <section class="showcase-card">
          <div class="card-header">Tabs</div>
          <div class="card-body tabs-demo">
            <div class="demo-tabs" role="tablist">
              <button type="button" class="demo-tab" role="tab" aria-selected="false">General</button>
              <button type="button" class="demo-tab active" role="tab" aria-selected="true">Appearance</button>
              <button type="button" class="demo-tab" role="tab" aria-selected="false">Stream</button>
              <button type="button" class="demo-tab" role="tab" aria-selected="false">Output</button>
            </div>
          </div>
        </section>

        <section class="showcase-card">
          <div class="card-header">Audio Mixer</div>
          <div class="card-body mixer-demo">
            <div class="mixer-row">
              <div class="mixer-name">Desktop Audio</div>
              <div class="mixer-meter"><span style="width:72%"></span></div>
              <input class="mixer-slider-mini" type="range" value="72" style="--slider-pct:72%" name="mixer-desktop" aria-label="Desktop Audio volume" />
              <button class="mixer-mute" type="button" aria-label="Mute Desktop Audio">M</button>
            </div>
            <div class="mixer-row">
              <div class="mixer-name">Mic/Aux</div>
              <div class="mixer-meter"><span style="width:48%"></span></div>
              <input class="mixer-slider-mini" type="range" value="48" style="--slider-pct:48%" name="mixer-mic" aria-label="Mic/Aux volume" />
              <button class="mixer-mute" type="button" aria-label="Mute Mic/Aux">M</button>
            </div>
          </div>
        </section>

        <section class="showcase-card">
          <div class="card-header">Status Indicators</div>
          <div class="card-body status-demo">
            <div class="status-row">
              <span class="status-badge"><span class="status-dot live"></span> LIVE</span>
              <span class="status-badge recording"><span class="status-dot"></span> REC</span>
            </div>
            <div class="status-stats">
              <span>CPU: <strong id="cpu-value">4.2%</strong></span>
              <span><strong id="fps-value">60.00</strong> fps</span>
              <span>Dropped: <strong id="dropped-value">0.3%</strong></span>
              <span><strong id="bitrate-value">3820</strong> kb/s</span>
            </div>
          </div>
        </section>

        <section class="showcase-card">
          <div class="card-header">Progress Bar</div>
          <div class="card-body progress-demo">
            <div class="demo-progress" role="progressbar" aria-valuenow="57" aria-valuemin="0" aria-valuemax="100" aria-label="Progress: 57%"><div class="demo-progress-fill" style="width:57%"></div></div>
          </div>
        </section>
      </div>
    </div>
  `;
}

async function setTheme(file) {
  const status = document.querySelector('#theme-status');
  const name = document.querySelector('#active-theme-name');
  status.textContent = 'Loading theme variables...';

  try {
    const theme = await loadTheme(file);
    applyTheme(theme);
    name.textContent = theme._name || file;
    status.textContent = theme._dark === false ? 'Light variant' : 'Dark variant';
    document.querySelector('#palette-grid').innerHTML = renderPalette();
    applyCurrentPattern();
    setActiveWorkbenchTheme(file);
    
    // Update active row
    document.querySelectorAll('.theme-row').forEach(row => {
      row.classList.toggle('active', row.dataset.file === file);
      row.setAttribute('aria-selected', row.dataset.file === file);
    });
  } catch (error) {
    status.textContent = error.message;
    const grid = document.querySelector('#palette-grid');
    if (grid) {
      const errorElement = document.createElement('div');
      errorElement.style.cssText = 'padding:8px;color:var(--danger);font-size:10px';
      errorElement.textContent = error.message;
      grid.replaceChildren(errorElement);
    }
  }
}

function applyCurrentPattern() {
  const select = document.querySelector('#pattern-select');
  if (!select || !document.querySelector('.showcase-grid')) return;
  const patternFile = select.value;
  const patternUrl = patternFile ? `url(/patterns/${patternFile})` : '';
  document.documentElement.style.setProperty('--pattern_eyes', patternUrl);
  document.querySelector('.showcase-grid').style.setProperty('--preview-pattern', patternUrl);
}

function updateStatusDemo() {
  const cpu = document.querySelector('#cpu-value');
  const fps = document.querySelector('#fps-value');
  const dropped = document.querySelector('#dropped-value');
  const bitrate = document.querySelector('#bitrate-value');
  if (cpu) cpu.textContent = `${(Math.random() * 15 + 2).toFixed(1)}%`;
  if (fps) fps.textContent = (55 + Math.random() * 10).toFixed(2);
  if (dropped) dropped.textContent = `${(Math.random() * 2).toFixed(1)}%`;
  if (bitrate) bitrate.textContent = `${Math.floor(Math.random() * 3000) + 2000}`;
}

renderApp();
const themeList = document.querySelector('#theme-list');
const patternSelect = document.querySelector('#pattern-select');
patternSelect.addEventListener('change', () => applyCurrentPattern());

// Theme list event listeners
document.addEventListener('click', (e) => {
  const row = e.target.closest('.theme-row');
  if (row) {
    setTheme(row.dataset.file);
  }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
  const activeRow = document.querySelector('.theme-row.active');
  if (!activeRow) return;

  const row = e.key === 'ArrowDown'
    ? activeRow.nextElementSibling
    : e.key === 'ArrowUp'
      ? activeRow.previousElementSibling
      : null;

  if (row) {
    row.focus();
    e.preventDefault();
  } else if (e.key === 'Enter') {
    const focused = document.activeElement?.closest('.theme-row');
    setTheme((focused || activeRow).dataset.file);
    e.preventDefault();
  }
});

// Preload themes and render list
preloadAllThemes().then((themeData) => {
  themeList.innerHTML = renderThemeList(themeData, DEFAULT_THEME);
  setTheme(DEFAULT_THEME);
  initWorkbench();
});

document.querySelectorAll('.demo-slider, .mixer-slider-mini').forEach((slider) => {
  slider.addEventListener('input', () => {
    slider.style.setProperty('--slider-pct', `${slider.value}%`);
    if (slider.classList.contains('mixer-slider-mini')) {
      const row = slider.closest('.mixer-row');
      const meter = row?.querySelector('.mixer-meter span');
      const muteBtn = row?.querySelector('.mixer-mute');
      if (meter) {
        meter.style.width = `${slider.value}%`;
      }
      if (slider.value > 0 && muteBtn?.classList.contains('muted')) {
        muteBtn.click();
      }
    }
  });
});

document.querySelectorAll('.mixer-mute').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('muted');
    const row = btn.closest('.mixer-row');
    const meter = row?.querySelector('.mixer-meter span');
    const slider = row?.querySelector('.mixer-slider-mini');
    if (btn.classList.contains('muted')) {
      btn.style.setProperty('background', 'var(--danger)');
      btn.style.setProperty('color', 'var(--text_light)');
      if (meter) meter.style.width = '0%';
      if (slider) {
        slider.dataset.prevVal = slider.value;
        slider.value = 0;
        slider.style.setProperty('--slider-pct', '0%');
      }
    } else {
      btn.style.removeProperty('background');
      btn.style.removeProperty('color');
      if (slider) {
        const prev = slider.dataset.prevVal || '72';
        slider.value = prev;
        slider.style.setProperty('--slider-pct', `${prev}%`);
        if (meter) meter.style.width = `${prev}%`;
      }
    }
  });
});

document.querySelectorAll('.demo-list-item').forEach((item) => {
  item.addEventListener('click', () => selectListItem(item));
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectListItem(item);
    }
  });
});

let activeWorkbenchTheme = null;
let importedTheme = null;
let lospecTheme = null;

function setActiveWorkbenchTheme(file) {
  const meta = THEMES.find((t) => t.file === file);
  if (!meta) return;
  activeWorkbenchTheme = { file, name: meta.name };
  const nameEl = document.querySelector('#workbench-active-name');
  if (nameEl) nameEl.textContent = meta.name;
  const exportList = document.querySelector('#workbench-export-list');
  if (exportList) {
    exportList.innerHTML = `
      <a class="workbench-btn" href="/themes/${encodeURIComponent(file)}" download="${escapeHtml(file)}">Download Colorway .ovt</a>
      <button type="button" class="workbench-btn" data-yami-for="${escapeHtml(file)}">Download Yami-compatible .ovt</button>
    `;
  }
}

function switchWorkbenchTab(name) {
  document.querySelectorAll('.workbench-tab').forEach((tab) => {
    const isActive = tab.dataset.tab === name;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('.workbench-panel').forEach((panel) => {
    const isActive = panel.dataset.panel === name;
    panel.hidden = !isActive;
  });
}

function showWorkbenchError(message) {
  const el = document.querySelector('#workbench-error');
  if (!el) return;
  if (!message) {
    el.hidden = true;
    el.textContent = '';
  } else {
    el.hidden = false;
    el.textContent = message;
  }
}

async function handleImportedFile(file) {
  showWorkbenchError('');
  if (!file) return;
  if (!/\.ovt$|text\/plain/.test(file.name + file.type)) {
    showWorkbenchError('Only .ovt variant files are supported right now.');
    return;
  }
  try {
    const theme = await importThemeFile(file);
    importedTheme = theme;
    const previewEl = document.querySelector('#workbench-preview');
    if (previewEl) {
      const varCount = Object.keys(theme.tokens).length;
      previewEl.textContent = `name: ${theme.name}\nid: ${theme.id}\nextends: ${theme.extendsId ?? '(none)'}\nauthor: ${theme.author ?? '(unknown)'}\ndark: ${theme.dark}\ntokens: ${varCount} variable(s)`;
    }
    document.querySelector('#workbench-apply').disabled = false;
    document.querySelector('#workbench-download-import').disabled = false;
    document.querySelector('#workbench-download-import-yami').disabled = false;
  } catch (error) {
    showWorkbenchError(error.message || String(error));
  }
}

function initWorkbench() {
  setActiveWorkbenchTheme(DEFAULT_THEME);

  document.querySelectorAll('.workbench-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchWorkbenchTab(tab.dataset.tab));
  });

  const drop = document.querySelector('#workbench-drop');
  const fileInput = document.querySelector('#workbench-file');
  if (drop && fileInput) {
    drop.addEventListener('click', (e) => {
      if (e.target.tagName === 'LABEL' || e.target === fileInput) return;
      fileInput.click();
    });
    drop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.[0]) handleImportedFile(fileInput.files[0]);
    });
    ['dragenter', 'dragover'].forEach((evt) => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.add('dragging');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.remove('dragging');
      });
    });
    drop.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) handleImportedFile(file);
    });
  }

  document.querySelector('#workbench-apply')?.addEventListener('click', () => {
    if (!importedTheme) return;
    applyTheme({ ...importedTheme.tokens, _name: importedTheme.name, _dark: importedTheme.dark });
    const name = document.querySelector('#active-theme-name');
    if (name) name.textContent = importedTheme.name;
    const status = document.querySelector('#theme-status');
    if (status) status.textContent = `Imported — ${Object.keys(importedTheme.tokens).length} vars`;
    const grid = document.querySelector('#palette-grid');
    if (grid) grid.innerHTML = renderPalette();
  });

  const downloadImported = (kind) => {
    if (!importedTheme) return;
    const text = kind === 'yami' ? toYamiOVT(importedTheme) : serializeOVT(importedTheme);
    const base = importedTheme.id || 'imported';
    const filename = kind === 'yami' ? `${base}-yami.ovt` : `${base}.ovt`;
    downloadThemeText(text, filename);
  };
  document.querySelector('#workbench-download-import')?.addEventListener('click', () => downloadImported('colorway'));
  document.querySelector('#workbench-download-import-yami')?.addEventListener('click', () => downloadImported('yami'));

  document.querySelector('#workbench-download-yami')?.addEventListener('click', async () => {
    if (!activeWorkbenchTheme) return;
    const text = await fetch(`/themes/${encodeURIComponent(activeWorkbenchTheme.file)}`)
      .then((r) => r.text())
      .then((text) => toYamiOVT(toNormalizedTheme(text)));
    downloadThemeText(text, `${activeWorkbenchTheme.file.replace(/\.ovt$/, '')}-yami.ovt`);
  });

  document.addEventListener('click', (e) => {
    const yamiBtn = e.target.closest('[data-yami-for]');
    if (!yamiBtn) return;
    const file = yamiBtn.dataset.yamiFor;
    fetch(`/themes/${encodeURIComponent(file)}`)
      .then((r) => r.text())
      .then((text) => toYamiOVT(toNormalizedTheme(text)))
      .then((text) => downloadThemeText(text, file.replace(/\.ovt$/, '') + '-yami.ovt'));
  });

  // ---- Lospec palette import ----
  const lospecInput = document.querySelector('#workbench-lospec-input');
  const lospecFetch = document.querySelector('#workbench-lospec-fetch');

  async function fetchLospecPalette() {
    const el = document.querySelector('#workbench-lospec-error');
    if (!lospecInput) return;
    const raw = lospecInput.value.trim();
    if (!raw) return;
    const slug = lospecSlugFromUrl(raw);
    if (!slug) { showWorkbenchError('Could not extract a Lospec palette slug from that input.'); return; }
    try {
      const theme = await fromLospecPalette(slug);
      lospecTheme = theme;
      const preview = document.querySelector('#workbench-lospec-preview');
      if (preview) {
        preview.hidden = false;
        preview.textContent = `Palette: ${theme.name}\nColors: ${Object.keys(theme.tokens).length} OBS variables assigned\nDark mode: ${theme.dark}\n\n${Object.entries(theme.tokens).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`;
      }
      document.querySelector('#workbench-lospec-actions').hidden = false;
      document.querySelector('#workbench-lospec-apply').disabled = false;
      document.querySelector('#workbench-lospec-download').disabled = false;
      document.querySelector('#workbench-lospec-download-yami').disabled = false;
      if (el) el.hidden = true;
    } catch (error) {
      if (el) { el.hidden = false; el.textContent = error.message || String(error); }
    }
  }

  lospecFetch?.addEventListener('click', fetchLospecPalette);
  lospecInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchLospecPalette(); });

  document.querySelector('#workbench-lospec-apply')?.addEventListener('click', () => {
    if (!lospecTheme) return;
    applyTheme({ ...lospecTheme.tokens, _name: lospecTheme.name, _dark: lospecTheme.dark });
    const name = document.querySelector('#active-theme-name');
    if (name) name.textContent = `Lospec: ${lospecTheme.name}`;
    const status = document.querySelector('#theme-status');
    if (status) status.textContent = 'Generated — ' + Object.keys(lospecTheme.tokens).length + ' vars';
    const grid = document.querySelector('#palette-grid');
    if (grid) grid.innerHTML = renderPalette();
  });

  const downloadLospec = (kind) => {
    if (!lospecTheme) return;
    const text = kind === 'yami' ? toYamiOVT(lospecTheme) : serializeOVT(lospecTheme);
    const filename = kind === 'yami' ? `${lospecTheme.id}-yami.ovt` : `${lospecTheme.id}.ovt`;
    downloadThemeText(text, filename);
  };
  document.querySelector('#workbench-lospec-download')?.addEventListener('click', () => downloadLospec('colorway'));
  document.querySelector('#workbench-lospec-download-yami')?.addEventListener('click', () => downloadLospec('yami'));
}

function selectListItem(item) {
  const container = item.closest('.lists-demo');
  container?.querySelectorAll('.demo-list-item').forEach(i => {
    i.classList.remove('selected');
    i.setAttribute('aria-selected', 'false');
  });
  item.classList.add('selected');
  item.setAttribute('aria-selected', 'true');
}

updateStatusDemo();
const statusInterval = setInterval(updateStatusDemo, 2000);
window.addEventListener('beforeunload', () => clearInterval(statusInterval));

document.querySelectorAll('.demo-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    tab.closest('.demo-tabs')?.querySelectorAll('.demo-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
  });
  tab.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tab.click();
    }
  });
});
