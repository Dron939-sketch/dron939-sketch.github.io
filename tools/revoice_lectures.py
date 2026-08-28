#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Переозвучка озвучки блога: лекции волнами, затем прочие статьи.

    python3 tools/revoice_lectures.py --dry-run            # что и в каком порядке
    python3 tools/revoice_lectures.py --wave 1             # только первые лекции
    python3 tools/revoice_lectures.py --wave 1-3           # первые три волны
    python3 tools/revoice_lectures.py                      # все лекции волнами
    python3 tools/revoice_lectures.py --all                # весь архив: лекции + статьи
    python3 tools/revoice_lectures.py --articles           # только статьи блога
    python3 tools/revoice_lectures.py --check              # проверка на одной лекции
    python3 tools/revoice_lectures.py --status             # прогресс текущего пакета
    python3 tools/revoice_lectures.py --stop               # остановить после текущей

Зачем волнами, а не подряд по курсам. Полная переозвучка архива — это
1056 лекций и 494 прочие статьи, то есть двое-трое суток непрерывной работы,
и всё это время сайт живёт наполовину в старом голосе, наполовину в новом.
Если идти курсами, восемь курсов станут целиком новыми, а девяносто четыре
останутся целиком старыми. Если идти волнами — сначала все первые лекции,
потом все вторые, — у каждого курса сразу новая первая лекция, а её и слушают
те, кто пришёл в курс впервые. Разнобой уезжает вглубь курсов, куда доходят
немногие.

Обычные статьи блога идут последними: у них нет ни курса, ни порядка обучения,
и слушают их поодиночке, а не подряд.

Порядок внутри волны — по имени папки курса, чтобы прогон был воспроизводим:
запустили заново после сбоя — очередь та же.

Номер лекции берётся из слага (lekciya-<курс>-<N>-<тема>). Где номера в слаге
нет — берётся порядок ссылок на странице курса, он и есть порядок обучения.

Переменные окружения:
    FREDERICK_URL   адрес бэкенда, по умолчанию https://ffred-ddd989.amvera.io
    ADMIN_TOKEN     тот же, что в env бэкенда; без него сервер ответит 403

Отдельно сносить кэш не нужно и вредно. При force бэкенд сам удаляет mp3
и мету каждого материала прямо перед его синтезом (blog_tts_routes,
_pregenerate_run). То есть архив пересоздаётся поштучно, и молчит только
та статья, до которой дошла очередь, а не весь сайт на двое суток.

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
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEKTORIJ = os.path.join(ROOT, "blog", "lektorij")
SITEMAP = os.path.join(ROOT, "sitemap.xml")
DEFAULT_URL = "https://ffred-ddd989.amvera.io"

# Озвучка кэшируется для любой статьи блога, не только для лекции. Полная
# переозвучка архива обязана захватывать и их, иначе половина сайта останется
# в старом голосе. Источник списка тот же, что у бэкенда, — sitemap.
LOC_RE = re.compile(r"<loc>([^<]+)</loc>")

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


def blog_articles():
    """Слаги статей блога, которые не лекции, по алфавиту.

    Порядок алфавитный, а не по важности: у обычных статей нет естественной
    очерёдности вроде «первая лекция курса», зато алфавит воспроизводим —
    прогон, оборванный на середине, продолжится с того же места.
    """
    with open(SITEMAP, encoding="utf-8") as f:
        text = f.read()
    out = []
    for url in LOC_RE.findall(text):
        if "/blog/" not in url or not url.endswith(".html"):
            continue
        slug = url.rsplit("/", 1)[-1][:-5]
        if slug.startswith("lekciya-"):
            continue
        out.append(slug)
    return sorted(set(out))


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


