// ============================================
// sobes.js — Игра «Собеседование». Фреди играет работодателя.
//
// Зачем. Клетка ТФ-6 в карте ЦА даёт 16 673 показа в месяц, и внутри неё
// «страх собеседования» 191 плюс весь кластер «не могу устроиться»
// 4441 + 1748 + 487. Карточка соседней клетки СБ-7 объясняет, почему
// тренажёр здесь работает лучше тренинга: человек платит «за возможность
// тренироваться, не выходя к людям». Живой формат ему как раз и страшен.
//
// Механика. Человек называет сферу, должность, уровень и режим — Фреди
// подстраивается под это и ведёт собеседование по-настоящему: уточняет,
// возвращается к слабым местам, задаёт неудобные вопросы. В конце —
// разбор: что сработало, где ответ звучал как оправдание, и одна
// конкретная переформулировка.
//
// Три режима — не «сложность» ради очков, а три реальных типа встречи:
// мягкий (доброжелательный HR), средний (нанимающий руководитель),
// жёсткий (стресс-интервью). Смысл жёсткого не в том, чтобы человека
// сломать, а в том, чтобы он один раз это пережил здесь, а не там.
//
// Открывается по подписке (PREMIUM_GAMES в meter.js).
//
// Экспорт: window.showSobesGame, window.SOBES
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || ''; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 380, temperature: opts.temperature == null ? 0.6 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ============================================================
  // РЕЖИМЫ. Не уровни сложности, а три разных человека по ту сторону
  // стола — их и встречают в жизни.
  // ============================================================
  var MODES = {
    soft: {
      name: 'Мягкий', em: '🙂', turns: 6,
      who: 'HR-специалист, доброжелательный',
      style: 'Ты доброжелателен, помогаешь человеку раскрыться, поддерживаешь короткими репликами. Задаёшь базовые вопросы: о себе, об опыте, о причине ухода, об ожиданиях. Не давишь и не ловишь на противоречиях.',
      lead: 'Спокойная встреча: базовые вопросы, доброжелательный тон. Чтобы просто разговориться.'
    },
    mid: {
      name: 'Средний', em: '🧐', turns: 8,
      who: 'нанимающий руководитель',
      style: 'Ты вежлив, но по делу. Просишь конкретику вместо общих слов: «а какой был результат в цифрах?», «а что именно вы сделали лично?». Замечаешь расплывчатые ответы и возвращаешься к ним один раз. Задаёшь один вопрос о неудаче и один о том, почему ушли с прошлого места.',
      lead: 'Так выглядит большинство настоящих собеседований: вежливо, но за общие слова не пропустят.'
    },
    hard: {
      name: 'Жёсткий', em: '😐', turns: 10,
      who: 'руководитель, ведущий стресс-интервью',
      style: 'Ты сдержан и скуп на реакции, местами скептичен. Ловишь противоречия между ответами и называешь их. Задаёшь неудобные вопросы: о провалах, о пробелах в опыте, «почему мы должны взять именно вас», «а если я скажу, что вы нам не подходите». Прямо сомневаешься вслух в одном из ответов. НО: ты не хамишь, не унижаешь и не переходишь на личности — это профессиональное давление, а не оскорбление.',
      lead: 'Стресс-интервью: скепсис, неудобные вопросы, поиск противоречий. Тяжело — и лучше пережить это здесь.'
    }
  };
  var MODE_ORDER = ['soft', 'mid', 'hard'];

  // Подсказки-сферы: не ограничение, а способ не начинать с пустого поля.
  var FIELDS = ['ИТ и разработка', 'Продажи', 'Бухгалтерия и финансы', 'Маркетинг',
    'Логистика и склад', 'Производство', 'Медицина', 'Образование',
    'Строительство', 'Общепит и сервис', 'Госслужба', 'Рабочая специальность'];

  // Запасной банк вопросов — если ИИ недоступен. Универсальные, их задают
  // почти везде; подстановка должности делает их не совсем безликими.
  var FALLBACK = [
    'Расскажите о себе — коротко, минуты за две.',
    'Почему вы ушли с прошлого места?',
    'Какой результат в работе вы считаете своим лучшим? Желательно с цифрами.',
    'Расскажите о случае, когда что-то пошло не так по вашей вине. Что вы сделали?',
    'Почему вы хотите работать именно у нас, на позиции «{POS}»?',
    'Что вам нужно от работы, кроме зарплаты?',
    'Как вы поступите, если задача поставлена нечётко, а руководителя нет на связи?',
    'Назовите свою слабую сторону — и что вы с ней делаете.',
    'На какую зарплату вы рассчитываете и почему именно на такую?',
    'Есть ли у вас вопросы ко мне?'
  ];

  var ST = { mode: 'mid', field: '', pos: '', exp: '', dialog: [], turn: 0, busy: false, done: false };

  function loadPrefs() {
    try {
      var p = JSON.parse(localStorage.getItem('fredi_sobes_prefs') || '{}');
      if (p && typeof p === 'object') {
        if (MODES[p.mode]) ST.mode = p.mode;
        ST.field = String(p.field || ''); ST.pos = String(p.pos || ''); ST.exp = String(p.exp || '');
      }
    } catch (e) {}
  }
  function savePrefs() {
    try { localStorage.setItem('fredi_sobes_prefs', JSON.stringify({ mode: ST.mode, field: ST.field, pos: ST.pos, exp: ST.exp })); } catch (e) {}
  }
  function loadStats() { try { return JSON.parse(localStorage.getItem('fredi_sobes_stats') || '{}') || {}; } catch (e) { return {}; } }
  function saveStats(s) { try { localStorage.setItem('fredi_sobes_stats', JSON.stringify(s)); } catch (e) {} }

  function injectCSS() {
    if (document.getElementById('sobesCSS')) return;
    var s = document.createElement('style'); s.id = 'sobesCSS';
    s.textContent = [
      '.sbs-wrap{max-width:720px;margin:0 auto;padding:18px 16px 110px;color:#e8eaed}',
      '.sbs-h1{font-size:1.5rem;font-weight:800;margin:0 0 8px}',
      '.sbs-lead{color:#9ca3af;line-height:1.6;margin:0 0 16px;font-size:.97rem}',
      '.sbs-ghost{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:0;margin:0 0 12px}',
      '.sbs-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.sbs-lbl{font-weight:700;margin:14px 0 6px;font-size:.95rem}',
      '.sbs-in{width:100%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);border-radius:12px;padding:12px 14px;color:inherit;font-size:.98rem;font-family:inherit;box-sizing:border-box;margin:0 0 4px}',
      '.sbs-chips{display:flex;flex-wrap:wrap;gap:7px;margin:6px 0 4px}',
      '.sbs-chip{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:20px;padding:7px 13px;cursor:pointer;font-size:.85rem;color:#c8ccd4}',
      '.sbs-chip:hover{border-color:rgba(56,189,248,.5)}',
      '.sbs-modes{display:flex;gap:8px;margin:6px 0 4px}',
      '.sbs-mode{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:11px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.sbs-mode.on{border-color:#38bdf8;background:rgba(56,189,248,.15);color:#fff}',
      '.sbs-modehint{color:#9ca3af;font-size:.86rem;line-height:1.5;margin:8px 0 4px;min-height:2.6em}',
      '.sbs-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.sbs-setup{border:1px solid rgba(56,189,248,.35);background:rgba(56,189,248,.07);border-radius:14px;padding:13px 16px;margin:0 0 14px;font-size:.93rem;line-height:1.55;color:#bae6fd}',
      '.sbs-msg{border-radius:14px;padding:12px 16px;margin:0 0 10px;line-height:1.55;font-size:.98rem;max-width:92%}',
      '.sbs-them{border:1px solid rgba(148,163,184,.35);background:rgba(148,163,184,.08)}',
      '.sbs-me{border:1px solid rgba(52,211,153,.35);background:rgba(52,211,153,.08);margin-left:auto}',
      '.sbs-ta{width:100%;min-height:88px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);border-radius:12px;padding:12px 14px;color:inherit;font-size:.98rem;font-family:inherit;line-height:1.5;resize:vertical;box-sizing:border-box;margin:6px 0 10px}',
      '.sbs-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#04283a;cursor:pointer;background:linear-gradient(135deg,#38bdf8,#0ea5e9);box-shadow:0 8px 22px rgba(56,189,248,.28);margin:0 0 10px}',
      '.sbs-primary[disabled]{opacity:.6;cursor:default}',
      '.sbs-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:13px;font-size:.95rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.sbs-row{display:flex;gap:10px}.sbs-row>*{flex:1;margin-bottom:0}',
      '.sbs-hint{border:1px solid rgba(250,204,21,.35);background:rgba(250,204,21,.08);border-radius:12px;padding:12px 14px;margin:0 0 10px;font-size:.88rem;line-height:1.55;color:#fde68a}',
      '.sbs-score{text-align:center;font-size:1.3rem;font-weight:800;margin:0 0 12px;color:#38bdf8}',
      '.sbs-verdict{border:1px solid rgba(56,189,248,.4);background:linear-gradient(135deg,rgba(56,189,248,.1),rgba(14,165,233,.04));border-radius:14px;padding:14px 16px;margin:0 0 12px;line-height:1.6;font-size:.95rem}',
      '[data-theme="light"] .sbs-wrap{color:#1f2430}',
      '[data-theme="light"] .sbs-lead,[data-theme="light"] .sbs-modehint{color:#4b5566}',
      '[data-theme="light"] .sbs-card{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .sbs-secondary,[data-theme="light"] .sbs-mode,[data-theme="light"] .sbs-chip{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .sbs-ta,[data-theme="light"] .sbs-in{background:#fff;border-color:rgba(0,0,0,.15);color:#1f2430}',
      '[data-theme="light"] .sbs-setup{color:#075985}',
      '@media(max-width:560px){.sbs-wrap{padding:14px 12px 96px}.sbs-modes{flex-direction:column}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------- Экран настройки ----------
  function home() {
    injectCSS(); loadPrefs(); ST.dialog = []; ST.turn = 0; ST.done = false;
    track('feature_opened', { feature: 'sobes' });
    var c = container(); if (!c) return;
    var s = loadStats();
    c.innerHTML =
      '<div class="sbs-wrap">' +
        '<button class="sbs-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="sbs-h1">💼 Собеседование</div>' +
        '<div class="sbs-lead">Фреди сыграет работодателя. Скажите, куда вы устраиваетесь, — и он будет собеседовать вас по-настоящему: уточнять, возвращаться к слабым местам, спрашивать неудобное. Страх собеседования падает не от подготовки, а от количества встреч. Здесь их можно провести сколько угодно.</div>' +
        (s.plays ? '<div class="sbs-card" style="text-align:center">Пройдено собеседований: <b>' + s.plays + '</b>' + (s.best ? ' · лучший балл: <b>' + s.best + '/10</b>' : '') + '</div>' : '') +

        '<div class="sbs-lbl">Сфера</div>' +
        '<input class="sbs-in" id="sbsField" placeholder="например, продажи" value="' + esc(ST.field) + '">' +
        '<div class="sbs-chips">' + FIELDS.map(function (f) {
          return '<div class="sbs-chip" onclick="SOBES.setField(\'' + esc(f).replace(/'/g, "\\'") + '\')">' + esc(f) + '</div>'; }).join('') + '</div>' +

        '<div class="sbs-lbl">Должность</div>' +
        '<input class="sbs-in" id="sbsPos" placeholder="например, менеджер по продажам" value="' + esc(ST.pos) + '">' +

        '<div class="sbs-lbl">Опыт и что важно упомянуть <span style="font-weight:400;color:#9ca3af">— необязательно</span></div>' +
        '<textarea class="sbs-ta" id="sbsExp" style="min-height:70px" placeholder="Три года в рознице, был перерыв в стаже, боюсь вопроса про увольнение…">' + esc(ST.exp) + '</textarea>' +

        '<div class="sbs-lbl">Режим</div>' +
        '<div class="sbs-modes">' + MODE_ORDER.map(function (k) {
          return '<div class="sbs-mode' + (ST.mode === k ? ' on' : '') + '" onclick="SOBES.setMode(\'' + k + '\')">' + MODES[k].em + ' ' + esc(MODES[k].name) + '</div>'; }).join('') + '</div>' +
        '<div class="sbs-modehint" id="sbsModeHint">' + esc(MODES[ST.mode].lead) + '</div>' +

        '<button class="sbs-primary" onclick="SOBES.start()">Начать собеседование →</button>' +
        '<div class="sbs-card" style="font-size:.88rem;color:#9ca3af">💡 Отвечайте вслух, а потом записывайте. Ответ, который язык уже произносил, на настоящей встрече вытаскивается целиком — в отличие от продуманного в голове.</div>' +
      '</div>';
  }

  function grab() {
    var f = document.getElementById('sbsField'), p = document.getElementById('sbsPos'), e = document.getElementById('sbsExp');
    if (f) ST.field = String(f.value || '').trim();
    if (p) ST.pos = String(p.value || '').trim();
    if (e) ST.exp = String(e.value || '').trim();
  }
  function setField(v) { grab(); ST.field = v; savePrefs(); home(); }
  function setMode(k) {
    if (!MODES[k]) return;
    grab(); ST.mode = k; savePrefs(); vibe(20); home();
  }

  function roleBrief() {
    var m = MODES[ST.mode];
    return 'Ты проводишь собеседование. Твоя роль: ' + m.who + '. ' + m.style +
      '\nВакансия: «' + (ST.pos || 'специалист') + '»' + (ST.field ? ', сфера — ' + ST.field : '') + '.' +
      (ST.exp ? '\nЧто кандидат сообщил о себе: ' + ST.exp : '') +
      '\nВажно: ты работодатель, а не психолог. Не поддерживай, не хвали за смелость, не давай советов по ходу — просто веди собеседование. Один вопрос за реплику, максимум два предложения. Говори на «вы».';
  }

  async function start() {
    grab();
    if (!ST.pos) { if (typeof window.showToast === 'function') window.showToast('Напишите должность — Фреди подстроится под неё', 'info'); return; }
    savePrefs(); injectCSS();
    ST.dialog = []; ST.turn = 0; ST.done = false; ST.busy = true;
    track('game_round_start', { feature: 'sobes', mode: ST.mode, pos: ST.pos.slice(0, 40) });
    renderWaiting('Кандидат заходит в кабинет…');
    var q = '';
    try {
      var r = await aiGenerate(roleBrief() + '\n\nНачни собеседование: поздоровайся одной фразой и задай первый вопрос. Без приветственных речей и без описания компании.', { max_tokens: 160 });
      if (r && r.success && r.content) q = String(r.content).trim();
    } catch (e) {}
    if (!q) q = 'Здравствуйте. Расскажите о себе — коротко, минуты за две.';
    ST.dialog.push({ who: 'them', text: q });
    ST.busy = false;
    render();
  }

  function renderWaiting(msg) {
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="sbs-wrap"><div class="sbs-h1" style="font-size:1.2rem">💼 Собеседование</div><div class="sbs-card">' + esc(msg) + '</div></div>';
  }

  function render() {
    var c = container(); if (!c) return;
    var m = MODES[ST.mode];
    var msgs = ST.dialog.map(function (x) {
      if (x.who === 'them') return '<div class="sbs-msg sbs-them">' + m.em + ' ' + esc(x.text) + '</div>';
      return '<div class="sbs-msg sbs-me">🙂 ' + esc(x.text) + '</div>';
    }).join('');
    var over = ST.turn >= m.turns;
    var input = over
      ? '<button class="sbs-primary" onclick="SOBES.finish()">Собеседование окончено — разбор →</button>'
      : '<textarea class="sbs-ta" id="sbsTA" placeholder="Ваш ответ…"></textarea>' +
        '<button class="sbs-primary" id="sbsSend" onclick="SOBES.send()">Ответить →</button>' +
        '<div class="sbs-row"><button class="sbs-secondary" onclick="SOBES.hint()">💡 Как отвечать</button><button class="sbs-secondary" onclick="SOBES.finish()">Закончить и разобрать</button></div>' +
        '<div id="sbsHint"></div>';
    c.innerHTML =
      '<div class="sbs-wrap">' +
        '<div class="sbs-top"><span>' + m.em + ' ' + esc(m.who) + ' · вопрос ' + Math.min(ST.turn + 1, m.turns) + ' из ' + m.turns + '</span>' +
        '<button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="SOBES.home()">✕ Выйти</button></div>' +
        '<div class="sbs-setup">🎬 Вакансия «' + esc(ST.pos) + '»' + (ST.field ? ', ' + esc(ST.field) : '') + '. Режим: ' + esc(m.name.toLowerCase()) + '.</div>' +
        msgs + input +
      '</div>';
    try { var el = document.getElementById('sbsTA'); if (el) el.focus(); } catch (e) {}
  }

  function hint() {
    var box = document.getElementById('sbsHint'); if (!box) return;
    box.innerHTML = '<div class="sbs-hint"><b>Что работает:</b><br>' +
      '· Результат, а не обязанности: не «занимался отчётностью», а «сократил закрытие месяца с десяти дней до четырёх».<br>' +
      '· Про уход — коротко и в прошедшем времени. Длинное оправдание звучит как признание вины.<br>' +
      '· О прошлом работодателе плохо не говорить: читается как обещание рассказать то же про них.<br>' +
      '· «Не знаю» лучше выдумки: за честное «не сталкивался, но сделал бы так» не наказывают.<br>' +
      '· Задайте свои вопросы. Их отсутствие читается как безразличие.</div>';
  }

  async function send() {
    if (ST.busy) return;
    var ta = document.getElementById('sbsTA');
    var text = ta ? String(ta.value || '').trim() : '';
    if (!text) { if (typeof window.showToast === 'function') window.showToast('Напишите ответ', 'info'); return; }
    ST.dialog.push({ who: 'me', text: text });
    ST.turn++;
    var m = MODES[ST.mode];
    vibe(15);
    if (ST.turn >= m.turns) { render(); return; }
    ST.busy = true; render();
    var box = container();
    if (box) { var d = document.createElement('div'); d.className = 'sbs-card'; d.textContent = 'Печатает…'; box.querySelector('.sbs-wrap').appendChild(d); }
    var q = '';
    try {
      var hist = ST.dialog.map(function (x) { return (x.who === 'them' ? 'Вы (интервьюер)' : 'Кандидат') + ': ' + x.text; }).join('\n');
      var r = await aiGenerate(roleBrief() + '\n\nХод собеседования:\n' + hist +
        '\n\nЗадай следующий вопрос. Если предыдущий ответ был расплывчатым — попроси конкретику по нему. Один вопрос, максимум два предложения, без похвалы и без советов.', { max_tokens: 180 });
      if (r && r.success && r.content) q = String(r.content).trim();
    } catch (e) {}
    if (!q) {
      var fb = FALLBACK[Math.min(ST.turn, FALLBACK.length - 1)];
      q = fb.replace('{POS}', ST.pos || 'эту должность');
    }
    ST.dialog.push({ who: 'them', text: q });
    ST.busy = false;
    render();
  }

  // Локальный разбор — если ИИ недоступен. Опирается на то, что
  // проверяемо без понимания смысла: длина, конкретика, цифры,
  // оправдания, плохие слова о прошлом работодателе.
  function localJudge() {
    var mine = ST.dialog.filter(function (x) { return x.who === 'me'; });
    if (!mine.length) return { score: 0, text: 'Ответов не было — разбирать нечего.' };
    var digits = mine.filter(function (x) { return /\d/.test(x.text); }).length;
    var tooShort = mine.filter(function (x) { return x.text.length < 40; }).length;
    var tooLong = mine.filter(function (x) { return x.text.length > 700; }).length;
    var badBoss = mine.some(function (x) { return /(начальник|руководител|директор|компани)[^.]{0,60}(ужас|кошмар|идиот|дур|токсич|ненавид|обман)/i.test(x.text); });
    var excuses = mine.filter(function (x) { return /(просто|ну|как бы|наверное|честно говоря)/i.test(x.text) && x.text.length > 300; }).length;
    var score = 5 + Math.min(3, digits) - Math.min(2, tooShort) - tooLong - (badBoss ? 3 : 0) - Math.min(2, excuses);
    score = Math.max(1, Math.min(10, score));
    var n = [];
    if (digits >= 2) n.push('В ответах были конкретные цифры и факты — это то, что отличает рассказ о результатах от рассказа об обязанностях.');
    else n.push('Почти нигде не прозвучало цифр. Один конкретный результат — «сделал столько-то за такой-то срок» — весит больше абзаца общих слов.');
    if (tooShort >= 2) n.push('Часть ответов слишком коротка: собеседник не успевает понять, что вы умеете.');
    if (tooLong) n.push('Были очень длинные ответы. После полутора минут слушатель перестаёт следить за смыслом.');
    if (badBoss) n.push('Прозвучало плохое о прошлом работодателе — это читается однозначно: про этих через год расскажут так же. Самое важное место для пересмотра.');
    if (excuses) n.push('Местами ответ звучал как оправдание. Короче и в прошедшем времени — крепче.');
    return { score: score, text: n.join(' ') };
  }

  async function finish() {
    if (ST.busy) return; ST.busy = true;
    var m = MODES[ST.mode];
    renderWaiting('Фреди перечитывает собеседование…');
    var transcript = ST.dialog.map(function (x) { return (x.who === 'them' ? 'Интервьюер' : 'Кандидат') + ': «' + x.text + '»'; }).join('\n');
    var verdict = '', score = null;
    try {
      var r = await aiGenerate('Ты — Фреди, тренер по собеседованиям. Человек только что прошёл тренировочное собеседование на должность «' +
        (ST.pos || 'специалист') + '»' + (ST.field ? ' в сфере «' + ST.field + '»' : '') + ', режим — ' + m.name.toLowerCase() + '.\n' +
        'Расшифровка:\n' + transcript +
        '\n\nРазбери его ответы как нанимающий руководитель, но по-доброму. Ответь по-русски, на «вы», в формате:\nОЦЕНКА: X/10\n' +
        'Затем 4–6 коротких пунктов: что прозвучало сильно; где не хватило конкретики или цифр; где ответ звучал как оправдание; ' +
        'и обязательно — ОДНА фраза кандидата, переписанная так, как стоило бы сказать. Без нотаций и без общих советов.', { max_tokens: 520 });
      var t = (r && r.success && r.content) ? String(r.content).trim() : '';
      var mm = t.match(/ОЦЕНКА:\s*(\d{1,2})/i);
      if (mm) { score = Math.max(0, Math.min(10, parseInt(mm[1], 10))); verdict = t.replace(/ОЦЕНКА:\s*\d{1,2}\s*\/\s*10\.?/i, '').trim(); }
      else if (t) { verdict = t; }
    } catch (e) {}
    if (score == null) { var lj = localJudge(); score = lj.score; if (!verdict) verdict = lj.text; }
    ST.busy = false; ST.done = true;
    var s = loadStats(); s.plays = (s.plays || 0) + 1; if (!s.best || score > s.best) s.best = score; saveStats(s);
    if (score >= 8) vibe([40, 40, 40]);
    var line = score >= 9 ? 'Так проходят собеседования 🏆' : score >= 7 ? 'Уверенно — с таким разговором берут' :
      score >= 5 ? 'Основа есть, не хватает конкретики' : 'Есть что переиграть — и теперь видно, что именно';
    var c = container(); if (!c) { return; }
    c.innerHTML =
      '<div class="sbs-wrap">' +
        '<div class="sbs-h1" style="font-size:1.2rem">💼 Разбор</div>' +
        '<div class="sbs-score">' + score + '/10</div>' +
        '<div class="sbs-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        '<div class="sbs-verdict">💬 ' + esc(verdict).replace(/\n/g, '<br>') + '</div>' +
        '<div class="sbs-card" style="font-size:.9rem;color:#9ca3af">💡 Перенос в жизнь: перед настоящей встречей проговорите вслух три ответа — о себе, о причине ухода, о лучшем результате. Ответ, который язык уже произносил, вытаскивается целиком даже под волнением.</div>' +
        '<div class="sbs-row"><button class="sbs-primary" onclick="SOBES.start()" style="margin:0">🔁 Ещё раз</button><button class="sbs-secondary" onclick="SOBES.home()">Другие настройки</button></div>' +
      '</div>';
    try { var el = document.getElementById('screenContainer'); if (el) el.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'sobes', mode: ST.mode, score: score, turns: ST.turn });
  }

  window.SOBES = { home: home, setMode: setMode, setField: setField, start: start, send: send, hint: hint, finish: finish, getState: function () { return ST; } };
  window.showSobesGame = home;
  console.log('✅ sobes.js loaded (игра «Собеседование»)');
})();
