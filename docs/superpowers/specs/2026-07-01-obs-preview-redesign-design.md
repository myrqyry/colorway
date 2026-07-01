# OBS preview redesign design

This design updates the Colorway preview from a generic theme demo into a
credible OBS-like interface. The preview must make the theme variants feel
grounded in the real OBS layout while still giving users a clear way to inspect
palette and component states.

## Goal

The preview must look like an OBS workspace first and a theme showcase second.
It must remove amateur signals such as emoji navigation, oversized marketing
labels, and generic web-app controls. It must use compact dock chrome,
OBS-style panel hierarchy, and Colorway theme variables parsed from the selected
`.ovt` file.

## Scope

The work covers the public preview UI and its static deployment shape. It does
not change the OBS theme files, generated variants, or icon assets unless the
preview needs read-only references to them.

The implementation uses Vite, pnpm, and Tailwind CSS. The preview can move out
of a single handwritten HTML file and into a small static frontend app. A good
target structure is:

- `package.json` with pnpm scripts for `dev`, `build`, and `preview`.
- `index.html` as the Vite entrypoint and Vercel root page.
- `src/main.js` or `src/main.ts` for variant loading, parsing, and UI state
  updates.
- `src/styles.css` for Tailwind imports, theme token defaults, and OBS-specific
  component layers.
- `tailwind.config.js` only if the project needs Tailwind configuration beyond
  standard content scanning.

With a Vite `index.html`, Vercel doesn't need to rewrite `/` to `preview.html`.
The existing `vercel.json` rewrite can be removed or replaced with normal Vite
static-site settings if needed.

## Recommended approach

Use a hybrid OBS shell with a restrained theme inspector. The main area must
resemble OBS Studio: menu bar, canvas, docks, controls, audio mixer, and status
bar. The inspector must sit inside that environment rather than replacing it.

This approach gives users a realistic sense of how each theme feels in OBS and
still makes Colorway's palette values easy to compare.

## Layout

The preview uses a desktop-first OBS workspace with responsive fallback for
smaller screens.

The top chrome contains a thin OBS-style title/menu area:

- A title label such as `Colorway OBS Theme Preview`.
- Menu labels: `File`, `Edit`, `View`, `Docks`, `Profile`, `Scene Collection`,
  `Tools`, and `Help`.
- A compact theme selector aligned to the right.

The central workspace contains:

- A large preview canvas with safe-area guides, subtle checker/grid treatment,
  and a small status overlay.
- Bottom docks for `Scenes`, `Sources`, `Audio Mixer`, `Scene Transitions`, and
  `Controls`.
- A right-side inspector dock for theme metadata, palette chips, and component
  states.

On narrow screens, the dock grid can stack vertically. The preview must remain
usable, but pixel-perfect OBS fidelity is not required on mobile.

## Visual language

The interface must prioritize OBS realism over decorative flair.

Use these rules:

- Use compact spacing, thin separators, dock headers, and small text.
- Use text labels and simple glyph-like icons rather than emoji.
- Avoid large gradients except where the selected theme already uses gradient
  values for state accents.
- Use the selected `.ovt` variables for surfaces, text, borders, accent states,
  and controls.
- Keep the inspector visually subordinate to the OBS shell.

The page can use Unicode symbols for small UI hints when an SVG icon is not
worth adding, but it must avoid emoji-style presentation.

## Theme data flow

The preview continues to fetch `.ovt` files from the repository's raw GitHub
URL. The parser extracts `@OBSThemeMeta` and `@OBSThemeVars`, then writes known
variables to CSS custom properties on `document.documentElement`.

The UI must map these OBS theme variables into web preview tokens:

- Window, dock, base, preview, and input surfaces.
- Primary, hover, focus, warning, danger, and disabled states.
- Text, muted text, inactive text, inverse text, and borders.
- Audio meter colors and active recording or streaming states where available.

If a variable is missing from a variant, the preview must keep a sensible base
fallback so the layout remains readable.

## Components to represent

The preview must show the OBS areas that best reveal theme quality:

- `Scenes` list with selected, hover-like, and inactive rows.
- `Sources` tree with visibility, lock, grouped source rows, and disclosure
  indicators.
- `Audio Mixer` strips with meters, volume sliders, mute buttons, and labels.
- `Scene Transitions` controls with a transition selector and duration field.
- `Controls` buttons for streaming, recording, virtual camera, studio mode,
  settings, and exit.
- Status bar metrics for CPU, FPS, dropped frames, and bitrate.
- Theme inspector chips for the active palette and a few component states.

These components are illustrative. They don't need to perform OBS actions.
Their purpose is to show realistic static and stateful styling.

## Interaction behavior

The theme selector remains interactive. Changing the selection loads the chosen
`.ovt`, applies its variables, updates the palette chips, and updates the theme
name in the inspector.

Optional low-cost interactions can improve realism:

- Selecting rows in `Scenes` and `Sources`.
- Toggling visibility or lock states visually.
- Toggling record or stream button active states.

These interactions must not introduce a framework or state library. Plain
JavaScript is enough.

## Error handling

When a theme fails to load, the preview must keep the current theme active and
show a compact error message in the inspector or status bar. It must not replace
the interface with a full-page error state.

When GitHub raw content is unavailable, the default CSS variables must still
render a usable OBS-like preview.

## Deployment

The preview remains a static Vercel deployment built by Vite. The expected
commands are `pnpm install`, `pnpm build`, and Vercel serving the generated
`dist` directory. Source files can use standard Vite-relative asset paths.

## Validation

Before calling the redesign complete, verify these checks:

- Run the QSS validator if theme files changed.
- Deploy or locally serve the preview and confirm Vercel reports the preview
  deployment as ready.
- Confirm the root URL doesn't return the Vercel `404: NOT_FOUND` page.
- Confirm at least one newly added variant and one existing variant load through
  the theme selector.
- Confirm the interface no longer relies on emoji-heavy labels or generic
  marketing-card layout patterns.
- Confirm `pnpm build` completes and Vercel serves the Vite output directory.

## Non-goals

This redesign doesn't need to embed a real OBS instance, perfectly reproduce
every OBS widget, or support editing theme variables. It also doesn't need a
frontend framework or server-side code.
