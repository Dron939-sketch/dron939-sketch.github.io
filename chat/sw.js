/* Фоновый скрипт чата /chat/ (10.10.2026).
 *
 * Нужен, чтобы браузер считал чат приложением и предлагал установить его
 * на компьютер или телефон (assets/install-app.js). Трогает только саму
 * страницу чата: сначала сеть, как обычно, а без сети — последняя
 * сохранённая копия вместо ошибки браузера. Запросы к API, картинки и
 * скрипты идут мимо — их обычный кэш браузера и так держит.
 */
const CACHE = 'chat-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.startsWith('chat-') && k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(
    fetch(e.request).then(resp => {
      if (resp && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put('/chat/', copy)).catch(() => {});
      }
      return resp;
    }).catch(() => caches.match('/chat/').then(r => r || Response.error()))
  );
});
