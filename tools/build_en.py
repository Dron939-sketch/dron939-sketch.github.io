#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Английская витрина сайта: /en/, /en/about/, /en/fredi/, /en/lectorium/,
/en/collaboration/ (решение владельца, 29.10.2026: сайт на двух языках,
по умолчанию русский; начинаем с витрины, а не с перевода всех страниц).

Правки текстов — только здесь, затем:
    python3 tools/build_en.py && python3 tools/check_site.py

Факты на страницах — только проверяемые (профиль на vsetreningi.ru,
карточка книги на LiveLib/Ozon, сам сайт). «Более 50 публикаций» с
русской /about/ сюда не перенесено: подтверждения не нашлось.
Русские пары страниц и hreflang — в PAIRS; переключатель RU/EN в шапке
русских страниц берёт адрес из <link rel="alternate" hreflang="en">.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://meysternlp.ru"

# 2013–2023 в «Пути» — со слов владельца (29.10.2026).
# английский адрес → русская пара
PAIRS = {
    "/en/": "/",
    "/en/about/": "/about/",
    "/en/fredi/": "/virtual-psychologist/",
    "/en/lectorium/": "/blog/lektorij/",
    "/en/collaboration/": "/sotrudnichestvo/",
}

FONTS = """<style>
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(/fonts/inter-cyrillic.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:'Playfair Display';font-style:normal;font-weight:400 900;font-display:swap;src:url(/fonts/playfair-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Playfair Display';font-style:normal;font-weight:400 900;font-display:swap;src:url(/fonts/playfair-cyrillic.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
</style>"""

