import './obs-preview.css';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const scenes = ['Scene', 'Gameplay', 'Starting Soon'];
const sources = [
  { name: 'Browser', icon: '▧' },
  { name: 'IMG_3158.GIF', icon: '▣' },
  { name: 'Media Source', icon: '▶' },
];

function buttonIcon(label, title, extra = '') {
  return `<button type="button" class="obs-sim-tool ${extra}" title="${title}" aria-label="${title}">${label}</button>`;
}

function dock(title, body, footer = '', extra = '') {
  return `
    <section class="obs-sim-dock ${extra}" aria-label="${title}">
      <div class="obs-sim-dock-title">
        <span>${title}</span>
        <span class="obs-sim-dock-title-actions" aria-hidden="true">□</span>
      </div>
      <div class="obs-sim-dock-body">${body}</div>
      ${footer ? `<div class="obs-sim-dock-footer">${footer}</div>` : ''}
    </section>
  `;
}

function sceneRows() {
  return scenes.map((name, index) => `
    <button type="button" class="obs-sim-list-row${index === 0 ? ' selected' : ''}" data-scene-row>
      <span class="obs-sim-row-icon" aria-hidden="true">▦</span>
      <span class="obs-sim-row-label">${name}</span>
    </button>
  `).join('');
}

function sourceRows() {
  return sources.map((source, index) => `
    <button type="button" class="obs-sim-list-row${index === 1 ? ' selected' : ''}" data-source-row>
      <span class="obs-sim-row-icon" aria-hidden="true">${source.icon}</span>
      <span class="obs-sim-row-label">${source.name}</span>
      <span class="obs-sim-row-actions">
        <span class="obs-sim-icon-button source-visible" data-source-action="visible" role="button" tabindex="0" aria-label="Toggle visibility" aria-pressed="true">◉</span>
        <span class="obs-sim-icon-button" data-source-action="lock" role="button" tabindex="0" aria-label="Toggle lock" aria-pressed="${index === 1 ? 'true' : 'false'}">${index === 1 ? '◆' : '◇'}</span>
      </span>
    </button>
  `).join('');
}

function mixerChannel(name, level = 72) {
  return `
    <div class="obs-sim-vchannel">
      <div class="obs-sim-vchannel-title">${name}<span class="obs-sim-vchannel-menu">⌄</span></div>
      <div class="obs-sim-vchannel-db">-${Math.round((100 - level) / 10)}.0 dB</div>
      <div class="obs-sim-vchannel-stage">
        <input class="obs-sim-vfader" type="range" min="0" max="100" value="${Math.max(20, level - 12)}" aria-label="${name} volume">
        <div class="obs-sim-vmeter" aria-label="${name} level meter">
          <span class="obs-sim-vmeter-fill" style="height:${level}%"></span>
          <span class="obs-sim-vmeter-peak" style="bottom:${Math.min(level + 5, 96)}%"></span>
        </div>
        <div class="obs-sim-dbscale" aria-hidden="true">
          <span>0</span><span>-6</span><span>-12</span><span>-18</span><span>-24</span><span>-36</span><span>-48</span><span>-60</span>
        </div>
      </div>
      <div class="obs-sim-vchannel-actions">
        <button type="button" class="obs-sim-audio-icon" data-mute aria-pressed="false" title="Mute">◖</button>
        <button type="button" class="obs-sim-audio-icon" title="Audio properties">⚙</button>
      </div>
    </div>
  `;
}

function controlsDock() {
  return dock('Controls', `
    <div class="obs-sim-controls-stack">
      <button type="button" class="obs-sim-control" data-control="stream">Start Streaming</button>
      <button type="button" class="obs-sim-control" data-control="record">Start Recording</button>
      <button type="button" class="obs-sim-control" data-control="virtualcam">Start Virtual Camera</button>
      <button type="button" class="obs-sim-control" data-control="studio">Studio Mode</button>
      <button type="button" class="obs-sim-control" data-open-settings>Settings</button>
    </div>
  `, '', 'controls');
}

