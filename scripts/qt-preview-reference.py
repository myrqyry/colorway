"""Render actual Qt specimens, independently of OBS and the browser."""
import argparse
import json
import os
from pathlib import Path
import sys

os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
from PyQt6.QtCore import QDir, QPoint, Qt, QT_VERSION_STR
from PyQt6.QtGui import QColor, QImage, QPainter, QFont
from PyQt6.QtTest import QTest
from PyQt6.QtWidgets import (
    QApplication, QComboBox, QWidget, QVBoxLayout, QPushButton, QLineEdit,
    QSpinBox, QDoubleSpinBox, QTextEdit, QToolButton, QCheckBox, QRadioButton,
    QSlider, QScrollBar, QListWidget, QTabBar, QProgressBar, QGroupBox, QLabel,
    QAbstractButton, QAbstractSlider,
)
from qt_theme import compose_qss


def populated(widget, method, *args):
    getattr(widget, method)(*args)
    return widget


def range_control(cls, orientation):
    widget = cls(orientation)
    widget.setRange(0, 100)
    widget.setValue(40)
    return widget


def tab_bar():
    widget = QTabBar()
    for title in ('General', 'Audio', 'Video'):
        widget.addTab(title)
    return widget


def group_box():
    widget = QGroupBox('Advanced')
    QVBoxLayout(widget).addWidget(QLabel('Enable preview'))
    return widget


# One registry owns geometry and state support. Native widgets paint their own
# subcontrols; the atlas does not replicate any of those drawing routines.
SPECIMENS = {
    'combo': (lambda: populated(QComboBox(), 'addItems', ['Fade', 'Cut']), 220, None),
    'lineEdit': (lambda: QLineEdit('10'), 220, None),
    'spinbox': (lambda: populated(QSpinBox(), 'setValue', 30), 220, None),
    'doubleSpinbox': (lambda: populated(QDoubleSpinBox(), 'setValue', 1.25), 220, None),
    'textEdit': (lambda: populated(QTextEdit(), 'setPlainText', 'Scene notes'), 220, 65),
    'pushButton': (lambda: QPushButton('Apply'), 220, None),
    'toolButton': (lambda: populated(QToolButton(), 'setText', 'Tool'), 72, None),
    'checkbox': (lambda: QCheckBox('Enable'), 155, None),
    'radio': (lambda: QRadioButton('Audio track'), 155, None),
    'slider': (lambda: range_control(QSlider, Qt.Orientation.Horizontal), 220, 32),
    'verticalSlider': (lambda: range_control(QSlider, Qt.Orientation.Vertical), 32, 96),
    'scrollbar': (lambda: range_control(QScrollBar, Qt.Orientation.Vertical), 16, 96),
    'horizontalScrollbar': (lambda: range_control(QScrollBar, Qt.Orientation.Horizontal), 220, 16),
    'list': (lambda: populated(QListWidget(), 'addItems', ['Scene', 'Camera', 'Audio']), 220, 96),
    'tabs': (tab_bar, 220, None),
    'progress': (lambda: populated(QProgressBar(), 'setValue', 65), 220, 26),
    'group': (group_box, 220, 65),
}
CHECKABLE = {'pushButton', 'toolButton', 'checkbox', 'radio'}
SELECTABLE = {'list', 'tabs'}


def export_raster(image, path, format):
    if not image.save(str(path), format.upper(), 100 if format == 'webp' else -1):
        raise RuntimeError(f'Could not save {path}')
    decoded = QImage(str(path))
    rgba = QImage.Format.Format_RGBA8888
    reference = image.convertToFormat(rgba)
    if format == 'webp' and decoded.isNull():
        # Qt 6.11 rejects some minimal, valid VP8L streams (e.g. solid
        # disabled scrollbars). Verify with a separate decoder in that case.
        try:
            from PIL import Image
        except ImportError as exc:
            raise RuntimeError('Install Pillow to verify WebP when Qt cannot decode it') from exc
        with Image.open(path) as fallback:
            raw = reference.constBits().asstring(reference.sizeInBytes())
            exact = fallback.size == (reference.width(), reference.height()) and fallback.convert('RGBA').tobytes() == raw
    else:
        exact = decoded.convertToFormat(rgba) == reference
    if not exact:
        raise RuntimeError(f'Lossless {format} round trip differed: {path}')
    return dict(bytes=path.stat().st_size, pixelExact=exact)


def export_svg(widget, image, path):
    from PyQt6.QtSvg import QSvgGenerator, QSvgRenderer
    generator = QSvgGenerator()
    generator.setFileName(str(path))
    generator.setSize(widget.size())
    generator.setViewBox(widget.rect())
    generator.setResolution(widget.logicalDpiX())
    painter = QPainter(generator)
    if not painter.isActive():
        raise RuntimeError(f'Could not paint {path}')
    # Render the actual widget to Qt's SVG paint device, not a traced PNG.
    widget.render(painter)
    painter.end()
    renderer = QSvgRenderer(str(path))
    if not renderer.isValid():
        raise RuntimeError(f'Invalid SVG: {path}')
    raster = QImage(image.size(), QImage.Format.Format_ARGB32_Premultiplied)
    raster.fill(Qt.GlobalColor.transparent)
    painter = QPainter(raster)
    renderer.render(painter)
    painter.end()
    rgba = QImage.Format.Format_RGBA8888
    return dict(bytes=path.stat().st_size,
                qtRasterPixelExact=raster.convertToFormat(rgba) == image.convertToFormat(rgba))


