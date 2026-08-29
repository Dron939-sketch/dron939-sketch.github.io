#!/usr/bin/env python3
"""Собирает каталог игр-тренажёров Фреди — /trenazhery/.

Зачем. В приложении тридцать одна игра, и попасть в любую из них можно
только по адресу вида /fredi/?m=mysl. Это параметр на странице-оболочке,
которая сама закрыта от индексации (canonical уводит на посадочную, в
sitemap её нет). То есть тридцать один отдельный инструмент — тренажёр
отказа, разбор автоматической мысли, n-back, метод Ферми — не имеет ни
одного адреса, на который может привести поиск.

Названы на сайте пять из них, в одной секции посадочной. Остальные
двадцать шесть не упомянуты нигде, кроме подписи «и ещё 15+».

Здесь появляется каталог: у каждой игры своё описание, своя группа и своя
прямая ссылка. Описания не сочинялись — они пересказывают шапки самих
файлов игр (fredi/<имя>.js), где автор записал, что игра делает и на чём
основана.

Страница собирается скриптом, а не пишется руками, по двум причинам.
Первая: счётчики («31 игра», «10 в разделе») считаются из данных и не
разъезжаются. Вторая, важнее: список игр сверяется с таблицей ROUTES в
fredi/app.js — если в приложении появится новая игра, а описания к ней
не будет, сборка упадёт и об этом станет известно сразу, а не через
полгода.

    python3 tools/build_trenazhery.py --check     # только сверка с app.js
    python3 tools/build_trenazhery.py --dry-run
    python3 tools/build_trenazhery.py
"""

from __future__ import annotations

import argparse
import html as html_mod
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "fredi" / "app.js"
OUT = ROOT / "trenazhery" / "index.html"
URL = "https://meysternlp.ru/trenazhery/"

# Служебные ключи роутера: это не игры, а экраны-контейнеры.
NOT_A_GAME = {"games"}

