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
     "Аудиозаписи по школьным и вузовским предметам: по записи на предмет — каркас "
     "понятий, из которого остальное выводится самому. Готовится, купить пока нельзя."),
]

OZON = "https://www.ozon.ru/product/"

# Товар: категория, якорь, вид, название, цена (или None), примечание к цене,
# кому, что даст, картинка (или значок), кнопки [(текст, адрес, главная?)].
PRODUCTS = [
    dict(cat="kursy", id="standart", kind="Курс · печатный комплект",
         name="Разговорный гипноз. Пакет «Стандартный»", price="5 900 ₽",
         note="СДЭК до пункта выдачи, возврат 7 дней", main=True,
         who="тем, кому важно, чтобы слушали и соглашались: переговоры, совещания, "
             "продажи, разговор с подростком.",
         gain="за месяц три-четыре приёма, которые срабатывают без подготовки, и умение "
              "замечать, когда их применяют к вам. Внутри: книга «Матчасть», 38 видео на "
              "год, блокнот с заданиями, игра «Маркетолог». Разбор — автор сам отвечает "
              "на ваши вопросы и разбирает ваши ситуации в закрытом Telegram-канале, ответ в "
              "течение суток. Доступ к видео и разбору — 12 месяцев, книга и блокнот остаются у вас.",
         img="/treningi/komplekt-standart.webp",
         btns=[("Заказать", "/razgovornyj-gipnoz/standart/zakaz/", True),
               ("Подробнее", "/razgovornyj-gipnoz/standart/", False)]),
    dict(cat="kursy", id="samostoyatelnyy", kind="Курс · видео",
         name="Разговорный гипноз. Пакет «Самостоятельный»", price=None, note="цена и отзывы — на Ozon",
         who="тем, кто учится сам и не нуждается в обратной связи.",
         gain="те же 38 видео с приёмами речевого воздействия — без печатного комплекта "
              "и без разбора ваших ситуаций.",
         img="/kurs1.png",
         btns=[("Купить на Ozon", OZON + "razgovornyy-gipnoz-samostoyatelnoe-obuchenie-tehnikam-nlp-dlya-primeneniya-v-realnoy-zhizni-932753267/", True),
               ("Подробнее", "/treningi/razgovornyy-gipnoz-samostoyatelnyy.html", False)]),
    dict(cat="kursy", id="komplekt", kind="Комплект · одной посылкой",
         name="Комплект «Разговорный гипноз»: тренинг, три книги, три игры", price="19 999 ₽",
         note="за всё, доставка СДЭК входит в цену",
         who="тем, кто хочет всю систему сразу: приёмы, механику и тренировку за столом.",
         gain="тренинг «Разговорный гипноз. Стандартный» (38 видеоуроков на QR-карточках), книги "
              "«Теория манипуляции», «Вариатика» и «Концептикон», игры «Вариатика» Basic, "
              "Intensive и Progressive. Оплата картой на сайте, чек и трек-номер — на почту. "
              "Разбор ситуаций с автором в описании комплекта не заявлен — если он нужен, "
              "это «Стандартный».",
         img="/images/komplekt-hero.jpg",
         btns=[("Собрать заказ", "/komplekt/", True)]),
    dict(cat="kursy", id="proryv", kind="Живой тренинг",
         name="«Прорыв» — против выученной беспомощности", price="от 2 900 ₽", note="первый этап, очно",
         who="тем, у кого «пробовал — бесполезно» стало привычкой и уговоры себя больше "
             "не работают.",
         gain="телесный опыт «я приложил усилие — и препятствие поддалось». Беспомощность "
              "снимают опытом, а не словами. Пять этапов по нарастающей, начать можно с "
              "одного — сопротивление подбирают так, чтобы вы справились. Стоп-слово в любой "
              "момент; противопоказания, цены этапов, место и даты — на странице тренинга.",
         img="/treningi/proryv-hero.jpg",
         btns=[("Этапы и запись", "/treningi/proryv.html", True)]),
    dict(cat="knigi", id="kniga-tm", kind="Книга",
         name="«Теория манипуляции. Разговорный гипноз»", price=None, note="цена и отзывы — на Ozon",
         who="тем, кто хочет понимать механику влияния — и свою, и чужую.",
         gain="транс как обычное состояние, две линии воздействия, пресуппозиции и "
              "тридцать с лишним видов внушений. 250 страниц.",
         img="/teoriya-manipulyacii.-tom-i-razgovornyj-gipnoz-andrej-mejster.png",
         btns=[("Купить на Ozon", OZON + "teoriya-manipulyatsii-razgovornyy-gipnoz-knigi-po-psihologii-nlp-2-0-meyster-andrey-yurevich-839926527/", True),
               ("О книге", "/knigi/teoriya-manipulyacii-tom-1-razgovornyj-gipnoz/", False)]),
    dict(cat="knigi", id="kniga-var", kind="Книга",
         name="«Вариатика. Библиотека человеческих паттернов»", price=None, note="цена и отзывы — на Ozon",
         who="тем, кто устал от объяснения «он просто такой», — психологам, "
             "руководителям, всем, кто работает с людьми.",
         gain="четыре базовые программы и девять уровней у каждой — понимать, почему "
              "человек повторяет один сценарий и как он переходит на другой уровень. "
              "Авторская модель, собранная из практики, а не результат исследований.",
         emo="🧩",
         btns=[("Купить на Ozon", OZON + "variatika-biblioteka-chelovecheskih-patternov-meyster-andrey-yurevich-989039765/", True),
               ("О книге", "/knigi/variatika-biblioteka-chelovecheskih-patternov/", False)]),
    dict(cat="knigi", id="kniga-konc", kind="Книга",
         name="«Концептикон. Семь линз для ясного мышления»", price=None, note="цена и отзывы — на Ozon",
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
         name="«Маркетолог»", price=None, note="цена и отзывы — на Ozon",
         who="командам продаж, тренерам, преподавателям — всем, кому нужно убеждать "
             "историей.",
         gain="один рассказывает историю по картам, другой слушает, третий по лицу "
              "слушателя видит, поймали его или нет. Учит строить истории и видеть, "
              "работают ли они.",
         img="/Маркетолог.png",
         btns=[("Купить на Ozon", OZON + "nastolnaya-kartochnaya-igra-marketolog-984307394/", True),
               ("Об игре", "/igry/marketolog.html", False)]),
    dict(cat="igry", id="var-basic", kind="Настольная игра",
         name="«Вариатика — Basic»", price=None, note="цена и отзывы — на Ozon",
         who="тем, кто хочет понимать поступки людей, а не удивляться им.",
         gain="навык разбирать чужие истории и замечать повторяющиеся сценарии — через игру.",
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
         name="«Вариатика — Progressive»", price=None, note="цена и отзывы — на Ozon",
         who="тем, кто хочет не только разбирать чужие сценарии, но и строить свои.",
         gain="умение создавать новые сценарии и превращать маловероятные хорошие исходы "
              "в реальные.",
         img="/progresive.webp",
         btns=[("Купить на Ozon", OZON + "variatika-progressive-1705906113/", True),
               ("Об игре", "/igry/variatika-progressive.html", False)]),
    dict(cat="igry", id="tri-puti", kind="Игра-задачник · 16+",
         name="«Три пути»", price="бесплатно", note="листы для печати",
         who="двоим — игроку и ведущему; тем, кто привык говорить «у меня нет выхода». "
             "Психологу — прямо на сессию.",
         gain="за минуту собрать три пути из того, что у человека уже есть. Партия — "
              "полчаса, пять партий по нарастающей.",
         img="/blog/og/avtopilot.jpg",
         btns=[("Скачать и играть", "/igry/tri-puti.html", True)]),
    dict(cat="fredi", id="fredi-sub", kind="Подписка",
         name="Фреди: разговор, тесты и тренажёры", price="690 ₽ в месяц",
         note="первые 3 дня — 69 ₽, потом 690 ₽ в месяц списываются сами; отменить можно в любой момент",
         who="тем, кому нужен собеседник, который не устаёт и не оценивает, — и тренажёр "
             "навыков на каждый день.",
         gain="бесплатно каждый день — несколько минут разговора и тесты, каждое упражнение "
              "первый раз бесплатно. По подписке — разговор без счётчика, игры-тренажёры и "
              "практики без ограничений. Отменить можно в управлении подпиской, доступ "
              "останется до конца оплаченного срока.",
         img="/magazin/img/cat-fredi.webp",
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
    ("/blog/lektorij/", "Весь Лекторий", "все курсы открыты целиком и без регистрации: отношения, дети, мышление, общение, работа."),
    ("/razgovornyj-gipnoz/urok-1/", "Первое занятие курса «Разговорный гипноз»", "13 минут, целиком."),
    ("/blog/lektorij/kak-uchitsya/", "Курс «Как учиться»", "как запоминать и понимать — себе или чтобы помочь ребёнку."),
    ("/igry/tri-puti.html", "Игра «Три пути»", "листы для печати, вдвоём за полчаса; подходит и для сессии с клиентом."),
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
     'по-разному. Отдельного курса про взрослых детей пока нет'),
    ("Ребёнку не даётся предмет",
     'бесплатный курс <a href="/blog/lektorij/kak-uchitsya/">«Как учиться»</a> — прочитать самим и пересказать; '
     'детская версия <a href="#klyuchi" data-go="klyuchi">«Ключей»</a> — когда выйдет'),
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
     '<a href="#tri-puti" data-go="igry">игра «Три пути»</a> — бесплатно, прямо на сессию; '
     'книги <a href="#kniga-konc" data-go="knigi">«Концептикон»</a> и <a href="#kniga-var" data-go="knigi">«Вариатика»</a> — '
     'увидеть ситуацию клиента с разных сторон'),
    ("«Пробовал — бесполезно» стало привычкой",
     '<a href="#proryv" data-go="kursy">живой тренинг «Прорыв»</a>'),
    ("Нужен собеседник и тренажёр каждый день",
     '<a href="#fredi-sub" data-go="fredi">подписка на Фреди</a>'),
    ("Хочется наконец понять предмет, который в школе не дался",
     '<a href="#klyuchi" data-go="klyuchi">аудиосерия «Ключи»</a> — готовится; пока — бесплатные курсы '
     '<a href="/blog/lektorij/kak-uchitsya/">«Как учиться»</a> и <a href="/blog/lektorij/logika/">«Логика»</a>'),
]

