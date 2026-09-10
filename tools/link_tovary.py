#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ставит в статьи блога дверь к товарам — по схеме двух ролей.

Зачем. Метрика за 30 дней: сайт собрал 12 323 просмотра, все товарные
страницы вместе — 278, это 2,3 %. Кликов «купить на Ozon» за месяц один.
Двери из блога были, но их несли 274 статьи из 1661, а 81 коробка вела прямо
на Ozon мимо наших же страниц книг — те получали 17 просмотров на весь
раздел.

Схема ролей, заданная владельцем. **Роль 1** — то, что человек искал:
статья, разговор с Фреди, курс Лектория. Бесплатно и без условий; ответ
остаётся в статье целиком, его не подменяют обещанием. **Роль 2** —
инструмент, которым этот ответ выполняется: книга, игра, тренинг. Он стоит
денег, и это сказано в самой коробке, а не обнаруживается у двери.

Отсюда три правила, которые здесь соблюдаются буквально:

  — коробка ведёт на нашу страницу товара, никогда прямо на Ozon: цена,
    состав и «кому не нужно» должны быть прочитаны до маркетплейса;
  — коробка называет платность словами. «Бесплатно» пишется только там,
    где вправду бесплатно;
  — где точного попадания по теме нет, коробки нет вовсе. Случайный товар
    под статьёй читается рекламой и обесценивает остальные ссылки.

Скрипт идемпотентен: свои блоки помечены комментариями и переписываются
заново. Старые коробки `game-link-box`, ведущие на товары или на Ozon,
поглощаются — они и были первой версией этой же двери. Коробки, ведущие на
/fredi/, не трогаются: это роль 1, у неё своя механика.

    python3 tools/link_tovary.py --dry-run
    python3 tools/link_tovary.py
    python3 tools/link_tovary.py --strip
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK_OPEN = "<!-- tovar-link -->"
MARK_CLOSE = "<!-- /tovar-link -->"

# ——————————————————————————————————————————————————————————————————————
# Товары. href — всегда наша страница. `paid` попадает в текст коробки
# дословно, потому что цена на сайте не ставится, а платность назвать надо.
# ——————————————————————————————————————————————————————————————————————
PRODUCTS = {
    "kniga-gipnoz": dict(
        goal="tovar_dver_kniga_gipnoz",
        icon="📕",
        href="/knigi/teoriya-manipulyacii-tom-1-razgovornyj-gipnoz/",
        head="Как это устроено — разобрано в книге",
        body="«Теория манипуляции. Разговорный гипноз» — 250 страниц про то, "
             "из чего собрана фраза, которая действует, и как услышать её "
             "в свою сторону.",
        paid="Книга платная, продаётся на Ozon.",
        cta="О книге"),
    "kniga-variatika": dict(
        goal="tovar_dver_kniga_variatika",
        icon="📘",
        href="/knigi/variatika-biblioteka-chelovecheskih-patternov/",
        head="Система целиком — в книге",
        body="«Вариатика. Библиотека человеческих паттернов»: четыре базовые "
             "программы и девять уровней. Не набор типов, а объяснение, "
             "почему человек ведёт себя именно так.",
        paid="Книга платная, продаётся на Ozon.",
        cta="О книге"),
    "kniga-konceptikon": dict(
        goal="tovar_dver_kniga_konceptikon",
        icon="📗",
        href="/knigi/kontseptikon-sem-linz/",
        head="Семь способов увидеть одно и то же",
        body="«Концептикон. Семь линз» — семь рамок, через которые одна и та "
             "же ситуация выглядит по-разному. Меняешь линзу — меняется "
             "решение.",
        paid="Книга платная, продаётся на Ozon.",
        cta="О книге"),
    "igra-marketolog": dict(
        goal="tovar_dver_igra_marketolog",
        icon="🎲",
        href="/igry/marketolog.html",
        head="Потренировать на живом человеке",
        body="Игра «Маркетолог»: три карты на столе, вы рассказываете "
             "историю, а третий игрок считает по лицу слушателя, поймали вы "
             "его или нет. Приём проверяется не в голове.",
        paid="Игра платная, продаётся на Ozon.",
        cta="Об игре"),
    "igra-basic": dict(
        goal="tovar_dver_igra_basic",
        icon="🃏",
        href="/igry/variatika-basic.html",
        head="Разобрать человека напротив",
        body="Игра «Вариатика Basic»: характер, настоящие желания, "
             "способности и пределы человека — разбираются за столом, "
             "на живых примерах, а не по описанию типов.",
        paid="Игра платная, продаётся на Ozon.",
        cta="Об игре"),
    "igra-intensive": dict(
        goal="tovar_dver_igra_intensive",
        icon="🃏",
        href="/igry/variatika-intensive.html",
        head="Когда очевидное решение — неверное",
        body="Игра «Вариатика Intensive»: сложные ситуации, в которых первый "
             "напрашивающийся ход оказывается ошибкой. Тренирует системное "
             "и латеральное мышление.",
        paid="Игра платная, продаётся на Ozon.",
        cta="Об игре"),
    "igra-progressive": dict(
        goal="tovar_dver_igra_progressive",
        icon="🃏",
        href="/igry/variatika-progressive.html",
        head="Как делать удачу закономерной",
        body="Игра «Вариатика Progressive» — про искусство везения: как "
             "превращать маловероятный хороший исход в предсказуемый.",
        paid="Игра платная, продаётся на Ozon.",
        cta="Об игре"),
    "trening-gipnoz": dict(
        goal="tovar_dver_trening_gipnoz",
        icon="🎧",
        href="/razgovornyj-gipnoz/urok-1/",
        head="Первое занятие курса — бесплатно",
        body="«Единая структура воздействия»: пять шагов, из которых собрано "
             "любое удавшееся воздействие. Это первый день курса «Разговорный "
             "гипноз», выложен целиком и без регистрации.",
        paid="Остальные 37 видео и комплект на бумаге — платные.",
        cta="Смотреть"),
    "trening-proryv": dict(
        goal="tovar_dver_trening_proryv",
        icon="🧗",
        href="/treningi/proryv.html",
        head="Когда понимания уже мало",
        body="«Прорыв» — живой тренинг. Вывод «бесполезно» психика сделала "
             "не из слов, а из опыта, и переубедить её можно только "
             "обратным опытом: телом, а не рассуждением.",
        paid="Тренинг платный, идёт очно, по заявке.",
        cta="О тренинге"),
}