CSS = """<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#090c1a;--ink:#fff;--text:#D3D8E0;--muted:#9AA3B2;--accent:#3A86FF;--accent2:#8EC5FF;--card:rgba(255,255,255,.035);--line:rgba(58,134,255,.28)}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.65;-webkit-font-smoothing:antialiased;overflow-wrap:break-word}
a{color:var(--accent2)}
.wrap{max-width:1160px;margin:0 auto;padding:0 20px}
.hd{position:sticky;top:0;z-index:10;background:rgba(9,12,26,.94);backdrop-filter:blur(10px);border-bottom:1px solid rgba(58,134,255,.18)}
.hd .wrap{display:flex;align-items:center;gap:18px;min-height:68px;flex-wrap:wrap}
.logo{color:#fff;text-decoration:none;letter-spacing:.3em;font-weight:300;font-size:1.2rem;white-space:nowrap}
.logo span{color:var(--accent)}
.nav{display:flex;gap:18px;flex-wrap:wrap;margin-left:auto;align-items:center}
.nav a{color:#E6E8EB;text-decoration:none;font-size:.86rem;letter-spacing:.08em;text-transform:uppercase}
.nav a:hover,.nav a[aria-current]{color:var(--accent2)}
.nav .lang{border:1px solid var(--line);border-radius:999px;padding:3px 10px;letter-spacing:.06em}
@media(max-width:760px){.hd .wrap{padding-top:8px;padding-bottom:8px;min-height:0;flex-wrap:nowrap;gap:10px}.logo{font-size:1rem;letter-spacing:.2em}.nav{margin-left:auto;gap:12px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}.nav::-webkit-scrollbar{display:none}.nav a{font-size:.72rem;letter-spacing:.04em;white-space:nowrap}.nav a[href='/en/about/'],.nav a[href='/en/collaboration/']{display:none}}
.hero{background:radial-gradient(900px 620px at 18% 12%,#1c2a5c 0%,#0f1633 50%,#090c1a 100%);padding:clamp(36px,7vw,72px) 0 clamp(30px,5vw,48px)}
h1,h2,.serif{font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-weight:600;color:var(--ink);line-height:1.12}
h1{font-size:clamp(2.3rem,6.4vw,3.8rem);margin:0 0 14px}
h2{font-size:clamp(1.6rem,4.5vw,2.3rem);margin:0 0 6px}
.sub{color:var(--accent2);font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;margin:0 0 22px}
.lead{font-size:clamp(1.02rem,3.7vw,1.15rem);color:var(--text);max-width:700px;margin:0 0 18px}
.grid2{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr);gap:28px;align-items:center}
@media(max-width:860px){.grid2{grid-template-columns:1fr}.face{order:-1;width:78%;max-width:320px;margin:0 auto 18px}}
.face{aspect-ratio:1/1;overflow:hidden}
.face video,.face img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 0;mix-blend-mode:lighten;-webkit-mask-image:linear-gradient(#000 72%,transparent 100%);mask-image:linear-gradient(#000 72%,transparent 100%)}
.portrait{border-radius:18px;overflow:hidden;max-width:360px}
.portrait img{display:block;width:100%;height:auto}
.cred{margin:-4px 0 18px;max-width:680px;color:var(--accent2);font-size:clamp(.95rem,3.5vw,1.05rem)}
.cred a{color:#C9D9FF;white-space:nowrap}
.ach{list-style:none;margin:0 0 22px;max-width:680px}
.ach li{position:relative;padding-left:20px;margin:0 0 10px;font-size:clamp(1rem,3.7vw,1.12rem)}
.ach li::before{content:'';position:absolute;left:0;top:.62em;width:8px;height:8px;border-radius:50%;background:var(--accent)}
.ach b{color:#fff}
.new{display:block;max-width:620px;padding:16px 20px;border:1px solid rgba(58,134,255,.55);border-radius:14px;background:linear-gradient(135deg,rgba(58,134,255,.16),rgba(123,47,247,.10));text-decoration:none;color:#E6E8EB}
.new:hover{border-color:var(--accent)}
.new .k{display:block;font-size:.75rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent2);margin-bottom:4px}
.new b{display:block;font-family:'Playfair Display',Georgia,serif;font-size:1.45rem;font-weight:600;color:#fff;margin-bottom:4px}
.new .t{display:block;font-size:.95rem;color:#C9CED6}
.sec{padding:clamp(34px,6vw,56px) 0}
.pos{max-width:760px;padding:4px 0 4px 20px;border-left:2px solid rgba(58,134,255,.55)}
.pos h2{margin-bottom:14px}
.pos p{font-size:clamp(1rem,3.7vw,1.1rem);margin:0 0 12px}
.pos .last{color:#fff;font-weight:600}
.pos .sign{font-family:'Playfair Display',Georgia,serif;font-style:italic;color:var(--accent2);margin:0}
.partner{display:flex;align-items:center;gap:22px;max-width:720px}
.partner img{flex:none;width:160px;height:auto}
.partner p{margin:0}
.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:900px;counter-reset:st}
.steps li{position:relative;padding:16px 16px 16px 50px;border:1px solid rgba(255,255,255,.12);border-radius:14px;color:#9AA3B2}
.steps li::before{counter-increment:st;content:counter(st);position:absolute;left:14px;top:15px;width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,.25);font-size:.8rem;font-weight:700;line-height:20px;text-align:center}
.steps b{display:block;color:#fff;font-weight:600;margin-bottom:2px}
.steps span{display:block;font-size:.9rem}
.steps li.done::before{content:'✓';background:var(--accent);border-color:var(--accent);color:#fff}
.steps li.now{border-color:var(--accent);background:rgba(58,134,255,.10)}
.steps li.now::before{border-color:var(--accent);color:var(--accent2)}
@media(max-width:700px){.steps{grid-template-columns:1fr}}
@media(max-width:520px){.partner{flex-direction:column;align-items:flex-start;gap:14px}.partner img{width:140px}}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:760px){.cards{grid-template-columns:1fr}}
.card{display:block;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;text-decoration:none;color:var(--text)}
a.card:hover{border-color:var(--accent)}
.card .k{display:block;font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent2);margin-bottom:4px}
.card b{display:block;color:#fff;font-size:1.06rem;margin-bottom:4px}
.card p{font-size:.95rem;margin:0}
.ru{color:var(--muted);font-size:.85rem}
.facts{list-style:none;max-width:760px}
.facts li{display:grid;grid-template-columns:120px 1fr;gap:4px 14px;padding:12px 0;border-bottom:1px solid rgba(58,134,255,.15)}
.facts .y{color:var(--accent2);font-weight:600}
@media(max-width:600px){.facts li{grid-template-columns:1fr}}
.note{max-width:760px;border-left:2px solid rgba(58,134,255,.45);padding:2px 0 2px 16px;margin:18px 0;color:var(--text)}
.btn{display:inline-block;padding:13px 22px;border-radius:12px;background:var(--accent);color:#fff;text-decoration:none;font-weight:600}
.btn.o{background:transparent;border:1px solid rgba(58,134,255,.55);color:#E6E8EB}
form{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;max-width:720px}
label{display:block;font-weight:600;font-size:.95rem;margin:14px 0 6px;color:#fff}
label:first-child{margin-top:0}
input[type=text],textarea{width:100%;font:inherit;color:#fff;background:transparent;border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:11px 13px}
textarea{min-height:150px;resize:vertical}
.who{display:flex;flex-wrap:wrap;gap:8px}
.who label{margin:0;font-weight:500;font-size:.92rem;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:7px 14px;cursor:pointer;color:var(--text)}
.who input{position:absolute;opacity:0;pointer-events:none}
.who label:has(input:checked){border-color:var(--accent);color:var(--accent2)}
.hp{position:absolute;left:-9999px}
.send{margin-top:18px;padding:14px 28px;border:0;border-radius:12px;background:var(--accent);color:#fff;font:inherit;font-weight:600;cursor:pointer}
.send:disabled{opacity:.6}
.fine{font-size:.85rem;color:var(--muted);margin-top:12px}
.msg{margin-top:16px;padding:14px 16px;border-radius:12px;display:none}
.msg.ok{display:block;background:rgba(34,197,94,.14)}
.msg.err{display:block;background:rgba(239,68,68,.14)}
.ft{border-top:1px solid rgba(58,134,255,.18);padding:34px 0 40px;color:var(--muted);font-size:.9rem}
.ft .wrap{display:flex;flex-wrap:wrap;gap:12px 22px;align-items:center}
.ft a{color:#C9CED6;text-decoration:none}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
</style>"""

