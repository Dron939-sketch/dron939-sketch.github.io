// ============================================================
// signal.js — игра «Сигнал» — тренажёр опорных сигналов
// по методу В.Ф. Шаталова.
//
// Лестница из 6 уровней, 3 акта (распознавание → генерация →
// воспроизведение), как учат навык: сначала видеть сильные опоры,
// потом сжимать самому (ИИ-оценка + образец после хода), потом
// разворачивать материал по опоре (retrieval). Финал — полный цикл
// на СВОЁМ материале: сжал → пересказал по опоре → оценка.
// Бесплатно. Связана с курсом «Опорные сигналы: метод Шаталова».
// Экспорт: window.showSignalGame, window.SIGNAL
// ============================================================
(function () {
  'use strict';

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 320, temperature: opts.temperature == null ? 0.4 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  var SITE = 'https://meysternlp.ru';
  var COURSE_URL = SITE + '/blog/lektorij/opornye-signaly/';
  var LEC = {
    anatomiya: { t: 'Опорный сигнал: анатомия', u: SITE + '/blog/lekciya-shatalov-3-anatomiya-signala.html' },
    szhatie:   { t: 'Как сжимать: техника кодирования', u: SITE + '/blog/lekciya-shatalov-5-tehnika-kodirovaniya.html' },
    vosproizv: { t: 'Воспроизведение: сигнал работает только вслух', u: SITE + '/blog/lekciya-shatalov-6-vosproizvedenie.html' }
  };

  // ===== Критерии сильного сигнала (используются в подсказках и промптах)
  var CRITERIA = 'компактность (до 7 элементов), образность (символ цепляет память), структура (стрелки и порядок со смыслом), однозначность (по опоре восстановишь только одно)';

  // ===== Уровень 1: «Опора или простыня» — что сработает через неделю
  var PAIRS = [
    { theme: 'Фазы сна',
      good: '90′ × 4–6: лёгкий → глубокий → REM',
      bad: 'Сон состоит из повторяющихся циклов примерно по девяносто минут, каждый включает стадии лёгкого сна, глубокого сна и фазу быстрого движения глаз, за ночь проходит от четырёх до шести циклов…',
      why: 'Полный текст честно всё содержит — и потому не работает: перечитывать — не вспоминать. Опора из трёх крючков разворачивается по памяти: цифра, цепочка, порядок.' },
    { theme: 'Правило Парето',
      good: '20 → 80',
      bad: 'Итальянский экономист Парето заметил закономерность распределения результатов и усилий, которая позже была обобщена на многие сферы…',
      why: 'Иногда весь закон — две цифры со стрелкой. Сигнал не обязан быть рисунком: он обязан быть минимальным крючком, с которого разматывается остальное.' },
    { theme: 'Три пояса мыследеятельности',
      good: 'М / М-К / МД + лифт рефлексии ↕',
      bad: 'мышление бывает разным и всё связано',
      why: 'Второй вариант короткий — но пустой: по нему не восстановишь ничего конкретного. Краткость без содержания — не опора, а туман. Сигнал держит структуру: три этажа и лифт.' },
    { theme: 'Петля привычки',
      good: 'триггер → действие → награда ↺',
      bad: 'Т→Д→Н→П→С→В ↺',
      why: 'Шесть сокращений без расшифровки — перегруз и загадка: через неделю сам не вспомнишь, что такое «П». Три знакомых слова со стрелками — однозначно и достаточно.' },
    { theme: 'Ключевые точки Второй мировой',
      good: '39 → 41 → 43 → 45 (начало — СССР — перелом — конец)',
      bad: 'война шла долго и тяжело',
      why: 'Эмоциональный образ без данных не восстанавливает материал. Четыре даты с подписями — костяк, на который память нанизывает остальное.' },
    { theme: 'Схема КПТ',
      good: 'ситуация → мысль → эмоция → поведение',
      bad: 'страх — это просто плохие мысли!!!',
      why: 'Восклицания не заменяют структуру. Опора — это цепочка, которую можно проговорить и проверить, а не лозунг.' }
  ];

  // ===== Уровень 2: «Лучший сигнал» — 4 варианта, критерии Шаталова
  var QUADS = [
    { fact: 'Кортизол утром высокий — помогает проснуться; к вечеру снижается; хронический стресс держит его высоким и ломает сон.',
      opts: [
        { t: 'кортизол: утро ↑ … вечер ↓; стресс = всегда ↑ → сон ломается', k: 'ok' },
        { t: 'кортизол это гормон стресса который вырабатывается надпочечниками утром больше вечером меньше а при стрессе всегда много и поэтому плохо спится', k: 'over' },
        { t: 'гормоны важны ⚡', k: 'abs' },
        { t: 'сон стресс утро вечер кортизол много мало', k: 'mess' }
      ],
      why: 'Сильный сигнал держит кривую суток и слом: две стрелки нормы и одна аномалия. Переписанный текст — не сжатие; «гормоны важны» — туман; слова кучей — нет структуры, не восстановишь связи.' },
    { fact: 'Метод помидора: 25 минут работы, 5 минут отдыха; после четырёх «помидоров» — длинный перерыв.',
      opts: [
        { t: '🍅 25/5 × 4 → отдых 30', k: 'ok' },
        { t: 'работать надо помидорами: сначала поработал немного потом отдохнул немного и так несколько раз а потом долгий отдых', k: 'over' },
        { t: 'тайм-менеджмент 🍅', k: 'abs' },
        { t: '25 4 5 30 помидор перерыв', k: 'mess' }
      ],
      why: 'Весь метод — четыре числа в правильной структуре. Пересказ «немного-немного» теряет цифры — метод исчезает; хэштег без чисел ничего не разворачивает; числа без связей — ребус.' },
    { fact: 'Треугольник Карпмана: три роли — Жертва, Преследователь, Спасатель; участники меняются ролями; выход один — перестать играть свою.',
      opts: [
        { t: '△ Ж–П–С, роли крутятся ↺; выход = выйти из △', k: 'ok' },
        { t: 'жертва преследователь спасатель треугольник психология ролей выход', k: 'mess' },
        { t: 'в отношениях люди часто занимают три позиции и по очереди меняются ими что создаёт замкнутый круг из которого трудно выйти пока не откажешься от роли', k: 'over' },
        { t: 'токсичные игры 🎭', k: 'abs' }
      ],
      why: 'Треугольник со стрелкой кручения и выходом наружу — вся модель одним взглядом. Обратите внимание: геометрия здесь не украшение, а само содержание.' },
    { fact: 'SMART-цель: конкретная, измеримая, достижимая, значимая, со сроком.',
      opts: [
        { t: 'SMART = 5 вопросов: что именно? чем измерю? потяну? зачем мне? к какому числу?', k: 'ok' },
        { t: 'цели надо ставить правильно по науке', k: 'abs' },
        { t: 'Specific Measurable Achievable Relevant Time-bound — конкретная измеримая достижимая релевантная ограниченная во времени', k: 'over' },
        { t: 'конкретно измеримо достижимо значимо срок SMART', k: 'mess' }
      ],
      why: 'Аббревиатура сама по себе — уже чей-то сигнал, но чужой; вопросы от первого лица превращают её в рабочий инструмент: каждый вопрос — крючок действия.' },
    { fact: 'Кривая забывания Эббингауза: без повторения за сутки теряется до 60–70% выученного; лучшие повторы — сразу, через день и через неделю.',
      opts: [
        { t: '📉 −70% за сутки → повтор: 0 · 1д · 7д', k: 'ok' },
        { t: 'память быстро забывает', k: 'abs' },
        { t: 'Эббингауз в 1885 году экспериментально установил что информация забывается по экспоненте особенно быстро в первые часы поэтому нужно повторять несколько раз', k: 'over' },
        { t: '70 процентов сутки день неделя повтор кривая', k: 'mess' }
      ],
      why: 'Кривая вниз + три точки повторения — и число, которое пугает ровно настолько, чтобы запомниться. Сигнал может (и должен) быть эмоциональным — но с данными.' }
  ];

  // ===== Банк текстов для сжатия (уровни 3–4) и развёртки (уровень 5)
  var TEXTS = [
    { id: 't1', theme: 'Кипение воды и высота',
      text: 'Вода кипит при ста градусах только на уровне моря. В горах атмосферное давление ниже, поэтому вода закипает при меньшей температуре — и еда в кипятке варится заметно дольше.',
      ref: '100° — только у моря; горы: давление ↓ → кипит раньше → варится дольше' },
    { id: 't2', theme: 'Первая помощь при панической атаке',
      text: 'При панической атаке помогает удлинённый выдох — вдох на четыре счёта, выдох на шесть. Затем заземление: назвать пять предметов, которые видишь вокруг. И напомнить себе: пик атаки длится около десяти минут и проходит сам.',
      ref: 'ПА: вдох 4 / выдох 6 · назови 5 предметов · «пик ≈ 10 мин — пройдёт»' },
    { id: 't3', theme: 'Правило двадцати секунд',
      text: 'Мы выбираем то, до чего проще дотянуться. Поэтому полезную привычку нужно сделать на двадцать секунд доступнее — форма у кровати, а вредную на двадцать секунд труднее — телефон в другой комнате.',
      ref: '±20 сек: полезное −20 (ближе), вредное +20 (дальше)' },
    { id: 't4', theme: 'Эффект Даннинга — Крюгера',
      text: 'Новичок с малыми знаниями часто сверхуверен, потому что не видит, чего не знает. С ростом знаний уверенность сначала падает — открывается масштаб незнания, — и лишь потом медленно растёт вместе с реальной компетентностью.',
      ref: 'ДК: мало знаний → пик уверенности; знаний больше → провал («вижу, чего не знаю») → медленный рост' },
    { id: 't5', theme: 'Идеальный конечный результат',
      text: 'В ТРИЗ идеальный конечный результат — это когда нужная функция выполняется сама, без новой системы и затрат: не «какой построить забор», а «как сделать, чтобы охранять было нечего».',
      ref: 'ИКР: функция выполняется САМА — без системы и затрат' },
    { id: 't6', theme: 'Окно толерантности',
      text: 'У психики есть окно толерантности — зона, в которой мы выдерживаем стресс и остаёмся собой. Выше окна — перевозбуждение: паника, ярость. Ниже — оцепенение и отключение. Задача навыков саморегуляции — расширять окно и возвращать себя в него.',
      ref: 'окно: ↑ паника | НОРМА | ↓ оцепенение; навыки = шире окно + возврат внутрь' }
  ];

  // ===== Карта уровней =====
  var LEVELS = [
    { n: 1, em: '👁', t: 'Опора или простыня', d: 'Клики: что реально сработает при воспроизведении через неделю', act: 1 },
    { n: 2, em: '🔍', t: 'Лучший сигнал', d: 'Клики: выбери сильную опору среди перегруза, тумана и каши', act: 1 },
    { n: 3, em: '✍️', t: 'Сожми сам', d: 'Текст → твой опорный сигнал; Фреди оценит и покажет образец', act: 2 },
    { n: 4, em: '⚔️', t: 'Дуэль сжатия', d: 'Твой сигнал против образца Фреди — нужно 2 победы из 3', act: 2 },
    { n: 5, em: '🔊', t: 'Разверни опору', d: 'По чужому сигналу восстанови материал — Фреди сверит полноту', act: 3 },
    { n: 6, em: '🎓', t: 'Свой материал', d: 'Полный цикл: свой текст → сигнал → пересказ по опоре', act: 3 }
  ];
  var ACTS = { 1: 'Акт I · Глаз', 2: 'Акт II · Рука', 3: 'Акт III · Память' };

  function loadProg() {
    try { var p = JSON.parse(localStorage.getItem('signal_path') || 'null'); if (p && typeof p === 'object') return p; } catch (e) {}
    return { done: {}, best: 0, title: '' };
  }
  function saveProg(p) { try { localStorage.setItem('signal_path', JSON.stringify(p)); } catch (e) {} }
  function maxUnlocked(p) { var m = 1; for (var i = 1; i <= 6; i++) { if (p.done[i]) m = i + 1; else break; } return Math.min(m, 6); }

  var ST = { screen: 'home', lvl: 0, ti: 0, tasks: [], score: 0, wins: 0, answered: false, marks: [], own: {}, busy: false };

  // ===== Стили =====
  function injectCSS() {
    if (document.getElementById('signal-css')) return;
    var st = document.createElement('style'); st.id = 'signal-css';
    st.textContent = [
      '.sg-wrap{max-width:640px;margin:0 auto;padding:18px 16px 96px;color:#e7eaf0;font-size:1rem;line-height:1.6}',
      '.sg-top{display:flex;justify-content:space-between;align-items:center;color:#8b93a7;font-size:.86rem;margin-bottom:14px}',
      '.sg-x{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:0}',
      '.sg-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:0 0 6px}',
      '.sg-sub{color:#aab2c4;margin:0 0 16px}',
      '.sg-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px;margin:0 0 12px}',
      '.sg-card b{color:#fff;font-weight:600}',
      '.sg-ch{font-weight:700;color:#fff;margin-bottom:8px}',
      '.sg-sig{font-family:ui-monospace,monospace;background:rgba(20,184,166,.10);border:1px solid rgba(45,212,191,.4);border-radius:12px;padding:12px 14px;color:#99f6e4;font-size:1.02rem;line-height:1.5}',
      '.sg-choice{display:block;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);border-radius:13px;padding:13px 15px;margin:0 0 10px;color:#e7eaf0;font:inherit;font-size:.95rem;line-height:1.5;cursor:pointer;transition:.15s}',
      '.sg-choice:hover{border-color:rgba(45,212,191,.6)}',
      '.sg-choice:disabled{cursor:default;opacity:1}',
      '.sg-choice.ok{border-color:#2dd4bf;background:rgba(45,212,191,.12)}',
      '.sg-choice.no{border-color:#f87171;background:rgba(248,113,113,.10);opacity:.85}',
      '.sg-choice.dim{opacity:.45}',
      '.sg-why{background:rgba(45,212,191,.07);border:1px solid rgba(45,212,191,.28);border-radius:12px;padding:12px 14px;margin:2px 0 12px;font-size:.92rem;color:#d7f5ef;line-height:1.55}',
      '.sg-prog{display:flex;gap:5px;margin-bottom:14px}',
      '.sg-prog i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.14)}',
      '.sg-prog i.on{background:#2dd4bf}',
      '.sg-prog i.hit{background:#34d399}',
      '.sg-prog i.miss{background:#f87171}',
      '.sg-node{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px 14px;margin:0 0 8px;color:#e7eaf0;font:inherit;cursor:pointer;transition:.15s}',
      '.sg-node:hover{border-color:rgba(45,212,191,.55)}',
      '.sg-node.lock{opacity:.45;cursor:default}',
      '.sg-node .nem{font-size:1.3rem;width:34px;text-align:center;flex-shrink:0}',
      '.sg-node .nt{font-weight:700;color:#fff;font-size:.97rem}',
      '.sg-node .nd{color:#8b93a7;font-size:.8rem;line-height:1.35}',
      '.sg-node .nst{margin-left:auto;flex-shrink:0;font-size:.95rem}',
      '.sg-node.next{border-color:rgba(45,212,191,.55);background:rgba(45,212,191,.07)}',
      '.sg-act{color:#8b93a7;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;margin:14px 2px 8px;font-weight:700}',
      '.sg-ta{width:100%;box-sizing:border-box;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;font:15px/1.5 inherit;padding:12px 13px;resize:vertical;min-height:72px}',
      '.sg-ta:focus{outline:none;border-color:#2dd4bf}',
      '.sg-vs{display:grid;grid-template-columns:1fr;gap:10px;margin:0 0 12px}',
      '.sg-vs .you{border:1px solid rgba(59,130,246,.4);background:rgba(59,130,246,.08);border-radius:13px;padding:12px 14px}',
      '.sg-vs .fre{border:1px solid rgba(45,212,191,.4);background:rgba(45,212,191,.07);border-radius:13px;padding:12px 14px}',
      '.sg-vs .who{font-size:.76rem;letter-spacing:.05em;text-transform:uppercase;color:#8b93a7;margin-bottom:5px;font-weight:700}',
      '.sg-pill{display:inline-block;padding:6px 14px;border-radius:999px;font-weight:800;font-size:1.05rem}',
      '.sg-pill.w{background:rgba(52,211,153,.16);color:#6ee7b7}',
      '.sg-pill.l{background:rgba(248,113,113,.14);color:#fca5a5}',
      '.sg-primary{width:100%;margin-top:14px;padding:14px 16px;border:none;border-radius:12px;background:linear-gradient(135deg,#0d9488,#2dd4bf);color:#fff;font:700 1rem inherit;cursor:pointer}',
      '.sg-primary:disabled{opacity:.5;cursor:default}',
      '.sg-secondary{width:100%;margin-top:10px;padding:12px 16px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:transparent;color:#cdd4e2;font:600 .95rem inherit;cursor:pointer}',
      '.sg-hint{color:#8b93a7;font-size:.85rem;margin:6px 2px}',
      '.sg-score{font-size:2.6rem;font-weight:800;letter-spacing:-.03em;line-height:1;color:#fff}',
      '.sg-fb{color:#d7def0;line-height:1.6}',
      '.sg-row{display:flex;gap:10px;margin-top:14px}',
      '.sg-row>*{flex:1;margin-top:0}',
      '.sg-course{display:block;text-align:center;margin:12px 0 0;padding:11px;font-size:.9rem;color:#5eead4;text-decoration:none;background:rgba(45,212,191,.08);border:1px solid rgba(45,212,191,.25);border-radius:12px}',
      '.sg-lec{display:inline-block;margin-top:9px;font-size:.85rem;color:#5eead4;text-decoration:none;border-bottom:1px solid rgba(94,234,212,.35)}',
      '.sg-spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sgspin .7s linear infinite;vertical-align:-3px;margin-right:6px}',
      '@keyframes sgspin{to{transform:rotate(360deg)}}',
      '[data-theme="light"] .sg-wrap{color:#1d1d1f}',
      '[data-theme="light"] .sg-card,[data-theme="light"] .sg-node,[data-theme="light"] .sg-choice{background:#fff;border-color:rgba(0,0,0,.12);color:#1d1d1f}',
      '[data-theme="light"] .sg-card b,[data-theme="light"] .sg-ch,[data-theme="light"] .sg-score,[data-theme="light"] .sg-node .nt{color:#0b1220}',
      '[data-theme="light"] .sg-sub,[data-theme="light"] .sg-hint,[data-theme="light"] .sg-top,[data-theme="light"] .sg-node .nd{color:#5a6472}',
      '[data-theme="light"] .sg-ta{background:#f5f7fa;color:#0b1220;border-color:rgba(0,0,0,.15)}',
      '[data-theme="light"] .sg-sig{background:#e6faf7;color:#0f766e}',
      '[data-theme="light"] .sg-why{background:#e9f9f6;color:#134e4a}',
      '[data-theme="light"] .sg-fb{color:#333}',
      '[data-theme="light"] .sg-course,[data-theme="light"] .sg-lec{color:#0f766e}',
      '@media(max-width:560px){.sg-wrap{padding:14px 12px 96px}.sg-h1{font-size:1.32rem}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ===== Дом: карта пути =====
  function home() {
    injectCSS();
    ST.screen = 'home';
    var c = container(); if (!c) return;
    var p = loadProg();
    var unlocked = maxUnlocked(p);
    var doneCount = Object.keys(p.done).length;
    var nodes = '', lastAct = 0;
    LEVELS.forEach(function (L) {
      if (L.act !== lastAct) { nodes += '<div class="sg-act">' + ACTS[L.act] + '</div>'; lastAct = L.act; }
      var done = !!p.done[L.n];
      var isNext = !done && L.n === unlocked;
      var locked = !done && L.n > unlocked;
      nodes += '<button class="sg-node' + (isNext ? ' next' : '') + (locked ? ' lock' : '') + '" onclick="' + (locked ? '' : 'SIGNAL.play(' + L.n + ')') + '">' +
        '<span class="nem">' + L.em + '</span>' +
        '<span><span class="nt">' + L.n + '. ' + esc(L.t) + '</span><br><span class="nd">' + esc(L.d) + '</span></span>' +
        '<span class="nst">' + (done ? '✅' : (isNext ? '▶' : '🔒')) + '</span>' +
      '</button>';
    });
    c.innerHTML =
      '<div class="sg-wrap">' +
        '<div class="sg-top"><button class="sg-x" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button><span>📡 бесплатно</span></div>' +
        '<h1 class="sg-h1">📡 Сигнал</h1>' +
        '<p class="sg-sub">Тренажёр опорных сигналов по методу Шаталова: учись сжимать любой материал в опору, которую <b style="color:#e7eaf0">невозможно забыть</b>, — и разворачивать её обратно в знание. Так запоминают учебник за вечер.</p>' +
        '<div class="sg-card"><div class="sg-ch">Пример: целая тема одной строкой</div>' +
          '<div style="color:#8b93a7;font-size:.85rem;margin-bottom:6px">Кривая забывания Эббингауза:</div>' +
          '<div class="sg-sig">📉 −70% за сутки → повтор: 0 · 1д · 7д</div>' +
          '<div class="sg-hint" style="margin-top:8px">Семь элементов — и вся тема восстанавливается по памяти. Этому и учимся: 6 уровней от «отличи опору» до полного цикла на своём материале.</div>' +
        '</div>' +
        (p.title ? '<div style="text-align:center;margin:0 0 10px"><span class="sg-pill w">' + esc(p.title) + '</span></div>' : '') +
        (doneCount ? '<div class="sg-hint" style="margin:0 0 8px">Пройдено уровней: ' + doneCount + '/6</div>' : '') +
        nodes +
        '<a class="sg-course" href="' + COURSE_URL + '" target="_blank" rel="noopener">🎓 Теория — курс «Опорные сигналы: метод Шаталова»</a>' +
      '</div>';
    track('game_open', { game: 'signal', unlocked: unlocked });
  }

  function play(n) {
    var p = loadProg();
    if (n > maxUnlocked(p)) { toast('Сначала пройди предыдущий уровень', 'info'); return; }
    ST.lvl = n; ST.ti = 0; ST.score = 0; ST.wins = 0; ST.marks = []; ST.answered = false;
    track('sg_level_start', { level: n });
    if (n === 1) { ST.tasks = shuffle(PAIRS); renderPair(); }
    else if (n === 2) { ST.tasks = shuffle(QUADS); renderQuad(); }
    else if (n === 3 || n === 4) { ST.tasks = shuffle(TEXTS).slice(0, 3); renderSqueeze(); }
    else if (n === 5) { ST.tasks = shuffle(TEXTS).slice(0, 3); renderExpand(); }
    else if (n === 6) { ST.own = {}; renderOwnText(); }
  }

  function progBar() {
    var h = '<div class="sg-prog">';
    for (var i = 0; i < ST.tasks.length; i++) {
      var cls = '';
      if (i < ST.marks.length) cls = ST.marks[i] ? ' hit' : ' miss';
      else if (i === ST.marks.length) cls = ' on';
      h += '<i class="' + cls + '"></i>';
    }
    return h + '</div>';
  }
  function lvlHead(sub) {
    var L = LEVELS[ST.lvl - 1];
    return '<div class="sg-top"><span>' + L.em + ' Уровень ' + L.n + ' · ' + esc(L.t) + '</span><button class="sg-x" onclick="SIGNAL.quitLevel()">✕ Выйти</button></div>' +
      (sub ? '<p class="sg-sub" style="margin-bottom:12px">' + sub + '</p>' : '');
  }
  function quitLevel() {
    if (ST.ti > 0 && !confirm('Выйти? Прогресс уровня не сохранится.')) return;
    home();
  }
  function lecLink(key) { var l = LEC[key]; return '<a class="sg-lec" href="' + l.u + '" target="_blank" rel="noopener">📖 Лекция: ' + esc(l.t) + ' →</a>'; }

  // ===== Уровень 1 =====
  function renderPair() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var opts = shuffle([{ t: t.good, ok: true }, { t: t.bad, ok: false }]);
    ST._opts = opts;
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead('Тема записана двумя способами. Какой вариант ты реально сможешь воспроизвести по памяти через неделю?') + progBar() +
        '<div class="sg-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:4px">Тема</div><div class="sg-ch" style="margin:0">' + esc(t.theme) + '</div></div>' +
        opts.map(function (o, i) { return '<button class="sg-choice" id="sgC' + i + '" onclick="SIGNAL.pickPair(' + i + ')">' + esc(o.t) + '</button>'; }).join('') +
        '<div id="sgWhy"></div>' +
      '</div>';
  }
  function pickPair(i) {
    if (ST.answered) return;
    ST.answered = true;
    var t = ST.tasks[ST.ti];
    var hit = !!ST._opts[i].ok;
    ST.marks.push(hit);
    if (hit) { ST.score++; vibe(20); } else { vibe([40, 60, 40]); }
    for (var j = 0; j < ST._opts.length; j++) {
      var b = document.getElementById('sgC' + j); if (!b) continue;
      b.disabled = true;
      b.className = 'sg-choice' + (ST._opts[j].ok ? ' ok' : (j === i ? ' no' : ' dim'));
    }
    var w = document.getElementById('sgWhy');
    if (w) w.innerHTML = '<div class="sg-why">' + (hit ? '✅ Точно. ' : '❌ Мимо. ') + esc(t.why) + '</div>' +
      '<button class="sg-primary" onclick="SIGNAL.nextTask()">' + (ST.ti + 1 < ST.tasks.length ? 'Дальше →' : 'Итог уровня →') + '</button>';
  }

  // ===== Уровень 2 =====
  var KLBL = { over: 'Это переписанный текст, а не сжатие: перечитывать — не вспоминать.', abs: 'Это туман: коротко, но по нему ничего не восстановишь.', mess: 'Это каша: слова без структуры — связи потеряны.' };
  function renderQuad() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var opts = shuffle(t.opts);
    ST._opts = opts;
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead('Выбери сильный опорный сигнал. Критерии Шаталова: ' + CRITERIA + '.') + progBar() +
        '<div class="sg-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:4px">Материал</div><div class="sg-fb">' + esc(t.fact) + '</div></div>' +
        opts.map(function (o, i) { return '<button class="sg-choice" id="sgC' + i + '" onclick="SIGNAL.pickQuad(' + i + ')"><span class="sg-sig" style="display:block;border:none;background:none;padding:0">' + esc(o.t) + '</span></button>'; }).join('') +
        '<div id="sgWhy"></div>' +
      '</div>';
  }
  function pickQuad(i) {
    if (ST.answered) return;
    ST.answered = true;
    var t = ST.tasks[ST.ti];
    var hit = ST._opts[i].k === 'ok';
    ST.marks.push(hit);
    if (hit) { ST.score++; vibe(20); } else { vibe([40, 60, 40]); }
    for (var j = 0; j < ST._opts.length; j++) {
      var b = document.getElementById('sgC' + j); if (!b) continue;
      b.disabled = true;
      b.className = 'sg-choice' + (ST._opts[j].k === 'ok' ? ' ok' : (j === i ? ' no' : ' dim'));
    }
    var picked = ST._opts[i];
    var extra = hit ? '' : ('<b>' + esc(KLBL[picked.k] || '') + '</b><br>');
    var w = document.getElementById('sgWhy');
    if (w) w.innerHTML = '<div class="sg-why">' + (hit ? '✅ Точно. ' : '❌ Мимо. ' + extra) + esc(t.why) + '</div>' +
      '<button class="sg-primary" onclick="SIGNAL.nextTask()">' + (ST.ti + 1 < ST.tasks.length ? 'Дальше →' : 'Итог уровня →') + '</button>';
  }

  function nextTask() {
    ST.ti++;
    if (ST.ti < ST.tasks.length) {
      if (ST.lvl === 1) renderPair(); else renderQuad();
      return;
    }
    finishRecog();
  }
  function finishRecog() {
    var need = ST.lvl === 1 ? 5 : 4;
    var total = ST.tasks.length;
    var passed = ST.score >= need;
    var p = loadProg();
    if (passed) { p.done[ST.lvl] = true; saveProg(p); }
    track(passed ? 'sg_level_pass' : 'sg_level_fail', { level: ST.lvl, score: ST.score });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:18px 0 8px"><div class="sg-score">' + ST.score + '<span style="font-size:1.1rem;color:#8b93a7">/' + total + '</span></div><div class="sg-hint" style="margin-top:4px">нужно ' + need + ' из ' + total + '</div></div>' +
        '<div style="text-align:center;margin-bottom:12px"><span class="sg-pill ' + (passed ? 'w' : 'l') + '">' + (passed ? '✅ Уровень пройден' : 'Пока не хватило') + '</span></div>' +
        '<div class="sg-card"><div class="sg-fb">' + (passed ? 'Глаз намётан: ты отличаешь опору от простыни и каши. Дальше — сжимать самому.' : 'Нормально: распознавание ставится повторами, задачи перемешаются.') + '</div>' + lecLink('anatomiya') + '</div>' +
        (passed ? '<button class="sg-primary" onclick="SIGNAL.home()">К карте пути →</button>'
                : '<button class="sg-primary" onclick="SIGNAL.play(' + ST.lvl + ')">🔁 Ещё попытка</button><button class="sg-secondary" onclick="SIGNAL.home()">К карте пути</button>') +
      '</div>';
  }

  // ===== Уровни 3–4: сжатие с ИИ-оценкой =====
  function renderSqueeze() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var duel = ST.lvl === 4;
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead(duel ? 'Дуэль: твой сигнал против образца Фреди. Побеждает оценка 7+ из 10.' : 'Сожми материал в опорный сигнал: до 7 элементов, стрелки со смыслом, образы приветствуются.') + progBar() +
        (duel ? '<div class="sg-hint" style="margin:0 0 8px;text-align:center">Побед: ' + ST.wins + ' из ' + ST.ti + ' · нужно 2 из 3</div>' : '') +
        '<div class="sg-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:4px">' + esc(t.theme) + '</div><div class="sg-fb">' + esc(t.text) + '</div></div>' +
        '<textarea class="sg-ta" id="sgIn" placeholder="Твой опорный сигнал: слова, стрелки →, символы…"></textarea>' +
        '<button class="sg-primary" onclick="SIGNAL.submitSqueeze()">Сжал ✂️</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('sgIn'); if (el) el.focus(); }, 60);
  }
  function parseJson(txt) {
    if (!txt) return null;
    var m = String(txt).match(/\{[\s\S]*\}/); if (!m) return null;
    try { return JSON.parse(m[0]); } catch (e) { return null; }
  }
  async function submitSqueeze() {
    if (ST.busy) return;
    var v = ((document.getElementById('sgIn') || {}).value || '').trim();
    if (v.length < 3) { toast('Впиши сигнал', 'error'); return; }
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="sg-wrap" style="text-align:center;padding-top:60px"><div class="sg-score"><span class="sg-spin"></span></div><p class="sg-sub" style="margin-top:16px">Фреди проверяет сигнал по критериям Шаталова…</p></div>';
    var t = ST.tasks[ST.ti];
    var res = null;
    try {
      var r = await aiGenerate(
        'Ты — тренер опорных сигналов по методу Шаталова. Исходный материал: «' + t.text + '».\n' +
        'Опорный сигнал игрока: «' + v + '».\n' +
        'Оцени сигнал 0–10 по критериям: ' + CRITERIA + '. Главный тест: можно ли по этому сигналу (не видя текста) восстановить материал без потерь и без двусмысленностей? Переписанный текст = низкая оценка (нет сжатия); туманная абстракция = низкая (не восстановишь); больше 7 элементов = минус.\n' +
        'Верни СТРОГО один JSON: {"score":ЧИСЛО,"note":"одна фраза — чем силён или слаб","tip":"одна фраза — как усилить"}. По-русски, на «ты».',
        { max_tokens: 200, temperature: 0.3 });
      res = parseJson(r && r.content);
      if (res) { res.score = Math.max(0, Math.min(10, Math.round(Number(res.score)))); if (isNaN(res.score)) res = null; }
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { score: 7, note: 'Связь с Фреди подвисла — раунд засчитан тебе.', tip: '' };
    var pass = res.score >= (ST.lvl === 4 ? 7 : 6);
    ST.marks.push(pass);
    if (pass) { ST.wins++; vibe(25); } else vibe([40, 60, 40]);
    track('sg_squeeze', { level: ST.lvl, score: res.score });
    if (!c) return;
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:4px 0 10px"><span class="sg-pill ' + (pass ? 'w' : 'l') + '">' + (pass ? (ST.lvl === 4 ? '🏆 Раунд твой!' : '✅ Зачёт') : 'Слабовато') + '</span><div class="sg-hint" style="margin-top:6px">Оценка: <b style="color:#fff">' + res.score + '/10</b></div></div>' +
        '<div class="sg-vs">' +
          '<div class="you"><div class="who">Твой сигнал</div><div class="sg-sig" style="background:none;border:none;padding:0">' + nl2br(v) + '</div></div>' +
          '<div class="fre"><div class="who">Образец Фреди</div><div class="sg-sig" style="background:none;border:none;padding:0">' + esc(t.ref) + '</div></div>' +
        '</div>' +
        ((res.note || res.tip) ? '<div class="sg-why">💬 ' + esc(res.note || '') + (res.tip ? '<br>🔧 ' + esc(res.tip) : '') + '</div>' : '') +
        '<button class="sg-primary" onclick="SIGNAL.nextGen()">' + (ST.ti + 1 < ST.tasks.length ? 'Следующий текст →' : 'Итог уровня →') + '</button>' +
      '</div>';
  }
  function nextGen() {
    ST.ti++;
    if (ST.ti < ST.tasks.length) { if (ST.lvl === 5) renderExpand(); else renderSqueeze(); return; }
    var passed = ST.wins >= 2;
    var p = loadProg();
    if (passed) { p.done[ST.lvl] = true; saveProg(p); }
    track(passed ? 'sg_level_pass' : 'sg_level_fail', { level: ST.lvl, wins: ST.wins });
    var c = container(); if (!c) return;
    var lecKey = ST.lvl === 5 ? 'vosproizv' : 'szhatie';
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:18px 0 8px"><div class="sg-score">' + ST.wins + '<span style="font-size:1.1rem;color:#8b93a7">/' + ST.tasks.length + '</span></div><div class="sg-hint" style="margin-top:4px">зачётов · нужно 2</div></div>' +
        '<div style="text-align:center;margin-bottom:12px"><span class="sg-pill ' + (passed ? 'w' : 'l') + '">' + (passed ? '✅ Уровень пройден' : 'Пока не хватило') + '</span></div>' +
        '<div class="sg-card"><div class="sg-fb">' + (passed ? 'Рука ставится. Сравнивай свои сигналы с образцами — у Фреди подсмотрены приёмы Шаталова.' : 'Тексты перемешаются — попробуй ещё: меньше слов, больше структуры.') + '</div>' + lecLink(lecKey) + '</div>' +
        (passed ? '<button class="sg-primary" onclick="SIGNAL.home()">К карте пути →</button>'
                : '<button class="sg-primary" onclick="SIGNAL.play(' + ST.lvl + ')">🔁 Ещё попытка</button><button class="sg-secondary" onclick="SIGNAL.home()">К карте пути</button>') +
      '</div>';
  }

  // ===== Уровень 5: развёртка по чужой опоре =====
  function renderExpand() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead('Перед тобой только опорный сигнал. Разверни его в связный пересказ — как рассказал бы другу. Фреди сверит с полным материалом.') + progBar() +
        '<div class="sg-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:6px">' + esc(t.theme) + '</div><div class="sg-sig">' + esc(t.ref) + '</div></div>' +
        '<textarea class="sg-ta" id="sgIn" style="min-height:110px" placeholder="Разворачиваю: …"></textarea>' +
        '<button class="sg-primary" onclick="SIGNAL.submitExpand()">Развернул 🔊</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('sgIn'); if (el) el.focus(); }, 60);
  }
  async function submitExpand() {
    if (ST.busy) return;
    var v = ((document.getElementById('sgIn') || {}).value || '').trim();
    if (v.length < 15) { toast('Разверни подробнее — как рассказ другу', 'error'); return; }
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="sg-wrap" style="text-align:center;padding-top:60px"><div class="sg-score"><span class="sg-spin"></span></div><p class="sg-sub" style="margin-top:16px">Фреди сверяет пересказ с материалом…</p></div>';
    var t = ST.tasks[ST.ti];
    var res = null;
    try {
      var r = await aiGenerate(
        'Ты — тренер метода Шаталова. Эталонный материал: «' + t.text + '».\n' +
        'Игрок видел только опорный сигнал «' + t.ref + '» и развернул его так: «' + v + '».\n' +
        'Оцени полноту и точность восстановления 0–10 (мелкие свои слова — норм; потеря ключевых элементов или искажение смысла — минус).\n' +
        'Верни СТРОГО один JSON: {"score":ЧИСЛО,"note":"одна фраза — что восстановлено хорошо","missed":"что упущено или искажено, либо пустая строка"}. По-русски, на «ты».',
        { max_tokens: 220, temperature: 0.3 });
      res = parseJson(r && r.content);
      if (res) { res.score = Math.max(0, Math.min(10, Math.round(Number(res.score)))); if (isNaN(res.score)) res = null; }
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { score: 7, note: 'Связь с Фреди подвисла — раунд засчитан тебе.', missed: '' };
    var pass = res.score >= 6;
    ST.marks.push(pass);
    if (pass) { ST.wins++; vibe(25); } else vibe([40, 60, 40]);
    track('sg_expand', { score: res.score });
    if (!c) return;
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:4px 0 10px"><span class="sg-pill ' + (pass ? 'w' : 'l') + '">' + (pass ? '✅ Восстановлено' : 'Не всё восстановлено') + '</span><div class="sg-hint" style="margin-top:6px">Полнота: <b style="color:#fff">' + res.score + '/10</b></div></div>' +
        '<div class="sg-card"><div class="sg-ch">Эталон</div><div class="sg-fb">' + esc(t.text) + '</div></div>' +
        ((res.note || res.missed) ? '<div class="sg-why">💬 ' + esc(res.note || '') + (res.missed ? '<br>⚠️ Упущено: ' + esc(res.missed) : '') + '</div>' : '') +
        '<button class="sg-primary" onclick="SIGNAL.nextGen()">' + (ST.ti + 1 < ST.tasks.length ? 'Следующая опора →' : 'Итог уровня →') + '</button>' +
      '</div>';
  }

  // ===== Уровень 6: свой материал — полный цикл =====
  function renderOwnText() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead('Экзамен: полный цикл на твоём материале. Вставь текст, который тебе реально нужно запомнить, — из учёбы, работы, книги.') +
        '<textarea class="sg-ta" id="sgOwn" style="min-height:140px" maxlength="1500" placeholder="Вставь свой материал (до 1500 знаков)…"></textarea>' +
        '<button class="sg-primary" onclick="SIGNAL.ownToSignal()">Дальше: сжимаю →</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('sgOwn'); if (el) el.focus(); }, 60);
  }
  function ownToSignal() {
    var v = ((document.getElementById('sgOwn') || {}).value || '').trim();
    if (v.length < 80) { toast('Нужен содержательный кусок — хотя бы пара абзацев', 'error'); return; }
    ST.own.text = v;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead('Шаг 2. Сожми свой материал в опорный сигнал. До 7 элементов, стрелки, образы.') +
        '<div class="sg-card" style="max-height:180px;overflow:auto"><div class="sg-fb" style="font-size:.9rem">' + nl2br(ST.own.text) + '</div></div>' +
        '<textarea class="sg-ta" id="sgIn" placeholder="Твой опорный сигнал…"></textarea>' +
        '<button class="sg-primary" onclick="SIGNAL.ownToRecall()">Сжал — скрывай текст ✂️</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('sgIn'); if (el) el.focus(); }, 60);
  }
  function ownToRecall() {
    var v = ((document.getElementById('sgIn') || {}).value || '').trim();
    if (v.length < 3) { toast('Впиши сигнал', 'error'); return; }
    ST.own.signal = v; vibe(15);
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead('Шаг 3. Текст скрыт. Перед тобой — только твоя опора. Разверни материал по памяти.') +
        '<div class="sg-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:6px">Твоя опора</div><div class="sg-sig">' + nl2br(ST.own.signal) + '</div></div>' +
        '<textarea class="sg-ta" id="sgIn2" style="min-height:130px" placeholder="Пересказываю по опоре…"></textarea>' +
        '<button class="sg-primary" onclick="SIGNAL.ownFinish()">Пересказал — оценка Фреди 🎓</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('sgIn2'); if (el) el.focus(); }, 60);
  }
  async function ownFinish() {
    if (ST.busy) return;
    var v = ((document.getElementById('sgIn2') || {}).value || '').trim();
    if (v.length < 30) { toast('Разверни подробнее', 'error'); return; }
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="sg-wrap" style="text-align:center;padding-top:60px"><div class="sg-score"><span class="sg-spin"></span></div><p class="sg-sub" style="margin-top:16px">Фреди оценивает полный цикл…</p></div>';
    var res = null;
    try {
      var r = await aiGenerate(
        'Ты — тренер метода Шаталова. Игрок прошёл полный цикл на своём материале.\n' +
        'Исходный текст: «' + ST.own.text.slice(0, 1200) + '».\n' +
        'Его опорный сигнал: «' + ST.own.signal + '».\n' +
        'Его пересказ по опоре (текста он не видел): «' + v + '».\n' +
        'Оцени: SIGNAL 0–10 — качество сигнала (' + CRITERIA + '); RECALL 0–10 — полнота восстановления.\n' +
        'Верни СТРОГО один JSON: {"signal":ЧИСЛО,"recall":ЧИСЛО,"praise":"одна фраза — что удалось","tip":"одна фраза — главный совет по методу"}. По-русски, на «ты».',
        { max_tokens: 240, temperature: 0.3 });
      res = parseJson(r && r.content);
      if (res) {
        res.signal = Math.max(0, Math.min(10, Math.round(Number(res.signal))));
        res.recall = Math.max(0, Math.min(10, Math.round(Number(res.recall))));
        if (isNaN(res.signal) || isNaN(res.recall)) res = null;
      }
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { signal: 7, recall: 7, praise: 'Цикл пройден — связь с Фреди подвисла, зачёт твой.', tip: '' };
    var total = res.signal + res.recall;
    var passed = total >= 12;
    var p = loadProg();
    if (passed) {
      p.done[6] = true;
      p.title = total >= 17 ? '📡 Мастер сигнала' : '📡 Сигнальщик';
      if (total > (p.best || 0)) p.best = total;
      saveProg(p);
    }
    track(passed ? 'sg_level_pass' : 'sg_level_fail', { level: 6, signal: res.signal, recall: res.recall });
    track('game_finish', { game: 'signal', total: total });
    if (!c) return;
    c.innerHTML =
      '<div class="sg-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:14px 0 8px"><div class="sg-score">' + total + '<span style="font-size:1.1rem;color:#8b93a7">/20</span></div>' +
        '<div class="sg-hint">сигнал ' + res.signal + '/10 · восстановление ' + res.recall + '/10 · нужно 12</div></div>' +
        '<div style="text-align:center;margin-bottom:12px">' + (passed ? '<span class="sg-pill w">' + esc(p.title) + '</span>' : '<span class="sg-pill l">Пересдача — это метод</span>') + '</div>' +
        (res.praise ? '<div class="sg-card"><div class="sg-ch">Что удалось</div><div class="sg-fb">' + nl2br(res.praise) + '</div></div>' : '') +
        (res.tip ? '<div class="sg-why">🔧 ' + esc(res.tip) + '</div>' : '') +
        '<div class="sg-card"><div class="sg-ch">Взять в жизнь</div><div class="sg-fb">Метод Шаталова — это цикл: <b>сжал → отложил → развернул вслух</b>. Прогоняй через него всё, что надо запомнить: лекцию, главу, инструкцию. Повторы по опоре: сразу · через день · через неделю.</div></div>' +
        '<div class="sg-row"><button class="sg-primary" onclick="SIGNAL.play(6)">🔁 Ещё материал</button><button class="sg-secondary" onclick="SIGNAL.home()">К карте пути</button></div>' +
        '<a class="sg-course" href="' + COURSE_URL + '" target="_blank" rel="noopener">🎓 Углубиться: курс «Опорные сигналы: метод Шаталова»</a>' +
      '</div>';
  }

  window.SIGNAL = {
    home: home, play: play,
    pickPair: pickPair, pickQuad: pickQuad, nextTask: nextTask,
    submitSqueeze: submitSqueeze, submitExpand: submitExpand, nextGen: nextGen,
    ownToSignal: ownToSignal, ownToRecall: ownToRecall, ownFinish: ownFinish,
    quitLevel: quitLevel, getState: function () { return ST; }
  };
  window.showSignalGame = home;
})();
