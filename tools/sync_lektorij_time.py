#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Пересчитывает хронометраж лекций на страницах курсов Лектория.

Зачем. На страницах курсов стояло «~21 мин» у лекции и «~3,8 часа аудио» у
курса. Числа брались из методички, а та обещала «8–11 тысяч знаков ≈ 22–25
минут». Оценка ошибалась вдвое: реальный темп озвучки — 13,6 знака в секунду,
измерено по готовым mp3 (лекция «Граница»: 10 982 знака, 13 минут 26 секунд).

Итог: 87 страниц из 101 завышали длительность больше чем на четверть, а весь
Лекторий обещал 403 часа против настоящих 259. Человек, отложивший «двадцать
минут», слушает двенадцать — и это ещё пол-беды; хуже, что по этой же линейке
планировались сами курсы.

Хронометраж считается из текста, который реально уходит диктору (тот же разбор
страницы, что и в озвучке), поэтому число всегда соответствует файлу.

    python3 tools/sync_lektorij_time.py --dry-run
    python3 tools/sync_lektorij_time.py
    python3 tools/sync_lektorij_time.py perehod        # один курс
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEKTORIJ = os.path.join(ROOT, "blog", "lektorij")

# Знаков в секунду. Измерено на готовых mp3 голосом Фреди (Fish Audio).
# Меняется голос или скорость — меняется и это число.
CHARS_PER_SECOND = 13.6

_SKIP_CLASSES = ("selfcheck", "fredi-ask-box", "game-link-box", "related-articles",
                 "author-block", "author-box", "cta-block", "toc-box")
_SKIP_OPEN_RE = re.compile(
    r'<(div|nav|section|aside)\b[^>]*\bclass="[^"]*\b(?:%s)\b[^"]*"[^>]*>'
    % "|".join(_SKIP_CLASSES), re.I)
_BIBLIO_RE = re.compile(r"<h2[^>]*>\s*(?:Литератур\w*|Что почитать|Источник\w*)", re.I)


def _drop_skip_blocks(body: str) -> str:
    """Убирает служебные блоки вместе с содержимым, считая вложенность.
    Копия логики из blog_tts_routes.py: считаем ровно то, что слышит слушатель."""
    out, pos = [], 0
    while True:
        m = _SKIP_OPEN_RE.search(body, pos)
        if not m:
            break
        tag = m.group(1).lower()
        depth, i = 1, m.end()
        step = re.compile(r"<(/?)%s\b" % tag, re.I)
        while depth and i < len(body):
            t = step.search(body, i)
            if not t:
                i = len(body)
                break
            depth += -1 if t.group(1) else 1
            i = body.find(">", t.end())
            i = len(body) if i < 0 else i + 1
        out.append(body[pos:m.start()])
        pos = i
    out.append(body[pos:])
    return " ".join(out)


def lecture_minutes(path: str) -> float:
    html = io.open(path, encoding="utf-8").read()
    m = re.search(r'<div class="article-content">(.*)</div>\s*\n*<div class="cta-block">',
                  html, re.S)
    body = m.group(1) if m else html
    body = re.sub(r"<script.*?</script>", " ", body, flags=re.S)
    body = re.sub(r"<style.*?</style>", " ", body, flags=re.S)
    body = _drop_skip_blocks(body)
    # литература вслух не читается — из хронометража тоже вон
    bm = _BIBLIO_RE.search(body)
    if bm:
        body = body[:bm.start()]
    chars = 0
    for tm in re.finditer(r"<(h2|h3|p|li)(?=[\s>])[^>]*>(.*?)</\1>", body, re.S):
        t = re.sub(r"<[^>]+>", " ", tm.group(2))
        chars += len(re.sub(r"\s+", " ", t).strip())
    return chars / CHARS_PER_SECOND / 60.0


def hours_phrase(minutes: float) -> str:
    """«2,1 часа», «5 часов» — с правильным окончанием и запятой как разделителем."""
    h = minutes / 60.0
    if h < 1:
        return "%d минут аудио" % round(minutes)
    txt = ("%.1f" % h).replace(".", ",")
    if txt.endswith(",0"):
        # 1,96 часа печатается как «2,0» — значит и словом это «два часа».
        # Целая часть здесь дала бы «1 час», то есть занижение почти вдвое.
        whole = int(round(h))
        txt = str(whole)
        last, tens = whole % 10, whole % 100
        word = "часов" if 11 <= tens <= 14 else \
               "час" if last == 1 else "часа" if 2 <= last <= 4 else "часов"
    else:
        # дробное число всегда «часа»: «3,8 часа»
        word = "часа"
    return "%s %s аудио" % (txt, word)


def process(course_dir: str, dry: bool):
    hub = os.path.join(LEKTORIJ, course_dir, "index.html")
    if not os.path.exists(hub):
        return None
    src = io.open(hub, encoding="utf-8").read()
    out, total, changed = src, 0.0, 0

    def repl(m):
        nonlocal total, changed
        slug, old = m.group(1), int(m.group(2))
        p = os.path.join(ROOT, "blog", slug + ".html")
        if not os.path.exists(p):
            total += old
            return m.group(0)
        mins = lecture_minutes(p)
        total += mins
        new = max(1, int(round(mins)))
        if new == old:
            return m.group(0)
        # Заменяем регуляркой, а не строкой: в части курсов между числом и
        # «мин» стоит неразрывный пробел, и точное совпадение по строке молча
        # не срабатывало — девять лекций «Логики» так и остались с чужими
        # числами, а счётчик при этом рапортовал об успехе.
        piece, n = re.subn(r"~\s*%d\s*мин" % old, "~%d мин" % new, m.group(0), count=1)
        if n:
            changed += 1
        return piece

    out = re.sub(r'href="/blog/(lekciya-[a-z0-9-]+)\.html"(?:(?!</a>).)*?~(\d+)\s*мин',
                 repl, out, flags=re.S)
    # общий хронометраж курса в шапке
    out, n = re.subn(r"~[\d,\.]+\s*(?:часа|часов|час|минут)\s*аудио",
                     "~" + hours_phrase(total), out)
    if out != src and not dry:
        io.open(hub, "w", encoding="utf-8").write(out)
    return changed, total, n


def main():
    dry = "--dry-run" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    dirs = only or sorted(d for d in os.listdir(LEKTORIJ)
                          if os.path.isdir(os.path.join(LEKTORIJ, d)))
    lec_fixed = courses = 0
    for d in dirs:
        res = process(d, dry)
        if not res:
            continue
        ch, total, n = res
        if ch or n:
            courses += 1
            lec_fixed += ch
            if only or ch > 2:
                print("  %-34s лекций поправлено %2d, курс ≈ %.0f мин" % (d, ch, total))
    print("%s курсов: %d, хронометраж лекций поправлен: %d"
          % ("посмотрел бы" if dry else "обновил", courses, lec_fixed))
    if dry:
        print("Это пробный прогон, файлы не тронуты.")


if __name__ == "__main__":
    main()
