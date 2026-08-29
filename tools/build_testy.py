#!/usr/bin/env python3
"""Собирает раздел тестов: /testy/ + GAD-7 (тревога) + PHQ-9 (депрессия).

Зачем. «Тест на тревожность онлайн бесплатно» — один из самых массовых
запросов темы, и выдача по нему забита тестами-пустышками из десяти
картинок с воронкой в платный марафон. При этом существуют два коротких
опросника с огромной исследовательской базой, свободные для использования:
GAD-7 (тревога) и PHQ-9 (депрессия) — разработаны группой Спитцера и
Кроенке, открыто опубликованы и не требуют лицензии.

Честность конструкции:
- подсчёт локальный, в браузере; ответы никуда не отправляются и нигде
  не сохраняются — так и написано на странице;
- на странице прямо сказано, что это скрининг, а не диагноз;
- девятый вопрос PHQ-9 (мысли о смерти) при любом ответе кроме «совсем
  нет» показывает кризисный блок с телефонами — до общего результата;
- никакой разметки поверх того, что есть на странице: WebPage,
  BreadcrumbList и видимый FAQ с FAQPage.

Страницы собираются из данных, а не пишутся руками, чтобы формулировки
вопросов и пороги интерпретации жили в одном месте.

    python3 tools/build_testy.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://meysternlp.ru"
DATE = "2026-08-29"

OPTIONS = ["Совсем нет", "Несколько дней",
           "Больше половины дней", "Почти каждый день"]

GAD7 = dict(
    slug="trevoga-gad-7",
    scale="GAD-7",
    title="Тест на тревожность GAD-7: проверенная шкала онлайн",
    h1="Тест на тревожность (GAD-7)",
    desc="Бесплатный тест на тревожность по шкале GAD-7 — 7 вопросов, "
         "подсчёт прямо в браузере, ответы никуда не отправляются. "
         "Валидированный скрининг генерализованной тревоги, а не «тест по картинкам». "
         "С честной интерпретацией результата.",
    keywords="тест на тревожность, тест на тревожность онлайн бесплатно, шкала GAD-7, "
             "тест на тревожное расстройство, гад 7 тест, тест тревоги",
    intro=("Это не «узнай свой уровень тревожности по картинке». GAD-7 — короткий "
           "опросник, созданный группой Роберта Спитцера и Курта Кроенке для "
           "скрининга генерализованной тревоги; он открыто опубликован, свободен "
           "для использования и проверен в сотнях исследований. Семь вопросов, "
           "меньше двух минут."),
    question_lead="Как часто за последние 2 недели вас беспокоили следующие проблемы?",
    questions=[
        "Чувствовали нервозность, тревогу или напряжение «на взводе»",
        "Не могли прекратить беспокоиться или управлять беспокойством",
        "Слишком много беспокоились о самых разных вещах",
        "Вам было трудно расслабиться",
        "Были настолько неусидчивы, что трудно было оставаться на месте",
        "Легко раздражались и досадовали",
        "Испытывали страх, будто должно случиться что-то ужасное",
    ],
    crisis_q=None,
    bands=[
        (0, 4, "Минимальная тревога",
         "Уровень тревожных симптомов за последние две недели — в пределах обычного. "
         "Если при этом вам плохо, дело может быть не в тревоге как таковой: посмотрите "
         "разборы про <a href='/blog/vygoranie-ili-ustalost.html'>усталость и выгорание</a> "
         "или просто расскажите, что происходит, <a href='/fredi/'>Фреди</a>."),
        (5, 9, "Лёгкая тревога",
         "Симптомы есть, но выраженность небольшая. Обычно с таким уровнем хорошо "
         "работают навыки самопомощи: <a href='/blog/kak-spravitsya-s-trevogoj.html'>семь "
         "протоколов при тревоге</a>, сон и снижение стимуляторов. Есть смысл пройти тест "
         "снова через две недели и сравнить."),
        (10, 14, "Умеренная тревога",
         "С такого балла (10 и выше) авторы шкалы рекомендуют очную оценку специалиста — "
         "это порог, при котором тревога обычно уже мешает жить. Это не диагноз, но "
         "веский повод дойти до психотерапевта или психиатра и показать результат. Чем "
         "тревожность отличается от тревожного расстройства — "
         "<a href='/blog/trevozhnost-ili-trevozhnoe-rasstrojstvo.html'>подробный разбор</a>."),
        (15, 21, "Выраженная тревога",
         "Высокий уровень тревожных симптомов. Настоятельно стоит обратиться к "
         "психиатру или психотерапевту — очно и не откладывая: тревожные расстройства "
         "хорошо лечатся, и с таким баллом лечение обычно даёт заметное облегчение. "
         "Возьмите с собой результат теста."),
    ],
    faq=[
        ("Что такое шкала GAD-7?",
         "GAD-7 (Generalized Anxiety Disorder 7) — опросник из семи вопросов для скрининга "
         "генерализованной тревоги, разработанный группой Спитцера и Кроенке и открыто "
         "опубликованный в 2006 году. Один из двух самых используемых инструментов оценки "
         "тревоги в мире — в исследованиях и в обычных клиниках."),
        ("Ставит ли этот тест диагноз?",
         "Нет. Ни один опросник не ставит диагноз — GAD-7 измеряет выраженность тревожных "
         "симптомов за последние две недели, как термометр измеряет температуру. Балл 10 и "
         "выше — обоснованный повод дойти до специалиста; сам диагноз ставится только на "
         "очной оценке."),
        ("Куда отправляются мои ответы?",
         "Никуда. Подсчёт происходит в вашем браузере, на сервер не уходит ничего — ни "
         "ответы, ни результат. Можно проверить: страница работает даже без интернета, "
         "если её открыть заранее."),
        ("Почему балл высокий, а я не чувствую себя больным?",
         "Опросник ошибается в обе стороны: высокий балл бывает от бурной недели, недосыпа "
         "или шести чашек кофе в день. Поэтому он повод для разговора со специалистом, а не "
         "приговор. Верно и обратное: низкий балл при стойко плохом самочувствии — не "
         "причина отменять визит."),
    ],
)

PHQ9 = dict(
    slug="depressiya-phq-9",
    scale="PHQ-9",
    title="Тест на депрессию PHQ-9: проверенная шкала онлайн",
    h1="Тест на депрессию (PHQ-9)",
    desc="Бесплатный тест на депрессию по шкале PHQ-9 — 9 вопросов, подсчёт прямо "
         "в браузере, ответы никуда не отправляются. Валидированный скрининг "
         "депрессии с честной интерпретацией и без воронки в платный марафон.",
    keywords="тест на депрессию, тест на депрессию онлайн, шкала PHQ-9, тест на депрессию "
             "и тревожность, опросник депрессии, пхк 9",
    intro=("PHQ-9 — опросник из девяти вопросов по критериям депрессии, созданный той же "
           "группой Спитцера и Кроенке, что и GAD-7: открыто опубликован, свободен для "
           "использования, проверен в сотнях исследований и используется клиниками по "
           "всему миру. Девять вопросов, около двух минут. Часто его проходят в паре с "
           "<a href='/testy/trevoga-gad-7/'>тестом на тревогу</a> — состояния любят ходить вместе."),
    question_lead="Как часто за последние 2 недели вас беспокоили следующие проблемы?",
    questions=[
        "Слабый интерес или удовольствие от того, чем занимаетесь",
        "Подавленность, уныние или безнадёжность",
        "Трудно заснуть, прерывистый сон — или, наоборот, спали слишком много",
        "Усталость, ощущение, что нет сил",
        "Плохой аппетит — или переедание",
        "Плохие мысли о себе: что вы неудачник, что подвели себя или семью",
        "Трудно сосредоточиться — например, на чтении или телевизоре",
        "Двигались и говорили настолько медленно, что это замечали другие, — "
        "или, наоборот, были настолько суетливы, что двигались больше обычного",
        "Мысли о том, что лучше было бы умереть, или о причинении себе вреда",
    ],
    crisis_q=9,
    bands=[
        (0, 4, "Минимальные симптомы",
         "Выраженность депрессивных симптомов за две недели — в пределах обычного. Если "
         "при этом «всё есть, а радости нет» — возможно, вам в другую сторону: "
         "<a href='/blog/ekzistencialnaya-pustota-net-smysla.html'>разбор про пустоту и смысл</a>."),
        (5, 9, "Лёгкие симптомы",
         "Симптомы есть, но лёгкие. Что обычно помогает на этом уровне: режим сна, движение, "
         "живые люди, посильные дела — и наблюдение за собой. Повторите тест через две недели; "
         "если балл растёт — к специалисту. Про разницу тоски и болезни — "
         "<a href='/blog/gore-ili-depressiya.html'>«Горе или депрессия»</a>."),
        (10, 14, "Умеренные симптомы",
         "С балла 10 авторы шкалы рекомендуют очную оценку специалиста. Это не диагноз, "
         "но уровень, на котором состояние обычно уже отбирает работу, сон и отношения. "
         "Психиатр или психотерапевт — обычные врачи; возьмите результат с собой."),
        (15, 19, "Выраженные симптомы",
         "Серьёзный уровень. Настоятельно рекомендуем очную консультацию психиатра в "
         "ближайшее время — депрессия лечится, и на этом уровне лечение обычно "
         "заметно возвращает силы и краски."),
        (20, 27, "Тяжёлые симптомы",
         "Очень высокий балл. Пожалуйста, обратитесь к психиатру как можно быстрее — "
         "очно, не откладывая на «после праздников». Это состояние, с которым не надо "
         "справляться в одиночку, и оно поддаётся лечению."),
    ],
    faq=[
        ("Что такое шкала PHQ-9?",
         "PHQ-9 (Patient Health Questionnaire 9) — опросник из девяти вопросов, построенный "
         "прямо на диагностических критериях депрессии. Разработан группой Спитцера и Кроенке, "
         "открыто опубликован, свободен для использования и является одним из стандартных "
         "инструментов скрининга депрессии в мире."),
        ("Ставит ли этот тест диагноз «депрессия»?",
         "Нет. Опросник измеряет выраженность симптомов за две недели; диагноз ставится "
         "только на очной оценке врачом. Балл 10 и выше — обоснованный повод такую оценку "
         "получить. Низкий балл при стойко плохом состоянии тоже не отменяет визита: "
         "опросники ошибаются в обе стороны."),
        ("Куда отправляются мои ответы?",
         "Никуда. Подсчёт идёт в вашем браузере; ни ответы, ни результат не передаются и "
         "не сохраняются. Это принципиально для теста с такими вопросами."),
        ("Что делать, если я ответил «да» на вопрос о мыслях о смерти?",
         "Отнестись к этому серьёзно, даже если балл в целом невысокий. Если мысли "
         "настойчивые или есть план — позвоните 112 или на телефон доверия прямо сейчас; "
         "детям и подросткам — 8-800-2000-122, бесплатно и анонимно. Если мысли редкие и "
         "пугают вас самих — это тоже разговор для психиатра, и чем раньше, тем лучше."),
    ],
)

STYLE = """
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,sans-serif;background:#fff;color:#1D1D1F;line-height:1.7;overflow-wrap:break-word}
.container{max-width:840px;margin:0 auto;padding:0 20px 60px}
.crumbs{font-size:.85rem;color:#6E6E73;margin:26px 0 30px}
.crumbs a{color:#6E6E73;text-decoration:none}
.crumbs a:hover{color:#3A86FF}
h1{font-size:clamp(1.9rem,5vw,2.7rem);font-weight:600;line-height:1.2;letter-spacing:-.02em;margin:0 0 16px}
h2{font-size:clamp(1.35rem,3.6vw,1.8rem);font-weight:600;margin:46px 0 18px}
h3{font-size:1.15rem;font-weight:600;margin:26px 0 8px}
p{font-size:1.08rem;font-weight:300;margin-bottom:1.2rem}
a{color:#3A86FF}
.badges{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 24px}
.badge{font-size:.82rem;border:1px solid #E0E0E0;border-radius:30px;padding:5px 14px;color:#6E6E73}
.lede{font-size:1.12rem;color:#4A5563}
.privacy{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;padding:16px 20px;margin:24px 0;font-size:.98rem}
.qcard{background:#F5F5F7;border:1px solid #E4E4E7;border-radius:16px;padding:20px 22px;margin:14px 0}
.qcard .qt{font-weight:500;margin-bottom:12px;font-size:1.05rem}
.opts{display:grid;gap:8px}
.opts label{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #E0E0E0;border-radius:10px;padding:11px 14px;cursor:pointer;font-size:.98rem;font-weight:300;transition:border-color .15s}
.opts label:hover{border-color:#3A86FF}
.opts input{accent-color:#3A86FF;width:18px;height:18px;flex:none}
.opts label.sel{border-color:#3A86FF;background:#F0F6FF}
.lead-q{font-weight:600;margin:26px 0 4px}
.submit{display:block;width:100%;border:none;border-radius:14px;padding:17px;font-size:1.1rem;font-weight:600;color:#fff;background:#3A86FF;cursor:pointer;margin:26px 0 8px;font-family:inherit}
.submit:hover{background:#1f6ae0}
.submit[disabled]{background:#B9C4D8;cursor:not-allowed}
.remain{text-align:center;color:#6E6E73;font-size:.9rem;min-height:1.3em}
#result{display:none;margin-top:10px}
#result.show{display:block}
.res-card{border:2px solid #3A86FF;border-radius:18px;padding:26px 28px;margin:20px 0}
.res-score{font-size:1.05rem;color:#6E6E73;margin-bottom:6px}
.res-band{font-size:1.5rem;font-weight:700;margin-bottom:12px}
.res-text p{margin-bottom:.8rem}
.res-scalebar{position:relative;height:10px;border-radius:6px;margin:18px 0 6px;background:linear-gradient(90deg,#4ADE80,#FDE047,#FB923C,#EF4444)}
.res-dot{position:absolute;top:-5px;width:20px;height:20px;border-radius:50%;background:#1D1D1F;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35);transform:translateX(-50%)}
.res-limits{display:flex;justify-content:space-between;font-size:.8rem;color:#8A93A3;margin-bottom:12px}
.crisis{display:none;background:#FEF2F2;border:2px solid #FCA5A5;border-radius:16px;padding:22px 24px;margin:18px 0}
.crisis.show{display:block}
.crisis b{color:#B91C1C}
.disclaimer{background:#FFF8E7;border:1px solid #F0E2C0;border-radius:14px;padding:16px 20px;margin:24px 0;font-size:.95rem}
.next-box{background:#F5F5F7;border-radius:16px;padding:22px 24px;margin:22px 0}
.next-box a.btn{display:inline-block;background:#3A86FF;color:#fff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:10px;margin-top:8px}
.faq-item{border-top:1px solid #E7E7EA;padding:18px 0 4px}
.retake{background:none;border:1px solid #3A86FF;color:#3A86FF;border-radius:10px;padding:10px 18px;cursor:pointer;font-family:inherit;font-size:.95rem;margin-top:6px}
.tests-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;margin:30px 0}
.test-card{border:1px solid #E0E0E0;border-radius:18px;padding:24px 26px;text-decoration:none;color:#1D1D1F;display:block;transition:border-color .2s,transform .2s}
.test-card:hover{border-color:#3A86FF;transform:translateY(-2px)}
.test-card h3{margin:0 0 8px}
.test-card p{font-size:.97rem;color:#4A5563;margin:0 0 10px}
.test-card .meta{font-size:.85rem;color:#8A93A3}
"""

FONTS = """<style>/* Inter локально: с fonts.googleapis.com шрифт грузился блокирующе */
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-cyrillic.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
/* Эмодзи, которых нет в системном шрифте, подменяются своим файлом — tools/build_emoji_subset.py. */
@font-face{font-family:'Inter';font-weight:100 900;src:url('/fonts/noto-emoji-subset.woff2') format('woff2');unicode-range:U+2600-26FF,U+1F0CF,U+1F300-1F5FF,U+1F600-1F6FF,U+1F7E0-1F7EB,U+1F900-1FAFF;font-display:swap}
</style>"""

NAV = ('<div id="header-placeholder"><nav aria-label="Основная навигация" '
       'style="display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center;'
       'padding:14px 20px;max-width:1200px;margin:0 auto">'
       '<a href="/" style="color:#3A86FF;text-decoration:none;font-size:.9rem;font-weight:700">А МЕЙСТЕР</a>'
       + "".join(f'<a href="{h}" style="color:#3A86FF;text-decoration:none;font-size:.9rem">{t}</a>'
                 for h, t in [("/knigi/", "Книги"), ("/igry/", "Игры"), ("/treningi/", "Тренинги"),
                              ("/blog/", "Блог"), ("/blog/lektorij/", "Лекторий"),
                              ("/istorii/", "Истории"), ("/sobytiya/", "Архив"),
                              ("/virtual-psychologist/", "Виртуальный психолог")])
       + "</nav></div>"
       "<script>(function(){fetch('/header.html').then(function(r){return r.text();})"
       ".then(function(html){var el=document.getElementById('header-placeholder');"
       "el.innerHTML=html;el.querySelectorAll('script').forEach(function(s){"
       "var n=document.createElement('script');for(var i=0;i<s.attributes.length;i++){"
       "n.setAttribute(s.attributes[i].name,s.attributes[i].value);}n.text=s.text;"
       "s.parentNode.replaceChild(n,s);});});})();</script>")

FOOT = ('<div id="footer-placeholder"><nav aria-label="Разделы сайта" '
        'style="display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center;'
        'padding:14px 20px;max-width:1200px;margin:0 auto">'
        + "".join(f'<a href="{h}" style="color:#3A86FF;text-decoration:none;font-size:.9rem">{t}</a>'
                  for h, t in [("/", "Главная"), ("/obo-mne/", "Об авторе"), ("/fredi/", "Фреди"),
                               ("/kontakty/", "Контакты"), ("/oferta/", "Оферта"),
                               ("/politika-konfidencialnosti/", "Конфиденциальность"),
                               ("/tarify/", "Тарифы")])
        + "</nav></div>"
        "<script>(function(){fetch('/footer.html').then(function(r){return r.text();})"
        ".then(function(html){document.getElementById('footer-placeholder')"
        ".innerHTML=html;});})();</script>")

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

CRISIS_HTML = """<div class="crisis" id="crisisBox">
<p><b>Пожалуйста, прочтите это до результата.</b> Вы отметили, что за последние две недели у вас бывали мысли о смерти или о причинении себе вреда. Какой бы ни была общая сумма баллов, это самый важный ответ теста.</p>
<p>Если такие мысли настойчивы или у вас есть план — позвоните <b>112</b> прямо сейчас. Детям и подросткам: телефон доверия <b>8-800-2000-122</b>, бесплатно, анонимно, круглосуточно.</p>
<p style="margin-bottom:0">Если мысли редкие и пугают вас самих — это разговор для психиатра, очно и в ближайшие дни. Это обычный врач, и такие разговоры — его ежедневная работа.</p>
</div>"""


def jsonld(t: dict, url: str) -> str:
    blocks = [
        {"@context": "https://schema.org", "@type": "WebPage",
         "name": t["title"], "description": t["desc"], "url": url,
         "inLanguage": "ru-RU", "datePublished": DATE, "dateModified": DATE,
         "author": {"@type": "Person", "@id": f"{SITE}/#person",
                    "name": "Андрей Мейстер", "url": f"{SITE}/obo-mne/"}},
        {"@context": "https://schema.org", "@type": "BreadcrumbList",
         "itemListElement": [
             {"@type": "ListItem", "position": 1, "name": "Главная", "item": f"{SITE}/"},
             {"@type": "ListItem", "position": 2, "name": "Тесты", "item": f"{SITE}/testy/"},
             {"@type": "ListItem", "position": 3, "name": t["h1"], "item": url}]},
        {"@context": "https://schema.org", "@type": "FAQPage",
         "mainEntity": [{"@type": "Question", "name": q,
                         "acceptedAnswer": {"@type": "Answer", "text": a}}
                        for q, a in t["faq"]]},
    ]
    return "\n".join('<script type="application/ld+json">\n'
                     + json.dumps(b, ensure_ascii=False, indent=2)
                     + "\n</script>" for b in blocks)


def test_page(t: dict) -> str:
    url = f"{SITE}/testy/{t['slug']}/"
    n = len(t["questions"])
    max_score = n * 3
    qs_html = []
    for i, q in enumerate(t["questions"], 1):
        opts = "".join(
            f'<label><input type="radio" name="q{i}" value="{v}">{o}</label>'
            for v, o in enumerate(OPTIONS))
        qs_html.append(
            f'<div class="qcard"><div class="qt">{i}. {q}</div>'
            f'<div class="opts">{opts}</div></div>')

    bands_js = json.dumps(
        [{"lo": lo, "hi": hi, "name": name, "html": html}
         for lo, hi, name, html in t["bands"]], ensure_ascii=False)

    faq_html = "".join(
        f'<div class="faq-item"><h3>{q}</h3><p>{a}</p></div>'
        for q, a in t["faq"])

    crisis = CRISIS_HTML if t["crisis_q"] else ""
    crisis_js = f"""
      var c9 = document.querySelector('input[name="q{t["crisis_q"]}"]:checked');
      document.getElementById('crisisBox').classList.toggle('show', c9 && c9.value !== '0');""" if t["crisis_q"] else ""

    other = PHQ9 if t is GAD7 else GAD7
    other_label = ("Тест на депрессию (PHQ-9)" if t is GAD7 else "Тест на тревожность (GAD-7)")

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow"><meta name="yandex" content="index, follow">
<title>{t['title']} | Андрей Мейстер</title>
<meta name="description" content="{t['desc']}">
<meta name="keywords" content="{t['keywords']}">
<meta property="og:type" content="website"><meta property="og:title" content="{t['h1']}">
<meta property="og:description" content="{t['desc']}"><meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/og-image.jpg"><meta property="og:locale" content="ru_RU">
<link rel="canonical" href="{url}">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">
{jsonld(t, url)}
{FONTS}
<style>{STYLE}</style>
{METRIKA}
</head>
<body>
{NAV}
<main class="container">
<nav class="crumbs" aria-label="Хлебные крошки"><a href="/">Главная</a> / <a href="/testy/">Тесты</a> / {t['h1']}</nav>
<h1>{t['h1']}</h1>
<div class="badges"><span class="badge">📋 {n} вопросов</span><span class="badge">⏱ около 2 минут</span><span class="badge">🔒 ответы не отправляются</span><span class="badge">📚 валидированная шкала {t['scale']}</span></div>
<p class="lede">{t['intro']}</p>
<div class="privacy">🔒 <b>Приватность:</b> подсчёт происходит в вашем браузере. Ответы и результат никуда не отправляются и нигде не сохраняются — проверить можно, отключив интернет после загрузки страницы.</div>
<div class="disclaimer">⚠️ Это скрининг, а не диагноз: опросник измеряет выраженность симптомов, как термометр — температуру. Диагноз ставит только специалист на очной оценке. Результат теста — повод для разговора с ним, в обе стороны.</div>

<form id="testForm" onsubmit="return false">
<p class="lead-q">{t['question_lead']}</p>
{''.join(qs_html)}
<button class="submit" id="submitBtn" disabled>Показать результат</button>
<p class="remain" id="remain">Отвечено 0 из {n}</p>
</form>

<div id="result">
{crisis}
<div class="res-card">
<div class="res-score">Ваш результат: <b id="scoreNum"></b> из {max_score}</div>
<div class="res-band" id="bandName"></div>
<div class="res-scalebar"><div class="res-dot" id="scaleDot"></div></div>
<div class="res-limits"><span>0</span><span>{max_score}</span></div>
<div class="res-text" id="bandText"></div>
</div>
<div class="next-box">
<b>Что дальше.</b>
<p style="margin:8px 0 0">Результат можно разобрать словами — что стоит за баллами именно у вас: <a class="btn" href="/fredi/">Обсудить с Фреди</a></p>
<p style="margin:14px 0 0;font-size:.95rem;color:#4A5563">Рядом: <a href="/testy/{other['slug']}/">{other_label}</a> — эти состояния часто ходят парой.</p>
</div>
<button class="retake" onclick="location.reload()">Пройти заново</button>
</div>

<h2>❓ Частые вопросы</h2>
{faq_html}

<p style="font-size:.9rem;color:#8A93A3;margin-top:34px">Шкала {t['scale']} разработана группой Р. Спитцера, К. Кроенке и Дж. Уильямс, открыто опубликована и свободна для использования. Русский текст — стандартный перевод формулировок опросника. Интерпретация порогов — по публикациям авторов шкалы.</p>
</main>
{FOOT}
<script>
(function () {{
  var N = {n};
  var form = document.getElementById('testForm');
  var btn = document.getElementById('submitBtn');
  var remain = document.getElementById('remain');
  var BANDS = {bands_js};
  function answered() {{
    var k = 0;
    for (var i = 1; i <= N; i++) if (form.querySelector('input[name="q' + i + '"]:checked')) k++;
    return k;
  }}
  form.addEventListener('change', function (e) {{
    if (e.target && e.target.type === 'radio') {{
      var card = e.target.closest('.opts');
      card.querySelectorAll('label').forEach(function (l) {{ l.classList.remove('sel'); }});
      e.target.closest('label').classList.add('sel');
    }}
    var k = answered();
    remain.textContent = 'Отвечено ' + k + ' из ' + N;
    btn.disabled = k < N;
  }});
  btn.addEventListener('click', function () {{
    var sum = 0;
    for (var i = 1; i <= N; i++) sum += +form.querySelector('input[name="q' + i + '"]:checked').value;
    var band = BANDS.filter(function (b) {{ return sum >= b.lo && sum <= b.hi; }})[0];
    document.getElementById('scoreNum').textContent = sum;
    document.getElementById('bandName').textContent = band.name;
    document.getElementById('bandText').innerHTML = '<p>' + band.html + '</p>';
    document.getElementById('scaleDot').style.left = (sum / {max_score} * 100) + '%';
    {crisis_js}
    form.style.display = 'none';
    document.getElementById('result').classList.add('show');
    try {{ document.getElementById('result').scrollIntoView({{behavior: 'smooth'}}); }} catch (e) {{}}
    try {{ ym(108138656, 'reachGoal', 'test_{t["slug"].replace("-", "_")}_done'); }} catch (e) {{}}
  }});
}})();
</script>
</body>
</html>
"""


def hub_page() -> str:
    url = f"{SITE}/testy/"
    lds = [
        {"@context": "https://schema.org", "@type": "CollectionPage",
         "name": "Психологические тесты с проверенными шкалами",
         "description": "Тесты на тревожность и депрессию по валидированным шкалам "
                        "GAD-7 и PHQ-9: подсчёт в браузере, без регистрации, ответы "
                        "никуда не отправляются.",
         "url": url, "inLanguage": "ru-RU"},
        {"@context": "https://schema.org", "@type": "BreadcrumbList",
         "itemListElement": [
             {"@type": "ListItem", "position": 1, "name": "Главная", "item": f"{SITE}/"},
             {"@type": "ListItem", "position": 2, "name": "Тесты", "item": url}]},
    ]
    ld = "\n".join('<script type="application/ld+json">\n'
                   + json.dumps(b, ensure_ascii=False, indent=2)
                   + "\n</script>" for b in lds)
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow">
<title>Психологические тесты: проверенные шкалы, а не картинки | Андрей Мейстер</title>
<meta name="description" content="Тесты на тревожность (GAD-7) и депрессию (PHQ-9) по валидированным шкалам: 2 минуты, подсчёт в браузере, без регистрации и без воронки в платный марафон. Честная интерпретация результата.">
<meta name="keywords" content="психологические тесты онлайн, тест на тревожность, тест на депрессию, проверенные психологические тесты, GAD-7, PHQ-9">
<meta property="og:type" content="website"><meta property="og:title" content="Психологические тесты: проверенные шкалы">
<meta property="og:description" content="GAD-7 и PHQ-9: валидированные тесты без регистрации, подсчёт в браузере.">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}/og-image.jpg">
<link rel="canonical" href="{url}">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">
{ld}
{FONTS}
<style>{STYLE}</style>
{METRIKA}
</head>
<body>
{NAV}
<main class="container">
<nav class="crumbs" aria-label="Хлебные крошки"><a href="/">Главная</a> / Тесты</nav>
<h1>Тесты: проверенные шкалы, а не картинки</h1>
<p class="lede">По запросу «психологический тест» интернет выдаёт «узнай себя по картинке» с воронкой в платный марафон. Здесь другое: два коротких опросника с огромной исследовательской базой, которыми пользуются клиники по всему миру. Оба открыто опубликованы и свободны для использования; подсчёт идёт в вашем браузере, ответы никуда не отправляются.</p>
<div class="tests-grid">
<a class="test-card" href="/testy/trevoga-gad-7/">
<h3>😰 Тест на тревожность</h3>
<p>Шкала GAD-7: скрининг генерализованной тревоги. Насколько тревога за последние две недели выходит за рамки обычной.</p>
<span class="meta">7 вопросов · ~2 минуты · Спитцер, Кроенке и др.</span>
</a>
<a class="test-card" href="/testy/depressiya-phq-9/">
<h3>🌧 Тест на депрессию</h3>
<p>Шкала PHQ-9: девять вопросов по диагностическим критериям депрессии. С бережным кризисным блоком.</p>
<span class="meta">9 вопросов · ~2 минуты · Спитцер, Кроенке и др.</span>
</a>
</div>
<div class="disclaimer">⚠️ Оба теста — скрининг, а не диагноз. Они измеряют выраженность симптомов, как термометр — температуру; диагноз ставит специалист на очной оценке. Балл 10 и выше в любом из них — обоснованный повод до такой оценки дойти.</div>
<h2>Почему здесь нет других тестов</h2>
<p>Потому что честных коротких шкал, свободных для публикации, немного, а «авторские тесты из 10 картинок» мы не делаем принципиально: у них нет ни валидности, ни надёжности, и они существуют ради воронки продаж. Как отличать настоящие тесты от пустышек — разобрано в <a href="/blog/lekciya-diag-7-testy-pustyshki.html">лекции про тесты-пустышки</a>; что вообще значит «валидность» — в <a href="/blog/lekciya-diag-2-nadezhnost-validnost.html">лекции про надёжность и валидность</a>.</p>
<p>Разобрать результат словами и понять, что за ним стоит именно у вас, можно с <a href="/virtual-psychologist/">Фреди</a> — бесплатно и без регистрации.</p>
</main>
{FOOT}
</body>
</html>
"""


def main() -> int:
    out = ROOT / "testy"
    (out / "trevoga-gad-7").mkdir(parents=True, exist_ok=True)
    (out / "depressiya-phq-9").mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(hub_page(), encoding="utf-8")
    (out / "trevoga-gad-7" / "index.html").write_text(test_page(GAD7), encoding="utf-8")
    (out / "depressiya-phq-9" / "index.html").write_text(test_page(PHQ9), encoding="utf-8")
    for p in ["index.html", "trevoga-gad-7/index.html", "depressiya-phq-9/index.html"]:
        print("записано: testy/" + p, (out / p).stat().st_size, "байт")
    return 0


if __name__ == "__main__":
    sys.exit(main())
