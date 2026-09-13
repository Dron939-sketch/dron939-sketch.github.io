#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Убирает «Лекция N.» из h1 лекций, крошек разметки и og:title.

    python3 tools/fix_lecture_h1.py --dry-run
    python3 tools/fix_lecture_h1.py

Зачем. fix_lecture_titles.py 10.09.2026 перенёс номер из title в конец
(«Тема — Лекция 7») и намеренно не тронул h1: там номер помогает читателю.
Проверка 13.09.2026 по всем 1064 лекциям: title начинается с названия у
965 (у 99 номера нет вовсе), но h1 у 803 лекций по-прежнему «Лекция 7.
Тема», у 803 то же в имени ListItem хлебных крошек, у 57 — в og:title.
Яндекс при длинном title (у нас « | Андрей Мейстер» на хвосте) нередко
собирает строку выдачи из h1, а в соцсетях и мессенджерах карточка
берётся из og:title. В обоих местах человек, искавший «силлогизм
простыми словами», видит «Лекция 4.» и проходит мимо.

Что делает. h1 «Лекция 7. Тема» → «Тема»; номер уходит в строку над
заголовком: «🎓 Лекторий · Курс» → «🎓 Лекторий · Курс · лекция 7» — там он
по-прежнему говорит, где читатель в курсе. Имя ListItem в крошках —
«Тема». og:title и twitter:title — «Тема — Лекция 7», как title.

Идемпотентен: второй прогон ничего не меняет.
"""
import glob
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NUM = re.compile(r'^\s*Лекция\s+(\d+)\.\s*')


def fix(s):
    changed = 0
    num = None

    def h1_sub(m):
        nonlocal changed, num
        inner = m.group(2)
        mm = NUM.match(inner)
        if not mm:
            return m.group(0)
        num = mm.group(1)
        changed += 1
        return m.group(1) + inner[mm.end():] + m.group(3)

    s = re.sub(r'(<h1[^>]*>)(.*?)(</h1>)', h1_sub, s, count=1, flags=re.S)

    if num:
        def span_sub(m):
            nonlocal changed
            txt = m.group(1)
            if '· лекция' in txt:
                return m.group(0)
            changed += 1
            return '<span>🎓 Лекторий · %s · лекция %s</span>' % (txt, num)
        s = re.sub(r'<span>🎓 Лекторий · ([^<]*?)</span>', span_sub, s, count=1)

    def name_sub(m):
        nonlocal changed
        changed += 1
        return '"name": "' + m.group(2)
    s2 = re.sub(r'"name":\s*"(Лекция\s+\d+\.\s*)([^"]*)', name_sub, s)
    s = s2

    def og_sub(m):
        nonlocal changed
        changed += 1
        return '%s content="%s — Лекция %s"' % (m.group(1), m.group(3).strip(), m.group(2))
    s = re.sub(r'(property="og:title"|name="twitter:title") content="Лекция\s+(\d+)\.\s*([^"]*)"', og_sub, s)
    return s, changed


def main():
    dry = "--dry-run" in sys.argv
    files = sorted(glob.glob(os.path.join(ROOT, "blog", "lekciya-*.html")))
    touched = 0
    edits = 0
    for f in files:
        s = io.open(f, encoding="utf-8").read()
        out, n = fix(s)
        if n and out != s:
            touched += 1
            edits += n
            if not dry:
                io.open(f, "w", encoding="utf-8").write(out)
    print("%s: файлов %d, правок %d из %d лекций" % ("просмотр" if dry else "записано", touched, edits, len(files)))


if __name__ == "__main__":
    main()