# ключ → (значок, название, описание, курс-спутник, без-ИИ)
# Описание — пересказ шапки fredi/<файл>.js. Ничего сверх того, что
# написано в самом коде игры, здесь утверждать нельзя.
GAMES: dict[str, dict] = {
    "sos": dict(
        icon="🆘", name="Мне плохо прямо сейчас",
        text="Не игра и не диагностика: короткий протокол первой помощи. "
             "Сначала дыхание, потом «что вообще происходит», потом три "
             "конкретных шага на ближайший час — и разговор, если после "
             "этого захочется говорить.",
    ),
    "mysl": dict(
        icon="🔍", name="Мысль под допросом",
        text="Тренажёр по когнитивной терапии Бека: поймать автоматическую "
             "мысль («ответил „ок“ — значит, я его достал»), назвать "
             "искажение и переформулировать точнее. Вашу формулировку "
             "оценивает Фреди, а не ключ ответов.",
    ),
    "chuvstva": dict(
        icon="💠", name="Чувства",
        text="По ситуации и сигналам тела назвать чувство точно: стыд или "
             "вина, тревога или страх. Точно названное чувство теряет в "
             "силе — с этого начинается любая терапия.",
    ),
    "skazhinet": dict(
        icon="🛑", name="Скажи «нет»",
        text="Собеседник давит виной, срочностью, лестью и торгом, а ваша "
             "задача — удержать вежливый отказ до конца разговора. В конце "
             "разбор: на какой тактике вы поплыли.",
    ),
    "rol": dict(
        icon="🎭", name="Смени роль",
        text="Роль держится на повторяющихся мелких поступках, и менять в "
             "ней нечего, кроме поведения. В каждой сцене старая роль тянет "
             "на автопилот, вы пишете новое действие — и смотрите, куда "
             "поехала шкала.",
    ),
    "klin": dict(
        icon="🪓", name="Клин клином",
        text="Из петли, которая вас захватила — скролл, мысли по кругу, "
             "тупик, — выходят не волей и не в пустоту, а вкидываясь в "
             "конкурирующую вовлечённость. Игра тренирует подбирать этот "
             "клин: дешёвый вход плюс собственная тяга.",
    ),
    "istoria": dict(
        icon="📖", name="Другая история",
        text="Работа с личной историей на базе реконсолидации памяти: факты "
             "прошлого не переписываются, меняется их след и смысл. На "
             "острую травму стоит предохранитель, который уводит к живому "
             "специалисту, — и это не формальность.",
    ),
    "alfavit": dict(
        icon="🔤", name="Алфавит · новый код НЛП",
        no_ai=True,
        text="Классика Гриндера: произносите букву вслух и одновременно "
             "жмёте кнопку по пометке под ней — левая, правая или обе. Речь "
             "и руки заняты разными задачами, внутренней болтовне негде "
             "развернуться. Сбились — проход сначала; не дольше пяти минут.",
        course=("/blog/lektorij/novyj-kod-nlp/", "Новый код НЛП"),
    ),
    "spiral": dict(
        icon="🌀", name="Спираль",
        text="Прожить по выборам день чьей-то погасшей жизни. Драйв, тяжесть "
             "и связь отзываются с задержкой, поэтому видно то, чего изнутри "
             "не видно: сегодняшнее решение достаёт послезавтра.",
        course=("/blog/lektorij/snova-zhivoj/", "Снова живой"),
    ),
    "perehod": dict(
        icon="🚪", name="Переход",
        text="Месяц из десяти решений со сквозными последствиями. Деньги, "
             "силы, доверие близких и три паузы на весь месяц; когда сил "
             "мало, вдумчивые варианты просто закрываются — ровно как в "
             "жизни.",
    ),

    "kontur": dict(
        icon="🧭", name="О чём ты умеешь думать",
        text="Диагностика и игра по КОНТУРу: на каких темах ваше мышление "
             "работает, а где буксует. Отсюда удобно начинать, если "
             "непонятно, за какой тренажёр браться.",
    ),
    "oshibka": dict(
        icon="🪤", name="Лови ошибку",
        text="Распознавание логических ошибок и когнитивных искажений в "
             "чужих доводах. Ядро проверяется на месте, а Фреди добавляет "
             "разбор, если хочется понять, почему довод не держится.",
    ),
    "kalibr": dict(
        icon="🎲", name="Калибровка",
        no_ai=True,
        text="Утверждение — и ваша уверенность в процентах. В конце карта "
             "сверхуверенности: где вы говорили «уверен на девяносто», а "
             "попадали в шесть случаев из десяти.",
    ),
    "fermi": dict(
        icon="📐", name="Прикидка",
        text="Метод Ферми: вопрос «сколько всего такого-то» раскладывается "
             "на множители и оценивается по порядку величины. Балл — за "
             "порядок, разбор рассуждения — от Фреди.",
    ),
    "advokat": dict(
        icon="⚖️", name="Адвокат дьявола",
        text="Защитить сторону, с которой вы можете быть не согласны, и "
             "построить сильнейшую версию чужой позиции. Без этого навыка "
             "спор превращается в бой с чучелом.",
    ),
    "chainik": dict(
        icon="🫖", name="Чайник Рассела",
        text="Где лежит бремя доказательства, какие допущения спрятаны и "
             "насколько вера соразмерна доказательствам. Финал — разбор "
             "собственного убеждения, а не чужого.",
        course=("/blog/lektorij/bertran-rassel/", "Бертран Рассел: ясность мышления"),
    ),
    "lazejka": dict(
        icon="🕳", name="Лазейка",
        text="Читать систему правил и видеть, что она на самом деле "
             "разрешает. Навык нейтральный: игра не про мораль, а про гонку "
             "между правилом и обходом — и про то, как в ней держаться.",
    ),
    "danetki": dict(
        icon="❔", name="Данетки",
        text="Разгадать ситуацию, задавая вопросы, на которые Фреди отвечает "
             "только «да», «нет» и «неважно». Спрашивать можно голосом.",
    ),
    "vsluh": dict(
        icon="🗣", name="Мысль вслух",
        text="Мышление — приватное поведение: его никто не видит, поэтому "
             "никто и не поправил. Здесь операция выносится наружу, Фреди "
             "показывает эталон и дорабатывает слабое место — а потом она "
             "сворачивается обратно внутрь.",
    ),
    "signal": dict(
        icon="✍️", name="Сигнал",
        text="Опорные сигналы по методу Шаталова: сначала видеть сильные "
             "опоры, потом сжимать материал самому, потом разворачивать по "
             "опоре обратно. Последний круг — на своём материале.",
        course=("/blog/lektorij/opornye-signaly/", "Опорные сигналы: метод Шаталова"),
    ),

    "fokus": dict(
        icon="🎯", name="Фокус",
        no_ai=True,
        text="Классический n-back: идёт поток символов, вы отмечаете "
             "совпадение с тем, что было N шагов назад. Рабочая память в "
             "чистом виде.",
    ),
    "mnemo": dict(
        icon="🏛", name="Мнемо",
        no_ai=True,
        text="Не «запомни как-нибудь», а освоить конкретную мнемотехнику и "
             "применить её: дворец памяти, цепочка-история, образы цифр, "
             "ассоциативные пары.",
    ),
    "schet": dict(
        icon="🔢", name="Устный счёт",
        no_ai=True,
        text="Примеры на время плюс приёмы быстрого счёта. Скучная на вид "
             "вещь, которая заметно разгружает голову в магазине, в ремонте "
             "и в разговоре о цене.",
    ),
    "dvapotoka": dict(
        icon="🌊", name="Два потока",
        text="Начать говорить раньше, чем придумали конец фразы, и думать по "
             "ходу речи. Четыре режима — от пересказа до двойной нагрузки, — "
             "и голос Фреди в качестве партнёра.",
    ),

    "delo": dict(
        icon="💼", name="Своё дело",
        text="Бизнес-симулятор в российских реалиях: выбрать дело, собрать "
             "стратегию и провести её через двенадцать месяцев проблем, не "
             "обанкротившись. Внутри зашит урок золотой лихорадки — про "
             "того, кто продаёт лопаты.",
    ),
    "dostigator": dict(
        icon="🏄", name="Достигатор: поймай поток",
        text="Доска — это жизнь, и по ней текут потоки-возможности. Идти "
             "против потока дорого: энергия кончается, и вы выгораете, не "
             "дойдя. Игра про то, чтобы поймать течение, а не грести.",
    ),
    "korka": dict(
        icon="👑", name="Короли и капуста",
        text="Карабкаться вверх не выслугой, а поддержкой других. У каждого "
             "своя валюта мотивации — признание, выгода, сила, связи, — и её "
             "сначала надо прочитать.",
    ),
    "mandat": dict(
        icon="🗳", name="Мандат: цена кресла",
        text="Симулятор депутата: каждая развилка — размен между доверием "
             "избирателей, лояльностью партии, весом в мэрии, деньгами и "
             "совестью. Про конформизм и скользкую дорожку изнутри, а не в "
             "пересказе.",
    ),
    "sovet": dict(
        icon="☄️", name="Земля в опасности",
        text="Политическая интрига на шесть фракций: Солнце взорвётся через "
             "восемнадцать месяцев, но побеждает не тот, чей путь спасёт "
             "Землю, а тот, кто наберёт больше очков. Фракции помнят "
             "предательства.",
    ),
    "parus": dict(
        icon="⛵", name="Парус",
        text="Увидеть поток, найти точку простоя, проверить идею тремя "
             "условиями до того, как в неё влюбились, и собрать движущую "
             "пару: то, что подпирает сзади, и то, что манит спереди.",
        course=("/blog/lektorij/parus/", "Парус"),
    ),
    "lgenij": dict(
        icon="💡", name="Ленивый гений",
        text="Ставить дерзкую цель и находить к ней самый дешёвый путь — "
             "лень в роли инженера. Девять уровней: сначала узнавать рычаги, "
             "потом придумывать в дуэли с Фреди, потом переносить на свою "
             "задачу.",
    ),

    "odi": dict(
        icon="🧠", name="ОДИ: игра всерьёз",
        text="Оргдеятельностная игра по Щедровицкому, Фреди — игротехник. "
             "Хост создаёт игру и делится ссылкой, компания играет с "
             "телефонов: самоопределение, версии, проблематизация, проект, "
             "рефлексия, протокол.",
    ),
}

