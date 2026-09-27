import { PALETTE_VARS } from '../src/theme-loader.js';

export function buildPaletteComment(themeName, resolvedVars) {
  const hexLines = [];
  const derivedLines = [];

  for (const [varName] of PALETTE_VARS) {
    const value = resolvedVars.get(varName);
    if (!value) continue;

    const line = `       ${varName}: ${value};`;
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
      hexLines.push(line);
    } else {
      derivedLines.push(line);
    }
  }

  const lines = [`    /* Official palette reference: ${themeName}`];
  if (hexLines.length) {
    lines.push('       Hex colors:');
    lines.push(...hexLines);
  }
  if (derivedLines.length) {
    lines.push('       Derived colors:');
    lines.push(...derivedLines);
  }
  lines.push('    */');
  return lines.join('\n');
}

const PALETTE_COMMENT_RE =
  /\/\* Official palette reference(?:\s*\([^)]*\))?:[\s\S]*?\*\//g;
const SOURCE_VALUES_COMMENT_RE =
  /\/\* Official palette reference\s*\(source values; live accessibility overrides below may differ\):[\s\S]*?\*\//;

export function injectCommentBlock(text, commentBlock) {
  return text.replace(/(@OBSThemeVars\s*\{)([\s\S]*?)(\n\})/, (_match, open, body, close) => {
    const sourceValuesComment = body.match(SOURCE_VALUES_COMMENT_RE)?.[0];
    const paletteComment = sourceValuesComment ?? commentBlock;
    const cleanBody = body.replace(PALETTE_COMMENT_RE, '\n').trim();

    return `${open}\n    ${paletteComment.trim()}\n\n    ${cleanBody}\n${close}`;
  });
}
