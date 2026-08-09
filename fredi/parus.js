// ============================================================
// «Парус» — симулятор по одноимённому курсу Лектория
// (/blog/lektorij/parus/). Тренирует четыре движения:
//   1) видеть поток, который уже течёт;
//   2) находить точку простоя, где поток отдают дёшево;
//   3) проверять идею тремя условиями до влюблённости в неё;
//   4) собирать движущую пару «тигр и торт»: то, что подпирает
//      сзади, и то, что манит спереди.
// Прогрессия — от выбора из готовых вариантов к свободному
// конструированию под задачу (последний рейс оценивает Фреди).
// Экспорт: window.showParusGame, window.PARUS
// ============================================================

(function () {
  'use strict';

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 500, temperature: opts.temperature == null ? 0.5 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ---------- прогресс ----------
  function loadProg() { try { var p = JSON.parse(localStorage.getItem('parus_progress') || 'null'); if (p && typeof p === 'object') return p; } catch (e) {} return { unlocked: 1, best: {}, plays: 0 }; }
  function saveProg(p) { try { localStorage.setItem('parus_progress', JSON.stringify(p)); } catch (e) {} }

  // ---------- контент ----------
  // Восемь потоков курса (лекция 4). Ключи короткие — ими помечены задания.
  var FLOWS = {
    people: 'Поток людей', attention: 'Чужое внимание', byproduct: 'Побочный продукт',
    idle: 'Простой мощностей', duty: 'Обязанности', infra: 'Инфраструктура',
    data: 'Данные', calendar: 'Календарь'
  };

  // Рейс 1: увидеть, какой поток течёт. d — пояснение после ответа.
  var R1 = [
    { sit: 'Человек отдал машину на мойку и час ходит кругами по парковке, глядя в телефон.',
      ans: 'people', opts: ['people', 'attention', 'calendar', 'infra'],
      d: 'Это поток людей — причём с уже оплаченным часом простоя. Час никуда не денется: вопрос лишь, кто поставит рядом парикмахерскую, кофе или маникюр.' },
    { sit: 'Пекарня каждый вечер выбрасывает нераспроданный хлеб и платит за вывоз.',
      ans: 'byproduct', opts: ['byproduct', 'data', 'people', 'idle'],
      d: 'Побочный продукт — единственный поток с отрицательной стоимостью: владелец сам платит, чтобы его увезли. Сухари, корм, закваска — вопрос адресата, а не сырья.' },
    { sit: 'Каждый сентябрь тысячи родителей первоклассников заново решают одни и те же задачи: форма, канцелярия, продлёнка, кружки.',
      ans: 'calendar', opts: ['calendar', 'attention', 'duty', 'infra'],
      d: 'Календарь: поток, который обязан течь и течёт по расписанию. Его не надо создавать и не надо угадывать — в сентябре он придёт снова.' },
    { sit: 'Фура везёт мебель из Москвы в Казань, а обратно идёт пустой.',
      ans: 'idle', opts: ['idle', 'people', 'infra', 'byproduct'],
      d: 'Простой мощностей: обратный прогон уже оплачен, машина уже едет. Груз в обратную сторону владелец возьмёт дёшево — лучше что-то, чем ничего.' },
    { sit: 'Управляющие компании обязаны раз в год проверять вентиляцию в каждом доме — и каждый год ищут, кто это сделает.',
      ans: 'duty', opts: ['duty', 'calendar', 'data', 'people'],
      d: 'Обязанность: поток, который течёт не потому, что хочется, а потому что положено. Такие потоки не пересыхают — их держит не желание, а норма.' },
    { sit: 'Ролик со сравнением двух пылесосов набрал миллион просмотров, и комментарии полны вопросов «а какой брать?».',
      ans: 'attention', opts: ['attention', 'people', 'data', 'calendar'],
      d: 'Чужое внимание. Важная оговорка курса: внимание — не намерение. Смотрят многие, платят те, у кого есть незакрытая задача, — здесь она видна прямо в комментариях.' }
  ];

  // Рейс 2: найти точку простоя. Верный вариант — настоящий простой
  // (единицы × длительность, владельцу он приносит ноль). Ложные — типовые
  // ошибки из лекций: проходимость, «интерес», дорогой вход.
  var R2 = [
    { sit: 'Типография: днём станки печатают тиражи, с 22:00 до 8:00 цех стоит запертым.',
      opts: [
        { t: 'Ночные машино-часы станков: 10 часов × каждый станок, каждый день ноль', ok: true },
        { t: 'Очередь клиентов у стойки по утрам', ok: false, why: 'Очередь — это спрос, а не простой. Здесь владельцу и так хорошо.' },
        { t: 'Секретарь свободен по выходным', ok: false, why: 'Свободное время человека — не простой мощности: его не продать без его желания, и число тут не сходится.' },
        { t: 'Пустует соседнее помещение под аренду', ok: false, why: 'Это чужой актив с дорогим входом, а не дешёвый простой этого владельца.' }
      ],
      d: 'Простой считается числом: станко-часы × дни. Ночь типографии — классика: оборудование оплачено, охрана есть, ноль каждый день. Владелец отдаст её дёшево — сейчас она не приносит ничего.' },
    { sit: 'Фитнес-клуб: вечером не протолкнуться, а с 12 до 16 залы стоят пустыми.',
      opts: [
        { t: 'Дневные часы залов: 4 часа × 3 зала × будни — ноль выручки', ok: true },
        { t: 'Толпа у соседнего метро', ok: false, why: 'Проходимость — не простой: людей много, но зацепиться не за что, у них нет оплаченного ожидания.' },
        { t: 'Подписчики клуба в соцсетях', ok: false, why: 'Внимание без незакрытой задачи. Лайк — не намерение.' },
        { t: 'Тренер хочет больше смен', ok: false, why: 'Желание сотрудника — не ресурс, который простаивает. Число из него не составить.' }
      ],
      d: 'Дневное окно — простой в чистом виде: пенсионеры, мамы с колясками, сменные работники — чужие потоки, которым удобно именно днём и которым клуб отдаст это время дёшево.' },
    { sit: 'Кафе при бизнес-центре: в обед очередь, после 15:00 повара и печи стоят до закрытия.',
      opts: [
        { t: 'Кухня после 15:00: повара и печи оплачены, загрузка ноль', ok: true },
        { t: 'Обеденная очередь — поставить второго кассира', ok: false, why: 'Улучшение пикового часа — другая задача. Простоя в очереди нет, там перегруз.' },
        { t: 'Вывеска, которую видно с дороги', ok: false, why: 'Это инфраструктура, и она уже используется. Дешёвого простоя тут нет.' },
        { t: 'Взять в аренду фудтрак', ok: false, why: 'Новый актив — дорогой вход. Курс начинает с того, что уже оплачено и стоит.' }
      ],
      d: 'Оплаченная кухня без заказов — простой мощности: заготовки для соседних кофеен, выпечка под вечерний поток, готовые ужины навынос. Владелец отдаст мощность дёшево: сейчас она даёт ноль.' }
  ];

  // Рейс 3: три условия паруса (лекция 6). По каждой идее — три вопроса
  // да/нет и вердикт: парус / мотор / переделать.
  var R3 = [
    { idea: 'Возле автосервиса пустует комнатка. Идея: кофе и три рабочих места для тех, кто ждёт машину. Сервис делает 30 машин в день, средний ремонт — 2 часа, клиенты сидят на лавке у ворот.',
      q: [
        { text: 'Течёт ли поток без вас? Исчезните на месяц — машины продолжат приезжать?', ans: true, why: 'Да: людей несёт в сервис их сломанная машина, вы к этому непричастны. Это и есть парусная ситуация.' },
        { text: 'Есть ли простой, и можно ли назвать его числом?', ans: true, why: 'Да: 30 человек × ~2 часа ожидания = до 60 человеко-часов в день, и сейчас они проходят на лавке.' },
        { text: 'Надстройка дешевле создания такого потока с нуля?', ans: true, why: 'Да: стол, кофемашина и договор с сервисом против задачи «построить сервис и приучить город в него ездить».' }
      ],
      verdict: 'sail',
      vd: 'Три «да» — парус. Дальше по курсу: не запуск, а пробное действие и заранее записанное условие остановки. И четвёртый вопрос — чей это поток: договоритесь с сервисом до, а не после.' },
    { idea: 'Посёлок на триста дворов. Идея: доставка фермерских овощей по подписке — «люди же должны хотеть свежее».',
      q: [
        { text: 'Течёт ли поток без вас? Кто-то уже ищет и покупает это здесь?', ans: false, why: 'Нет: спрос предстоит создавать — уговаривать, приучать, объяснять. «Должны хотеть» — не поток, а надежда.' },
        { text: 'Есть ли простой, который отдают дёшево?', ans: false, why: 'Нет: ничьё оплаченное время и ничья мощность здесь не простаивают. Числа не назвать.' },
        { text: 'Надстройка дешевле создания потока?', ans: false, why: 'Надстраиваться не на что: всё движение придётся оплатить самому — это и есть создание потока.' }
      ],
      verdict: 'motor',
      vd: 'Это мотор, и это не приговор — это честное имя. Мотор строят, когда готовы платить за каждый оборот. Беда не в моторных проектах, а в моторных проектах, которые считали парусными.' },
    { idea: 'Лесопилка бесплатно отдаёт опилки — платит за вывоз. Идея: продавать их цветочным хозяйствам. Одна деталь: лесопилка в 400 километрах от ближайшего покупателя.',
      q: [
        { text: 'Течёт ли поток без вас?', ans: true, why: 'Да: опилки образуются каждый день независимо от вас — побочный продукт чужой работы.' },
        { text: 'Есть ли простой с числом?', ans: true, why: 'Да, и со знаком минус: владелец платит за вывоз. Тонны в неделю — число есть.' },
        { text: 'Надстройка дешевле создания потока?', ans: false, why: 'Нет: 400 км логистики съедают всё. Вход в поток стоит дороже, чем поток отдаёт.' }
      ],
      verdict: 'rework',
      vd: 'Одно «нет» — не хоронить, а переделывать: искать потребителя ближе к лесопилке, менять точку потока или собирать партию с нескольких источников. Каждое «нет» показывает, что именно менять.' }
  ];

  // Рейс 4: собрать движущую пару. Из шести карточек — ровно две верные:
  // один тигр (подпирает сзади) и один торт (манит спереди).
  var R4 = [
    { task: 'Вы сами: курс английского куплен, месяц не открывали.',
      cards: [
        { t: '🍰 Урок начинается с пяти минут сериала, который вы и так смотрите — но на английском', kind: 'cake', why: 'Торт, пришитый к потоку, который уже течёт: не «заставить себя учиться», а впустить учёбу в готовую привычку.' },
        { t: '🐯 Восемь занятий с живым преподавателем оплачены вперёд и сгорают в конце месяца', kind: 'tiger', why: 'Настоящий тигр: реальная потеря с реальным сроком. Не выдуманное наказание, а уже существующая цена бездействия.' },
        { t: 'Поставить мотивирующую заставку на телефон', kind: 'noise', why: 'Лозунг. Не подпирает и не манит — украшает.' },
        { t: 'Пообещать себе начать с понедельника', kind: 'will', why: 'Голая воля. Понедельник наступал уже четыре раза.' },
        { t: 'Купить красивую тетрадь для конспектов', kind: 'noise', why: 'Реквизит. Готовиться к движению — не значит двигаться.' },
        { t: 'Рассказать в сторис, что учите английский', kind: 'noise', why: 'Шум: аплодисменты приходят до работы и заменяют её.' }
      ],
      d: 'Пара работает, когда тигр гонит ровно туда, где стоит торт: сгорающие занятия подпирают сзади, сериал манит спереди — и путь наименьшего сопротивления совпадает с нужным.' },
    { task: 'Кафе в 30 метрах от автосервиса. Клиенты сервиса час сидят на лавке у ворот и в кафе не заходят.',
      cards: [
        { t: '🍰 Приёмщик отдаёт вместе с ключами купон: «кофе за наш счёт, готовность машины пришлём смской»', kind: 'cake', why: 'Торт в точке потока: купон приходит ровно в момент, когда час ожидания уже неизбежен. Ноль трения.' },
        { t: '🐯 На лавке у ворот шумно, пахнет маслом и негде зарядить телефон', kind: 'tiger', why: 'Тигр уже существует — его не надо создавать, достаточно не гасить. Курс: сначала ищите готового тигра, а не стройте нового.' },
        { t: 'Раздавать листовки на остановке в соседнем квартале', kind: 'noise', why: 'Мимо потока: там люди без оплаченного часа ожидания.' },
        { t: 'Скидка 30% всем посетителям', kind: 'will', why: 'Дорого и не в точку: платите всем за то, что нужно от тридцати человек в день.' },
        { t: 'Реклама в городском паблике', kind: 'noise', why: 'Внимание — не намерение. Лайкнут многие, дойдут те, кто и так рядом.' },
        { t: 'Попросить сервис уговаривать клиентов сходить в кафе', kind: 'will', why: 'Встречный ветер: уговоры стоят дорого и раздражают. Купон без слов работает лучше просьб.' }
      ],
      d: 'Заметьте: тигра здесь никто не строил — неудобная лавка уже была. Половина работы с парой — увидеть готового тигра и просто поставить торт в тридцати метрах от него.' },
    { task: 'Вы сами: третий год «начну бегать с понедельника».',
      cards: [
        { t: '🍰 Маршрут до кофейни через парк: утренний кофе — только там и только после пробежки', kind: 'cake', why: 'Торт пришит к желанию, которое уже есть. Не «полюбить бег», а поставить бег на пути к любимому.' },
        { t: '🐯 Сосед ждёт у подъезда в 7:00. Не вышли — звонит в домофон', kind: 'tiger', why: 'Социальный тигр: подвести живого человека ощутимо дороже, чем нарушить обещание себе.' },
        { t: 'Купить хорошие кроссовки', kind: 'noise', why: 'Реквизит. Кроссовки уже есть с позапрошлого понедельника.' },
        { t: 'Объявить цель в соцсетях', kind: 'noise', why: 'Шум: одобрение приходит за намерение и снимает потребность в самом беге.' },
        { t: 'Приложение с графиками прогресса', kind: 'noise', why: 'Данные без пары не двигают: график пуст ровно потому, что бега нет.' },
        { t: 'Назначить себе наказание за пропуск, без всякой награды', kind: 'will', why: 'Тигр без торта: страх разгоняет, но бежать вы будете не по маршруту, а от самой затеи. Пара работает только вдвоём.' }
      ],
      d: 'Тигр без торта — побег, торт без тигра — «когда-нибудь». Двигает пара: сзади подпирает сосед, спереди ждёт кофе, и путь наименьшего сопротивления сам ложится через парк.' }
  ];

  // Рейс 5: свободное конструирование. Задачи без вариантов.
  var R5 = [
    'Жильцы дома не сортируют мусор, хотя баки для раздельного сбора стоят во дворе.',
    'Сотрудники не заполняют CRM: продажи есть, записей нет.',
    'Подросток не читает книг. Совсем.',
    'Посетители кафе приходят один раз и не возвращаются.',
    'Вы сами: год «собираетесь» вести учёт расходов.'
  ];

  var STAGES = [
    { key: 1, icon: '👁', name: 'Видеть поток', sub: 'Что здесь уже движется?', tasks: 4 },
    { key: 2, icon: '🕳', name: 'Точка простоя', sub: 'Где поток отдают дёшево?', tasks: 3 },
    { key: 3, icon: '✅', name: 'Три условия', sub: 'Парус, мотор или переделать?', tasks: 3 },
    { key: 4, icon: '🐯', name: 'Тигр и торт', sub: 'Собрать движущую пару', tasks: 3 },
    { key: 5, icon: '⛵', name: 'Свой парус', sub: 'Придумать под задачу. Разбор от Фреди', tasks: 1 }
  ];

  // ---------- состояние ----------
  var ST = { stage: 1, i: 0, score: 0, total: 0, picked: [], answered: false, r3q: 0, tasks: [] };

  // ---------- css ----------
  function injectCSS() {
    if (document.getElementById('parus-css')) return;
    var s = document.createElement('style');
    s.id = 'parus-css';
    s.textContent = [
      '.pr-wrap{max-width:640px;margin:0 auto;padding:18px 14px 40px;color:#e7e9ee;font-size:15px;line-height:1.55}',
      '.pr-h{font-size:1.35rem;font-weight:700;margin:6px 0 2px}',
      '.pr-sub{color:#9aa3b2;margin-bottom:14px}',
      '.pr-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 16px;margin:10px 0}',
      '.pr-sit{background:linear-gradient(135deg,rgba(56,132,255,.12),rgba(120,80,255,.10));border:1px solid rgba(99,140,255,.35)}',
      '.pr-opt{display:block;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:12px 14px;margin:8px 0;color:#e7e9ee;font:inherit;cursor:pointer;transition:border-color .15s,background .15s}',
      '.pr-opt:hover{border-color:rgba(120,180,255,.5)}',
      '.pr-opt.ok{border-color:#34d399;background:rgba(52,211,153,.12)}',
      '.pr-opt.bad{border-color:#f87171;background:rgba(248,113,113,.10)}',
      '.pr-opt.sel{border-color:#60a5fa;background:rgba(96,165,250,.14)}',
      '.pr-opt:disabled{cursor:default;opacity:.9}',
      '.pr-why{font-size:.86rem;color:#aab3c5;margin-top:6px}',
      '.pr-primary{display:block;width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#2f80ed,#7b61ff);color:#fff;font:inherit;font-weight:700;cursor:pointer;margin:14px 0 0}',
      '.pr-primary:disabled{opacity:.45;cursor:default}',
      '.pr-ghost{background:none;border:none;color:#8fa0bd;font:inherit;cursor:pointer;padding:6px 0}',
      '.pr-meta{display:flex;justify-content:space-between;color:#8b93a5;font-size:.85rem;margin-bottom:8px}',
      '.pr-stage{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:13px 15px;margin:9px 0;cursor:pointer}',
      '.pr-stage.lock{opacity:.45;cursor:default}',
      '.pr-stage .ic{font-size:1.5rem}',
      '.pr-stage b{display:block}',
      '.pr-stage small{color:#98a1b3}',
      '.pr-stage .st{margin-left:auto;font-size:.85rem;color:#facc15;white-space:nowrap}',
      '.pr-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:10px;color:#e7e9ee;font:inherit;padding:10px 12px;margin:4px 0 12px;box-sizing:border-box}',
      '.pr-lbl{font-size:.85rem;color:#9fb4d8}',
      '.pr-sail{display:block;margin:6px auto 2px}',
      '.pr-verdict{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}',
      '.pr-verdict .pr-opt{flex:1;min-width:150px;text-align:center;margin:0}',
      '@media(max-width:480px){.pr-wrap{font-size:14.5px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // Парус наполняется ветром по мере счёта.
  function sailSVG(level) {
    var l = Math.max(0, Math.min(1, level || 0));
    var bulge = 4 + 34 * l;
    var col = l >= 0.7 ? '#34d399' : l >= 0.4 ? '#60a5fa' : '#8b93a5';
    return '<svg class="pr-sail" width="120" height="96" viewBox="0 0 120 96">' +
      '<line x1="34" y1="8" x2="34" y2="80" stroke="#98a1b3" stroke-width="3"/>' +
      '<path d="M38 12 Q' + (38 + bulge) + ' 40 38 72 Z" fill="' + col + '" opacity="0.85"/>' +
      '<path d="M10 84 Q34 76 60 84 T110 84" stroke="#3b82f6" stroke-width="3" fill="none" opacity="0.7"/>' +
      '</svg>';
  }

  // ---------- главный экран ----------
  function home() {
    injectCSS();
    var c = container(); if (!c) return;
    track('game_open', { feature: 'parus' });
    var p = loadProg();
    c.innerHTML =
      '<div class="pr-wrap">' +
        '<button class="pr-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        sailSVG(0.55) +
        '<div class="pr-h" style="text-align:center">Парус</div>' +
        '<div class="pr-sub" style="text-align:center">Не строить с нуля — вставать в то, что уже движется</div>' +
        '<div class="pr-card">Мир полон готовой тяги: люди уже ждут, станки уже простаивают, сентябрь уже наступает. А людей двигает пара сил — <b>тигр</b>, который подпирает сзади, и <b>торт</b>, который манит спереди. Пять рейсов: сначала выбираете из готового, в конце придумываете сами.</div>' +
        STAGES.map(function (s) {
          var locked = s.key > p.unlocked;
          var best = p.best[s.key];
          return '<div class="pr-stage' + (locked ? ' lock' : '') + '"' + (locked ? '' : ' onclick="PARUS.start(' + s.key + ')"') + '>' +
            '<span class="ic">' + s.icon + '</span>' +
            '<span><b>Рейс ' + s.key + '. ' + esc(s.name) + '</b><small>' + esc(s.sub) + '</small></span>' +
            '<span class="st">' + (locked ? '🔒' : best != null ? best + '/10' : '') + '</span>' +
          '</div>';
        }).join('') +
        '<div class="pr-card" style="font-size:.88rem;color:#aab3c5">По курсу «Парус» в Лектории — 12 лекций с озвучкой: <a href="/blog/lektorij/parus/" style="color:#7cb0ff">открыть курс</a>. Игра — тренажёр к нему.</div>' +
      '</div>';
  }

  // ---------- запуск рейса ----------
  function start(stage) {
    var p = loadProg();
    if (stage > p.unlocked) return;
    ST = { stage: stage, i: 0, score: 0, total: 0, picked: [], answered: false, r3q: 0, tasks: [] };
    if (stage === 1) ST.tasks = shuffle(R1).slice(0, 4);
    if (stage === 2) ST.tasks = shuffle(R2).slice(0, 3);
    if (stage === 3) ST.tasks = R3.slice();           // порядок важен: парус → мотор → переделать
    if (stage === 4) ST.tasks = R4.slice();
    if (stage === 5) ST.tasks = [R5[Math.floor(Math.random() * R5.length)]];
    vibe(15);
    track('game_round_start', { feature: 'parus', stage: stage });
    render();
  }

  function header(title) {
    return '<div class="pr-meta"><span>' + esc(title) + '</span><span>задание ' + (ST.i + 1) + ' из ' + ST.tasks.length + ' · верно: ' + ST.score + '</span></div>';
  }

  function render() {
    var c = container(); if (!c) return;
    if (ST.i >= ST.tasks.length) return finish();
    var s = ST.stage;
    if (s === 1) renderR1(c);
    else if (s === 2) renderR2(c);
    else if (s === 3) renderR3(c);
    else if (s === 4) renderR4(c);
    else renderR5(c);
    try { c.scrollTop = 0; } catch (e) {}
  }

  // ---------- рейс 1 ----------
  function renderR1(c) {
    var q = ST.tasks[ST.i];
    if (!q._opts) q._opts = shuffle(q.opts);
    c.innerHTML =
      '<div class="pr-wrap">' + header('👁 Видеть поток') +
        '<div class="pr-card pr-sit">' + esc(q.sit) + '</div>' +
        '<div style="color:#9fb4d8;font-size:.9rem;margin:4px 0">Какой поток здесь течёт?</div>' +
        q._opts.map(function (k, i) {
          return '<button class="pr-opt" id="pro' + i + '" onclick="PARUS.pick1(' + i + ')">' + esc(FLOWS[k]) + '</button>';
        }).join('') +
        '<div id="prFb"></div>' +
      '</div>';
  }
  function pick1(i) {
    if (ST.answered) return;
    ST.answered = true;
    var q = ST.tasks[ST.i], k = q._opts[i], ok = k === q.ans;
    if (ok) ST.score++;
    vibe(ok ? 25 : 60);
    q._opts.forEach(function (kk, j) {
      var b = document.getElementById('pro' + j);
      if (!b) return;
      b.disabled = true;
      if (kk === q.ans) b.classList.add('ok');
      else if (j === i) b.classList.add('bad');
    });
    var fb = document.getElementById('prFb');
    if (fb) fb.innerHTML = '<div class="pr-card"><b>' + (ok ? 'Точно.' : 'Это ' + esc(FLOWS[q.ans]) + '.') + '</b><div class="pr-why">' + esc(q.d) + '</div></div>' +
      '<button class="pr-primary" onclick="PARUS.next()">Дальше</button>';
  }

  // ---------- рейс 2 ----------
  function renderR2(c) {
    var q = ST.tasks[ST.i];
    if (!q._opts) q._opts = shuffle(q.opts);
    c.innerHTML =
      '<div class="pr-wrap">' + header('🕳 Точка простоя') +
        '<div class="pr-card pr-sit">' + esc(q.sit) + '</div>' +
        '<div style="color:#9fb4d8;font-size:.9rem;margin:4px 0">Где здесь простой, который отдадут дёшево?</div>' +
        q._opts.map(function (o, i) {
          return '<button class="pr-opt" id="pro' + i + '" onclick="PARUS.pick2(' + i + ')">' + esc(o.t) + '</button>';
        }).join('') +
        '<div id="prFb"></div>' +
      '</div>';
  }
  function pick2(i) {
    if (ST.answered) return;
    ST.answered = true;
    var q = ST.tasks[ST.i], o = q._opts[i], ok = !!o.ok;
    if (ok) ST.score++;
    vibe(ok ? 25 : 60);
    q._opts.forEach(function (oo, j) {
      var b = document.getElementById('pro' + j);
      if (!b) return;
      b.disabled = true;
      if (oo.ok) b.classList.add('ok');
      else if (j === i) { b.classList.add('bad'); b.innerHTML += '<div class="pr-why">' + esc(oo.why) + '</div>'; }
    });
    var fb = document.getElementById('prFb');
    if (fb) fb.innerHTML = '<div class="pr-card"><div class="pr-why">' + esc(q.d) + '</div></div>' +
      '<button class="pr-primary" onclick="PARUS.next()">Дальше</button>';
  }

  // ---------- рейс 3 ----------
  function renderR3(c) {
    var t = ST.tasks[ST.i];
    var qi = ST.r3q;
    var html = '<div class="pr-wrap">' + header('✅ Три условия') +
      '<div class="pr-card pr-sit">' + esc(t.idea) + '</div>';
    if (qi < t.q.length) {
      var q = t.q[qi];
      html += '<div style="color:#9fb4d8;font-size:.9rem;margin:4px 0">Условие ' + (qi + 1) + ' из 3</div>' +
        '<div class="pr-card">' + esc(q.text) + '</div>' +
        '<div class="pr-verdict">' +
          '<button class="pr-opt" id="proY" onclick="PARUS.pick3(true)">Да</button>' +
          '<button class="pr-opt" id="proN" onclick="PARUS.pick3(false)">Нет</button>' +
        '</div><div id="prFb"></div>';
    } else {
      html += '<div style="color:#9fb4d8;font-size:.9rem;margin:4px 0">Вердикт?</div>' +
        '<div class="pr-verdict">' +
          '<button class="pr-opt" id="prv_sail" onclick="PARUS.verdict3(\'sail\')">⛵ Парус — вставать</button>' +
          '<button class="pr-opt" id="prv_motor" onclick="PARUS.verdict3(\'motor\')">⚙️ Мотор — строить самому</button>' +
          '<button class="pr-opt" id="prv_rework" onclick="PARUS.verdict3(\'rework\')">🔧 Переделать</button>' +
        '</div><div id="prFb"></div>';
    }
    c.innerHTML = html + '</div>';
  }
  function pick3(v) {
    if (ST.answered) return;
    ST.answered = true;
    var t = ST.tasks[ST.i], q = t.q[ST.r3q], ok = v === q.ans;
    if (ok) ST.score++;
    ST.total++;
    vibe(ok ? 25 : 60);
    var y = document.getElementById('proY'), n = document.getElementById('proN');
    if (y) { y.disabled = true; if (q.ans) y.classList.add('ok'); else if (v) y.classList.add('bad'); }
    if (n) { n.disabled = true; if (!q.ans) n.classList.add('ok'); else if (!v) n.classList.add('bad'); }
    var fb = document.getElementById('prFb');
    if (fb) fb.innerHTML = '<div class="pr-card"><div class="pr-why">' + esc(q.why) + '</div></div>' +
      '<button class="pr-primary" onclick="PARUS.next3()">Дальше</button>';
  }
  function next3() { ST.answered = false; ST.r3q++; render(); }
  function verdict3(v) {
    if (ST.answered) return;
    ST.answered = true;
    var t = ST.tasks[ST.i], ok = v === t.verdict;
    if (ok) ST.score++;
    ST.total++;
    vibe(ok ? 25 : 60);
    ['sail', 'motor', 'rework'].forEach(function (k) {
      var b = document.getElementById('prv_' + k);
      if (!b) return;
      b.disabled = true;
      if (k === t.verdict) b.classList.add('ok');
      else if (k === v) b.classList.add('bad');
    });
    var fb = document.getElementById('prFb');
    if (fb) fb.innerHTML = '<div class="pr-card"><div class="pr-why">' + esc(t.vd) + '</div></div>' +
      '<button class="pr-primary" onclick="PARUS.next()">Дальше</button>';
  }

  // ---------- рейс 4 ----------
  function renderR4(c) {
    var t = ST.tasks[ST.i];
    if (!t._cards) t._cards = shuffle(t.cards);
    ST.picked = [];
    c.innerHTML =
      '<div class="pr-wrap">' + header('🐯 Тигр и торт') +
        '<div class="pr-card pr-sit">' + esc(t.task) + '</div>' +
        '<div style="color:#9fb4d8;font-size:.9rem;margin:4px 0">Выберите ровно две карточки: тигра, который подпирает, и торт, который манит.</div>' +
        t._cards.map(function (o, i) {
          return '<button class="pr-opt" id="pro' + i + '" onclick="PARUS.pick4(' + i + ')">' + esc(o.t) + '</button>';
        }).join('') +
        '<button class="pr-primary" id="prGo" disabled onclick="PARUS.check4()">Проверить пару</button>' +
        '<div id="prFb"></div>' +
      '</div>';
  }
  function pick4(i) {
    if (ST.answered) return;
    var at = ST.picked.indexOf(i);
    if (at >= 0) ST.picked.splice(at, 1);
    else { if (ST.picked.length >= 2) return; ST.picked.push(i); }
    var t = ST.tasks[ST.i];
    t._cards.forEach(function (_, j) {
      var b = document.getElementById('pro' + j);
      if (b) b.classList.toggle('sel', ST.picked.indexOf(j) >= 0);
    });
    var go = document.getElementById('prGo');
    if (go) go.disabled = ST.picked.length !== 2;
    vibe(12);
  }
  function check4() {
    if (ST.answered || ST.picked.length !== 2) return;
    ST.answered = true;
    var t = ST.tasks[ST.i];
    var kinds = ST.picked.map(function (i) { return t._cards[i].kind; }).sort();
    var ok = kinds[0] === 'cake' && kinds[1] === 'tiger';
    if (ok) ST.score++;
    vibe(ok ? 30 : 70);
    t._cards.forEach(function (o, j) {
      var b = document.getElementById('pro' + j);
      if (!b) return;
      b.disabled = true;
      var chosen = ST.picked.indexOf(j) >= 0;
      if (o.kind === 'cake' || o.kind === 'tiger') b.classList.add('ok');
      else if (chosen) b.classList.add('bad');
      if (chosen || o.kind === 'cake' || o.kind === 'tiger') b.innerHTML += '<div class="pr-why">' + esc(o.why) + '</div>';
    });
    var go = document.getElementById('prGo'); if (go) go.style.display = 'none';
    var fb = document.getElementById('prFb');
    if (fb) fb.innerHTML = '<div class="pr-card"><b>' + (ok ? 'Пара собрана.' : 'Пара не сложилась.') + '</b><div class="pr-why">' + esc(t.d) + '</div></div>' +
      '<button class="pr-primary" onclick="PARUS.next()">Дальше</button>';
  }

  // ---------- рейс 5 ----------
  function renderR5(c) {
    var task = ST.tasks[0];
    c.innerHTML =
      '<div class="pr-wrap">' + header('⛵ Свой парус') +
        '<div class="pr-card pr-sit">' + esc(task) + '</div>' +
        '<div class="pr-card" style="font-size:.88rem;color:#aab3c5">Теперь без вариантов. Опишите свой парус — Фреди разберёт его по правилам курса.</div>' +
        '<div class="pr-lbl">Поток: что здесь уже течёт без вас — и какое у него число?</div>' +
        '<textarea class="pr-input" id="prF1" rows="2" placeholder="Например: каждый вечер 40 жильцов выносят мусор к бакам"></textarea>' +
        '<div class="pr-lbl">🍰 Торт: что манит — и к какому готовому желанию он пришит?</div>' +
        '<textarea class="pr-input" id="prF2" rows="2" placeholder="Что человек получает сразу, без уговоров?"></textarea>' +
        '<div class="pr-lbl">🐯 Тигр: что подпирает сзади? Лучше готовый, чем выдуманный</div>' +
        '<textarea class="pr-input" id="prF3" rows="2" placeholder="Какая потеря или срок уже существуют?"></textarea>' +
        '<button class="pr-primary" id="prGo" onclick="PARUS.submit5()">Поднять парус</button>' +
        '<div id="prFb"></div>' +
      '</div>';
  }
  async function submit5() {
    var f1 = (document.getElementById('prF1') || {}).value || '';
    var f2 = (document.getElementById('prF2') || {}).value || '';
    var f3 = (document.getElementById('prF3') || {}).value || '';
    if ((f1 + f2 + f3).trim().length < 30) { if (window.showToast) window.showToast('Заполните все три поля — хотя бы по фразе', 'info'); return; }
    var go = document.getElementById('prGo');
    if (go) { go.disabled = true; go.textContent = 'Фреди разбирает…'; }
    track('game_round_start', { feature: 'parus', stage: 5, free: true });
    var task = ST.tasks[0];
    var prompt =
      'Ты — Фреди, разбираешь решение ученика по курсу «Парус» (использовать существующие потоки вместо создания с нуля; людей двигает пара «тигр» — что подпирает, и «торт» — что манит).\n\n' +
      'ЗАДАЧА УЧЕНИКА: ' + task + '\n' +
      'ЕГО ПАРУС:\nПоток: ' + f1 + '\nТорт: ' + f2 + '\nТигр: ' + f3 + '\n\n' +
      'Оцени строго по четырём критериям:\n' +
      '1. Поток настоящий и уже течёт без ученика? Есть ли число?\n' +
      '2. Торт пришит к готовому желанию (путь наименьшего сопротивления) или требует уговоров?\n' +
      '3. Тигр реальный (существующая потеря, срок, живой человек), а не выдуманное самонаказание?\n' +
      '4. Пара согласована: тигр гонит именно туда, где стоит торт?\n\n' +
      'Ответь ровно в таком виде, без другого текста:\n' +
      'БАЛЛ: <число от 0 до 10>\n' +
      'СИЛЬНОЕ: <одна фраза, что удалось>\n' +
      'СЛАБОЕ: <одна фраза, где решение проседает>\n' +
      'ПРАВКА: <одна конкретная правка, которая усилит парус>';
    var out = null;
    try {
      var r = await aiGenerate(prompt, { max_tokens: 700, temperature: 0.4 });
      out = (r && (r.content || r.response || r.generated)) || null;
    } catch (e) {}
    var fb = document.getElementById('prFb');
    if (!out) {
      if (go) { go.disabled = false; go.textContent = 'Поднять парус'; }
      if (fb) fb.innerHTML = '<div class="pr-card">Фреди сейчас не на связи — попробуйте через минуту. Введённое не пропадёт.</div>';
      return;
    }
    var score = 5;
    var m = out.match(/БАЛЛ:\s*(\d{1,2})/);
    if (m) score = Math.max(0, Math.min(10, parseInt(m[1], 10)));
    function pick(tag) { var mm = out.match(new RegExp(tag + ':\\s*([^\\n]+)')); return mm ? mm[1].trim() : ''; }
    ST.score = score; ST.total = 10;
    if (go) go.style.display = 'none';
    if (fb) fb.innerHTML =
      '<div class="pr-card">' + sailSVG(score / 10) +
        '<div style="text-align:center;font-weight:700;margin-bottom:8px">' + score + ' из 10</div>' +
        (pick('СИЛЬНОЕ') ? '<div class="pr-why">💪 ' + esc(pick('СИЛЬНОЕ')) + '</div>' : '') +
        (pick('СЛАБОЕ') ? '<div class="pr-why">⚠️ ' + esc(pick('СЛАБОЕ')) + '</div>' : '') +
        (pick('ПРАВКА') ? '<div class="pr-why">🔧 ' + esc(pick('ПРАВКА')) + '</div>' : '') +
      '</div>' +
      '<button class="pr-primary" onclick="PARUS.finish5()">Завершить рейс</button>';
  }
  function finish5() { ST.i = 1; finish(); }

  // ---------- переходы и финал ----------
  function next() { ST.answered = false; ST.r3q = 0; ST.i++; render(); }

  function stageTotal() {
    if (ST.stage === 3) return ST.total || 1;          // 3 вопроса + вердикт на идею
    if (ST.stage === 5) return 10;
    return ST.tasks.length;
  }

  function finish() {
    var c = container(); if (!c) return;
    var total = stageTotal();
    var score10 = Math.round(ST.score / total * 10);
    var p = loadProg();
    p.plays++;
    if (p.best[ST.stage] == null || score10 > p.best[ST.stage]) p.best[ST.stage] = score10;
    var passed = score10 >= 7;
    if (passed && ST.stage < 5 && p.unlocked === ST.stage) p.unlocked = ST.stage + 1;
    saveProg(p);
    track('game_round_finish', { feature: 'parus', stage: ST.stage, score: ST.score, total: total });
    var st = STAGES[ST.stage - 1];
    var line = passed
      ? (ST.stage === 5 ? 'Вы прошли путь от выбора из вариантов до собственного паруса. Дальше — разведка в жизни: три потока вокруг вас за неделю.' : 'Рейс пройден. Следующий открыт.')
      : 'Ветра не хватило — нужно 7 из 10. Пройдите рейс ещё раз: задания объясняют себя, второй заход почти всегда сильнее.';
    c.innerHTML =
      '<div class="pr-wrap" style="text-align:center">' +
        sailSVG(score10 / 10) +
        '<div class="pr-h">' + st.icon + ' Рейс ' + ST.stage + ' — ' + score10 + '/10' + (passed ? ' ✅' : '') + '</div>' +
        '<div class="pr-card" style="text-align:left">' + esc(line) + '</div>' +
        (passed && ST.stage < 5
          ? '<button class="pr-primary" onclick="PARUS.start(' + (ST.stage + 1) + ')">' + STAGES[ST.stage].icon + ' Рейс ' + (ST.stage + 1) + '. ' + esc(STAGES[ST.stage].name) + '</button>'
          : '<button class="pr-primary" onclick="PARUS.start(' + ST.stage + ')">🔁 Ещё раз</button>') +
        '<button class="pr-ghost" onclick="PARUS.home()">Ко всем рейсам</button>' +
      '</div>';
  }

  window.PARUS = {
    home: home, start: start, next: next,
    pick1: pick1, pick2: pick2,
    pick3: pick3, next3: next3, verdict3: verdict3,
    pick4: pick4, check4: check4,
    submit5: submit5, finish5: finish5,
    getState: function () { return ST; }
  };
  window.showParusGame = home;
  console.log('✅ parus.js loaded (игра «Парус»: потоки, тигр и торт)');
})();
