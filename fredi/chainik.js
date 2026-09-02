// ============================================================
// chainik.js — игра «Чайник Рассела» — тренажёр интеллектуальной
// честности по Бертрану Расселу.
//
// Лестница из 6 уровней, 3 акта (глаз → весы → практика):
// сначала видеть, где лежит бремя доказательства и скрытые
// допущения, потом взвешивать веру по доказательствам и узнавать
// декалог Рассела в жизни, потом — честный разбор утверждений
// с ИИ-оценкой. Финал — разбор собственного убеждения.
// Бесплатно. Связана с курсом «Бертран Рассел: ясность мышления».
// Экспорт: window.showChainikGame, window.CHAINIK
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

  var SITE = 'https://meysternlp.ru';
  var COURSE_URL = SITE + '/blog/lektorij/bertran-rassel/';
  var LEC = {
    chainik:  { t: 'Чайник Рассела и интеллектуальная честность', u: SITE + '/blog/lekciya-rassel-4-chajnik-i-chestnost.html' },
    skepsis:  { t: 'Скептицизм без паралича', u: SITE + '/blog/lekciya-rassel-5-skepticizm-bez-paralicha.html' },
    dekalog:  { t: 'Декалог Рассела: десять заповедей ясного ума', u: SITE + '/blog/lekciya-rassel-9-dekalog.html' }
  };

  // Суть чайника: если утверждение нельзя опровергнуть, это не делает его истинным —
  // бремя доказательства лежит на том, кто утверждает.
  var TEAPOT = 'Между Землёй и Марсом летает фарфоровый чайник — слишком маленький, чтобы его увидеть в телескоп. Опровергни! Не можешь? Значит… ничего не значит: бремя доказательства — на том, кто утверждает.';

  // ===== Уровень 1: «Чей чайник?» — честная и нечестная реакция на утверждение
  var PAIRS = [
    { claim: '«Этот браслет выравнивает энергетику организма. Наука пока не может этого опровергнуть!»',
      good: 'Не может опровергнуть — не значит «правда». Ты утверждаешь — тебе и показывать доказательства.',
      bad: 'Ну, раз не опровергли — что-то в этом, наверное, есть. Купить, что ли…',
      why: 'Классический чайник: невозможность опровергнуть выдаётся за довод «за». Бремя доказательства всегда на утверждающем — иначе пришлось бы верить в бесконечность неопровержимых чайников.' },
    { claim: '«Наш новый метод лечит мигрень. Докажите, что это не так!»',
      good: 'Наоборот: вы заявили эффект — вам и предъявлять исследования. Моё «не верю по умолчанию» доказательств не требует.',
      bad: 'Хм, у меня нет исследований против… Придётся признать, что метод работает.',
      why: 'Перекладывание бремени — любимый трюк продавцов чудес. Отсутствие опровержения у слушателя — не подтверждение: по умолчанию честная позиция — «не доказано».' },
    { claim: '«Все успешные люди встают в пять утра. Хочешь успеха — вставай в пять!»',
      good: 'Сильное обобщение. Сколько успешных встаёт позже? И не перепутаны ли причина и следствие?',
      bad: 'Звучит мотивирующе, спорить не буду — заведу будильник.',
      why: 'Честная реакция — запросить основание обобщения, а не примерить его на веру. «Звучит вдохновляюще» — не категория доказательства.' },
    { claim: '«Никто ещё не доказал, что телепатии нет. Значит, закрывать тему рано!»',
      good: 'Тему закрывает не «доказательство отсутствия», а столетие проверок без единого надёжного подтверждения.',
      bad: 'Логично: раз не доказали отсутствие — надо допускать, что она есть, пятьдесят на пятьдесят.',
      why: 'После множества честных проверок с нулевым результатом вероятности не «пятьдесят на пятьдесят»: отсутствие подтверждений там, где они обязаны были найтись, — само по себе сильное свидетельство против.' },
    { claim: '«Я этому эксперту не верю: он наверняка проплачен».',
      good: 'Подозрение — не довод. Есть данные о конфликте интересов — покажи; нет — разбирай его аргументы по существу.',
      bad: 'Верно мыслишь: все они проплачены, так что можно никого не слушать.',
      why: 'Скепсис — это тоже утверждение, и у него тоже есть бремя доказательства. «Наверняка проплачен» без фактов — не критическое мышление, а его имитация.' },
    { claim: '«У бабушки заболела спина после прививки — вот и делайте выводы про прививки».',
      good: 'Один случай «после» не значит «из-за». Что говорят данные по миллионам привитых в сравнении с непривитыми?',
      bad: 'Случай реальный, живой человек — против такого не поспоришь.',
      why: 'Личная история трогает, но доказательной силы почти не имеет: «после этого» не равно «вследствие этого». Честный ответ — спросить про сравнение больших групп.' }
  ];

  // ===== Уровень 2: «Скрытое допущение» — что незаметно протащили в утверждение
  var HIDDEN = [
    { claim: '«Ты опять споришь с начальником? Когда ты уже научишься нормально работать?»',
      opts: [
        { t: 'Спорить с начальником = работать ненормально', k: 'ok' },
        { t: 'Начальник всегда прав по должности', k: 'no' },
        { t: 'Говорящий желает собеседнику зла', k: 'no' },
        { t: 'Работа не терпит эмоций', k: 'no' }
      ],
      why: 'Вопрос «когда научишься» уже содержит вердикт: несогласие приравнено к плохой работе. Пока допущение не вытащено на свет, спор идёт на чужом поле.' },
    { claim: '«Естественное — значит безопасное: это же природа!»',
      opts: [
        { t: 'Всё природное безвредно для человека', k: 'ok' },
        { t: 'Химия всегда опасна', k: 'no' },
        { t: 'Природу нельзя изучать', k: 'no' },
        { t: 'Безопасность нельзя проверить', k: 'no' }
      ],
      why: 'Спрятана посылка «природное = безвредное». Мухомор, ртуть и вирусы — тоже природа. Безопасность определяется проверкой, а не происхождением.' },
    { claim: '«Раз ты не можешь объяснить, откуда взялась Вселенная, — значит, моё объяснение верно».',
      opts: [
        { t: 'Из двух объяснений одно обязано быть верным, и это моё', k: 'ok' },
        { t: 'Вселенная должна иметь объяснение', k: 'no' },
        { t: 'Наука знает всё', k: 'no' },
        { t: 'Собеседник обязан быть экспертом', k: 'no' }
      ],
      why: 'Ложная дилемма в основании: будто на столе только два варианта, и провал одного автоматически подтверждает другой. «Не знаю» — законный третий ответ, у каждого объяснения своё бремя доказательства.' },
    { claim: '«Опрос в моём канале показал: девяносто процентов людей поддерживают моё мнение».',
      opts: [
        { t: 'Подписчики канала = «люди вообще»', k: 'ok' },
        { t: 'Опросы всегда врут', k: 'no' },
        { t: 'Мнение большинства истинно', k: 'no' },
        { t: 'Проценты нельзя считать по опросам', k: 'no' }
      ],
      why: 'Скрытое допущение — что аудитория, собравшаяся вокруг автора, представляет всех. Выборка из согласных доказывает только то, что согласные согласны.' },
    { claim: '«Он уже дважды ошибался в прогнозах — значит, и сейчас ошибается».',
      opts: [
        { t: 'Ошибавшийся раньше ошибается всегда', k: 'ok' },
        { t: 'Прогнозы в принципе невозможны', k: 'no' },
        { t: 'Ошибки надо наказывать', k: 'no' },
        { t: 'Прошлое не связано с настоящим', k: 'no' }
      ],
      why: 'Прошлые ошибки — повод внимательнее проверять, но не приговор текущему аргументу: он верен или неверен сам по себе. Разбирать надо довод, а не досье докладчика.' }
  ];

  // ===== Уровень 3: «Весы веры» — степень уверенности по доказательствам
  var SCALES = [
    { ev: 'Утверждение: «Этот препарат снижает давление». Есть десятки независимых рандомизированных испытаний на тысячах пациентов, эффект стабильно повторяется, механизм понятен.',
      right: 3,
      why: 'Много независимых сильных проверок с повторяющимся результатом — это верхняя полка уверенности. Абсолютной истины наука не выдаёт, но действовать надо как при «практически точно».' },
    { ev: 'Утверждение: «Кофе защищает от этой болезни». Есть несколько наблюдательных исследований со слабой связью; экспериментов нет; авторы сами пишут «нужны дальнейшие проверки».',
      right: 1,
      why: 'Наблюдательная связь без экспериментов — это «может быть»: пьющие кофе могут отличаться от непьющих десятком других привычек. Честная полка — «слабое может быть», не заголовок «кофе спасает».' },
    { ev: 'Утверждение: «Через десять лет этой профессии не будет». Громкие прогнозы экспертов расходятся в разы, данных о будущем по определению нет.',
      right: 0,
      why: 'О будущем сложных систем честнее всего «не знаю»: прогнозы экспертов о таких вещах систематически проваливаются. Уверенные заявления тут — жанр шоу, а не знания.' },
    { ev: 'Утверждение: «Разбитое зеркало приносит семь лет несчастий». Механизм не предложен, проверки отсутствуют, а похожие приметы в разных культурах противоречат друг другу.',
      right: -2,
      why: 'Нет ни механизма, ни данных, а устройство утверждения такое же, как у чайника: неопровержимо и бессодержательно. Полка — «практически точно нет», и семь лет спокойствия.' },
    { ev: 'Утверждение: «Регулярная ходьба улучшает настроение». Много исследований разного качества согласно показывают умеренный эффект; механизмы правдоподобны; вреда не обнаружено.',
      right: 2,
      why: 'Согласные результаты умеренной силы — полка «скорее всего да». Не догма, но достаточное основание, чтобы ходить: цена ошибки мала, ожидаемая польза реальна.' }
  ];
  var SCALE_OPTS = [
    { v: 3,  t: 'Практически точно' },
    { v: 2,  t: 'Скорее всего да' },
    { v: 1,  t: 'Слабое «может быть»' },
    { v: 0,  t: 'Честное «не знаю»' },
    { v: -2, t: 'Практически точно нет' }
  ];

  // ===== Уровень 4: «Декалог в деле» — какую заповедь нарушает герой
  var DEKALOG = [
    { n: 1,  t: 'Не чувствуй абсолютной уверенности ни в чём' },
    { n: 4,  t: 'Побеждай аргументами, а не авторитетом' },
    { n: 5,  t: 'Не испытывай почтения к авторитетам: найдутся противоположные' },
    { n: 8,  t: 'Разумное несогласие ценнее пассивного согласия' },
    { n: 9,  t: 'Будь скрупулёзно правдив, даже когда правда неудобна' },
    { n: 10, t: 'Не завидуй счастью живущих в раю для дураков' }
  ];
  var DCASES = [
    { story: 'На планёрке начальник закрывает спор: «Я двадцать лет в отрасли — делаем, как я сказал». Возражения по существу так и не разобраны.',
      okn: 4,
      why: 'Стаж — не аргумент: побеждать положено доводами, а не погонами. Двадцать лет опыта могут стоять и за правотой, и за двадцатилетней привычкой ошибаться.' },
    { story: 'Исследователь получает результат, который рушит его же гипотезу, — и убирает «неудачный» замер из отчёта: «выброс, наверное».',
      okn: 9,
      why: 'Скрупулёзная правдивость — это правдивость именно тогда, когда правда бьёт по своим. Неудобный замер — самая ценная часть данных.' },
    { story: 'В чате все дружно хвалят план. Один участник видит слабое место, но молчит: «зачем портить настроение, все же согласны».',
      okn: 8,
      why: 'Пассивное согласие комфортно и бесплодно: цену имеет именно разумное несогласие. Промолчавший про слабое место соавтор будущего провала.' },
    { story: '«Этот метод воспитания правильный на сто процентов, тут не о чем спорить и нечего проверять», — говорит автор книги.',
      okn: 1,
      why: 'Стопроцентная уверенность — верный признак, что взвешивание закончилось, не начавшись. Рассел начинал декалог именно с этого: абсолютной уверенности не заслуживает ничто.' },
    { story: 'Зритель выбирает, кому верить: «Этот профессор — из великого университета, значит, прав он, а не его оппоненты».',
      okn: 5,
      why: 'На каждого титулованного эксперта найдётся титулованный несогласный — почтение к регалиям ничего не решает. Сравнивать надо доказательства сторон, а не таблички на дверях.' }
  ];

  // ===== Уровень 5: дуэль — честный разбор утверждения (ИИ-оценка)
  var DUEL_CLAIMS = [
    { id: 'd1', claim: 'Учёные скрывают дешёвое лекарство от всех болезней — иначе фармкомпании разорятся.',
      hint: 'бремя доказательства · сколько людей должно молчать · что было бы, будь это правдой' },
    { id: 'd2', claim: 'Полнолуние влияет на поведение людей: в полнолуние больше происшествий и хуже спится.',
      hint: 'проверяемо ли · что говорят большие данные · почему совпадения запоминаются' },
    { id: 'd3', claim: 'Наш курс гарантирует доход через месяц — тысячи отзывов довольных выпускников!',
      hint: 'кого не видно в отзывах · что такое выжившие · какие доказательства были бы честными' },
    { id: 'd4', claim: 'Детей нельзя хвалить — вырастут избалованными: так всегда говорила моя бабушка.',
      hint: 'источник утверждения · обобщение из одного опыта · что известно из исследований' },
    { id: 'd5', claim: 'Если разолью соль — обязательно поссорюсь: сколько раз проверено на себе!',
      hint: 'как работает память на совпадения · сколько раз соль просыпалась без ссор · чем проверить честно' }
  ];

  // ===== Карта уровней =====
  var LEVELS = [
    { n: 1, em: '🫖', t: 'Чей чайник?', d: 'Клики: выбери интеллектуально честную реакцию на утверждение', act: 1 },
    { n: 2, em: '🔍', t: 'Скрытое допущение', d: 'Клики: найди, что незаметно протащили в основание фразы', act: 1 },
    { n: 3, em: '⚖️', t: 'Весы веры', d: 'Клики: подбери степень уверенности под силу доказательств', act: 2 },
    { n: 4, em: '📜', t: 'Декалог в деле', d: 'Клики: какую заповедь Рассела нарушает герой сценария', act: 2 },
    { n: 5, em: '⚔️', t: 'Дуэль с чайником', d: 'Разбери сомнительное утверждение по-расселовски — Фреди оценит', act: 3 },
    { n: 6, em: '🎓', t: 'Своё убеждение', d: 'Экзамен: честный разбор собственного убеждения', act: 3 }
  ];
  var ACTS = { 1: 'Акт I · Глаз', 2: 'Акт II · Весы', 3: 'Акт III · Практика' };

  function loadProg() {
    try { var p = JSON.parse(localStorage.getItem('chainik_path') || 'null'); if (p && typeof p === 'object') return p; } catch (e) {}
    return { done: {}, best: 0, title: '' };
  }
  function saveProg(p) { try { localStorage.setItem('chainik_path', JSON.stringify(p)); } catch (e) {} }
  function maxUnlocked(p) { var m = 1; for (var i = 1; i <= 6; i++) { if (p.done[i]) m = i + 1; else break; } return Math.min(m, 6); }

  var ST = { screen: 'home', lvl: 0, ti: 0, tasks: [], score: 0, wins: 0, answered: false, marks: [], own: {}, busy: false };

  // ===== Стили =====
  function injectCSS() {
    if (document.getElementById('chainik-css')) return;
    var st = document.createElement('style'); st.id = 'chainik-css';
    st.textContent = [
      '.ch-wrap{max-width:640px;margin:0 auto;padding:18px 16px 96px;color:#e7eaf0;font-size:1rem;line-height:1.6}',
      '.ch-top{display:flex;justify-content:space-between;align-items:center;color:#8b93a7;font-size:.86rem;margin-bottom:14px}',
      '.ch-x{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:0}',
      '.ch-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:0 0 6px}',
      '.ch-sub{color:#aab2c4;margin:0 0 16px}',
      '.ch-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px;margin:0 0 12px}',
      '.ch-card b{color:#fff;font-weight:600}',
      '.ch-ch{font-weight:700;color:#fff;margin-bottom:8px}',
      '.ch-claim{background:rgba(167,139,250,.10);border:1px solid rgba(167,139,250,.4);border-radius:12px;padding:12px 14px;color:#ddd6fe;font-size:1rem;line-height:1.55;font-style:italic}',
      '.ch-choice{display:block;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);border-radius:13px;padding:13px 15px;margin:0 0 10px;color:#e7eaf0;font:inherit;font-size:.95rem;line-height:1.5;cursor:pointer;transition:.15s}',
      '.ch-choice:hover{border-color:rgba(167,139,250,.6)}',
      '.ch-choice:disabled{cursor:default;opacity:1}',
      '.ch-choice.ok{border-color:#a78bfa;background:rgba(167,139,250,.14)}',
      '.ch-choice.no{border-color:#f87171;background:rgba(248,113,113,.10);opacity:.85}',
      '.ch-choice.dim{opacity:.45}',
      '.ch-why{background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.3);border-radius:12px;padding:12px 14px;margin:2px 0 12px;font-size:.92rem;color:#e6e0fb;line-height:1.55}',
      '.ch-prog{display:flex;gap:5px;margin-bottom:14px}',
      '.ch-prog i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.14)}',
      '.ch-prog i.on{background:#a78bfa}',
      '.ch-prog i.hit{background:#34d399}',
      '.ch-prog i.miss{background:#f87171}',
      '.ch-node{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px 14px;margin:0 0 8px;color:#e7eaf0;font:inherit;cursor:pointer;transition:.15s}',
      '.ch-node:hover{border-color:rgba(167,139,250,.55)}',
      '.ch-node.lock{opacity:.45;cursor:default}',
      '.ch-node .nem{font-size:1.3rem;width:34px;text-align:center;flex-shrink:0}',
      '.ch-node .nt{font-weight:700;color:#fff;font-size:.97rem}',
      '.ch-node .nd{color:#8b93a7;font-size:.8rem;line-height:1.35}',
      '.ch-node .nst{margin-left:auto;flex-shrink:0;font-size:.95rem}',
      '.ch-node.next{border-color:rgba(167,139,250,.55);background:rgba(167,139,250,.08)}',
      '.ch-act{color:#8b93a7;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;margin:14px 2px 8px;font-weight:700}',
      '.ch-ta{width:100%;box-sizing:border-box;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;font:15px/1.5 inherit;padding:12px 13px;resize:vertical;min-height:72px}',
      '.ch-ta:focus{outline:none;border-color:#a78bfa}',
      '.ch-pill{display:inline-block;padding:6px 14px;border-radius:999px;font-weight:800;font-size:1.05rem}',
      '.ch-pill.w{background:rgba(52,211,153,.16);color:#6ee7b7}',
      '.ch-pill.l{background:rgba(248,113,113,.14);color:#fca5a5}',
      '.ch-primary{width:100%;margin-top:14px;padding:14px 16px;border:none;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font:700 1rem inherit;cursor:pointer}',
      '.ch-primary:disabled{opacity:.5;cursor:default}',
      '.ch-secondary{width:100%;margin-top:10px;padding:12px 16px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:transparent;color:#cdd4e2;font:600 .95rem inherit;cursor:pointer}',
      '.ch-hint{color:#8b93a7;font-size:.85rem;margin:6px 2px}',
      '.ch-score{font-size:2.6rem;font-weight:800;letter-spacing:-.03em;line-height:1;color:#fff}',
      '.ch-fb{color:#d7def0;line-height:1.6}',
      '.ch-row{display:flex;gap:10px;margin-top:14px}',
      '.ch-row>*{flex:1;margin-top:0}',
      '.ch-course{display:block;text-align:center;margin:12px 0 0;padding:11px;font-size:.9rem;color:#c4b5fd;text-decoration:none;background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.25);border-radius:12px}',
      '.ch-lec{display:inline-block;margin-top:9px;font-size:.85rem;color:#c4b5fd;text-decoration:none;border-bottom:1px solid rgba(196,181,253,.35)}',
      '.ch-spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:chspin .7s linear infinite;vertical-align:-3px;margin-right:6px}',
      '@keyframes chspin{to{transform:rotate(360deg)}}',
      '[data-theme="light"] .ch-wrap{color:#1d1d1f}',
      '[data-theme="light"] .ch-card,[data-theme="light"] .ch-node,[data-theme="light"] .ch-choice{background:#fff;border-color:rgba(0,0,0,.12);color:#1d1d1f}',
      '[data-theme="light"] .ch-card b,[data-theme="light"] .ch-ch,[data-theme="light"] .ch-score,[data-theme="light"] .ch-node .nt{color:#0b1220}',
      '[data-theme="light"] .ch-sub,[data-theme="light"] .ch-hint,[data-theme="light"] .ch-top,[data-theme="light"] .ch-node .nd{color:#5a6472}',
      '[data-theme="light"] .ch-ta{background:#f5f7fa;color:#0b1220;border-color:rgba(0,0,0,.15)}',
      '[data-theme="light"] .ch-claim{background:#f3efff;color:#5b21b6}',
      '[data-theme="light"] .ch-why{background:#f1edfc;color:#3f2d78}',
      '[data-theme="light"] .ch-fb{color:#333}',
      '[data-theme="light"] .ch-course,[data-theme="light"] .ch-lec{color:#6d28d9}',
      '@media(max-width:560px){.ch-wrap{padding:14px 12px 96px}.ch-h1{font-size:1.32rem}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ===== Дом: карта пути =====
  function home() {
    injectCSS();
    ST.screen = 'home';
    var c = container(); if (!c) return;
    var p = loadProg();
    var unlocked = maxUnlocked(p);
    var doneCount = Object.keys(p.done).length;
    var nodes = '', lastAct = 0;
    LEVELS.forEach(function (L) {
      if (L.act !== lastAct) { nodes += '<div class="ch-act">' + ACTS[L.act] + '</div>'; lastAct = L.act; }
      var done = !!p.done[L.n];
      var isNext = !done && L.n === unlocked;
      var locked = !done && L.n > unlocked;
      nodes += '<button class="ch-node' + (isNext ? ' next' : '') + (locked ? ' lock' : '') + '" onclick="' + (locked ? '' : 'CHAINIK.play(' + L.n + ')') + '">' +
        '<span class="nem">' + L.em + '</span>' +
        '<span><span class="nt">' + L.n + '. ' + esc(L.t) + '</span><br><span class="nd">' + esc(L.d) + '</span></span>' +
        '<span class="nst">' + (done ? '✅' : (isNext ? '▶' : '🔒')) + '</span>' +
      '</button>';
    });
    c.innerHTML =
      '<div class="ch-wrap">' +
        '<div class="ch-top"><button class="ch-x" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button><span>🫖 бесплатно</span></div>' +
        '<h1 class="ch-h1">🫖 Чайник Рассела</h1>' +
        '<p class="ch-sub">Тренажёр интеллектуальной честности по Бертрану Расселу: где лежит бремя доказательства, какие допущения протаскивают мимо тебя и сколько веры честно выдать утверждению. <b style="color:#e7eaf0">Ясная голова — это навык.</b></p>' +
        '<div class="ch-card"><div class="ch-ch">Знаменитый чайник</div>' +
          '<div class="ch-claim">' + esc(TEAPOT) + '</div>' +
          '<div class="ch-hint" style="margin-top:8px">6 уровней: от «чей чайник?» до честного разбора собственного убеждения. Ошибаться можно сколько угодно — оценку всегда заменяет лучшая.</div>' +
        '</div>' +
        (p.title ? '<div style="text-align:center;margin:0 0 10px"><span class="ch-pill w">' + esc(p.title) + '</span></div>' : '') +
        (doneCount ? '<div class="ch-hint" style="margin:0 0 8px">Пройдено уровней: ' + doneCount + '/6</div>' : '') +
        nodes +
        '<a class="ch-course" href="' + COURSE_URL + '" target="_blank" rel="noopener">🎓 Теория — курс «Бертран Рассел: ясность мышления»</a>' +
      '</div>';
    track('game_open', { game: 'chainik', unlocked: unlocked });
  }

  function play(n) {
    var p = loadProg();
    if (n > maxUnlocked(p)) { toast('Сначала пройди предыдущий уровень', 'info'); return; }
    ST.lvl = n; ST.ti = 0; ST.score = 0; ST.wins = 0; ST.marks = []; ST.answered = false;
    track('ch_level_start', { level: n });
    if (n === 1) { ST.tasks = shuffle(PAIRS); renderPair(); }
    else if (n === 2) { ST.tasks = shuffle(HIDDEN); renderQuad(); }
    else if (n === 3) { ST.tasks = shuffle(SCALES); renderScale(); }
    else if (n === 4) { ST.tasks = shuffle(DCASES); renderDekalog(); }
    else if (n === 5) { ST.tasks = shuffle(DUEL_CLAIMS).slice(0, 3); renderDuel(); }
    else if (n === 6) { ST.own = {}; renderOwnBelief(); }
  }

  function progBar() {
    var h = '<div class="ch-prog">';
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
    return '<div class="ch-top"><span>' + L.em + ' Уровень ' + L.n + ' · ' + esc(L.t) + '</span><button class="ch-x" onclick="CHAINIK.quitLevel()">✕ Выйти</button></div>' +
      (sub ? '<p class="ch-sub" style="margin-bottom:12px">' + sub + '</p>' : '');
  }
  function quitLevel() {
    if (ST.ti > 0 && !confirm('Выйти? Прогресс уровня не сохранится.')) return;
    home();
  }
  function lecLink(key) { var l = LEC[key]; return '<a class="ch-lec" href="' + l.u + '" target="_blank" rel="noopener">📖 Лекция: ' + esc(l.t) + ' →</a>'; }

  // ===== Уровень 1: честная реакция =====
  function renderPair() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var opts = shuffle([{ t: t.good, ok: true }, { t: t.bad, ok: false }]);
    ST._opts = opts;
    c.innerHTML =
      '<div class="ch-wrap">' + lvlHead('Тебе говорят это в лицо. Какая реакция интеллектуально честная?') + progBar() +
        '<div class="ch-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:6px">Утверждение</div><div class="ch-claim">' + esc(t.claim) + '</div></div>' +
        opts.map(function (o, i) { return '<button class="ch-choice" id="chC' + i + '" onclick="CHAINIK.pickPair(' + i + ')">' + esc(o.t) + '</button>'; }).join('') +
        '<div id="chWhy"></div>' +
      '</div>';
  }
  function pickPair(i) {
    if (ST.answered) return;
    ST.answered = true;
    var t = ST.tasks[ST.ti];
    var hit = !!ST._opts[i].ok;
    ST.marks.push(hit);
    if (hit) { ST.score++; vibe(20); } else { vibe([40, 60, 40]); }
    for (var j = 0; j < ST._opts.length; j++) {
      var b = document.getElementById('chC' + j); if (!b) continue;
      b.disabled = true;
      b.className = 'ch-choice' + (ST._opts[j].ok ? ' ok' : (j === i ? ' no' : ' dim'));
    }
    var w = document.getElementById('chWhy');
    if (w) w.innerHTML = '<div class="ch-why">' + (hit ? '✅ Точно. ' : '❌ Мимо. ') + esc(t.why) + '</div>' +
      '<button class="ch-primary" onclick="CHAINIK.nextTask()">' + (ST.ti + 1 < ST.tasks.length ? 'Дальше →' : 'Итог уровня →') + '</button>';
  }

  // ===== Уровень 2: скрытое допущение =====
  function renderQuad() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var opts = shuffle(t.opts);
    ST._opts = opts;
    c.innerHTML =
      '<div class="ch-wrap">' + lvlHead('В основании фразы спрятано допущение — недоказанное, но поданное как очевидность. Найди его.') + progBar() +
        '<div class="ch-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:6px">Фраза</div><div class="ch-claim">' + esc(t.claim) + '</div></div>' +
        opts.map(function (o, i) { return '<button class="ch-choice" id="chC' + i + '" onclick="CHAINIK.pickQuad(' + i + ')">' + esc(o.t) + '</button>'; }).join('') +
        '<div id="chWhy"></div>' +
      '</div>';
  }
  function pickQuad(i) {
    if (ST.answered) return;
    ST.answered = true;
    var t = ST.tasks[ST.ti];
    var hit = ST._opts[i].k === 'ok';
    ST.marks.push(hit);
    if (hit) { ST.score++; vibe(20); } else { vibe([40, 60, 40]); }
    for (var j = 0; j < ST._opts.length; j++) {
      var b = document.getElementById('chC' + j); if (!b) continue;
      b.disabled = true;
      b.className = 'ch-choice' + (ST._opts[j].k === 'ok' ? ' ok' : (j === i ? ' no' : ' dim'));
    }
    var w = document.getElementById('chWhy');
    if (w) w.innerHTML = '<div class="ch-why">' + (hit ? '✅ Точно. ' : '❌ Мимо. ') + esc(t.why) + '</div>' +
      '<button class="ch-primary" onclick="CHAINIK.nextTask()">' + (ST.ti + 1 < ST.tasks.length ? 'Дальше →' : 'Итог уровня →') + '</button>';
  }

  // ===== Уровень 3: весы веры =====
  function renderScale() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    ST._opts = SCALE_OPTS;
    c.innerHTML =
      '<div class="ch-wrap">' + lvlHead('Рассел: степень веры должна соответствовать силе доказательств. Взвесь.') + progBar() +
        '<div class="ch-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:6px">Утверждение и доказательства</div><div class="ch-fb">' + esc(t.ev) + '</div></div>' +
        SCALE_OPTS.map(function (o, i) { return '<button class="ch-choice" id="chC' + i + '" onclick="CHAINIK.pickScale(' + i + ')">⚖️ ' + esc(o.t) + '</button>'; }).join('') +
        '<div id="chWhy"></div>' +
      '</div>';
  }
  function pickScale(i) {
    if (ST.answered) return;
    ST.answered = true;
    var t = ST.tasks[ST.ti];
    var pickedV = SCALE_OPTS[i].v;
    var hit = pickedV === t.right;
    var near = !hit && Math.abs(pickedV - t.right) === 1;
    ST.marks.push(hit || near);
    if (hit || near) { ST.score++; vibe(20); } else { vibe([40, 60, 40]); }
    for (var j = 0; j < SCALE_OPTS.length; j++) {
      var b = document.getElementById('chC' + j); if (!b) continue;
      b.disabled = true;
      b.className = 'ch-choice' + (SCALE_OPTS[j].v === t.right ? ' ok' : (j === i ? ' no' : ' dim'));
    }
    var verdict = hit ? '✅ Точно взвешено. ' : (near ? '🟡 Соседняя полка — засчитано. ' : '❌ Весы сбиты. ');
    var w = document.getElementById('chWhy');
    if (w) w.innerHTML = '<div class="ch-why">' + verdict + esc(t.why) + '</div>' +
      '<button class="ch-primary" onclick="CHAINIK.nextTask()">' + (ST.ti + 1 < ST.tasks.length ? 'Дальше →' : 'Итог уровня →') + '</button>';
  }

  // ===== Уровень 4: декалог =====
  function renderDekalog() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    var right = DEKALOG.filter(function (d) { return d.n === t.okn; })[0];
    var wrong = shuffle(DEKALOG.filter(function (d) { return d.n !== t.okn; })).slice(0, 3);
    var opts = shuffle([{ t: right.t, ok: true }].concat(wrong.map(function (d) { return { t: d.t, ok: false }; })));
    ST._opts = opts;
    c.innerHTML =
      '<div class="ch-wrap">' + lvlHead('Декалог Рассела — десять заповедей ясного ума. Какую из них нарушает герой?') + progBar() +
        '<div class="ch-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:6px">Сценарий</div><div class="ch-fb">' + esc(t.story) + '</div></div>' +
        opts.map(function (o, i) { return '<button class="ch-choice" id="chC' + i + '" onclick="CHAINIK.pickDekalog(' + i + ')">📜 ' + esc(o.t) + '</button>'; }).join('') +
        '<div id="chWhy"></div>' +
      '</div>';
  }
  function pickDekalog(i) {
    if (ST.answered) return;
    ST.answered = true;
    var t = ST.tasks[ST.ti];
    var hit = !!ST._opts[i].ok;
    ST.marks.push(hit);
    if (hit) { ST.score++; vibe(20); } else { vibe([40, 60, 40]); }
    for (var j = 0; j < ST._opts.length; j++) {
      var b = document.getElementById('chC' + j); if (!b) continue;
      b.disabled = true;
      b.className = 'ch-choice' + (ST._opts[j].ok ? ' ok' : (j === i ? ' no' : ' dim'));
    }
    var w = document.getElementById('chWhy');
    if (w) w.innerHTML = '<div class="ch-why">' + (hit ? '✅ Точно. ' : '❌ Мимо. ') + esc(t.why) + '</div>' +
      '<button class="ch-primary" onclick="CHAINIK.nextTask()">' + (ST.ti + 1 < ST.tasks.length ? 'Дальше →' : 'Итог уровня →') + '</button>';
  }

  function nextTask() {
    ST.ti++;
    if (ST.ti < ST.tasks.length) {
      if (ST.lvl === 1) renderPair();
      else if (ST.lvl === 2) renderQuad();
      else if (ST.lvl === 3) renderScale();
      else renderDekalog();
      return;
    }
    finishRecog();
  }
  function finishRecog() {
    var need = ST.lvl === 1 ? 5 : 4;
    var total = ST.tasks.length;
    var passed = ST.score >= need;
    var p = loadProg();
    if (passed) { p.done[ST.lvl] = true; saveProg(p); }
    track(passed ? 'ch_level_pass' : 'ch_level_fail', { level: ST.lvl, score: ST.score });
    var c = container(); if (!c) return;
    var lecKey = ST.lvl === 4 ? 'dekalog' : (ST.lvl === 3 ? 'skepsis' : 'chainik');
    var praise = { 1: 'Глаз поставлен: бремя доказательства больше не перекладывают на тебя незаметно.',
                   2: 'Ты видишь скрытые допущения — половина споров закончится, не начавшись.',
                   3: 'Весы работают: вера дозируется по доказательствам, а не по громкости.',
                   4: 'Декалог узнаётся в жизни — осталось применять к себе.' }[ST.lvl];
    var retry = { 1: 'Нормально: чайники хитрее, чем кажутся. Задачи перемешаются.',
                  2: 'Допущения прячутся глубоко — ещё заход, и глаз настроится.',
                  3: 'Калибровка весов требует повторов — попробуй ещё.',
                  4: 'Перечитай сценарии медленно: кто и чем здесь побеждает?' }[ST.lvl];
    c.innerHTML =
      '<div class="ch-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:18px 0 8px"><div class="ch-score">' + ST.score + '<span style="font-size:1.1rem;color:#8b93a7">/' + total + '</span></div><div class="ch-hint" style="margin-top:4px">нужно ' + need + ' из ' + total + '</div></div>' +
        '<div style="text-align:center;margin-bottom:12px"><span class="ch-pill ' + (passed ? 'w' : 'l') + '">' + (passed ? '✅ Уровень пройден' : 'Пока не хватило') + '</span></div>' +
        '<div class="ch-card"><div class="ch-fb">' + (passed ? praise : retry) + '</div>' + lecLink(lecKey) + '</div>' +
        (passed ? '<button class="ch-primary" onclick="CHAINIK.home()">К карте пути →</button>'
                : '<button class="ch-primary" onclick="CHAINIK.play(' + ST.lvl + ')">🔁 Ещё попытка</button><button class="ch-secondary" onclick="CHAINIK.home()">К карте пути</button>') +
      '</div>';
  }

  // ===== Уровень 5: дуэль с чайником (ИИ) =====
  function parseJson(txt) {
    if (!txt) return null;
    var m = String(txt).match(/\{[\s\S]*\}/); if (!m) return null;
    try { return JSON.parse(m[0]); } catch (e) { return null; }
  }
  function renderDuel() {
    ST.answered = false;
    var c = container(); if (!c) return;
    var t = ST.tasks[ST.ti];
    c.innerHTML =
      '<div class="ch-wrap">' + lvlHead('Разбери утверждение по-расселовски: на ком бремя доказательства, какие доказательства были бы честными, какова твоя взвешенная позиция. Нужно 2 победы из 3.') + progBar() +
        '<div class="ch-hint" style="margin:0 0 8px;text-align:center">Побед: ' + ST.wins + ' из ' + ST.ti + ' · нужно 2 из 3</div>' +
        '<div class="ch-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:6px">Утверждение</div><div class="ch-claim">' + esc(t.claim) + '</div>' +
        '<div class="ch-hint" style="margin-top:8px">Подсказки: ' + esc(t.hint) + '</div></div>' +
        '<textarea class="ch-ta" id="chIn" style="min-height:110px" placeholder="Мой разбор: кто должен доказывать, что бы меня убедило, моя степень уверенности и почему…"></textarea>' +
        '<button class="ch-primary" onclick="CHAINIK.submitDuel()">Разобрал 🫖</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('chIn'); if (el) el.focus(); }, 60);
  }
  async function submitDuel() {
    if (ST.busy) return;
    var v = ((document.getElementById('chIn') || {}).value || '').trim();
    if (v.length < 25) { toast('Разбери подробнее: бремя, доказательства, вывод', 'error'); return; }
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="ch-wrap" style="text-align:center;padding-top:60px"><div class="ch-score"><span class="ch-spin"></span></div><p class="ch-sub" style="margin-top:16px">Фреди сверяет разбор с Расселом…</p></div>';
    var t = ST.tasks[ST.ti];
    var res = null;
    try {
      var r = await aiGenerate(
        'Ты — тренер интеллектуальной честности по Бертрану Расселу (аргумент «чайник Рассела»). Утверждение: «' + t.claim + '».\n' +
        'Разбор игрока: «' + v + '».\n' +
        'Оцени разбор 0–10 по критериям: (1) верно указано, на ком бремя доказательства; (2) названо, какие доказательства были бы честными, или скрытое допущение / известная ловушка (выжившие, после≠вследствие, апелляция к незнанию); (3) вывод — взвешенная степень уверенности, а не «всё ложь» и не «всё возможно»; (4) без оскорблений и высокомерия. Голое «это бред» без разбора = низкая оценка; вежливый точный разбор = высокая.\n' +
        'Верни СТРОГО один JSON: {"score":ЧИСЛО,"note":"одна фраза — что в разборе сильно","tip":"одна фраза — чего не хватило до Рассела"}. По-русски, на «ты».',
        { max_tokens: 220, temperature: 0.3 });
      res = parseJson(r && r.content);
      if (res) { res.score = Math.max(0, Math.min(10, Math.round(Number(res.score)))); if (isNaN(res.score)) res = null; }
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { score: 7, note: 'Связь с Фреди подвисла — раунд засчитан тебе.', tip: '' };
    var pass = res.score >= 7;
    ST.marks.push(pass);
    if (pass) { ST.wins++; vibe(25); } else vibe([40, 60, 40]);
    track('ch_duel', { score: res.score });
    if (!c) return;
    c.innerHTML =
      '<div class="ch-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:4px 0 10px"><span class="ch-pill ' + (pass ? 'w' : 'l') + '">' + (pass ? '🏆 Раунд твой!' : 'Чайник уцелел') + '</span><div class="ch-hint" style="margin-top:6px">Оценка: <b style="color:#fff">' + res.score + '/10</b></div></div>' +
        '<div class="ch-card"><div class="ch-ch">Твой разбор</div><div class="ch-fb">' + nl2br(v) + '</div></div>' +
        ((res.note || res.tip) ? '<div class="ch-why">💬 ' + esc(res.note || '') + (res.tip ? '<br>🔧 ' + esc(res.tip) : '') + '</div>' : '') +
        '<button class="ch-primary" onclick="CHAINIK.nextDuel()">' + (ST.ti + 1 < ST.tasks.length ? 'Следующее утверждение →' : 'Итог уровня →') + '</button>' +
      '</div>';
  }
  function nextDuel() {
    ST.ti++;
    if (ST.ti < ST.tasks.length) { renderDuel(); return; }
    var passed = ST.wins >= 2;
    var p = loadProg();
    if (passed) { p.done[5] = true; saveProg(p); }
    track(passed ? 'ch_level_pass' : 'ch_level_fail', { level: 5, wins: ST.wins });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="ch-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:18px 0 8px"><div class="ch-score">' + ST.wins + '<span style="font-size:1.1rem;color:#8b93a7">/' + ST.tasks.length + '</span></div><div class="ch-hint" style="margin-top:4px">побед · нужно 2</div></div>' +
        '<div style="text-align:center;margin-bottom:12px"><span class="ch-pill ' + (passed ? 'w' : 'l') + '">' + (passed ? '✅ Уровень пройден' : 'Пока не хватило') + '</span></div>' +
        '<div class="ch-card"><div class="ch-fb">' + (passed ? 'Разбор поставлен: бремя, доказательства, взвешенный вывод — без высокомерия. Остался экзамен: своё убеждение.' : 'Утверждения перемешаются — попробуй ещё: структура разбора важнее напора.') + '</div>' + lecLink('chainik') + '</div>' +
        (passed ? '<button class="ch-primary" onclick="CHAINIK.home()">К карте пути →</button>'
                : '<button class="ch-primary" onclick="CHAINIK.play(5)">🔁 Ещё попытка</button><button class="ch-secondary" onclick="CHAINIK.home()">К карте пути</button>') +
      '</div>';
  }

  // ===== Уровень 6: своё убеждение =====
  function renderOwnBelief() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="ch-wrap">' + lvlHead('Экзамен Рассела: честный разбор не чужого, а своего. Сформулируй убеждение, в котором ты уверен и которое для тебя что-то значит.') +
        '<div class="ch-hint" style="margin:0 0 8px">Например: про здоровье, деньги, людей, воспитание, работу. Чем ближе к жизни — тем честнее экзамен.</div>' +
        '<textarea class="ch-ta" id="chOwn" maxlength="300" placeholder="Моё убеждение: …"></textarea>' +
        '<button class="ch-primary" onclick="CHAINIK.ownToAudit()">Дальше: разбираю честно →</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('chOwn'); if (el) el.focus(); }, 60);
  }
  function ownToAudit() {
    var v = ((document.getElementById('chOwn') || {}).value || '').trim();
    if (v.length < 15) { toast('Сформулируй убеждение одним-двумя предложениями', 'error'); return; }
    ST.own.belief = v; vibe(15);
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="ch-wrap">' + lvlHead('Шаг 2. Разбери своё убеждение по четырём пунктам Рассела — так же честно, как разбирал чужие чайники.') +
        '<div class="ch-card"><div style="color:#8b93a7;font-size:.82rem;margin-bottom:6px">Твоё убеждение</div><div class="ch-claim">' + nl2br(ST.own.belief) + '</div></div>' +
        '<div class="ch-hint" style="margin:0 0 8px">1) Откуда оно у меня? 2) Какие доказательства «за» и «против» мне известны? 3) Что конкретно заставило бы меня передумать? 4) Моя честная степень уверенности.</div>' +
        '<textarea class="ch-ta" id="chIn2" style="min-height:150px" placeholder="1) Откуда: …\n2) За и против: …\n3) Передумаю, если: …\n4) Уверенность: …"></textarea>' +
        '<button class="ch-primary" onclick="CHAINIK.ownFinish()">Разобрал — оценка Фреди 🎓</button>' +
      '</div>';
    setTimeout(function () { var el = document.getElementById('chIn2'); if (el) el.focus(); }, 60);
  }
  async function ownFinish() {
    if (ST.busy) return;
    var v = ((document.getElementById('chIn2') || {}).value || '').trim();
    if (v.length < 60) { toast('Пройди все четыре пункта — это и есть экзамен', 'error'); return; }
    ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="ch-wrap" style="text-align:center;padding-top:60px"><div class="ch-score"><span class="ch-spin"></span></div><p class="ch-sub" style="margin-top:16px">Фреди оценивает честность разбора…</p></div>';
    var res = null;
    try {
      var r = await aiGenerate(
        'Ты — экзаменатор интеллектуальной честности по Бертрану Расселу. Игрок разобрал СОБСТВЕННОЕ убеждение.\n' +
        'Убеждение: «' + ST.own.belief + '».\n' +
        'Разбор: «' + v.slice(0, 1200) + '».\n' +
        'Оцени: HONESTY 0–10 — честность (признаны ли доводы «против», назван ли реальный источник убеждения, есть ли конкретный критерий «что заставит передумать» — не отговорка); CLARITY 0–10 — ясность (структура по пунктам, взвешенная итоговая уверенность вместо «уверен на 100%» или «ничего не знаю»).\n' +
        'Хвали за признание слабых мест своего убеждения — это и есть суть экзамена. Верни СТРОГО один JSON: {"honesty":ЧИСЛО,"clarity":ЧИСЛО,"praise":"одна фраза — что удалось","tip":"одна фраза — главный совет по Расселу"}. По-русски, на «ты».',
        { max_tokens: 240, temperature: 0.3 });
      res = parseJson(r && r.content);
      if (res) {
        res.honesty = Math.max(0, Math.min(10, Math.round(Number(res.honesty))));
        res.clarity = Math.max(0, Math.min(10, Math.round(Number(res.clarity))));
        if (isNaN(res.honesty) || isNaN(res.clarity)) res = null;
      }
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { honesty: 7, clarity: 7, praise: 'Экзамен принят — связь с Фреди подвисла, зачёт твой.', tip: '' };
    var total = res.honesty + res.clarity;
    var passed = total >= 12;
    var p = loadProg();
    if (passed) {
      p.done[6] = true;
      p.title = total >= 17 ? '🫖 Ясный ум' : '🫖 Честный скептик';
      if (total > (p.best || 0)) p.best = total;
      saveProg(p);
    }
    track(passed ? 'ch_level_pass' : 'ch_level_fail', { level: 6, honesty: res.honesty, clarity: res.clarity });
    track('game_finish', { game: 'chainik', total: total });
    if (!c) return;
    c.innerHTML =
      '<div class="ch-wrap">' + lvlHead('') +
        '<div style="text-align:center;margin:14px 0 8px"><div class="ch-score">' + total + '<span style="font-size:1.1rem;color:#8b93a7">/20</span></div>' +
        '<div class="ch-hint">честность ' + res.honesty + '/10 · ясность ' + res.clarity + '/10 · нужно 12</div></div>' +
        '<div style="text-align:center;margin-bottom:12px">' + (passed ? '<span class="ch-pill w">' + esc(p.title) + '</span>' : '<span class="ch-pill l">Пересдача открыта — как всегда</span>') + '</div>' +
        (res.praise ? '<div class="ch-card"><div class="ch-ch">Что удалось</div><div class="ch-fb">' + nl2br(res.praise) + '</div></div>' : '') +
        (res.tip ? '<div class="ch-why">🔧 ' + esc(res.tip) + '</div>' : '') +
        '<div class="ch-card"><div class="ch-ch">Взять в жизнь</div><div class="ch-fb">Правило Рассела на каждый день: <b>степень веры — по силе доказательств</b>. Услышал утверждение — спроси: чей чайник? что бы меня убедило? на какой я полке весов? И раз в год устраивай этот экзамен любимому убеждению.</div></div>' +
        '<div class="ch-row"><button class="ch-primary" onclick="CHAINIK.play(6)">🔁 Другое убеждение</button><button class="ch-secondary" onclick="CHAINIK.home()">К карте пути</button></div>' +
        '<a class="ch-course" href="' + COURSE_URL + '" target="_blank" rel="noopener">🎓 Углубиться: курс «Бертран Рассел: ясность мышления»</a>' +
      '</div>';
  }

  window.CHAINIK = {
    home: home, play: play,
    pickPair: pickPair, pickQuad: pickQuad, pickScale: pickScale, pickDekalog: pickDekalog, nextTask: nextTask,
    submitDuel: submitDuel, nextDuel: nextDuel,
    ownToAudit: ownToAudit, ownFinish: ownFinish,
    quitLevel: quitLevel, getState: function () { return ST; }
  };
  window.showChainikGame = home;
})();
