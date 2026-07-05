import './styles.css';
import { THEMES, DEFAULT_THEME, PATTERNS, DEFAULT_PATTERN } from './theme-catalog.js';
import { PALETTE_VARS, PALETTE_GROUPS, applyTheme, loadTheme } from './theme-loader.js';

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

function renderThemeOptions() {
  return THEMES.map((theme) => {
    const selected = theme.file === DEFAULT_THEME ? 'selected' : '';
    return `<option value="${theme.file}" ${selected}>${theme.name}</option>`;
  }).join('');
}

function renderPatternOptions() {
  return PATTERNS.map((pattern) => {
    const selected = pattern.file === DEFAULT_PATTERN ? 'selected' : '';
    return `<option value="${pattern.file}" ${selected}>${pattern.name}</option>`;
  }).join('');
}

function renderMixerStrip(label, level) {
  return `
    <div class="mixer-strip">
      <div class="mixer-name">${label}</div>
      <div class="meter-track"><span style="width:${level}%"></span></div>
      <input class="mixer-slider" type="range" value="${level}" aria-label="${label} volume" style="--slider-pct:${level}%" />
      <button class="mixer-mute" type="button">M</button>
    </div>
  `;
}

function renderApp() {
  app.innerHTML = `
    <div class="obs-app-shell">
      <header class="obs-titlebar">
        <div class="obs-caption-row">
          <div class="window-title">Colorway OBS Theme Preview</div>
          <div class="theme-picker">
            <label for="theme-select">Theme</label>
            <select id="theme-select">${renderThemeOptions()}</select>
          </div>
          <div class="pattern-picker">
            <label for="pattern-select">Pattern</label>
            <select id="pattern-select">${renderPatternOptions()}</select>
          </div>
        </div>
        <nav class="obs-menubar" aria-label="OBS menu preview">
          <span>File</span><span>Edit</span><span>View</span><span>Docks</span>
          <span>Profile</span><span>Scene Collection</span><span>Tools</span><span>Help</span>
        </nav>
      </header>

      <main class="obs-workspace">
        <aside class="left-panel">
          <section class="dock-panel scenes-dock">
            <div class="dock-header">Scenes</div>
            <div class="dock-scrollable">
              <button class="dock-row" type="button">Gaming</button>
              <button class="dock-row selected" type="button">Just Chatting</button>
              <button class="dock-row inactive" type="button">BRB Screen</button>
              <button class="dock-row" type="button">Starting Soon</button>
              <button class="dock-row inactive" type="button">Stream Ending</button>
            </div>
          </section>

          <section class="dock-panel sources-dock">
            <div class="dock-header">Sources</div>
            <div class="dock-scrollable">
              <button class="dock-row" type="button">
                <img class="dock-row-icon" src="/icons/colorway/iconamoon/normal/display.svg" alt="" />
                <span class="dock-row-label">Game Capture</span>
                <span class="dock-row-actions">
                  <img class="dock-action" src="/icons/colorway/iconamoon/normal/eye.svg" alt="visible" />
                  <img class="dock-action" src="/icons/colorway/iconamoon/normal/lock.svg" alt="locked" />
                </span>
              </button>
              <button class="dock-row selected" type="button">
                <img class="dock-row-icon" src="/icons/colorway/iconamoon/normal/default.svg" alt="" />
                <span class="dock-row-label">Camera</span>
                <span class="dock-row-actions">
                  <img class="dock-action" src="/icons/colorway/iconamoon/normal/eye.svg" alt="visible" />
                  <img class="dock-action" src="/icons/colorway/iconamoon/normal/lock.svg" alt="locked" />
                </span>
              </button>
              <button class="dock-row inactive" type="button">
                <img class="dock-row-icon" src="/icons/colorway/iconamoon/normal/group.svg" alt="" />
                <span class="dock-row-label">Chat overlay</span>
                <span class="dock-row-actions">
                  <img class="dock-action" src="/icons/colorway/iconamoon/normal/eye.svg" alt="visible" />
                </span>
              </button>
              <button class="dock-row inactive" type="button">
                <img class="dock-row-icon" src="/icons/colorway/iconamoon/normal/brush.svg" alt="" />
                <span class="dock-row-label">Alert box</span>
                <span class="dock-row-actions">
                  <img class="dock-action" src="/icons/colorway/iconamoon/normal/eye.svg" alt="visible" />
                </span>
              </button>
              <button class="dock-row" type="button">
                <img class="dock-row-icon" src="/icons/colorway/iconamoon/normal/globe.svg" alt="" />
                <span class="dock-row-label">Browser Source</span>
                <span class="dock-row-actions">
                  <img class="dock-action" src="/icons/colorway/iconamoon/normal/eye.svg" alt="visible" />
                  <img class="dock-action" src="/icons/colorway/iconamoon/normal/lock.svg" alt="locked" />
                </span>
              </button>
            </div>
          </section>

          <section class="dock-panel transitions-dock">
            <div class="dock-header">Scene Transitions</div>
            <div class="dock-transitions">
              <select class="obs-select" aria-label="Scene transition">
                <option>Fade</option>
                <option>Cut</option>
                <option>Swipe</option>
                <option>Slide</option>
              </select>
              <input class="obs-input" type="number" value="300" min="0" max="10000" aria-label="Duration ms" />
              <span class="dock-label">ms</span>
            </div>
          </section>
        </aside>

         <section class="preview-stage" aria-label="OBS preview canvas">
           <div class="preview-canvas">
             <div class="canvas-source camera-source">Camera</div>
             <div class="canvas-source alert-source">Follower alert</div>
             <div class="canvas-hud">
               <strong>1920 × 1080</strong>
               <span class="canvas-scale">125%</span>
             </div>
            <div id="canvas-palette" class="canvas-palette">
              <div class="canvas-palette-header">Palette <span class="inspector-badge">${PALETTE_VARS.length} vars</span></div>
              <div id="palette-grid" class="palette-grid"></div>
            </div>
              <div class="canvas-theme-info">
                <div id="active-theme-name" class="canvas-theme-name">Loading...</div>
                <div id="theme-status" class="canvas-theme-status">Fetching theme variables</div>
              </div>
            </div>
          </section>

        <aside class="right-panel">
          <section class="dock-panel mixer-dock">
            <div class="dock-header">Audio Mixer</div>
            ${renderMixerStrip('Desktop Audio', 72)}
            ${renderMixerStrip('Mic/Aux', 48)}
            ${renderMixerStrip('Music', 35)}
          </section>

          <section class="dock-panel controls-dock">
            <div class="dock-header">Controls</div>
            <button class="obs-button primary" type="button">Start Streaming</button>
            <button id="record-toggle" class="obs-button recording" type="button">Stop Recording</button>
            <button class="obs-button" type="button">Start Virtual Camera</button>
            <button class="obs-button" type="button">Settings</button>
          </section>
        </aside>
      </main>

      <footer class="obs-statusbar">
        <span class="status-indicator" aria-label="Live is active">
          <span class="status-dot live"></span>
          LIVE
        </span>
        <span class="status-indicator recording-indicator" aria-label="Recording is active">
          <span class="status-dot"></span>
          REC
        </span>
        <span>CPU: <span id="cpu-value">4.2%</span></span>
        <span><span id="fps-value">60.00</span> fps</span>
        <span>Dropped: <span id="dropped-value">0.3%</span></span>
        <span><span id="bitrate-value">3820</span> kb/s</span>
      </footer>

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
  } catch (error) {
    status.textContent = error.message;
    const grid = document.querySelector('#palette-grid');
    if (grid) grid.innerHTML = `<div style="padding:8px;color:var(--danger);font-size:10px">${error.message}</div>`;
  }
}

function applyCurrentPattern() {
  const select = document.querySelector('#pattern-select');
  if (!select) return;
  const patternFile = select.value;
  const canvas = document.querySelector('.preview-canvas');
  if (!canvas) return;

  if (patternFile) {
    const patternUrl = `/patterns/${patternFile}`;
    document.documentElement.style.setProperty('--pattern_eyes', `url(${patternUrl})`);
    canvas.style.backgroundImage = `url(${patternUrl})`;
  } else {
    document.documentElement.style.removeProperty('--pattern_eyes');
    canvas.style.backgroundImage = `
      linear-gradient(45deg, rgba(255,255,255,0.035) 25%, transparent 25%),
      linear-gradient(-45deg, rgba(255,255,255,0.035) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.035) 75%),
      linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.035) 75%)
    `;
    canvas.style.backgroundPosition = '0 0, 0 8px, 8px -8px, -8px 0';
    canvas.style.backgroundSize = '16px 16px';
  }
}

function updateStatusDemo() {
  const cpu = document.querySelector('#cpu-value');
  const fps = document.querySelector('#fps-value');
  const dropped = document.querySelector('#dropped-value');
  const bitrate = document.querySelector('#bitrate-value');
  if (cpu) cpu.textContent = `${(Math.random() * 15 + 2).toFixed(1)}%`;
  if (fps) fps.textContent = `${(Math.random() * 10 + 55).toFixed(2)}`;
  if (dropped) dropped.textContent = `${(Math.random() * 2).toFixed(1)}%`;
  if (bitrate) bitrate.textContent = `${Math.floor(Math.random() * 3000 + 2000)}`;
}

renderApp();

const themeSelect = document.querySelector('#theme-select');
themeSelect.addEventListener('change', () => setTheme(themeSelect.value));

const patternSelect = document.querySelector('#pattern-select');
patternSelect.addEventListener('change', () => applyCurrentPattern());

document.querySelectorAll('.dock-row').forEach((row) => {
  row.addEventListener('click', () => {
    const dock = row.closest('.dock-panel');
    dock.querySelectorAll('.dock-row').forEach((item) => item.classList.remove('selected'));
    row.classList.add('selected');
  });
});

document.querySelectorAll('.mixer-slider').forEach((slider) => {
  slider.addEventListener('input', () => {
    slider.style.setProperty('--slider-pct', `${slider.value}%`);
  });
});

document.querySelector('#record-toggle').addEventListener('click', (event) => {
  event.currentTarget.classList.toggle('recording');
});

updateStatusDemo();
const statusInterval = setInterval(updateStatusDemo, 2000);
// If teardown is ever needed: clearInterval(statusInterval);
setTheme(themeSelect.value);