GROUPS: list[tuple[str, str, str, list[str]]] = [
    ("srochno", "Когда плохо прямо сейчас",
     "Один экран, в который можно зайти без сил и без желания разбираться.",
     ["sos"]),
    ("sostoyanie", "Мысли, чувства, поведение",
     "Здесь тренируют то, что обычно разбирают на приёме: поймать мысль, "
     "назвать чувство, удержать отказ, выйти из роли.",
     ["mysl", "chuvstva", "skazhinet", "rol", "klin", "alfavit", "istoria", "spiral", "perehod"]),
    ("myshlenie", "Думать яснее",
     "Критическое мышление — не про эрудицию, а про несколько операций, "
     "которые ставятся повторением.",
     ["kontur", "oshibka", "kalibr", "fermi", "advokat", "chainik", "lazejka",
      "danetki", "vsluh", "signal"]),
    ("kognitivnye", "Внимание, память, счёт",
     "Короткие упражнения на голову. Проверка тут точная и считается на "
     "месте, поэтому играть можно сколько угодно.",
     ["fokus", "mnemo", "schet", "dvapotoka"]),
    ("simulyatory", "Дело, деньги, люди",
     "Симуляторы на несколько десятков минут: решения со сквозными "
     "последствиями и разбор в конце — кем вы там были.",
     ["delo", "dostigator", "korka", "mandat", "sovet", "parus", "lgenij"]),
    ("vmeste", "Вместе с другими",
     "Единственная игра не в одиночку: компания с телефонов и Фреди в роли "
     "ведущего.",
     ["odi"]),
]

