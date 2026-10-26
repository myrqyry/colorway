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
from PyQt6.QtCore import QDir, QPoint, Qt, QSize, QRect
from PyQt6.QtGui import QColor, QPalette, QPainter, QIcon, QImage
from PyQt6.QtTest import QTest
from PyQt6.QtWidgets import (QApplication, QWidget, QDialog, QVBoxLayout, QPushButton, QToolButton,
                            QHBoxLayout, QSizePolicy, QSlider,
                            QComboBox, QLineEdit, QSpinBox, QDoubleSpinBox, QCheckBox, QRadioButton, QListWidget, QScrollBar, QScrollArea, QStackedWidget, QFrame, QGroupBox, QLabel, QStyle,
                            QStyleOptionSlider, QStyleOptionGroupBox, QStyleOptionSpinBox, QAbstractButton,
                            QStyleOptionButton)

payload = json.load(sys.stdin)
checks = set(payload.get('checks', ['icons', 'focus', 'scroll', 'group', 'picker']))
variables = {'--obsFontScale': '10', '--obsPadding': str(payload.get('obsPadding', 4))}
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
if any(x in checks for x in ('settings', 'combo-size', 'form-size')):
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
    spin = QSpinBox(group_panel)
    double_spin = QDoubleSpinBox(group_panel)
    line = QLineEdit('Filename formatting', group_panel)
    group_layout.addWidget(spin)
    group_layout.addWidget(double_spin)
    group_layout.addWidget(line)
    contents_layout.addWidget(group_panel)
    contents_layout.addStretch()
    area.setWidget(contents)
    settings.show()
    app.processEvents()
    if 'form-size' in checks:
        # Compact OBS native form layouts compress these fields to 16 pixels
        # unless the minimumHeight is applied to the actual control class.
        for field in (spin, double_spin, line):
            minimum = field.minimumHeight()
            required = max(24, field.fontMetrics().height() + 8)
            assert minimum >= required, ('settings form minimum height', field.metaObject().className(), minimum, required)
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

