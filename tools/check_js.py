#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Проверка инлайновых скриптов и JSON-LD на всех страницах сайта.

    python3 tools/check_js.py            # только ошибки
    python3 tools/check_js.py --all      # и предупреждения

Зачем. 3 сентября на пятнадцати страницах блога нашлась опечатка в
загрузчике шапки:

    ...replaceChild(n,s);});});})();.catch(()=>{})

Точка после `})();` — синтаксическая ошибка, и браузер отбрасывает весь
блок целиком. Шапка и подвал не подгружались вовсе: вместо полного меню
человек видел запасной список из девяти ссылок, вшитый в страницу. Ни
поиска по блогу, ни кнопки Фреди. Полгода, на пятнадцати страницах, молча.

Ни check_site.py, ни check_blog.py такого не ловят: HTML валиден, ссылки
на месте, разметка на месте — не работает только поведение. Заметить это
можно было либо открыв каждую страницу браузером, либо вот так.

Что проверяется:

  скрипты   каждый инлайновый <script> без src разбирается `node --check`.
            Ошибка означает, что блок не исполняется совсем.
  данные    <script type="application/ld+json"> и type="application/json"
            разбираются как JSON. Сломанный JSON-LD поисковик молча
            игнорирует, и разметка, ради которой всё писалось, пропадает;
            сломанный application/json — это неработающий виджет
            самопроверки внутри статьи.

Скрипты с чужим типом (шаблоны и прочие контейнеры) пропускаются: браузер
их не исполняет, и разбирать их как код — ложная тревога.

Требуется node в PATH. Без него проверка скриптов пропускается с
предупреждением, а JSON-LD всё равно проверяется.
"""
import io
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Каталоги с черновиками и служебным: на сайт не публикуются.
SKIP_DIRS = {"vk-drafts", "max-drafts", "video-drafts", "b17-drafts",
             "b17-articles", "node_modules", ".git", "docs"}

SCRIPT_RE = re.compile(r"<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>", re.S | re.I)
SRC_RE = re.compile(r"\bsrc\s*=", re.I)
TYPE_RE = re.compile(r'type\s*=\s*["\']?([^"\'>\s]+)', re.I)

# <script> исполняется браузером, только если тип пустой или javascript-овый.
# Всё остальное — контейнер данных: сайт держит в них настройки виджета
# самопроверки (application/json) и разметку для поисковиков (ld+json).
# Разбирать их как код — ложная тревога: первый прогон так и выдал
# двенадцать «ошибок» на блоках самопроверки.
JS_TYPES = {"", "module", "text/javascript", "application/javascript",
            "application/ecmascript", "text/ecmascript"}
JSON_TYPES = {"application/json", "application/ld+json"}


def pages():
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for name in files:
            if name.endswith(".html"):
                yield os.path.join(base, name)


def have_node():
    try:
        subprocess.run(["node", "--version"], capture_output=True, check=True)
        return True
    except Exception:
        return False


def check_script(body):
    """Вернуть текст ошибки разбора или None."""
    fh = tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False, encoding="utf-8")
    try:
        # .mjs — модуль: `import`/`export` в инлайновых скриптах не редкость,
        # а как обычный скрипт node их отверг бы и дал ложную тревогу.
        fh.write(body)
        fh.close()
        r = subprocess.run(["node", "--check", fh.name], capture_output=True, text=True)
        if r.returncode == 0:
            return None
        for line in r.stderr.splitlines():
            line = line.strip()
            if line.startswith("SyntaxError"):
                return line
        return (r.stderr.strip().splitlines() or ["не разбирается"])[0]
    finally:
        os.unlink(fh.name)


def main():
    show_all = "--all" in sys.argv
    node_ok = have_node()
    if not node_ok:
        print("! node не найден — скрипты не проверяю, только JSON-LD")

    errors = []
    n_pages = n_scripts = n_ld = 0

    for path in sorted(pages()):
        rel = os.path.relpath(path, ROOT)
        try:
            s = io.open(path, encoding="utf-8").read()
        except (OSError, UnicodeDecodeError) as e:
            errors.append((rel, "файл", str(e)))
            continue
        n_pages += 1

        for m in SCRIPT_RE.finditer(s):
            attrs, body = m.group("attrs"), m.group("body")
            if SRC_RE.search(attrs) or not body.strip():
                continue
            line = s.count("\n", 0, m.start()) + 1

            tm = TYPE_RE.search(attrs)
            stype = (tm.group(1).lower() if tm else "")

            if stype in JSON_TYPES:
                n_ld += 1
                try:
                    json.loads(body)
                except ValueError as e:
                    errors.append((rel, "%s:%d" % (stype, line), str(e).split("\n")[0]))
                continue

            if stype not in JS_TYPES:
                # чужой тип (шаблон, разметка виджета) — браузер его не исполняет
                continue

            if node_ok:
                n_scripts += 1
                err = check_script(body)
                if err:
                    errors.append((rel, "скрипт:%d" % line, err))

    for rel, where, err in errors:
        print("  %s  [%s]  %s" % (rel, where, err[:120]))

    print("\nстраниц: %d, скриптов: %d, блоков JSON-LD: %d, ошибок: %d"
          % (n_pages, n_scripts, n_ld, len(errors)))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
