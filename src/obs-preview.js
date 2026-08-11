import './obs-preview.css';

const sceneNames = ['Main', 'Gameplay', 'Starting Soon', 'BRB'];
const sourceNames = ['Webcam', 'Game Capture', 'Alerts', 'Chat Overlay'];

function dock(title, body, footer = '') {
  return `
    <section class="obs-sim-dock" aria-label="${title}">
      <div class="obs-sim-dock-title">${title}</div>
      <div class="obs-sim-dock-body">${body}</div>
      ${footer ? `<div class="obs-sim-dock-footer">${footer}</div>` : ''}
    </section>
  `;
}

function listRows(items, kind) {
  return items.map((name, index) => `
    <button type="button" class="obs-sim-list-row${index === 0 ? ' selected' : ''}" data-${kind}-row>
      <span class="obs-sim-row-icon" aria-hidden="true">${kind === 'scene' ? '▦' : '▣'}</span>
      <span class="obs-sim-row-label">${name}</span>
      ${kind === 'source' ? `
        <span class="obs-sim-row-actions">
          <span class="obs-sim-icon-button source-visible" data-source-action="visible" role="button" tabindex="0" aria-label="Toggle visibility" aria-pressed="true">◉</span>
          <span class="obs-sim-icon-button" data-source-action="lock" role="button" tabindex="0" aria-label="Toggle lock" aria-pressed="false">◇</span>
        </span>
      ` : ''}
    </button>
  `).join('');
}

function mixerChannel(name, level, volume) {
  return `
    <div class="obs-sim-mixer-channel">
      <div class="obs-sim-mixer-heading">
        <span>${name}</span>
        <span class="obs-sim-db">${volume > 70 ? '-3.8' : '-9.2'} dB</span>
      </div>
      <div class="obs-sim-meter" aria-label="${name} meter">
        <span class="obs-sim-meter-fill" style="width:${level}%"></span>
        <span class="obs-sim-meter-peak" style="left:${Math.min(level + 4, 97)}%"></span>
      </div>
      <div class="obs-sim-mixer-controls">
        <input class="obs-sim-volume" type="range" min="0" max="100" value="${volume}" aria-label="${name} volume" />
        <button type="button" class="obs-sim-mini-button" data-mute aria-pressed="false" title="Mute">M</button>
        <button type="button" class="obs-sim-mini-button" title="Audio properties">⋮</button>
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
      <button type="button" class="obs-sim-control">Exit</button>
    </div>
  `);
}

