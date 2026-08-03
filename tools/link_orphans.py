#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Подбор входящих ссылок для статей-сирот.

Сирота — статья, на которую не ссылается ни одна другая статья: попасть на
неё можно только через каталог и поиск. Скрипт подбирает донора по близости
темы (заголовок и описание из search-index) и вставляет карточку в его блок
«Читать дальше».

Запуск без аргументов — сухой прогон с отчётом; с --apply — правит файлы.
"""
import os, io, re, sys, json, subprocess, collections

ROOT = "/home/user/dron939-sketch.github.io"
BLOG = os.path.join(ROOT, "blog")
LINKS_PER_ORPHAN = 2     # сколько входящих даём каждой сироте
MAX_ADDED_PER_DONOR = 2  # чтобы не раздувать один и тот же блок
MIN_COMMON = 2           # одно общее слово — это совпадение по рубрике, а не по теме
GRID = '<div class="related-grid">'   # у новых статей после тега нет переноса строки

STOP = set("""и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по
только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни
быть был него до вас нибудь опять уж вам сказал ведь там потом себя ничего ей может они тут
где есть надо ней для мы тебя их чем была сам чтоб без будто человек чего раз тоже себе под
жизнь будет ж кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы
нее кажется сейчас были куда зачем всех никогда сегодня можно при наконец два об другой хоть
после над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо
свою этой перед иногда лучше чуть том нельзя такой им более всегда конечно всю между это как
почему сколько это делать очень свои весь наш ваш andrej мейстер""".split())

TAIL = ("ами", "ями", "ого", "ему", "ыми", "ими", "ость", "ение", "ать", "ять",
        "ов", "ах", "ях", "ам", "ям", "ые", "ий", "ая", "ое", "ы", "и", "а", "о", "е", "у", "я")


def norm(w):
    w = w.lower().replace("ё", "е")
    for t in TAIL:
        if len(w) > len(t) + 3 and w.endswith(t):
            return w[: -len(t)]
    return w


def tokens(text):
    ws = re.findall(r"[а-яa-z0-9]+", text.lower().replace("ё", "е"))
    return {norm(w) for w in ws if len(w) > 3 and w not in STOP}


def orphans():
    out = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "check_blog.py"), "--all"],
                         capture_output=True, text=True, cwd=ROOT).stdout
    return [re.search(r"внимание (\S+)\.html", l).group(1)
            for l in out.splitlines() if "сирота" in l]


def main(apply=False):
    idx = {a["s"]: a for a in json.load(io.open(os.path.join(BLOG, "search-index.json"),
                                               encoding="utf-8"))}
    orph = [s for s in orphans() if s in idx]
    orph_set = set(orph)

    # кандидаты в доноры: не сироты, не лекции, с блоком «Читать дальше»
    cand = {}
    for s, a in idx.items():
        if s in orph_set or a["rk"] == "lektorij":
            continue
        p = os.path.join(BLOG, s + ".html")
        if not os.path.exists(p):
            continue
        html = io.open(p, encoding="utf-8").read()
        if GRID not in html:
            continue
        cand[s] = tokens(a["t"] + " " + a.get("d", ""))

    used = collections.Counter()
    plan, unmatched = [], []
    for s in orph:
        a = idx[s]
        ts = tokens(a["t"] + " " + a.get("d", ""))
        scored = []
        for c, ct in cand.items():
            if used[c] >= MAX_ADDED_PER_DONOR:
                continue
            common = ts & ct
            same_rub = idx[c]["rk"] == a["rk"]
            # в своей рубрике достаточно двух общих слов, из чужой — нужно
            # больше: иначе связь держится на случайных совпадениях
            if len(common) < (MIN_COMMON if same_rub else MIN_COMMON + 1):
                continue
            score = len(common) + (3 if same_rub else 0)
            scored.append((score, len(common), c))
        scored.sort(reverse=True)
        picked = []
        for score, n, c in scored:
            if len(picked) >= LINKS_PER_ORPHAN:
                break
            html = io.open(os.path.join(BLOG, c + ".html"), encoding="utf-8").read()
            if ('/blog/%s.html"' % s) in html:
                continue
            picked.append((c, score, n))
            used[c] += 1
        if picked:
            plan.append((s, picked))
        else:
            unmatched.append(s)

    print("сирот: %d, подобраны доноры для %d, без пары: %d"
          % (len(orph), len(plan), len(unmatched)))
    print("доноров задействовано: %d\n" % len(used))
    for s, picked in plan[:8]:
        print("  %s" % idx[s]["t"][:66])
        for c, score, n in picked:
            print("      <- %-46s вес %2d, общих слов %d" % (idx[c]["t"][:46], score, n))
    if unmatched:
        print("\n  без пары:", [idx[s]["t"][:44] for s in unmatched])

    if not apply:
        print("\n(сухой прогон; для правки запустить с --apply)")
        return

    added = 0
    for s, picked in plan:
        a = idx[s]
        for c, _, _ in picked:
            p = os.path.join(BLOG, c + ".html")
            html = io.open(p, encoding="utf-8").read()
            if ('/blog/%s.html"' % s) in html:
                continue
            title = a["t"].split(":")[0] if len(a["t"]) > 46 and ":" in a["t"] else a["t"]
            item = ('<div class="related-item"><a href="/blog/%s.html">%s</a>'
                    '<span>%d мин · %s</span></div>\n'
                    % (s, title, a.get("m", 0), a["r"].split(",")[0].lower()))
            io.open(p, "w", encoding="utf-8").write(
                html.replace(GRID, GRID + item, 1))
            added += 1
    print("\nвставлено ссылок: %d" % added)


if __name__ == "__main__":
    main("--apply" in sys.argv)
