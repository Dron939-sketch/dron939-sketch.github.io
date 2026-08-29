#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Собирает карты лекций Лектория: курс и номер внутри курса.

    blog/lektorij/courses.json   слаг → название курса
    blog/lektorij/waves.json     слаг → номер лекции в курсе (волна)

Зачем. В админке список озвучки показывает лекции по одной: заголовок и слаг.
Курса в нём нет, и найти «все лекции „Перехода“» можно только если помнишь, что
их слаги начинаются на lekciya-perehod-. На сотне курсов это неработающая
память. Карта даёт админке колонку «Курс» и поиск по названию курса.

Источник истины — страницы курсов: какие лекции стоят в хабе, те и в курсе.

Номер лекции нужен админке, чтобы озвучить «первые лекции всех курсов» одной
кнопкой: при переозвучке архива волнами у каждого курса сразу новая первая
лекция — её и слушают те, кто пришёл в курс впервые. Считает номер тот же
код, что и tools/revoice_lectures.py, — чтобы кнопка и CLI не разошлись
в том, какая лекция первая.

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
OUT_WAVES = os.path.join(LEKTORIJ, "waves.json")


def _course_lectures(course_dir):
    """Лекции курса с номерами — из revoice_lectures, без копии логики."""
    import importlib.util
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "revoice_lectures.py")
    spec = importlib.util.spec_from_file_location("_revoice", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.course_lectures(course_dir)


def build_waves() -> dict:
    """{слаг: номер лекции в своём курсе}. Первая лекция курса — 1."""
    waves = {}
    for d in sorted(os.listdir(LEKTORIJ)):
        cdir = os.path.join(LEKTORIJ, d)
        if not os.path.isdir(cdir) or d == "img":
            continue
        for n, slug in _course_lectures(cdir):
            # лекция может стоять в двух хабах — первый выигрывает,
            # ровно как в карте курсов выше
            waves.setdefault(slug, n)
    return waves


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
    waves = build_waves()
    first = sum(1 for n in waves.values() if n == 1)
    print("лекций: %d, курсов: %d, первых лекций: %d"
          % (len(courses), len(names), first))
    if dry:
        print("Это пробный прогон, файлы не тронуты.")
        return
    for path, data in ((OUT, courses), (OUT_WAVES, waves)):
        io.open(path, "w", encoding="utf-8").write(
            json.dumps(data, ensure_ascii=False, separators=(",", ":"), sort_keys=True))
        print("записано: %s (%.1f КБ)"
              % (os.path.relpath(path, ROOT), os.path.getsize(path) / 1024.0))


if __name__ == "__main__":
    main()
