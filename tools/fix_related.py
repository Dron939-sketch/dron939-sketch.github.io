#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Достраивает блок «Похожие статьи» там, где его нет.

Зачем. На 01.09.2026 в блоге нашлось 1114 страниц без блока `related-grid`.
Из них 962 — лекции Лектория: у них своя навигация по курсу (`course-nav`,
`course-toc`) плюс перекрёстные ссылки, тупиками они не являются и здесь не
трогаются. Остальные 151 — обычные статьи старого шаблона: ни блока похожих,
ни `author-box`, ни `back-link`. Читателю оттуда некуда идти, а скриптам
перелинковки некуда вставить входящую ссылку — именно в них ни разу не
встала карточка, когда выходила новая статья по теме.

Что делает. Вставляет блок непосредственно перед `</main>` — единственное
место, одинаковое во всех 151 файле. Блок самодостаточен: стили инлайновые,
на CSS страницы не опирается, потому что в этих файлах правил `.related-*`
нет вовсе.

Кого подбирает. Сначала статьи той же рубрики, ранжированные по пересечению
значимых слов заголовка и описания; если в рубрике не набирается четырёх —
добираем из всей карты блога тем же ранжированием. Уже упомянутые в тексте
статьи пропускаются, чтобы не дублировать ссылку.

    python3 tools/fix_related.py --dry-run    # показать, что изменится
    python3 tools/fix_related.py              # записать
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"
N_CARDS = 4

STOP = set("""и в во не что он на я с со как а то все она так его но да ты к у же
вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну
вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом
себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб
без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой
совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех
никогда можно при наконец два об другой хоть после над больше тот через эти нас
про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда
лучше чуть том нельзя такой им более всегда конечно всю между это её его свои
свой своя чем эта эти этих также него неё них какие каких что-то нужно стоит
делать сделать почему зачем сколько""".split())

WORD = re.compile(r"[а-яёa-z0-9]+", re.I)


def stem(w: str) -> str:
    """Грубое усечение окончаний: достаточно, чтобы «тревога» и «тревоги» совпали."""
    w = w.lower()
    for end in ("ями", "ами", "иями", "ость", "ство", "ение", "ание", "ого", "его",
                "ому", "ему", "ые", "ий", "ый", "ая", "яя", "ое", "ее", "ых", "их",
                "ам", "ям", "ов", "ев", "ей", "ой", "ом", "ем", "ах", "ях", "ть",
                "ы", "и", "а", "я", "о", "е", "у", "ю"):
        if len(w) - len(end) >= 4 and w.endswith(end):
            return w[: -len(end)]
    return w


def tokens(text: str) -> set:
    return {stem(w) for w in WORD.findall(text.lower())
            if len(w) > 2 and w.lower() not in STOP}


def load_index():
    bm = json.loads((BLOG / "blogmap.json").read_text(encoding="utf-8"))
    si = json.loads((BLOG / "search-index.json").read_text(encoding="utf-8"))
    desc = {x["s"]: x.get("d", "") for x in si}
    arts = {}
    for a in bm["articles"]:
        s = a["slug"]
        arts[s] = {
            "slug": s, "title": a["title"], "rubric": a["rubric"], "mins": a["mins"],
            "toks": tokens(a["title"] + " " + desc.get(s, "")),
        }
    rubric_name = {r["key"]: r["name"] for r in bm["rubrics"]}
    return arts, rubric_name


BLOCK = (
    '\n<section class="related-articles" style="margin:56px 0 40px;padding:28px;'
    'background:#F5F5F7;border-radius:20px">'
    '<h2 style="font-size:1.35rem;margin:0 0 18px">Похожие статьи</h2>'
    '<div class="related-grid" style="display:grid;'
    'grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">{cards}</div>'
    "</section>\n"
)
CARD = (
    '<div class="related-item" style="background:#fff;padding:18px;border-radius:12px">'
    '<a href="/blog/{slug}.html" style="color:#1D1D1F;text-decoration:none;'
    'font-weight:500;display:block;margin-bottom:5px">{title}</a>'
    '<span style="color:#6E6E73;font-size:.85rem">{sub}</span></div>'
)


def pick(art, arts, linked):
    """Четыре ближайшие статьи: сначала своя рубрика, потом весь блог."""
    def ranked(pool):
        out = []
        for c in pool:
            if c["slug"] == art["slug"] or c["slug"] in linked:
                continue
            score = len(art["toks"] & c["toks"])
            if score:
                out.append((score, -abs(c["mins"] - art["mins"]), c))
        out.sort(key=lambda t: (t[0], t[1]), reverse=True)
        return [c for _, _, c in out]

    same = [a for a in arts.values() if a["rubric"] == art["rubric"]]
    chosen = ranked(same)[:N_CARDS]
    if len(chosen) < N_CARDS:
        taken = {c["slug"] for c in chosen}
        rest = [a for a in arts.values() if a["slug"] not in taken]
        chosen += [c for c in ranked(rest) if c["slug"] not in taken][: N_CARDS - len(chosen)]
    return chosen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    arts, rubric_name = load_index()
    targets = []
    for p in sorted(BLOG.glob("*.html")):
        slug = p.stem
        if slug.startswith("lekciya") or slug not in arts:
            continue
        html = p.read_text(encoding="utf-8")
        if 'class="related-grid"' in html:
            continue
        if html.count("</main>") != 1:
            print(f"  пропуск (нет одного </main>): {p.name}")
            continue
        targets.append((p, html, arts[slug]))

    print(f"статей без блока похожих: {len(targets)}")
    changed = 0
    for p, html, art in targets:
        linked = set(re.findall(r'href="/blog/([a-z0-9-]+)\.html"', html))
        chosen = pick(art, arts, linked)
        if len(chosen) < 2:
            print(f"  пропуск (мало кандидатов): {p.name}")
            continue
        cards = "".join(
            CARD.format(slug=c["slug"], title=c["title"].split(":")[0].split(" — ")[0],
                        sub=f'{c["mins"]} мин · {rubric_name[c["rubric"]].split(",")[0].lower()}')
            for c in chosen
        )
        block = BLOCK.format(cards=cards)
        i = html.index("</main>")
        new = html[:i] + block + html[i:]
        changed += 1
        if args.dry_run:
            if changed <= 3:
                print(f"  {p.name} → " + ", ".join(c["slug"] for c in chosen))
        else:
            p.write_text(new, encoding="utf-8")
    print(f"{'будет изменено' if args.dry_run else 'изменено'}: {changed}")


if __name__ == "__main__":
    main()