FAQ: list[tuple[str, str]] = [
    ("Нужно ли регистрироваться, чтобы поиграть?",
     "Нет. Тренажёр открывается по ссылке и работает сразу. Регистрация "
     "нужна только для того, чтобы сохранялись результаты и серии — без неё "
     "прогресс живёт до закрытия вкладки."),
    ("Это платно?",
     "Игры не продаются по отдельности. Те, где ответ проверяется на месте, "
     "не расходуют ничего вообще. Там, где отвечает и разбирает Фреди, "
     "тратится общий бесплатный лимит на разговоры с ним: он обновляется "
     "каждый день, и его хватает на несколько партий. Что в лимите и что в "
     "подписке — на странице тарифов."),
    ("Чем это отличается от обычного разговора с Фреди?",
     "Разговор идёт про вашу ситуацию, а тренажёр ставит навык на чужих "
     "примерах. Разница та же, что между «обсудить, почему трудно "
     "отказывать» и десятью подряд разговорами, где на вас давят, а вы "
     "держите отказ. Второе переносится в жизнь лучше, но только после "
     "первого."),
    ("Заменяет ли это психотерапию?",
     "Нет, и не пытается. Тренажёр отрабатывает отдельный навык, а терапия "
     "занимается тем, почему навык не ставится. Если состояние держится "
     "неделями, мешает спать, работать и быть с людьми — это к живому "
     "специалисту, а не к игре."),
    ("С чего начать, если игр слишком много?",
     "Если плохо прямо сейчас — с протокола «Мне плохо прямо сейчас». Если "
     "непонятно, куда идти, — с «О чём ты умеешь думать»: она показывает, "
     "где мышление буксует. Если хочется одну вещь, которая пригодится "
     "завтра, — «Скажи „нет“»."),
    ("Работает ли это на телефоне?",
     "Да, всё сделано под телефон в первую очередь. В части игр можно "
     "отвечать голосом, а Фреди отвечает вслух."),
]

