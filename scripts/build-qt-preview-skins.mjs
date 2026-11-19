import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {referenceCatalog, referencePayload, themeLayers} from './build-qt-reference-atlas.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export function skinDigest(catalog,file) {
  const hash=createHash('sha256');
  for (const layer of themeLayers(catalog,file)) hash.update(layer.source).update('\0');
  for (const name of ['qt-preview-skins.py','qt-preview-reference.py','qt_theme.py'])
    hash.update(readFileSync(join(root,'scripts',name))).update('\0');
  // SVG assets are inputs to the painted checkbox and combo primitives.
  const assets = ['normal','selected','spin'].flatMap(folder => {
    const dir=join(root,'icons/colorway/mingcute',folder);
    return readdirSync(dir).filter(name=>name.endsWith('.svg')).sort().map(name=>join(dir,name));
  });
  for(const path of assets) hash.update(readFileSync(path)).update('\0');
  return hash.digest('hex');
}

function main() {
  const {values}=parseArgs({options:{theme:{type:'string',multiple:true}, output:{type:'string'}}});
  const catalog=referenceCatalog();
  const files=values.theme || [...catalog.keys()].filter(f=>f.endsWith('.ovt'));
  const output=resolve(values.output || join(tmpdir(),'colorway-qt-skins'));
  for(const file of files) themeLayers(catalog,file);
  mkdirSync(output,{recursive:true});
  const temp=mkdtempSync(join(tmpdir(),'colorway-native-atlas-'));
  try {
  for(const file of files){
    const result=spawnSync(process.env.COLORWAY_QT_PYTHON||'/usr/bin/python3',
      [join(root,'scripts/qt-preview-skins.py')],{input:JSON.stringify(referencePayload(catalog,file)),encoding:'utf8',timeout:15000});
    if(result.status!==0) throw Error(file+': '+(result.error||result.stderr));
    const atlas=spawnSync(process.env.COLORWAY_QT_PYTHON||'/usr/bin/python3',
      [join(root,'scripts/qt-preview-reference.py'),'--output',temp,'--atlas-only','--format','webp'],
      {input:JSON.stringify(referencePayload(catalog,file)),encoding:'utf8',timeout:15000});
    if(atlas.status!==0)throw Error(file+' atlas: '+(atlas.error||atlas.stderr));
    const image=readFileSync(join(temp,'atlas.webp'));
    const pack={file,sourceDigest:skinDigest(catalog,file),atlasSha256:createHash('sha256').update(image).digest('hex'),...JSON.parse(result.stdout)};
    writeFileSync(join(output,file+'.webp'),image);
    writeFileSync(join(output,file+'.json'),JSON.stringify(pack)+'\n');
    console.log(file);
  }
  } finally {rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