METRIKA = """<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=108138656', 'ym');ym(108138656, 'init', {ssr:true, webvisor:true, clickmap:true, accurateTrackBounce:true, trackLinks:true});</script>"""

ICONS = ('<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/svg+xml" href="/favicon.svg">'
         '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">')

NAV = [("/en/lectorium/", "Lectorium"), ("/en/fredi/", "Fredi"), ("/en/about/", "About"),
       ("/en/collaboration/", "Collaboration")]


def page(path, title, desc, body, ld=None):
    ru = PAIRS[path]
    nav = "".join(
        f'<a href="{u}"{" aria-current=\"page\"" if u == path else ""}>{t}</a>' for u, t in NAV)
    nav += f'<a class="lang" href="{ru}" hreflang="ru" lang="ru" title="Русская версия">RU</a>'
    crumbs = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/en/"}]
    if path != "/en/":
        crumbs.append({"@type": "ListItem", "position": 2, "name": title.split(" — ")[0].split(" | ")[0],
                       "item": SITE + path})
    lds = [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs}]
    if ld:
        lds.append(ld)
    ldtxt = "\n".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>'
                      for x in lds)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="index, follow">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{SITE}{path}">
<link rel="alternate" hreflang="en" href="{SITE}{path}">
<link rel="alternate" hreflang="ru" href="{SITE}{ru}">
<link rel="alternate" hreflang="x-default" href="{SITE}{ru}">
<meta property="og:type" content="website"><meta property="og:locale" content="en_US"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{SITE}{path}"><meta property="og:image" content="{SITE}/og-image.jpg">
{ldtxt}
{FONTS}
{CSS}
{METRIKA}
{ICONS}
</head>
<body>
<header class="hd"><div class="wrap"><a class="logo" href="/en/"><span>A</span> MEYSTER</a><nav class="nav" aria-label="Main">{nav}</nav></div></header>
<main>
{body}
</main>
<footer class="ft"><div class="wrap">
<span>© Andrey Meyster · 2026</span>
<a href="https://t.me/meysternlp" rel="noopener">Telegram</a>
<a href="https://vk.com/meysternlp" rel="noopener">VK</a>
<a href="https://rutube.ru/channel/29916593/" rel="noopener">Rutube</a>
<a href="mailto:dron939@yandex.ru">dron939@yandex.ru</a>
<a href="/politika-konfidencialnosti/" hreflang="ru">Privacy policy (in Russian)</a>
</div></footer>
</body></html>
"""


def card(href, kick, title, text, ru=True):
    # «In Russian» в каждой карточке читался как список недоступного
    # (фокус-группа, раунд 6) — одна пометка над блоком, здесь пусто.
    tail = ""
    return (f'<a class="card" href="{href}"><span class="k">{kick}</span><b>{title}</b>'
            f'<p>{text}{tail}</p></a>')


VIDEO = """<div class="face" aria-label="Andrey Meyster"><video autoplay loop muted playsinline preload="metadata" poster="/poster.webp" width="1280" height="720">
<source src="/hero-loop.webm" type="video/webm"><source src="/hero-loop.mp4" type="video/mp4"></video></div>"""

COOP = """<section class="sec"><div class="wrap">
<h2>Collaboration</h2>
<p class="lead">An idea, a task, a platform — a lecture for your company, an interview, joint research, games and methods for your clients? Make a proposal. Every one reaches the author.</p>
<a class="btn o" href="/en/collaboration/">Propose a collaboration</a>
<p style="margin-top:18px"><b>Press office</b> — interviews, comments, broadcasts: <a href="/en/collaboration/">send a request</a> (choose “Media or author”).</p>
</div></section>"""


def n_courses():
    """Число курсов Лектория — как в tools/sync_counters.py: каталоги
    blog/lektorij/<slug>/ со своей index.html. Руками не вписывать."""
    d = os.path.join(ROOT, "blog", "lektorij")
    return len([x for x in os.listdir(d)
                if os.path.exists(os.path.join(d, x, "index.html"))])


def home():
    # Пять карточек, как на русской главной (ФГ, раунд 7, 30.10.2026):
    # без «Разговорного гипноза» и «Историй»; Conceptual Base — в блоке статуса.
    cards = "".join([
        card("/en/lectorium/", "Open university · free, no sign-up", "Lectorium",
             "Courses of lectures on fear, decisions, relationships, money and thinking — from how it works to what to do."),
        card("/knigi/", "Books · three volumes, 200,000 copies", "The Theory of Manipulation",
             "How influence works and how to recognise it. Alongside: Variatika and Concepticon, on people and thinking."),
        card("/igry/", "Method", "Variatika and training games",
             "A skill is built by solving problems — at a table, in pairs or in a group."),
        card("/en/fredi/", "Companion · conversation is free", "Fredi — a virtual psychologist",
             "Conversation, tests and exercises, at night and at weekends. Talks in English.", ru=False),
        card("/testy/", "Questionnaires · free", "Tests",
             "Anxiety, mood, burnout, personality type. Every result comes with an explanation of what it means and what to do."),
    ])
    body = f"""<section class="hero"><div class="wrap"><div class="grid2"><div>
