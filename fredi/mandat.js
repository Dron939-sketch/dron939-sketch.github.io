// ============================================
// mandat.js — Игра «Мандат: цена кресла».
// Симулятор депутата: сначала вводные (город, партия, бэкграунд, зачем шёл),
// потом Фреди подкидывает ситуации-развилки. Каждая — размен между пятью
// шкалами: 👥 Люди (доверие избирателей), 🏛 Вертикаль (лояльность партии),
// 🏢 Аппарат (вес в мэрии), 💰 Ресурс (бюджет+карман) и скрытая ⚖ Совесть.
// Урок — психология власти и компромисса: конформизм, «скользкая дорожка»,
// когнитивный диссонанс, моральное лицензирование. Финал — разбор от Фреди:
// каким ты стал и какой ценой добился влияния.
// Экспорт: window.showMandatGame, window.MANDAT
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || ''; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function ri(n) { return Math.floor(Math.random() * n); }
  function rpick(a) { return a[ri(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = ri(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 480, temperature: opts.temperature == null ? 0.6 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ---------- ВВОДНЫЕ ДАННЫЕ (выбор игрока перед стартом) ----------
  var CITIES = {
    mono:   { id: 'mono',   em: '🏭', name: 'Моногород', desc: 'Один завод, все на виду, денег в обрез. Тебя знают в лицо.', scrutiny: 1, fx: { R: -10, A: 5 } },
    oblast: { id: 'oblast', em: '🏙', name: 'Областной центр', desc: 'Средний город: и ресурсы, и внимание — всего поровну.', scrutiny: 2, fx: {} },
    mega:   { id: 'mega',   em: '🌃', name: 'Район мегаполиса', desc: 'Большие деньги и большие СМИ. Люди далеко, риски близко.', scrutiny: 3, fx: { R: 15, A: -5, P: -5 } }
  };
  var PARTIES = {
    power: { id: 'power', em: '🐻', name: 'Партия власти', desc: 'Защита, ресурс, доступ к мэрии — но куратор ждёт дисциплины.', freedom: 1, fx: { V: 22, A: 10, R: 10 } },
    opp:   { id: 'opp',   em: '🌹', name: 'Системная оппозиция', desc: 'Симпатия людей и свобода слова, но мало рычагов и денег.', freedom: 2, fx: { V: -4, P: 12, A: -6 } },
    self:  { id: 'self',  em: '🕊', name: 'Самовыдвиженец', desc: 'Полная свобода — и полное одиночество. Ни щита, ни казны.', freedom: 3, fx: { V: -22, A: -6, R: -10, P: 6 } }
  };
  var BGS = {
    biz:    { id: 'biz',    em: '💼', name: 'Бизнесмен', desc: 'Свои деньги и хватка. Можешь вложиться сам — но люди косятся.', kozyr: 'money',   fx: { R: 22, C: -3 } },
    budjet: { id: 'budjet', em: '🩺', name: 'Бюджетник', desc: 'Врач/учитель. Свой для людей, говоришь с ними на одном языке.', kozyr: 'svoy',   fx: { P: 15, C: 5 } },
    activ:  { id: 'activ',  em: '📢', name: 'Активист', desc: 'Пришёл с улицы, за тобой люди. Но мэрия смотрит волком.', kozyr: 'oglaska', fx: { P: 10, C: 10, A: -12 } },
    appar:  { id: 'appar',  em: '🗂', name: 'Аппаратчик', desc: 'Знаешь систему изнутри, вхож в кабинеты. Совесть слегка гибкая.', kozyr: 'kuluary', fx: { A: 22, V: 10, C: -6 } }
  };
  var MOTIVES = {
    help:  { id: 'help',  em: '❤️', name: 'Реально помочь людям', desc: 'Верность себе = высокое доверие людей и чистая совесть.' },
    power: { id: 'power', em: '♟', name: 'Власть и карьера', desc: 'Верность себе = рост наверх, вес во власти.' },
    money: { id: 'money', em: '🪙', name: 'Решить свои дела', desc: 'Верность себе = ресурс и связи в кармане.' }
  };

  var METERS = [
    { k: 'P', em: '👥', name: 'Люди', hint: 'доверие избирателей' },
    { k: 'V', em: '🏛', name: 'Вертикаль', hint: 'лояльность партии и куратора' },
    { k: 'A', em: '🏢', name: 'Аппарат', hint: 'вес в мэрии, способность «решать»' },
    { k: 'R', em: '💰', name: 'Ресурс', hint: 'бюджет округа и личные средства' },
    { k: 'C', em: '⚖️', name: 'Совесть', hint: 'твоя цельность — зачем ты шёл' }
  ];

  var MAXTURN = 10;

  // ============================================================
  // БИБЛИОТЕКА СИТУАЦИЙ (Фреди подкидывает). t: тег выбора для разбора.
  //   conform — прогнулся под вертикаль; corrupt — размен совести на ресурс;
  //   principled — встал на своё; pragma — компромисс; escape — уход от выбора.
  // fx — дельты шкал. req — требование (иначе опция заблокирована).
  // ============================================================
  var DILEMMAS = [
    { id: 'krysha', icon: '🏠', tag: 'Наказ избирателей',
      text: 'Бабушка с твоего округа: течёт крыша, УК разводит руками, пенсии на ремонт не хватит. Остаток бюджета округа почти пуст.',
      opts: [
        { lbl: 'Пустить остаток бюджета на её дом', sub: 'Людям поможешь, но касса опустеет', fx: { P: 10, R: -14, C: 5 }, t: 'principled', res: 'Крышу починили. Весь подъезд теперь знает, к кому идти. Касса округа — пустая.' },
        { lbl: 'Отправить по инструкции в УК и жилинспекцию', sub: 'Формально верно, по-человечески — отписка', fx: { P: -8, A: 4, C: -5 }, t: 'escape', res: 'Ты закрылся инструкцией. Бабушка ушла ни с чем, а история про «депутата-отписку» пошла по двору.' },
        { lbl: 'Попросить знакомого застройщика «помочь округу»', sub: 'Крыша будет — но ты теперь должен', fx: { P: 9, R: 6, C: -8 }, t: 'corrupt', flag: 'debtDev', res: 'Застройщик прислал бригаду за день. «Свои люди, сочтёмся», — улыбнулся он. Ты кивнул. Долг записан.' }
      ] },
    { id: 'discipline', icon: '🗳', tag: 'Партийная дисциплина',
      text: 'Куратор звонит перед заседанием: «Завтра голосуем ЗА, тут без вариантов». Закон непопулярный, твои избиратели против.',
      when: function (st) { return st.party.id !== 'self'; },
      opts: [
        { lbl: 'Проголосовать «за», как велено', sub: 'Куратор доволен, люди — нет', fx: { V: 10, P: -12, C: -8 }, t: 'conform', res: 'Ты нажал зелёную кнопку вместе со всеми. Куратор кивнул. Внутри что-то тихо щёлкнуло и промолчало.' },
        { lbl: 'Проголосовать против / воздержаться', sub: 'Останешься собой, но выйдешь из строя', fx: { V: -16, P: 12, C: 8 }, t: 'principled', flag: 'rebel', res: 'Твоё «против» заметили все. Избиратели зауважали, куратор занёс тебя в блокнот. Строй не прощает.' },
        { lbl: '«Заболеть» и не прийти на голосование', sub: 'Ни вашим, ни нашим', fx: { V: -5, P: -3, C: -6 }, t: 'escape', res: 'Ты отсиделся дома. Голос не испачкал, но и не защитил никого. Уклонился — тоже выбор, просто молча.' }
      ] },
    { id: 'skver', icon: '🌳', tag: 'Точечная застройка',
      text: 'Инвестор хочет застроить единственный сквер во дворе. Взамен обещает «благоустроить весь округ» — новые лавочки, детская площадка.',
      opts: [
        { lbl: 'Поддержать стройку — округ похорошеет', sub: 'Подачки сейчас, сквера не будет никогда', fx: { R: 10, A: 8, P: -12, C: -12 }, t: 'corrupt', flag: 'debtDev', res: 'Ты выбрал лавочки против деревьев. Округ «благоустроят», а во дворе вырастет ЖК. Жители запомнят.' },
        { lbl: 'Встать на сторону жителей против стройки', sub: 'Сквер спасёшь, мэрию и инвестора — обозлишь', fx: { P: 14, C: 10, A: -8, V: -6 }, t: 'principled', res: 'Ты вышел к людям с плакатами. Сквер отстояли. Мэрия теперь считает тебя «неудобным».' },
        { lbl: 'Продавить компромисс: полсквера сохранить', sub: 'Нужен вес в мэрии, чтобы додавить', fx: { P: 6, A: 4, C: 4 }, t: 'pragma', req: { A: 50 }, reqTxt: 'нужен вес в мэрии (Аппарат ≥ 50)', res: 'Ты сел за стол и выторговал: стройка ужимается, полсквера остаётся. Не идеально — но живые деревья.' }
      ] },
    { id: 'konvert', icon: '✉️', tag: 'Прямой подкуп',
      text: 'После заседания к тебе в кабинет заходит «решала»: за нужное голосование по земле — плотный конверт. «Все берут. Ты же не чужой».',
      opts: [
        { lbl: 'Взять конверт', sub: 'Быстрые деньги — и первый настоящий крючок', fx: { R: 18, C: -18 }, t: 'corrupt', flag: 'bribe', res: 'Конверт лёг во внутренний карман. Тёплый. С этой секунды у тебя есть то, что можно предъявить. Первый шаг всегда самый лёгкий.' },
        { lbl: 'Отказать — «не по адресу»', sub: 'Денег не будет, но и крючка тоже', fx: { R: -4, C: 12, P: 3 }, t: 'principled', res: 'Ты вернул конверт. «Как знаешь», — пожал он плечами. Ты остался чистым и чуть более одиноким.' },
        { lbl: 'Взять, но «пустить на округ»', sub: 'Успокоить себя: я же для людей', fx: { R: 12, A: 4, C: -10 }, t: 'corrupt', flag: 'bribe', res: 'Ты взял и правда потратил на двор. «Я же не себе». Так это и работает: сначала — на людей, потом — уже как получится.' }
      ] },
    { id: 'jursledstvie', icon: '📰', tag: 'Журналист копает',
      priority: true, once: true,
      when: function (st) { return st.flags.bribe && st.city.scrutiny >= 2; },
      text: 'Местный журналист вышел на след того конверта. Просит комментарий и намекает, что материал почти готов.',
      opts: [
        { lbl: 'Надавить через куратора на редакцию', sub: 'Замять — но это уже вторая ложь поверх первой', fx: { V: -6, C: -10, A: -4 }, t: 'corrupt', req: { V: 45 }, reqTxt: 'нужна поддержка вертикали (Вертикаль ≥ 45)', flag: 'coverup', res: 'Звонок сверху — и материал «не пошёл». Ты выдохнул. И увяз глубже: теперь замазаны двое.' },
        { lbl: 'Признать ошибку и вернуть деньги публично', sub: 'Больно сейчас — чище потом', fx: { P: 8, C: 14, R: -12, V: -8 }, t: 'principled', res: 'Ты вышел и сказал как есть. Скандал вспыхнул и... через неделю осел. Люди прощают признавшихся чаще, чем пойманных.' },
        { lbl: 'Всё отрицать', sub: 'Ставка на то, что не докажут', fx: { C: -8, P: -6 }, t: 'escape', flag: 'coverup', res: 'Ты всё отрицал, глядя в камеру. Теперь всё зависит от того, что у журналиста в папке.' }
      ] },
    { id: 'priemnaya', icon: '🪑', tag: 'Приёмная граждан',
      text: 'День приёма. Очередь до лестницы, каждый со своей бедой, а ты вымотан и опаздываешь на согласование в мэрию.',
      opts: [
        { lbl: 'Вникать в каждого, сколько нужно', sub: 'Люди почувствуют — но ты выгораешь', fx: { P: 12, C: 6, A: -4 }, t: 'principled', flag: 'tired', res: 'Ты принял всех до последнего. Люди ушли согретыми, ты — выжатым. На согласование опоздал.' },
        { lbl: 'Быстро, по регламенту, дежурные отписки', sub: 'Успеешь везде, но людей это чувствует', fx: { P: -8, A: 4, C: -5 }, t: 'escape', res: 'Ты отработал приём как конвейер. Успел в мэрию. Люди ушли с бумажкой и ощущением, что до них нет дела.' },
        { lbl: 'Посадить помощника и выстроить систему', sub: 'Нужен ресурс на команду', fx: { P: 8, A: 6 }, t: 'pragma', req: { R: 45 }, reqTxt: 'нужны средства на помощника (Ресурс ≥ 45)', res: 'Ты нанял толкового помощника и развёл потоки. Теперь помощь идёт системно, а не на твоём износе.' }
      ] },
    { id: 'kumovstvo', icon: '👨‍👦', tag: 'Кумовство',
      text: 'Старый друг просит пристроить сына на «тёплое» бюджетное место. «Ну свои же люди, ты теперь можешь».',
      opts: [
        { lbl: 'Помочь — свои же люди', sub: 'Дружбу сохранишь, принцип — нет', fx: { A: 5, C: -10, R: 4 }, t: 'corrupt', res: 'Парень устроен. Друг благодарен. А ты сделал ровно то, за что критиковал предшественника. Мелочь? С мелочей и начинается.' },
        { lbl: 'Отказать по-честному', sub: 'Друг обидится, совесть — нет', fx: { C: 10, P: 2 }, t: 'principled', res: 'Ты объяснил, почему не можешь. Друг холодно попрощался. Иногда цена принципа — конкретные отношения.' },
        { lbl: 'Помочь пройти по-честному, через конкурс', sub: 'Дать шанс, а не место', fx: { C: 4, A: 2 }, t: 'pragma', res: 'Ты не «пристроил», а подсказал, как честно участвовать. Друг слегка разочарован, но уважение осталось.' }
      ] },
    { id: 'protest', icon: '📣', tag: 'Протест во дворе',
      text: 'Жители вышли против уплотнительной застройки. Зовут тебя выйти к ним. Мэрия «настоятельно рекомендует» не появляться.',
      opts: [
        { lbl: 'Выйти к людям и возглавить', sub: 'Люди — с тобой, мэрия — против', fx: { P: 15, C: 8, A: -10, V: -6 }, t: 'principled', res: 'Ты вышел на площадь. Тебя качали на руках. В мэрии твоё имя произнесли сквозь зубы.' },
        { lbl: 'Тихо решить в кабинетах, без площадей', sub: 'Меньше шума — меньше и доверия', fx: { A: 6, C: -3, P: -4 }, t: 'pragma', req: { A: 50 }, reqTxt: 'нужен вес в мэрии (Аппарат ≥ 50)', res: 'Ты не пошёл на площадь, но занёс вопрос в нужный кабинет. Часть требований учли. Люди не увидели твоей роли.' },
        { lbl: 'Не вмешиваться — «это эмоции»', sub: 'Спрятаться за нейтралитет', fx: { P: -12, C: -6, V: 4 }, t: 'escape', res: 'Ты отсиделся. «Депутат, которого не было, когда стало горячо» — так тебя и запомнят.' }
      ] },
    { id: 'shema', icon: '🤝', tag: 'Откатная схема',
      text: 'Матёрый коллега по совету зовёт «в долю»: госконтракты на благоустройство через свою фирму, откат делится на всех. «Не будь белой вороной».',
      opts: [
        { lbl: 'Войти в схему', sub: 'Деньги рекой — и ты повязан со всеми', fx: { R: 20, A: 8, C: -20 }, t: 'corrupt', flag: 'scheme', res: 'Ты в доле. Денег стало ощутимо больше, а свободы — меньше: теперь ты повязан круговой порукой.' },
        { lbl: 'Вежливо отказаться', sub: 'Останешься чужим в своём совете', fx: { C: 12, V: -6, A: -4 }, t: 'principled', res: 'Ты отказался — мягко, без обличений. Тебя занесли в «ненадёжные». Одиночество — цена незамазанных рук.' },
        { lbl: 'Отказаться и по-тихому собрать доказательства', sub: 'Опасная игра в чистоту', fx: { C: 10, V: -10, P: 4 }, t: 'principled', flag: 'whistle', res: 'Ты сказал «нет» и начал тихо фиксировать. Благородно и очень рискованно: система не любит, когда её записывают.' }
      ] },
    { id: 'dvory', icon: '🏗', tag: 'Дилемма распределения',
      text: 'На благоустройство дали денег ровно на один двор. Двор А — где живут твои избиратели и где ты обещал. Двор Б — где реально хуже всего, но там тебя не выбирали.',
      opts: [
        { lbl: 'Двор А — где твои избиратели', sub: 'Держишь слово своим, но не самым нуждающимся', fx: { P: 8, V: 3, C: -3 }, t: 'pragma', res: 'Ты вложился в свой двор. Обещание сдержал, рейтинг подрос. Двор Б смотрит с обидой.' },
        { lbl: 'Двор Б — где хуже всего', sub: 'По справедливости, но свои не поймут', fx: { P: -4, C: 10 }, t: 'principled', res: 'Ты отдал деньги туда, где больнее. Справедливо. Свои избиратели ворчат: «Мы тебя выбирали, а ты — чужим».' },
        { lbl: 'Размазать поровну — всем понемногу', sub: 'Никого не обидеть — и никому не помочь', fx: { P: -3, C: -3, A: -2 }, t: 'escape', res: 'Ты поделил на всех тонким слоем. В итоге нигде не заметно. «И нашим, и вашим» обычно значит «никому».' }
      ] },
    { id: 'napadki', icon: '🎤', tag: 'Наезд на заседании',
      text: 'Оппонент публично, при камерах, обвиняет тебя в некомпетентности и переходит на личность. Зал ждёт реакции.',
      opts: [
        { lbl: 'Ответить по существу, спокойно', sub: 'Достоинство читается сильнее хамства', fx: { P: 8, C: 6, A: 3 }, t: 'principled', res: 'Ты не повёлся, ответил фактами и с достоинством. Зал на твоей стороне: спокойствие обезоружило крикуна.' },
        { lbl: 'Осадить его жёстко, при всех', sub: 'Приятно — но выглядит как склока', fx: { P: -6, V: 3, C: -5 }, t: 'escape', res: 'Ты вмазал в ответ. В моменте — сладко, на записи — двое орущих мужиков. Зрители не разобрались, кто прав.' },
        { lbl: 'Смолчать, «не опускаться»', sub: 'Иногда молчание читают как слабость', fx: { P: -4, C: 2 }, t: 'escape', res: 'Ты промолчал. Кто-то счёл это выдержкой, большинство — что тебе нечего ответить.' }
      ] },
    { id: 'slit', icon: '🎯', tag: 'Сдать неудобного',
      text: 'Куратор предлагает сделку: помоги дискредитировать неудобного активиста — и тебе гарантируют место в списке на следующий срок.',
      when: function (st) { return st.party.id !== 'self'; },
      opts: [
        { lbl: 'Согласиться — место в списке важнее', sub: 'Карьера в обмен на чужую репутацию', fx: { V: 14, A: 6, C: -18, P: -6 }, t: 'corrupt', flag: 'betray', res: 'Ты помог утопить человека, который не сделал тебе ничего. Место в списке твоё. Отражение в зеркале — уже не совсем.' },
        { lbl: 'Отказаться наотрез', sub: 'Место под угрозой, но руки чисты', fx: { V: -12, C: 14, P: 4 }, t: 'principled', res: 'Ты отказался топить живого человека. Куратор холодно кивнул. Твоё место в списке повисло на волоске.' },
        { lbl: 'Тянуть время и саботировать', sub: 'Не отказ и не согласие', fx: { V: -4, C: 2 }, t: 'escape', res: 'Ты кивал и ничего не делал. Пока прокатило. Но вечно между струйками не пройдёшь.' }
      ] },
    { id: 'obeshanie', icon: '📋', tag: 'Невыполнимое обещание',
      text: 'В кампании ты обещал новую поликлинику. Денег в бюджете на неё нет и не будет. Люди спрашивают на встрече: «Ну и где?»',
      opts: [
        { lbl: 'Честно признать, что не потянуть', sub: 'Разочаруешь, но не соврёшь дважды', fx: { P: -6, C: 12 }, t: 'principled', res: 'Ты сказал правду: денег нет, обещал зря. Люди расстроились, но зауважали за честность. Второй лжи не будет.' },
        { lbl: 'Кормить «завтраками» и переносить сроки', sub: 'Рейтинг сейчас — доверие потом', fx: { P: 4, C: -10 }, t: 'escape', res: 'Ты пообещал «в следующем году». И ещё раз. Люди не дураки — «завтраками» доверие проедается тихо, но насквозь.' },
        { lbl: 'Пробить хотя бы ФАП / кабинет врача', sub: 'Не поликлиника, но живой шаг', fx: { P: 6, A: 4, R: -6, C: 5 }, t: 'pragma', req: { A: 45 }, reqTxt: 'нужен вес, чтобы пробить (Аппарат ≥ 45)', res: 'Поликлинику не потянул, но выбил фельдшерский пункт. Не то, что обещал, — но реальная помощь вместо слов.' }
      ] },
    { id: 'solidarnost', icon: '🐻', tag: 'Скандал в партии',
      when: function (st) { return st.party.id === 'power'; },
      text: 'Однопартиец влип в громкий скандал. СМИ ловят тебя в коридоре: «Осуждаете коллегу?» Куратор ждёт солидарности.',
      opts: [
        { lbl: 'Прикрыть коллегу, «это провокация»', sub: 'Вертикаль оценит, люди — нет', fx: { V: 10, P: -8, C: -8 }, t: 'conform', res: 'Ты закрыл собой чужой грех. Куратор доволен. Избиратели увидели, что «свои» важнее правды.' },
        { lbl: 'Сказать честно: «Разберётся следствие»', sub: 'Нейтрально, но без круговой поруки', fx: { V: -6, C: 6, P: 4 }, t: 'pragma', res: 'Ты не стал ни топить, ни выгораживать. Куратор поморщился, люди отметили, что ты не врёшь на автомате.' },
        { lbl: 'Публично осудить', sub: 'Смело — и опасно для карьеры', fx: { V: -14, P: 10, C: 10 }, t: 'principled', flag: 'rebel', res: 'Ты сказал вслух то, что думали все. Люди зауважали, вертикаль внесла тебя в чёрный список.' }
      ] },
    { id: 'sekvestr', icon: '✂️', tag: 'Секвестр бюджета',
      text: 'Бюджет режут. Выбор: урезать соцпрограмму для малоимущих или отказаться от ремонта в своём округе (который добавил бы тебе очков).',
      opts: [
        { lbl: 'Сохранить соцпрограмму, отказаться от ремонта', sub: 'Правильно, но своим нечего показать', fx: { C: 12, P: -4, R: -4 }, t: 'principled', res: 'Ты защитил тех, кому нужнее. Своим избирателям в этот год показать нечего — зато никто не остался без помощи.' },
        { lbl: 'Ремонт округа, соцпрограмму под нож', sub: 'Видимый результат за счёт невидимых людей', fx: { P: 8, C: -12 }, t: 'corrupt', res: 'Ты выбрал то, что видно и что приносит очки. Малоимущие — не твой электорат, их урезали тихо.' },
        { lbl: 'Биться в комиссии за оба', sub: 'Нужен вес, чтобы отвоевать', fx: { A: -4, C: 6, P: 4 }, t: 'pragma', req: { A: 55 }, reqTxt: 'нужен сильный аппаратный вес (Аппарат ≥ 55)', res: 'Ты упёрся в комиссии и отвоевал большую часть обоих. Стоило нервов и политического капитала — но вышло по совести.' }
      ] },
    { id: 'tender', icon: '📑', tag: 'Конфликт интересов',
      when: function (st) { return st.bg.id === 'biz'; },
      text: 'Крупный тендер округа. Твоя (формально переписанная на родню) фирма легко бы его взяла. Никто ничего не докажет.',
      opts: [
        { lbl: 'Подыграть своей фирме', sub: 'Деньги — себе, риск — на потом', fx: { R: 18, C: -16 }, t: 'corrupt', flag: 'conflict', res: 'Тендер ушёл «своим». Формально всё чисто, по сути — ты обслужил себя за счёт должности. Такое всплывает не сразу.' },
        { lbl: 'Самоустраниться от тендера', sub: 'Упустишь выгоду, сохранишь лицо', fx: { R: -4, C: 14, P: 4 }, t: 'principled', res: 'Ты вышел из конкурса, где мог победить нечестно. Деньги мимо — репутация при тебе.' }
      ] },
    { id: 'zhkh', icon: '🔧', tag: 'Коррупция в ЖКХ',
      text: 'Ты нащупал, что управляющие компании округа годами воруют на «капремонте». Куратор «рекомендует» не поднимать тему — «там всё схвачено, не лезь».',
      opts: [
        { lbl: 'Поднять тему, несмотря на «рекомендацию»', sub: 'Люди — за, система — против', fx: { P: 14, C: 12, V: -14, A: -6 }, t: 'principled', flag: 'rebel', res: 'Ты вынес схему на свет. Жители ликуют, УК и покровители в бешенстве. Ты нажил врагов ровно там, где деньги.' },
        { lbl: 'Послушаться и «не лезть»', sub: 'Тихо — но ты теперь всё знаешь', fx: { V: 8, C: -12, P: -4 }, t: 'conform', res: 'Ты закрыл глаза. Спокойнее, безопаснее. И с этого дня ты — уже часть той тишины, которую ненавидел.' },
        { lbl: 'Собрать материалы и ждать момента', sub: 'Не сейчас, но и не молчать навсегда', fx: { C: 4, A: 2 }, t: 'pragma', res: 'Ты не полез напролом, но начал копить. Осторожная позиция: то ли мудрость, то ли способ никогда не рискнуть.' }
      ] },
    { id: 'semya', icon: '🏡', tag: 'Дома говорят: ты изменился',
      priority: true, once: true,
      when: function (st) { return st.m.C <= 42; },
      text: 'Дома тихий вечер. Близкий человек смотрит на тебя и говорит: «Ты изменился. Раньше ты бы так не поступил». И ты понимаешь, что не знаешь, что ответить.',
      opts: [
        { lbl: 'Признать и остановиться, пересобрать себя', sub: 'Развернуться никогда не поздно', fx: { C: 16, V: -4, A: -2 }, t: 'principled', res: 'Ты не стал спорить. Сел и честно посмотрел, во что превращаешься. Разворот стоит очков — но возвращает тебя себе.' },
        { lbl: 'Отмахнуться: «Просто повзрослел»', sub: 'Рационализация — уютный самообман', fx: { C: -8, R: 2 }, t: 'escape', res: '«Это не я изменился, это жизнь такая». Удобная фраза. Именно так и звучит когнитивный диссонанс, когда его не хотят слышать.' }
      ] },
    { id: 'povyshenie', icon: '⬆️', tag: 'Предложение о повышении',
      priority: true, once: true,
      when: function (st) { return st.turn >= 6 && st.m.V >= 60; },
      text: 'Куратор доволен: «Растёшь. Есть мысль двинуть тебя в областной парламент. Но там нужна полная управляемость. Готов?»',
      opts: [
        { lbl: 'Да, я готов быть управляемым', sub: 'Билет наверх — в обмен на поводок', fx: { V: 14, A: 8, C: -12, P: -4 }, t: 'conform', flag: 'promo', res: 'Ты сказал «готов». Лифт наверх поехал. Кнопки в нём нажимаешь уже не ты.' },
        { lbl: 'Наверх — но на своих условиях', sub: 'Рискованно: могут и передумать', fx: { V: -6, P: 6, C: 8 }, t: 'principled', flag: 'promoself', res: 'Ты сказал: «Пойду, но торговать совестью не буду». Куратор задумался. Такие доходят реже — но доходят собой.' },
        { lbl: 'Остаться на земле, среди своих', sub: 'Отказ от лифта ради близости к людям', fx: { P: 8, C: 6, V: -8 }, t: 'principled', res: 'Ты выбрал остаться там, где тебя знают по имени. Кто-то скажет «без амбиций». Ты знаешь — «на своём месте».' }
      ] }
  ];

  var ST = null;

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('md_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, reelected: 0, cleanWins: 0 }; }
  function saveStats(s) { try { localStorage.setItem('md_stats', JSON.stringify(s)); } catch (e) {} }

  // ---------- сборка партии из вводных ----------
  function buildGame(sel) {
    var city = CITIES[sel.city], party = PARTIES[sel.party], bg = BGS[sel.bg], motive = MOTIVES[sel.motive];
    var m = { P: 50, V: 50, A: 50, R: 40, C: 70 };
    [city.fx, party.fx, bg.fx].forEach(function (fx) { for (var k in fx) m[k] = clamp(m[k] + fx[k], 0, 100); });
    return {
      city: city, party: party, bg: bg, motive: motive,
      m: m, turn: 1, over: false, phase: 'play',
      used: {}, flags: {}, cur: null, lastRes: '',
      k: { conform: 0, corrupt: 0, principled: 0, pragma: 0, escape: 0 },
      history: []
    };
  }

  // ============================================================
  // РЕНДЕР
  // ============================================================
  function injectCSS() {
    if (document.getElementById('mdCSS')) return;
    var s = document.createElement('style'); s.id = 'mdCSS';
    s.textContent = [
      '.md-wrap{max-width:680px;margin:0 auto;padding:16px 14px 96px;color:#eef1f6}',
      '.md-h1{font-size:1.4rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.md-lead{font-size:.97rem;line-height:1.6;color:#c3c9d6;margin-bottom:14px}',
      '.md-ghost{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:6px 0;margin-bottom:8px}',
      '.md-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:13px 15px;margin:0 0 11px;line-height:1.55}',
      '.md-ch{font-weight:700;margin-bottom:7px}',
      '.md-sec{font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:#8b93a7;font-weight:700;margin:14px 0 8px}',
      '.md-opt{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:13px;padding:12px 14px;margin:0 0 9px;color:#eef1f6;cursor:pointer;font-size:.98rem;transition:border-color .2s}',
      '.md-opt:hover{border-color:rgba(120,160,255,.6)}.md-opt small{display:block;color:#9ca3af;font-size:.82rem;margin-top:3px}',
      '.md-opt.sel{border-color:#6ea8fe;background:rgba(110,168,254,.12)}',
      '.md-opt[disabled]{opacity:.42;cursor:default}',
      '.md-top{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}',
      '.md-meter{flex:1 1 118px;min-width:108px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);border-radius:11px;padding:7px 9px}',
      '.md-meter .mh{display:flex;justify-content:space-between;align-items:center;font-size:.8rem;color:#c3c9d6;font-weight:600}',
      '.md-meter .mh b{color:#fff;font-weight:800}',
      '.md-bar{height:6px;border-radius:4px;background:rgba(255,255,255,.09);overflow:hidden;margin-top:5px}',
      '.md-bar>i{display:block;height:100%;transition:width .5s}',
      '.md-turn{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#c3c9d6;font-size:.9rem;margin:0 0 10px;flex-wrap:wrap}',
      '.md-stat{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:4px 11px;font-weight:600;font-size:.85rem}',
      '.md-sit{border:1px solid rgba(110,168,254,.3);background:linear-gradient(180deg,rgba(110,168,254,.09),rgba(110,168,254,.02));border-radius:14px;padding:14px 16px;margin:0 0 13px;line-height:1.6}',
      '.md-sit .fr{display:flex;align-items:center;gap:9px;margin-bottom:9px}',
      '.md-sit .av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#00A8E8,#3A86FF);display:flex;align-items:center;justify-content:center;font-size:1.05rem;flex:0 0 auto}',
      '.md-sit .fn{font-weight:700;font-size:.9rem}.md-sit .ft{font-size:.72rem;color:#9ca3af}',
      '.md-tag{display:inline-block;font-size:.72rem;color:#9cb6e6;border:1px solid rgba(110,168,254,.4);border-radius:20px;padding:2px 9px;margin-bottom:8px}',
      '.md-fx{font-size:.78rem;color:#9ca3af;margin-top:4px}',
      '.md-fx .up{color:#6ee7a8}.md-fx .dn{color:#fca5a5}',
      '.md-chip{display:inline-block;border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:7px 13px;margin:0 7px 8px 0;font-size:.9rem;cursor:pointer;color:#e5e7eb;transition:.2s}',
      '.md-chip:hover{border-color:#6ea8fe}.md-chip.sel{border-color:#6ea8fe;background:rgba(110,168,254,.16);color:#fff;font-weight:700}',
      '.md-chip small{display:block;color:#9ca3af;font-size:.74rem;margin-top:2px;font-weight:400}',
      '.md-primary{display:block;width:100%;border:none;border-radius:13px;padding:14px;font-size:1rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#3a86ff,#5f5fff);box-shadow:0 8px 20px rgba(58,134,255,.3);margin:8px 0 10px}',
      '.md-primary[disabled]{opacity:.45;cursor:default;box-shadow:none}',
      '.md-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:12px;padding:12px;font-size:.92rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 9px}',
      '.md-res{border:1px solid rgba(56,189,248,.34);background:rgba(56,189,248,.08);border-radius:12px;padding:11px 14px;margin:0 0 12px;font-size:.93rem;line-height:1.55;color:#bae6fd}',
      '.md-big{text-align:center;font-size:1.32rem;font-weight:800;margin:2px 0 4px;color:#6ea8fe}',
      '.md-verdict{border:1px solid rgba(110,168,254,.4);background:linear-gradient(135deg,rgba(110,168,254,.12),rgba(95,95,255,.05));border-radius:13px;padding:13px 15px;margin:0 0 11px;line-height:1.6;font-size:.94rem}',
      '.md-mini{font-size:.8rem;color:#9ca3af}',
      '.md-row{display:flex;gap:9px}.md-row>*{flex:1;margin-bottom:0}',
      '.md-fld{display:flex;justify-content:space-between;font-size:.86rem;margin:5px 0;color:#c3c9d6}.md-fld b{color:#fff}',
      '[data-theme="light"] .md-wrap{color:#1f2430}',
      '[data-theme="light"] .md-lead{color:#4b5566}',
      '[data-theme="light"] .md-card,[data-theme="light"] .md-meter,[data-theme="light"] .md-sit{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .md-secondary,[data-theme="light"] .md-opt{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.md-wrap{padding:12px 9px 100px}.md-meter{flex-basis:31%;min-width:0}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function meterColor(k, v) {
    if (k === 'C') return v >= 60 ? '#6ee7a8' : v >= 40 ? '#fcd34d' : '#fca5a5';
    if (k === 'R') return '#f0c661';
    if (k === 'V') return '#c08bf0';
    if (k === 'A') return '#7fb0f0';
    return '#6ee7a8'; // P
  }
  function metersHTML() {
    return '<div class="md-top">' + METERS.map(function (mt) {
      var v = ST.m[mt.k];
      return '<div class="md-meter"><div class="mh"><span>' + mt.em + ' ' + mt.name + '</span><b>' + v + '</b></div>' +
        '<div class="md-bar"><i style="width:' + v + '%;background:' + meterColor(mt.k, v) + '"></i></div></div>';
    }).join('') + '</div>';
  }

  // ---------- главный экран ----------
  function home() {
    injectCSS(); ST = null;
    track('feature_opened', { feature: 'mandat' });
    var c = container(); if (!c) return;
    var st = loadStats();
    c.innerHTML =
      '<div class="md-wrap">' +
        '<button class="md-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="md-h1">🏛️ Мандат: цена кресла</div>' +
        '<div class="md-lead">Ты избрался депутатом. Дальше — не про законы, а про <b>выбор, кому ты сегодня служишь</b>. Фреди будет подкидывать ситуации: наказ бабушки против партийной линии, конверт за нужное голосование, застройщик со сквером, журналист, который копает.<br><br>Каждое решение двигает пять шкал: <b>👥 Люди</b>, <b>🏛 Вертикаль</b>, <b>🏢 Аппарат</b>, <b>💰 Ресурс</b> — и скрытую <b>⚖️ Совесть</b>. Влияние набрать легко. Труднее — не потерять по дороге того, кем ты шёл. В финале Фреди разберёт, каким ты стал и какой ценой.</div>' +
        (st.plays ? '<div class="md-card" style="text-align:center">Созывов сыграно: <b>' + st.plays + '</b> · переизбран: <b>' + (st.reelected || 0) + '</b> · прошёл, не запачкавшись: <b>' + (st.cleanWins || 0) + '</b></div>' : '') +
        '<button class="md-secondary" onclick="MANDAT.rules()">📖 Как это работает</button>' +
        '<button class="md-primary" onclick="MANDAT.setup()">Задать вводные и начать →</button>' +
        '<div class="md-card" style="font-size:.85rem;color:#9ca3af">💡 Это тренажёр психологии власти: как маленькие компромиссы становятся большими (эффект «скользкой дорожки»), как давление группы ломает принципы (конформизм) и как мы оправдываем сами себя (когнитивный диссонанс). Перенос в жизнь — про любую власть: в семье, в команде, над собой.</div>' +
      '</div>';
  }

  function rules() {
    injectCSS(); var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="md-wrap">' +
        '<button class="md-ghost" onclick="MANDAT.home()">← Назад</button>' +
        '<div class="md-h1" style="font-size:1.22rem">Как это работает</div>' +
        '<div class="md-card"><div class="md-ch">Вводные</div>Сначала ты задаёшь стартовые условия: <b>город</b> (масштаб денег и внимания СМИ), <b>партия</b> (защита против свободы), <b>бэкграунд</b> (стартовые силы и особый козырь) и <b>зачем ты шёл</b> (по этому в финале сверят, остался ли ты собой).</div>' +
        '<div class="md-card"><div class="md-ch">Пять шкал</div>' +
          METERS.map(function (mt) { return '<div class="md-fld"><span>' + mt.em + ' <b>' + mt.name + '</b></span><span class="md-mini">' + mt.hint + '</span></div>'; }).join('') +
          '<div class="md-mini" style="margin-top:6px">⚖️ Совесть — главная шкала: её легко разменять на всё остальное и трудно вернуть.</div></div>' +
        '<div class="md-card"><div class="md-ch">Ход</div>Каждый ход (' + MAXTURN + ' всего) Фреди даёт одну ситуацию с 2–4 вариантами. Каждый вариант что-то поднимает и что-то роняет — <b>чистых решений почти не бывает</b>. Часть вариантов требует накопленного веса (напр., «продавить компромисс» — нужен Аппарат).</div>' +
        '<div class="md-card"><div class="md-ch">Финал</div>После созыва — <b>перевыборы</b>: пройдёшь, если тебя любят люди <i>или</i> если хватает административного ресурса (вертикаль + аппарат). Дальше Фреди назовёт, каким депутатом ты стал — и в какие психологические ловушки попадал.</div>' +
        '<div class="md-card" style="color:#9ca3af;font-size:.9rem"><b>Тут нет «правильной» кнопки.</b> Можно рваться наверх, можно беречь совесть, можно набивать карман — игра просто честно покажет цену каждого пути.</div>' +
        '<button class="md-primary" onclick="MANDAT.setup()">Задать вводные →</button>' +
      '</div>';
  }

  // ---------- экран вводных ----------
  var SEL = null;
  function setup() {
    injectCSS(); SEL = { city: null, party: null, bg: null, motive: null };
    renderSetup();
  }
  function pickSel(field, id) { SEL[field] = id; renderSetup(); }
  function chipRow(field, data) {
    return Object.keys(data).map(function (k) {
      var o = data[k], on = SEL[field] === k;
      return '<span class="md-chip' + (on ? ' sel' : '') + '" onclick="MANDAT.pickSel(\'' + field + '\',\'' + k + '\')">' + o.em + ' ' + esc(o.name) + '<small>' + esc(o.desc) + '</small></span>';
    }).join('');
  }
  function renderSetup() {
    var c = container(); if (!c) return;
    var ready = SEL.city && SEL.party && SEL.bg && SEL.motive;
    c.innerHTML =
      '<div class="md-wrap">' +
        '<button class="md-ghost" onclick="MANDAT.home()">← Назад</button>' +
        '<div class="md-h1" style="font-size:1.24rem">Кто ты, депутат?</div>' +
        '<div class="md-lead">Собери своего героя. Каждый выбор реально меняет стартовые силы и то, какие ходы тебе будут доступны.</div>' +
        '<div class="md-sec">🏙 Где округ</div>' + chipRow('city', CITIES) +
        '<div class="md-sec">🎗 От кого идёшь</div>' + chipRow('party', PARTIES) +
        '<div class="md-sec">🧰 Твой бэкграунд</div>' + chipRow('bg', BGS) +
        '<div class="md-sec">🧭 Зачем ты пошёл во власть</div>' + chipRow('motive', MOTIVES) +
        '<button class="md-primary" style="margin-top:14px" ' + (ready ? '' : 'disabled') + ' onclick="MANDAT.begin()">' + (ready ? 'Начать созыв →' : 'Выбери все четыре пункта') + '</button>' +
      '</div>';
  }

  function begin() {
    if (!SEL || !SEL.city || !SEL.party || !SEL.bg || !SEL.motive) return;
    ST = buildGame(SEL);
    track('game_round_start', { feature: 'mandat', city: SEL.city, party: SEL.party, bg: SEL.bg, motive: SEL.motive });
    nextDilemma();
  }

  // ---------- выбор ситуации ----------
  function pickDilemma() {
    var pool = DILEMMAS.filter(function (d) {
      if (ST.used[d.id]) return false;
      if (d.when && !d.when(ST)) return false;
      return true;
    });
    if (!pool.length) return null;
    var prio = pool.filter(function (d) { return d.priority; });
    if (prio.length) return rpick(prio);
    return rpick(pool);
  }

  function nextDilemma() {
    if (ST.turn > MAXTURN) return election();
    var d = pickDilemma();
    if (!d) return election();
    ST.cur = d; ST.used[d.id] = true; ST.phase = 'play';
    renderPlay();
  }

  function optDisabled(o) {
    if (!o.req) return false;
    for (var k in o.req) if (ST.m[k] < o.req[k]) return true;
    return false;
  }

  function renderPlay() {
    var c = container(); if (!c) return;
    var d = ST.cur;
    var opts = d.opts.map(function (o, i) {
      var dis = optDisabled(o);
      return '<button class="md-opt" ' + (dis ? 'disabled' : 'onclick="MANDAT.choose(' + i + ')"') + '>' +
        esc(o.lbl) + '<small>' + esc(o.sub) + (dis ? ' · 🔒 ' + esc(o.reqTxt) : '') + '</small></button>';
    }).join('');
    c.innerHTML =
      '<div class="md-wrap">' +
        '<div class="md-turn">' +
          '<span class="md-stat">' + ST.city.em + ' <b>' + esc(ST.party.name) + '</b></span>' +
          '<span class="md-stat">📅 ход <b>' + ST.turn + '/' + MAXTURN + '</b></span>' +
          '<button style="background:none;border:none;color:#8b93a7;font-size:.85rem;cursor:pointer;padding:0" onclick="MANDAT.confirmQuit()">✕ Выйти</button>' +
        '</div>' +
        metersHTML() +
        '<div class="md-sit">' +
          '<div class="fr"><div class="av">🤖</div><div><div class="fn">Фреди</div><div class="ft">подкидывает ситуацию</div></div></div>' +
          '<div class="md-tag">' + d.icon + ' ' + esc(d.tag) + '</div>' +
          '<div>' + esc(d.text) + '</div>' +
        '</div>' +
        '<div class="md-sec">Твой ход</div>' +
        opts +
      '</div>';
    try { c.scrollTop = 0; } catch (e) {}
  }

  function fxHTML(fx) {
    var parts = [];
    METERS.forEach(function (mt) {
      if (fx[mt.k]) parts.push('<span class="' + (fx[mt.k] > 0 ? 'up' : 'dn') + '">' + mt.em + ' ' + (fx[mt.k] > 0 ? '+' : '') + fx[mt.k] + '</span>');
    });
    return parts.join(' &nbsp; ');
  }

  function choose(i) {
    var d = ST.cur, o = d.opts[i];
    if (optDisabled(o)) return;
    // применить дельты
    var applied = {};
    for (var k in o.fx) { var nv = clamp(ST.m[k] + o.fx[k], 0, 100); applied[k] = nv - ST.m[k]; ST.m[k] = nv; }
    if (o.t && ST.k[o.t] != null) ST.k[o.t]++;
    if (o.flag) ST.flags[o.flag] = true;
    ST.history.push({ id: d.id, t: o.t, lbl: o.lbl });
    ST.lastRes = o.res;
    ST.phase = 'result';
    vibe(o.t === 'corrupt' || o.t === 'conform' ? 20 : 10);

    // немедленный провал: вертикаль обвалилась (партия сняла)
    var removed = ST.party.id !== 'self' && ST.m.V <= 8;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="md-wrap">' +
        metersHTML() +
        '<div class="md-res">' + esc(o.res) + '</div>' +
        '<div class="md-fx" style="margin:0 0 14px">' + fxHTML(o.fx) + '</div>' +
        (removed
          ? '<div class="md-card" style="border-color:rgba(248,113,113,.4)">🏛 Куратор сухо сообщил: партия тебя больше не поддерживает. Без вертикали ты остался один — и мандат уплыл.</div><button class="md-primary" onclick="MANDAT.forceEnd(\'removed\')">Чем всё кончилось →</button>'
          : '<button class="md-primary" onclick="MANDAT.advance()">Дальше →</button>') +
      '</div>';
    track('game_choice', { feature: 'mandat', dilemma: d.id, choice: o.t });
    try { c.scrollTop = 0; } catch (e) {}
  }

  function advance() { ST.turn++; nextDilemma(); }
  function forceEnd(reason) { ST.endReason = reason; election(true); }

  // ---------- перевыборы + финал ----------
  function election(forced) {
    if (ST.over) return; ST.over = true; ST.phase = 'end';
    var m = ST.m;
    var removed = ST.endReason === 'removed';
    // переизбрание: любят люди ЛИБО хватает админресурса
    var reelected = !removed && (m.P >= 45 || (m.V >= 58 && m.A >= 58));
    ST.reelected = reelected; ST.removed = removed;
    renderEnd(reelected, removed);
  }

  function endingArchetype(m, reelected, removed) {
    if (removed) return { key: 'removed', em: '🚪', title: 'Система тебя выдавила', line: 'Ты вышел из строя — и строй тебя выплюнул. Мандата больше нет.' };
    if (!reelected) {
      if (m.C >= 60) return { key: 'idealist', em: '🕯️', title: 'Честный, но не переизбран', line: 'Руки чистые, совесть спокойна — но кресло ты потерял. Иногда цена принципов — сама возможность что-то менять.' };
      return { key: 'lost', em: '📉', title: 'Проигравший', line: 'Ты и людей не удержал, и наверх не встроился. Между всеми стульями оказался пол.' };
    }
    if (m.C >= 62 && m.P >= 60) return { key: 'tribun', em: '🔥', title: 'Народный трибун', line: 'Ты остался собой и заслужил настоящую любовь людей — не купленную, а живую. Редкий и дорогой путь.' };
    if (m.C < 38 && m.R >= 60) return { key: 'delec', em: '🪙', title: 'Делец при мандате', line: 'Карман потяжелел, кресло удержал. Только должность стала бизнесом, а совесть — списанным активом.' };
    if (m.V >= 60 && m.A >= 58 && m.C < 55) return { key: 'system', em: '⚙️', title: 'Встроился в систему', line: 'Ты научился играть по правилам и выиграл место в машине. Кнопки в лифте наверх теперь нажимаешь не ты.' };
    if (m.A >= 58 && m.P >= 50 && m.C >= 45) return { key: 'tech', em: '🛠️', title: 'Эффективный технократ', line: 'Ты умел договариваться и реально решал вопросы через систему, не сгорев и не продавшись целиком. Крепкий баланс.' };
    return { key: 'survivor', em: '🎭', title: 'Уцелевший прагматик', line: 'Ты лавировал и удержался. Где-то прогнулся, где-то настоял — обычная человеческая история во власти.' };
  }

  function trueToSelf(m) {
    var mo = ST.motive.id;
    if (mo === 'help') return { ok: m.C >= 55 && m.P >= 55, txt: 'ты шёл помогать людям' };
    if (mo === 'power') return { ok: (m.V >= 55 && m.A >= 55) || ST.flags.promo || ST.flags.promoself, txt: 'ты шёл за властью и карьерой' };
    return { ok: m.R >= 60, txt: 'ты шёл решать свои дела' };
  }

  async function renderEnd(reelected, removed) {
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="md-wrap"><div class="md-h1" style="font-size:1.16rem">🏛️ Конец созыва</div><div class="md-card">Фреди разбирает, каким депутатом ты стал…</div></div>';

    var m = ST.m, arch = endingArchetype(m, reelected, removed), tts = trueToSelf(m);
    var st = loadStats(); st.plays = (st.plays || 0) + 1; if (reelected) st.reelected = (st.reelected || 0) + 1;
    var clean = reelected && m.C >= 60 && !ST.flags.bribe && !ST.flags.scheme && !ST.flags.betray;
    if (clean) st.cleanWins = (st.cleanWins || 0) + 1;
    saveStats(st);

    var k = ST.k;
    var drift = 70 - m.C; // насколько просела совесть от старта
    var traps = [];
    if (k.conform >= 2) traps.push('конформизм (' + k.conform + '× пошёл против своих ради строя)');
    if (k.corrupt >= 2) traps.push('«скользкая дорожка» (' + k.corrupt + '× разменял совесть на ресурс)');
    if (k.escape >= 2) traps.push('уход от выбора (' + k.escape + '× спрятался в нейтралитет)');
    if (ST.flags.bribe && ST.flags.coverup) traps.push('одна ложь потянула следующую (взял — и прикрывал)');

    var localText = arch.title + '. ' +
      (drift >= 25 ? 'За созыв твоя совесть просела с 70 до ' + m.C + ' — и это не «жизнь такая», а сумма конкретных «мелочей». '
        : drift <= 5 ? 'Ты почти не растерял себя (совесть ' + m.C + '/100) — держать линию под таким давлением дорогого стоит. '
        : 'Совесть просела умеренно (до ' + m.C + '/100) — где-то ты прогибался, но не сломался. ') +
      (traps.length ? 'Ловушки, в которые ты попадал: ' + traps.join('; ') + '. ' : 'Крупных ловушек власти ты избежал — ни продажности, ни стадного «как все». ') +
      (tts.ok ? 'И главное — ' + tts.txt + ', и по итогу ты этому остался верен.' : 'А вот с тем, зачем ты шёл: ' + tts.txt + ' — но по дороге эта цель как-то потерялась.');

    var verdict = '', ai = false;
    try {
      var resp = await aiGenerate(
        'Ты — Фреди, тёплый, остроумный и точный психолог. Человек сыграл в игру-симулятор «Мандат»: он депутат, и на каждом ходу выбирал в дилеммах между доверием людей, лояльностью партии (вертикали), весом в мэрии (аппарат), ресурсом (деньги) и совестью (цельность). Игра — про психологию власти и компромисса.\n' +
        'Вводные героя: округ — ' + ST.city.name + ', партия — ' + ST.party.name + ', бэкграунд — ' + ST.bg.name + ', шёл во власть чтобы: ' + ST.motive.name + '.\n' +
        'Итог: ' + (removed ? 'партия сняла его' : reelected ? 'переизбран' : 'не переизбран') + '. Архетип финала: ' + arch.title + '. Шкалы (0-100): Люди ' + m.P + ', Вертикаль ' + m.V + ', Аппарат ' + m.A + ', Ресурс ' + m.R + ', Совесть ' + m.C + ' (стартовала с 70). Выборы по тегам: прогнулся под вертикаль ' + k.conform + '×, разменял совесть на ресурс/выгоду ' + k.corrupt + '×, встал на своё ' + k.principled + '×, компромисс ' + k.pragma + '×, ушёл от выбора ' + k.escape + '×. Брал взятку: ' + (ST.flags.bribe ? 'да' : 'нет') + '. Верность мотиву, с которым шёл: ' + (tts.ok ? 'сохранил' : 'потерял по дороге') + '.\n\n' +
        'Дай короткий разбор по-русски, на «ты», без морализаторства и без политики (это метафора про любую власть — в семье, команде, над собой), 4–6 фраз: 1) назови, каким он стал (' + arch.title + '), и что это за тип человека у власти; 2) как менялась его совесть и через какие конкретные механизмы (назови по именам подходящие: конформизм / эффект скользкой дорожки — когда мелкие уступки складываются в большую / когнитивный диссонанс и рационализация «я же для людей» / моральное лицензирование); 3) остался ли он верен тому, зачем шёл; 4) один тёплый практичный вывод про власть и компромиссы в обычной жизни. Живо, с лёгкой иронией, но по-доброму.',
        { max_tokens: 520 });
      var t = (resp && resp.success && resp.content) ? String(resp.content).trim() : '';
      if (t) { verdict = t; ai = true; }
    } catch (e) {}
    if (!verdict) verdict = localText;

    var relatedHTML =
      '<div class="md-card" style="font-size:.87rem;color:#9ca3af">💡 <b>Перенос в жизнь.</b> Власть есть у каждого — над детьми, командой, деньгами, собой. И ломает всех одинаково: не одним большим предательством, а цепочкой «мелочей», каждую из которых легко оправдать. Почитать по теме: ' +
        '<a href="/blog/lekciya-socps-9-agressiya-i-konflikt.html" style="color:#8fb4ff">конформизм и давление группы</a>, ' +
        '<a href="/blog/lekciya-etika-7-sovest-vina-styd.html" style="color:#8fb4ff">совесть, вина и стыд</a>, ' +
        '<a href="/blog/styd-vs-vina-raznica-kotoraya-kalechit.html" style="color:#8fb4ff">почему стыд калечит, а вина — нет</a>.</div>';

    var html = '<div class="md-wrap">' +
      '<div class="md-big">' + arch.em + ' ' + esc(arch.title) + '</div>' +
      '<div class="md-card" style="text-align:center">' + (removed ? 'Мандат потерян' : reelected ? '✅ Переизбран на новый срок' : '❌ Не переизбран') +
        (clean ? ' · <span style="color:#6ee7a8">прошёл, не запачкавшись</span>' : '') + '</div>' +
      '<div class="md-card" style="font-size:.9rem">' + esc(arch.line) + '</div>' +
      metersHTML() +
      '<div class="md-verdict">💬 ' + esc(verdict).replace(/\n/g, '<br>') + '</div>' +
      relatedHTML +
      '<div class="md-row"><button class="md-primary" style="margin:0" onclick="MANDAT.setup()">🔁 Новый созыв</button><button class="md-secondary" onclick="MANDAT.home()">В меню</button></div>' +
      '</div>';
    c.innerHTML = html; try { c.scrollTop = 0; } catch (e) {}
    vibe(reelected ? [40, 40, 40] : 20);
    track('game_round_finish', { feature: 'mandat', reelected: reelected, removed: removed, arch: arch.key, conscience: m.C });
  }

  function confirmQuit() {
    var c = container(); if (!c) return;
    var box = document.createElement('div');
    if (confirm('Выйти из созыва? Прогресс не сохранится.')) home();
  }

  window.MANDAT = {
    home: home, rules: rules, setup: setup, pickSel: pickSel, begin: begin,
    choose: choose, advance: advance, forceEnd: forceEnd, confirmQuit: confirmQuit,
    getState: function () { return ST; }
  };
  window.showMandatGame = home;
  console.log('✅ mandat.js loaded (игра «Мандат: цена кресла»)');
})();
