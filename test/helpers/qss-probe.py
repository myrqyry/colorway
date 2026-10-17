"""Offscreen Qt checks against composed repository QSS; no OBS config changes.

Input is JSON {base: theme text, variant: optional text, root: asset search root}.
Math evaluation is a test adapter for OBS's documented two-operand grammar;
Qt itself is the oracle for selectors, cascade, geometry, and rendered icons.
"""
import json
import os
import re
import sys

os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
from PyQt6.QtCore import QDir, QPoint, Qt
from PyQt6.QtGui import QColor, QPalette, QPainter
from PyQt6.QtTest import QTest
from PyQt6.QtWidgets import (QApplication, QWidget, QDialog, QVBoxLayout, QPushButton, QToolButton,
                            QComboBox, QCheckBox, QListWidget, QScrollBar, QScrollArea, QStackedWidget, QFrame, QGroupBox, QLabel, QStyle,
                            QStyleOptionSlider, QStyleOptionGroupBox, QAbstractButton,
                            QStyleOptionButton)

payload = json.load(sys.stdin)
checks = set(payload.get('checks', ['icons', 'focus', 'scroll', 'group', 'picker']))
variables = {'--obsFontScale': '10', '--obsPadding': '4'}
css = []
for source in [payload['base'], payload.get('variant', '')]:
    source = re.sub(r'/\*.*?\*/', '', source, flags=re.S)
    block = re.search(r'@OBSThemeVars\s*\{(.*?)\}', source, re.S)
    if block:
        variables.update(dict(re.findall(r'(--\w+):\s*([^;]+);', block[1])))
    css.append(re.sub(r'@OBSTheme(?:Meta|Vars)\s*\{.*?\}', '', source, flags=re.S))


# Match OBSApp_Themes.cpp: quoted function values become raw QSS strings.
# Preserve any other string tokens and the authored QSS unchanged.
for name, value in list(variables.items()):
    if value.startswith(("'url(", "'rgba(", '"url(', '"rgba(')) and value[-1] == value[0]:
        variables[name] = value[1:-1]



def evaluate(value, trail=()):
    value = value.strip()
    alias = re.fullmatch(r'var\((--\w+)\)', value)
    if alias:
        key = alias[1]
        assert key not in trail, ('cycle', trail, key)
        return evaluate(variables[key], trail + (key,))
    math = re.fullmatch(r'(calc|min|max)\((.*)\)', value)
    if not math:
        return value
    depth = 0
    for i, char in enumerate(math[2]):
        depth += (char == '(') - (char == ')')
        if depth == 0 and char in '+-*/,':
            left = evaluate(math[2][:i], trail)
            right = evaluate(math[2][i + 1:], trail)
            number = r'(-?[\d.]+)(\w*)'
            a, b = re.fullmatch(number, left), re.fullmatch(number, right)
            assert a and b, (value, left, right)
            assert not a[2] or not b[2] or a[2] == b[2], (left, right)
            x, y = float(a[1]), float(b[1])
            if math[1] == 'min': result = min(x, y)
            elif math[1] == 'max': result = max(x, y)
            elif char == '+': result = x + y
            elif char == '-': result = x - y
            elif char == '*': result = x * y
            else: result = x / y
            suffix = a[2] or b[2]
            return f'{result:g}{suffix}'
    raise AssertionError(('invalid math', value))


def token(key):
    return evaluate(variables[key], (key,))


qss = re.sub(r'var\((--\w+)\)', lambda m: token(m[1]), '\n'.join(css))
assert 'var(' not in qss
app = QApplication([])
QDir.addSearchPath('theme', payload['root'])
app.setStyle('Fusion')
app.setStyleSheet(qss)


class SourceSelectButton(QAbstractButton):
    # Match OBS's exposed widget type and CE_PushButton state painting contract.
    def paintEvent(self, event):
        opt = QStyleOptionButton()
        opt.initFrom(self)
        if self.isChecked(): opt.state |= QStyle.StateFlag.State_On
        if self.isDown(): opt.state |= QStyle.StateFlag.State_Sunken
        self.style().drawControl(QStyle.ControlElement.CE_PushButton, opt, QPainter(self), self)


