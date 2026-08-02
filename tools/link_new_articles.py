#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Связывание новых статей с сайтом: входящие ссылки из старых статей и хаб /blog/.

Двадцать одна новая статья была доступна только через рубрику, поиск и sitemap —
ни одной входящей ссылки и ни одного упоминания на хабе. Скрипт идемпотентный.
"""
import os, io, re, json

ROOT = "/home/user/dron939-sketch.github.io"
BLOG = os.path.join(ROOT, "blog")

# новая статья -> статьи, из которых на неё должна вести ссылка
INBOUND = {
    "grust-ili-depressiya": ["depressiya-12-tipov-chto-rabotaet",
                             "dvizhenie-kak-antidepressant"],
    "trevoga-ili-strah": ["kak-spravitsya-s-trevogoj", "trevozhnaya-spiral-kak-ostanovit"],
    "vygoranie-ili-ustalost": ["vygoranie-5-tipov-i-protokoly-vosstanovleniya",
                               "vozvrashchenie-posle-vygoraniya-7-etapov"],
    "panicheskaya-ataka-ili-serdechnyj-pristup": ["panika-chto-delat-pryamo-sejchas",
                                                  "trevozhnaya-spiral-kak-ostanovit"],
    "len-ili-prokrastinaciya": ["len-kak-simptom-6-prichin", "prokrastinaciya-eto-zamri-ne-len",
                                "prokrastinaciya-polezna"],
    "introvert-ili-zastenchivost": ["psihologiya-odinochestva-4-tipa-2026"],
    "granicy-ili-egoizm": ["granicy-kak-pobeg", "23-manipulyacii-v-otnosheniyah-spravochnik"],
    "gore-ili-depressiya": ["kak-perezhit-utratu-blizkogo-etapy-gorya", "strah-smerti-kak-s-nim-zhit"],
    "zabota-ili-kontrol": ["eq-kak-kontrol-partnera", "lokus-kontrolya-vnutrennij-vneshnij"],
    "psiholog-psihoterapevt-psihiatr": ["ai-psiholog-2026-mozhno-li-zamenit-terapevta",
                                        "act-terapiya-6-processov-geksaflex"],
    "samoocenka-ili-uverennost": ["nizkaya-samoocenka-priznaki-i-protokol", "uverennost-7-urovney",
                                  "uverennost-v-sebe-telesnyj-navyk"],
    "travma-ili-tyazheloe-perezhivanie": ["travma-6-tipov-i-protokoly-raboty",
                                          "emdr-terapiya-glubokij-razbor"],
    "kak-podderzhat-cheloveka-v-gore": ["kak-perezhit-utratu-blizkogo-etapy-gorya",
                                        "strah-smerti-kak-s-nim-zhit"],
    "kak-govorit-s-chelovekom-v-depressii": ["depressiya-12-tipov-chto-rabotaet",
                                             "samosostradanie-vmesto-samokritiki"],
    "kak-skazat-net": ["granicy-kak-pobeg", "chto-takoe-manipulyaciya"],
    "kak-zasnut-esli-prosnulsya-nochyu": ["bessonnica-5-tipov-kpt-i", "bessonnica-prichiny-i-protokol",
                                          "ne-mogu-usnut-pryamo-sejchas"],
    "kak-spravitsya-so-zlostyu": ["gnev-kak-perestat-vzryvatsya", "vspyshka-gneva-90-sekund"],
    "kak-podgotovitsya-k-pervoj-vstreche-s-psihologom": ["ai-psiholog-2026-mozhno-li-zamenit-terapevta",
                                                         "act-terapiya-6-processov-geksaflex"],
    "kak-pomiritsya-posle-ssory": ["kak-otpustit-obidu", "kak-prostit-4-urovnya-proshcheniya"],
    "kak-podderzhat-esli-chelovek-govorit-chto-ne-hochet-zhit": ["depressiya-12-tipov-chto-rabotaet",
                                                                 "strah-smerti-kak-s-nim-zhit"],
    "slovar-psihologii-100-let": ["100-kognitivnyh-iskazhenij-spravochnik",
                                  "effekt-danninga-kryugera"],
}

RUB_SHORT = {"emocii": "Эмоции и личность", "strahi": "Страхи и тревога",
             "telo": "Тело и сон", "motivaciya": "Мотивация",
             "otnosheniya": "Отношения", "shkoly": "Школы психологии"}
MONTH = {8: "августа"}


def meta(slug):
    s = io.open(os.path.join(BLOG, slug + ".html"), encoding="utf-8").read()
    return dict(
        title=re.search(r"<title>(.*?)\s*\|", s, re.S).group(1).strip(),
        mins=int(re.search(r"⏱️\s*(\d+)\s*мин", s).group(1)),
        date=re.search(r'article:published_time" content="(\d{4})-(\d{2})-(\d{2})', s).groups(),
    )


def short_title(t):
    """Для карточки берём часть до двоеточия, если заголовок длинный."""
    return t.split(":")[0] if len(t) > 46 and ":" in t else t


def add_inbound(rub_of):
    added, missing = 0, []
    for new, donors in INBOUND.items():
        m = meta(new)
        for d in donors:
            p = os.path.join(BLOG, d + ".html")
            if not os.path.exists(p):
                missing.append(d)
                continue
            s = io.open(p, encoding="utf-8").read()
            if '/blog/%s.html"' % new in s:
                continue
            if '<div class="related-grid">' not in s:
                missing.append(d + " (нет related-grid)")
                continue
            item = ('<div class="related-item"><a href="/blog/%s.html">%s</a>'
                    '<span>%d мин · %s</span></div>\n' %
                    (new, short_title(m["title"]), m["mins"],
                     RUB_SHORT.get(rub_of.get(new), "разбор").lower()))
            s = s.replace('<div class="related-grid">\n',
                          '<div class="related-grid">\n' + item, 1)
            io.open(p, "w", encoding="utf-8").write(s)
            added += 1
    return added, missing


def upd_hub(rub_of, n_latest=10):
    p = os.path.join(BLOG, "index.html")
    s = io.open(p, encoding="utf-8").read()
    items = sorted(((meta(sl), sl) for sl in INBOUND if sl != "slovar-psihologii-100-let"),
                   key=lambda x: x[0]["date"], reverse=True)[:n_latest]
    cards = "".join(
        '<a class="li" href="/blog/%s.html"><span class="dt tnum">%d %s</span>'
        '<h3>%s</h3><span class="rb">%s</span></a>'
        % (sl, int(m["date"][2]), MONTH[int(m["date"][1])], short_title(m["title"]),
           RUB_SHORT.get(rub_of.get(sl), "Разборы"))
        for m, sl in items)

    i = s.index('Свежее</h2>')
    j = s.index('<div class="latest">', i)
    k = s.index('</div>', s.rindex('</a>', j, s.index('</section>', j)))
    s = s[:j] + '<div class="latest">' + cards + s[k:]
    s = re.sub(r'(Свежее</h2><span class="sub">)[^<]*', r'\g<1>август 2026', s, count=1)

    # словарь — в «Глубокие разборы»
    if 'slovar-psihologii-100-let' not in s:
        m = meta("slovar-psihologii-100-let")
        card = ('<a class="dcard" href="/blog/slovar-psihologii-100-let.html">'
                '<span class="tag">Словарь</span><h3>77 терминов психологии за сто лет</h3>'
                '<p>Что термины значат на самом деле и как их искажает обиходная речь.</p>'
                '<span class="meta">%d мин · всем</span></a>' % m["mins"])
        s = s.replace('<div class="deep">', '<div class="deep">' + card, 1)
    io.open(p, "w", encoding="utf-8").write(s)
    return len(items)


if __name__ == "__main__":
    bm = json.load(io.open(os.path.join(BLOG, "blogmap.json"), encoding="utf-8"))
    rub_of = {a["slug"]: a["rubric"] for a in bm["articles"]}
    n, missing = add_inbound(rub_of)
    print("входящих ссылок добавлено: %d" % n)
    if missing:
        print("НЕ НАЙДЕНЫ доноры: %s" % sorted(set(missing)))
    print("карточек в «Свежем»: %d" % upd_hub(rub_of))
