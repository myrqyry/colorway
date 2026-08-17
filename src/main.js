import './styles.css';
import { gsap } from 'gsap';
import { THEMES, DEFAULT_THEME, PATTERNS, DEFAULT_PATTERN } from './theme-catalog.js';
import { PALETTE_VARS, PALETTE_GROUPS, applyTheme, loadTheme } from './theme-loader.js';
import { toNormalizedTheme, serializeOVT, toYamiOVT, downloadThemeText, importThemeFile, fromLospecPalette, lospecSlugFromUrl } from './theme-workbench.js';

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderWordChars(text) {
  return [...text].map((char) => `<span class="colorway-char" aria-hidden="true">${escapeHtml(char)}</span>`).join('');
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
        themeData[theme.file] = { name: resolved._name || theme.name, palette: extractPalettePreview(resolved), dark: resolved._dark !== false };
      } catch (error) {
        console.warn(`Failed to load theme ${theme.file}:`, error);
        themeData[theme.file] = {
          name: theme.name,
          palette: Array(6).fill('#808080'),
          dark: true
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
  const rowFor = (theme) => {
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
        <a class="theme-download" href="#" data-file="${escapeHtml(theme.file)}" title="Download theme package" aria-label="Download ${escapeHtml(name)}" aria-haspopup="true" aria-expanded="false">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 1.5a.75.75 0 0 1 .75.75v6.69l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 8.03a.75.75 0 0 1 1.06-1.06l1.97 1.97V2.25A.75.75 0 0 1 8 1.5Zm-5.5 11a.75.75 0 0 1 .75.75v.5h9.5v-.5a.75.75 0 0 1 1.5 0v.5A1.5 1.5 0 0 1 12.75 15H3.25A1.5 1.5 0 0 1 1.75 13.75v-.5a.75.75 0 0 1 .75-.75Z"/></svg>
        </a>
      </button>
    `;
  };
  const dark = THEMES.filter((t) => themeData[t.file]?.dark !== false);
  const light = THEMES.filter((t) => themeData[t.file]?.dark === false);
  const group = (label, themes) => themes.length
    ? `<div class="theme-group"><div class="theme-group-label">${label}</div>${themes.map(rowFor).join('')}</div>`
    : '';
  return group('Dark', dark) + group('Light', light);
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
      <div id="colorway-intro" class="colorway-intro" aria-hidden="true">
        <div class="colorway-intro-backdrop"></div>
        <div class="colorway-intro-stage">
          <div class="colorway-intro-tube">
            <div class="colorway-intro-pass colorway-intro-pass-1" aria-hidden="true">${renderWordChars('Colorway')}</div>
            <div class="colorway-intro-pass colorway-intro-pass-2" aria-hidden="true">${renderWordChars('Colorway')}</div>
            <div class="colorway-intro-pass colorway-intro-pass-3" aria-hidden="true">${renderWordChars('Colorway')}</div>
            <div class="colorway-intro-final" aria-hidden="true">${renderWordChars('Colorway')}</div>
          </div>
        </div>
      </div>
      <header class="showcase-header">
        <div class="showcase-title">
          <span class="header-colorway" role="heading" aria-level="1" aria-label="Colorway">
            <span class="header-colorway-chars intro-hidden" aria-hidden="true">${renderWordChars('Colorway')}</span>
            <span class="showcase-title-subtitle">OBS Theme Preview</span>
          </span>
        </div>
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
          <div class="showcase-picker">
            <label for="theme-shuffle">Shuffle</label>
            <button type="button" id="theme-shuffle" class="theme-shuffle" title="Skip to next theme" aria-label="Skip to next theme">
              <svg class="theme-shuffle-ring" viewBox="0 0 36 36" width="18" height="18" aria-hidden="true">
                <circle class="theme-shuffle-track" cx="18" cy="18" r="15.915" fill="none" stroke-width="3.5"></circle>
                <circle class="theme-shuffle-progress" id="theme-shuffle-progress" cx="18" cy="18" r="15.915" fill="none" stroke-width="3.5"></circle>
              </svg>
            </button>
          </div>
          <div class="showcase-info" id="theme-info">
            <div class="showcase-now-playing">
              <span id="active-theme-name">Loading…</span>
              <button
                type="button"
                id="slideshow-pause"
                class="slideshow-pause"
                aria-label="Pause slideshow"
                aria-pressed="false"
                title="Pause slideshow"
              >
                <span class="pause-icon" aria-hidden="true">❚❚</span>
              </button>
            </div>
            <div
              class="slideshow-progress"
              role="progressbar"
              aria-label="Time until next theme"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="100"
            >
              <span id="slideshow-progress-fill"></span>
            </div>
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
      <div class="theme-download-menu" id="theme-download-menu" hidden role="menu" aria-label="Download options">
        <label class="theme-download-toggle">
          <input type="checkbox" id="theme-download-base" checked />
          <span>Include base theme (.obt)</span>
        </label>
        <button type="button" class="theme-download-go" id="theme-download-go">Download .ovt + assets</button>
      </div>
    </div>
  `;
}

function applyThemeState(file, theme, patternFile) {
  applyTheme(theme);

  const name = document.querySelector('#active-theme-name');
  const status = document.querySelector('#theme-status');
  name.textContent = theme._name || file;
  status.textContent = theme._dark === false ? 'Light variant' : 'Dark variant';

  document.querySelector('#palette-grid').innerHTML = renderPalette();

  if (patternFile && patternSelect) {
    patternSelect.value = patternFile;
    patternSelect.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    applyCurrentPattern();
  }

  setActiveWorkbenchTheme(file);

  document.querySelectorAll('.theme-row').forEach((row) => {
    const active = row.dataset.file === file;
    row.classList.toggle('active', active);
    row.setAttribute('aria-selected', String(active));
  });
}

function crossfadeShowcase(commit, reduceMotion) {
  return new Promise((resolve) => {
    const showcase = document.querySelector('.showcase-grid');
    if (!showcase) {
      commit();
      resolve();
      return;
    }
    gsap.killTweensOf(showcase);
    gsap.to(showcase, {
      autoAlpha: 0,
      duration: reduceMotion ? 0 : 0.25,
      ease: 'power1.in',
      onComplete: () => {
        commit();
        gsap.to(showcase, {
          autoAlpha: 1,
          duration: reduceMotion ? 0 : 0.4,
          ease: 'power2.out',
          overwrite: true,
          onComplete: resolve,
        });
      },
    });
  });
}

async function setTheme(file, { patternFile = null, transition = true, animateTitle = true } = {}) {
  const status = document.querySelector('#theme-status');
  status.textContent = 'Loading theme variables...';

  try {
    // Load before animating so a cache hit never cuts the transition short.
    const theme = await loadTheme(file);
    const commit = () => applyThemeState(file, theme, patternFile);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (transition === false) {
      commit();
    } else if (!reduceMotion && document.startViewTransition) {
      const transition = document.startViewTransition(commit);
      await transition.finished;
    } else {
      await crossfadeShowcase(commit, reduceMotion);
    }

    if (animateTitle) animateHeaderColorway();
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

function playColorwayIntroOpening() {
  return new Promise((resolve) => {
    const intro = document.querySelector('#colorway-intro');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!intro || reduceMotion) {
      intro?.remove();
      resolve();
      return;
    }
    const pass1 = intro.querySelectorAll('.colorway-intro-pass-1 .colorway-char');
    const pass2 = intro.querySelectorAll('.colorway-intro-pass-2 .colorway-char');
    const pass3 = intro.querySelectorAll('.colorway-intro-pass-3 .colorway-char');
    const finalChars = intro.querySelectorAll('.colorway-intro-final .colorway-char');
    if (!pass1.length || !pass2.length || !pass3.length || !finalChars.length) {
      intro.remove();
      resolve();
      return;
    }

    gsap.set([pass1, pass2, pass3], {
      rotationX: -90,
      opacity: 1,
      transformPerspective: 700,
      transformOrigin: '50% 50% -40px',
    });
    gsap.set(finalChars, {
      rotationX: -90,
      opacity: 0,
      transformPerspective: 700,
      transformOrigin: '50% 50% -40px',
    });

    const timeline = gsap.timeline({ onComplete: resolve });
    timeline.to(pass1, { rotationX: 90, duration: 0.9, ease: 'none', stagger: 0.08 }, 0);
    timeline.to(pass2, { rotationX: 90, duration: 0.9, ease: 'none', stagger: 0.08 }, 0.45);
    timeline.to(pass3, { rotationX: 90, duration: 0.9, ease: 'none', stagger: 0.08 }, 0.9);
    timeline.to(finalChars, { rotationX: 0, opacity: 1, duration: 1.62, ease: 'expo.out', stagger: 0.06 }, 1.6);
  });
}

function animateHeaderColorway() {
  const chars = document.querySelectorAll('.header-colorway-chars .colorway-char');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !chars.length) return;
  gsap.killTweensOf(chars);
  gsap.fromTo(
    chars,
    { rotationX: -30, y: 2, opacity: 0.55, transformPerspective: 400, transformOrigin: '50% 50% -8px' },
    { rotationX: 0, y: 0, opacity: 1, duration: 0.65, ease: 'power3.out', stagger: 0.035, overwrite: true }
  );
}

function handoffColorway() {
  const intro = document.querySelector('#colorway-intro');
  const headerChars = document.querySelector('.header-colorway-chars');
  const finalWord = intro?.querySelector('.colorway-intro-final');

  if (!intro || !headerChars || !finalWord) {
    headerChars?.classList.remove('intro-hidden');
    intro?.remove();
    return Promise.resolve();
  }

  const from = finalWord.getBoundingClientRect();
  const to = headerChars.getBoundingClientRect();
  const scale = to.width / from.width;
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  return new Promise((resolve) => {
    const backdrop = intro.querySelector('.colorway-intro-backdrop');

    const timeline = gsap.timeline({
      onComplete: () => {
        headerChars.classList.remove('intro-hidden');
        gsap.set(finalWord, { visibility: 'hidden' });
        intro.remove();
        animateHeaderColorway();
        resolve();
      },
    });

    timeline
      .to(finalWord, { x: dx, y: dy, scale, duration: 1.05, ease: 'expo.inOut' }, 0)
      .to(backdrop, { autoAlpha: 0, duration: 0.9, ease: 'power2.inOut' }, 0.15);
  });
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
const downloadMenu = document.querySelector('#theme-download-menu');
const downloadGo = document.querySelector('#theme-download-go');
const downloadBase = document.querySelector('#theme-download-base');
let downloadForFile = null;

function positionDownloadMenu(anchor) {
  const rect = anchor.getBoundingClientRect();
  const menuWidth = 220;
  const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8);
  downloadMenu.style.left = `${Math.max(8, left)}px`;
  downloadMenu.style.top = `${rect.bottom + 6}px`;
}

function downloadUrl(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadThemeBundle(file, includeBase) {
  downloadUrl(`/themes/${encodeURIComponent(file)}`, file);
  if (includeBase) downloadUrl('/themes/Colorway.obt', 'Colorway.obt');
  downloadUrl('/fonts/BricolageGrotesqueVariable.ttf', 'BricolageGrotesqueVariable.ttf');
  PATTERNS.forEach((p) => downloadUrl(`/patterns/${encodeURIComponent(p.file)}`, p.file));
}

document.addEventListener('click', (e) => {
  const dl = e.target.closest('.theme-download');
  if (dl) {
    e.preventDefault();
    e.stopPropagation();
    downloadForFile = dl.dataset.file;
    positionDownloadMenu(dl);
    downloadMenu.hidden = !downloadMenu.hidden;
    return;
  }
  if (!downloadMenu.hidden && !e.target.closest('#theme-download-menu')) {
    downloadMenu.hidden = true;
  }
  const row = e.target.closest('.theme-row');
  if (row) {
    setTheme(row.dataset.file);
  }
});

downloadGo?.addEventListener('click', () => {
  if (!downloadForFile) return;
  downloadThemeBundle(downloadForFile, downloadBase.checked);
  downloadMenu.hidden = true;
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
const SHUFFLE_MS = 12000;
const shuffleButton = document.querySelector('#theme-shuffle');
const shuffleProgress = document.querySelector('#theme-shuffle-progress');
const slideshowPause = document.querySelector('#slideshow-pause');
const slideshowProgress = document.querySelector('#slideshow-progress-fill');
const RING_CIRC = 2 * Math.PI * 15.915;
let shuffleRemaining = SHUFFLE_MS;
let shufflePaused = false;
let shuffleTimer = null;
let darkThemeFiles = null;

let themeShuffleBag = [];
let patternShuffleBag = [];

function shuffled(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function nextFromBag(values, current, bag) {
  if (!bag.length) {
    bag.push(...shuffled(values.filter((value) => value !== current)));
  }
  return bag.pop();
}

function pickRandomTheme() {
  const current = document.querySelector('.theme-row.active')?.dataset.file;
  const themes = darkThemeFiles || THEMES.map((theme) => theme.file);
  return nextFromBag(themes, current, themeShuffleBag);
}

function pickRandomPattern() {
  const current = patternSelect?.value;
  const patterns = PATTERNS
    .map((pattern) => pattern.file)
    .filter((file) => file !== 'pattern.svg');
  return nextFromBag(patterns, current, patternShuffleBag);
}

function updateShuffleProgress() {
  const frac = Math.max(0, Math.min(1, shuffleRemaining / SHUFFLE_MS));

  if (shuffleProgress) {
    shuffleProgress.style.strokeDashoffset = String(RING_CIRC * (1 - frac));
  }

  if (slideshowProgress) {
    slideshowProgress.style.transform = `scaleX(${frac})`;

    const progress = slideshowProgress.parentElement;
    progress?.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
  }

  emitShuffleState();
}

function emitShuffleState() {
  document.dispatchEvent(new CustomEvent('colorway:shuffle-state', {
    detail: {
      paused: shufflePaused,
      remaining: shuffleRemaining,
      total: SHUFFLE_MS,
    },
  }));
}

function setShufflePaused(paused) {
  shufflePaused = paused;

  if (!slideshowPause) return;

  slideshowPause.setAttribute('aria-pressed', String(paused));
  slideshowPause.setAttribute(
    'aria-label',
    paused ? 'Resume slideshow' : 'Pause slideshow'
  );
  slideshowPause.title = paused ? 'Resume slideshow' : 'Pause slideshow';

  const icon = slideshowPause.querySelector('.pause-icon');
  if (icon) {
    icon.textContent = paused ? '▶' : '❚❚';
  }

  emitShuffleState();
}

function startShuffle() {
  clearInterval(shuffleTimer);
  shuffleTimer = setInterval(() => {
    if (shufflePaused) return;
    shuffleRemaining -= 100;
    if (shuffleRemaining <= 0) {
      shuffleRemaining = SHUFFLE_MS;
      setTheme(pickRandomTheme(), { patternFile: pickRandomPattern() });
    }
    updateShuffleProgress();
  }, 100);
}

slideshowPause?.addEventListener('click', () => {
  setShufflePaused(!shufflePaused);
});
shuffleButton?.addEventListener('click', () => {
  shuffleRemaining = 0;
});
shuffleProgress?.style.setProperty('stroke-dasharray', String(RING_CIRC));

function runIntro() {
  const preloadPromise = preloadAllThemes();
  const introPromise = playColorwayIntroOpening();
  Promise.all([preloadPromise, introPromise]).then(async ([themeData]) => {
    darkThemeFiles = THEMES.filter((t) => themeData[t.file]?.dark !== false).map((t) => t.file);
    const initialTheme = pickRandomTheme();
    themeList.innerHTML = renderThemeList(themeData, initialTheme);
    await setTheme(initialTheme, { transition: false, animateTitle: false });
    initWorkbench();
    await handoffColorway();
    startShuffle();
  });
}

runIntro();

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
