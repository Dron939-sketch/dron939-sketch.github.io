// openers.js — три готовых первых вопроса над полем ввода.
//
// Зачем. За неделю 29 человек открыли Фреди и отправили 20 сообщений на
// всех: две трети не написали ни одного. Их встречает пустое поле
// «Напишите, что беспокоит…» — а сформулировать первый вопрос незнакомой
// программе трудно, даже когда есть о чём спросить.
//
// Почти все приходят с лекции Лектория, то есть минуту назад читали
// вполне конкретный текст. По рефереру узнаём курс и предлагаем три
// вопроса ровно по нему — из блоков «Частые вопросы» его же лекций.
// Первое сообщение стоит одного касания.
//
// Данные: openers.json, собирается tools/build_chat_openers.py.
// Ничего не показываем, если разговор уже начат: подсказка нужна тому,
// кто ещё не сказал ни слова.

(function () {
    'use strict';

    var SRC = '/fredi/openers.json';
    var _data = null;
    var _shown = false;

    function _track(ev, data) {
        try {
            if (window.FrediTracker && window.FrediTracker.track)
                window.FrediTracker.track(ev, data || {});
        } catch (e) {}
    }

    // ---- откуда пришёл человек ----------------------------------------

    // ?from=<слаг> — явное указание, если ссылку когда-нибудь захотят
    // размечать руками. Иначе смотрим реферер, но только свой:
    // с поисковика или из мессенджера темы не выведешь.
    function _sourcePath() {
        var from = '';
        try { from = new URLSearchParams(location.search).get('from') || ''; }
        catch (e) {
            var m = (location.search || '').match(/[?&]from=([^&]+)/);
            from = m ? decodeURIComponent(m[1]) : '';
        }
        if (from) return from;
        var ref = document.referrer || '';
        if (!ref) return '';
        try {
            var u = new URL(ref, location.href);
            if (u.host !== location.host && !/(^|\.)meysternlp\.ru$/i.test(u.host)) return '';
            return u.pathname;
        } catch (e) { return ''; }
    }

    // /blog/lektorij/kak-dumat/            → kak-dumat
    // /blog/lekciya-dumat-3-vopros.html    → префикс dumat → kak-dumat
    function _courseFor(path) {
        if (!path || !_data) return null;
        var m = path.match(/\/blog\/lektorij\/([a-z0-9-]+)\/?$/);
        if (m && _data.courses[m[1]]) return m[1];
        m = path.match(/\/blog\/lekciya-([a-z0-9]+)-\d+/);
        if (m) {
            var slug = _data.prefixes[m[1]];
            if (slug && _data.courses[slug]) return slug;
        }
        return null;
    }

    // ---- разметка -------------------------------------------------------

    function _style() {
        if (document.getElementById('openersStyle')) return;
        var st = document.createElement('style');
        st.id = 'openersStyle';
        // Цвета — через переменные темы плюс полупрозрачный акцент:
        // читается и на тёмной, и на светлой.
        st.textContent =
            '.op-wrap{margin:0 0 10px}' +
            '.op-head{font-size:11px;color:var(--text-secondary);opacity:.8;margin-bottom:7px}' +
            '.op-list{display:flex;flex-direction:column;gap:6px}' +
            '.op-chip{display:block;width:100%;text-align:left;cursor:pointer;' +
            'font-family:inherit;font-size:13px;line-height:1.35;color:var(--text-primary);' +
            'background:rgba(59,130,255,.10);border:1px solid rgba(59,130,255,.30);' +
            'border-radius:14px;padding:10px 13px;transition:background .18s,border-color .18s}' +
            '.op-chip:hover{background:rgba(59,130,255,.18);border-color:rgba(59,130,255,.5)}' +
            '.op-chip:active{transform:scale(.99)}' +
            '@media(max-width:600px){.op-chip{font-size:12.5px;padding:9px 12px}}';
        document.head.appendChild(st);
    }

    function _render(host, course) {
        _style();
        var wrap = document.createElement('div');
        wrap.className = 'op-wrap';
        wrap.id = 'openersWrap';

        var head = document.createElement('div');
        head.className = 'op-head';
        head.textContent = course.t
            ? 'Вы читали «' + course.t + '». Можно спросить:'
            : 'Можно спросить:';
        wrap.appendChild(head);

        var list = document.createElement('div');
        list.className = 'op-list';
        course.q.forEach(function (q, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'op-chip';
            // textContent, а не innerHTML: вопросы приходят из JSON, и
            // подставлять их как разметку незачем.
            b.textContent = q;
            b.addEventListener('click', function () {
                _track('opener_clicked', { course: course.slug || '', n: i + 1 });
                _send(q);
            });
            list.appendChild(b);
        });
        wrap.appendChild(list);
        host.insertBefore(wrap, host.firstChild);
        _shown = true;
        _track('opener_shown', { course: course.slug || '', n: course.q.length });
    }

    function _hide() {
        var w = document.getElementById('openersWrap');
        if (w && w.parentNode) w.parentNode.removeChild(w);
    }

    // Кладём текст в поле и жмём «отправить» — тем же путём, что и руками
    // набранное сообщение. Свой запрос слать нельзя: в submit висит
    // проверка лимита и вся обработка ответа.
    function _send(text) {
        var input = document.getElementById('dashComposerInput');
        var form = document.getElementById('dashComposerForm');
        if (!input || !form) return;
        input.value = text;
        _hide();
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }

    // ---- запуск ---------------------------------------------------------

    function _chatEmpty() {
        var s = document.getElementById('dashChatStream');
        return !s || !s.querySelector('.message');
    }

    function _try() {
        if (_shown) return true;
        var host = document.querySelector('.dash-composer');
        if (!host || !document.getElementById('dashComposerForm')) return false;
        if (!_chatEmpty()) return true;   // разговор уже идёт — не мешаем
        var slug = _courseFor(_sourcePath());
        var course = slug
            ? { slug: slug, t: _data.courses[slug].t, q: _data.courses[slug].q }
            : { slug: '', t: '', q: _data.default };
        if (!course.q || !course.q.length) return true;
        _render(host, course);
        return true;
    }

    function _start() {
        // Дашборд рисуется не сразу и может перерисоваться — ждём поле.
        var tries = 0;
        var iv = setInterval(function () {
            if (_try() || ++tries > 40) clearInterval(iv);
        }, 300);
        // Написал сам — подсказки больше не нужны.
        window.addEventListener('fredi:track', function (e) {
            var ev = e && e.detail && e.detail.event;
            if (ev === 'message_sent') _hide();
        });
    }

    function init() {
        fetch(SRC, { cache: 'force-cache' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                if (!d || !d.courses) return;
                _data = d;
                _start();
            })
            .catch(function () {});
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', init);
    else init();
})();
