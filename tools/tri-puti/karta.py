# -*- coding: utf-8 -*-
"""«Три пути» · уровень «Карта»: территория, на которой привычная дорога
закрыта, а обходы нарисованы мелко — брод камнями, тропа пунктиром, лодка
у рыбака. От простого к сложному: сначала обходы подписаны, потом только
знаки из легенды, потом обход требует вещи из кармана или двух вещей вместе,
потом закрыто сразу два места. Игрок пишет три пути цепочкой мест.
Механика прежняя: минута, три пути через три разных перехода, «мир закрыл»
один переход, 3/1/0."""
import os
import html as H
import math

W, HH = 190, 100  # мм, поле карты


def e(s):
    return H.escape(str(s), quote=False)


# ----------------------------------------------------------------- рисование
def river(pts, w=4.5):
    d = "M" + " L".join(f"{x},{y}" for x, y in pts)
    return f'<path d="{d}" fill="none" stroke="#9EC5E8" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"/><path d="{d}" fill="none" stroke="#C7E0F4" stroke-width="{w*0.4}" stroke-linejoin="round" stroke-linecap="round"/>'


def ravine(pts, w=5):
    d = "M" + " L".join(f"{x},{y}" for x, y in pts)
    return f'<path d="{d}" fill="none" stroke="#D9C9A8" stroke-width="{w}" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="#8C6E4A" stroke-width="0.5" stroke-dasharray="0.8,1.2" stroke-linejoin="round"/>'


def rail(pts):
    d = "M" + " L".join(f"{x},{y}" for x, y in pts)
    return f'<path d="{d}" fill="none" stroke="#333" stroke-width="1.1"/><path d="{d}" fill="none" stroke="#FFF" stroke-width="0.6" stroke-dasharray="2,2"/>'


def fence(pts):
    d = "M" + " L".join(f"{x},{y}" for x, y in pts)
    return f'<path d="{d}" fill="none" stroke="#555" stroke-width="0.7" stroke-dasharray="1.6,0.9"/>'


def forest(cx, cy, rx, ry, dark=False):
    fill = "#4F7A4A" if dark else "#A8CDA0"
    trees = ""
    for i in range(int(rx * ry / 18)):
        a = i * 2.399
        r = math.sqrt((i + 0.5) / max(1, int(rx * ry / 18)))
        x, y = cx + rx * r * math.cos(a) * 0.9, cy + ry * r * math.sin(a) * 0.9
        trees += f'<path d="M{x:.1f},{y+1.4:.1f} l-1.2,0 l1.2,-2.6 l1.2,2.6 z" fill="{"#2E4E2B" if dark else "#5E8F58"}"/>'
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}"/>{trees}'


def hill(cx, cy, r):
    return "".join(f'<ellipse cx="{cx}" cy="{cy}" rx="{r*k:.1f}" ry="{r*k*0.55:.1f}" fill="none" stroke="#B8A57F" stroke-width="0.4"/>' for k in (1, 0.72, 0.44))


def lake(cx, cy, rx, ry):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#BFDCF2" stroke="#9EC5E8" stroke-width="0.5"/>'


def line(a, b, kind, via=None):
    (x1, y1), (x2, y2) = a, b
    d = f"M{x1},{y1} " + (f"Q{via[0]},{via[1]} " if via else "L") + f"{x2},{y2}"
    if kind == "road":
        return f'<path d="{d}" fill="none" stroke="#7A6A50" stroke-width="2.4" stroke-linecap="round"/><path d="{d}" fill="none" stroke="#E8D9B5" stroke-width="1.5" stroke-linecap="round"/>'
    if kind == "path":  # тропа: еле видно
        return f'<path d="{d}" fill="none" stroke="#7D7D7D" stroke-width="0.55" stroke-dasharray="1.2,1.4" stroke-linecap="round"/>'
    if kind == "faint":  # едва заметная тропа
        return f'<path d="{d}" fill="none" stroke="#A0A0A0" stroke-width="0.4" stroke-dasharray="0.7,1.6" stroke-linecap="round"/>'
    if kind == "log":
        return f'<path d="{d}" fill="none" stroke="#6B4A2B" stroke-width="1.2" stroke-linecap="round"/>'
    if kind == "bridge":
        return f'<path d="{d}" fill="none" stroke="#3A3A3A" stroke-width="3" stroke-linecap="butt"/><path d="{d}" fill="none" stroke="#E8D9B5" stroke-width="1.5"/>'
    if kind == "water":  # маршрут лодки/парома — не рисуется, только знак
        return ""
    raise ValueError(kind)


