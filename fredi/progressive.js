// progressive.js — игра «Вариатика. Уровень Progressive» в модуле «Игры» Фреди.
// 7-дневный курс по переходу в сектор ЧВ — по канону А. Мейстера.
// Каждый день: ТЕОРИЯ → ПРАКТИКА В ЖИЗНИ → AI-наставник проверяет.
// + База данных краников (БДК): учётные карточки на знакомых, копятся
// между днями. Премиум-функция (как «Маркетолог»).
(function () {
  'use strict';

  // ---------- утилиты ----------
  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 480, temperature: opts.temperature == null ? 0.7 : opts.temperature };
    try {
      if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
      var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) return { success: false };
      return await r.json();
    } catch (e) { return { success: false }; }
  }
  function clean(s) { return String(s || '').replace(/\|\|[^|]*\|\|/g, '').trim(); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  // ---------- 7 дней — канон ----------
  var DAYS = [
    { n: 1, title: 'Учимся конвертировать ценности',
      core: 'Если ты способен обменивать что угодно на что угодно — спрос на тебя высок.',
      theory: [
        'Богатство — когда приходит больше, чем уходит. Накапливать можно всё, что является лаве: эмоции, деньги, друзей, связи.',
        '<b>Лаве</b> (от англ. Liberal Value) — ценность свободно мыслящего человека. Если она у тебя есть — это ресурс. Если нет — это мотивация и цель.',
        'Одно и то же лаве в разных состояниях стоит по-разному. <b>На разнице курса и зарабатывает посредник.</b>',
        '<b>3 типа конвертации:</b><br>· <b>Выгодная</b> — после обмена есть остаток.<br>· <b>Равная</b> — остатка нет.<br>· <b>Ущербная</b> — ушёл в убыток (время / энергия / нервы / деньги).',
        'Конвертация бывает <b>прямой</b> («ты — мне, я — тебе») и <b>ступенчатой</b> (1→2→3→4…). Наш объект — ступенчатая: на разнице на каждом шаге.'
      ],
      task: 'Вспомни последнюю неделю и найди одну реальную ситуацию, где ты обменял что-то на что-то (деньги/время/связи/услугу). Опиши: что отдал, что получил, какой это был тип конвертации (выгодная/равная/ущербная). Если не было — спланируй на завтра одну ступенчатую конвертацию (1→2→3) и опиши её цепочку.',
      check: 'Игрок описывает реальную или планируемую конвертацию. Проверь: (1) видит ли он все звенья цепочки; (2) корректно ли определил тип. Дай короткий разбор (3–4 предложения, на «ты», без воды): что увидено верно, какой следующий шаг отработать. ' },

    { n: 2, title: 'Разбираемся в «краниках»',
      core: 'Каждый человек — кран. Чтобы получить ресурс, нужно знать, как его открыть и через кого.',
      theory: [
        '<b>Краник</b> — то, к чему человек даёт доступ. <b>Крантехник</b> — тот, кто умеет открывать чужие краники и водить ресурсы между ними.',
        '<b>5 главных краников</b> (на что люди падки): комфорт/быт · здоровье/выживание · социальное/статус · деньги · удовольствие.',
        '<b>4 уровня крантехников:</b><br>· <b>Бесперспективные</b> — жлобятся, считают баланс, виснут на морально-нравственных долгах.<br>· <b>Низшие</b> — пристраиваются снизу, суетятся, навязываются высшим.<br>· <b>Равные</b> — выясняют чем могут быть полезны друг другу. Самый рабочий уровень.<br>· <b>Высшие</b> — никого не ищут, принимают подхват: «сами придут, кому надо».'
      ],
      task: 'Сделай два списка. (1) Кому из знакомых за последние полгода нужна была помощь? (2) Кто из знакомых мог эту помощь оказать через тебя как посредника? Покажи хотя бы одну связку «нуждался X ↔ мог Y». Если такие связки уже сводил — опиши, как прошло и кому ты в итоге оказался полезен.',
      check: 'Игрок пишет 2 списка и связку. Проверь: видит ли он себя как ПОСРЕДНИКА (а не как источник). Дай 3–4 предложения: насколько он мыслит как равный крантехник; одна точка роста.'
    },

    { n: 3, title: 'Оцениваем оппонентов и подстраиваемся',
      core: 'I = U / R. Место в иерархии = способности / воспринимаемый образ.',
      theory: [
        '<b>U</b> — что человек реально умеет (демонстрируемые навыки).<br><b>R</b> — каким его воспринимают (образ, репутация, манеры).<br><b>I</b> — место в иерархии.',
        'Если <b>R больше, чем U</b> — человек снижается в иерархии (мошенник, не тянет образ). Если <b>R меньше, чем U</b> — растёт (превосходит ожидания).',
        '<b>Что мешает росту:</b> зависть. Наблюдатель занижает U в восприятии, и человек как будто «деградирует».',
        '<b>3 вида подстройки:</b><br>· <b>Снизу</b> — даёшь мелочь, чтобы человек почувствовал себя благодетелем.<br>· <b>Сверху (надстройка)</b> — оппонент выполняет твою просьбу из страха или статуса.<br>· <b>Сбоку (раппорт)</b> — на равных, как другу. Лучший вариант на длинную.'
      ],
      task: 'Возьми ОДНОГО реального человека из своей жизни, с которым тебе важно выстроить контакт (партнёр, начальник, клиент, родственник). Определи: какой он по масти и уровню (примерно). Какой подстройки требует — снизу, сверху или раппорт? Какие <b>атрибуты</b> ему важно предъявить, чтобы R стал в плюс?',
      check: 'Игрок описывает одного человека и план подстройки. Проверь: уловлен ли тип, не путает ли он подстройку с подхалимажем (это не одно и то же), назвал ли конкретные атрибуты. Дай 4–5 предложений с одной точной правкой плана.'
    },

    { n: 4, title: 'Формируем базу данных краников (БДК)',
      core: 'Память подводит. Карточка — нет.',
      theory: [
        '<b>База данных краников (БДК)</b> — твои учётные карточки на «нужных» людей. То, что в настолке лежало в кармане у профи, теперь — у тебя в Фреди.',
        '<b>Что в карточке:</b> ключевые области · предресурсы (что даёт сам) · связи (через кого выводит с гарантией) · знакомства (с кем сводит без гарантий) · рычаги (страх / обмен / стройка снизу / флирт / дружба / надстройка сверху) · статус (перспективный/неперспективный, лёгкий/сложный) · история обращений.',
        '<b>Виды краников:</b> к дефициту (производитель) · к доступу (посредник) · к крантехникам (ключ). Самый ценный — ключ к чужим краникам.'
      ],
      task: 'Заведи в Фреди карточки минимум на <b>3 человека</b> из своего окружения (или на себя — обязательно). Не пытайся охватить всё — собирай по фильтру «что мне интересно». На карточку себя укажи 1–2 СВОИХ краника (не больше — иначе тебя перестанут запоминать как носителя ресурса).',
      check: 'Игрок отчитывается о заведённых карточках. Проверь: заполнил ли он СВОЮ карточку (это критически важно), не написал ли слишком много «что я могу» (>2). Похвали факт ведения БДК, дай одну подсказку по структуре.'
    },

    { n: 5, title: 'Определяем ЛНСВ',
      core: 'Чтобы человек сделал что-то для тебя, ему должно быть ЛЕГКО + НЕНАПРЯЖНО + СУБЪЕКТИВНО ВЫГОДНО.',
      theory: [
        '<b>Л</b> — Технически легко (этому человеку это умение даётся без труда).',
        '<b>Н</b> — Эмоционально ненапряжно (может сделать в полночь, под капельницей — нет внутреннего сопротивления).',
        '<b>СВ</b> — Субъективно Выгодно (его ответ самому себе: зачем мне это, что мне за это, или что плохого, если не сделаю).',
        'Все три должны быть в плюсе. Если хотя бы одно «нет» — попросишь и зря потратишь баш.',
        '<b>Ценности по мастям:</b> УБ — почёт/уважение/оценка · ТФ — собственность/стабильность · СБ — сила/власть/страх · ЧВ — возможности/свобода.'
      ],
      task: 'Открой записную книжку. Возьми <b>10 контактов</b> подряд и для каждого впиши «<b>что ему ЛНСВ</b>» — какую услугу он окажет легко, ненапряжно и с субъективной выгодой. Затем составь свой список «9 желаний» (3 лёгких, 3 средних, 3 сложных) и подбери под каждое — кто из контактов это мог бы выдать как ЛНСВ.',
      check: 'Игрок отчитывается. Проверь: реально ли видит он чужие ЛНСВ (а не «мне бы хотелось, чтобы он сделал»), есть ли пары желание↔человек. Дай 4 предложения: одна сильная связка, одна слабая — почему.'
    },

    { n: 6, title: 'Вычисляем себестоимость',
      core: 'Себестоимость считай. Иначе сядут на шею — или ты сам прослывёшь жлобом.',
      theory: [
        '<b>Баш</b> — субъективная ценность услуги для того, кому её оказывают. Баши не равны деньгам.',
        'В себестоимость <b>входит</b> только объективная цена вопроса (время, материал, прямые затраты).<br>В себестоимость <b>НЕ входит</b> «услуга своему» (скидка, контакт, усилие) — это сверху и оценивается отдельно.',
        '<b>Правило</b>: с равным — обмен по себестоимости + лёгкая «услуга своему». С низшим — наценка («он не из нашей касты»). Высшему — себе в небольшой убыток (он откроет краник, который окупит).'
      ],
      task: 'Выбери 2–3 услуги из своего списка ЛНСВ и определи их РЕАЛЬНУЮ себестоимость. Не «сколько я бы хотел», а «сколько объективно стоит» (час времени × ставка / прямые расходы). Потом проверь на одном живом человеке: спроси у него «сколько за это надо?» — и сравни. Жлобится или дал реальную цену?',
      check: 'Игрок отчитывается. Проверь: разделяет ли он себестоимость и «услугу своему», не назвал ли он себестоимостью свою лень/нежелание. Дай 3–4 предложения, одну конкретную правку расчёта.'
    },

    { n: 7, title: 'Поддержание связей — 5 золотых правил',
      core: 'Связь — это не подарок. Это привычка лёгкого касания.',
      theory: [
        '<b>1. Вечная благодарность.</b> Словами — сразу. Действием — отложенно, не как «отдать долг», а «при случае». Никакого «баш-на-баш» вслух — сессию не закрываем.',
        '<b>2. Лёгкость отношений.</b> Поверхностные приятельские, без углубления.',
        '<b>3. 3–4 = 1.</b> 3–4 раза делаешь добро просто так — потом 1 раз можешь попросить. Не чаще (навязчивость), не реже (звонит только когда надо).',
        '<b>4. Короткая встреча по формальному поводу.</b> До 40 минут, в третьем месте (не дома), с регламентом «по делу».',
        '<b>5. Свой — чужой.</b> Демонстрируешь готовность играть по этим правилам — тебя принимают в касту. Жлобство, попытки баланса — пропуск в бесперспективные.'
      ],
      task: 'Возьми <b>5 человек</b> из своей БДК. Для каждого: (1) придумай формальный повод для короткой встречи; (2) сделай ОДНО действие <b>сегодня</b> — позвони/напиши и между делом, в ходе нормального разговора, упомяни свой ресурс ОДНОЙ историей (не «я могу X», а «недавно помог другу с X»). Проверь, кто откликнулся, а кто — пропустил мимо ушей (последние — сразу пометь как неперспективных).',
      check: 'Игрок отчитывается о 5 контактах. Проверь: не «продавал» ли он в лоб (упоминал ли ресурс ИСТОРИЕЙ), есть ли список откликнувшихся. Заверши курс: 4–6 предложений тёплого финала — что он реально сдвинул за 7 дней, и какое одно действие закрепить в привычку.'
    }
  ];

  // ---------- состояние ----------
  function loadProg() {
    var d = { day: 1, done: {}, notes: {}, cards: [], started: 0 };
    try {
      var p = JSON.parse(localStorage.getItem('progressive_prog') || 'null');
      if (!p) return d;
      p.day = p.day || 1; p.done = p.done || {}; p.notes = p.notes || {}; p.cards = p.cards || [];
      return p;
    } catch (e) { return d; }
  }
  function saveProg(p) { try { localStorage.setItem('progressive_prog', JSON.stringify(p)); } catch (e) {} }

  var ST = { busy: false };
  function container() { return document.getElementById('screenContainer'); }

  // ---------- премиум-гейт ----------
  async function ensurePremium() {
    if (window.IS_PREMIUM === true) return true;
    if ((window.IS_PREMIUM == null) && typeof window.loadPremiumStatus === 'function') {
      try { await window.loadPremiumStatus(); } catch (e) {}
    }
    return window.IS_PREMIUM === true;
  }
  function openPremium() {
    if (typeof window.showPremiumLockPopup === 'function') { window.showPremiumLockPopup('Вариатика Progressive'); return; }
    if (typeof window.showSettingsScreen === 'function') { try { window.showSettingsScreen(); return; } catch (e) {} }
    toast('Открой раздел «Подписка» в настройках', 'info');
  }
  function renderLocked() {
    injectCSS();
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pg-wrap">' +
        '<button class="pg-ghost" onclick="PROGRESSIVE.exit()">← К списку игр</button>' +
        '<div class="pg-h1">🚀 Вариатика — Progressive</div>' +
        '<div class="pg-card" style="text-align:center;border-color:rgba(139,92,246,.45)">' +
          '<div style="font-size:2.4rem;margin-bottom:6px">💎</div>' +
          '<div style="font-weight:700;font-size:1.12rem;color:#fff;margin-bottom:8px">7-дневный курс — с подпиской</div>' +
          '<div style="color:#aeb1bd;line-height:1.55">«Progressive» — это не игра, а курс по переходу в сектор ЧВ. 7 дней теории + практики в реальной жизни. Доступен в <b>Фреди Premium</b>.</div>' +
        '</div>' +
        '<button class="pg-btn pg-primary" onclick="PROGRESSIVE.openPremium()">💎 Открыть Premium</button>' +
        '<button class="pg-btn" onclick="PROGRESSIVE.exit()">← Вернуться к играм</button>' +
      '</div>';
    track('feature_opened', { feature: 'progressive_locked' });
  }

  // ---------- стили ----------
  function injectCSS() {
    if (document.getElementById('pgCSS')) return;
    var s = document.createElement('style'); s.id = 'pgCSS';
    s.textContent = [
      '.pg-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.pg-h1{font-size:1.5rem;font-weight:800;margin:6px 0 10px;line-height:1.18;color:#fff}',
      '.pg-h2{font-size:1.15rem;font-weight:700;margin:14px 0 8px;color:#fff}',
      '.pg-lead{font-size:1.02rem;color:#aeb1bd;line-height:1.6;margin-bottom:14px}',
      '.pg-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px;margin-bottom:12px;color:#dfe2e8;line-height:1.6;font-size:.95rem}',
      '.pg-card b{color:#fff;font-weight:600}',
      '.pg-btn{display:block;width:100%;text-align:left;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:14px 18px;margin-bottom:10px;color:#fff;font:inherit;font-size:.98rem;cursor:pointer;transition:.18s}',
      '.pg-btn:hover{background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.5)}',
      '.pg-btn small{display:block;color:#9aa0ad;font-size:.82rem;margin-top:4px;font-weight:400}',
      '.pg-btn.done{border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.07)}',
      '.pg-btn.locked{opacity:.45;cursor:not-allowed}',
      '.pg-primary{background:linear-gradient(135deg,#8b5cf6,#6366f1);border:none;color:#fff;text-align:center;font-weight:700}',
      '.pg-primary:hover{filter:brightness(1.07)}',
      '.pg-ghost{display:inline-block;background:none;border:none;color:#9aa0ad;font:inherit;font-size:.9rem;cursor:pointer;padding:6px 0;margin-bottom:6px}',
      '.pg-ghost:hover{color:#fff}',
      '.pg-chip{display:inline-block;padding:6px 11px;margin:0 6px 6px 0;border-radius:999px;background:rgba(139,92,246,.13);border:1px solid rgba(139,92,246,.35);color:#c4b5fd;font-size:.82rem}',
      '.pg-prog{height:8px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;margin:8px 0 14px}',
      '.pg-prog i{display:block;height:100%;background:linear-gradient(90deg,#8b5cf6,#6366f1);transition:width .3s}',
      '.pg-core{background:linear-gradient(135deg,rgba(139,92,246,.13),rgba(99,102,241,.04));border:1px solid rgba(139,92,246,.35);border-radius:14px;padding:14px 16px;margin:10px 0;font-style:italic;color:#c4b5fd;line-height:1.5}',
      '.pg-theory{background:rgba(255,255,255,.04);border-left:3px solid #8b5cf6;border-radius:8px;padding:12px 14px;margin-bottom:10px;line-height:1.6;font-size:.93rem}',
      '.pg-task{background:linear-gradient(135deg,rgba(245,158,11,.13),rgba(245,158,11,.03));border:1px solid rgba(245,158,11,.42);border-radius:14px;padding:14px 16px;margin:12px 0;line-height:1.55}',
      '.pg-task .lab{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:#fcd34d;margin-bottom:6px}',
      '.pg-ta{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:12px 14px;color:#fff;font:inherit;font-size:.96rem;resize:vertical;min-height:110px;line-height:1.5}',
      '.pg-ta:focus{outline:none;border-color:rgba(139,92,246,.6)}',
      '.pg-fb{background:linear-gradient(135deg,rgba(34,197,94,.13),rgba(34,197,94,.04));border:1px solid rgba(34,197,94,.45);border-radius:14px;padding:13px 16px;margin:10px 0;line-height:1.55;white-space:pre-wrap}',
      '.pg-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}',
      '.pg-typing{color:#8b90a0;font-size:.85rem;font-style:italic;padding:6px 0}',
      '.pg-warn{background:rgba(245,158,11,.07);border:1px dashed rgba(245,158,11,.35);border-radius:10px;padding:10px 14px;font-size:.84rem;color:#fcd34d;margin-bottom:12px;line-height:1.5}',
      '.pg-cardlist{margin-top:8px}',
      '.pg-cardrow{display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;margin-bottom:6px;font-size:.92rem}',
      '.pg-cardrow .nm{font-weight:600;color:#fff}',
      '.pg-cardrow .meta{font-size:.82rem;color:#9aa0ad}',
      '.pg-x{background:none;border:none;color:#9aa0ad;cursor:pointer;font-size:1.05rem;padding:4px 8px}',
      '.pg-x:hover{color:#f87171}',
      '.pg-field{display:block;font-size:.82rem;color:#9aa0ad;margin:8px 0 4px}',
      '.pg-inp{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:9px 12px;color:#fff;font:inherit;font-size:.93rem}',
      '.pg-inp:focus{outline:none;border-color:rgba(139,92,246,.6)}',
      '[data-theme="light"] .pg-wrap{color:#1a1a2e}',
      '[data-theme="light"] .pg-h1{color:#0f1020}',
      '[data-theme="light"] .pg-lead{color:#555}',
      '[data-theme="light"] .pg-card{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.1);color:#222}',
      '[data-theme="light"] .pg-card b{color:#000}',
      '[data-theme="light"] .pg-btn{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.1);color:#111}',
      '[data-theme="light"] .pg-btn small{color:#666}',
      '[data-theme="light"] .pg-theory{background:rgba(0,0,0,.03)}',
      '[data-theme="light"] .pg-ta,[data-theme="light"] .pg-inp{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.15);color:#111}',
      '[data-theme="light"] .pg-cardrow{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.1)}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------- хаб ----------
  async function home() {
    injectCSS();
    var c = container(); if (!c) return;
    if (!(await ensurePremium())) { renderLocked(); return; }
    track('feature_opened', { feature: 'progressive' });
    var p = loadProg();
    var doneCount = Object.keys(p.done).filter(function (k) { return p.done[k]; }).length;
    var pct = Math.round(doneCount / 7 * 100);
    var rows = DAYS.map(function (d) {
      var isDone = !!p.done[d.n];
      var isUnlocked = d.n === 1 || p.done[d.n - 1];
      var cls = isDone ? 'pg-btn done' : (isUnlocked ? 'pg-btn' : 'pg-btn locked');
      var onclick = isUnlocked ? ('onclick="PROGRESSIVE.day(' + d.n + ')"') : '';
      return '<button class="' + cls + '" ' + onclick + '><b>' + (isDone ? '✓' : (isUnlocked ? '▶' : '🔒')) + ' День ' + d.n + '. ' + esc(d.title) + '</b><small>' + esc(d.core) + '</small></button>';
    }).join('');
    c.innerHTML =
      '<div class="pg-wrap">' +
        '<button class="pg-ghost" onclick="PROGRESSIVE.exit()">← К списку игр</button>' +
        '<div class="pg-h1">🚀 Вариатика — Progressive</div>' +
        '<div class="pg-lead">Не игра, а <b>7-дневный курс</b> по смене фундамента и переходу в сектор ЧВ. Каждый день: теория → практика в реальной жизни → разбор от Фреди. Дни проходят строго по порядку.</div>' +
        '<div class="pg-card" style="font-size:.9rem">Пройдено: <b>' + doneCount + '/7</b><div class="pg-prog"><i style="width:' + pct + '%"></i></div>Карточек в БДК: <b>' + (p.cards.length || 0) + '</b></div>' +
        '<div class="pg-warn">⚠ Не перескакивай вперёд: эффект курса завязан на последовательности. Каждый следующий день стоит на предыдущем.</div>' +
        '<div class="pg-h2">Дни курса</div>' + rows +
        '<button class="pg-btn" onclick="PROGRESSIVE.cards()">📇 База данных краников (' + (p.cards.length || 0) + ')<small>Учётные карточки на знакомых — растут от дня ко дню</small></button>' +
        (doneCount > 0 ? '<button class="pg-btn" onclick="PROGRESSIVE.reset()" style="border-color:rgba(239,68,68,.3);color:#fca5a5">↺ Сбросить прогресс курса</button>' : '') +
      '</div>';
  }
  function exit() { if (typeof window.showKonturScreen === 'function') window.showKonturScreen(); else home(); }
  function reset() { if (!confirm('Сбросить прогресс курса? Карточки БДК останутся.')) return; var p = loadProg(); p.done = {}; p.notes = {}; p.day = 1; saveProg(p); home(); }

  // ---------- день ----------
  function day(n) {
    var D = DAYS[n - 1]; if (!D) return;
    var p = loadProg();
    if (n > 1 && !p.done[n - 1]) { toast('Сначала пройди День ' + (n - 1), 'info'); return; }
    var savedNote = p.notes[n] || '';
    var savedFb = (p.done[n] && p.notes[n + '_fb']) || '';
    var theoryHtml = D.theory.map(function (t) { return '<div class="pg-theory">' + t + '</div>'; }).join('');
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pg-wrap">' +
        '<button class="pg-ghost" onclick="PROGRESSIVE.home()">← В курс</button>' +
        '<div class="pg-h1">День ' + D.n + ' из 7. ' + esc(D.title) + '</div>' +
        '<div class="pg-core">«' + esc(D.core) + '»</div>' +
        '<div class="pg-h2">📖 Теория</div>' + theoryHtml +
        '<div class="pg-h2">🎯 Практика дня</div>' +
        '<div class="pg-task"><div class="lab">Задание</div>' + D.task + '</div>' +
        '<label class="pg-field">Опиши, что сделал (или собираешься). Чем подробнее — тем точнее разбор:</label>' +
        '<textarea class="pg-ta" id="pgNote" placeholder="Что сделал / что заметил / какие выводы…">' + esc(savedNote) + '</textarea>' +
        '<div class="pg-row">' +
          '<button class="pg-btn pg-primary" style="flex:1;width:auto;margin:0;padding:13px" onclick="PROGRESSIVE.submit(' + n + ')">Отправить Фреди-наставнику</button>' +
        '</div>' +
        (n === 4 ? '<button class="pg-btn" style="margin-top:8px" onclick="PROGRESSIVE.cards()">📇 Открыть БДК →</button>' : '') +
        (n === 5 ? '<button class="pg-btn" style="margin-top:8px" onclick="PROGRESSIVE.test()">🧬 Пройти тест на масть →</button>' : '') +
        '<div id="pgOut">' + (savedFb ? ('<div class="pg-fb">' + nl2br(savedFb) + '</div>') : '') + '</div>' +
        (p.done[n]
          ? (n < 7 ? '<button class="pg-btn pg-primary" style="margin-top:12px" onclick="PROGRESSIVE.day(' + (n + 1) + ')">Дальше → День ' + (n + 1) + '</button>' : '<div class="pg-card" style="margin-top:12px;text-align:center;background:linear-gradient(135deg,rgba(139,92,246,.16),rgba(99,102,241,.04));border-color:rgba(139,92,246,.5)"><b>🏁 Курс пройден.</b> Закрепи привычку: возвращайся к БДК и поддерживай связи по правилу 3–4=1.</div>')
          : '') +
      '</div>';
  }

  async function submit(n) {
    if (ST.busy) return;
    var D = DAYS[n - 1]; if (!D) return;
    var inp = document.getElementById('pgNote'); if (!inp) return;
    var note = inp.value.trim();
    if (note.length < 30) { toast('Опиши подробнее — хотя бы 2–3 предложения', 'info'); return; }
    ST.busy = true;
    var out = document.getElementById('pgOut');
    if (out) out.innerHTML = '<div class="pg-typing">📚 Фреди-наставник читает твой отчёт…</div>';
    var prompt = 'Ты — Фреди-наставник курса «Вариатика. Уровень Progressive» (по А. Мейстеру, переход в сектор ЧВ). День ' + n + ' из 7: «' + D.title + '». Стержень дня: «' + D.core + '».\n' +
      'Задание дня было: ' + D.task.replace(/<[^>]+>/g, '') + '\n\n' +
      'ОТЧЁТ ИГРОКА:\n"""\n' + note + '\n"""\n\n' +
      'Дай разбор: ' + D.check + ' Тон: на «ты», по делу, тёплый, без воды и без оценок «молодец/плохо». 4–6 предложений связной речью, без нумерации. Не пересказывай задание. Без служебных тегов.';
    var r = await aiGenerate(prompt, { temperature: 0.65, max_tokens: 380 });
    var fb = (r && r.success && r.content) ? clean(r.content) : 'Ты сделал шаг — это уже движение. Если что-то осталось непонятным, перечитай теорию дня и попробуй на одном конкретном человеке. Готов идти дальше — продолжай.';
    var p = loadProg();
    p.notes[n] = note; p.notes[n + '_fb'] = fb; p.done[n] = true; if (n + 1 > p.day) p.day = n + 1; saveProg(p);
    if (out) out.innerHTML = '<div class="pg-fb">' + nl2br(fb) + '</div>' +
      '<div class="pg-row">' +
        (n < 7 ? '<button class="pg-btn pg-primary" style="flex:1;width:auto;margin:0;padding:13px" onclick="PROGRESSIVE.day(' + (n + 1) + ')">Дальше → День ' + (n + 1) + '</button>'
              : '<button class="pg-btn pg-primary" style="flex:1;width:auto;margin:0;padding:13px" onclick="PROGRESSIVE.home()">🏁 К итогам курса</button>') +
        '<button class="pg-btn" style="width:auto;margin:0;padding:13px" onclick="PROGRESSIVE.home()">В курс</button>' +
      '</div>';
    ST.busy = false;
    track('feature_opened', { feature: 'progressive_day_done', day: n });
  }

  // ---------- БДК (учётные карточки) ----------
  function cards() {
    injectCSS();
    var p = loadProg();
    var c = container(); if (!c) return;
    var rows = p.cards.length
      ? p.cards.map(function (x, i) {
          return '<div class="pg-cardrow" onclick="PROGRESSIVE.editCard(' + i + ')" style="cursor:pointer">' +
            '<div><div class="nm">' + esc(x.name || '(без имени)') + '</div><div class="meta">' + esc((x.role || '') + (x.mast ? ' · ' + x.mast : '')) + '</div></div>' +
            '<button class="pg-x" onclick="event.stopPropagation();PROGRESSIVE.delCard(' + i + ')" aria-label="Удалить">✕</button>' +
          '</div>';
        }).join('')
      : '<div class="pg-card" style="text-align:center;color:#9aa0ad">Карточек пока нет. Заведи первую — пусть это будешь ты.</div>';
    c.innerHTML =
      '<div class="pg-wrap">' +
        '<button class="pg-ghost" onclick="PROGRESSIVE.home()">← В курс</button>' +
        '<div class="pg-h1">📇 База данных краников (БДК)</div>' +
        '<div class="pg-lead">Учётные карточки на «нужных» людей. Веди по фильтру «что мне интересно». На себя — обязательно (1–2 СВОИХ краника, не больше).</div>' +
        '<button class="pg-btn pg-primary" onclick="PROGRESSIVE.editCard(-1)">+ Новая карточка</button>' +
        '<div class="pg-cardlist">' + rows + '</div>' +
      '</div>';
  }

  function editCard(idx) {
    var p = loadProg();
    var cur = idx >= 0 ? (p.cards[idx] || {}) : {};
    var c = container(); if (!c) return;
    function fld(label, id, val, placeholder) {
      return '<label class="pg-field">' + esc(label) + '</label><input class="pg-inp" id="' + id + '" value="' + esc(val || '') + '" placeholder="' + esc(placeholder || '') + '">';
    }
    function area(label, id, val, placeholder) {
      return '<label class="pg-field">' + esc(label) + '</label><textarea class="pg-ta" id="' + id + '" style="min-height:70px" placeholder="' + esc(placeholder || '') + '">' + esc(val || '') + '</textarea>';
    }
    c.innerHTML =
      '<div class="pg-wrap">' +
        '<button class="pg-ghost" onclick="PROGRESSIVE.cards()">← В БДК</button>' +
        '<div class="pg-h1">' + (idx >= 0 ? '✏️ Карточка' : '➕ Новая карточка') + '</div>' +
        '<div class="pg-card">' +
          fld('ФИО / имя', 'pgcName', cur.name, 'Например: Петров Вадим') +
          fld('Где и кем работает', 'pgcRole', cur.role, 'Директор магазина автозапчастей') +
          fld('Ключевые области', 'pgcAreas', cur.areas, 'Ремонт машин, рыбалка') +
          fld('Масть / иерархия (примерно)', 'pgcMast', cur.mast, 'Валет ТФ') +
          area('Предресурсы (что даёт сам)', 'pgcPre', cur.pre, 'Автозапчасти, скидка') +
          area('Связи (выводит с гарантией)', 'pgcLinks', cur.links, '1) жена — нач. земотдела; 2) отец — сеть кафе…') +
          area('Знакомства (сводит без гарантий)', 'pgcAcq', cur.acq, 'Мэр города, нач. управления образования…') +
          fld('Мой рычаг на него', 'pgcLever', cur.lever, 'Баш-на-баш / страх / стройка снизу / флирт / дружба / надстройка сверху') +
          area('Что он может хотеть от меня', 'pgcWant', cur.want, 'Грузоперевозки, дизайн интерьеров, мобильное приложение…') +
          fld('Статус', 'pgcStat', cur.stat, 'Перспективный / неперспективный · лёгкий / сложный') +
          area('Особые отметки', 'pgcNote', cur.note, 'Не жлобится, общается на равных') +
        '</div>' +
        '<button class="pg-btn pg-primary" onclick="PROGRESSIVE.saveCard(' + idx + ')">💾 Сохранить</button>' +
        (idx >= 0 ? '<button class="pg-btn" onclick="PROGRESSIVE.delCard(' + idx + ')" style="border-color:rgba(239,68,68,.3);color:#fca5a5">🗑 Удалить</button>' : '') +
        '<button class="pg-btn" onclick="PROGRESSIVE.cards()">Отмена</button>' +
      '</div>';
  }
  function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function saveCard(idx) {
    var p = loadProg();
    var obj = {
      name: v('pgcName'), role: v('pgcRole'), areas: v('pgcAreas'), mast: v('pgcMast'),
      pre: v('pgcPre'), links: v('pgcLinks'), acq: v('pgcAcq'),
      lever: v('pgcLever'), want: v('pgcWant'), stat: v('pgcStat'), note: v('pgcNote'),
      ts: idx >= 0 && p.cards[idx] ? p.cards[idx].ts : 0
    };
    if (!obj.name) { toast('Имя обязательно', 'info'); return; }
    if (idx >= 0) p.cards[idx] = obj; else p.cards.push(obj);
    saveProg(p); toast('Карточка сохранена', 'success'); cards();
  }
  function delCard(idx) {
    if (!confirm('Удалить карточку?')) return;
    var p = loadProg(); p.cards.splice(idx, 1); saveProg(p); cards();
  }

  // ---------- тест на масть (день 5) ----------
  var TEST = [
    { q: 'Кому ты больше симпатизируешь?', opts: [
      { t: 'Кулибин и Ломоносов', m: 'UB' },
      { t: 'Добрыня Никитич и Соловей-Разбойник', m: 'SB' },
      { t: 'Корейко и Остап Бендер', m: 'CV' },
      { t: 'Генри Форд и сын Рокфеллера', m: 'TF' } ] },
    { q: 'Какой подарок порадовал бы больше?', opts: [
      { t: 'Интервью на ТВ и улица в твою честь', m: 'UB' },
      { t: 'Машина и дача мечты', m: 'TF' },
      { t: '12 приёмов карате и взвод ОМОНа в подчинение', m: 'SB' },
      { t: 'ВНЖ в Голландии и опыт на бирже', m: 'CV' } ] },
    { q: 'На какое мероприятие скорее пойдёшь?', opts: [
      { t: 'Вечер защиты докторской знакомого', m: 'UB' },
      { t: 'Концерт малоизвестного барда (на галёрку)', m: 'CV' },
      { t: 'Обмыв нового телевизора', m: 'TF' },
      { t: 'Банкет по поводу победы над противником', m: 'SB' } ] },
    { q: 'Какое наследие хотел бы оставить?', opts: [
      { t: 'Бессмертное произведение, гениальный роман', m: 'UB' },
      { t: 'Большое наследство детям и внукам', m: 'TF' },
      { t: 'Память о тебе как о непобедимом', m: 'SB' },
      { t: 'Уважение среди своих', m: 'CV' } ] },
    { q: 'С кем хотел бы быть на короткой ноге?', opts: [
      { t: 'С гениальным учёным современности', m: 'UB' },
      { t: 'С генералом госбезопасности', m: 'SB' },
      { t: 'Со «старой бандершей» (по тексту канона)', m: 'CV' },
      { t: 'С хорошим денежным клиентом', m: 'TF' } ] }
  ];
  function test() {
    var p = loadProg();
    p._testAns = []; saveProg(p);
    renderTestQ(0);
  }
  function renderTestQ(idx) {
    var c = container(); if (!c) return;
    if (idx >= TEST.length) { renderTestResult(); return; }
    var Q = TEST[idx];
    var opts = Q.opts.map(function (o, i) {
      return '<button class="pg-btn" onclick="PROGRESSIVE.testPick(' + idx + ',' + i + ')">' + esc(o.t) + '</button>';
    }).join('');
    c.innerHTML =
      '<div class="pg-wrap">' +
        '<button class="pg-ghost" onclick="PROGRESSIVE.day(5)">← К дню 5</button>' +
        '<div class="pg-h1">🧬 Тест на масть · ' + (idx + 1) + '/' + TEST.length + '</div>' +
        '<div class="pg-prog"><i style="width:' + Math.round(idx / TEST.length * 100) + '%"></i></div>' +
        '<div class="pg-card" style="font-size:1.04rem;color:#fff"><b>' + esc(Q.q) + '</b></div>' + opts +
      '</div>';
  }
  function testPick(idx, optIdx) {
    var p = loadProg();
    p._testAns = p._testAns || [];
    p._testAns[idx] = TEST[idx].opts[optIdx].m;
    saveProg(p);
    renderTestQ(idx + 1);
  }
  function renderTestResult() {
    var p = loadProg();
    var score = { SB: 0, TF: 0, UB: 0, CV: 0 };
    (p._testAns || []).forEach(function (m) { if (score[m] != null) score[m]++; });
    var names = { SB: '♠ СБ · Силовик-Беспредельщик · сила/власть', TF: '♣ ТФ · Трудяга-Фермер · собственность/стабильность', UB: '♦ УБ · Умный-Бедный · почёт/уважение/оценка', CV: '♥ ЧВ · Человек-Возможность · возможности/свобода' };
    var sorted = Object.keys(score).sort(function (a, b) { return score[b] - score[a]; });
    var primary = sorted[0];
    var rows = sorted.map(function (k) { return '<div class="pg-cardrow"><div class="nm">' + esc(names[k]) + '</div><div class="meta"><b>' + score[k] + '</b> из 5</div></div>'; }).join('');
    p._testResult = primary; saveProg(p);
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pg-wrap">' +
        '<button class="pg-ghost" onclick="PROGRESSIVE.day(5)">← К дню 5</button>' +
        '<div class="pg-h1">🧬 Твоя основная масть</div>' +
        '<div class="pg-core">«' + esc(names[primary]) + '»</div>' +
        '<div class="pg-lead">Чистых типов почти не бывает. У большинства: основная масть 60–70%, вторичная 20–30%. Цель Progressive — научиться действовать в логике <b>ЧВ</b>, какой бы ни была твоя родная масть.</div>' +
        '<div class="pg-h2">Распределение</div>' + rows +
        '<button class="pg-btn pg-primary" onclick="PROGRESSIVE.day(5)">Вернуться к дню 5</button>' +
      '</div>';
    track('feature_opened', { feature: 'progressive_mast_test', mast: primary });
  }

  // ---------- экспорт ----------
  window.PROGRESSIVE = {
    home: home, exit: exit, openPremium: openPremium, day: day, submit: submit, reset: reset,
    cards: cards, editCard: editCard, saveCard: saveCard, delCard: delCard,
    test: test, testPick: testPick
  };
  window.showProgressiveGame = home;
  console.log('✅ progressive.js loaded (Вариатика Progressive: 7-дневный курс)');
})();
