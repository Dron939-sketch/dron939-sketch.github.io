// ============================================
// analysis.js — Модуль "Анализ глубинных паттернов"
// Версия 8.0 — единый стиль с проектом, без инлайн-стилей
// ============================================

// ============================================
// ПРОВЕРКА ТЕСТА
// ============================================
window.isTestCompleted = window.isTestCompleted || async function () {
    try {
        const apiUrl = window.CONFIG?.API_BASE_URL || '';
        const userId = window.CONFIG?.USER_ID;
        const r = await fetch(`${apiUrl}/api/user-status?user_id=${userId}`);
        const d = await r.json();
        return d.has_profile === true;
    } catch {
        const userId = window.CONFIG?.USER_ID;
        return !!localStorage.getItem(`test_results_${userId}`);
    }
};

// ============================================
// СОСТОЯНИЕ
// ============================================
let _tab = 'overview';
let _profile = null;
let _analysis = {
    portrait: '', loops: '', mechanisms: '',
    growth: '', forecast: '', keys: '', thought: ''
};

// ============================================
// CSS — инжектируем один раз
// ============================================
function _injectStyles() {
    if (document.getElementById('analysis-v8-styles')) return;
    const s = document.createElement('style');
    s.id = 'analysis-v8-styles';
    s.textContent = `
        /* ===== ОБЁРТКА ===== */
        .analysis-page {
            max-width: 860px;
            margin: 0 auto;
            padding: 20px 16px max(120px, calc(env(safe-area-inset-bottom, 0px) + 100px));
        }

        /* ===== ЗАГОЛОВОК ===== */
        .analysis-heading {
            margin-bottom: 24px;
        }
        .analysis-heading h1 {
            font-size: 24px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 4px;
        }
        .analysis-heading p {
            font-size: 13px;
            color: var(--text-secondary);
        }

        /* ===== ЛОАДЕР ===== */
        .analysis-loader {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            gap: 20px;
            text-align: center;
            padding: 40px 20px;
        }
        .analysis-loader-ring {
            position: relative;
            width: 72px;
            height: 72px;
        }
        .analysis-loader-ring::before {
            content: '';
            position: absolute;
            inset: 0;
            border: 3px solid rgba(224, 224, 224, 0.1);
            border-radius: 50%;
        }
        .analysis-loader-ring::after {
            content: '';
            position: absolute;
            inset: 0;
            border: 3px solid transparent;
            border-top-color: var(--chrome);
            border-radius: 50%;
            animation: analysisSpinRing 1s linear infinite;
        }
        .analysis-loader-icon {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
        }
        .analysis-loader-title {
            font-size: 17px;
            font-weight: 500;
            color: var(--text-primary);
        }
        .analysis-loader-sub {
            font-size: 13px;
            color: var(--text-secondary);
            max-width: 260px;
        }
        .analysis-loader-timer {
            font-size: 22px;
            font-weight: 600;
            color: var(--chrome);
            min-height: 30px;
        }
        .analysis-loader-dots {
            display: flex;
            gap: 6px;
        }
        .analysis-loader-dots span {
            width: 7px;
            height: 7px;
            background: var(--silver-metallic);
            border-radius: 50%;
            animation: analysisDotPulse 1.2s ease-in-out infinite;
        }
        .analysis-loader-dots span:nth-child(2) { animation-delay: 0.2s; }
        .analysis-loader-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes analysisSpinRing {
            to { transform: rotate(360deg); }
        }
        @keyframes analysisDotPulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50%       { opacity: 1;   transform: scale(1.2); }
        }

        /* Подвал разбора: кнопка скачивания под текстом, а не над ним. */
        .analysis-footer {
            display: flex;
            justify-content: center;
            margin: 28px 0 8px;
            padding-top: 20px;
            border-top: 1px solid rgba(224, 224, 224, 0.1);
        }

        /* ===== ТАБЫ ===== */
        .analysis-tabs-row {
            display: flex;
            gap: 6px;
            margin-bottom: 24px;
            flex-wrap: wrap;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(224, 224, 224, 0.1);
        }
        .analysis-tab-btn {
            background: rgba(224, 224, 224, 0.06);
            border: 1px solid rgba(224, 224, 224, 0.15);
            padding: 8px 16px;
            border-radius: 30px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
            cursor: pointer;
            transition: background 0.2s, border-color 0.2s, color 0.2s;
            font-family: inherit;
            min-height: 36px;
            outline: none;
            touch-action: manipulation;
        }
        .analysis-tab-btn:hover {
            background: rgba(224, 224, 224, 0.12);
            border-color: rgba(224, 224, 224, 0.3);
            color: var(--text-primary);
        }
        .analysis-tab-btn.active {
            background: linear-gradient(135deg, rgba(224,224,224,0.2), rgba(192,192,192,0.1));
            border-color: rgba(224, 224, 224, 0.35);
            color: var(--text-primary);
        }

        /* ===== КОНТЕНТ АНАЛИЗА ===== */
        .analysis-content {
            min-height: 300px;
        }
        .analysis-section-title {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            color: var(--chrome);
            margin: 28px 0 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(224, 224, 224, 0.12);
        }
        .analysis-section-title:first-child { margin-top: 0; }
        .analysis-text {
            font-size: 14px;
            line-height: 1.7;
            color: var(--text-secondary);
            margin: 8px 0;
        }
        .analysis-bold {
            color: var(--chrome);
            font-weight: 600;
        }
        .analysis-list-item {
            font-size: 14px;
            line-height: 1.6;
            color: var(--text-secondary);
            margin: 6px 0 6px 20px;
            position: relative;
        }
        .analysis-list-item::before {
            content: '—';
            position: absolute;
            left: -16px;
            color: var(--silver-brushed);
        }
        .analysis-list-item.numbered::before { display: none; }

        /* ===== КАРТОЧКА МЫСЛИ ПСИХОЛОГА ===== */
        .analysis-thought-card {
            background: linear-gradient(135deg,
                rgba(224, 224, 224, 0.06),
                rgba(192, 192, 192, 0.02));
            border: 1px solid rgba(224, 224, 224, 0.15);
            border-radius: 24px;
            padding: 24px;
        }
        .analysis-thought-header {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 18px;
        }
        .analysis-thought-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--chrome), var(--silver-brushed));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            flex-shrink: 0;
        }
        .analysis-thought-label {
            font-size: 11px;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: var(--text-secondary);
            margin-bottom: 2px;
        }
        .analysis-thought-name {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
        }
        .analysis-thought-body {
            font-size: 15px;
            line-height: 1.7;
            font-style: italic;
            color: var(--text-secondary);
            padding-left: 12px;
            border-left: 2px solid rgba(224, 224, 224, 0.25);
        }

        /* ===== ПУСТЫЕ СОСТОЯНИЯ ===== */
        .analysis-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 60px 20px;
            text-align: center;
            gap: 12px;
        }
        .analysis-empty-icon { font-size: 48px; }
        .analysis-empty-title {
            font-size: 17px;
            font-weight: 600;
            color: var(--text-primary);
        }
        .analysis-empty-sub {
            font-size: 13px;
            color: var(--text-secondary);
            max-width: 260px;
        }

        /* ===== НИЖНЯЯ ПАНЕЛЬ ===== */
        .analysis-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            gap: 12px;
            justify-content: center;
            padding: 16px 20px;
            padding-bottom: max(16px, calc(env(safe-area-inset-bottom) + 12px));
            background: linear-gradient(to top, var(--black-obsidian) 70%, transparent);
            -webkit-backdrop-filter: blur(12px);
            backdrop-filter: blur(12px);
            border-top: 1px solid rgba(224, 224, 224, 0.08);
            z-index: 200;
        }
        .analysis-footer-btn {
            padding: 11px 24px;
            border-radius: 40px;
            font-size: 13px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: background 0.2s, transform 0.15s;
            min-height: 44px;
            touch-action: manipulation;
            outline: none;
            letter-spacing: 0.2px;
        }
        .analysis-footer-btn:active { transform: scale(0.97); }

        .analysis-footer-btn-primary {
            background: rgba(224, 224, 224, 0.1);
            border: 1px solid rgba(224, 224, 224, 0.25);
            color: var(--chrome);
        }
        .analysis-footer-btn-primary:hover {
            background: rgba(224, 224, 224, 0.18);
        }
        .analysis-footer-btn-secondary {
            background: rgba(224, 224, 224, 0.05);
            border: 1px solid rgba(224, 224, 224, 0.12);
            color: var(--text-secondary);
        }
        .analysis-footer-btn-secondary:hover {
            background: rgba(224, 224, 224, 0.1);
            color: var(--text-primary);
        }

        /* ===== ДИАЛОГ ПОДТВЕРЖДЕНИЯ ===== */
        .analysis-confirm-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            -webkit-backdrop-filter: blur(6px);
            backdrop-filter: blur(6px);
            z-index: 9000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .analysis-confirm-box {
            background: var(--carbon-fiber);
            border: 1px solid rgba(224,224,224,0.2);
            border-radius: 24px;
            padding: 28px 24px;
            max-width: 340px;
            width: 100%;
            text-align: center;
        }
        .analysis-confirm-icon { font-size: 40px; margin-bottom: 12px; }
        .analysis-confirm-title {
            font-size: 17px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
        }
        .analysis-confirm-sub {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 24px;
            line-height: 1.5;
        }
        .analysis-confirm-btns {
            display: flex;
            gap: 10px;
        }
        .analysis-confirm-btns button {
            flex: 1;
            padding: 12px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            min-height: 44px;
            touch-action: manipulation;
        }
        .analysis-confirm-ok {
            background: rgba(224,224,224,0.15);
            border: 1px solid rgba(224,224,224,0.3);
            color: var(--text-primary);
        }
        .analysis-confirm-cancel {
            background: transparent;
            border: 1px solid rgba(224,224,224,0.12);
            color: var(--text-secondary);
        }

        @media (max-width: 768px) {
            .analysis-page { padding: 16px 12px max(120px, calc(env(safe-area-inset-bottom, 0px) + 100px)); }
            .analysis-heading h1 { font-size: 20px; }
            .analysis-tab-btn { padding: 7px 12px; font-size: 12px; }
            .analysis-footer { padding: 12px 16px; padding-bottom: max(12px, calc(env(safe-area-inset-bottom) + 10px)); }
            .analysis-footer-btn { padding: 10px 16px; font-size: 12px; }
        }
    `;
    document.head.appendChild(s);
}

