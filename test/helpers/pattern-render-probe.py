"""Render Colorway's actual Settings page background SVG in offscreen Qt.
Input JSON: {base, root}. Fails when Qt flattens the ambient tiling.
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
match = re.search(r"OBSBasicSettings\s+QScrollArea\s*>\s*QWidget\s*>\s*QWidget\s*\{([^}]*)\}", source)
assert match, "Settings scroll page pattern QSS missing"
declarations = match[1]
assert "background-image: var(--pattern_eyes)" in declarations
assert "background-color: var(--bg_window)" in declarations
# OBS resolves these lexical variables before handing the QSS to Qt.
declarations = declarations.replace("var(--pattern_eyes)", "url(theme:patterns/pattern.svg)")
declarations = declarations.replace("var(--bg_window)", "#5A5475")
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
