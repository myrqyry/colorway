// Linux/Qt6 runtime observation for the separate OBS native smoke test.
// Interpose QApplication::setStyleSheet in the isolated subprocess only.
// Does not patch OBS, modify its installed files, or replace stylesheet content.
#include <QString>
#include <QByteArray>
#include <cstdio>
#include <cstdlib>
#include <dlfcn.h>
#include <QApplication>
#include <QPushButton>
#include <QTimer>
#include <QStyleOptionButton>
#include <QPainter>
#include <QFile>
#include <QTextStream>
#include <QCheckBox>
#include <QJsonDocument>
#include <QJsonObject>
#include <QRegularExpression>
#include "obs-filters-style-probe.hpp"

static QString classesOf(QWidget *widget) {
  return widget->property("class").toStringList().join(' ');
}

// Exercise the state consumers on the real mixer controls without emitting
// clicked(), changing OBS mute/monitor routing, or starting an output.
static void captureMixerAndZoom() {
  const char *path = std::getenv("COLORWAY_MIXER_CAPTURE");
  if (!path) return;
  const auto expected = QJsonDocument::fromJson(qgetenv("COLORWAY_MIXER_EXPECTED")).object();
  const QString assets = QString::fromUtf8(std::getenv("COLORWAY_NATIVE_ASSETS"));
  const QColor background(expected["background"].toString());
  QFile report(QString::fromUtf8(path));
  if (!report.open(QIODevice::WriteOnly | QIODevice::Text)) return;
  QTextStream out(&report);
  for (const QString kind : {QString("mute"), QString("monitor")}) {
    QPushButton *button = nullptr;
    for (auto *widget : QApplication::allWidgets())
      if (classesOf(widget).split(' ').contains("btn-" + kind))
        if (auto *candidate = qobject_cast<QPushButton *>(widget)) { button = candidate; break; }
    if (!button) { out << "FAIL missing native mixer " << kind << '\n'; continue; }
    const QVariant oldClass = button->property("class");
    const bool oldChecked = button->isChecked();
    const QStringList modes = kind == "mute" ? QStringList{"normal", "checked", "warning", "warning-checked", "legacy-warning"}
                                             : QStringList{"normal", "checked"};
    for (const QString &mode : modes) {
      const bool checked = mode.contains("checked");
      const bool warning = mode.contains("warning");
      const QString key = warning ? "warning" : checked ? (kind == "mute" ? "muted" : "monitor")
                                                           : (kind == "mute" ? "unmuted" : "monitorOff");
      const QIcon referenceIcon(assets + '/' + expected[key].toString());
      if (referenceIcon.isNull()) { out << "FAIL missing reference " << key << '\n'; continue; }
      for (const QString state : {QString("idle"), QString("hover"), QString("pressed")}) {
        QString classes = "btn-" + kind;
        if (checked) classes += " checked";
        if (warning) classes += mode == "legacy-warning" ? " mute-unassigned" : " mute-warning";
        if (state != "idle") classes += " hover";
        button->setChecked(checked);
        button->setProperty("class", classes);
        button->style()->unpolish(button);
        button->style()->polish(button);
        QStyleOptionButton opt;
        opt.initFrom(button);
        opt.state = QStyle::State_Enabled | QStyle::State_Active;
        if (checked) opt.state |= QStyle::State_On;
        if (state != "idle") opt.state |= QStyle::State_MouseOver;
        if (state == "pressed") opt.state |= QStyle::State_Sunken;
        opt.icon = button->icon();
        opt.iconSize = button->iconSize();
        QImage image(button->size(), QImage::Format_ARGB32);
        image.fill(background);
        QPainter painter(&image);
        button->style()->drawControl(QStyle::CE_PushButton, &opt, &painter, button);
        painter.end();
        const int size = button->iconSize().width();
        QImage reference(size, size, QImage::Format_ARGB32);
        reference.fill(background);
        QPainter referencePainter(&reference);
        referenceIcon.paint(&referencePainter, reference.rect());
        referencePainter.end();
        int best = size * size;
        for (int dx = -1; dx <= 1; ++dx) for (int dy = -1; dy <= 1; ++dy) {
          int differences = 0;
          for (int y = 2; y < size - 2; ++y) for (int x = 2; x < size - 2; ++x) {
            const QColor a = image.pixelColor((image.width()-size)/2+x+dx, (image.height()-size)/2+y+dy);
            const QColor b = reference.pixelColor(x, y);
            if (qMax(qAbs(a.red()-b.red()), qMax(qAbs(a.green()-b.green()), qAbs(a.blue()-b.blue()))) > 12) ++differences;
          }
          best = qMin(best, differences);
        }
        out << (best <= 4 && size >= 12 ? "PASS " : "FAIL ") << "mixer " << kind << ' ' << mode << ' ' << state << " differences=" << best << '\n';
        image.save(QString::fromUtf8(path) + '.' + kind + '.' + mode + '.' + state + ".png");
      }
    }
    button->setChecked(oldChecked);
    button->setProperty("class", oldClass);
    button->style()->unpolish(button);
    button->style()->polish(button);
  }
  for (const QString kind : {QString("plus"), QString("minus")}) {
    const QString id = kind == "plus" ? "previewZoomInButton" : "previewZoomOutButton";
    for (auto *widget : QApplication::allWidgets()) {
      if (widget->objectName() != id) continue;
      auto *button = qobject_cast<QPushButton *>(widget);
      if (!button) continue;
      const QImage image = button->grab().toImage();
      QFile svg(assets + '/' + expected["zoom-" + kind].toString());
      svg.open(QIODevice::ReadOnly);
      const auto match = QRegularExpression("stroke=\"(#[a-fA-F0-9]{6})\"").match(QString::fromUtf8(svg.readAll()));
      const QColor ink(match.captured(1));
      int opaque = 0;
      for (int y = image.height()/2-4; y < image.height()/2+4; ++y)
        for (int x = image.width()/2-4; x < image.width()/2+4; ++x)
          if (image.pixelColor(x,y) == ink) ++opaque;
      const bool fits = button->size() == QSize(20,16);
      out << (opaque >= 6 && fits && ink.isValid() ? "PASS " : "FAIL ") << "zoom " << kind << " opaque=" << opaque << " size=" << image.width() << 'x' << image.height() << '\n';
      image.save(QString::fromUtf8(path) + ".zoom-" + kind + ".png");
    }
  }
}

