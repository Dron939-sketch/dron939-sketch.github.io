#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Двери на страницу девятого уровня — из курсов про мышление.

    python3 tools/link_uroven9.py --dry-run
    python3 tools/link_uroven9.py

Зачем. Статья «Понимание мира: девять уровней» и посадочная
/vizhu-zakonomernosti/ вышли 13.09.2026. На посадочную не ссылается
ничего, кроме самой статьи: проверка `grep -rl vizhu-zakonomernosti`
14.09 дала четыре файла, из них два — она сама и sitemap. Кампания
«ЦА · девятые и десятые уровни» стоит остановленной, то есть входов у
страницы нет вообще.

Человек девятого уровня сидит не в блоге вообще, а в курсах про
мышление: «Как думать», «Критическое мышление», «Логика», «О чём
думать», «ТРИЗ» — те же пять курсов, которые статья называет своими.
Дверь ставится туда: строкой после блока «Практика к курсу», где
читатель уже решает, что делать дальше.

Что делает. Вставляет абзац со ссылкой на статью и на посадочную после
`</div>` блока `prakt` на пяти страницах курсов. Формулировка без
обещаний: статья — карта уровней, посадочная — что есть для тех, кто
узнал себя на девятом.

Идемпотентен: помечает вставку комментарием и второй раз не добавляет.
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "<!-- ub9 -->"
END = "<!-- /ub9 -->"

COURSES = ["kak-dumat", "kriticheskoe-myshlenie", "logika", "o-chem-dumat", "triz"]

BLOCK = (
    MARK +
    '<p style="max-width:820px;margin:0 0 22px;color:#475569;font-size:.95rem;line-height:1.6">'
    'Курс отвечает на вопрос «как думать». На вопрос «насколько глубоко я вижу то, '
    'о чём думаю» отвечает другая карта — '
    '<a href="/blog/ponimanie-mira-devyat-urovnej.html" style="color:#3A86FF">'
    '«Понимание мира: девять уровней»</a>. Если вы узнали себя на девятом — '
    'том, где видны закономерности, а не события, — для вас есть '
    '<a href="/vizhu-zakonomernosti/" style="color:#3A86FF">отдельная страница</a>.'
    '</p>' + END
)

ANCHOR = '<div class="prakt-note">'


def insert(s):
    """Ставит блок после закрытия div.prakt — сразу за prakt-note."""
    i = s.find(ANCHOR)
    if i < 0:
        return None
    j = s.find("</div>", i)          # конец prakt-note
    if j < 0:
        return None
    j = s.find("</div>", j + 6)      # конец prakt
    if j < 0:
        return None
    j += len("</div>")
    return s[:j] + "\n" + BLOCK + s[j:]


def main():
    dry = "--dry-run" in sys.argv
    done = 0
    skipped = 0
    for c in COURSES:
        f = os.path.join(ROOT, "blog", "lektorij", c, "index.html")
        if not os.path.exists(f):
            print("нет страницы курса:", c)
            continue
        s = io.open(f, encoding="utf-8").read()
        if MARK in s:
            skipped += 1
            continue
        out = insert(s)
        if out is None:
            print("не нашёл блок практики:", c)
            continue
        done += 1
        if not dry:
            io.open(f, "w", encoding="utf-8").write(out)
    print("%s: курсов %d, уже были %d" % ("просмотр" if dry else "записано", done, skipped))


if __name__ == "__main__":
    main()
