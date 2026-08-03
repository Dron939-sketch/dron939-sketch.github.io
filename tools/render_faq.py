#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FAQPage должен быть виден на странице, а не только в разметке.

    python3 tools/render_faq.py --dry-run
    python3 tools/render_faq.py

Правила Google по FAQPage требуют, чтобы вопросы и ответы были на самой
странице: «content must be visible to the user on the source page».
На сайте 998 страниц несли FAQPage, и только на 56 все вопросы были
видны — остальные существовали исключительно в JSON-LD. Это не просто
потеря сниппета, а повод для ручных санкций.

Заодно это потеря содержания: готовые вопросы с ответами — ровно тот
формат, который языковые модели цитируют охотнее всего.

Две ситуации разбираются по-разному:

  блока FAQ на странице нет   — вставляем целиком, перед блоком «Читайте
                                также» / призывом к действию / подписью
                                автора, в той же разметке, что уже
                                используется на сайте: <h2>❓ FAQ</h2>,
                                затем пары <h3>вопрос</h3><p>ответ</p>;
  блок есть, но не полный     — дописываем недостающие пары в конец блока,
                                видимый текст не переписываем.

Скрипт идемпотентный: вопрос, который уже виден, второй раз не появится.
"""
import os, io, re, sys, json, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, "blog")
dry = "--dry-run" in sys.argv

FAQ_H2 = re.compile(r'<h2[^>]*>[^<]*(?:FAQ|Частые вопросы|Вопросы и ответы)[^<]*</h2>')
# куда вставлять блок, если его нет: первое из этих мест
ANCHORS = ['<div class="related-articles"', '<div class="cta-block"',
           '<div class="author-block"', '<div class="related-grid"', "</article>"]


def read(p):
    return io.open(p, encoding="utf-8", errors="replace").read()


def faq_nodes(s):
    """Вопросы и ответы из JSON-LD."""
    for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        try:
            d = json.loads(b)
        except Exception:
            continue
        if d.get("@type") == "FAQPage":
            out = []
            for q in d.get("mainEntity", []):
                a = (q.get("acceptedAnswer") or {}).get("text", "")
                if q.get("name") and a:
                    out.append((q["name"].strip(), a.strip()))
            return out
    return []


def visible_text(s):
    t = re.sub(r"<script.*?</script>", "", s, flags=re.S)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t))


def pair(q, a):
    return "<h3>%s</h3><p>%s</p>" % (html.escape(q, quote=False),
                                     html.escape(a, quote=False))


def content_end(s):
    """Позиция закрывающего </div> у <div class="article-content">."""
    m = re.search(r'<div class="article-content"[^>]*>', s)
    if not m:
        return None
    depth = 0
    end = None
    for t in re.finditer(r"<div\b|</div>", s[m.start():]):
        depth += 1 if t.group(0) == "<div" else -1
        if depth == 0:
            end = m.start() + t.start()
            break
    if end is None:
        return None
    # у части статей призыв к действию стоит внутри текста, в самом конце.
    # FAQ логичнее сразу после прозы, до кнопок, — ищем такой блок в хвосте.
    tail = [s.find(t, m.end()) for t in ('<div class="cta-block"',
                                         '<div class="fredi-ask-box"')]
    tail = [i for i in tail if 0 < i < end]
    return min(tail) if tail else end


def block_end(s, start):
    """Конец блока FAQ: последняя пара <h3>…</h3><p>…</p> подряд после него."""
    i = start
    while True:
        m = re.compile(r"\s*<h3[^>]*>.*?</h3>\s*<p[^>]*>.*?</p>", re.S).match(s, i)
        if not m:
            return i
        i = m.end()


def main():
    added_block = added_pairs = 0
    touched = []
    for fn in sorted(os.listdir(BLOG)):
        if not fn.endswith(".html"):
            continue
        p = os.path.join(BLOG, fn)
        s0 = read(p)
        qa = faq_nodes(s0)
        if not qa:
            continue
        vis = visible_text(s0)
        missing = [(q, a) for q, a in qa if q not in vis]
        if not missing:
            continue

        s = s0
        m = FAQ_H2.search(s)
        if m:
            # блок есть — дописываем недостающие пары в его конец
            end = block_end(s, m.end())
            s = s[:end] + "".join(pair(q, a) for q, a in missing) + s[end:]
            added_pairs += len(missing)
        else:
            body = "<h2>❓ Частые вопросы</h2>" + "".join(pair(q, a) for q, a in qa)
            # Ставим в самый конец текста статьи. Искать «первый хвостовой
            # блок» нельзя: у части статей «Читайте также» встречается и в
            # середине, и FAQ уезжает на середину страницы. Поэтому считаем
            # вложенность от <div class="article-content"> до его закрытия.
            i = content_end(s)
            if i is None:
                continue
            s = s[:i] + body + s[i:]
            added_block += 1
        if s != s0:
            if not dry:
                io.open(p, "w", encoding="utf-8").write(s)
            touched.append(fn)

    print("%sблок FAQ добавлен целиком: %d страниц; дописано пар в готовые "
          "блоки: %d" % ("БЕЗ ЗАПИСИ: " if dry else "", added_block, added_pairs))
    print("всего затронуто страниц: %d" % len(touched))
    for fn in touched[:5]:
        print("  " + fn)


if __name__ == "__main__":
    main()
