# Colorway companion for OBS Studio

Two small, **optional** interfaces: a real OBS Lua pattern picker and an
offline theme-preview browser dock. Neither requires Docker, a cloud account,
a network server, or a native plugin.

## Pattern picker: changes real OBS background patterns

1. Install a Colorway base and one or more variants normally.
2. Open OBS **Tools → Scripts**, click **+**, and choose
   `colorway-patterns.lua` from this folder.
3. In the script's properties confirm **Colorway themes directory**,
   choose **Background pattern**, and adjust **Pattern strength (%)**.
   Click **Apply pattern** to save both choices. The first change preserves
   the exact starting SVG at `patterns/.colorway-original.svg`.
4. The slider runs from **0% (hidden)** through **100% (original visibility,
   the default)** to **300% (three times the authored ink opacity)**.
   For example, 50% makes the original 12% SVG artwork 6% opaque; 200%
   raises it to 24%. It adjusts only the pattern artwork, not the widgets.
5. **Restore original** writes the backed-up original SVG byte-for-byte and
   resets the selected pattern and strength to Original / 100%.
6. Without live auto-reload, restart OBS to see the adjusted pattern.

The script edits **only** the installed theme's `patterns/pattern.svg`. It
never changes theme IDs, switches OBS palettes, changes scenes, or writes OBS
settings. The same pattern is shared across Colorway variants: intentionally
one independent pattern choice for the complete Colorway family.

### Optional live pattern updates (OBS 32.2)

OBS can watch selected theme files if `AutoReload=true` is present in the
`[Appearance]` section of its `user.ini` **before starting OBS**. With OBS
closed, edit this section in your real OBS configuration:

```ini
[Appearance]
AutoReload=true
```

Then start OBS. After applying a pattern, the script touches the Colorway
base (re-writes the same first byte) to trigger OBS's built-in watcher.
It does not alter the base's contents; it does update its modification time.
If AutoReload isn't enabled, Apply reports that a restart is needed rather
than falsely claiming an on-screen update.

On standard Linux installs the theme directory is
`~/.config/obs-studio/themes` and settings are in
`~/.config/obs-studio/user.ini`. Portable/Flatpak installations can vary;
select the correct theme directory in the script. For other operating systems,
set the theme directory manually and restart OBS after applying, unless you
have verified live-reload settings for that configuration.

### Safety

- The picker offers only the 14 bundled SVG pattern names (not arbitrary
  filenames, network paths, or commands).
- It validates the target contains a Colorway base theme and existing pattern.
- Writes use an adjacent temporary file and atomic rename.
- The exact original is backed up; failed writes leave it untouched.
- An existing interrupted temporary write is not silently overwritten.
- It never installs or activates itself in OBS without your action.
- Treat custom SVGs as untrusted: this version deliberately does not import
  arbitrary SVG files.

## Offline theme previews in OBS

1. Open **Docks → Custom Browser Docks...** in OBS.
2. Add a dock named **Colorway Library**.
3. Give it the file URL of `colorway-preview.html` in this folder. On Linux
   that looks like `file:///home/username/.config/obs-studio/colorway-companion/colorway-preview.html`.
4. Apply and open the Colorway Library dock from the Docks menu.

The browser dock is a **self-contained HTML file** with 160 real OBS theme
palettes and all 14 SVG patterns embedded. It works offline; no local server
needed. It provides search, dark/light filters, local favorites, and a
representative preview of OBS scenes, sources, audio mixer, and controls.
The patterns are shown in the same workspace preview instead of being isolated
decorations.

**Preview only:** clicking a theme does not switch OBS. Use
**Settings → Appearance** to select a variant; use the Lua script for changing
the installed pattern. The dock intentionally does not offer Apply Theme because the scripting API cannot switch OBS palettes.

The embedded palette data is generated from the repository's `.ovt` files,
following their real inheritance chains. To rebuild after editing themes:
`pnpm sync:themes`. The generated, portable HTML is then mirrored to
`public/companion/` for the normal downloadable packages.

## Development checks

- `node --test test/colorway-patterns-script.test.js` exercises real
  LuaJIT file operations using an isolated test themes directory.
- `node --test test/colorway-companion-preview.test.js` verifies all theme
  and pattern sources, mirrors, and offline build.
- `pnpm check:companion` renders the offline page in Chromium and checks
  theme switching, pattern previews, and filters.
- `pnpm check:obs-native` separately verifies the actual theme colors and
  icon assets in isolated OBS sessions.

The viewer is a representative interface, not a pixel-identical native Qt
screenshot or a controller for OBS frontend theme selection.
