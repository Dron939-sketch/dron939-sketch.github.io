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
    # ТФ-9: «клиент просит скидку» 343 — статья про цену была, ответа на
    # саму реплику не было.
    "klient-prosit-skidku": ["kak-postavit-normalnuyu-cenu",
                             "kak-privlech-klientov-masteru",
                             "kak-nachat-rabotat-na-sebya"],

    # УБ-9/10: «начинаю делать и бросаю» 659 — описание вместо ярлыка
    # «прокрастинация» (74 788, студент с рефератом).
    "nachinayu-i-brosayu": ["len-kak-simptom-6-prichin",
                            "kak-nauchitsya-kopit-dengi",
                            "vygoranie-5-tipov-i-protokoly-vosstanovleniya"],

    # УБ-9: «как повысить компетенцию» 445 + хвосты ≈ 516 — посадочной не
    # было. Догматик о себе не спрашивает, он спрашивает о профессии.
    "kak-povysit-kompetenciyu": ["strah-zadavat-voprosy",
                                 "uchitsya-uchitsya",
                                 "kak-nauchitsya-dumat-samomu",
                                 "nachinayu-i-brosayu"],

    # УБ-6: вход через предмет, а не через разговор о себе. «Почему люди
    # верят в теории заговора» 76, «как проверить информацию на
    # достоверность» 53, «как отличить правду от лжи в интернете» 15.
    "kak-proverit-informaciyu": ["kak-nauchitsya-dumat-samomu",
                                 "bolshaya-lozh-samopomoschi-7-mifov",
                                 "kak-raspoznat-lozh-12-markerov-ekmana",
                                 "100-kognitivnyh-iskazhenij-spravochnik"],

    # Вебвизор 10–11.09: пятнадцать фраз про тревогу в теле (руки, давление,
    # сердцебиение, утро, жжение языка) — посадочной не было.
    "trevoga-v-tele-ruki-davlenie-serdce": ["kak-spravitsya-s-trevogoj",
                                            "panicheskaya-ataka-ili-serdechnyj-pristup",
                                            "kak-perestat-nakruchivat-sebya",
                                            "trevozhnaya-spiral-kak-ostanovit"],

    # Вебвизор 10–11.09: десять фраз со стороны того, кто уходит —
    # «прощальное сообщение», «без истерик», «без обид», «безболезненно».
    "kak-rasstatsya-proshchalnoe-soobshchenie": ["kak-zabyt-byvshego",
                                                 "psihologiya-razvoda-7-etapov",
                                                 "ne-mogu-perestat-dumat-o-cheloveke",
                                                 "emocionalnaya-zavisimost-priznaki-i-protokol"],

    # Вебвизор 10–11.09: пять фраз от мужчины, которого бросили, — все наши
    # тексты про расставание написаны для неё.
    "ushla-zhena-razvod-glazami-muzhchiny": ["psihologiya-razvoda-7-etapov",
                                             "kak-perezhit-rasstavanie",
                                             "kak-zabyt-byvshego",
                                             "alkogol-seraya-zona-tihiy-alkogolizm"],

    # Вебвизор 10–11.09: четыре фразы про первое сообщение девушке, и
    # «страх подойти познакомиться… быть униженным» — ушёл через 3 секунды.
    "chto-napisat-devushke-v-pervom-soobshchenii": ["netvorking-dlya-introvertov",
                                                    "kak-zavodit-druzej-vzroslomu",
                                                    "strah-zadavat-voprosy",
                                                    "kak-perezhit-pozor"],

    # Вебвизор 10–11.09: «ребёнка в первом классе уже начали обзывать» (час на
    # сайте — искал и не нашёл) и «буллинг в старших классах».
    "rebenka-obzyvayut-v-shkole-chto-delat": ["bulling-v-shkole-chto-delat",
                                              "kak-nauchit-rebenka-postoyat-za-sebya",
                                              "trevoga-roditelya-pervoklassnika",
                                              "kak-ne-sryvatsya-na-rebenka",
                                              "travlya-na-rabote-chto-delat"],

    # Вебвизор 10–11.09: «муж не работает постоянно недоволен и не хочет меня
    # слушать», «что сказать свекрови», «когда пора разводиться».
    "muzh-ne-rabotaet-i-vsem-nedovolen": ["svekrov-vmeshivaetsya-chto-delat",
                                          "psihologiya-razvoda-7-etapov",
                                          "zabota-ili-kontrol",
                                          "kak-nauchitsya-govorit-net"],

    # Вебвизор 10–11.09: «отец настраивает ребенка против мамы как себя вести
    # маме», «апатия и снижение мотивации у ребенка после развода родителей».
    "rebenok-posle-razvoda-chto-delat": ["psihologiya-razvoda-7-etapov",
                                         "chto-delat-esli-podrostok-zamolchal",
                                         "kak-ne-sryvatsya-na-rebenka",
                                         "ushla-zhena-razvod-glazami-muzhchiny"],

    # Диалоги Фреди 4–11.09: сексуальные темы — 19 диалогов, 11 глубоких.
    "net-seksa-v-brake-chto-delat": ["muzh-stal-holodnym",
                                     "zhena-postoyanno-nedovolna",
                                     "zabota-ili-kontrol",
                                     "psihologiya-seksualnosti-2026-5-sdvigov"],
    "kak-skazat-partneru-o-svoih-zhelaniyah": ["muzh-stal-holodnym",
                                               "kak-nauchitsya-govorit-net",
                                               "psihologiya-seksualnosti-2026-5-sdvigov",
                                               "boyus-chto-menya-brosyat"],
    "stydnye-mysli-i-vozbuzhdenie-ne-k-mestu": ["navyazchivye-mysli-chto-delat",
                                                "kak-perezhit-pozor",
                                                "trevoga-v-tele-ruki-davlenie-serdce",
                                                "psihologiya-seksualnosti-2026-5-sdvigov"],
    "u-menya-roman-na-storone-chto-delat": ["psihologiya-izmeny-8-prichin-nauchnyj-vzglyad",
                                            "kak-prostit-izmenu",
                                            "kak-perezhit-izmenu",
                                            "chto-delat-esli-uznali-ob-izmene"],
    "retroaktivnaya-revnost-proshloe-partnera": ["psihologiya-revnosti-6-tipov",
                                                 "navyazchivye-mysli-chto-delat",
                                                 "boyus-chto-menya-brosyat",
                                                 "zabota-ili-kontrol"],

    # Вторая пятёрка «тем, с которыми не идут к друзьям» (12.09).
    "muzh-pyot-chto-delat-zhene": ["sozavisimost-zhizn-ryadom-s-zavisimym",
                                   "chto-delat-esli-u-blizkogo-zavisimost",
                                   "vzroslye-deti-alkogolikov-vda",
                                   "alkogol-seraya-zona-tihiy-alkogolizm"],
    "skryvayu-stavki-i-dolgi-ot-semi": ["stavki-lyudomaniya-mehanika",
                                        "chto-delat-esli-u-blizkogo-zavisimost",
                                        "kak-prostit-sebya",
                                        "chto-delat-esli-prosyat-deneg-v-dolg"],
    "muzh-smotrit-porno-chto-delat": ["net-seksa-v-brake-chto-delat",
                                      "kak-skazat-partneru-o-svoih-zhelaniyah",
                                      "psihologiya-seksualnosti-2026-5-sdvigov",
                                      "cifrovaya-zavisimost-telefon-um"],
    "ne-lyublyu-muzha-no-ne-uhozhu": ["muzh-stal-holodnym",
                                      "u-menya-roman-na-storone-chto-delat",
                                      "psihologiya-razvoda-7-etapov",
                                      "zhena-postoyanno-nedovolna"],
    "izmenila-muzhu-i-muchaet-sovest": ["kak-prostit-sebya",
                                        "kak-prostit-izmenu",
                                        "styd-vs-vina-raznica-kotoraya-kalechit",
                                        "u-menya-roman-na-storone-chto-delat"],

    # Стыд как состояние — сквозная тема через СБ-6, УБ-10 и ЧВ-6.
    # ~900 показов («как пережить позор» 221, «стыдно за своё поведение»
    # 217, «краснею когда говорю» 373, «мне стыдно за прошлое» 92),
    # посадочной не было ни одной.
    "kak-perezhit-pozor": ["styd-vs-vina-raznica-kotoraya-kalechit",
                           "kak-perestat-nakruchivat-sebya",
                           "sindrom-samozvanca-priznaki-i-protokol"],

    # СБ-10, дыра на 1282 показа: три статьи про гнев, и ни в одной нет
    # ребёнка. Доноры — те самые три плюс статья про границы без крика.
    "kak-ne-sryvatsya-na-rebenka": ["gnev-kak-perestat-vzryvatsya",
                                    "chto-delat-esli-sorvalsya",
                                    "granicy-rebenku-bez-krika"],

    # Порядок убеждения (ФДИЛС), 10.09.2026. Донорами взяты статьи про
    # влияние и убеждение: статья отвечает на вопрос, который в них
    # поставлен, но не закрыт, — в каком порядке применять приёмы.
    "kak-ubedit-cheloveka-poryadok": ["psihologiya-ubezhdeniya-5-mehanizmov",
                                      "6-principov-vliyaniya-chaldini-2026",
                                      "psihologiya-prodazh-2026-7-patternov"],

    "kak-privlech-klientov-masteru": ["kak-nachat-rabotat-na-sebya",
                                      "psihologiya-prodazh-2026-7-patternov",
                                      "kak-poprosit-povyshenie-zarplaty"],

    # Валеты и Дамы, вторая партия от 10.09.2026 — по клетке на статью.
    "biznes-bez-menya-kak-vyjti-iz-operacionki": ["kak-perestat-vsyo-kontrolirovat",
                                                  "ne-mogu-delegirovat-kak-otpustit",
                                                  "kak-nachat-rabotat-na-sebya"],
    "kak-nauchitsya-dumat-samomu": ["kak-razvit-kriticheskoe-myshlenie",
                                    "100-kognitivnyh-iskazhenij-spravochnik",
                                    "strah-zadavat-voprosy"],
    "kak-nauchitsya-obyasnyat": ["kak-nauchitsya-dumat-samomu",
                                 "strah-zadavat-voprosy",
                                 "kak-perestat-vsyo-kontrolirovat"],
    "kak-o-vas-uznayut-cifrovoj-sled-i-precedent": ["kak-sobrat-o-sebe-dostovernuyu-stranicu",
                                                    "sindrom-samozvanca-priznaki-i-protokol",
                                                    "kak-perestat-boyatsya-lyudej"],

    # Валеты и Дамы, партия от 10.09.2026. Из восьми клеток статьи
    # потребовались двум: СБ-Валет закрыт четырьмя существующими
    # статьями про уверенность (нужна была только мета), ТФ-Валет,
    # УБ-Валет, УБ-Дама, ЧВ-Валет и ЧВ-Дама — см. разбор в коммите.
    "kak-perestat-vsyo-kontrolirovat": ["ne-mogu-delegirovat-kak-otpustit",
                                        "granicy-ili-egoizm",
                                        "kak-nauchitsya-doveryat-lyudyam"],
    "kak-nauchitsya-kopit-dengi": ["strah-v-dengah-4-arhetipa-otnoshenij-s-finansami",
                                   "privychka-ekonomit-4-tipa-skuposti",
                                   "kak-nachat-rabotat-na-sebya"],

    # Десятые уровни, партия от 10.09.2026. СБ-10 («как перестать быть
    # удобным» 1483) и ТФ-10 («не могу делегировать» 303) уже закрыты
    # статьями, дыр было две.
    "strah-zadavat-voprosy": ["sindrom-samozvanca-priznaki-i-protokol",
                              "kak-perestat-boyatsya-lyudej",
                              "kak-razvit-kriticheskoe-myshlenie"],
    "boyus-chto-menya-brosyat": ["tipy-privyazannosti-test-i-rabota",
                                 "emocionalnaya-zavisimost-priznaki-i-protokol",
                                 "kak-nauchitsya-doveryat-lyudyam"],

    # Девятые уровни, партия от 10.09.2026.
    "kak-ponyat-chto-chelovek-vret": ["kak-raspoznat-lozh-12-markerov-ekmana",
                                      "kak-chitat-lyudej-7-urovnej-nablyudatelnosti",
                                      "kak-nauchitsya-doveryat-lyudyam"],
    "kak-perestat-byt-udobnym": ["kak-skazat-net",
                                 "granicy-ili-egoizm",
                                 "chto-delat-esli-vas-obescenivayut"],
    "kak-nauchit-rebenka-postoyat-za-sebya": ["rebenok-deretsya-chto-delat",
                                              "granicy-rebenku-bez-krika",
                                              "adaptaciya-k-sadu-i-shkole"],
    "kak-nachat-rabotat-na-sebya": ["stoit-li-menyat-rabotu",
                                    "ne-hochu-rabotat-chto-delat",
                                    "vygoranie-5-tipov-i-protokoly-vosstanovleniya"],

    # Клетка СБ-8 «задира», партия от 10.09.2026. Замер разделил клетку
    # надвое: родитель дошкольника (~5274 показа, покрытия не было вовсе)
    # и родитель подростка (~1990 сверх того, что уже несут две статьи).
    "rebenok-deretsya-chto-delat": ["granicy-rebenku-bez-krika",
                                    "adaptaciya-k-sadu-i-shkole",
                                    "kak-pravilno-hvalit-rebenka"],
    "kak-naladit-otnosheniya-s-podrostkom": ["podrostok-buntuet-i-grubit-chto-delat",
                                             "chto-delat-esli-podrostok-zamolchal",
                                             "pervaya-lyubov-podrostka-chto-delat-roditelyu"],

    # Восьмые уровни ТФ, ЧВ и УБ, партия от 10.09.2026.
    "kak-poprosit-povyshenie-zarplaty": ["yakorenie-v-peregovorah",
                                         "psihologiya-peregovorov-metod-voss-fbi",
                                         "stoit-li-menyat-rabotu"],
    "kak-manipulirovat-lyudmi": ["23-manipulyacii-v-otnosheniyah-spravochnik",
                                 "6-principov-vliyaniya-chaldini-2026",
                                 "kak-perestat-byt-zhertvoj"],
    "kak-nauchitsya-doveryat-lyudyam": ["kak-perezhit-predatelstvo",
                                        "kak-perestat-boyatsya-lyudej",
                                        "emocionalnoe-nasilie-kak-raspoznat"],

    "ne-mogu-najti-rabotu-chto-delat": ["chto-delat-esli-vas-uvolili",
                                        "ne-hochu-rabotat-chto-delat",
                                        "stoit-li-menyat-rabotu"],

    # Клетки СБ-7 и ТФ-7, партия от 10.09.2026.
    "kak-perestat-boyatsya-lyudej": ["sociofobiya-ili-zastenchivost",
                                     "introvert-ili-zastenchivost",
                                     "kak-zavodit-druzej-vzroslomu"],
    "stoit-li-menyat-rabotu": ["prizvanie-vs-karyera-5-tipov-zhiznennogo-puti",
                               "vygoranie-5-tipov-i-protokoly-vosstanovleniya",
                               "ne-hochu-rabotat-chto-delat"],

    # Клетки СБ-6 и ТФ-6, партия от 10.09.2026, плюс статья про насилие.
    "ne-hochu-rabotat-chto-delat": ["vygoranie-5-tipov-i-protokoly-vosstanovleniya",
                                    "chto-delat-esli-vas-uvolili",
                                    "len-kak-simptom-6-prichin"],
    "kak-otvetit-na-hamstvo": ["chto-delat-esli-na-vas-nakrichali",
                               "chto-delat-esli-vas-obescenivayut",
                               "travlya-na-rabote-chto-delat"],
    "nasilie-i-kontrol-v-otnosheniyah": ["emocionalnoe-nasilie-kak-raspoznat",
                                         "gazlayting-chto-eto",
                                         "rossijskij-abyuz-9-unikalnyh-patternov"],

    # Кластер УБ-6, партия 3 от 10.09.2026: сомнение, уход не туда, смерть.
    "pochemu-lyudi-veryat-v-teorii-zagovora": ["kak-razvit-kriticheskoe-myshlenie",
                                               "pochemu-goroskopy-rabotayut-effekt-barnuma",
                                               "priznaki-sekty"],
    "bog-est-ili-net-chto-govorit-psihologiya": ["navyazannaya-vera",
                                                 "ezoterika-i-psihologiya-7-peresechenij"],
    "chto-budet-posle-smerti-vzglyad-psihologii": ["strah-smerti-kak-s-nim-zhit",
                                                   "kak-perezhit-utratu-blizkogo-etapy-gorya",
                                                   "kak-podderzhat-cheloveka-v-gore"],

    # Кластеры ЧВ-6 и ЧВ-7, партия от 10.09.2026.
    "pochemu-so-mnoj-ne-hotyat-obshchatsya": ["psihologiya-odinochestva-4-tipa-2026",
                                              "kak-zavodit-druzej-vzroslomu",
                                              "ot-zhertvy-k-tvorcu-7-urovnej-evolyucii"],
    "kak-perestat-sebya-zhalet": ["samosostradanie-vmesto-samokritiki",
                                  "ot-zhertvy-k-tvorcu-7-urovnej-evolyucii"],
    "kak-perestat-byt-zhertvoj": ["ot-zhertvy-k-tvorcu-7-urovnej-evolyucii",
                                  "23-manipulyacii-v-otnosheniyah-spravochnik",
                                  "kak-skazat-net"],
    "kak-najti-sebya-nastoyashchego": ["triada-identichnosti-mejstera",
                                       "psihotipy-po-povedeniyu"],

    # Кластер УБ-6 «вера, истина, заблуждения», партия от 10.09.2026.
    "priznaki-sekty": ["23-manipulyacii-v-otnosheniyah-spravochnik",
                       "energeticheskie-vampiry-neuro",
                       "chto-delat-esli-roditeli-vmeshivayutsya"],
    "navyazannaya-vera": ["chto-delat-esli-roditeli-vmeshivayutsya",
                          "ezoterika-i-psihologiya-7-peresechenij",
                          "kak-skazat-net"],
    "kak-razvit-kriticheskoe-myshlenie": ["pochemu-goroskopy-rabotayut-effekt-barnuma",
                                          "rabotayut-li-ritualy-taro-astrologiya",
                                          "ezoterika-i-psihologiya-7-peresechenij"],

    # Две статьи от 9 сентября 2026 висели сиротами: check_blog показывал
    # «ни одной входящей ссылки из статей». Через рубрику и sitemap их
    # находит краулер, читатель — нет.
    "test-beka-na-depressiyu-i-drugie-shkaly": ["depressiya-12-tipov-chto-rabotaet",
                                                "grust-ili-depressiya",
                                                "gore-ili-depressiya"],
    "kak-opredelit-harakter-cheloveka": ["psihotipy-po-povedeniyu",
                                         "kak-chitat-lyudej-7-urovnej-nablyudatelnosti",
                                         "patterny-povedeniya-kak-zamechat"],

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
# Раньше здесь стоял один месяц — {8: "августа"}, — а подзаголовок хаба
# был вписан строкой «август 2026». Скрипт написан в августе и в сентябре
# упал с KeyError: 9 на первой же новой статье. Месяц берётся из даты
# самой свежей карточки, руками не пишется.
MONTH = {1: "января", 2: "февраля", 3: "марта", 4: "апреля", 5: "мая",
         6: "июня", 7: "июля", 8: "августа", 9: "сентября", 10: "октября",
         11: "ноября", 12: "декабря"}
