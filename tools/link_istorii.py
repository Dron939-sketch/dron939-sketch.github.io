#!/usr/bin/env python3
"""Связывает статьи блога с разделом «Истории».

Зачем. Историй 31, и на них не ведёт ни одной ссылки из блога — ровно
ноль. Между собой они тоже не связаны. Попасть туда можно только через
меню, то есть практически никак: человек приходит из поиска на статью,
а не на главную.

При этом сами истории ссылаются и в блог, и к Фреди — то есть отдают
вес, но не получают. Раздел работает в одну сторону.

Обиднее всего, что истории — это готовые длиннохвостые запросы от
первого лица: «Не могу отказать маме», «Ночью мысли идут по кругу»,
«Кричу на ребёнка голосом матери». Это то, что человек набирает в
поиске своими словами, и то, чего в блоге нет: блог объясняет механизм,
а история показывает один случай целиком.

Анкором служит сам заголовок истории. Он у каждой свой и написан живой
речью, поэтому шаблонности не возникает даже при общей рамке фразы.

    python3 tools/link_istorii.py --dry-run
    python3 tools/link_istorii.py
"""

from __future__ import annotations

import argparse
import html as html_mod
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"
IST = ROOT / "istorii"
MARK = "story-link"

FAQ_RE = re.compile(
    r'<h2[^>]*>\s*(?:❓\s*)?(?:Часто задаваемые вопросы|Частые вопросы)\s*</h2>'
)
NAV_RE = re.compile(r'<nav class="course-nav"')

# Рамка фразы меняется, чтобы тридцать вставок не читались одним штампом.
LEADS = [
    "Как это выглядит целиком, на одном случае:",
    "Один разобранный случай по этой теме:",
    "Живой пример, а не схема:",
    "Та же тема, но с одной конкретной историей:",
]

PAIRS: dict[str, str] = {
    "kak-skazat-net": "ne-mogu-otkazat-mame",
    "rumination-mysli-po-krugu": "mysli-po-krugu-noch",
    "ne-mogu-usnut-pryamo-sejchas": "mysli-po-krugu-noch",
    "granicy-rebenku-bez-krika": "krichu-golosom-materi",
    "psihologiya-odinochestva-4-tipa-2026": "odin-sredi-druzej",
    "kak-perezhit-utratu-blizkogo-etapy-gorya": "zastryal-v-gore",
    "gore-ili-depressiya": "zastryal-v-gore",
    "nizkaya-samoocenka-priznaki-i-protokol": "v-zerkale-tolko-nedostatki",
    "sindrom-samozvanca-priznaki-i-protokol": "povysili-boyus-razoblacheniya",
    "ekzistencialnaya-pustota-net-smysla": "vsyo-est-a-smysla-net",
    "shopogolizm-kompulsivnye-pokupki": "deneg-nikogda-net",
    "psihologiya-revnosti-6-tipov": "revnuyu-k-proshlomu",
    "psihologiya-izmeny-8-prichin-nauchnyj-vzglyad": "izmenil-priznavatsya-ili-molchat",
    "muzhchina-posle-40-vsyo-shvacheno": "muzhchine-nelzya-nyt",
    "vygoranie-ili-ustalost": "ranshe-gorela-teper-pustota",
    "kak-formiruyutsya-privychki-petlya": "zhivu-v-telefone",
    "kak-otpustit-obidu": "grublyu-provociruyu-draku",
    "zdorovye-granicy-8-tipov": "ne-mogu-otkazat-mame",
    "psihologiya-razvoda-7-etapov": "prihodyashchaya-mama-posle-razvoda",
    "krizis-40-let-7-etapov-nauchnyj-podhod": "zhivu-ne-svoyu-zhizn",
    "vozrastnye-krizisy-karta": "stareyu-i-ischezayu",
    "psihologiya-deneg-6-arhetipov-test": "kredit-na-kredit-i-vru",
    "kak-perezhit-rasstavanie": "ne-mogu-uyti-hotya-ne-lyublyu",
    "tipy-privyazannosti-test-i-rabota": "begu-ot-teh-kto-ryadom",
    "alkogol-seraya-zona-tihiy-alkogolizm": "vypyu-i-stroyu-glazki",
    "pishchevye-rasstrojstva-6-tipov": "em-kogda-ploho",
    "styd-vs-vina-raznica-kotoraya-kalechit": "zaviduyu-drugu",
    "ne-znayu-chego-ya-hochu": "boyus-otkryt-svoe-delo",
    "vygoranie-5-tipov-i-protokoly-vosstanovleniya": "proigral-boy-v-36",
    "samoocenka-ili-uverennost": "on-zarabatyvaet-bolshe",
    "lichnye-granicy-kak-vystroit": "on-perestal-pisat-pervym",
    # три оставшиеся истории
    "23-manipulyacii-v-otnosheniyah-spravochnik": "dumayu-chto-izmenyaet-hochu-otomstit",
    "granicy-ili-egoizm": "nevesta-predlozhila-vtroem",
    "kak-prostit-4-urovnya-proshcheniya": "uvela-muzhchinu-iz-semyi",
}


def story_title(slug: str) -> str | None:
    page = IST / slug / "index.html"
    if not page.exists():
        return None
    m = re.search(r"<h1[^>]*>(.*?)</h1>", page.read_text(encoding="utf-8", errors="replace"), re.S)
    return re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    done = skipped = 0
    for i, (art, story) in enumerate(sorted(PAIRS.items())):
        path = BLOG / f"{art}.html"
        title = story_title(story)
        if not path.exists() or not title:
            print(f"  пропуск, нет файла: {art} → {story}")
            skipped += 1
            continue
        text = path.read_text(encoding="utf-8")
        if MARK in text:
            skipped += 1
            continue
        m = FAQ_RE.search(text) or NAV_RE.search(text)
        if not m:
            print(f"  пропуск, некуда вставить: {art}")
            skipped += 1
            continue

        lead = LEADS[i % len(LEADS)]
        para = (
            f'\n<p class="{MARK}">{lead} '
            f'<a href="/istorii/{story}/">{html_mod.escape(title)}</a>.</p>\n\n'
        )
        out = text[: m.start()] + para + text[m.start():]
        done += 1
        if not args.dry_run:
            path.write_text(out, encoding="utf-8")

    print(f"\nвставлено: {done}, пропущено: {skipped}")
    print(f"историй охвачено: {len(set(PAIRS.values()))} из {len(list(IST.glob('*/index.html')))}")
    if args.dry_run:
        print("--dry-run: файлы не тронуты")
    return 0


if __name__ == "__main__":
    sys.exit(main())
