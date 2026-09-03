#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Сборка стартовых вопросов чата Фреди из FAQ лекций Лектория.

    python3 tools/build_chat_openers.py --dry-run
    python3 tools/build_chat_openers.py

Зачем. За неделю 29 человек открыли Фреди и отправили 20 сообщений на всех.
Человека встречает пустое поле «Напишите, что беспокоит…» — и он не пишет.
При этом почти все приходят с лекции Лектория, то есть за минуту до этого
читали вполне конкретный текст. Если предложить три вопроса ровно по нему,
первое сообщение стоит одного касания.

Вопросы не сочиняются. Берутся видимые блоки «❓ Частые вопросы» из лекций
курса — они уже написаны голосом сайта и уже отвечают за содержание. С
каждой из первых лекций курса берётся по одному вопросу: так три предложения
покрывают курс, а не топчутся в одной теме.

На выходе fredi/openers.json:

    prefixes  общий кусок слага лекции → слаг курса (lekciya-dumat-3-… →
              kak-dumat). Реферер даёт адрес лекции, а вопросы лежат у курса.
    courses   слаг курса → заголовок и три вопроса.
    landings  адрес посадочной → короткое имя и три вопроса.
    default   что показать тому, кто пришёл не из Лектория.

Посадочные добавлены 03.09.2026. С них Фреди открывают не меньше, чем с
лекций, а вопросы им доставались общие — «как отличить усталость от
выгорания» человеку, который минуту назад разбирал своё расставание.
Источник тот же и такой же надёжный: видимый блок «Частые вопросы» самой
посадочной, написанный её же голосом. Короткое имя берём из og:title —
<h1> у посадочных длинный и в строку «Вы разбирали…» не влезает.

