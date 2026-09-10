#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ставит в тематические статьи дверь в тест.

Зачем. Вебмастер, 10.09.2026: «тест на ревность с диаграммой» — 3307 показов
и 17 кликов при средней позиции 6,5; «тест на умение любить с диаграммой» —
1263 показа и ноль кликов при позиции 9. Тесты — самая массовая точка входа
сайта из поиска, и они же стоят ниже всех.

Совпадение, которое трудно назвать случайным: у двух тестов с худшими
позициями меньше всего входящих ссылок изнутри сайта.

    тревога GAD-7      54 входящих
    депрессия PHQ-9    42
    ревность           17   ← позиция 6,5
    умение любить      24   ← позиция 9,0

При этом в блоге 55 статей про отношения плюс лекции про привязанность, и
почти ни одна на тесты не ведёт. Скрипт это чинит: подбирает статьи по теме
и ставит короткую строку со ссылкой после «Содержания».

Правила подбора намеренно узкие. «Изменения поведения» и «разрыв шаблона»
ловились правилом на «измен» и «разрыв» — такие ложные попадания хуже, чем
отсутствие ссылки: они читаются как реклама и обесценивают остальные.

    python3 tools/link_testy.py --dry-run
    python3 tools/link_testy.py
    python3 tools/link_testy.py --strip
"""
import argparse
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK_OPEN = "<!-- test-link -->"
MARK_CLOSE = "<!-- /test-link -->"

TESTS = {
    "revnost": dict(
        href="/testy/test-na-revnost/",
        text='Если хочется сначала понять, какая именно это ревность, — '
             '<a href="{href}">тест на ревность</a>: 18 утверждений, '
             'три минуты, диаграмма по шести типам. Без регистрации.',
        # Узко: только про саму ревность, измену и контроль в паре.
        rx=r"revnost|izmen[au]|izmeny|izmene\b|prostit-izmenu|"
           r"perezhit-izmenu|kontrol-v-otnosheniyah|"
           r"boyus-chto-menya-brosyat|tipy-privyazannosti|"
           r"emocionalnaya-zavisimost|sobstvennichesk"),
    "lyubit": dict(
        href="/testy/test-na-umenie-lyubit/",
        text='Рядом лежит вопрос, который редко задают прямо: а сами вы '
             'умеете любить? <a href="{href}">Тест по четырём компонентам '
             'Фромма</a> — 16 утверждений и лепестковая диаграмма, три минуты.',
        rx=r"bezotvetnaya-lyubov|kak-vlyubit|yazyki-lyubvi|raznye-yazyki|"
           r"odinochestv\w*-v-brake|epidemiya-odinochestva|"
           r"kak-perezhit-rasstavanie|blizost|"
           r"horni-fromm|otnosheniya-s-partner|"
           r"pochemu-lyudi-rasstayutsya|kak-postroit-otnosheniya"),
}
COMPILED = [(re.compile(v["rx"], re.I), k) for k, v in TESTS.items()]

# Статьи, где дверь стоять не должна: сами тесты рядом, кризис, насилие —
# там человеку не до опросника.
DENY = re.compile(r"nasilie|abyuz|suicid|telefon-doveriya|krizis-otnosh", re.I)

BLOCK_TPL = (
    '{open}<p class="test-link" style="margin:22px 0;padding:12px 16px;'
    'border-left:3px solid #34D399;background:#F3FBF7;border-radius:0 10px '
    '10px 0;color:#3c3c43;font-size:.95rem">📈 {text}</p>{close}'
)
BLOCK_RE = re.compile(
    r"[ \t]*" + re.escape(MARK_OPEN) + r".*?" + re.escape(MARK_CLOSE) + r"\n?",
    re.S)


# Рубрика «отношения» целиком — честная база: тест про ревность и тест про
# умение любить относятся к любой статье о паре. Внутри рубрики выбор между
# двумя тестами делается по слову, а за её пределами дверь ставится только
# по точному совпадению из RX выше.
REVN = re.compile(r"revnost|izmen[aeuy]|izmeny|prostit-izmenu|perezhit-izmenu|"
                  r"kontrol|doveri|brosyat|privyazann|zavisimost|proverya", re.I)


def pick(article):
    slug = article["slug"]
    if DENY.search(slug):
        return None
    for rx, key in COMPILED:
        if rx.search(slug):
            return key
    if article.get("rubric") == "otnosheniya":
        return "revnost" if REVN.search(slug) else "lyubit"
    return None


def strip(html):
    return BLOCK_RE.sub("", html)


# Первый выбор — после «Содержания», там же, где стоит строка Лектория.
# У части статей другой шаблон и toc-box нет; для них запасные якоря, и
# блок встаёт перед ними, а не теряется.
FALLBACK = [
    r'<div class="lektorij-link-box"',
    r'<div class="tovar-link-box"',
    r'<div class="game-link-box"',
    r'<div class="related-articles"',
]


def insert(html, block):
    m = re.search(r'<nav class="toc-box".*?</nav>', html, re.S)
    if m:
        return html[:m.end()] + "\n" + block + html[m.end():], True
    for pat in FALLBACK:
        m = re.search(pat, html)
        if m:
            start = html.rfind("\n", 0, m.start()) + 1
            return html[:start] + block + "\n" + html[start:], True
    return html, False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--strip", action="store_true")
    args = ap.parse_args()

    m = json.load(open(os.path.join(ROOT, "blog/blogmap.json"), encoding="utf-8"))
    changed = 0
    hits = {}
    noplace = []
    for a in m["articles"]:
        path = os.path.join(ROOT, "blog", a["slug"] + ".html")
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        html = strip(src)
        if not args.strip:
            key = pick(a)
            if key:
                t = TESTS[key]
                block = BLOCK_TPL.format(open=MARK_OPEN, close=MARK_CLOSE,
                                         text=t["text"].format(href=t["href"]))
                html, ok = insert(html, block)
                if ok:
                    hits[key] = hits.get(key, 0) + 1
                else:
                    noplace.append(a["slug"])
        if html != src:
            changed += 1
            if not args.dry_run:
                open(path, "w", encoding="utf-8").write(html)

    what = "изменилось бы" if args.dry_run else "изменено"
    print(f"{what} статей: {changed}")
    for k, v in sorted(hits.items(), key=lambda x: -x[1]):
        print(f"  {v:4d}  {k}  →  {TESTS[k]['href']}")
    if noplace:
        print(f"  без «Содержания», пропущено: {len(noplace)}")
        for s in noplace[:8]:
            print("    !", s)


if __name__ == "__main__":
    main()