// ============================================
// ЛОАДЕР
// ============================================
function _showLoader(title = 'Загружаю данные...', sub = '') {
    _injectStyles();
    const c = document.getElementById('screenContainer');
    if (!c) return;
    c.innerHTML = `
        <div class="analysis-loader">
            <div class="analysis-loader-ring">
                <div class="analysis-loader-icon">🧠</div>
            </div>
            <div class="analysis-loader-title">${title}</div>
            <div class="analysis-loader-sub">${sub}</div>
            <div class="analysis-loader-timer" id="analysisTimer"></div>
            <div class="analysis-loader-dots">
                <span></span><span></span><span></span>
            </div>
        </div>`;
}

function _startTimer() {
    let s = 0;
    const el = document.getElementById('analysisTimer');
    return setInterval(() => {
        if (!el) return;
        s++;
        el.textContent = s < 60 ? `${s}с` : `${Math.floor(s/60)}м ${s%60}с`;
    }, 1000);
}

// ============================================
// ФОРМАТИРОВАНИЕ
// ============================================
function _fmt(text) {
    if (!text) return '';
    let t = text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="analysis-bold">$1</strong>')
        .replace(/^(\d+)\.\s+(.+)$/gm, '<div class="analysis-list-item numbered">$1. $2</div>');

    const lines = t.split('\n');
    let out = '', para = '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            if (para) { out += `<div class="analysis-text">${para}</div>`; para = ''; }
            continue;
        }
        if (trimmed.startsWith('<div') || trimmed.startsWith('<strong')) {
            if (para) { out += `<div class="analysis-text">${para}</div>`; para = ''; }
            out += trimmed;
        } else {
            para += (para ? ' ' : '') + trimmed;
        }
    }
    if (para) out += `<div class="analysis-text">${para}</div>`;
    return out;
}

