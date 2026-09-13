#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Блок «Что открывает подписка» на результатах тестов и в самых читаемых
статьях.

    python3 tools/link_premium.py --dry-run
    python3 tools/link_premium.py

Зачем. Метрика за 30 дней до 13.09.2026: 9078 визитов на сайт, 619 открытий
Фреди и 8 кликов «подписаться» — все с /fredi/ и одной статьи. Самые
посещаемые адреса — каталог тестов (682), статья про техники КПТ (652),
PHQ-9 (498), GAD-7 (196), тест на выгорание (179), статьи про тревогу (249)
и расставание (239) — подписку не упоминали ни словом: везде «бесплатно и
без регистрации». Человек, у которого на руках результат теста, не знал,
что у Фреди есть что-то сверх десяти минут разговора. Желание купить не
возникает из ничего: сначала надо назвать, что именно откроется — и по
теме страницы, а не «подписка вообще».

Что делает. На странице результата теста — после свободного варианта
(«Обсудить с Фреди»), в статье — перед блоком «Хотите разобрать вашу
ситуацию» — ставит блок с двумя-тремя вещами из подписки, которые
относятся к теме страницы, ценой и двумя ссылками: «Попробовать неделю»
ведёт в приложение с ?sub=<тема> (fredi/meter.js показывает карточку
подписки с кнопкой оплаты), «Сначала бесплатно» — обычная дверь в Фреди.
Клик по первой ссылке — цель Метрики site_sub_intent.

Названия тренажёров и описания — из fredi/kontur.js и списка премиума в
fredi/meter.js: обещается только то, что подписка действительно даёт.

Идемпотентен: помечает вставку комментарием и второй раз не добавляет.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MARK = "<!-- premium-note -->"
END = "<!-- /premium-note -->"

