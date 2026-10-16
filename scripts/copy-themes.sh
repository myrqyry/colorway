#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THEME_FILES=("$SCRIPT_DIR/../themes"/*.ovt "$SCRIPT_DIR/../themes"/*.obt)
DEST_DIR="${1:-${XDG_CONFIG_HOME:-${HOME}/.config}/obs-studio/themes}"

mkdir -p "$DEST_DIR"

for theme in "${THEME_FILES[@]}"; do
  cp -v "$theme" "$DEST_DIR/"
done

mkdir -p "$DEST_DIR/icons/colorway" "$DEST_DIR/patterns"
cp -rv "$SCRIPT_DIR/../icons/colorway/mingcute" "$DEST_DIR/icons/colorway/"
cp -v "$SCRIPT_DIR/../patterns/"*.svg "$DEST_DIR/patterns/"

echo "Done. Themes and assets copied to: $DEST_DIR"
echo "Optional font: install fonts/BricolageGrotesqueVariable.ttf as an OS font, then restart OBS."
