// ============================================================
// vsluh.js — игра-тренажёр «Мысль вслух» — наладка приватных
// процессов мышления при чтении и слушании.
//
// Мышление — приватное поведение: его видит только сам человек,
// поэтому его никто не поправил. Лечим по Гальперину: выносим
// операцию НАРУЖУ (вслух/в текст), Фреди моделирует эталон,
// оценивает и дорабатывает слабое — потом она сворачивается внутрь.
// Фреди «думает вслух» в РАЗНЫХ контекстах (наука, новость, письмо,
// спор, житейское решение), чтобы навык не привязался к одному месту.
// Отдельный акт — «Ревизия склада / анти-попугай»: старое знание,
// залетевшее без обработки, прогоняем через операции — обработать
// или утилизировать. Сначала навык, потом привычка.
// Бесплатно. Экспорт: window.showVsluhGame, window.VSLUH
// ============================================================
(function () {
  'use strict';

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || ''; }
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
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 320, temperature: opts.temperature == null ? 0.4 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }
  function parseJson(txt) {
    if (!txt) return null;
    var m = String(txt).match(/\{[\s\S]*\}/); if (!m) return null;
    try { return JSON.parse(m[0]); } catch (e) { return null; }
  }

  var SITE = 'https://meysternlp.ru';
  var COURSE_URL = SITE + '/blog/lektorij/kak-dumat/';
  var LEC = {
    teoriya: { t: 'Приватное и публичное: почему думать не научили', u: SITE + '/blog/lekciya-dumat-1-privatnoe-i-publichnoe.html' },
    vsluh:   { t: 'Мысль вслух: как сделать невидимое видимым', u: SITE + '/blog/lekciya-dumat-2-mysl-vsluh.html' },
    popugaj: { t: 'Попугай: чужие мысли вместо своих', u: SITE + '/blog/lekciya-dumat-3-popugaj.html' },
    svoimi:  { t: 'Своими словами: проверка понимания', u: SITE + '/blog/lekciya-dumat-6-svoimi-slovami.html' }
  };

  var OPS = {
    svoimi:   'Своими словами',
    vopros:   'Вопрос к тексту',
    obraz:    'Перевод в образ',
    glavnoe:  'Выделение главного',
    svyaz:    'Связывание с известным',
    vosproizv:'Воспроизведение',
    primer:   'Пример из жизни',
    monitor:  'Мониторинг понимания'
  };

  var HOME_DEMO = {
    ctx: 'фраза из статьи',
    text: '«Инфляция обесценивает сбережения, если они лежат без движения».',
    aloud: 'С — стоп, не проглатываю. Л — своими словами: деньги, которые просто лежат, со временем покупают меньше. Е — почему? цены растут, а сумма та же. Д — достаю и применяю: держать всё «под подушкой» — незаметно терять; сегодня проверю, где лежат мои.'
  };

  // ===== Уровень 1: «Что за операция?» =====
  var RECOG = [
    { ctx: 'абзац учебника', text: 'Клетка получает энергию, расщепляя глюкозу в митохондриях.',
      aloud: 'Если по-простому: внутри клетки есть «электростанции» — митохондрии, и они жгут сахар, чтобы дать энергию.', op: 'svoimi',
      why: 'Фреди пересказал мысль своими словами и образом — это проверка понимания, а не повтор текста.' },
    { ctx: 'новость в ленте', text: 'Компания отчиталась о рекордной прибыли на фоне сокращения штата.',
      aloud: 'Погоди — прибыль рекордная, а людей сократили? А не связано ли одно с другим? И за чей счёт рекорд?', op: 'vopros',
      why: 'Фреди задал тексту вопрос — вытащил скрытую связь, а не проглотил утверждение.' },
    { ctx: 'строчка из инструкции', text: 'Затяните болты крест-накрест с усилием 90 Нм.',
      aloud: 'Представляю: четыре болта по углам, и я иду не по кругу, а по диагонали — как рисую букву Х.', op: 'obraz',
      why: 'Фреди перевёл сухую инструкцию в картинку — так она становится понятной и запоминается.' },
    { ctx: 'глава книги', text: 'Автор три страницы разбирает, как страх мешает решениям.',
      aloud: 'Ладно, а суть-то в одном: под страхом голова сужается и выбирает похуже. Остальное — примеры к этому.', op: 'glavnoe',
      why: 'Фреди вытащил ядро — без чего глава рассыпется, — отделив главное от иллюстраций.' },
    { ctx: 'рабочее письмо', text: 'Просьба согласовать бюджет до конца недели.',
      aloud: 'Это же как в прошлый раз с отчётом — «до конца недели» у них значит «уже горит». Знакомая история.', op: 'svyaz',
      why: 'Фреди связал новое с уже известным опытом — знание цепляется за знание.' },
    { ctx: 'абзац лекции', text: 'Прочитал раздел про память и закрыл текст.',
      aloud: 'Так, не подглядывая: что я вообще запомнил? Три этапа… кодирование, хранение и… припоминание. Да, вот так.', op: 'vosproizv',
      why: 'Фреди закрыл текст и достал знание по памяти — это воспроизведение, а не перечитывание.' }
  ];

  // ===== Уровень 2: «Где сбой?» =====
  var FLAWS = [
    { ctx: 'студент читает учебник', text: 'Диффузия — это перемещение вещества из области высокой концентрации в область низкой.',
      aloud: 'Своими словами: диффузия — это перемещение вещества из области высокой концентрации в область низкой.',
      opts: [{ t: 'Это пересказ слово в слово — понимание не проверено', k: 'ok' }, { t: 'Слишком короткий пересказ', k: 'no' }, { t: 'Придумал лишнее', k: 'no' }, { t: 'Ушёл в сторону', k: 'no' }],
      why: 'Повторить те же слова — не значит понять. Настоящий парафраз меняет слова: «вещество само растекается туда, где его меньше».' },
    { ctx: 'человек слушает новость', text: 'Учёные нашли связь между сном и памятью.',
      aloud: 'Ну понятно, значит если не спать — станешь дураком, а если спать по 12 часов — гением.',
      opts: [{ t: 'Придумал своё, чего в тексте не было', k: 'ok' }, { t: 'Слишком точно пересказал', k: 'no' }, { t: 'Не задал вопрос', k: 'no' }, { t: 'Перевёл в образ', k: 'no' }],
      why: 'Из «есть связь» человек выпрыгнул в дикие выводы. Обработка — удержаться в том, что сказано, а не фантазировать.' },
    { ctx: 'чтение договора', text: 'Пункт 4.2: сторона вправе расторгнуть договор, уведомив за 30 дней.',
      aloud: 'Так, дальше там про сроки поставки, кстати надо кофе купить, и вообще договоры это скучно…',
      opts: [{ t: 'Ушёл в сторону — потерял нить', k: 'ok' }, { t: 'Слишком глубоко вник', k: 'no' }, { t: 'Пересказал дословно', k: 'no' }, { t: 'Задал лишний вопрос', k: 'no' }],
      why: 'Внимание соскользнуло, а человек не заметил. Мониторинг — ловить момент «я уплыл» и возвращаться к нити.' },
    { ctx: 'студент на лекции', text: 'Сложный абзац про три пояса мыследеятельности.',
      aloud: 'Ага, понятно, понятно… дальше.',
      opts: [{ t: 'Сказал «понятно», но не проверил — иллюзия понимания', k: 'ok' }, { t: 'Слишком долго думал', k: 'no' }, { t: 'Придумал пример', k: 'no' }, { t: 'Связал с известным', k: 'no' }],
      why: 'Чувство «понятно» обманывает. Проверка — сказать своими словами: не получилось — значит, не понял.' },
    { ctx: 'чтение рецепта', text: 'Взбивайте белки до устойчивых пиков.',
      aloud: 'До устойчивых пиков… до устойчивых пиков… до устойчивых пиков…',
      opts: [{ t: 'Зациклился на словах вместо смысла и образа', k: 'ok' }, { t: 'Слишком быстро прочитал', k: 'no' }, { t: 'Задал вопрос', k: 'no' }, { t: 'Вытащил главное', k: 'no' }],
      why: 'Повторять слова — не обрабатывать. Образ: белки держат форму как крем и не оседают — вот что значит «пики».' }
  ];

  // ===== Банк текстов в разных контекстах (уровни 3-5) =====
  var TEXTS = [
    { id: 'sci', ctx: 'научный абзац', text: 'Нейроны не соединены напрямую: между ними есть щель — синапс, через которую сигнал передаётся химическими веществами.' },
    { id: 'news', ctx: 'новость', text: 'Город закупил новые автобусы, но маршруты не изменились, и жалобы на переполненность остались прежними.' },
    { id: 'mail', ctx: 'рабочее письмо', text: 'Коллеги, из-за задержки поставки сдвигаем запуск на две недели. Прошу пересобрать план и прислать новые сроки к пятнице.' },
    { id: 'law', ctx: 'пункт правил', text: 'Возврат товара возможен в течение 14 дней, если сохранён товарный вид и упаковка, кроме товаров из списка невозвратных.' },
    { id: 'life', ctx: 'житейская ситуация', text: 'Друг всё время отменяет встречи в последний момент, извиняется, а потом всё повторяется снова.' },
    { id: 'arg', ctx: 'спор в чате', text: 'Раз все успешные люди рано встают, значит, чтобы стать успешным, надо вставать в пять утра.' }
  ];

  // ===== Уровень 6: ревизия склада — «известные» факты (зонды Рассела) =====
  var FACTS = [
    { q: 'Что такое звук — как он вообще устроен?', tag: 'звук' },
    { q: 'Почему день сменяется ночью?', tag: 'день и ночь' },
    { q: 'Почему летом теплее, чем зимой?', tag: 'времена года' },
    { q: 'Почему предметы падают вниз?', tag: 'падение' },
    { q: 'Почему лёд не тонет в воде?', tag: 'лёд' },
    { q: 'Откуда берётся ветер?', tag: 'ветер' }
  ];

  // ===== «Минутка»: банк мини-текстов с полной петлёй СЛЕД (для тактов «смотри» и «доделай») =====
  var MIN = [
    { ctx: 'наука', text: 'Мышцы растут не на тренировке, а после неё: во время отдыха волокна восстанавливаются с запасом.',
      sled: { s: 'Стоп, не листаю дальше.', l: 'Своими словами: рост — это ремонт после нагрузки, а не сама нагрузка.', e: 'Почему? Тренировка надрывает волокна, а тело чинит их «с запасом» — на вырост.', d: 'Уношу: без отдыха тренировки впустую. Сегодня лягу раньше.' } },
    { ctx: 'новость', text: 'Сервис объявил подписку бесплатной, но в соглашении появился пункт о передаче обезличенных данных партнёрам.',
      sled: { s: 'Стоп: слово «бесплатно» — повод проверить.', l: 'Своими словами: платим не деньгами, а данными.', e: 'Почему? Сервису надо на что-то жить — доход переехал из моего кармана в мои данные.', d: 'Уношу: перед любым «бесплатно» ищу, чем плачу на самом деле.' } },
    { ctx: 'рабочее письмо', text: 'Коллеги, отчёт переносится: ждём цифры от подрядчика, без них разделы два и три пустые.',
      sled: { s: 'Стоп: что тут важно лично мне?', l: 'Своими словами: сроки едут не из-за нас — застряли чужие данные.', e: 'Почему важно? Узкое место снаружи, торопить бессмысленно — надо готовить своё.', d: 'Уношу: добью свой раздел сейчас, чтобы не собирать всё в последнюю ночь.' } },
    { ctx: 'пункт правил', text: 'Гарантия не действует, если устройство вскрывали вне авторизованного сервиса.',
      sled: { s: 'Стоп, это условие с ловушкой.', l: 'Своими словами: полез внутрь сам — гарантия сгорела.', e: 'Почему так? Производитель не может отвечать за чужие руки внутри устройства.', d: 'Уношу: пока гарантия жива — только официальный сервис, даже если дольше.' } },
    { ctx: 'житейское', text: 'Подруга обижается, что я подолгу не отвечаю, а я просто не вижу её сообщений в потоке рабочих чатов.',
      sled: { s: 'Стоп, тут конфликт не про чувства.', l: 'Своими словами: она читает молчание как безразличие, а это просто шум канала.', e: 'Почему? У нас разные картинки: у неё «игнорирует», у меня «не заметил».', d: 'Уношу: закреплю её чат сверху — и скажу ей, как всё устроено на самом деле.' } },
    { ctx: 'спор в чате', text: 'Это средство натуральное — значит, безопасное.',
      sled: { s: 'Стоп: «значит» — проверяю связку.', l: 'Своими словами: тут ставят знак равенства между природным и безвредным.', e: 'Почему это не так? Мухомор и змеиный яд тоже натуральные. Происхождение не решает — решает доза и действие.', d: 'Уношу: на слово «натуральный» реагирую вопросом «а проверяли ли действие?».' } },
    { ctx: 'история', text: 'Печатный станок удешевил книги — и грамотность из привилегии стала нормой.',
      sled: { s: 'Стоп, здесь целая цепочка.', l: 'Своими словами: когда книга подешевела, читать стало выгодно учиться всем.', e: 'Почему? Дорогая книга — читают избранные; дешёвая — чтение окупается для каждого.', d: 'Уношу: удешевление инструмента меняет общество сильнее указов. Где так сейчас? Нейросети.' } },
    { ctx: 'деньги', text: 'Скидка пятьдесят процентов на второй товар — это скидка двадцать пять процентов, если тебе нужен один.',
      sled: { s: 'Стоп, посчитаю сам.', l: 'Своими словами: платишь полторы цены за два — по семьдесят пять сотых за штуку.', e: 'Почему так подают? Большая цифра «50» цепляет сильнее честной «25».', d: 'Уношу: скидку считаю на единицу товара, которая нужна мне, а не на акцию.' } },
    { ctx: 'здоровье', text: 'Кофе вечером мешает не заснуть, а выспаться: сон становится поверхностным.',
      sled: { s: 'Стоп, тут тонкое различие.', l: 'Своими словами: можно заснуть с кофеином — но сон будет хуже качеством.', e: 'Почему? Кофеин глушит сигнал усталости, и глубокие фазы сна сокращаются.', d: 'Уношу: «я нормально засыпаю после кофе» — не аргумент; смотреть надо на то, как высыпаюсь.' } },
    { ctx: 'просто интересно', text: 'Молния видна раньше грома, потому что свет летит почти мгновенно, а звук проходит примерно километр за три секунды.',
      sled: { s: 'Стоп, тут можно вытащить инструмент.', l: 'Своими словами: вспышка и грохот рождаются вместе, но добегают до меня с разной скоростью.', e: 'Почему? Свету расстояние почти безразлично, а звук ползёт — вот и разрыв во времени.', d: 'Уношу: секунды между вспышкой и громом — дальномер: три секунды — километр до грозы.' } },
    { ctx: 'рабочая задача', text: 'Коллега просит «глянуть одним глазом» его отчёт перед отправкой директору.',
      sled: { s: 'Стоп: «одним глазом» — что за просьба на самом деле?', l: 'Своими словами: он хочет разделить ответственность, а не получить проверку.', e: 'Почему? Если директор найдёт ошибку, будет «мы же вместе смотрели».', d: 'Уношу: либо проверяю по-настоящему и говорю, что нашёл, либо честно отказываюсь — «одним глазом» не бывает.' } },
    { ctx: 'история', text: 'Средневековые врачи пускали кровь почти при любой болезни — и пациентам иногда «становилось легче».',
      sled: { s: 'Стоп: откуда «легче», если метод вреден?', l: 'Своими словами: облегчение приписывали кровопусканию, хотя тело справлялось само.', e: 'Почему? Большинство болезней проходит само: что сделал перед выздоровлением — то и «помогло».', d: 'Уношу: «после — не значит из-за»; спрашиваю, что было бы и без «лекарства».' } },
    { ctx: 'личное сообщение', text: '«Если бы ты меня правда ценил, ты бы сам догадался, что мне нужно».',
      sled: { s: 'Стоп, тут чувство упаковано в упрёк.', l: 'Своими словами: от меня требуют чтения мыслей как доказательства любви.', e: 'Почему это ловушка? Догадки — ненадёжный канал: проверка чувств через телепатию обречена и копит обиды.', d: 'Уношу: перевожу в просьбу — «скажи словами, что нужно, я хочу это сделать».' } },
    { ctx: 'природа', text: 'Лёд не тонет, потому что при замерзании вода расширяется и становится легче воды.',
      sled: { s: 'Стоп: «становится легче» — а почему?', l: 'Своими словами: в льде молекулы выстраиваются каркасом с пустотами — вещества в том же объёме меньше.', e: 'Почему каркас? Водородные связи держат молекулы «на расстоянии»: решётка просторнее жидкой толчеи.', d: 'Уношу: под «все знают» часто прячется второй этаж «почему» — проверяю его.' } },
    { ctx: 'объявление', text: '«Осталось всего 3 места по этой цене».',
      sled: { s: 'Стоп: классический сигнал срочности.', l: 'Своими словами: меня торопят, чтобы я не успел подумать.', e: 'Почему работает? Страх упустить сильнее оценки нужности; счётчик создаёт гонку на пустом месте.', d: 'Уношу: срочность — повод замедлиться; честное предложение доживёт до завтра.' } }
  ];
  var SLED_STEPS = [
    { k: 's', chip: 'С', name: 'Стоп' },
    { k: 'l', chip: 'Л', name: 'вЛожи в свои слова' },
    { k: 'e', chip: 'Е', name: 'Есть почему?' },
    { k: 'd', chip: 'Д', name: 'Достань и примени' }
  ];

  var LEVELS = [
    { n: 1, em: '👂', t: 'Что за операция?', d: 'Клики: узнай, что Фреди сделал вслух с текстом', act: 1 },
    { n: 2, em: '🔎', t: 'Где сбой?', d: 'Клики: найди ошибку в чужой мысли вслух', act: 1 },
    { n: 3, em: '🔁', t: 'Своими словами', d: 'Перескажи мысль своими словами; Фреди оценит и покажет эталон', act: 2 },
    { n: 4, em: '❓', t: 'Вопрос к тексту', d: 'Задай тексту сильный вопрос; Фреди оценит', act: 2 },
    { n: 5, em: '🎯', t: 'Что главное', d: 'Вытащи ядро из абзаца; Фреди оценит', act: 2 },
    { n: 6, em: '🦜', t: 'Попугай или понял?', d: 'Объясни «известное» — Фреди отличит понимание от попугайства · открыт сразу', act: 3 },
    { n: 7, em: '🎓', t: 'Экзамен: думай вслух', d: 'Полный цикл на своём тексте — Фреди проверит, оценит и доработает', act: 4 }
  ];
  var ACTS = { 1: 'Акт I · Узнавание', 2: 'Акт II · Исполнение', 3: 'Акт III · Ревизия склада', 4: 'Акт IV · Экзамен' };

  function loadProg() {
    try { var p = JSON.parse(localStorage.getItem('vsluh_path') || 'null'); if (p && typeof p === 'object') return p; } catch (e) {}
    return { done: {}, best: 0, title: '' };
  }
  function saveProg(p) { try { localStorage.setItem('vsluh_path', JSON.stringify(p)); } catch (e) {} }
  function maxUnlocked(p) { var m = 1; for (var i = 1; i <= 7; i++) { if (p.done[i]) m = i + 1; else break; } return Math.min(m, 7); }

  // Прогресс «Минутки»: серия, счётчик, фото «до» и последняя оценка
  function loadMin() {
    try { var m = JSON.parse(localStorage.getItem('vsluh_min') || 'null'); if (m && typeof m === 'object') return m; } catch (e) {}
    return { streak: 0, lastDay: '', count: 0, first: null, last: null, hist: [] };
  }
  function saveMin(m) { try { localStorage.setItem('vsluh_min', JSON.stringify(m)); } catch (e) {} }
  function dayStr(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function bumpMin(score) {
    var m = loadMin(); var today = dayStr();
    if (m.lastDay !== today) {
      // серия щадящая: один пропущенный день прощается — «не пересиливать»
      var y1 = dayStr(new Date(Date.now() - 864e5)), y2 = dayStr(new Date(Date.now() - 2 * 864e5));
      m.streak = (m.lastDay === y1 || m.lastDay === y2) ? (m.streak || 0) + 1 : 1;
      m.lastDay = today;
      m.todayN = 1;
    } else {
      m.todayN = (m.todayN || 1) + 1;
    }
    m.count = (m.count || 0) + 1;
    if (score != null) {
      m.hist = (m.hist || []).concat([score]).slice(-30);
      if (!m.first) m.first = { score: score, day: today };
      m.last = { score: score, day: today };
    }
    saveMin(m); return m;
  }

  var ST = { screen: 'home', lvl: 0, ti: 0, tasks: [], score: 0, wins: 0, answered: false, marks: [], busy: false, exam: {} };

  function injectCSS() {
    if (document.getElementById('vsluh-css')) return;
    var st = document.createElement('style'); st.id = 'vsluh-css';
    st.textContent = [
      '.vl-wrap{max-width:640px;margin:0 auto;padding:18px 16px 96px;color:#e7eaf0;font-size:1rem;line-height:1.6}',
      '.vl-top{display:flex;justify-content:space-between;align-items:center;color:#8b93a7;font-size:.86rem;margin-bottom:14px}',
      '.vl-x{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:0}',
      '.vl-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:0 0 6px}',
      '.vl-sub{color:#aab2c4;margin:0 0 16px}',
      '.vl-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px;margin:0 0 12px}',
      '.vl-card b{color:#fff;font-weight:600}',
      '.vl-ch{font-weight:700;color:#fff;margin-bottom:8px}',
      '.vl-ctx{font-size:.76rem;letter-spacing:.04em;text-transform:uppercase;color:#818cf8;font-weight:700;margin-bottom:5px}',
      '.vl-txt{background:rgba(99,102,241,.08);border:1px solid rgba(129,140,248,.32);border-radius:12px;padding:12px 14px;color:#dfe2ff;font-size:.98rem;line-height:1.6}',
      '.vl-aloud{background:rgba(99,102,241,.12);border:1px solid rgba(129,140,248,.45);border-left:3px solid #6366f1;border-radius:12px;padding:12px 14px;margin:10px 0 0;color:#e5e7ff;font-size:.96rem;line-height:1.65;font-style:italic}',
      '.vl-aloud .lab{display:block;font-style:normal;font-size:.74rem;letter-spacing:.04em;text-transform:uppercase;color:#a5b4fc;font-weight:700;margin-bottom:5px}',
      '.vl-choice{display:block;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);border-radius:13px;padding:13px 15px;margin:0 0 10px;color:#e7eaf0;font:inherit;font-size:.95rem;line-height:1.5;cursor:pointer;transition:.15s}',
      '.vl-choice:hover{border-color:rgba(129,140,248,.6)}',
      '.vl-choice:disabled{cursor:default;opacity:1}',
      '.vl-choice.ok{border-color:#818cf8;background:rgba(99,102,241,.16)}',
      '.vl-choice.no{border-color:#f87171;background:rgba(248,113,113,.10);opacity:.85}',
      '.vl-choice.dim{opacity:.45}',
      '.vl-why{background:rgba(99,102,241,.08);border:1px solid rgba(129,140,248,.3);border-radius:12px;padding:12px 14px;margin:2px 0 12px;font-size:.92rem;color:#e0e3ff;line-height:1.55}',
      '.vl-prog{display:flex;gap:5px;margin-bottom:14px}',
      '.vl-prog i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.14)}',
      '.vl-prog i.on{background:#818cf8}',
      '.vl-prog i.hit{background:#34d399}',
      '.vl-prog i.miss{background:#f87171}',
      '.vl-node{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px 14px;margin:0 0 8px;color:#e7eaf0;font:inherit;cursor:pointer;transition:.15s}',
      '.vl-node:hover{border-color:rgba(129,140,248,.55)}',
      '.vl-node.lock{opacity:.45;cursor:default}',
      '.vl-node .nem{font-size:1.3rem;width:34px;text-align:center;flex-shrink:0}',
      '.vl-node .nt{font-weight:700;color:#fff;font-size:.97rem}',
      '.vl-node .nd{color:#8b93a7;font-size:.8rem;line-height:1.35}',
      '.vl-node .nst{margin-left:auto;flex-shrink:0;font-size:.95rem}',
      '.vl-node.next{border-color:rgba(129,140,248,.55);background:rgba(99,102,241,.08)}',
      '.vl-act{color:#8b93a7;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;margin:14px 2px 8px;font-weight:700}',
      '.vl-ta{width:100%;box-sizing:border-box;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;font:15px/1.5 inherit;padding:12px 13px;resize:vertical;min-height:76px}',
      '.vl-ta:focus{outline:none;border-color:#818cf8}',
      '.vl-pill{display:inline-block;padding:6px 14px;border-radius:999px;font-weight:800;font-size:1.05rem}',
      '.vl-pill.w{background:rgba(52,211,153,.16);color:#6ee7b7}',
      '.vl-pill.l{background:rgba(248,113,113,.14);color:#fca5a5}',
      '.vl-primary{width:100%;margin-top:14px;padding:14px 16px;border:none;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#818cf8);color:#fff;font:700 1rem inherit;cursor:pointer}',
      '.vl-primary:disabled{opacity:.5;cursor:default}',
      '.vl-secondary{width:100%;margin-top:10px;padding:12px 16px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:transparent;color:#cdd4e2;font:600 .95rem inherit;cursor:pointer}',
      '.vl-hint{color:#8b93a7;font-size:.85rem;margin:6px 2px}',
      '.vl-score{font-size:2.6rem;font-weight:800;letter-spacing:-.03em;line-height:1;color:#fff}',
      '.vl-fb{color:#d7def0;line-height:1.65}',
      '.vl-row{display:flex;gap:10px;margin-top:14px}',
      '.vl-row>*{flex:1;margin-top:0}',
      '.vl-course{display:block;text-align:center;margin:12px 0 0;padding:11px;font-size:.9rem;color:#a5b4fc;text-decoration:none;background:rgba(99,102,241,.08);border:1px solid rgba(129,140,248,.28);border-radius:12px}',
      '.vl-lec{display:inline-block;margin-top:9px;font-size:.85rem;color:#a5b4fc;text-decoration:none;border-bottom:1px solid rgba(165,180,252,.35)}',
      '.vl-spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:vlspin .7s linear infinite;vertical-align:-3px;margin-right:6px}',
      '@keyframes vlspin{to{transform:rotate(360deg)}}',
      '.vl-verdict{display:inline-block;padding:5px 12px;border-radius:999px;font-weight:700;font-size:.85rem}',
      '.vl-verdict.und{background:rgba(52,211,153,.16);color:#6ee7b7}',
      '.vl-verdict.par{background:rgba(251,191,36,.16);color:#fcd34d}',
      '.vl-exlab{font-size:.8rem;color:#a5b4fc;font-weight:700;margin:12px 2px 5px}',
      '.vl-sledrow{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0 8px}',
      '.vl-schip{background:rgba(99,102,241,.14);border:1px solid rgba(129,140,248,.45);border-radius:999px;padding:5px 11px;font-size:.84rem;color:#dfe2ff;white-space:nowrap}',
      '.vl-schip b{color:#a5b4fc}',
      '.vl-sarr{color:#6366f1;font-weight:700}',
      '.vl-min{display:block;width:100%;box-sizing:border-box;text-align:left;background:linear-gradient(135deg,rgba(79,70,229,.30),rgba(99,102,241,.12));border:1px solid rgba(129,140,248,.55);border-radius:14px;padding:14px 16px;margin:0 0 14px;color:#fff;font:700 1rem inherit;cursor:pointer;transition:.15s}',
      '.vl-min:hover{border-color:#818cf8}',
      '.vl-min span{display:block;font-weight:400;color:#aab2c4;font-size:.83rem;margin-top:3px}',
      '.vl-soc{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.32);border-radius:12px;padding:12px 14px;margin:10px 0 0;font-size:.93rem;color:#fde68a;line-height:1.6}',
      '.vl-bridge{background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.32);border-radius:12px;padding:12px 14px;margin:10px 0 0;font-size:.93rem;color:#a7f3d0;line-height:1.6}',
      '.vl-tact{display:inline-block;padding:4px 12px;border-radius:999px;font-weight:700;font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;background:rgba(129,140,248,.16);color:#a5b4fc;margin-bottom:10px}',
      '[data-theme="light"] .vl-schip{background:#eef0ff;color:#312e81}',
      '[data-theme="light"] .vl-min{background:linear-gradient(135deg,#eef0ff,#f5f6ff);color:#312e81;border-color:#c7cbf5}',
      '[data-theme="light"] .vl-min span{color:#5a6472}',
      '[data-theme="light"] .vl-soc{background:#fffbeb;color:#92400e}',
      '[data-theme="light"] .vl-bridge{background:#ecfdf5;color:#065f46}',
      '[data-theme="light"] .vl-wrap{color:#1d1d1f}',
      '[data-theme="light"] .vl-card,[data-theme="light"] .vl-node,[data-theme="light"] .vl-choice{background:#fff;border-color:rgba(0,0,0,.12);color:#1d1d1f}',
      '[data-theme="light"] .vl-card b,[data-theme="light"] .vl-ch,[data-theme="light"] .vl-score,[data-theme="light"] .vl-node .nt{color:#0b1220}',
      '[data-theme="light"] .vl-sub,[data-theme="light"] .vl-hint,[data-theme="light"] .vl-top,[data-theme="light"] .vl-node .nd{color:#5a6472}',
      '[data-theme="light"] .vl-ta{background:#f5f7fa;color:#0b1220;border-color:rgba(0,0,0,.15)}',
      '[data-theme="light"] .vl-txt{background:#eef0ff;color:#312e81}',
      '[data-theme="light"] .vl-aloud{background:#eef0ff;color:#3730a3}',
      '[data-theme="light"] .vl-why{background:#eef0ff;color:#312e81}',
      '[data-theme="light"] .vl-fb{color:#333}',
      '[data-theme="light"] .vl-course,[data-theme="light"] .vl-lec{color:#4338ca}',
      '@media(max-width:560px){.vl-wrap{padding:14px 12px 96px}.vl-h1{font-size:1.32rem}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function aloudBlock(ctx, aloud) {
    return '<div class="vl-aloud"><span class="lab">🗣 Фреди думает вслух · ' + esc(ctx) + '</span>' + nl2br(aloud) + '</div>';
  }

  function home() {
    injectCSS();
    ST.screen = 'home';
    var c = container(); if (!c) return;
    var p = loadProg();
    var unlocked = maxUnlocked(p);
    var doneCount = Object.keys(p.done).length;
    var nodes = '', lastAct = 0;
    LEVELS.forEach(function (L) {
      if (L.act !== lastAct) { nodes += '<div class="vl-act">' + ACTS[L.act] + '</div>'; lastAct = L.act; }
      var done = !!p.done[L.n];
      var isNext = !done && L.n === unlocked;
      var locked = !done && L.n > unlocked && L.n !== 6;
      nodes += '<button class="vl-node' + (isNext ? ' next' : '') + (locked ? ' lock' : '') + '" onclick="' + (locked ? '' : 'VSLUH.play(' + L.n + ')') + '">' +
        '<span class="nem">' + L.em + '</span>' +
        '<span><span class="nt">' + L.n + '. ' + esc(L.t) + '</span><br><span class="nd">' + esc(L.d) + '</span></span>' +
        '<span class="nst">' + (done ? '✅' : (isNext ? '▶' : '🔒')) + '</span>' +
      '</button>';
    });
    c.innerHTML =
      '<div class="vl-wrap">' +
        '<div class="vl-top"><button class="vl-x" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button><span>💭 бесплатно</span></div>' +
        '<h1 class="vl-h1">💭 Мысль вслух</h1>' +
        '<p class="vl-sub">Думать — <b style="color:#e7eaf0">приватное поведение</b>: его видит только сам человек, поэтому его никто не поправил. Здесь мы выносим мышление <b style="color:#e7eaf0">наружу</b>: Фреди думает вслух, ты повторяешь, он оценивает и дорабатывает. Сначала — навык думать, потом — привычка.</p>' +
        '<p class="vl-sub" style="margin-top:-4px">Это <b style="color:#e7eaf0">игра, а не экзамен</b>. Не старайся «думать правильно» — просто решай задачу раунда: пойми текст, ответь на вопрос. Операции ставятся легче без давления — когда прожектор на смысле, а не на себе. Ошибаться тут можно и нужно.</p>' +
        '<div class="vl-card"><div class="vl-ch">🔁 Петля СЛЕД — весь курс в одном движении</div>' +
          '<div class="vl-sledrow">' + SLED_STEPS.map(function (st, i) {
            return (i ? '<span class="vl-sarr">→</span>' : '') + '<span class="vl-schip"><b>' + st.chip + '</b> ' + esc(st.name) + '</span>';
          }).join('') + '</div>' +
          '<div class="vl-hint" style="margin:0">Сначала вслух и медленно, потом про себя, потом — само. Одна петля на любой текст, письмо или разговор.</div>' +
        '</div>' +
        minButton() +
        '<div class="vl-card"><div class="vl-ch">Смотри, как это делается</div>' +
          '<div class="vl-ctx">' + esc(HOME_DEMO.ctx) + '</div><div class="vl-txt">' + esc(HOME_DEMO.text) + '</div>' +
          aloudBlock(HOME_DEMO.ctx, HOME_DEMO.aloud) +
          '<div class="vl-hint" style="margin-top:8px">Это петля <b style="color:#c7d2fe">СЛЕД</b> в действии: стоп → свои слова → почему → примени. Этому и учимся — на любом тексте.</div>' +
        '</div>' +
        (p.title ? '<div style="text-align:center;margin:0 0 10px"><span class="vl-pill w">' + esc(p.title) + '</span></div>' : '') +
        (doneCount ? '<div class="vl-hint" style="margin:0 0 8px">Пройдено уровней: ' + doneCount + '/7</div>' : '') +
        nodes +
        '<a class="vl-course" href="' + COURSE_URL + '" target="_blank" rel="noopener">🎓 Теория — курс «Как думать: наладка ума перед учёбой»</a>' +
      '</div>';
    track('game_open', { game: 'vsluh', unlocked: unlocked });
  }

  function play(n) {
    var p = loadProg();
    if (n > maxUnlocked(p) && n !== 6) { toast('Сначала пройди предыдущий уровень', 'info'); return; }
    ST.lvl = n; ST.ti = 0; ST.score = 0; ST.wins = 0; ST.marks = []; ST.answered = false;
    track('vl_level_start', { level: n });
    if (n === 1) { ST.tasks = shuffle(RECOG); renderRecog(); }
    else if (n === 2) { ST.tasks = shuffle(FLAWS); renderFlaw(); }
    else if (n >= 3 && n <= 5) { ST.tasks = shuffle(TEXTS).slice(0, 3); renderDo(); }
    else if (n === 6) { ST.tasks = shuffle(FACTS).slice(0, 3); renderReviz(); }
    else if (n === 7) { ST.exam = {}; renderExamIntro(); }
  }

  function progBar() {
    var h = '<div class="vl-prog">';
    for (var i = 0; i < ST.tasks.length; i++) {
      var cls = '';
      if (i < ST.marks.length) cls = ST.marks[i] ? ' hit' : ' miss';
      else if (i === ST.marks.length) cls = ' on';
      h += '<i class="' + cls + '"></i>';
    }
    return h + '</div>';
  }
  function lvlHead(sub) {
    var L = LEVELS[ST.lvl - 1];
    return '<div class="vl-top"><span>' + L.em + ' Уровень ' + L.n + ' · ' + esc(L.t) + '</span><button class="vl-x" onclick="VSLUH.quitLevel()">✕ Выйти</button></div>' +
      (sub ? '<p class="vl-sub" style="margin-bottom:12px">' + sub + '</p>' : '');
  }
  function quitLevel() {
    if (ST.ti > 0 && !confirm('Выйти? Прогресс уровня не сохранится.')) return;
    home();
  }
  function lecLink(key) { var l = LEC[key]; return '<a class="vl-lec" href="' + l.u + '" target="_blank" rel="noopener">📖 Лекция: ' + esc(l.t) + ' →</a>'; }
  function spin(txt) { return '<div style="text-align:center;padding-top:50px"><div class="vl-score"><span class="vl-spin"></span></div><p class="vl-sub" style="margin-top:16px">' + esc(txt) + '</p></div>'; }

  // ===== Уровень 1 =====
  function renderRecog() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var pool = shuffle(Object.keys(OPS).filter(function (k) { return k !== t.op; })).slice(0, 3);
    var opts = shuffle([t.op].concat(pool));
    ST._opts = opts;
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('Фреди прочитал фрагмент и подумал вслух. Какую операцию он сделал?') + progBar() +
        '<div class="vl-card"><div class="vl-ctx">' + esc(t.ctx) + '</div><div class="vl-txt">' + esc(t.text) + '</div>' + aloudBlock(t.ctx, t.aloud) + '</div>' +
        opts.map(function (o, i) { return '<button class="vl-choice" id="vlC' + i + '" onclick="VSLUH.pickRecog(' + i + ')">' + esc(OPS[o]) + '</button>'; }).join('') +
        '<div id="vlWhy"></div>' +
      '</div>';
  }
  function pickRecog(i) {
    if (ST.answered) return; ST.answered = true;
    var t = ST.tasks[ST.ti];
    var hit = ST._opts[i] === t.op;
    ST.marks.push(hit);
    if (hit) { ST.score++; vibe(20); } else vibe([40, 60, 40]);
    for (var j = 0; j < ST._opts.length; j++) {
      var b = document.getElementById('vlC' + j); if (!b) continue;
      b.disabled = true;
      b.className = 'vl-choice' + (ST._opts[j] === t.op ? ' ok' : (j === i ? ' no' : ' dim'));
    }
    var w = document.getElementById('vlWhy');
    if (w) w.innerHTML = '<div class="vl-why">' + (hit ? '✅ Точно. ' : '❌ Мимо. ') + esc(t.why) + '</div>' +
      '<button class="vl-primary" onclick="VSLUH.nextTask()">' + (ST.ti + 1 < ST.tasks.length ? 'Дальше →' : 'Итог уровня →') + '</button>';
  }

  // ===== Уровень 2 =====
  function renderFlaw() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var opts = shuffle(t.opts);
    ST._opts = opts;
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('Здесь человек думает вслух — но обрабатывает неправильно. В чём сбой?') + progBar() +
        '<div class="vl-card"><div class="vl-ctx">' + esc(t.ctx) + '</div><div class="vl-txt">' + esc(t.text) + '</div>' + aloudBlock(t.ctx, t.aloud) + '</div>' +
        opts.map(function (o, i) { return '<button class="vl-choice" id="vlC' + i + '" onclick="VSLUH.pickFlaw(' + i + ')">' + esc(o.t) + '</button>'; }).join('') +
        '<div id="vlWhy"></div>' +
      '</div>';
  }
  function pickFlaw(i) {
    if (ST.answered) return; ST.answered = true;
    var t = ST.tasks[ST.ti];
    var hit = ST._opts[i].k === 'ok';
    ST.marks.push(hit);
    if (hit) { ST.score++; vibe(20); } else vibe([40, 60, 40]);
    for (var j = 0; j < ST._opts.length; j++) {
      var b = document.getElementById('vlC' + j); if (!b) continue;
      b.disabled = true;
      b.className = 'vl-choice' + (ST._opts[j].k === 'ok' ? ' ok' : (j === i ? ' no' : ' dim'));
    }
    var w = document.getElementById('vlWhy');
    if (w) w.innerHTML = '<div class="vl-why">' + (hit ? '✅ Точно. ' : '❌ Мимо. ') + esc(t.why) + '</div>' +
      '<button class="vl-primary" onclick="VSLUH.nextTask()">' + (ST.ti + 1 < ST.tasks.length ? 'Дальше →' : 'Итог уровня →') + '</button>';
  }

  function nextTask() {
    ST.ti++;
    if (ST.ti < ST.tasks.length) { if (ST.lvl === 1) renderRecog(); else renderFlaw(); return; }
    finishRecog();
  }
  function finishRecog() {
    var need = ST.lvl === 1 ? 5 : 4;
    var total = ST.tasks.length;
    var passed = ST.score >= need;
    var p = loadProg();
    if (passed) { p.done[ST.lvl] = true; saveProg(p); }
    track(passed ? 'vl_level_pass' : 'vl_level_fail', { level: ST.lvl, score: ST.score });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:18px 0 8px"><div class="vl-score">' + ST.score + '<span style="font-size:1.1rem;color:#8b93a7">/' + total + '</span></div><div class="vl-hint" style="margin-top:4px">нужно ' + need + ' из ' + total + '</div></div>' +
        '<div style="text-align:center;margin-bottom:12px"><span class="vl-pill ' + (passed ? 'w' : 'l') + '">' + (passed ? '✅ Уровень пройден' : 'Пока не хватило') + '</span></div>' +
        '<div class="vl-card"><div class="vl-fb">' + (passed ? (ST.lvl === 1 ? 'Ты уже видишь операции по именам — половина дела. Дальше — ловить сбои, а потом делать самому.' : 'Глаз на сбои намётан. Теперь — исполнять операции самому, вслух.') : 'Нормально: узнавание ставится повторами, задачи перемешаются.') + '</div>' + lecLink(ST.lvl === 1 ? 'teoriya' : 'vsluh') + '</div>' +
        (passed ? '<button class="vl-primary" onclick="VSLUH.home()">К карте пути →</button>'
                : '<button class="vl-primary" onclick="VSLUH.play(' + ST.lvl + ')">🔁 Ещё попытка</button><button class="vl-secondary" onclick="VSLUH.home()">К карте пути</button>') +
      '</div>';
  }

  // ===== Уровни 3-5: исполнение (ИИ) =====
  var DO_META = {
    3: { op: 'своими словами', ph: 'Перескажи мысль своими словами — другими словами, чем в тексте…', act: 'Переформулируй', crit: 'пересказ ДРУГИМИ словами с сохранением смысла (не копия текста), без выдумок и искажений' },
    4: { op: 'вопрос к тексту', ph: 'Задай тексту сильный вопрос: почему? откуда это? что скрыто?…', act: 'Спроси', crit: 'вопрос, вскрывающий основание, скрытое допущение или связь (а не поверхностный/пересказ)' },
    5: { op: 'выделение главного', ph: 'Одной фразой: что здесь ядро — без чего всё рассыпется?', act: 'Вытащи ядро', crit: 'ядро/главный тезис фрагмента, отделённый от деталей и примеров' }
  };
  function renderDo() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var m = DO_META[ST.lvl];
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('Твоя операция: <b style="color:#e7eaf0">' + esc(m.op) + '</b>. Сделай её вслух — впиши, как сказал бы. Контекст каждый раз новый — навык должен работать везде.') + progBar() +
        '<div class="vl-card"><div class="vl-ctx">' + esc(t.ctx) + '</div><div class="vl-txt">' + esc(t.text) + '</div></div>' +
        '<textarea class="vl-ta" id="vlIn" placeholder="' + esc(m.ph) + '"></textarea>' +
        '<button class="vl-primary" onclick="VSLUH.submitDo()">' + esc(m.act) + ' 🗣</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('vlIn'); if (el) el.focus(); }, 60);
  }
  async function submitDo() {
    if (ST.busy) return;
    var v = ((document.getElementById('vlIn') || {}).value || '').trim();
    if (v.length < 4) { toast('Впиши свой вариант', 'error'); return; }
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="vl-wrap">' + lvlHead('') + spin('Фреди слушает твою мысль…') + '</div>';
    var t = ST.tasks[ST.ti];
    var m = DO_META[ST.lvl];
    var res = null;
    try {
      var r = await aiGenerate(
        'Ты — тёплый тренер мышления. Человек учится делать операцию «' + m.op + '» вслух. Контекст: ' + t.ctx + '. Фрагмент: «' + t.text + '».\n' +
        'Его попытка: «' + v + '».\n' +
        'Оцени 0-10, насколько это именно «' + m.op + '»: критерий — ' + m.crit + '. Копия текста, выдумка или уход в сторону = низкая оценка.\n' +
        'Также дай ЭТАЛОН — как эту операцию сделал бы ты вслух (1-2 фразы, живым языком, от первого лица).\n' +
        'Верни СТРОГО JSON: {"score":ЧИСЛО,"note":"одна фраза — что удалось или что не так","model":"твой эталон вслух"}. По-русски, на «ты».',
        { max_tokens: 220, temperature: 0.35 });
      res = parseJson(r && r.content);
      if (res) { res.score = Math.max(0, Math.min(10, Math.round(Number(res.score)))); if (isNaN(res.score)) res = null; }
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { score: 7, note: 'Связь с Фреди подвисла — раунд засчитан тебе.', model: '' };
    var pass = res.score >= 6;
    ST.marks.push(pass);
    if (pass) { ST.wins++; vibe(25); } else vibe([40, 60, 40]);
    track('vl_do', { level: ST.lvl, score: res.score });
    if (!c) return;
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:4px 0 10px"><span class="vl-pill ' + (pass ? 'w' : 'l') + '">' + (pass ? '✅ Зачёт' : 'Ещё не то') + '</span><div class="vl-hint" style="margin-top:6px">Оценка: <b style="color:#fff">' + res.score + '/10</b></div></div>' +
        '<div class="vl-card"><div class="vl-ctx">твоя мысль</div><div class="vl-fb">' + nl2br(v) + '</div></div>' +
        (res.note ? '<div class="vl-why">💬 ' + esc(res.note) + '</div>' : '') +
        (res.model ? aloudBlock('эталон Фреди · ' + t.ctx, res.model) : '') +
        '<button class="vl-primary" onclick="VSLUH.nextDo()">' + (ST.ti + 1 < ST.tasks.length ? 'Следующий текст →' : 'Итог уровня →') + '</button>' +
      '</div>';
  }
  function nextDo() {
    ST.ti++;
    if (ST.ti < ST.tasks.length) { renderDo(); return; }
    var passed = ST.wins >= 2;
    var p = loadProg();
    if (passed) { p.done[ST.lvl] = true; saveProg(p); }
    track(passed ? 'vl_level_pass' : 'vl_level_fail', { level: ST.lvl, wins: ST.wins });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:18px 0 8px"><div class="vl-score">' + ST.wins + '<span style="font-size:1.1rem;color:#8b93a7">/' + ST.tasks.length + '</span></div><div class="vl-hint" style="margin-top:4px">зачётов · нужно 2</div></div>' +
        '<div style="text-align:center;margin-bottom:12px"><span class="vl-pill ' + (passed ? 'w' : 'l') + '">' + (passed ? '✅ Уровень пройден' : 'Пока не хватило') + '</span></div>' +
        '<div class="vl-card"><div class="vl-fb">' + (passed ? 'Операция получается на разном материале — значит, это уже навык, а не случайность.' : 'Тексты перемешаются — попробуй ещё: сверяйся с эталоном Фреди.') + '</div>' + lecLink('svoimi') + '</div>' +
        (passed ? '<button class="vl-primary" onclick="VSLUH.home()">К карте пути →</button>'
                : '<button class="vl-primary" onclick="VSLUH.play(' + ST.lvl + ')">🔁 Ещё попытка</button><button class="vl-secondary" onclick="VSLUH.home()">К карте пути</button>') +
      '</div>';
  }

  // ===== Уровень 6: ревизия склада — попугай или понял? (ИИ) =====
  function renderReviz() {
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('Возьмём то, что «все знают». Объясни своими словами и по механизму — так, чтобы понял ребёнок. Фреди отличит настоящее понимание от попугайства.') + progBar() +
        '<div class="vl-card"><div class="vl-ctx">известный факт</div><div class="vl-txt" style="font-size:1.05rem">' + esc(t.q) + '</div></div>' +
        '<textarea class="vl-ta" id="vlIn" style="min-height:110px" placeholder="Объясни своими словами: как и почему это работает…"></textarea>' +
        '<button class="vl-primary" onclick="VSLUH.submitReviz()">Объяснить 🗣</button>' +
        '<div class="vl-hint" style="text-align:center;margin-top:8px">Не вспоминай формулировку из учебника — объясни так, как понял сам.</div>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('vlIn'); if (el) el.focus(); }, 60);
  }
  async function submitReviz() {
    if (ST.busy) return;
    var v = ((document.getElementById('vlIn') || {}).value || '').trim();
    if (v.length < 8) { toast('Объясни чуть подробнее — по механизму', 'error'); return; }
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="vl-wrap">' + lvlHead('') + spin('Фреди проверяет: понимание или попугай…') + '</div>';
    var t = ST.tasks[ST.ti];
    var res = null;
    try {
      var r = await aiGenerate(
        'Ты — тёплый, но честный проверяющий понимания. Вопрос про «известное»: «' + t.q + '».\n' +
        'Объяснение человека: «' + v + '».\n' +
        'Оцени 0-10, это НАСТОЯЩЕЕ понимание механизма или попугайство (повтор заученных слов / общие фразы / подмена «названием» без сути / ошибка-заблуждение). Настоящее понимание = объясняет причину и механизм своими словами. Определи verdict: "understood" (понял) или "parrot" (попугай/заблуждение).\n' +
        'Дай ПРАВИЛЬНЫЙ механизм в 1-2 простых фразах (обработать знание) и один короткий совет.\n' +
        'Верни СТРОГО JSON: {"score":ЧИСЛО,"verdict":"understood|parrot","truth":"правильный механизм простыми словами","tip":"короткий совет"}. По-русски, на «ты».',
        { max_tokens: 240, temperature: 0.3 });
      res = parseJson(r && r.content);
      if (res) { res.score = Math.max(0, Math.min(10, Math.round(Number(res.score)))); if (isNaN(res.score)) res = null; }
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { score: 7, verdict: 'understood', truth: '', tip: 'Связь с Фреди подвисла — раунд засчитан тебе.' };
    var pass = res.score >= 6;
    ST.marks.push(pass);
    if (pass) { ST.wins++; vibe(25); } else vibe([40, 60, 40]);
    track('vl_reviz', { score: res.score, verdict: res.verdict });
    if (!c) return;
    var und = res.verdict === 'understood';
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:4px 0 10px"><span class="vl-verdict ' + (und ? 'und' : 'par') + '">' + (und ? '✅ Понял — обработано' : '🦜 Попугай — на переработку') + '</span><div class="vl-hint" style="margin-top:6px">Понимание: <b style="color:#fff">' + res.score + '/10</b></div></div>' +
        '<div class="vl-card"><div class="vl-ctx">твоё объяснение</div><div class="vl-fb">' + nl2br(v) + '</div></div>' +
        (res.truth ? '<div class="vl-card"><div class="vl-ch">Как на самом деле</div><div class="vl-fb">' + nl2br(res.truth) + '</div></div>' : '') +
        (res.tip ? '<div class="vl-why">🔧 ' + esc(res.tip) + '</div>' : '') +
        '<button class="vl-primary" onclick="VSLUH.nextReviz()">' + (ST.ti + 1 < ST.tasks.length ? 'Следующий факт →' : 'Итог ревизии →') + '</button>' +
      '</div>';
  }
  function nextReviz() {
    ST.ti++;
    if (ST.ti < ST.tasks.length) { renderReviz(); return; }
    var passed = ST.wins >= 2;
    var p = loadProg();
    if (passed) { p.done[6] = true; saveProg(p); }
    track(passed ? 'vl_level_pass' : 'vl_level_fail', { level: 6, wins: ST.wins });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:18px 0 8px"><div class="vl-score">' + ST.wins + '<span style="font-size:1.1rem;color:#8b93a7">/' + ST.tasks.length + '</span></div><div class="vl-hint" style="margin-top:4px">понято по-настоящему · нужно 2</div></div>' +
        '<div style="text-align:center;margin-bottom:12px"><span class="vl-pill ' + (passed ? 'w' : 'l') + '">' + (passed ? '✅ Склад чище' : 'Ещё попугайничаем') + '</span></div>' +
        '<div class="vl-card"><div class="vl-fb">' + (passed ? 'Видишь? Даже «очевидное» часто оказывается заученным, а не понятым. Теперь ты умеешь ловить попугая в себе — и обрабатывать старое знание, а не таскать его мёртвым грузом.' : 'Это не провал — это открытие: многое из «я знаю» на деле попугайское. Прогони факты через объяснение ещё раз — своими словами, по механизму.') + '</div>' + lecLink('popugaj') + '</div>' +
        (passed ? '<button class="vl-primary" onclick="VSLUH.home()">К карте пути →</button>'
                : '<button class="vl-primary" onclick="VSLUH.play(6)">🔁 Ещё ревизия</button><button class="vl-secondary" onclick="VSLUH.home()">К карте пути</button>') +
      '</div>';
  }

  // ===== Уровень 7: экзамен =====
  function renderExamIntro() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('Экзамен. Возьми любой кусок текста, который тебе реально нужно понять — из учёбы, работы, книги, статьи. Или оставь пустым — дам свой.') +
        '<textarea class="vl-ta" id="vlSrc" style="min-height:120px" maxlength="900" placeholder="Вставь фрагмент (до 900 знаков)…"></textarea>' +
        '<button class="vl-primary" onclick="VSLUH.examStart()">Начать экзамен →</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('vlSrc'); if (el) el.focus(); }, 60);
  }
  function examStart() {
    var v = ((document.getElementById('vlSrc') || {}).value || '').trim();
    if (v.length < 20) { v = 'Привычка — это автоматизм, который мозг закрепляет ради экономии сил: чем чаще повторяется связка «сигнал — действие — результат», тем меньше нужно воли, чтобы её запустить.'; }
    ST.exam.src = v;
    renderExamForm();
  }
  function renderExamForm() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('Прогони текст через полный цикл — как думал бы вслух. Заполни три операции по этому фрагменту.') +
        '<div class="vl-card"><div class="vl-ctx">твой текст</div><div class="vl-txt">' + nl2br(ST.exam.src.slice(0, 900)) + '</div></div>' +
        '<div class="vl-exlab">1. Своими словами</div><textarea class="vl-ta" id="vlS1" placeholder="Перескажи смысл другими словами…"></textarea>' +
        '<div class="vl-exlab">2. Вопрос к тексту</div><textarea class="vl-ta" id="vlS2" style="min-height:60px" placeholder="Сильный вопрос: почему? откуда? что скрыто?…"></textarea>' +
        '<div class="vl-exlab">3. Главное одной фразой</div><textarea class="vl-ta" id="vlS3" style="min-height:60px" placeholder="Ядро — без чего рассыпется…"></textarea>' +
        '<button class="vl-primary" onclick="VSLUH.examSubmit()">Сдать Фреди 🎓</button>' +
      '</div>';
  }
  async function examSubmit() {
    if (ST.busy) return;
    var s1 = ((document.getElementById('vlS1') || {}).value || '').trim();
    var s2 = ((document.getElementById('vlS2') || {}).value || '').trim();
    var s3 = ((document.getElementById('vlS3') || {}).value || '').trim();
    if (s1.length < 4 || s2.length < 4 || s3.length < 3) { toast('Заполни все три операции', 'error'); return; }
    ST.exam.s1 = s1; ST.exam.s2 = s2; ST.exam.s3 = s3;
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="vl-wrap">' + lvlHead('') + spin('Фреди принимает экзамен…') + '</div>';
    var res = null;
    try {
      var r = await aiGenerate(
        'Ты — экзаменатор мышления. Человек обработал фрагмент тремя операциями. Фрагмент: «' + ST.exam.src.slice(0, 900) + '».\n' +
        'СВОИМИ СЛОВАМИ: «' + s1 + '». ВОПРОС: «' + s2 + '». ГЛАВНОЕ: «' + s3 + '».\n' +
        'Оцени каждую операцию 0-10: paraphrase (другими словами, без искажений), question (вскрывает основание/связь, не пересказ), main (настоящее ядро, не деталь). Найди САМУЮ СЛАБУЮ (weakest: "paraphrase"|"question"|"main") и дай короткий совет по ней.\n' +
        'Верни СТРОГО JSON: {"paraphrase":ЧИСЛО,"question":ЧИСЛО,"main":ЧИСЛО,"weakest":"...","tip":"совет по слабой операции","praise":"одна тёплая фраза — что удалось"}. По-русски, на «ты».',
        { max_tokens: 260, temperature: 0.3 });
      res = parseJson(r && r.content);
      if (res) {
        ['paraphrase', 'question', 'main'].forEach(function (k) { res[k] = Math.max(0, Math.min(10, Math.round(Number(res[k])))); });
        if (isNaN(res.paraphrase) || isNaN(res.question) || isNaN(res.main)) res = null;
      }
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { paraphrase: 7, question: 7, main: 7, weakest: '', tip: '', praise: 'Экзамен принят — связь с Фреди подвисла, зачёт твой.' };
    renderExamResult(res);
  }
  var WEAK_LVL = { paraphrase: 3, question: 4, main: 5 };
  var WEAK_NAME = { paraphrase: 'Своими словами', question: 'Вопрос к тексту', main: 'Выделение главного' };
  function renderExamResult(res) {
    var total = res.paraphrase + res.question + res.main;
    var passed = total >= 18;
    var p = loadProg();
    if (passed) {
      p.done[7] = true;
      p.title = total >= 26 ? '💭 Мастер мысли' : '💭 Думающий';
      if (total > (p.best || 0)) p.best = total;
      saveProg(p);
    }
    track(passed ? 'vl_level_pass' : 'vl_level_fail', { level: 7, total: total });
    track('game_finish', { game: 'vsluh', total: total });
    var c = container(); if (!c) return;
    var weakLvl = WEAK_LVL[res.weakest] || 3;
    var mn0 = loadMin();
    c.innerHTML =
      '<div class="vl-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:14px 0 6px"><div class="vl-score">' + total + '<span style="font-size:1.1rem;color:#8b93a7">/30</span></div>' +
        '<div class="vl-hint">своими словами ' + res.paraphrase + ' · вопрос ' + res.question + ' · главное ' + res.main + ' · нужно 18</div>' +
        (mn0 && mn0.first && mn0.first.score != null ? '<div class="vl-hint" style="margin-top:4px">📸 Твоё фото «до» — первая минутка: <b style="color:#fff">' + mn0.first.score + '/10</b>. Сравни с сегодняшним.</div>' : '') + '</div>' +
        '<div style="text-align:center;margin-bottom:12px">' + (passed ? '<span class="vl-pill w">' + esc(p.title) + '</span>' : '<span class="vl-pill l">Доработаем слабое</span>') + '</div>' +
        (res.praise ? '<div class="vl-card"><div class="vl-ch">Что удалось</div><div class="vl-fb">' + nl2br(res.praise) + '</div></div>' : '') +
        (res.weakest ? '<div class="vl-why">🔧 Слабее всего — <b style="color:#c7d2fe">' + esc(WEAK_NAME[res.weakest] || '') + '</b>. ' + esc(res.tip || '') + '</div>' : '') +
        (passed
          ? '<div class="vl-card"><div class="vl-ch">Навык есть — теперь привычка</div><div class="vl-fb">Навык ты собрал. Дальше он должен стать <b>привычкой</b> — включаться сам, без напоминания. Правило простое: <b>каждый раз, читая или слушая важное, делай хотя бы одну операцию вслух</b> — пересказ, вопрос или «что главное». Неделя-другая — и мозг начнёт делать это без тебя.</div></div>' +
            '<div class="vl-row"><button class="vl-primary" onclick="VSLUH.play(7)">🔁 Ещё текст</button><button class="vl-secondary" onclick="VSLUH.home()">К карте пути</button></div>'
          : '<div class="vl-card"><div class="vl-fb">Не хватило совсем немного. Давай подтянем самую слабую операцию — и пересдашь.</div></div>' +
            '<div class="vl-row"><button class="vl-primary" onclick="VSLUH.play(' + weakLvl + ')">🔧 Потренировать слабое</button><button class="vl-secondary" onclick="VSLUH.play(7)">🔁 Пересдать</button></div>') +
        '<a class="vl-course" href="' + COURSE_URL + '" target="_blank" rel="noopener">🎓 Курс «Как думать: наладка ума перед учёбой»</a>' +
      '</div>';
  }

  // ===== «Минутка мышления»: одна задача в день, конвейер затухания =====
  // Такт 0 (первый раз) — «замер»: фото «до». Дальше по кругу:
  // «смотри» (Фреди делает всю петлю) → «доделай» (Фреди обрывается — продолжи)
  // → «сам» (вся петля своя). Разобранный пример + затухание по Свеллеру/Ренклю.
  function minButton() {
    var mn = loadMin();
    var doneToday = mn.lastDay === dayStr();
    var sub = doneToday
      ? '✓ на сегодня сделана · серия ' + mn.streak + ' ' + dayWord(mn.streak) + ' · можно ещё'
      : (mn.streak ? '🔥 серия ' + mn.streak + ' ' + dayWord(mn.streak) + ' — продолжи сегодня' : 'одна задача · 60 секунд · начни серию');
    return '<button class="vl-min" onclick="VSLUH.minutka()">⏱ Минутка мышления<span>' + esc(sub) + '</span></button>';
  }
  function dayWord(n) { n = n % 100; if (n >= 11 && n <= 14) return 'дней'; var d = n % 10; return d === 1 ? 'день' : (d >= 2 && d <= 4 ? 'дня' : 'дней'); }
  function minTact(mn) {
    if (mn.count === 0) return 'zamer';
    return ['smotri', 'dodelaj', 'sam', 'sprosi'][(mn.count - 1) % 4];
  }
  var MIN_TACT_LABEL = { zamer: '📸 замер — фото «до»', smotri: '👀 смотри, как Фреди', dodelaj: '🤝 доделай за Фреди', sam: '💪 сам, вся петля', sprosi: '❓ спроси текст' };
  function minHead(tact) {
    return '<div class="vl-top"><span>⏱ Минутка мышления</span><button class="vl-x" onclick="VSLUH.home()">✕ Выйти</button></div>' +
      '<div style="text-align:center"><span class="vl-tact">' + MIN_TACT_LABEL[tact] + '</span></div>';
  }
  function minutka() {
    injectCSS();
    var c = container(); if (!c) return;
    var mn = loadMin();
    var tact = minTact(mn);
    var t = MIN[mn.count % MIN.length];
    ST.min = { tact: tact, task: t };
    track('vl_min_start', { tact: tact, count: mn.count });
    if (tact === 'smotri') {
      // микропроверка чтения: что Фреди унёс — против «пролистал по диагонали»
      var others = shuffle(MIN.filter(function (x) { return x !== t; })).slice(0, 2);
      var stripD = function (s) { return s.replace(/^Уношу:\s*/, ''); };
      ST.min._opts = shuffle([{ d: stripD(t.sled.d), ok: 1 }].concat(others.map(function (x) { return { d: stripD(x.sled.d), ok: 0 }; })));
      c.innerHTML =
        '<div class="vl-wrap">' + minHead(tact) +
          '<p class="vl-sub">Сегодня — самый лёгкий такт: посмотри, как Фреди прогоняет петлю СЛЕД, и одним кликом отметь, что он унёс.</p>' +
          '<div class="vl-card"><div class="vl-ctx">' + esc(t.ctx) + '</div><div class="vl-txt">' + esc(t.text) + '</div>' +
            aloudBlock(t.ctx, [t.sled.s, t.sled.l, t.sled.e, t.sled.d].join('\n')) + '</div>' +
          '<div class="vl-hint" style="margin:0 2px 8px">Что Фреди унёс из этого текста?</div>' +
          ST.min._opts.map(function (o, i) { return '<button class="vl-choice" id="vlM' + i + '" onclick="VSLUH.minPick(' + i + ')">' + esc(o.d) + '</button>'; }).join('') +
          '<div id="vlMGo"></div>' +
        '</div>';
      return;
    }
    if (tact === 'sprosi') {
      c.innerHTML =
        '<div class="vl-wrap">' + minHead(tact) +
          '<p class="vl-sub">Сегодня тренируем двигатель мысли — <b style="color:#e7eaf0">вопрос</b>. Задай тексту один сильный вопрос: почему? откуда это? что скрыто? а если наоборот?</p>' +
          '<div class="vl-card"><div class="vl-ctx">' + esc(t.ctx) + '</div><div class="vl-txt">' + esc(t.text) + '</div></div>' +
          '<textarea class="vl-ta" id="vlIn" style="min-height:64px" placeholder="Твой вопрос к тексту…"></textarea>' +
          '<button class="vl-primary" onclick="VSLUH.minSubmit()">Спросить 🗣</button>' +
        '</div>';
      setTimeout(function () { var el = document.getElementById('vlIn'); if (el) el.focus(); }, 60);
      return;
    }
    if (tact === 'dodelaj') {
      c.innerHTML =
        '<div class="vl-wrap">' + minHead(tact) +
          '<p class="vl-sub">Фреди начал петлю и оборвался на середине. Доделай шаги <b style="color:#e7eaf0">Е</b> (почему это так?) и <b style="color:#e7eaf0">Д</b> (что уносишь, где применишь).</p>' +
          '<div class="vl-card"><div class="vl-ctx">' + esc(t.ctx) + '</div><div class="vl-txt">' + esc(t.text) + '</div>' +
            aloudBlock(t.ctx, t.sled.s + '\n' + t.sled.l + '\n…а дальше — продолжи за меня.') + '</div>' +
          '<textarea class="vl-ta" id="vlIn" placeholder="Е — почему это так?.. Д — что уношу и где применю…"></textarea>' +
          '<button class="vl-primary" onclick="VSLUH.minSubmit()">Доделать петлю 🗣</button>' +
        '</div>';
    } else {
      var zamer = tact === 'zamer';
      c.innerHTML =
        '<div class="vl-wrap">' + minHead(tact) +
          '<p class="vl-sub">' + (zamer
            ? 'Это <b style="color:#e7eaf0">фото «до»</b> — не урок и не оценка. Просто прочитай и напиши, что ты понял из текста, — как есть. Через пару недель сравним, как вырос.'
            : 'Вся петля твоя: <b style="color:#e7eaf0">С</b>топ → в<b style="color:#e7eaf0">Л</b>ожи в свои слова → <b style="color:#e7eaf0">Е</b>сть почему? → <b style="color:#e7eaf0">Д</b>остань и примени.') + '</p>' +
          '<div class="vl-card"><div class="vl-ctx">' + esc(t.ctx) + '</div><div class="vl-txt">' + esc(t.text) + '</div></div>' +
          '<textarea class="vl-ta" id="vlIn" style="min-height:96px" placeholder="' + (zamer ? 'Что ты понял из этого текста…' : 'Своими словами… почему это так… что уносишь и где применишь…') + '"></textarea>' +
          '<button class="vl-primary" onclick="VSLUH.minSubmit()">' + (zamer ? 'Сохранить фото «до» 📸' : 'Прогнать петлю 🗣') + '</button>' +
        '</div>';
    }
    setTimeout(function () { var el = document.getElementById('vlIn'); if (el) el.focus(); }, 60);
  }
  function minPick(i) {
    var opts = ST.min._opts || [];
    if (ST.min._picked) return; ST.min._picked = true;
    var hit = opts[i] && opts[i].ok === 1;
    for (var j = 0; j < opts.length; j++) {
      var b = document.getElementById('vlM' + j); if (!b) continue;
      b.disabled = true;
      b.className = 'vl-choice' + (opts[j].ok ? ' ok' : (j === i ? ' no' : ' dim'));
    }
    vibe(hit ? 20 : [40, 60, 40]);
    track('vl_min_pick', { hit: hit });
    var g = document.getElementById('vlMGo');
    if (g) g.innerHTML =
      '<div class="vl-why">' + (hit ? '✅ Точно — значит, читал, а не листал.' : '❌ Гляди шаг Д у Фреди — вот что он на самом деле унёс.') + '</div>' +
      '<div class="vl-soc">🏛 Задержись на пять секунд: где сегодня тебе встретится текст, к которому подойдёт этот же ход? Не отвечай мне — просто представь.</div>' +
      '<button class="vl-primary" onclick="VSLUH.minDone()">Забираю ход себе ✓</button>';
  }
  function minDone() {
    ST.min._picked = false;
    var mn = bumpMin(null);
    vibe(20);
    track('vl_min_done', { tact: 'smotri', streak: mn.streak });
    minFinish(null, null, mn);
  }
  async function minSubmit() {
    if (ST.busy) return;
    var v = ((document.getElementById('vlIn') || {}).value || '').trim();
    if (v.length < 6) { toast('Напиши хотя бы пару фраз', 'error'); return; }
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="vl-wrap">' + minHead(ST.min.tact) + spin('Фреди читает твою мысль…') + '</div>';
    var t = ST.min.task, tact = ST.min.tact, res = null;
    try {
      var prompt;
      if (tact === 'dodelaj') {
        prompt = 'Ты — тёплый тренер мышления, метод Сократа. Петля СЛЕД: Стоп → вложи в свои слова → есть почему? → достань и примени. Фреди начал петлю над текстом и оборвался, человек доделал шаги Е и Д.\n' +
          'Текст (' + t.ctx + '): «' + t.text + '».\nНачало Фреди: «' + t.sled.s + ' ' + t.sled.l + '».\nПродолжение человека: «' + v + '».\n' +
          'Оцени 0-10: есть ли настоящий механизм-«почему» (не пересказ) и живое применение к жизни.\n' +
          'Верни СТРОГО JSON: {"score":ЧИСЛО,"note":"одна тёплая фраза — что удалось/что не так","socratic":"один сократовский вопрос по этой теме, который заставит додумать глубже; без ответа","bridge":"одна фраза: где сегодня в жизни человеку пригодится этот ход"}. По-русски, на «ты».';
      } else if (tact === 'sprosi') {
        prompt = 'Ты — тёплый тренер мышления, метод Сократа. Человек учится задавать сильный вопрос к тексту.\n' +
          'Текст (' + t.ctx + '): «' + t.text + '».\nЕго вопрос: «' + v + '».\n' +
          'Оцени 0-10: вопрос вскрывает основание, скрытое допущение или связь (поверхностный вопрос или пересказ = низко).\n' +
          'Верни СТРОГО JSON: {"score":ЧИСЛО,"note":"одна фраза — чем вопрос силён или слаб","socratic":"твой встречный вопрос ещё глубже — как образец; без ответа","bridge":"одна фраза: где сегодня в жизни пригодится привычка так спрашивать"}. По-русски, на «ты».';
      } else {
        prompt = 'Ты — тёплый тренер мышления, метод Сократа. Петля СЛЕД: Стоп → вложи в свои слова → есть почему? → достань и примени. Человек прогнал текст через петлю' + (tact === 'zamer' ? ' (это его первый замер — фото «до», будь особенно бережен)' : '') + '.\n' +
          'Текст (' + t.ctx + '): «' + t.text + '».\nЕго ответ: «' + v + '».\n' +
          'Оцени 0-10: свои слова (не копия), есть ли «почему»-механизм, есть ли применение к жизни.\n' +
          'Верни СТРОГО JSON: {"score":ЧИСЛО,"note":"одна тёплая фраза — что удалось/что не так","socratic":"один сократовский вопрос по этой теме, который заставит додумать глубже; без ответа","bridge":"одна фраза: где сегодня в жизни человеку пригодится этот ход"}. По-русски, на «ты».';
      }
      var r = await aiGenerate(prompt, { max_tokens: 240, temperature: 0.35 });
      res = parseJson(r && r.content);
      if (res) { res.score = Math.max(0, Math.min(10, Math.round(Number(res.score)))); if (isNaN(res.score)) res = null; }
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { score: 7, note: 'Связь с Фреди подвисла — минутка засчитана.', socratic: '', bridge: '' };
    var mn = bumpMin(res.score);
    vibe(25);
    track('vl_min_done', { tact: tact, score: res.score, streak: mn.streak });
    minFinish(res, v, mn);
  }
  function minFinish(res, v, mn) {
    var c = container(); if (!c) return;
    var progLine = '';
    if (res && mn.first && mn.hist && mn.hist.length >= 5 && mn.first.score != null) {
      progLine = '<div class="vl-hint" style="text-align:center;margin-top:8px">📈 Первая минутка: <b style="color:#fff">' + mn.first.score + '/10</b> → сегодня: <b style="color:#fff">' + res.score + '/10</b></div>';
    }
    var zamer = ST.min.tact === 'zamer';
    var enough = (mn.todayN || 1) >= 2;
    c.innerHTML =
      '<div class="vl-wrap">' + minHead(ST.min.tact) +
        '<div style="text-align:center;margin:10px 0 8px"><span class="vl-pill w">' + (zamer ? '📸 Фото «до» сохранено' : '✓ Минутка сделана') + '</span>' +
          '<div class="vl-hint" style="margin-top:6px">🔥 Серия: <b style="color:#fff">' + mn.streak + ' ' + dayWord(mn.streak) + '</b>' + (res && !zamer ? ' · оценка <b style="color:#fff">' + res.score + '/10</b>' : '') + '</div>' + progLine + '</div>' +
        (v ? '<div class="vl-card"><div class="vl-ctx">твоя мысль</div><div class="vl-fb">' + nl2br(v) + '</div></div>' : '') +
        (res && res.note && !zamer ? '<div class="vl-why">💬 ' + esc(res.note) + '</div>' : '') +
        (res && res.socratic && !zamer ? '<div class="vl-soc">🏛 Вопрос Сократа: ' + esc(res.socratic) + '<br><span style="font-size:.82rem;opacity:.75">Не отвечай мне — додумай про себя, по дороге.</span></div>' : '') +
        (res && res.bridge ? '<div class="vl-bridge">🌉 Мостик в жизнь: ' + esc(res.bridge) + '</div>' : '') +
        (zamer ? '<div class="vl-card"><div class="vl-fb">Это не оценка — просто точка отсчёта: в конце пути сравним и увидим рост. С завтрашнего дня — по одной минутке: сначала смотришь, как делает Фреди, потом доделываешь за ним, потом сам. Так петля станет привычкой — незаметно.' +
          '<br><br>А пока загляни в <b>«Попугай или понял?»</b>' + (res && res.score >= 8 ? ' — с твоим стартом начни прямо с него' : '') + ': проверь, понимаешь ли ты то, что «знаешь» со школы. Он открыт сразу.</div>' +
          '<button class="vl-secondary" style="margin-top:12px" onclick="VSLUH.play(6)">🦜 Попугай или понял? →</button></div>' : '') +
        '<div class="vl-row"><button class="vl-primary" onclick="VSLUH.home()">Готово ✓</button>' + (enough ? '' : '<button class="vl-secondary" onclick="VSLUH.minutka()">Ещё минутку</button>') + '</div>' +
        (enough ? '<div class="vl-hint" style="text-align:center;margin-top:8px">На сегодня достаточно — лучше по одной, но каждый день. Завтра будет новый такт.</div>' : '') +
      '</div>';
  }

  window.VSLUH = {
    home: home, play: play,
    pickRecog: pickRecog, pickFlaw: pickFlaw, nextTask: nextTask,
    submitDo: submitDo, nextDo: nextDo,
    submitReviz: submitReviz, nextReviz: nextReviz,
    examStart: examStart, examSubmit: examSubmit,
    minutka: minutka, minSubmit: minSubmit, minDone: minDone, minPick: minPick,
    quitLevel: quitLevel, getState: function () { return ST; }
  };
  window.showVsluhGame = home;
})();
