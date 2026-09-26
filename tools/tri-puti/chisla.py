# -*- coding: utf-8 -*-
"""«Три пути к числу» — тренировка операции навыка на числах, вне контекста.
Дано: пять чисел и четыре действия. Надо: число (с уровня 2 — критерий
«на самом деле»). Три пути — три выражения из разных наборов чисел. Мир
закрывает одно число — живы пути без него. Генератор перебирает все
выражения, проверяет, что путей хватает, и печатает лист игрока и лист
ведущего с решениями."""
import os
import itertools
import random
from fractions import Fraction

random.seed(21)
OPS = [("+", lambda a, b: a + b), ("-", lambda a, b: a - b), ("×", lambda a, b: a * b), ("÷", lambda a, b: a / b if b and (a / b).denominator == 1 else None)]


def solve(nums, ok):
    """Все выражения из подмножеств nums (каждое число не более раза), дающие результат, который ok() принимает.
    Возвращает словарь: frozenset(индексов) → (выражение, значение). По одному выражению на набор."""
    found = {}

    def rec(items):  # items: list of (value, text, idxset)
        for i in range(len(items)):
            v, t, s = items[i]
            if len(s) >= 2 and v.denominator == 1 and v > 0 and ok(int(v)) and s not in found:
                found[s] = (t, int(v))
        if len(items) < 2:
            return
        for i, j in itertools.permutations(range(len(items)), 2):
            a, b = items[i], items[j]
            rest = [items[k] for k in range(len(items)) if k not in (i, j)]
            for sym, f in OPS:
                if sym == "+" and a[2] > b[2]: continue  # коммутативность: одна форма
                if sym == "×" and a[2] > b[2]: continue
                r = f(a[0], b[0])
                if r is None or r < 0 or r > 10000: continue
                rec(rest + [(r, f"({a[1]} {sym} {b[1]})", a[2] | b[2])])

    rec([(Fraction(n), str(n), frozenset([i])) for i, n in enumerate(nums)])
    return found


def pretty(t):
    return t[1:-1] if t.startswith("(") and t.endswith(")") and balanced(t[1:-1]) else t


def balanced(s):
    d = 0
    for ch in s:
        if ch == "(": d += 1
        elif ch == ")":
            d -= 1
            if d < 0: return False
    return d == 0


def pick_paths(found, nums, n=4):
    """n путей с как можно более разными наборами чисел; самые короткие выражения вперёд."""
    items = sorted(found.items(), key=lambda kv: (len(kv[0]), len(kv[1][0])))
    chosen = []
    for s, (t, v) in items:
        if all(len(s & c) <= max(0, len(s) - 1) and s != c for c, _, _ in chosen):
            chosen.append((s, t, v))
        if len(chosen) == n: break
    return chosen


def make(level, k):
    while True:
        if level == 1:
            nums = sorted(random.sample(range(1, 13), 5))
            target = random.choice(range(10, 61)); ok = lambda v: v == target; crit = ""
        elif level == 2:
            nums = sorted(random.sample(range(1, 13), 4) + [random.choice([25, 50, 75, 100])])
            m = random.choice([6, 7, 8, 9, 11, 12, 13]); target = m * random.randint(4, 12)
            ok = lambda v, m=m: v % m == 0 and v >= 20; crit = f"любое число, которое делится на {m}"
        else:
            nums = sorted(random.sample(range(2, 13), 4) + [random.choice([20, 25, 50, 75, 100])])
            lo = random.randint(30, 150); hi = lo + random.choice([4, 6, 10])
            target = lo + 2; ok = lambda v, lo=lo, hi=hi: lo <= v <= hi; crit = f"любое число от {lo} до {hi}"
        found = solve(nums, ok)
        if len(found) < 6: continue
        paths = pick_paths(found, nums, 4)
        if len(paths) < 4: continue
        # мир закрывает: число, входящее в первый путь, но не во все
        used = [s for s, _, _ in paths]
        cand = [i for i in used[0] if sum(i in s for s in used) <= 2]
        if not cand: continue
        closed = nums[random.choice(cand)]
        alive = [(s, t, v) for s, t, v in paths if nums.index(closed) not in s]
        if len(alive) < 2: continue
        return dict(level=level, k=k, nums=nums, target=target, crit=crit, paths=paths, closed=closed, alive=alive)


TASKS = [make(1, i) for i in range(1, 11)] + [make(2, i) for i in range(11, 21)] + [make(3, i) for i in range(21, 31)]

