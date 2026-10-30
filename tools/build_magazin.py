#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Магазин /magazin/ — собирается из списка товаров ниже.

    python3 tools/build_magazin.py
    python3 tools/fix_nav_fallback.py      # запасной подвал в пустой плейсхолдер

Решения владельца 25.10.2026: все товары — в одном магазине, «Книги»,
«Игры» и «Тренинги» из меню убраны, «Магазин» — последним пунктом. При
входе — компактные ярлыки категорий, у каждого кнопка «i» с объяснением («?» читался как «не понял»,
владелец 25.10.2026),
что в этой категории. Ярлык открывает свою витрину, остальные свёрнуты;
без JS видно всё сразу, поэтому краулер получает полный каталог.

Цены — от владельца (25.10.2026): книги по 990 ₽, игры «Вариатика» по
3 800 ₽, «Маркетолог» 1 200 ₽, пакет «Самостоятельный» 3 200 ₽, свои товары и Фреди — как на их страницах.
С 25.10.2026 всё продаём сами, без Ozon (владелец): товар — оплата картой на
сайте через ЮKassa (/api/shop/checkout, каталог PRODUCTS в order_routes.py
Frederick — цены менять в обоих местах), доставка СДЭК — при получении.
Заказ — /magazin/zakaz/?t=<id>, страница после оплаты — /magazin/spasibo/. Цена меняется — менять здесь и
пересобрать. Новый товар — новая строка в PRODUCTS. Комплект за 19 999 ₽
снят с продажи 25.10.2026 (решение владельца).
"""
import html
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Срок предзаказа «Ключей» (владелец 26.10.2026: фокус-группа спрашивала «когда?»).
# Меняется здесь — встаёт в витрину, вопросы и страницу заказа.
KEYS_DUE = "до 30 ноября 2026"

OUT = os.path.join(ROOT, "magazin", "index.html")
SITE = "https://meysternlp.ru"

# (ключ, ярлык, значок, объяснение под «?»). Картинка ярлыка — magazin/img/cat-<ключ>.webp,
# нарезана из одного фотореалистичного холста (25.10.2026); значок — запас на случай без картинки.
CATS = [
    ("vybor", "Подобрать под задачу", "🧭",
     "Найдите строку про себя — тревога, усталость, дети, работа с людьми, переговоры — "
     "и рядом будет то, что с этим работает. Бесплатное — первым."),
    ("besplatno", "Бесплатно", "🎁",
     "С чего начать без денег и регистрации: курсы Лектория — в том числе про тревогу, "
     "сон и усталость, — первое занятие курса, игра для печати и разговор с Фреди."),
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
     "Фреди — программа-собеседник, виртуальный психолог: разговор, тесты и тренажёры. "
     "Бесплатно каждый день — несколько минут разговора и тесты; без ограничений — по подписке."),
    ("klyuchi", "Ключи", "🔑",
     "Аудиозаписи по школьным и вузовским предметам — суггестивная техника с двойным наведением: по записи на предмет — каркас "
     "понятий, из которого остальное выводится самому. Первая запись — в продаже, остальные — "
     "предзаказ, по 690 ₽."),
]


# Товар: категория, якорь, вид, название, цена (или None), примечание к цене,
# кому, что даст, картинка (или значок), кнопки [(текст, адрес, главная?)].
PRODUCTS = [
    dict(cat="kursy", id="standart", kind="Курс · печатный комплект",
         name="Разговорный гипноз. Пакет «Стандартный»", price="5 900 ₽",
         note="+ доставка СДЭК при получении, возврат 7 дней", main=True,
         who="тем, кому важно, чтобы слушали и соглашались: переговоры, совещания, "
             "продажи, разговор с подростком.",
         gain="за месяц три-четыре приёма, которые срабатывают без подготовки, и умение "
              "замечать, когда их применяют к вам. Внутри: книга «Матчасть», 38 видео на "
              "год, блокнот с заданиями, игра «Маркетолог». Разбор — автор сам отвечает "
              "на ваши вопросы и разбирает ваши ситуации в закрытом Telegram-канале, ответ в "
              "течение суток. Доступ к видео и разбору — 12 месяцев, книга и блокнот остаются у вас.",
         img="/magazin/img/standart-razvorot.webp",
         btns=[("Заказать", "/razgovornyj-gipnoz/standart/zakaz/", True),
               ("Подробнее", "/razgovornyj-gipnoz/standart/", False)]),
    dict(cat="kursy", id="samostoyatelnyy", kind="Курс · видео",
         name="Разговорный гипноз. Пакет «Самостоятельный»", price="3 200 ₽", note="+ доставка СДЭК при получении",
         who="тем, кто учится сам и не нуждается в обратной связи.",
         gain="те же 38 видео с приёмами речевого воздействия — на карточках с QR-кодами, "
              "по занятию на день, и доступ в закрытый Telegram-канал. Без печатного комплекта "
              "и без личного разбора ваших ситуаций с автором.",
         img="/magazin/img/samostoyatelnyy.webp",
         btns=[("Купить", "/magazin/zakaz/?t=samostoyatelnyy", True),
               ("Подробнее", "/treningi/razgovornyy-gipnoz-samostoyatelnyy.html", False)]),
    dict(cat="kursy", id="proryv", kind="Живой тренинг",
         name="«Прорыв» — против выученной беспомощности", price="от 2 900 ₽", note="первый этап, очно, в Коломне",
         who="тем, у кого «пробовал — бесполезно» стало привычкой и уговоры себя больше "
             "не работают.",
         gain="телесный опыт «я приложил усилие — и препятствие поддалось». Беспомощность "
              "снимают опытом, а не словами. Пять этапов по нарастающей, начать можно с "
              "одного — сопротивление подбирают так, чтобы вы справились. Стоп-слово в любой "
              "момент; противопоказания, цены этапов и даты — на странице тренинга.",
         img="/treningi/proryv-hero.jpg",
         btns=[("Этапы и запись", "/treningi/proryv.html", True)]),
    dict(cat="knigi", id="kniga-tm", kind="Книга",
         name="«Теория манипуляции. Разговорный гипноз»", price="990 ₽", note="печатная; PDF — 690 ₽", pdf=True,
         who="тем, кто хочет понимать механику влияния — и свою, и чужую.",
         gain="транс как обычное состояние, две линии воздействия, пресуппозиции и "
              "тридцать с лишним видов внушений. 250 страниц.",
         img="/magazin/img/kniga-tm.webp",
         btns=[("Печатная — 990 ₽", "/magazin/zakaz/?t=kniga-tm", True),
               ("PDF — 690 ₽", "/magazin/zakaz/?t=kniga-tm-pdf", False),
               ("О книге", "/knigi/teoriya-manipulyacii-tom-1-razgovornyj-gipnoz/", False)]),
    dict(cat="knigi", id="kniga-var", kind="Книга",
         name="«Вариатика. Библиотека человеческих паттернов»", price="990 ₽", note="печатная; PDF — 690 ₽", pdf=True,
         who="тем, кто устал от объяснения «он просто такой», — психологам, "
             "руководителям, всем, кто работает с людьми.",
         gain="четыре базовые программы и девять уровней у каждой — понимать, почему "
              "человек повторяет один сценарий и как он переходит на другой уровень. "
              "Авторская модель, собранная из практики, а не результат исследований.",
         img="/magazin/img/kniga-variatika.webp",
         btns=[("Печатная — 990 ₽", "/magazin/zakaz/?t=kniga-var", True),
               ("PDF — 690 ₽", "/magazin/zakaz/?t=kniga-var-pdf", False),
               ("О книге", "/knigi/variatika-biblioteka-chelovecheskih-patternov/", False)]),
    dict(cat="knigi", id="kniga-konc", kind="Книга",
         name="«Концептикон. Семь линз для ясного мышления»", price="990 ₽", note="печатная; PDF — 690 ₽", pdf=True,
         who="тем, кто застрял в одной ситуации и видит её только с одной стороны.",
         gain="семь способов смотреть на одну ситуацию — у каждого свой главный вопрос и "
              "индикаторы самопроверки. Темп — одна линза в неделю.",
         img="/magazin/img/kniga-konc.webp",
         btns=[("Печатная — 990 ₽", "/magazin/zakaz/?t=kniga-konc", True),
               ("PDF — 690 ₽", "/magazin/zakaz/?t=kniga-konc-pdf", False),
               ("О книге", "/knigi/kontseptikon-sem-linz/", False)]),
    dict(cat="knigi", id="kniga-dep", kind="Книга",
         name="«Настольная книга депутата»", price="1 490 ₽", note="PDF · предзаказ",
         pdf_only=True, pdf_kind="Книга · PDF, предзаказ",
         who="тем, кто претендует на власть и не хочет её имитировать.",
         gain="речевые навыки, когнитивные стратегии и протоколы публичного действия. "
              "Только в PDF. Это предзаказ: книга готовится, файл придёт на почту, как только "
              "будет готов.",
         img="/nastolnaya-kniga-deputata-andrej-mejster.png",
         btns=[("Предзаказ — 1 490 ₽", "/magazin/zakaz/?t=kniga-dep-pdf", True),
               ("О книге", "/knigi/nastolnaya-kniga-deputata/", False)]),
    dict(cat="igry", id="marketolog", kind="Настольная игра",
         name="«Маркетолог»", price="1 200 ₽", note="+ доставка СДЭК при получении",
         who="командам продаж, тренерам, преподавателям — всем, кому нужно убеждать "
             "историей.",
         gain="один рассказывает историю по картам, другой слушает, третий по лицу "
              "слушателя видит, поймали его или нет. Учит строить истории и видеть, "
              "работают ли они. 2–3 игрока, 16+, три колоды: обстоятельства, образы, развязка.",
         img="/magazin/img/igra-marketolog.webp",
         btns=[("Купить", "/magazin/zakaz/?t=marketolog", True),
               ("Об игре", "/igry/marketolog.html", False),
               ("Правила (PDF)", "/igry/marketolog-pravila.pdf", False)]),
    dict(cat="igry", id="var-basic", kind="Настольная игра",
         name="«Вариатика — Basic»", price="3 800 ₽", note="+ доставка СДЭК при получении",
         who="тем, кто хочет понимать поступки людей, а не удивляться им.",
         gain="навык разбирать чужие истории и замечать повторяющиеся сценарии — через игру. "
              "В коробке: «Колода Мейстера», инструкция и тетрадь заданий.",
         img="/magazin/img/igra-variatika-basic.webp",
         btns=[("Купить", "/magazin/zakaz/?t=var-basic", True),
               ("Об игре", "/igry/variatika-basic.html", False)]),
    dict(cat="igry", id="var-intensive", kind="Настольная игра",
         name="«Вариатика — Intensive»", price="3 800 ₽", note="+ доставка СДЭК при получении",
         who="тем, кто разбирается в сложных системах — семье, команде, организации.",
         gain="системное, критическое и латеральное мышление: видеть, как части влияют "
              "друг на друга. В коробке: инструкция, тетрадь упражнений и карточки-схемы.",
         img="/magazin/img/igra-variatika-intensive.webp",
         btns=[("Купить", "/magazin/zakaz/?t=var-intensive", True),
               ("Об игре", "/igry/variatika-intensive.html", False)]),
    dict(cat="igry", id="var-progressive", kind="Настольная игра",
         name="«Вариатика — Progressive»", price="3 800 ₽", note="+ доставка СДЭК при получении",
         who="тем, кто хочет не только разбирать чужие сценарии, но и строить свои.",
         gain="умение создавать новые сценарии и превращать маловероятные хорошие исходы "
              "в реальные. В коробке: инструкция, тетрадь упражнений, учётная карточка "
              "персонажа и карты.",
         img="/magazin/img/igra-variatika-progressive.webp",
         btns=[("Купить", "/magazin/zakaz/?t=var-progressive", True),
               ("Об игре", "/igry/variatika-progressive.html", False)]),
    dict(cat="fredi", id="fredi-sub", kind="Подписка",
         name="Фреди: разговор, тесты и тренажёры", price="690 ₽ в месяц",
         note="первые 3 дня — 69 ₽, потом 690 ₽ в месяц списываются сами",
         who="тем, кому нужен собеседник, который не устаёт и не оценивает, — и тренажёр "
             "навыков на каждый день.",
         gain="бесплатно каждый день — несколько минут разговора и тесты, каждое упражнение "
              "первый раз бесплатно. По подписке — разговор без счётчика, игры-тренажёры и "
              "практики без ограничений. На картинке — пример разговора: Фреди не утешает "
              "вообще, а готовит к конкретной ситуации.",
         cancel="Отменить: во Фреди «Настройки подписки» → «Отключить автопродление». Доступ "
                "останется до конца оплаченного срока, больше ничего не спишется.",
         img="/magazin/img/fredi-razgovor.webp",
         btns=[("Попробовать Фреди", "/virtual-psychologist/", True),
               ("Тарифы", "/tarify/", False)]),
]

ALL_LINK = {"kursy": ("/treningi/", "Все тренинги и программы"),
            "knigi": ("/knigi/", "Все книги"),
            "igry": ("/igry/", "Все игры и тренажёры")}

FREE = [
    ("/blog/lektorij/trevoga/", "Курс «Тревога и как с ней жить»", "что такое тревога, зачем она нужна и что с ней делать."),
    ("/blog/lektorij/son/", "Курс «Сон»", "зачем мы спим, цена недосыпа и что мешает уснуть."),
    ("/blog/lektorij/psihologiya-peregruzok/", "Курс «Психология перегрузок»", "почему устаёшь, даже когда ничего тяжёлого не делал."),
    ("/razgovornyj-gipnoz/urok-1/", "Первое занятие курса «Разговорный гипноз»", "13 минут, целиком."),
    ("/blog/lektorij/", "Весь Лекторий", "все курсы открыты целиком и без регистрации: отношения, дети, мышление, общение, работа."),
    ("/blog/lektorij/kak-uchitsya/", "Курс «Как учиться»", "как запоминать и понимать — себе или чтобы помочь ребёнку."),
    ("/virtual-psychologist/", "Фреди", "несколько минут разговора каждый день и тесты; каждое упражнение первый раз бесплатно."),
]

PICK = [
    ("Тревожно, плохо сплю, всё откладываю",
     'бесплатные курсы Лектория <a href="/blog/lektorij/trevoga/">«Тревога и как с ней жить»</a>, '
     '<a href="/blog/lektorij/son/">«Сон»</a> и <a href="/blog/lektorij/prokrastinaciya-i-motivaciya/">«Прокрастинация и мотивация»</a>; '
     'для ежедневной практики — <a href="#fredi-sub" data-go="fredi">Фреди</a>'),
    ("Нет сил, всё раздражает, перегруз",
     'бесплатные курсы <a href="/blog/lektorij/psihologiya-peregruzok/">«Психология перегрузок»</a> и '
     '<a href="/blog/lektorij/depressiya-i-apatiya/">«Депрессия и апатия»</a>. Если так неделями и не отпускает — '
     'это повод идти к врачу или психотерапевту, а не в магазин'),
    ("Трудно с ребёнком: истерики, школа, экраны",
     'бесплатный курс <a href="/blog/lektorij/roditelstvo/">«Родительство»</a>'),
    ("Трудно со взрослыми детьми или с пожилыми родителями",
     'бесплатный курс <a href="/blog/lektorij/pokoleniya/">«Поколения»</a> — почему мы видим одно и то же '
     'по-разному. Отдельного курса пока нет — есть статья '
     '<a href="/blog/vzroslye-deti-ne-hotyat-obshchatsya.html">«Взрослые дети не хотят общаться»</a>'),
    ("Ребёнку не даётся предмет",
     'родителям старшеклассника — <a href="#klyuchi" data-go="klyuchi">аудиосерия «Ключи»</a> (с 16 лет, первая запись — 690 ₽); '
     'пока — бесплатный курс <a href="/blog/lektorij/kak-uchitsya/">«Как учиться»</a>: прочитать самим и пересказать'),
    ("Вас перебивают, не дослушивают, «мы подумаем» — и тишина",
     '<a href="#standart" data-go="kursy">Пакет «Стандартный»</a> — с разбором ваших ситуаций у автора; '
     'или <a href="#kniga-tm" data-go="knigi">книга «Теория манипуляции»</a>, если сначала хочется понять механику'),
    ("Не понимаете, почему люди раз за разом поступают одинаково",
     '<a href="#kniga-var" data-go="knigi">книга «Вариатика»</a> и <a href="#var-basic" data-go="igry">игра «Вариатика — Basic»</a>'),
    ("Ходите по кругу в одной ситуации и не видите выхода",
     '<a href="#kniga-konc" data-go="knigi">книга «Концептикон»</a> — семь способов посмотреть иначе'),
    ("Продаёте или ведёте команду",
     '<a href="#standart" data-go="kursy">«Стандартный»</a> — себе; <a href="#marketolog" data-go="igry">игра «Маркетолог»</a> — '
     'на планёрку с отделом: учит рассказывать так, чтобы слушали'),
    ("Сами работаете с людьми — психолог, коуч, педагог",
     'книги <a href="#kniga-konc" data-go="knigi">«Концептикон»</a> и <a href="#kniga-var" data-go="knigi">«Вариатика»</a> — '
     'увидеть ситуацию клиента с разных сторон'),
    ("«Пробовал — бесполезно» стало привычкой",
     '<a href="#proryv" data-go="kursy">живой тренинг «Прорыв»</a>'),
    ("Нужен собеседник и тренажёр каждый день",
     '<a href="#fredi-sub" data-go="fredi">подписка на Фреди</a>'),
    ("Хочется наконец понять предмет, который в школе не дался",
     '<a href="#klyuchi" data-go="klyuchi">аудиосерия «Ключи»</a> — первая запись 690 ₽; бесплатно — курсы '
     '<a href="/blog/lektorij/kak-uchitsya/">«Как учиться»</a> и <a href="/blog/lektorij/logika/">«Логика»</a>'),
]

# Вся программа «Ключей»: номер, название, что из записи вырастает, узел (◆ — собран из
# нескольких фундаментальных). Из каталога программы (kluchi-programma, 24.10.2026).
# Ярлык записи — magazin/img/k/NN.webp, NN — порядковый номер в этом списке; нарезан из
# фотореалистичного холста владельца 7×7, 2000 px (25.10.2026, второй вариант — вдвое чётче).
# Иконки категорий и крупный ярлык «Ум-объяснителя» — из его же холста 3×3.
KEYS_ALL = [
    ('0.1', 'Ум-объяснитель', 'наблюдение, догадка и проверка во всех предметах', False),
    ('0.2', 'Логика', 'доказательство, право, спор, программирование', False),
    ('0.3', 'Учиться и помнить', 'любое обучение', False),
    ('0.4', 'Решать и изобретать', 'инженерия, наука, бизнес', False),
    ('1.1', 'Число и алгебра', 'вся количественная наука, финансы', False),
    ('1.2', 'Геометрия и пространство', 'черчение, архитектура, навигация, биомеханика, физика', False),
    ('1.3', 'Изменение и накопление (математический анализ)', 'физика, инженерия, экономика, биология популяций', False),
    ('1.4', 'Счёт вариантов и связи (дискретная математика)', 'алгоритмы, криптография, сети, логистика', False),
    ('1.5', 'Вероятность', 'статистика, физика частиц, страхование, игры', False),
    ('1.6', 'Статистика и данные', 'медицина, психология, экономика, любые выводы из цифр', False),
    ('2.1', 'Механика', 'инженерия, астрономия, биомеханика', False),
    ('2.2', 'Тепло и энтропия', 'двигатели, климат, химия, жизнь', False),
    ('2.3', 'Электричество и магнетизм', 'электроника, связь, медицинская техника, химия', False),
    ('2.4', 'Волны, звук и свет', 'музыка, оптика, связь, медицина', False),
    ('2.5', 'Атомы и кванты', 'химия, электроника, лазеры, энергетика', False),
    ('2.6', 'Пространство, время и Вселенная', 'астрономия, навигация (спутники), космология', False),
    ('3.1', 'Атом и связь (химия)', 'материалы, фармакология, кулинария', False),
    ('3.2', 'Реакции и энергия', 'промышленность, биохимия, экология', False),
    ('3.3', 'Химия жизни', 'медицина, питание, генетика', True),
    ('3.4', 'Земля: недра, вода, климат', 'география, экология, климат', False),
    ('4.1', 'Клетка и наследственность', 'генетика, медицина, селекция', False),
    ('4.2', 'Эволюция', 'вся биология, медицина, психология', False),
    ('4.3', 'Тело: физиология', 'медицина, спорт, питание', False),
    ('4.4', 'Мозг и нервная система', 'психология, медицина, обучение', False),
    ('4.5', 'Экология', 'охрана природы, сельское хозяйство', False),
    ('4.6', 'Биомеханика', 'спорт, осанка, реабилитация', True),
    ('4.7', 'Здоровье и восстановление', 'режим, тренировки, работоспособность', True),
    ('5.1', 'Системы и обратная связь', 'управление, экология, экономика, медицина', False),
    ('5.2', 'Информация и код', 'связь, сжатие, шифрование, генетика', False),
    ('5.3', 'Алгоритмы и вычисление', 'программирование, искусственный интеллект, автоматизация', False),
    ('5.4', 'Инженерия', 'изобретения, производство', True),
    ('6.1', 'Восприятие и мышление', 'педагогика, дизайн, реклама', False),
    ('6.2', 'Эмоции и мотивация', 'коучинг, управление, педагогика', False),
    ('6.3', 'Развитие и личность', 'воспитание, педагогика, психотерапия', False),
    ('6.4', 'Общение и влияние', 'переговоры, продажи, лидерство, разговорный гипноз', False),
    ('6.5', 'Язык', 'риторика, перевод, литература', False),
    ('6.6', 'Риторика и аргументация', 'выступления, переговоры, продажи', True),
    ('6.7', 'Литература', 'сценарий, журналистика, убеждение историей', False),
    ('6.8', 'История', 'политика, право, понимание настоящего', False),
    ('6.9', 'Общество', 'политика, управление, социальная работа', False),
    ('6.10', 'Стратегия и игры', 'экономика, политика, переговоры, эволюция поведения', False),
    ('6.11', 'Экономика', 'бизнес, личные финансы, политика', False),
    ('6.12', 'Право и государство', 'гражданская жизнь, договоры, политика', True),
    ('6.13', 'Познание (философия)', 'наука, критическое мышление, мировоззрение', False),
    ('6.14', 'Этика', 'право, лидерство, медицина, решения в жизни', False),
    ('7.1', 'Музыка', 'исполнение, сочинение, ритм речи', False),
    ('7.2', 'Изображение и композиция', 'живопись, фотография, дизайн, архитектура', False),
]
# Что запись учит замечать и одна из её ключевых идей — из программы серии
# (kluchi-programma, 24.10.2026). Это описание товара: остальные 46 записей
# продаются по предзаказу за 690 ₽ (владелец 25.10.2026), товары klyuchi-<номер>
# в order_routes.py Frederick.
KEYS_TEACH = {
    "0.2": ("что утверждается и на чём держится", "Из верных посылок по правилам выводится только верное; из ложной посылки может выйти что угодно — и ложь, и случайная правда."),
    "0.3": ("что я могу вспомнить без подсказки, а что только узнаю, когда вижу", "Вспоминание учит сильнее перечитывания."),
    "0.4": ("что дано, что ищем, что мешает, где противоречие", "Переформулировка задачи часто и есть половина решения."),
    "1.1": ("сколько, что от чего зависит, что не меняется", "Число — сколько раз повторяется единица; умножение — счёт пачками."),
    "1.2": ("форма, пропорция, симметрия, прямые углы", "Всё начинается с расстояния: точка, прямая, длина."),
    "1.3": ("как быстро меняется и сколько накопилось", "Скорость изменения в точке — наклон графика (производная)."),
    "1.4": ("сколько способов и что с чем связано", "Правило умножения: n способов, затем m способов — всего n·m."),
    "1.5": ("какие исходы возможны и насколько они равны", "По одному случай непредсказуем, по многим — предсказуем (закон больших чисел)."),
    "1.6": ("сколько наблюдений, какая база, кого не посчитали", "Сначала базовая частота — как часто это бывает вообще."),
    "2.1": ("какие силы, что сохраняется, в каких единицах", "Тело сохраняет скорость, пока на него не действует сила (инерция)."),
    "2.2": ("откуда энергия, куда уходит тепло, растёт ли беспорядок", "Тепло — беспорядочное движение частиц; температура — его средняя энергия."),
    "2.3": ("где заряды, куда течёт ток, что меняется во времени", "Одноимённые заряды отталкиваются, разноимённые притягиваются."),
    "2.4": ("частота, длина волны, что складывается", "Волна переносит энергию, а не вещество."),
    "2.5": ("порции энергии, вероятность, масштаб", "Атом — крошечное тяжёлое ядро и электроны вокруг."),
    "2.6": ("скорость света, масштаб, давность", "Скорость света одинакова для любого наблюдателя."),
    "3.1": ("из чего состоит и как соединено", "Несколько десятков видов атомов строят весь видимый мир."),
    "3.2": ("что было, что стало, куда делась энергия", "Реакция — перестановка атомов; ни один не исчезает."),
    "3.3": ("форма молекулы и её работа", "Углерод строит длинные цепи и кольца — каркас всех молекул жизни."),
    "3.4": ("потоки энергии и вещества, масштаб времени", "Плиты земной коры движутся — отсюда горы, землетрясения, вулканы."),
    "4.1": ("инструкция и её исполнение", "Всё живое состоит из клеток."),
    "4.2": ("как признак помогает выжить и оставить потомство", "Изменчивость, наследственность, отбор — из трёх шагов выводится история живого."),
    "4.3": ("что держится постоянным и какой системой", "Организм держит внутреннюю среду постоянной."),
    "4.4": ("сигнал, связь, повторение", "Нейрон передаёт сигнал электрически, а другому нейрону — химически."),
    "4.5": ("кто кого ест, куда идёт энергия, что ограничивает рост", "Энергия течёт по цепям питания и на каждом шаге в основном теряется."),
    "4.6": ("где ось, где рычаг, где центр масс", "Кости — рычаги, суставы — оси, мышцы — тяги."),
    "4.7": ("нагрузка и восстановление", "Тело приспосабливается к нагрузке, если между нагрузками есть восстановление."),
    "5.1": ("что на что влияет и с какой задержкой", "Усиливающая обратная связь разгоняет, уравновешивающая держит."),
    "5.2": ("что неизвестно и сколько вопросов нужно, чтобы узнать", "Информация уменьшает неопределённость; бит — ответ на один вопрос «да или нет»."),
    "5.3": ("шаги, повторы, условия", "Алгоритм — точная последовательность шагов."),
    "5.4": ("требование, ограничение, слабое звено", "Любая конструкция — компромисс между требованиями."),
    "6.1": ("что человек заметил и как истолковал", "Восприятие — догадка мозга, а не копия мира."),
    "6.2": ("что человек чувствует и чего хочет", "Эмоция — быстрая оценка: важно, опасно, хорошо."),
    "6.3": ("что врождённое, что выученное, на каком этапе", "Развитие идёт этапами, и у каждого свои задачи."),
    "6.4": ("кто на кого влияет и чем", "Люди сверяются с тем, как поступают другие."),
    "6.5": ("что сказано, как, кому и что подразумевается", "Связь звука и смысла договорная."),
    "6.6": ("тезис, довод, слушатель", "Тезис, доводы, доказательства."),
    "6.7": ("чего хочет герой, что мешает, какая деталь", "Герой хочет, ему мешают."),
    "6.8": ("причина, следствие, источник", "У события есть длинные причины и случайный повод."),
    "6.9": ("нормы, роли, группы", "Нормы держат поведение сильнее законов."),
    "6.10": ("от чьих решений зависит мой выигрыш", "Выигрыш зависит от решений других."),
    "6.11": ("кто чем рискует, что получает, от чего отказался", "Всего на всех не хватает — значит, всегда выбор."),
    "6.12": ("какое правило, кто его установил, кто отвечает", "Правило должно быть общим и известным заранее."),
    "6.13": ("откуда я это знаю", "Знание — обоснованное верное убеждение; мнение может быть верным случайно."),
    "6.14": ("кому польза, кому вред, какое правило нарушено", "Три главных взгляда: оценивать последствия, следовать долгу, быть человеком определённого характера."),
    "7.1": ("напряжение и разрешение, повтор и его нарушение", "Звук — колебание, высота — частота."),
    "7.2": ("куда идёт взгляд, где свет, где контраст", "Свет и тень создают объём."),
}

KEY_BLOCKS = {"0": "Как думать и учиться", "1": "Математика", "2": "Физика", "3": "Вещество и Земля",
              "4": "Жизнь", "5": "Информация и машины", "6": "Человек и общество", "7": "Искусство"}

# Обложки первых записей: настоящее фото автора и стеклянный плеер (стиль «автор с плеером»).
# Собраны скриптом из фото obo-mne/andrej-mejster.jpg / креатива РСЯ, не генерацией лица.
KEYS_COVERS = [("um-obyasnitel", "Ум-объяснитель"), ("logika", "Логика"),
               ("uchitsya", "Учиться и помнить"), ("reshat", "Решать и изобретать")]

# Покупка первой записи (25.10.2026): 690 ₽, только почта, оплата через
# /api/shop/checkout (товар klyuchi-01 в order_routes.py бэкенда). Ссылку на
# запись выдаёт сервер после оплаты — на странице её нет.
BUY_HTML = (
    '<div class="buy" id="kupit-zapis">'
    '<div class="bimg"><img src="/magazin/img/klyuchi-um-big.webp" width="400" height="400" alt="Ярлык записи «Ум-объяснитель»"></div>'
    '<div><span class="kind">Запись 0.1 · 21 минута</span><h3>«Ум-объяснитель»</h3>'
    '<p class="who">Как ум ищет объяснения и чем открытие отличается от приметы: пять «двигателей» '
    'и пять вопросов-выключателей. Первая в серии — с неё остальные слушаются легче. '
    'Суггестивная техника с двойным наведением: два голоса, по одному в каждом ухе, — слушать в наушниках.</p>'
    '<div class="listen"><b>Послушать отрывок — 46 секунд</b><small>Кухня, мокрая бутылка и проверка, которую Лёва придумал сам</small>'
    '<audio controls preload="none" src="/magazin/audio/klyuchi-um-otryvok.mp3"></audio></div>'
    '<div class="price">690 ₽ <small>· ссылка сразу после оплаты</small></div>'
    '<form class="bf" novalidate>'
    '<input type="email" name="email" required autocomplete="email" placeholder="Почта — на неё придут чек и ссылка" aria-label="Почта">'
    '<input type="text" name="fio" autocomplete="name" placeholder="Имя (необязательно)" aria-label="Имя">'
    '<input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">'
    '<label class="agree"><input type="checkbox" name="agree" required><span>Принимаю '
    '<a href="/oferta/">оферту</a> и <a href="/politika-konfidencialnosti/">политику конфиденциальности</a></span></label>'
    '<button class="btn btn-buy" type="submit">Купить за 690 ₽</button>'
    '<p class="berr" role="alert"></p></form></div></div>\n')

# Кто продаёт: в трёх визитах фокус-группы «нет лица» — главный повод не верить.
# Факты — со страницы /obo-mne/.
AUTHOR_HTML = (
    '<aside class="author"><img src="/obo-mne/andrey-meyster-portret.jpg" width="480" height="480" '
    'alt="Андрей Мейстер" loading="lazy"><div><b>Андрей Мейстер</b>'
    '<p>Кандидат наук по психологии, когнитивный тренер. Автор «Теории манипуляции», «Вариатики» '
    'и виртуального психолога Фреди. Пишу о психологии с 2008 года.</p>'
    '<a href="/obo-mne/">Об авторе →</a></div></aside>')

BUY_JS = r"""
(function(){var au=document.querySelector('.listen audio');
if(au)au.addEventListener('play',function(){try{ym(108138656,'reachGoal','klyuchi_preview_play')}catch(x){}},{once:true});
var f=document.querySelector('.bf');if(!f)return;
var err=f.querySelector('.berr'),btn=f.querySelector('button');
f.addEventListener('submit',function(e){e.preventDefault();err.textContent='';
  var email=f.email.value.trim();
  if(!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email)){err.textContent='Проверьте почту — на неё придут чек и ссылка.';return;}
  if(!f.agree.checked){err.textContent='Отметьте, что принимаете оферту.';return;}
  btn.disabled=true;btn.textContent='Открываем оплату…';
  try{ym(108138656,'reachGoal','klyuchi_buy_click')}catch(x){}
  fetch('/api/shop/checkout',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({product:'klyuchi-01',email:email,fio:f.fio.value.trim(),website:f.website.value})})
  .then(function(r){return r.json()}).then(function(d){
    if(d&&d.confirmation_url){location.href=d.confirmation_url;return;}
    btn.disabled=false;btn.textContent='Купить за 690 ₽';
    err.textContent=(d&&(d.message||d.error))||'Оплата сейчас не открылась. Попробуйте ещё раз через минуту.';})
  .catch(function(){btn.disabled=false;btn.textContent='Купить за 690 ₽';
    err.textContent='Нет связи с сервером. Попробуйте ещё раз через минуту.';});});
})();
"""

FAQ = [
    ("Как оплатить и получить заказ?",
     "Товар оплачиваете картой на сайте — через ЮKassa, чек приходит на почту. Доставку СДЭК "
     "оплачиваете при получении в пункте выдачи, по тарифу СДЭК. После отправки на почту "
     "приходит трек-номер. Записи «Ключей» приходят ссылкой сразу после оплаты."),
    ("С чего начать, если не знаю, что выбрать?",
     'Откройте <a href="#vybor" data-go="vybor">«Подобрать под задачу»</a> и найдите строку про '
     'себя — бесплатное там стоит первым. Лекторий открыт целиком и без регистрации.'),
    ("Можно ли вернуть пакет «Стандартный»?",
     'Да, в течение семи дней после получения, если товар не был в употреблении. Условия — '
     'в <a href="/oferta/">оферте</a>.'),
    ("Как устроена покупка записи «Ключей»?",
     "Оставляете почту и оплачиваете 690 ₽ картой. Сразу после оплаты на странице и в письме "
     "появляется ссылка на прослушивание — с телефона или компьютера. Ссылка личная, "
     "пожалуйста, не пересылайте её."),
    ("Когда выйдут остальные «Ключи»?",
     "Серия выходит по одной записи. Первая, «Ум-объяснитель», уже продаётся. На остальные 46 "
     "можно оформить предзаказ — 690 ₽. Срок выхода — " + KEYS_DUE + ": ссылка придёт на почту "
     "в день выхода записи, делать ничего не нужно. О выходе новых записей — в Telegram-канале."),
]

CSS = """
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-cyrillic.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212}
:root{--bg:#f5f6f8;--card:#fff;--card2:#eef1f5;--line:rgba(15,23,42,.11);--text:#15181d;--muted:#4a5260;--faint:#667085;--accent:#1f6fe5;--accent2:#00b4ff;--kind:#1d5fd1;--tint:#eef4ff;--input:#fff;--warn:#8a5a00;--warnbg:rgba(255,190,60,.18);--err:#c62828;--hero:#0f1115;--hero-text:#f0f2f5;--hero-muted:#b9c0ca}
[data-theme=dark]{--bg:#121417;--card:#1a1d22;--card2:#20242a;--line:rgba(255,255,255,.09);--text:#e6e9ee;--muted:#b4bac3;--faint:#8e96a1;--accent:#3A86FF;--kind:#9cc2ff;--tint:#101828;--input:#101215;--warn:#ffd27a;--warnbg:rgba(255,190,60,.12);--err:#ff8a8a;--hero:#0c0d10}
/* полоса-герой сверху всегда тёмная: характер бренда, как на главной */
.hero{background:var(--hero);color:var(--hero-text);padding:0 0 22px;margin-bottom:6px}
.hero .crumbs,.hero .crumbs a{color:#9aa3ae}.hero .lead{color:var(--hero-muted)}.hero h1{color:#fff}
.hero .wrap{position:relative}
.theme-btn{position:absolute;right:16px;top:14px;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center}
.theme-btn:hover{border-color:#3A86FF}.theme-btn .moon{display:inline}.theme-btn .sun{display:none}
[data-theme=dark] .theme-btn .moon{display:none}[data-theme=dark] .theme-btn .sun{display:inline}
.hero h1{padding-right:52px}
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
.cat small{color:var(--muted);font-size:.78rem;line-height:1.3}
.q{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;border:1px solid var(--line);background:var(--card2);color:var(--muted);font:italic 700 .9rem/1 Georgia,'Times New Roman',serif;cursor:pointer;display:flex;align-items:center;justify-content:center}
.q:hover,.q[aria-expanded="true"]{border-color:var(--accent);color:var(--accent)}
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
.th{width:84px;height:84px;border-radius:10px;background:var(--card2);overflow:hidden;display:flex;align-items:center;justify-content:center}
.th img{width:100%;height:100%;object-fit:cover}
.th .emo{font-size:2.2rem}
.tx{display:flex;flex-direction:column;gap:4px;min-width:0}
.kind{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--kind)}
.price{font-weight:650;font-size:.98rem}
.price small{font-weight:400;color:var(--muted);font-size:.86rem}
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
.btn-buy{background:linear-gradient(135deg,#0a6fd6,#2f6fe0);color:#fff}
.btn-more{border:1px solid var(--accent);color:var(--text)}
.btn:hover{text-decoration:none;filter:brightness(1.1)}
.free ul,.keys ol{list-style:none;display:grid;gap:8px}
.free li,.keys li{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;color:var(--muted);font-size:.92rem}
.free li b,.keys li b{color:var(--text);font-weight:600}
.keys li b{display:block}
.covers{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0 14px}
.covers img{width:100%;height:auto;border-radius:12px;display:block;border:1px solid var(--line)}
@media(max-width:560px){.covers{grid-template-columns:1fr 1fr}}
.recs-h{font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin:16px 0 8px}
.recs{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
.rec{display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px 10px 6px 6px}
.rec img{width:52px;height:52px;border-radius:9px;object-fit:cover;display:block}
.rec b{display:block;color:var(--text);font-weight:600;font-size:.9rem;line-height:1.25}
.rec b i{font-style:normal;color:var(--kind);font-weight:600;margin-right:4px}
.rec small{display:block;color:var(--faint);font-size:.78rem;line-height:1.3;margin-top:2px}
.rec .teach{color:var(--muted);margin-top:4px}
.rb{display:inline-flex;align-items:center;min-height:32px;margin-top:6px;padding:4px 12px;border-radius:16px;font-size:.8rem;font-weight:600;color:#fff;background:linear-gradient(135deg,#0a6fd6,#2f6fe0)}
.rb.pre{background:none;border:1px solid var(--accent);color:var(--kind)}
.rb:hover{text-decoration:none;filter:brightness(1.15)}
.rec{align-items:start}
.rec em{font-style:normal;font-size:.7rem;color:var(--warn);margin-left:4px}
.status{display:inline-block;background:var(--warnbg);color:var(--warn);border-radius:12px;padding:3px 10px;font-size:.8rem}
.keys p{color:var(--muted);font-size:.95rem;margin-bottom:10px;max-width:760px}
.kt-cta{display:grid;gap:4px;margin:12px 0 4px;padding:14px 16px;border-radius:14px;background:linear-gradient(135deg,rgba(58,134,255,.10),rgba(123,47,247,.08));border:1px solid rgba(123,47,247,.35);color:var(--text);text-decoration:none}
.kt-cta:hover{text-decoration:none;border-color:#7B2FF7}
.kt-cta span{color:var(--muted);font-size:.92rem}
.kt-cta i{font-style:normal;font-weight:600;color:#7B2FF7}
.note{font-size:.85rem;color:var(--faint)}
table.pick{width:100%;border-collapse:collapse;font-size:.93rem}
table.pick td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top;color:var(--muted)}
table.pick td:first-child{color:var(--text);width:46%}
.top{margin:14px 0 4px}
.top-h{font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin-bottom:8px}
.faq{padding:30px 0 40px;border-top:1px solid var(--line);margin-top:26px}
.faq h3{margin:16px 0 4px}
.faq p{color:var(--muted);font-size:.95rem}
@media(min-width:900px){.cats{grid-template-columns:repeat(4,1fr)}.cats .cat:nth-child(7){grid-column:span 2}}
.legend{font-size:.82rem;color:var(--faint);margin:10px 0 0}
.buy{display:grid;grid-template-columns:150px 1fr;gap:16px;background:var(--card);border:1px solid rgba(58,134,255,.6);border-radius:14px;padding:14px;margin:6px 0 16px}
.bimg img{width:150px;height:150px;border-radius:12px;object-fit:cover;display:block}
.listen{display:grid;gap:3px;background:var(--tint);border:1px solid rgba(58,134,255,.35);border-radius:12px;padding:10px 12px;margin:8px 0}
.listen b{font-size:.92rem}.listen small{color:var(--muted);font-size:.82rem}
.listen audio{width:100%;height:40px;margin-top:4px}
.cancel{font-size:.86rem;color:var(--muted);border-left:2px solid var(--accent);padding-left:8px}
.toprow{display:grid;gap:12px}
.author{align-self:start;display:grid;grid-template-columns:84px 1fr;gap:12px;align-items:start;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px}
.author img{width:84px;height:84px;border-radius:50%;object-fit:cover}
.author b{display:block;font-size:1rem}.author p{color:var(--muted);font-size:.88rem;margin:2px 0 4px}
.author a{font-size:.88rem}
@media(min-width:900px){.toprow{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}.top .list{grid-template-columns:1fr}}
@media(max-width:899px){.cats .cat:nth-child(7){grid-column:1/-1}}
.q::after{content:'';position:absolute;inset:-10px}
.bf .agree input{width:20px;height:20px;flex:none}
.buy h3{font-size:1.15rem;margin:2px 0 4px}
.buy .who{margin-bottom:6px}
.bf{display:grid;gap:8px;margin-top:8px;max-width:440px}
.bf input[type=email],.bf input[type=text]{width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--input);color:var(--text);font:inherit}
.bf input:focus{outline:none;border-color:var(--accent)}
.bf .hp{position:absolute;left:-9999px;width:1px;height:1px}
.bf .agree{font-size:.82rem;color:var(--muted);display:flex;gap:8px;align-items:flex-start}
.bf .agree input{margin-top:3px;accent-color:#3A86FF}
.bf .btn{border:0;cursor:pointer;font:inherit;font-weight:600;min-height:44px}
.bf .btn:disabled{opacity:.6;cursor:default}
.berr{color:var(--err);font-size:.88rem;min-height:1.1em}
@media(max-width:560px){.buy{grid-template-columns:1fr}}
details.all{margin-top:12px}
details.all>summary{font-size:.95rem;padding:10px 0}
@media(max-width:560px){table.pick,table.pick tbody,table.pick tr,table.pick td{display:block;width:auto}table.pick tr{border-bottom:1px solid var(--line);padding:10px 0}table.pick td{border:0;padding:2px 0}table.pick td:first-child{width:auto;font-weight:600}}
@media(max-width:560px){.cats{grid-template-columns:1fr 1fr;gap:8px}.cat{grid-template-columns:40px 1fr;gap:8px;min-height:58px}.cat .ic{width:40px;height:40px}.cat b{font-size:.86rem}.list{grid-template-columns:1fr}.it{grid-template-columns:72px 1fr}.th{width:72px;height:72px}}
"""

JS = r"""
(function(){
document.documentElement.classList.add('js');
var cats=document.querySelectorAll('.cat'),shelves=document.querySelectorAll('.shelf');
function closeTips(){document.querySelectorAll('.q').forEach(function(o){o.setAttribute('aria-expanded','false')});
  document.querySelectorAll('.tip').forEach(function(o){o.classList.remove('on')});}
function show(k,scroll){
  closeTips();
  cats.forEach(function(c){c.classList.toggle('on',c.dataset.cat===k);c.setAttribute('aria-pressed',c.dataset.cat===k)});
  shelves.forEach(function(s){s.classList.toggle('on',s.id===k)});
  var top=document.getElementById('top');if(top)top.style.display=k?'none':'';
  /* query (utm_*, yclid) не трогаем: Метрика читает его позже, чем срабатывает этот код */
  if(k){try{history.replaceState(null,'',location.pathname+location.search+'#'+k)}catch(e){}
    if(scroll){var s=document.getElementById(k);if(s)s.scrollIntoView({behavior:'smooth',block:'start'})}
    try{ym(108138656,'params',{shop_cat:k})}catch(e){}}
  else{try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}
}
cats.forEach(function(c){c.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&!e.target.closest('.q')){e.preventDefault();c.click();}});});
cats.forEach(function(c){c.addEventListener('click',function(e){
  if(e.target.closest('.q'))return;
  show(c.classList.contains('on')?'':c.dataset.cat,true);})});
document.querySelectorAll('.q').forEach(function(q){q.addEventListener('click',function(e){
  e.stopPropagation();var t=document.getElementById(q.getAttribute('aria-controls')),open=q.getAttribute('aria-expanded')==='true';
  closeTips();
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


def card(p, open_gain=False):
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
            '  <p class="who"><b>Кому:</b> %s</p>\n%s'
            '  <details%s><summary>Что даст</summary><p>%s</p></details>\n'
            '  <div class="btns">%s</div>\n </div>\n</article>' % (
                " main" if p.get("main") else "", p["id"], th, p["kind"], p["name"], price,
                p["who"], ('  <p class="cancel">%s</p>\n' % p["cancel"]) if p.get("cancel") else "", " open" if open_gain else "", p["gain"], btns))


def shelf(key, title, lead, body, extra=""):
    return ('<section class="shelf" id="%s" aria-label="%s">\n<div class="shelf-h"><h2>%s</h2>'
            '<button class="back" type="button">← Все категории</button></div>\n%s%s\n%s</section>' % (
                key, esc(title), title, ('<p class="shelf-lead">%s</p>\n' % lead) if lead else "",
                body, extra))


def recs_html():
    out, cur = [], None
    for i, (num, title, grows, node) in enumerate(KEYS_ALL, 1):
        blk = num.split(".")[0]
        if blk != cur:
            if cur is not None:
                out.append("</div>")
            if cur == "0":
                # Первый блок виден, остальные 43 — по нажатию: на телефоне список занимал пять экранов.
                out.append('<details class="all"><summary>Вся программа — %d %s · предзаказ по 690 ₽</summary>' % (
                    len(KEYS_ALL), count_word(len(KEYS_ALL), ("запись", "записи", "записей"))))
            out.append('<div class="recs-h">%s. %s</div><div class="recs">' % (blk, KEY_BLOCKS[blk]))
            cur = blk
        if i == 1:
            mark, more = "<em>в продаже · 690 ₽</em>", ('<a class="rb" href="#kupit-zapis">Купить · 690 ₽</a>')
        else:
            f, k = KEYS_TEACH[num]
            mark = ""
            more = ('<small class="teach">Учит замечать: %s. Ключевая идея: %s</small>'
                    '<a class="rb pre" href="/magazin/zakaz/?t=klyuchi-%s">Предзаказ · 690 ₽</a>' % (
                        html.escape(f), html.escape(k), num.replace(".", "-")))
        out.append('<div class="rec" id="k-%s"><img src="/magazin/img/k/%02d.webp" width="52" height="52" '
                   'loading="lazy" alt=""><div><b><i>%s</i>%s%s%s</b><small>→ %s</small>%s</div></div>' % (
                       num.replace(".", "-"), i, num, html.escape(title), " ◆" if node else "", mark,
                       html.escape(grows), more))
    out.append("</div></details>")
    out.append('<p class="legend">◆ — запись-узел: собирает в одно несколько предыдущих.</p>')
    return "\n".join(out)


def build():
    counts = {k: sum(1 for p in PRODUCTS if p["cat"] == k) for k, *_ in CATS}
    sub = {"besplatno": "%d %s" % (len(FREE), count_word(len(FREE), ("способ", "способа", "способов"))),
           "vybor": "%d %s" % (len(PICK), count_word(len(PICK), ("ситуация", "ситуации", "ситуаций"))),
           "fredi": "программа-собеседник",
           "klyuchi": "аудио, 690 ₽"}
    forms = ("товар", "товара", "товаров")
    tiles, tips = [], []
    for k, label, ic, tip in CATS:
        small = sub.get(k) or "%d %s" % (counts[k], count_word(counts[k], forms))
        tiles.append(
            '<div class="cat" role="button" tabindex="0" data-cat="%s" aria-pressed="false">'
            '<img class="ic" src="/magazin/img/cat-%s.webp" width="52" height="52" alt="" loading="lazy">'
            '<span class="t"><b>%s</b><small>%s</small></span>'
            '<button class="q" type="button" aria-label="Что в категории «%s»" aria-expanded="false" '
            'aria-controls="tip-%s">i</button></div>' % (k, k, label, small, esc(label), k))
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
        shelf("fredi", "Фреди — программа-собеседник", "",
              '<div class="list">%s</div>' % by("fredi")),
        shelf("klyuchi", "Аудиосерия «Ключи» — фундамент предметов", "",
              '<div class="keys"><span class="status">первая запись — в продаже · остальные 46 — предзаказ по 690 ₽, выход ' + KEYS_DUE + '</span>\n'
              '<a class="kt-cta" href="/testy/klyuchi-karta-probelov/" onclick="try{ym(108138656,\'reachGoal\',\'klyuchi_test_from_shop\')}catch(e){}">'
              '<b>С какой записи начать?</b><span>Тест «Карта пробелов»: 22 бытовые ситуации, 5–7 минут. Покажет, каких понятий '
              'вам не хватает, к чему это ведёт и какие записи закрывают пробел.</span><i>Пройти тест →</i></a>\n'
              '<p style="margin-top:10px">Вспомните предмет, который в школе так и не дался: формулы были, а понимания — нет. '
              'Обычно дело не в способностях. Не хватило каркаса — нескольких идей, из которых остальное выводится само, — '
              'и привычки смотреть на предмет под нужным углом.</p>\n'
              + BUY_HTML +
              '<p>«Ключи» — 47 аудиозаписей по 15–20 минут, по одной на предмет: логика, математика, физика, химия, биология, '
              'информатика, язык, литература, история, экономика, музыка и другие. В каждой — история героя, который сам '
              'открывает закон, настройка внимания под этот предмет, порядок мышления и четыре-шесть ключевых идей.</p>\n'
              '<p><b style="color:var(--text)">Кому:</b> взрослым, которые хотят наконец понять «свою нелюбимую» науку, и '
              'родителям, которые хотят дать записи старшекласснику перед новой темой, — с 16 лет. Детских записей нет: '
              'ребёнку младше — бесплатный курс <a href="/blog/lektorij/kak-uchitsya/">«Как учиться»</a>, прочитайте сами и перескажите.</p>\n'
              '<p><b style="color:var(--text)">Как это устроено:</b> «Ключи» — суггестивная техника с двойным '
              'наведением. В наушниках два голоса: в одном ухе — история героя, в другом — голос, который ведёт '
              'ваше внимание; местами они звучат вместе. Пока вы следите за историей, второй голос направляет '
              'внимание на то, что в предмете главное. Первые минуты — расслабление, как перед сном: голос предлагает закрыть глаза '
              'и замедлить дыхание. Вы всё слышите и можете остановить запись в любой момент. Дальше — история и '
              'загадки, на которые вы отвечаете про себя.</p>\n'
              '<p><b style="color:var(--text)">Цена и формат:</b> 690 ₽ за запись. После оплаты на почту и на страницу '
              'приходит личная ссылка на прослушивание — с телефона или компьютера.</p>\n'
              '<p><b style="color:var(--text)">Что даст — честно:</b> запись не «загружает» предмет. Она ставит каркас и привычку '
              'внимания, на которые дальше ложится практика.</p>\n'
              '%s\n'
              '<p class="note" style="margin-top:10px">Записи слушают в наушниках, в расслабленном состоянии. Не за рулём; при '
              'эпилепсии и серьёзных психических расстройствах — после консультации с врачом.</p>\n'
              '<p class="note">О выходе новых записей — в <a href="https://t.me/meysternlp" target="_blank" '
              'rel="noopener">Telegram-канале</a>.</p></div>' % (
                  recs_html(),)),
        shelf("vybor", "Подобрать под задачу", "Начните с того, что мешает сейчас, а не с того, что кажется самым полным.",
              '<table class="pick">%s</table>' % "".join(
                  '<tr><td>%s</td><td>%s</td></tr>' % r for r in PICK)),
    ]

    top = [p for p in PRODUCTS if p.get("main")]
    top_html = ('<div class="top" id="top"><div class="top-h">Главное сейчас</div>'
                '<div class="toprow"><div class="list">%s</div>%s</div></div>' % (
                    "\n".join(card(dict(p, id=p["id"] + "-top"), open_gain=True) for p in top), AUTHOR_HTML))

    faq = '<section class="faq" id="voprosy"><h2>❓ Частые вопросы</h2>%s</section>' % "".join(
        '<h3>%s</h3><p>%s</p>' % qa for qa in FAQ)

    items = []
    for i, p in enumerate(PRODUCTS, 1):
        url = next((u for t, u, m in p["btns"] if not u.startswith("http")), p["btns"][0][1])
        items.append({"@type": "ListItem", "position": i, "name": p["name"],
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
<script src="/theme.js"></script>
<style>%(css)s</style>
<script type="text/javascript">
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=108138656','ym');
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

<div class="hero"><div class="wrap">
<div class="crumbs"><a href="/">Главная</a> / Магазин</div>
<button class="theme-btn" type="button" aria-label="Переключить тему" aria-pressed="false"><span class="moon">☾</span><span class="sun">☀</span></button>
<h1>Магазин</h1>
<p class="lead">Курсы, книги, игры, Фреди и аудиозаписи — у каждой вещи сказано, кому она и что вы будете уметь после. Выберите категорию; кнопка «i» объяснит, что внутри.</p>
</div></div>
<main class="wrap">
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
           cats=cats_html, top=top_html, shelves="\n".join(shelves), faq=faq, js=JS + BUY_JS)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(page)
    print("записано: magazin/index.html — категорий %d, товаров %d" % (len(CATS), len(PRODUCTS)))
    order_pages(nav, loader)


def order_catalog():
    """Что можно заказать на /magazin/zakaz/?t=<id>: ключи — как в PRODUCTS
    бэкенда (Frederick, order_routes.py). Печатное — с доставкой СДЭК,
    PDF — цифровое (только почта, ссылка после оплаты)."""
    cat = {}
    for p in PRODUCTS:
        if p.get("pdf_only"):
            cat[p["id"] + "-pdf"] = {"name": p["name"], "img": p.get("img") or "", "digital": True,
                                     "amount": int(p["price"].replace(" ", "").replace("₽", "")),
                                     "kind": p.get("pdf_kind", "Книга · PDF"), "preorder": True}
            continue
        if not any(u == "/magazin/zakaz/?t=" + p["id"] for _t, u, _m in p["btns"]):
            continue
        amount = int(p["price"].replace(" ", "").replace("₽", ""))
        cat[p["id"]] = {"name": p["name"], "amount": amount, "img": p.get("img") or "", "digital": False,
                        "kind": p["kind"] + (" · печатная" if p.get("pdf") else "")}
        if p.get("pdf"):
            cat[p["id"] + "-pdf"] = {"name": p["name"], "amount": 690, "img": p.get("img") or "",
                                     "digital": True, "kind": "Книга · PDF"}
    for i, (num, title, grows, node) in enumerate(KEYS_ALL, 1):
        if i == 1:
            continue
        f, k = KEYS_TEACH[num]
        cat["klyuchi-" + num.replace(".", "-")] = {
            "name": "«Ключи». Запись %s «%s»" % (num, title), "amount": 690,
            "img": "/magazin/img/k/%02d.webp" % i, "digital": True, "preorder": True,
            "kind": "Аудиозапись · предзаказ",
            "note": "· предзаказ, выход " + KEYS_DUE + ": ссылка придёт на почту в день выхода",
            "desc": "Учит замечать: %s. Ключевая идея: %s" % (f, k)}
    return cat


ORDER_CSS = """
.ord{display:grid;grid-template-columns:120px 1fr;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px;margin:14px 0}
.ord img{width:120px;height:120px;object-fit:cover;border-radius:10px;background:var(--card2)}
.ord .price{font-size:1.2rem}
.of{display:grid;gap:10px;max-width:560px;margin:10px 0 40px}
.of label{font-size:.85rem;color:var(--muted);display:grid;gap:4px}
.of input,.of textarea{width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--input);color:var(--text);font:inherit}
.of input:focus,.of textarea:focus{outline:none;border-color:var(--accent)}
.of .hp{position:absolute;left:-9999px;width:1px;height:1px}
.of .agree{display:flex;gap:8px;align-items:flex-start;font-size:.85rem}
.of .agree input{width:20px;height:20px;flex:none;margin-top:2px;accent-color:#3A86FF}
.of .btn{border:0;cursor:pointer;font:inherit;font-weight:600;min-height:48px;font-size:1rem}
.of .btn:disabled{opacity:.6;cursor:default}
.oerr{color:var(--err);font-size:.9rem;min-height:1.1em}
.ship{background:var(--tint);border:1px solid rgba(58,134,255,.35);border-radius:12px;padding:10px 12px;font-size:.9rem;color:var(--muted)}
@media(max-width:560px){.ord{grid-template-columns:84px 1fr}.ord img{width:84px;height:84px}}
"""

ORDER_JS = r"""
(function(){
var C=window.ORDER_CATALOG||{},t=new URLSearchParams(location.search).get('t')||'',p=C[t];
var box=document.getElementById('ord'),f=document.getElementById('of'),phys=document.querySelectorAll('.phys');
if(!p){box.innerHTML='<p>Товар не найден. <a href="/magazin/">Вернуться в магазин</a></p>';f.hidden=true;return;}
document.title='Заказ: '+p.name+' | Андрей Мейстер';
box.innerHTML='<img alt="" src="'+p.img+'"><div><span class="kind">'+p.kind+'</span><h2 style="font-size:1.15rem;margin:4px 0"></h2>'
 +'<div class="price">'+p.amount.toLocaleString('ru-RU')+' ₽ <small>'+(p.note?p.note:p.preorder?'· предзаказ: PDF придёт на почту, когда книга будет готова':p.digital?'· ссылка на почту сразу после оплаты':'+ доставка СДЭК — оплачивается при получении')+'</small></div></div>';
box.querySelector('h2').textContent=p.name;
if(p.desc){var ds=document.createElement('p');ds.className='who';ds.textContent=p.desc;box.lastChild.appendChild(ds);}
phys.forEach(function(el){el.hidden=p.digital});
var btn=f.querySelector('button'),err=f.querySelector('.oerr');
btn.textContent='Оплатить '+p.amount.toLocaleString('ru-RU')+' ₽';
try{ym(108138656,'reachGoal','shop_order_open',{shop_product:t})}catch(x){}
f.addEventListener('submit',function(e){e.preventDefault();err.textContent='';
  var v=function(n){return (f[n]&&f[n].value||'').trim()};
  if(!p.digital){
    if(v('fio').split(/\s+/).length<2){err.textContent='Укажите фамилию, имя и отчество — так СДЭК выдаст посылку.';return;}
    if(v('phone').replace(/\D/g,'').length<10){err.textContent='Проверьте телефон.';return;}
    if(v('pvz').length<8){err.textContent='Укажите адрес пункта выдачи СДЭК.';return;}}
  if(!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(v('email'))){err.textContent='Проверьте почту — на неё придёт чек'+(p.digital?' и ссылка':'')+'.';return;}
  if(!f.agree.checked){err.textContent='Отметьте, что принимаете оферту.';return;}
  btn.disabled=true;var lbl=btn.textContent;btn.textContent='Открываем оплату…';
  try{ym(108138656,'reachGoal','shop_pay_click',{shop_product:t})}catch(x){}
  fetch('/api/shop/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:t,
    fio:v('fio'),phone:v('phone'),email:v('email'),city:v('city'),pvz:v('pvz'),comment:v('comment'),website:v('website')})})
  .then(function(r){return r.json()}).then(function(d){
    if(d&&d.confirmation_url){location.href=d.confirmation_url;return;}
    if(d&&d.manual){f.innerHTML='<p><b>Заказ принят.</b> '+(d.message||'')+'</p><p>Номер заказа: '+(d.order_no||'')+'</p>';return;}
    btn.disabled=false;btn.textContent=lbl;err.textContent=(d&&d.error)||'Оплата сейчас не открылась. Попробуйте ещё раз через минуту.';})
  .catch(function(){btn.disabled=false;btn.textContent=lbl;err.textContent='Нет связи с сервером. Попробуйте ещё раз через минуту.';});});
})();
"""

THANKS_JS = r"""
(function(){
var order=(new URLSearchParams(location.search).get('order')||'').trim(),tries=0;
var T=document.getElementById('tTitle'),X=document.getElementById('tText'),N=document.getElementById('tNote'),L=document.getElementById('tListen');
if(order)document.getElementById('tOrder').textContent='Номер заказа: '+order;
function paid(d){T.textContent='Оплачено. Спасибо!';N.hidden=false;
  if(d.digital){
    if(d.link){X.textContent='Ссылка — ниже и в письме на вашу почту.';var a=document.getElementById('tLink');a.href=d.link;L.hidden=false;
      N.textContent='Ссылка личная — пожалуйста, не пересылайте её.';}
    else if(d.preorder){X.textContent='Предзаказ оформлен. Ссылка придёт на вашу почту, как только всё будет готово, — ничего делать не нужно.';N.textContent='Чек уже на почте. Если письма нет — проверьте «Спам».';}
    else{X.textContent='Оплата прошла. Ссылку пришлю на вашу почту в течение дня.';N.textContent='Если письма нет — проверьте «Спам» или ответьте на письмо с чеком.';}
  }else{X.textContent='Заказ у меня. Соберу посылку и отправлю СДЭК в указанный пункт выдачи — трек-номер придёт на почту.';
    N.textContent='Доставку вы оплачиваете сами при получении в пункте выдачи, по тарифу СДЭК. Если в адресе ошибка — ответьте на письмо с подтверждением, пока посылка не уехала.';}
  try{ym(108138656,'reachGoal','shop_paid')}catch(e){}}
function fail(m){T.textContent='Оплата не подтвердилась';X.textContent=m;N.hidden=false;
  N.innerHTML='Деньги по незавершённому платежу не списываются. Можно <a href="/magazin/">вернуться в магазин</a> и оформить заказ заново. Если платёж прошёл, а страница этого не видит — напишите, разберусь вручную.';}
if(!order){fail('Не вижу номера заказа в адресе страницы.');return;}
(function check(){tries++;
  fetch('/api/shop/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_no:order})})
  .then(function(r){return r.json()}).then(function(d){
    if(d&&d.paid){paid(d);return;}
    if(tries>=10){fail('Банк ещё не подтвердил платёж. Если вы его завершили, подождите пару минут и обновите страницу.');return;}
    setTimeout(check,3000);})
  .catch(function(){if(tries>=10){fail('Не удалось связаться с сервером.');return;}setTimeout(check,3000);});})();
})();
"""


def order_pages(nav, loader):
    """/magazin/zakaz/ — заказ любого товара магазина; /magazin/spasibo/ — после оплаты."""
    head = ('<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n'
            '<meta name="robots" content="noindex, follow">\n<title>@TITLE@ | Андрей Мейстер</title>\n'
            '<meta name="description" content="@DESC@">\n<link rel="canonical" href="https://meysternlp.ru/magazin/">\n'
            '<link rel="icon" href="/favicon.ico">\n<!-- Собрано tools/build_magazin.py — правки там, не здесь. -->\n'
            '<script src="/theme.js"></script>\n<style>' + CSS + ORDER_CSS + '</style>\n'
            '<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();'
            'k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})'
            '(window,document,"script","https://mc.yandex.ru/metrika/tag.js?id=108138656","ym");'
            'ym(108138656,"init",{ssr:true,webvisor:true,clickmap:true,accurateTrackBounce:true,trackLinks:true});</script>\n'
            '</head>\n<body>\n' + nav + "\n" + loader % ("header", "header") + "\n")
    foot = ('<div id="footer-placeholder"></div>\n' + loader % ("footer", "footer") + "\n")
    page_head = lambda t, d: head.replace("@TITLE@", t).replace("@DESC@", d)
    zakaz = (page_head("Заказ", "Оформление заказа в магазине Андрея Мейстера.") +
        '<div class="hero"><div class="wrap">\n<div class="crumbs"><a href="/">Главная</a> / <a href="/magazin/">Магазин</a> / Заказ</div>\n<button class=\"theme-btn\" type=\"button\" aria-label=\"Переключить тему\" aria-pressed=\"false\"><span class=\"moon\">☾</span><span class=\"sun\">☀</span></button>\n'
        '<h1>Оформление заказа</h1>\n</div></div>\n<main class="wrap">\n<div id="ord" class="ord"></div>\n'
        '<form id="of" class="of" novalidate>\n'
        '<p class="ship phys">Товар оплачиваете сейчас, картой через ЮKassa. Доставку СДЭК — сами, при получении в пункте выдачи, '
        'по тарифу СДЭК. Ближайший пункт — на <a href="https://www.cdek.ru/ru/offices" target="_blank" rel="noopener">карте СДЭК</a>.</p>\n'
        '<label class="phys">ФИО получателя<input name="fio" autocomplete="name" maxlength="200" placeholder="Иванов Иван Иванович"></label>\n'
        '<label class="phys">Телефон<input name="phone" type="tel" autocomplete="tel" maxlength="32" placeholder="+7 900 000-00-00"></label>\n'
        '<label>Почта — на неё придёт чек<input name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@mail.ru"></label>\n'
        '<label class="phys">Город<input name="city" autocomplete="address-level2" maxlength="200" placeholder="Ростов-на-Дону"></label>\n'
        '<label class="phys">Адрес пункта выдачи СДЭК<textarea name="pvz" rows="2" maxlength="500" placeholder="ул. Большая Садовая, 15, ПВЗ СДЭК"></textarea></label>\n'
        '<label class="phys">Комментарий (необязательно)<textarea name="comment" rows="2" maxlength="1000"></textarea></label>\n'
        '<input name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">\n'
        '<label class="agree"><input type="checkbox" name="agree"><span>Принимаю <a href="/oferta/">оферту</a> и '
        '<a href="/politika-konfidencialnosti/">политику конфиденциальности</a></span></label>\n'
        '<button class="btn btn-buy" type="submit">Оплатить</button>\n<p class="oerr" role="alert"></p>\n</form>\n</main>\n'
        + foot + '<script>window.ORDER_CATALOG=' + json.dumps(order_catalog(), ensure_ascii=False) + ';' + ORDER_JS + '</script>\n</body>\n</html>\n')
    spasibo = (page_head("Оплата заказа", "Статус оплаты заказа в магазине Андрея Мейстера.") +
        '<div class="hero"><div class="wrap">\n<div class="crumbs"><a href="/">Главная</a> / <a href="/magazin/">Магазин</a> / Оплата</div>\n<button class=\"theme-btn\" type=\"button\" aria-label=\"Переключить тему\" aria-pressed=\"false\"><span class=\"moon\">☾</span><span class=\"sun\">☀</span></button>\n'
        '<h1 id="tTitle">Проверяем оплату…</h1>\n</div></div>\n<main class="wrap">\n<p class="lead" id="tText">Это занимает несколько секунд. Страницу закрывать не нужно.</p>\n'
        '<p class="note" id="tOrder"></p>\n'
        '<p id="tListen" hidden><a class="btn btn-buy" id="tLink" href="#" target="_blank" rel="noopener">Открыть</a></p>\n'
        '<p class="ship" id="tNote" hidden></p>\n<p style="margin:26px 0 50px"><a href="/magazin/">← В магазин</a></p>\n</main>\n'
        + foot + '<script>' + THANKS_JS + '</script>\n</body>\n</html>\n')
    for path, html_ in (("zakaz", zakaz), ("spasibo", spasibo)):
        d = os.path.join(ROOT, "magazin", path)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(html_)
    print("записано: magazin/zakaz/, magazin/spasibo/ — товаров к заказу %d" % len(order_catalog()))


if __name__ == "__main__":
    build()
