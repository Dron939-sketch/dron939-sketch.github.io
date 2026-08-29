#!/usr/bin/env python3
"""Приводит lastmod в sitemap.xml к настоящей дате изменения материала.

Зачем. Робот решает по lastmod, когда возвращаться на страницу. Дата,
которая отстала на три месяца, откладывает переобход; дата, которую
подтянули на сегодня у всех 1768 адресов сразу, обесценивает поле —
поиск перестаёт ему верить и начинает игнорировать целиком. Поэтому
дата должна быть настоящей, а не свежей.

Откуда берётся дата — по типу страницы, от точного источника к грубому:

  1. Статья. Из её же JSON-LD: dateModified, иначе datePublished. Это
     та самая дата, которую мы показываем читателю и отдаём поиску в
     разметке Article. Если карта сайта говорит одно, а разметка на
     странице другое, спорят два наших собственных утверждения — и
     верить надо странице.

  2. Хаб, который собирает статьи: рубрика, страница курса, /blog/,
     словарь. Своей даты у него нет и быть не может — он меняется
     тогда, когда меняется то, что он перечисляет. Берём самую свежую
     дату среди материалов, на которые он ссылается.

  3. Всё остальное — оферта, тарифы, контакты, посадочные. Аггрегировать
     нечего, разметки со временем нет. Остаётся дата последнего коммита,
     тронувшего файл. Таких страниц около полутора десятков, и здесь
     огрубление не страшно.

Использование:

    python3 tools/sync_sitemap_dates.py --dry-run   # что изменится
    python3 tools/sync_sitemap_dates.py             # записать
"""

from __future__ import annotations

import argparse
import functools
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITEMAP = ROOT / "sitemap.xml"
SITE = "https://meysternlp.ru/"

DATE_ONLY = re.compile(r"\d{4}-\d{2}-\d{2}")
LD_RE = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
LINK_RE = re.compile(r'href="(?:https://meysternlp\.ru)?(/blog/[a-z0-9-]+\.html)"')

# Типы, у которых дата описывает саму страницу. Всё, что лежит внутри
# itemListElement, описывает не её, а перечисленные материалы: на главной
# это дало бы дату первого манифеста из списка вместо даты главной.
PAGE_TYPES = {
    "Article", "BlogPosting", "NewsArticle", "TechArticle",
    "WebPage", "CollectionPage", "ItemPage", "AboutPage", "FAQPage",
    "Course", "Book", "Report",
}

# Хабы, которые действительно меняются вместе со статьями: рубрики, курсы
# Лектория, сам /blog/. У разделов вроде /treningi/ дети — не статьи блога,
# и максимум по случайным ссылкам на блог дал бы дату чужого материала.
def is_blog_hub(loc_path: str) -> bool:
    return loc_path.startswith("blog/") or loc_path == "blog"


def path_for(loc_path: str) -> Path:
    """Адрес из карты → файл на диске."""
    if loc_path.endswith(".html"):
        return ROOT / loc_path
    return ROOT / loc_path / "index.html" if loc_path else ROOT / "index.html"


@functools.lru_cache(maxsize=4096)
def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _page_nodes(data):
    """Узлы JSON-LD верхнего уровня — без того, что вложено в списки.

    Разворачиваем массив и @graph, но внутрь itemListElement не идём:
    там лежат описания чужих материалов, и их даты к этой странице
    отношения не имеют.
    """
    if isinstance(data, list):
        for item in data:
            yield from _page_nodes(item)
    elif isinstance(data, dict):
        if "@graph" in data:
            for item in data["@graph"]:
                yield from _page_nodes(item)
        else:
            yield data


@functools.lru_cache(maxsize=4096)
def own_date(path: Path) -> str | None:
    """Дата из разметки самой страницы: сначала dateModified, потом datePublished."""
    best_mod: str | None = None
    best_pub: str | None = None
    for m in LD_RE.finditer(read(path)):
        try:
            data = json.loads(m.group(1))
        except (json.JSONDecodeError, ValueError):
            continue
        for node in _page_nodes(data):
            types = node.get("@type")
            types = {types} if isinstance(types, str) else set(types or ())
            if not types & PAGE_TYPES:
                continue
            mod, pub = node.get("dateModified"), node.get("datePublished")
            if isinstance(mod, str) and DATE_ONLY.match(mod):
                best_mod = max(best_mod or "", mod[:10])
            if isinstance(pub, str) and DATE_ONLY.match(pub):
                best_pub = max(best_pub or "", pub[:10])
    return best_mod or best_pub


