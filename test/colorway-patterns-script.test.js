import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PATTERNS } from '../src/theme-catalog.js';

const lua = '/usr/bin/cc';
const script = resolve('obs-companion/colorway-patterns.lua');
const flagCheck = spawnSync('pkg-config', ['--cflags', '--libs', 'luajit'], { encoding:'utf8' });
const available = flagCheck.status === 0 && spawnSync('cc', ['--version'], { encoding:'utf8' }).status === 0;

test('OBS Lua pattern names stay in sync with real Colorway assets', () => {
  const text = readFileSync(script,'utf8');
  for (const {file} of PATTERNS) {
    assert.ok(text.includes('"' + file + '"'), 'missing pattern '+file);
  }
  assert.equal((text.match(/file = "/g)||[]).length, PATTERNS.length, 'no unofficial pattern aliases');
  assert.doesNotMatch(text, /os\.execute|io\.popen|obs_frontend_set_theme/, 'no shell commands or unsupported frontend actions');
});

test('real LuaJIT script applies, restores, rejects traversal, and preserves existing user files', { skip:!available }, () => {
  const temp = mkdtempSync(join(tmpdir(),'colorway-lua-'));
  try {
    const themeDir = join(temp, 'config/obs-studio/themes');
    const patterns = join(themeDir, 'patterns');
    mkdirSync(patterns,{recursive:true});
    for(const {file} of PATTERNS) copyFileSync(resolve('patterns',file),join(patterns,file));
    copyFileSync(resolve('themes/Colorway.obt'),join(themeDir,'Colorway.obt'));
    const baseOrig = readFileSync(join(themeDir,'Colorway.obt'));
    const orig = readFileSync(join(patterns,'pattern.svg'));
    writeFileSync(join(temp,'config/obs-studio/user.ini'),'[Appearance]\nTheme=com.myrqyry.Colorway.Everforest.Hard\nAutoReload=false\n');
    const harness = String.raw`
local logs = {}
obslua = {
  OBS_LOG_INFO=200, LOG_INFO=200, LOG_WARNING=300, LOG_ERROR=400,
  OBS_PATH_DIRECTORY=2, OBS_COMBO_TYPE_LIST=0, OBS_COMBO_FORMAT_STRING=0,
  OBS_TEXT_INFO=4,
  obs_data_get_string=function(settings,key) return settings[key] or "" end,
  obs_data_set_default_string=function(settings,key,val) if settings[key]==nil then settings[key]=val end end,
  obs_data_set_string=function(settings,key,val) settings[key]=val end,
  obs_properties_create=function() return {} end,
  obs_properties_add_path=function(p,...) return {} end,
  obs_properties_add_list=function(p,...) return {} end,
  obs_property_list_add_string=function(p,...) return true end,
  obs_properties_add_button=function(p,...) return {} end,
  obs_properties_add_text=function(p,...) return {} end,
  script_log=function(level,msg) logs[#logs+1]=msg end,
}
dofile(arg[1])
local config = { themes_dir=arg[2],pattern="tiny-checkers.svg" }
script_defaults(config)
script_update(config)
script_properties()
assert(script_apply(nil,nil) == true)
local f=assert(io.open(arg[2].."/patterns/pattern.svg","rb"))
local chosen=f:read("*a");f:close()
f=assert(io.open(arg[2].."/patterns/tiny-checkers.svg","rb"));assert(chosen==f:read("*a"));f:close()
f=assert(io.open(arg[2].."/patterns/.colorway-original.svg","rb"));local original=f:read("*a");f:close()
config.pattern="../user.ini"
script_update(config)
assert(script_apply(nil,nil) == false)
f=assert(io.open(arg[2].."/patterns/pattern.svg","rb"));assert(f:read("*a")==chosen);f:close()
config.pattern="pixel-dots.svg"
script_update(config)
assert(script_apply(nil,nil) == true)
assert(script_restore(nil,nil) == true)
f=assert(io.open(arg[2].."/patterns/pattern.svg","rb"));assert(f:read("*a")==original);f:close()
-- Opted-in OBS auto-reload must touch the same base contents, never re-write user.ini.
local ini=assert(io.open(os.getenv("XDG_CONFIG_HOME").."/obs-studio/user.ini","wb"))
ini:write("[Appearance]\nTheme=com.myrqyry.Colorway.Everforest.Hard\nAutoReload=true\n")
ini:close()
config.pattern="bamboo.svg"
script_update(config)
assert(script_apply(nil,nil)==true)
assert(config.message:find("requested OBS theme reload",1,true),config.message)
assert(script_restore(nil,nil)==true)
f=assert(io.open(arg[2].."/patterns/pattern.svg","rb"));assert(f:read("*a")==original);f:close()
print("LUA_FILE_IO_PASS")
`;
    const runner=join(temp,'runner.lua');
    writeFileSync(runner,harness);
    const binary=join(temp,'lua-runner');
    const compile=spawnSync('cc',[resolve('test/helpers/lua-runner.c'),'-o',binary,...flagCheck.stdout.trim().split(/\s+/)],{encoding:'utf8'});
    assert.equal(compile.status,0,compile.stderr);
    const run=spawnSync(binary,[runner,script,themeDir],{
      encoding:'utf8', env:{...process.env, XDG_CONFIG_HOME:join(temp,'config')},timeout:15000
    });
    assert.equal(run.status,0,run.stderr+'\n'+run.stdout);
    assert.match(run.stdout,/LUA_FILE_IO_PASS/);
    assert.deepEqual(readFileSync(join(patterns,'pattern.svg')),orig,'restored exact original SVG');
    assert.deepEqual(readFileSync(join(themeDir,'Colorway.obt')),baseOrig,'no theme QSS mutation unless autoreload explicitly enabled');
    assert.match(readFileSync(join(temp,'config/obs-studio/user.ini'),'utf8'),/AutoReload=true/);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});
