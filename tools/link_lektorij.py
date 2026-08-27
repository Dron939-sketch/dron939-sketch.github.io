#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ставит в статьи блога дверь в Лекторий.

Зачем. Аналитика за неделю: человек приходит из поиска на одну статью, читает
её час-два — и уходит. Второго клика нет почти нигде: в теле статей Лектория
не было вообще, только пункт в меню. Курсы при этом закрывают почти каждую
тему блога, и часть посетителей ищет прямо «прокрастинация лекция»,
«самооценка лекция», «этика лекции» — то есть спрашивает ровно то, что у нас
есть, и не находит.

Что делает. Каждой статье подбирает курс по теме (таблица RULES, сверху вниз,
первое совпадение выигрывает) и ставит:

  — тихую строку после «Содержания» — только там, где попадание точное;
  — блок в конце текста, перед блоком про Фреди и перед «Читайте также».

Где точного попадания нет, статья ведёт не на случайный курс, а на подбор по
целям на главной Лектория: «примерно про то же» читается рекламой и портит
доверие к остальным ссылкам.

Числа лекций и названия курсов берутся из самих страниц курсов, руками не
вписываются. Скрипт идемпотентен: прогон поверх уже размеченных статей
переписывает блоки заново — так их и надо обновлять после правки курсов.

    python3 tools/link_lektorij.py --dry-run     # посмотреть, что изменится
    python3 tools/link_lektorij.py               # проставить
    python3 tools/link_lektorij.py --strip       # снять всё
