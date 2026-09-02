// ============================================
// klin.js — Игра «Клин клином». Тренажёр переключения вовлечённости.
// Модель: внимание — один канал. Из захватившей тебя петли (скролл,
// руминация, тупик) выходят не волей и не в пустоту, а вкинувшись в
// конкурирующую вовлечённость — «клин»: дешёвый вход (лень пропустит) +
// вектор амбиции + собственная тяга. Взгляд изобретателя: будущее решение
// как приманка, поиск как предвкушение. Аватар — стоячая волна: цел, пока течёшь.
// Экспорт: window.showKlinGame, window.KLIN
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || ''; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 300, temperature: opts.temperature == null ? 0.6 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // Тип хода: WILL — голая воля без замены; COST — вход слишком дорогой (лень наложит вето);
  // SWAP — подмена петли петлёй (нет вектора); WEDGE — верный клин (дёшево + вектор + тяга).
  var KIND = {
    will: { label: 'Воля без замены', color: '#f87171' },
    cost: { label: 'Дорогой вход', color: '#fbbf24' },
    swap: { label: 'Петля вместо клина', color: '#a78bfa' },
    wedge:{ label: 'Клин', color: '#22d3ee' }
  };

  // Банк захватов. cap — ситуация захвата; loop — короткое имя петли;
  // opts — 4 хода (по одному каждого типа); future — «будущий-ты» у верного хода.
  var BANK = [
    { cap: 'Третий час лежишь в ленте. Пальцы листают сами, время утекло, а внутри пусто и вязко.', loop: 'скролл',
      opts: [
        { t: 'Со злостью швырнуть телефон и приказать себе: «Хватит, займись делом».', kind: 'will', why: 'Голая воля. Петлю убрал — но канал внимания пуст, и через минуту рука снова тянется к телефону. В пустоту не выходят.' },
        { t: 'Сесть и разобрать весь завал по работе и учёбе за один присест.', kind: 'cost', why: 'Вектор верный, но вход слишком дорогой. Лень мгновенно наложит вето: «слишком много» — и вернёшься в ленту.' },
        { t: 'Переключиться на сериал, который давно хотел посмотреть.', kind: 'swap', why: 'Дёшево и втягивает — но это просто другая петля. Вектора к твоему большему нет: вышел из одного захвата в такой же.' },
        { t: 'Открыть и за 5 минут набросать первый абзац того, что давно хочешь сделать.', kind: 'wedge', why: 'Дёшево войти, ведёт к твоей цели и втягивает. Классический клин: маленький вход — а дальше поток подхватит сам.', future: 'Будущий-ты, который это доделал, уже тянет — иди на приманку.' }
      ] },
    { cap: 'Гоняешь по кругу вчерашнюю ссору: что надо было ответить, как он был неправ. Пятый заход — легче не становится.', loop: 'руминация',
      opts: [
        { t: 'Приказать себе: «Просто перестань об этом думать».', kind: 'will', why: 'Запрет думать усиливает мысль. Воля против петли — проигранная война: нужно не гасить, а вытеснять.' },
        { t: 'Сесть и написать длинное письмо-разбор всех обид за годы.', kind: 'cost', why: 'Слишком большой, тяжёлый вход. Лень и боль наложат вето — бросишь на середине и вернёшься к жвачке.' },
        { t: 'Позвонить другу и снова всё пересказать в подробностях.', kind: 'swap', why: 'Это питает ту же петлю, а не вытесняет её. Пересказ по кругу — та же руминация, только вслух.' },
        { t: 'Взяться руками за конкретное: 10 минут навести порядок на столе.', kind: 'wedge', why: 'Дёшево, телесно, втягивает. Руки заняли канал — и мысли отпустили хватку. Клин через тело.', future: 'Тот, кто действует руками, свободнее того, кто застрял в голове.' }
      ] },
    { cap: 'Час смотришь на задачу и не двигаешься. Мысль буксует, растёт злость на себя, руки опускаются.', loop: 'тупик',
      opts: [
        { t: 'Стиснуть зубы и «додавить силой воли», глядя в ту же точку.', kind: 'will', why: 'Давление в тупике не рождает решение — только выжигает. Воля тут не рычаг.' },
        { t: 'Бросить всё и пойти переучивать предмет с нуля по учебнику.', kind: 'cost', why: 'Дорогой обходной вход. Лень справедливо возмутится масштабом — вернёшься в ступор.' },
        { t: 'Открыть чат и залипнуть, пока «само придумается».', kind: 'swap', why: 'Подмена петли: тупик сменил на скролл. Вектора к решению нет, поиск заглох.' },
        { t: 'Спросить: «Как бы это сделал тот, кто уже умеет?» — и накидать 3 грубые гипотезы.', kind: 'wedge', why: 'Дёшево, азартно, двигает к решению. Тупик превратился в охоту — взгляд изобретателя: решение уже где-то есть, ты его выслеживаешь.', future: 'Будущее решение манит как приманка — поиск становится предвкушением, а не мукой.' }
      ] },
    { cap: 'Он ушёл. Ты листаешь его страницу, перечитываешь переписку, воображаешь сцены. Больно — но не оторваться.', loop: 'после расставания',
      opts: [
        { t: 'Заставить себя «взять себя в руки» и не думать о нём.', kind: 'will', why: 'Запрет чувства не работает: подавленное возвращается сильнее. Нужен не запрет, а куда переселить внимание.' },
        { t: 'С завтра «стать новым человеком»: спорт, курсы, диета — всё сразу.', kind: 'cost', why: 'Огромный вход. Батарея и так на нуле — лень и горе наложат вето, будет откат и вина.' },
        { t: 'Срочно найти нового человека, чтобы заполнить пустоту.', kind: 'swap', why: 'Часто это та же петля в новой обёртке — вкидываешься не в своё дело, а в новую зависимость от другого.' },
        { t: 'Начать маленькое своё: 15 минут в день на дело, что откладывал из-за отношений.', kind: 'wedge', why: 'Дёшево, твоё, втягивает. Внимание переезжает с «его страницы» в твою жизнь — вытеснение, а не борьба.', future: 'Через месяц ты — тот, кто строит себя, а не тот, кто листает чужое прошлое.' }
      ] },
    { cap: 'Ум крутит худшие сценарии: вдруг заболею, уволят, не справлюсь. Каждый круг делает страшнее.', loop: 'тревога',
      opts: [
        { t: 'Убеждать себя: «Не накручивай, всё будет хорошо».', kind: 'will', why: 'Спор с тревогой в лоб её кормит. Воля-успокоитель редко перебивает захват.' },
        { t: 'Составить подробный план на все возможные катастрофы сразу.', kind: 'cost', why: 'Тяжёлый вход, который сам превращается в тревожную жвачку. Лень и страх сольются в паралич.' },
        { t: 'Забить тревогу громкой музыкой и роликами до ночи.', kind: 'swap', why: 'Оглушение — не вытеснение. Петля ждёт под шумом и вернётся, как выключишь.' },
        { t: 'Сделать один реальный шаг по одной заботе — написать одно письмо, задать один вопрос.', kind: 'wedge', why: 'Дёшево, конкретно, двигает. Действие переключает канал с воображаемой угрозы на реальное дело.', future: 'Тот, кто сделал шаг, стоит на земле; тот, кто крутит сценарии, висит в воздухе.' }
      ] },
    { cap: 'Надо начать важное. Вместо этого моешь посуду, читаешь новости, делаешь что угодно — только не то.', loop: 'прокрастинация',
      opts: [
        { t: 'Ругать себя лентяем и требовать «просто сесть и сделать».', kind: 'will', why: 'Кнут поднимает сопротивление. Воля против избегания буксует.' },
        { t: 'Пообещать себе сделать всё идеально и за один присест.', kind: 'cost', why: 'Планка «идеально и целиком» — самый дорогой вход. Лень справедливо бастует.' },
        { t: 'Заняться другой «полезной» мелочью, чтобы совесть молчала.', kind: 'swap', why: 'Продуктивная прокрастинация — та же петля. Вектор к главному не тронут.' },
        { t: 'Договориться с собой на 2 минуты самого черновика — и всё.', kind: 'wedge', why: 'Смехотворно дешёвый вход обманывает лень и запускает поток; дальше втягивает само.', future: 'Через 2 минуты ты уже внутри — а внутри всегда легче, чем снаружи.' }
      ] },
    { cap: 'Пятый час в игре и роликах. Уже не в радость, но встать невозможно — палец сам жмёт «ещё один».', loop: 'дофаминовая яма',
      opts: [
        { t: 'Резко всё закрыть и сидеть в пустой комнате, терпя тягу.', kind: 'will', why: 'Пустота после захвата невыносима — рука вернётся. Выходят не в пустоту, а в другую вовлечённость.' },
        { t: 'Решить с завтра «вообще завязать» и вычеркнуть все развлечения.', kind: 'cost', why: 'Тотальный запрет — дорогой и хрупкий. Сорвёшься и добьёшь батарею виной.' },
        { t: 'Переключиться на другую игру или ленту «для разнообразия».', kind: 'swap', why: 'Клин петлёй не выбивают: меняешь захват на захват, вектор нулевой.' },
        { t: 'Запустить что-то создающее с низким входом: собрать, нарисовать, написать 10 минут.', kind: 'wedge', why: 'Созидание с дешёвым входом переигрывает потребление: тот же дофамин, но с вектором и следом.', future: 'Творец на месте потребителя — тот же азарт, но наутро ты этим гордишься.' }
      ] },
    { cap: 'Строишь в голове идеальную отповедь обидчику: как эффектно поставишь его на место. Круг за кругом.', loop: 'мысленная месть',
      opts: [
        { t: 'Приказать себе «будь выше этого» и не думать.', kind: 'will', why: '«Будь выше» — запрет, а запрет кормит петлю. Не гасить, а переселять.' },
        { t: 'Сесть писать разгромное разоблачение на всю его сущность.', kind: 'cost', why: 'Тяжёлый вход, который сам станет новой жвачкой мести. Лень и злость дадут паралич.' },
        { t: 'Позвонить и в третий раз пересказать, какой он гад.', kind: 'swap', why: 'Питаешь петлю. Пересказ — руминация вслух, вектора нет.' },
        { t: 'Вложить эту энергию в 15 минут своего дела — пусть злость толкнёт вперёд.', kind: 'wedge', why: 'Дёшево, втягивает, ведёт к твоему. Топливо обиды перенаправлено в вектор — лучшая месть незаметна.', future: 'Твой рост — ответ сильнее любой отповеди; будущий-ты уже занят делом.' }
      ] },
    { cap: 'Листаешь чужие успехи и вянешь: у всех лучше. Час прошёл, настроение на дне, а лента не кончается.', loop: 'сравнение',
      opts: [
        { t: 'Заставить себя «не сравнивать» и листать дальше через силу.', kind: 'will', why: 'Листать и не сравнивать невозможно — среда сильнее воли. Меняют не волю, а канал.' },
        { t: 'Решить разом обогнать всех и переделать всю жизнь.', kind: 'cost', why: 'Вход в гонку неподъёмный, вектор чужой. Лень наложит вето — останется зависть.' },
        { t: 'Уйти в другую ленту, где «попроще» и не так задевает.', kind: 'swap', why: 'Петля петлёй. Захват прежний, только контент другой.' },
        { t: 'Закрыть и 10 минут двигать свой единственный проект — сравнить себя с собой вчерашним.', kind: 'wedge', why: 'Дёшево, твой вектор, втягивает. Внимание переехало с чужой витрины на твой путь.', future: 'Через месяц лента будет завидовать тому, кто это время строил своё.' }
      ] },
    { cap: 'Неделю ничего не хочется. Даже приятное не радует, тело будто выключили. Лежишь и виноватишь себя.', loop: 'апатия · разрядка',
      border: true,
      opts: [
        { t: 'Пинать себя «соберись, другие справляются» и рвануть на максимум.', kind: 'will', why: 'Пинок по разряженной батарее добивает её. Это не та лень, что вытесняют клином.' },
        { t: 'Составить амбициозный план перезапуска жизни с понедельника.', kind: 'cost', why: 'Вкидываться нечем: топлива нет. Большой вход тут — путь к откату и вине.' },
        { t: 'Залить пустоту сериалами и едой, чтобы не чувствовать.', kind: 'swap', why: 'Заглушка не заряжает. Под ней та же разрядка.' },
        { t: 'Признать: это не лень, а разрядка. Сегодня — зарядка: сон, воздух, тепло, при нужде — помощь.', kind: 'wedge', why: 'Вытеснение работает, когда есть чем вытеснять. Если поле выжжено неделями — сначала восстановление, иногда со специалистом.', future: 'Иногда самый амбициозный шаг — разрешить себе зарядиться, чтобы завтра было чем течь.' }
      ] }
  ];

  var DIFF = {
    easy: { name: 'Коротко', em: '🌱', count: 5 },
    norm: { name: 'Норма', em: '⚖️', count: 7 },
    hard: { name: 'Длинно', em: '🔥', count: 10 }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  var ST = { diff: 'norm', qs: [], idx: 0, picked: null, correct: 0, log: [], done: true, aiBusy: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('klin_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, streak: 0, best: {}, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('klin_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('klin_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('klin_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(diff, score, total) { var s = loadStats(); s.plays = (s.plays || 0) + 1; if (!s.best) s.best = {}; if (!s.best[diff] || score > s.best[diff]) s.best[diff] = score; s.streak = (total && score === total) ? (s.streak || 0) + 1 : 0; s.last = (s.last || []).concat(Math.round(score / (total || 1) * 10)).slice(-10); saveStats(s); return s; }
  function avg(s) { var a = (s && s.last) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }

  function injectCSS() {
    if (document.getElementById('klCSS')) return;
    var s = document.createElement('style'); s.id = 'klCSS';
    s.textContent = [
      '.kl-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.kl-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.kl-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:16px}',
      '.kl-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.kl-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.kl-ch{font-weight:700;margin-bottom:8px}',
      '.kl-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.kl-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.kl-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.kl-stat b{display:block;font-size:1.35rem;font-weight:800;color:#22d3ee}',
      '.kl-stat span{font-size:.72rem;color:#9ca3af}',
      '.kl-rank{border:1px solid rgba(34,211,238,.4);background:linear-gradient(135deg,rgba(34,211,238,.14),rgba(99,102,241,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.kl-rank b{font-size:1.02rem}.kl-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      '.kl-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.kl-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.kl-chip.on{border-color:#06b6d4;background:rgba(34,211,238,.16);color:#fff}',
      '.kl-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.kl-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 14px}',
      '.kl-bar i{display:block;height:100%;background:linear-gradient(90deg,#22d3ee,#6366f1);transition:width .2s linear}',
      '.kl-wave{height:34px;margin:0 0 14px;opacity:.9}',
      '.kl-cap{border:1px solid rgba(34,211,238,.35);background:rgba(34,211,238,.08);border-radius:14px;padding:18px;margin:0 0 8px;font-size:1.08rem;line-height:1.55}',
      '.kl-loop{font-size:.8rem;color:#67e8f9;margin:0 0 14px;text-transform:uppercase;letter-spacing:.08em}',
      '.kl-q{font-weight:700;margin:0 0 10px}',
      '.kl-opt{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:14px 16px;margin:0 0 9px;font-size:1rem;color:#f2f3f5;cursor:pointer;line-height:1.45}',
      '.kl-opt:hover{border-color:rgba(34,211,238,.5)}',
      '.kl-opt.ok{border-color:#10b981;background:rgba(16,185,129,.14)}',
      '.kl-opt.no{border-color:#ef4444;background:rgba(239,68,68,.12)}',
      '.kl-opt[disabled]{cursor:default}',
      '.kl-tag{display:inline-block;font-size:.72rem;font-weight:700;padding:1px 8px;border-radius:20px;margin-left:6px;vertical-align:middle}',
      '.kl-reveal{border:1px solid rgba(99,102,241,.4);background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(34,211,238,.04));border-radius:14px;padding:14px 16px;margin:0 0 14px;line-height:1.6;font-size:.95rem}',
      '.kl-future{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,.14);color:#a5f3fc;font-style:italic}',
      '.kl-why{margin:7px 0;color:#c8ccd4;font-size:.9rem}',
      '.kl-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#052e33;cursor:pointer;background:linear-gradient(135deg,#22d3ee,#6366f1);box-shadow:0 8px 22px rgba(34,211,238,.3);margin:0 0 10px}',
      '.kl-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.kl-row{display:flex;gap:10px}.kl-row>*{flex:1;margin-bottom:0}',
      '.kl-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#22d3ee}',
      '.kl-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px;line-height:1.5}',
      '[data-theme="light"] .kl-wrap{color:#1f2430}',
      '[data-theme="light"] .kl-lead,[data-theme="light"] .kl-li{color:#4b5566}',
      '[data-theme="light"] .kl-card,[data-theme="light"] .kl-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .kl-secondary,[data-theme="light"] .kl-chip,[data-theme="light"] .kl-opt{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .kl-future{color:#0e7490}',
      '@media(max-width:560px){.kl-wrap{padding:14px 12px 96px}.kl-cap{font-size:1rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // Стоячая волна — амплитуда растёт с числом верных клиньев (доля level 0..1).
  function waveSVG(level) {
    var amp = 3 + Math.round(level * 11);       // 3..14
    var op = (0.35 + level * 0.6).toFixed(2);    // тусклая петля → яркий поток
    var mid = 17;
    var d = 'M0 ' + mid;
    for (var x = 0; x <= 720; x += 20) {
      var y = mid + (((x / 20) % 2 === 0) ? -amp : amp);
      d += ' Q' + (x + 10) + ' ' + y + ' ' + (x + 20) + ' ' + mid;
    }
    return '<svg class="kl-wave" viewBox="0 0 720 34" preserveAspectRatio="none" style="width:100%">' +
      '<path d="' + d + '" fill="none" stroke="#22d3ee" stroke-width="2.5" opacity="' + op + '"/></svg>';
  }

  function home() {
    injectCSS(); ST.done = true; ST.diff = loadDiff();
    track('feature_opened', { feature: 'klin' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var a = avg(s), rk = a >= 8.5 ? 'Мастер переключения 🌊' : a >= 6.5 ? 'Ловко ставишь клин' : a >= 4 ? 'Учишься вытеснять' : 'Пока воюешь с петлёй';
      statsHtml = '<div class="kl-rank"><b>' + rk + '</b><span>Средний балл ' + (a ? a.toFixed(1) : '—') + ' · навык вытеснения крепнет</span></div>' +
        '<div class="kl-stats"><div class="kl-stat"><b>' + s.plays + '</b><span>раундов</span></div><div class="kl-stat"><b>' + (s.streak || 0) + '</b><span>серия без промаха</span></div><div class="kl-stat"><b>' + (s.best && s.best[ST.diff] || '—') + '</b><span>рекорд</span></div></div>';
    }
    c.innerHTML =
      '<div class="kl-wrap">' +
        '<button class="kl-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="kl-h1">🪓 Клин клином</div>' +
        '<div class="kl-lead">Внимание — один канал. Из захватившей тебя петли (скролл, руминация, тупик) выходят не силой воли и не в пустоту, а <b>вкинувшись в другую вовлечённость</b> — клин. Верный клин узнаётся по трём приметам: дёшево войти (лень пропустит), ведёт к твоему большему (вектор) и сам втягивает. Учишься ставить клин вместо того, чтобы воевать с собой.</div>' +
        statsHtml +
        '<div class="kl-diff">' + DIFF_ORDER.map(function (d) { return '<div class="kl-chip' + (ST.diff === d ? ' on' : '') + '" onclick="KLIN.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>'; }).join('') + '</div>' +
        '<div class="kl-card"><div class="kl-ch">Три ложных хода и один верный</div>' +
          '<div class="kl-li">🔴 <b>Воля без замены</b> — «просто перестань». Канал пуст, петля вернётся.</div>' +
          '<div class="kl-li">🟡 <b>Дорогой вход</b> — рвануть всё и сразу. Лень наложит вето.</div>' +
          '<div class="kl-li">🟣 <b>Петля вместо клина</b> — сменить захват на такой же. Вектора нет.</div>' +
          '<div class="kl-li">🔵 <b>Клин</b> — дёшево войти, к своей цели, с тягой. Он и вытесняет.</div></div>' +
        '<button class="kl-primary" onclick="KLIN.start()">▶ Начать (' + DIFF[ST.diff].count + ' захватов)</button>' +
        (s.plays ? '' : '<div class="kl-flag">💡 Ты — не вещь, а стоячая волна: держишься целым, пока течёшь. Клин — способ снова потечь туда, куда хочешь.</div>') +
      '</div>';
  }
  function setDiff(d) { if (!DIFF[d]) return; saveDiff(d); vibe(20); home(); }

  function start() {
    injectCSS();
    var n = DIFF[ST.diff].count;
    var pool = shuffle(BANK).slice(0, Math.min(n, BANK.length));
    ST.qs = pool.map(function (b) {
      return { cap: b.cap, loop: b.loop, border: !!b.border, options: shuffle(b.opts) };
    });
    ST.idx = 0; ST.picked = null; ST.correct = 0; ST.log = []; ST.done = false;
    track('game_round_start', { feature: 'klin', diff: ST.diff });
    renderQ();
  }

  function renderQ() {
    var c = container(); if (!c) return;
    var q = ST.qs[ST.idx], total = ST.qs.length, answered = ST.picked !== null;
    var level = total ? ST.correct / total : 0;
    var optsHtml = q.options.map(function (o, i) {
      var cls = 'kl-opt';
      if (answered) { if (o.kind === 'wedge') cls += ' ok'; else if (i === ST.picked) cls += ' no'; }
      var tag = answered ? '<span class="kl-tag" style="background:' + KIND[o.kind].color + '22;color:' + KIND[o.kind].color + '">' + esc(KIND[o.kind].label) + '</span>' : '';
      return '<button class="' + cls + '"' + (answered ? ' disabled' : '') + ' onclick="KLIN.pick(' + i + ')">' + esc(o.t) + tag + '</button>';
    }).join('');
    var reveal = '';
    if (answered) {
      var chosen = q.options[ST.picked], ok = chosen.kind === 'wedge';
      var wedge = q.options.filter(function (o) { return o.kind === 'wedge'; })[0];
      reveal =
        '<div class="kl-reveal"><b>' + (ok ? '✅ Верный клин.' : '❌ Это «' + esc(KIND[chosen.kind].label) + '».') + '</b>' +
          '<div class="kl-why">' + esc(chosen.why) + '</div>' +
          (ok ? '' : '<div class="kl-why" style="color:#a5f3fc">🔵 Клин был: «' + esc(wedge.t) + '» — ' + esc(wedge.why) + '</div>') +
          (wedge.future ? '<div class="kl-future">🧲 ' + esc(wedge.future) + '</div>' : '') +
          '<div id="klAI" style="margin-top:8px"></div>' +
          '<button class="kl-secondary" style="margin-top:10px" onclick="KLIN.explainAI()" id="klAIbtn">🎓 Разбор от Фреди</button>' +
        '</div>' +
        '<button class="kl-primary" onclick="KLIN.next()">' + (ST.idx === total - 1 ? 'Итог →' : 'Дальше →') + '</button>';
    }
    c.innerHTML =
      '<div class="kl-wrap">' +
        '<div class="kl-top"><span>Захват ' + (ST.idx + 1) + ' из ' + total + '</span><button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="KLIN.home()">✕ Выйти</button></div>' +
        '<div class="kl-bar"><i style="width:' + (ST.idx / total * 100) + '%"></i></div>' +
        waveSVG(level) +
        '<div class="kl-cap">' + esc(q.cap) + '</div>' +
        '<div class="kl-loop">петля: ' + esc(q.loop) + (q.border ? ' · пограничный случай' : '') + '</div>' +
        '<div class="kl-q">Каким ходом выйдешь из захвата?</div>' +
        optsHtml + reveal +
      '</div>';
  }

  function pick(i) {
    if (ST.picked !== null) return;
    ST.picked = i;
    var q = ST.qs[ST.idx], chosen = q.options[i], ok = chosen.kind === 'wedge';
    if (ok) { ST.correct++; vibe(20); } else vibe([30, 30, 30]);
    ST.log.push({ cap: q.cap, loop: q.loop, kind: chosen.kind, ok: ok });
    renderQ();
    try { var sc = container(); if (sc) sc.scrollTop = 0; } catch (e) {}
  }

  async function explainAI() {
    if (ST.aiBusy) return; ST.aiBusy = true;
    var q = ST.qs[ST.idx], chosen = q.options[ST.picked];
    var box = document.getElementById('klAI'), btn = document.getElementById('klAIbtn');
    if (btn) { btn.textContent = '🎓 Фреди думает…'; btn.disabled = true; }
    var txt = '';
    try {
      var r = await aiGenerate('Ты — Фреди, наставник по вниманию и вовлечённости. Человек застрял в петле «' + q.loop + '»: ' + q.cap + ' Он выбрал ход типа «' + KIND[chosen.kind].label + '». Модель: из захватившей петли выходят не силой воли и не в пустоту, а вкидываясь в конкурирующую вовлечённость — «клин» (дёшево войти + ведёт к своей цели + сам втягивает). В 2–3 коротких фразах по-русски, на «ты», без вступлений: скажи, почему выбранный ход слабее клина (или, если это и был клин, чем он силён), и подскажи один конкретный маленький клин под эту ситуацию.', { max_tokens: 260 });
      txt = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { txt = ''; }
    ST.aiBusy = false;
    if (btn) { btn.style.display = 'none'; }
    if (box) box.innerHTML = txt ? '<div style="color:#c7d2fe;line-height:1.55">💬 ' + esc(txt).replace(/\n/g, '<br>') + '</div>' : '<div style="color:#9ca3af">Связь подвисла — но суть уже выше. Попробуй ещё раз позже.</div>';
  }

  function next() {
    ST.idx++; ST.picked = null;
    if (ST.idx >= ST.qs.length) { finish(); return; }
    renderQ();
  }

  function finish() {
    ST.done = true;
    var total = ST.qs.length, pct = Math.round(ST.correct / total * 100);
    var st = recordScore(ST.diff, ST.correct, total);
    var score10 = Math.round(pct / 10);
    var isRec = st.best[ST.diff] === ST.correct && ST.correct > 0;
    if (ST.correct === total) vibe([40, 40, 40]);
    var line = pct === 100 ? 'Ни одна петля не удержала — ставишь клин чисто 🌊' : pct >= 70 ? 'Крепкий навык: чаще вытесняешь, чем воюешь' : pct >= 40 ? 'Уже ловишь разницу — продолжай' : 'Перечитай разборы: выходи не в пустоту, а в клин';
    var wrong = ST.log.filter(function (r) { return !r.ok; });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="kl-wrap">' +
        '<div class="kl-h1" style="font-size:1.2rem">🪓 Результат</div>' +
        waveSVG(ST.correct / total) +
        '<div class="kl-score">' + ST.correct + ' из ' + total + ' · ' + pct + '% · ' + score10 + '/10' + (isRec ? ' 🏆 рекорд!' : '') + (ST.correct === total && st.streak > 1 ? ' · серия ' + st.streak + ' 🔥' : '') + '</div>' +
        '<div class="kl-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        (wrong.length ? '<div class="kl-card"><div class="kl-ch">Где выбрал не клин</div>' + wrong.map(function (r) { return '<div class="kl-li">• петля «' + esc(r.loop) + '» — ход «' + esc(KIND[r.kind].label) + '». Клин дёшев на входе, ведёт к твоему и втягивает.</div>'; }).join('') + '</div>' : '<div class="kl-card" style="text-align:center;color:#6ee7b7">Каждый раз — верный клин! 🎯</div>') +
        '<div class="kl-card" style="color:#a5f3fc"><b>Как перенести в жизнь.</b> Поймал себя в петле — не приказывай «перестань». Спроси: какой у меня сейчас <b>дешёвый вход</b> (2–5 минут), который <b>ведёт к тому, чего хочу</b>? Сделай его — и дай потоку подхватить. Ты не вещь, а стоячая волна: живёшь, пока течёшь.</div>' +
        '<div class="kl-row"><button class="kl-primary" onclick="KLIN.start()" style="margin:0">🔁 Ещё раунд</button><button class="kl-secondary" onclick="KLIN.home()">Сложность / меню</button></div>' +
      '</div>';
    try { var sc = container(); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'klin', diff: ST.diff, score: ST.correct, total: total });
  }

  window.KLIN = { home: home, setDiff: setDiff, start: start, pick: pick, next: next, explainAI: explainAI, getState: function () { return ST; } };
  window.showKlinGame = home;
  console.log('✅ klin.js loaded (игра «Клин клином»)');
})();
