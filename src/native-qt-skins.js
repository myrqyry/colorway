// Catalog renders are static, same-origin packs. The CSS-only preview remains
// usable while a pack loads, on failure, and for user-imported palettes.
const packs = new Map();
let generation = 0;
let applied = [];
const families = ['field','combo','button','checkbox','radio','slider'];
let atlasFile = null;

function syncAtlas() {
  const details = document.querySelector('[data-qt-atlas]');
  const image = details?.querySelector('[data-qt-atlas-image]');
  if (!image) return;
  details.hidden = !atlasFile;
  if (!details.dataset.atlasWired) {
    details.dataset.atlasWired = 'true';
    details.addEventListener('toggle', syncAtlas);
  }
  if (atlasFile && details.open) {
    const source = '/qt-skins/' + encodeURIComponent(atlasFile) + '.webp';
    if (image.getAttribute('src') !== source) image.setAttribute('src',source);
  } else image.removeAttribute('src');
}


export async function activateNativeSkin(file) {
  const root = document.documentElement;
  const request = ++generation;
  root.removeAttribute('data-colorway-skin');
  atlasFile = null;
  syncAtlas();
  for (const key of applied) root.style.removeProperty(key);
  applied = [];
  if (!file || !/^Colorway-[\w-]+\.ovt$/.test(file)) return false;
  try {
    if (!packs.has(file)) {
      const load = fetch('/qt-skins/' + encodeURIComponent(file) + '.json')
        .then(response => {
          if (!response.ok) throw Error('Native skin HTTP ' + response.status);
          return response.json();
        })
        .catch(error => { packs.delete(file); throw error; });
      packs.set(file, load);
    }
    const pack = await packs.get(file);
    if (request !== generation) return false;
    if (pack.file !== file) throw Error('Unexpected native skin identity');
    const vars = [];
    for (const family of families) {
      for (const state of ['normal','focus','hover','disabled',
        ...(family === 'checkbox' || family === 'radio' ? ['checked','checkedHover','checkedDisabled'] : []),
        ...(family === 'button' || family === 'slider' ? ['pressed'] : [])]) {
        const skin=pack.skins[family][state];
        if (!/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/=]+$/.test(skin.src)
            || !Number.isInteger(skin.width) || !Number.isInteger(skin.height)
            || skin.width<=0 || skin.height<=0) throw Error('Invalid native skin');
        const key='--qt-'+family+'-'+state;
        vars.push([key, 'url("' + skin.src + '")']);
        vars.push([key+'-w',skin.width+'px'],[key+'-h',skin.height+'px']);
      }
    }
    // Decode the normal and state assets before switching paint mode. This
    // also prevents an old request from painting over a newly selected theme.
    await Promise.all(vars.filter(([,value])=>value.startsWith('url(')).map(([,value])=>{
      const image=new Image();
      image.src=value.slice(5,-2);
      return image.decode();
    }));
    if (request !== generation) return false;
    for(const [key,value] of vars) {
      root.style.setProperty(key,value);
      applied.push(key);
    }
    root.setAttribute('data-colorway-skin',file);
    atlasFile = pack.atlasSha256 ? file : null;
    syncAtlas();
    return true;
  } catch (error) {
    if (request === generation) {
      packs.delete(file);
      console.warn('Native widget skins unavailable; retaining CSS preview:', error.message);
    }
    return false;
  }
}
