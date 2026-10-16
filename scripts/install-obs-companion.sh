#!/usr/bin/env bash
# Install only the optional Colorway companion files, not any OBS config.
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target="${1:-${XDG_CONFIG_HOME:-${HOME}/.config}/obs-studio/colorway-companion}"
test ! -L "$target" || { echo "Refusing symlink destination: $target" >&2; exit 2; }
mkdir -p "$target"
for name in colorway-patterns.lua colorway-preview.html README.md; do
  source_file="$repo/obs-companion/$name"
  test -f "$source_file"
  if test -e "$target/$name" && cmp -s "$source_file" "$target/$name"; then
    echo "Already current: $name"
    continue
  fi
  if test -e "$target/$name"; then
    backup="$target/.previous"
    mkdir -p "$backup"
    suffix="$(date +%Y%m%d-%H%M%S)-$$"
    cp -p "$target/$name" "$backup/$name.$suffix"
    echo "Preserved previous: $backup/$name.$suffix"
  fi
  temp="$(mktemp "$target/.colorway-install-XXXXXX")"
  if ! cp "$source_file" "$temp"; then rm -f "$temp"; exit 1; fi
  chmod 644 "$temp"
  mv -f -- "$temp" "$target/$name"
  cmp -s "$source_file" "$target/$name"
  echo "Installed: $target/$name"
done
printf '\nOBS Lua script: %s/colorway-patterns.lua\n' "$target"
printf 'OBS Custom Browser Dock file URL: file://%s/colorway-preview.html\n' "$target"
echo 'Not auto-enabled; add it in OBS Tools > Scripts / Docks > Custom Browser Docks.'
