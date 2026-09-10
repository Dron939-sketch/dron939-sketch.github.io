#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Собирает библиотеку клиентуры для админки: клетка → запросы → люди → мы.

Зачем. Три документа про аудиторию лежат отдельно и читаются только глазами:
`CA-ARHETIPY.md` (кто это и за сколько покупает), `CA-SCENARII.md` (что
набирает в поиске), `CA-ZHIZN.md` (жизнь). Проверить по ним гипотезу нельзя:
чтобы понять, дошёл ли хоть кто-то из клетки до разговора с Фреди, надо
руками сводить три файла и Метрику.

Скрипт сводит их в один JSON, который читает `/admin/klientura/`:

  масть · уровень · пол · возраст · запросы с частотами · спрос в месяц ·
  посадочные · визиты за 30 дней · открытия Фреди · разговоры · продукт ·
  порог чека

Что откуда берётся:

  — масть, уровень, пол, возраст, порог чека, продукт — из CA-ARHETIPY.md,
    разбором заголовков и полей. Пометка «гипотеза» сохраняется как есть:
    смешивать измеренное с предположенным — самый быстрый способ построить
    кампанию на выдумке;
  — запросы и частоты — из таблицы клетки, вручную сверенные с Вордстатом
    (замеры 09–10.09.2026, каждый с хвостами);
  — визиты, открытия Фреди и разговоры — живьём из Метрики по посадочным
    страницам клетки за 30 дней.

Оценка «сколько таких в стране» считается от суммы показов Вордстата по
клетке. Это не численность популяции, а размер месячного спроса: сколько
раз за месяц люди этой клетки формулируют свою проблему в поиске. Так и
подписано в интерфейсе, чтобы никто не принял одно за другое.

    python3 tools/build_klientura.py            # с обращением к Метрике
    python3 tools/build_klientura.py --offline  # без сети, метрики нулями
