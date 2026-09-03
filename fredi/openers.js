// openers.js — три готовых первых вопроса под знаком вопроса у поля ввода.
//
// Зачем. За неделю 29 человек открыли Фреди и отправили 20 сообщений на
// всех: две трети не написали ни одного. Их встречает пустое поле
// «Напишите, что беспокоит…» — а сформулировать первый вопрос незнакомой
// программе трудно, даже когда есть о чём спросить.
//
// Почти все приходят с лекции Лектория, то есть минуту назад читали
// вполне конкретный текст. По рефереру узнаём курс и показываем три
// вопроса ровно по нему — из блоков «Частые вопросы» его же лекций.
//
// Вопросы свёрнуты под знак вопроса у поля ввода: открытым списком они
// добавляли на первый экран ещё три ярких прямоугольника поверх голосовой
// кнопки, режимов, модулей и быстрых действий. Опора осталась, шум ушёл.
//
// И это примеры, а не кнопки. Кнопка обещает действие и совершает его сама:
// человек нажимает, не дочитав, и уходит в разговор не о том, с чем пришёл.
// Задача проще — показать, какого рода вопросы здесь уместны. Формулировать
// свой он будет сам, и это уже его вопрос, а не наш.
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

    // Посадочные-инструменты: /posle-rasstavaniya/ и такие же. С них
    // приходят не реже, чем с лекций, и приходят на пике — человек только
    // что сам разобрал свою историю. Общие вопросы здесь мимо: тому, кто
    // пять минут разбирал расставание, «как отличить усталость от
    // выгорания» сказать нечего.
    function _landingFor(path) {
        if (!path || !_data || !_data.landings) return null;
        var p = path.replace(/index\.html$/, '');
        if (p.charAt(p.length - 1) !== '/') p += '/';
        return _data.landings[p] ? p : null;
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
            // Строка со знаком вопроса. Прижата вправо и занимает 26 px:
            // человек, который знает, что писать, её просто не замечает.
            '.op-bar{display:flex;justify-content:flex-end;align-items:center;gap:8px}' +
            '.op-ask{width:26px;height:26px;flex:0 0 auto;border-radius:50%;cursor:pointer;' +
            'font-family:inherit;font-size:14px;font-weight:600;line-height:1;color:var(--text-secondary);' +
            'background:transparent;border:1px solid var(--border-color,rgba(128,128,128,.35));' +
            'display:flex;align-items:center;justify-content:center;' +
            'transition:background .18s,border-color .18s,color .18s}' +
            '.op-ask:hover{background:rgba(59,130,255,.12);border-color:rgba(59,130,255,.5);color:var(--text-primary)}' +
            '.op-ask[aria-expanded="true"]{background:rgba(59,130,255,.16);border-color:rgba(59,130,255,.55);color:var(--text-primary)}' +
            '.op-hint{font-size:11px;color:var(--text-secondary);opacity:.75}' +
            '.op-panel{margin-top:8px}' +
            '.op-head{font-size:11px;color:var(--text-secondary);opacity:.8;margin-bottom:7px}' +
            // Список примеров, а не ряд кнопок: ничего не подсвечивается, не
            // наводится и не нажимается — читается и закрывается.
            '.op-list{list-style:none;margin:0;padding:0 0 0 2px;' +
            'display:flex;flex-direction:column;gap:5px}' +
            '.op-list li{position:relative;padding-left:14px;' +
            'font-size:13px;line-height:1.4;color:var(--text-secondary)}' +
            '.op-list li::before{content:"—";position:absolute;left:0;' +
            'color:rgba(59,130,255,.6)}' +
            // Подпись остаётся и на телефоне: одинокий знак вопроса в углу
            // ничего не обещает, и его просто не нажимают. Одиннадцать
            // пикселей серого текста — не тот шум, ради которого всё затевалось.
            '@media(max-width:600px){.op-list li{font-size:12.5px}.op-hint{font-size:10.5px}}';
        document.head.appendChild(st);
    }

    // Раньше три вопроса лежали открытым списком прямо над полем ввода.
    // Вместе с голосовой кнопкой, выбором режима, четырьмя модулями и восемью
    // быстрыми действиями это давало на первом экране полтора десятка ярких
    // мишеней — глазу не за что зацепиться. Теперь подсказки сложены под знак
    // вопроса: кто знает, о чём писать, их не видит, кому нужна опора —
    // раскрывает одним касанием.
    function _render(host, course) {
        _style();
        var wrap = document.createElement('div');
        wrap.className = 'op-wrap';
        wrap.id = 'openersWrap';

        var panel = document.createElement('div');
        panel.className = 'op-panel';
        panel.id = 'openersPanel';
        panel.hidden = true;

        var bar = document.createElement('div');
        bar.className = 'op-bar';

        var hint = document.createElement('span');
        hint.className = 'op-hint';
        hint.textContent = 'не знаете, с чего начать?';
        bar.appendChild(hint);

        var ask = document.createElement('button');
        ask.type = 'button';
        ask.className = 'op-ask';
        ask.id = 'openersAsk';
        ask.textContent = '?';
        ask.setAttribute('aria-expanded', 'false');
        ask.setAttribute('aria-controls', 'openersPanel');
        ask.setAttribute('aria-label', 'О чём можно спросить');
        ask.title = 'О чём можно спросить';
        ask.addEventListener('click', function () {
            var open = panel.hidden;
            panel.hidden = !open;
            ask.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) _track('opener_shown', { course: course.slug || '', kind: course.kind || '', n: course.q.length });
        });
        bar.appendChild(ask);
        wrap.appendChild(bar);

        var head = document.createElement('div');
        head.className = 'op-head';
        // «Читали» — про лекцию, «разбирали» — про посадочную: там человек
        // не читал, а сам жал карточки, и назвать это чтением значит
        // промахнуться мимо того, что он только что делал.
        var verb = course.kind === 'test' ? 'Вы проходили «'
                 : course.kind === 'landing' ? 'Вы разбирали «'
                 : 'Вы читали «';
        head.textContent = course.t ? verb + course.t + '». Можно спросить:'
                                    : 'Можно спросить:';
        panel.appendChild(head);

        // Примеры, а не кнопки. Кнопка обещает действие и сама его совершает —
        // человек нажимает, не дочитав, и уходит в разговор не о том. Здесь
        // задача другая: показать, какого рода вопросы тут уместны, и вернуть
        // человека к своему собственному. Формулировать он будет сам.
        var list = document.createElement('ul');
        list.className = 'op-list';
        course.q.forEach(function (q) {
            var li = document.createElement('li');
            // textContent, а не innerHTML: вопросы приходят из JSON, и
            // подставлять их как разметку незачем.
            li.textContent = q;
            list.appendChild(li);
        });
        panel.appendChild(list);
        wrap.appendChild(panel);

        host.insertBefore(wrap, host.firstChild);
        _shown = true;
        // Раньше это событие означало «человек увидел вопросы». Теперь показ и
        // раскрытие — разные вещи, иначе воронка «увидел → нажал» превратится
        // в неправду: opener_available считает доступность, opener_shown —
        // тех, кто действительно раскрыл список.
        _track('opener_available', { course: course.slug || '', kind: course.kind || '', n: course.q.length });
    }

    function _hide() {
        var w = document.getElementById('openersWrap');
        if (w && w.parentNode) w.parentNode.removeChild(w);
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
        var path = _sourcePath();
        var slug = _courseFor(path);
        var course;
        if (slug) {
            course = { slug: slug, kind: 'course', t: _data.courses[slug].t, q: _data.courses[slug].q };
        } else {
            var lp = _landingFor(path);
            course = lp
                ? { slug: lp, kind: lp.indexOf('/testy/') === 0 ? 'test' : 'landing',
                    t: _data.landings[lp].t, q: _data.landings[lp].q }
                : { slug: '', kind: '', t: '', q: _data.default };
        }
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
