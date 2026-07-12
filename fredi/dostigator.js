// ============================================
// dostigator.js — Игра «Достигатор: поймай поток».
// Одиночный симулятор достигаторства по мотивам настолки про «достигаторов».
// Доска — это жизнь. По ней текут ПОТОКИ (стрелки-возможности) разной силы.
// КЦ («к цели») — твоя энергия: её ТРАТИШЬ на «натужный» ход (−1/клетка) и
// ЗАРАБАТЫВАЕШЬ, оседлав поток (+сила). Идти в лоб против потока — дорого.
// Кончилось КЦ вне потока — выгорел. Четыре сферы жизни (Здоровье/Отношения/
// Быт/Дела) дают бонусы. Цель засчитывается при ПРОХОДЕ сквозь неё — собирай,
// что попалось на векторе. В финале — разбор от Фреди: сёрфер потоков или
// пахарь силой воли.
// Экспорт: window.showDostigatorGame, window.DG
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function ri(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[ri(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = ri(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 480, temperature: opts.temperature == null ? 0.6 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // 8 направлений: 0=N,1=NE,2=E,3=SE,4=S,5=SW,6=W,7=NW
  var DX = [0, 1, 1, 1, 0, -1, -1, -1];
  var DY = [-1, -1, 0, 1, 1, 1, 0, -1];
  var ARR = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  function opp(d) { return (d + 4) % 8; }
  function angDiff(a, b) { var d = Math.abs(a - b) % 8; return d > 4 ? 8 - d : d; } // 0..4 (×45°)

  // Сферы жизни
  var SPH = {
    health: { id: 'health', name: 'Здоровье', em: '🩺', col: '#8ce0b0', bonus: 'удары «Дай жизни!» вдвое слабее, а в 0 КЦ ты не проваливаешься' },
    rel:    { id: 'rel',    name: 'Отношения', em: '🤝', col: '#f0b45b', bonus: 'закончил ход рядом с целью — +1 КЦ' },
    byt:    { id: 'byt',    name: 'Быт', em: '🏠', col: '#7ca8ff', bonus: 'преодоление инерции покоя бесплатно (натужный старт задаром)' },
    dela:   { id: 'dela',   name: 'Дела', em: '💼', col: '#a79bff', bonus: 'натужный ход эффективнее — 2 клетки по цене 1' }
  };

  var LEVELS = [
    { id: 0, name: 'Новичок',    goals: 3, kc: 8, acts: 20, flows: 8 },
    { id: 1, name: 'Достигатор', goals: 4, kc: 6, acts: 18, flows: 7 },
    { id: 2, name: 'Мастер',     goals: 5, kc: 5, acts: 16, flows: 7 }
  ];

  // Колода «Дай жизни!» — эффекты применяются сразу. neg:true — смягчается Здоровьем.
  var DJ = [
    { t: 'Неожиданная премия — прилив сил.', kc: 3 },
    { t: 'Внезапные расходы.', kc: -3, neg: true },
    { t: 'Тебя подхватило попутным ветром: +2 КЦ и рядом открывается поток.', kc: 2, spawnFlow: true },
    { t: 'Приболел — выпал из ритма.', kc: -2, neg: true },
    { t: 'Второе дыхание: +1 действие.', acts: 1 },
    { t: 'Прокрастинация съела вечер: −1 действие.', acts: -1, neg: true },
    { t: 'Джекпот удачи!', kc: 4 },
    { t: 'Мелкая неурядица.', kc: -2, neg: true },
    { t: 'Подарок судьбы: ближайшая чужая цель становится твоей.', giftGoal: true },
    { t: 'Вдохновение: следующий натужный ход бесплатен.', freeNext: true },
    { t: 'Штраф за просрочку.', kc: -3, neg: true },
    { t: 'Ясность цели: +2 КЦ.', kc: 2 }
  ];

  // Ранги достигатора — мета-прогрессия между партиями (только косметика/статус, баланс не трогает).
  var RANKS = [
    { xp: 0,   name: 'Пешеход',              em: '🚶' },
    { xp: 60,  name: 'Ловец ветра',          em: '🍃' },
    { xp: 150, name: 'Сёрфер',               em: '🏄' },
    { xp: 320, name: 'Мастер потока',        em: '🌊' },
    { xp: 550, name: 'Гуру достигаторства',  em: '🧘' }
  ];
  function rankFor(xp) {
    xp = xp || 0;
    var cur = RANKS[0], idx = 0;
    for (var i = 0; i < RANKS.length; i++) { if (xp >= RANKS[i].xp) { cur = RANKS[i]; idx = i; } }
    var next = RANKS[idx + 1] || null;
    return { cur: cur, next: next, idx: idx, need: next ? next.xp - xp : 0, span: next ? next.xp - RANKS[idx].xp : 1, into: xp - RANKS[idx].xp };
  }

  var ST = null;

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('dg_stats') || 'null'); if (s && typeof s === 'object') { if (s.xp == null) s.xp = 0; return s; } } catch (e) {} return { plays: 0, wins: 0, best: 0, xp: 0 }; }
  function saveStats(s) { try { localStorage.setItem('dg_stats', JSON.stringify(s)); } catch (e) {} }

  // ---------- сферы клетки ----------
  function spheresAt(W, H, x, y) {
    var out = [];
    var mx = (W - 1) / 2, my = (H - 1) / 2;
    // левый/правый × верх/низ; центральные ряд/столбец дают обе стороны
    var left = x <= mx, right = x >= mx, top = y <= my, bottom = y >= my;
    if (top && left) out.push('health');
    if (top && right) out.push('rel');
    if (bottom && left) out.push('byt');
    if (bottom && right) out.push('dela');
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  // ---------- генерация доски ----------
  function genBoard(level) {
    var W = 7, H = 7;
    var cells = [];
    for (var y = 0; y < H; y++) { var row = []; for (var x = 0; x < W; x++) row.push({ sph: spheresAt(W, H, x, y), flow: null, goal: null, dj: false }); cells.push(row); }
    // потоки: ветвящиеся русла (1–2 сегмента с поворотом ±45°) + редкие сильные течения
    for (var f = 0; f < level.flows; f++) {
      // сила: обычно 1–2, ~1 из 4 — сильное течение (3), иногда бурное (4)
      var str = Math.random() < 0.25 ? (Math.random() < 0.35 ? 4 : 3) : (1 + ri(2));
      var dir = ri(8);
      var cx = ri(W), cy = ri(H);
      var segs = Math.random() < 0.55 ? 2 : 1;                 // больше половины русел — с изгибом
      for (var sgi = 0; sgi < segs; sgi++) {
        var slen = 2 + ri(3);
        for (var k = 0; k < slen; k++) {
          if (cx < 0 || cx >= W || cy < 0 || cy >= H) break;
          cells[cy][cx].flow = { dir: dir, str: str };         // последний сегмент «побеждает» на общей клетке — русло читается как поворот
          cx += DX[dir]; cy += DY[dir];
        }
        dir = (dir + (Math.random() < 0.5 ? 1 : 7)) % 8;       // поворот русла на ±45°
      }
    }
    // цели: свои (gold) + чужие (grey)
    var freeCells = [];
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) freeCells.push([x, y]);
    freeCells = shuffle(freeCells);
    var gi = 0, placedMine = 0, placedOther = 0;
    while (placedMine < level.goals && gi < freeCells.length) { var c = freeCells[gi++]; if (!cells[c[1]][c[0]].goal) { cells[c[1]][c[0]].goal = { mine: true }; placedMine++; } }
    var others = 3 + ri(2);
    while (placedOther < others && gi < freeCells.length) { c = freeCells[gi++]; if (!cells[c[1]][c[0]].goal) { cells[c[1]][c[0]].goal = { mine: false }; placedOther++; } }
    // ромбики ДЖ
    var dj = 3;
    var dc = 0; while (dc < dj && gi < freeCells.length) { c = freeCells[gi++]; if (!cells[c[1]][c[0]].goal) { cells[c[1]][c[0]].dj = true; dc++; } }
    return { W: W, H: H, cells: cells };
  }

  function newGame(levelId) {
    var lv = LEVELS[levelId];
    var b = genBoard(lv);
    return {
      lv: lv, W: b.W, H: b.H, cells: b.cells,
      kc: lv.kc, actsLeft: lv.acts, maxActs: lv.acts,
      goalsNeed: lv.goals, goalsGot: 0,
      px: -1, py: -1, phase: 'place', over: false, won: false,
      djDeck: shuffle(DJ.map(function (c) { return c; })),
      freeNext: false,
      // трекеры для разбора
      flowKc: 0, pushKc: 0, againstKc: 0, againstN: 0, passGoals: 0, landGoals: 0, ridesN: 0, pushN: 0, lowKc: lv.kc, sphSeen: {},
      moments: [],                 // конкретные моменты пути для разбора Фреди
      msg: '', log: []
    };
  }

  function turnNo() { return ST.maxActs - ST.actsLeft + 1; }
  function noteMoment(kind, data) { data = data || {}; data.kind = kind; data.turn = turnNo(); ST.moments.push(data); }
  // самый сильный поток среди соседних клеток (str) — чтобы заметить упущенную возможность
  function strongestFlowNear() {
    var best = 0;
    var here = ST.cells[ST.py][ST.px]; if (here.flow) best = here.flow.str;
    for (var d = 0; d < 8; d++) { var nx = ST.px + DX[d], ny = ST.py + DY[d]; if (nx < 0 || nx >= ST.W || ny < 0 || ny >= ST.H) continue; var fc = ST.cells[ny][nx].flow; if (fc && fc.str > best) best = fc.str; }
    return best;
  }
  // человекочитаемые «ключевые моменты» пути — по 1 позитивному и 1 поучительному + добор до 3
  function momentPhrases() {
    var P = {
      lob: function (m) { return 'ход ' + m.turn + ': пошёл в лоб против потока силой ' + m.str + ' — дорогая борьба с течением'; },
      ignoredStrong: function (m) { return 'ход ' + m.turn + ': под ногами бурлил поток силой ' + m.str + ', а ты двинул натужно мимо'; },
      bigride: function (m) { return 'ход ' + m.turn + ': поймал мощное течение силой ' + m.str + ' — вот это по-достигаторски'; },
      combo: function (m) { return 'ход ' + m.turn + ': одним потоком снял ' + m.n + ' цели разом'; }
    };
    var pos = ST.moments.filter(function (m) { return m.kind === 'bigride' || m.kind === 'combo'; });
    var neg = ST.moments.filter(function (m) { return m.kind === 'lob' || m.kind === 'ignoredStrong'; });
    var out = [];
    if (pos.length) out.push(P[pos[pos.length - 1].kind](pos[pos.length - 1]));
    if (neg.length) out.push(P[neg[0].kind](neg[0]));
    ST.moments.forEach(function (m) { if (out.length < 3) { var s = P[m.kind](m); if (out.indexOf(s) < 0) out.push(s); } });
    return out.slice(0, 3);
  }

  // ---------- рендер ----------
  function injectCSS() {
    if (document.getElementById('dgCSS')) return;
    var s = document.createElement('style'); s.id = 'dgCSS';
    s.textContent = [
      '.dg-wrap{max-width:640px;margin:0 auto;padding:16px 14px 96px;color:#eef1f6}',
      '.dg-h1{font-size:1.4rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.dg-lead{font-size:.97rem;line-height:1.6;color:#c3c9d6;margin-bottom:14px}',
      '.dg-ghost{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:6px 0;margin-bottom:8px}',
      '.dg-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:13px 15px;margin:0 0 11px;line-height:1.55}',
      '.dg-ch{font-weight:700;margin-bottom:7px}',
      '.dg-top{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#c3c9d6;font-size:.9rem;margin:0 0 10px;flex-wrap:wrap}',
      '.dg-stat{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:4px 11px;font-weight:600;font-size:.86rem}',
      '.dg-stat b{font-weight:800;color:#fff}',
      '.dg-board{display:grid;gap:2px;margin:0 0 12px;touch-action:manipulation}',
      '.dg-cell{position:relative;aspect-ratio:1;border-radius:6px;border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:clamp(13px,3.6vw,20px);background:rgba(255,255,255,.02);overflow:hidden}',
      '.dg-cell .fl{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9fb4d8;font-weight:700;pointer-events:none}',
      '.dg-cell .fl.s1{opacity:.4}.dg-cell .fl.s2{opacity:.62}',
      '.dg-cell .fl.s3{opacity:1;color:#38bdf8;text-shadow:0 0 6px rgba(56,189,248,.7)}',
      '.dg-cell .fl.s4{opacity:1;color:#22d3ee;text-shadow:0 0 9px rgba(34,211,238,.9);font-size:1.15em}',
      '.dg-cell .ic{position:relative;z-index:2}',
      '.dg-cell .badge{position:absolute;top:1px;right:2px;z-index:3;font-size:.6rem;font-weight:800;padding:0 3px;border-radius:6px;line-height:1.3}',
      '.dg-cell.legal{cursor:pointer;box-shadow:inset 0 0 0 2px rgba(124,168,255,.6)}',
      '.dg-cell.legal:hover{background:rgba(124,168,255,.14)}',
      '.dg-cell.land{box-shadow:inset 0 0 0 2px rgba(52,211,153,.85)}',
      '.dg-cell.me{box-shadow:inset 0 0 0 2px #fff}',
      '.dg-cell.path{background:rgba(52,211,153,.16)}',
      '.dg-primary{display:block;width:100%;border:none;border-radius:13px;padding:14px;font-size:1rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#2fb17a,#3aa0d0);box-shadow:0 8px 20px rgba(47,177,122,.3);margin:6px 0 10px}',
      '.dg-primary[disabled]{opacity:.5;cursor:default}',
      '.dg-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:12px;padding:12px;font-size:.92rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 9px}',
      '.dg-fac{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:13px;padding:12px 14px;margin:0 0 9px;color:#eef1f6;cursor:pointer;font-size:.98rem}',
      '.dg-fac:hover{border-color:rgba(47,177,122,.6)}.dg-fac small{display:block;color:#9ca3af;font-size:.82rem;margin-top:3px}',
      '.dg-msg{border:1px solid rgba(56,189,248,.34);background:rgba(56,189,248,.08);border-radius:12px;padding:10px 13px;margin:0 0 11px;font-size:.9rem;line-height:1.5;color:#bae6fd;min-height:1px}',
      '.dg-legend{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}',
      '.dg-lg{display:inline-flex;align-items:center;gap:5px;font-size:.76rem;color:#9ca3af;border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:4px 8px}',
      '.dg-lg i{width:10px;height:10px;border-radius:3px;display:inline-block}',
      '.dg-goal{border:1px solid rgba(240,180,75,.4);background:rgba(240,180,75,.08);border-radius:11px;padding:9px 12px;margin:0 0 8px;font-size:.9rem;color:#ffe6b8}',
      '.dg-verdict{border:1px solid rgba(47,177,122,.4);background:linear-gradient(135deg,rgba(47,177,122,.12),rgba(58,160,208,.05));border-radius:13px;padding:13px 15px;margin:0 0 11px;line-height:1.6;font-size:.94rem}',
      '.dg-big{text-align:center;font-size:1.35rem;font-weight:800;margin:2px 0 4px;color:#3aa0d0}',
      '.dg-mini{font-size:.8rem;color:#9ca3af;margin:0 0 6px}',
      '.dg-li{margin:6px 0;line-height:1.5;font-size:.92rem}',
      '.dg-row{display:flex;gap:9px}.dg-row>*{flex:1;margin-bottom:0}',
      '.dg-warn{color:#fca5a5}.dg-good{color:#a7f3d0}.dg-neu{color:#fcd34d}',
      '.dg-rank{border:1px solid rgba(58,160,208,.35);background:rgba(58,160,208,.07);border-radius:13px;padding:11px 14px;margin:0 0 11px}',
      '.dg-rank .rt{display:flex;justify-content:space-between;align-items:center;font-size:.92rem;font-weight:700;margin-bottom:7px}',
      '.dg-rank .rt .nx{font-weight:500;color:#9ca3af;font-size:.8rem}',
      '.dg-xpbar{height:8px;border-radius:5px;background:rgba(255,255,255,.09);overflow:hidden}',
      '.dg-xpbar>i{display:block;height:100%;background:linear-gradient(90deg,#3aa0d0,#22d3ee);transition:width .5s}',
      '.dg-moment{border-left:3px solid rgba(58,160,208,.6);background:rgba(255,255,255,.03);border-radius:0 8px 8px 0;padding:7px 11px;margin:0 0 7px;font-size:.88rem;line-height:1.45}',
      '[data-theme="light"] .dg-wrap{color:#1f2430}',
      '[data-theme="light"] .dg-lead{color:#4b5566}',
      '[data-theme="light"] .dg-card{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .dg-secondary,[data-theme="light"] .dg-fac{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .dg-cell{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.06)}',
      '@media(max-width:560px){.dg-wrap{padding:12px 8px 100px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function rankBarHTML(xp) {
    var r = rankFor(xp);
    var pct = r.next ? Math.round(r.into / r.span * 100) : 100;
    return '<div class="dg-rank"><div class="rt"><span>' + r.cur.em + ' Ранг: ' + esc(r.cur.name) + '</span>' +
      (r.next ? '<span class="nx">до «' + esc(r.next.name) + '» — ' + r.need + ' опыта</span>' : '<span class="nx">высший ранг ✦</span>') +
      '</div><div class="dg-xpbar"><i style="width:' + pct + '%"></i></div></div>';
  }

  // ---------- главный экран ----------
  function home() {
    injectCSS(); ST = null;
    track('feature_opened', { feature: 'dostigator' });
    var c = container(); if (!c) return;
    var st = loadStats();
    c.innerHTML =
      '<div class="dg-wrap">' +
        '<button class="dg-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="dg-h1">🧭 Достигатор: поймай поток</div>' +
        '<div class="dg-lead">Доска — это жизнь. По ней текут <b>потоки</b> — стрелки-возможности. Твоя энергия — <b>КЦ («к цели»)</b>: её тратишь, когда прёшь <b>натужно</b> (−1 за клетку), и <b>зарабатываешь</b>, когда ловишь поток (+сила). Идти в лоб против течения — разорительно. Кончилось КЦ вне потока — выгорел.<br><br>Смысл достигаторства: не ломиться к цели силой воли, а <b>ловить momentum</b> и собирать цели, которые попались по пути. В финале Фреди разберёт, кем ты играл — сёрфером возможностей или пахарем.</div>' +
        rankBarHTML(st.xp) +
        (st.plays ? '<div class="dg-card" style="text-align:center">Партий: <b>' + st.plays + '</b> · доведено до цели: <b>' + (st.wins || 0) + '</b> · рекорд собранных целей: <b>' + (st.best || 0) + '</b></div>' : '') +
        '<button class="dg-secondary" onclick="DG.rules()">📖 Как играть: потоки, КЦ, сферы, цели</button>' +
        '<div class="dg-ch" style="margin:8px 0 9px">Уровень достигатора:</div>' +
        LEVELS.map(function (l) {
          return '<button class="dg-fac" onclick="DG.begin(' + l.id + ')"><b>' + esc(l.name) + '</b> <span style="color:#9ca3af;font-size:.8rem">' + l.goals + ' целей · старт ' + l.kc + ' КЦ · ' + l.acts + ' действий</span><small>' + (l.id === 0 ? 'Больше запаса, меньше целей — спокойно освоиться.' : l.id === 1 ? 'Баланс: придётся считать КЦ и ловить потоки.' : 'Тонкий запас, много целей — только сёрфинг по потокам вытащит.') + '</small></button>';
        }).join('') +
        '<div class="dg-card" style="font-size:.85rem;color:#9ca3af">💡 Тренажёр достигаторства: замечать потоки-возможности, беречь энергию, собирать цели попутно, а не переть напролом. Перенос в жизнь — прямой.</div>' +
      '</div>';
  }

  function rules() {
    injectCSS(); var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="dg-wrap">' +
        '<button class="dg-ghost" onclick="DG.home()">← Назад</button>' +
        '<div class="dg-h1" style="font-size:1.22rem">Как играть</div>' +
        '<div class="dg-card"><div class="dg-ch">Цель</div>Собрать все свои <b>🎯 золотые цели</b>, пока не кончились действия и КЦ. Цель засчитывается, даже если ты просто <b>прошёл сквозь неё</b> — не только при остановке. Свои цели дают +5 КЦ, чужие ⚪ — +2 КЦ (тоже бери попутно).</div>' +
        '<div class="dg-card"><div class="dg-ch">КЦ — твоя энергия</div>Каждое действие тратит или приносит КЦ.<br>• <b>Натужный ход</b> (по пустому полю): −1 КЦ за клетку, 1 клетка за действие.<br>• <b>Оседлать поток</b>: несёт на «силу потока» клеток за одно действие и <b>даёт +силу КЦ</b>. Так собираешь энергию и покрываешь расстояние.<br>• <b>В лоб против потока</b>: −сила КЦ за клетку. Дорого — не воюй с течением.<br>Кончились КЦ вне потока — двигаться нечем, игра окончена.</div>' +
        '<div class="dg-card"><div class="dg-ch">Как ходишь</div>Тапни соседнюю клетку — пойдёшь туда натужно (на клетке видно цену). Если стоишь на потоке — жми <b>«Оседлать поток →»</b>, и тебя пронесёт по стрелке (через все цели и ромбики на пути). Русла бывают <b>с изгибом</b> — сойдя с одного, можно поймать следующий. Ярко-голубые стрелки — <b>сильные течения</b> (сила 3–4): несут далеко и дают много энергии, ради них стоит сделать крюк.</div>' +
        '<div class="dg-card"><div class="dg-ch">🔶 Дай жизни!</div>Прошёл через ромбик — тянешь карточку случайного события (плюс или минус). Применяется сразу.</div>' +
        '<div class="dg-card"><div class="dg-ch">Четыре сферы</div>' +
          Object.keys(SPH).map(function (k) { var s = SPH[k]; return '<div class="dg-li">' + s.em + ' <b>' + s.name + '</b> — ' + s.bonus + '.</div>'; }).join('') +
          '<div class="dg-mini" style="margin-top:6px">Пока стоишь на клетке сферы — её бонус работает. Углы доски — разные сферы.</div></div>' +
        '<button class="dg-primary" onclick="DG.home()">Выбрать уровень →</button>' +
      '</div>';
  }

  function begin(levelId) {
    injectCSS(); ST = newGame(levelId);
    track('game_round_start', { feature: 'dostigator', level: levelId });
    ST.msg = 'Брось фишку куда захочешь — тапни любую клетку, чтобы начать путь.';
    render();
  }

  function render() {
    if (!ST) return;
    if (ST.phase === 'end') return;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="dg-wrap">' +
        '<div class="dg-top">' +
          '<span class="dg-stat">⚡ КЦ <b>' + ST.kc + '</b></span>' +
          '<span class="dg-stat">🎯 цели <b>' + ST.goalsGot + '/' + ST.goalsNeed + '</b></span>' +
          '<span class="dg-stat">🎬 ходов <b>' + ST.actsLeft + '</b></span>' +
          '<button style="background:none;border:none;color:#8b93a7;font-size:.85rem;cursor:pointer;padding:0" onclick="DG.home()">✕ Выйти</button>' +
        '</div>' +
        '<div class="dg-msg">' + (ST.msg ? esc(ST.msg) : '&nbsp;') + '</div>' +
        boardHTML() +
        legendHTML() +
        actionsHTML() +
      '</div>';
    try { c.scrollTop = 0; } catch (e) {}
  }

  function cellCost(x, y, dir) {
    // стоимость натужного шага из (px,py) в направлении dir на 1 клетку
    var here = ST.cells[ST.py][ST.px];
    if (here.flow && angDiff(dir, here.flow.dir) >= 3) return { cost: here.flow.str, lob: true };   // в лоб (135°/180°)
    return { cost: 1, lob: false };
  }
  function legalPush() {
    // словарь key "x,y" -> {dir, cost, lob}
    var out = {};
    if (ST.phase !== 'play') return out;
    for (var d = 0; d < 8; d++) {
      var nx = ST.px + DX[d], ny = ST.py + DY[d];
      if (nx < 0 || nx >= ST.W || ny < 0 || ny >= ST.H) continue;
      var cc = cellCost(ST.px, ST.py, d);
      out[nx + ',' + ny] = { dir: d, cost: cc.cost, lob: cc.lob };
    }
    return out;
  }
  function ridePreview() {
    // если стоим на потоке — путь и посадка
    if (ST.px < 0 || ST.py < 0) return null;
    var here = ST.cells[ST.py][ST.px];
    if (!here.flow) return null;
    var d = here.flow.dir, s = here.flow.str, path = [], lx = ST.px, ly = ST.py;
    for (var k = 1; k <= s; k++) {
      var nx = ST.px + DX[d] * k, ny = ST.py + DY[d] * k;
      if (nx < 0 || nx >= ST.W || ny < 0 || ny >= ST.H) break;
      path.push([nx, ny]); lx = nx; ly = ny;
    }
    return { dir: d, str: s, path: path, land: [lx, ly] };
  }

  function boardHTML() {
    var legal = legalPush(), rp = ridePreview();
    var pathKeys = {}; if (rp) rp.path.forEach(function (p) { pathKeys[p[0] + ',' + p[1]] = 1; });
    var landKey = rp ? rp.land[0] + ',' + rp.land[1] : null;
    var html = '<div class="dg-board" style="grid-template-columns:repeat(' + ST.W + ',1fr)">';
    for (var y = 0; y < ST.H; y++) for (var x = 0; x < ST.W; x++) {
      var cell = ST.cells[y][x], key = x + ',' + y, cls = 'dg-cell';
      var me = (x === ST.px && y === ST.py);
      if (me) cls += ' me';
      var lg = legal[key];
      if (ST.phase === 'place' || lg) cls += ' legal';
      if (pathKeys[key]) cls += ' path';
      if (landKey === key && !me) cls += ' land';
      // фон сферы (по первой сфере клетки)
      var bg = '';
      if (cell.sph.length) { var col = SPH[cell.sph[0]].col; bg = 'background:' + hexA(col, cell.sph.length > 1 ? 0.16 : 0.09) + ';'; }
      var inner = '';
      if (cell.flow) inner += '<span class="fl s' + cell.flow.str + '">' + ARR[cell.flow.dir] + '</span>';
      var ic = me ? '🧭' : cell.goal ? (cell.goal.mine ? '🎯' : '⚪') : cell.dj ? '🔶' : '';
      if (ic) inner += '<span class="ic">' + ic + '</span>';
      var badge = '';
      if (lg && !me) { badge = '<span class="badge" style="' + (lg.lob ? 'background:rgba(248,113,113,.9);color:#fff' : 'background:rgba(0,0,0,.45);color:#fff') + '">−' + lg.cost + '</span>'; }
      var onclick = '';
      if (ST.phase === 'place') onclick = ' onclick="DG.place(' + x + ',' + y + ')"';
      else if (lg) onclick = ' onclick="DG.push(' + x + ',' + y + ')"';
      html += '<div class="' + cls + '" style="' + bg + '"' + onclick + '>' + inner + badge + '</div>';
    }
    html += '</div>';
    return html;
  }
  function hexA(hex, a) {
    var h = hex.replace('#', ''); var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function legendHTML() {
    var html = '<div class="dg-legend">';
    Object.keys(SPH).forEach(function (k) { var s = SPH[k]; html += '<span class="dg-lg"><i style="background:' + s.col + '"></i>' + s.em + ' ' + s.name + '</span>'; });
    html += '<span class="dg-lg">🎯 своя цель</span><span class="dg-lg">⚪ чужая</span><span class="dg-lg">🔶 событие</span></div>';
    return html;
  }
  function actionsHTML() {
    if (ST.phase === 'place') return '<div class="dg-mini">Тапни клетку на доске, чтобы поставить фишку 🧭.</div>';
    var rp = ridePreview();
    var html = '';
    if (rp) {
      var g = rp.path.filter(function (p) { var c = ST.cells[p[1]][p[0]]; return c.goal; }).length;
      html += '<button class="dg-primary" onclick="DG.ride()">🌊 Оседлать поток ' + ARR[rp.dir] + ' <span style="font-weight:600;opacity:.9">(+' + rp.str + ' КЦ, ' + rp.str + ' кл.' + (g ? ', соберёшь ' + g + ' цел.' : '') + ')</span></button>';
    } else {
      html += '<div class="dg-mini">Ты не на потоке. Тапни соседнюю клетку — пойдёшь натужно (цена на клетке). Или доберись до стрелки, чтобы поймать поток.</div>';
    }
    return html;
  }

  // ---------- размещение старта ----------
  function place(x, y) {
    if (ST.phase !== 'place') return;
    ST.px = x; ST.py = y; ST.phase = 'play';
    markSphere();
    ST.msg = 'Готово. Лови потоки 🌊 и собирай 🎯. Помни: против течения — дорого.';
    // если встал прямо на цель/ромбик — сработает как проход
    triggerCell(x, y, false);
    afterAction(true);
  }

  // может ли игрок вообще совершить действие (оседлать поток или позволить себе хоть один натужный шаг)
  function canAct() {
    if (ridePreview()) return true;
    if (ST.freeNext) return true;
    var legal = legalPush();
    var keys = Object.keys(legal);
    for (var i = 0; i < keys.length; i++) {
      var lg = legal[keys[i]];
      var cost = (hasSph('byt') && !lg.lob) ? 0 : lg.cost;
      if (cost <= ST.kc) return true;
    }
    return false;
  }

  function markSphere() { ST.cells[ST.py][ST.px].sph.forEach(function (s) { ST.sphSeen[s] = 1; }); }
  function curSph() { return ST.cells[ST.py][ST.px].sph; }
  function hasSph(id) { return curSph().indexOf(id) >= 0; }

  // ---------- натужный ход ----------
  function push(x, y) {
    if (ST.phase !== 'play') return;
    var legal = legalPush(), lg = legal[x + ',' + y];
    if (!lg) return;
    var cost = lg.cost;
    if (hasSph('byt') && !lg.lob) cost = 0;         // Быт: инерция бесплатна
    if (ST.freeNext) { cost = 0; ST.freeNext = false; }
    if (cost > ST.kc) { ST.msg = 'Не хватает КЦ на этот ход (нужно ' + cost + '). Ищи поток — он даёт энергию.'; return render(); }
    // заметки для разбора: борьба с течением / упущенный сильный поток под ногами
    var hereFlow = ST.cells[ST.py][ST.px].flow;
    if (lg.lob) noteMoment('lob', { str: cost });
    else if (hereFlow && hereFlow.str >= 3) noteMoment('ignoredStrong', { str: hereFlow.str });
    // Дела: 2 клетки по цене 1 (если вторая в поле и не в лоб)
    var steps = [[x, y]];
    if (hasSph('dela') && !lg.lob) { var x2 = x + DX[lg.dir], y2 = y + DY[lg.dir]; if (x2 >= 0 && x2 < ST.W && y2 >= 0 && y2 < ST.H) steps.push([x2, y2]); }
    ST.kc -= cost;
    if (lg.lob) { ST.againstKc += cost; ST.againstN++; } else { ST.pushKc += cost; }
    ST.pushN++;
    var last = steps[0];
    steps.forEach(function (p, i) { ST.px = p[0]; ST.py = p[1]; last = p; triggerCell(p[0], p[1], i < steps.length - 1); });
    markSphere();
    ST.msg = (lg.lob ? '💢 В лоб против потока — ' + cost + ' КЦ. ' : (cost === 0 ? 'Натужный ход задаром (' + (hasSph('byt') ? 'Быт' : 'вдохновение') + '). ' : 'Натужный ход, −' + cost + ' КЦ. ')) + (steps.length > 1 ? 'Дела: прошёл 2 клетки за одну цену.' : '');
    afterAction(true);
  }

  // ---------- оседлать поток ----------
  function ride() {
    if (ST.phase !== 'play') return;
    var rp = ridePreview(); if (!rp) return;
    ST.kc += rp.str; ST.flowKc += rp.str; ST.ridesN++;
    var goalsHit = 0;
    rp.path.forEach(function (p, i) { ST.px = p[0]; ST.py = p[1]; if (triggerCell(p[0], p[1], i < rp.path.length - 1)) goalsHit++; });
    markSphere();
    if (rp.str >= 3) noteMoment('bigride', { str: rp.str });
    if (goalsHit >= 2) noteMoment('combo', { n: goalsHit });
    ST.msg = '🌊 Поймал поток ' + ARR[rp.dir] + ': +' + rp.str + ' КЦ, ' + rp.path.length + ' клеток' + (goalsHit ? ', собрал ' + goalsHit + ' цел.' : '') + '.';
    vibe([15, 20, 15]);
    afterAction(true);
  }

  // возвращает true, если на клетке была цель (для подсчёта)
  function triggerCell(x, y, viaPass) {
    var cell = ST.cells[y][x], hadGoal = false;
    if (cell.goal) {
      hadGoal = true;
      if (cell.goal.mine) { ST.kc += 5; ST.goalsGot++; if (viaPass) ST.passGoals++; else ST.landGoals++; }
      else { ST.kc += 2; }
      cell.goal = null;
    }
    if (cell.dj) { cell.dj = false; drawDJ(); }
    return hadGoal;
  }

  // ---------- Дай жизни! ----------
  function drawDJ() {
    if (!ST.djDeck.length) ST.djDeck = shuffle(DJ.map(function (c) { return c; }));
    var card = ST.djDeck.shift();
    var soft = hasSph('health');
    var parts = ['🔶 «' + card.t + '»'];
    if (card.kc) {
      var v = card.kc;
      if (v < 0 && soft) v = Math.ceil(v / 2);
      ST.kc += v;
      if (v < 0 && ST.kc < 0 && soft) ST.kc = 0;   // Здоровье: не проваливаешься ниже 0
      parts.push((v >= 0 ? '+' : '') + v + ' КЦ' + (card.kc < 0 && soft ? ' (Здоровье смягчило)' : ''));
    }
    if (card.acts) {
      var a = card.acts; if (a < 0 && soft) a = 0;
      ST.actsLeft += a;
      parts.push(a > 0 ? '+' + a + ' действие' : (a < 0 ? a + ' действие' : 'без потери (Здоровье)'));
    }
    if (card.freeNext) { ST.freeNext = true; parts.push('следующий натужный ход бесплатен'); }
    if (card.spawnFlow) { spawnFlowNear(); parts.push('рядом открылся поток'); }
    if (card.giftGoal) { if (giftNearestOther()) parts.push('чужая цель стала твоей'); }
    ST.msg = parts.join(' · ');
    if (ST.kc < ST.lowKc) ST.lowKc = ST.kc;
  }
  function spawnFlowNear() {
    for (var r = 1; r <= 2; r++) for (var d = 0; d < 8; d++) {
      var nx = ST.px + DX[d] * r, ny = ST.py + DY[d] * r;
      if (nx < 0 || nx >= ST.W || ny < 0 || ny >= ST.H) continue;
      if (!ST.cells[ny][nx].flow) { ST.cells[ny][nx].flow = { dir: ri(8), str: 2 + ri(2) }; return; }
    }
  }
  function giftNearestOther() {
    var best = null, bd = 1e9;
    for (var y = 0; y < ST.H; y++) for (var x = 0; x < ST.W; x++) {
      var g = ST.cells[y][x].goal; if (g && !g.mine) { var dd = Math.abs(x - ST.px) + Math.abs(y - ST.py); if (dd < bd) { bd = dd; best = [x, y]; } }
    }
    if (best) { ST.cells[best[1]][best[0]].goal.mine = true; ST.goalsNeed++; return true; }
    return false;
  }

  // ---------- после действия ----------
  function afterAction(spend) {
    // Отношения: закончил рядом с целью — +1 КЦ
    if (hasSph('rel')) {
      var near = false;
      for (var d = 0; d < 8 && !near; d++) { var nx = ST.px + DX[d], ny = ST.py + DY[d]; if (nx >= 0 && nx < ST.W && ny >= 0 && ny < ST.H && ST.cells[ny][nx].goal) near = true; }
      if (near) { ST.kc += 1; ST.msg += ' 🤝 Отношения: рядом цель, +1 КЦ.'; }
    }
    if (spend) ST.actsLeft--;
    if (ST.kc < ST.lowKc) ST.lowKc = ST.kc;
    // победа
    if (ST.goalsGot >= ST.goalsNeed) { ST.won = true; return endGame(); }
    // поражение по ходам
    if (ST.actsLeft <= 0) { ST.won = false; return endGame(); }
    // тупик по энергии: не можешь ни оседлать поток, ни оплатить натужный шаг
    if (!canAct()) { ST.won = false; ST.stuck = true; return endGame(); }
    render();
  }

  // ---------- финал ----------
  async function endGame() {
    if (ST.over) return; ST.over = true; ST.phase = 'end';
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="dg-wrap"><div class="dg-h1" style="font-size:1.16rem">🏁 Путь окончен</div><div class="dg-card">Фреди разбирает, каким достигатором ты был…</div></div>';

    var flowShare = (ST.flowKc + ST.pushKc + ST.againstKc) > 0 ? Math.round(ST.flowKc / (ST.flowKc + ST.pushKc + ST.againstKc) * 100) : 0;
    var style = flowShare >= 60 ? 'Сёрфер потоков' : flowShare >= 35 ? 'Гибкий прагматик' : 'Пахарь силой воли';
    var oppShare = (ST.passGoals + ST.landGoals) > 0 ? Math.round(ST.passGoals / (ST.passGoals + ST.landGoals) * 100) : 0;
    var phrases = momentPhrases();
    var momText = phrases.length ? phrases.join('; ') : '';

    // мета-прогрессия: опыт и ранг
    var bigrides = ST.moments.filter(function (m) { return m.kind === 'bigride'; }).length;
    var xpGain = ST.goalsGot * 10 + (ST.won ? 40 : 0) + Math.round(flowShare / 5) + bigrides * 3;
    var stt = loadStats();
    stt.plays = (stt.plays || 0) + 1; if (ST.won) stt.wins = (stt.wins || 0) + 1; if (ST.goalsGot > (stt.best || 0)) stt.best = ST.goalsGot;
    var xpBefore = stt.xp || 0; stt.xp = xpBefore + xpGain;
    var rankUp = rankFor(xpBefore).idx !== rankFor(stt.xp).idx;
    saveStats(stt);

    var localText = 'Стиль: «' + style + '». Из энергии на движение ' + flowShare + '% ты добыл на потоках, а не выгрыз натужно. ' +
      (ST.againstN ? 'Против течения ты пошёл ' + ST.againstN + ' раз — дорогое удовольствие. ' : 'Против течения в лоб почти не лез — хорошо. ') +
      (oppShare >= 50 ? 'Половину и больше целей ты снял мимоходом, по пути — это и есть достигаторский опортунизм. ' : 'Цели ты чаще брал прицельно, останавливаясь на них — попробуй чаще собирать их транзитом, по вектору потока. ') +
      (phrases.length ? 'Показательный момент — ' + phrases[0] + '. ' : '') +
      (ST.won ? 'И ты дошёл: собрал все свои цели. Причём, скорее всего, не тем путём, что задумывал вначале — а тем, куда понесли потоки.' :
                (ST.stuck ? 'Ты выгорел — КЦ кончились там, где не было потока. Урок: не трать энергию на борьбу с течением, держи резерв и лови поток раньше.' : 'Действия кончились раньше целей. Часто дело в том, что слишком много ходов ушло на натужное продавливание вместо поиска попутного потока.'));

    var verdict = '', ai = false;
    try {
      var resp = await aiGenerate(
        'Ты — Фреди, тёплый, остроумный и точный психолог. Человек сыграл в игру-метафору «Достигатор: поймай поток»: доска — жизнь, по ней текут потоки-возможности, КЦ — энергия, которую тратишь на движение силой воли и зарабатываешь, ловя потоки. Идея — достигаторство: не переть к цели напролом, а ловить momentum и собирать цели попутно.\n' +
        'Итоги: ' + (ST.won ? 'дошёл до всех целей' : 'не дошёл') + '. Собрано целей: ' + ST.goalsGot + ' из ' + ST.goalsNeed + '. Стиль: ' + style + ' (' + flowShare + '% энергии добыто на потоках). Против течения в лоб: ' + ST.againstN + ' раз. Доля целей, взятых мимоходом (транзитом): ' + oppShare + '%. ' + (ST.stuck ? 'Выгорел — кончилась энергия вне потока. ' : '') + '\n' +
        (momText ? 'Конкретные моменты его партии (обязательно сошлись хотя бы на один из них дословно, с номером хода): ' + momText + '.\n' : '') + '\n' +
        'Дай короткий разбор по-русски, на «ты», без морализаторства, 4–5 фраз: 1) назови его стиль достижения целей (ловит поток vs. прёт силой воли) и что это даёт/стоит в реальной жизни; 2) сошлись на КОНКРЕТНЫЙ момент выше (с номером хода) как иллюстрацию; 3) про опортунизм — собирает ли возможности по пути или зациклен на одной цели; 4) один практичный вывод про то, как в жизни ловить потоки вместо выгорания. Живо, с лёгкой иронией, без канцелярита.',
        { max_tokens: 480 });
      var t = (resp && resp.success && resp.content) ? String(resp.content).trim() : '';
      if (t) { verdict = t; ai = true; }
    } catch (e) {}
    if (!verdict) verdict = localText;

    var html = '<div class="dg-wrap">' +
      '<div class="dg-big">' + (ST.won ? '🏆 Ты дошёл до цели!' : ST.stuck ? '🔥 Выгорел в пути' : '⏳ Время вышло') + '</div>' +
      '<div class="dg-card" style="text-align:center">Собрано целей: <b>' + ST.goalsGot + ' / ' + ST.goalsNeed + '</b> · осталось КЦ: <b>' + Math.max(0, ST.kc) + '</b></div>' +
      '<div class="dg-card" style="text-align:center">Стиль: <b>' + style + '</b> · энергии с потоков: <b>' + flowShare + '%</b> · целей мимоходом: <b>' + oppShare + '%</b> · в лоб против течения: <b>' + ST.againstN + '</b></div>' +
      (phrases.length ? '<div class="dg-card"><div class="dg-ch">🔎 Ключевые моменты пути</div>' + phrases.map(function (p) { return '<div class="dg-moment">' + esc(p) + '</div>'; }).join('') + '</div>' : '') +
      '<div class="dg-verdict">💬 ' + esc(verdict).replace(/\n/g, '<br>') + '</div>' +
      '<div class="dg-card" style="text-align:center">Опыт достигатора: <b>+' + xpGain + '</b>' + (rankUp ? ' <span class="dg-good">🎉 новый ранг!</span>' : '') + '</div>' +
      rankBarHTML(stt.xp) +
      '<div class="dg-card" style="font-size:.86rem;color:#9ca3af">💡 Перенос в жизнь: достигаторство — не про то, чтобы задавить цель усилием, а про то, чтобы <b>замечать потоки</b> (обстоятельства, тренды, чужую энергию), вставать на них и собирать цели по пути. Сила воли — расходник; попутный ветер — бесплатен.</div>' +
      '<div class="dg-row"><button class="dg-primary" style="margin:0" onclick="DG.begin(' + ST.lv.id + ')">🔁 Ещё путь</button><button class="dg-secondary" onclick="DG.home()">Сменить уровень</button></div>' +
      '</div>';
    c.innerHTML = html; try { c.scrollTop = 0; } catch (e) {}
    vibe(ST.won ? [40, 40, 40] : 20);
    track('game_round_finish', { feature: 'dostigator', level: ST.lv.id, won: ST.won, goals: ST.goalsGot });
  }

  window.DG = {
    home: home, rules: rules, begin: begin, render: render,
    place: place, push: push, ride: ride, getState: function () { return ST; }
  };
  window.showDostigatorGame = home;
  console.log('✅ dostigator.js loaded (игра «Достигатор: поймай поток»)');
})();
