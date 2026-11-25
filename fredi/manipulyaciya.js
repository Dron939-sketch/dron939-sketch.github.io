// ============================================
// manipulyaciya.js — Тренажёр «Распознай манипуляцию».
// Учимся видеть приёмы влияния в фразах: фрейминг, срочность,
// ложная дилемма, апелляция к авторитету, «все так делают»,
// страх, скрытая аффилиация, раздутые обещания, умолчание, вина.
// Ядро — локальный банк приёмов (множественный выбор, локальная проверка).
// Плюс опциональный разбор от Фреди (AI). Экспорт: window.showManipulyaciyaGame, window.MANIPUL.
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || ''; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 300, temperature: opts.temperature == null ? 0.6 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // Банк приёмов влияния. key — короткое имя, def — суть, tell — как ловить, ex — примеры.
  var BANK = [
    { key: 'Фрейминг', def: 'Одно и то же событие описывают словами, которые заранее задают оценку, — «реформа» вместо «слом», «оптимизация» вместо «сокращение».',
      tell: 'Перескажи факт нейтральными словами. Если оценка при этом исчезла — была рамка.',
      ex: ['«Мы не сокращаем, а оптимизируем штат» — на деле людей увольняют.',
           '«Это не долг, а инвестиция в ваше будущее» — на деле кредит.'] },
    { key: 'Давление срочностью', def: 'Искусственно ограничивают время, чтобы отключить раздумье: «решай сейчас, потом будет поздно».',
      tell: 'Спроси: «что изменится завтра, если я не потороплюсь?» Если ничего — срочность была нажимом.',
      ex: ['«Только сегодня скидка 70% — завтра будет дороже».',
           '«Осталось два места, бронируйте немедленно».'] },
    { key: 'Ложная дилемма', def: 'Сложную ситуацию сводят к двум вариантам «или/или», хотя на деле есть и другие пути.',
      tell: 'Слышишь «либо так, либо…» — ищи третий вариант.',
      ex: ['«Или вы подписываете сейчас, или теряете всё».',
           '«Ты либо со мной, либо против меня».'] },
    { key: 'Ссылка на авторитет', def: 'Довод считают верным, потому что так сказал уважаемый или известный человек, — без разбора самого аргумента.',
      tell: 'Отдели «кто сказал» от «чем доказано».',
      ex: ['«Это безопасно — так сказал известный врач в эфире».',
           '«Сам генеральный директор одобрил, значит, обсуждать нечего».'] },
    { key: '«Все так делают»', def: 'Популярность выдают за правильность: «раз многие делают, значит, верно».',
      tell: '«Все» — не аргумент. Миллионы людей ошибались не раз.',
      ex: ['«Тысячи уже вложились — не будь последним».',
           '«Все берут эту рассрочку, чего сомневаться».'] },
    { key: 'Апелляция к страху', def: 'Давят на страх — за здоровье, деньги, безопасность, — чтобы человек согласился, не думая.',
      tell: 'Отдели реальную угрозу от нагнетаемой. Проверь факт, а не эмоцию.',
      ex: ['«Не застрахуетесь — потеряете всё в один день».',
           '«Без этой добавки ваш иммунитет просто рухнет».'] },
    { key: 'Скрытая аффилиация', def: 'Советуют «от души», но не раскрывают, что за этим стоит выгода, плата или свой интерес.',
      tell: 'Спроси: «кому выгодно, чтобы я согласился, и что получит советующий?»',
      ex: ['Блогер «по секрету» советует крем — и не говорит, что это реклама.',
           '«Я сам этим пользуюсь» — а в описании партнёрская ссылка.'] },
    { key: 'Раздутые обещания', def: 'Обещают больше, чем реально выполнимо, — чтобы получить согласие сейчас.',
      tell: 'Спроси: «каков проверяемый результат, а не мечта?»',
      ex: ['«Через неделю вы забудете о своих проблемах».',
           '«Гарантированно удвоите доход за месяц».'] },
    { key: 'Существенное умолчание', def: 'Говорят правду, но не всю — опускают то, что изменило бы ваше решение.',
      tell: 'Спроси: «чего мне не сказали и что бы это изменило?»',
      ex: ['«Всего 990 в месяц» — мелким шрифтом: после первого года 3000.',
           '«Бесплатная доставка» — при заказе от 5000.'] },
    { key: 'Игра на вине', def: 'Давят на чувство вины или стыда, чтобы добиться своего без аргументов.',
      tell: 'Отдели «я что-то должен» от «меня заставляют чувствовать, что должен».',
      ex: ['«Неужели вам не жалко этих детей?» — вместо аргументов.',
           '«Нормальный человек давно бы уже согласился».'] }
  ];
  var ALL_KEYS = BANK.map(function (b) { return b.key; });

  var DIFF = {
    easy: { name: 'Коротко', em: '🌱', count: 6, opts: 3 },
    norm: { name: 'Норма', em: '⚖️', count: 8, opts: 4 },
    hard: { name: 'Длинно', em: '🔥', count: 10, opts: 5 }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  var ST = { diff: 'norm', qs: [], idx: 0, picked: null, correct: 0, log: [], done: false, aiBusy: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('manipul_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, streak: 0, best: {}, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('manipul_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('manipul_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('manipul_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(diff, score) { var s = loadStats(); s.plays = (s.plays || 0) + 1; if (!s.best) s.best = {}; if (!s.best[diff] || score > s.best[diff]) s.best[diff] = score; s.streak = score >= 7 ? (s.streak || 0) + 1 : 0; s.last = (s.last || []).concat(score).slice(-10); saveStats(s); return s; }
  function avg(s) { var a = (s && s.last) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }

  function injectCSS() {
    if (document.getElementById('mpCSS')) return;
    var s = document.createElement('style'); s.id = 'mpCSS';
    s.textContent = [
      '.mp-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.mp-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.mp-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.mp-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.mp-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.mp-ch{font-weight:700;margin-bottom:8px}',
      '.mp-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.mp-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.mp-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.mp-stat b{display:block;font-size:1.35rem;font-weight:800;color:#fbbf24}',
      '.mp-stat span{font-size:.72rem;color:#9ca3af}',
      '.mp-rank{border:1px solid rgba(251,191,36,.4);background:linear-gradient(135deg,rgba(251,191,36,.14),rgba(249,115,22,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.mp-rank b{font-size:1.02rem}.mp-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      '.mp-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.mp-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.mp-chip.on{border-color:#f59e0b;background:rgba(251,191,36,.16);color:#fff}',
      '.mp-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.mp-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 16px}',
      '.mp-bar i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#f97316);transition:width .2s linear}',
      '.mp-arg{border:1px solid rgba(251,191,36,.35);background:rgba(251,191,36,.08);border-radius:14px;padding:18px;margin:0 0 16px;font-size:1.08rem;line-height:1.55;font-style:italic}',
      '.mp-q{font-weight:700;margin:0 0 10px}',
      '.mp-opt{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:14px 16px;margin:0 0 9px;font-size:1rem;color:#f2f3f5;cursor:pointer}',
      '.mp-opt:hover{border-color:rgba(251,191,36,.5)}',
      '.mp-opt.ok{border-color:#10b981;background:rgba(16,185,129,.14)}',
      '.mp-opt.no{border-color:#ef4444;background:rgba(239,68,68,.12)}',
      '.mp-opt[disabled]{cursor:default}',
      '.mp-reveal{border:1px solid rgba(249,115,22,.4);background:linear-gradient(135deg,rgba(249,115,22,.12),rgba(251,191,36,.04));border-radius:14px;padding:14px 16px;margin:0 0 14px;line-height:1.6;font-size:.95rem}',
      '.mp-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#f59e0b,#f97316);box-shadow:0 8px 22px rgba(249,115,22,.35);margin:0 0 10px}',
      '.mp-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.mp-row{display:flex;gap:10px}.mp-row>*{flex:1;margin-bottom:0}',
      '.mp-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#fbbf24}',
      '.mp-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .mp-wrap{color:#1f2430}',
      '[data-theme="light"] .mp-lead,[data-theme="light"] .mp-li{color:#4b5566}',
      '[data-theme="light"] .mp-card,[data-theme="light"] .mp-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .mp-secondary,[data-theme="light"] .mp-chip,[data-theme="light"] .mp-opt{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.mp-wrap{padding:14px 12px 96px}.mp-arg{font-size:1rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); ST.done = true; ST.diff = loadDiff();
    track('feature_opened', { feature: 'manipul' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var a = avg(s), rk = a >= 8.5 ? 'Детектор манипуляций 🕵️' : a >= 6.5 ? 'Видишь приёмы влияния' : a >= 4 ? 'Глаз намётывается' : 'Учишься ловить нажим';
      statsHtml = '<div class="mp-rank"><b>' + rk + '</b><span>Средний балл ' + (a ? a.toFixed(1) : '—') + ' · глаз на приёмы влияния крепнет</span></div>' +
        '<div class="mp-stats"><div class="mp-stat"><b>' + s.plays + '</b><span>раундов</span></div><div class="mp-stat"><b>' + (s.streak || 0) + '</b><span>серия ≥7</span></div><div class="mp-stat"><b>' + (s.best && s.best[ST.diff] || '—') + '</b><span>рекорд</span></div></div>';
    }
    c.innerHTML =
      '<div class="mp-wrap">' +
        '<button class="mp-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="mp-h1">🎭 Распознай манипуляцию</div>' +
        '<div class="mp-lead">Тренажёр из курса «Кто управляет смыслом». Фреди показывает фразу, в которой спрятан приём влияния — ты называешь, какой именно. Научишься замечать нажим и подмену и в чужой речи, и в рекламе, и в собственных решениях.</div>' +
        statsHtml +
        '<div class="mp-diff">' + DIFF_ORDER.map(function (d) { return '<div class="mp-chip' + (ST.diff === d ? ' on' : '') + '" onclick="MANIPUL.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>'; }).join('') + '</div>' +
        '<div class="mp-card"><div class="mp-ch">В игре разбираются, среди прочего</div>' +
          '<div class="mp-li">Фрейминг · Давление срочностью · Ложная дилемма · Ссылка на авторитет · «Все так делают» · Апелляция к страху · Скрытая аффилиация · Раздутые обещания · Существенное умолчание · Игра на вине.</div></div>' +
        '<button class="mp-primary" onclick="MANIPUL.start()">▶ Начать (' + DIFF[ST.diff].count + ' фраз)</button>' +
        (s.plays ? '' : '<div class="mp-flag">💡 Приём влияния — не про тему, а про то, как на вас давят. Смотри на ход: торопят, пугают, стыдят или прячут выгоду.</div>') +
      '</div>';
  }
  function setDiff(d) { if (!DIFF[d]) return; saveDiff(d); vibe(20); home(); }

  function start() {
    injectCSS();
    var n = DIFF[ST.diff].count;
    var pool = shuffle(BANK);
    ST.qs = [];
    for (var i = 0; i < n; i++) {
      var b = pool[i % pool.length];
      var ex = b.ex[Math.floor(Math.random() * b.ex.length)];
      var distract = shuffle(ALL_KEYS.filter(function (k) { return k !== b.key; })).slice(0, DIFF[ST.diff].opts - 1);
      var options = shuffle([b.key].concat(distract));
      ST.qs.push({ key: b.key, def: b.def, tell: b.tell, arg: ex, options: options });
    }
    ST.idx = 0; ST.picked = null; ST.correct = 0; ST.log = []; ST.done = false;
    track('game_round_start', { feature: 'manipul', diff: ST.diff });
    renderQ();
  }

  function renderQ() {
    var c = container(); if (!c) return;
    var q = ST.qs[ST.idx], total = ST.qs.length, answered = ST.picked !== null;
    var optsHtml = q.options.map(function (o) {
      var cls = 'mp-opt';
      if (answered) { if (o === q.key) cls += ' ok'; else if (o === ST.picked) cls += ' no'; }
      return '<button class="' + cls + '"' + (answered ? ' disabled' : '') + ' onclick="MANIPUL.pick(\'' + o.replace(/'/g, "\\'") + '\')">' + esc(o) + '</button>';
    }).join('');
    var reveal = '';
    if (answered) {
      var ok = ST.picked === q.key;
      reveal =
        '<div class="mp-reveal"><b>' + (ok ? '✅ Верно: ' : '❌ Это «' + esc(q.key) + '». ') + '</b>' + esc(q.def) + '<br><span style="color:#c8ccd4">🔎 Как ловить: ' + esc(q.tell) + '</span>' +
          '<div id="mpAI" style="margin-top:8px"></div>' +
          '<button class="mp-secondary" style="margin-top:10px" onclick="MANIPUL.explainAI()" id="mpAIbtn">🎓 Разбор от Фреди</button>' +
        '</div>' +
        '<button class="mp-primary" onclick="MANIPUL.next()">' + (ST.idx === total - 1 ? 'Итог →' : 'Дальше →') + '</button>';
    }
    c.innerHTML =
      '<div class="mp-wrap">' +
        '<div class="mp-top"><span>Фраза ' + (ST.idx + 1) + ' из ' + total + '</span><button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="MANIPUL.home()">✕ Выйти</button></div>' +
        '<div class="mp-bar"><i style="width:' + (ST.idx / total * 100) + '%"></i></div>' +
        '<div class="mp-arg">«' + esc(q.arg) + '»</div>' +
        '<div class="mp-q">Какой приём влияния здесь спрятан?</div>' +
        optsHtml + reveal +
      '</div>';
  }

  function pick(k) {
    if (ST.picked !== null) return;
    ST.picked = k;
    var q = ST.qs[ST.idx], ok = k === q.key;
    if (ok) { ST.correct++; vibe(20); } else vibe([30, 30, 30]);
    ST.log.push({ arg: q.arg, key: q.key, picked: k, ok: ok });
    renderQ();
  }

  async function explainAI() {
    if (ST.aiBusy) return; ST.aiBusy = true;
    var q = ST.qs[ST.idx], box = document.getElementById('mpAI'), btn = document.getElementById('mpAIbtn');
    if (btn) { btn.textContent = '🎓 Фреди думает…'; btn.disabled = true; }
    var txt = '';
    try {
      var r = await aiGenerate('Ты — Фреди, наставник по распознаванию манипуляций. В этой фразе спрятан приём влияния «' + q.key + '». Фраза: «' + q.arg + '». В 2–3 коротких фразах по-русски, на «ты», объясни простым языком, ПОЧЕМУ это именно «' + q.key + '», и как бы звучала честная, корректная формулировка вместо этого. Без вступлений.', { max_tokens: 260 });
      txt = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { txt = ''; }
    ST.aiBusy = false;
    if (btn) { btn.style.display = 'none'; }
    if (box) box.innerHTML = txt ? '<div style="color:#fde68a;line-height:1.55">💬 ' + esc(txt).replace(/\n/g, '<br>') + '</div>' : '<div style="color:#9ca3af">Связь подвисла — но суть уже выше. Попробуй ещё раз позже.</div>';
  }

  function next() {
    ST.idx++; ST.picked = null;
    if (ST.idx >= ST.qs.length) { finish(); return; }
    renderQ();
  }

  function finish() {
    ST.done = true;
    var total = ST.qs.length, pct = Math.round(ST.correct / total * 100);
    var score = Math.max(0, Math.min(10, Math.round(pct / 10)));
    var st = recordScore(ST.diff, score);
    var isRec = st.best[ST.diff] === score && score > 0;
    if (score >= 8) vibe([40, 40, 40]);
    var line = pct === 100 ? 'Ни один приём не прошёл 🕵️' : pct >= 70 ? 'Крепкий фильтр на нажим' : pct >= 40 ? 'Глаз намётывается — продолжай' : 'Пересмотри разборы: лови ход, а не тему';
    var wrong = ST.log.filter(function (r) { return !r.ok; });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="mp-wrap">' +
        '<div class="mp-h1" style="font-size:1.2rem">🎭 Результат</div>' +
        '<div class="mp-score">' + ST.correct + ' из ' + total + ' · ' + pct + '% · ' + score + '/10' + (isRec ? ' 🏆 рекорд!' : '') + (score >= 7 && st.streak > 1 ? ' · серия ' + st.streak + ' 🔥' : '') + '</div>' +
        '<div class="mp-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        (wrong.length ? '<div class="mp-card"><div class="mp-ch">Стоит пересмотреть</div>' + wrong.map(function (r) { return '<div class="mp-li">• «' + esc(r.arg) + '» — это <b>' + esc(r.key) + '</b> (ты выбрал «' + esc(r.picked) + '»).</div>'; }).join('') + '</div>' : '<div class="mp-card" style="text-align:center;color:#6ee7b7">Все приёмы пойманы! 🎯</div>') +
        '<div class="mp-row"><button class="mp-primary" onclick="MANIPUL.start()" style="margin:0">🔁 Ещё раунд</button><button class="mp-secondary" onclick="MANIPUL.home()">Сложность / меню</button></div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'manipul', diff: ST.diff, score: score });
  }

  window.MANIPUL = { home: home, setDiff: setDiff, start: start, pick: pick, next: next, explainAI: explainAI, getState: function () { return ST; } };
  window.showManipulyaciyaGame = home;
  console.log('✅ manipulyaciya.js loaded (тренажёр «Распознай манипуляцию»)');
})();
