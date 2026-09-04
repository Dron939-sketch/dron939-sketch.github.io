#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Двери в проекты автора — Персонотеку и Личности.ру — из статей блога.

    python3 tools/link_projects.py --dry-run
    python3 tools/link_projects.py

Зачем. У автора три проекта: этот сайт, Персонотека (personoteka.ru,
архив биографий) и Личности.ру (lichnosty.ru, «разместить информацию о
себе»). До 4 сентября между ними не было ни одной ссылки: читатель
статьи «Цифровой след: что Google расскажет о вас через 20 лет» не
узнавал, что у автора статьи есть сервис ровно про это.

Куда НЕ ставим — решение по данным, не вкусовщина. Посадочные Фреди
(/virtual-psychologist/, тесты, /ii-kouch/) — верх воронки подписки,
345 рекламных визитов в сутки; посторонний баннер там конкурирует со
стеной оплаты за клик. Двери ставятся только в статьи блога, где тема
статьи совпадает с мотивом сервиса:

  Персонотека — статьи про род, поколения, стареющих родителей.
    Читатель уже думает о семейной истории; рамка не «пиар», а
    «запишите, пока есть кого спросить».
  Личности.ру — статьи про цифровой след, публичность, репутацию.
    Читатель строит публичный образ; рамка «страница, написанная вами».

Отдельный случай — «Как пережить смерть родителя»: там формулировка
только про сохранение памяти, без «пока есть кого спросить» (спросить
уже не у кого) и без слова «разместить» в заголовке.

Клик считается в Метрику (108138656): personoteka_click /
lichnosti_click — цели типа «JavaScript-событие». Ссылки несут UTM.

Идемпотентен: помечает вставку комментарием и второй раз не добавляет.
Вставка — перед <div id="footer-placeholder">, то есть в самый конец
статьи: дочитавший читатель, нулевая конкуренция с дверями в Фреди.
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MARK = "<!-- project-door -->"
END = "<!-- /project-door -->"
ANCHOR = '<div id="footer-placeholder">'

PT_URL = "https://personoteka.ru/razmestit/?utm_source=meysternlp&utm_medium=banner&utm_campaign=blog"
LICH_URL = "https://lichnosty.ru/razmestit-biografiyu/?utm_source=meysternlp&utm_medium=banner&utm_campaign=blog"

# Единый вид с fredi-ask-box, но своя тёплая гамма — блок читается как
# часть сайта, а не как чужая реклама. Сверху — картинка-шапка (фоны
# сгенерированы 04.09, лежат в images/): отдельным <img>, а не
# background, ради loading=lazy и читаемости текста на любой ширине.
def card(title, text, url, goal, btn, img, alt):
    return (
        MARK + '\n<div class="project-door" style="border:1px solid #EADFC8;'
        'border-radius:14px;margin:34px 0;overflow:hidden">\n'
        '<img src="' + img + '" alt="' + alt + '" loading="lazy" width="1600" height="528" '
        'style="display:block;width:100%;height:150px;object-fit:cover">\n'
        '<div style="background:linear-gradient(135deg,#FDF8F0,#FFFDF8);'
        'border-left:4px solid #B45309;padding:18px 22px">\n'
        '<div style="font-weight:700;color:#1E293B;margin-bottom:6px">' + title + '</div>\n'
        '<div style="color:#475569;font-size:.95em;line-height:1.55">' + text + '</div>\n'
        '<a href="' + url + '" rel="noopener" '
        'onclick="try{ym(108138656,\'reachGoal\',\'' + goal + '\')}catch(e){}" '
        'style="display:inline-block;margin-top:10px;background:#B45309;color:#fff;'
        'text-decoration:none;padding:9px 18px;border-radius:30px;font-size:.9em;'
        'font-weight:600">' + btn + '&nbsp;&rarr;</a>\n</div>\n</div>\n' + END
    )


PT_GENERIC = card(
    "История вашей семьи — тоже часть этой летописи",
    "Биографии бабушек и дедушек исчезают вместе с ними — даты, города, "
    "истории, которые больше никто не расскажет. «Персонотека» — архив "
    "биографий: страница о близком человеке, которую найдут внуки.",
    PT_URL, "personoteka_click", "Разместить биографию",
    "/images/project-door-personoteka.jpg", "Старый семейный фотоальбом с чёрно-белыми снимками")