window = QWidget()
layout = QVBoxLayout(window)
button = QPushButton()
button.setProperty('class', ['icon-plus'])
button.setCheckable(True)
button.setFocusPolicy(Qt.FocusPolicy.NoFocus)
button.setFixedSize(100, 44)
layout.addWidget(button)
tool = QToolButton()
tool.setProperty('class', ['icon-plus'])
tool.setCheckable(True)
tool.setFocusPolicy(Qt.FocusPolicy.NoFocus)
tool.setFixedSize(44, 44)
layout.addWidget(tool)
combo = QComboBox()
combo.addItems(['One', 'Two'])
layout.addWidget(combo)
picker = SourceSelectButton()
picker.setCheckable(True)
picker.setFixedSize(180, 70)
picker_layout = QVBoxLayout(picker)
picker_name = QLabel('Source name')
picker_name.setObjectName('name')
picker_layout.addWidget(picker_name)
layout.addWidget(picker)
group = QGroupBox('Group title')
group.setFixedSize(180, 90)
layout.addWidget(group)
scroll = QScrollBar(Qt.Orientation.Vertical)
scroll.setRange(0, 100)
scroll.setPageStep(20)
scroll.setValue(30)
scroll.setFixedSize(10, 160)
layout.addWidget(scroll)
window.show()
app.processEvents()


