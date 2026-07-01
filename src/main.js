import './styles.css';
import { THEMES } from './theme-catalog.js';
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
    const selected = theme.file === 'Colorway-CatppuccinMocha.ovt' ? 'selected' : '';
    return `<option value="${theme.file}" ${selected}>${theme.name}</option>`;
  }).join('');
}

function renderMixerStrip(label, level) {
  return `
    <div class="mixer-strip">
      <div class="mixer-name">${label}</div>
      <div class="meter-track"><span style="width:${level}%"></span></div>
      <input class="mixer-slider" type="range" value="${level}" aria-label="${label} volume" />
      <button class="mixer-mute" type="button">Mute</button>
    </div>
  `;
}

function renderContextMenu() {
  return `
    <div class="context-menu">
      <div class="context-menu-item disabled">Properties</div>
      <div class="context-menu-item">Filters</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item">Copy</div>
      <div class="context-menu-item">Paste (Replace)</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item">Rename</div>
      <div class="context-menu-item danger">Remove</div>
    </div>
  `;
}

function renderApp() {
  app.innerHTML = `
    <div class="obs-app-shell">
      <header class="obs-titlebar">
        <div class="window-title">Colorway OBS Theme Preview</div>
        <nav class="obs-menubar" aria-label="OBS menu preview">
          <span>File</span><span>Edit</span><span>View</span><span>Docks</span>
          <span>Profile</span><span>Scene Collection</span><span>Tools</span><span>Help</span>
        </nav>
        <div class="theme-picker">
          <label for="theme-select">Theme</label>
          <select id="theme-select">${renderThemeOptions()}</select>
        </div>
      </header>

      <main class="obs-workspace">
        <section class="preview-stage" aria-label="OBS preview canvas">
          <div class="preview-canvas">
            <div class="safe-frame safe-frame-outer"></div>
            <div class="safe-frame safe-frame-inner"></div>
            <div class="canvas-source camera-source">Camera</div>
            <div class="canvas-source alert-source">Follower alert</div>
            <div class="canvas-hud">
              <span>Preview</span>
              <strong>1920 × 1080</strong>
            </div>
            <div class="canvas-tabs">
              <span class="canvas-tab active">Preview</span>
              <span class="canvas-tab">Sources</span>
              <span class="canvas-tab">Audio</span>
              <span class="canvas-tab disabled">Transitions</span>
            </div>
          </div>
        </section>

        <aside class="theme-inspector dock-panel">
          <div class="dock-header">Theme inspector
            <span class="dock-badge">0.4</span>
          </div>
          <div class="inspector-body">
            <div>
              <div class="field-label">Active theme</div>
              <div id="active-theme-name" class="theme-name">Loading...</div>
              <div id="theme-status" class="theme-status">Fetching theme variables</div>
            </div>
            <div>
              <div class="field-label">Connection</div>
              <div class="status-indicator">
                <span class="status-dot"></span>
                Connected
              </div>
              <div class="status-indicator disabled">
                <span class="status-dot"></span>
                Disabled
              </div>
            </div>
            <div>
              <div class="field-label">Palette (${PALETTE_VARS.length} vars)</div>
              <div id="palette-grid" class="palette-grid"></div>
            </div>
            <div class="state-samples">
              <button class="obs-button primary">Primary</button>
              <button class="obs-button">Neutral</button>
              <button class="obs-button danger">Danger</button>
              <button class="obs-button disabled">Disabled</button>
            </div>
          </div>
        </aside>

        <section class="dock-grid" aria-label="OBS dock preview">
          <section class="dock-panel scenes-dock">
            <div class="dock-header">
              Scenes
              <span class="dock-toolbar">
                <span class="toolbar-btn" title="Add Scene">+</span>
                <span class="toolbar-btn" title="Remove Scene">−</span>
              </span>
            </div>
            <div class="dock-scrollable">
              <button class="dock-row" type="button">Gaming</button>
              <button class="dock-row selected" type="button">Just Chatting</button>
              <button class="dock-row inactive" type="button">BRB Screen</button>
              <button class="dock-row" type="button">Starting Soon</button>
              <button class="dock-row inactive" type="button">Stream Ending</button>
            </div>
            <div class="context-menu-trigger" id="context-menu-trigger">Demo context menu <span class="tooltip-trigger" data-tooltip="Right-click mock">ⓘ</span></div>
            <div id="context-menu-area" class="context-menu-area">${renderContextMenu()}</div>
          </section>

          <section class="dock-panel sources-dock">
            <div class="dock-header">
              Sources
              <span class="dock-toolbar">
                <span class="toolbar-btn" title="Add Source">+</span>
                <span class="toolbar-btn" title="Remove Source">−</span>
                <span class="toolbar-btn" title="Settings">⚙</span>
              </span>
            </div>
            <div class="dock-scrollable">
              <button class="dock-row source-row" type="button"><span class="disclosure">▾</span><span class="source-icon visible"></span>Scene group</button>
              <button class="dock-row source-row nested" type="button"><span class="source-icon visible"></span>Game Capture</button>
              <button class="dock-row source-row nested selected" type="button"><span class="source-icon locked"></span>Camera</button>
              <button class="dock-row source-row inactive" type="button"><span class="source-icon hidden"></span>Chat overlay</button>
              <button class="dock-row source-row inactive" type="button"><span class="source-icon hidden"></span>Alert box</button>
              <button class="dock-row source-row" type="button"><span class="source-icon visible"></span>Browser Source</button>
            </div>
          </section>

          <section class="dock-panel mixer-dock">
            <div class="dock-header">Audio Mixer</div>
            ${renderMixerStrip('Desktop Audio', 72)}
            ${renderMixerStrip('Mic/Aux', 48)}
            ${renderMixerStrip('Music', 35)}
          </section>

          <section class="dock-panel transition-dock settings-panel">
            <div class="dock-header">Settings</div>

            <div class="settings-group">
              <div class="field-label">Test toggles</div>
              <label class="toggle-row">
                <span class="toggle">
                  <input type="checkbox" checked />
                  <span class="toggle-slider"></span>
                </span>
                <span class="toggle-label">Enable notifications</span>
              </label>
              <label class="toggle-row">
                <span class="toggle">
                  <input type="checkbox" />
                  <span class="toggle-slider"></span>
                </span>
                <span class="toggle-label">Auto-reconnect</span>
              </label>
            </div>

            <div class="settings-group">
              <div class="field-label">Radio buttons</div>
              <label class="radio-row">
                <input type="radio" name="demo-radio" checked />
                <span>Stream</span>
              </label>
              <label class="radio-row">
                <input type="radio" name="demo-radio" />
                <span>Record</span>
              </label>
              <label class="radio-row">
                <input type="radio" name="demo-radio" />
                <span>Virtual Cam</span>
              </label>
            </div>

            <div class="settings-group">
              <div class="field-label">Checkboxes</div>
              <label class="checkbox-row">
                <input type="checkbox" checked />
                <span>Show sources</span>
              </label>
              <label class="checkbox-row">
                <input type="checkbox" />
                <span>Enable overlays</span>
              </label>
            </div>

            <div class="settings-group">
              <div class="field-label">Text input</div>
              <input class="obs-input" placeholder="Stream key..." />
              <input class="obs-input focused-demo" value="Focused input demo" />
            </div>
          </section>

          <section class="dock-panel controls-dock">
            <div class="dock-header">Controls</div>
            <button class="obs-button primary" type="button">Start Streaming</button>
            <button id="record-toggle" class="obs-button recording" type="button">Stop Recording</button>
            <button class="obs-button" type="button">Start Virtual Camera</button>
            <button class="obs-button" type="button">Studio Mode</button>
            <button class="obs-button" type="button">Settings</button>
            <button class="obs-button" type="button">Exit</button>
          </section>
        </section>

        <section class="dock-panel extended-status">
          <div class="dock-header">
            Status
            <div class="dock-tabs">
              <span class="dock-tab active">Info</span>
              <span class="dock-tab">Stats</span>
              <span class="dock-tab">History</span>
            </div>
          </div>
          <div class="status-grid">
            <div class="status-item">
              <span class="status-item-label">Stream</span>
              <span class="status-indicator iconic" aria-label="Live is active">
                <span class="status-dot"></span>
                LIVE
              </span>
              <span class="status-timer">01:23:47</span>
            </div>
            <div class="status-item">
              <span class="status-item-label">Record</span>
              <span class="status-indicator iconic recording-indicator" aria-label="Recording is active">
                <span class="status-dot"></span>
                REC
              </span>
              <span class="status-timer">01:23:47</span>
            </div>
            <div class="status-item">
              <span class="status-item-label">CPU</span>
              <span class="status-value" id="cpu-value">4.2%</span>
              <div class="status-bar">
                <span class="status-bar-fill" style="width:4.2%"></span>
              </div>
            </div>
            <div class="status-item">
              <span class="status-item-label">FPS</span>
              <span class="status-value" id="fps-value">60.00</span>
              <div class="status-bar">
                <span class="status-bar-fill warn" style="width:100%"></span>
              </div>
            </div>
            <div class="status-item">
              <span class="status-item-label">Dropped</span>
              <span class="status-value" id="dropped-value">0.3%</span>
              <div class="status-bar">
                <span class="status-bar-fill danger" style="width:0.3%"></span>
              </div>
            </div>
            <div class="status-item">
              <span class="status-item-label">Bitrate</span>
              <span class="status-value" id="bitrate-value">3820 kb/s</span>
              <div class="bitrate-chart" id="bitrate-chart">
                ${Array.from({length: 20}, (_, i) =>
                  `<span class="bitrate-bar" style="height:${30 + Math.sin(i * 1.2) * 20 + Math.random() * 20}%"></span>`
                ).join('')}
              </div>
            </div>
            <div class="status-item span-2">
              <span class="status-item-label">Bandwidth meter</span>
              <div class="meter-track full-width">
                <span style="width:67%;background:linear-gradient(90deg,var(--meter_fg_nom),var(--meter_fg_war),var(--meter_fg_err))"></span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="obs-statusbar">
        <span class="status-indicator iconic" aria-label="Live is active">
          <span class="status-dot"></span>
          LIVE
        </span>
        <span class="status-indicator iconic recording-indicator" aria-label="Recording is active">
          <span class="status-dot"></span>
          REC
        </span>
        <span class="status-text" data-tooltip="CPU usage">CPU: 4.2%</span>
        <span class="status-text" data-tooltip="Frames per second">60.00 fps</span>
        <span class="status-text" data-tooltip="Dropped frames">Dropped frames: 0.3%</span>
        <span class="status-text" data-tooltip="Bitrate">3820 kb/s</span>
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
    updateStatusDemo();
  } catch (error) {
    status.textContent = error.message;
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
  if (bitrate) bitrate.textContent = `${Math.floor(Math.random() * 3000 + 2000)} kb/s`;
}

renderApp();

const themeSelect = document.querySelector('#theme-select');
themeSelect.addEventListener('change', () => setTheme(themeSelect.value));

document.querySelectorAll('.dock-row').forEach((row) => {
  row.addEventListener('click', () => {
    const dock = row.closest('.dock-panel');
    dock.querySelectorAll('.dock-row').forEach((item) => item.classList.remove('selected'));
    row.classList.add('selected');
  });
});

document.querySelector('#record-toggle').addEventListener('click', (event) => {
  event.currentTarget.classList.toggle('recording');
});

// Context menu toggle
const contextTrigger = document.querySelector('#context-menu-trigger');
if (contextTrigger) {
  contextTrigger.addEventListener('click', () => {
    document.querySelector('#context-menu-area').classList.toggle('visible');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#context-menu-trigger') && !e.target.closest('#context-menu-area')) {
      document.querySelector('#context-menu-area').classList.remove('visible');
    }
  });
}

setTheme(themeSelect.value);
