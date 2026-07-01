// ============================================
// oshibka.js — Игра «Лови ошибку». Критическое мышление: распознавание
// логических ошибок и когнитивных искажений в доводах.
// Ядро — надёжный банк искажений (множественный выбор, локальная проверка).
// Плюс опциональный разбор от Фреди (AI) для углубления.
// Экспорт: window.showOshibkaGame, window.OSHIBKA
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
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 300, temperature: opts.temperature == null ? 0.6 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // Банк ошибок мышления. key — короткое имя (для кнопок), def — суть, tell — как ловить, ex — примеры доводов.
  var BANK = [
    { key: 'Соломенное чучело', def: 'Спорят не с реальной позицией собеседника, а с искажённой, упрощённой её версией — с ней легче «победить».',
      tell: 'Слышишь «то есть ты считаешь, что…» — и дальше карикатура на твои слова.',
      ex: ['— Давай сократим бюджет на праздники. — Ах, ты вообще против того, чтобы люди радовались жизни!',
           '— Я думаю, детям полезен режим сна. — Понятно, ты хочешь превратить ребёнка в робота по расписанию.'] },
    { key: 'Переход на личности', def: 'Атакуют не аргумент, а самого человека — его качества, статус, внешность, — вместо того чтобы разбирать довод.',
      tell: 'Вместо «почему это неверно» звучит «да что ты вообще можешь знать».',
      ex: ['— Вот расчёты, почему проект не окупится. — Тебе-то откуда знать, ты и института не заканчивал.',
           '— Врач советует меньше сахара. — Да он сам полный, чего его слушать.'] },
    { key: 'Ложная дилемма', def: 'Сложную ситуацию сводят к двум вариантам («или/или»), хотя на деле есть и другие пути.',
      tell: 'Слышишь «либо так, либо мы проиграли», а середина и третьи варианты замолчаны.',
      ex: ['Или мы работаем по выходным, или компания разорится. Третьего не дано.',
           'Ты либо со мной согласен, либо ты мне не друг.'] },
    { key: 'Ссылка на авторитет', def: 'Довод «истинно, потому что так сказал уважаемый/известный человек» — без разбора самого аргумента.',
      tell: 'Вес придаёт имя или должность, а не логика и факты.',
      ex: ['Это точно работает — так сказал знаменитый профессор в интервью.',
           'Раз сам директор так считает, значит, обсуждать нечего.'] },
    { key: 'После — значит вследствие', def: 'Раз событие Б случилось после А, значит А его вызвало. Путают последовательность и причину.',
      tell: 'Есть «сначала… потом…», но нет доказанной связи — только совпадение во времени.',
      ex: ['Я надел эти носки — и мы выиграли матч. Носки счастливые!',
           'После нового начальника продажи упали — значит, это он всё развалил.'] },
    { key: 'Как все', def: 'Довод «это правильно, потому что так делают/думают все» — популярность выдают за истину.',
      tell: 'Главный аргумент — «все так делают», «миллионы не могут ошибаться».',
      ex: ['Все берут этот кредит, значит, и нам надо.',
           'Миллионы людей верят в это — не могут же они все ошибаться.'] },
    { key: 'Ошибка выжившего', def: 'Смотрят только на «дошедших до финиша» и не замечают тех, кто провалился и потому невидим.',
      tell: 'Вывод строят на успехах, забыв про всех, кто пробовал то же и проиграл.',
      ex: ['Он бросил универ и стал миллиардером — значит, учёба не нужна.',
           'Моя бабушка курила и дожила до 95, так что вред курения преувеличен.'] },
    { key: 'Замкнутый круг', def: 'Утверждение доказывают им же самим: вывод спрятан в посылке.',
      tell: '«Это так, потому что так» — аргумент повторяет тезис другими словами.',
      ex: ['Он говорит правду, потому что никогда не врёт.',
           'Эта книга полезная, ведь в ней написаны полезные вещи.'] },
    { key: 'Скользкая дорожка', def: 'Утверждают, что первый маленький шаг неизбежно приведёт к цепочке катастроф — без обоснования переходов.',
      tell: 'От мелочи сразу прыгают к концу света: «а дальше всё рухнет».',
      ex: ['Если разрешить ему ложиться на час позже, скоро он вообще перестанет учиться и бросит школу.',
           'Начнём делать исключения — и через год правил вообще не останется.'] },
    { key: 'Ошибка игрока', def: 'Верят, что случайные события «должны выровняться»: после серии одного исхода другой якобы стал вероятнее.',
      tell: 'Слышишь «пять раз подряд выпало красное, теперь точно чёрное».',
      ex: ['Монетка пять раз упала орлом — теперь наверняка будет решка.',
           'Я долго не выигрывал в лотерею, так что удача уже близко.'] },
    { key: 'Корреляция ≠ причина', def: 'Из того, что два явления меняются вместе, делают вывод, что одно вызывает другое.',
      tell: 'Связь есть, но, возможно, их обоих вызывает что-то третье — или это совпадение.',
      ex: ['Летом растут и продажи мороженого, и число утоплений — значит, мороженое опасно для пловцов.',
           'Города с большим числом библиотек имеют больше преступлений — закроем библиотеки.'] },
    { key: 'К традиции', def: 'Довод «это правильно, потому что так было всегда» — древность выдают за верность.',
      tell: 'Единственное обоснование — «так принято», «испокон веков».',
      ex: ['Мы всегда так делали, значит, и менять не надо.',
           'Это правильный способ, потому что так делали ещё наши деды.'] }
  ];
  var ALL_KEYS = BANK.map(function (b) { return b.key; });

  var DIFF = {
    easy: { name: 'Коротко', em: '🌱', count: 6, opts: 3 },
    norm: { name: 'Норма', em: '⚖️', count: 8, opts: 4 },
    hard: { name: 'Длинно', em: '🔥', count: 10, opts: 5 }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  var ST = { diff: 'norm', qs: [], idx: 0, picked: null, correct: 0, log: [], done: false, aiBusy: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('oshibka_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, streak: 0, best: {}, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('oshibka_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('oshibka_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('oshibka_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(diff, score) { var s = loadStats(); s.plays = (s.plays || 0) + 1; if (!s.best) s.best = {}; if (!s.best[diff] || score > s.best[diff]) s.best[diff] = score; s.streak = score >= 7 ? (s.streak || 0) + 1 : 0; s.last = (s.last || []).concat(score).slice(-10); saveStats(s); return s; }
  function avg(s) { var a = (s && s.last) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }

  function injectCSS() {
    if (document.getElementById('osCSS')) return;
    var s = document.createElement('style'); s.id = 'osCSS';
    s.textContent = [
      '.os-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.os-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.os-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.os-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.os-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.os-ch{font-weight:700;margin-bottom:8px}',
      '.os-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.os-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.os-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.os-stat b{display:block;font-size:1.35rem;font-weight:800;color:#f472b6}',
      '.os-stat span{font-size:.72rem;color:#9ca3af}',
      '.os-rank{border:1px solid rgba(244,114,182,.4);background:linear-gradient(135deg,rgba(244,114,182,.14),rgba(139,92,246,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.os-rank b{font-size:1.02rem}.os-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      '.os-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.os-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.os-chip.on{border-color:#ec4899;background:rgba(244,114,182,.16);color:#fff}',
      '.os-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.os-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 16px}',
      '.os-bar i{display:block;height:100%;background:linear-gradient(90deg,#ec4899,#8b5cf6);transition:width .2s linear}',
      '.os-arg{border:1px solid rgba(244,114,182,.35);background:rgba(244,114,182,.08);border-radius:14px;padding:18px;margin:0 0 16px;font-size:1.08rem;line-height:1.55;font-style:italic}',
      '.os-q{font-weight:700;margin:0 0 10px}',
      '.os-opt{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:14px 16px;margin:0 0 9px;font-size:1rem;color:#f2f3f5;cursor:pointer}',
      '.os-opt:hover{border-color:rgba(244,114,182,.5)}',
      '.os-opt.ok{border-color:#10b981;background:rgba(16,185,129,.14)}',
      '.os-opt.no{border-color:#ef4444;background:rgba(239,68,68,.12)}',
      '.os-opt[disabled]{cursor:default}',
      '.os-reveal{border:1px solid rgba(139,92,246,.4);background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(244,114,182,.04));border-radius:14px;padding:14px 16px;margin:0 0 14px;line-height:1.6;font-size:.95rem}',
      '.os-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#ec4899,#8b5cf6);box-shadow:0 8px 22px rgba(236,72,153,.35);margin:0 0 10px}',
      '.os-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.os-row{display:flex;gap:10px}.os-row>*{flex:1;margin-bottom:0}',
      '.os-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#f472b6}',
      '.os-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .os-wrap{color:#1f2430}',
      '[data-theme="light"] .os-lead,[data-theme="light"] .os-li{color:#4b5566}',
      '[data-theme="light"] .os-card,[data-theme="light"] .os-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .os-secondary,[data-theme="light"] .os-chip,[data-theme="light"] .os-opt{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.os-wrap{padding:14px 12px 96px}.os-arg{font-size:1rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); ST.done = true; ST.diff = loadDiff();
    track('feature_opened', { feature: 'oshibka' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var a = avg(s), rk = a >= 8.5 ? 'Детектор чуши 🕵️' : a >= 6.5 ? 'Видишь манипуляции' : a >= 4 ? 'Глаз намётывается' : 'Учишься ловить';
      statsHtml = '<div class="os-rank"><b>' + rk + '</b><span>Средний балл ' + (a ? a.toFixed(1) : '—') + ' · критическое мышление крепнет</span></div>' +
        '<div class="os-stats"><div class="os-stat"><b>' + s.plays + '</b><span>раундов</span></div><div class="os-stat"><b>' + (s.streak || 0) + '</b><span>серия ≥7</span></div><div class="os-stat"><b>' + (s.best && s.best[ST.diff] || '—') + '</b><span>рекорд</span></div></div>';
    }
    c.innerHTML =
      '<div class="os-wrap">' +
        '<button class="os-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="os-h1">🧯 Лови ошибку</div>' +
        '<div class="os-lead">Тренажёр критического мышления. Фреди показывает довод, в котором спрятана логическая ошибка или когнитивное искажение — ты называешь, какое именно. Научишься замечать манипуляции и подмены и в чужих речах, и в собственных мыслях.</div>' +
        statsHtml +
        '<div class="os-diff">' + DIFF_ORDER.map(function (d) { return '<div class="os-chip' + (ST.diff === d ? ' on' : '') + '" onclick="OSHIBKA.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>'; }).join('') + '</div>' +
        '<div class="os-card"><div class="os-ch">В игре разбираются, среди прочего</div>' +
          '<div class="os-li">Соломенное чучело · Переход на личности · Ложная дилемма · После — значит вследствие · Корреляция ≠ причина · Ошибка выжившего · Ошибка игрока · Скользкая дорожка и другие.</div></div>' +
        '<button class="os-primary" onclick="OSHIBKA.start()">▶ Начать (' + DIFF[ST.diff].count + ' доводов)</button>' +
        (s.plays ? '' : '<div class="os-flag">💡 Ошибка мышления — не про тему спора, а про форму рассуждения. Смотри на ход мысли, а не на то, симпатичен ли вывод.</div>') +
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
    track('game_round_start', { feature: 'oshibka', diff: ST.diff });
    renderQ();
  }

  function renderQ() {
    var c = container(); if (!c) return;
    var q = ST.qs[ST.idx], total = ST.qs.length, answered = ST.picked !== null;
    var optsHtml = q.options.map(function (o) {
      var cls = 'os-opt';
      if (answered) { if (o === q.key) cls += ' ok'; else if (o === ST.picked) cls += ' no'; }
      return '<button class="' + cls + '"' + (answered ? ' disabled' : '') + ' onclick="OSHIBKA.pick(\'' + o.replace(/'/g, "\\'") + '\')">' + esc(o) + '</button>';
    }).join('');
    var reveal = '';
    if (answered) {
      var ok = ST.picked === q.key;
      reveal =
        '<div class="os-reveal"><b>' + (ok ? '✅ Верно: ' : '❌ Это «' + esc(q.key) + '». ') + '</b>' + esc(q.def) + '<br><span style="color:#c8ccd4">🔎 Как ловить: ' + esc(q.tell) + '</span>' +
          '<div id="osAI" style="margin-top:8px"></div>' +
          (window.voiceManager || true ? '<button class="os-secondary" style="margin-top:10px" onclick="OSHIBKA.explainAI()" id="osAIbtn">🎓 Разбор от Фреди</button>' : '') +
        '</div>' +
        '<button class="os-primary" onclick="OSHIBKA.next()">' + (ST.idx === total - 1 ? 'Итог →' : 'Дальше →') + '</button>';
    }
    c.innerHTML =
      '<div class="os-wrap">' +
        '<div class="os-top"><span>Довод ' + (ST.idx + 1) + ' из ' + total + '</span><span>🧯 Лови ошибку</span></div>' +
        '<div class="os-bar"><i style="width:' + (ST.idx / total * 100) + '%"></i></div>' +
        '<div class="os-arg">«' + esc(q.arg) + '»</div>' +
        '<div class="os-q">Какая здесь ошибка мышления?</div>' +
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
    var q = ST.qs[ST.idx], box = document.getElementById('osAI'), btn = document.getElementById('osAIbtn');
    if (btn) { btn.textContent = '🎓 Фреди думает…'; btn.disabled = true; }
    var txt = '';
    try {
      var r = await aiGenerate('Ты — Фреди, наставник по критическому мышлению. В этом доводе спрятана ошибка мышления «' + q.key + '». Довод: «' + q.arg + '». В 2–3 коротких фразах по-русски, на «ты», объясни простым языком, ПОЧЕМУ это именно «' + q.key + '», и как бы звучал честный, корректный аргумент вместо этого. Без вступлений.', { max_tokens: 260 });
      txt = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { txt = ''; }
    ST.aiBusy = false;
    if (btn) { btn.style.display = 'none'; }
    if (box) box.innerHTML = txt ? '<div style="color:#e9d5ff;line-height:1.55">💬 ' + esc(txt).replace(/\n/g, '<br>') + '</div>' : '<div style="color:#9ca3af">Связь подвисла — но суть уже выше. Попробуй ещё раз позже.</div>';
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
    var line = pct === 100 ? 'Ни одна подмена не прошла 🕵️' : pct >= 70 ? 'Крепкий фильтр на чушь' : pct >= 40 ? 'Глаз намётывается — продолжай' : 'Пересмотри разборы: лови форму мысли, не тему';
    var wrong = ST.log.filter(function (r) { return !r.ok; });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="os-wrap">' +
        '<div class="os-h1" style="font-size:1.2rem">🧯 Результат</div>' +
        '<div class="os-score">' + ST.correct + ' из ' + total + ' · ' + pct + '% · ' + score + '/10' + (isRec ? ' 🏆 рекорд!' : '') + (score >= 7 && st.streak > 1 ? ' · серия ' + st.streak + ' 🔥' : '') + '</div>' +
        '<div class="os-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        (wrong.length ? '<div class="os-card"><div class="os-ch">Стоит пересмотреть</div>' + wrong.map(function (r) { return '<div class="os-li">• «' + esc(r.arg) + '» — это <b>' + esc(r.key) + '</b> (ты выбрал «' + esc(r.picked) + '»).</div>'; }).join('') + '</div>' : '<div class="os-card" style="text-align:center;color:#6ee7b7">Все ошибки пойманы! 🎯</div>') +
        '<div class="os-row"><button class="os-primary" onclick="OSHIBKA.start()" style="margin:0">🔁 Ещё раунд</button><button class="os-secondary" onclick="OSHIBKA.home()">Сложность / меню</button></div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'oshibka', diff: ST.diff, score: score });
  }

  window.OSHIBKA = { home: home, setDiff: setDiff, start: start, pick: pick, next: next, explainAI: explainAI, getState: function () { return ST; } };
  window.showOshibkaGame = home;
  console.log('✅ oshibka.js loaded (игра «Лови ошибку»)');
})();