MONTH_NOM = {1: "январь", 2: "февраль", 3: "март", 4: "апрель", 5: "май",
             6: "июнь", 7: "июль", 8: "август", 9: "сентябрь",
             10: "октябрь", 11: "ноябрь", 12: "декабрь"}


def meta(slug):
    s = io.open(os.path.join(BLOG, slug + ".html"), encoding="utf-8").read()
    # Раньше заголовок брался как «<title> и лениво до первой вертикальной
    # черты», причём с re.S. У страниц, где в <title> черты нет вовсе
    # (а таких в блоге большинство — там «— Андрей Мейстер»), поиск уезжал
    # за пределы тега и утаскивал в карточку весь <head> до первой «|»
    # где-нибудь в CSS. В файл вставлялась ссылка вида
    # «https</a><span>11 мин · ...</span></div>», ломавшая страницу-донора.
    # 10.09.2026 так пострадали четыре страницы; ещё две лежали сломанными
    # в main с прошлого прогона. Теперь читаем ровно содержимое тега и
    # отрезаем хвост после разделителя, каким бы он ни был.
    raw = re.search(r"<title>(.*?)</title>", s, re.S).group(1).strip()
    title = re.split(r"\s+[|—–]\s+", raw)[0].strip()
    return dict(
        title=title,
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
            # Раньше здесь искалось '<div class="related-grid">\n' — с
            # переводом строки. На части страниц карточка идёт сразу за
            # открывающим тегом, замена молча не срабатывала, файл
            # переписывался без изменений, а счётчик всё равно рос: скрипт
            # отчитывался о пяти вставленных ссылках, когда встало три.
            open_tag = '<div class="related-grid">'
            before = s
            s = s.replace(open_tag, open_tag + "\n" + item, 1)
            if s == before:
                missing.append(d + " (не нашлось, куда вставить)")
                continue
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
    newest = items[0][0]["date"]
    sub = "%s %s" % (MONTH_NOM[int(newest[1])], newest[0])
    s = re.sub(r'(Свежее</h2><span class="sub">)[^<]*', r'\g<1>' + sub, s, count=1)

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
