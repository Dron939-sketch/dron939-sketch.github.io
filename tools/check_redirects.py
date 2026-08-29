#!/usr/bin/env python3
"""Проверка редиректов на живом сайте.

Карта старых адресов лежит в nginx.conf, а работает она только после
деплоя — значит проверять надо не файл, а прод. Скрипт читает карту
из конфига и по каждому адресу спрашивает сайт: пришёл ли 301 и туда ли.

Отдельно проверяется то, ради чего всё затевалось: что сайт вообще жив.
Конфиг nginx с ошибкой не роняет одну страницу — он роняет весь сервер,
поэтому первая же проверка здесь про главную, а не про редиректы.

    python3 tools/check_redirects.py              # прод
    python3 tools/check_redirects.py --base http://localhost:8099
    python3 tools/check_redirects.py --verbose    # печатать каждый адрес
"""

from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NGINX = ROOT / "nginx.conf"
DEFAULT_BASE = "https://meysternlp.ru"
TIMEOUT = 20


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Нам нужен сам ответ 301, а не то, куда он ведёт."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


OPENER = urllib.request.build_opener(NoRedirect)
OPENER.addheaders = [("User-Agent", "meysternlp-redirect-check/1.0")]


def fetch(url: str) -> tuple[int, str]:
    """Возвращает (код, Location). Сетевую ошибку отдаёт кодом 0."""
    try:
        with OPENER.open(url, timeout=TIMEOUT) as resp:
            return resp.status, resp.headers.get("Location", "")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location", "") if e.headers else ""
    except Exception as e:  # noqa: BLE001 — таймаут, DNS, TLS: причина в тексте
        print(f"    сеть: {e}", file=sys.stderr)
        return 0, ""


def read_map() -> list[tuple[str, str]]:
    """Пары «старый адрес → новый» из блока map в nginx.conf."""
    text = NGINX.read_text(encoding="utf-8")
    block = re.search(r"map \$uri \$legacy_target \{(.*?)\n    \}", text, re.S)
    if not block:
        sys.exit("в nginx.conf нет карты map $uri $legacy_target")
    pairs = []
    for line in block.group(1).splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("default"):
            continue
        parts = line.rstrip(";").split()
        if len(parts) == 2:
            pairs.append((parts[0], parts[1]))
    return pairs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()
    base = args.base.rstrip("/")

    # 1. Сайт жив? Сломанный конфиг кладёт всё, и остальные проверки
    #    посыпятся следом, не сказав, в чём настоящая причина.
    code, _ = fetch(f"{base}/")
    if code != 200:
        print(f"ГЛАВНАЯ ОТДАЁТ {code} — сайт не поднялся. Остальное не проверяю.")
        return 1
    print(f"главная: 200")

    bad = []

    # 2. Редиректы со старых адресов
    pairs = read_map()
    for old, new in pairs:
        code, loc = fetch(base + old)
        ok = code == 301 and loc.endswith(new)
        if args.verbose or not ok:
            print(f"  {'ok ' if ok else 'НЕТ'} {old} → {code} {loc or '—'}")
        if not ok:
            bad.append((old, f"ждали 301 → {new}, пришло {code} {loc or '—'}"))
    print(f"редиректы: {len(pairs) - len([b for b in bad])}/{len(pairs)}")

    # 3. Слэш на конце при файле без слэша
    for old, new in [
        ("/treningi/razgovornyy-gipnoz-standart/", "/treningi/razgovornyy-gipnoz-standart.html"),
        ("/treningi/razgovornyy-gipnoz-samostoyatelnyy/", "/treningi/razgovornyy-gipnoz-samostoyatelnyy.html"),
    ]:
        code, loc = fetch(base + old)
        ok = code == 301 and loc.endswith(new)
        print(f"  {'ok ' if ok else 'НЕТ'} слэш: {old} → {code} {loc or '—'}")
        if not ok:
            bad.append((old, f"ждали 301 → {new}, пришло {code}"))

    # 4. Настоящие каталоги не должны попасть под правило слэша
    for path in ["/blog/", "/igry/", "/treningi/", "/virtual-psychologist/", "/blog/lektorij/"]:
        code, _ = fetch(base + path)
        ok = code == 200
        print(f"  {'ok ' if ok else 'НЕТ'} каталог: {path} → {code}")
        if not ok:
            bad.append((path, f"каталог должен отдавать 200, пришло {code}"))

    # 5. Служебное наследие — 410, а не 404 и не редирект
    for path in ["/category/bez-rubriki/", "/author/admin/", "/chernovik/"]:
        code, _ = fetch(base + path)
        ok = code == 410
        print(f"  {'ok ' if ok else 'НЕТ'} 410: {path} → {code}")
        if not ok:
            bad.append((path, f"ждали 410, пришло {code}"))

    # 6. Clean-param доехал до robots.txt
    try:
        with OPENER.open(f"{base}/robots.txt", timeout=TIMEOUT) as r:
            robots = r.read().decode("utf-8", "replace")
        ok = "Clean-param: m /fredi/" in robots
        print(f"  {'ok ' if ok else 'НЕТ'} robots.txt: Clean-param")
        if not ok:
            bad.append(("/robots.txt", "нет строки Clean-param: m /fredi/"))
    except Exception as e:  # noqa: BLE001
        bad.append(("/robots.txt", f"не открылся: {e}"))

    print()
    if bad:
        print(f"НЕ СОШЛОСЬ: {len(bad)}")
        for path, why in bad:
            print(f"  {path}: {why}")
        return 1
    print("всё сошлось")
    return 0


if __name__ == "__main__":
    sys.exit(main())