<h1>Andrey Meyster</h1>
<p class="cred">Psychologist, Candidate of Psychological Sciences. Faculty of Psychology (GAUGN); postgraduate research at MIPT under Boris Velichkovsky. <a href="/en/about/">His path →</a></p>
<ul class="ach">
<li><b>Founder of the Lectorium</b> — an open university of life: {n_courses()} courses on fear, decisions, relationships, money and thinking. Free, no sign-up.</li>
<li><b>Author of “The Theory of Manipulation”</b> — three volumes, 200,000 copies in print.</li>
<li><b>Author of the Variatika and Conceptual Base methods</b> — teaching built on the findings of cognitive science.</li>
<li><b>Author of the code behind Fredi</b> — a virtual psychologist available at any hour.</li>
</ul>
<a class="new" href="/testy/klyuchi-karta-probelov/"><span class="k">New project</span><b>The Conceptual Base</b><span class="t">The framework of concepts you need to understand a subject — and yourself. It starts with the Gap Map: 22 questions. <span class="ru">In Russian.</span></span></a>
</div>{VIDEO}</div></div></section>
<section class="sec"><div class="wrap">
<div class="pos">
<p class="sub">position</p>
<h2>Education lags behind the science of thinking</h2>
<p>Over half a century, cognitive science has learned how people understand, remember and decide. Understanding rests on a framework of concepts, not on a sum of facts. Knowledge sticks when it is used, not when it is reread. Thinking errs predictably — and that can be taught.</p>
<p>The education system barely takes this into account. It teaches the way it did a hundred years ago.</p>
<p class="last">The Lectorium, Variatika and the Conceptual Base are my answer: teaching assembled from these findings.</p>
<p class="sign">Andrey Meyster</p>
</div>
</div></section>
<section class="sec"><div class="wrap">
<h2>What has been built</h2>
<p class="sub">open and working · everything except Fredi is in Russian</p>
<div class="cards">{cards}</div>
<p style="margin-top:22px"><a href="/en/about/">About Andrey Meyster →</a></p>
</div></section>
<section class="sec"><div class="wrap">
<p class="sub">The Conceptual Base · status</p>
<h2>All recordings are ready. Final trials are under way</h2>
<p class="lead">The recordings of the Conceptual Base are finished. They are now in final trials with a focus group: the result has to hold up on real people, not just on paper. Once the data confirms it, access opens.</p>
<ol class="steps">
<li class="done"><b>Recordings ready</b><span>every subject</span></li>
<li class="now"><b>Final trials</b><span>focus group, checking the result</span></li>
<li><b>Access opens</b><span>expected 1 December 2026</span></li>
</ol>
</div></section>
<section class="sec"><div class="wrap">
<h2>Partners</h2>
<div class="partner"><img src="/images/partners/skilllab.webp" width="160" height="95" alt="Upgrade Skill Lab" loading="lazy"><p><b>Skill Lab</b> — Andrey Meyster develops training programmes for the company.</p></div>
</div></section>
{COOP}"""
    return page("/en/", "Andrey Meyster — psychologist, founder of the Lectorium, author of The Theory of Manipulation",
                "Andrey Meyster, psychologist, Candidate of Psychological Sciences: founder of the Lectorium, an open university of life; author of The Theory of Manipulation, of the Variatika and Conceptual Base methods and of the code behind Fredi, a virtual psychologist.",
                body)


def about():
    facts = """<ul class="facts">
