// ============================================
// meter.js — Fading Fredi: free session limits UI
// Auto-intercepts chat/voice requests to check limits
// ============================================

(function () {
    if (window._meterLoaded) return;
    window._meterLoaded = true;

    function _api() { return window.CONFIG?.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
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
            '@media (max-width:480px){.meter-badge{font-size:11px;padding:6px 10px}.meter-badge-day{font-size:9px}}'
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
            '.meter-btn-secondary{background:rgba(224,224,224,0.07);border:1px solid rgba(224,224,224,0.18);color:var(--text-secondary)}'
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

    function _showWarningToast(check) {
        if (!check || check.is_premium) return;
        var rem = check.remaining_minutes;
        if (rem == null) return;

        var kind = _bindingKind(check);

        // Critical: осталось ≤ 2 мин — показываем полноценную карточку
        // апселла (а не тост), чтобы предложение Premium вообще появилось
        // в достижимой точке ДО блокировки. Раз за 2-мин окно.
        if (rem <= 2 && !_criticalShown) {
            _criticalShown = true;
            showUpsellCard(check, kind);
            _trackWarning('critical', rem, kind);
            setTimeout(function() { _criticalShown = false; }, 120000);
            return;
        }
        // Soft: 2 < rem ≤ 5 — мягкая подготовка.
        if (rem <= 5 && !_warningShown) {
            _warningShown = true;
            _toast(kind === 'trial'
                ? '⏱ Бесплатных минут осталось ' + Math.round(rem)
                : '⏱ Осталось ' + Math.round(rem) + ' мин на сегодня', 'info');
            _trackWarning('soft', rem, kind);
            setTimeout(function() { _warningShown = false; }, 120000);
        }
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

    var PREMIUM_FEATURES =
        '<ul class="meter-features">' +
        '<li><span>\u2728</span> \u0411\u0435\u0437\u043B\u0438\u043C\u0438\u0442\u043D\u043E\u0435 \u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0441 \u0424\u0440\u0435\u0434\u0438 24/7</li>' +
        '<li><span>\uD83C\uDFAF</span> \u041F\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u0446\u0435\u043B\u0435\u0439 \u0438 \u0440\u0430\u0441\u0447\u0451\u0442 \u0448\u0430\u0433\u043E\u0432</li>' +
        '<li><span>\uD83D\uDCC8</span> \u041F\u043E\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435 \u043B\u0438\u0447\u043D\u044B\u0445 \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0439</li>' +
        '<li><span>\uD83E\uDDE0</span> \u0415\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u044B\u0435 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0438 \u043D\u0430\u0432\u044B\u043A\u043E\u0432</li>' +
        '<li><span>\uD83D\uDCCA</span> \u041E\u0442\u0441\u043B\u0435\u0436\u0438\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u0430 \u0438 \u043F\u0440\u0438\u0432\u044B\u0447\u0435\u043A</li>' +
        '<li><span>\uD83C\uDFA4</span> \u0413\u043E\u043B\u043E\u0441\u043E\u0432\u044B\u0435 \u0441\u0435\u0430\u043D\u0441\u044B \u0441 AI-\u043F\u0441\u0438\u0445\u043E\u043B\u043E\u0433\u043E\u043C</li>' +
        '<li><span>\uD83E\uDE9E</span> \u0417\u0435\u0440\u043A\u0430\u043B\u043E \u2014 \u0433\u043B\u0443\u0431\u043E\u043A\u0438\u0439 \u0430\u043D\u0430\u043B\u0438\u0437 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u0439</li>' +
        '<li><span>\uD83C\uDFAD</span> \u0422\u0440\u0430\u043D\u0437\u0430\u043A\u0442\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437 \u043F\u043E \u0411\u0435\u0440\u043D\u0443</li>' +
        '<li><span>\uD83C\uDF19</span> \u0413\u0438\u043F\u043D\u043E\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0441\u0435\u0441\u0441\u0438\u0438</li>' +
        '<li><span>\uD83D\uDCD3</span> AI-\u0434\u043D\u0435\u0432\u043D\u0438\u043A \u0441 \u0440\u0435\u0444\u043B\u0435\u043A\u0441\u0438\u0435\u0439</li>' +
        '<li><span>\uD83E\uDDD8</span> \u0423\u0442\u0440\u0435\u043D\u043D\u0438\u0435 \u0438 \u0432\u0435\u0447\u0435\u0440\u043D\u0438\u0435 \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0438</li>' +
        '<li><span>\uD83C\uDF05</span> \u041C\u043E\u0442\u0438\u0432\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0435 \u043F\u043E\u0441\u043B\u0430\u043D\u0438\u044F \u0438 \u0438\u0434\u0435\u0438 \u043D\u0430 \u0432\u044B\u0445\u043E\u0434\u043D\u044B\u0435</li>' +
        '</ul>';

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

    function showFatigueModal(data) {
        // Только что закрыли — не показываем стену заново. Человек уже
        // прочитал её; вместо повтора напоминаем строкой, чтобы попытка
        // отправить сообщение не осталась без ответа.
        if (_dismissedAgo() < PAYWALL_QUIET_SEC) {
            _track('meter_blocked_suppressed', {
                block_reason: (data && data.block_reason) || '',
                since_dismiss_sec: Math.round(_dismissedAgo()),
            });
            try { _toast('⏱ Лимит исчерпан — Premium снимает ограничение', 'info'); } catch (e) {}
            return;
        }
        _injectMeterStyles();
        var existing = document.getElementById('meterOverlay');
        if (existing) existing.remove();

        var minutesUntilReset = data.minutes_until_reset || 0;
        var limit = data.limit_minutes || 10;
        // \u0415\u0434\u0438\u043D\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0435 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435 \u0434\u043B\u044F paywall \u2014 \u0438\u0437\u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439
        // \u0437\u0430\u043F\u0430\u0441. \u0420\u0430\u043D\u044C\u0448\u0435 \u0441\u044E\u0434\u0430 \u043F\u043E\u043F\u0430\u0434\u0430\u043B\u0438 \u0438 \u043F\u043E \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0443 \u0434\u043D\u0435\u0439, \u0442\u043E \u0435\u0441\u0442\u044C \u043B\u044E\u0434\u0438,
        // \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043F\u043E\u0442\u0440\u0430\u0442\u0438\u0432\u0448\u0438\u0435: 10 \u043F\u043E\u043A\u0430\u0437\u043E\u0432 \u043F\u0440\u0438 8 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F\u0445 \u043D\u0430 \u0432\u0441\u044E \u0431\u0430\u0437\u0443
        // \u0438 \u043D\u043E\u043B\u044C \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u043E\u0432. \u0421\u043C\u043E\u0442\u0440\u0438\u043C \u043D\u0430 block_reason, \u0430 \u0435\u0441\u043B\u0438 \u0431\u044D\u043A\u0435\u043D\u0434 \u0441\u0442\u0430\u0440\u044B\u0439 \u2014
        // \u043D\u0430 trial_exhausted, \u043A\u0430\u043A \u0440\u0430\u043D\u044C\u0448\u0435.
        var trialExhausted = data.block_reason
            ? data.block_reason === 'trial'
            : !!data.trial_exhausted;
        var daysUsed = data.free_days_used || 0;
        var trialLimit = data.trial_limit_minutes || 30;

        _track('meter_blocked_shown', {
            limit_minutes: limit,
            minutes_until_reset: minutesUntilReset,
            trial_exhausted: trialExhausted,
            block_reason: data.block_reason || (trialExhausted ? 'trial' : 'daily'),
            trial_used_minutes: data.trial_used_minutes,
            free_days_used: daysUsed,
        });

        var emoji, title, mainText, timerHtml;

        if (trialExhausted) {
            // \u0424\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 paywall: \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439 \u0437\u0430\u043F\u0430\u0441 \u0438\u0437\u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432\u0430\u043D.
            emoji = '\uD83D\uDD13'; // \uD83D\uDD13
            title = '\u0411\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0435 ' + trialLimit + ' \u043C\u0438\u043D\u0443\u0442 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0438\u0441\u044C';
            mainText =
                '\u0421\u0442\u043E\u043B\u044C\u043A\u043E \u043C\u044B \u0434\u0430\u0451\u043C \u043D\u0430 \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u043E \u2014 \u0438 \u0432\u044B \u0438\u0445 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043B\u0438.<br>' +
                '\u0427\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u0431\u0435\u0437 \u043B\u0438\u043C\u0438\u0442\u043E\u0432, \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 Premium.';
            timerHtml = '';
        } else {
            // \u0414\u043D\u0435\u0432\u043D\u043E\u0439 \u043B\u0438\u043C\u0438\u0442 \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D, \u043D\u043E trial-\u0434\u043D\u0438 \u0435\u0449\u0451 \u0435\u0441\u0442\u044C.
            emoji = '\u23F1\uFE0F'; // \u23F1
            title = '10 \u043C\u0438\u043D\u0443\u0442 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D\u044B';
            mainText =
                '\u0414\u043D\u0435\u0432\u043D\u043E\u0439 \u043B\u0438\u043C\u0438\u0442 \u0432 ' + limit + ' \u043C\u0438\u043D\u0443\u0442 \u2014 \u043F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0441\u044F \u0432 00:00 UTC.<br>' +
                '\u041C\u043E\u0436\u043D\u043E \u0436\u0434\u0430\u0442\u044C \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044C Premium \u2014 \u0431\u0435\u0437 \u043B\u0438\u043C\u0438\u0442\u043E\u0432.';
            timerHtml = minutesUntilReset > 0
                ? '<div class="meter-timer" id="meterTimer">\u041D\u043E\u0432\u044B\u0439 \u0434\u0435\u043D\u044C \u0447\u0435\u0440\u0435\u0437 ' + _formatResetCountdown(minutesUntilReset) + '</div>'
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
                '<div class="meter-features-title">\u0421 Premium \u0424\u0440\u0435\u0434\u0438 \u043D\u0435 \u0443\u0441\u0442\u0430\u0451\u0442:</div>' +
                PREMIUM_FEATURES +
                '<button class="meter-btn meter-btn-primary" id="meterSubscribeBtn">\u2728 Premium \u2014 990 \u20BD/\u043C\u0435\u0441, \u0431\u0435\u0437 \u043B\u0438\u043C\u0438\u0442\u043E\u0432</button>' +
                (trialExhausted
                    ? '<button class="meter-btn meter-btn-secondary" id="meterCloseBtn">\u041F\u043E\u0434\u0443\u043C\u0430\u044E \u043F\u043E\u0437\u0436\u0435</button>'
                    : '<button class="meter-btn meter-btn-secondary" id="meterCloseBtn">\u041F\u043E\u043D\u044F\u0442\u043D\u043E, \u0434\u043E \u0437\u0430\u0432\u0442\u0440\u0430</button>') +
            '</div>';
        document.body.appendChild(overlay);

        document.getElementById('meterCloseBtn').onclick = function() {
            _track('meter_closed', { reason: 'continue_tomorrow' });
            _rememberDismiss();
            overlay.remove();
        };
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                _track('meter_dismissed_outside', {});
                _rememberDismiss();
                overlay.remove();
            }
        };
        document.getElementById('meterSubscribeBtn').onclick = function() {
            _track('meter_subscribe_clicked', {});
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

    // Мягкий апселл ДО блокировки. Показывается один раз за 2-мин окно
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
        _track('meter_upsell_shown', { remaining_minutes: rem, kind: kind });

        // Два разных сообщения. «На сегодня всё» — новость на один вечер,
        // человек вернётся и без подписки. «Бесплатные минуты кончаются» —
        // единственный момент, когда предложение Premium вообще по делу.
        var title = kind === 'trial'
            ? 'Бесплатных минут осталось ~' + rem
            : 'Осталось ~' + rem + ' мин на сегодня';
        var text = kind === 'trial'
            ? 'Это остаток бесплатного знакомства. С Premium Фреди не устаёт — общайтесь сколько нужно, голосом и текстом.'
            : 'Дальше — дневной лимит бесплатного режима, он обновится в полночь. С Premium Фреди не устаёт — общайтесь сколько нужно, голосом и текстом.';

        var overlay = document.createElement('div');
        overlay.className = 'meter-overlay';
        overlay.id = 'meterUpsellOverlay';
        overlay.innerHTML =
            '<div class="meter-modal">' +
                '<div class="meter-emoji">⏱️</div>' +
                '<div class="meter-title">' + title + '</div>' +
                '<div class="meter-text">' + text + '</div>' +
                PREMIUM_FEATURES +
                '<button class="meter-btn meter-btn-primary" id="meterUpsellSub">✨ Premium — 990 ₽/мес, без лимитов</button>' +
                '<button class="meter-btn meter-btn-secondary" id="meterUpsellClose">Ещё немного</button>' +
            '</div>';
        document.body.appendChild(overlay);

        document.getElementById('meterUpsellClose').onclick = function() {
            _track('meter_upsell_dismissed', { reason: 'later' });
            overlay.remove();
        };
        overlay.onclick = function(e) {
            if (e.target === overlay) { _track('meter_upsell_dismissed', { reason: 'outside' }); overlay.remove(); }
        };
        document.getElementById('meterUpsellSub').onclick = function() {
            _track('meter_subscribe_clicked', { source: 'upsell_critical' });
            overlay.remove();
            if (typeof window.openCheckout === 'function') {
                window.openCheckout('upsell');
            } else if (typeof showSettingsScreen === 'function') {
                showSettingsScreen();
            }
        };
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
    var AI_URL_REGEX = /\/api\/(?:chat|voice\/(?:process(?:_stream)?|stt|tts)|ai\/generate|deep-analysis|hypno\/support|psychologist-thoughts\/generate|dreams\/(?:interpret|clarify)|reality\/(?:check|parse\/[^/]+)|brand\/transformation|mirrors\/(?:complete|[^/]+\/complete)|morning\/send-now)(?:\/|$|\?)/;

    function _isAiRequest(urlStr) {
        return AI_URL_REGEX.test(urlStr || '');
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
                if (!check.can_send) {
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
            // 15 сек на запрос — компромисс. При 10-мин/день это даёт
            // примерно 40 сообщений. Реальное чтение длинного ответа
            // часто занимает больше, но мы не хотим съедать лимит
            // быстрее, чем юзер реально читает.
            if (isAi && response.ok) recordUsage(15);
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
        badge.title = 'Дневной лимит free-trial';
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
            if (trial != null) parts.push('бесплатный запас — ' + Math.round(trial) + ' мин');
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
        var daysUsed = check.free_days_used || 0;
        var trialRem = check.remaining_trial_minutes;
        // Если запас исчерпан — показываем без таймера, текстом «Купить».
        if (check.trial_exhausted) {
            badge.classList.remove('warn');
            badge.classList.add('danger');
            var t = document.getElementById('meterBadgeTime');
            var d = document.getElementById('meterBadgeDay');
            if (t) t.textContent = 'Trial';
            if (d) d.textContent = 'Купить';
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
            // Вторая строка баджа — общий бесплатный запас. «День 2/3» тут
            // стоял, пока лимит считался заходами; при подсчёте по минутам
            // это число ничего не говорит о том, когда всё кончится.
            if (trialRem != null) {
                dayEl.textContent = 'Запас ' + Math.max(0, Math.round(trialRem)) + ' мин';
            } else {
                var active = Math.max(1, Math.min(daysUsed || 1, 3));
                dayEl.textContent = 'День ' + active + '/3';
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
            if (_lastCheck.trial_exhausted) {
                _renderBadge(_lastCheck);
                return;
            }
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

    window.FrediMeter = {
        checkCanSend: checkCanSend,
        recordUsage: recordUsage,
        showFatigueModal: showFatigueModal,
        showUpsellCard: showUpsellCard,
        // Наружу — чтобы предупреждение можно было показать из голосового
        // пути (он не идёт через apiCall/fetch-патчи) и чтобы его поведение
        // на границах остатка можно было проверить, а не додумывать.
        showWarningToast: _showWarningToast,
        bindingKind: _bindingKind,
    };
    console.log('meter.js loaded');
})();