def mark(kind, x, y, label=None, small=False):
    s = 0.75 if small else 1
    g = ""
    if kind == "X":  # закрыто
        g = f'<path d="M{x-2.6},{y-2.6} L{x+2.6},{y+2.6} M{x+2.6},{y-2.6} L{x-2.6},{y+2.6}" stroke="#D0312D" stroke-width="1.3"/>'
    elif kind == "brod":  # камни в реке
        g = "".join(f'<circle cx="{x+dx:.1f}" cy="{y+dy:.1f}" r="{0.55*s:.2f}" fill="#8A8A8A"/>' for dx, dy in ((-1.6, 0.4), (-0.3, -0.5), (1.1, 0.3), (2.3, -0.4)))
    elif kind == "boat":  # лодка / паром
        g = f'<path d="M{x-2.2*s},{y} L{x+2.2*s},{y} L{x+1.4*s},{y+1.3*s} L{x-1.4*s},{y+1.3*s} z" fill="#6B4A2B"/><path d="M{x},{y} L{x},{y-2.2*s}" stroke="#333" stroke-width="0.4"/>'
    elif kind == "hut":
        g = f'<path d="M{x-1.8*s},{y+1.2*s} L{x-1.8*s},{y-0.6*s} L{x},{y-2.1*s} L{x+1.8*s},{y-0.6*s} L{x+1.8*s},{y+1.2*s} z" fill="#C97B3A" stroke="#5A3A1A" stroke-width="0.35"/>'
    elif kind == "gate":
        g = f'<rect x="{x-2.2}" y="{y-1.1}" width="4.4" height="2.2" fill="#333"/><path d="M{x-1.4},{y-1.1} L{x-1.4},{y+1.1} M{x},{y-1.1} L{x},{y+1.1} M{x+1.4},{y-1.1} L{x+1.4},{y+1.1}" stroke="#FFF" stroke-width="0.35"/>'
    elif kind == "wicket":  # калитка — разрыв в заборе
        g = f'<rect x="{x-0.9}" y="{y-1.3}" width="1.8" height="2.6" fill="#FFF" stroke="#555" stroke-width="0.35"/>'
    elif kind == "hole":  # дыра в заборе
        g = f'<circle cx="{x}" cy="{y}" r="1" fill="#FFF" stroke="#777" stroke-width="0.3" stroke-dasharray="0.5,0.4"/>'
    elif kind == "ladder":  # пешеходный мостик над путями
        g = f'<path d="M{x-2},{y-1.6} L{x+2},{y-1.6} M{x-2},{y+1.6} L{x+2},{y+1.6} M{x-1.4},{y-1.6} L{x-1.4},{y+1.6} M{x},{y-1.6} L{x},{y+1.6} M{x+1.4},{y-1.6} L{x+1.4},{y+1.6}" stroke="#333" stroke-width="0.45"/>'
    elif kind == "bus":
        g = f'<rect x="{x-2.4}" y="{y-1.3}" width="4.8" height="2.6" rx="0.5" fill="#2F6DB5"/><circle cx="{x-1.4}" cy="{y+1.5}" r="0.5" fill="#222"/><circle cx="{x+1.4}" cy="{y+1.5}" r="0.5" fill="#222"/>'
    elif kind == "car":
        g = f'<rect x="{x-2.2}" y="{y-1}" width="4.4" height="2" rx="0.6" fill="#B03030"/><circle cx="{x-1.3}" cy="{y+1.2}" r="0.5" fill="#222"/><circle cx="{x+1.3}" cy="{y+1.2}" r="0.5" fill="#222"/>'
    elif kind == "barrier":  # шлагбаум
        g = f'<path d="M{x-2.6},{y} L{x+2.6},{y}" stroke="#D0312D" stroke-width="0.9"/><path d="M{x-2.6},{y} L{x+2.6},{y}" stroke="#FFF" stroke-width="0.9" stroke-dasharray="1,1"/>'
    elif kind == "tunnel":
        g = f'<path d="M{x-2.4},{y+1.6} L{x-2.4},{y-0.2} A2.4,2.4 0 0 1 {x+2.4},{y-0.2} L{x+2.4},{y+1.6}" fill="#333"/>'
    elif kind == "rope":  # спуск по верёвке — скала
        g = f'<path d="M{x-2},{y+1.5} L{x-0.5},{y-1.8} L{x+2},{y+1.5} z" fill="#9A9A9A"/>'
    elif kind == "person":
        g = f'<circle cx="{x}" cy="{y-1.4}" r="0.8" fill="#333"/><path d="M{x-1.1},{y+1.6} L{x-1.1},{y-0.3} L{x+1.1},{y-0.3} L{x+1.1},{y+1.6} z" fill="#333"/>'
    elif kind == "stairs":
        g = f'<path d="M{x-2},{y+1.5} L{x-2},{y+0.5} L{x-1},{y+0.5} L{x-1},{y-0.5} L{x},{y-0.5} L{x},{y-1.5} L{x+1},{y-1.5} L{x+1},{y-2.5} L{x+2},{y-2.5}" fill="none" stroke="#333" stroke-width="0.5"/>'
    elif kind == "clock":
        g = f'<circle cx="{x}" cy="{y}" r="1.8" fill="#FFF" stroke="#333" stroke-width="0.4"/><path d="M{x},{y} L{x},{y-1.2} M{x},{y} L{x+0.9},{y}" stroke="#333" stroke-width="0.4"/>'
    if label:
        g += f'<text x="{x+3}" y="{y+1}" font-size="{2.9 if small else 3.2}" fill="{"#8A8A8A" if small else "#444"}" font-style="italic">{e(label)}</text>'
    return g