def center_color(widget):
    image = widget.grab().toImage()
    return image.pixelColor(image.width() // 2, image.height() // 2).name()


def icon_color(role):
    path = token('--cw_icon_plus_' + role).removeprefix('url(theme:').removesuffix(')')
    with open(os.path.join(payload['root'], path)) as svg:
        return re.search(r'(?:fill|stroke)="(#[\da-f]{6})"', svg.read(), re.I)[1].lower()


# The '+' crosses its exact center; compare authored SVG ink with a real Qt grab.
button.setChecked(False)
button.setDown(False)
app.processEvents()
if 'icons' in checks:
    assert center_color(button) == icon_color('base'), ('normal icon', center_color(button), icon_color('base'))
button.setDown(True)
app.processEvents()
if 'icons' in checks:
    assert center_color(button) == icon_color('primary'), ('pressed icon', center_color(button), icon_color('primary'))
button.setDown(False)
button.setChecked(True)
app.processEvents()
if 'icons' in checks:
    assert center_color(button) == icon_color('primary'), ('checked icon', center_color(button), icon_color('primary'))
QTest.mouseMove(button, QPoint(button.width() // 2, button.height() // 2))
app.processEvents()
if 'icons' in checks:
    assert center_color(button) == icon_color('primary_hover'), ('checked hover icon', center_color(button), icon_color('primary_hover'))
QTest.mouseMove(window, QPoint(window.width() - 1, window.height() - 1))
tool.setChecked(True)
app.processEvents()
if 'icons' in checks:
    assert center_color(tool) == icon_color('base'), ('checked tool icon', center_color(tool), icon_color('base'))

combo.setFocus()
app.processEvents()
assert combo.hasFocus()
image = combo.grab().toImage()
border = image.pixelColor(1, image.height() // 2).name()
if 'focus' in checks:
    assert border == QColor(token('--border_focus')).name(), ('combo focus border', border, token('--border_focus'))

opt = QStyleOptionSlider()
scroll.initStyleOption(opt)
page = scroll.style().subControlRect(QStyle.ComplexControl.CC_ScrollBar, opt,
                                    QStyle.SubControl.SC_ScrollBarAddPage, scroll)
assert not page.isEmpty()
image = scroll.grab().toImage()
page_color = image.pixelColor(page.center()).name()
if 'scroll' in checks:
    assert page_color == QColor(token('--bg_base')).name(), ('scroll page', page_color, token('--bg_base'))

opt_group = QStyleOptionGroupBox()
group.initStyleOption(opt_group)
frame = group.style().subControlRect(QStyle.ComplexControl.CC_GroupBox, opt_group,
                                    QStyle.SubControl.SC_GroupBoxFrame, group)
if 'group' in checks:
    assert frame.top() >= 10, ('group title reservation', frame.top())

if 'picker' in checks:
    assert picker_name.palette().color(QPalette.ColorRole.WindowText).name() == QColor(token('--text')).name(), 'normal source label'
picker.setChecked(True)
app.processEvents()
if 'picker' in checks:
    assert picker_name.palette().color(QPalette.ColorRole.WindowText).name() == QColor(token('--text')).name(), 'checked source label'

# OBS Settings pages use a QScrollArea with an auto-filled contents widget.
# A transparent stylesheet background can paint as black instead of showing the
# parent QDialog's palette. Check the real nested Qt widget arrangement.
if 'settings' in checks or 'combo-size' in checks:
    class OBSBasicSettings(QDialog):
        pass

    settings = OBSBasicSettings()
    settings.resize(700, 550)
    pages_layout = QVBoxLayout(settings)
    pages = QStackedWidget(settings)
    pages_layout.addWidget(pages)
    appearance = QWidget()
    appearance.setObjectName('appearancePage')
    pages.addWidget(appearance)
    appearance_layout = QVBoxLayout(appearance)
    area = QScrollArea(appearance)
    area.setFrameShape(QFrame.Shape.NoFrame)
    area.setWidgetResizable(True)
    appearance_layout.addWidget(area)
    contents = QWidget()
    contents.setObjectName('appearancePageContents')
    contents_layout = QVBoxLayout(contents)
    contents_layout.addWidget(QLabel('Appearance'))
    group_panel = QGroupBox('Controls', contents)
    group_layout = QVBoxLayout(group_panel)
    enabled_checkbox = QCheckBox('Enabled option')
    disabled_checkbox = QCheckBox('Disabled option')
    disabled_checkbox.setEnabled(False)
    disabled_label = QLabel('Disabled text')
    disabled_label.setEnabled(False)
    group_layout.addWidget(enabled_checkbox)
    group_layout.addWidget(disabled_checkbox)
    group_layout.addWidget(disabled_label)
    settings_combo = QComboBox(group_panel)
    settings_combo.addItems(['NV12 (8-bit, 4:2:0, 2 planes)', 'I444'])
    group_layout.addWidget(settings_combo)
    contents_layout.addWidget(group_panel)
    contents_layout.addStretch()
    area.setWidget(contents)
    settings.show()
    app.processEvents()
    if 'combo-size' in checks:
        # Native OBS Compact density had QComboBox sizeHint=26 but minHeight=8;
        # its form layout subsequently squeezed the widget to 16 pixels.
        # Assert the real minimum, not only the nominal size hint.
        required = max(24, settings_combo.fontMetrics().height() + 8)
        minimum = settings_combo.minimumHeight()
        assert minimum >= required, ('settings combo minimum height', minimum, required)
    image = contents.grab().toImage()
    background = QColor(token('--bg_window')).name()
    pixels = {image.pixelColor(x, image.height() - 40).name()
              for x in range(8, image.width() - 8)}
    assert background in pixels, ('settings background', sorted(pixels), background)
    assert len(pixels) > 1, ('settings background pattern missing', sorted(pixels))
    # In the historical failure this label's ink equalled the group fill.
    # Assert Qt's styled, disabled palette on the actual child, not only QSS text.
    expected_disabled = QColor(token('--on_panel_disabled')).name()
    observed_disabled = disabled_checkbox.palette().color(
        QPalette.ColorGroup.Disabled, QPalette.ColorRole.WindowText).name()
    assert observed_disabled == expected_disabled, (
        'settings disabled checkbox ink', observed_disabled, expected_disabled)
    label_disabled = disabled_label.palette().color(
        QPalette.ColorGroup.Disabled, QPalette.ColorRole.WindowText).name()
    assert label_disabled == expected_disabled, (
        'settings disabled label ink', label_disabled, expected_disabled)
    # The unchecked indicator must expose its visible outline in the raster.
    ink = QColor(token('--on_panel_outline')).name()
    checkbox_image = enabled_checkbox.grab().toImage()
    indicator_inks = {checkbox_image.pixelColor(x, y).name()
                      for y in range(min(24, checkbox_image.height()))
                      for x in range(min(24, checkbox_image.width()))}
    assert ink in indicator_inks, ('unchecked checkbox outline', ink, sorted(indicator_inks))

print(json.dumps({'qt': 'passed', 'icon_states': ['normal', 'pressed', 'checked', 'checked-hover', 'checked-tool'],
                  'combo_focus_border': border, 'scroll_page': page_color,
                  'group_frame_top': frame.top()}))
