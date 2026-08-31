#!/usr/bin/env python3
"""Собирает семантическое ядро по подсказкам Яндекса и сверяет с блогом.

Wordstat без авторизации не отдаёт частоты, но подсказки поиска — тоже
замер спроса: в выпадашку попадают только запросы, которые люди реально
набирают, и стоят они в порядке популярности. Для решения «про что писать
дальше» этого достаточно: частотность до единиц запросов здесь не нужна,
нужно знать, какие формулировки существуют и закрыты ли они статьями.

Что делает:
1. По затравкам (страхи, отношения, сон, деньги…) опрашивает
   suggest.yandex.ru — сами затравки плюс раскрытие по буквам.
2. Складывает всё в tools/semcore.json с пометкой, какой статьёй сайта
   запрос закрыт (совпадение по словам с заголовками из blogmap.json).
3. Печатает дыры: запросы, на которые у сайта ответа нет.

    python3 tools/mine_semantic_core.py            # полный проход, ~10 мин
    python3 tools/mine_semantic_core.py --seeds 5  # быстрый прогон
    python3 tools/mine_semantic_core.py --report   # только отчёт из кэша
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "tools" / "semcore.json"

SUGGEST = "https://suggest.yandex.ru/suggest-ff.cgi?uil=ru&part="

# Затравки — головы спроса психологической тематики. Порядок не важен.
SEEDS = [
    # состояния
    "тревога", "тревожность", "паническая атака", "депрессия", "апатия",
    "выгорание", "стресс", "бессонница", "не могу уснуть", "усталость",
    "невроз", "окр", "навязчивые мысли", "ипохондрия", "дереализация",
    # эмоции
    "злость", "обида", "вина", "стыд", "зависть", "ревность", "страх",
    "одиночество", "горе", "как пережить",
    # отношения
    "отношения", "расставание", "развод", "измена", "абьюз", "газлайтинг",
    "манипуляции", "токсичные", "созависимость", "границы", "как сказать нет",
    "муж", "жена", "свекровь", "тёща",
    # родители и дети
    "мама", "воспитание", "подросток", "ребёнок не слушается", "кричу на ребёнка",
    # самооценка и смысл
    "самооценка", "уверенность в себе", "синдром самозванца", "перфекционизм",
    "прокрастинация", "лень", "мотивация", "смысл жизни", "кризис среднего возраста",
    "не знаю чего хочу", "самореализация",
    # привычки и зависимости
    "привычки", "зависимость", "алкоголь", "бросить пить", "игромания",
    "зависимость от телефона", "переедание", "рпп",
    # методы
    "кпт", "психотерапия", "психолог", "гипноз", "самогипноз", "медитация",
    "дневник эмоций", "аффирмации", "нлп", "новый код нлп", "алфавит нлп",
    "транзактный анализ", "гештальт",
    # ИИ
    "ии психолог", "нейросеть психолог", "чат с психологом", "бесплатный психолог",
    "психолог онлайн", "виртуальный психолог", "поговорить с кем-то",
    # мышление
    "критическое мышление", "когнитивные искажения", "память как улучшить",
    "концентрация внимания", "скорочтение", "мнемотехника",
    # деньги и работа
    "деньги психология", "страх бедности", "не могу найти работу",
    "конфликт на работе", "начальник",
    # тело
    "психосоматика", "вегетососудистая дистония", "ком в горле", "тремор от волнения",
    # --- волна 2: сеялки языком ЦА, по сегментам аудитории ---
    # женщины в отношениях
    "нарцисс", "эмоциональное насилие", "пассивная агрессия", "бывший",
    "страх остаться одной", "люблю женатого", "отношения на расстоянии",
    "муж холодный", "жена пилит",
    # мамы
    "декрет", "послеродовая", "истерики у ребёнка", "ребёнок врёт",
    "ребёнок и телефон", "мама в декрете",
    # работа
    "увольнение", "не хочу работать", "трудоголизм", "коллеги",
    "страх собеседования", "работа бесит",
    # тревожные страхи
    "социофобия", "застенчивость", "страх смерти", "страх летать",
    "страх публичных выступлений", "накручиваю себя", "мнительность", "кошмары",
    # кризисы возраста
    "кризис 30 лет", "начать жизнь заново", "как изменить свою жизнь",
    "пустое гнездо", "взрослые дети", "выход на пенсию",
]

# Раскрытие затравки: «тревога а», «тревога б»… — так подсказки отдают хвосты.
EXPAND = "абвгдежзиклмнопрстучш"

STOP = {"скачать", "торрент", "фильм", "сериал", "аниме", "песня", "картинки",
        "фото", "видео", "порно", "тест на беременность"}

WORD_RE = re.compile(r"[а-яё]+", re.I)

# Слова, по которым нельзя судить о совпадении темы.
NOISE = {"как", "что", "это", "для", "при", "или", "нлп", "все", "всё", "они",
         "почему", "если", "можно", "надо", "нужно", "делать", "человек",
         "быть", "есть", "нет", "оно", "она", "мой", "моя", "мне", "меня",
         "себя", "себе", "свой", "своя", "год", "лет", "чем", "кто", "где"}


def norm_words(text: str) -> set[str]:
    out = set()
    for w in WORD_RE.findall(text.lower().replace("ё", "е")):
        if len(w) < 3 or w in NOISE:
            continue
        # грубая лемма: срезаем окончание
        out.add(w[:6] if len(w) > 6 else w[:5] if len(w) > 4 else w)
    return out


def fetch(part: str) -> list[str]:
    url = SUGGEST + urllib.parse.quote(part)
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read().decode("utf-8"))
        return [s for s in data[1] if isinstance(s, str)]
    except Exception:
        return []


def collect(seeds: list[str]) -> dict[str, list[str]]:
    core: dict[str, list[str]] = {}
    for i, seed in enumerate(seeds):
        queries = set(fetch(seed))
        time.sleep(0.25)
        for letter in EXPAND:
            queries.update(fetch(f"{seed} {letter}"))
            time.sleep(0.25)
        queries = {q for q in queries
                   if not any(s in q for s in STOP) and len(q) > len(seed)}
        core[seed] = sorted(queries)
        print(f"[{i + 1}/{len(seeds)}] {seed}: {len(queries)} запросов")
    return core


def coverage(core: dict[str, list[str]]) -> dict:
    blog = json.loads((ROOT / "blog" / "blogmap.json").read_text(encoding="utf-8"))
    pages: list[tuple[str, set[str]]] = []
    for art in blog["articles"]:
        pages.append((f"/blog/{art['slug']}.html", norm_words(art["title"])))
    # истории и курсы тоже отвечают на запросы
    for p in (ROOT / "istorii").glob("*/index.html"):
        m = re.search(r"<h1[^>]*>(.*?)</h1>", p.read_text(encoding="utf-8"), re.S)
        if m:
            pages.append((f"/istorii/{p.parent.name}/",
                          norm_words(re.sub(r"<[^>]+>", "", m.group(1)))))

    report: dict[str, dict] = {}
    for seed, queries in core.items():
        rows = []
        for q in queries:
            qw = norm_words(q)
            if not qw:
                continue
            best, best_hit = None, 0
            for url, pw in pages:
                hit = len(qw & pw)
                if hit > best_hit:
                    best, best_hit = url, hit
            covered = best_hit >= max(2, len(qw) - 1) or (len(qw) == 1 and best_hit == 1)
            rows.append({"q": q, "covered": covered, "match": best if covered else None})
        report[seed] = {
            "total": len(rows),
            "gaps": [r["q"] for r in rows if not r["covered"]],
            "rows": rows,
        }
    return report


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=0, help="взять первые N затравок")
    ap.add_argument("--report", action="store_true", help="отчёт из готового кэша")
    args = ap.parse_args()

    if args.report and CACHE.exists():
        core = json.loads(CACHE.read_text(encoding="utf-8"))["core"]
    else:
        seeds = SEEDS[: args.seeds] if args.seeds else SEEDS
        # уже собранные затравки не перекачиваем: подсказки за день не меняются,
        # а полный проход стоит ~25 минут сетевых пауз
        core = {}
        if CACHE.exists():
            core = json.loads(CACHE.read_text(encoding="utf-8")).get("core", {})
        fresh = [s for s in seeds if s not in core]
        print(f"в кэше: {len(core)}, докачиваем: {len(fresh)}")
        core.update(collect(fresh))
        CACHE.write_text(json.dumps({"core": core}, ensure_ascii=False, indent=1),
                         encoding="utf-8")

    report = coverage(core)
    CACHE.write_text(json.dumps({"core": core, "report": {
        s: {"total": r["total"], "gaps": r["gaps"]} for s, r in report.items()
    }}, ensure_ascii=False, indent=1), encoding="utf-8")

    total = sum(r["total"] for r in report.values())
    gaps = sum(len(r["gaps"]) for r in report.values())
    print(f"\nзапросов собрано: {total}, не закрыто статьями: {gaps}")
    for seed, r in sorted(report.items(), key=lambda kv: -len(kv[1]["gaps"])):
        if r["gaps"]:
            print(f"\n## {seed} — дыр {len(r['gaps'])} из {r['total']}")
            for q in r["gaps"][:12]:
                print("  ", q)
    return 0


if __name__ == "__main__":
    sys.exit(main())
