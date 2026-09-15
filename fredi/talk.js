// talk.js — окно разговора: история переписки, поле ввода и микрофон.
//
// Зачем. В шапке есть строка «В прошлый раз: „…“ — Продолжить». До этого
// файла она отправляла реплику от имени человека и тем заканчивала свою
// работу: ответ приходил в общую ленту дашборда, а самой переписки —
// того, на чём остановились, — человек не видел. Возвращаться вслепую
// в разговор, который помнит только Фреди, странно: решение владельца
// 15.09.2026 — открывать окно с историей.
//
// Как устроено. Окно не заводит вторую ленту и второй композер: оно
// ПЕРЕНОСИТ к себе настоящие узлы дашборда — #dashChatStream, .dash-composer
// и .voice-card. Перенос узла сохраняет обработчики, поэтому отправка,
// лимиты, стены, потоковый ответ, голос и «Фреди печатает…» работают ровно
// так же, как на дашборде, без единой копии логики. Свернуть окно — значит
// вернуть узлы на место; поэтому под свёрнутым окном дашборд остаётся
// целым, с полем ввода и микрофоном там, где они и были.
//
// История приходит из /api/chat/history/{user_id} и рисуется один раз,
// выше текущих сообщений. Совпадающие хвосты не дублируются: последние
// реплики этого захода уже лежат в ленте.

