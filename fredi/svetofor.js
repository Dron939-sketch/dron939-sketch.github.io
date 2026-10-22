// ============================================
// svetofor.js — Упражнение «Светофор»: красный по умолчанию → переключатель у себя.
//
// К статье «Красный по умолчанию» (vk-drafts/stop-po-umolchaniyu-vk-statya.md).
// Есть люди, у которых внутри по умолчанию горит красный: сделал шаг — и
// ждёшь чужого «да». Держат его два корня: «ошибка от шага — вина, ошибка
// от стояния — погода» и «хорошо ли я сделал, видно по чужому лицу».
//
// Две части.
//
//   1. «Неделя Кати» — десять ситуаций. Решения принимает игрок, но
//      ситуации про Катю, а не про него: о себе человек спорит, про другого
//      — узнаёт себя без защиты (правило владельца 22.10.2026). Правильный
//      ход зависит от одного: можно ли шаг отменить. Отменяемое — без
//      спроса; неотменяемое — показать и назначить срок; «спросить
//      „нормально?“ и ждать» — почти всегда простой, у которого есть цена.
//
//   2. «Мой светофор» — своё дело на паузе: кто держит «да», можно ли
//      отменить, счёт за стояние, своя мерка, чего боюсь и насколько
//      вероятно. Через день упражнение спрашивает, что было на самом деле,
//      и копит разницу между страхом и реальностью. Красный гаснет от таких
//      сверок, а не от уговоров.
//
// Журнал живёт в localStorage этого устройства — на сервер ничего не уходит.
//
// Экспорт: window.showSvetoforGame, window.SVETOFOR
// ============================================
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function top() { var c = container(); try { if (c) c.scrollTop = 0; window.scrollTo(0, 0); } catch (e) {} }

  var JOURNAL_KEY = 'svetofor_journal';
  var BEST_KEY = 'svetofor_best';
  var COURSE = '/blog/lektorij/sklad-uma/';

  // ---------------------------------------------------------------- сцены
  // kind: 'rev' — шаг можно отменить (правильно: без спроса);
  //       'irr' — нельзя отменить (правильно: показать и назначить срок);
  //       'wait' — шаг ждёт чужого ответа (правильно: «если до … нет возражений — делаю»).
  // Ходы во всех сценах одни и те же по смыслу: go — сделать без спроса,
  // show — показать и назначить срок, ask — спросить «нормально?» и ждать.
  var SCENES = [
    { id: 'post', kind: 'rev', day: 'Понедельник, 10:20',
      line: 'Катя написала пост для страницы фирмы. Текст готов, картинка подобрана. Рука тянется отправить его подруге: «Нормально? Не слишком?»',
      opts: { go: 'Опубликовать. Если что — пост можно поправить или удалить',
              show: 'Отправить руководителю и попросить посмотреть до конца недели',
              ask: 'Скинуть подруге и ждать «да, норм»' },
      cost: 'Пока пост ждёт «да», он не работает: его не видят, по нему не приходят.',
      why: 'Пост можно поправить и удалить за минуту. Это обратимый шаг — здесь зелёный по умолчанию.' },
    { id: 'price', kind: 'irr', day: 'Понедельник, 15:40',
      line: 'Крупный клиент просит скидку 20 %. Катя хочет согласиться, чтобы не потерять сделку. Цена в письме клиенту — это обещание фирмы.',
      opts: { go: 'Написать клиенту: «Согласны на 20 %»',
              show: 'Написать руководителю: «Предлагаю дать 20 %, ответ клиенту завтра в 12:00 — успеете посмотреть?»',
              ask: 'Ничего не писать клиенту, пока руководитель сам не спросит' },
      cost: 'Если молчать, клиент решит, что ему отказали, и уйдёт к другим.',
      why: 'Названную клиенту цену не заберёшь. Это необратимый шаг — показать и назначить срок, а не ждать.' },
    { id: 'test', kind: 'rev', day: 'Вторник, 9:15',
      line: 'Та самая идея, как удешевить рекламу. Можно запустить пробу на 3 000 ₽ и через два дня посмотреть цифры.',
      opts: { go: 'Запустить пробу на 3 000 ₽ и прийти с цифрами',
              show: 'Расписать план на две страницы и отправить на согласование',
              ask: 'Спросить у коллег, стоит ли вообще пробовать' },
      cost: 'Три недели ожидания — и идею запускает Денис.',
      why: 'Проба на маленькие деньги отменяется в один клик. Обратимо — без спроса, а на планёрку прийти уже с результатом.' },
    { id: 'contract', kind: 'irr', day: 'Вторник, 17:00',
      line: 'Подрядчик прислал договор на год с неустойкой за досрочный выход. Условия вроде нормальные, хочется подписать и закрыть вопрос.',
      opts: { go: 'Подписать — условия же нормальные',
              show: 'Отправить юристу и руководителю: «Подписываю в четверг, если не будет замечаний»',
              ask: 'Отложить, пока кто-нибудь не скажет, что делать' },
      cost: 'Отложить без срока — подрядчик уйдёт к тем, кто решает быстрее.',
      why: 'Подпись с неустойкой не отменишь. Красный здесь настоящий — но красный со сроком, а не бессрочное ожидание.' },
    { id: 'friend', kind: 'rev', day: 'Среда, 21:30',
      line: 'Полгода назад Катя поссорилась с подругой. Ждёт, что та напишет первой. Сообщение «Скучаю. Может, кофе?» лежит в черновиках.',
      opts: { go: 'Отправить',
              show: 'Спросить сестру, стоит ли писать',
              ask: 'Подождать ещё — вдруг она напишет сама' },
      cost: 'Каждый месяц ожидания делает первое сообщение тяжелее. Так дружбы и кончаются — молча.',
      why: 'Худшее, что может случиться, — не ответят. Это неприятно, но ничего не ломает. Обратимо — без спроса.' },
    { id: 'idea', kind: 'wait', day: 'Четверг, 11:00',
      line: 'Катя придумала, как перестроить отчёт для руководителя, чтобы он читался за минуту. Отправила вариант неделю назад. Ответа нет.',
      opts: { go: 'Сделать по-новому молча и посмотреть, заметят ли',
              show: 'Написать: «Если до понедельника нет возражений — со следующего отчёта делаю так»',
              ask: 'Напомнить: «Вы посмотрели? Нормально?» — и ждать дальше' },
      cost: 'Неделя прошла, впереди ещё одна — и привычка ждать становится крепче.',
      why: 'Чужое молчание — не «нет». Срок превращает молчание в разрешение, которое Катя выдала себе сама. Руководителю так тоже проще.' },
    { id: 'chat', kind: 'irr', day: 'Четверг, 18:45',
      line: 'В общем рабочем чате коллега резко раскритиковал Катину презентацию. Ответ уже набран — тоже резкий.',
      opts: { go: 'Отправить ответ в общий чат',
              show: 'Не отправлять сейчас. Утром написать коллеге лично и предложить обсудить',
              ask: 'Скинуть ответ подруге: «Не слишком?»' },
      cost: 'Промолчать совсем — значит согласиться, что презентация плохая.',
      why: 'Слова в общем чате не заберёшь. Это тот случай, когда красный нужен — но не вечный: решение принять до утра.' },
    { id: 'raise', kind: 'rev', day: 'Пятница, 10:00',
      line: 'Катя два года не просила повышения. Сегодня у руководителя свободное окно. Можно просто зайти и сказать: «Хочу обсудить мой рост».',
      opts: { go: 'Зайти и предложить обсудить',
              show: 'Сначала спросить у коллег, как он к такому относится',
              ask: 'Дождаться, пока руководитель заговорит сам' },
      cost: 'Сам он не заговорит: у него и так всё работает.',
      why: 'Начать разговор — обратимо: можно договориться вернуться к нему позже. Без спроса.' },
    { id: 'prepay', kind: 'irr', day: 'Пятница, 14:20',
      line: 'Новый поставщик просит предоплату 150 000 ₽, чтобы начать работу в понедельник. Катя его почти не знает.',
      opts: { go: 'Перевести — иначе не успеют к понедельнику',
              show: 'Проверить поставщика и показать бухгалтерии: «Оплачиваю в понедельник утром, если всё чисто»',
              ask: 'Ждать, пока кто-то решит за неё' },
      cost: 'Бессрочное ожидание сорвёт сроки — но и спешка тут может стоить 150 000 ₽.',
      why: 'Ушедшие деньги не вернёшь. Красный нужен — со сроком и проверкой, а не «пусть кто-нибудь решит».' },
    { id: 'course', kind: 'rev', day: 'Суббота, 12:00',
      line: 'Катя давно хочет на курс по аналитике. Запись открыта, деньги можно вернуть в течение 14 дней. Хочется сначала спросить мужа.',
      opts: { go: 'Записаться — если что, вернёт деньги',
              show: 'Спросить мужа, а потом решить',
              ask: 'Подождать следующего набора' },
      cost: 'Прошлый раз она тоже «спросила мужа» — он был не против, а набор закрылся.',
      why: 'Возврат за 14 дней — это обратимо. Решение — её. Мужу можно рассказать, а не спрашивать разрешения.' }
  ];

  // правильный ход по типу сцены и баллы за остальные
  var GRADE = {
    rev: { go: 2, show: 1, ask: 0 },
    irr: { show: 2, ask: 1, go: 0 },
    wait: { show: 2, go: 1, ask: 0 }
  };
  var KIND_NAME = { rev: 'Можно отменить', irr: 'Нельзя отменить', wait: 'Шаг ждёт чужого ответа' };

  // ---------------------------------------------------------------- стиль
  function styles() {
    if (document.getElementById('sv-styles')) return;
    var s = document.createElement('style');
    s.id = 'sv-styles';
    s.textContent = [
      '.sv-wrap{max-width:660px;margin:0 auto;padding:14px 14px 44px;color:var(--text-primary,#e8eaee)}',
      '.sv-h1{font-size:1.55rem;font-weight:700;margin:0 0 10px;color:var(--text-primary,#fff)}',
      '.sv-lead{color:var(--text-secondary,#a8b0bd);font-size:.95rem;line-height:1.62;margin:0 0 16px}',
      '.sv-card{background:var(--bg-secondary,rgba(127,127,127,.07));border:1px solid var(--border-color,rgba(127,127,127,.20));border-radius:16px;padding:16px 18px;margin:0 0 12px}',
      '.sv-in{animation:svIn .3s cubic-bezier(.2,.7,.3,1) both}',
      '@keyframes svIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
      '@media (prefers-reduced-motion:reduce){.sv-in{animation:none}}',
      '.sv-tag{font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;color:var(--text-secondary,#8b94a3);margin:2px 0 8px}',
      '.sv-who{font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:#f59e0b;margin:0 0 6px}',
      '.sv-line{font-size:1.02rem;line-height:1.6;margin:0}',
      '.sv-opt{display:block;width:100%;text-align:left;background:var(--bg-secondary,rgba(127,127,127,.06));border:1px solid var(--border-color,rgba(127,127,127,.22));color:var(--text-primary,#e8eaee);border-radius:13px;padding:13px 15px;margin:8px 0;font:inherit;font-size:.97rem;line-height:1.45;cursor:pointer}',
      '.sv-opt:hover{border-color:#3b82ff;background:rgba(59,130,255,.10)}',
      '.sv-big{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}',
      '.sv-mode{flex:1;min-width:220px;text-align:left;border-radius:16px;padding:16px;border:1px solid var(--border-color,rgba(127,127,127,.22));background:var(--bg-secondary,rgba(127,127,127,.06));color:var(--text-primary,#e8eaee);font:inherit;cursor:pointer}',
      '.sv-mode b{display:block;font-size:1.05rem;margin:6px 0 4px}',
      '.sv-mode small{color:var(--text-secondary,#9aa3b2);line-height:1.45;display:block}',
      '.sv-verdict{border-radius:13px;padding:14px 16px;margin:0 0 12px;font-size:.96rem;line-height:1.55}',
      '.sv-ok2{background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.45)}',
      '.sv-ok1{background:rgba(217,119,6,.14);border:1px solid rgba(217,119,6,.45)}',
      '.sv-ok0{background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.45)}',
      '.sv-kind{display:inline-block;font-size:.76rem;font-weight:700;border-radius:8px;padding:3px 8px;margin:0 0 8px}',
      '.sv-kind.rev{background:rgba(16,185,129,.18);color:#0f9d76}.sv-kind.irr{background:rgba(239,68,68,.18);color:#e05252}.sv-kind.wait{background:rgba(59,130,255,.18);color:#3b82ff}',
      '.sv-mech{font-size:.88rem;color:var(--text-secondary,#9aa3b2);line-height:1.55;margin-top:6px}',
      '.sv-btn{display:inline-block;background:#3b82ff;color:#fff;border:none;border-radius:12px;padding:13px 22px;font:inherit;font-weight:600;cursor:pointer;margin-top:10px;text-decoration:none}',
      '.sv-btn.sec{background:transparent;border:1px solid var(--border-color,rgba(127,127,127,.35));color:var(--text-secondary,#c8ccd4);margin-left:8px}',
      '.sv-ghost{background:none;border:none;color:var(--text-secondary,#9aa3b2);font:inherit;font-size:.9rem;cursor:pointer;padding:4px 0;margin:0 0 8px}',
      '.sv-score{font-size:2rem;font-weight:700;margin:0}',
      '.sv-row{display:flex;justify-content:space-between;font-size:.92rem;margin:9px 0 3px}',
      '.sv-bar{height:9px;border-radius:6px;background:rgba(127,127,127,.2);overflow:hidden}',
      '.sv-bar>i{display:block;height:100%;width:0;transition:width .8s}',
      '.sv-f{display:block;margin:12px 0 4px;font-size:.88rem;color:var(--text-secondary,#9aa3b2)}',
      '.sv-in-t{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:11px;border:1px solid var(--border-color,rgba(127,127,127,.3));background:var(--bg-primary,rgba(0,0,0,.15));color:var(--text-primary,#e8eaee);font:inherit;font-size:.96rem}',
      '.sv-chips{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0}',
      '.sv-chip{border:1px solid var(--border-color,rgba(127,127,127,.3));background:transparent;color:var(--text-primary,#e8eaee);border-radius:999px;padding:8px 13px;font:inherit;font-size:.9rem;cursor:pointer}',
      '.sv-chip.on{background:#3b82ff;border-color:#3b82ff;color:#fff}',
      '.sv-range{width:100%;accent-color:#f59e0b}',
      '.sv-big-n{font-size:1.4rem;font-weight:700;text-align:center;margin:2px 0}',
      '.sv-j{border-top:1px solid var(--border-color,rgba(127,127,127,.18));padding:10px 0;font-size:.92rem;line-height:1.5}',
      '.sv-j:first-child{border-top:none}',
      '.sv-note{font-size:.84rem;color:var(--text-secondary,#9aa3b2);line-height:1.55}',
      '.sv-link{color:#3b82ff;text-decoration:none;font-weight:600}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function lightSvg(on) {
    // светофор: on = 'red' | 'green' | 'both'
    var r = on === 'red' || on === 'both', g = on === 'green' || on === 'both';
    return '<svg viewBox="0 0 640 150" role="img" aria-hidden="true" style="width:100%;height:auto;display:block;border-radius:14px;margin:0 0 14px">' +
      '<rect width="640" height="150" rx="14" fill="#0E1219"/>' +
      '<rect x="270" y="14" width="100" height="122" rx="20" fill="#171D28" stroke="#2C3546"/>' +
      '<circle cx="320" cy="48" r="22" fill="' + (r ? '#EF4444' : '#3a1d1d') + '"' + (r ? ' style="filter:drop-shadow(0 0 12px #EF4444)"' : '') + '/>' +
      '<circle cx="320" cy="102" r="22" fill="' + (g ? '#10B981' : '#163126') + '"' + (g ? ' style="filter:drop-shadow(0 0 12px #10B981)"' : '') + '/>' +
      '<text x="244" y="46" text-anchor="end" font-size="22" font-weight="700" fill="#EF4444">нельзя отменить</text>' +
      '<text x="244" y="72" text-anchor="end" font-size="19" fill="#9AA3B2">показать, назначить срок</text>' +
      '<text x="396" y="100" font-size="22" font-weight="700" fill="#10B981">можно отменить</text>' +
      '<text x="396" y="126" font-size="19" fill="#9AA3B2">делать без спроса</text>' +
      '</svg>';
  }

  // ---------------------------------------------------------------- журнал
  function journal() { try { return JSON.parse(lsGet(JOURNAL_KEY) || '[]') || []; } catch (e) { return []; } }
  function saveJournal(j) { lsSet(JOURNAL_KEY, JSON.stringify(j.slice(-60))); }
  function pending(j) {
    var now = Date.now();
    return j.filter(function (x) { return x.actual == null && now - x.at > 8 * 3600 * 1000; });
  }

  // ---------------------------------------------------------------- экраны
  var ST = null;

  function home() {
    styles();
    var c = container(); if (!c) return;
    track('game_open', { feature: 'svetofor', game: 'svetofor' });
    var j = journal(), p = pending(j), best = lsGet(BEST_KEY);
    var done = j.filter(function (x) { return x.actual != null; });
    c.innerHTML =
      '<div class="sv-wrap sv-in">' +
        '<button class="sv-ghost" onclick="(window.showKonturScreen||window.renderDashboard||function(){})()">← К играм</button>' +
        '<div class="sv-h1">🚦 Светофор</div>' +
        '<p class="sv-lead">У одних людей внутри по умолчанию горит зелёный: они идут, пока их не остановят. ' +
          'У других — красный: сделал шаг — и ждёшь чужого «да». Часто ждёшь человека, который даже не знает, что стоит у переключателя.<br><br>' +
          'Здесь две части. Сначала — неделя Кати: десять ситуаций, где надо понять, какой шаг можно делать без спроса, а какой — нет. ' +
          'Потом — ваше собственное дело на паузе.</p>' +
        lightSvg('both') +
        (p.length ? '<div class="sv-card" style="border-left:4px solid #f59e0b"><b>Как прошло?</b><div class="sv-mech">' +
          'Вы обещали себе сделать шаг: «' + esc(p[0].task) + '». Посмотрим, что случилось на самом деле.</div>' +
          '<button class="sv-btn" onclick="SVETOFOR.check(' + p[0].at + ')">Отметить, как было</button></div>' : '') +
        '<div class="sv-big">' +
          '<button class="sv-mode" onclick="SVETOFOR.start()"><span style="font-size:1.4rem">👩‍💼</span><b>Неделя Кати</b><small>Десять ситуаций: пост, цена клиенту, проба рекламы, договор, подруга, повышение. ' +
            (best ? 'Прошлый раз: ' + esc(best) + '.' : 'Минут пять.') + '</small></button>' +
          '<button class="sv-mode" onclick="SVETOFOR.mine()"><span style="font-size:1.4rem">🎯</span><b>Мой светофор</b><small>Своё дело на паузе: кто держит «да», можно ли отменить, чего боюсь — и сверка через день. ' +
            (done.length ? 'Сверок: ' + done.length + '.' : '') + '</small></button>' +
        '</div>' +
        (j.length ? '<button class="sv-btn sec" style="margin-left:0" onclick="SVETOFOR.log()">Мой журнал шагов</button>' : '') +
        '<div class="sv-note" style="margin-top:14px">Упражнение к статье «Красный по умолчанию» и курсу <a class="sv-link" href="' + COURSE + '">«Склад ума»</a>. Журнал хранится только на этом устройстве.</div>' +
      '</div>';
    top();
  }

  // --- часть 1: неделя Кати
  function start() {
    styles();
    ST = { i: 0, order: shuffle(SCENES.map(function (_, k) { return k; })), log: [], days: 0 };
    track('game_round_start', { feature: 'svetofor', scenes: SCENES.length });
    scene();
  }

  function scene() {
    var c = container(); if (!c) return;
    var sc = SCENES[ST.order[ST.i]];
    var keys = shuffle(['go', 'show', 'ask']);
    ST.keys = keys;
    c.innerHTML =
      '<div class="sv-wrap sv-in">' +
        '<div class="sv-tag">Неделя Кати · ' + (ST.i + 1) + ' из ' + SCENES.length + (ST.days ? ' · простояло дней: ' + ST.days : '') + '</div>' +
        '<div class="sv-card"><div class="sv-who">' + esc(sc.day) + '</div><p class="sv-line">' + esc(sc.line) + '</p></div>' +
        '<div class="sv-mech" style="margin:0 0 2px">Что Кате сделать?</div>' +
        keys.map(function (k, n) { return '<button class="sv-opt" onclick="SVETOFOR.pick(' + n + ')">' + esc(sc.opts[k]) + '</button>'; }).join('') +
      '</div>';
    top();
  }

  function pick(n) {
    var sc = SCENES[ST.order[ST.i]], k = ST.keys[n], ok = GRADE[sc.kind][k];
    if (k === 'ask') ST.days += 3;
    ST.log.push({ id: sc.id, kind: sc.kind, k: k, ok: ok });
    vibe(ok === 2 ? 12 : 26);
    var best = null;
    Object.keys(GRADE[sc.kind]).forEach(function (x) { if (GRADE[sc.kind][x] === 2) best = x; });
    var head = ok === 2 ? 'Точно.' : (ok === 1 ? 'Почти.' : 'Мимо.');
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sv-wrap sv-in">' +
        '<div class="sv-tag">Неделя Кати · разбор</div>' +
        '<span class="sv-kind ' + sc.kind + '">' + KIND_NAME[sc.kind] + '</span>' +
        '<div class="sv-verdict sv-ok' + ok + '"><b>' + head + '</b> ' + esc(sc.why) + '</div>' +
        (k === 'ask' ? '<div class="sv-card"><b>Счёт за стояние</b><div class="sv-mech">' + esc(sc.cost) + '</div></div>' : '') +
        (ok < 2 ? '<div class="sv-card"><b>Ход, который сработал бы</b><div class="sv-mech">«' + esc(sc.opts[best]) + '»</div></div>' : '') +
        '<button class="sv-btn" onclick="SVETOFOR.next()">' + (ST.i + 1 < SCENES.length ? 'Дальше' : 'Итог недели') + '</button>' +
      '</div>';
    top();
  }

  function next() { ST.i++; if (ST.i >= SCENES.length) return finale(); scene(); }

  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }

  function finale() {
    var L = ST.log;
    var rev = L.filter(function (r) { return r.kind === 'rev'; });
    var hard = L.filter(function (r) { return r.kind !== 'rev'; });
    var green = rev.filter(function (r) { return r.k === 'go'; }).length;
    var red = hard.filter(function (r) { return r.ok === 2; }).length;
    var asks = L.filter(function (r) { return r.k === 'ask'; }).length;
    var rushed = hard.filter(function (r) { return r.k === 'go'; }).length;
    var total = green + red;
    var verdict =
      asks >= 4 ? 'Вы помогали Кате ждать. Это понятно: ждать безопаснее, пока не видно, сколько стоит стояние. За эту неделю у Кати простояло ' + ST.days + ' дней. Вторая часть — про ваше собственное дело на паузе.' :
      rushed >= 2 ? 'Зелёный вы включаете смело — иногда и там, где шаг не отменить. Это вторая крайность. Красный со сроком — не трусость, а тормоз.' :
      total >= 8 ? 'Вы переключали светофор за Катю почти без ошибок: зелёный там, где можно, красный со сроком там, где нужно. Теперь — то же самое со своим делом.' :
      'Различение есть, но неустойчивое. Главный вопрос на каждый шаг один: «Это можно отменить?» Если да — без спроса.';
    var line = total + ' из ' + L.length;
    lsSet(BEST_KEY, line);
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sv-wrap sv-in">' +
        '<div class="sv-tag">Неделя Кати · итог</div>' +
        '<div class="sv-card"><div class="sv-score">' + line + '</div><div class="sv-mech">ситуаций, где светофор переключён верно</div>' +
          '<div class="sv-row"><span>Зелёный там, где можно отменить</span><span>' + green + ' из ' + rev.length + '</span></div>' +
          '<div class="sv-bar"><i style="background:#10b981" data-w="' + pct(green, rev.length) + '"></i></div>' +
          '<div class="sv-row"><span>Красный со сроком там, где нельзя</span><span>' + red + ' из ' + hard.length + '</span></div>' +
          '<div class="sv-bar"><i style="background:#ef4444" data-w="' + pct(red, hard.length) + '"></i></div>' +
          '<div class="sv-mech">Ожиданий «нормально?»: <b>' + asks + '</b> · простояло дней: <b>' + ST.days + '</b> · поспешили с необратимым: <b>' + rushed + '</b></div></div>' +
        '<div class="sv-card">' + esc(verdict) + '</div>' +
        '<button class="sv-btn" onclick="SVETOFOR.mine()">Моё дело на паузе →</button>' +
        '<button class="sv-btn sec" onclick="SVETOFOR.start()">Ещё раз</button>' +
      '</div>';
    setTimeout(function () { var b = document.querySelectorAll('.sv-bar>i'); for (var i = 0; i < b.length; i++) b[i].style.width = b[i].getAttribute('data-w') + '%'; }, 60);
    top();
    track('game_round_finish', { feature: 'svetofor', part: 'katya', green: green, red: red, asks: asks, rushed: rushed, days: ST.days });
  }

  // --- часть 2: мой светофор
  var F = null;
  function mine() {
    styles();
    F = { task: '', who: '', rev: null, cost: '', bar: '', fear: '', p: null };
    track('feature_opened', { feature: 'svetofor_mine' });
    step1();
  }

  function chips(name, list, cur) {
    return '<div class="sv-chips">' + list.map(function (x) {
      return '<button type="button" class="sv-chip' + (cur === x[0] ? ' on' : '') + '" onclick="SVETOFOR.set(\'' + name + '\',\'' + x[0] + '\')">' + esc(x[1]) + '</button>';
    }).join('') + '</div>';
  }

  function step1() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sv-wrap sv-in">' +
        '<button class="sv-ghost" onclick="SVETOFOR.home()">← Назад</button>' +
        '<div class="sv-h1">🎯 Мой светофор</div>' +
        '<p class="sv-lead">Возьмите одно дело, которое сейчас стоит. Сообщение в черновиках, идея, звонок, шаг, после которого вы ждёте, что скажут.</p>' +
        '<label class="sv-f" for="svTask">Что за дело?</label>' +
        '<input id="svTask" class="sv-in-t" maxlength="140" placeholder="Например: отправить руководителю план по рекламе" value="' + esc(F.task) + '">' +
        '<span class="sv-f">Кто должен сказать «да», чтобы вы пошли дальше?</span>' +
        chips('who', [['law', 'Закон, банк, подпись'], ['person', 'Конкретный человек'], ['none', 'Никто — просто жду']], F.who) +
        '<span class="sv-f">Этот шаг можно отменить или исправить?</span>' +
        chips('rev', [['yes', 'Да, можно'], ['no', 'Нет, нельзя']], F.rev) +
        '<button class="sv-btn" onclick="SVETOFOR.go2()">Дальше</button>' +
        '<div class="sv-note" id="svErr" style="color:#ef4444"></div>' +
      '</div>';
    top();
  }

  function set(name, v) {
    var t = document.getElementById('svTask'); if (t) F.task = t.value;
    F[name] = v; step1();
  }

  function go2() {
    var t = document.getElementById('svTask'); if (t) F.task = t.value.trim();
    var err = document.getElementById('svErr');
    if (!F.task || !F.who || !F.rev) { if (err) err.textContent = 'Заполните дело и выберите оба ответа.'; return; }
    var c = container(); if (!c) return;
    var irr = F.rev === 'no';
    var note = irr
      ? 'Это настоящий красный: шаг не отменить. Но красный — не бессрочное ожидание. Покажите тому, кто должен решить, и назначьте срок: «если до … нет возражений — делаю».'
      : (F.who === 'none'
        ? 'Шаг можно отменить, и «да» никто не держит. Переключатель у вас в руках — зелёный.'
        : 'Шаг можно отменить. Человек, чьего «да» вы ждёте, скорее всего, даже не знает, что держит переключатель. Здесь зелёный по умолчанию.');
    c.innerHTML =
      '<div class="sv-wrap sv-in">' +
        lightSvg(irr ? 'red' : 'green') +
        '<div class="sv-card"><b>' + (irr ? 'Красный со сроком' : 'Зелёный') + '</b><div class="sv-mech">' + esc(note) + '</div></div>' +
        '<label class="sv-f" for="svCost">Что будет, если вы так и не сделаете этот шаг? Счёт за стояние.</label>' +
        '<textarea id="svCost" class="sv-in-t" rows="2" maxlength="240" placeholder="Например: идею запустит кто-то другой">' + esc(F.cost) + '</textarea>' +
        '<label class="sv-f" for="svBar">Как вы поймёте, что шаг сделан хорошо? Своя мерка вместо чужого лица.</label>' +
        '<textarea id="svBar" class="sv-in-t" rows="2" maxlength="240" placeholder="Например: в плане есть цифры, срок и первый шаг">' + esc(F.bar) + '</textarea>' +
        '<label class="sv-f" for="svFear">Чего вы боитесь? Что случится, если сделать шаг ' + (irr ? 'со сроком' : 'без спроса') + '?</label>' +
        '<textarea id="svFear" class="sv-in-t" rows="2" maxlength="240" placeholder="Например: решат, что я выскочка">' + esc(F.fear) + '</textarea>' +
        '<span class="sv-f">Насколько это вероятно, по ощущению?</span>' +
        '<div class="sv-big-n" id="svPv">' + (F.p == null ? 50 : F.p) + ' %</div>' +
        '<input id="svP" class="sv-range" type="range" min="0" max="100" step="5" value="' + (F.p == null ? 50 : F.p) + '" oninput="document.getElementById(\'svPv\').textContent=this.value+\' %\'">' +
        '<button class="sv-btn" onclick="SVETOFOR.commit()">' + (irr ? 'Показываю и назначаю срок' : 'Делаю шаг сегодня') + '</button>' +
        '<div class="sv-note" id="svErr2" style="color:#ef4444"></div>' +
      '</div>';
    top();
  }

  function commit() {
    F.cost = (document.getElementById('svCost') || {}).value || '';
    F.bar = (document.getElementById('svBar') || {}).value || '';
    F.fear = (document.getElementById('svFear') || {}).value || '';
    F.p = parseInt((document.getElementById('svP') || {}).value, 10);
    if (!F.fear.trim()) { var e = document.getElementById('svErr2'); if (e) e.textContent = 'Назовите, чего боитесь, — без этого не с чем будет сверить.'; return; }
    var j = journal();
    j.push({ at: Date.now(), task: F.task, who: F.who, rev: F.rev, cost: F.cost.trim(), bar: F.bar.trim(), fear: F.fear.trim(), p: F.p, actual: null, note: '' });
    saveJournal(j);
    track('svetofor_commit', { rev: F.rev, who: F.who, p: F.p });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sv-wrap sv-in">' +
        lightSvg(F.rev === 'no' ? 'red' : 'green') +
        '<div class="sv-card"><b>Записано.</b><div class="sv-mech">' +
          (F.rev === 'no' ? 'Сегодня — покажите и назначьте срок.' : 'Сегодня — сделайте шаг. Никого не спрашивая.') +
          ' Завтра откройте «Светофор»: он спросит, что случилось на самом деле, и сравнит с вашими ' + F.p + ' %.</div></div>' +
        (F.cost.trim() ? '<div class="sv-card"><b>Ваш счёт за стояние</b><div class="sv-mech">' + esc(F.cost) + '</div></div>' : '') +
        (F.bar.trim() ? '<div class="sv-card"><b>Ваша мерка</b><div class="sv-mech">' + esc(F.bar) + '</div></div>' : '') +
        '<button class="sv-btn" onclick="SVETOFOR.home()">Готово</button>' +
      '</div>';
    top();
  }

  function check(at) {
    styles();
    var j = journal(), x = j.filter(function (y) { return y.at === at; })[0];
    if (!x) return home();
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sv-wrap sv-in">' +
        '<button class="sv-ghost" onclick="SVETOFOR.home()">← Назад</button>' +
        '<div class="sv-h1">Как прошло?</div>' +
        '<div class="sv-card"><b>' + esc(x.task) + '</b><div class="sv-mech">Вы боялись: «' + esc(x.fear) + '» — и оценивали это в ' + x.p + ' %.</div></div>' +
        '<span class="sv-f">Шаг сделан?</span>' +
        '<div class="sv-chips"><button class="sv-chip" onclick="SVETOFOR.did(' + at + ',1)">Да</button><button class="sv-chip" onclick="SVETOFOR.did(' + at + ',0)">Пока нет</button></div>' +
      '</div>';
    top();
  }

  function did(at, yes) {
    var j = journal(), x = j.filter(function (y) { return y.at === at; })[0];
    if (!x) return home();
    var c = container(); if (!c) return;
    if (!yes) {
      x.at = Date.now() - 4 * 3600 * 1000; // спросим снова через несколько часов
      saveJournal(j);
      c.innerHTML = '<div class="sv-wrap sv-in"><div class="sv-card"><b>Ничего.</b><div class="sv-mech">Так бывает в первые разы. Посмотрите на свой счёт за стояние: «' + esc(x.cost || '—') +
        '». Если шаг можно отменить, попробуйте сделать его маленьким — первую строчку, один звонок. Спрошу ещё раз позже.</div></div>' +
        '<button class="sv-btn" onclick="SVETOFOR.home()">Понятно</button></div>';
      top(); return;
    }
    c.innerHTML =
      '<div class="sv-wrap sv-in">' +
        '<div class="sv-card"><b>Сделано.</b><div class="sv-mech">Насколько сбылось то, чего вы боялись: «' + esc(x.fear) + '»?</div></div>' +
        '<div class="sv-big-n" id="svAv">0 %</div>' +
        '<input id="svA" class="sv-range" type="range" min="0" max="100" step="5" value="0" oninput="document.getElementById(\'svAv\').textContent=this.value+\' %\'">' +
        '<div class="sv-note">0 — ничего из этого не случилось, 100 — случилось ровно то, чего боялись.</div>' +
        '<label class="sv-f" for="svNote">Что произошло на самом деле? (по желанию)</label>' +
        '<input id="svNote" class="sv-in-t" maxlength="200" placeholder="Например: руководитель ответил «давай» через 5 минут">' +
        '<button class="sv-btn" onclick="SVETOFOR.close(' + at + ')">Сохранить</button>' +
      '</div>';
    top();
  }

  function close(at) {
    var j = journal(), x = j.filter(function (y) { return y.at === at; })[0];
    if (!x) return home();
    x.actual = parseInt(document.getElementById('svA').value, 10);
    x.note = (document.getElementById('svNote').value || '').trim();
    saveJournal(j);
    track('svetofor_check', { p: x.p, actual: x.actual });
    var done = j.filter(function (y) { return y.actual != null; });
    var avgP = Math.round(done.reduce(function (a, y) { return a + y.p; }, 0) / done.length);
    var avgA = Math.round(done.reduce(function (a, y) { return a + y.actual; }, 0) / done.length);
    var diff = x.p - x.actual;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sv-wrap sv-in">' +
        lightSvg('green') +
        '<div class="sv-card"><b>' + (diff > 0 ? 'Страх был больше на ' + diff + ' %.' : diff < 0 ? 'В этот раз страх оказался точнее.' : 'Ровно как боялись.') + '</b>' +
          '<div class="sv-mech">' + (diff > 0 ? 'Так и гаснет красный: не от уговоров, а от таких сверок.' :
            'Это тоже полезно знать: значит, здесь красный был не привычкой, а сигналом. Отличать одно от другого — и есть цель.') + '</div></div>' +
        '<div class="sv-card"><b>За все сверки (' + done.length + ')</b>' +
          '<div class="sv-row"><span>Боялись в среднем</span><span>' + avgP + ' %</span></div>' +
          '<div class="sv-bar"><i style="background:#ef4444;width:' + avgP + '%"></i></div>' +
          '<div class="sv-row"><span>Случилось в среднем</span><span>' + avgA + ' %</span></div>' +
          '<div class="sv-bar"><i style="background:#10b981;width:' + avgA + '%"></i></div></div>' +
        '<button class="sv-btn" onclick="SVETOFOR.mine()">Следующее дело</button>' +
        '<button class="sv-btn sec" onclick="SVETOFOR.home()">В начало</button>' +
      '</div>';
    top();
  }

  function log() {
    styles();
    var j = journal().slice().reverse();
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sv-wrap sv-in">' +
        '<button class="sv-ghost" onclick="SVETOFOR.home()">← Назад</button>' +
        '<div class="sv-h1">Журнал шагов</div>' +
        '<div class="sv-card">' + (j.length ? j.map(function (x) {
          var d = new Date(x.at);
          return '<div class="sv-j"><b>' + esc(x.task) + '</b><br><span class="sv-note">' + d.toLocaleDateString('ru-RU') + ' · ' +
            (x.rev === 'no' ? 'нельзя отменить' : 'можно отменить') + ' · боялись: ' + x.p + ' %' +
            (x.actual != null ? ' · случилось: ' + x.actual + ' %' : ' · ждёт сверки') + '</span>' +
            (x.note ? '<br><span class="sv-note">«' + esc(x.note) + '»</span>' : '') + '</div>';
        }).join('') : '<div class="sv-note">Пока пусто.</div>') + '</div>' +
      '</div>';
    top();
  }

  window.SVETOFOR = { home: home, start: start, pick: pick, next: next, mine: mine, set: set, go2: go2,
                      commit: commit, check: check, did: did, close: close, log: log,
                      scenes: SCENES, getState: function () { return ST; } };
  window.showSvetoforGame = home;
  console.log('✅ svetofor.js loaded (упражнение «Светофор»: красный по умолчанию)');
})();