// ============================================
// ПОДТВЕРЖДЕНИЕ (вместо confirm())
// ============================================
function _confirm(message, sub) {
    return new Promise(resolve => {
        _injectStyles();
        const overlay = document.createElement('div');
        overlay.className = 'analysis-confirm-overlay';
        overlay.innerHTML = `
            <div class="analysis-confirm-box">
                <div class="analysis-confirm-icon">⚠️</div>
                <div class="analysis-confirm-title">${message}</div>
                <div class="analysis-confirm-sub">${sub}</div>
                <div class="analysis-confirm-btns">
                    <button class="analysis-confirm-cancel" id="acCancel">Отмена</button>
                    <button class="analysis-confirm-ok" id="acOk">Продолжить</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        document.getElementById('acOk').onclick    = () => { overlay.remove(); resolve(true);  };
        document.getElementById('acCancel').onclick = () => { overlay.remove(); resolve(false); };
    });
}

// ============================================
// НИЖНЯЯ ПАНЕЛЬ
// ============================================
function _renderFooter() {
    // Удаляем старую панель если есть
    document.getElementById('analysisFooter')?.remove();

    const footer = document.createElement('div');
    footer.id = 'analysisFooter';
    footer.className = 'analysis-footer';
    footer.innerHTML = `
        <button class="analysis-footer-btn analysis-footer-btn-primary" id="afRegen">🔄 Новый анализ</button>
        <button class="analysis-footer-btn analysis-footer-btn-secondary" id="afBack">🏠 На главную</button>`;
    document.body.appendChild(footer);

    document.getElementById('afRegen').onclick = () => regenerateDeepAnalysis();
    document.getElementById('afBack').onclick  = () => _goHome();
}

function _removeFooter() {
    document.getElementById('analysisFooter')?.remove();
}

// ============================================
// ОТКРЫТЬ АНАЛИЗ
// ============================================
async function openAnalysisScreen() {
    _injectStyles();
    const completed = await window.isTestCompleted();
    if (!completed) {
        if (window.showToast) window.showToast('📊 Сначала пройдите психологический тест', 'info');
        return;
    }

    _showLoader('Загружаю анализ...', 'Проверяю сохранённые данные');
    _removeFooter();

    try {
        const api    = window.CONFIG?.API_BASE_URL || '';
        const userId = window.CONFIG?.USER_ID;

        // Профиль
        const pRes = await fetch(`${api}/api/get-profile/${userId}`);
        _profile = await pRes.json();

        // Мысль психолога
        const tRes = await fetch(`${api}/api/psychologist-thought/${userId}`);
        const tData = await tRes.json();
        _analysis.thought = tData.success ? tData.thought : '';

        // Полный разбор — часть подписки (12.09.2026). Без неё экран
        // показывает, что внутри, и первый шаг — бесплатно; сервер на
        // не-подписчика отвечает premium_required и ничего не генерирует.
        if (!_isPremium()) { _goHome(); _showLockModal(); return; }

        // Сохранённый анализ из БД
        const sRes  = await fetch(`${api}/api/deep-analysis/${userId}`);
        const sData = await sRes.json();
        if (sData && sData.premium_required) { _goHome(); _showLockModal(); return; }

        if (sData.success && sData.analysis) {
            console.log('📦 Загружен сохранённый анализ от', sData.created_at);
            _analysis = { ..._analysis, ...sData.analysis };
            try { localStorage.setItem(`analysis_${userId}`, JSON.stringify(_analysis)); } catch {}
            _renderScreen();
        } else {
            console.log('🆕 Анализа нет, генерируем...');
            await generateDeepAnalysis();
        }

    } catch (err) {
        console.error('openAnalysisScreen error:', err);
        _removeFooter();
        if (window.showToast) window.showToast('❌ Ошибка загрузки данных', 'error');
        _goHome();
    }
}

// ============================================
// ГЕНЕРАЦИЯ АНАЛИЗА
// ============================================
async function generateDeepAnalysis() {
    _showLoader('Провожу глубинный анализ...', 'Обычно это занимает 20–40 секунд');
    _removeFooter();
    const timer = _startTimer();

    try {
        const api     = window.CONFIG?.API_BASE_URL || '';
        const userId  = window.CONFIG?.USER_ID;
        const mode    = window.currentMode || 'psychologist';

        const res  = await fetch(`${api}/api/deep-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, message: '', mode, platform: 'web' })
        });
        const data = await res.json();
        clearInterval(timer);
        if (data && data.premium_required) { _goHome(); _showLockModal(); return; }

        if (data.success && data.analysis) {
            _analysis = { ..._analysis, ...data.analysis };
            try { localStorage.setItem(`analysis_${userId}`, JSON.stringify(_analysis)); } catch {}
            _renderScreen();
        } else {
            throw new Error(data.error || 'Пустой ответ');
        }

    } catch (err) {
        clearInterval(timer);
        console.error('generateDeepAnalysis error:', err);
        if (window.showToast) window.showToast('❌ Ошибка генерации анализа', 'error');
        _renderFallback();
    }
}

