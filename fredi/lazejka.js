// ============================================
// lazejka.js — Игра «Лазейка».
//
// Навык здесь нейтральный, как вилка: читать систему правил и находить,
// что она на самом деле разрешает. Игра ничему не учит про мораль и
// никого не называет хитрецом — она показывает, как устроена гонка
// между правилом и обходом, и даёт в ней потренироваться.
//
// Опоры (всё проверяемое, ничего выдуманного):
//   Сьютс: играть — значит добровольно преодолевать необязательные
//     препятствия. Правило не враг, оно создаёт пространство игры.
//   Скиннер: поведение, ведомое словесным правилом, теряет
//     чувствительность к изменившейся реальности. Прощупывать правило —
//     это восстанавливать контакт с ней, а не жульничать.
//   Работа по правилам (итальянская забастовка): безупречное соблюдение
//     буквы — реальная профсоюзная тактика. «По букве» бывает силой.
//   Гудхарт: как только мера становится целью, она перестаёт быть
//     хорошей мерой.
//   Спидраннинг: глитч не читерство — всё зависит от категории, и
//     категорию выбирает сам игрок. Отсюда категории вместо оценок.
//   Nomic (Субер): изменение правил — это ход. Отсюда «Гонка».
//
// Два направления:
//   Гонка    — правило даёт Фреди. Ты находишь ход, автор латает
//              формулировку под твой ход, ты ищешь снова. Текст правила
//              растёт на глазах. Счёт — сколько кругов продержался.
//   Заплатка — правило пишешь ты, Фреди его обходит. Обратное кресло.
//
// Сценарии статикой, ИИ судит и переписывает правило: круг = один вызов.
// Экспорт: window.showLazejkaGame, window.LAZEJKA
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function words(s) { s = (s || '').trim(); return s ? s.split(/\s+/).length : 0; }
  function plural(n, f) {
    var n100 = n % 100, n10 = n % 10;
    if (n100 >= 11 && n100 <= 14) return f[2];
    return n10 === 1 ? f[0] : (n10 >= 2 && n10 <= 4) ? f[1] : f[2];
  }
  var KRUG = ['круг', 'круга', 'кругов'];
  var SLOVO = ['слово', 'слова', 'слов'];
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function toTop() { try { var s = container(); if (s) s.scrollTop = 0; } catch (e) {} }

  // Сценарии не должны повторяться на второй партии. Чистый random при
  // 14 правилах давал 92% шанс повтора уже за 8 раундов — человек решал,
  // что контент кончился, хотя видел треть. Держим список недавних.
  function pickFresh(arr, key, keep) {
    var seen = [];
    try { seen = JSON.parse(localStorage.getItem(key) || '[]') || []; } catch (e) { seen = []; }
    var free = [], i;
    for (i = 0; i < arr.length; i++) if (seen.indexOf(i) < 0) free.push(i);
    if (!free.length) { seen = []; for (i = 0; i < arr.length; i++) free.push(i); }
    var idx = free[Math.floor(Math.random() * free.length)];
    seen.push(idx);
    while (seen.length > keep) seen.shift();
    try { localStorage.setItem(key, JSON.stringify(seen)); } catch (e) {}
    return arr[idx];
  }

  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 480, temperature: opts.temperature == null ? 0.8 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ---------------------------------------------------------------
  // ГОНКА: стартовое правило и цели. Цели никак не размечены — цель
  // это просто цель, а не повод для оценки игрока.
  // ---------------------------------------------------------------
  var OBHOD = [
    { ctx: 'Дом', em: '🏠', rule: 'За столом никаких телефонов.',
      goals: ['Ждёте звонка из клиники с результатом анализа.',
              'Хотите показать сестре видео прямо сейчас.',
              'Хотите посмотреть, кто написал.'] },
    { ctx: 'Дом', em: '🏠', rule: 'Пока не уберёте в комнате — из дома не выходите.',
      goals: ['Через сорок минут последняя электричка к другу.',
              'Зовут гулять.',
              'Хотите уйти, потому что дома опять скандал.'] },
    { ctx: 'Работа', em: '💼', rule: 'Отпуск согласуется за месяц, без исключений.',
      goals: ['Завтра у отца операция.',
              'Горят дешёвые билеты, других таких не будет.',
              'Вы выгорели и объяснять это не хотите.'] },
    { ctx: 'Работа', em: '💼', rule: 'Планёрка по понедельникам в 9:00, присутствуют все.',
      goals: ['В 9:00 вы отводите ребёнка в сад, переложить не на кого.',
              'Планёрка бесполезная, вы на ней просто сидите.',
              'Хотите работать из другого часового пояса.'] },
    { ctx: 'Работа', em: '💼', rule: 'Оценка отдела — по числу закрытых заявок в месяц.',
      goals: ['Ваши заявки сложные и закрываются долго.',
              'Хотите, чтобы отдел перестали дёргать проверками.',
              'Хотите премию.'] },
    { ctx: 'Дети', em: '🎒', rule: 'Уроки сразу после школы, до всего остального.',
      goals: ['У вас тренировка, которую нельзя пропустить.',
              'Хотите сначала поесть и полежать.',
              'Хотите доиграть матч, который начали на перемене.'] },
    { ctx: 'Дети', em: '🎒', rule: 'В будни никаких игр.',
      goals: ['Через игру вы общаетесь с другом, который переехал.',
              'Обещали команде турнир в среду.',
              'День был тяжёлый, и хочется.'] },
    { ctx: 'Деньги', em: '💰', rule: 'В этом месяце никаких трат сверх списка.',
      goals: ['Развалились единственные ботинки.',
              'У сестры день рождения.',
              'Увидели скидку, которой больше не будет.'] },
    { ctx: 'Деньги', em: '💰', rule: 'Кредитку убираем и не трогаем до зарплаты.',
      goals: ['Надо оплатить лекарство.',
              'Сгорит бронь, если не оплатить сегодня.',
              'Готовить сил нет, хочется заказать доставку.'] },
    { ctx: 'Пара', em: '💬', rule: 'Мы договорились: телефоны друг друга не смотрим.',
      goals: ['Он в душе, а вам срочно нужен номер его мамы.',
              'Вам кажется, что вам врут.',
              'Хотите стереть свой сюрприз, который там случайно сохранился.'] },
    { ctx: 'Пара', em: '💬', rule: 'Ссоримся — из дома не уходим и молчанием не наказываем.',
      goals: ['Вас трясёт, и говорить вы сейчас не можете.',
              'Хотите взять паузу, чтобы не наговорить лишнего.',
              'Хотите, чтобы он почувствовал, каково это.'] },
    { ctx: 'Сам с собой', em: '🪞', rule: 'После 23:00 телефон в руки не беру.',
      goals: ['Завтра рано вставать, надо поставить будильник.',
              'Ждёте сообщения от человека из другого часового пояса.',
              'Осталось двадцать минут серии.'] },
    { ctx: 'Сам с собой', em: '🪞', rule: 'Никакого сладкого в будни.',
      goals: ['На работе принесли торт, отказ будет заметен.',
              'День был тяжёлый.',
              'Вы решили, что «будни» — понятие растяжимое.'] },
    { ctx: 'Онлайн', em: '📱', rule: 'Рабочий чат: только по делу и только в рабочее время.',
      goals: ['У коллеги горит, вы знаете ответ, но сейчас 22:00.',
              'Хотите поздравить коллегу с рождением дочери.',
              'Хотите, чтобы начальник увидел, что вы работаете поздно.'] },
    { ctx: 'Работа', em: '⚙️', rule: 'Каждую операцию выполнять строго по инструкции, без отступлений.',
      goals: ['Хотите, чтобы начальство заметило, какая инструкция кривая.',
              'Вам надоело делать чужую работу сверх своей.',
              'Хотите закончить смену вовремя.'] },
    { ctx: 'Быт', em: '🏢', rule: 'Объявление в подъезде: коляски на площадке не оставлять.',
      goals: ['Лифта нет, ребёнок на руках, коляска в квартиру не входит.',
              'Таскать тяжело, а места на площадке полно.',
              'Все оставляют, и вы не хотите быть единственным исключением.'] }
  ];

  // ---------------------------------------------------------------
  // ЗАПЛАТКА: обратное кресло. Ситуация и тот, кого играет Фреди.
  // ---------------------------------------------------------------
  var ZAPLATKA = [
    { ctx: 'Дети', em: '🎒',
      sit: 'Подросток обещал садиться за уроки сразу после школы. Садится — и три часа смотрит в стену.',
      persona: 'пятнадцатилетний, который формально выполняет всё, о чём договорились' },
    { ctx: 'Дети', em: '🎒',
      sit: 'В лагере после отбоя дети уходят купаться на озеро.',
      persona: 'подросток в лагере, для которого запрет — это интересная задача' },
    { ctx: 'Работа', em: '💼',
      sit: 'В команде сроки называют с потолка, потом всё съезжает, и виноватых нет.',
      persona: 'разработчик, который научился не подставляться' },
    { ctx: 'Работа', em: '💼',
      sit: 'Сотрудники берут больничный по пятницам подозрительно часто.',
      persona: 'сотрудник, который иногда правда болеет и правда любит длинные выходные' },
    { ctx: 'Работа', em: '⚙️',
      sit: 'Ввели показатель «число закрытых заявок» — и его начали накручивать мелочью.',
      persona: 'руководитель отдела, которому надо показать цифру' },
    { ctx: 'Пара', em: '💬',
      sit: 'Договорились делить расходы поровну — а по факту один платит за всё крупное.',
      persona: 'партнёр, который искренне считает, что всё и так честно' },
    { ctx: 'Дом', em: '🏠',
      sit: 'Уговор: посуду моет тот, кто не готовил. Посуда стоит в раковине сутками.',
      persona: 'взрослый человек, который очень занят и очень устал' },
    { ctx: 'Сам с собой', em: '🪞',
      sit: 'Обещал себе ходить в зал три раза в неделю. Ходишь — но по двадцать минут и не выпуская телефон.',
      persona: 'вы сами, только честный вслух' },
    { ctx: 'Деньги', em: '💰',
      sit: 'Решили не заказывать доставку еды чаще двух раз в месяц. Заказываете всё равно.',
      persona: 'один из двоих, и каждый считает свои заказы отдельно' },
    { ctx: 'Онлайн', em: '📱',
      sit: 'В семейном чате круглосуточно пересылают ерунду, важное тонет.',
      persona: 'родственник, уверенный, что пересылает исключительно важное' },
    { ctx: 'Школа', em: '🏫',
      sit: 'Учитель ввёл: телефоны сдаём в коробку на входе в класс.',
      persona: 'ученик, у которого есть второй телефон' }
  ];

  // ---------------------------------------------------------------
  // РАЗВЕДКА: правило спрятано. Механика Zendo — вы предлагаете пробы,
  // в ответ только «можно» или «нельзя», и по отметкам нащупываете
  // формулировку.
  //
  // Так это и устроено в жизни: свод правил семьи, отдела или пары никто
  // не выдаёт на входе. Его узнают, наступая. Все правила ниже —
  // настоящего вида: невысказанные, но работающие.
  //
  // rule должно быть достаточно чётким, чтобы «можно/нельзя» на любую
  // пробу получалось одинаковым. Расплывчатое правило ломает механику.
  // ---------------------------------------------------------------
  var RAZVEDKA = [
    { ctx: 'Семья', em: '🏠',
      setup: 'Вы впервые остались в этом доме надолго. Правил вслух не говорят, но они есть.',
      rule: 'Можно всё, что не производит звука после 22:00. Днём ограничений нет.' },
    { ctx: 'Семья', em: '🏠',
      setup: 'В этой семье что-то можно брать без спроса, а что-то нельзя, и логика не очевидна.',
      rule: 'Можно брать всё общее и расходуемое (еда, посуда, бытовые мелочи). Нельзя трогать личные вещи любого члена семьи, даже мелочь, даже с самыми добрыми намерениями.' },
    { ctx: 'Работа', em: '💼',
      setup: 'Вы новый человек в команде. Формальных регламентов нет, но что-то явно принято, а что-то нет.',
      rule: 'Можно всё, о чём предупредил заранее. Нельзя ставить перед фактом — даже когда решение само по себе безобидное.' },
    { ctx: 'Работа', em: '💼',
      setup: 'В отделе есть негласная граница между «нормально» и «так не делают».',
      rule: 'Можно ошибаться и признавать ошибки. Нельзя перекладывать ответственность на другого человека, даже мягко и вскользь.' },
    { ctx: 'Пара', em: '💬',
      setup: 'Вы вместе недавно. Границы не проговаривались.',
      rule: 'Можно всё, что вы готовы сами рассказать партнёру. Нельзя то, что вы стали бы скрывать, — даже если оно совершенно невинное.' },
    { ctx: 'Пара', em: '💬',
      setup: 'В этой паре ссорятся редко, но по каким-то поводам — мгновенно.',
      rule: 'Можно спорить о чём угодно и как угодно резко. Нельзя привлекать третьих лиц: сравнивать с другими, ссылаться на чужое мнение, обсуждать партнёра с кем-то ещё.' },
    { ctx: 'Дети', em: '🎒',
      setup: 'Подросток живёт по каким-то своим правилам, и они довольно последовательны.',
      rule: 'Можно всё, что он выбрал сам. Нельзя то же самое, если это ему предложил или посоветовал взрослый.' },
    { ctx: 'Чат', em: '📱',
      setup: 'Вас добавили в рабочий чат. Люди пишут по-разному, но что-то тут явно не принято.',
      rule: 'Можно писать когда угодно и сколько угодно. Нельзя писать так, чтобы ответа ждали немедленно: без вопросов в лоб конкретному человеку и без сообщений, требующих реакции прямо сейчас.' },
    { ctx: 'Деньги', em: '💰',
      setup: 'В этой компании друзей есть негласный порядок обращения с деньгами.',
      rule: 'Можно тратить сколько угодно на общее. Нельзя создавать долг между двумя конкретными людьми — ни в какую сторону и ни на какую сумму.' },
    { ctx: 'Сам с собой', em: '🪞',
      setup: 'Вы замечаете, что сами себе что-то разрешаете, а что-то нет, и правило довольно чёткое.',
      rule: 'Можно всё, что решено заранее. Нельзя то же самое, если решение принято в момент желания.' }
  ];

  // ---------------------------------------------------------------
  // Категории прохождения — как в спидраннинге. Это не оценка игрока и
  // не шкала добродетели: это ограничение, которое он сам на себя берёт,
  // и в котором соревнуется. У каждой категории свой рекорд.
  // ---------------------------------------------------------------
  var CATS = {
    any: { em: '🏁', name: 'Как получится', short: 'важен результат',
      rule: 'Категория «как получится»: засчитывается результат. Формальные трюки, буквоедство и игра на неточности формулировки разрешены. Ход не прошёл только если он прямо нарушает текст правила.' },
    clean: { em: '🎯', name: 'Без трюков', short: 'по смыслу, не по тексту',
      rule: 'Категория «без трюков»: игрок сам ограничил себя — ход должен работать и по смыслу правила, а не только по его тексту. Если ход держится исключительно на неточности формулировки, он не прошёл. Это ограничение категории, а не упрёк.' },
    full: { em: '💎', name: 'Всё целиком', short: 'цель, правило и отношения',
      rule: 'Категория «всё целиком»: ход проходит, только если разом выполнены три условия — цель взята, текст правила не нарушен, и человек, поставивший правило, узнав про этот ход, не почувствовал бы себя обойдённым. Не выполнено одно — ход не прошёл.' }
  };
  var CAT_ORDER = ['any', 'clean', 'full'];

  var MAX_ROUNDS = 5;   // потолок гонки
  var MAX_PATCH = 3;    // попыток залатать в «Заплатке»

  var ST = { cat: 'any', dir: '', busy: false, done: true, own: false,
             sc: null, goal: '', rule0: '', rule: '', rounds: [],
             sit: null, rules: [], holes: [],
             hid: null, probes: [] };
  var _rec = { on: false, savedT: null, savedC: null };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('lazejka_stats2') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { races: 0, best: {}, patched: 0, held: 0, grown: 0, scouts: 0, fewest: 0 }; }
  function saveStats(s) { try { localStorage.setItem('lazejka_stats2', JSON.stringify(s)); } catch (e) {} }
  function loadCat() { try { var c = localStorage.getItem('lazejka_cat'); if (CATS[c]) return c; } catch (e) {} return 'any'; }
  function saveCat(c) { try { localStorage.setItem('lazejka_cat', c); } catch (e) {} ST.cat = c; }
  function recordRace(cat, survived, growth) {
    var s = loadStats();
    s.races = (s.races || 0) + 1;
    s.best = s.best || {};
    if (survived > (s.best[cat] || 0)) s.best[cat] = survived;
    if (growth > (s.grown || 0)) s.grown = growth;
    saveStats(s); return s;
  }
  function recordPatch(held) { var s = loadStats(); s.patched = (s.patched || 0) + 1; if (held) s.held = (s.held || 0) + 1; saveStats(s); return s; }
  function recordScout(probes, exact) {
    var s = loadStats();
    s.scouts = (s.scouts || 0) + 1;
    // Рекорд — угадать за меньшее число проб. Считаем только точное
    // попадание: иначе «рекорд 1» можно поставить, сдавшись сразу.
    if (exact && (!s.fewest || probes < s.fewest)) s.fewest = probes;
    saveStats(s); return s;
  }

  function injectCSS() {
    if (document.getElementById('lzCSS')) return;
    var s = document.createElement('style'); s.id = 'lzCSS';
    s.textContent = [
      '.lz-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.lz-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.lz-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:16px}',
      // display:block — иначе следующая за кнопкой плашка «круг N · ход
      // прошёл» (inline-block) садится на ту же строку и наезжает на «меню».
      '.lz-ghost{display:block;background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px;text-align:left}',
      '.lz-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.lz-ch{font-weight:700;margin-bottom:8px}',
      '.lz-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.lz-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.lz-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.lz-stat b{display:block;font-size:1.35rem;font-weight:800;color:#2dd4bf}',
      '.lz-stat span{font-size:.72rem;color:#9ca3af}',
      '.lz-cats{display:flex;gap:8px;margin:0 0 6px}',
      '.lz-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:9px 4px;cursor:pointer;font-size:.8rem;font-weight:600;color:#c8ccd4;line-height:1.3}',
      '.lz-chip.on{border-color:#14b8a6;background:rgba(45,212,191,.16);color:#fff}',
      '.lz-chip i{display:block;font-style:normal;font-size:.68rem;font-weight:400;color:#9ca3af;margin-top:2px}',
      '.lz-chip.on i{color:#a7f3d0}',
      '.lz-chip u{display:block;text-decoration:none;font-size:.66rem;color:#5eead4;margin-top:3px}',
      '.lz-cathint{font-size:.82rem;color:#9ca3af;text-align:center;margin:0 0 14px;line-height:1.45}',
      '.lz-dirs{display:flex;gap:10px;margin:0 0 14px}',
      '.lz-dir{flex:1;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:16px;padding:14px 12px;cursor:pointer;text-align:left}',
      '.lz-dir b{display:block;font-size:1rem;margin-bottom:4px}',
      '.lz-dir span{font-size:.82rem;color:#9ca3af;line-height:1.4}',
      '.lz-tag{display:inline-block;font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5eead4;margin-bottom:7px}',
      '.lz-rule{border:1px solid rgba(45,212,191,.4);background:linear-gradient(160deg,rgba(45,212,191,.13),rgba(45,212,191,.03));border-radius:16px;padding:18px 20px;margin:0 0 10px}',
      '.lz-rule .r{font-size:1.12rem;font-weight:700;line-height:1.45}',
      '.lz-rule .w{font-size:.72rem;color:#5eead4;margin-top:8px;font-weight:400}',
      '.lz-goal{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);border-radius:16px;padding:16px 18px;margin:0 0 12px}',
      '.lz-goal .g{font-size:1.02rem;line-height:1.5}',
      '.lz-where{font-size:.82rem;color:#9ca3af;margin:0 0 10px}',
      '.lz-ta{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:12px;font-size:1rem;color:#f2f3f5;font-family:inherit;resize:none;min-height:106px;margin:0 0 10px}',
      '.lz-ta:focus{outline:none;border-color:#14b8a6}',
      '.lz-microw{display:flex;gap:8px;align-items:center;margin:0 0 10px}',
      '.lz-mic{flex:0 0 46px;height:46px;border-radius:50%;border:none;background:linear-gradient(135deg,#10b981,#0e8f6f);color:#fff;font-size:1.2rem;cursor:pointer}',
      '.lz-mic.rec{background:linear-gradient(135deg,#ef4444,#b91c1c)}.lz-mic.off{opacity:.4}',
      '.lz-miclabel{color:#9ca3af;font-size:.85rem}',
      '.lz-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#04241f;cursor:pointer;background:linear-gradient(135deg,#2dd4bf,#0ea5e9);box-shadow:0 8px 22px rgba(45,212,191,.3);margin:0 0 10px}',
      '.lz-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.lz-row{display:flex;gap:10px}.lz-row>*{flex:1;margin-bottom:0}',
      '.lz-mark{display:inline-block;font-size:.75rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-radius:8px;padding:4px 9px;margin-bottom:8px}',
      '.lz-mark.ok{background:rgba(45,212,191,.18);color:#5eead4}',
      '.lz-mark.no{background:rgba(148,163,184,.18);color:#cbd5e1}',
      '.lz-verdict{background:linear-gradient(135deg,rgba(45,212,191,.12),rgba(14,165,233,.04));border:1px solid rgba(45,212,191,.4);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6;font-size:.97rem}',
      '.lz-next{background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.35);border-radius:14px;padding:13px 16px;margin:0 0 12px;font-size:.93rem;line-height:1.55;color:#bae6fd}',
      '.lz-patched{background:rgba(250,204,21,.08);border:1px solid rgba(250,204,21,.38);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.55}',
      '.lz-patched .who{font-size:.72rem;color:#fde68a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px}',
      '.lz-patched .nr{font-weight:700;font-size:1.02rem;line-height:1.45}',
      '.lz-hole{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.35);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6;font-size:.97rem}',
      '.lz-hole .who{font-size:.75rem;color:#fca5a5;text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px}',
      '.lz-punch{margin-top:10px;padding-top:9px;border-top:1px solid rgba(239,68,68,.28);font-weight:700;color:#fecaca;line-height:1.45}',
      '.lz-held{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.4);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.lz-mine{border-left:3px solid rgba(45,212,191,.5);padding:4px 0 4px 12px;margin:0 0 12px;color:#c8ccd4;white-space:pre-wrap;line-height:1.55}',
      '.lz-step{font-size:.8rem;color:#9ca3af;text-align:center;margin:0 0 10px}',
      '.lz-typing{color:#8b93a7;font-size:.92rem;padding:8px 2px}',
      '.lz-log{border:1px solid rgba(255,255,255,.09);border-radius:14px;margin:0 0 12px;overflow:hidden}',
      '.lz-log summary{cursor:pointer;padding:11px 15px;font-size:.88rem;color:#9ca3af;background:rgba(255,255,255,.03);list-style:none}',
      '.lz-log summary::-webkit-details-marker{display:none}',
      '.lz-log .in{padding:12px 15px 4px}',
      '.lz-growth{display:flex;gap:10px;align-items:stretch;margin:0 0 12px}',
      '.lz-growth>div{flex:1;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:13px 15px;font-size:.9rem;line-height:1.5;color:#c8ccd4}',
      '.lz-growth b{display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:.07em;color:#9ca3af;margin-bottom:6px;font-weight:700}',
      // Доска проб «Разведки»: отметки видны все сразу — именно по ним
      // и нащупывается правило, как по камням в Zendo.
      '.lz-board{border:1px solid rgba(255,255,255,.1);border-radius:14px;margin:0 0 12px;overflow:hidden}',
      '.lz-pr{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);font-size:.94rem;line-height:1.45}',
      '.lz-pr:last-child{border-bottom:none}',
      '.lz-pr i{flex:0 0 auto;font-style:normal;font-weight:700;font-size:.82rem}',
      '.lz-pr.y{background:rgba(45,212,191,.07)}.lz-pr.y i{color:#2dd4bf}',
      '.lz-pr.n{background:rgba(148,163,184,.07)}.lz-pr.n i{color:#94a3b8}',
      '.lz-hidden{border:1px dashed rgba(148,163,184,.5);border-radius:16px;padding:16px 18px;margin:0 0 12px;text-align:center;color:#9ca3af;font-size:.95rem;line-height:1.5}',
      '.lz-reveal{border:1px solid rgba(45,212,191,.45);background:linear-gradient(160deg,rgba(45,212,191,.14),rgba(45,212,191,.03));border-radius:16px;padding:18px 20px;margin:0 0 12px}',
      '.lz-reveal .r{font-size:1.06rem;font-weight:700;line-height:1.45;margin-top:6px}',
      '.lz-soft{border:1px solid rgba(148,163,184,.4);background:rgba(148,163,184,.08);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6;font-size:.96rem}',
      '.lz-form label{display:block;font-size:.8rem;color:#9ca3af;margin:0 0 6px}',
      '[data-theme="light"] .lz-pr.y{background:rgba(45,212,191,.12)}',
      '[data-theme="light"] .lz-pr.n{background:rgba(148,163,184,.14)}',
      '[data-theme="light"] .lz-hidden,[data-theme="light"] .lz-form label{color:#5b6472}',
      '.lz-course{display:block;text-align:center;font-size:.85rem;color:#5eead4;text-decoration:none;margin-top:14px}',
      '.lz-src{font-size:.78rem;color:#8b93a7;line-height:1.5;margin-top:12px}',
      '[data-theme="light"] .lz-wrap{color:#1f2430}',
      '[data-theme="light"] .lz-lead,[data-theme="light"] .lz-li,[data-theme="light"] .lz-mine,[data-theme="light"] .lz-growth>div{color:#4b5566}',
      '[data-theme="light"] .lz-ghost,[data-theme="light"] .lz-where,[data-theme="light"] .lz-cathint,',
      '[data-theme="light"] .lz-step,[data-theme="light"] .lz-typing,[data-theme="light"] .lz-src,',
      '[data-theme="light"] .lz-miclabel,[data-theme="light"] .lz-dir span,[data-theme="light"] .lz-log summary,',
      '[data-theme="light"] .lz-stat span,[data-theme="light"] .lz-chip i,[data-theme="light"] .lz-growth b{color:#5b6472}',
      '[data-theme="light"] .lz-chip.on i{color:#0f766e}',
      '[data-theme="light"] .lz-tag,[data-theme="light"] .lz-chip u{color:#0f766e}',
      '[data-theme="light"] .lz-next{color:#0c4a6e}',
      '[data-theme="light"] .lz-punch{color:#9f1239}',
      '[data-theme="light"] .lz-patched .who{color:#92400e}',
      '[data-theme="light"] .lz-card,[data-theme="light"] .lz-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .lz-secondary,[data-theme="light"] .lz-chip,[data-theme="light"] .lz-ta,[data-theme="light"] .lz-dir,[data-theme="light"] .lz-goal{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.lz-wrap{padding:14px 12px 96px}.lz-rule .r{font-size:1.02rem}.lz-dirs{flex-direction:column}.lz-growth{flex-direction:column}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------
  // Меню
  // ---------------------------------------------------------------
  function home() {
    injectCSS(); stopVoice(); ST.done = true; ST.cat = loadCat();
    track('feature_opened', { feature: 'lazejka' });
    var c = container(); if (!c) return;
    var s = loadStats(), head = '';
    if (s.races || s.patched || s.scouts) {
      var b = s.best || {};
      head = '<div class="lz-stats">' +
          '<div class="lz-stat"><b>' + (b[ST.cat] || 0) + '</b><span>рекорд ' + plural(b[ST.cat] || 0, KRUG) + '<br>в этой категории</span></div>' +
          '<div class="lz-stat"><b>' + (s.grown ? '×' + s.grown : '—') + '</b><span>во столько раз<br>раздувалось правило</span></div>' +
          '<div class="lz-stat"><b>' + (s.fewest || '—') + '</b><span>' + (s.fewest ? plural(s.fewest, ['проба', 'пробы', 'проб']) : 'проб') + '<br>до разгадки</span></div>' +
        '</div>';
    }
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="lz-h1">🕳️ Лазейка</div>' +
        '<div class="lz-lead">Читать систему правил и видеть, что она на самом деле разрешает, — это навык. Как вилка: ей едят и ей же можно ткнуть. Игра не судит, как вы им пользуетесь, — она даёт в нём потренироваться и показывает, как устроена гонка между правилом и обходом.</div>' +
        head +
        '<div class="lz-dirs">' +
          '<div class="lz-dir" onclick="LAZEJKA.startRace()"><b>🏃 Гонка</b><span>Правило даёт Фреди. Вы находите ход — автор латает формулировку под ваш ход — вы ищете снова. Счёт: сколько кругов продержались.</span></div>' +
          '<div class="lz-dir" onclick="LAZEJKA.startScout()"><b>🔦 Разведка</b><span>Правило спрятано. Вы пробуете, в ответ только «можно» или «нельзя». Нащупайте формулировку и назовите её.</span></div>' +
        '</div>' +
        '<div class="lz-dirs">' +
          '<div class="lz-dir" onclick="LAZEJKA.startPatch()"><b>🧩 Заплатка</b><span>Обратное кресло: правило пишете вы, а обходит Фреди.</span></div>' +
          '<div class="lz-dir" onclick="LAZEJKA.ownForm()"><b>✍️ Своё правило</b><span>Принесите настоящее — то, под которым живёте, — и свою цель. Дальше та же гонка.</span></div>' +
        '</div>' +
        '<div class="lz-card"><div class="lz-ch">Категория прохождения</div>' +
          '<div class="lz-cats">' + CAT_ORDER.map(function (k) {
            var rec = (s.best || {})[k];
            return '<div class="lz-chip' + (ST.cat === k ? ' on' : '') + '" onclick="LAZEJKA.setCat(\'' + k + '\')">' +
                   CATS[k].em + ' ' + esc(CATS[k].name) + '<i>' + esc(CATS[k].short) + '</i>' +
                   (rec ? '<u>рекорд ' + rec + '</u>' : '') + '</div>';
          }).join('') + '</div>' +
          '<div class="lz-cathint">Как в спидраннинге: категорию выбираете вы сами. Это не шкала правильности, а ограничение, в котором вы соревнуетесь. У каждой свой рекорд.</div>' +
        '</div>' +
        '<div class="lz-card"><div class="lz-ch">Почему это навык, а не хитрость</div>' +
          '<div class="lz-li">Работа по правилам — реальная забастовочная тактика: делать ровно то, что написано в инструкции, и ничего сверх. Производство встаёт, а придраться не к чему. «По букве» бывает силой.</div>' +
          '<div class="lz-li">Скиннер различал поведение, выученное на последствиях, и поведение, ведомое словесным правилом. У второго есть известная беда: оно перестаёт замечать, что реальность изменилась. Человек, который годами соблюдает правило, давно потерявшее смысл, не добродетелен — он просто перестал смотреть.</div>' +
          '<div class="lz-li">Прощупать правило — это и значит посмотреть заново. Что делать с увиденным, решаете вы.</div>' +
        '</div>' +
        '<a class="lz-course" href="/blog/lektorij/triz/" target="_blank" rel="noopener">🎓 Теория — курс «ТРИЗ»: взять своё, не нарушив ограничение</a>' +
      '</div>';
    toTop();
  }
  function setCat(k) { if (!CATS[k]) return; saveCat(k); vibe(20); home(); }

  // ---------------------------------------------------------------
  // ГОНКА
  // ---------------------------------------------------------------
  function startRace() {
    injectCSS(); ST.dir = 'race'; ST.own = false; ST.cat = loadCat();
    ST.sc = pickFresh(OBHOD, 'lazejka_seen_race', Math.max(3, OBHOD.length - 5));
    ST.goal = ST.sc.goals[Math.floor(Math.random() * ST.sc.goals.length)];
    ST.rule0 = ST.sc.rule; ST.rule = ST.sc.rule;
    ST.rounds = []; ST.done = false; ST.busy = false;
    track('game_round_start', { feature: 'lazejka', dir: 'race', cat: ST.cat, ctx: ST.sc.ctx });
    renderRace();
  }

  function raceLog() {
    if (!ST.rounds.length) return '';
    var inner = ST.rounds.map(function (r, i) {
      return '<div style="margin-bottom:14px">' +
        '<div class="lz-mark ' + (r.ok ? 'ok' : 'no') + '">круг ' + (i + 1) + ' · ход ' + (r.ok ? 'прошёл' : 'не прошёл') + '</div>' +
        '<div class="lz-mine">' + esc(r.move) + '</div>' +
        (r.razbor ? '<div style="font-size:.92rem;line-height:1.55;color:#c8ccd4">' + nl(r.razbor) + '</div>' : '') +
        (r.newRule ? '<div class="lz-patched" style="margin-top:10px"><div class="who">правило переписали</div><div class="nr">«' + esc(r.newRule) + '»</div></div>' : '') +
        '</div>';
    }).join('');
    return '<details class="lz-log"><summary>▾ Как мы сюда пришли — ' + ST.rounds.length + ' ' +
           plural(ST.rounds.length, KRUG) + '</summary><div class="in">' + inner + '</div></details>';
  }

  function renderRace() {
    var c = container(); if (!c) return;
    var micOff = !(window.voiceManager && typeof window.voiceManager.startRecording === 'function');
    var n = ST.rounds.length;
    var grew = n > 0 && words(ST.rule) > words(ST.rule0);
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-where">' + ST.sc.em + ' ' + esc(ST.sc.ctx) + ' · категория ' + CATS[ST.cat].em + ' ' + esc(CATS[ST.cat].name) + ' · круг ' + (n + 1) + ' из ' + MAX_ROUNDS + '</div>' +
        raceLog() +
        '<div class="lz-rule"><span class="lz-tag">' + (n ? 'Правило сейчас' : 'Правило') + '</span><div class="r">«' + esc(ST.rule) + '»</div>' +
          (grew ? '<div class="w">было ' + words(ST.rule0) + ' ' + plural(words(ST.rule0), SLOVO) + ', стало ' + words(ST.rule) + '</div>' : '') + '</div>' +
        '<div class="lz-goal"><span class="lz-tag">Ваша цель</span><div class="g">' + esc(ST.goal) + '</div></div>' +
        '<textarea class="lz-ta" id="lzIn" placeholder="' + (n ? 'Формулировку подтянули. Ищите заново…' : 'Как возьмёте своё, не нарушив формулировку?') + '"></textarea>' +
        '<div class="lz-microw"><button class="lz-mic' + (micOff ? ' off' : '') + '" id="lzMic" onclick="LAZEJKA.mic()" title="Говорить вслух">🎤</button><span class="lz-miclabel" id="lzMicLabel">' + (micOff ? 'печатайте ход' : 'или наговорите вслух') + '</span></div>' +
        '<button class="lz-primary" onclick="LAZEJKA.move()">▶ Сделать ход</button>' +
        (n ? '<button class="lz-secondary" onclick="LAZEJKA.endRace()">Хватит — показать итог</button>'
           : '<button class="lz-secondary" onclick="LAZEJKA.startRace()">🎲 Другая пара</button>') +
      '</div>';
    toTop();
  }

  // Ответ приходит размеченным, чтобы разбор, следствие и новую
  // формулировку можно было показать разными блоками, а не абзацем.
  function parseRace(v) {
    function grab(tag, next) {
      var re = new RegExp(tag + ':\\s*([\\s\\S]*?)(?=\\n\\s*(?:' + next + '):|$)', 'i');
      var m = v.match(re); return m ? m[1].trim() : '';
    }
    var ALL = 'ХОД|РАЗБОР|ПОСЛЕДСТВИЕ|НОВОЕ ПРАВИЛО';
    var hod = grab('ХОД', ALL);
    return {
      ok: /прош[её]л/i.test(hod) && !/не\s+прош/i.test(hod),
      razbor: grab('РАЗБОР', ALL),
      posled: grab('ПОСЛЕДСТВИЕ', ALL),
      newRule: grab('НОВОЕ ПРАВИЛО', ALL).replace(/^[«"]|[»"]$/g, '').trim()
    };
  }

  async function move() {
    if (ST.busy || ST.done) return;
    stopVoice();
    var el = document.getElementById('lzIn');
    var mv = (el ? el.value : '').trim();
    if (mv.length < 12) { toast('Опишите ход подробнее — одного слова мало', 'info'); return; }
    ST.busy = true;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<div class="lz-rule"><span class="lz-tag">Правило</span><div class="r">«' + esc(ST.rule) + '»</div></div>' +
        '<div class="lz-card"><div class="lz-ch">Ваш ход</div><div class="lz-mine">' + esc(mv) + '</div></div>' +
        '<div class="lz-typing" id="lzTyping">🔍 Смотрим, что получилось…</div>' +
      '</div>';
    toTop();

    var v = '';
    try {
      var prev = ST.rounds.length
        ? 'Формулировку уже подтягивали ' + ST.rounds.length + ' раз(а). Прежние ходы игрока: ' +
          ST.rounds.map(function (r) { return '«' + r.move + '»'; }).join('; ') + '.'
        : '';
      var p = [
        'Ты ведёшь игру «Лазейка». Игрок ищет способ взять свою цель, не нарушая текст правила, а ты играешь за автора правила, который после каждого удачного хода подтягивает формулировку.',
        'Правил игры два, и они важны. Первое: не оценивай игрока морально. Не называй ход хитростью, жульничеством, манипуляцией; не рассуждай, хороший он человек или плохой; не читай нотаций про доверие и честность. Навык здесь нейтральный. Второе: последствие описывай как реакцию системы, а не как приговор — что произойдёт дальше, а не чего это «стоило».',
        'Контекст: ' + ST.sc.ctx + '.',
        'Текущее правило: «' + ST.rule + '»',
        'Цель игрока: ' + ST.goal,
        CATS[ST.cat].rule,
        prev,
        ST.own ? 'Правило и цель принёс сам игрок — это его настоящая жизнь. Если описанное не ограничение, которое можно разбирать как формулировку, а положение, где человеку причиняют вред: насилие, угрозы, принуждение, запрет видеться с ребёнком или близкими, слежка, отъём документов или денег, — не играй. Вместо всего формата ответь одной строкой «НЕ ИГРА: <одна спокойная фраза о том, что вы увидели>» и ничего больше. Обычные житейские строгости — начальство, родители, режим, деньги, быт — это нормальная игра, их разбирай как всегда.' : '',
        'Ход игрока (расшифровка речи возможна с ошибками — к ним не придирайся): «' + mv + '»',
        'Ответь по-русски, на «вы», строго в таком виде и без лишнего текста:',
        'ХОД: прошёл — или — ХОД: не прошёл',
        'РАЗБОР: 2–4 строки. За какую именно часть формулировки зацепился ход и взята ли цель. Если ход не прошёл — что именно из условий категории он нарушил.',
        'ПОСЛЕДСТВИЕ: 1–2 строки. Что теперь произойдёт: как отреагирует человек или система. Спокойная констатация, без оценок.',
        'НОВОЕ ПРАВИЛО: одна формулировка, закрывающая ровно этот ход и сохраняющая прежние заплатки. Пиши её целиком, как она теперь звучит. Строку давай ТОЛЬКО если ход прошёл.'
      ].filter(Boolean).join('\n');
      var r = await aiGenerate(p, { max_tokens: 500, temperature: 0.8 });
      v = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { v = ''; }
    ST.busy = false;

    if (!v) {
      var t = document.getElementById('lzTyping');
      if (t) t.outerHTML = '<div class="lz-card">Связь подвисла — ход не проверился.</div>' +
        '<button class="lz-secondary" onclick="LAZEJKA.renderRace()">← Вернуться к ходу</button>';
      return;
    }

    var notGame = v.match(/НЕ\s*ИГРА:\s*([\s\S]*)/i);
    if (notGame) { renderNotAGame(notGame[1].trim()); return; }

    var p2 = parseRace(v);
    if (p2.ok && !p2.newRule) p2.newRule = '';   // правило устояло: латать нечего
    ST.rounds.push({ move: mv, ok: p2.ok, razbor: p2.razbor || v, posled: p2.posled, newRule: p2.newRule });
    track('lz_move', { dir: 'race', cat: ST.cat, ctx: ST.sc.ctx, round: ST.rounds.length, ok: p2.ok });

    if (p2.ok && p2.newRule) ST.rule = p2.newRule;
    if (!p2.ok || !p2.newRule || ST.rounds.length >= MAX_ROUNDS) { endRace(); return; }
    if (p2.ok) vibe(30);
    renderRaceStep(p2);
  }

  // Промежуточный экран: что вышло и как подтянули правило.
  function renderRaceStep(p2) {
    var c = container(); if (!c) return;
    var last = ST.rounds[ST.rounds.length - 1];
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-mark ok">круг ' + ST.rounds.length + ' · ход прошёл</div>' +
        '<div class="lz-card"><div class="lz-ch">Ваш ход</div><div class="lz-mine">' + esc(last.move) + '</div></div>' +
        (last.razbor ? '<div class="lz-verdict">' + nl(last.razbor) + '</div>' : '') +
        (last.posled ? '<div class="lz-next"><b>Что теперь будет.</b> ' + nl(last.posled) + '</div>' : '') +
        '<div class="lz-patched"><div class="who">автор правила подтянул формулировку</div><div class="nr">«' + esc(ST.rule) + '»</div>' +
          '<div style="font-size:.78rem;color:#9ca3af;margin-top:8px">было ' + words(ST.rule0) + ' ' + plural(words(ST.rule0), SLOVO) + ' — стало ' + words(ST.rule) + '</div></div>' +
        '<button class="lz-primary" onclick="LAZEJKA.renderRace()">▶ Круг ' + (ST.rounds.length + 1) + ': искать снова</button>' +
        '<button class="lz-secondary" onclick="LAZEJKA.endRace()">Хватит — показать итог</button>' +
      '</div>';
    toTop();
  }

  function endRace() {
    ST.done = true;
    var survived = 0, i;
    for (i = 0; i < ST.rounds.length; i++) if (ST.rounds[i].ok) survived++;
    var w0 = words(ST.rule0), w1 = words(ST.rule);
    var growth = w0 ? Math.round((w1 / w0) * 10) / 10 : 1;
    var st = recordRace(ST.cat, survived, growth);
    track('lz_race_end', { cat: ST.cat, ctx: ST.sc.ctx, survived: survived, growth: growth });

    var lastFail = ST.rounds.length && !ST.rounds[ST.rounds.length - 1].ok ? ST.rounds[ST.rounds.length - 1] : null;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-where">' + ST.sc.em + ' ' + esc(ST.sc.ctx) + ' · ' + CATS[ST.cat].em + ' ' + esc(CATS[ST.cat].name) + '</div>' +
        '<div class="lz-stats">' +
          '<div class="lz-stat"><b>' + survived + '</b><span>' + plural(survived, KRUG) + ' пройдено</span></div>' +
          '<div class="lz-stat"><b>×' + growth + '</b><span>во столько раз<br>выросло правило</span></div>' +
          '<div class="lz-stat"><b>' + ((st.best || {})[ST.cat] || survived) + '</b><span>рекорд<br>в категории</span></div>' +
        '</div>' +
        (lastFail ? '<div class="lz-card"><div class="lz-mark no">последний ход не прошёл</div>' +
                    '<div class="lz-mine">' + esc(lastFail.move) + '</div>' +
                    (lastFail.razbor ? '<div style="font-size:.93rem;line-height:1.55;color:#c8ccd4">' + nl(lastFail.razbor) + '</div>' : '') + '</div>' : '') +
        '<div class="lz-growth">' +
          '<div><b>Было</b>«' + esc(ST.rule0) + '»<div style="font-size:.75rem;color:#9ca3af;margin-top:6px">' + w0 + ' ' + plural(w0, SLOVO) + '</div></div>' +
          '<div><b>Стало</b>«' + esc(ST.rule) + '»<div style="font-size:.75rem;color:#9ca3af;margin-top:6px">' + w1 + ' ' + plural(w1, SLOVO) + '</div></div>' +
        '</div>' +
        raceLog() +
        '<div class="lz-row"><button class="lz-primary" onclick="LAZEJKA.startRace()" style="margin:0">🔁 Ещё гонка</button><button class="lz-secondary" onclick="LAZEJKA.startPatch()">🧩 В другое кресло</button></div>' +
      '</div>';
    toTop();
  }

  // ---------------------------------------------------------------
  // ЗАПЛАТКА
  // ---------------------------------------------------------------
  function startPatch() {
    injectCSS(); ST.dir = 'patch';
    ST.sit = pickFresh(ZAPLATKA, 'lazejka_seen_patch', Math.max(3, ZAPLATKA.length - 4));
    ST.rules = []; ST.holes = [];
    ST.done = false; ST.busy = false;
    track('game_round_start', { feature: 'lazejka', dir: 'patch', ctx: ST.sit.ctx });
    renderPatch();
  }

  function holeHtml(text) {
    var body = text, punch = '';
    var m = text.match(/(^|\n)\s*Дыра:\s*([^\n]+)\s*$/i);
    if (m) { punch = m[2].trim(); body = text.slice(0, m.index).trim(); }
    else if (/Дыры не нашёл/i.test(text)) body = text.replace(/Дыры не нашёл\.?/i, '').trim();
    return '<div class="lz-hole"><div class="who">' + esc(ST.sit.persona) + '</div>' + nl(body) +
           (punch ? '<div class="lz-punch">🕳️ ' + esc(punch) + '</div>' : '') + '</div>';
  }

  function patchHistoryHtml() {
    var h = '';
    for (var i = 0; i < ST.rules.length; i++) {
      h += '<div class="lz-card"><div class="lz-ch">Правило ' + (i + 1) + '</div><div class="lz-mine">' + esc(ST.rules[i]) + '</div>' +
           (ST.holes[i] ? holeHtml(ST.holes[i]) : '') + '</div>';
    }
    return h;
  }

  function renderPatch() {
    var c = container(); if (!c) return;
    var micOff = !(window.voiceManager && typeof window.voiceManager.startRecording === 'function');
    var n = ST.rules.length, first = n === 0;
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-where">' + ST.sit.em + ' ' + esc(ST.sit.ctx) + '</div>' +
        '<div class="lz-rule"><span class="lz-tag">Что надо прекратить</span><div class="r">' + esc(ST.sit.sit) + '</div></div>' +
        patchHistoryHtml() +
        '<div class="lz-step">Попытка ' + (n + 1) + ' из ' + MAX_PATCH + '</div>' +
        '<textarea class="lz-ta" id="lzIn" placeholder="' + (first ? 'Сформулируйте правило, которое это чинит…' : 'Залатайте дыру — перепишите правило целиком…') + '"></textarea>' +
        '<div class="lz-microw"><button class="lz-mic' + (micOff ? ' off' : '') + '" id="lzMic" onclick="LAZEJKA.mic()" title="Говорить вслух">🎤</button><span class="lz-miclabel" id="lzMicLabel">' + (micOff ? 'печатайте правило' : 'или наговорите вслух') + '</span></div>' +
        '<button class="lz-primary" onclick="LAZEJKA.tryRule()">' + (first ? '🧩 Проверить правило' : '🔧 Проверить заплатку') + '</button>' +
        (first ? '<button class="lz-secondary" onclick="LAZEJKA.startPatch()">🎲 Другая ситуация</button>' : '') +
      '</div>';
    toTop();
  }

  async function tryRule() {
    if (ST.busy || ST.done) return;
    stopVoice();
    var el = document.getElementById('lzIn');
    var rule = (el ? el.value : '').trim();
    if (rule.length < 8) { toast('Сформулируйте правило целиком — одной фразой', 'info'); return; }
    ST.busy = true;
    ST.rules.push(rule); ST.holes.push('');
    var last = ST.rules.length >= MAX_PATCH;

    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<div class="lz-rule"><span class="lz-tag">Что надо прекратить</span><div class="r">' + esc(ST.sit.sit) + '</div></div>' +
        patchHistoryHtml() +
        '<div class="lz-typing" id="lzTyping">🧩 Фреди ищет дыру…</div>' +
      '</div>';
    toTop();

    var v = '';
    try {
      var prev = ST.rules.slice(0, -1).map(function (r, i) {
        return 'Прежнее правило: «' + r + '» — дыра: ' + (ST.holes[i] || 'нашлась');
      }).join('\n');
      var p = [
        'Ты ведёшь игру «Лазейка», обратный раунд: правило пишет игрок, а ты играешь того, кто хочет его обойти.',
        'Не оценивай игрока и его правило морально: не хвали за строгость, не упрекай за дыры, не читай нотаций. Ты просто показываешь, что формулировка на самом деле разрешает.',
        'Ситуация, которую правило должно прекратить: ' + ST.sit.sit,
        'Ты играешь: ' + ST.sit.persona + '.',
        prev,
        'Новое правило игрока: «' + rule + '»',
        'Найди в ФОРМУЛИРОВКЕ дыру и покажи её от первого лица — как человек, который правило формально соблюдает и при этом делает своё. Конкретно, с бытовой деталью, спокойно, без злорадства. 3–5 строк.',
        'Потом отдельной последней строкой строго: «Дыра: <в чём именно>».',
        'Если дыры действительно нет — вместо этого напиши строго «Дыры не нашёл» и одной фразой объясни, за счёт чего формулировка держит.',
        last ? 'Это последняя попытка. После разбора добавь 2–3 строки о том, куда упирается сама затея: правило описывает поведение, а обойти его хочет мотив, которого в тексте нет. Никаких советов о том, как правильно жить, — только это наблюдение.' : ''
      ].filter(Boolean).join('\n');
      var r = await aiGenerate(p, { max_tokens: 480, temperature: 0.85 });
      v = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { v = ''; }
    ST.busy = false;

    if (!v) {
      ST.rules.pop(); ST.holes.pop();
      var t = document.getElementById('lzTyping');
      if (t) t.outerHTML = '<div class="lz-card">Связь подвисла — правило не проверилось.</div>' +
        '<button class="lz-secondary" onclick="LAZEJKA.renderPatch()">← Вернуться к правилу</button>';
      return;
    }

    var held = /Дыры не нашёл/i.test(v);
    ST.holes[ST.holes.length - 1] = v;
    track('lz_move', { dir: 'patch', ctx: ST.sit.ctx, round: ST.rules.length, ok: held });

    if (held || last) { ST.done = true; recordPatch(held); renderPatchEnd(held); }
    else renderPatch();
  }

  function renderPatchEnd(held) {
    var c = container(); if (!c) return;
    var tail = held
      ? '<div class="lz-held"><b>Формулировка устояла.</b><br>Посмотрите, чем она отличается от первых: обычно тем, что описывает не действие, а результат или причину.</div>'
      : '';
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-rule"><span class="lz-tag">Что надо было прекратить</span><div class="r">' + esc(ST.sit.sit) + '</div></div>' +
        patchHistoryHtml() + tail +
        '<div class="lz-row"><button class="lz-primary" onclick="LAZEJKA.startPatch()" style="margin:0">🔁 Другая ситуация</button><button class="lz-secondary" onclick="LAZEJKA.startRace()">🏃 В гонку</button></div>' +
        '<a class="lz-course" href="/blog/lektorij/lichnye-granicy/" target="_blank" rel="noopener">🎓 Теория — курс «Личные границы»</a>' +
      '</div>';
    toTop();
  }

  // ---------------------------------------------------------------
  // РАЗВЕДКА
  // ---------------------------------------------------------------
  function startScout() {
    injectCSS(); ST.dir = 'scout';
    ST.hid = pickFresh(RAZVEDKA, 'lazejka_seen_scout', Math.max(3, RAZVEDKA.length - 4));
    ST.probes = []; ST.done = false; ST.busy = false;
    track('game_round_start', { feature: 'lazejka', dir: 'scout', ctx: ST.hid.ctx });
    renderScout();
  }

  function boardHtml() {
    if (!ST.probes.length) return '';
    return '<div class="lz-board">' + ST.probes.map(function (p) {
      return '<div class="lz-pr ' + (p.ok ? 'y' : 'n') + '"><i>' + (p.ok ? '✓ можно' : '✕ нельзя') + '</i><span>' + esc(p.text) + '</span></div>';
    }).join('') + '</div>';
  }

  function renderScout() {
    var c = container(); if (!c) return;
    var micOff = !(window.voiceManager && typeof window.voiceManager.startRecording === 'function');
    var n = ST.probes.length;
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-where">' + ST.hid.em + ' ' + esc(ST.hid.ctx) + ' · проб сделано: ' + n + '</div>' +
        '<div class="lz-rule"><span class="lz-tag">Обстановка</span><div class="r">' + esc(ST.hid.setup) + '</div></div>' +
        '<div class="lz-hidden">Правило здесь есть, но вам его не назовут.<br>Пробуйте — в ответ будет только «можно» или «нельзя».</div>' +
        boardHtml() +
        '<textarea class="lz-ta" id="lzIn" placeholder="Что попробуете? Можно несколько проб сразу — по одной в строке."></textarea>' +
        '<div class="lz-microw"><button class="lz-mic' + (micOff ? ' off' : '') + '" id="lzMic" onclick="LAZEJKA.mic()" title="Говорить вслух">🎤</button><span class="lz-miclabel" id="lzMicLabel">' + (micOff ? 'печатайте пробу' : 'или наговорите вслух') + '</span></div>' +
        '<button class="lz-primary" onclick="LAZEJKA.probe()">🔦 Проверить</button>' +
        (n >= 2 ? '<button class="lz-secondary" onclick="LAZEJKA.guessForm()">💡 Кажется, знаю — назвать правило</button>' : '') +
        (n === 0 ? '<button class="lz-secondary" onclick="LAZEJKA.startScout()">🎲 Другая обстановка</button>' : '') +
      '</div>';
    toTop();
  }

  async function probe() {
    if (ST.busy || ST.done) return;
    stopVoice();
    var el = document.getElementById('lzIn');
    var raw = (el ? el.value : '').trim();
    if (raw.length < 4) { toast('Опишите, что именно вы пробуете', 'info'); return; }
    // Несколько проб за один вызов: и думается так лучше, и лимит
    // расходуется вчетверо медленнее, чем по пробе на запрос.
    var lines = raw.split('\n').map(function (x) { return x.trim(); })
                   .filter(function (x) { return x.length > 2; }).slice(0, 5);
    if (!lines.length) { toast('Опишите, что именно вы пробуете', 'info'); return; }

    ST.busy = true;
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="lz-wrap">' + boardHtml() +
      '<div class="lz-typing" id="lzTyping">🔦 Проверяем…</div></div>';
    toTop();

    var v = '';
    try {
      var p = [
        'Ты ведёшь игру «Разведка»: игрок нащупывает спрятанное правило, пробуя действия.',
        'Скрытое правило: «' + ST.hid.rule + '»',
        'Обстановка: ' + ST.hid.setup,
        'Ниже пронумерованные пробы игрока. Для каждой реши, разрешает ли её скрытое правило.',
        'Отвечай СТРОГО по одной строке на пробу, в формате «N: можно» или «N: нельзя». Никаких пояснений, никаких подсказок, ничего кроме этих строк — иначе игра теряет смысл.',
        'Если проба сформулирована слишком расплывчато, чтобы правило дало однозначный ответ, отвечай «N: неясно».',
        lines.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n')
      ].join('\n');
      var r = await aiGenerate(p, { max_tokens: 120, temperature: 0.1 });
      v = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { v = ''; }
    ST.busy = false;

    if (!v) {
      var t = document.getElementById('lzTyping');
      if (t) t.outerHTML = '<div class="lz-card">Связь подвисла — пробы не проверились.</div>' +
        '<button class="lz-secondary" onclick="LAZEJKA.renderScout()">← Назад</button>';
      return;
    }

    var unclear = 0;
    lines.forEach(function (text, i) {
      var m = v.match(new RegExp('(?:^|\\n)\\s*' + (i + 1) + '\\s*[.:)]\\s*(можно|нельзя|неясно)', 'i'));
      var ans = m ? m[1].toLowerCase() : '';
      if (!ans || ans === 'неясно') { unclear++; return; }
      ST.probes.push({ text: text, ok: ans === 'можно' });
    });
    track('lz_probe', { ctx: ST.hid.ctx, added: lines.length - unclear, total: ST.probes.length });
    if (unclear) toast(unclear === lines.length ? 'Слишком расплывчато — попробуйте конкретнее' : 'Часть проб оказалась расплывчатой', 'info');
    vibe(20);
    renderScout();
  }

  function guessForm() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.renderScout()">← к пробам</button>' +
        '<div class="lz-where">' + ST.hid.em + ' ' + esc(ST.hid.ctx) + ' · проб сделано: ' + ST.probes.length + '</div>' +
        boardHtml() +
        '<div class="lz-form"><label>Своими словами: что здесь можно, а что нельзя?</label>' +
        '<textarea class="lz-ta" id="lzIn" placeholder="Правило звучит примерно так…"></textarea></div>' +
        '<button class="lz-primary" onclick="LAZEJKA.guess()">💡 Назвать правило</button>' +
        '<button class="lz-secondary" onclick="LAZEJKA.renderScout()">Ещё пробы</button>' +
      '</div>';
    toTop();
  }

  async function guess() {
    if (ST.busy || ST.done) return;
    var el = document.getElementById('lzIn');
    var g = (el ? el.value : '').trim();
    if (g.length < 8) { toast('Сформулируйте правило целиком', 'info'); return; }
    ST.busy = true;
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="lz-wrap"><div class="lz-card"><div class="lz-ch">Ваша формулировка</div><div class="lz-mine">' + esc(g) + '</div></div>' +
      '<div class="lz-typing" id="lzTyping">💡 Сверяем…</div></div>';
    toTop();

    var v = '';
    try {
      var p = [
        'Игрок нащупывал спрятанное правило и теперь называет его своими словами. Сверьте её с настоящей.',
        'Настоящее правило: «' + ST.hid.rule + '»',
        'Формулировка игрока: «' + g + '»',
        'Совпадение по СМЫСЛУ, а не по словам: если игрок описал тот же критерий другими словами — это точное попадание.',
        'Ответь по-русски, на «вы», спокойно, без похвал и упрёков:',
        'ИТОГ: точно — или — ИТОГ: близко — или — ИТОГ: мимо',
        'РАЗБОР: 2–4 строки. Что игрок ухватил верно и что именно разошлось с настоящим правилом. Если попал точно — скажи, какая проба была решающей.'
      ].join('\n');
      var r = await aiGenerate(p, { max_tokens: 320, temperature: 0.5 });
      v = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { v = ''; }
    ST.busy = false;

    if (!v) {
      var t = document.getElementById('lzTyping');
      if (t) t.outerHTML = '<div class="lz-card">Связь подвисла — сверить не вышло.</div>' +
        '<button class="lz-secondary" onclick="LAZEJKA.guessForm()">← Назад</button>';
      return;
    }
    var itog = (v.match(/ИТОГ:\s*(точно|близко|мимо)/i) || [])[1] || '';
    var razbor = (v.match(/РАЗБОР:\s*([\s\S]*)$/i) || [])[1] || v;
    var exact = /точно/i.test(itog);
    ST.done = true;
    var st = recordScout(ST.probes.length, exact);
    track('lz_scout_end', { ctx: ST.hid.ctx, probes: ST.probes.length, result: itog.toLowerCase() || 'unknown' });
    renderScoutEnd(g, exact, itog, razbor.trim(), st);
  }

  function renderScoutEnd(g, exact, itog, razbor, st) {
    var c = container(); if (!c) return;
    var label = exact ? '✓ точно' : /близко/i.test(itog) ? '≈ близко' : '✕ мимо';
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-mark ' + (exact ? 'ok' : 'no') + '">' + label + ' · ' + ST.probes.length + ' ' + plural(ST.probes.length, ['проба', 'пробы', 'проб']) + '</div>' +
        '<div class="lz-card"><div class="lz-ch">Вы назвали</div><div class="lz-mine">' + esc(g) + '</div></div>' +
        '<div class="lz-reveal"><span class="lz-tag">Правило было такое</span><div class="r">«' + esc(ST.hid.rule) + '»</div></div>' +
        (razbor ? '<div class="lz-verdict">' + nl(razbor) + '</div>' : '') +
        boardHtml() +
        (st.fewest ? '<div class="lz-step">Ваш рекорд: разгадка за ' + st.fewest + ' ' + plural(st.fewest, ['пробу', 'пробы', 'проб']) + '</div>' : '') +
        '<div class="lz-row"><button class="lz-primary" onclick="LAZEJKA.startScout()" style="margin:0">🔦 Ещё разведка</button><button class="lz-secondary" onclick="LAZEJKA.home()">Меню</button></div>' +
      '</div>';
    toTop();
  }

  // ---------------------------------------------------------------
  // СВОЁ ПРАВИЛО
  //
  // Человек приносит настоящее. Значит, он может принести и не правило,
  // а беду: запрет видеться с ребёнком, контроль, угрозы. Играть в такое
  // нельзя, поэтому первый же ответ Фреди умеет вернуться маркером
  // «НЕ ИГРА» — и тогда вместо разбора ходов человек получает спокойный
  // текст и путь в разговор.
  // ---------------------------------------------------------------
  function ownForm() {
    injectCSS(); stopVoice(); ST.done = true;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-h1">✍️ Своё правило</div>' +
        '<div class="lz-lead">Правило, под которым вы живёте, и то, что вам нужно сделать. Дальше — обычная гонка: вы ищете ход, правило подтягивают, вы ищете снова.</div>' +
        '<div class="lz-form">' +
          '<label>Правило — как оно звучит на самом деле</label>' +
          '<textarea class="lz-ta" id="lzRule" style="min-height:80px" placeholder="Например: на работе не принято уходить раньше начальника."></textarea>' +
          '<label>Ваша цель — что нужно сделать</label>' +
          '<textarea class="lz-ta" id="lzGoal" style="min-height:80px" placeholder="Например: успеть забрать ребёнка из сада."></textarea>' +
        '</div>' +
        '<button class="lz-primary" onclick="LAZEJKA.startOwn()">▶ В гонку</button>' +
        '<div class="lz-src">Игра разбирает формулировки, а не жизненные обстоятельства. Если правило, под которым вы живёте, — это давление, угрозы или запрет видеться с близкими, тренажёр тут не поможет: про такое лучше поговорить с Фреди в чате, а при угрозе безопасности — обратиться к специалисту.</div>' +
      '</div>';
    toTop();
  }

  function startOwn() {
    var r = (document.getElementById('lzRule') || {}).value || '';
    var g = (document.getElementById('lzGoal') || {}).value || '';
    r = r.trim(); g = g.trim();
    if (r.length < 8) { toast('Напишите правило целиком', 'info'); return; }
    if (g.length < 5) { toast('Напишите, чего вам нужно добиться', 'info'); return; }
    injectCSS(); ST.dir = 'race'; ST.own = true; ST.cat = loadCat();
    ST.sc = { ctx: 'Ваше правило', em: '✍️', rule: r, goals: [g] };
    ST.goal = g; ST.rule0 = r; ST.rule = r;
    ST.rounds = []; ST.done = false; ST.busy = false;
    track('game_round_start', { feature: 'lazejka', dir: 'race', cat: ST.cat, ctx: 'own' });
    renderRace();
  }

  function renderNotAGame(why) {
    ST.done = true;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-soft">' +
          '<b>Это не задача про формулировку.</b><br>' + nl(why || '') +
          '<br><br>Тренажёр разбирает тексты правил и лазейки в них. То, что вы описали, так не решается — и разбирать это ходами было бы неуважением к вашей ситуации.' +
        '</div>' +
        '<div class="lz-card"><div class="lz-ch">Что можно сделать вместо игры</div>' +
          '<div class="lz-li">Рассказать это Фреди в чате обычными словами — там разговор, а не разбор ходов.</div>' +
          '<div class="lz-li">Если речь о безопасности — своей или ребёнка, — это к живому специалисту, и откладывать не стоит.</div>' +
        '</div>' +
        '<button class="lz-primary" onclick="LAZEJKA.ownForm()">← Другое правило</button>' +
        '<button class="lz-secondary" onclick="LAZEJKA.home()">В меню</button>' +
      '</div>';
    toTop();
  }

  // ---------------------------------------------------------------
  // Голос
  // ---------------------------------------------------------------
  function mic() { _rec.on ? stopVoice() : startVoice(); }
  async function startVoice() {
    var el = document.getElementById('lzMic'), inp = document.getElementById('lzIn'), lbl = document.getElementById('lzMicLabel');
    if (!window.voiceManager || typeof window.voiceManager.startRecording !== 'function') { toast('🎤 Голос недоступен в этом браузере', 'info'); return; }
    _rec.savedT = window.voiceManager.onTranscript; _rec.savedC = window.voiceManager.onTranscriptComplete;
    window.voiceManager.sttOnly = true;
    window.voiceManager.onTranscript = function (text) { if (!text || !inp) return; inp.value = inp.value ? (inp.value + ' ' + text) : text; };
    window.voiceManager.onTranscriptComplete = function () {};
    _rec.on = true; if (el) el.classList.add('rec'); if (lbl) lbl.textContent = '🔴 слушаю…';
    vibe(30);
    var ok = await window.voiceManager.startRecording();
    if (!ok) { stopVoice(); toast('🎤 Нет доступа к микрофону', 'error'); }
  }
  function stopVoice() {
    if (!_rec.on) return;
    try { if (window.voiceManager && window.voiceManager.stopRecording) window.voiceManager.stopRecording(); } catch (e) {}
    _rec.on = false;
    var el = document.getElementById('lzMic'); if (el) el.classList.remove('rec');
    var lbl = document.getElementById('lzMicLabel'); if (lbl) lbl.textContent = 'или наговорите вслух';
    setTimeout(function () {
      if (window.voiceManager) {
        if (_rec.savedT !== null) window.voiceManager.onTranscript = _rec.savedT;
        if (_rec.savedC !== null) window.voiceManager.onTranscriptComplete = _rec.savedC;
        window.voiceManager.sttOnly = false; _rec.savedT = null; _rec.savedC = null;
      }
    }, 500);
  }

  window.LAZEJKA = {
    home: home, setCat: setCat,
    startRace: startRace, move: move, renderRace: renderRace, endRace: endRace,
    startPatch: startPatch, tryRule: tryRule, renderPatch: renderPatch,
    startScout: startScout, probe: probe, renderScout: renderScout,
    guessForm: guessForm, guess: guess,
    ownForm: ownForm, startOwn: startOwn,
    mic: mic, getState: function () { return ST; }
  };
  window.showLazejkaGame = home;
  console.log('✅ lazejka.js loaded (игра «Лазейка»)');
})();
