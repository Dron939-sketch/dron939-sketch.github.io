#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Кладёт на страницы тестов пример диаграммы — до вопросов, а не после.

Зачем. Вебмастер, 11.09.2026, 500 запросов за месяц. Крупнейший кластер
спроса на сайте — не «психология» и не «прокрастинация», а формулировка
с хвостом «с диаграммой»:

    87 запросов   7 623 показа   27 кликов   CTR 0,35 %

Он весь принадлежит двум страницам:

    /testy/test-na-revnost/         ~5 500 показов, позиция 6,8, 27 кликов
    /testy/test-na-umenie-lyubit/   ~2 100 показов, позиция 9,0,  0 кликов

Человек пишет «с диаграммой» — значит, ему нужен не текстовый вердикт,
а картинка профиля. Обе страницы её дают, но только после восемнадцати
(и шестнадцати) вопросов. До этого момента на экране видно заголовок,
плашки и анкету — ровно то, что есть у всех остальных тестов в выдаче.
Обещание, ради которого человек кликал, подтверждается на четвёртом
экране, а решение уходить он принимает на первом.

Что делает скрипт. Вставляет между плашками и формой готовый пример
диаграммы — тот же SVG, той же геометрией, что рисует drawRadar() на
результате, с честной подписью «так выглядит результат». Заодно
дописывает «с диаграммой» в h1 и og:title: в <title> эти слова уже
стоят, а в заголовке страницы и в карточке для соцсетей их не было.

Геометрия скопирована из drawRadar() один в один: cx/cy/R, шаг угла
2π/n, кольца, точки, подписи по краю. Если drawRadar изменится, пример
разъедется с результатом — тогда правится и здесь.

    python3 tools/test_sample_chart.py --dry-run
    python3 tools/test_sample_chart.py
"""
import argparse
import math
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TESTS = {
    "testy/test-na-revnost/index.html": dict(
        scores=[5, 8, 3, 4, 5, 2],
        labels=["Адаптивная", "Тревожная", "К прошлому", "Проективная",
                "Про эго", "Патологическая"],
        mx=9, rings=[3, 6, 9],
        alt="Пример диаграммы: профиль ревности по шести типам",
        cap="Так выглядит результат: профиль по шести типам ревности. "
            "Диаграмма строится в браузере сразу после последнего ответа — "
            "здесь показан пример, не ваш результат.",
        h1_from="Тест на ревность: какой из шести типов ваш",
        h1_to="Тест на ревность с диаграммой: какой из шести типов ваш",
        og_from="Тест на ревность: какой из 6 типов ваш",
        og_to="Тест на ревность с диаграммой: какой из 6 типов ваш",
    ),
    "testy/test-na-umenie-lyubit/index.html": dict(
        scores=[10, 8, 5, 7],
        labels=["Забота", "Ответственность", "Уважение", "Знание"],
        mx=12, rings=[4, 8, 12],
        alt="Пример диаграммы: профиль умения любить по четырём компонентам",
        cap="Так выглядит результат: профиль по четырём компонентам любви "
            "у Фромма. Диаграмма строится в браузере сразу после последнего "
            "ответа — здесь показан пример, не ваш результат.",
        h1_from="Тест на умение любить",
        h1_to="Тест на умение любить с диаграммой",
        og_from=None, og_to=None,   # в og:title слова уже стоят
    ),
}

CSS = (
    ".sample-chart{margin:14px 0 18px;padding:12px 10px 10px;border:1px solid #E4E4E7;"
    "border-radius:14px;background:#FBFCFE}"
    ".sample-chart svg{display:block;margin:0 auto;max-width:320px;width:100%;height:auto}"
    ".sample-chart figcaption{margin:6px auto 0;max-width:460px;text-align:center;"
    "font-size:.86rem;line-height:1.45;color:#6E6E73}"
)


def radar(scores, labels, mx, rings):
    """Один в один drawRadar() со страницы теста."""
    cx, cy, R = 230, 158, 108
    n = len(scores)
    step = 2 * math.pi / n

    def pt(i, r):
        a = -math.pi / 2 + i * step
        return (cx + r * math.cos(a), cy + r * math.sin(a))

    s = []
    for ring in rings:
        pts = ["%g,%g" % pt(i, R * ring / mx) for i in range(n)]
        s.append('<polygon points="%s" fill="none" stroke="#E4E4E7" '
                 'stroke-width="1"/>' % " ".join(pts))
    for i in range(n):
        e = pt(i, R)
        s.append('<line x1="%d" y1="%d" x2="%g" y2="%g" stroke="#E4E4E7" '
                 'stroke-width="1"/>' % (cx, cy, e[0], e[1]))
    prof = ["%g,%g" % pt(i, R * scores[i] / mx) for i in range(n)]
    s.append('<polygon points="%s" fill="rgba(58,134,255,.22)" stroke="#3A86FF" '
             'stroke-width="2"/>' % " ".join(prof))
    for i in range(n):
        s.append('<circle cx="%g" cy="%g" r="4" fill="#3A86FF"/>'
                 % pt(i, R * scores[i] / mx))
    for i in range(n):
        l = pt(i, R + 16)
        anchor = "middle"
        if l[0] > cx + 8:
            anchor = "start"
        if l[0] < cx - 8:
            anchor = "end"
        dy = -4 if i == 0 else (12 if l[1] > cy + 8 else 4)
        s.append('<text x="%g" y="%g" text-anchor="%s" font-size="12.5" '
                 'fill="#4A5563" font-family="inherit">%s</text>'
                 % (l[0], l[1] + dy, anchor, labels[i]))
    return "".join(s)


BLOCK = ('<figure class="sample-chart" id="sample-chart">'
         '<svg viewBox="0 0 460 320" role="img" aria-label="%s">%s</svg>'
         '<figcaption>%s</figcaption></figure>')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    for rel, cfg in TESTS.items():
        path = os.path.join(ROOT, rel)
        s = open(path, encoding="utf-8").read()
        before = s

        if 'id="sample-chart"' not in s:
            block = BLOCK % (cfg["alt"],
                             radar(cfg["scores"], cfg["labels"],
                                   cfg["mx"], cfg["rings"]),
                             cfg["cap"])
            m = re.search(r'(<div class="badges">.*?</div>)\s*\n', s, re.S)
            if not m:
                print("  %s: не найден блок плашек — пропуск" % rel)
                continue
            s = s[:m.end()] + block + "\n" + s[m.end():]

        if CSS not in s:
            s = s.replace("</style>", CSS + "</style>", 1)

        if cfg["h1_from"] and ("<h1>%s</h1>" % cfg["h1_from"]) in s:
            s = s.replace("<h1>%s</h1>" % cfg["h1_from"],
                          "<h1>%s</h1>" % cfg["h1_to"])
        if cfg["og_from"]:
            s = s.replace('content="%s"' % cfg["og_from"],
                          'content="%s"' % cfg["og_to"])

        if s == before:
            print("  %s: без изменений" % rel)
            continue
        print("  %s: %+d знаков" % (rel, len(s) - len(before)))
        if not args.dry_run:
            open(path, "w", encoding="utf-8").write(s)

    print("готово" if not args.dry_run else "это был --dry-run")


if __name__ == "__main__":
    main()
