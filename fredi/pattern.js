// pattern.js — игра «Паттерн: Охота на невидимое»
// Тренажёр ключевого навыка ЧВ (от ЧВ-8 к ЧВ-10): видение скрытых паттернов.
// Фреди = агент с секретным правилом. Игрок задаёт реплики, Фреди отвечает
// «да/нет» строго по правилу (JS-логика, мгновенно). Игрок угадывает правило →
// AI проверяет гипотезу → этап «Применение» (добейся 3 да подряд).
(function () {
  'use strict';
  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 200, temperature: opts.temperature == null ? 0.3 : opts.temperature };
    try {
      if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
      var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) return { success: false };
      return await r.json();
    } catch (e) { return { success: false }; }
  }
  function clean(s) { return String(s || '').replace(/\|\|[^|]*\|\|/g, '').trim(); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function wc(t) { return (String(t || '').trim().split(/\s+/).filter(Boolean)).length; }

  // ---------- БАНК ПРАВИЛ ----------
  // check(t) → true → «да», false → «нет». Подсказка — мягкая, не палит правило.
  var RULES = [
    // 🟢 простые (форма реплики)
    { id: 'even_words', lvl: 'easy', name: 'Реплика содержит ЧЁТНОЕ число слов',
      check: function (t) { return wc(t) % 2 === 0 && wc(t) > 0; },
      hint: 'Дело в самой реплике, а не в смысле. Считай.',
      legend: 'Я отвечаю как обычный собеседник. Просто говори со мной.' },
    { id: 'has_exclam', lvl: 'easy', name: 'Реплика содержит восклицательный знак "!"',
      check: function (t) { return /!/.test(t); },
      hint: 'Я реагирую на знаки препинания.',
      legend: 'Спрашивай, предлагай, говори — я отвечаю.' },
    { id: 'starts_vowel', lvl: 'easy', name: 'Первая буква реплики — гласная',
      check: function (t) { return /^\s*[аеёиоуыэюяaeiouy]/i.test(t); },
      hint: 'Смотри на самое начало реплики.',
      legend: 'Простой собеседник. Жду твою реплику.' },
    { id: 'has_question', lvl: 'easy', name: 'Реплика заканчивается знаком вопроса "?"',
      check: function (t) { return /\?\s*$/.test(t); },
      hint: 'Дело в форме — утверждение или вопрос.',
      legend: 'Говори со мной — я слушаю.' },

    // 🟡 средние (содержание)
    { id: 'has_money', lvl: 'mid', name: 'В реплике есть слова про деньги / выгоду',
      check: function (t) { return /(деньг|рубл|цен|купи|плат|выгод|прибыл|доход|инвест|бизнес|зараб|сэконом|долл|евро|тыс\.|млн)/i.test(t); },
      hint: 'Я «пробуждаюсь» от определённой темы.',
      legend: 'Я — потенциальный покупатель. Договорись со мной.' },
    { id: 'has_future', lvl: 'mid', name: 'В реплике есть маркер будущего',
      check: function (t) { return /(будет|будем|будешь|буду|завтра|потом|план|перспектив|через год|через мес|когда-нибудь|в будущем|вечером|следующ)/i.test(t); },
      hint: 'Дело во времени, на которое указывает реплика.',
      legend: 'Я отвечаю на твои реплики. Веди диалог.' },
    { id: 'has_we', lvl: 'mid', name: 'В реплике есть слово «мы» / «нас» / «наш»',
      check: function (t) { return /\b(мы|нас|нам|нами|наш(а|е|и|у|ей|их|им|ему|ого)?)\b/i.test(t); },
      hint: 'Я реагирую на местоимения.',
      legend: 'Я — потенциальный партнёр. Обсуди со мной идею.' },
    { id: 'has_digit', lvl: 'mid', name: 'В реплике есть хотя бы одна цифра',
      check: function (t) { return /\d/.test(t); },
      hint: 'Что-то конкретное и измеримое меня будит.',
      legend: 'Я — инвестор. Расскажи о проекте.' },

    // 🔴 сложные (двойные/специфичные)
    { id: 'long_10', lvl: 'hard', name: 'Реплика — длинная (10+ слов)',
      check: function (t) { return wc(t) >= 10; },
      hint: 'Меня интересует объём, а не содержание.',
      legend: 'Я слушаю долго. Веди беседу.' },
    { id: 'all_caps_word', lvl: 'hard', name: 'В реплике есть слово ЗАГЛАВНЫМИ (2+ буквы)',
      check: function (t) { return /\b[А-ЯЁA-Z]{2,}\b/.test(t); },
      hint: 'Дело в форме слов, не в их смысле.',
      legend: 'Я обычный собеседник. Реагирую на твою манеру.' },
    { id: 'even_and_money', lvl: 'hard', name: 'Чётное число слов И тема денег',
      check: function (t) { return (wc(t) % 2 === 0 && wc(t) > 0) && /(деньг|рубл|цен|купи|плат|выгод|прибыл|доход|инвест|бизнес|зараб|долл|евро)/i.test(t); },
      hint: 'Здесь два условия одновременно — форма И содержание.',
      legend: 'Я — серьёзный партнёр. Условия мои.' },
    { id: 'question_about_future', lvl: 'hard', name: 'Вопрос о будущем (есть "?" И маркер будущего)',
      check: function (t) { return /\?/.test(t) && /(будет|будем|будешь|буду|завтра|потом|план|перспектив|когда|в будущем)/i.test(t); },
      hint: 'И форма реплики, и время — оба важны.',
      legend: 'Я обращён в будущее. Спроси меня правильно.' }
  ];

  function rulesByLvl(lvl) { return RULES.filter(function (r) { return r.lvl === lvl; }); }

  // ---------- сквозной счёт серии «Вариатика» ----------
  function loadSeries() { try { return JSON.parse(localStorage.getItem('variatika_series') || 'null') || { score: 0, byGame: {} }; } catch (e) { return { score: 0, byGame: {} }; } }
  function saveSeries(s) { try { localStorage.setItem('variatika_series', JSON.stringify(s)); } catch (e) {} }
  function seriesAdd(game, pts) { if (!pts) return; var s = loadSeries(); s.score = (s.score || 0) + pts; s.byGame = s.byGame || {}; s.byGame[game] = (s.byGame[game] || 0) + pts; saveSeries(s); }
  function seriesRank() {
    var s = loadSeries(), sc = s.score || 0;
    var R = [{m:120,n:'Мастер Вариатики'},{m:60,n:'Читатель людей'},{m:25,n:'Практик серии'},{m:10,n:'Наблюдатель'},{m:0,n:'Новичок серии'}];
    for (var i = 0; i < R.length; i++) if (sc >= R[i].m) return { name: R[i].n, score: sc };
    return { name: R[R.length - 1].n, score: sc };
  }
  function seriesCardHtml() {
    var r = seriesRank();
    return '<div class="pt-card" style="font-size:.88rem"><b>🏵️ Серия «Вариатика»:</b> <b style="color:#fcd34d">' + r.name + '</b> · ' + r.score + ' очков</div>';
  }

  // ---------- прогресс ----------
  function loadProg() { try { return JSON.parse(localStorage.getItem('pattern_prog') || 'null') || { hunts: 0, solved: 0, byLvl: { easy: 0, mid: 0, hard: 0 } }; } catch (e) { return { hunts: 0, solved: 0, byLvl: { easy: 0, mid: 0, hard: 0 } }; } }
  function saveProg(p) { try { localStorage.setItem('pattern_prog', JSON.stringify(p)); } catch (e) {} }

  // ---------- состояние раунда ----------
  var ST = { rule: null, log: [], phase: 'idle', attempts: 0, hints: 0, applyStreak: 0, applyTries: 0, busy: false };
  function container() { return document.getElementById('screenContainer'); }

  // ---------- premium ----------
  async function ensurePremium() {
    if (window.IS_PREMIUM === true) return true;
    if (window.IS_PREMIUM == null && typeof window.loadPremiumStatus === 'function') { try { await window.loadPremiumStatus(); } catch (e) {} }
    return window.IS_PREMIUM === true;
  }
  function openPremium() {
    if (typeof window.showPremiumLockPopup === 'function') { window.showPremiumLockPopup('Паттерн'); return; }
    if (typeof window.showSettingsScreen === 'function') { try { window.showSettingsScreen(); return; } catch (e) {} }
    toast('Открой раздел «Подписка» в настройках', 'info');
  }
  function renderLocked() {
    injectCSS();
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pt-wrap">' +
        '<button class="pt-ghost" onclick="PATTERN.exit()">← К списку игр</button>' +
        '<div class="pt-h1">🎯 Паттерн: Охота на невидимое</div>' +
        '<div class="pt-card" style="text-align:center;border-color:rgba(168,85,247,.45)">' +
          '<div style="font-size:2.4rem;margin-bottom:6px">💎</div>' +
          '<div style="font-weight:700;font-size:1.12rem;color:#fff;margin-bottom:8px">Игра доступна с подпиской</div>' +
          '<div style="color:#aeb1bd;line-height:1.55">«Паттерн» тренирует главный навык ЧВ-масти — видение скрытых правил. Фреди играет агента с секретным правилом, ты его вычисляешь. Это путь от ЧВ-8 к ЧВ-10. В <b>Фреди Premium</b>.</div>' +
        '</div>' +
        '<button class="pt-btn pt-primary" onclick="PATTERN.openPremium()">💎 Открыть Premium</button>' +
        '<button class="pt-btn" onclick="PATTERN.exit()">← Вернуться к играм</button>' +
      '</div>';
    track('feature_opened', { feature: 'pattern_locked' });
  }

  // ---------- стили ----------
  function injectCSS() {
    if (document.getElementById('ptCSS')) return;
    var s = document.createElement('style'); s.id = 'ptCSS';
    s.textContent = [
      '.pt-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.pt-h1{font-size:1.5rem;font-weight:800;margin:6px 0 10px;line-height:1.18;color:#fff}',
      '.pt-h2{font-size:1.1rem;font-weight:700;margin:14px 0 8px;color:#fff}',
      '.pt-lead{font-size:1.02rem;color:#aeb1bd;line-height:1.6;margin-bottom:14px}',
      '.pt-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px 16px;margin-bottom:12px;color:#dfe2e8;line-height:1.55;font-size:.94rem}',
      '.pt-card b{color:#fff;font-weight:600}',
      '.pt-btn{display:block;width:100%;text-align:left;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:14px 18px;margin-bottom:10px;color:#fff;font:inherit;font-size:.98rem;cursor:pointer;transition:.18s}',
      '.pt-btn:hover{background:rgba(168,85,247,.12);border-color:rgba(168,85,247,.5)}',
      '.pt-btn small{display:block;color:#9aa0ad;font-size:.82rem;margin-top:4px;font-weight:400}',
      '.pt-primary{background:linear-gradient(135deg,#a855f7,#ec4899);border:none;color:#fff;text-align:center;font-weight:700}',
      '.pt-primary:hover{filter:brightness(1.07)}',
      '.pt-ghost{display:inline-block;background:none;border:none;color:#9aa0ad;font:inherit;font-size:.9rem;cursor:pointer;padding:6px 0;margin-bottom:6px}',
      '.pt-ghost:hover{color:#fff}',
      '.pt-chip{display:inline-block;padding:8px 13px;margin:0 6px 6px 0;border-radius:999px;background:rgba(168,85,247,.13);border:1px solid rgba(168,85,247,.35);color:#e9d5ff;font-size:.86rem;cursor:pointer;transition:.15s}',
      '.pt-chip:hover{border-color:#a855f7}',
      '.pt-legend{background:linear-gradient(135deg,rgba(168,85,247,.13),rgba(168,85,247,.04));border:1px solid rgba(168,85,247,.42);border-radius:14px;padding:14px 16px;margin:10px 0;font-style:italic;color:#e9d5ff;line-height:1.5}',
      '.pt-log{display:flex;flex-direction:column;gap:6px;margin:10px 0;max-height:280px;overflow-y:auto}',
      '.pt-msg{padding:8px 12px;border-radius:10px;font-size:.94rem;line-height:1.45;max-width:88%}',
      '.pt-msg.u{align-self:flex-end;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;border-bottom-right-radius:4px}',
      '.pt-msg.y{align-self:flex-start;background:rgba(34,197,94,.18);border:1px solid rgba(34,197,94,.45);color:#86efac;font-weight:700;border-bottom-left-radius:4px}',
      '.pt-msg.n{align-self:flex-start;background:rgba(239,68,68,.13);border:1px solid rgba(239,68,68,.4);color:#fca5a5;font-weight:700;border-bottom-left-radius:4px}',
      '.pt-msg.s{align-self:center;background:none;color:#9aa0ad;font-size:.82rem;font-style:italic;padding:2px}',
      '.pt-row{display:flex;gap:8px;align-items:flex-end;margin-top:8px}',
      '.pt-ta{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:11px 14px;color:#fff;font:inherit;font-size:.96rem;resize:none;line-height:1.4;max-height:120px}',
      '.pt-ta:focus{outline:none;border-color:rgba(168,85,247,.6)}',
      '.pt-send{flex-shrink:0;width:44px;height:44px;border-radius:50%;border:none;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;font-size:1.1rem;cursor:pointer}',
      '.pt-send:disabled{opacity:.5;cursor:default}',
      '.pt-stats{display:flex;gap:8px;flex-wrap:wrap;font-size:.84rem;color:#9aa0ad;margin-bottom:8px}',
      '.pt-stats span{padding:5px 10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:8px}',
      '.pt-win{background:linear-gradient(135deg,rgba(34,197,94,.16),rgba(34,197,94,.04));border:1px solid rgba(34,197,94,.5);border-radius:14px;padding:14px 16px;margin:10px 0;line-height:1.55}',
      '.pt-win b{color:#86efac}',
      '.pt-fail{background:linear-gradient(135deg,rgba(239,68,68,.13),rgba(239,68,68,.04));border:1px solid rgba(239,68,68,.45);border-radius:14px;padding:14px 16px;margin:10px 0;line-height:1.55}',
      '.pt-hint{background:rgba(245,158,11,.07);border:1px dashed rgba(245,158,11,.4);border-radius:10px;padding:10px 13px;font-size:.86rem;color:#fcd34d;margin:8px 0;line-height:1.5}',
      '.pt-typing{color:#8b90a0;font-size:.85rem;font-style:italic;padding:4px 0}',
      '[data-theme="light"] .pt-wrap{color:#1a1a2e}',
      '[data-theme="light"] .pt-h1{color:#0f1020}',
      '[data-theme="light"] .pt-lead{color:#555}',
      '[data-theme="light"] .pt-card{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.1);color:#222}',
      '[data-theme="light"] .pt-card b{color:#000}',
      '[data-theme="light"] .pt-btn{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.1);color:#111}',
      '[data-theme="light"] .pt-btn small{color:#666}',
      '[data-theme="light"] .pt-ta{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.15);color:#111}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------- хаб ----------
  async function home() {
    injectCSS();
    var c = container(); if (!c) return;
    if (!(await ensurePremium())) { renderLocked(); return; }
    track('feature_opened', { feature: 'pattern' });
    var p = loadProg();
    c.innerHTML =
      '<div class="pt-wrap">' +
        '<button class="pt-ghost" onclick="PATTERN.exit()">← К списку игр</button>' +
        '<div class="pt-h1">🎯 Паттерн: Охота на невидимое</div>' +
        '<div class="pt-lead"><b>Тренажёр главного навыка ЧВ-масти.</b> Фреди играет агента с <b>секретным правилом</b> — отвечает «да» или «нет» по нему. Твоя задача — за серию реплик понять правило и применить его. Это прямой тренинг чтения скрытых паттернов в людях и системах.</div>' +
        '<div class="pt-card"><b>📐 Как играет</b><br>' +
          '· Пишешь Фреди любую реплику.<br>' +
          '· Он мгновенно отвечает <b style="color:#86efac">«да»</b> или <b style="color:#fca5a5">«нет»</b> — строго по своему секретному правилу.<br>' +
          '· Когда уловил закономерность — нажимаешь «🎯 У меня гипотеза», описываешь правило словами.<br>' +
          '· Если угадал — этап «Применение»: добейся <b>3 «да» подряд</b>, используя правило.</div>' +
        '<div class="pt-card" style="font-size:.86rem;color:#aeb1bd">📊 Охот сыграно: <b>' + p.hunts + '</b> · правил разгадано: <b style="color:#86efac">' + p.solved + '</b><br>По уровням: 🟢 ' + p.byLvl.easy + ' · 🟡 ' + p.byLvl.mid + ' · 🔴 ' + p.byLvl.hard + '</div>' +
        seriesCardHtml() +
        '<div class="pt-h2">Выбери уровень</div>' +
        '<button class="pt-btn" onclick="PATTERN.start(\'easy\')"><b>🟢 Лёгкий</b> · правило о форме реплики<small>Считаемые свойства: знаки, длина, первая буква</small></button>' +
        '<button class="pt-btn" onclick="PATTERN.start(\'mid\')"><b>🟡 Средний</b> · правило о содержании<small>Тема, время, местоимения, цифры</small></button>' +
        '<button class="pt-btn" onclick="PATTERN.start(\'hard\')"><b>🔴 Сложный</b> · двойные правила<small>Форма + содержание одновременно</small></button>' +
        '<button class="pt-btn pt-primary" onclick="PATTERN.start(\'any\')">🎲 Случайный уровень — пусть Фреди выберет</button>' +
        '<div class="pt-card" style="font-size:.82rem;color:#8b90a0">💡 ЧВ-8 видит очевидное · ЧВ-10 видит <b>скрытые правила игры</b> · ЧВ-Валет создаёт правила. Эта игра тренирует именно скачок 8→10.</div>' +
      '</div>';
  }
  function exit() { if (typeof window.showKonturScreen === 'function') window.showKonturScreen(); else home(); }

  // ---------- запуск раунда ----------
  function start(lvl) {
    var pool = (lvl === 'any') ? RULES : rulesByLvl(lvl);
    if (!pool.length) pool = RULES;
    var rule = pool[Math.floor(Math.random() * pool.length)];
    ST = { rule: rule, log: [], phase: 'hunt', attempts: 0, hints: 0, applyStreak: 0, applyTries: 0, busy: false };
    track('feature_opened', { feature: 'pattern_round', lvl: rule.lvl, rule: rule.id });
    var p = loadProg(); p.hunts = (p.hunts || 0) + 1; saveProg(p);
    renderHunt();
  }

  function statsHtml() {
    var lvlEmoji = { easy: '🟢', mid: '🟡', hard: '🔴' };
    return '<div class="pt-stats">' +
      '<span>' + lvlEmoji[ST.rule.lvl] + ' уровень</span>' +
      '<span>попыток: <b>' + ST.attempts + '</b></span>' +
      (ST.hints ? '<span>подсказок: <b>' + ST.hints + '</b></span>' : '') +
      (ST.phase === 'apply' ? '<span>применение: <b style="color:#86efac">' + ST.applyStreak + '/3 да подряд</b> · попытка ' + ST.applyTries + '/5</span>' : '') +
      '</div>';
  }

  function logHtml() {
    if (!ST.log.length) return '';
    return '<div class="pt-log">' + ST.log.map(function (m) {
      if (m.role === 'sys') return '<div class="pt-msg s">' + esc(m.t) + '</div>';
      if (m.role === 'user') return '<div class="pt-msg u">' + esc(m.t) + '</div>';
      return '<div class="pt-msg ' + (m.t === 'да' ? 'y' : 'n') + '">' + esc(m.t) + '</div>';
    }).join('') + '</div>';
  }

  function renderHunt() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pt-wrap">' +
        '<button class="pt-ghost" onclick="PATTERN.home()">← В меню</button>' +
        '<div class="pt-h1">🎯 Охота на правило</div>' +
        '<div class="pt-legend">🎭 Фреди: <b>«' + esc(ST.rule.legend) + '»</b><br><span style="font-size:.85rem;color:#c4b5fd">У меня есть секретное правило. Пиши что хочешь — отвечу «да» или «нет» по нему. Поймай закономерность.</span></div>' +
        statsHtml() +
        logHtml() +
        '<div class="pt-row">' +
          '<textarea class="pt-ta" id="ptInput" rows="1" placeholder="Любая реплика — вопрос, утверждение, что угодно…" onkeydown="PATTERN.kd(event)"></textarea>' +
          '<button class="pt-send" id="ptSend" onclick="PATTERN.send()">➤</button>' +
        '</div>' +
        '<div class="pt-row" style="margin-top:10px;flex-wrap:wrap">' +
          '<button class="pt-chip" onclick="PATTERN.guess()">🎯 У меня гипотеза</button>' +
          '<button class="pt-chip" onclick="PATTERN.hint()">💡 Подсказка (-2 очка)</button>' +
          '<button class="pt-chip" onclick="PATTERN.giveup()">🏳️ Сдаюсь</button>' +
        '</div>' +
      '</div>';
    setTimeout(function () { var t = document.getElementById('ptInput'); if (t) t.focus(); }, 50);
  }

  function kd(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }

  function send() {
    var inp = document.getElementById('ptInput'); if (!inp) return;
    var t = inp.value.trim(); if (!t) return;
    inp.value = '';
    ST.log.push({ role: 'user', t: t });
    ST.attempts++;
    var ok = false;
    try { ok = !!ST.rule.check(t); } catch (e) { ok = false; }
    ST.log.push({ role: 'agent', t: ok ? 'да' : 'нет' });
    if (ST.phase === 'apply') {
      ST.applyTries++;
      if (ok) ST.applyStreak++;
      else ST.applyStreak = 0;
      if (ST.applyStreak >= 3) { renderWin(true); return; }
      if (ST.applyTries >= 5) { renderApplyFail(); return; }
      renderApply();
    } else {
      renderHunt();
    }
  }

  function hint() {
    if (ST.phase !== 'hunt') return;
    ST.hints++;
    ST.log.push({ role: 'sys', t: '💡 Подсказка: ' + ST.rule.hint });
    renderHunt();
  }

  // ---------- гипотеза игрока ----------
  function guess() {
    if (ST.phase !== 'hunt') return;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pt-wrap">' +
        '<button class="pt-ghost" onclick="PATTERN.back()">← Назад к охоте</button>' +
        '<div class="pt-h1">🎯 Опиши правило словами</div>' +
        '<div class="pt-card">Сформулируй своё предположение: <b>в каком случае Фреди отвечает «да»?</b> Прямо, в одной фразе. Можешь привести 1–2 примера.</div>' +
        '<textarea class="pt-ta" id="ptGuess" style="min-height:110px" placeholder="Например: «он отвечает да, когда в реплике есть слово деньги»"></textarea>' +
        '<button class="pt-btn pt-primary" onclick="PATTERN.checkGuess()">✓ Проверить гипотезу</button>' +
        '<button class="pt-btn" onclick="PATTERN.back()">← Передумал, продолжу охоту</button>' +
      '</div>';
    setTimeout(function () { var t = document.getElementById('ptGuess'); if (t) t.focus(); }, 50);
  }
  function back() { renderHunt(); }

  async function checkGuess() {
    var inp = document.getElementById('ptGuess'); if (!inp) return;
    var guessTxt = inp.value.trim();
    if (guessTxt.length < 8) { toast('Опиши гипотезу одной фразой', 'info'); return; }
    if (ST.busy) return; ST.busy = true;
    var c = container(); if (c) c.innerHTML = '<div class="pt-wrap"><button class="pt-ghost" onclick="PATTERN.home()">← В меню</button><div class="pt-h1">🎯 Гипотеза</div><div class="pt-typing">Сравниваю твою гипотезу с правилом…</div></div>';
    var prompt = 'Игрок тренажёра «Паттерн» угадывает скрытое правило Фреди.\n' +
      'Истинное правило: «' + ST.rule.name + '».\n' +
      'Гипотеза игрока: «' + guessTxt + '».\n\n' +
      'Совпадает ли гипотеза с истинным правилом ПО СУТИ (можно своими словами, без точной формулировки — главное чтобы ловила тот же признак)? Ответь СТРОГО:\n' +
      'РАЗБОР: <1–2 предложения, на «ты»: что в гипотезе попадает в правило, что мимо>\n' +
      '||OK:yes|| или ||OK:no||';
    var r = await aiGenerate(prompt, { temperature: 0.15, max_tokens: 140 });
    var ok = false, note = '';
    if (r && r.success && r.content) {
      ok = /\|\|\s*OK\s*:\s*yes\s*\|\|/i.test(r.content);
      note = clean(r.content);
    }
    ST.busy = false;
    if (ok) {
      // переход к этапу «Применение»
      ST.phase = 'apply'; ST.applyStreak = 0; ST.applyTries = 0;
      ST.log.push({ role: 'sys', t: '✓ Правило угадано — этап «Применение»: добейся 3 «да» подряд за 5 попыток' });
      renderApply(note);
    } else {
      ST.log.push({ role: 'sys', t: '✗ Гипотеза мимо. Продолжай охоту.' });
      ST.busy = false;
      // показываем разбор и возвращаем в охоту
      if (c) c.innerHTML =
        '<div class="pt-wrap">' +
          '<button class="pt-ghost" onclick="PATTERN.home()">← В меню</button>' +
          '<div class="pt-h1">❌ Мимо</div>' +
          '<div class="pt-fail">' + esc(note || 'Гипотеза не совпадает с правилом — продолжай искать.') + '</div>' +
          '<button class="pt-btn pt-primary" onclick="PATTERN.back()">▶ Продолжить охоту</button>' +
        '</div>';
    }
  }

  // ---------- этап применения ----------
  function renderApply(extraNote) {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pt-wrap">' +
        '<button class="pt-ghost" onclick="PATTERN.home()">← В меню</button>' +
        '<div class="pt-h1">🎯 Применение</div>' +
        (extraNote ? '<div class="pt-win">' + esc(extraNote) + '</div>' : '') +
        '<div class="pt-hint">📐 Правило поймано. Теперь применяй его: добейся <b>3 «да» подряд</b> за <b>5 попыток</b>. Используй знание сознательно.</div>' +
        statsHtml() +
        logHtml() +
        '<div class="pt-row">' +
          '<textarea class="pt-ta" id="ptInput" rows="1" placeholder="Реплика, которая (по твоему правилу) должна получить «да»…" onkeydown="PATTERN.kd(event)"></textarea>' +
          '<button class="pt-send" onclick="PATTERN.send()">➤</button>' +
        '</div>' +
      '</div>';
    setTimeout(function () { var t = document.getElementById('ptInput'); if (t) t.focus(); }, 50);
  }
  function renderApplyFail() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pt-wrap">' +
        '<button class="pt-ghost" onclick="PATTERN.home()">← В меню</button>' +
        '<div class="pt-h1">🔄 Применение не закрепилось</div>' +
        '<div class="pt-fail">Правило ты угадал, но за 5 попыток не вышло добиться 3 «да» подряд. Это нормально: знать ≠ применять. Реальный навык — именно во втором.<br><br><b>Истинное правило:</b> ' + esc(ST.rule.name) + '</div>' +
        '<button class="pt-btn pt-primary" onclick="PATTERN.start(\'' + ST.rule.lvl + '\')">🎯 Ещё охота на этом уровне</button>' +
        '<button class="pt-btn" onclick="PATTERN.home()">В меню</button>' +
      '</div>';
    track('feature_opened', { feature: 'pattern_apply_fail', rule: ST.rule.id });
  }
  function renderWin() {
    // очки: easy=3, mid=5, hard=8, минус за подсказки
    var basePts = { easy: 3, mid: 5, hard: 8 }[ST.rule.lvl] || 3;
    var pts = Math.max(1, basePts - ST.hints * 2);
    var p = loadProg(); p.solved = (p.solved || 0) + 1; p.byLvl[ST.rule.lvl] = (p.byLvl[ST.rule.lvl] || 0) + 1; saveProg(p);
    seriesAdd('pattern', pts);
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pt-wrap">' +
        '<button class="pt-ghost" onclick="PATTERN.home()">← В меню</button>' +
        '<div class="pt-h1">🏆 Паттерн схвачен</div>' +
        '<div class="pt-win"><b>Истинное правило Фреди:</b><br>' + esc(ST.rule.name) + '<br><br>Ты нашёл его за <b>' + ST.attempts + '</b> попыток' + (ST.hints ? ' (с ' + ST.hints + ' подсказками)' : '') + ' и закрепил применением. <b>+' + pts + '</b> к серии «Вариатика».</div>' +
        '<div class="pt-card" style="font-size:.92rem"><b>💡 Что только что произошло.</b> Ты сделал именно то, что отличает ЧВ-10 от ЧВ-8 — увидел скрытое правило, а потом сознательно его применил. В реальной жизни люди, команды, рынки тоже следуют скрытым правилам. Кто их видит — управляет игрой.</div>' +
        '<button class="pt-btn pt-primary" onclick="PATTERN.start(\'' + ST.rule.lvl + '\')">🎯 Ещё охота на этом уровне</button>' +
        '<button class="pt-btn" onclick="PATTERN.start(\'any\')">🎲 Случайный уровень</button>' +
        '<button class="pt-btn" onclick="PATTERN.home()">В меню</button>' +
      '</div>';
    track('feature_opened', { feature: 'pattern_win', rule: ST.rule.id, attempts: ST.attempts, hints: ST.hints });
  }

  function giveup() {
    if (!confirm('Сдаёшься? Правило будет раскрыто, очков не получишь.')) return;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pt-wrap">' +
        '<button class="pt-ghost" onclick="PATTERN.home()">← В меню</button>' +
        '<div class="pt-h1">🏳️ Раскрытие</div>' +
        '<div class="pt-fail"><b>Истинное правило:</b><br>' + esc(ST.rule.name) + '<br><br>Перечитай свой лог попыток — где ты прошёл мимо? Часто паттерн прячется в форме, а не в смысле.</div>' +
        logHtml() +
        '<button class="pt-btn pt-primary" onclick="PATTERN.start(\'' + ST.rule.lvl + '\')">🎯 Ещё попытка на этом уровне</button>' +
        '<button class="pt-btn" onclick="PATTERN.home()">В меню</button>' +
      '</div>';
    track('feature_opened', { feature: 'pattern_giveup', rule: ST.rule.id });
  }

  window.PATTERN = { home: home, exit: exit, openPremium: openPremium, start: start, send: send, kd: kd, guess: guess, back: back, checkGuess: checkGuess, hint: hint, giveup: giveup };
  window.showPatternGame = home;
  console.log('✅ pattern.js loaded (игра «Паттерн: Охота на невидимое»)');
})();
