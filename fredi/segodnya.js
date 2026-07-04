// ============================================
// segodnya.js — виджет «Сегодня» на дашборде
// Стрик активности + один рекомендованный шаг.
// Цель: причина вернуться завтра и понятный
// первый клик сегодня. Всё хранится локально.
// ============================================
(function () {
    'use strict';

    var LS_KEY = 'fredi_today_v1';
    var MAX_DAYS = 90; // храним не больше 90 дат

    // Каталог игр для рекомендаций: key совпадает с ROUTES и feature
    // в game_round_finish, fn/src — как в deep-link-роутере app.js.
    var GAMES = [
        { key: 'chuvstva', fn: 'showChuvstvaGame', src: 'chuvstva.js', emoji: '🌊', name: 'Чувства', why: 'научиться называть эмоцию точно', mins: '3–5 мин' },
        { key: 'fokus', fn: 'showFokusGame', src: 'fnback.js', emoji: '🎯', name: 'Фокус', why: 'прокачать рабочую память', mins: '3 мин' },
        { key: 'mysl', fn: 'showMyslGame', src: 'mysl.js', emoji: '🔍', name: 'Мысль под допросом', why: 'поймать искажение в своих мыслях', mins: '5 мин' },
        { key: 'oshibka', fn: 'showOshibkaGame', src: 'oshibka.js', emoji: '🕵️', name: 'Лови ошибку', why: 'включить критическое мышление', mins: '4 мин' },
        { key: 'skazhinet', fn: 'showSkazhiNetGame', src: 'skazhinet.js', emoji: '🛡️', name: 'Скажи «нет»', why: 'потренировать границы без чувства вины', mins: '5–7 мин' },
        { key: 'schet', fn: 'showSchetGame', src: 'schet.js', emoji: '🔢', name: 'Устный счёт', why: 'разогнать голову с утра', mins: '3 мин' },
        { key: 'kalibr', fn: 'showKalibrGame', src: 'kalibr.js', emoji: '⚖️', name: 'Калибровка', why: 'проверить, насколько вы уверены зря', mins: '4 мин' },
        { key: 'mnemo', fn: 'showMnemoGame', src: 'mnemo.js', emoji: '🧠', name: 'Мнемо', why: 'потренировать память', mins: '4 мин' },
        { key: 'danetki', fn: 'showDanetkiGame', src: 'danetki.js', emoji: '❓', name: 'Данетки', why: 'задавать сильные вопросы', mins: '5 мин' },
        { key: 'advokat', fn: 'showAdvokatGame', src: 'advokat.js', emoji: '😈', name: 'Адвокат дьявола', why: 'увидеть чужую точку зрения', mins: '5 мин' },
        { key: 'fermi', fn: 'showFermiGame', src: 'fermi.js', emoji: '📏', name: 'Прикидка', why: 'оценивать на глаз без паники', mins: '4 мин' },
        { key: 'dvapotoka', fn: 'showDvaPotokaGame', src: 'dvapotoka.js', emoji: '🌀', name: 'Два потока', why: 'удерживать два дела сразу', mins: '3 мин' }
    ];

    function _load() {
        try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
    }
    function _save(st) {
        try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {}
    }
    // Локальная дата YYYY-MM-DD (не UTC — стрик должен жить по времени юзера)
    function _dayISO(d) {
        d = d || new Date();
        var m = d.getMonth() + 1, day = d.getDate();
        return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    }
    function _track(ev, data) {
        try { if (window.FrediTracker) window.FrediTracker.track(ev, data || {}); } catch (e) {}
    }

    var ST = _load();
    if (!Array.isArray(ST.days)) ST.days = [];
    if (typeof ST.games !== 'number') ST.games = 0;
    if (typeof ST.msgs !== 'number') ST.msgs = 0;

    function _markToday() {
        var t = _dayISO();
        if (ST.days[ST.days.length - 1] !== t) {
            ST.days.push(t);
            if (ST.days.length > MAX_DAYS) ST.days = ST.days.slice(-MAX_DAYS);
            _save(ST);
        }
    }

    // Стрик: сколько дней подряд, заканчивая сегодняшним
    function _streak() {
        var n = 0;
        var seen = {};
        for (var i = 0; i < ST.days.length; i++) seen[ST.days[i]] = true;
        var d = new Date();
        while (seen[_dayISO(d)]) { n++; d.setDate(d.getDate() - 1); }
        return n;
    }

    // ---- Счётчики через обёртку над FrediTracker.track ----
    function _onEvent(event, data) {
        if (event === 'message_sent') { ST.msgs++; _markToday(); _save(ST); _refreshStrip(); }
        else if (event === 'game_round_finish') {
            ST.games++;
            ST.lastGame = (data && data.feature) || ST.lastGame;
            ST.lastGameDay = _dayISO();
            _markToday(); _save(ST); _refreshStrip();
        }
    }
    function _hookTracker() {
        var ft = window.FrediTracker;
        if (!ft || ft.__todayHooked || typeof ft.track !== 'function') return !!(ft && ft.__todayHooked);
        var orig = ft.track;
        ft.track = function (event, data) {
            try { _onEvent(event, data); } catch (e) {}
            return orig.apply(this, arguments);
        };
        ft.__todayHooked = true;
        return true;
    }

    // ---- Выбор рекомендации ----
    function _gameByKey(k) {
        for (var i = 0; i < GAMES.length; i++) if (GAMES[i].key === k) return GAMES[i];
        return null;
    }
    function _pick() {
        var today = _dayISO();
        var playedToday = ST.lastGameDay === today;

        // План на сегодня выполнен — хвалим и предлагаем ещё
        if (playedToday) {
            var other = _gameOfDay(ST.lastGame);
            return { kind: 'done', game: other };
        }
        // Есть незаконченная привычка — продолжить вчерашнюю игру
        var last = _gameByKey(ST.lastGame);
        if (last) return { kind: 'continue', game: last };
        // Иначе — игра дня по ротации
        return { kind: 'game_of_day', game: _gameOfDay(null) };
    }
    function _gameOfDay(excludeKey) {
        var pool = [];
        for (var i = 0; i < GAMES.length; i++) if (GAMES[i].key !== excludeKey) pool.push(GAMES[i]);
        // Детерминированная ротация по дню года — у всех юзеров своя,
        // потому что сдвигаем на "возраст" аккаунта (первый день в days)
        var d = new Date();
        var start = new Date(d.getFullYear(), 0, 0);
        var doy = Math.floor((d - start) / 86400000);
        var shift = ST.days.length ? ST.days[0].charCodeAt(9) : 0;
        return pool[(doy + shift) % pool.length];
    }

    function _openGame(g, kind) {
        _track('today_cta_click', { kind: kind, target: g.key, streak: _streak() });
        try {
            if (typeof window[g.fn] === 'function') { window[g.fn](); return; }
            var s = document.createElement('script');
            s.src = g.src;
            s.onload = function () { if (typeof window[g.fn] === 'function') window[g.fn](); };
            document.head.appendChild(s);
        } catch (e) {
            try { location.href = '/fredi/?m=' + g.key; } catch (e2) {}
        }
    }

    // ---- Рендер ----
    function _injectCSS() {
        if (document.getElementById('today-v1-styles')) return;
        var s = document.createElement('style');
        s.id = 'today-v1-styles';
        s.textContent = ''
            + '.today-card{background:linear-gradient(135deg,rgba(59,130,255,0.10),rgba(59,130,255,0.03));border:1px solid rgba(59,130,255,0.28);border-radius:16px;padding:14px 16px;margin:0 0 18px}'
            + '.today-streak{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:12px;color:var(--text-secondary);margin-bottom:10px}'
            + '.today-streak b{color:var(--text-primary);font-size:13px}'
            + '.today-streak .ts-chip{white-space:nowrap}'
            + '.today-main{display:flex;align-items:center;gap:12px}'
            + '.today-emoji{font-size:30px;flex-shrink:0;line-height:1}'
            + '.today-txt{flex:1;min-width:0}'
            + '.today-label{font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#5B9BFF;margin-bottom:3px}'
            + '.today-title{font-size:13px;font-weight:600;color:var(--text-primary);line-height:1.45}'
            + '.today-title .t-dim{color:var(--text-secondary);font-weight:400}'
            + '.today-btn{flex-shrink:0;background:linear-gradient(135deg,#00A8E8,#3A86FF);color:#fff;border:none;border-radius:12px;padding:10px 16px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap;transition:transform .15s}'
            + '.today-btn:active{transform:scale(0.96)}'
            + '[data-theme="light"] .today-card{background:linear-gradient(135deg,rgba(58,134,255,0.08),rgba(58,134,255,0.02));border-color:rgba(58,134,255,0.35)}'
            + '[data-theme="light"] .today-label{color:#2563EB}'
            + '@media (max-width:480px){.today-main{flex-wrap:wrap}.today-btn{width:100%}}';
        document.head.appendChild(s);
    }

    function _streakHtml() {
        var n = _streak();
        var fire = n >= 2 ? '🔥' : '🌱';
        var word = (n % 10 === 1 && n % 100 !== 11) ? 'день'
            : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 'дня' : 'дней';
        var parts = [];
        parts.push('<span class="ts-chip">' + fire + ' <b>' + n + '</b> ' + word + (n >= 2 ? ' подряд' : ' с Фреди — хорошее начало') + '</span>');
        if (ST.games > 0) parts.push('<span class="ts-chip">🎮 <b>' + ST.games + '</b> ' + _plural(ST.games, 'игра', 'игры', 'игр') + '</span>');
        if (ST.msgs > 0) parts.push('<span class="ts-chip">💬 <b>' + ST.msgs + '</b> ' + _plural(ST.msgs, 'сообщение', 'сообщения', 'сообщений') + '</span>');
        return parts.join('');
    }
    function _plural(n, one, few, many) {
        if (n % 10 === 1 && n % 100 !== 11) return one;
        if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return few;
        return many;
    }

    function _refreshStrip() {
        var el = document.getElementById('todayStreak');
        if (el) el.innerHTML = _streakHtml();
    }

    function mount() {
        var mountEl = document.getElementById('todayMount');
        if (!mountEl) return;
        _hookTracker();
        _markToday();
        _injectCSS();

        var rec = _pick();
        var g = rec.game;
        var label, title, btn;
        if (rec.kind === 'done') {
            label = 'План на сегодня выполнен';
            title = 'Стрик продлён! <span class="t-dim">Есть силы на ещё одну?</span> ' + g.emoji + ' «' + g.name + '»';
            btn = 'Ещё раунд';
        } else if (rec.kind === 'continue') {
            label = 'Минутка на сегодня';
            title = g.emoji + ' Продолжить тренировку: «' + g.name + '» <span class="t-dim">— ' + g.why + ' (' + g.mins + ')</span>';
            btn = 'Продолжить';
        } else {
            label = 'Минутка на сегодня';
            title = g.emoji + ' Игра дня: «' + g.name + '» <span class="t-dim">— ' + g.why + ' (' + g.mins + ')</span>';
            btn = 'Начать';
        }

        mountEl.innerHTML = ''
            + '<div class="today-card">'
            + '  <div class="today-streak" id="todayStreak">' + _streakHtml() + '</div>'
            + '  <div class="today-main">'
            + '    <div class="today-txt">'
            + '      <div class="today-label">' + label + '</div>'
            + '      <div class="today-title">' + title + '</div>'
            + '    </div>'
            + '    <button class="today-btn" id="todayCta">' + btn + '</button>'
            + '  </div>'
            + '</div>';

        var cta = document.getElementById('todayCta');
        if (cta) cta.addEventListener('click', function () { _openGame(g, rec.kind); });

        _track('today_shown', { kind: rec.kind, target: g.key, streak: _streak() });
    }

    // Если tracker.js загрузился позже — доцепляем обёртку с ретраем
    var tries = 0;
    var iv = setInterval(function () {
        if (_hookTracker() || ++tries > 20) clearInterval(iv);
    }, 500);

    window.FrediToday = { mount: mount, getState: function () { return ST; } };
})();
