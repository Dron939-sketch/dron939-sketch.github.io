/* Кнопка «Установить на компьютер / телефон» (10.10.2026, решение владельца).
 *
 * Фреди и чат — веб-приложения (manifest + service worker), и браузеры на
 * основе Chromium — Chrome, Edge, Яндекс Браузер — ставят их как программу:
 * значок на рабочем столе и в «Пуске», своё окно без адресной строки.
 * Бэкенд тот же, обновлять ничего не нужно. Раньше об этом знали единицы:
 * пункт прячется в меню браузера.
 *
 * Подключение:
 *   <script src="/assets/install-app.js" data-sw="/chat/sw.js"
 *           data-name="Фреди и команду" defer></script>
 * data-name — в винительном падеже: «Установить Фреди и команду».
 * data-sw — фоновый скрипт раздела, если его больше никто не регистрирует.
 * У /fredi/ его нет нарочно: service_worker.js там при каждом заходе
 * регистрирует push.js, второй вызов ничего не добавит.
 * Если на странице есть элемент [data-install-app] — кнопка рисуется в нём,
 * иначе плавающей плашкой внизу слева. data-pill="mobile" — на телефоне
 * плашка ещё и поверх экрана, когда слот спрятан в выдвижном меню.
 * ?install=1 в адресе подсвечивает кнопку.
 *
 * Где браузер не умеет ставить сам (Safari, Firefox, старые браузеры), кнопка
 * открывает короткую инструкцию под устройство. В уже установленном
 * приложении кнопки нет. Крестик прячет плашку на 14 дней.
 */
