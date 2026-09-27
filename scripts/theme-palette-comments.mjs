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

export function injectCommentBlock(text, commentBlock) {
  return text.replace(/(@OBSThemeVars\s*\{)([\s\S]*?)(\n\})/, (_match, open, body, close) => {
    const cleanBody = body
      .replace(/\s*\/\* Official palette reference:[\s\S]*?\*\/\s*/, '\n')
      .trim();
    return `${open}\n${commentBlock}\n\n    ${cleanBody}\n${close}`;
  });
}