# ——————————————————————————————————————————————————————————————————————
# Подбор. Сверху вниз, первое совпадение выигрывает: узкое выше широкого.
# Правила намеренно тесные. Лучше пустая статья, чем чужая коробка.
# ——————————————————————————————————————————————————————————————————————
RULES = [
    # разговорный гипноз: сначала курс (навык), потом книга (устройство)
    (r"гипноз|gipnoz|транс|trans|внушени|vnushen|эриксон|erikson|"
     r"раппорт|rapport|подстройк|podstrojk|милтон|фокусы[- ]язык|"
     r"рефрейминг|refrejming|\bякор", "trening-gipnoz"),
    (r"манипул|manipul|газлайт|gazlajt|обесценива|obescenivayut|"
     r"токсичн|абьюз|abyuz|давлен\w*[- ]в[- ]разговор|"
     r"как[- ]не[- ]дать[- ]собой", "kniga-gipnoz"),
    (r"убежд|ubezhd|влияни|vliyani|чалдини|chaldini|переговор|peregovor|"
     r"аргумент|argument|\bспор\b|\bспоре\b|риторик", "kniga-gipnoz"),
    (r"продаж|prodazh|маркетинг|marketing|реклам|reklam|нарратив|"
     r"клиент\w*[- ]возражен|дорого", "igra-marketolog"),

    # чтение людей и типология — Вариатика
    (r"как[- ]чита[тью]\w*[- ]люд|chitat-lyudej|наблюдательност|"
     r"распозна\w*[- ]лож|raspoznat-lozh|невербал|язык[- ]тела|"
     r"\bэкман\b|ekman|микровыражен", "igra-basic"),
    (r"паттерн|pattern|типолог|tipolog|психотип|\bmbti\b|\bdisc\b|"
     r"характер\w*[- ]человек|типы[- ]люд", "kniga-variatika"),

    # мышление
    (r"латеральн|lateraln|систем\w*[- ]мышлен|sistemnoe-myshlenie|"
     r"нестандартн\w*[- ]решен|креативност|kreativnost", "igra-intensive"),
    (r"вез(ение|ёт|ет)|vezenie|удач|udach|случайност|верояятност|"
     r"веро[яй]тност", "igra-progressive"),
    (r"когнитивн\w*[- ]искажен|kognitivnyh-iskazhenij|критическ\w*[- ]мышлен|"
     r"kriticheskoe-myshlenie|как[- ]научиться[- ]думать|"
     r"точк\w*[- ]зрен|переосмысл|смысл\w*[- ]ситуац", "kniga-konceptikon"),

    # выученная беспомощность и всё, что рядом, — «Прорыв»
    (r"беспомощност|bespomoshchnost|прокрастин|prokrastin|"
     r"откладыва|otkladyva|не[- ]могу[- ]начать|"
     r"опуст\w*[- ]руки|\bапати|apati|нет[- ]сил|"
     r"выгоран|vygoran", "trening-proryv"),
]
COMPILED = [(re.compile(p, re.I), k) for p, k in RULES]

