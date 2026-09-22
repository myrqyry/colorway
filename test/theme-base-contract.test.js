import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TEST_DIR, '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const base = read('themes/Colorway.obt');

test('source and public theme distributions are byte-identical', () => {
  const sourceDir = join(ROOT, 'themes');
  const publicDir = join(ROOT, 'public', 'themes');
  const sourceFiles = readdirSync(sourceDir)
    .filter((name) => /\.(?:obt|ovt)$/.test(name))
    .sort();
  const publicFiles = readdirSync(publicDir)
    .filter((name) => /\.(?:obt|ovt)$/.test(name))
    .sort();

  assert.deepEqual(publicFiles, sourceFiles);

  for (const file of sourceFiles) {
    assert.equal(
      readFileSync(join(sourceDir, file), 'utf8'),
      readFileSync(join(publicDir, file), 'utf8'),
      `public/themes/${file} drifted from themes/${file}`,
    );
  }
});

test('Colorway covers current OBS widget hooks without dropping legacy compatibility', () => {
  for (const selector of [
    '.btn-mute.mute-warning',
    '.btn-create-new',
    'QToolButton:checked',
    'QMenu > QMenu',
    'QTableView::indicator',
    'idian--ListHeader',
    'idian--RowList',
    'idian--RowInfo',
    'idian--CollapsibleGroup',
    'idian--InlineButton',
  ]) {
    assert.ok(base.includes(selector), `missing current OBS hook: ${selector}`);
  }

  for (const legacy of [
    '.btn-mute.mute-unassigned',
    'idian--Group',
    'idian--PropertiesList',
    'idian--CollapsibleRow',
  ]) {
    assert.ok(base.includes(legacy), `legacy compatibility disappeared: ${legacy}`);
  }
});

test('live and recording controls inherit each variant semantic colors', () => {
  assert.match(base, /--live:\s*var\(--primary\);/);
  assert.match(base, /--recording:\s*var\(--danger\);/);
  assert.match(base, /--live_bg_start:\s*var\(--accent_bg_start\);/);
  assert.doesNotMatch(base, /rgba\(56,\s*189,\s*248/);
  assert.doesNotMatch(base, /rgba\(251,\s*77,\s*93/);
});

test('current input sizing and tab placement guards are present', () => {
  assert.match(base, /--spinbox_min_width:/);
  assert.match(base, /min-width:\s*var\(--spinbox_min_width\);/);
  assert.match(base, /QTabBar::top/);
  assert.match(base, /QTabBar::bottom/);
});