<li><span class="y">2008</span>Graduated from the Faculty of Psychology, State Academic University for the Humanities (GAUGN), Moscow.</li>
<li><span class="y">2008–2013</span>Postgraduate research at the NBIC faculty of the Moscow Institute of Physics and Technology (MIPT), supervised by Boris Velichkovsky.</li>
<li><span class="y">2013</span>Candidate of Psychological Sciences — the Russian equivalent of a PhD. Since then, author’s trainings “Conversational Hypnosis” and “Insight”.</li>
<li><span class="y">2013–2023</span>Work on the Lectorium and research into applying hypnosis for educational purposes — it grew into the “Keys”, today the Conceptual Base.</li>
<li><span class="y">2023</span>“Theory of Manipulation. Vol. I: Conversational Hypnosis” (Skill Lab). The series also includes Vol. II “Insight” and Vol. III “Stimulus Control”.</li>
<li><span class="y">Today</span>The Lectorium, Fredi, the Variatika system, the Conceptual Base.</li>
</ul>"""
    cards = "".join([
        card("/en/lectorium/", "Open university", "Lectorium", "Courses on fear, decisions, relationships, money and thinking. Free, no sign-up."),
        card("/en/fredi/", "Code", "Fredi", "A virtual psychologist available at any hour. Talks in English.", ru=False),
        card("/knigi/", "Books", "Theory of Manipulation · Variatika · Concepticon", "Influence, human patterns and mental models."),
        card("/igry/", "Didactic system", "Variatika and training games", "A skill is built by playing: board games and puzzle games."),
    ])
    body = f"""<section class="hero"><div class="wrap"><div class="grid2"><div>
