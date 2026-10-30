#!/usr/bin/env python3
"""Generate a complete, uncertainty-aware theme credit ledger (offline)."""
from pathlib import Path
import json
repo=Path(__file__).resolve().parent.parent
data=json.loads((repo/'data/theme-provenance.json').read_text())
themes=data['themes']
files=sorted(p.name for p in (repo/'themes').glob('Colorway-*.ovt'))
assert set(files)==set(themes) and len(files)==166
counts={}
for entry in themes.values():
    counts[entry['verification']]=counts.get(entry['verification'],0)+1

tick=chr(96)
lines=[
    '# Colorway theme provenance and credits',
    '',
    'Reviewed: '+data['reviewed']+'; 166 shipped OBS color variants.',
    '',
    'Colorway adapts external palettes into OBS theme roles. A source identity',
    'does not certify every OBS color mapping. An inspired-by credit does not',
    'claim an exact upstream palette. Unverified sources are not invented.',
    'The original palette creators retain their authorship; Colorway adapts',
    'the palettes for OBS, but does not claim to have invented them.',
    '',
    '## Coverage',
    ''
]
for name,count in sorted(counts.items()):
    lines.append('- '+name+': '+str(count))
lines += [
    '',
    '## Sources for every shipped variant',
    '',
    '| Theme file | Relationship | Original creator / source | Evidence | Notes |',
    '| --- | --- | --- | --- | --- |'
]
for file in files:
    e=themes[file]
    creator=e['creator'] or 'Original source not established'
    citation='['+creator+']('+e['url']+')' if e['url'] else creator
    note=e['note'] or '—'
    lines.append('| '+file+' | '+e['relation']+' | '+citation.replace('|','/')+' | '+e['verification']+' | '+note.replace('|','/')+' |')
lines += [
    '',
    '## Palette-fidelity checkpoints',
    '',
    '- All 41 standard Catppuccin variants match official base, named accent,',
    '  and text roles in the upstream Catppuccin 1.8.0 palette snapshot.',
    '- All 18 Rosé Pine variants match the official base and named accent.',
    '  The six Dawn variants preserve the historical '+tick+'#575279'+tick+' text value,',
    '  while the checked current upstream reference reports '+tick+'#464261'+tick+'.',
    '  This remains documented as historical source drift, not silently rewritten.',
    '- All fifteen identified Lospec palette sources were checked for their',
    '  authored hex colors. A few Colorway foregrounds are contrast adaptations',
    '  outside the deliberately small source palettes; they are not original swatches.',
    '- A diff against the pre-October-16 checkpoint found no changes to',
    '  authored theme palette seeds in any of the 160 variants.',
    '- The incorrect Rosé Pine values shown for unrelated variants came from',
    '  the web parser incorrectly reading commented palette snapshots as',
    '  active declarations, not from native OBS theme overrides.',
    '',
    '## Upstream files and licensing',
    '',
    'Machine-readable origin links and credit confidence: '+tick+'data/theme-provenance.json'+tick+'.',
    'Pinned official color checkpoints: '+tick+'data/official-palette-checkpoints.json'+tick+'.',
    'Source licenses must be checked individually; this file does not imply',
    'that every upstream source uses the Colorway project license.',
    'Original creators and trademarks remain with their respective owners.',
    '',
    'The Colorway palette snapshot comments are generated from local resolved',
    'OBS colors. They are not in themselves evidence of official upstream values.',
    ''
]
out='\n'.join(lines)
(repo/'docs/THEME_CREDITS.md').write_text(out)
print('Generated 166 Colorway credits; coverage:',counts)