def check_one(slug):
    """Переозвучить одну лекцию и сказать, чем она вышла.

    Ради этой проверки инструмент и написан с двумя режимами. Фолбэк на Яндекс
    молчаливый: если Fish отвечает 402 или модель в env написана с опечаткой,
    пакет отработает «успешно», статусы покажут «готово», а голос по всему
    архиву окажется чужим. На одной лекции это видно за минуту, на тысяче —
    после того, как переозвучено всё.
    """
    if not slug:
        # Без аргумента ищем лекцию, которую не жалко: уже деградировавшую
        # в Яндекс или ещё не озвученную. Проверять на хорошей записи Фреди
        # нельзя — если проверка провалится, мы своими руками её испортим.
        waves, _ = build_waves()
        first = waves[min(waves)]
        print("ищу лекцию, которую не жалко (деградировавшую или неозвученную)…")
        for cand in first[:40]:
            try:
                st = call(f"/api/tts/blog/{cand}/status", method="GET")
            except SystemExit:
                continue
            if st.get("degraded") or not st.get("ready"):
                slug = cand
                break
            time.sleep(1.1)
        if not slug:
            slug = first[0]
            print(f"все проверенные озвучены правильно; беру {slug} — "
                  f"учтите, что при неудаче её придётся переозвучить ещё раз")
    print(f"переозвучиваю одну лекцию: {slug}\n")

    before = call(f"/api/tts/blog/{slug}/status", method="GET")
    print(f"было:  voice={before.get('voice')} model={before.get('fish_model')} "
          f"degraded={before.get('degraded')}")
    if not before.get("fish"):
        sys.exit("на сервере не настроен Fish (нет ключа или голоса) — "
                 "переозвучка уйдёт в Яндекс, запускать нельзя")

    call(f"/api/tts/blog/{slug}/generate", body={"force": True})
    print("жду синтеза", end="", flush=True)
    now = before
    for _ in range(60):          # синтез лекции идёт минуты, не секунды
        time.sleep(10)
        print(".", end="", flush=True)
        now = call(f"/api/tts/blog/{slug}/status", method="GET")
        if not now.get("generating") and now.get("v") != before.get("v"):
            break
    print()

    voice, model = now.get("voice"), now.get("fish_model")
    print(f"стало: voice={voice} model={model} degraded={now.get('degraded')} "
          f"fish_error={now.get('fish_error')}")
    if now.get("generating"):
        sys.exit("\nне дождался: синтез всё ещё идёт. Повторите --check позже")
    if voice != "fish":
        sys.exit(f"\nПЛОХО: голос вышел «{voice}», а не Fish "
                 f"(причина: {now.get('fish_error')}). Пакет не запускать.")
    print(f"\nхорошо: голос Fish, модель «{model}». "
          f"Послушайте и, если это Джарвис, запускайте волну.")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--wave", help="номера волн: 1, 1-3, 2,5. По умолчанию все")
    ap.add_argument("--articles", action="store_true",
                    help="только статьи блога, которые не лекции")
    ap.add_argument("--all", action="store_true",
                    help="весь архив: сначала лекции волнами, потом статьи блога")
    ap.add_argument("--dry-run", action="store_true", help="показать очередь, ничего не запускать")
    ap.add_argument("--no-force", action="store_true",
                    help="не переозвучивать уже готовое (тогда прогон почти наверняка пустой)")
    ap.add_argument("--status", action="store_true", help="прогресс текущего пакета")
    ap.add_argument("--stop", action="store_true", help="остановить после текущей лекции")
    ap.add_argument("--check", nargs="?", const="", metavar="СЛАГ",
                    help="переозвучить ОДНУ лекцию и показать, чем она вышла. "
                         "Без слага сам найдёт ту, которую не жалко")
    args = ap.parse_args()

    if args.check is not None:
        return check_one(args.check)

    if args.status:
        print(json.dumps(call("/api/tts/blog/pregenerate", method="GET"),
                         ensure_ascii=False, indent=2))
        return
    if args.stop:
        print(json.dumps(call("/api/tts/blog/pregenerate/stop"),
                         ensure_ascii=False, indent=2))
        return

    if args.articles and (args.wave or args.all):
        sys.exit("--articles не сочетается с --wave и --all")

    waves, courses = build_waves()
    if not waves:
        sys.exit(f"не нашёл ни одной лекции в {LEKTORIJ}")
    articles = blog_articles()

    queue, numbers = [], []
    if args.articles:
        queue = articles
        print(f"статей блога (не лекций): {len(articles)}")
    else:
        numbers = parse_waves(args.wave, sorted(waves))
        for n in numbers:
            queue.extend(waves[n])
        print(f"курсов: {courses}, волн: {len(waves)}, "
              f"лекций всего: {sum(len(v) for v in waves.values())}, "
              f"прочих статей блога: {len(articles)}")
        for n in numbers:
            print(f"  волна {n:>2}: {len(waves[n])} лекций")
        if args.all:
            queue.extend(articles)
            print(f"  статьи блога: {len(articles)}")

    print(f"в очереди на этот запуск: {len(queue)}")
    # Синтез идёт последовательно и занимает минуты на материал: у полного
    # архива это не часы, а сутки. Лучше сказать это до запуска, чем чтобы
    # человек ждал у экрана.
    hours = len(queue) * 3 / 60
    print(f"грубая оценка времени: около {hours:.0f} ч при трёх минутах на материал")

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