static void addSourceBoundsFixture() {
  using GetScene = void *(*)();
  using FromSource = void *(*)(void *);
  using CreateSource = void *(*)(const char *, const char *, void *, void *);
  using AddSource = void *(*)(void *, void *);
  using Release = void (*)(void *);
  auto get = reinterpret_cast<GetScene>(dlsym(RTLD_DEFAULT, "obs_frontend_get_current_scene"));
  auto from = reinterpret_cast<FromSource>(dlsym(RTLD_DEFAULT, "obs_scene_from_source"));
  auto create = reinterpret_cast<CreateSource>(dlsym(RTLD_DEFAULT, "obs_source_create"));
  auto add = reinterpret_cast<AddSource>(dlsym(RTLD_DEFAULT, "obs_scene_add"));
  auto release = reinterpret_cast<Release>(dlsym(RTLD_DEFAULT, "obs_source_release"));
  if (!get || !from || !create || !add || !release) return;
  void *scene = get();
  if (!scene) return;
  void *source = create("color_source_v3", "Colorway icon bounds probe", nullptr, nullptr);
  if (source) { add(from(scene), source); release(source); }
  release(scene);
}

static void captureSourceBounds() {
  const char *path = std::getenv("COLORWAY_SOURCE_CAPTURE");
  if (!path) return;
  QFile report(QString::fromUtf8(path));
  if (!report.open(QIODevice::WriteOnly | QIODevice::Text)) return;
  QTextStream out(&report);
  int found = 0;
  for (auto *widget : QApplication::allWidgets()) {
    auto *box = qobject_cast<QCheckBox *>(widget);
    if (!box) continue;
    const QString classes = box->property("class").toStringList().join(' ') + box->property("class").toString();
    if (!classes.contains("indicator-visibility") && !classes.contains("indicator-lock")) continue;
    ++found;
    box->setFocus();
    QStyleOptionButton opt;
    opt.initFrom(box);
    opt.state |= QStyle::State_On | QStyle::State_HasFocus | QStyle::State_MouseOver;
    QRect indicator = box->style()->subElementRect(QStyle::SE_CheckBoxIndicator, &opt, box);
    const bool fits = box->rect().contains(indicator) && box->parentWidget()
      && box->parentWidget()->rect().contains(box->geometry());
    const QString kind = classes.contains("indicator-visibility") ? "visibility" : "lock";
    out << (fits ? "PASS " : "FAIL ") << kind << " indicator bounds widget=" << box->width() << 'x' << box->height()
        << " hint=" << box->sizeHint().width() << 'x' << box->sizeHint().height()
        << " indicator=" << indicator.x() << ',' << indicator.y() << ','
        << indicator.width() << ',' << indicator.height() << '\n';
    box->grab().save(QString::fromUtf8(path) + "." + kind + ".png");
    if (box->parentWidget()) box->parentWidget()->grab().save(QString::fromUtf8(path) + ".row.png");
  }
  if (found < 2) out << "FAIL missing native source visibility/lock controls\n";
}

