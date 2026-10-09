#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Аватары собеседников чата /chat/ — иллюстрации в одном стиле.

    python3 tools/build_chat_avatars.py      # пишет chat/ava/<id>.svg

Личности живут на сервере (Frederick/backend/personas.py), здесь — только
их лица. Фотографий людей нет намеренно: портрет живого человека у ИИ
выдаёт робота за человека. Другую картинку можно положить файлом
chat/ava/<id>.svg (или поменять расширение в функции ava() в
chat/index.html, если это jpg/webp).
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "chat", "ava")

SKIN = {"light": "#F4D3BC", "warm": "#E9B996", "tan": "#D29A72", "old": "#EBC7AE"}


def frame(bg1, bg2, body, pid):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-hidden="true">'
            f'<defs><linearGradient id="g{pid}" x1="0" y1="0" x2="1" y2="1">'
            f'<stop offset="0" stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient>'
            f'<clipPath id="c{pid}"><circle cx="80" cy="80" r="80"/></clipPath></defs>'
            f'<g clip-path="url(#c{pid})"><rect width="160" height="160" fill="url(#g{pid})"/>{body}</g></svg>')


def person(skin, cloth, hair_back="", hair_front="", extra="", collar=""):
    return (
        f'{hair_back}'
        f'<path d="M22 172 C24 128 50 112 80 112 C110 112 136 128 138 172 Z" fill="{cloth}"/>'
        f'{collar}'
        f'<rect x="69" y="92" width="22" height="26" rx="10" fill="{skin}"/>'
        f'<ellipse cx="80" cy="70" rx="29" ry="33" fill="{skin}"/>'
        f'<ellipse cx="51" cy="73" rx="5" ry="7" fill="{skin}"/><ellipse cx="109" cy="73" rx="5" ry="7" fill="{skin}"/>'
        f'{hair_front}'
        f'<circle cx="69" cy="72" r="3" fill="#2B2B33"/><circle cx="91" cy="72" r="3" fill="#2B2B33"/>'
        f'<path d="M72 86 Q80 92 88 86" stroke="#9A5A4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
        f'{extra}'
    )


GLASSES = ('<g fill="none" stroke="#2B2B33" stroke-width="2.4"><circle cx="69" cy="72" r="8"/>'
           '<circle cx="91" cy="72" r="8"/><path d="M77 72 h6"/></g>')

