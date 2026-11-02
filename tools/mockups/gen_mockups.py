# -*- coding: utf-8 -*-
"""Мокапы переписки v4 — по референсу владельца (скрин Telegram, тёмная тема).

Референс в репозитории: 47751bff.jpg. Что взято оттуда:
тёмная тема Telegram (#17212b / #182533 / #2b5278), статус-бар с Wi-Fi и
батареей, шапка с именем и «в сети», время и галочки внутри пузырей,
поле ввода, русская клавиатура, home indicator.
"""
import os

OUT = r"C:\Users\Князь\Documents\deepseek-harness\default-workspace\reports\mock4"
os.makedirs(OUT, exist_ok=True)

WIFI = ('<svg width="16" height="12" viewBox="0 0 16 12" fill="none">'
        '<path d="M8 10.6 6.2 8.7a2.6 2.6 0 0 1 3.6 0L8 10.6Z" fill="#fff"/>'
        '<path d="M4.6 7.1a5 5 0 0 1 6.8 0" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>'
        '<path d="M2.4 4.6a8.2 8.2 0 0 1 11.2 0" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>')

BATT = ('<svg width="26" height="12" viewBox="0 0 26 12" fill="none">'
        '<rect x=".8" y=".8" width="21" height="10.4" rx="3" stroke="#fff" stroke-opacity=".5"/>'
        '<rect x="2.4" y="2.4" width="__FILL__" height="7.2" rx="1.6" fill="#fff"/>'
        '<path d="M23.6 4.2v3.6c1.1-.4 1.6-1 1.6-1.8s-.5-1.4-1.6-1.8Z" fill="#fff" fill-opacity=".5"/></svg>')

SIGNAL = ('<svg width="18" height="12" viewBox="0 0 18 12" fill="none">'
          '<rect x="0" y="8" width="3" height="4" rx="1" fill="#fff"/>'
          '<rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#fff"/>'
          '<rect x="10" y="3" width="3" height="9" rx="1" fill="#fff"/>'
          '<rect x="15" y="0.5" width="3" height="11.5" rx="1" fill="#fff"/></svg>')

KEYS = [
    ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з", "х", "ъ"],
    ["ф", "ы", "в", "а", "п", "р", "о", "л", "д", "ж", "э"],
    ["⇧", "я", "ч", "с", "м", "и", "т", "ь", "б", "ю", "⌫"],
]

TPL = """<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#0d1117;display:flex;align-items:flex-start;justify-content:center;
     font-family:-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}}
.screen{{width:540px;height:1170px;background:#17212b;overflow:hidden;display:flex;flex-direction:column;position:relative}}
.island{{position:absolute;top:7px;left:50%;transform:translateX(-50%);width:100px;height:23px;background:#000;border-radius:12px;z-index:9}}
.status{{display:flex;justify-content:space-between;align-items:center;padding:12px 20px 2px;color:#fff;font-size:14px;font-weight:600}}
.sb-r{{display:flex;align-items:center;gap:6px}}
.head{{display:flex;align-items:center;gap:8px;padding:6px 14px 10px;background:#17212b;border-bottom:1px solid rgba(255,255,255,.06)}}
.back{{color:#5aa0e6;font-size:22px;line-height:1;margin-right:2px}}
.who{{flex:1;text-align:center}}
.who b{{display:block;color:#fff;font-size:16px;font-weight:600;line-height:1.15}}
.who span{{display:block;color:#7d8b99;font-size:11.5px;margin-top:1px}}
.hava{{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#00A8E8,#3A86FF);
       display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px;flex:none}}
.chat{{flex:1;padding:12px 12px 6px;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;overflow:hidden}}
.day{{align-self:center;font-size:11px;color:#8fa0b8;background:rgba(255,255,255,.07);border-radius:10px;padding:2px 9px;margin:2px 0 4px}}
.row{{display:flex}}
.row.out{{justify-content:flex-end}}
.b{{width:fit-content;max-width:84%;border-radius:16px;padding:7px 11px 5px;font-size:14.5px;line-height:1.34;text-align:left;position:relative}}
.in{{background:#182533;color:#eef3fa;border-bottom-left-radius:5px}}
.out{{background:#2b5278;color:#eef3fa;border-bottom-right-radius:5px}}
.b .meta{{display:block;text-align:right;font-size:10.5px;color:rgba(255,255,255,.45);margin-top:1px}}
.ticks{{color:#6fc0ff;font-size:11px;margin-left:3px}}
.input{{display:flex;align-items:center;gap:8px;padding:8px 10px 6px;background:#17212b}}
.pin{{color:#8fa0b8;font-size:15px}}
.field{{flex:1;background:#242f3d;border-radius:18px;padding:9px 14px;color:#7d8b99;font-size:14px;display:flex;justify-content:space-between;align-items:center}}
.kbd{{background:#1c2733;padding:8px 4px 0}}
.krow{{display:flex;justify-content:center;gap:5px;margin-bottom:7px}}
.key{{height:42px;min-width:38px;border-radius:6px;background:#3a4654;display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:17px;font-weight:400}}
.key.fn{{background:#2b3745;font-size:13px}}
.key.space{{min-width:180px;font-size:13px;color:#c8d1db}}
.home{{height:22px;display:flex;align-items:center;justify-content:center;background:#1c2733}}
.home i{{display:block;width:140px;height:5px;border-radius:3px;background:#e8eef7;opacity:.85}}
</style></head><body><div class="screen">
<div class="island"></div>
<div class="status"><span>{time}</span><span class="sb-r">{signal}{wifi}{batt}</span></div>
<div class="head"><span class="back">‹</span><span class="who"><b>Андрей Мейстер</b><span>{status}</span></span><span class="hava">АМ</span></div>
<div class="chat">{messages}</div>
{footer}
</div></body></html>"""