<h1>Andrey Meyster</h1>
<p class="sub">psychologist · candidate of psychological sciences · author of educational products</p>
<p class="lead">Specialist in cognitive psychology and the psychology of communication. He builds educational products about how people think, decide and influence one another — courses, books, games and a virtual psychologist.</p>
<p class="lead">Member of the European Association for Counselling (EAC) and the International Association of Applied Psychology (IAAP).</p>
</div><div class="portrait"><img src="/obo-mne/andrej-mejster.jpg" alt="Andrey Meyster" width="1200" height="1500" loading="eager"></div></div></div></section>
<section class="sec"><div class="wrap"><h2>Path</h2><p class="sub">education, research, work</p>{facts}</div></section>
<section class="sec"><div class="wrap"><h2>What he builds</h2><p class="sub">everything except Fredi is in Russian</p><div class="cards">{cards}</div></div></section>
{COOP}"""
    ld = {"@context": "https://schema.org", "@type": "Person", "name": "Andrey Meyster",
          "alternateName": "Андрей Мейстер", "url": SITE + "/en/about/", "jobTitle": "Psychologist",
          "image": SITE + "/obo-mne/andrej-mejster.jpg",
          "alumniOf": [{"@type": "CollegeOrUniversity", "name": "State Academic University for the Humanities"},
                       {"@type": "CollegeOrUniversity", "name": "Moscow Institute of Physics and Technology"}],
          "sameAs": ["https://t.me/meysternlp", "https://vk.com/meysternlp"]}
    return page("/en/about/", "About Andrey Meyster — psychologist, author of educational products",
                "Andrey Meyster: psychologist, Candidate of Psychological Sciences (2013), postgraduate research at MIPT. Author of the Lectorium, Fredi, “Theory of Manipulation” and the Variatika system.",
                body, ld)


def fredi():
    cards = "".join([
        card("/fredi/", "Conversation", "Talk at any hour", "Text or voice. Fredi listens, asks questions and helps you see what is going on.", ru=False),
        card("/fredi/", "Practices", "CBT exercises", "Step-by-step practices for anxiety, thoughts and habits.", ru=False),
        card("/fredi/", "Diary", "Emotion diary", "Notice what you feel and what triggers it.", ru=False),
        card("/fredi/", "Skills", "21-day skill plans", "Small daily steps instead of resolutions.", ru=False),
    ])
    body = f"""<section class="hero"><div class="wrap">
<h1>Fredi — a virtual psychologist</h1>
<p class="lead">Talk at any hour — in English or in Russian. Fredi listens, asks questions and helps you see which story you are living in, and where it isn’t yours. Built by Andrey Meyster, who also wrote its code.</p>
<p class="lead">The first 15 minutes are free, no sign-up. After that — a subscription (<a href="/tarify/" hreflang="ru">prices in roubles</a>). The app interface is in Russian for now: just write to Fredi in English.</p>
<p><a class="btn" href="/fredi/">Open Fredi</a></p>
</div></section>
<section class="sec"><div class="wrap"><h2>What is inside</h2><p class="sub">conversation, practices, tests</p><div class="cards">{cards}</div>
<div class="note"><b>Fredi is not a doctor.</b> If you are in crisis or think about harming yourself, contact emergency services (112 in Russia) or a specialist right away.</div>
</div></section>"""
    return page("/en/fredi/", "Fredi — a virtual psychologist available at any hour | Andrey Meyster",
                "Fredi is a virtual psychologist by Andrey Meyster: conversation at any hour in English or Russian, CBT exercises, emotion diary, skill plans. First 15 minutes free.",
                body)


def lectorium():
    topics = ["Fear and anxiety", "Decisions", "Relationships and family", "Money and work", "Thinking and logic",
              "Influence and speech", "Generations", "Guilt and resentment", "Mindsets at work", "History of ideas"]
    chips = "".join(f'<span class="card" style="display:inline-block;padding:8px 14px;margin:0 8px 8px 0">{t}</span>'
                    for t in topics)
    body = f"""<section class="hero"><div class="wrap">
<h1>The Lectorium — an open university of life</h1>
<p class="lead">Courses of lectures on what everyday life is made of: fear, decisions, relationships, money, thinking. Open in full — free, no sign-up, no paywall.</p>
<p class="lead">Each course is a short series of lectures with diagrams and practice, built from the simple to the complex. <span class="ru">The lectures are in Russian; browser translation works well enough to follow them.</span></p>
<p><a class="btn" href="/blog/lektorij/" hreflang="ru">Open the Lectorium</a></p>
</div></section>
<section class="sec"><div class="wrap"><h2>Topics</h2><p class="sub">a selection of course areas</p><div>{chips}</div>
<p style="margin-top:22px"><a href="/en/about/">Author: Andrey Meyster →</a></p></div></section>"""
    return page("/en/lectorium/", "The Lectorium — an open university of life | Andrey Meyster",
                "The Lectorium by Andrey Meyster: free courses of lectures on fear, decisions, relationships, money and thinking. Open in full, no sign-up. Lectures in Russian.",
                body)


def collaboration():
    body = """<section class="hero"><div class="wrap">