AVATARS = {
    # Фреди — фирменный ИИ: сфера, не человек.
    "fredi": frame("#DCE9FF", "#EFE6FF",
                   '<circle cx="80" cy="80" r="44" fill="#3A86FF" opacity=".18"/>'
                   '<circle cx="80" cy="80" r="32" fill="url(#o)"/>'
                   '<defs><radialGradient id="o" cx=".35" cy=".3"><stop offset="0" stop-color="#BFD6FF"/>'
                   '<stop offset=".55" stop-color="#3A86FF"/><stop offset="1" stop-color="#6C4DFF"/></radialGradient></defs>'
                   '<path d="M64 82 Q80 96 96 82" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>'
                   '<circle cx="70" cy="72" r="4" fill="#fff"/><circle cx="90" cy="72" r="4" fill="#fff"/>', "fredi"),
    # «Честно про отношения» — женщина около 45, тёплая.
    "vera": frame("#FFE3E8", "#FFF1E6", person(
        SKIN["warm"], "#C2546B",
        hair_back='<path d="M44 76 C40 36 66 26 82 28 C108 30 122 46 118 84 C116 104 108 118 104 120 L56 120 C50 112 46 98 44 76 Z" fill="#7A4A35"/>',
        hair_front='<path d="M51 62 C56 40 76 34 92 38 C104 42 110 52 110 64 C98 52 80 48 62 56 Z" fill="#7A4A35"/>',
        extra='<circle cx="51" cy="84" r="3" fill="#F2C14E"/><circle cx="109" cy="84" r="3" fill="#F2C14E"/>'), "vera"),
    # «Без соплей» — мужчина за 40, борода.
    "mark": frame("#E3E8EF", "#EEF1F5", person(
        SKIN["tan"], "#2F3B4C",
        hair_front='<path d="M51 62 C52 40 70 32 84 34 C100 36 110 46 109 62 C100 52 86 48 70 50 C60 52 54 56 51 62 Z" fill="#3B3430"/>',
        extra='<path d="M54 80 C56 102 68 110 80 110 C92 110 104 102 106 80 C100 92 92 96 80 96 C68 96 60 92 54 80 Z" fill="#3B3430"/>'
              '<path d="M73 87 Q80 90 87 87" stroke="#C88A6B" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
        collar='<path d="M66 116 L80 132 L94 116" fill="#fff" opacity=".85"/>'), "mark"),
    # «Лучшая подруга» — 20+, хвост, худи.
    "nika": frame("#E6F7F1", "#E9F0FF", person(
        SKIN["light"], "#7B6CF6",
        hair_back='<circle cx="112" cy="46" r="15" fill="#2E2A33"/>',
        hair_front='<path d="M50 70 C48 42 66 30 84 32 C104 34 114 48 110 70 C104 54 92 46 76 46 C64 46 54 54 50 70 Z" fill="#2E2A33"/>',
        extra='<circle cx="63" cy="83" r="5" fill="#F7A8B8" opacity=".55"/><circle cx="97" cy="83" r="5" fill="#F7A8B8" opacity=".55"/>',
        collar='<path d="M60 114 C66 124 94 124 100 114" stroke="#5B4ED6" stroke-width="5" fill="none"/>'), "nika"),
    # «Родительский навигатор» — мама, пучок, очки.
    "olga": frame("#FFF4D6", "#FDE8D7", person(
        SKIN["light"], "#E08A3C",
        hair_back='<circle cx="80" cy="30" r="15" fill="#9B5B33"/>',
        hair_front='<path d="M50 70 C48 44 64 34 82 34 C102 34 114 48 110 70 C104 56 94 50 80 50 C66 50 56 56 50 70 Z" fill="#9B5B33"/>',
        extra=GLASSES), "olga"),
    # «Тот, кто выслушает» — за 60, седина, очки, кардиган.
    "lev": frame("#E8EEE6", "#F3EFE6", person(
        SKIN["old"], "#6F7F5F",
        hair_front='<path d="M50 66 C50 52 56 44 62 42 C58 52 58 58 56 66 Z M110 66 C110 52 104 44 98 42 C102 52 102 58 104 66 Z" fill="#D9D9DE"/>'
                   '<path d="M60 44 C70 36 92 36 100 44" stroke="#D9D9DE" stroke-width="6" fill="none" stroke-linecap="round"/>',
        extra=GLASSES + '<path d="M66 92 Q80 100 94 92" stroke="#D9D9DE" stroke-width="5" fill="none" stroke-linecap="round"/>',
        collar='<path d="M70 114 L80 140 L90 114" fill="#E9E2D3"/>'), "lev"),
    # «Антипрокрастинатор» — коуч, короткая стрижка, молния на футболке.
    "sasha": frame("#FFF0D9", "#E6F4FF", person(
        SKIN["warm"], "#FF7A45",
        hair_front='<path d="M51 60 C54 38 72 30 86 32 C102 34 112 46 109 62 L104 54 L98 60 L92 52 L84 58 L76 50 L68 58 L60 52 Z" fill="#4A3426"/>',
        collar='<path d="M84 124 L74 142 H84 L78 158 L94 134 H84 L90 124 Z" fill="#FFE27A"/>'), "sasha"),
    # «Ночной режим» — луна, не человек.
    "luna": frame("#1F2A55", "#3B2D6E",
                  '<circle cx="90" cy="74" r="34" fill="#F6E7B0"/>'
                  '<circle cx="106" cy="62" r="34" fill="#2A2E62"/>'
                  '<circle cx="40" cy="44" r="2.5" fill="#fff"/><circle cx="56" cy="110" r="2" fill="#fff" opacity=".8"/>'
                  '<circle cx="120" cy="118" r="2.5" fill="#fff" opacity=".9"/><circle cx="34" cy="86" r="1.6" fill="#fff"/>'
                  '<circle cx="128" cy="36" r="1.8" fill="#fff" opacity=".8"/>', "luna"),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for pid, svg in AVATARS.items():
        with open(os.path.join(OUT, pid + ".svg"), "w", encoding="utf-8") as f:
            f.write(svg + "\n")
    print(f"{len(AVATARS)} аватаров → {os.path.relpath(OUT, ROOT)}/")


if __name__ == "__main__":
    main()