async function regenerateDeepAnalysis() {
    const ok = await _confirm('Провести новый анализ?', 'Текущий анализ будет заменён новым. Это займёт 20–40 секунд.');
    if (!ok) return;
    await generateDeepAnalysis();
}

// ============================================
// РЕНДЕР ГЛАВНОГО ЭКРАНА
// ============================================
function _renderScreen() {
    _injectStyles();
    const c = document.getElementById('screenContainer');
    if (!c) return;

    c.innerHTML = `
        <div class="analysis-page">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <button class="back-btn" id="analysisBackBtn">◀️ НАЗАД</button>
            </div>
            <div class="analysis-heading">
                <h1>🧠 Глубинный анализ</h1>
                <p>Системный AI-анализ на основе психологического теста</p>
            </div>
            <div class="analysis-tabs-row" id="analysisTabsRow">
                <button class="analysis-tab-btn active" data-tab="overview">📊 Полный анализ</button>
                <button class="analysis-tab-btn" data-tab="patterns">🔄 Петли</button>
                <button class="analysis-tab-btn" data-tab="recommendations">🌱 Рост</button>
                <button class="analysis-tab-btn" data-tab="thought">🧠 Психолог</button>
            </div>
            <div class="analysis-content" id="analysisTabContent"></div>
            <!-- Скачивание — внизу, под текстом (решение владельца 14.09.2026).
                 Наверху, рядом с «Назад», кнопка предлагала сохранить разбор
                 раньше, чем человек его прочитал: сохраняют то, что уже
                 прочли и хотят оставить. -->
            <div class="analysis-footer">
                <button class="back-btn" id="analysisSaveBtn">⬇️ СКАЧАТЬ РАЗБОР</button>
            </div>
        </div>`;

    document.getElementById('analysisBackBtn').onclick = () => _goHome();
    const saveBtn = document.getElementById('analysisSaveBtn');
    if (saveBtn) saveBtn.onclick = () => _downloadAnalysis();

    document.querySelectorAll('.analysis-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.analysis-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _tab = btn.dataset.tab;
            _renderTab(_tab);
            _scrollToTop();
        });
    });

    _renderTab('overview');
    _scrollToTop();
}

