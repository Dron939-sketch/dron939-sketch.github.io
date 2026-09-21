// ============================================
// meter.js — Fading Fredi: free session limits UI
// Auto-intercepts chat/voice requests to check limits
// ============================================

(function () {
    if (window._meterLoaded) return;
    window._meterLoaded = true;

    function _api() { return window.CONFIG?.API_BASE_URL || ''; }
    function _uid() { return window.CONFIG?.USER_ID; }

    // Лимит привязан к пользователю, поэтому под временным
    // Date.now()-идентификатором его трогать нельзя: сервер завёл бы ещё
    // одного «нового» человека с полным бесплатным запасом, а настоящий
    // расход остался бы неучтённым. Отсюда и брались обнулённые лимиты
    // после перезагрузки, и лишние пользователи в аналитике.
    //
    // Пока личность не подтверждена, ждём её (потолок ожидания — в auth.js).
    // Не дождались — работаем как раньше, но это осознанный fail-open:
    // лучше пустить человека говорить, чем запереть из-за легшей сети.
    async function _uidConfirmed() {
        if (window.USER_ID_PROVISIONAL && window.identityReady) {
            try { await window.identityReady(); } catch (e) {}
        }
        return _uid();
    }
    function _toast(msg, type) { if (window.showToast) window.showToast(msg, type || 'info'); }

    // Ребёнок (18.09.2026). Сервер отдаёт is_minor по возрасту из
    // регистрации; выгрузка 11–17.09 — 16 из 60 с известным возрастом
    // младше 18. Подписку ребёнку не продаём: на стенах вместо цены —
    // честное «минуты вернутся завтра», опрос «что остановило» не задаём.
    function _minor(check) {
        try {
            if (check && check.is_minor === true) return true;
            return !!(_lastCheck && _lastCheck.is_minor === true);
        } catch (e) { return false; }
    }
    var MINOR_NOTE = '<div class="meter-text" style="font-size:12px;opacity:.75;margin:6px 0 10px">' +
        'Подписка — для взрослых. Бесплатные минуты вернутся завтра, разговор никуда не денется.</div>';

    function _injectBadgeStyles() {
        if (document.getElementById('meter-badge-styles')) return;
        var s = document.createElement('style');
        s.id = 'meter-badge-styles';
        s.textContent = [
            // Бадж-таймер в правом верхнем углу. Видим всегда для free-юзеров.
            // На мобильных — чуть меньше и ниже от safe-area, чтобы не перекрыть статус-бар.
            '.meter-badge{position:fixed;top:max(12px,env(safe-area-inset-top,12px));right:14px;z-index:9000;display:flex;align-items:center;gap:6px;padding:7px 11px;background:rgba(20,20,22,0.85);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(224,224,224,0.18);border-radius:14px;font-size:12px;font-weight:600;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e0e0e0;cursor:pointer;font-variant-numeric:tabular-nums;box-shadow:0 2px 8px rgba(0,0,0,0.25);transition:transform 0.15s,border-color 0.2s,background 0.2s}',
            '.meter-badge:hover{transform:translateY(-1px);border-color:rgba(224,224,224,0.32)}',
            '.meter-badge:active{transform:scale(0.97)}',
            '.meter-badge-icon{font-size:14px;line-height:1}',
            '.meter-badge-time{min-width:34px;text-align:center}',
            '.meter-badge-day{font-size:10px;font-weight:600;color:#9b9b9d;letter-spacing:0.3px;border-left:1px solid rgba(224,224,224,0.18);padding-left:8px;margin-left:2px}',
            '.meter-badge.warn{border-color:rgba(252,206,40,0.45);background:rgba(70,55,15,0.7)}',
            '.meter-badge.danger{border-color:rgba(239,68,68,0.55);background:rgba(70,20,20,0.78);color:#ffcccc}',
            // Кнопка «три точки» (мастерская и ярлык на экран) стоит в
            // правом верхнем углу шапки. Бейдж висит position:fixed с
            // z-index 9000 — и на телефоне ложился прямо на неё: замерено
            // на 360×800, бейдж 180–346, кнопка 306–344, перекрытие 38 px.
            // То есть кнопка была не просто закрыта, а недоступна нажатию.
            // Сдвигаем бейдж левее ровно на ширину кнопки с зазором.
            '@media (max-width:600px){.meter-badge{right:62px}}',
            '@media (max-width:480px){.meter-badge{font-size:11px;padding:6px 10px;right:58px}.meter-badge-day{font-size:9px}}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function _injectMeterStyles() {
        if (document.getElementById('meter-styles')) return;
        var s = document.createElement('style');
        s.id = 'meter-styles';
        s.textContent = [
            '.meter-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);padding:16px}',
            '.meter-modal{background:var(--black-matte,#111);border:1px solid rgba(224,224,224,0.1);border-radius:20px;padding:28px;max-width:400px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.6);color:var(--text-primary);max-height:90vh;overflow-y:auto}',
            '.meter-emoji{font-size:48px;text-align:center;margin-bottom:16px}',
            '.meter-title{font-size:18px;font-weight:700;color:var(--text-primary);margin-bottom:8px;text-align:center}',
            '.meter-text{font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:18px}',
            '.meter-timer{font-size:28px;font-weight:700;color:#3b82ff;text-align:center;margin-bottom:16px;font-variant-numeric:tabular-nums}',
            '.meter-hint{background:rgba(59,130,255,0.08);border:1px solid rgba(59,130,255,0.15);border-radius:14px;padding:14px;margin-bottom:18px;font-size:13px;color:var(--text-primary);line-height:1.5}',
            '.meter-hint-path{font-weight:600;color:#3b82ff}',
            '.meter-features{list-style:none;padding:0;margin:0 0 18px 0}',
            '.meter-features li{font-size:12px;color:var(--text-secondary);padding:4px 0;display:flex;align-items:center;gap:8px}',
            '.meter-features li span{flex-shrink:0;width:18px;text-align:center;font-size:14px}',
            '.meter-features-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;color:var(--text-secondary);margin-bottom:8px}',
            '.meter-btn{display:block;width:100%;padding:14px;border:none;border-radius:14px;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer;text-align:center;margin-bottom:10px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform 0.15s}',
            '.meter-btn:active{transform:scale(0.98)}',
            '.meter-btn-primary{background:linear-gradient(135deg,#3b82ff 0%,#6366f1 100%);color:#fff}',
            '.meter-btn-secondary{background:rgba(224,224,224,0.07);border:1px solid rgba(224,224,224,0.18);color:var(--text-secondary)}',
            // Дневная стена: экран притемняется, но остаётся виден — человек
            // должен понимать, что приложение на месте и вернётся, а не
            // сломалось. Отсюда мягкая заливка и лёгкое размытие вместо
            // глухого чёрного, каким закрывалась прежняя модалка.
            '.meter-wall{background:rgba(6,8,14,0.30);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}',
            '.meter-wall-box{max-width:340px;width:100%;text-align:center;color:#fff;background:rgba(12,15,22,0.84);border:1px solid rgba(255,255,255,0.08);border-radius:22px;padding:26px 22px;box-shadow:0 18px 50px rgba(0,0,0,0.35)}',
            '.meter-wall-title{font-size:17px;font-weight:700;margin-bottom:14px}',
            '.meter-wall-clock{font-size:44px;font-weight:800;letter-spacing:1px;line-height:1.05;color:#fff;font-variant-numeric:tabular-nums;margin:0 0 22px}',
            '.meter-wall-lead{font-size:13.5px;color:rgba(255,255,255,0.82);margin-bottom:12px;line-height:1.5}',
            '.meter-wall-note{font-size:13px;color:rgba(255,255,255,0.78);margin-bottom:24px;line-height:1.45}',
            '.meter-wall-fine{font-size:11.5px;color:rgba(255,255,255,0.6);line-height:1.5;margin-top:2px}'
        ].join('\n');
        document.head.appendChild(s);
    }

    var _lastCheck = null;
    var _lastCheckTime = 0;
    var _warningShown = false;       // флаг «soft» предупреждения (≤5 мин)
    var _criticalShown = false;      // флаг «critical» предупреждения (≤2 мин)
    var CHECK_CACHE_MS = 5000;

    async function checkCanSend() {
        var uid = await _uidConfirmed();
        if (!uid) return { can_send: true };
        var now = Date.now();
        if (_lastCheck && (now - _lastCheckTime) < CHECK_CACHE_MS) return _lastCheck;
        try {
            var r = await fetch(_api() + '/api/meter/can-send/' + uid);
            var data = await r.json();
            _lastCheck = data;
            _lastCheckTime = now;
            // Статус приехал — значки премиума в меню приводим в соответствие.
            try { _markPremiumNav(); } catch (e) {}
            return data;
        } catch (e) {
            return { can_send: true };
        }
    }

    // Двухступенчатое предупреждение перед блокировкой.
    //
    // 5 мин ≤ rem  → пока тишина
    // 2 мин < rem ≤ 5 мин → soft: «осталось N мин» (info-toast)
    // rem ≤ 2 мин → critical: карточка апселла
    //
    // Каждый уровень показывается 1 раз за окно 2 мин (защита от спама).
    // Оба трекаются как `meter_warning` в аналитике с полем `level`.
    //
    // Почему это долго не работало. Ограничений два — минуты на сегодня и
    // общий бесплатный запас, — а предупреждение смотрело только на первое.
    // Пока запас считался в днях, человек упирался в paywall на четвёртый
    // заход с полными десятью минутами на счётчике: условие `rem <= 5`
    // не выполнялось никогда. В аналитике это лежало ровно так —
    // meter_warning 0 при meter_blocked_shown 10.
    //
    // Теперь бэкенд отдаёт `remaining_minutes` уже как минимум из двух
    // остатков, а `block_reason` говорит, какой из них ближе. Предупреждать
    // надо по ближайшему — и словами про него же: «на сегодня» и «бесплатные
    // минуты кончаются совсем» требуют разной реакции.
    function _trackWarning(level, rem, kind) {
        try {
            if (window.FrediTracker && window.FrediTracker.track) {
                window.FrediTracker.track('meter_warning', {
                    level: level,            // 'soft' | 'critical'
                    kind: kind,              // 'trial' | 'daily'
                    remaining_minutes: rem,
                });
            }
        } catch (e) {}
    }

    // Какое из двух ограничений упрётся первым.
    function _bindingKind(check) {
        var trial = check.remaining_trial_minutes;
        var day = check.remaining_today_minutes;
        if (trial == null) return 'daily';           // старый бэкенд
        if (day == null) return 'trial';
        return trial <= day ? 'trial' : 'daily';
    }

    // Карточка апселла — один раз за сессию. Окно в 2 минуты от спама
    // не спасало: critical-проверка срабатывает на каждом сообщении, и
    // человек, продолжающий разговор, получал карточку каждые 3–4 минуты.
    // По аналитике — три показа за 7 минут одному и тому же юзеру, три
    // «позже» подряд: каждый следующий показ не продавал, а дрессировал
    // закрывать. Повторные critical в той же сессии — только тост.
    function _upsellShownThisSession() {
        try { return sessionStorage.getItem('meterUpsellShownAt') != null; }
        catch (e) { return _upsellShownLocal; }
    }
    var _upsellShownLocal = false;
    function _rememberUpsellShown() {
        _upsellShownLocal = true;
        try { sessionStorage.setItem('meterUpsellShownAt', String(Date.now())); } catch (e) {}
    }

    function _showWarningToast(check) {
        if (!check || check.is_premium) return;
        var rem = check.remaining_minutes;
        if (rem == null) return;

        var kind = _bindingKind(check);

        // Пороги «осталось мало» масштабируются от лимита. Абсолютные 2/5
        // минут писались под лимит в 10: анониму с дневными 3 минутами
        // soft-порог ≤5 срабатывал на ПЕРВОМ же сообщении — человек ещё
        // ценности не увидел, а ему уже тикает таймер (наблюдение из
        // аналитики 02.09: meter_warning remaining=3 сразу после первого
        // message_sent). Для лимита 10 пороги остаются прежними (2 и 5),
        // для анонимных 3 минут — 1 и 1.5.
        var limitForKind = (kind === 'trial')
            ? (check.trial_limit_minutes || 10)
            : (check.limit_minutes || 10);
        var critThr = Math.min(2, limitForKind / 3);
        var softThr = Math.min(5, limitForKind / 2);

        // Critical: осталось ≤ 2 мин. Карточку апселла показываем один раз
        // за сессию (и не поверх только что закрытой стены) — дальше на
        // critical напоминаем тостом, раз за 2-мин окно. meter_warning
        // пишем в обоих случаях: это замер, а не UI.
        if (rem <= critThr && !_criticalShown) {
            _criticalShown = true;
            _trackWarning('critical', rem, kind);
            setTimeout(function() { _criticalShown = false; }, 120000);
            // Момент предложения. Новичку — никогда: он ещё не вернулся ни
            // разу. Вернувшемуся — только если разговор идёт (три сообщения
            // и больше): тогда Premium снимает помеху, а не берёт плату
            // за вход. В остальных случаях — тихий тост.
            var moment_ok = !_newcomer() && _engagedNow();
            if (moment_ok && !_upsellShownThisSession() && _dismissedAgo() >= PAYWALL_QUIET_SEC) {
                showUpsellCard(check, kind);
            } else if (!moment_ok) {
                _track('meter_upsell_suppressed', {
                    remaining_minutes: rem, kind: kind,
                    reason: _newcomer() ? 'newcomer' : 'no_conversation',
                    visits: _visits(), exchanges: _exchanges,
                });
                _toast(_freeEndsToast(rem, kind), 'info');
            } else {
                _track('meter_upsell_suppressed', {
                    remaining_minutes: rem,
                    kind: kind,
                    reason: _upsellShownThisSession() ? 'already_shown' : 'paywall_quiet',
                });
                _toast(_freeEndsToast(rem, kind), 'info');
            }
            return;
        }
        // Soft: critThr < rem ≤ softThr — мягкая подготовка.
        if (rem <= softThr && !_warningShown) {
            _warningShown = true;
            _toast(_freeEndsToast(rem, kind), 'info');
            _trackWarning('soft', rem, kind);
            setTimeout(function() { _warningShown = false; }, 120000);
        }
    }

    // Реальная цена обмена. Раньше каждый обмен стоил фиксированные 15
    // секунд — при этом реальный такт «написал → прочитал длинный ответ →
    // ответил» занимает 60-90 секунд. «10 бесплатных минут» на деле были
    // 40 обменами: пользователь с 36 сообщениями за несколько дней так и
    // не увидел стену, и подписка ему была ни к чему. Теперь списывается
    // время, реально прошедшее с прошлого обмена: минимум прежние 15
    // (быстрые короткие реплики не дороже, чем были), максимум 120 —
    // отходил от экрана не в счёт (и сервер всё равно режет по 120).
    var _lastExchangeTs = 0;
    function recordExchange() {
        var now = Date.now();
        var sec = 15;
        if (_lastExchangeTs) {
            sec = Math.round((now - _lastExchangeTs) / 1000);
            if (sec < 15) sec = 15;
            if (sec > 120) sec = 120;
        }
        _lastExchangeTs = now;
        return recordUsage(sec);
    }

    /**
     * Списать время без стены и без предупреждения.
     *
     * Нужно тесту: пятнадцать минут прохождения и ожидание генерации
     * портрета тоже расходуют дневной запас — решение владельца
     * 14.09.2026. Но обычный recordUsage после каждой записи дёргает
     * checkCanSend и при исчерпанном лимите показывает модалку; посреди
     * теста это оборвало бы человека на середине и убило бы то самое
     * прохождение, ради которого всё делается. Здесь только запись:
     * стена и предупреждение сработают позже, когда человек придёт в
     * разговор, — то есть ровно там, где они уместны.
     */
    async function recordUsageQuiet(seconds) {
        var uid = await _uidConfirmed();
        if (!uid) return;
        try {
            await fetch(_api() + '/api/meter/record-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: uid, seconds: seconds || 60 })
            });
            _lastCheck = null;
        } catch (e) {}
    }

    async function recordUsage(seconds) {
        var uid = await _uidConfirmed();
        if (!uid) return;
        try {
            await fetch(_api() + '/api/meter/record-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: uid, seconds: seconds || 30 })
            });
            _lastCheck = null;
            // После каждой записи — синхронизируем статус и показываем
            // warning если осталось ≤5 мин. Это покрывает голосовой
            // чат через WebSocket, который не идёт через apiCall/fetch
            // patch и иначе никогда не получает warning-toast.
            try {
                var check = await checkCanSend();
                if (check && !check.is_premium) {
                    _showWarningToast(check);
                    // Если бэк вернул блок — показываем modal
                    if (check.can_send === false) {
                        showFatigueModal(check);
                    }
                }
            } catch (e) {}
        } catch (e) {}
    }

    // Чем человек был занят перед стеной. Раньше стена показывала витрину
    // из двенадцати функций — список не покупают, покупают продолжение
    // начатого. За неделю: 101 показ стены, один клик, ноль оплат.
    var _lastAct = { kind: '', name: '', ts: 0 };
    var _exchanges = 0;          // сколько сообщений человек написал за сессию

    // Кому вообще уместно показывать цену.
    //
    // Сейчас стена приходит ко всем одинаково: и к тому, кто зашёл на девять
    // секунд, и к тому, кто ходит двадцать седьмой раз. За неделю это дало
    // 101 показ, один клик и ноль оплат. Возврат — единственный честный
    // сигнал намерения, который у нас есть: человек, пришедший второй раз,
    // сказал «мне это нужно» действием, а не кликом. Новичку в первую
    // сессию цену не показываем вообще — только «на сегодня всё».
    function _visits() {
        try { return parseInt(localStorage.getItem('fredi_visits_count') || '1', 10) || 1; }
        catch (e) { return 1; }
    }
    function _authed() { return !!window.IS_AUTHENTICATED; }
    // Пройден ли тест. Код профиля — единственный признак, доступный на
    // клиенте: «···» означает, что профиля нет.
    function _hasProfile() {
        try {
            var code = window.CONFIG && window.CONFIG.PROFILE_CODE;
            return !!(code && code !== '···');
        } catch (e) { return false; }
    }
    function _newcomer() { return !_authed() && _visits() <= 1; }
    // Разговор состоялся — три и больше сообщений за сессию. Предложение
    // в середине живого разговора читается как «уберём помеху», а на
    // втором сообщении — как «плати за вход».
    function _engagedNow() { return _exchanges >= 3; }
    // Ступенька между анонимом и подпиской. У человека без аккаунта дневной
    // лимит меньше — бэкенд отдаёт в статусе оба числа, свои руками сюда не
    // вписываем. Аккаунт по смыслу не «заплати», а «останься»: разговор не
    // потеряется, и минут в день станет больше. Без этой ступеньки
    // единственным ответом на стену была цена в первый же вечер — 101
    // закрытая стена, один клик, ноль оплат.
    function _accountGain(data) {
        // 15.09.2026 (решение владельца): регистрация больше не продаётся
        // минутами. Надбавка первого дня на бэкенде снята, и звать «оставь
        // почту — будет больше» стало неправдой; но дело не только в
        // числах. Регистрация сама по себе человеку ничего не открывает —
        // он остаётся в той же бесплатной версии, — а место на стене
        // занимает ровно то, ради чего стена и стоит: пробу за 99 ₽.
        // Почта приходит там, где человек и так её оставляет: на разборе
        // теста в PDF и на оплате. Возврат пустого выигрыша схлопывает
        // все ветки «Завести аккаунт — N минут» разом, поэтому сами ветки
        // оставлены на месте: вернуть предложение — снять этот return.
        return null;
        /* eslint-disable no-unreachable */
        // Два независимых признака аккаунта: сессия на фронте и почта в
        // базе. Хватает любого — иначе человеку с протухшей кукой предложат
        // завести то, что у него уже есть.
        if (_authed()) return null;
        if (data && data.is_registered === true) return null;
        var big = data && data.registered_limit_minutes;
        var small = data && data.anon_limit_minutes;
        // small может быть 0: со второго дня аноним без минут (12.09.2026),
        // и это ровно тот случай, когда аккаунт даёт больше всего.
        if (!big || small == null || big <= small) return null;
        return { big: big, small: small, plus: Math.round((big - small) * 10) / 10 };
        /* eslint-enable no-unreachable */
    }
    // Одна фраза про выигрыш от аккаунта на все стены: при нуле анонимных
    // минут «5 вместо 0» звучит как арифметика, а не как предложение.
    function _gainPhrase(gain, today) {
        if (!gain) return '';
        if (!gain.small) {
            return today
                ? 'С аккаунтом сегодня будет ' + gain.big + ' минут; без него минут на сегодня нет.'
                : 'С аккаунтом — ' + gain.big + ' минут каждый день; без него со второго дня минут нет.';
        }
        return today
            ? 'С аккаунтом на сегодня будет ' + gain.big + ' минут вместо ' + gain.small + '.'
            : 'С аккаунтом ' + gain.big + ' минут каждый день вместо ' + gain.small + '.';
    }
    function _openRegister(source) {
        _track('meter_register_clicked', { source: source });
        if (window.FrediAuth && typeof window.FrediAuth.openRegister === 'function') {
            window.FrediAuth.openRegister({ source: source });
        } else if (typeof showSettingsScreen === 'function') {
            showSettingsScreen();
        }
    }
    var FEATURE_PHRASE = {
        kontur: 'разбирались, о чём умеете думать',
        mirrors: 'разбирали отношения в «Зеркале»',
        berne: 'разбирали роли по Берну',
        dreams: 'разбирали сон',
        doubles: 'искали свои двойные послания',
        tales: 'работали со сказкой',
        brand: 'собирали свой образ',
        esoterica: 'разбирали эзотерику на трезвую голову',
        perehod: 'проходили «Переход»',
        avtopilot: 'ставили навык на триггер в «Автопилоте»',
        parus: 'разбирали перегрузку в «Парусе»',
        spiral: 'собирали день в «Спирали»',
        mysl: 'допрашивали тревожную мысль',
        skazhinet: 'тренировали отказ',
        opora: 'отвечали внутреннему критику в «Опоре»',
        messages: 'разбирали переписку',
        diary: 'вели дневник',
        hypnosis: 'слушали гипнотическую сессию'
    };
    try {
        window.addEventListener('fredi:track', function (e) {
            var ev = e && e.detail && e.detail.event;
            var d = (e && e.detail && e.detail.data) || {};
            if (ev === 'feature_opened' && d.feature) {
                _lastAct = { kind: 'feature', name: String(d.feature), ts: Date.now() };
            } else if (ev === 'message_sent') {
                _lastAct = { kind: 'chat', name: '', ts: Date.now() };
                _exchanges++;
            }
        });
    } catch (e) {}

    function _name() {
        var n = (window.CONFIG && window.CONFIG.USER_NAME) || '';
        n = String(n).trim();
        return (n && n !== 'друг' && n !== 'undefined') ? n : '';
    }

    // «Вы только что…» — одной строкой, и только если это было недавно.
    // Полчаса: дольше — человек уже занят другим, и напоминание соврёт.
    function _whatYouDid() {
        if (!_lastAct.kind || (Date.now() - _lastAct.ts) > 30 * 60 * 1000) return '';
        if (_lastAct.kind === 'chat') return 'разговаривали с Фреди';
        return FEATURE_PHRASE[_lastAct.name] || '';
    }

    function _esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    // Три пункта вместо двенадцати: безлимит, весь Лекторий голосом,
    // инструменты. Больше человек за секунду всё равно не прочтёт.
    //
    // Без чисел. «102 курса» и «1250 статей» разъезжаются с каталогом в тот
    // же день, а пересчитывает их tools/sync_counters.py — и только в HTML
    // страниц, до JS приложения он не дотягивается. Здесь число осталось бы
    // навсегда тем, каким я его вписал.
    // Здесь стояло «Весь Лекторий: курсы целиком, лекции с озвучкой».
    // Лекторий лежит на /blog/lektorij/ и открыт всем, озвучка на
    // бэкенде тоже ничем не закрыта — человек проверял это одним
    // кликом по меню и переставал верить двум остальным пунктам.
    // Обещаем то, что подписка действительно снимает: каждый модуль
    // ниже ходит в /api/ai/generate и жжёт те же минуты счётчика,
    // поэтому «без счётчика» честно распространяется на весь список.
    // Роли закрыты подпиской напрямую (app.js, effectiveMode).
    //
    // keys — имена feature_opened из трекера: по последней использованной
    // функции витрина переставляется, см. _premiumFeatures(). Зачем
    // перестановка: по целям «открыл Фреди» за первые сутки их жизни
    // (03–04.09) натальная карта — 73 из 144 именных переходов, вдвое
    // больше любого другого входа, — а в витрине стояла пятой строкой.
    // Человек, упёршийся в лимит посреди разбора карты, должен первой
    // строкой увидеть карту, а не общий разговор. Когда последняя функция
    // неизвестна, порядок прежний: стена чаще всего прерывает разговор.
    // Порядок — по тому, за чем люди приходят (фокус-группа 12.09.2026):
    // память и продолжение, голос, роли, разбор теста, сильные игры.
    // Таро и супервизор — в конце: для пришедшего за КПТ или сном они
    // читались как «не про психологию».
    var FEATURE_ITEMS = [
        { icon: '\uD83E\uDDE0', text: 'Фреди помнит каждый разговор и продолжает завтра с того же места', keys: [] },
        { icon: '\u2728', text: 'Голосом и текстом 24/7, без счётчика минут', keys: [] },
        { icon: '\uD83C\uDFAD', text: 'Коуч и тренер без лимита (без подписки — три ответа)', keys: [] },
        { icon: '\uD83D\uDD0D', text: 'Глубинный разбор вашего теста: петли, механизмы, точки роста, прогноз и ключи', keys: ['analysis', 'test'] },
        { icon: '\uD83C\uDFAE', text: 'Сильные тренажёры: «Переход», «Опора», «Парус», «Спираль», «Скажи нет»',
          keys: ['opora', 'mysl', 'skazhinet', 'spiral', 'parus', 'perehod'] },
        { icon: '\uD83D\uDCD3', text: 'Дневник эмоций, зеркало, разбор переписки и роли по Берну',
          keys: ['diary', 'mirrors', 'berne', 'kontur', 'messages', 'doubles'] },
        { icon: '\uD83C\uDF00', text: 'Гипноз, практики, якоря, толкование снов, терапевтические сказки',
          keys: ['hypnosis', 'dreams', 'tales'] },
        { icon: '\uD83D\uDD2E', text: 'Таро, натальная карта, супервизор для психологов, «Мой бренд»',
          keys: ['esoterica', 'brand'] }
    ];

    function _premiumFeatures() {
        var items = FEATURE_ITEMS.slice();
        // Свежесть та же, что у _whatYouDid: полчаса. Дольше — человек уже
        // занят другим, и поднятая наверх строка была бы про чужую сессию.
        var act = (_lastAct.kind === 'feature' && (Date.now() - _lastAct.ts) <= 30 * 60 * 1000)
            ? _lastAct.name : '';
        if (act) {
            for (var i = 1; i < items.length; i++) {
                if (items[i].keys.indexOf(act) !== -1) {
                    var hit = items.splice(i, 1)[0];
                    items.unshift({ icon: hit.icon, text: '<b>' + hit.text + '</b>', keys: hit.keys });
                    break;
                }
            }
        }
        var out = '<ul class="meter-features">';
        for (var j = 0; j < items.length; j++) {
            // keys попадают в разметку, чтобы строку можно было найти
            // потом: подарочный блок гасит строку про разбор, иначе
            // стена дарит и тут же продаёт одно и то же.
            out += '<li data-keys="' + (items[j].keys || []).join(' ') + '">' +
                '<span>' + items[j].icon + '</span> ' + items[j].text + '</li>';
        }
        return out + '</ul>';
    }

    // Кому платят. На стене про автора не было ни слова — а это первый
    // молчаливый вопрос человека, который видит цену.
    var AUTHOR_NOTE =
        '<div class="meter-text" style="font-size:12px;opacity:0.75;margin-bottom:14px">' +
        'Фреди сделал психолог <a href="/obo-mne/" target="_blank" rel="noopener" ' +
        'style="color:#3b82ff">Андрей Мейстер</a> — двадцать лет практики, ' +
        'Лекторий и блог о том же самом.</div>';

    // ── Подарок: первый разбор теста ──────────────────────────────────
    //
    // Замер 01–17.09: стену увидел 171 человек, кликнули по подписке 13.
    // В опросе «что остановило» из 18 ответов семь «попробую потом», семь
    // «дорого» и НОЛЬ «не понял, что даёт». Люди понимают, что мы
    // продаём; им нечем проверить, зачем это им. На стене восемь строк
    // обещаний и ни одного доказательства.
    //
    // Дарим то, что действительно закрыто подпиской: шесть разделов
    // разбора. Тест бесплатен и всегда был — дарить его было бы
    // подарком на словах, а это человек проверяет одним кликом. Ровно на
    // этом мы уже обожглись с «Весь Лекторий»: он открыт всем, и после
    // проверки переставали верить и остальным строкам витрины.
    //
    // Право на подарок считает сервер (у него одного есть история
    // разборов), ручка /gift дешёвая и не генерирует ничего.
    var _giftState = null;   // {gift_available, has_profile, is_premium}
    var _giftTs = 0;
    var GIFT_TTL_MS = 5 * 60 * 1000;

    function _loadGift(cb) {
        var uid = _uid();
        // Без аккаунта подарок некуда положить: разбор привязан к
        // человеку. Такому стена и так предлагает сначала завести
        // аккаунт — обещать ему подарок значило бы обещать за два шага
        // вперёд, а до второго шага он не дойдёт.
        if (!uid) { cb(null); return; }
        if (_giftState && (Date.now() - _giftTs) < GIFT_TTL_MS) { cb(_giftState); return; }
        try {
            fetch(_api() + '/api/deep-analysis/' + uid + '/gift')
                .then(function (r) { return r.json(); })
                .then(function (d) {
                    if (!d || d.success !== true) { cb(null); return; }
                    _giftState = d; _giftTs = Date.now();
                    cb(d);
                })
                .catch(function () { cb(null); });
        } catch (e) { cb(null); }
    }

    // Подарок выдан — кэш недействителен: второй раз его не положено.
    function _giftForget() { _giftState = null; _giftTs = 0; }

    // analysis.js грузится лениво (app.js, moduleHandlers.analysis), и со
    // стены window.openAnalysisScreen обычно ещё не существует. Прямой
    // вызов молча ничего не делал бы — человек нажал бы «Открыть разбор»
    // и остался на пустом экране.
    function _openAnalysis() {
        if (typeof window.openAnalysisScreen === 'function') {
            window.openAnalysisScreen();
            return;
        }
        try {
            var s = document.createElement('script');
            s.src = 'analysis.js';
            s.onload = function () {
                if (typeof window.openAnalysisScreen === 'function') window.openAnalysisScreen();
            };
            // Уводить на ?m=analysis нельзя: такого ключа в ROUTES нет
            // (app.js), ссылка молча открыла бы общий экран, и человек
            // решил бы, что подарок — пустое обещание. Лучше сказать.
            s.onerror = function () {
                _toast('Не получилось открыть разбор. Попробуйте ещё раз', 'error');
            };
            document.head.appendChild(s);
        } catch (e) {
            _toast('Не получилось открыть разбор. Попробуйте ещё раз', 'error');
        }
    }

    function _openTest() {
        try {
            if (typeof window.startTest === 'function') window.startTest();
            else window.location.href = '/fredi/?m=test';
        } catch (e) { window.location.href = '/fredi/?m=test'; }
    }

    function _giftBlock(g) {
        if (!g || g.gift_available !== true) return '';
        var title = g.has_profile
            ? 'Полный разбор вашего теста — в подарок'
            : 'Пройдите тест — полный разбор в подарок';
        var text = g.has_profile
            ? 'Шесть разделов: глубинный портрет, системные петли, скрытые ' +
              'механизмы, точки роста, прогноз и персональные ключи. Обычно ' +
              'это часть подписки. Первый — бесплатно, он останется у вас.'
            : 'Сам тест бесплатный, минут пятнадцать. А разбор по нему — ' +
              'шесть разделов, которые обычно открываются с подпиской, — ' +
              'первый раз отдаём бесплатно.';
        var btn = g.has_profile ? '🎁 Открыть разбор' : '🎁 Пройти тест';
        return '<div class="meter-gift" id="meterGift" style="text-align:left;' +
            'border:1px solid rgba(255,184,0,.45);background:rgba(255,184,0,.08);' +
            'border-radius:14px;padding:14px 16px;margin:0 0 14px">' +
            '<div style="font-weight:600;margin-bottom:6px">🎁 ' + title + '</div>' +
            '<div style="font-size:13px;opacity:.85;margin-bottom:10px">' + text + '</div>' +
            '<button class="meter-btn meter-btn-primary" id="meterGiftBtn" ' +
            'style="margin:0">' + btn + '</button></div>';
    }

    // Подарок приезжает асинхронно и вставляется в уже показанную стену:
    // ждать сеть перед показом нельзя — стена рисуется в момент, когда
    // человек уже упёрся, и лишняя секунда пустого экрана дороже.
    function _attachGift(overlay, source) {
        _loadGift(function (g) {
            var html = _giftBlock(g);
            if (!html || !overlay || !overlay.parentNode) return;
            // Три стены — две разные разметки: у дневной .meter-wall-box
            // с таймером и без витрины, у остальных .meter-modal. Якорь
            // ищем по смыслу, а не по вёрстке: подарок должен стоять
            // ВЫШЕ цены, иначе он читается как утешение после отказа.
            var modal = overlay.querySelector('.meter-modal, .meter-wall-box');
            if (!modal) return;
            var anchor = modal.querySelector('.meter-features-title')
                || modal.querySelector('#meterSubscribeBtn')
                || modal.querySelector('#meterUpsellSub');
            var box = document.createElement('div');
            box.innerHTML = html;
            var node = box.firstChild;
            if (anchor) modal.insertBefore(node, anchor);
            else modal.appendChild(node);

            // «Глубинный разбор вашего теста» из витрины Premium убираем:
            // он стоит строкой ниже подарка, и стена получалась бы
            // противоречивой — дарим и тут же продаём то же самое.
            try {
                var dup = modal.querySelector('.meter-features li[data-keys~="analysis"]');
                if (dup && dup.parentNode) dup.parentNode.removeChild(dup);
            } catch (e) {}

            _track('deep_gift_shown', { source: source || '', has_profile: !!g.has_profile });
            _whyGoal('deep_gift_shown');
            var b = document.getElementById('meterGiftBtn');
            if (b) b.onclick = function () {
                _track('deep_gift_clicked', { source: source || '', has_profile: !!g.has_profile });
                _whyGoal('deep_gift_clicked');
                _giftForget();
                _rememberDismiss();
                try { overlay.remove(); } catch (e) {}
                if (g.has_profile) _openAnalysis();
                else _openTest();
            };
        });
    }

    // Первая строка стены: имя, что человек только что делал, и почему
    // разговор прервался именно сейчас.
    function _personalLead(kind) {
        var who = _name();
        var did = _whatYouDid();
        var lead = who ? _esc(who) + ', ' : '';
        if (did) {
            lead += 'вы только что ' + did + '. ';
        }
        lead += (kind === 'trial')
            ? 'Бесплатное знакомство на этом заканчивается.'
            : 'На сегодня бесплатное время вышло.';
        return lead.charAt(0).toUpperCase() + lead.slice(1);
    }

    // Текст предупреждения о лимите. До 14.09.2026 здесь стоял чистый
    // отсчёт — «Осталось 3 мин на сегодня». Это сигнал закругляться, и
    // люди закруглялись: из 61 человека, получившего предупреждение, до
    // стены доходили 16. Отсчёт остался, но теперь он называет режим
    // («в бесплатном режиме») и говорит, что альтернатива существует, —
    // человек узнаёт о ней, пока разговор ещё идёт, а не когда его
    // прервали. Без давления: одна короткая строка, без цены и без кнопки.
    function _freeEndsToast(rem, kind) {
        var m = Math.max(1, Math.round(rem));
        return kind === 'trial'
            ? '⏱ Бесплатное знакомство закончится через ' + m + ' мин. Дальше — по подписке'
            : '⏱ В бесплатном режиме доступ закончится через ' + m + ' мин. Дальше — завтра или по подписке';
    }

    // Что человек теряет, если сейчас закроет. Воронка 14.09: из 61
    // человека, увидевшего предупреждение, до модалки доходят 16, и из них
    // жмут «Открыть подписку» 6. Модалка при этом начиналась со списка
    // возможностей Premium — то есть отвечала на вопрос «что я куплю», хотя
    // человек в этот момент думает «что я теряю». Строка ниже отвечает
    // именно на второй вопрос и только правдой: анонимный разговор
    // действительно не сохраняется (free_tier.session_history на бэкенде),
    // а у зарегистрированного он сохранён, и ждать придётся до завтра.
    function _whatBreaks(data, kind) {
        if (_authed() || (data && data.is_registered === true)) {
            return kind === 'trial'
                ? 'Разговор сохранён — он никуда не денется. Без Premium продолжение будет по бесплатным минутам, порциями.'
                : 'Разговор сохранён, и завтра Фреди начнёт с того же места. Вопрос только в том, ждать ли до завтра.';
        }
        return 'Этот разговор не сохранится: вы без аккаунта. Завтра Фреди не вспомнит ни слова — всё придётся рассказывать заново.';
    }

    function _track(event, data) {
        try {
            if (window.FrediTracker && window.FrediTracker.track) {
                window.FrediTracker.track(event, data || {});
            }
        } catch (e) {}
    }

    function _formatResetCountdown(minutesUntil) {
        if (!minutesUntil || minutesUntil <= 0) return '00:00';
        var h = Math.floor(minutesUntil / 60);
        var m = minutesUntil % 60;
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    // Сколько молчать после того, как человек закрыл стену.
    // Модалку зовут из шести мест (пре-чек apiCall, пре-чек fetch, ответ
    // 402 от обоих, синхронизация после recordUsage, клик по баджу), и
    // памяти о закрытии не было ни у одной: человек жал «Понятно, до
    // завтра» — и через пару секунд получал ту же стену снова. В логах
    // это выглядело как blocked → closed → blocked → closed восемь раз
    // за полторы минуты, после чего сессия заканчивалась.
    var PAYWALL_QUIET_SEC = 180;

    function _dismissedAgo() {
        try {
            var t = parseInt(sessionStorage.getItem('meterPaywallClosedAt') || '0', 10);
            return t ? (Date.now() - t) / 1000 : Infinity;
        } catch (e) { return _paywallClosedAt ? (Date.now() - _paywallClosedAt) / 1000 : Infinity; }
    }

    var _paywallClosedAt = 0;
    function _rememberDismiss() {
        _paywallClosedAt = Date.now();
        try { sessionStorage.setItem('meterPaywallClosedAt', String(_paywallClosedAt)); } catch (e) {}
    }

    // Сколько минут до местной полуночи. Нужно потому, что бэкенд отдаёт
    // minutes_until_reset = 0 для анонима без аккаунта — он не считает
    // время до сброса. Раньше при нуле стена не рисовала таймер вовсе и
    // говорила «Следующие бесплатные минуты придут в полночь». В ночь на
    // 17.09.2026 человек прочитал это в 00:55 по Москве: ждать было
    // четыре минуты, а он понял «приходите завтра», перезагрузил страницу
    // трижды и ушёл. Считаем сами — текст стены и так обещает полночь.
    function _minutesUntilMidnight() {
        var now = new Date();
        var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
        return Math.max(1, Math.ceil((next - now) / 60000));
    }

    // Когда жёсткая стена была ПОКАЗАНА. Отдельно от «закрыта»: закрыть её
    // нельзя, а тишина всё равно нужна — иначе каждая перезагрузка рисует
    // её заново. За 20 секунд 16.09.2026 один человек увидел её три раза.
    function _wallShownAgo() {
        try {
            var t = parseInt(sessionStorage.getItem('meterWallShownAt') || '0', 10);
            return t ? (Date.now() - t) / 1000 : Infinity;
        } catch (e) { return Infinity; }
    }
    function _rememberWallShown() {
        try { sessionStorage.setItem('meterWallShownAt', String(Date.now())); } catch (e) {}
    }

    // ===== Дневная стена =====
    //
    // Решение владельца 16.09.2026: когда дневное время вышло, на экране
    // остаётся ровно две вещи — сколько ждать до возобновления и кнопка
    // оплаты. Ни списка возможностей Premium, ни «что вы теряете», ни
    // кнопки «понятно, до завтра», ни закрытия по клику мимо: экран
    // темнеет, и до утра или до оплаты дальше хода нет.
    //
    // Прежняя стена была длинной модалкой с тремя кнопками и опросом
    // после закрытия. Она закрывалась — и человек оставался в приложении,
    // где всё равно ничего не работало.
    //
    // Сюда сведён и случай без аккаунта (block_reason='auth'): по решению
    // владельца 15.09.2026 на исчерпанном лимите мы зовём не заводить
    // аккаунт, а покупать пробные три дня — аккаунт создаётся самой
    // покупкой (subscription.js, _ensureAccount).
    function _showDailyWall(data) {
        _injectMeterStyles();
        var old = document.getElementById('meterOverlay');
        if (old) old.remove();

        // Ноль от бэкенда — не «ждать нечего», а «не посчитано»: считаем сами.
        var minutes = data.minutes_until_reset || 0;
        if (minutes <= 0) minutes = _minutesUntilMidnight();
        // Сколько минут вернётся. Числа не вписываем руками: у первого дня
        // это десять минут, дальше пять, и на анониме limit_minutes равен
        // нулю — тогда берём тот лимит, который будет с аккаунтом.
        var limit = data.limit_minutes || data.registered_limit_minutes || 5;
        // Час, в который лимит обновится: человек должен видеть не только
        // «через сколько», но и «когда» — со сна это разные вопросы.
        var resetAt = new Date(Date.now() + minutes * 60000);
        var resetHhMm = ('0' + resetAt.getHours()).slice(-2) + ':' +
                        ('0' + resetAt.getMinutes()).slice(-2);
        _rememberWallShown();
        _track('meter_blocked_shown', {
            limit_minutes: limit,
            minutes_until_reset: minutes,
            block_reason: data.block_reason || 'daily',
            wall_v: 'timer_only',
        });

        var overlay = document.createElement('div');
        overlay.className = 'meter-overlay meter-wall';
        overlay.id = 'meterOverlay';
        overlay.innerHTML =
            '<div class="meter-wall-box">' +
                '<div class="meter-wall-title">На сегодня время вышло</div>' +
                '<div class="meter-wall-lead">Следующие ' + limit +
                    ' бесплатных минут — в ' + resetHhMm + '. Осталось ждать:</div>' +
                '<div class="meter-wall-clock" id="meterTimer">' +
                    _formatResetCountdown(minutes) + ':00</div>' +
                (_minor(data) ? MINOR_NOTE :
                '<button class="meter-btn meter-btn-primary" id="meterSubscribeBtn">' +
                    'Купить пробный период — 99 ₽</button>' +
                '<div class="meter-wall-fine">Полный доступ: голос, все режимы, ' +
                    'без счётчика. Потом 990 ₽ в месяц, отключается в один клик.</div>') +
            '</div>';
        document.body.appendChild(overlay);
        _attachGift(overlay, 'daily_wall');
        // Ни клик мимо, ни Esc стену не убирают: закрывать её нечем — за
        // ней всё равно ничего не работает.
        overlay.addEventListener('click', function (e) { e.stopPropagation(); }, true);
        try { document.body.style.overflow = 'hidden'; } catch (e) {}

        var _sbDaily = document.getElementById('meterSubscribeBtn');
        if (_sbDaily) _sbDaily.onclick = function () {
            _track('meter_subscribe_clicked', { wall_v: 'timer_only' });
            _rememberDismiss();
            _closeDailyWall(overlay);
            if (typeof window.openCheckout === 'function') window.openCheckout('paywall');
            else if (typeof showSettingsScreen === 'function') showSettingsScreen();
        };

        {
            var el = document.getElementById('meterTimer');
            var left = minutes * 60;
            var iv = setInterval(function () {
                left--;
                if (left <= 0) {
                    clearInterval(iv);
                    _closeDailyWall(overlay);
                    _lastCheck = null;
                    _toast('Минуты вернулись — можно продолжать.', 'success');
                    return;
                }
                var h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
                if (el) el.textContent = (h < 10 ? '0' : '') + h + ':' +
                                         (m < 10 ? '0' : '') + m + ':' +
                                         (s < 10 ? '0' : '') + s;
            }, 1000);
            overlay.dataset.iv = String(iv);
        }
    }

    function _closeDailyWall(overlay) {
        try { document.body.style.overflow = ''; } catch (e) {}
        if (overlay && overlay.dataset.iv) clearInterval(+overlay.dataset.iv);
        if (overlay) overlay.remove();
    }

    function showFatigueModal(data) {
        // Внутри защищённого отрезка стена откладывается до его конца.
        if (_protect > 0) { _pendingWall = data; return; }
        data = data || {};
        var hard = (!data.block_reason || data.block_reason === 'daily'
                    || data.block_reason === 'auth');
        // Тишина теперь распространяется и на жёсткую стену. Раньше эта
        // проверка стояла НИЖЕ — после раннего выхода, — и жёсткая стена
        // её проскакивала: за 20 секунд один человек получал её трижды,
        // перезагружая страницу, и уходил. Мягкие стены были защищены,
        // неотменяемая — нет.
        if (_dismissedAgo() < PAYWALL_QUIET_SEC
            || (hard && _wallShownAgo() < PAYWALL_QUIET_SEC)) {
            _track('meter_blocked_suppressed', {
                block_reason: (data && data.block_reason) || '',
                since_dismiss_sec: Math.round(Math.min(_dismissedAgo(), _wallShownAgo())),
                hard: hard,
            });
            try { _toast('⏱ Минуты вернутся в полночь — Premium снимает счётчик', 'info'); } catch (e) {}
            return;
        }
        // Дневное время вышло — короткая стена с таймером и оплатой.
        // Случай без аккаунта ('auth') приходит сюда же: на пустом лимите
        // зовём покупать, а не регистрироваться.
        if (hard) {
            _showDailyWall(data);
            return;
        }
        _injectMeterStyles();
        var existing = document.getElementById('meterOverlay');
        if (existing) existing.remove();

        // Новичок в первой сессии цены не видит. Он ещё ничего не получил,
        // и счёт за десять минут знакомства читается как наказание —
        // отсюда 101 закрытая стена при одном клике. Ему говорим только
        // то, что правда: на сегодня всё, завтра снова открыто.
        //
        // Но ТОЛЬКО когда это правда. Стена общего запаса (trial) — не
        // «завтра снова», полночь запас не вернёт: новичку с пустой пробой
        // показываем обычную стену с ценой, иначе он ждёт завтра впустую —
        // ровно та ошибка, что лежала в аналитике 31.08 (блок daily и
        // блок trial одному человеку с разницей в 12 секунд).
        // 04.09: терминального 'trial' для текста больше нет — окно
        // «всё включено» ограничивает только голос, а флаг trial_exhausted
        // при этом честно торчит true у любого давнего пользователя.
        // Выбирать ветку по флагу теперь нельзя: дневная стена показала бы
        // «закончились навсегда» тому, у кого завтра снова будут минуты, —
        // зеркальная форма ошибки 31.08. Только по причине.
        var _trialBlocked = data.block_reason === 'trial';
        if (_newcomer() && !_trialBlocked) {
            // Дневная стена новичку — лучший момент для аккаунта: разговор
            // уже состоялся, и предложение читается как продолжение, а не
            // как турникет. Когда кончился общий запас, аккаунт минут не
            // добавит — там только Premium, и обещать было бы обманом.
            var softGain = (!data || data.block_reason !== 'trial')
                ? _accountGain(data) : null;
            _track('meter_blocked_soft', {
                block_reason: (data && data.block_reason) || '',
                visits: _visits(), exchanges: _exchanges,
                account_offer: !!softGain,
            });
            var soft = document.createElement('div');
            soft.className = 'meter-overlay';
            soft.id = 'meterOverlay';
            soft.innerHTML =
                '<div class="meter-modal">' +
                    '<div class="meter-emoji">\u23F1\uFE0F</div>' +
                    '<div class="meter-title">На сегодня всё</div>' +
                    '<div class="meter-text">' + _personalLead('daily') +
                        '<br>Завтра Фреди снова свободен — приходите, ' +
                        'разговор продолжится с этого места.' +
                        (softGain
                            ? '<br><br>С аккаунтом времени больше: ' + softGain.big +
                              ' минут в день вместо ' + softGain.small + '. ' +
                              'И разговор не потеряется, если смените устройство. ' +
                              'Нужна только почта.'
                            : '') +
                    '</div>' +
                    (softGain
                        ? '<button class="meter-btn meter-btn-primary" id="meterSoftReg">📩 Завести аккаунт — ' +
                          softGain.big + ' минут в день</button>'
                        : '') +
                    '<button class="meter-btn meter-btn-secondary" id="meterSoftClose">Понятно</button>' +
                '</div>';
            document.body.appendChild(soft);
            if (softGain) {
                document.getElementById('meterSoftReg').onclick = function () {
                    _rememberDismiss();
                    soft.remove();
                    _openRegister('meter_soft_wall');
                };
            }
            document.getElementById('meterSoftClose').onclick = function () {
                _track('meter_closed', { reason: 'soft_ok' });
                _rememberDismiss();
                soft.remove();
            };
            soft.onclick = function (e) {
                if (e.target === soft) { _rememberDismiss(); soft.remove(); }
            };
            return;
        }

        var minutesUntilReset = data.minutes_until_reset || 0;
        var limit = data.limit_minutes || 5;
        // \u0415\u0434\u0438\u043D\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0435 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435 \u0434\u043B\u044F paywall \u2014 \u0438\u0437\u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439
        // \u0437\u0430\u043F\u0430\u0441. \u0420\u0430\u043D\u044C\u0448\u0435 \u0441\u044E\u0434\u0430 \u043F\u043E\u043F\u0430\u0434\u0430\u043B\u0438 \u0438 \u043F\u043E \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0443 \u0434\u043D\u0435\u0439, \u0442\u043E \u0435\u0441\u0442\u044C \u043B\u044E\u0434\u0438,
        // \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043F\u043E\u0442\u0440\u0430\u0442\u0438\u0432\u0448\u0438\u0435: 10 \u043F\u043E\u043A\u0430\u0437\u043E\u0432 \u043F\u0440\u0438 8 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F\u0445 \u043D\u0430 \u0432\u0441\u044E \u0431\u0430\u0437\u0443
        // \u0438 \u043D\u043E\u043B\u044C \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u043E\u0432. \u0421\u043C\u043E\u0442\u0440\u0438\u043C \u043D\u0430 block_reason, \u0430 \u0435\u0441\u043B\u0438 \u0431\u044D\u043A\u0435\u043D\u0434 \u0441\u0442\u0430\u0440\u044B\u0439 \u2014
        // \u043D\u0430 trial_exhausted, \u043A\u0430\u043A \u0440\u0430\u043D\u044C\u0448\u0435.
        var trialExhausted = data.block_reason
            ? data.block_reason === 'trial'
            : !!data.trial_exhausted;
        var daysUsed = data.free_days_used || 0;
        var trialLimit = data.trial_limit_minutes || 15;
        // Человеку без аккаунта дневная стена предлагает сначала аккаунт, и
        // только потом цену: между «ничего» и 990 ₽ должна быть ступенька,
        // которая ничего не стоит и что-то даёт. На стене общего запаса
        // ступеньки нет — минуты там уже не про аккаунт.
        var gain = (data.block_reason === 'trial' || data.block_reason === 'voice')
            ? null : _accountGain(data);

        _track('meter_blocked_shown', {
            limit_minutes: limit,
            minutes_until_reset: minutesUntilReset,
            trial_exhausted: trialExhausted,
            block_reason: data.block_reason || (trialExhausted ? 'trial' : 'daily'),
            trial_used_minutes: data.trial_used_minutes,
            free_days_used: daysUsed,
            account_offer: !!gain,
            wall_v: 'what_breaks',
        });

        var emoji, title, mainText, timerHtml;

        // 04.09: ветка выбирается по block_reason. Флаг trial_exhausted у
        // давнего пользователя всегда true (окно «всё включено» выговорено),
        // но его текст работает каждый день — финальную стену по флагу ему
        // показывать нельзя. 'trial' с бэка больше не приходит; ветка
        // оставлена для старых сборок бэка на время выката.
        if (data.block_reason === 'voice') {
            // Голосовая стена: дневные минуты ещё есть, кончился только
            // голос. Не смешиваем с дневной — голос в полночь не вернётся.
            emoji = '\uD83C\uDF99\uFE0F';
            title = 'Голосовые минуты знакомства закончились';
            mainText = 'Текстом можно продолжать бесплатно — дневной лимит ' +
                'на месте. Голос возвращается с Premium: без счётчика, ' +
                'в любое время.';
            timerHtml = '';
        } else if (data.block_reason === 'trial') {
            // Финальная стена: бесплатный запас израсходован.
            emoji = '\uD83D\uDD13';
            title = 'Бесплатные ' + trialLimit + ' минут закончились';
            mainText = _personalLead('trial') +
                '<br>С Premium разговор продолжается без счётчика.';
            timerHtml = '';
        } else {
            // Дневной лимит исчерпан, общий запас ещё есть.
            emoji = '\u23F1\uFE0F';
            title = 'На сегодня время вышло';
            mainText = _personalLead('daily') +
                '<br>Завтра снова будут ' + limit + ' бесплатных минут — ' +
                'или можно продолжить прямо сейчас.' +
                (gain
                    ? '<br><br>' + _gainPhrase(gain, false) + ' Нужна только почта — ' +
                      'и разговор перестанет зависеть от того, с какого ' +
                      'устройства вы зашли.'
                    : '');
            timerHtml = minutesUntilReset > 0
                ? '<div class="meter-timer" id="meterTimer">Новый день через ' + _formatResetCountdown(minutesUntilReset) + '</div>'
                : '';
        }

        var overlay = document.createElement('div');
        overlay.className = 'meter-overlay';
        overlay.id = 'meterOverlay';
        overlay.innerHTML =
            '<div class="meter-modal">' +
                '<div class="meter-emoji">' + emoji + '</div>' +
                '<div class="meter-title">' + title + '</div>' +
                timerHtml +
                '<div class="meter-text">' + mainText + '</div>' +
                '<div class="meter-text" style="border-left:3px solid #3b82ff;padding-left:10px;margin:0 0 14px;text-align:left">' +
                    _whatBreaks(data, data.block_reason || (trialExhausted ? 'trial' : 'daily')) + '</div>' +
                '<div class="meter-features-title">Что даёт Premium:</div>' +
                _premiumFeatures() +
                AUTHOR_NOTE +
                (gain
                    ? '<button class="meter-btn meter-btn-primary" id="meterRegBtn">\uD83D\uDCE9 \u0417\u0430\u0432\u0435\u0441\u0442\u0438 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u2014 ' +
                      gain.big + ' \u043C\u0438\u043D\u0443\u0442 \u0432 \u0434\u0435\u043D\u044C</button>'
                    : '') +
                (_minor(data) ? MINOR_NOTE :
                '<button class="meter-btn ' + (gain ? 'meter-btn-secondary' : 'meter-btn-primary') +
                    // «Попробовать» ставит человека перед покупкой, «продолжить» —
                    // перед продолжением того, что он уже делает. Кнопка на стене
                    // должна называть действие, ради которого он сюда пришёл.
                    '" id="meterSubscribeBtn">▶️ Продолжить сейчас — 3 дня 99 ₽</button>' +
                '<div class="meter-price-note" style="font-size:12px;opacity:.65;margin:2px 0 6px">Полный Premium на три дня: голос, все режимы, без счётчика. Потом 990 ₽ в месяц — меньше одной очной консультации; отключить можно в один клик.</div>') +
                // Голосовая стена: голос завтра не вернётся, а текст доступен
                // прямо сейчас — кнопка так и говорит. До 12.09.2026 здесь
                // стояло «Понятно, до завтра», и вернувшийся с аккаунтом
                // уходил, хотя мог продолжить текстом.
                (data.block_reason === 'voice'
                    ? '<button class="meter-btn meter-btn-secondary" id="meterCloseBtn">Продолжу текстом</button>'
                    : trialExhausted
                    ? '<button class="meter-btn meter-btn-secondary" id="meterCloseBtn">\u041F\u043E\u0434\u0443\u043C\u0430\u044E \u043F\u043E\u0437\u0436\u0435</button>'
                    : '<button class="meter-btn meter-btn-secondary" id="meterCloseBtn">\u041F\u043E\u043D\u044F\u0442\u043D\u043E, \u0434\u043E \u0437\u0430\u0432\u0442\u0440\u0430</button>') +
            '</div>';
        document.body.appendChild(overlay);
        _attachGift(overlay, data.block_reason || (trialExhausted ? 'trial' : 'daily'));

        if (gain) {
            document.getElementById('meterRegBtn').onclick = function () {
                _rememberDismiss();
                overlay.remove();
                _openRegister('meter_wall');
            };
        }
        document.getElementById('meterCloseBtn').onclick = function() {
            _track('meter_closed', { reason: 'continue_tomorrow' });
            _rememberDismiss();
            overlay.remove();
            setTimeout(function () { askWhyNot('wall'); }, 400);
        };
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                _track('meter_dismissed_outside', {});
                _rememberDismiss();
                overlay.remove();
            }
        };
        var _sbWall = document.getElementById('meterSubscribeBtn');
        if (_sbWall) _sbWall.onclick = function() {
            _track('meter_subscribe_clicked', { wall_v: 'what_breaks' });
            // Иначе фоновая проверка накрывает стеной открывшийся чекаут.
            _rememberDismiss();
            overlay.remove();
            // Прямой чекаут из paywall (email + ЮKassa в один шаг),
            // без ухода в настройки, где оплата терялась.
            if (typeof window.openCheckout === 'function') {
                window.openCheckout('paywall');
            } else if (typeof showSettingsScreen === 'function') {
                showSettingsScreen();
            }
        };

        // \u0422\u0438\u043A\u0430\u044E\u0449\u0438\u0439 \u043E\u0431\u0440\u0430\u0442\u043D\u044B\u0439 \u043E\u0442\u0441\u0447\u0451\u0442 \u0434\u043E 00:00 UTC.
        if (minutesUntilReset > 0) {
            var timerEl = document.getElementById('meterTimer');
            var secsLeft = minutesUntilReset * 60;
            var iv = setInterval(function() {
                secsLeft--;
                if (secsLeft <= 0) {
                    clearInterval(iv);
                    overlay.remove();
                    _lastCheck = null;
                    _toast('\u0424\u0440\u0435\u0434\u0438 \u043E\u0442\u0434\u043E\u0445\u043D\u0443\u043B! \u041C\u043E\u0436\u043D\u043E \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C.', 'success');
                    return;
                }
                var h = Math.floor(secsLeft / 3600);
                var m = Math.floor((secsLeft % 3600) / 60);
                var s = secsLeft % 60;
                if (timerEl) {
                    timerEl.textContent = '\u0421\u0438\u043B\u044B \u0432\u0435\u0440\u043D\u0443\u0442\u0441\u044F \u0447\u0435\u0440\u0435\u0437 ' +
                        (h < 10 ? '0' : '') + h + ':' +
                        (m < 10 ? '0' : '') + m + ':' +
                        (s < 10 ? '0' : '') + s;
                }
            }, 1000);
        }
    }

    // Мягкий апселл ДО блокировки. Показывается один раз ЗА СЕССИЮ
    // на critical-уровне (≤2 мин остатка). В отличие от soft-тоста —
    // это полноценная карточка с достижимой кнопкой Premium, поэтому
    // предложение вообще появляется до исчерпания лимита (по аналитике
    // paywall на самом блоке видели ~0 юзеров: сессия короче лимита).
    // Не блокирует ввод — юзер может закрыть и продолжить оставшиеся минуты.
    function showUpsellCard(check, kind) {
        _injectMeterStyles();
        if (document.getElementById('meterUpsellOverlay')) return;
        var rem = (check && check.remaining_minutes != null) ? Math.max(1, Math.round(check.remaining_minutes)) : 2;
        kind = kind || 'daily';
        // До подписки у человека без аккаунта есть более дешёвый шаг, и
        // предлагать сразу цену — значит пропускать его. На «кончается
        // сегодняшнее время» аккаунт добавляет минут прямо сейчас; на
        // «кончается весь бесплатный запас» — уже нет, там только Premium.
        var upGain = kind === 'trial' ? null : _accountGain(check);
        _rememberUpsellShown();
        _track('meter_upsell_shown', {
            remaining_minutes: rem, kind: kind, account_offer: !!upGain,
        });

        // Два разных сообщения. «На сегодня всё» — новость на один вечер,
        // человек вернётся и без подписки. «Бесплатные минуты кончаются» —
        // единственный момент, когда предложение Premium вообще по делу.
        var title = kind === 'trial'
            ? 'Бесплатных минут осталось ~' + rem
            : 'Осталось ~' + rem + ' мин на сегодня';
        var did = _whatYouDid();
        var who = _name();
        var text = (who ? _esc(who) + ', ' : '')
            + (did ? 'вы ' + did + ' — и до конца ' : 'до конца ')
            + (kind === 'trial' ? 'бесплатного знакомства' : 'сегодняшнего времени')
            + ' осталось около ' + rem + ' мин. '
            + (upGain
                ? _gainPhrase(upGain, true) + ' Почта — и разговор продолжается. ' +
                  'С Premium счётчика нет вовсе.'
                // «Весь Лекторий с озвучкой» отсюда убрано по той же причине,
                // что из PREMIUM_FEATURES: Лекторий открыт всем, обещание
                // проверялось одним кликом и топило доверие к остальному.
                : 'С Premium счётчик исчезает: разговор, голос, карты, сны, игры — всё без лимита.');
        text = text.charAt(0).toUpperCase() + text.slice(1);

        var overlay = document.createElement('div');
        overlay.className = 'meter-overlay';
        overlay.id = 'meterUpsellOverlay';
        overlay.innerHTML =
            '<div class="meter-modal">' +
                '<div class="meter-emoji">⏱️</div>' +
                '<div class="meter-title">' + title + '</div>' +
                '<div class="meter-text">' + text + '</div>' +
                _premiumFeatures() +
                AUTHOR_NOTE +
                (upGain
                    ? '<button class="meter-btn meter-btn-primary" id="meterUpsellReg">📩 Завести аккаунт — ' +
                      upGain.big + ' минут в день</button>'
                    : '') +
                (_minor(check) ? MINOR_NOTE :
                '<button class="meter-btn ' + (upGain ? 'meter-btn-secondary' : 'meter-btn-primary') +
                    '" id="meterUpsellSub">✨ Попробовать 3 дня — 99 ₽</button>' +
                '<div class="meter-price-note" style="font-size:12px;opacity:.65;margin:2px 0 6px">Полный Premium на три дня: голос, все режимы, без счётчика. Потом 990 ₽ в месяц — меньше одной очной консультации; отключить можно в один клик.</div>') +
                '<button class="meter-btn meter-btn-secondary" id="meterUpsellClose">Ещё немного</button>' +
            '</div>';
        document.body.appendChild(overlay);
        _attachGift(overlay, 'upsell_' + (kind || ''));

        if (upGain) {
            document.getElementById('meterUpsellReg').onclick = function () {
                overlay.remove();
                _openRegister('upsell_critical');
            };
        }
        document.getElementById('meterUpsellClose').onclick = function() {
            _track('meter_upsell_dismissed', { reason: 'later' });
            overlay.remove();
            setTimeout(function () { askWhyNot('upsell'); }, 400);
        };
        overlay.onclick = function(e) {
            if (e.target === overlay) { _track('meter_upsell_dismissed', { reason: 'outside' }); overlay.remove(); }
        };
        var _sbUp = document.getElementById('meterUpsellSub');
        if (_sbUp) _sbUp.onclick = function() {
            _track('meter_subscribe_clicked', { source: 'upsell_critical' });
            overlay.remove();
            if (typeof window.openCheckout === 'function') {
                window.openCheckout('upsell');
            } else if (typeof showSettingsScreen === 'function') {
                showSettingsScreen();
            }
        };
    }

    // Предложение подписки по ссылке с сайта: /fredi/?sub=<тема>&from=<страница>.
    // Результат теста и популярные статьи — самые посещаемые адреса сайта
    // (за 30 дней до 13.09.2026: 9078 визитов, 8 кликов «подписаться», все
    // с /fredi/ и одной статьи). На самих страницах подписка не упоминалась
    // вовсе, всё было «бесплатно и без регистрации». Теперь страница
    // называет, что открывает подписка по её теме, а кнопка ведёт сюда:
    // человек видит тот же список, что на стене, и кнопку оплаты — без
    // ожидания, пока кончатся минуты. Без суточного ограничения показа:
    // человек пришёл по кнопке сам.
    var SITE_LEADS = {
        phq9: 'Результат PHQ-9 у вас на руках. ',
        gad7: 'Результат GAD-7 у вас на руках. ',
        revnost: 'Тип ревности вы уже знаете. ',
        lyubit: 'Результат теста у вас на руках. ',
        vygoranie: 'Где горит — вы уже увидели. ',
        odinochestvo: 'Свой тип одиночества вы уже знаете. ',
        samozvanec: 'Свой балл вы уже знаете. ',
        express: 'Ведущую стратегию вы уже знаете. ',
        kpt: 'Техники из статьи — на бумаге. ',
        trevoga: 'Семь техник из статьи — на бумаге. ',
        rasstavanie: 'Фазы расставания вы прочитали. ',
        iskazheniya: 'Справочник искажений вы прочитали. ',
        gipnoz: 'Инструкцию вы прочитали. ',
        myshlenie: 'Статью вы прочитали. ',
    };
    function showSiteOffer(topic, from) {
        try {
            if (_lastCheck && _lastCheck.is_premium) return;
            if (document.getElementById('meterSiteOverlay')) return;
            _injectMeterStyles();
            topic = String(topic || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 24);
            _track('meter_site_offer_shown', { topic: topic, from: from || '' });
            var who = _name();
            var lead = SITE_LEADS[topic] || '';
            var overlay = document.createElement('div');
            overlay.className = 'meter-overlay';
            overlay.id = 'meterSiteOverlay';
            overlay.innerHTML =
                '<div class="meter-modal">' +
                    '<div class="meter-emoji">💎</div>' +
                    '<div class="meter-title">Что открывает подписка</div>' +
                    '<div class="meter-text">' + (who ? _esc(who) + ', ' + lead.charAt(0).toLowerCase() + lead.slice(1) : lead) +
                        'Дальше — работа с Фреди, который помнит вас и не считает минуты.</div>' +
                    _premiumFeatures() +
                    AUTHOR_NOTE +
                    '<button class="meter-btn meter-btn-primary" id="meterSiteSub">✨ Попробовать 3 дня — 99 ₽</button>' +
                    '<div class="meter-price-note" style="font-size:12px;opacity:.65;margin:2px 0 6px">Полный Premium на 3 дня, потом 990 ₽ в месяц; отключить можно в один клик в разделе «Подписка». Оплата картой любого российского банка через ЮKassa.</div>' +
                    '<button class="meter-btn meter-btn-secondary" id="meterSiteFree">Сначала поговорить бесплатно</button>' +
                '</div>';
            document.body.appendChild(overlay);
            document.getElementById('meterSiteSub').onclick = function () {
                _track('meter_subscribe_clicked', { source: 'site_' + topic });
                overlay.remove();
                if (typeof window.openCheckout === 'function') {
                    window.openCheckout('site_' + topic);
                } else if (typeof showSettingsScreen === 'function') {
                    showSettingsScreen();
                }
            };
            document.getElementById('meterSiteFree').onclick = function () {
                _track('meter_site_offer_dismissed', { topic: topic });
                overlay.remove();
                setTimeout(function () { askWhyNot('site_' + topic); }, 400);
            };
            overlay.onclick = function (e) {
                if (e.target === overlay) { _track('meter_site_offer_dismissed', { topic: topic, reason: 'outside' }); overlay.remove(); }
            };
        } catch (e) { console.warn('[meter] site offer', e); }
    }

    // Опрос на закрытии любой карточки подписки: «что остановило?».
    // Владелец, 13.09.2026: за месяц 70 стен, 8 кликов, 4 оплаты — и ни
    // одного ответа, почему остальные ушли. Четыре кнопки, одно нажатие,
    // событие sub_why_not {reason, source}. Раз в день на человека.
    //
    // 15.09.2026: ответы два дня уходили в никуда. В Метрику отправлялась
    // одна цель sub_why_not — незарегистрированная, Метрика такие молча
    // выбрасывает, — и без причины. Сама причина оставалась только в
    // fredi_analytics, куда без админ-токена не заглянуть. Поэтому теперь
    // на каждый ответ уходит своя цель (sub_why_expensive и так далее), а
    // на показ — sub_why_shown: без него доля ответивших неизвестна.
    // Цели заведены в счётчике приложения 108965607; сайтовый 108138656
    // упёрся в лимит 200 целей, и лишние вызовы там просто не считаются.
    var WHY_KEY = 'meter_why_not_day';
    var WHY_REASONS = [
        ['expensive', 'Дорого'],
        ['unclear', 'Не понял, что даёт'],
        ['doubt', 'Не верю, что поможет'],
        ['later', 'Попробую потом'],
    ];
    // Цель Метрики на каждый ответ: ym-цели не принимают параметров, и
    // разбивку по причинам даёт только отдельная цель на причину.
    var WHY_GOAL = {
        expensive: 'sub_why_expensive',
        unclear: 'sub_why_unclear',
        doubt: 'sub_why_doubt',
        later: 'sub_why_later',
        skip: 'sub_why_skip',
    };
    function _whyGoal(name) {
        if (!name || typeof ym !== 'function') return;
        try { ym(108965607, 'reachGoal', name); } catch (e) {}
        try { ym(108138656, 'reachGoal', name); } catch (e) {}
    }

    function askWhyNot(source) {
        try {
            if (_lastCheck && _lastCheck.is_premium) return;
            // Ребёнку опрос «что остановило от подписки» не задаём: ему
            // подписку и не предлагали.
            if (_minor(_lastCheck)) return;
            var today = new Date().toISOString().slice(0, 10);
            var shown = '';
            try { shown = localStorage.getItem(WHY_KEY) || ''; } catch (e) {}
            if (shown === today) return;
            if (document.getElementById('meterWhyOverlay')) return;
            try { localStorage.setItem(WHY_KEY, today); } catch (e) {}
            _injectMeterStyles();
            _track('sub_why_not_shown', { source: source || '' });
            _whyGoal('sub_why_shown');
            var overlay = document.createElement('div');
            overlay.className = 'meter-overlay';
            overlay.id = 'meterWhyOverlay';
            var btns = '';
            for (var i = 0; i < WHY_REASONS.length; i++) {
                btns += '<button class="meter-btn meter-btn-secondary" data-why="' + WHY_REASONS[i][0] + '" style="margin-bottom:8px">' + WHY_REASONS[i][1] + '</button>';
            }
            overlay.innerHTML =
                '<div class="meter-modal">' +
                    '<div class="meter-title" style="font-size:18px">Один вопрос: что остановило?</div>' +
                    '<div class="meter-text">Без обязательств. Ответ помогает сделать Фреди лучше.</div>' +
                    btns +
                    '<button class="meter-btn" id="meterWhySkip" style="background:none;color:#8e8e93;font-size:13px">Не отвечать</button>' +
                '</div>';
            document.body.appendChild(overlay);
            var done = function (reason) {
                _track('sub_why_not', { reason: reason, source: source || '' });
                _whyGoal(WHY_GOAL[reason]);
                overlay.remove();
            };
            var list = overlay.querySelectorAll('[data-why]');
            for (var j = 0; j < list.length; j++) {
                list[j].onclick = function () { done(this.getAttribute('data-why')); };
            }
            document.getElementById('meterWhySkip').onclick = function () { done('skip'); };
            overlay.onclick = function (e) { if (e.target === overlay) done('skip'); };
        } catch (e) { console.warn('[meter] why-not', e); }
    }

    function _patchApiCall() {
        if (!window.apiCall || window._apiCallPatched) return;
        var _origApiCall = window.apiCall;
        window._apiCallPatched = true;
        window.apiCall = async function(endpoint, options) {
            var isAi = _isAiRequest(endpoint);
            if (isAi && options && (options.method === 'POST' || options.body)) {
                var check = await checkCanSend();
                if (!check.can_send) { showFatigueModal(check); throw new Error('METER_BLOCKED'); }
                _showWarningToast(check);
            }
            var result = await _origApiCall(endpoint, options);
            if (result && result.error === 'METER_BLOCKED') {
                _lastCheck = null;
                showFatigueModal(result);
            }
            // ВАЖНО: здесь recordUsage НЕ вызываем. _origApiCall внутри
            // ходит через window.fetch, который уже пропатчен (_patchFetch)
            // и сам записывает расход. Если записать ещё и тут — один
            // AI-запрос спишет лимит дважды (15с в fetch + до 60с тут =
            // до 75с за сообщение), и free-юзер упрётся в paywall в 3-5 раз
            // быстрее положенного. Расход пишет ровно один слой — fetch.
            return result;
        };
        console.log('meter: apiCall patched');
    }

    // Список AI-эндпоинтов, которые должен предварять meter-чек.
    // Держим в синхроне с _METER_AI_REGEX в backend/main.py.
    // voice\/process РАНЬШЕ не матчил /api/voice/process_stream (после
    // «process» шёл «_», а граница ждала /|$|? ) — из-за чего HTTP-путь
    // голоса проходил мимо пейволла И мимо учёта расхода. Расширяем до
    // process(_stream)?|stt|tts — в синхрон с _METER_AI_REGEX на бэке.
    // mirrors/complete отсюда убран 15.09.2026 — он разъехался с бэком.
    // Там его вынесли из _METER_AI_REGEX намеренно: это чистая запись в
    // fredi_mirrors, ни одного токена, и зовётся она в самом конце теста,
    // когда пятнадцать минут уже потрачены. Бэк пропускал, а клиент гасил
    // запрос своей же стеной, и зеркало у приглашённого молча не
    // активировалось — пригласивший не получал ничего.
    var AI_URL_REGEX = /\/api\/(?:chat|voice\/(?:process(?:_stream)?|stt|tts)|ai\/generate|deep-analysis|hypno\/support|psychologist-thoughts\/generate|dreams\/(?:interpret|clarify)|reality\/(?:check|parse\/[^/]+)|brand\/transformation|morning\/send-now|natal\/interpret|tarot\/interpret|horoscope)(?:\/|$|\?)/;

    function _isAiRequest(urlStr) {
        return AI_URL_REGEX.test(urlStr || '');
    }

    // Начатое доводится до конца (правило владельца 15.09.2026). Тест идёт
    // пятнадцать минут и сам же тратит минуты — то есть лимит кончается
    // ровно посреди него чаще всего. Стена в этот момент отнимает не
    // разговор, а сорок отвеченных вопросов: человек не получает ни
    // результата, ни причины возвращаться, и назад он не садится.
    //
    // Поэтому на время теста стена не показывается и запросы не гасятся,
    // а отложенная стена выходит СРАЗУ ПОСЛЕ результата. Это не потеря
    // продажи, а перенос её в пиковый момент: человек только что узнал
    // о себе что-то новое — он и готов действовать.
    var _protect = 0;
    var _pendingWall = null;
    function isProtected() { return _protect > 0; }
    function protect(on) {
        if (on) { _protect++; return; }
        _protect = Math.max(0, _protect - 1);
        if (_protect === 0 && _pendingWall) {
            var data = _pendingWall;
            _pendingWall = null;
            // Даём результату встать на экран, и только потом стена.
            setTimeout(function () { showFatigueModal(data); }, 1200);
        }
    }

    function _patchFetch() {
        if (window._fetchMeterPatched) return;
        var _origFetch = window.fetch;
        window._fetchMeterPatched = true;
        window.fetch = async function(url, options) {
            var urlStr = typeof url === 'string' ? url : (url && url.url) || '';
            var isAi = _isAiRequest(urlStr);
            var method = (options && options.method) || 'GET';
            if (isAi && method === 'POST') {
                var check = await checkCanSend();
                if (!check.can_send && _protect > 0) {
                    // Начатое доводим до конца: запрос пропускаем, а стену
                    // запоминаем и покажем, когда отрезок закончится.
                    _pendingWall = check;
                } else if (!check.can_send) {
                    showFatigueModal(check);
                    return new Response(JSON.stringify({ success: false, error: 'METER_BLOCKED', response: check.message || '\u0424\u0440\u0435\u0434\u0438 \u0443\u0441\u0442\u0430\u043B' }), { status: 402, headers: { 'Content-Type': 'application/json' } });
                }
                _showWarningToast(check);
            }
            var response = await _origFetch.call(window, url, options);
            // Если бэк сам заблокировал (402) — достаём данные и показываем модалку.
            if (isAi && response.status === 402) {
                try {
                    var cloned = response.clone();
                    var blocked = await cloned.json();
                    if (blocked && blocked.error === 'METER_BLOCKED') {
                        _lastCheck = null;
                        showFatigueModal(blocked);
                    }
                } catch (e) {}
            }
            if (isAi && response.ok) recordExchange();
            return response;
        };
        console.log('meter: fetch patched');
    }

    // ============================================
    // PERSISTENT TIMER BADGE — правый верхний угол
    // ============================================
    // Идея: в trial юзер видит бадж «⏱ 7:32 · День 2/3» постоянно.
    // Полный функционал работает, но лимит виден → создаёт ясное
    // ощущение «free trial идёт» без агрессивного pull-в-подписку.
    //
    // Цвет:
    //   серый    — > 5 мин осталось
    //   жёлтый   — 1–5 мин
    //   красный  — < 1 мин
    // Premium-юзер бадж не видит вообще.

    function _formatTime(minutes) {
        if (minutes == null || minutes < 0) minutes = 0;
        var totalSec = Math.max(0, Math.round(minutes * 60));
        var m = Math.floor(totalSec / 60);
        var s = totalSec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function _ensureBadge() {
        _injectBadgeStyles();
        var badge = document.getElementById('meterBadge');
        if (badge) return badge;
        badge = document.createElement('div');
        badge.id = 'meterBadge';
        badge.className = 'meter-badge';
        // Подпись всплывает по наведению и на десктопе читается раньше клика.
        // С 04.09 лимит снова дневной и обновляется в полночь — подпись
        // обязана обещать ровно это, ни больше ни меньше: прошлая версия
        // («10 минут на аккаунт, дальше 990») осталась бы враньём в другую
        // сторону — человек не ждал бы завтрашних минут, которые придут.
        badge.title = 'Бесплатные минуты на сегодня — завтра будут снова. Premium — без счётчика.';
        badge.innerHTML = '<span class="meter-badge-icon">⏱</span>'
            + '<span class="meter-badge-time" id="meterBadgeTime">--:--</span>'
            + '<span class="meter-badge-day" id="meterBadgeDay"></span>';
        // Клик по баджу. Раньше он ВСЕГДА открывал модалку блокировки:
        // человек с нетронутым лимитом тыкал в таймер из любопытства и
        // видел стену «10 минут сегодня исчерпаны». В аналитике это лежало
        // как meter_blocked_shown с trial_used_minutes=0 и
        // minutes_until_reset=0 — блок, которого не было. Стена — только
        // когда блок настоящий; иначе — остатки цифрами.
        badge.addEventListener('click', function () {
            var c = _lastCheck;
            try {
                if (window.FrediTracker && window.FrediTracker.track) {
                    window.FrediTracker.track('meter_badge_clicked',
                        { blocked: !!(c && c.can_send === false) });
                }
            } catch (e) {}
            if (!c) return;
            if (c.can_send === false) { showFatigueModal(c); return; }
            var day = c.remaining_today_minutes;
            var trial = c.remaining_trial_minutes;
            if (day == null && trial == null) return;
            var parts = [];
            if (day != null) parts.push('сегодня осталось ' + Math.round(day) + ' мин');
            // Про окно «всё включено» — только пока оно есть. «Запас — 0 мин»
            // у давнего пользователя читался бы как «всё кончилось», хотя
            // кончился только голос, а текст обновляется каждый день.
            if (trial != null && trial > 0) parts.push('🎙 голос — ещё ' + Math.round(trial) + ' мин');
            _toast('⏱ ' + parts.join(' · '), 'info');
        });
        document.body.appendChild(badge);
        return badge;
    }

    function _renderBadge(check) {
        // Premium / нет данных / не free-юзер → бадж не показываем.
        if (!check || check.is_premium) {
            var existing = document.getElementById('meterBadge');
            if (existing) existing.remove();
            return;
        }
        var badge = _ensureBadge();
        var rem = check.remaining_minutes;
        var trialRem = check.remaining_trial_minutes;
        // Красное «Купить» — только когда отправка действительно закрыта.
        // Здесь стояло `if (check.trial_exhausted)` — зеркало ошибки 31.08,
        // уже починенной в стене (строка ~490), но не тут: с 04.09 флаг
        // trial_exhausted навсегда true у каждого со второго дня, а его
        // дневные минуты при этом на месте. Человек с полными пятью
        // минутами видел бы в углу красное «Trial · Купить» вместо счётчика
        // — постоянный сигнал «всё кончилось» при работающем бесплатном
        // уровне.
        if (check.can_send === false) {
            badge.classList.remove('warn');
            badge.classList.add('danger');
            var t = document.getElementById('meterBadgeTime');
            var d = document.getElementById('meterBadgeDay');
            if (t) t.textContent = '0:00';
            if (d) {
                // 'trial' приходит только со старого бэка, где запас
                // терминальный — там «Купить» правда. Дневная пауза —
                // «до завтра»: минуты вернутся, врать «кончилось» нельзя.
                d.textContent = (check.block_reason === 'trial') ? 'Купить' : 'до завтра';
                d.style.display = '';
            }
            return;
        }
        // Цвет по остатку минут.
        badge.classList.remove('warn', 'danger');
        if (rem != null) {
            if (rem < 1) badge.classList.add('danger');
            else if (rem <= 5) badge.classList.add('warn');
        }
        var timeEl = document.getElementById('meterBadgeTime');
        var dayEl = document.getElementById('meterBadgeDay');
        if (timeEl) timeEl.textContent = _formatTime(rem);
        if (dayEl) {
            // Вторая строка баджа — окно «всё включено» (04.09): пока оно
            // не выговорено, бесплатному уровню доступен и голос. «Запас»
            // тут больше писать нельзя — общий запас текст не ограничивает,
            // и слово обещало бы стену, которой нет.
            if (trialRem != null && trialRem > 0) {
                dayEl.textContent = '\uD83C\uDF99 голос: ' + Math.max(1, Math.round(trialRem)) + ' мин';
                dayEl.style.display = '';
            } else {
                // Окно выговорено: голос в Premium, текст — по дневному
                // лимиту из первой строки. Вторая строка молчит.
                dayEl.style.display = 'none';
            }
        }
    }

    // Локально тикаем таймер каждую секунду (без походов на сервер),
    // отталкиваясь от последнего известного remaining_minutes.
    var _tickInterval = null;
    function _startBadgeTicker() {
        if (_tickInterval) return;
        _tickInterval = setInterval(function () {
            // Если есть текущий чек, мы УЖЕ показали бадж.
            // Каждую секунду уменьшаем local-копию remaining_minutes на 1/60.
            // Бэк всё равно — источник правды; периодически (раз в 60 сек)
            // дёргаем checkCanSend, чтобы синхронизироваться.
            if (!_lastCheck || _lastCheck.is_premium) return;
            // Уменьшаем local remaining только если идёт активный chat?
            // Безопаснее НЕ уменьшать, а просто перерисовывать —
            // обновление пойдёт через recordUsage → invalidate cache → next checkCanSend.
            _renderBadge(_lastCheck);
        }, 1000);

        // Каждые 60 сек — освежаем данные с сервера.
        setInterval(function () {
            _lastCheck = null;
            checkCanSend().then(function (data) { _renderBadge(data); });
        }, 60000);
    }

    // При первой возможности — рисуем бадж.
    function _initBadge() {
        if (!_uid()) {
            // user_id не готов, повторим через 1 сек.
            setTimeout(_initBadge, 1000);
            return;
        }
        checkCanSend().then(function (data) {
            _renderBadge(data);
            _startBadgeTicker();
        });
    }

    function _applyPatches() {
        _patchFetch();
        _initBadge();
        _markPremiumNav();
        if (window.apiCall) { _patchApiCall(); }
        else {
            setTimeout(function() { if (window.apiCall) _patchApiCall(); }, 2000);
            setTimeout(function() { if (window.apiCall) _patchApiCall(); }, 5000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _applyPatches);
    } else {
        _applyPatches();
    }

    // Предложение подписки в пиковый момент, а не по таймеру.
    // Выгрузка диалогов и Метрика за 5 сентября: до стены оплаты по
    // счётчику дошли двое за день, потому что пять бесплатных минут не
    // кончаются, а самые долгие разговоры — голосовые и без подписки.
    // Пиковых моментов три: Фреди подвёл итог и позвал продолжить завтра
    // (ритуал завершения из промпта), готов профиль большого теста, готова
    // интерпретация натальной карты. В эти секунды человек только что
    // получил ценность, и «сохранить и продолжать» читается как
    // продолжение, а не как турникет. Карточка не блокирует, закрывается
    // кликом мимо, показывается не чаще раза в сутки на браузер.
    var PEAK_KEY = 'meter_peak_offer_day';
    function showPeakOffer(source) {
        try {
            if (_lastCheck && _lastCheck.is_premium) return;
            var today = new Date().toISOString().slice(0, 10);
            var shown = '';
            try { shown = localStorage.getItem(PEAK_KEY) || ''; } catch (e) {}
            if (shown === today) return;
            if (document.getElementById('meterOverlay') || document.getElementById('meterUpsellOverlay')
                || document.getElementById('meterPeakOverlay') || document.getElementById('faAuthModal')) return;
            _injectMeterStyles();
            try { localStorage.setItem(PEAK_KEY, today); } catch (e) {}
            var anon = !!(_lastCheck && _lastCheck.is_registered === false);
            _track('meter_peak_offer_shown', { source: source || '', anon: anon });
            var who = _name();
            var lead = {
                closing: 'Разговор сегодня получился. ',
                bigtest: 'Ваш портрет готов. ',
                natal: 'Ваша карта разобрана. ',
                // Человек написал, что сделал шаг («попробовала», «получилось»,
                // «доклеила»). Момент пользы — единственный честный момент
                // для предложения (владелец, 13.09.2026).
                progress: 'Шаг сделан — это и есть работа. ',
            }[source] || '';
            // После большого теста предмет предложения конкретный: полный
            // разбор именно этого профиля, а не подписка «вообще».
            var bigtest = source === 'bigtest';
            var title = bigtest ? 'Открыть глубинный разбор?'
                : (source === 'progress' ? 'Продолжить завтра с этого места?' : 'Сохранить и продолжать?');
            var body = bigtest
                ? 'Портрет и первый шаг — бесплатно. С подпиской откроются шесть разделов разбора именно вашего профиля: ' +
                  'петли, скрытые механизмы, точки роста, прогноз и персональные ключи; коуч и тренер без лимита; ' +
                  'Фреди помнит каждый разговор.'
                : 'С подпиской Фреди помнит каждый разговор и продолжает завтра с того же места. ' +
                  'Голос, все режимы, без счётчика минут.';
            var overlay = document.createElement('div');
            overlay.className = 'meter-overlay';
            overlay.id = 'meterPeakOverlay';
            overlay.innerHTML =
                '<div class="meter-modal">' +
                    '<div class="meter-emoji">🔖</div>' +
                    '<div class="meter-title">' + title + '</div>' +
                    '<div class="meter-text">' + (who ? _esc(who) + ', ' + lead.charAt(0).toLowerCase() + lead.slice(1) : lead) +
                        body +
                        (anon ? '<br><br>Сейчас этот разговор завтра не вспомнится: бесплатная версия его не хранит.' : '') +
                    '</div>' +
                    '<button class="meter-btn meter-btn-primary" id="meterPeakSub">✨ Попробовать 3 дня — 99 ₽</button>' +
                    '<div class="meter-price-note" style="font-size:12px;opacity:.65;margin:2px 0 6px">Полный Premium на три дня: голос, все режимы, память о каждом разговоре. Потом 990 ₽ в месяц; отключить можно в один клик.</div>' +
                    // «Сначала завести аккаунт» отсюда убрано 15.09.2026:
                    // аккаунт заводится самой покупкой, отдельным шагом он
                    // только уводит человека с оплаты.

                    '<button class="meter-btn meter-btn-secondary" id="meterPeakLater">Позже</button>' +
                '</div>';
            document.body.appendChild(overlay);
            document.getElementById('meterPeakSub').onclick = function () {
                _track('meter_subscribe_clicked', { source: 'peak_' + (source || '') });
                overlay.remove();
                if (typeof window.openCheckout === 'function') window.openCheckout('peak_' + (source || ''));
            };
            var reg = document.getElementById('meterPeakReg');
            if (reg) reg.onclick = function () { overlay.remove(); _openRegister('peak_' + (source || '')); };
            document.getElementById('meterPeakLater').onclick = function () {
                _track('meter_peak_offer_dismissed', { source: source || '', reason: 'later' });
                overlay.remove();
                setTimeout(function () { askWhyNot('peak_' + (source || '')); }, 400);
            };
            overlay.onclick = function (e) {
                if (e.target === overlay) { _track('meter_peak_offer_dismissed', { source: source || '', reason: 'outside' }); overlay.remove(); }
            };
        } catch (e) { console.warn('showPeakOffer failed:', e); }
    }

    // Сильные игры — только по подписке (решение владельца 05.09.2026).
    // Единственный список: по нему kontur.js рисует значок и перехватывает
    // запуск, app.js закрывает прямые ссылки ?m=<игра>. Ключ — глобальная
    // функция запуска, потому что именно её зовут и хаб, и роутер.
    // Бесплатными остаются короткие тренажёры без Фреди-игротехника
    // (N-back, счёт, калибровка, данетки, Ферми, «Лови ошибку») и входные
    // игры первого экрана (Контур, Два потока, Мнемо, Чувства, Мысль под
    // допросом, Скажи «нет», Чайник Рассела, Вариатика Basic).
    var PREMIUM_GAMES = {
        showOdiScreen: 'ОДИ: игра всерьёз',
        showVsluhGame: 'Мысль вслух',
        showSpiralGame: 'Спираль',
        showParusGame: 'Парус',
        showPerehodGame: 'Переход',
        showLazejkaGame: 'Лазейка',
        showAvtopilotGame: 'Автопилот',
        showIstoriaGame: 'Другая история',
        showLgenijGame: 'Ленивый гений',
        showAlfavitGame: 'Алфавит',
        showSignalGame: 'Сигнал',
        showKlinGame: 'Клин клином',
        showRolGame: 'Смени роль',
        showOporaGame: 'Опора',
        showDeloGame: 'Своё дело',
        showSovetGame: 'Земля в опасности',
        showDostigatorGame: 'Достигатор',
        showKorkaGame: 'Короли и капуста',
        showMandatGame: 'Мандат: цена кресла',
        showMeisterGame: 'МЕЙСТЕР-КОД',
        showMarketologGame: 'Маркетолог',
        showProgressiveGame: 'Вариатика — Progressive',
        showIntensiveGame: 'Вариатика — Intensive',
        showImperativeGame: 'Императив',
        showExponentaGame: 'Экспонента',
        showPatternGame: 'Паттерн',
        showDotogokakScreen: 'До того, как',
        showSobesGame: 'Собеседование',
        showPodrostokGame: 'Разговор с подростком',
    };
    // Сильные инструменты — по той же схеме, что и игры (решение владельца
    // 15.09.2026: «самые сильные вывести в премиум»). Отбор не по размеру
    // файла, а по тому, что человек уносит с собой: сеанс внушения под свой
    // тип восприятия, 21-дневный план с трекером, библиотека состояний,
    // план личного бренда, разбор отношений через «зеркала». Всё это либо
    // повторяют неделями, либо сохраняют — за такое платят.
    //
    // Бесплатными остаются входные и ежедневные: дневник, сны, сказки,
    // эзотерика, привычки, роли и игры по Берну, КПТ-практики, «Мне плохо
    // сейчас» и сам тест. Запирать то, с чего человек начинает знакомство,
    // значит запирать вход. «Супервизор» заперт жёстче остальных — без
    // бесплатного первого захода, это его собственная логика в supervizor.js.
    var PREMIUM_TOOLS = {
        showHypnosisScreen: 'Самогипноз',
        showSkillChoiceScreen: 'Навыки: 21-дневный план',
        showAnchorsScreen: 'Якоря: библиотека состояний',
        showPersonalBrandScreen: 'Мой бренд',
        showMirrorsScreen: 'Зеркала',
    };
    // Один список для проверки: и роутер, и хаб игр, и сами модули зовут
    // gameLocked() с именем функции запуска.
    var PREMIUM_ALL = {};
    (function () {
        var k;
        for (k in PREMIUM_GAMES) if (PREMIUM_GAMES.hasOwnProperty(k)) PREMIUM_ALL[k] = PREMIUM_GAMES[k];
        for (k in PREMIUM_TOOLS) if (PREMIUM_TOOLS.hasOwnProperty(k)) PREMIUM_ALL[k] = PREMIUM_TOOLS[k];
    })();
    function _isPremiumNow() {
        if (window.IS_PREMIUM === true) return true;
        return !!(_lastCheck && (_lastCheck.is_premium || _lastCheck.has_subscription));
    }
    // Заперта ли игра для этого человека: имя функции запуска → да/нет.
    // Первый заход в сильную игру — бесплатно, со второго — подписка
    // (решение владельца 12.09.2026). Замок на входе давал 5–14 секунд
    // на экран и уход; один раунд показывает, за что платить.
    function _gameSeenKey(fn) { return 'fredi_game_seen_' + fn; }
    // Бесплатный заход, выданный в этой загрузке страницы. Без него один
    // запуск съедал его дважды: роутер ?m=<игра> спрашивал gameLocked перед
    // загрузкой модуля, модуль — ещё раз у себя, и на втором вопросе заход
    // уже числился израсходованным. Человек по ссылке из статьи видел замок
    // вместо игры, ни разу её не открыв.
    var _freeGranted = {};
    // Вопрос без последствий: заперто ли сейчас. Этим рисуются значки
    // «💎 Premium» в списке игр — раньше там звался gameLocked, и одна
    // отрисовка хаба помечала израсходованными все два десятка игр разом.
    function gameLockedPeek(fn) {
        if (!fn || !PREMIUM_ALL.hasOwnProperty(fn)) return false;
        if (_isPremiumNow()) return false;
        if (_freeGranted[fn]) return false;
        var seen = '';
        try { seen = localStorage.getItem(_gameSeenKey(fn)) || ''; } catch (e) {}
        return !!seen;
    }
    // Вопрос на входе: заперто ли — и если нет, первый заход считается
    // израсходованным.
    function gameLocked(fn) {
        if (!fn || !PREMIUM_ALL.hasOwnProperty(fn)) return false;
        if (_isPremiumNow()) return false;
        if (_freeGranted[fn]) return false;
        var seen = '';
        try { seen = localStorage.getItem(_gameSeenKey(fn)) || ''; } catch (e) {}
        if (!seen) {
            try { localStorage.setItem(_gameSeenKey(fn), new Date().toISOString().slice(0, 10)); } catch (e) {}
            _freeGranted[fn] = true;
            _track('game_first_open_free', { game: fn });
            return false;
        }
        return true;
    }
    // Значок «Premium» у пунктов левого меню, которые заперты со второго
    // захода. Без него человек нажимает «Гипноз» и упирается в стену, ничем
    // не предупреждённый, — а это ровно та неожиданность, после которой
    // закрывают вкладку. Премиуму значки не нужны, ему всё открыто.
    var NAV_BY_TOOL = {
        showMirrorsScreen: 'mirrors',
        showHypnosisScreen: 'hypnosis',
        showAnchorsScreen: 'anchors',
        showPersonalBrandScreen: 'brand',
    };
    function _markPremiumNav() {
        try {
            // Статус подписки приезжает асинхронно и в момент первого вызова
            // ещё не известен, поэтому функция и снимает значки тоже: когда
            // ответ придёт, платящий их не увидит.
            if (_isPremiumNow()) {
                document.querySelectorAll('.nav-prem').forEach(function (b) { b.remove(); });
                return;
            }
            var st = document.getElementById('meterNavPremStyle');
            if (!st) {
                st = document.createElement('style');
                st.id = 'meterNavPremStyle';
                st.textContent = '.nav-prem{margin-left:auto;font-size:10px;opacity:.75;flex:0 0 auto}';
                document.head.appendChild(st);
            }
            Object.keys(NAV_BY_TOOL).forEach(function (fn) {
                var el = document.querySelector('.chat-item[data-chat="' + NAV_BY_TOOL[fn] + '"]');
                if (!el || el.querySelector('.nav-prem')) return;
                var b = document.createElement('span');
                b.className = 'nav-prem';
                b.textContent = '💎';
                b.title = 'Первый заход бесплатно, дальше — по подписке';
                el.appendChild(b);
            });
        } catch (e) {}
    }

    function showGameLock(fn, source) {
        var isTool = PREMIUM_TOOLS.hasOwnProperty(fn);
        var name = PREMIUM_ALL[fn] || (isTool ? 'этот инструмент' : 'эта игра');
        // Пришёл из блока «Практика к курсу» (from=lektorij-<курс>) —
        // стена должна говорить о курсе, а не о «сильных играх» вообще:
        // студент курса иначе решает, что попал не туда (фокус-группа 12.09.2026).
        var fromCourse = false;
        try { fromCourse = /^lektorij-/.test(new URLSearchParams(location.search).get('from') || ''); } catch (e) {}
        _injectMeterStyles();
        var old = document.getElementById('meterGameLock');
        if (old) old.remove();
        _track('game_lock_shown', { game: fn, source: source || '' });
        var overlay = document.createElement('div');
        overlay.className = 'meter-overlay';
        overlay.id = 'meterGameLock';
        overlay.innerHTML =
            '<div class="meter-modal">' +
                '<div class="meter-emoji">💎</div>' +
                '<div class="meter-title">«' + _esc(name) + '» — ' + (fromCourse ? 'практика к вашему курсу' : 'с подпиской') + '</div>' +
                '<div class="meter-text">' + (fromCourse
                    ? 'Это тренажёр из курса, который вы читали: те же ситуации, но на живых сценах и с разбором Фреди. ' +
                      'Лекции и курс бесплатны, тренажёр входит в подписку вместе с голосом и памятью о каждом разговоре.'
                    : 'Первый заход в «' + _esc(name) + '» был бесплатным — вы уже видели, как это работает. ' +
                      'Дальше ' + (isTool ? 'инструмент открывается' : 'игра открывается') +
                      ' с подпиской вместе с голосом, всеми режимами ' +
                      'и памятью Фреди о каждом разговоре. ' +
                      (isTool
                        ? 'Разговор с Фреди, дневник, сны, сказки и эзотерика остаются бесплатными.'
                        : 'Короткие тренажёры остаются бесплатными.')) + '</div>' +
                '<button class="meter-btn meter-btn-primary" id="meterGameLockSub">✨ Попробовать 3 дня — 99 ₽</button>' +
                '<div class="meter-price-note" style="font-size:12px;opacity:.65;margin:2px 0 6px">Полный Premium на 3 дня, потом 990 ₽ в месяц — меньше одной очной консультации; отключить можно в один клик.</div>' +
                '<button class="meter-btn meter-btn-secondary" id="meterGameLockClose">Понятно</button>' +
            '</div>';
        document.body.appendChild(overlay);
        document.getElementById('meterGameLockSub').onclick = function () {
            _track('meter_subscribe_clicked', { source: 'game_lock', game: fn });
            overlay.remove();
            if (typeof window.openCheckout === 'function') window.openCheckout('game_lock_' + fn);
        };
        document.getElementById('meterGameLockClose').onclick = function () {
            _track('game_lock_dismissed', { game: fn });
            overlay.remove();
            setTimeout(function () { askWhyNot('game_lock'); }, 400);
        };
        overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    }

    // Ранняя дверь аккаунта. 06.09: 99 первых сообщений за день и 3 просьбы
    // завести аккаунт. Стена аккаунта приходит, когда выговорены 10 минут,
    // а человек из объявления отвечает на автовопрос, пишет один раз сам и
    // уходит на третьей минуте — до стены он не доживает. Поэтому аккаунт
    // предлагается раньше: после второго сообщения сессии, когда Фреди уже
    // ответил на своё. Карточка не блокирует, закрывается кликом мимо,
    // раз в сутки на браузер, только анониму. Числа минут — из статуса
    // счётчика, руками не вписываются.
    var DOOR_KEY = 'meter_account_door_day';
    function showAccountDoor(source) {
        try {
            if (_authed()) return;
            if (_lastCheck && (_lastCheck.is_registered === true || _lastCheck.is_premium)) return;
            var today = new Date().toISOString().slice(0, 10);
            var shown = '';
            try { shown = localStorage.getItem(DOOR_KEY) || ''; } catch (e) {}
            if (shown === today) return;
            if (document.getElementById('meterOverlay') || document.getElementById('meterUpsellOverlay')
                || document.getElementById('meterPeakOverlay') || document.getElementById('meterDoorOverlay')
                || document.getElementById('faAuthModal')) return;
            _injectMeterStyles();
            try { localStorage.setItem(DOOR_KEY, today); } catch (e) {}
            var gain = _accountGain(_lastCheck);
            _track('meter_account_door_shown', { source: source || '', gain: !!gain });
            var who = _name();
            var overlay = document.createElement('div');
            overlay.className = 'meter-overlay';
            overlay.id = 'meterDoorOverlay';
            // Регистрация из этой карточки убрана (решение владельца
            // 15.09.2026). Почту человек и так оставит на оплате пробы, и
            // тогда предложение завести аккаунт для него уже норма. Звать
            // регистрироваться раньше — отвлекать на шаг, который ничего
            // ему не открывает: он остаётся в той же бесплатной версии.
            //
            // Вместо этого карточка называет ровно то, во что он упрётся:
            // без теста Фреди отвечает вслепую, время кончится сегодня, а
            // завтра разговор начнётся с нуля. Числа минут — из статуса
            // счётчика, руками не вписываются.
            // Поле статуса называется limit_minutes — это сегодняшний лимит
            // человека. daily_limit_minutes бэкенд не отдаёт вовсе, и строка
            // про минуты молча уходила бы в «времени в обрез».
            var mins = (_lastCheck && _lastCheck.limit_minutes) ||
                       (gain && gain.small) || null;
            var noTest = !_hasProfile();
            var lines = [];
            if (noTest) {
                lines.push('<b>Тест вы не проходили.</b> Фреди отвечает вслепую: ' +
                           'он не знает ни ваших опор, ни того, откуда у трудности корни.');
            }
            lines.push('<b>Времени' + (mins ? ' — ' + mins + ' минут в день' : ' в обрез') +
                       '.</b> Кончится — продолжение завтра.');
            lines.push('<b>Разговор не сохраняется.</b> Завтра Фреди начнёт с чистого ' +
                       'листа, и всё придётся рассказывать заново.');
            overlay.innerHTML =
                '<div class="meter-modal">' +
                    '<div class="meter-emoji">🔓</div>' +
                    '<div class="meter-title">Вы в бесплатной версии</div>' +
                    '<div class="meter-text">' + (who ? _esc(who) + ', разговор пошёл. ' : 'Разговор пошёл. ') +
                        'Дальше он упрётся в ' + (noTest ? 'три' : 'две') + ' вещи.</div>' +
                    '<div class="meter-text" style="text-align:left;border-left:3px solid #3b82ff;padding-left:11px;margin:0 0 15px">' +
                        lines.join('<br><br>') + '</div>' +
                    '<div class="meter-text">Три дня за 99 ₽ снимают это разом: ' +
                        (noTest ? 'тест с разбором, ' : '') +
                        'память о каждом разговоре, время без счётчика, голос и все режимы. ' +
                        'Понравится — дальше 990 ₽ в месяц, отключить можно в один клик.</div>' +
                    (noTest
                        ? '<button class="meter-btn meter-btn-secondary" id="meterDoorTest">🧭 Пройти тест — бесплатно</button>'
                        : '') +
                    '<button class="meter-btn meter-btn-primary" id="meterDoorSub">✨ Открыть всё — 3 дня за 99 ₽</button>' +
                    '<button class="meter-btn meter-btn-secondary" id="meterDoorLater">Позже</button>' +
                '</div>';
            document.body.appendChild(overlay);
            // Тест — первой кнопкой и только тому, кто его не проходил
            // (решение владельца 15.09.2026). Он бесплатный и снимает
            // первый из трёх названных выше упоров, поэтому стоять рядом
            // с ценой ему не стыдно: человек либо платит, либо делает шаг,
            // после которого Фреди перестаёт отвечать вслепую.
            var doorTest = document.getElementById('meterDoorTest');
            if (doorTest) doorTest.onclick = function () {
                _track('meter_account_door_test', { source: source || '' });
                overlay.remove();
                try {
                    if (typeof window.startTest === 'function') window.startTest();
                    else window.location.href = '/fredi/?m=test';
                } catch (e) { window.location.href = '/fredi/?m=test'; }
            };
            document.getElementById('meterDoorSub').onclick = function () {
                _track('meter_subscribe_clicked', { source: 'door_' + (source || '') });
                overlay.remove();
                if (typeof window.openCheckout === 'function') window.openCheckout('door_' + (source || ''));
            };
            document.getElementById('meterDoorLater').onclick = function () {
                _track('meter_account_door_dismissed', { source: source || '', reason: 'later' });
                overlay.remove();
                setTimeout(function () { askWhyNot('door'); }, 400);
            };
            overlay.onclick = function (e) {
                if (e.target === overlay) { _track('meter_account_door_dismissed', { source: source || '', reason: 'outside' }); overlay.remove(); }
            };
        } catch (e) { console.warn('showAccountDoor failed:', e); }
    }

    // Первый шаг на сегодня — по самому низкому из четырёх уровней профиля.
    // Считается на клиенте из кода СБ-x_ТФ-x_УБ-x_ЧВ-x: бесплатно, мгновенно,
    // и это честная часть разбора, а не реклама.
    function _firstStepFor(displayName) {
        const m = String(displayName || '').match(/СБ-(\d)_ТФ-(\d)_УБ-(\d)_ЧВ-(\d)/);
        const steps = {
            'СБ': 'Сегодня вспомните одну ситуацию, где промолчали, и запишите одним предложением, что хотели сказать. Завтра скажете это Фреди вслух — и разберём, что останавливает.',
            'ТФ': 'Сегодня выпишите три траты недели, о которых жалеете, и одну, о которой нет. Разница между ними — ваша первая тема с Фреди.',
            'УБ': 'Сегодня поймайте одно утверждение, в которое верите без проверки, и спросите себя: откуда я это знаю? Ответ принесите Фреди.',
            'ЧВ': 'Сегодня заметьте момент, когда подстроились под другого, и назовите про себя, чего хотели сами. Только заметить — этого хватит для начала.',
        };
        if (!m) return steps['СБ'];
        const lv = { 'СБ': +m[1], 'ТФ': +m[2], 'УБ': +m[3], 'ЧВ': +m[4] };
        const key = Object.keys(lv).sort((a, b) => lv[a] - lv[b])[0];
        return steps[key];
    }
    window.frediFirstStepFor = _firstStepFor;

    window.FrediMeter = {
        checkCanSend: checkCanSend,
        protect: protect,
        isProtected: isProtected,
        showPeakOffer: showPeakOffer,
        showAccountDoor: showAccountDoor,
        gameLocked: gameLocked,
        gameLockedPeek: gameLockedPeek,
        // Наружу — модулям, которые запирают не себя целиком, а отдельные
        // свои части (skill_choice.js: часть навыков по подписке).
        isPremium: _isPremiumNow,
        showGameLock: showGameLock,
        premiumGames: PREMIUM_GAMES,
        premiumTools: PREMIUM_TOOLS,
        recordUsage: recordUsage,
        recordUsageQuiet: recordUsageQuiet,
        recordExchange: recordExchange,
        showFatigueModal: showFatigueModal,
        showUpsellCard: showUpsellCard,
        showSiteOffer: showSiteOffer,
        askWhyNot: askWhyNot,
        // Наружу — чтобы предупреждение можно было показать из голосового
        // пути (он не идёт через apiCall/fetch-патчи) и чтобы его поведение
        // на границах остатка можно было проверить, а не додумывать.
        showWarningToast: _showWarningToast,
        bindingKind: _bindingKind,
        // Последний известный статус метра. Нужен app.js, чтобы решить,
        // отправлять ли выбранную роль: пока идёт проба, роли работают.
        // Свойство, а не поле, — иначе отдавали бы снимок на момент
        // сборки объекта, то есть всегда null.
        get lastCheck() { return _lastCheck; },
    };
    console.log('meter.js loaded');
})();