def msg(side, text, time, ticks=False):
    row = "out" if side == "out" else "in"
    tick = "<span class='ticks'>✓✓</span>" if ticks else ""
    return (f'<div class="row {row}"><div class="b {row}">'
            f'{text}<span class="meta">{time}{tick}</span></div></div>')


def keyboard():
    rows = []
    for r in KEYS:
        cells = "".join(f'<span class="key">{k}</span>' for k in r)
        rows.append(f'<div class="krow">{cells}</div>')
    rows.append('<div class="krow"><span class="key fn">123</span>'
                '<span class="key space">пробел</span>'
                '<span class="key fn">Ввод</span></div>')
    return ('<div class="input"><span class="pin">◫</span>'
            '<span class="field"><span>Сообщение…</span><span>◉</span></span>'
            '<span class="pin">🎤</span></div>'
            '<div class="kbd">' + "".join(rows) + '</div><div class="home"><i></i></div>')


def input_only():
    return ('<div class="input"><span class="pin">◫</span>'
            '<span class="field"><span>Сообщение…</span><span>◉</span></span>'
            '<span class="pin">🎤</span></div><div class="home"><i></i></div>')


MOCKS = {
    "a": {
        "time": "19:42", "fill": 18, "status": "в сети", "footer": input_only(),
        "messages": [
            '<div class="day">Сегодня</div>',
            msg("in", "Здравствуйте! Вопрос из практики, не по курсу.", "19:31"),
            msg("out", "Здравствуйте. Слушаю.", "19:32", True),
            msg("in", "Клиент переводит любую фразу в «логично, но». Что работает?", "19:38"),
            msg("out", "История. Ей не возражают — её слушают.", "19:40", True),
            msg("in", "А на деле как?", "19:41"),
            msg("out", "Пошли две женщины на ипподром. Решают, на какую лошадь ставить.<br>"
                       "— У тебя какой размер груди? — Третий.<br>"
                       "— А у меня второй. Складываем, ставим на пятую.", "19:43", True),
            msg("out", "Выиграли. Дома рассказали мужьям — те на следующий день на ипподром.<br>"
                       "— Ты сколько раз за ночь жену? — Три. — А я четыре. Ставим на седьмую.<br>"
                       "Победила лошадь под номером два.", "19:43", True),
            msg("out", "Вы следили за сюжетом и не спорили. Это и был вход.", "19:44", True),
        ],
    },
    "b": {
        "time": "21:14", "fill": 10, "status": "в сети", "footer": keyboard(),
        "messages": [
            '<div class="day">Сегодня</div>',
            msg("in", "Здравствуйте! Клиент отказывается: «гипноз — шарлатанство».", "20:58"),
            msg("out", "Здравствуйте. А он нужен вам или клиенту?", "21:00", True),
            msg("in", "Нужен по протоколу, а клиент закрыт.", "21:03"),
            msg("in", "Клиент: «в гипноз не верю, это шарлатанство».", "21:05"),
            msg("out", "Он прав в главном. Транс — не сон, а узкое сосредоточение.", "21:08", True),
            msg("in", "Начинать с обычного состояния?", "21:12"),
            msg("out", "Да. Назовите то, что уже происходит — и это уже внимание.", "21:13", True),
        ],
    },
    "c": {
        "time": "08:07", "fill": 20, "status": "был(а) недавно", "footer": keyboard(),
        "messages": [
            '<div class="day">Сегодня</div>',
            msg("in", "Доброе утро. Вопрос про этику, можно?", "07:58"),
            msg("out", "Можно. Спрашивайте.", "07:59", True),
            msg("in", "А это не манипуляция — так разговаривать с клиентом?", "08:02"),
            msg("out", "Если бы он узнал, как с ним говорили, — почувствовал бы себя обманутым?", "08:04", True),
            msg("in", "Нет, скорее услышанным.", "08:05"),
            msg("out", "Тогда это убеждение. Манипуляция начинается там, где выгода уходит от него.", "08:06", True),
        ],
    },
}

for name, d in MOCKS.items():
    batt = BATT.replace("__FILL__", str(d["fill"]))
    html = TPL.format(time=d["time"], status=d["status"], messages="\n".join(d["messages"]),
                      signal=SIGNAL, wifi=WIFI, batt=batt, footer=d["footer"])
    path = os.path.join(OUT, f"{name}.html")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    print("записан", path)
