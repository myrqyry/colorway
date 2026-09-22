# OBS Design Reference

Colorway uses selected material from [obsproject/design](https://github.com/obsproject/design) as **design evidence for the OBS simulator**, not as a current OBS UI specification.

## Source snapshot

- Repository: `obsproject/design`
- Observed upstream commit: `6a7639840dc6d88546da127c18374541b3fadfa2`
- Commit date: 2024-04-19
- Upstream license: CC0-1.0
- Upstream warning: its README says mockups and experiments are not final or representative of future OBS releases.

## Adopted mechanisms

- `mockups/sources-toolbar/sources-toolbar.svg`: static actions move to the end; Filters and Properties become icon actions; related controls stay grouped.
- `icons/`: streaming, recording, and network active/inactive state families are used in the simulator.
- `resources/colors.md`: semantic roles (accent, destructive, layered backgrounds, controls, borders) are treated as validation targets, not literal palette values.

The imported status SVGs are rendered as CSS masks. Their OBS geometry survives, but Colorway's `.ovt` semantic variables still determine visible color.

## Maintenance rule

1. verify the upstream commit/date,
2. re-read the upstream non-final warning,
3. prefer semantics and geometry over pixel copying,
4. keep appearance owned by Colorway theme variables,
5. protect adopted behavior with a contract test.

The reference should make the preview more truthful without making Colorway dependent on an old mockup.