Файл читает fredi/openers.js. Руками не править: пересобирается отсюда.
"""
import os, io, re, sys, json, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, "blog")
OUT = os.path.join(ROOT, "fredi", "openers.json")

# Вопрос короче — его дочитывают на кнопке. Длинные «Объясните своими
# словами разницу между… и приведите по два примера каждого» из блока
# «Вопросы для самопроверки» сюда не годятся: это задание себе, а не
# вопрос собеседнику. Берём только то, что кончается знаком вопроса.
Q_MIN, Q_MAX = 20, 95

# Тому, кто пришёл не с лекции, показываем общие входы. Это единственный
# рукописный кусок файла — и он ни за какие факты не отвечает.
DEFAULT_Q = [
    "С чего начать, если непонятно, что именно со мной не так?",
    "Как отличить усталость от выгорания?",
    "Что делать, если снова откладываю важное на завтра?",
]

# Тесты — исключение, и вот почему. Везде вопросы берутся из видимого FAQ
# страницы, и это работает: у посадочной FAQ отвечает на то, с чем человек
# пришёл. У теста FAQ отвечает про сам инструмент — «что такое шкала PHQ-9»,
# «куда отправляются мои ответы». Человеку, который минуту назад получил
# свои четырнадцать баллов, это мимо: он хочет знать, что с ними делать.
# Собранные автоматически, такие подсказки выглядели бы уместно и не были
# бы полезны ничем. Поэтому здесь, как и в DEFAULT_Q, рукописный блок —
# и он тоже ни за какие факты не отвечает: это вопросы, а не утверждения.
TEST_Q = {
    "testy/depressiya-phq-9": [
        "У меня вышло много баллов. Что это значит на практике?",
        "Как понять, идти к врачу или можно справиться самому?",
        "Что делать сегодня вечером, если сил нет совсем?",
    ],
    "testy/trevoga-gad-7": [
        "Тревога по тесту высокая — с чего начать?",
        "Чем тревожность отличается от обычного волнения?",
        "Что делать, когда накрывает прямо сейчас?",
    ],
    "testy/test-na-revnost": [
        "Что делать с тем, что показал тест?",
        "Как перестать проверять телефон партнёра?",
        "Ревность — это про меня или про наши отношения?",
    ],
    "testy/test-na-umenie-lyubit": [
        "Что делать с тем компонентом, который просел?",
        "Как это менять, если сколько себя помню — так и было?",
        "Можно ли этому научиться взрослым?",
    ],
}

dry = "--dry-run" in sys.argv


def text(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html)).strip()


def faq_questions(path):
    """Видимые <h3> из блока «Частые вопросы» страницы."""
    try:
        s = io.open(path, encoding="utf-8").read()
    except OSError:
        return []
    i = s.find("Частые вопросы")
    if i < 0:
        return []
    tail = s[i:]
    # блок кончается на следующем <h2> — «Итоги», «Литература» и прочем
    j = tail.find("<h2", 20)
    if j > 0:
        tail = tail[:j]
    out = []
    for raw in re.findall(r"<h3[^>]*>(.*?)</h3>", tail, re.S):
        q = text(raw)
        if q.endswith("?") and Q_MIN <= len(q) <= Q_MAX and q not in out:
            out.append(q)
    return out


def h1(path):
    s = io.open(path, encoding="utf-8").read()
    m = re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S)
    return text(m.group(1)) if m else ""


# Короткое имя посадочной. og:title у них — как раз узнаваемая строчка без
# хвоста «| Андрей Мейстер»; <h1> длиннее и в подпись не влезает.
OG_RE = re.compile(r'<meta property="og:title" content="([^"]+)"')

# Посадочные-инструменты лежат каталогами в корне. Служебные каталоги сюда
# попасть не должны: у них либо нет FAQ, либо это вообще не страницы.
SKIP_DIRS = {
    "assets", "blog", "docs", "fonts", "fredi", "img", "scripts", "tools",
    "b17-articles", "b17-drafts", "max-drafts", "vk-drafts", "video-drafts",
    "v-razrabotke", "trenazhery", "testy", "igry", "knigi", "treningi",
    "istorii", "sobytiya", "about", "kontakty", "oferta", "tarify",
    "politika-konfidencialnosti", "obo-mne", "komplekt",
}


def landing_pages(root):
    """Каталоги в корне сайта, у которых есть свой блок «Частые вопросы».

    Плюс тесты в /testy/: PHQ-9 — самый большой адрес приземления рекламы
    в аккаунте (136 визитов в сутки), и человек уходит оттуда в Фреди с
    конкретным баллом на руках. Общие вопросы ему тем более мимо.
    """
    for page in sorted(glob.glob(os.path.join(root, "*", "index.html"))):
        slug = os.path.basename(os.path.dirname(page))
        if slug in SKIP_DIRS or slug.startswith("."):
            continue
        yield slug, page
    for page in sorted(glob.glob(os.path.join(root, "testy", "*", "index.html"))):
        yield "testy/" + os.path.basename(os.path.dirname(page)), page


def main():
    courses, prefixes, thin = {}, {}, []
    collisions = {}

    for page in sorted(glob.glob(os.path.join(BLOG, "lektorij", "*", "index.html"))):
        slug = os.path.basename(os.path.dirname(page))
        s = io.open(page, encoding="utf-8").read()
        lectures = sorted(set(re.findall(r"/blog/(lekciya-[a-z0-9-]+)\.html", s)))
        if not lectures:
            continue

        # по одному вопросу с лекции, пока не наберётся три
        qs = []
        for lec in lectures:
            for q in faq_questions(os.path.join(BLOG, lec + ".html")):
                if q not in qs:
                    qs.append(q)
                    break
            if len(qs) == 3:
                break
        if len(qs) < 3:
            thin.append((slug, len(qs)))
            if not qs:
                continue

        title = h1(page)
        courses[slug] = {"t": title, "q": qs}

        # общий префикс слагов лекций курса: lekciya-<prefix>-<N>-...
        for lec in lectures:
            m = re.match(r"lekciya-([a-z0-9]+)-\d+", lec)
            if not m:
                continue
            p = m.group(1)
            if prefixes.get(p, slug) != slug:
                collisions.setdefault(p, {prefixes[p]}).add(slug)
                continue
            prefixes[p] = slug

    for p in collisions:
        # неоднозначный префикс молча увёл бы человека в чужой курс
        prefixes.pop(p, None)

    # Посадочные-инструменты: вопросы из их же видимого FAQ.
    landings, thin_land = {}, []
    for slug, page in landing_pages(ROOT):
        qs = TEST_Q.get(slug) or faq_questions(page)[:3]
        if not qs:
            continue
        if len(qs) < 3:
            thin_land.append((slug, len(qs)))
        s = io.open(page, encoding="utf-8").read()
        m = OG_RE.search(s)
        landings["/%s/" % slug] = {"t": text(m.group(1)) if m else "", "q": qs}

    data = {
        "note": "Собрано tools/build_chat_openers.py из блоков «Частые вопросы» лекций и посадочных. Руками не править.",
        "default": DEFAULT_Q,
        "prefixes": prefixes,
        "courses": courses,
        "landings": landings,
    }
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))

    print("курсов с тремя вопросами: %d из %d"
          % (sum(1 for c in courses.values() if len(c["q"]) == 3), len(courses)))
    print("префиксов лекций: %d" % len(prefixes))
    print("посадочных с вопросами: %d (из них меньше трёх: %d%s)"
          % (len(landings), len(thin_land),
             " — " + ", ".join("%s(%d)" % t for t in thin_land[:6]) if thin_land else ""))
    if collisions:
        print("неоднозначные префиксы (выброшены): %s"
              % ", ".join("%s → %s" % (p, "/".join(sorted(v))) for p, v in collisions.items()))
    if thin:
        print("курсов меньше чем с тремя вопросами: %d — %s"
              % (len(thin), ", ".join("%s(%d)" % t for t in thin[:8])))
    print("%s: %.1f КБ" % (os.path.relpath(OUT, ROOT), len(body.encode("utf-8")) / 1024.0))

    if dry:
        print("БЕЗ ЗАПИСИ")
        return
    io.open(OUT, "w", encoding="utf-8").write(body)


if __name__ == "__main__":
    main()
