// ============================================
// kalibr.js — Игра «Калибровка». Вероятностное мышление и борьба со сверхуверенностью.
// Утверждение (верно/неверно) + твоя уверенность в %. В конце — калибровка:
// совпадает ли заявленная уверенность с реальной точностью (Брайер-скор).
// Проверка локальная, банк фактов.
// Экспорт: window.showKalibrGame, window.KALIBR
// ============================================
(function () {
  "use strict";

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  // Банк утверждений: t = истинно ли утверждение. why — короткое пояснение.
  var BANK = [
    { s: 'Великую Китайскую стену видно из космоса невооружённым глазом.', t: false, why: 'Миф: с орбиты её без оптики не различить.' },
    { s: 'Летучие мыши слепые.', t: false, why: 'Они видят; плюс пользуются эхолокацией.' },
    { s: 'У человека пять базовых вкусов, включая умами.', t: true, why: 'Сладкий, солёный, кислый, горький, умами.' },
    { s: 'Наполеон Бонапарт был очень низкого роста (ниже 160 см).', t: false, why: 'Рост был около 168 см — средний для эпохи.' },
    { s: 'Золотая рыбка помнит всего 3 секунды.', t: false, why: 'Память рыб — недели и месяцы.' },
    { s: 'Молния никогда не бьёт дважды в одно место.', t: false, why: 'Бьёт, и часто — например, в высокие башни.' },
    { s: 'Эверест — самая высокая гора над уровнем моря.', t: true, why: '8849 м над уровнем моря.' },
    { s: 'Человек использует лишь 10% своего мозга.', t: false, why: 'Задействован практически весь мозг.' },
    { s: 'Алмаз состоит из чистого углерода.', t: true, why: 'Кристаллическая форма углерода.' },
    { s: 'Столица Австралии — Сидней.', t: false, why: 'Столица — Канберра.' },
    { s: 'Пауки — насекомые.', t: false, why: 'Это паукообразные: 8 ног, нет усиков.' },
    { s: 'Помидор с ботанической точки зрения — фрукт (ягода).', t: true, why: 'Развивается из завязи, содержит семена.' },
    { s: 'Медузы примерно на 95% состоят из воды.', t: true, why: 'Почти целиком вода.' },
    { s: 'Акулы не болеют раком.', t: false, why: 'Болеют; это популярный миф.' },
    { s: 'Свет от Солнца доходит до Земли примерно за 8 минут.', t: true, why: '~8 минут 20 секунд.' },
    { s: 'Гром слышен позже молнии, потому что свет быстрее звука.', t: true, why: 'Свет — мгновенно, звук ~340 м/с.' },
    { s: 'Витамин C лечит простуду.', t: false, why: 'Убедительных доказательств нет.' },
    { s: 'Панды питаются почти исключительно бамбуком.', t: true, why: '99% рациона — бамбук.' },
    { s: 'У языка есть отдельные зоны для разных вкусов («карта языка»).', t: false, why: 'Миф: все вкусы воспринимаются по всему языку.' },
    { s: 'Самая горячая планета Солнечной системы — Меркурий.', t: false, why: 'Самая горячая — Венера (парниковый эффект).' },
    { s: 'Титаник затонул в 1912 году.', t: true, why: 'В апреле 1912-го.' },
    { s: 'Летучие мыши — птицы.', t: false, why: 'Это млекопитающие.' },
    { s: 'У жирафа столько же шейных позвонков, сколько у человека — семь.', t: true, why: 'Просто они очень длинные.' },
    { s: 'Земля идеально круглая.', t: false, why: 'Сплюснута у полюсов (геоид).' },
    { s: 'Бананы растут на деревьях.', t: false, why: 'Банан — гигантская трава, не дерево.' },
    { s: 'Кровь в венах синяя, пока не соприкоснётся с воздухом.', t: false, why: 'Кровь всегда красная; вены кажутся синими из-за кожи.' },
    { s: 'Страус прячет голову в песок при опасности.', t: false, why: 'Миф; он просто прижимает голову к земле.' },
    { s: 'Солнце по цвету — белая звезда.', t: true, why: 'Белое; жёлтым кажется из-за атмосферы.' },
    { s: 'Хамелеон меняет цвет в первую очередь для маскировки под фон.', t: false, why: 'В основном — для общения и терморегуляции.' },
    { s: 'Мёд производят пчёлы из нектара.', t: true, why: 'Перерабатывают нектар в мёд.' }
  ];

  var CONF = [50, 60, 70, 80, 90, 95];
  var DIFF = {
    easy: { name: 'Коротко', em: '🌱', count: 8 },
    norm: { name: 'Норма', em: '⚖️', count: 10 },
    hard: { name: 'Длинно', em: '🔥', count: 12 }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  var ST = { diff: 'norm', qs: [], idx: 0, cur: { ans: null, conf: null }, log: [], done: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('kalibr_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, streak: 0, best: {}, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('kalibr_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('kalibr_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('kalibr_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(diff, score) {
    var s = loadStats(); s.plays = (s.plays || 0) + 1; if (!s.best) s.best = {};
    if (!s.best[diff] || score > s.best[diff]) s.best[diff] = score;
    s.streak = score >= 7 ? (s.streak || 0) + 1 : 0;
    s.last = (s.last || []).concat(score).slice(-10); saveStats(s); return s;
  }
  function avg(s) { var a = (s && s.last) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }

  function injectCSS() {
    if (document.getElementById('kbCSS')) return;
    var s = document.createElement('style'); s.id = 'kbCSS';
    s.textContent = [
      '.kb-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.kb-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.kb-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.kb-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.kb-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.kb-ch{font-weight:700;margin-bottom:8px}',
      '.kb-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.kb-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.kb-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.kb-stat b{display:block;font-size:1.35rem;font-weight:800;color:#38bdf8}',
      '.kb-stat span{font-size:.72rem;color:#9ca3af}',
      '.kb-rank{border:1px solid rgba(56,189,248,.4);background:linear-gradient(135deg,rgba(56,189,248,.14),rgba(99,102,241,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.kb-rank b{font-size:1.02rem}.kb-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      '.kb-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.kb-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.kb-chip.on{border-color:#0ea5e9;background:rgba(56,189,248,.16);color:#fff}',
      '.kb-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.kb-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 16px}',
      '.kb-bar i{display:block;height:100%;background:linear-gradient(90deg,#0ea5e9,#6366f1);transition:width .2s linear}',
      '.kb-state{text-align:center;font-size:1.35rem;font-weight:700;line-height:1.4;margin:10px 0 18px}',
      '.kb-ab{display:flex;gap:10px;margin:0 0 16px}',
      '.kb-abbtn{flex:1;border:2px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#f2f3f5;cursor:pointer}',
      '.kb-abbtn.on{border-color:#0ea5e9;background:rgba(56,189,248,.18)}',
      '.kb-conflabel{text-align:center;color:#a7adba;font-size:.92rem;margin:0 0 8px}',
      '.kb-conf{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}',
      '.kb-cbtn{flex:1 1 30%;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:12px 4px;font-size:1rem;font-weight:700;color:#e5e7eb;cursor:pointer;text-align:center}',
      '.kb-cbtn.on{border-color:#0ea5e9;background:rgba(56,189,248,.18);color:#fff}',
      '.kb-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#0ea5e9,#6366f1);box-shadow:0 8px 22px rgba(14,165,233,.35);margin:0 0 10px}',
      '.kb-primary[disabled]{opacity:.45;cursor:default;box-shadow:none}',
      '.kb-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.kb-row{display:flex;gap:10px}.kb-row>*{flex:1;margin-bottom:0}',
      '.kb-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#38bdf8}',
      '.kb-calib td{padding:7px 6px;border-bottom:1px solid rgba(255,255,255,.08);font-size:.9rem;color:#c8ccd4;text-align:center}',
      '.kb-calib th{padding:7px 6px;font-size:.78rem;color:#9ca3af;text-align:center;font-weight:600}',
      '.kb-calib table{width:100%;border-collapse:collapse}',
      '.kb-res{display:flex;gap:10px;align-items:flex-start;border-radius:10px;padding:9px 12px;margin:0 0 6px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-size:.9rem}',
      '.kb-res.no{border-color:rgba(239,68,68,.3)}',
      '.kb-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .kb-wrap{color:#1f2430}',
      '[data-theme="light"] .kb-lead,[data-theme="light"] .kb-li{color:#4b5566}',
      '[data-theme="light"] .kb-card,[data-theme="light"] .kb-stat,[data-theme="light"] .kb-res{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .kb-secondary,[data-theme="light"] .kb-chip,[data-theme="light"] .kb-abbtn,[data-theme="light"] .kb-cbtn{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.kb-wrap{padding:14px 12px 96px}.kb-state{font-size:1.2rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); ST.done = true; ST.diff = loadDiff();
    track('feature_opened', { feature: 'kalibr' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var a = avg(s), rk = a >= 8.5 ? 'Откалиброван 🎯' : a >= 6.5 ? 'Знаешь, чего не знаешь' : a >= 4 ? 'Калибровка растёт' : 'Сверхуверенность в работе';
      statsHtml = '<div class="kb-rank"><b>' + rk + '</b><span>Средний балл калибровки ' + (a ? a.toFixed(1) : '—') + '</span></div>' +
        '<div class="kb-stats"><div class="kb-stat"><b>' + s.plays + '</b><span>раундов</span></div><div class="kb-stat"><b>' + (s.streak || 0) + '</b><span>серия ≥7</span></div><div class="kb-stat"><b>' + (s.best && s.best[ST.diff] || '—') + '</b><span>рекорд</span></div></div>';
    }
    c.innerHTML =
      '<div class="kb-wrap">' +
        '<button class="kb-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="kb-h1">🎲 Калибровка</div>' +
        '<div class="kb-lead">Умный человек не тот, кто всё знает, а кто <b>знает, насколько он уверен</b>. Здесь на каждое утверждение ты отвечаешь «верно/неверно» и ставишь свою уверенность в процентах. В конце Фреди покажет, совпадает ли твоя уверенность с реальной точностью — и не грешишь ли ты сверхуверенностью (главная ловушка мышления).</div>' +
        statsHtml +
        '<div class="kb-diff">' + DIFF_ORDER.map(function (d) { return '<div class="kb-chip' + (ST.diff === d ? ' on' : '') + '" onclick="KALIBR.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>'; }).join('') + '</div>' +
        '<div class="kb-card"><div class="kb-ch">Как ставить уверенность</div>' +
          '<div class="kb-li">• <b>50%</b> — чистая догадка, монетка.</div>' +
          '<div class="kb-li">• <b>70–80%</b> — «скорее да, но не уверен».</div>' +
          '<div class="kb-li">• <b>95%</b> — «почти наверняка». Ставь высоко, только если готов отвечать за это.</div>' +
          '<div class="kb-li" style="color:#38bdf8">Правило калибровки: из всех твоих «90%» верными должны оказаться ~9 из 10. Если меньше — ты переоцениваешь себя.</div></div>' +
        '<button class="kb-primary" onclick="KALIBR.start()">▶ Начать (' + DIFF[ST.diff].count + ' утверждений)</button>' +
        (s.plays ? '' : '<div class="kb-flag">💡 Ставить всем 50% — не хитрость: за верную догадку с 50% дают меньше, чем за уверенное знание.</div>') +
      '</div>';
  }
  function setDiff(d) { if (!DIFF[d]) return; saveDiff(d); vibe(20); home(); }

  function start() {
    injectCSS();
    ST.qs = shuffle(BANK).slice(0, DIFF[ST.diff].count);
    ST.idx = 0; ST.cur = { ans: null, conf: null }; ST.log = []; ST.done = false;
    track('game_round_start', { feature: 'kalibr', diff: ST.diff });
    renderQ();
  }

  function renderQ() {
    var c = container(); if (!c) return;
    var q = ST.qs[ST.idx], total = ST.qs.length, cur = ST.cur;
    var ready = cur.ans !== null && cur.conf !== null;
    c.innerHTML =
      '<div class="kb-wrap">' +
        '<div class="kb-top"><span>Утверждение ' + (ST.idx + 1) + ' из ' + total + '</span><button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="KALIBR.home()">✕ Выйти</button></div>' +
        '<div class="kb-bar"><i style="width:' + (ST.idx / total * 100) + '%"></i></div>' +
        '<div class="kb-state">«' + esc(q.s) + '»</div>' +
        '<div class="kb-ab">' +
          '<button class="kb-abbtn' + (cur.ans === true ? ' on' : '') + '" onclick="KALIBR.pickAns(1)">✔ Верно</button>' +
          '<button class="kb-abbtn' + (cur.ans === false ? ' on' : '') + '" onclick="KALIBR.pickAns(0)">✘ Неверно</button>' +
        '</div>' +
        '<div class="kb-conflabel">Насколько уверен?</div>' +
        '<div class="kb-conf">' + CONF.map(function (p) { return '<button class="kb-cbtn' + (cur.conf === p ? ' on' : '') + '" onclick="KALIBR.pickConf(' + p + ')">' + p + '%</button>'; }).join('') + '</div>' +
        '<button class="kb-primary" onclick="KALIBR.next()"' + (ready ? '' : ' disabled') + '>' + (ST.idx === total - 1 ? 'Итог →' : 'Дальше →') + '</button>' +
      '</div>';
  }
  function pickAns(v) { ST.cur.ans = !!v; renderQ(); }
  function pickConf(p) { ST.cur.conf = p; renderQ(); }
  function next() {
    if (ST.cur.ans === null || ST.cur.conf === null) { toast('Выбери ответ и уверенность', 'info'); return; }
    var q = ST.qs[ST.idx];
    ST.log.push({ s: q.s, t: q.t, why: q.why, ans: ST.cur.ans, conf: ST.cur.conf, correct: ST.cur.ans === q.t });
    vibe(15);
    ST.idx++; ST.cur = { ans: null, conf: null };
    if (ST.idx >= ST.qs.length) { finish(); return; }
    renderQ();
  }

  function finish() {
    ST.done = true;
    var n = ST.log.length, correctN = 0, brier = 0, confSum = 0;
    var buckets = {};
    ST.log.forEach(function (r) {
      if (r.correct) correctN++;
      var p = r.conf / 100, o = r.correct ? 1 : 0;
      brier += (p - o) * (p - o);
      confSum += r.conf;
      if (!buckets[r.conf]) buckets[r.conf] = { n: 0, ok: 0 };
      buckets[r.conf].n++; if (r.correct) buckets[r.conf].ok++;
    });
    brier = brier / n;
    var acc = Math.round(correctN / n * 100);
    var meanConf = Math.round(confSum / n);
    var score = clamp(Math.round((0.5 - brier) / 0.5 * 10), 0, 10);
    var st = recordScore(ST.diff, score);
    var isRec = st.best[ST.diff] === score && score > 0;
    if (score >= 8) vibe([40, 40, 40]);

    var gap = meanConf - acc;
    var verdict = Math.abs(gap) <= 5 ? '🎯 Отличная калибровка: уверенность совпала с точностью.'
      : gap > 5 ? '⚠️ Сверхуверенность: ты уверен в среднем на ' + meanConf + '%, а прав на ' + acc + '%. Сбавляй громкость внутреннего «точно».'
      : '🙂 Недоуверенность: прав на ' + acc + '%, а ставил лишь ' + meanConf + '%. Ты знаешь больше, чем думаешь — смелее.';

    var calibRows = CONF.filter(function (p) { return buckets[p]; }).map(function (p) {
      var b = buckets[p], real = Math.round(b.ok / b.n * 100);
      return '<tr><td>' + p + '%</td><td>' + b.n + '</td><td style="color:' + (Math.abs(real - p) <= 12 ? '#6ee7b7' : '#fbbf24') + '">' + real + '%</td></tr>';
    }).join('');

    var wrong = ST.log.filter(function (r) { return !r.correct; });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="kb-wrap">' +
        '<div class="kb-h1" style="font-size:1.2rem">🎲 Итог калибровки</div>' +
        '<div class="kb-score">Калибровка ' + score + '/10 · точность ' + acc + '% · Брайер ' + brier.toFixed(2) + (isRec ? ' 🏆' : '') + (score >= 7 && st.streak > 1 ? ' · серия ' + st.streak + ' 🔥' : '') + '</div>' +
        '<div class="kb-card" style="text-align:center;color:#c8ccd4">' + esc(verdict) + '</div>' +
        '<div class="kb-card kb-calib"><div class="kb-ch">Твоя уверенность против реальности</div>' +
          '<table><thead><tr><th>Ставил</th><th>Раз</th><th>Верно на деле</th></tr></thead><tbody>' + calibRows + '</tbody></table>' +
          '<div class="kb-li" style="font-size:.82rem;color:#9ca3af;margin-top:6px">Идеал: в строке «90%» реально верно ≈90%. Жёлтое — расхождение.</div></div>' +
        (wrong.length ? '<div class="kb-card"><div class="kb-ch">Где ошибся</div>' + wrong.map(function (r) { return '<div class="kb-res no"><span>❌ «' + esc(r.s) + '» — на самом деле <b>' + (r.t ? 'верно' : 'неверно') + '</b>. ' + esc(r.why) + '</span></div>'; }).join('') + '</div>' : '') +
        '<div class="kb-row"><button class="kb-primary" onclick="KALIBR.start()" style="margin:0">🔁 Ещё раунд</button><button class="kb-secondary" onclick="KALIBR.home()">Сложность / меню</button></div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'kalibr', diff: ST.diff, score: score, acc: acc });
  }

  window.KALIBR = { home: home, setDiff: setDiff, start: start, pickAns: pickAns, pickConf: pickConf, next: next, getState: function () { return ST; } };
  window.showKalibrGame = home;
  console.log('✅ kalibr.js loaded (игра «Калибровка»)');
})();
