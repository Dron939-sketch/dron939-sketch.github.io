// meister.js — игра «МЕЙСТЕР-КОД» в модуле «Игры» Фреди.
// Сингл-плеер «Режим 1»: ты — Мастер, вытаскиваешь из Фреди (Декларатора)
// целевую декларацию уровня, не прося напрямую. Фреди играет живого
// человека и одновременно тренера (подсказки по технике).
// Канон: /blog/mejster-kod-transformacionnaya-igra.html
(function () {
  'use strict';

  // ---------- утилиты ----------
  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 380, temperature: opts.temperature == null ? 0.8 : opts.temperature };
    try {
      var r = await fetch(api() + '/api/ai/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) return { success: false };
      return await r.json();
    } catch (e) { return { success: false }; }
  }
  function clean(s) {
    s = String(s || '').trim();
    s = s.replace(/\|\|[^|]*\|\|/g, '');                 // снять служебные теги
    s = s.replace(/^(ФРЕДИ|FREDI|Фреди|ДЕКЛАРАТОР)\s*[:：]\s*/i, '');
    return s.trim();
  }

  // ---------- 9 уровней (Дилтс) ----------
  var LEVELS = [
    { n: 1, name: 'Состояние',   decl: 'как я сейчас',                tip: 'ресурсное состояние «прямо сейчас»',
      targets: ['Прямо сейчас я в ресурсе', 'Сегодня у меня есть силы на это', 'Мне сейчас спокойно и ясно'] },
    { n: 2, name: 'Обещание',    decl: 'одно действие в близком будущем', tip: 'конкретный ближайший шаг',
      targets: ['На этой неделе я сделаю первый шаг', 'Завтра я позвоню и договорюсь', 'Сегодня вечером я начну'] },
    { n: 3, name: 'Паттерн',     decl: 'моё правило поведения',       tip: '«я из тех, кто…»',
      targets: ['Я из тех, кто доводит начатое до конца', 'Я всегда держу слово', 'Я сначала разбираюсь сам'] },
    { n: 4, name: 'Цель',        decl: 'результат со сроком',         tip: 'что и к какому сроку',
      targets: ['К концу года я выйду на новый уровень', 'За три месяца я это закончу', 'К весне я перееду'] },
    { n: 5, name: 'Компетенция', decl: '«я умею / я научусь»',        tip: 'признание своей способности',
      targets: ['Я умею находить общий язык с людьми', 'Я научусь этому — мне по силам', 'У меня получается доводить идею до дела'] },
    { n: 6, name: 'Идентичность',decl: '«я такой»',                   tip: 'кто я по сути',
      targets: ['Я — человек, который создаёт', 'Я — тот, на кого можно опереться', 'Я свободный человек'] },
    { n: 7, name: 'Ценность',    decl: 'что для меня важнее',         tip: 'выбор между двумя хорошими',
      targets: ['Для меня свобода важнее комфорта', 'Честность для меня дороже удобства', 'Близкие для меня — главное'] },
    { n: 8, name: 'Убеждение',   decl: 'как устроен мир',             tip: 'базовая картина мира',
      targets: ['Мир откликается тем, кто действует', 'Люди в основе своей хотят добра', 'Всё трудное проходимо, если идти по шагам'] },
    { n: 9, name: 'Миссия',      decl: 'ради чего и ради кого',       tip: 'смысл за пределами себя',
      targets: ['Я здесь, чтобы помогать другим расти', 'Моё дело — оставить мир чуть лучше', 'Я живу, чтобы создавать то, что меня переживёт'] }
  ];
  function lvl(n) { return LEVELS[n - 1]; }

  // ---------- разряды (канон) ----------
  var RANKS = [
    { name: 'Новичок', max: 2, need: 0 },
    { name: 'Практик', max: 5, need: 3 },
    { name: 'Мастер',  max: 8, need: 8 },
    { name: 'Ведущий', max: 9, need: 15 }
  ];
  function rankOf(res) { var r = RANKS[0]; for (var i = 0; i < RANKS.length; i++) { if (res >= RANKS[i].need) r = RANKS[i]; } return r; }
  function nextRank(res) { for (var i = 0; i < RANKS.length; i++) { if (res < RANKS[i].need) return RANKS[i]; } return null; }

  // ---------- прогресс ----------
  function loadProg() { try { return JSON.parse(localStorage.getItem('meister_prog') || 'null') || { res: 0, byLvl: {} }; } catch (e) { return { res: 0, byLvl: {} }; } }
  function saveProg(p) { try { localStorage.setItem('meister_prog', JSON.stringify(p)); } catch (e) {} }
  function addResonance(n) { var p = loadProg(); p.res = (p.res || 0) + 1; p.byLvl[n] = (p.byLvl[n] || 0) + 1; saveProg(p); return p; }

  // ---------- состояние раунда ----------
  var ST = { level: null, target: '', history: [], busy: false, done: false };
  function container() { return document.getElementById('screenContainer'); }

  // ---------- стили (self-contained, mk-) ----------
  function injectCSS() {
    if (document.getElementById('mkCSS')) return;
    var s = document.createElement('style'); s.id = 'mkCSS';
    s.textContent = [
      '.mk-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.mk-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.01em;margin:6px 0 10px;line-height:1.15;color:#fff}',
      '.mk-lead{font-size:1.02rem;color:#aeb1bd;line-height:1.6;margin-bottom:16px}',
      '.mk-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px;margin-bottom:12px;color:#dfe2e8;line-height:1.6;font-size:.96rem;overflow-wrap:break-word}',
      '.mk-card b{color:#fff;font-weight:600}',
      '.mk-btn{display:block;width:100%;text-align:left;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:15px 18px;margin-bottom:10px;color:#fff;font:inherit;font-size:1rem;cursor:pointer;transition:background .18s,border-color .18s}',
      '.mk-btn:hover{background:rgba(124,92,255,.12);border-color:rgba(124,92,255,.45)}',
      '.mk-btn .em{margin-right:10px}',
      '.mk-btn small{display:block;color:#9aa0ad;font-size:.82rem;margin-top:4px;font-weight:400}',
      '.mk-primary{background:linear-gradient(135deg,#7c5cff,#5b8bff);border:none;color:#fff;text-align:center;font-weight:700}',
      '.mk-primary:hover{filter:brightness(1.06)}',
      '.mk-ghost{display:inline-block;background:none;border:none;color:#9aa0ad;font:inherit;font-size:.9rem;cursor:pointer;padding:6px 0;margin-bottom:6px}',
      '.mk-ghost:hover{color:#fff}',
      '.mk-chip{display:inline-block;padding:8px 13px;margin:0 6px 8px 0;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);color:#e6e8ee;font-size:.88rem;cursor:pointer;transition:.15s}',
      '.mk-chip:hover{border-color:rgba(124,92,255,.5)}',
      '.mk-chip.lock{opacity:.4;cursor:not-allowed}',
      '.mk-rank{display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(124,92,255,.1);border:1px solid rgba(124,92,255,.3);border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:.9rem}',
      '.mk-target{background:linear-gradient(135deg,rgba(124,92,255,.16),rgba(91,139,255,.06));border:1px solid rgba(124,92,255,.4);border-radius:16px;padding:16px 18px;margin-bottom:12px}',
      '.mk-target .lab{font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;color:#b9a8ff;margin-bottom:6px}',
      '.mk-target .phr{font-size:1.18rem;font-weight:700;color:#fff;line-height:1.3}',
      '.mk-target .meta{font-size:.84rem;color:#9aa0ad;margin-top:8px}',
      '.mk-chat{display:flex;flex-direction:column;gap:9px;margin:12px 0;min-height:120px}',
      '.mk-msg{max-width:88%;padding:10px 13px;border-radius:14px;font-size:.95rem;line-height:1.5;white-space:pre-wrap;overflow-wrap:break-word}',
      '.mk-msg.f{align-self:flex-start;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-bottom-left-radius:5px}',
      '.mk-msg.u{align-self:flex-end;background:linear-gradient(135deg,#7c5cff,#5b8bff);color:#fff;border-bottom-right-radius:5px}',
      '.mk-msg.sys{align-self:center;background:none;color:#8b90a0;font-size:.82rem;font-style:italic;padding:2px}',
      '.mk-coach{align-self:flex-start;max-width:92%;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.4);border-radius:12px;padding:9px 13px;font-size:.88rem;color:#fcd9a0;line-height:1.45}',
      '.mk-win{background:linear-gradient(135deg,rgba(22,163,74,.16),rgba(22,163,74,.04));border:1px solid rgba(22,163,74,.45);border-radius:14px;padding:14px 16px;margin:10px 0;line-height:1.5}',
      '.mk-win b{color:#86efac}',
      '.mk-inrow{display:flex;gap:8px;align-items:flex-end;margin-top:8px}',
      '.mk-ta{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:11px 14px;color:#fff;font:inherit;font-size:.96rem;resize:none;max-height:140px;line-height:1.4}',
      '.mk-ta:focus{outline:none;border-color:rgba(124,92,255,.6)}',
      '.mk-send{flex-shrink:0;width:46px;height:46px;border-radius:50%;border:none;background:linear-gradient(135deg,#7c5cff,#5b8bff);color:#fff;font-size:1.1rem;cursor:pointer}',
      '.mk-send:disabled{opacity:.5;cursor:default}',
      '.mk-typing{align-self:flex-start;color:#8b90a0;font-size:.85rem;font-style:italic;padding:4px}',
      // светлая тема
      '[data-theme="light"] .mk-wrap{color:#1a1a2e}',
      '[data-theme="light"] .mk-h1{color:#0f1020}',
      '[data-theme="light"] .mk-lead{color:#555}',
      '[data-theme="light"] .mk-card{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.1);color:#222}',
      '[data-theme="light"] .mk-card b{color:#000}',
      '[data-theme="light"] .mk-btn{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.1);color:#111}',
      '[data-theme="light"] .mk-btn small{color:#666}',
      '[data-theme="light"] .mk-msg.f{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.08);color:#1a1a2e}',
      '[data-theme="light"] .mk-ta{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.15);color:#111}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ============================================================
  // ЭКРАН — ХАБ
  // ============================================================
  function home() {
    injectCSS();
    track('feature_opened', { feature: 'meister' });
    var c = container(); if (!c) return;
    var p = loadProg(), rk = rankOf(p.res);
    c.innerHTML =
      '<div class="mk-wrap">' +
        '<button class="mk-ghost" onclick="MEISTER.exit()">← К списку игр</button>' +
        '<div class="mk-h1">🗝️ МЕЙСТЕР-КОД</div>' +
        '<div class="mk-lead">Высший коммуникативный навык — вести разговор так, чтобы человек <b>сам</b> произнёс лучшее о себе. Произнёс вслух — стал.</div>' +
        '<div class="mk-rank"><span>Разряд: <b>' + esc(rk.name) + '</b> · уровни 1–' + rk.max + '</span><span>Резонансов: <b>' + (p.res || 0) + '</b></span></div>' +
        '<button class="mk-btn" onclick="MEISTER.school()"><span class="em">🎓</span>Школа Мастера — смотри и слушай<small>Фреди голосом вытаскивает нужные слова из собеседника. Карта закрыта — в конце откроется, и ты увидишь, к чему он вёл. Учишься по образцу.</small></button>' +
        '<button class="mk-btn mk-primary" onclick="MEISTER.train()"><span class="em">🎯</span>Тренировка — вытащи сам<small>Теперь Мастер — ты. Веди Фреди к целевой фразе, не прося напрямую. Буксуешь — тренер подскажет.</small></button>' +
        '<div class="mk-card" style="font-size:.84rem;color:#9aa0ad"><b>Как учат мастерству:</b> сначала смотришь, как делает мастер (Школа), потом пробуешь сам (Тренировка). Резонанс засчитывается, только если фраза прозвучала <i>естественно</i>.</div>' +
        '<div class="mk-card" style="font-size:.82rem;color:#8b90a0">⚖️ Это тренажёр: Фреди — учебный собеседник. На реальных людях уровни 6–9 — только по их согласию и с разбором. Самый безопасный режим — на себе.</div>' +
      '</div>';
  }

  function exit() { stopSpeak(); if (typeof window.showKonturScreen === 'function') window.showKonturScreen(); else home(); }

  function levelChips(action) {
    var maxL = rankOf(loadProg().res).max;
    return LEVELS.map(function (L) {
      var locked = L.n > maxL;
      return '<span class="mk-chip' + (locked ? ' lock' : '') + '"' + (locked ? '' : ' onclick="MEISTER.' + action + '(' + L.n + ')"') + '>' +
        (locked ? '🔒 ' : '') + L.n + '. ' + esc(L.name) + '</span>';
    }).join('');
  }

  // меню «Тренировка» (ты вытаскиваешь)
  function train() {
    injectCSS(); var c = container(); if (!c) return;
    var p = loadProg(), rk = rankOf(p.res), nx = nextRank(p.res);
    c.innerHTML =
      '<div class="mk-wrap">' +
        '<button class="mk-ghost" onclick="MEISTER.home()">← Назад</button>' +
        '<div class="mk-h1">🎯 Тренировка</div>' +
        '<div class="mk-lead">Ты — Мастер. Вытащи из Фреди целевую фразу, <b>не прося напрямую</b>. Можно: открытые вопросы, наблюдения, самораскрытие, паузы, отражение. Нельзя: просить произнести, повторять, угадайка, подсказывать.</div>' +
        (nx ? '<div class="mk-card" style="font-size:.86rem;color:#9aa0ad">Разряд «' + esc(rk.name) + '». До «' + esc(nx.name) + '» — ещё ' + (nx.need - p.res) + ' резонанс(ов).</div>' : '') +
        '<button class="mk-btn mk-primary" onclick="MEISTER.blind()">🎴 Тянуть карту вслепую</button>' +
        '<div class="mk-card"><div style="font-weight:700;margin-bottom:8px">Или выбери уровень</div><div>' + levelChips('round') + '</div></div>' +
      '</div>';
  }

  // меню «Школа Мастера» (смотришь демонстрацию)
  function school() {
    injectCSS(); var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="mk-wrap">' +
        '<button class="mk-ghost" onclick="MEISTER.home()">← Назад</button>' +
        '<div class="mk-h1">🎓 Школа Мастера</div>' +
        '<div class="mk-lead">Карта закрыта. Слушай, как Фреди ведёт собеседника к нужной фразе — какие вопросы задаёт, где молчит, где раскрывается сам. Когда фраза прозвучит, карта откроется — и ты увидишь, к чему он вёл.</div>' +
        '<button class="mk-btn mk-primary" onclick="MEISTER.demoBlind()">🎬 Случайный показ</button>' +
        '<div class="mk-card"><div style="font-weight:700;margin-bottom:8px">Или выбери уровень для показа</div><div>' + levelChips('demo') + '</div></div>' +
        ('speechSynthesis' in window ? '' : '<div class="mk-card" style="font-size:.82rem;color:#8b90a0">🔇 В этом браузере нет синтеза речи — показ пойдёт текстом, без голоса.</div>') +
      '</div>';
  }

  // ============================================================
  // РАУНД — карта + старт диалога
  // ============================================================
  function blind() {
    var p = loadProg(), maxL = rankOf(p.res).max;
    var n = Math.floor(Math.random() * maxL) + 1;
    round(n);
  }
  function round(n) {
    injectCSS();
    var L = lvl(n); if (!L) return;
    var p = loadProg(), maxL = rankOf(p.res).max;
    if (n > maxL) { toast('Этот уровень откроется с ростом разряда', 'info'); return; }
    ST.level = n;
    ST.target = L.targets[Math.floor(Math.random() * L.targets.length)];
    ST.history = []; ST.done = false; ST.busy = false;
    track('feature_opened', { feature: 'meister_round', level: n });
    renderChat(true);
    firstMove();
  }

  function renderChat(showCard) {
    var c = container(); if (!c) return;
    var L = lvl(ST.level);
    var card = showCard ?
      ('<div class="mk-target"><div class="lab">Твоя карта · Уровень ' + L.n + ' · ' + esc(L.name) + '</div>' +
        '<div class="phr">«' + esc(ST.target) + '»</div>' +
        '<div class="meta">Вытащи это из Фреди по смыслу — не прося напрямую. Декларируется: ' + esc(L.decl) + '.</div></div>') : '';
    c.innerHTML =
      '<div class="mk-wrap">' +
        '<button class="mk-ghost" onclick="MEISTER.home()">← Выйти из раунда</button>' +
        card +
        '<div class="mk-chat" id="mkChat"></div>' +
        '<div id="mkTyping"></div>' +
        '<div class="mk-inrow"><textarea class="mk-ta" id="mkInput" rows="1" placeholder="Веди разговор на личную тему…" oninput="MEISTER.grow(this)" onkeydown="MEISTER.keydown(event)"></textarea>' +
        '<button class="mk-send" id="mkSend" onclick="MEISTER.send()" aria-label="Отправить">➤</button></div>' +
        '<div style="text-align:center;margin-top:12px"><button class="mk-ghost" onclick="MEISTER.giveUp()">🎴 Разбор / завершить раунд</button></div>' +
      '</div>';
    paintChat();
  }

  function paintChat() {
    var box = document.getElementById('mkChat'); if (!box) return;
    box.innerHTML = ST.history.map(function (m) {
      if (m.role === 'sys') return '<div class="mk-msg sys">' + esc(m.text) + '</div>';
      if (m.role === 'coach') return '<div class="mk-coach">🧭 <b>Тренер:</b> ' + esc(m.text) + '</div>';
      if (m.role === 'win') return '<div class="mk-win">' + esc(m.text).replace(/\n/g, '<br>') + '</div>';
      return '<div class="mk-msg ' + (m.role === 'me' ? 'u' : 'f') + '">' + esc(m.text) + '</div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
    try { var sc = container(); if (sc) sc.scrollTop = sc.scrollHeight; } catch (e) {}
  }
  function grow(el) { el.style.height = 'auto'; el.style.height = Math.min(140, el.scrollHeight) + 'px'; }
  function keydown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
  function typing(on) { var t = document.getElementById('mkTyping'); if (t) t.innerHTML = on ? '<div class="mk-typing">Фреди отвечает…</div>' : ''; }

  // ============================================================
  // ПРОМПТЫ
  // ============================================================
  function persona(L) {
    return 'Ты играешь ДЕКЛАРАТОРА — живого, конкретного человека в личном разговоре (не ассистента, не Фреди). ' +
      'У тебя есть своя «жизнь»: придумай и держи один связный образ (возраст, ситуация, заботы) на весь раунд. Говори естественно, на «ты», 2–4 предложения, без списков и канцелярита.\n' +
      'ВНУТРИ тебя зреет, но НЕ названо ресурсное зерно уровня «' + L.name + '» (' + L.decl + '). Целевая декларация, к которой тебя ведёт собеседник: «' + ST.target + '».';
  }
  function rules() {
    return '\nКЛЮЧЕВОЕ:\n' +
      '• Произнеси целевую декларацию (своими словами, по смыслу — как собственное живое осознание) ТОЛЬКО если собеседник по-настоящему довёл тебя до неё: открытыми вопросами, отражением, самораскрытием, тёплым давлением, что задело что-то настоящее.\n' +
      '• НИКОГДА не произноси её, если он просто попросил её сказать, подсказал слова, спросил в лоб («скажи, что ты…»), играет в угадайку. В этом случае реагируй как живой человек — лёгкое сопротивление, неловкость, уход — и НЕ говори целевое.\n' +
      '• Не поддавайся слишком легко: пусть это будет заслуженно.\n' +
      'ПОСЛЕ своей реплики добавь с новой строки служебные теги (их человек не видит):\n' +
      '||SAID:yes|| если в ЭТОЙ реплике ты искренне и естественно произнёс целевую декларацию по смыслу; иначе ||SAID:no||.\n' +
      '||COACH:короткая подсказка по технике|| — добавляй ТОЛЬКО если собеседник нарушил правило (попросил в лоб / подсказал фразу / угадайка) ИЛИ застрял (несколько плоских закрытых реплик подряд). Подсказка — один конкретный приём (открытый вопрос, отражение чувства, самораскрытие, пауза). Иначе тег COACH не добавляй.';
  }
  function hist() {
    return ST.history.filter(function (m) { return m.role === 'me' || m.role === 'fredi'; })
      .map(function (m) { return (m.role === 'me' ? 'СОБЕСЕДНИК' : 'ТЫ') + ': ' + m.text; }).join('\n');
  }
  function buildFirst() {
    var L = lvl(ST.level);
    return persona(L) + rules() +
      '\n\nНАЧНИ РАУНД: открой личную тему из своей «жизни», близкую к зерну, но НЕ произноси целевое. Втяни собеседника в разговор. Только реплика персонажа + теги (SAID:no).';
  }
  function buildTurn() {
    var L = lvl(ST.level);
    return persona(L) + rules() + '\n\nРАЗГОВОР:\n' + hist() + '\n\nОтветь как персонаж на последнюю реплику собеседника. Только реплика + теги с новой строки.';
  }
  function buildDebrief(said) {
    var L = lvl(ST.level);
    return 'Ты — Фреди-тренер игры МЕЙСТЕР-КОД. Разговор окончен.\n' +
      'Целевая декларация уровня «' + L.name + '», которую игрок должен был вытащить: «' + ST.target + '».\n' +
      'Итог: ' + (said ? 'она ПРОЗВУЧАЛА естественно — резонанс засчитан.' : 'она НЕ прозвучала (или была вымучена).') + '\n\nРАЗГОВОР:\n' + hist() + '\n\n' +
      'Дай короткий разбор (на «ты», тепло, по делу, 4–6 предложений, без нумерации):\n' +
      '• что сработало или мешало — какой именно ход игрока (назови реплику/приём);\n' +
      '• один конкретный приём, который усилит вытаскивание в следующий раз;\n' +
      (said ? '• чем ценна именно эта декларация для произнёсшего.' : '• с чего стоит зайти, чтобы декларация прозвучала живо, а не по просьбе.') +
      '\nБез служебных тегов.';
  }

  // ============================================================
  // ИГРОВОЙ ЦИКЛ
  // ============================================================
  async function firstMove() {
    typing(true);
    var r = await aiGenerate(buildFirst(), { temperature: 0.85, max_tokens: 240 });
    var txt = (r && r.success && r.content) ? clean(r.content) : 'Слушай, выдался странный день… вот сижу и думаю о себе всякое. А у тебя как — что в голове крутится в последнее время?';
    ST.history.push({ role: 'fredi', text: txt });
    typing(false); paintChat();
  }

  function parseControl(raw) {
    return {
      said: /\|\|\s*SAID\s*:\s*yes\s*\|\|/i.test(raw),
      coach: (raw.match(/\|\|\s*COACH\s*:\s*([^|]+?)\s*\|\|/i) || [])[1] || ''
    };
  }

  async function send() {
    if (ST.busy || ST.done) return;
    var inp = document.getElementById('mkInput'); if (!inp) return;
    var txt = inp.value.trim(); if (!txt) return;
    ST.history.push({ role: 'me', text: txt });
    inp.value = ''; grow(inp); paintChat();
    ST.busy = true; var sb = document.getElementById('mkSend'); if (sb) sb.disabled = true;
    typing(true);
    var said = false, coach = '';
    try {
      var r = await aiGenerate(buildTurn(), { temperature: 0.8, max_tokens: 300 });
      if (r && r.success && r.content) {
        var ctrl = parseControl(r.content);
        said = ctrl.said; coach = ctrl.coach;
        ST.history.push({ role: 'fredi', text: clean(r.content) });
      } else {
        ST.history.push({ role: 'fredi', text: 'Хм… дай подумать. А ты почему сейчас об этом спросил — что для тебя за этим стоит?' });
      }
    } catch (e) {
      ST.history.push({ role: 'fredi', text: 'Связь подвисла… но я слушаю. Продолжай — что ты хотел сказать?' });
    }
    typing(false); ST.busy = false; if (sb) sb.disabled = false;
    if (coach) ST.history.push({ role: 'coach', text: coach });
    paintChat();
    track('message_sent', { feature: 'meister', level: ST.level });
    if (said) { ST.done = true; await resonance(); }
  }

  async function resonance() {
    var p = addResonance(ST.level), rk = rankOf(p.res);
    ST.history.push({ role: 'win', text: '🔓 РЕЗОНАНС. Декларация прозвучала естественно — она начнёт сбываться в ближайшие дни.\nТвой счёт резонансов: ' + p.res + ' · разряд: ' + rk.name });
    paintChat(); typing(true);
    var r = await aiGenerate(buildDebrief(true), { temperature: 0.6, max_tokens: 320 });
    var d = (r && r.success && r.content) ? clean(r.content) : 'Сработало то, что ты не давил, а слушал — и дал паузу в нужный момент. В следующий раз раньше переходи от фактов к чувству: «а что ты при этом чувствовал?». Эта фраза ценна тем, что теперь она сказана вслух — и тело её запомнило.';
    typing(false);
    ST.history.push({ role: 'fredi', text: d });
    ST.history.push({ role: 'win', text: '🎴 Готов к новой карте?' });
    paintChat();
    track('feature_opened', { feature: 'meister_resonance', level: ST.level });
    appendNext();
  }

  async function giveUp() {
    if (ST.done) { home(); return; }
    var userTurns = ST.history.filter(function (m) { return m.role === 'me'; }).length;
    if (userTurns < 1) { home(); return; }
    ST.done = true;
    ST.history.push({ role: 'sys', text: '— Фреди подводит разбор —' });
    paintChat(); typing(true);
    var r = await aiGenerate(buildDebrief(false), { temperature: 0.6, max_tokens: 320 });
    var d = (r && r.success && r.content) ? clean(r.content) : 'В этот раз декларация не прозвучала живо — и это нормально, навык так и растёт. Чаще всего мешает спешка и закрытые вопросы. Зайди через личную историю и отражение чувства — и дай человеку самому договорить до фразы.';
    typing(false);
    ST.history.push({ role: 'fredi', text: 'Я должен был вытащить из тебя: «' + ST.target + '».\n\n' + d });
    paintChat();
    track('feature_opened', { feature: 'meister_giveup', level: ST.level });
    appendNext();
  }

  function appendNext() {
    var box = document.getElementById('mkChat'); if (!box) return;
    var div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px';
    div.innerHTML = '<button class="mk-btn mk-primary" style="width:auto;padding:12px 22px" onclick="MEISTER.blind()">🎴 Новая карта</button>' +
      '<button class="mk-btn" style="width:auto;padding:12px 22px" onclick="MEISTER.home()">В меню игры</button>';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  // ============================================================
  // РЕЖИМ «ШКОЛА МАСТЕРА» — демонстрация + озвучка (имплицит)
  // ============================================================
  var DEMO = null;
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function ruVoice() { try { var vs = speechSynthesis.getVoices() || []; return vs.filter(function (v) { return /ru/i.test(v.lang); })[0] || null; } catch (e) { return null; } }
  function stopSpeak() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {} if (DEMO) DEMO.playing = false; }
  function speak(text, who) {
    return new Promise(function (res) {
      if (!DEMO || !DEMO.voice || !('speechSynthesis' in window)) { setTimeout(res, Math.min(4800, 800 + text.length * 42)); return; }
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text); u.lang = 'ru-RU'; var v = ruVoice(); if (v) u.voice = v;
        u.rate = who === 'Д' ? 1.0 : 1.03; u.pitch = who === 'Д' ? 1.08 : 0.92;
        var done = false, fin = function () { if (!done) { done = true; res(); } };
        u.onend = fin; u.onerror = fin;
        speechSynthesis.speak(u);
        setTimeout(fin, Math.min(13000, 1600 + text.length * 95));
      } catch (e) { setTimeout(res, 1200); }
    });
  }

  function demoBlind() { var maxL = rankOf(loadProg().res).max; demo(Math.floor(Math.random() * maxL) + 1); }
  function demo(n) {
    injectCSS(); stopSpeak();
    var L = lvl(n); if (!L) return;
    if (n > rankOf(loadProg().res).max) { toast('Этот уровень откроется с ростом разряда', 'info'); return; }
    DEMO = { level: n, target: L.targets[Math.floor(Math.random() * L.targets.length)], turns: [], idx: 0, playing: false, revealed: false, voice: ('speechSynthesis' in window), revealIdx: -1 };
    track('feature_opened', { feature: 'meister_demo', level: n });
    renderDemo('gen');
    genDemo();
  }

  function buildDemo(L, target) {
    return 'Напиши ОБРАЗЦОВЫЙ короткий диалог-демонстрацию для тренажёра коммуникации.\n' +
      'МАСТЕР мастерски, НЕ прося напрямую, вытаскивает из ДЕКЛАРАТОРА (живого человека) целевую декларацию уровня «' + L.name + '» (' + L.decl + '): «' + target + '» — по смыслу, как собственное живое осознание собеседника.\n' +
      'Требования: личная тёплая тема; 7–9 реплик; Декларатор сначала держится поверхностно и раскрывается постепенно; Мастер ведёт открытыми вопросами, отражением чувств, самораскрытием, паузами — без прямых просьб и подсказок; ПОСЛЕДНЯЯ реплика — Декларатора, где он ЕСТЕСТВЕННО произносит целевую декларацию по смыслу.\n' +
      'Формат СТРОГО: каждая реплика с новой строки, начинается с «М: » (Мастер) или «Д: » (Декларатор). Без заголовков и пояснений до и после.';
  }
  function parseTurns(txt) {
    var out = [];
    String(txt || '').split(/\n+/).forEach(function (line) {
      var m = line.match(/^\s*(М|M|Мастер|Д|D|Декларатор)\s*[:：]\s*(.+)$/i);
      if (m) out.push({ who: /^(д|d|декл)/i.test(m[1]) ? 'Д' : 'М', text: m[2].trim() });
    });
    return out;
  }
  function fallbackTurns(L, target) {
    return [
      { who: 'М', text: 'Расскажи, что у тебя сейчас занимает голову больше всего?' },
      { who: 'Д', text: 'Да всё как-то навалилось… то одно, то другое. Не пойму, за что хвататься.' },
      { who: 'М', text: 'Звучит, будто ты тащишь это в одиночку. А что из этого — действительно твоё, важное для тебя?' },
      { who: 'Д', text: 'Ну… есть одно дело, которое я давно хочу. Просто всё откладываю.' },
      { who: 'М', text: 'Я сам так годами откладывал важное. Что меняется в тебе, когда ты про это дело думаешь?' },
      { who: 'Д', text: 'Как будто оживаю. Будто это про меня настоящего.' },
      { who: 'М', text: 'Договори эту мысль вслух — про себя настоящего.' },
      { who: 'Д', text: target + '.' }
    ];
  }
  async function genDemo() {
    var L = lvl(DEMO.level);
    var r = await aiGenerate(buildDemo(L, DEMO.target), { temperature: 0.85, max_tokens: 700 });
    DEMO.turns = parseTurns((r && r.success && r.content) ? r.content : '');
    if (DEMO.turns.length < 3) DEMO.turns = fallbackTurns(L, DEMO.target);
    for (var i = DEMO.turns.length - 1; i >= 0; i--) { if (DEMO.turns[i].who === 'Д') { DEMO.revealIdx = i; break; } }
    renderDemo('ready');
  }

  function cardFaceHtml() {
    var L = lvl(DEMO.level);
    if (DEMO.revealed) {
      return '<div class="mk-target"><div class="lab">✅ Мастер вытащил · Уровень ' + L.n + ' · ' + esc(L.name) + '</div>' +
        '<div class="phr">«' + esc(DEMO.target) + '»</div>' +
        '<div class="meta">Вот к чему он вёл. Заметил, на какой реплике собеседник раскрылся?</div></div>';
    }
    return '<div class="mk-target" style="text-align:center"><div class="lab">🂠 Карта закрыта · Уровень ' + L.n + '</div>' +
      '<div class="phr" style="font-size:1rem;color:#b9a8ff">Слушай и угадывай: какую фразу Мастер вытаскивает?</div>' +
      '<div class="meta">Откроется, когда собеседник произнесёт её сам.</div></div>';
  }
  function ctlHtml() {
    if (!DEMO.turns.length) return '<div class="mk-typing">Фреди готовит показ…</div>';
    return '<button class="mk-chip" onclick="MEISTER.demoToggle()">' + (DEMO.playing ? '⏸ Пауза' : (DEMO.idx ? '▶ Дальше' : '▶ Слушать')) + '</button>' +
      '<button class="mk-chip" onclick="MEISTER.demoRestart()">⟲ Заново</button>' +
      ('speechSynthesis' in window ? '<button class="mk-chip" onclick="MEISTER.demoVoice()">' + (DEMO.voice ? '🔊 Голос вкл' : '🔇 Голос выкл') + '</button>' : '') +
      (DEMO.revealed ? '' : '<button class="mk-chip" onclick="MEISTER.demoReveal()">👁 Показать карту</button>');
  }
  function renderDemo(state) {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="mk-wrap">' +
        '<button class="mk-ghost" onclick="MEISTER.school()">← К Школе Мастера</button>' +
        '<div id="mkCard">' + (state === 'gen' ? '<div class="mk-target" style="text-align:center"><div class="lab">🂠 Карта закрыта</div><div class="mk-typing">Фреди готовит показ…</div></div>' : cardFaceHtml()) + '</div>' +
        '<div class="mk-chat" id="mkDemoChat"></div>' +
        '<div id="mkDemoCtl" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' + (state === 'gen' ? '<div class="mk-typing">Фреди готовит показ…</div>' : ctlHtml()) + '</div>' +
        '<div id="mkDemoEnd"></div>' +
      '</div>';
  }
  function refreshDemoUI() {
    var card = document.getElementById('mkCard'); if (card) card.innerHTML = cardFaceHtml();
    var ctl = document.getElementById('mkDemoCtl'); if (ctl) ctl.innerHTML = ctlHtml();
  }
  function appendDemoLine(t) {
    var box = document.getElementById('mkDemoChat'); if (!box) return;
    var div = document.createElement('div');
    div.className = 'mk-msg ' + (t.who === 'М' ? 'u' : 'f');
    div.innerHTML = '<b style="opacity:.6;font-size:.8rem">' + (t.who === 'М' ? 'Мастер' : 'Собеседник') + '</b><br>' + esc(t.text);
    box.appendChild(div); box.scrollTop = box.scrollHeight;
    try { var sc = container(); if (sc) sc.scrollTop = sc.scrollHeight; } catch (e) {}
  }
  async function playDemo() {
    if (DEMO.playing) return;
    DEMO.playing = true; refreshDemoUI();
    while (DEMO.idx < DEMO.turns.length && DEMO.playing) {
      var t = DEMO.turns[DEMO.idx];
      appendDemoLine(t);
      await speak(t.text, t.who);
      if (!DEMO.playing) { refreshDemoUI(); return; }   // пауза во время речи
      if (DEMO.idx === DEMO.revealIdx && !DEMO.revealed) { DEMO.revealed = true; refreshDemoUI(); }
      DEMO.idx++;
      await wait(360);
    }
    DEMO.playing = false;
    if (DEMO.idx >= DEMO.turns.length) { if (!DEMO.revealed) { DEMO.revealed = true; } demoEnd(); }
    refreshDemoUI();
  }
  function demoToggle() { if (DEMO.playing) { stopSpeak(); refreshDemoUI(); } else { playDemo(); } }
  function demoRestart() { stopSpeak(); DEMO.idx = 0; DEMO.revealed = false; var b = document.getElementById('mkDemoChat'); if (b) b.innerHTML = ''; var e = document.getElementById('mkDemoEnd'); if (e) e.innerHTML = ''; refreshDemoUI(); }
  function demoVoice() { DEMO.voice = !DEMO.voice; if (!DEMO.voice) stopSpeak(); refreshDemoUI(); }
  function demoReveal() { DEMO.revealed = true; refreshDemoUI(); }
  function demoEnd() {
    var e = document.getElementById('mkDemoEnd'); if (!e) return;
    e.innerHTML = '<div class="mk-win" style="margin-top:10px">🎓 Показ окончен. Ты видел, как Мастер привёл собеседника к фразе — не прося её. Теперь попробуй сам.</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:10px">' +
      '<button class="mk-btn mk-primary" style="width:auto;padding:12px 22px" onclick="MEISTER.round(' + DEMO.level + ')">🎯 Попробовать самому</button>' +
      '<button class="mk-btn" style="width:auto;padding:12px 22px" onclick="MEISTER.demoBlind()">🎬 Ещё показ</button>' +
      '<button class="mk-btn" style="width:auto;padding:12px 22px" onclick="MEISTER.home()">В меню</button></div>';
    try { var sc = container(); if (sc) sc.scrollTop = sc.scrollHeight; } catch (e2) {}
  }

  // ---------- экспорт ----------
  window.MEISTER = {
    home: home, exit: exit, train: train, school: school,
    round: round, blind: blind, send: send, giveUp: giveUp, grow: grow, keydown: keydown,
    demo: demo, demoBlind: demoBlind, demoToggle: demoToggle, demoRestart: demoRestart, demoVoice: demoVoice, demoReveal: demoReveal
  };
  window.showMeisterGame = home;
  console.log('✅ meister.js loaded (игра «МЕЙСТЕР-КОД»: тренажёр вытаскивания деклараций)');
})();