def node(x, y, name, kind="place"):
    if kind == "start":
        c = f'<circle cx="{x}" cy="{y}" r="2.6" fill="#1F4FB0"/><text x="{x}" y="{y+1.1}" font-size="3" fill="#FFF" text-anchor="middle" font-weight="700">A</text>'
    elif kind == "goal":
        c = f'<circle cx="{x}" cy="{y}" r="2.6" fill="#D0312D"/><text x="{x}" y="{y+1.1}" font-size="3" fill="#FFF" text-anchor="middle" font-weight="700">Б</text>'
    else:
        c = f'<circle cx="{x}" cy="{y}" r="1.5" fill="#FFF" stroke="#333" stroke-width="0.6"/>'
    return c + f'<text x="{x}" y="{y-3.2}" font-size="3.3" fill="#111" text-anchor="middle" font-weight="{700 if kind != "place" else 500}">{e(name)}</text>'


def svg(m):
    N = m["nodes"]
    out = [f'<svg viewBox="0 0 {W} {HH}" width="{W}mm" height="{HH}mm" xmlns="http://www.w3.org/2000/svg" font-family="Inter,system-ui,sans-serif"><rect width="{W}" height="{HH}" fill="#F6F1E6" stroke="#CFC6B4" stroke-width="0.4"/>']
    out += m.get("terrain", [])
    for ed in m["edges"]:
        out.append(line(N[ed[0]][:2], N[ed[1]][:2], ed[2], ed[3] if len(ed) > 3 else None))
    out += m.get("marks", [])
    for name, (x, y, k) in N.items():
        out.append(node(x, y, name, k))
    out.append("</svg>")
    return "".join(out)


# ----------------------------------------------------------------------- карты
# Каждая карта: nodes {имя: (x, y, тип)}, edges (a, b, вид[, точка изгиба]),
# terrain, marks, dano (что в кармане), nado, block (что закрыто и почему),
# paths (образцы цепочкой), closed (какой переход закрывает мир), tier.
MAPS = []


def add(**k):
    MAPS.append(k)


# ---- ярус А (карты 1–4): обходы подписаны на карте, надо только посмотреть
add(tier="А", title="Через реку в школу",
    nodes={"Дом": (18, 70, "start"), "Мост": (80, 52, "place"), "Мельница": (60, 22, "place"), "Пристань": (78, 84, "place"), "Школа": (168, 40, "goal"), "Лес": (135, 78, "place")},
    terrain=[river([(95, 0), (92, 30), (96, 55), (100, 80), (98, 100)]), forest(135, 78, 26, 14), hill(150, 20, 14)],
    edges=[("Дом", "Мост", "road"), ("Мост", "Школа", "road", (125, 45)), ("Дом", "Мельница", "path", (35, 40)), ("Мельница", "Школа", "path", (120, 25)), ("Дом", "Пристань", "path", (45, 85)), ("Пристань", "Лес", "water"), ("Лес", "Школа", "path", (160, 62))],
    marks=[mark("X", 95, 52), '<text x="99" y="60" font-size="3" fill="#D0312D" font-weight="700">мост сломан</text>',
           mark("brod", 93, 22, "брод"), mark("boat", 100, 84, "паром, 1 монета"), mark("hut", 84, 90)],
    dano="в кармане: монета, хлеб", nado="попасть в школу",
    block="мост через реку сломан",
    paths=["Дом — Мельница — брод — Школа", "Дом — Пристань — паром — Лес — Школа", "Дом — Мост — попросить лодку у паромщика с этого берега — Школа", "вдоль реки вверх к мельнице, там мельник переправляет на плоскодонке"],
    closed="паром: паромщик ушёл обедать")

add(tier="А", title="Ворота заперты",
    nodes={"Дом": (20, 30, "start"), "Ворота": (95, 30, "place"), "Церковь": (60, 78, "place"), "Сторожка": (108, 12, "place"), "Аптека": (165, 60, "goal"), "Холм": (150, 15, "place")},
    terrain=[fence([(100, 0), (100, 22), (100, 38), (100, 60), (100, 100)]), hill(150, 15, 15), forest(40, 85, 18, 10)],
    edges=[("Дом", "Ворота", "road"), ("Ворота", "Аптека", "road", (130, 45)), ("Дом", "Церковь", "path", (30, 60)), ("Церковь", "Аптека", "path", (120, 88)), ("Дом", "Сторожка", "path", (60, 8)), ("Сторожка", "Холм", "path"), ("Холм", "Аптека", "path", (172, 35))],
    marks=[mark("gate", 100, 30), '<text x="104" y="37" font-size="3" fill="#D0312D" font-weight="700">заперто до 8 утра</text>',
           mark("wicket", 100, 84, "калитка за церковью"), mark("hut", 116, 16), mark("person", 121, 18, "сторож с ключом"),
           '<text x="128" y="30" font-size="2.9" fill="#8A8A8A" font-style="italic">тропа по холму, в обход забора</text>'],
    dano="в кармане: телефон, ничего больше", nado="попасть в аптеку до открытия ворот",
    block="ворота посёлка заперты до восьми утра",
    paths=["Дом — Церковь — калитка — Аптека", "Дом — Сторожка — сторож открывает — Аптека", "Дом — Сторожка — Холм — в обход забора — Аптека", "позвонить в аптеку: там есть доставка через калитку"],
    closed="калитка: замок повесили")

