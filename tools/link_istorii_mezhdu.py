#!/usr/bin/env python3
"""Связывает истории между собой.

Истории уже ведут в блог и к Фреди, а с сегодняшнего дня получают ссылки
из блога. Друг на друга они не ведут: из тридцати одной истории нельзя
попасть ни в одну другую. Человек, который узнал себя в одной, уходит,
не увидев, что рядом лежат ещё тридцать про то же самое.

Ссылки ставятся в существующий блок «Почитать по теме», рядом со
статьями, но со своим значком: статья объясняет механизм, история
показывает случай, и путать их не надо.

Связи — внутри тематической группы. Соседями считаются истории про одно
и то же: не «обе про чувства», а «обе про то, что не получается уйти».

    python3 tools/link_istorii_mezhdu.py --dry-run
    python3 tools/link_istorii_mezhdu.py
"""

from __future__ import annotations

import argparse
import html as html_mod
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IST = ROOT / "istorii"
MARK = "istoriya-link"

RLIST_RE = re.compile(r'(<div class="rlist">)')

# Группы: истории, между которыми переход осмыслен. Порядок внутри группы
# задаёт соседей — каждая получает две следующие по кругу.
GROUPS: list[list[str]] = [
    # не получается уйти, выбрать, довериться
    ["begu-ot-teh-kto-ryadom", "ne-mogu-uyti-hotya-ne-lyublyu",
     "on-perestal-pisat-pervym", "revnuyu-k-proshlomu"],
    # измена и её последствия
    ["dumayu-chto-izmenyaet-hochu-otomstit", "izmenil-priznavatsya-ili-molchat",
     "uvela-muzhchinu-iz-semyi", "nevesta-predlozhila-vtroem"],
    # родители, дети, семья после развода
    ["ne-mogu-otkazat-mame", "krichu-golosom-materi",
     "prihodyashchaya-mama-posle-razvoda"],
    # как я себя вижу и чего стыжусь
    ["v-zerkale-tolko-nedostatki", "povysili-boyus-razoblacheniya",
     "zaviduyu-drugu", "vypyu-i-stroyu-glazki", "on-zarabatyvaet-bolshe"],
    # смысл, возраст, «жизнь идёт не туда»
    ["vsyo-est-a-smysla-net", "zhivu-ne-svoyu-zhizn", "stareyu-i-ischezayu",
     "ranshe-gorela-teper-pustota", "proigral-boy-v-36"],
    # деньги и своё дело
    ["deneg-nikogda-net", "kredit-na-kredit-i-vru", "boyus-otkryt-svoe-delo"],
    # состояние, которое не выключается
    ["mysli-po-krugu-noch", "em-kogda-ploho", "zhivu-v-telefone",
     "grublyu-provociruyu-draku", "muzhchine-nelzya-nyt"],
    # когда рядом никого
    ["odin-sredi-druzej", "zastryal-v-gore"],
]


def title_of(slug: str) -> str | None:
    page = IST / slug / "index.html"
    if not page.exists():
        return None
    m = re.search(r"<h1[^>]*>(.*?)</h1>",
                  page.read_text(encoding="utf-8", errors="replace"), re.S)
    if not m:
        return None
    # Заголовки историй стоят в кавычках-ёлочках — в списке они лишние,
    # рядом со статьями это читается как цитата внутри цитаты.
    return re.sub(r"<[^>]+>", "", m.group(1)).strip().strip("«»").strip()


def neighbours(group: list[str], slug: str, n: int = 2) -> list[str]:
    i = group.index(slug)
    return [group[(i + k) % len(group)] for k in range(1, min(n, len(group) - 1) + 1)]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    all_slugs = {p.parent.name for p in IST.glob("*/index.html")}
    listed = {s for g in GROUPS for s in g}
    missing = all_slugs - listed
    extra = listed - all_slugs
    if missing:
        print("не попали в группы:", sorted(missing))
    if extra:
        print("в группах, но нет на диске:", sorted(extra))

    done = skipped = 0
    for group in GROUPS:
        for slug in group:
            page = IST / slug / "index.html"
            if not page.exists():
                skipped += 1
                continue
            text = page.read_text(encoding="utf-8")
            if MARK in text:
                skipped += 1
                continue
            m = RLIST_RE.search(text)
            if not m:
                print(f"  нет блока «Почитать по теме»: {slug}")
                skipped += 1
                continue

            links = []
            for nb in neighbours(group, slug):
                t = title_of(nb)
                if not t:
                    continue
                links.append(
                    f'<a class="{MARK}" href="/istorii/{nb}/">'
                    f'<span class="ric">💬</span>{html_mod.escape(t)}'
                    f'<span class="rarr">→</span></a>'
                )
            if not links:
                skipped += 1
                continue

            out = text[: m.end()] + "".join(links) + text[m.end():]
            done += 1
            if not args.dry_run:
                page.write_text(out, encoding="utf-8")

    print(f"\nисторий связано: {done}, пропущено: {skipped}")
    if args.dry_run:
        print("--dry-run: файлы не тронуты")
    return 0


if __name__ == "__main__":
    sys.exit(main())
