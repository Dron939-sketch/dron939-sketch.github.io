#!/bin/sh
# Подставляет в nginx.conf DNS-серверы платформы из /etc/resolv.conf
# вместо внешних 8.8.8.8/1.1.1.1, прописанных в репозитории как фолбэк.
#
# Зачем: 2 сентября 2026 прокси /api/ на проде лёг с ошибкой
#
#   ffred-ddd989.amvera.io could not be resolved (110: Operation timed out)
#
# — запросы к внешним DNS из сети Amvera таймаутят, а nginx не читает
# /etc/resolv.conf сам: резолвер ему задаётся только директивой resolver.
# Локальный резолвер платформы — единственный, который отвечает всегда
# (им же контейнер резолвит всё остальное). Внешние адреса в список не
# подмешиваем: nginx опрашивает серверы по кругу, и мёртвый сервер в
# списке даёт периодические пятисекундные зависания вместо надёжности.
#
# Лежит в /docker-entrypoint.d/ — штатный механизм образа nginx:alpine,
# выполняется до старта nginx. В tools/check_nginx.sh используется голый
# образ без этого скрипта, там остаётся фолбэк из nginx.conf — проверка
# синтаксиса от этого не зависит.
set -e

# Только IPv4: адреса IPv6 в resolv.conf идут без скобок, а nginx требует
# формат [::1] — проще не брать их вовсе.
ns=$(awk '/^nameserver/ && $2 !~ /:/ {printf "%s ", $2}' /etc/resolv.conf)

if [ -n "$ns" ]; then
    sed -i "s|^\([[:space:]]*\)resolver .*;|\1resolver ${ns}ipv6=off valid=300s;|" \
        /etc/nginx/nginx.conf
    echo "10-local-resolver: resolver ${ns}(из /etc/resolv.conf)"
else
    echo "10-local-resolver: в /etc/resolv.conf нет IPv4 nameserver, оставлен фолбэк"
fi
