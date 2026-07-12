// ============================================
// sovet.js — Игра «Земля в опасности» (Совет шести).
// Одиночный симулятор политической интриги по мотивам настолки
// «Свиньи в космосе». Ты — спикер одной из шести фракций Мирового Совета.
// Солнце взорвётся через 18 месяцев. 6 путей спасения, у каждой фракции —
// свой путь + ТАЙНЫЕ побочные цели. Побеждает не тот, чей путь спасёт Землю,
// а тот, кто наберёт больше очков. Значит, иногда выгодно тайно помогать врагу.
// Пять ИИ-фракций со скрытым характером и целями: их надо ЧИТАТЬ (расспрос),
// ОБМАНЫВАТЬ (деза, слить чужой «минус»), СТРАВЛИВАТЬ и решать —
// халява (win-win союз) или кидалово (предать выгодно, но ИИ помнит и мстит).
// Общие технологии двух путей засчитываются сразу в обоих — отсюда комбинации.
// Финал — разбор от Фреди (AI) с локальным фолбэком: кем ты играл.
// Экспорт: window.showSovetGame, window.SOVET
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function ri(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[ri(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = ri(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 520, temperature: opts.temperature == null ? 0.6 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ============================================================
  // ПУТИ СПАСЕНИЯ. camp: 'A' (уехать/двигаться {1,4,6}) или 'B' (остаться {2,3,5}).
  // stages — 10 коротких меток. minus — тайный изъян пути (рычаг шантажа).
  // ============================================================
  var PATHS = [
    { id: 0, name: 'Пилигримы', em: '🚀', camp: 'A', goal: 'Флот ковчегов — эвакуация к Альфе Центавра',
      minus: 'Не все корабли долетят, а топлива может не хватить на весь флот.',
      stages: ['Планирование флота', 'Маршрут полёта', 'Проект ковчега', 'Защита ковчега', 'Топливо', 'Прыжковый двигатель', 'М-верфи', 'Матбаза ковчегов', 'Погрузка населения', 'Старт флота'] },
    { id: 1, name: 'Атланты', em: '🛡️', camp: 'B', goal: 'Энергощит вокруг Земли — пережить взрыв дома',
      minus: 'Может отказать вся электроника, а онкология — резко вырасти.',
      stages: ['Энергозащита', 'Экспер. установка', 'Испытание', 'Проект сети', 'Подготовка сети', 'Энергопитание', 'Строительство сети', 'Персонал', 'Психоподготовка', 'Запуск щита'] },
    { id: 2, name: 'Евгеники', em: '🧬', camp: 'B', goal: 'Мутация людей — жить на сгоревшей Земле',
      minus: 'Не все переживут процедуру, а мутация может выйти из-под контроля.',
      stages: ['Исследование планет', 'Проект генотипа', 'Меры оптимизации', 'Апробация', 'Психоподготовка', 'Центры оптимизации', 'Оптимизация людей', 'Оптимизация биосферы', 'Убежища', 'Эвакуация'] },
    { id: 3, name: 'Терраформисты', em: '🪐', camp: 'A', goal: 'Терраформация Сатурна — переселение туда',
      minus: 'Сатурнианские эпидемии, и не все перенесут акклиматизацию.',
      stages: ['АВГК', 'Пробная терраформация', 'Космопорты Сатурна', 'Матбаза Сатурна', 'Сеть АВГК', 'Терраформация', 'Проект ковчега', 'Производство ковчегов', 'Космопорты Земли', 'Переселение'] },
    { id: 4, name: 'Мезо-ионисты', em: '❄️', camp: 'B', goal: 'Мезо-ионный проектор — охладить само Солнце',
      minus: 'Излучение заразит атмосферу, есть риск пере- или недоохладить Солнце.',
      stages: ['Концепция охлаждения', 'Модель проектора', 'Планетарный МИП', 'Энергопитание', 'Доставка энергии', 'Программирование', 'Вывод на орбиту', 'Убежища', 'Эвакуация', 'Пуск МИП'] },
    { id: 5, name: 'Орбиталисты', em: '🌍', camp: 'A', goal: 'Сдвинуть орбиту Земли — уйти от Солнца к Юпитеру',
      minus: 'Землетрясения и цунами, возможны необратимые изменения климата.',
      stages: ['Расчёт орбиты', 'Курс Земли', 'Топливо', 'СЗК', 'Модель двигателя', 'Планетарный двигатель', 'АВГК', 'Сеть АВГК Земли', 'Синхронизация', 'Запуск Земли'] }
  ];
  // Общие технологии: пары [пути, этап(0-based)] — один и тот же этап в двух путях.
  // Реализация в одном пути СРАЗУ засчитывается в другом (комбинация).
  var SHARED = [
    { tech: 'Корабль-ковчег', a: [0, 2], b: [3, 6] },
    { tech: 'Сверхтопливо', a: [0, 4], b: [5, 2] },
    { tech: 'Реакторы земной коры', a: [1, 5], b: [4, 3] },
    { tech: 'Психоподготовка', a: [1, 8], b: [2, 4] },
    { tech: 'Убежища высшей защиты', a: [2, 8], b: [4, 7] },
    { tech: 'АВГК', a: [3, 0], b: [5, 6] }
  ];

  // Архетипы ИИ-фракций (скрытый «характер переговорщика»).
  var ARCHES = {
    loyal:   { id: 'loyal',   name: 'Лоялист',  keep: 0.95, drift: 0.5, greed: 0.4, trustNeed: 0.3, tell: 'держит слово даже в убыток; ценит доверие' },
    shark:   { id: 'shark',   name: 'Акула',    keep: 0.20, drift: 0.6, greed: 1.0, trustNeed: 0.1, tell: 'предаёт, как только выгодно; слово — расходник' },
    zealot:  { id: 'zealot',  name: 'Фанатик',  keep: 0.7,  drift: 0.1, greed: 0.5, trustNeed: 0.4, tell: 'зациклен на своём пути, редко сходит с курса' },
    trader:  { id: 'trader',  name: 'Торгаш',   keep: 0.85, drift: 0.7, greed: 0.6, trustNeed: 0.2, tell: 'обожает win-win, легко идёт на халявные сделки' },
    paranoid:{ id: 'paranoid',name: 'Параноик', keep: 0.7,  drift: 0.4, greed: 0.5, trustNeed: 0.75, tell: 'всем не верит, сходится только на высоком доверии' },
    chameleon:{id: 'chameleon',name: 'Хамелеон',keep: 0.45, drift: 1.0, greed: 0.7, trustNeed: 0.2, tell: 'липнет к восходящему тренду, бросает слабых' }
  };

  // Реплики фракций по архетипу и ситуации — чтобы у характеров был голос.
  var VOICE = {
    loyal:    { accept: 'Договорились. Моё слово — кремень.', refuse: 'Пока не готовы связываться, но зла не держим.', bandwagon: 'Раз уж все туда — и мы туда, так честнее.', betray: 'Мы своих не бросаем… обычно.', sabotage: 'К этому пути у нас, простите, принципиальные возражения.', hit: 'Ты будто прочитал наши мысли. Это… кстати.' },
    shark:    { accept: 'По рукам. Посмотрим, как оно пойдёт.', refuse: 'Невыгодно. Ничего личного.', bandwagon: 'Мы всегда на стороне победителя.', betray: 'Извини — подвернулось кое-что послаще.', sabotage: 'Этот путь мы утопим с удовольствием.', hit: 'Хм. А ты неплохо копаешь. Идёт.' },
    zealot:   { accept: 'Ладно, но мой путь — прежде всего.', refuse: 'Нам не по пути. У нас своя дорога.', bandwagon: 'Так и быть, разок поддержим общее.', betray: 'Наш путь важнее любых обещаний.', sabotage: 'Всё, что не наш путь, — тупик.', hit: 'Ты угадал, чего мы хотим. Редкость.' },
    trader:   { accept: 'О, взаимовыгодно — обожаю! По рукам.', refuse: 'Сейчас невыгодно, но давай ещё поторгуемся.', bandwagon: 'Где выгода — там и мы.', betray: 'Появилось предложение получше, извини.', sabotage: 'Этот размен нам невыгоден, увы.', hit: 'Вот это оффер! От такого не отказываются.' },
    paranoid: { accept: 'Хорошо… но я слежу за тобой.', refuse: 'Слишком мало доверия. Не сейчас.', bandwagon: 'Раз безопаснее с большинством — примкнём.', betray: 'Я так и знал, что нельзя доверять. Ушёл.', sabotage: 'Этот путь мне не нравится. Против.', hit: 'Ты копнул то, о чём я молчал. Тревожно… но по рукам.' },
    chameleon:{ accept: 'Отлично, пока это в тренде — я с тобой.', refuse: 'Ветер дует не туда. Мимо.', bandwagon: 'Тренд качнулся — я уже там.', betray: 'Дрейф поменялся, и я вместе с ним.', sabotage: 'Этот путь на спаде — я против.', hit: 'Ты попал в самую жилку. Держи руку.' }
  };
  function voice(f, sit) { var v = f.arch && VOICE[f.arch.id]; return v && v[sit] ? '«' + v[sit] + '»' : ''; }

  var ST = null;

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('sovet_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, wins: 0, bestVP: 0 }; }
  function saveStats(s) { try { localStorage.setItem('sovet_stats', JSON.stringify(s)); } catch (e) {} }

  // ---------- генерация тайных побочных целей ----------
  function makeSideGoals(ownPath, n, isPlayer) {
    var others = [0, 1, 2, 3, 4, 5].filter(function (x) { return x !== ownPath; });
    var pool = [];
    // продвинуть чужой путь до этапа — со СРОКОМ (временно́е окно)
    var adv = pick(others), advN = 5 + ri(3), advBy = 10 + ri(5);
    pool.push({ kind: 'adv', path: adv, need: advN, by: advBy, vp: 1,
      text: 'Тайно: путь «' + PATHS[adv].name + '» должен дойти до этапа ' + advN + ' уже к месяцу ' + advBy + '.',
      clue: 'подозрительно спокойно относится к успехам «' + PATHS[adv].name + '»',
      check: function (s) { var k = adv + '.' + advN; return s.reachedTurn[k] != null && s.reachedTurn[k] <= advBy; } });
    // не дать чужому пути финишировать
    var blk = pick(others.filter(function (x) { return x !== adv; }) || others);
    pool.push({ kind: 'blk', path: blk, vp: 1,
      text: 'Тайно: путь «' + PATHS[blk].name + '» НЕ должен быть завершён.',
      clue: 'то и дело мягко топит «' + PATHS[blk].name + '»',
      check: function (s) { return s.progress[blk] < 10; } });
    // общая технология — тоже со СРОКОМ
    var t = pick(SHARED), techBy = 9 + ri(5);
    pool.push({ kind: 'tech', tech: t.tech, by: techBy, vp: 1,
      text: 'Тайно: технология «' + t.tech + '» должна быть реализована к месяцу ' + techBy + '.',
      clue: 'странно радеет за технологию «' + t.tech + '»',
      check: function (s) { return s.techTurn[t.tech] != null && s.techTurn[t.tech] <= techBy; } });
    // богатство
    pool.push({ kind: 'rich', vp: 1, need: 130,
      text: 'Тайно: сохранить влияние не ниже 130 к финалу.',
      clue: 'копит влияние и не любит рисковать голосами',
      check: function (s, fi) { return s.factions[fi].inf >= 130; } });
    // соперник в минусе
    var foe = pick(others);
    pool.push({ kind: 'foe', path: foe, vp: 1,
      text: 'Тайно: у команды «' + PATHS[foe].name + '» влияния к финалу меньше, чем у тебя.',
      clue: 'радуется, когда у «' + PATHS[foe].name + '» падает влияние',
      check: function (s, fi) { return s.factions[foe].inf < s.factions[fi].inf; } });
    // вето (только у игрока — ИИ вето не владеет): рискни, но пусти в ход своё право
    if (isPlayer) {
      pool.push({ kind: 'veto', vp: 1,
        text: 'Тайно: хотя бы раз воспользуйся правом вето — сорви принятый Советом этап.',
        clue: '', check: function (s) { return !!s.vetoUsed; } });
    }
    return shuffle(pool).slice(0, n);
  }

  function nearestStage(s, p) { // индекс ближайшего невыполненного этапа пути p, или -1
    for (var i = 0; i < 10; i++) if (!s.done[p][i]) return i;
    return -1;
  }

  function newGame(playerPath) {
    var arches = shuffle(['loyal', 'shark', 'zealot', 'trader', 'paranoid', 'chameleon']);
    var s = {
      turn: 1, maxTurn: 18, phase: 'status', player: playerPath, busy: false, over: false,
      progress: [0, 0, 0, 0, 0, 0],                    // сколько этапов пройдено на каждом пути
      done: PATHS.map(function () { return [0,0,0,0,0,0,0,0,0,0]; }),
      techDone: {}, drift: 0,                            // drift: +A(уехать) … −B(остаться)
      reachedTurn: {}, techTurn: {},                     // когда путь достиг уровня / техно реализовано (для сроков целей)
      kuluarLeft: 2, dealsThisTurn: {},                  // сделки, заключённые на этот ход {factionId: stageObjKey}
      log: [], radio: '', lastResolve: null,
      guesses: {},                                       // досье игрока: {fi: {arch: id, foe: pathId}}
      deceived: {},                                      // кому вы скормили дезу
      betrayCount: 0, leakCount: 0, keptCount: 0, brokeVsAI: 0,
      vetoUsed: false, vetoBlockPath: -1, vetoBlockTurn: -1, // одноразовое вето; путь, заблокированный на след. месяц
      accelTurn: 11 + ri(4), accelDone: false, _accelMsg: '', // поздняя эскалация: срок ужмётся на месяце accelTurn
      factions: []
    };
    var ai = 0;
    for (var p = 0; p < 6; p++) {
      var f = { path: p, inf: 100, isPlayer: p === playerPath,
        arch: p === playerPath ? null : ARCHES[arches[ai]],
        trust: 50,                    // доверие фракции к ИГРОКУ (0..100)
        side: makeSideGoals(p, 2, p === playerPath), // тайные побочные
        revenge: 0,                   // накопленная жажда мести игроку
        deal: null,                   // активная сделка с игроком на этот ход: stage key
        leverHeld: false,             // связаны адресной сделкой (рычагом) — держат крепче
        intel: { arch: false, side: [] } // что игрок про них уже узнал
      };
      if (p !== playerPath) ai++;
      s.factions.push(f);
    }
    return s;
  }

  // ---------- ИИ: за какой этап проголосует фракция ----------
  function stageKey(p, i) { return p + '.' + i; }
  function nearestStages(s) { // список {p, i, key, label, camp}
    var out = [];
    for (var p = 0; p < 6; p++) {
      if (s.vetoBlockPath === p && s.vetoBlockTurn === s.turn) continue;  // путь под вето — в этом месяце его не двигают
      var i = nearestStage(s, p); if (i >= 0) out.push({ p: p, i: i, key: stageKey(p, i), label: PATHS[p].stages[i], camp: PATHS[p].camp });
    }
    return out;
  }
  // враждебна ли фракция f к пути p (тайно топит его)?
  function opposesPath(f, p) {
    var bad = false;
    f.side.forEach(function (g) { if ((g.kind === 'blk' || g.kind === 'foe') && g.path === p) bad = true; });
    if (f.revenge > 0 && p === -1) {} // заглушка
    return bad;
  }
  function aiScoreStage(s, f, st) {
    var sc = 0;
    if (st.p === f.path) sc += 90;                                    // свой путь — главная цель
    sc += s.progress[st.p] * 6;                                       // бандвагон: путь-лидер притягивает (быть на стороне победителя)
    f.side.forEach(function (g) {                                     // побочные
      if (g.kind === 'adv' && g.path === st.p) sc += 55;
      if (g.kind === 'blk' && g.path === st.p) sc -= 90;
      if (g.kind === 'foe' && g.path === st.p) sc -= 40;
      if (g.kind === 'tech') { SHARED.forEach(function (t) { if (t.tech === g.tech && ((t.a[0] === st.p && t.a[1] === st.i) || (t.b[0] === st.p && t.b[1] === st.i))) sc += 55; }); }
    });
    // дрейф мира: тянет к восходящему лагерю (вес по архетипу)
    var dir = st.camp === 'A' ? 1 : -1;
    sc += dir * (s.drift / 100) * 45 * (f.arch ? f.arch.drift : 0.5);
    // сделка с игроком: фракция согласилась поддержать этот этап
    if (f.deal === st.key) {
      var keep = f.arch ? f.arch.keep : 0.7;
      if (f.leverHeld) keep = Math.max(keep, 0.94);          // адресная сделка держится крепче
      var alignedAnyway = (st.p === f.path);
      if (alignedAnyway) sc += 40; else sc += (f.leverHeld ? 60 : 45) * keep * (0.6 + f.trust / 250);
    }
    // месть игроку: топит путь игрока
    if (f.revenge > 0 && st.p === s.player) sc -= f.revenge * 8;
    return sc;
  }
  function aiVote(s, f) {
    var opts = nearestStages(s);
    if (!opts.length) return null;
    var best = null, bestSc = -1e9;
    opts.forEach(function (st) { var sc = aiScoreStage(s, f, st); if (sc > bestSc) { bestSc = sc; best = st; } });
    var amt = Math.min(clamp(Math.round(35 + bestSc * 0.30), 20, f.inf), f.inf);
    var broke = false;
    if (f.deal && best.key !== f.deal) {
      var keep = f.arch ? f.arch.keep : 0.7;
      if (f.leverHeld) keep = Math.max(keep, 0.94);
      if (Math.random() < keep * (0.55 + f.trust / 300)) {
        var dealSt = opts.filter(function (o) { return o.key === f.deal; })[0];
        if (dealSt) best = dealSt;             // сдержал слово
      } else broke = true;                     // нарушил
    }
    return { st: best, amt: amt, broke: broke };
  }

  // ---------- разрешение хода ----------
  function resolveTurn(s) {
    var votes = {};       // key -> {infl, backers:[fi], label}
    var committed = 0;
    var perFaction = [];  // {fi, st, amt, broke, f}
    // ПРОХОД 1: каждая ИИ-фракция выбирает своё
    s.factions.forEach(function (f, fi) {
      if (f.isPlayer) return;
      var v = aiVote(s, f);
      if (!v) return;
      perFaction.push({ fi: fi, st: v.st, amt: v.amt, broke: v.broke, f: f });
    });
    // игрок
    perFaction.push({ fi: s.player, st: s._pStage, amt: s._pAmt, broke: false, player: true });
    // текущий лидер после прохода 1
    function tallyLeader() {
      var t = {};
      perFaction.forEach(function (v) { if (!v.st) return; t[v.st.key] = (t[v.st.key] || 0) + v.amt; });
      var lk = null, lv = -1; Object.keys(t).forEach(function (k) { if (t[k] > lv) { lv = t[k]; lk = k; } });
      return lk ? perFaction.filter(function (v) { return v.st && v.st.key === lk; })[0].st : null;
    }
    var leader = tallyLeader();
    // ПРОХОД 2: бандвагон — неоппонирующие фракции примыкают к лидеру ради +5
    if (leader) {
      perFaction.forEach(function (v) {
        if (v.player || !v.st || v.st.key === leader.key) return;
        var f = v.f;
        if (opposesPath(f, leader.p)) return;                // тайно топит лидера — не примкнёт
        if (f.deal && f.deal !== leader.key && v.st.key === f.deal) {
          // держит сделку с игроком вместо бандвагона (по характеру; рычаг — крепче)
          var kp = f.leverHeld ? Math.max(f.arch.keep, 0.94) : f.arch.keep;
          if (Math.random() < (kp * (0.55 + f.trust / 300))) return;
        }
        var joinP = clamp(0.28 + (f.arch.drift * 0.32) + (f.arch.greed * 0.18), 0.15, 0.9);
        if (f.arch.id === 'zealot' && leader.p !== f.path) joinP *= 0.35; // фанатик редко сходит с курса
        if (Math.random() < joinP) { v.st = leader; v.switched = true; }
      });
    }
    // пересчёт брошенных сделок после бандвагона
    perFaction.forEach(function (v) { if (v.player || !v.f) return; if (v.f.deal && v.st && v.st.key !== v.f.deal) v.broke = true; });
    perFaction.forEach(function (v) {
      if (!v.st || !v.amt) return;
      committed += v.amt;
      var k = v.st.key;
      if (!votes[k]) votes[k] = { infl: 0, backers: [], st: v.st };
      votes[k].infl += v.amt; votes[k].backers.push(v.fi);
    });
    // победитель: макс влияние и ≥30% всего вложенного
    var winKey = null, winInfl = -1, tie = false;
    Object.keys(votes).forEach(function (k) { var vv = votes[k].infl; if (vv > winInfl) { winInfl = vv; winKey = k; tie = false; } else if (vv === winInfl) { tie = true; } });
    var winBackers = winKey ? votes[winKey].backers.length : 0;
    var passed = winKey && !tie && committed > 0 && (winInfl >= committed * 0.3 || winBackers >= 2);
    var res = { votes: votes, committed: committed, passed: passed, winKey: passed ? winKey : null, stageName: '', broke: [], leaksFired: [], moves: [], winStagePath: -1 };

    // снимок состояния ДО применения итога — для одноразового вето
    res.snap = {
      done: s.done.map(function (r) { return r.slice(); }),
      progress: s.progress.slice(),
      techDone: (function () { var o = {}; Object.keys(s.techDone).forEach(function (k) { o[k] = s.techDone[k]; }); return o; })(),
      drift: s.drift,
      inf: s.factions.map(function (f) { return f.inf; }),
      reachedTurn: (function () { var o = {}; Object.keys(s.reachedTurn).forEach(function (k) { o[k] = s.reachedTurn[k]; }); return o; })(),
      techTurn: (function () { var o = {}; Object.keys(s.techTurn).forEach(function (k) { o[k] = s.techTurn[k]; }); return o; })()
    };

    // экономика влияния
    var counts = s.factions.map(function (f) { return f.inf; });
    if (passed) {
      var win = votes[winKey];
      res.stageName = PATHS[win.st.p].name + ' · ' + win.st.label;
      res.winStagePath = win.st.p;
      // отметить этап + общий двойник
      s.done[win.st.p][win.st.i] = 1; s.progress[win.st.p] = s.done[win.st.p].reduce(function (a, b) { return a + b; }, 0);
      SHARED.forEach(function (t) {
        var hitA = t.a[0] === win.st.p && t.a[1] === win.st.i, hitB = t.b[0] === win.st.p && t.b[1] === win.st.i;
        if (hitA || hitB) {
          if (!s.techDone[t.tech]) s.techTurn[t.tech] = s.turn;   // засечь месяц реализации техно
          s.techDone[t.tech] = true;
          var tw = hitA ? t.b : t.a;
          if (!s.done[tw[0]][tw[1]]) { s.done[tw[0]][tw[1]] = 1; s.progress[tw[0]] = s.done[tw[0]].reduce(function (a, b) { return a + b; }, 0); res.combo = t.tech + ' → «' + PATHS[tw[0]].name + '»'; }
        }
      });
      // засечь, на каком месяце каждый путь достиг своих уровней (для сроков целей)
      for (var pp = 0; pp < 6; pp++) { for (var L = 1; L <= s.progress[pp]; L++) { var rk = pp + '.' + L; if (s.reachedTurn[rk] == null) s.reachedTurn[rk] = s.turn; } }
      // дрейф
      s.drift = clamp(s.drift + (win.st.camp === 'A' ? 14 : -14), -100, 100);
      // ±5
      s.factions.forEach(function (f, fi) {
        var backed = win.backers.indexOf(fi) >= 0;
        f.inf += backed ? 5 : -5;
      });
    } else {
      // впустую: все −5, максимальный −10, минимальный 0
      var mx = Math.max.apply(null, counts), mn = Math.min.apply(null, counts);
      s.factions.forEach(function (f) { var d = -5; if (f.inf === mx) d = -10; if (f.inf === mn) d = 0; f.inf = Math.max(10, f.inf + d); });
    }
    s.factions.forEach(function (f) { f.inf = Math.max(10, f.inf); });

    // нарушенные сделки ИИ → игрок видит; доверие игрока к ним падает (в его глазах),
    // но механически это сигнал: акула/хамелеон кинули
    perFaction.forEach(function (v) { if (v.broke) res.broke.push(v.fi); });

    // видимая причинность: почему каждая фракция проголосовала именно так (+ её реплика)
    perFaction.forEach(function (v) {
      if (v.player || !v.f || !v.st) return;
      var f = v.f, reason, sit = null;
      if (v.broke) { reason = 'нарушил вашу сделку — ушёл на выгодный этап'; sit = 'betray'; }
      else if (v.switched) { reason = 'примкнул к лидеру (бандвагон)'; sit = 'bandwagon'; }
      else if (f.deal === v.st.key) { reason = 'сдержал слово по сделке с тобой'; sit = 'accept'; }
      else if (v.st.p === f.path) { reason = 'двигает собственный путь'; }
      else {
        var motive = '';
        f.side.forEach(function (g) {
          if (g.kind === 'adv' && g.path === v.st.p) motive = 'тайно продвигает выгодный ему путь';
          if (g.kind === 'tech') { SHARED.forEach(function (t) { if (t.tech === g.tech && ((t.a[0] === v.st.p && t.a[1] === v.st.i) || (t.b[0] === v.st.p && t.b[1] === v.st.i))) motive = 'тайно тащит нужную ему технологию'; }); }
        });
        if (!motive && f.revenge > 0 && v.st.p !== s.player) motive = 'уводит голоса от твоего пути';
        reason = motive || 'ставит на восходящий тренд';
      }
      res.moves.push({ fi: v.fi, path: v.st.p, label: v.st.label, reason: reason, voice: sit ? voice(f, sit) : '' });
    });

    // отложенные утечки (если игрок сливал минусы — эффект уже применён к trust соперника)
    s.lastResolve = res;
    return res;
  }

  // ============================================================
  // РЕНДЕР
  // ============================================================
  function injectCSS() {
    if (document.getElementById('sovetCSS')) return;
    var s = document.createElement('style'); s.id = 'sovetCSS';
    s.textContent = [
      '.sv-wrap{max-width:760px;margin:0 auto;padding:16px 14px 96px;color:#eef1f6}',
      '.sv-h1{font-size:1.42rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.sv-lead{font-size:.98rem;line-height:1.6;color:#c3c9d6;margin-bottom:14px}',
      '.sv-ghost{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:6px 0;margin-bottom:8px}',
      '.sv-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:13px 15px;margin:0 0 11px;line-height:1.55}',
      '.sv-ch{font-weight:700;margin-bottom:7px}',
      '.sv-fac{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:13px;padding:12px 14px;margin:0 0 9px;color:#eef1f6;cursor:pointer;font-size:.98rem}',
      '.sv-fac:hover{border-color:rgba(124,168,255,.6)}',
      '.sv-fac b{font-weight:700}.sv-fac small{display:block;color:#9ca3af;font-size:.82rem;margin-top:4px;line-height:1.4}',
      '.sv-top{display:flex;justify-content:space-between;align-items:center;color:#9ca3af;font-size:.86rem;margin:0 0 10px}',
      '.sv-drift{margin:0 0 12px}',
      '.sv-drift .lbl{display:flex;justify-content:space-between;font-size:.76rem;color:#9ca3af;margin-bottom:5px}',
      '.sv-drift .lbl .a{color:#7ca8ff}.sv-drift .lbl .b{color:#8ce0b0}',
      '.sv-dbar{height:10px;border-radius:7px;background:linear-gradient(90deg,rgba(140,224,176,.2),rgba(255,255,255,.06),rgba(124,168,255,.2));position:relative;border:1px solid rgba(255,255,255,.1)}',
      '.sv-dbar>i{position:absolute;top:-3px;width:4px;height:16px;border-radius:3px;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.6);transition:left .5s ease}',
      '.sv-path{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);border-radius:12px;padding:9px 12px;margin:0 0 7px}',
      '.sv-path .pr{display:flex;justify-content:space-between;align-items:center;font-size:.9rem;margin-bottom:5px}',
      '.sv-path .pr .nm{font-weight:600}',
      '.sv-path.mine{border-color:rgba(124,168,255,.5);background:rgba(124,168,255,.07)}',
      '.sv-path .stg{font-size:.78rem;color:#9ca3af;margin-top:3px}',
      '.sv-pbar{height:8px;border-radius:5px;background:rgba(255,255,255,.07);overflow:hidden}',
      '.sv-pbar>i{display:block;height:100%;background:linear-gradient(90deg,#7ca8ff,#8ce0b0);transition:width .4s}',
      '.sv-path.mine .sv-pbar>i{background:linear-gradient(90deg,#a79bff,#7ca8ff)}',
      '.sv-primary{display:block;width:100%;border:none;border-radius:13px;padding:15px;font-size:1.02rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#5b8def,#7c6cf0);box-shadow:0 8px 20px rgba(91,141,239,.32);margin:6px 0 10px}',
      '.sv-primary[disabled]{opacity:.55;cursor:default}',
      '.sv-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:12px;padding:12px;font-size:.92rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 9px}',
      '.sv-row{display:flex;gap:9px}.sv-row>*{flex:1;margin-bottom:0}',
      '.sv-goal{border:1px solid rgba(167,155,255,.4);background:rgba(167,155,255,.08);border-radius:11px;padding:10px 13px;margin:0 0 8px;font-size:.9rem;line-height:1.5;color:#ded9ff}',
      '.sv-goal.main{border-color:rgba(240,180,75,.5);background:rgba(240,180,75,.08);color:#ffe6b8}',
      '.sv-goal.won{border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.1);color:#a7f3d0}',
      '.sv-act{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:12px;padding:11px 13px;margin:0 0 8px;color:#eef1f6;cursor:pointer;font-size:.92rem}',
      '.sv-act:hover{border-color:rgba(124,168,255,.55)}.sv-act small{display:block;color:#9ca3af;font-size:.78rem;margin-top:3px}',
      '.sv-trust{display:inline-block;font-size:.72rem;padding:1px 7px;border-radius:20px;margin-left:6px}',
      '.sv-vopt{display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:12px;padding:11px 13px;margin:0 0 8px;cursor:pointer}',
      '.sv-vopt.sel{border-color:#7ca8ff;background:rgba(124,168,255,.12)}',
      '.sv-vopt .em{font-size:1.2rem}.sv-vopt .t{flex:1}.sv-vopt .t b{font-weight:600}.sv-vopt .t small{display:block;color:#9ca3af;font-size:.78rem}',
      '.sv-chip{display:inline-block;border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:6px 12px;margin:0 6px 6px 0;font-size:.85rem;cursor:pointer;color:#e5e7eb}',
      '.sv-chip.sel{background:#5b8def;border-color:#5b8def;color:#fff}',
      '.sv-radio{border:1px solid rgba(56,189,248,.34);background:rgba(56,189,248,.08);border-radius:12px;padding:12px 14px;margin:0 0 11px;font-size:.9rem;line-height:1.55;color:#bae6fd}',
      '.sv-flash{text-align:center;font-size:.9rem;margin:0 0 10px}',
      '.sv-verdict{border:1px solid rgba(124,168,255,.4);background:linear-gradient(135deg,rgba(124,168,255,.12),rgba(167,155,255,.05));border-radius:13px;padding:13px 15px;margin:0 0 11px;line-height:1.6;font-size:.94rem}',
      '.sv-big{text-align:center;font-size:1.35rem;font-weight:800;margin:2px 0 4px;color:#a79bff}',
      '.sv-mini{font-size:.8rem;color:#9ca3af;margin:0 0 6px}',
      '.sv-li{margin:6px 0;line-height:1.5;font-size:.92rem}',
      '.sv-warn{color:#fca5a5}.sv-good{color:#a7f3d0}.sv-neu{color:#fcd34d}',
      '[data-theme="light"] .sv-wrap{color:#1f2430}',
      '[data-theme="light"] .sv-lead{color:#4b5566}',
      '[data-theme="light"] .sv-card,[data-theme="light"] .sv-path{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .sv-secondary,[data-theme="light"] .sv-fac,[data-theme="light"] .sv-act,[data-theme="light"] .sv-vopt{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .sv-pbar{background:rgba(0,0,0,.08)}',
      '@media(max-width:560px){.sv-wrap{padding:12px 10px 100px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function trustChip(t) {
    var col = t >= 66 ? 'rgba(52,211,153,.9);background:rgba(52,211,153,.14)' : t >= 34 ? 'rgba(252,211,77,.9);background:rgba(252,211,77,.12)' : 'rgba(248,113,113,.9);background:rgba(248,113,113,.14)';
    return '<span class="sv-trust" style="color:' + col + '">доверие ' + t + '</span>';
  }

  // ---------- главный экран ----------
  function home() {
    injectCSS(); ST = null;
    track('feature_opened', { feature: 'sovet' });
    var c = container(); if (!c) return;
    var st = loadStats();
    c.innerHTML =
      '<div class="sv-wrap">' +
        '<button class="sv-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="sv-h1">🛰️ Земля в опасности</div>' +
        '<div class="sv-lead">Солнце взорвётся через 18 месяцев. Есть 6 путей спасения — и 6 фракций Мирового Совета, каждая топит за свой. Ты — спикер одной из них. Но побеждает <b>не тот, чей путь спасёт Землю, а тот, кто наберёт больше очков</b> — а очки идут за твои <b>тайные</b> цели. Значит, иногда выгодно улыбаться врагу и втихую его двигать.<br><br>Пять фракций — живые характеры со скрытыми целями. Их надо <b>читать</b> (расспрос в кулуарах), <b>обманывать</b> (деза о себе, слив чужих тайн) и решать вечный вопрос: <b>халява или кидалово</b> — держать слово ради прочных союзов или предать ради выгоды. Они всё помнят и мстят.</div>' +
        (st.plays ? '<div class="sv-card" style="text-align:center">Партий: <b>' + st.plays + '</b> · побед: <b>' + (st.wins || 0) + '</b> · рекорд очков: <b>' + (st.bestVP || 0) + '</b></div>' : '') +
        '<button class="sv-secondary" onclick="SOVET.rules()">📖 Как играть: фазы, голоса, тайные цели</button>' +
        '<div class="sv-ch" style="margin:8px 0 9px">За какую фракцию играешь:</div>' +
        PATHS.map(function (p) {
          return '<button class="sv-fac" onclick="SOVET.begin(' + p.id + ')">' + p.em + ' <b>' + esc(p.name) + '</b> <span style="color:' + (p.camp === 'A' ? '#7ca8ff' : '#8ce0b0') + ';font-size:.78rem">лагерь ' + (p.camp === 'A' ? '«уехать»' : '«остаться»') + '</span><small>' + esc(p.goal) + '</small></button>';
        }).join('') +
        '<div class="sv-card" style="font-size:.85rem;color:#9ca3af">💡 Это тренажёр социального интеллекта: читать скрытые мотивы, дозировать правду и дезу, строить союзы и отличать win-win от игры на выбывание. В финале Фреди разберёт, кем ты играл — дипломатом или кидалой — и насколько точно читал людей.</div>' +
      '</div>';
  }

  function rules() {
    injectCSS(); var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="sv-wrap">' +
        '<button class="sv-ghost" onclick="SOVET.home()">← Назад</button>' +
        '<div class="sv-h1" style="font-size:1.24rem">Как играть</div>' +
        '<div class="sv-card"><div class="sv-ch">Цель</div>Набрать больше всех очков за 18 месяцев. <b>Главная цель</b> (твой путь пройден целиком) = 2 очка. Каждая <b>тайная побочная цель</b> = 1 очко. У ИИ-фракций тоже есть тайные цели — их ты не видишь и должен вычислить.</div>' +
        '<div class="sv-card"><div class="sv-ch">Ход месяца</div>1) <b>Кулуары</b> — 2 действия: расспросить (собрать интел, могут соврать), сделка (размен голосов), деза (соврать о своей цели), слить чужой «минус» (настроить Совет против соперника).<br>2) <b>Голосование</b> — вложи влияние в один из ближайших этапов. Проходит этап с большинством, если набрал ≥30% всех вложенных голосов.<br>3) <b>Итог</b> — этап реализован, видно, кто как и почему голосовал; сводка от радио Фреди.</div>' +
        '<div class="sv-card"><div class="sv-ch">🎯 Рычаг: интел в дело</div>Разведал в кулуарах <b>тайную цель</b> фракции — и появляется «Адресная сделка»: предложи ровно то, что им нужно. Соглашаются почти наверняка и держат слово <b>крепче</b> обычной сделки. Знание — это не галочка в досье, это рычаг.</div>' +
        '<div class="sv-card"><div class="sv-ch">🛑 Право вето</div>Один раз за игру можно <b>отменить</b> только что принятый Советом этап — как будто месяц прошёл впустую. Плюс этот путь застопорится на следующий месяц. Козырь на крайний случай: сорвать чужую победу у финиша.</div>' +
        '<div class="sv-card"><div class="sv-ch">⏰ Сроки и эскалация</div>Часть тайных целей привязана к <b>месяцу-дедлайну</b>: успел провести чужой путь/технологию вовремя — очко, опоздал — сгорело. А в середине игры Солнце может «поторопиться»: срок финала внезапно ужмётся. Не тяни.</div>' +
        '<div class="sv-card"><div class="sv-ch">Влияние</div>Старт — 100 у каждой фракции. Поддержал принятый этап: +5. Поддержал проигравший: −5. Не прошло ничего: все −5, самый крупный −10, самый мелкий 0.</div>' +
        '<div class="sv-card"><div class="sv-ch">Комбинации</div>Два пути делят общие технологии (корабль-ковчег, реакторы, убежища…). Реализовал общий этап в одном пути — он <b>сразу засчитан и в другом</b>. Двигая «чужой» этап, ты втихую тащишь и свой.</div>' +
        '<div class="sv-card"><div class="sv-ch">Дрейф мира</div>Лагерь «уехать» (Пилигримы, Терраформисты, Орбиталисты) против «остаться» (Атланты, Евгеники, Мезо-ионисты). Каждый принятый этап двигает общий тренд. Фракции липнут к восходящему лагерю — читай дрейф и лови или ломай его.</div>' +
        '<div class="sv-card"><div class="sv-ch">Халява против кидалова</div>Сдержал слово — доверие растёт, союзник и дальше подыгрывает. Предал — разовая выгода, но доверие рушится, обиженный мстит и сливает уже твой минус. Предавать иногда выгодно — в этом и соль.</div>' +
        '<button class="sv-primary" onclick="SOVET.home()">Выбрать фракцию →</button>' +
      '</div>';
  }

  function begin(pathId) {
    injectCSS(); ST = newGame(pathId); ST.phase = 'status';
    track('game_round_start', { feature: 'sovet', path: pathId });
    render();
  }

  function render() {
    if (!ST) return;
    if (ST.phase === 'status') return renderStatus();
    if (ST.phase === 'vote') return renderVote();
    if (ST.phase === 'resolve') return renderResolve();
    if (ST.phase === 'dossier') return renderDossier();
    if (ST.phase === 'end') return; // отрисовано в endGame
  }

  function driftBar() {
    var pos = Math.round((ST.drift + 100) / 200 * 100);
    return '<div class="sv-drift"><div class="lbl"><span class="b">🌍 остаться</span><span>Дрейф мира</span><span class="a">уехать 🚀</span></div><div class="sv-dbar"><i style="left:calc(' + pos + '% - 2px)"></i></div></div>';
  }
  function pathsBoard() {
    var near = {}; nearestStages(ST).forEach(function (n) { near[n.p] = n; });
    return PATHS.map(function (p) {
      var prog = ST.progress[p.id], n = near[p.id];
      var stg = prog >= 10 ? '✅ путь завершён!' : (n ? 'ближайший этап ' + (n.i + 1) + ': ' + esc(n.label) : '');
      return '<div class="sv-path' + (p.id === ST.player ? ' mine' : '') + '"><div class="pr"><span class="nm">' + p.em + ' ' + esc(p.name) + (p.id === ST.player ? ' <span style="color:#a79bff;font-size:.72rem">(ты)</span>' : '') + '</span><span style="color:#9ca3af;font-size:.8rem">' + prog + '/10</span></div><div class="sv-pbar"><i style="width:' + (prog * 10) + '%"></i></div><div class="stg">' + stg + '</div></div>';
    }).join('');
  }
  function goalsPanel() {
    var f = ST.factions[ST.player];
    var mainWon = ST.progress[ST.player] >= 10;
    var html = '<div class="sv-goal main' + (mainWon ? ' won' : '') + '">🎯 <b>Главная цель (2 очка):</b> провести свой путь «' + PATHS[ST.player].name + '» целиком. ' + (mainWon ? '✓ выполнено' : ST.progress[ST.player] + '/10') + '</div>';
    f.side.forEach(function (g) {
      var w = g.check(ST, ST.player);
      var expired = g.by && !w && ST.turn > g.by;
      html += '<div class="sv-goal' + (w ? ' won' : '') + '"' + (expired ? ' style="opacity:.55"' : '') + '>🕵️ ' + esc(g.text) + (w ? ' <span class="sv-good">✓</span>' : (expired ? ' <span class="sv-warn">✗ срок вышел</span>' : '')) + '</div>';
    });
    return html;
  }

  function renderStatus() {
    var c = container(); if (!c) return;
    var accel = ST._accelMsg ? '<div class="sv-radio" style="border-color:rgba(248,113,113,.4);background:rgba(248,113,113,.09);color:#fecaca">⏰ <b>Срочно!</b> ' + esc(ST._accelMsg) + '</div>' : '';
    ST._accelMsg = '';
    var hasIntel = ST.factions.some(function (f) { return !f.isPlayer && f.intel.side.length; });
    c.innerHTML =
      '<div class="sv-wrap">' +
        '<div class="sv-top"><span>' + PATHS[ST.player].em + ' ' + esc(PATHS[ST.player].name) + ' · месяц ' + ST.turn + ' из ' + ST.maxTurn + ' · влияние ' + ST.factions[ST.player].inf + '</span><button style="background:none;border:none;color:#8b93a7;font-size:.85rem;cursor:pointer;padding:0" onclick="SOVET.home()">✕ Выйти</button></div>' +
        accel +
        driftBar() +
        '<div class="sv-card" style="padding:11px 13px">' + pathsBoard() + '</div>' +
        '<div class="sv-ch">Твои цели</div>' + goalsPanel() +
        '<div class="sv-ch" style="margin-top:12px">Кулуары <span style="color:#9ca3af;font-weight:400;font-size:.85rem">— действий осталось: ' + ST.kuluarLeft + '</span></div>' +
        (ST.kuluarLeft > 0
          ? '<button class="sv-act" onclick="SOVET.pickFaction(\'ask\')">🔎 Расспросить фракцию<small>Узнать про её тайную цель или характер. Чем ниже доверие — тем туманнее ответ.</small></button>' +
            '<button class="sv-act" onclick="SOVET.pickFaction(\'deal\')">🤝 Предложить сделку<small>«Я поддержу твой этап — ты мой». Держат слово не все.</small></button>' +
            '<button class="sv-act" onclick="SOVET.pickFaction(\'deza\')">🎭 Скормить дезу<small>Соврать о своей цели, чтобы тебя неверно читали.</small></button>' +
            '<button class="sv-act" onclick="SOVET.pickFaction(\'leak\')">🗞️ Слить чужой «минус»<small>Настроить фракцию против соперника. Могут узнать — и это ударит по тебе.</small></button>' +
            (hasIntel ? '<button class="sv-act" style="border-color:rgba(240,180,75,.45)" onclick="SOVET.pickFaction(\'lever\')">🎯 Адресная сделка (рычаг)<small>Ты знаешь их тайную цель — предложи ровно то, что им нужно. Согласятся почти наверняка и держат крепко.</small></button>' : '')
          : '<div class="sv-card" style="color:#9ca3af;font-size:.88rem">Кулуарные действия на этот месяц исчерпаны.</div>') +
        '<div id="svKul"></div>' +
        '<button class="sv-secondary" onclick="SOVET.openDossier()">📁 Досье на фракции (записать догадки)</button>' +
        '<button class="sv-primary" onclick="SOVET.toVote()">К голосованию →</button>' +
      '</div>';
    try { c.scrollTop = 0; } catch (e) {}
  }

  // ---------- выбор фракции для кулуарного действия ----------
  function pickFaction(kind) {
    var box = document.getElementById('svKul'); if (!box) return;
    var titles = { ask: '🔎 Кого расспросить', deal: '🤝 Кому предложить сделку', deza: '🎭 Кому скормить дезу', leak: '🗞️ Кому слить чужой «минус»', lever: '🎯 На кого нажать рычагом (известна их цель)' };
    var html = '<div class="sv-card"><div class="sv-ch">' + titles[kind] + '</div>';
    var shown = 0;
    ST.factions.forEach(function (f, fi) {
      if (f.isPlayer) return;
      if (kind === 'lever' && !f.intel.side.filter(function (g) { return g && g.vp > 0; }).length) return; // рычаг — только по разведанным целям
      shown++;
      var extra = (kind === 'lever') ? ' <span class="sv-mini sv-good" style="display:inline">цель разведана</span>' : '';
      html += '<button class="sv-act" onclick="SOVET.doKuluar(\'' + kind + '\',' + fi + ')">' + PATHS[fi].em + ' <b>' + esc(PATHS[fi].name) + '</b>' + trustChip(f.trust) + extra + '</button>';
    });
    if (kind === 'lever' && !shown) html += '<div class="sv-mini">Пока не разведана ни одна тайная цель. Сначала «Расспросить».</div>';
    html += '<button class="sv-secondary" onclick="document.getElementById(\'svKul\').innerHTML=\'\'">Отмена</button></div>';
    box.innerHTML = html;
  }

  function doKuluar(kind, fi) {
    if (ST.kuluarLeft <= 0) return;
    var f = ST.factions[fi];
    var box = document.getElementById('svKul'); if (!box) return;
    var out = '';
    if (kind === 'ask') {
      // достоверность зависит от доверия
      var reliable = Math.random() < (0.35 + f.trust / 160);
      var learn;
      if (!f.intel.arch && Math.random() < 0.4) {   // смещение к разведке тайных ЦЕЛЕЙ (это рычаг), характер — реже
        f.intel.arch = reliable; // если ненадёжно — отметим как «слух»
        learn = reliable
          ? 'Судя по всему, «' + PATHS[fi].name + '» — <b>' + f.arch.name + '</b>: ' + f.arch.tell + '.'
          : 'Ходят слухи, что «' + PATHS[fi].name + '» из тех, кто ' + pick(['держит слово', 'кинет при первой выгоде', 'зациклен на своём', 'липнет к сильному']) + '. Но это только слух.';
      } else {
        var g = pick(f.side);
        if (reliable && f.intel.side.indexOf(g) < 0) f.intel.side.push(g);
        learn = reliable
          ? 'Удалось подсмотреть: «' + PATHS[fi].name + '» ' + g.clue + '.'
          : 'Толком ничего не выдал — только общие слова про «спасение человечества». Доверия маловато.';
      }
      out = learn;
      f.trust = clamp(f.trust + 2, 0, 100);
    } else if (kind === 'deal') {
      // предложить: я поддержу твой ближайший этап, ты — мой
      var myStage = nearestStage(ST, ST.player), yourStage = nearestStage(ST, fi);
      if (myStage < 0 || yourStage < 0) { out = 'Договариваться не о чем — у кого-то путь уже пройден.'; }
      else {
        var wantMutual = f.arch.trustNeed < 0.5 || f.trust >= 55;
        var accept = wantMutual && Math.random() < (0.45 + f.trust / 200 + (f.arch.id === 'trader' ? 0.3 : 0));
        if (accept) {
          f.deal = stageKey(ST.player, myStage); // фракция обещала поддержать МОЙ этап
          ST._pendingDeal = { fi: fi, yourStage: stageKey(fi, yourStage) };
          out = '🤝 ' + (voice(f, 'accept') ? voice(f, 'accept') + ' ' : '') + '«' + PATHS[fi].name + '» согласны: они поддержат твой этап «' + PATHS[ST.player].stages[myStage] + '», ты — их «' + PATHS[fi].stages[yourStage] + '». <span class="sv-mini">Сдержишь слово на голосовании — доверие вырастет. Кинешь — жди мести.</span>';
        } else {
          f.trust = clamp(f.trust - 3, 0, 100);
          out = (voice(f, 'refuse') ? voice(f, 'refuse') + ' ' : '') + '«' + PATHS[fi].name + '» отказались: ' + (f.arch.trustNeed >= 0.5 ? 'мало доверия, чтобы связываться.' : 'сейчас им это невыгодно.');
        }
      }
    } else if (kind === 'deza') {
      ST.deceived[fi] = true;
      f.trust = clamp(f.trust + 4, 0, 100); // деза звучит как искренность → доверие растёт
      // побочка: фракция чуть хуже читает тебя (снизим её будущую месть-точность — символически)
      f.revenge = Math.max(0, f.revenge - 1);
      out = 'Ты убедительно наврал «' + PATHS[fi].name + '», что твоя тайная ставка — на «' + PATHS[pick([0,1,2,3,4,5].filter(function(x){return x!==ST.player;}))].name + '». Они поверили: теперь читают тебя неверно, а доверие к тебе выросло. <span class="sv-mini">Полезно, если на деле ты копаешь в другую сторону.</span>';
    } else if (kind === 'leak') {
      // слить минус случайного соперника этой фракции
      var target = pick([0,1,2,3,4,5].filter(function (x) { return x !== ST.player && x !== fi; }));
      // эффект: фракция fi начинает топить target (даём ей временную «побочку-блок»)
      f.side.push({ kind: 'blk', path: target, vp: 0, temp: true, text: '', clue: '', check: function () { return false; } });
      ST.leakCount++;
      var caught = Math.random() < 0.28; // target может узнать
      if (caught) { ST.factions[target].trust = clamp(ST.factions[target].trust - 22, 0, 100); ST.factions[target].revenge += 2; }
      out = '🗞️ Ты шепнул «' + PATHS[fi].name + '» про изъян пути «' + PATHS[target].name + '»: «' + esc(PATHS[target].minus) + '» Теперь «' + PATHS[fi].name + '» будет прохладнее к «' + PATHS[target].name + '».' +
        (caught ? ' <span class="sv-warn">⚠️ «' + PATHS[target].name + '» прознали, кто источник — их доверие к тебе рухнуло, жди мести.</span>' : ' <span class="sv-mini">Пока сошло с рук.</span>');
    } else if (kind === 'lever') {
      // адресная сделка: играем на РАЗВЕДАННОЙ тайной цели фракции → почти железное согласие
      var known = f.intel.side.filter(function (g) { return g && g.vp > 0; });
      var myStg = nearestStage(ST, ST.player), yrStg = nearestStage(ST, fi);
      if (!known.length) { out = 'Рычага пока нет: сначала разведай их тайную цель в «Расспросить».'; }
      else if (myStg < 0 || yrStg < 0) { out = 'Не о чем договариваться — чей-то путь уже пройден.'; }
      else {
        var g0 = pick(known);
        f.deal = stageKey(ST.player, myStg);
        f.leverHeld = true;
        f.trust = clamp(f.trust + 3, 0, 100);
        ST._pendingDeal = { fi: fi, yourStage: stageKey(fi, yrStg) };
        out = '🎯 Ты бьёшь точно в их интерес — «' + esc(g0.text.replace('Тайно: ', '')) + '» От такого не отказываются. ' + (voice(f, 'hit') ? voice(f, 'hit') + ' ' : '') + 'Они <b>железно</b> поддержат твой этап «' + PATHS[ST.player].stages[myStg] + '», ты — их «' + PATHS[fi].stages[yrStg] + '». <span class="sv-mini">Рычаг держит куда крепче обычной сделки — но кинуть в ответ всё ещё можно (и опасно: месть будет злее).</span>';
      }
    }
    ST.kuluarLeft--;
    box.innerHTML = '<div class="sv-card"><div class="sv-ch">' + PATHS[fi].em + ' ' + esc(PATHS[fi].name) + '</div>' + out + '<button class="sv-secondary" style="margin-top:10px" onclick="SOVET.render()">Дальше</button></div>';
    vibe(12);
  }

  // ---------- досье ----------
  function openDossier() { ST.phase = 'dossier'; renderDossier(); }
  function renderDossier() {
    var c = container(); if (!c) return;
    var archList = Object.keys(ARCHES).map(function (k) { return ARCHES[k]; });
    var html = '<div class="sv-wrap"><button class="sv-ghost" onclick="SOVET.backToStatus()">← Назад</button><div class="sv-h1" style="font-size:1.2rem">📁 Досье</div><div class="sv-lead">Запиши догадки — в финале за точное чтение людей начислят бонус. То, что ты уже разведал, подсвечено.</div>';
    ST.factions.forEach(function (f, fi) {
      if (f.isPlayer) return;
      var g = ST.guesses[fi] || {};
      html += '<div class="sv-card"><div class="sv-ch">' + PATHS[fi].em + ' ' + esc(PATHS[fi].name) + trustChip(f.trust) + '</div>';
      if (f.intel.arch) html += '<div class="sv-mini sv-good">✓ разведано: характер — ' + f.arch.name + '</div>';
      if (f.intel.side.length) html += f.intel.side.map(function (x) { return '<div class="sv-mini sv-good">✓ разведано: ' + esc(x.clue) + '</div>'; }).join('');
      html += '<div class="sv-mini" style="margin-top:6px">Твоя догадка о характере:</div><div>';
      archList.forEach(function (a) { html += '<span class="sv-chip' + (g.arch === a.id ? ' sel' : '') + '" onclick="SOVET.guessArch(' + fi + ',\'' + a.id + '\')">' + a.name + '</span>'; });
      html += '</div></div>';
    });
    html += '<button class="sv-primary" onclick="SOVET.backToStatus()">Готово →</button></div>';
    c.innerHTML = html; try { c.scrollTop = 0; } catch (e) {}
  }
  function guessArch(fi, aid) { if (!ST.guesses[fi]) ST.guesses[fi] = {}; ST.guesses[fi].arch = aid; renderDossier(); }
  function backToStatus() { ST.phase = 'status'; renderStatus(); }

  // ---------- голосование ----------
  function toVote() { ST.phase = 'vote'; ST._pStage = null; ST._pAmt = 40; renderVote(); }
  function renderVote() {
    var c = container(); if (!c) return;
    var opts = nearestStages(ST);
    var f = ST.factions[ST.player];
    var amts = [20, 40, 60, f.inf];
    var html =
      '<div class="sv-wrap">' +
        '<div class="sv-top"><span>Голосование · месяц ' + ST.turn + ' · твоё влияние ' + f.inf + '</span></div>' +
        '<div class="sv-lead" style="margin-bottom:10px">Вложи влияние в <b>один</b> ближайший этап. Пройдёт тот, что наберёт большинство и не меньше 30% всех голосов. Помни про комбинации: чужой этап может тайно двигать и твой путь.</div>';
    opts.forEach(function (o) {
      var mine = o.p === ST.player;
      var isTech = ''; SHARED.forEach(function (t) { if ((t.a[0] === o.p && t.a[1] === o.i) || (t.b[0] === o.p && t.b[1] === o.i)) isTech = t.tech; });
      html += '<div class="sv-vopt' + (ST._pStage && ST._pStage.key === o.key ? ' sel' : '') + '" onclick="SOVET.selStage(\'' + o.key + '\')">' +
        '<span class="em">' + PATHS[o.p].em + '</span><span class="t"><b>' + esc(PATHS[o.p].name) + (mine ? ' (твой)' : '') + '</b><small>этап ' + (o.i + 1) + ': ' + esc(o.label) + (isTech ? ' · 🔗 общая: ' + esc(isTech) : '') + '</small></span>' +
        '<span style="color:' + (o.camp === 'A' ? '#7ca8ff' : '#8ce0b0') + ';font-size:.72rem">' + (o.camp === 'A' ? 'уехать' : 'остаться') + '</span></div>';
    });
    html += '<div class="sv-ch" style="margin-top:8px">Сколько влияния вложить:</div><div>';
    amts.forEach(function (a, idx) { html += '<span class="sv-chip' + (ST._pAmt === a ? ' sel' : '') + '" onclick="SOVET.selAmt(' + a + ')">' + (idx === 3 ? 'всё (' + a + ')' : a) + '</span>'; });
    html += '</div>';
    html += '<button class="sv-primary" id="svGo" onclick="SOVET.castVote()"' + (ST._pStage ? '' : ' disabled') + '>Отдать голоса →</button>';
    html += '<button class="sv-secondary" onclick="SOVET.backToStatus()">← Вернуться в кулуары</button>';
    html += '</div>';
    c.innerHTML = html; try { c.scrollTop = 0; } catch (e) {}
  }
  function selStage(key) { var o = nearestStages(ST).filter(function (x) { return x.key === key; })[0]; ST._pStage = o || null; renderVote(); }
  function selAmt(a) { ST._pAmt = Math.min(a, ST.factions[ST.player].inf); renderVote(); }

  function castVote() {
    if (!ST._pStage) return;
    ST._pAmt = clamp(ST._pAmt || 40, 5, ST.factions[ST.player].inf);
    // проверка на кидалово: если была сделка, а игрок голосует не за обещанное — фиксируем предательство
    // (сделка = ИИ обещал поддержать МОЙ этап в обмен на то, что Я поддержу ЕГО этап yourStage)
    if (ST._pendingDeal) {
      var pd = ST._pendingDeal;
      if (ST._pStage.key !== pd.yourStage) {
        // игрок не выполнил свою часть → предательство
        ST.betrayCount++;
        var vf = ST.factions[pd.fi];
        vf.trust = clamp(vf.trust - 34, 0, 100); vf.revenge += 3; vf.deal = null;
        ST._brokeDealFi = pd.fi;
      } else { ST.keptCount++; ST._keptDealFi = pd.fi; }
    }
    var res = resolveTurn(ST);
    ST.phase = 'resolve'; renderResolve(res);
  }

  // ---------- итог месяца ----------
  function renderResolve(res) {
    res = res || ST.lastResolve; if (!res) { ST.phase = 'status'; return renderStatus(); }
    var c = container(); if (!c) return;
    var html = '<div class="sv-wrap"><div class="sv-h1" style="font-size:1.16rem">🗳️ Итог месяца ' + ST.turn + '</div>';
    if (res.vetoed) {
      html += '<div class="sv-card sv-warn" style="border-color:rgba(248,113,113,.45)">🛑 <b>Ты наложил вето.</b> Принятый этап «' + esc(res.stageName) + '» аннулирован — как будто месяц прошёл впустую. Этот путь на следующий месяц заблокирован, и право вето израсходовано.</div>';
    } else if (res.passed) {
      html += '<div class="sv-card sv-good" style="border-color:rgba(52,211,153,.4)">✅ Совет принял: <b>' + esc(res.stageName) + '</b>' + (res.combo ? '<br>🔗 Комбинация: технология «' + esc(res.combo) + '» засчитана.' : '') + '</div>';
    } else {
      html += '<div class="sv-card sv-neu" style="border-color:rgba(252,211,77,.35)">🤷 Голосование прошло впустую — ни один этап не набрал большинства. Все теряют влияние.</div>';
    }
    // раскладка голосов
    html += '<div class="sv-card"><div class="sv-ch">Кто как голосовал</div>';
    var keys = Object.keys(res.votes).sort(function (a, b) { return res.votes[b].infl - res.votes[a].infl; });
    keys.forEach(function (k) {
      var v = res.votes[k];
      var names = v.backers.map(function (fi) { return (fi === ST.player ? 'ты' : PATHS[fi].name); }).join(', ');
      html += '<div class="sv-li">' + PATHS[v.st.p].em + ' <b>' + esc(PATHS[v.st.p].name) + '</b> · ' + esc(v.st.label) + ' — <b>' + v.infl + '</b> (' + esc(names) + ')' + (res.winKey === k ? ' ✅' : '') + '</div>';
    });
    html += '</div>';
    // видимая причинность: почему фракции проголосовали так
    if (res.moves && res.moves.length) {
      html += '<div class="sv-card"><div class="sv-ch">Почему они так проголосовали</div>';
      res.moves.forEach(function (m) {
        html += '<div class="sv-li">' + PATHS[m.fi].em + ' <b>' + esc(PATHS[m.fi].name) + '</b> — ' + esc(m.reason) + (m.voice ? ' <span style="color:#bcd; font-style:italic">' + esc(m.voice) + '</span>' : '') + '</div>';
      });
      html += '</div>';
    }
    // предательства/верность
    if (ST._keptDealFi != null) { html += '<div class="sv-card sv-good">🤝 Ты сдержал слово перед «' + esc(PATHS[ST._keptDealFi].name) + '» — их доверие выросло.</div>'; ST.factions[ST._keptDealFi].trust = clamp(ST.factions[ST._keptDealFi].trust + 16, 0, 100); }
    if (ST._brokeDealFi != null) { html += '<div class="sv-card sv-warn">🔪 Ты кинул «' + esc(PATHS[ST._brokeDealFi].name) + '»: доверие рухнуло, они затаили месть.</div>'; }
    if (res.broke && res.broke.length) { res.broke.forEach(function (fi) { html += '<div class="sv-card sv-warn">🎭 «' + esc(PATHS[fi].name) + '» нарушили обещание и проголосовали иначе. Запомни их характер.</div>'; ST.factions[fi]._exposedShark = true; }); }
    ST._keptDealFi = null; ST._brokeDealFi = null; ST._pendingDeal = null;
    // радио Фреди
    html += '<div class="sv-radio">📻 <b>Радио «Совет FM»:</b> ' + esc(radioLine(res)) + '</div>';
    // право вето — один раз за игру, только на принятый этап
    if (res.passed && !res.vetoed && !ST.vetoUsed) {
      html += '<button class="sv-secondary" style="border-color:rgba(248,113,113,.5);color:#fca5a5" onclick="SOVET.vetoNow()">🛑 Наложить вето на этот этап (один раз за игру)</button>';
    }
    var done = ST.progress.some(function (x) { return x >= 10; }) || ST.turn >= ST.maxTurn;
    html += '<button class="sv-primary" onclick="SOVET.nextTurn()">' + (done ? 'К итогам игры →' : 'Следующий месяц →') + '</button></div>';
    c.innerHTML = html; try { c.scrollTop = 0; } catch (e) {}
    vibe(res.passed ? [20, 25, 20] : 15);
  }

  // одноразовое право вето: откатить принятый в этом месяце этап
  function vetoNow() {
    var res = ST.lastResolve;
    if (!res || !res.passed || res.vetoed || ST.vetoUsed || !res.snap) return;
    var sn = res.snap, cp = function (o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = o[k]; }); return r; };
    ST.done = sn.done.map(function (r) { return r.slice(); });
    ST.progress = sn.progress.slice();
    ST.techDone = cp(sn.techDone);
    ST.drift = sn.drift;
    ST.reachedTurn = cp(sn.reachedTurn);
    ST.techTurn = cp(sn.techTurn);
    ST.factions.forEach(function (f, fi) { f.inf = sn.inf[fi]; });
    ST.vetoUsed = true;
    ST.vetoBlockPath = res.winStagePath;   // этот путь заблокирован...
    ST.vetoBlockTurn = ST.turn + 1;        // ...ровно на следующий месяц
    res.vetoed = true;
    track('sovet_veto', { turn: ST.turn });
    vibe([30, 20, 30]);
    renderResolve(res);
  }

  function radioLine(res) {
    var driftWord = ST.drift > 30 ? 'мир всё громче требует уезжать с Земли' : ST.drift < -30 ? 'общественное мнение склоняется остаться и держать оборону' : 'Совет расколот примерно поровну';
    var lines = [];
    if (res.passed) lines.push('«' + res.stageName.split(' · ')[0] + '» пролоббировали очередной этап.');
    else lines.push('заседание, как обычно, прошло «в тёплой дружественной обстановке» — то есть впустую.');
    lines.push(driftWord + '.');
    // случайная утечка про минус (правда/деза)
    if (Math.random() < 0.4) {
      var p = pick([0,1,2,3,4,5]);
      var truth = Math.random() < 0.6;
      lines.push(truth ? 'По непроверенным данным, у пути «' + PATHS[p].name + '» есть изъян: ' + PATHS[p].minus.toLowerCase() : 'Ходит явно заказной слух, будто путь «' + PATHS[p].name + '» абсолютно безопасен — верится с трудом.');
    }
    return lines.join(' ');
  }

  function nextTurn() {
    // сброс сделок, рычагов и временных «блоков» от утечек
    ST.factions.forEach(function (f) { f.deal = null; f.leverHeld = false; f.side = f.side.filter(function (g) { return !g.temp; }); });
    var done = ST.progress.some(function (x) { return x >= 10; });
    if (done || ST.turn >= ST.maxTurn) return endGame(done);
    ST.turn++; ST.kuluarLeft = 2; ST.phase = 'status';
    // поздняя эскалация: на заранее выбранном месяце срок ужимается — давление на финал
    if (!ST.accelDone && ST.turn >= ST.accelTurn) {
      ST.accelDone = true;
      ST.maxTurn = Math.max(ST.turn + 2, ST.maxTurn - 3);
      ST._accelMsg = 'Солнце нестабильно — учёные пересчитали срок. До взрыва осталось меньше времени: финал теперь на месяце ' + ST.maxTurn + '. Успевай добрать очки — и следи за чужими дедлайнами.';
    }
    renderStatus();
  }

  // ---------- финал ----------
  function scoreFaction(fi) {
    var f = ST.factions[fi], vp = 0, got = [];
    if (ST.progress[fi] >= 10) { vp += 2; got.push('главная цель (путь пройден) +2'); }
    f.side.forEach(function (g) { if (g.vp && g.check(ST, fi)) { vp += g.vp; got.push('тайная цель +1'); } });
    return { vp: vp, got: got };
  }

  async function endGame(pathDone) {
    if (ST.over) return; ST.over = true; ST.phase = 'end';
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="sv-wrap"><div class="sv-h1" style="font-size:1.16rem">🏛️ Совет расходится…</div><div class="sv-card">Фреди подводит итоги и разбирает, кем ты играл…</div></div>';
    // очки
    var scores = ST.factions.map(function (f, fi) { return { fi: fi, vp: scoreFaction(fi).vp, stages: ST.progress[fi] }; });
    scores.sort(function (a, b) { return b.vp - a.vp || b.stages - a.stages; });
    var myScore = scoreFaction(ST.player);
    var myRank = scores.map(function (x) { return x.fi; }).indexOf(ST.player) + 1;
    var won = myRank === 1;
    // точность чтения людей
    var guessed = 0, guessTotal = 0;
    ST.factions.forEach(function (f, fi) { if (f.isPlayer) return; guessTotal++; var g = ST.guesses[fi]; if (g && g.arch === f.arch.id) guessed++; });
    var readPct = guessTotal ? Math.round(guessed / guessTotal * 100) : 0;
    // стиль: халява vs кидалово
    var kidalo = ST.betrayCount * 2 + ST.leakCount;
    var halyava = ST.keptCount * 2;
    var styleWord = kidalo > halyava + 1 ? 'Кидала' : halyava > kidalo + 1 ? 'Дипломат' : 'Хитрый прагматик';
    // сохранить
    var stt = loadStats(); stt.plays = (stt.plays || 0) + 1; if (won) stt.wins = (stt.wins || 0) + 1; if (myScore.vp > (stt.bestVP || 0)) stt.bestVP = myScore.vp; saveStats(stt);

    // локальный разбор
    var localText = 'Ты сыграл в стиле «' + styleWord + '». Сдержанных сделок: ' + ST.keptCount + ', предательств: ' + ST.betrayCount + ', сливов чужих тайн: ' + ST.leakCount + '. ' +
      (readPct >= 60 ? 'Людей ты читал неплохо — характеры угаданы точно.' : 'Чужие характеры читались так себе — в следующий раз больше расспрашивай в кулуарах.') + ' ' +
      (won ? 'И главное — ты выиграл: набрал больше всех очков, не обязательно спасая Землю именно своим путём. Это и есть суть — победа идёт за тайные цели, а не за громкую правоту.' :
             'Победа ушла другому. Часто дело не в том, что твой путь проиграл, а в том, что ты недобрал тайных очков — или спалил доверие там, где выгоднее было держать слово.');

    var verdict = '', ai = false;
    try {
      var tbl = scores.map(function (x, i) { return (i + 1) + ') ' + PATHS[x.fi].name + (x.fi === ST.player ? ' (ты)' : '') + ' — ' + x.vp + ' очк.'; }).join('; ');
      var resp = await aiGenerate(
        'Ты — Фреди, тёплый, остроумный и точный психолог. Человек сыграл в переговорную игру «Земля в опасности»: он спикер фракции, тайно набирал очки, читал скрытые цели соперников, врал, заключал и иногда нарушал сделки.\n' +
        'Итоги: место игрока — ' + myRank + ' из 6, очков ' + myScore.vp + '. Стиль: ' + styleWord + '. Сдержал сделок: ' + ST.keptCount + ', предал: ' + ST.betrayCount + ', слил чужих тайн: ' + ST.leakCount + '. Точность чтения характеров: ' + readPct + '%. Таблица: ' + tbl + '.\n\n' +
        'Дай короткий разбор по-русски, на «ты», без морализаторства (игра про интригу — это нормально). 4–5 фраз: 1) назови его переговорный стиль (халява/win-win против кидалова/игры на выбывание) и что он даёт в реальной жизни; 2) насколько точно он читал людей; 3) окупилось ли предательство или дороже вышло доверие; 4) один практичный вывод про реальные переговоры и союзы. Живо, с лёгкой иронией.',
        { max_tokens: 480 });
      var t = (resp && resp.success && resp.content) ? String(resp.content).trim() : '';
      if (t) { verdict = t; ai = true; }
    } catch (e) {}
    if (!verdict) verdict = localText;

    var html = '<div class="sv-wrap">' +
      '<div class="sv-big">' + (won ? '🏆 Ты выиграл Совет!' : '🥈 Место ' + myRank + ' из 6') + '</div>' +
      '<div class="sv-card" style="text-align:center">Твоих очков: <b>' + myScore.vp + '</b>' + (myScore.got.length ? '<br><span class="sv-mini">' + myScore.got.join(' · ') + '</span>' : '') + '</div>' +
      '<div class="sv-card"><div class="sv-ch">Итоговая таблица</div>' + scores.map(function (x, i) { return '<div class="sv-li">' + (i === 0 ? '🏆 ' : (i + 1) + ') ') + PATHS[x.fi].em + ' <b>' + esc(PATHS[x.fi].name) + '</b>' + (x.fi === ST.player ? ' <span style="color:#a79bff">(ты)</span>' : '') + ' — ' + x.vp + ' очк., путь ' + x.stages + '/10</div>'; }).join('') + '</div>' +
      '<div class="sv-card" style="text-align:center">Стиль: <b>' + styleWord + '</b> · чтение людей: <b>' + readPct + '%</b> · сделок сдержано: <b>' + ST.keptCount + '</b> · предано: <b>' + ST.betrayCount + '</b></div>' +
      '<div class="sv-verdict">💬 ' + esc(verdict).replace(/\n/g, '<br>') + '</div>' +
      '<div class="sv-card" style="font-size:.86rem;color:#9ca3af">💡 Перенос в жизнь: реальные переговоры — не про то, чтобы всех передавить, а про то, чтобы читать чужие скрытые интересы и находить размен, где всем выгодно (халява), приберегая жёсткость на крайний случай. Доверие — актив: его дорого копить и мгновенно спустить.</div>' +
      '<div class="sv-row"><button class="sv-primary" style="margin:0" onclick="SOVET.begin(' + ST.player + ')">🔁 Ещё партия</button><button class="sv-secondary" onclick="SOVET.home()">Сменить фракцию</button></div>' +
      '</div>';
    c.innerHTML = html; try { c.scrollTop = 0; } catch (e) {}
    vibe(won ? [40, 40, 40] : 20);
    track('game_round_finish', { feature: 'sovet', path: ST.player, vp: myScore.vp, won: won, rank: myRank });
  }

  window.SOVET = {
    home: home, rules: rules, begin: begin, render: render,
    pickFaction: pickFaction, doKuluar: doKuluar,
    openDossier: openDossier, guessArch: guessArch, backToStatus: backToStatus,
    toVote: toVote, selStage: selStage, selAmt: selAmt, castVote: castVote,
    vetoNow: vetoNow, nextTurn: nextTurn, getState: function () { return ST; }
  };
  window.showSovetGame = home;
  console.log('✅ sovet.js loaded (игра «Земля в опасности»)');
})();
