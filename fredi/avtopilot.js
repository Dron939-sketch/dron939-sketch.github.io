// ============================================
// avtopilot.js — Тренажёр «Автопилот»: постановка мыслительного навыка
// на триггер. Спутник курса «Стимульный контроль для родителей»
// (/blog/lektorij/stimulnyj-kontrol/, лекция 8): то, что родитель ставил
// ребёнку, здесь ставится себе.
//
// Цепочка та же, что в курсе, по этапам:
//   1. навык — один из каталога (первый — «Хочу, а этого нет» с индексацией
//      ресурсов) или свой;
//   2. триггеры — две-три своих ситуации, где он должен срабатывать;
//   3. поведение — сценарий на 20 секунд своими словами;
//   4. отработка — поведение в чистом виде на сценах Фреди, с разбором;
//   5. привязка — сцены вперемешку: где триггер есть, а где похожая
//      ситуация без него (различение, суть стимульного контроля);
//   6. три контекста — свои ситуации из дома, работы, дороги;
//   7. подкрепление — маркер, расписание, трекер на 14 дней;
//   8. карточка автопилота + журнал срабатываний.
// Ядро локальное; Фреди (AI) генерирует сцены и разбирает ответы по
// чек-листу шагов. Всё состояние — в localStorage.
// Экспорт: window.showAvtopilotGame, window.AVTOPILOT
// ============================================
(function () {
  "use strict";

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || ''; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 500, temperature: opts.temperature == null ? 0.5 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }
  function aiText(r) { return (r && (r.content || r.text || r.response)) || ''; }
  // Модель просят вернуть JSON; на практике она иногда оборачивает его в
  // текст или ```json — вырезаем первый массив/объект.
  function aiJSON(r) {
    var t = aiText(r);
    try { return JSON.parse(t); } catch (e) {}
    var m = t.match(/[\[{][\s\S]*[\]}]/);
    if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
    return null;
  }

  // ---------- каталог навыков ----------
  // Каждый навык: триггер, шаги поведения (по ним же идёт разбор), сцены
  // без триггера — для этапа привязки, и «мост» — суть одной фразой.
  var SKILLS = {
    hochu: {
      name: 'Хочу, а этого нет', em: '🧭',
      trigger: 'вы чего-то хотите, а этого нет под рукой: вещи, времени, денег, человека',
      why: 'На этом триггере у большинства стоит «требовать», «купить в кредит» или «ну и ладно». Ставим поиск: индексация ресурсов и три пути.',
      steps: [
        'Что именно я хочу — результат, а не предмет',
        'Что у меня есть прямо сейчас — вещи, время, умения, деньги (индексация ресурсов)',
        'Кто рядом — у кого попросить, с кем сделать вместе, кто уже решал такое',
        'Три пути к результату разными способами — и первый шаг по самому дешёвому'
      ],
      bridge: 'хочу, а нет — что именно, что есть, кто рядом, три пути',
      example: 'Хочу кофе, а кофе кончился. Что именно — взбодриться. Что есть — чай, десять минут, улица. Кто рядом — соседка. Три пути: чай, пройтись, попросить у соседки. Первый шаг: ставлю чайник.',
      nonTrigger: 'ситуации, где желаемое уже есть или ничего не хочется, или где не получилось сделать (это другой триггер)'
    },
    nevyshlo: {
      name: 'Не получилось — а как ещё?', em: '🔁',
      trigger: 'вы попробовали, и не вышло: отказ, ошибка, провал, «не работает»',
      why: 'На «не вышло» обычно стоит «бросить» или «ещё раз так же». Ставим поиск второго способа.',
      steps: [
        'Назвать факт без оценки: что именно не вышло',
        '«А как ещё?» — три других способа, включая нелепые',
        'Выбрать один и назначить попытку: когда и что именно',
        'Заметить вслух: «второй способ найден» — независимо от результата'
      ],
      bridge: 'не вышло — а как ещё',
      example: 'Письмо без ответа три дня. Факт: не ответили. А как ещё — позвонить, написать коллеге, зайти лично. Выбираю звонок, завтра в десять. Второй способ найден.',
      nonTrigger: 'ситуации, где всё получилось, или где вы чего-то хотите, но ещё не пробовали'
    },
    zadelo: {
      name: 'Задело — что я себе сказал?', em: '🎯',
      trigger: 'резко стало неприятно: ёкнуло, накрыло, обидно, зло',
      why: 'Между событием и чувством стоит фраза, которую не слышно. Ставим на «задело» её вылавливание и проверку.',
      steps: [
        'Факт: что произошло — так, как записала бы камера',
        'Фраза: что я себе сказал в ту секунду, словами',
        'Проверка: откуда я знаю, что это так? Что подтверждает, что противоречит',
        'Точнее: переформулировать — не приятнее, а точнее'
      ],
      bridge: 'задело — факт, фраза, проверка, точнее',
      example: 'Сообщение «нам надо поговорить». Факт: четыре слова. Фраза: «он недоволен». Проверка: в словах недовольства нет; вчера хвалил. Точнее: «он хочет что-то обсудить, тема неизвестна».',
      nonTrigger: 'ситуации, где ничего не задело, или где просто чего-то хочется'
    },
    prosyat: {
      name: 'Просят — чьё это решение?', em: '⏸️',
      trigger: 'вас просят, предлагают, торопят с «да»',
      why: 'На «просят» у многих стоит «да» раньше, чем мысль. Ставим паузу и вопрос.',
      steps: [
        'Пауза: не отвечать в первые три секунды',
        '«Чьё это решение, если я скажу да?» — и «что я теряю?»',
        'Фраза отсрочки: «отвечу через час», «посмотрю календарь»',
        'Решение своё — да или нет — названо словами'
      ],
      bridge: 'просят — пауза, чьё решение, отсрочка, своё',
      example: 'Коллега просит подменить в субботу. Пауза. Чьё решение — его, а теряю я субботу с детьми. «Скажу к вечеру». Вечером: «нет, в эту субботу не могу».',
      nonTrigger: 'ситуации, где вы сами хотите что-то сделать и никто не просит'
    },
    mnogo: {
      name: 'Слишком много всего — первый шаг', em: '🪜',
      trigger: 'навалилось, ступор, не знаю, за что взяться',
      why: 'На перегруз обычно стоит замирание или телефон. Ставим выгрузку и шаг на десять минут.',
      steps: [
        'Выписать всё, что давит, — списком, без порядка',
        'Выбрать одно: что горит или что ближе всего',
        'Назвать шаг на десять минут — такой, что видно, сделан ли',
        'Сделать шаг сейчас, остальное — в список'
      ],
      bridge: 'много всего — список, одно, шаг на десять минут',
      example: 'Отчёт, звонок маме, сломанный кран, налоги. Список. Горит отчёт. Шаг: открыть файл и написать план из трёх пунктов. Делаю.',
      nonTrigger: 'ситуации, где задача одна и понятная, или где вы чего-то хотите'
    },
    neznayu: {
      name: 'Не знаю — сформулировать вопрос', em: '❓',
      trigger: 'ловите себя на «не знаю», «понятия не имею», замираете перед незнакомым',
      why: 'На «не знаю» стоит либо угадать, либо замолчать. Ставим вопрос словами и адрес ответа.',
      steps: [
        'Что именно я не знаю — вопрос одним предложением',
        'Где ответ: кто знает, где написано, что можно проверить',
        'Первый запрос: кому и что спросить, что открыть',
        'Сделать запрос — сегодня'
      ],
      bridge: 'не знаю — вопрос, адрес, запрос',
      example: 'Не знаю, как оформить возврат. Вопрос: «в какой срок и куда подать заявление?» Адрес: сайт магазина, чат поддержки. Запрос: пишу в чат сейчас.',
      nonTrigger: 'ситуации, где ответ известен, или где просто не вышло с первого раза'
    },
    custom: {
      name: 'Свой навык', em: '✍️', custom: true,
      trigger: '', why: 'Назовите триггер и три-четыре шага, которые должны за ним идти.',
      steps: [], bridge: '', example: '', nonTrigger: 'похожие ситуации без этого триггера'
    }
  };
  var ORDER = ['hochu', 'nevyshlo', 'zadelo', 'prosyat', 'mnogo', 'neznayu', 'custom'];
  var CONTEXTS = [
    { k: 'dom', t: 'Дом и близкие' },
    { k: 'rabota', t: 'Работа и деньги' },
    { k: 'lyudi', t: 'Дорога, люди, случайности' }
  ];

  // ---------- хранение ----------
  function fresh() {
    return { v: 1, skill: '', custom: { name: '', trigger: '', steps: [] }, triggers: [], script: '',
             drill: [], pair: [], ctx: {}, reinforce: { marker: '', when: '' }, plan: null, stage: 'skill' };
  }
  function load() {
    try { var s = JSON.parse(localStorage.getItem('avtopilot_v1') || 'null'); if (s && s.v === 1) return s; } catch (e) {}
    return fresh();
  }
  function save() { try { localStorage.setItem('avtopilot_v1', JSON.stringify(ST)); } catch (e) {} }
  var ST = load();

  function skill() {
    var s = SKILLS[ST.skill] || SKILLS.hochu;
    if (s.custom) {
      return { name: ST.custom.name || 'Свой навык', em: '✍️', trigger: ST.custom.trigger, steps: ST.custom.steps,
               bridge: ST.custom.trigger + ' — ' + ST.custom.steps.join(', '), example: '', why: s.why, nonTrigger: s.nonTrigger };
    }
    return s;
  }

  // ---------- стили ----------
  function injectCSS() {
    if (document.getElementById('avtopilotCSS')) return;
    var st = document.createElement('style');
    st.id = 'avtopilotCSS';
    st.textContent =
      '.ap-wrap{max-width:640px;margin:0 auto;padding:18px 14px 40px;color:#e8ebf1}' +
      '.ap-h{font-size:1.35rem;font-weight:700;margin:6px 0 4px}' +
      '.ap-sub{color:#98a1b3;font-size:.92rem;margin:0 0 14px;line-height:1.5}' +
      '.ap-sub a{color:#7fb0ff}' +
      '.ap-card{background:#15171c;border:1px solid #262a33;border-radius:14px;padding:14px 16px;margin:10px 0}' +
      '.ap-note{font-size:.9rem;color:#aab2c0;line-height:1.55}' +
      '.ap-row{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}' +
      '.ap-primary{flex:1;min-width:150px;background:#3A86FF;border:none;color:#fff;font-weight:700;font-size:1rem;padding:13px 16px;border-radius:12px;cursor:pointer}' +
      '.ap-primary[disabled]{opacity:.5;cursor:default}' +
      '.ap-secondary{background:none;border:1px solid #3a3f4b;color:#c8ccd4;padding:12px 16px;border-radius:12px;cursor:pointer}' +
      '.ap-input,.ap-ta{width:100%;background:#0f1115;border:1px solid #2a2f3a;border-radius:10px;color:#e8ebf1;padding:11px 12px;font-size:1rem;box-sizing:border-box;font-family:inherit}' +
      '.ap-ta{min-height:96px;resize:vertical;line-height:1.45}' +
      '.ap-skill{display:block;width:100%;text-align:left;background:#171a21;border:1px solid #262a33;border-radius:12px;padding:12px 14px;margin:8px 0;color:#e8ebf1;cursor:pointer;font-family:inherit}' +
      '.ap-skill.on{border-color:#3A86FF;background:#151d2c}' +
      '.ap-skill b{display:block;font-size:1rem}.ap-skill small{display:block;color:#98a1b3;font-size:.84rem;line-height:1.45;margin-top:3px}' +
      '.ap-steps{margin:8px 0 0 18px;padding:0;color:#cdd3dd;font-size:.92rem;line-height:1.5}.ap-steps li{margin:4px 0}' +
      '.ap-stage{display:flex;gap:4px;margin:6px 0 12px}.ap-stage i{flex:1;height:5px;border-radius:3px;background:#262a33}.ap-stage i.on{background:#3A86FF}' +
      '.ap-scene{background:#0f1115;border-left:3px solid #3A86FF;padding:10px 12px;border-radius:8px;margin:8px 0;font-size:.95rem;line-height:1.5}' +
      '.ap-ok{border-left:3px solid #2e7d32;padding:8px 12px;background:#121c13;border-radius:8px;margin:6px 0;font-size:.9rem;color:#a9d0ab;line-height:1.5}' +
      '.ap-warn{border-left:3px solid #e0a030;padding:8px 12px;background:#1c1912;border-radius:8px;margin:6px 0;font-size:.9rem;color:#d8c9a0;line-height:1.5}' +
      '.ap-chip{display:inline-block;background:#1b1e26;border:1px solid #2a2f3a;border-radius:20px;color:#aab2c0;padding:6px 12px;margin:3px;font-size:.88rem;cursor:pointer}' +
      '.ap-chip.on{border-color:#3A86FF;color:#fff;background:#151d2c}' +
      '.ap-check{display:flex;gap:8px;align-items:flex-start;font-size:.9rem;margin:4px 0;color:#cdd3dd}.ap-check span.m{flex:none;width:20px}' +
      '.ap-ai{white-space:pre-wrap;font-size:.92rem;line-height:1.55;color:#cdd3dd}' +
      '.ap-log{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:10px 0}' +
      '.ap-day{aspect-ratio:1;border-radius:9px;background:#0f1115;border:1px solid #2a2f3a;display:grid;place-items:center;font-size:.78rem;color:#7c8798}' +
      '.ap-day.hit{background:#153a24;border-color:#2e7d32;color:#a9d0ab}.ap-day.miss{background:#2a1a12;border-color:#a0522d;color:#d8b49f}.ap-day.today{outline:2px solid #3A86FF}' +
      '.ap-big{font-size:1.8rem;font-weight:800;color:#7fb0ff}' +
      // Светлая тема приложения (data-theme="light"): те же блоки на белом.
      '[data-theme="light"] .ap-wrap{color:#1D1D1F}[data-theme="light"] .ap-sub{color:#5A6472}[data-theme="light"] .ap-sub a{color:#2E6FE0}' +
      '[data-theme="light"] .ap-card{background:#fff;border-color:#E4E7EC}[data-theme="light"] .ap-note{color:#4A5563}' +
      '[data-theme="light"] .ap-secondary{border-color:#CFD5E0;color:#3C3C43}' +
      '[data-theme="light"] .ap-input,[data-theme="light"] .ap-ta{background:#F8F9FB;border-color:#E4E7EC;color:#1D1D1F}' +
      '[data-theme="light"] .ap-skill{background:#F8F9FB;border-color:#E4E7EC;color:#1D1D1F}[data-theme="light"] .ap-skill.on{background:#EEF4FF;border-color:#3A86FF}[data-theme="light"] .ap-skill small{color:#5A6472}' +
      '[data-theme="light"] .ap-steps{color:#3C3C43}[data-theme="light"] .ap-stage i{background:#E4E7EC}[data-theme="light"] .ap-stage i.on{background:#3A86FF}' +
      '[data-theme="light"] .ap-scene{background:#F3F7FF;color:#1D1D1F}[data-theme="light"] .ap-ai{color:#1D1D1F}' +
      '[data-theme="light"] .ap-ok{background:#EEF7EE;color:#1F5E24}[data-theme="light"] .ap-warn{background:#FFF6E5;color:#7A4B00}' +
      '[data-theme="light"] .ap-chip{background:#F3F4F6;border-color:#E4E7EC;color:#3C3C43}[data-theme="light"] .ap-chip.on{background:#EEF4FF;color:#1D1D1F;border-color:#3A86FF}' +
      '[data-theme="light"] .ap-check{color:#3C3C43}[data-theme="light"] .ap-day{background:#F3F4F6;border-color:#E4E7EC;color:#6E6E73}' +
      '[data-theme="light"] .ap-day.hit{background:#E3F3E5;border-color:#7BBF84;color:#1F5E24}[data-theme="light"] .ap-day.miss{background:#FBE9E0;border-color:#E0A080;color:#7A3B10}' +
      '[data-theme="light"] .ap-big{color:#2E6FE0}';
    document.head.appendChild(st);
  }

  var STAGES = ['skill', 'triggers', 'script', 'drill', 'pair', 'ctx', 'reinforce', 'card'];
  function stageBar(cur) {
    var i = STAGES.indexOf(cur);
    return '<div class="ap-stage">' + STAGES.map(function (s, k) { return '<i class="' + (k <= i ? 'on' : '') + '"></i>'; }).join('') + '</div>';
  }
  function head(title, sub) {
    return '<div class="ap-h">🛫 ' + esc(title) + '</div>' + (sub ? '<p class="ap-sub">' + sub + '</p>' : '');
  }

  // ---------- 0. дом ----------
  function home() {
    injectCSS();
    track('avtopilot_open', { stage: ST.stage });
    var c = container(); if (!c) return;
    var sk = ST.skill ? skill() : null;
    var html = '<div class="ap-wrap">' +
      head('Автопилот', 'Тренажёр ставит один мыслительный навык на один триггер — тем же способом, каким в курсе <a href="/blog/lektorij/stimulnyj-kontrol/">«Стимульный контроль»</a> ставят поведение ребёнку: сначала поведение в чистом виде, потом привязка к триггеру, три контекста, подкрепление. Через две недели навык запускает триггер, а не вы.');
    if (sk && ST.stage !== 'skill') {
      html += '<div class="ap-card"><b>' + sk.em + ' ' + esc(sk.name) + '</b><div class="ap-note">Этап: ' + esc(stageName(ST.stage)) + (ST.plan ? ' · срабатываний в журнале: ' + planHits() : '') + '</div>' +
        '<div class="ap-row"><button class="ap-primary" onclick="AVTOPILOT.go(\'' + ST.stage + '\')">Продолжить →</button>' +
        '<button class="ap-secondary" onclick="AVTOPILOT.reset()">Начать другой навык</button></div></div>';
    }
    html += '<div class="ap-card"><div class="ap-note"><b>Как это устроено.</b> Мысль — тоже поведение: у неё есть триггер, она случается или нет, её можно отработать и подкрепить. Вы выберете навык, назовёте свои триггеры, отработаете поведение на сценах Фреди, потом привяжете его к триггеру среди ситуаций, где триггера нет, — это и есть стимульный контроль, — и заведёте журнал на 14 дней.</div></div>';
    if (!sk || ST.stage === 'skill') html += '<div class="ap-row"><button class="ap-primary" onclick="AVTOPILOT.go(\'skill\')">Выбрать навык →</button></div>';
    html += '</div>';
    c.innerHTML = html;
  }
  function stageName(s) {
    return { skill: 'выбор навыка', triggers: 'ваши триггеры', script: 'сценарий поведения', drill: 'отработка', pair: 'привязка к триггеру', ctx: 'три контекста', reinforce: 'подкрепление', card: 'карточка и журнал' }[s] || s;
  }
  function planHits() { return (ST.plan && ST.plan.log || []).reduce(function (a, d) { return a + (d.hits || 0); }, 0); }
  function reset() {
    if (!confirm('Начать другой навык? Текущий прогресс и журнал будут удалены.')) return;
    ST = fresh(); save(); home();
  }
  function go(stage) {
    ST.stage = stage; save();
    ({ skill: scrSkill, triggers: scrTriggers, script: scrScript, drill: scrDrill, pair: scrPair, ctx: scrCtx, reinforce: scrReinforce, card: scrCard }[stage] || home)();
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  // ---------- 1. навык ----------
  function scrSkill() {
    injectCSS();
    var c = container(); if (!c) return;
    var list = ORDER.map(function (k) {
      var s = SKILLS[k];
      return '<button class="ap-skill' + (ST.skill === k ? ' on' : '') + '" onclick="AVTOPILOT.pick(\'' + k + '\')"><b>' + s.em + ' ' + esc(s.name) + '</b><small>' + esc(s.custom ? s.why : 'Триггер: ' + s.trigger + '. ' + s.why) + '</small></button>';
    }).join('');
    var sk = ST.skill ? SKILLS[ST.skill] : null;
    var detail = '';
    if (sk && !sk.custom) {
      detail = '<div class="ap-card"><b>Поведение по шагам</b><ol class="ap-steps">' + sk.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
        '<div class="ap-note" style="margin-top:8px"><b>Образец вслух.</b> ' + esc(sk.example) + '</div></div>';
    } else if (sk && sk.custom) {
      detail = '<div class="ap-card"><b>Свой навык</b>' +
        '<input class="ap-input" id="apCName" placeholder="название: например, «Опоздал — что делаю»" value="' + esc(ST.custom.name) + '" style="margin:8px 0">' +
        '<input class="ap-input" id="apCTrig" placeholder="триггер: когда именно это должно срабатывать" value="' + esc(ST.custom.trigger) + '" style="margin:8px 0">' +
        '<textarea class="ap-ta" id="apCSteps" placeholder="шаги поведения, по одному в строке, 3–4 штуки — так, чтобы было видно, сделан шаг или нет">' + esc(ST.custom.steps.join('\n')) + '</textarea>' +
        '<div class="ap-note" style="margin-top:6px">Признак хорошего шага: у него есть глагол и его можно заметить снаружи. «Быть спокойнее» — не шаг; «назвать чувство одним словом» — шаг.</div></div>';
    }
    c.innerHTML = '<div class="ap-wrap">' + head('Шаг 1. Навык', 'Один навык за раз. Второй — после того, как первый встанет на автопилот.') + stageBar('skill') + list + detail +
      '<div class="ap-row"><button class="ap-primary" ' + (ST.skill ? '' : 'disabled') + ' onclick="AVTOPILOT.saveSkill()">Дальше: мои триггеры →</button><button class="ap-secondary" onclick="AVTOPILOT.home()">← Меню</button></div></div>';
  }
  function pick(k) { ST.skill = k; save(); track('avtopilot_skill', { skill: k }); scrSkill(); }
  function saveSkill() {
    if (ST.skill === 'custom') {
      var n = (document.getElementById('apCName') || {}).value || '', t = (document.getElementById('apCTrig') || {}).value || '';
      var st = ((document.getElementById('apCSteps') || {}).value || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      if (n.length < 3 || t.length < 5 || st.length < 3) { toast('Нужны название, триггер и не меньше трёх шагов', 'info'); return; }
      ST.custom = { name: n.slice(0, 60), trigger: t.slice(0, 160), steps: st.slice(0, 5).map(function (x) { return x.slice(0, 120); }) };
    }
    save(); go('triggers');
  }

  // ---------- 2. триггеры ----------
  function scrTriggers() {
    injectCSS();
    var c = container(); if (!c) return;
    var sk = skill();
    var rows = (ST.triggers.length ? ST.triggers : ['', '']).map(function (t, i) {
      return '<input class="ap-input" data-trig="' + i + '" placeholder="' + (i === 0 ? 'например: вечером хочу заказать еду, а денег до зарплаты мало' : 'ещё одна ситуация, из другой части жизни') + '" value="' + esc(t) + '" style="margin:6px 0">';
    }).join('');
    c.innerHTML = '<div class="ap-wrap">' + head('Шаг 2. Ваши триггеры', 'Общий триггер навыка: <b>' + esc(sk.trigger) + '</b>. Теперь две-три ваши ситуации, где он случается не реже двух раз в неделю. Конкретно: место, время, кто рядом.') + stageBar('triggers') +
      '<div class="ap-card" id="apTrigBox">' + rows + '<div class="ap-row"><button class="ap-secondary" onclick="AVTOPILOT.addTrig()">+ ещё ситуация</button></div>' +
      '<div class="ap-note">Проверка каждой: «это случилось на этой неделе?» и «я узнаю момент, когда оно начинается?» Если нет — триггер размытый, и навык не на что вешать.</div></div>' +
      '<div id="apTrigAI"></div>' +
      '<div class="ap-row"><button class="ap-primary" onclick="AVTOPILOT.saveTrig()">Дальше: сценарий →</button><button class="ap-secondary" onclick="AVTOPILOT.checkTrig()">🤖 Проверить с Фреди</button></div>' +
      '<div class="ap-row"><button class="ap-secondary" onclick="AVTOPILOT.go(\'skill\')">← Навык</button></div></div>';
  }
  function readTrig() {
    var out = [];
    var els = document.querySelectorAll('[data-trig]');
    for (var i = 0; i < els.length; i++) { var v = (els[i].value || '').trim(); if (v) out.push(v.slice(0, 200)); }
    return out;
  }
  function addTrig() { ST.triggers = readTrig(); ST.triggers.push(''); save(); scrTriggers(); }
  function saveTrig() {
    var t = readTrig();
    if (t.length < 2) { toast('Нужны хотя бы две ситуации', 'info'); return; }
    ST.triggers = t; save(); go('script');
  }
  async function checkTrig() {
    var t = readTrig(); if (!t.length) { toast('Сначала напишите ситуации', 'info'); return; }
    var box = document.getElementById('apTrigAI'); box.innerHTML = '<div class="ap-card ap-note">Фреди смотрит…</div>';
    try {
      var r = await aiGenerate('Ты — Фреди, тренер навыков мышления. Человек ставит себе навык «' + skill().name + '» (триггер: ' + skill().trigger + '). Он назвал свои ситуации-триггеры:\n' + t.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n') +
        '\nПроверь каждую как тренер, по-русски, на «вы», коротко (до 5 строк всего): конкретна ли (место, момент, узнаваемое начало), случается ли достаточно часто, действительно ли это тот триггер, а не соседний (например, «не получилось» вместо «хочу, а нет»). Если размыта — предложи, как уточнить, одной фразой. Без воды и без похвалы.', { max_tokens: 380 });
      box.innerHTML = '<div class="ap-card"><b>🤖 Фреди</b><div class="ap-ai">' + esc(aiText(r) || 'Не вышло получить ответ, попробуйте позже.') + '</div></div>';
    } catch (e) { box.innerHTML = '<div class="ap-card ap-note">Сеть не отвечает. Проверьте сами по двум вопросам выше.</div>'; }
  }

  // ---------- 3. сценарий ----------
  function scrScript() {
    injectCSS();
    var c = container(); if (!c) return;
    var sk = skill();
    c.innerHTML = '<div class="ap-wrap">' + head('Шаг 3. Сценарий на двадцать секунд', 'Перепишите шаги своими словами — так, как будете говорить себе в момент триггера. Коротко: четыре строки, которые помещаются в двадцать секунд.') + stageBar('script') +
      '<div class="ap-card"><b>Шаги навыка</b><ol class="ap-steps">' + sk.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="ap-card"><textarea class="ap-ta" id="apScript" placeholder="1. …\n2. …\n3. …\n4. …">' + esc(ST.script) + '</textarea>' +
      '<div class="ap-note" style="margin-top:6px">Признак рабочего сценария: каждая строка — действие с глаголом, и по ней видно, сделано или нет. «Успокоиться» — не строка. «Назвать три пути вслух» — строка.</div></div>' +
      '<div class="ap-row"><button class="ap-primary" onclick="AVTOPILOT.saveScript()">Дальше: отработка →</button><button class="ap-secondary" onclick="AVTOPILOT.go(\'triggers\')">← Триггеры</button></div></div>';
  }
  function saveScript() {
    var v = ((document.getElementById('apScript') || {}).value || '').trim();
    if (v.length < 20) { toast('Напишите сценарий — хотя бы три строки', 'info'); return; }
    ST.script = v.slice(0, 900); save(); go('drill');
  }

  // ---------- 4. отработка: поведение в чистом виде ----------
  // Сцены с триггером, одна за другой. Человек отвечает по сценарию,
  // Фреди сверяет с чек-листом шагов. Критерий этапа — три сцены, где
  // все шаги на месте.
  function scenePrompt(kind, n) {
    var sk = skill();
    var base = 'Ты — Фреди, тренер навыков мышления. Человек ставит себе навык «' + sk.name + '». Общий триггер: ' + sk.trigger + '. Его собственные ситуации-триггеры: ' + ST.triggers.join('; ') + '. ';
    if (kind === 'drill') {
      return base + 'Сгенерируй ' + n + ' коротких сцен (2–3 предложения каждая, второе лицо, настоящее время, конкретные бытовые детали, разные сферы жизни: дом, работа, деньги, дорога, люди), в КАЖДОЙ из которых триггер присутствует явно. Верни ТОЛЬКО JSON-массив строк без пояснений.';
    }
    return base + 'Сгенерируй ' + n + ' коротких сцен (2–3 предложения, второе лицо, настоящее время, конкретика). Половина сцен — с этим триггером. Другая половина — похожие по обстановке сцены БЕЗ него: ' + sk.nonTrigger + '. Перемешай. Верни ТОЛЬКО JSON-массив объектов вида {"text": "...", "trigger": true|false} без пояснений.';
  }
  function gradePrompt(scene, answer) {
    var sk = skill();
    return 'Ты — Фреди, тренер навыков мышления. Навык «' + sk.name + '». Шаги поведения:\n' + sk.steps.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') +
      '\nСцена: «' + scene + '»\nОтвет человека: «' + answer + '»\n' +
      'Проверь по чек-листу: сделан ли каждый шаг в ответе (да/нет), честно и строго — общие слова не считаются, нужно конкретное содержание. Верни ТОЛЬКО JSON: {"steps":[true|false,...], "note":"одна-две фразы по-русски на «вы»: что было точно, чего не хватило, без похвалы ради похвалы"}';
  }
  function scrDrill() {
    injectCSS();
    var c = container(); if (!c) return;
    var done = ST.drill.filter(function (d) { return d.full; }).length;
    var cur = ST.drill.length ? ST.drill[ST.drill.length - 1] : null;
    var html = '<div class="ap-wrap">' + head('Шаг 4. Отработка', 'Сначала поведение в чистом виде: в каждой сцене триггер есть, вы просто проходите сценарий. Критерий — <b>три сцены, где все шаги на месте</b>. Сделано: ' + done + ' из 3.') + stageBar('drill');
    html += '<div class="ap-card"><b>Ваш сценарий</b><div class="ap-ai" style="margin-top:6px">' + esc(ST.script) + '</div></div>';
    if (cur && !cur.graded) {
      html += '<div class="ap-card"><div class="ap-scene">' + esc(cur.scene) + '</div><textarea class="ap-ta" id="apAnswer" placeholder="Пройдите сценарий по шагам, своими словами, как сказали бы себе в этот момент"></textarea>' +
        '<div class="ap-row"><button class="ap-primary" onclick="AVTOPILOT.gradeDrill()">Проверить</button></div></div>';
    } else {
      if (cur && cur.graded) html += renderGrade(cur);
      html += '<div class="ap-row"><button class="ap-primary" onclick="AVTOPILOT.nextDrill()">' + (cur ? 'Следующая сцена' : 'Первая сцена') + ' →</button>' +
        (done >= 3 ? '<button class="ap-primary" onclick="AVTOPILOT.go(\'pair\')">Дальше: привязка →</button>' : '') + '</div>';
    }
    html += '<div id="apBusy"></div><div class="ap-row"><button class="ap-secondary" onclick="AVTOPILOT.go(\'script\')">← Сценарий</button></div></div>';
    c.innerHTML = html;
  }
  function renderGrade(d) {
    var sk = skill();
    var rows = sk.steps.map(function (s, i) { var ok = d.steps && d.steps[i]; return '<div class="ap-check"><span class="m">' + (ok ? '✅' : '⬜') + '</span><span>' + esc(s) + '</span></div>'; }).join('');
    return '<div class="ap-card"><div class="ap-scene">' + esc(d.scene) + '</div><div class="ap-note" style="margin:6px 0 8px"><i>' + esc(d.answer) + '</i></div>' + rows +
      '<div class="' + (d.full ? 'ap-ok' : 'ap-warn') + '">' + (d.full ? 'Все шаги на месте. ' : 'Не все шаги. ') + esc(d.note || '') + '</div></div>';
  }
  var _scenes = [];
  async function nextDrill() {
    var busy = document.getElementById('apBusy'); if (busy) busy.innerHTML = '<div class="ap-card ap-note">Фреди придумывает сцену…</div>';
    try {
      if (!_scenes.length) {
        var r = await aiGenerate(scenePrompt('drill', 4), { max_tokens: 700, temperature: 0.8 });
        var arr = aiJSON(r);
        if (!Array.isArray(arr) || !arr.length) throw new Error('bad');
        _scenes = arr.map(function (x) { return typeof x === 'string' ? x : (x && x.text) || ''; }).filter(Boolean);
      }
      ST.drill.push({ scene: _scenes.shift(), answer: '', graded: false });
      save(); scrDrill();
    } catch (e) {
      // без сети — сцена из своих триггеров
      var t = ST.triggers[ST.drill.length % ST.triggers.length] || skill().trigger;
      ST.drill.push({ scene: 'Сейчас: ' + t + '. Что вы говорите себе?', answer: '', graded: false });
      save(); scrDrill();
    }
  }
  async function gradeDrill() {
    var cur = ST.drill[ST.drill.length - 1];
    var a = ((document.getElementById('apAnswer') || {}).value || '').trim();
    if (a.length < 15) { toast('Пройдите сценарий словами', 'info'); return; }
    cur.answer = a.slice(0, 900);
    var busy = document.getElementById('apBusy'); if (busy) busy.innerHTML = '<div class="ap-card ap-note">Фреди сверяет с чек-листом…</div>';
    await gradeInto(cur, cur.scene, cur.answer);
    track('avtopilot_drill', { full: cur.full, n: ST.drill.length });
    save(); scrDrill();
  }
  async function gradeInto(obj, scene, answer) {
    var sk = skill();
    try {
      var r = await aiGenerate(gradePrompt(scene, answer), { max_tokens: 300, temperature: 0.2 });
      var j = aiJSON(r);
      if (!j || !Array.isArray(j.steps)) throw new Error('bad');
      obj.steps = sk.steps.map(function (_, i) { return !!j.steps[i]; });
      obj.note = String(j.note || '').slice(0, 400);
    } catch (e) {
      // локальная сверка: по строке на шаг, грубо, но честно названная
      var lines = answer.split(/\n|\d\.\s/).filter(function (x) { return x.trim().length > 6; });
      obj.steps = sk.steps.map(function (_, i) { return lines.length > i; });
      obj.note = 'Сеть не ответила — сверил по числу строк: ' + lines.length + ' из ' + sk.steps.length + ' шагов. Проверьте сами, что в каждой строке есть содержание.';
    }
    obj.full = obj.steps.every(Boolean);
    obj.graded = true;
  }

  // ---------- 5. привязка: триггер есть / нет ----------
  // Суть стимульного контроля — различение: поведение запускается на
  // сигнал и НЕ запускается без него. Сцены вперемешку; сначала ответ
  // «триггер есть / нет», и только при «есть» — сценарий.
  var _pairScenes = [];
  function scrPair() {
    injectCSS();
    var c = container(); if (!c) return;
    var total = ST.pair.filter(function (p) { return p.decided; }).length;
    var right = ST.pair.filter(function (p) { return p.decided && p.right; }).length;
    var cur = ST.pair.length ? ST.pair[ST.pair.length - 1] : null;
    var html = '<div class="ap-wrap">' + head('Шаг 5. Привязка к триггеру', 'Теперь сцены вперемешку: в одних триггер есть, в других — похожая ситуация без него. Сначала решите, есть ли триггер. Если есть — сценарий. Если нет — ничего не делать: навык не должен срабатывать на всё подряд. Критерий — <b>шесть сцен, из них пять решены верно</b>. Решено верно: ' + right + ' из ' + total + '.') + stageBar('pair');
    if (cur && !cur.decided) {
      html += '<div class="ap-card"><div class="ap-scene">' + esc(cur.scene) + '</div><div class="ap-row"><button class="ap-primary" onclick="AVTOPILOT.decide(true)">Триггер есть</button><button class="ap-secondary" style="flex:1" onclick="AVTOPILOT.decide(false)">Триггера нет</button></div></div>';
    } else if (cur && cur.decided && cur.trigger && cur.said && !cur.graded) {
      html += '<div class="ap-card"><div class="ap-scene">' + esc(cur.scene) + '</div><div class="ap-ok">Верно: триггер есть. Теперь сценарий.</div><textarea class="ap-ta" id="apAnswer" placeholder="По шагам, своими словами"></textarea><div class="ap-row"><button class="ap-primary" onclick="AVTOPILOT.gradePair()">Проверить</button></div></div>';
    } else {
      if (cur && cur.decided) {
        if (cur.graded) html += renderGrade(cur);
        else html += '<div class="ap-card"><div class="ap-scene">' + esc(cur.scene) + '</div><div class="' + (cur.right ? 'ap-ok' : 'ap-warn') + '">' + esc(cur.verdict) + '</div></div>';
      }
      html += '<div class="ap-row"><button class="ap-primary" onclick="AVTOPILOT.nextPair()">' + (cur ? 'Следующая сцена' : 'Первая сцена') + ' →</button>' +
        (total >= 6 && right >= 5 ? '<button class="ap-primary" onclick="AVTOPILOT.go(\'ctx\')">Дальше: три контекста →</button>' : '') + '</div>';
    }
    html += '<div id="apBusy"></div><div class="ap-row"><button class="ap-secondary" onclick="AVTOPILOT.go(\'drill\')">← Отработка</button></div></div>';
    c.innerHTML = html;
  }
  async function nextPair() {
    var busy = document.getElementById('apBusy'); if (busy) busy.innerHTML = '<div class="ap-card ap-note">Фреди придумывает сцену…</div>';
    try {
      if (!_pairScenes.length) {
        var r = await aiGenerate(scenePrompt('pair', 6), { max_tokens: 900, temperature: 0.8 });
        var arr = aiJSON(r);
        if (!Array.isArray(arr) || !arr.length) throw new Error('bad');
        _pairScenes = arr.filter(function (x) { return x && x.text; }).map(function (x) { return { text: String(x.text), trigger: !!x.trigger }; });
        if (!_pairScenes.length) throw new Error('bad');
      }
      var s = _pairScenes.shift();
      ST.pair.push({ scene: s.text, trigger: s.trigger, decided: false });
    } catch (e) {
      var k = ST.pair.length;
      var withT = k % 2 === 0;
      var t = ST.triggers[k % ST.triggers.length] || skill().trigger;
      ST.pair.push({ scene: withT ? ('Сейчас: ' + t + '.') : ('Обычный вечер, всё под рукой, ничего особенного не хочется и ничего не сорвалось. Вы просто устали.'), trigger: withT, decided: false });
    }
    save(); scrPair();
  }
  function decide(said) {
    var cur = ST.pair[ST.pair.length - 1]; if (!cur || cur.decided) return;
    cur.decided = true; cur.said = said; cur.right = (said === cur.trigger);
    cur.verdict = cur.right
      ? (cur.trigger ? 'Верно: триггер есть.' : 'Верно: триггера нет, навык молчит. Это и есть различение — половина стимульного контроля.')
      : (cur.trigger ? 'Мимо: триггер здесь был — ' + skill().trigger + '. Навык должен был сработать.' : 'Мимо: это похожая ситуация без триггера (' + skill().nonTrigger + '). Навык, который срабатывает на всё, не навык, а привычка тревожиться.');
    track('avtopilot_pair', { right: cur.right, trigger: cur.trigger });
    save(); scrPair();
  }
  async function gradePair() {
    var cur = ST.pair[ST.pair.length - 1];
    var a = ((document.getElementById('apAnswer') || {}).value || '').trim();
    if (a.length < 15) { toast('Пройдите сценарий словами', 'info'); return; }
    cur.answer = a.slice(0, 900);
    var busy = document.getElementById('apBusy'); if (busy) busy.innerHTML = '<div class="ap-card ap-note">Фреди сверяет…</div>';
    await gradeInto(cur, cur.scene, cur.answer);
    save(); scrPair();
  }

  // ---------- 6. три контекста ----------
  function scrCtx() {
    injectCSS();
    var c = container(); if (!c) return;
    var sk = skill();
    var cards = CONTEXTS.map(function (x) {
      var d = ST.ctx[x.k] || {};
      return '<div class="ap-card"><b>' + esc(x.t) + '</b>' +
        '<input class="ap-input" data-ctxs="' + x.k + '" placeholder="ваша реальная ситуация из этой сферы, где триггер случится на этой неделе" value="' + esc(d.scene || '') + '" style="margin:8px 0">' +
        '<textarea class="ap-ta" data-ctxa="' + x.k + '" placeholder="сценарий в этой ситуации, по шагам" style="min-height:76px">' + esc(d.answer || '') + '</textarea>' +
        (d.graded ? '<div class="' + (d.full ? 'ap-ok' : 'ap-warn') + '">' + (d.full ? 'Все шаги на месте. ' : 'Не все шаги. ') + esc(d.note || '') + '</div>' : '') + '</div>';
    }).join('');
    var okAll = CONTEXTS.every(function (x) { return ST.ctx[x.k] && ST.ctx[x.k].full; });
    c.innerHTML = '<div class="ap-wrap">' + head('Шаг 6. Три контекста', 'Навык, поставленный на одной сцене, живёт на этой сцене. Мост — одна суть в трёх обёртках: <b>' + esc(sk.bridge) + '</b>. Три ваши ситуации из разных сфер, и сценарий в каждой.') + stageBar('ctx') + cards +
      '<div id="apBusy"></div><div class="ap-row"><button class="ap-primary" onclick="AVTOPILOT.gradeCtx()">Проверить все три</button>' + (okAll ? '<button class="ap-primary" onclick="AVTOPILOT.go(\'reinforce\')">Дальше: подкрепление →</button>' : '') + '</div>' +
      '<div class="ap-row"><button class="ap-secondary" onclick="AVTOPILOT.go(\'pair\')">← Привязка</button></div></div>';
  }
  async function gradeCtx() {
    var busy = document.getElementById('apBusy'); if (busy) busy.innerHTML = '<div class="ap-card ap-note">Фреди сверяет три сцены…</div>';
    for (var i = 0; i < CONTEXTS.length; i++) {
      var k = CONTEXTS[i].k;
      var sEl = document.querySelector('[data-ctxs="' + k + '"]'), aEl = document.querySelector('[data-ctxa="' + k + '"]');
      var sc = (sEl && sEl.value || '').trim(), an = (aEl && aEl.value || '').trim();
      if (sc.length < 8 || an.length < 15) { toast('Заполните все три контекста', 'info'); if (busy) busy.innerHTML = ''; return; }
      var d = ST.ctx[k] = ST.ctx[k] || {};
      d.scene = sc.slice(0, 300); d.answer = an.slice(0, 900);
      await gradeInto(d, d.scene, d.answer);
    }
    track('avtopilot_ctx', { ok: CONTEXTS.every(function (x) { return ST.ctx[x.k].full; }) });
    save(); scrCtx();
  }

  // ---------- 7. подкрепление ----------
  var MARKERS = ['галочка в журнале здесь', 'сказать себе вслух «сработало»', 'написать одному человеку «сработало»', 'плюс в заметках телефона'];
  var WHENS = ['каждый раз, 14 дней', 'каждый раз 7 дней, потом через раз'];
  function scrReinforce() {
    injectCSS();
    var c = container(); if (!c) return;
    var m = ST.reinforce.marker, w = ST.reinforce.when;
    c.innerHTML = '<div class="ap-wrap">' + head('Шаг 7. Подкрепление', 'Поведение, которое не замечают, гаснет — у взрослого так же, как у ребёнка. Выберите маркер: что вы сделаете в первые десять секунд после того, как навык сработал. Сначала каждый раз, потом реже.') + stageBar('reinforce') +
      '<div class="ap-card"><b>Маркер</b><div style="margin-top:8px">' + MARKERS.map(function (x) { return '<span class="ap-chip' + (m === x ? ' on' : '') + '" onclick="AVTOPILOT.setR(\'marker\',\'' + esc(x) + '\')">' + esc(x) + '</span>'; }).join('') + '</div></div>' +
      '<div class="ap-card"><b>Расписание</b><div style="margin-top:8px">' + WHENS.map(function (x) { return '<span class="ap-chip' + (w === x ? ' on' : '') + '" onclick="AVTOPILOT.setR(\'when\',\'' + esc(x) + '\')">' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<div class="ap-note" style="margin-top:8px">Порядок важен: сначала каждый раз, потом через раз. Начать с «иногда» — навык не поставится; отменить резко — угаснет.</div></div>' +
      '<div class="ap-card"><b>Когда автопилот</b><div class="ap-note">Десять срабатываний в журнале, из них последние пять — без напоминания, то есть вы заметили, что навык уже сработал, а не «надо бы применить». После этого журнал можно закрыть и брать следующий навык.</div></div>' +
      '<div class="ap-row"><button class="ap-primary" ' + (m && w ? '' : 'disabled') + ' onclick="AVTOPILOT.startPlan()">Открыть карточку и журнал →</button><button class="ap-secondary" onclick="AVTOPILOT.go(\'ctx\')">← Контексты</button></div></div>';
  }
  function setR(k, v) { ST.reinforce[k] = v; save(); scrReinforce(); }
  function startPlan() {
    if (!ST.plan) ST.plan = { start: new Date().toISOString().slice(0, 10), log: [] };
    save(); track('avtopilot_plan'); go('card');
  }

  // ---------- 8. карточка и журнал ----------
  function today() { return new Date().toISOString().slice(0, 10); }
  function dayEntry(d) {
    var e = ST.plan.log.filter(function (x) { return x.date === d; })[0];
    if (!e) { e = { date: d, hits: 0, misses: 0, auto: 0 }; ST.plan.log.push(e); }
    return e;
  }
  function scrCard() {
    injectCSS();
    var c = container(); if (!c) return;
    if (!ST.plan) { go('reinforce'); return; }
    var sk = skill();
    var hits = planHits();
    var autos = ST.plan.log.reduce(function (a, d) { return a + (d.auto || 0); }, 0);
    var last5auto = (function () { var seq = []; ST.plan.log.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (d) { for (var i = 0; i < (d.hits || 0); i++) seq.push(i < (d.auto || 0)); }); return seq.slice(-5).length === 5 && seq.slice(-5).every(Boolean); })();
    var isAuto = hits >= 10 && last5auto;
    // 14 дней от старта
    var days = [];
    var start = new Date(ST.plan.start + 'T00:00:00');
    for (var i = 0; i < 14; i++) {
      var d = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
      var e = ST.plan.log.filter(function (x) { return x.date === d; })[0];
      var cls = e ? (e.hits ? 'hit' : (e.misses ? 'miss' : '')) : '';
      days.push('<div class="ap-day ' + cls + (d === today() ? ' today' : '') + '" title="' + d + '">' + (e && e.hits ? e.hits : (i + 1)) + '</div>');
    }
    var te = ST.plan.log.filter(function (x) { return x.date === today(); })[0] || { hits: 0, misses: 0, auto: 0 };
    c.innerHTML = '<div class="ap-wrap">' + head('Карточка автопилота', '') + stageBar('card') +
      '<div class="ap-card"><div class="ap-note">Когда</div><b>' + esc(sk.trigger) + '</b>' +
      (ST.triggers.length ? '<div class="ap-note" style="margin-top:4px">у меня это: ' + esc(ST.triggers.join('; ')) + '</div>' : '') +
      '<div class="ap-note" style="margin-top:10px">Я делаю</div><div class="ap-ai">' + esc(ST.script) + '</div>' +
      '<div class="ap-note" style="margin-top:10px">Сразу после — ' + esc(ST.reinforce.marker) + ' · ' + esc(ST.reinforce.when) + '</div></div>' +
      '<div class="ap-card"><b>Журнал, 14 дней с ' + esc(ST.plan.start) + '</b><div class="ap-log">' + days.join('') + '</div>' +
      '<div class="ap-note">Сегодня: сработал ' + te.hits + ' раз, из них сам (без напоминания) ' + te.auto + '; триггер был, а навык нет — ' + te.misses + '.</div>' +
      '<div class="ap-row"><button class="ap-primary" onclick="AVTOPILOT.log(\'hit\')">✅ Сработал</button><button class="ap-primary" style="background:#2e7d32" onclick="AVTOPILOT.log(\'auto\')">🛫 Сработал сам</button><button class="ap-secondary" onclick="AVTOPILOT.log(\'miss\')">Триггер был, навык нет</button></div></div>' +
      '<div class="ap-card"><span class="ap-big">' + hits + '</span> <span class="ap-note">срабатываний · сам: ' + autos + '</span>' +
      (isAuto ? '<div class="ap-ok" style="margin-top:8px"><b>Автопилот.</b> Десять срабатываний, последние пять — сами. Навык стоит. Можно закрыть журнал и взять следующий: у вас теперь есть способ, а не совет.</div>' :
        '<div class="ap-note" style="margin-top:6px">Автопилот — десять срабатываний, последние пять без напоминания.</div>') + '</div>' +
      '<div class="ap-row"><button class="ap-secondary" onclick="AVTOPILOT.copy()">📋 Скопировать карточку</button>' + (isAuto ? '<button class="ap-primary" onclick="AVTOPILOT.reset()">Следующий навык →</button>' : '') + '</div>' +
      '<div class="ap-row"><button class="ap-secondary" onclick="AVTOPILOT.home()">← Меню</button></div></div>';
  }
  function log(kind) {
    var e = dayEntry(today());
    if (kind === 'hit') e.hits++;
    else if (kind === 'auto') { e.hits++; e.auto++; }
    else e.misses++;
    if (kind !== 'miss') { toast(ST.reinforce.marker ? 'Сработало ✅ — ' + ST.reinforce.marker : 'Сработало ✅', 'success'); }
    track('avtopilot_log', { kind: kind, total: planHits() });
    if (planHits() >= 10) track('avtopilot_done', { skill: ST.skill });
    save(); scrCard();
  }
  function copy() {
    var sk = skill();
    var lines = ['Автопилот: ' + sk.name, 'Когда: ' + sk.trigger, 'У меня это: ' + ST.triggers.join('; '), 'Я делаю:', ST.script, 'Сразу после: ' + ST.reinforce.marker + ' · ' + ST.reinforce.when];
    try { navigator.clipboard.writeText(lines.join('\n')); toast('Скопировано', 'success'); } catch (e) { toast('Не вышло скопировать', 'info'); }
  }

  window.AVTOPILOT = { home: home, go: go, reset: reset, pick: pick, saveSkill: saveSkill, addTrig: addTrig, saveTrig: saveTrig, checkTrig: checkTrig,
    saveScript: saveScript, nextDrill: nextDrill, gradeDrill: gradeDrill, nextPair: nextPair, decide: decide, gradePair: gradePair,
    gradeCtx: gradeCtx, setR: setR, startPlan: startPlan, log: log, copy: copy };
  window.showAvtopilotGame = home;
  console.log('✅ avtopilot.js loaded (тренажёр постановки мыслительного навыка на триггер)');
})();
