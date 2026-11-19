import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, cpSync, readdirSync, symlinkSync} from 'node:fs';
import {spawn, spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {referenceCatalog,themeLayers} from './build-qt-reference-atlas.mjs';
import {parseOVT} from '../src/theme-loader.js';
import {resolveAlias} from './theme-state-tokens.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
export function captureDigest(catalog,file){
  const hash=createHash('sha256');
  const add=(name,bytes)=>hash.update(name).update('\0').update(bytes).update('\0');
  for(const t of themeLayers(catalog,file)) add(t.file,t.source);
  function walk(dir){
    for(const entry of readdirSync(join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const path=join(dir,entry.name);
      if(entry.isDirectory())walk(path);
      else if(entry.name.endsWith('.svg'))add(path,readFileSync(join(root,path)));
    }
  }
  walk('icons/colorway/mingcute');walk('patterns');
  add('capture',readFileSync(join(root,'scripts/obs-screenshot-capture.cpp')));
  return hash.digest('hex');
}
function run(command,args,options={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{...options,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',v=>stdout+=v);
    child.stderr.on('data',v=>stderr+=v);
    child.on('error',reject);
    child.on('close',code=>code===0?resolve(stdout):reject(Error(command+' exit '+code+'\n'+stderr.slice(-3000)+'\n'+stdout.slice(-2000))));
  });
}
async function main(){
  const {values}=parseArgs({options:{theme:{type:'string',multiple:true},output:{type:'string'},jobs:{type:'string',default:'3'}}});
  const catalog=referenceCatalog();
  if(values.theme && !values.output)throw Error('A partial catalog requires --output outside the deployed catalog');
  const files=[...new Set(values.theme || [...catalog.keys()].filter(f=>f.endsWith('.ovt')))];
  if(values.theme && resolve(values.output)===join(root,'public/obs-renders'))throw Error('Do not replace the complete deployed catalog with a partial capture');
  const jobs=Number(values.jobs);
  if(!Number.isInteger(jobs)||jobs<1||jobs>6)throw Error('Choose 1–6 concurrent captures');
  for(const file of files)themeLayers(catalog,file);
  const output=resolve(values.output||join(root,'public/obs-renders'));
  mkdirSync(output,{recursive:true});
  const temp=mkdtempSync(join(tmpdir(),'colorway-obs-capture-'));
  const shared=join(temp,'themes');
  mkdirSync(join(shared,'icons/colorway'),{recursive:true});
  cpSync(join(root,'icons/colorway/mingcute'),join(shared,'icons/colorway/mingcute'),{recursive:true});
  cpSync(join(root,'patterns'),join(shared,'patterns'),{recursive:true});
  for(const t of catalog.values())writeFileSync(join(shared,t.file),t.source);
  try{
    const flags=spawnSync('pkg-config',['--cflags','--libs','Qt6Widgets'],{encoding:'utf8'});
    if(flags.status!==0)throw Error(flags.stderr);
    const hook=join(temp,'capture.so');
    await run('c++',['-shared','-fPIC',join(root,'scripts/obs-screenshot-capture.cpp'),'-o',hook,...flags.stdout.trim().split(/\s+/),'-ldl']);
    const silence=join(temp,'silence.wav');
    await run('/usr/bin/python3',['-c','import wave,sys; w=wave.open(sys.argv[1],"wb"); w.setparams((1,2,48000,0,"NONE","not compressed")); w.writeframes(bytes(96000)); w.close()',silence]);
    const version=(await run('obs',['--version'])).trim();
    const themes=[];
    let next=0;
    let failure;
    async function worker(){
      while(!failure && next<files.length){
        const file=files[next++];
        const t=catalog.get(file);
        const sandbox=mkdtempSync(join(temp,'session-'));
        const cfg=join(sandbox,'config/obs-studio');
        try{
          for(const dir of ['config/obs-studio','home','cache','data','runtime'])mkdirSync(join(sandbox,dir),{recursive:true,mode:0o700});
          symlinkSync(shared,join(cfg,'themes'),'dir');
          writeFileSync(join(cfg,'user.ini'),'[Appearance]\nTheme='+t.id+'\nFontScale=10\nDensity=1\n[General]\nFirstRun=true\nConfirmOnExit=false\n[Basic]\nConfigOnNewProfile=false\n');
          const vars=new Map(themeLayers(catalog,file).flatMap(t=>Object.entries(parseOVT(t.source).vars)));
          const expected=resolveAlias(vars,'--bg_base');
          const image=join(sandbox,'capture');
          const env={...process.env,HOME:join(sandbox,'home'),XDG_CONFIG_HOME:join(sandbox,'config'),
            XDG_CACHE_HOME:join(sandbox,'cache'),XDG_DATA_HOME:join(sandbox,'data'),XDG_RUNTIME_DIR:join(sandbox,'runtime'),
            QT_QPA_PLATFORM:'xcb',LIBGL_ALWAYS_SOFTWARE:'1',QT_XCB_GL_INTEGRATION:'none',LP_NUM_THREADS:'2'};
          // Isolate the preload to OBS, not Xvfb or shell utilities. Time-limit the session.
          await run('timeout',['-k','5','30','xvfb-run','-a','-s','-screen 0 1280x960x24','env','LD_PRELOAD='+hook,
            'COLORWAY_SILENCE='+silence,'COLORWAY_SCREENSHOT='+image,'COLORWAY_EXPECTED_COLOR='+expected,'obs','--multi','--safe-mode','--disable-missing-files-check'],{env});
          const report=JSON.parse(readFileSync(image+'.json','utf8'));
          const webp=join(sandbox,'capture.webp');
          await run('/usr/bin/python3',['-c',
            'from PIL import Image; import sys; a=Image.open(sys.argv[1]).convert("RGB"); a.save(sys.argv[2],lossless=True,quality=100); assert Image.open(sys.argv[2]).convert("RGB").tobytes()==a.tobytes()',image+'.png',webp]);
          const bytes=readFileSync(webp);
          writeFileSync(join(output,file+'.webp'),bytes);
          themes.push({file,id:t.id,name:t.name,renderer:'OBS Studio',version,sourceDigest:captureDigest(catalog,file),
            ...report,sha256:createHash('sha256').update(bytes).digest('hex')});
          console.log('PASS '+file+' '+report.width+'x'+report.height+' '+bytes.length+' bytes ('+themes.length+'/'+files.length+')');
        }catch(error){failure=Error(file+': '+error.message);console.error(failure.message);}
        finally{rmSync(sandbox,{recursive:true,force:true});}
      }
    }
    await Promise.all(Array.from({length:jobs},worker));
    if(failure)throw failure;
    themes.sort((a,b)=>a.file.localeCompare(b.file));
    writeFileSync(join(output,'index.json'),JSON.stringify({themes},null,2)+'\n');
  }finally{rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
