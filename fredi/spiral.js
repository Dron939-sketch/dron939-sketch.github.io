// spiral.js — Игра-тренажёр «Спираль» к курсу «Снова живой».
// Проживи один день чьей-то погасшей жизни по выборам: живое действие vs прозябание.
// Шкала-«ядро» светлеет от тусклого к тёплому. Урок курса: действие раньше настроения.
// Экспорт: window.showSpiralGame, window.SPIRAL
(function () {
  'use strict';

  function container() { return document.getElementById('screenContainer'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }

  var START = 28;
  var ST = { role: null, score: START, i: 0, chosen: [] };

  var ROLES = [
    { id: 'parent', icon: '🍼', title: 'Уставший родитель',
      sub: 'Дом, дети, быт съели всё. На себя не осталось ничего.' },
    { id: 'burnout', icon: '💼', title: 'Выгорел на работе',
      sub: 'Живу от пятницы до пятницы. Внутри — пусто и серо.' },
    { id: 'loss', icon: '🕊️', title: 'Один после потери',
      sub: 'Близкий человек ушёл. Дни опустели, вставать незачем.' },
    { id: 'young', icon: '🎧', title: 'Молодой в тупике',
      sub: 'Все чего-то добились, а я завис. Лента, зависть, апатия.' }
  ];

  var SCENES = {
    parent: [
      { part: 'Утро · 6:40', text: 'Дети ещё спят — десять минут тишины. Тело просит остаться под одеялом.', opts: [
        { k: 'live', label: 'Встать, пока тихо, и сделать что-то для себя — чай, душ, минуту у окна', react: 'Первые десять минут — только твои. День начался не с обслуживания, а с тебя.', why: 'Действие раньше настроения: капля своего с утра меняет весь тон дня.', d: 10 },
        { k: 'dim', label: 'Долежать до детского крика и вскочить в хаос', react: 'Ещё чуть тепла под одеялом — но день сразу схватил тебя за шиворот.', why: 'Начать день в реакции — значит весь день догонять.', d: -7 } ] },
      { part: 'Утро · 8:00', text: 'Кухня, сборы, каша. Между делом рука тянется к телефону — залипнуть на минуту.', opts: [
        { k: 'live', label: 'Отложить телефон, включить музыку и просто побыть с детьми в суете', react: 'Суета осталась, но ты в ней, а не за стеклом. Даже хаос стал теплее.', why: 'Присутствие возвращает вкус там, где лента его крадёт.', d: 8 },
        { k: 'dim', label: 'Полчаса в ленте вполуха, дети сами по себе', react: 'Успел позавидовать чужим отпускам и разозлиться. Утро прошло мимо.', why: 'Дешёвый дофамин: тяга есть, а тепла и радости — нет.', d: -8 } ] },
      { part: 'День · 14:00', text: 'Подруга пишет: «Как ты? Пропала совсем. Может, кофе?»', opts: [
        { k: 'live', label: 'Ответить честно: «Тяжело, но давай кофе, очень надо»', react: 'Сказать вслух «тяжело» — уже легче. И впереди живая встреча.', why: 'Связь — топливо: рядом с человеком стресс в теле падает по-настоящему.', d: 12 },
        { k: 'dim', label: '«Всё норм, закрутилась, потом»', react: 'Отписалась — будто сберегла силы. А стало ещё более одиноко.', why: 'Избегание бережёт усилие и отрезает от опоры.', d: -8 } ] },
      { part: 'День · 16:30', text: 'Есть дело только для себя — то, что давно откладываешь. Оно всё время «потом».', opts: [
        { k: 'live', label: 'Урвать 15 минут на своё, пока дети заняты', react: 'Не всё, но ты вспомнила, что ты — не только мама. Огонёк.', why: 'Кусочек своего дела возвращает «я», которое растворилось в заботе.', d: 11 },
        { k: 'dim', label: '«Не до себя сейчас» — и снова отложить', react: 'Привычно и знакомо. И ещё капля себя утекла в быт.', why: 'Постоянное «потом для себя» и есть тихое угасание.', d: -7 } ] },
      { part: 'Вечер · 20:30', text: 'Дети уложены. Сил ноль. За окном ещё светло.', opts: [
        { k: 'live', label: 'Выйти на 15 минут одной — просто пройтись и подышать', react: 'Улица, воздух, тишина без «мам!». Вернулась живее, хоть ничего не решилось.', why: 'Движение и свет меняют состояние там, где уговоры бессильны.', d: 10 },
        { k: 'dim', label: 'Рухнуть в диван и листать до ночи', react: 'Вечер растворился в экране, тело не отдохнуло по-настоящему.', why: 'Пассивный экран глушит, а не восстанавливает.', d: -6 } ] },
      { part: 'Ночь · 23:40', text: 'Наконец можно спать. Но телефон в руке — «пять минут для себя».', opts: [
        { k: 'live', label: 'Оставить телефон на кухне, лечь спать', react: 'Украла у ленты, подарила себе. Завтра встретишь детей с ресурсом.', why: 'Сон — фундамент; управляй сигналом, а не силой воли.', d: 8 },
        { k: 'dim', label: 'Листать в кровати до часу ночи', react: 'Единственное «своё» время — и снова украла его у сна.', why: 'Недосып делает завтрашний день с детьми вдвое тяжелее.', d: -7 } ] }
    ],
    burnout: [
      { part: 'Утро · 7:30', text: 'Будильник. Впереди день, похожий на вчера. Вставать — как в холодную воду.', opts: [
        { k: 'live', label: 'Встать сразу, не открывая почту в кровати', react: 'Ты на ногах раньше, чем накрыла тревога о задачах. Маленькая победа.', why: 'Действие раньше настроения: сначала встаёшь, мотивация подтянется.', d: 10 },
        { k: 'dim', label: 'Лежать и листать рабочие чаты, наливаясь тяжестью', react: 'Ещё не встал, а уже вымотан. День проиграл до старта.', why: 'Начинать день с тревоги — весь день её тащить.', d: -7 } ] },
      { part: 'Утро · 9:00', text: 'Открываешь ноут. 40 писем. Хочется сразу утонуть в мелочёвке.', opts: [
        { k: 'live', label: 'Выбрать одно главное дело и начать с него, до почты', react: 'Через полчаса главное сдвинулось — и день уже не зря.', why: 'Одно важное раньше суеты возвращает ощущение смысла работы.', d: 9 },
        { k: 'dim', label: 'Тушить мелкие письма весь день', react: 'Вечер, а главное не тронуто. Устал, но будто ничего не сделал.', why: 'Суета имитирует работу и сжигает без результата.', d: -8 } ] },
      { part: 'День · 13:00', text: 'Коллега зовёт на обед: «Пойдём, ты какой-то пропавший».', opts: [
        { k: 'live', label: 'Согласиться, поесть не за монитором, поговорить по-человечески', react: 'Полчаса живого разговора — и плечи опустились.', why: 'Контакт снижает кортизол; выгорание любит изоляцию.', d: 11 },
        { k: 'dim', label: '«Дедлайн, поем за компом»', react: 'Съел, не заметив вкуса, глядя в экран. Ещё чуть суше внутри.', why: 'Работа без пауз с людьми выжигает быстрее всего.', d: -7 } ] },
      { part: 'День · 17:00', text: 'Есть то, что важно тебе, а не начальству: учёба, проект, шаг в сторону. Всё «не сейчас».', opts: [
        { k: 'live', label: '15 минут на своё будущее, а не только на чужие задачи', react: 'Маленький шаг к себе — и работа перестала быть всей жизнью.', why: 'Смысл возвращается, когда есть дело «ради себя», а не только «ради KPI».', d: 11 },
        { k: 'dim', label: '«Разберусь потом, когда будут силы»', react: 'Сил «потом» не бывает. Своё снова отложено.', why: 'Откладывание своего — прямой путь в «доживаю, а не живу».', d: -7 } ] },
      { part: 'Вечер · 19:00', text: 'Рабочий день кончился. Тянет просто выключиться в сериал.', opts: [
        { k: 'live', label: 'Выйти прогуляться или в зал — сменить картинку перед глазами', react: 'Тело устало по-хорошему, голова проветрилась.', why: 'Восстановление — это смена нагрузки, а не просто экран.', d: 10 },
        { k: 'dim', label: 'Лечь и залипнуть до ночи', react: 'Отдых был, а сил не прибавилось. Знакомо.', why: 'Пассивное залипание не восстанавливает ресурс.', d: -6 } ] },
      { part: 'Ночь · 0:10', text: 'Спать. Но «ещё чуть-чуть» ролики — заслужил же.', opts: [
        { k: 'live', label: 'Убрать телефон, лечь — работа не стоит недосыпа', react: 'Завтра встретишь дедлайны с ресурсом, а не на нуле.', why: 'Хронический недосып — прямой мотор выгорания.', d: 8 },
        { k: 'dim', label: 'Ролики до двух ночи', react: 'Забрал у сна, отдал ленте. Утро будет злым.', why: 'Каждая украденная ночь углубляет выгорание.', d: -7 } ] }
    ],
    loss: [
      { part: 'Утро · 8:20', text: 'Просыпаешься — и снова вспоминаешь, что теперь один. Вставать незачем.', opts: [
        { k: 'live', label: 'Встать всё равно, заправить кровать, впустить свет', react: 'Тело сделало первый шаг раньше, чем душа была готова. Это нормально.', why: 'Когда «незачем» — действие идёт раньше желания и тянет за собой.', d: 10 },
        { k: 'dim', label: 'Остаться лежать в темноте, шторы закрыты', react: 'В моменте можно спрятаться. Но комната стала ещё тяжелее.', why: 'Тьма и постель без сна кормят спираль вниз.', d: -7 } ] },
      { part: 'Утро · 10:00', text: 'Тишина в доме давит. Рука тянется бесконечно скроллить, лишь бы не думать.', opts: [
        { k: 'live', label: 'Сварить нормальный завтрак, включить музыку, впустить день', react: 'Простое живое действие — и тишина стала чуть теплее.', why: 'Медленные ритуалы возвращают опору, когда всё рухнуло.', d: 8 },
        { k: 'dim', label: 'Часы в ленте, лишь бы отвлечься', react: 'Отвлёкся — но пусто как было, так и осталось, плюс потерянное время.', why: 'Лента заглушает боль на минуту и крадёт часы.', d: -8 } ] },
      { part: 'День · 15:00', text: 'Пишет тот, кто давно звал: «Ты как? Выберемся, а?»', opts: [
        { k: 'live', label: 'Ответить честно и согласиться, хоть и не хочется людей', react: 'Через силу сказал «да». И впервые за долго — не один.', why: 'Связь буквально снижает стресс; горе легче не в одиночку.', d: 12 },
        { k: 'dim', label: '«Спасибо, не сейчас» и убрать телефон', react: 'Спрятался. И одиночество сомкнулось плотнее.', why: 'Изоляция кажется защитой, а на деле углубляет яму.', d: -8 } ] },
      { part: 'День · 17:00', text: 'Дом полон следов прошлого. Есть маленький шаг — навести один угол, вернуть себе одно место.', opts: [
        { k: 'live', label: 'Разобрать один ящик или угол — маленький шаг к новой жизни', react: 'Один наведённый угол — и появилось крошечное «моё, новое».', why: 'Среду можно менять руками; новое пространство держит нового себя.', d: 11 },
        { k: 'dim', label: 'Не трогать ничего, сил нет', react: 'Всё осталось как было — и прошлое давит по-прежнему.', why: 'Застывшая среда держит застывшим и тебя.', d: -6 } ] },
      { part: 'Вечер · 19:30', text: 'Вечер — самое тяжёлое время. Хочется просто исчезнуть в кровати.', opts: [
        { k: 'live', label: 'Выйти пройтись, даже в никуда, 20 минут', react: 'Улица, люди, воздух. Вернулся не таким раздавленным.', why: 'Движение и свет вытаскивают из вечерней ямы.', d: 10 },
        { k: 'dim', label: 'Лечь и смотреть в стену', react: 'Вечер тянулся вечно и придавил ещё сильнее.', why: 'Неподвижность вечером усиливает тяжесть.', d: -6 } ] },
      { part: 'Ночь · 1:00', text: 'Спать страшно — в тишине накрывает. Проще листать до отключки.', opts: [
        { k: 'live', label: 'Убрать телефон, оставить тихий свет, лечь спать', react: 'Дал себе шанс на нормальный сон — завтра будет чуть легче.', why: 'Сон восстанавливает психику; недосып красит горе в чёрный.', d: 8 },
        { k: 'dim', label: 'Листать до утра, пока не вырубишься', react: 'Урвал забвение ценой разбитого утра.', why: 'Хронический недосып усиливает боль и депрессию.', d: -7 } ] }
    ],
    young: [
      { part: 'Утро · 10:30', text: 'Проснулся поздно. Смысла вставать рано нет — всё равно всё серо.', opts: [
        { k: 'live', label: 'Встать, открыть шторы, начать день, хоть и «незачем»', react: 'Поднялся раньше, чем придумал причину. День хотя бы начался.', why: 'Направление приходит в движении, а не в лежании.', d: 10 },
        { k: 'dim', label: 'Лежать в телефоне ещё два часа', react: 'Полдня нет, а ты уже устал от чужих идеальных жизней.', why: 'Сравнение в ленте — топливо для «я неудачник».', d: -7 } ] },
      { part: 'День · 13:00', text: 'Лента полна чужих успехов. Внутри — «а я никто».', opts: [
        { k: 'live', label: 'Закрыть ленту, сделать одно реальное действие в свою сторону', react: 'Одно живое действие весит больше сотни чужих сторис.', why: 'Твоя жизнь строится офлайн, а не в сравнении онлайн.', d: 9 },
        { k: 'dim', label: 'Скроллить дальше, тонуть в зависти', react: 'Час зависти — и ещё ниже самооценка. Классика спирали.', why: 'Дешёвый дофамин ленты крадёт и время, и веру в себя.', d: -8 } ] },
      { part: 'День · 16:00', text: 'Друг зовёт: «Выходи, сто лет тебя не видел».', opts: [
        { k: 'live', label: 'Согласиться, хоть и не в ресурсе', react: 'Вышел через «не хочу» — и впервые за долго посмеялся.', why: 'Живые люди возвращают то, чего не даст экран.', d: 12 },
        { k: 'dim', label: '«Не, я дома побуду»', react: 'Остался — и вечер снова съел телефон.', why: 'Самоизоляция в апатии углубляет её.', d: -8 } ] },
      { part: 'День · 17:30', text: 'Есть то, что давно хотел попробовать: курс, код, спорт, шаг к делу. Страшно — вдруг не выйдет.', opts: [
        { k: 'live', label: 'Сделать крошечную первую пробу, 15 минут', react: 'Начал — и «я ничего не могу» дало трещину. Это и есть направление.', why: 'Направление находят дешёвыми пробами, а не размышлением на диване.', d: 11 },
        { k: 'dim', label: '«Потом, когда пойму, чего хочу»', react: 'Понимание не приходит в голове — только в действии. Снова ноль.', why: 'Ждать ясности перед действием — застрять навсегда.', d: -7 } ] },
      { part: 'Вечер · 20:00', text: 'Вечер. Дефолт — игры, сериал, лента до ночи.', opts: [
        { k: 'live', label: 'Выйти пройтись или в зал, сменить обстановку', react: 'Тело проснулось, голова прояснилась. Вечер не пустой.', why: 'Движение поднимает то, что не поднимут мысли.', d: 10 },
        { k: 'dim', label: 'Залипнуть в экран до утра', react: 'Ещё один вечер испарился. Завтра снова серое.', why: 'Экранный вечер — это украденный завтрашний день.', d: -6 } ] },
      { part: 'Ночь · 3:00', text: 'Ночь — единственное живое время, ложиться не хочется.', opts: [
        { k: 'live', label: 'Всё-таки лечь, чтобы завтра не начиналось в тумане', react: 'Дал себе нормальное завтра вместо разбитого.', why: 'Сбитый режим держит в тумане и апатии.', d: 8 },
        { k: 'dim', label: 'Сидеть до рассвета', react: 'Опять перевернул день ногами вверх.', why: 'Хаос сна — фундамент апатии, а не выход из неё.', d: -7 } ] }
    ]
  };

  function injectCSS() {
    if (document.getElementById('spiralCSS')) return;
    var st = document.createElement('style'); st.id = 'spiralCSS';
    st.textContent = [
      '.sp-wrap{max-width:640px;margin:0 auto;padding:14px 14px 96px}',
      '.sp-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:8px}',
      '.sp-eyebrow{color:#3A86FF;font-weight:700;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;margin:2px 0 8px}',
      '.sp-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:0 0 8px;color:var(--text,#fff)}',
      '.sp-lead{color:#9FB0C9;font-size:.98rem;line-height:1.55;margin:0 0 18px}',
      '.sp-role{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 16px;margin:0 0 11px;color:#EAF0F8;cursor:pointer;font:inherit;transition:border-color .15s,transform .12s,background .15s}',
      '.sp-role:hover{border-color:#3A86FF;transform:translateY(-1px);background:rgba(58,134,255,.08)}',
      '.sp-role .ic{font-size:1.9rem;flex-shrink:0}',
      '.sp-role b{display:block;font-size:1.04rem;color:#fff;margin-bottom:2px}',
      '.sp-role span{font-size:.88rem;color:#9FB0C9;line-height:1.4}',
      '.sp-stage{background:#0E1420;border-radius:22px;padding:24px 20px 26px;color:#EAF0F8;box-shadow:0 16px 44px rgba(15,25,50,.3)}',
      '.sp-core-wrap{display:flex;justify-content:center;margin:2px 0 20px}',
      '.sp-core{width:110px;height:110px;border-radius:50%;display:grid;place-items:center;transition:background .8s ease,box-shadow .8s ease}',
      '.sp-core b{font-size:1.6rem;font-weight:800;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.5)}',
      '.sp-core small{display:block;font-size:.58rem;letter-spacing:.13em;text-transform:uppercase;color:rgba(255,255,255,.78);font-weight:600;margin-top:1px}',
      '.sp-part{text-align:center;font-size:.72rem;letter-spacing:.15em;text-transform:uppercase;color:#7C8BA6;font-weight:700;margin-bottom:11px}',
      '.sp-scene{font-size:1.1rem;line-height:1.55;color:#EAF0F8;margin:0 0 20px;font-weight:500}',
      '.sp-opts{display:flex;flex-direction:column;gap:11px}',
      '.sp-opt{width:100%;text-align:left;background:#182236;border:1px solid #26324A;color:#EAF0F8;border-radius:14px;padding:14px 16px;font:inherit;font-size:.99rem;line-height:1.4;cursor:pointer;transition:border-color .15s,transform .12s,background .15s}',
      '.sp-opt:hover{border-color:#3A86FF;transform:translateY(-1px);background:#1C283F}',
      '.sp-react{background:#141D2E;border-left:3px solid #3A86FF;border-radius:12px;padding:14px 16px;margin:2px 0 18px}',
      '.sp-rt{font-size:1rem;color:#EAF0F8;margin:0 0 8px;line-height:1.5}',
      '.sp-delta{font-weight:800;font-size:.94rem}',
      '.sp-why{font-size:.89rem;color:#9FB0C9;margin:8px 0 0;line-height:1.5}',
      '.sp-next{display:inline-block;background:#3A86FF;color:#fff;border:none;border-radius:12px;padding:13px 26px;font:inherit;font-weight:700;font-size:1rem;cursor:pointer}',
      '.sp-next:hover{background:#2E6FE0}',
      '.sp-prog{display:flex;gap:6px;justify-content:center;margin-top:18px}',
      '.sp-prog i{width:20px;height:4px;border-radius:2px;background:#26324A}',
      '.sp-prog i.done{background:#3A86FF}.sp-prog i.cur{background:#7FB0FF}',
      '.sp-res h2{font-size:1.4rem;font-weight:800;text-align:center;margin:4px 0 8px}',
      '.sp-res .rl{color:#C6D2E4;text-align:center;margin:0 0 16px;line-height:1.5}',
      '.sp-res .bd{background:#141D2E;border-radius:14px;padding:16px 16px;color:#D4DEEE;font-size:.96rem;line-height:1.6}',
      '.sp-cta{margin-top:18px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center}',
      '.sp-cta a,.sp-cta button{display:inline-block;border-radius:12px;padding:12px 20px;font-weight:700;font-size:.96rem;text-decoration:none;cursor:pointer;font-family:inherit;border:none}',
      '.sp-cta a.p{background:#3A86FF;color:#fff}',
      '.sp-cta button.g{background:#182236;color:#EAF0F8;border:1px solid #26324A}',
      '.sp-disc{font-size:.8rem;color:#8A93A3;margin-top:16px;text-align:center;line-height:1.5}'
    ].join('');
    document.head.appendChild(st);
  }

  function coreStyle(s) {
    var t = Math.max(0, Math.min(100, s)) / 100;
    var c2 = [240, 176, 110], c1 = [58, 74, 99];
    var r = Math.round(c1[0] + (c2[0] - c1[0]) * t), g = Math.round(c1[1] + (c2[1] - c1[1]) * t), b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    var glow = 8 + t * 52, op = (0.15 + t * 0.6).toFixed(2);
    return 'background:radial-gradient(circle at 50% 42%, rgb(' + r + ',' + g + ',' + b + '), rgb(' + Math.round(r * 0.5) + ',' + Math.round(g * 0.5) + ',' + Math.round(b * 0.55) + '));'
      + 'box-shadow:0 0 ' + glow + 'px rgba(' + c2[0] + ',' + c2[1] + ',' + c2[2] + ',' + op + ')';
  }
  function coreHTML(s) {
    return '<div class="sp-core-wrap"><div class="sp-core" style="' + coreStyle(s) + '"><div style="text-align:center"><b>' + Math.max(0, Math.round(s)) + '</b><small>жизнь в тебе</small></div></div></div>';
  }
  function progHTML() {
    var arr = SCENES[ST.role], h = '<div class="sp-prog">';
    for (var k = 0; k < arr.length; k++) h += '<i class="' + (k < ST.i ? 'done' : (k === ST.i ? 'cur' : '')) + '"></i>';
    return h + '</div>';
  }

  function showSpiralGame() {
    injectCSS();
    ST = { role: null, score: START, i: 0, chosen: [] };
    track('spiral_open');
    var c = container(); if (!c) return;
    var roles = ROLES.map(function (r) {
      return '<button class="sp-role" onclick="SPIRAL.pick(\'' + r.id + '\')"><span class="ic">' + r.icon + '</span><span><b>' + r.title + '</b><span>' + r.sub + '</span></span></button>';
    }).join('');
    c.innerHTML =
      '<div class="sp-wrap">' +
      '<button class="sp-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
      '<div class="sp-eyebrow">🎮 Тренажёр к курсу «Снова живой»</div>' +
      '<h1 class="sp-h1">Спираль</h1>' +
      '<p class="sp-lead">Проживи один обычный день человека, у которого будто выключили свет. Шесть маленьких развилок — встать или полежать, выйти или уткнуться в ленту. Здесь нет «правильных» ответов и оценок: есть только то, что происходит по-настоящему. <b>Сначала выбери, чью жизнь проживёшь</b> — так виднее, что спираль работает у каждого.</p>' +
      roles +
      '</div>';
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function pick(id) {
    ST.role = id; ST.score = START; ST.i = 0; ST.chosen = [];
    track('spiral_role', { role: id });
    renderScene();
  }

  function renderScene() {
    var sc = SCENES[ST.role][ST.i], c = container(); if (!c) return;
    var opts = sc.opts.map(function (o, idx) { return '<button class="sp-opt" onclick="SPIRAL.choose(' + idx + ')">' + o.label + '</button>'; }).join('');
    c.innerHTML =
      '<div class="sp-wrap"><div class="sp-stage">' +
      coreHTML(ST.score) +
      '<div class="sp-part">' + sc.part + '</div>' +
      '<p class="sp-scene">' + sc.text + '</p>' +
      '<div class="sp-opts">' + opts + '</div>' +
      progHTML() +
      '</div></div>';
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function choose(idx) {
    var sc = SCENES[ST.role][ST.i], o = sc.opts[idx];
    ST.score += o.d; if (ST.score < 0) ST.score = 0; if (ST.score > 100) ST.score = 100;
    ST.chosen.push(o.k);
    var sign = o.d > 0 ? '+' + o.d : '' + o.d, col = o.d > 0 ? '#7FE0A6' : '#F0A0A0';
    var last = ST.i >= SCENES[ST.role].length - 1;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sp-wrap"><div class="sp-stage">' +
      coreHTML(ST.score) +
      '<div class="sp-part">' + sc.part + '</div>' +
      '<div class="sp-react"><p class="sp-rt">' + o.react + '</p><span class="sp-delta" style="color:' + col + '">' + sign + ' к жизни в тебе</span><p class="sp-why">' + o.why + '</p></div>' +
      '<button class="sp-next" onclick="SPIRAL.adv()">' + (last ? 'Чем закончился день →' : 'Дальше →') + '</button>' +
      progHTML() +
      '</div></div>';
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function adv() {
    ST.i++;
    if (ST.i < SCENES[ST.role].length) renderScene(); else renderResult();
  }

  function renderResult() {
    var live = ST.chosen.filter(function (k) { return k === 'live'; }).length, s = ST.score;
    var title, lead, body;
    if (s >= 68) {
      title = 'Спираль развернулась вверх';
      lead = 'Ты почти всё выбрал в сторону живого — и день это вернул.';
      body = 'Заметь главное: ни один живой выбор не был про вдохновение. Вставать не хотелось, выходить было лень, отвечать другому — неловко. Ты делал <b>раньше</b>, чем появлялось желание, — и желание приходило следом. Так и работает возвращение к жизни: сначала маленькое действие, потом настроение. Ты сегодня прожил это, а не прочитал.';
    } else if (s >= 45) {
      title = 'Смешанный день';
      lead = 'Где-то ты встал, где-то уступил. И знаешь — так и выглядит настоящее возвращение.';
      body = 'Оживание — это не идеальный день, а перевес живых выборов над прозябанием, день за днём. Ты сделал ' + live + ' живых шага из шести — и видно, как каждый подтягивал шкалу вверх, а каждое «потом» роняло её вниз. Не нужно выигрывать всё. Нужно, чтобы живых выборов было чуть больше, чем вчера.';
    } else {
      title = 'День прошёл вниз — и это не приговор';
      lead = 'Знакомо, правда? Так и живёт спираль угасания. Но она разворачивается одним маленьким действием.';
      body = 'Тут нет осуждения. Каждый выбор «полежать, отложить, полистать» в моменте казался облегчением — и честно давал его на минуту. Просто цена приходила позже: осадок, вина, украденный сон. Хорошая новость в том, что спираль работает в обе стороны. Один живой выбор завтра утром уже начнёт разворачивать её вверх. С этого и начинается курс.';
    }
    track('spiral_finish', { role: ST.role, score: Math.round(s), live: live });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sp-wrap"><div class="sp-stage sp-res">' +
      coreHTML(s) +
      '<h2>' + title + '</h2><p class="rl">' + lead + '</p><div class="bd">' + body + '</div>' +
      '<div class="sp-cta">' +
      '<a class="p" href="/blog/lekciya-snova-1-pochemu-pogaslo.html">Начать курс «Снова живой»</a>' +
      '<button class="g" onclick="SPIRAL.again()">↻ Прожить другой день</button>' +
      '</div>' +
      '<div class="sp-disc">Это учебный тренажёр, а не диагностика. Если тяжесть держится неделями — это повод обратиться к специалисту.</div>' +
      '</div></div>';
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function again() { showSpiralGame(); }

  window.SPIRAL = { pick: pick, choose: choose, adv: adv, again: again };
  window.showSpiralGame = showSpiralGame;
})();
