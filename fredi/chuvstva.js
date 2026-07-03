// ============================================
// chuvstva.js — Игра «Чувства». Эмоциональная грануляция:
// учимся называть эмоции точно. Точно названное чувство теряет
// в интенсивности (affect labeling) — это базовый навык всей терапии.
// Ядро — локальный банк ситуаций (множественный выбор),
// плюс опциональный разбор от Фреди (AI).
// Экспорт: window.showChuvstvaGame, window.CHUVSTVA
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 280, temperature: opts.temperature == null ? 0.6 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ============================================================
  // БАНК. Каждый пункт: sit — ситуация, body — телесные сигналы,
  // key — точное чувство, near — близкие-но-неточные (идут в варианты),
  // sig — о чём сигналит чувство, diff — чем отличается от соседей.
  // lvl: 1 базовые · 2 оттенки · 3 пары-ловушки
  // ============================================================
  var BANK = [
    // ---------- УРОВЕНЬ 1: базовые ----------
    { lvl: 1, key: 'Злость', near: ['Грусть', 'Страх', 'Отвращение'],
      sit: 'Коллега при начальнике выдал твою идею за свою. Внутри всё сжалось, челюсть напряглась, хочется сказать резкое.',
      body: 'жар, сжатые челюсти, напряжение в руках',
      sig: 'Злость сигналит: нарушена граница или отобрано твоё. Это энергия для защиты своего.',
      diff: 'В отличие от страха, злость толкает вперёд, а не назад.' },
    { lvl: 1, key: 'Страх', near: ['Злость', 'Грусть', 'Удивление'],
      sit: 'Завтра разговор с руководителем «о твоём будущем в компании». Ночью крутишься, в животе холодно, сценарии один мрачнее другого.',
      body: 'холод в животе, частый пульс, хочется избежать',
      sig: 'Страх сигналит: впереди возможная угроза, подготовься или уклонись.',
      diff: 'В отличие от злости, страх готовит к бегству/замиранию, а не к атаке.' },
    { lvl: 1, key: 'Грусть', near: ['Злость', 'Скука', 'Страх'],
      sit: 'Друг переехал в другую страну. Всё в порядке, вы на связи — но вечером, глядя на его пустое место за столом, тянет в груди и хочется тишины.',
      body: 'тяжесть в груди, слёзы близко, мало энергии',
      sig: 'Грусть сигналит о потере ценного. Она замедляет, чтобы потерю прожить и переварить.',
      diff: 'Грусть — про «было и нет». Это не слабость, а работа психики по прощанию.' },
    { lvl: 1, key: 'Радость', near: ['Удивление', 'Гордость', 'Облегчение'],
      sit: 'Вы с друзьями всю ночь проговорили у костра, и утром, глядя на рассвет, ловишь: вот оно. Тепло в груди, хочется, чтобы не кончалось.',
      body: 'тепло в груди, лёгкость, улыбка сама собой',
      sig: 'Радость сигналит: это ценно, здесь твоё. Запоминай, из чего она сделана, — это карта твоих потребностей.',
      diff: 'Радость — про «сейчас хорошо», в отличие от облегчения — «плохое закончилось».' },
    { lvl: 1, key: 'Отвращение', near: ['Злость', 'Страх', 'Презрение'],
      sit: 'Знакомый рассказывает, как ловко обманул наивного покупателя, и ждёт, что ты оценишь. Внутри — брезгливое «фу», хочется отодвинуться.',
      body: 'лёгкая тошнота, желание отстраниться, сморщенный нос',
      sig: 'Отвращение сигналит: это несъедобно — для тела или для твоих ценностей. Полезный моральный компас.',
      diff: 'В отличие от злости, отвращение не атакует, а отталкивает и увеличивает дистанцию.' },
    { lvl: 1, key: 'Удивление', near: ['Радость', 'Страх', 'Растерянность'],
      sit: 'Открываешь дверь — а там друзья с тортом, о дне рождения ты и сам почти забыл. Секунду стоишь с открытым ртом, мысли обнулились.',
      body: 'брови вверх, вдох, секунда пустоты в голове',
      sig: 'Удивление — перезагрузка: реальность не совпала с прогнозом, психика обновляет картину.',
      diff: 'Удивление само по себе нейтрально — через секунду превращается в радость или страх.' },
    { lvl: 1, key: 'Стыд', near: ['Вина', 'Страх', 'Грусть'],
      sit: 'На общем созвоне ты перепутал имя клиента, все заулыбались. Щёки горят, хочется выключить камеру и исчезнуть.',
      body: 'жар в лице, желание спрятаться, взгляд в пол',
      sig: 'Стыд — сигнал «я плохой в чужих глазах». Он про образ себя, и его лечит принятие, а не наказание.',
      diff: 'Стыд — «я плохой», вина — «я сделал плохо». Разница огромная: вину можно исправить действием.' },
    { lvl: 1, key: 'Вина', near: ['Стыд', 'Грусть', 'Страх'],
      sit: 'Ты обещал ребёнку прийти на выступление и не успел из-за работы. Он сказал «ничего страшного», а у тебя внутри свербит и хочется загладить.',
      body: 'тяжесть, свербящее «надо исправить», прокрутка сцены',
      sig: 'Вина сигналит: мой поступок разошёлся с моими ценностями. Её лечит не самоедство, а исправление и вывод.',
      diff: 'Вина — про поступок (можно починить), стыд — про себя целиком (чинится принятием).' },

    // ---------- УРОВЕНЬ 2: оттенки ----------
    { lvl: 2, key: 'Обида', near: ['Злость', 'Грусть', 'Разочарование'],
      sit: 'Лучшая подруга собрала компанию на выходные и не позвала тебя. «Думала, тебе некогда». Внутри смесь: и больно, и злишься, и ждёшь, что она догадается извиниться.',
      body: 'ком в горле, желание отвернуться и чтобы заметили',
      sig: 'Обида = боль + невысказанное ожидание «ты должен был иначе». Лечится проговариванием ожидания.',
      diff: 'В чистой злости хочется атаковать, в обиде — отвернуться и ждать, что догадаются.' },
    { lvl: 2, key: 'Разочарование', near: ['Обида', 'Грусть', 'Злость'],
      sit: 'Долгожданный курс, на который ты копил, оказался водой из бесплатных вебинаров. Претензий к себе нет, скандалить не хочется — просто «сдулось».',
      body: 'выдох, опущенные плечи, «ну вот…»',
      sig: 'Разочарование — смерть ожидания: картинка в голове не совпала с реальностью. Полезно пересмотреть прогнозы.',
      diff: 'В отличие от обиды, тут нет «виноватого, который должен был» — есть несбывшаяся картинка.' },
    { lvl: 2, key: 'Тревога', near: ['Страх', 'Раздражение', 'Растерянность'],
      sit: 'Вроде всё нормально, но весь день фоном крутит: «что-то я упускаю». Проверяешь почту, мессенджеры, список дел — беспокойство не уходит.',
      body: 'фоновое напряжение, суетливость, невозможность расслабиться',
      sig: 'Тревога — страх без адреса: угроза неясна, поэтому напряжение не разряжается. Лечится конкретизацией: «чего именно я боюсь?»',
      diff: 'Страх — про конкретное «вот оно», тревога — размытое «а вдруг» без объекта.' },
    { lvl: 2, key: 'Зависть', near: ['Злость', 'Восхищение', 'Обида'],
      sit: 'Одногруппник выложил фото из нового дома. Ты рад бы порадоваться, но внутри укол: «а я всё там же». Настроение испортилось на ровном месте.',
      body: 'укол в груди, кислое лицо, желание обесценить',
      sig: 'Зависть — стрелка компаса: она точно показывает, чего ты хочешь сам. Информация, а не грех.',
      diff: 'Ревность — страх потерять своё; зависть — желание чужого. Их вечно путают.' },
    { lvl: 2, key: 'Ревность', near: ['Зависть', 'Злость', 'Страх'],
      sit: 'Партнёр весь вечер оживлённо переписывается и улыбается в телефон. Внутри сжалось: «с кем это он такой весёлый?» — и уже хочется проверить.',
      body: 'сжатие в груди, навязчивое желание проверять',
      sig: 'Ревность = страх потерять значимого + ощущение угрозы связи. Говорит о ценности связи и о своей неуверенности.',
      diff: 'Зависть хочет чужое, ревность боится потерять своё. Разные чувства — разная работа.' },
    { lvl: 2, key: 'Раздражение', near: ['Злость', 'Усталость', 'Отвращение'],
      sit: 'Сосед по опенспейсу третий час щёлкает ручкой. Ты ловишь себя на том, что уже не можешь читать текст — только слышишь «щёлк-щёлк».',
      body: 'зудящее напряжение, дёрганость, всё «не так»',
      sig: 'Раздражение — злость малой мощности, часто маркер перегруза: батарейка села, и любой стимул царапает.',
      diff: 'Если раздражает всё подряд — это чаще про твой ресурс, чем про ручку соседа.' },
    { lvl: 2, key: 'Беспомощность', near: ['Грусть', 'Злость', 'Отчаяние'],
      sit: 'Близкий человек болеет, ты сделал всё, что мог, — врачи, лекарства, уход. Сидишь в коридоре и понимаешь: больше от тебя не зависит ничего.',
      body: 'опустившиеся руки, пустота, «ничего не могу»',
      sig: 'Беспомощность — честный сигнал границы твоего контроля. Дальше работает не действие, а присутствие и принятие.',
      diff: 'Это не лень и не слабость — это встреча с пределом. Опасна, когда разливается на всю жизнь («от меня вообще ничего не зависит»).' },
    { lvl: 2, key: 'Одиночество', near: ['Грусть', 'Скука', 'Обида'],
      sit: 'Вечеринка, вокруг смех, ты всех знаешь. И посреди шума ловишь острое: «меня здесь по-настоящему никто не видит».',
      body: 'пустота в груди среди людей, стеклянная стенка',
      sig: 'Одиночество — голод по контакту-с-глубиной, а не по людям вокруг. Сигналит: нужен настоящий разговор, а не компания.',
      diff: 'Скука просит стимулов, одиночество — близости. Толпа лечит скуку и обостряет одиночество.' },
    { lvl: 2, key: 'Скука', near: ['Грусть', 'Одиночество', 'Усталость'],
      sit: 'Третий час листаешь ленту, переключаешь сериалы, открываешь холодильник. Всё «не то», хотя дел и развлечений вокруг полно.',
      body: 'вялое беспокойство, листание, «чем бы заняться»',
      sig: 'Скука — сигнал «нет смысла/вызова в текущем занятии». Часто под ней прячется избегание важного дела.',
      diff: 'Усталость просит отдыха, скука — смысла. Отдых от скуки не лечит.' },
    { lvl: 2, key: 'Гордость', near: ['Радость', 'Облегчение', 'Превосходство'],
      sit: 'Ты полгода готовился и сдал сложный экзамен. Смотришь на результат, выпрямляется спина: «я это сделал».',
      body: 'расправленные плечи, тепло, хочется поделиться',
      sig: 'Гордость — награда за преодоление, топливо самооценки. Её важно присваивать, а не обесценивать «повезло».',
      diff: 'Здоровая гордость — «я справился», превосходство — «я лучше них». Первая наполняет, второе изолирует.' },
    { lvl: 2, key: 'Облегчение', near: ['Радость', 'Усталость', 'Гордость'],
      sit: 'Врач посмотрел анализы и сказал: «Всё в порядке, это не то, чего вы боялись». Выходишь из кабинета — и ноги вдруг ватные, хочется сесть.',
      body: 'выдох всем телом, ватные ноги, расслабление',
      sig: 'Облегчение — окончание угрозы: тело сбрасывает мобилизацию. Дай ему пару минут — это нормальный откат.',
      diff: 'Радость — «хорошее пришло», облегчение — «плохое не случилось». Ощущаются похоже, устроены по-разному.' },
    { lvl: 2, key: 'Растерянность', near: ['Страх', 'Удивление', 'Беспомощность'],
      sit: 'На встрече тебе задали вопрос по теме, которую ты не готовил. Мыслей ноль, в голове белый шум, куда смотреть — непонятно.',
      body: 'ступор, белый шум в голове, пауза',
      sig: 'Растерянность — временная потеря карты: старый план не подходит, новый не собрался. Просит паузы, а не паники.',
      diff: 'Это не глупость и не страх — это перезагрузка. Фраза «дайте секунду подумать» — её законное лекарство.' },
    { lvl: 2, key: 'Нежность', near: ['Радость', 'Жалость', 'Благодарность'],
      sit: 'Ребёнок уснул на середине сказки, посапывая тебе в плечо. Внутри тихо тает, хочется сидеть не шевелясь, чтобы не спугнуть.',
      body: 'мягкое тепло, желание беречь, тихая улыбка',
      sig: 'Нежность — сигнал глубокой привязанности и желания заботиться. Признак живой близости.',
      diff: 'Жалость смотрит сверху вниз («бедный»), нежность — на равных («дорогой»).' },
    { lvl: 2, key: 'Благодарность', near: ['Радость', 'Вина', 'Нежность'],
      sit: 'В тяжёлый месяц друг молча приехал, привёз еды и посидел рядом. Вспоминая это, чувствуешь тепло и желание однажды быть рядом так же.',
      body: 'тепло в груди, лёгкий ком, желание вернуть добро',
      sig: 'Благодарность соединяет: «мне дали, и я это вижу». Одно из самых восстанавливающих чувств — её полезно проговаривать адресату.',
      diff: 'Если вместо тепла — тяжесть «теперь я должен», это не благодарность, а долг. Различай.' },

    // ---------- УРОВЕНЬ 3: пары-ловушки ----------
    { lvl: 3, key: 'Вина', near: ['Стыд'],
      sit: 'Ты резко ответил маме по телефону и положил трубку. Через час внутри свербит, прокручиваешь разговор и уже набираешь её номер — извиниться.',
      body: 'свербит «исправь», импульс к действию',
      sig: 'Хочется исправить поступок — это вина, и она конструктивна: извинение её закрывает.',
      diff: 'Ловушка: стыд на этом месте шептал бы «ты ужасный сын» и требовал спрятаться, а не звонить.' },
    { lvl: 3, key: 'Стыд', near: ['Вина'],
      sit: 'Тренер при всей группе прокомментировал твою технику. Ошибку ты уже понял, но всё равно до конца тренировки прячешь глаза и хочешь стать невидимым.',
      body: 'жар, спрятаться, стать меньше',
      sig: 'Желание исчезнуть, а не исправить — маркер стыда: задет образ себя, а не поступок.',
      diff: 'Вина сказала бы «поправь технику», стыд говорит «ты позорище». Второе лечится принятием и опытом «меня видели — и приняли».' },
    { lvl: 3, key: 'Зависть', near: ['Ревность'],
      sit: 'Коллегу повысили на позицию, о которой ты молчал, но мечтал. Он ничего у тебя не отнимал — а внутри горько и хочется найти в его успехе подвох.',
      body: 'горечь, желание обесценить чужое',
      sig: 'Объект — чужое достижение, которого у тебя нет. Это зависть, и она показывает твою настоящую цель.',
      diff: 'Ревности здесь неоткуда взяться: никто не угрожает твоим связям. Хочется чужого — значит, зависть.' },
    { lvl: 3, key: 'Ревность', near: ['Зависть'],
      sit: 'Твой близкий друг всё чаще проводит время с новым приятелем — шутки, поездки, общие планы. Внутри противно ноет: «меня заменяют».',
      body: 'ноющее «меня вытесняют», желание вернуть внимание',
      sig: 'Под угрозой твоя связь с человеком — это ревность. Она бывает не только в паре, но и в дружбе.',
      diff: 'Ты не хочешь чужого — ты боишься потерять своё. Этим ревность и отличается от зависти.' },
    { lvl: 3, key: 'Тревога', near: ['Страх'],
      sit: 'Воскресный вечер. Конкретных проблем нет, но при мысли о понедельнике внутри муторно: не «боюсь того-то», а общее «что-то будет не так».',
      body: 'муторный фон без адреса, невозможность ткнуть пальцем',
      sig: 'Угроза без адреса и образа — тревога. Первый шаг работы: письменно конкретизировать «что именно может случиться?»',
      diff: 'Был бы страх — ты бы назвал, чего боишься. Не можешь назвать — значит, тревога.' },
    { lvl: 3, key: 'Страх', near: ['Тревога'],
      sit: 'Стоматолог сказал: «Зуб придётся удалять, приходите в пятницу». До пятницы ты спокоен в целом, но при мысли о кресле — чёткий холодок.',
      body: 'холодок при конкретной картинке',
      sig: 'Есть конкретный объект и картинка — это страх. С конкретным можно работать: узнать про анестезию, договориться о сигнале «стоп».',
      diff: 'Тревога размыта; тут адрес известен — пятница, кресло. Конкретность — уже половина управления.' },
    { lvl: 3, key: 'Обида', near: ['Злость'],
      sit: 'Партнёр забыл о вашей годовщине. Ты не устраиваешь сцену — молчишь, отвечаешь односложно и ждёшь, когда он сам поймёт, что натворил.',
      body: 'молчание, дистанция, ожидание, что догадается',
      sig: 'Молчаливое ожидание, что «сам поймёт», — фирменный знак обиды. Лечится озвучиванием ожидания вслух.',
      diff: 'Чистая злость сказала бы прямо: «мне обидно, что ты забыл». Обида вместо этого играет в молчанку.' },
    { lvl: 3, key: 'Злость', near: ['Обида'],
      sit: 'В очереди человек нагло проходит вперёд со словами «мне только спросить». Внутри вспыхивает, и ты говоришь: «Стоп, очередь общая».',
      body: 'вспышка, энергия сказать здесь и сейчас',
      sig: 'Мгновенная энергия защитить границу прямо сейчас — это злость, и здесь она работает по назначению.',
      diff: 'Обида копила бы молча и ждала извинений. Злость действует адресно и сразу — и правильно делает.' },
    { lvl: 3, key: 'Грусть', near: ['Тоска'],
      sit: 'Разбирая шкаф, нашёл рисунок, который дочь-первоклашка рисовала тебе на работу. Ей уже шестнадцать. Улыбаешься — и щиплет глаза.',
      body: 'светлое щемление, слёзы вперемешку с теплом',
      sig: 'Это грусть о конкретном ушедшем времени — с теплом внутри. Ей можно дать место: посидеть с рисунком, рассказать дочери.',
      diff: 'Тоска — тяжёлое тянущее «не хватает» без ясного адреса; здесь адрес есть и есть свет.' },
    { lvl: 3, key: 'Тоска', near: ['Грусть'],
      sit: 'Всё в жизни на месте, но неделями тянет глухое «чего-то не хватает» — не человека, не вещи, непонятно чего. Как будто жизнь идёт за стеклом.',
      body: 'тянущая пустота без адреса, «за стеклом»',
      sig: 'Тоска — голод по смыслу или живости, у которого потерян адрес. Просит не утешения, а поиска: чего именно не хватает?',
      diff: 'Грусть знает, о чём она. Тоска — нет; это её главный признак и главная подсказка.' }
  ];

  var DIFF = {
    easy: { name: 'Основа', em: '🌱', lvl: 1, count: 6, opts: 3, hint: '6 базовых + стыд/вина' },
    norm: { name: 'Оттенки', em: '🎨', lvl: 2, count: 8, opts: 4, hint: 'обида, зависть, тоска…' },
    hard: { name: 'Пары-ловушки', em: '🔬', lvl: 3, count: 8, opts: 2, hint: 'стыд/вина, страх/тревога' }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];
  var ALL_KEYS = (function () { var s = {}; BANK.forEach(function (b) { s[b.key] = 1; }); return Object.keys(s); })();

  var ST = { diff: 'easy', qs: [], idx: 0, picked: null, correct: 0, log: [], aiBusy: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('chuvstva_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, best: {}, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('chuvstva_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('chuvstva_diff'); if (DIFF[d]) return d; } catch (e) {} return 'easy'; }
  function saveDiff(d) { try { localStorage.setItem('chuvstva_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(diff, score) { var s = loadStats(); s.plays = (s.plays || 0) + 1; if (!s.best) s.best = {}; if (!s.best[diff] || score > s.best[diff]) s.best[diff] = score; s.last = (s.last || []).concat(score).slice(-10); saveStats(s); return s; }

  function injectCSS() {
    if (document.getElementById('chvCSS')) return;
    var s = document.createElement('style'); s.id = 'chvCSS';
    s.textContent = [
      '.chv-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.chv-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.chv-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.chv-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.chv-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.chv-ch{font-weight:700;margin-bottom:8px}',
      '.chv-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.chv-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.chv-stat b{display:block;font-size:1.35rem;font-weight:800;color:#34d399}',
      '.chv-stat span{font-size:.72rem;color:#9ca3af}',
      '.chv-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.chv-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.82rem;font-weight:600;color:#c8ccd4}',
      '.chv-chip.on{border-color:#34d399;background:rgba(52,211,153,.14);color:#fff}',
      '.chv-chip small{display:block;font-weight:400;font-size:.68rem;color:#8b93a7;margin-top:2px}',
      '.chv-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.chv-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 16px}',
      '.chv-bar i{display:block;height:100%;background:linear-gradient(90deg,#34d399,#38bdf8);transition:width .2s linear}',
      '.chv-sit{border:1px solid rgba(52,211,153,.35);background:rgba(52,211,153,.07);border-radius:14px;padding:18px;margin:0 0 10px;font-size:1.05rem;line-height:1.6}',
      '.chv-body{font-size:.88rem;color:#93c5fd;margin:0 0 14px}',
      '.chv-q{font-weight:700;margin:0 0 10px}',
      '.chv-opt{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:14px 16px;margin:0 0 9px;font-size:1rem;color:#f2f3f5;cursor:pointer}',
      '.chv-opt:hover{border-color:rgba(52,211,153,.5)}',
      '.chv-opt.ok{border-color:#10b981;background:rgba(16,185,129,.14)}',
      '.chv-opt.no{border-color:#ef4444;background:rgba(239,68,68,.12)}',
      '.chv-opt[disabled]{cursor:default}',
      '.chv-reveal{border:1px solid rgba(56,189,248,.4);background:linear-gradient(135deg,rgba(56,189,248,.1),rgba(52,211,153,.05));border-radius:14px;padding:14px 16px;margin:0 0 14px;line-height:1.6;font-size:.95rem}',
      '.chv-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#04281c;cursor:pointer;background:linear-gradient(135deg,#34d399,#38bdf8);box-shadow:0 8px 22px rgba(52,211,153,.3);margin:0 0 10px}',
      '.chv-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.chv-row{display:flex;gap:10px}.chv-row>*{flex:1;margin-bottom:0}',
      '.chv-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#34d399}',
      '.chv-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .chv-wrap{color:#1f2430}',
      '[data-theme="light"] .chv-lead{color:#4b5566}',
      '[data-theme="light"] .chv-card,[data-theme="light"] .chv-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .chv-secondary,[data-theme="light"] .chv-chip,[data-theme="light"] .chv-opt{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.chv-wrap{padding:14px 12px 96px}.chv-sit{font-size:.98rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); ST.diff = loadDiff();
    track('feature_opened', { feature: 'chuvstva' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      statsHtml = '<div class="chv-stats"><div class="chv-stat"><b>' + s.plays + '</b><span>раундов</span></div><div class="chv-stat"><b>' + (s.best && s.best[ST.diff] || '—') + '</b><span>рекорд уровня</span></div><div class="chv-stat"><b>' + ALL_KEYS.length + '</b><span>чувств в игре</span></div></div>';
    }
    c.innerHTML =
      '<div class="chv-wrap">' +
        '<button class="chv-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="chv-h1">💠 Чувства</div>' +
        '<div class="chv-lead">Тренажёр точного называния эмоций. Ситуация + сигналы тела — а ты определяешь, что это за чувство на самом деле. Наука проста: точно названная эмоция теряет силу и превращается в информацию. «Злость» и «обида» требуют разных действий — поэтому важно не путать.</div>' +
        statsHtml +
        '<div class="chv-diff">' + DIFF_ORDER.map(function (d) { return '<div class="chv-chip' + (ST.diff === d ? ' on' : '') + '" onclick="CHUVSTVA.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '<small>' + esc(DIFF[d].hint) + '</small></div>'; }).join('') + '</div>' +
        '<div class="chv-card"><div class="chv-ch">Зачем это</div>' +
          '<div style="color:#c8ccd4;font-size:.95rem">Люди с богатым словарём эмоций легче переносят стресс и реже действуют импульсивно — это называется эмоциональной грануляцией. Каждый разбор здесь — не только «угадал/нет», но и подсказка: о чём сигналит чувство и что с ним делать.</div></div>' +
        '<button class="chv-primary" onclick="CHUVSTVA.start()">▶ Начать (' + DIFF[ST.diff].count + ' ситуаций)</button>' +
        (s.plays ? '' : '<div class="chv-flag">💡 Отвечай не «как правильно», а честно примеряя ситуацию на себя — тело подскажет.</div>') +
      '</div>';
  }
  function setDiff(d) { if (!DIFF[d]) return; saveDiff(d); vibe(20); home(); }

  function start() {
    injectCSS();
    var cfg = DIFF[ST.diff];
    var pool = shuffle(BANK.filter(function (b) { return b.lvl === cfg.lvl; }));
    var n = Math.min(cfg.count, pool.length);
    ST.qs = [];
    for (var i = 0; i < n; i++) {
      var b = pool[i];
      var near = b.near.slice(0, cfg.opts - 1);
      // добор дистракторов из общего словаря, если near меньше нужного
      if (near.length < cfg.opts - 1) {
        var extra = shuffle(ALL_KEYS.filter(function (k) { return k !== b.key && near.indexOf(k) === -1; }));
        near = near.concat(extra.slice(0, cfg.opts - 1 - near.length));
      }
      ST.qs.push({ q: b, options: shuffle([b.key].concat(near)) });
    }
    ST.idx = 0; ST.picked = null; ST.correct = 0; ST.log = [];
    track('game_round_start', { feature: 'chuvstva', diff: ST.diff });
    renderQ();
  }

  function renderQ() {
    var c = container(); if (!c) return;
    var item = ST.qs[ST.idx], q = item.q, total = ST.qs.length, answered = ST.picked !== null;
    var optsHtml = item.options.map(function (o) {
      var cls = 'chv-opt';
      if (answered) { if (o === q.key) cls += ' ok'; else if (o === ST.picked) cls += ' no'; }
      return '<button class="' + cls + '"' + (answered ? ' disabled' : '') + ' onclick="CHUVSTVA.pick(\'' + o.replace(/'/g, "\\'") + '\')">' + esc(o) + '</button>';
    }).join('');
    var reveal = '';
    if (answered) {
      var ok = ST.picked === q.key;
      reveal =
        '<div class="chv-reveal"><b>' + (ok ? '✅ Точно: ' + esc(q.key) + '. ' : '❌ Точнее — «' + esc(q.key) + '». ') + '</b>' + esc(q.sig) +
          '<br><span style="color:#93c5fd">🔎 ' + esc(q.diff) + '</span>' +
          '<div id="chvAI" style="margin-top:8px"></div>' +
          '<button class="chv-secondary" style="margin-top:10px" onclick="CHUVSTVA.explainAI()" id="chvAIbtn">🎓 Спросить Фреди: что делать с этим чувством</button>' +
        '</div>' +
        '<button class="chv-primary" onclick="CHUVSTVA.next()">' + (ST.idx === total - 1 ? 'Итог →' : 'Дальше →') + '</button>';
    }
    c.innerHTML =
      '<div class="chv-wrap">' +
        '<div class="chv-top"><span>Ситуация ' + (ST.idx + 1) + ' из ' + total + '</span><span>💠 Чувства</span></div>' +
        '<div class="chv-bar"><i style="width:' + (ST.idx / total * 100) + '%"></i></div>' +
        '<div class="chv-sit">' + esc(q.sit) + '</div>' +
        '<div class="chv-body">🫀 В теле: ' + esc(q.body) + '</div>' +
        '<div class="chv-q">Какое это чувство — точнее всего?</div>' +
        optsHtml + reveal +
      '</div>';
  }

  function pick(k) {
    if (ST.picked !== null) return;
    ST.picked = k;
    var q = ST.qs[ST.idx].q, ok = k === q.key;
    if (ok) { ST.correct++; vibe(20); } else vibe([30, 30, 30]);
    ST.log.push({ sit: q.sit, key: q.key, picked: k, ok: ok });
    renderQ();
  }

  async function explainAI() {
    if (ST.aiBusy) return; ST.aiBusy = true;
    var q = ST.qs[ST.idx].q, box = document.getElementById('chvAI'), btn = document.getElementById('chvAIbtn');
    if (btn) { btn.textContent = '🎓 Фреди думает…'; btn.disabled = true; }
    var txt = '';
    try {
      var r = await aiGenerate('Ты — Фреди, тёплый виртуальный психолог. Человек в ситуации: «' + q.sit + '» — и это чувство «' + q.key + '». В 2–3 коротких фразах по-русски, на «ты», подскажи: как экологично обойтись с этим чувством прямо в этой ситуации (что сказать/сделать), не подавляя его. Без вступлений и морали.', { max_tokens: 240 });
      txt = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { txt = ''; }
    ST.aiBusy = false;
    if (btn) { btn.style.display = 'none'; }
    if (box) box.innerHTML = txt ? '<div style="color:#bae6fd;line-height:1.55">💬 ' + esc(txt).replace(/\n/g, '<br>') + '</div>' : '<div style="color:#9ca3af">Связь подвисла — но подсказка выше уже рабочая.</div>';
  }

  function next() {
    ST.idx++; ST.picked = null;
    if (ST.idx >= ST.qs.length) { finish(); return; }
    renderQ();
  }

  function finish() {
    var total = ST.qs.length, pct = Math.round(ST.correct / total * 100);
    var score = Math.max(0, Math.min(10, Math.round(pct / 10)));
    var st = recordScore(ST.diff, score);
    var isRec = st.best[ST.diff] === score && score > 0;
    if (score >= 8) vibe([40, 40, 40]);
    var line = pct === 100 ? 'Хирургическая точность чувств 💠' : pct >= 70 ? 'Словарь эмоций богатеет' : pct >= 40 ? 'Уже различаешь оттенки — продолжай' : 'Пересмотри разборы: тело подсказывает точнее головы';
    var wrong = ST.log.filter(function (r) { return !r.ok; });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="chv-wrap">' +
        '<div class="chv-h1" style="font-size:1.2rem">💠 Результат</div>' +
        '<div class="chv-score">' + ST.correct + ' из ' + total + ' · ' + pct + '%' + (isRec ? ' 🏆 рекорд!' : '') + '</div>' +
        '<div class="chv-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        (wrong.length ? '<div class="chv-card"><div class="chv-ch">Пары на пересмотр</div>' + wrong.map(function (r) { return '<div style="margin:6px 0;color:#c8ccd4;font-size:.92rem">• Там было <b>' + esc(r.key) + '</b>, ты выбрал «' + esc(r.picked) + '».</div>'; }).join('') + '</div>' : '<div class="chv-card" style="text-align:center;color:#6ee7b7">Ни одной путаницы! 🎯</div>') +
        '<div class="chv-card" style="font-size:.9rem;color:#9ca3af">💡 Перенос в жизнь: сегодня, поймав любое «мне плохо/что-то не то», задай себе вопрос из игры — «какое это чувство точнее всего?» Одно точное слово — и уже понятнее, что делать.</div>' +
        '<div class="chv-row"><button class="chv-primary" onclick="CHUVSTVA.start()" style="margin:0">🔁 Ещё раунд</button><button class="chv-secondary" onclick="CHUVSTVA.home()">Уровень / меню</button></div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'chuvstva', diff: ST.diff, score: score });
  }

  window.CHUVSTVA = { home: home, setDiff: setDiff, start: start, pick: pick, next: next, explainAI: explainAI, getState: function () { return ST; } };
  window.showChuvstvaGame = home;
  console.log('✅ chuvstva.js loaded (игра «Чувства»)');
})();