add(tier="А", title="Овраг",
    nodes={"Хутор": (20, 55, "start"), "Мостик": (85, 55, "place"), "Станция": (170, 50, "goal"), "Большак": (100, 92, "place"), "Верховье": (75, 12, "place")},
    terrain=[ravine([(88, 0), (90, 25), (92, 55), (90, 80), (88, 100)], 6), forest(150, 85, 22, 10), hill(40, 20, 12)],
    edges=[("Хутор", "Мостик", "road"), ("Мостик", "Станция", "road", (130, 50)), ("Хутор", "Верховье", "path", (40, 28)), ("Верховье", "Станция", "path", (125, 12)), ("Хутор", "Большак", "road", (45, 90)), ("Большак", "Станция", "road", (150, 80))],
    marks=[mark("X", 91, 55), '<text x="95" y="63" font-size="3" fill="#D0312D" font-weight="700">мостик смыло</text>',
           '<text x="96" y="8" font-size="2.9" fill="#8A8A8A" font-style="italic">овраг сходит на нет — обход поверху</text>',
           line((84, 35), (97, 33), "log"), '<text x="99" y="35" font-size="2.9" fill="#8A8A8A" font-style="italic">бревно</text>',
           mark("car", 100, 96, "попутки на большаке")],
    dano="в кармане: сто рублей", nado="на станцию к поезду",
    block="мостик через овраг смыло",
    paths=["Хутор — Верховье — обход поверху — Станция", "Хутор — бревно через овраг — Станция", "Хутор — Большак — попутка — Станция", "спуститься в овраг и подняться: без моста, но ногами"],
    closed="бревно: скользкое после дождя, не пройти")

add(tier="А", title="Под путями вода",
    nodes={"Дом": (22, 30, "start"), "Тоннель": (95, 30, "place"), "Рынок": (168, 30, "goal"), "Переезд": (95, 82, "place"), "Остановка": (30, 75, "place")},
    terrain=[rail([(100, 0), (100, 100)]), forest(160, 80, 20, 12)],
    edges=[("Дом", "Тоннель", "road"), ("Тоннель", "Рынок", "road"), ("Дом", "Переезд", "path", (40, 60)), ("Переезд", "Рынок", "path", (140, 70)), ("Дом", "Остановка", "road"), ("Остановка", "Рынок", "road", (100, 110))],
    marks=[mark("tunnel", 100, 30), mark("X", 100, 30), '<text x="104" y="38" font-size="3" fill="#D0312D" font-weight="700">тоннель затоплен</text>',
           mark("barrier", 100, 82, "переезд, шлагбаум открывают"), mark("ladder", 100, 55, "мостик над путями"), mark("bus", 30, 80, "автобус в объезд, 20 мин")],
    dano="в кармане: билет на автобус", nado="на рынок",
    block="тоннель под путями затоплен",
    paths=["Дом — мостик над путями — Рынок", "Дом — Переезд — Рынок", "Дом — Остановка — автобус — Рынок", "дождаться, пока откачают: табличка «30 минут»"],
    closed="мостик над путями: на ремонте, лестница снята")

# ---- ярус Б (карты 5–8): обходы только знаками из легенды; часть требует вещи из кармана
add(tier="Б", title="Ночью в больницу",
    nodes={"Дом": (18, 50, "start"), "Мост": (85, 50, "place"), "Больница": (170, 45, "goal"), "Пристань": (70, 88, "place"), "Луг": (60, 15, "place"), "Роща": (130, 82, "place")},
    terrain=[river([(92, 0), (94, 40), (96, 70), (94, 100)]), forest(130, 82, 28, 14, dark=True), hill(150, 15, 12)],
    edges=[("Дом", "Мост", "road"), ("Мост", "Больница", "road", (130, 40)), ("Дом", "Луг", "faint", (30, 25)), ("Луг", "Больница", "faint", (120, 10)), ("Дом", "Пристань", "path", (35, 80)), ("Пристань", "Роща", "water"), ("Роща", "Больница", "faint", (160, 65))],
    marks=[mark("X", 94, 50), '<text x="98" y="58" font-size="3" fill="#D0312D" font-weight="700">мост закрыт</text>',
           mark("brod", 94, 14, small=True), mark("boat", 96, 88, small=True), mark("hut", 78, 94, small=True), mark("clock", 148, 92, "23:40, темно", small=True)],
    dano="в кармане: фонарь, монета, сапоги", nado="в больницу за час",
    block="мост закрыт на ремонт, ночь",
    paths=["Дом — Луг — брод (сапоги) — Больница", "Дом — Пристань — паром (монета) — Роща (фонарь) — Больница", "Дом — Пристань — паромщик — перевезёт и на своём берегу покажет дорогу в обход рощи", "Дом — Мост — по закрытому мосту пешком, если закрыт только для машин (спросить у рабочих)"],
    closed="фонарь сел: через тёмную рощу не пройти")

