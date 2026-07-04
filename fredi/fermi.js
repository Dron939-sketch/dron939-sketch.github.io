// ============================================
// fermi.js — Игра «Прикидка». Оценка порядков величин через декомпозицию (метод Ферми).
// Вопрос вида «сколько X?» → раскладываешь на множители → даёшь оценку.
// Балл — по близости порядка величины (локально). Разбор рассуждения — от Фреди (AI).
// Экспорт: window.showFermiGame, window.FERMI
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 260, temperature: opts.temperature == null ? 0.5 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // Банк. ref — эталон порядка величины. way — как принято раскладывать.
  var BANK = [
    { q: 'Сколько настройщиков пианино примерно работает в большом городе на миллионы жителей?', ref: 200, unit: 'человек',
      way: 'Население → сколько пианино (доля семей × заведений) → как часто настраивают в год → сколько успевает один мастер за год.' },
    { q: 'Сколько мячей для гольфа поместится внутри школьного автобуса?', ref: 500000, unit: 'мячей',
      way: 'Объём автобуса (д×ш×в) → объём мяча → делим, минус упаковочные потери (~30%).' },
    { q: 'Сколько волос примерно на голове взрослого человека?', ref: 100000, unit: 'волос',
      way: 'Площадь волосистой части головы → плотность волос на см² → перемножить.' },
    { q: 'Сколько раз сердце человека бьётся за всю жизнь (75 лет)?', ref: 2700000000, unit: 'ударов',
      way: '~70 ударов/мин × 60 × 24 × 365 × 75 лет.' },
    { q: 'Сколько литров воды человек выпивает за всю жизнь (75 лет)?', ref: 55000, unit: 'литров',
      way: '~2 литра в день × 365 × 75 лет.' },
    { q: 'Сколько слов в среднем человек произносит за один день?', ref: 16000, unit: 'слов',
      way: 'Часы бодрствования говорения × слов в минуту (~100–150) × доля времени, когда реально говоришь.' },
    { q: 'Сколько вдохов человек делает за одни сутки?', ref: 20000, unit: 'вдохов',
      way: '~14 вдохов/мин × 60 × 24 часа.' },
    { q: 'Сколько листов бумаги А4 нужно, чтобы полностью выстелить футбольное поле?', ref: 114000, unit: 'листов',
      way: 'Площадь поля (~105×68 м) → площадь листа А4 (~0,06 м²) → делим.' },
    { q: 'Сколько минут человек проводит во сне за один год?', ref: 175000, unit: 'минут',
      way: '~8 часов × 60 минут × 365 дней.' },
    { q: 'Сколько зёрен кофе уходит примерно на одну чашку эспрессо?', ref: 70, unit: 'зёрен',
      way: '~7 грамм кофе на порцию → вес одного зерна (~0,1 г) → делим.' }
  ];

  var DIFF = {
    easy: { name: '3 вопроса', em: '🌱', count: 3 },
    norm: { name: '4 вопроса', em: '⚖️', count: 4 },
    hard: { name: '5 вопросов', em: '🔥', count: 5 }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  var ST = { diff: 'norm', qs: [], idx: 0, revealed: false, lastVal: 0, lastScore: 0, scores: [], reason: '', done: false, aiBusy: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('fermi_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, streak: 0, best: {}, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('fermi_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('fermi_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('fermi_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(diff, score) { var s = loadStats(); s.plays = (s.plays || 0) + 1; if (!s.best) s.best = {}; if (!s.best[diff] || score > s.best[diff]) s.best[diff] = score; s.streak = score >= 7 ? (s.streak || 0) + 1 : 0; s.last = (s.last || []).concat(score).slice(-10); saveStats(s); return s; }
  function avg(s) { var a = (s && s.last) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }

  // разбор ввода: 500000, "500 тыс", "0.5 млн", "2.7 млрд", "5e5"
  function parseNum(raw) {
    var s = String(raw || '').toLowerCase().replace(/\s+/g, '').replace(',', '.');
    if (!s) return NaN;
    var mult = 1;
    if (/млрд|миллиард|billion|b\b/.test(s)) mult = 1e9;
    else if (/млн|миллион|million|m\b/.test(s)) mult = 1e6;
    else if (/тыс|тысяч|k\b|к$/.test(s)) mult = 1e3;
    var m = s.match(/-?\d+(\.\d+)?(e-?\d+)?/);
    if (!m) return NaN;
    var n = parseFloat(m[0]);
    if (!isFinite(n)) return NaN;
    return n * mult;
  }
  function fmt(n) {
    n = Math.round(n);
    if (n >= 1e9) return (n / 1e9).toFixed(n % 1e9 ? 1 : 0).replace('.0', '') + ' млрд';
    if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.0', '') + ' млн';
    if (n >= 1e3) return (n / 1e3).toFixed(n % 1e3 && n < 1e5 ? 1 : 0).replace('.0', '') + ' тыс';
    return String(n);
  }
  function scoreFor(val, ref) {
    if (!(val > 0)) return 0;
    var err = Math.abs(Math.log(val) / Math.LN10 - Math.log(ref) / Math.LN10); // порядки величины
    return clamp(Math.round(10 - err * 3.5), 0, 10);
  }

  function injectCSS() {
    if (document.getElementById('feCSS')) return;
    var s = document.createElement('style'); s.id = 'feCSS';
    s.textContent = [
      '.fe-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.fe-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.fe-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.fe-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.fe-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.fe-ch{font-weight:700;margin-bottom:8px}',
      '.fe-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.fe-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.fe-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.fe-stat b{display:block;font-size:1.35rem;font-weight:800;color:#22d3ee}',
      '.fe-stat span{font-size:.72rem;color:#9ca3af}',
      '.fe-rank{border:1px solid rgba(34,211,238,.4);background:linear-gradient(135deg,rgba(34,211,238,.14),rgba(59,130,246,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.fe-rank b{font-size:1.02rem}.fe-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      '.fe-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.fe-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.fe-chip.on{border-color:#06b6d4;background:rgba(34,211,238,.16);color:#fff}',
      '.fe-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.fe-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 16px}',
      '.fe-bar i{display:block;height:100%;background:linear-gradient(90deg,#06b6d4,#3b82f6);transition:width .2s linear}',
      '.fe-q{font-size:1.3rem;font-weight:700;line-height:1.4;margin:6px 0 14px}',
      '.fe-ta{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:12px;font-size:.98rem;color:#f2f3f5;font-family:inherit;resize:none;min-height:80px;margin:0 0 10px}',
      '.fe-ta:focus{outline:none;border-color:#06b6d4}',
      '.fe-inp{width:100%;box-sizing:border-box;border:2px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:14px;font-size:1.4rem;text-align:center;color:#f2f3f5;font-family:inherit;font-weight:700;margin:0 0 10px}',
      '.fe-inp:focus{outline:none;border-color:#06b6d4}',
      '.fe-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#06b6d4,#3b82f6);box-shadow:0 8px 22px rgba(6,182,212,.35);margin:0 0 10px}',
      '.fe-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.fe-row{display:flex;gap:10px}.fe-row>*{flex:1;margin-bottom:0}',
      '.fe-reveal{border:1px solid rgba(34,211,238,.4);background:linear-gradient(135deg,rgba(34,211,238,.12),rgba(59,130,246,.04));border-radius:14px;padding:16px;margin:0 0 12px;line-height:1.6}',
      '.fe-big{font-size:1.4rem;font-weight:800;text-align:center;margin:4px 0}',
      '.fe-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#22d3ee}',
      '.fe-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .fe-wrap{color:#1f2430}',
      '[data-theme="light"] .fe-lead,[data-theme="light"] .fe-li{color:#4b5566}',
      '[data-theme="light"] .fe-card,[data-theme="light"] .fe-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .fe-secondary,[data-theme="light"] .fe-chip,[data-theme="light"] .fe-ta,[data-theme="light"] .fe-inp{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.fe-wrap{padding:14px 12px 96px}.fe-q{font-size:1.15rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); ST.done = true; ST.diff = loadDiff();
    track('feature_opened', { feature: 'fermi' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var a = avg(s), rk = a >= 8.5 ? 'Оценщик от бога 📐' : a >= 6.5 ? 'Чувство масштаба' : a >= 4 ? 'Прикидка растёт' : 'Учишься раскладывать';
      statsHtml = '<div class="fe-rank"><b>' + rk + '</b><span>Средний балл ' + (a ? a.toFixed(1) : '—') + ' · чувство порядка величин крепнет</span></div>' +
        '<div class="fe-stats"><div class="fe-stat"><b>' + s.plays + '</b><span>раундов</span></div><div class="fe-stat"><b>' + (s.streak || 0) + '</b><span>серия ≥7</span></div><div class="fe-stat"><b>' + (s.best && s.best[ST.diff] || '—') + '</b><span>рекорд</span></div></div>';
    }
    c.innerHTML =
      '<div class="fe-wrap">' +
        '<button class="fe-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="fe-h1">📐 Прикидка · метод Ферми</div>' +
        '<div class="fe-lead">Навык оценивать то, чего не знаешь точно. Физик Энрико Ферми умел прикинуть почти любую величину, раскладывая её на простые множители. Здесь вопросы вроде «сколько мячей влезет в автобус?» — не гугли, а <b>разложи на шаги и оцени</b>. Балл — за близость порядка величины, а не за точную цифру.</div>' +
        statsHtml +
        '<div class="fe-diff">' + DIFF_ORDER.map(function (d) { return '<div class="fe-chip' + (ST.diff === d ? ' on' : '') + '" onclick="FERMI.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>'; }).join('') + '</div>' +
        '<div class="fe-card"><div class="fe-ch">Как прикидывать</div>' +
          '<div class="fe-li">1. Разбей вопрос на цепочку: «население → доля → частота → на одного».</div>' +
          '<div class="fe-li">2. Для каждого множителя возьми грубую, но разумную цифру.</div>' +
          '<div class="fe-li">3. Перемножь. Не бойся ошибиться в разы — важен порядок.</div></div>' +
        '<button class="fe-primary" onclick="FERMI.start()">▶ Начать</button>' +
        (s.plays ? '' : '<div class="fe-flag">💡 Число можно писать как есть (500000) или словами: «500 тыс», «2.7 млрд», «5e5».</div>') +
      '</div>';
  }
  function setDiff(d) { if (!DIFF[d]) return; saveDiff(d); vibe(20); home(); }

  function start() {
    injectCSS();
    ST.qs = shuffle(BANK).slice(0, DIFF[ST.diff].count);
    ST.idx = 0; ST.revealed = false; ST.scores = []; ST.reason = ''; ST.done = false;
    track('game_round_start', { feature: 'fermi', diff: ST.diff });
    renderQ();
  }

  function renderQ() {
    var c = container(); if (!c) return;
    var q = ST.qs[ST.idx], total = ST.qs.length;
    if (!ST.revealed) {
      c.innerHTML =
        '<div class="fe-wrap">' +
          '<div class="fe-top"><span>Вопрос ' + (ST.idx + 1) + ' из ' + total + '</span><button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="FERMI.home()">✕ Выйти</button></div>' +
          '<div class="fe-bar"><i style="width:' + (ST.idx / total * 100) + '%"></i></div>' +
          '<div class="fe-q">' + esc(q.q) + '</div>' +
          '<textarea class="fe-ta" id="feReason" placeholder="Как ты прикидываешь? Распиши шаги (необязательно, но полезно)…"></textarea>' +
          '<input class="fe-inp" id="feNum" inputmode="text" autocomplete="off" placeholder="итоговая оценка">' +
          '<button class="fe-primary" onclick="FERMI.submit()">Проверить →</button>' +
          '<div class="fe-flag">Пиши число как удобно: 500000 · «500 тыс» · «2 млн» · «5e5»</div>' +
        '</div>';
      var inp = document.getElementById('feNum'); if (inp && inp.focus) { try { inp.focus(); } catch (e) {} }
    } else {
      var val = ST.lastVal, sc = ST.lastScore, ratio = val > 0 ? (val >= q.ref ? val / q.ref : q.ref / val) : 0;
      var closeness = sc >= 9 ? 'В точку по порядку! 🎯' : sc >= 6 ? 'Близко — верный масштаб' : sc >= 3 ? 'Мимо на порядок-другой' : 'Далеко по масштабу';
      c.innerHTML =
        '<div class="fe-wrap">' +
          '<div class="fe-top"><span>Вопрос ' + (ST.idx + 1) + ' из ' + total + '</span><button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="FERMI.home()">✕ Выйти</button></div>' +
          '<div class="fe-q" style="font-size:1.1rem">' + esc(q.q) + '</div>' +
          '<div class="fe-reveal">' +
            '<div class="fe-big">Твоя оценка: ' + esc(fmt(val)) + '</div>' +
            '<div class="fe-big" style="color:#22d3ee">Эталон: ~' + esc(fmt(q.ref)) + ' ' + esc(q.unit) + '</div>' +
            '<div style="text-align:center;color:#c8ccd4;margin-top:6px">' + esc(closeness) + (ratio ? ' (разница ~×' + (ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)) + ')' : '') + '</div>' +
          '</div>' +
          '<div class="fe-card" style="font-size:.92rem;color:#a7adba">🧩 Как раскладывают: ' + esc(q.way) + '</div>' +
          '<div id="feAI"></div>' +
          '<button class="fe-secondary" id="feAIbtn" onclick="FERMI.critique()">🎓 Разбор моего хода от Фреди</button>' +
          '<button class="fe-primary" onclick="FERMI.next()">' + (ST.idx === total - 1 ? 'Итог →' : 'Дальше →') + '</button>' +
        '</div>';
    }
  }

  function submit() {
    if (ST.revealed) return;
    var q = ST.qs[ST.idx];
    var rEl = document.getElementById('feReason'), nEl = document.getElementById('feNum');
    ST.reason = rEl ? String(rEl.value || '').trim() : '';
    var val = parseNum(nEl ? nEl.value : '');
    if (!(val > 0)) { toast('Введи числовую оценку', 'info'); return; }
    ST.lastVal = val; ST.lastScore = scoreFor(val, q.ref);
    ST.scores.push(ST.lastScore);
    ST.revealed = true;
    if (ST.lastScore >= 8) vibe([30, 30, 30]); else vibe(20);
    renderQ();
  }

  async function critique() {
    if (ST.aiBusy) return; ST.aiBusy = true;
    var q = ST.qs[ST.idx], box = document.getElementById('feAI'), btn = document.getElementById('feAIbtn');
    if (btn) { btn.textContent = '🎓 Фреди думает…'; btn.disabled = true; }
    var txt = '';
    try {
      var p = 'Ты — Фреди, наставник по оценкам методом Ферми. Вопрос: «' + q.q + '». Разумный эталон: около ' + q.ref + ' ' + q.unit + '. ' +
        (ST.reason ? 'Игрок так рассуждал: «' + ST.reason + '». Его итог: ' + Math.round(ST.lastVal) + '. ' : 'Игрок дал итог ' + Math.round(ST.lastVal) + ' без пояснений. ') +
        'В 2–4 коротких фразах по-русски, на «ты»: если рассуждение есть — где в цепочке множителей он ошибся или что упустил; если пояснений нет — покажи короткую образцовую цепочку прикидки. Без вступлений, по делу.';
      var r = await aiGenerate(p, { max_tokens: 280 });
      txt = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { txt = ''; }
    ST.aiBusy = false;
    if (btn) btn.style.display = 'none';
    if (box) box.innerHTML = txt ? '<div class="fe-card" style="border-color:rgba(34,211,238,.35)">💬 ' + esc(txt).replace(/\n/g, '<br>') + '</div>' : '<div class="fe-card" style="color:#9ca3af">Связь подвисла — но эталон и схема разбора уже выше.</div>';
  }

  function next() {
    ST.idx++; ST.revealed = false; ST.reason = '';
    if (ST.idx >= ST.qs.length) { finish(); return; }
    renderQ();
  }

  function finish() {
    ST.done = true;
    var total = ST.scores.length;
    var score = total ? Math.round(ST.scores.reduce(function (a, b) { return a + b; }, 0) / total) : 0;
    var st = recordScore(ST.diff, score);
    var isRec = st.best[ST.diff] === score && score > 0;
    if (score >= 8) vibe([40, 40, 40]);
    var line = score >= 9 ? 'Отличное чувство масштаба 📐' : score >= 6 ? 'Хорошо ловишь порядок величин' : score >= 3 ? 'Тренируй декомпозицию — раскладывай мельче' : 'Не угадывай сразу — иди по цепочке множителей';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="fe-wrap">' +
        '<div class="fe-h1" style="font-size:1.2rem">📐 Итог прикидки</div>' +
        '<div class="fe-score">Средний балл ' + score + '/10' + (isRec ? ' 🏆 рекорд!' : '') + (score >= 7 && st.streak > 1 ? ' · серия ' + st.streak + ' 🔥' : '') + '</div>' +
        '<div class="fe-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        '<div class="fe-card" style="color:#a7adba;font-size:.9rem">💡 Метод Ферми не про «угадать», а про то, чтобы не ошибиться в 100 раз. Даже грубая цепочка множителей держит тебя в пределах порядка — этого хватает для 90% реальных решений.</div>' +
        '<div class="fe-row"><button class="fe-primary" onclick="FERMI.start()" style="margin:0">🔁 Ещё раунд</button><button class="fe-secondary" onclick="FERMI.home()">Сложность / меню</button></div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'fermi', diff: ST.diff, score: score });
  }

  window.FERMI = { home: home, setDiff: setDiff, start: start, submit: submit, critique: critique, next: next, getState: function () { return ST; }, _parse: parseNum, _score: scoreFor };
  window.showFermiGame = home;
  console.log('✅ fermi.js loaded (игра «Прикидка» / Ферми)');
})();