function settingsMarkup() {
  return `
    <div class="obs-sim-dialog-backdrop" data-settings-dialog hidden>
      <section class="obs-sim-dialog" role="dialog" aria-modal="true" aria-labelledby="obs-settings-title">
        <div class="obs-sim-dialog-titlebar">
          <strong id="obs-settings-title">Settings</strong>
          <button type="button" class="obs-sim-dialog-close" data-close-settings aria-label="Close settings">×</button>
        </div>
        <div class="obs-sim-dialog-content">
          <nav class="obs-sim-settings-nav" aria-label="Settings categories">
            <button type="button" data-settings-page="General"><span>⚙</span>General</button>
            <button type="button" class="selected" data-settings-page="Appearance"><span>◩</span>Appearance</button>
            <button type="button" data-settings-page="Stream"><span>⌁</span>Stream</button>
            <button type="button" data-settings-page="Output"><span>▣</span>Output</button>
            <button type="button" data-settings-page="Audio"><span>♪</span>Audio</button>
            <button type="button" data-settings-page="Video"><span>▰</span>Video</button>
            <button type="button" data-settings-page="Hotkeys"><span>⌘</span>Hotkeys</button>
            <button type="button" data-settings-page="Accessibility"><span>◉</span>Accessibility</button>
            <button type="button" data-settings-page="Advanced"><span>⌘</span>Advanced</button>
          </nav>
          <div class="obs-sim-settings-panel" data-settings-panel>
            <fieldset class="obs-sim-appearance-card">
              <legend>Appearance</legend>
              <div class="obs-sim-settings-row">
                <label for="obs-theme-select">Theme</label>
                <select id="obs-theme-select" class="obs-sim-select">
                  <option>Colorway</option>
                </select>
              </div>
              <div class="obs-sim-settings-row">
                <label for="obs-style-select">Style</label>
                <select id="obs-style-select" class="obs-sim-select" data-style-select>
                  <option>Current Colorway variant</option>
                </select>
              </div>
              <div class="obs-sim-settings-row font-size">
                <label for="obs-font-size">Font Size</label>
                <input id="obs-font-size" class="obs-sim-number" value="10" inputmode="numeric" aria-label="Font size">
                <input class="obs-sim-font-slider" type="range" min="8" max="14" value="10" aria-label="Font size slider">
              </div>
              <div class="obs-sim-settings-row density">
                <span>Density</span>
                <div class="obs-sim-density" role="group" aria-label="Density">
                  <button type="button" class="selected" data-density="classic">Classic</button>
                  <button type="button" data-density="compact">Compact</button>
                  <button type="button" data-density="normal">Normal</button>
                  <button type="button" data-density="comfortable">Comfortable</button>
                </div>
              </div>
            </fieldset>
          </div>
        </div>
        <div class="obs-sim-dialog-actions">
          <button type="button" class="obs-sim-dialog-button" disabled>Apply</button>
          <button type="button" class="obs-sim-dialog-button" data-close-settings>Cancel</button>
          <button type="button" class="obs-sim-dialog-button" data-close-settings>OK</button>
        </div>
      </section>
    </div>
  `;
}