(function () {
  'use strict';
  var me = document.currentScript;
  var SW = me && me.getAttribute('data-sw');
  var NAME = (me && me.getAttribute('data-name')) || 'Фреди';
  var PILL_MOBILE = me && me.getAttribute('data-pill') === 'mobile';
  var KEY = 'install_app_hidden_' + location.pathname.split('/')[1];
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var mobile = isIOS || isAndroid;
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var deferred = null, shown = false, nodes = [];

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function track(n, d) {
    try { window.FrediTracker && window.FrediTracker.track(n, d || {}); } catch (e) {}
    try { if (window.ym && location.pathname.indexOf('/chat/') === 0) ym(113593395, 'reachGoal', n); } catch (e) {}
  }

  // Фоновый скрипт нужен браузеру, чтобы считать страницу приложением.
  if (SW && 'serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register(SW).catch(function () {}); });
  }
  if (standalone) return;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    show();
  });
  window.addEventListener('appinstalled', function () {
    track('app_installed', { app: NAME });
    drop();
  });

  var css = '.ia-pill{position:fixed;left:16px;bottom:96px;z-index:9990;display:flex;align-items:center;gap:8px;'
    + 'background:#3A86FF;color:#fff;border-radius:30px;box-shadow:0 8px 24px rgba(20,40,90,.28);'
    + 'font:600 14px/1.2 Inter,-apple-system,Segoe UI,Roboto,sans-serif;padding:0 6px 0 0}'
    + '.ia-pill button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}'
    + '.ia-go{display:flex;align-items:center;gap:8px;padding:11px 4px 11px 14px}'
    + '.ia-x{width:28px;height:28px;border-radius:50%;opacity:.8;font-size:18px;line-height:28px}'
    + '.ia-x:hover{background:rgba(255,255,255,.18)}'
    + '.ia-inline{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:14px;padding:10px 14px;'
    + 'background:#EAF1FF;color:#2B6BE0;font:600 14px/1.2 Inter,-apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer;width:100%;justify-content:center}'
    + '.ia-hi{animation:iaPulse 1.6s 3}@keyframes iaPulse{50%{box-shadow:0 0 0 10px rgba(58,134,255,.25)}}'
    + '.ia-dim{position:fixed;inset:0;z-index:9995;background:rgba(15,20,35,.5);display:flex;align-items:center;justify-content:center;padding:16px}'
    + '.ia-box{background:#fff;color:#1D1D1F;border-radius:20px;max-width:420px;width:100%;padding:22px 20px;'
    + 'font:15px/1.5 Inter,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.25)}'
    + '.ia-box h3{font-size:18px;margin:0 0 8px}.ia-box ol{margin:8px 0 14px 20px;padding:0}.ia-box li{margin:6px 0}'
    + '.ia-box p{margin:0 0 10px;color:#5A5A60;font-size:14px}'
    + '.ia-box .ia-ok{width:100%;border:0;border-radius:30px;background:#3A86FF;color:#fff;padding:12px;font:600 15px Inter,sans-serif;cursor:pointer}'
    + '@media(max-width:600px){.ia-pill{bottom:88px;left:12px}}';
  var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>';

  function label() { return mobile ? 'Установить на телефон' : 'Установить на компьютер'; }

  function help() {
    var steps;
    if (isIOS) steps = ['Откройте эту страницу в Safari.', 'Нажмите «Поделиться» — квадрат со стрелкой вверх.', 'Выберите «На экран „Домой“» и нажмите «Добавить».'];
    else if (isAndroid) steps = ['Откройте меню браузера — три точки справа вверху.', 'Нажмите «Установить приложение» или «Добавить на главный экран».', 'Подтвердите — значок появится на экране.'];
    else steps = ['Откройте эту страницу в Chrome, Edge или Яндекс Браузере.', 'В адресной строке справа нажмите значок установки — экран со стрелкой — или откройте меню (три точки) и выберите пункт «Установить…».', 'Подтвердите — значок появится на рабочем столе и в меню «Пуск».'];
    var d = document.createElement('div');
    d.className = 'ia-dim';
    d.innerHTML = '<div class="ia-box" role="dialog" aria-modal="true"><h3>Как установить ' + NAME + '</h3>'
      + '<p>Отдельный файл не нужен: браузер сам поставит ' + NAME + ' как программу — со своим значком и окном. История, токены и подписка остаются на месте.</p>'
      + '<ol>' + steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>'
      + '<button class="ia-ok" type="button">Понятно</button></div>';
    d.addEventListener('click', function (e) { if (e.target === d || e.target.className === 'ia-ok') d.remove(); });
    document.body.appendChild(d);
  }

  function install() {
    track('app_install_click', { app: NAME, native: !!deferred });
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function (r) {
        track(r && r.outcome === 'accepted' ? 'app_install_accepted' : 'app_install_dismissed', { app: NAME });
        if (r && r.outcome === 'accepted') drop();
      }).catch(function () {});
      deferred = null;
    } else {
      help();
    }
  }

  function drop() { nodes.forEach(function (n) { n.remove(); }); nodes = []; }

  function show() {
    if (shown) return;
    shown = true;
    var slot = document.querySelector('[data-install-app]');
    var hl = /[?&]install=1\b/.test(location.search);
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    if (slot) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ia-inline' + (hl ? ' ia-hi' : '');
      b.innerHTML = ICON + '<span>' + label() + '</span>';
      b.addEventListener('click', install);
      slot.appendChild(b);
      nodes.push(b);
    }
    var hid = Number(lsGet(KEY) || 0);
    var hidden = hid && Date.now() - hid < 14 * 864e5 && !hl;
    if ((!slot || (PILL_MOBILE && mobile)) && !hidden) {
      var p = document.createElement('div');
      p.className = 'ia-pill' + (hl ? ' ia-hi' : '');
      p.innerHTML = '<button class="ia-go" type="button">' + ICON + '<span>' + label() + '</span></button>'
        + '<button class="ia-x" type="button" aria-label="Скрыть">×</button>';
      p.querySelector('.ia-go').addEventListener('click', install);
      p.querySelector('.ia-x').addEventListener('click', function () { lsSet(KEY, String(Date.now())); p.remove(); track('app_install_hide', { app: NAME }); });
      document.body.appendChild(p);
      nodes.push(p);
    }
    if (nodes.length) track('app_install_shown', { app: NAME, native: !!deferred });
  }

  // Браузер без своей установки (Safari, Firefox) событие не пришлёт —
  // тогда кнопка с инструкцией. В Chromium ждём событие чуть дольше.
  window.addEventListener('load', function () {
    setTimeout(show, deferred ? 0 : 4000);
  });
})();
