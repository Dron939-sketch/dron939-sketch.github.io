#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Даты публикации из будущего — приводим к дате появления файла в репозитории.

    python3 tools/fix_dates.py --dry-run
    python3 tools/fix_dates.py

Генератор проставлял датам расписание вперёд: у части лекций стояло
datePublished вплоть до 2029-05-12 при том, что файл лежит в репозитории с
июля 2026, а на самой странице написано «Проверено · июль 2026». Поисковики
и языковые модели такой контент обычно дисконтируют или не индексируют, а
читателю видна дата, до которой ещё три года.

За настоящую дату публикации берём дату первого коммита файла — это ровно
тот момент, когда материал появился на сайте. Правятся три места разом:
JSON-LD (datePublished/dateModified), og:article:published_time и видимая
строка «📅 12 мая 2029» в шапке статьи.

Даты не из будущего не трогаются.
"""
import os, io, re, sys, subprocess, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today().isoformat()
MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня",
          "июля", "августа", "сентября", "октября", "ноября", "декабря"]

dry = "--dry-run" in sys.argv


def git_added(path):
    """Дата первого коммита файла. None, если файл ещё не в истории."""
    try:
        out = subprocess.check_output(
            ["git", "log", "--diff-filter=A", "--format=%as", "-1", "--", path],
            cwd=ROOT, stderr=subprocess.DEVNULL).decode().strip()
    except subprocess.CalledProcessError:
        return None
    return out or None


def human(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    return "%d %s %d" % (d, MONTHS[m - 1], y)


def pages():
    out = []
    for dirpath, dirnames, names in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames
                       if d not in {".git", "tools", "scripts", "b17-drafts",
                                    "vk-drafts", "docs", "node_modules"}]
        out += [os.path.join(dirpath, n) for n in names if n.endswith(".html")]
    return sorted(out)


def main():
    fixed, skipped, worst = [], [], ""
    for p in pages():
        s0 = io.open(p, encoding="utf-8", errors="replace").read()
        future = set()
        for pat in (r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})',
                    r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})',
                    r'article:(?:published|modified)_time" content="(\d{4}-\d{2}-\d{2})'):
            future |= {d for d in re.findall(pat, s0) if d > TODAY}
        if not future:
            continue
        worst = max(worst, max(future))
        rel = os.path.relpath(p, ROOT)
        real = git_added(rel)
        if not real:
            # файла ещё нет в истории — ставим сегодняшнюю дату
            real = TODAY
        if real > TODAY:
            skipped.append(rel)
            continue

        s = s0
        for bad in sorted(future):
            s = s.replace('"%s' % bad, '"%s' % real)          # ISO в JSON-LD и og
            s = s.replace("📅 %s" % human(bad), "📅 %s" % human(real))
        # видимая дата могла быть записана иначе — подстрахуемся
        s = re.sub(r"📅 (\d{1,2} [а-я]+ (?:202[7-9]|20[3-9]\d))",
                   "📅 " + human(real), s)
        if s != s0:
            if not dry:
                io.open(p, "w", encoding="utf-8").write(s)
            fixed.append((rel, sorted(future)[-1], real))

    print("%sстраниц с датой из будущего исправлено: %d (самая дальняя была %s)"
          % ("БЕЗ ЗАПИСИ: " if dry else "", len(fixed), worst))
    for rel, was, now in fixed[:6]:
        print("  %-52s %s → %s" % (rel[:52], was, now))
    if len(fixed) > 6:
        print("  … и ещё %d" % (len(fixed) - 6))
    if skipped:
        print("  не удалось определить дату: %d" % len(skipped))


if __name__ == "__main__":
    main()