function previewMarkup() {
  const sceneFooter = `
    <button type="button" class="obs-sim-footer-button" title="Add scene">＋</button>
    <button type="button" class="obs-sim-footer-button" title="Remove scene">−</button>
    <span class="obs-sim-footer-spacer"></span>
    <button type="button" class="obs-sim-footer-button" title="Move scene up">↑</button>
    <button type="button" class="obs-sim-footer-button" title="Move scene down">↓</button>
  `;
  const sourceFooter = `
    <button type="button" class="obs-sim-footer-button" title="Add source">＋</button>
    <button type="button" class="obs-sim-footer-button" title="Remove source">−</button>
    <button type="button" class="obs-sim-footer-button" title="Source properties">⚙</button>
    <span class="obs-sim-footer-spacer"></span>
    <button type="button" class="obs-sim-footer-button" title="Move source up">↑</button>
    <button type="button" class="obs-sim-footer-button" title="Move source down">↓</button>
  `;

  return `
    <section class="obs-real-preview" aria-labelledby="obs-preview-heading">
      <div class="obs-preview-heading-row">
        <div>
          <h2 id="obs-preview-heading">OBS Studio preview</h2>
          <p>Interactive OBS-shaped surface using the active Colorway theme variables.</p>
        </div>
        <div class="obs-preview-legend" aria-label="Preview controls">
          <span><i class="obs-preview-legend-dot"></i> live theme</span>
          <span>Use the controls below to expose more UI states</span>
        </div>
      </div>

      <div class="obs-sim-window">
        <div class="obs-sim-menubar">
          <div class="obs-sim-appmark" aria-hidden="true">◉</div>
          <div class="obs-sim-menu-items">
            <button type="button" class="obs-sim-menu-button">File</button>
            <button type="button" class="obs-sim-menu-button">Edit</button>
            <div class="obs-sim-menu-wrap">
              <button type="button" class="obs-sim-menu-button" data-menu-toggle aria-expanded="false">View</button>
              <div class="obs-sim-menu-popup" data-menu-popup hidden>
                <button type="button"><span>Fullscreen Interface</span><kbd>F11</kbd></button>
                <button type="button"><span>Docks</span><span>›</span></button>
                <div class="obs-sim-menu-separator"></div>
                <button type="button"><span>Stats</span></button>
                <button type="button" disabled><span>Multiview</span></button>
              </div>
            </div>
            <button type="button" class="obs-sim-menu-button">Docks</button>
            <button type="button" class="obs-sim-menu-button">Profile</button>
            <button type="button" class="obs-sim-menu-button">Scene Collection</button>
            <button type="button" class="obs-sim-menu-button">Tools</button>
            <button type="button" class="obs-sim-menu-button">Help</button>
          </div>
          <div class="obs-sim-menubar-spacer"></div>
          <div class="obs-sim-profile">Colorway</div>
        </div>

        <div class="obs-sim-canvas-area" data-canvas-area>
          <div class="obs-sim-canvas-pane obs-sim-preview-pane">
            <div class="obs-sim-canvas-label">Preview</div>
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
            <div class="obs-sim-canvas-label">Program</div>
            <div class="obs-sim-canvas-frame program">
              <div class="obs-sim-canvas-content">
                <div class="obs-sim-scene-art">
                  <span class="obs-sim-scene-kicker">PROGRAM</span>
                  <strong>Main</strong>
                  <small>Live output</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="obs-sim-docks-row">
          <div class="obs-sim-dock-slot scenes">
            ${dock('Scenes', listRows(sceneNames, 'scene'), sceneFooter)}
          </div>
          <div class="obs-sim-dock-slot sources">
            ${dock('Sources', listRows(sourceNames, 'source'), sourceFooter)}
          </div>
          <div class="obs-sim-dock-slot mixer">
            ${dock('Audio Mixer', `
              <div class="obs-sim-mixer">
                ${mixerChannel('Desktop Audio', 74, 76)}
                ${mixerChannel('Mic/Aux', 56, 64)}
              </div>
            `, `<span class="obs-sim-mixer-footer-label">Advanced Audio Properties</span><button type="button" class="obs-sim-footer-button">⚙</button>`)}
          </div>
          <div class="obs-sim-dock-slot transitions">
            ${dock('Scene Transitions', `
              <label class="obs-sim-field-label" for="obs-transition-select">Transition</label>
              <select id="obs-transition-select" class="obs-sim-select">
                <option>Fade</option>
                <option>Cut</option>
                <option>Swipe</option>
              </select>
              <label class="obs-sim-field-label" for="obs-transition-duration">Duration</label>
              <div class="obs-sim-duration-row">
                <input id="obs-transition-duration" class="obs-sim-input" value="300 ms" />
                <button type="button" class="obs-sim-mini-button">⚙</button>
              </div>
            `)}
          </div>
          <div class="obs-sim-dock-slot controls">
            ${controlsDock()}
          </div>
        </div>

        <div class="obs-sim-statusbar">
          <div class="obs-sim-status-left">
            <span data-stream-status>LIVE: 00:00:00</span>
            <span data-record-status>REC: 00:00:00</span>
          </div>
          <div class="obs-sim-status-right">
            <span>CPU: 2.1%</span>
            <span>60.00 fps</span>
            <span class="obs-sim-status-health"><i></i> 0 kb/s</span>
          </div>
        </div>

        <div class="obs-sim-dialog-backdrop" data-settings-dialog hidden>
          <section class="obs-sim-dialog" role="dialog" aria-modal="true" aria-labelledby="obs-settings-title">
            <div class="obs-sim-dialog-titlebar">
              <strong id="obs-settings-title">Settings</strong>
              <button type="button" class="obs-sim-dialog-close" data-close-settings aria-label="Close settings">×</button>
            </div>
            <div class="obs-sim-dialog-content">
              <nav class="obs-sim-settings-nav" aria-label="Settings categories">
                <button type="button" class="selected">General</button>
                <button type="button">Stream</button>
                <button type="button">Output</button>
                <button type="button">Audio</button>
                <button type="button">Video</button>
                <button type="button">Hotkeys</button>
                <button type="button">Accessibility</button>
                <button type="button">Advanced</button>
              </nav>
              <div class="obs-sim-settings-panel">
                <h3>General</h3>
                <div class="obs-sim-form-grid">
                  <label>Language <select class="obs-sim-select"><option>English</option></select></label>
                  <label>Theme <select class="obs-sim-select"><option>Colorway</option></select></label>
                  <label class="obs-sim-check"><input type="checkbox" checked /> Automatically check for updates on startup</label>
                  <label class="obs-sim-check"><input type="checkbox" /> Open stats dialog on startup</label>
                  <label class="obs-sim-check disabled"><input type="checkbox" disabled /> Disabled option for contrast testing</label>
                </div>
              </div>
            </div>
            <div class="obs-sim-dialog-actions">
              <button type="button" class="obs-sim-control" data-close-settings>Cancel</button>
              <button type="button" class="obs-sim-control">Apply</button>
              <button type="button" class="obs-sim-control primary" data-close-settings>OK</button>
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}

function toggleControl(button, active, activeText, idleText) {
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
  button.textContent = active ? activeText : idleText;
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
    });
  });

  root.querySelectorAll('[data-source-action]').forEach((action) => {
    const toggle = () => {
      const pressed = action.getAttribute('aria-pressed') === 'true';
      action.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      action.classList.toggle('active', !pressed);
      if (action.dataset.sourceAction === 'visible') {
        action.textContent = pressed ? '○' : '◉';
      } else {
        action.textContent = pressed ? '◇' : '◆';
      }
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
      button.textContent = muted ? 'M' : '×';
      const channel = button.closest('.obs-sim-mixer-channel');
      channel?.classList.toggle('muted', !muted);
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
    const status = root.querySelector('[data-stream-status]');
    const health = root.querySelector('.obs-sim-status-health');
    if (status) status.classList.toggle('on', streaming);
    if (health) health.innerHTML = streaming ? '<i></i> 5987 kb/s' : '<i></i> 0 kb/s';
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
  root.querySelector('[data-open-settings]')?.addEventListener('click', () => {
    if (dialog) dialog.hidden = false;
  });
  root.querySelectorAll('[data-close-settings]').forEach((button) => {
    button.addEventListener('click', () => {
      if (dialog) dialog.hidden = true;
    });
  });
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.hidden = true;
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
