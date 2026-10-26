/* Тема страниц, у которых есть обе: магазин, заказ, «Стандартный», тарифы.
   По умолчанию светлая (фокус-группа 26.10.2026: там, где читают и платят,
   тёмное мешает), выбор посетителя помнится. Подключается в <head> без
   defer, чтобы тема встала до первой отрисовки и страница не мигала.
   Кнопка — любой элемент с классом theme-btn. */
(function () {
  var d = document.documentElement, t = null;
  try { t = localStorage.getItem('site_theme'); } catch (e) {}
  if (t !== 'dark' && t !== 'light') t = 'light';
  d.setAttribute('data-theme', t);
  function sync() {
    var b = document.querySelectorAll('.theme-btn');
    for (var i = 0; i < b.length; i++) {
      b[i].setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      b[i].setAttribute('title', t === 'dark' ? 'Светлая тема' : 'Тёмная тема');
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.theme-btn');
    if (!b) return;
    t = t === 'dark' ? 'light' : 'dark';
    d.setAttribute('data-theme', t);
    try { localStorage.setItem('site_theme', t); } catch (x) {}
    sync();
    try { ym(108138656, 'params', { site_theme: t }); } catch (x) {}
  });
  document.addEventListener('DOMContentLoaded', sync);
})();
