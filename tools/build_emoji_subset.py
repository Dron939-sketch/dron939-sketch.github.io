#!/usr/bin/env python3
"""Пересобирает подменный шрифт эмодзи под то, что на сайте есть на самом деле.

Зачем. Эмодзи на сайте несут не украшение, а смысл: значок истории — это её
лицо, 🤖 — аватар Фреди, 🧠 — главная кнопка в шапке. Там, где системного
шрифта эмодзи не хватает, браузер рисует пустой квадрат, и страница выглядит
сломанной.

Против этого уже стоял шрифт-подмена /fonts/noto-emoji-subset.woff2, но он
покрывал только диапазон U+1F900–1FAFF — сто символов из четырёхсот трёх,
которые на сайте используются. Из тридцати одной иконки историй в него
попадало семь: 🌫️, 🕳️, 🗿, 🕯️, ⌛ и ещё девятнадцать оставались на милость
системного шрифта. Ровно один такой квадрат и был снят на скриншоте.

Здесь состав шрифта считается из самих страниц: скрипт собирает все эмодзи,
которые встречаются в HTML, и оставляет в шрифте только их. Диапазон
unicode-range печатается готовой строкой — его нужно проставить в стилях
(это делает tools/fix_emoji_font.py).

Исходник — системный NotoColorEmoji.ttf; в репозитории лежит его лицензия
(fonts/LICENSE-NotoColorEmoji.txt).

    python3 tools/build_emoji_subset.py --dry-run
    python3 tools/build_emoji_subset.py
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf")
OUT = ROOT / "fonts" / "noto-emoji-subset.woff2"

# Диапазоны, где живут пиктограммы. Стрелки, галочки и типографские знаки
# (→, ✓, —) сюда намеренно не входят: они есть в любом текстовом шрифте, и
# подменять их цветной картинкой не надо.
EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001FAFF"   # пиктограммы, эмоции, предметы, символы Extended-A
    "\U00002600-\U000026FF"   # разные символы: ☀ ⚖ ⛵ ⭐
    "\U0001F000-\U0001F0FF"   # маджонг и карты
    "]"
)

SKIP_DIRS = {"node_modules", "vk-drafts", "b17-drafts", "max-drafts", "video-drafts"}


def used_codepoints() -> set[int]:
    cps: set[int] = set()
    for path in ROOT.rglob("*.html"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for ch in EMOJI_RE.findall(text):
            cps.add(ord(ch))
    return cps


# Точный список кодов дал бы строку в две с половиной тысячи знаков в каждой
# из 1775 страниц. Диапазон намеренно грубый: если символ в него попал, но
# в шрифте его нет, браузер по спецификации идёт дальше по font-family —
# лишнего вреда крупные границы не делают, а стилевой блок остаётся коротким.
COARSE = ("U+2600-26FF,U+1F0CF,U+1F300-1F5FF,U+1F600-1F6FF,"
          "U+1F7E0-1F7EB,U+1F900-1FAFF")


def ranges(cps: set[int]) -> str:
    lo, hi = min(cps), max(cps)
    assert 0x2600 <= lo and hi <= 0x1FAFF, "символ вне грубых границ"
    return COARSE


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not SRC.exists():
        print(f"нет исходного шрифта: {SRC}")
        return 1

    cps = used_codepoints()
    print(f"эмодзи на сайте: {len(cps)}")

    from fontTools.ttLib import TTFont
    have = set(TTFont(SRC).getBestCmap())
    keep = sorted(cps & have)
    lost = sorted(cps - have)
    print(f"есть в NotoColorEmoji: {len(keep)}")
    if lost:
        print("  нет в исходнике:", "".join(chr(c) for c in lost))

    was = OUT.stat().st_size if OUT.exists() else 0
    if args.dry_run:
        print(f"--dry-run: файл не тронут (сейчас {was} байт)")
        print("unicode-range:" + ranges(set(keep)))
        return 0

    cmd = [
        sys.executable, "-m", "fontTools.subset", str(SRC),
        "--unicodes=" + ",".join(f"U+{c:X}" for c in keep),
        "--flavor=woff2", "--no-hinting", "--desubroutinize",
        "--layout-features=", "--drop-tables+=DSIG",
        "--output-file=" + str(OUT),
    ]
    subprocess.run(cmd, check=True)
    now = OUT.stat().st_size
    print(f"{OUT.relative_to(ROOT)}: {was} → {now} байт "
          f"({len(keep)} символов, {now // max(len(keep), 1)} байт на символ)")
    print("unicode-range:" + ranges(set(keep)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