"""
import argparse
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK_OPEN = "<!-- lektorij-link -->"
MARK_CLOSE = "<!-- /lektorij-link -->"
HUB = "/blog/lektorij/#celi"

# ——————————————————————————————————————————————————————————————————————
# Подбор курса. Правила читаются сверху вниз, первое совпадение выигрывает,
# поэтому узкое стоит выше широкого: «ритуал примирения» — про магическое
# мышление, а не про отношения, и разбирать его надо критическим мышлением.
# ——————————————————————————————————————————————————————————————————————
RULES = [
    (r"эзотерик|ezoterik|колдов|koldov|ритуал|ritual|магия|magiya|таро|taro|"
     r"астролог|astrolog|гороскоп|goroskop|экстрасенс|ekstrasens|заговор|"
     r"примет|чакр|chakr|карм|энергетик|целител|порч|сглаз|руны|нумеролог|"
     r"лженаук|псевдонаук|фейк|fejk|дезинформац|критическ\w*[- ]мышлен|"
     r"kriticheskoe", "kriticheskoe-myshlenie"),
    (r"самогипноз|samogipnoz|\bтранс\b|trans-v-|самовнушен", "samogipnoz"),
    # КПТ — главный поисковый запрос сайта, и под него есть свой курс;
    # общая «Психотерапия» забирает остальные школы
    (r"\bкпт\b|\bkpt\b|когнитивно-повед|kognitivno-poved|аарон бек|bek-kpt|"
     r"бернс|дневник автомысл|автоматическ\w* мысл", "kpt-samostoyatelno"),
    (r"act-терап|act-terap|dbt|схема-терап|психотерап|psihoterap|терапи[яию]|"
     r"терапевт|гештальт|geshtalt|психоанализ|психолога|к психологу|"
     r"расстановк|rasstanovk|emdr|логотерап", "psihoterapiya"),
    (r"когнитивн\w* искажен|kognitivnyh-iskazhenij|iskazheni|эвристик|"
     r"evristik|ловушк\w* мышлен", "myshlenie"),
    (r"гипноз|gipnoz|эриксон|erikson|внушени|vnushen", "eriksonovskij-gipnoz"),
    (r"инцест|incest|сепарац|separac|отделит\w*-от-родител", "separaciya"),
    (r"прокрастин|prokrastin|мотивац|motivac|\bлень\b|целеполаган|"
     r"celepolagan", "prokrastinaciya-i-motivaciya"),
    (r"выгоран|vygoran|перегруз|peregruz|усталост|ustalost",
     "psihologiya-peregruzok"),
    (r"гор[еяю]\b|утрат|utrat|скорб|горюющ|похорон|умер|смерт\w*[- ]близк",
     "gore"),
    (r"самосострадан|samosostradan|самокритик|самобичеван", "samoocenka"),
    (r"раппорт|rapport|подстройк|small talk|нетворкинг|netvorking",
     "peregovory"),
    (r"пищев\w*[- ]расстройств|переедан|анорекси|булими|"
     r"компульсивн\w*[- ]ед", "psihologiya-edy"),

    # состояния
    (r"тревог|trevog|паническ|panichesk|фоби|fobi|страх|strah", "trevoga"),
    (r"депресси|depressi|апати|apati", "depressiya-i-apatiya"),
    (r"травм|travm|птср|ptsr|насили|nasili", "travma"),
    (r"расстава|rasstava|развод|razvod|разрыв|razryv|бывш", "rasstavanie"),
    (r"одиночеств|odinochestv", "odinochestvo"),
    (r"стресс|stress", "stress-menedzhment"),
    (r"бессонниц|bessonnic|\bсон\b|\bсна\b|высыпа|засыпа", "son"),
    (r"зависимост|zavisimost|алкогол|alkogol|курени|игроман",
     "zavisimosti"),
    (r"чувствительн|chuvstvitelnost|вчл|hsp|интроверт",
     "vysokaya-chuvstvitelnost"),

    # эмоции и саморегуляция
    (r"гнев|gnev|агресси|agressi|злост|zlost|ярост|раздражен",
     "gnev-i-agressiya"),
    (r"саморегуляц|samoregulyac|дыхан|dyhan|успокоит|нервн\w*[- ]систем",
     "samoregulyaciya"),
    (r"осознанн|osoznann|медитац|meditac|майндфулнес|mindfulness",
     "osoznannost"),
    (r"стыд|styd|\bвин[аеуы]\b|перфекционизм|perfekcionizm",
     "emocionalnyj-intellekt"),
    (r"эмоци|emoci|чувств|chuvstv|алекситими", "emocionalnyj-intellekt"),
    (r"самооценк|samoocenk|уверенност|uverennost|самозванц|imposter",
     "samoocenka"),

    # отношения
    (r"обесценива|obesceniva|манипул|manipul|газлайт|gazlajt|нарцисс|"
     r"narciss|токсичн|абьюз|abyuz|вербовк|влияни", "vliyanie-i-manipulyacii"),
    (r"границ|granic|отказыва|otkazyva|сказать[- ]нет|ассертивн",
     "lichnye-granicy"),
    (r"привязанност|privyazannost|отношени|otnosheni|партн[её]р|любов|"
     r"lyubov|ревност", "privyazannost-i-otnosheniya"),
    (r"конфликт|konflikt|ссор|ssor|примирен", "konflikty"),
    (r"переговор|peregovor|\bторг\b|договорит", "peregovory"),
    (r"дружб|druzhb|\bдруз|druz", "druzhba"),
    (r"родител|roditel|воспитан|vospitan|подростк|podrostk|\bмать\b|"
     r"\bотец\b|\bмам[аыу]\b|семейн", "roditelstvo"),
    (r"реб[её]н|reben|\bдет[еи]\b|deti|садик|школьник|adaptaciya-k-sadu",
     "razvitie-rebenka"),
    (r"секс|seks|камасутр|kamasutr|интимн|либидо", "kamasutra"),
    (r"язык[- ]тела|yazyk-tela|\bложь\b|lozh|вран|обман|obman|мимик",
     "yazyk-tela-i-lozh"),

    # мышление и учёба
    (r"логик|logik|аргумент|argument|софизм|силлогизм", "logika"),
    (r"памят|pamyat|запомин|zapomin|мнемоник|mnemonik|забыва", "mnemonika"),
    (r"учит[ьс]|uchit|уч[её]б|ucheb|обучен|obuchen|конспект|экзамен",
     "kak-uchitsya"),
    (r"решени|resheni|выбор|vybor|дилемм|dilemm", "prinyatie-reshenij"),
    (r"креативн|kreativn|изобрет|izobret|триз|triz|генерац\w*[- ]идей",
     "triz"),
    (r"мозг|mozg|нейро|nejro|дофамин|dofamin|серотонин", "mozg-i-povedenie"),
    (r"мышлен|myshlen|думать|dumat", "myshlenie"),
    (r"внимани|vnimani|фокус|fokus|концентрац|многозадачн", "kognitivistika"),

    # деньги и работа
    (r"копит|kopit|сбережен|sberezhen|бюджет|budzhet|\bдолг|кредит",
     "pochemu-ne-kopitsya"),
    (r"деньг|deng|финанс|finans|богат|бедност|зарплат|\bтрат",
     "dengi-i-psihologiya"),
    (r"поведенческ\w*[- ]эконом|povedencheskaya-ekonomika|nudge|подталкиван",
     "povedencheskaya-ekonomika"),
    (r"эконом|ekonom|инфляц|рынок труда", "ekonomika"),
    (r"продаж|prodazh|клиент|klient|покупател|маркетинг", "prodazhi"),
    (r"карьер|karer|работ[аеуы]|rabota|увольнен|собеседован|коллег|"
     r"начальник|офис", "rabota-i-karera"),
    (r"руковод|rukovod|лидер|lider|команд|komand|управлени|подчин[её]н|"
     r"делегиров|найм", "upravlenie-lyudmi"),
    (r"бизнес|biznes|предпринимател|стартап|svoe-delo|фриланс", "svoe-delo"),
    (r"тайм[- ]менеджмент|tajm|планирован|planirovan|\bвремя\b|дедлайн|"
     r"расписан", "tajm-menedzhment"),
    (r"привычк|privychk|дисциплин", "privychki"),

    # общество
    (r"соцсет|socset|интернет|internet|смартфон|цифров|zhizn-v-seti|"
     r"онлайн|скроллин", "zhizn-v-seti"),
    (r"медиа|media|новост|novost|пропаганд|propagand|реклам",
     "mediagramotnost"),
    (r"политик|politik|власт|vlast|государств", "politicheskaya-psihologiya"),
    (r"статус|status|доминиров|dominirov|иерарх|ierarh|популярност",
     "status-i-dominirovanie"),
    (r"толп|tolp|конформ|konform|группа|gruppa|социальн|socialn|стереотип",
     "socialnaya-psihologiya"),
    (r"эволюц|evolyuc|племя|антрополог|antropolog|культур", "antropologiya"),
    (r"религи|religi|\bбог\b|молитв|\bмиф|\bmif", "istoriya-religij"),
    (r"этик|etik|морал|moral|справедлив|честност", "etika"),
    (r"философ|filosof|стоицизм|stoicizm|смысл жизн|экзистенц|ekzistenc|"
     r"свобод\w* воли", "ekzistencialnye-voprosy"),
    (r"счасть|schast|благополуч|радост|удовлетвор[её]н", "nauka-o-schaste"),
    (r"искусств|iskusstv|музык|muzyk|красот|krasot|эстетик|estetik|"
     r"\bкино\b|литератур", "psihologiya-iskusstva"),
    (r"акт[её]р|akter|\bсцен[аеу]\b|театр|публичн\w*[- ]выступ|оратор|"
     r"orator|\bречь\b|\brech\b|\bголос", "oratorskoe-iskusstvo"),
    (r"истори[яю][- ]идей|istoriya-idej|просвещен|античност", "istoriya-idej"),

    # тело и прочее
    (r"\bед[аыу]\b|питани|pitani|\bвес\b|похуден|диет", "psihologiya-edy"),
    (r"спорт|sport|тренировк|trenirovk|\bбег\b", "psihologiya-sporta"),
    (r"\bтест|типолог|tipolog|mbti|disc|психодиагностик|психотип",
     "psihodiagnostika"),
    (r"личност|lichnost|характер|harakter|темперамент|фрейд|\bюнг\b|"
     r"роджерс|маслоу", "teorii-lichnosti"),
    (r"кризис|krizis|возраст|vozrast|\bсорок лет\b|старост",
     "vozrastnye-krizisy"),
    (r"\bнлп\b|\bnlp\b|рефрейминг|refrejming|\bякор", "nlp"),
    (r"нейросет|nejroset|искусственн\w*[- ]интеллект|чат-бот|chatgpt|"
     r"\bии[- ]|\bai-", "kak-rabotat-s-ii"),
]
COMPILED = [(re.compile(p, re.I), c) for p, c in RULES]


def pick(article):
    """Курс для статьи или None, если точного попадания нет."""
    hay = article["slug"].replace("-", " ") + " " + article["title"]
    for rx, course in COMPILED:
        if rx.search(hay):
            return course
    return None


# ——————————————————————————————————————————————————————————————————————
# Тексты. Вариантов по нескольку, выбор детерминированный от слага: одна и та
# же фраза на четырёхстах страницах — это шаблон, который видно и читателю,
# и поисковику.
# ——————————————————————————————————————————————————————————————————————
NOTE_VARIANTS = [
    'Эта тема разобрана по порядку в курсе <a href="{href}">«{name}»</a> — '
    '{n} лекций Лектория, бесплатно и с озвучкой.',
    'Если после статьи захочется не отдельных приёмов, а порядка — в Лектории '
    'есть курс <a href="{href}">«{name}»</a>: {n} лекций, каждую можно '
    'слушать.',
    'То же самое, но не статьёй, а курсом: <a href="{href}">«{name}»</a> — '
    '{n} лекций в Лектории, бесплатно, с озвучкой.',
    'В Лектории под эту тему собран курс <a href="{href}">«{name}»</a>: '
    '{n} лекций подряд, от простого к сложному. Слушать можно на ходу.',
]

BOX_VARIANTS = [
    'Статья отвечает на вопрос, курс выстраивает порядок: {n} лекций подряд, '
    'каждая опирается на предыдущую. Бесплатно, с озвучкой — можно слушать '
    'за рулём и в дороге.',
    '{n} лекций, разобранных по шагам, с заданиями и разбором того, что у вас '
    'получилось. Бесплатно; у каждой лекции есть озвучка.',
    'Здесь тема сжата до статьи, в курсе она разложена на {n} лекций — с '
    'примерами, заданиями и проверкой себя. Бесплатно и с озвучкой.',
    'Если тема ваша не на один вечер: {n} лекций Лектория с заданиями между '
    'ними. Бесплатно, каждую можно слушать, а не читать.',
]

HUB_VARIANTS = [
    'Точного курса под эту тему нет, но в Лектории есть подбор по запросу: '
    'выбираете, с чем пришли, — собирается маршрут из трёх курсов подряд.',
    'В Лектории курсы собраны под живые запросы: «откладываю то, что важнее '
    'всего», «тревожно почти всё время», «с близким одни и те же ссоры». '
    'Выбираете свой — получаете маршрут из трёх курсов.',
    'Лекции по всему, что рядом с этой темой, собраны в Лектории. Выберите, '
    'с чем пришли, — и вам соберут порядок, в котором курсы стоит пройти.',
]

BOX_TPL = (
    '{open}<div class="lektorij-link-box" style="display:flex;align-items:'
    'center;gap:14px;background:linear-gradient(135deg,#F2F7FF,#FAF5FF);'
    'border:1px solid #C7D8FF;border-radius:14px;padding:16px 20px;'
    'margin:32px 0 10px;flex-wrap:wrap">'
    '<span style="font-size:1.6rem" aria-hidden="true">🎓</span>'
    '<div style="flex:1;min-width:220px">'
    '<b style="color:#1D1D1F">{head}</b><br>'
    '<span style="color:#6E6E73;font-size:.92rem">{body}</span></div>'
    '<a href="{href}" style="background:#3A86FF;color:#fff;text-decoration:'
    'none;padding:10px 18px;border-radius:10px;font-weight:600;'
    'font-size:.92rem">{cta}</a></div>{close}'
)

NOTE_TPL = (
    '{open}<p class="lektorij-note" style="margin:22px 0;padding:12px 16px;'
    'border-left:3px solid #3A86FF;background:#F7F9FF;border-radius:0 10px '
    '10px 0;color:#4A4A4F;font-size:.95rem">🎓 {text}</p>{close}'
)


def variant(slug, options):
    """Один и тот же слаг всегда получает один и тот же вариант."""
    return options[sum(slug.encode()) % len(options)]


# ——————————————————————————————————————————————————————————————————————
# Курсы: имя и число лекций читаются со страницы курса, руками не пишутся
# ——————————————————————————————————————————————————————————————————————
def load_courses():
    out = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "blog/lektorij/*/index.html"))):
        slug = os.path.basename(os.path.dirname(path))
        s = open(path, encoding="utf-8").read()
        t = re.search(r"<title>[^<]*«(.+?)»", s)
        if not t:
            continue
        n = len(set(re.findall(r'href="(/blog/lekciya-[^"#]+)"', s)))
        if n:
            out[slug] = (t.group(1), n)
    return out


def load_articles():
    m = json.load(open(os.path.join(ROOT, "blog/blogmap.json"), encoding="utf-8"))
    return [a for a in m["articles"] if a["rubric"] != "lektorij"]


# ——————————————————————————————————————————————————————————————————————
# Вставка
# ——————————————————————————————————————————————————————————————————————
BLOCK_RE = re.compile(
    re.escape(MARK_OPEN) + r".*?" + re.escape(MARK_CLOSE), re.S)

# куда ставить блок в конце: первое, что нашлось, — туда и перед ним
TAIL_ANCHORS = [
    r'<div class="game-link-box"',
    r'<div class="cta-block"',
    r'<h2[^>]*>[^<]*(?:Часто задаваемые|Частые вопросы|Частые\s+вопросы)',
    r'<div class="related-articles"',
    r"</article>",
    r"</main>",
]


def strip(html):
    return BLOCK_RE.sub("", html)


def insert_tail(html, block):
    for pat in TAIL_ANCHORS:
        m = re.search(pat, html)
        if m:
            return html[:m.start()] + block + "\n" + html[m.start():], True
    return html, False


def insert_note(html, note):
    m = re.search(r'<nav class="toc-box".*?</nav>', html, re.S)
    if not m:
        return html, False
    return html[:m.end()] + "\n" + note + html[m.end():], True


def build(article, courses):
    slug = article["slug"]
    course = pick(article)
    if course in courses:
        name, n = courses[course]
        href = f"/blog/lektorij/{course}/"
        box = BOX_TPL.format(
            open=MARK_OPEN, close=MARK_CLOSE, href=href,
            head=f"Курс «{name}» — бесплатно, в Лектории",
            body=variant(slug, BOX_VARIANTS).format(n=n),
            cta="Открыть курс →")
        note = NOTE_TPL.format(
            open=MARK_OPEN, close=MARK_CLOSE,
            text=variant(slug, NOTE_VARIANTS).format(href=href, name=name, n=n))
        return box, note
    box = BOX_TPL.format(
        open=MARK_OPEN, close=MARK_CLOSE, href=HUB,
        head="Лекторий: курсы под то, с чем пришли",
        body=variant(slug, HUB_VARIANTS),
        cta="Подобрать курс →")
    return box, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--strip", action="store_true")
    ap.add_argument("--only", help="слаг одной статьи — для проверки")
    args = ap.parse_args()

    courses = load_courses()
    if len(courses) < 50:
        sys.exit(f"курсов прочитано всего {len(courses)} — проверьте пути")

    arts = load_articles()
    if args.only:
        arts = [a for a in arts if a["slug"] == args.only]

    changed = exact = hub = noted = skipped = 0
    misses = []
    for a in arts:
        path = os.path.join(ROOT, "blog", a["slug"] + ".html")
        if not os.path.exists(path):
            misses.append(a["slug"])
            continue
        src = open(path, encoding="utf-8").read()
        html = strip(src)
        if not args.strip:
            box, note = build(a, courses)
            html, ok = insert_tail(html, box)
            if not ok:
                skipped += 1
                misses.append(a["slug"] + " (некуда поставить блок)")
                continue
            if note:
                html, was = insert_note(html, note)
                noted += was
                exact += 1
            else:
                hub += 1
        if html != src:
            changed += 1
            if not args.dry_run:
                open(path, "w", encoding="utf-8").write(html)

    what = "изменилось бы" if args.dry_run else "изменено"
    print(f"{what} статей: {changed}")
    if not args.strip:
        print(f"  точная пара с курсом: {exact} (из них со строкой вверху: {noted})")
        print(f"  подбор по целям в Лектории: {hub}")
    if skipped:
        print(f"  пропущено, некуда вставить: {skipped}")
    for m in misses[:20]:
        print(f"    ! {m}")


if __name__ == "__main__":
    main()
