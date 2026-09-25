# -*- coding: utf-8 -*-
"""Цена месячной подписки Фреди по всему сайту — одной правкой.

Зачем отдельный инструмент. 22.09.2026 цену пробы меняли руками, и шесть
мест в fredi/subscription.js были пропущены: там цена написана сущностью
«&#8381;», а не знаком «₽», и глазами это не ловится. Человек видел на
экране одну цену, касса списывала другую.

Что заменяется: только цена НАШЕЙ месячной подписки — число рядом с ₽
(или «руб», или «&#8381;»), у которого поблизости стоит «мес»,
«ежемесяч» или «подписк». Плюс производная «N ₽ в день» — она считается
делением на 30 и округлением, вписывать её руками нельзя.

Что НЕ заменяется: числа из статей про ценовые якоря («всего 990 вместо
2990», зачёркнутые «29 990 ₽»), годы, тиражи, любое 990 без денежной
единицы. Такие места печатаются отдельным списком — их надо просмотреть
глазами, а не доверять регулярке.

    python3 tools/set_price.py --from 990 --to 690 --dry-run
    python3 tools/set_price.py --from 990 --to 690
"""
import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = (".html", ".js", ".json", ".txt", ".md")
SKIP_DIRS = {".git", "node_modules", "vk-drafts"}

# Денежная единица сразу после числа: знак, сущность или слово.
UNIT = r"(?:\s|&nbsp;)*(?:₽|&#8381;|руб(?:лей|ля|\.)?)"
# Рядом — про месяц или про подписку.
NEAR = ("мес", "ежемесяч", "подписк", "premium", "автопродлен")
# Рядом — про чужую цену из статьи о ценовых якорях.
NOT_OURS = ("вместо", "зачёркн", "зачеркн", "якор", "казалось", "обычно")


def windows(text: str, pat: re.Pattern):
    for m in pat.finditer(text):
        yield m, text[max(0, m.start() - 70):m.end() + 70].lower()


def ours(win: str) -> bool:
    if any(w in win for w in NOT_OURS):
        return False
    return any(w in win for w in NEAR)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="old", type=int, required=True)
    ap.add_argument("--to", dest="new", type=int, required=True)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    price = re.compile(rf"(?<![\d]){a.old}{UNIT}")
    # Источник правды на клиенте: число без знака рубля, регуляркой цены
    # выше оно не ловится, а из него считаются все цены на экране подписки.
    const = re.compile(rf"(monthly:\s*){a.old}\b")
    # «33 ₽ в день» — производная от месячной цены.
    day_old, day_new = round(a.old / 30), round(a.new / 30)
    per_day = re.compile(rf"(?<![\d]){day_old}({UNIT}(?:\s|&nbsp;)*(?:в|/)(?:\s|&nbsp;)*д(?:ень|ня))")
    day_word = re.compile(rf"(?<![\d]){day_old}(\s+рубл\w+\s+в\s+день)")

    changed, hits, day_hits, skipped = 0, 0, 0, []
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            if not fn.endswith(EXT) or fn == os.path.basename(__file__):
                continue
            path = os.path.join(base, fn)
            try:
                src = open(path, encoding="utf-8").read()
            except (UnicodeDecodeError, OSError):
                continue
            if str(a.old) not in src and str(day_old) not in src:
                continue

            out, last, n, dn = [], 0, 0, 0
            for m, win in windows(src, price):
                if not ours(win):
                    skipped.append((os.path.relpath(path, ROOT), win.replace("\n", " ")[:110]))
                    continue
                out.append(src[last:m.start()])
                out.append(m.group(0).replace(str(a.old), str(a.new), 1))
                last, n = m.end(), n + 1
            out.append(src[last:])
            new_src = "".join(out)

            def sub_day(pat, s):
                nonlocal dn

                def rep(m):
                    nonlocal dn
                    w = s[max(0, m.start() - 70):m.end() + 70].lower()
                    if not ours(w):
                        return m.group(0)
                    dn += 1
                    return str(day_new) + m.group(1)
                return pat.sub(rep, s)

            new_src = sub_day(per_day, new_src)
            new_src = sub_day(day_word, new_src)
            new_src, cn = const.subn(rf"\g<1>{a.new}", new_src)
            n += cn

            if new_src != src:
                changed += 1
                hits += n
                day_hits += dn
                if not a.dry_run:
                    open(path, "w", encoding="utf-8").write(new_src)
                print(f"  {os.path.relpath(path, ROOT)}: цена {n}, в день {dn}")

    print(f"\n{'БЫЛО БЫ ' if a.dry_run else ''}заменено: {hits} раз «{a.old}» → «{a.new}», "
          f"{day_hits} раз «{day_old} в день» → «{day_new} в день», файлов {changed}")
    if skipped:
        print(f"\nНЕ ТРОНУТО ({len(skipped)}) — посмотрите глазами, это чужие цены или не цены:")
        seen = set()
        for path, win in skipped:
            key = win[30:90]
            if key in seen:
                continue
            seen.add(key)
            print(f"  {path}\n    …{win}…")
    return 0


if __name__ == "__main__":
    sys.exit(main())
