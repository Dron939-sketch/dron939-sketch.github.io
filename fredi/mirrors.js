// ============================================
// 🪞 ЗЕРКАЛА / ОТРАЖЕНИЯ
// Версия 3.0 — Premium Black AMG Edition
// ============================================

const API_BASE = window.API_BASE_URL || 'https://fredi-backend-flz2.onrender.com';

// ============================================
// ПРЕМИУМ СТИЛИ (AMG + NEON + GLASS)
// ============================================
function injectMirrorStyles() {
    if (document.getElementById('mirror-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'mirror-styles';
    style.textContent = `
        /* -------------------- КЛЮЧЕВЫЕ КАДРЫ -------------------- */
        @keyframes mirrorFadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mirrorPulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.02); }
        }
        @keyframes mirrorGlowPulse {
            0%, 100% { border-color: rgba(255,107,59,0.3); box-shadow: 0 0 0 0 rgba(255,107,59,0); }
            50% { border-color: rgba(255,107,59,0.6); box-shadow: 0 0 20px rgba(255,107,59,0.2); }
        }
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        @keyframes borderFlow {
            0%, 100% { border-image-source: linear-gradient(135deg, #ff6b3b, #ff3b3b, #00d4ff); }
            50% { border-image-source: linear-gradient(135deg, #00d4ff, #ff6b3b, #ff3b3b); }
        }

        /* -------------------- БАЗОВЫЙ ФОН (CARBON) -------------------- */
        .mirror-bg {
            background: radial-gradient(circle at 20% 30%, #0a0a0a, #050505);
            position: relative;
        }
        .mirror-bg::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.008) 0px, rgba(255,255,255,0.008) 2px, transparent 2px, transparent 8px);
            pointer-events: none;
            z-index: 0;
        }

        /* -------------------- СТЕКЛЯННЫЕ КОМПОНЕНТЫ -------------------- */
        .mirror-glass {
            background: rgba(10, 10, 15, 0.6);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .mirror-glass-light {
            background: rgba(20, 20, 30, 0.5);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 20px;
        }

        /* -------------------- НЕОНОВЫЕ КНОПКИ -------------------- */
        .mirror-neon-btn {
            background: linear-gradient(135deg, rgba(255,107,59,0.15), rgba(255,59,59,0.05));
            border: 1px solid rgba(255,107,59,0.4);
            border-radius: 14px;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .mirror-neon-btn:hover {
            border-color: rgba(255,107,59,0.8);
            box-shadow: 0 0 24px rgba(255,107,59,0.3);
            transform: translateY(-2px);
        }

        /* -------------------- КАРТОЧКИ -------------------- */
        .mirror-card {
            background: rgba(15, 15, 20, 0.7);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 24px;
            padding: 20px;
            margin-bottom: 12px;
            transition: all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
            animation: mirrorFadeIn 0.4s ease both;
            cursor: pointer;
        }
        .mirror-card:hover {
            border-color: rgba(255,107,59,0.35);
            background: rgba(255,107,59,0.05);
            transform: translateY(-3px);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        }

        /* -------------------- ПРОГРЕСС-БАРЫ С НЕОНОМ -------------------- */
        .mirror-vector-bar-track {
            background: rgba(255, 255, 255, 0.06);
            border-radius: 4px;
            height: 5px;
            overflow: hidden;
        }
        .mirror-vector-bar-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.6s cubic-bezier(0.2, 0.9, 0.4, 1.1);
            box-shadow: 0 0 6px currentColor;
        }

        /* -------------------- ЦВЕТА ВЕКТОРОВ -------------------- */
        .vector-sb { color: #ff3b3b; background: #ff3b3b; box-shadow: 0 0 6px #ff3b3b; }
        .vector-tf { color: #ff6b3b; background: #ff6b3b; box-shadow: 0 0 6px #ff6b3b; }
        .vector-ub { color: #fbbf24; background: #fbbf24; box-shadow: 0 0 6px #fbbf24; }
        .vector-cv { color: #00d4ff; background: #00d4ff; box-shadow: 0 0 6px #00d4ff; }

        /* -------------------- ХРОМОВЫЕ ИКОНКИ -------------------- */
        .mirror-chrome-icon {
            background: linear-gradient(135deg, #e0e0e0, #a0a0a0, #c0c0c0);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }

        /* -------------------- СКЕЛЕТОН -------------------- */
        .mirror-skeleton {
            background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 8px;
        }

        /* -------------------- ТАБЫ -------------------- */
        .mirror-tab-btn {
            flex: 1;
            padding: 12px 8px;
            border: none;
            border-radius: 14px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s;
            font-family: inherit;
            letter-spacing: 0.5px;
        }
        .mirror-tab-btn.active {
            background: linear-gradient(135deg, #ff6b3b, #ff3b3b);
            color: #fff;
            box-shadow: 0 4px 20px rgba(255,107,59,0.4);
        }
        .mirror-tab-btn.inactive {
            background: transparent;
            color: rgba(255, 255, 255, 0.4);
        }
        .mirror-tab-btn.inactive:hover {
            color: rgba(255, 255, 255, 0.8);
            background: rgba(255, 255, 255, 0.05);
        }

        /* -------------------- ССЫЛКА -------------------- */
        .mirror-link-box {
            background: #000;
            border: 1px solid rgba(255,107,59,0.3);
            border-radius: 14px;
            padding: 14px 16px;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 11px;
            color: #00d4ff;
            word-break: break-all;
            letter-spacing: 0.3px;
            box-shadow: inset 0 0 8px rgba(0,0,0,0.5), 0 0 4px rgba(0,212,255,0.2);
        }

        /* -------------------- 4F КАРТОЧКИ -------------------- */
        .mirror-4f-card {
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 12px;
            border-left: 3px solid;
            background: rgba(15, 15, 20, 0.7);
            backdrop-filter: blur(12px);
            animation: mirrorFadeIn 0.3s ease both;
            transition: all 0.2s;
        }
        .mirror-4f-card:hover {
            transform: translateX(4px);
            background: rgba(20, 20, 30, 0.8);
        }

        /* -------------------- ОБЩИЕ -------------------- */
        .mirror-wrap {
            padding-bottom: max(80px, calc(env(safe-area-inset-bottom, 0px) + 80px));
        }
        .mirror-section-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.3);
            margin-bottom: 14px;
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// API ФУНКЦИИ
// ============================================
async function apiCreateMirror(userId, mirrorType) {
    const res = await fetch(`${API_BASE}/api/mirrors/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, mirror_type: mirrorType })
    });
    return res.json();
}
async function apiGetReflections(userId) {
    const res = await fetch(`${API_BASE}/api/mirrors/${userId}/reflections`);
    return res.json();
}

