import {THEMES} from './theme-catalog.js';

const sorted=[...THEMES].sort((a,b)=>a.name.localeCompare(b.name));
let activeFile=null;
let generation=0;
let panel;

export function mountObsScreenshot(root){
  panel=root.querySelector('[data-obs-capture]');
  if(!panel)return;
  const picker=panel.querySelector('select');
  const search=panel.querySelector('input');
  const select=file=>{
    const row=Array.from(document.querySelectorAll('.theme-row')).find(r=>r.dataset.file===file);
    row?.click();
  };
  function filter(){
    const query=search.value.trim().toLocaleLowerCase();
    const matches=sorted.filter(t=>t.name.toLocaleLowerCase().includes(query));
    picker.replaceChildren(...matches.map(t=>new Option(t.name,t.file)));
    picker.value=activeFile||'';
    panel.querySelector('[data-obs-capture-count]').textContent=matches.length+' / '+sorted.length;
    for(const btn of panel.querySelectorAll('[data-obs-capture-step]'))btn.disabled=!matches.length;
  }
  panel.addEventListener('click',e=>{
    const step=e.target.closest('[data-obs-capture-step]');
    if(!step)return;
    const count=picker.options.length;
    if(!count)return;
    const index=picker.selectedIndex;
    const next=index<0?(Number(step.dataset.obsCaptureStep)>0?0:count-1):(index+Number(step.dataset.obsCaptureStep)+count)%count;
    picker.selectedIndex=next;
    select(picker.value);
  });
  picker.addEventListener('change',()=>select(picker.value));
  search.addEventListener('input',filter);
  search.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&picker.options.length){e.preventDefault();select(picker.options[0].value);}
  });
  filter();
  void presentObsScreenshot(activeFile);
}

export async function presentObsScreenshot(file){
  activeFile=file;
  const request=++generation;
  if(!panel)return;
  const image=panel.querySelector('[data-obs-capture-image]');
  const full=panel.querySelector('[data-obs-capture-full]');
  const status=panel.querySelector('[data-obs-capture-status]');
  const picker=panel.querySelector('select');
  picker.value=file||'';
  image.hidden=true;
  image.removeAttribute('src');
  delete image.dataset.file;
  full.hidden=true;
  full.removeAttribute('href');
  const theme=sorted.find(t=>t.file===file);
  panel.toggleAttribute('data-unavailable',!theme);
  if(!theme){
    status.textContent='Native screenshot unavailable for this imported or generated theme.';
    return;
  }
  status.textContent='Loading '+theme.name+'…';
  const url='/obs-renders/'+encodeURIComponent(file)+'.webp';
  try{
    const decoded=new Image();
    decoded.src=url;
    await decoded.decode();
    if(request!==generation)return;
    if(decoded.naturalWidth!==1280||decoded.naturalHeight!==960)throw Error('Unexpected screenshot dimensions');
    image.src=url;
    image.alt='Actual OBS Studio window rendered with '+theme.name;
    image.dataset.file=file;
    image.hidden=false;
    full.href=url;
    full.hidden=false;
    status.textContent=theme.name+' · Actual OBS capture · default pattern and density';
  }catch{
    if(request===generation)status.textContent='Native screenshot could not be loaded for '+theme.name+'.';
  }
}
