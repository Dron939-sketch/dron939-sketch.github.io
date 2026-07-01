// ============================================
// schet.js — Игра «Устный счёт». Скорость и числовая беглость + приёмы быстрого счёта.
// Серия примеров на время: сложение/вычитание/умножение/проценты.
// Проверка локальная, без AI.
// Экспорт: window.showSchetGame, window.SCHET
// ============================================
(function () {
  "use strict";

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function now() { return Date.now(); }

  var DIFF = {
    easy: { name: 'Разминка', em: '🌱', count: 10 },
    norm: { name: 'Норма', em: '⚖️', count: 12 },
    hard: { name: 'Челлендж', em: '🔥', count: 14 }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  var ST = { diff: 'norm', probs: [], idx: 0, correct: 0, t0: 0, tick: null, done: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('schet_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, streak: 0, best: {}, last: [], bestTime: {} }; }
  function saveStats(s) { try { localStorage.setItem('schet_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('schet_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('schet_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(diff, score, secs) {
    var s = loadStats();
    s.plays = (s.plays || 0) + 1;
    if (!s.best) s.best = {}; if (!s.bestTime) s.bestTime = {};
    if (!s.best[diff] || score > s.best[diff]) s.best[diff] = score;
    if (score >= 8 && (!s.bestTime[diff] || secs < s.bestTime[diff])) s.bestTime[diff] = secs;
    s.streak = score >= 7 ? (s.streak || 0) + 1 : 0;
    s.last = (s.last || []).concat(score).slice(-10);
    saveStats(s); return s;
  }
  function avg(s) { var a = (s && s.last) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }

  // ---------- генерация примеров ----------
  function genProb(diff) {
    var types = diff === 'easy' ? ['add', 'sub', 'mul'] : diff === 'norm' ? ['add', 'sub', 'mul', 'pct'] : ['add', 'sub', 'mul', 'pct', 'sq'];
    var t = pick(types), a, b, text, ans;
    if (t === 'add') {
      if (diff === 'easy') { a = ri(10, 89); b = ri(10, 89); } else if (diff === 'norm') { a = ri(20, 180); b = ri(20, 180); } else { a = ri(120, 880); b = ri(120, 880); }
      text = a + ' + ' + b; ans = a + b;
    } else if (t === 'sub') {
      if (diff === 'easy') { a = ri(30, 99); b = ri(10, a); } else if (diff === 'norm') { a = ri(60, 250); b = ri(15, a); } else { a = ri(200, 950); b = ri(50, a); }
      text = a + ' − ' + b; ans = a - b;
    } else if (t === 'mul') {
      if (diff === 'easy') { a = ri(2, 9); b = ri(2, 9); } else if (diff === 'norm') { a = ri(12, 29); b = ri(3, 9); } else { a = ri(13, 39); b = ri(11, 19); }
      text = a + ' × ' + b; ans = a * b;
    } else if (t === 'sq') {
      a = ri(11, diff === 'hard' ? 29 : 19); text = a + '²'; ans = a * a;
    } else { // pct
      var p = pick(diff === 'norm' ? [10, 20, 25, 50] : [10, 15, 20, 25, 40, 75]);
      var base = ri(4, 40) * (p === 15 ? 20 : p === 75 || p === 25 ? 4 : p === 40 ? 5 : 10);
      text = p + '% от ' + base; ans = Math.round(p / 100 * base);
    }
    return { text: text, ans: ans };
  }

  function injectCSS() {
    if (document.getElementById('scCSS')) return;
    var s = document.createElement('style'); s.id = 'scCSS';
    s.textContent = [
      '.sc-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.sc-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.sc-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.sc-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.sc-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.sc-ch{font-weight:700;margin-bottom:8px}',
      '.sc-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.sc-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.sc-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.sc-stat b{display:block;font-size:1.35rem;font-weight:800;color:#fbbf24}',
      '.sc-stat span{font-size:.72rem;color:#9ca3af}',
      '.sc-rank{border:1px solid rgba(251,191,36,.4);background:linear-gradient(135deg,rgba(251,191,36,.14),rgba(239,68,68,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.sc-rank b{font-size:1.02rem}.sc-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      '.sc-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.sc-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.sc-chip.on{border-color:#f59e0b;background:rgba(251,191,36,.16);color:#fff}',
      '.sc-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.sc-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 18px}',
      '.sc-bar i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#ef4444);transition:width .2s linear}',
      '.sc-q{text-align:center;font-size:3rem;font-weight:800;margin:14px 0 16px;font-variant-numeric:tabular-nums}',
      '.sc-inp{width:100%;box-sizing:border-box;border:2px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:14px;font-size:1.6rem;text-align:center;color:#f2f3f5;font-family:inherit;font-weight:700}',
      '.sc-inp:focus{outline:none;border-color:#f59e0b}',
      '.sc-inp.ok{border-color:#10b981}.sc-inp.no{border-color:#ef4444}',
      '.sc-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#f59e0b,#ef4444);box-shadow:0 8px 22px rgba(245,158,11,.35);margin:10px 0 10px}',
      '.sc-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.sc-row{display:flex;gap:10px}.sc-row>*{flex:1;margin-bottom:0}',
      '.sc-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#fbbf24}',
      '.sc-res{display:flex;justify-content:space-between;border-radius:10px;padding:9px 14px;margin:0 0 6px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-size:.92rem}',
      '.sc-res.no{border-color:rgba(239,68,68,.3)}',
      '.sc-res .corr{color:#6ee7b7}',
      '.sc-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .sc-wrap{color:#1f2430}',
      '[data-theme="light"] .sc-lead,[data-theme="light"] .sc-li{color:#4b5566}',
      '[data-theme="light"] .sc-card,[data-theme="light"] .sc-stat,[data-theme="light"] .sc-res{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .sc-inp{background:#f7f8fa;border-color:rgba(0,0,0,.12);color:#1f2430}',
      '[data-theme="light"] .sc-secondary,[data-theme="light"] .sc-chip{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.sc-wrap{padding:14px 12px 96px}.sc-q{font-size:2.4rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); stopAll(); ST.diff = loadDiff();
    track('feature_opened', { feature: 'schet' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var a = avg(s), rk = a >= 8.5 ? 'Считаешь как калькулятор 🧮' : a >= 6.5 ? 'Быстрый счёт' : a >= 4 ? 'Разгоняешься' : 'Учишь приёмы';
      var bt = s.bestTime && s.bestTime[ST.diff];
      statsHtml = '<div class="sc-rank"><b>' + rk + '</b><span>Средний балл ' + (a ? a.toFixed(1) : '—') + (bt ? ' · лучшее время ' + bt + ' с' : '') + '</span></div>' +
        '<div class="sc-stats"><div class="sc-stat"><b>' + s.plays + '</b><span>раундов</span></div><div class="sc-stat"><b>' + (s.streak || 0) + '</b><span>серия ≥7</span></div><div class="sc-stat"><b>' + (s.best && s.best[ST.diff] || '—') + '</b><span>рекорд</span></div></div>';
    }
    c.innerHTML =
      '<div class="sc-wrap">' +
        '<button class="sc-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="sc-h1">⚡ Устный счёт</div>' +
        '<div class="sc-lead">Беглый счёт в уме — база ясного мышления: цифры перестают пугать, решения принимаешь быстрее. Здесь серия примеров на время. Не столбиком, а приёмами — они ниже.</div>' +
        statsHtml +
        '<div class="sc-diff">' + DIFF_ORDER.map(function (d) { return '<div class="sc-chip' + (ST.diff === d ? ' on' : '') + '" onclick="SCHET.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>'; }).join('') + '</div>' +
        '<div class="sc-card"><div class="sc-ch">Приёмы быстрого счёта</div>' +
          '<div class="sc-li">• <b>Разбивай:</b> 34 × 7 = 30×7 + 4×7 = 210 + 28 = 238.</div>' +
          '<div class="sc-li">• <b>×5</b> = ×10 ÷2. <b>×11</b> двузначного: 35×11 → 3_(3+5)_5 = 385.</div>' +
          '<div class="sc-li">• <b>Вычитание через круглое:</b> 83 − 29 = 83 − 30 + 1 = 54.</div>' +
          '<div class="sc-li">• <b>Проценты:</b> 10% — сдвинь запятую; 20% = ÷5; 25% = ÷4.</div></div>' +
        '<button class="sc-primary" onclick="SCHET.start()">▶ Начать (' + DIFF[ST.diff].count + ' примеров)</button>' +
        (s.plays ? '' : '<div class="sc-flag">💡 Скорость приходит от приёмов, а не от «быстрее думать». Сначала способ — потом темп.</div>') +
      '</div>';
  }
  function setDiff(d) { if (!DIFF[d]) return; saveDiff(d); vibe(20); home(); }

  function start() {
    injectCSS();
    var n = DIFF[ST.diff].count;
    ST.probs = []; for (var i = 0; i < n; i++) ST.probs.push(genProb(ST.diff));
    ST.idx = 0; ST.correct = 0; ST.done = false; ST.t0 = now();
    ST.answers = [];
    track('game_round_start', { feature: 'schet', diff: ST.diff });
    renderQ();
    if (ST.tick) clearInterval(ST.tick);
    ST.tick = setInterval(function () { var el = document.getElementById('scTime'); if (el) el.textContent = Math.floor((now() - ST.t0) / 1000) + ' с'; }, 500);
  }

  function renderQ() {
    var c = container(); if (!c) return;
    var p = ST.probs[ST.idx], total = ST.probs.length;
    c.innerHTML =
      '<div class="sc-wrap">' +
        '<div class="sc-top"><span>Пример ' + (ST.idx + 1) + ' из ' + total + '</span><span id="scTime">0 с</span></div>' +
        '<div class="sc-bar"><i style="width:' + (ST.idx / total * 100) + '%"></i></div>' +
        '<div class="sc-q">' + esc(p.text) + ' =</div>' +
        '<input class="sc-inp" id="scIn" inputmode="numeric" autocomplete="off" placeholder="?" onkeydown="if(event.key===\'Enter\')SCHET.answer()">' +
        '<button class="sc-primary" onclick="SCHET.answer()">Ответить →</button>' +
      '</div>';
    var inp = document.getElementById('scIn'); if (inp && inp.focus) { try { inp.focus(); } catch (e) {} }
  }

  function answer() {
    if (ST.done) return;
    var inp = document.getElementById('scIn');
    var raw = inp ? String(inp.value).replace(',', '.').replace(/[^0-9.\-]/g, '') : '';
    if (raw === '' || raw === '-') { toast('Введи ответ', 'info'); return; }
    var got = Math.round(parseFloat(raw));
    var p = ST.probs[ST.idx], ok = got === p.ans;
    if (ok) { ST.correct++; vibe(20); } else { vibe([30, 30, 30]); }
    ST.answers.push({ text: p.text, ans: p.ans, got: got, ok: ok });
    if (inp) inp.classList.add(ok ? 'ok' : 'no');
    ST.idx++;
    if (ST.idx >= ST.probs.length) { finish(); return; }
    renderQ();
  }

  function finish() {
    ST.done = true;
    if (ST.tick) { clearInterval(ST.tick); ST.tick = null; }
    var total = ST.probs.length, secs = Math.max(1, Math.round((now() - ST.t0) / 1000));
    var pct = Math.round(ST.correct / total * 100);
    var score = Math.max(0, Math.min(10, Math.round(pct / 10)));
    var st = recordScore(ST.diff, score, secs);
    var isRec = st.best[ST.diff] === score && score > 0;
    if (score >= 8) vibe([40, 40, 40]);
    var wrong = ST.answers.filter(function (a) { return !a.ok; });
    var line = pct === 100 ? 'Чисто! ' + secs + ' с 🧮' : pct >= 70 ? 'Хорошо — теперь на скорость' : pct >= 40 ? 'Считаешь, но спешишь. Применяй приёмы' : 'Не гонись — сначала способ, потом темп';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sc-wrap">' +
        '<div class="sc-h1" style="font-size:1.2rem">⚡ Результат — ' + esc(DIFF[ST.diff].name) + '</div>' +
        '<div class="sc-score">' + ST.correct + ' из ' + total + ' · ' + secs + ' с · счёт ' + score + '/10' + (isRec ? ' 🏆 рекорд!' : '') + (score >= 7 && st.streak > 1 ? ' · серия ' + st.streak + ' 🔥' : '') + '</div>' +
        '<div class="sc-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        (wrong.length ? '<div class="sc-card"><div class="sc-ch">Разбор ошибок</div>' + wrong.map(function (a) { return '<div class="sc-res no"><span>' + esc(a.text) + ' = <b>' + a.got + '</b></span><span class="corr">верно: ' + a.ans + '</span></div>'; }).join('') + '</div>' : '<div class="sc-card" style="text-align:center;color:#6ee7b7">Без ошибок! 🎯</div>') +
        '<div class="sc-row"><button class="sc-primary" onclick="SCHET.start()" style="margin:0">🔁 Ещё раунд</button><button class="sc-secondary" onclick="SCHET.home()">Сложность / меню</button></div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'schet', diff: ST.diff, score: score, secs: secs });
  }

  function stopAll() { if (ST.tick) { clearInterval(ST.tick); ST.tick = null; } }

  window.SCHET = { home: home, setDiff: setDiff, start: start, answer: answer, getState: function () { return ST; } };
  window.showSchetGame = home;
  console.log('✅ schet.js loaded (игра «Устный счёт»)');
})();
