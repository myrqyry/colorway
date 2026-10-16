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
  local cfg="$sandbox/$name"
  mkdir -p "$cfg/obs-studio/themes/icons/colorway" "$cfg/obs-studio/themes/patterns"
  cp themes/Colorway.obt "$cfg/obs-studio/themes/"
  case "$name" in
    latte) cp themes/Colorway-CatppuccinLatte-Blue.ovt "$cfg/obs-studio/themes/" ;;
    monokai) cp themes/Colorway-Monokai.ovt "$cfg/obs-studio/themes/" ;;
  esac
  cp -a "$sandbox/shared/icons/colorway/mingcute" "$cfg/obs-studio/themes/icons/colorway/"
  cp "$sandbox/shared/patterns/"*.svg "$cfg/obs-studio/themes/patterns/"
  # OBS 32.2 reads Appearance.Theme from user.ini, not global.ini.
  # A newly created config has no [Locations] overrides to escape this sandbox.
  printf '[Appearance]\nTheme=%s\nFontScale=10\nDensity=1\n' "$id" > "$cfg/obs-studio/user.ini"

  local capture="$sandbox/$name.qss" log="$sandbox/$name.log"
  xvfb-run -a -s '-screen 0 1280x900x24' bash -c '
    export XDG_CONFIG_HOME="$1" QT_QPA_PLATFORM=xcb LIBGL_ALWAYS_SOFTWARE=1
    export QT_XCB_GL_INTEGRATION=none
    export LD_PRELOAD="$2" COLORWAY_QSS_CAPTURE="$3"
    obs --multi --safe-mode --disable-missing-files-check >"$4" 2>&1 &
    process=$!
    trap "kill $process 2>/dev/null || true; wait $process 2>/dev/null || true" EXIT
    sleep 8
    if ! kill -0 "$process" 2>/dev/null; then
      echo "OBS terminated before the native smoke gate completed" >&2
      exit 1
    fi
  ' _ "$cfg" "$sandbox/qss-trace.so" "$capture" "$log"

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
PY
}

check_theme base 'com.myrqyry.Colorway' '#191724'
check_theme latte 'com.myrqyry.Colorway.CatppuccinLatte.Blue' '#eff1f5'
check_theme monokai 'com.myrqyry.Colorway.Monokai' '#272822'
echo 'All isolated OBS/Qt theme selections verified'
