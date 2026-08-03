#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Досборка страниц рубрик и пересчёт всех заявленных чисел по blogmap.json.

    python3 tools/sync_counters.py --dry-run
    python3 tools/sync_counters.py

Зачем. Числа «1165 статей», «54 курса», «719 статей» вписаны в разметку
руками и разъезжаются с реальностью при каждом пополнении блога. А статья,
которой нет на своей странице рубрики, доступна только через поиск и
sitemap — краулер до неё доходит хуже, читатель не доходит вовсе.

Что делает:
  1. добавляет на страницу рубрики статьи, которые числятся за ней в
     blogmap, но на странице отсутствуют (в свою группу уровня, по алфавиту);
  2. пересчитывает счётчики рубрики: общий, по уровням и в заголовках групп;
  3. приводит числа в <title>, description и og:description к фактическим;
  4. чинит числа на хабе блога и на странице Лектория.

Существующие карточки не переписываются: подписи в них отредактированы
вручную и отличаются от заголовков в blogmap.
"""
import os, io, re, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, "blog")
LEVELS = [("n", "🟢", "#1FA971", "новичку"),
          ("m", "🔵", "#3A86FF", "среднему"),
          ("p", "🔴", "#E5484D", "профи")]

dry = "--dry-run" in sys.argv
log = []


def read(p):
    return io.open(p, encoding="utf-8").read()


def write(p, s):
    if not dry:
        io.open(p, "w", encoding="utf-8").write(s)


def plural(n, forms=("статья", "статьи", "статей")):
    n100, n10 = n % 100, n % 10
    if 11 <= n100 <= 14:
        return forms[2]
    return forms[0] if n10 == 1 else forms[1] if 2 <= n10 <= 4 else forms[2]


def card_title(a):
    """Подпись карточки. У лекций номер вынесен в конец: так они сортируются
    по теме, а не сплошным блоком «Лекция 1, Лекция 1, Лекция 1…»."""
    m = re.match(r"^Лекция (\d+)\.\s*(.+)$", a["title"])
    return "%s — Лекция %s" % (m.group(2), m.group(1)) if m else a["title"]


def sync_rubric(rk, arts):
    p = os.path.join(BLOG, "rubrika", rk, "index.html")
    if not os.path.exists(p):
        return
    s = read(p)
    listed = set(re.findall(r'<li><a href="/blog/([a-z0-9-]+)\.html"', s))
    added = 0

    for lvl, ic, color, lbl in LEVELS:
        g = re.search(r'(<h2>%s[^<]*<span[^>]*>· )(\d+)(</span></h2>'
                      r'<ul class="art-list">)(.*?)(</ul>)' % ic, s, re.S)
        if not g:
            continue
        body = g.group(4)
        new = ['<li><a href="/blog/%s.html"><span class="t">%s</span>'
               '<span class="mn">%d мин</span></a></li>'
               % (a["slug"], card_title(a), a["mins"])
               for a in arts if a["level"] == lvl and a["slug"] not in listed]
        lis = re.findall(r"<li>.*?</li>", body, re.S) + new
        key = lambda x: re.search(r'class="t">([^<]+)', x).group(1).lower()
        lis.sort(key=key)
        added += len(new)
        s = s[:g.start()] + g.group(1) + str(len(lis)) + g.group(3) + \
            "".join(lis) + g.group(5) + s[g.end():]
        # подпись под шапкой: «10 новичку»
        s = re.sub(r'(background:%s"></i>)\d+ %s' % (re.escape(color), lbl),
                   lambda m: m.group(1) + "%d %s" % (len(lis), lbl), s, count=1)

    total = len(re.findall(r'<li><a href="/blog/', s))
    s = re.sub(r"<b>\d+</b> стать\w+", "<b>%d</b> %s" % (total, plural(total)), s, count=1)
    # числа в <title>, description и og:description
    s = re.sub(r"\b\d+ стат(?:ья|ьи|ей)\b", "%d %s" % (total, plural(total)), s)

    if added:
        log.append("рубрика %-12s +%d карточек, всего %d" % (rk, added, total))
    write(p, s)


def sync_hub(by):
    """На хабе два вида чисел: общее и своё у каждой карточки рубрики.

    Ссылка «Все N статей →» стоит внутри <a href="/blog/rubrika/<rk>/">, то
    есть относится к своей рубрике. Заменять её общим числом нельзя.
    """
    p = os.path.join(BLOG, "index.html")
    s0 = read(p)

    def per_rubric(m):
        rk, n = m.group(1), len(by.get(m.group(1), []))
        return '<a class="go" href="/blog/rubrika/%s/">Все %d %s' % (rk, n, plural(n))

    # сначала общее число по всему тексту, затем — точечно счётчики рубрик,
    # иначе общая замена затирает только что проставленные частные
    total = sum(len(v) for v in by.values())
    s = re.sub(r"\b\d+ стат(?:ья|ьи|ей)\b", "%d %s" % (total, plural(total)), s0)
    s = re.sub(r'<a class="go" href="/blog/rubrika/([a-z]+)/">Все \d+ стат(?:ья|ьи|ей)',
               per_rubric, s)
    if s != s0:
        log.append("хаб блога: общее число %d и счётчики 15 рубрик" % total)
    write(p, s)


def sync_lektorij(n_courses, n_lectures):
    """Только сводные числа страницы.

    Тут легко ошибиться: на странице десятки карточек вида «Курс из 10
    лекций» и «Курс из 12 лекций» — это счётчики конкретных курсов, и
    глобальная замена «N лекций» превращает их все в общее число.
    Поэтому каждое сводное место правится по своей формулировке.
    """
    p = os.path.join(BLOG, "lektorij", "index.html")
    if not os.path.exists(p):
        return
    s0 = read(p)
    kurs = plural(n_courses, ("курс", "курса", "курсов"))
    napr = plural(n_courses, ("направление", "направления", "направлений"))
    lekc = plural(n_lectures, ("лекция", "лекции", "лекций"))
    s = s0
    for pat, rep in (
            (r"\b\d+ направлени(?:е|я|й)(?=:)", "%d %s" % (n_courses, napr)),
            (r"\b\d+ курс(?:|а|ов) открыт(?:|ы|о) целиком",
             "%d %s открыт%s целиком" % (n_courses, kurs,
                                         "" if kurs == "курс" else "ы")),
            (r"\b\d+ курс(?:|а|ов)(?=: по интересу)", "%d %s" % (n_courses, kurs)),
            (r"\b\d+ лекци(?:я|и|й) уже открыт", "%d %s уже открыт" % (n_lectures, lekc))):
        s = re.sub(pat, rep, s)
    if s != s0:
        log.append("Лекторий: %d курсов, %d лекций (сводные числа)"
                   % (n_courses, n_lectures))
    write(p, s)


def main():
    bm = json.load(io.open(os.path.join(BLOG, "blogmap.json"), encoding="utf-8"))
    by = {}
    for a in bm["articles"]:
        by.setdefault(a["rubric"], []).append(a)
    for rk in sorted(by):
        sync_rubric(rk, by[rk])

    lect = os.path.join(BLOG, "lektorij")
    n_courses = len([d for d in os.listdir(lect)
                     if os.path.isdir(os.path.join(lect, d))
                     and os.path.exists(os.path.join(lect, d, "index.html"))])
    sync_hub(by)
    sync_lektorij(n_courses, len(by.get("lektorij", [])))

    print("%s%d правок" % ("БЕЗ ЗАПИСИ: " if dry else "", len(log)))
    for l in log:
        print("  " + l)


if __name__ == "__main__":
    main()
