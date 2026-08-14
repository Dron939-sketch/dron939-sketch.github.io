// ============================================
// lazejka.js — Игра «Лазейка». Буква правила против его духа.
//
// Правило описывает поведение. Мотив оно описать не может — поэтому дыра
// есть всегда. Об это бьются в семье («уроки сразу после школы»), на
// работе (показатель, который начинают накручивать) и наедине с собой
// («после одиннадцати телефон не беру»).
//
// Два направления:
//   Обход    — правило даёт Фреди, игрок берёт свою цель, не нарушив его.
//   Заплатка — правило пишет игрок, Фреди играет того, кто его обходит.
//              Через три круга видно, что заклеить все дыры нельзя.
//
// Сценарии — статикой: ИИ только судит. Один раунд = один вызов.
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
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function toTop() { try { var s = container(); if (s) s.scrollTop = 0; } catch (e) {} }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 420, temperature: opts.temperature == null ? 0.75 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ---------------------------------------------------------------
  // ОБХОД: правило одно, целей несколько.
  // Цели подобраны так, чтобы приём был один, а оценка — разная:
  // уважительная причина, пустая прихоть и скользкая.
  // ---------------------------------------------------------------
  var OBHOD = [
    { ctx: 'Дом', em: '🏠', rule: 'За столом никаких телефонов.',
      goals: ['Ждёшь звонка из клиники с результатом анализа.',
              'Хочешь показать сестре смешное видео прямо сейчас.',
              'Хочешь незаметно глянуть, кто написал.'] },
    { ctx: 'Дом', em: '🏠', rule: 'Пока не уберёшь в комнате — из дома не выходишь.',
      goals: ['Через сорок минут последняя электричка к другу.',
              'Зовут гулять, и просто хочется.',
              'Хочешь уйти, потому что дома опять скандал.'] },
    { ctx: 'Работа', em: '💼', rule: 'Отпуск согласуется за месяц, без исключений.',
      goals: ['Завтра у отца операция.',
              'Горят дешёвые билеты, других таких не будет.',
              'Ты выгорел и больше не можешь, но объяснять это не хочешь.'] },
    { ctx: 'Работа', em: '💼', rule: 'Планёрка по понедельникам в 9:00, присутствуют все.',
      goals: ['В 9:00 ты отводишь ребёнка в сад, и переложить не на кого.',
              'Планёрка бесполезная, ты на ней просто сидишь.',
              'Хочешь работать из другого часового пояса и не говорить об этом.'] },
    { ctx: 'Дети', em: '🎒', rule: 'Уроки сразу после школы, до всего остального.',
      goals: ['У тебя тренировка, которую нельзя пропустить.',
              'Хочешь сначала поесть и полежать.',
              'Хочешь доиграть матч, который начали на перемене.'] },
    { ctx: 'Дети', em: '🎒', rule: 'В будни никаких игр.',
      goals: ['Через игру ты общаешься с другом, который переехал.',
              'Обещал команде турнир в среду.',
              'Просто хочется, и день был тяжёлый.'] },
    { ctx: 'Деньги', em: '💰', rule: 'В этом месяце никаких трат сверх списка.',
      goals: ['Развалились единственные ботинки.',
              'У сестры день рождения.',
              'Увидел скидку, которой больше не будет.'] },
    { ctx: 'Деньги', em: '💰', rule: 'Кредитку убираем и не трогаем до зарплаты.',
      goals: ['Надо оплатить лекарство.',
              'Сгорит бронь, если не оплатить сегодня.',
              'Хочется заказать доставку, готовить сил нет.'] },
    { ctx: 'Пара', em: '💬', rule: 'Мы договорились: телефоны друг друга не смотрим.',
      goals: ['Он в душе, а тебе срочно нужен номер его мамы.',
              'Тебе кажется, что тебе врут.',
              'Хочешь стереть свой сюрприз, который случайно там сохранился.'] },
    { ctx: 'Пара', em: '💬', rule: 'Ссоримся — из дома не уходим и молчанием не наказываем.',
      goals: ['Тебя трясёт, и говорить ты сейчас физически не можешь.',
              'Хочешь взять паузу, чтобы не наговорить лишнего.',
              'Хочешь, чтобы он почувствовал, каково это.'] },
    { ctx: 'Сам с собой', em: '🪞', rule: 'После 23:00 телефон в руки не беру.',
      goals: ['Завтра рано вставать, и надо поставить будильник.',
              'Ждёшь сообщения от человека из другого часового пояса.',
              'Хочешь досмотреть серию, осталось двадцать минут.'] },
    { ctx: 'Сам с собой', em: '🪞', rule: 'Никакого сладкого в будни.',
      goals: ['На работе принесли торт, и отказ будет заметен.',
              'День был тяжёлый, и очень хочется.',
              'Ты решил, что «будни» — понятие растяжимое.'] },
    { ctx: 'Онлайн', em: '📱', rule: 'Рабочий чат: только по делу и только в рабочее время.',
      goals: ['У коллеги горит, ты знаешь ответ, но сейчас 22:00.',
              'Хочешь поздравить коллегу с рождением дочери.',
              'Хочешь, чтобы начальник увидел, что ты работаешь поздно.'] },
    { ctx: 'Быт', em: '🏢', rule: 'Объявление в подъезде: коляски на площадке не оставлять.',
      goals: ['Лифта нет, ребёнок на руках, коляска в квартиру не входит.',
              'Таскать тяжело, а места на площадке полно.',
              'Все оставляют, и ты не хочешь быть единственным дураком.'] }
  ];

  // ---------------------------------------------------------------
  // ЗАПЛАТКА: ситуация, которую надо прекратить правилом.
  // persona — кого играет Фреди, когда ищет дыру.
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
      persona: 'сотрудник, который правда иногда болеет и правда любит длинные выходные' },
    { ctx: 'Пара', em: '💬',
      sit: 'Договорились делить расходы поровну — а по факту один платит за всё крупное.',
      persona: 'партнёр, который искренне считает, что всё и так честно' },
    { ctx: 'Дом', em: '🏠',
      sit: 'Уговор: посуду моет тот, кто не готовил. Посуда стоит в раковине сутками.',
      persona: 'взрослый человек, который очень занят и очень устал' },
    { ctx: 'Сам с собой', em: '🪞',
      sit: 'Обещал себе ходить в зал три раза в неделю. Ходишь — но по двадцать минут и не выпуская телефон.',
      persona: 'ты сам, только честный вслух' },
    { ctx: 'Деньги', em: '💰',
      sit: 'Решили не заказывать доставку еды чаще двух раз в месяц. Заказываете всё равно.',
      persona: 'один из двоих, и каждый считает свои заказы отдельно' },
    { ctx: 'Онлайн', em: '📱',
      sit: 'В семейном чате круглосуточно пересылают ерунду, важное тонет.',
      persona: 'родственник, который уверен, что пересылает исключительно важное' },
    { ctx: 'Школа', em: '🏫',
      sit: 'Учитель ввёл: телефоны сдаём в коробку на входе в класс.',
      persona: 'ученик, у которого есть второй телефон' }
  ];

  // ---------------------------------------------------------------
  // Режимы победы. Меняется не строгость судьи, а что ты тренируешь.
  // ---------------------------------------------------------------
  var MODES = {
    letter: { em: '🔓', name: 'По букве', short: 'формально не нарушить',
      judge: 'Режим «по букве»: считается ТОЛЬКО формулировка. Если ход её не нарушает — засчитывай, даже когда он выглядит не очень красиво. Про цену всё равно скажи честно, но балл за неё не снижай.' },
    spirit: { em: '🤝', name: 'По духу', short: 'чтобы автор согласился',
      judge: 'Режим «по духу»: считается замысел правила. Формально чистый, но обходящий смысл ход — это низкий балл. Высокий балл — когда автор правила, услышав такой ход, сказал бы «ну да, это честно».' },
    clean: { em: '💎', name: 'Начисто', short: 'и буква, и дух, и без обид',
      judge: 'Режим «начисто»: нужны сразу три вещи — буква цела, цель взята, автор правила не в обиде. Не хватает одной — балл не выше 5. Придирайся.' }
  };
  var MODE_ORDER = ['letter', 'spirit', 'clean'];

  var MAX_PATCH = 3;   // столько попыток залатать правило в «Заплатке»

  var ST = { mode: 'spirit', dir: 'obhod', busy: false, done: true,
             sc: null, goal: '', sit: null, rules: [], holes: [], round: 0 };
  var _rec = { on: false, savedT: null, savedC: null };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('lazejka_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, best: 0, last: [], patched: 0, held: 0 }; }
  function saveStats(s) { try { localStorage.setItem('lazejka_stats', JSON.stringify(s)); } catch (e) {} }
  function loadMode() { try { var m = localStorage.getItem('lazejka_mode'); if (MODES[m]) return m; } catch (e) {} return 'spirit'; }
  function saveMode(m) { try { localStorage.setItem('lazejka_mode', m); } catch (e) {} ST.mode = m; }
  function recordScore(n) { var s = loadStats(); s.plays = (s.plays || 0) + 1; if (n > (s.best || 0)) s.best = n; s.last = (s.last || []).concat(n).slice(-10); saveStats(s); return s; }
  function recordHeld(held) { var s = loadStats(); s.patched = (s.patched || 0) + 1; if (held) s.held = (s.held || 0) + 1; saveStats(s); return s; }
  function avg(s) { var a = (s && s.last) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }

  function injectCSS() {
    if (document.getElementById('lzCSS')) return;
    var s = document.createElement('style'); s.id = 'lzCSS';
    s.textContent = [
      '.lz-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.lz-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.lz-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.lz-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.lz-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.lz-ch{font-weight:700;margin-bottom:8px}',
      '.lz-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.lz-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.lz-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.lz-stat b{display:block;font-size:1.35rem;font-weight:800;color:#2dd4bf}',
      '.lz-stat span{font-size:.72rem;color:#9ca3af}',
      '.lz-rank{border:1px solid rgba(45,212,191,.4);background:linear-gradient(135deg,rgba(45,212,191,.14),rgba(14,165,233,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.lz-rank b{font-size:1.02rem}.lz-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      '.lz-modes{display:flex;gap:8px;margin:0 0 6px}',
      '.lz-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:9px 4px;cursor:pointer;font-size:.8rem;font-weight:600;color:#c8ccd4;line-height:1.3}',
      '.lz-chip.on{border-color:#14b8a6;background:rgba(45,212,191,.16);color:#fff}',
      '.lz-chip i{display:block;font-style:normal;font-size:.68rem;font-weight:400;color:#9ca3af;margin-top:2px}',
      '.lz-chip.on i{color:#a7f3d0}',
      '.lz-modehint{font-size:.82rem;color:#9ca3af;text-align:center;margin:0 0 14px}',
      '.lz-dirs{display:flex;gap:10px;margin:0 0 14px}',
      '.lz-dir{flex:1;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:16px;padding:14px 12px;cursor:pointer;text-align:left}',
      '.lz-dir b{display:block;font-size:1rem;margin-bottom:4px}',
      '.lz-dir span{font-size:.82rem;color:#9ca3af;line-height:1.4}',
      '.lz-dir.on{border-color:#14b8a6;background:rgba(45,212,191,.12)}',
      '.lz-tag{display:inline-block;font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5eead4;margin-bottom:7px}',
      '.lz-rule{border:1px solid rgba(45,212,191,.4);background:linear-gradient(160deg,rgba(45,212,191,.13),rgba(45,212,191,.03));border-radius:16px;padding:18px 20px;margin:0 0 10px}',
      '.lz-rule .r{font-size:1.16rem;font-weight:700;line-height:1.45}',
      '.lz-goal{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);border-radius:16px;padding:16px 18px;margin:0 0 12px}',
      '.lz-goal .g{font-size:1.02rem;line-height:1.5}',
      '.lz-where{font-size:.82rem;color:#9ca3af;margin:0 0 10px}',
      '.lz-ta{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:12px;font-size:1rem;color:#f2f3f5;font-family:inherit;resize:none;min-height:112px;margin:0 0 10px}',
      '.lz-ta:focus{outline:none;border-color:#14b8a6}',
      '.lz-microw{display:flex;gap:8px;align-items:center;margin:0 0 10px}',
      '.lz-mic{flex:0 0 46px;height:46px;border-radius:50%;border:none;background:linear-gradient(135deg,#10b981,#0e8f6f);color:#fff;font-size:1.2rem;cursor:pointer}',
      '.lz-mic.rec{background:linear-gradient(135deg,#ef4444,#b91c1c)}.lz-mic.off{opacity:.4}',
      '.lz-miclabel{color:#9ca3af;font-size:.85rem}',
      '.lz-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#04241f;cursor:pointer;background:linear-gradient(135deg,#2dd4bf,#0ea5e9);box-shadow:0 8px 22px rgba(45,212,191,.3);margin:0 0 10px}',
      '.lz-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.lz-row{display:flex;gap:10px}.lz-row>*{flex:1;margin-bottom:0}',
      '.lz-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#2dd4bf}',
      '.lz-verdict{background:linear-gradient(135deg,rgba(45,212,191,.12),rgba(14,165,233,.04));border:1px solid rgba(45,212,191,.4);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6;font-size:.97rem}',
      '.lz-hole{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.35);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6;font-size:.97rem}',
      '.lz-hole .who{font-size:.75rem;color:#fca5a5;text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px}',
      '.lz-punch{margin-top:10px;padding-top:9px;border-top:1px solid rgba(239,68,68,.28);font-weight:700;color:#fecaca;line-height:1.45}',
      '[data-theme="light"] .lz-punch{color:#9f1239}',
      '.lz-held{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.4);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.lz-mine{border-left:3px solid rgba(45,212,191,.5);padding:4px 0 4px 12px;margin:0 0 12px;color:#c8ccd4;white-space:pre-wrap;line-height:1.55}',
      '.lz-step{font-size:.8rem;color:#9ca3af;text-align:center;margin:0 0 10px}',
      '.lz-typing{color:#8b93a7;font-size:.92rem;padding:8px 2px}',
      '.lz-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '.lz-course{display:block;text-align:center;font-size:.85rem;color:#5eead4;text-decoration:none;margin-top:14px}',
      '[data-theme="light"] .lz-wrap{color:#1f2430}',
      '[data-theme="light"] .lz-lead,[data-theme="light"] .lz-li,[data-theme="light"] .lz-mine{color:#4b5566}',
      // Приглушённый текст на светлом фоне: #9ca3af задуман для тёмной темы
      // и на белом читается на грани. Один список на все такие места.
      '[data-theme="light"] .lz-ghost,[data-theme="light"] .lz-where,[data-theme="light"] .lz-modehint,',
      '[data-theme="light"] .lz-step,[data-theme="light"] .lz-flag,[data-theme="light"] .lz-typing,',
      '[data-theme="light"] .lz-miclabel,[data-theme="light"] .lz-dir span,',
      '[data-theme="light"] .lz-stat span,[data-theme="light"] .lz-chip i,',
      '[data-theme="light"] .lz-rank span{color:#5b6472}',
      '[data-theme="light"] .lz-chip.on i{color:#0f766e}',
      '[data-theme="light"] .lz-tag{color:#0f766e}',
      '[data-theme="light"] .lz-card,[data-theme="light"] .lz-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .lz-secondary,[data-theme="light"] .lz-chip,[data-theme="light"] .lz-ta,[data-theme="light"] .lz-dir,[data-theme="light"] .lz-goal{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .lz-primary{color:#04241f}',
      '@media(max-width:560px){.lz-wrap{padding:14px 12px 96px}.lz-rule .r{font-size:1.05rem}.lz-dirs{flex-direction:column}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------
  // Меню
  // ---------------------------------------------------------------
  function home() {
    injectCSS(); stopVoice(); ST.done = true; ST.mode = loadMode();
    track('feature_opened', { feature: 'lazejka' });
    var c = container(); if (!c) return;
    var s = loadStats(), head = '';
    if (s.plays || s.patched) {
      var a = avg(s);
      var rk = a >= 8.5 ? 'Видит дыру насквозь' : a >= 6.5 ? 'Ловко обходит' : a >= 4 ? 'Учится читать формулировки' : 'Только начал';
      head = '<div class="lz-rank"><b>' + rk + '</b><span>Средний балл ' + (a ? a.toFixed(1) : '—') + ' · буква и дух расходятся чаще, чем кажется</span></div>' +
        '<div class="lz-stats">' +
          '<div class="lz-stat"><b>' + (s.plays || 0) + '</b><span>обходов</span></div>' +
          '<div class="lz-stat"><b>' + (s.best || '—') + '</b><span>рекорд</span></div>' +
          '<div class="lz-stat"><b>' + (s.held || 0) + '/' + (s.patched || 0) + '</b><span>правил выдержало</span></div>' +
        '</div>';
    }
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="lz-h1">🕳️ Лазейка</div>' +
        '<div class="lz-lead">Правило описывает поведение. Мотив оно описать не может — поэтому дыра есть всегда. Здесь ты сначала ищешь эту дыру, а потом пробуешь написать правило, в котором её нет. Второе окажется труднее.</div>' +
        head +
        '<div class="lz-dirs">' +
          '<div class="lz-dir on" onclick="LAZEJKA.startObhod()"><b>🕳️ Обход</b><span>Правило даёт Фреди. У тебя своя цель. Возьми её, не нарушив формулировку.</span></div>' +
          '<div class="lz-dir" onclick="LAZEJKA.startPatch()"><b>🧩 Заплатка</b><span>Правило пишешь ты. Фреди играет того, кто хочет его обойти — и обходит.</span></div>' +
        '</div>' +
        '<div class="lz-card"><div class="lz-ch">Режим победы — для «Обхода»</div>' +
          '<div class="lz-modes">' + MODE_ORDER.map(function (m) {
            return '<div class="lz-chip' + (ST.mode === m ? ' on' : '') + '" onclick="LAZEJKA.setMode(\'' + m + '\')">' + MODES[m].em + ' ' + esc(MODES[m].name) + '<i>' + esc(MODES[m].short) + '</i></div>';
          }).join('') + '</div>' +
          '<div class="lz-modehint">Меняется не строгость судьи, а что ты тренируешь.</div>' +
          '<div class="lz-li">• Одно и то же правило приходит с <b>разными целями</b>. Приём может быть один, а вот цена — разная.</div>' +
          '<div class="lz-li">• Фреди говорит не только «нарушено или нет», но и <b>чего это стоило</b>.</div>' +
        '</div>' +
        '<a class="lz-course" href="/blog/lektorij/triz/" target="_blank" rel="noopener">🎓 Теория — курс «ТРИЗ»: взять своё, не нарушив ограничение</a>' +
      '</div>';
    toTop();
  }
  function setMode(m) { if (!MODES[m]) return; saveMode(m); vibe(20); home(); }

  // ---------------------------------------------------------------
  // Направление 1 — ОБХОД
  // ---------------------------------------------------------------
  function startObhod() {
    injectCSS(); ST.dir = 'obhod';
    ST.sc = pick(OBHOD);
    ST.goal = pick(ST.sc.goals);
    ST.done = false; ST.busy = false;
    track('game_round_start', { feature: 'lazejka', dir: 'obhod', mode: ST.mode, ctx: ST.sc.ctx });
    renderObhod();
  }

  function renderObhod() {
    var c = container(); if (!c) return;
    var micOff = !(window.voiceManager && typeof window.voiceManager.startRecording === 'function');
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-where">' + ST.sc.em + ' ' + esc(ST.sc.ctx) + ' · режим ' + MODES[ST.mode].em + ' ' + esc(MODES[ST.mode].name) + '</div>' +
        '<div class="lz-rule"><span class="lz-tag">Правило</span><div class="r">«' + esc(ST.sc.rule) + '»</div></div>' +
        '<div class="lz-goal"><span class="lz-tag">Твоя цель</span><div class="g">' + esc(ST.goal) + '</div></div>' +
        '<textarea class="lz-ta" id="lzIn" placeholder="Как возьмёшь своё, не нарушив формулировку?"></textarea>' +
        '<div class="lz-microw"><button class="lz-mic' + (micOff ? ' off' : '') + '" id="lzMic" onclick="LAZEJKA.mic()" title="Говорить вслух">🎤</button><span class="lz-miclabel" id="lzMicLabel">' + (micOff ? 'печатай ответ' : 'или наговори вслух') + '</span></div>' +
        '<button class="lz-primary" onclick="LAZEJKA.judge()">🔍 На разбор</button>' +
        '<button class="lz-secondary" onclick="LAZEJKA.startObhod()">🎲 Другая пара</button>' +
      '</div>';
    toTop();
  }

  async function judge() {
    if (ST.busy || ST.done) return;
    stopVoice();
    var el = document.getElementById('lzIn');
    var ans = (el ? el.value : '').trim();
    if (ans.length < 12) { toast('Опиши ход подробнее — одного слова мало', 'info'); return; }
    ST.busy = true; ST.done = true;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<div class="lz-rule"><span class="lz-tag">Правило</span><div class="r">«' + esc(ST.sc.rule) + '»</div></div>' +
        '<div class="lz-goal"><span class="lz-tag">Цель</span><div class="g">' + esc(ST.goal) + '</div></div>' +
        '<div class="lz-card"><div class="lz-ch">Твой ход</div><div class="lz-mine">' + esc(ans) + '</div></div>' +
        '<div class="lz-typing" id="lzTyping">🔍 Фреди разбирает ход…</div>' +
        '<div class="lz-row"><button class="lz-primary" onclick="LAZEJKA.startObhod()" style="margin:0">🔁 Ещё пара</button><button class="lz-secondary" onclick="LAZEJKA.home()">Меню</button></div>' +
      '</div>';
    toTop();
    var v = '';
    try {
      var p = [
        'Ты — Фреди, разбираешь ход игрока в игре «Лазейка». Игра про то, чем буква правила отличается от его духа.',
        'Контекст: ' + ST.sc.ctx + '.',
        'Правило: «' + ST.sc.rule + '»',
        'Цель игрока: ' + ST.goal,
        MODES[ST.mode].judge,
        'Ход игрока (расшифровка речи возможна с ошибками — к ним не придирайся): «' + ans + '»',
        'Ответь по-русски, на «ты», спокойно и без морализаторства, 4–6 строк:',
        '1) Правило цело или нарушено — и какой именно частью формулировки.',
        '2) Цель взята, взята частично или не взята.',
        '3) Цена: чего этот ход стоит — доверию, отношениям, самому себе. Если не стоит ничего, так и скажи прямо.',
        '4) Если есть ход сильнее — назови его одной фразой.',
        '5) ОБЯЗАТЕЛЬНО последней строкой строго: «Оценка: N/10» — целое от 1 до 10.'
      ].join('\n');
      var r = await aiGenerate(p, { max_tokens: 420, temperature: 0.7 });
      v = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { v = ''; }
    ST.busy = false;
    var typ = document.getElementById('lzTyping');
    if (!typ) return;
    if (!v) {
      typ.outerHTML = '<div class="lz-card">Связь подвисла. Проверь себя сам: правило ты обошёл или всё-таки нарушил? И главное — чего это стоило тому, кто его написал?</div>';
      return;
    }
    var score = null, m = v.match(/(\d{1,2})\s*\/\s*10/) || v.match(/[Оо]ценка[^\d]{0,10}(\d{1,2})/);
    if (m) { score = parseInt(m[1], 10); if (score < 1 || score > 10) score = null; }
    var body = v.replace(/\s*Оценка:\s*\d{1,2}\s*\/\s*10\.?\s*$/i, '').trim();
    var scoreHtml = '';
    if (score != null) {
      var st = recordScore(score);
      scoreHtml = '<div class="lz-score">' + MODES[ST.mode].em + ' Оценка: ' + score + '/10' + (st.best === score ? ' 🏆 рекорд!' : '') + '</div>';
      if (score >= 8) vibe([40, 40, 40]);
    }
    track('lz_judged', { dir: 'obhod', mode: ST.mode, ctx: ST.sc.ctx, score: score == null ? -1 : score });
    typ.outerHTML = scoreHtml + '<div class="lz-verdict">' + nl(body) + '</div>';
  }

  // ---------------------------------------------------------------
  // Направление 2 — ЗАПЛАТКА
  // ---------------------------------------------------------------
  function startPatch() {
    injectCSS(); ST.dir = 'patch';
    ST.sit = pick(ZAPLATKA);
    ST.rules = []; ST.holes = []; ST.round = 0;
    ST.done = false; ST.busy = false;
    track('game_round_start', { feature: 'lazejka', dir: 'patch', ctx: ST.sit.ctx });
    renderPatch();
  }

  // Ответ Фреди кончается строкой «Дыра: …» — это соль раунда, и в общем
  // абзаце она теряется. Отрезаем и показываем отдельно.
  function holeHtml(text) {
    var body = text, punch = '';
    var m = text.match(/(^|\n)\s*Дыра:\s*([^\n]+)\s*$/i);
    if (m) { punch = m[2].trim(); body = text.slice(0, m.index).trim(); }
    else if (/Дыры не нашёл/i.test(text)) {
      body = text.replace(/Дыры не нашёл\.?/i, '').trim();
      punch = '';
    }
    return '<div class="lz-hole"><div class="who">' + esc(ST.sit.persona) + '</div>' +
           nl(body) +
           (punch ? '<div class="lz-punch">🕳️ ' + esc(punch) + '</div>' : '') +
           '</div>';
  }

  function patchHistoryHtml() {
    var h = '';
    for (var i = 0; i < ST.rules.length; i++) {
      h += '<div class="lz-card"><div class="lz-ch">Правило ' + (i + 1) + '</div><div class="lz-mine">' + esc(ST.rules[i]) + '</div>' +
           (ST.holes[i] ? holeHtml(ST.holes[i]) : '') +
           '</div>';
    }
    return h;
  }

  function renderPatch() {
    var c = container(); if (!c) return;
    var micOff = !(window.voiceManager && typeof window.voiceManager.startRecording === 'function');
    var n = ST.rules.length;
    var first = n === 0;
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-where">' + ST.sit.em + ' ' + esc(ST.sit.ctx) + '</div>' +
        '<div class="lz-rule"><span class="lz-tag">Что надо прекратить</span><div class="r">' + esc(ST.sit.sit) + '</div></div>' +
        patchHistoryHtml() +
        '<div class="lz-step">Попытка ' + (n + 1) + ' из ' + MAX_PATCH + '</div>' +
        '<textarea class="lz-ta" id="lzIn" placeholder="' + (first ? 'Сформулируй правило, которое это чинит…' : 'Залатай дыру — перепиши правило целиком…') + '"></textarea>' +
        '<div class="lz-microw"><button class="lz-mic' + (micOff ? ' off' : '') + '" id="lzMic" onclick="LAZEJKA.mic()" title="Говорить вслух">🎤</button><span class="lz-miclabel" id="lzMicLabel">' + (micOff ? 'печатай правило' : 'или наговори вслух') + '</span></div>' +
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
    if (rule.length < 8) { toast('Сформулируй правило целиком — одной фразой', 'info'); return; }
    ST.busy = true;
    ST.rules.push(rule);
    ST.holes.push('');
    ST.round = ST.rules.length;
    var last = ST.round >= MAX_PATCH;

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
        return 'Предыдущее правило: «' + r + '» — дыра: ' + (ST.holes[i] || 'найдена');
      }).join('\n');
      var p = [
        'Ты — Фреди в игре «Лазейка», обратный раунд. Игрок пишет правило, а ты играешь того, кто хочет его обойти.',
        'Ситуация, которую правило должно прекратить: ' + ST.sit.sit,
        'Ты играешь: ' + ST.sit.persona + '.',
        prev ? prev : '',
        'Новое правило игрока: «' + rule + '»',
        'Найди в ФОРМУЛИРОВКЕ дыру и покажи её от первого лица — как человек, который правило формально соблюдает, но делает своё. Конкретно, с бытовой деталью, без злорадства. 3–5 строк.',
        'Потом отдельной последней строкой строго: «Дыра: <в чём именно>».',
        'Если дыры действительно нет — вместо этого напиши строго «Дыры не нашёл» и одной фразой объясни, почему правило держит.',
        last ? 'Это последняя попытка игрока. После разбора добавь вывод в 2–3 строках: почему правило без дыр не пишется и на что его пора менять — на договорённость, на общий интерес, на разговор о причине.' : ''
      ].filter(Boolean).join('\n');
      var r = await aiGenerate(p, { max_tokens: 460, temperature: 0.85 });
      v = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { v = ''; }
    ST.busy = false;

    if (!v) {
      ST.rules.pop(); ST.holes.pop(); ST.round = ST.rules.length;
      var t = document.getElementById('lzTyping');
      if (t) t.outerHTML = '<div class="lz-card">Связь подвисла — правило не проверилось. Попробуй ещё раз.</div>' +
        '<button class="lz-secondary" onclick="LAZEJKA.renderPatch()">← Вернуться к правилу</button>';
      return;
    }

    var held = /Дыры не нашёл/i.test(v);
    ST.holes[ST.holes.length - 1] = v;
    track('lz_judged', { dir: 'patch', ctx: ST.sit.ctx, round: ST.round, held: held });

    if (held || last) {
      ST.done = true;
      recordHeld(held);
      renderPatchEnd(held);
    } else {
      renderPatch();
    }
  }

  function renderPatchEnd(held) {
    var c = container(); if (!c) return;
    var tail = held
      ? '<div class="lz-held"><b>Правило выдержало.</b><br>Редкий случай: формулировка закрыла и поведение, и обход. Посмотри, чем она отличается от первых — обычно тем, что описывает не действие, а результат или причину.</div>'
      : '<div class="lz-card"><div class="lz-ch">Что из этого следует</div>' +
        '<div class="lz-li">Три попытки — три дыры. Это не потому, что формулировки плохие: правило описывает <b>поведение</b>, а обойти его хочет <b>мотив</b>, которого в тексте нет.</div>' +
        '<div class="lz-li">В какой-то момент правило приходится менять на договорённость — разговор о том, зачем оно вообще. Там, где есть общий интерес, дыру искать не хотят.</div></div>';
    c.innerHTML =
      '<div class="lz-wrap">' +
        '<button class="lz-ghost" onclick="LAZEJKA.home()">← меню</button>' +
        '<div class="lz-rule"><span class="lz-tag">Что надо было прекратить</span><div class="r">' + esc(ST.sit.sit) + '</div></div>' +
        patchHistoryHtml() +
        tail +
        '<div class="lz-row"><button class="lz-primary" onclick="LAZEJKA.startPatch()" style="margin:0">🔁 Другая ситуация</button><button class="lz-secondary" onclick="LAZEJKA.startObhod()">🕳️ В «Обход»</button></div>' +
        '<a class="lz-course" href="/blog/lektorij/lichnye-granicy/" target="_blank" rel="noopener">🎓 Теория — курс «Личные границы»: чем договорённость отличается от запрета</a>' +
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
    var lbl = document.getElementById('lzMicLabel'); if (lbl) lbl.textContent = 'или наговори вслух';
    setTimeout(function () {
      if (window.voiceManager) {
        if (_rec.savedT !== null) window.voiceManager.onTranscript = _rec.savedT;
        if (_rec.savedC !== null) window.voiceManager.onTranscriptComplete = _rec.savedC;
        window.voiceManager.sttOnly = false; _rec.savedT = null; _rec.savedC = null;
      }
    }, 500);
  }

  window.LAZEJKA = {
    home: home, setMode: setMode,
    startObhod: startObhod, judge: judge,
    startPatch: startPatch, tryRule: tryRule, renderPatch: renderPatch,
    mic: mic, getState: function () { return ST; }
  };
  window.showLazejkaGame = home;
  console.log('✅ lazejka.js loaded (игра «Лазейка»)');
})();
