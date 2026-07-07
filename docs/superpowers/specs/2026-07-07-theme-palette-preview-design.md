# Theme Palette Preview Design

**Status**: Approved
**Author**: opencode
**Date**: 2026-07-07

## Goal
Add a small palette preview next to each theme in the theme picker list, replacing the native `<select>` with an inline open list that shows all 138 themes at once with their color palettes.

## Background
- Current theme picker: native `<select>` dropdown (shows one theme name at a time)
- 138 themes available, each with a distinct palette
- User wants to compare themes visually without clicking each one
- `.ovt` files are small (~2-3KB each) and contain the full palette in `@OBSThemeVars`

## Design

### 1. UI Structure
Replace the native `<select>` with a custom inline list:

```html
<div class="showcase-picker">
  <label for="theme-list">Theme</label>
  <div class="theme-list-container">
    <div id="theme-list" class="theme-list" role="listbox">
      <div class="theme-row" role="option" data-file="Colorway-CatppuccinMocha.ovt">
        <span class="theme-name">Catppuccin Mocha</span>
        <div class="theme-palette">
          <span class="palette-swatch" style="background:#1e1e2e"></span>
          <span class="palette-swatch" style="background:#cba6f7"></span>
          <span class="palette-swatch" style="background:#fab387"></span>
          <span class="palette-swatch" style="background:#f38ba8"></span>
          <span class="palette-swatch" style="background:#cdd6f4"></span>
          <span class="palette-swatch" style="background:#313244"></span>
        </div>
      </div>
      <!-- 137 more rows -->
    </div>
  </div>
</div>
```

**Visual design:**
- `.theme-list-container`: Fixed height (400px), `overflow-y: auto`, scrollable
- `.theme-row`: Flex row, `align-items: center`, padding, hover/focus styles
- `.theme-name`: Left-aligned, flex-grow, ellipsis overflow
- `.theme-palette`: Right-aligned, flex row, 6 swatches (fixed width/height, 12px × 12px, gap 2px)
- Active theme: highlighted with `background: var(--list_item_bg_hover)`

### 2. Data Flow

**Preload all 138 themes on page load:**
- On `DOMContentLoaded`, fetch all `.ovt` files in parallel using `Promise.all`
- Parse each with `parseOVT()` (reuse `loadRaw` logic)
- Extract a fixed set of 6 palette variables per theme
- Cache parsed data in memory (no need for `loadRaw` cache since we preload everything)
- Render the full list immediately

**Selection:**
- Clicking a row calls `setTheme(file)` (existing function)
- Active row gets `.active` class
- Theme name updates in the header (existing `#active-theme-name`)

### 3. Palette Extraction

**Fixed palette variables per theme:**
```js
const PALETTE_PREVIEW_VARS = [
  '--bg_base',
  '--primary',
  '--warning',
  '--danger',
  '--text',
  '--border_color'
];
```

**Extraction logic:**
```js
function extractPalettePreview(vars) {
  return PALETTE_PREVIEW_VARS.map(varName => vars[varName] || '#000000');
}
```

### 4. Performance
- **Network**: ~300KB (138 files × ~2KB each) — acceptable for a style guide
- **CPU**: Parsing 138 small OVTs is fast (no heavy computation)
- **Memory**: ~500KB for parsed data (138 × ~3.5KB) — negligible
- **Rendering**: 138 rows with 6 swatches each — virtualization not needed (only ~138 DOM nodes)

### 5. Error Handling
- If a theme fails to load, render its row with fallback swatches (`#808080`) and a warning icon
- Show error message in the existing `#theme-status` element

### 6. Accessibility
- Keyboard navigation: up/down arrows to move focus, Enter to select
- ARIA: `role="listbox"`, `role="option"` on rows, `aria-selected` for active theme
- Focus styles: visible outline on focused rows

### 7. Testing
- **Unit**: `extractPalettePreview()` with sample vars
- **Integration**: Theme selection updates active row and applies theme
- **Visual**: All palette swatches render correct colors
- **Performance**: Preload completes within 2 seconds on slow networks

### 8. Implementation Notes
- Remove the existing `renderThemeOptions()` function
- Add `renderThemeList()` function that renders all 138 rows
- Add `preloadAllThemes()` function that fetches and parses all `.ovt` files
- Update event listeners to use the new list instead of `<select>`
- Keep `setTheme()` and `applyTheme()` unchanged

### 9. Files Changed
- `src/main.js`: Replace `<select>` with inline list, add preload logic
- `src/styles.css`: Add styles for `.theme-list-container`, `.theme-row`, `.theme-palette`, `.palette-swatch`

## Alternatives Considered

### Custom Dropdown Panel
- **Pros**: Saves vertical space, familiar interaction
- **Cons**: Requires click to open, harder to compare themes at a glance

### Lazy-Load on Scroll
- **Pros**: Saves bandwidth
- **Cons**: Adds complexity (scroll handlers, loading states), delays interaction

### Hybrid Preload + Lazy-Load
- **Pros**: Balances speed and bandwidth
- **Cons**: More complex than preload-all, minimal benefit for 138 small files

## Decision
**Inline open list with preload-all themes** — approved by user. Provides the best visual comparison experience with acceptable performance trade-offs.

## Open Questions
- None. Design approved and ready for implementation.