STYLE = """
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:#0C0C0C;color:#F0F0F0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:300;line-height:1.7;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;min-height:100vh}
a{color:inherit;text-decoration:none}
main{flex:1 0 auto;padding:clamp(28px,6vw,56px) 0 clamp(48px,9vw,88px)}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px;width:100%}
.narrow{max-width:760px}
.crumbs{font-size:.82rem;color:#8a93a3;margin-bottom:clamp(20px,4vw,32px);letter-spacing:.02em}
.crumbs a:hover{color:#3A86FF}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:#3A86FF;font-weight:500;margin-bottom:18px}
h1{font-size:clamp(1.75rem,5.5vw,2.7rem);font-weight:600;line-height:1.2;letter-spacing:-.01em;color:#fff;margin-bottom:18px}
.lede{font-size:clamp(1.05rem,3vw,1.22rem);color:#aeb6c2;line-height:1.6;max-width:760px}
.lede+.lede{margin-top:14px}
h2{font-size:clamp(1.25rem,3.6vw,1.65rem);font-weight:600;line-height:1.25;letter-spacing:-.01em;color:#fff;margin-bottom:12px}
h3{font-size:1.02rem;font-weight:600;color:#fff;line-height:1.35}
p{color:#cfd4dd}
strong{color:#fff;font-weight:600}
.hr{height:1px;background:linear-gradient(90deg,rgba(58,134,255,.35),rgba(58,134,255,0));margin:clamp(30px,6vw,46px) 0}
.first-step{background:linear-gradient(180deg,rgba(58,134,255,.10),rgba(58,134,255,.03));border:1px solid rgba(58,134,255,.24);border-radius:18px;padding:clamp(20px,4vw,28px);margin:clamp(26px,5vw,38px) 0}
.first-step h2{font-size:1.15rem;margin-bottom:12px}
.first-step ul{list-style:none;display:grid;gap:10px}
.first-step li{padding-left:26px;position:relative;color:#cfd4dd}
.first-step li::before{content:'→';position:absolute;left:0;color:#3A86FF}
.first-step a{color:#7fb0ff;border-bottom:1px solid rgba(127,176,255,.35)}
.toc{margin:clamp(26px,5vw,38px) 0}
.toc ol{list-style:none;counter-reset:t;display:grid;gap:8px}
.toc li{counter-increment:t;color:#aeb6c2}
.toc li::before{content:counter(t) '. ';color:#5c6678}
.toc a{color:#cfd4dd;border-bottom:1px solid rgba(207,212,221,.2)}
.toc a:hover{color:#7fb0ff;border-bottom-color:#7fb0ff}
.group{margin:clamp(34px,6vw,54px) 0 0}
.group-head{max-width:760px;margin-bottom:22px}
.group-head p{color:#9aa3b2;margin-top:8px}
.group-count{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:#6d7686;font-weight:600;display:block;margin-bottom:10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px}
.card{display:flex;flex-direction:column;background:#141416;border:1px solid #242427;border-radius:16px;padding:20px 22px;transition:border-color .25s,transform .25s}
.card:hover{border-color:rgba(58,134,255,.5);transform:translateY(-2px)}
.card-top{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.card-icon{font-size:1.5rem;line-height:1}
.card p{font-size:.95rem;color:#a8b0bd;flex:1 0 auto}
.card-foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:16px}
.tag{font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;color:#7f8a9c;border:1px solid #2c2c30;border-radius:20px;padding:3px 10px}
.card-go{font-size:.9rem;color:#7fb0ff;font-weight:500;margin-left:auto}
.card-course{display:block;margin-top:12px;font-size:.86rem;color:#7f8a9c}
.card-course a{color:#9aa3b2;border-bottom:1px solid rgba(154,163,178,.3)}
.card-course a:hover{color:#7fb0ff;border-bottom-color:#7fb0ff}
.faq{margin-top:clamp(34px,6vw,54px)}
.faq-item{border-top:1px solid #232326;padding:20px 0}
.faq-item h3{margin-bottom:8px}
.faq-item p{color:#a8b0bd}
.faq-item a{color:#7fb0ff;border-bottom:1px solid rgba(127,176,255,.35)}
.cta{margin-top:clamp(34px,6vw,54px);background:linear-gradient(180deg,rgba(58,134,255,.12),rgba(58,134,255,.03));border:1px solid rgba(58,134,255,.26);border-radius:20px;padding:clamp(24px,5vw,34px);text-align:center}
.cta h2{margin-bottom:12px}
.cta p{max-width:560px;margin:0 auto 20px}
.btn{display:inline-block;background:#3A86FF;color:#fff;font-weight:600;padding:13px 26px;border-radius:11px}
.btn:hover{background:#1f6ae0}
.cta-note{display:block;margin-top:12px;font-size:.85rem;color:#7f8a9c}
@media(max-width:600px){.grid{grid-template-columns:1fr}}
"""