def aggregated_date(path: Path) -> str | None:
    """Самая свежая дата среди статей блога, на которые ссылается хаб."""
    dates = []
    for href in set(LINK_RE.findall(read(path))):
        d = own_date(ROOT / href.lstrip("/"))
        if d:
            dates.append(d)
    return max(dates) if dates else None


@functools.lru_cache(maxsize=4096)
def git_date(path: Path) -> str | None:
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%ad", "--date=short", "--", str(path)],
            cwd=ROOT, capture_output=True, text=True, timeout=30,
        ).stdout.strip()
        return out or None
    except (OSError, subprocess.SubprocessError):
        return None


def resolve(path: Path, loc_path: str | None = None) -> tuple[str | None, str]:
    """Возвращает (дата, каким источником получена)."""
    if not path.exists():
        return None, "файла нет"
    d = own_date(path)
    if d:
        return d, "разметка страницы"
    if loc_path is not None and is_blog_hub(loc_path):
        d = aggregated_date(path)
        if d:
            return d, "самая свежая из перечисленных статей"
    d = git_date(path)
    if d:
        return d, "последний коммит"
    return None, "источника нет"


# Разбираем карту блоками <url>…</url>, а не одним шаблоном на всю запись.
# Карта записана неоднородно: 880 записей идут в одну строку, 888 — с
# переносами и отступами. Шаблон, который требовал «</loc><lastmod>»
# подряд, на второй половине не находил существующую дату и дописывал
# рядом вторую — в файле получалось два lastmod на один адрес.
URL_BLOCK_RE = re.compile(r"<url>.*?</url>", re.S)
LOC_IN_BLOCK_RE = re.compile(r"<loc>" + re.escape(SITE) + r"([^<]*)</loc>")
LASTMOD_IN_BLOCK_RE = re.compile(r"<lastmod>\s*([0-9][0-9T:+\-]*)\s*</lastmod>")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    xml = SITEMAP.read_text(encoding="utf-8")
    stats = {"как было": 0, "поправлено": 0, "добавлено": 0, "без даты": 0}
    sources: dict[str, int] = {}
    changes: list[tuple[str, str, str, str]] = []

    def replace(m: re.Match) -> str:
        block = m.group(0)
        loc = LOC_IN_BLOCK_RE.search(block)
        if not loc:
            stats["без даты"] += 1
            return block
        loc_path = loc.group(1)

        had = LASTMOD_IN_BLOCK_RE.search(block)
        old = had.group(1)[:10] if had else None

        new, src = resolve(path_for(loc_path), loc_path.rstrip("/"))
        if new is None:
            stats["без даты"] += 1
            return block
        sources[src] = sources.get(src, 0) + 1
        if old == new:
            stats["как было"] += 1
            return block

        stats["поправлено" if had else "добавлено"] += 1
        changes.append((loc_path or "(главная)", old or "—", new, src))

        if had:
            # Меняем только значение — отступы и порядок элементов
            # в записи остаются как были.
            return block[: had.start(1)] + new + block[had.end(1):]
        end = loc.end()
        return block[:end] + f"<lastmod>{new}</lastmod>" + block[end:]

    out = URL_BLOCK_RE.sub(replace, xml)

    for name, n in stats.items():
        print(f"{name}: {n}")
    print("источник даты:")
    for src, n in sorted(sources.items(), key=lambda kv: -kv[1]):
        print(f"  {src}: {n}")

    if args.verbose:
        for loc, old, new, src in changes[:60]:
            print(f"  {loc}: {old} → {new}  ({src})")
        if len(changes) > 60:
            print(f"  … и ещё {len(changes) - 60}")

    if args.dry_run:
        print("\n--dry-run: файл не тронут")
        return 0
    if out == xml:
        print("\nsitemap.xml уже в порядке")
        return 0
    SITEMAP.write_text(out, encoding="utf-8")
    print("\nsitemap.xml записан")
    return 0


if __name__ == "__main__":
    sys.exit(main())
