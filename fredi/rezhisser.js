// ============================================
// rezhisser.js — Тренажёр «Стань режиссёром».
// Обратная сторона «Распознай манипуляцию»: даётся факт и цель,
// надо выбрать сообщение, которое ДВИГАЕТ человека к делу честно —
// с открытой целью и правом на «нет», — а не пугает, стыдит или гасит.
// Ядро — локальный банк ситуаций (множественный выбор, локальная проверка).
// Плюс опциональный разбор от Фреди (AI). Экспорт: window.showRezhisserGame, window.REZHISSER.
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

  // Банк ситуаций. scene — факт и цель, honest — честное сообщение,
  // traps — три манипулятивные формулировки, why — разбор.
  var BANK = [
    { scene: 'В вашем доме пора ремонтировать подъезд. Есть смета и собрание. Ваша задача — собрать с соседей деньги на ремонт.',
      honest: 'Вот смета, вот срок, вот где проверить. Сдадите — ремонт будет, не сдадите — останется как есть. Решение за вами.',
      traps: ['Если не сдадите — подъезд скоро рухнет, и виноваты будете вы.', 'Нормальные соседи давно сдали. Неужели вам всё равно?', 'Сдайте до пятницы, потом будет поздно и в полтора раза дороже.'],
      why: 'Честное называет факт, срок и цену — и оставляет право не сдавать. Остальные давят страхом, стыдом и срочностью.' },
    { scene: 'Вы хотите, чтобы ваша команда перешла на новый инструмент, который правда экономит время.',
      honest: 'Вот сколько часов он экономит в неделю, вот цена перехода, вот что сломается. Попробуем месяц — не зайдёт, вернёмся.',
      traps: ['Кто не перейдёт — останется в прошлом и потеряет работу.', 'Сам директор уже одобрил, обсуждать нечего.', 'Все передовые команды давно на нём, только мы тормозим.'],
      why: 'Честное — с числами, ценой и правом вернуться. Остальные давят страхом, авторитетом и «все так делают».' },
    { scene: 'Вы видите, что коллега давно не был у врача и его это самого тревожит. Хотите мягко подтолкнуть к проверке.',
      honest: 'Я переживаю за тебя. Вот телефон, вот сколько это стоит. Сходишь — буду спокоен, не сходишь — твоё дело.',
      traps: ['Не проверишься — потом может быть поздно, и сам будешь жалеть.', 'Ты вообще о себе думаешь? Так нельзя с собой.', 'Только сейчас запись открыта, завтра мест не будет.'],
      why: 'Честное — это забота с правом отказа. Остальные пугают, стыдят и торопят.' },
    { scene: 'Ребёнок не садится за уроки, и вы хотите, чтобы он начал.',
      honest: 'Сделаешь уроки до семи — после семи свободен, как хочешь. Не сделаешь — гаджет до завтра у меня.',
      traps: ['Будешь двоечником, и никто тебя никуда не возьмёт.', 'Тебе что, совсем не стыдно? Все дети как дети.', 'Либо уроки, либо у нас большие проблемы.'],
      why: 'Честное — понятное условие и понятное последствие. Остальные пугают будущим, стыдят и ставят ложную дилемму.' },
    { scene: 'Вы продаёте свой продукт, и он правда решает одну задачу.',
      honest: 'Он решает вот эту задачу, стоит столько, не решает вот этого. Если задача ваша — берите, нет — не берите.',
      traps: ['Это изменит вашу жизнь и удвоит доход за месяц.', 'Только сегодня скидка, завтра будет дороже.', 'Всего 990 в месяц — мелким шрифтом: после первого года 3000.'],
      why: 'Честное называет границы продукта и цену. Остальные раздувают обещание, торопят и утаивают цену.' },
    { scene: 'Вы собираете подписи за парк в городе.',
      honest: 'Вот проект, вот что он даст, вот куда нести подпись. Подпишете — парк возможен, нет — останется парковка.',
      traps: ['Всё равно ничего не решат, власти сделают по-своему.', 'Если не подпишете — дети останутся без воздуха.', 'Уже полрайона подписали, только вы тянете.'],
      why: 'Честное даёт факт и действие. Остальные гасят волю («всё равно»), пугают и давят толпой.' },
    { scene: 'Близкий человек постоянно опаздывает, и вам это мешает. Хотите попросить его измениться.',
      honest: 'Мне трудно, когда я жду. Договоримся о времени — если опаздываешь, предупреди за полчаса. Так будет честно.',
      traps: ['Ты меня совсем не уважаешь.', 'Если продолжишь — я перестану тебя ждать вообще.', 'Либо приходишь вовремя, либо у нас всё серьёзно.'],
      why: 'Честное называет своё чувство и предлагает правило. Остальные бьют по личности, пугают и ставят ультиматум.' },
    { scene: 'Вам нужно сообщить команде, что проект откладывается на месяц.',
      honest: 'Проект сдвигается на месяц. Вот причина, вот что мы делаем, вот когда точная дата. Это неприятно, но честно.',
      traps: ['В целом всё идёт по плану, просто небольшая заминка.', 'Если спросят, скажите, что всё в порядке.', 'Это полный провал, и нам всем теперь конец.'],
      why: 'Честное называет факт, причину и срок. Остальные замазывают, просят лгать или раздувают катастрофу.' },
    { scene: 'Соседи сверху шумят по ночам, и вы хотите попросить их быть тише.',
      honest: 'После одиннадцати у нас слышно каждый шаг, я не высыпаюсь. Давайте договоримся: после одиннадцати — потише.',
      traps: ['Совести у вас нет — люди спят, а вы топаете.', 'Если не перестанете, я вызову полицию.', 'Либо вы тише, либо мы воюем.'],
      why: 'Честное называет факт и просит о договоре. Остальные стыдят, пугают и ставят ультиматум.' },
    { scene: 'Вы сами давно хотите начать своё дело, но боитесь. Нужно честно поговорить с собой.',
      honest: 'Попробую маленький шаг на этой неделе. Не получится — узнаю, что не так, и решу дальше. Это моя попытка.',
      traps: ['У меня всё равно ничего не выйдет, я не тот человек.', 'Вот сейчас брошу всё и начну — и через месяц буду свободен.', 'Надо успеть до тридцати, потом будет поздно.'],
      why: 'Честное — маленький шаг с правом на ошибку. Остальные гасят («не выйдет»), раздувают («сразу свободен») и торопят.' }
  ];

  var DIFF = {
    easy: { name: 'Коротко', em: '🌱', count: 6 },
    norm: { name: 'Норма', em: '⚖️', count: 8 },
    hard: { name: 'Длинно', em: '🔥', count: 10 }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  var ST = { diff: 'norm', qs: [], idx: 0, picked: null, correct: 0, log: [], done: false, aiBusy: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('rezhisser_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, streak: 0, best: {}, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('rezhisser_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('rezhisser_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('rezhisser_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(diff, score) { var s = loadStats(); s.plays = (s.plays || 0) + 1; if (!s.best) s.best = {}; if (!s.best[diff] || score > s.best[diff]) s.best[diff] = score; s.streak = score >= 7 ? (s.streak || 0) + 1 : 0; s.last = (s.last || []).concat(score).slice(-10); saveStats(s); return s; }
  function avg(s) { var a = (s && s.last) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }

  function injectCSS() {
    if (document.getElementById('rzCSS')) return;
    var s = document.createElement('style'); s.id = 'rzCSS';
    s.textContent = [
      '.rz-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.rz-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.rz-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.rz-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.rz-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.rz-ch{font-weight:700;margin-bottom:8px}',
      '.rz-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.rz-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.rz-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.rz-stat b{display:block;font-size:1.35rem;font-weight:800;color:#34d399}',
      '.rz-stat span{font-size:.72rem;color:#9ca3af}',
      '.rz-rank{border:1px solid rgba(52,211,153,.4);background:linear-gradient(135deg,rgba(52,211,153,.14),rgba(16,185,129,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.rz-rank b{font-size:1.02rem}.rz-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      '.rz-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.rz-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.rz-chip.on{border-color:#10b981;background:rgba(52,211,153,.16);color:#fff}',
      '.rz-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.rz-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 16px}',
      '.rz-bar i{display:block;height:100%;background:linear-gradient(90deg,#10b981,#34d399);transition:width .2s linear}',
      '.rz-scene{border:1px solid rgba(52,211,153,.35);background:rgba(52,211,153,.08);border-radius:14px;padding:18px;margin:0 0 16px;font-size:1.05rem;line-height:1.55}',
      '.rz-q{font-weight:700;margin:0 0 10px}',
      '.rz-opt{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:14px 16px;margin:0 0 9px;font-size:1rem;color:#f2f3f5;cursor:pointer}',
      '.rz-opt:hover{border-color:rgba(52,211,153,.5)}',
      '.rz-opt.ok{border-color:#10b981;background:rgba(16,185,129,.14)}',
      '.rz-opt.no{border-color:#ef4444;background:rgba(239,68,68,.12)}',
      '.rz-opt[disabled]{cursor:default}',
      '.rz-reveal{border:1px solid rgba(16,185,129,.4);background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(52,211,153,.04));border-radius:14px;padding:14px 16px;margin:0 0 14px;line-height:1.6;font-size:.95rem}',
      '.rz-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#10b981,#34d399);box-shadow:0 8px 22px rgba(16,185,129,.35);margin:0 0 10px}',
      '.rz-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.rz-row{display:flex;gap:10px}.rz-row>*{flex:1;margin-bottom:0}',
      '.rz-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#34d399}',
      '.rz-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .rz-wrap{color:#1f2430}',
      '[data-theme="light"] .rz-lead,[data-theme="light"] .rz-li{color:#4b5566}',
      '[data-theme="light"] .rz-card,[data-theme="light"] .rz-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .rz-secondary,[data-theme="light"] .rz-chip,[data-theme="light"] .rz-opt{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.rz-wrap{padding:14px 12px 96px}.rz-scene{font-size:1rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); ST.done = true; ST.diff = loadDiff();
    track('feature_opened', { feature: 'rezhisser' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var a = avg(s), rk = a >= 8.5 ? 'Мастер честного движения 🎬' : a >= 6.5 ? 'Ставишь честно' : a >= 4 ? 'Рука набивается' : 'Учишься двигать без давления';
      statsHtml = '<div class="rz-rank"><b>' + rk + '</b><span>Средний балл ' + (a ? a.toFixed(1) : '—') + ' · честное сообщение двигает, а не давит</span></div>' +
        '<div class="rz-stats"><div class="rz-stat"><b>' + s.plays + '</b><span>раундов</span></div><div class="rz-stat"><b>' + (s.streak || 0) + '</b><span>серия ≥7</span></div><div class="rz-stat"><b>' + (s.best && s.best[ST.diff] || '—') + '</b><span>рекорд</span></div></div>';
    }
    c.innerHTML =
      '<div class="rz-wrap">' +
        '<button class="rz-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="rz-h1">🎬 Стань режиссёром</div>' +
        '<div class="rz-lead">Тренажёр из курса «Кто управляет смыслом». Фреди даёт ситуацию и цель — вы выбираете сообщение, которое двигает человека к делу честно: с открытой целью и правом на «нет». Научитесь отличать движение от давления — в своей речи и в чужой.</div>' +
        statsHtml +
        '<div class="rz-diff">' + DIFF_ORDER.map(function (d) { return '<div class="rz-chip' + (ST.diff === d ? ' on' : '') + '" onclick="REZHISSER.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>'; }).join('') + '</div>' +
        '<div class="rz-card"><div class="rz-ch">Что отличает честное сообщение</div>' +
          '<div class="rz-li">Называет факт и цель · оставляет право на «нет» · двигает к делу, а не пугает, не стыдит и не гасит.</div></div>' +
        '<button class="rz-primary" onclick="REZHISSER.start()">▶ Начать (' + DIFF[ST.diff].count + ' ситуаций)</button>' +
        (s.plays ? '' : '<div class="rz-flag">💡 Режиссёр работает не речью, а чувством. Честное сообщение рождает эмоцию, которая ведёт к делу, — а не парализует.</div>') +
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
      ST.qs.push({ scene: b.scene, honest: b.honest, why: b.why, options: shuffle([b.honest].concat(b.traps)) });
    }
    ST.idx = 0; ST.picked = null; ST.correct = 0; ST.log = []; ST.done = false;
    track('game_round_start', { feature: 'rezhisser', diff: ST.diff });
    renderQ();
  }

  function renderQ() {
    var c = container(); if (!c) return;
    var q = ST.qs[ST.idx], total = ST.qs.length, answered = ST.picked !== null;
    var optsHtml = q.options.map(function (o) {
      var cls = 'rz-opt';
      if (answered) { if (o === q.honest) cls += ' ok'; else if (o === ST.picked) cls += ' no'; }
      return '<button class="' + cls + '"' + (answered ? ' disabled' : '') + ' onclick="REZHISSER.pick(\'' + o.replace(/'/g, "\\'") + '\')">' + esc(o) + '</button>';
    }).join('');
    var reveal = '';
    if (answered) {
      var ok = ST.picked === q.honest;
      reveal =
        '<div class="rz-reveal"><b>' + (ok ? '✅ Верно. ' : '❌ Это манипуляция. ') + '</b>' + esc(q.why) + '<br><span style="color:#c8ccd4">Честное сообщение: «' + esc(q.honest) + '»</span>' +
          '<div id="rzAI" style="margin-top:8px"></div>' +
          '<button class="rz-secondary" style="margin-top:10px" onclick="REZHISSER.explainAI()" id="rzAIbtn">🎓 Разбор от Фреди</button>' +
        '</div>' +
        '<button class="rz-primary" onclick="REZHISSER.next()">' + (ST.idx === total - 1 ? 'Итог →' : 'Дальше →') + '</button>';
    }
    c.innerHTML =
      '<div class="rz-wrap">' +
        '<div class="rz-top"><span>Ситуация ' + (ST.idx + 1) + ' из ' + total + '</span><button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="REZHISSER.home()">✕ Выйти</button></div>' +
        '<div class="rz-bar"><i style="width:' + (ST.idx / total * 100) + '%"></i></div>' +
        '<div class="rz-scene">' + esc(q.scene) + '</div>' +
        '<div class="rz-q">Какое сообщение — честное? Оно должно двигать человека к делу, а не пугать, стыдить или гасить.</div>' +
        optsHtml + reveal +
      '</div>';
  }

  function pick(k) {
    if (ST.picked !== null) return;
    ST.picked = k;
    var q = ST.qs[ST.idx], ok = k === q.honest;
    if (ok) { ST.correct++; vibe(20); } else vibe([30, 30, 30]);
    ST.log.push({ scene: q.scene, picked: k, ok: ok });
    renderQ();
  }

  async function explainAI() {
    if (ST.aiBusy) return; ST.aiBusy = true;
    var q = ST.qs[ST.idx], box = document.getElementById('rzAI'), btn = document.getElementById('rzAIbtn');
    if (btn) { btn.textContent = '🎓 Фреди думает…'; btn.disabled = true; }
    var txt = '';
    try {
      var r = await aiGenerate('Ты — Фреди, наставник по честному влиянию. Ситуация: «' + q.scene + '». В 2–3 коротких фразах по-русски, на «ты», объясни простым языком, почему сообщение «' + q.honest + '» честное и двигает человека к делу, а давление страхом, стыдом и срочностью — манипуляция. Без вступлений.', { max_tokens: 260 });
      txt = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { txt = ''; }
    ST.aiBusy = false;
    if (btn) { btn.style.display = 'none'; }
    if (box) box.innerHTML = txt ? '<div style="color:#a7f3d0;line-height:1.55">💬 ' + esc(txt).replace(/\n/g, '<br>') + '</div>' : '<div style="color:#9ca3af">Связь подвисла — но суть уже выше. Попробуй ещё раз позже.</div>';
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
    var line = pct === 100 ? 'Каждое сообщение — движение, а не давление 🎬' : pct >= 70 ? 'Крепкая рука честного режиссёра' : pct >= 40 ? 'Рука набивается — продолжай' : 'Пересмотри разборы: двигать — не значит давить';
    var wrong = ST.log.filter(function (r) { return !r.ok; });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="rz-wrap">' +
        '<div class="rz-h1" style="font-size:1.2rem">🎬 Результат</div>' +
        '<div class="rz-score">' + ST.correct + ' из ' + total + ' · ' + pct + '% · ' + score + '/10' + (isRec ? ' 🏆 рекорд!' : '') + (score >= 7 && st.streak > 1 ? ' · серия ' + st.streak + ' 🔥' : '') + '</div>' +
        '<div class="rz-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        (wrong.length ? '<div class="rz-card"><div class="rz-ch">Стоит пересмотреть</div>' + wrong.map(function (r) { return '<div class="rz-li">• «' + esc(r.scene.slice(0, 60)) + '…» — вы выбрали давление, а не движение.</div>'; }).join('') + '</div>' : '<div class="rz-card" style="text-align:center;color:#6ee7b7">Все сообщения поставлены честно! 🎯</div>') +
        '<div class="rz-row"><button class="rz-primary" onclick="REZHISSER.start()" style="margin:0">🔁 Ещё раунд</button><button class="rz-secondary" onclick="REZHISSER.home()">Сложность / меню</button></div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'rezhisser', diff: ST.diff, score: score });
  }

  window.REZHISSER = { home: home, setDiff: setDiff, start: start, pick: pick, next: next, explainAI: explainAI, getState: function () { return ST; } };
  window.showRezhisserGame = home;
  console.log('✅ rezhisser.js loaded (тренажёр «Стань режиссёром»)');
})();
