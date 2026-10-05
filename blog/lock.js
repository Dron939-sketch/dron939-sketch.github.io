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
            '@media(max-width:600px){.lock-box{padding:20px 18px}.lock-btns{flex-direction:column}.lock-btn{text-align:center}}';
        document.head.appendChild(s);
    }

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function render(reason) {
        css();
        var to = '/fredi/?from=lock-' + encodeURIComponent(slug) + (reason === 'nosub' ? '&checkout=1' : '');
        var title, text, btn;
        if (reason === 'offline') {
            title = 'Не удалось проверить подписку';
            text = 'Сервер Фреди не ответил. Обновите страницу через минуту, лекция откроется, если подписка есть.';
            btn = 'Обновить страницу';
            to = location.href;
        } else if (reason === 'nosub') {
            title = 'Эта лекция входит в подписку Фреди';
            text = 'Первая лекция курса «' + esc(courseName) + '» открыта бесплатно, остальные девять идут вместе с подпиской: разговор с Фреди по этому курсу, тренажёры и озвучка всех лекций голосом Фреди.';
            btn = 'Оформить подписку';
        } else {
            title = 'Эта лекция входит в подписку Фреди';
            text = 'Первая лекция курса «' + esc(courseName) + '» открыта бесплатно, остальные девять идут вместе с подпиской. Если подписка уже есть, войдите в Фреди на этом устройстве, и лекция откроется сама.';
            btn = 'Войти или оформить подписку';
        }
        gate.innerHTML =
            '<div class="lock-box"><div class="lk" aria-hidden="true">🔒</div>' +
            '<h3>' + title + '</h3><p>' + text + '</p>' +
            (reason === 'offline' ? '' : '<div class="price">Первые три дня 69 ₽, потом 690 ₽ в месяц, отключается в один клик. Первая лекция и страница курса остаются бесплатными.</div>') +
            '<div class="lock-btns"><a class="lock-btn" href="' + esc(to) + '">' + btn + ' →</a>' +
            '<a class="lock-btn ghost" href="' + esc(first) + '">Первая лекция бесплатно</a></div></div>';
        track('lecture_lock_shown', { slug: slug, reason: reason });
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