// Opt-in probe of the actual OBSBasic.ui controls in the disposable smoke-test
// process. Paint with their native resource QIcon and effective QSS; no user
// process or configuration is inspected or changed.
static void captureContextButtons() {
  const char *path = std::getenv("COLORWAY_CONTEXT_CAPTURE");
  if (!path) return;
  QFile report(QString::fromUtf8(path));
  if (!report.open(QIODevice::WriteOnly | QIODevice::Text)) return;
  QTextStream out(&report);
  for (const char *name : {"sourcePropertiesButton", "sourceFiltersButton"}) {
    QPushButton *button = nullptr;
    for (auto *widget : QApplication::allWidgets()) {
      if (widget->objectName() == name) button = qobject_cast<QPushButton *>(widget);
    }
    if (!button) { out << "FAIL missing " << name << '\n'; continue; }
    out << name << " class=" << button->property("class").toString()
        << " themeID=" << button->property("themeID").toString() << '\n';
    for (const char *state : {"normal", "hover", "pressed", "checked", "checked-hover"}) {
      QStyleOptionButton opt;
      opt.initFrom(button);
      opt.rect = QRect(0, 0, 160, 40);
      opt.state = QStyle::State_Enabled | QStyle::State_Active;
      const QByteArray mode(state);
      if (mode.contains("hover")) opt.state |= QStyle::State_MouseOver;
      if (mode == "pressed") opt.state |= QStyle::State_Sunken;
      if (mode.startsWith("checked")) opt.state |= QStyle::State_On;
      opt.icon = button->icon();
      opt.iconSize = QSize(16, 16);
      QImage image(160, 40, QImage::Format_ARGB32);
      image.fill(Qt::transparent);
      QPainter painter(&image);
      button->style()->drawControl(QStyle::CE_PushButton, &opt, &painter, button);
      painter.end();
      const char *ink = mode == "checked-hover" ? "#191724" : std::getenv(
        mode == "normal" || mode == "hover" ? "COLORWAY_CONTEXT_INK" : "COLORWAY_CONTEXT_ACTIVE_INK");
      QColor expected(QString::fromUtf8(ink ? ink : "#e0def4"));
      int count = 0;
      for (int y = 0; y < image.height(); ++y)
        for (int x = 68; x < 92; ++x)
          if (image.pixelColor(x, y) == expected) ++count;
      image.save(QString::fromUtf8(path) + "." + name + "." + state + ".png");
      out << (count >= 5 ? "PASS " : "FAIL ") << name << ' ' << state
          << " ink=" << expected.name() << " pixels=" << count << '\n';
    }
  }
}

extern "C" void _ZN12QApplication13setStyleSheetERK7QString(void *app, const QString &source) {
  using Original = void (*)(void *, const QString &);
  static Original call = reinterpret_cast<Original>(
    dlsym(RTLD_NEXT, "_ZN12QApplication13setStyleSheetERK7QString"));
  if (!call) std::abort();

  if (!source.isEmpty()) {
    const char *path = std::getenv("COLORWAY_QSS_CAPTURE");
    if (path) {
      const QByteArray utf8 = source.toUtf8();
      if (FILE *file = std::fopen(path, "wb")) {
        std::fwrite(utf8.constData(), 1, static_cast<size_t>(utf8.size()), file);
        std::fclose(file);
      }
    }
  }
  call(app, source);
  static bool scheduled = false;
  if (!scheduled && !source.isEmpty() && std::getenv("COLORWAY_CONTEXT_CAPTURE")) {
    scheduled = true;
    QTimer::singleShot(5000, qApp, captureContextButtons);
    if (std::getenv("COLORWAY_MIXER_CAPTURE")) QTimer::singleShot(6000, qApp, captureMixerAndZoom);
    if (std::getenv("COLORWAY_FILTERS_CAPTURE")) {
      QTimer::singleShot(7000, qApp, openFiltersFixture);
      QTimer::singleShot(8500, qApp, captureFiltersFixture);
    }
    if (std::getenv("COLORWAY_SOURCE_CAPTURE")) {
      QTimer::singleShot(2500, qApp, addSourceBoundsFixture);
      QTimer::singleShot(5500, qApp, captureSourceBounds);
    }
  }
}
