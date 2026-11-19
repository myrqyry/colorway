// Capture the real OBS main window in a disposable X11 session.
// Only loaded in the preview subprocess, never into the user's OBS instance.
#include <QApplication>
#include <QMainWindow>
#include <QScreen>
#include <QTimer>
#include <QFile>
#include <QCheckBox>
#include <QDockWidget>
#include <QJsonDocument>
#include <QJsonObject>
#include <QRegularExpression>
#include <QImage>
#include <QCursor>
#include <dlfcn.h>
#include <cstdlib>

static void addFixture() {
  using GetScene = void *(*)();
  using FromSource = void *(*)(void *);
  using CreateData = void *(*)();
  using SetString = void (*)(void *, const char *, const char *);
  using SetBool = void (*)(void *, const char *, bool);
  using SetFlag = void (*)(void *, bool);
  using SetInt = void (*)(void *, const char *, long long);
  using CreateSource = void *(*)(const char *, const char *, void *, void *);
  using AddSource = void *(*)(void *, void *);
  using Release = void (*)(void *);
  auto get = reinterpret_cast<GetScene>(dlsym(RTLD_DEFAULT,"obs_frontend_get_current_scene"));
  auto from = reinterpret_cast<FromSource>(dlsym(RTLD_DEFAULT,"obs_scene_from_source"));
  auto data = reinterpret_cast<CreateData>(dlsym(RTLD_DEFAULT,"obs_data_create"));
  auto setInt = reinterpret_cast<SetInt>(dlsym(RTLD_DEFAULT,"obs_data_set_int"));
  auto setString = reinterpret_cast<SetString>(dlsym(RTLD_DEFAULT,"obs_data_set_string"));
  auto setBool = reinterpret_cast<SetBool>(dlsym(RTLD_DEFAULT,"obs_data_set_bool"));
  auto lock = reinterpret_cast<SetFlag>(dlsym(RTLD_DEFAULT,"obs_sceneitem_set_locked"));
  auto mute = reinterpret_cast<SetFlag>(dlsym(RTLD_DEFAULT,"obs_source_set_muted"));
  auto create = reinterpret_cast<CreateSource>(dlsym(RTLD_DEFAULT,"obs_source_create"));
  auto add = reinterpret_cast<AddSource>(dlsym(RTLD_DEFAULT,"obs_scene_add"));
  auto release = reinterpret_cast<Release>(dlsym(RTLD_DEFAULT,"obs_source_release"));
  auto releaseData = reinterpret_cast<Release>(dlsym(RTLD_DEFAULT,"obs_data_release"));
  if (!get || !from || !data || !setInt || !create || !add || !release || !releaseData) return;
  void *scene = get();
  if (!scene) return;
  // Only synthetic color sources; no cameras, microphones or personal scenes.
  for (const auto &name : {"Background", "Overlay"}) {
    void *settings = data();
    setInt(settings,"color",0xff302a26);
    setInt(settings,"width",name == QString("Background") ? 1920 : 320);
    setInt(settings,"height",name == QString("Background") ? 1080 : 180);
    if (void *source = create("color_source_v3",name,settings,nullptr)) {
      if(auto *item=add(from(scene),source);item && lock) lock(item,true);
      release(source);
    }
    releaseData(settings);
  }
  // A muted, local silent file exposes the real mixer controls without
  // accessing any audio device, network stream, or user media.
  if(setString && setBool && mute){
    void *settings=data();
    setString(settings,"local_file",qgetenv("COLORWAY_SILENCE").constData());
    setBool(settings,"is_local_file",true);
    setBool(settings,"looping",true);
    if(void *source=create("ffmpeg_source","Audio sample",settings,nullptr)){
      mute(source,true);add(from(scene),source);release(source);
    }
    releaseData(settings);
  }
  release(scene);
}

static void capture() {
  QMainWindow *main = nullptr;
  for(auto *w: QApplication::topLevelWidgets())
    if(auto *m=qobject_cast<QMainWindow *>(w);m && m->isVisible() && m->findChild<QDockWidget *>("sourcesDock")) {main=m;break;}
  static int attempts=0;
  if(!main || QApplication::activeModalWidget()) {
    if(++attempts<80) QTimer::singleShot(200,qApp,capture);
    else qApp->exit(3);
    return;
  }
  static bool prepared=false;
  if(!prepared){
    prepared=true;
    main->move(0,0);
    main->resize(1280,960);
    addFixture();
    main->raise();
    QCursor::setPos(1279,959);
    QTimer::singleShot(900,qApp,capture);
    return;
  }
  const QString qss=qApp->styleSheet();
  const int icons=qss.count(QStringLiteral("url(theme:icons/colorway/mingcute/"));
  const QString expected=QString::fromUtf8(qgetenv("COLORWAY_EXPECTED_COLOR"));
  const auto path=QString::fromUtf8(qgetenv("COLORWAY_SCREENSHOT"));
  int visibleIndicators=0;
  for(auto *w: main->findChildren<QCheckBox *>()){
    const QString cls=w->property("class").toStringList().join(' ')+w->property("class").toString();
    if(w->isVisible() && (cls.contains("indicator-visibility") || cls.contains("indicator-lock"))) ++visibleIndicators;
  }
  if(icons<100 || expected.isEmpty() || !qss.contains(expected,Qt::CaseInsensitive) ||
     qss.contains(QRegularExpression("var\\(--[A-Za-z0-9_]+\\)")) || visibleIndicators<2){
    qWarning("Capture theme validation failed: refs=%d indicators=%d",icons,visibleIndicators);
    qApp->exit(4);return;
  }
  // X11 screenshot includes the OpenGL preview and actual displayed children.
  const QImage im=main->screen()->grabWindow(main->winId()).toImage();
  if(im.width()<1000 || im.height()<700 || !im.save(path+".png")){qApp->exit(5);return;}
  QFile report(path+".json");
  if(!report.open(QIODevice::WriteOnly)){qApp->exit(6);return;}
  report.write(QJsonDocument(QJsonObject{{"iconRefs",icons},{"visibleIndicators",visibleIndicators},
    {"width",im.width()},{"height",im.height()}}).toJson());
  report.close();
  qApp->quit();
}
extern "C" void _ZN12QApplication13setStyleSheetERK7QString(void *app,const QString &source){
  using Original=void(*)(void *,const QString &);
  static auto call=reinterpret_cast<Original>(dlsym(RTLD_NEXT,"_ZN12QApplication13setStyleSheetERK7QString"));
  if(!call)std::abort();
  call(app,source);
  static bool scheduled=false;
  if(!scheduled && !source.isEmpty() && !qgetenv("COLORWAY_SCREENSHOT").isEmpty()){
    scheduled=true;
    QTimer::singleShot(800,qApp,capture);
  }
}
