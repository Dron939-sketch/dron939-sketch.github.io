#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Пересборка RSS по фактическому содержимому блога.

    python3 tools/build_feed.py --dry-run
    python3 tools/build_feed.py [--limit 200]

feed.xml отстал: 309 записей, самая свежая от 25 июня, при 1252 статьях в
блоге. Дзен, Пульс Mail.ru и читалки подтягивают только то, что в фиде, —
всё, что вышло после июня, до них не доходило.

Шапка канала не трогается: правится только список записей и lastBuildDate.
Записи берутся по дате публикации из разметки статьи, свежие сверху.
"""
import os, io, re, sys, json, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, "blog")
SITE = "https://meysternlp.ru"
dry = "--dry-run" in sys.argv
LIMIT = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 200

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def rfc822(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    dt = datetime.date(y, m, d)
    return "%s, %02d %s %d 10:00:00 +0300" % (DAYS[dt.weekday()], d, MON[m - 1], y)


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def articles():
    out = []
    for fn in sorted(os.listdir(BLOG)):
        if not fn.endswith(".html") or fn == "index.html":
            continue
        s = io.open(os.path.join(BLOG, fn), encoding="utf-8", errors="replace").read()
        if "noindex" in s:
            continue
        t = re.search(r"<title>(.*?)</title>", s, re.S)
        d = re.search(r'<meta name="description" content="([^"]*)"', s)
        date = None
        for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
            try:
                j = json.loads(b)
            except Exception:
                continue
            for node in (j.get("@graph") or [j]):
                if node.get("datePublished"):
                    date = node["datePublished"][:10]
                    break
            if date:
                break
        if not (t and d and date):
            continue
        title = t.group(1).split(" | ")[0].split(" — Андрей")[0].strip()
        out.append((date, fn[:-5], title, d.group(1)))
    out.sort(reverse=True)
    return out


def main():
    arts = articles()[:LIMIT]
    items = []
    for date, slug, title, desc in arts:
        url = "%s/blog/%s.html" % (SITE, slug)
        items.append(
            "    <item>\n"
            "      <title>%s</title>\n"
            "      <link>%s</link>\n"
            '      <guid isPermaLink="true">%s</guid>\n'
            "      <pubDate>%s</pubDate>\n"
            "      <dc:creator>Андрей Мейстер</dc:creator>\n"
            "      <description>%s</description>\n"
            "    </item>" % (esc(title), url, url, rfc822(date), esc(desc)))

    p = os.path.join(ROOT, "feed.xml")
    s = io.open(p, encoding="utf-8").read()
    first, last = s.index("    <item>"), s.rindex("</item>") + len("</item>")
    was = len(re.findall(r"<item>", s))
    s = s[:first] + "\n".join(items) + s[last:]
    s = re.sub(r"<lastBuildDate>[^<]*</lastBuildDate>",
               "<lastBuildDate>%s</lastBuildDate>"
               % rfc822(datetime.date.today().isoformat()), s)
    if not dry:
        io.open(p, "w", encoding="utf-8").write(s)
    print("%sзаписей в feed.xml: %d → %d, самая свежая %s"
          % ("БЕЗ ЗАПИСИ: " if dry else "", was, len(items), arts[0][0] if arts else "—"))


if __name__ == "__main__":
    main()