add(tier="Б", title="Дорогу размыло",
    nodes={"Пристань": (22, 80, "start"), "Хутор": (168, 25, "goal"), "Поворот": (90, 70, "place"), "Берег": (60, 40, "place"), "Скала": (120, 30, "place"), "Изба": (40, 95, "place")},
    terrain=[lake(60, 20, 50, 14), river([(0, 60), (30, 62), (60, 58), (90, 52), (120, 48), (150, 44), (190, 40)], 3.5), hill(120, 30, 10)],
    edges=[("Пристань", "Поворот", "road"), ("Поворот", "Хутор", "road", (140, 55)), ("Пристань", "Берег", "faint", (50, 66)), ("Берег", "Скала", "faint", (90, 30)), ("Скала", "Хутор", "faint"), ("Пристань", "Изба", "path")],
    marks=[mark("X", 115, 62), '<text x="100" y="72" font-size="3" fill="#D0312D" font-weight="700">дорогу размыло</text>',
           mark("boat", 24, 96, small=True), mark("person", 50, 95, small=True), mark("hut", 44, 98, small=True),
           mark("rope", 120, 38, small=True), mark("brod", 60, 58, small=True),
           '<text x="6" y="8" font-size="2.9" fill="#8A8A8A" font-style="italic">озеро выходит к хутору</text>'],
    dano="в кармане: верёвка, телефон", nado="на хутор к вечеру",
    block="дорогу за поворотом размыло, машины не идут",
    paths=["Пристань — Изба — попросить лодку у рыбака — озером к Хутору", "Пристань — брод — Берег — Скала — спуск по верёвке — Хутор", "Пристань — Поворот — размытое место пешком, если размыло только для машин", "позвонить на хутор: за тобой выйдут с той стороны, встретите у размыва"],
    closed="рыбак уплыл на озеро до ночи")

add(tier="Б", title="Школа закрыта",
    nodes={"Класс": (30, 40, "start"), "Ворота": (95, 40, "place"), "Дом": (168, 40, "goal"), "Мастерская": (60, 85, "place"), "Спортзал": (60, 12, "place"), "Сторожка": (100, 88, "place")},
    terrain=[fence([(100, 0), (100, 100)]), forest(160, 80, 22, 12)],
    edges=[("Класс", "Ворота", "road"), ("Ворота", "Дом", "road"), ("Класс", "Мастерская", "path", (35, 65)), ("Класс", "Спортзал", "path"), ("Класс", "Сторожка", "faint", (70, 70)), ("Мастерская", "Дом", "faint", (130, 92)), ("Спортзал", "Дом", "faint", (130, 8))],
    marks=[mark("gate", 100, 40), '<text x="104" y="48" font-size="3" fill="#D0312D" font-weight="700">заперто после 18:00</text>',
           mark("hole", 100, 95, small=True), mark("hut", 108, 90, small=True), mark("person", 113, 92, small=True),
           mark("wicket", 100, 8, small=True), mark("clock", 150, 12, "18:20", small=True)],
    dano="в кармане: телефон, номер сторожа на доске у входа", nado="выйти из школы и попасть домой",
    block="ворота школы заперли в шесть",
    paths=["Класс — Сторожка — сторож с ключом — Дом", "Класс — Мастерская — дыра в заборе — Дом", "Класс — Спортзал — калитка у спортзала — Дом", "позвонить сторожу по номеру с доски, не идя к сторожке"],
    closed="сторож ушёл делать обход, сторожка пуста")

add(tier="Б", title="Нет монеты",
    nodes={"Кузница": (20, 55, "start"), "Мост": (85, 55, "place"), "Мельница": (170, 40, "goal"), "Пристань": (70, 90, "place"), "Излучина": (60, 15, "place")},
    terrain=[river([(92, 0), (95, 30), (96, 55), (98, 80), (96, 100)]), forest(140, 85, 22, 12), hill(150, 12, 12)],
    edges=[("Кузница", "Мост", "road"), ("Мост", "Мельница", "road", (130, 45)), ("Кузница", "Излучина", "faint", (30, 30)), ("Излучина", "Мельница", "faint", (120, 15)), ("Кузница", "Пристань", "path", (35, 80)), ("Пристань", "Мельница", "water")],
    marks=[mark("X", 96, 55), '<text x="100" y="63" font-size="3" fill="#D0312D" font-weight="700">мост сломан</text>',
           mark("brod", 95, 15, small=True), mark("boat", 100, 90, small=True), mark("hut", 78, 96, small=True), '<text x="104" y="97" font-size="2.9" fill="#8A8A8A" font-style="italic">1 монета</text>'],
    dano="в кармане: сапоги, телефон мельника, нож; монеты нет", nado="на мельницу",
    block="мост сломан, паром берёт монету, а монеты нет",
    paths=["Кузница — Излучина — брод в сапогах — Мельница", "Кузница — позвонить мельнику — он на лодке к Кузнице — Мельница", "Кузница — Пристань — паромщику вместо монеты: наточить нож ножом из кармана, перевезёт", "Кузница — Пристань — паромщик даст в долг, мельник знает кузнеца"],
    closed="брод: вода поднялась, камней не видно")

