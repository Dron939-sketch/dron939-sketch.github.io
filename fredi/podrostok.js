// ============================================
// podrostok.js — Игра «Разговор с подростком». Фреди играет подростка.
//
// Зачем. Клетка СБ-8 в карте ЦА: родитель подростка даёт ~1990 показов в
// месяц сверх того, что уже покрыто, — «как разговаривать с подростком»,
// «как наладить отношения», «подросток ненавидит мать», «сын хамит
// матери». Статья «Как наладить отношения с подростком» называет пять
// вопросов, которые заканчивают разговор, — но прочитать про это и
// удержаться от «как дела?» в дверях кухни разные вещи.
//
// Механика. Фреди играет подростка в заданной ситуации, родитель пишет
// свои реплики. Ключевое отличие от разбора в конце: шкала контакта
// двигается СРАЗУ. Сказал «а вот я в твои годы» — видно, как створка
// закрылась, на той же секунде. Это и есть то, чего не даёт статья.
//
// Пять закрывающих ходов ловятся локально, без ИИ, — они формулируются
// почти дословно, и на них полагаться надёжнее, чем на суждение модели.
// ИИ отвечает за реплики подростка, локальный счётчик — за обратную
// связь. Если ИИ недоступен, игра работает целиком: реплики берутся из
// банка по состоянию контакта.
//
// Чего здесь сознательно нет: победы. Разговор не «выигрывается» —
// подросток не обязан раскрыться, и тренажёр, обещающий обратное, учил
// бы неправде. Максимум, который засчитывается, — «он остался в
// комнате и ответил не односложно».
//
// Открывается по подписке (PREMIUM_GAMES в meter.js).
//
// Экспорт: window.showPodrostokGame, window.PODR
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
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 220, temperature: opts.temperature == null ? 0.8 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ============================================================
  // РЕЖИМЫ — не сложность, а три состояния, в которых подростка застают.
  // ============================================================
  var MODES = {
    soft: {
      name: 'Тихий', em: '🙂', turns: 8, start: 45,
      who: 'подросток в обычном настроении, слегка закрытый',
      style: 'Отвечаешь коротко, но не грубо. Если родитель говорит о себе или про что-то внешнее — оживляешься и отвечаешь длиннее. На прямые вопросы о себе отвечаешь односложно.',
      lead: 'Обычный вечер. Не злится, но и разговаривать не рвётся.'
    },
    mid: {
      name: 'Закрытый', em: '😐', turns: 10, start: 30,
      who: 'подросток, который закрылся и отвечает односложно',
      style: 'Отвечаешь «нормально», «не знаю», «всё ок», пожимаешь плечами. Оттаиваешь только если родитель НЕ спрашивает о тебе: говорит о себе, про фильм, про игру, про чужую историю. На любой вопрос о твоём состоянии закрываешься сильнее.',
      lead: 'Дверь закрыта, на вопросы — «нормально». Так это выглядит чаще всего.'
    },
    hard: {
      name: 'На взводе', em: '😠', turns: 12, start: 18,
      who: 'подросток на взводе, готовый огрызнуться',
      style: 'Ты раздражён и отвечаешь резко, можешь огрызнуться и сказать обидное — «отстань», «тебе всё равно», «ты всё равно не поймёшь». Ты НЕ ругаешься матом и не оскорбляешь. Если родитель отвечает грубостью или начинает поучать — закрываешься совсем. Если родитель остаётся спокойным и не давит несколько реплик подряд — понемногу сбавляешь тон.',
      lead: 'Только что нагрубил. Здесь важнее всего не ответить тем же.'
    }
  };
  var MODE_ORDER = ['soft', 'mid', 'hard'];

  // Ситуации — чтобы не начинать с пустого поля. Последняя своя.
  var SCENES = [
    'Пришёл с плохой оценкой и молчит',
    'Сидит в телефоне, на всё отвечает «нормально»',
    'Нагрубил и ушёл в комнату',
    'Сказал, что вы его не понимаете',
    'Перестал рассказывать про друзей',
    'Не хочет идти в школу'
  ];

  // ============================================================
  // ПЯТЬ ЗАКРЫВАЮЩИХ ХОДОВ — из статьи. Ловятся локально: они
  // формулируются почти дословно, и регулярное выражение здесь
  // надёжнее суждения модели.
  //
  // Границы слова заданы классом «не буква», а не \b. В JavaScript \b
  // определена по [A-Za-z0-9_], кириллица в этот класс не входит, и
  // /\bкак\s+дела\b/ не находит «Как дела?» вообще. На первом прогоне
  // из-за этого молчали два закрывающих хода из пяти, все шесть
  // открывающих и проверка на грубость — шкала не двигалась.
  // Текст перед проверкой обрамляется пробелами, поэтому граница
  // срабатывает и в начале строки, и в конце.
  // ============================================================
  var NB = '[^а-яёa-z]';
  function rx(body) { return new RegExp(NB + '(?:' + body + ')', 'i'); }
  function prep(t) { return ' ' + String(t == null ? '' : t).toLowerCase() + ' '; }

  var CLOSERS = [
    { rx: rx('как\\s+(?:у\\s+теб[яе]\\s+)?дела' + NB + '|как\\s+(?:прош[её]л\\s+)?(?:твой\\s+)?день' + NB),
      cost: 8, why: '«Как дела» — вопрос без содержания, и ответ на него будет без содержания.' },
    { rx: rx('что\\s+(?:у\\s+теб[яе]\\s+)?случилось|что\\s+(?:с\\s+тобой|(?:у\\s+теб[яе]\\s+)?не\\s+так)|ты\\s+чего' + NB),
      cost: 10, why: '«Что случилось» читается как «с тобой что-то не так, признавайся».' },
    { rx: rx('почему\\s+ты\\s+так\\s+со\\s+мной|как\\s+ты\\s+(?:со\\s+мной\\s+)?разговариваешь|что\\s+за\\s+тон' + NB),
      cost: 14, why: 'Разговор про тон — приглашение к ссоре, и оба заранее знают, чем оно кончится.' },
    { rx: rx('(?:я|мы)\\s+в\\s+тво[ий]\\s+год|в\\s+тво[её]м\\s+возраст|вот\\s+я\\s+в\\s+тво'),
      cost: 12, why: '«А вот я в твои годы» закрывает гарантированно: ваш опыт для него из другого мира.' },
    { rx: rx('ты\\s+(?:вообще|хоть)\\s+понимаешь|сколько\\s+раз\\s+(?:я\\s+)?(?:теб[ея]\\s+)?говорил'),
      cost: 12, why: 'Это начало лекции, и он слышит это по первым трём словам.' }
  ];

  // Грубость в ответ — отдельно и дороже всего: статья говорит, что
  // подросток запомнит не свою неправоту, а вашу.
  var RUDE = {
    rx: rx('дурак|идиот|тупо[йе]' + NB + '|обнаглел|неблагодарн|сволоч|заткнись|пош[ёе]л\\s+вон|хам(?:ло|ишь)' + NB),
    cost: 22, why: 'Ответная грубость закрывает тему надолго: он запомнит не свою неправоту, а вашу.' };

  // Открывающие ходы — то, что статья предлагает вместо.
  var OPENERS = [
    { rx: rx('(?:у\\s+меня|я)\\s+(?:сегодня|вчера|тут|на\\s+работе)'), gain: 10,
      why: 'Рассказ о себе — в нём нечего проверять и нечего оценивать, поэтому он и работает.' },
    { rx: rx('фильм|сериал|игр[уаые]' + NB + '|музык|трек' + NB + '|видео|ютуб|канал'), gain: 8,
      why: 'Разговор на его территории и про внешнее проходит там, где прямой вопрос не проходит.' },
    { rx: rx('я\\s+рядом|я\\s+(?:на|в)\\s+кухне|если\\s+что' + NB + '|захочешь\\s*[—-]?\\s*расскажешь|не\\s+буду\\s+лезть'), gain: 9,
      why: 'Доступность без требования — ровно то, что подросток проверяет.' },
    { rx: rx('(?:вижу|похоже|кажется|видно),?\\s+(?:что\\s+)?(?:теб|день|у\\s+теб)'), gain: 7,
      why: 'Наблюдение вместо вопроса не требует отчёта и не читается как проверка.' },
    { rx: rx('извини|прости' + NB + '|я\\s+(?:была?\\s+не\\s+прав|перегнул|погорячил)'), gain: 11,
      why: 'Признать свою неправоту первым — самый быстрый способ вернуть контакт.' },
    { rx: rx('я\\s+теб[яе]\\s+не\\s+бросаю|я\\s+теб[яе]\\s+люблю|ты\\s+мне\\s+важ'), gain: 8,
      why: 'Сказанное вне ссоры и без требования отклика — это доходит.' }
  ];

  // Запасные реплики подростка по состоянию контакта — если ИИ недоступен.
  var BANK = {
    low: ['Ничего.', 'Отстань.', 'Тебе всё равно.', 'Не хочу об этом.', 'Всё нормально, я сказал.', 'Можно я пойду?'],
    mid: ['Нормально.', 'Не знаю.', 'Да так.', 'Ну да.', 'А что?', 'Угу.'],
    high: ['Ну… было тупо, если честно.', 'А ты правда так думаешь?', 'Ладно, слушай…',
           'Я думал, ты будешь орать.', 'Ну там долгая история.', 'А у тебя так было?']
  };

  var ST = { mode: 'mid', scene: '', age: 14, kid: 'сын', dialog: [], turn: 0,
             contact: 30, busy: false, notes: [], hits: [] };

  function loadPrefs() {
    try {
      var p = JSON.parse(localStorage.getItem('fredi_podr_prefs') || '{}');
      if (p && typeof p === 'object') {
        if (MODES[p.mode]) ST.mode = p.mode;
        ST.scene = String(p.scene || '');
        ST.age = Math.max(11, Math.min(18, parseInt(p.age, 10) || 14));
        ST.kid = (p.kid === 'дочь') ? 'дочь' : 'сын';
      }
    } catch (e) {}
  }
  function savePrefs() {
    try { localStorage.setItem('fredi_podr_prefs', JSON.stringify({ mode: ST.mode, scene: ST.scene, age: ST.age, kid: ST.kid })); } catch (e) {}
  }
  function loadStats() { try { return JSON.parse(localStorage.getItem('fredi_podr_stats') || '{}') || {}; } catch (e) { return {}; } }
  function saveStats(s) { try { localStorage.setItem('fredi_podr_stats', JSON.stringify(s)); } catch (e) {} }

  function injectCSS() {
    if (document.getElementById('podrCSS')) return;
    var s = document.createElement('style'); s.id = 'podrCSS';
    s.textContent = [
      '.pdr-wrap{max-width:720px;margin:0 auto;padding:18px 16px 110px;color:#e8eaed}',
      '.pdr-h1{font-size:1.5rem;font-weight:800;margin:0 0 8px}',
      '.pdr-lead{color:#9ca3af;line-height:1.6;margin:0 0 16px;font-size:.97rem}',
      '.pdr-ghost{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:0;margin:0 0 12px}',
      '.pdr-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.pdr-lbl{font-weight:700;margin:14px 0 6px;font-size:.95rem}',
      '.pdr-in{width:100%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);border-radius:12px;padding:12px 14px;color:inherit;font-size:.98rem;font-family:inherit;box-sizing:border-box;margin:0 0 4px}',
      '.pdr-chips{display:flex;flex-wrap:wrap;gap:7px;margin:6px 0 4px}',
      '.pdr-chip{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:20px;padding:7px 13px;cursor:pointer;font-size:.85rem;color:#c8ccd4}',
      '.pdr-chip.on{border-color:#a78bfa;background:rgba(167,139,250,.16);color:#fff}',
      '.pdr-modes{display:flex;gap:8px;margin:6px 0 4px}',
      '.pdr-mode{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:11px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.pdr-mode.on{border-color:#a78bfa;background:rgba(167,139,250,.16);color:#fff}',
      '.pdr-modehint{color:#9ca3af;font-size:.86rem;line-height:1.5;margin:8px 0 4px;min-height:2.6em}',
      '.pdr-top{display:flex;justify-content:space-between;align-items:center;color:#9ca3af;font-size:.9rem;margin:0 0 8px}',
      '.pdr-bar{height:8px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;margin:0 0 4px}',
      '.pdr-fill{height:100%;border-radius:6px;transition:width .45s ease,background .45s ease}',
      '.pdr-barlbl{display:flex;justify-content:space-between;font-size:.82rem;color:#9ca3af;margin:0 0 12px}',
      '.pdr-setup{border:1px solid rgba(167,139,250,.35);background:rgba(167,139,250,.08);border-radius:14px;padding:13px 16px;margin:0 0 14px;font-size:.93rem;line-height:1.55;color:#ddd6fe}',
      '.pdr-msg{border-radius:14px;padding:12px 16px;margin:0 0 10px;line-height:1.55;font-size:.98rem;max-width:92%}',
      '.pdr-them{border:1px solid rgba(148,163,184,.35);background:rgba(148,163,184,.08)}',
      '.pdr-me{border:1px solid rgba(52,211,153,.35);background:rgba(52,211,153,.08);margin-left:auto}',
      '.pdr-fb{font-size:.86rem;line-height:1.5;border-radius:10px;padding:8px 12px;margin:-4px 0 12px;max-width:92%;margin-left:auto}',
      '.pdr-fb.bad{border:1px solid rgba(248,113,113,.4);background:rgba(248,113,113,.08);color:#fca5a5}',
      '.pdr-fb.good{border:1px solid rgba(52,211,153,.4);background:rgba(52,211,153,.08);color:#6ee7b7}',
      '.pdr-ta{width:100%;min-height:80px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);border-radius:12px;padding:12px 14px;color:inherit;font-size:.98rem;font-family:inherit;line-height:1.5;resize:vertical;box-sizing:border-box;margin:6px 0 10px}',
      '.pdr-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#241046;cursor:pointer;background:linear-gradient(135deg,#c4b5fd,#a78bfa);box-shadow:0 8px 22px rgba(167,139,250,.28);margin:0 0 10px}',
      '.pdr-primary[disabled]{opacity:.6;cursor:default}',
      '.pdr-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:13px;font-size:.95rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.pdr-row{display:flex;gap:10px}.pdr-row>*{flex:1;margin-bottom:0}',
      '.pdr-hint{border:1px solid rgba(250,204,21,.35);background:rgba(250,204,21,.08);border-radius:12px;padding:12px 14px;margin:0 0 10px;font-size:.88rem;line-height:1.55;color:#fde68a}',
      '.pdr-verdict{border:1px solid rgba(167,139,250,.4);background:linear-gradient(135deg,rgba(167,139,250,.1),rgba(139,92,246,.04));border-radius:14px;padding:14px 16px;margin:0 0 12px;line-height:1.6;font-size:.95rem}',
      '[data-theme="light"] .pdr-wrap{color:#1f2430}',
      '[data-theme="light"] .pdr-lead,[data-theme="light"] .pdr-modehint,[data-theme="light"] .pdr-barlbl{color:#4b5566}',
      '[data-theme="light"] .pdr-card{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .pdr-secondary,[data-theme="light"] .pdr-mode,[data-theme="light"] .pdr-chip{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .pdr-ta,[data-theme="light"] .pdr-in{background:#fff;border-color:rgba(0,0,0,.15);color:#1f2430}',
      '[data-theme="light"] .pdr-setup{color:#5b21b6}',
      '[data-theme="light"] .pdr-bar{background:rgba(0,0,0,.08)}',
      '@media(max-width:560px){.pdr-wrap{padding:14px 12px 96px}.pdr-modes{flex-direction:column}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function barColor(v) {
    if (v >= 65) return 'linear-gradient(90deg,#34d399,#10b981)';
    if (v >= 35) return 'linear-gradient(90deg,#fbbf24,#f59e0b)';
    return 'linear-gradient(90deg,#f87171,#ef4444)';
  }
  function barWord(v) {
    return v >= 80 ? 'разговаривает' : v >= 60 ? 'приоткрылся' : v >= 35 ? 'слушает вполуха'
         : v >= 15 ? 'закрыт' : 'сейчас уйдёт';
  }

  // ---------- Экран настройки ----------
  function home() {
    injectCSS(); loadPrefs();
    ST.dialog = []; ST.turn = 0; ST.notes = []; ST.hits = [];
    track('feature_opened', { feature: 'podrostok' });
    var c = container(); if (!c) return;
    var s = loadStats();
    c.innerHTML =
      '<div class="pdr-wrap">' +
        '<button class="pdr-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="pdr-h1">🚪 Разговор с подростком</div>' +
        '<div class="pdr-lead">Фреди сыграет вашего подростка. Вы пишете то, что сказали бы дома, — и сразу видите, открылась створка или захлопнулась. Пять вопросов закрывают разговор почти всегда, и узнаётся это не из статьи, а вот здесь, на второй реплике.</div>' +
        (s.plays ? '<div class="pdr-card" style="text-align:center">Разговоров: <b>' + s.plays + '</b>' + (s.best ? ' · лучший контакт: <b>' + s.best + '</b>' : '') + '</div>' : '') +

        '<div class="pdr-lbl">Кто</div>' +
        '<div class="pdr-chips">' +
          ['сын', 'дочь'].map(function (k) {
            return '<div class="pdr-chip' + (ST.kid === k ? ' on' : '') + '" onclick="PODR.setKid(\'' + k + '\')">' + k + '</div>'; }).join('') +
          [12, 13, 14, 15, 16, 17].map(function (a) {
            return '<div class="pdr-chip' + (ST.age === a ? ' on' : '') + '" onclick="PODR.setAge(' + a + ')">' + a + ' лет</div>'; }).join('') +
        '</div>' +

        '<div class="pdr-lbl">Что происходит</div>' +
        '<input class="pdr-in" id="pdrScene" placeholder="своя ситуация — одной строкой" value="' + esc(ST.scene) + '">' +
        '<div class="pdr-chips">' + SCENES.map(function (f) {
          return '<div class="pdr-chip" onclick="PODR.setScene(\'' + esc(f).replace(/'/g, "\\'") + '\')">' + esc(f) + '</div>'; }).join('') + '</div>' +

        '<div class="pdr-lbl">В каком он состоянии</div>' +
        '<div class="pdr-modes">' + MODE_ORDER.map(function (k) {
          return '<div class="pdr-mode' + (ST.mode === k ? ' on' : '') + '" onclick="PODR.setMode(\'' + k + '\')">' + MODES[k].em + ' ' + esc(MODES[k].name) + '</div>'; }).join('') + '</div>' +
        '<div class="pdr-modehint" id="pdrModeHint">' + esc(MODES[ST.mode].lead) + '</div>' +

        '<button class="pdr-primary" onclick="PODR.start()">Начать разговор →</button>' +
        '<div class="pdr-card" style="font-size:.88rem;color:#9ca3af">💡 Здесь нельзя выиграть. Подросток не обязан раскрыться, и тренажёр, который обещает обратное, учил бы неправде. Хороший исход — он остался и ответил не односложно.</div>' +
      '</div>';
  }

  function grab() {
    var e = document.getElementById('pdrScene');
    if (e) ST.scene = String(e.value || '').trim();
  }
  function setScene(v) { grab(); ST.scene = v; savePrefs(); home(); }
  function setKid(v) { grab(); ST.kid = v; savePrefs(); vibe(15); home(); }
  function setAge(v) { grab(); ST.age = v; savePrefs(); vibe(15); home(); }
  function setMode(k) { if (!MODES[k]) return; grab(); ST.mode = k; savePrefs(); vibe(20); home(); }

  function roleBrief() {
    var m = MODES[ST.mode];
    return 'Ты играешь роль подростка в разговоре с родителем. Тебе ' + ST.age + ' лет, ты ' +
      (ST.kid === 'дочь' ? 'девочка' : 'мальчик') + '. Твоё состояние: ' + m.who + '. ' + m.style +
      (ST.scene ? '\nЧто произошло: ' + ST.scene + '.' : '') +
      '\nПравила: отвечай ОДНОЙ репликой, одно-два предложения, живой речью подростка — без взрослых оборотов. ' +
      'Не рассказывай о себе больше, чем родитель заслужил своей репликой. Не будь ни психологом, ни примерным ребёнком. ' +
      'Мат, оскорбления и угрозы запрещены. Не описывай действия и не пиши ремарок — только то, что произносится вслух.';
  }

  // ============================================================
  // Разбор родительской реплики — локально и сразу.
  // ============================================================
  function judgeLine(raw) {
    var text = prep(raw);
    var hit = null, delta = 0;
    if (RUDE.rx.test(text)) { hit = { kind: 'bad', why: RUDE.why }; delta = -RUDE.cost; }
    if (!hit) {
      for (var i = 0; i < CLOSERS.length; i++) {
        if (CLOSERS[i].rx.test(text)) { hit = { kind: 'bad', why: CLOSERS[i].why }; delta = -CLOSERS[i].cost; break; }
      }
    }
    if (!hit) {
      for (var j = 0; j < OPENERS.length; j++) {
        if (OPENERS[j].rx.test(text)) { hit = { kind: 'good', why: OPENERS[j].why }; delta = OPENERS[j].gain; break; }
      }
    }
    // Длинная реплика без вопроса читается как нотация; короткая и
    // спокойная не двигает шкалу ни в какую сторону — и это нормально.
    if (!hit && String(raw).length > 420) {
      hit = { kind: 'bad', why: 'Длинная речь читается как лекция — он услышал только интонацию.' };
      delta = -6;
    }
    if (!hit) delta = (String(raw).indexOf('?') === -1) ? 2 : 0;
    return { hit: hit, delta: delta };
  }

  // ---------- Игра ----------
  async function start() {
    grab();
    savePrefs(); injectCSS();
    ST.dialog = []; ST.turn = 0; ST.notes = []; ST.hits = [];
    ST.contact = MODES[ST.mode].start; ST.busy = true;
    track('game_round_start', { feature: 'podrostok', mode: ST.mode });
    renderWaiting('Он у себя в комнате…');
    var line = '';
    try {
      var r = await aiGenerate(roleBrief() + '\n\nРодитель только что вошёл и ещё ничего не сказал. Скажи первую реплику — или короткое «чего?», если ты не настроен разговаривать.', { max_tokens: 90 });
      if (r && r.success && r.content) line = String(r.content).trim().replace(/^["«]|["»]$/g, '');
    } catch (e) {}
    if (!line) line = ST.mode === 'hard' ? 'Чего тебе?' : ST.mode === 'mid' ? 'Ну?' : 'Да?';
    ST.dialog.push({ who: 'them', text: line });
    ST.busy = false;
    render();
  }

  function renderWaiting(msg) {
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="pdr-wrap"><div class="pdr-h1" style="font-size:1.2rem">🚪 Разговор с подростком</div><div class="pdr-card">' + esc(msg) + '</div></div>';
  }

  function render() {
    var c = container(); if (!c) return;
    var m = MODES[ST.mode];
    var body = '';
    for (var i = 0; i < ST.dialog.length; i++) {
      var x = ST.dialog[i];
      if (x.who === 'them') body += '<div class="pdr-msg pdr-them">' + m.em + ' ' + esc(x.text) + '</div>';
      else {
        body += '<div class="pdr-msg pdr-me">🙂 ' + esc(x.text) + '</div>';
        if (x.fb) body += '<div class="pdr-fb ' + x.fb.kind + '">' + (x.fb.kind === 'bad' ? '↓ ' : '↑ ') + esc(x.fb.why) + '</div>';
      }
    }
    var over = ST.turn >= m.turns || ST.contact <= 0;
    var input = over
      ? '<button class="pdr-primary" onclick="PODR.finish()">Разговор окончен — разбор →</button>'
      : '<textarea class="pdr-ta" id="pdrTA" placeholder="Что вы скажете…"></textarea>' +
        '<button class="pdr-primary" id="pdrSend" onclick="PODR.send()">Сказать →</button>' +
        '<div class="pdr-row"><button class="pdr-secondary" onclick="PODR.hint()">💡 Что работает</button><button class="pdr-secondary" onclick="PODR.finish()">Закончить и разобрать</button></div>' +
        '<div id="pdrHint"></div>';
    c.innerHTML =
      '<div class="pdr-wrap">' +
        '<div class="pdr-top"><span>' + m.em + ' ' + esc(ST.kid) + ', ' + ST.age + ' лет · реплика ' + Math.min(ST.turn + 1, m.turns) + ' из ' + m.turns + '</span>' +
        '<button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="PODR.home()">✕ Выйти</button></div>' +
        '<div class="pdr-bar"><div class="pdr-fill" style="width:' + ST.contact + '%;background:' + barColor(ST.contact) + '"></div></div>' +
        '<div class="pdr-barlbl"><span>Контакт</span><span>' + esc(barWord(ST.contact)) + '</span></div>' +
        (ST.scene ? '<div class="pdr-setup">🎬 ' + esc(ST.scene) + '</div>' : '') +
        body + input +
      '</div>';
    try { var el = document.getElementById('pdrTA'); if (el) el.focus(); } catch (e) {}
  }

  function hint() {
    var box = document.getElementById('pdrHint'); if (!box) return;
    box.innerHTML = '<div class="pdr-hint"><b>Что открывает:</b><br>' +
      '· Рассказ о своём дне — без вопроса в конце.<br>' +
      '· Наблюдение вместо вопроса: «вижу, день был так себе».<br>' +
      '· Доступность без требования: «я на кухне, если что».<br>' +
      '· Разговор про внешнее — фильм, игру, чужую историю.<br>' +
      '· Признать свою неправоту первым.<br><br>' +
      '<b>Что закрывает:</b> «как дела», «что случилось», «почему ты так со мной разговариваешь», ' +
      '«а вот я в твои годы», «ты вообще понимаешь» — и ответная грубость, дороже всего остального.</div>';
  }

  function bankLine() {
    var pool = ST.contact >= 60 ? BANK.high : ST.contact >= 25 ? BANK.mid : BANK.low;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async function send() {
    if (ST.busy) return;
    var ta = document.getElementById('pdrTA');
    var text = ta ? String(ta.value || '').trim() : '';
    if (!text) { if (typeof window.showToast === 'function') window.showToast('Напишите, что бы вы сказали', 'info'); return; }

    var j = judgeLine(text);
    ST.contact = Math.max(0, Math.min(100, ST.contact + j.delta));
    if (j.hit) ST.hits.push(j.hit);
    ST.dialog.push({ who: 'me', text: text, fb: j.hit });
    ST.turn++;
    vibe(j.delta < 0 ? 30 : 15);

    var m = MODES[ST.mode];
    if (ST.turn >= m.turns || ST.contact <= 0) { render(); return; }
    ST.busy = true; render();
    var box = container();
    if (box) { var d = document.createElement('div'); d.className = 'pdr-card'; d.textContent = '…'; box.querySelector('.pdr-wrap').appendChild(d); }

    var line = '';
    try {
      var hist = ST.dialog.map(function (x) { return (x.who === 'them' ? 'Ты' : 'Родитель') + ': ' + x.text; }).join('\n');
      var state = ST.contact >= 60 ? 'Сейчас ты понемногу оттаял и готов сказать больше.'
                : ST.contact >= 25 ? 'Сейчас ты по-прежнему закрыт и отвечаешь коротко.'
                : 'Сейчас ты закрылся почти совсем и готов уйти.';
      var r = await aiGenerate(roleBrief() + '\n\nРазговор:\n' + hist + '\n\n' + state +
        '\nОтветь одной репликой — так, как ответил бы подросток в этом состоянии.', { max_tokens: 110 });
      if (r && r.success && r.content) line = String(r.content).trim().replace(/^["«]|["»]$/g, '');
    } catch (e) {}
    if (!line) line = bankLine();
    ST.dialog.push({ who: 'them', text: line });
    ST.busy = false;
    render();
  }

  // Склонение при числе: без него разбор писал «Сработало 2 реплик».
  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  // Локальный разбор — если ИИ недоступен. Опирается на то, что
  // посчитано по ходу: какие ходы сработали и куда пришла шкала.
  function localVerdict() {
    var bad = ST.hits.filter(function (h) { return h.kind === 'bad'; });
    var good = ST.hits.filter(function (h) { return h.kind === 'good'; });
    var n = [];
    if (!bad.length && !good.length) n.push('Реплики были ровные и ни разу не закрыли разговор — это уже немало. Следующий шаг: добавить рассказ о себе, без вопроса в конце.');
    if (good.length) n.push('Сработало ' + good.length + ' ' + plural(good.length, 'реплика', 'реплики', 'реплик') + ': ' + good[0].why);
    if (bad.length) n.push('Закрывало ' + bad.length + ' ' + plural(bad.length, 'раз', 'раза', 'раз') + '. Самое дорогое: ' + bad[0].why);
    if (ST.contact >= 60) n.push('К концу разговора он отвечал длиннее, чем в начале, — в жизни это и есть результат одного вечера.');
    else if (ST.contact <= 10) n.push('Контакт ушёл в ноль. Это не провал: так и выглядит вечер, когда разговор начинают с вопроса о состоянии.');
    return n.join(' ');
  }

  async function finish() {
    if (ST.busy) return; ST.busy = true;
    renderWaiting('Фреди перечитывает разговор…');
    var transcript = ST.dialog.map(function (x) { return (x.who === 'them' ? 'Подросток' : 'Родитель') + ': «' + x.text + '»'; }).join('\n');
    var verdict = '';
    try {
      var r = await aiGenerate('Ты — Фреди, помогаешь родителю разговаривать с подростком. Родитель только что провёл тренировочный разговор с ' +
        ST.kid + (ST.age ? ' ' + ST.age + ' лет' : '') + (ST.scene ? '. Ситуация: ' + ST.scene : '') + '.\n' +
        'Расшифровка:\n' + transcript +
        '\n\nРазбери реплики РОДИТЕЛЯ. Ответь по-русски, на «вы», 4–5 короткими пунктами: что открыло разговор; ' +
        'что его закрыло и почему именно; и обязательно — ОДНА реплика родителя, переписанная так, как стоило бы сказать. ' +
        'Без нотаций, без «важно принять свои чувства» и без общих советов. Не хвали за смелость.', { max_tokens: 480 });
      if (r && r.success && r.content) verdict = String(r.content).trim();
    } catch (e) {}
    if (!verdict) verdict = localVerdict();
    ST.busy = false;

    var s = loadStats(); s.plays = (s.plays || 0) + 1;
    if (!s.best || ST.contact > s.best) s.best = ST.contact; saveStats(s);
    if (ST.contact >= 70) vibe([40, 40, 40]);
    var line = ST.contact >= 75 ? 'Он разговаривал — это и есть результат'
             : ST.contact >= 50 ? 'Приоткрылся. За один вечер это много'
             : ST.contact >= 25 ? 'Остался, но не открылся'
             : 'Створка захлопнулась — и видно, на какой реплике';

    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pdr-wrap">' +
        '<div class="pdr-h1" style="font-size:1.2rem">🚪 Разбор</div>' +
        '<div class="pdr-bar"><div class="pdr-fill" style="width:' + ST.contact + '%;background:' + barColor(ST.contact) + '"></div></div>' +
        '<div class="pdr-barlbl"><span>Контакт к концу</span><span>' + ST.contact + ' · ' + esc(barWord(ST.contact)) + '</span></div>' +
        '<div class="pdr-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        '<div class="pdr-verdict">💬 ' + esc(verdict).replace(/\n/g, '<br>') + '</div>' +
        '<div class="pdr-card" style="font-size:.9rem;color:#9ca3af">💡 Перенос в жизнь: одна история про свой день, каждый день, без вопроса в конце — и разговор бок о бок, а не лицом к лицу. Машина работает лучше кухни.</div>' +
        '<div class="pdr-row"><button class="pdr-primary" onclick="PODR.start()" style="margin:0">🔁 Ещё раз</button><button class="pdr-secondary" onclick="PODR.home()">Другая ситуация</button></div>' +
      '</div>';
    try { var el = document.getElementById('screenContainer'); if (el) el.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'podrostok', mode: ST.mode, contact: ST.contact, turns: ST.turn });
  }

  window.PODR = { home: home, setMode: setMode, setScene: setScene, setKid: setKid, setAge: setAge,
                  start: start, send: send, hint: hint, finish: finish, getState: function () { return ST; } };
  window.showPodrostokGame = home;
  console.log('✅ podrostok.js loaded (игра «Разговор с подростком»)');
})();