# Что подписка даёт по теме страницы. Первые два пункта — тематические,
# остальные общие для всех.
TOPICS = {
    "phq9": [
        "«Спираль» — симулятор дня к курсу «Снова живой»: выбираете роль и проживаете день по выборам, шкала-«ядро» светлеет или гаснет. Действие раньше настроения — на практике, а не в теории.",
        "«Опора» — тренажёр ответа внутреннему критику, который после такого результата обычно и добивает: не «я молодец», а факты, тон друга и следующий шаг.",
    ],
    "gad7": [
        "Гипноз, практики стабилизации и якоря — короткие записи на вечер, когда тревога поднимается, и на утро, когда она встречает первой.",
        "«Опора» — тренажёр ответа внутреннему критику: тревога редко ходит одна, рядом обычно «я не справлюсь».",
    ],
    "revnost": [
        "Роли по Берну: кто в паре Родитель, кто Ребёнок и в какую игру вы играете, — разбор на ваших репликах.",
        "Разбор переписки: вставляете диалог, Фреди показывает, что в нём написано на самом деле и где вы читаете угрозу там, где её нет.",
    ],
    "lyubit": [
        "Роли по Берну и «Смени роль» — тренажёр, где вы отвечаете из другой позиции и слышите, как меняется разговор.",
        "«Другая история» — работа с ранней сценой, из которой растёт ваш способ любить: прошлое не изменить, его след — можно.",
    ],
    "vygoranie": [
        "«Спираль» — симулятор дня: живое действие или прозябание, шкала светлеет или гаснет. Урок курса «Снова живой» на практике.",
        "«Клин клином» — как выйти из захватившей петли (скролл, руминация, тупик) не волей, а другой вовлечённостью.",
    ],
    "odinochestvo": [
        "«Другая история» — изменение личной истории: Фреди находит раннюю сцену, где вы «застряли», и вы проживаете её иначе.",
        "Дневник эмоций с разбором и сказки-катарсис на вечер — то, что помогает, когда рядом никого.",
    ],
    "samozvanec": [
        "«Опора» — тренажёр ответа внутреннему критику: сверхобобщение, кривая бухгалтерия, чтение мыслей — и ваш ответ фактами.",
        "«Ленивый гений» — хотеть в десять раз больше, делать в десять раз меньше: дуэли с Фреди за лучший ход и ваша реальная цель в финале.",
    ],
    "express": [
        "Полный разбор большого теста: петли, скрытые механизмы, точки роста, прогноз и персональные ключи — шесть разделов именно вашего профиля.",
        "Коуч и тренер без лимита: под ваш профиль, а не под среднего человека.",
    ],
    "kpt": [
        "«Чайник Рассела» — тренажёр интеллектуальной честности: на ком бремя доказательства, какие допущения протаскивают мимо вас, сколько веры честно выдать мысли.",
        "«Мысль вслух» — мышление выносится наружу: Фреди думает вслух, вы повторяете операции своими словами, он оценивает и дорабатывает.",
    ],
    "trevoga": [
        "Гипноз, практики стабилизации и якоря — короткие записи на вечер, когда тревога поднимается.",
        "«Опора» — ответ внутреннему критику, который раскручивает тревогу: не «успокойся», а факты и следующий шаг.",
    ],
    "rasstavanie": [
        "«Другая история» — изменение личной истории: Фреди находит сцену, из которой растёт «я больше не смогу», и вы проживаете её иначе.",
        "Разбор переписки: то самое сообщение, которое тянет отправить ночью, — Фреди показывает, что в нём написано на самом деле.",
    ],
    "iskazheniya": [
        "«Чайник Рассела» — тренажёр интеллектуальной честности: скрытые допущения, весы веры, декалог Рассела, дуэль-разбор с Фреди.",
        "«Мысль вслух» — наладка мышления: Фреди думает вслух, вы повторяете операции, отдельный акт «Попугай или понял?» чистит заученное.",
    ],
    "gipnoz": [
        "Модуль гипноза, практики и якоря — записи голосом Фреди, а не текст для чтения; сказки-катарсис на вечер.",
        "Толкование снов и дневник эмоций — чтобы видеть, что сдвинулось за неделю практики.",
    ],
    "myshlenie": [
        "«Чайник Рассела» — на ком бремя доказательства и сколько веры честно выдать утверждению: шесть уровней до экзамена на собственном убеждении.",
        "«Мысль вслух» и «Вариатика» — тренажёры, где мышление выносится наружу и Фреди дорабатывает каждую операцию.",
    ],
}

COMMON = [
    "Фреди помнит каждый разговор и продолжает завтра с того же места.",
    "Голосом и текстом без счётчика минут; психолог, коуч и тренер без лимита.",
]

# страница → (тема, где вставлять: 'after:<якорь>' | 'before:<якорь>')
PAGES = {
    "testy/depressiya-phq-9/index.html": ("phq9", "after_frediNext"),
    "testy/trevoga-gad-7/index.html": ("gad7", "after_frediNext"),
    "testy/test-na-revnost/index.html": ("revnost", "after_next_btn"),
    "testy/test-na-umenie-lyubit/index.html": ("lyubit", "after_next_btn"),
    "test-na-vygoranie/index.html": ("vygoranie", "after_cta_note"),
    "test-na-odinochestvo/index.html": ("odinochestvo", "after_cta_note"),
    "test-na-samozvanca/index.html": ("samozvanec", "after_cta_note"),
    "express-test-lichnosti/index.html": ("express", "after_cta_note"),
    "blog/tehniki-kpt-dlya-samostoyatelnoj-raboty.html": ("kpt", "before_ask_or_lektorij"),
    "blog/kak-spravitsya-s-trevogoj.html": ("trevoga", "before_ask_or_lektorij"),
    "blog/kak-perezhit-rasstavanie.html": ("rasstavanie", "before_ask_or_lektorij"),
    "blog/100-kognitivnyh-iskazhenij-spravochnik.html": ("iskazheniya", "before_ask_or_lektorij"),
    "blog/samogipnoz-dlya-nachinayushih.html": ("gipnoz", "before_ask_or_lektorij"),
    "blog/vygoranie-5-tipov-i-protokoly-vosstanovleniya.html": ("vygoranie", "before_ask_or_lektorij"),
    "blog/kak-razvit-kriticheskoe-myshlenie.html": ("myshlenie", "before_ask_or_lektorij"),
}


