#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Замок на премиум-курсах Лектория: первая лекция открыта, остальные по подписке.

Решение владельца 05.10.2026. Список премиум-курсов — blog/lektorij/premium.json
(правило отбора там же). У каждой лекции с номером 2 и дальше (номер —
blog/lektorij/waves.json) тело вырезается из страницы и кладётся в
../Frederick/backend/data/lektorij_locked/<slug>.html; на странице остаются
шапка, врез, план и видимый FAQ, а на месте тела —
<div id="lockGate" …>, который blog/lock.js заполняет по подписке через
/api/lektorij/lecture/<slug>. Первые лекции не трогаются.

Что ещё правится: JSON-LD Article (isAccessibleForFree: false + hasPart
.lock-paid, как велит Google для платного контента), подключение lock.js,
страница курса (🔒 у лекций 2+, Course без isAccessibleForFree, offers 690 ₽,
строка в «Как проходить»), хаб (карточки и ItemList).

Идемпотентно: страница с замком второй раз не режется. Снять замок с курса —
убрать слаг из premium.json и запустить с --unlock: тела вернутся из
фрагментов, флаги снимутся.

    python3 tools/lock_lektorij.py --dry-run
    python3 tools/lock_lektorij.py
    python3 tools/lock_lektorij.py --unlock          # для курсов, которых нет в premium.json
