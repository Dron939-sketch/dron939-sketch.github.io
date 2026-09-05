#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Двери из статей блога в Фреди с готовым первым вопросом.

    python3 tools/ask_doors.py --dry-run
    python3 tools/ask_doors.py

Зачем. За неделю до 5 сентября поиск привёл в блог 541 визит, и ни один
не стал разговором с Фреди: ссылка «Поговорить с Фреди» открывала пустое
поле ввода, а пустое поле — самая дорогая ступень воронки (на рекламном
трафике «открыл → написал» было 6%, пока вопрос не стали подставлять из
адреса; после — 19%).

Что делает. Ссылкам блока «Хотите разобрать вашу ситуацию…» и нижней
кнопке «Поговорить с Фреди» дописывает адрес вида

    /fredi/?from=/blog/<статья>.html&ask=<вопрос>

Вопрос — первый вопрос из видимого блока «❓ Частые вопросы» статьи: он
уже от первого лица («Что делать, если на меня кричат?») и уже про ту
ситуацию, ради которой человек открыл статью. Если FAQ нет — вопрос
общий, по заголовку. fredi/openers.js отправляет его первым сообщением
сам (см. ?ask= там же, ASK_MAX = 600).

Ссылки на режимы (/fredi/?m=…) не трогаем: там человек идёт в конкретный
инструмент, а не в разговор. Навигацию шапки и подвала — тоже.

Заодно ставит на страницу делегированный обработчик клика по ссылкам в
/fredi/ (blog_open_fredi + open_fredi) — тот же, что link_fredi.py ставил
на девять статей; без него открытия с блога в Метрике не видны.

Идемпотентен: адрес с ask= пересобирается заново при каждом прогоне,
обработчик второй раз не ставится.
"""
import glob
import html
import io
import os
import re
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import link_fredi  # noqa: E402  — SCRIPT, MARK, NAV_HINT

ASK_MAX = 600
BOX_RE = re.compile(r'(fredi-ask-box.*?<a href=")(/fredi/[^"]*)(")', re.S)
BTN_RE = re.compile(r'(<a href=")(/fredi/[^"]*)(" class="btn btn-outline">Поговорить с Фреди)')
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S)
FAQ_RE = re.compile(r"Частые вопросы</h2>\s*(?:<div[^>]*>\s*)?<h3[^>]*>(.*?)</h3>", re.S)
TAG_RE = re.compile(r"<[^>]+>")


def text(s):
    s = html.unescape(TAG_RE.sub("", s or ""))
    return re.sub(r"\s+", " ", s).strip()


def ask_for(s):
    """Вопрос для первого сообщения по содержимому статьи."""
    m = H1_RE.search(s)
    title = text(m.group(1)) if m else ""
    title = title.rstrip(".").replace('"', "")
    q = FAQ_RE.search(s)
    q = text(q.group(1)) if q else ""
    if q and not q.endswith("?"):
        q = ""
    if q:
        ask = "Я прочитал статью «%s». %s Помогите разобраться именно в моей ситуации." % (title, q)
    else:
        ask = "Я прочитал статью «%s». Помогите понять, как это относится ко мне и с чего начать." % title
    if len(ask) > ASK_MAX:
        # Режем заголовок, не вопрос: вопрос — смысл сообщения.
        over = len(ask) - ASK_MAX + 1
        short = title[: max(20, len(title) - over)].rstrip() + "…"
        ask = ask.replace("«%s»" % title, "«%s»" % short, 1)
    return ask[:ASK_MAX], bool(q)


def plain(href):
    """Только чистая ссылка в разговор: /fredi/ или уже наша с from/ask."""
    path, _, query = href.partition("?")
    if path != "/fredi/":
        return False
    keys = {k for k, _ in urllib.parse.parse_qsl(html.unescape(query))}
    return keys <= {"from", "ask"}


def door(rel, ask):
    return "/fredi/?" + urllib.parse.urlencode({"from": "/" + rel, "ask": ask}).replace("&", "&amp;")


def process(rel, s):
    ask, has_faq = ask_for(s)
    href = door(rel, ask)
    n = 0

    def sub(m):
        nonlocal n
        if not plain(m.group(2)):
            return m.group(0)
        n += 1
        return m.group(1) + href + m.group(3)

    s = BOX_RE.sub(sub, s, count=1)
    s = BTN_RE.sub(sub, s, count=1)
    if n and link_fredi.MARK not in s and "</body>" in s:
        s = s.replace("</body>", (link_fredi.SCRIPT % link_fredi.BLOG_SLUG) + "\n</body>", 1)
    return s, n, has_faq


def main():
    dry = "--dry-run" in sys.argv
    files = sorted(glob.glob(os.path.join(ROOT, "blog", "*.html")))
    touched = links = faq = 0
    for f in files:
        rel = os.path.relpath(f, ROOT)
        s = io.open(f, encoding="utf-8").read()
        new, n, has_faq = process(rel, s)
        if n:
            links += n
            faq += has_faq
        if new != s:
            touched += 1
            if not dry:
                io.open(f, "w", encoding="utf-8").write(new)
    print("статей просмотрено: %d, изменено: %d, ссылок с вопросом: %d, "
          "из них вопрос из FAQ: %d%s" % (len(files), touched, links, faq,
                                         "  БЕЗ ЗАПИСИ" if dry else ""))
    if "--show" in sys.argv:
        for f in files[:0] + [x for x in files if "chto-delat-esli-na-vas-nakrichali" in x or "pochemu" in x][:3]:
            print("  ", os.path.basename(f), "→", ask_for(io.open(f, encoding="utf-8").read())[0])


if __name__ == "__main__":
    main()
