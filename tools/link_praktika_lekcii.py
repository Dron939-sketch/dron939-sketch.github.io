#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Дверь в тренажёр курса — в конце каждой лекции.

    python3 tools/link_praktika_lekcii.py --dry-run
    python3 tools/link_praktika_lekcii.py

Зачем. Лекторий бесплатный целиком — это магнит для подписки на Фреди:
симуляторы, игры, диалоги (владелец, 13.09.2026). Блок «Практика к курсу»
стоит на 103 страницах курсов с 12.09, но человек читает лекции, а не
страницу курса: за 30 дней до 13.09 входов через лекции 783, через
страницы курсов 581, и с лекций тренажёр открыли трижды, раунд не прошёл
никто. Лекция кончалась оглавлением курса и стрелками «предыдущая —
следующая»; практики в ней не было.

Что делает. Берёт карточку практики со страницы курса (тренажёр, эмодзи,
описание, подпись про подписку) и ставит её же в конце каждой лекции
курса, перед навигацией по курсу. Подпись честная по типу тренажёра:
сильные игры — первый заход бесплатный, дальше по подписке (meter.js,
gameLocked); входные — открыты бесплатно; экраны Фреди — первые минуты
бесплатны. В последней лекции курса заголовок другой: «Курс пройден.
Дальше — практика».

Ссылка несёт from=lektorij-<курс>: приложение по ней показывает стену
про курс, а не про «сильные игры вообще» (meter.js, showGameLock).

Идемпотентен: помечает вставку комментарием и второй раз не добавляет.
"""
import glob
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "<!-- prakt-lec -->"
END = "<!-- /prakt-lec -->"

CARD_RE = re.compile(
    r'<a class="prakt-card" href="([^"]+)">\s*<span class="prakt-em">([^<]*)</span>'
    r'<span class="prakt-t"><b>([^<]*)</b><i>(.*?)</i></span>', re.S)
NOTE_RE = re.compile(r'<div class="prakt-note">(.*?)</div>', re.S)
LEC_RE = re.compile(r'<a class="lec[^"]*" href="(/blog/lekciya-[^"]+)"')


def note_kind(note):
    n = note.lower()
    if "открыт бесплатно" in n:
        return "free"
    if "первые минуты" in n:
        return "screen"
    return "premium"


NOTE_TEXT = {
    "premium": "Первый заход в тренажёр бесплатный, дальше он входит в подписку: первая неделя 290 ₽, потом 990 ₽ в месяц, отключается в один клик. Лекции и курс остаются бесплатными.",
    "free": "Тренажёр открыт бесплатно, без регистрации.",
    "screen": "Первые минуты бесплатны, дальше по подписке: первая неделя 290 ₽. Лекции и курс остаются бесплатными.",
}


def block(href, em, name, desc, kind, last):
    title = "Курс пройден. Дальше — практика" if last else "Практика к этой лекции"
    return (
        MARK +
        '<aside class="prakt-lec" style="background:linear-gradient(135deg,#F2F7FF,#FAF5FF);'
        'border:1px solid #C7D8FF;border-left:4px solid #3A86FF;border-radius:14px;'
        'padding:16px 20px;margin:28px 0;color:#3C3C43;font-size:.96rem;line-height:1.55">'
        '<div style="font-weight:700;color:#1D1D1F;font-size:1.02rem;margin-bottom:6px">%s</div>'
        '<div style="margin-bottom:10px"><span aria-hidden="true">%s</span> <b>«%s»</b> — %s</div>'
        '<div style="font-size:.9rem;color:#6E6E73;margin-bottom:12px">%s</div>'
        '<a href="%s" style="display:inline-block;background:#3A86FF;color:#fff;text-decoration:none;'
        'padding:9px 18px;border-radius:30px;font-weight:600;font-size:.92rem">Открыть тренажёр →</a>'
        '</aside>' % (title, em, name, desc, NOTE_TEXT[kind], href) +
        END
    )


def main():
    dry = "--dry-run" in sys.argv
    courses = sorted(glob.glob(os.path.join(ROOT, "blog", "lektorij", "*", "index.html")))
    done = 0
    skipped = 0
    for cf in courses:
        s = io.open(cf, encoding="utf-8").read()
        m = CARD_RE.search(s)
        if not m:
            continue
        href, em, name, desc = m.group(1), m.group(2).strip(), m.group(3).strip(), m.group(4).strip()
        nm = NOTE_RE.search(s)
        kind = note_kind(nm.group(1)) if nm else "premium"
        lecs = LEC_RE.findall(s)
        for i, path in enumerate(lecs):
            lf = os.path.join(ROOT, path.lstrip("/"))
            if not os.path.exists(lf):
                continue
            ls = io.open(lf, encoding="utf-8").read()
            if MARK in ls:
                skipped += 1
                continue
            anchor = ls.find('<nav class="course-nav"')
            if anchor < 0:
                continue
            html = block(href, em, name, desc, kind, last=(i == len(lecs) - 1))
            out = ls[:anchor] + html + "\n" + ls[anchor:]
            done += 1
            if not dry:
                io.open(lf, "w", encoding="utf-8").write(out)
    print("%s: лекций %d, уже были %d" % ("просмотр" if dry else "записано", done, skipped))


if __name__ == "__main__":
    main()
