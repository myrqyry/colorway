"""Render actual Qt specimens, independently of OBS and the browser."""
import argparse
import json
import os
from pathlib import Path
import sys

os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
from PyQt6.QtCore import QDir, QPoint, QT_VERSION_STR
from PyQt6.QtTest import QTest
from PyQt6.QtWidgets import QApplication, QComboBox, QWidget, QVBoxLayout, QPushButton
from qt_theme import compose_qss


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='Optional directory for specimen PNGs')
    args = parser.parse_args()
    payload = json.load(sys.stdin)
    qss, _ = compose_qss(payload)
    app = QApplication([])
    QDir.addSearchPath('theme', payload['root'])
    app.setStyle('Fusion')
    app.setStyleSheet(qss)
    host = QWidget()
    layout = QVBoxLayout(host)
    combo = QComboBox()
    combo.addItems(['Fade', 'Cut'])
    combo.setFixedWidth(220)
    layout.addWidget(combo)
    sink = QPushButton('Focus sink')
    layout.addWidget(sink)
    host.show()
    app.processEvents()

    def capture(state):
        app.processEvents()
        image = combo.grab().toImage()
        if args.output:
            args.output.mkdir(parents=True, exist_ok=True)
            if not image.save(str(args.output / f'combo-{state}.png')):
                raise RuntimeError('Could not save specimen')
        y = image.height() // 2
        return dict(width=image.width(), height=image.height(),
                    minimumHeight=combo.minimumHeight(), sizeHintHeight=combo.sizeHint().height(),
                    background=image.pixelColor(image.width() // 2, y).name(),
                    border=image.pixelColor(1, y).name(),
                    outerBorder=image.pixelColor(0, y).name(),
                    innerBorder=image.pixelColor(2, y).name())

    sink.setFocus()
    QTest.mouseMove(sink, QPoint(5, 5))
    app.processEvents()
    assert not combo.hasFocus() and not combo.underMouse()
    normal = capture('normal')
    combo.setFocus()
    app.processEvents()
    assert combo.hasFocus()
    focused = capture('focus')
    sink.setFocus()
    QTest.mouseMove(combo, QPoint(combo.width() // 2, combo.height() // 2))
    app.processEvents()
    assert combo.underMouse() and not combo.hasFocus()
    hovered = capture('hover')
    print(json.dumps(dict(qtVersion=QT_VERSION_STR, style='Fusion',
                          combo=dict(normal=normal, focus=focused, hover=hovered))))


if __name__ == '__main__':
    main()