/**
 * Разбор начинается сверху, а не с того места, где стоял экран.
 *
 * 14.09.2026 владелец открыл готовый отчёт и оказался в конце текста:
 * экран теста — длинная лента сообщений, и после перерисовки прокрутка
 * оставалась там, где была. Человек видел хвост разбора и не понимал, с
 * чего начинать читать.
 *
 * Прокручиваем и окно, и возможный внутренний контейнер: экран живёт в
 * screenContainer, и скроллится в разных браузерах то один, то другое.
 */
function _scrollToTop() {
    const go = () => {
        try { window.scrollTo(0, 0); } catch {}
        ['screenContainer', 'analysisTabContent'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.scrollTop = 0;
        });
        const page = document.querySelector('.analysis-page');
        if (page && typeof page.scrollIntoView === 'function') {
            page.scrollIntoView({ block: 'start' });
        }
    };
    go();
    // Второй заход после кадра отрисовки: до него высота контента ещё
    // нулевая, и браузер возвращает прокрутку обратно.
    requestAnimationFrame(go);
}

// ============================================
// ВКЛАДКИ
// ============================================
function _renderTab(tab) {
    const el = document.getElementById('analysisTabContent');
    if (!el) return;

    if (tab === 'overview')         el.innerHTML = _tabOverview();
    else if (tab === 'patterns')    el.innerHTML = _tabPatterns();
    else if (tab === 'recommendations') el.innerHTML = _tabGrowth();
    else if (tab === 'thought')     el.innerHTML = _tabThought();
}

function _section(title, key) {
    if (!_analysis[key]) return '';
    return `<div class="analysis-section-title">${title}</div>${_fmt(_analysis[key])}`;
}

function _empty(icon, title, sub) {
    return `<div class="analysis-empty">
        <div class="analysis-empty-icon">${icon}</div>
        <div class="analysis-empty-title">${title}</div>
        <div class="analysis-empty-sub">${sub}</div>
    </div>`;
}

function _tabOverview() {
    const sections = [
        ['📊 Глубинный портрет',     'portrait'],
        ['🔄 Системные петли',        'loops'],
        ['🧠 Скрытые механизмы',      'mechanisms'],
        ['🌱 Точки роста',            'growth'],
        ['📈 Прогноз',                'forecast'],
        ['🔑 Персональные ключи',     'keys']
    ];
    const html = sections.map(([t, k]) => _section(t, k)).join('');
    return html || _empty('📊', 'Анализ ещё не выполнен',
        'Нажмите «Новый анализ» внизу экрана');
}

function _tabPatterns() {
    const html = _section('🔄 Системные петли', 'loops') +
                 _section('🧠 Скрытые механизмы', 'mechanisms');
    return html || _empty('🔄', 'Раздел недоступен', 'Сначала проведите анализ');
}

function _tabGrowth() {
    const html = _section('🌱 Точки роста', 'growth') +
                 _section('🔑 Персональные ключи', 'keys');
    return html || _empty('🌱', 'Раздел недоступен', 'Сначала проведите анализ');
}

