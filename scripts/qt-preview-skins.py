"""Produce native, text-free control skins for the interactive browser preview."""
import base64
import json
import os
import sys
from io import BytesIO

os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
from PIL import Image
from PyQt6.QtCore import QBuffer, QDir, QIODevice, QPoint, QRect, Qt, QT_VERSION_STR
from PyQt6.QtGui import QColor, QImage, QPainter
from PyQt6.QtTest import QTest
from PyQt6.QtWidgets import (QApplication, QCheckBox, QComboBox, QLineEdit,
    QPushButton, QRadioButton, QSlider, QStyle, QStyleOptionButton,
    QStyleOptionFrame, QStyleOptionSlider, QVBoxLayout, QWidget)
from qt_theme import compose_qss

S = QStyle.StateFlag
SUB = QStyle.SubControl
CC = QStyle.ComplexControl
PE = QStyle.PrimitiveElement
SE = QStyle.SubElement


def pixels(image):
    rgba = image.convertToFormat(QImage.Format.Format_RGBA8888)
    return rgba.constBits().asstring(rgba.sizeInBytes())


def encode(image):
    raw = pixels(image)
    fmt = 'webp' if all(a == 255 for a in raw[3::4]) else 'png'
    buffer = QBuffer()
    buffer.open(QIODevice.OpenModeFlag.WriteOnly)
    if not image.save(buffer, fmt.upper(), 100 if fmt == 'webp' else -1):
        raise RuntimeError('Qt image encode failed: ' + fmt)
    data = bytes(buffer.data())
    with Image.open(BytesIO(data)) as decoded:
        if decoded.convert('RGBA').tobytes() != raw:
            raise RuntimeError('Non-lossless skin: ' + fmt)
    return dict(src='data:image/' + fmt + ';base64,' + base64.b64encode(data).decode('ascii'),
                width=image.width(), height=image.height(), pixelExact=True)


def render(app, family, token):
    host = QWidget()
    box = QVBoxLayout(host)
    widget = {'field': QLineEdit, 'combo': QComboBox, 'button': QPushButton,
              'checkbox': QCheckBox, 'radio': QRadioButton,
              'slider': lambda: QSlider(Qt.Orientation.Horizontal)}[family]()
    if family == 'combo':
        widget.addItem('')
    if family == 'radio':
        widget.setAutoExclusive(False)
    if family == 'slider':
        widget.setValue(40)
        widget.setFixedHeight(32)
    widget.setFixedWidth(220)
    box.addWidget(widget)
    sink = QPushButton('Focus sink')
    box.addWidget(sink)
    host.show()
    app.processEvents()
    states = ['normal', 'focus', 'hover', 'disabled']
    if family in ('checkbox', 'radio'):
        states += ['checked', 'checkedHover', 'checkedDisabled']
    if family in ('button', 'slider'):
        states += ['pressed']
    result = {}
    for state in states:
        widget.setEnabled(True)
        sink.setFocus()
        QTest.mouseMove(sink, QPoint(5, 5))
        app.processEvents()
        if family in ('checkbox', 'radio'):
            widget.setChecked(state.startswith('checked'))
        if family == 'button':
            widget.setDown(state == 'pressed')
        if state == 'focus':
            widget.setFocus()
        if state in ('disabled', 'checkedDisabled'):
            widget.setEnabled(False)
        rect = widget.rect()
        if family in ('checkbox', 'radio'):
            opt = QStyleOptionButton()
            widget.initStyleOption(opt)
            rect = widget.style().subElementRect(SE.SE_CheckBoxIndicator if family == 'checkbox'
                                                   else SE.SE_RadioButtonIndicator, opt, widget)
        elif family == 'slider':
            opt = QStyleOptionSlider()
            widget.initStyleOption(opt)
            rect = widget.style().subControlRect(CC.CC_Slider, opt, SUB.SC_SliderHandle, widget)
        if state in ('hover', 'checkedHover', 'pressed'):
            QTest.mouseMove(widget, rect.center())
        app.processEvents()
        image = QImage(widget.size(), QImage.Format.Format_ARGB32_Premultiplied)
        # Blank frames are opaque on the showcase dock surface. Cut-out
        # indicators and handles retain native alpha for compositing on live UI.
        image.fill(QColor(token('--bg_dock')) if family in ('field','combo','button')
                   else Qt.GlobalColor.transparent)
        painter = QPainter(image)
        if family == 'field':
            opt = QStyleOptionFrame()
            widget.initStyleOption(opt)
            widget.style().drawPrimitive(PE.PE_PanelLineEdit, opt, painter, widget)
        elif family in ('checkbox', 'radio'):
            opt = QStyleOptionButton()
            widget.initStyleOption(opt)
            opt.rect = rect
            widget.style().drawPrimitive(PE.PE_IndicatorCheckBox if family == 'checkbox'
                                         else PE.PE_IndicatorRadioButton, opt, painter, widget)
        elif family == 'slider':
            opt = QStyleOptionSlider()
            widget.initStyleOption(opt)
            opt.subControls = SUB.SC_SliderHandle
            if state in ('hover', 'pressed'):
                opt.activeSubControls = SUB.SC_SliderHandle
                opt.state |= S.State_MouseOver
            if state == 'pressed':
                opt.state |= S.State_Sunken
            widget.style().drawComplexControl(CC.CC_Slider, opt, painter, widget)
        else:
            from PyQt6.QtGui import QRegion
            widget.render(painter, QPoint(), QRegion(), QWidget.RenderFlag.DrawChildren)
        painter.end()
        if family in ('checkbox', 'radio', 'slider'):
            if not widget.rect().contains(rect):
                raise RuntimeError(f'{family} rect outside widget: {rect}')
            image = image.copy(rect)
        raw = pixels(image)
        if not any(raw[3::4]):
            raise RuntimeError(f'Empty skin: {family}/{state}')
        result[state] = encode(image)
    host.close()
    return result


def main():
    payload = json.load(sys.stdin)
    qss, token = compose_qss(payload)
    app = QApplication([])
    QDir.addSearchPath('theme', payload['root'])
    app.setStyle('Fusion')
    app.setStyleSheet(qss)
    print(json.dumps(dict(qtVersion=QT_VERSION_STR, style='Fusion',
        skins={family: render(app, family, token) for family in
               ('field','combo','button','checkbox','radio','slider')})))


if __name__ == '__main__':
    main()
