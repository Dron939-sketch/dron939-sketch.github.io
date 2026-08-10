#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Опорный сигнал лекции: сетка крючков со стрелками.

Восстановлен из уже собранных страниц блога — разметка совпадает с той,
что стоит на сайте, побайтово. Глифы лежат в glyphs.json рядом.

    sig.block(hooks=[(глиф, заголовок, приписка), ...],
              note=..., caption=..., label=..., unfold=[...])
"""
import io, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
GLYPHS = json.load(io.open(os.path.join(HERE, "glyphs.json"), encoding="utf-8"))

W, H = 146, 100          # коробка крючка
GAP = 32                 # зазор между коробками
CANVAS = 720
PER_ROW = 4
ROW_STEP = 118           # шаг между рядами по вертикали
TOP = 24

HEAD = ('<h2 id="signal">Опорный сигнал лекции</h2>\n'
        '<p>Это не пересказ и не краткое содержание. Это крючки: по каждому '
        'из них лекция должна разворачиваться целиком.</p>\n')

FIG = ('<figure class="lecfig" style="margin:28px 0;padding:18px 18px 14px;'
       'background:#F8F9FB;border:1px solid #E4E7EC;border-radius:16px">'
       '<svg viewBox="0 0 720 %d" role="img" aria-label="Схема: %s" '
       'style="width:100%%;height:auto;display:block;font-family:inherit">'
       '<defs><marker id="sigar" viewBox="0 0 10 10" refX="9" refY="5" '
       'markerWidth="7" markerHeight="7" orient="auto">'
       '<path d="M0 0 10 5 0 10z" fill="#1D1D1F"/></marker></defs>%s</svg>'
       '<figcaption style="font-size:.85rem;color:#6E6E73;margin-top:12px;'
       'line-height:1.55">%s</figcaption></figure>')

UNFOLD = ('\n<div class="concept-block">\n'
          '<b>Разверните.</b> Закройте текст и по каждому крючку расскажите '
          'вслух, что за ним стоит. Молча «вспомнить» не считается — '
          'вспоминание работает только вслух или на бумаге.\n'
          '<ul>%s</ul>\n'
          'Где споткнулись — там и есть непонятое место, вернитесь к нему в '
          'тексте. И вернитесь к самому сигналу трижды: завтра, через три дня '
          'и через две недели. Одиночное чтение почти ничего не оставляет — '
          'память держит то, к чему возвращаются.\n</div>\n')


def _rows(hooks):
    """Разбивка на ряды не больше PER_ROW, каждый ряд центрируется."""
    out, i = [], 0
    while i < len(hooks):
        out.append(hooks[i:i + PER_ROW])
        i += PER_ROW
    return out


def _row_x0(n):
    total = W * n + GAP * (n - 1)
    return (CANVAS - total) / 2.0


def block(hooks, note, caption, label, unfold):
    if not 2 <= len(hooks) <= 8:
        raise ValueError("крючков должно быть от двух до восьми")
    for g, _, _ in hooks:
        if g not in GLYPHS:
            raise KeyError("нет глифа %r; есть: %s"
                           % (g, ", ".join(sorted(GLYPHS))))
    rows = _rows(hooks)
    parts = []
    for r, row in enumerate(rows):
        y = TOP + r * ROW_STEP
        x0 = _row_x0(len(row))
        for c, (glyph, title, sub) in enumerate(row):
            x = x0 + c * (W + GAP)
            parts.append('<rect x="%.1f" y="%.1f" width="%d" height="%d" '
                         'rx="12" fill="#F8F9FB" stroke="#3A86FF"/>'
                         % (x, float(y), W, H))
            parts.append('<g transform="translate(%.1f %.1f) scale(1.000)" '
                         'fill="none" stroke="#1D1D1F" stroke-width="2" '
                         'stroke-linecap="round" stroke-linejoin="round">%s</g>'
                         % (x + 53, y + 10, GLYPHS[glyph]))
            parts.append('<text x="%.1f" y="%.1f" text-anchor="middle" '
                         'font-size="13" font-weight="700" '
                         'fill="#1D1D1F">%s</text>' % (x + 73, y + 68.0, title))
            parts.append('<text x="%.1f" y="%.1f" text-anchor="middle" '
                         'font-size="10.6" fill="#8A93A3">%s</text>'
                         % (x + 73, y + 86.0, sub))
            if c < len(row) - 1:
                parts.append('<path d="M%.1f %.1f h17" stroke="#1D1D1F" '
                             'stroke-width="2.4" marker-end="url(#sigar)"/>'
                             % (x + W + 1, y + 50.0))
    note_y = TOP + (len(rows) - 1) * ROW_STEP + H + 46
    parts.append('<text x="360" y="%d" text-anchor="middle" font-size="13.5" '
                 'fill="#1D1D1F">%s</text>' % (note_y, note))
    view_h = note_y + 12
    lis = "".join("<li>%s</li>" % u for u in unfold)
    return HEAD + FIG % (view_h, label, "".join(parts), caption) + UNFOLD % lis