# Вся программа «Ключей»: номер, название, что из записи вырастает, узел (◆ — собран из
# нескольких фундаментальных). Из каталога программы (kluchi-programma, 24.10.2026).
# Ярлык записи — magazin/img/k/NN.webp, NN — порядковый номер в этом списке; нарезан из
# одного фотореалистичного холста владельца (25.10.2026), клетка 48 — эмблема серии.
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
KEY_BLOCKS = {"0": "Как думать и учиться", "1": "Математика", "2": "Физика", "3": "Вещество и Земля",
              "4": "Жизнь", "5": "Информация и машины", "6": "Человек и общество", "7": "Искусство"}

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
     'Откройте <a href="#vybor" data-go="vybor">«Подобрать под задачу»</a> и найдите строку про '
     'себя — бесплатное там стоит первым. Лекторий открыт целиком и без регистрации.'),
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
.cat small{color:var(--muted);font-size:.78rem;line-height:1.3}
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
.recs-h{font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin:16px 0 8px}
.recs{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
.rec{display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px 10px 6px 6px}
.rec img{width:52px;height:52px;border-radius:9px;object-fit:cover;display:block}
.rec b{display:block;color:var(--text);font-weight:600;font-size:.9rem;line-height:1.25}
.rec b i{font-style:normal;color:#9cc2ff;font-weight:600;margin-right:4px}
.rec small{display:block;color:var(--faint);font-size:.78rem;line-height:1.3;margin-top:2px}
.rec em{font-style:normal;font-size:.7rem;color:#ffd27a;margin-left:4px}
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
@media(min-width:900px){.cats{grid-template-columns:repeat(4,1fr)}.top .list{grid-template-columns:minmax(0,760px)}}
.legend{font-size:.82rem;color:var(--faint);margin:10px 0 0}
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


def recs_html():
    out, cur = [], None
    for i, (num, title, grows, node) in enumerate(KEYS_ALL, 1):
        blk = num.split(".")[0]
        if blk != cur:
            if cur is not None:
                out.append("</div>")
            if cur == "0":
                # Первый блок виден, остальные 43 — по нажатию: на телефоне список занимал пять экранов.
                out.append('<details class="all"><summary>Вся программа — %d %s</summary>' % (
                    len(KEYS_ALL), count_word(len(KEYS_ALL), ("запись", "записи", "записей"))))
            out.append('<div class="recs-h">%s. %s</div><div class="recs">' % (blk, KEY_BLOCKS[blk]))
            cur = blk
        mark = "<em>первая · на проверке</em>" if i == 1 else ""
        out.append('<div class="rec" id="k-%s"><img src="/magazin/img/k/%02d.webp" width="52" height="52" '
                   'loading="lazy" alt=""><div><b><i>%s</i>%s%s%s</b><small>→ %s</small></div></div>' % (
                       num.replace(".", "-"), i, num, html.escape(title), " ◆" if node else "", mark, html.escape(grows)))
    out.append("</div></details>")
    out.append('<p class="legend">◆ — запись-узел: собирает в одно несколько предыдущих.</p>')
    return "\n".join(out)


def build():
    counts = {k: sum(1 for p in PRODUCTS if p["cat"] == k) for k, *_ in CATS}
    sub = {"besplatno": "%d %s" % (len(FREE), count_word(len(FREE), ("способ", "способа", "способов"))),
           "vybor": "%d %s" % (len(PICK), count_word(len(PICK), ("ситуация", "ситуации", "ситуаций"))),
           "fredi": "программа-собеседник",
           "klyuchi": "аудио, скоро"}
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
        shelf("fredi", "Фреди — программа-собеседник", "",
              '<div class="list">%s</div>' % by("fredi")),
        shelf("klyuchi", "Аудиосерия «Ключи» — фундамент предметов", "",
              '<div class="keys"><span class="status">готовится · купить пока нельзя</span>\n'
              '<p style="margin-top:10px">Вспомните предмет, который в школе так и не дался: формулы были, а понимания — нет. '
              'Обычно дело не в способностях. Не хватило каркаса — нескольких идей, из которых остальное выводится само, — '
              'и привычки смотреть на предмет под нужным углом.</p>\n'
              '<p>«Ключи» — 47 аудиозаписей по 15–20 минут, по одной на предмет: логика, математика, физика, химия, биология, '
              'информатика, язык, литература, история, экономика, музыка и другие. В каждой — история героя, который сам '
              'открывает закон, настройка внимания под этот предмет, порядок мышления и четыре-шесть ключевых идей.</p>\n'
              '<p><b style="color:var(--text)">Кому:</b> взрослым, которые хотят наконец понять «свою нелюбимую» науку, и '
              'старшеклассникам перед новой темой — с 16 лет. Для детей готовим отдельную версию — без расслабления в начале, с текстом для родителя.</p>\n'
              '<p><b style="color:var(--text)">Как это звучит:</b> первые минуты — расслабление, как перед сном: голос '
              'предлагает закрыть глаза и замедлить дыхание, чтобы внимание не разбегалось. Вы всё слышите и можете '
              'остановить запись в любой момент. Дальше — история и загадки, на которые вы отвечаете про себя.</p>\n'
              '<p><b style="color:var(--text)">Цена и формат</b> появятся с выходом первой записи — до этого здесь ничего '
              'не продаётся.</p>\n'
              '<p><b style="color:var(--text)">Что даст — честно:</b> запись не «загружает» предмет. Она ставит каркас и привычку '
              'внимания, на которые дальше ложится практика.</p>\n'
              '<div class="covers">%s</div>\n'
              '%s\n'
              '<p class="note" style="margin-top:10px">Записи слушают в наушниках, в расслабленном состоянии. Не за рулём; при '
              'эпилепсии и серьёзных психических расстройствах — после консультации с врачом.</p>\n'
              '<div class="btns"><a class="btn btn-buy" data-p="klyuchi" href="https://t.me/meysternlp" target="_blank" '
              'rel="noopener">Ранний доступ — написать в Telegram</a></div></div>' % (
                  "".join('<img src="/magazin/img/klyuchi-%s.webp" width="1080" height="1080" loading="lazy" '
                          'alt="Обложка записи «%s»">' % c for c in KEYS_COVERS),
                  recs_html())),
        shelf("vybor", "Подобрать под задачу", "Начните с того, что мешает сейчас, а не с того, что кажется самым полным.",
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
