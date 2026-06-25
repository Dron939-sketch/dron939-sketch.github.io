// Stub self-unregister service worker.
//
// Назначение: убрать зомби-SW, оставшийся у юзеров от прежнего хостинга
// (когда meysternlp.ru / fredium.ru обслуживались Render-static или другой
// конфигурацией с зарегистрированным корневым SW). Сейчас сайт раздаётся
// Amvera + nginx из этого репо; SW в корне не нужен.
//
// Без этого файла nginx логирует:
//   open() "/usr/share/nginx/html/service_worker.js" failed (2: No such file)
// при попытках браузеров обновить зарегистрированный SW.
//
// Что делает: при установке/активации удаляет все кеши SW и
// саморегистрируется (unregister), затем форсит навигацию открытых клиентов,
// чтобы они подгрузили страницу заново уже БЕЗ SW.
//
// Frontend Фреди живёт в /fredi/ и регистрирует СВОЙ service_worker
// (fredi/service_worker.js) — этот корневой stub его не затрагивает,
// scope у них разный (/ vs /fredi/).

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (e) {}

        try {
            await self.registration.unregister();
        } catch (e) {}

        try {
            const clientsList = await self.clients.matchAll({ type: 'window' });
            for (const client of clientsList) {
                try { client.navigate(client.url); } catch (e) {}
            }
        } catch (e) {}
    })());
});

// На случай fetch-событий до полной деактивации: проксируем всё в сеть,
// никакого вмешательства.
self.addEventListener('fetch', (event) => {
    return; // network default
});
