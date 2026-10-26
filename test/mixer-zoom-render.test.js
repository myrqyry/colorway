import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');
const python = process.env.COLORWAY_QT_PYTHON || '/usr/bin/python3';
const available = spawnSync(python, ['-c', 'import PyQt6.QtWidgets']).status === 0;
const probe = (base, variant, checks) => spawnSync(python,
  [fileURLToPath(new URL('test/helpers/qss-probe.py', root))], {
    input: JSON.stringify({ base, variant, checks, root: fileURLToPath(root), obsPadding: 1 }),
    encoding: 'utf8', timeout: 15000, env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' },
  });

for (const file of [null, 'Colorway-90sAnime.ovt', 'Colorway-Fairyfloss.ovt', 'Colorway-CatppuccinLatte-Blue.ovt']) {
  for (const check of ['mixer', 'zoom']) {
    test(`Qt renders readable ${check} glyphs and distinct native states: ${file || 'base'}`, { skip: !available }, () => {
      const result = probe(read('themes/Colorway.obt'), file ? read('themes/' + file) : '', [check]);
      assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
    });
  }
}

test('mixer/zoom render probes reject dark fallback icons and fractional-pixel zoom paths', { skip: !available }, () => {
  for (const [check, rule, message] of [
    ['mixer', 'QPushButton.btn-mute { icon: url(theme:icons/colorway/mingcute/selected/volume-high.svg); }', 'mixer glyph'],
    ['mixer', 'QPushButton.btn-monitor:checked { icon: var(--cw_icon_headphone_off_base); }', 'mixer glyph'],
    ['mixer', 'QPushButton.btn-mute.mute-warning { icon: var(--cw_mixer_muted); }', 'mixer glyph'],
    ['zoom', 'QPushButton#previewZoomInButton { icon: var(--cw_icon_plus_base); }', 'zoom opaque strokes'],
  ]) {
    const result = probe(read('themes/Colorway.obt') + '\n' + rule, '', [check]);
    assert.notEqual(result.status, 0, 'probe accepted ' + rule);
    assert.match(result.stderr, new RegExp(message));
  }
});
