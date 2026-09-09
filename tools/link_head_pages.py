#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ставит в статьи блога ссылку на «головную» страницу своей темы.

Зачем. Вебмастер за 30 дней: Яндекс показал сайт 35 840 раз и дал 1034
перехода. Разница объясняется одной цифрой — позицией. По нашим выдачам
CTR ломается ровно между четвёртым и пятым местом:

    позиция 2–4   CTR 10–12 %
    позиция 5     CTR  2,5 %
    позиция 6–10  CTR  0,5–1,4 %

На местах 5–10 у нас висит 14 414 показов в месяц, которые приносят
76 переходов. Это не вопрос новых текстов: страницы написаны, Яндекс их
показывает, они просто стоят слишком низко.

Самый дорогой пример — тест на ревность. Около 4500 показов в месяц,
позиция 5,4–8,4, пятнадцать переходов, и при этом на него ведут ТРИ
внутренние ссылки из 1904 страниц сайта. Головные страницы у нас
связаны хуже, чем случайная статья.

Что делает. Подбирает статье головную страницу по теме (RULES, сверху
вниз, первое совпадение выигрывает) и ставит одну строку перед блоком
«Читайте также». Одна ссылка на статью, не список: смысл в том, чтобы
вес шёл в одну точку, а читатель получал следующий шаг, а не витрину.

Чего не делает. Не трогает саму головную страницу, не ставит вторую
ссылку туда, где она уже есть в тексте, и не выдумывает тему: где
правило не сработало, статья остаётся как была.

    python3 tools/link_head_pages.py --dry-run
    python3 tools/link_head_pages.py
    python3 tools/link_head_pages.py --strip
