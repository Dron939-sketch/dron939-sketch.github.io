// ============================================================
// lgenij.js — игра «Ленивый гений» (v2: путь из 9 уровней)
// Тренажёр двигателя: ставить дерзкие (амбициозные) цели и
// находить к ним самый дешёвый путь (лень как инженер, ИКР из ТРИЗ).
// Наука навыка: сначала распознавание (клики, мгновенная обратная
// связь), затем генерация под соревнование (дуэли с Фреди),
// затем перенос в свою жизнь (своя цель, микрообязательство,
// чек-ин при возврате — spacing). Блиц-припоминание рычагов.
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
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 320, temperature: opts.temperature == null ? 0.5 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  var SITE = 'https://meysternlp.ru';
  var COURSE_URL = SITE + '/blog/lektorij/dvigatel-len-ambicii/';
  var LEC = {
    ambiciya: { t: 'Амбиция — это вектор, а не «больше»', u: SITE + '/blog/lekciya-dvigatel-3-ambiciya-vektor.html' },
    len:      { t: 'Обмануть лень: дешёвый вход и рычаги', u: SITE + '/blog/lekciya-dvigatel-8-obmanut-len.html' },
    budushee: { t: 'Взгляд изобретателя: будущее как приманка', u: SITE + '/blog/lekciya-dvigatel-6-vzglyad-izobretatelya.html' }
  };

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

  // ===== Банк целей для дуэлей: робкая → эталонные ходы Фреди =====
  var BANK = [
    { dom: 'Навык', timid: 'подтянуть английский',
      bold: 'свободно говорить с иностранцами на любимую тему уже через год',
      path: 'смотреть любимые сериалы в оригинале с субтитрами и болтать с ИИ по 5 минут в день — интерес тянет сам' },
    { dom: 'Тело', timid: 'иногда делать зарядку',
      bold: 'к лету стать выносливым — легко пробегать пять километров и не задыхаться на лестнице',
      path: 'класть форму с вечера у кровати и бегать с другом по утрам — вам неудобно подводить друг друга' },
    { dom: 'Деньги', timid: 'немного отложить на чёрный день',
      bold: 'за год собрать подушку на полгода спокойной жизни',
      path: 'настроить автосписание десяти процентов в день зарплаты — деньги копятся сами, до того как я их увижу' },
    { dom: 'Карьера', timid: 'может, попросить прибавку',
      bold: 'за полгода вырасти в доходе в полтора раза — на новой роли или в новом месте',
      path: 'собрать список своих результатов и разослать резюме на три вакансии мечты — рынок сам покажет мою цену' },
    { dom: 'Творчество', timid: 'когда-нибудь начать блог',
      bold: 'за три месяца набрать первую тысячу читателей на том, что искренне люблю',
      path: 'раз в день записывать одну мысль голосом по дороге и постить как есть — без монтажа и перфекционизма' },
    { dom: 'Отношения', timid: 'почаще видеться с друзьями',
      bold: 'собрать вокруг себя живой круг, где встречаются каждую неделю и тянут друг друга вверх',
      path: 'завести регулярный день — «четверг, у меня, кто может» — один раз договориться, дальше идёт само' },
    { dom: 'Навык', timid: 'научиться готовить пару блюд',
      bold: 'готовить так, что гости просят рецепт, а будни перестают быть про «что бы съесть»',
      path: 'освоить пять базовых техник по коротким видео и повторять любимое, пока не выйдет на автомате' },
    { dom: 'Тело', timid: 'поменьше сидеть в телефоне вечером',
      bold: 'вернуть себе вечера — два часа на живое, а не на ленту',
      path: 'ставить телефон заряжаться в другой комнате в девять вечера — убрал трение, и рука не тянется' },
    { dom: 'Карьера', timid: 'разобраться в новой программе на работе',
      bold: 'стать тем, к кому в отделе идут за помощью по этой программе',
      path: 'разбирать по одной реальной рабочей задаче в ней каждый день — учусь на том, что и так надо сделать' },
    { dom: 'Деньги', timid: 'найти подработку на выходных',
      bold: 'собрать второй поток дохода, который за полгода дорастёт до половины зарплаты',
      path: 'продать то, что уже умею, первым трём знакомым — сарафан запустит остальное' },
    { dom: 'Творчество', timid: 'снять один ролик для себя',
      bold: 'за месяц выпустить серию роликов, которую не стыдно показать и которая находит своих',
      path: 'снимать на телефон одним дублем то, что и так делаю, и выкладывать без вылизывания' },
    { dom: 'Быт', timid: 'навести порядок в квартире',
      bold: 'превратить дом в место, куда кайфово возвращаться — где каждый угол работает на меня',
      path: 'разбирать по одной зоне в день, таймер на пятнадцать минут, лишнее сразу в коробку «отдать»' },
    { dom: 'Отношения', timid: 'познакомиться с новыми людьми',
      bold: 'за сезон завести пять новых знакомств, из которых вырастут настоящие связи',
      path: 'ходить туда, где люди с моим интересом — там знакомство идёт само, вокруг общего дела' },
    { dom: 'Навык', timid: 'почитать что-то по своей теме',
      bold: 'за год стать в своей теме человеком, к которому идут за мнением',
      path: 'слушать аудиокниги и подкасты по теме в дороге — время, которое и так есть, работает на меня' }
  ];

  // ===== Уровень 1: «Отличи амбицию» — пары (клик) =====
  var PAIRS = [
    { timid: 'подтянуть английский',
      good: 'через год свободно говорить с иностранцами о любимом деле',
      bad: 'выучить английский в совершенстве',
      why: '«В совершенстве» — это «больше» без вектора и срока: некуда попадать. Амбиция — конкретный образ плюс срок, от которого ёкает.' },
    { timid: 'немного отложить на чёрный день',
      good: 'за год собрать подушку на полгода спокойной жизни',
      bad: 'стать долларовым миллионером',
      why: 'Миллионер — красивый бред без опоры: из сегодняшнего дня к нему нет моста. Дерзко — это высоко, но со ступенькой, на которую можно поставить ногу.' },
    { timid: 'иногда делать зарядку',
      good: 'весной пробежать полумарафон и кайфануть на финише',
      bad: 'бегать каждый день по десять километров, без отговорок',
      why: '«Каждый день без отговорок» — не цель, а наказание: план надрыва. Амбиция — про желанный результат, а не про объём страданий.' },
    { timid: 'может, попросить прибавку',
      good: 'за полгода вырасти в доходе в полтора раза — здесь или на новом месте',
      bad: 'чтобы начальник наконец оценил меня по заслугам',
      why: '«Чтобы начальник оценил» — цель в чужих руках. Настоящая амбиция управляется тобой: рынок шире одного кабинета.' },
    { timid: 'когда-нибудь завести блог',
      good: 'за три месяца — первая тысяча читателей на том, что искренне люблю',
      bad: 'стать известным блогером',
      why: '«Известным» — размыто: ни числа, ни срока, ни своего «зачем». Цель-вектор проверяется: тысяча за три месяца — сразу видно, попал или нет.' },
    { timid: 'навести порядок в квартире',
      good: 'за месяц превратить дом в место, куда кайфово возвращаться',
      bad: 'поддерживать идеальную чистоту всегда',
      why: '«Всегда идеально» — вечная повинность без финиша. У амбиции есть финишная лента, за которой новая жизнь, а не бесконечная уборка.' },
    { timid: 'познакомиться с новыми людьми',
      good: 'за сезон — пять знакомств, из которых вырастут настоящие связи',
      bad: 'нравиться всем, с кем общаюсь',
      why: '«Нравиться всем» — не цель, а тревога, и она недостижима по построению. Дерзкая цель считается и заканчивается.' }
  ];

  // ===== Уровень 2: «Найди ленивый рычаг» — 4 варианта (клик) =====
  // k: ok — гениально-ленивый; force — надрыв; low — имитация; wild — бред/дорого
  var LEVERQ = [
    { goal: 'через год свободно говорить по-английски о любимом деле',
      opts: [
        { t: 'смотреть любимые сериалы в оригинале и пять минут в день болтать с ИИ', k: 'ok' },
        { t: 'после работы заниматься по учебнику по три часа', k: 'force' },
        { t: 'купить самоучитель и положить на видное место', k: 'low' },
        { t: 'переехать на год в Лондон', k: 'wild' }
      ],
      why: 'Сериалы и пять минут с ИИ — интерес тянет сам, а вход такой маленький, что лень его пропускает. Три часа после работы — надрыв, самоучитель на полке — имитация, Лондон — дорого и не под рукой.' },
    { goal: 'за год собрать подушку на полгода жизни',
      opts: [
        { t: 'автосписание десяти процентов в день зарплаты — деньги уходят до того, как я их увидел', k: 'ok' },
        { t: 'записывать каждый расход и урезать всё подряд', k: 'force' },
        { t: 'откладывать то, что останется в конце месяца', k: 'low' },
        { t: 'разогнать депозит на бирже с плечом', k: 'wild' }
      ],
      why: 'Автосписание — система, которая работает сама, без ежедневной воли. Учёт всех расходов — война с собой, «что останется» — не остаётся никогда, плечо — казино, а не путь.' },
    { goal: 'весной пробежать полумарафон',
      opts: [
        { t: 'бегать с другом по утрам — подводить друг друга неудобно', k: 'ok' },
        { t: 'с понедельника — по десять километров ежедневно на силе воли', k: 'force' },
        { t: 'купить крутые кроссовки для мотивации', k: 'low' },
        { t: 'нанять тренера олимпийской сборной', k: 'wild' }
      ],
      why: 'Друг — чужая инерция: тебя тянет обязательство, а не воля. Ежедневная десятка убьёт колени и желание, кроссовки — покупка вместо действия, тренер сборной — дорого и лишнее.' },
    { goal: 'стать тем, к кому в отделе идут за помощью по новой программе',
      opts: [
        { t: 'разбирать в ней по одной реальной рабочей задаче в день', k: 'ok' },
        { t: 'пройти три онлайн-курса подряд по вечерам', k: 'force' },
        { t: 'полистать статью на выходных', k: 'low' },
        { t: 'написать свою программу, только лучше', k: 'wild' }
      ],
      why: 'Реальная задача — ресурс под ногами: учишься на том, что и так надо сделать. Три курса — надрыв «про запас», статья — капля, своя программа — год жизни мимо цели.' },
    { goal: 'за три месяца — тысяча читателей на любимой теме',
      opts: [
        { t: 'записывать одну мысль голосом по дороге и постить как есть', k: 'ok' },
        { t: 'монтировать по ночам идеальные ролики', k: 'force' },
        { t: 'сначала сделать красивый логотип и шапку', k: 'low' },
        { t: 'закупить рекламу на все сбережения', k: 'wild' }
      ],
      why: 'Мысль по дороге — время, которое и так есть, плюс вход в две минуты. Идеальный монтаж — перфекционизм-надрыв, логотип — подготовка вместо дела, реклама на всё — ставка, а не система.' },
    { goal: 'собрать живой круг — встречи каждую неделю',
      opts: [
        { t: 'один раз договориться: «четверг, у меня, кто может» — дальше идёт само', k: 'ok' },
        { t: 'каждый раз всех обзванивать и уговаривать', k: 'force' },
        { t: 'лайкать посты друзей, чтобы не терять связь', k: 'low' },
        { t: 'снять лофт и закатывать вечеринки на пятьдесят человек', k: 'wild' }
      ],
      why: 'Одно правило «четверг у меня» — система вместо ста уговоров. Обзвон — вечный двигатель на твоей воле, лайки — иллюзия связи, лофт — дорогой фейерверк раз в год.' }
  ];
  var KLABEL = { force: '😤 Это надрыв — путь силой, воля кончится раньше цели.', low: '😴 Это имитация — движение есть, продвижения нет.', wild: '🤪 Это красивый бред — дорого, рискованно или не под рукой.' };

  // ===== Уровень 3: «Слабое звено» — найти слабую часть двигателя =====
  var WEAK = [
    { timid: 'выучить язык',
      planka: 'за год выучить пятьдесят новых слов',
      put: 'пять минут в день в приложении по дороге',
      obraz: 'человек, который свободно смотрит мир',
      weak: 'planka',
      why: 'Путь дешёвый и образ живой, но планка — пятьдесят слов за год — шаг на месте: до «свободно смотреть мир» она не дотягивается.' },
    { timid: 'привести тело в форму',
      planka: 'к лету — лёгкие пять километров и лестница без одышки',
      put: 'каждый день по два часа зала на силе воли',
      obraz: 'человек, для которого движение — часть дня',
      weak: 'put',
      why: 'Планка дерзкая и образ свой, но путь — чистый надрыв: воля кончится раньше июня. Нужен рычаг — друг, привычка, крошечный вход.' },
    { timid: 'вырасти в карьере',
      planka: 'за полгода — в полтора раза в доходе',
      put: 'собрать результаты и разослать резюме на три вакансии мечты',
      obraz: 'человек, которым наконец будет гордиться мама',
      weak: 'obraz',
      why: 'Планка и путь рабочие, а образ — чужой: гордость мамы не твоя жизнь. Приманка тянет, только когда она про тебя.' },
    { timid: 'начать своё дело',
      planka: 'за полгода — первые десять платящих клиентов',
      put: 'займусь, когда появится свободное время',
      obraz: 'человек, чей доход не зависит от одного работодателя',
      weak: 'put',
      why: '«Когда появится время» — не путь, а откладывание: у пути должен быть вход, который можно сделать сегодня за две минуты.' },
    { timid: 'разобраться с собой',
      planka: 'перестать быть неудачником',
      put: 'раз в неделю час с дневником по вопросам из лекций',
      obraz: 'человек, который понимает свои реакции',
      weak: 'planka',
      why: '«Перестать быть…» — цель от негатива: бежишь ОТ, а не К. Вектор строится к желаемному образу — иначе двигатель тянет назад.' }
  ];
  var PARTLBL = { planka: '📈 Планка', put: '🔧 Путь', obraz: '🧲 Образ себя' };

  // ===== Карта уровней =====
  var LEVELS = [
    { n: 1, em: '👁', t: 'Отличи амбицию', d: 'Клики: где настоящая дерзкая цель, а где пустышка', act: 1 },
    { n: 2, em: '🔧', t: 'Найди ленивый рычаг', d: 'Клики: какой путь гениально-ленивый, а какой — надрыв', act: 1 },
    { n: 3, em: '🔩', t: 'Слабое звено', d: 'Разбор чужих двигателей: что именно не тянет', act: 1 },
    { n: 4, em: '⚔️', t: 'Дуэль: планка', d: 'Ты поднимаешь планку — Фреди отвечает своим ходом', act: 2 },
    { n: 5, em: '⚔️', t: 'Дуэль: рычаг', d: 'Кто найдёт путь дешевле — ты или Фреди', act: 2 },
    { n: 6, em: '⚔️', t: 'Дуэль: полный ход', d: 'Планка + путь против Фреди', act: 2 },
    { n: 7, em: '🎯', t: 'Своя цель', d: 'Полный ход на своей реальной цели, оценка тяги', act: 3 },
    { n: 8, em: '📅', t: 'Первый ход', d: 'Микрообязательство на 2 минуты + чек-ин при возврате', act: 3 },
    { n: 9, em: '🏆', t: 'Экзамен', d: 'Микс всего + звание «Ленивый гений»', act: 3 }
  ];
  var ACTS = { 1: 'Акт I · Глаз гения', 2: 'Акт II · Дуэли с Фреди', 3: 'Акт III · Своя жизнь' };

  // ===== Прогресс =====
  function loadProg() {
    try { var p = JSON.parse(localStorage.getItem('lgenij_path') || 'null'); if (p && typeof p === 'object') return p; } catch (e) {}
    return { done: {}, wins: 0, duels: 0, intro: false, blitz: false, ownGoal: null, commit: null, title: '' };
  }
  function saveProg(p) { try { localStorage.setItem('lgenij_path', JSON.stringify(p)); } catch (e) {} }
  function maxUnlocked(p) {
    var m = 1;
    for (var i = 1; i <= 9; i++) { if (p.done[i]) m = i + 1; else break; }
    return Math.min(m, 9);
  }

  // ===== Состояние сессии =====
  var ST = { screen: 'home', lvl: 0, ti: 0, tasks: [], score: 0, wins: 0, answered: false, own: {}, exam: null, busy: false };

  // ===== Стили =====
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
      '.lg-timid{font-size:1.14rem;font-weight:700;color:#fff;line-height:1.4}',
      '.lg-echo{background:rgba(52,211,153,.10);border:1px solid rgba(52,211,153,.28);border-radius:12px;padding:11px 13px;margin:0 0 12px;color:#d1fae5;font-size:.96rem}',
      '.lg-lever{margin:8px 0;padding-left:24px;position:relative;color:#cdd4e2;font-size:.95rem}',
      '.lg-lever::before{content:"🔧";position:absolute;left:0;top:0}',
      '.lg-ta{width:100%;box-sizing:border-box;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;font:15px/1.5 inherit;padding:12px 13px;resize:vertical;min-height:70px}',
      '.lg-ta:focus{outline:none;border-color:#3a86ff}',
      '.lg-in{width:100%;box-sizing:border-box;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;font:15px/1.5 inherit;padding:11px 13px}',
      '.lg-in:focus{outline:none;border-color:#3a86ff}',
      '.lg-hint{color:#8b93a7;font-size:.85rem;margin:6px 2px 0}',
      '.lg-choice{display:block;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);border-radius:13px;padding:13px 15px;margin:0 0 10px;color:#e7eaf0;font:inherit;font-size:.96rem;line-height:1.5;cursor:pointer;transition:.15s}',
      '.lg-choice:hover{border-color:rgba(58,134,255,.6)}',
      '.lg-choice:disabled{cursor:default;opacity:1}',
      '.lg-choice.ok{border-color:#34d399;background:rgba(52,211,153,.13)}',
      '.lg-choice.no{border-color:#f87171;background:rgba(248,113,113,.10);opacity:.85}',
      '.lg-choice.dim{opacity:.45}',
      '.lg-why{background:rgba(58,134,255,.08);border:1px solid rgba(58,134,255,.24);border-radius:12px;padding:12px 14px;margin:2px 0 12px;font-size:.92rem;color:#dbe4f5;line-height:1.55}',
      '.lg-prog{display:flex;gap:5px;margin-bottom:14px}',
      '.lg-prog i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.14)}',
      '.lg-prog i.on{background:#3a86ff}',
      '.lg-prog i.hit{background:#34d399}',
      '.lg-prog i.miss{background:#f87171}',
      '.lg-node{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px 14px;margin:0 0 8px;color:#e7eaf0;font:inherit;cursor:pointer;transition:.15s}',
      '.lg-node:hover{border-color:rgba(58,134,255,.55)}',
      '.lg-node.lock{opacity:.45;cursor:default}',
      '.lg-node.lock:hover{border-color:rgba(255,255,255,.12)}',
      '.lg-node .nem{font-size:1.3rem;width:34px;text-align:center;flex-shrink:0}',
      '.lg-node .nt{font-weight:700;color:#fff;font-size:.97rem}',
      '.lg-node .nd{color:#8b93a7;font-size:.8rem;line-height:1.35}',
      '.lg-node .nst{margin-left:auto;flex-shrink:0;font-size:.95rem}',
      '.lg-node.next{border-color:rgba(58,134,255,.55);background:rgba(58,134,255,.08)}',
      '.lg-act{color:#8b93a7;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;margin:14px 2px 8px;font-weight:700}',
      '.lg-vs{display:grid;grid-template-columns:1fr;gap:10px;margin:0 0 12px}',
      '.lg-vs .you{border:1px solid rgba(58,134,255,.4);background:rgba(58,134,255,.08);border-radius:13px;padding:12px 14px}',
      '.lg-vs .fre{border:1px solid rgba(52,211,153,.4);background:rgba(52,211,153,.07);border-radius:13px;padding:12px 14px}',
      '.lg-vs .who{font-size:.76rem;letter-spacing:.05em;text-transform:uppercase;color:#8b93a7;margin-bottom:5px;font-weight:700}',
      '.lg-pill{display:inline-block;padding:6px 14px;border-radius:999px;font-weight:800;font-size:1.05rem}',
      '.lg-pill.w{background:rgba(52,211,153,.16);color:#6ee7b7}',
      '.lg-pill.l{background:rgba(248,113,113,.14);color:#fca5a5}',
      '.lg-duelscore{display:flex;justify-content:center;gap:14px;align-items:center;margin:2px 0 12px;color:#8b93a7;font-size:.9rem}',
      '.lg-duelscore b{font-size:1.5rem;color:#fff}',
      '.lg-help{background:rgba(58,134,255,.08);border:1px solid rgba(58,134,255,.24);border-radius:12px;margin:0 0 12px;overflow:hidden}',
      '.lg-help-h{width:100%;display:flex;justify-content:space-between;align-items:center;background:none;border:none;color:#9cc0ff;font:600 .9rem inherit;cursor:pointer;padding:11px 13px}',
      '.lg-help-b{padding:0 13px 12px}',
      '.lg-help-ex{background:rgba(0,0,0,.2);border-radius:9px;padding:9px 11px;font-size:.92rem;line-height:1.5;color:#dbe4f5;margin-bottom:8px}',
      '.lg-help-how{font-size:.86rem;color:#aab2c4;line-height:1.5}',
      '.lg-help-lec{display:inline-block;margin-top:9px;font-size:.85rem;color:#9cc0ff;text-decoration:none;border-bottom:1px solid rgba(156,192,255,.35)}',
      '.lg-course{display:block;text-align:center;margin:12px 0 0;padding:11px;font-size:.9rem;color:#9cc0ff;text-decoration:none;background:rgba(58,134,255,.08);border:1px solid rgba(58,134,255,.22);border-radius:12px}',
      '.lg-primary{width:100%;margin-top:14px;padding:14px 16px;border:none;border-radius:12px;background:linear-gradient(135deg,#3a86ff,#5b9bff);color:#fff;font:700 1rem inherit;cursor:pointer}',
      '.lg-primary:disabled{opacity:.5;cursor:default}',
      '.lg-secondary{width:100%;margin-top:10px;padding:12px 16px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:transparent;color:#cdd4e2;font:600 .95rem inherit;cursor:pointer}',
      '.lg-dials{display:flex;gap:12px;margin:6px 0 14px}',
      '.lg-dial{flex:1}',
      '.lg-dial .l{font-size:.82rem;color:#aab2c4;margin-bottom:5px;display:flex;justify-content:space-between}',
      '.lg-bar{height:12px;border-radius:7px;background:rgba(255,255,255,.12);overflow:hidden}',
      '.lg-bar i{display:block;height:100%;border-radius:7px}',
      '.lg-quad{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:1.15rem;padding:8px 14px;border-radius:12px;margin:2px 0 4px}',
      '.lg-tyaga{font-size:2.6rem;font-weight:800;letter-spacing:-.03em;line-height:1;color:#fff}',
      '.lg-fb{color:#d7def0;line-height:1.6}',
      '.lg-row{display:flex;gap:10px;margin-top:14px}',
      '.lg-row>*{flex:1;margin-top:0}',
      '.lg-demo{margin:10px 0}',
      '.lg-demo-l{display:block;font-size:.75rem;color:#8b93a7;margin-bottom:2px}',
      '.lg-demo-v{font-size:.98rem;color:#fff;line-height:1.4}',
      '.lg-spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:lgspin .7s linear infinite;vertical-align:-3px;margin-right:6px}',
      '@keyframes lgspin{to{transform:rotate(360deg)}}',
      '[data-theme="light"] .lg-wrap{color:#1d1d1f}',
      '[data-theme="light"] .lg-card,[data-theme="light"] .lg-node,[data-theme="light"] .lg-choice{background:#fff;border-color:rgba(0,0,0,.12);color:#1d1d1f}',
      '[data-theme="light"] .lg-card b,[data-theme="light"] .lg-ch,[data-theme="light"] .lg-timid,[data-theme="light"] .lg-tyaga,[data-theme="light"] .lg-node .nt,[data-theme="light"] .lg-demo-v,[data-theme="light"] .lg-duelscore b{color:#0b1220}',
      '[data-theme="light"] .lg-sub,[data-theme="light"] .lg-hint,[data-theme="light"] .lg-top,[data-theme="light"] .lg-node .nd{color:#5a6472}',
      '[data-theme="light"] .lg-ta,[data-theme="light"] .lg-in{background:#f5f7fa;color:#0b1220;border-color:rgba(0,0,0,.15)}',
      '[data-theme="light"] .lg-fb{color:#333}',
      '[data-theme="light"] .lg-why{background:#eef3fb;color:#26324a;border-color:rgba(58,134,255,.3)}',
      '[data-theme="light"] .lg-help{background:rgba(58,134,255,.07);border-color:rgba(58,134,255,.28)}',
      '[data-theme="light"] .lg-help-h,[data-theme="light"] .lg-help-lec,[data-theme="light"] .lg-course{color:#2e6fe0}',
      '[data-theme="light"] .lg-help-ex{background:#eef3fb;color:#26324a}',
      '[data-theme="light"] .lg-help-how{color:#5a6472}',
      '[data-theme="light"] .lg-choice.ok{border-color:#10b981;background:rgba(16,185,129,.1)}',
      '[data-theme="light"] .lg-choice.no{border-color:#ef4444;background:rgba(239,68,68,.07)}',
      '@media(max-width:560px){.lg-wrap{padding:14px 12px 96px}.lg-h1{font-size:1.32rem}.lg-timid{font-size:1.05rem}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ===== Главный экран: карта пути =====
  function home() {
    injectCSS();
    ST.screen = 'home';
    var c = container(); if (!c) return;
    var p = loadProg();
    var unlocked = maxUnlocked(p);
    var doneCount = Object.keys(p.done).length;
    // чек-ин по обязательству (spacing: возврат к своему ходу)
    var checkin = '';
    if (p.commit && !p.commit.done && (Date.now() - (p.commit.ts || 0)) > 8 * 3600 * 1000) {
      checkin =
        '<div class="lg-card" style="border-color:rgba(251,191,36,.45)">' +
          '<div class="lg-ch">📅 Чек-ин: твой первый ход</div>' +
          '<div class="lg-fb">Ты обещал себе: <b>«' + esc(p.commit.move) + '»</b><br><span style="color:#8b93a7;font-size:.88rem">к цели «' + esc(p.commit.goal) + '»</span></div>' +
          '<div class="lg-row"><button class="lg-primary" onclick="LGENIJ.checkin(true)">✅ Сделал</button><button class="lg-secondary" onclick="LGENIJ.checkin(false)">Пока нет</button></div>' +
        '</div>';
    }
    var nodes = '';
    var lastAct = 0;
    LEVELS.forEach(function (L) {
      if (L.act !== lastAct) { nodes += '<div class="lg-act">' + ACTS[L.act] + '</div>'; lastAct = L.act; }
      var done = !!p.done[L.n];
      var isNext = !done && L.n === unlocked;
      var locked = !done && L.n > unlocked;
      nodes += '<button class="lg-node' + (isNext ? ' next' : '') + (locked ? ' lock' : '') + '" onclick="' + (locked ? '' : 'LGENIJ.play(' + L.n + ')') + '">' +
        '<span class="nem">' + L.em + '</span>' +
        '<span><span class="nt">' + L.n + '. ' + esc(L.t) + '</span><br><span class="nd">' + esc(L.d) + '</span></span>' +
        '<span class="nst">' + (done ? '✅' : (isNext ? '▶' : '🔒')) + '</span>' +
      '</button>';
    });
    var titleLine = p.title ? '<div style="text-align:center;margin:0 0 10px"><span class="lg-quad" style="background:rgba(52,211,153,.13);color:#6ee7b7">' + esc(p.title) + '</span></div>' : '';
    c.innerHTML =
      '<div class="lg-wrap">' +
        '<div class="lg-top"><button class="lg-x" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button><span>🧲 бесплатно</span></div>' +
        '<h1 class="lg-h1">🧲 Ленивый гений</h1>' +
        '<p class="lg-sub">Двигатель гения = дерзкая цель × ленивый путь. Хотеть в 10 раз больше — делать в 10 раз меньше. Путь из 9 уровней: сначала научишься <b style="color:#e7eaf0">видеть</b> сильные ходы, потом <b style="color:#e7eaf0">обыграешь Фреди</b>, потом <b style="color:#e7eaf0">применишь к своей жизни</b>.</p>' +
        titleLine + checkin +
        (doneCount ? '<div class="lg-hint" style="margin:0 0 8px">Пройдено уровней: ' + doneCount + '/9' + (p.duels ? ' · дуэлей выиграно: ' + p.wins + '/' + p.duels : '') + '</div>' : '') +
        nodes +
        '<a class="lg-course" href="' + COURSE_URL + '" target="_blank" rel="noopener">🎓 Теория — курс «Двигатель: лень, амбиции и азарт поиска»</a>' +
      '</div>';
    track('game_open', { game: 'lgenij', unlocked: unlocked });
  }

  // Чек-ин обязательства
  function checkin(done) {
    var p = loadProg();
    if (!p.commit) { home(); return; }
    if (done) {
      p.commit.done = true; saveProg(p);
      toast('🚀 Первый ход сделан — двигатель завёлся!', 'success'); vibe(30);
      track('lg_checkin', { done: true });
      home();
    } else {
      track('lg_checkin', { done: false });
      var c = container(); if (!c) return;
      c.innerHTML =
        '<div class="lg-wrap">' +
          '<div class="lg-top"><span>📅 Чек-ин</span><button class="lg-x" onclick="LGENIJ.home()">✕</button></div>' +
          '<h1 class="lg-h1" style="font-size:1.24rem">Не сделал? Значит, ход был слишком дорогой</h1>' +
          '<p class="lg-sub">Это не слабость — это данные. Лень отфильтровала вход. Правило гения: <b>умень­шай ход, пока лень не пропустит</b>. Каким будет ход вдвое меньше?</p>' +
          '<div class="lg-echo">Было: «' + esc(p.commit.move) + '»</div>' +
          '<input class="lg-in" id="lgHalf" placeholder="Ход вдвое меньше — на 1 минуту…" autocomplete="off">' +
          '<button class="lg-primary" onclick="LGENIJ.saveHalf()">Беру этот ход</button>' +
        '</div>';
      setTimeout(function () { var el = document.getElementById('lgHalf'); if (el) el.focus(); }, 60);
    }
  }
  function saveHalf() {
    var v = ((document.getElementById('lgHalf') || {}).value || '').trim();
    if (!v) { toast('Впиши ход поменьше', 'error'); return; }
    var p = loadProg();
    if (p.commit) { p.commit.move = v; p.commit.ts = Date.now(); saveProg(p); }
    toast('Записал. Проверю при следующей встрече 😉', 'success');
    home();
  }

  // ===== Запуск уровня =====
  function play(n) {
    var p = loadProg();
    if (n > maxUnlocked(p)) { toast('Сначала пройди предыдущий уровень', 'info'); return; }
    if (!p.intro) { renderIntro(n); return; }
    startLevel(n);
  }
  function renderIntro(n) {
    ST.screen = 'intro';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' +
        '<div class="lg-top"><button class="lg-x" onclick="LGENIJ.home()">← Назад</button><span>🧲 как это работает</span></div>' +
        '<h1 class="lg-h1">Двигатель из двух деталей</h1>' +
        '<div class="lg-card">' +
          '<div class="lg-demo"><span class="lg-demo-l">Робкая цель, которую все себе ставят:</span><div class="lg-demo-v">😐 «иногда бегать»</div></div>' +
          '<div class="lg-demo"><span class="lg-demo-l">📈 Планка — метишь смелее:</span><div class="lg-demo-v" style="color:#8fd3ff">🚀 «весной пробежать полумарафон»</div></div>' +
          '<div class="lg-demo"><span class="lg-demo-l">🔧 Рычаг — путь, где выйдет почти само:</span><div class="lg-demo-v" style="color:#6ee7b7">«бегать с другом — подводить неудобно»</div></div>' +
          '<div style="margin-top:10px;color:#aab2c4;font-size:.9rem;line-height:1.5">Гений — не тот, кто пашет больше всех. Это тот, кто метит выше всех и находит путь дешевле всех. Этому и учимся — по уровням, от простого к своей жизни.</div>' +
        '</div>' +
        '<button class="lg-primary" onclick="LGENIJ.introDone(' + n + ')">Понял, поехали →</button>' +
      '</div>';
  }
  function introDone(n) {
    var p = loadProg(); p.intro = true; saveProg(p);
    startLevel(n);
  }
  function startLevel(n) {
    ST.lvl = n; ST.ti = 0; ST.score = 0; ST.wins = 0; ST.answered = false;
    track('lg_level_start', { level: n });
    if (n === 1) { ST.tasks = shuffle(PAIRS); renderPair(); }
    else if (n === 2) { ST.tasks = shuffle(LEVERQ); renderLeverQ(); }
    else if (n === 3) { ST.tasks = shuffle(WEAK); renderWeak(); }
    else if (n === 4 || n === 5 || n === 6) { ST.tasks = shuffle(BANK).slice(0, 3); renderDuel(); }
    else if (n === 7) { ST.own = {}; renderOwnPlanka(); }
    else if (n === 8) { renderCommit(); }
    else if (n === 9) { startExam(); }
  }

  function progBar(total, marks) {
    var h = '<div class="lg-prog">';
    for (var i = 0; i < total; i++) {
      var cls = '';
      if (i < marks.length) cls = marks[i] ? ' hit' : ' miss';
      else if (i === marks.length) cls = ' on';
      h += '<i class="' + cls + '"></i>';
    }
    return h + '</div>';
  }
  function lvlHead(sub) {
    var L = LEVELS[ST.lvl - 1];
    return '<div class="lg-top"><span>' + L.em + ' Уровень ' + L.n + ' · ' + esc(L.t) + '</span><button class="lg-x" onclick="LGENIJ.quitLevel()">✕ Выйти</button></div>' +
      (sub ? '<p class="lg-sub" style="margin-bottom:12px">' + sub + '</p>' : '');
  }
  function quitLevel() {
    if (ST.ti > 0 && !confirm('Выйти? Прогресс уровня не сохранится.')) return;
    home();
  }
  function lecLink(key) {
    var l = LEC[key];
    return '<a class="lg-help-lec" href="' + l.u + '" target="_blank" rel="noopener">📖 Лекция: ' + esc(l.t) + ' →</a>';
  }

  // ===== Уровень 1: пары =====
  function renderPair() {
    ST.screen = 'pair'; ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var opts = shuffle([{ t: t.good, ok: true }, { t: t.bad, ok: false }]);
    ST._opts = opts;
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('Робкую цель подняли двумя способами. Один — настоящая амбиция, второй — пустышка. Жми на настоящую.') +
        progBar(ST.tasks.length, ST._marks || []) +
        '<div class="lg-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:4px">Робкая цель</div><div class="lg-timid">«' + esc(t.timid) + '»</div></div>' +
        opts.map(function (o, i) { return '<button class="lg-choice" id="lgC' + i + '" onclick="LGENIJ.pickPair(' + i + ')">' + esc(o.t) + '</button>'; }).join('') +
        '<div id="lgWhy"></div>' +
      '</div>';
  }
  function pickPair(i) {
    if (ST.answered) return;
    ST.answered = true;
    var t = ST.tasks[ST.ti];
    var hit = !!ST._opts[i].ok;
    ST._marks = ST._marks || [];
    ST._marks.push(hit);
    if (hit) { ST.score++; vibe(20); } else { vibe([40, 60, 40]); }
    for (var j = 0; j < ST._opts.length; j++) {
      var b = document.getElementById('lgC' + j);
      if (!b) continue;
      b.disabled = true;
      if (ST._opts[j].ok) b.className = 'lg-choice ok';
      else b.className = 'lg-choice' + (j === i ? ' no' : ' dim');
    }
    var w = document.getElementById('lgWhy');
    if (w) w.innerHTML =
      '<div class="lg-why">' + (hit ? '✅ Точно. ' : '❌ Мимо. ') + esc(t.why) + '</div>' +
      '<button class="lg-primary" onclick="LGENIJ.nextTask()">' + (ST.ti + 1 < ST.tasks.length ? 'Дальше →' : 'Итог уровня →') + '</button>';
  }

  // ===== Уровень 2: рычаги =====
  function renderLeverQ() {
    ST.screen = 'leverq'; ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var opts = shuffle(t.opts);
    ST._opts = opts;
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('Цель дерзкая — уже хорошо. Найди гениально-ленивый путь: тот, где результат выходит почти сам, из того, что под рукой.') +
        progBar(ST.tasks.length, ST._marks || []) +
        '<div class="lg-echo">🎯 Цель: <b>' + esc(t.goal) + '</b></div>' +
        opts.map(function (o, i) { return '<button class="lg-choice" id="lgC' + i + '" onclick="LGENIJ.pickLever(' + i + ')">' + esc(o.t) + '</button>'; }).join('') +
        '<div id="lgWhy"></div>' +
      '</div>';
  }
  function pickLever(i) {
    if (ST.answered) return;
    ST.answered = true;
    var t = ST.tasks[ST.ti];
    var hit = ST._opts[i].k === 'ok';
    ST._marks = ST._marks || [];
    ST._marks.push(hit);
    if (hit) { ST.score++; vibe(20); } else { vibe([40, 60, 40]); }
    for (var j = 0; j < ST._opts.length; j++) {
      var b = document.getElementById('lgC' + j);
      if (!b) continue;
      b.disabled = true;
      if (ST._opts[j].k === 'ok') b.className = 'lg-choice ok';
      else b.className = 'lg-choice' + (j === i ? ' no' : ' dim');
    }
    var picked = ST._opts[i];
    var extra = hit ? '' : ('<br><b>' + esc(KLABEL[picked.k] || '') + '</b>');
    var w = document.getElementById('lgWhy');
    if (w) w.innerHTML =
      '<div class="lg-why">' + (hit ? '✅ Точно. ' : '❌ Мимо.' + extra + '<br>') + esc(t.why) + '</div>' +
      '<button class="lg-primary" onclick="LGENIJ.nextTask()">' + (ST.ti + 1 < ST.tasks.length ? 'Дальше →' : 'Итог уровня →') + '</button>';
  }

  // ===== Уровень 3: слабое звено =====
  function renderWeak() {
    ST.screen = 'weak'; ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var parts = [
      { key: 'planka', lbl: PARTLBL.planka, val: t.planka },
      { key: 'put', lbl: PARTLBL.put, val: t.put },
      { key: 'obraz', lbl: PARTLBL.obraz, val: t.obraz }
    ];
    ST._opts = parts;
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('Перед тобой чужой двигатель, собранный из трёх деталей. Одна — слабая, из-за неё всё не поедет. Жми на слабое звено.') +
        progBar(ST.tasks.length, ST._marks || []) +
        '<div class="lg-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:4px">Была робкая цель</div><div class="lg-timid">«' + esc(t.timid) + '»</div></div>' +
        parts.map(function (o, i) { return '<button class="lg-choice" id="lgC' + i + '" onclick="LGENIJ.pickWeak(' + i + ')"><b>' + o.lbl + ':</b> ' + esc(o.val) + '</button>'; }).join('') +
        '<div id="lgWhy"></div>' +
      '</div>';
  }
  function pickWeak(i) {
    if (ST.answered) return;
    ST.answered = true;
    var t = ST.tasks[ST.ti];
    var hit = ST._opts[i].key === t.weak;
    ST._marks = ST._marks || [];
    ST._marks.push(hit);
    if (hit) { ST.score++; vibe(20); } else { vibe([40, 60, 40]); }
    for (var j = 0; j < ST._opts.length; j++) {
      var b = document.getElementById('lgC' + j);
      if (!b) continue;
      b.disabled = true;
      if (ST._opts[j].key === t.weak) b.className = 'lg-choice no';
      else b.className = 'lg-choice dim';
    }
    var w = document.getElementById('lgWhy');
    if (w) w.innerHTML =
      '<div class="lg-why">' + (hit ? '✅ Точно, слабое звено — ' : '❌ Слабое звено здесь — ') + '<b>' + PARTLBL[t.weak] + '</b>. ' + esc(t.why) + '</div>' +
      '<button class="lg-primary" onclick="LGENIJ.nextTask()">' + (ST.ti + 1 < ST.tasks.length ? 'Дальше →' : 'Итог уровня →') + '</button>';
  }

  // ===== Переход между задачами распознавания =====
  function nextTask() {
    ST.ti++;
    if (ST.ti < ST.tasks.length) {
      if (ST.lvl === 1) renderPair();
      else if (ST.lvl === 2) renderLeverQ();
      else renderWeak();
      return;
    }
    finishRecog();
  }
  function finishRecog() {
    var need = { 1: 5, 2: 4, 3: 4 }[ST.lvl];
    var total = ST.tasks.length;
    var passed = ST.score >= need;
    var p = loadProg();
    if (passed) { p.done[ST.lvl] = true; saveProg(p); }
    track(passed ? 'lg_level_pass' : 'lg_level_fail', { level: ST.lvl, score: ST.score, total: total });
    var lecKey = ST.lvl === 1 ? 'ambiciya' : (ST.lvl === 2 ? 'len' : 'budushee');
    var c = container(); if (!c) return;
    var afterBtn;
    if (passed && ST.lvl === 3 && !p.blitz) afterBtn = '<button class="lg-primary" onclick="LGENIJ.blitz()">Дальше →</button>';
    else if (passed) afterBtn = '<button class="lg-primary" onclick="LGENIJ.home()">К карте пути →</button>';
    else afterBtn = '<button class="lg-primary" onclick="LGENIJ.play(' + ST.lvl + ')">🔁 Ещё попытка</button><button class="lg-secondary" onclick="LGENIJ.home()">К карте пути</button>';
    ST._marks = [];
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:18px 0 8px"><div class="lg-tyaga">' + ST.score + '<span style="font-size:1.1rem;color:#8b93a7">/' + total + '</span></div><div class="lg-hint" style="margin-top:4px">нужно ' + need + ' из ' + total + '</div></div>' +
        '<div style="text-align:center;margin-bottom:12px"><span class="lg-pill ' + (passed ? 'w' : 'l') + '">' + (passed ? '✅ Уровень пройден' : 'Пока не хватило') + '</span></div>' +
        (passed
          ? '<div class="lg-card"><div class="lg-fb">Глаз намётан. ' + (ST.lvl < 3 ? 'Дальше — сложнее.' : 'Акт I пройден: ты видишь сильные ходы. Пора делать свои — впереди дуэли с Фреди.') + '</div>' + lecLink(lecKey) + '</div>'
          : '<div class="lg-card"><div class="lg-fb">Нормально: распознавание — это навык, он растёт от попыток. Задачи перемешаются, зайди ещё раз.</div>' + lecLink(lecKey) + '</div>') +
        afterBtn +
      '</div>';
  }

  // ===== Блиц-припоминание (после акта I) =====
  function blitz() {
    ST.screen = 'blitz';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' +
        '<div class="lg-top"><span>🧠 Блиц</span><button class="lg-x" onclick="LGENIJ.blitzDone(true)">Пропустить</button></div>' +
        '<h1 class="lg-h1" style="font-size:1.24rem">Вспомни рычаги по памяти</h1>' +
        '<p class="lg-sub">Не подсматривая: какие вопросы задаёт ленивый гений, когда ищет дешёвый путь? Впиши, что помнишь — припоминание закрепляет метод прочнее любого списка.</p>' +
        '<textarea class="lg-ta" id="lgBlitz" style="min-height:110px" placeholder="Например: что уже делает это за меня; какой ресурс под ногами…"></textarea>' +
        '<button class="lg-primary" onclick="LGENIJ.blitzShow()">Показать эталон →</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('lgBlitz'); if (el) el.focus(); }, 60);
  }
  function blitzShow() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' +
        '<h1 class="lg-h1" style="font-size:1.24rem">🔧 Четыре рычага (ИКР)</h1>' +
        '<p class="lg-sub">Сверь с тем, что вспомнил. Эти вопросы будут судьями в дуэлях — и в жизни:</p>' +
        LEVERS.map(function (q) { return '<div class="lg-card" style="padding:12px 14px"><div class="lg-fb">🔧 ' + esc(q) + '</div></div>'; }).join('') +
        '<button class="lg-primary" onclick="LGENIJ.blitzDone()">Дальше →</button>' +
      '</div>';
    track('game_blitz', { game: 'lgenij' });
  }
  function blitzDone() {
    var p = loadProg(); p.blitz = true; saveProg(p);
    home();
  }

  // ===== Уровни 4–6: дуэли с Фреди =====
  function duelKind() { return ST.lvl === 4 ? 'planka' : (ST.lvl === 5 ? 'rychag' : 'full'); }
  function renderDuel() {
    ST.screen = 'duel'; ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var kind = duelKind();
    var task, fields;
    if (kind === 'planka') {
      task = '<div class="lg-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:4px">Робкая цель · ' + esc(t.dom) + '</div><div class="lg-timid">«' + esc(t.timid) + '»</div></div>' +
        '<div class="lg-ch">📈 Подними планку дерзко — потом свой ход покажет Фреди</div>' +
        '<div class="lg-hint" style="margin:0 0 8px">Убери глушилки («может», «немного»), добавь масштаб и срок, оставь своё.</div>' +
        '<textarea class="lg-ta" id="lgD1" placeholder="Дерзкая версия цели…"></textarea>';
    } else if (kind === 'rychag') {
      task = '<div class="lg-echo">🎯 Дерзкая цель: <b>' + esc(t.bold) + '</b></div>' +
        '<div class="lg-ch">🔧 Найди самый ленивый путь — дешевле, чем найдёт Фреди</div>' +
        LEVERS.map(function (q) { return '<div class="lg-lever">' + esc(q) + '</div>'; }).join('') +
        '<div style="height:10px"></div>' +
        '<textarea class="lg-ta" id="lgD1" placeholder="Самый дешёвый путь к цели…"></textarea>';
    } else {
      task = '<div class="lg-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:4px">Робкая цель · ' + esc(t.dom) + '</div><div class="lg-timid">«' + esc(t.timid) + '»</div></div>' +
        '<div class="lg-ch">Полный ход: планка + путь</div>' +
        '<textarea class="lg-ta" id="lgD1" placeholder="📈 Дерзкая версия цели…" style="min-height:56px"></textarea>' +
        '<div style="height:8px"></div>' +
        '<textarea class="lg-ta" id="lgD2" placeholder="🔧 Ленивый путь к ней…" style="min-height:56px"></textarea>';
    }
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('') +
        '<div class="lg-duelscore"><span>Ты <b>' + ST.wins + '</b></span><span style="font-size:1.2rem">⚔️</span><span><b>' + (ST.ti - ST.wins) + '</b> Фреди</span><span style="color:#5a6472">· раунд ' + (ST.ti + 1) + ' из ' + ST.tasks.length + '</span></div>' +
        task +
        '<button class="lg-primary" onclick="LGENIJ.submitDuel()">Мой ход сделан ⚔️</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('lgD1'); if (el) el.focus(); }, 60);
  }
  function duelPrompt(t, kind, m1, m2) {
    var head = 'Ты — Фреди, судья дуэли в игре «Ленивый гений». Навык: дерзкая цель (конкретный образ + срок, своё, выше исходной, но со ступенькой — не бред) и ленивый путь (максимум результата минимумом усилий: готовые ресурсы, чужая инерция, вход в 2 минуты, система работает сама; надрыв = плохо).\n';
    var body;
    if (kind === 'planka') body = 'Робкая цель: «' + t.timid + '».\nХод игрока (поднял планку): «' + m1 + '».\nОцени, насколько ход игрока — настоящая амбиция.';
    else if (kind === 'rychag') body = 'Дерзкая цель: «' + t.bold + '».\nХод игрока (ленивый путь): «' + m1 + '».\nОцени, насколько путь игрока дёшев и умён.';
    else body = 'Робкая цель: «' + t.timid + '».\nХод игрока — планка: «' + m1 + '», путь: «' + m2 + '».\nОцени ход целиком: и амбицию, и дешевизну пути.';
    return head + body + '\nПоставь score 0–10 (7 и выше — ход достоин победы в дуэли). Будь справедлив: не занижай за стиль, цени суть.\nВерни СТРОГО один JSON без текста вокруг: {"score":ЧИСЛО,"note":"одна фраза — чем ход силён или слаб","better":"если score меньше 7 — одна фраза, как дожать, иначе пустая строка"}. По-русски, на «ты».';
  }
  function parseDuel(txt) {
    if (!txt) return null;
    var m = String(txt).match(/\{[\s\S]*\}/); if (!m) return null;
    try {
      var o = JSON.parse(m[0]);
      var s = Math.max(0, Math.min(10, Math.round(Number(o.score))));
      if (isNaN(s)) return null;
      return { score: s, note: String(o.note || '').trim(), better: String(o.better || '').trim() };
    } catch (e) { return null; }
  }
  async function submitDuel() {
    if (ST.busy) return;
    var kind = duelKind();
    var m1 = ((document.getElementById('lgD1') || {}).value || '').trim();
    var m2 = ((document.getElementById('lgD2') || {}).value || '').trim();
    if (m1.length < 4 || (kind === 'full' && m2.length < 4)) { toast('Сделай ход посодержательнее', 'error'); return; }
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="lg-wrap" style="text-align:center;padding-top:60px"><div class="lg-tyaga"><span class="lg-spin"></span></div><p class="lg-sub" style="margin-top:16px">Фреди делает ответный ход…</p></div>';
    var t = ST.tasks[ST.ti];
    var res = null;
    try {
      var r = await aiGenerate(duelPrompt(t, kind, m1, m2), { max_tokens: 220, temperature: 0.4 });
      res = parseDuel(r && r.content);
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { score: 7, note: 'Связь с Фреди подвисла — раунд засчитан тебе.', better: '' };
    var win = res.score >= 7;
    if (win) ST.wins++;
    var p = loadProg(); p.duels = (p.duels || 0) + 1; if (win) p.wins = (p.wins || 0) + 1; saveProg(p);
    track('lg_duel', { level: ST.lvl, score: res.score, win: win });
    var fredMove = kind === 'planka' ? t.bold : (kind === 'rychag' ? t.path : ('📈 ' + t.bold + '\n🔧 ' + t.path));
    var yourMove = kind === 'full' ? ('📈 ' + m1 + '\n🔧 ' + m2) : m1;
    vibe(win ? 25 : [40, 60, 40]);
    if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:4px 0 10px"><span class="lg-pill ' + (win ? 'w' : 'l') + '">' + (win ? '🏆 Раунд твой!' : '⚔️ Раунд за Фреди') + '</span><div class="lg-hint" style="margin-top:6px">Оценка твоего хода: <b style="color:#fff">' + res.score + '/10</b></div></div>' +
        '<div class="lg-vs">' +
          '<div class="you"><div class="who">Твой ход</div><div class="lg-fb">' + nl2br(yourMove) + '</div></div>' +
          '<div class="fre"><div class="who">Ход Фреди</div><div class="lg-fb">' + nl2br(fredMove) + '</div></div>' +
        '</div>' +
        (res.note ? '<div class="lg-why">💬 ' + esc(res.note) + (res.better ? '<br>🔧 ' + esc(res.better) : '') + '</div>' : '') +
        '<button class="lg-primary" onclick="LGENIJ.nextDuel()">' + (ST.ti + 1 < ST.tasks.length ? 'Следующий раунд ⚔️' : 'Итог дуэли →') + '</button>' +
      '</div>';
  }
  function nextDuel() {
    ST.ti++;
    if (ST.ti < ST.tasks.length) { renderDuel(); return; }
    var passed = ST.wins >= 2;
    var p = loadProg();
    if (passed) { p.done[ST.lvl] = true; saveProg(p); }
    track(passed ? 'lg_level_pass' : 'lg_level_fail', { level: ST.lvl, wins: ST.wins });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:18px 0 8px"><div class="lg-tyaga">' + ST.wins + '<span style="font-size:1.1rem;color:#8b93a7">/' + ST.tasks.length + '</span></div><div class="lg-hint" style="margin-top:4px">побед в дуэли · нужно 2</div></div>' +
        '<div style="text-align:center;margin-bottom:12px"><span class="lg-pill ' + (passed ? 'w' : 'l') + '">' + (passed ? '🏆 Дуэль за тобой' : 'Фреди пока сильнее') + '</span></div>' +
        (passed
          ? '<div class="lg-card"><div class="lg-fb">' + (ST.lvl < 6 ? 'Достойно. Следующая дуэль сложнее.' : 'Акт II закрыт: ты бьёшь Фреди его же оружием. Осталось главное — твоя жизнь.') + '</div></div>'
          : '<div class="lg-card"><div class="lg-fb">Ходы Фреди — не приговор, а образцы: разбери, чем они дешевле и дерзче твоих, и возьми реванш с новыми целями.</div></div>') +
        (passed
          ? '<button class="lg-primary" onclick="LGENIJ.home()">К карте пути →</button>'
          : '<button class="lg-primary" onclick="LGENIJ.play(' + ST.lvl + ')">⚔️ Реванш</button><button class="lg-secondary" onclick="LGENIJ.home()">К карте пути</button>') +
      '</div>';
  }

  // ===== Уровень 7: своя цель =====
  function renderOwnPlanka() {
    ST.screen = 'own';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('Теперь по-настоящему. Возьми что-то из своей жизни, что давно «надо бы».') +
        '<div class="lg-ch">Твоя робкая цель — как ты её обычно себе бормочешь</div>' +
        '<input class="lg-in" id="lgOT" placeholder="например: наконец разобрать гараж" autocomplete="off" value="' + esc(ST.own.timid || '') + '">' +
        '<div style="height:12px"></div>' +
        '<div class="lg-ch">📈 А теперь подними планку — дерзко, но по-настоящему твоё</div>' +
        '<div class="lg-help"><div class="lg-help-b" style="padding:11px 13px"><div class="lg-help-how">Убери «может» и «немного», умножь масштаб примерно в 10 раз, добавь срок. Как в дуэлях — ты уже умеешь.</div>' + lecLink('ambiciya') + '</div></div>' +
        '<textarea class="lg-ta" id="lgOA" placeholder="Смелая версия цели…">' + esc(ST.own.ambitious || '') + '</textarea>' +
        '<button class="lg-primary" onclick="LGENIJ.ownPlanka()">Поднял планку →</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('lgOT'); if (el && !el.value) el.focus(); }, 60);
  }
  function ownPlanka() {
    var t = ((document.getElementById('lgOT') || {}).value || '').trim();
    var a = ((document.getElementById('lgOA') || {}).value || '').trim();
    if (!t) { toast('Впиши свою цель', 'error'); return; }
    if (a.length < 4) { toast('Замахнись посмелее', 'error'); return; }
    ST.own.timid = t; ST.own.ambitious = a; vibe(15);
    renderOwnRychag();
  }
  function renderOwnRychag() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('') +
        '<div class="lg-echo">🎯 Твоя дерзкая цель: <b>' + esc(ST.own.ambitious) + '</b></div>' +
        '<div class="lg-ch">🔧 Как получить это почти даром?</div>' +
        LEVERS.map(function (q) { return '<div class="lg-lever">' + esc(q) + '</div>'; }).join('') +
        '<div style="height:10px"></div>' +
        '<textarea class="lg-ta" id="lgOP" placeholder="Самый дешёвый путь к цели…">' + esc(ST.own.path || '') + '</textarea>' +
        '<button class="lg-primary" onclick="LGENIJ.ownRychag()">Нашёл путь →</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('lgOP'); if (el) el.focus(); }, 60);
  }
  function ownRychag() {
    var p = ((document.getElementById('lgOP') || {}).value || '').trim();
    if (p.length < 4) { toast('Опиши путь чуть подробнее', 'error'); return; }
    ST.own.path = p; vibe(15);
    renderOwnPrimanka();
  }
  function renderOwnPrimanka() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('') +
        '<div class="lg-echo">🎯 <b>' + esc(ST.own.ambitious) + '</b></div>' +
        '<div class="lg-ch">🧲 Кем ты станешь, когда это случится?</div>' +
        '<div class="lg-hint" style="margin:0 0 8px">Одна строка про себя-будущего — приманка, которая тянет, когда мотивации нет.</div>' +
        '<div class="lg-help"><div class="lg-help-b" style="padding:11px 13px">' + lecLink('budushee') + '</div></div>' +
        '<input class="lg-in" id="lgOF" placeholder="Я стану тем, кто…" autocomplete="off" value="' + esc(ST.own.future || '') + '">' +
        '<button class="lg-primary" onclick="LGENIJ.ownScore()">Готово — оценка Фреди →</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('lgOF'); if (el) el.focus(); }, 60);
  }
  function ownPrompt() {
    return 'Ты — Фреди, тренер навыка «ленивый гений»: дерзкие цели и самый дешёвый путь к ним.\n' +
      'Робкая исходная цель игрока: «' + ST.own.timid + '».\n' +
      'Поднятая планка: «' + ST.own.ambitious + '».\n' +
      'Ленивый путь: «' + ST.own.path + '».\n' +
      'Образ будущего себя: «' + (ST.own.future || '—') + '».\n' +
      'Оцени 0–10: AMBITION — насколько цель выше и смелее исходной, но с опорой (мелко = мало, бред = средне). LAZY — насколько путь дёшев и умён: готовые ресурсы, чужая инерция, крошечный вход, система работает сама (надрыв = мало).\n' +
      'Верни СТРОГО один JSON: {"ambition":ЧИСЛО,"lazy":ЧИСЛО,"praise":"одна фраза — что удалось","tip":"одна фраза — как усилить слабую сторону","lever":"один конкретный ещё более ленивый ход под эту цель"}. По-русски, на «ты», без воды.';
  }
  function parseOwn(txt) {
    if (!txt) return null;
    var m = String(txt).match(/\{[\s\S]*\}/); if (!m) return null;
    try {
      var o = JSON.parse(m[0]);
      var a = Math.max(0, Math.min(10, Math.round(Number(o.ambition))));
      var l = Math.max(0, Math.min(10, Math.round(Number(o.lazy))));
      if (isNaN(a) || isNaN(l)) return null;
      return { a: a, l: l, praise: String(o.praise || '').trim(), tip: String(o.tip || '').trim(), lever: String(o.lever || '').trim() };
    } catch (e) { return null; }
  }
  async function ownScore() {
    if (ST.busy) return;
    ST.own.future = ((document.getElementById('lgOF') || {}).value || '').trim();
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="lg-wrap" style="text-align:center;padding-top:60px"><div class="lg-tyaga"><span class="lg-spin"></span></div><p class="lg-sub" style="margin-top:16px">Фреди взвешивает амбицию и лень…</p></div>';
    var res = null;
    try {
      var r = await aiGenerate(ownPrompt(), { max_tokens: 300, temperature: 0.4 });
      res = parseOwn(r && r.content);
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { a: 6, l: 6, praise: 'Ход сделан — уже хорошо.', tip: 'Связь с Фреди подвисла, оценка нейтральная.', lever: '' };
    var tyaga = Math.round(res.a * res.l / 10);
    var q = QUAD[quadOf(res.a, res.l)];
    var passed = tyaga >= 5;
    var p = loadProg();
    if (passed) { p.done[7] = true; p.ownGoal = { timid: ST.own.timid, ambitious: ST.own.ambitious, path: ST.own.path, future: ST.own.future, tyaga: tyaga }; saveProg(p); }
    track(passed ? 'lg_level_pass' : 'lg_level_fail', { level: 7, tyaga: tyaga, a: res.a, l: res.l });
    if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:6px 0 14px"><div style="color:#8b93a7;font-size:.82rem">Тяга твоего двигателя</div><div class="lg-tyaga">' + tyaga + '<span style="font-size:1.1rem;color:#8b93a7">/10</span></div></div>' +
        '<div class="lg-dials">' +
          '<div class="lg-dial"><div class="l"><span>📈 Амбиция</span><b style="color:#5b9bff">' + res.a + '/10</b></div><div class="lg-bar"><i style="width:' + (res.a * 10) + '%;background:#5b9bff"></i></div></div>' +
          '<div class="lg-dial"><div class="l"><span>🔧 Лень-эффективность</span><b style="color:#34d399">' + res.l + '/10</b></div><div class="lg-bar"><i style="width:' + (res.l * 10) + '%;background:#34d399"></i></div></div>' +
        '</div>' +
        '<div style="text-align:center"><span class="lg-quad" style="background:' + q.color + '22;color:' + q.color + '">' + q.em + ' ' + q.name + '</span><div class="lg-hint" style="margin-top:2px">' + q.hint + '</div></div>' +
        (res.praise ? '<div class="lg-card" style="margin-top:14px"><div class="lg-ch">Что удалось</div><div class="lg-fb">' + nl2br(res.praise) + '</div></div>' : '') +
        (res.tip ? '<div class="lg-card"><div class="lg-ch">Куда сильнее</div><div class="lg-fb">' + nl2br(res.tip) + '</div></div>' : '') +
        (res.lever ? '<div class="lg-card" style="border-color:rgba(52,211,153,.3)"><div class="lg-ch">🔧 Ещё более ленивый ход</div><div class="lg-fb">' + nl2br(res.lever) + '</div></div>' : '') +
        (passed
          ? '<button class="lg-primary" onclick="LGENIJ.home()">К карте пути →</button>'
          : '<button class="lg-primary" onclick="LGENIJ.play(7)">🔁 Докрутить с подсказками Фреди</button><button class="lg-secondary" onclick="LGENIJ.home()">К карте пути</button>') +
      '</div>';
  }

  // ===== Уровень 8: первый ход (микрообязательство) =====
  function renderCommit() {
    ST.screen = 'commit';
    var c = container(); if (!c) return;
    var p = loadProg();
    var goal = (p.ownGoal && p.ownGoal.ambitious) || '';
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('Двигатель заводится не мыслью, а первым оборотом. Назначь ход настолько маленький, что лень его пропустит.') +
        (goal ? '<div class="lg-echo">🎯 Твоя цель: <b>' + esc(goal) + '</b></div>'
              : '<input class="lg-in" id="lgCG" placeholder="Твоя цель…" autocomplete="off"><div style="height:10px"></div>') +
        '<div class="lg-ch">Первый ход — не дольше двух минут</div>' +
        '<div class="lg-hint" style="margin:0 0 8px">Не «начать бегать», а «поставить кроссовки у двери». Не «писать блог», а «наговорить одну мысль в заметки».</div>' +
        '<input class="lg-in" id="lgCM" placeholder="Мой ход на 2 минуты…" autocomplete="off">' +
        '<div style="height:12px"></div>' +
        '<div class="lg-ch">Когда?</div>' +
        '<div class="lg-row" style="margin-top:6px">' +
          '<button class="lg-secondary" id="lgW0" onclick="LGENIJ.commitWhen(0)" style="border-color:#3a86ff;color:#fff">Сегодня</button>' +
          '<button class="lg-secondary" id="lgW1" onclick="LGENIJ.commitWhen(1)">Завтра</button>' +
        '</div>' +
        '<button class="lg-primary" onclick="LGENIJ.saveCommit()">Обещаю себе 🤝</button>' +
        '<div class="lg-hint" style="text-align:center">Фреди спросит про этот ход, когда ты вернёшься в игру.</div>' +
      '</div>';
    ST._when = 0;
    setTimeout(function () { var el = document.getElementById('lgCM'); if (el) el.focus(); }, 60);
  }
  function commitWhen(i) {
    ST._when = i;
    var b0 = document.getElementById('lgW0'), b1 = document.getElementById('lgW1');
    if (b0) { b0.style.borderColor = i === 0 ? '#3a86ff' : 'rgba(255,255,255,.18)'; b0.style.color = i === 0 ? '#fff' : '#cdd4e2'; }
    if (b1) { b1.style.borderColor = i === 1 ? '#3a86ff' : 'rgba(255,255,255,.18)'; b1.style.color = i === 1 ? '#fff' : '#cdd4e2'; }
  }
  function saveCommit() {
    var p = loadProg();
    var goal = (p.ownGoal && p.ownGoal.ambitious) || ((document.getElementById('lgCG') || {}).value || '').trim();
    var move = ((document.getElementById('lgCM') || {}).value || '').trim();
    if (!goal) { toast('Впиши цель', 'error'); return; }
    if (!move) { toast('Впиши первый ход', 'error'); return; }
    p.commit = { goal: goal, move: move, when: ST._when === 1 ? 'tomorrow' : 'today', ts: Date.now(), done: false };
    p.done[8] = true;
    saveProg(p);
    track('lg_commit', { when: p.commit.when });
    vibe(25);
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:20px 0 12px;font-size:3rem">🤝</div>' +
        '<div class="lg-card"><div class="lg-fb">Записано: <b>«' + esc(move) + '»</b> — ' + (ST._when === 1 ? 'завтра' : 'сегодня') + '.<br><br>Это и есть разница между мечтателем и гением: у гения всегда есть следующий крошечный ход. Когда вернёшься — Фреди спросит, как прошло.</div></div>' +
        '<button class="lg-primary" onclick="LGENIJ.home()">К карте пути →</button>' +
      '</div>';
  }

  // ===== Уровень 9: экзамен =====
  function startExam() {
    ST.exam = { step: 0, pts: 0 };
    ST.tasks = [shuffle(PAIRS)[0], shuffle(LEVERQ)[0], shuffle(BANK)[0]];
    ST.ti = 0; ST.score = 0; ST.wins = 0; ST._marks = [];
    renderExamStep();
  }
  function renderExamStep() {
    var s = ST.exam.step;
    if (s === 0) { renderExamPair(); }
    else if (s === 1) { renderExamLever(); }
    else { renderExamDuel(); }
  }
  function examHead(sub) {
    return '<div class="lg-top"><span>🏆 Экзамен · шаг ' + (ST.exam.step + 1) + ' из 3</span><button class="lg-x" onclick="LGENIJ.quitLevel()">✕ Выйти</button></div>' +
      (sub ? '<p class="lg-sub" style="margin-bottom:12px">' + sub + '</p>' : '');
  }
  function renderExamPair() {
    var c = container(); if (!c) return;
    ST.answered = false;
    var t = ST.tasks[0];
    var opts = shuffle([{ t: t.good, ok: true }, { t: t.bad, ok: false }]);
    ST._opts = opts;
    c.innerHTML =
      '<div class="lg-wrap">' + examHead('Где настоящая амбиция?') +
        '<div class="lg-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:4px">Робкая цель</div><div class="lg-timid">«' + esc(t.timid) + '»</div></div>' +
        opts.map(function (o, i) { return '<button class="lg-choice" id="lgC' + i + '" onclick="LGENIJ.examPick(' + i + ',\'pair\')">' + esc(o.t) + '</button>'; }).join('') +
        '<div id="lgWhy"></div>' +
      '</div>';
  }
  function renderExamLever() {
    var c = container(); if (!c) return;
    ST.answered = false;
    var t = ST.tasks[1];
    var opts = shuffle(t.opts);
    ST._opts = opts;
    c.innerHTML =
      '<div class="lg-wrap">' + examHead('Какой путь гениально-ленивый?') +
        '<div class="lg-echo">🎯 Цель: <b>' + esc(t.goal) + '</b></div>' +
        opts.map(function (o, i) { return '<button class="lg-choice" id="lgC' + i + '" onclick="LGENIJ.examPick(' + i + ',\'lever\')">' + esc(o.t) + '</button>'; }).join('') +
        '<div id="lgWhy"></div>' +
      '</div>';
  }
  function examPick(i, kind) {
    if (ST.answered) return;
    ST.answered = true;
    var idx = kind === 'pair' ? 0 : 1;
    var t = ST.tasks[idx];
    var hit = kind === 'pair' ? !!ST._opts[i].ok : ST._opts[i].k === 'ok';
    if (hit) { ST.exam.pts++; vibe(20); } else { vibe([40, 60, 40]); }
    for (var j = 0; j < ST._opts.length; j++) {
      var b = document.getElementById('lgC' + j);
      if (!b) continue;
      b.disabled = true;
      var good = kind === 'pair' ? !!ST._opts[j].ok : ST._opts[j].k === 'ok';
      if (good) b.className = 'lg-choice ok';
      else b.className = 'lg-choice' + (j === i ? ' no' : ' dim');
    }
    var w = document.getElementById('lgWhy');
    if (w) w.innerHTML =
      '<div class="lg-why">' + (hit ? '✅ Точно. ' : '❌ Мимо. ') + esc(t.why) + '</div>' +
      '<button class="lg-primary" onclick="LGENIJ.examNext()">Дальше →</button>';
  }
  function examNext() {
    ST.exam.step++;
    renderExamStep();
  }
  function renderExamDuel() {
    var c = container(); if (!c) return;
    var t = ST.tasks[2];
    c.innerHTML =
      '<div class="lg-wrap">' + examHead('Финальная дуэль: полный ход против Фреди.') +
        '<div class="lg-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:4px">Робкая цель · ' + esc(t.dom) + '</div><div class="lg-timid">«' + esc(t.timid) + '»</div></div>' +
        '<textarea class="lg-ta" id="lgD1" placeholder="📈 Дерзкая версия цели…" style="min-height:56px"></textarea>' +
        '<div style="height:8px"></div>' +
        '<textarea class="lg-ta" id="lgD2" placeholder="🔧 Ленивый путь к ней…" style="min-height:56px"></textarea>' +
        '<button class="lg-primary" onclick="LGENIJ.examDuel()">Мой ход сделан ⚔️</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('lgD1'); if (el) el.focus(); }, 60);
  }
  async function examDuel() {
    if (ST.busy) return;
    var m1 = ((document.getElementById('lgD1') || {}).value || '').trim();
    var m2 = ((document.getElementById('lgD2') || {}).value || '').trim();
    if (m1.length < 4 || m2.length < 4) { toast('Сделай ход посодержательнее', 'error'); return; }
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="lg-wrap" style="text-align:center;padding-top:60px"><div class="lg-tyaga"><span class="lg-spin"></span></div><p class="lg-sub" style="margin-top:16px">Фреди делает ответный ход…</p></div>';
    var t = ST.tasks[2];
    var res = null;
    try {
      var r = await aiGenerate(duelPrompt(t, 'full', m1, m2), { max_tokens: 220, temperature: 0.4 });
      res = parseDuel(r && r.content);
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { score: 7, note: 'Связь с Фреди подвисла — раунд засчитан тебе.', better: '' };
    var win = res.score >= 7;
    if (win) ST.exam.pts++;
    ST.exam.duel = { m1: m1, m2: m2, res: res, win: win, t: t };
    finishExam();
  }
  function finishExam() {
    var pts = ST.exam.pts;
    var passed = pts >= 2;
    var title = pts >= 3 ? '🚀 Ленивый гений' : (pts === 2 ? '😎 Хитрец с амбицией' : '');
    var p = loadProg();
    if (passed) { p.done[9] = true; p.title = title; saveProg(p); }
    track(passed ? 'lg_level_pass' : 'lg_level_fail', { level: 9, pts: pts });
    track('game_finish', { game: 'lgenij', pts: pts, title: title });
    var d = ST.exam.duel;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lg-wrap">' +
        '<div class="lg-top"><span>🏆 Экзамен</span><button class="lg-x" onclick="LGENIJ.home()">✕</button></div>' +
        '<div style="text-align:center;margin:14px 0 6px"><div class="lg-tyaga">' + pts + '<span style="font-size:1.1rem;color:#8b93a7">/3</span></div></div>' +
        '<div style="text-align:center;margin-bottom:14px">' +
          (passed ? '<span class="lg-quad" style="background:rgba(52,211,153,.13);color:#6ee7b7">' + title + '</span>' : '<span class="lg-pill l">Пересдача — это нормально</span>') +
        '</div>' +
        (d ? '<div class="lg-vs">' +
          '<div class="you"><div class="who">Твой финальный ход · ' + d.res.score + '/10</div><div class="lg-fb">' + nl2br('📈 ' + d.m1 + '\n🔧 ' + d.m2) + '</div></div>' +
          '<div class="fre"><div class="who">Ход Фреди</div><div class="lg-fb">' + nl2br('📈 ' + d.t.bold + '\n🔧 ' + d.t.path) + '</div></div>' +
        '</div>' + (d.res.note ? '<div class="lg-why">💬 ' + esc(d.res.note) + '</div>' : '') : '') +
        '<div class="lg-card"><div class="lg-ch">Взять в жизнь</div><div class="lg-fb">Раз в день лови любую свою «надо бы» и прогоняй через два хода: <b>подними планку</b> («а если в 10 раз крупнее?») и <b>найди рычаг</b> («что сделает это почти само?»). Навык растёт от повторов — возвращайся, дуэли и цели каждый раз новые.</div></div>' +
        (passed
          ? '<div class="lg-row"><button class="lg-primary" onclick="LGENIJ.play(9)">🔁 Пересдать на 3/3</button><button class="lg-secondary" onclick="LGENIJ.home()">К карте пути</button></div>'
          : '<button class="lg-primary" onclick="LGENIJ.play(9)">🔁 Пересдать</button><button class="lg-secondary" onclick="LGENIJ.home()">К карте пути</button>') +
        '<a class="lg-course" href="' + COURSE_URL + '" target="_blank" rel="noopener">🎓 Углубиться: курс «Двигатель: лень, амбиции и азарт поиска»</a>' +
      '</div>';
  }

  // ===== Экспорт =====
  window.LGENIJ = {
    home: home, play: play, introDone: introDone,
    pickPair: pickPair, pickLever: pickLever, pickWeak: pickWeak, nextTask: nextTask,
    blitz: blitz, blitzShow: blitzShow, blitzDone: blitzDone,
    submitDuel: submitDuel, nextDuel: nextDuel,
    ownPlanka: ownPlanka, ownRychag: ownRychag, ownScore: ownScore,
    commitWhen: commitWhen, saveCommit: saveCommit, checkin: checkin, saveHalf: saveHalf,
    examPick: examPick, examNext: examNext, examDuel: examDuel,
    quitLevel: quitLevel, getState: function () { return ST; }
  };
  window.showLgenijGame = home;
})();