def routes_from_app() -> list[str]:
    """Ключи таблицы ROUTES из fredi/app.js — источник истины по составу."""
    text = APP.read_text(encoding="utf-8")
    m = re.search(r"var ROUTES = \{(.*?)\n        \};", text, re.S)
    if not m:
        raise SystemExit("не нашёл таблицу ROUTES в fredi/app.js")
    return re.findall(r"^\s*([a-z0-9_]+):\s*\{", m.group(1), re.M)


def check() -> list[str]:
    routes = [k for k in routes_from_app() if k not in NOT_A_GAME]
    problems = []
    for key in routes:
        if key not in GAMES:
            problems.append(f"игра {key!r} есть в app.js, но описания нет")
    for key in GAMES:
        if key not in routes:
            problems.append(f"описание {key!r} есть, но игры в app.js нет")
    listed = [k for _, _, _, keys in GROUPS for k in keys]
    for key in GAMES:
        if key not in listed:
            problems.append(f"игра {key!r} не попала ни в одну группу")
    if len(listed) != len(set(listed)):
        problems.append("игра попала в две группы сразу")
    return problems


def esc(s: str) -> str:
    return html_mod.escape(s, quote=False)


def card(key: str) -> str:
    g = GAMES[key]
    tags = []
    if g.get("no_ai"):
        tags.append('<span class="tag">без интернета и ИИ</span>')
    course = ""
    if g.get("course"):
        href, name = g["course"]
        course = (f'<span class="card-course">Тренажёр к курсу '
                  f'<a href="{href}">«{esc(name)}»</a></span>')
    return (
        f'<a class="card" href="/fredi/?m={key}">'
        f'<span class="card-top"><span class="card-icon" aria-hidden="true">{g["icon"]}</span>'
        f'<h3>{esc(g["name"])}</h3></span>'
        f'<p>{esc(g["text"])}</p>'
        f'{course}'
        f'<span class="card-foot">{"".join(tags)}'
        f'<span class="card-go">Открыть&nbsp;→</span></span>'
        f'</a>'
    )


def jsonld(total: int) -> str:
    items = []
    n = 0
    for _, _, _, keys in GROUPS:
        for key in keys:
            n += 1
            items.append({
                "@type": "ListItem", "position": n,
                "name": GAMES[key]["name"],
                "description": GAMES[key]["text"],
                "url": f"https://meysternlp.ru/fredi/?m={key}",
            })
    blocks = [
        {"@context": "https://schema.org", "@type": "BreadcrumbList",
         "itemListElement": [
             {"@type": "ListItem", "position": 1, "name": "Главная",
              "item": "https://meysternlp.ru/"},
             {"@type": "ListItem", "position": 2, "name": "Виртуальный психолог",
              "item": "https://meysternlp.ru/virtual-psychologist/"},
             {"@type": "ListItem", "position": 3, "name": "Игры-тренажёры",
              "item": URL},
         ]},
        {"@context": "https://schema.org", "@type": "ItemList",
         "name": "Игры-тренажёры Фреди",
         "description": f"Каталог из {total} тренажёров навыков в приложении «Фреди»: "
                        "мышление, эмоции, границы, внимание и память.",
         "url": URL, "numberOfItems": total, "itemListElement": items},
        {"@context": "https://schema.org", "@type": "FAQPage",
         "mainEntity": [
             {"@type": "Question", "name": q,
              "acceptedAnswer": {"@type": "Answer", "text": a}}
             for q, a in FAQ]},
    ]
    return "\n".join(
        '<script type="application/ld+json">\n'
        + json.dumps(b, ensure_ascii=False, indent=2) + "\n</script>"
        for b in blocks
    )


NAV = ('<div id="header-placeholder"><nav aria-label="Основная навигация" '
       'style="display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center;'
       'padding:14px 20px;max-width:1200px;margin:0 auto">'
       '<a href="/" style="color:#3A86FF;text-decoration:none;font-size:.9rem;'
       'font-weight:700">А МЕЙСТЕР</a>'
       + "".join(
           f'<a href="{h}" style="color:#3A86FF;text-decoration:none;font-size:.9rem">{t}</a>'
           for h, t in [("/knigi/", "Книги"), ("/igry/", "Игры"),
                        ("/treningi/", "Тренинги"), ("/blog/", "Блог"),
                        ("/blog/lektorij/", "Лекторий"), ("/istorii/", "Истории"),
                        ("/sobytiya/", "Архив"),
                        ("/virtual-psychologist/", "Виртуальный психолог")])
       + "</nav></div>")

