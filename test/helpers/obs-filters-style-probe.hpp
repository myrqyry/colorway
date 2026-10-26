// Native-only disposable filter fixture. Included by the isolated OBS tracer;
// never loaded into the user's OBS process or configuration.
#include <QDialog>
#include <QSlider>
#include <QScrollArea>
#include <QStyleOptionSlider>
#include <QPalette>

static void openFiltersFixture() {
  using GetSource = void *(*)(const char *);
  using CreateSource = void *(*)(const char *, const char *, void *, void *);
  using AddFilter = void (*)(void *, void *);
  using Release = void (*)(void *);
  using Enumerate = bool (*)(size_t, const char **);
  auto get = reinterpret_cast<GetSource>(dlsym(RTLD_DEFAULT, "obs_get_source_by_name"));
  auto create = reinterpret_cast<CreateSource>(dlsym(RTLD_DEFAULT, "obs_source_create"));
  auto add = reinterpret_cast<AddFilter>(dlsym(RTLD_DEFAULT, "obs_source_filter_add"));
  auto release = reinterpret_cast<Release>(dlsym(RTLD_DEFAULT, "obs_source_release"));
  auto enumerate = reinterpret_cast<Enumerate>(dlsym(RTLD_DEFAULT, "obs_enum_filter_types"));
  if (!get || !create || !add || !release || !enumerate) return;
  void *source = get("Colorway icon bounds probe");
  if (!source) return;
  const char *id = nullptr;
  for (size_t i = 0; enumerate(i, &id); ++i) {
    if (!QString::fromUtf8(id).startsWith("color_filter")) continue;
    void *filter = create(id, "Colorway filter style probe", nullptr, nullptr);
    if (filter) { add(source, filter); release(filter); }
    break;
  }
  release(source);
  for (auto *widget : QApplication::allWidgets()) {
    if (widget->objectName() != "sourceFiltersButton") continue;
    if (auto *button = qobject_cast<QPushButton *>(widget)) { button->click(); break; }
  }
}

static QStyleOptionSlider sliderOption(QSlider *slider) {
  QStyleOptionSlider opt;
  opt.initFrom(slider);
  opt.orientation = slider->orientation();
  if (opt.orientation == Qt::Horizontal) opt.state |= QStyle::State_Horizontal;
  opt.subControls = QStyle::SC_All;
  opt.activeSubControls = QStyle::SC_None;
  opt.tickPosition = slider->tickPosition();
  opt.tickInterval = slider->tickInterval();
  opt.minimum = slider->minimum();
  opt.maximum = slider->maximum();
  opt.sliderPosition = slider->sliderPosition();
  opt.sliderValue = slider->value();
  opt.singleStep = slider->singleStep();
  opt.pageStep = slider->pageStep();
  opt.upsideDown = slider->invertedAppearance() != (slider->layoutDirection() == Qt::RightToLeft);
  return opt;
}

static void captureFiltersFixture() {
  const char *path = std::getenv("COLORWAY_FILTERS_CAPTURE");
  if (!path) return;
  QFile file(QString::fromUtf8(path));
  if (!file.open(QIODevice::WriteOnly | QIODevice::Text)) return;
  QTextStream out(&file);
  const auto expected = QJsonDocument::fromJson(qgetenv("COLORWAY_MIXER_EXPECTED")).object();
  const QColor background(expected["windowBackground"].toString());
  const QColor ink(expected["sliderInk"].toString());
  QWidget *dialog = nullptr;
  for (auto *widget : QApplication::topLevelWidgets())
    if (QString(widget->metaObject()->className()) == "OBSBasicFilters") { dialog = widget; break; }
  if (!dialog) { out << "FAIL missing native Filters dialog\n"; return; }
  dialog->grab().save(QString::fromUtf8(path) + ".window.png");
  out << "Filters palette=" << dialog->palette().color(QPalette::Window).name()
      << " expected=" << background.name() << '\n';
  for (auto *view : dialog->findChildren<QScrollArea *>()) {
    if (QString(view->metaObject()->className()) != "OBSPropertiesView" || !view->widget()) continue;
    auto *contents = view->widget();
    out << "Properties content palette=" << contents->palette().color(QPalette::Window).name()
        << " autofill=" << contents->autoFillBackground() << '\n';
    contents->grab().save(QString::fromUtf8(path) + ".properties.png");
  }
  out << "Filters widget tree:\n";
  for (auto *widget : dialog->findChildren<QWidget *>()) {
    QStringList parts;
    for (QWidget *w = widget; w && parts.size() < 6; w = w->parentWidget())
      parts.prepend(QString(w->metaObject()->className()) + '#' + w->objectName());
    out << "widget=" << parts.join('/')
        << " class=" << widget->metaObject()->className()
        << " palette=" << widget->palette().color(QPalette::Window).name()
        << " autofill=" << widget->autoFillBackground()
        << " geometry=" << widget->geometry().x() << ',' << widget->geometry().y() << ','
        << widget->geometry().width() << 'x' << widget->geometry().height() << '\n';
  }
  int index = 0;
  for (auto *slider : dialog->findChildren<QSlider *>()) {
    if (slider->orientation() != Qt::Horizontal || !slider->isVisible()) continue;
    const int oldValue = slider->value();
    for (const int value : {slider->minimum(), (slider->minimum()+slider->maximum())/2, slider->maximum()}) {
      slider->setValue(value);
      slider->clearFocus();
      slider->setAttribute(Qt::WA_UnderMouse, false);
      const auto opt = sliderOption(slider);
      const QRect handle = slider->style()->subControlRect(QStyle::CC_Slider, &opt, QStyle::SC_SliderHandle, slider);
      const QRect groove = slider->style()->subControlRect(QStyle::CC_Slider, &opt, QStyle::SC_SliderGroove, slider);
      const QImage image = slider->grab().toImage();
      out << "slider " << index << ' ' << slider->metaObject()->className() << " value=" << value
          << " widget=" << slider->width() << 'x' << slider->height()
          << " handle=" << handle.x() << ',' << handle.y() << ',' << handle.width() << ',' << handle.height()
          << " groove=" << groove.x() << ',' << groove.y() << ',' << groove.width() << ',' << groove.height() << '\n';
      image.save(QString::fromUtf8(path) + ".slider-" + QString::number(index) + '-' + QString::number(value) + ".png");
    }
    slider->setValue(oldValue);
    ++index;
  }
  if (!index) out << "FAIL missing native filter sliders\n";
}
