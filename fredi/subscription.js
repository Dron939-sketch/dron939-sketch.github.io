// ============================================
// subscription.js — Платёжный модуль подписки (YooKassa)
// Встраивается в экран настроек
// ============================================

(function () {
    if (window._subscriptionLoaded) return;
    window._subscriptionLoaded = true;

    function _api() { return window.CONFIG?.API_BASE_URL || ''; }
    function _uid() { return window.CONFIG?.USER_ID; }
    function _toast(msg, type) { if (window.showToast) window.showToast(msg, type || 'info'); }

    function _injectSubscriptionStyles() {
        if (document.getElementById('subscription-styles')) return;
        const s = document.createElement('style');
        s.id = 'subscription-styles';
        s.textContent = `
            .sub-card { background: linear-gradient(135deg, rgba(59,130,255,0.12) 0%, rgba(255,107,59,0.08) 100%); border: 1px solid rgba(224,224,224,0.15); border-radius: 20px; padding: 24px; margin-bottom: 20px; }
            .sub-card-premium { border-color: rgba(255,183,59,0.4); background: linear-gradient(135deg, rgba(255,183,59,0.1) 0%, rgba(255,107,59,0.08) 100%); }
            .sub-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px; }
            .sub-badge-active { background: rgba(16,185,129,0.15); color: rgba(16,185,129,0.95); border: 1px solid rgba(16,185,129,0.3); }
            .sub-badge-inactive { background: rgba(224,224,224,0.07); color: var(--text-secondary); border: 1px solid rgba(224,224,224,0.15); }
            .sub-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
            .sub-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px; }
            .sub-price { font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
            .sub-price-period { font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; }
            .sub-features { list-style: none; padding: 0; margin: 0 0 20px 0; }
            .sub-features li { font-size: 13px; color: var(--text-secondary); padding: 6px 0; display: flex; align-items: center; gap: 8px; }
            .sub-features li::before { content: ''; display: none; }
            .sub-feature-icon { flex-shrink: 0; width: 20px; text-align: center; }
            .sub-btn { display: block; width: 100%; padding: 14px; border: none; border-radius: 14px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; text-align: center; transition: transform 0.15s, opacity 0.15s; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
            .sub-btn:active { transform: scale(0.98); }
            .sub-btn-primary { background: linear-gradient(135deg, #3b82ff 0%, #6366f1 100%); color: #fff; }
            .sub-btn-primary:hover { opacity: 0.9; }
            .sub-btn-secondary { background: rgba(224,224,224,0.07); border: 1px solid rgba(224,224,224,0.18); color: var(--text-secondary); }
            .sub-btn-secondary:hover { background: rgba(224,224,224,0.14); color: var(--text-primary); }
            .sub-btn-danger { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: rgba(239,68,68,0.85); }
            .sub-btn-small { display: inline-flex; padding: 6px 14px; border-radius: 10px; font-size: 12px; font-weight: 500; width: auto; }
            .sub-info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(224,224,224,0.06); font-size: 13px; }
            .sub-info-label { color: var(--text-secondary); }
            .sub-info-value { color: var(--text-primary); font-weight: 500; }
            .sub-card-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
            .sub-card-icon { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); background: rgba(224,224,224,0.05); padding: 6px 12px; border-radius: 10px; }
            .sub-divider { height: 1px; background: rgba(224,224,224,0.08); margin: 16px 0; }
            .sub-btn-group { display: flex; flex-direction: column; gap: 10px; }
            .sub-cards-section { background: rgba(224,224,224,0.03); border: 1px solid rgba(224,224,224,0.1); border-radius: 16px; padding: 18px; margin-top: 16px; }
            .sub-cards-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
            .sub-card-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(224,224,224,0.04); border: 1px solid rgba(224,224,224,0.08); border-radius: 12px; }
            .sub-card-item-check { width: 20px; height: 20px; border-radius: 4px; border: 2px solid rgba(16,185,129,0.6); background: rgba(16,185,129,0.15); display: flex; align-items: center; justify-content: center; font-size: 12px; color: rgba(16,185,129,0.95); flex-shrink: 0; }
            .sub-card-item-info { flex: 1; }
            .sub-card-item-number { font-size: 14px; font-weight: 600; color: var(--text-primary); }
            .sub-card-item-type { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
            .sub-no-cards { font-size: 12px; color: var(--text-secondary); font-style: italic; }
            .sub-loading { text-align: center; padding: 40px 0; color: var(--text-secondary); font-size: 14px; }
            .sub-loading-spinner { font-size: 28px; animation: sub-spin 1.2s linear infinite; margin-bottom: 12px; }
            @keyframes sub-spin { to { transform: rotate(360deg); } }
        `;
        document.head.appendChild(s);
    }

    async function _loadSubscriptionStatus() {
        const uid = _uid();
        if (!uid) return null;
        try {
            const r = await fetch(`${_api()}/api/subscription/status/${uid}`);
            return await r.json();
        } catch (e) { console.error('subscription status error:', e); return null; }
    }

    function _pendingKey(uid) { return 'fredi_pending_payment_' + uid; }

    // Защита от двойных/тройных списаний:
    // запоминаем, что прямо сейчас уже создаём платёж и блокируем повторные клики.
    let _isCreatingPayment = false;

    // Тариф первого платежа. Пробная неделя за 290 ₽ появилась 06.09.2026:
    // за пять дней рекламы было ~170 первых сообщений, 3 стены оплаты и
    // 0 подписок — между «бесплатно» и 990 ₽ сразу не было ступеньки.
    // Пробная неделя — один раз на аккаунт (бэкенд отдаёт trial_available),
    // после неё обычные 990 ₽ в месяц автопродлением, отключается в один
    // клик. Выбор приходит из адреса (?plan=trial_week со страницы
    // «Тарифы») или из кнопки в карточке.
    const PLAN_PRICE = { trial_week: 290, monthly: 990 };
    let _selectedPlan = 'trial_week';
    try {
        const _pl = new URLSearchParams(window.location.search).get('plan');
        if (_pl === 'monthly' || _pl === 'trial_week') _selectedPlan = _pl;
    } catch (e) {}
    // Возврат со страницы ЮKassa кнопкой «назад» восстанавливает страницу
    // из bfcache вместе с выставленным флагом — и «Оформить» умирает
    // навсегда (01.09: «он не даёт второй раз попробовать»). На pageshow
    // из кэша флаг сбрасывается; защита от даблклика в живой странице
    // при этом сохраняется.
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
            _isCreatingPayment = false;
            const b = document.getElementById('subPayBtn');
            if (b) { b.disabled = false; b.style.opacity = ''; b.style.cursor = ''; }
        }
    });

    async function _createPayment(plan) {
        if (_isCreatingPayment) return;

        const uid = _uid();
        if (!uid) return;
        if (plan === 'monthly' || plan === 'trial_week') _selectedPlan = plan;

        const emailInput = document.getElementById('subEmailInput');
        const email = emailInput ? emailInput.value.trim() : '';
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            _payStep('email_invalid', { empty: !email });
            _toast('Введите корректный email для чека', 'error');
            if (emailInput) emailInput.focus();
            return;
        }
        _payStep('pay_clicked', { plan: _selectedPlan });

        const payBtn = document.getElementById(_selectedPlan === 'monthly' ? 'subPayMonthBtn' : 'subPayBtn')
            || document.getElementById('subPayBtn');
        const otherBtn = document.getElementById(_selectedPlan === 'monthly' ? 'subPayBtn' : 'subPayMonthBtn');
        if (otherBtn) otherBtn.disabled = true;
        const prevBtnText = payBtn ? payBtn.innerHTML : '';

        _isCreatingPayment = true;
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.style.opacity = '0.6';
            payBtn.style.cursor = 'not-allowed';
            payBtn.innerHTML = 'Создаю платёж…';
        }
        if (emailInput) emailInput.disabled = true;

        _toast('Создаю платёж...', 'info');
        try {
            const baseReturn = window.location.origin + window.location.pathname + '?subscription=success';
            const r = await fetch(`${_api()}/api/subscription/create-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: uid,
                    return_url: baseReturn,
                    email: email,
                    plan: _selectedPlan,
                })
            });
            if (r.status === 429) {
                // Стандартный ответ slowapi — «Rate limit exceeded: 3 per 1
                // minute». Человек, у которого не прошла карта и который
                // пробует снова, читал это по-английски и уходил.
                _payStep('rate_limited');
                _toast('Слишком много попыток подряд. Подождите минуту и попробуйте снова', 'error');
                throw new Error('RATE_LIMITED');
            }
            const data = await r.json();
            if (data.success && data.confirmation_url) {
                _payStep('payment_created', { plan: _selectedPlan });
                try {
                    localStorage.setItem(_pendingKey(uid), JSON.stringify({
                        payment_id: data.payment_id,
                        created_at: Date.now(),
                        plan: _selectedPlan,
                    }));
                } catch (e) {}
                // Уходим на ЮKassa — флаг сознательно НЕ сбрасываем,
                // чтобы быстрый back-button + повторный клик не создал второй платёж.
                _payStep('redirect_to_kassa');
                window.location.href = data.confirmation_url;
                return;
            } else {
                _payStep('payment_failed', { reason: (data.error || 'unknown'), plan: _selectedPlan });
                _toast(data.error || 'Не удалось создать платёж', 'error');
                // Пробная неделя уже была — переключаемся на месяц.
                if (data.code === 'trial_used') _selectedPlan = 'monthly';
            }
        } catch (e) {
            if (!e || e.message !== 'RATE_LIMITED') {
                _payStep('network_error');
                _toast('Не получилось связаться с сервером. Проверьте связь и попробуйте ещё раз', 'error');
            }
        }

        // Сюда попадаем только если редирект не произошёл — возвращаем кнопку.
        _isCreatingPayment = false;
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.style.opacity = '';
            payBtn.style.cursor = '';
            payBtn.innerHTML = prevBtnText;
        }
        if (otherBtn) otherBtn.disabled = false;
        if (emailInput) emailInput.disabled = false;
    }

    // Один запрос за раз. 01.09.2026 возврат с ЮKassa запускал ДВА
    // параллельных цикла опроса (bootstrap + render), по паре запросов
    // каждые полторы-три секунды: лимит 20/мин выгорал за 45 секунд, и
    // дальше проверка получала одни 429 — даже завершённый платёж не
    // смог бы подтвердиться, пока лимит не отпустит.
    let _verifyInFlight = null;
    async function _verifyPayment(paymentId) {
        const uid = _uid();
        if (!uid || !paymentId) return null;
        if (_verifyInFlight) return _verifyInFlight;
        _verifyInFlight = (async () => {
            try {
                const r = await fetch(`${_api()}/api/subscription/verify-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: uid, payment_id: paymentId })
                });
                if (r.status === 429) return { success: false, rate_limited: true };
                return await r.json();
            } catch (e) {
                console.error('verify payment error:', e);
                return null;
            } finally {
                _verifyInFlight = null;
            }
        })();
        return _verifyInFlight;
    }

    function _readPendingPaymentId() {
        let pid = null;
        try {
            const sp = new URLSearchParams(window.location.search);
            pid = sp.get('payment_id');
            if (!pid && window.location.hash.includes('?')) {
                pid = new URLSearchParams(window.location.hash.split('?')[1]).get('payment_id');
            }
        } catch (e) {}
        if (pid) return pid;

        try {
            const uid = _uid();
            const raw = uid ? localStorage.getItem(_pendingKey(uid)) : null;
            if (raw) {
                const obj = JSON.parse(raw);
                if (obj && obj.payment_id && (Date.now() - (obj.created_at || 0)) < 2 * 3600 * 1000) {
                    return obj.payment_id;
                }
            }
        } catch (e) {}
        return null;
    }

    function _clearPendingPayment() {
        try {
            const uid = _uid();
            if (uid) localStorage.removeItem(_pendingKey(uid));
        } catch (e) {}
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('payment_id');
            url.searchParams.delete('subscription');
            window.history.replaceState({}, '', url.toString());
        } catch (e) {}
    }

    let _autoVerifyActive = false;
    async function _autoVerifyOnReturn(container) {
        const paymentId = _readPendingPaymentId();
        if (!paymentId) return false;
        // Второй одновременный цикл не нужен: он лишь удваивает частоту
        // запросов и приближает 429.
        if (_autoVerifyActive) return false;
        _autoVerifyActive = true;
        try {
        return await _autoVerifyLoop(container, paymentId);
        } finally { _autoVerifyActive = false; }
    }

    async function _autoVerifyLoop(container, paymentId) {

        if (container) {
            container.innerHTML = '<div class="sub-loading"><div class="sub-loading-spinner">&#x2B50;</div><div>Проверяю оплату...</div></div>';
        }
        _toast('Проверяю оплату...', 'info');

        const deadline = Date.now() + 30000;
        let lastResult = null;
        while (Date.now() < deadline) {
            lastResult = await _verifyPayment(paymentId);
            if (lastResult && lastResult.success && lastResult.activated) {
                _clearPendingPayment();
                // Единственное место, где точно известно, что деньги
                // дошли и доступ включился. Отсюда цель уезжает в
                // Метрику — по ней Директ и считает покупки.
                _payStep('subscription_activated');
                _toast('Подписка активирована ✨', 'info');
                return true;
            }
            if (lastResult && lastResult.status === 'canceled') {
                _clearPendingPayment();
                _toast('Оплата отменена', 'error');
                return false;
            }
            // 5 секунд между проверками; после 429 — пауза длиннее,
            // чтобы дать лимиту отпустить.
            await new Promise(res => setTimeout(res, lastResult && lastResult.rate_limited ? 20000 : 5000));
        }

        if (lastResult && lastResult.status && lastResult.status !== 'pending' && lastResult.status !== 'waiting_for_capture') {
            _clearPendingPayment();
        }
        _toast('Платёж в обработке, статус обновится автоматически', 'info');
        return false;
    }


    function _formatDate(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function _daysLeft(dateStr) {
        if (!dateStr) return 0;
        return Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)));
    }

    function _escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Почта аккаунта. Спрашивать её второй раз перед самой кнопкой оплаты —
    // лишнее поле в момент наибольшей хрупкости; на телефоне это один из
    // главных шагов отвала. Человек уже вводил её при регистрации.
    function _knownEmail() {
        try {
            var e = window.CURRENT_USER_EMAIL || localStorage.getItem('fredi_last_email') || '';
            return String(e).replace(/"/g, '&quot;');
        } catch (e) { return ''; }
    }

    function _cardTypeIcon(type) {
        const t = (type || '').toLowerCase();
        if (t.includes('visa')) return '&#x1F4B3;';
        if (t.includes('master')) return '&#x1F4B3;';
        if (t.includes('mir')) return '&#x1F4B3;';
        return '&#x1F4B3;';
    }


    function _renderActiveSubscription(sub) {
        const days = _daysLeft(sub.expires_at);
        const trial = sub.plan === 'trial_week';
        return `
            <div class="sub-card sub-card-premium">
                <div class="sub-badge sub-badge-active">&#x2713; Активна</div>
                <div class="sub-title">${trial ? 'Пробная неделя Фреди Premium' : 'Подписка Фреди Premium'}</div>
                <div class="sub-desc">Полный доступ ко всем возможностям</div>
                <div class="sub-info-row"><span class="sub-info-label">${trial ? 'Неделя до' : 'Следующее списание'}</span><span class="sub-info-value">${_formatDate(sub.expires_at)}</span></div>
                <div class="sub-info-row"><span class="sub-info-label">Осталось дней</span><span class="sub-info-value">${days}</span></div>
                <div class="sub-info-row"><span class="sub-info-label">Стоимость</span><span class="sub-info-value">${trial ? '290 &#8381; за неделю, дальше 990 &#8381;/мес' : '990 &#8381;/мес'}</span></div>
                <div class="sub-info-row" style="border-bottom:none"><span class="sub-info-label">Автопродление</span><span class="sub-info-value">${sub.auto_renew === false ? 'Отключено' : 'Включено'}</span></div>
                <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin:12px 0 14px">
                    ${sub.auto_renew === false
                        ? 'Списаний больше не будет. Доступ работает до ' + _formatDate(sub.expires_at) + '.'
                        : (trial
                            ? 'Когда неделя закончится, подписка продолжится за 990 ₽ в месяц. Отключить можно прямо сейчас — доступ останется до конца недели.'
                            : 'Отключить можно прямо сейчас — доступ останется до конца оплаченного месяца.')}
                </div>
                <button class="sub-btn ${sub.auto_renew === false ? 'sub-btn-secondary' : 'sub-btn-danger'}" id="subRenewToggleBtn">
                    ${sub.auto_renew === false ? 'Включить автопродление' : 'Отключить автопродление'}
                </button>
            </div>`;
    }

    function _renderPendingBanner() {
        return `
            <div class="sub-card" style="border:1px solid rgba(255,183,59,0.45);background:linear-gradient(135deg,rgba(255,183,59,0.12),rgba(255,107,59,0.06))">
                <div class="sub-badge" style="background:rgba(255,183,59,0.18);color:rgba(255,183,59,0.95);border:1px solid rgba(255,183,59,0.35)">&#x23F3; Платёж в обработке</div>
                <div class="sub-title">Подтверждаем оплату…</div>
                <div class="sub-desc">Есть незавершённый платёж. Если вы оплатили и подтвердили в банке — подписка включится автоматически за 1–5 минут. Если оплата не была завершена (закрыли окно, не пришло подтверждение банка) — начните заново, деньги по незавершённому платежу не списываются. Важно: при включённом VPN страница подтверждения банка не открывается — отключите его на время оплаты.</div>
                <div class="sub-btn-group">
                    <button class="sub-btn sub-btn-secondary" id="subRefreshPendingBtn">Обновить статус</button>
                    <button class="sub-btn sub-btn-secondary" id="subRestartPaymentBtn">Начать оплату заново</button>
                </div>
            </div>`;
    }

    function _renderNoSubscription(sub) {
        const isExpired = sub && sub.status === 'expired';
        const card = sub ? sub.card : null;
        // Пробная неделя показывается, пока бэкенд не сказал обратного:
        // без ответа статуса (сеть) кнопка есть, а отказ «уже была»
        // придёт с create-payment и переключит на месяц.
        const trial = !(sub && sub.trial_available === false);
        if (!trial) _selectedPlan = 'monthly';
        const priceHtml = trial
            ? `<div class="sub-price">290 &#8381; <span style="font-size:14px;font-weight:400;color:var(--text-secondary)">за первую неделю</span></div>
                <div class="sub-price-period">Полный доступ на 7 дней, с голосом и без счётчика. Потом 990 &#8381; в месяц автопродлением; отключить можно в один клик в этом же разделе, доступ останется до конца недели.</div>`
            : `<div class="sub-price">990 &#8381;</div>
                <div class="sub-price-period">в месяц. Списывается сегодня, следующее — через 30 дней; отключить можно в один клик в этом же разделе</div>`;
        const buttonsHtml = trial
            ? `<button class="sub-btn sub-btn-primary" id="subPayBtn">Попробовать неделю — 290 &#8381;</button>
                <button class="sub-btn sub-btn-secondary" id="subPayMonthBtn" style="margin-top:8px">Сразу месяц — 990 &#8381;</button>`
            : `<button class="sub-btn sub-btn-primary" id="subPayBtn">Оформить подписку — 990 &#8381;</button>`;
        return `
            <div class="sub-card">
                <div class="sub-badge sub-badge-inactive">${isExpired ? 'Истекла' : 'Нет подписки'}</div>
                <div class="sub-title">Фреди Premium</div>
                <div class="sub-desc">Разблокируйте полный доступ к виртуальному психологу</div>
                ${priceHtml}
                <ul class="sub-features">
                    <li><span class="sub-feature-icon">&#x1F9E0;</span> Безлимитные сессии с Фреди</li>
                    <li><span class="sub-feature-icon">&#x1F3AF;</span> Персональный план развития</li>
                    <li><span class="sub-feature-icon">&#x1F4D3;</span> AI-дневник с глубокой рефлексией</li>
                    <li><span class="sub-feature-icon">&#x1F319;</span> Гипнотические сессии и практики</li>
                    <li><span class="sub-feature-icon">&#x1FA9E;</span> Зеркало — анализ отношений</li>
                    <li><span class="sub-feature-icon">&#x1F3AD;</span> Транзактный анализ по Берну</li>
                </ul>
                <div style="margin-bottom:14px">
                    <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px">Email для чека</label>
                    <input type="email" id="subEmailInput" placeholder="your@email.com" value="${_knownEmail()}"
                        style="width:100%;padding:12px 14px;border:1px solid rgba(224,224,224,0.18);border-radius:12px;background:rgba(224,224,224,0.05);color:var(--text-primary);font-size:14px;font-family:inherit;box-sizing:border-box;outline:none"
                        onfocus="this.style.borderColor='rgba(59,130,255,0.5)'" onblur="this.style.borderColor='rgba(224,224,224,0.18)'" />
                </div>
                ${buttonsHtml}
                <div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text-secondary)">Безопасная оплата через ЮKassa. Чек будет отправлен на указанный email.</div>
                <div style="text-align:center;margin-top:6px;font-size:11px;color:rgba(255,183,59,0.9)">Если у вас включён VPN — отключите его на время оплаты: иначе страница подтверждения банка не откроется.</div>
                <div style="text-align:center;margin-top:8px;font-size:11px;color:var(--text-secondary)">Оформляя подписку, вы принимаете <a href="/oferta/" target="_blank" rel="noopener" style="color:#3b82ff">Оферту</a> и <a href="/politika-konfidencialnosti/" target="_blank" rel="noopener" style="color:#3b82ff">Политику конфиденциальности</a>.</div>
            </div>`;
    }

    // Шаги оплаты. До этого между meter_subscribe_clicked и активацией
    // подписки не было ни одного события: клик виден, активация видна, а где
    // между ними отваливаются люди — нет. Теперь виден каждый шаг.
    function _payStep(step, extra) {
        try {
            if (window.FrediTracker && window.FrediTracker.track) {
                var d = { step: step };
                if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) d[k] = extra[k];
                window.FrediTracker.track('checkout_step', d);
            }
        } catch (e) {}
    }

    async function renderSubscriptionSection(container) {
        _injectSubscriptionStyles();
        container.innerHTML = '<div class="sub-loading"><div class="sub-loading-spinner">&#x2B50;</div><div>Загрузка...</div></div>';
        // Проверку незавершённого платежа гоним фоном. Раньше здесь стояло
        // await: человек с брошенным платежом в localStorage жал «Premium»
        // и до тридцати секунд смотрел на «Проверяю оплату…» вместо формы.
        // Бьёт по самому намеренному сегменту — по тем, кто до кассы уже
        // доходил. Если платёж всё-таки подтвердится, карточка сама
        // перерисуется из _autoVerifyOnReturn.
        _autoVerifyOnReturn(container);
        const sub = await _loadSubscriptionStatus();
        if (sub && sub.has_subscription) {
            container.innerHTML = _renderActiveSubscription(sub);
            // Кнопка отмены. До этого её не было вовсе: посадочная обещала
            // «отключается в один клик», а в настройках стояли три строки
            // без единой кнопки. Люди ищут отмену ДО оплаты — не найдя,
            // часть не платит, а найдя обещание и не найдя кнопку после,
            // идут в банк за возвратом.
            const renewBtn = document.getElementById('subRenewToggleBtn');
            if (renewBtn) {
                renewBtn.addEventListener('click', async () => {
                    const turningOff = sub.auto_renew !== false;
                    renewBtn.disabled = true;
                    renewBtn.textContent = 'Сохраняю…';
                    try {
                        const r = await fetch(`${_api()}/api/subscription/toggle-auto-renew`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: _uid(), enabled: !turningOff })
                        });
                        const d = await r.json();
                        if (d && d.success !== false) {
                            _toast(turningOff
                                ? 'Автопродление отключено. Доступ до конца оплаченного месяца'
                                : 'Автопродление включено', 'info');
                        } else {
                            _toast((d && d.error) || 'Не получилось изменить автопродление', 'error');
                        }
                    } catch (e) {
                        _toast('Не получилось связаться с сервером', 'error');
                    }
                    await renderSubscriptionSection(container);
                });
            }
        } else {
            const pendingPid = _readPendingPaymentId();
            const pendingBanner = pendingPid ? _renderPendingBanner() : '';
            container.innerHTML = pendingBanner + _renderNoSubscription(sub);
            // За неделю: один meter_subscribe_clicked и ноль checkout_step.
            // Между «кликнул Premium» и «нажал Оформить» события не было —
            // не отличить «форма не открылась» от «открылась, человек ушёл».
            // Теперь факт показа формы виден.
            _payStep('form_rendered', {
                pending: !!pendingPid,
                status_loaded: sub != null,
                trial_offered: !(sub && sub.trial_available === false),
            });
            const payBtn = document.getElementById('subPayBtn');
            const monthBtn = document.getElementById('subPayMonthBtn');
            if (payBtn) {
                payBtn.addEventListener('click', function () {
                    _createPayment(monthBtn ? 'trial_week' : 'monthly');
                });
            }
            if (monthBtn) { monthBtn.addEventListener('click', function () { _createPayment('monthly'); }); }
            const restartBtn = document.getElementById('subRestartPaymentBtn');
            if (restartBtn) {
                restartBtn.addEventListener('click', async () => {
                    _payStep('payment_restarted');
                    _clearPendingPayment();
                    _isCreatingPayment = false;
                    await renderSubscriptionSection(container);
                });
            }
            const refreshBtn = document.getElementById('subRefreshPendingBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', async () => {
                    refreshBtn.disabled = true;
                    refreshBtn.textContent = 'Проверяю…';
                    if (pendingPid) {
                        await _verifyPayment(pendingPid);
                    }
                    await renderSubscriptionSection(container);
                });
            }
            if (pendingPid) {
                clearInterval(window._fredSubPollTimer);
                window._fredSubPollTimer = setInterval(async () => {
                    if (!document.body.contains(container)) {
                        clearInterval(window._fredSubPollTimer);
                        return;
                    }
                    const r = await _verifyPayment(pendingPid);
                    if (r && (r.activated || r.status === 'canceled')) {
                        clearInterval(window._fredSubPollTimer);
                        await renderSubscriptionSection(container);
                    }
                }, 15000);
            }
        }
    }

    window.renderSubscriptionSection = renderSubscriptionSection;

    // Прямой чекаут: открывает оплату (email + ЮKassa) в фокус-модалке —
    // без ухода в экран настроек, где подписка теряется среди прочего.
    function openCheckout(source, plan) {
        try {
            if (plan === 'monthly' || plan === 'trial_week') _selectedPlan = plan;
            var existing = document.getElementById('fredCheckoutOverlay');
            if (existing) existing.remove();

            var overlay = document.createElement('div');
            overlay.id = 'fredCheckoutOverlay';
            overlay.setAttribute('style',
                'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.72);' +
                '-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);' +
                'display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 16px');

            var sheet = document.createElement('div');
            sheet.setAttribute('style', 'position:relative;width:100%;max-width:440px;margin:auto');

            var closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&#10005;';
            closeBtn.setAttribute('aria-label', 'Закрыть');
            closeBtn.setAttribute('style',
                'position:absolute;top:-8px;right:-8px;z-index:2;width:36px;height:36px;border-radius:50%;' +
                'border:none;background:rgba(20,20,20,0.92);color:#fff;font-size:15px;line-height:36px;cursor:pointer');

            var container = document.createElement('div');
            container.setAttribute('data-subscription-container', '');

            sheet.appendChild(closeBtn);
            sheet.appendChild(container);
            overlay.appendChild(sheet);
            document.body.appendChild(overlay);

            var _closeReason = 'close_btn';
            function _onActivated() { _closeReason = 'activated'; _close(); }
            function _close() {
                _payStep('checkout_closed', { reason: _closeReason });
                overlay.remove();
                window.removeEventListener('fredi:subscription-updated', _onActivated);
            }
            closeBtn.onclick = _close;
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) { _closeReason = 'click_outside'; _close(); }
            });
            // Успешная активация подписки закроет модалку.
            window.addEventListener('fredi:subscription-updated', _onActivated);

            try {
                if (window.FrediTracker && window.FrediTracker.track) {
                    window.FrediTracker.track('checkout_opened', { source: source || 'unknown', plan: _selectedPlan });
                }
            } catch (e) {}

            renderSubscriptionSection(container);
        } catch (e) { console.error('openCheckout error:', e); }
    }
    window.openCheckout = openCheckout;

    // Авто-открытие чекаута по ссылке /fredi/?checkout=1 (со страницы «Тарифы»).
    setTimeout(function () {
        try {
            var sp = new URLSearchParams(window.location.search);
            if (sp.get('checkout') === '1' || window.location.hash === '#subscribe') {
                openCheckout('tariffs');
            }
        } catch (e) {}
    }, 1200);

    function _findSubContainer() {
        return document.querySelector('[data-subscription-container]')
            || document.getElementById('subscriptionSection')
            || (function () {
                var anyCard = document.querySelector('.sub-card');
                return anyCard ? anyCard.parentElement : null;
            })();
    }

    function _bootstrapAutoVerify() {
        setTimeout(async () => {
            try {
                if (!_uid()) return;
                const sp = new URLSearchParams(window.location.search);
                const hasMarker = sp.get('subscription') === 'success' || sp.get('payment_id');
                const hasPending = !!_readPendingPaymentId();
                if (!hasMarker && !hasPending) return;
                await _autoVerifyOnReturn(null);
                const subContainer = _findSubContainer();
                if (subContainer) {
                    try { await renderSubscriptionSection(subContainer); } catch (e) {}
                }
                try {
                    window.dispatchEvent(new CustomEvent('fredi:subscription-updated'));
                } catch (e) {}
                try {
                    if (typeof window.loadPremiumStatus === 'function') {
                        await window.loadPremiumStatus();
                    }
                    if (typeof window.updatePremiumIndicators === 'function') {
                        window.updatePremiumIndicators();
                    }
                } catch (e) {}
            } catch (e) { console.error('bootstrap auto-verify error:', e); }
        }, 1500);
    }
    _bootstrapAutoVerify();

    window.addEventListener('fredi:subscription-updated', function () {
        var c = _findSubContainer();
        if (c) {
            try { renderSubscriptionSection(c); } catch (e) {}
        }
    });

    console.log('subscription.js loaded');
})();
