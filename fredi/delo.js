// ============================================
// delo.js — Игра «Своё дело». Одиночный бизнес-симулятор с Фреди (РФ-реалии).
// Цикл: выбери дело → разработай стратегию → веди 12 месяцев, решая проблемы,
// которые подкидывает жизнь. Цель — вырастить капитал до 1,5 млн, не обанкротившись.
// Зашитый урок «золотой лихорадки»: богатеет не только старатель, но и тот,
// кто продаёт старателям лопаты (снабжение, сервис).
// Движок локальный (надёжный, честный). Фреди (AI): разбор стратегии,
// совет по ходу, финальный дебриф. Всё деградирует мягко без сети.
// Экспорт: window.showDeloGame, window.DELO
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 340, temperature: opts.temperature == null ? 0.6 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }
  // деньги хранятся в тысячах ₽
  function money(v) {
    var neg = v < 0; v = Math.abs(Math.round(v));
    var s = v >= 1000 ? (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + ' млн' : v + ' тыс';
    return (neg ? '−' : '') + s + ' ₽';
  }

  // ---------- параметры игры ----------
  var GOAL = 1500;      // тыс ₽ — цель (1,5 млн)
  var MAXTURN = 12;     // месяцев
  var BUST = -250;      // ниже — банкротство

  // ---------- виды бизнеса ----------
  // inc — базовый ЧИСТЫЙ доход/мес (до издержек, репутации и событий). Скромный: рост даёт хорошая игра.
  var BIZ = [
    { id: 'coffee', name: 'Кофейня навынос', em: '☕', start: 500, inc: 42, type: 'Общепит',
      tip: 'Низкий вход, но конкуренция бешеная. Выживают локация и постоянники.' },
    { id: 'pvz', name: 'Пункт выдачи (ПВЗ)', em: '📦', start: 400, inc: 30, type: 'Сервис',
      tip: 'Стабильно и предсказуемо, но маржа тонкая, а ты в заложниках у площадки.' },
    { id: 'market', name: 'Магазин на маркетплейсе', em: '🛒', start: 600, inc: 58, type: 'Торговля', gold: true,
      tip: '«Золотая жила»: можно взлететь, но большинство тонет в демпинге и комиссиях.' },
    { id: 'shovel', name: 'Снабжение продавцов МП', em: '🧰', start: 550, inc: 50, type: 'B2B-сервис', shovel: true,
      tip: 'Продаёшь «лопаты»: упаковку, фулфилмент, фото, продвижение. Зарабатываешь, кто бы из продавцов ни победил.' },
    { id: 'barber', name: 'Барбершоп', em: '✂️', start: 700, inc: 46, type: 'Услуги',
      tip: 'Всё держится на мастерах и репутации. Уйдёт мастер — уведёт клиентов.' },
    { id: 'furniture', name: 'Мебель на заказ', em: '🪑', start: 900, inc: 62, type: 'Производство',
      tip: 'Высокая маржа, но длинный цикл и кассовые разрывы на закупке материалов.' },
    { id: 'web', name: 'Веб-студия / автоматизация', em: '💻', start: 300, inc: 52, type: 'IT-услуги',
      tip: 'Почти без вложений, всё в голове и руках. Риск — зависимость от одного-двух клиентов.' }
  ];

  // ---------- стратегические выборы ----------
  var STRAT = {
    pos: { title: 'Позиционирование', opts: [
      { k: 'eco', name: 'Эконом', d: 'Дёшево и много. Оборот выше, но лояльность и запас прочности ниже.', inc: 0.15, rep: -8, stab: -3 },
      { k: 'mid', name: 'Средний', d: 'Золотая середина — без перекосов.', inc: 0, rep: 0, stab: 0 },
      { k: 'prem', name: 'Премиум', d: 'Дорого и качественно. Медленнее, зато репутация и устойчивость выше.', inc: -0.08, rep: 12, stab: 4 }
    ] },
    inv: { title: 'Профиль вложений', opts: [
      { k: 'vabank', name: 'Ва-банк в рост', d: 'Всё в развитие. Максимум дохода, минимум подушки.', inc: 16, rep: 0, stab: -15 },
      { k: 'balance', name: 'Сбалансированно', d: 'Понемногу во всё.', inc: 6, rep: 4, stab: 4 },
      { k: 'tyl', name: 'Крепкий тыл', d: 'Резервы и репутация в приоритете. Растёшь медленнее, но крепче.', inc: -4, rep: 6, stab: 16 }
    ] },
    bet: { title: 'Главная ставка', opts: [
      { k: 'dig', name: '⛏️ Копать золото', d: 'Агрессивно в свою нишу. Больше апсайд — больше риск утонуть в конкуренции.', inc: 12, rep: 0, stab: -12 },
      { k: 'shovel', name: '🧰 Продавать лопаты', d: 'Обслуживать тех, кто копает. Стабильный поток, кто бы ни выиграл.', inc: 8, rep: 4, stab: 8 },
      { k: 'classic', name: '🐢 Медленно и верно', d: 'Классика: качество, постоянники, репутация. Без резких движений.', inc: 3, rep: 2, stab: 6 }
    ] }
  };

  // ---------- банк событий (деньги в тыс ₽) ----------
  // o: {t, m, i, r, b, need, out}
  var EVENTS = [
    { id: 'nalog', t: '🏛️ Налоговая проверка', s: 'Пришло требование пояснить расхождения. Как действуешь?', o: [
      { t: 'Нанять бухгалтера и всё оформить', m: -40, b: 8, out: 'Документы в порядке, штрафов нет. Спишь спокойно.' },
      { t: 'Разобраться самому по ночам', m: 0, b: -5, out: 'Пронесло, но неделя нервов и недосыпа.' },
      { t: 'Проигнорировать требование', m: -100, r: -10, b: -10, out: 'Доначислили налог и выписали штраф.' } ] },
    { id: 'demping', t: '⚔️ Конкурент рядом демпингует', s: 'Через дорогу открылись и уронили цены. Клиенты присматриваются.', o: [
      { t: 'Снизить цены в ответ', i: -15, r: 3, out: 'Клиентов удержал, но маржа просела.' },
      { t: 'Усилить качество и сервис', m: -30, r: 12, out: 'Люди выбрали тебя не за цену, а за уровень.' },
      { t: 'Ничего не менять', m: -10, r: -8, i: -10, out: 'Часть потока ушла к дешёвому соседу.' } ] },
    { id: 'sotrudnik', t: '🚪 Ключевой сотрудник уходит', s: 'Лучший работник получил оффер от конкурента.', o: [
      { t: 'Поднять зарплату команде', m: -50, i: -5, b: 6, r: 3, out: 'Удержал людей, атмосфера выровнялась.' },
      { t: 'Быстро нанять новичка', m: -20, r: -4, b: -3, out: 'Дыру закрыл, но качество временно просело.' },
      { t: 'Тянуть на себе', b: -12, out: 'Сэкономил деньги, но выгораешь.' } ] },
    { id: 'markirovka', t: '🏷️ Новая обязаловка («Честный знак»)', s: 'Ввели обязательную маркировку/учёт. Внедрять надо.', o: [
      { t: 'Внедрить заранее с подрядчиком', m: -45, b: 7, out: 'Всё готово к сроку, работаешь в белую.' },
      { t: 'Впритык, своими силами', m: -10, b: -6, out: 'Успел, но на нервах и с ошибками.' },
      { t: 'Тянуть до последнего', m: -90, r: -6, out: 'Штраф и суета в последний день.' } ] },
    { id: 'bloger', t: '📣 О тебе написал блогер', s: 'Неожиданно вирусный положительный отзыв. Поймать волну?', o: [
      { t: 'Вложиться в рекламу на волне', m: -60, r: 15, i: 20, need: 45, out: 'Поймал момент — поток новых клиентов.' },
      { t: 'Поблагодарить, не тратиться', r: 8, out: 'Приятно, немного новых людей зашло.' },
      { t: 'Не заметить момент', r: 2, out: 'Волна схлынула без тебя.' } ] },
    { id: 'razryv', t: '💸 Кассовый разрыв', s: 'Платить аренду и зарплату нечем прямо сейчас, деньги в обороте.', o: [
      { t: 'Взять кредит под высокую ставку', m: 150, i: -20, b: -8, out: 'Дыру заткнул, но проценты теперь давят на доход.' },
      { t: 'Договориться об отсрочке', r: -3, b: 2, out: 'Уговорил арендодателя подождать, репутация чуть просела.' },
      { t: 'Жёстко урезать расходы', i: -10, r: -5, b: 6, out: 'Затянул пояса, пережил месяц.' } ] },
    { id: 'postavshik', t: '🚚 Поставщик подвёл', s: 'Партия застряла на таможне/складе. Клиенты ждут.', o: [
      { t: 'Найти локального дороже', m: -40, b: 5, out: 'Дороже, зато сроки спас.' },
      { t: 'Ждать свою партию', m: -10, i: -15, r: -6, out: 'Потерял часть заказов и нервов клиентов.' },
      { t: 'Предупредить и дать бонус', m: -15, r: 6, out: 'Честность оценили, клиенты остались.' } ] },
    { id: 'arenda', t: '🏢 Аренда выросла на 30%', s: 'Арендодатель поднял ставку. Что делаешь?', o: [
      { t: 'Переехать в место дешевле', m: -50, i: -5, r: -5, b: 8, out: 'Сэкономил на аренде, но часть потока привыкала к старому месту.' },
      { t: 'Остаться и платить', i: -12, out: 'Локацию сохранил, но расходы выросли.' },
      { t: 'Уйти частично в онлайн', i: -8, r: -4, b: 6, out: 'Снизил зависимость от точки.' } ] },
    { id: 'grant', t: '🎁 Грант для малого бизнеса', s: 'Появилась программа поддержки. Но бумаг много.', o: [
      { t: 'Оформить (долго, но деньги)', m: 120, b: 4, out: 'Пробился через бюрократию — подушка выросла.' },
      { t: 'Не связываться', out: 'Сэкономил время, но деньги прошли мимо.' } ] },
    { id: 'b2b', t: '🤝 Крупный заказ с отсрочкой', s: 'Большой клиент готов, но платит через два месяца. Финансировать из своих.', o: [
      { t: 'Взять, вложить подушку', m: -80, i: 35, r: 8, need: 60, out: 'Рискнул кэшем — получил якорного клиента.' },
      { t: 'Взять с частичной предоплатой', m: -30, i: 18, r: 4, out: 'Подстраховался предоплатой, поток вырос.' },
      { t: 'Отказаться от риска', b: 2, out: 'Не рискнул — и не вырос.' } ] },
    { id: 'otzyvy', t: '⭐ Волна негативных отзывов', s: 'Рейтинг на картах/маркетплейсе поехал вниз.', o: [
      { t: 'Отработать каждый, исправить', m: -25, r: 12, b: 3, out: 'Разобрал жалобы — рейтинг отрос честно.' },
      { t: 'Накрутить хороших отзывов', r: 4, b: -8, out: 'Рейтинг подрос, но площадка может забанить за накрутку.' },
      { t: 'Игнорировать', m: -15, r: -12, out: 'Репутация просела, поток упал.' } ] },
    { id: 'sezon', t: '📉 Сезонный провал', s: 'Мёртвый сезон, выручка проседает у всех в нише.', o: [
      { t: 'Запустить акцию/новый продукт', m: -30, i: 8, r: 4, out: 'Расшевелил спрос в несезон.' },
      { t: 'Беречь кэш, переждать', b: 8, i: -4, out: 'Пересидел спокойно, накопил подушку.' },
      { t: 'Ничего не делать', m: -10, i: -12, out: 'Просто просел вместе с рынком.' } ] },
    { id: 'stavka', t: '🏦 ЦБ поднял ставку', s: 'Кредиты дороже, спрос осторожнее. Макро давит.', o: [
      { t: 'Сократить издержки, беречь кэш', i: -8, b: 8, out: 'Поджался — стал устойчивее к шторму.' },
      { t: 'Демпинговать ради оборота', i: -12, r: 4, out: 'Оборот держишь ценой маржи.' },
      { t: 'Инвестировать против рынка', m: -70, i: 25, b: -6, need: 50, out: 'Пока все боятся — ты занял долю рынка.' } ] },
    { id: 'partner', t: '🧩 Партнёр зовёт в проект', s: 'Знакомый запускает большое дело и зовёт тебя.', o: [
      { t: 'Войти деньгами как совладелец', m: -100, i: 30, r: 5, need: 80, out: 'Ставка сыграла — новый поток дохода.' },
      { t: 'Войти как поставщик (🧰 лопаты)', m: -30, i: 18, b: 4, out: 'Обслуживаешь проект без риска запуска. Классический ход «продавца лопат».' },
      { t: 'Отказаться', b: 2, out: 'Остался при своём.' } ] },
    { id: 'hype', t: '🌟 Золотая лихорадка в нише!', s: 'Рынок захватил хайп — все ринулись в твою нишу. Толпа старателей растёт на глазах.', o: [
      { t: '⛏️ Броситься копать вместе со всеми', m: -90, i: 40, b: -15, need: 50, out: 'Или джекпот, или демпинг сожрёт маржу. Ты в толпе старателей.' },
      { t: '🧰 Продавать им лопаты', m: -40, i: 28, b: 6, out: 'Снабжаешь набежавших — стабильный поток, кто бы из них ни выиграл. Так делали Бреннан и Levi Strauss.' },
      { t: 'Наблюдать со стороны', b: 3, out: 'Не рискнул — и не заработал на волне.' } ] },
    { id: 'vygoranie', t: '🔥 Выгорание владельца', s: 'Ты тащишь всё на себе месяцами. Батарейка на нуле.', o: [
      { t: 'Взять паузу, делегировать', m: -40, i: -5, b: 12, out: 'Отдал часть дел — выдохнул, бизнес не рухнул.' },
      { t: 'Нанять управляющего', m: -60, i: -8, b: 15, out: 'Дорого, но дело больше не держится на тебе одном.' },
      { t: 'Продолжать на морально-волевых', b: -12, r: -3, out: 'Дотянул, но качество и настроение просели.' } ] }
  ];

  // ---------- состояние ----------
  var ST = { screen: 'home', biz: null, strat: { pos: null, inv: null, bet: null },
             money: 0, inc: 0, rep: 50, stab: 50, turn: 1, ev: null, queue: [], qi: 0,
             outcome: null, over: false, peak: 0, aiBusy: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('delo_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, wins: 0, best: 0 }; }
  function saveStats(s) { try { localStorage.setItem('delo_stats', JSON.stringify(s)); } catch (e) {} }
  function recordEnd(won, peak) { var s = loadStats(); s.plays = (s.plays || 0) + 1; if (won) s.wins = (s.wins || 0) + 1; if (peak > (s.best || 0)) s.best = peak; saveStats(s); return s; }

  function injectCSS() {
    if (document.getElementById('dlCSS')) return;
    var s = document.createElement('style'); s.id = 'dlCSS';
    s.textContent = [
      '.dl-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.dl-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.dl-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.dl-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.dl-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.dl-ch{font-weight:700;margin-bottom:8px}',
      '.dl-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.dl-biz{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border-radius:14px;padding:15px 16px;margin:0 0 10px;color:#f2f3f5;cursor:pointer;transition:transform .12s ease,border-color .12s}',
      '.dl-biz:hover{transform:translateY(-2px);border-color:rgba(52,211,153,.5)}',
      '.dl-biz .em{font-size:1.5rem;margin-right:8px;vertical-align:-2px}',
      '.dl-biz b{font-size:1.03rem}',
      '.dl-biz .badge{float:right;font-size:.68rem;font-weight:700;border-radius:20px;padding:3px 9px}',
      '.dl-biz .b-gold{color:#fbbf24;background:rgba(251,191,36,.14);border:1px solid rgba(251,191,36,.3)}',
      '.dl-biz .b-shovel{color:#6ee7b7;background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.3)}',
      '.dl-biz .b-type{color:#93c5fd;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.28)}',
      '.dl-biz small{display:block;margin-top:7px;color:#a7adba;font-size:.88rem;line-height:1.5}',
      '.dl-biz .money{margin-top:6px;font-size:.82rem;color:#9ca3af}',
      // выбор стратегии
      '.dl-grp{margin:0 0 14px}',
      '.dl-grp>.lbl{font-weight:700;font-size:.95rem;margin:0 0 8px}',
      '.dl-opt{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:12px;padding:12px 14px;margin:0 0 8px;color:#e5e7eb;cursor:pointer;font-size:.95rem}',
      '.dl-opt.on{border-color:#10b981;background:rgba(16,185,129,.16);color:#fff}',
      '.dl-opt b{font-weight:700}.dl-opt span{display:block;color:#9ca3af;font-size:.85rem;margin-top:3px}',
      '.dl-opt.on span{color:#a7f3d0}',
      // панель метрик
      '.dl-hud{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px}',
      '.dl-m{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 12px}',
      '.dl-m .k{font-size:.72rem;color:#9ca3af}',
      '.dl-m .v{font-size:1.1rem;font-weight:800;margin-top:2px}',
      '.dl-m .v.g{color:#34d399}.dl-m .v.r{color:#f87171}',
      '.dl-mini{height:5px;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:6px}',
      '.dl-mini i{display:block;height:100%}',
      '.dl-goal{display:flex;justify-content:space-between;font-size:.8rem;color:#9ca3af;margin:0 0 4px}',
      '.dl-bar{height:8px;border-radius:8px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 14px}',
      '.dl-bar i{display:block;height:100%;background:linear-gradient(90deg,#10b981,#0ea5e9);transition:width .3s}',
      '.dl-turn{text-align:center;color:#9ca3af;font-size:.85rem;margin:0 0 8px}',
      // событие
      '.dl-ev{border:1px solid rgba(52,211,153,.35);background:linear-gradient(160deg,rgba(52,211,153,.12),rgba(52,211,153,.03));border-radius:16px;padding:18px;margin:0 0 14px}',
      '.dl-ev .t{font-size:1.15rem;font-weight:800;margin-bottom:8px}',
      '.dl-ev .s{color:#c8ccd4;line-height:1.55}',
      '.dl-eo{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:12px;padding:14px 16px;margin:0 0 9px;color:#f2f3f5;cursor:pointer;font-size:.98rem;line-height:1.4}',
      '.dl-eo:hover{border-color:rgba(52,211,153,.5)}',
      '.dl-eo[disabled]{opacity:.4;cursor:default}',
      '.dl-eo .cost{float:right;color:#f87171;font-size:.82rem;font-weight:700}',
      '.dl-out{border:1px solid rgba(59,130,246,.4);background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(52,211,153,.04));border-radius:14px;padding:15px 16px;margin:0 0 12px;line-height:1.55}',
      '.dl-delta{margin-top:8px;font-size:.9rem;color:#c8ccd4}',
      '.dl-delta .up{color:#34d399;font-weight:700}.dl-delta .dn{color:#f87171;font-weight:700}',
      '.dl-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#10b981,#0ea5e9);box-shadow:0 8px 22px rgba(16,185,129,.35);margin:0 0 10px}',
      '.dl-primary[disabled]{opacity:.5;box-shadow:none;cursor:default}',
      '.dl-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:13px;font-size:.96rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.dl-row{display:flex;gap:10px}.dl-row>*{flex:1;margin-bottom:0}',
      '.dl-advice{border:1px solid rgba(139,92,246,.35);background:rgba(139,92,246,.08);border-radius:12px;padding:12px 14px;margin:0 0 10px;color:#e9d5ff;font-size:.92rem;line-height:1.5}',
      '.dl-end{border-radius:16px;padding:20px;margin:0 0 14px;text-align:center}',
      '.dl-end.win{border:1px solid rgba(52,211,153,.5);background:linear-gradient(135deg,rgba(52,211,153,.16),rgba(14,165,233,.05))}',
      '.dl-end.lose{border:1px solid rgba(239,68,68,.5);background:linear-gradient(135deg,rgba(239,68,68,.14),rgba(0,0,0,.05))}',
      '.dl-end .big{font-size:1.5rem;font-weight:800;margin-bottom:6px}',
      '.dl-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .dl-wrap{color:#1f2430}',
      '[data-theme="light"] .dl-lead,[data-theme="light"] .dl-li{color:#4b5566}',
      '[data-theme="light"] .dl-card,[data-theme="light"] .dl-biz,[data-theme="light"] .dl-m{background:#fff;border-color:rgba(0,0,0,.08);color:#1f2430}',
      '[data-theme="light"] .dl-biz small,[data-theme="light"] .dl-opt span{color:#6b7280}',
      '[data-theme="light"] .dl-opt,[data-theme="light"] .dl-secondary,[data-theme="light"] .dl-eo{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.dl-wrap{padding:14px 12px 96px}.dl-hud{grid-template-columns:1fr 1fr}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ============================================================
  // ХАБ
  // ============================================================
  function home() {
    injectCSS(); ST.screen = 'home'; ST.over = true;
    track('feature_opened', { feature: 'delo' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var rate = s.plays ? Math.round((s.wins || 0) / s.plays * 100) : 0;
      statsHtml = '<div class="dl-card" style="text-align:center"><b style="color:#34d399">Партий: ' + s.plays + ' · выиграно: ' + (s.wins || 0) + ' (' + rate + '%)</b><br><span style="color:#a7adba;font-size:.9rem">Рекорд капитала: ' + money(s.best || 0) + '</span></div>';
    }
    var bizHtml = BIZ.map(function (b) {
      var badge = b.gold ? '<span class="badge b-gold">золотая жила</span>' : b.shovel ? '<span class="badge b-shovel">лопаты</span>' : '<span class="badge b-type">' + esc(b.type) + '</span>';
      return '<button class="dl-biz" onclick="DELO.pick(\'' + b.id + '\')">' + badge +
        '<span class="em">' + b.em + '</span><b>' + esc(b.name) + '</b>' +
        '<small>' + esc(b.tip) + '</small>' +
        '<div class="money">Старт: ' + money(b.start) + ' · базовый доход ~' + money(b.inc) + '/мес</div></button>';
    }).join('');
    c.innerHTML =
      '<div class="dl-wrap">' +
        '<button class="dl-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="dl-h1">💼 Своё дело</div>' +
        '<div class="dl-lead">Бизнес-симулятор один на один с Фреди. Выбираешь дело, продумываешь <b>стратегию</b>, а потом 12 месяцев ведёшь его — и жизнь подкидывает проблемы, которые надо решать. Цель — вырастить капитал до <b>1,5 млн ₽</b>, не обанкротившись. Проверь, ты старатель или тот, кто продаёт старателям лопаты.</div>' +
        statsHtml +
        '<div class="dl-card" style="border-color:rgba(251,191,36,.3)"><div class="dl-ch">⛏️ Урок золотой лихорадки</div><div class="dl-li">В Калифорнии 1849-го большинство старателей разорились. А разбогатели те, кто продавал им лопаты, джинсы и провизию (Сэмюэл Бреннан, Levi Strauss). В игре этот выбор — «копать золото или продавать лопаты» — встретится не раз. Решай с умом.</div></div>' +
        '<div class="dl-ch" style="margin:4px 0 10px">Выбери, чем займёшься:</div>' +
        bizHtml +
      '</div>';
  }

  function pick(id) {
    ST.biz = BIZ.filter(function (b) { return b.id === id; })[0]; if (!ST.biz) return;
    ST.strat = { pos: null, inv: null, bet: null };
    ST.screen = 'strat';
    vibe(20);
    strategy();
  }

  // ============================================================
  // СТРАТЕГИЯ
  // ============================================================
  function strategy() {
    injectCSS();
    var b = ST.biz; if (!b) return home();
    var ready = ST.strat.pos && ST.strat.inv && ST.strat.bet;
    var grp = function (key) {
      var g = STRAT[key];
      return '<div class="dl-grp"><div class="lbl">' + esc(g.title) + '</div>' +
        g.opts.map(function (o) {
          var on = ST.strat[key] === o.k;
          return '<button class="dl-opt' + (on ? ' on' : '') + '" onclick="DELO.setStrat(\'' + key + '\',\'' + o.k + '\')"><b>' + esc(o.name) + '</b><span>' + esc(o.d) + '</span></button>';
        }).join('') + '</div>';
    };
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="dl-wrap">' +
        '<button class="dl-ghost" onclick="DELO.home()">← Сменить дело</button>' +
        '<div class="dl-h1">' + b.em + ' ' + esc(b.name) + '</div>' +
        '<div class="dl-lead" style="margin-bottom:14px">Разработай стратегию — от неё зависят стартовые условия и то, как ты переживёшь удары. Три решения:</div>' +
        grp('pos') + grp('inv') + grp('bet') +
        '<button class="dl-primary" onclick="DELO.launch()"' + (ready ? '' : ' disabled') + '>▶ Запустить дело</button>' +
        (ready ? '' : '<div class="dl-flag">Выбери по одному варианту в каждом блоке</div>') +
      '</div>';
  }
  function setStrat(key, k) { ST.strat[key] = k; vibe(12); strategy(); }

  function stratOpt(key) { return STRAT[key].opts.filter(function (o) { return o.k === ST.strat[key]; })[0]; }

  // ============================================================
  // ЗАПУСК: применяем стратегию, разбор от Фреди
  // ============================================================
  async function launch() {
    if (!(ST.strat.pos && ST.strat.inv && ST.strat.bet)) return;
    var b = ST.biz;
    var pos = stratOpt('pos'), inv = stratOpt('inv'), bet = stratOpt('bet');
    ST.money = b.start;
    ST.inc = Math.round(b.inc * (1 + pos.inc) + inv.inc + bet.inc);
    ST.rep = clamp(50 + pos.rep + inv.rep + bet.rep, 0, 100);
    ST.stab = clamp(50 + pos.stab + inv.stab + bet.stab, 0, 100);
    ST.turn = 1; ST.over = false; ST.outcome = null; ST.peak = ST.money;
    ST.queue = shuffle(EVENTS); ST.qi = 0;
    ST.screen = 'brief';
    track('game_round_start', { feature: 'delo', biz: b.id });
    vibe(30);

    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="dl-wrap">' +
        '<div class="dl-h1">' + b.em + ' Запуск: ' + esc(b.name) + '</div>' +
        hud() +
        '<div class="dl-advice" id="dlBrief">🧠 Фреди изучает твою стратегию…</div>' +
        '<button class="dl-primary" onclick="DELO.firstTurn()">Поехали — месяц 1 →</button>' +
      '</div>';

    var txt = '';
    try {
      var p = 'Ты — Фреди, деловой наставник (российские реалии). Игрок открывает дело: «' + b.name + '» (' + b.type + '). Его стратегия: позиционирование — ' + pos.name + '; вложения — ' + inv.name + '; главная ставка — ' + bet.name + '. В 3-4 коротких фразах по-русски, на «ты», без воды: сильная сторона такой связки, её главный риск и на что смотреть в первую очередь. Если ставка — «копать золото», мягко напомни про урок «продавай лопаты». Без вступлений.';
      var r = await aiGenerate(p, { max_tokens: 240 });
      txt = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { txt = ''; }
    var el = document.getElementById('dlBrief');
    if (el) el.innerHTML = '💬 <b>Фреди:</b> ' + (txt ? esc(txt).replace(/\n/g, '<br>') : 'Стратегия принята. Держи баланс между ростом и подушкой — банкротят не слабые продажи, а кассовые разрывы. Погнали.');
  }

  function firstTurn() { ST.screen = 'play'; ST.outcome = null; nextEvent(); turn(); }

  // ============================================================
  // ХОД
  // ============================================================
  function hud() {
    var goalPct = clamp(ST.money / GOAL * 100, 0, 100);
    return '<div class="dl-turn">Месяц ' + ST.turn + ' из ' + MAXTURN + '</div>' +
      '<div class="dl-goal"><span>Капитал</span><span>Цель: ' + money(GOAL) + '</span></div>' +
      '<div class="dl-bar"><i style="width:' + goalPct + '%"></i></div>' +
      '<div class="dl-hud">' +
        '<div class="dl-m"><div class="k">💰 Капитал</div><div class="v ' + (ST.money < 0 ? 'r' : 'g') + '">' + money(ST.money) + '</div></div>' +
        '<div class="dl-m"><div class="k">📈 Доход/мес</div><div class="v ' + (ST.inc < 0 ? 'r' : '') + '">' + money(ST.inc) + '</div></div>' +
        '<div class="dl-m"><div class="k">⭐ Репутация</div><div class="v">' + ST.rep + '</div><div class="dl-mini"><i style="width:' + ST.rep + '%;background:#fbbf24"></i></div></div>' +
        '<div class="dl-m"><div class="k">🛡️ Устойчивость</div><div class="v">' + ST.stab + '</div><div class="dl-mini"><i style="width:' + ST.stab + '%;background:#34d399"></i></div></div>' +
      '</div>';
  }

  function nextEvent() {
    if (ST.qi >= ST.queue.length) { ST.queue = shuffle(EVENTS); ST.qi = 0; }
    ST.ev = ST.queue[ST.qi++]; ST.outcome = null;
  }

  function turn() {
    injectCSS();
    var c = container(); if (!c) return;
    var ev = ST.ev;
    var opts = ev.o.map(function (o, i) {
      var afford = !o.need || ST.money >= o.need;
      var cost = o.need ? '<span class="cost">нужно ' + money(o.need) + '</span>' : '';
      return '<button class="dl-eo"' + (afford ? '' : ' disabled') + ' onclick="DELO.choose(' + i + ')">' + cost + esc(o.t) + '</button>';
    }).join('');
    c.innerHTML =
      '<div class="dl-wrap">' +
        hud() +
        '<div class="dl-ev"><div class="t">' + esc(ev.t) + '</div><div class="s">' + esc(ev.s) + '</div></div>' +
        opts +
        '<button class="dl-secondary" onclick="DELO.advice()" id="dlAdvBtn">🤔 Спросить совета у Фреди</button>' +
        '<div id="dlAdv"></div>' +
      '</div>';
  }

  async function advice() {
    if (ST.aiBusy) return; ST.aiBusy = true;
    var btn = document.getElementById('dlAdvBtn'), box = document.getElementById('dlAdv');
    if (btn) { btn.textContent = '🤔 Фреди думает…'; btn.disabled = true; }
    var ev = ST.ev, txt = '';
    try {
      var p = 'Ты — Фреди, деловой наставник. Бизнес игрока: «' + ST.biz.name + '». Показатели: капитал ' + money(ST.money) + ', доход ' + money(ST.inc) + '/мес, репутация ' + ST.rep + '/100, устойчивость ' + ST.stab + '/100. Ситуация: «' + ev.t + ' — ' + ev.s + '». Варианты игрока: ' + ev.o.map(function (o) { return '«' + o.t + '»'; }).join('; ') + '. В 2-3 фразах по-русски, на «ты», подскажи, на что смотреть при выборе (не решай за него жёстко, дай рамку мышления). Без вступлений.';
      var r = await aiGenerate(p, { max_tokens: 200 });
      txt = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { txt = ''; }
    ST.aiBusy = false;
    if (btn) btn.style.display = 'none';
    if (box) box.innerHTML = '<div class="dl-advice">💬 <b>Фреди:</b> ' + (txt ? esc(txt).replace(/\n/g, '<br>') : 'Смотри на подушку: если устойчивость низкая — не рискуй последним кэшем. Если репутация — твой мотор, защищай её.') + '</div>';
  }

  function choose(i) {
    var ev = ST.ev, o = ev.o[i]; if (!o) return;
    if (o.need && ST.money < o.need) { toast('Не хватает капитала на этот вариант', 'info'); return; }
    var d = { m: o.m || 0, i: o.i || 0, r: o.r || 0, b: o.b || 0 };
    ST.money += d.m; ST.inc += d.i; ST.rep = clamp(ST.rep + d.r, 0, 100); ST.stab = clamp(ST.stab + d.b, 0, 100);
    ST.outcome = { out: o.out, d: d };
    vibe(18);
    track('message_sent', { feature: 'delo', ev: ev.id });
    renderOutcome();
  }

  function renderOutcome() {
    var c = container(); if (!c) return;
    var d = ST.outcome.d;
    var chip = function (label, val, unit) {
      if (!val) return '';
      var cls = val > 0 ? 'up' : 'dn';
      return '<span class="' + cls + '">' + label + ' ' + (val > 0 ? '+' : '') + (unit === '₽' ? money(val).replace(' ₽', '') : val) + '</span> ';
    };
    var deltas = chip('💰', d.m, '₽') + chip('📈', d.i, '₽') + chip('⭐', d.r, '') + chip('🛡️', d.b, '');
    c.innerHTML =
      '<div class="dl-wrap">' +
        hud() +
        '<div class="dl-out">' + esc(ST.outcome.out || 'Решение принято.') +
          (deltas.trim() ? '<div class="dl-delta">Итог: ' + deltas + '</div>' : '') + '</div>' +
        '<button class="dl-primary" onclick="DELO.close()">' + (ST.turn >= MAXTURN ? 'Подвести итоги →' : 'Закрыть месяц →') + '</button>' +
      '</div>';
    checkOver(false);
  }

  // закрыть месяц: доход, проверки, следующий ход
  function close() {
    if (ST.over) return;
    // доход месяца: репутация — сильный множитель (клиенты идут на имя), минус постоянные издержки
    var repF = 0.35 + ST.rep / 85;   // rep 0→0.35, 50→0.94, 100→1.53
    var seasonF = 1 + 0.12 * Math.sin(ST.turn / 1.9);
    var overhead = Math.round(ST.biz.start * 0.05) + 10; // аренда, зарплаты, налоги — платишь всегда
    var earned = Math.round(ST.inc * repF * seasonF) - overhead;
    ST.money += earned;
    // хрупкость: низкая устойчивость — удары тем сильнее, чем ниже подушка (спираль краха)
    var shock = 0;
    if (ST.stab < 35) { shock = -Math.round((35 - ST.stab) * (1.0 + Math.random())); ST.money += shock; }
    if (ST.rep < 15) { shock -= 20; ST.money -= 20; } // репутация рухнула — клиенты разбежались
    if (ST.money > ST.peak) ST.peak = ST.money;
    if (checkOver(true)) return;
    ST.turn++;
    if (ST.turn > MAXTURN) { endGame(); return; }
    nextEvent(); turn();
    if (earned || shock) toast('Месяц закрыт: доход ' + money(earned) + (shock ? ', форс-мажор ' + money(shock) : ''), 'info');
  }

  function checkOver(afterIncome) {
    if (ST.over) return true;
    if (ST.money < BUST) { endGame(); return true; }
    if (afterIncome && ST.money >= GOAL) { endGame(); return true; }
    return false;
  }

  // ============================================================
  // ИТОГ
  // ============================================================
  async function endGame() {
    if (ST.over) return; ST.over = true; ST.screen = 'end';
    var won = ST.money >= GOAL, bust = ST.money < BUST;
    var st = recordEnd(won, Math.max(ST.peak, ST.money));
    vibe(won ? [40, 40, 80] : [80]);
    var title = won ? '🏆 Цель достигнута!' : bust ? '💀 Банкротство' : '🏁 Год пройден';
    var sub = won ? 'Ты вырастил капитал до ' + money(ST.money) + ' — дело состоялось!'
      : bust ? 'Кассовые разрывы утопили дело. Капитал ушёл в минус (' + money(ST.money) + ').'
      : 'За 12 месяцев капитал: ' + money(ST.money) + '. До цели ' + money(GOAL) + ' не дотянул, но опыт бесценен.';
    var cls = won ? 'win' : bust ? 'lose' : (ST.money > ST.biz.start ? 'win' : 'lose');
    var betK = ST.strat.bet;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="dl-wrap">' +
        '<div class="dl-end ' + cls + '"><div class="big">' + title + '</div><div>' + esc(sub) + '</div></div>' +
        hud() +
        '<div class="dl-advice" id="dlDebrief">🧠 Фреди разбирает твой путь…</div>' +
        '<div class="dl-row"><button class="dl-primary" onclick="DELO.home()" style="margin:0">🔁 Новое дело</button><button class="dl-secondary" onclick="(window.showKonturScreen||function(){})()">К играм</button></div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'delo', biz: ST.biz.id, won: won, money: ST.money });

    var txt = '';
    try {
      var p = 'Ты — Фреди, деловой наставник. Игрок закончил партию в бизнес-симуляторе. Дело: «' + ST.biz.name + '». Стратегия: ' + stratOpt('pos').name + ' / ' + stratOpt('inv').name + ' / ' + stratOpt('bet').name + '. Итог: капитал ' + money(ST.money) + ' из цели ' + money(GOAL) + ', репутация ' + ST.rep + ', устойчивость ' + ST.stab + '. Результат: ' + (won ? 'победа' : bust ? 'банкротство' : 'год пройден без победы') + '. В 4-5 фразах по-русски, на «ты», тепло, но по делу: что в его стратегии сработало, где была уязвимость, и один принцип на будущее. ' + (betK === 'dig' ? 'Обязательно свяжи с уроком «во время золотой лихорадки выгоднее продавать лопаты, чем копать».' : betK === 'shovel' ? 'Отметь, что ставка на «лопаты» — мудрый ход снабженца.' : '') + ' Без вступлений.';
      var r = await aiGenerate(p, { max_tokens: 320 });
      txt = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { txt = ''; }
    var el = document.getElementById('dlDebrief');
    if (el) el.innerHTML = '💬 <b>Фреди:</b> ' + (txt ? esc(txt).replace(/\n/g, '<br>') : (won ? 'Ты удержал баланс роста и подушки — так и делаются дела. Дальше пробуй сложнее.' : 'Главная причина провалов — не слабые продажи, а нехватка подушки в момент удара. В следующий раз держи резерв и помни про «лопаты»: снабжать старателей часто выгоднее, чем самому копать.'));
  }

  // ---------- экспорт ----------
  window.DELO = {
    home: home, pick: pick, setStrat: setStrat, launch: launch, firstTurn: firstTurn,
    choose: choose, close: close, advice: advice, getState: function () { return ST; }
  };
  window.showDeloGame = home;
  console.log('✅ delo.js loaded (игра «Своё дело»)');
})();
