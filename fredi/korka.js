// ============================================
// korka.js — Игра «Короли и капуста» (Анчурия).
// Одиночный симулятор нетворкинга и чтения людей по мотивам настолки из
// «Школы Достигатора» (сессия «Харизма»). Ты карабкаешься по карьерной
// лестнице банановой республики Анчурия — не выслугой, а ПОДДЕРЖКОЙ других.
// Каждый человек — скрытый тип с своей «валютой» мотивации:
//   📚 Умный-и-бедный (признание), 🌾 Фермер (выгода), 💪 Силовик (сила),
//   🦊 Проныра (связи). Читай тип, оказывай услуги в его валюте, копи доверие,
//   и лишь потом проси поддержку. Верх открывает личная поддержка покровителя.
// Урок: у каждого своя валюта; давай раньше, чем просишь; связи — это капитал.
// Финал — разбор от Фреди: крантехник, служака или напролом.
// Экспорт: window.showKorkaGame, window.KORKA
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || ''; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function ri(n) { return Math.floor(Math.random() * n); }
  function rpick(a) { return a[ri(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = ri(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 480, temperature: opts.temperature == null ? 0.6 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ---------- четыре типа людей (скрытая «валюта» мотивации) ----------
  var ARCH = {
    ub:  { id: 'ub',  name: 'Умный-и-бедный', em: '📚', value: 'recognition', valueName: 'признание', askT: 55,
           tell: 'жаждет уважения и оценки, работает на других и себя недооценивает — купается в признании' },
    tf:  { id: 'tf',  name: 'Трудяга-Фермер', em: '🌾', value: 'material', valueName: 'конкретная выгода', askT: 60,
           tell: 'ценит собственность и стабильность, верит делам, а не словам — платит услугой за услугу' },
    sb:  { id: 'sb',  name: 'Силовик', em: '💪', value: 'power', valueName: 'сила и польза его власти', askT: 66,
           tell: 'уважает только силу; договориться можно, лишь став полезным его власти' },
    chv: { id: 'chv', name: 'Хитрый Проныра', em: '🦊', value: 'connection', valueName: 'связи и возможности', askT: 46,
           tell: 'ищет ходы и нужные знакомства, легко идёт на обмен «ты — мне, я — тебе»' }
  };
  // Услуга, которая ГРУБО не в валюту типа, — оскорбляет (роняет доверие).
  var INSULT = { ub: 'power', tf: 'connection', sb: 'recognition', chv: 'recognition' };
  var INSULT_MSG = {
    ub: 'счёл грубую силу за хамство — тонкая натура оскорблена',
    tf: 'отмахнулся: «мне твои знакомства ни к чему, ты делом помоги»',
    sb: 'принял похвалу за слабость и заискивание — презрительно поморщился',
    chv: 'раскусил пустую лесть насквозь — проныру так не купишь'
  };
  var FAVORS = [
    { id: 'recognition', name: 'Признание', em: '🎖️', desc: 'публично похвалить, поднять статус' },
    { id: 'material',    name: 'Услуга делом', em: '💰', desc: 'конкретная материальная помощь' },
    { id: 'power',       name: 'Плечо его власти', em: '🛡️', desc: 'подставиться на пользу его силе' },
    { id: 'connection',  name: 'Свести с нужным', em: '🔗', desc: 'дать выход на человека или информацию' }
  ];

  // ---------- касты (секторы) и лестница игрока ----------
  var SECTORS = {
    orange: { id: 'orange', name: 'Оранжевые', em: '🟠', theme: 'интеллигенция, наука, культура', broker: 'attache',
      note: 'Умные-и-бедные: много ума, много самоограничений. Ценят признание.' },
    blue:   { id: 'blue',   name: 'Синие', em: '🔵', theme: 'силовики, порядок и криминал', broker: 'bandito',
      note: 'Беспредельщики: мало тормозов. Ценят силу и власть.' },
    green:  { id: 'green',  name: 'Зелёные', em: '🟢', theme: 'деньги, бизнес и связи', broker: 'gomez',
      note: 'Хитрые Проныры: обходят барьеры. Ценят возможности и связи.' }
  };
  var LADDERS = {
    orange: ['Блестящий студент', 'Молодой преподаватель', 'Театральный критик', 'Атташе по культуре', 'Ректор университета', 'Министр культуры и науки'],
    blue:   ['Мелкая шпана', 'Шериф', 'Следователь', 'Начальник участка', 'Шеф уголовного сыска', 'Министр юстиции'],
    green:  ['Официант', 'Хозяин лавки', 'Хозяин мастерской', 'Плантатор', 'Президент банка', 'Министр финансов и коммерции']
  };

  // ---------- персонажи (архетипы у покровителей фиксированы, у прочих случайны) ----------
  var CAST = [
    { id: 'pablo',   name: 'Дон Пабло, лавочник', sector: 'green', level: 1 },
    { id: 'espe',    name: 'Донья Эсперанса', sector: 'green', level: 2 },
    { id: 'ortega',  name: 'Плантатор Ортега', sector: 'green', level: 4 },
    { id: 'gomez',   name: 'Сеньор Гомес, «Гомес и Гомес»', sector: 'green', level: 6, broker: true, arch: 'chv' },
    { id: 'chico',   name: 'Чико из подворотни', sector: 'blue', level: 1 },
    { id: 'vega',    name: 'Шериф Вега', sector: 'blue', level: 2 },
    { id: 'diaz',    name: 'Следователь Диас', sector: 'blue', level: 3 },
    { id: 'cruz',    name: 'Полковник Крус', sector: 'blue', level: 4 },
    { id: 'bandito', name: 'Эль Бандито Магнифико', sector: 'blue', level: 6, broker: true, arch: 'sb' },
    { id: 'luis',    name: 'Студент Луис', sector: 'orange', level: 1 },
    { id: 'mendoza', name: 'Критик Мендоса', sector: 'orange', level: 3 },
    { id: 'salazar', name: 'Профессор Салазар', sector: 'orange', level: 4 },
    { id: 'attache', name: 'Атташе Рамирес (по культуре)', sector: 'orange', level: 5, broker: true, arch: 'ub' }
  ];

  var MAXTURN = 18, ACTS = 2;
  function promoReq(level) {
    if (level >= 5) return { broker: true, same: 1, n: 2, text: 'личная поддержка твоего покровителя + один из своей касты' };
    var m = { 1: { n: 1, same: 0 }, 2: { n: 2, same: 1 }, 3: { n: 2, same: 2 }, 4: { n: 2, same: 2 } };
    var r = m[level] || { n: 2, same: 1 };
    r.text = r.n + ' поддержки' + (r.same ? ' (из них ' + r.same + ' — своей касты)' : '');
    return r;
  }

  var ST = null;

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('kk_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, wins: 0, best: 0 }; }
  function saveStats(s) { try { localStorage.setItem('kk_stats', JSON.stringify(s)); } catch (e) {} }

  function newGame(sector) {
    var archPool = shuffle(['ub', 'tf', 'sb', 'chv', 'ub', 'tf', 'sb', 'chv', 'chv', 'ub']);
    var ai = 0;
    var npcs = CAST.map(function (c) {
      var arch = c.arch || archPool[ai++ % archPool.length];
      return { id: c.id, name: c.name, sector: c.sector, level: c.level, broker: !!c.broker,
        arch: arch, trust: c.broker ? 18 : (26 + ri(16)), balance: 0, pledged: false, known: false, hunch: null, met: false };
    });
    return {
      sector: sector, level: 1, turn: 1, actsLeft: ACTS, phase: 'status', over: false, won: false,
      npcs: npcs, grind: 0, grindTotal: 0,
      favorsGiven: 0, asksOk: 0, asksFailed: 0, matched: 0, mism: 0, insults: 0, reads: 0, archKnown: 0,
      msg: '', log: []
    };
  }

  function brokerId() { return SECTORS[ST.sector].broker; }
  function npcById(id) { for (var i = 0; i < ST.npcs.length; i++) if (ST.npcs[i].id === id) return ST.npcs[i]; return null; }

  function canPromote() {
    var lvl = ST.level, req = promoReq(lvl);
    var pledged = ST.npcs.filter(function (n) { return n.pledged; });
    var same = pledged.filter(function (n) { return n.sector === ST.sector; });
    var brokerP = pledged.some(function (n) { return n.id === brokerId(); });
    var ok;
    if (req.broker) { ok = brokerP && same.filter(function (n) { return !n.broker; }).length >= req.same; }
    else { ok = pledged.length >= req.n && same.length >= (req.same || 0); }
    return { ok: ok, req: req, total: pledged.length, same: same.length, brokerP: brokerP };
  }

  // ============================================================
  // РЕНДЕР
  // ============================================================
  function injectCSS() {
    if (document.getElementById('kkCSS')) return;
    var s = document.createElement('style'); s.id = 'kkCSS';
    s.textContent = [
      '.kk-wrap{max-width:680px;margin:0 auto;padding:16px 14px 96px;color:#eef1f6}',
      '.kk-h1{font-size:1.4rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.kk-lead{font-size:.97rem;line-height:1.6;color:#c3c9d6;margin-bottom:14px}',
      '.kk-ghost{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:6px 0;margin-bottom:8px}',
      '.kk-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:13px 15px;margin:0 0 11px;line-height:1.55}',
      '.kk-ch{font-weight:700;margin-bottom:7px}',
      '.kk-top{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#c3c9d6;font-size:.9rem;margin:0 0 10px;flex-wrap:wrap}',
      '.kk-stat{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:4px 11px;font-weight:600;font-size:.85rem}',
      '.kk-stat b{font-weight:800;color:#fff}',
      '.kk-fac{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:13px;padding:12px 14px;margin:0 0 9px;color:#eef1f6;cursor:pointer;font-size:.98rem}',
      '.kk-fac:hover{border-color:rgba(240,180,75,.6)}.kk-fac small{display:block;color:#9ca3af;font-size:.82rem;margin-top:3px}',
      '.kk-ladder{display:flex;gap:4px;margin:0 0 12px}',
      '.kk-rung{flex:1;text-align:center;font-size:.66rem;color:#9ca3af;padding:6px 2px;border-radius:8px;border:1px solid rgba(255,255,255,.08);line-height:1.2}',
      '.kk-rung.done{background:rgba(240,180,75,.14);border-color:rgba(240,180,75,.4);color:#ffe6b8}',
      '.kk-rung.cur{background:rgba(240,180,75,.28);border-color:#f0b45b;color:#fff;font-weight:700}',
      '.kk-npc{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.025);border-radius:12px;padding:10px 12px;margin:0 0 8px}',
      '.kk-npc .nr{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:.92rem}',
      '.kk-npc .nm{font-weight:600}',
      '.kk-npc small{display:block;color:#9ca3af;font-size:.78rem;margin-top:3px;line-height:1.4}',
      '.kk-npc.pl{border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.07)}',
      '.kk-tbar{height:6px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:6px}',
      '.kk-tbar>i{display:block;height:100%;background:linear-gradient(90deg,#f0b45b,#34d399);transition:width .4s}',
      '.kk-trust{display:inline-block;font-size:.7rem;padding:1px 7px;border-radius:20px;margin-left:6px}',
      '.kk-primary{display:block;width:100%;border:none;border-radius:13px;padding:14px;font-size:1rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#d99a3a,#c2683a);box-shadow:0 8px 20px rgba(217,154,58,.3);margin:6px 0 10px}',
      '.kk-primary[disabled]{opacity:.5;cursor:default;box-shadow:none}',
      '.kk-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:12px;padding:12px;font-size:.92rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 9px}',
      '.kk-act{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:12px;padding:11px 13px;margin:0 0 8px;color:#eef1f6;cursor:pointer;font-size:.92rem}',
      '.kk-act:hover{border-color:rgba(240,180,75,.55)}.kk-act small{display:block;color:#9ca3af;font-size:.78rem;margin-top:3px}',
      '.kk-msg{border:1px solid rgba(56,189,248,.34);background:rgba(56,189,248,.08);border-radius:12px;padding:10px 13px;margin:0 0 11px;font-size:.9rem;line-height:1.5;color:#bae6fd;min-height:1px}',
      '.kk-goal{border:1px solid rgba(240,180,75,.4);background:rgba(240,180,75,.08);border-radius:11px;padding:10px 13px;margin:0 0 10px;font-size:.9rem;color:#ffe6b8}',
      '.kk-verdict{border:1px solid rgba(240,180,75,.4);background:linear-gradient(135deg,rgba(240,180,75,.12),rgba(194,104,58,.05));border-radius:13px;padding:13px 15px;margin:0 0 11px;line-height:1.6;font-size:.94rem}',
      '.kk-big{text-align:center;font-size:1.32rem;font-weight:800;margin:2px 0 4px;color:#f0b45b}',
      '.kk-mini{font-size:.8rem;color:#9ca3af;margin:0 0 6px}',
      '.kk-li{margin:6px 0;line-height:1.5;font-size:.92rem}',
      '.kk-row{display:flex;gap:9px}.kk-row>*{flex:1;margin-bottom:0}',
      '.kk-warn{color:#fca5a5}.kk-good{color:#a7f3d0}.kk-neu{color:#fcd34d}',
      '.kk-chip{display:inline-block;border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:5px 11px;margin:0 6px 6px 0;font-size:.84rem;cursor:pointer;color:#e5e7eb}',
      '.kk-chip:hover{border-color:#d99a3a}',
      '[data-theme="light"] .kk-wrap{color:#1f2430}',
      '[data-theme="light"] .kk-lead{color:#4b5566}',
      '[data-theme="light"] .kk-card,[data-theme="light"] .kk-npc{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .kk-secondary,[data-theme="light"] .kk-fac,[data-theme="light"] .kk-act{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.kk-wrap{padding:12px 9px 100px}.kk-rung{font-size:.6rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function trustChip(t) {
    var col = t >= 66 ? 'rgba(52,211,153,.95);background:rgba(52,211,153,.14)' : t >= 40 ? 'rgba(252,211,77,.95);background:rgba(252,211,77,.12)' : 'rgba(248,113,113,.95);background:rgba(248,113,113,.14)';
    return '<span class="kk-trust" style="color:' + col + '">доверие ' + t + '</span>';
  }
  function balChip(b) {
    if (b > 0) return '<span class="kk-mini kk-good" style="display:inline;margin:0 0 0 6px">он тебе должен +' + b + '</span>';
    if (b < 0) return '<span class="kk-mini kk-warn" style="display:inline;margin:0 0 0 6px">ты должен ' + b + '</span>';
    return '';
  }

  // ---------- главный экран ----------
  function home() {
    injectCSS(); ST = null;
    track('feature_opened', { feature: 'korka' });
    var c = container(); if (!c) return;
    var st = loadStats();
    c.innerHTML =
      '<div class="kk-wrap">' +
        '<button class="kk-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="kk-h1">👑 Короли и капуста</div>' +
        '<div class="kk-lead">Банановая республика Анчурия. Ты — никто, и звать никак, но метишь наверх. Беда в том, что <b>карьеру тут делают не выслугой, а поддержкой нужных людей</b>. А чтобы человек тебя поддержал, надо понять, чем он живёт, и <b>оказать услугу в его валюте</b>.<br><br>У каждого своя валюта мотивации: 📚 одному важно <b>признание</b>, 🌾 другому — <b>конкретная выгода</b>, 💪 третьему — <b>сила</b>, 🦊 четвёртому — <b>связи</b>. Читай людей, копи доверие, <b>давай раньше, чем просишь</b> — и лишь потом зови их за собой наверх. В финале Фреди разберёт, каким ты был: крантехником связей, служакой или тем, кто прёт напролом.</div>' +
        (st.plays ? '<div class="kk-card" style="text-align:center">Партий: <b>' + st.plays + '</b> · добрался до верха: <b>' + (st.wins || 0) + '</b> · рекорд уровня: <b>' + (st.best || 0) + '</b>/6</div>' : '') +
        '<button class="kk-secondary" onclick="KORKA.rules()">📖 Как играть: типы людей, услуги, поддержка</button>' +
        '<div class="kk-ch" style="margin:8px 0 9px">В какой касте начинаешь путь наверх:</div>' +
        Object.keys(SECTORS).map(function (k) {
          var s = SECTORS[k];
          return '<button class="kk-fac" onclick="KORKA.begin(\'' + k + '\')">' + s.em + ' <b>' + esc(s.name) + '</b> <span style="color:#9ca3af;font-size:.8rem">' + esc(s.theme) + '</span><small>' + esc(s.note) + ' Путь: от «' + esc(LADDERS[k][0]) + '» до «' + esc(LADDERS[k][5]) + '».</small></button>';
        }).join('') +
        '<div class="kk-card" style="font-size:.85rem;color:#9ca3af">💡 Тренажёр социального капитала: читать скрытые мотивы людей, говорить с каждым на его языке, строить сеть связей и отличать «дать, чтобы потом попросить» от «сесть на шею». Перенос в жизнь — прямой.</div>' +
      '</div>';
  }

  function rules() {
    injectCSS(); var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="kk-wrap">' +
        '<button class="kk-ghost" onclick="KORKA.home()">← Назад</button>' +
        '<div class="kk-h1" style="font-size:1.22rem">Как играть</div>' +
        '<div class="kk-card"><div class="kk-ch">Цель</div>Подняться с 1-го до 6-го уровня своей касты за ' + MAXTURN + ' месяцев. Двигаешься вверх, когда собрал нужную <b>поддержку</b> людей. Верхнюю ступень открывает <b>личная поддержка покровителя</b> (Сеньор Гомес у Зелёных, Эль Бандито у Синих, Атташе у Оранжевых).</div>' +
        '<div class="kk-card"><div class="kk-ch">Четыре типа людей</div>У каждого своя «валюта» мотивации:' +
          Object.keys(ARCH).map(function (k) { var a = ARCH[k]; return '<div class="kk-li">' + a.em + ' <b>' + a.name + '</b> — ценит ' + a.valueName + '.</div>'; }).join('') +
          '<div class="kk-mini" style="margin-top:6px">Тип скрыт — его надо вычислить, «прощупав» человека.</div></div>' +
        '<div class="kk-card"><div class="kk-ch">Ход месяца — 2 действия</div>' +
          '🔎 <b>Прощупать</b> — узнать тип человека. Доверие высоко — узнаёшь <b>точно</b>; низко — получишь лишь <b>догадку</b>, которая может оказаться ложной. Прощупай ещё, чтобы знать наверняка.<br>' +
          '🎁 <b>Оказать услугу</b> — выбираешь вид услуги. Попал в валюту — доверие взлетает, он «тебе должен». Мимо — доверие подрастёт чуть-чуть. А грубо <b>не в ту</b> валюту — <b>оскорбишь</b>, и доверие упадёт. Поэтому сперва читай человека, а не действуй по догадке.<br>' +
          '🤝 <b>Позвать за собой</b> (попросить поддержку) — согласится, если доверие высоко <b>и ты уже дал больше, чем взял</b>. Просишь, не дав, — «сядешь на шею» и всё испортишь.</div>' +
        '<div class="kk-card"><div class="kk-ch">Главные правила связей</div>• <b>Давай раньше, чем просишь</b> (3–4 услуги на 1 просьбу).<br>• <b>Говори на языке человека</b> — услуга должна попасть в его валюту.<br>• Покровители — крепкий орешек: доверие набирается тяжело, но их поддержка открывает верх.</div>' +
        '<div class="kk-card"><div class="kk-ch">Выслуга</div>Можно ползти вверх и «по выслуге» — просто пережидая месяцы. Но это <b>медленно</b> (3 месяца на ступень) и почти наверняка не успеешь. Связи быстрее силы и терпения.</div>' +
        '<button class="kk-primary" onclick="KORKA.home()">Выбрать касту →</button>' +
      '</div>';
  }

  function begin(sector) {
    injectCSS(); ST = newGame(sector);
    track('game_round_start', { feature: 'korka', sector: sector });
    ST.msg = 'Ты — «' + LADDERS[sector][0] + '». Знакомься с людьми, читай их, оказывай услуги — и зови наверх.';
    render();
  }

  function render() {
    if (!ST) return;
    if (ST.phase === 'end') return;
    renderStatus();
  }

  function ladderHTML() {
    return '<div class="kk-ladder">' + LADDERS[ST.sector].map(function (t, i) {
      var lv = i + 1, cls = lv < ST.level ? 'done' : lv === ST.level ? 'cur' : '';
      return '<div class="kk-rung ' + cls + '">' + lv + '<br>' + esc(t.split(' ')[0]) + '</div>';
    }).join('') + '</div>';
  }

  function npcHTML(n, idx) {
    var arch = ARCH[n.arch];
    var info = n.known ? arch.em + ' <b>' + arch.name + '</b> — ценит ' + arch.valueName
      : n.hunch ? '<span style="color:#fcd34d">🤔 предположительно ' + ARCH[n.hunch].em + ' ' + ARCH[n.hunch].name + ' — не точно</span>'
      : '<span style="color:#9ca3af">тип пока не разгадан</span>';
    return '<div class="kk-npc' + (n.pledged ? ' pl' : '') + '">' +
      '<div class="nr"><span class="nm">' + SECTORS[n.sector].em + ' ' + esc(n.name) + (n.broker ? ' <span style="color:#f0b45b;font-size:.72rem">★ покровитель</span>' : '') + '</span>' +
        '<span style="color:#9ca3af;font-size:.76rem">ур. ' + n.level + '</span></div>' +
      '<small>' + info + trustChip(n.trust) + balChip(n.balance) + (n.pledged ? ' <span class="kk-good" style="font-size:.78rem">✓ за тебя</span>' : '') + '</small>' +
      '<div class="kk-tbar"><i style="width:' + n.trust + '%"></i></div></div>';
  }

  function renderStatus() {
    var c = container(); if (!c) return;
    var cp = canPromote();
    var ladderTitle = LADDERS[ST.sector][ST.level - 1];
    var promoLine = ST.level >= 6 ? '' :
      '<div class="kk-goal">⬆️ <b>Повышение до «' + esc(LADDERS[ST.sector][ST.level]) + '»:</b> нужно ' + esc(cp.req.text) + '.<br>' +
        '<span class="kk-mini" style="display:inline">Сейчас за тебя: <b>' + cp.total + '</b>' + (cp.req.same ? ' · своей касты: <b>' + cp.same + '/' + cp.req.same + '</b>' : '') + (cp.req.broker ? ' · покровитель: <b>' + (cp.brokerP ? '✓' : '—') + '</b>' : '') + '</span></div>';
    c.innerHTML =
      '<div class="kk-wrap">' +
        '<div class="kk-top">' +
          '<span class="kk-stat">' + SECTORS[ST.sector].em + ' <b>' + esc(ladderTitle) + '</b></span>' +
          '<span class="kk-stat">📅 месяц <b>' + ST.turn + '/' + MAXTURN + '</b></span>' +
          '<span class="kk-stat">🎬 действий <b>' + ST.actsLeft + '</b></span>' +
          '<button style="background:none;border:none;color:#8b93a7;font-size:.85rem;cursor:pointer;padding:0" onclick="KORKA.home()">✕ Выйти</button>' +
        '</div>' +
        '<div class="kk-msg">' + (ST.msg ? esc(ST.msg) : '&nbsp;') + '</div>' +
        ladderHTML() +
        promoLine +
        (cp.ok && ST.level < 6 ? '<button class="kk-primary" onclick="KORKA.promote()">⬆️ Продвинуться до «' + esc(LADDERS[ST.sector][ST.level]) + '»!</button>' : '') +
        '<div class="kk-ch" style="margin-top:4px">Кулуары <span style="color:#9ca3af;font-weight:400;font-size:.85rem">— действий осталось: ' + ST.actsLeft + '</span></div>' +
        (ST.actsLeft > 0
          ? '<button class="kk-act" onclick="KORKA.pick(\'read\')">🔎 Прощупать человека<small>Узнать его тип и валюту мотивации. Чем выше доверие — тем честнее ответ.</small></button>' +
            '<button class="kk-act" onclick="KORKA.pick(\'favor\')">🎁 Оказать услугу<small>Говори на его языке: попал в валюту — доверие растёт, и он твой должник.</small></button>' +
            '<button class="kk-act" onclick="KORKA.pick(\'ask\')">🤝 Позвать за собой<small>Попросить поддержку. Согласится, если доверяет и ты уже дал больше, чем взял.</small></button>'
          : '<div class="kk-card" style="color:#9ca3af;font-size:.88rem">Действия на этот месяц исчерпаны.</div>') +
        '<div id="kkSub"></div>' +
        '<div class="kk-ch" style="margin-top:12px">Твоя Копилка связей</div>' +
        ST.npcs.slice().sort(function (a, b) { return b.trust - a.trust; }).map(npcHTML).join('') +
        '<div class="kk-row" style="margin-top:6px">' +
          '<button class="kk-secondary" style="margin:0" onclick="KORKA.vysluga()">⏳ Ждать выслугу (−месяц)</button>' +
          '<button class="kk-primary" style="margin:0" onclick="KORKA.nextMonth()">Следующий месяц →</button>' +
        '</div>' +
      '</div>';
    try { c.scrollTop = 0; } catch (e) {}
  }

  // ---------- выбор персонажа ----------
  function pick(kind) {
    var box = document.getElementById('kkSub'); if (!box) return;
    if (ST.actsLeft <= 0) { box.innerHTML = ''; return; }
    var titles = { read: '🔎 Кого прощупать', favor: '🎁 Кому оказать услугу', ask: '🤝 Кого позвать за собой' };
    var html = '<div class="kk-card"><div class="kk-ch">' + titles[kind] + '</div>';
    ST.npcs.forEach(function (n, fi) {
      html += '<button class="kk-act" onclick="KORKA.choose(\'' + kind + '\',' + fi + ')">' + SECTORS[n.sector].em + ' <b>' + esc(n.name) + '</b>' + (n.broker ? ' ★' : '') + trustChip(n.trust) + (n.known ? ' <span style="font-size:.74rem;color:#9ca3af">' + ARCH[n.arch].em + '</span>' : '') + '</button>';
    });
    html += '<button class="kk-secondary" onclick="document.getElementById(\'kkSub\').innerHTML=\'\'">Отмена</button></div>';
    box.innerHTML = html;
  }

  function choose(kind, fi) {
    if (kind === 'favor') return favorMenu(fi);
    if (kind === 'read') return doRead(fi);
    if (kind === 'ask') return doAsk(fi);
  }

  function favorMenu(fi) {
    var box = document.getElementById('kkSub'); if (!box) return;
    var n = ST.npcs[fi];
    var guide = n.known
      ? 'Ты знаешь точно: ' + ARCH[n.arch].em + ' ценит «' + ARCH[n.arch].valueName + '». Попади в валюту.'
      : n.hunch
        ? '🤔 Только догадка (можешь ошибаться): похоже, ценит «' + ARCH[n.hunch].valueName + '». Промажешь мимо типа — рискуешь <b>оскорбить</b> и уронить доверие.'
        : 'Тип не разгадан — угадываешь вслепую. Грубо не в ту валюту — <b>оскорбишь</b>. Лучше сперва прощупать.';
    var html = '<div class="kk-card"><div class="kk-ch">🎁 Услуга: ' + esc(n.name) + '</div>' +
      '<div class="kk-mini">' + guide + '</div><div style="margin-top:6px">';
    FAVORS.forEach(function (f) { html += '<span class="kk-chip" onclick="KORKA.favor(' + fi + ',\'' + f.id + '\')">' + f.em + ' ' + f.name + '</span>'; });
    html += '</div><button class="kk-secondary" style="margin-top:6px" onclick="document.getElementById(\'kkSub\').innerHTML=\'\'">Отмена</button></div>';
    box.innerHTML = html;
  }

  // ---------- действия ----------
  function doRead(fi) {
    if (ST.actsLeft <= 0) return;
    var n = ST.npcs[fi]; n.met = true;
    var reliable = Math.random() < (0.4 + n.trust / 160);
    var out;
    if (!n.known && reliable) {
      n.known = true; n.hunch = null; ST.archKnown++;
      out = '✅ Пригляделся и понял точно: «' + n.name + '» — ' + ARCH[n.arch].em + ' <b>' + ARCH[n.arch].name + '</b>. ' + ARCH[n.arch].tell + '. Его валюта — «' + ARCH[n.arch].valueName + '».';
    } else if (n.known) {
      out = 'Ты и так знаешь: ' + ARCH[n.arch].em + ' ' + ARCH[n.arch].name + ' (ценит «' + ARCH[n.arch].valueName + '»). Доверие чуть подросло.';
    } else {
      // ненадёжное прочтение → ДОГАДКА, которая может оказаться ложной
      var correct = Math.random() < 0.55;
      n.hunch = correct ? n.arch : rpick(['ub', 'tf', 'sb', 'chv'].filter(function (a) { return a !== n.arch; }));
      out = '🤔 Толком не разобрал. По первому впечатлению — вроде ' + ARCH[n.hunch].em + ' <b>' + ARCH[n.hunch].name + '</b> (ценит «' + ARCH[n.hunch].valueName + '»). Но это лишь догадка, можешь и ошибаться. Подними доверие и прощупай ещё, чтобы знать наверняка.';
    }
    n.trust = clamp(n.trust + 2, 0, 100); ST.reads++;
    spend(out); vibe(10);
  }

  function favor(fi, ftype) {
    if (ST.actsLeft <= 0) return;
    var n = ST.npcs[fi], f = FAVORS.filter(function (x) { return x.id === ftype; })[0];
    var match = ftype === ARCH[n.arch].value;
    var insult = ftype === INSULT[n.arch];
    ST.favorsGiven++;
    var out;
    if (match) {
      n.trust = clamp(n.trust + 18, 0, 100); n.balance += 1; ST.matched++;
      out = '🎯 «' + n.name + '» ' + f.em + ' — ты попал в самую его валюту! Он растроган, доверие взлетело, и теперь он твой должник.';
    } else if (insult) {
      n.trust = clamp(n.trust - 12, 0, 100); ST.mism++; ST.insults++;
      out = '😠 Осечка! ' + f.em + ' «' + n.name + '» ' + INSULT_MSG[n.arch] + '. Доверие упало — ты неверно прочёл человека.';
    } else {
      n.trust = clamp(n.trust + 3, 0, 100); n.balance += 1; ST.mism++;
      out = f.em + ' Услуга принята, «' + n.name + '» вежливо благодарен, но это не его валюта — доверие подросло чуть-чуть.';
    }
    spend(out); vibe(insult ? 25 : 12);
  }

  function doAsk(fi) {
    if (ST.actsLeft <= 0) return;
    var n = ST.npcs[fi];
    if (n.pledged) { spend('«' + n.name + '» и так уже за тебя. Не дёргай понапрасну.'); return; }
    var need = ARCH[n.arch].askT + (n.broker ? 12 : 0);
    if (n.balance >= 1 && n.trust >= need) {
      n.pledged = true; n.balance -= 1; n.trust = clamp(n.trust - 3, 0, 100); ST.asksOk++;
      spend('🤝 «' + n.name + '» согласен поддержать твоё продвижение! ' + (n.broker ? 'Покровитель за тебя — это дорогого стоит.' : 'Он в твоём кармане.'));
    } else {
      var why = n.balance < 1 ? 'ты ещё не дал ему повода — просишь, не оказав услуг. «Сел на шею» — это моветон.' : 'мало доверия, чтобы связываться (нужно ~' + need + ').';
      n.trust = clamp(n.trust - 8, 0, 100); ST.asksFailed++;
      spend('✋ «' + n.name + '» уклонился: ' + why + ' Доверие просело.');
    }
    vibe(12);
  }

  function spend(msg) {
    ST.msg = msg; ST.actsLeft--;
    var box = document.getElementById('kkSub');
    if (box) box.innerHTML = '<div class="kk-card">' + esc(msg).replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>') + '<button class="kk-secondary" style="margin-top:10px" onclick="KORKA.render()">Дальше</button></div>';
    else render();
  }

  // ---------- продвижение ----------
  function promote() {
    var cp = canPromote(); if (!cp.ok || ST.level >= 6) return;
    ST.level++;
    ST.npcs.forEach(function (n) { n.pledged = false; });   // на новой ступени нужны новые, более высокие покровители
    if (ST.level >= 6) { ST.won = true; return endGame(); }
    ST.msg = '⬆️ Ты поднялся до «' + LADDERS[ST.sector][ST.level - 1] + '»! Прежние сторонники своё отыграли — теперь ищи поддержку повыше.';
    vibe([20, 30, 20]); render();
  }

  function vysluga() {
    ST.grind++; ST.grindTotal++;
    if (ST.grind >= 3 && ST.level < 6) {
      ST.grind = 0; ST.level++;
      ST.npcs.forEach(function (n) { n.pledged = false; });
      if (ST.level >= 6) { ST.won = true; return endGame(); }
      ST.msg = '⏳ Три месяца тихой выслуги — и тебя нехотя повысили до «' + LADDERS[ST.sector][ST.level - 1] + '». Медленно, но без поклонов.';
    } else {
      ST.msg = '⏳ Ты пересидел месяц на выслуге (' + ST.grind + '/3 до автоповышения). Скучно и долго — связи были бы быстрее.';
    }
    advanceMonth();
  }

  function nextMonth() { advanceMonth(); }
  function advanceMonth() {
    if (ST.turn >= MAXTURN) { ST.won = ST.level >= 6; return endGame(); }
    ST.turn++; ST.actsLeft = ACTS; ST.phase = 'status';
    var box = document.getElementById('kkSub'); if (box) box.innerHTML = '';
    render();
  }

  // ---------- финал ----------
  async function endGame() {
    if (ST.over) return; ST.over = true; ST.phase = 'end';
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="kk-wrap"><div class="kk-h1" style="font-size:1.16rem">🏛️ Итог карьеры</div><div class="kk-card">Фреди разбирает, каким ты был карьеристом…</div></div>';

    var favN = ST.matched + ST.mism;
    var langPct = favN ? Math.round(ST.matched / favN * 100) : 0;
    var readN = ST.npcs.filter(function (n) { return n.known; }).length;
    var style = ST.grindTotal >= 4 ? 'Служака (лез выслугой)' : (ST.matched >= ST.mism && ST.asksFailed <= 1 && ST.insults <= 1 && langPct >= 50 ? 'Крантехник (мастер связей)' : 'Идёт напролом');
    var topTitle = LADDERS[ST.sector][ST.level - 1];

    var stt = loadStats(); stt.plays = (stt.plays || 0) + 1; if (ST.won) stt.wins = (stt.wins || 0) + 1; if (ST.level > (stt.best || 0)) stt.best = ST.level; saveStats(stt);

    var localText = 'Стиль: «' + style + '». В услугах ты попадал в валюту человека в ' + langPct + '% случаев — ' +
      (langPct >= 60 ? 'ты говорил с людьми на их языке, и это окупалось. ' : 'часто дарил не то, что человеку нужно, — доверие росло вхолостую. ') +
      (ST.insults >= 2 ? 'Ты ' + ST.insults + ' раз грубо промахнулся мимо типа и оскорбил человека не той услугой — самая дорогая ошибка: неверно прочёл, кто перед тобой. ' : (ST.insults === 1 ? 'Один раз ты оскорбил человека, промахнувшись мимо его валюты, — читай людей внимательнее. ' : 'Ни разу не оскорбил чужой валютой — людей ты чувствовал верно. ')) +
      (ST.asksFailed >= 2 ? 'Ты ' + ST.asksFailed + ' раз просил, не дав повода, — «садился на шею», и это било по доверию. ' : 'Просил ты аккуратно — сперва давал, потом звал. ') +
      (ST.grindTotal >= 4 ? 'Много времени ушло на глухую выслугу — а наверх тут поднимают не за терпение, а за связи. ' : '') +
      (ST.won ? 'И ты добрался до самого верха — «' + topTitle + '». Причём не силой и не выслугой, а тем, что нужные люди сами захотели тебя туда протолкнуть.' :
                'До вершины ты не дошёл, застрял на «' + topTitle + '». Чаще всего дело в том, что связи копятся медленнее, чем кажется: дари в валюте человека и раньше, чем просишь.');

    var verdict = '', ai = false;
    try {
      var resp = await aiGenerate(
        'Ты — Фреди, тёплый, остроумный и точный психолог. Человек сыграл в игру-метафору «Короли и капуста»: карьера в вымышленной банановой республике, где наверх поднимают не выслугой, а поддержкой людей. У каждого своя «валюта» мотивации (признание / выгода / сила / связи), и надо читать тип человека, оказывать услуги в его валюте и просить поддержку, только сперва дав больше, чем берёшь.\n' +
        'Итоги: ' + (ST.won ? 'добрался до вершины' : 'застрял на «' + topTitle + '»') + ', уровень ' + ST.level + ' из 6. Стиль: ' + style + '. Попадание в валюту человека: ' + langPct + '% (услуг: ' + favN + '). Разгадано типов людей: ' + readN + '. Раз оскорбил человека услугой не в ту валюту (неверно прочёл тип): ' + ST.insults + '. Просьб «на шею» (просил, не дав): ' + ST.asksFailed + '. Месяцев глухой выслуги: ' + ST.grindTotal + '.\n\n' +
        'Дай короткий разбор по-русски, на «ты», без морализаторства (игра про социальную ловкость — это нормально), 4–5 фраз: 1) назови его стиль (мастер связей / служака / напролом) и что это даёт в реальной жизни; 2) насколько точно он ЧИТАЛ людей — с опорой на цифры попадания в валюту и числа оскорблений (промахов мимо типа); 3) держит ли он ритм «дай раньше, чем попросишь», или садится на шею; 4) один практичный вывод про нетворкинг и социальный капитал в реальной жизни. Живо, с лёгкой иронией.',
        { max_tokens: 470 });
      var t = (resp && resp.success && resp.content) ? String(resp.content).trim() : '';
      if (t) { verdict = t; ai = true; }
    } catch (e) {}
    if (!verdict) verdict = localText;

    var html = '<div class="kk-wrap">' +
      '<div class="kk-big">' + (ST.won ? '👑 Ты на вершине Анчурии!' : '🪑 Карьера застряла') + '</div>' +
      '<div class="kk-card" style="text-align:center">Итог: <b>' + esc(topTitle) + '</b> (' + SECTORS[ST.sector].em + ' уровень ' + ST.level + '/6)</div>' +
      '<div class="kk-card" style="text-align:center">Стиль: <b>' + style + '</b> · язык людей: <b>' + langPct + '%</b> · разгадано типов: <b>' + readN + '/' + ST.npcs.length + '</b> · оскорбил не в валюту: <b>' + ST.insults + '</b> · «на шею»: <b>' + ST.asksFailed + '</b></div>' +
      '<div class="kk-verdict">💬 ' + esc(verdict).replace(/\n/g, '<br>') + '</div>' +
      '<div class="kk-card" style="font-size:.86rem;color:#9ca3af">💡 Перенос в жизнь: нетворкинг — не про «использовать людей», а про то, чтобы <b>понимать, чем каждый живёт</b> (признание, выгода, безопасность, возможности), помогать в его валюте и <b>давать раньше, чем просишь</b>. Социальный капитал копится медленно и тратится быстро — береги доверие.</div>' +
      '<div class="kk-row"><button class="kk-primary" style="margin:0" onclick="KORKA.begin(\'' + ST.sector + '\')">🔁 Ещё карьера</button><button class="kk-secondary" onclick="KORKA.home()">Сменить касту</button></div>' +
      '</div>';
    c.innerHTML = html; try { c.scrollTop = 0; } catch (e) {}
    vibe(ST.won ? [40, 40, 40] : 20);
    track('game_round_finish', { feature: 'korka', sector: ST.sector, won: ST.won, level: ST.level });
  }

  window.KORKA = {
    home: home, rules: rules, begin: begin, render: render,
    pick: pick, choose: choose, favor: favor,
    promote: promote, vysluga: vysluga, nextMonth: nextMonth, getState: function () { return ST; }
  };
  window.showKorkaGame = home;
  console.log('✅ korka.js loaded (игра «Короли и капуста»)');
})();
