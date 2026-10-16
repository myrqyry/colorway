import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('installing companion preserves user files and never changes OBS settings', () => {
  const temp=mkdtempSync(join(tmpdir(),'colorway-companion-install-'));
  try {
    const config=join(temp,'obs-studio');
    const target=join(config,'colorway-companion');
    mkdirSync(config,{recursive:true});
    const ini=join(config,'user.ini');
    const before='[Appearance]\nTheme=com.myrqyry.Colorway.Everforest.Hard\n';
    writeFileSync(ini,before);
    const install=()=>spawnSync('bash',[resolve('scripts/install-obs-companion.sh'),target],{encoding:'utf8'});
    let r=install();assert.equal(r.status,0,r.stderr);
    for(const name of ['colorway-patterns.lua','colorway-preview.html','README.md']){
      assert.deepEqual(readFileSync(join(target,name)),readFileSync(resolve('obs-companion',name)));
    }
    assert.equal(readFileSync(ini,'utf8'),before);
    assert.equal(existsSync(join(config,'basic/scripts.json')),false,'do not silently activate Lua in OBS');

    const customized='My custom companion notes\n';
    writeFileSync(join(target,'README.md'),customized);
    r=install();assert.equal(r.status,0,r.stderr);
    const previous=readdirSync(join(target,'.previous'));
    assert.equal(previous.length,1);
    assert.ok(previous[0].startsWith('README.md.'));
    assert.equal(readFileSync(join(target,'.previous',previous[0]),'utf8'),customized);
    assert.deepEqual(readFileSync(join(target,'README.md')),readFileSync(resolve('obs-companion/README.md')));
    assert.equal(readFileSync(ini,'utf8'),before);

    const link=join(temp,'symlink');
    symlinkSync(target,link);
    const denied=spawnSync('bash',[resolve('scripts/install-obs-companion.sh'),link],{encoding:'utf8'});
    assert.notEqual(denied.status,0,'installation must not traverse symlink destination');
  } finally{ rmSync(temp,{recursive:true,force:true}); }
});