FOOT = ('<div id="footer-placeholder"><nav aria-label="Разделы сайта" '
        'style="display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center;'
        'padding:14px 20px;max-width:1200px;margin:0 auto">'
        + "".join(
            f'<a href="{h}" style="color:#3A86FF;text-decoration:none;font-size:.9rem">{t}</a>'
            for h, t in [("/", "Главная"), ("/obo-mne/", "Об авторе"),
                         ("/fredi/", "Фреди"), ("/kontakty/", "Контакты"),
                         ("/oferta/", "Оферта"),
                         ("/politika-konfidencialnosti/", "Конфиденциальность"),
                         ("/tarify/", "Тарифы")])
        + "</nav></div>")

METRIKA = ("<script type=\"text/javascript\">(function(m,e,t,r,i,k,a){m[i]=m[i]||function()"
           "{(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;"
           "j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}"
           "k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,"
           "a.parentNode.insertBefore(k,a)})(window,document,'script',"
           "'https://mc.yandex.ru/metrika/tag.js?id=108138656','ym');"
           "ym(108138656,'init',{ssr:true,webvisor:true,clickmap:true,"
           "accurateTrackBounce:true,trackLinks:true});</script>"
           "<noscript><div><img src=\"https://mc.yandex.ru/watch/108138656\" "
           "style=\"position:absolute;left:-9999px\" alt=\"\"></div></noscript>")

FONTS = """<style>/* Inter локально: с fonts.googleapis.com шрифт грузился блокирующе */
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-cyrillic.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-cyrillic-ext.woff2) format('woff2');unicode-range:U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F}
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
/* Эмодзи, которых нет в системном шрифте (старые Windows рисуют квадрат),
   подменяются своим файлом — tools/build_emoji_subset.py. */
@font-face{font-family:'Inter';font-weight:100 900;src:url('/fonts/noto-emoji-subset.woff2') format('woff2');unicode-range:U+2600-26FF,U+1F0CF,U+1F300-1F5FF,U+1F600-1F6FF,U+1F7E0-1F7EB,U+1F900-1FAFF;font-display:swap}
</style>"""

LOADERS = ("<script>(function(){fetch('/header.html').then(function(r){return r.text();})"
           ".then(function(html){var el=document.getElementById('header-placeholder');"
           "el.innerHTML=html;el.querySelectorAll('script').forEach(function(s){"
           "var n=document.createElement('script');for(var i=0;i<s.attributes.length;i++){"
           "n.setAttribute(s.attributes[i].name,s.attributes[i].value);}n.text=s.text;"
           "s.parentNode.replaceChild(n,s);});});})();</script>")

FOOT_LOADER = ("<script>(function(){fetch('/footer.html').then(function(r){return r.text();})"
               ".then(function(html){document.getElementById('footer-placeholder')"
               ".innerHTML=html;});})();</script>")


def build() -> str:
    total = sum(len(keys) for _, _, _, keys in GROUPS)
    no_ai = sum(1 for g in GAMES.values() if g.get("no_ai"))
    desc = (f"{total} игры-тренажёра приложения «Фреди»: разбор автоматических "
            f"мыслей, точное называние чувств, отказ под давлением, критическое "
            f"мышление, память и внимание. Открываются по ссылке, без установки.")

    toc = "".join(
        f'<li><a href="#{gid}">{esc(title)}</a></li>'
        for gid, title, _, _ in GROUPS
    )

    groups_html = []
    for gid, title, intro, keys in GROUPS:
        word = "тренажёр" if len(keys) == 1 else (
            "тренажёра" if 2 <= len(keys) <= 4 else "тренажёров")
        groups_html.append(
            f'<section class="group" id="{gid}">'
            f'<div class="group-head">'
            f'<span class="group-count">{len(keys)} {word}</span>'
            f'<h2>{esc(title)}</h2><p>{esc(intro)}</p></div>'
            f'<div class="grid">{"".join(card(k) for k in keys)}</div>'
            f'</section>'
        )

    faq_html = "".join(
        f'<div class="faq-item"><h3>{esc(q)}</h3><p>{a}</p></div>'
        for q, a in (
            (q, esc(a).replace("на странице тарифов",
                               '<a href="/tarify/">на странице тарифов</a>'))
            for q, a in FAQ
        )
    )

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Игры-тренажёры Фреди: {total} упражнение для головы · Андрей Мейстер</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{URL}">
<meta property="og:type" content="website">
<meta property="og:title" content="Игры-тренажёры Фреди">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{URL}">
<meta property="og:image" content="https://meysternlp.ru/og-image.jpg">
{FONTS}
<style>{STYLE}</style>
{jsonld(total)}
{METRIKA}
</head>
<body>
{NAV}
{LOADERS}
<main>
<div class="wrap">
<nav class="crumbs" aria-label="Хлебные крошки"><a href="/">Главная</a> · <a href="/virtual-psychologist/">Виртуальный психолог</a> · Игры-тренажёры</nav>

