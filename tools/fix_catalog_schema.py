#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Разметка каталожных страниц: курсы Лектория и страницы рубрик.

    python3 tools/fix_catalog_schema.py --dry-run
    python3 tools/fix_catalog_schema.py

Курсы. У всех 75 стоял Course без hasCourseInstance — обязательного поля,
без которого Google не показывает сниппет курса вообще. Не было ни offers
(курсы бесплатные, это нужно объявить явно ценой 0), ни url у 72 из 75,
ни списка лекций. Добавляем всё перечисленное, включая hasPart — список
лекций курса: он даёт машине карту курса, а не просто название.

Рубрики. У всех 15 страниц CollectionPage перечисляет десятки статей в
видимом списке, но mainEntity пуст — для машины страница выглядит пустой.
Добавляем ItemList с позициями и адресами статей.
"""
import os, io, re, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, "blog")
SITE = "https://meysternlp.ru"
dry = "--dry-run" in sys.argv

PROVIDER = {"@type": "Organization", "@id": SITE + "/#organization",
            "name": "Андрей Мейстер"}


def read(p):
    return io.open(p, encoding="utf-8", errors="replace").read()


def write(p, s):
    if not dry:
        io.open(p, "w", encoding="utf-8").write(s)


def title_of(s, fallback=""):
    h = re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S)
    if h:
        return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h.group(1))).strip()
    return fallback


def blocks(s):
    return re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)


def courses():
    base = os.path.join(BLOG, "lektorij")
    n = 0
    for d in sorted(os.listdir(base)):
        p = os.path.join(base, d, "index.html")
        if not os.path.exists(p):
            continue
        s0 = read(p)
        s = s0
        url = "%s/blog/lektorij/%s/" % (SITE, d)
        # лекции курса в порядке появления на странице
        seen, lect = set(), []
        for sl in re.findall(r'href="/blog/(lekciya-[a-z0-9-]+)\.html"', s0):
            if sl not in seen:
                seen.add(sl)
                lect.append(sl)
        names = {}
        for sl in lect:
            lp = os.path.join(BLOG, sl + ".html")
            if os.path.exists(lp):
                names[sl] = title_of(read(lp), sl)

        for b in blocks(s0):
            try:
                d2 = json.loads(b)
            except Exception:
                continue
            nodes = d2.get("@graph") or [d2]
            hit = False
            for node in nodes:
                if node.get("@type") != "Course":
                    continue
                hit = True
                node["url"] = url
                node["isAccessibleForFree"] = True
                node["provider"] = PROVIDER
                node["inLanguage"] = "ru-RU"
                # обязательное поле: без него сниппет курса не показывается
                node["hasCourseInstance"] = {
                    "@type": "CourseInstance",
                    "courseMode": "online",
                    "courseWorkload": "PT%dH" % max(1, round(len(lect) * 0.4)),
                    "inLanguage": "ru-RU",
                    "offers": {"@type": "Offer", "price": "0",
                               "priceCurrency": "RUB",
                               "availability": "https://schema.org/InStock"}}
                node["offers"] = {"@type": "Offer", "price": "0",
                                  "priceCurrency": "RUB", "category": "Free",
                                  "availability": "https://schema.org/InStock"}
                node["numberOfCredits"] = len(lect)
                node["hasPart"] = [
                    {"@type": "LearningResource", "name": names.get(sl, sl),
                     "url": "%s/blog/%s.html" % (SITE, sl)} for sl in lect]
            if hit:
                new = json.dumps(d2, ensure_ascii=False, indent=2)
                s = s.replace(b, "\n" + new + "\n", 1)
        if s != s0:
            write(p, s)
            n += 1
    print("%sкурсов дополнено: %d" % ("БЕЗ ЗАПИСИ: " if dry else "", n))


def rubrics():
    base = os.path.join(BLOG, "rubrika")
    n = 0
    for rk in sorted(os.listdir(base)):
        p = os.path.join(base, rk, "index.html")
        if not os.path.exists(p):
            continue
        s0 = read(p)
        if any("ItemList" in b for b in blocks(s0)):
            continue
        items = []
        for m in re.finditer(r'<li><a href="/blog/([a-z0-9-]+)\.html">'
                             r'<span class="t">([^<]+)</span>', s0):
            items.append((m.group(1), m.group(2)))
        if not items:
            continue
        s = s0
        for b in blocks(s0):
            try:
                d2 = json.loads(b)
            except Exception:
                continue
            nodes = d2.get("@graph") or [d2]
            hit = False
            for node in nodes:
                if node.get("@type") != "CollectionPage":
                    continue
                hit = True
                node["mainEntity"] = {
                    "@type": "ItemList",
                    "numberOfItems": len(items),
                    "itemListElement": [
                        {"@type": "ListItem", "position": i + 1, "name": t,
                         "url": "%s/blog/%s.html" % (SITE, sl)}
                        for i, (sl, t) in enumerate(items)]}
            if hit:
                s = s.replace(b, "\n" + json.dumps(d2, ensure_ascii=False, indent=2) + "\n", 1)
        if s != s0:
            write(p, s)
            n += 1
    print("%sстраниц рубрик дополнено ItemList: %d" % ("БЕЗ ЗАПИСИ: " if dry else "", n))


if __name__ == "__main__":
    courses()
    rubrics()