(function () {
    'use strict';

    var HISTORY_LIMIT = 40;
    var _panel = null;
    var _pill = null;
    var _back = null;
    var _watch = null;   // следит за лентой, чтобы окно не отставало от неё
    var _slots = null;        // куда возвращать перенесённые узлы
    var _historyLoaded = false;
    var _open = false;
    var _userCollapsed = false;   // человек свернул окно сам
    var _autoWatch = null;

    function _api() {
        return (window.CONFIG && window.CONFIG.API_BASE_URL) || '';
    }
    function _uid() {
        return (window.CONFIG && window.CONFIG.USER_ID) || 0;
    }
    function _track(ev, data) {
        try {
            if (window.FrediTracker && window.FrediTracker.track)
                window.FrediTracker.track(ev, data || {});
        } catch (e) {}
    }

    // ---- разметка ----------------------------------------------------

    function _build() {
        if (_panel) return _panel;
        _panel = document.createElement('div');
        _panel.className = 'talk-panel';
        _panel.id = 'talkPanel';
        _panel.setAttribute('role', 'dialog');
        _panel.setAttribute('aria-label', 'Разговор с Фреди');
        _panel.innerHTML =
            '<div class="talk-head">' +
                '<span class="talk-ava">🧠<i class="talk-dot"></i></span>' +
                '<span class="talk-title">Разговор с Фреди</span>' +
                '<span class="talk-sub" id="talkSub"></span>' +
                '<button type="button" class="talk-icon talk-mute" id="talkMute"></button>' +
                '<button type="button" class="talk-icon" id="talkCollapse" ' +
                        'title="Свернуть" aria-label="Свернуть">—</button>' +
            '</div>' +
            '<div class="talk-body" id="talkBody"></div>' +
            '<div class="talk-foot" id="talkFoot"></div>';
        document.body.appendChild(_panel);

        _pill = document.createElement('button');
        _pill.type = 'button';
        _pill.className = 'talk-pill';
        _pill.id = 'talkPill';
        _pill.hidden = true;
        _pill.innerHTML = '<span class="talk-pill-dot"></span>Разговор с Фреди <b>▲</b>';
        document.body.appendChild(_pill);

        // Затемнение: окно стоит поверх дашборда и на широком экране
        // перекрывало правую колонку с быстрыми действиями — получалось,
        // что под ним что-то живое, до чего не дотянуться. Затемнение
        // честно говорит: сейчас разговор, остальное подождёт.
        _back = document.createElement('div');
        _back.className = 'talk-backdrop';
        _back.id = 'talkBackdrop';
        _back.hidden = true;
        document.body.appendChild(_back);
        _back.addEventListener('click', collapse);

        _panel.querySelector('#talkCollapse').addEventListener('click', collapse);
        _wireMute();
        _pill.addEventListener('click', function () { open('pill'); });
        // Esc сворачивает — окно поверх экрана, и выход должен быть под рукой.
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && _open) collapse();
        });
        return _panel;
    }

    // ---- звук --------------------------------------------------------
    //
    // Выключенный звук превращает окно в обычную переписку: Фреди отвечает
    // текстом и молчит, на синтез ничего не уходит (sound.js). Это не
    // настройка «для аккуратных», а выход из тупика: голос из динамика в
    // метро или в открытом офисе — неуместный формат, и человек закрывает
    // вкладку, а не ищет, где его убавить (замечание владельца 15.09.2026).
    // Поэтому кнопка стоит не в настройках, а прямо в шапке разговора.

    function _soundOff() {
        return !!(window.FrediSound && window.FrediSound.isOff());
    }

    // Динамик рисуем вектором, а не эмодзи: 🔇 на телефоне приходит
    // перечёркнутым кружком и читается как «запрещено» — состояние выбора
    // выглядит поломкой. Вектор одинаков везде и тянет цвет кнопки.
    var _ICON_ON =
        '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
        'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z"/>' +
        '<path d="M16.2 9.2a4 4 0 0 1 0 5.6"/><path d="M18.8 6.6a7.5 7.5 0 0 1 0 10.8"/></svg>';
    var _ICON_OFF =
        '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
        'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M4 9.5h3.2L12 5.6v12.8L7.2 14.5H4z"/>' +
        '<path d="M16.5 9.8l4.5 4.4"/><path d="M21 9.8l-4.5 4.4"/></svg>';

    function _paintMute() {
        var btn = _panel && _panel.querySelector('#talkMute');
        if (!btn) return;
        var off = _soundOff();
        btn.innerHTML = off ? _ICON_OFF : _ICON_ON;
        btn.classList.toggle('is-off', off);
        btn.setAttribute('aria-pressed', off ? 'true' : 'false');
        btn.title = off ? 'Включить голос Фреди' : 'Выключить голос — Фреди будет отвечать текстом';
        btn.setAttribute('aria-label', btn.title);
        // Состояние называет подзаголовок под именем — второй раз то же
        // самое в углу шапки не пишем: на снимке владельца «без звука»
        // стояло дважды в одной строке.
        if (_panel) _panel.classList.toggle('is-muted', off);
    }

    function _wireMute() {
        var btn = _panel && _panel.querySelector('#talkMute');
        if (!btn || btn._wired) return;
        btn._wired = true;
        btn.addEventListener('click', function () {
            if (window.FrediSound) window.FrediSound.toggle();
            _paintMute();
            _track('talk_sound_toggled', { off: _soundOff() });
        });
        document.addEventListener('fredi:sound', _paintMute);
        _paintMute();
    }

    // ---- перенос узлов туда и обратно --------------------------------
    //
    // Возвращать узлы нужно ровно на их место, поэтому вместо «запомнить
    // родителя» ставим на место узла пустую метку и потом меняем её обратно.

    function _take(id, sel, host) {
        var node = id ? document.getElementById(id) : document.querySelector(sel);
        if (!node || !node.parentNode) return null;
        var slot = document.createComment('talk-slot');
        node.parentNode.replaceChild(slot, node);
        host.appendChild(node);
        return { node: node, slot: slot };
    }

    function _give(rec) {
        if (!rec || !rec.slot || !rec.slot.parentNode) return;
        rec.slot.parentNode.replaceChild(rec.node, rec.slot);
    }

    // ---- история -----------------------------------------------------

    function _streamInner() {
        var stream = document.getElementById('dashChatStream');
        if (!stream) return null;
        var inner = stream.querySelector('.chat-messages');
        if (!inner) {
            inner = document.createElement('div');
            inner.className = 'chat-messages';
            stream.appendChild(inner);
        }
        return inner;
    }

    function _bubble(text, role) {
        var div = document.createElement('div');
        div.className = 'message ' + (role === 'user' ? 'user' : 'bot') + ' history';
        var t = document.createElement('div');
        t.textContent = text;
        div.appendChild(t);
        return div;
    }

    function _loadHistory() {
        if (_historyLoaded) return Promise.resolve();
        _historyLoaded = true;           // и при отказе второй раз не дёргаем
        var uid = _uid();
        if (!uid) return Promise.resolve();
        var sub = document.getElementById('talkSub');
        if (sub) sub.textContent = 'загружаю…';
        return fetch(_api() + '/api/chat/history/' + uid + '?limit=' + HISTORY_LIMIT)
            .then(function (r) { return r.json(); })
            .then(function (d) {
                var msgs = (d && d.messages) || [];
                var inner = _streamInner();
                if (sub) sub.textContent = '';
                if (!inner || !msgs.length) return;
                // Хвост истории — это те же реплики, что уже висят в ленте
                // текущего захода. Сверяем по тексту и не повторяем.
                var have = [].slice.call(inner.querySelectorAll('.message'))
                    .map(function (m) { return (m.textContent || '').trim(); });
                var frag = document.createDocumentFragment();
                var shown = 0;
                msgs.forEach(function (m) {
                    var text = (m && m.content ? String(m.content) : '').trim();
                    if (!text) return;
                    if (have.indexOf(text) >= 0) return;
                    frag.appendChild(_bubble(text, m.role));
                    shown++;
                });
                if (!shown) return;
                var sep = document.createElement('div');
                sep.className = 'talk-sep';
                sep.textContent = 'Раньше';
                frag.insertBefore(sep, frag.firstChild);
                var end = document.createElement('div');
                end.className = 'talk-sep talk-sep--now';
                end.textContent = 'Сейчас';
                frag.appendChild(end);
                inner.insertBefore(frag, inner.firstChild);
                var stream = document.getElementById('dashChatStream');
                if (stream) stream.classList.add('has-messages');
                _track('talk_history_shown', { n: shown });
            })
            .catch(function () { if (sub) sub.textContent = ''; });
    }

    // Внутри окна прокручивается .talk-body, а лента лежит в ней во всю
    // высоту. App.js про окно ничего не знает и крутит ленту — поэтому
    // низ держим здесь: без этого новый ответ уезжал за нижний край, а
    // человек видел неподвижную середину разговора.
    function _scrollDown() {
        var body = document.getElementById('talkBody');
        if (!body) return;
        body.scrollTop = body.scrollHeight;
        // Второй заход в следующем кадре: высота меняется, пока браузер
        // раскладывает только что добавленный пузырь.
        requestAnimationFrame(function () { body.scrollTop = body.scrollHeight; });
    }

    function _watchStream() {
        var stream = document.getElementById('dashChatStream');
        if (!stream || !window.MutationObserver) return;
        _watch = new MutationObserver(function () { if (_open) _scrollDown(); });
        _watch.observe(stream, { childList: true, subtree: true, characterData: true });
    }

    // ---- открыть / свернуть ------------------------------------------

    // Превращение поля в окно. Человек начал писать в узкую строчку — и
    // она на его глазах вырастает в переписку, вместо того чтобы экран
    // моргнул и сверху легло чужое окно. Момент перехода — единственное
    // место, где видно, что это одно и то же поле, а не два разных.
    //
    // Геометрия анимируется напрямую (left/top/width/height), а не
    // transform: масштабирование окна 430×760 до строки 340×48 сплющило бы
    // вместе с рамкой и весь текст внутри. Это одна фиксированная коробка,
    // и раскладку браузер пересчитывает только для неё.
    var MORPH_MS = 480;
    function _morphFrom(box) {
        if (!_panel || !box || !box.width) return;
        var el = _panel;
        // Конечная геометрия — та, что задаёт CSS: читаем её уже открытой.
        var to = el.getBoundingClientRect();
        if (!to.width) return;
        var put = function (r, radius) {
            el.style.left = r.left + 'px';
            el.style.top = r.top + 'px';
            el.style.width = r.width + 'px';
            el.style.height = r.height + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            if (radius !== undefined) el.style.borderRadius = radius;
        };
        el.classList.add('is-morphing');
        put(box, '16px');
        // Отражение раскладки: без него браузер склеит оба состояния в одно
        // и перехода не будет вовсе.
        void el.offsetHeight;
        put(to, '');
        setTimeout(function () {
            el.classList.remove('is-morphing');
            el.style.left = el.style.top = el.style.width = el.style.height =
                el.style.right = el.style.bottom = el.style.borderRadius = '';
        }, MORPH_MS + 40);
    }

    function open(source) {
        _build();
        if (_open) { _scrollDown(); return; }
        // Коробку поля снимаем ДО переноса: после него поле уже в окне.
        var from = null;
        if (source === 'typing' || source === 'message') {
            var comp = document.querySelector('.dash-composer');
            if (comp) {
                var r = comp.getBoundingClientRect();
                if (r.width) from = { left: r.left, top: r.top, width: r.width, height: r.height };
            }
        }
        var body = document.getElementById('talkBody');
        var foot = document.getElementById('talkFoot');
        // Порядок в подвале окна тот же, что на дашборде: сначала кнопка
        // голоса, под ней поле ввода (решение владельца 15.09.2026).
        _slots = {
            stream: _take('dashChatStream', null, body),
            voice: _take(null, '.voice-card', foot),
            composer: _take(null, '.dash-composer', foot),
        };
        var stream0 = document.getElementById('dashChatStream');
        if (stream0) stream0.hidden = false;
        _panel.classList.add('is-open');
        if (from) _morphFrom(from);
        if (_back) _back.hidden = false;
        _pill.hidden = true;
        _open = true;
        _watchStream();
        document.body.classList.add('talk-open');
        _track('talk_opened', { source: source || '' });
        _loadHistory().then(_scrollDown);
        setTimeout(function () {
            var input = document.getElementById('dashComposerInput');
            // На телефоне фокус поднимает клавиатуру поверх окна — там
            // человек сам решит, писать ему или говорить.
            if (input && window.innerWidth > 700) input.focus();
        }, 60);
    }

    function collapse(silent) {
        if (!_open) return;
        // Свернул человек — больше не открываем окно сами, пока он не
        // нажмёт язычок. Свернули мы (перерисовка дашборда) — запрет не
        // ставим: он ничего не решал.
        if (silent !== true) _userCollapsed = true;
        // Узлы возвращаются на дашборд: под свёрнутым окном он должен
        // остаться рабочим, с полем ввода и микрофоном на своих местах.
        if (_slots) {
            // Возврат в обратном порядке: метки стоят на своих местах, но
            // так узлы встают в дашборд той же чередой, что и лежали.
            _give(_slots.composer);
            _give(_slots.voice);
            _give(_slots.stream);
            _slots = null;
        }
        // Переписка остаётся в окне и только в нём. Иначе под дашбордом
        // висит вторая копия того же разговора — с историей, приветствием
        // и всеми репликами: владелец увидел это первым же вечером.
        // Обратно человек попадает язычком, а не прокруткой вниз.
        var stream = document.getElementById('dashChatStream');
        if (stream) stream.hidden = true;
        if (_watch) { _watch.disconnect(); _watch = null; }
        _panel.classList.remove('is-open');
        if (_back) _back.hidden = true;
        // Вне дашборда язычку возвращать некуда — там его и не показываем.
        _pill.hidden = (silent === true) || !_dashboardOnScreen();
        _open = false;
        document.body.classList.remove('talk-open');
        _track('talk_collapsed', {});
    }

    // Разговор начался — окно открывается само (решение владельца
    // 15.09.2026). Ловим не отправку формы, а появление реплики в ленте:
    // так же начинаются голос, автовопрос из объявления и представление
    // Фреди, и каждому из них окно нужно одинаково.
    function _autoOpenOnFirstMessage() {
        var stream = document.getElementById('dashChatStream');
        if (!stream || !window.MutationObserver) return;
        _autoWatch = new MutationObserver(function (recs) {
            if (_open || _userCollapsed) return;
            for (var i = 0; i < recs.length; i++) {
                var added = recs[i].addedNodes || [];
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (n.nodeType === 1 && n.classList &&
                        (n.classList.contains('message') || n.querySelector('.message'))) {
                        open('message');
                        return;
                    }
                }
            }
        });
        _autoWatch.observe(stream, { childList: true, subtree: true });
    }

    // Дашборд перерисовывается при смене режима и возврате на главную, и
    // его разметка содержит и ленту, и композер. Если в этот момент они
    // лежат у окна, после перерисовки на экране окажутся две ленты и два
    // поля ввода, а окно будет держать мёртвые узлы. Поэтому перед
    // перерисовкой окно молча отдаёт всё обратно.
    function _guardRerender() {
        var orig = window.renderDashboard;
        if (typeof orig !== 'function') return;
        window.renderDashboard = function () {
            if (_open) collapse(true);
            if (_autoWatch) { _autoWatch.disconnect(); _autoWatch = null; }
            var out = orig.apply(this, arguments);
            // Лента после перерисовки новая — наблюдателя ставим заново.
            setTimeout(function () { _autoOpenOnFirstMessage(); _openOnTyping(); }, 60);
            _historyLoaded = false;
            return out;
        };
    }

    // Человек начал печатать — окно открывается сразу, не дожидаясь
    // отправки (решение владельца 15.09.2026): писать своё в узкую строчку
    // посреди дашборда и не видеть, кому пишешь, — это не разговор.
    // Поле переезжает в окно вместе с набранным текстом, поэтому фокус и
    // позицию курсора возвращаем руками: перенос узла их сбрасывает.
    function _openOnTyping() {
        var input = document.getElementById('dashComposerInput');
        if (!input || input._talkTyping) return;
        input._talkTyping = true;
        input.addEventListener('input', function () {
            if (_open || _userCollapsed) return;
            if (!input.value) return;
            // Каретку запоминаем расстоянием от КОНЦА строки, а не позицией
            // от начала: пока окно собирается, человек успевает дописать
            // ещё несколько букв, и позиция от начала уводит каретку в
            // середину набранного — получалось «ме тревожнон».
            var tail = input.value.length - input.selectionStart;
            open('typing');
            // Фокус возвращаем СИНХРОННО, в том же обработчике: через
            // setTimeout уже поздно — перенос узла снимает фокус, и всё,
            // что человек набирает до следующего кадра, уходит в никуда.
            // На быстром наборе от «меня накрывает» оставалась одна «м».
            var refocus = function () {
                var el = document.getElementById('dashComposerInput');
                if (!el || document.activeElement === el) return;  // фокус цел — каретку не трогаем
                el.focus();
                var at = Math.max(0, el.value.length - tail);
                try { el.setSelectionRange(at, at); } catch (e) {}
            };
            refocus();
            // Страховка на случай, если раскладка окна собьёт фокус ещё раз.
            setTimeout(refocus, 0);
        });
    }

    // Язычок — дверь обратно в разговор на дашборде, и смысл он имеет
    // только пока дашборд на экране. Во время теста человек отвечает на
    // сорок вопросов, а в правом нижнем углу висит «Разговор с Фреди ▲» и
    // тянет на себя (замечание владельца 15.09.2026). То же самое верно
    // для любого другого экрана: тренажёра, разбора, настроек.
    //
    // Признак дашборда — .dashboard-container в #screenContainer. Ловим
    // не переход в тест, а саму смену экрана: экранов десятки, и
    // перечислять их по одному значит забыть половину.
    function _dashboardOnScreen() {
        return !!document.querySelector('.dashboard-container');
    }

    function _syncPill() {
        if (!_pill) return;
        if (_dashboardOnScreen()) return;   // на дашборде решает collapse/open
        // Дашборда нет: язычок прячем, а открытое окно молча сворачиваем —
        // иначе оно держит узлы экрана, которого больше нет.
        if (_open) collapse(true);
        _pill.hidden = true;
    }

    function _watchScreen() {
        var host = document.getElementById('screenContainer');
        if (!host || !window.MutationObserver) return;
        new MutationObserver(function () { _syncPill(); })
            .observe(host, { childList: true, subtree: false });
    }

    function _init() {
        _guardRerender();
        _autoOpenOnFirstMessage();
        _openOnTyping();
        _watchScreen();
        _syncPill();
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 300); });
    else setTimeout(_init, 300);

    window.FrediTalk = {
        open: open,
        collapse: collapse,
        isOpen: function () { return _open; },
    };
})();
