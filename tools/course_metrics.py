#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Считает для курсов Лектория два показателя и проставляет их на страницы.

Зачем. У курсов есть длина и число лекций, но по ним не видно ни того,
насколько курс труден для входа, ни того, построен ли он на удержание
материала. Первое читатель узнаёт, только начав; второе не видно вовсе,
хотя разница между курсом с замером, заданиями и цепочкой сверок и
курсом «сплошной текст» — это разница между «прошёл» и «прослушал».

Оба числа считаются из самих файлов, руками их не вписывают.

СЛОЖНОСТЬ — про вход, а не про качество. Складывается из четырёх вещей:
длины лекции, плотности новых понятий, опоры на другие курсы и доли
теоретического материала. Три уровня: начальный, средний, продвинутый.

ИНДЕКС УСВОЕНИЯ — про устройство курса, а НЕ про измеренное усвоение
живыми людьми: мы не ставим экспериментов на слушателях и не выдаём
конструкцию за результат. Считается по пяти вещам, каждая из которых
известна тем, что удерживает материал: замер на входе, лестница заданий
с паузами, цепочка сверок между лекциями, действия недели и финальный
замер с экзаменом.

    python3 tools/course_metrics.py --dry-run     # посмотреть таблицу
    python3 tools/course_metrics.py               # проставить на страницы
    python3 tools/course_metrics.py --json        # выгрузить для хаба
