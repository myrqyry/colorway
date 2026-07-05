#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THEME_FILES=("$SCRIPT_DIR"/*.ovt "$SCRIPT_DIR"/*.obt)
DEST_DIR="${HOME}/.config/obs-studio/themes"

mkdir -p "$DEST_DIR"

for theme in "${THEME_FILES[@]}"; do
  cp -v "$theme" "$DEST_DIR/"
done

echo "Done. Themes copied to: $DEST_DIR"
