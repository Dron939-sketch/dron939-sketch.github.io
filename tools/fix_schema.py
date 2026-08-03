#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Приведение Schema.org-разметки к одному виду по всему сайту.

    python3 tools/fix_schema.py --dry-run
    python3 tools/fix_schema.py

Разметка накапливалась разными скриптами и разъехалась. Машина не может
слить сайт в одну сущность, если издатель называется то «Андрей Мейстер»,
то «Meysternlp», то «Meister NLP», а автор описан пятнадцатью способами и
у шести статей вообще указан организацией.

Что делает:

  издатель   один Organization с @id …/#organization и постоянным логотипом;
  автор      один Person с @id …/#person и ссылкой на /obo-mne/
             (у части статей стоял несуществующий /o-mne.html);
  image      берётся из og:image страницы — без него Google не показывает
             сниппет статьи с картинкой;
  dateModified  если его нет, равен дате публикации: иначе материал выглядит
             никогда не обновлявшимся;
  mainEntityOfPage  берётся из canonical;
  крошки     BreadcrumbList там, где его нет, и пересборка у лекций:
             у всех 764 стояло «Главная → Блог → Лекция N», без Лектория и
             курса, то есть лекции выглядели плоской кучей статей;
  Article    страницам вовсе без JSON-LD добавляется узел Article.

