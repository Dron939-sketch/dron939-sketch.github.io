// «Семь дней по теме» — план из лекций Лектория после разговора.
//
// Зачем. На следующий день возвращается 1 % (выгрузка 259 диалогов
// 18–25.09.2026): анониму возвращаться не к чему. План даёт причину на
// каждый день: один шаг на три минуты по его теме, на главной — «день 3
// из 7» с шагом на сегодня и кнопкой «Сделал».
//
// Что здесь. Строка-предложение в чате после ритуала завершения (Фреди
// подвёл итог и позвал продолжить завтра) — не модалка: человек в
// разговоре, и предложение читается как продолжение, а не как турникет.
// Карточка на вкладке «Психолог» главной: день, шаг, лекция, «Сделал».
// Сервер — week_plan_routes.py (Frederick); план живёт в той же таблице,
// что 21-дневный план навыка, поэтому утренний шаг приходит по тому же
// каналу, что и задания навыка.
(function () {
    'use strict';

    var OFFER_KEY = 'fredi_weekplan_offered_at';
    var OFFER_EVERY_MS = 7 * 24 * 60 * 60 * 1000;
    var _state = null;
    var _styled = false;

    function _api() { return window.CONFIG?.API_BASE_URL || window.API_BASE_URL || ''; }
    function _uid() { return window.CONFIG?.USER_ID; }
    function _track(ev, data) { try { window.FrediTracker?.track(ev, data || {}); } catch (e) {} }
    function _tz() {
        try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; }
    }
    function _esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    function _channel() {
        try {
            var ch = localStorage.getItem('fredi_return_channel');
            if (ch === 'telegram') return 'telegram';
        } catch (e) {}
        if (('Notification' in window) && Notification.permission === 'granted') return 'web';
        return undefined;
    }

    function _styles() {
        if (_styled) return;
        _styled = true;
        var s = document.createElement('style');
        s.textContent = [
            '.wk-offer{padding:12px 14px}',
            '.wk-text{font-size:15px;line-height:1.45;margin-bottom:10px}',
            '.wk-btns{display:flex;gap:8px;flex-wrap:wrap}',
            '.wk-btn{border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;border-radius:10px;padding:8px 14px;font-size:14px;cursor:pointer}',
            '.wk-btn.wk-primary{font-weight:600}',
            '.wk-btn.wk-no{font-weight:400;opacity:.7}',
            '.wk-btn[disabled]{opacity:.5;cursor:default}',
            '.wk-day{font-size:13px;opacity:.75;margin-bottom:4px}',
            '.wk-step{font-weight:600;margin-bottom:6px}',
            '.wk-action{font-size:14px;line-height:1.45;margin-bottom:8px;white-space:pre-line}',
            '.wk-lec{font-size:13px;margin-bottom:10px}',
            '.wk-lec a{color:inherit;text-decoration:underline;text-underline-offset:2px}',
            '.wk-done{font-size:13px;opacity:.75}',
            '.dash-cont .wk-card{cursor:default}',
            '.dash-cont .wk-action{margin-top:6px}',
            '.dash-cont .wk-btns{margin-top:8px}'
        ].join('');
        document.head.appendChild(s);
    }

    async function fetchState() {
        var uid = _uid();
        if (!uid) return null;
        try {
            var r = await fetch(_api() + '/api/week-plan/' + encodeURIComponent(uid));
            var d = await r.json();
            _state = (d && d.success && d.active) ? d : { active: false };
        } catch (e) { _state = null; }
        return _state;
    }

    async function start(source, topic) {
        var uid = _uid();
        if (!uid) return { success: false, error: 'no uid' };
        var body = { user_id: uid, tz: _tz(), source: source || '' };
        if (topic) body.topic = topic;
        var ch = _channel();
        if (ch) body.channel = ch;
        try {
            var r = await fetch(_api() + '/api/week-plan/start', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            var d = await r.json();
            if (d && d.success && d.plan) { _state = Object.assign({ active: true }, d.plan); }
            return d || { success: false };
        } catch (e) { return { success: false, error: 'network' }; }
    }

    async function done(day) {
        var uid = _uid();
        if (!uid) return { success: false };
        try {
            var r = await fetch(_api() + '/api/week-plan/' + encodeURIComponent(uid) + '/done', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ day: day })
            });
            var d = await r.json();
            if (d && d.success && d.days_total) { _state = Object.assign({ active: true }, d); }
            return d || { success: false };
        } catch (e) { return { success: false, error: 'network' }; }
    }

    function _lecHtml(today) {
        if (!today || !today.lecture_url) return '';
        return '<div class="wk-lec">Лекция к шагу: <a href="' + _esc(today.lecture_url) + '" target="_blank" rel="noopener">«'
            + _esc(today.lecture_title || 'открыть') + '»</a></div>';
    }

    function _stepHtml(view, withDone) {
        var t = view.today || {};
        var isDone = (view.done_days || []).indexOf(view.day) >= 0;
        var html = '<div class="wk-day">День ' + view.day + ' из ' + view.days_total + ' · ' + _esc(view.title) + '</div>'
            + '<div class="wk-step">' + _esc(t.title) + '</div>'
            + '<div class="wk-action">' + _esc(t.action) + '</div>'
            + _lecHtml(t);
        if (withDone) {
            html += isDone
                ? '<div class="wk-done">Сделано. Завтра — следующий шаг.</div>'
                : '<div class="wk-btns"><button type="button" class="wk-btn wk-primary" data-wk-done="' + view.day + '">Сделал</button></div>';
        }
        return html;
    }

    function _wireDone(root, after) {
        var b = root.querySelector('[data-wk-done]');
        if (!b) return;
        b.addEventListener('click', async function (e) {
            e.stopPropagation();
            b.disabled = true;
            var day = parseInt(b.getAttribute('data-wk-done'), 10);
            var d = await done(day);
            _track(d && d.success ? 'week_plan_day_done' : 'week_plan_day_done_failed', { day: day });
            if (after) after(d);
        });
        root.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function (e) { e.stopPropagation(); _track('week_plan_lecture_click', { day: _state && _state.day }); });
        });
    }

    // Строка в чате: «Собрать план на неделю?» Не чаще раза в семь дней и
    // не тому, у кого план уже идёт.
    function offer(source) {
        try {
            var uid = _uid();
            if (!uid) return;
            if (_state && _state.active) return;
            try {
                var last = parseInt(localStorage.getItem(OFFER_KEY) || '0', 10);
                if (last && (Date.now() - last) < OFFER_EVERY_MS) return;
            } catch (e) {}
            var box = document.getElementById('dashChatStream');
            var inner = box && box.querySelector('.chat-messages');
            if (!inner || document.getElementById('wkOffer')) return;
            _styles();
            try { localStorage.setItem(OFFER_KEY, String(Date.now())); } catch (e) {}
            var el = document.createElement('div');
            el.id = 'wkOffer';
            el.className = 'message bot wk-offer';
            el.innerHTML =
                '<div class="wk-text">Хотите, соберу на эту неделю семь шагов по вашей теме? По три минуты в день, из лекций Лектория. Каждый день — один шаг, на главной будет видно, какой сегодня.</div>' +
                '<div class="wk-btns">' +
                    '<button type="button" class="wk-btn wk-primary" data-wk="yes">Собрать план</button>' +
                    '<button type="button" class="wk-btn wk-no" data-wk="no">Не сейчас</button>' +
                '</div>';
            inner.appendChild(el);
            try { box.scrollTop = box.scrollHeight; } catch (e) {}
            _track('week_plan_offer_shown', { source: source || '' });
            el.querySelector('[data-wk="no"]').addEventListener('click', function () {
                _track('week_plan_offer_declined', { source: source || '' });
                try { el.remove(); } catch (e) {}
            });
            el.querySelector('[data-wk="yes"]').addEventListener('click', async function () {
                var text = el.querySelector('.wk-text');
                var btns = el.querySelector('.wk-btns');
                el.querySelectorAll('.wk-btn').forEach(function (b) { b.disabled = true; });
                if (text) text.textContent = 'Собираю план по вашей теме, полминуты…';
                _track('week_plan_offer_accepted', { source: source || '' });
                var d = await start(source);
                if (d && d.success && d.plan) {
                    var v = Object.assign({ active: true }, d.plan);
                    var tail = d.plan.channel
                        ? 'Завтра утром пришлю второй шаг.'
                        : 'Следующие шаги — на главной, по одному в день.';
                    if (btns) btns.remove();
                    if (text) text.textContent = (d.existing ? 'План уже идёт. ' : 'Готово. ') + tail;
                    var card = document.createElement('div');
                    card.className = 'wk-card';
                    card.innerHTML = _stepHtml(v, true);
                    el.appendChild(card);
                    _wireDone(card, function () { card.innerHTML = _stepHtml(_state || v, true); _wireDone(card); refreshCard(); });
                    try { box.scrollTop = box.scrollHeight; } catch (e) {}
                    _track('week_plan_started', { source: source || '', existing: !!d.existing });
                    refreshCard();
                } else {
                    var err = (d && d.error) || 'unknown';
                    if (text) text.textContent = err === 'active_skill_exists'
                        ? 'У вас уже идёт программа навыка — один план за раз. Закончите её, и соберём неделю по теме.'
                        : 'Не получилось собрать план. Попробуем в другой раз.';
                    if (btns) btns.remove();
                    _track('week_plan_start_failed', { source: source || '', error: err });
                }
            });
        } catch (e) {}
    }

    function _cardHtml(view) {
        var done = (view.done_days || []).length;
        var pct = Math.min(100, Math.round(100 * done / (view.days_total || 7)));
        if (view.finished) {
            return '<div class="dash-cont-h">Семь дней по теме</div>'
                + '<div class="wk-card"><div class="wk-step">Неделя пройдена: ' + _esc(view.title) + '</div>'
                + '<div class="wk-action">Семь шагов сделаны. Расскажите Фреди, что изменилось, — и решим, что дальше.</div>'
                + '<div class="wk-lec"><a href="' + _esc(view.course_url) + '" target="_blank" rel="noopener">Курс целиком: «' + _esc(view.course_title) + '»</a></div></div>';
        }
        return '<div class="dash-cont-h">Семь дней по теме</div>'
            + '<div class="wk-card">' + _stepHtml(view, true) + '</div>'
            + '<div class="dash-cont-bar"><span style="width:' + pct + '%"></span></div>';
    }

    // Карточка на главной, вкладка «Психолог». Пусто — блок не трогаем:
    // там может стоять чужая карточка «вы на этом остановились».
    async function refreshCard() {
        var box = document.querySelector('.dash-cont[data-cont="psychologist"]');
        if (!box) return;
        var v = await fetchState();
        if (!v || !v.active) return;
        _styles();
        box.innerHTML = _cardHtml(v);
        box.hidden = false;
        box.dataset.wk = '1';
        _wireDone(box, function () { refreshCard(); });
        _track('week_plan_card_shown', { day: v.day, done: (v.done_days || []).length });
    }

    window.FrediWeekPlan = { offer: offer, refreshCard: refreshCard, start: start, fetchState: fetchState };

    // Главная могла нарисоваться раньше, чем этот файл загрузился.
    setTimeout(function () { try { refreshCard(); } catch (e) {} }, 1500);
})();
