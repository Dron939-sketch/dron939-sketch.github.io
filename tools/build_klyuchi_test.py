#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Тест «Карта пробелов» к аудиосерии «Ключи»: /testy/klyuchi-karta-probelov/

    python3 tools/build_klyuchi_test.py && python3 tools/fix_nav_fallback.py

Решение владельца 28.10.2026: направление «Ключей» верное, но человеку
нечем найти, какие записи нужны именно ему, и не видно, к чему ведут
пробелы. Тест — 22 бытовые ситуации по восьми областям серии. За каждой
ситуацией стоит одна ключевая идея одной записи: кто ответил верно —
ключ у него есть, кто нет — нашёлся пробел. Расшифровка по каждой
области с пробелами: к чему он ведёт, где из-за него граница, что
бесплатно в Лектории и какие записи его закрывают.

Названия записей и номера заказа берутся из tools/build_magazin.py
(KEYS_ALL), курсы Лектория — по каталогам blog/lektorij/<slug>/:
придуманное название человек не найдёт. Правки — только здесь.
"""
import importlib.util
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "testy", "klyuchi-karta-probelov", "index.html")
URL = "https://meysternlp.ru/testy/klyuchi-karta-probelov/"
DATE = "2026-10-28"

_spec = importlib.util.spec_from_file_location("bm", os.path.join(ROOT, "tools", "build_magazin.py"))
_bm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_bm)
KEYS = {num: title for num, title, _grows, _node in _bm.KEYS_ALL}
DUE = _bm.KEYS_DUE


def rec_href(num):
    # 0.1 продаётся сразу (с отрывком на полке магазина), остальные — предзаказ.
    return "/magazin/#klyuchi" if num == "0.1" else "/magazin/zakaz/?t=klyuchi-" + num.replace(".", "-")


# Области серии: ключ, название, к чему ведёт пробел, где граница, бесплатно в Лектории.
AREAS = [
    ("think", "Как думать и учиться",
     "Часы уходят на перечитывание, которое не остаётся в голове. Довод, который звучит логично, "
     "принимается за верный — даже когда вывод из него не следует.",
     "Учиться дольше, чем нужно, и спорить проигрышно: правильная форма рассуждения при ложной посылке "
     "убеждает вас так же, как верная.",
     [("kak-uchitsya", "Как учиться"), ("logika", "Логика")]),
    ("math", "Число, вероятность, данные",
     "Цифры в новостях, анализах и рекламе пугают или успокаивают не по делу. Кредит, вклад, "
     "страховка выбираются на глаз.",
     "Там, где решение зависит от процента и вероятности — здоровье, деньги, риск, — вы опираетесь "
     "на чужую интерпретацию цифр.",
     [("kriticheskoe-myshlenie", "Критическое мышление"), ("chernyj-lebed", "Чёрный лебедь")]),
    ("phys", "Физика: сила, тепло, свет",
     "Техника и собственное тело — чёрный ящик. На вопрос ребёнка «почему» остаётся «так устроено», "
     "а реклама с наукообразными словами проходит без проверки.",
     "Где нужно понять, как вещь работает, а не как ей пользоваться, вы зависите от инструкции и "
     "от того, кто объясняет.",
     []),
    ("chem", "Вещество и Земля",
     "«Химия» звучит как страшилка, этикетки не читаются, новости о климате и катастрофах "
     "принимаются на веру.",
     "Решения о еде, лекарствах и доме опираются на ярлыки «натуральное» и «химическое», а не "
     "на то, что вещество делает.",
     []),
    ("life", "Жизнь и тело",
     "Тренировки и диеты не дают результата, антибиотики пьются «на всякий случай», здоровье "
     "строится по советам знакомых.",
     "Пока не видно, как тело приспосабливается и почему живое меняется, легко загнать себя "
     "нагрузкой и не понять, что пошло не так.",
     [("evolyucionnaya-psihologiya", "Эволюционная психология"), ("mozg-i-povedenie", "Мозг и поведение")]),
    ("sys", "Системы и информация",
     "Тушатся пожары вместо причин. Меры дают обратный эффект через месяц, и непонятно почему.",
     "Где проблема держится на петле — переработки, долги, ссоры, — усилия без карты связей "
     "только разгоняют её.",
     [("metodologiya-myshleniya", "Методология мышления"), ("triz", "ТРИЗ")]),
    ("soc", "Человек и общество",
     "Вами двигает «все так делают». В споре ищете, кто врёт, вместо того чтобы понять, что "
     "каждый увидел. Решения о времени и деньгах не учитывают, от чего вы отказались.",
     "В переговорах, продажах и отношениях выигрывает тот, кто видит механизм, а не только "
     "слова. Без него вы в роли того, на кого влияют.",
     [("socialnaya-psihologiya", "Социальная психология"), ("teoriya-igr", "Теория игр")]),
    ("art", "Музыка и изображение",
     "Смотрите и слушаете, но не видите, как вас ведут: в кино, рекламе, дизайне, в паузе "
     "собеседника.",
     "Убеждение образом и ритмом работает мимо логики. Не различая его, вы чувствуете эффект и "
     "не понимаете, откуда он взялся.",
     [("psihologiya-iskusstva", "Психология искусства и музыки")]),
]

# Вопросы: область, номер записи, ситуация, варианты, индекс верного, ключевая идея.
Q = [
    ("think", "0.3", "Завтра важная презентация, у вас есть час. Что лучше всего закрепит материал?",
     ["Перечитать конспект два раза", "Закрыть конспект, рассказать вслух по памяти, потом сверить",
      "Выделить главное маркером"], 1,
     "Вспоминание учит сильнее перечитывания: мозг укрепляет то, что достаёт сам, а не то, что узнаёт глазами."),
    ("think", "0.2", "«Все успешные люди встают рано. Я встаю рано — значит, стану успешным». Что с этим рассуждением?",
     ["Оно верное", "Вывод не следует: из того, что успешные встают рано, не вытекает, что ранние успешны",
      "Верное, если вставать до шести"], 1,
     "Правильная форма — условие вывода. «Все А — это Б» не значит «все Б — это А»."),
    ("think", "0.4", "Неделю бьётесь над задачей «как успевать больше». Что чаще всего сдвигает с места?",
     ["Работать дольше", "Ждать вдохновения",
      "Переформулировать: что именно мешает и где противоречие"], 2,
     "Переформулировка задачи — часто половина решения: пока не названо противоречие, усилия идут вслепую."),
    ("math", "1.6", "Тест на редкую болезнь (болеет 1 из 1 000) верен в 99% случаев. У человека он положительный. "
     "Какова вероятность, что человек болен?",
     ["Около 99%", "Около 50%", "Меньше 10%"], 2,
     "Сначала базовая частота. Из 100 000 человек больны 100, тест найдёт 99; среди 99 900 здоровых ошибётся "
     "примерно у 999. Из 1 098 положительных больны 99 — около 9%."),
    ("math", "1.5", "Монета выпала орлом пять раз подряд. Шестой бросок:",
     ["Скорее решка — пора", "Скорее орёл — полоса", "Пятьдесят на пятьдесят"], 2,
     "У монеты нет памяти. Закон больших чисел говорит о многих бросках, а не о том, что следующий «должен» выровнять счёт."),
    ("math", "1.3", "Вклад под 10% годовых, проценты прибавляются к сумме. Примерно через сколько лет сумма удвоится?",
     ["Через 10 лет", "Примерно через 7 лет", "Через 20 лет"], 1,
     "Проценты на проценты: рост ускоряется. 1,1 в седьмой степени — уже почти 2."),
    ("phys", "2.1", "Автобус резко тормозит, и пассажиров бросает вперёд. Почему?",
     ["Их толкает сила торможения", "Тела продолжают двигаться с прежней скоростью",
      "Их толкает воздух в салоне"], 1,
     "Инерция: тело сохраняет скорость, пока на него не подействует сила. Тормозит автобус, а не вы."),
    ("phys", "2.2", "Зимой металлическая скамейка кажется холоднее деревянной, хотя температура у них одна. Почему?",
     ["Металл на самом деле холоднее", "Металл быстрее забирает тепло у руки",
      "Дерево само немного греется"], 1,
     "Рука чувствует не температуру предмета, а то, как быстро уходит её собственное тепло."),
    ("phys", "2.4", "В грозу сначала видно молнию, а гром слышно позже. Почему?",
     ["Гром возникает позже вспышки", "Свет быстрее звука почти в миллион раз",
      "Звук идёт в обход облаков"], 1,
     "Вспышка и гром рождаются вместе. Свет доходит мгновенно, звук — примерно километр за три секунды."),
    ("chem", "3.2", "Куда девается вещество дров, когда они сгорают?",
     ["Исчезает — остаётся только зола", "Большая часть уходит в воздух углекислым газом и паром",
      "Превращается в энергию"], 1,
     "Реакция — перестановка атомов, ни один не исчезает. Дрова в основном улетают в трубу газами."),
    ("chem", "3.4", "Почему сильные землетрясения в одних местах случаются часто, а в других почти никогда?",
     ["Случайно", "Там, где больше шахт и карьеров", "На границах движущихся плит земной коры"], 2,
     "Плиты коры движутся; где они сходятся и трутся, копится напряжение — там и трясёт."),
    ("life", "4.2", "Почему бактерии становятся устойчивыми к антибиотику?",
     ["Привыкают к нему, как организм к нагрузке",
      "Выживают и размножаются те, что случайно оказались устойчивее", "Антибиотик со временем слабеет"], 1,
     "Отбор: изменчивость даёт разных бактерий, лекарство убивает чувствительных, устойчивые наследуют поле."),
    ("life", "4.7", "Вы тренируетесь каждый день до изнеможения, а результат падает. Самая вероятная причина?",
     ["Слишком маленькая нагрузка", "Нет восстановления между нагрузками", "Возраст"], 1,
     "Тело становится сильнее не во время нагрузки, а после неё — если ему дают восстановиться."),
    ("sys", "5.1", "В отделе: больше переработок — больше ошибок — больше переделок — ещё больше переработок. Это…",
     ["Совпадение", "Нормальная нагрузка в сезон", "Усиливающая петля обратной связи"], 2,
     "Усиливающая петля разгоняет сама себя. Её рвут в звене, а не героизмом на выходе."),
    ("sys", "5.2", "Задумано число от 1 до 64. Сколько вопросов «да/нет» гарантированно хватит, чтобы его угадать?",
     ["6", "32", "63"], 0,
     "Каждый вопрос «да/нет» делит варианты пополам: 64 → 32 → … → 1 за шесть шагов. Это и есть шесть бит."),
    ("soc", "6.4", "Пустое кафе вы скорее пройдёте мимо, а в полное зайдёте — даже ничего не зная о еде. Почему?",
     ["В полном точно вкуснее", "Люди сверяются с тем, как поступают другие", "Случайность"], 1,
     "Социальное доказательство: когда не знаешь сам, решаешь по другим. На этом построена половина рекламы."),
    ("soc", "6.11", "Билет в кино вам подарили. Фильм займёт вечер, в который вы могли заработать 3 000 ₽. "
     "Во что вам обошёлся фильм?",
     ["Ни во что — билет подарили", "В 3 000 ₽ упущенного заработка", "В цену билета"], 1,
     "Цена — это то, от чего вы отказались. Бесплатное часто самое дорогое."),
    ("soc", "6.1", "Двое видели одну ссору и рассказывают о ней по-разному. Скорее всего…",
     ["Один из них врёт", "Каждый достроил увиденное по-своему", "У одного плохая память"], 1,
     "Восприятие — догадка мозга, а не копия мира. Разные версии — норма, а не обязательно ложь."),
    ("soc", "6.13", "Вы угадали счёт матча. Значит ли это, что вы знали результат?",
     ["Да, раз совпало", "Нет: мнение может оказаться верным случайно, знанию нужно обоснование",
      "Да, интуиция — тоже знание"], 1,
     "Знание — обоснованное верное убеждение. Совпадение без основания — удача, и повторить её нельзя."),
    ("soc", "6.8", "Войну начали после убийства эрцгерцога. Это её причина?",
     ["Да", "Повод; причины — длинные: союзы, гонка вооружений, интересы держав",
      "Случайность, причин не было"], 1,
     "У события есть длинные причины и случайный повод. Кто путает их, ищет виноватого вместо механизма."),
    ("art", "7.1", "Почему последний аккорд песни звучит «законченно»?",
     ["Он громче остальных", "Напряжение разрешилось — музыка вернулась к опоре", "Он медленнее"], 1,
     "Музыка держится на напряжении и разрешении. Тот же приём работает в речи: пауза — и вывод."),
    ("art", "7.2", "Фотограф ставит человека ближе к краю кадра и оставляет пространство туда, куда тот смотрит. Зачем?",
     ["Так сейчас модно", "Чтобы влезло больше фона", "Кадр ведёт взгляд зрителя и даёт ощущение движения"], 2,
     "Композиция решает, куда пойдёт взгляд. Тот, кто её видит, видит и то, как его ведут."),
]

FAQ = [
    ("Это экзамен по школьным предметам?",
     "Нет. В вопросах нет формул и дат. Каждая ситуация бытовая, и проверяет она одно: есть ли у вас понятие, "
     "через которое эта ситуация объясняется. Отличник может не пройти, троечник — пройти."),
    ("Что значит «пробел»?",
     "Ситуация, которую вы объясняете не тем механизмом. Это не про ум, а про инструмент: понятия нет — "
     "и мысль идёт в обход, к «так получилось» или «кто-то виноват»."),
    ("Сколько времени займёт?",
     "Пять–семь минут. Вопросов 22, у каждого три варианта."),
    ("Ответы куда-то сохраняются?",
     "Нет. Подсчёт идёт прямо в браузере, на сервер ничего не уходит."),
    ("Что такое «Ключи»?",
     "Аудиосерия: 47 записей по 15–20 минут, по одной на предмет — от логики и вероятности до музыки. "
     "Это суггестивная техника с двойным наведением: в одном ухе история героя, в другом — голос, который "
     "ведёт внимание к главному в предмете. Первая запись продаётся сейчас, остальные — по предзаказу, выход — "
     + DUE + "."),
]


def build():
    area_by = {a[0]: a for a in AREAS}
    qs_html = []
    for i, (area, num, text, opts, ok, idea) in enumerate(Q, 1):
        o = "".join('<label><input type="radio" name="q%d" value="%d">%s</label>' % (i, j, t)
                    for j, t in enumerate(opts))
        qs_html.append('<div class="qcard" data-area="%s"><div class="qn">%d / %d · %s</div>'
                       '<div class="qt">%s</div><div class="opts">%s</div></div>'
                       % (area, i, len(Q), area_by[area][1], text, o))
    data = {
        "q": [{"a": a, "n": n, "ok": ok, "idea": idea, "title": KEYS[n], "href": rec_href(n)}
              for a, n, _t, _o, ok, idea in Q],
        "areas": [{"k": k, "name": name, "lead": lead, "edge": edge,
                   "free": [{"href": "/blog/lektorij/%s/" % s, "t": t} for s, t in free],
                   "recs": [{"n": n, "title": KEYS[n], "href": rec_href(n)}
                            for n in sorted({q[1] for q in Q if q[0] == k})]}
                  for k, name, lead, edge, free in AREAS],
        "due": DUE,
    }
    for s, _t in [f for a in AREAS for f in a[4]]:
        assert os.path.exists(os.path.join(ROOT, "blog", "lektorij", s, "index.html")), s
    faq_html = "".join("<h3>%s</h3><p>%s</p>" % (q, a) for q, a in FAQ)
    ld = [
        {"@context": "https://schema.org", "@type": "WebPage", "name": TITLE, "description": DESC, "url": URL,
         "inLanguage": "ru-RU", "datePublished": DATE, "dateModified": DATE,
         "author": {"@type": "Person", "@id": "https://meysternlp.ru/#person", "name": "Андрей Мейстер",
                    "url": "https://meysternlp.ru/obo-mne/"}},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Главная", "item": "https://meysternlp.ru/"},
            {"@type": "ListItem", "position": 2, "name": "Тесты", "item": "https://meysternlp.ru/testy/"},
            {"@type": "ListItem", "position": 3, "name": "Карта пробелов", "item": URL}]},
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]},
    ]
    html = PAGE.replace("@TITLE@", TITLE).replace("@DESC@", DESC).replace("@URL@", URL) \
        .replace("@LD@", "\n".join('<script type="application/ld+json">%s</script>'
                                    % json.dumps(x, ensure_ascii=False, indent=1) for x in ld)) \
        .replace("@QS@", "\n".join(qs_html)).replace("@N@", str(len(Q))) \
        .replace("@FAQ@", faq_html).replace("@DATA@", json.dumps(data, ensure_ascii=False)) \
        .replace("@CSS@", CSS).replace("@JS@", JS)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print("записано:", os.path.relpath(OUT, ROOT), "— вопросов", len(Q), "областей", len(AREAS))


TITLE = "Тест «Карта пробелов»: каких понятий вам не хватает"
DESC = ("Бесплатный тест: 22 бытовые ситуации покажут, каких понятий вам не хватает — в логике, вероятности, "
        "физике, биологии, системах, психологии и искусстве, — к чему ведёт каждый пробел и чем его закрыть.")

CSS = """
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-cyrillic.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+2000-206F,U+20AC,U+2212}
*{box-sizing:border-box}
body{margin:0;background:#f6f7f9;color:#15181d;font-family:'Inter',system-ui,sans-serif;line-height:1.6}
.wrap{max-width:780px;margin:0 auto;padding:0 16px}
.crumbs{font-size:.85rem;color:#667085;padding:18px 0 0}.crumbs a{color:#667085}
h1{font-size:clamp(1.7rem,5vw,2.4rem);line-height:1.15;margin:12px 0 10px}
h2{font-size:1.35rem;margin:34px 0 10px}h3{font-size:1.05rem;margin:18px 0 4px}
p{margin:0 0 12px}.lead{font-size:1.08rem;color:#3f4754}
a{color:#1f6fe5}
.howto{background:#fff;border:1px solid #e3e7ee;border-radius:14px;padding:14px 18px;margin:16px 0 22px;font-size:.95rem;color:#3f4754}
.qcard{background:#fff;border:1px solid #e3e7ee;border-radius:14px;padding:14px 16px;margin:0 0 12px}
.qn{font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;color:#7B2FF7;margin-bottom:4px}
.qt{font-weight:600;margin-bottom:10px}
.opts{display:grid;gap:6px}
.opts label{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;border:1px solid #e3e7ee;border-radius:10px;cursor:pointer}
.opts label:hover{border-color:#1f6fe5}
.opts input{margin-top:4px;accent-color:#7B2FF7;flex:none}
.qcard.miss{border-color:#f0b4b4}
.go{display:block;width:100%;margin:18px 0 6px;padding:15px;border:0;border-radius:14px;background:linear-gradient(135deg,#7B2FF7,#F107A3);color:#fff;font:600 1.05rem 'Inter',sans-serif;cursor:pointer}
.err{color:#c62828;min-height:1.2em;font-size:.92rem}
#res{display:none}
.map{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin:12px 0 20px}
.cell{border-radius:12px;padding:10px 12px;font-size:.9rem;border:1px solid}
.cell b{display:block;font-size:.95rem}
.cell.ok{background:#ecfdf3;border-color:#a6e3bf}.cell.part{background:#fff8e6;border-color:#f2d58a}.cell.gap{background:#fdeeee;border-color:#f0b4b4}
.gapbox{background:#fff;border:1px solid #e3e7ee;border-left:4px solid #F107A3;border-radius:14px;padding:14px 18px;margin:0 0 14px}
.gapbox h3{margin-top:0}
.gapbox .lbl{font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;color:#667085;margin:10px 0 2px}
.recs a.r{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 12px;border:1px solid #d8c8fb;border-radius:10px;margin:6px 0;text-decoration:none;color:#15181d}
.recs a.r span{color:#7B2FF7;font-weight:600;white-space:nowrap;font-size:.9rem}
.free a{display:inline-block;margin:4px 8px 0 0}
details.why{margin:6px 0 0;font-size:.92rem;color:#3f4754}
details.why summary{cursor:pointer;color:#1f6fe5}
.ideas p{margin:6px 0;font-size:.93rem}
.note{font-size:.88rem;color:#667085}
.cta-all{display:inline-block;margin:6px 0 0;padding:11px 20px;border-radius:12px;background:#15181d;color:#fff;text-decoration:none;font-weight:600}
"""

JS = r"""
(function(){
var D=window.KT,form=document.getElementById('kt'),err=document.getElementById('err'),res=document.getElementById('res');
function g(n,p){try{if(window.ym)ym(108138656,'reachGoal',n,p||{})}catch(e){}}
var started=false;form.addEventListener('change',function(){if(!started){started=true;g('klyuchi_test_start');}});
form.addEventListener('submit',function(e){e.preventDefault();err.textContent='';
  var miss=[],ans=[];document.querySelectorAll('.qcard').forEach(function(c){c.classList.remove('miss')});
  for(var i=0;i<D.q.length;i++){var v=form.querySelector('input[name=q'+(i+1)+']:checked');
    if(!v){miss.push(i);document.querySelectorAll('.qcard')[i].classList.add('miss');}ans.push(v?+v.value:-1);}
  if(miss.length){err.textContent='Остались вопросы без ответа: '+miss.length+'. Они подсвечены.';
    document.querySelectorAll('.qcard')[miss[0]].scrollIntoView({behavior:'smooth',block:'center'});return;}
  var st={};D.areas.forEach(function(a){st[a.k]={a:a,ok:0,n:0,wrong:[]}});
  D.q.forEach(function(q,i){var s=st[q.a];s.n++;if(ans[i]===q.ok)s.ok++;else s.wrong.push(q);});
  var list=D.areas.map(function(a){return st[a.k]});
  var total=0,okc=0;list.forEach(function(s){total+=s.n;okc+=s.ok});
  var map=list.map(function(s){var cls=s.ok===s.n?'ok':(s.ok*2>=s.n?'part':'gap');
    var t=cls==='ok'?'ключ есть':(cls==='part'?'частичный пробел':'пробел');
    return '<div class="cell '+cls+'"><b>'+s.a.name+'</b>'+t+' · '+s.ok+' из '+s.n+'</div>'}).join('');
  var gaps=list.filter(function(s){return s.ok<s.n}).sort(function(x,y){return (x.ok/x.n)-(y.ok/y.n)});
  var h='<h2>Ваша карта: '+okc+' из '+total+'</h2>';
  h+=gaps.length?'<p>Зелёное — понятие есть, ситуации вы объясняете механизмом. Жёлтое и красное — места, где мысль идёт в обход: к «так получилось» или «кто-то виноват». Ниже — главное по каждому пробелу, сначала самые глубокие.</p>'
    :'<p>Все восемь областей — зелёные. Каркас у вас есть; «Ключи» дадут к нему глубину: не узнать, а почувствовать, как предмет устроен изнутри.</p>';
  h+='<div class="map">'+map+'</div>';
  gaps.slice(0,3).forEach(function(s,idx){
    var recN={},recs=[];s.wrong.forEach(function(q){if(!recN[q.n]){recN[q.n]=1;recs.push({n:q.n,title:q.title,href:q.href})}});
    s.a.recs.forEach(function(r){if(recs.length<3&&!recN[r.n]){recN[r.n]=1;recs.push(r)}});
    h+='<div class="gapbox"><h3>'+(idx+1)+'. '+s.a.name+' — '+s.ok+' из '+s.n+'</h3>';
    h+='<div class="lbl">К чему ведёт пробел</div><p>'+s.a.lead+'</p>';
    h+='<div class="lbl">Где из-за него граница</div><p>'+s.a.edge+'</p>';
    h+='<details class="why"><summary>Что упущено в ваших ответах</summary><div class="ideas">'+s.wrong.map(function(q){return '<p><b>'+q.title+':</b> '+q.idea+'</p>'}).join('')+'</div></details>';
    if(s.a.free.length)h+='<div class="lbl">Начать бесплатно — Лекторий</div><div class="free">'+s.a.free.map(function(f){return '<a href="'+f.href+'" data-rec="free">Курс «'+f.t+'» →</a>'}).join('')+'</div>';
    else h+='<div class="lbl">Начать бесплатно</div><div class="free"><a href="/magazin/#klyuchi" data-rec="free">Отрывок первой записи «Ум-объяснитель» — послушать →</a></div>';
    h+='<div class="lbl">Закрыть пробел — записи «Ключей»</div><div class="recs">'+recs.map(function(r){
      return '<a class="r" href="'+r.href+'" data-rec="'+r.n+'">«'+r.title+'»<span>'+(r.n==='0.1'?'690 ₽ · слушать отрывок':'предзаказ · 690 ₽')+'</span></a>'}).join('')+'</div></div>';
  });
  if(gaps.length>3)h+='<p class="note">Ещё областей с пробелами: '+(gaps.length-3)+' — они на карте выше. Начните с трёх главных: пробелы в основе тянут за собой остальные.</p>';
  h+='<p class="note">Первая запись, «Ум-объяснитель», — про то, как устроено объяснение в любом предмете: наблюдение, догадка, проверка. Остальные выходят по одной, срок — '+D.due+'; ссылка придёт на почту в день выхода.</p>';
  h+='<a class="cta-all" href="/magazin/#klyuchi" data-rec="all">Все 47 записей «Ключей» →</a>';
  res.innerHTML=h;res.style.display='block';res.scrollIntoView({behavior:'smooth',block:'start'});
  g('klyuchi_test_done',{kt_score:okc,kt_gaps:gaps.length});
});
res.addEventListener('click',function(e){var a=e.target.closest('a[data-rec]');if(a)g('klyuchi_test_rec',{kt_rec:a.getAttribute('data-rec')});});
})();
"""

PAGE = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow">
<title>@TITLE@ | Андрей Мейстер</title>
<meta name="description" content="@DESC@">
<meta property="og:type" content="website"><meta property="og:title" content="Карта пробелов: каких понятий вам не хватает">
<meta property="og:description" content="@DESC@">
<meta property="og:url" content="@URL@"><meta property="og:image" content="https://meysternlp.ru/magazin/img/klyuchi-um-big.webp">
<link rel="canonical" href="@URL@">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<!-- Собрано tools/build_klyuchi_test.py — правки там, не здесь. -->
@LD@
<style>@CSS@</style>
<script type="text/javascript">(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=108138656','ym');ym(108138656,'init',{ssr:true,webvisor:true,clickmap:true,accurateTrackBounce:true,trackLinks:true});</script>
<noscript><div><img src="https://mc.yandex.ru/watch/108138656" style="position:absolute;left:-9999px" alt=""></div></noscript>
</head>
<body>
<div id="header-placeholder"></div><script>(function(){fetch('/header.html').then(function(r){return r.text();}).then(function(html){var el=document.getElementById('header-placeholder');el.innerHTML=html;el.querySelectorAll('script').forEach(function(s){var n=document.createElement('script');for(var i=0;i<s.attributes.length;i++){n.setAttribute(s.attributes[i].name,s.attributes[i].value);}n.text=s.text;s.parentNode.replaceChild(n,s);});});})();</script>
<main class="wrap">
<div class="crumbs"><a href="/">Главная</a> / <a href="/testy/">Тесты</a> / Карта пробелов</div>
<h1>Карта пробелов: каких понятий вам не хватает</h1>
<p class="lead">Бывает, что объяснение есть, а понимания нет: вы знаете слово, но не видите, как оно работает, и в споре, в цифрах, в собственном теле мысль идёт в обход. Такие места не видны изнутри — их видно только по ситуациям, где вы ошибаетесь уверенно.</p>
<p>Ниже @N@ бытовых ситуаций из восьми областей — от логики и вероятности до музыки. За каждой стоит одно понятие. Тест покажет, где понятие есть, где пробел, к чему этот пробел ведёт и чем его закрыть.</p>
<div class="howto"><b>Как отвечать.</b> Выбирайте то, что подумали бы на самом деле, а не «правильное». Формул и дат нет. Займёт 5–7 минут, ответы никуда не отправляются.</div>
<form id="kt" novalidate>
@QS@
<button class="go" type="submit">Показать мою карту</button>
<p class="err" id="err" role="alert"></p>
</form>
<section id="res" aria-live="polite"></section>
<h2>Как устроен тест</h2>
<p>Каждая ситуация проверяет одну ключевую идею одной записи серии «Ключи». Верный ответ значит, что идея у вас уже есть и работает сама. Неверный — что на этом месте мысль опирается на догадку. Пробел — не про ум и не про школьные оценки: это инструмент, которого не дали.</p>
<p>Тест не измеряет интеллект и не ставит диагнозов. Он показывает, какие области стоит закрыть первыми, чтобы остальное стало понятнее, — пробелы в основе тянут за собой всё, что на ней стоит.</p>
<h2>❓ Частые вопросы</h2>
@FAQ@
<p style="margin:30px 0 50px"><a href="/testy/">← Все тесты</a> · <a href="/magazin/#klyuchi">Аудиосерия «Ключи» →</a></p>
</main>
<div id="footer-placeholder"></div><script>(function(){fetch('/footer.html').then(function(r){return r.text();}).then(function(html){document.getElementById('footer-placeholder').innerHTML=html;});})();</script>
<script>window.KT=@DATA@;@JS@</script>
</body>
</html>
"""

if __name__ == "__main__":
    build()
