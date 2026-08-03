#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Приведение мета-тегов в порядок по всему сайту.

    python3 tools/fix_meta.py --dry-run     # показать, что изменится
    python3 tools/fix_meta.py               # применить

Делает три вещи, каждая идемпотентна:

  og      добавляет недостающие og:type/og:title/og:description/og:url,
          выводя их из <title>, meta description и canonical;
          и og:image со стандартной картинкой сайта, если своей нет;
  описания подрезает meta description длиннее MAX_DESC до целого предложения:
          в выдаче всё равно показывается ~160 символов, а описания на 800
          символов — это не описание, а конспект статьи;
  заголовки то же для <title> длиннее MAX_TITLE.

Подрезка идёт по границе предложения, а не «по счётчику»: обрывок фразы
хуже длинного, но целого описания. Если первое предложение само длиннее
лимита — режем по границе слова и ставим многоточие.
"""
import os, io, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://meysternlp.ru"
OG_IMAGE = SITE + "/og-image.jpg"

MAX_DESC, DESC_TARGET = 320, 300
MAX_TITLE, TITLE_TARGET = 120, 110

SKIP_DIRS = {".git", ".github", "node_modules", "tools", "scripts",
             "b17-drafts", "vk-drafts", "docs"}
SKIP_FILES = {"header.html", "footer.html", "yandex_a82c657db3e2d540.html"}

changed = []


def read(p):
    return io.open(p, encoding="utf-8", errors="replace").read()


def pages():
    out = []
    for dirpath, dirnames, names in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for n in names:
            if n.endswith(".html") and n not in SKIP_FILES:
                out.append(os.path.join(dirpath, n))
    return sorted(out)


def sentences(text):
    """Позиции концов предложений. Кавычка-ёлочка идёт до точки: «…». — тоже конец."""
    return [m.end() for m in re.finditer(r"[.!?…][»\"']?\s", text)]


def clip(text, target):
    """Обрезать по границе предложения, не превысив target."""
    if len(text) <= target:
        return text
    cuts = [c for c in sentences(text) if c <= target]
    if cuts:
        out = text[:cuts[-1]].strip()
        if len(out) >= 60:          # одно короткое предложение — плохое описание
            return out
    out = text[:target].rsplit(" ", 1)[0].rstrip(" ,;:—–-")
    return out + "…"


def clip_title(text):
    """Заголовок режем только по чистой границе предложения.

    Обрезок вида «…: «Семь чёток» читается хуже длинного, но целого заголовка,
    поэтому если границы в пределах лимита нет — оставляем как есть.
    """
    for c in sentences(text):
        out = text[:c].strip().rstrip(".")
        if 40 <= len(out) <= MAX_TITLE:
            return out
    return text


def og_block(title, desc, canon, is_index):
    """Собрать недостающие og-теги в стиле остальных страниц сайта."""
    # у большинства страниц og:title — часть <title> до разделителя
    short = re.split(r"\s+[|·]\s+", title)[0].strip() or title
    lines = ['<meta property="og:type" content="%s">'
             % ("website" if is_index else "article"),
             '<meta property="og:title" content="%s">' % esc(short),
             '<meta property="og:description" content="%s">' % esc(clip(desc, 200)),
             '<meta property="og:url" content="%s">' % canon]
    return lines


def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;") \
            .replace("&amp;quot;", "&quot;").replace("&amp;amp;", "&amp;")


def fix(p):
    s0 = read(p)
    s = s0
    rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
    notes = []

    if "noindex" in s or rel in SKIP_FILES:
        return None

    tm = re.search(r"<title>(.*?)</title>", s, re.S)
    dm = re.search(r'<meta name="description" content="([^"]*)">', s)
    cm = re.search(r'<link rel="canonical" href="([^"]*)">', s)

    # --- 1. подрезаем description
    if dm and len(dm.group(1)) > MAX_DESC:
        new = clip(dm.group(1), DESC_TARGET)
        s = s.replace(dm.group(0),
                      '<meta name="description" content="%s">' % new, 1)
        notes.append("description %d→%d" % (len(dm.group(1)), len(new)))
        dm = re.search(r'<meta name="description" content="([^"]*)">', s)

    # --- 2. подрезаем title
    if tm and len(tm.group(1).strip()) > MAX_TITLE:
        old = tm.group(1).strip()
        new = clip_title(old)
        if new != old:
            s = s.replace(tm.group(0), "<title>%s</title>" % new, 1)
            notes.append("title %d→%d" % (len(old), len(new)))
            tm = re.search(r"<title>(.*?)</title>", s, re.S)

    # --- 3. og-теги
    if tm and dm and cm:
        title, desc, canon = tm.group(1).strip(), dm.group(1), cm.group(1)
        have_og = 'property="og:title"' in s
        if not have_og:
            # website — только у корня и разделов первого уровня (/blog/, /knigi/).
            # Внутренние index.html — это главы и истории, они article.
            is_hub = rel == "index.html" or rel.count("/") == 1
            block = "\n".join(og_block(title, desc, canon, is_hub))
            s = s.replace(cm.group(0), cm.group(0) + "\n" + block, 1)
            notes.append("og:type/title/description/url")
        if "og:image" not in s:
            anchor = None
            for m in re.finditer(r'<meta property="og:[a-z:]+" content="[^"]*">', s):
                anchor = m.group(0)
            if anchor is None:
                anchor = cm.group(0)
            s = s.replace(anchor, anchor +
                          '\n<meta property="og:image" content="%s">' % OG_IMAGE, 1)
            notes.append("og:image")

    if s == s0:
        return None
    return rel, notes, s


def main():
    dry = "--dry-run" in sys.argv
    for p in pages():
        r = fix(p)
        if not r:
            continue
        rel, notes, s = r
        changed.append((rel, notes))
        if not dry:
            io.open(p, "w", encoding="utf-8").write(s)

    kinds = {}
    for rel, notes in changed:
        for n in notes:
            kinds[n.split()[0]] = kinds.get(n.split()[0], 0) + 1
    print("%s страниц: %d" % ("БЕЗ ЗАПИСИ, изменилось бы" if dry else "изменено",
                              len(changed)))
    for k, v in sorted(kinds.items(), key=lambda x: -x[1]):
        print("  %-32s %d" % (k, v))
    if dry:
        for rel, notes in changed[:8]:
            print("  пример: %s — %s" % (rel, ", ".join(notes)))


if __name__ == "__main__":
    main()
