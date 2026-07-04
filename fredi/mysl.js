// ============================================
// mysl.js — Игра «Мысль под допросом». КПТ-тренажёр по Беку:
// ловим автоматическую мысль, называем искажение, переформулируем точнее.
// Отличие от «Лови ошибку»: там — чужие аргументы в споре,
// здесь — СВОИ автоматические мысли, которые портят состояние.
// Ядро локальное (множественный выбор), переформулировка — с оценкой Фреди (AI).
// Экспорт: window.showMyslGame, window.MYSL
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
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 300, temperature: opts.temperature == null ? 0.5 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // Словарь искажений (по Беку/Бёрнсу, адаптированные названия)
  var DIST = {
    'Катастрофизация': 'Из рядового события мгновенно выводится худший сценарий: «это конец».',
    'Чёрно-белое мышление': 'Только «идеально» или «провал», без середины и оттенков.',
    'Чтение мыслей': 'Уверенность, что знаешь, что думают другие, — без проверки.',
    'Предсказание будущего': 'Прогноз («не получится», «откажут») подаётся как факт.',
    'Сверхобобщение': 'Один случай превращается в закон: «всегда», «никогда», «все».',
    'Обесценивание позитива': 'Хорошее не считается: «повезло», «это любой бы смог».',
    'Долженствование': 'Жёсткие «должен/обязан» к себе и другим вместо «хочу/полезно».',
    'Ярлык': 'Вместо оценки поступка — приговор личности: «я неудачник», «он идиот».',
    'Персонализация': 'Всё происходящее — из-за меня и про меня, даже чужое настроение.',
    'Эмоциональное обоснование': '«Я это чувствую — значит, это правда»: тревожно, значит опасно.'
  };
  var DKEYS = Object.keys(DIST);

  // Банк: ситуация, автоматическая мысль, правильное искажение, точная мысль (образец)
  var BANK = [
    { sit: 'Отправил начальнику отчёт. Тот прочитал и ответил коротко: «ок».', th: 'Ему не понравилось. Наверняка он уже жалеет, что взял меня.', key: 'Чтение мыслей',
      alt: '«Ок» — это «ок». У меня нет данных о недовольстве; если бы было не так — он бы написал правки. Могу спросить обратную связь напрямую.' },
    { sit: 'Готовишься к собеседованию в компанию мечты.', th: 'Я обязательно завалю его, как всегда всё заваливаю.', key: 'Предсказание будущего',
      alt: 'Я не знаю итога — это прогноз, не факт. Прошлые собеседования были разными: два неудачных, одно успешное. Могу повлиять подготовкой.' },
    { sit: 'На дне рождения подруга весь вечер была немногословной.', th: 'Это я её чем-то обидел. Точно что-то не то сказал.', key: 'Персонализация',
      alt: 'У её настроения десяток возможных причин, не связанных со мной: усталость, свои заботы. Проще спросить, чем гадать про себя.' },
    { sit: 'Сделал в презентации одну опечатку, заметил уже после отправки.', th: 'Вся работа насмарку. Теперь всё выглядит непрофессионально.', key: 'Чёрно-белое мышление',
      alt: 'Одна опечатка не отменяет сильных сторон работы. Между «идеально» и «насмарку» есть реальность: хорошая презентация с одной опечаткой.' },
    { sit: 'Не взяли на проект, на который подавался.', th: 'Я неудачник.', key: 'Ярлык',
      alt: 'Мне отказали в одном проекте — это событие, а не моя сущность. По одному отказу нельзя вывести «кто я». Что можно улучшить к следующей подаче?' },
    { sit: 'Ребёнок принёс двойку по математике.', th: 'Я ужасная мать, я его запустила.', key: 'Ярлык',
      alt: 'Двойка — сигнал разобраться с темой, а не приговор мне. Я много вкладываю; сейчас нужен не самосуд, а план: где он не понял и как помочь.' },
    { sit: 'Предстоит позвонить в поликлинику и разобраться с талоном.', th: 'Это будет кошмар, я не переживу эти разговоры.', key: 'Катастрофизация',
      alt: 'Это будет неприятно и муторно — но переживаемо: 10 минут разговора. Худший реалистичный исход — перезвонить ещё раз.' },
    { sit: 'Начальник попросил зайти «на пару слов» в конце дня.', th: 'Всё, меня увольняют.', key: 'Катастрофизация',
      alt: '«Пара слов» — это любой из десятков рабочих вопросов. Данных об увольнении ноль. Узнаю через час — незачем проживать худший сценарий заранее.' },
    { sit: 'Сдал сложный проект, клиент доволен, коллеги поздравляют.', th: 'Да просто звёзды сошлись. Любой бы справился.', key: 'Обесценивание позитива',
      alt: 'Проект вытянул я: вот конкретные решения, которые сработали. Успех считается так же, как ошибки, — честно записываю его себе.' },
    { sit: 'Знакомый не ответил на сообщение за целый день.', th: 'Я всегда всем безразличен. Никому нет до меня дела.', key: 'Сверхобобщение',
      alt: 'Один человек день не отвечает — это не «все» и не «всегда». Вчера двое сами мне написали. У молчания бывают десятки причин.' },
    { sit: 'Первый блин комом: попробовал вести заметки — бросил через три дня.', th: 'У меня никогда ничего не получается довести до конца.', key: 'Сверхобобщение',
      alt: '«Никогда ничего» — неправда: я довёл до конца учёбу, права, тот же ремонт. Эта привычка не прижилась с первого раза — можно перезапустить иначе.' },
    { sit: 'Собираешься попросить о повышении.', th: 'Я не должен просить — если заслужил, сами заметят и предложат.', key: 'Долженствование',
      alt: 'Правила «сами должны заметить» не существует. Просить о пересмотре условий — нормальная рабочая коммуникация. Подготовлю аргументы и спрошу.' },
    { sit: 'Друг отменил встречу второй раз подряд.', th: 'Настоящие друзья так не должны поступать. Он обязан ценить моё время.', key: 'Долженствование',
      alt: 'Мне неприятно, и я могу об этом сказать. Но у него могут быть обстоятельства; вместо кодекса «должен» — честный разговор о том, что для меня важно.' },
    { sit: 'Перед сном накатила тревога о здоровье.', th: 'Раз мне так тревожно — значит, со мной правда что-то серьёзное.', key: 'Эмоциональное обоснование',
      alt: 'Тревога — это чувство, а не диагноз. Ночью она всегда громче. Факты: обследование три месяца назад чистое. Чувство ≠ доказательство.' },
    { sit: 'Выступил на встрече, пара человек в зале смотрели в телефоны.', th: 'Им было скучно. Я провалил выступление.', key: 'Чтение мыслей',
      alt: 'Люди в телефонах — это люди в телефонах: почта, дети, что угодно. Трое подошли с вопросами после — вот это данные. Могу собрать обратную связь.' },
    { sit: 'Пригласил человека на свидание, он ответил «давай в другой раз».', th: 'Это вежливый отказ. Больше не буду позориться — всё равно откажут.', key: 'Предсказание будущего',
      alt: '«В другой раз» может значить и занятость, и отказ — проверяется одним следующим приглашением. Будущее «всё равно откажут» я выдумал.' },
    { sit: 'Написал другу резкое сообщение сгоряча, потом извинился, он принял.', th: 'Всё равно: я токсичный человек и порчу все отношения.', key: 'Ярлык',
      alt: 'Я сорвался (поступок) и починил (тоже поступок). «Токсичный человек» — ярлык, который стирает и извинение, и десять лет нормальной дружбы.' },
    { sit: 'На семейном празднике мама выглядела уставшей и мало говорила.', th: 'Это из-за меня — мало звоню, вот она и расстроена.', key: 'Персонализация',
      alt: 'Усталость мамы может быть про давление, сон, возраст — про её жизнь, а не про счёт моих звонков. Могу просто спросить, как она.' },
    { sit: 'Похвалили на планёрке за находчивое решение.', th: 'Просто им сегодня всё нравится. Ничего особенного я не сделал.', key: 'Обесценивание позитива',
      alt: 'Решение предложил я, и оно сработало — это факт в мою пользу. Принять похвалу — не гордыня, а точный учёт.' },
    { sit: 'Записался в зал; на первой тренировке всё валилось из рук.', th: 'Раз так стыдно и неловко — значит, мне там не место.', key: 'Эмоциональное обоснование',
      alt: 'Неловкость — нормальное чувство новичка, а не индикатор «не моего места». Все в зале когда-то путали тренажёры. Чувство пройдёт с практикой.' }
  ];

  var DIFF = {
    easy: { name: 'Разминка', em: '🌱', count: 5, opts: 3 },
    norm: { name: 'Норма', em: '⚖️', count: 7, opts: 4 },
    hard: { name: 'Плотно', em: '🔥', count: 9, opts: 5 }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  var ST = { diff: 'norm', qs: [], idx: 0, picked: null, correct: 0, log: [], aiBusy: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('mysl_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, best: {}, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('mysl_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('mysl_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('mysl_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(diff, score) { var s = loadStats(); s.plays = (s.plays || 0) + 1; if (!s.best) s.best = {}; if (!s.best[diff] || score > s.best[diff]) s.best[diff] = score; s.last = (s.last || []).concat(score).slice(-10); saveStats(s); return s; }

  function injectCSS() {
    if (document.getElementById('myslCSS')) return;
    var s = document.createElement('style'); s.id = 'myslCSS';
    s.textContent = [
      '.my-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.my-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.my-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.my-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.my-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.my-ch{font-weight:700;margin-bottom:8px}',
      '.my-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.my-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.my-stat b{display:block;font-size:1.35rem;font-weight:800;color:#a78bfa}',
      '.my-stat span{font-size:.72rem;color:#9ca3af}',
      '.my-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.my-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.my-chip.on{border-color:#a78bfa;background:rgba(167,139,250,.15);color:#fff}',
      '.my-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.my-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 16px}',
      '.my-bar i{display:block;height:100%;background:linear-gradient(90deg,#a78bfa,#38bdf8);transition:width .2s linear}',
      '.my-sit{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px 16px;margin:0 0 10px;font-size:.98rem;line-height:1.55;color:#c8ccd4}',
      '.my-th{border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.09);border-radius:14px;padding:16px 18px;margin:0 0 14px;font-size:1.08rem;line-height:1.55;font-style:italic}',
      '.my-q{font-weight:700;margin:0 0 10px}',
      '.my-opt{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:14px 16px;margin:0 0 9px;font-size:1rem;color:#f2f3f5;cursor:pointer}',
      '.my-opt:hover{border-color:rgba(167,139,250,.5)}',
      '.my-opt.ok{border-color:#10b981;background:rgba(16,185,129,.14)}',
      '.my-opt.no{border-color:#ef4444;background:rgba(239,68,68,.12)}',
      '.my-opt[disabled]{cursor:default}',
      '.my-reveal{border:1px solid rgba(56,189,248,.4);background:linear-gradient(135deg,rgba(56,189,248,.1),rgba(167,139,250,.05));border-radius:14px;padding:14px 16px;margin:0 0 14px;line-height:1.6;font-size:.95rem}',
      '.my-alt{border-left:3px solid #34d399;padding:8px 12px;margin-top:10px;background:rgba(52,211,153,.07);border-radius:8px;font-size:.93rem;color:#d1fae5}',
      '.my-ta{width:100%;min-height:74px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);border-radius:12px;padding:12px 14px;color:inherit;font-size:.98rem;font-family:inherit;line-height:1.5;resize:vertical;box-sizing:border-box;margin:8px 0}',
      '.my-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#8b5cf6,#38bdf8);box-shadow:0 8px 22px rgba(139,92,246,.35);margin:0 0 10px}',
      '.my-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.my-row{display:flex;gap:10px}.my-row>*{flex:1;margin-bottom:0}',
      '.my-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#a78bfa}',
      '.my-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .my-wrap{color:#1f2430}',
      '[data-theme="light"] .my-lead,[data-theme="light"] .my-sit{color:#4b5566}',
      '[data-theme="light"] .my-card,[data-theme="light"] .my-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .my-secondary,[data-theme="light"] .my-chip,[data-theme="light"] .my-opt{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .my-ta{background:#fff;border-color:rgba(0,0,0,.15);color:#1f2430}',
      '@media(max-width:560px){.my-wrap{padding:14px 12px 96px}.my-th{font-size:1rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); ST.diff = loadDiff();
    track('feature_opened', { feature: 'mysl' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      statsHtml = '<div class="my-stats"><div class="my-stat"><b>' + s.plays + '</b><span>раундов</span></div><div class="my-stat"><b>' + (s.best && s.best[ST.diff] || '—') + '</b><span>рекорд</span></div><div class="my-stat"><b>10</b><span>искажений в игре</span></div></div>';
    }
    c.innerHTML =
      '<div class="my-wrap">' +
        '<button class="my-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="my-h1">🔍 Мысль под допросом</div>' +
        '<div class="my-lead">КПТ-тренажёр по Аарону Беку. Между событием и «стало плохо» всегда мелькает автоматическая мысль — и часто она врёт по типовой схеме. Твоя задача: опознать искажение и увидеть, как звучит точная мысль. Это тот самый навык, который в терапии тренируют неделями.</div>' +
        statsHtml +
        '<div class="my-diff">' + DIFF_ORDER.map(function (d) { return '<div class="my-chip' + (ST.diff === d ? ' on' : '') + '" onclick="MYSL.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>'; }).join('') + '</div>' +
        '<div class="my-card"><div class="my-ch">10 искажений в игре</div>' +
          '<div style="color:#c8ccd4;font-size:.93rem">' + DKEYS.join(' · ') + '</div></div>' +
        '<button class="my-primary" onclick="MYSL.start()">▶ Начать (' + DIFF[ST.diff].count + ' мыслей)</button>' +
        (s.plays ? '' : '<div class="my-flag">💡 Важно: мысль — не факт, а гипотеза. Игра учит это видеть на чужих примерах, чтобы потом ловить у себя.</div>') +
      '</div>';
  }
  function setDiff(d) { if (!DIFF[d]) return; saveDiff(d); vibe(20); home(); }

  function start() {
    injectCSS();
    var cfg = DIFF[ST.diff];
    var pool = shuffle(BANK).slice(0, cfg.count);
    ST.qs = pool.map(function (b) {
      var distract = shuffle(DKEYS.filter(function (k) { return k !== b.key; })).slice(0, cfg.opts - 1);
      return { q: b, options: shuffle([b.key].concat(distract)) };
    });
    ST.idx = 0; ST.picked = null; ST.correct = 0; ST.log = [];
    track('game_round_start', { feature: 'mysl', diff: ST.diff });
    renderQ();
  }

  function renderQ() {
    var c = container(); if (!c) return;
    var item = ST.qs[ST.idx], q = item.q, total = ST.qs.length, answered = ST.picked !== null;
    var optsHtml = item.options.map(function (o) {
      var cls = 'my-opt';
      if (answered) { if (o === q.key) cls += ' ok'; else if (o === ST.picked) cls += ' no'; }
      return '<button class="' + cls + '"' + (answered ? ' disabled' : '') + ' onclick="MYSL.pick(\'' + o.replace(/'/g, "\\'") + '\')">' + esc(o) + '</button>';
    }).join('');
    var reveal = '';
    if (answered) {
      var ok = ST.picked === q.key;
      reveal =
        '<div class="my-reveal"><b>' + (ok ? '✅ Верно: ' : '❌ Это «' + esc(q.key) + '». ') + '</b>' + esc(DIST[q.key]) +
          '<div class="my-alt"><b>Точная мысль звучала бы так:</b><br>' + esc(q.alt) + '</div>' +
          '<div style="margin-top:12px;font-size:.92rem;color:#c8ccd4">✍️ Хочешь — переформулируй по-своему, Фреди оценит:</div>' +
          '<textarea class="my-ta" id="myTA" placeholder="Твоя точная версия этой мысли…"></textarea>' +
          '<div id="myAI"></div>' +
          '<button class="my-secondary" id="myAIbtn" onclick="MYSL.judgeAI()">🎓 Показать Фреди</button>' +
        '</div>' +
        '<button class="my-primary" onclick="MYSL.next()">' + (ST.idx === total - 1 ? 'Итог →' : 'Дальше →') + '</button>';
    }
    c.innerHTML =
      '<div class="my-wrap">' +
        '<div class="my-top"><span>Мысль ' + (ST.idx + 1) + ' из ' + total + '</span><button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="MYSL.home()">✕ Выйти</button></div>' +
        '<div class="my-bar"><i style="width:' + (ST.idx / total * 100) + '%"></i></div>' +
        '<div class="my-sit">📍 ' + esc(q.sit) + '</div>' +
        '<div class="my-th">💭 «' + esc(q.th) + '»</div>' +
        '<div class="my-q">Какое искажение в этой мысли?</div>' +
        optsHtml + reveal +
      '</div>';
  }

  function pick(k) {
    if (ST.picked !== null) return;
    ST.picked = k;
    var q = ST.qs[ST.idx].q, ok = k === q.key;
    if (ok) { ST.correct++; vibe(20); } else vibe([30, 30, 30]);
    ST.log.push({ th: q.th, key: q.key, picked: k, ok: ok });
    renderQ();
  }

  async function judgeAI() {
    if (ST.aiBusy) return;
    var ta = document.getElementById('myTA');
    var user = ta ? String(ta.value || '').trim() : '';
    if (!user) { if (typeof window.showToast === 'function') window.showToast('Сначала напиши свою версию мысли', 'info'); return; }
    ST.aiBusy = true;
    var q = ST.qs[ST.idx].q, box = document.getElementById('myAI'), btn = document.getElementById('myAIbtn');
    if (btn) { btn.textContent = '🎓 Фреди читает…'; btn.disabled = true; }
    var txt = '';
    try {
      var r = await aiGenerate('Ты — Фреди, наставник по КПТ. Ситуация: «' + q.sit + '». Автоматическая мысль с искажением «' + q.key + '»: «' + q.th + '». Человек переформулировал её так: «' + user + '». Оцени в 2–3 коротких фразах по-русски, на «ты»: стала ли мысль точнее и реалистичнее (не «позитивнее», а именно точнее), что удалось, и одно уточнение, если есть. Тон тёплый, без нотаций. Без вступлений.', { max_tokens: 260 });
      txt = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { txt = ''; }
    ST.aiBusy = false;
    if (btn) btn.style.display = 'none';
    if (box) box.innerHTML = txt ? '<div style="color:#bae6fd;line-height:1.55;margin-top:6px">💬 ' + esc(txt).replace(/\n/g, '<br>') + '</div>' : '<div style="color:#9ca3af;margin-top:6px">Связь подвисла — сверь свою версию с образцом выше: есть ли в ней факты вместо приговора?</div>';
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
    var line = pct === 100 ? 'Ни одна мысль не ушла от допроса 🔍' : pct >= 70 ? 'Внутренний прокурор работает точно' : pct >= 40 ? 'Схемы уже видны — продолжай' : 'Пересмотри словарь искажений: лови схему, а не содержание';
    var wrong = ST.log.filter(function (r) { return !r.ok; });
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="my-wrap">' +
        '<div class="my-h1" style="font-size:1.2rem">🔍 Результат</div>' +
        '<div class="my-score">' + ST.correct + ' из ' + total + ' · ' + pct + '%' + (isRec ? ' 🏆 рекорд!' : '') + '</div>' +
        '<div class="my-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        (wrong.length ? '<div class="my-card"><div class="my-ch">На пересмотр</div>' + wrong.map(function (r) { return '<div style="margin:6px 0;color:#c8ccd4;font-size:.92rem">• «' + esc(r.th) + '» — это <b>' + esc(r.key) + '</b> (ты выбрал «' + esc(r.picked) + '»).</div>'; }).join('') + '</div>' : '<div class="my-card" style="text-align:center;color:#6ee7b7">Все искажения опознаны! 🎯</div>') +
        '<div class="my-card" style="font-size:.9rem;color:#9ca3af">💡 Перенос в жизнь: в следующий раз, когда настроение рухнет «из ниоткуда», спроси себя: «Что именно промелькнуло в голове? И какое это искажение?» — ты уже умеешь.</div>' +
        '<div class="my-row"><button class="my-primary" onclick="MYSL.start()" style="margin:0">🔁 Ещё раунд</button><button class="my-secondary" onclick="MYSL.home()">Сложность / меню</button></div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'mysl', diff: ST.diff, score: score });
  }

  window.MYSL = { home: home, setDiff: setDiff, start: start, pick: pick, next: next, judgeAI: judgeAI, getState: function () { return ST; } };
  window.showMyslGame = home;
  console.log('✅ mysl.js loaded (игра «Мысль под допросом»)');
})();