RULES = '''<div class="memo"><b>«Три пути к числу» · тренировка операции, часть 0</b>
<p><b>Зачем.</b> До дел про людей операцию ставят на числах: из того, что дано, собрать три разных пути к тому, что надо, и не остаться без пути, когда одно число закрыли. Ни слова про жизнь — навык должен встать чистым.</p>
<p><b>Ход.</b> Ведущий читает: «Дано: 3, 4, 7, 8, 25. Надо: 24». Игрок за 60 секунд пишет три выражения из этих чисел (каждое число в выражении не больше одного раза, действия любые, скобки можно), дающие «надо». <b>Три пути — три разных набора чисел:</b> хотя бы одно число должно отличаться. Отмечает галочкой путь, который считает первым.</p>
<p><b>Мир.</b> Когда три пути написаны, ведущий читает с листа: «Мир закрыл: 8». Пути, где есть 8, вычёркиваются. Осталось два и больше — 3 очка. Один — 1. Ноль — 0. Ошибка в арифметике — путь не считается.</p>
<p><b>Уровни.</b> 1 — задачи 1–10: точное «надо». 2 — задачи 11–20: «надо: 42, на самом деле — любое число, которое делится на 7»; путей к критерию больше, чем к числу, и кто читает «на самом деле» — выигрывает. 3 — задачи 21–30: «на самом деле — любое от 90 до 100», 30 секунд. Переход на дела про людей — когда три задачи подряд дают по 3 очка.</p>
<p><b>Ведущий.</b> Читает, включает таймер, проверяет арифметику, читает «мир закрыл», считает. Не подсказывает, не комментирует. Если игрок написал один путь и сидит — молчать до конца минуты. На листе ведущего — образцы путей; другой верный путь тоже считается.</p></div>'''


def player_sheet():
    rows = []
    for t in TASKS:
        nado = f'<b>Надо:</b> {t["target"]}' + (f' — <b>на самом деле:</b> {t["crit"]}' if t["crit"] else "")
        rows.append(f'<div class="task"><p class="t-n">Задача {t["k"]} · уровень {t["level"]}</p><p><b>Дано:</b> {", ".join(map(str, t["nums"]))} &nbsp; + − × ÷ &nbsp;&nbsp; {nado}</p>'
                    f'<p class="lines">Путь 1: ______________________________ ☐ &nbsp; Путь 2: ______________________________ ☐ &nbsp; Путь 3: ______________________________ ☐ &nbsp; очки ____</p></div>')
    return '<div class="tsheet"><b>«Три пути к числу» · лист игрока</b><p class="st-note">Каждое число — не больше одного раза в выражении. Три пути — три разных набора чисел. Галочка — путь, который делаешь первым.</p>' + "".join(rows) + '</div>'


def host_sheet():
    rows = []
    for t in TASKS:
        nado = f'Надо: {t["target"]}' + (f', на самом деле — {t["crit"]}' if t["crit"] else "")
        sols = "; ".join(f'{pretty(p)} = {v}' for _, p, v in t["paths"])
        alive = "; ".join(f'{pretty(p)}' for _, p, _ in t["alive"])
        rows.append(f'<div class="task"><p class="t-n">Задача {t["k"]} · уровень {t["level"]} &nbsp; Дано: {", ".join(map(str, t["nums"]))}. {nado}.</p>'
                    f'<p class="t-key"><b>Образцы путей:</b> {sols}. <b>Мир закрыл: {t["closed"]}.</b> Живые из образцов: {alive}.</p></div>')
    return '<div class="tsheet key"><b>«Три пути к числу» · лист ведущего</b><p class="st-note">Образцы — не единственные ответы: любой верный путь считается. «Мир закрыл» читать только после того, как три пути записаны.</p>' + "".join(rows) + '</div>'


CSS = '''<style>
body{font-family:Inter,system-ui,sans-serif;margin:0;padding:12mm 13mm;color:#111}
.memo,.tsheet{margin:0 0 8mm;page-break-after:always}.tsheet:last-child{page-break-after:auto}
.memo b,.tsheet b{color:#111}.memo p,.tsheet p{font-size:9.5pt;line-height:1.45;margin:6px 0 0}.st-note{color:#555}
.task{border-top:1px solid #DDD;padding:5px 0 7px;break-inside:avoid}.task p{margin:2px 0 0}.task .t-n{font-weight:800;color:#1F4FB0}.task .t-key{color:#B42318;font-size:8.8pt}.task .lines{font-size:8.5pt;color:#444}
</style>'''
HTML = f'<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Три пути к числу</title>{CSS}</head><body>{RULES}{player_sheet()}{host_sheet()}</body></html>'
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "chisla.html"), "w", encoding="utf-8").write(HTML)
for t in TASKS[:3] + TASKS[10:12] + TASKS[20:22]:
    print(t["k"], t["nums"], "надо", t["target"], t["crit"], "| закрыл", t["closed"], "|", [f'{pretty(p)}={v}' for _, p, v in t["paths"]])
print("задач:", len(TASKS))
