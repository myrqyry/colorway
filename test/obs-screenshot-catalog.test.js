import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {THEMES} from '../src/theme-catalog.js';
import {referenceCatalog} from '../scripts/build-qt-reference-atlas.mjs';
import {captureDigest} from '../scripts/build-obs-screenshots.mjs';
test('every catalog theme has an actual OBS screenshot with current source identity',()=>{
  const catalog=referenceCatalog();
  const index=JSON.parse(readFileSync(new URL('../public/obs-renders/index.json',import.meta.url)));
  assert.equal(index.themes.length,THEMES.length);
  assert.deepEqual(new Set(index.themes.map(t=>t.file)),new Set(THEMES.map(t=>t.file)));
  for(const t of index.themes){
    assert.equal(t.sourceDigest,captureDigest(catalog,t.file));
    assert.equal(t.id,catalog.get(t.file).id);
    assert.equal(t.renderer,'OBS Studio');
    assert.ok(t.iconRefs>100 && t.width>=1000 && t.height>=700);
    const image=readFileSync(new URL('../public/obs-renders/'+encodeURIComponent(t.file)+'.webp',import.meta.url));
    assert.equal(image.toString('ascii',8,12),'WEBP');
    assert.equal(createHash('sha256').update(image).digest('hex'),t.sha256);
  }
});
