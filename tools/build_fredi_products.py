#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Каталог продуктов для сервера Фреди: игры-тренажёры, книги, тренинги.

Зачем. Владелец 29.09.2026: «Фреди должен знать о всех наших продуктах —
игры-симуляторы, книги, курсы в Лектории, тренинги — чтобы, если будет
необходимость, посоветовать». До этого каталог своего (arsenal.py) Фреди
получал только после большого теста, а большинство людей его не проходит:
в их разговоре Фреди не знал ни одной нашей игры, книги или тренинга.

Курсы Лектория сервер уже берёт из data/lektorij_catalog.json
(tools/build_lektorij_catalog.py). Здесь — всё остальное, и тоже не руками:
- игры — описания и группы из tools/build_trenazhery.py (они же на
  странице /trenazhery/), ключи сверены с таблицей ROUTES в fredi/app.js,
  пометка «по подписке» — из PREMIUM_GAMES в fredi/meter.js;
- книги — заголовок и описание со страниц knigi/<slug>/;
- тренинги — со страниц treningi/.

    python3 tools/build_fredi_products.py                 # печать в stdout
    python3 tools/build_fredi_products.py ../Frederick/backend/data/products_catalog.json
"""
import html
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://meysternlp.ru"


def _load_trenazhery():
    spec = importlib.util.spec_from_file_location("build_trenazhery", ROOT / "tools" / "build_trenazhery.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _first_sentence(text: str, limit: int = 150) -> str:
    t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", text or ""))).strip()
    m = re.match(r"(.+?[.!?])(\s|$)", t)
    s = m.group(1) if m else t
    return s if len(s) <= limit else s[:limit].rsplit(" ", 1)[0] + "…"


def _about(desc: str, limit: int = 220) -> str:
    """Описание со страницы: предложения подряд, пока не наберётся смысл.
    Первое предложение бывает служебным («Второе название — …»)."""
    t = re.sub(r"\s+", " ", desc or "").strip()
    out = ""
    for sent in re.findall(r"[^.!?]+[.!?]?", t):
        if len(out) >= 80:
            break
        if len(out) + len(sent) > limit:
            break
        out += sent
    return out.strip() or _first_sentence(t, limit)


def _page(path: Path):
    s = path.read_text(encoding="utf-8")
    h = re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S)
    d = re.search(r'<meta name="description" content="([^"]*)"', s)
    c = re.search(r'<link rel="canonical" href="([^"]*)"', s)
    title = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", h.group(1)))).strip() if h else ""
    return title, html.unescape(d.group(1)).strip() if d else "", c.group(1) if c else ""


def games():
    bt = _load_trenazhery()
    routes = set(bt.routes_from_app())
    app = (ROOT / "fredi" / "app.js").read_text(encoding="utf-8")
    fn_by_key = dict(re.findall(r"^\s*([a-z0-9_]+):\s*\{\s*fn:\s*'([A-Za-z]+)'", app, re.M))
    meter = (ROOT / "fredi" / "meter.js").read_text(encoding="utf-8")
    pm = re.search(r"var PREMIUM_GAMES = \{(.*?)\};", meter, re.S)
    premium_fns = set(re.findall(r"(show[A-Za-z]+):", pm.group(1))) if pm else set()
    group_of = {}
    for _gid, gtitle, _gdesc, keys in bt.GROUPS:
        for k in keys:
            group_of.setdefault(k, gtitle)
    out = []
    for key, g in bt.GAMES.items():
        if key not in routes:
            raise SystemExit(f"игра {key} есть в build_trenazhery.py, но нет в ROUTES fredi/app.js")
        out.append({
            "key": key,
            "name": g["name"],
            "about": _first_sentence(g.get("text", "")),
            "group": group_of.get(key, ""),
            "premium": fn_by_key.get(key) in premium_fns,
            "url": f"{SITE}/fredi/?m={key}",
        })
    return out


def books():
    out = []
    for idx in sorted((ROOT / "knigi").glob("*/index.html")):
        title, desc, canon = _page(idx)
        if title:
            out.append({"title": title, "about": _about(desc), "url": canon})
    return out


def trainings():
    out = []
    for p in sorted((ROOT / "treningi").glob("*.html")):
        if p.name == "index.html":
            continue
        title, desc, canon = _page(p)
        # Заголовок вкладки различает комплекты («Пакет „Стандартный“»),
        # h1 у них одинаковый.
        tt = re.search(r"<title>([^<|]+)", p.read_text(encoding="utf-8"))
        title = html.unescape(tt.group(1)).strip() if tt else title
        if title:
            out.append({"title": title, "about": _about(desc), "url": canon})
    return out


def build():
    return {
        "generated_from": "tools/build_fredi_products.py",
        "games": games(),
        "books": books(),
        "trainings": trainings(),
    }


def main():
    data = build()
    text = json.dumps(data, ensure_ascii=False, indent=1)
    if len(sys.argv) > 1 and sys.argv[1] != "-":
        Path(sys.argv[1]).write_text(text + "\n", encoding="utf-8")
        print(f"игр {len(data['games'])} (по подписке {sum(g['premium'] for g in data['games'])}), "
              f"книг {len(data['books'])}, тренингов {len(data['trainings'])} → {sys.argv[1]}")
    else:
        print(text)


if __name__ == "__main__":
    main()
