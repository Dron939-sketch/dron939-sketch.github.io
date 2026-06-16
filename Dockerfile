FROM nginx:alpine

# Custom nginx config (static + API proxy + WebSocket)
COPY nginx.conf /etc/nginx/nginx.conf

# Static site content (everything from repo root)
COPY . /usr/share/nginx/html

# Cleanup: убираем из web-root инфра-файлы
RUN rm -f /usr/share/nginx/html/nginx.conf \
          /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/amvera.yaml \
          /usr/share/nginx/html/.gitignore \
          /usr/share/nginx/html/.github

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
