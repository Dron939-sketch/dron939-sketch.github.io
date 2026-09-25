#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Каталог Лектория для сервера Фреди: курсы, лекции, правила подбора.

Зачем. Фреди после разговора предлагает «семь дней по теме» — семь шагов
по три минуты, взятых из лекций Лектория. Шаги должны опираться на
лекции, которые существуют, с их настоящими названиями и адресами:
человек пойдёт по ссылке, и придуманной лекции он не найдёт. Названия и
адреса руками не вписываются — они читаются со страниц курсов, как это
делает link_lektorij.py для статей блога, и правила подбора курса по
теме берутся оттуда же (таблица RULES), чтобы блог и Фреди вели на один
и тот же курс.

    python3 tools/build_lektorij_catalog.py                 # печать в stdout
    python3 tools/build_lektorij_catalog.py ../Frederick/backend/data/lektorij_catalog.json

Результат — JSON: {"generated_from": ..., "rules": [[pattern, slug], ...],
"courses": {slug: {"title", "url", "description", "lectures": [{"n",
"title", "url"}]}}}. Курсы без ни одной готовой лекции не попадают.
"""
import glob
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import link_lektorij  # noqa: E402  — RULES, единый подбор курса по теме

LEC_RE = re.compile(
    r'<a class="lec ready" href="(/blog/lekciya-[^"]+)">\s*'
    r'<span class="n">(\d+)</span><span class="t"><b>([^<]+)</b>',
    re.S,
)
H1_RE = re.compile(r"<h1[^>]*>([^<]+)</h1>")
DESC_RE = re.compile(r'<meta name="description" content="([^"]*)"')


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def build() -> dict:
    courses = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "blog", "lektorij", "*", "index.html"))):
        slug = os.path.basename(os.path.dirname(path))
        src = open(path, encoding="utf-8").read()
        lectures = [{"n": int(n), "title": _clean(t), "url": u} for u, n, t in LEC_RE.findall(src)]
        if not lectures:
            continue
        h1 = H1_RE.search(src)
        desc = DESC_RE.search(src)
        courses[slug] = {
            "title": _clean(h1.group(1)) if h1 else slug,
            "url": f"/blog/lektorij/{slug}/",
            "description": _clean(desc.group(1)) if desc else "",
            "lectures": lectures,
        }
    rules = [[p, c] for p, c in link_lektorij.RULES if c in courses]
    return {"generated_from": "tools/build_lektorij_catalog.py", "rules": rules, "courses": courses}


def main() -> None:
    data = build()
    out = json.dumps(data, ensure_ascii=False, indent=1)
    if len(sys.argv) > 1 and sys.argv[1] != "-":
        with open(sys.argv[1], "w", encoding="utf-8") as f:
            f.write(out + "\n")
        n_lec = sum(len(c["lectures"]) for c in data["courses"].values())
        print(f"{len(data['courses'])} курсов, {n_lec} лекций, {len(data['rules'])} правил → {sys.argv[1]}")
    else:
        print(out)


if __name__ == "__main__":
    main()