if 'sidebar-focus' in checks:
    # The Settings nav was patterned before fadaf55; removing the SVG made
    # a pre-existing generic QListWidget:focus accent frame glaringly visible.
    class OBSBasicSettings(QDialog):
        pass
    dialog = OBSBasicSettings()
    dialog.resize(320, 420)
    layout = QVBoxLayout(dialog)
    nav = QListWidget(dialog)
    nav.addItems(['General', 'Appearance', 'Stream', 'Output'])
    nav.setCurrentRow(1)
    layout.addWidget(nav)
    alternate = QLineEdit('Other control', dialog)
    layout.addWidget(alternate)
    dialog.show()
    alternate.setFocus()
    app.processEvents()
    inactive = nav.grab().toImage().pixelColor(1, nav.height() // 2).name()
    nav.setFocus()
    app.processEvents()
    active = nav.grab().toImage().pixelColor(1, nav.height() // 2).name()
    expected = QColor(token('--bg_dock')).name()
    assert inactive == expected, ('settings sidebar idle edge', inactive, expected)
    # Qt may repaint the patterned pixels after focus changes; compare against
    # the actual accent frame, not a flat background that no longer exists.
    focus_ink = QColor(token('--border_focus')).name()
    assert active != focus_ink, ('settings sidebar focus frame', active, focus_ink)
    base_rgb = QColor(expected)
    active_rgb = QColor(active)
    assert max(abs(a - b) for a, b in zip(
        (base_rgb.red(), base_rgb.green(), base_rgb.blue()),
        (active_rgb.red(), active_rgb.green(), active_rgb.blue()))) < 30, (
        'settings sidebar focus frame', active, expected)

if 'filters-surface' in checks or 'slider-endpoints' in checks:
    class OBSBasicFilters(QDialog):
        pass
    class OBSPropertiesView(QScrollArea):
        pass
    filters = OBSBasicFilters()
    filters.resize(600, 500)
    filters_layout = QVBoxLayout(filters)
    properties = OBSPropertiesView(filters)
    properties.setWidgetResizable(True)
    filters_layout.addWidget(properties)
    contents = QWidget()
    contents_layout = QVBoxLayout(contents)
    properties.setWidget(contents)
    filter_slider = QSlider(Qt.Orientation.Horizontal)
    filter_slider.setRange(0, 100)
    filter_slider.setFixedWidth(350)
    contents_layout.addWidget(filter_slider)
    contents_layout.addStretch()
    filters.show()
    app.processEvents()
    if 'filters-surface' in checks:
        image = contents.grab().toImage()
        row_colors = {image.pixelColor(x, image.height() - 15).name()
                      for x in range(8, image.width() - 8)}
        expected = QColor(token('--bg_window')).name()
        assert expected in row_colors, ('filters properties background', expected, sorted(row_colors))
        assert len(row_colors) > 1, ('filters properties pattern missing', row_colors)
    if 'slider-endpoints' in checks:
        # Compare the composite track/handle end caps, not only the white
        # handle: the old sub-page paints a square behind a round minimum thumb.
        for slider in [filter_slider, QSlider(Qt.Orientation.Horizontal)]:
            if slider is not filter_slider:
                slider.setFixedSize(350, 28)
                slider.show()
            # Compare only the visible track end opposite the handle. At an
            # endpoint the handle covers its own near cap, so the far end is
            # the reliable oracle for a flattened square track cap.
            caps_by_side = {0: None, 1: None}
            for value in [50, 0, 100]:
                slider.setValue(value)
                slider.clearFocus()
                slider.setAttribute(Qt.WidgetAttribute.WA_UnderMouse, False)
                app.processEvents()
                option = QStyleOptionSlider()
                slider.initStyleOption(option)
                handle = slider.style().subControlRect(QStyle.ComplexControl.CC_Slider, option,
                    QStyle.SubControl.SC_SliderHandle, slider)
                assert slider.rect().contains(handle), ('slider endpoint bounds', value, handle, slider.rect())
                groove = slider.style().subControlRect(QStyle.ComplexControl.CC_Slider, option,
                    QStyle.SubControl.SC_SliderGroove, slider)
                image = slider.grab().toImage()
                radius = handle.width() // 2
                for side, x0 in enumerate([groove.left(), groove.right() - radius + 1]):
                    cap = {(x, y) for y in range(groove.height()) for x in range(radius)
                           if image.pixelColor(x0 + x, groove.top() + y).alpha() >= 128}
                    if not cap:
                        continue
                    cap_rect = QRect(x0, groove.top(), radius, groove.height())
                    if handle.intersects(cap_rect):
                        continue
                    top = sum(y == 0 for x, y in cap)
                    middle = sum(y == groove.height() // 2 for x, y in cap)
                    assert middle > top, ('slider cap not rounded', value, side, top, middle)
                    if caps_by_side[side] is None:
                        caps_by_side[side] = cap
                    else:
                        difference = len(cap.symmetric_difference(caps_by_side[side]))
                        assert difference <= 2, ('slider endpoint silhouette flattened', value, side, difference)

if 'mixer' in checks:
    mixer = QWidget()
    mixer_layout = QVBoxLayout(mixer)
    control = QPushButton()
    control.setCheckable(True)
    control.setIcon(QIcon(os.path.join(payload['root'], 'icons/colorway/mingcute/selected/volume-high.svg')))
    control.setIconSize(QSize(14, 14))
    control.setFixedSize(24, 22)
    mixer_layout.addWidget(control)
    mixer.show()
    app.processEvents()
    for kind, checked, warning, expected_key in [
        ('mute', False, '', '--cw_icon_volume_high_base'),
        ('mute', True, '', '--cw_mixer_muted'),
        ('mute', False, 'mute-warning', '--cw_mixer_warning'),
        ('mute', False, 'mute-unassigned', '--cw_mixer_warning'),
        ('mute', True, 'mute-warning', '--cw_mixer_warning'),
        ('monitor', False, '', '--cw_icon_headphone_off_base'),
        ('monitor', True, '', '--cw_mixer_monitor'),
    ]:
        for hover, pressed in [(False, False), (True, False), (True, True)]:
            # Mirror both OBS's class flags and the actual QPushButton checked
            # flag. Warning takes precedence even when the button is checked.
            classes = ['btn-' + kind] + (['checked'] if checked else []) + ([warning] if warning else [])
            if hover: classes.append('hover')
            control.setProperty('class', ' '.join(classes))
            control.setChecked(checked)
            control.style().unpolish(control)
            control.style().polish(control)
            option = QStyleOptionButton()
            option.initFrom(control)
            option.state = QStyle.StateFlag.State_Enabled | QStyle.StateFlag.State_Active
            if checked: option.state |= QStyle.StateFlag.State_On
            if hover: option.state |= QStyle.StateFlag.State_MouseOver
            if pressed: option.state |= QStyle.StateFlag.State_Sunken
            option.icon = control.icon()
            option.iconSize = QSize(14, 14)
            image = QImage(control.size(), QImage.Format.Format_ARGB32)
            image.fill(QColor(token('--bg_base')))
            painter = QPainter(image)
            control.style().drawControl(QStyle.ControlElement.CE_PushButton, option, painter, control)
            painter.end()
            path = token(expected_key).removeprefix('url(theme:').removesuffix(')')
            reference = QIcon(os.path.join(payload['root'], path)).pixmap(14, 14).toImage()
            expected = QImage(14, 14, QImage.Format.Format_ARGB32)
            expected.fill(QColor(token('--bg_base')))
            painter = QPainter(expected)
            painter.drawImage(0, 0, reference)
            painter.end()
            # Ignore the border: it can share the semantic glyph's ink.
            # Permit a one-pixel style press offset, not a different glyph.
            mismatches = []
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    x0 = (image.width() - 14) // 2 + dx
                    y0 = (image.height() - 14) // 2 + dy
                    mismatches.append(sum(max(abs(a-b) for a,b in zip(
                        image.pixelColor(x0+x, y0+y).getRgb()[:3], expected.pixelColor(x,y).getRgb()[:3])) > 12
                        for y in range(14) for x in range(14)))
            assert min(mismatches) <= 4, ('mixer glyph', kind, checked, warning, hover, pressed, min(mismatches))

if 'zoom' in checks:
    zoom = QWidget()
    zoom_layout = QVBoxLayout(zoom)
    for name, kind in [('previewZoomInButton', 'plus'), ('previewZoomOutButton', 'minus')]:
        control = QPushButton()
        control.setObjectName(name)
        control.setProperty('class', 'icon-' + kind)
        control.setIcon(QIcon(os.path.join(payload['root'], 'icons/colorway/mingcute/normal/' + kind + '.svg')))
        control.setIconSize(QSize(8, 8))
        control.setFixedSize(20, 16)
        zoom_layout.addWidget(control)
    zoom.show()
    app.processEvents()
    for control in zoom.findChildren(QPushButton):
        image = control.grab().toImage()
        # Inactive zoom buttons are transparent. Pixel-aligned 8px artwork
        # has crisp full-alpha strokes, unlike the old 24-unit fractional path.
        opaque = sum(image.pixelColor(x, y).alpha() >= 240
                     for y in range(4, 12) for x in range(6, 14))
        assert opaque >= 6, ('zoom opaque strokes', control.objectName(), opaque)
        option = QStyleOptionButton()
        control.initStyleOption(option)
        contents = control.style().subElementRect(QStyle.SubElement.SE_PushButtonContents, option, control)
        assert contents.width() >= 8 and contents.height() >= 8, ('zoom content bounds', contents)

if 'source-outline' in checks:
    class SourceTreeItem(QWidget):
        pass
    row = SourceTreeItem()
    row_layout = QHBoxLayout(row)
    row_layout.setContentsMargins(0, 0, 0, 0)
    row_layout.setSpacing(0)
    row_layout.addWidget(QLabel('Source name'))
    toggles = []
    for kind in ['visibility', 'lock']:
        toggle = QCheckBox()
        toggle.setProperty('class', ['checkbox-icon', 'indicator-' + kind])
        toggle.setSizePolicy(QSizePolicy.Policy.Maximum, QSizePolicy.Policy.Preferred)
        row_layout.addWidget(toggle)
        toggles.append(toggle)
    # Native SourceTree rows can remain 14px high even as OBS padding grows.
    # The generic density-scaled indicator and its border overflow that slot.
    row.setFixedSize(270, 14)
    row.show()
    app.processEvents()
    for toggle in toggles:
        for checked in [False, True]:
            toggle.setChecked(checked)
            opt = QStyleOptionButton()
            toggle.initStyleOption(opt)
            indicator = toggle.style().subElementRect(QStyle.SubElement.SE_CheckBoxIndicator, opt, toggle)
            assert indicator.width() >= 14 and indicator.height() >= 14, ('source indicator missing', indicator)
            assert toggle.rect().contains(indicator), ('source indicator clipping',
                toggle.property('class'), checked, toggle.rect(), indicator)
            assert row.rect().contains(toggle.geometry()), ('source toggle row clipping', toggle.geometry())

if 'source-context' in checks:
    context = QFrame()
    context.setObjectName('contextContainer')
    context_layout = QVBoxLayout(context)
    # OBSBasic.ui gives these buttons resource QIcons, with neither an icon
    # class nor themeID. Seed the same dark-ink failure, not a styled icon-plus.
    controls = []
    for name, glyph in [('sourcePropertiesButton', 'cogs'), ('sourceFiltersButton', 'filter')]:
        control = QPushButton(context)
        control.setObjectName(name)
        control.setIcon(QIcon(os.path.join(payload['root'],
            'icons/colorway/mingcute/selected/' + glyph + '.svg')))
        control.setCheckable(True)
        control.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        control.setFixedSize(120, 40)
        context_layout.addWidget(control)
        controls.append(control)
    context.show()
    app.processEvents()
    is_light = bool(re.search(r"dark:\s*'false'", payload.get('variant', '')))
    is_fairyfloss = token('--primary').lower() == '#ad5877'
    for control in controls:
        for state in ['normal', 'hover', 'pressed', 'checked', 'checked-hover']:
            # Independent explicit expectations for these three palette fixtures.
            light_ink = not is_light if state in ['normal', 'hover'] else (is_light or is_fairyfloss)
            if state == 'checked-hover':
                light_ink = False
            expected = '#e0def4' if light_ink else '#191724'
            # Explicit style states avoid dependence on offscreen window-manager
            # pointer routing, and exercise Qt's render-time icon substitution.
            option = QStyleOptionButton()
            option.initFrom(control)
            option.rect = QRect(0, 0, 120, 40)
            option.state = QStyle.StateFlag.State_Enabled | QStyle.StateFlag.State_Active
            if state in ['hover', 'checked-hover']:
                option.state |= QStyle.StateFlag.State_MouseOver
            if state == 'pressed':
                option.state |= QStyle.StateFlag.State_Sunken
            if state in ['checked', 'checked-hover']:
                option.state |= QStyle.StateFlag.State_On
            option.icon = control.icon()
            option.iconSize = QSize(16, 16)
            image = QImage(120, 40, QImage.Format.Format_ARGB32)
            image.fill(Qt.GlobalColor.transparent)
            painter = QPainter(image)
            control.style().drawControl(QStyle.ControlElement.CE_PushButton, option, painter, control)
            painter.end()
            count = sum(image.pixelColor(x, y).name() == expected
                        for y in range(image.height())
                        for x in range(image.width() // 2 - 12, image.width() // 2 + 12))
            assert count >= 5, ('source context icon', control.objectName(), state, expected, count)

if 'control-glyphs' in checks:
    # OBS Settings can compress spinboxes to 20px despite larger size hints.
    # Subcontrol rectangles must never collide at that actual height.
    for widget_type in [QSpinBox, QDoubleSpinBox]:
        for height in [20, 24, 28]:
            field = widget_type()
            field.setFixedSize(240, height)
            field.show()
            app.processEvents()
            option = QStyleOptionSpinBox()
            field.initStyleOption(option)
            upper = field.style().subControlRect(QStyle.ComplexControl.CC_SpinBox, option,
                                                  QStyle.SubControl.SC_SpinBoxUp, field)
            lower = field.style().subControlRect(QStyle.ComplexControl.CC_SpinBox, option,
                                                  QStyle.SubControl.SC_SpinBoxDown, field)
            assert not upper.intersects(lower), ('spinbox button overlap', widget_type.__name__,
                                                  height, upper, lower)
            assert field.rect().contains(upper) and field.rect().contains(lower), (
                'spinbox button clipped', widget_type.__name__, height, upper, lower)

    # Replay Buffer uses a checkable QGroupBox, not a QCheckBox. An
    # unchecked header must not show the check stroke baked into the
    # MingCute checkbox_line SVG; a checked header needs an accent frame.
    header = QGroupBox('Replay Buffer')
    header.setCheckable(True)
    header.setFixedSize(260, 50)
    header.show()
    for checked in [False, True]:
        header.setChecked(checked)
        app.processEvents()
        option = QStyleOptionGroupBox()
        header.initStyleOption(option)
        rect = header.style().subControlRect(QStyle.ComplexControl.CC_GroupBox, option,
                                             QStyle.SubControl.SC_GroupBoxCheckBox, header)
        rendered = header.grab().toImage()
        colors = []
        for y in range(max(0, rect.top()), min(rendered.height(), rect.bottom() + 1)):
            for x in range(max(0, rect.left()), min(rendered.width(), rect.right() + 1)):
                colors.append(rendered.pixelColor(x, y).name())
        if checked:
            assert colors.count(QColor(token('--primary')).name()) >= 4, (
                'checked group indicator missing accent outline', colors[:30])
        else:
            assert colors.count(QColor(token('--text')).name()) == 0, (
                'unchecked group indicator has a check glyph', colors.count(QColor(token('--text')).name()))

if 'output-track-radio-shape' in checks:
    # OBS Output > Simple > Recording uses QRadioButton simpleFlvTrack1..6
    # in the *visible* simpleFlvTracks stack, not the hidden simpleRecTracks
    # QCheckBox controls. Test exactly that native class and parent hierarchy.
    class OBSBasicSettings(QDialog):
        pass
    dialog = OBSBasicSettings()
    main = QVBoxLayout(dialog)
    panel = QGroupBox('Recording', dialog)
    main.addWidget(panel)
    track_row = QHBoxLayout(panel)
    radio_buttons = []
    for index in range(1, 7):
        radio = QRadioButton(str(index), panel)
        radio.setObjectName('simpleFlvTrack' + str(index))
        radio.setFixedSize(38, 26)
        track_row.addWidget(radio)
        radio_buttons.append(radio)
    radio_buttons[0].setChecked(True)
    dialog.resize(400, 110)
    dialog.show()
    app.processEvents()
    for radio in radio_buttons:
        option = QStyleOptionButton()
        radio.initStyleOption(option)
        bounds = radio.style().subElementRect(QStyle.SubElement.SE_RadioButtonIndicator,
                                               option, radio)
        assert bounds.width() > 10 and bounds.height() > 10, ('unexpected radio bounds', bounds)
        rendered = radio.grab().toImage()
        corner = rendered.pixelColor(bounds.x() + 1, bounds.y() + 1)
        side = rendered.pixelColor(bounds.x(), bounds.y() + bounds.height() // 2)
        contrast = sum(abs(a-b) for a, b in zip(corner.getRgb()[:3], side.getRgb()[:3]))
        assert contrast >= 65, ('OBS Audio Track radio indicator still square',
                                radio.objectName(), contrast, corner.name(), side.name())
    dialog.close()

if 'transition-dock-combo-height' in checks:
    # The actual OBS main-window selector is QComboBox#transitions inside
    # QFrame#transitionsFrame inside OBSDock#transitionsDock.
    class OBSDock(QFrame):
        pass
    dock = OBSDock()
    dock.setObjectName('transitionsDock')
    dock_layout = QVBoxLayout(dock)
    transitions_frame = QFrame(dock)
    transitions_frame.setObjectName('transitionsFrame')
    dock_layout.addWidget(transitions_frame)
    frame_layout = QVBoxLayout(transitions_frame)
    transitions = QComboBox(transitions_frame)
    transitions.setObjectName('transitions')
    transitions.addItems(['Fade', 'Cut'])
    frame_layout.addWidget(transitions)
    ordinary = QComboBox(dock)
    ordinary.setObjectName('unrelatedCombo')
    dock_layout.addWidget(ordinary)
    class OBSPreviewScalingComboBox(QComboBox):
        pass
    preview_scale = OBSPreviewScalingComboBox(dock)
    preview_scale.setObjectName('previewScalingMode')
    preview_scale.addItems(['Scale to Window', 'Canvas', 'Output'])
    preview_scale.setMinimumHeight(16)
    dock_layout.addWidget(preview_scale)
    dock.show()
    app.processEvents()
    required = max(24, transitions.fontMetrics().height() + 8)
    assert transitions.minimumHeight() >= required, (
        'Scene Transitions dropdown minimum height', transitions.minimumHeight(),
        transitions.sizeHint().height(), required)
    assert ordinary.minimumHeight() >= required, (
        'ordinary OBS dropdown still has a collapsing minimum', ordinary.minimumHeight(), required)
    assert preview_scale.minimumHeight() == 16, (
        'compact preview scaling selector was enlarged', preview_scale.minimumHeight())
    dock.close()

if 'control-polish' in checks:
    # At 16–20px, a 5px radius looks almost square. Require a clearly
    # transparent/parent-filled diagonal corner, not merely a radius declaration.
    checkbox = QCheckBox('Track 1')
    checkbox.setFixedSize(100, 23)
    checkbox.show()
    app.processEvents()
    option = QStyleOptionButton()
    checkbox.initStyleOption(option)
    rect = checkbox.style().subElementRect(QStyle.SubElement.SE_CheckBoxIndicator, option, checkbox)
    pixels = checkbox.grab().toImage()
    corner = pixels.pixelColor(rect.x() + 1, rect.y() + 1)
    surface = pixels.pixelColor(checkbox.width() - 1, checkbox.height() - 1)
    separation = sum(abs(a-b) for a, b in zip(corner.getRgb()[:3], surface.getRgb()[:3]))
    assert separation < 30, ('checkbox corner is visually square', separation, corner.name(), surface.name())

    # This is the actual 20px OBS compact control, not just an SVG snapshot.
    # The old 24x24 source paths rasterize down to barely four pixels across.
    spin = QSpinBox()
    spin.setFixedSize(260, 20)
    spin.show()
    app.processEvents()
    pixels = spin.grab().toImage()
    polarity = 'selected' if '/selected/' in token('--cw_spin_chevron_up') else 'normal'
    color = QColor('#191724' if polarity == 'selected' else '#e0def4')
    bounds = []
    for top, bottom in [(0, 10), (10, 20)]:
        marks = [(x, y) for y in range(top, bottom) for x in range(244, 259)
                 if sum(abs(a - b) for a, b in zip(
                     pixels.pixelColor(x, y).getRgb()[:3], color.getRgb()[:3])) < 85]
        span = max((x for x, y in marks), default=-1) - min((x for x, y in marks), default=0) + 1
        assert len(marks) >= 6 and span >= 6, ('tiny asymmetric spinbox chevron', top, len(marks), span)
        bounds.append((min(x for x, y in marks), max(x for x, y in marks), span))
    assert abs(bounds[0][2] - bounds[1][2]) <= 1, ('spin chevrons unequal', bounds)

if 'hover-feedback' in checks:
    # Compare final Qt-rasterized appearance rather than only QSS declarations.
    # The no-op generated icon tool styles used to paint the same pixels
    # for normal and hovered states (checked and unchecked).
    hover_host = QWidget()
    hover_host.setFixedSize(280, 300)
    hover_layout = QVBoxLayout(hover_host)
    hover_widgets = []
    for name in ('classed-tool', 'theme-id-tool', 'combo', 'line'):
        if name in ('classed-tool', 'theme-id-tool'):
            widget = QToolButton(hover_host)
            widget.setText(name)
            widget.setCheckable(True)
            if name == 'classed-tool':
                widget.setProperty('class', ['icon-plus'])
            else:
                widget.setProperty('themeID', 'addIconSmall')
        elif name == 'combo':
            widget = QComboBox(hover_host)
            widget.addItems(['One', 'Two'])
        else:
            widget = QLineEdit('Input', hover_host)
        widget.setFixedSize(190, 38)
        hover_layout.addWidget(widget)
        hover_widgets.append((name, widget))
    # The rest of this probe already has visible top-level windows at (0,0).
    # Put the hover fixture elsewhere and bring it forward, or Qt directs
    # QTest.mouseMove to the obscuring window and silently reports no hover.
    hover_host.move(410, 180)
    hover_host.show()
    hover_host.raise_()
    hover_host.activateWindow()
    app.processEvents()
    for name, widget in hover_widgets:
        for checked in ([False, True] if isinstance(widget, QToolButton) else [False]):
            if isinstance(widget, QToolButton):
                widget.setChecked(checked)
            QTest.mouseMove(hover_host, QPoint(275, 295))
            app.processEvents()
            normal = widget.grab().toImage()
            QTest.mouseMove(widget, QPoint(widget.width() // 2, widget.height() // 2))
            app.processEvents()
            assert widget.underMouse(), ('Qt hover fixture did not receive pointer', name)
            hovered = widget.grab().toImage()
            changed = sum(
                sum(abs(a - b) for a, b in zip(
                    normal.pixelColor(x, y).getRgb()[:3],
                    hovered.pixelColor(x, y).getRgb()[:3])) > 15
                for y in range(widget.height())
                for x in range(widget.width()))
            assert changed >= 40, ('hover is visually unchanged', name, checked, changed)
    hover_host.close()

print(json.dumps({'qt': 'passed', 'icon_states': ['normal', 'pressed', 'checked', 'checked-hover', 'checked-tool'],
                  'combo_focus_border': border, 'scroll_page': page_color,
                  'group_frame_top': frame.top()}))
