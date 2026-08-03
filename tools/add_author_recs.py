#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Рекомендации собственных книг, игр и тренингов в статьях блога.

Книга добавляется в раздел «Литература» (он встречается в двух видах —
маркированным списком и прозой), игра или тренинг — отдельным блоком
«потренировать» сразу после литературы.

Правило одно: не больше одной книги и одного блока практики на статью,
и только по теме. Подбор идёт по ключевым словам заголовка, описания и
meta keywords; рубрика даёт вес, но сама по себе рекомендацию не создаёт —
иначе раздел превращается в витрину.

Запуск без аргументов — сухой прогон; с --apply — правит файлы.
"""
import os, io, re, sys, json, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, "blog")

BOOKS = [
    dict(key="manip",
         url="https://www.ozon.ru/product/teoriya-manipulyatsii-razgovornyy-gipnoz-knigi-po-psihologii-nlp-2-0-meyster-andrey-yurevich-839926527",
         li='Мейстер А. «Теория манипуляции. Том 1: Разговорный гипноз» — как устроены '
            'речевые конструкции влияния и как замечать их в свой адрес.',
         pat=r"манипул|гипноз|внушен|убежд|влиян|перегово|продаж|речев|воздейств|раппорт|транс\b|нлп",
         rub={"gipnoz"}),
    dict(key="konceptikon",
         url="https://www.ozon.ru/product/kontseptikon-sem-linz-dlya-yasnogo-myshleniya-meyster-andrey-yurevich-1167705948/",
         li='Мейстер А. «Концептикон. Семь линз для ясного мышления» — семь способов '
            'смотреть на одну и ту же ситуацию и что каждый из них показывает.',
         pat=r"мышлен|искажен|критическ|логик|аргумент|довод|рассужд|заблужд",
         rub={"myshlenie"}),
    dict(key="variatika",
         url="https://www.ozon.ru/product/variatika-biblioteka-chelovecheskih-patternov-meyster-andrey-yurevich-989039765/",
         li='Мейстер А. «Вариатика. Библиотека человеческих паттернов» — четыре базовые '
            'программы и девять уровней развития: как устроены типовые сценарии поведения.',
         pat=r"паттерн|психотип|типолог|тип личност|прошивк личност|архетип|"
             r"читать люд|портрет личност|характер за|модел поведен|уровн развит",
         rub={"emocii", "shkoly", "obshchestvo"}),
]

PRACTICE = [
    dict(key="gipnoz-trening", url="/treningi/razgovornyy-gipnoz-standart.html", icon="🎓",
         title="Отработать на тренинге",
         text="«Разговорный гипноз» — практика речевого воздействия: конструкции, "
              "которые разбираются в статье, ставятся под наблюдением.",
         btn="К тренингу",
         pat=r"гипноз|внушен|речев|убежд|раппорт|транс\b|манипул|влиян",
         rub={"gipnoz"}),
    dict(key="variatika-igra", url="/igry/variatika-basic.html", icon="🎲",
         title="Потренировать на игре",
         text="«Вариатика» — дидактическая игра на разбор чужих сценариев: "
              "распознать паттерн и предсказать, куда пойдёт поведение.",
         btn="К игре",
         pat=r"паттерн|психотип|тип личност|типолог|сценари|поведени|характер|прогноз",
         rub={"emocii", "shkoly", "obshchestvo"}),
    dict(key="marketolog", url="/igry/marketolog.html", icon="🎲",
         title="Потренировать на игре",
         text="«Маркетолог» — игра на создание потребительских нарративов: "
              "как собирается история, которая убеждает.",
         btn="К игре",
         pat=r"продаж|реклам|маркет|нарратив|текст|креатив|бренд|бизнес",
         rub={"dengi"}),
    dict(key="proryv", url="/treningi/proryv.html", icon="🎓",
         title="Отработать на тренинге",
         text="«Прорыв» — живой телесный тренинг против выученной беспомощности: "
              "там она снимается опытом, а не разговором.",
         btn="К тренингу",
         pat=r"беспомощн|бессили|застря|апати|не могу заставить|опуст|сдал|выгоран",
         rub={"motivaciya"}),
]

LIT_H2 = re.compile(r'<h2[^>]*>(?:Литература|Что почитать)[^<]*</h2>', re.I)
# Куда ставить карточку, если раздела «Литература» в статье нет: перед
# призывом к действию, иначе перед блоком «Читайте также», иначе перед автором.
ANCHORS = ('<div class="cta-block"', '<div class="related-articles"',
           '<div class="author-block"', '<div class="author-box"')


def book_box(b):
    return ('<div class="game-link-box" style="display:flex;align-items:center;gap:14px;'
            'background:linear-gradient(135deg,#FFF6EC,#FFF0F5);border:1px solid #FFD9B8;'
            'border-radius:14px;padding:16px 20px;margin:32px 0 10px;flex-wrap:wrap">'
            '<span style="font-size:1.6rem" aria-hidden="true">📕</span>'
            '<div style="flex:1;min-width:220px"><b style="color:#1D1D1F">Разобрано подробно в книге</b>'
            '<br><span style="color:#6E6E73;font-size:.92rem">%s</span></div>'
            '<a href="%s" rel="nofollow" style="background:#3A86FF;color:#fff;'
            'text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;'
            'font-size:.92rem">О книге →</a></div>' % (b["li"], b["url"]))


def anchor_pos(s):
    """Место для карточки в статье без раздела «Литература»."""
    for a in ANCHORS:
        i = s.find(a)
        if i > 0:
            return i
    return -1


def box(p):
    return ('<div class="game-link-box" style="display:flex;align-items:center;gap:14px;'
            'background:linear-gradient(135deg,#EEF4FF,#F5F0FF);border:1px solid #C7D8FF;'
            'border-radius:14px;padding:16px 20px;margin:32px 0 10px;flex-wrap:wrap">'
            '<span style="font-size:1.6rem" aria-hidden="true">%s</span>'
            '<div style="flex:1;min-width:220px"><b style="color:#1D1D1F">%s</b><br>'
            '<span style="color:#6E6E73;font-size:.92rem">%s</span></div>'
            '<a href="%s" style="background:#3A86FF;color:#fff;text-decoration:none;'
            'padding:10px 18px;border-radius:10px;font-weight:600;font-size:.92rem">%s →</a>'
            '</div>' % (p["icon"], p["title"], p["text"], p["url"], p["btn"]))


def pick(items, text, rk):
    """Одного случайного упоминания мало: нужно либо несколько попаданий,
    либо попадание вместе с профильной рубрикой."""
    best, best_score = None, 0
    for it in items:
        n = len(re.findall(it["pat"], text, re.I))
        if not n:
            continue
        score = n + (2 if rk in it["rub"] else 0)
        if score < 2:
            continue
        if score > best_score:
            best, best_score = it, score
    return best


def main(apply=False):
    idx = {a["s"]: a for a in json.load(io.open(os.path.join(BLOG, "search-index.json"),
                                               encoding="utf-8"))}
    stat = collections.Counter()
    changed = 0
    for fn in sorted(os.listdir(BLOG)):
        if not fn.endswith(".html") or fn == "index.html":
            continue
        slug = fn[:-5]
        a = idx.get(slug)
        if not a:
            continue
        p = os.path.join(BLOG, fn)
        s = io.open(p, encoding="utf-8").read()
        m = LIT_H2.search(s)
        kw = re.search(r'<meta name="keywords" content="([^"]*)"', s)
        text = " ".join([a["t"], a.get("d", ""), kw.group(1) if kw else ""])
        rk = a["rk"]
        orig = s
        had_box = "game-link-box" in s

        # 1. Книга — первым пунктом списка или отдельным абзацем после прозы
        b = pick(BOOKS, text, rk)
        if b and b["url"] not in s:
            if m:
                li = ('<li><a href="%s" rel="nofollow">%s</a></li>' % (b["url"], b["li"]))
                if s[m.end():].lstrip().startswith("<ul>"):
                    i = s.index("<ul>", m.end())
                    s = s[:i + 4] + li + s[i + 4:]
                else:
                    j = s.find("</p>", m.end())
                    if j > 0:
                        s = (s[:j + 4] + '<p><a href="%s" rel="nofollow">%s</a></p>'
                             % (b["url"], b["li"]) + s[j + 4:])
                if s != orig:
                    stat["книга в список: " + b["key"]] += 1
            else:
                i = anchor_pos(s)
                if i > 0:
                    s = s[:i] + book_box(b) + s[i:]
                    stat["книга карточкой: " + b["key"]] += 1

        # 2. Практика — блоком сразу после раздела литературы
        pr = pick(PRACTICE, text, rk)
        if pr and not had_box and pr["url"] not in s:
            if m:
                end = s.find("</ul>", m.end())
                if 0 < end < m.end() + 4000:
                    end += 5
                else:
                    end = s.find("</p>", m.end())
                    end = end + 4 if end > 0 else -1
            else:
                end = anchor_pos(s)
            if end > 0:
                s = s[:end] + box(pr) + s[end:]
                stat["практика: " + pr["key"]] += 1

        if s != orig:
            changed += 1
            if apply:
                io.open(p, "w", encoding="utf-8").write(s)

    print("статей затронуто: %d\n" % changed)
    for k, n in sorted(stat.items()):
        print("  %-28s %d" % (k, n))
    if not apply:
        print("\n(сухой прогон; для правки запустить с --apply)")


if __name__ == "__main__":
    main("--apply" in sys.argv)
