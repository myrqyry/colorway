#!/usr/bin/env bash
# Linux-only native OBS/Qt integration gate. Never uses ~/.config/obs-studio.
set -euo pipefail
cd "$(dirname "$0")/.."

for command in obs xvfb-run c++ pkg-config python3; do
  command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 2; }
done
pkg-config --exists Qt6Widgets || { echo 'Qt6Widgets headers missing' >&2; exit 2; }

sandbox="$(mktemp -d "${TMPDIR:-/tmp}/colorway-native-XXXXXX")"
trap 'rm -rf "$sandbox"' EXIT

c++ -shared -fPIC test/helpers/obs-qt-style-trace.cpp -o "$sandbox/qss-trace.so" \
  $(pkg-config --cflags --libs Qt6Widgets) -ldl
# Every asset OBS might resolve is copied into the isolated theme search root.
mkdir -p "$sandbox/shared/icons/colorway" "$sandbox/shared/patterns"
cp -a icons/colorway/mingcute "$sandbox/shared/icons/colorway/"
cp patterns/*.svg "$sandbox/shared/patterns/"

check_theme() {
  local name="$1" id="$2" expected="$3"
  local ink='#e0def4' active_ink='#191724'
  case "$name" in
    latte|silkpukian) ink='#191724'; active_ink='#e0def4' ;;
    fairyfloss) active_ink='#e0def4' ;;
  esac
  local cfg="$sandbox/$name"
  mkdir -p "$cfg/obs-studio/themes/icons/colorway" "$cfg/obs-studio/themes/patterns"
  cp themes/Colorway.obt "$cfg/obs-studio/themes/"
  case "$name" in
    latte) cp themes/Colorway-CatppuccinLatte-Blue.ovt "$cfg/obs-studio/themes/" ;;
    monokai) cp themes/Colorway-Monokai.ovt "$cfg/obs-studio/themes/" ;;
    fairyfloss) cp themes/Colorway-Fairyfloss.ovt "$cfg/obs-studio/themes/" ;;
    ninety) cp themes/Colorway-90sAnime.ovt "$cfg/obs-studio/themes/" ;;
    screenburn) cp themes/Colorway-ScreenBurnMonitor.ovt "$cfg/obs-studio/themes/" ;;
    silkpukian) cp themes/Colorway-Silkpukian24.ovt "$cfg/obs-studio/themes/" ;;
    olives) cp themes/Colorway-OminousOlives.ovt "$cfg/obs-studio/themes/" ;;
    fogfire) cp themes/Colorway-Fogfire.ovt "$cfg/obs-studio/themes/" ;;
    vanitas) cp themes/Colorway-Vanitas.ovt "$cfg/obs-studio/themes/" ;;
    pumpkin) cp themes/Colorway-PumpkinBrew.ovt "$cfg/obs-studio/themes/" ;;
  esac
  cp -a "$sandbox/shared/icons/colorway/mingcute" "$cfg/obs-studio/themes/icons/colorway/"
  cp "$sandbox/shared/patterns/"*.svg "$cfg/obs-studio/themes/patterns/"
  # OBS 32.2 reads Appearance.Theme from user.ini, not global.ini.
  # A newly created config has no [Locations] overrides to escape this sandbox.
  printf '[Appearance]\nTheme=%s\nFontScale=10\nDensity=%s\n' "$id" "${COLORWAY_NATIVE_DENSITY:-1}" > "$cfg/obs-studio/user.ini"

  local capture="$sandbox/$name.qss" log="$sandbox/$name.log"
  local expected_icons
  expected_icons="$(node --input-type=module - "$name" <<'JS'
import { readFileSync } from 'node:fs';
import { parseOVT } from './src/theme-loader.js';
import { stateTokens, resolveAlias } from './scripts/theme-state-tokens.mjs';
const parse = file => parseOVT(readFileSync('themes/' + file, 'utf8').replace(/\/\*[^]*?\*\//g, '')).vars;
const variant = { latte: 'Colorway-CatppuccinLatte-Blue.ovt', monokai: 'Colorway-Monokai.ovt', fairyfloss: 'Colorway-Fairyfloss.ovt', ninety: 'Colorway-90sAnime.ovt', screenburn: 'Colorway-ScreenBurnMonitor.ovt', silkpukian: 'Colorway-Silkpukian24.ovt', olives: 'Colorway-OminousOlives.ovt', fogfire: 'Colorway-Fogfire.ovt', vanitas: 'Colorway-Vanitas.ovt', pumpkin: 'Colorway-PumpkinBrew.ovt' }[process.argv[2]];
const vars = new Map(Object.entries({ ...parse('Colorway.obt'), ...(variant ? parse(variant) : {}) }));
const tokens = stateTokens(vars);
const result = { background: resolveAlias(vars, '--bg_base'), windowBackground: resolveAlias(vars, '--bg_window'), sliderInk: resolveAlias(vars, '--text_bright') };
for (const [key, token] of Object.entries({ unmuted: '--cw_icon_volume_high_base', monitorOff: '--cw_icon_headphone_off_base', muted: '--cw_mixer_muted', monitor: '--cw_mixer_monitor', warning: '--cw_mixer_warning', 'zoom-plus': '--cw_zoom_plus', 'zoom-minus': '--cw_zoom_minus' })) result[key] = tokens.get(token).slice(10, -1);
console.log(JSON.stringify(result));
JS
)"
  xvfb-run -a -s '-screen 0 1280x900x24' bash -c '
    export XDG_CONFIG_HOME="$1" QT_QPA_PLATFORM=xcb LIBGL_ALWAYS_SOFTWARE=1
    export QT_XCB_GL_INTEGRATION=none
    export LD_PRELOAD="$2" COLORWAY_QSS_CAPTURE="$3"
    export COLORWAY_CONTEXT_CAPTURE="$5" COLORWAY_CONTEXT_INK="$6" COLORWAY_CONTEXT_ACTIVE_INK="$7"
    export COLORWAY_SOURCE_CAPTURE="$5.sources"
    export COLORWAY_MIXER_CAPTURE="$5.mixer" COLORWAY_MIXER_EXPECTED="$8" COLORWAY_NATIVE_ASSETS="$1/obs-studio/themes"
    obs --multi --safe-mode --disable-missing-files-check >"$4" 2>&1 &
    process=$!
    trap "kill $process 2>/dev/null || true; wait $process 2>/dev/null || true" EXIT
    sleep 8
    if ! kill -0 "$process" 2>/dev/null; then
      echo "OBS terminated before the native smoke gate completed" >&2
      exit 1
    fi
  ' _ "$cfg" "$sandbox/qss-trace.so" "$capture" "$log" "$sandbox/$name.context" "$ink" "$active_ink" "$expected_icons"

  python3 - "$capture" "$log" "$expected" "$name" <<'PY'
import sys, re
from pathlib import Path
qss, log, expected, name = sys.argv[1:]
captured = Path(qss)
assert captured.is_file(), (name, "QApplication never received a stylesheet", Path(log).read_text()[-900:])
s = captured.read_text()
assert len(s) > 50000, (name, "unexpectedly short stylesheet", len(s))
assert s.count("url(theme:icons/colorway/mingcute/") > 100, (name, "MingCute not in Qt stylesheet")
assert "url(theme:patterns/" in s, (name, "theme pattern paths missing")
assert expected in s, (name, "selected variant palette did not reach Qt", expected)
assert not re.search(r"var\(--[A-Za-z0-9_]+\)", s), (name, "unresolved OBS variable")
assert "'url(theme:" not in s, (name, "OBS did not strip lexical quotes")
log_text = Path(log).read_text()
assert not re.search(r'Loading theme .* failed|Invalid calc\(\)|Maximum recursion levels hit',
                     log_text, re.I), (name, "OBS rejected theme variable")
print(f"PASS native OBS {name}: {len(s)} QSS bytes, {s.count('url(theme:icons/colorway/mingcute/')} MingCute references, fully resolved")
context = captured.with_suffix('.context').read_text()
assert 'FAIL' not in context and context.count('PASS ') == 10, (name, context)
print(f"PASS native OBS {name}: Properties/Filters glyph pixels in all five enabled button states")
sources = captured.with_suffix('.context.sources').read_text()
assert 'FAIL' not in sources and sources.count('PASS ') == 2, (name, sources)
print(f"PASS native OBS {name}: visibility/lock indicators fit the actual source row")
mixers = captured.with_suffix('.context.mixer').read_text()
assert 'FAIL' not in mixers and mixers.count('PASS ') == 23, (name, mixers)
print(f"PASS native OBS {name}: 21 mixer glyph/state renders and both pixel-aligned zoom controls")
PY
}

check_theme base 'com.myrqyry.Colorway' '#191724'
check_theme latte 'com.myrqyry.Colorway.CatppuccinLatte.Blue' '#eff1f5'
check_theme monokai 'com.myrqyry.Colorway.Monokai' '#272822'
check_theme fairyfloss 'com.myrqyry.Colorway.Fairyfloss' '#5a5475'
check_theme ninety 'com.myrqyry.Colorway.90sAnime' '#13062b'
check_theme screenburn 'com.myrqyry.Colorway.ScreenBurnMonitor' '#05090f'
check_theme silkpukian 'com.myrqyry.Colorway.Silkpukian24' '#e8ddca'
check_theme olives 'com.myrqyry.Colorway.OminousOlives' '#0c1013'
check_theme fogfire 'com.myrqyry.Colorway.Fogfire' '#1c1820'
check_theme vanitas 'com.myrqyry.Colorway.Vanitas' '#1d1e19'
check_theme pumpkin 'com.myrqyry.Colorway.PumpkinBrew' '#2a1838'
echo 'All isolated OBS/Qt theme selections verified'