"""
import argparse
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK_OPEN = "<!-- head-link -->"
MARK_CLOSE = "<!-- /head-link -->"

# Каждое правило: регулярное выражение по теме, адрес головной страницы и
# фраза-подводка. Подводка написана под запрос, по которому страницу и
# ищут («с диаграммой», «техника погружения», «список»), — читатель должен
# узнать в ней то, что набирал в поиске.
RULES = [
    # «Эмоциональные качели» — 12 237 показов в месяц, страницы не было
    # ни одной. Правило узкое: качели это конкретный механизм, а не
    # синоним «сложных отношений».
    (r"эмоциональн\w* качел|то приближ\w*,? то отдал|то пишет,? то пропада|"
     r"непостоянн\w* подкреплен|горяч\w* и холодн\w* в отношени",
     "/blog/emocionalnye-kacheli-chto-delat.html",
     "Если тепло приходит через раз: "
     "<a href=\"/blog/emocionalnye-kacheli-chto-delat.html\">эмоциональные качели — почему "
     "то тепло, то холод</a> — механизм, три вида и что делать за три недели."),

    # Входной вопрос. «Как разобраться в себе» 2499 показов в месяц,
    # «не понимаю что со мной происходит» 1080, «как понять что со мной
    # не так» 763 — и это же самая частая формулировка из тех, что люди
    # писали Фреди своими словами. Страницы не было ни одной.
    (r"что со мной не так|разобраться в себе|не понимаю,? что со мной|"
     r"не знаю,? чего хочу|понять себя|с чего начать разбираться",
     "/blog/chto-so-mnoj-ne-tak-s-chego-nachat.html",
     "Если непонятно, с чего вообще начинать: "
     "<a href=\"/blog/chto-so-mnoj-ne-tak-s-chego-nachat.html\">не понимаю, что со мной "
     "не так</a> — четыре области, где лежит причина, и неделя наблюдения."),

    # Стоит первым намеренно: «навязчивые мысли» — 30 777 показов в месяц по
    # Wordstat, и до 09.09 у нас не было ни одной статьи на эту тему, только
    # упоминания внутри чужих. Правило узкое, поэтому забирает себе ровно те
    # статьи, где навязчивость и есть предмет разговора.
    (r"навязчив\w* мысл|обсесси|компульси|мысли по кругу",
     "/blog/navyazchivye-mysli-chto-delat.html",
     "Разобрано отдельно: "
     "<a href=\"/blog/navyazchivye-mysli-chto-delat.html\">навязчивые мысли — почему лезут "
     "в голову и что с ними делать</a> — что отвечать себе в момент и чего не делать."),

    (r"ревност|ревну",
     "/testy/test-na-revnost/",
     "Свой тип ревности можно посмотреть прямо сейчас: "
     "<a href=\"/testy/test-na-revnost/\">тест на ревность с диаграммой</a> — "
     "18 утверждений, профиль по шести типам, подсчёт в браузере."),

    (r"самогипноз|самовнушен|\bтранс\b",
     "/blog/samogipnoz-dlya-nachinayushih.html",
     "С чего начинают: "
     "<a href=\"/blog/samogipnoz-dlya-nachinayushih.html\">самогипноз для начинающих</a> — "
     "техника погружения по шагам, без метафор и без мистики."),

    (r"когнитивн\w* искажен|искажени\w* мышлен|ошибк\w* мышлен",
     "/blog/100-kognitivnyh-iskazhenij-spravochnik.html",
     "Полный перечень под рукой: "
     "<a href=\"/blog/100-kognitivnyh-iskazhenij-spravochnik.html\">список 100 когнитивных искажений</a> — "
     "с примерами и с тем, на чём каждое ловится."),

    (r"\bкпт\b|когнитивно-поведенческ",
     "/blog/tehniki-kpt-dlya-samostoyatelnoj-raboty.html",
     "Как это делают руками: "
     "<a href=\"/blog/tehniki-kpt-dlya-samostoyatelnoj-raboty.html\">техники КПТ для самостоятельной работы</a> — "
     "семь упражнений с протоколами и четырёхнедельный план."),

    (r"дневник эмоц|дневник чувств|отслежива\w* эмоц|назвать эмоц|"
     r"алекситим|распознава\w* эмоц|эмоционал\w* грамотност",
     "/blog/kak-vesti-dnevnik-emocij.html",
     "Инструмент, с которого удобно начать: "
     "<a href=\"/blog/kak-vesti-dnevnik-emocij.html\">как вести дневник эмоций</a> — "
     "образец таблицы и что записывать, чтобы это работало."),

    # «Влюбить в себя» — 29 940 показов в месяц, страницы не было ни одной.
    (r"влюбить в себя|как понравиться|безответн\w* (симпати|любов)|"
     r"не отвечает взаимност|нравится человек",
     "/blog/kak-vlyubit-v-sebya-chto-rabotaet.html",
     "Разобрано отдельно: "
     "<a href=\"/blog/kak-vlyubit-v-sebya-chto-rabotaet.html\">как влюбить в себя — что "
     "работает, а что отталкивает</a> — доверие и радость вместо приёмов."),

    # «Любовь» одним словом ловила сто двадцать восемь статей — половина из
    # них про отношения вообще, и тест там читался бы как реклама. Берём
    # только те заходы, где речь именно про способность любить.
    (r"умени\w* любить|зрел\w* любов|искусство любить|способност\w* любить|"
     r"как полюбить|разлюб|безответн\w* любов|влюблённост|влюбленност",
     "/testy/test-na-umenie-lyubit/",
     "Проверить себя по четырём компонентам зрелой любви: "
     "<a href=\"/testy/test-na-umenie-lyubit/\">тест на умение любить с диаграммой</a> — "
     "16 утверждений, результат как зона роста, а не оценка."),
]

BLOCK = ('{open}<p class="head-link" style="margin:22px 0;padding:12px 16px;'
         'border-left:3px solid #7C3AED;background:#FAF5FF;border-radius:0 10px 10px 0;'
         'color:#4A4A4F;font-size:.95rem">{text}</p>{close}')


def strip_block(html):
    return re.sub(re.escape(MARK_OPEN) + r".*?" + re.escape(MARK_CLOSE), "", html, flags=re.S)


def pick(html, path):
    """Головная страница для статьи: первое правило, попавшее в заголовок или текст."""
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S)
    head = re.sub(r"<[^>]+>", " ", m.group(1)) if m else ""
    body = re.sub(r"<[^>]+>", " ", html)
    for pat, target, text in RULES:
        if path.endswith(target.strip("/").split("/")[-1]) or target.strip("/") in path:
            continue                       # сама головная страница
        rx = re.compile(pat, re.I)
        # Заголовок весит больше: попадание в него — тема статьи, попадание
        # в тело может быть случайным упоминанием в одном абзаце.
        if rx.search(head) or len(rx.findall(body)) >= 3:
            return target, text
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--strip", action="store_true")
    args = ap.parse_args()

    files = sorted(glob.glob(os.path.join(ROOT, "blog", "*.html")))
    changed = 0
    stats = {}
    for path in files:
        html = open(path, encoding="utf-8").read()
        orig = html
        html = strip_block(html)
        if not args.strip:
            target, text = pick(html, path)
            # Ссылка уже стоит в тексте — второй такой же не нужно.
            if target and ('href="%s"' % target) not in html:
                block = BLOCK.format(open=MARK_OPEN, close=MARK_CLOSE, text=text)
                if '<div class="related-articles">' in html:
                    html = html.replace('<div class="related-articles">',
                                        block + '\n<div class="related-articles">', 1)
                elif "</article>" in html:
                    html = html.replace("</article>", block + "\n</article>", 1)
                else:
                    continue
                stats[target] = stats.get(target, 0) + 1
        if html != orig:
            changed += 1
            if not args.dry_run:
                open(path, "w", encoding="utf-8").write(html)
    for target, n in sorted(stats.items(), key=lambda x: -x[1]):
        print("  %-52s %3d статей" % (target, n))
    print("страниц изменено: %d%s" % (changed, "  (dry-run)" if args.dry_run else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
