#!/bin/sh
# Проверка nginx.conf настоящим nginx — тем же образом, что стоит в проде.
#
# Обязательна перед любым мержем, трогающим nginx.conf. Ошибка в этом
# файле не ломает одну страницу: сервер не стартует, и сайт целиком
# отдаёт 503. 29 августа 2026 так и вышло — конфиг был проверен только
# разбором текста (скобки, точки с запятой, дубликаты ключей), всё
# сошлось, а nginx отказался подниматься:
#
#   [emerg] could not build map_hash, you should increase
#           map_hash_bucket_size: 64
#
# Разбор текста такого не ловит в принципе. Ловит только nginx.
#
#   sh tools/check_nginx.sh          # синтаксис
#   sh tools/check_nginx.sh --full   # синтаксис + поднять и прогнать адреса
#
# Если демон Docker не запущен, поднять его: dockerd >/tmp/dockerd.log 2>&1 &

set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
IMAGE=nginx:alpine
PORT=8088
NAME=nginx-conf-check

if ! docker info >/dev/null 2>&1; then
    echo "Демон Docker не отвечает. Без него конфиг проверить нечем —"
    echo "не мержьте изменения nginx.conf вслепую."
    exit 2
fi

echo "1. Синтаксис"
docker run --rm -v "$ROOT/nginx.conf:/etc/nginx/nginx.conf:ro" "$IMAGE" \
    nginx -t 2>&1 | grep -E "emerg|successful|\[warn\]" || true
docker run --rm -v "$ROOT/nginx.conf:/etc/nginx/nginx.conf:ro" "$IMAGE" \
    nginx -t >/dev/null 2>&1 || { echo "   КОНФИГ НЕ ПРИНЯТ — мержить нельзя"; exit 1; }

[ "$1" = "--full" ] || { echo "Синтаксис в порядке. Полная проверка: --full"; exit 0; }

echo "2. Подъём с настоящим содержимым сайта"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -p "$PORT:80" \
    -v "$ROOT:/usr/share/nginx/html:ro" \
    -v "$ROOT/nginx.conf:/etc/nginx/nginx.conf:ro" "$IMAGE" >/dev/null
sleep 4
status=$(docker ps --filter "name=$NAME" --format '{{.Status}}')
[ -n "$status" ] || { echo "   контейнер не поднялся"; docker logs "$NAME" 2>&1 | tail -5; exit 1; }
echo "   $status"

echo "3. Адреса"
set +e
python3 "$ROOT/tools/check_redirects.py" --base "http://localhost:$PORT"
rc=$?
set -e
docker rm -f "$NAME" >/dev/null 2>&1 || true
exit $rc