function _tabThought() {
    if (!_analysis.thought) {
        return _empty('🧠', 'Мысли психолога', 'Появятся после завершения теста');
    }
    const body = _analysis.thought
        .replace(/\*\*(.*?)\*\*/g, '<strong class="analysis-bold">$1</strong>')
        .replace(/\n/g, '<br>');
    return `
        <div class="analysis-thought-card">
            <div class="analysis-thought-header">
                <div class="analysis-thought-icon">🧠</div>
                <div>
                    <div class="analysis-thought-label">Фреди говорит</div>
                    <div class="analysis-thought-name">Мысли психолога</div>
                </div>
            </div>
            <div class="analysis-thought-body">${body}</div>
        </div>`;
}

// ============================================
// ЗАГЛУШКА
// ============================================
// ============================================
// ЗАМОК: что внутри разбора и первый шаг — без подписки
// ============================================
function _isPremium() {
    if (window.IS_PREMIUM === true) return true;
    try {
        const s = window.FrediMeter && window.FrediMeter.lastCheck;
        return !!(s && (s.is_premium || s.has_subscription));
    } catch (e) { return false; }
}

// Первый шаг на сегодня считает meter.js (он загружен всегда):
// window.frediFirstStepFor(displayName).
function firstStepFor(code) {
    return (typeof window.frediFirstStepFor === 'function')
        ? window.frediFirstStepFor(code)
        : 'Сегодня вспомните одну ситуацию, где промолчали, и запишите одним предложением, что хотели сказать.';
}

/**
 * Замок на полный разбор — модалкой, а не отдельным экраном.
 *
 * До 14.09.2026 человек без подписки, нажав «Полный разбор», попадал на
 * целый экран-заглушку вместо того, что он читал: экран теста исчезал, и
 * возвращаться приходилось руками. Модалка оставляет его там, где он был:
 * закрыл — и продолжил читать свой разбор.
 */
/**
 * Полный разбор одним документом.
 *
 * Шесть разделов — это то, за что человек заплатил, и возвращаться к ним
 * он будет не через приложение, а когда припечёт. Печать, а не библиотека
 * PDF: те рисуют кириллицу картинкой, текст не выделяется и не ищется.
 * Системный диалог даёт «Сохранить как PDF» на всех платформах.
 */
