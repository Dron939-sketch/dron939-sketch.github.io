#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Навигация в статике: запасная шапка и подвал внутри плейсхолдеров.

    python3 tools/fix_nav_fallback.py --dry-run
    python3 tools/fix_nav_fallback.py

Шапка и подвал подтягиваются скриптом: в разметке лежат пустые
<div id="header-placeholder"></div> и <div id="footer-placeholder"></div>,
а содержимое приходит через fetch('/header.html').

Google JavaScript исполняет, но GPTBot, ClaudeBot и PerplexityBot — нет.
Для них каждая из 1425 страниц была навигационным тупиком: ни меню, ни
ссылок на разделы, ни подвала. Ровно те краулеры, которым сайт явно
разрешён в robots.txt, не видели структуру сайта вообще.

Запасные ссылки кладём внутрь плейсхолдера, а не в <noscript>: скрипт
делает innerHTML = html, то есть при живом JS они просто заменяются
настоящей шапкой, а без JS остаются — и работают у читателя, а не только
у краулера. Дублирования не возникает.

Скрипт идемпотентный: плейсхолдеры с содержимым не трогает.
"""
import os, io, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dry = "--dry-run" in sys.argv

LINK = "color:#3A86FF;text-decoration:none;font-size:.9rem"
NAV = ("display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center;"
       "padding:14px 20px;max-width:1200px;margin:0 auto")

HEADER = (
    '<nav aria-label="Основная навигация" style="%s">'
    '<a href="/" style="%s;font-weight:700">А МЕЙСТЕР</a>'
    '<a href="/knigi/" style="%s">Книги</a>'
    '<a href="/igry/" style="%s">Игры</a>'
    '<a href="/treningi/" style="%s">Тренинги</a>'
    '<a href="/blog/" style="%s">Блог</a>'
    '<a href="/blog/lektorij/" style="%s">Лекторий</a>'
    '<a href="/istorii/" style="%s">Истории</a>'
    '<a href="/sobytiya/" style="%s">Архив</a>'
    '<a href="/virtual-psychologist/" style="%s">Виртуальный психолог</a>'
    '</nav>' % ((NAV,) + (LINK,) * 9))

FOOTER = (
    '<nav aria-label="Разделы сайта" style="%s">'
    '<a href="/" style="%s">Главная</a>'
    '<a href="/obo-mne/" style="%s">Об авторе</a>'
    '<a href="/fredi/" style="%s">Фреди</a>'
    '<a href="/kontakty/" style="%s">Контакты</a>'
    '<a href="/oferta/" style="%s">Оферта</a>'
    '<a href="/politika-konfidencialnosti/" style="%s">Конфиденциальность</a>'
    '<a href="/tarify/" style="%s">Тарифы</a>'
    '</nav>' % ((NAV,) + (LINK,) * 7))


def pages():
    out = []
    for dirpath, dirnames, names in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames
                       if d not in {".git", "tools", "scripts", "b17-drafts",
                                    "vk-drafts", "docs", "node_modules"}]
        out += [os.path.join(dirpath, n) for n in names if n.endswith(".html")]
    return sorted(out)


def main():
    n_h = n_f = 0
    for p in pages():
        s0 = io.open(p, encoding="utf-8", errors="replace").read()
        s = s0
        if '<div id="header-placeholder"></div>' in s:
            s = s.replace('<div id="header-placeholder"></div>',
                          '<div id="header-placeholder">%s</div>' % HEADER)
            n_h += 1
        if '<div id="footer-placeholder"></div>' in s:
            s = s.replace('<div id="footer-placeholder"></div>',
                          '<div id="footer-placeholder">%s</div>' % FOOTER)
            n_f += 1
        if s != s0 and not dry:
            io.open(p, "w", encoding="utf-8").write(s)
    print("%sзапасная шапка добавлена на %d страниц, подвал — на %d"
          % ("БЕЗ ЗАПИСИ: " if dry else "", n_h, n_f))


if __name__ == "__main__":
    main()
