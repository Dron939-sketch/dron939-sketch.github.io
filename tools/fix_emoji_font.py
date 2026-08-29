#!/usr/bin/env python3
"""Проставляет страницам объявление шрифта-подмены эмодзи.

Пара к tools/build_emoji_subset.py: тот собирает сам шрифт из эмодзи,
которые на сайте есть, этот — приводит страницы в соответствие:

1. У 1129 страниц уже стояло объявление, но со старым диапазоном
   U+1F900-1FAFF — семьдесят символов из четырёхсот. Диапазон меняется
   на полный.
2. Страницам, где эмодзи есть, а объявления нет (594 статьи блога,
   книги, разделы), объявление добавляется — сразу после первого
   @font-face Inter, чтобы стоять рядом с остальными шрифтами.
3. Страницы без эмодзи не трогаются: им нечего подменять и незачем
   грузить лишний файл.

    python3 tools/fix_emoji_font.py --dry-run
    python3 tools/fix_emoji_font.py
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

RANGE = "U+2600-26FF,U+1F0CF,U+1F300-1F5FF,U+1F600-1F6FF,U+1F7E0-1F7EB,U+1F900-1FAFF"

# font-weight:100 900 обязателен: без него грань несёт вес по умолчанию 400,
# и на тексте с font-weight:300 (базовый вес статей) Chromium предпочитает
# грани с интервалом весов, а эту даже не запрашивает — эмодзи остаётся
# системному шрифту, то есть квадрату. Проверено рендером: та же строка с
# весом 400 грузит файл, с весом 300 — нет.
DECL = ("@font-face{font-family:'Inter';font-weight:100 900;"
        "src:url('/fonts/noto-emoji-subset.woff2') format('woff2');"
        f"unicode-range:{RANGE};font-display:swap}}")

COMMENT = ("/* Эмодзи, которых нет в системном шрифте (старые Windows рисуют "
           "квадрат), подменяются своим файлом. Собирается "
           "tools/build_emoji_subset.py из всех эмодзи сайта. */\n")

# Любая прежняя редакция объявления: узкий диапазон, полный без веса и т.д.
OLD_RE = re.compile(
    r"@font-face\{font-family:'Inter';(?:font-weight:100 900;)?"
    r"src:url\('/fonts/noto-emoji-subset\.woff2'\) format\('woff2'\);"
    r"unicode-range:[^;]*;font-display:swap\}"
)

# Куда вставлять новым страницам: после последнего @font-face Inter.
INTER_FACE_RE = re.compile(
    r"@font-face\{font-family:'Inter';[^}]*inter-latin-ext\.woff2[^}]*\}"
)

EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000026FF\U0001F000-\U0001F0FF]"
)

SKIP_DIRS = {"node_modules", "vk-drafts", "b17-drafts", "max-drafts", "video-drafts"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    widened = added = skipped_no_emoji = skipped_no_anchor = 0
    no_anchor: list[str] = []
    for path in sorted(ROOT.rglob("*.html")):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        out = text

        if DECL in out:
            continue  # уже в актуальной редакции
        if OLD_RE.search(out):
            out = OLD_RE.sub(DECL, out)
            widened += 1
        elif "noto-emoji-subset" not in out:
            if not EMOJI_RE.search(out):
                skipped_no_emoji += 1
                continue
            m = INTER_FACE_RE.search(out)
            if not m:
                skipped_no_anchor += 1
                no_anchor.append(str(path.relative_to(ROOT)))
                continue
            out = out[: m.end()] + "\n" + COMMENT + DECL + out[m.end():]
            added += 1
        else:
            continue  # уже стоит новый диапазон

        if not args.dry_run and out != text:
            path.write_text(out, encoding="utf-8")

    print(f"диапазон расширен: {widened}")
    print(f"объявление добавлено: {added}")
    print(f"без эмодзи (не тронуты): {skipped_no_emoji}")
    print(f"эмодзи есть, а вставить некуда (нет @font-face Inter): {skipped_no_anchor}")
    for name in no_anchor[:20]:
        print("   ", name)
    if args.dry_run:
        print("--dry-run: файлы не тронуты")
    return 0


if __name__ == "__main__":
    sys.exit(main())
