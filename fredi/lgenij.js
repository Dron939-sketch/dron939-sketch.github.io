// ============================================================
// lgenij.js — игра «Ленивый гений»
// Тренажёр двигателя: ставить дерзкие (амбициозные) цели и
// находить к ним самый дешёвый путь (лень как инженер, ИКР из ТРИЗ).
// Наука навыка: WOOP/мысленное контрастирование (амбиция+препятствие),
// ИКР (максимум пользы минимумом ресурса), deliberate practice
// (узкая задача + мгновенная обратная связь от Фреди), retrieval
// (блиц «вспомни метод по памяти»), spacing/перенос (разные сферы).
// Бесплатная игра (без премиума).
// Экспорт: window.showLgenijGame, window.LGENIJ
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

  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 320, temperature: opts.temperature == null ? 0.5 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ===== Метод «Рычаг» (ИКР) — 4 вопроса. Их же игрок вспоминает в блице. =====
  var LEVERS = [
    'Что уже почти делает это за меня — чужая инерция, готовый сервис, привычка?',
    'Какой ресурс валяется под ногами даром — люди, навыки, вещи, время, которые уже есть?',
    'Какой вход в 2 минуты, чтобы лень пропустила, а поток втянул дальше?',
    'Что подключить, чтобы система работала сама — без моей ежедневной воли?'
  ];

  // ===== Квадранты (амбиция × лень-эффективность) =====
  var QUAD = {
    genij:    { em: '🚀', name: 'Гений',    hint: 'высоко и дёшево — то, что качаем', color: '#34d399' },
    geroj:    { em: '😤', name: 'Герой',    hint: 'высоко, но силой — так выгорают', color: '#fbbf24' },
    hitrec:   { em: '😎', name: 'Хитрец',   hint: 'дёшево, но мелко — подними планку', color: '#38bdf8' },
    plankton: { em: '😴', name: 'Планктон', hint: 'мелко и через силу — двигатель заглох', color: '#f87171' }
  };
  function quadOf(a, l) {
    if (a >= 6 && l >= 6) return 'genij';
    if (a >= 6) return 'geroj';
    if (l >= 6) return 'hitrec';
    return 'plankton';
  }

  // ===== Банк робких целей по сферам жизни (перенос навыка). =====
  // Ответы игрок придумывает сам, их оценивает Фреди — «правильных» нет.
  // У каждой цели — свой проработанный пример хода (bold/path/future),
  // чтобы образец был про ТУ ЖЕ цель, что перед глазами (worked example).
  var BANK = [
    { dom: 'Навык', timid: 'подтянуть английский',
      bold: 'свободно говорить с иностранцами на любимую тему уже через год',
      path: 'смотреть любимые сериалы в оригинале с субтитрами и болтать с ИИ по 5 минут в день — интерес тянет сам',
      future: 'тем, кто думает на двух языках и не боится ни одного собеседника' },
    { dom: 'Тело', timid: 'иногда делать зарядку',
      bold: 'к лету стать выносливым — легко пробегать пять километров и не задыхаться на лестнице',
      path: 'класть форму с вечера у кровати и бегать с другом по утрам — вам неудобно подводить друг друга',
      future: 'человеком, для которого движение — не подвиг, а часть дня' },
    { dom: 'Деньги', timid: 'немного отложить на чёрный день',
      bold: 'за год собрать подушку на полгода спокойной жизни',
      path: 'настроить автосписание десяти процентов в день зарплаты — деньги копятся сами, до того как я их увижу',
      future: 'человеком, который спит спокойно, потому что за спиной есть опора' },
    { dom: 'Карьера', timid: 'может, попросить прибавку',
      bold: 'за полгода вырасти в доходе в полтора раза — на новой роли или в новом месте',
      path: 'собрать список своих результатов и разослать резюме на три вакансии мечты — рынок сам покажет мою цену',
      future: 'специалистом, за которого компании конкурируют' },
    { dom: 'Творчество', timid: 'когда-нибудь начать блог',
      bold: 'за три месяца набрать первую тысячу читателей на том, что искренне люблю',
      path: 'раз в день записывать одну мысль голосом по дороге и постить как есть — без монтажа и перфекционизма',
      future: 'человеком, у которого есть свой голос и своя аудитория' },
    { dom: 'Отношения', timid: 'почаще видеться с друзьями',
      bold: 'собрать вокруг себя живой круг, где встречаются каждую неделю и тянут друг друга вверх',
      path: 'завести регулярный день — «четверг, у меня, кто может» — один раз договориться, дальше идёт само',
      future: 'человеком, вокруг которого само собирается тепло' },
    { dom: 'Навык', timid: 'научиться готовить пару блюд',
      bold: 'готовить так, что гости просят рецепт, а будни перестают быть про «что бы съесть»',
      path: 'освоить пять базовых техник по коротким видео и повторять любимое, пока не выйдет на автомате',
      future: 'человеком, для которого кухня — удовольствие, а не повинность' },
    { dom: 'Тело', timid: 'поменьше сидеть в телефоне вечером',
      bold: 'вернуть себе вечера — два часа на живое, а не на ленту',
      path: 'ставить телефон заряжаться в другой комнате в девять вечера — убрал трение, и рука не тянется',
      future: 'человеком, который управляет вниманием, а не лентой' },
    { dom: 'Карьера', timid: 'разобраться в новой программе на работе',
      bold: 'стать тем, к кому в отделе идут за помощью по этой программе',
      path: 'разбирать по одной реальной рабочей задаче в ней каждый день — учусь на том, что и так надо сделать',
      future: 'человеком, которому не страшны новые инструменты' },
    { dom: 'Деньги', timid: 'найти подработку на выходных',
      bold: 'собрать второй поток дохода, который за полгода дорастёт до половины зарплаты',
      path: 'продать то, что уже умею, первым трём знакомым — сарафан запустит остальное',
      future: 'человеком, чей доход не держится на одной ниточке' },
    { dom: 'Творчество', timid: 'снять один ролик для себя',
      bold: 'за месяц выпустить серию роликов, которую не стыдно показать и которая находит своих',
      path: 'снимать на телефон одним дублем то, что и так делаю, и выкладывать без вылизывания',
      future: 'человеком, который создаёт, а не только потребляет' },
    { dom: 'Быт', timid: 'навести порядок в квартире',
      bold: 'превратить дом в место, куда кайфово возвращаться — где каждый угол работает на меня',
      path: 'разбирать по одной зоне в день, таймер на пятнадцать минут, лишнее сразу в коробку «отдать»',
      future: 'человеком, у которого дом — источник сил, а не список задач' },
    { dom: 'Отношения', timid: 'познакомиться с новыми людьми',
      bold: 'за сезон завести пять новых знакомств, из которых вырастут настоящие связи',
      path: 'ходить туда, где люди с моим интересом — там знакомство идёт само, вокруг общего дела',
      future: 'человеком, которому легко входить в новые круги' },
    { dom: 'Навык', timid: 'почитать что-то по своей теме',
      bold: 'за год стать в своей теме человеком, к которому идут за мнением',
      path: 'слушать аудиокниги и подкасты по теме в дороге — время, которое и так есть, работает на меня',
      future: 'человеком, чьё мнение в теме весомо' }
  ];
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var ROUNDS = 5; // раунд 5 — своя реальная цель

  // ===== Проработанные примеры + подсказки «как делать» (worked examples).
  // Показываем на каждом этапе; в первых раундах развёрнуто, дальше — сворачиваем
  // (принцип «показать образец → убрать помощь»). Примеры берём из ДРУГОЙ сферы,
  // чтобы подсказать ход, но не выдать ответ текущей цели.
  var SITE = 'https://meysternlp.ru';
  var COURSE_URL = SITE + '/blog/lektorij/dvigatel-len-ambicii/';
  var HELP = {
    planka:   { how: 'Убери слова-глушилки («может», «иногда», «немного», «когда-нибудь»), умножь масштаб примерно в 10 раз и добавь срок. Спроси себя: «а если замахнуться по-настоящему?»',
                lec: { t: 'Амбиция — это вектор, а не «больше»', u: SITE + '/blog/lekciya-dvigatel-3-ambiciya-vektor.html' } },
    rychag:   { how: 'Вопрос не «как заставить себя», а «как сделать, чтобы вышло почти само». Пройдись по 4 рычагам сверху и возьми самый дешёвый ход — где любимое или уже готовое тянет тебя за собой.',
                lec: { t: 'Обмануть лень: дешёвый вход и рычаги', u: SITE + '/blog/lekciya-dvigatel-8-obmanut-len.html' } },
    primanka: { how: 'Одна строка не про результат, а про то, кем ты станешь. Этот образ и есть приманка — она тянет вперёд, когда мотивации нет.',
                lec: { t: 'Взгляд изобретателя: будущее как приманка', u: SITE + '/blog/lekciya-dvigatel-6-vzglyad-izobretatelya.html' } }
  };
  // Запасной пример для раунда со своей целью (готового образца нет —
  // помечаем явно «на примере другой цели», чтобы не путать).
  var FALLBACK = {
    planka: '<b>«иногда бегать»</b> → <span style="color:#6ee7b7">пробежать весной полумарафон и кайфануть на финише</span>',
    rychag: 'Цель «втянуться в спорт» → <span style="color:#6ee7b7">бегать с другом по утрам — вам неудобно подводить друг друга</span>',
    primanka: '<span style="color:#6ee7b7">человеком, для которого спорт — не подвиг, а часть дня</span>'
  };
  // Пример строится вокруг ТЕКУЩЕЙ цели (или запасной — на своём раунде).
  function exText(phase) {
    var cur = ST.cur || {};
    if (cur.own || !cur.bold) return { label: 'Например, на другой цели', html: FALLBACK[phase] };
    if (phase === 'planka') return { label: 'Например, эту цель можно поднять так', html: '<b>«' + esc(cur.timid) + '»</b> → <span style="color:#6ee7b7">' + esc(cur.bold) + '</span>' };
    if (phase === 'rychag') return { label: 'Пример дешёвого пути к этой цели', html: '<span style="color:#6ee7b7">' + esc(cur.path) + '</span>' };
    return { label: 'Пример образа будущего себя', html: '<span style="color:#6ee7b7">' + esc(cur.future) + '</span>' };
  }
  // Блок «Пример и подсказка»: развёрнут в первых 2 раундах, дальше свёрнут.
  function helpBox(phase) {
    var e = exText(phase);
    var open = ST.idx < 2;
    return '<div class="lg-help" id="lgHelp">' +
      '<button class="lg-help-h" onclick="LGENIJ.toggleHelp()"><span>💡 Пример и подсказка</span><span id="lgHelpCar">' + (open ? '▴' : '▾') + '</span></button>' +
      '<div class="lg-help-b" id="lgHelpBody" style="' + (open ? '' : 'display:none') + '">' +
        '<div class="lg-help-lbl" style="font-size:.78rem;color:#8b93a7;margin-bottom:5px">' + e.label + ':</div>' +
        '<div class="lg-help-ex">' + e.html + '</div>' +
        '<div class="lg-help-how">' + esc(HELP[phase].how) + '</div>' +
        (HELP[phase].lec ? '<a class="lg-help-lec" href="' + HELP[phase].lec.u + '" target="_blank" rel="noopener">📖 Подробнее в лекции: ' + esc(HELP[phase].lec.t) + ' →</a>' : '') +
      '</div></div>';
  }

  // ===== Состояние =====
  var ST = { stage: 'home', order: [], idx: 0, cur: null, ambitious: '', path: '', future: '', results: [], busy: false, blitzDone: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('lgenij_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, bestTyaga: 0, quad: {}, lastAvg: [] }; }
  function saveStats(s) { try { localStorage.setItem('lgenij_stats', JSON.stringify(s)); } catch (e) {} }

  // ===== CSS =====
  function injectCSS() {
    if (document.getElementById('lgenij-css')) return;
    var st = document.createElement('style'); st.id = 'lgenij-css';
    st.textContent = [
      '.lg-wrap{max-width:640px;margin:0 auto;padding:18px 16px 96px;color:#e7eaf0;font-size:1rem;line-height:1.6}',
      '.lg-top{display:flex;justify-content:space-between;align-items:center;color:#8b93a7;font-size:.86rem;margin-bottom:14px}',
      '.lg-x{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:0}',
      '.lg-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:0 0 6px}',
      '.lg-sub{color:#aab2c4;margin:0 0 16px}',
      '.lg-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px;margin:0 0 12px}',
      '.lg-card b{color:#fff;font-weight:600}',
      '.lg-ch{font-weight:700;color:#fff;margin-bottom:8px}',
      '.lg-li{margin:7px 0}',
      '.lg-timid{font-size:1.18rem;font-weight:700;color:#fff;line-height:1.4}',
      '.lg-echo{background:rgba(52,211,153,.10);border:1px solid rgba(52,211,153,.28);border-radius:12px;padding:11px 13px;margin:0 0 12px;color:#d1fae5;font-size:.96rem}',
      '.lg-lever{margin:8px 0;padding-left:24px;position:relative;color:#cdd4e2;font-size:.95rem}',
      '.lg-lever::before{content:"🔧";position:absolute;left:0;top:0}',
      '.lg-ta{width:100%;box-sizing:border-box;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;font:15px/1.5 inherit;padding:12px 13px;resize:vertical;min-height:70px}',
      '.lg-ta:focus{outline:none;border-color:#3a86ff}',
      '.lg-in{width:100%;box-sizing:border-box;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;font:15px/1.5 inherit;padding:11px 13px}',
      '.lg-in:focus{outline:none;border-color:#3a86ff}',
      '.lg-hint{color:#8b93a7;font-size:.85rem;margin:6px 2px 0}',
      '.lg-help{background:rgba(58,134,255,.08);border:1px solid rgba(58,134,255,.24);border-radius:12px;margin:0 0 12px;overflow:hidden}',
      '.lg-help-h{width:100%;display:flex;justify-content:space-between;align-items:center;background:none;border:none;color:#9cc0ff;font:600 .9rem inherit;cursor:pointer;padding:11px 13px}',
      '.lg-help-b{padding:0 13px 12px}',
      '.lg-help-ex{background:rgba(0,0,0,.2);border-radius:9px;padding:9px 11px;font-size:.92rem;line-height:1.5;color:#dbe4f5;margin-bottom:8px}',
      '.lg-help-how{font-size:.86rem;color:#aab2c4;line-height:1.5}',
      '.lg-help-lec{display:inline-block;margin-top:9px;font-size:.85rem;color:#9cc0ff;text-decoration:none;border-bottom:1px solid rgba(156,192,255,.35)}',
      '.lg-demo{margin:10px 0}',
      '.lg-demo-l{display:block;font-size:.75rem;color:#8b93a7;margin-bottom:2px}',
      '.lg-demo-v{font-size:.98rem;color:#fff;line-height:1.4}',
      '.lg-meta{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;color:#8b93a7;font-size:.82rem;margin:2px 0 14px}',
      '.lg-meta b{color:#cdd4e2;font-weight:600}',
      '[data-theme="light"] .lg-demo-v{color:#0b1220}',
      '.lg-course{display:block;text-align:center;margin:0 0 12px;padding:11px;font-size:.9rem;color:#9cc0ff;text-decoration:none;background:rgba(58,134,255,.08);border:1px solid rgba(58,134,255,.22);border-radius:12px}',
      '[data-theme="light"] .lg-help-lec,[data-theme="light"] .lg-course{color:#2e6fe0}',
      '[data-theme="light"] .lg-help{background:rgba(58,134,255,.07);border-color:rgba(58,134,255,.28)}',
      '[data-theme="light"] .lg-help-h{color:#2e6fe0}',
      '[data-theme="light"] .lg-help-ex{background:#eef3fb;color:#26324a}',
      '[data-theme="light"] .lg-help-how{color:#5a6472}',
      '.lg-primary{width:100%;margin-top:14px;padding:14px 16px;border:none;border-radius:12px;background:linear-gradient(135deg,#3a86ff,#5b9bff);color:#fff;font:700 1rem inherit;cursor:pointer}',
      '.lg-primary:disabled{opacity:.5;cursor:default}',
      '.lg-secondary{width:100%;margin-top:10px;padding:12px 16px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:transparent;color:#cdd4e2;font:600 .95rem inherit;cursor:pointer}',
      '.lg-ghost{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:8px 0;text-decoration:underline}',
      '.lg-steps{display:flex;gap:6px;margin-bottom:14px}',
      '.lg-step{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.14)}',
      '.lg-step.on{background:#3a86ff}',
      '.lg-dials{display:flex;gap:12px;margin:6px 0 14px}',
      '.lg-dial{flex:1}',
      '.lg-dial .l{font-size:.82rem;color:#aab2c4;margin-bottom:5px;display:flex;justify-content:space-between}',
      '.lg-bar{height:12px;border-radius:7px;background:rgba(255,255,255,.12);overflow:hidden}',
      '.lg-bar i{display:block;height:100%;border-radius:7px}',
      '.lg-quad{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:1.15rem;padding:8px 14px;border-radius:12px;margin:2px 0 4px}',
      '.lg-tyaga{font-size:2.6rem;font-weight:800;letter-spacing:-.03em;line-height:1;color:#fff}',
      '.lg-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}',
      '.lg-qc{border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:9px 10px;font-size:.8rem;color:#9aa3b6;text-align:center}',
      '.lg-qc.hi{border-color:#3a86ff;color:#fff;background:rgba(58,134,255,.12);font-weight:700}',
      '.lg-fb{color:#d7def0;line-height:1.6}',
      '.lg-row{display:flex;gap:10px;margin-top:14px}',
      '.lg-row>*{flex:1;margin-top:0}',
      '.lg-spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:lgspin .7s linear infinite;vertical-align:-3px;margin-right:6px}',
      '@keyframes lgspin{to{transform:rotate(360deg)}}',
      '[data-theme="light"] .lg-wrap{color:#1d1d1f}',
      '[data-theme="light"] .lg-card{background:#fff;border-color:rgba(0,0,0,.1)}',
      '[data-theme="light"] .lg-card b,[data-theme="light"] .lg-ch,[data-theme="light"] .lg-timid,[data-theme="light"] .lg-tyaga{color:#0b1220}',
      '[data-theme="light"] .lg-sub,[data-theme="light"] .lg-hint,[data-theme="light"] .lg-top{color:#5a6472}',
      '[data-theme="light"] .lg-ta,[data-theme="light"] .lg-in{background:#f5f7fa;color:#0b1220;border-color:rgba(0,0,0,.15)}',
      '[data-theme="light"] .lg-fb{color:#333}',
      '@media(max-width:560px){.lg-wrap{padding:14px 12px 96px}.lg-h1{font-size:1.32rem}.lg-timid{font-size:1.08rem}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ===== Экраны =====
  function home() {
    injectCSS();
    ST.stage = 'home';
    var c = container(); if (!c) return;
    var s = loadStats();
    var statLine = s.plays ? ('<div class="lg-hint" style="margin-top:0">Сыграно раундов: ' + s.plays + ' · лучшая тяга: ' + (s.bestTyaga || 0) + '/10</div>') : '';
    c.innerHTML =
      '<div class="lg-wrap">' +
        '<div class="lg-top"><button class="lg-x" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button><span>🧲 бесплатно</span></div>' +
        '<h1 class="lg-h1">🧲 Ленивый гений</h1>' +
        '<p class="lg-sub">Как изобретатель: хотеть в 10 раз больше — и находить, как получить это почти <b style="color:#e7eaf0">даром</b>. Берёшь робкую цель и превращаешь её в дерзкую с коротким путём.</p>' +
        '<div class="lg-card"><div class="lg-ch">Смотри, как это работает</div>' +
          '<div class="lg-demo"><span class="lg-demo-l">Робкая цель, которую все себе ставят:</span><div class="lg-demo-v">😐 «иногда бегать»</div></div>' +
          '<div class="lg-demo"><span class="lg-demo-l">① Поднимаешь планку — метишь смелее:</span><div class="lg-demo-v" style="color:#8fd3ff">🚀 «к лету легко пробегать пять километров»</div></div>' +
          '<div class="lg-demo"><span class="lg-demo-l">② Находишь ленивый путь — где выйдет почти само:</span><div class="lg-demo-v" style="color:#6ee7b7">🔧 «бегать с другом по утрам — вам неудобно подводить друг друга»</div></div>' +
          '<div class="lg-demo"><span class="lg-demo-l">③ Называешь, кем станешь:</span><div class="lg-demo-v" style="color:#c9b8ff">🧲 «человеком, для кого спорт — часть дня»</div></div>' +
          '<div style="margin-top:12px;color:#aab2c4;font-size:.9rem;line-height:1.5">Фреди оценит два твоих хода — <b style="color:#8fd3ff">амбицию</b> × <b style="color:#6ee7b7">дешевизну пути</b> — и по-доброму подскажет, куда тебя тянет: метить смелее или искать путь легче. На каждом шаге есть пример и подсказка — «пустого поля» бояться не нужно.</div>' +
        '</div>' +
        '<div class="lg-meta"><span><b>5</b> целей</span><span>·</span><span>~<b>5</b> минут</span><span>·</span><span>бесплатно</span><span>·</span><span>последний раунд — <b>своя цель</b></span></div>' +
        statLine +
        '<button class="lg-primary" onclick="LGENIJ.start()">▶ Играть</button>' +
        '<a class="lg-course" href="' + COURSE_URL + '" target="_blank" rel="noopener" style="margin-top:12px">🎓 Теория и разбор — в курсе «Двигатель: лень, амбиции и азарт поиска»</a>' +
      '</div>';
    track('game_open', { game: 'lgenij' });
  }

  function start() {
    ST.order = shuffle(BANK).slice(0, ROUNDS - 1); // последний раунд — своя цель
    ST.idx = 0; ST.results = []; ST.blitzDone = false;
    nextRound();
  }

  function nextRound() {
    ST.ambitious = ''; ST.path = ''; ST.future = '';
    var last = ST.idx === ROUNDS - 1;
    ST.cur = last ? { dom: 'Твоё', timid: '', own: true } : ST.order[ST.idx];
    renderPlanka();
  }

  function stepsBar(step) {
    var h = '<div class="lg-steps">';
    for (var i = 1; i <= 3; i++) h += '<div class="lg-step' + (i <= step ? ' on' : '') + '"></div>';
    return h + '</div>';
  }
  function roundHead(title) {
    return '<div class="lg-top"><span>Раунд ' + (ST.idx + 1) + ' из ' + ROUNDS + ' · ' + esc(ST.cur.dom) + '</span><button class="lg-x" onclick="LGENIJ.quit()">✕ Выйти</button></div>' +
      '<h1 class="lg-h1" style="font-size:1.24rem">' + title + '</h1>';
  }

  // Фаза 1 — Планка
  function renderPlanka() {
    ST.stage = 'planka';
    var c = container(); if (!c) return;
    var own = ST.cur.own;
    var body = own
      ? ('<div class="lg-card"><div class="lg-ch">Твоя реальная цель</div>Возьми что-то из своей жизни, что давно «надо бы». Впиши её <b>робкую</b> версию — как ты обычно себе её ставишь, без пафоса.</div>' +
         '<input class="lg-in" id="lgTimid" placeholder="например: наконец разобрать гараж" autocomplete="off">' +
         '<div style="height:12px"></div>')
      : ('<div class="lg-card"><div style="color:#8b93a7;font-size:.85rem;margin-bottom:6px">Робкая цель</div><div class="lg-timid">«' + esc(ST.cur.timid) + '»</div></div>');
    c.innerHTML =
      '<div class="lg-wrap">' + roundHead('① Подними планку') + stepsBar(1) +
        body +
        '<div class="lg-ch">Перепиши её дерзко — но по-настоящему твоё</div>' +
        helpBox('planka') +
        '<textarea class="lg-ta" id="lgAmb" placeholder="Смелая версия цели…"></textarea>' +
        '<button class="lg-primary" onclick="LGENIJ.submitPlanka()">Поднял планку →</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById(own ? 'lgTimid' : 'lgAmb'); if (el) el.focus(); }, 60);
  }
  function submitPlanka() {
    if (ST.cur.own) {
      var t = (document.getElementById('lgTimid') || {}).value || '';
      t = t.trim(); if (!t) { toast('Впиши свою цель', 'error'); return; }
      ST.cur.timid = t;
    }
    var a = (document.getElementById('lgAmb') || {}).value || '';
    a = a.trim(); if (a.length < 4) { toast('Замахнись посмелее', 'error'); return; }
    ST.ambitious = a; vibe(15); renderRychag();
  }

  // Фаза 2 — Рычаг (ИКР)
  function renderRychag() {
    ST.stage = 'rychag';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' + roundHead('② Найди ленивый рычаг') + stepsBar(2) +
        '<div class="lg-echo">🎯 Твоя дерзкая цель: <b>' + esc(ST.ambitious) + '</b></div>' +
        '<div class="lg-ch">Как получить это почти даром?</div>' +
        '<div class="lg-hint" style="margin:0 0 10px">Идеальный путь — когда цель достигается сама, из того, что уже под рукой. Пройдись по рычагам:</div>' +
        LEVERS.map(function (q) { return '<div class="lg-lever">' + esc(q) + '</div>'; }).join('') +
        '<div style="height:12px"></div>' + helpBox('rychag') +
        '<textarea class="lg-ta" id="lgPath" placeholder="Самый дешёвый путь к цели…"></textarea>' +
        '<button class="lg-primary" onclick="LGENIJ.submitRychag()">Нашёл путь →</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('lgPath'); if (el) el.focus(); }, 60);
  }
  function submitRychag() {
    var p = (document.getElementById('lgPath') || {}).value || '';
    p = p.trim(); if (p.length < 4) { toast('Опиши путь чуть подробнее', 'error'); return; }
    ST.path = p; vibe(15); renderPrimanka();
  }

  // Фаза 3 — Приманка
  function renderPrimanka() {
    ST.stage = 'primanka';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' + roundHead('③ Образ будущего себя') + stepsBar(3) +
        '<div class="lg-echo">🎯 <b>' + esc(ST.ambitious) + '</b></div>' +
        '<div class="lg-ch">Кем ты станешь, когда это случится?</div>' +
        '<div class="lg-hint" style="margin:0 0 8px">Одна строка. Это приманка, которая тянет вперёд и превращает путь в предвкушение.</div>' +
        helpBox('primanka') +
        '<input class="lg-in" id="lgFut" placeholder="Я стану тем, кто…" autocomplete="off">' +
        '<button class="lg-primary" onclick="LGENIJ.submitPrimanka()">Готово — оценить →</button>' +
        '<button class="lg-secondary" onclick="LGENIJ.submitPrimanka(true)">Пропустить</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('lgFut'); if (el) el.focus(); }, 60);
  }
  function submitPrimanka(skip) {
    var f = skip ? '' : ((document.getElementById('lgFut') || {}).value || '').trim();
    ST.future = f; vibe(20); score();
  }

  // ===== Оценка (Фреди) =====
  function parseScore(txt) {
    if (!txt) return null;
    var m = txt.match(/\{[\s\S]*\}/); if (!m) return null;
    try {
      var o = JSON.parse(m[0]);
      var a = Math.max(0, Math.min(10, Math.round(Number(o.ambition))));
      var l = Math.max(0, Math.min(10, Math.round(Number(o.lazy))));
      if (isNaN(a) || isNaN(l)) return null;
      return { a: a, l: l, praise: String(o.praise || '').trim(), tip: String(o.tip || '').trim(), lever: String(o.lever || '').trim() };
    } catch (e) { return null; }
  }
  function scorePrompt() {
    return 'Ты — Фреди, тренер навыка «ленивый гений»: ставить дерзкие цели и находить самый дешёвый путь к ним, как изобретатель (хочет невозможного, ищет как получить даром).\n' +
      'Робкая исходная цель: «' + ST.cur.timid + '».\n' +
      'Игрок поднял планку до: «' + ST.ambitious + '».\n' +
      'Игрок предложил ленивый путь (идеальный результат — максимум пользы минимумом ресурса, из того что под рукой): «' + ST.path + '».\n' +
      'Образ будущего себя: «' + (ST.future || '—') + '».\n' +
      'Оцени по двум шкалам 0–10. AMBITION: насколько цель стала выше и смелее исходной, но оставаясь достижимой (заниженная планка = мало, бред без опоры = средне). LAZY: насколько путь дёшев и умён — использует готовые ресурсы, чужую инерцию, крошечный вход, систему которая работает сама (грубая сила и надрыв = мало).\n' +
      'Верни СТРОГО один JSON без текста вокруг: {"ambition":ЧИСЛО,"lazy":ЧИСЛО,"praise":"одна короткая фраза — что удалось","tip":"одна короткая фраза — как усилить слабую сторону","lever":"один конкретный ещё более ленивый ход под эту цель"}. Всё по-русски, на «ты», без воды.';
  }
  async function score() {
    ST.stage = 'scoring';
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="lg-wrap" style="text-align:center;padding-top:60px"><div class="lg-tyaga"><span class="lg-spin"></span></div><p class="lg-sub" style="margin-top:16px">Фреди взвешивает амбицию и лень…</p></div>';
    var res = null;
    try {
      var r = await aiGenerate(scorePrompt(), { max_tokens: 300, temperature: 0.4 });
      var txt = (r && r.success && r.content) ? String(r.content) : (r && r.content ? String(r.content) : '');
      res = parseScore(txt);
    } catch (e) { res = null; }
    if (!res) {
      // Мягкий фолбэк: не блокируем игрока, ставим нейтрально.
      res = { a: 5, l: 5, praise: 'Ход сделан — уже хорошо.', tip: 'Связь с Фреди подвисла. Попробуй в следующем раунде замахнуться выше и найти путь ещё дешевле.', lever: '' };
    }
    var rec = { dom: ST.cur.dom, timid: ST.cur.timid, ambitious: ST.ambitious, a: res.a, l: res.l, quad: quadOf(res.a, res.l), tyaga: Math.round(res.a * res.l / 10) };
    ST.results.push(rec);
    // статистика
    var s = loadStats(); s.plays = (s.plays || 0) + 1; if (rec.tyaga > (s.bestTyaga || 0)) s.bestTyaga = rec.tyaga; s.quad = s.quad || {}; s.quad[rec.quad] = (s.quad[rec.quad] || 0) + 1; s.lastAvg = (s.lastAvg || []).concat(rec.tyaga).slice(-30); saveStats(s);
    track('game_round', { game: 'lgenij', round: ST.idx + 1, ambition: res.a, lazy: res.l, quad: rec.quad });
    renderResult(res, rec);
  }

  function dial(label, val, color) {
    return '<div class="lg-dial"><div class="l"><span>' + label + '</span><b style="color:' + color + '">' + val + '/10</b></div>' +
      '<div class="lg-bar"><i style="width:' + (val * 10) + '%;background:' + color + '"></i></div></div>';
  }
  function renderResult(res, rec) {
    ST.stage = 'result';
    var c = container(); if (!c) return;
    var q = QUAD[rec.quad];
    var last = ST.idx === ROUNDS - 1;
    var blitzDue = !ST.blitzDone && ST.idx === 1; // после 2-го раунда — блиц на припоминание
    c.innerHTML =
      '<div class="lg-wrap">' + roundHead('Оценка Фреди') +
        '<div style="text-align:center;margin:6px 0 14px"><div style="color:#8b93a7;font-size:.82rem">Тяга двигателя</div><div class="lg-tyaga">' + rec.tyaga + '<span style="font-size:1.1rem;color:#8b93a7">/10</span></div></div>' +
        '<div class="lg-dials">' + dial('📈 Амбиция', res.a, '#5b9bff') + dial('🔧 Лень-эффективность', res.l, '#34d399') + '</div>' +
        '<div style="text-align:center"><span class="lg-quad" style="background:' + q.color + '22;color:' + q.color + '">' + q.em + ' ' + q.name + '</span><div class="lg-hint" style="margin-top:2px">' + q.hint + '</div></div>' +
        (res.praise ? '<div class="lg-card" style="margin-top:14px"><div class="lg-ch">Что удалось</div><div class="lg-fb">' + nl2br(res.praise) + '</div></div>' : '') +
        (res.tip ? '<div class="lg-card"><div class="lg-ch">Куда сильнее</div><div class="lg-fb">' + nl2br(res.tip) + '</div></div>' : '') +
        (res.lever ? '<div class="lg-card" style="border-color:rgba(52,211,153,.3)"><div class="lg-ch">🔧 Ещё более ленивый ход</div><div class="lg-fb">' + nl2br(res.lever) + '</div></div>' : '') +
        '<button class="lg-primary" onclick="LGENIJ.after(' + (blitzDue ? 'true' : 'false') + ')">' + (last ? 'Итоговая карта →' : (blitzDue ? 'Дальше →' : 'Следующий раунд →')) + '</button>' +
      '</div>';
  }

  function after(blitzDue) {
    if (blitzDue && !ST.blitzDone) { renderBlitz(); return; }
    advance();
  }
  function advance() {
    if (ST.idx >= ROUNDS - 1) { finish(); return; }
    ST.idx++; nextRound();
  }

  // ===== Блиц на припоминание (retrieval practice) =====
  function renderBlitz() {
    ST.stage = 'blitz';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' +
        '<div class="lg-top"><span>🧠 Блиц</span><button class="lg-x" onclick="LGENIJ.skipBlitz()">Пропустить</button></div>' +
        '<h1 class="lg-h1" style="font-size:1.24rem">Вспомни рычаги по памяти</h1>' +
        '<p class="lg-sub">Не подсматривая: какие вопросы задаёт «ленивый гений», когда ищет дешёвый путь? Впиши, что помнишь — это закрепляет метод прочнее любого списка.</p>' +
        '<textarea class="lg-ta" id="lgBlitz" style="min-height:110px" placeholder="Например: что уже делает это за меня; какой ресурс под ногами…"></textarea>' +
        '<button class="lg-primary" onclick="LGENIJ.checkBlitz()">Показать эталон →</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('lgBlitz'); if (el) el.focus(); }, 60);
  }
  function checkBlitz() {
    ST.blitzDone = true;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' +
        '<h1 class="lg-h1" style="font-size:1.24rem">🔧 Четыре рычага (ИКР)</h1>' +
        '<p class="lg-sub">Сверь с тем, что вспомнил. Именно эти вопросы стоит гонять в реальной жизни:</p>' +
        LEVERS.map(function (q) { return '<div class="lg-card" style="padding:12px 14px"><div class="lg-fb">🔧 ' + esc(q) + '</div></div>'; }).join('') +
        '<button class="lg-primary" onclick="LGENIJ.skipBlitz()">Дальше →</button>' +
      '</div>';
    track('game_blitz', { game: 'lgenij' });
  }
  function skipBlitz() { ST.blitzDone = true; advance(); }

  // ===== Итоговая карта =====
  function finish() {
    ST.stage = 'finish';
    var c = container(); if (!c) return;
    var rs = ST.results;
    var n = rs.length || 1;
    var avgA = Math.round(rs.reduce(function (x, r) { return x + r.a; }, 0) / n);
    var avgL = Math.round(rs.reduce(function (x, r) { return x + r.l; }, 0) / n);
    var avgT = Math.round(rs.reduce(function (x, r) { return x + r.tyaga; }, 0) / n);
    var domQuad = quadOf(avgA, avgL);
    // перекос: какая сторона слабее
    var bias;
    if (avgA >= 6 && avgL >= 6) bias = 'Ты держишь обе стороны — редкое сочетание. Так и работает двигатель: высокая цель на дешёвом ходу.';
    else if (avgA < avgL) bias = 'Твой перекос — <b>заниженная планка</b>. Пути ты находишь дешёвые, но метишь скромно. Дриль: к каждой цели дня спрашивай «а если в 10 раз крупнее?».';
    else if (avgL < avgA) bias = 'Твой перекос — <b>путь силой</b>. Целишь высоко, но берёшь надрывом. Дриль: перед делом спрашивай «что уже почти делает это за меня?».';
    else bias = 'Обе стороны примерно вровень и есть куда расти. Дриль: в один день качай планку, в другой — дешевизну пути.';
    // грид квадрантов с подсветкой доминирующего
    function qc(k) { return '<div class="lg-qc' + (k === domQuad ? ' hi' : '') + '">' + QUAD[k].em + ' ' + QUAD[k].name + '</div>'; }
    var grid = '<div class="lg-grid">' + qc('geroj') + qc('genij') + qc('plankton') + qc('hitrec') + '</div>';
    var listHtml = rs.map(function (r, i) {
      return '<div class="lg-li" style="color:#cdd4e2;font-size:.92rem">' + (i + 1) + '. ' + esc(r.dom) + ' · ' + QUAD[r.quad].em + ' тяга ' + r.tyaga + '/10 — «' + esc(r.ambitious.slice(0, 60)) + (r.ambitious.length > 60 ? '…' : '') + '»</div>';
    }).join('');
    c.innerHTML =
      '<div class="lg-wrap">' +
        '<div class="lg-top"><span>🧲 Ленивый гений</span><button class="lg-x" onclick="(window.showKonturScreen||function(){})()">К играм</button></div>' +
        '<h1 class="lg-h1">Твоя карта двигателя</h1>' +
        '<div style="text-align:center;margin:4px 0 14px"><div style="color:#8b93a7;font-size:.82rem">Средняя тяга за сессию</div><div class="lg-tyaga">' + avgT + '<span style="font-size:1.1rem;color:#8b93a7">/10</span></div></div>' +
        '<div class="lg-dials">' + dial('📈 Амбиция', avgA, '#5b9bff') + dial('🔧 Лень-эффективность', avgL, '#34d399') + '</div>' +
        grid +
        '<div class="lg-card"><div class="lg-ch">Твой перекос и дриль</div><div class="lg-fb">' + bias + '</div></div>' +
        '<div class="lg-card"><div class="lg-ch">Взять в жизнь</div><div class="lg-fb">Раз в день лови любую свою «надо бы» и прогоняй её через два хода: <b>подними планку</b> («а если крупнее?») и <b>найди рычаг</b> («что сделает это почти само?»). Навык растёт от повторов — возвращайся через день-два.</div></div>' +
        (listHtml ? '<div class="lg-card"><div class="lg-ch">Раунды</div>' + listHtml + '</div>' : '') +
        '<div class="lg-row"><button class="lg-primary" onclick="LGENIJ.start()" style="margin-top:0">🔁 Ещё сессия</button><button class="lg-secondary" onclick="(window.showKonturScreen||function(){})()" style="margin-top:0">К играм</button></div>' +
      '</div>';
    track('game_finish', { game: 'lgenij', avg_tyaga: avgT, avg_ambition: avgA, avg_lazy: avgL, quad: domQuad });
  }

  function toggleHelp() {
    var b = document.getElementById('lgHelpBody'), car = document.getElementById('lgHelpCar');
    if (!b) return;
    var open = b.style.display !== 'none';
    b.style.display = open ? 'none' : '';
    if (car) car.textContent = open ? '▾' : '▴';
  }

  function quit() {
    if (ST.results.length && !confirm('Выйти из сессии? Прогресс раунда не сохранится.')) return;
    if (window.showKonturScreen) window.showKonturScreen();
  }

  window.LGENIJ = {
    home: home, start: start, submitPlanka: submitPlanka, submitRychag: submitRychag,
    submitPrimanka: submitPrimanka, after: after, checkBlitz: checkBlitz, skipBlitz: skipBlitz,
    toggleHelp: toggleHelp, quit: quit, getState: function () { return ST; }
  };
  window.showLgenijGame = home;
})();
