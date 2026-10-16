// Linux/Qt6 runtime observation for the separate OBS native smoke test.
// Interpose QApplication::setStyleSheet in the isolated subprocess only.
// Does not patch OBS, modify its installed files, or replace stylesheet content.
#include <QString>
#include <QByteArray>
#include <cstdio>
#include <cstdlib>
#include <dlfcn.h>

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
}
