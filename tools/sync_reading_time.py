#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Пересчитывает «⏱ N мин чтения» в шапке статей блога.

Зачем. На страницах стояли числа, посчитанные по старой формуле
«8–11 тысяч знаков ≈ 22–25 минут» — она завышала время вдвое, о чём
прямо предупреждает METODICHKA.md. В итоге тысяча страниц обещала
читателю 22–24 минуты там, где материал занимает 12–14, а страница
курса рядом показывала правильные числа: два источника противоречили
друг другу на одном сайте.

Считаем той же функцией, что и хронометраж курсов (sync_lektorij_time),
поэтому «мин чтения» на лекции и минуты на странице курса теперь
сходятся по определению. Служебные блоки, план, оглавление и список
литературы из подсчёта выпадают — как и в озвучке.

    python3 tools/sync_reading_time.py --dry-run   # посмотреть, что изменится
    python3 tools/sync_reading_time.py             # применить
"""
import argparse
import glob
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from sync_lektorij_time import lecture_minutes  # noqa: E402

BLOG = os.path.join(ROOT, "blog")
_TIME_RE = re.compile(r"(⏱️?\s*)(\d+)(\s*мин чтения)")
_TAG_RE = re.compile(r"<(h2|h3|p|li)(?=[\s>])[^>]*>(.*?)</\1>", re.S)
# Ниже этой доли считаем, что текст страницы лежит не в тех тегах, которые
# умеет считать формула, и молча ставить ей минуты нельзя: у справочника
# на сто искажений так вышло бы «3 минуты» вместо тридцати с лишним.
MIN_COVERAGE = 0.55


def minutes_word(n: int) -> int:
    """Минимум одна минута: «0 мин чтения» выглядит поломкой."""
    return max(1, n)


def coverage(html: str) -> float:
    """Какую долю видимого текста страницы формула вообще видит."""
    body = re.sub(r"<(script|style|svg)\b.*?</\1>", " ", html, flags=re.S | re.I)
    plain = len(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body)).strip())
    if not plain:
        return 0.0
    counted = 0
    for tm in _TAG_RE.finditer(body):
        t = re.sub(r"<[^>]+>", " ", tm.group(2))
        counted += len(re.sub(r"\s+", " ", t).strip())
    return counted / float(plain)


def process(path: str, dry: bool):
    src = io.open(path, encoding="utf-8").read()
    m = _TIME_RE.search(src)
    if not m:
        return None
    if '<div class="article-content">' not in src:
        return ("skip", os.path.basename(path), "нет article-content")
    cov = coverage(src)
    if cov < MIN_COVERAGE:
        return ("skip", os.path.basename(path), "текст вне p/li (%.0f%%)" % (cov * 100))
    old = int(m.group(2))
    new = minutes_word(int(round(lecture_minutes(path))))
    if new == old:
        return None
    out = _TIME_RE.sub(lambda mm: mm.group(1) + str(new) + mm.group(3), src, count=1)
    if not dry:
        io.open(path, "w", encoding="utf-8").write(out)
    return old, new


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0,
                    help="показать только первые N изменений в отчёте")
    args = ap.parse_args()

    changed, shown, deltas, skipped = 0, 0, [], []
    for path in sorted(glob.glob(os.path.join(BLOG, "*.html"))):
        res = process(path, args.dry_run)
        if not res:
            continue
        if res[0] == "skip":
            skipped.append((res[1], res[2]))
            continue
        old, new = res
        changed += 1
        deltas.append(old - new)
        if not args.limit or shown < args.limit:
            print("  %-58s %2d → %2d" % (os.path.basename(path), old, new))
            shown += 1

    if deltas:
        avg = sum(deltas) / float(len(deltas))
        print("---")
        print("страниц поправлено: %d, среднее завышение было %.1f мин"
              % (changed, avg))
    else:
        print("всё уже согласовано")
    if skipped:
        print("пропущено (структуру не разобрать, счётчик оставлен как был): %d"
              % len(skipped))
        for name, why in skipped[:10]:
            print("  · %-56s %s" % (name, why))
        if len(skipped) > 10:
            print("  · … ещё %d" % (len(skipped) - 10))
    if args.dry_run:
        print("(--dry-run: файлы не тронуты)")


if __name__ == "__main__":
    main()
