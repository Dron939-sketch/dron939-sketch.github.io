#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Перевод тёмной темы страницы с «по системе» на «по кнопке».

Страницы, где тёмная тема включалась через @media(prefers-color-scheme:dark),
с 26.10.2026 светлые по умолчанию, тёмные — по кнопке из /theme.js (атрибут
data-theme="dark" на <html>). Фокус-группа: там, где читают и платят,
тёмное мешает, а у половины телефонов тёмная тема системы включена.

    dark_media_to_attr(css)  — @media(prefers-color-scheme:dark){…} → [data-theme=dark] …
    scope_dark(css)          — каждое правило блока только для тёмной темы
"""
import re

DARK = "[data-theme=dark]"


def _blocks(css):
    """Разбить CSS на верхнеуровневые куски (prelude, body) с учётом вложенных скобок."""
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            out.append((css[i:], None))
            break
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == "{":
                depth += 1
            elif css[k] == "}":
                depth -= 1
            k += 1
        out.append((css[i:j], css[j + 1:k - 1]))
        i = k
    return out


def _sel(sel):
    sel = sel.strip()
    if sel in (":root", "html"):
        return DARK
    if sel.startswith(":root") or sel.startswith("html"):
        return DARK + sel.split(None, 1)[0][len(":root") if sel.startswith(":root") else len("html"):] + \
            (" " + sel.split(None, 1)[1] if " " in sel else "")
    return DARK + " " + sel


def scope_dark(css):
    """Каждое правило — только под [data-theme=dark]; @media — внутрь, @keyframes/@font-face — как есть."""
    res = []
    for pre, body in _blocks(css):
        if body is None:
            res.append(pre)
            continue
        p = pre.strip()
        if p.startswith("@media") or p.startswith("@supports"):
            res.append(pre + "{" + scope_dark(body) + "}")
        elif p.startswith("@"):
            res.append(pre + "{" + body + "}")
        else:
            lead = pre[:len(pre) - len(pre.lstrip())]
            res.append(lead + ",".join(_sel(s) for s in p.split(",")) + "{" + body + "}")
    return "".join(res)


def dark_media_to_attr(css):
    """@media(prefers-color-scheme:dark){X} → scope_dark(X); остальное без изменений."""
    res = []
    for pre, body in _blocks(css):
        if body is not None and re.match(r"\s*@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*$", pre):
            lead = pre[:len(pre) - len(pre.lstrip())]
            res.append(lead + scope_dark(body))
        elif body is None:
            res.append(pre)
        else:
            res.append(pre + "{" + body + "}")
    return "".join(res)


def convert_html(html):
    """Во всех <style> страницы заменить системную тёмную тему на тёмную по кнопке."""
    return re.sub(r"(<style[^>]*>)(.*?)(</style>)",
                  lambda m: m.group(1) + dark_media_to_attr(m.group(2)) + m.group(3), html, flags=re.S)


if __name__ == "__main__":
    t = ":root{--a:#fff}\n@media(prefers-color-scheme:dark){body{background:#000}:root{--a:#000}.x b,.y{color:red}}\n.z{c:1}"
    print(dark_media_to_attr(t))
    print(scope_dark("@keyframes k{0%{a:1}}\n.a:hover{b:2}\n@media(max-width:5px){.c{d:3}}"))