"""
import argparse
import html as H
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LEK = os.path.join(ROOT, "blog", "lektorij")
LOCK_DIR = os.path.join(ROOT, "..", "Frederick", "backend", "data", "lektorij_locked")

GATE_RE = re.compile(r'<div id="lockGate"[^>]*></div>')
LOCK_SCRIPT = '<script src="/blog/lock.js" defer></script>'
LD_FLAG = '"isAccessibleForFree": false,\n  "hasPart": {"@type": "WebPageElement", "isAccessibleForFree": false, "cssSelector": ".lock-paid"},'
LECT_NOTE = ('Первая лекция открыта всем, лекции 2–10 входят в подписку Фреди (690 ₽ в месяц, первые три дня 69 ₽): '
             'откройте её в <a href="/fredi/?from=lektorij-{slug}&checkout=1">приложении</a>, и лекции на этом устройстве откроются сами. ')


def rd(p):
    return io.open(p, encoding="utf-8").read()


def wr(p, s):
    io.open(p, "w", encoding="utf-8").write(s)


def load_maps():
    premium = json.load(open(os.path.join(LEK, "premium.json"), encoding="utf-8"))["premium"]
    waves = json.load(open(os.path.join(LEK, "waves.json"), encoding="utf-8"))
    courses = json.load(open(os.path.join(LEK, "courses.json"), encoding="utf-8"))
    cards = json.load(open(os.path.join(LEK, "cards.json"), encoding="utf-8"))
    by_name = {}
    for c in cards:
        m = re.search(r"/blog/lektorij/([^/]+)/", c.get("url", ""))
        if m:
            by_name[c["name"]] = dict(slug=m.group(1), first=c.get("first", ""), url=c["url"], name=c["name"])
    return premium, waves, courses, by_name


# ───────────── лекция ─────────────

def split_body(page):
    """(start, end) тела лекции внутри article-content, или None."""
    i = page.find('<div class="article-content">')
    if i < 0:
        return None
    j = page.find("<h2", i)
    if j < 0:
        return None
    mf = re.compile(r"<h2[^>]*>\s*❓\s*Частые вопросы").search(page, j)
    k = mf.start() if mf else -1
    if k < 0:
        # без FAQ: до закрывающего </div> перед блоком автора
        a = page.find('<style>.author-box', j)
        if a < 0:
            a = page.find('<div class="author-box"', j)
        if a < 0:
            return None
        k = page.rfind("</div>", j, a)
        if k < 0:
            return None
    return j, k


ANCHOR_RE = re.compile(r'<a href="#[^"]*"[^>]*>(.*?)</a>', re.S)


def strip_teaser_anchors(page):
    """Ссылки «Содержания» на разделы, которые уехали за замок, стали бы
    битыми якорями (check_site: 3 078 ошибок на 358 страницах). Во врезе
    оставляем текст пунктов без ссылок; у подписчика тело встанет на место,
    но оглавление ему и не нужно — лекцию слушают подряд."""
    i = page.find('<div class="article-content">')
    g = page.find('<div id="lockGate"')
    if i < 0 or g < 0:
        return page
    return page[:i] + ANCHOR_RE.sub(r"\1", page[i:g]) + page[g:]


def lock_page(path, slug, course, dry):
    page = rd(path)
    if 'id="lockGate"' in page:
        out = strip_teaser_anchors(page)
        if out != page and not dry:
            wr(path, out)
        return "уже"
    sp = split_body(page)
    if not sp:
        return "НЕ РАЗОБРАНА"
    j, k = sp
    frag = page[j:k].rstrip() + "\n"
    first = course["first"] if course["first"].startswith("/") else f'/blog/{course["first"]}.html'
    gate = (f'<div id="lockGate" data-slug="{slug}" data-first="{first}" '
            f'data-course="{course["url"]}" data-course-name="{H.escape(course["name"], quote=True)}"></div>\n\n')
    out = strip_teaser_anchors(page[:j] + gate + page[k:])
    # JSON-LD Article
    if '"isAccessibleForFree": false' not in out:
        out = out.replace('"@type": "Article",', '"@type": "Article",\n  ' + LD_FLAG, 1)
    if LOCK_SCRIPT not in out:
        out = out.replace('<script src="/blog/door.js" defer></script>',
                          '<script src="/blog/door.js" defer></script>\n' + LOCK_SCRIPT, 1)
    if not dry:
        os.makedirs(LOCK_DIR, exist_ok=True)
        wr(os.path.join(LOCK_DIR, slug + ".html"), frag)
        wr(path, out)
    return "заперта"


def unlock_page(path, slug, dry):
    page = rd(path)
    m = GATE_RE.search(page)
    if not m:
        return "открыта"
    fp = os.path.join(LOCK_DIR, slug + ".html")
    if not os.path.exists(fp):
        return "НЕТ ФРАГМЕНТА"
    out = page[:m.start()] + rd(fp).rstrip() + "\n" + page[m.end():].lstrip("\n")
    out = out.replace("\n  " + LD_FLAG, "", 1)
    out = out.replace("\n" + LOCK_SCRIPT, "", 1)
    if not dry:
        wr(path, out)
        os.remove(fp)
    return "отперта"


# ───────────── страница курса ─────────────

ROW_RE = re.compile(r'(<span class="n">(\d+)</span><span class="t"><b>[^<]*</b><i>)([^<]*)(</i>)')


def mark_course(slug, name, dry, lock=True):
    p = os.path.join(LEK, slug, "index.html")
    if not os.path.exists(p):
        return "нет страницы"
    s = rd(p)
    if lock and "lk-lock" in s:
        return "уже"
    if not lock and "lk-lock" not in s:
        return "открыта"
    LOCK_I = 'по подписке Фреди <span class="lk-lock" aria-label="по подписке">🔒</span>'

    def rep(m):
        n = int(m.group(2)); txt = m.group(3)
        if lock:
            if n == 1:
                txt = txt if "бесплатно" in txt else ("бесплатно · " + txt)
            else:
                txt = txt.replace("читать или слушать 🎧", LOCK_I) if "читать или слушать 🎧" in txt else (txt + " · " + LOCK_I)
        else:
            txt = txt.replace("бесплатно · ", "").replace(" · " + LOCK_I, "").replace(LOCK_I, "читать или слушать 🎧")
        return m.group(1) + txt + m.group(4)
    s = ROW_RE.sub(rep, s)
    if lock:
        s = s.replace('"isAccessibleForFree": true,\n  "url":', '"isAccessibleForFree": false,\n  "url":', 1)
        s = re.sub(r'("price": )"0"', r'\1"690"', s)
        s = s.replace('"category": "Free"', '"category": "Subscription"', 1)
        s = s.replace('<span>бесплатно</span>', '<span>первая лекция бесплатно, остальные по подписке</span>', 1)
        if "входят в подписку Фреди" not in s:
            s = s.replace('<div class="note"><b>Как проходить курс.</b>', '<div class="note"><b>Как проходить курс.</b> ' + LECT_NOTE.format(slug=slug), 1)
    else:
        s = s.replace('"isAccessibleForFree": false,\n  "url":', '"isAccessibleForFree": true,\n  "url":', 1)
        s = re.sub(r'("price": )"690"', r'\1"0"', s)
        s = s.replace('"category": "Subscription"', '"category": "Free"', 1)
        s = s.replace('<span>первая лекция бесплатно, остальные по подписке</span>', '<span>бесплатно</span>', 1)
        s = s.replace(" " + LECT_NOTE.format(slug=slug), "", 1)
    if not dry:
        wr(p, s)
    return "помечена" if lock else "снята"


# ───────────── хаб ─────────────

def mark_hub(premium, by_slug_name, dry):
    p = os.path.join(LEK, "index.html")
    s = rd(p)
    n = 0
    for slug in premium:
        name = by_slug_name.get(slug)
        if not name:
            continue
        url = f"https://meysternlp.ru/blog/lektorij/{slug}/"
        i = s.find(f'"url": "{url}",')
        if i > 0:
            j = s.find('"isAccessibleForFree": true', i)
            if 0 < j - i < 900:
                s = s[:j] + '"isAccessibleForFree": false' + s[j + len('"isAccessibleForFree": true'):]
                n += 1
        card = re.compile(r'(<a class="dcard" href="/blog/lektorij/' + re.escape(slug) + r'/">.*?<span class="dcnt">)(\d+ лекци[йи])(</span>)', re.S)
        s, c1 = card.subn(lambda m: m.group(1) + m.group(2) + " · первая бесплатно 🔒" + m.group(3) if "🔒" not in m.group(2) else m.group(0), s, count=1)
        pop = re.compile(r'(<a class="c" href="/blog/lektorij/' + re.escape(slug) + r'/">.*?<span class="cnt">)(\d+ лекци[йи])(</span>)', re.S)
        s, c2 = pop.subn(lambda m: m.group(1) + m.group(2) + " 🔒" + m.group(3), s, count=1)
    if not dry:
        wr(p, s)
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--unlock", action="store_true", help="отпереть курсы, которых нет в premium.json")
    a = ap.parse_args()
    premium, waves, courses, by_name = load_maps()
    by_slug_name = {v["slug"]: k for k, v in by_name.items()}
    stats = {}
    for lslug, cname in courses.items():
        c = by_name.get(cname)
        if not c:
            continue
        path = os.path.join(ROOT, "blog", lslug + ".html")
        if not os.path.exists(path):
            continue
        n = waves.get(lslug, 0)
        if c["slug"] in premium:
            if n >= 2:
                r = lock_page(path, lslug, c, a.dry_run)
                stats[r] = stats.get(r, 0) + 1
                if r == "НЕ РАЗОБРАНА":
                    print("  !! не разобрана:", lslug)
        elif a.unlock:
            r = unlock_page(path, lslug, a.dry_run)
            stats[r] = stats.get(r, 0) + 1
    for slug in premium:
        name = by_slug_name.get(slug)
        if not name:
            print("  !! в premium.json нет такого курса:", slug)
            continue
        r = mark_course(slug, name, a.dry_run, lock=True)
        stats["курс: " + r] = stats.get("курс: " + r, 0) + 1
    if a.unlock:
        for slug in by_slug_name:
            if slug not in premium:
                r = mark_course(slug, by_slug_name[slug], a.dry_run, lock=False)
                if r == "снята":
                    stats["курс: снята"] = stats.get("курс: снята", 0) + 1
    n = mark_hub(premium, by_slug_name, a.dry_run)
    print(("БЕЗ ЗАПИСИ: " if a.dry_run else "") + ", ".join(f"{k} {v}" for k, v in sorted(stats.items())) + f"; хаб ItemList помечено {n}")


if __name__ == "__main__":
    main()