# ---- ярус В (карты 9–12): закрыто два места, обходы нужно складывать
add(tier="В", title="Поезд через сорок минут",
    nodes={"Дом": (18, 50, "start"), "Мост": (75, 50, "place"), "Тоннель": (130, 50, "place"), "Станция": (172, 50, "goal"), "Пристань": (60, 88, "place"), "Луг": (50, 12, "place"), "Сосед": (18, 15, "place"), "Озеро": (110, 88, "place")},
    terrain=[river([(84, 0), (86, 35), (88, 60), (86, 100)]), rail([(140, 0), (140, 100)]), lake(120, 92, 30, 9), hill(160, 15, 10)],
    edges=[("Дом", "Мост", "road"), ("Мост", "Тоннель", "road"), ("Тоннель", "Станция", "road"), ("Дом", "Луг", "faint", (30, 25)), ("Луг", "Станция", "faint", (110, 8)), ("Дом", "Пристань", "path", (30, 80)), ("Пристань", "Озеро", "water"), ("Озеро", "Станция", "faint", (160, 80)), ("Сосед", "Дом", "path")],
    marks=[mark("X", 86, 50), mark("tunnel", 140, 50), mark("X", 140, 50), '<text x="90" y="58" font-size="3" fill="#D0312D" font-weight="700">сломан</text>', '<text x="144" y="58" font-size="3" fill="#D0312D" font-weight="700">закрыт</text>',
           mark("brod", 86, 12, small=True), mark("boat", 90, 88, small=True), mark("hut", 68, 94, small=True), '<text x="94" y="95" font-size="2.9" fill="#8A8A8A" font-style="italic">1 монета</text>',
           mark("ladder", 140, 12, small=True), mark("barrier", 140, 88, small=True), mark("car", 12, 22, small=True), mark("clock", 150, 92, "40 мин", small=True)],
    dano="в кармане: сапоги, хлеб, телефон; монеты нет; сосед с машиной дома", nado="на станцию к поезду",
    block="мост сломан и тоннель под путями закрыт — два места сразу",
    paths=["Дом — Луг — брод (сапоги) — мостик над путями — Станция", "Дом — Пристань — паром за хлеб вместо монеты — Озеро — переезд — Станция", "Дом — Сосед — на машине в объезд по большаку — Станция", "позвонить на станцию: следующий поезд через час, тогда паром и не спешить"],
    closed="сосед: машина не заводится")

add(tier="В", title="Посылку в больницу",
    nodes={"Почта": (20, 70, "start"), "Ворота": (70, 70, "place"), "Мост": (120, 70, "place"), "Больница": (172, 60, "goal"), "Церковь": (45, 20, "place"), "Пристань": (105, 95, "place"), "Обрыв": (110, 20, "place")},
    terrain=[fence([(75, 40), (75, 100)]), river([(128, 0), (130, 40), (132, 70), (130, 100)]), hill(110, 20, 12), forest(160, 90, 22, 10)],
    edges=[("Почта", "Ворота", "road"), ("Ворота", "Мост", "road"), ("Мост", "Больница", "road"), ("Почта", "Церковь", "path", (25, 40)), ("Церковь", "Обрыв", "faint"), ("Обрыв", "Больница", "faint", (150, 30)), ("Ворота", "Пристань", "faint", (85, 90)), ("Пристань", "Больница", "water")],
    marks=[mark("gate", 75, 70), mark("X", 131, 70), '<text x="60" y="78" font-size="3" fill="#D0312D" font-weight="700">заперто</text>', '<text x="135" y="78" font-size="3" fill="#D0312D" font-weight="700">сломан</text>',
           mark("wicket", 75, 92, small=True), mark("rope", 130, 22, small=True), mark("brod", 130, 45, small=True), mark("boat", 134, 95, small=True), mark("hut", 96, 98, small=True), mark("person", 80, 60, small=True)],
    dano="в кармане: верёвка, монета, телефон", nado="доставить посылку в больницу до обеда",
    block="ворота заперты, а за ними ещё и мост сломан",
    paths=["Почта — Церковь — Обрыв — спуск по верёвке — Больница", "Почта — Ворота — сторож у ворот открывает — калитка — Пристань — паром (монета) — Больница", "Почта — Ворота — калитка — брод — Больница", "позвонить в больницу: их курьер заберёт посылку у ворот с той стороны"],
    closed="паром: паромщика нет до вечера")

add(tier="В", title="Дождь, темнеет",
    nodes={"Рынок": (22, 40, "start"), "Мост": (90, 40, "place"), "Дом": (172, 45, "goal"), "Роща": (135, 85, "place"), "Пристань": (75, 85, "place"), "Верховье": (60, 10, "place"), "Шоссе": (120, 10, "place")},
    terrain=[river([(96, 0), (98, 30), (100, 60), (98, 100)]), forest(135, 85, 26, 13, dark=True), hill(160, 12, 10)],
    edges=[("Рынок", "Мост", "road"), ("Мост", "Дом", "road"), ("Рынок", "Верховье", "faint", (30, 20)), ("Верховье", "Шоссе", "faint"), ("Шоссе", "Дом", "road", (160, 25)), ("Рынок", "Пристань", "path", (40, 75)), ("Пристань", "Роща", "water"), ("Роща", "Дом", "faint", (165, 70))],
    marks=[mark("X", 99, 40), '<text x="103" y="48" font-size="3" fill="#D0312D" font-weight="700">мост закрыт</text>',
           mark("brod", 97, 10, small=True), mark("boat", 103, 85, small=True), mark("hut", 82, 92, small=True), mark("car", 120, 4, small=True), mark("clock", 130, 60, "дождь, 20:30", small=True)],
    dano="в кармане: фонарь, монета; сапог нет, телефон разряжен", nado="домой до темноты",
    block="мост закрыт; из четырёх обходов подходят не все",
    paths=["Рынок — Пристань — паром (монета) — Роща (фонарь) — Дом", "Рынок — Верховье — Шоссе — попутка — Дом", "Рынок — Верховье — брод босиком, обувь в руки — Шоссе — Дом", "Рынок — переждать дождь под навесом рынка, если по расписанию он на полчаса, и потом бродом при свете"],
    closed="паром: не ходит в дождь")

