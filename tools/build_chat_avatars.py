#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Аватары собеседников чата /chat/ — нарезка из одного холста.

    python3 tools/build_chat_avatars.py      # chat/ava/source.png → chat/ava/<id>.webp

Холст — восемь кругов 4×2 на светлом фоне (рисованные портреты, выбран
владельцем 10.10.2026). Порядок — как в IDS. Круги находятся сами: по
отличию от цвета фона, ряд за рядом. Из круга берётся квадрат 88% его
высоты — неровный край кисти уходит за обрез, страница сама скругляет
картинку (border-radius:50%). Новый холст — тот же порядок, тот же путь.

Личности живут на сервере (Frederick/backend/personas.py), здесь — только
их лица. Фреди и «Ночной режим» нарочно не люди.
"""
import os

from PIL import Image, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "chat", "ava")
SRC = os.path.join(DIR, "source.png")
IDS = ["fredi", "vera", "mark", "nika", "olga", "lev", "sasha", "luna"]
SIZE = 256
INSET = 0.88


def circles(im):
    """Рамки кругов: ряд за рядом, слева направо."""
    w, h = im.size
    bg = Image.new("RGB", im.size, im.getpixel((5, 5)))
    m = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 28 else 0)
    found = []
    for ya, yb in ((0, h // 2), (h // 2, h)):
        band = m.crop((0, ya, w, yb))
        px = band.load()
        cols = [sum(1 for y in range(band.height) if px[x, y]) for x in range(w)]
        start = None
        for x, v in enumerate(cols + [0]):
            if v > 20 and start is None:
                start = x
            elif v <= 20 and start is not None:
                if x - start > 100:
                    bb = m.crop((start, ya, x, yb)).getbbox()
                    found.append((start, ya + bb[1], x, ya + bb[3]))
                start = None
    return found


def main():
    im = Image.open(SRC).convert("RGB")
    boxes = circles(im)
    if len(boxes) != len(IDS):
        raise SystemExit(f"на холсте {len(boxes)} кругов, ждали {len(IDS)}")
    for pid, (x0, y0, x1, y1) in zip(IDS, boxes):
        d = y1 - y0
        cy = (y0 + y1) / 2
        # Бледный край круга сливается с фоном и съедает ширину — тогда
        # центр считаем от правого края и высоты.
        cx = (x0 + x1) / 2 if (x1 - x0) > d - 20 else x1 - d / 2
        r = d * INSET / 2
        face = im.crop((round(cx - r), round(cy - r), round(cx + r), round(cy + r)))
        face.resize((SIZE, SIZE), Image.LANCZOS).save(
            os.path.join(DIR, pid + ".webp"), "WEBP", quality=84, method=6)
    print(f"{len(IDS)} аватаров → {os.path.relpath(DIR, ROOT)}/")


if __name__ == "__main__":
    main()
