// ============================================
// opora.js — Игра «Опора». Тренажёр к курсу «Самооценка и уверенность».
// Противник — внутренний критик: после ошибки, похвалы, чужого успеха
// он давит приговорами («ты всегда так»), кривой бухгалтерией («успех —
// везение, провал — ты») и чтением мыслей. Задача — не спорить «нет,
// я молодец» (это та же шкала, только с другого конца, Л2), а отвечать
// по правилам курса: фактами вместо приговоров (Л4), честной
// бухгалтерией вклада (Л7), тоном друга (Л6) и следующим шагом (Л8).
// Реплики критика — локальный банк с тактиками-искажениями,
// финальный разбор — Фреди (AI) с локальным фолбэком.
// Экспорт: window.showOporaGame, window.OPORA
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || ''; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 420, temperature: opts.temperature == null ? 0.5 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ============================================================
  // СЦЕНАРИИ. У каждого: who, em, setup (что случилось), steps —
  // реплики критика по нарастающей, каждая помечена искажением
  // из курса (Л4 — искажения критика, Л7 — кривая бухгалтерия,
  // Л8 — ожидание готовности, Л9 — сравнение).
  // ============================================================
  var SCEN = [
    { id: 'oshibka', who: 'Критик после ошибки', em: '📉',
      setup: 'Отчёт с ошибкой в цифрах ушёл клиенту. Ошибку заметил начальник и написал тебе. Вечер, ты дома, и в голове включается голос.',
      steps: [
        { t: 'Сверхобобщение', s: 'Ну конечно. Ты ВСЕГДА так. Вспомни прошлый месяц, вспомни тот проект — это уже не случайность, это система.' },
        { t: 'Приговор личности', s: 'Нормальные люди проверяют перед отправкой. Дело не в отчёте — ты просто небрежный человек. Это не лечится.' },
        { t: 'Чтение мыслей', s: 'Начальник теперь понял, чего ты стоишь. Он вежливо написал, но про себя уже прикидывает, кем тебя заменить.' },
        { t: 'Катастрофизация', s: 'Одна такая ошибка — и репутации конец. Дальше — разговор «нам надо расстаться», и попробуй потом найди место не хуже.' },
        { t: 'Вечный судья', s: 'Можешь оправдываться сколько хочешь. Мы-то оба знаем: это не обстоятельства. Это ты.' }
      ] },
    { id: 'samozvanec', who: 'Критик после похвалы', em: '🏆',
      setup: 'Проект сдан, и на планёрке тебя похвалили при всех. Коллеги кивали. По дороге домой голос начинает пересчитывать.',
      steps: [
        { t: 'Обесценивание успеха', s: 'Расслабься, твоей заслуги тут немного. Сроки были щадящие, команда тащила, клиент попался сговорчивый. Повезло — вот и всё.' },
        { t: 'Кривая бухгалтерия', s: 'Заметь закономерность: когда ты ошибаешься — виноват ты. Когда получается — «повезло». Я просто честнее тебя.' },
        { t: 'Подъём планки', s: 'Ну похвалили и похвалили. Настоящие профи такое делают между делом и не ждут аплодисментов. Сделаешь вдвое больше — тогда поговорим.' },
        { t: 'Страх разоблачения', s: 'Теперь от тебя будут ждать такого каждый раз. А мы знаем, что это был потолок. Скоро все увидят, кто ты на самом деле.' },
        { t: 'Чтение мыслей', s: 'И вообще — похвалили из вежливости. Вспомни, каким тоном это было сказано. Они уже всё поняли.' }
      ] },
    { id: 'sravnenie', who: 'Критик у ленты', em: '📱',
      setup: 'Поздний вечер, ты листаешь ленту. Однокурсник выложил фото: «за год достроили дом, открыли второй филиал». Голос оживает мгновенно.',
      steps: [
        { t: 'Сравнение вверх', s: 'Видел? Вы же начинали одинаково, за одной партой сидели. Он строит дом — а ты чем занимался все эти годы?' },
        { t: 'Витрина как правда', s: 'И не надо про «это только красивая картинка». Дом-то настоящий, филиал настоящий. А у тебя даже картинки нет.' },
        { t: 'Сверхобобщение', s: 'И так во всём, куда ни посмотри. Все вокруг успели: кто в карьере, кто в семье. Один ты топчешься на месте.' },
        { t: 'Обесценивание своего', s: 'Только не начинай перечислять свои достижения. Это всё мелочи и самоутешение. У людей — дома и филиалы.' },
        { t: 'Приговор', s: 'Поезд ушёл. В твои годы догонять уже поздно. Смирись, листай дальше и не позорься со своими планами.' }
      ] },
    { id: 'vyzov', who: 'Критик перед вызовом', em: '🎤',
      setup: 'Тебе предложили выступить с докладом перед всем отделом — тема твоя, ты в ней сильнее всех. До выступления неделя. Голос против.',
      steps: [
        { t: 'Ожидание готовности', s: 'Откажись, пока не поздно. Сначала подтяни уверенность, потренируйся где-нибудь в безопасном месте — а потом уже сцена. Ты пока не готов.' },
        { t: 'Катастрофизация', s: 'Забудешь текст на второй минуте, голос задрожит, кто-нибудь усмехнётся. Такое помнят годами. Оно тебе надо?' },
        { t: 'Чтение мыслей', s: 'Тебе это предложили для галочки, по остаточному принципу. Никто всерьёз не ждёт от тебя ничего толкового.' },
        { t: 'Сравнение', s: 'В прошлый раз выступал Сергей — свободно, с шутками, без бумажки. Вот это уровень. На его фоне ты будешь выглядеть жалко.' },
        { t: 'Ложная забота', s: 'Я же тебя берегу, пойми. Откажешься — и никакого позора. Посидим тихо, как всегда сидели. Разве было плохо?' }
      ] },
    { id: 'molchanie', who: 'Критик у телефона', em: '💬',
      setup: 'Ты написал человеку, который тебе нравится. Два часа назад появилось «прочитано» — и тишина. Телефон на столе, голос за плечом.',
      steps: [
        { t: 'Чтение мыслей', s: 'Прочитано два часа назад. Всё ясно: ты не интересен. Что тут ещё думать — люди отвечают тем, кто им нужен, сразу.' },
        { t: 'Персонализация', s: 'Наверняка сообщение было дурацкое. Перечитай. Ну вот — кто вообще так пишет? Сам всё испортил, как обычно.' },
        { t: 'Сверхобобщение', s: 'И ведь так каждый раз, вспомни. Все твои попытки заканчиваются одинаково. Закономерность на лице.' },
        { t: 'Приговор личности', s: 'А может, дело вообще не в сообщениях? Может, с тобой просто скучно. Люди такое чувствуют с первой минуты.' },
        { t: 'Катастрофизация', s: 'Вот так и останешься в одиночестве. Годы идут, а у тебя всё «прочитано» без ответа. Дальше будет только хуже.' }
      ] }
  ];

  var LEVELS = {
    l1: { name: 'Шёпот', em: '🌱', steps: 3 },
    l2: { name: 'В голос', em: '⚖️', steps: 4 },
    l3: { name: 'Ор', em: '🔥', steps: 5 }
  };
  var LVL_ORDER = ['l1', 'l2', 'l3'];

  var ST = { lvl: 'l1', scen: null, step: 0, dialog: [], busy: false, done: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('opora_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, best: {} }; }
  function saveStats(s) { try { localStorage.setItem('opora_stats', JSON.stringify(s)); } catch (e) {} }
  function loadLvl() { try { var d = localStorage.getItem('opora_lvl'); if (LEVELS[d]) return d; } catch (e) {} return 'l1'; }
  function saveLvl(d) { try { localStorage.setItem('opora_lvl', d); } catch (e) {} ST.lvl = d; }

  function injectCSS() {
    if (document.getElementById('opCSS')) return;
    var s = document.createElement('style'); s.id = 'opCSS';
    s.textContent = [
      '.op-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.op-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.op-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.op-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.op-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.op-ch{font-weight:700;margin-bottom:8px}',
      '.op-lvls{display:flex;gap:8px;margin:0 0 14px}',
      '.op-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.op-chip.on{border-color:#818cf8;background:rgba(129,140,248,.15);color:#fff}',
      '.op-scen{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px 16px;margin:0 0 10px;color:#f2f3f5;cursor:pointer;font-size:1rem}',
      '.op-scen:hover{border-color:rgba(129,140,248,.5)}',
      '.op-scen small{display:block;color:#9ca3af;font-size:.85rem;margin-top:4px;line-height:1.45}',
      '.op-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.op-setup{border:1px solid rgba(129,140,248,.35);background:rgba(129,140,248,.07);border-radius:14px;padding:14px 16px;margin:0 0 14px;font-size:.95rem;line-height:1.55;color:#c7d2fe}',
      '.op-msg{border-radius:14px;padding:12px 16px;margin:0 0 10px;line-height:1.55;font-size:.98rem;max-width:92%}',
      '.op-them{border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.08)}',
      '.op-tag{display:block;font-size:.74rem;color:#fca5a5;margin-top:6px}',
      '.op-me{border:1px solid rgba(52,211,153,.35);background:rgba(52,211,153,.08);margin-left:auto}',
      '.op-ta{width:100%;min-height:70px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);border-radius:12px;padding:12px 14px;color:inherit;font-size:.98rem;font-family:inherit;line-height:1.5;resize:vertical;box-sizing:border-box;margin:6px 0 10px}',
      '.op-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#eef2ff;cursor:pointer;background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 8px 22px rgba(99,102,241,.3);margin:0 0 10px}',
      '.op-primary[disabled]{opacity:.6;cursor:default}',
      '.op-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:13px;font-size:.95rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.op-row{display:flex;gap:10px}.op-row>*{flex:1;margin-bottom:0}',
      '.op-hint{border:1px solid rgba(56,189,248,.35);background:rgba(56,189,248,.08);border-radius:12px;padding:12px 14px;margin:0 0 10px;font-size:.88rem;line-height:1.55;color:#bae6fd}',
      '.op-score{text-align:center;font-size:1.3rem;font-weight:800;margin:0 0 12px;color:#818cf8}',
      '.op-verdict{border:1px solid rgba(129,140,248,.4);background:linear-gradient(135deg,rgba(129,140,248,.1),rgba(139,92,246,.04));border-radius:14px;padding:14px 16px;margin:0 0 12px;line-height:1.6;font-size:.95rem}',
      '.op-course{display:block;text-decoration:none;border:1px solid rgba(94,234,212,.35);background:rgba(94,234,212,.06);border-radius:14px;padding:13px 16px;margin:0 0 12px;color:#99f6e4;font-size:.92rem;line-height:1.5}',
      '[data-theme="light"] .op-wrap{color:#1f2430}',
      '[data-theme="light"] .op-lead{color:#4b5566}',
      '[data-theme="light"] .op-card{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .op-secondary,[data-theme="light"] .op-chip,[data-theme="light"] .op-scen{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .op-ta{background:#fff;border-color:rgba(0,0,0,.15);color:#1f2430}',
      '[data-theme="light"] .op-setup{color:#4338ca}',
      '[data-theme="light"] .op-course{color:#0f766e}',
      '@media(max-width:560px){.op-wrap{padding:14px 12px 96px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); ST.lvl = loadLvl(); ST.scen = null; ST.done = false;
    track('feature_opened', { feature: 'opora' });
    var c = container(); if (!c) return;
    var s = loadStats();
    c.innerHTML =
      '<div class="op-wrap">' +
        '<button class="op-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="op-h1">🧱 Опора</div>' +
        '<div class="op-lead">Голос, который после ошибки говорит «ну конечно, как всегда», — знаком? Здесь он будет давить по-настоящему: приговорами, «все уже поняли», чужими домами и филиалами. Задача — не спорить «нет, я молодец» (это та же шкала, только с другого конца), а отвечать фактами, честной бухгалтерией и следующим шагом. В жизни он застаёт врасплох — здесь есть время подумать.</div>' +
        (s.plays ? '<div class="op-card" style="text-align:center">Сыграно диалогов: <b>' + s.plays + '</b> · лучший балл: <b>' + (Object.keys(s.best || {}).length ? Math.max.apply(null, Object.keys(s.best).map(function (k) { return s.best[k]; })) : '—') + '/10</b></div>' : '') +
        '<div class="op-lvls">' + LVL_ORDER.map(function (d) { return '<div class="op-chip' + (ST.lvl === d ? ' on' : '') + '" onclick="OPORA.setLvl(\'' + d + '\')">' + LEVELS[d].em + ' ' + esc(LEVELS[d].name) + '</div>'; }).join('') + '</div>' +
        '<div class="op-ch" style="margin:4px 0 10px">Когда он приходит:</div>' +
        SCEN.map(function (sc) {
          return '<button class="op-scen" onclick="OPORA.start(\'' + sc.id + '\')">' + sc.em + ' <b>' + esc(sc.who) + '</b><small>' + esc(sc.setup) + '</small></button>';
        }).join('') +
        '<a class="op-course" href="/blog/lektorij/samoocenka/">🎓 Тренажёр идёт в паре с курсом «Самооценка и уверенность» в Лектории — 10 лекций о том, откуда этот голос берётся и на что опираться вместо него.</a>' +
        '<div class="op-card" style="font-size:.88rem;color:#9ca3af">💡 Хороший ответ критику: без «всегда» и «никогда», с фактами и конкретикой, тоном, каким говоришь с другом, — и с одним маленьким шагом в конце. Уверенность приходит после действия, а не до.</div>' +
      '</div>';
  }
  function setLvl(d) { if (!LEVELS[d]) return; saveLvl(d); vibe(20); home(); }

  function start(id) {
    injectCSS();
    var sc = null; SCEN.forEach(function (x) { if (x.id === id) sc = x; });
    if (!sc) return;
    ST.scen = sc; ST.step = 0; ST.dialog = []; ST.done = false;
    track('game_round_start', { feature: 'opora', scen: id, lvl: ST.lvl });
    ST.dialog.push({ who: 'them', text: sc.steps[0].s, tag: sc.steps[0].t });
    render();
  }

  function render() {
    var c = container(); if (!c) return;
    var sc = ST.scen, total = LEVELS[ST.lvl].steps;
    var msgs = ST.dialog.map(function (m) {
      if (m.who === 'them') return '<div class="op-msg op-them">' + sc.em + ' ' + esc(m.text) + '<span class="op-tag">🎭 искажение: ' + esc(m.tag) + '</span></div>';
      return '<div class="op-msg op-me">🙂 ' + esc(m.text) + '</div>';
    }).join('');
    var finished = ST.step >= total - 1 && ST.dialog.length && ST.dialog[ST.dialog.length - 1].who === 'me';
    var inputHtml = '';
    if (!finished) {
      inputHtml =
        '<textarea class="op-ta" id="opTA" placeholder="Твой ответ — фактами, не приговорами…"></textarea>' +
        '<button class="op-primary" id="opSend" onclick="OPORA.send()">Ответить →</button>' +
        '<div class="op-row"><button class="op-secondary" onclick="OPORA.hint()">💡 Фразы-опоры</button><button class="op-secondary" onclick="OPORA.home()">✖ Выйти</button></div>' +
        '<div id="opHint"></div>';
    } else {
      inputHtml = '<button class="op-primary" onclick="OPORA.finish()">Диалог окончен — разбор Фреди →</button>';
    }
    c.innerHTML =
      '<div class="op-wrap">' +
        '<div class="op-top"><span>' + sc.em + ' ' + esc(sc.who) + ' · ход ' + Math.min(ST.step + 1, total) + ' из ' + total + '</span><button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="OPORA.home()">✕ Выйти</button></div>' +
        '<div class="op-setup">🎬 ' + esc(sc.setup) + '</div>' +
        msgs + inputHtml +
      '</div>';
    try { var el = document.getElementById('opTA'); if (el) el.focus(); } catch (e) {}
  }

  function hint() {
    var box = document.getElementById('opHint');
    if (!box) return;
    box.innerHTML = '<div class="op-hint"><b>Опоры ответа (из курса):</b><br>' +
      '· Отдели голос от себя: «слышу тебя» — и дальше по фактам. Критик — не ты.<br>' +
      '· «Всегда» и «никогда» — враньё по построению. «В этот раз я ошибся в таблице» — правда, с ней можно работать.<br>' +
      '· Честная бухгалтерия: перечисли свой вклад так же дотошно, как критик перечисляет твоё «везение».<br>' +
      '· Тон друга: сказал бы ты это другу в такой ситуации? Скажи себе так, как сказал бы ему.<br>' +
      '· Закончи шагом: один маленький, сегодня. Уверенность приходит после действия, не до.<br>' +
      '· Не накачивайся: «я лучший, я всё могу» — та же шкала оценивания. Опора — факты, не лозунги.</div>';
  }

  function send() {
    if (ST.busy || !ST.scen) return;
    var ta = document.getElementById('opTA');
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

  // Локальная оценка-фолбэк, если ИИ недоступен. Меряет то, чему учит
  // курс: не согласился ли с приговором, не ушёл ли в накачку, были ли
  // факты, отделение голоса и шаг в конце.
  function localJudge() {
    var mine = ST.dialog.filter(function (m) { return m.who === 'me'; });
    var cavedRe = /(ты прав|так и есть|и правда,? (всегда|никогда|ничего)|я (ничтожество|неудачник|неудачница|безнадежен|безнадёжен|безнадёжна|пустое место|тупой|тупая)|у меня (никогда|всегда) (ничего|всё)|со мной (что-то|правда что-то) не так|смирюсь|сдаюсь|откажусь, ты прав)/i;
    var pepRe = /(я (самый|самая|лучший|лучшая|гений|суперзвезда|звезда|великолепен|великолепна|идеален|идеальна))|у меня всё всегда получается|я всё могу/i;
    var factRe = /(\d|в (этот|тот) раз|вчера|сегодня|на (этой|прошлой) неделе|в прошлом (месяце|году)|умею|сделал|сделала|получилось|запустил|запустила|закончил|закончила|довёл|довела|проверил|проверила|научился|научилась|веду|делаю)/i;
    var stepRe = /(сделаю|начну|позвоню|напишу|спрошу|проверю|отправлю|подготовлю|попробую|выступлю|пойду|запишусь|перечитаю|исправлю|извинюсь|потренируюсь|составлю)/i;
    var sepRe = /(слышу (тебя|это)|спасибо, (слышал|слышала|услышал|услышала|учту)|это (ты|голос|критик|не факт|не мой голос|мнение)|опять ты|привет, критик|знакомый голос|это не я)/i;
    var caved = 0, pep = 0, facts = 0, steps = 0, seps = 0;
    mine.forEach(function (m) {
      if (cavedRe.test(m.text)) caved++;
      if (pepRe.test(m.text) && !factRe.test(m.text)) pep++;
      if (factRe.test(m.text)) facts++;
      if (stepRe.test(m.text)) steps++;
      if (sepRe.test(m.text)) seps++;
    });
    var score = 5 + Math.min(3, facts) + (steps ? 2 : 0) + (seps ? 1 : 0) - caved * 3 - pep * 2;
    score = Math.max(1, Math.min(10, score));
    var notes = [];
    if (caved) notes.push('В какой-то момент прозвучало согласие с приговором — не с фактом ошибки, а с оценкой себя целиком. Это то самое место: факт признать можно, приговор — нельзя.');
    if (pep) notes.push('Был ответ накачкой («я лучший») — курс честно предупреждает: это та же шкала оценивания, и на ней критик всегда отыграется. Опора — факты, не лозунги.');
    if (facts >= 2) notes.push('Ты отвечал фактами и конкретикой — именно так глобальный приговор рассыпается на разбираемые части.');
    if (steps) notes.push('В ответах был следующий шаг — самое сильное, что можно противопоставить «ты не готов».');
    if (seps) notes.push('Ты отделял голос от себя — критик стал собеседником, а не приговором.');
    if (!notes.length) notes.push('Ответы держались ровно. Проверь одно: были ли в них факты и шаг — без них спор с критиком выигрывается только на время.');
    return { score: score, text: notes.join(' ') };
  }

  async function finish() {
    if (ST.busy) return; ST.busy = true;
    var c = container(); if (!c) return;
    var sc = ST.scen;
    c.innerHTML = '<div class="op-wrap"><div class="op-h1" style="font-size:1.2rem">🧱 Разбор…</div><div class="op-card">Фреди перечитывает диалог…</div></div>';
    var transcript = ST.dialog.map(function (m) { return (m.who === 'them' ? 'Критик (' + m.tag + ')' : 'Я') + ': «' + m.text + '»'; }).join('\n');
    var verdictText = '', score = null;
    try {
      var r = await aiGenerate('Ты — Фреди, тренер по курсу «Самооценка и уверенность». Человек тренировал ответ внутреннему критику. Правила курса: с критиком не спорят глобальными оценками — «нет, я молодец» та же шкала; отвечают фактами и конкретикой вместо «всегда/никогда»; честной бухгалтерией своего вклада; тоном, каким говорят с другом; и заканчивают маленьким шагом — уверенность приходит после действия. Согласие с приговором и накачка — обе ошибки.\nСцена: ' + sc.setup + '\nДиалог:\n' + transcript + '\n\nОцени ответы по правилам курса. Ответь по-русски, на «ты», в формате:\nОЦЕНКА: X/10\nЗатем 3–5 коротких фраз: что было настоящей опорой; где (если было) человек согласился с приговором или ушёл в накачку и на каком искажении; одна конкретная фраза-образец для самого слабого места. Тон тёплый, без нотаций.', { max_tokens: 440 });
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
    var line = score >= 9 ? 'Опора — бетон: факты, тон друга, шаг 🏆' : score >= 7 ? 'Голос отвечен по делу — так и держится опора' : score >= 5 ? 'Опора есть, но критик находил щели' : 'Диалог стоит переиграть — теперь ты видишь его искажения';
    c.innerHTML =
      '<div class="op-wrap">' +
        '<div class="op-h1" style="font-size:1.2rem">🧱 Разбор</div>' +
        '<div class="op-score">' + score + '/10</div>' +
        '<div class="op-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        '<div class="op-verdict">💬 ' + esc(verdictText).replace(/\n/g, '<br>') + '</div>' +
        '<div class="op-card" style="font-size:.9rem;color:#9ca3af">💡 Перенос в жизнь: курс меряет не высоту самооценки, а то, что ты дословно говоришь себе после ошибки. Найди в этом диалоге свой лучший ответ — и забери его в жизнь как есть. Критик приходит без предупреждения, а у тебя теперь есть отрепетированная фраза.</div>' +
        '<a class="op-course" href="/blog/lektorij/samoocenka/">🎓 Откуда этот голос берётся и на что опираться вместо него — курс «Самооценка и уверенность», 10 лекций в Лектории →</a>' +
        '<div class="op-row"><button class="op-primary" onclick="OPORA.start(\'' + sc.id + '\')" style="margin:0">🔁 Переиграть</button><button class="op-secondary" onclick="OPORA.home()">Другая сцена</button></div>' +
      '</div>';
    try { var el = document.getElementById('screenContainer'); if (el) el.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'opora', scen: sc.id, lvl: ST.lvl, score: score });
  }

  window.OPORA = { home: home, setLvl: setLvl, start: start, send: send, hint: hint, finish: finish, getState: function () { return ST; } };
  window.showOporaGame = home;
  console.log('✅ opora.js loaded (игра «Опора»)');
})();
