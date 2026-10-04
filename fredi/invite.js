// invite.js — приглашение второго человека в разговор.
//
// 04.10.2026, решение владельца: «на разговор с психологом могут
// рекомендовать, как в семейной терапии, когда нужны все члены семьи».
// Семейный терапевт не просит «порекомендуйте меня» — он говорит «на
// следующую встречу приходите с мужем». Это рекомендация, которую
// человек выполняет сам, потому что она про его проблему.
//
// Две половины:
//  1. Приглашающий. Фреди (бэкенд, modes/prompts/invite.py) не раньше
//     шестой реплики может предложить, чтобы близкий тоже поговорил с
//     ним — отдельно и анонимно. Если человек согласился, в конце ответа
//     стоит служебная метка [[INVITE:кто]]. app.js отдаёт ответ сюда:
//     метка снимается с экрана, создаётся ссылка (/api/invite/create) и
//     под ответом появляется карточка с кнопками «Отправить» и
//     «Скопировать». Одна ссылка за сессию: вторая метка игнорируется.
//  2. Приглашённый. Приходит по /fredi/?invite=<token>. Над полем ввода —
//     строка: кто пригласил и что разговор отдельный. Первое своё
//     сообщение он пишет сам (как и тот, кто пришёл из статьи: своя
//     первая реплика продолжается в 56 % против 12 % у автоотправки);
//     к нему дописывается строка про приглашение — так Фреди знает
//     контекст, бэкенд отдельного поля для источника не принимает.
//     Ни одно слово первого разговора второму не передаётся.
//
// Учёт: события invite_card_shown / invite_shared / invite_copied /
// invite_opened / invite_first_message, плюс localStorage fredi_invited,
// который tracker.js кладёт в data каждого события (invited:1), чтобы
// /api/analytics/daily?by=invited делил воронку приглашённых.
(function () {
    'use strict';

    var INVITE_KEY = 'fredi_invite_ctx';      // sessionStorage: {token, relation}
    var INVITED_FLAG = 'fredi_invited';       // localStorage: '1' — пришёл по приглашению
    var SENT_KEY = 'fredi_invite_sent';       // sessionStorage: ссылка уже выдана
    var MARK_RX = /\s*\[\[\s*INVITE\s*:\s*([^\]\n]{1,20}?)\s*\]\]\s*/i;
    var _submitWired = false;

    function _api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || ''; }
    function _uid() { return (window.CONFIG && window.CONFIG.USER_ID) || 0; }
    function _track(ev, data) {
        try { if (window.FrediTracker && window.FrediTracker.track) window.FrediTracker.track(ev, data || {}); } catch (e) {}
    }
    function _esc(s) {
        return String(s || '').replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    // «муж» → «для мужа» не строим: склонять двадцать слов руками — верный
    // способ получить «для мамы» и «для сын». Говорим «для него / для неё»
    // по роду слова, остальное — само слово в именительном.
    function _forWhom(rel) {
        var r = String(rel || '').toLowerCase();
        if (/^(жена|дочь|мама|мать|сестра|девушка|подруга|бабушка|партнёрша)$/.test(r)) return 'для неё';
        if (/^(муж|сын|папа|отец|брат|парень|друг|дедушка|партнёр)$/.test(r)) return 'для него';
        return 'для близкого человека';
    }

    // ---- 1. Приглашающий: метка в ответе → карточка со ссылкой --------

    // Снимает метку с текста ответа (для экрана); если метка была и ссылка
    // ещё не выдавалась — создаёт её и рисует карточку. Возвращает чистый
    // текст. app.js зовёт это и для потока, и для обычного ответа.
    function handleAnswer(answer, bubbleEl) {
        var m = MARK_RX.exec(answer || '');
        if (!m) return answer;
        var clean = (answer || '').replace(MARK_RX, ' ').trim();
        try {
            if (bubbleEl) {
                var span = bubbleEl.querySelector('div') || bubbleEl;
                span.textContent = clean;
            }
        } catch (e) {}
        var relation = (m[1] || '').trim();
        var already = false;
        try { already = sessionStorage.getItem(SENT_KEY) === '1'; } catch (e) {}
        if (!already) _createAndShow(relation, bubbleEl);
        return clean;
    }

    function _createAndShow(relation, afterEl) {
        var uid = _uid();
        if (!uid) return;
        fetch(_api() + '/api/invite/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid, relation: relation })
        }).then(function (r) { return r.json(); }).then(function (d) {
            if (!d || !d.success || !d.url) { _track('invite_create_failed', { relation: relation, error: d && d.error }); return; }
            try { sessionStorage.setItem(SENT_KEY, '1'); } catch (e) {}
            _renderCard(d.url, d.relation || relation, afterEl);
        }).catch(function () { _track('invite_create_failed', { relation: relation, error: 'network' }); });
    }

    function _renderCard(url, relation, afterEl) {
        if (document.getElementById('frediInviteCard')) return;
        var card = document.createElement('div');
        card.id = 'frediInviteCard';
        card.className = 'invite-card';
        card.innerHTML =
            '<div class="invite-card-t">Ссылка ' + _esc(_forWhom(relation)) + '</div>' +
            '<div class="invite-card-d">Отдельный разговор с Фреди, двадцать минут бесплатно, без регистрации. ' +
                'Ваших слов там не будет, и вы не увидите его слов.</div>' +
            '<div class="invite-card-url" id="frediInviteUrl">' + _esc(url) + '</div>' +
            '<div class="invite-card-btns">' +
                '<button type="button" class="invite-btn invite-btn--main" data-act="share">Отправить</button>' +
                '<button type="button" class="invite-btn" data-act="copy">Скопировать</button>' +
            '</div>' +
            '<div class="invite-card-ok" id="frediInviteOk" hidden>Скопировано</div>';
        var host = null;
        try { host = afterEl && afterEl.parentNode ? afterEl : null; } catch (e) {}
        if (host) host.parentNode.insertBefore(card, host.nextSibling);
        else {
            var stream = document.querySelector('#dashChatStream .chat-messages') || document.getElementById('dashChatStream');
            if (stream) stream.appendChild(card); else document.body.appendChild(card);
        }
        try { card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
        _track('invite_card_shown', { relation: relation });

        var text = 'Поговори с Фреди, это психолог по методу Андрея Мейстера. Разговор отдельный и анонимный, двадцать минут бесплатно: ' + url;
        card.querySelector('[data-act="share"]').addEventListener('click', function () {
            if (navigator.share) {
                navigator.share({ text: text }).then(function () {
                    _track('invite_shared', { relation: relation, via: 'share' });
                }).catch(function () { _copy(url, relation); });
            } else {
                _copy(url, relation);
            }
        });
        card.querySelector('[data-act="copy"]').addEventListener('click', function () { _copy(url, relation); });
    }

    function _copy(url, relation) {
        var done = function () {
            var ok = document.getElementById('frediInviteOk');
            if (ok) { ok.hidden = false; setTimeout(function () { ok.hidden = true; }, 2500); }
            _track('invite_copied', { relation: relation });
        };
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(done).catch(function () { _selectUrl(); done(); });
                return;
            }
        } catch (e) {}
        _selectUrl(); done();
    }

    function _selectUrl() {
        try {
            var el = document.getElementById('frediInviteUrl');
            var range = document.createRange(); range.selectNodeContents(el);
            var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
            document.execCommand('copy');
        } catch (e) {}
    }

    // ---- 2. Приглашённый: ?invite=<token> → подсказка и контекст --------

    function _readCtx() {
        try { return JSON.parse(sessionStorage.getItem(INVITE_KEY) || 'null'); } catch (e) { return null; }
    }

    function _fromUrl() {
        var token = '';
        try { token = new URLSearchParams(location.search).get('invite') || ''; } catch (e) {}
        if (!token || !/^[A-Za-z0-9_-]{8,32}$/.test(token)) return;
        // Адрес чистим сразу: перезагрузка не должна считаться вторым заходом.
        try {
            var u = new URL(location.href); u.searchParams.delete('invite');
            history.replaceState(null, '', u.pathname + (u.search || '') + (u.hash || ''));
        } catch (e) {}
        fetch(_api() + '/api/invite/' + encodeURIComponent(token))
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d || !d.ok) { _track('invite_invalid', {}); return; }
                var ctx = { token: token, relation: d.relation || 'близкий' };
                try { sessionStorage.setItem(INVITE_KEY, JSON.stringify(ctx)); } catch (e) {}
                try { localStorage.setItem(INVITED_FLAG, '1'); } catch (e) {}
                _track('invite_opened', { relation: ctx.relation });
                _accept(ctx);
                _showHint(ctx);
            }).catch(function () {});
    }

    function _accept(ctx) {
        var go = function () {
            var uid = _uid();
            if (!uid) return;
            fetch(_api() + '/api/invite/' + encodeURIComponent(ctx.token) + '/accept', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: uid })
            }).catch(function () {});
        };
        if (window.identityReady) { try { window.identityReady().then(go).catch(go); return; } catch (e) {} }
        setTimeout(go, 1500);
    }

    function _showHint(ctx) {
        var tries = 0;
        var iv = setInterval(function () {
            var composer = document.querySelector('.dash-composer');
            var input = document.getElementById('dashComposerInput');
            if (!composer || !input) { if (++tries > 40) clearInterval(iv); return; }
            clearInterval(iv);
            if (document.getElementById('dashInviteHint')) return;
            var hint = document.createElement('div');
            hint.id = 'dashInviteHint';
            hint.setAttribute('style',
                'margin:0 0 8px;padding:9px 12px;border-radius:12px;font-size:13.5px;line-height:1.45;' +
                'background:rgba(58,134,255,.09);border:1px solid rgba(58,134,255,.28)');
            hint.textContent = 'Вас пригласил близкий человек. Это отдельный разговор: он не увидит, что вы ' +
                'здесь напишете, и вы не увидите его слов. Расскажите, что происходит, своими словами.';
            composer.insertBefore(hint, composer.firstChild);
            try { input.focus(); } catch (e) {}
            _wireSubmit();
        }, 300);
    }

    // Строка про приглашение дописывается в момент отправки первой своей
    // реплики — так же, как у входа из статьи (openers.js).
    function _wireSubmit() {
        if (_submitWired) return;
        _submitWired = true;
        document.addEventListener('submit', function (e) {
            try {
                var form = e.target;
                if (!form || form.id !== 'dashComposerForm') return;
                var ctx = _readCtx();
                if (!ctx) return;
                var input = document.getElementById('dashComposerInput');
                var own = (input && input.value || '').trim();
                if (!own) return;
                try { sessionStorage.removeItem(INVITE_KEY); } catch (e2) {}
                var h = document.getElementById('dashInviteHint');
                if (h && h.parentNode) h.parentNode.removeChild(h);
                if (!/по приглашению/.test(own)) {
                    input.value = own + '\n\n(пришёл по приглашению близкого человека: ' + ctx.relation + ')';
                }
                _track('invite_first_message', { relation: ctx.relation, len: own.length });
            } catch (e3) {}
        }, true);
    }

    function init() {
        _fromUrl();
        // Перезагрузка до первого слова (login.js после подтверждения
        // личности) — подсказка возвращается из хранилища.
        var ctx = _readCtx();
        if (ctx) _showHint(ctx);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 400); });
    else setTimeout(init, 400);

    window.FrediInvite = { handleAnswer: handleAnswer, MARK_RX: MARK_RX };
})();
