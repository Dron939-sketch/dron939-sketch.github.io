// ============================================
// lock.js — замок на лекциях новых курсов Лектория
//
// Решение владельца 05.10.2026: у новых курсов («Обида», «Измена и
// ревность» и дальше) первая лекция открыта, лекции 2–10 — по подписке
// Фреди. В HTML таких лекций есть шапка, врез, возврат к прошлой
// лекции, план и «Частые вопросы», а на месте тела стоит
// <div id="lockGate" data-slug data-first data-course data-course-name>.
// Тело лежит на сервере Фреди и отдаётся по
// /api/lektorij/lecture/<slug>?user_id=… только при активной подписке.
//
// Личность берётся из localStorage['fredi_user_id'] — блог и приложение
// живут на одном домене, и человек, вошедший в Фреди, узнаётся здесь
// без повторного входа. Временные id (temp_…) подпиской не бывают.
//
// Счёт: показ замка и открытие уходят событиями lecture_lock_shown /
// lecture_unlocked в аналитику Фреди (цели Метрики исчерпаны).
// ============================================
(function () {
    'use strict';
    var gate = document.getElementById('lockGate');
    if (!gate) return;
    var slug = gate.getAttribute('data-slug') || '';
    var first = gate.getAttribute('data-first') || '/blog/lektorij/';
    var course = gate.getAttribute('data-course') || '/blog/lektorij/';
    var courseName = gate.getAttribute('data-course-name') || 'курса';
    var API = /(^|\.)meysternlp\.ru$/.test(location.hostname) ? '' : 'https://ffred-ddd989.amvera.io';

    function uid() {
        try {
            var v = localStorage.getItem('fredi_user_id');
            if (v && /^\d{1,19}$/.test(v)) return v;
        } catch (e) {}
        return '';
    }

    function track(name, data) {
        try {
            var ev = { event: name, screen: 'blog', data: data || {}, user_id: uid() || null };
            fetch(API + '/api/analytics/events', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events: [ev] }), keepalive: true, credentials: 'omit', mode: 'cors'
            }).catch(function () {});
        } catch (e) {}
    }

    function css() {
        if (document.getElementById('lockCss')) return;
        var s = document.createElement('style');
        s.id = 'lockCss';
        s.textContent =
            '.lock-box{margin:36px 0;padding:28px 26px;background:linear-gradient(135deg,#F2F7FF,#FAF5FF);border:1px solid #C7D8FF;border-radius:20px;text-align:left}' +
            '.lock-box .lk{font-size:2rem;line-height:1;margin-bottom:10px}' +
            '.lock-box h3{margin:0 0 10px;font-size:1.35rem;font-weight:600}' +
            '.lock-box p{margin:0 0 12px;font-size:1.05rem;font-weight:300;color:#3C3C43}' +
            '.lock-box .price{font-size:.92rem;color:#6E6E73;margin-bottom:16px}' +
            '.lock-btns{display:flex;gap:12px;flex-wrap:wrap}' +
            '.lock-btn{display:inline-block;padding:13px 26px;border-radius:50px;font-weight:600;font-size:1rem;text-decoration:none;background:#3A86FF;color:#fff;border:2px solid #3A86FF}' +
            '.lock-btn:hover{background:#1D1D1F;border-color:#1D1D1F;color:#fff}' +
            '.lock-btn.ghost{background:transparent;color:#3A86FF}' +
            '.lock-btn.ghost:hover{background:#3A86FF;color:#fff}' +
            '.lock-wait{margin:24px 0;color:#6E6E73;font-size:.95rem}' +
            '.lock-ben{list-style:none;margin:4px 0 16px;padding:0;display:grid;gap:10px}' +
            '.lock-ben li{display:flex;gap:12px;align-items:flex-start;font-size:1rem;font-weight:300;color:#3C3C43;line-height:1.45}' +
            '.lock-ben li>span{font-size:1.3rem;line-height:1.2;flex:none}' +
            '.lock-ben b{font-weight:600;color:#1D1D1F}' +
            '.lock-box .price b,.lock-card .price b{color:#1D1D1F;font-weight:600}' +
            '.lock-login{display:block;margin-top:10px;font-size:.95rem;color:#3A86FF;text-align:center}' +
            '.lock-first{display:inline-block;margin-top:14px;font-size:.95rem;color:#3A86FF}' +
            '.lock-modal{position:fixed;inset:0;z-index:9999;background:rgba(15,20,35,.55);display:flex;align-items:center;justify-content:center;padding:16px;animation:lockIn .2s ease}' +
            '.lock-card{position:relative;background:#fff;color:#1D1D1F;border-radius:22px;max-width:520px;width:100%;max-height:calc(100vh - 32px);overflow:auto;padding:28px 26px 22px;box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:left}' +
            '.lock-card .lk{font-size:2rem;line-height:1;margin-bottom:10px}' +
            '.lock-card h3{margin:0 0 10px;font-size:1.35rem;font-weight:600;padding-right:28px}' +
            '.lock-card p{margin:0 0 12px;font-size:1.02rem;font-weight:300;color:#3C3C43}' +
            '.lock-card .price{font-size:.92rem;color:#6E6E73;margin-bottom:16px}' +
            '.lock-foot{position:sticky;bottom:-22px;background:#fff;margin:0 -26px;padding:12px 26px 10px;box-shadow:0 -12px 16px -14px rgba(0,0,0,.25)}' +
            '.lock-foot .price{margin-bottom:12px}' +
            '.lock-x{position:absolute;top:10px;right:12px;width:40px;height:40px;border:0;background:transparent;font-size:28px;line-height:1;color:#8E8E93;cursor:pointer;border-radius:50%}' +
            '.lock-x:hover{background:#F2F2F7;color:#1D1D1F}' +
            'html.lock-noscroll,html.lock-noscroll body{overflow:hidden}' +
            '@keyframes lockIn{from{opacity:0}to{opacity:1}}' +
            '@media(max-width:600px){.lock-box{padding:20px 18px}.lock-btns{flex-direction:column}.lock-btn{text-align:center}.lock-modal{align-items:flex-end;padding:0}.lock-card{border-radius:22px 22px 0 0;max-height:92vh;padding:24px 18px 20px}.lock-foot{bottom:-20px;margin:0 -18px;padding:10px 18px 8px}}';
        document.head.appendChild(s);
    }

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    // Что даёт подписка — тем же списком, что в окне оплаты Фреди
    // (fredi/subscription.js, _renderNoSubscription). 09.10.2026: замок
    // показывался 329 раз за неделю, а кнопка у человека без аккаунта вела
    // просто в приложение — без оплаты и без слова о том, что он получит.
    // Там его встречала стена минут, и с лекции не было ни одной покупки.
    var BENEFITS = [
        ['📚', 'Лекторий целиком', 'эта лекция, остальные лекции курса «' + esc(courseName) + '» и закрытые лекции других курсов'],
        ['🎧', 'Озвучка', 'каждую лекцию можно слушать голосом Фреди — в дороге, за рулём, перед сном'],
        ['💬', 'Фреди без счётчика минут', 'текстом и голосом, 24/7: разобрать лекцию на своей ситуации, он помнит каждый разговор'],
        ['🎮', 'Тренажёры и разборы', 'глубинный разбор теста, тренажёры, дневник эмоций, практики']
    ];

    function checkoutUrl(plan) {
        return '/fredi/?checkout=1&plan=' + plan + '&from=lock-' + encodeURIComponent(slug);
    }

    // Адрес лекции для возврата после оплаты: его читает subscription.js.
    function rememberLecture(plan) {
        try { localStorage.setItem('fredi_after_pay', JSON.stringify({ url: location.pathname, t: Date.now() })); } catch (e) {}
        track('lecture_paywall_click', { slug: slug, plan: plan });
    }

    function benefitsHtml() {
        return '<ul class="lock-ben">' + BENEFITS.map(function (b) {
            return '<li><span aria-hidden="true">' + b[0] + '</span><div><b>' + b[1] + '</b> — ' + b[2] + '</div></li>';
        }).join('') + '</ul>';
    }

    var PRICE = '<div class="price"><b>3 дня полного доступа — 69 ₽.</b> Потом 690 ₽ в месяц, отключается в один клик. Первая лекция и страница курса остаются бесплатными.</div>';

    function ctaHtml(reason) {
        return '<div class="lock-btns">' +
            '<a class="lock-btn" data-plan="trial_week" href="' + esc(checkoutUrl('trial_week')) + '">Попробовать 3 дня за 69 ₽ →</a>' +
            '</div>' +
            (reason === 'anon' ? '<a class="lock-login" href="/fredi/?from=lock-' + esc(encodeURIComponent(slug)) + '">Уже есть подписка? Войти в Фреди</a>' : '');
    }

    // Окно поверх лекции: всплывает один раз, когда человек дочитал до
    // замка, — не с порога, когда он ещё не знает, чего лишился.
    var modalShown = false;
    function openModal(reason, how) {
        if (document.getElementById('lockModal')) return;
        var m = document.createElement('div');
        m.id = 'lockModal';
        m.className = 'lock-modal';
        m.setAttribute('role', 'dialog');
        m.setAttribute('aria-modal', 'true');
        m.setAttribute('aria-labelledby', 'lockModalTitle');
        m.innerHTML =
            '<div class="lock-card">' +
            '<button class="lock-x" type="button" aria-label="Закрыть">×</button>' +
            '<div class="lk" aria-hidden="true">🔓</div>' +
            '<h3 id="lockModalTitle">Продолжение курса — в подписке Фреди</h3>' +
            '<p>Первая лекция курса «' + esc(courseName) + '» была бесплатной. Дальше — по подписке, и вот что в неё входит:</p>' +
            benefitsHtml() +
            // Цена и кнопка прибиты к низу окна: на телефоне список длиннее
            // экрана, и кнопка оплаты иначе пряталась под ним.
            '<div class="lock-foot">' + PRICE + ctaHtml(reason) + '</div>' +
            '<a class="lock-first" href="' + esc(first) + '">Вернуться к первой лекции</a>' +
            '</div>';
        document.body.appendChild(m);
        document.documentElement.classList.add('lock-noscroll');
        function close() {
            m.remove();
            document.documentElement.classList.remove('lock-noscroll');
            document.removeEventListener('keydown', onKey);
            track('lecture_paywall_closed', { slug: slug });
        }
        function onKey(e) { if (e.key === 'Escape') close(); }
        m.addEventListener('click', function (e) { if (e.target === m) close(); });
        m.querySelector('.lock-x').addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        // Фокус без прокрутки: иначе на телефоне окно открывалось
        // промотанным к кнопке, и заголовок со списком уходили за край.
        try { m.querySelector('.lock-btn').focus({ preventScroll: true }); } catch (e) {}
        m.querySelector('.lock-card').scrollTop = 0;
        track('lecture_paywall_shown', { slug: slug, reason: reason, how: how });
    }

    function render(reason) {
        css();
        if (reason === 'offline') {
            gate.innerHTML =
                '<div class="lock-box"><div class="lk" aria-hidden="true">🔒</div>' +
                '<h3>Не удалось проверить подписку</h3><p>Сервер Фреди не ответил. Обновите страницу через минуту, лекция откроется, если подписка есть.</p>' +
                '<div class="lock-btns"><a class="lock-btn" href="' + esc(location.href) + '">Обновить страницу →</a></div></div>';
            track('lecture_lock_shown', { slug: slug, reason: reason });
            return;
        }
        gate.innerHTML =
            '<div class="lock-box"><div class="lk" aria-hidden="true">🔒</div>' +
            '<h3>Эта лекция входит в подписку Фреди</h3>' +
            '<p>Первая лекция курса «' + esc(courseName) + '» открыта бесплатно. Остальные идут вместе с подпиской:</p>' +
            benefitsHtml() + PRICE + ctaHtml(reason) +
            '<a class="lock-first" href="' + esc(first) + '">Первая лекция бесплатно</a></div>';
        track('lecture_lock_shown', { slug: slug, reason: reason });

        document.addEventListener('click', function (e) {
            var a = e.target && e.target.closest ? e.target.closest('a.lock-btn[data-plan]') : null;
            if (a) rememberLecture(a.getAttribute('data-plan'));
        }, true);

        var box = gate.querySelector('.lock-box');
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (es) {
                if (es[0].isIntersecting && !modalShown) {
                    modalShown = true;
                    io.disconnect();
                    setTimeout(function () { openModal(reason, 'scroll'); }, 600);
                }
            }, { threshold: 0.3 });
            io.observe(box);
        }
    }

    gate.innerHTML = '<p class="lock-wait">Проверяю подписку…</p>';
    css();
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : null;
    fetch(API + '/api/lektorij/lecture/' + encodeURIComponent(slug) + '?user_id=' + encodeURIComponent(uid()), ctrl ? { signal: ctrl.signal } : {})
        .then(function (r) { if (t) clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (d) {
            if (d && d.open && d.html) {
                var div = document.createElement('div');
                div.className = 'lock-paid';
                div.innerHTML = d.html;
                gate.parentNode.replaceChild(div, gate);
                track('lecture_unlocked', { slug: slug });
                return;
            }
            if (d && d.open && !d.locked) { gate.innerHTML = ''; return; }
            render((d && d.reason) || 'anon');
        })
        .catch(function () { render('offline'); });
})();
