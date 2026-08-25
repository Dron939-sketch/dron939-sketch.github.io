#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Собирает карту «слаг лекции → курс» в blog/lektorij/courses.json.

Зачем. В админке список озвучки показывает лекции по одной: заголовок и слаг.
Курса в нём нет, и найти «все лекции „Перехода“» можно только если помнишь, что
их слаги начинаются на lekciya-perehod-. На сотне курсов это неработающая
память. Карта даёт админке колонку «Курс» и поиск по названию курса.

Источник истины — страницы курсов: какие лекции стоят в хабе, те и в курсе.

    python3 tools/gen_lektorij_courses.py --dry-run
    python3 tools/gen_lektorij_courses.py
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEKTORIJ = os.path.join(ROOT, "blog", "lektorij")
OUT = os.path.join(LEKTORIJ, "courses.json")


def build() -> dict:
    courses = {}
    for d in sorted(os.listdir(LEKTORIJ)):
        hub = os.path.join(LEKTORIJ, d, "index.html")
        if not os.path.exists(hub):
            continue
        s = io.open(hub, encoding="utf-8").read()
        m = re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S)
        name = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else d
        for slug in re.findall(r'href="/blog/(lekciya-[a-z0-9-]+)\.html"', s):
            # лекция может стоять в двух хабах (кросс-ссылка) — первый выигрывает
            courses.setdefault(slug, name)
    return courses


def main():
    dry = "--dry-run" in sys.argv
    courses = build()
    names = sorted(set(courses.values()))
    print("лекций: %d, курсов: %d" % (len(courses), len(names)))
    if dry:
        print("Это пробный прогон, файл не тронут.")
        return
    io.open(OUT, "w", encoding="utf-8").write(
        json.dumps(courses, ensure_ascii=False, separators=(",", ":"), sort_keys=True))
    print("записано: %s (%.1f КБ)" % (os.path.relpath(OUT, ROOT), os.path.getsize(OUT) / 1024.0))


if __name__ == "__main__":
    main()