def render_specimen(app, family, factory, width, height, output, images):
    host = QWidget()
    layout = QVBoxLayout(host)
    widget = factory()
    widget.setFixedWidth(width)
    if height is not None:
        widget.setFixedHeight(height)
    if family in CHECKABLE:
        widget.setCheckable(True)
        widget.setAutoExclusive(False)
    layout.addWidget(widget)
    sink = QPushButton('Focus sink')
    layout.addWidget(sink)
    host.show()
    app.processEvents()

    def neutral():
        sink.setFocus()
        QTest.mouseMove(sink, QPoint(5, 5))
        app.processEvents()

    states = {}

    def capture(state):
        app.processEvents()
        image = widget.grab().toImage()
        if image.isNull():
            raise RuntimeError(f'Empty specimen: {family}/{state}')
        if output and images is not None:
            images.append((family, state, image))
        formats = {}
        if output and not output[1]:
            rgba = image.convertToFormat(QImage.Format.Format_RGBA8888)
            transparent = any(alpha != 255 for alpha in rgba.constBits().asstring(rgba.sizeInBytes())[3::4])
            for format in output[2]:
                path = output[0] / f'{family}-{state}.{format}'
                formats[format] = (export_svg(widget, image, path) if format == 'svg'
                                   else export_raster(image, path, format))
        y = image.height() // 2
        # Flat-area reference values are only used for mapped controls.
        # Other widgets expose actual PNGs + metrics, not claims of uniform fill.
        x = image.width() // 2
        states[state] = dict(width=image.width(), height=image.height(),
                             minimumHeight=widget.minimumHeight(),
                             sizeHintHeight=widget.sizeHint().height(),
                             background=image.pixelColor(x, y).name(),
                             border=image.pixelColor(min(1, image.width()-1), y).name(),
                             outerBorder=image.pixelColor(0, y).name(),
                             innerBorder=image.pixelColor(min(2, image.width()-1), y).name(),
                             **(dict(formats=formats, hasTransparency=transparent,
                                     preferredRaster='png' if transparent else 'webp') if formats else {}))

    neutral()
    if family == 'list':
        widget.clearSelection()
    capture('normal')
    if widget.focusPolicy() != Qt.FocusPolicy.NoFocus:
        widget.setFocus()
        app.processEvents()
        if widget.hasFocus():
            capture('focus')
    neutral()
    QTest.mouseMove(widget, QPoint(widget.width() // 2, widget.height() // 2))
    app.processEvents()
    capture('hover')
    neutral()
    if family in CHECKABLE:
        widget.setChecked(True)
        capture('checked')
        QTest.mouseMove(widget, QPoint(widget.width() // 2, widget.height() // 2))
        capture('checkedHover')
        neutral()
        if family in {'pushButton', 'toolButton'}:
            widget.setChecked(False)
            widget.setDown(True)
            capture('pressed')
            widget.setDown(False)
        widget.setChecked(True)
        widget.setEnabled(False)
        capture('checkedDisabled')
        widget.setEnabled(True)
        widget.setChecked(False)
    if family in SELECTABLE:
        widget.setCurrentRow(1) if family == 'list' else widget.setCurrentIndex(1)
        capture('selected')
    widget.setEnabled(False)
    capture('disabled')
    host.close()
    return states


def save_atlas(images, directory, token, formats):
    # Compact contact sheet; each specimen is the original, unscaled Qt grab.
    families = list(SPECIMENS)
    states = list(dict.fromkeys(state for _, state, _ in images))
    cell_w, gutter, heading = 240, 120, 26
    heights = {family: max(img.height() for f, _, img in images if f == family) + 12
               for family in families}
    atlas = QImage(gutter + cell_w * len(states), heading + sum(heights.values()),
                   QImage.Format.Format_RGB32)
    atlas.fill(QColor(token('--bg_window')))
    painter = QPainter(atlas)
    painter.setFont(QFont('sans-serif', 10))
    painter.setPen(QColor(token('--text')))
    for i, state in enumerate(states):
        painter.drawText(gutter + i * cell_w + 8, 17, state)
    y = heading
    for family in families:
        painter.drawText(8, y + 17, family)
        for f, state, image in images:
            if f == family:
                painter.drawImage(gutter + states.index(state) * cell_w + 8,
                                  y + (heights[family] - image.height()) // 2, image)
        y += heights[family]
    painter.end()
    for format in formats:
        if format != 'svg':
            export_raster(atlas, directory / f'atlas.{format}', format)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='Optional directory for specimen PNGs')
    parser.add_argument('--atlas-only', action='store_true', help='Save only the contact sheet')
    parser.add_argument('--format', choices=['png', 'webp', 'svg'], action='append', help='Image formats (default: png)')
    parser.add_argument('--family', choices=SPECIMENS, action='append', help='Limit rendered families')
    args = parser.parse_args()
    if args.atlas_only and (not args.output or args.family):
        parser.error('--atlas-only requires --output and all families')
    formats = list(dict.fromkeys(args.format or ['png']))
    if args.format and not args.output:
        parser.error('--format requires --output')
    if args.atlas_only and 'svg' in formats:
        parser.error('SVG is per specimen; omit --atlas-only')
    payload = json.load(sys.stdin)
    qss, token = compose_qss(payload)
    app = QApplication([])
    QDir.addSearchPath('theme', payload['root'])
    app.setStyle('Fusion')
    app.setStyleSheet(qss)
    if args.output:
        args.output.mkdir(parents=True, exist_ok=True)
    output = (args.output, args.atlas_only, formats) if args.output else None
    images = []
    report = dict(qtVersion=QT_VERSION_STR, style='Fusion')
    for family, (factory, width, height) in SPECIMENS.items():
        if not args.family or family in args.family:
            report[family] = render_specimen(app, family, factory, width, height, output, images)
    if args.output and not args.family:
        save_atlas(images, args.output, token, formats)
    print(json.dumps(report))


if __name__ == '__main__':
    main()
