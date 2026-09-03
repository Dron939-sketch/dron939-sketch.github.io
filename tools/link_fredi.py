#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Разметка перехода в Фреди на страницах, куда идёт реклама.

    python3 tools/link_fredi.py --dry-run
    python3 tools/link_fredi.py

Зачем. 3 сентября посмотрел, куда приземляется реклама, и сверил с целями.
Тест PHQ-9 — 136 визитов в день, самый большой адрес в аккаунте. Переход с
него в Фреди не считался ничем: одна ссылка «Обсудить с Фреди» без цели.
То же на GAD-7, тестах на ревность и умение любить, /ii-kouch/, /ii-trener/,
/testy/ и — хуже всего — на /virtual-psychologist/, где одиннадцать ссылок
в Фреди и ни одной размеченной. Суммарно 345 рекламных визитов в сутки,
про которые нельзя сказать, доходит с них кто-нибудь до продукта или нет.

Дыра не только в отчётах. Кампании Директа оптимизируются по целям: то,
чего нет в Метрике, для стратегии не существует.

Что делает скрипт:

1. Ссылкам в теле страницы дописывает ?from=<адрес страницы>. Его читает
   fredi/openers.js и кладёт человеку три стартовых вопроса по той самой
   странице, с которой он пришёл, вместо общих. Реферер обычно доезжает и
   сам, но параметр переживает и вырезанный реферер, и переход из вкладки.
2. Ставит перед </body> общий обработчик: клик по любой ссылке на /fredi/
   шлёт две цели — свою для страницы и общую open_fredi. Обработчик
   делегированный, на document: шапка и подвал подгружаются позже через
   fetch, и повесить слушатель на их ссылки заранее нельзя.

Идемпотентен: помечает вставку комментарием и второй раз не добавляет.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# страница → короткое имя цели. Имена в одном стиле с уже заведёнными
# (natal_open_fredi, bigtest_open_fredi): <тема>_open_fredi.
PAGES = {
    "testy/depressiya-phq-9": "phq9",
    "testy/trevoga-gad-7": "gad7",
    "testy/test-na-revnost": "revnost",
    "testy/test-na-umenie-lyubit": "lyubit",
    "ii-kouch": "kouch",
    "ii-trener": "trener",
    "virtual-psychologist": "vp",
    "testy": "testy",
}

MARK = "<!-- fredi-track -->"
END = "<!-- /fredi-track -->"

# Ссылки шапки и подвала узнаём по инлайновому стилю запасной навигации:
# они ведут в Фреди из меню, и переписывать им адрес незачем — параметр
# from там соврёт, будто человек пришёл со страницы, которую не читал.
NAV_HINT = "font-size:.9rem"

SCRIPT = """%s
<script>
(function () {
  // Клик по любой ссылке на /fredi/ — это открытие продукта. Слушаем на
  // document: шапка и подвал приезжают позже через fetch, и их ссылок в
  // момент загрузки ещё нет.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="/fredi"]') : null;
    if (!a) return;
    try {
      ym(108138656, 'reachGoal', '%s_open_fredi');
      ym(108138656, 'reachGoal', 'open_fredi');
    } catch (err) {}
  }, true);
})();
</script>
%s""" % (MARK, "%s", END)


def body_fredi_links(s):
    """Ссылки на /fredi/ в содержимом, без запасной навигации шапки и подвала."""
    out = []
    for m in re.finditer(r'<a\b[^>]*href="(/fredi/[^"]*)"[^>]*>', s):
        if NAV_HINT in m.group(0):
            continue
        out.append(m)
    return out


def add_from(s, path):
    """Дописать ?from=<path> ссылкам в теле. Уже размеченные не трогаем."""
    n = 0
    # идём с конца, чтобы позиции ранних совпадений не съезжали
    for m in reversed(body_fredi_links(s)):
        href = m.group(1)
        if "from=" in href:
            continue
        sep = "&" if "?" in href else "?"
        new = href + sep + "from=" + path
        s = s[:m.start(1)] + new + s[m.end(1):]
        n += 1
    return s, n


def main():
    dry = "--dry-run" in sys.argv
    total_links = 0
    touched = 0

    for page, slug in sorted(PAGES.items()):
        f = os.path.join(ROOT, page, "index.html")
        if not os.path.exists(f):
            print("  НЕТ ФАЙЛА: %s" % page)
            continue
        s = io.open(f, encoding="utf-8").read()
        before = s
        path = "/%s/" % page

        s, n = add_from(s, path)
        total_links += n

        if MARK in s:
            script_note = "обработчик уже стоял"
        elif "</body>" not in s:
            print("  %s: нет </body> — пропускаю" % page)
            continue
        else:
            s = s.replace("</body>", (SCRIPT % slug) + "\n</body>", 1)
            script_note = "обработчик добавлен"

        if s != before:
            touched += 1
            if not dry:
                io.open(f, "w", encoding="utf-8").write(s)
        print("  %-30s from= на %d ссылок, %s → цель %s_open_fredi"
              % (page, n, script_note, slug))

    print("\nстраниц изменено: %d, ссылок размечено: %d" % (touched, total_links))
    print("цели завести в Метрике: %s"
          % ", ".join(sorted("%s_open_fredi" % v for v in PAGES.values())))
    if dry:
        print("БЕЗ ЗАПИСИ")


if __name__ == "__main__":
    main()
