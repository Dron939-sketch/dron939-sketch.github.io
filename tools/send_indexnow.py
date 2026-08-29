#!/usr/bin/env python3
"""Отправляет адреса в IndexNow (Яндекс, Bing и другие подписчики протокола).

Ключ d2c0c096ffd9fe58fe859b63b810e1d2 опубликован в корне сайта — это
обязательное условие протокола: приёмник проверяет, что файл с ключом
лежит на домене, и только тогда доверяет пакету.

Отправка не заставляет проиндексировать — она сообщает «эти адреса
появились или изменились, приходите». Для нового материала это срезает
дни ожидания планового обхода.

Адреса: либо аргументами, либо --changed N — всё, что менялось в git за
последние N коммитов (html из blog/, istorii/, testy/, trenazhery/ и
корневых разделов), плюс сами хабы.

    python3 tools/send_indexnow.py https://meysternlp.ru/testy/ ...
    python3 tools/send_indexnow.py --changed 3
    python3 tools/send_indexnow.py --changed 3 --dry-run
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "meysternlp.ru"
KEY = "d2c0c096ffd9fe58fe859b63b810e1d2"
ENDPOINT = "https://api.indexnow.org/indexnow"


def url_for(path: str) -> str | None:
    """Путь в репозитории → публичный адрес, или None для служебного."""
    if not path.endswith(".html"):
        return None
    if any(path.startswith(p) for p in
           ("vk-drafts/", "b17-drafts/", "max-drafts/", "video-drafts/",
            "v-razrabotke/", "docs/", "tools/", "scripts/", "fredi/")):
        return None
    if path.endswith("/index.html"):
        return f"https://{SITE}/" + path[: -len("index.html")]
    if path == "index.html":
        return f"https://{SITE}/"
    return f"https://{SITE}/" + path


def changed_urls(n_commits: int) -> list[str]:
    out = subprocess.run(
        ["git", "diff", "--name-only", "--diff-filter=AM", f"HEAD~{n_commits}", "HEAD"],
        cwd=ROOT, capture_output=True, text=True, check=True).stdout
    urls = []
    for line in out.splitlines():
        u = url_for(line.strip())
        if u:
            urls.append(u)
    return sorted(set(urls))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("urls", nargs="*")
    ap.add_argument("--changed", type=int, metavar="N",
                    help="адреса из изменений последних N коммитов")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    urls = list(args.urls)
    if args.changed:
        urls += changed_urls(args.changed)
    urls = sorted(set(urls))
    if not urls:
        print("нечего отправлять")
        return 1
    if len(urls) > 10000:
        print(f"слишком много адресов ({len(urls)}), протокол ограничивает 10 000")
        return 1

    print(f"адресов: {len(urls)}")
    for u in urls:
        print("  ", u)
    if args.dry_run:
        print("--dry-run: не отправлено")
        return 0

    body = json.dumps({"host": SITE, "key": KEY, "urlList": urls}).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT, data=body,
        headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"ответ: HTTP {r.status} — принято")
    except urllib.error.HTTPError as e:
        print(f"ответ: HTTP {e.code} — {e.read().decode('utf-8', 'replace')[:200]}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
