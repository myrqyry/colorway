# Installing a Colorway theme package

The Browse download produces one ZIP. Extract it before installing.

1. Copy the **contents** of the ZIP's `themes/` directory into the active OBS theme
   directory, preserving the nested `icons/` and `patterns/` folders.
   If you unchecked “Include base theme”, an existing `Colorway.obt` is required;
   update it from a full package if it predates the accompanying variant/assets.
2. Optionally install `fonts/BricolageGrotesqueVariable.ttf` as an **OS font**, using
   your desktop's font installer, and restart OBS. Merely copying it into the theme
   folder does not load it. The theme uses Qt-compatible system fallbacks otherwise.
   The font's license is included as `fonts/OFL.txt`.
3. Restart OBS, then choose **Colorway** under Theme and the downloaded palette under
   Style/Variant in Settings → Appearance.

Default desktop theme directories:

- Linux: `~/.config/obs-studio/themes/`
- Windows: `%APPDATA%\obs-studio\themes\`
- macOS: `~/Library/Application Support/obs-studio/themes/`

Flatpak, portable mode, and other packaging can move the configuration root. Use the
theme directory of the OBS installation you actually run. Installed duplicate IDs can
take precedence over user themes; ensure you are testing the updated Colorway files.

The package includes both icon polarities, all patterns, the selected `.ovt`,
and **`THEME_CREDITS.md`** with original palette/source attribution and any
unverified or historically diverging adaptations. Colorway creates the OBS
port; it does not claim to have authored upstream palettes.
The base expects `patterns/pattern.svg`. For easy pattern changes, **use the optional
Colorway Pattern Manager** instead of replacing SVG files manually.

## Optional Colorway Pattern Manager and theme previews

The ZIP includes a separate `companion/` folder (do **not** copy this folder into
the OBS themes directory). It contains two working, offline tools:

- `companion/colorway-patterns.lua`: add through **OBS Tools → Scripts → +**.
  Choose a pattern and click **Apply**. The original SVG is backed up;
  **Restore original** reverses the change exactly.
- `companion/colorway-preview.html`: add through **OBS Docks → Custom Browser
  Docks...** with a `file:///...` URL to the extracted HTML file. Browse
  all Colorway theme palettes, preview scene/source/audio-mixer styling,
  compare installed background patterns, search and favorite themes.
  The selected theme also displays its original creator/source link when
  verified, or explicitly says when the origin is unresolved.

The dock is **preview-only**; choose the actual theme in Settings → Appearance.
The Lua script changes only `patterns/pattern.svg`, and does not alter OBS's
active theme, scenes, or settings.

Without `AutoReload=true`, OBS needs a restart after changing patterns.
To enable native live reload, close OBS, add `AutoReload=true` inside the
`[Appearance]` section of OBS's `user.ini`, then restart once. The Lua script
then requests theme refresh using the native OBS file watcher. It does not
edit `user.ini` itself. See `companion/README.md` for details.

No network service, Docker, or additional OBS plugin is required.

## Installing directly from the repository

Run `pnpm sync:themes` after edits. Then run
`bash scripts/copy-themes.sh /path/to/your/active/obs-studio/themes` to copy themes,
icons, and patterns to an explicitly chosen destination. Without an argument the script
uses the ordinary Linux config root (`$XDG_CONFIG_HOME`, or `~/.config`). It does not
install fonts or change OBS's selected theme/settings.
