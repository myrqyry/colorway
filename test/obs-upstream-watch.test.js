import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractParserTokens,
  extractQssSelectors,
  extractThemeVars,
  setDelta,
} from '../scripts/check-obs-upstream.mjs';

test('upstream checker extracts OBS vars without confusing QSS properties', () => {
  const sample = `
@OBSThemeMeta {
  name: 'Example';
}
@OBSThemeVars {
  --primary: #fff;
  --input_bg: #000;
}
QPushButton {
  color: var(--primary);
}
`;
  assert.deepEqual([...extractThemeVars(sample)].sort(), ['--input_bg', '--primary']);
});

test('upstream checker normalizes and splits QSS selector lists', () => {
  const sample = `
@OBSThemeVars {
  --primary: #fff;
}
QPushButton,
QToolButton:hover {
  color: var(--primary);
}
idian--Row .description {
  color: var(--primary);
}
`;
  assert.deepEqual(
    [...extractQssSelectors(sample)].sort(),
    ['QPushButton', 'QToolButton:hover', 'idian--Row .description'].sort(),
  );
});

test('upstream checker detects parser-token and set drift deterministically', () => {
  const before = 'if (cf_token_is(cfp, "calc")) {}';
  const after = 'if (cf_token_is(cfp, "calc")) {} if (cf_token_is(cfp, "max")) {}';

  assert.deepEqual([...extractParserTokens(before)], ['calc']);
  assert.deepEqual([...extractParserTokens(after)].sort(), ['calc', 'max']);
  assert.deepEqual(
    setDelta(new Set(['a', 'b']), new Set(['b', 'c'])),
    { added: ['c'], removed: ['a'] },
  );
});
