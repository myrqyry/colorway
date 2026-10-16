"""Render Colorway's actual SceneTree pattern QSS in offscreen Qt.
Input JSON: {base, root}. Fails when Qt flattens the repeating image.
"""
import json
import os
import re
import sys

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
from PyQt6.QtCore import QDir
from PyQt6.QtWidgets import QApplication, QWidget
from PyQt6.QtGui import QColor

payload = json.load(sys.stdin)
source = re.sub(r"/\*[\s\S]*?\*/", "", payload["base"])
match = re.search(r"SceneTree\s*,\s*SourceTree\s*\{([^}]*)\}", source)
assert match, "SceneTree/SourceTree pattern QSS missing"
declarations = match[1]
assert "background-image: var(--pattern_eyes)" in declarations
assert "background-color: var(--bg_base)" in declarations
# OBS resolves these lexical variables before handing the QSS to Qt.
declarations = declarations.replace("var(--pattern_eyes)", "url(theme:patterns/pattern.svg)")
declarations = declarations.replace("var(--bg_base)", "#5A5475")
QDir.addSearchPath("theme", payload["root"])
app = QApplication([])
tile = QWidget()
tile.setObjectName("probe")
tile.resize(120, 120)
tile.setStyleSheet("#probe {" + declarations + "}")
tile.show()
app.processEvents()
raster = tile.grab().toImage()
pixels = {raster.pixelColor(x, 60).name() for x in range(8, 110)}
assert "#5a5475" in pixels, ("background color lost", pixels)
assert len(pixels) >= 2, ("Qt flattened the authored SVG pattern", pixels, declarations)
print(json.dumps({"qt": "passed", "colors": sorted(pixels)}))