# ——————————————————————————————————————————————————————————————————————
# Лекции Лектория — это две трети блога (1064 из 1660), и по слову в слаге
# они подбираются плохо: «Лекция 1. Что такое логика» не содержит ни одного
# слова из правил. Зато у каждой лекции в слаге стоит префикс курса, а курс
# — это тема целиком. Поэтому лекции сопоставляются с товаром по курсу.
#
# Здесь перечислены только те курсы, где товар вправду продолжает лекцию.
# Курсы про сон, еду, спорт, религию, депрессию и прочее, к чему у нас
# инструмента нет, в таблице отсутствуют — и остаются без коробки.
# ——————————————————————————————————————————————————————————————————————
COURSE_MAP = {
    # влияние и речь
    "vliyanie": "kniga-gipnoz",     # манипуляция и граница влияния
    "pereg": "kniga-gipnoz",        # переговоры
    "granicy": "kniga-gipnoz",      # личные границы: давление и отказ
    "orator": "trening-gipnoz",     # ораторское искусство

    # нарратив, реклама, продажи
    "stor": "igra-marketolog",      # почему истории сильнее фактов
    "media": "igra-marketolog",     # медиаграмотность и реклама
    "biznes": "igra-marketolog",    # бизнес как решённая чужая проблема

    # смена рамки — «Концептикон»
    "krit": "kniga-konceptikon",
    "dumat": "kniga-konceptikon",
    "mysl": "kniga-konceptikon",
    "logika": "kniga-konceptikon",
    "resh": "kniga-konceptikon",
    "kogn": "kniga-konceptikon",
    "perepr": "kniga-konceptikon",  # «здравый смысл — чужая прошивка»
    "metod": "kniga-konceptikon",
    "uchit": "kniga-konceptikon",   # иллюзия знания

    # изобретательство и сложные системы
    "triz": "igra-intensive",
    "izo": "igra-intensive",
    "trabl": "igra-intensive",

    # вероятность и удача
    "lebed": "igra-progressive",    # чёрный лебедь
    "igry": "igra-progressive",     # теория игр

    # чтение людей
    "lozh": "igra-basic",
    "otn": "igra-basic",            # привязанность
    "diag": "kniga-variatika",      # можно ли измерить человека
    "socps": "kniga-variatika",
    "evo": "kniga-variatika",
    "antr": "kniga-variatika",
    "povek": "kniga-variatika",     # человек не калькулятор

    # выученная беспомощность и вокруг
    "prokr": "trening-proryv",
    "snova": "trening-proryv",      # «почему погасло»
    "peregr": "trening-proryv",     # перегрузки и выгорание
    "dvigatel": "trening-proryv",   # лень как двигатель
}
LECTURE_RE = re.compile(r"^lekciya-([a-z0-9]+)-\d+")


def pick(article):
    m = LECTURE_RE.match(article["slug"])
    if m:
        # У лекции решает курс. Если курса нет в таблице — коробки нет:
        # подбирать товар по случайному слову внутри лекции значит ставить
        # книгу про влияние под лекцию о сне.
        return COURSE_MAP.get(m.group(1))
    hay = article["slug"].replace("-", " ") + " " + article.get("title", "")
    for rx, key in COMPILED:
        if rx.search(hay):
            return key
    return None