PT_STAREYUT = card(
    "Пока есть кого спросить",
    "Даты, города, кем работали, как познакомились — через десять лет "
    "спросить будет не у кого. Запишите историю родителей сейчас: "
    "«Персонотека» сохранит её страницей, которую найдут внуки.",
    PT_URL, "personoteka_click", "Разместить биографию",
    "/images/project-door-personoteka.jpg", "Старый семейный фотоальбом с чёрно-белыми снимками")

PT_PAMYAT = card(
    "Сохранить память",
    "Записать историю ушедшего — один из способов прожить утрату: не "
    "отпустить всё, а выбрать, что останется. «Персонотека» хранит "
    "биографии — страница памяти, которую можно показать детям.",
    PT_URL, "personoteka_click", "Создать страницу памяти",
    "/images/project-door-personoteka.jpg", "Старый семейный фотоальбом с чёрно-белыми снимками")

LICH_CARD = card(
    "Ваш цифровой след можно написать самому",
    "Через двадцать лет поисковик расскажет о вас то, что накопилось "
    "случайно. «Личности» — способ добавить туда страницу, написанную "
    "вами: биография, дело, факты, которыми вы гордитесь.",
    LICH_URL, "lichnosti_click", "Разместить биографию",
    "/images/project-door-lichnosti.jpg", "Ноутбук с чистой страницей — место для вашей биографии")

PAGES = {
    # Персонотека: род, поколения, родители
    "blog/lekciya-sep-kogda-stareyut.html": PT_STAREYUT,
    "blog/kak-perezhit-smert-roditelya.html": PT_PAMYAT,
    "blog/deti-90h-v-2026-pokolencheskij-portret.html": PT_GENERIC,
    "blog/pokolencheskij-razryv-4-pokoleniya-rossii.html": PT_GENERIC,
    "blog/travma-pokoleniya-8-shramov-rossiyan-1985-2025.html": PT_GENERIC,
    "blog/pokolenie-vyrosshee-na-slome.html": PT_GENERIC,
    # Личности.ру: цифровой след, публичность, репутация
    "blog/cifrovoj-sled-chto-google-rasskazhet-cherez-20-let.html": LICH_CARD,
    "blog/lekciya-piar-lico-dela.html": LICH_CARD,
    "blog/lekciya-piar-reputaciya-kak-sistema.html": LICH_CARD,
}


def main():
    dry = "--dry-run" in sys.argv
    touched = 0
    for rel, block in sorted(PAGES.items()):
        f = os.path.join(ROOT, rel)
        if not os.path.exists(f):
            print("  НЕТ ФАЙЛА: %s" % rel)
            continue
        s = io.open(f, encoding="utf-8").read()
        if MARK in s:
            # Блок уже стоит — обновляем на месте: тексты и картинки меняются,
            # а вручную девять страниц никто перебирать не будет.
            import re as _re
            new_s = _re.sub(_re.escape(MARK) + r".*?" + _re.escape(END), block, s, count=1, flags=_re.S)
            if new_s != s:
                touched += 1
                if not dry:
                    io.open(f, "w", encoding="utf-8").write(new_s)
                print("  %-58s обновлён" % rel)
            else:
                print("  %-58s уже стоит, без изменений" % rel)
            continue
        if ANCHOR not in s:
            print("  %-58s нет якоря footer-placeholder — пропускаю" % rel)
            continue
        s = s.replace(ANCHOR, block + "\n" + ANCHOR, 1)
        touched += 1
        if not dry:
            io.open(f, "w", encoding="utf-8").write(s)
        which = "Личности" if "lichnosti_click" in block else "Персонотека"
        print("  %-58s + дверь (%s)" % (rel, which))
    print("\nстраниц изменено: %d" % touched)
    print("цели в Метрике (счётчик 108138656, тип «JavaScript-событие»): "
          "personoteka_click, lichnosti_click")
    if dry:
        print("БЕЗ ЗАПИСИ")


if __name__ == "__main__":
    main()
