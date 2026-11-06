# -*- coding: utf-8 -*-
"""Посадочная под Директ: боль из реальных диалогов Фреди.

Собрано по 308 диалогам и 1610 репликам за 30 дней (analysis of
/api/analytics/messages/export). Люди приходят не за «техникой», а с
конкретной ситуацией:

  «Почему мужчина не отвечает, но и не блокирует»
  «Я всё время переживаю, что на меня могут обидеться»
  «Меня замучили навязчивые мысли»
  «Я чувствую себя униженным»
  «Постоянно тревога и беспокойство»
  «Взрослая дочь после её хамского поведения…»

Топ слов в репликах: хочу (132), боюсь (55), помоги (49), дома (48),
сказала/сказал/ответил/ответила (146 вместе).

Поэтому страница начинается со сцены, а не с продукта: сначала узнавание,
потом объяснение механизма, потом бесплатный разговор с Фреди, и только
в конце — платное.

    python3 tools/build_pain_landings.py            # пишет /lp/<slug>/index.html
    python3 tools/build_pain_landings.py --dry-run  # только список

Страницы noindex, canonical на /virtual-psychologist/, в sitemap не входят.
Цели Метрики:
  direct_lp_try   — ушёл в бесплатный разговор с Фреди (Telegram);
  direct_lp_fredi — ушёл в веб-приложение Фреди;
  direct_lp_voice — включил голосового Фреди на странице.
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://meysternlp.ru"
BOT = "https://t.me/Frederick777bot"
APP = "https://meysternlp.ru/fredi/"


METRIKA = """
<!-- Счётчик Метрики: без него цели direct_lp_* не срабатывали (07.11.2026). -->
<script type="text/javascript">
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();
for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=108138656','ym');
ym(108138656,'init',{ssr:true,webvisor:true,clickmap:true,referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/108138656" style="position:absolute;left:-9999px" alt=""></div></noscript>
"""

def page_html(slug, title, description, h1, lead, scene, mechanism, steps,
              proof, final_cta, cta_label):
    """Одна посадочная. Стиль — тёмный, как у витрин (главная, Лекторий)."""
    steps_html = "".join(
        '<li><b>%s</b><span>%s</span></li>' % (s[0], s[1]) for s in steps)
    return """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="{site}/virtual-psychologist/">
<link rel="stylesheet" href="/theme.js">
<style>
:root{{--bg:#0f1115;--card:#171a21;--line:#262b36;--text:#e8eaef;--muted:#9aa3b2;--acc:#3b82ff;--acc2:#8b5cf6}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}}
.wrap{{max-width:760px;margin:0 auto;padding:32px 20px 72px}}
h1{{font-size:1.9rem;line-height:1.25;margin:0 0 14px}}
h2{{font-size:1.25rem;margin:34px 0 12px}}
p{{margin:0 0 14px}}
.lead{{font-size:1.1rem;color:var(--text)}}
.scene{{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--acc);border-radius:14px;padding:18px 20px;margin:22px 0;color:var(--text)}}
.scene p{{margin:0 0 10px;font-style:italic;color:#cfd5e2}}
.scene p:last-child{{margin:0}}
ol.steps{{list-style:none;padding:0;margin:16px 0}}
ol.steps li{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:10px 0}}
ol.steps li b{{display:block;margin-bottom:2px}}
ol.steps li span{{color:var(--muted);font-size:.96rem}}
.cta{{display:block;text-align:center;background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;text-decoration:none;font-weight:700;padding:16px 22px;border-radius:14px;margin:24px 0 10px}}
.cta2{{display:block;text-align:center;color:var(--text);text-decoration:none;border:1px solid var(--line);padding:14px 22px;border-radius:14px;margin:10px 0}}
.small{{font-size:.88rem;color:var(--muted)}}
.proof{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:18px 0;font-size:.96rem;color:#cfd5e2}}
footer{{border-top:1px solid var(--line);margin-top:40px;padding-top:18px;font-size:.88rem;color:var(--muted)}}
</style>

{metrika}
</head>
<body>
<div class="wrap">
  <h1>{h1}</h1>
  <p class="lead">{lead}</p>
  <div class="scene">{scene}</div>
  <h2>Почему так происходит</h2>
  <p>{mechanism}</p>
  <h2>Что можно сделать сегодня</h2>
  <ol class="steps">{steps}</ol>
  <div class="proof">{proof}</div>
  <a class="cta" href="{bot}" target="_blank" rel="noopener"
     onclick="try{{ym(108138656,'reachGoal','direct_lp_try')}}catch(e){{}}">{cta_label}</a>
  <a class="cta2" href="{app}" onclick="try{{ym(108138656,'reachGoal','direct_lp_fredi')}}catch(e){{}}">
     Поговорить с Фреди в браузере — без установки
  </a>
  <p class="small">Фреди — виртуальный психолог, его разработал Андрей Мейстер.
     Он не заменяет врача и не ставит диагнозов. Если состояние тяжёлое — нужен
     специалист, и лучше не откладывать.</p>
  {final_cta}
  <footer>
     © Андрей Мейстер · <a href="{site}/virtual-psychologist/" style="color:var(--muted)">о Фреди</a>
     · <a href="{site}/blog/lektorij/" style="color:var(--muted)">Лекторий</a>
     · <a href="{site}/about/" style="color:var(--muted)">об авторе</a>
  </footer>
</div>
</body>
</html>
""".format(
        title=title, description=description, h1=h1, lead=lead,
        scene=scene, mechanism=mechanism, steps=steps_html, proof=proof,
        final_cta=final_cta, cta_label=cta_label, bot=BOT, app=APP, site=SITE, metrika=METRIKA)


PAGES = [
    dict(
        slug="on-ne-otvechaet",
        title="Он не отвечает — что это значит и что делать | Фреди",
        description="Он прочитал и молчит? Разбираем, что стоит за молчанием, "
                    "что не надо писать, и какой вопрос вернёт ясность.",
        h1="Он не отвечает. Третий час вы придумываете, что написали не так",
        lead="Молчание в переписке — самое мучительное, потому что в нём "
             "можно домыслить что угодно. Разберёмся, что делать по шагам.",
        scene="""<p>«Прочитал, но не ответил. Я перечитала нашу переписку три раза.
        Нашла, что в последнем сообщении я написала "неважно". Может, дело в этом?</p>
        <p>Через два часа написала ещё раз. Теперь вообще тишина — и мне уже
        кажется, что я всё испортила».</p>""",
        mechanism="""Мозг не терпит пустоты: на месте чужого молчания он достраивает
        худшее. Это не «женская тревожность» и не «вы слишком много думаете» —
        это то, как устроено внимание: неопределённость запускает поиск угрозы.
        Поэтому дело обычно не в вашем последнем сообщении, а в том, что
        тревога ищет выход и находит его в перечитывании. И пока вы гадаете,
        решение принимает не тот, кто отвечает, а тот, кто молчит.""",
        steps=[
            ("Стоп-пауза", "Ничего не писать 24 часа. Не из гордости — чтобы "
             "вернуть себе возможность выбирать, а не реагировать."),
            ("Один вопрос вместо десяти", "«Ты сейчас занят или не хочешь "
             "продолжать?» — он требует выбора, а не настроения."),
            ("Что не писать", "Не «ты меня игнорируешь», не «я всё поняла», "
             "не длинное письмо с оправданиями. Это не ответы, а запросы "
             "на утешение."),
            ("Разговор с Фреди", "Разобрать онлайн, что именно вас держит в "
             "этой переписке — обычно это одно конкретное место."),
        ],
        proof="""<b>Почему Фреди.</b> Он разбирает конкретную ситуацию, а не
        читает лекцию: спросит, что было написано, что вы чувствуете, чего
        боитесь услышать в ответе. Голосом — если проще говорить, чем писать.""",
        final_cta="",
        cta_label="Поговорить с Фреди бесплатно — Telegram",
    ),
    dict(
        slug="boyus-obidet",
        title="Боюсь кого-то задеть — как перестать извиняться за себя | Фреди",
        description="Постоянно переживаете, что на вас обидятся? Разбираем, "
                    "откуда берётся вина за чужое недовольство и как выйти из неё.",
        h1="«Я всё время переживаю, что на меня могут обидеться»",
        lead="Это не мягкость характера. Это привычка платить вниманием за "
             "право занимать место — и она изнашивает быстрее любой работы.",
        scene="""<p>«Сказала подруге, что не смогу прийти. Полдня придумываю
        объяснение, чтобы она не расстроилась. Она ответила "ок" — и я всё
        равно чувствую, что виновата.</p>
        <p>Так во всём. Проще согласиться, чем выдержать чужое раздражение».</p>""",
        mechanism="""За виной перед чужим недовольством стоит один и тот же
        механизм: вы считаете, что ваши действия должны вызывать только
        согласие. Тогда любое чужое «нет» переживается как ваш провал. Отсюда —
        извинения там, где не за что, и объяснения длиннее самой просьбы.
        Меняется это не «работой над самооценкой», а поведением: сначала
        выдерживаете одно короткое «нет», сказанное без оправданий.""",
        steps=[
            ("Найдите одно «нет»", "Ближайшая просьба, на которую не хочется "
             "соглашаться. Не самая страшная — средняя."),
            ("Скажите без оправданий", "«Не смогу». Без «потому что», без "
             "«ты не обижайся», без трёх извинений в конце."),
            ("Выдержите паузу", "Чужое «ок» — это не недовольство. Дайте себе "
             "пять минут не достраивать за человеком его настроение."),
            ("Разберите с Фреди", "Он поможет найти, чьё именно «недовольство» "
             "вы до сих пор досказываете — обычно это конкретный человек из прошлого."),
        ],
        proof="""<b>Почему Фреди.</b> Потому что совет «полюбите себя» нельзя
        выполнить, а «скажи не смогу и выдержи паузу» — можно сегодня вечером.""",
        final_cta="",
        cta_label="Начать с одного «нет» — бесплатно в Telegram",
    ),
    dict(
        slug="trevoga-bez-prichiny",
        title="Тревога без причины и навязчивые мысли | Фреди",
        description="Тревожитесь постоянно, мысли по кругу? Разбираем, как "
                    "вернуть контроль над вниманием и когда пора к врачу.",
        h1="Тревога, навязчивые мысли и чувство, что вы сходите с ума",
        lead="Тревога не требует причины. Она сама становится причиной — и "
             "съедает день, хотя ничего страшного не произошло.",
        scene="""<p>«Просыпаюсь — внутри уже тяжесть. Проверяю соцсети, перечитываю
        одно и то же, придумываю, что скажу завтра. К вечеру как выжатая, но
        сказать, что случилось, не могу».</p>""",
        mechanism="""Навязчивая мысль — это не правда о вас и не предсказание.
        Это действие, которое мозг повторяет, потому что оно снимает тревогу на
        несколько секунд. Чем чаще повторяете — тем сильнее закрепляется. Поэтому
        борьба с мыслью её усиливает, а смена действия — ослабляет.""",
        steps=[
            ("Назовите мысль", "«Сейчас у меня мысль, что случится плохое» — "
             "назвать вслух значит отделить себя от неё."),
            ("Не спорьте и не проверяйте", "Никаких «а вдруг» в поиске. "
             "Проверка — это топливо для тревоги, а не способ успокоиться."),
            ("Займите руки и глаза", "Тело, которое что-то делает, гасит "
             "круговорот быстрее, чем уговоры."),
            ("Разберите с Фреди", "Что именно вы боитесь упустить — и "
             "разберите, где тревога обоснована, а где нет."),
        ],
        proof="""<b>Важно.</b> Если тревога не даёт спать, есть панические атаки
        или мысли о вреде себе — это к врачу, и как можно раньше. Фреди не
        заменяет специалиста. Бесплатная помощь: 8-800-2000-122.""",
        final_cta="",
        cta_label="Разобрать тревогу с Фреди — бесплатно",
    ),
]


def main(argv):
    dry = "--dry-run" in argv
    out_root = os.path.join(ROOT, "lp")
    for p in PAGES:
        path = os.path.join(out_root, p["slug"], "index.html")
        if dry:
            print("lp/%s/  — %s" % (p["slug"], p["title"]))
            continue
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with io.open(path, "w", encoding="utf-8") as f:
            f.write(page_html(**p))
        print("ok:", path)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
