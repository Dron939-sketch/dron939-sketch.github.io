// intensive.js — игра «Вариатика. Уровень Intensive» в модуле «Игры» Фреди.
// Тренажёр перспективного мышления масти УБ — по канону А. Мейстера.
// 3 уровня = 3 этапа «Хрустального шара»: Анализ → Предсказание → Формирование.
// На каждом уровне игрок берёт реальную ситуацию из жизни, последовательно
// заполняет 9 кружков шаблона — Фреди разбирает по канону. Premium.
(function () {
  'use strict';

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 540, temperature: opts.temperature == null ? 0.7 : opts.temperature };
    try {
      if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
      var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) return { success: false };
      return await r.json();
    } catch (e) { return { success: false }; }
  }
  function clean(s) { return String(s || '').replace(/\|\|[^|]*\|\|/g, '').trim(); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  // ---------- 3 уровня = 3 этапа «Хрустального шара» ----------
  // На каждом этапе свой порядок прохождения 9 кружков (по канону).
  // Кружки 1, 2, 3, 4, 5, 6, 7, 8, 9 — это «места» шаблона. На каждом этапе
  // мы используем колонку 1/2/3 в каждом кружке (под анализ/предсказание/формирование).
  var LEVELS = [
    {
      n: 1, name: 'Анализ', emoji: '🔍',
      core: 'Из каких значимых обстоятельств сложилось то, что есть. И какие оргвыводы из этого следуют.',
      intro: 'Анализ — это разбор, как событие СОСТОЯЛОСЬ. Мы идём от факта данности к причинам. Не для самой истории — а чтобы сделать оргвыводы (обновить базу) и быть готовым к следующему такому событию.',
      hint: 'Если есть две похожие ситуации с противоположными финалами — разбирай их параллельно. Контраст подсветит, какие именно факторы сыграли.',
      // Порядок кружков по канону Анализа:
      order: [8, 9, 1, 4, 3, 5, 2, 6, 7],
      // Вопросы каждого кружка для этого этапа (колонка 1):
      qs: {
        8: { ttl: '8 · Дрейф мира', q: 'Какой факт данности мы рассматриваем? Куда складывается ситуация в общем виде — какой это «дрейф мира» или «паттерн модели жизни»?' },
        9: { ttl: '9 · Прямые последствия события', q: 'Какие предвиденные и непредвиденные последствия и побочные эффекты уже наступили?' },
        1: { ttl: '1 · Событие (состоялось)', q: 'Какое конкретное событие в прошлом мы анализируем?' },
        4: { ttl: '4 · Контроль и рычаги', q: 'Какие рычаги были задействованы (или НЕ были, если дрейф отрицательный)?' },
        3: { ttl: '3 · Проводники (краники)', q: 'Кто проводники (через кого это могло/не могло произойти) и что они сделали или не сделали?' },
        5: { ttl: '5 · Идеальная ситуация для максимального ЛНСВ', q: 'Какое могло быть ЛНСВ для проводников (3), чтобы они нам помогли? Какие тонкости ситуации дали бы им это ЛНСВ?' },
        2: { ttl: '2 · Реальная ситуация', q: 'Какие реальные факты напрямую сложились в событие (1)? Какие фактические обстоятельства есть на данный момент? Это ответ — что собственно произошло и почему.' },
        6: { ttl: '6 · Кто за этим стоит', q: 'Кому это было выгодно (или невыгодно)? Кто за этим стоит — и почему сложилось именно так? Часто это вторичная выгода самого игрока.' },
        7: { ttl: '7 · Работа с БД, оргвыводы', q: 'Как обновить базу учётных карточек? Какие оргвыводы делаем — что про себя, про других, про реальность?' }
      },
      askInput: 'Опиши ОДНУ реальную ситуацию из своей жизни, которую хочешь разобрать. Лучше — событие или паттерн, который уже состоялся (хотя бы один раз). Если есть пара противоположных финалов (получилось vs не получилось) — опиши оба.'
    },
    {
      n: 2, name: 'Предсказание', emoji: '🔮',
      core: 'Откуда взялись события и куда они будут развиваться при текущих обстоятельствах.',
      intro: 'Предсказание стоит на анализе. Идём не от факта к причинам, а от текущих обстоятельств к вероятному финалу. Если «дрейф» благоприятный — действуем. Если нет — расширяем БД и ждём знаков.',
      hint: 'Дрейф определяется количеством завязок в БД. Многим выгодно (или немногим, но сильно) и мало кому невыгодно → сложится. Наоборот → не сложится.',
      // Порядок по канону Предсказания: (5), (2), (7), (6) → (8) → (9), (4)
      order: [5, 2, 7, 6, 8, 3, 4, 9, 1],
      qs: {
        5: { ttl: '5 · Максимальное ЛНСВ для проводников', q: 'Какие тонкости ситуации дали бы проводникам ЛНСВ (легко, ненапряжно, субъективно выгодно)? Как организовать им это ЛНСВ?' },
        2: { ttl: '2 · Реальная ситуация', q: 'Какие фактические обстоятельства есть на данный момент? Какие обстоятельства могут помешать?' },
        7: { ttl: '7 · БД, проверка шансов', q: 'Проверь открывающиеся шансы в БД учётных карточек: кто из знакомых попадает в ключевые слова из (2) и (5)? Как их использовать?' },
        6: { ttl: '6 · Кому выгодно', q: 'Кому это выгодно (и кто из них нам поэтому поможет)? Кому невыгодно — и кто может помешать?' },
        8: { ttl: '8 · Дрейф мира', q: 'Куда в итоге сложится? В дрейфе или не в дрейфе — по количеству и силе завязок из БД?' },
        3: { ttl: '3 · Проводники (краники)', q: 'Кто это сделает и с какой вероятностью? Кто поможет, кто может помешать?' },
        4: { ttl: '4 · Какие рычаги стоит прилагать', q: 'Какие рычаги стоит прилагать — если вообще ввязываться в процесс?' },
        9: { ttl: '9 · Прямые последствия', q: 'Какие предвиденные и непредвиденные последствия и побочные эффекты ожидаются?' },
        1: { ttl: '1 · Вероятное событие', q: 'Вероятно ли наступит событие при текущем развитии ситуации? Финальный вывод предсказания.' }
      },
      askInput: 'Опиши ОДНУ реальную ситуацию, исход которой ты хочешь предсказать. Что есть на руках (ресурсы, проводники, ожидания)? Куда, по твоему ощущению, дрейфует?'
    },
    {
      n: 3, name: 'Формирование', emoji: '🎯',
      core: 'Как и на что повлиять в исходниках, чтобы сместить дрейф мира в нужную сторону (или себя — в другое ответвление дрейфа).',
      intro: 'Формирование стоит на предсказании. Мы уже знаем, куда дрейфует. Теперь — где приложить свои усилия, чтобы сместить вероятность. Вывод: «есть знаки нужного дрейфа — действуем; нет — ждём и расширяем БД».',
      hint: 'Над-задача шире самой задачи. Решения в (3) и (4) должны увеличивать возможности в рамках над-задачи. «Не простор» (туннель/тупик) — лучше не брать.',
      // Порядок по канону Формирования: (9 как хотим) → (1) → (3) → (4) → (5) → (2) → (6) → (7) → (8)
      order: [9, 1, 3, 4, 5, 2, 6, 7, 8],
      qs: {
        9: { ttl: '9 · Над-задача', q: 'В рамках какой большей задачи (над-задачи) мы хотим этого результата? Какие новые возможности влияния хотим получить — или можем потерять?' },
        1: { ttl: '1 · Желаемое событие', q: 'Что конкретно мы хотим, чтобы случилось (при нашем воздействии)? Сформулируй финал — то, к чему ведём.' },
        3: { ttl: '3 · Проводники (кто поможет)', q: 'Через каких проводников можно прийти к (1)? Фантазируй варианты, помечай каждый как простор/туннель/тупик.' },
        4: { ttl: '4 · Какие рычаги нужно использовать', q: 'Какие рычаги использовать и в ответ на какой сигнал? Под страх / обмен / стройку снизу / флирт / вечную дружбу / надстройку сверху.' },
        5: { ttl: '5 · ЛНСВ для проводников', q: 'Сводим: что должно стать для проводников Легко, Ненапряжно и Субъективно Выгодно, чтобы они помогли с (1)?' },
        2: { ttl: '2 · Что может помешать', q: 'Какие обстоятельства могут помешать событию (1) и ЛНСВ в (5)? Где подстелить соломку?' },
        6: { ttl: '6 · На кого выйти', q: 'На кого лучше всего выйти? Какие ключевые слова задаём для поиска по БД?' },
        7: { ttl: '7 · Настройка поиска в БД', q: 'Кого и для чего нужно найти в БД (или кем её укомплектовать)? Кто уже есть с нужными рычагами — а кого ещё надо завести?' },
        8: { ttl: '8 · Дрейф и сигнал к действию', q: 'Какое обстоятельство будет запускать цепь событий — какой сигнал «нужного дрейфа»? Пока его нет — ждём и расширяем БД. Когда появится — действуем.' }
      },
      askInput: 'Опиши ОДНУ реальную ситуацию, которую хочешь СФОРМИРОВАТЬ — то есть желаемый исход и почему он тебе нужен. Не «снять квартиру», а в рамках чего большего ты хочешь её снять.'
    }
  ];

  // ---------- состояние ----------
  function loadProg() {
    var d = { done: {}, runs: [], situation: '', current: { lvl: 0, idx: 0, answers: {} } };
    try {
      var p = JSON.parse(localStorage.getItem('intensive_prog') || 'null');
      if (!p) return d;
      p.done = p.done || {}; p.runs = p.runs || []; p.current = p.current || { lvl: 0, idx: 0, answers: {} };
      return p;
    } catch (e) { return d; }
  }
  function saveProg(p) { try { localStorage.setItem('intensive_prog', JSON.stringify(p)); } catch (e) {} }
  var ST = { busy: false };
  function container() { return document.getElementById('screenContainer'); }

  // ---------- premium ----------
  async function ensurePremium() {
    if (window.IS_PREMIUM === true) return true;
    if (window.IS_PREMIUM == null && typeof window.loadPremiumStatus === 'function') {
      try { await window.loadPremiumStatus(); } catch (e) {}
    }
    return window.IS_PREMIUM === true;
  }
  function openPremium() {
    if (typeof window.showPremiumLockPopup === 'function') { window.showPremiumLockPopup('Вариатика Intensive'); return; }
    if (typeof window.showSettingsScreen === 'function') { try { window.showSettingsScreen(); return; } catch (e) {} }
    toast('Открой раздел «Подписка» в настройках', 'info');
  }
  function renderLocked() {
    injectCSS(); var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="iv-wrap">' +
        '<button class="iv-ghost" onclick="INTENSIVE.exit()">← К списку игр</button>' +
        '<div class="iv-h1">💎 Вариатика — Intensive</div>' +
        '<div class="iv-card" style="text-align:center;border-color:rgba(99,102,241,.45)">' +
          '<div style="font-size:2.4rem;margin-bottom:6px">💎</div>' +
          '<div style="font-weight:700;font-size:1.12rem;color:#fff;margin-bottom:8px">Игра в 3 уровня — с подпиской</div>' +
          '<div style="color:#aeb1bd;line-height:1.55">«Intensive» — продвинутый тренажёр перспективного мышления УБ-масти: анализ → предсказание → формирование событий через «Хрустальный шар». Доступна в <b>Фреди Premium</b>.</div>' +
        '</div>' +
        '<button class="iv-btn iv-primary" onclick="INTENSIVE.openPremium()">💎 Открыть Premium</button>' +
        '<button class="iv-btn" onclick="INTENSIVE.exit()">← Вернуться к играм</button>' +
      '</div>';
    track('feature_opened', { feature: 'intensive_locked' });
  }

  // ---------- styles ----------
  function injectCSS() {
    if (document.getElementById('ivCSS')) return;
    var s = document.createElement('style'); s.id = 'ivCSS';
    s.textContent = [
      '.iv-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.iv-h1{font-size:1.5rem;font-weight:800;margin:6px 0 10px;line-height:1.18;color:#fff}',
      '.iv-h2{font-size:1.1rem;font-weight:700;margin:14px 0 8px;color:#fff}',
      '.iv-lead{font-size:1.02rem;color:#aeb1bd;line-height:1.6;margin-bottom:14px}',
      '.iv-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px;margin-bottom:12px;color:#dfe2e8;line-height:1.6;font-size:.95rem}',
      '.iv-card b{color:#fff;font-weight:600}',
      '.iv-btn{display:block;width:100%;text-align:left;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:14px 18px;margin-bottom:10px;color:#fff;font:inherit;font-size:.98rem;cursor:pointer;transition:.18s}',
      '.iv-btn:hover{background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.5)}',
      '.iv-btn small{display:block;color:#9aa0ad;font-size:.82rem;margin-top:4px;font-weight:400}',
      '.iv-btn.done{border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.07)}',
      '.iv-btn.locked{opacity:.45;cursor:not-allowed}',
      '.iv-primary{background:linear-gradient(135deg,#6366f1,#0ea5b7);border:none;color:#fff;text-align:center;font-weight:700}',
      '.iv-primary:hover{filter:brightness(1.07)}',
      '.iv-ghost{display:inline-block;background:none;border:none;color:#9aa0ad;font:inherit;font-size:.9rem;cursor:pointer;padding:6px 0;margin-bottom:6px}',
      '.iv-ghost:hover{color:#fff}',
      '.iv-prog{height:8px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;margin:8px 0 14px}',
      '.iv-prog i{display:block;height:100%;background:linear-gradient(90deg,#6366f1,#0ea5b7);transition:width .3s}',
      '.iv-core{background:linear-gradient(135deg,rgba(99,102,241,.13),rgba(14,165,183,.04));border:1px solid rgba(99,102,241,.35);border-radius:14px;padding:14px 16px;margin:10px 0;font-style:italic;color:#a5b4fc;line-height:1.5}',
      '.iv-circle{background:rgba(255,255,255,.04);border-left:3px solid #6366f1;border-radius:8px;padding:12px 14px;margin-bottom:10px;line-height:1.55}',
      '.iv-circle .lab{font-weight:700;color:#a5b4fc;margin-bottom:4px;font-size:.92rem}',
      '.iv-q{background:linear-gradient(135deg,rgba(245,158,11,.13),rgba(245,158,11,.03));border:1px solid rgba(245,158,11,.42);border-radius:14px;padding:14px 16px;margin:12px 0;line-height:1.55}',
      '.iv-q .lab{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:#fcd34d;margin-bottom:4px}',
      '.iv-q .ttl{font-weight:700;color:#fff;font-size:1rem;margin-bottom:6px}',
      '.iv-ta{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:12px 14px;color:#fff;font:inherit;font-size:.96rem;resize:vertical;min-height:120px;line-height:1.5}',
      '.iv-ta:focus{outline:none;border-color:rgba(99,102,241,.6)}',
      '.iv-fb{background:linear-gradient(135deg,rgba(34,197,94,.13),rgba(34,197,94,.04));border:1px solid rgba(34,197,94,.45);border-radius:14px;padding:13px 16px;margin:10px 0;line-height:1.55;white-space:pre-wrap}',
      '.iv-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}',
      '.iv-typing{color:#8b90a0;font-size:.85rem;font-style:italic;padding:6px 0}',
      '.iv-step{display:inline-block;padding:4px 9px;border-radius:999px;background:rgba(99,102,241,.13);border:1px solid rgba(99,102,241,.4);color:#a5b4fc;font-size:.8rem;margin-bottom:8px}',
      '.iv-hint{background:rgba(99,102,241,.06);border:1px dashed rgba(99,102,241,.35);border-radius:10px;padding:10px 14px;font-size:.86rem;color:#c7d2fe;margin-bottom:12px;line-height:1.55}',
      '.iv-summary{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 14px;margin-top:10px;font-size:.88rem;line-height:1.55;color:#cbd5e1}',
      '.iv-summary b{color:#fff}',
      '.iv-mast{display:flex;justify-content:space-between;align-items:center;font-size:.88rem;color:#aeb1bd;padding:7px 12px;border-radius:8px;background:rgba(255,255,255,.04);margin-bottom:6px}',
      '[data-theme="light"] .iv-wrap{color:#1a1a2e}',
      '[data-theme="light"] .iv-h1{color:#0f1020}',
      '[data-theme="light"] .iv-lead{color:#555}',
      '[data-theme="light"] .iv-card{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.1);color:#222}',
      '[data-theme="light"] .iv-card b{color:#000}',
      '[data-theme="light"] .iv-btn{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.1);color:#111}',
      '[data-theme="light"] .iv-btn small{color:#666}',
      '[data-theme="light"] .iv-circle{background:rgba(0,0,0,.03)}',
      '[data-theme="light"] .iv-ta{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.15);color:#111}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------- хаб ----------
  async function home() {
    injectCSS();
    var c = container(); if (!c) return;
    if (!(await ensurePremium())) { renderLocked(); return; }
    track('feature_opened', { feature: 'intensive' });
    var p = loadProg();
    var doneCount = LEVELS.filter(function (L) { return p.done[L.n]; }).length;
    var pct = Math.round(doneCount / 3 * 100);
    var rows = LEVELS.map(function (L) {
      var isDone = !!p.done[L.n];
      var isUnlocked = L.n === 1 || p.done[L.n - 1];
      var cls = isDone ? 'iv-btn done' : (isUnlocked ? 'iv-btn' : 'iv-btn locked');
      var click = isUnlocked ? 'onclick="INTENSIVE.start(' + L.n + ')"' : '';
      return '<button class="' + cls + '" ' + click + '><b>' + (isDone ? '✓' : (isUnlocked ? '▶' : '🔒')) + ' Уровень ' + L.n + '. ' + L.emoji + ' ' + esc(L.name) + '</b><small>' + esc(L.core) + '</small></button>';
    }).join('');
    c.innerHTML =
      '<div class="iv-wrap">' +
        '<button class="iv-ghost" onclick="INTENSIVE.exit()">← К списку игр</button>' +
        '<div class="iv-h1">💎 Вариатика — Intensive</div>' +
        '<div class="iv-lead"><b>Игра в 3 уровня</b> по перспективному мышлению масти УБ. Учишься <b>анализировать ситуации, предсказывать события и формировать изменения</b> через канонический алгоритм «Хрустального шара» (9 кружков). Каждый уровень — один из трёх этапов.</div>' +
        '<div class="iv-card" style="font-size:.9rem">Открыто: <b>' + doneCount + '/3</b><div class="iv-prog"><i style="width:' + pct + '%"></i></div>Разборов в архиве: <b>' + (p.runs.length || 0) + '</b></div>' +
        '<div class="iv-hint">⚠ Уровни проходятся по порядку: <b>анализ → предсказание → формирование</b>. Каждый следующий стоит на предыдущем — без анализа нет предсказания, без предсказания нет формирования.</div>' +
        rows +
        (p.runs.length ? '<button class="iv-btn" onclick="INTENSIVE.runs()">📚 Архив разборов (' + p.runs.length + ')<small>Все твои прошлые ситуации с ответами Фреди — можно перечитать</small></button>' : '') +
        (doneCount > 0 ? '<button class="iv-btn" onclick="INTENSIVE.reset()" style="border-color:rgba(239,68,68,.3);color:#fca5a5">↺ Сбросить прогресс</button>' : '') +
      '</div>';
  }
  function exit() { if (typeof window.showKonturScreen === 'function') window.showKonturScreen(); else home(); }
  function reset() { if (!confirm('Сбросить прогресс игры? Архив разборов останется.')) return; var p = loadProg(); p.done = {}; p.current = { lvl: 0, idx: 0, answers: {} }; saveProg(p); home(); }

  // ---------- начало уровня (сбор ситуации) ----------
  function start(n) {
    var L = LEVELS[n - 1]; if (!L) return;
    var p = loadProg();
    if (n > 1 && !p.done[n - 1]) { toast('Сначала пройди уровень ' + (n - 1), 'info'); return; }
    p.current = { lvl: n, idx: -1, answers: {}, situation: '' };
    saveProg(p);
    renderIntro();
  }
  function renderIntro() {
    var p = loadProg(), L = LEVELS[p.current.lvl - 1]; if (!L) return;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="iv-wrap">' +
        '<button class="iv-ghost" onclick="INTENSIVE.home()">← К уровням</button>' +
        '<div class="iv-step">Уровень ' + L.n + ' / 3</div>' +
        '<div class="iv-h1">' + L.emoji + ' ' + esc(L.name) + '</div>' +
        '<div class="iv-core">«' + esc(L.core) + '»</div>' +
        '<div class="iv-card">' + esc(L.intro) + '</div>' +
        '<div class="iv-hint">💡 ' + esc(L.hint) + '</div>' +
        '<div class="iv-h2">🎯 Шаг 1. Опиши свою ситуацию</div>' +
        '<div class="iv-card" style="font-size:.92rem;color:#aeb1bd">' + esc(L.askInput) + '</div>' +
        '<textarea class="iv-ta" id="ivSit" placeholder="Опиши ситуацию подробно — это база для всех 9 кружков"></textarea>' +
        '<button class="iv-btn iv-primary" style="margin-top:10px" onclick="INTENSIVE.beginCircles()">▶ Перейти к «Хрустальному шару» (9 кружков)</button>' +
      '</div>';
  }
  function beginCircles() {
    var inp = document.getElementById('ivSit');
    if (!inp) return;
    var txt = inp.value.trim();
    if (txt.length < 30) { toast('Опиши подробнее — хотя бы 2–3 предложения', 'info'); return; }
    var p = loadProg();
    p.current.situation = txt; p.current.idx = 0; p.current.answers = {};
    saveProg(p);
    renderCircle();
  }

  // ---------- проход по кружкам ----------
  function renderCircle() {
    var p = loadProg(), L = LEVELS[p.current.lvl - 1]; if (!L) return;
    var i = p.current.idx; var circleN = L.order[i]; var Q = L.qs[circleN];
    var total = L.order.length;
    var c = container(); if (!c) return;
    var prevs = '';
    for (var k = 0; k < i; k++) {
      var prevN = L.order[k]; var ans = p.current.answers[prevN] || '';
      if (ans) prevs += '<div class="iv-circle"><div class="lab">' + esc(L.qs[prevN].ttl) + '</div>' + nl2br(ans) + '</div>';
    }
    var savedAns = p.current.answers[circleN] || '';
    c.innerHTML =
      '<div class="iv-wrap">' +
        '<button class="iv-ghost" onclick="INTENSIVE.home()">← К уровням</button>' +
        '<div class="iv-step">' + L.emoji + ' ' + esc(L.name) + ' · кружок ' + (i + 1) + ' / ' + total + '</div>' +
        '<div class="iv-prog"><i style="width:' + Math.round((i / total) * 100) + '%"></i></div>' +
        '<div class="iv-card" style="font-size:.86rem;color:#aeb1bd"><b>Твоя ситуация:</b><br>' + nl2br(p.current.situation) + '</div>' +
        prevs +
        '<div class="iv-q"><div class="lab">Текущий кружок</div><div class="ttl">' + esc(Q.ttl) + '</div>' + esc(Q.q) + '</div>' +
        '<textarea class="iv-ta" id="ivAns" placeholder="Твой ответ на этот кружок…">' + esc(savedAns) + '</textarea>' +
        '<div class="iv-row">' +
          (i > 0 ? '<button class="iv-btn" style="flex:0;width:auto;margin:0;padding:11px 16px" onclick="INTENSIVE.prev()">← Назад</button>' : '') +
          '<button class="iv-btn iv-primary" style="flex:1;width:auto;margin:0;padding:13px" onclick="INTENSIVE.next()">' + (i < total - 1 ? 'Дальше →' : '🏁 Завершить и отправить Фреди') + '</button>' +
        '</div>' +
      '</div>';
    setTimeout(function () { var t = document.getElementById('ivAns'); if (t) t.focus(); }, 50);
  }
  function saveCurrent() {
    var p = loadProg(), L = LEVELS[p.current.lvl - 1]; if (!L) return;
    var inp = document.getElementById('ivAns'); if (!inp) return;
    var circleN = L.order[p.current.idx];
    p.current.answers[circleN] = inp.value.trim();
    saveProg(p);
  }
  function prev() { saveCurrent(); var p = loadProg(); if (p.current.idx > 0) { p.current.idx--; saveProg(p); renderCircle(); } }
  function next() {
    var p = loadProg(), L = LEVELS[p.current.lvl - 1]; if (!L) return;
    var inp = document.getElementById('ivAns'); var ans = inp ? inp.value.trim() : '';
    if (ans.length < 5) { toast('Запиши хоть короткий ответ — это рабочий навык, не пропускай кружки', 'info'); return; }
    saveCurrent();
    p = loadProg();
    if (p.current.idx < L.order.length - 1) { p.current.idx++; saveProg(p); renderCircle(); }
    else { finish(); }
  }

  // ---------- финал уровня — отправка Фреди ----------
  function buildPrompt(L, situation, answers) {
    var dump = L.order.map(function (n) {
      var Q = L.qs[n]; var a = answers[n] || '(пропущено)';
      return Q.ttl + '\n  Вопрос: ' + Q.q + '\n  Ответ: ' + a;
    }).join('\n\n');
    return 'Ты — Фреди-наставник игры «Вариатика. Уровень Intensive» (по А. Мейстеру). Сейчас игрок прошёл уровень «' + L.name + '» алгоритма «Хрустальный шар». Стержень уровня: «' + L.core + '».\n\n' +
      'СИТУАЦИЯ ИГРОКА:\n"""\n' + situation + '\n"""\n\n' +
      'РАЗБОР ПО 9 КРУЖКАМ (в каноническом порядке этого уровня):\n' + dump + '\n\n' +
      'Дай разбор на «ты», тёплый и по делу, 6–10 предложений связной речью:\n' +
      '· что в логике сложилось (какие кружки сильные);\n' +
      '· где есть провисание или путаница (какие кружки слабые/пропущены, что туда добавить);\n' +
      '· ОДИН чёткий вывод/действие, которое игроку стоит сделать первым из этого разбора.\n' +
      'Без нумерации и заголовков, без «молодец/плохо», без воды. Без служебных тегов.';
  }
  async function finish() {
    var p = loadProg(), L = LEVELS[p.current.lvl - 1]; if (!L) return;
    if (ST.busy) return; ST.busy = true;
    var c = container(); if (!c) { ST.busy = false; return; }
    c.innerHTML =
      '<div class="iv-wrap">' +
        '<button class="iv-ghost" onclick="INTENSIVE.home()">← К уровням</button>' +
        '<div class="iv-step">' + L.emoji + ' ' + esc(L.name) + ' · разбор</div>' +
        '<div class="iv-h1">Фреди читает твой «Хрустальный шар»…</div>' +
        '<div class="iv-typing">Анализирует все 9 кружков и сводит выводы…</div>' +
      '</div>';
    var r = await aiGenerate(buildPrompt(L, p.current.situation, p.current.answers), { temperature: 0.55, max_tokens: 460 });
    var fb = (r && r.success && r.content) ? clean(r.content) : 'Ты прошёл все 9 кружков — это уже сильный шаг. Перечитай свои ответы спокойно через час: часто после паузы становится видно, какой кружок ты обошёл (обычно тот, где правда «жмёт»). Один следующий шаг — сделать его подробнее.';
    p.done[L.n] = true;
    p.runs.unshift({ lvl: L.n, lvlName: L.name, situation: p.current.situation, answers: p.current.answers, fb: fb, ts: Date.now() });
    if (p.runs.length > 30) p.runs.length = 30;
    p.current = { lvl: 0, idx: 0, answers: {}, situation: '' };
    saveProg(p);
    var nextL = LEVELS[L.n]; // L.n: 1→2, 2→3, 3→undef
    c.innerHTML =
      '<div class="iv-wrap">' +
        '<button class="iv-ghost" onclick="INTENSIVE.home()">← К уровням</button>' +
        '<div class="iv-step">' + L.emoji + ' ' + esc(L.name) + ' · разбор от Фреди</div>' +
        '<div class="iv-h1">✓ Уровень сдан</div>' +
        '<div class="iv-fb">' + nl2br(fb) + '</div>' +
        (nextL ? '<button class="iv-btn iv-primary" onclick="INTENSIVE.start(' + nextL.n + ')">▶ Перейти на уровень ' + nextL.n + '. ' + nextL.emoji + ' ' + esc(nextL.name) + '</button>'
               : '<div class="iv-card" style="text-align:center;background:linear-gradient(135deg,rgba(99,102,241,.16),rgba(14,165,183,.04));border-color:rgba(99,102,241,.5)"><b>🏆 Все три уровня пройдены.</b><br>Ты освоил полный круг «Хрустального шара»: анализ → предсказание → формирование. Дальше — практика: каждый раз, когда нужно понять или повернуть событие, прокручивай 9 кружков.</div>') +
        '<button class="iv-btn" onclick="INTENSIVE.runs()">📚 К архиву разборов</button>' +
        '<button class="iv-btn" onclick="INTENSIVE.home()">К уровням</button>' +
      '</div>';
    ST.busy = false;
    track('feature_opened', { feature: 'intensive_done', lvl: L.n });
  }

  // ---------- архив ----------
  function runs() {
    injectCSS();
    var p = loadProg();
    var c = container(); if (!c) return;
    var rows = p.runs.length
      ? p.runs.map(function (r, i) {
          var d = new Date(r.ts || 0);
          var dt = (r.ts ? (d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear()) : '');
          return '<button class="iv-btn" onclick="INTENSIVE.viewRun(' + i + ')"><b>' + esc(r.lvlName) + '</b> · ' + esc(dt) + '<small>' + esc((r.situation || '').slice(0, 110)) + (r.situation && r.situation.length > 110 ? '…' : '') + '</small></button>';
        }).join('')
      : '<div class="iv-card" style="text-align:center;color:#9aa0ad">Архив пуст. Пройди хотя бы один уровень.</div>';
    c.innerHTML =
      '<div class="iv-wrap">' +
        '<button class="iv-ghost" onclick="INTENSIVE.home()">← К уровням</button>' +
        '<div class="iv-h1">📚 Архив разборов</div>' +
        rows +
      '</div>';
  }
  function viewRun(i) {
    var p = loadProg(); var r = p.runs[i]; if (!r) return;
    var L = LEVELS[r.lvl - 1] || { qs: {}, order: [] };
    var c = container(); if (!c) return;
    var d = new Date(r.ts || 0); var dt = (r.ts ? (d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear()) : '');
    var circles = L.order.map(function (n) {
      var Q = L.qs[n]; var a = (r.answers && r.answers[n]) || '(пропущено)';
      return '<div class="iv-circle"><div class="lab">' + esc(Q.ttl) + '</div>' + nl2br(a) + '</div>';
    }).join('');
    c.innerHTML =
      '<div class="iv-wrap">' +
        '<button class="iv-ghost" onclick="INTENSIVE.runs()">← В архив</button>' +
        '<div class="iv-step">' + esc(r.lvlName) + ' · ' + esc(dt) + '</div>' +
        '<div class="iv-card"><b>Ситуация:</b><br>' + nl2br(r.situation || '') + '</div>' +
        circles +
        '<div class="iv-fb"><b>Разбор Фреди:</b><br>' + nl2br(r.fb || '') + '</div>' +
        '<button class="iv-btn" onclick="INTENSIVE.delRun(' + i + ')" style="border-color:rgba(239,68,68,.3);color:#fca5a5">🗑 Удалить разбор</button>' +
      '</div>';
  }
  function delRun(i) {
    if (!confirm('Удалить разбор?')) return;
    var p = loadProg(); p.runs.splice(i, 1); saveProg(p); runs();
  }

  // ---------- экспорт ----------
  window.INTENSIVE = {
    home: home, exit: exit, openPremium: openPremium, reset: reset,
    start: start, beginCircles: beginCircles, prev: prev, next: next,
    runs: runs, viewRun: viewRun, delRun: delRun
  };
  window.showIntensiveGame = home;
  console.log('✅ intensive.js loaded (Вариатика Intensive: игра в 3 уровня «Хрустальный шар»)');
})();
