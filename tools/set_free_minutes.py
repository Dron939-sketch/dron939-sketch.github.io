#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Обещание бесплатных минут Фреди на всём сайте.

Сколько минут первого разговора бесплатны — это одна константа на
бэкенде (`FIRST_CONVERSATION_MINUTES` в `backend/subscription_meter.py`
репозитория Frederick), но на сайте она разошлась текстом по полутора
тысячам страниц: в описаниях, в мета-тегах, в блоках «дальше три дня за
69 ₽». 23.09.2026 запас удлинили с 10 до 20 минут, и без такой прогонки
1261 страница обещала бы вдвое меньше, чем даёт продукт.

Меняются только фразы про Фреди — «первые N минут бесплатно», «N
бесплатных минут», «N минут без регистрации», — числом и прописью.
«10 минут» из упражнений («шаг на десять минут», «7-10 минут») не
трогаются: без слова «бесплатно» или «без регистрации» замены нет.

    python3 tools/set_free_minutes.py --dry-run     # что изменится
    python3 tools/set_free_minutes.py --to 20       # применить
"""
import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {'.git', 'node_modules', 'vk-drafts'}

# Числительные прописью — только те, что реально встречаются в текстах.
WORDS = {5: 'пять', 10: 'десять', 15: 'пятнадцать', 20: 'двадцать',
         25: 'двадцать пять', 30: 'тридцать'}
# Родительный падеж для «N бесплатных минут» прописью не нужен: такой
# формы в текстах нет, а выдумывать склонение ради одного вхождения хуже,
# чем оставить цифру.


def _pairs(old, new):
    """Что на что менять. Регистр первой буквы сохраняется."""
    ow, nw = WORDS.get(old), WORDS.get(new)
    out = [
        (f'{old} минут бесплатно', f'{new} минут бесплатно'),
        (f'{old} бесплатных минут', f'{new} бесплатных минут'),
        (f'{old} минут без регистрации', f'{new} минут без регистрации'),
        (f'{old} минут разговора бесплатно', f'{new} минут разговора бесплатно'),
    ]
    if ow and nw:
        out += [
            (f'{ow} минут бесплатно', f'{nw} минут бесплатно'),
            (f'{ow.capitalize()} минут бесплатно', f'{nw.capitalize()} минут бесплатно'),
        ]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='old', type=int, default=10)
    ap.add_argument('--to', dest='new', type=int, default=20)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    if a.old == a.new:
        print('нечего менять: одинаковые числа')
        return 1

    pairs = _pairs(a.old, a.new)
    files = 0
    hits = {}
    for base, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for n in names:
            if not n.endswith(('.html', '.json', '.txt', '.xml')):
                continue
            p = os.path.join(base, n)
            try:
                src = open(p, encoding='utf-8').read()
            except (UnicodeDecodeError, OSError):
                continue
            out = src
            for o, w in pairs:
                if o in out:
                    hits[o] = hits.get(o, 0) + out.count(o)
                    out = out.replace(o, w)
            if out != src:
                files += 1
                if not a.dry_run:
                    open(p, 'w', encoding='utf-8').write(out)
    for o in sorted(hits, key=lambda k: -hits[k]):
        print(f'  {hits[o]:5d} × «{o}»')
    print(('посчитано (--dry-run): ' if a.dry_run else 'изменено: ') + f'{files} файлов')
    return 0


if __name__ == '__main__':
    sys.exit(main())