add(tier="В", title="Две реки",
    nodes={"Пристань": (15, 55, "start"), "Мост 1": (60, 55, "place"), "Мост 2": (125, 55, "place"), "Станция": (175, 55, "goal"), "Хутор": (95, 92, "place"), "Изба": (30, 92, "place"), "Гора": (95, 12, "place"), "Луг": (150, 12, "place")},
    terrain=[river([(68, 0), (70, 55), (68, 100)]), river([(132, 0), (134, 55), (132, 100)]), hill(95, 12, 12), lake(85, 96, 18, 6)],
    edges=[("Пристань", "Мост 1", "road"), ("Мост 1", "Мост 2", "road"), ("Мост 2", "Станция", "road"), ("Пристань", "Гора", "faint", (40, 20)), ("Гора", "Луг", "faint"), ("Луг", "Станция", "faint"), ("Пристань", "Изба", "path"), ("Изба", "Хутор", "water"), ("Хутор", "Станция", "faint", (150, 90)), ("Мост 1", "Хутор", "faint", (85, 75))],
    marks=[mark("X", 70, 55), mark("X", 134, 55), '<text x="74" y="63" font-size="3" fill="#D0312D" font-weight="700">сломан</text>', '<text x="138" y="63" font-size="3" fill="#D0312D" font-weight="700">сломан</text>',
           mark("brod", 69, 12, small=True), mark("boat", 74, 92, small=True), mark("hut", 34, 98, small=True), mark("person", 40, 96, small=True),
           mark("rope", 133, 14, small=True), mark("boat", 138, 92, small=True), mark("hut", 100, 98, small=True), '<text x="142" y="95" font-size="2.9" fill="#8A8A8A" font-style="italic">1 монета</text>'],
    dano="в кармане: верёвка, монета, сапоги", nado="на станцию",
    block="оба моста сломаны — каждый путь складывается из двух переправ",
    paths=["Пристань — Гора — брод (сапоги) — Луг — спуск по верёвке — Станция", "Пристань — Изба — лодка рыбака — Хутор — паром (монета) — Станция", "Пристань — Гора — брод — Луг — вниз к Хутору — паром — Станция", "Пристань — Изба — рыбак перевозит через обе реки озером за монету — Станция"],
    closed="рыбак: лодка на берегу без вёсел")

