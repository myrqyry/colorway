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
- `resources/widgets.svg`: the labeled `Warning`, `Error`, and `Secondary information` specimens inform Colorway's state stress-test vocabulary.
- `mockups/crash-recovery/crash-recovery.svg`: the `Crash Recovery`, `Run in Safe Mode`, and `Run Normally` language is represented in the stress test so themes are exercised against a consequential decision surface.

The imported status SVGs are rendered as CSS masks. Their OBS geometry survives, but Colorway's `.ovt` semantic variables still determine visible color.

## State stress test

The preview's **Test UI states** control is intentionally a Colorway testing surface, not a claim about current OBS notification placement. It renders all semantic state roles at once:

- informational UI uses `--primary` because Colorway does not define a separate info token,
- warning uses `--warning`,
- error/destructive uses `--danger`,
- recovery/healthy uses `--success`.

That makes theme changes expose semantic-color failures immediately instead of leaving those roles visible only as palette swatches.

## Maintenance rule

1. verify the upstream commit/date,
2. re-read the upstream non-final warning,
3. prefer semantics and geometry over pixel copying,
4. keep appearance owned by Colorway theme variables,
5. protect adopted behavior with a contract test.

The reference should make the preview more truthful without making Colorway dependent on an old mockup.
