#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Переозвучка лекций Лектория волнами: сначала первые лекции всех курсов.

    python3 tools/revoice_lectures.py --dry-run            # что и в каком порядке
    python3 tools/revoice_lectures.py --wave 1             # только первые лекции
    python3 tools/revoice_lectures.py --wave 1-3           # первые три волны
    python3 tools/revoice_lectures.py                      # все волны подряд
    python3 tools/revoice_lectures.py --status             # прогресс текущего пакета
    python3 tools/revoice_lectures.py --stop               # остановить после текущей

Зачем волнами, а не подряд по курсам. Озвучка восьмисот лекций — это часы
работы, и всё это время сайт живёт наполовину в старом голосе, наполовину
в новом. Если идти курсами, то восемь курсов будут целиком новыми, а семьдесят
— целиком старыми. Если идти волнами, то у каждого курса сразу новая первая
лекция, а именно её слушают те, кто пришёл в курс впервые. Разнобой остаётся,
но он уезжает вглубь курсов, куда доходят немногие.

Порядок внутри волны — по имени папки курса, чтобы прогон был воспроизводим:
запустили заново после сбоя — очередь та же.

Номер лекции берётся из слага (lekciya-<курс>-<N>-<тема>). Где номера в слаге
нет — берётся порядок ссылок на странице курса, он и есть порядок обучения.

Переменные окружения:
    FREDERICK_URL   адрес бэкенда, по умолчанию https://ffred-ddd989.amvera.io
    ADMIN_TOKEN     тот же, что в env бэкенда; без него сервер ответит 403

Осторожно: --force переозвучивает и то, что уже озвучено правильно. Это
единственный режим, в котором меняется голос у готовых лекций, — и именно
он нужен после смены модели синтеза. Без --force сервер пропустит всё,
что уже лежит в кэше, и прогон окажется пустым.
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEKTORIJ = os.path.join(ROOT, "blog", "lektorij")
DEFAULT_URL = "https://ffred-ddd989.amvera.io"

HREF_RE = re.compile(r'href="([^"#?]*/lekciya-[^"#?]+)\.html"')
# Номер лекции в слаге: lekciya-<курс>-<N>-<тема>. Буква после числа —
# параллельный трек: у «Психологии перегрузок» есть 1…10 и 1b…10b, и без
# учёта буквы второй трек получал номера по позиции на странице (2, 4, 6 … 20),
# то есть уезжал в несуществующие волны, а первая лекция трека — во вторую.
NUM_RE = re.compile(r"^lekciya-.+?-(\d+)([a-z]?)-")


def course_lectures(course_dir):
    """Лекции одного курса в порядке обучения: [(номер, слаг), ...]."""
    index = os.path.join(course_dir, "index.html")
    if not os.path.exists(index):
        return []
    with open(index, encoding="utf-8") as f:
        html = f.read()
    seen, out = set(), []
    for m in HREF_RE.finditer(html):
        slug = m.group(1).rsplit("/", 1)[-1]
        if slug in seen:
            continue
        seen.add(slug)
        num = NUM_RE.match(slug)
        # [номер, буква трека, слаг]; буква сортирует 1 перед 1b
        out.append([int(num.group(1)) if num else None,
                    num.group(2) if num else "", slug])
    # без номера в слаге порядок задаёт сама страница курса
    for i, item in enumerate(out, 1):
        if item[0] is None:
            item[0] = i
    out.sort(key=lambda x: (x[0], x[1]))
    return [(n, s) for n, _, s in out]


def build_waves():
    """({номер волны: [слаги]}, сколько курсов) по всему Лекторию."""
    courses = sorted(
        d for d in os.listdir(LEKTORIJ)
        if os.path.isdir(os.path.join(LEKTORIJ, d)) and d != "img"
    )
    waves, with_lectures = {}, 0
    for c in courses:
        lectures = course_lectures(os.path.join(LEKTORIJ, c))
        if lectures:
            with_lectures += 1
        for n, slug in lectures:
            waves.setdefault(n, []).append(slug)
    return waves, with_lectures


def parse_waves(spec, available):
    """'1', '1-3', '2,5' → отсортированный список номеров волн."""
    if not spec:
        return available
    picked = set()
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            picked.update(range(int(a), int(b) + 1))
        elif part:
            picked.add(int(part))
    unknown = sorted(picked - set(available))
    if unknown:
        sys.exit(f"нет таких волн: {unknown}; есть {min(available)}—{max(available)}")
    return sorted(picked)


def call(path, method="POST", body=None):
    url = os.environ.get("FREDERICK_URL", DEFAULT_URL).rstrip("/") + path
    token = (os.environ.get("ADMIN_TOKEN") or "").strip()
    if not token:
        sys.exit("нет ADMIN_TOKEN в окружении — сервер ответит 403")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("X-Admin-Token", token)
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:300]
        sys.exit(f"{method} {path}: HTTP {e.code} — {detail}")
    except urllib.error.URLError as e:
        sys.exit(f"{method} {path}: сеть недоступна — {e.reason}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--wave", help="номера волн: 1, 1-3, 2,5. По умолчанию все")
    ap.add_argument("--dry-run", action="store_true", help="показать очередь, ничего не запускать")
    ap.add_argument("--no-force", action="store_true",
                    help="не переозвучивать уже готовое (тогда прогон почти наверняка пустой)")
    ap.add_argument("--status", action="store_true", help="прогресс текущего пакета")
    ap.add_argument("--stop", action="store_true", help="остановить после текущей лекции")
    args = ap.parse_args()

    if args.status:
        print(json.dumps(call("/api/tts/blog/pregenerate", method="GET"),
                         ensure_ascii=False, indent=2))
        return
    if args.stop:
        print(json.dumps(call("/api/tts/blog/pregenerate/stop"),
                         ensure_ascii=False, indent=2))
        return

    waves, courses = build_waves()
    if not waves:
        sys.exit(f"не нашёл ни одной лекции в {LEKTORIJ}")
    numbers = parse_waves(args.wave, sorted(waves))

    queue = []
    for n in numbers:
        queue.extend(waves[n])

    print(f"курсов: {courses}, волн: {len(waves)}, "
          f"лекций всего: {sum(len(v) for v in waves.values())}")
    for n in numbers:
        print(f"  волна {n:>2}: {len(waves[n])} лекций")
    print(f"в очереди на этот запуск: {len(queue)}")

    if args.dry_run:
        print("\nпорядок (первые 15):")
        for s in queue[:15]:
            print("  " + s)
        if len(queue) > 15:
            print(f"  … и ещё {len(queue) - 15}")
        return

    body = {"slugs": queue, "force": not args.no_force}
    print(json.dumps(call("/api/tts/blog/pregenerate", body=body),
                     ensure_ascii=False, indent=2))
    print("\nпрогресс:  python3 tools/revoice_lectures.py --status")
    print("остановить: python3 tools/revoice_lectures.py --stop")


if __name__ == "__main__":
    main()