<h1>Propose a collaboration</h1>
<p class="lead">This site rests on those who search for their own way — and on those who propose. If you have an idea, a task or a platform, write to us. Every proposal reaches Andrey Meyster.</p>
<div class="cards" style="margin:18px 0 26px">
<div class="card"><b>Companies</b><p>A lecture or training for your team: negotiation, influence, decisions.</p></div>
<div class="card"><b>Psychologists and coaches</b><p>Games and methods for work with clients.</p></div>
<div class="card"><b>Media and authors</b><p>Interview, comment, broadcast, joint material.</p></div>
<div class="card"><b>Researchers</b><p>Joint research, data, review.</p></div>
</div>
<form id="coop" novalidate>
<label>Who you are</label>
<div class="who" role="radiogroup">
<label><input type="radio" name="who" value="Company"><span>Company</span></label>
<label><input type="radio" name="who" value="Psychologist or coach"><span>Psychologist or coach</span></label>
<label><input type="radio" name="who" value="Media or author"><span>Media or author</span></label>
<label><input type="radio" name="who" value="Researcher"><span>Researcher</span></label>
<label><input type="radio" name="who" value="Other" checked><span>Other</span></label>
</div>
<label for="c-name">Your name</label>
<input type="text" id="c-name" name="name" maxlength="100" autocomplete="name">
<label for="c-contact">How to reach you *</label>
<input type="text" id="c-contact" name="contact" maxlength="200" placeholder="email, phone or Telegram" autocomplete="email" required>
<label for="c-text">Your proposal *</label>
<textarea id="c-text" name="text" maxlength="2800" placeholder="In short: the task, format, timing — whatever you find important" required></textarea>
<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
<button class="send" type="submit">Send</button>
<p class="fine">By sending, you agree to the <a href="/politika-konfidencialnosti/" hreflang="ru">privacy policy</a> (in Russian). Your contact is used only to reply.</p>
<div class="msg" id="c-msg" role="status" aria-live="polite"></div>
</form>
<p class="fine" style="margin-top:18px">Prefer to write directly — <a href="mailto:dron939@yandex.ru">dron939@yandex.ru</a> or <a href="https://t.me/meysternlp" rel="noopener">Telegram @meysternlp</a>.</p>
</div></section>
<script>
/* The same /api/feedback as the Russian /sotrudnichestvo/: stored in the
   Fredi backend, delivered to the owner by Telegram or e-mail. */
(function () {
  var f = document.getElementById('coop'), msg = document.getElementById('c-msg');
  function show(cls, html) { msg.className = 'msg ' + cls; msg.innerHTML = html; }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var contact = f.contact.value.trim(), text = f.text.value.trim();
    if (contact.length < 3) { show('err', 'Please leave a contact — otherwise we cannot reply.'); f.contact.focus(); return; }
    if (text.length < 10) { show('err', 'Please describe the proposal in a couple of sentences.'); f.text.focus(); return; }
    var who = (f.querySelector('input[name=who]:checked') || {}).value || 'Other';
    var name = f.name.value.trim(), btn = f.querySelector('.send');
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '🤝 COLLABORATION PROPOSAL (EN)\\nWho: ' + who + (name ? '\\nName: ' + name : '') + '\\n\\n' + text,
        contact: contact, page: '/en/collaboration/', website: f.website.value
      })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.success) {
        try { ym(108138656, 'reachGoal', 'coop_sent', { coop_who: who, coop_lang: 'en' }); } catch (e) {}
        f.reset(); btn.textContent = 'Sent';
        show('ok', 'Thank you. Your proposal has been sent — we will reply to the contact you left.');
      } else throw new Error();
    }).catch(function () {
      btn.disabled = false; btn.textContent = 'Send';
      show('err', 'It did not go through. Please write to <a href="mailto:dron939@yandex.ru">dron939@yandex.ru</a> or <a href="https://t.me/meysternlp" rel="noopener">Telegram</a>.');
    });
  });
})();
</script>"""
    return page("/en/collaboration/", "Collaboration — propose to us | Andrey Meyster",
                "An idea, a task or a platform? Propose a collaboration to Andrey Meyster: a lecture for a company, an interview, joint research, games and methods for psychologists.",
                body)


def main():
    out = {"/en/": home(), "/en/about/": about(), "/en/fredi/": fredi(),
           "/en/lectorium/": lectorium(), "/en/collaboration/": collaboration()}
    for path, html in out.items():
        d = os.path.join(ROOT, path.strip("/"))
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(html)
        print("written", path)


if __name__ == "__main__":
    main()