function _downloadAnalysis() {
    const esc = t => String(t == null ? '' : t)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sections = [
        ['Глубинный портрет', 'portrait'],
        ['Системные петли', 'loops'],
        ['Скрытые механизмы', 'mechanisms'],
        ['Точки роста', 'growth'],
        ['Прогноз', 'forecast'],
        ['Персональные ключи', 'keys'],
        ['Мысли психолога', 'thought']
    ];
    const body = sections
        .filter(([, k]) => _analysis[k])
        .map(([t, k]) => `<h2>${esc(t)}</h2><div class="s">${esc(_analysis[k])}</div>`)
        .join('');
    if (!body) {
        if (window.showToast) window.showToast('Разбор ещё не собран', 'error');
        return;
    }
    const code = (_profile && (_profile.profile_data || {}).display_name) || '';
    const site = location.origin;

    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Глубинный разбор${code ? ' — ' + esc(code) : ''}</title>
<style>
  body{font:15px/1.7 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:760px;margin:32px auto;padding:0 20px}
  h1{font-size:24px;margin:0 0 4px}
  h2{font-size:17px;margin:26px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .meta{color:#555;font-size:13px;margin-bottom:18px}
  .s{white-space:pre-wrap}
  .foot{margin-top:32px;color:#666;font-size:12px;border-top:1px solid #ddd;padding-top:10px}
  @media print{body{margin:0}}
</style></head><body>
<h1>Глубинный разбор</h1>
<div class="meta">${code ? 'Код профиля ' + esc(code) + ' · ' : ''}${new Date().toLocaleDateString('ru-RU')}</div>
${body}
<div class="foot">Фреди — ИИ-психолог · <a href="${esc(site)}/fredi/">${esc(site)}/fredi/</a><br>
Это не медицинский диагноз. При тяжёлом состоянии нужен врач.</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
        if (window.showToast) window.showToast('Разрешите всплывающие окна, чтобы сохранить разбор', 'error');
        return;
    }
    w.document.write(html);
    w.document.close();
    // Без задержки Safari печатает пустую страницу.
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 400);
    try {
        if (window.FrediTracker && window.FrediTracker.track) {
            window.FrediTracker.track('analysis_downloaded', {});
        }
        if (typeof window.ym === 'function') {
            [108965607, 108138656].forEach(c => {
                try { window.ym(c, 'reachGoal', 'analysis_downloaded'); } catch (e) {}
            });
        }
    } catch (e) {}
}

function _showLockModal() {
    if (document.getElementById('analysisLockOverlay')) return;
    _injectLockStyles();
    const code = (_profile && (_profile.profile_data || {}).display_name) || '';
    const step = firstStepFor(code);
    try { if (window.FrediTracker && window.FrediTracker.track) window.FrediTracker.track('analysis_lock_shown', {}); } catch (e) {}

    const o = document.createElement('div');
    o.className = 'alock-overlay';
    o.id = 'analysisLockOverlay';
    o.innerHTML = `
        <div class="alock-modal" role="dialog" aria-modal="true" aria-label="Полный разбор доступен с подпиской">
            <button class="alock-close" id="alockClose" aria-label="Закрыть">✕</button>
            <div class="alock-emoji">🔒</div>
            <div class="alock-title">Полный разбор — с подпиской</div>
            <div class="alock-text">Портрет и первый шаг у вас уже есть, они бесплатны. Шесть разделов разбора открываются с подпиской.</div>
            <div class="alock-step"><b>✅ Первый шаг на сегодня — бесплатно</b><br>${step}</div>
            <ul class="alock-list">
                <li><b>Глубинный портрет</b> — как устроены ваши реакции, а не только их названия</li>
                <li><b>Системные петли</b> — что изматывает по кругу и где у петли вход</li>
                <li><b>Скрытые механизмы</b> — зачем психика держится за привычное</li>
                <li><b>Точки роста</b> — три места, где изменение даёт больше всего</li>
                <li><b>Прогноз</b> — что будет через полгода, если ничего не менять, и если менять</li>
                <li><b>Персональные ключи</b> — что говорить себе в момент срыва</li>
            </ul>
            <button class="alock-btn alock-btn-primary" id="alockSub">✨ Открыть разбор — неделя 290 ₽</button>
            <button class="alock-btn" id="alockLater">Позже</button>
            <div class="alock-note">Потом 990 ₽ в месяц, отключается в один клик в разделе «Подписка».</div>
        </div>`;
    document.body.appendChild(o);

    const close = () => { try { o.remove(); } catch (e) {} };
    o.querySelector('#alockClose').onclick = close;
    o.querySelector('#alockLater').onclick = close;
    // Клик мимо окна закрывает — иначе замок выглядит как ловушка.
    o.addEventListener('click', e => { if (e.target === o) close(); });
    o.querySelector('#alockSub').onclick = () => {
        try { if (window.FrediTracker && window.FrediTracker.track) window.FrediTracker.track('meter_subscribe_clicked', { source: 'analysis_lock' }); } catch (e) {}
        close();
        if (typeof window.openCheckout === 'function') window.openCheckout('analysis_lock');
    };
}

function _injectLockStyles() {
    if (document.getElementById('analysis-lock-styles')) return;
    const st = document.createElement('style');
    st.id = 'analysis-lock-styles';
    st.textContent = `
        .alock-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,.7);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);padding:16px}
        .alock-modal{position:relative;max-width:420px;width:100%;max-height:88vh;overflow-y:auto;
            background:#17181c;border:1px solid rgba(224,224,224,.18);border-radius:22px;padding:26px 22px 20px;
            color:#e6e6e6;font-family:inherit;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}
        .alock-close{position:absolute;top:10px;right:12px;background:none;border:none;color:#9a9a9a;
            font-size:18px;cursor:pointer;padding:4px 8px;line-height:1}
        .alock-emoji{font-size:34px;margin-bottom:8px}
        .alock-title{font-size:19px;font-weight:700;margin-bottom:10px}
        .alock-text{font-size:14px;line-height:1.6;color:#b9b9b9;margin-bottom:14px}
        .alock-step{font-size:13.5px;line-height:1.6;text-align:left;border-left:3px solid #3b82ff;
            padding:8px 0 8px 12px;margin:0 0 14px;color:#d6d6d6}
        .alock-list{text-align:left;margin:0 0 16px;padding-left:20px;font-size:13.5px;line-height:1.6;color:#b9b9b9}
        .alock-list li{margin:5px 0}
        .alock-btn{display:block;width:100%;padding:13px 16px;margin-top:9px;border-radius:14px;
            border:1px solid rgba(224,224,224,.2);background:rgba(224,224,224,.06);color:#e6e6e6;
            font-size:14.5px;font-weight:600;font-family:inherit;cursor:pointer}
        .alock-btn-primary{background:#3b82ff;border-color:#3b82ff;color:#fff}
        .alock-note{font-size:12px;color:#8f8f8f;margin-top:10px}
        @media (max-width:420px){.alock-modal{padding:22px 16px 16px}}`;
    document.head.appendChild(st);
}

function _renderLocked() {
    _injectStyles();
    const c = document.getElementById('screenContainer');
    if (!c) return;
    const code = (_profile && (_profile.profile_data || {}).display_name) || '';
    const step = firstStepFor(code);
    try { if (window.FrediTracker && window.FrediTracker.track) window.FrediTracker.track('analysis_lock_shown', {}); } catch (e) {}
    c.innerHTML = `
        <div class="analysis-page">
            <button class="back-btn" id="analysisBackBtn">◀️ НАЗАД</button>
            <div class="analysis-heading">
                <h1>🧠 Полный разбор вашего теста</h1>
                <p>Портрет и первый шаг — бесплатно. Шесть разделов разбора — с подпиской.</p>
            </div>
            <div class="analysis-card" style="margin-bottom:14px">
                <div class="analysis-card-title">✅ Первый шаг на сегодня — бесплатно</div>
                <div class="analysis-card-text">${step}</div>
            </div>
            <div class="analysis-card" style="opacity:.92">
                <div class="analysis-card-title">🔒 Что откроется с подпиской</div>
                <ul style="margin:8px 0 0;padding-left:20px;line-height:1.6">
                    <li><b>Глубинный портрет</b> — как устроены ваши реакции, а не только их названия</li>
                    <li><b>Системные петли</b> — что вас изматывает по кругу и где у петли вход</li>
                    <li><b>Скрытые механизмы</b> — зачем психика держится за привычное</li>
                    <li><b>Точки роста</b> — три места, где изменение даёт больше всего</li>
                    <li><b>Прогноз</b> — что будет через полгода, если ничего не менять, и если менять</li>
                    <li><b>Персональные ключи</b> — что говорить себе в момент срыва</li>
                </ul>
                <div style="font-size:13px;opacity:.75;margin-top:10px">Плюс коуч и тренер без лимита, голос и память Фреди о каждом разговоре.</div>
                <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
                    <button class="back-btn" id="analysisLockSub" style="background:#3b82ff;color:#fff;border-color:#3b82ff">✨ Открыть разбор — неделя 290 ₽</button>
                    <button class="back-btn" id="analysisLockHome">🏠 На главную</button>
                </div>
                <div style="font-size:12px;opacity:.65;margin-top:8px">Потом 990 ₽ в месяц, отключается в один клик в разделе «Подписка».</div>
            </div>
        </div>`;
    document.getElementById('analysisBackBtn').onclick = () => _goHome();
    document.getElementById('analysisLockHome').onclick = () => _goHome();
    document.getElementById('analysisLockSub').onclick = () => {
        try { if (window.FrediTracker && window.FrediTracker.track) window.FrediTracker.track('meter_subscribe_clicked', { source: 'analysis_lock' }); } catch (e) {}
        if (typeof window.openCheckout === 'function') window.openCheckout('analysis_lock');
    };
    _removeFooter();
}

function _renderFallback() {
    _injectStyles();
    const c = document.getElementById('screenContainer');
    if (!c) return;
    c.innerHTML = `
        <div class="analysis-page">
            <div class="analysis-empty">
                <div class="analysis-empty-icon">🧠</div>
                <div class="analysis-empty-title">Анализ формируется</div>
                <div class="analysis-empty-sub">Попробуйте снова через несколько секунд</div>
                <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;justify-content:center">
                    <button class="back-btn" id="fallbackRetry">🔄 Попробовать снова</button>
                    <button class="back-btn" id="fallbackHome">🏠 На главную</button>
                </div>
            </div>
        </div>`;
    document.getElementById('fallbackRetry').onclick = () => generateDeepAnalysis();
    document.getElementById('fallbackHome').onclick  = () => _goHome();
    _removeFooter();
}

// ============================================
// НАВИГАЦИЯ
// ============================================
function _goHome() {
    _removeFooter();
    if (typeof renderDashboard === 'function') renderDashboard();
    else if (window.renderDashboard) window.renderDashboard();
}

// Совместимость со старым кодом
function goToDashboard() { _goHome(); }
function switchTab(tab)  { _tab = tab; _renderTab(tab); }
function renderFallbackAnalysis() { _renderFallback(); }
function showAnalysisLoading(msg, sub) { _showLoader(msg, sub); }

// ============================================
// ЭКСПОРТ
// ============================================
window.openAnalysisScreen      = openAnalysisScreen;
window.generateDeepAnalysis    = generateDeepAnalysis;
window.regenerateDeepAnalysis  = regenerateDeepAnalysis;
window.switchTab               = switchTab;
window.goToDashboard           = goToDashboard;

console.log('✅ analysis.js v8.0 загружен');
