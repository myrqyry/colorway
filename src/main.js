import './styles.css';
import { THEMES } from './theme-catalog.js';
import { PALETTE_VARS, applyTheme, loadTheme } from './theme-loader.js';

const app = document.querySelector('#app');

function renderPalette() {
  const styles = getComputedStyle(document.documentElement);
  return PALETTE_VARS.map(([variable, label]) => {
    const color = styles.getPropertyValue(variable).trim();
    return `
      <div class="palette-chip" title="${variable}: ${color}">
        <span class="palette-swatch" style="background:${color}"></span>
        <span>${label}</span>
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
          </div>
        </section>

        <aside class="theme-inspector dock-panel">
          <div class="dock-header">Theme inspector</div>
          <div class="inspector-body">
            <div>
              <div class="field-label">Active theme</div>
              <div id="active-theme-name" class="theme-name">Loading...</div>
              <div id="theme-status" class="theme-status">Fetching theme variables</div>
            </div>
            <div>
              <div class="field-label">Palette</div>
              <div id="palette-grid" class="palette-grid"></div>
            </div>
            <div class="state-samples">
              <button class="obs-button primary">Primary</button>
              <button class="obs-button">Neutral</button>
              <button class="obs-button danger">Danger</button>
            </div>
          </div>
        </aside>

        <section class="dock-grid" aria-label="OBS dock preview">
          <section class="dock-panel scenes-dock">
            <div class="dock-header">Scenes</div>
            <button class="dock-row selected" type="button">Gaming</button>
            <button class="dock-row" type="button">Just Chatting</button>
            <button class="dock-row inactive" type="button">BRB Screen</button>
            <button class="dock-row" type="button">Starting Soon</button>
          </section>

          <section class="dock-panel sources-dock">
            <div class="dock-header">Sources</div>
            <button class="dock-row source-row selected" type="button"><span class="disclosure">▾</span><span class="source-icon visible"></span>Scene group</button>
            <button class="dock-row source-row nested" type="button"><span class="source-icon visible"></span>Game Capture</button>
            <button class="dock-row source-row nested" type="button"><span class="source-icon locked"></span>Camera</button>
            <button class="dock-row source-row inactive" type="button"><span class="source-icon hidden"></span>Chat overlay</button>
          </section>

          <section class="dock-panel mixer-dock">
            <div class="dock-header">Audio Mixer</div>
            ${renderMixerStrip('Desktop Audio', 72)}
            ${renderMixerStrip('Mic/Aux', 48)}
            ${renderMixerStrip('Music', 35)}
          </section>

          <section class="dock-panel transition-dock">
            <div class="dock-header">Scene Transitions</div>
            <label class="field-label" for="transition-select">Transition</label>
            <select id="transition-select" class="obs-select"><option>Fade</option><option>Cut</option><option>Swipe</option></select>
            <label class="field-label" for="duration-input">Duration</label>
            <input id="duration-input" class="obs-input" value="300 ms" />
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
      </main>

      <footer class="obs-statusbar">
        <span>LIVE 00:12:47</span>
        <span>REC 00:12:47</span>
        <span>CPU: 4.2%</span>
        <span>60.00 fps</span>
        <span>Dropped frames: 0.3%</span>
        <span>3820 kb/s</span>
      </footer>
    </div>
  `;
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
  } catch (error) {
    status.textContent = error.message;
  }
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

setTheme(themeSelect.value);
