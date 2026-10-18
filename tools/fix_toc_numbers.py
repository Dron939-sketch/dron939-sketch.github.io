#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Возвращает число в пункты оглавления, где его съел генератор.

    python3 tools/fix_toc_numbers.py --dry-run
    python3 tools/fix_toc_numbers.py

Оглавления `nav.toc-box` собирал давний скрипт: он срезал с заголовка
эмодзи и всё, что не буква, — вместе с числом. Заголовок «🚩 7 признаков
манипуляции в общении» превращался в пункт «признаков манипуляции в
общении». На 18.10.2026 так было на 104 страницах блога, 129 пунктов.

Правило: пункт, который начинается со строчной буквы, сверяется со своим
заголовком (по якорю). Если заголовок без ведущих эмодзи и знаков
заканчивается текстом пункта и длиннее его, пункт получает текст
заголовка без эмодзи. Остальное не трогается. Идемпотентен.
"""
import argparse
import glob
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOC = re.compile(r'<nav class="toc-box".*?</nav>', re.S)
ITEM = re.compile(r'(<a href="#([^"]+)">)([^<]*)(</a>)')


def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s)).strip()


def fix(html):
    m = TOC.search(html)
    if not m:
        return html, 0
    n = 0

    def sub(it):
        nonlocal n
        text = it.group(3)
        if not re.match(r"[а-яё]", text):
            return it.group(0)
        h = re.search(r'<h2[^>]*\bid="%s"[^>]*>(.*?)</h2>' % re.escape(it.group(2)), html, re.S)
        if not h:
            return it.group(0)
        head = re.sub(r"^[^0-9A-Za-zА-Яа-яЁё«]+", "", plain(h.group(1)))
        if head != text and head.endswith(text.strip()):
            n += 1
            return it.group(1) + head + it.group(4)
        return it.group(0)

    toc = ITEM.sub(sub, m.group(0))
    return html[:m.start()] + toc + html[m.end():], n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    pages = items = 0
    for path in sorted(glob.glob(os.path.join(ROOT, "blog", "*.html"))):
        src = open(path, encoding="utf-8").read()
        out, n = fix(src)
        if n:
            pages += 1
            items += n
            if not args.dry_run:
                open(path, "w", encoding="utf-8").write(out)
    print(("исправилось бы" if args.dry_run else "исправлено"), "страниц:", pages, "пунктов:", items)


if __name__ == "__main__":
    main()
