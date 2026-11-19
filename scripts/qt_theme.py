"""Shared offscreen adapter for Colorway QSS (not the OBS parser)."""
import re


def compose_qss(payload):
    variables = {'--obsFontScale': '10', '--obsPadding': str(payload.get('obsPadding', 4))}
    css = []
    for source in [payload['base'], payload.get('variant', '')]:
        source = re.sub(r'/\*.*?\*/', '', source, flags=re.S)
        block = re.search(r'@OBSThemeVars\s*\{(.*?)\}', source, re.S)
        if block:
            variables.update(dict(re.findall(r'(--\w+):\s*([^;]+);', block[1])))
        css.append(re.sub(r'@OBSTheme(?:Meta|Vars)\s*\{.*?\}', '', source, flags=re.S))

    # Match OBSApp_Themes.cpp: quoted function values become raw QSS strings.
    # Preserve any other string tokens and the authored QSS unchanged.
    for name, value in list(variables.items()):
        if value.startswith(("'url(", "'rgba(", '"url(', '"rgba(')) and value[-1] == value[0]:
            variables[name] = value[1:-1]


    def evaluate(value, trail=()):
        value = value.strip()
        alias = re.fullmatch(r'var\((--\w+)\)', value)
        if alias:
            key = alias[1]
            assert key not in trail, ('cycle', trail, key)
            return evaluate(variables[key], trail + (key,))
        math = re.fullmatch(r'(calc|min|max)\((.*)\)', value)
        if not math:
            return value
        depth = 0
        for i, char in enumerate(math[2]):
            depth += (char == '(') - (char == ')')
            if depth == 0 and char in '+-*/,':
                left = evaluate(math[2][:i], trail)
                right = evaluate(math[2][i + 1:], trail)
                number = r'(-?[\d.]+)(\w*)'
                a, b = re.fullmatch(number, left), re.fullmatch(number, right)
                assert a and b, (value, left, right)
                assert not a[2] or not b[2] or a[2] == b[2], (left, right)
                x, y = float(a[1]), float(b[1])
                if math[1] == 'min': result = min(x, y)
                elif math[1] == 'max': result = max(x, y)
                elif char == '+': result = x + y
                elif char == '-': result = x - y
                elif char == '*': result = x * y
                else: result = x / y
                suffix = a[2] or b[2]
                return f'{result:g}{suffix}'
        raise AssertionError(('invalid math', value))

    def token(key):
        return evaluate(variables[key], (key,))

    qss = re.sub(r'var\((--\w+)\)', lambda m: token(m[1]), '\n'.join(css))
    assert 'var(' not in qss
    return qss, token
