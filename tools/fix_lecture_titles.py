#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Переносит «Лекция N.» из начала заголовка в конец.

Зачем. Вебмастер, 10.09.2026: 500 запросов, 19 450 показов, 244 клика.
Разбивка по позициям показывает, где деньги:

    позиция 1–3    24 запроса      374 показа    46 кликов   CTR 12,3 %
    позиция 4–6   120 запросов   2 765 показов   94 клика    CTR  3,4 %
    позиция 7–10  304 запроса   15 089 показов   99 кликов   CTR  0,7 %

Семнадцатикратная разница между топ-3 и седьмым местом — обычное дело.
А вот ноль кликов при позиции 4–5 обычным делом не является: «дедукция и
индукция это простыми словами» — 97 показов, позиция 4,8, ни одного клика.
Значит, дело не только в позиции, а в том, как выглядит строка в выдаче.

И тут видно системную вещь. Лучший CTR сайта — 32 % у запроса «чем факт
отличается от мнения», и ведёт он на страницу, чей заголовок начинается
ровно этими словами. А 803 лекции начинают заголовок с «Лекция 7.» —
человек, искавший «силлогизм простыми словами», видит в выдаче номер
чужого урока и проходит мимо. Первые шестьдесят знаков заголовка — это
всё, что он прочитает.

Что делает скрипт. «Лекция 7. Тема» → «Тема — Лекция 7». Номер остаётся:
он честно говорит, что это часть курса, — но уходит туда, где не мешает.
Двести шестьдесят одна лекция уже написана в таком виде, то есть скрипт
не вводит новое правило, а доводит до конца существующее.

Меняются только title, og:title, twitter:title и headline в разметке.
Заголовок h1 на самой странице не трогается: там номер уместен и помогает
читателю понять, где он в курсе.

    python3 tools/fix_lecture_titles.py --dry-run
    python3 tools/fix_lecture_titles.py
"""
import argparse
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# «Лекция 7.» или «Лекция 7:» в начале строки
HEAD = re.compile(r"^Лекция\s+(\d+)[\.:]\s*(.+)$")


def flip(t):
    m = HEAD.match(t.strip())
    if not m:
        return None
    num, rest = m.group(1), m.group(2).strip()
    if not rest:
        return None
    # Если в теме уже есть тире, второе даёт «Фрейд: направление — устройство
    # конфликта — Лекция 2»: два тире подряд читаются как обрыв. В таких
    # случаях отделяем номер точкой-разделителем.
    sep = " · Лекция %s" if " — " in rest else " — Лекция %s"
    return rest + sep % num


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    changed = 0
    pairs = []
    for path in sorted(glob.glob(os.path.join(ROOT, "blog", "lekciya-*.html"))):
        s = open(path, encoding="utf-8").read()
        m = re.search(r"<title>([^<]*)</title>", s)
        if not m:
            continue
        full = m.group(1)
        # хвост бренда отделяем и возвращаем на место
        brand = ""
        core = full
        for sep in (" | ", " — Андрей Мейстер"):
            if sep in full and full.rstrip().endswith("Андрей Мейстер"):
                i = full.rindex(sep)
                core, brand = full[:i], full[i:]
                break
        new_core = flip(core)
        if not new_core:
            continue
        old_title, new_title = full, new_core + brand
        s2 = s.replace("<title>%s</title>" % old_title,
                       "<title>%s</title>" % new_title)
        # og / twitter / headline — там обычно вариант без бренда
        for a, b in ((core, new_core), (old_title, new_title)):
            if a == b:
                continue
            s2 = s2.replace('content="%s"' % a, 'content="%s"' % b)
            s2 = s2.replace('"headline": "%s"' % a, '"headline": "%s"' % b)
            s2 = s2.replace('"headline":"%s"' % a, '"headline":"%s"' % b)
        if s2 != s:
            changed += 1
            pairs.append((os.path.basename(path), core, new_core))
            if not args.dry_run:
                open(path, "w", encoding="utf-8").write(s2)

    # каталоги: заголовок в blogmap и search-index должен совпадать со страницей
    if not args.dry_run and pairs:
        flips = {c: n for _, c, n in pairs}
        for name, key in (("blog/blogmap.json", "title"),
                          ("blog/search-index.json", "t")):
            p = os.path.join(ROOT, name)
            data = json.load(open(p, encoding="utf-8"))
            items = data["articles"] if isinstance(data, dict) else data
            hit = 0
            for it in items:
                if it.get(key) in flips:
                    it[key] = flips[it[key]]
                    hit += 1
            if name.endswith("blogmap.json"):
                json.dump(data, open(p, "w", encoding="utf-8"),
                          ensure_ascii=False, indent=1)
            else:
                json.dump(data, open(p, "w", encoding="utf-8"),
                          ensure_ascii=False, separators=(",", ":"))
            print("  %s: обновлено %d" % (name, hit))

    what = "изменилось бы" if args.dry_run else "изменено"
    print("%s заголовков: %d" % (what, changed))
    for f, c, n in pairs[:6]:
        print("   %s\n     было:  %s\n     стало: %s" % (f, c, n))


if __name__ == "__main__":
    main()
