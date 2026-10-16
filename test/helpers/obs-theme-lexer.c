// Inspect Colorway values using libobs' actual C-family lexer.
// OBSApp_Themes.cpp consumes only the first value token for string variables.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <obs/util/cf-parser.h>

int main(void) {
  char *source = NULL;
  size_t allocated = 0, n = 0;
  int count = 0, unquoted = 0, quoted = 0, invalid = 0;
  int ch;
  while ((ch = getchar()) != EOF) {
    if (n + 2 > allocated) {
      allocated = allocated ? allocated * 2 : 65536;
      char *next = realloc(source, allocated);
      if (!next) return 3;
      source = next;
    }
    source[n++] = (char)ch;
  }
  if (!source) return 3;
  source[n] = 0;
  struct cf_parser p;
  cf_parser_init(&p);
  if (!cf_parser_parse(&p, source, "Colorway themes")) {
    fprintf(stderr, "libobs lexer failed\n");
    free(source);
    return 3;
  }
  int inVars = 0;
  while (p.cur_token->type != CFTOKEN_NONE) {
    if (cf_token_is(&p, "@")) {
      struct cf_token peek;
      if (cf_peek_token(&p, &peek) && strref_cmp(&peek.str, "OBSThemeVars") == 0) inVars = 1;
    } else if (inVars && cf_token_is(&p, "}")) {
      inVars = 0;
    } else if (inVars && cf_token_is(&p, ":")) {
      if (!cf_next_token(&p)) break;
      // Only property values preceded by a colon inside @OBSThemeVars.
      const char *first = p.cur_token->str.array;
      size_t len = p.cur_token->str.len;
      int type = p.cur_token->type;
      if (type == CFTOKEN_STRING) {
        // OBS converts quoted values to complete QSS strings.
        if (len >= 6 && (strncmp(first + 1, "url(", 4) == 0 || strncmp(first + 1, "rgba(", 5) == 0)) {
          quoted++;
        }
      } else if ((len == 3 && strncmp(first, "url", 3) == 0)
              || (len == 4 && strncmp(first, "rgba", 4) == 0)) {
        unquoted++;
      }
      count++;
    }
    p.cur_token++;
  }
  cf_parser_free(&p);
  free(source);
  printf("libobs lexer: values=%d quoted_functions=%d invalid_unquoted_functions=%d\n",
      count, quoted, unquoted);
  return unquoted ? 2 : invalid ? 3 : 0;
}
