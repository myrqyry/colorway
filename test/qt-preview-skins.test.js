import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {referenceCatalog, referencePayload} from '../scripts/build-qt-reference-atlas.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const python = process.env.COLORWAY_QT_PYTHON || '/usr/bin/python3';
const available = spawnSync(python,['-c','from PyQt6.QtWidgets import QApplication; from PIL import Image']).status === 0;
test('native skin generation produces verified blank frames, indicator states and slider handles', {skip: !available}, () => {
  const result = spawnSync(python,[join(root,'scripts/qt-preview-skins.py')],{
    input:JSON.stringify(referencePayload(referenceCatalog(),'Colorway-Monokai.ovt')),encoding:'utf8',timeout:15000
  });
  assert.equal(result.status,0,result.stderr+result.stdout);
  const data = JSON.parse(result.stdout);
  for (const family of ['field','combo','button','checkbox','radio','slider']) {
    for (const state of ['normal','hover','disabled']) {
      const skin=data.skins[family][state];
      assert.ok(skin.width>0 && skin.height>0);
      assert.match(skin.src,/^data:image\/(webp|png);base64,/);
      assert.equal(skin.pixelExact,true);
    }
  }
  assert.match(data.skins.field.normal.src,/^data:image\/webp/);
  assert.match(data.skins.combo.normal.src,/^data:image\/webp/);
  assert.match(data.skins.slider.normal.src,/^data:image\/png/);
  for(const name of ['checkbox','radio']) {
    const states=data.skins[name];
    assert.notEqual(states.normal.src,states.checked.src);
    assert.notEqual(states.checked.src,states.checkedDisabled.src);
  }
  assert.notEqual(data.skins.field.normal.src,data.skins.field.focus.src);
  assert.notEqual(data.skins.button.normal.src,data.skins.button.pressed.src);
  assert.notEqual(data.skins.slider.normal.src,data.skins.slider.hover.src);
});

test('optional skin generator writes a reference pack and matching WebP digest', {skip: !available}, async () => {
  const {skinDigest} = await import('../scripts/build-qt-preview-skins.mjs');
  const catalog=referenceCatalog(), file='Colorway-Monokai.ovt';
  const output=mkdtempSync(join(tmpdir(),'colorway-skin-test-'));
  try {
    const result=spawnSync(process.execPath,[join(root,'scripts/build-qt-preview-skins.mjs'),'--theme',file,'--output',output],{encoding:'utf8',timeout:30000});
    assert.equal(result.status,0,result.stderr+result.stdout);
    const pack=JSON.parse(readFileSync(join(output,file+'.json'),'utf8'));
    assert.equal(pack.sourceDigest,skinDigest(catalog,file));
    assert.equal(pack.file,file);
    const atlas=readFileSync(join(output,file+'.webp'));
    assert.equal(atlas.subarray(8,12).toString(),'WEBP');
    assert.equal(pack.atlasSha256,createHash('sha256').update(atlas).digest('hex'));
    assert.ok(pack.skins.combo.normal.src.startsWith('data:image/webp;'));
    assert.ok(pack.skins.checkbox.checked.src.startsWith('data:image/'));
  } finally { rmSync(output,{recursive:true,force:true}); }
});
