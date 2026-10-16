import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { buildThemePackage } from '../src/theme-package.js';

const root = new URL('../', import.meta.url);
const variant = 'Colorway-CatppuccinLatte-Teal.ovt';
const realAssets = async (url) => {
  try { return new Response(readFileSync(new URL('public' + url, root))); }
  catch { return new Response('', { status: 404 }); }
};

for (const includeBase of [true, false]) {
  test(`ZIP preserves the install layout and bytes (include base: ${includeBase})`, async () => {
    const zip = unzipSync(await buildThemePackage(variant, includeBase, realAssets));
    assert.equal(Object.hasOwn(zip, 'themes/Colorway.obt'), includeBase);
    assert.equal(strFromU8(zip['themes/' + variant]), readFileSync(new URL('themes/' + variant, root), 'utf8'));
    const manifest = JSON.parse(readFileSync(new URL('public/theme-assets.json', root), 'utf8'));
    assert.equal(Object.keys(zip).length, manifest.length + (includeBase ? 3 : 2));
    for (const path of manifest) {
      const target = path.startsWith('fonts/') ? path : 'themes/' + path;
      assert.deepEqual(Buffer.from(zip[target]), readFileSync(new URL(path, root)), target);
    }
    assert.ok(zip['themes/patterns/pattern.svg']);
    assert.ok(zip['themes/icons/colorway/mingcute/normal/check.svg']);
    assert.ok(zip['themes/icons/colorway/mingcute/selected/check.svg']);
    assert.match(strFromU8(zip['INSTALL.md']), /OS font/);
    assert.ok(zip['fonts/OFL.txt']);
  });
}

test('missing assets fail the whole package instead of downloading a partial success', async () => {
  await assert.rejects(buildThemePackage(variant, true, async (url) => url.endsWith('/normal/eye.svg')
    ? new Response('', { status: 404 }) : realAssets(url)), /normal\/eye.svg: HTTP 404/);
});

test('unsafe filenames and manifest entries never become archive paths', async () => {
  await assert.rejects(buildThemePackage('../Colorway-test.ovt', true, realAssets), /Invalid Colorway variant/);
  await assert.rejects(buildThemePackage(variant, true, async (url) => url === '/theme-assets.json'
    ? Response.json(['icons/colorway/mingcute/../../outside.svg']) : realAssets(url)), /Invalid theme asset manifest/);
});