# ------------------------------------------------------------------ памятка
MEMO = '''<div class="memo"><b>«Три пути» · уровень «Карта»: дорога закрыта, обходы нарисованы мелко</b>
<p><b>Что это.</b> В сухом виде навык — поиск путей, когда рабочий путь недоступен, и складывание ресурсов по дороге. На карте это видно буквально: жирная дорога с красным крестом и рядом еле заметные знаки — камни в реке, пунктир через холм, лодка у избы. Кто смотрит только на дорогу, путей не находит. Кто читает карту — находит три.</p>
<p><b>Ход.</b> Ведущий кладёт карту, читает «Дано» и «Надо». Игрок за минуту пишет три пути цепочкой мест: «Дом — Мельница — брод — Школа». <b>Три пути — три разных перехода через преграду:</b> брод, паром и обход поверху — это три пути; брод трижды — один. Если переход требует вещи, её надо иметь в кармане или объяснить, чем заменить: паром берёт монету — монеты нет — а хлеб есть. Галочка — путь, который делаешь первым.</p>
<p><b>Мир.</b> Когда три пути записаны, ведущий читает с листа: «Мир закрыл: паром». Пути через паром вычёркиваются. Осталось два и больше — 3 очка, один — 1, ноль — 0. Путь, для которого нет вещи и не сказано, чем заменить, — не путь.</p>
<p><b>От простого к сложному.</b> Карты 1–4: обходы подписаны словами. Карты 5–8: только знаки из легенды, часть обходов требует вещи из кармана. Карты 9–12: закрыто два места, путь складывается из двух переправ, а нужной вещи может не быть — тогда её заменяет другая или человек. Переход дальше — три карты подряд по 3 очка.</p>
<p><b>Ведущий.</b> Кладёт карту, читает, включает таймер, после трёх путей читает «мир закрыл», считает. Не показывает пальцем. Спор «тут можно пройти?» решает одним словом по здравому смыслу. На листе ведущего образцы — любой другой разумный путь тоже считается.</p>
<div class="legend"><b>Легенда</b>
<span><svg viewBox="0 0 14 6" width="10mm" height="4.5mm"><path d="M1,3 L13,3" stroke="#7A6A50" stroke-width="2.4"/><path d="M1,3 L13,3" stroke="#E8D9B5" stroke-width="1.5"/></svg> дорога</span>
<span><svg viewBox="0 0 14 6" width="10mm" height="4.5mm"><path d="M1,3 L13,3" stroke="#7D7D7D" stroke-width="0.6" stroke-dasharray="1.2,1.4"/></svg> тропа</span>
<span><svg viewBox="0 0 14 6" width="10mm" height="4.5mm"><path d="M1,3 L13,3" stroke="#A0A0A0" stroke-width="0.4" stroke-dasharray="0.7,1.6"/></svg> едва заметная тропа</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("brod", 3, 0) + '''</svg> брод — камни в реке</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("boat", 3, -0.5) + '''</svg> лодка или паром</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("hut", 3, 0) + '''</svg> изба — там живёт человек</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("person", 3, 0) + '''</svg> человек</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("gate", 3, 0) + '''</svg> ворота</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("wicket", 3, 0) + '''</svg> калитка</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("hole", 3, 0) + '''</svg> дыра в заборе</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("rope", 3, 0) + '''</svg> скала — спуск по верёвке</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("ladder", 3, 0) + '''</svg> мостик над путями</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("barrier", 3, 0) + '''</svg> переезд со шлагбаумом</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("tunnel", 3, 0) + '''</svg> тоннель</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("car", 3, 0) + '''</svg> попутки</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("bus", 3, 0) + '''</svg> автобус</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm"><path d="M1,3 L13,3" stroke="#6B4A2B" stroke-width="1.2"/></svg> бревно</span>
<span><svg viewBox="-3 -3 14 6" width="10mm" height="4.5mm">''' + mark("X", 3, 0) + '''</svg> закрыто</span>
<span><svg viewBox="0 0 14 6" width="10mm" height="4.5mm"><ellipse cx="7" cy="3" rx="6" ry="2.5" fill="#4F7A4A"/></svg> тёмный лес — ночью нужен фонарь</span>
</div></div>'''


def player_sheet():
    rows = []
    for i, m in enumerate(MAPS, 1):
        rows.append(f'<div class="kmap"><p class="t-n">Карта {i} · ярус {m["tier"]} · {e(m["title"])}</p>{svg(m)}'
                    f'<p><b>Дано:</b> {e(m["dano"])}. <b>Надо:</b> {e(m["nado"])}.</p>'
                    f'<p class="lines">Путь 1: ____________________________________ ☐ &nbsp; Путь 2: ____________________________________ ☐</p>'
                    f'<p class="lines">Путь 3: ____________________________________ ☐ &nbsp; очки ____</p></div>')
    return '<div class="tsheet"><b>«Три пути» · карта · лист игрока</b><p class="st-note">А — где ты, Б — куда надо. Три пути — три разных перехода. Если переход просит вещь, она должна быть в кармане, или напиши, чем заменишь.</p>' + "".join(rows) + '</div>'


def host_sheet():
    rows = []
    for i, m in enumerate(MAPS, 1):
        rows.append(f'<div class="task"><p class="t-n">Карта {i} · {e(m["title"])}. Закрыто: {e(m["block"])}.</p>'
                    f'<p class="t-key"><b>Образцы путей:</b> {e("; ".join(m["paths"]))}. <b>Мир закрыл:</b> {e(m["closed"])}.</p></div>')
    return '<div class="tsheet key"><b>«Три пути» · карта · лист ведущего</b><p class="st-note">Образцы — не единственные ответы. «Мир закрыл» читать после того, как три пути записаны. Путь без нужной вещи и без замены — не путь.</p>' + "".join(rows) + '</div>'


CSS = '''<style>
body{font-family:Inter,system-ui,sans-serif;margin:0;padding:10mm 10mm;color:#111}
.memo,.tsheet{margin:0 0 6mm;page-break-after:always}.tsheet:last-child{page-break-after:auto}
.memo b,.tsheet b{color:#111}.memo p,.tsheet p{font-size:9.5pt;line-height:1.45;margin:6px 0 0}.st-note{color:#555}
.legend{margin-top:8px;font-size:9pt;display:flex;flex-wrap:wrap;gap:4px 14px}.legend b{width:100%}.legend span{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
.kmap{padding:4px 0 6px;break-inside:avoid;page-break-inside:avoid}.kmap svg{display:block;margin:2px 0}.kmap p{margin:2px 0 0;font-size:9.5pt}
.task{border-top:1px solid #DDD;padding:5px 0 7px;break-inside:avoid}.task p{margin:2px 0 0}.t-n{font-weight:800;color:#1F4FB0}.task .t-key{color:#B42318;font-size:8.8pt}.lines{font-size:8.5pt;color:#444}
</style>'''
HTML = f'<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Три пути · карта</title>{CSS}</head><body>{MEMO}{player_sheet()}{host_sheet()}</body></html>'
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "karta.html"), "w", encoding="utf-8").write(HTML)
print("карт:", len(MAPS))
