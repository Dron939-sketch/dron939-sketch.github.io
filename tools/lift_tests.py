#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Поднять вопросы теста на первый экран: описание, приватность и
дисклеймер переезжают под результат, в раздел «О тесте».

    python3 tools/lift_tests.py --dry-run
    python3 tools/lift_tests.py

Зачем. 5 сентября группа «Тест на депрессию» в Директе дала 26 визитов
с отказами 4% и ни одного пройденного теста: сессии по 20–40 секунд,
глубина 1. На телефоне первый вопрос PHQ-9 начинался на глубине 1177 px
— полтора экрана про Спитцера, Кроенке и подсчёт в браузере. Человек
из рекламы пришёл отвечать на вопросы, а не читать историю шкалы.

Плашки над формой («9 вопросов», «около 2 минут», «ответы не
отправляются») остаются: они и есть короткая версия того же текста.
Полный текст никуда не пропадает — он ниже результата, где его читает
тот, кому уже интересно.

Идемпотентен: если между плашками и формой ничего нет — не трогает.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = [
    "testy/depressiya-phq-9/index.html",
    "testy/trevoga-gad-7/index.html",
    "testy/test-na-revnost/index.html",
    "testy/test-na-umenie-lyubit/index.html",
]
FAQ = "<h2>❓ Частые вопросы</h2>"
FORM = '<form id="testForm"'
BLOCK_RE = re.compile(
    r'(?P<block>(?:<p class="lede">.*?</p>\s*)?(?:<div class="privacy">.*?</div>\s*)?'
    r'(?:<div class="disclaimer">.*?</div>\s*)?)\n*(?=' + re.escape(FORM) + r")",
    re.S,
)


def lift(s):
    m = BLOCK_RE.search(s)
    if not m or not m.group("block").strip():
        return s, 0
    block = m.group("block").strip()
    s = s[: m.start("block")] + "\n" + s[m.end():]
    if FAQ not in s:
        return s, -1
    about = "<h2>О тесте</h2>\n" + block + "\n\n"
    s = s.replace(FAQ, about + FAQ, 1)
    return s, 1


def main():
    dry = "--dry-run" in sys.argv
    n = 0
    for rel in PAGES:
        f = os.path.join(ROOT, rel)
        s = io.open(f, encoding="utf-8").read()
        new, k = lift(s)
        if k == 1:
            n += 1
            if not dry:
                io.open(f, "w", encoding="utf-8").write(new)
            print("  %-44s описание перенесено под результат" % rel)
        elif k == -1:
            print("  %-44s нет блока «Частые вопросы» — пропускаю" % rel)
        else:
            print("  %-44s уже поднят" % rel)
    print("страниц изменено: %d%s" % (n, "  БЕЗ ЗАПИСИ" if dry else ""))


if __name__ == "__main__":
    main()