def block(topic, path):
    items = TOPICS[topic] + COMMON
    lis = "".join(
        '<li style="margin:0 0 7px;padding-left:22px;position:relative">'
        '<span style="position:absolute;left:0;top:0" aria-hidden="true">✦</span>%s</li>' % t
        for t in items)
    sub_href = "/fredi/?from=%s&amp;sub=%s" % (path, topic)
    free_href = "/fredi/?from=%s" % path
    return (
        MARK +
        '<aside class="premium-note" style="background:linear-gradient(135deg,#FFF9EC,#FFFDF7);'
        'border:1px solid #F3D9A4;border-left:4px solid #E9A825;border-radius:14px;'
        'padding:18px 22px;margin:28px 0;color:#3C3C43;font-size:.96rem;line-height:1.55">'
        '<div style="font-weight:700;color:#1D1D1F;font-size:1.02rem;margin-bottom:8px">'
        '💎 Что открывает подписка — по этой теме</div>'
        '<ul style="list-style:none;margin:0 0 12px;padding:0">%s</ul>'
        '<div style="font-size:.92rem;color:#6E6E73;margin-bottom:12px">'
        'Первая неделя — 290 ₽, потом 990 ₽ в месяц, отключается в один клик. '
        'Начать можно и бесплатно: 10 минут разговора без регистрации.</div>'
        '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">'
        '<a href="%s" onclick="try{ym(108138656,\'reachGoal\',\'site_sub_intent\')}catch(e){}" '
        'style="display:inline-block;background:#E9A825;color:#1D1D1F;text-decoration:none;'
        'padding:10px 18px;border-radius:30px;font-weight:700;font-size:.93rem">'
        'Попробовать неделю — 290 ₽</a>'
        '<a href="%s" style="color:#3A86FF;text-decoration:none;font-size:.93rem;font-weight:600">'
        'Сначала бесплатно →</a></div></aside>' % (lis, sub_href, free_href) +
        END
    )


def insert(s, how, html):
    if how == "after_frediNext":
        m = re.search(r'<p[^>]*id="frediNext"[^>]*>.*?</p>\n?', s, re.S)
    elif how == "after_next_btn":
        m = re.search(r'<a class="btn" href="/fredi/\?from=[^"]*"[^>]*>Обсудить с Фреди[^<]*</a>\n?', s)
    elif how == "after_cta_note":
        m = re.search(r'<p class="cta-note"[^>]*>.*?</p>\n?', s, re.S)
    elif how == "before_ask_or_lektorij":
        m = re.search(r'<div class="fredi-ask-box"', s) or re.search(r'<!-- lektorij-link --><div class="lektorij-link-box"', s)
        if not m:
            return None
        return s[:m.start()] + html + "\n" + s[m.start():]
    else:
        return None
    if not m:
        return None
    return s[:m.end()] + html + "\n" + s[m.end():]


def main():
    dry = "--dry-run" in sys.argv
    done = 0
    for rel, (topic, how) in PAGES.items():
        f = os.path.join(ROOT, rel)
        if not os.path.exists(f):
            print("  НЕТ ФАЙЛА: %s" % rel)
            continue
        s = io.open(f, encoding="utf-8").read()
        if MARK in s:
            print("  уже есть: %s" % rel)
            continue
        path = "/" + rel
        if path.endswith("/index.html"):
            path = path[:-len("index.html")]
        out = insert(s, how, block(topic, path))
        if out is None:
            print("  НЕТ ЯКОРЯ (%s): %s" % (how, rel))
            continue
        done += 1
        print("  + %s [%s]" % (rel, topic))
        if not dry:
            io.open(f, "w", encoding="utf-8").write(out)
    print("%s: %d страниц" % ("просмотр" if dry else "записано", done))


if __name__ == "__main__":
    main()
