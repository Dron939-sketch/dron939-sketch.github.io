// ============================================
// skazhinet.js — Игра «Скажи „нет"». Тренажёр границ и ассертивности:
// собеседник давит (вина, срочность, лесть, торг), твоя задача —
// удержать вежливый отказ до конца диалога.
// Реплики давления — из проверенного локального банка (эскалация по тактикам),
// финальный разбор — Фреди (AI) с локальным фолбэком.
// Экспорт: window.showSkazhiNetGame, window.SKAZHINET
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 380, temperature: opts.temperature == null ? 0.5 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ============================================================
  // СЦЕНАРИИ. У каждого: who, em, setup (что происходит и чего ты НЕ хочешь),
  // steps — реплики давления по нарастающей, каждая с тактикой.
  // ============================================================
  var SCEN = [
    { id: 'sales', who: 'Продавец курсов', em: '📞',
      setup: 'Тебе звонят из «академии успеха». Курс тебе не нужен, денег на него нет, и ты хочешь вежливо закончить разговор.',
      steps: [
        { t: 'Лесть', s: 'Здравствуйте! Я вижу по вашему профилю, что вы человек развивающийся, не то что большинство. Именно для таких у нас закрытая группа со скидкой 70%. Записываю вас?' },
        { t: 'Срочность', s: 'Понимаю! Но слушайте, скидка сгорает сегодня в полночь — осталось два места. Завтра будет полная цена, вы же не хотите переплатить восемьдесят тысяч?' },
        { t: 'Давление виной/стыдом', s: 'Знаете, обычно так говорят люди, которые боятся перемен. Вы же не из тех, кто всю жизнь откладывает себя на потом?' },
        { t: 'Торг', s: 'Хорошо-хорошо, слышу вас. А если я дам рассрочку без первого взноса и личного куратора — просто оставьте номер карты для брони, ни к чему не обязывает?' },
        { t: 'Обесценивание отказа', s: 'Ну смотрите, конечно. Просто потом такие возможности не возвращаются, и жалеть будете вы, а не я. Так что, бронируем?' }
      ] },
    { id: 'boss', who: 'Начальник', em: '💼',
      setup: 'Пятница, 18:00. Начальник просит выйти в выходные «спасти проект» — уже третий раз за месяц. В субботу у тебя важные семейные планы, и ты решил отказать.',
      steps: [
        { t: 'Как само собой разумеющееся', s: 'Слушай, тут горит отчёт по «Веге», я на тебя рассчитываю. Выйдешь в субботу на полдня? Ну как обычно.' },
        { t: 'Давление виной', s: 'Хм. Ну, вся команда впряглась, люди без выходных сидят. Неудобно получится перед ребятами, если именно ты не выйдешь, не находишь?' },
        { t: 'Срочность/катастрофа', s: 'Ты пойми, если в понедельник отчёта не будет — клиент уйдёт, и это ударит по всем нам. Ты правда готов взять это на себя?' },
        { t: 'Лесть + исключительность', s: 'Да брось, ты же лучший в этой теме, без тебя никак. Кто, если не ты? Два-три часика всего.' },
        { t: 'Скрытая угроза', s: 'Ладно, услышал. Просто запомни: скоро пересмотр зарплат, и я буду смотреть, кто как вкладывается в команду.' }
      ] },
    { id: 'money', who: 'Родственник', em: '👴',
      setup: 'Дальний родственник просит в долг крупную сумму «на месяц». Он уже дважды не возвращал долги тебе и другим. Ты решил не давать.',
      steps: [
        { t: 'Родственный долг', s: 'Привет! Слушай, выручай — нужно сто тысяч до зарплаты, через месяц верну железно. Мы же семья, кто ещё поможет?' },
        { t: 'Давление виной', s: 'Ты серьёзно? Я бы тебе никогда не отказал. Вот как получается: пока всё хорошо — мы родня, а как помощь нужна — сразу чужие.' },
        { t: 'Катастрофизация', s: 'Ты не понимаешь, у меня край. Если не найду денег до среды — всё рухнет, и это будет на твоей совести тоже.' },
        { t: 'Торг', s: 'Ну хорошо, не сто. Дай хотя бы пятьдесят, ну тридцать! Тебе что, жалко для своих тридцать тысяч?' },
        { t: 'Обида напоказ', s: 'Ясно всё с тобой. Вот и весь разговор про семейные ценности. Бабушка бы в гробу перевернулась. Подумай ещё раз, я подожду.' }
      ] },
    { id: 'friend', who: 'Подруга', em: '👭',
      setup: 'Твой единственный выходной за две недели. Подруга просит посидеть с её детьми весь день — у неё «планы». Это уже четвёртый раз, и всякий раз внезапно. Ты решил отказать.',
      steps: [
        { t: 'Как само собой', s: 'Приветик! Ты же в субботу дома? Закину тебе своих с утра, мне тут надо кое-куда, ты же всё равно отдыхаешь!' },
        { t: 'Давление виной', s: 'Ой, ну ты чего… Я думала, мы друг для друга всегда. Я же тебя выручала тогда, помнишь? Настоящие подруги так не делают.' },
        { t: 'Обесценивание твоих планов', s: 'Ну какие у тебя там планы — полежать и сериальчик? Это же не дела, вот у меня реально дела. Дети тебя обожают!' },
        { t: 'Слёзы/жалость', s: 'Просто у меня уже сил нет никаких, я на грани, ты одна у меня осталась… Неужели тебе трудно один день?' },
        { t: 'Обида напоказ', s: 'Знаешь, я запомню. Когда тебе что-то понадобится — тоже найду «планы». Ладно, извини, что вообще попросила.' }
      ] },
    { id: 'kolega', who: 'Коллега', em: '🧑‍💻',
      setup: 'Коллега в очередной раз просит «по-быстрому доделать» его часть общего отчёта — сроки у него горят из-за его же прокрастинации. Ты решил больше не тянуть чужую работу.',
      steps: [
        { t: 'Минимизация просьбы', s: 'Слушай, там всего пара табличек и выводы дописать, тебе на 20 минут. Добьёшь мой кусок? Я совсем зашиваюсь.' },
        { t: 'Лесть', s: 'Ну у тебя же это в сто раз быстрее и лучше получается! Я потом всё равно переделывать буду, если сам сяду. Ты ж мастер.' },
        { t: 'Взаимность-манипуляция', s: 'Я же тебя тогда подменил на созвоне, помнишь? Мы же выручаем друг друга. Или это только в одну сторону работает?' },
        { t: 'Давление сроком', s: 'Через час дедлайн! Сейчас уже некогда выяснять, кто должен был. Если не сдадим — прилетит обоим, ты этого хочешь?' },
        { t: 'Обида/ярлык', s: 'Вот не ожидал. Ладно, «командный игрок», сам всё сделаю. Только не удивляйся потом, что к тебе никто навстречу не идёт.' }
      ] }
  ];

  var LEVELS = {
    l1: { name: 'Мягко', em: '🌱', steps: 3 },
    l2: { name: 'Настойчиво', em: '⚖️', steps: 4 },
    l3: { name: 'Жёстко', em: '🔥', steps: 5 }
  };
  var LVL_ORDER = ['l1', 'l2', 'l3'];

  var ST = { lvl: 'l1', scen: null, step: 0, dialog: [], busy: false, done: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('skazhinet_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, best: {} }; }
  function saveStats(s) { try { localStorage.setItem('skazhinet_stats', JSON.stringify(s)); } catch (e) {} }
  function loadLvl() { try { var d = localStorage.getItem('skazhinet_lvl'); if (LEVELS[d]) return d; } catch (e) {} return 'l1'; }
  function saveLvl(d) { try { localStorage.setItem('skazhinet_lvl', d); } catch (e) {} ST.lvl = d; }

  function injectCSS() {
    if (document.getElementById('sknCSS')) return;
    var s = document.createElement('style'); s.id = 'sknCSS';
    s.textContent = [
      '.skn-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.skn-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.skn-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.skn-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.skn-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.skn-ch{font-weight:700;margin-bottom:8px}',
      '.skn-lvls{display:flex;gap:8px;margin:0 0 14px}',
      '.skn-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.skn-chip.on{border-color:#f59e0b;background:rgba(245,158,11,.15);color:#fff}',
      '.skn-scen{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px 16px;margin:0 0 10px;color:#f2f3f5;cursor:pointer;font-size:1rem}',
      '.skn-scen:hover{border-color:rgba(245,158,11,.5)}',
      '.skn-scen small{display:block;color:#9ca3af;font-size:.85rem;margin-top:4px;line-height:1.45}',
      '.skn-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.skn-setup{border:1px solid rgba(245,158,11,.35);background:rgba(245,158,11,.07);border-radius:14px;padding:14px 16px;margin:0 0 14px;font-size:.95rem;line-height:1.55;color:#fde68a}',
      '.skn-msg{border-radius:14px;padding:12px 16px;margin:0 0 10px;line-height:1.55;font-size:.98rem;max-width:92%}',
      '.skn-them{border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.08)}',
      '.skn-tag{display:block;font-size:.74rem;color:#fca5a5;margin-top:6px}',
      '.skn-me{border:1px solid rgba(52,211,153,.35);background:rgba(52,211,153,.08);margin-left:auto}',
      '.skn-ta{width:100%;min-height:70px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);border-radius:12px;padding:12px 14px;color:inherit;font-size:.98rem;font-family:inherit;line-height:1.5;resize:vertical;box-sizing:border-box;margin:6px 0 10px}',
      '.skn-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#3b2503;cursor:pointer;background:linear-gradient(135deg,#f59e0b,#f97316);box-shadow:0 8px 22px rgba(245,158,11,.3);margin:0 0 10px}',
      '.skn-primary[disabled]{opacity:.6;cursor:default}',
      '.skn-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:13px;font-size:.95rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.skn-row{display:flex;gap:10px}.skn-row>*{flex:1;margin-bottom:0}',
      '.skn-hint{border:1px solid rgba(56,189,248,.35);background:rgba(56,189,248,.08);border-radius:12px;padding:12px 14px;margin:0 0 10px;font-size:.88rem;line-height:1.55;color:#bae6fd}',
      '.skn-score{text-align:center;font-size:1.3rem;font-weight:800;margin:0 0 12px;color:#f59e0b}',
      '.skn-verdict{border:1px solid rgba(245,158,11,.4);background:linear-gradient(135deg,rgba(245,158,11,.1),rgba(249,115,22,.04));border-radius:14px;padding:14px 16px;margin:0 0 12px;line-height:1.6;font-size:.95rem}',
      '[data-theme="light"] .skn-wrap{color:#1f2430}',
      '[data-theme="light"] .skn-lead{color:#4b5566}',
      '[data-theme="light"] .skn-card{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .skn-secondary,[data-theme="light"] .skn-chip,[data-theme="light"] .skn-scen{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .skn-ta{background:#fff;border-color:rgba(0,0,0,.15);color:#1f2430}',
      '[data-theme="light"] .skn-setup{color:#92400e}',
      '@media(max-width:560px){.skn-wrap{padding:14px 12px 96px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); ST.lvl = loadLvl(); ST.scen = null; ST.done = false;
    track('feature_opened', { feature: 'skazhinet' });
    var c = container(); if (!c) return;
    var s = loadStats();
    c.innerHTML =
      '<div class="skn-wrap">' +
        '<button class="skn-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="skn-h1">🛑 Скажи «нет»</div>' +
        '<div class="skn-lead">Тренажёр границ. Собеседник будет давить по-настоящему: виной, срочностью, лестью, торгом. Твоя задача — удержать вежливый отказ до конца, не оправдываясь и не грубя. В жизни на это нет времени подумать — здесь есть.</div>' +
        (s.plays ? '<div class="skn-card" style="text-align:center">Сыграно диалогов: <b>' + s.plays + '</b> · лучший балл: <b>' + (Object.keys(s.best || {}).length ? Math.max.apply(null, Object.keys(s.best).map(function (k) { return s.best[k]; })) : '—') + '/10</b></div>' : '') +
        '<div class="skn-lvls">' + LVL_ORDER.map(function (d) { return '<div class="skn-chip' + (ST.lvl === d ? ' on' : '') + '" onclick="SKAZHINET.setLvl(\'' + d + '\')">' + LEVELS[d].em + ' ' + esc(LEVELS[d].name) + '</div>'; }).join('') + '</div>' +
        '<div class="skn-ch" style="margin:4px 0 10px">Кто будет давить:</div>' +
        SCEN.map(function (sc) {
          return '<button class="skn-scen" onclick="SKAZHINET.start(\'' + sc.id + '\')">' + sc.em + ' <b>' + esc(sc.who) + '</b><small>' + esc(sc.setup) + '</small></button>';
        }).join('') +
        '<div class="skn-card" style="font-size:.88rem;color:#9ca3af">💡 Хороший отказ: коротко, тепло по тону, твёрдо по сути, без вороха оправданий. «Заезженная пластинка» — повторять суть отказа спокойно, не вовлекаясь в торг.</div>' +
      '</div>';
  }
  function setLvl(d) { if (!LEVELS[d]) return; saveLvl(d); vibe(20); home(); }

  function start(id) {
    injectCSS();
    var sc = null; SCEN.forEach(function (x) { if (x.id === id) sc = x; });
    if (!sc) return;
    ST.scen = sc; ST.step = 0; ST.dialog = []; ST.done = false;
    track('game_round_start', { feature: 'skazhinet', scen: id, lvl: ST.lvl });
    // первая реплика давления
    ST.dialog.push({ who: 'them', text: sc.steps[0].s, tag: sc.steps[0].t });
    render();
  }

  function render() {
    var c = container(); if (!c) return;
    var sc = ST.scen, total = LEVELS[ST.lvl].steps;
    var msgs = ST.dialog.map(function (m) {
      if (m.who === 'them') return '<div class="skn-msg skn-them">' + sc.em + ' ' + esc(m.text) + '<span class="skn-tag">🎭 приём: ' + esc(m.tag) + '</span></div>';
      return '<div class="skn-msg skn-me">🙂 ' + esc(m.text) + '</div>';
    }).join('');
    var finished = ST.step >= total - 1 && ST.dialog.length && ST.dialog[ST.dialog.length - 1].who === 'me';
    var inputHtml = '';
    if (!finished) {
      inputHtml =
        '<textarea class="skn-ta" id="sknTA" placeholder="Твой ответ — вежливо и твёрдо…"></textarea>' +
        '<button class="skn-primary" id="sknSend" onclick="SKAZHINET.send()">Ответить →</button>' +
        '<div class="skn-row"><button class="skn-secondary" onclick="SKAZHINET.hint()">💡 Фразы-опоры</button><button class="skn-secondary" onclick="SKAZHINET.home()">✖ Выйти</button></div>' +
        '<div id="sknHint"></div>';
    } else {
      inputHtml = '<button class="skn-primary" onclick="SKAZHINET.finish()">Диалог окончен — разбор Фреди →</button>';
    }
    c.innerHTML =
      '<div class="skn-wrap">' +
        '<div class="skn-top"><span>' + sc.em + ' ' + esc(sc.who) + ' · ход ' + Math.min(ST.step + 1, total) + ' из ' + total + '</span><button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="SKAZHINET.home()">✕ Выйти</button></div>' +
        '<div class="skn-setup">🎬 ' + esc(sc.setup) + '</div>' +
        msgs + inputHtml +
      '</div>';
    try { var el = document.getElementById('sknTA'); if (el) el.focus(); } catch (e) {}
  }

  function hint() {
    var box = document.getElementById('sknHint');
    if (!box) return;
    box.innerHTML = '<div class="skn-hint"><b>Опоры отказа:</b><br>' +
      '· «Нет, мне это не подходит» — и точка, без пятиминутных оправданий.<br>' +
      '· Заезженная пластинка: спокойно повторяй суть — «понимаю, и всё же нет».<br>' +
      '· Признай чувство, держи границу: «вижу, что тебе тяжело — и помочь этим не смогу».<br>' +
      '· Не защищай свои причины: причины — твои, отчёт по ним не обязателен.<br>' +
      '· Раздели отношение и отказ: «ты мне дорог — и это не меняет моего "нет"».</div>';
  }

  function send() {
    if (ST.busy || !ST.scen) return;
    var ta = document.getElementById('sknTA');
    var text = ta ? String(ta.value || '').trim() : '';
    if (!text) { if (typeof window.showToast === 'function') window.showToast('Напиши свой ответ', 'info'); return; }
    ST.dialog.push({ who: 'me', text: text });
    var total = LEVELS[ST.lvl].steps;
    if (ST.step < total - 1) {
      ST.step++;
      var st = ST.scen.steps[Math.min(ST.step, ST.scen.steps.length - 1)];
      ST.dialog.push({ who: 'them', text: st.s, tag: st.t });
    }
    vibe(15);
    render();
  }

  // Локальная оценка-фолбэк, если ИИ недоступен
  function localJudge() {
    var mine = ST.dialog.filter(function (m) { return m.who === 'me'; });
    var yes = /(ладно|хорошо,? (давай|вый|посиж|дам)|уговорил|так и быть|ну ок|согласен|согласна|только (сегодня|раз))/i;
    var no = /(нет|не (буду|выйду|дам|смогу|стану|подходит|готов|готова)|откажусь|отказываюсь|не вариант)/i;
    var caved = mine.some(function (m) { return yes.test(m.text) && !no.test(m.text); });
    var held = mine.filter(function (m) { return no.test(m.text); }).length;
    var longExcuses = mine.filter(function (m) { return m.text.length > 240; }).length;
    var rude = mine.some(function (m) { return /(отвали|пошё|пошл|идиот|дурак|достал)/i.test(m.text); });
    var score = caved ? 3 : Math.min(10, 5 + held * 2 - longExcuses - (rude ? 2 : 0));
    score = Math.max(1, Math.min(10, score));
    var notes = [];
    if (caved) notes.push('В какой-то момент граница прогнулась — прозвучало согласие. Это самое ценное место для пересмотра: на какой именно тактике?');
    if (!caved && held >= mine.length - 1) notes.push('Отказ прозвучал в каждом ходе — граница держалась стабильно.');
    if (longExcuses) notes.push('Были длинные объяснения: чем длиннее оправдание, тем больше зацепок для торга. Короче — крепче.');
    if (rude) notes.push('Местами тон съехал в резкость: цель — твёрдо, но без войны.');
    if (!notes.length) notes.push('Ровный, вежливый и твёрдый отказ — так и выглядит здоровая граница.');
    return { score: score, text: notes.join(' ') };
  }

  async function finish() {
    if (ST.busy) return; ST.busy = true;
    var c = container(); if (!c) return;
    var sc = ST.scen;
    c.innerHTML = '<div class="skn-wrap"><div class="skn-h1" style="font-size:1.2rem">🛑 Разбор…</div><div class="skn-card">Фреди перечитывает диалог…</div></div>';
    var transcript = ST.dialog.map(function (m) { return (m.who === 'them' ? sc.who + ' (' + m.tag + ')' : 'Я') + ': «' + m.text + '»'; }).join('\n');
    var verdictText = '', score = null;
    try {
      var r = await aiGenerate('Ты — Фреди, тренер ассертивности. Человек тренировал отказ. Сценарий: ' + sc.setup + '\nДиалог:\n' + transcript + '\n\nОцени, как он держал границу. Ответь по-русски, на «ты», в формате:\nОЦЕНКА: X/10\nЗатем 3–5 коротких фраз: что было сильным; где (если было) граница прогнулась и на какой тактике; одна конкретная фраза, как можно было ответить ещё точнее. Тон тёплый, без нотаций.', { max_tokens: 420 });
      var t = (r && r.success && r.content) ? String(r.content).trim() : '';
      var m = t.match(/ОЦЕНКА:\s*(\d{1,2})/i);
      if (m) { score = Math.max(0, Math.min(10, parseInt(m[1], 10))); verdictText = t.replace(/ОЦЕНКА:\s*\d{1,2}\s*\/\s*10\.?/i, '').trim(); }
      else if (t) { verdictText = t; }
    } catch (e) {}
    if (score == null) { var lj = localJudge(); score = lj.score; if (!verdictText) verdictText = lj.text; }
    ST.busy = false; ST.done = true;
    var s = loadStats(); s.plays = (s.plays || 0) + 1; if (!s.best) s.best = {}; var bk = sc.id + '_' + ST.lvl;
    if (!s.best[bk] || score > s.best[bk]) s.best[bk] = score; saveStats(s);
    if (score >= 8) vibe([40, 40, 40]);
    var line = score >= 9 ? 'Граница — бетон, тон — бархат 🏆' : score >= 7 ? 'Уверенный отказ — так держать' : score >= 5 ? 'Граница держалась, но с зацепками' : 'Диалог стоит переиграть — теперь ты видишь тактики';
    c.innerHTML =
      '<div class="skn-wrap">' +
        '<div class="skn-h1" style="font-size:1.2rem">🛑 Разбор</div>' +
        '<div class="skn-score">' + score + '/10</div>' +
        '<div class="skn-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        '<div class="skn-verdict">💬 ' + esc(verdictText).replace(/\n/g, '<br>') + '</div>' +
        '<div class="skn-card" style="font-size:.9rem;color:#9ca3af">💡 Перенос в жизнь: заметь, какая тактика зацепила тебя сильнее всего (вина? срочность? жалость?) — в реальности давить будут именно на неё. Теперь у тебя есть отрепетированный ответ.</div>' +
        '<div class="skn-row"><button class="skn-primary" onclick="SKAZHINET.start(\'' + sc.id + '\')" style="margin:0">🔁 Переиграть</button><button class="skn-secondary" onclick="SKAZHINET.home()">Другой сценарий</button></div>' +
      '</div>';
    try { var el = document.getElementById('screenContainer'); if (el) el.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'skazhinet', scen: sc.id, lvl: ST.lvl, score: score });
  }

  window.SKAZHINET = { home: home, setLvl: setLvl, start: start, send: send, hint: hint, finish: finish, getState: function () { return ST; } };
  window.showSkazhiNetGame = home;
  console.log('✅ skazhinet.js loaded (игра «Скажи нет»)');
})();
