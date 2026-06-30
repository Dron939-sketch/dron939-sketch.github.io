// dotogokak.js — игра «До того, как»
// Тренажёр поведенческих сценариев. Игрок мысленно репетирует ситуации,
// в которые боится попасть, до того как они случились в реальности.
// Опора на mental rehearsal (Suinn) + implementation intentions (Gollwitzer).
(function () {
  'use strict';

  // ---------- утилиты ----------
  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 600, temperature: opts.temperature == null ? 0.5 : opts.temperature };
    try {
      if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
      var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) return { success: false };
      return await r.json();
    } catch (e) { return { success: false }; }
  }
  function clean(s) { return String(s || '').replace(/\|\|[^|]*\|\|/g, '').trim(); }
  // Простой markdown → HTML для AI-ответа: **жирное**, переводы строк
  function md(s) {
    var t = esc(String(s == null ? '' : s));
    // **жирный** → <strong>
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // *курсив* → <em> (опционально, осторожно)
    t = t.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,!?:;)])/g, '$1<em>$2</em>');
    // двойной перенос — пустая строка между блоками
    t = t.replace(/\n{2,}/g, '</p><p>');
    // одинарный перенос — мягкий
    t = t.replace(/\n/g, '<br>');
    return '<p>' + t + '</p>';
  }

  // ---------- сегменты ----------
  var SEG = [
    { id: 'biz',  icon: '💼', name: 'Бизнес и переговоры',     desc: 'Клиенты, инвесторы, партнёры, тяжёлые встречи' },
    { id: 'pow',  icon: '👑', name: 'Власть и иерархия',       desc: 'Начальники, чиновники, проверки, инспекторы' },
    { id: 'soc',  icon: '🍷', name: 'Социальные ситуации',     desc: 'Мероприятия, незнакомцы, публичность' },
    { id: 'rom',  icon: '❤️', name: 'Романтика и интим',       desc: 'Знакомства, признания, неловкие моменты' },
    { id: 'fam',  icon: '👨‍👩‍👧', name: 'Семья и родители', desc: 'Родители, дети, родственники, границы' },
    { id: 'str',  icon: '🌃', name: 'Улица и конфликты',       desc: 'Хамство, агрессия, открытые столкновения' },
    { id: 'mon',  icon: '💰', name: 'Деньги',                  desc: 'Долги, отказы, торг, обманы' },
    { id: 'ext',  icon: '🌑', name: 'Экзистенциальные',        desc: 'Смерть, потеря, болезнь, прощания' }
  ];

  // ---------- банк ситуаций (100) ----------
  // Конструктор записи: { seg, text }
  var BANK = [
    // 💼 БИЗНЕС И ПЕРЕГОВОРЫ (12)
    { seg: 'biz', text: 'На переговорах партнёр демонстративно смотрит в телефон, пока ты говоришь, и через минуту перебивает: «Короче, чё хотите?»' },
    { seg: 'biz', text: 'Клиент в публичном чате компании пишет: «Это худший сервис в моей жизни, я подам в суд». В чате — 3000 подписчиков, все читают.' },
    { seg: 'biz', text: 'На совещании генеральный говорит при всех: «Не понял, что вы сделали за квартал? Можете объяснить так, чтобы стало понятно даже мне?»' },
    { seg: 'biz', text: 'Инвестор смотрит в глаза и спрашивает: «А вы вообще зарабатывали когда-нибудь больше 100 тысяч в месяц лично, не как идею, а в кассу?»' },
    { seg: 'biz', text: 'Партнёр пишет в мессенджере в час ночи: «Я выхожу из проекта. С завтрашнего дня. Подробности позже».' },
    { seg: 'biz', text: 'Ключевой сотрудник заходит в кабинет: «Меня переманивают за вдвое больше. Что предложишь?»' },
    { seg: 'biz', text: 'На презентации перед потенциальным заказчиком главный человек встаёт на 10-й минуте и уходит из зала без слов.' },
    { seg: 'biz', text: 'Подрядчик сорвал сроки на месяц. Сидит напротив и говорит: «Ну, форс-мажор, что вы хотите, бывает». Ждёт реакции.' },
    { seg: 'biz', text: 'Конкурент пишет тебе лично: «Слышал, у тебя проблемы. Готов купить твой бизнес за 30% от стоимости. Подумай, пока я добрый».' },
    { seg: 'biz', text: 'На совете директоров тебе говорят: «Мы решили — направление закрываем. Тебя переводим на другую должность. С понижением в зарплате».' },
    { seg: 'biz', text: 'Сотрудник, которому ты доверял три года, ворует. Доказательства у тебя на руках. Через 5 минут он зайдёт в кабинет.' },
    { seg: 'biz', text: 'Журналистка после интервью присылает текст: «Поправок не принимаем, публикуем завтра». В тексте — твои слова перекручены.' },

    // 👑 ВЛАСТЬ И ИЕРАРХИЯ (12)
    { seg: 'pow', text: 'ГИБДД останавливает поздно вечером. Инспектор: «Документы. Вы понимаете, что нарушили? Будем оформлять. Или решим как-то иначе?»' },
    { seg: 'pow', text: 'Налоговая прислала запрос «дать пояснения» по доходам за три года. В голосе сотрудника по телефону — намёк на проверку.' },
    { seg: 'pow', text: 'На мероприятии девушка-организатор в приказном тоне: «Так, вы идёте сейчас вон туда и стоите там, пока я не скажу. Вопросы?»' },
    { seg: 'pow', text: 'Начальник публично, перед всей командой: «Ну расскажите всем, как вы умудрились это испортить. Нам всем интересно».' },
    { seg: 'pow', text: 'Охранник на входе в бизнес-центр: «Куда? К кому? Без записи нельзя. Вообще никак».' },
    { seg: 'pow', text: 'Чиновник в кабинете, не поднимая глаз: «У вас неправильно оформлено. Приходите через неделю. Следующий».' },
    { seg: 'pow', text: 'Управдом стучит в дверь: «У соседей жалоба. Шумите. Будем составлять акт. Сейчас, при вас».' },
    { seg: 'pow', text: 'Полицейский на улице: «Документики покажите. И что у вас в сумке? Откройте».' },
    { seg: 'pow', text: 'На корпоративе сильно нетрезвый начальник кладёт руку тебе на плечо и говорит при всех: «Ты у нас умничка, но что-то много болтаешь последнее время».' },
    { seg: 'pow', text: 'Учительница вашего ребёнка вызывает в школу: «Ваш сын ведёт себя ужасно. Я не уверена, что ему здесь место».' },
    { seg: 'pow', text: 'Врач в поликлинике, не глядя на тебя: «Я сказал — лекарство, и точка. Не нравится — идите в платную, не задерживайте очередь».' },
    { seg: 'pow', text: 'Сосед-чиновник «по-дружески» намекает: «Если будешь жаловаться на нашу управляющую, у тебя начнутся проблемы».' },

    // 🍷 СОЦИАЛЬНЫЕ СИТУАЦИИ (13)
    { seg: 'soc', text: 'Вечеринка. Все друг друга знают много лет. Ты единственный новый человек. Стоишь с бокалом 15 минут, никто не подходит.' },
    { seg: 'soc', text: 'Тебя внезапно вызывают сказать тост. Импровизация. 30 человек смотрят. Молчание тяжелеет с каждой секундой.' },
    { seg: 'soc', text: 'На фуршете незнакомая ухоженная женщина: «А вы кто и чем занимаетесь? Расскажите про себя так, чтобы было интересно».' },
    { seg: 'soc', text: 'Заходишь в курилку, там трое говорят про что-то важное. Замолкают и смотрят на тебя.' },
    { seg: 'soc', text: 'Тебя приглашают потанцевать прямо при всех. А ты не танцуешь и не хочешь. Все ждут ответа.' },
    { seg: 'soc', text: 'Друг публично рассказывает про тебя смешную историю, в которой ты выглядишь нелепо. Все смеются.' },
    { seg: 'soc', text: 'На свадьбе сажают за столик с незнакомыми пожилыми родственниками невесты. Они смотрят на тебя выжидающе.' },
    { seg: 'soc', text: 'В лифте бизнес-центра ты случайно оказался один на один с известным человеком, к которому давно хотел подойти. У вас 30 секунд.' },
    { seg: 'soc', text: 'На дне рождения хозяин громко спрашивает: «Ну? Кто следующий говорит тост? Может, ты?»' },
    { seg: 'soc', text: 'На презентации спикер при всех задаёт тебе сложный вопрос. Микрофон уже несут тебе.' },
    { seg: 'soc', text: 'В компании малознакомых людей кто-то начинает рассказывать политически острый анекдот. Все ждут твоей реакции.' },
    { seg: 'soc', text: 'На банкете официант случайно опрокидывает бокал красного вина тебе на белую рубашку. На тебя смотрит весь стол.' },
    { seg: 'soc', text: 'Подходит человек на конференции: «Слушай, я тебя не помню, но мы точно встречались. Где?»' },

    // ❤️ РОМАНТИКА И ИНТИМ (12)
    { seg: 'rom', text: 'В кафе за соседним столиком — человек, который тебе очень понравился. Через 5 минут он встанет и уйдёт. Вы не знакомы.' },
    { seg: 'rom', text: 'Партнёр на третьем свидании прямо смотрит в глаза: «У нас есть будущее или мы просто проводим время? Скажи честно».' },
    { seg: 'rom', text: 'Сообщение от бывшей через два года: «Привет. Можем встретиться поговорить? Это важно».' },
    { seg: 'rom', text: 'В постели партнёр предлагает то, к чему ты не готов. Прямо сейчас. Глаза горят, ответ ждётся.' },
    { seg: 'rom', text: 'Лучшая подруга твоей девушки наедине начинает откровенно флиртовать. Кладёт руку на твоё бедро.' },
    { seg: 'rom', text: 'Тебе говорят «Я тебя люблю» впервые. А ты не уверен, что чувствуешь то же. Пауза затянулась.' },
    { seg: 'rom', text: 'Партнёр обнаруживает на твоём телефоне переписку, которой не должно было быть. Сидит и молчит. Ждёт.' },
    { seg: 'rom', text: 'На первом свидании человек оказался совсем не таким, как на фото. Ты понимаешь, что не хочешь продолжать. Прошло 10 минут.' },
    { seg: 'rom', text: 'На корпоративе коллега, который тебе очень нравится, после двух бокалов начинает прижиматься в танце. Все смотрят.' },
    { seg: 'rom', text: 'Партнёр после года вместе говорит: «Я думаю, нам нужна пауза. Мне надо разобраться в себе».' },
    { seg: 'rom', text: 'Тебя представляют родителям партнёра. Мать с порога: «А вы вообще понимаете, на что подписываетесь?»' },
    { seg: 'rom', text: 'Партнёр в постели тихо признаётся: «Мне с тобой давно не очень. Я не знаю, что делать дальше».' },

    // 👨‍👩‍👧 СЕМЬЯ И РОДИТЕЛИ (12)
    { seg: 'fam', text: 'Мама в очередной раз за столом: «Ну когда ты женишься/родишь/нормально устроишься? Все твои ровесники уже…»' },
    { seg: 'fam', text: 'Отец, которого ты не видел 10 лет, звонит: «Сын, мне нужна твоя помощь. Я болен».' },
    { seg: 'fam', text: 'Подросток-сын смотрит снизу вверх: «Я не пойду в твой институт. Я не буду как ты».' },
    { seg: 'fam', text: 'Свекровь на семейном обеде, при всех: «А вот моя мама в твоём возрасте уже…» — и пошло-поехало.' },
    { seg: 'fam', text: 'Бабушка узнала про развод и плачет: «Что я скажу людям? Как ты мог?»' },
    { seg: 'fam', text: 'Ребёнок 7 лет ночью: «Мам/пап, а вы с мамой разведётесь? Я слышал, как вы кричали».' },
    { seg: 'fam', text: 'Брат просит крупную сумму в долг. Ты понимаешь — не вернёт. Он смотрит и ждёт.' },
    { seg: 'fam', text: 'Дочь-подросток приводит домой парня, который выглядит как малолетний бандит. Знакомит: «Это мой парень».' },
    { seg: 'fam', text: 'Мать упрекает в телефонном разговоре: «Ты совсем меня забыл. Когда я умру, ты пожалеешь».' },
    { seg: 'fam', text: 'На семейном собрании родственник пьяным голосом начинает оскорблять твоего супруга/супругу при всех.' },
    { seg: 'fam', text: 'Тёща приехала «погостить на недельку», прошёл месяц. Сидит на кухне, командует. Жена молчит.' },
    { seg: 'fam', text: 'Ребёнок-подросток находит твою старую переписку, в которой ты говоришь про него плохо. Показывает: «Это про меня?»' },

    // 🌃 УЛИЦА И КОНФЛИКТЫ (12)
    { seg: 'str', text: 'Поздно вечером в подъезде — двое незнакомых парней. Преграждают путь. Один: «Слышь, есть закурить?»' },
    { seg: 'str', text: 'В магазине кассирша хамит на ровном месте при очереди. Очередь молчит, смотрит на тебя.' },
    { seg: 'str', text: 'В метро мужик громко ругает страну/национальность/власть и обращается прямо к окружающим: «Ну скажите, я не прав?»' },
    { seg: 'str', text: 'На парковке другой водитель кричит, тыча пальцем: «Ты что, охренел?! Куда ты встал?!»' },
    { seg: 'str', text: 'В дороге незнакомый мужчина неприлично смотрит на твою девушку/жену/дочь и подмигивает.' },
    { seg: 'str', text: 'В кафе за соседним столиком пьяная компания начинает оскорблять твоего собеседника, ещё не зная, что вы вместе.' },
    { seg: 'str', text: 'Сосед сверху год шумит ночами. Звонишь в дверь. Открывают — на пороге крупный мужчина в трусах и явно не в духе.' },
    { seg: 'str', text: 'В очереди в аптеку женщина громко лезет вперёд: «Я только спросить!» — и оттесняет тебя плечом.' },
    { seg: 'str', text: 'В автобусе пьяный человек начинает приставать к молодой девушке. Никто не вмешивается. Ты ближе всех.' },
    { seg: 'str', text: 'Курьер привёз заказ с дефектом. На претензию: «Не моя проблема, разбирайтесь с магазином». Уходит.' },
    { seg: 'str', text: 'В лифте сосед, с которым у тебя давний холодный конфликт, оказался лицом к лицу. Ехать ещё 12 этажей.' },
    { seg: 'str', text: 'На спортплощадке подростки громко матерятся при твоём ребёнке. Один: «Че смотришь, дядя?»' },

    // 💰 ДЕНЬГИ (12)
    { seg: 'mon', text: 'Друг попросил денег в долг полгода назад. Не возвращает. Сегодня встречаетесь — он выглядит хорошо, в новой куртке.' },
    { seg: 'mon', text: 'Клиент после выполненной работы: «Что-то дорого вышло. Давайте сделаем скидку процентов 50, чтобы было по-человечески».' },
    { seg: 'mon', text: 'Продавец в магазине твёрдо: «Не торгуемся, цена окончательная». А ты очень хочешь скидку и видишь, что вещь лежит давно.' },
    { seg: 'mon', text: 'Тебе должны зарплату 3 месяца. Идёшь к директору. Заходишь в кабинет — он на телефоне, машет рукой «садись».' },
    { seg: 'mon', text: 'Близкий человек просит крупную сумму на лечение родственника. У тебя есть, но это последнее. Он смотрит и ждёт.' },
    { seg: 'mon', text: 'На приёме врач: «По полису можно бесплатно. А за 50 тысяч сделаем по-нормальному. Что выбираете?»' },
    { seg: 'mon', text: 'На сделке после устной договорённости партнёр: «Документы готовы, но цена выросла на 20%. Так бывает».' },
    { seg: 'mon', text: 'Мама звонит: «У меня украли пенсию. Можешь срочно перевести 30 тысяч? До конца месяца».' },
    { seg: 'mon', text: 'На рынке тебя явно обвешивают на глазах. Продавец смотрит уверенно: «У меня всё точно».' },
    { seg: 'mon', text: 'Подрядчик после половины работы: «Денег больше нет, материалы подорожали. Доплатите 200 тысяч или бросим стройку».' },
    { seg: 'mon', text: 'Знакомый ненавязчиво продаёт тебе долю в МЛМ-проекте: «Удвоишь капитал за полгода. Сейчас или никогда».' },
    { seg: 'mon', text: 'Тебе пришло уведомление из банка: с твоей карты только что списали половину зарплаты. Звонишь в банк — оператор отвечает медленно.' },

    // 🌑 ЭКЗИСТЕНЦИАЛЬНЫЕ (15)
    { seg: 'ext', text: 'Врач, глядя в монитор: «Анализы не очень. Давайте обсудим, что мы будем делать дальше. Это не приговор, но это серьёзно».' },
    { seg: 'ext', text: 'Звонок от родственника: «Твой отец в больнице. Срочно приезжай. Это, кажется, последнее».' },
    { seg: 'ext', text: 'Пьяная исповедь близкого друга глубокой ночью: «Я больше не хочу жить. Я устал. Мне просто никто не нужен».' },
    { seg: 'ext', text: 'Подходит на улице человек, которого ты сильно обидел 15 лет назад. Постарел. «Привет. Помнишь меня?»' },
    { seg: 'ext', text: 'Ребёнок 7 лет на ночь, глядя в потолок: «Мам/пап, а ты умрёшь? А я умру?»' },
    { seg: 'ext', text: 'На похоронах вдова просит тебя — близкого друга умершего — сказать речь у могилы. Через 5 минут.' },
    { seg: 'ext', text: 'Любимая собака умирает. Ветеринар: «Усыпляем сейчас или продолжаем лечить с минимальными шансами?»' },
    { seg: 'ext', text: 'Тебе сообщают, что у близкого человека неизлечимая болезнь. Он ещё не знает. Скоро увидитесь.' },
    { seg: 'ext', text: 'На дне рождения матери она вдруг тихо говорит: «Я знаю, что это, скорее всего, последний мой день рождения. Не плачь».' },
    { seg: 'ext', text: 'Бывшая жена/муж пишет: «Я умираю. Хочу попрощаться. Можешь приехать?»' },
    { seg: 'ext', text: 'Тебя приглашают в хоспис к человеку, с которым у тебя не было контакта 20 лет. Он зовёт лично.' },
    { seg: 'ext', text: 'Священник на исповеди после долгого молчания: «Расскажите, что вас по-настоящему мучает. Не для меня. Для вас».' },
    { seg: 'ext', text: 'Утром на работе узнаёшь: погиб коллега, с которым вчера пил кофе. Через 10 минут — общее собрание. Все ждут чьего-то слова.' },
    { seg: 'ext', text: 'Подросток-сын признаётся: «Я хотел сделать с собой что-то плохое. Не сделал. Но было близко. Не знаю, зачем тебе это говорю».' },
    { seg: 'ext', text: 'Сам себе перед зеркалом ночью, после плохого дня: «Я что, действительно так живу? Это и есть моя жизнь?»' }
  ];

  // ---------- состояние ----------
  var ST = null; // активная сессия
  var PROG = null; // прогресс игрока

  function loadProg() {
    try {
      PROG = JSON.parse(localStorage.getItem('dotogokak_prog') || '{}');
    } catch (e) { PROG = {}; }
    if (!PROG.done) PROG.done = {}; // { bankIndex: true }
    if (!PROG.history) PROG.history = []; // [{idx, ts, answer, review}]
    if (typeof PROG.count !== 'number') PROG.count = 0;
  }
  function saveProg() {
    try { localStorage.setItem('dotogokak_prog', JSON.stringify(PROG)); } catch (e) {}
  }
  function rank(n) {
    if (n >= 100) return { name: '🎩 Мастер сценариев', next: null };
    if (n >= 60)  return { name: '🧭 Стратег', next: 100 };
    if (n >= 30)  return { name: '⚙️ Опытный', next: 60 };
    if (n >= 15)  return { name: '🛡 Подготовленный', next: 30 };
    if (n >= 5)   return { name: '🎯 Стажёр', next: 15 };
    return { name: '🌱 Растерянный', next: 5 };
  }

  // ---------- премиум-гейт ----------
  function isPremium() { return !!window.IS_PREMIUM; }
  async function ensurePremium() {
    if (typeof window.loadPremiumStatus === 'function' && !isPremium()) {
      try { await window.loadPremiumStatus(); } catch (e) {}
    }
    return isPremium();
  }

  // ---------- стили ----------
  function injectStyles() {
    if (document.getElementById('dk-styles')) return;
    var css = ''
      + '.dk-wrap{max-width:780px;margin:0 auto;padding:18px 16px 90px;font-family:inherit;color:var(--text,#e7e7e7)}'
      + '.dk-back{background:transparent;border:1px solid #2c2f36;color:#aab1bb;padding:6px 12px;border-radius:8px;font-size:13px;cursor:pointer;margin-bottom:12px}'
      + '.dk-h1{font-size:22px;font-weight:700;margin:6px 0 4px}'
      + '.dk-sub{font-size:13px;color:#9aa3ad;margin-bottom:16px;line-height:1.5}'
      + '.dk-rank{display:flex;justify-content:space-between;align-items:center;background:#1a1d23;border:1px solid #2c2f36;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:13px}'
      + '.dk-rank b{color:#f0b24b}'
      + '.dk-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}'
      + '@media(max-width:560px){.dk-grid{grid-template-columns:1fr}}'
      + '.dk-card{background:#1a1d23;border:1px solid #2c2f36;border-radius:14px;padding:14px;cursor:pointer;transition:border .15s}'
      + '.dk-card:hover{border-color:#f59e0b}'
      + '.dk-card-h{font-size:15px;font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:8px}'
      + '.dk-card-d{font-size:12px;color:#9aa3ad;line-height:1.45}'
      + '.dk-card-c{font-size:11px;color:#8a93a0;margin-top:6px}'
      + '.dk-list-item{background:#1a1d23;border:1px solid #2c2f36;border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer;font-size:14px;line-height:1.5}'
      + '.dk-list-item:hover{border-color:#f59e0b}'
      + '.dk-list-item.done{opacity:.5;border-color:#22c55e44}'
      + '.dk-list-item.done::before{content:"✓ ";color:#22c55e;font-weight:700}'
      + '.dk-sit{background:#1f2127;border-left:4px solid #f59e0b;border-radius:10px;padding:16px 18px;margin:14px 0;font-size:15px;line-height:1.65;color:#fdebd0}'
      + '.dk-text,.dk-input{width:100%;background:#0f1116;border:1px solid #2c2f36;border-radius:10px;padding:11px 12px;color:#e7e7e7;font-size:14px;font-family:inherit;line-height:1.5;box-sizing:border-box}'
      + '.dk-text{min-height:130px;resize:vertical}'
      + '.dk-text:focus,.dk-input:focus{outline:0;border-color:#f59e0b}'
      + '.dk-row{display:flex;gap:8px;align-items:center}'
      + '.dk-mic{background:#f59e0b;border:0;color:#fff;width:42px;height:42px;border-radius:50%;font-size:18px;cursor:pointer;flex-shrink:0}'
      + '.dk-mic.rec{background:#ef4444;animation:dkPulse 1.2s infinite}'
      + '@keyframes dkPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.55)}50%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}'
      + '.dk-btn{display:block;width:100%;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;border:0;padding:13px 14px;border-radius:11px;font-size:15px;font-weight:600;cursor:pointer;margin-top:10px}'
      + '.dk-btn:hover{filter:brightness(1.07)}'
      + '.dk-btn.ghost{background:transparent;border:1px solid #2c2f36;color:#cfd5dd;font-weight:500}'
      + '.dk-review{background:#13161c;border:1px solid #2c2f36;border-radius:14px;padding:16px 18px;margin-top:14px;font-size:14px;line-height:1.65;color:#dde2e8}'
      + '.dk-review p{margin:0 0 12px 0}'
      + '.dk-review p:last-child{margin-bottom:0}'
      + '.dk-review b,.dk-review strong{color:#fff;display:inline-block;margin-top:2px}'
      + '.dk-step{font-size:11px;color:#8a93a0;letter-spacing:.6px;text-transform:uppercase;margin-bottom:6px}'
      + '.dk-lock{background:linear-gradient(135deg,#f59e0b22,#ef444422);border:1px solid #f59e0b66;border-radius:14px;padding:22px;text-align:center}'
      + '.dk-lock h2{font-size:18px;margin:8px 0}'
      + '.dk-lock p{color:#cfd5dd;line-height:1.55;font-size:14px;margin:10px 0 16px}'
      // --- светлая тема ---
      + '[data-theme="light"] .dk-wrap{color:#1a1a2e}'
      + '[data-theme="light"] .dk-h1{color:#0f1020}'
      + '[data-theme="light"] .dk-sub{color:#555}'
      + '[data-theme="light"] .dk-back{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.12);color:#444}'
      + '[data-theme="light"] .dk-rank{background:#fff;border-color:rgba(0,0,0,.1);color:#222}'
      + '[data-theme="light"] .dk-rank b{color:#b35900}'
      + '[data-theme="light"] .dk-card{background:#fff;border-color:rgba(0,0,0,.1);color:#222}'
      + '[data-theme="light"] .dk-card:hover{border-color:#f59e0b}'
      + '[data-theme="light"] .dk-card-h{color:#0f1020}'
      + '[data-theme="light"] .dk-card-d{color:#666}'
      + '[data-theme="light"] .dk-card-c{color:#888}'
      + '[data-theme="light"] .dk-list-item{background:#fff;border-color:rgba(0,0,0,.1);color:#222}'
      + '[data-theme="light"] .dk-list-item:hover{border-color:#f59e0b}'
      + '[data-theme="light"] .dk-list-item.done{border-color:rgba(34,197,94,.5)}'
      + '[data-theme="light"] .dk-sit{background:#fff7e6;border-left-color:#f59e0b;color:#5b3a00}'
      + '[data-theme="light"] .dk-text,[data-theme="light"] .dk-input{background:#fff;border-color:rgba(0,0,0,.15);color:#111}'
      + '[data-theme="light"] .dk-text:focus,[data-theme="light"] .dk-input:focus{border-color:#f59e0b}'
      + '[data-theme="light"] .dk-review{background:#fafbfc;border-color:rgba(0,0,0,.1);color:#222}'
      + '[data-theme="light"] .dk-review b,[data-theme="light"] .dk-review strong{color:#000}'
      + '[data-theme="light"] .dk-step{color:#777}'
      + '[data-theme="light"] .dk-btn.ghost{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.12);color:#222}'
      + '[data-theme="light"] .dk-lock{background:linear-gradient(135deg,#fff7e6,#ffe9d1);border-color:#f59e0b88}'
      + '[data-theme="light"] .dk-lock h2{color:#0f1020}'
      + '[data-theme="light"] .dk-lock p{color:#444}'
      + '.dk-answer-box{background:#0f1116;border:1px solid #2c2f36;border-radius:10px;padding:12px;font-size:14px;line-height:1.5;color:#cfd5dd}'
      + '[data-theme="light"] .dk-answer-box{background:#fafbfc;border-color:rgba(0,0,0,.1);color:#222}'
      ;
    var s = document.createElement('style'); s.id = 'dk-styles'; s.textContent = css; document.head.appendChild(s);
  }

  // ---------- голос ----------
  function attachMic(btnId, taId) {
    var btn = document.getElementById(btnId);
    var ta = document.getElementById(taId);
    if (!btn || !ta) return;
    var rec = false;
    btn.onclick = async function () {
      if (!window.voiceManager || typeof window.voiceManager.startRecording !== 'function') {
        toast('Голосовой ввод недоступен', 'warning'); return;
      }
      if (rec) { try { window.voiceManager.stopRecording(); } catch (e) {} return; }
      try {
        rec = true; btn.classList.add('rec');
        await window.voiceManager.startRecording({
          sttOnly: true,
          onTranscript: function (text) {
            if (!text) return;
            var prev = ta.value || '';
            ta.value = prev ? (prev + ' ' + text) : text;
            ta.dispatchEvent(new Event('input'));
          },
          onStop: function () { rec = false; btn.classList.remove('rec'); }
        });
      } catch (e) { rec = false; btn.classList.remove('rec'); }
    };
  }
  function speakSit(text) {
    if (!window.voiceManager || typeof window.voiceManager.textToSpeech !== 'function') return;
    try { window.voiceManager.textToSpeech(text); } catch (e) {}
  }

  // ---------- меню сегментов ----------
  function home() {
    injectStyles();
    var c = document.getElementById('screenContainer');
    if (!c) return;
    if (!isPremium()) { renderLocked(); return; }
    ensurePremium().then(function (ok) {
      if (!ok) { renderLocked(); return; }
      loadProg();
      var r = rank(PROG.count);
      var appliedCount = PROG.appliedCount || 0;
      var rankLine = '<div class="dk-rank"><div>Готовность: <b>' + PROG.count + '</b>'
        + (r.next ? ' <span style="color:#9aa3ad">· до «' + (rank(r.next).name) + '» — ' + (r.next - PROG.count) + '</span>' : ' <span style="color:#9aa3ad">· максимум</span>')
        + (appliedCount > 0 ? ' · <b style="color:#22c55e">' + appliedCount + ' прожито</b>' : '')
        + '</div><div>' + r.name + '</div></div>';
      // Ситуация дня — детерминированно по дате (одна на день)
      var today = new Date();
      var dayKey = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
      var dayHash = 0; for (var i = 0; i < dayKey.length; i++) dayHash = (dayHash * 31 + dayKey.charCodeAt(i)) & 0x7fffffff;
      var dailyIdx = dayHash % BANK.length;
      var dailySit = BANK[dailyIdx];
      var dailySeg = SEG.find(function (s) { return s.id === dailySit.seg; });
      var dailyDone = !!PROG.done[dailyIdx];
      var dailyBlock = '<div class="dk-card" style="background:linear-gradient(135deg,#1f1610,#1a1d23);border-color:#f59e0b66;margin-bottom:14px" onclick="DOTOGO.openDaily()">'
        + '<div class="dk-step" style="margin:0 0 6px">🗓 Ситуация дня · ' + dailySeg.icon + ' ' + esc(dailySeg.name) + (dailyDone ? ' · ✓' : '') + '</div>'
        + '<div style="font-size:14px;line-height:1.5;color:#fdebd0">' + esc(dailySit.text) + '</div>'
        + '<div class="dk-card-c" style="margin-top:8px;color:#f59e0b">Нажмите, чтобы отрепетировать →</div>'
        + '</div>';
      var segCards = SEG.map(function (s) {
        var total = BANK.filter(function (b) { return b.seg === s.id; }).length;
        var done = BANK.filter(function (b, i) { return b.seg === s.id && PROG.done[i]; }).length;
        return '<div class="dk-card" onclick="DOTOGO.openSeg(\'' + s.id + '\')">'
          + '<div class="dk-card-h">' + s.icon + ' ' + esc(s.name) + '</div>'
          + '<div class="dk-card-d">' + esc(s.desc) + '</div>'
          + '<div class="dk-card-c">Отрепетировано: ' + done + ' / ' + total + '</div>'
          + '</div>';
      }).join('');

      c.innerHTML = ''
        + '<div class="dk-wrap">'
        +   '<button class="dk-back" onclick="DOTOGO.exit()">◀️ Назад</button>'
        +   '<div class="dk-h1">🎬 До того, как</div>'
        +   '<div class="dk-sub">Мысленно репетируй ситуации, в которые ты обычно попадаешь врасплох. Чтобы, когда они случатся в жизни, у тебя уже был готовый паттерн. Опора на mental rehearsal (Suinn) и implementation intentions (Gollwitzer).</div>'
        +   rankLine
        +   dailyBlock
        +   '<div class="dk-step">Выберите сегмент</div>'
        +   '<div class="dk-grid">' + segCards + '</div>'
        + '</div>';
      track('feature_opened', { feature: 'dotogokak_home' });
    });
  }

  function openDaily() {
    var today = new Date();
    var dayKey = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var dayHash = 0; for (var i = 0; i < dayKey.length; i++) dayHash = (dayHash * 31 + dayKey.charCodeAt(i)) & 0x7fffffff;
    var dailyIdx = dayHash % BANK.length;
    openSit(dailyIdx);
  }

  function renderLocked() {
    var c = document.getElementById('screenContainer');
    if (!c) return;
    c.innerHTML = ''
      + '<div class="dk-wrap">'
      +   '<button class="dk-back" onclick="DOTOGO.exit()">◀️ Назад</button>'
      +   '<div class="dk-h1">🎬 До того, как</div>'
      +   '<div class="dk-lock">'
      +     '<div style="font-size:38px">🔒</div>'
      +     '<h2>Доступно по подписке Premium</h2>'
      +     '<p>«До того, как» — тренажёр поведенческих сценариев. 100 ситуаций в 8 сегментах. Разбор каждого ответа от Фреди. Премиум.</p>'
      +     '<button class="dk-btn" onclick="DOTOGO.openPremium()">Открыть Premium</button>'
      +   '</div>'
      + '</div>';
  }
  function openPremium() {
    if (typeof window.showPremiumLockPopup === 'function') return window.showPremiumLockPopup('До того, как');
    if (typeof window.openPremium === 'function') return window.openPremium();
    toast('Откройте раздел «Подписка» в настройках', 'info');
  }
  function exit() {
    if (typeof window.renderDashboard === 'function') return window.renderDashboard();
    document.querySelectorAll('.chat-item').forEach(function (i) { i.classList.remove('active'); });
    var fb = document.querySelector('[data-chat="fredi"]'); if (fb) fb.classList.add('active');
    location.reload();
  }

  // ---------- список ситуаций в сегменте ----------
  function openSeg(segId) {
    var c = document.getElementById('screenContainer'); if (!c) return;
    var seg = SEG.find(function (s) { return s.id === segId; }); if (!seg) return;
    loadProg();
    var items = BANK.map(function (b, i) { return { b: b, i: i }; }).filter(function (x) { return x.b.seg === segId; });
    var html = items.map(function (x) {
      var done = !!PROG.done[x.i];
      return '<div class="dk-list-item' + (done ? ' done' : '') + '" onclick="DOTOGO.openSit(' + x.i + ')">' + esc(x.b.text) + '</div>';
    }).join('');
    c.innerHTML = ''
      + '<div class="dk-wrap">'
      +   '<button class="dk-back" onclick="DOTOGO.home()">◀️ Все сегменты</button>'
      +   '<div class="dk-step">' + seg.icon + ' ' + esc(seg.name) + '</div>'
      +   '<div class="dk-h1">' + items.length + ' ситуаций</div>'
      +   '<div class="dk-sub">Выберите ту, что цепляет. Опишите, как бы вы поступили. Фреди разберёт ваш сценарий и предложит, что ещё стоит продумать.</div>'
      +   html
      + '</div>';
    track('feature_opened', { feature: 'dotogokak_seg', seg: segId });
  }

  // ---------- открыть конкретную ситуацию ----------
  function openSit(idx) {
    var c = document.getElementById('screenContainer'); if (!c) return;
    var b = BANK[idx]; if (!b) return;
    var seg = SEG.find(function (s) { return s.id === b.seg; });
    ST = { idx: idx, segId: b.seg, text: b.text, answer: '', review: '', busy: false };
    renderSit();
    track('feature_opened', { feature: 'dotogokak_sit', idx: idx });
  }

  function renderSit() {
    var c = document.getElementById('screenContainer'); if (!c) return;
    var seg = SEG.find(function (s) { return s.id === ST.segId; });
    var body = '';
    if (!ST.review) {
      body = ''
        + '<div class="dk-row" style="margin-top:8px;justify-content:flex-end">'
        +   '<button class="dk-btn ghost" style="width:auto;padding:6px 12px;margin:0" onclick="DOTOGO.speak()">🔊 Озвучить ситуацию</button>'
        + '</div>'
        + '<div class="dk-step" style="margin-top:14px">Ваш сценарий (минимум 50 символов)</div>'
        + '<div class="dk-row" style="margin-top:6px">'
        +   '<button class="dk-mic" id="dkMic" title="Голосовой ввод">🎤</button>'
        +   '<textarea class="dk-text" id="dkInput" placeholder="Опишите подробно:&#10;— с какой первой фразы начнёте&#10;— как держите тело, голос, взгляд&#10;— как реагируете, если собеседник давит&#10;— к какому исходу ведёте&#10;Чем конкретнее, тем точнее разбор."></textarea>'
        + '</div>'
        + '<button class="dk-btn" id="dkSubmit" onclick="DOTOGO.submit()">Получить разбор от Фреди</button>'
        + '<button class="dk-btn ghost" onclick="DOTOGO.openSeg(\'' + ST.segId + '\')">К списку ситуаций</button>';
    } else {
      var done = ST.applied ? ' done' : '';
      body = ''
        + '<div class="dk-step" style="margin-top:14px">Ваш сценарий</div>'
        + '<div class="dk-answer-box">' + nl2br(ST.answer) + '</div>'
        + '<div class="dk-step" style="margin-top:14px">Разбор Фреди</div>'
        + '<div class="dk-review">' + md(ST.review) + '</div>';
      if (ST.applied) {
        body += ''
          + '<div class="dk-step" style="margin-top:18px">✓ Случилось в жизни</div>'
          + '<div class="dk-answer-box" style="border-left:4px solid #22c55e">' + nl2br(ST.applied) + '</div>';
      } else if (ST.showApplied) {
        body += ''
          + '<div class="dk-step" style="margin-top:18px">Если случится в жизни — запишите здесь</div>'
          + '<textarea class="dk-text" id="dkApplied" placeholder="Что произошло на самом деле? Сработал ли сценарий? Что бы изменили?" style="min-height:80px"></textarea>'
          + '<button class="dk-btn" style="background:linear-gradient(135deg,#22c55e,#10b981)" onclick="DOTOGO.markApplied()">✓ Сохранить как прожитое</button>';
      }
      body += ''
        + '<button class="dk-btn" onclick="DOTOGO.nextSit()">▶️ Следующая ситуация</button>'
        + '<button class="dk-btn ghost" onclick="DOTOGO.openSeg(\'' + ST.segId + '\')">К списку</button>';
      if (!ST.applied && !ST.showApplied) {
        body += '<button class="dk-btn ghost" onclick="DOTOGO.showApplied()">✓ Случилось в жизни — записать</button>';
      }
      body += '<button class="dk-btn ghost" onclick="DOTOGO.openSupervizor()">🧭 Разобрать в Супервизоре</button>';
    }
    c.innerHTML = ''
      + '<div class="dk-wrap">'
      +   '<button class="dk-back" onclick="DOTOGO.openSeg(\'' + ST.segId + '\')">◀️ К списку</button>'
      +   '<div class="dk-step">' + seg.icon + ' ' + esc(seg.name) + '</div>'
      +   '<div class="dk-h1">' + (ST.review ? '📋 Разбор' : '🎬 Ситуация') + '</div>'
      +   '<div class="dk-sit">' + esc(ST.text) + '</div>'
      +   body
      + '</div>';
    if (!ST.review) attachMic('dkMic', 'dkInput');
  }

  function speak() { if (ST && ST.text) speakSit(ST.text); }

  async function submit() {
    if (!ST || ST.busy) return;
    var ta = document.getElementById('dkInput'); if (!ta) return;
    var txt = (ta.value || '').trim();
    if (txt.length < 50) {
      toast('Опишите подробнее — минимум 50 символов (' + txt.length + ' пока).', 'warning');
      ta.focus();
      return;
    }
    ST.answer = txt;
    ST.busy = true;
    var btn = document.getElementById('dkSubmit');
    if (btn) { btn.textContent = '⏳ Фреди думает…'; btn.disabled = true; btn.style.opacity = '0.7'; }
    ta.disabled = true;

    var prompt = buildReviewPrompt();
    var resp = await aiGenerate(prompt, { max_tokens: 700, temperature: 0.55 });
    var raw = (resp && (resp.content || resp.response || resp.text || resp.data || resp.message)) || '';
    var review = clean(raw);
    if (!review) {
      try { console.warn('[dotogokak] empty review, raw resp:', resp); } catch (e) {}
      toast('Не получилось получить разбор. Попробуйте ещё раз.', 'error');
      ST.busy = false;
      if (btn) { btn.textContent = 'Получить разбор от Фреди'; btn.disabled = false; btn.style.opacity = ''; }
      if (ta) ta.disabled = false;
      return;
    }
    ST.review = review;
    ST.busy = false;
    if (!PROG.done[ST.idx]) {
      PROG.done[ST.idx] = true;
      PROG.count += 1;
    }
    PROG.history.unshift({ idx: ST.idx, ts: Date.now(), answer: ST.answer, review: ST.review });
    PROG.history = PROG.history.slice(0, 200);
    saveProg();
    renderSit();
    track('feature_opened', { feature: 'dotogokak_review', idx: ST.idx });
  }

  function markApplied() {
    if (!ST) return;
    var ta = document.getElementById('dkApplied');
    var txt = ta ? (ta.value || '').trim() : '';
    if (txt.length < 10) { toast('Расскажите коротко — что случилось и как сработал сценарий.', 'warning'); if (ta) ta.focus(); return; }
    ST.applied = txt;
    // обновить в истории
    for (var i = 0; i < PROG.history.length; i++) {
      if (PROG.history[i].idx === ST.idx && !PROG.history[i].applied) {
        PROG.history[i].applied = txt;
        PROG.history[i].appliedTs = Date.now();
        break;
      }
    }
    if (!PROG.appliedCount) PROG.appliedCount = 0;
    PROG.appliedCount += 1;
    saveProg();
    toast('Сохранено. ' + PROG.appliedCount + ' ситуаций уже отрепетировано и прожито.', 'success');
    renderSit();
    track('feature_opened', { feature: 'dotogokak_applied', idx: ST.idx });
  }

  function openSupervizor() {
    if (typeof window.showSupervizorScreen === 'function') {
      window.showSupervizorScreen();
    } else {
      var s = document.createElement('script');
      s.src = 'supervizor.js';
      s.onload = function () { if (typeof window.showSupervizorScreen === 'function') window.showSupervizorScreen(); };
      document.head.appendChild(s);
    }
  }

  function nextSit() {
    if (!ST) return home();
    var seg = ST.segId;
    var pool = BANK.map(function (b, i) { return { b: b, i: i }; }).filter(function (x) { return x.b.seg === seg && !PROG.done[x.i]; });
    if (pool.length === 0) {
      toast('В этом сегменте все ситуации отрепетированы! Попробуйте другой.', 'success');
      home(); return;
    }
    var pick = pool[Math.floor((PROG.history.length * 7919 + ST.idx + 13) % pool.length)] || pool[0];
    openSit(pick.i);
  }

  function buildReviewPrompt() {
    var seg = SEG.find(function (s) { return s.id === ST.segId; });
    return ''
      + 'Ты — опытный наставник-психолог и переговорщик. Игрок «До того, как» мысленно репетирует поведенческий сценарий, чтобы быть готовым к реальной ситуации.\n\n'
      + 'Сегмент: ' + seg.name + '.\n\n'
      + 'СИТУАЦИЯ:\n' + ST.text + '\n\n'
      + 'СЦЕНАРИЙ ИГРОКА:\n' + ST.answer + '\n\n'
      + 'Сделай короткий, точный разбор ровно по этой структуре (используй эти жирные заголовки через ** **):\n\n'
      + '**✅ Что в сценарии сильного.** 1-2 фразы — что игрок сделал правильно.\n'
      + '**⚠️ Где может сорваться.** 1-2 фразы — слабое место. Без морализаторства, конкретно.\n'
      + '**🔄 Альтернативный ход.** Один короткий другой вариант поведения, который тоже сработал бы в этой ситуации.\n'
      + '**🗝 Микро-фраза-якорь.** Конкретная короткая фраза (1 предложение), с которой стоит начать в этой ситуации. Чтобы игрок мог её запомнить и применить в реальной жизни.\n'
      + '**⭐ Балл проработанности.** От 1 до 5 звёзд с одной строкой объяснения.\n\n'
      + 'Тон: уважительный, на «вы», прямой, без воды. Никаких длинных рассуждений — только по делу. Не суди — помогай.';
  }

  function showApplied() {
    if (!ST) return;
    ST.showApplied = true;
    renderSit();
    setTimeout(function () {
      var el = document.getElementById('dkApplied');
      if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }, 50);
  }

  // экспорт
  window.DOTOGO = {
    home: home, exit: exit, openPremium: openPremium,
    openSeg: openSeg, openSit: openSit,
    speak: speak, submit: submit, nextSit: nextSit,
    markApplied: markApplied, showApplied: showApplied,
    openSupervizor: openSupervizor,
    openDaily: openDaily
  };
  window.showDotogokakScreen = home;
  console.log('✅ dotogokak.js loaded (игра «До того, как», 100 ситуаций в 8 сегментах)');
})();
