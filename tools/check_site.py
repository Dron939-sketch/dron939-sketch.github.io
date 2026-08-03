#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Проверка всего сайта: ссылки, ресурсы, разметка, индексируемость.

    python3 tools/check_site.py            # только ошибки
    python3 tools/check_site.py --all      # ещё и предупреждения
    python3 tools/check_site.py --only ссылки,мета

Дополняет tools/check_blog.py, который смотрит только на целостность блога
(каталоги, счётчики рубрик, сироты). Здесь — весь репозиторий целиком:

  ссылки   внутренние href/src существуют на диске; якоря ведут на живой id
  ресурсы  картинки, css, js, шрифты, og:image, favicon, манифест
  разметка  JSON-LD парсится; lang; одинарный <h1>; alt у картинок
  мета     title, description, canonical, og:*, robots — наличие, длина, дубли
  карта    sitemap.xml покрывает страницы и не ссылается на удалённые
  прочее   robots.txt, feed.xml, llms.txt, битые внешние протоколы

Скрипт ничего не меняет — только сообщает. Код возврата 1, если есть ошибки.
"""
import os, io, re, sys, json, collections

try:
    from urllib.parse import unquote
except ImportError:
    from urllib import unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://meysternlp.ru"

# Каталоги, которых нет в публикации: черновики, служебное, инструменты.
SKIP_DIRS = {".git", ".github", "node_modules", "tools", "scripts",
             "b17-drafts", "vk-drafts", "docs"}
# Страницы, которые намеренно не индексируются и живут по своим правилам.
NOINDEX_OK = {"404.html", "yandex_a82c657db3e2d540.html",
              "header.html", "footer.html",
              "fredi/admin-analytics.html", "kontur/test.html", "kontur/v2.html"}
# Не страницы, а служебные файлы: у них нет ни <html>, ни меты, и не должно быть.
# header/footer — включаемые фрагменты, yandex_* — файл подтверждения прав.
FRAGMENTS = {"header.html", "footer.html", "yandex_a82c657db3e2d540.html"}

errors, warnings = [], []


def err(cat, msg):
    errors.append((cat, msg))


def warn(cat, msg):
    warnings.append((cat, msg))


def read(p):
    return io.open(p, encoding="utf-8", errors="replace").read()


def strip_scripts(s):
    """Ссылки внутри <script> — это шаблоны JS ('/blog/'+a.s+'.html'), а не URL.

    Проверять их регуляркой бессмысленно: получаются одни ложные срабатывания.
    JSON-LD оставляем — он проверяется отдельно и настоящих href не содержит.
    """
    return re.sub(r"<script\b(?![^>]*application/ld\+json)[^>]*>.*?</script>",
                  "", s, flags=re.S | re.I)


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


def walk_html():
    """Все .html репозитория, кроме служебных каталогов."""
    out = []
    for dirpath, dirnames, names in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        out += [os.path.join(dirpath, n) for n in names if n.endswith(".html")]
    return sorted(out)


def walk_assets():
    """Множество путей всех файлов репозитория — для проверки ссылок."""
    have = set()
    for dirpath, dirnames, names in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d != ".git"]
        for n in names:
            have.add(rel(os.path.join(dirpath, n)))
    return have


# ---------------------------------------------------------------- ссылки

def resolve(href, page):
    """URL страницы -> путь в репозитории. None, если проверять нечего."""
    href = href.strip()
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:",
                                    "data:", "http://", "https://", "//")):
        return None
    href = href.split("#", 1)[0].split("?", 1)[0]
    if not href:
        return None
    # На диске файлы лежат с пробелами и кириллицей, в href — %20 и т. п.
    href = unquote(href)
    if href.startswith("/"):
        path = href.lstrip("/")
    else:
        path = os.path.normpath(os.path.join(os.path.dirname(rel(page)), href))
        path = path.replace(os.sep, "/")
    if path.startswith(".."):
        return None
    if href.endswith("/") or (path and "." not in os.path.basename(path)):
        path = (path.rstrip("/") + "/index.html").lstrip("/")
    return path


def check_links(pages, have):
    """Ссылки и ресурсы. Заодно собираем входящие для поиска недостижимых."""
    incoming = collections.Counter()
    for p in pages:
        full = read(p)
        s = strip_scripts(full)
        name = rel(p)
        ids = set(re.findall(r'\bid="([^"]+)"', s))
        # href и src вперемешку: и то и другое должно существовать
        refs = re.findall(r'(?:href|src)="([^"]*)"', s)
        for h in set(refs):
            t = resolve(h, p)
            if t is None:
                continue
            if t not in have:
                err("ссылки", "%s → %s (нет файла)" % (name, h))
            elif t.endswith(".html"):
                incoming[t] += 1
        # <base href="/"> уводит даже ссылку вида href="#glava-2" на главную:
        # по спецификации фрагмент резолвится относительно base, а не страницы.
        # Из-за этого на 969 страницах не работало ни одно оглавление.
        anchors = set(re.findall(r'href="#([^"]+)"', s))
        base = re.search(r'<base\s+href="([^"]*)"', s)
        if base and anchors:
            err("ссылки", "%s: <base href=\"%s\"> ломает %d внутристраничных "
                "ссылок — они уводят на %s" % (name, base.group(1), len(anchors),
                                               base.group(1)))
        for anc in anchors:
            if anc and anc not in ids:
                err("ссылки", "%s: битый якорь #%s" % (name, anc))
        # ссылки на свой же домен абсолютным URL — проверяем как внутренние
        for u in set(re.findall(r'href="%s(/[^"#?]*)"' % re.escape(SITE), s)):
            t = resolve(u, p)
            if t and t not in have:
                err("ссылки", "%s → %s%s (нет файла)" % (name, SITE, u))
        # srcset
        for ss in re.findall(r'srcset="([^"]+)"', s):
            for part in ss.split(","):
                u = part.strip().split(" ")[0]
                t = resolve(u, p)
                if t and t not in have:
                    err("ресурсы", "%s: srcset → %s (нет файла)" % (name, u))
    return incoming


# ---------------------------------------------------------------- разметка

def check_markup(pages):
    for p in pages:
        name = rel(p)
        if name in FRAGMENTS:
            continue
        full = read(p)
        # разметку тоже считаем по странице без скриптов: <img> в комментарии
        # внутри JS — не картинка и alt ему не нужен
        s = strip_scripts(full)
        for i, block in enumerate(re.findall(
                r'<script type="application/ld\+json">(.*?)</script>', s, re.S)):
            try:
                json.loads(block)
            except Exception as e:
                err("разметка", "%s: JSON-LD #%d невалиден — %s" % (name, i, e))
        if not re.search(r'<html[^>]*\blang=', s):
            err("разметка", "%s: нет lang у <html>" % name)
        h1 = len(re.findall(r"<h1[ >]", s))
        # у неиндексируемых страниц (админка, 404) заголовок ни на что не влияет
        indexable = name not in NOINDEX_OK and "noindex" not in full
        if h1 == 0:
            if indexable:
                warn("разметка", "%s: нет <h1>" % name)
        elif h1 > 1:
            warn("разметка", "%s: <h1> встречается %d раза" % (name, h1))
        noalt = [t for t in re.findall(r"<img\b[^>]*>", s) if 'alt=' not in t]
        if noalt:
            warn("разметка", "%s: %d <img> без alt" % (name, len(noalt)))
        if not re.search(r'<meta[^>]+charset', s, re.I):
            err("разметка", "%s: нет charset" % name)
        if not re.search(r'name="viewport"', s):
            warn("разметка", "%s: нет viewport" % name)


# ---------------------------------------------------------------- мета

def attr(s, pattern):
    m = re.search(pattern, s)
    return m.group(1).strip() if m else None


def check_meta(pages):
    titles, canons = collections.defaultdict(list), collections.defaultdict(list)
    for p in pages:
        name = rel(p)
        if name in FRAGMENTS:
            continue
        s = read(p)
        indexable = name not in NOINDEX_OK and "noindex" not in s

        title = attr(s, r"<title>(.*?)</title>")
        desc = attr(s, r'<meta name="description" content="([^"]*)"')
        canon = attr(s, r'<link rel="canonical" href="([^"]*)"')

        if not title:
            err("мета", "%s: нет <title>" % name)
        elif indexable:
            titles[title].append(name)
            if len(title) > 70:
                warn("мета", "%s: <title> %d символов (>70)" % (name, len(title)))
            elif len(title) < 15:
                warn("мета", "%s: <title> слишком короткий — «%s»" % (name, title))

        if indexable:
            if not desc:
                err("мета", "%s: нет meta description" % name)
            elif not (50 <= len(desc) <= 200):
                warn("мета", "%s: description %d символов (норма 50–200)"
                     % (name, len(desc)))
            if not canon:
                err("мета", "%s: нет canonical" % name)
            else:
                canons[canon].append(name)
                if not canon.startswith(SITE):
                    err("мета", "%s: canonical на чужой домен — %s" % (name, canon))
                else:
                    want = "/" if name == "index.html" else (
                        "/" + name[:-len("index.html")] if name.endswith("/index.html")
                        else "/" + name)
                    if canon[len(SITE):].rstrip("/") != want.rstrip("/"):
                        err("мета", "%s: canonical указывает на %s" % (name, canon))
            for prop in ("og:title", "og:description", "og:image", "og:url"):
                if 'property="%s"' % prop not in s:
                    warn("мета", "%s: нет %s" % (name, prop))

    for t, ps in sorted(titles.items()):
        if len(ps) > 1:
            err("мета", "одинаковый <title> «%s» на %d страницах: %s"
                % (t[:60], len(ps), ", ".join(sorted(ps)[:4])))
    for c, ps in sorted(canons.items()):
        if len(ps) > 1:
            err("мета", "один canonical %s на %d страницах: %s"
                % (c, len(ps), ", ".join(sorted(ps)[:4])))


# ---------------------------------------------------------------- карта сайта

def check_sitemap(pages, have):
    p = os.path.join(ROOT, "sitemap.xml")
    if not os.path.exists(p):
        err("карта", "нет sitemap.xml")
        return
    s = read(p)
    locs = re.findall(r"<loc>([^<]+)</loc>", s)
    dup = [u for u, n in collections.Counter(locs).items() if n > 1]
    for u in sorted(dup)[:20]:
        err("карта", "sitemap: %s встречается %d раза" % (u, locs.count(u)))

    in_map = set()
    for u in locs:
        if not u.startswith(SITE):
            err("карта", "sitemap: чужой домен — %s" % u)
            continue
        path = u[len(SITE):].lstrip("/")
        path = (path + "index.html") if (path == "" or path.endswith("/")) else path
        in_map.add(path)
        if path not in have:
            err("карта", "sitemap: %s — нет такого файла" % u)

    for pg in pages:
        name = rel(pg)
        if name in NOINDEX_OK or name in FRAGMENTS:
            continue
        s2 = read(pg)
        if "noindex" in s2:
            continue
        if name not in in_map:
            warn("карта", "%s не попала в sitemap.xml" % name)

    for f in ("robots.txt", "feed.xml", "llms.txt", "site.webmanifest"):
        if not os.path.exists(os.path.join(ROOT, f)):
            err("карта", "нет %s" % f)
    rb = read(os.path.join(ROOT, "robots.txt"))
    for sm in re.findall(r"Sitemap:\s*(\S+)", rb):
        path = sm[len(SITE):].lstrip("/") if sm.startswith(SITE) else None
        if path and path not in have:
            err("карта", "robots.txt ссылается на несуществующий %s" % sm)


def check_feed(have):
    p = os.path.join(ROOT, "feed.xml")
    if not os.path.exists(p):
        return
    s = read(p)
    for u in set(re.findall(r"<link>([^<]+)</link>", s)):
        if not u.startswith(SITE):
            continue
        path = u[len(SITE):].lstrip("/")
        path = (path + "index.html") if (path == "" or path.endswith("/")) else path
        if path not in have:
            err("карта", "feed.xml → %s (нет файла)" % u)

    p = os.path.join(ROOT, "llms.txt")
    if os.path.exists(p):
        for u in set(re.findall(r"\((%s[^)]*)\)" % re.escape(SITE), read(p))):
            path = u[len(SITE):].lstrip("/").split("#")[0]
            path = (path + "index.html") if (path == "" or path.endswith("/")) else path
            if path and path not in have:
                err("карта", "llms.txt → %s (нет файла)" % u)


# ---------------------------------------------------------------- недостижимые

def check_reachable(pages, incoming):
    """Страница вне блога, на которую неоткуда перейти."""
    for p in pages:
        name = rel(p)
        if name.startswith("blog/") or name in NOINDEX_OK or name in FRAGMENTS:
            continue
        if name == "index.html":
            continue
        if not incoming[name]:
            warn("ссылки", "%s — недостижима: ни одной входящей ссылки" % name)


def main():
    show_all = "--all" in sys.argv
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))

    pages, have = walk_html(), walk_assets()
    incoming = check_links(pages, have)
    check_markup(pages)
    check_meta(pages)
    check_sitemap(pages, have)
    check_feed(have)
    check_reachable(pages, incoming)

    def show(items):
        return [(c, m) for c, m in items if not only or c in only]

    e, w = show(errors), show(warnings)
    print("страниц: %d, ошибок: %d, предупреждений: %d" % (len(pages), len(e), len(w)))
    by = collections.Counter(c for c, _ in e)
    if by:
        print("по разделам: " + ", ".join("%s %d" % kv for kv in by.most_common()))
    for c, m in e:
        print("  ОШИБКА  [%s] %s" % (c, m))
    if show_all:
        for c, m in w:
            print("  внимание [%s] %s" % (c, m))
    elif w:
        print("  (%d предупреждений скрыто, показать: --all)" % len(w))
    return 1 if e else 0


if __name__ == "__main__":
    sys.exit(main())
