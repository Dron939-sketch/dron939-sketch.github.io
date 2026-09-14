#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Дверь на страницу «Приметы и знаки» — из статей про ритуалы и эзотерику.

    python3 tools/link_primety.py --dry-run
    python3 tools/link_primety.py

Зачем. Посадочная /primety-i-znaki/ сделана под живые поисковые запросы:
«почему приметы сбываются», «разбилась посуда к чему», «плохая примета
что делать». Чтобы она собирала их из органики, а не только из Директа,
Яндексу нужны внутренние ссылки: страница в корне сайта без входящих
ссылок обходится краулером редко и ранжируется соответственно.

Доноры выбраны по теме, а не по трафику: в блоге уже есть кластер про
ритуалы, колдовство, таро и эзотерику — там сидит ровно та же аудитория,
и переход по ссылке для неё естественный, а не рекламный.

Что делает. Ставит строку-заметку сразу после блока «Содержание»
(`nav.toc-box`) — тем же оформлением, что двери в Лекторий и в тренажёр
защиты от манипуляций. Если «Содержания» в статье нет, файл пропускается.

Идемпотентен: помечает вставку комментарием и второй раз не добавляет.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "<!-- primety-link -->"

ARTICLES = [
    "rabotayut-li-ritualy-taro-astrologiya.html",
    "ezoterika-i-psihologiya-7-peresechenij.html",
    "koldovstvo-povedencheskaya-programma.html",
    "10-koldovskih-ritualov-navigator.html",
    "dva-tipa-ritualov-dostizhenie-i-prisutstvie.html",
    "kognitivnye-iskazheniya-12-lovushek.html",
]

NOTE = (
    MARK +
    '<p class="lektorij-note" style="margin:22px 0;padding:12px 16px;'
    'border-left:3px solid #A855F7;background:#FAF5FF;border-radius:0 10px 10px 0;'
    'color:#4A4A4F;font-size:.95rem">🔮 Про приметы и знаки — отдельный разбор: '
    '<a href="/primety-i-znaki/">почему они сбываются</a> на самом деле, '
    'три механизма без мистики и без насмешки, и что делать, если плохой знак напугал.</p>'
)

TOC = re.compile(r'<nav class="toc-box".*?</nav>', re.S)
# У части статей кластера «Содержания» нет вовсе — там дверь встаёт
# перед вторым разделом: первый читают почти всегда, до него уводить рано.
H2 = re.compile(r'<h2[^>]*>')


def place(s):
    """Конец «Содержания», иначе — начало второго <h2>."""
    m = TOC.search(s)
    if m:
        return m.end()
    hs = list(H2.finditer(s))
    if len(hs) >= 2:
        return hs[1].start()
    return None


def main():
    dry = "--dry-run" in sys.argv
    done = 0
    skipped = 0
    for name in ARTICLES:
        f = os.path.join(ROOT, "blog", name)
        if not os.path.exists(f):
            print("нет статьи:", name)
            continue
        s = io.open(f, encoding="utf-8").read()
        if MARK in s:
            skipped += 1
            continue
        i = place(s)
        if i is None:
            print("некуда поставить:", name)
            continue
        out = s[:i] + "\n" + NOTE + "\n" + s[i:]
        done += 1
        if not dry:
            io.open(f, "w", encoding="utf-8").write(out)
    print("%s: статей %d, уже были %d" % ("просмотр" if dry else "записано", done, skipped))


if __name__ == "__main__":
    main()
