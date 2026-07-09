# Ubiquitous Language

## OBS Theme Development

| Term | Definition | Aliases to avoid |
| ---- | ---------- | ---------------- |
| **Theme** | An OBS color scheme definition file (.ovt) | Skin, template, style |
| **Palette** | The collection of CSS variables defining colors | Colors, scheme, hues |
| **Pattern** | Background texture overlay for theme preview | Background, texture, wallpaper |
| **Slop** | Low-quality, generic output lacking specificity |

## Code Quality

| Term | Definition | Aliases to avoid |
| ---- | ---------- | ---------------- |
| **Clean code** | Direct, specific code without unnecessary abstraction | Simple, minimal, tight |
| **Duplication** | Same logic repeated in multiple places | Redundancy, copy-paste |
| **Bloat** | Unnecessary lines, variables, or conditionals | Fluff, overhead, noise |

## Relationships

- A **Theme** extends a base **Theme** via the `extends` property
- A **Palette** contains 6+ visual swatches for preview
- **Clean code** has no **Duplication** and minimal **Bloat**

## Example dialogue

> **Dev:** "Should the slider update handlers be separate?"
> **Domain expert:** "No — both demo and mixer sliders need the same logic. Merge them into one selector."
> **Dev:** "What's the cutoff for too much **Slop**?"
> **Domain expert:** "When `detect_slop.py` scores above 40, or you can't explain why each line exists."