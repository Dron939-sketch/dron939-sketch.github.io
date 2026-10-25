#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Магазин /magazin/ — собирается из списка товаров ниже.

    python3 tools/build_magazin.py
    python3 tools/fix_nav_fallback.py      # запасной подвал в пустой плейсхолдер

Решения владельца 25.10.2026: все товары — в одном магазине, «Книги»,
«Игры» и «Тренинги» из меню убраны, «Магазин» — последним пунктом. При
входе — компактные ярлыки категорий, у каждого кнопка «?» с объяснением,
что в этой категории. Ярлык открывает свою витрину, остальные свёрнуты;
без JS видно всё сразу, поэтому краулер получает полный каталог.

Цены — только известные (свои товары и Фреди). У товаров с Ozon — ссылка
без цифры: цена на маркетплейсе меняется, а вписанная руками разъедется
с карточкой в тот же день. Новый товар — новая строка в PRODUCTS.
"""
import html
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "magazin", "index.html")
SITE = "https://meysternlp.ru"

# (ключ, ярлык, значок, объяснение под «?»). Картинка ярлыка — magazin/img/cat-<ключ>.webp,
# нарезана из одного фотореалистичного холста (25.10.2026); значок — запас на случай без картинки.
CATS = [
    ("besplatno", "Бесплатно", "🎁",
     "С чего начать без денег и регистрации: Лекторий целиком, первое занятие курса, "
     "игра для печати и разговор с Фреди."),
    ("kursy", "Курсы и тренинги", "🎯",
     "Видео, задания и живая практика. Здесь учатся делать, а не только понимать: "
     "приём — упражнение — разбор ошибок."),
    ("knigi", "Книги", "📚",
     "Механика: как устроены влияние, люди и мышление. Для тех, кто сначала хочет "
     "понять, а потом пробовать."),
    ("igry", "Игры", "🎲",
     "Настольные игры и игры-задачники. Навык ставится решением задач — за столом, "
     "вдвоём или компанией."),
    ("fredi", "Фреди", "🧠",
     "Виртуальный психолог: разговор, тесты и тренажёры на каждый день. Разговор и "
     "тесты открыты всем, тренажёры — по подписке."),
    ("klyuchi", "Ключи · аудио", "🔑",
     "Аудиосерия: по записи на предмет — каркас понятий, из которого остальное "
     "выводится самому. Готовится, первая запись на проверке."),
    ("vybor", "Что выбрать?", "🧭",
     "Семь подсказок: от того, что мешает сейчас, — к вещи, которая с этим работает."),
]

OZON = "https://www.ozon.ru/product/"

# Товар: категория, якорь, вид, название, цена (или None), примечание к цене,
# кому, что даст, картинка (или значок), кнопки [(текст, адрес, главная?)].
PRODUCTS = [
    dict(cat="kursy", id="standart", kind="Курс · печатный комплект",
         name="Разговорный гипноз. Пакет «Стандартный»", price="5 900 ₽",
         note="СДЭК до пункта выдачи, возврат 7 дней", main=True,
         who="тем, кому важно, чтобы слушали и соглашались, — руководителям, "
             "продажникам, психологам, родителям подростков.",
         gain="за месяц три-четыре приёма, которые срабатывают без подготовки, и умение "
              "замечать, когда их применяют к вам. Внутри: книга «Матчасть», 38 видео на "
              "год, блокнот с заданиями, игра «Маркетолог» и разбор ваших ситуаций с "
              "автором в закрытом канале.",
         img="/treningi/komplekt-standart.webp",
         btns=[("Заказать", "/razgovornyj-gipnoz/standart/zakaz/", True),
               ("Подробнее", "/razgovornyj-gipnoz/standart/", False)]),
    dict(cat="kursy", id="samostoyatelnyy", kind="Курс · видео",
         name="Разговорный гипноз. Пакет «Самостоятельный»", price=None, note="на Ozon",
         who="тем, кто учится сам и не нуждается в обратной связи.",
         gain="те же 38 видео с приёмами речевого воздействия — без печатного комплекта "
              "и без разбора ваших ситуаций.",
         img="/kurs1.png",
         btns=[("Купить на Ozon", OZON + "razgovornyy-gipnoz-samostoyatelnoe-obuchenie-tehnikam-nlp-dlya-primeneniya-v-realnoy-zhizni-932753267/", True),
               ("Подробнее", "/treningi/razgovornyy-gipnoz-samostoyatelnyy.html", False)]),
    dict(cat="kursy", id="proryv", kind="Живой тренинг",
         name="«Прорыв» — против выученной беспомощности", price="от 2 900 ₽", note="за этап",
         who="тем, у кого «пробовал — бесполезно» стало привычкой и уговоры себя больше "
             "не работают.",
         gain="телесный опыт «я приложил усилие — и препятствие поддалось». Беспомощность "
              "снимают опытом, а не словами; начать можно с одного этапа, где вы "
              "гарантированно справляетесь.",
         img="/treningi/proryv-hero.jpg",
         btns=[("Этапы и запись", "/treningi/proryv.html", True)]),
    dict(cat="knigi", id="kniga-tm", kind="Книга",
         name="«Теория манипуляции. Разговорный гипноз»", price=None, note="на Ozon",
         who="тем, кто хочет понимать механику влияния — и свою, и чужую.",
         gain="транс как обычное состояние, две линии воздействия, пресуппозиции и "
              "тридцать с лишним видов внушений. 250 страниц.",
         img="/teoriya-manipulyacii.-tom-i-razgovornyj-gipnoz-andrej-mejster.png",
         btns=[("Купить на Ozon", OZON + "teoriya-manipulyatsii-razgovornyy-gipnoz-knigi-po-psihologii-nlp-2-0-meyster-andrey-yurevich-839926527/", True),
               ("О книге", "/knigi/teoriya-manipulyacii-tom-1-razgovornyj-gipnoz/", False)]),
    dict(cat="knigi", id="kniga-var", kind="Книга",
         name="«Вариатика. Библиотека человеческих паттернов»", price=None, note="на Ozon",
         who="тем, кто устал от объяснения «он просто такой», — психологам, "
             "руководителям, всем, кто работает с людьми.",
         gain="четыре базовые программы и девять уровней у каждой — понимать, почему "
              "человек повторяет один сценарий и как он переходит на другой уровень.",
         emo="🧩",
         btns=[("Купить на Ozon", OZON + "variatika-biblioteka-chelovecheskih-patternov-meyster-andrey-yurevich-989039765/", True),
               ("О книге", "/knigi/variatika-biblioteka-chelovecheskih-patternov/", False)]),
    dict(cat="knigi", id="kniga-konc", kind="Книга",
         name="«Концептикон. Семь линз для ясного мышления»", price=None, note="на Ozon",
         who="тем, кто застрял в одной ситуации и видит её только с одной стороны.",
         gain="семь способов смотреть на одну ситуацию — у каждого свой главный вопрос и "
              "индикаторы самопроверки. Темп — одна линза в неделю.",
         img="/Концептикон.png",
         btns=[("Купить на Ozon", OZON + "kontseptikon-sem-linz-dlya-yasnogo-myshleniya-meyster-andrey-yurevich-1167705948/", True),
               ("О книге", "/knigi/kontseptikon-sem-linz/", False)]),
    dict(cat="knigi", id="kniga-dep", kind="Книга",
         name="«Настольная книга депутата»", price=None, note="как получить — на странице книги",
         who="тем, кто претендует на власть и не хочет её имитировать.",
         gain="речевые навыки, когнитивные стратегии и протоколы публичного действия.",
         img="/nastolnaya-kniga-deputata-andrej-mejster.png",
         btns=[("О книге", "/knigi/nastolnaya-kniga-deputata/", True)]),
    dict(cat="igry", id="marketolog", kind="Настольная игра",
         name="«Маркетолог»", price=None, note="на Ozon",
         who="командам продаж, тренерам, преподавателям — всем, кому нужно убеждать "
             "историей.",
         gain="один рассказывает историю по картам, другой слушает, третий по лицу "
              "слушателя видит, поймали его или нет. Учит строить истории и видеть, "
              "работают ли они.",
         img="/Маркетолог.png",
         btns=[("Купить на Ozon", OZON + "nastolnaya-kartochnaya-igra-marketolog-984307394/", True),
               ("Об игре", "/igry/marketolog.html", False)]),
    dict(cat="igry", id="var-basic", kind="Настольная игра",
         name="«Вариатика — Basic»", price=None, note="на Ozon",
         who="тем, кто хочет предсказывать поступки людей, а не удивляться им.",
         gain="навык разбирать чужие истории и прогнозировать поведение людей — через игру.",
         img="/Басик.webp",
         btns=[("Купить на Ozon", OZON + "variatika-basic-chernyy-lebed-1263096092/", True),
               ("Об игре", "/igry/variatika-basic.html", False)]),
    dict(cat="igry", id="var-intensive", kind="Настольная игра",
         name="«Вариатика — Intensive»", price=None, note="как получить — на странице игры",
         who="тем, кто разбирается в сложных системах — семье, команде, организации.",
         gain="системное, критическое и латеральное мышление: видеть, как части влияют "
              "друг на друга.",
         img="/интенсив.webp",
         btns=[("Об игре", "/igry/variatika-intensive.html", True)]),
    dict(cat="igry", id="var-progressive", kind="Настольная игра",
         name="«Вариатика — Progressive»", price=None, note="на Ozon",
         who="тем, кто хочет не только разбирать чужие сценарии, но и строить свои.",
         gain="умение создавать новые сценарии и превращать маловероятные хорошие исходы "
              "в реальные.",
         img="/progresive.webp",
         btns=[("Купить на Ozon", OZON + "variatika-progressive-1705906113/", True),
               ("Об игре", "/igry/variatika-progressive.html", False)]),
    dict(cat="igry", id="tri-puti", kind="Игра-задачник · 16+",
         name="«Три пути»", price="бесплатно", note="листы для печати",
         who="двоим — игроку и ведущему; тем, кто привык говорить «у меня нет выхода».",
         gain="за минуту собрать три пути из того, что у человека уже есть. Партия — "
              "полчаса, пять партий по нарастающей.",
         img="/blog/og/avtopilot.jpg",
         btns=[("Скачать и играть", "/igry/tri-puti.html", True)]),
    dict(cat="fredi", id="fredi-sub", kind="Подписка",
         name="Фреди: разговор, тесты и тренажёры", price="690 ₽ в месяц",
         note="пробный доступ за 69 ₽",
         who="тем, кому нужен собеседник, который не устаёт и не оценивает, — и тренажёр "
             "навыков на каждый день.",
         gain="разговор и тесты открыты всем; по подписке — игры-тренажёры и практики без "
              "ограничений, каждое упражнение первый раз бесплатно.",
         img="/magazin/img/cat-fredi.webp",
         btns=[("Попробовать Фреди", "/virtual-psychologist/", True)]),
]

ALL_LINK = {"kursy": ("/treningi/", "Все тренинги и программы"),
            "knigi": ("/knigi/", "Все книги"),
            "igry": ("/igry/", "Все игры и тренажёры")}

FREE = [
    ("/blog/lektorij/", "Лекторий", "все курсы открыты целиком и без регистрации: психология, мышление, общение."),
    ("/razgovornyj-gipnoz/urok-1/", "Первое занятие курса «Разговорный гипноз»", "13 минут, целиком."),
    ("/igry/tri-puti.html", "Игра «Три пути»", "листы для печати, вдвоём за полчаса."),
    ("/virtual-psychologist/", "Фреди", "разговор и тесты открыты; каждое упражнение первый раз бесплатно."),
]

PICK = [
    ("Вас перебивают, не дослушивают, «мы подумаем» — и тишина",
     '<a href="#standart" data-go="kursy">Пакет «Стандартный»</a> — с разбором ваших ситуаций у автора; '
     'или <a href="#kniga-tm" data-go="knigi">книга «Теория манипуляции»</a>, если сначала хочется понять механику'),
    ("Не понимаете, почему люди раз за разом поступают одинаково",
     '<a href="#kniga-var" data-go="knigi">книга «Вариатика»</a> и <a href="#var-basic" data-go="igry">игра «Вариатика — Basic»</a>'),
    ("Ходите по кругу в одной ситуации и не видите выхода",
     '<a href="#kniga-konc" data-go="knigi">книга «Концептикон»</a> — семь способов посмотреть иначе'),
    ("Продаёте, ведёте команду или учите других",
     '<a href="#marketolog" data-go="igry">игра «Маркетолог»</a> и <a href="#standart" data-go="kursy">«Стандартный»</a>'),
    ("«Пробовал — бесполезно» стало привычкой",
     '<a href="#proryv" data-go="kursy">живой тренинг «Прорыв»</a>'),
    ("Нужен собеседник и тренажёр каждый день",
     '<a href="#fredi-sub" data-go="fredi">подписка на Фреди</a>'),
    ("Хочется наконец понять предмет, который в школе не дался",
     '<a href="#klyuchi" data-go="klyuchi">аудиосерия «Ключи»</a>'),
]

KEYS_LIST = [
    ("0.1 Ум-объяснитель", "как ум ищет объяснения и чем открытие отличается от приметы: пять «двигателей» и пять вопросов-выключателей."),
    ("0.2 Логика", "что утверждается и на чём держится; почему «если — то» не переворачивается и одного контрпримера хватает."),
    ("0.3 Учиться и помнить", "как слушать и закреплять остальные записи: вспоминание, растущие промежутки, сон."),
    ("0.4 Решать и изобретать", "общий порядок решения задачи для любого предмета: переформулировать, идти от цели, разрешить противоречие."),
    ("1.1 Число → 1.2 Геометрия → 2.1 Механика → 4.6 Биомеханика", "первая цепочка — от основ к применению в собственном теле."),
    ("И ещё 39 записей", "вещество и Земля, жизнь, информация и машины, человек и общество, искусство."),
]

# Обложки первых записей: настоящее фото автора и стеклянный плеер (стиль «автор с плеером»).
# Собраны скриптом из фото obo-mne/andrej-mejster.jpg / креатива РСЯ, не генерацией лица.
KEYS_COVERS = [("um-obyasnitel", "Ум-объяснитель"), ("logika", "Логика"),
               ("uchitsya", "Учиться и помнить"), ("reshat", "Решать и изобретать")]

FAQ = [
    ("Почему часть товаров продаётся на Ozon, а часть — здесь?",
     "Книги и игры давно продаются на Ozon: там быстрая доставка в любой город и отзывы "
     "покупателей. Пакет «Стандартный» с 20 октября 2026 года продаём сами — так автор "
     "сразу получает ваш заказ и подключает к разбору ситуаций."),
    ("С чего начать, если не знаю, что выбрать?",
     "С бесплатного: Лекторий открыт целиком, первое занятие курса — 13 минут. Если после "
     "него захочется практики с разбором — «Стандартный». Если сначала хочется понять "
     "механику — книга «Теория манипуляции»."),
    ("Можно ли вернуть пакет «Стандартный»?",
     'Да, в течение семи дней после получения, если товар не был в употреблении. Условия — '
     'в <a href="/oferta/">оферте</a>.'),
    ("Когда выйдут «Ключи»?",
     "Серия выходит по одной записи. Первая, «Ум-объяснитель», сейчас проходит проверку на "
     "слушателях. Напишите в Telegram — сообщим о выходе и дадим послушать первым."),
]

CSS = """
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-cyrillic.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212}
:root{--bg:#0c0c0c;--card:#151515;--card2:#1b1b1b;--line:rgba(255,255,255,.09);--text:#f0f0f0;--muted:#b9b9b9;--faint:#8a8a8a;--accent:#3A86FF;--accent2:#00b4ff}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;line-height:1.55;font-size:16px}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1100px;margin:0 auto;padding:0 16px}
.crumbs{font-size:.85rem;color:var(--faint);padding:18px 0 0}
.crumbs a{color:var(--faint)}
h1{font-size:clamp(1.8rem,4.5vw,2.6rem);font-weight:700;line-height:1.15;margin:10px 0 6px}
h2{font-size:clamp(1.25rem,3vw,1.6rem);font-weight:650;line-height:1.25}
h3{font-size:1rem;font-weight:620;line-height:1.3}
.lead{color:var(--muted);max-width:720px}
/* ярлыки категорий */
.cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:18px 0 8px}
.cat{position:relative;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:8px 34px 8px 8px;cursor:pointer;color:var(--text);text-align:left;font:inherit;display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:center;min-height:68px}
.cat:hover,.cat.on{border-color:var(--accent)}
.cat.on{background:rgba(58,134,255,.1)}
.cat .ic{width:52px;height:52px;border-radius:10px;object-fit:cover;display:block}
.cat span.t{display:flex;flex-direction:column;gap:2px;min-width:0}
.cat b{font-weight:620;font-size:.92rem;line-height:1.25}
.cat small{color:var(--faint);font-size:.76rem;line-height:1.3}
.q{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;border:1px solid var(--line);background:var(--card2);color:var(--muted);font:600 .85rem/1 Inter,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center}
.q:hover,.q[aria-expanded="true"]{border-color:var(--accent);color:#fff}
.tip{display:none;grid-column:1/-1;background:var(--card2);border:1px solid rgba(58,134,255,.45);border-radius:12px;padding:10px 14px;color:var(--muted);font-size:.92rem}
.tip.on{display:block}
.tip b{color:var(--text)}
/* витрины */
.shelf{padding:22px 0 8px}
.js .shelf{display:none}
.js .shelf.on{display:block}
.shelf-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px}
.shelf-lead{color:var(--muted);font-size:.95rem;margin-bottom:12px}
.back{background:none;border:0;color:var(--accent);font:inherit;font-size:.9rem;cursor:pointer;display:none}
.js .back{display:inline}
.list{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.it{display:grid;grid-template-columns:84px 1fr;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px}
.it.main{border-color:rgba(58,134,255,.6)}
.th{width:84px;height:84px;border-radius:10px;background:#1f1f1f;overflow:hidden;display:flex;align-items:center;justify-content:center}
.th img{width:100%;height:100%;object-fit:cover}
.th .emo{font-size:2.2rem}
.tx{display:flex;flex-direction:column;gap:4px;min-width:0}
.kind{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:#9cc2ff}
.price{font-weight:650;font-size:.98rem}
.price small{font-weight:400;color:var(--faint);font-size:.82rem}
.who{font-size:.88rem;color:var(--muted)}
.who b{color:var(--text);font-weight:600}
details{font-size:.88rem;color:var(--muted)}
summary{cursor:pointer;color:var(--accent);list-style:none}
summary::-webkit-details-marker{display:none}
summary::before{content:'＋ '}
details[open] summary::before{content:'－ '}
details p{margin-top:4px}
.btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:7px 16px;border-radius:20px;font-weight:600;font-size:.88rem}
.btn-buy{background:linear-gradient(135deg,var(--accent2),var(--accent));color:#fff}
.btn-more{border:1px solid var(--accent);color:#fff}
.btn:hover{text-decoration:none;filter:brightness(1.1)}
.free ul,.keys ol{list-style:none;display:grid;gap:8px}
.free li,.keys li{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;color:var(--muted);font-size:.92rem}
.free li b,.keys li b{color:var(--text);font-weight:600}
.keys li b{display:block}
.covers{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0 14px}
.covers img{width:100%;height:auto;border-radius:12px;display:block;border:1px solid var(--line)}
@media(max-width:560px){.covers{grid-template-columns:1fr 1fr}}
.status{display:inline-block;background:rgba(255,190,60,.12);color:#ffd27a;border-radius:12px;padding:3px 10px;font-size:.8rem}
.keys p{color:var(--muted);font-size:.95rem;margin-bottom:10px;max-width:760px}
.note{font-size:.85rem;color:var(--faint)}
table.pick{width:100%;border-collapse:collapse;font-size:.93rem}
table.pick td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top;color:var(--muted)}
table.pick td:first-child{color:var(--text);width:46%}
.top{margin:14px 0 4px}
.top-h{font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin-bottom:8px}
.faq{padding:30px 0 40px;border-top:1px solid var(--line);margin-top:26px}
.faq h3{margin:16px 0 4px}
.faq p{color:var(--muted);font-size:.95rem}
@media(max-width:560px){.cats{grid-template-columns:1fr 1fr;gap:8px}.cat{grid-template-columns:40px 1fr;gap:8px;min-height:58px}.cat .ic{width:40px;height:40px}.cat b{font-size:.86rem}.list{grid-template-columns:1fr}.it{grid-template-columns:72px 1fr}.th{width:72px;height:72px}}
"""

JS = r"""
(function(){
document.documentElement.classList.add('js');
var cats=document.querySelectorAll('.cat'),shelves=document.querySelectorAll('.shelf');
function show(k,scroll){
  cats.forEach(function(c){c.classList.toggle('on',c.dataset.cat===k);c.setAttribute('aria-pressed',c.dataset.cat===k)});
  shelves.forEach(function(s){s.classList.toggle('on',s.id===k)});
  var top=document.getElementById('top');if(top)top.style.display=k?'none':'';
  if(k){try{history.replaceState(null,'','#'+k)}catch(e){}
    if(scroll){var s=document.getElementById(k);if(s)s.scrollIntoView({behavior:'smooth',block:'start'})}
    try{ym(108138656,'params',{shop_cat:k})}catch(e){}}
  else{try{history.replaceState(null,'',location.pathname)}catch(e){}}
}
cats.forEach(function(c){c.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&!e.target.closest('.q')){e.preventDefault();c.click();}});});
cats.forEach(function(c){c.addEventListener('click',function(e){
  if(e.target.closest('.q'))return;
  show(c.classList.contains('on')?'':c.dataset.cat,true);})});
document.querySelectorAll('.q').forEach(function(q){q.addEventListener('click',function(e){
  e.stopPropagation();var t=document.getElementById(q.getAttribute('aria-controls')),open=q.getAttribute('aria-expanded')==='true';
  document.querySelectorAll('.q').forEach(function(o){o.setAttribute('aria-expanded','false')});
  document.querySelectorAll('.tip').forEach(function(o){o.classList.remove('on')});
  if(!open){q.setAttribute('aria-expanded','true');t.classList.add('on');}})});
document.querySelectorAll('.back').forEach(function(b){b.addEventListener('click',function(){show('',false);
  document.querySelector('.cats').scrollIntoView({behavior:'smooth',block:'start'})})});
document.querySelectorAll('a[data-go]').forEach(function(a){a.addEventListener('click',function(e){
  e.preventDefault();show(a.dataset.go,false);var t=document.querySelector(a.getAttribute('href'));
  if(t)setTimeout(function(){t.scrollIntoView({behavior:'smooth',block:'center'})},30);})});
function fromHash(){var h=location.hash.slice(1),el=h&&document.getElementById(h);if(!el)return;
  var sh=el.classList.contains('shelf')?el:el.closest('.shelf');if(!sh)return;show(sh.id,false);
  setTimeout(function(){el.scrollIntoView({block:sh===el?'start':'center'})},30);}
window.addEventListener('hashchange',fromHash);
var h=location.hash.slice(1),byItem=h&&document.getElementById(h)&&document.getElementById(h).closest('.shelf');
if(byItem){show(byItem.id,false);document.getElementById(h).scrollIntoView({block:'center'})}
else if(h&&document.querySelector('.shelf#'+CSS.escape(h)))show(h,true);
/* Цель shop_buy с параметром товара: видно, что из магазина берут. */
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[data-p]'):null;if(!a)return;
  try{ym(108138656,'reachGoal','shop_buy',{shop_product:a.dataset.p});ym(108138656,'params',{shop_product:a.dataset.p})}catch(err){}},true);
})();
"""


def esc(s):
    return html.escape(s, quote=True)


def count_word(n, forms):
    n10, n100 = n % 10, n % 100
    if n10 == 1 and n100 != 11:
        return forms[0]
    if 2 <= n10 <= 4 and not 12 <= n100 <= 14:
        return forms[1]
    return forms[2]


def card(p):
    ext = lambda u: u.startswith("http")
    th = ('<img src="%s" alt="%s" loading="lazy" width="84" height="84">' % (p["img"], esc(p["name"]))
          if p.get("img") else '<span class="emo" aria-hidden="true">%s</span>' % p["emo"])
    price = (('%s <small>· %s</small>' % (p["price"], p["note"])) if p["price"]
             else '<small>%s</small>' % p["note"])
    btns = "".join(
        '<a class="btn %s"%s href="%s"%s>%s</a>' % (
            "btn-buy" if main else "btn-more",
            ' data-p="%s"' % p["id"] if main else "",
            u, ' target="_blank" rel="noopener"' if ext(u) else "", t)
        for t, u, main in p["btns"])
    return ('<article class="it%s" id="%s">\n <div class="th">%s</div>\n <div class="tx">\n'
            '  <span class="kind">%s</span>\n  <h3>%s</h3>\n  <div class="price">%s</div>\n'
            '  <p class="who"><b>Кому:</b> %s</p>\n'
            '  <details><summary>Что даст</summary><p>%s</p></details>\n'
            '  <div class="btns">%s</div>\n </div>\n</article>' % (
                " main" if p.get("main") else "", p["id"], th, p["kind"], p["name"], price,
                p["who"], p["gain"], btns))


def shelf(key, title, lead, body, extra=""):
    return ('<section class="shelf" id="%s" aria-label="%s">\n<div class="shelf-h"><h2>%s</h2>'
            '<button class="back" type="button">← Все категории</button></div>\n%s%s\n%s</section>' % (
                key, esc(title), title, ('<p class="shelf-lead">%s</p>\n' % lead) if lead else "",
                body, extra))


def build():
    counts = {k: sum(1 for p in PRODUCTS if p["cat"] == k) for k, *_ in CATS}
    sub = {"besplatno": "%d способа" % len(FREE), "vybor": "7 подсказок",
           "klyuchi": "47 записей, скоро"}
    forms = ("товар", "товара", "товаров")
    tiles, tips = [], []
    for k, label, ic, tip in CATS:
        small = sub.get(k) or "%d %s" % (counts[k], count_word(counts[k], forms))
        tiles.append(
            '<div class="cat" role="button" tabindex="0" data-cat="%s" aria-pressed="false">'
            '<img class="ic" src="/magazin/img/cat-%s.webp" width="52" height="52" alt="" loading="lazy">'
            '<span class="t"><b>%s</b><small>%s</small></span>'
            '<button class="q" type="button" aria-label="Что в категории «%s»" aria-expanded="false" '
            'aria-controls="tip-%s">?</button></div>' % (k, k, label, small, esc(label), k))
        tips.append('<div class="tip" id="tip-%s"><b>%s.</b> %s</div>' % (k, label, tip))
    cats_html = '<div class="cats" role="group" aria-label="Категории">\n%s\n%s\n</div>' % (
        "\n".join(tiles), "\n".join(tips))

    by = lambda k: "\n".join(card(p) for p in PRODUCTS if p["cat"] == k)
    more = lambda k: ('<p class="shelf-lead" style="margin-top:12px"><a href="%s">%s →</a></p>' % ALL_LINK[k]) if k in ALL_LINK else ""
    shelves = [
        shelf("besplatno", "Бесплатно", "Без денег и без регистрации — с этого и стоит начать.",
              '<div class="free"><ul>%s</ul></div>' % "".join(
                  '<li><b><a href="%s">%s</a></b> — %s</li>' % f for f in FREE)),
        shelf("kursy", "Курсы и тренинги", "Видео и задания — чтобы приём перестал быть текстом и начал срабатывать в разговоре.",
              '<div class="list">%s</div>' % by("kursy"), more("kursy")),
        shelf("knigi", "Книги", "Механика — то, без чего приёмы остаются заученными фразами.",
              '<div class="list">%s</div>' % by("knigi"), more("knigi")),
        shelf("igry", "Игры", "Навык ставится решением задач, а не объяснением. Игра — способ решать задачи всей компанией.",
              '<div class="list">%s</div>' % by("igry"), more("igry")),
        shelf("fredi", "Фреди — виртуальный психолог", "",
              '<div class="list">%s</div>' % by("fredi")),
        shelf("klyuchi", "Аудиосерия «Ключи» — фундамент предметов", "",
              '<div class="keys"><span class="status">готовится · первая запись проходит проверку</span>\n'
              '<p style="margin-top:10px">Вспомните предмет, который в школе так и не дался: формулы были, а понимания — нет. '
              'Обычно дело не в способностях. Не хватило каркаса — нескольких идей, из которых остальное выводится само, — '
              'и привычки смотреть на предмет под нужным углом.</p>\n'
              '<p>«Ключи» — 47 аудиозаписей по 15–20 минут, по одной на предмет: логика, математика, физика, химия, биология, '
              'информатика, язык, литература, история, экономика, музыка и другие. В каждой — история героя, который сам '
              'открывает закон, настройка внимания под этот предмет, порядок мышления и четыре-шесть ключевых идей.</p>\n'
              '<p><b style="color:var(--text)">Кому:</b> взрослым, которые хотят наконец понять «свою нелюбимую» науку, и '
              'старшеклассникам перед новой темой — с 16 лет. Для детей готовим отдельную версию, без погружения, с текстом для родителя.</p>\n'
              '<p><b style="color:var(--text)">Что даст — честно:</b> запись не «загружает» предмет. Она ставит каркас и привычку '
              'внимания, на которые дальше ложится практика.</p>\n'
              '<div class="covers">%s</div>\n'
              '<ol>%s</ol>\n'
              '<p class="note" style="margin-top:10px">Записи слушают в наушниках, в расслабленном состоянии. Не за рулём; при '
              'эпилепсии и серьёзных психических расстройствах — после консультации с врачом.</p>\n'
              '<div class="btns"><a class="btn btn-buy" data-p="klyuchi" href="https://t.me/meysternlp" target="_blank" '
              'rel="noopener">Ранний доступ — написать в Telegram</a></div></div>' % (
                  "".join('<img src="/magazin/img/klyuchi-%s.webp" width="1080" height="1080" loading="lazy" '
                          'alt="Обложка записи «%s»">' % c for c in KEYS_COVERS),
                  "".join('<li><b>%s</b>%s</li>' % kl for kl in KEYS_LIST))),
        shelf("vybor", "Не знаю, что выбрать", "Начните с того, что мешает сейчас, а не с того, что кажется самым полным.",
              '<table class="pick">%s</table>' % "".join(
                  '<tr><td>%s</td><td>%s</td></tr>' % r for r in PICK)),
    ]

    top = [p for p in PRODUCTS if p.get("main")]
    top_html = ('<div class="top" id="top"><div class="top-h">Главное сейчас</div>'
                '<div class="list">%s</div></div>' % "\n".join(card(dict(p, id=p["id"] + "-top")) for p in top))

    faq = '<section class="faq" id="voprosy"><h2>❓ Частые вопросы</h2>%s</section>' % "".join(
        '<h3>%s</h3><p>%s</p>' % qa for qa in FAQ)

    items = []
    for i, p in enumerate(PRODUCTS, 1):
        url = next((u for t, u, m in p["btns"] if not u.startswith("http")), p["btns"][0][1])
        items.append({"@type": "ListItem", "position": i, "name": p["name"].strip("«»"),
                      "url": url if url.startswith("http") else SITE + url})
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Главная", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Магазин", "item": SITE + "/magazin/"}]},
        {"@type": "ItemList", "name": "Магазин Андрея Мейстера", "itemListElement": items}]}

    nav = ('<div id="header-placeholder"><nav aria-label="Основная навигация" style="display:flex;flex-wrap:wrap;'
           'gap:10px 20px;align-items:center;padding:14px 20px;max-width:1200px;margin:0 auto">'
           '<a href="/" style="color:#3A86FF;text-decoration:none;font-size:.9rem;font-weight:700">А МЕЙСТЕР</a>'
           + "".join('<a href="%s" style="color:#3A86FF;text-decoration:none;font-size:.9rem">%s</a>' % x for x in (
               ("/blog/", "Блог"), ("/blog/lektorij/", "Лекторий"), ("/istorii/", "Истории"),
               ("/sobytiya/", "Архив"), ("/magazin/", "Магазин"),
               ("/virtual-psychologist/", "Виртуальный психолог")))
           + "</nav></div>")
    loader = ("<script>(function(){fetch('/%s.html').then(function(r){return r.text();}).then(function(html){"
              "var el=document.getElementById('%s-placeholder');el.innerHTML=html;el.querySelectorAll('script')"
              ".forEach(function(s){var n=document.createElement('script');for(var i=0;i<s.attributes.length;i++)"
              "{n.setAttribute(s.attributes[i].name,s.attributes[i].value);}n.text=s.text;s.parentNode.replaceChild(n,s);});});})();</script>")

    title = "Магазин: курсы, книги, игры и записи Андрея Мейстера"
    desc = ("Всё, что сделано для тех, кто хочет понимать людей и себя: курс «Разговорный гипноз», книги, "
            "игры-тренажёры, подписка на Фреди и аудиосерия «Ключи». Для кого каждая вещь и что она даёт.")
    page = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="robots" content="index, follow">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
<meta name="author" content="Андрей Юрьевич Мейстер">
<link rel="canonical" href="https://meysternlp.ru/magazin/">
<meta property="og:title" content="%(title)s">
<meta property="og:description" content="Курс «Разговорный гипноз», книги, игры-тренажёры, Фреди и аудиосерия «Ключи» — для кого каждая вещь и что она даёт.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://meysternlp.ru/magazin/">
<meta property="og:image" content="https://meysternlp.ru/treningi/komplekt-standart.webp">
<meta property="og:site_name" content="Андрей Мейстер">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico">
<!-- Собрано tools/build_magazin.py — правки там, не здесь. -->
<style>%(css)s</style>
<script type="text/javascript">
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
ym(108138656,'init',{ssr:true,webvisor:true,clickmap:true,referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/108138656" style="position:absolute;left:-9999px" alt=""></div></noscript>
<script type="application/ld+json">
%(ld)s
</script>
</head>
<body>
%(nav)s
%(hload)s

<main class="wrap">
<div class="crumbs"><a href="/">Главная</a> / Магазин</div>
<h1>Магазин</h1>
<p class="lead">Курсы, книги, игры, Фреди и аудиозаписи — у каждой вещи сказано, кому она и что вы будете уметь после. Выберите категорию; кнопка «?» объяснит, что внутри.</p>
%(cats)s
%(top)s
%(shelves)s
%(faq)s
</main>

<div id="footer-placeholder"></div>
%(fload)s
<script>%(js)s</script>
</body>
</html>
""" % dict(title=title, desc=desc, css=CSS, ld=json.dumps(ld, ensure_ascii=False, indent=1),
           nav=nav, hload=loader % ("header", "header"), fload=loader % ("footer", "footer"),
           cats=cats_html, top=top_html, shelves="\n".join(shelves), faq=faq, js=JS)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(page)
    print("записано: magazin/index.html — категорий %d, товаров %d" % (len(CATS), len(PRODUCTS)))


if __name__ == "__main__":
    build()