// ============================================
// ГЛАВНЫЙ ЭКРАН
// ============================================
async function showMirrorsScreen() {
    injectMirrorStyles();
    const container = document.getElementById('screenContainer');
    
    container.innerHTML = `
        <div class="mirror-bg" style="min-height:100vh; position:relative; z-index:1;">
            <div class="mirror-wrap" style="max-width:600px; margin:0 auto; padding:20px 16px;">

                <!-- ШАПКА -->
                <div style="display:flex; align-items:center; gap:16px; margin-bottom:28px; animation:mirrorFadeIn 0.3s ease;">
                    <div style="width:56px; height:56px; border-radius:18px; background:linear-gradient(135deg,#ff6b3b,#ff3b3b);
                                display:flex; align-items:center; justify-content:center; font-size:28px;
                                box-shadow:0 8px 24px rgba(255,59,59,0.3);">🪞</div>
                    <div>
                        <div style="font-size:24px; font-weight:700; letter-spacing:-0.5px;
                                    background:linear-gradient(135deg,#fff,#a0a0a0); -webkit-background-clip:text; background-clip:text; color:transparent;">
                            Зеркало
                        </div>
                        <div style="font-size:12px; color:rgba(255,255,255,0.35); margin-top:4px;">
                            Отправь ссылку — получи профиль друга
                        </div>
                    </div>
                </div>

                <!-- ТАБЫ -->
                <div style="display:flex; gap:8px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
                            border-radius:20px; padding:5px; margin-bottom:24px;">
                    <button class="mirror-tab-btn active" id="tab-reflections" onclick="switchMirrorTab('reflections')">
                        👥 Мои отражения
                    </button>
                    <button class="mirror-tab-btn inactive" id="tab-create" onclick="switchMirrorTab('create')">
                        🔗 Создать ссылку
                    </button>
                </div>

                <div id="mirrorTabContent"></div>
            </div>
        </div>
    `;
    
    switchMirrorTab('reflections');
}

function switchMirrorTab(tab) {
    ['reflections','create'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            if (t === tab) {
                btn.classList.add('active');
                btn.classList.remove('inactive');
            } else {
                btn.classList.remove('active');
                btn.classList.add('inactive');
            }
        }
    });
    const content = document.getElementById('mirrorTabContent');
    if (tab === 'reflections') showReflectionsTab(content);
    else showCreateLinkTab(content);
}

