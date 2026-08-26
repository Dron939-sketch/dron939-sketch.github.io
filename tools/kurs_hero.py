#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Пересборка шапки страницы курса по шаблону методички (раздел 7.1).

Порядок нового первого экрана: подзаголовок-расшифровка → метастрока с
цифрами → сцена узнавания → плеер первой лекции → «Чему вы научитесь» →
сжатый обзор. Механика единая для всех курсов; живые тексты приходят из
JSON вида {kurs: {subtitle, scene, skills[], overview}}.

Запуск: python3 tools/kurs_hero.py blocks.json [--dry-run]
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://ffred-ddd989.amvera.io"

_HERO_RE = re.compile(
    r'<p class="eyebrow"[^>]*>.*?</header>', re.S)
_META_RE = re.compile(r'<div class="meta"[^>]*>(.*?)</div>', re.S)
_H1_RE = re.compile(r'<h1>(.*?)</h1>', re.S)
_LEC_RE = re.compile(r'href="/blog/(lekciya-[a-z0-9-]+)\.html"')


def _clean(text: str) -> str:
    """Тексты от агентов — только текст: никакой своей разметки."""
    return re.sub(r"\s+", " ", text.replace("<", "").replace(">", "")).strip()


def build_hero(h1: str, meta_inner: str, first_slug: str, b: dict) -> str:
    skills = [_clean(s).rstrip(";.") for s in b["skills"]]
    lis = "\n".join(
        "<li>%s%s</li>" % (s, ";" if i < len(skills) - 1 else ".")
        for i, s in enumerate(skills))
    listen = ""
    if first_slug:
        listen = (
            '<div id="kursListen" style="display:none;margin:16px 0;padding:14px 16px;'
            'background:#fff;border:1px solid #CFE0FB;border-radius:14px">\n'
            '<p style="margin:0 0 8px;font-size:.9rem;color:#5A6472">'
            '<b style="color:#1D1D1F">\U0001F3A7 Послушайте первую минуту</b> — '
            'тот же голос и темп, что во всём курсе. Понравится — просто не '
            'выключайте: это уже лекция 1.</p>\n'
            '<audio controls preload="none" style="width:100%" id="kursListenAudio"></audio>\n'
            '</div>\n'
            "<script>(function(){var API='" + API + "';"
            "fetch(API+'/api/tts/blog/" + first_slug + "/status')"
            ".then(function(r){return r.json()}).then(function(d){if(!d||!d.ready)return;"
            "var a=document.getElementById('kursListenAudio');"
            "a.src=API+'/api/tts/blog/" + first_slug + ".mp3?v='+(d.v||0);"
            "document.getElementById('kursListen').style.display='block'})"
            ".catch(function(){})})();</script>\n")
    return (
        '<p class="eyebrow">\U0001F393 Лекторий · университет жизни</p>\n'
        "<h1>%s</h1>\n"
        '<p style="color:#1D1D1F;font-weight:600;font-size:1.12rem;margin:0 0 10px">%s</p>\n'
        '<div class="meta" style="margin:0 0 18px">%s</div>\n'
        "<p>%s</p>\n"
        "%s"
        '<div class="key-takeaway" style="margin:22px 0;padding:18px 20px;'
        'background:#F8F9FB;border:1px solid #E4E7EC;border-radius:16px">\n'
        '<p style="margin:0 0 10px;font-weight:600">Чему вы научитесь</p>\n'
        '<ul style="margin:0;padding-left:20px;line-height:1.7">\n%s\n</ul>\n'
        "</div>\n"
        "<p>%s</p>\n"
        "</div></header>"
    ) % (h1, _clean(b["subtitle"]), meta_inner, _clean(b["scene"]), listen,
         lis, _clean(b["overview"]))


def process(kurs: str, b: dict, dry: bool) -> str:
    path = os.path.join(ROOT, "blog", "lektorij", kurs, "index.html")
    s = io.open(path, encoding="utf-8").read()
    hero = _HERO_RE.search(s)
    if not hero:
        return "нет шапки"
    if "kursListen" in hero.group(0):
        return "уже в новом формате"
    h1 = _H1_RE.search(hero.group(0))
    meta = _META_RE.search(hero.group(0))
    lec = _LEC_RE.search(s)
    if not (h1 and meta):
        return "не разобрал шапку"
    missing = [k for k in ("subtitle", "scene", "skills", "overview")
               if not b.get(k)]
    if missing or not (3 <= len(b["skills"]) <= 5):
        return "неполные блоки: %s" % (missing or "skills=%d" % len(b["skills"]))
    new = build_hero(h1.group(1), meta.group(1),
                     lec.group(1) if lec else "", b)
    out = s[:hero.start()] + new + s[hero.end():]
    if not dry:
        io.open(path, "w", encoding="utf-8").write(out)
    return "ok"


def main():
    dry = "--dry-run" in sys.argv
    files = [a for a in sys.argv[1:] if not a.startswith("--")]
    blocks = {}
    for f in files:
        blocks.update(json.load(io.open(f, encoding="utf-8")))
    done = skipped = 0
    for kurs, b in sorted(blocks.items()):
        res = process(kurs, b, dry)
        if res == "ok":
            done += 1
        else:
            skipped += 1
            print("  %-36s %s" % (kurs, res))
    print("собрано: %d, пропущено: %d%s" % (done, skipped,
                                            " (dry-run)" if dry else ""))


if __name__ == "__main__":
    main()
