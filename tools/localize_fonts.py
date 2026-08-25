#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Убирает Google Fonts со страниц: шрифт переезжает на свой домен.

Зачем. Шрифт подключался тегом
    <link href="https://fonts.googleapis.com/css2?family=Inter…" rel="stylesheet">
Это блокирующий ресурс: браузер не рисует страницу, пока не получит эту
таблицу стилей. Если до fonts.googleapis.com не достучаться — а на мобильных
сетях это обычное дело, — читатель видит белый экран, пока не истечёт таймаут
соединения. На вайфае тот же адрес открывается мгновенно, и выглядит это как
«сайт работает только по вайфаю».

Что делает скрипт. Удаляет со страницы preconnect'ы и ссылку на Google Fonts,
а на их место кладёт inline-блок @font-face со ссылками на локальные файлы
/fonts/inter-*.woff2. Inline, а не отдельный css: любой внешний файл стилей —
это ещё один запрос до первой отрисовки, а nginx отдаёт css с no-cache, то
есть ревалидация на каждой странице.

Подмножества нарезаны по unicode-range, поэтому русская страница качает только
кириллицу и латиницу (65 КБ), а редкие диакритики — только там, где они есть.

Страницы Лектория дополнительно тянули Noto Color Emoji ради 🎓🎧🔒💭 — для них
кладётся локальный файл на четыре глифа (3 КБ).

    python3 tools/localize_fonts.py --dry-run
    python3 tools/localize_fonts.py
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Ссылки на Google Fonts во всех встречающихся видах: preconnect к обоим
# хостам и сама таблица стилей (Inter или Noto Color Emoji).
LINK_RE = re.compile(
    r'\s*<link[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>',
    re.I,
)
EMOJI_RE = re.compile(r'fonts\.googleapis\.com/css2\?family=Noto\+Color\+Emoji', re.I)

FACE = ("@font-face{{font-family:'Inter';font-style:normal;font-weight:100 900;"
        "font-display:swap;src:url(/fonts/inter-{name}.woff2) format('woff2');"
        "unicode-range:{ranges}}}")

# Диапазоны — как их отдаёт сам Google Fonts для Inter v20.
SUBSETS = [
    ("cyrillic", "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"),
    ("cyrillic-ext", "U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,"
                     "U+FE2E-FE2F"),
    ("latin", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
              "U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,"
              "U+2212,U+2215,U+FEFF,U+FFFD"),
    ("latin-ext", "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,"
                  "U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,"
                  "U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"),
]

EMOJI_FACE = ("@font-face{font-family:'Noto Color Emoji';font-style:normal;"
              "font-weight:400;font-display:swap;"
              "src:url(/fonts/noto-emoji-lektorij.woff2) format('woff2');"
              "unicode-range:U+1F393,U+1F3A7,U+1F4AD,U+1F512}")

MARKER = "/fonts/inter-cyrillic.woff2"


def block(with_emoji: bool) -> str:
    faces = "\n".join(FACE.format(name=n, ranges=r) for n, r in SUBSETS)
    if with_emoji:
        faces += "\n" + EMOJI_FACE
    return ("<style>/* Inter локально: с fonts.googleapis.com шрифт грузился "
            "блокирующе и на мобильной сети держал белый экран */\n"
            + faces + "\n</style>")


def process(path: str, dry: bool) -> str:
    src = io.open(path, encoding="utf-8").read()
    if MARKER in src:
        return "уже локальный"
    links = LINK_RE.findall(src)
    if not links:
        return ""
    with_emoji = any(EMOJI_RE.search(l) for l in links)
    # Блок встаёт туда, где стояла первая удаляемая ссылка, — то есть в <head>
    first = LINK_RE.search(src).start()
    head, tail = src[:first], LINK_RE.sub("", src[first:])
    out = head + "\n" + block(with_emoji) + tail
    if not dry:
        io.open(path, "w", encoding="utf-8").write(out)
    return "%d ссылок%s" % (len(links), ", + эмодзи" if with_emoji else "")


def main():
    dry = "--dry-run" in sys.argv
    done = emoji = skipped = 0
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "vk-drafts")]
        for fn in files:
            if not fn.endswith(".html"):
                continue
            res = process(os.path.join(base, fn), dry)
            if not res:
                continue
            if res == "уже локальный":
                skipped += 1
            else:
                done += 1
                emoji += ", + эмодзи" in res
    print("%s страниц: %d%s, уже локальных: %d"
          % ("посмотрел бы" if dry else "переписал", done,
             (" (из них с эмодзи Лектория: %d)" % emoji) if emoji else "", skipped))
    if dry:
        print("Это пробный прогон, файлы не тронуты.")


if __name__ == "__main__":
    main()