"""
import argparse
import glob
import io
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LEKTORIJ = os.path.join(ROOT, "blog", "lektorij")
BLOG = os.path.join(ROOT, "blog")

_TAG_RE = re.compile(r"<[^>]+>")
_PAUSE_RE = re.compile(r'<span\b[^>]*\bclass="[^"]*\bpause\b', re.I)
_WARN_RE = re.compile(r'<span class="warning-label">([^<]*)</span>')
_LEC_HREF_RE = re.compile(r'href="(/blog/(lekciya-[^"]+\.html))"')


def text_of(html):
    body = re.sub(r"<(script|style|svg)\b.*?</\1>", " ", html, flags=re.S | re.I)
    return re.sub(r"\s+", " ", _TAG_RE.sub(" ", body)).strip()


def lecture_files(course_dir):
    """Лекции курса в порядке, в котором они стоят на странице курса."""
    hub = os.path.join(course_dir, "index.html")
    if not os.path.exists(hub):
        return []
    html = io.open(hub, encoding="utf-8").read()
    seen, out = set(), []
    for _, name in _LEC_HREF_RE.findall(html):
        if name in seen:
            continue
        seen.add(name)
        path = os.path.join(BLOG, name)
        if os.path.exists(path):
            out.append(path)
    return out


def analyse(course_dir):
    lecs = lecture_files(course_dir)
    if not lecs:
        return None

    n = len(lecs)
    chars, concepts, pauses, cross, theory = [], 0, 0, 0, 0
    has_entry_check = has_exam = False
    with_tasks = with_return = with_week = 0

    for idx, path in enumerate(lecs):
        html = io.open(path, encoding="utf-8").read()
        txt = text_of(html)
        chars.append(len(txt))
        concepts += len(re.findall(r'class="concept-block"', html))
        concepts += len(re.findall(r"<h3[^>]*>", html)) // 3
        pauses += len(_PAUSE_RE.findall(html))
        # опора на другие курсы: ссылки в Лекторий за пределы своего курса
        for href in re.findall(r'href="/blog/lektorij/([a-z0-9-]+)/"', html):
            if href != os.path.basename(course_dir):
                cross += 1
        # доля теории: абзацы без «вы» — обезличенное изложение
        paras = re.findall(r"<p>(.*?)</p>", html, re.S)
        if paras:
            impersonal = sum(1 for p in paras if " вы" not in p.lower() and "ваш" not in p.lower())
            theory += impersonal / float(len(paras))

        labels = " ".join(_WARN_RE.findall(html))
        if "Замер на входе" in labels and idx == 0:
            has_entry_check = True
        if "Экзамен" in labels or ("Замер" in labels and idx == n - 1):
            has_exam = True
        if _PAUSE_RE.search(html) and ("Попробуйте" in labels or "Замер" in labels or "Экзамен" in labels):
            with_tasks += 1
        if idx > 0 and re.search(r"<p>Сверка\.", html):
            with_return += 1
        if "Действие недели" in labels or "Действие после курса" in labels:
            with_week += 1

    avg_min = (sum(chars) / float(n)) / 816.0
    concepts_per_lec = concepts / float(n)
    cross_per_lec = cross / float(n)
    theory_share = theory / float(n)

    # ── сложность: чем длиннее лекция, плотнее понятия, больше опоры на
    # другие курсы и обезличенного изложения, тем труднее вход
    score = 0.0
    score += min(1.0, max(0.0, (avg_min - 10.0) / 12.0))          # 10 → 22 мин
    score += min(1.0, concepts_per_lec / 6.0)
    score += min(1.0, cross_per_lec / 3.0)
    score += min(1.0, max(0.0, (theory_share - 0.25) / 0.45))
    score /= 4.0
    level = "начальный" if score < 0.34 else ("средний" if score < 0.62 else "продвинутый")

    # ── индекс усвоения: доля построек, которые удерживают материал
    parts = {
        "замер на входе": 15 if has_entry_check else 0,
        "задания с паузами": round(25.0 * with_tasks / n),
        "сверки между лекциями": round(25.0 * with_return / max(1, n - 1)),
        "действия недели": round(20.0 * with_week / n),
        "финальный замер": 15 if has_exam else 0,
    }
    index = sum(parts.values())

    return {
        "slug": os.path.basename(course_dir),
        "lectures": n,
        "avg_min": round(avg_min, 1),
        "concepts_per_lec": round(concepts_per_lec, 1),
        "cross_per_lec": round(cross_per_lec, 1),
        "theory_share": round(theory_share, 2),
        "difficulty_score": round(score, 3),
        "difficulty": level,
        "index": index,
        "parts": parts,
        "pauses": pauses,
    }


_BADGE_RE = re.compile(
    r'<div class="course-metrics">.*?</div>\s*', re.S)


def badge_html(m):
    """Строка показателей под шапкой курса.

    У курса без заданий индекс честно равен нулю, но «0%» рядом с названием
    читается как двойка за качество, хотя речь только о формате. Поэтому
    ниже двадцати процентов показываем формат словами, а не цифру.
    """
    if m["index"] < 20:
        return (
            '<div class="course-metrics">'
            '<span class="cm-item"><b>Сложность</b> %s</span>'
            '<span class="cm-item"><b>Формат</b> лекции для чтения и прослушивания'
            '<a class="cm-q" href="#kak-schitaem" title="как считаем">?</a></span>'
            '</div>\n' % m["difficulty"])
    bars = "".join(
        '<i class="%s"></i>' % ("on" if m["index"] >= t else "off")
        for t in (20, 40, 60, 80, 100))
    return (
        '<div class="course-metrics">'
        '<span class="cm-item"><b>Сложность</b> %s</span>'
        '<span class="cm-item"><b>Индекс усвоения</b> '
        '<span class="cm-bars" aria-hidden="true">%s</span> %d%%'
        '<a class="cm-q" href="#kak-schitaem" title="как считаем">?</a></span>'
        '</div>\n' % (m["difficulty"], bars, m["index"]))


STYLE = (
    '<style>.course-metrics{display:flex;flex-wrap:wrap;gap:10px 20px;margin:0 0 18px;'
    'font-size:.95rem;color:#4A5563}.course-metrics b{color:#1D1D1F;font-weight:600;'
    'margin-right:6px}.cm-bars{display:inline-flex;gap:3px;vertical-align:middle;'
    'margin:0 6px 0 2px}.cm-bars i{width:14px;height:8px;border-radius:2px;'
    'background:#E0E0E0}.cm-bars i.on{background:#3A86FF}.cm-q{display:inline-block;'
    'width:16px;height:16px;line-height:16px;text-align:center;border-radius:50%;'
    'background:#E8F1FF;color:#3A86FF;text-decoration:none;font-size:.75rem;'
    'margin-left:6px;font-weight:600}</style>\n')

EXPLAIN = (
    '<section class="sec" id="kak-schitaem"><div class="wrap">\n'
    '<div class="note"><b>Как считаются показатели.</b> Оба числа считает '
    'скрипт по самим лекциям курса, вручную их никто не проставляет. '
    '<b>Сложность</b> — это про вход, а не про качество: складывается из длины '
    'лекции, плотности новых понятий, опоры на другие курсы и доли '
    'теоретического изложения. <b>Индекс усвоения</b> — про устройство курса, '
    'а не про то, сколько усвоили живые люди: показывает, насколько курс '
    'построен на удержание материала. В него входят замер на входе, задания '
    'с паузами внутри лекций, сверки с прошлым заданием в начале каждой '
    'следующей, действия недели и финальный замер с экзаменом. Сто процентов '
    'значит, что все пять опор на месте, а не что курс усвоится на сто '
    'процентов.</div>\n</div></section>\n')


def apply_to_course(course_dir, m, dry):
    hub = os.path.join(course_dir, "index.html")
    src = io.open(hub, encoding="utf-8").read()
    out = _BADGE_RE.sub("", src)
    out = re.sub(r'<style>\.course-metrics.*?</style>\s*', "", out, flags=re.S)
    out = re.sub(r'<section class="sec" id="kak-schitaem">.*?</section>\s*', "", out, flags=re.S)

    mm = re.search(r'(<div class="meta"[^>]*>.*?</div>\s*)', out, re.S)
    if not mm:
        return False
    out = out[:mm.end(1)] + STYLE + badge_html(m) + out[mm.end(1):]

    # Пояснение ставим последней секцией — перед подвалом, который на этих
    # страницах подставляется скриптом в div#footer-placeholder.
    fm = re.search(r'<div id="footer-placeholder"', out)
    if fm:
        out = out[:fm.start()] + EXPLAIN + out[fm.start():]

    if out != src and not dry:
        io.open(hub, "w", encoding="utf-8").write(out)
    return out != src


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--json", action="store_true", help="выгрузить метрики в JSON")
    ap.add_argument("--only", help="один курс по slug")
    args = ap.parse_args()

    rows, changed = [], 0
    for d in sorted(glob.glob(os.path.join(LEKTORIJ, "*"))):
        if not os.path.isdir(d):
            continue
        if args.only and os.path.basename(d) != args.only:
            continue
        m = analyse(d)
        if not m:
            continue
        rows.append(m)
        if apply_to_course(d, m, args.dry_run or args.json):
            changed += 1

    rows.sort(key=lambda r: -r["index"])
    if args.json:
        path = os.path.join(BLOG, "lektorij", "metrics.json")
        io.open(path, "w", encoding="utf-8").write(
            json.dumps({r["slug"]: {"difficulty": r["difficulty"], "index": r["index"]}
                        for r in rows}, ensure_ascii=False, indent=1))
        print("метрики выгружены:", os.path.relpath(path, ROOT))
        return

    print("%-34s %5s %6s %7s  %s" % ("курс", "лек", "мин", "индекс", "сложность"))
    for r in rows:
        print("%-34s %5d %6.1f %6d%%  %s" %
              (r["slug"][:34], r["lectures"], r["avg_min"], r["index"], r["difficulty"]))
    ready = sum(1 for r in rows if r["index"] >= 60)
    print("---")
    print("курсов: %d; с индексом 60%% и выше: %d; страниц обновлено: %d"
          % (len(rows), ready, changed))
    if args.dry_run:
        print("(--dry-run: файлы не тронуты)")


if __name__ == "__main__":
    main()
