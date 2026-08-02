#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Проверка целостности блога. Запуск из корня репозитория:

    python3 tools/check_blog.py            # только ошибки
    python3 tools/check_blog.py --all      # ещё и предупреждения

Что проверяется:
  * валидность JSON-LD в каждой статье;
  * якоря вида href="#..." указывают на существующий id;
  * внутренние ссылки /blog/... существуют на диске;
  * blogmap.json, search-index.json и sitemap.xml согласованы между собой;
  * счётчики на страницах рубрик совпадают с фактическим числом карточек;
  * статьи-сироты: нет ни одной входящей ссылки с других страниц.

Скрипт ничего не меняет — только сообщает. Код возврата 1, если есть ошибки.
"""
import os, io, re, sys, json, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, "blog")
LEVELS = [("🟢", "#1FA971", "новичку"), ("🔵", "#3A86FF", "среднему"), ("🔴", "#E5484D", "профи")]

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def read(p):
    return io.open(p, encoding="utf-8").read()


def article_files():
    return sorted(f for f in os.listdir(BLOG)
                  if f.endswith(".html") and f != "index.html")


def check_article(fn):
    p = os.path.join(BLOG, fn)
    s = read(p)
    for i, block in enumerate(re.findall(
            r'<script type="application/ld\+json">(.*?)</script>', s, re.S)):
        try:
            json.loads(block)
        except Exception as e:
            err("%s: JSON-LD #%d невалиден — %s" % (fn, i, e))
    ids = set(re.findall(r'id="([^"]+)"', s))
    for anc in set(re.findall(r'href="#([^"]+)"', s)):
        if anc and anc not in ids:
            err("%s: битый якорь #%s" % (fn, anc))
    for href in set(re.findall(r'href="(/blog/[^"#?]*)"', s)):
        t = os.path.join(ROOT, href.lstrip("/"))
        if href.endswith("/"):
            t = os.path.join(t, "index.html")
        if not os.path.exists(t):
            err("%s: битая ссылка %s" % (fn, href))
    op, cl = len(re.findall(r"<p[ >]", s)), s.count("</p>")
    if op != cl:
        warn("%s: несовпадение <p>/</p> — %d и %d" % (fn, op, cl))


def check_catalog():
    bm = json.load(io.open(os.path.join(BLOG, "blogmap.json"), encoding="utf-8"))
    idx = json.load(io.open(os.path.join(BLOG, "search-index.json"), encoding="utf-8"))
    sm = read(os.path.join(ROOT, "sitemap.xml"))

    bm_slugs = {a["slug"] for a in bm["articles"]}
    idx_slugs = {a["s"] for a in idx}
    rubrics = {r["key"] for r in bm["rubrics"]}

    dup = [s for s, n in collections.Counter(a["slug"] for a in bm["articles"]).items() if n > 1]
    for s in dup:
        err("blogmap: slug %s встречается дважды" % s)

    for a in bm["articles"]:
        if a["rubric"] not in rubrics:
            err("blogmap: %s — неизвестная рубрика %s" % (a["slug"], a["rubric"]))
        if a["rubric"] != "lektorij" and not os.path.exists(
                os.path.join(BLOG, a["slug"] + ".html")):
            err("blogmap: %s — нет файла" % a["slug"])

    for s in sorted(bm_slugs - idx_slugs):
        err("%s есть в blogmap, но нет в search-index" % s)
    for s in sorted(idx_slugs - bm_slugs):
        err("%s есть в search-index, но нет в blogmap" % s)

    for fn in article_files():
        slug = fn[:-5]
        if slug not in bm_slugs:
            warn("%s не числится в blogmap" % fn)
        elif ("/blog/%s.html" % slug) not in sm:
            err("%s отсутствует в sitemap.xml" % slug)


def check_rubrics():
    base = os.path.join(BLOG, "rubrika")
    if not os.path.isdir(base):
        return
    for rk in sorted(os.listdir(base)):
        p = os.path.join(base, rk, "index.html")
        if not os.path.exists(p):
            continue
        s = read(p)
        total = len(re.findall(r'<li><a href="/blog/', s))
        m = re.search(r"<b>(\d+)</b> стать\w+", s)
        if m and int(m.group(1)) != total:
            err("рубрика %s: в счётчике %s, фактически %d" % (rk, m.group(1), total))
        for ic, color, lbl in LEVELS:
            g = re.search(r'<h2>%s[^<]*<span[^>]*>· (\d+)</span></h2>'
                          r'<ul class="art-list">(.*?)</ul>' % ic, s, re.S)
            if not g:
                continue
            fact = len(re.findall(r"<li>", g.group(2)))
            if int(g.group(1)) != fact:
                err("рубрика %s, уровень «%s»: в заголовке %s, фактически %d"
                    % (rk, lbl, g.group(1), fact))
            d = re.search(r'background:%s"></i>(\d+) %s' % (re.escape(color), lbl), s)
            if d and int(d.group(1)) != fact:
                err("рубрика %s, уровень «%s»: в подписи %s, фактически %d"
                    % (rk, lbl, d.group(1), fact))


def check_orphans():
    """Статья-сирота: на неё не ссылается ни одна другая страница сайта."""
    incoming = collections.Counter()
    pages = []
    skip = {".git", "node_modules"}
    for dirpath, dirnames, names in os.walk(ROOT):
        # сравниваем компоненты пути, а не подстроку: имя репозитория
        # dron939-sketch.github.io само содержит «.git»
        dirnames[:] = [d for d in dirnames if d not in skip]
        pages += [os.path.join(dirpath, n) for n in names if n.endswith(".html")]
    for p in pages:
        src = os.path.basename(p)[:-5]
        for href in set(re.findall(r'href="/blog/([a-z0-9-]+)\.html"', read(p))):
            if href != src:
                incoming[href] += 1
    for fn in article_files():
        if incoming[fn[:-5]] == 0:
            warn("%s — сирота: ни одной входящей ссылки" % fn)


def main():
    show_all = "--all" in sys.argv
    for fn in article_files():
        check_article(fn)
    check_catalog()
    check_rubrics()
    check_orphans()

    print("ошибок: %d, предупреждений: %d" % (len(errors), len(warnings)))
    for e in errors:
        print("  ОШИБКА  %s" % e)
    if show_all:
        for w in warnings:
            print("  внимание %s" % w)
    elif warnings:
        print("  (%d предупреждений скрыто, показать: --all)" % len(warnings))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
