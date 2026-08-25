#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Снимает Font Awesome с 14 страниц: иконки переезжают внутрь HTML.

Зачем. Страницы подключали таблицу стилей с cdnjs.cloudflare.com. Как и любой
внешний css, она блокирует первую отрисовку: пока ответ не пришёл, читатель
видит белый экран. На мобильной сети до внешних CDN добраться удаётся не
всегда — и коммерческие страницы («Книги», «Тренинги», «Игры») переставали
открываться, хотя лежат на нашем же сервере.

При этом сама библиотека нужна была ради одиннадцати иконок на двух
страницах: остальные двенадцать грузили мегабайт стилей и не рисовали ничего.

Что делает скрипт. Заменяет <i class="fa-..."> на inline-SVG (Lucide, ISC) —
внутрь того же <i>, чтобы прежние отступы из css остались, — и убирает ссылку
на cdnjs со всех страниц.

    python3 tools/drop_fontawesome.py --dry-run
    python3 tools/drop_fontawesome.py
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LINK_RE = re.compile(r'\s*<link[^>]*cdnjs\.cloudflare\.com[^>]*font-awesome[^>]*>', re.I)
ICON_RE = re.compile(r'<i class="fa[sb]?(?:-solid)?\s+fa-([a-z0-9-]+)"\s*></i>')

# Формы иконок Lucide 1.34.0 (ISC), внутренности <svg>. Обводка — currentColor,
# так что иконка сама принимает цвет текста, как это делала Font Awesome.
SHAPES = {
    "bullhorn": "<path d='M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'/><path d='M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14'/><path d='M8 6v8'/>",
    "search": "<path d='m21 21-4.34-4.34'/><circle cx='11' cy='11' r='8'/>",
    "brain": "<path d='M12 18V5'/><path d='M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4'/><path d='M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5'/><path d='M17.997 5.125a4 4 0 0 1 2.526 5.77'/><path d='M18 18a4 4 0 0 0 2-7.464'/><path d='M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517'/><path d='M6 18a4 4 0 0 1-2-7.464'/><path d='M6.003 5.125a4 4 0 0 0-2.526 5.77'/>",
    "star": "<path d='M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'/>",
    "layer-group": "<path d='M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z'/><path d='M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12'/><path d='M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17'/>",
    "bullseye": "<circle cx='12' cy='12' r='10'/><circle cx='12' cy='12' r='6'/><circle cx='12' cy='12' r='2'/>",
    "shield-heart": "<path d='M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'/><path d='m9 12 2 2 4-4'/>",
    "triangle-exclamation": "<path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3'/><path d='M12 9v4'/><path d='M12 17h.01'/>",
}

SVG = ("<svg viewBox='0 0 24 24' width='1em' height='1em' fill='none' "
       "stroke='currentColor' stroke-width='2' stroke-linecap='round' "
       "stroke-linejoin='round' style='vertical-align:-.125em' "
       "aria-hidden='true'>{shapes}</svg>")


def process(path: str, dry: bool):
    src = io.open(path, encoding="utf-8").read()
    if not LINK_RE.search(src) and "fa-" not in src:
        return None
    unknown = []

    def repl(m):
        name = m.group(1)
        if name in ("solid", "regular", "brands"):     # <i class="fas fa-solid"> — без иконки
            return ""
        if name not in SHAPES:
            unknown.append(name)
            return m.group(0)
        return '<i aria-hidden="true">' + SVG.format(shapes=SHAPES[name]) + "</i>"

    out, n = ICON_RE.subn(repl, src)
    links = len(LINK_RE.findall(out))
    out = LINK_RE.sub("", out)
    if unknown:
        print("  !! неизвестные иконки в %s: %s" % (path, ", ".join(sorted(set(unknown)))))
    if out != src and not dry:
        io.open(path, "w", encoding="utf-8").write(out)
    return (n, links) if out != src else None


def main():
    dry = "--dry-run" in sys.argv
    icons = links = pages = 0
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "vk-drafts")]
        for fn in files:
            if not fn.endswith(".html"):
                continue
            res = process(os.path.join(base, fn), dry)
            if res:
                pages += 1
                icons += res[0]
                links += res[1]
    print("%s страниц: %d, иконок переведено: %d, ссылок на cdnjs убрано: %d"
          % ("посмотрел бы" if dry else "переписал", pages, icons, links))
    if dry:
        print("Это пробный прогон, файлы не тронуты.")


if __name__ == "__main__":
    main()
