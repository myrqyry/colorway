import './styles.css';
import { THEMES } from './theme-catalog.js';
import { applyTheme, loadTheme } from './theme-loader.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="min-h-screen bg-[var(--bg_window)] text-[var(--text)]">
    <label class="block p-4 text-xs uppercase tracking-wide text-[var(--text_muted)]" for="theme-select">
      Theme
    </label>
    <select id="theme-select" class="mx-4 bg-[var(--input_bg)] p-2 text-[var(--text)]"></select>
    <p id="theme-status" class="p-4 text-[var(--text_muted)]">Loading themes...</p>
  </main>
`;

const select = document.querySelector('#theme-select');
const status = document.querySelector('#theme-status');

for (const theme of THEMES) {
  const option = document.createElement('option');
  option.value = theme.file;
  option.textContent = theme.name;
  option.selected = theme.file === 'Colorway-CatppuccinMocha.ovt';
  select.appendChild(option);
}

async function setTheme(file) {
  status.textContent = 'Loading theme...';
  try {
    const theme = await loadTheme(file);
    applyTheme(theme);
    status.textContent = theme._name ? `Loaded ${theme._name}` : `Loaded ${file}`;
  } catch (error) {
    status.textContent = error.message;
  }
}

select.addEventListener('change', () => setTheme(select.value));
setTheme(select.value);
