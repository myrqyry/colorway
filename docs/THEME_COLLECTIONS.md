# Colorway theme collections

## Native theme browser

The Colorway preview now offers a style-category filter and name search.
Classification is explicit and based on theme identity, not guessed solely
from palette colors. Themes still appear under their Dark and Light headings,
and the currently active theme remains visible when it does not match the
filter. Shuffling and download behavior remain independent of browsing.

The collections are:

- Catppuccin
- Rosé Pine
- EarthBound (12 related palettes; names use an EarthBound prefix, IDs stay stable)
- Retro & Analog
- Nature & Earth
- Dreamy & Atmospheric
- Technical & Industrial
- Color & Gemstones
- Soft & Playful
- Modern & Minimal
- Editor Classics
- Uncategorized (for future themes pending classification)

The metadata and filter logic live in `src/theme-categories.js`. New native
themes should have a deliberate category rule; the test catches entries
that fall through to Uncategorized.

## Theme Designer Pro intake (35 upstream themes)

Source: https://github.com/silentoplayz/theme-designer-pro-presets/tree/main/themes

`UPSTREAM_THEME_PRESETS` in `src/theme-categories.js` records each original
JSON filename, name, primary style collection, source URL, and whether the
preset contains effects beyond its palette. These are **source-only entries**,
not bundled `.ovt` files or selectable OBS themes. The intake is a first step
toward adapting the collection, not a claim that all 35 are installed.

Source license: MIT, copyright 2026 silentoplayz. Preserve attribution and
the MIT license notice when importing substantial original files or
derived content. Colorway itself is GPL-3.0.

### Why conversion is separate

Theme Designer Pro targets Open WebUI, with dark/light/OLED/her modes and
theme-token overrides. Many presets also use arbitrary CSS, canvas scripts,
gradients, fonts, and animation. Colorway targets OBS Studio Qt/QSS theme
variables. A direct JSON copy cannot work.

Proposed conversion contract:

1. Read upstream JSON as *data only*; never execute its `canvasScript`,
   custom CSS, or imported resources.
2. Convert both dark and light palettes to Colorway's existing OBS token
   vocabulary. Respect explicitly overridden gray/blue semantic colors and
   test contrast in the composed theme instead of blindly copying a hue.
3. Identify duplicates with existing Colorway variants (notably Rosé Pine and
   retro terminal / Matrix-inspired looks). Do not create misleading clones.
4. Generate separate native `.ovt` files with source/author attribution;
   keep the existing standalone `Colorway.obt` base and extension ID.
5. Use `pnpm sync:themes` to update the public mirror, test parser/round-trip
   and contrast contracts, build, and check the browser/OBS preview. Effects
   that cannot transfer must be labeled as omitted rather than mocked.

The 35 source JSON files are linked in the registry; the source repositories
can update independently, so review their current contents before conversion.
