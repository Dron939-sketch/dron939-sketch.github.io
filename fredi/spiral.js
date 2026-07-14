// spiral.js — Игра-тренажёр «Спираль» к курсу «Снова живой» (v2).
// Проживи день чьей-то погасшей жизни по выборам. Две системы — Драйв (дофамин) и
// Тяжесть (кортизол) — реагируют на каждый выбор с отложенными последствиями; в центре
// «спираль» раскручивается вверх или затягивается вниз. Финал даёт разбор по паттерну и
// реальный «шаг на завтра». Урок: действие раньше настроения разворачивает спираль.
// Экспорт: window.showSpiralGame, window.SPIRAL
(function () {
  'use strict';

  function container() { return document.getElementById('screenContainer'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function LS(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function clamp(x) { return Math.max(0, Math.min(100, x)); }

  var D0 = 30, C0 = 62; // старт: драйв низкий, тяжесть высокая
  var ST = null;

  var ROLES = [
    { id: 'parent', icon: '🍼', title: 'Уставший родитель', sub: 'Дом, дети, быт съели всё. На себя не осталось ничего.' },
    { id: 'burnout', icon: '💼', title: 'Выгорел на работе', sub: 'Живу от пятницы до пятницы. Внутри — пусто и серо.' },
    { id: 'loss', icon: '🕊️', title: 'Один после потери', sub: 'Близкий человек ушёл. Дни опустели, вставать незачем.' },
    { id: 'young', icon: '🎧', title: 'Молодой в тупике', sub: 'Все чего-то добились, а я завис. Лента, зависть, апатия.' }
  ];

  var STEPS = [
    'Встать сразу, как прозвенит будильник',
    'Выйти на 20 минут пройтись',
    'Написать или позвонить близкому',
    '15 минут отложенного дела',
    'Вечер без ленты в кровати',
    'Лечь спать вовремя'
  ];

  // k: live | liveHard | cheap | avoid.  liveHard — действие через «не хочется» (отложенный подъём).
  var SCENES = {
    parent: [
      { part: 'Утро · 6:40', text: 'Дети ещё спят — десять минут тишины. Тело просит остаться под одеялом.', opts: [
        { k: 'liveHard', label: 'Встать, пока тихо, и сделать что-то для себя — чай, душ, минуту у окна', react: 'Первые десять минут — только твои. День начался не с обслуживания, а с тебя.', why: 'Действие раньше настроения: капля своего с утра меняет весь тон дня.' },
        { k: 'avoid', label: 'Долежать до детского крика и вскочить в хаос', react: 'Ещё чуть тепла под одеялом — но день сразу схватил тебя за шиворот.', why: 'Начать день в реакции — значит весь день догонять.' } ] },
      { part: 'Утро · 8:00', text: 'Кухня, сборы, каша. Между делом рука тянется к телефону — залипнуть на минуту.', opts: [
        { k: 'live', label: 'Отложить телефон, включить музыку и просто побыть с детьми в суете', react: 'Суета осталась, но ты в ней, а не за стеклом. Даже хаос стал теплее.', why: 'Присутствие возвращает вкус там, где лента его крадёт.' },
        { k: 'cheap', label: 'Полчаса в ленте вполуха, дети сами по себе', react: 'Успел позавидовать чужим отпускам. Утро прошло мимо, и внутри — осадок.', why: 'Дешёвый дофамин: вспышка есть, а тепла и радости — нет.' } ] },
      { part: 'День · 14:00', text: 'Подруга пишет: «Как ты? Пропала совсем. Может, кофе?»', opts: [
        { k: 'live', label: 'Ответить честно: «Тяжело, но давай кофе, очень надо»', react: 'Сказать вслух «тяжело» — уже легче. И впереди живая встреча.', why: 'Связь — топливо: рядом с человеком тяжесть в теле падает по-настоящему.' },
        { k: 'avoid', label: '«Всё норм, закрутилась, потом»', react: 'Отписалась — будто сберегла силы. А стало ещё более одиноко.', why: 'Избегание бережёт усилие и отрезает от опоры.' } ] },
      { part: 'День · 16:30', text: 'Есть дело только для себя — то, что давно откладываешь. Оно всё время «потом».', opts: [
        { k: 'live', label: 'Урвать 15 минут на своё, пока дети заняты', react: 'Не всё, но ты вспомнила, что ты — не только мама. Огонёк.', why: 'Кусочек своего дела возвращает «я», которое растворилось в заботе.' },
        { k: 'avoid', label: '«Не до себя сейчас» — и снова отложить', react: 'Привычно и знакомо. И ещё капля себя утекла в быт.', why: 'Постоянное «потом для себя» и есть тихое угасание.' } ] },
      { part: 'Вечер · 20:30', text: 'Дети уложены. Сил ноль. За окном ещё светло.', opts: [
        { k: 'liveHard', label: 'Выйти на 15 минут одной — просто пройтись и подышать', react: 'Первые шаги — через силу. Но воздух, тишина без «мам!» — и вернулась живее.', why: 'Движение и свет меняют состояние там, где уговоры бессильны.' },
        { k: 'cheap', label: 'Рухнуть в диван и листать до ночи', react: 'Вечер растворился в экране, тело не отдохнуло по-настоящему.', why: 'Пассивный экран глушит, а не восстанавливает.' } ] },
      { part: 'Ночь · 23:40', text: 'Наконец можно спать. Но телефон в руке — «пять минут для себя».', opts: [
        { k: 'live', label: 'Оставить телефон на кухне, лечь спать', react: 'Украла у ленты, подарила себе. Завтра встретишь детей с ресурсом.', why: 'Сон — фундамент; управляй сигналом, а не силой воли.' },
        { k: 'cheap', label: 'Листать в кровати до часу ночи', react: 'Единственное «своё» время — и снова украла его у сна.', why: 'Недосып делает завтрашний день с детьми вдвое тяжелее.' } ] }
    ],
    burnout: [
      { part: 'Утро · 7:30', text: 'Будильник. Впереди день, похожий на вчера. Вставать — как в холодную воду.', opts: [
        { k: 'liveHard', label: 'Встать сразу, не открывая почту в кровати', react: 'Ты на ногах раньше, чем накрыла тревога о задачах. Маленькая победа.', why: 'Действие раньше настроения: сначала встаёшь, мотивация подтянется.' },
        { k: 'cheap', label: 'Лежать и листать рабочие чаты, наливаясь тяжестью', react: 'Ещё не встал, а уже вымотан. День проиграл до старта.', why: 'Начинать день с ленты тревоги — весь день её тащить.' } ] },
      { part: 'Утро · 9:00', text: 'Открываешь ноут. 40 писем. Хочется сразу утонуть в мелочёвке.', opts: [
        { k: 'live', label: 'Выбрать одно главное дело и начать с него, до почты', react: 'Через полчаса главное сдвинулось — и день уже не зря.', why: 'Одно важное раньше суеты возвращает ощущение смысла работы.' },
        { k: 'avoid', label: 'Тушить мелкие письма весь день', react: 'Вечер, а главное не тронуто. Устал, но будто ничего не сделал.', why: 'Суета имитирует работу и сжигает без результата.' } ] },
      { part: 'День · 13:00', text: 'Коллега зовёт на обед: «Пойдём, ты какой-то пропавший».', opts: [
        { k: 'live', label: 'Согласиться, поесть не за монитором, поговорить по-человечески', react: 'Полчаса живого разговора — и плечи опустились.', why: 'Контакт снижает кортизол; выгорание любит изоляцию.' },
        { k: 'avoid', label: '«Дедлайн, поем за компом»', react: 'Съел, не заметив вкуса, глядя в экран. Ещё чуть суше внутри.', why: 'Работа без пауз с людьми выжигает быстрее всего.' } ] },
      { part: 'День · 17:00', text: 'Есть то, что важно тебе, а не начальству: учёба, проект, шаг в сторону. Всё «не сейчас».', opts: [
        { k: 'live', label: '15 минут на своё будущее, а не только на чужие задачи', react: 'Маленький шаг к себе — и работа перестала быть всей жизнью.', why: 'Смысл возвращается, когда есть дело «ради себя», а не только ради чужих целей.' },
        { k: 'avoid', label: '«Разберусь потом, когда будут силы»', react: 'Сил «потом» не бывает. Своё снова отложено.', why: 'Откладывание своего — прямой путь в «доживаю, а не живу».' } ] },
      { part: 'Вечер · 19:00', text: 'Рабочий день кончился. Тянет просто выключиться в сериал.', opts: [
        { k: 'liveHard', label: 'Выйти прогуляться или в зал — сменить картинку перед глазами', react: 'Идти не хотелось. Но тело устало по-хорошему, голова проветрилась.', why: 'Восстановление — это смена нагрузки, а не просто экран.' },
        { k: 'cheap', label: 'Лечь и залипнуть до ночи', react: 'Отдых был, а сил не прибавилось. Знакомо.', why: 'Пассивное залипание не восстанавливает ресурс.' } ] },
      { part: 'Ночь · 0:10', text: 'Спать. Но «ещё чуть-чуть» ролики — заслужил же.', opts: [
        { k: 'live', label: 'Убрать телефон, лечь — работа не стоит недосыпа', react: 'Завтра встретишь дедлайны с ресурсом, а не на нуле.', why: 'Хронический недосып — прямой мотор выгорания.' },
        { k: 'cheap', label: 'Ролики до двух ночи', react: 'Забрал у сна, отдал ленте. Утро будет злым.', why: 'Каждая украденная ночь углубляет выгорание.' } ] }
    ],
    loss: [
      { part: 'Утро · 8:20', text: 'Просыпаешься — и снова вспоминаешь, что теперь один. Вставать незачем.', opts: [
        { k: 'liveHard', label: 'Встать всё равно, заправить кровать, впустить свет', react: 'Тело сделало первый шаг раньше, чем душа была готова. Это нормально.', why: 'Когда «незачем» — действие идёт раньше желания и тянет за собой.' },
        { k: 'avoid', label: 'Остаться лежать в темноте, шторы закрыты', react: 'В моменте можно спрятаться. Но комната стала ещё тяжелее.', why: 'Тьма и постель без сна кормят спираль вниз.' } ] },
      { part: 'Утро · 10:00', text: 'Тишина в доме давит. Рука тянется бесконечно скроллить, лишь бы не думать.', opts: [
        { k: 'live', label: 'Сварить нормальный завтрак, включить музыку, впустить день', react: 'Простое живое действие — и тишина стала чуть теплее.', why: 'Медленные ритуалы возвращают опору, когда всё рухнуло.' },
        { k: 'cheap', label: 'Часы в ленте, лишь бы отвлечься', react: 'Отвлёкся — но пусто как было, так и осталось, плюс потерянное время.', why: 'Лента заглушает боль на минуту и крадёт часы.' } ] },
      { part: 'День · 15:00', text: 'Пишет тот, кто давно звал: «Ты как? Выберемся, а?»', opts: [
        { k: 'live', label: 'Ответить честно и согласиться, хоть и не хочется людей', react: 'Через силу сказал «да». И впервые за долго — не один.', why: 'Связь буквально снижает тяжесть; горе легче не в одиночку.' },
        { k: 'avoid', label: '«Спасибо, не сейчас» и убрать телефон', react: 'Спрятался. И одиночество сомкнулось плотнее.', why: 'Изоляция кажется защитой, а на деле углубляет яму.' } ] },
      { part: 'День · 17:00', text: 'Дом полон следов прошлого. Есть маленький шаг — навести один угол, вернуть себе одно место.', opts: [
        { k: 'live', label: 'Разобрать один ящик или угол — маленький шаг к новой жизни', react: 'Один наведённый угол — и появилось крошечное «моё, новое».', why: 'Среду можно менять руками; новое пространство держит нового себя.' },
        { k: 'avoid', label: 'Не трогать ничего, сил нет', react: 'Всё осталось как было — и прошлое давит по-прежнему.', why: 'Застывшая среда держит застывшим и тебя.' } ] },
      { part: 'Вечер · 19:30', text: 'Вечер — самое тяжёлое время. Хочется просто исчезнуть в кровати.', opts: [
        { k: 'liveHard', label: 'Выйти пройтись, даже в никуда, 20 минут', react: 'Шёл через силу. Но улица, люди, воздух — вернулся не таким раздавленным.', why: 'Движение и свет вытаскивают из вечерней ямы.' },
        { k: 'avoid', label: 'Лечь и смотреть в стену', react: 'Вечер тянулся вечно и придавил ещё сильнее.', why: 'Неподвижность вечером усиливает тяжесть.' } ] },
      { part: 'Ночь · 1:00', text: 'Спать страшно — в тишине накрывает. Проще листать до отключки.', opts: [
        { k: 'live', label: 'Убрать телефон, оставить тихий свет, лечь спать', react: 'Дал себе шанс на нормальный сон — завтра будет чуть легче.', why: 'Сон восстанавливает психику; недосып красит горе в чёрный.' },
        { k: 'cheap', label: 'Листать до утра, пока не вырубишься', react: 'Урвал забвение ценой разбитого утра.', why: 'Хронический недосып усиливает боль и депрессию.' } ] }
    ],
    young: [
      { part: 'Утро · 10:30', text: 'Проснулся поздно. Смысла вставать рано нет — всё равно всё серо.', opts: [
        { k: 'liveHard', label: 'Встать, открыть шторы, начать день, хоть и «незачем»', react: 'Поднялся раньше, чем придумал причину. День хотя бы начался.', why: 'Направление приходит в движении, а не в лежании.' },
        { k: 'cheap', label: 'Лежать в телефоне ещё два часа', react: 'Полдня нет, а ты уже устал от чужих идеальных жизней.', why: 'Сравнение в ленте — топливо для «я неудачник».' } ] },
      { part: 'День · 13:00', text: 'Лента полна чужих успехов. Внутри — «а я никто».', opts: [
        { k: 'live', label: 'Закрыть ленту, сделать одно реальное действие в свою сторону', react: 'Одно живое действие весит больше сотни чужих сторис.', why: 'Твоя жизнь строится офлайн, а не в сравнении онлайн.' },
        { k: 'cheap', label: 'Скроллить дальше, тонуть в зависти', react: 'Час зависти — и ещё ниже самооценка. Классика спирали.', why: 'Дешёвый дофамин ленты крадёт и время, и веру в себя.' } ] },
      { part: 'День · 16:00', text: 'Друг зовёт: «Выходи, сто лет тебя не видел».', opts: [
        { k: 'live', label: 'Согласиться, хоть и не в ресурсе', react: 'Вышел через «не хочу» — и впервые за долго посмеялся.', why: 'Живые люди возвращают то, чего не даст экран.' },
        { k: 'avoid', label: '«Не, я дома побуду»', react: 'Остался — и вечер снова съел телефон.', why: 'Самоизоляция в апатии углубляет её.' } ] },
      { part: 'День · 17:30', text: 'Есть то, что давно хотел попробовать: курс, код, спорт, шаг к делу. Страшно — вдруг не выйдет.', opts: [
        { k: 'live', label: 'Сделать крошечную первую пробу, 15 минут', react: 'Начал — и «я ничего не могу» дало трещину. Это и есть направление.', why: 'Направление находят дешёвыми пробами, а не размышлением на диване.' },
        { k: 'avoid', label: '«Потом, когда пойму, чего хочу»', react: 'Понимание не приходит в голове — только в действии. Снова ноль.', why: 'Ждать ясности перед действием — застрять навсегда.' } ] },
      { part: 'Вечер · 20:00', text: 'Вечер. Дефолт — игры, сериал, лента до ночи.', opts: [
        { k: 'liveHard', label: 'Выйти пройтись или в зал, сменить обстановку', react: 'Лень было до последнего. Но тело проснулось, голова прояснилась.', why: 'Движение поднимает то, что не поднимут мысли.' },
        { k: 'cheap', label: 'Залипнуть в экран до утра', react: 'Ещё один вечер испарился. Завтра снова серое.', why: 'Экранный вечер — это украденный завтрашний день.' } ] },
      { part: 'Ночь · 3:00', text: 'Ночь — единственное живое время, ложиться не хочется.', opts: [
        { k: 'live', label: 'Всё-таки лечь, чтобы завтра не начиналось в тумане', react: 'Дал себе нормальное завтра вместо разбитого.', why: 'Сбитый режим держит в тумане и апатии.' },
        { k: 'cheap', label: 'Сидеть до рассвета', react: 'Опять перевернул день ногами вверх.', why: 'Хаос сна — фундамент апатии, а не выход из неё.' } ] }
    ]
  };

  function eff(k) {
    if (k === 'live') return { drive: 9, cort: -7 };
    if (k === 'liveHard') return { drive: -2, cort: -3, delay: { drive: 13, cort: -7, note: 'после действия накрыло спокойствие и ясность' } };
    if (k === 'cheap') return { drive: 7, cort: -2, delay: { drive: -13, cort: 9, note: 'откат от ленты — пусто и раздражённо' } };
    return { drive: -6, cort: -5, delay: { drive: 0, cort: 8, note: 'вина и одиночество догнали' } }; // avoid
  }

  function injectCSS() {
    if (document.getElementById('spiralCSS')) return;
    var st = document.createElement('style'); st.id = 'spiralCSS';
    st.textContent = [
      '.sp-wrap{max-width:640px;margin:0 auto;padding:14px 14px 96px}',
      '.sp-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:8px}',
      '.sp-eyebrow{color:#3A86FF;font-weight:700;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;margin:2px 0 8px}',
      '.sp-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:0 0 8px;color:var(--text,#fff)}',
      '.sp-lead{color:#9FB0C9;font-size:.98rem;line-height:1.55;margin:0 0 18px}',
      '.sp-role{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px;margin:0 0 11px;color:#EAF0F8;cursor:pointer;font:inherit;transition:border-color .15s,transform .12s,background .15s}',
      '.sp-role:hover{border-color:#3A86FF;transform:translateY(-1px);background:rgba(58,134,255,.08)}',
      '.sp-role .ic{font-size:1.9rem;flex-shrink:0}',
      '.sp-role b{display:block;font-size:1.04rem;color:#fff;margin-bottom:2px}',
      '.sp-role span{font-size:.88rem;color:#9FB0C9;line-height:1.4}',
      '.sp-stage{background:#0B1220;border-radius:22px;padding:22px 18px 26px;color:#EAF0F8;box-shadow:0 16px 44px rgba(10,18,40,.4)}',
      '.sp-hud{display:flex;flex-direction:column;align-items:center;margin:0 0 16px}',
      '.sp-svg{width:170px;height:170px;display:block}',
      '.sp-bars{width:100%;max-width:360px;margin:6px auto 0}',
      '.sp-bar{margin:9px 0}',
      '.sp-bar .lb{display:flex;justify-content:space-between;font-size:.78rem;font-weight:600;margin-bottom:4px}',
      '.sp-bar .lb .nm{color:#B9C5D8}.sp-bar .lb .vl{font-variant-numeric:tabular-nums}',
      '.sp-track{height:9px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden}',
      '.sp-fill{height:100%;border-radius:6px;transition:width .7s cubic-bezier(.4,0,.2,1),background .7s}',
      '.sp-tick{font-size:.72rem;font-weight:800;margin-left:8px}',
      '.sp-part{text-align:center;font-size:.72rem;letter-spacing:.15em;text-transform:uppercase;color:#7C8BA6;font-weight:700;margin:2px 0 11px}',
      '.sp-echo{background:rgba(240,160,90,.1);border:1px solid rgba(240,160,90,.3);color:#F1C79B;border-radius:11px;padding:9px 13px;margin:0 0 14px;font-size:.86rem;line-height:1.45}',
      '.sp-scene{font-size:1.1rem;line-height:1.55;color:#EAF0F8;margin:0 0 18px;font-weight:500}',
      '.sp-opts{display:flex;flex-direction:column;gap:11px}',
      '.sp-opt{width:100%;text-align:left;background:#161F31;border:1px solid #26324A;color:#EAF0F8;border-radius:14px;padding:14px 16px;font:inherit;font-size:.99rem;line-height:1.4;cursor:pointer;transition:border-color .15s,transform .12s,background .15s}',
      '.sp-opt:hover{border-color:#3A86FF;transform:translateY(-1px);background:#1C283F}',
      '.sp-react{background:#131C2C;border-left:3px solid #3A86FF;border-radius:12px;padding:14px 16px;margin:2px 0 16px}',
      '.sp-rt{font-size:1rem;color:#EAF0F8;margin:0 0 8px;line-height:1.5}',
      '.sp-why{font-size:.89rem;color:#9FB0C9;margin:0;line-height:1.5}',
      '.sp-momentum{font-size:.82rem;font-weight:700;margin:8px 0 0}',
      '.sp-next{display:inline-block;background:#3A86FF;color:#fff;border:none;border-radius:12px;padding:13px 26px;font:inherit;font-weight:700;font-size:1rem;cursor:pointer;margin-top:4px}',
      '.sp-next:hover{background:#2E6FE0}',
      '.sp-prog{display:flex;gap:6px;justify-content:center;margin-top:18px}',
      '.sp-prog i{width:20px;height:4px;border-radius:2px;background:#26324A}',
      '.sp-prog i.done{background:#3A86FF}.sp-prog i.cur{background:#7FB0FF}',
      '.sp-res h2{font-size:1.4rem;font-weight:800;text-align:center;margin:6px 0 8px}',
      '.sp-res .rl{color:#C6D2E4;text-align:center;margin:0 0 14px;line-height:1.5}',
      '.sp-res .bd{background:#131C2C;border-radius:14px;padding:16px;color:#D4DEEE;font-size:.96rem;line-height:1.6;margin-bottom:14px}',
      '.sp-tool{background:linear-gradient(160deg,rgba(58,134,255,.14),rgba(58,134,255,.03));border:1px solid rgba(58,134,255,.3);border-radius:14px;padding:16px}',
      '.sp-tool .th{font-weight:800;color:#fff;margin-bottom:4px}',
      '.sp-tool .ts{font-size:.9rem;color:#B9C5D8;margin-bottom:12px;line-height:1.5}',
      '.sp-step{display:block;width:100%;text-align:left;background:#161F31;border:1px solid #26324A;color:#EAF0F8;border-radius:11px;padding:11px 14px;margin:0 0 8px;font:inherit;font-size:.95rem;cursor:pointer;transition:border-color .15s,background .15s}',
      '.sp-step:hover,.sp-step.on{border-color:#3A86FF;background:rgba(58,134,255,.12)}',
      '.sp-saved{text-align:center;background:#131C2C;border:1px solid rgba(127,224,166,.3);border-radius:12px;padding:14px;margin-top:10px;color:#CFEAD9}',
      '.sp-saved b{color:#fff}',
      '.sp-cta{margin-top:16px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center}',
      '.sp-cta a,.sp-cta button{display:inline-block;border-radius:12px;padding:12px 20px;font-weight:700;font-size:.96rem;text-decoration:none;cursor:pointer;font-family:inherit;border:none}',
      '.sp-cta a.p{background:#3A86FF;color:#fff}.sp-cta button.g{background:#161F31;color:#EAF0F8;border:1px solid #26324A}',
      '.sp-disc{font-size:.8rem;color:#8A93A3;margin-top:16px;text-align:center;line-height:1.5}'
    ].join('');
    document.head.appendChild(st);
  }

  // ——— визуал: спираль по «жизни» (0..100) ———
  function lifeVal() { return Math.round(clamp((ST.drive + (100 - ST.cort)) / 2)); }
  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function spiralSVG(life) {
    var t = clamp(life) / 100;
    var cold = [70, 88, 118], warm = [240, 178, 112];
    var col = 'rgb(' + lerp(cold[0], warm[0], t) + ',' + lerp(cold[1], warm[1], t) + ',' + lerp(cold[2], warm[2], t) + ')';
    var sc = (0.5 + t * 0.5).toFixed(3);          // низко — сжата, высоко — раскрыта
    var rot = ((t - 0.5) * 40).toFixed(1);
    var turns = 3.4, N = 150, maxR = 70, cx = 100, cy = 100, d = '';
    for (var i = 0; i <= N; i++) {
      var th = (i / N) * turns * 2 * Math.PI;
      var r = maxR * (i / N);
      var x = (cx + r * Math.cos(th)).toFixed(1), y = (cy + r * Math.sin(th)).toFixed(1);
      d += (i === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
    }
    var glowOp = (0.12 + t * 0.5).toFixed(2), sw = (2 + t * 1.6).toFixed(1);
    return '<svg class="sp-svg" viewBox="0 0 200 200" role="img" aria-label="Спираль состояния">' +
      '<defs><filter id="spGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4.5"/></filter></defs>' +
      '<g transform="translate(100 100) scale(' + sc + ') rotate(' + rot + ') translate(-100 -100)">' +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round" filter="url(#spGlow)" opacity="' + glowOp + '"/>' +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round"/>' +
      '</g>' +
      '<text x="100" y="96" text-anchor="middle" font-size="30" font-weight="800" fill="#fff">' + life + '</text>' +
      '<text x="100" y="116" text-anchor="middle" font-size="10" letter-spacing="1.5" fill="rgba(255,255,255,.7)">ЖИЗНЬ В ТЕБЕ</text>' +
      '</svg>';
  }
  function bar(name, val, good, tick) {
    var pct = clamp(val);
    var c = good
      ? 'linear-gradient(90deg,#3A86FF,#F0B06E)'      // драйв: синий→тёплый
      : 'linear-gradient(90deg,#5B6B86,#E06A6A)';     // тяжесть: серый→красный
    var tk = '';
    if (tick) { var s = tick > 0 ? '+' + tick : '' + tick; tk = '<span class="sp-tick" style="color:' + (tick > 0 ? '#7FE0A6' : '#F0A0A0') + '">' + s + '</span>'; }
    return '<div class="sp-bar"><div class="lb"><span class="nm">' + name + tk + '</span><span class="vl">' + pct + '</span></div>' +
      '<div class="sp-track"><div class="sp-fill" style="width:' + pct + '%;background:' + c + '"></div></div></div>';
  }
  function hud(ticks) {
    ticks = ticks || {};
    return '<div class="sp-hud">' + spiralSVG(lifeVal()) +
      '<div class="sp-bars">' + bar('⚡ Драйв (дофамин)', ST.drive, true, ticks.drive) + bar('🌫 Тяжесть (кортизол)', ST.cort, false, ticks.cort) + '</div></div>';
  }
  function progHTML() {
    var arr = SCENES[ST.role], h = '<div class="sp-prog">';
    for (var k = 0; k < arr.length; k++) h += '<i class="' + (k < ST.i ? 'done' : (k === ST.i ? 'cur' : '')) + '"></i>';
    return h + '</div>';
  }

  // ——— экраны ———
  function showSpiralGame() {
    injectCSS();
    ST = { role: null, drive: D0, cort: C0, i: 0, chosen: [], liveStreak: 0, dimStreak: 0, pending: null };
    track('spiral_open');
    var last = LS('spiralStep');
    var c = container(); if (!c) return;
    if (last) { renderCheckin(last); return; }
    renderRoles();
  }

  function renderCheckin(last) {
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="sp-wrap">' +
      '<button class="sp-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
      '<div class="sp-eyebrow">🌀 Спираль</div><h1 class="sp-h1">С возвращением</h1>' +
      '<div class="sp-tool"><div class="th">В прошлый раз ты выбрал шаг на завтра:</div>' +
      '<div class="ts" style="color:#EAF0F8;font-size:1.02rem;margin:4px 0 14px">«' + last + '»</div>' +
      '<div class="ts">Сделал его?</div>' +
      '<div class="sp-cta" style="justify-content:flex-start;margin-top:4px">' +
      '<button class="g" style="background:#3A86FF;color:#fff;border:none" onclick="SPIRAL.checkin(1)">Да, сделал 🙂</button>' +
      '<button class="g" onclick="SPIRAL.checkin(0)">Ещё нет</button></div></div></div>';
  }
  function checkin(done) {
    LS('spiralStep', '');
    try { localStorage.removeItem('spiralStep'); } catch (e) {}
    track('spiral_checkin', { done: done });
    renderRoles(done ? 'Отлично. Одно живое действие — и спираль уже качнулась вверх. Проживём ещё день?' : 'Ничего. Спираль разворачивается не виной, а следующим шагом. Попробуем ещё раз — прямо сейчас.');
  }

  function renderRoles(topNote) {
    var c = container(); if (!c) return;
    var roles = ROLES.map(function (r) {
      return '<button class="sp-role" onclick="SPIRAL.pick(\'' + r.id + '\')"><span class="ic">' + r.icon + '</span><span><b>' + r.title + '</b><span>' + r.sub + '</span></span></button>';
    }).join('');
    c.innerHTML = '<div class="sp-wrap">' +
      '<button class="sp-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
      '<div class="sp-eyebrow">🎮 Тренажёр к курсу «Снова живой»</div><h1 class="sp-h1">Спираль</h1>' +
      (topNote ? '<div class="sp-echo" style="background:rgba(58,134,255,.1);border-color:rgba(58,134,255,.3);color:#Bdd4ff">' + topNote + '</div>' : '') +
      '<p class="sp-lead">Проживи один день человека, у которого будто выключили свет. В каждой развилке смотри, как две системы — <b>⚡ драйв</b> и <b>🌫 тяжесть</b> — отвечают на выбор, и как спираль в центре раскручивается или затягивается. <b>Сначала выбери, чью жизнь проживёшь.</b></p>' +
      roles + '</div>';
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function pick(id) {
    ST.role = id; ST.drive = D0; ST.cort = C0; ST.i = 0; ST.chosen = []; ST.liveStreak = 0; ST.dimStreak = 0; ST.pending = null;
    track('spiral_role', { role: id });
    renderScene();
  }

  function applyPending() {
    var p = ST.pending; ST.pending = null;
    if (!p) return null;
    ST.drive = clamp(ST.drive + p.drive); ST.cort = clamp(ST.cort + p.cort);
    return p;
  }

  function renderScene() {
    var p = applyPending();
    var sc = SCENES[ST.role][ST.i], c = container(); if (!c) return;
    var ticks = p ? { drive: p.drive || null, cort: p.cort || null } : {};
    var echo = p ? '<div class="sp-echo">⏳ ' + p.note + '</div>' : '';
    var opts = sc.opts.map(function (o, idx) { return '<button class="sp-opt" onclick="SPIRAL.choose(' + idx + ')">' + o.label + '</button>'; }).join('');
    c.innerHTML = '<div class="sp-wrap"><div class="sp-stage">' +
      hud(ticks) + '<div class="sp-part">' + sc.part + '</div>' + echo +
      '<p class="sp-scene">' + sc.text + '</p><div class="sp-opts">' + opts + '</div>' + progHTML() +
      '</div></div>';
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function choose(idx) {
    var sc = SCENES[ST.role][ST.i], o = sc.opts[idx], e = eff(o.k);
    var live = (o.k === 'live' || o.k === 'liveHard');
    // импульс момента
    var mom = '';
    if (live) { ST.liveStreak++; ST.dimStreak = 0; } else { ST.dimStreak++; ST.liveStreak = 0; }
    var dDrive = e.drive, dCort = e.cort;
    if (live && ST.liveStreak >= 2) { var b = Math.min(ST.liveStreak - 1, 3) * 2; dDrive += b; mom = '<div class="sp-momentum" style="color:#7FE0A6">🌀 Спираль раскручивается: серия живых выборов — начинать всё легче (+' + b + ' драйв)</div>'; }
    if (!live && ST.dimStreak >= 2) { var bc = Math.min(ST.dimStreak - 1, 3) * 2; dCort += bc; mom = '<div class="sp-momentum" style="color:#F0A0A0">🌀 Спираль затягивается: прозябание тянет за собой (+' + bc + ' тяжесть)</div>'; }
    ST.drive = clamp(ST.drive + dDrive); ST.cort = clamp(ST.cort + dCort);
    ST.pending = e.delay || null;
    ST.chosen.push(o.k);
    var last = ST.i >= SCENES[ST.role].length - 1;
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="sp-wrap"><div class="sp-stage">' +
      hud({ drive: dDrive || null, cort: dCort || null }) + '<div class="sp-part">' + sc.part + '</div>' +
      '<div class="sp-react"><p class="sp-rt">' + o.react + '</p><p class="sp-why">' + o.why + '</p>' + mom + '</div>' +
      (ST.pending ? '<div class="sp-echo" style="opacity:.75">…цена/награда этого выбора догонит на следующем шаге.</div>' : '') +
      '<button class="sp-next" onclick="SPIRAL.adv()">' + (last ? 'Чем закончился день →' : 'Дальше →') + '</button>' + progHTML() +
      '</div></div>';
    try { window.scrollTo(0, 0); } catch (e2) {}
  }

  function adv() { ST.i++; if (ST.i < SCENES[ST.role].length) renderScene(); else renderResult(); }

  function renderResult() {
    applyPending(); // последний отложенный эффект тоже считается
    var life = lifeVal(), ch = ST.chosen;
    var live = ch.filter(function (k) { return k === 'live' || k === 'liveHard'; }).length;
    var cheap = ch.filter(function (k) { return k === 'cheap'; }).length;
    var avoid = ch.filter(function (k) { return k === 'avoid'; }).length;
    var title, lead, body;
    if (life >= 66) {
      title = 'Спираль развернулась вверх';
      lead = 'Драйв поднялся, тяжесть отступила — и день это вернул.';
      body = 'Заметь главное: ни один живой выбор не был про вдохновение. Вставать не хотелось, выходить было лень, отвечать другому — неловко. Ты делал <b>раньше</b>, чем появлялось желание, — и системы ответили: драйв набирал, тяжесть уходила. Так и работает возвращение к жизни: сначала действие, потом настроение.';
    } else if (life >= 44) {
      title = 'Смешанный день';
      lead = 'Где-то ты встал, где-то уступил — и шкалы это честно показали.';
      body = 'Оживание — не идеальный день, а перевес живых выборов над прозябанием, день за днём. Ты сделал ' + live + ' живых шага из шести. Видел, как живое поднимало драйв и опускало тяжесть, а «потом» роняло драйв и копило груз? Не нужно выигрывать всё — нужно, чтобы живого было чуть больше, чем вчера.';
    } else {
      title = 'День прошёл вниз — и это не приговор';
      lead = 'Знакомо? Так и живёт спираль угасания. Но она разворачивается в обе стороны.';
      body = 'Тут нет осуждения. Каждый выбор «полежать, отложить, полистать» в моменте давал облегчение — ты видел короткий плюс. Но цена приходила на следующем шаге: драйв проваливался, тяжесть накатывала. Хорошая новость — один живой выбор завтра утром уже качнёт спираль вверх. С этого и начинается курс.';
    }
    var pat = '';
    if (cheap >= 3) pat = '<b>Твой паттерн — дешёвый дофамин.</b> Ты видел, как драйв подскакивал от ленты и тут же обрушивался ниже прежнего? Это он: тяга без радости, которая крадёт силы.';
    else if (avoid >= 3) pat = '<b>Твой паттерн — избегание.</b> Ты заметил, что тяжесть копилась даже без ленты — просто от «потом» и «не сейчас»? Это цена невыбора.';
    else if (live >= 4) pat = '<b>Твой паттерн — действие через «не хочется».</b> Именно так спираль и разворачивается: телу сначала тяжело, а потом легче — не наоборот.';
    if (pat) body += '<br><br>' + pat;
    track('spiral_finish', { role: ST.role, life: life, live: live, cheap: cheap, avoid: avoid });
    var steps = STEPS.map(function (s, i) { return '<button class="sp-step" data-s="' + i + '" onclick="SPIRAL.saveStep(' + i + ',this)">' + s + '</button>'; }).join('');
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="sp-wrap"><div class="sp-stage sp-res">' +
      hud({}) + '<h2>' + title + '</h2><p class="rl">' + lead + '</p><div class="bd">' + body + '</div>' +
      '<div class="sp-tool" id="spTool"><div class="th">🌀 Вытащи себя из спирали — по-настоящему</div>' +
      '<div class="ts">Спираль разворачивается одним живым действием, сделанным раньше, чем захочется. Выбери СВОЙ шаг на завтра — я напомню о нём, когда вернёшься:</div>' +
      steps + '</div>' +
      '<div class="sp-cta">' +
      '<a class="p" href="/blog/lekciya-snova-1-pochemu-pogaslo.html">Начать курс «Снова живой»</a>' +
      '<button class="g" onclick="SPIRAL.again()">↻ Прожить другой день</button></div>' +
      '<div class="sp-disc">Это учебный тренажёр, а не диагностика. Если тяжесть держится неделями — это повод обратиться к специалисту.</div>' +
      '</div></div>';
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function saveStep(i, el) {
    var txt = STEPS[i];
    LS('spiralStep', txt);
    track('spiral_step', { step: txt });
    var tool = document.getElementById('spTool');
    if (tool) tool.innerHTML = '<div class="th">Шаг сохранён 🌱</div>' +
      '<div class="sp-saved">Твой шаг на завтра:<br><b>«' + txt + '»</b><br><span style="font-size:.86rem;color:#9FB0C9">Сделай его раньше, чем захочется. Вернёшься — спрошу, получилось ли.</span></div>';
  }

  function again() { ST.role = null; ST.drive = D0; ST.cort = C0; ST.i = 0; ST.chosen = []; ST.liveStreak = 0; ST.dimStreak = 0; ST.pending = null; renderRoles(); }

  window.SPIRAL = { pick: pick, choose: choose, adv: adv, again: again, saveStep: saveStep, checkin: checkin };
  window.showSpiralGame = showSpiralGame;
})();