<div class="narrow">
<span class="eyebrow">Тренажёры Фреди</span>
<h1>{total} игра-тренажёр: не поговорить, а потренироваться</h1>
<p class="lede">Разговор с психологом объясняет, почему трудно отказать матери. Он не делает так, чтобы в следующий вторник вы отказали. Между «понял» и «получилось» лежит повторение, и обычно повторять негде: жизнь подкидывает такие ситуации редко и всегда некстати.</p>
<p class="lede">Поэтому у Фреди, кроме разговоров, есть игровой зал. Здесь на вас давят виной и срочностью, подсовывают кривые доводы, гонят поток символов мимо внимания — на чужих примерах, где ошибиться ничего не стоит. Открывается по ссылке, ставить ничего не нужно.</p>
</div>

<div class="first-step narrow">
<h2>С чего начать</h2>
<ul>
<li>Плохо прямо сейчас — <a href="/fredi/?m=sos">«Мне плохо прямо сейчас»</a>: дыхание и три шага на ближайший час.</li>
<li>Непонятно, за что браться, — <a href="/fredi/?m=kontur">«О чём ты умеешь думать»</a>: покажет, где мышление буксует.</li>
<li>Нужна одна вещь, которая пригодится завтра, — <a href="/fredi/?m=skazhinet">«Скажи „нет“»</a>.</li>
<li>Мысли идут по кругу — <a href="/fredi/?m=mysl">«Мысль под допросом»</a>.</li>
<li>Просто размяться пять минут — <a href="/fredi/?m=fokus">«Фокус»</a>, {no_ai - 1} других тренажёра проверяются на месте и не тратят лимит.</li>
</ul>
</div>

<div class="toc narrow">
<h2>Содержание</h2>
<ol>{toc}</ol>
</div>

<div class="hr"></div>

{"".join(groups_html)}

<div class="hr"></div>

<section class="faq narrow">
<h2>❓ Частые вопросы</h2>
{faq_html}
</section>

<section class="cta narrow">
<h2>Сначала поговорить</h2>
<p>Если непонятно, какой навык вам сейчас нужен, — это нормальный вопрос к Фреди. Расскажите, что происходит, и он подскажет, с чего начинать: с разговора или с тренажёра.</p>
<a class="btn" href="/virtual-psychologist/">🧠 Открыть Фреди</a>
<span class="cta-note">Анонимно, без установки. Что входит в бесплатный доступ — на странице <a href="/tarify/" style="color:#7fb0ff">тарифов</a>.</span>
</section>

</div>
</main>
{FOOT}
{FOOT_LOADER}
</body>
</html>
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    problems = check()
    for p in problems:
        print("  ✗", p)
    if problems:
        print(f"\nсостав разошёлся с fredi/app.js: {len(problems)} расхождений")
        return 1
    total = sum(len(keys) for _, _, _, keys in GROUPS)
    print(f"игр: {total}, групп: {len(GROUPS)}, состав сходится с fredi/app.js")
    if args.check:
        return 0

    html = build()
    if args.dry_run:
        print(f"--dry-run: получилось бы {len(html)} байт, файл не тронут")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"записано: {OUT.relative_to(ROOT)} ({len(html)} байт)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