function previewMarkup() {
  const sceneFooter = `
    ${buttonIcon('+', 'Add scene')}
    ${buttonIcon('−', 'Remove scene')}
    ${buttonIcon('▼', 'Scene menu')}
    <span class="obs-sim-footer-spacer"></span>
    ${buttonIcon('⌃', 'Move scene up')}
    ${buttonIcon('⌄', 'Move scene down')}
  `;
  const sourceFooter = `
    ${buttonIcon('+', 'Add source')}
    ${buttonIcon('−', 'Remove source')}
    ${buttonIcon('⚙', 'Source properties')}
    <span class="obs-sim-footer-spacer"></span>
    ${buttonIcon('⌃', 'Move source up')}
    ${buttonIcon('⌄', 'Move source down')}
  `;

  return `
    <section class="obs-real-preview" aria-labelledby="obs-preview-heading">
      <div class="obs-preview-heading-row">
        <div>
          <h2 id="obs-preview-heading">OBS Studio preview</h2>
          <p>Colorway rendered in the same dock hierarchy and settings state as OBS Studio.</p>
        </div>
        <div class="obs-preview-legend">
          <span><i class="obs-preview-legend-dot"></i> live theme</span>
          <button type="button" class="obs-preview-open-settings" data-open-settings>Open Appearance settings</button>
        </div>
      </div>

      <div class="obs-sim-window" data-obs-window>
        <div class="obs-sim-titlebar">
          <strong>OBS 32.2.0 - Profile: Untitled - Scenes: 2026</strong>
          <span aria-hidden="true">×</span>
        </div>

        <div class="obs-sim-menubar">
          ${['File', 'Edit', 'View', 'Docks', 'Profile', 'Scene Collection', 'Tools', 'Help'].map((name) => `
            <div class="obs-sim-menu-wrap">
              <button type="button" class="obs-sim-menu-button"${name === 'View' ? ' data-menu-toggle aria-expanded="false"' : ''}>${name}</button>
              ${name === 'View' ? `
                <div class="obs-sim-menu-popup" data-menu-popup hidden>
                  <button type="button"><span>Fullscreen Interface</span><kbd>F11</kbd></button>
                  <button type="button"><span>Docks</span><span>›</span></button>
                  <div class="obs-sim-menu-separator"></div>
                  <button type="button"><span>Stats</span></button>
                  <button type="button" disabled><span>Multiview</span></button>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="obs-sim-workspace">
          <div class="obs-sim-left-column">
            <div class="obs-sim-left-scenes">
              ${dock('Scenes', sceneRows(), sceneFooter, 'scenes')}
            </div>
            <div class="obs-sim-left-sources">
              ${dock('Sources', sourceRows(), sourceFooter, 'sources')}
            </div>
          </div>

          <div class="obs-sim-main-column">
            <div class="obs-sim-preview-area" data-canvas-area>
              <div class="obs-sim-canvas-pane obs-sim-preview-pane">
                <div class="obs-sim-canvas-frame">
                  <div class="obs-sim-canvas-content">
                    <div class="obs-sim-scene-art">
                      <span class="obs-sim-scene-kicker">COLORWAY</span>
                      <strong>Theme preview</strong>
                      <small>1920 × 1080</small>
                    </div>
                    <div class="obs-sim-transform-box" aria-hidden="true">
                      <i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i>
                    </div>
                  </div>
                </div>
              </div>
              <div class="obs-sim-canvas-pane obs-sim-program-pane">
                <div class="obs-sim-canvas-frame program">
                  <div class="obs-sim-canvas-content">
                    <div class="obs-sim-scene-art">
                      <span class="obs-sim-scene-kicker">PROGRAM</span>
                      <strong>Scene</strong>
                      <small>Live output</small>
                    </div>
                  </div>
                </div>
              </div>
              <div class="obs-sim-preview-toolbar">
                <span>59%</span>
                <span>Scale to Window</span>
                <span>⌄</span>
              </div>
            </div>

            <div class="obs-sim-properties-row">
              <strong>No source selected</strong>
              <button type="button" disabled>⚙ Properties</button>
              <button type="button" disabled>▣ Filters</button>
            </div>

            <div class="obs-sim-bottom-row">
              <div class="obs-sim-mixer-slot">
                ${dock('Audio Mixer', `
                  <div class="obs-sim-mixer-tabs"><span class="selected">Active</span></div>
                  <div class="obs-sim-vmixer">
                    ${mixerChannel('Media Source', 74)}
                    ${mixerChannel('Mic/Aux', 56)}
                  </div>
                `, `<span>0 hidden</span><span class="obs-sim-footer-spacer"></span><span>▤</span><span>⚙ Options</span>`, 'mixer')}
              </div>
              <div class="obs-sim-transition-slot">
                ${dock('Scene Transitions', `
                  <select class="obs-sim-select" aria-label="Transition"><option>Fade</option><option>Cut</option></select>
                  <div class="obs-sim-transition-duration">
                    <span>Duration</span>
                    <input class="obs-sim-input" value="300 ms" aria-label="Transition duration">
                  </div>
                `, `<span class="obs-sim-footer-spacer"></span>${buttonIcon('+', 'Add transition')}${buttonIcon('⌫', 'Remove transition')}${buttonIcon('⋮', 'Transition menu')}`, 'transitions')}
              </div>
              <div class="obs-sim-controls-slot">${controlsDock()}</div>
            </div>
          </div>
        </div>

        <div class="obs-sim-statusbar">
          <div class="obs-sim-status-left">
            <span>▥</span><span>◉</span>
            <span data-stream-status>00:00:00</span>
            <span class="obs-sim-status-dot"></span>
            <span data-record-status>00:00:00</span>
          </div>
          <div class="obs-sim-status-right">
            <strong>CPU: 0.4%</strong>
            <strong>60.00 / 60.00 FPS</strong>
            <span class="obs-sim-status-health"><i></i><span data-bitrate>0 kb/s</span></span>
          </div>
        </div>

        ${settingsMarkup()}
      </div>
    </section>
  `;
}

function toggleControl(button, active, activeText, idleText) {
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
  button.textContent = active ? activeText : idleText;
}

function syncStyleName(root) {
  const source = document.querySelector('#active-theme-name');
  const update = () => {
    const target = root.querySelector('[data-style-select]');
    if (!target) return;
    const name = source?.textContent?.trim() || 'Current Colorway variant';
    target.replaceChildren(new Option(name, name));
  };
  update();
  if (source) new MutationObserver(update).observe(source, { childList: true, subtree: true, characterData: true });
}

function wirePreview(root) {
  root.querySelectorAll('[data-scene-row]').forEach((row) => {
    row.addEventListener('click', () => {
      root.querySelectorAll('[data-scene-row]').forEach((item) => item.classList.remove('selected'));
      row.classList.add('selected');
    });
  });

  root.querySelectorAll('[data-source-row]').forEach((row) => {
    row.addEventListener('click', (event) => {
      if (event.target.closest('[data-source-action]')) return;
      root.querySelectorAll('[data-source-row]').forEach((item) => item.classList.remove('selected'));
      row.classList.add('selected');
      const properties = root.querySelector('.obs-sim-properties-row strong');
      if (properties) properties.textContent = row.querySelector('.obs-sim-row-label')?.textContent || 'Source selected';
      root.querySelectorAll('.obs-sim-properties-row button').forEach((button) => { button.disabled = false; });
    });
  });

  root.querySelectorAll('[data-source-action]').forEach((action) => {
    const toggle = () => {
      const pressed = action.getAttribute('aria-pressed') === 'true';
      action.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      action.classList.toggle('active', !pressed);
      action.textContent = action.dataset.sourceAction === 'visible'
        ? (pressed ? '○' : '◉')
        : (pressed ? '◇' : '◆');
    };
    action.addEventListener('click', (event) => {
      event.stopPropagation();
      toggle();
    });
    action.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        toggle();
      }
    });
  });

  root.querySelectorAll('[data-mute]').forEach((button) => {
    button.addEventListener('click', () => {
      const muted = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', muted ? 'false' : 'true');
      button.classList.toggle('muted', !muted);
      button.textContent = muted ? '◖' : '×';
      button.closest('.obs-sim-vchannel')?.classList.toggle('muted', !muted);
    });
  });

  const menuButton = root.querySelector('[data-menu-toggle]');
  const menuPopup = root.querySelector('[data-menu-popup]');
  menuButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = menuPopup.hidden;
    menuPopup.hidden = !open;
    menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuButton.classList.toggle('open', open);
  });
  root.addEventListener('click', (event) => {
    if (!event.target.closest('.obs-sim-menu-wrap') && menuPopup && !menuPopup.hidden) {
      menuPopup.hidden = true;
      menuButton?.setAttribute('aria-expanded', 'false');
      menuButton?.classList.remove('open');
    }
  });

  let streaming = false;
  let recording = false;
  let virtualCam = false;
  let studio = false;

  const streamButton = root.querySelector('[data-control="stream"]');
  streamButton?.addEventListener('click', () => {
    streaming = !streaming;
    toggleControl(streamButton, streaming, 'Stop Streaming', 'Start Streaming');
    root.querySelector('[data-stream-status]')?.classList.toggle('on', streaming);
    const bitrate = root.querySelector('[data-bitrate]');
    if (bitrate) bitrate.textContent = streaming ? '5987 kb/s' : '0 kb/s';
  });

  const recordButton = root.querySelector('[data-control="record"]');
  recordButton?.addEventListener('click', () => {
    recording = !recording;
    toggleControl(recordButton, recording, 'Stop Recording', 'Start Recording');
    recordButton.classList.toggle('recording', recording);
    root.querySelector('[data-record-status]')?.classList.toggle('on', recording);
  });

  const virtualButton = root.querySelector('[data-control="virtualcam"]');
  virtualButton?.addEventListener('click', () => {
    virtualCam = !virtualCam;
    toggleControl(virtualButton, virtualCam, 'Stop Virtual Camera', 'Start Virtual Camera');
  });

  const studioButton = root.querySelector('[data-control="studio"]');
  studioButton?.addEventListener('click', () => {
    studio = !studio;
    studioButton.classList.toggle('active', studio);
    studioButton.setAttribute('aria-pressed', studio ? 'true' : 'false');
    root.querySelector('[data-canvas-area]')?.classList.toggle('studio-mode', studio);
  });

  const dialog = root.querySelector('[data-settings-dialog]');
  root.querySelectorAll('[data-open-settings]').forEach((button) => {
    button.addEventListener('click', () => { if (dialog) dialog.hidden = false; });
  });
  root.querySelectorAll('[data-close-settings]').forEach((button) => {
    button.addEventListener('click', () => { if (dialog) dialog.hidden = true; });
  });

  root.querySelectorAll('[data-settings-page]').forEach((button) => {
    button.addEventListener('click', () => {
      const page = button.dataset.settingsPage;
      root.querySelectorAll('[data-settings-page]').forEach((item) => item.classList.toggle('selected', item === button));
      const panel = root.querySelector('[data-settings-panel]');
      if (!panel) return;
      if (page === 'Appearance') {
        panel.innerHTML = `
          <fieldset class="obs-sim-appearance-card">
            <legend>Appearance</legend>
            <div class="obs-sim-settings-row"><label>Theme</label><select class="obs-sim-select"><option>Colorway</option></select></div>
            <div class="obs-sim-settings-row"><label>Style</label><select class="obs-sim-select" data-style-select><option>${escapeHtml(document.querySelector('#active-theme-name')?.textContent?.trim() || 'Current Colorway variant')}</option></select></div>
            <div class="obs-sim-settings-row font-size"><label>Font Size</label><input class="obs-sim-number" value="10"><input class="obs-sim-font-slider" type="range" min="8" max="14" value="10"></div>
            <div class="obs-sim-settings-row density"><span>Density</span><div class="obs-sim-density"><button class="selected" type="button" data-density="classic">Classic</button><button type="button" data-density="compact">Compact</button><button type="button" data-density="normal">Normal</button><button type="button" data-density="comfortable">Comfortable</button></div></div>
          </fieldset>`;
        wireDensity(root);
      } else {
        panel.innerHTML = `<div class="obs-sim-settings-placeholder"><h3>${page}</h3><p>This preview keeps the real OBS category geometry visible while Appearance is the Colorway-specific state.</p><label><span>Example option</span><input class="obs-sim-input" value="${page} setting"></label><label class="obs-sim-check"><input type="checkbox" checked> Enabled</label></div>`;
      }
    });
  });

  root.addEventListener('input', (event) => {
    if (!event.target.classList.contains('obs-sim-font-slider')) return;
    const fontInput = root.querySelector('.obs-sim-number');
    if (fontInput) fontInput.value = event.target.value;
    root.querySelector('[data-obs-window]')?.style.setProperty('--obs-sim-font-scale', String(Number(event.target.value) / 10));
  });

  wireDensity(root);
  syncStyleName(root);
}

function wireDensity(root) {
  root.querySelectorAll('[data-density]').forEach((button) => {
    if (button.dataset.densityWired === 'true') return;
    button.dataset.densityWired = 'true';
    button.addEventListener('click', () => {
      const group = button.closest('.obs-sim-density');
      group?.querySelectorAll('[data-density]').forEach((item) => item.classList.toggle('selected', item === button));
      const obsWindow = root.querySelector('[data-obs-window]');
      if (obsWindow) obsWindow.dataset.density = button.dataset.density;
    });
  });
}

function mountObsPreview() {
  if (document.querySelector('.obs-real-preview')) return true;
  const grid = document.querySelector('.showcase-grid');
  if (!grid) return false;
  grid.insertAdjacentHTML('beforebegin', previewMarkup());
  const root = document.querySelector('.obs-real-preview');
  if (root) wirePreview(root);
  return Boolean(root);
}

if (!mountObsPreview()) {
  const observer = new MutationObserver(() => {
    if (mountObsPreview()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
