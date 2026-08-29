#!/usr/bin/env python3
"""Ставит в каждую лекцию оглавление её курса.

Зачем. Человек приходит из поиска не на страницу курса — по слову
«лекторий» никто не ищет, — а сразу на лекцию: «паническая атака», «как
сказать нет», «выгорание». И попадает в середину курса, не зная, что это
курс.

Что он видел внизу лекции до сих пор: «← Курс «Тревога и как с ней жить»»
и «Следующая лекция →». Медиана ссылок на соседние лекции по всем 1056
лекциям — одна. То есть из десяти лекций курса читателю видно две, и
масштаб — что тут вообще-то полный курс — не виден вовсе.

Здесь добавляется список всех лекций курса с отметкой текущей. Состав
берётся из разметки Course/hasPart на странице курса: она источник
истины и обновляется вместе с курсом, так что списки не разъедутся.

    python3 tools/link_course_toc.py --dry-run
    python3 tools/link_course_toc.py
"""

from __future__ import annotations

import argparse
import html as html_mod
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"
LEKTORIJ = BLOG / "lektorij"

MARK = "course-toc"
NAV_RE = re.compile(r'<nav class="course-nav"')
LD_RE = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)

# Номер лекции уже даёт нумерованный список, поэтому из названия он
# убирается. Форматы в курсах разные: «Лекция 5. Что-то» и
# «Что-то — Лекция 5», встречаются оба.
NUM_HEAD_RE = re.compile(r'^Лекция\s+\d+\.\s*')
NUM_TAIL_RE = re.compile(r'\s*[—-]\s*Лекция\s+\d+\s*$')

STYLE = (
    ".course-toc{margin:34px 0 6px;padding:16px 20px;background:#F7F9FF;"
    "border:1px solid #E3EAFF;border-radius:12px}"
    ".course-toc-title{font-weight:700;margin-bottom:10px;font-size:.98rem}"
    ".course-toc ol{margin:0;padding-left:22px}"
    ".course-toc li{margin:5px 0;font-size:.95rem;line-height:1.45}"
    ".course-toc li[aria-current]{font-weight:700;color:#1D1D1F}"
    ".course-toc a{color:#3A86FF;text-decoration:none;"
    "border-bottom:1px solid rgba(58,134,255,.3)}"
    ".course-toc a:hover{border-bottom-color:#3A86FF}"
    ".course-toc-note{margin:12px 0 0;font-size:.9rem;color:#6A6A70}"
)


def course_lectures() -> dict[str, tuple[str, list[tuple[str, str]]]]:
    """slug курса → (название курса, [(slug лекции, название), …])."""
    out: dict[str, tuple[str, list[tuple[str, str]]]] = {}
    for page in sorted(LEKTORIJ.glob("*/index.html")):
        slug = page.parent.name
        text = page.read_text(encoding="utf-8", errors="replace")
        name, parts = "", []
        for m in LD_RE.finditer(text):
            try:
                data = json.loads(m.group(1))
            except (json.JSONDecodeError, ValueError):
                continue
            nodes = data if isinstance(data, list) else [data]
            for node in nodes:
                if not isinstance(node, dict) or node.get("@type") != "Course":
                    continue
                name = node.get("name") or name
                for part in node.get("hasPart") or []:
                    url = part.get("url", "")
                    mm = re.search(r"/blog/(lekciya-[a-z0-9-]+)\.html", url)
                    if mm:
                        parts.append((mm.group(1), part.get("name", "")))
        if parts:
            out[slug] = (name, parts)
    return out


def clean_title(title: str) -> str:
    title = NUM_HEAD_RE.sub("", title)
    title = NUM_TAIL_RE.sub("", title)
    return title.strip(" .")


def course_label(name: str) -> str:
    """«Лекторий: курс „Тревога…“ — 10 лекций с озвучкой» → «Тревога…»."""
    m = re.search(r"[«\"„]([^»\"“]+)[»\"“]", name)
    return m.group(1) if m else re.sub(r"^Лекторий:\s*курс\s*", "", name).strip()


def build_block(course_name: str, lectures: list[tuple[str, str]], current: str) -> str:
    label = course_label(course_name)
    pos = next(i for i, (s, _) in enumerate(lectures) if s == current) + 1
    items = []
    for slug, title in lectures:
        t = html_mod.escape(clean_title(title))
        if slug == current:
            items.append(f'<li aria-current="true">{t}</li>')
        else:
            items.append(f'<li><a href="/blog/{slug}.html">{t}</a></li>')
    return (
        f'<nav class="{MARK}" aria-label="Лекции курса">'
        f'<div class="course-toc-title">Курс «{html_mod.escape(label)}» — '
        f'{len(lectures)} лекций, эта {pos}-я</div>'
        f'<ol>{"".join(items)}</ol>'
        f'<p class="course-toc-note">Лекции идут подряд, от простого к сложному, '
        f'и каждую можно слушать голосом Фреди.</p></nav>\n'
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    courses = course_lectures()
    by_lecture = {
        slug: (cslug, name, lects)
        for cslug, (name, lects) in courses.items()
        for slug, _ in lects
    }
    print(f"курсов: {len(courses)}, лекций в них: {len(by_lecture)}")

    done = skipped = 0
    reasons: dict[str, int] = {}
    for path in sorted(BLOG.glob("lekciya-*.html")):
        slug = path.stem
        info = by_lecture.get(slug)
        if not info:
            reasons["нет в разметке курса"] = reasons.get("нет в разметке курса", 0) + 1
            skipped += 1
            continue
        text = path.read_text(encoding="utf-8")
        if MARK in text:
            reasons["уже стоит"] = reasons.get("уже стоит", 0) + 1
            skipped += 1
            continue
        m = NAV_RE.search(text)
        if not m:
            reasons["нет блока навигации"] = reasons.get("нет блока навигации", 0) + 1
            skipped += 1
            continue

        _cslug, cname, lects = info
        block = build_block(cname, lects, slug)
        out = text[: m.start()] + block + text[m.start():]
        # Стиль кладём туда же, где описан course-nav, — отдельного файла
        # стилей у лекций нет, всё встроенное.
        anchor = ".course-nav{"
        if anchor in out and ".course-toc{" not in out:
            out = out.replace(anchor, STYLE + anchor, 1)

        done += 1
        if not args.dry_run:
            path.write_text(out, encoding="utf-8")
        if args.limit and done >= args.limit:
            break

    print(f"вставлено: {done}, пропущено: {skipped}")
    for r, n in sorted(reasons.items(), key=lambda kv: -kv[1]):
        print(f"  {r}: {n}")
    if args.dry_run:
        print("--dry-run: файлы не тронуты")
    return 0


if __name__ == "__main__":
    sys.exit(main())