BOX_TPL = (
    '{open}<div class="tovar-link-box" style="display:flex;align-items:center;'
    'gap:14px;background:linear-gradient(135deg,#FFF6EC,#FFF0F5);'
    'border:1px solid #FFD9B8;border-radius:14px;padding:16px 20px;'
    'margin:32px 0 10px;flex-wrap:wrap">'
    '<span style="font-size:1.6rem" aria-hidden="true">{icon}</span>'
    '<div style="flex:1;min-width:220px">'
    '<b style="color:#1D1D1F">{head}</b><br>'
    '<span style="color:#6E6E73;font-size:.92rem">{body} {paid}</span></div>'
    '<a href="{href}" onclick="{track}" style="background:#F97316;color:#fff;'
    'text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;'
    'font-size:.92rem">{cta}&nbsp;→</a></div>{close}'
)

# Цели Метрики. Без них правка вслепую: видно переходы на страницу товара,
# но не видно, из какой статьи и какого товара дверь сработала. Общая цель
# плюс своя на каждый товар — чтобы потом убирать то, что не работает,
# а не всё сразу.
TRACK = ("try{{ym(108138656,'reachGoal','tovar_dver');"
         "ym(108138656,'reachGoal','{goal}')}}catch(e){{}}")

# ——————————————————————————————————————————————————————————————————————
# Старые коробки. Ведущие на товар или на Ozon — это предыдущая версия той
# же двери, их надо поглотить. Ведущие на /fredi/ — роль 1, не трогать.
# ——————————————————————————————————————————————————————————————————————
OLD_BOX = re.compile(r'[ \t]*<div class="game-link-box".*?</a></div>\n?', re.S)
TOVAR_HREF = re.compile(r'href="(?:/knigi/|/igry/|/treningi/|/komplekt/|'
                        r'https://www\.ozon\.ru/)')
BLOCK_RE = re.compile(
    r"[ \t]*" + re.escape(MARK_OPEN) + r".*?" + re.escape(MARK_CLOSE) + r"\n?",
    re.S)

TAIL_ANCHORS = [
    r'<div class="lektorij-link-box"',
    r'<div class="game-link-box"',
    r'<div class="cta-block"',
    r'<h2[^>]*>[^<]*(?:Часто задаваемые|Частые вопросы)',
    r'<div class="related-articles"',
    r"</article>",
    r"</main>",
]


def strip(html):
    html = BLOCK_RE.sub("", html)
    return OLD_BOX.sub(
        lambda m: "" if TOVAR_HREF.search(m.group(0)) else m.group(0), html)


def insert_tail(html, block):
    for pat in TAIL_ANCHORS:
        m = re.search(pat, html)
        if m:
            start = html.rfind("\n", 0, m.start()) + 1
            return html[:start] + block + "\n" + html[start:], True
    return html, False


def build(key):
    p = dict(PRODUCTS[key])
    goal = p.pop("goal")
    return BOX_TPL.format(open=MARK_OPEN, close=MARK_CLOSE,
                          track=TRACK.format(goal=goal), **p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--strip", action="store_true")
    ap.add_argument("--only")
    args = ap.parse_args()

    m = json.load(open(os.path.join(ROOT, "blog/blogmap.json"), encoding="utf-8"))
    arts = m["articles"]
    if args.only:
        arts = [a for a in arts if a["slug"] == args.only]

    changed = 0
    hits = {}
    absorbed = 0
    skipped = []
    for a in arts:
        path = os.path.join(ROOT, "blog", a["slug"] + ".html")
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        had_old = bool(TOVAR_HREF.search(" ".join(
            x.group(0) for x in OLD_BOX.finditer(src))))
        html = strip(src)
        absorbed += had_old
        if not args.strip:
            key = pick(a)
            if key:
                html, ok = insert_tail(html, build(key))
                if ok:
                    hits[key] = hits.get(key, 0) + 1
                else:
                    skipped.append(a["slug"])
        if html != src:
            changed += 1
            if not args.dry_run:
                open(path, "w", encoding="utf-8").write(html)

    what = "изменилось бы" if args.dry_run else "изменено"
    print(f"{what} статей: {changed}")
    print(f"  поглощено старых коробок на товары: {absorbed}")
    if not args.strip:
        total = sum(hits.values())
        print(f"  поставлено дверей: {total} из {len(arts)} статей")
        for k in sorted(hits, key=lambda x: -hits[x]):
            print(f"    {hits[k]:5d}  {k}  →  {PRODUCTS[k]['href']}")
    if skipped:
        print(f"  некуда вставить: {len(skipped)}")
        for s in skipped[:10]:
            print("    !", s)


if __name__ == "__main__":
    main()
