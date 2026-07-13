import './styles.css';
import { THEMES, DEFAULT_THEME, PATTERNS, DEFAULT_PATTERN } from './theme-catalog.js';
import { PALETTE_VARS, PALETTE_GROUPS, applyTheme, loadTheme } from './theme-loader.js';

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
        <div class="showcase-title">Colorway OBS Theme Preview</div>
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

      <div class="showcase-grid">
        <details class="showcase-card card-palette">
          <summary class="card-header">
            <span>Advanced palette details</span>
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
    
    // Update active row
    document.querySelectorAll('.theme-row').forEach(row => {
      row.classList.toggle('active', row.dataset.file === file);
      row.setAttribute('aria-selected', row.dataset.file === file);
    });
  } catch (error) {
    status.textContent = error.message;
    const grid = document.querySelector('#palette-grid');
    if (grid) grid.innerHTML = `<div style="padding:8px;color:var(--danger);font-size:10px">${error.message}</div>`;
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
});

document.querySelectorAll('.demo-slider, .mixer-slider-mini').forEach((slider) => {
  slider.addEventListener('input', () => slider.style.setProperty('--slider-pct', `${slider.value}%`));
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
