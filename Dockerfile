FROM nginx:alpine

# Custom nginx config (static + API proxy + WebSocket)
COPY nginx.conf /etc/nginx/nginx.conf

# При старте подставляет в nginx.conf DNS платформы из /etc/resolv.conf:
# внешние 8.8.8.8/1.1.1.1 из сети Amvera таймаутят, и прокси /api/ падал
# с «could not be resolved». Подробности — в самом скрипте.
COPY tools/nginx-entrypoint/10-local-resolver.sh /docker-entrypoint.d/10-local-resolver.sh
RUN chmod +x /docker-entrypoint.d/10-local-resolver.sh

# Static site content (everything from repo root)
COPY . /usr/share/nginx/html

# Cleanup: убираем из web-root инфра-файлы и директории (-r для .github/)
RUN rm -rf /usr/share/nginx/html/nginx.conf \
           /usr/share/nginx/html/Dockerfile \
           /usr/share/nginx/html/amvera.yaml \
           /usr/share/nginx/html/.gitignore \
           /usr/share/nginx/html/.github

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