// ============================================
// ТАБ: ОТРАЖЕНИЯ
// ============================================
async function showReflectionsTab(container) {
    container.innerHTML = `
        <div style="padding:32px; text-align:center;">
            <div class="mirror-skeleton" style="width:60%; height:14px; margin:0 auto 10px;"></div>
            <div class="mirror-skeleton" style="width:40%; height:14px; margin:0 auto;"></div>
        </div>`;

    try {
        const data = await apiGetReflections(window.USER_ID);
        const reflections = data.reflections || [];
        const stats = data.stats || {};

        if (!reflections.length) {
            container.innerHTML = `
                <div style="animation:mirrorFadeIn 0.4s ease;">
                    <div style="text-align:center; padding:48px 24px; background:rgba(255,255,255,0.02);
                                border:1px dashed rgba(255,255,255,0.08); border-radius:28px; margin-bottom:20px;">
                        <div style="font-size:64px; margin-bottom:16px; opacity:0.5;">🌑</div>
                        <div style="font-size:18px; font-weight:600; color:#fff; margin-bottom:8px;">Зеркало пусто</div>
                        <div style="font-size:13px; color:rgba(255,255,255,0.35); max-width:260px; margin:0 auto 24px;">
                            Отправь ссылку другу. Когда он пройдёт тест — его профиль откроется тебе.
                        </div>
                        <button onclick="switchMirrorTab('create')"
                            class="mirror-neon-btn" style="padding:14px 28px; font-size:14px; font-weight:600;">
                            Создать первую ссылку →
                        </button>
                    </div>

                    <div class="mirror-glass" style="padding:20px;">
                        <div class="mirror-section-label">🔮 КАК ЭТО РАБОТАЕТ</div>
                        ${[
                            '1️⃣ Создаёшь уникальную ссылку',
                            '2️⃣ Отправляешь другу в Telegram или MAX',
                            '3️⃣ Друг проходит тест по твоей ссылке',
                            '4️⃣ Тебе открывается его полный профиль + интимный + 4F ключи'
                        ].map(s => `
                            <div style="display:flex; align-items:center; gap:12px; padding:12px 0;
                                        border-bottom:1px solid rgba(255,255,255,0.04); font-size:13px; color:rgba(255,255,255,0.55);">
                                ${s}
                            </div>`).join('')}
                    </div>
                </div>`;
            return;
        }

        // Статистика
        let html = `
            <div style="display:flex; gap:12px; margin-bottom:24px; animation:mirrorFadeIn 0.3s ease;">
                <div class="mirror-glass" style="flex:1; padding:18px; text-align:center;">
                    <div style="font-size:34px; font-weight:700; color:#fff;">${stats.total_mirrors || 0}</div>
                    <div style="font-size:11px; color:rgba(255,255,255,0.4); margin-top:6px;">Создано зеркал</div>
                </div>
                <div class="mirror-glass" style="flex:1; padding:18px; text-align:center; border-color:rgba(255,107,59,0.3);">
                    <div style="font-size:34px; font-weight:700; background:linear-gradient(135deg,#ff6b3b,#ff3b3b);
                                -webkit-background-clip:text; background-clip:text; color:transparent;">${reflections.length}</div>
                    <div style="font-size:11px; color:rgba(255,255,255,0.4); margin-top:6px;">Отражений</div>
                </div>
            </div>
            <div class="mirror-section-label">👥 ОТРАЖЕНИЯ</div>`;

        reflections.forEach((ref, i) => {
            const name = ref.friend_name || `Пользователь ${i+1}`;
            const profile = ref.friend_profile_code || '—';
            const date = ref.completed_at ? new Date(ref.completed_at).toLocaleDateString('ru') : '';
            const vectors = ref.friend_vectors || {};
            
            html += `
                <div class="mirror-card" style="animation-delay:${i * 0.05}s"
                     onclick="showFriendProfile(${JSON.stringify(ref).replace(/"/g, '&quot;')})">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                        <div style="display:flex; align-items:center; gap:14px;">
                            <div style="width:48px; height:48px; border-radius:50%;
                                        background:linear-gradient(135deg,rgba(255,107,59,0.3),rgba(255,59,59,0.15));
                                        border:1px solid rgba(255,107,59,0.3);
                                        display:flex; align-items:center; justify-content:center;
                                        font-size:20px; font-weight:700; color:#fff;">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-size:16px; font-weight:600; color:#fff;">${name}</div>
                                <div style="font-size:11px; color:rgba(255,255,255,0.35); margin-top:4px;">${date}</div>
                            </div>
                        </div>
                        <div style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08);
                                    border-radius:8px; padding:5px 12px; font-size:11px; color:rgba(255,255,255,0.5);
                                    font-family:monospace; letter-spacing:0.5px;">${profile}</div>
                    </div>

                    ${Object.keys(vectors).length ? `
                    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:14px;">
                        ${Object.entries(vectors).map(([k, v]) => {
                            const pct = Math.round((v/6)*100);
                            const colorClass = k === 'СБ' ? 'vector-sb' : k === 'ТФ' ? 'vector-tf' : k === 'УБ' ? 'vector-ub' : 'vector-cv';
                            const color = k === 'СБ' ? '#ff3b3b' : k === 'ТФ' ? '#ff6b3b' : k === 'УБ' ? '#fbbf24' : '#00d4ff';
                            return `<div style="text-align:center;">
                                <div style="font-size:16px; font-weight:700; color:${color};">${Math.round(v)}</div>
                                <div style="font-size:10px; color:rgba(255,255,255,0.4); margin-bottom:6px;">${k}</div>
                                <div class="mirror-vector-bar-track">
                                    <div class="mirror-vector-bar-fill" style="width:${pct}%; background:${color};"></div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>` : ''}

                    <div style="font-size:12px; color:#ff6b3b; text-align:right; letter-spacing:0.5px;">
                        Открыть профиль →
                    </div>
                </div>`;
        });

        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = `
            <div class="mirror-glass" style="padding:24px; text-align:center;">
                <div style="font-size:24px; margin-bottom:8px;">⚠️</div>
                <div style="font-size:13px; color:rgba(255,255,255,0.6);">Ошибка загрузки</div>
                <button onclick="switchMirrorTab('reflections')"
                    style="margin-top:16px; background:rgba(255,255,255,0.08); border:none;
                           border-radius:10px; padding:10px 20px; color:#fff; cursor:pointer;">
                    Повторить
                </button>
            </div>`;
    }
}

// ============================================
// ТАБ: СОЗДАТЬ ССЫЛКУ
// ============================================
async function showCreateLinkTab(container) {
    container.innerHTML = `
        <div style="animation:mirrorFadeIn 0.35s ease;">
            <!-- ВЫБОР ПЛАТФОРМЫ -->
            <div class="mirror-glass" style="padding:20px; margin-bottom:20px;">
                <div class="mirror-section-label">ВЫБЕРИ ПЛАТФОРМУ</div>
                
                ${[
                    { type: 'telegram', icon: '✈️', name: 'Telegram', desc: 't.me/Nanotech_varik_bot?start=mirror_...', color: '#0088cc' },
                    { type: 'max', icon: '⚡', name: 'MAX', desc: 'Ссылка для MAX мессенджера', color: '#ff6b3b' },
                    { type: 'web', icon: '🌐', name: 'Веб-ссылка', desc: 'fredi-frontend.onrender.com/?ref=...', color: 'rgba(255,255,255,0.5)' }
                ].map(p => `
                    <button onclick="generateMirrorLink('${p.type}')"
                        style="display:flex; align-items:center; gap:16px; width:100%; padding:18px 20px;
                               background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);
                               border-radius:18px; margin-bottom:10px; cursor:pointer; transition:all 0.2s;"
                        onmouseover="this.style.borderColor='${p.color}'; this.style.transform='translateX(6px)'"
                        onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'; this.style.transform='none'">
                        <div style="width:48px; height:48px; border-radius:14px; background:rgba(0,0,0,0.4);
                                    display:flex; align-items:center; justify-content:center; font-size:26px;">${p.icon}</div>
                        <div style="flex:1; text-align:left;">
                            <div style="font-size:15px; font-weight:600; color:#fff;">${p.name}</div>
                            <div style="font-size:11px; color:rgba(255,255,255,0.35); margin-top:4px;">${p.desc}</div>
                        </div>
                        <div style="color:rgba(255,255,255,0.2); font-size:20px;">›</div>
                    </button>
                `).join('')}
            </div>

            <div id="generatedLinkBlock"></div>

            <!-- ЧТО ОТКРОЕТСЯ -->
            <div class="mirror-glass" style="padding:20px;">
                <div class="mirror-section-label">ЧТО ОТКРОЕТСЯ ТЕБЕ</div>
                ${[
                    { emoji: '🧠', title: 'ПСИХОЛОГИЧЕСКИЙ ПРОФИЛЬ', desc: 'Тип восприятия, векторы поведения (СБ/ТФ/УБ/ЧВ), уровень мышления, глубинные паттерны', color: '#fff' },
                    { emoji: '🔞', title: 'ИНТИМНЫЙ ПРОФИЛЬ', desc: 'Что возбуждает, что гасит желание, сексуальный паттерн, главная потребность', color: '#3b82ff' },
                    { emoji: '🔑', title: '4F КЛЮЧИ', desc: '🔥 Ярость — как погасить   🏃 Страх — якоря безопасности   🧬 Желание — слова-пароли   🍽 Деньги — мотиваторы', color: '#f39c12' }
                ].map(s => `
                    <div style="display:flex; gap:16px; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <div style="font-size:24px;">${s.emoji}</div>
                        <div>
                            <div style="font-size:12px; font-weight:700; color:${s.color}; letter-spacing:0.5px; margin-bottom:6px;">${s.title}</div>
                            <div style="font-size:12px; color:rgba(255,255,255,0.4); line-height:1.5;">${s.desc}</div>
                        </div>
                    </div>`).join('')}

                <button onclick="showProfileExample()"
                    style="width:100%; margin-top:16px; background:transparent; border:1px solid rgba(255,255,255,0.1);
                           border-radius:14px; padding:12px; color:rgba(255,255,255,0.5); font-size:13px;
                           font-weight:600; cursor:pointer; transition:all 0.2s;"
                    onmouseover="this.style.borderColor='rgba(255,107,59,0.5)'; this.style.color='rgba(255,107,59,0.8)'"
                    onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.color='rgba(255,255,255,0.5)'">
                    👁 Посмотреть пример профиля
                </button>
            </div>
        </div>`;
}

async function generateMirrorLink(mirrorType) {
    const block = document.getElementById('generatedLinkBlock');
    if (!block) return;
    block.innerHTML = `
        <div class="mirror-glass" style="padding:20px; margin-bottom:20px; text-align:center;">
            <div class="mirror-skeleton" style="width:50%; height:12px; margin:0 auto 8px;"></div>
            <div class="mirror-skeleton" style="width:70%; height:12px; margin:0 auto;"></div>
        </div>`;

    try {
        const data = await apiCreateMirror(window.USER_ID, mirrorType);
        if (!data.success) throw new Error(data.error || 'Ошибка');

        const link = data.link;
        const text = data.invite_text;
        const icons = { telegram: '✈️', max: '⚡', web: '🌐' };

        block.innerHTML = `
            <div class="mirror-glass" style="padding:20px; margin-bottom:20px; border:1px solid rgba(255,107,59,0.2);">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:18px;">
                    <span style="font-size:24px;">${icons[mirrorType] || '🔗'}</span>
                    <span style="font-size:14px; font-weight:700; color:#ff6b3b;">Ссылка создана!</span>
                </div>

                <div class="mirror-link-box">${link}</div>

                <div class="mirror-glass-light" style="padding:14px; margin:16px 0; font-size:12px; color:rgba(255,255,255,0.5); font-style:italic;">
                    «${text}»
                </div>

                <div style="display:flex; gap:12px;">
                    <button onclick="copyMirrorLink('${link}')"
                        style="flex:1; background:linear-gradient(135deg,#ff6b3b,#ff3b3b); color:#fff; border:none;
                               border-radius:14px; padding:14px; font-size:13px; font-weight:600; cursor:pointer;">
                        📋 Скопировать
                    </button>
                    <button onclick="shareMirrorLink('${link}','${text.replace(/'/g, "\\'")}')"
                        style="flex:1; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1);
                               border-radius:14px; padding:14px; font-size:13px; font-weight:600; cursor:pointer;">
                        📤 Поделиться
                    </button>
                </div>
            </div>`;
    } catch(e) {
        block.innerHTML = `
            <div class="mirror-glass" style="padding:20px; margin-bottom:20px; text-align:center; border-color:rgba(59,130,246,0.3);">
                <div style="color:rgba(59,130,246,0.8); font-size:13px;">❌ ${e.message}</div>
            </div>`;
    }
}

function copyMirrorLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        if (typeof showToast === 'function') showToast('✅ Ссылка скопирована!');
    }).catch(() => {
        const el = document.createElement('textarea');
        el.value = link;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        if (typeof showToast === 'function') showToast('✅ Ссылка скопирована!');
    });
}

function shareMirrorLink(link, text) {
    if (navigator.share) navigator.share({ title: 'Фреди — психологический профиль', text, url: link });
    else copyMirrorLink(link);
}

// ============================================
// ПРОФИЛЬ ДРУГА
// ============================================
async function showFriendProfile(ref) {
    const container = document.getElementById('screenContainer');
    const name = ref.friend_name || 'Друг';
    const profile = ref.friend_profile_code || '—';
    const vectors = ref.friend_vectors || {};
    const patterns = ref.friend_deep_patterns || {};
    const aiProfile = ref.friend_ai_profile || '';
    const date = ref.completed_at ? new Date(ref.completed_at).toLocaleDateString('ru') : '';
    const mirrorCode = ref.mirror_code || '';

    const vectorColors = { 'СБ': '#ff3b3b', 'ТФ': '#ff6b3b', 'УБ': '#fbbf24', 'ЧВ': '#00d4ff' };

    container.innerHTML = `
        <div class="mirror-bg" style="min-height:100vh;">
            <div class="mirror-wrap" style="max-width:600px; margin:0 auto; padding:20px 16px;">

                <!-- НАВИГАЦИЯ -->
                <div style="display:flex; align-items:center; gap:14px; margin-bottom:24px;">
                    <button onclick="showMirrorsScreen()"
                        style="width:42px; height:42px; border-radius:50%; background:rgba(255,255,255,0.06);
                               border:1px solid rgba(255,255,255,0.1); color:#fff; cursor:pointer; font-size:18px;">
                        ←
                    </button>
                    <div style="font-size:18px; font-weight:600; color:#fff;">🪞 Профиль отражения</div>
                </div>

                <!-- HERO -->
                <div style="background:linear-gradient(135deg,rgba(255,107,59,0.12),rgba(255,59,59,0.05));
                            border:1px solid rgba(255,107,59,0.25); border-radius:28px; padding:32px;
                            text-align:center; margin-bottom:20px;">
                    <div style="width:76px; height:76px; border-radius:50%; margin:0 auto 16px;
                                background:linear-gradient(135deg,rgba(255,107,59,0.5),rgba(255,59,59,0.25));
                                border:2px solid rgba(255,107,59,0.5);
                                display:flex; align-items:center; justify-content:center;
                                font-size:30px; font-weight:700; color:#fff;
                                box-shadow:0 8px 24px rgba(255,59,59,0.2);">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                    <div style="font-size:22px; font-weight:700; color:#fff; margin-bottom:6px;">${name}</div>
                    <div style="font-size:12px; color:rgba(255,255,255,0.4); font-family:monospace; letter-spacing:1px; margin-bottom:6px;">${profile}</div>
                    <div style="font-size:11px; color:rgba(255,255,255,0.25);">Тест пройден: ${date}</div>
                </div>

                <!-- ВЕКТОРЫ -->
                ${Object.keys(vectors).length ? `
                <div class="mirror-glass" style="padding:20px; margin-bottom:16px;">
                    <div class="mirror-section-label">📊 ВЕКТОРЫ ПОВЕДЕНИЯ</div>
                    ${Object.entries(vectors).map(([k, v]) => `
                        <div style="margin-bottom:16px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                <span style="font-size:13px; color:rgba(255,255,255,0.6);">${k}</span>
                                <span style="font-size:13px; font-weight:700; color:${vectorColors[k] || '#fff'};">${v.toFixed(1)}/6</span>
                            </div>
                            <div class="mirror-vector-bar-track">
                                <div class="mirror-vector-bar-fill" style="width:${Math.round(v/6*100)}%; background:${vectorColors[k] || '#ff6b3b'};"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>` : ''}

                <!-- ПАТТЕРНЫ -->
                ${Object.keys(patterns).length ? `
                <div class="mirror-glass" style="padding:20px; margin-bottom:16px;">
                    <div class="mirror-section-label">🌀 ГЛУБИННЫЕ ПАТТЕРНЫ</div>
                    ${patterns.attachment ? `
                    <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <span style="font-size:12px; color:rgba(255,255,255,0.4);">Привязанность</span>
                        <span style="font-size:13px; font-weight:600; color:#fff;">${patterns.attachment}</span>
                    </div>` : ''}
                    ${patterns.core_fears ? `
                    <div style="display:flex; justify-content:space-between; padding:12px 0; gap:12px;">
                        <span style="font-size:12px; color:rgba(255,255,255,0.4);">Страхи</span>
                        <span style="font-size:12px; color:rgba(255,255,255,0.6); text-align:right;">${Array.isArray(patterns.core_fears) ? patterns.core_fears.join(', ') : patterns.core_fears}</span>
                    </div>` : ''}
                </div>` : ''}

                <!-- AI ПРОФИЛЬ -->
                ${aiProfile ? `
                <div class="mirror-glass" style="padding:20px; margin-bottom:16px;">
                    <div class="mirror-section-label">🧠 AI ПРОФИЛЬ</div>
                    <div style="font-size:13px; color:rgba(255,255,255,0.6); line-height:1.7;">
                        ${aiProfile.substring(0, 500)}${aiProfile.length > 500 ? '…' : ''}
                    </div>
                </div>` : ''}

                <!-- КНОПКИ -->
                <div style="display:flex; gap:12px; margin-bottom:16px;">
                    <button onclick="loadIntimateProfile('${mirrorCode}')"
                        style="flex:1; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3);
                               border-radius:16px; padding:14px; color:#3b82ff; font-size:13px; font-weight:600; cursor:pointer;">
                        🔞 Интимный профиль
                    </button>
                    <button onclick="load4FKeys('${mirrorCode}')"
                        style="flex:1; background:rgba(243,156,18,0.1); border:1px solid rgba(243,156,18,0.3);
                               border-radius:16px; padding:14px; color:#f39c12; font-size:13px; font-weight:600; cursor:pointer;">
                        🔑 4F ключи
                    </button>
                </div>

                <div id="friendExtraContent"></div>

                <button onclick="showMirrorsScreen()"
                    style="width:100%; background:transparent; border:1px solid rgba(255,255,255,0.08);
                           border-radius:16px; padding:15px; color:rgba(255,255,255,0.4); font-size:13px;
                           cursor:pointer; transition:all 0.2s; margin-top:8px;"
                    onmouseover="this.style.borderColor='rgba(255,255,255,0.15)'; this.style.color='rgba(255,255,255,0.7)'"
                    onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'; this.style.color='rgba(255,255,255,0.4)'">
                    ← Назад к отражениям
                </button>
            </div>
        </div>`;
}

async function loadIntimateProfile(mirrorCode) {
    const block = document.getElementById('friendExtraContent');
    if (!mirrorCode || !block) return;
    block.innerHTML = `
        <div class="mirror-glass" style="padding:20px; margin-bottom:16px;">
            <div class="mirror-skeleton" style="width:40%; height:12px; margin-bottom:12px;"></div>
            <div class="mirror-skeleton" style="width:80%; height:10px; margin-bottom:8px;"></div>
            <div class="mirror-skeleton" style="width:70%; height:10px;"></div>
        </div>`;
    try {
        const res = await fetch(API_BASE + '/api/mirrors/' + mirrorCode + '/intimate');
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        const i = data.intimate;

        let html = `
            <div class="mirror-glass" style="padding:20px; margin-bottom:16px; border-color:rgba(59,130,246,0.2);">
                <div style="font-size:12px; font-weight:700; color:#3b82ff; letter-spacing:1px; margin-bottom:20px;">🔞 ИНТИМНЫЙ ПРОФИЛЬ</div>`;

        if (i.sexual_triggers?.length) {
            html += `<div style="margin-bottom:18px;">
                <div style="font-size:11px; color:rgba(255,255,255,0.35); letter-spacing:0.5px; margin-bottom:8px;">💋 ЧТО ВОЗБУЖДАЕТ</div>
                ${i.sexual_triggers.map(t => `<div style="font-size:13px; color:rgba(255,255,255,0.7); padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">• ${t}</div>`).join('')}
            </div>`;
        }
        if (i.sexual_blockers?.length) {
            html += `<div style="margin-bottom:18px;">
                <div style="font-size:11px; color:rgba(255,255,255,0.35); letter-spacing:0.5px; margin-bottom:8px;">❄️ ЧТО ГАСИТ ЖЕЛАНИЕ</div>
                ${i.sexual_blockers.map(t => `<div style="font-size:13px; color:rgba(255,255,255,0.7); padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">• ${t}</div>`).join('')}
            </div>`;
        }
        if (i.intimacy_pattern) {
            html += `<div style="margin-bottom:18px;">
                <div style="font-size:11px; color:rgba(255,255,255,0.35); letter-spacing:0.5px; margin-bottom:6px;">🧬 ПАТТЕРН БЛИЗОСТИ</div>
                <div style="font-size:13px; color:rgba(255,255,255,0.6); line-height:1.6;">${i.intimacy_pattern}</div>
            </div>`;
        }
        if (i.key_need) {
            html += `<div style="background:rgba(59,130,246,0.1); border-radius:14px; padding:14px; margin-bottom:14px;">
                <div style="font-size:11px; color:#3b82ff; letter-spacing:0.5px; margin-bottom:4px;">💡 ГЛАВНАЯ ПОТРЕБНОСТЬ</div>
                <div style="font-size:14px; font-weight:600; color:#fff;">${i.key_need}</div>
            </div>`;
        }
        if (i.approach_tip) {
            html += `<div style="background:rgba(255,107,59,0.1); border-radius:14px; padding:14px;">
                <div style="font-size:11px; color:#ff6b3b; letter-spacing:0.5px; margin-bottom:4px;">🎯 КАК ПОДОЙТИ</div>
                <div style="font-size:13px; color:rgba(255,255,255,0.7);">${i.approach_tip}</div>
            </div>`;
        }
        html += `</div>`;
        block.innerHTML = html;
    } catch(e) {
        block.innerHTML = `<div class="mirror-glass" style="padding:20px; margin-bottom:16px; text-align:center; border-color:rgba(59,130,246,0.3);">
            <div style="color:rgba(59,130,246,0.7);">❌ ${e.message}</div>
        </div>`;
    }
}

async function load4FKeys(mirrorCode) {
    const block = document.getElementById('friendExtraContent');
    if (!mirrorCode || !block) return;
    block.innerHTML = `
        <div class="mirror-glass" style="padding:20px; margin-bottom:16px;">
            <div class="mirror-skeleton" style="width:30%; height:12px; margin-bottom:12px;"></div>
            <div class="mirror-skeleton" style="width:90%; height:10px; margin-bottom:8px;"></div>
            <div class="mirror-skeleton" style="width:80%; height:10px;"></div>
        </div>`;
    try {
        const res = await fetch(API_BASE + '/api/mirrors/' + mirrorCode + '/4f-keys');
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        const keys = data.keys;
        const colors = { '1F': '#ff3b3b', '2F': '#3b82ff', '3F': '#a855f7', '4F': '#f39c12' };
        const emojis = { '1F': '🔥', '2F': '🏃', '3F': '🧬', '4F': '🍽' };

        let html = '';
        Object.entries(keys).forEach(([code, k], idx) => {
            const col = colors[code] || '#ff6b3b';
            html += `
                <div class="mirror-4f-card" style="border-color:${col}; animation-delay:${idx * 0.08}s">
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
                        <span style="font-size:26px;">${emojis[code] || '🔑'}</span>
                        <div>
                            <div style="font-size:15px; font-weight:700; color:#fff;">${code} — ${k.title || ''}</div>
                        </div>
                    </div>
                    <div style="font-size:11px; color:rgba(255,255,255,0.35); letter-spacing:0.5px; margin-bottom:10px;">🎯 ТРИГГЕРЫ</div>
                    ${(k.triggers || []).map(t => `<div style="font-size:13px; color:rgba(255,255,255,0.65); padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">• ${t}</div>`).join('')}
                    <div style="background:rgba(0,0,0,0.4); border-radius:12px; padding:14px; margin-top:14px;">
                        <div style="font-size:11px; color:${col}; letter-spacing:0.5px; margin-bottom:6px;">🔑 КЛЮЧ</div>
                        <div style="font-size:13px; font-weight:600; color:#fff;">${k.key_phrase || ''}</div>
                    </div>
                    ${k.technique ? `<div style="font-size:12px; color:rgba(255,255,255,0.4); margin-top:12px;">⚡ ${k.technique}</div>` : ''}
                    ${k.insight ? `<div style="font-size:11px; color:rgba(255,255,255,0.25); margin-top:8px; font-style:italic;">${k.insight}</div>` : ''}
                </div>`;
        });
        block.innerHTML = html;
    } catch(e) {
        block.innerHTML = `<div class="mirror-glass" style="padding:20px; margin-bottom:16px; text-align:center; border-color:rgba(243,156,18,0.3);">
            <div style="color:rgba(243,156,18,0.7);">❌ ${e.message}</div>
        </div>`;
    }
}

// ============================================
// ПРИМЕР ПРОФИЛЯ
// ============================================
function showProfileExample() {
    const container = document.getElementById('screenContainer');
    container.innerHTML = `
        <div class="mirror-bg" style="min-height:100vh;">
            <div class="mirror-wrap" style="max-width:600px; margin:0 auto; padding:20px 16px;">
                <div style="display:flex; align-items:center; gap:14px; margin-bottom:24px;">
                    <button onclick="showMirrorsScreen()"
                        style="width:42px; height:42px; border-radius:50%; background:rgba(255,255,255,0.06);
                               border:1px solid rgba(255,255,255,0.1); color:#fff; cursor:pointer; font-size:18px;">←</button>
                    <div style="font-size:18px; font-weight:600; color:#fff;">👁 Пример профиля</div>
                </div>

                <div style="display:flex; gap:8px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
                            border-radius:20px; padding:5px; margin-bottom:24px;">
                    <button class="mirror-tab-btn active" id="ex-tab-basic" onclick="switchExampleTab('basic')">🧠 Профиль</button>
                    <button class="mirror-tab-btn inactive" id="ex-tab-intimate" onclick="switchExampleTab('intimate')">🔞 Интимный</button>
                    <button class="mirror-tab-btn inactive" id="ex-tab-4f" onclick="switchExampleTab('4f')">🔑 4F ключи</button>
                </div>

                <div id="exampleTabContent"></div>

                <button onclick="switchMirrorTab('create'); showMirrorsScreen()"
                    class="mirror-neon-btn" style="width:100%; margin-top:20px; padding:16px; font-size:14px; font-weight:600;">
                    Создать своё зеркало →
                </button>
            </div>
        </div>`;
    switchExampleTab('basic');
}

function switchExampleTab(tab) {
    ['basic', 'intimate', '4f'].forEach(t => {
        const btn = document.getElementById(`ex-tab-${t}`);
        if (btn) {
            if (t === tab) {
                btn.classList.add('active');
                btn.classList.remove('inactive');
            } else {
                btn.classList.remove('active');
                btn.classList.add('inactive');
            }
        }
    });
    const c = document.getElementById('exampleTabContent');
    if (!c) return;
    if (tab === 'basic') showExampleBasic(c);
    else if (tab === 'intimate') showExampleIntimate(c);
    else showExample4F(c);
}

function showExampleBasic(c) {
    const vectors = [['СБ', 'Самооборона', 4, '#ff3b3b'], ['ТФ', 'Финансы', 2, '#ff6b3b'], ['УБ', 'Убеждения', 5, '#fbbf24'], ['ЧВ', 'Чувства', 3, '#00d4ff']];
    c.innerHTML = `
        <div style="background:linear-gradient(135deg,rgba(255,107,59,0.12),rgba(255,59,59,0.05));
                    border:1px solid rgba(255,107,59,0.25); border-radius:28px; padding:28px; text-align:center; margin-bottom:16px;">
            <div style="width:68px; height:68px; border-radius:50%; margin:0 auto 14px;
                        background:linear-gradient(135deg,rgba(255,107,59,0.4),rgba(255,59,59,0.2));
                        border:2px solid rgba(255,107,59,0.4);
                        display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:700; color:#fff;">А</div>
            <div style="font-size:20px; font-weight:700; color:#fff;">Алексей</div>
            <div style="font-size:11px; color:rgba(255,255,255,0.4); font-family:monospace; margin-top:6px;">ПРАКТИКО-ОРИЕНТИРОВАННЫЙ · УР. 5</div>
        </div>

        <div class="mirror-glass" style="padding:20px; margin-bottom:16px;">
            <div class="mirror-section-label">📊 ВЕКТОРЫ ПОВЕДЕНИЯ</div>
            ${vectors.map(([k, name, v, col]) => `
                <div style="margin-bottom:14px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="font-size:13px; color:rgba(255,255,255,0.6);">${name} (${k})</span>
                        <span style="font-size:13px; font-weight:700; color:${col};">${v}/6</span>
                    </div>
                    <div class="mirror-vector-bar-track">
                        <div class="mirror-vector-bar-fill" style="width:${Math.round(v/6*100)}%; background:${col};"></div>
                    </div>
                </div>`).join('')}
        </div>

        <div class="mirror-glass" style="padding:20px;">
            <div class="mirror-section-label">🌀 ГЛУБИННЫЕ ПАТТЕРНЫ</div>
            ${[['Привязанность', 'Избегающий'], ['Страхи', 'потеря контроля, зависимость'], ['Убеждение', '«Я должен справляться сам»']].map(([l, v]) => `
                <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="font-size:12px; color:rgba(255,255,255,0.4);">${l}</span>
                    <span style="font-size:12px; color:rgba(255,255,255,0.7); font-weight:500;">${v}</span>
                </div>`).join('')}
        </div>`;
}

function showExampleIntimate(c) {
    c.innerHTML = `
        <div class="mirror-glass" style="padding:20px; border-color:rgba(59,130,246,0.2);">
            <div style="font-size:12px; font-weight:700; color:#3b82ff; letter-spacing:1px; margin-bottom:20px;">🔞 ИНТИМНЫЙ ПРОФИЛЬ — ПРИМЕР</div>

            <div style="margin-bottom:18px;">
                <div style="font-size:11px; color:rgba(255,255,255,0.35); letter-spacing:0.5px; margin-bottom:8px;">💋 ЧТО ВОЗБУЖДАЕТ</div>
                ${['Когда не торопят и дают время', 'Визуальные стимулы — важнее тактильных', 'Ощущение контроля в близости'].map(t => `<div style="font-size:13px; color:rgba(255,255,255,0.7); padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">• ${t}</div>`).join('')}
            </div>

            <div style="margin-bottom:18px;">
                <div style="font-size:11px; color:rgba(255,255,255,0.35); letter-spacing:0.5px; margin-bottom:8px;">❄️ ЧТО ГАСИТ ЖЕЛАНИЕ</div>
                ${['Давление и требования', 'Эмоциональные сцены перед близостью', 'Ощущение что его оценивают'].map(t => `<div style="font-size:13px; color:rgba(255,255,255,0.7); padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">• ${t}</div>`).join('')}
            </div>

            <div style="background:rgba(59,130,246,0.1); border-radius:14px; padding:14px; margin-bottom:14px;">
                <div style="font-size:11px; color:#3b82ff; letter-spacing:0.5px; margin-bottom:4px;">💡 ГЛАВНАЯ ПОТРЕБНОСТЬ</div>
                <div style="font-size:14px; font-weight:600; color:#fff;">Ощущение свободы даже в близости</div>
            </div>

            <div style="background:rgba(255,107,59,0.1); border-radius:14px; padding:14px;">
                <div style="font-size:11px; color:#ff6b3b; letter-spacing:0.5px; margin-bottom:4px;">🎯 КАК ПОДОЙТИ</div>
                <div style="font-size:13px; color:rgba(255,255,255,0.7);">Близость через общие задачи и проекты. Прикосновения как якорь — без давления.</div>
            </div>
        </div>`;
}

function showExample4F(c) {
    const keys = [
        ['🔥', '1F', 'Ярость / Нападение', '#ff3b3b', ['Критика при свидетелях', 'Обесценивание усилий'], '«Я вижу как много ты сделал»', 'Пауза 3 сек + имя'],
        ['🏃', '2F', 'Страх / Бегство', '#3b82ff', ['Вопросы о будущем', 'Требования и давление'], '«Я никуда не ухожу, просто поговорим»', 'Без дедлайнов — безопасная среда'],
        ['🧬', '3F', 'Желание / Секс', '#a855f7', ['Особая интонация', 'Зрительный контакт 4+ сек'], 'Слова: «только мы», «никуда не торопимся»', 'Плечо → запястье → основание шеи'],
        ['🍽', '4F', 'Деньги / Поглощение', '#f39c12', ['Упоминание конкурентов', 'Идеи заработка'], '«Как думаешь, можно это монетизировать?»', 'Задача с измеримым результатом']
    ];
    c.innerHTML = keys.map(([emoji, code, title, col, triggers, key, tech], idx) => `
        <div class="mirror-4f-card" style="border-color:${col}; animation-delay:${idx * 0.08}s">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
                <span style="font-size:26px;">${emoji}</span>
                <div style="font-size:15px; font-weight:700; color:#fff;">${code} — ${title}</div>
            </div>
            <div style="font-size:11px; color:rgba(255,255,255,0.35); letter-spacing:0.5px; margin-bottom:10px;">🎯 ТРИГГЕРЫ</div>
            ${triggers.map(t => `<div style="font-size:13px; color:rgba(255,255,255,0.65); padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">• ${t}</div>`).join('')}
            <div style="background:rgba(0,0,0,0.4); border-radius:12px; padding:14px; margin-top:14px;">
                <div style="font-size:11px; color:${col}; letter-spacing:0.5px; margin-bottom:6px;">🔑 КЛЮЧ</div>
                <div style="font-size:13px; font-weight:600; color:#fff;">${key}</div>
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.4); margin-top:12px;">⚡ ${tech}</div>
        </div>`).join('');
}

// ============================================
// ЭКСПОРТ
// ============================================
window.showMirrorsScreen = showMirrorsScreen;
window.switchMirrorTab = switchMirrorTab;
window.generateMirrorLink = generateMirrorLink;
window.copyMirrorLink = copyMirrorLink;
window.shareMirrorLink = shareMirrorLink;
window.showFriendProfile = showFriendProfile;
window.loadIntimateProfile = loadIntimateProfile;
window.load4FKeys = load4FKeys;
window.showProfileExample = showProfileExample;
window.switchExampleTab = switchExampleTab;
