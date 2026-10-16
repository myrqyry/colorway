// OBSApp_Themes.cpp consumes one lexical value in @OBSThemeVars.
// Function-like strings must therefore be quoted (unlike var(), calc(), and hex).
// Keep browser/editor representations unquoted: this codec is the disk boundary.
export function encodeObsFunctionValue(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return /^(?:url|rgba)\([^;\r\n]*\)$/.test(trimmed) ? `'${trimmed}'` : value;
}

export function decodeObsFunctionValue(value) {
  if (typeof value !== 'string') return value;
  const match = value.trim().match(/^(['"])((?:url|rgba)\([^;\r\n]*\))\1$/);
  return match ? match[2] : value;
}

// Rewrite only actual declarations inside OBSThemeVars. Ignore all block
// comments verbatim; some palette reference comments are legally frozen.
export function quoteObsThemeFunctions(source) {
  return source.replace(/(@OBSThemeVars\s*\{)([\s\S]*?)(\n\})/, (_all, open, body, close) => {
    const updated = body.replace(
      /\/\*[\s\S]*?\*\/|(^[ \t]*--[\w-]+:[ \t]*)(url\([^\r\n;]*\)|rgba\([^\r\n;]*\))([ \t]*;)/gm,
      (whole, prefix, expression, end) =>
        prefix ? prefix + encodeObsFunctionValue(expression) + end : whole,
    );
    return open + updated + close;
  });
}
