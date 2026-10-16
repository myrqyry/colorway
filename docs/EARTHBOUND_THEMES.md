# EarthBound palette family

Colorway includes the palettes from Ben Busby's EarthBound themes for
VS Code. The source extension names are Earthbound, Moonside, Zombie Threed,
Dusty Dunes, Fire Spring, Devil's Machine, Magicant, and Cave of the Past,
plus four darker variants.

Original upstream sources:
- https://github.com/earthbound-themes/vscode/tree/main/themes
- https://github.com/earthbound-themes/vscode/blob/main/themes/devils-machine.json
- https://marketplace.visualstudio.com/items?itemName=benbusby.earthbound-themes

## Naming and compatibility

The OBS-displayed names and the Colorway catalog names are `EarthBound`
or `EarthBound — <variant>`. The theme files and `@OBSThemeMeta.id` values
for the 11 existing variants remain unchanged. This intentionally preserves
references from already installed themes, local links, and inheritance
(including Dusty Dunes Darker's parent reference).

The 12th variant is `Colorway-DevilsMachine.ovt`. Its palette adapts
the VS Code theme's dark backgrounds (`#040001`, `#170000`,
`#260000`), foreground (`#ffcccc`), focus color (`#938198`),
and syntax-accent colors into Colorway's existing OBS roles. The original
theme is a VS Code syntax/workbench color theme, not an animation or an
OBS filter; only the palette was adapted. No effects are claimed.

The original VS Code theme source is MIT-licensed. The Colorway
implementation uses its existing standalone base and Qt/QSS semantics.

## Source license notice

MIT License

Copyright (c) 2020 Ben Busby

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
