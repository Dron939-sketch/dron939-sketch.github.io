// ============================================
// fnback.js — Игра «Фокус» (N-back). Тренажёр рабочей памяти и концентрации.
// Идёт поток символов по одному. Жми «Совпадение», когда текущий символ
// совпадает с тем, что был N шагов назад. N = уровень сложности (1/2/3).
// Классическая парадигма n-back. Проверка локальная, без AI.
// Экспорт: window.showFokusGame, window.FOKUS
// ============================================
(function () {
  "use strict";

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  var SYMS = ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠'];

  var DIFF = {
    easy: { name: '1-назад', em: '🌱', n: 1, step: 2800, len: 18 },
    norm: { name: '2-назад', em: '⚖️', n: 2, step: 2500, len: 22 },
    hard: { name: '3-назад', em: '🔥', n: 3, step: 2200, len: 26 }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  var ST = { diff: 'norm', seq: [], idx: 0, n: 2, step: 2500, timer: null,
             responded: false, running: false, hits: 0, misses: 0, fa: 0, cr: 0, matches: 0 };

  // ---------- прогресс ----------
  function loadStats() { try { var s = JSON.parse(localStorage.getItem('fokus_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, streak: 0, best: {}, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('fokus_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('fokus_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('fokus_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(diff, score) {
    var s = loadStats();
    s.plays = (s.plays || 0) + 1;
    if (!s.best) s.best = {};
    if (!s.best[diff] || score > s.best[diff]) s.best[diff] = score;
    s.streak = score >= 7 ? (s.streak || 0) + 1 : 0;
    s.last = (s.last || []).concat(score).slice(-10);
    saveStats(s); return s;
  }
  function avg(s) { var a = (s && s.last) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }

  function injectCSS() {
    if (document.getElementById('fkCSS')) return;
    var s = document.createElement('style'); s.id = 'fkCSS';
    s.textContent = [
      '.fk-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.fk-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.fk-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.fk-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.fk-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.fk-ch{font-weight:700;margin-bottom:8px}',
      '.fk-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.fk-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.fk-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.fk-stat b{display:block;font-size:1.35rem;font-weight:800;color:#a78bfa}',
      '.fk-stat span{font-size:.72rem;color:#9ca3af}',
      '.fk-rank{border:1px solid rgba(139,92,246,.4);background:linear-gradient(135deg,rgba(139,92,246,.14),rgba(59,130,246,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.fk-rank b{font-size:1.02rem}.fk-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      '.fk-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.fk-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.fk-chip.on{border-color:#8b5cf6;background:rgba(139,92,246,.16);color:#fff}',
      '.fk-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 18px}',
      '.fk-bar i{display:block;height:100%;background:linear-gradient(90deg,#8b5cf6,#3b82f6);transition:width .2s linear}',
      '.fk-stage{text-align:center;font-size:6rem;line-height:1;margin:18px 0 8px;user-select:none;transition:transform .1s ease}',
      '.fk-stage.flash{transform:scale(1.12)}',
      '.fk-nback{text-align:center;color:#a78bfa;font-weight:700;margin:0 0 16px;font-size:1.05rem}',
      '.fk-hint{text-align:center;color:#9ca3af;font-size:.85rem;margin:8px 0 16px;min-height:1.1em}',
      '.fk-match{display:block;width:100%;border:none;border-radius:16px;padding:22px;font-size:1.2rem;font-weight:800;color:#fff;cursor:pointer;background:linear-gradient(135deg,#8b5cf6,#3b82f6);box-shadow:0 8px 22px rgba(139,92,246,.4);margin:0 0 10px;transition:transform .1s ease}',
      '.fk-match:active{transform:scale(.97)}',
      '.fk-match.hit{background:linear-gradient(135deg,#10b981,#059669)}',
      '.fk-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#8b5cf6,#3b82f6);box-shadow:0 8px 22px rgba(139,92,246,.4);margin:0 0 10px}',
      '.fk-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.fk-danger{display:block;width:100%;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);border-radius:12px;padding:12px;font-size:.9rem;font-weight:600;color:#fca5a5;cursor:pointer;margin:0 0 10px}',
      '.fk-row{display:flex;gap:10px}.fk-row>*{flex:1;margin-bottom:0}',
      '.fk-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#a78bfa}',
      '.fk-res{display:flex;justify-content:space-between;border-radius:10px;padding:10px 14px;margin:0 0 8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-size:.95rem}',
      '.fk-res b{color:#f2f3f5}',
      '.fk-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .fk-wrap{color:#1f2430}',
      '[data-theme="light"] .fk-lead,[data-theme="light"] .fk-li{color:#4b5566}',
      '[data-theme="light"] .fk-card,[data-theme="light"] .fk-stat,[data-theme="light"] .fk-res{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .fk-secondary,[data-theme="light"] .fk-chip{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.fk-wrap{padding:14px 12px 96px}.fk-stage{font-size:4.6rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); stopAll(); ST.diff = loadDiff();
    track('feature_opened', { feature: 'fokus' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var a = avg(s), rk = a >= 8.5 ? 'Острый фокус 🦅' : a >= 6.5 ? 'Собранное внимание' : a >= 4 ? 'Фокус крепнет' : 'Разгоняешь внимание';
      statsHtml = '<div class="fk-rank"><b>' + rk + '</b><span>Средний балл ' + (a ? a.toFixed(1) : '—') + ' · рабочая память тренируется</span></div>' +
        '<div class="fk-stats"><div class="fk-stat"><b>' + s.plays + '</b><span>раундов</span></div><div class="fk-stat"><b>' + (s.streak || 0) + '</b><span>серия ≥7</span></div><div class="fk-stat"><b>' + (s.best && s.best[ST.diff] || '—') + '</b><span>рекорд ' + DIFF[ST.diff].name + '</span></div></div>';
    }
    c.innerHTML =
      '<div class="fk-wrap">' +
        '<button class="fk-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="fk-h1">🎯 Фокус · N-back</div>' +
        '<div class="fk-lead">Тренажёр рабочей памяти — «оперативки» ума. По одному мелькают символы. Твоя задача: жать «Совпадение», когда текущий символ совпадает с тем, что был <b>N шагов назад</b>. Приходится удерживать и обновлять цепочку в голове — именно это качает концентрацию и рабочую память.</div>' +
        statsHtml +
        '<div class="fk-card"><div class="fk-ch">Выбери сложность (это и есть N)</div>' +
          '<div class="fk-diff" style="margin-bottom:0">' + DIFF_ORDER.map(function (d) { return '<div class="fk-chip' + (ST.diff === d ? ' on' : '') + '" onclick="FOKUS.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>'; }).join('') + '</div></div>' +
        '<div class="fk-card"><div class="fk-ch">Как играть</div>' +
          '<div class="fk-li">1. Символы идут потоком. Держи в уме несколько последних.</div>' +
          '<div class="fk-li">2. Если нынешний = тому, что был <b>' + DIFF[ST.diff].n + '</b> шаг(а) назад — жми «Совпадение».</div>' +
          '<div class="fk-li">3. Не жми зря: ложное срабатывание снижает балл так же, как пропуск.</div></div>' +
        '<button class="fk-primary" onclick="FOKUS.start()">▶ Начать (' + DIFF[ST.diff].len + ' символов)</button>' +
        (s.plays ? '' : '<div class="fk-flag">💡 Секрет: не пытайся «проговаривать» весь ряд. Держи скользящее окно из последних N и обновляй его.</div>') +
      '</div>';
  }
  function setDiff(d) { if (!DIFF[d]) return; saveDiff(d); vibe(20); home(); }

  function genSeq(n, L) {
    var seq = [];
    for (var i = 0; i < L; i++) {
      if (i >= n && Math.random() < 0.32) { seq.push(seq[i - n]); }
      else { var s; do { s = SYMS[rnd(SYMS.length)]; } while (i >= n && s === seq[i - n]); seq.push(s); }
    }
    return seq;
  }

  function start() {
    injectCSS();
    var d = DIFF[ST.diff];
    ST.n = d.n; ST.step = d.step; ST.seq = genSeq(d.n, d.len);
    ST.idx = 0; ST.responded = false; ST.running = true;
    ST.hits = 0; ST.misses = 0; ST.fa = 0; ST.cr = 0; ST.matches = 0;
    track('game_round_start', { feature: 'fokus', n: d.n });
    render();
    if (ST.timer) clearInterval(ST.timer);
    ST.timer = setInterval(tick, ST.step);
  }

  function render() {
    var c = container(); if (!c) return;
    var pct = ST.seq.length ? (ST.idx / ST.seq.length * 100) : 0;
    c.innerHTML =
      '<div class="fk-wrap">' +
        '<div class="fk-nback">Жми, если символ = тому, что был ' + ST.n + ' назад</div>' +
        '<div class="fk-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="fk-stage" id="fkStage">' + ST.seq[ST.idx] + '</div>' +
        '<div class="fk-hint" id="fkHint">' + (ST.idx < ST.n ? 'запоминай…' : 'совпадает?') + '</div>' +
        '<button class="fk-match" id="fkMatch" onclick="FOKUS.mark()">✓ Совпадение</button>' +
        '<button class="fk-danger" onclick="FOKUS.stop()">Прервать</button>' +
      '</div>';
  }

  function mark() {
    if (!ST.running || ST.responded) return;
    ST.responded = true;
    vibe(25);
    var btn = document.getElementById('fkMatch'), st = document.getElementById('fkStage'), h = document.getElementById('fkHint');
    if (btn) btn.classList.add('hit');
    if (st) { st.classList.add('flash'); }
    if (h) h.textContent = 'отмечено ✓';
  }

  function tick() {
    if (!ST.running) return;
    // оценить символ, который сейчас показан (ST.idx), затем перейти к следующему
    var i = ST.idx;
    var wasMatch = i >= ST.n && ST.seq[i] === ST.seq[i - ST.n];
    if (wasMatch) { ST.matches++; if (ST.responded) ST.hits++; else ST.misses++; }
    else { if (ST.responded) ST.fa++; else ST.cr++; }
    ST.idx++;
    if (ST.idx >= ST.seq.length) { finish(); return; }
    ST.responded = false;
    render();
  }

  function finish() {
    ST.running = false;
    if (ST.timer) { clearInterval(ST.timer); ST.timer = null; }
    var raw = ST.hits - ST.fa;
    var score = clamp(Math.round(raw / Math.max(1, ST.matches) * 10), 0, 10);
    var acc = Math.round((ST.hits + ST.cr) / Math.max(1, ST.seq.length) * 100);
    var st = recordScore(ST.diff, score);
    var isRec = st.best[ST.diff] === score && score > 0;
    if (score >= 8) vibe([40, 40, 40]);
    var line = score >= 9 ? 'Отличный фокус! 🦅' : score >= 6 ? 'Хорошо держишь окно 💪' : score >= 3 ? 'Уже ловишь — тренируй устойчивость' : 'Сложно? Начни с 1-назад и наращивай';
    track('game_round_finish', { feature: 'fokus', n: ST.n, score: score });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="fk-wrap">' +
        '<div class="fk-h1" style="font-size:1.2rem">🎯 Результат — ' + esc(DIFF[ST.diff].name) + '</div>' +
        '<div class="fk-score">Фокус ' + score + '/10 · точность ' + acc + '%' + (isRec ? ' 🏆 рекорд!' : '') + (score >= 7 && st.streak > 1 ? ' · серия ' + st.streak + ' 🔥' : '') + '</div>' +
        '<div class="fk-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        '<div class="fk-res"><span>✅ Поймал совпадений</span><b>' + ST.hits + ' из ' + ST.matches + '</b></div>' +
        '<div class="fk-res"><span>❌ Пропустил</span><b>' + ST.misses + '</b></div>' +
        '<div class="fk-res"><span>⚠️ Ложных нажатий</span><b>' + ST.fa + '</b></div>' +
        '<div class="fk-card" style="color:#a7adba;font-size:.9rem;margin-top:8px">💡 Пропуски — окно слишком короткое, держи на один символ дольше. Ложные нажатия — путаешь «похоже» и «точно то же»: сверяй именно позицию N назад.</div>' +
        '<div class="fk-row"><button class="fk-primary" onclick="FOKUS.start()">🔁 Ещё раунд</button><button class="fk-secondary" onclick="FOKUS.home()">Сложность / меню</button></div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
  }

  function stop() { if (!ST.running) return; ST.running = false; if (ST.timer) { clearInterval(ST.timer); ST.timer = null; } toast('Раунд прерван', 'info'); home(); }
  function stopAll() { ST.running = false; if (ST.timer) { clearInterval(ST.timer); ST.timer = null; } }

  window.FOKUS = { home: home, setDiff: setDiff, start: start, mark: mark, stop: stop, getState: function () { return ST; }, _tick: tick };
  window.showFokusGame = home;
  console.log('✅ fnback.js loaded (игра «Фокус» N-back)');
})();
