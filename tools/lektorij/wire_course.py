#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Обвязка нового курса Лектория: каталог, ItemList, sitemap, llms.txt.

Восстановлен из уже собранных файлов — формат вставок совпадает с тем, что
стоит на сайте. Карточки лекций внутри курса ставит wire.wire, счётчики
пересчитывает tools/sync_counters.py.

    wire_course(slug, name, block, desc_catalog, desc_llms, lectures)
"""
import io, json, os, re

ROOT = "/home/user/dron939-sketch.github.io"
CAT = os.path.join(ROOT, "blog/lektorij/index.html")
SITEMAP = os.path.join(ROOT, "sitemap.xml")
LLMS = os.path.join(ROOT, "llms.txt")
TODAY = "2026-08-10"

CARD = ('<a class="dcard" href="/blog/lektorij/%s/">'
        '<img class="pic" src="/blog/lektorij/img/%s.webp" alt="" '
        'loading="lazy" width="200" height="200">'
        '<b>%s</b><span class="st open">Открыто</span></a>')

ITEM = ('''    {
      "@type": "ListItem",
      "position": %d,
      "item": {
        "@type": "Course",
        "name": "%s",
        "url": "https://meysternlp.ru/blog/lektorij/%s/",
        "description": "%s",
        "provider": {
          "@type": "Organization",
          "@id": "https://meysternlp.ru/#organization",
          "name": "Андрей Мейстер"
        },
        "inLanguage": "ru-RU",
        "isAccessibleForFree": true
      }
    }''')

URL = ('''  <url>
    <loc>https://meysternlp.ru/blog/lektorij/%s/</loc>
    <lastmod>%s</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
''')


def plural(n, one, few, many):
    """Русское склонение: 1 курс, 2 курса, 5 курсов."""
    n = abs(n) % 100
    if 11 <= n <= 14:
        return many
    n %= 10
    if n == 1:
        return one
    if 2 <= n <= 4:
        return few
    return many


def _catalog(slug, name, block, desc):
    s = io.open(CAT, encoding="utf-8").read()
    if ("/blog/lektorij/%s/" % slug) in s:
        raise SystemExit("курс %s уже есть в каталоге" % slug)

    anchor = 'id="%s"><div class="dgrid">\n' % block
    if anchor not in s:
        raise SystemExit("нет блока %s в каталоге" % block)
    s = s.replace(anchor, anchor + CARD % (slug, slug, name) + "\n", 1)

    # ItemList: новая запись последней. Позицию берём из самого ItemList,
    # а не подсчётом "ListItem" по всей странице — их же содержит
    # BreadcrumbList, и от этого numberOfItems разъезжается с реальностью.
    pos = _itemlist_len(s) + 1
    tail = '\n    }\n  ],\n  "numberOfItems"'
    if tail not in s:
        raise SystemExit("не найден хвост itemListElement")
    s = s.replace(tail, '\n    }\n,\n' + ITEM % (pos, name, slug, desc)
                  + '\n  ],\n  "numberOfItems"', 1)
    s = _fix_number_of_items(s)

    io.open(CAT, "w", encoding="utf-8").write(s)
    return pos


def _itemlist_blocks(s):
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>',
                         s, re.S):
        try:
            d = json.loads(m.group(1))
        except ValueError:
            continue
        if d.get("@type") == "ItemList":
            yield m, d


def _itemlist_len(s):
    for _, d in _itemlist_blocks(s):
        return len(d["itemListElement"])
    raise SystemExit("на странице каталога нет ItemList")


def _fix_number_of_items(s):
    """numberOfItems = реальное число курсов в ItemList."""
    for m, d in _itemlist_blocks(s):
        n = len(d["itemListElement"])
        block = re.sub(r'"numberOfItems": \d+', '"numberOfItems": %d' % n,
                       m.group(1))
        return s[:m.start(1)] + block + s[m.end(1):]
    return s


def _sitemap(slug):
    s = io.open(SITEMAP, encoding="utf-8").read()
    if ("/blog/lektorij/%s/" % slug) in s:
        return False
    s = s.replace("</urlset>", URL % (slug, TODAY) + "</urlset>", 1)
    io.open(SITEMAP, "w", encoding="utf-8").write(s)
    return True


def _llms(slug, name, desc, lectures, courses, total_lec):
    s = io.open(LLMS, encoding="utf-8").read()
    if ("/blog/lektorij/%s/" % slug) in s:
        return None
    line = ("- [%s](https://meysternlp.ru/blog/lektorij/%s/) — %d %s. %s\n"
            % (name, slug, lectures,
               plural(lectures, "лекция", "лекции", "лекций"), desc))
    # добавляем в конец списка курсов Лектория
    m = re.search(r'(## Лекторий[^\n]*\n)', s)
    if not m:
        raise SystemExit("нет раздела «## Лекторий» в llms.txt")
    start = m.end()
    nxt = s.find("\n## ", start)
    if nxt < 0:
        nxt = len(s)
    seg = s[start:nxt]
    last = seg.rfind("\n- [")
    if last < 0:
        raise SystemExit("не найден список курсов в llms.txt")
    eol = seg.find("\n", last + 1)
    seg = seg[:eol + 1] + line + seg[eol + 1:]
    s = s[:start] + seg + s[nxt:]

    head = "## Лекторий — %d %s лекций (%d %s)" % (
        courses, plural(courses, "бесплатный курс", "бесплатных курса",
                        "бесплатных курсов"),
        total_lec, plural(total_lec, "лекция", "лекции", "лекций"))
    s = re.sub(r'## Лекторий — [^\n]*', head, s, count=1)
    io.open(LLMS, "w", encoding="utf-8").write(s)
    return head


def _counts():
    """Число курсов и лекций считаем из каталога и blogmap, не руками."""
    cat = io.open(CAT, encoding="utf-8").read()
    courses = len(set(re.findall(r'class="dcard" href="/blog/lektorij/([^/"]+)/', cat)))
    bm = io.open(os.path.join(ROOT, "blog/blogmap.json"), encoding="utf-8").read()
    lec = len(re.findall(r'"lekciya-[^"]+"', bm))
    return courses, lec


def wire_course(slug, name, block, desc_catalog, desc_llms, lectures):
    pos = _catalog(slug, name, block, desc_catalog)
    sm = _sitemap(slug)
    courses, total_lec = _counts()
    head = _llms(slug, name, desc_llms, lectures, courses, total_lec)
    print("обвязка курса «%s»:" % name)
    print("  каталог: карточка в %s, ItemList → %d записей" % (block, pos))
    print("  sitemap: %s" % ("добавлен" if sm else "уже был"))
    print("  llms.txt: %s" % ("добавлен; " + head if head else "уже был"))