Существующий видимый текст не трогается — правится только разметка.
"""
import os, io, re, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://meysternlp.ru"
BLOG = os.path.join(ROOT, "blog")
dry = "--dry-run" in sys.argv

PUBLISHER = {"@type": "Organization", "@id": SITE + "/#organization",
             "name": "Андрей Мейстер",
             "logo": {"@type": "ImageObject", "url": SITE + "/logo.png"}}
AUTHOR = {"@type": "Person", "@id": SITE + "/#person",
          "name": "Андрей Мейстер",
          "jobTitle": "Психолог, методолог",
          "url": SITE + "/obo-mne/"}
ART_TYPES = ("Article", "BlogPosting", "NewsArticle", "TechArticle")

stat = {}


def bump(k, n=1):
    stat[k] = stat.get(k, 0) + n


def read(p):
    return io.open(p, encoding="utf-8", errors="replace").read()


def pages():
    out = []
    for dirpath, dirnames, names in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames
                       if d not in {".git", "tools", "scripts", "b17-drafts",
                                    "vk-drafts", "docs", "node_modules"}]
        out += [os.path.join(dirpath, n) for n in names if n.endswith(".html")]
    return sorted(out)


def meta(s, pat):
    m = re.search(pat, s)
    return m.group(1).strip() if m else None


def og(s, prop):
    """og-тег. Порядок атрибутов на сайте разный: и property-content,
    и content-property, поэтому проверяем оба."""
    for pat in (r'<meta property="%s" content="([^"]+)"' % prop,
                r'<meta content="([^"]+)" property="%s"' % prop):
        m = re.search(pat, s)
        if m:
            return m.group(1).strip()
    return None


def git_date(rel):
    import subprocess
    try:
        out = subprocess.check_output(
            ["git", "log", "--diff-filter=A", "--format=%as", "-1", "--", rel],
            cwd=ROOT, stderr=subprocess.DEVNULL).decode().strip()
    except Exception:
        return None
    return out or None


# ------------------------------------------------------------- крошки

def lecture_course():
    """Лекция -> (каталог курса, название курса)."""
    out = {}
    lect = os.path.join(BLOG, "lektorij")
    if not os.path.isdir(lect):
        return out
    for d in sorted(os.listdir(lect)):
        p = os.path.join(lect, d, "index.html")
        if not os.path.exists(p):
            continue
        s = read(p)
        name = meta(s, r"<h1[^>]*>(.*?)</h1>") or d
        name = re.sub(r"<[^>]+>", "", name).strip()
        for sl in re.findall(r'href="/blog/(lekciya-[a-z0-9-]+)\.html"', s):
            out[sl] = (d, name)
    return out


def crumbs(rel, s, lec):
    """Цепочка (название, url) для страницы."""
    title = (meta(s, r"<title>(.*?)</title>") or "").split(" | ")[0].split(" — Андрей")[0].strip()
    h1 = meta(s, r"<h1[^>]*>(.*?)</h1>")
    if h1:
        h1 = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h1)).strip()
    name = h1 or title
    url = SITE + "/" + (rel[:-len("index.html")] if rel.endswith("index.html") else rel)
    home = ("Главная", SITE + "/")

    if rel.startswith("blog/lekciya-"):
        slug = rel[len("blog/"):-len(".html")]
        c = lec.get(slug)
        chain = [home, ("Блог", SITE + "/blog/"), ("Лекторий", SITE + "/blog/lektorij/")]
        if c:
            chain.append(("Курс «%s»" % c[1], "%s/blog/lektorij/%s/" % (SITE, c[0])))
        return chain + [(name, url)]
    if rel.startswith("blog/lektorij/") and rel.endswith("index.html"):
        if rel == "blog/lektorij/index.html":
            return [home, ("Блог", SITE + "/blog/"), ("Лекторий", url)]
        return [home, ("Блог", SITE + "/blog/"),
                ("Лекторий", SITE + "/blog/lektorij/"), (name, url)]
    if rel.startswith("blog/rubrika/"):
        return [home, ("Блог", SITE + "/blog/"), (name, url)]
    if rel == "blog/index.html":
        return [home, ("Блог", url)]
    if rel.startswith("blog/"):
        return [home, ("Блог", SITE + "/blog/"), (name, url)]
    if rel.startswith("istorii/"):
        return ([home, ("Истории", url)] if rel == "istorii/index.html"
                else [home, ("Истории", SITE + "/istorii/"), (name, url)])
    if rel.startswith("knigi/nastolnaya-kniga-deputata/"):
        chain = [home, ("Книги", SITE + "/knigi/"),
                 ("Настольная книга депутата", SITE + "/knigi/nastolnaya-kniga-deputata/")]
        return chain if rel.endswith("deputata/index.html") else chain + [(name, url)]
    if rel.count("/") == 1 and rel.endswith("index.html"):
        return [home, (name, url)]
    if rel == "index.html":
        return None
    return [home, (name, url)]


def bc_node(chain):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": n, "item": u}
                for i, (n, u) in enumerate(chain)]}


# ------------------------------------------------------------- обработка

def fix_node(node, s, rel):
    """Нормализовать один узел Article."""
    t = node.get("@type")
    if t not in ART_TYPES:
        return
    if node.get("publisher") != PUBLISHER:
        node["publisher"] = PUBLISHER
        bump("издатель приведён к одному Organization")
    if node.get("author") != AUTHOR:
        node["author"] = AUTHOR
        bump("автор приведён к одному Person")
    if "image" not in node:
        img = og(s, "og:image")
        if img:
            node["image"] = img
            bump("добавлен image из og:image")
    if "mainEntityOfPage" not in node:
        can = meta(s, r'<link rel="canonical" href="([^"]+)"')
        if can:
            node["mainEntityOfPage"] = {"@type": "WebPage", "@id": can}
            bump("добавлен mainEntityOfPage")
    if "datePublished" not in node:
        # у историй и глав книги дат не было вовсе — берём дату появления
        # файла в репозитории, как в tools/fix_dates.py
        d = git_date(rel)
        if d:
            node["datePublished"] = d
            bump("добавлен datePublished по дате файла в репозитории")
    if "dateModified" not in node and node.get("datePublished"):
        node["dateModified"] = node["datePublished"]
        bump("добавлен dateModified")


def article_node(s, rel):
    """Узел Article для страницы, у которой разметки нет вовсе."""
    can = meta(s, r'<link rel="canonical" href="([^"]+)"')
    title = meta(s, r"<title>(.*?)</title>")
    desc = meta(s, r'<meta name="description" content="([^"]*)"')
    date = meta(s, r'article:published_time" content="([\d-]+)')
    if not (can and title and desc):
        return None
    h1 = meta(s, r"<h1[^>]*>(.*?)</h1>")
    head = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h1)).strip() if h1 else \
        title.split(" | ")[0].split(" — Андрей")[0].strip()
    node = {"@context": "https://schema.org", "@type": "Article",
            "headline": head, "description": desc, "inLanguage": "ru-RU",
            "mainEntityOfPage": {"@type": "WebPage", "@id": can},
            "author": AUTHOR, "publisher": PUBLISHER}
    img = og(s, "og:image")
    if img:
        node["image"] = img
    if date:
        node["datePublished"] = date
        node["dateModified"] = date
    return node


def dump(node):
    return ('<script type="application/ld+json">\n%s\n</script>'
            % json.dumps(node, ensure_ascii=False, indent=2))


def main():
    lec = lecture_course()
    changed = 0
    for p in pages():
        rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
        s0 = read(p)
        if "noindex" in s0 or rel in ("header.html", "footer.html"):
            continue
        s = s0

        # --- нормализуем существующие блоки
        has_bc = False
        for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
            try:
                d = json.loads(block)
            except Exception:
                continue
            nodes = d.get("@graph") or [d]
            for node in nodes:
                if node.get("@type") == "BreadcrumbList":
                    has_bc = True
                    if rel.startswith("blog/lekciya-"):
                        ch = crumbs(rel, s, lec)
                        if ch and len(node.get("itemListElement", [])) < len(ch):
                            node["itemListElement"] = bc_node(ch)["itemListElement"]
                            bump("крошки лекции пересобраны через Лекторий и курс")
                fix_node(node, s, rel)
            new = json.dumps(d, ensure_ascii=False, indent=2)
            if new.strip() != block.strip():
                s = s.replace(block, "\n" + new + "\n", 1)

        # --- страница вовсе без разметки
        if '<script type="application/ld+json">' not in s:
            node = article_node(s, rel)
            if node and "</head>" in s:
                s = s.replace("</head>", dump(node) + "\n</head>", 1)
                bump("добавлен узел Article странице без разметки")
                has_bc = False

        # --- крошки, если их нет
        if not has_bc:
            ch = crumbs(rel, s, lec)
            if ch and len(ch) > 1 and "</head>" in s:
                s = s.replace("</head>", dump(bc_node(ch)) + "\n</head>", 1)
                bump("добавлен BreadcrumbList")

        if s != s0:
            changed += 1
            if not dry:
                io.open(p, "w", encoding="utf-8").write(s)

    print("%sстраниц изменено: %d" % ("БЕЗ ЗАПИСИ: " if dry else "", changed))
    for k, v in sorted(stat.items(), key=lambda x: -x[1]):
        print("  %-52s %d" % (k, v))


if __name__ == "__main__":
    main()