"""
import argparse
import json
import os
import re
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "admin", "klientura", "data.json")
COUNTER = 108138656

# Цели Метрики: открытие Фреди с любой посадочной и первое сообщение.
GOAL_OPEN = 608611106
GOAL_MSG = 608637540
GOAL_OWN = 610315667

MAST = {
    "СБ": "Силовик-Беспредельщик",
    "ТФ": "Трудяга-Фермер",
    "УБ": "Умный-Бедный",
    "ЧВ": "Человек-Возможность",
}
LEVELS = ["6", "7", "8", "9", "10", "Валет", "Дама", "Король", "Туз"]

# ——————————————————————————————————————————————————————————————————————
# Запросы по клеткам. Числа — Вордстат с хвостами, замеры 09–10.09.2026.
# Ключ — «масть-уровень». Пусто там, где клетка в поиск про себя не идёт:
# это факт о клетке, а не пробел в данных, и в интерфейсе он показан.
# ——————————————————————————————————————————————————————————————————————
QUERIES = {
    "СБ-6": [("не могу дать отпор", 1037), ("не могу постоять за себя", 956),
             ("как ответить на хамство", None), ("начальник накричал при всех", None)],
    "СБ-7": [("как перестать бояться людей", 1650), ("страшно идти на встречу", 151),
             ("отменяю встречи в последний момент", 120),
             ("боюсь общаться с незнакомыми", 50), ("тревога перед разговором", 39)],
    "СБ-8": [("ребёнок ведёт себя агрессивно", 1039), ("сын не уважает мать", 385),
             ("подросток бьёт мать", 190), ("ребёнок грубит и не слушается", 168),
             ("подросток агрессивный что делать", 202)],
    "СБ-9": [("как понять что человек врёт", None), ("как защититься от манипуляций", None)],
    "СБ-10": [("как не сорваться на ребёнка", 940), ("срываюсь на близких", 686),
              ("как контролировать гнев", 561), ("как перестать кричать на детей", 342),
              ("не могу сдержать злость", 76)],
    "ТФ-6": [("не хочу работать что делать", None), ("не могу найти работу", None),
             ("стоит ли менять работу", None)],
    "ТФ-7": [("стоит ли менять работу", None), ("призвание или карьера", None)],
    "ТФ-8": [("отношения на расстоянии как сохранить", 508),
             ("муж постоянно в командировках", 208), ("муж на вахте отдалился", 7)],
    "ТФ-9": [("нет клиентов что делать", 1587), ("клиент просит скидку", 343),
             ("работаю на себя устал", 177), ("боюсь называть цену", 24)],
    "ТФ-10": [("не могу делегировать", 303), ("как перестать всё контролировать", None),
              ("тащу всё на себе", None)],
    "ТФ-Дама": [("пассивный доход", None)],
    "УБ-6": [("образование не пригодилось", 74), ("много знаю но не зарабатываю", 36),
             ("знаю много а толку нет", 20)],
    "УБ-7": [],
    "УБ-8": [],
    "УБ-9": [("как углубить знания", 323), ("как повысить компетенцию", 122),
             ("как проверить информацию на достоверность", 53),
             ("как оценить свою компетентность", 18)],
    "УБ-10": [("как перестать накручивать себя", 4794),
              ("страх задавать вопросы", 1347), ("как научиться говорить уверенно", 476),
              ("краснею когда говорю", 373), ("боюсь опозориться", 365),
              ("что обо мне подумают люди", 259), ("боюсь высказывать своё мнение", 250),
              ("как пережить позор", 221), ("стыдно за своё поведение", 217),
              ("постоянно недовольна собой", 150), ("боюсь что меня уволят", 127),
              ("молчу когда надо сказать", 127), ("мне стыдно за прошлое", 92),
              ("прокручиваю в голове разговор", 79), ("синдром самозванки", 87),
              ("синдром самозванца что делать", 41)],
    "УБ-Валет": [("как развить системное мышление", 98),
                 ("как научиться думать самому", None),
                 ("начинаю делать и бросаю", 659)],
    "ЧВ-6": [("от меня все устают", None), ("почему от меня уходят люди", None)],
    "ЧВ-7": [("играю роль а не живу", 191), ("как понять кто я", 12682)],
    "ЧВ-8": [],
    "ЧВ-9": [("как понять что человек врёт", None), ("как распознать ложь", None)],
    "ЧВ-10": [("боюсь что меня бросят", None), ("как выйти на нужных людей", 248),
              ("как заводить знакомства", 954)],
    "ЧВ-Валет": [("как заводить знакомства", 954), ("как выйти на нужных людей", 248),
                 ("не умею поддерживать общение", 43)],
}

# Посадочные страницы клетки. Пусто — значит дыра, и это видно в админке.
LANDINGS = {
    "СБ-6": ["/blog/kak-otvetit-na-hamstvo.html", "/blog/chto-delat-esli-na-vas-nakrichali.html"],
    "СБ-7": ["/blog/kak-perestat-boyatsya-lyudej.html", "/dyhanie-4-7-8/"],
    "СБ-8": ["/blog/rebenok-deretsya-chto-delat.html",
             "/blog/kak-naladit-otnosheniya-s-podrostkom.html"],
    "СБ-9": ["/blog/kak-raspoznat-lozh-12-markerov-ekmana.html"],
    "СБ-10": ["/blog/kak-ne-sryvatsya-na-rebenka.html",
              "/blog/gnev-kak-perestat-vzryvatsya.html"],
    "ТФ-6": ["/blog/ne-hochu-rabotat-chto-delat.html",
             "/blog/ne-mogu-najti-rabotu-chto-delat.html"],
    "ТФ-7": ["/blog/stoit-li-menyat-rabotu.html"],
    "ТФ-8": ["/blog/otnosheniya-na-rasstoyanii.html"],
    "ТФ-9": ["/blog/kak-privlech-klientov-masteru.html",
             "/blog/klient-prosit-skidku.html", "/blog/kak-postavit-normalnuyu-cenu.html"],
    "ТФ-10": ["/blog/ne-mogu-delegirovat-kak-otpustit.html",
              "/blog/kak-perestat-vsyo-kontrolirovat.html"],
    "ТФ-Дама": ["/blog/kak-nauchitsya-kopit-dengi.html"],
    "УБ-6": [],
    "УБ-7": [],
    "УБ-8": [],
    "УБ-9": [],
    "УБ-10": ["/blog/strah-zadavat-voprosy.html",
              "/blog/sindrom-samozvanca-priznaki-i-protokol.html",
              "/blog/kak-perestat-nakruchivat-sebya.html",
              "/blog/kak-perezhit-pozor.html"],
    "УБ-Валет": ["/blog/kak-nauchitsya-dumat-samomu.html",
                 "/blog/nachinayu-i-brosayu.html"],
    "ЧВ-6": ["/blog/emocionalnaya-zavisimost-priznaki-i-protokol.html"],
    "ЧВ-7": ["/blog/kak-perestat-byt-udobnym.html"],
    "ЧВ-8": [],
    "ЧВ-9": ["/blog/kak-ponyat-chto-chelovek-vret.html",
             "/blog/kak-chitat-lyudej-7-urovnej-nablyudatelnosti.html"],
    "ЧВ-10": ["/blog/boyus-chto-menya-brosyat.html",
              "/blog/netvorking-dlya-introvertov.html"],
    "ЧВ-Валет": ["/blog/netvorking-dlya-introvertov.html"],
}

# Клетки, которые в поиск про себя не идут: приходит тот, кто рядом.
COMES_INSTEAD = {
    "СБ-8": "мать подростка",
    "ТФ-8": "жена вахтовика",
    "ЧВ-6": "тот, кто рядом с ней",
    "ЧВ-8": "тот, кем манипулируют",
    "УБ-7": "никто — клетка ищет свой предмет: гороскопы, таро, приметы",
    "УБ-8": "никто — «все врут», помощи не ищет",
}


def parse_cells():
    """Разбирает CA-ARHETIPY.md: масть, уровень, пол, возраст, чек, продукт."""
    s = open(os.path.join(ROOT, "CA-ARHETIPY.md"), encoding="utf-8").read()
    out = {}
    for b in re.split(r"\n### ", s)[1:]:
        head = b.split("\n", 1)[0]
        m = re.match(r"\d+\.\s+(СБ|ТФ|УБ|ЧВ)-([^\s—]+)\s*—\s*«([^»]+)»", head)
        if not m:
            continue
        key = "%s-%s" % (m.group(1), m.group(2))
        if key in out:          # у клетки бывает несколько формулировок запроса
            continue

        def field(name):
            r = re.search(r"\*\*%s:\*\*\s*([^\n]+)" % name, b)
            return r.group(1).strip() if r else ""

        out[key] = dict(
            mast=m.group(1), level=m.group(2), name=m.group(3),
            sex=field("Пол"), age=field("Возраст"),
            porog=field("Порог чека"), pays=field("За что платит"),
            basket=field("Корзина"), avoid=field("Чего не предлагать"))
    return out


def metrika(paths, offline):
    """Визиты, открытия Фреди, первые сообщения и «написал сам» по страницам."""
    if offline or not paths:
        return dict(visits=0, open=0, msg=0, own=0)
    token = os.environ.get("YM_TOKEN", "")
    if not token:
        return dict(visits=0, open=0, msg=0, own=0)
    flt = " OR ".join("ym:pv:URLPath=='%s'" % p for p in paths)
    q = urllib.parse.urlencode({
        "ids": COUNTER, "date1": "30daysAgo", "date2": "today", "accuracy": "full",
        "filters": flt,
        "metrics": "ym:s:visits,ym:s:goal%dreaches,ym:s:goal%dreaches,ym:s:goal%dreaches"
                   % (GOAL_OPEN, GOAL_MSG, GOAL_OWN)})
    try:
        r = urllib.request.Request(
            "https://api-metrika.yandex.net/stat/v1/data?" + q,
            headers={"Authorization": "OAuth " + token})
        t = json.load(urllib.request.urlopen(r, timeout=60))["totals"]
        return dict(visits=int(t[0]), open=int(t[1]), msg=int(t[2]), own=int(t[3]))
    except Exception:
        return dict(visits=0, open=0, msg=0, own=0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true")
    args = ap.parse_args()

    cells = parse_cells()
    rows = []
    for mast in MAST:
        for lvl in LEVELS:
            key = "%s-%s" % (mast, lvl)
            c = cells.get(key, {})
            qs = QUERIES.get(key, [])
            landings = LANDINGS.get(key, [])
            demand = sum(n for _, n in qs if n)
            rows.append(dict(
                key=key, mast=mast, mast_full=MAST[mast], level=lvl,
                name=c.get("name", ""),
                sex=c.get("sex", ""), age=c.get("age", ""),
                porog=c.get("porog", ""), pays=c.get("pays", ""),
                basket=c.get("basket", ""), avoid=c.get("avoid", ""),
                queries=[{"q": q, "shows": n} for q, n in qs],
                demand=demand,
                landings=landings,
                comes_instead=COMES_INSTEAD.get(key, ""),
                metrika=metrika(landings, args.offline),
            ))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    payload = dict(
        generated=__import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M"),
        counter=COUNTER, cells=rows)
    json.dump(payload, open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    filled = sum(1 for r in rows if r["queries"])
    holes = [r["key"] for r in rows if r["demand"] and not r["landings"]]
    print("клеток: %d, с запросами: %d, суммарный спрос: %d показов/мес"
          % (len(rows), filled, sum(r["demand"] for r in rows)))
    print("дыры (спрос есть, посадочной нет): %s" % (", ".join(holes) or "нет"))
    print("записано:", OUT)


if __name__ == "__main__":
    main()
