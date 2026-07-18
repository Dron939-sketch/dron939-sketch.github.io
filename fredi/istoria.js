// ============================================================
// istoria.js — симулятор «Другая история» — изменение личной
// истории (НЛП) на доказательной базе реконсолидации памяти.
//
// Не переписывает ФАКТЫ прошлого, а меняет их СЛЕД и СМЫСЛ:
// реактивировать память → прожить новый опыт (недостающий
// ресурс) → протянуть к настоящему → закрепить микро-действием.
// Пять актов = три шага реконсолидации. ИИ-проводник подбирает
// сцену и ресурс под игрока. Предохранитель на острую травму
// с уводом к живому специалисту. Ложные воспоминания не
// внушаются: работаем со смыслом и ресурсом, а не с «так было».
// Бесплатно. Экспорт: window.showIstoriaGame, window.ISTORIA
// ============================================================
(function () {
  'use strict';

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 320, temperature: opts.temperature == null ? 0.5 : opts.temperature };
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
  var LEC = {
    kritik:  { t: 'Внутренний критик: откуда голос в голове', u: SITE + '/blog/lekciya-samoocenka-4-vnutrennij-kritik.html' },
    fakty:   { t: 'Мысли — не факты: искусство децентрации', u: SITE + '/blog/lekciya-osoz-5-mysli-ne-fakty.html' },
    sostr:   { t: 'Самосострадание вместо самооценки', u: SITE + '/blog/lekciya-samoocenka-6-samosostradanie.html' }
  };

  // ===== Сферы, где «жмёт» (Акт 1) =====
  var SPHERES = [
    { k: 'confidence', em: '🛡', t: 'Уверенность', d: 'сжимаюсь, замолкаю, не решаюсь' },
    { k: 'anxiety',    em: '🌊', t: 'Тревога', d: 'жду плохого, не отпускает' },
    { k: 'relations',  em: '🤝', t: 'Отношения', d: 'боюсь близости, отказа, конфликта' },
    { k: 'work',       em: '🚀', t: 'Дело и деньги', d: 'не прошу, не берусь, обесцениваю' },
    { k: 'guilt',      em: '🪶', t: 'Вина и стыд', d: 'виноват, недостаточно хорош' },
    { k: 'own',        em: '✍️', t: 'Своё', d: 'опишу словами' }
  ];
  var SPHERE_PATTERNS = {
    confidence: ['Замолкаю и соглашаюсь, когда со мной не согласны', 'Не решаюсь заявить о себе — вдруг откажут', 'Заранее уверен, что не справлюсь'],
    anxiety:    ['Жду подвоха даже когда всё хорошо', 'Прокручиваю худшие сценарии по кругу', 'Не могу расслабиться и довериться'],
    relations:  ['Отстраняюсь первым, чтобы не бросили', 'Терплю и молчу, лишь бы не конфликт', 'Жду, что меня не выберут'],
    work:       ['Не прошу того, что заслужил', 'Откладываю и не берусь за важное', 'Обесцениваю свой труд и результат'],
    guilt:      ['Чувствую вину даже там, где не виноват', 'Не разрешаю себе хорошее', 'Кажется, что со мной что-то не так'],
    own:        ['Сжимаюсь в важный момент', 'Избегаю того, что для меня важно', 'Жду, что будет как всегда']
  };
  // Запасные «ресурсы» на случай сбоя ИИ
  var FALLBACK_RES = { confidence: 'опора и право на свой голос', anxiety: 'безопасность и «я справлюсь»', relations: 'ценность и право быть выбранным', work: 'достоинство своего труда', guilt: 'разрешение и принятие', own: 'внутренняя опора' };

  function loadProg() {
    try { var p = JSON.parse(localStorage.getItem('istoria_path') || 'null'); if (p && typeof p === 'object') return p; } catch (e) {}
    return { done: 0, title: '', line: '' };
  }
  function saveProg(p) { try { localStorage.setItem('istoria_path', JSON.stringify(p)); } catch (e) {} }

  // act: intro→sphere→desired→pattern→resource→scene→rewrite→timeline→finish (+help)
  var ST = { act: 'intro', sphere: '', sphereT: '', desired: '', pattern: '', resource: '', scene: '', rewrite: '', timeline: '', busy: false };

  var ACTS = [
    { k: 'A', t: 'Понять' },
    { k: 'B', t: 'Найти' },
    { k: 'C', t: 'Прожить' },
    { k: 'D', t: 'Протянуть' },
    { k: 'E', t: 'Закрепить' }
  ];
  function actIndex() {
    var m = { intro: -1, sphere: 0, desired: 0, pattern: 0, resource: 1, scene: 1, rewrite: 2, timeline: 3, finish: 4, help: -1 };
    return m[ST.act] == null ? -1 : m[ST.act];
  }

  // ===== Стили =====
  function injectCSS() {
    if (document.getElementById('istoria-css')) return;
    var st = document.createElement('style'); st.id = 'istoria-css';
    st.textContent = [
      '.is-wrap{max-width:640px;margin:0 auto;padding:18px 16px 96px;color:#e7eaf0;font-size:1rem;line-height:1.6}',
      '.is-top{display:flex;justify-content:space-between;align-items:center;color:#8b93a7;font-size:.86rem;margin-bottom:12px}',
      '.is-x{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:0}',
      '.is-hard{background:none;border:1px solid rgba(251,191,36,.35);color:#fcd34d;font:600 .78rem inherit;border-radius:999px;padding:4px 11px;cursor:pointer}',
      '.is-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:0 0 6px}',
      '.is-sub{color:#aab2c4;margin:0 0 16px}',
      '.is-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px;margin:0 0 12px}',
      '.is-card b{color:#fff;font-weight:600}',
      '.is-ch{font-weight:700;color:#fff;margin-bottom:8px}',
      '.is-quote{background:rgba(245,158,11,.09);border:1px solid rgba(251,191,36,.35);border-left:3px solid #f59e0b;border-radius:12px;padding:12px 14px;color:#fde8c8;font-size:.97rem;line-height:1.6}',
      '.is-res{background:rgba(245,158,11,.12);border:1px solid rgba(251,191,36,.5);border-radius:12px;padding:12px 15px;color:#fcd34d;font-weight:700;text-align:center;font-size:1.05rem}',
      '.is-choice{display:flex;align-items:flex-start;gap:12px;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);border-radius:13px;padding:13px 15px;margin:0 0 10px;color:#e7eaf0;font:inherit;font-size:.95rem;line-height:1.45;cursor:pointer;transition:.15s}',
      '.is-choice:hover{border-color:rgba(251,191,36,.6);background:rgba(245,158,11,.06)}',
      '.is-choice .cem{font-size:1.35rem;flex-shrink:0;line-height:1.2}',
      '.is-choice .ct b{display:block;color:#fff;font-weight:700;margin-bottom:1px}',
      '.is-choice .ct i{font-style:normal;color:#8b93a7;font-size:.82rem}',
      '.is-prog{display:flex;gap:6px;margin:0 0 16px}',
      '.is-prog .st{flex:1;text-align:center}',
      '.is-prog .st i{display:block;height:5px;border-radius:3px;background:rgba(255,255,255,.14);margin-bottom:5px}',
      '.is-prog .st.on i{background:#f59e0b}',
      '.is-prog .st.done i{background:#fcd34d}',
      '.is-prog .st span{font-size:.68rem;color:#8b93a7;letter-spacing:.02em}',
      '.is-prog .st.on span{color:#fcd34d;font-weight:700}',
      '.is-ta{width:100%;box-sizing:border-box;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;font:15px/1.5 inherit;padding:12px 13px;resize:vertical;min-height:84px}',
      '.is-ta:focus{outline:none;border-color:#f59e0b}',
      '.is-hint{color:#8b93a7;font-size:.85rem;margin:6px 2px}',
      '.is-primary{width:100%;margin-top:14px;padding:14px 16px;border:none;border-radius:12px;background:linear-gradient(135deg,#b45309,#f59e0b);color:#fff;font:700 1rem inherit;cursor:pointer}',
      '.is-primary:disabled{opacity:.5;cursor:default}',
      '.is-secondary{width:100%;margin-top:10px;padding:12px 16px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:transparent;color:#cdd4e2;font:600 .95rem inherit;cursor:pointer}',
      '.is-pill{display:inline-block;padding:6px 16px;border-radius:999px;font-weight:800;font-size:1.05rem;background:rgba(251,191,36,.16);color:#fcd34d}',
      '.is-safe{background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.35);border-radius:12px;padding:13px 15px;color:#cfe0ff;font-size:.9rem;line-height:1.55;margin:0 0 12px}',
      '.is-spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:isspin .7s linear infinite;vertical-align:-3px;margin-right:6px}',
      '@keyframes isspin{to{transform:rotate(360deg)}}',
      '.is-lec{display:inline-block;margin-top:9px;font-size:.85rem;color:#fcd34d;text-decoration:none;border-bottom:1px solid rgba(252,211,77,.35)}',
      '.is-fb{color:#d7def0;line-height:1.65}',
      '.is-row{display:flex;gap:10px;margin-top:14px}',
      '.is-row>*{flex:1;margin-top:0}',
      '[data-theme="light"] .is-wrap{color:#1d1d1f}',
      '[data-theme="light"] .is-card,[data-theme="light"] .is-choice{background:#fff;border-color:rgba(0,0,0,.12);color:#1d1d1f}',
      '[data-theme="light"] .is-card b,[data-theme="light"] .is-ch,[data-theme="light"] .is-choice .ct b{color:#0b1220}',
      '[data-theme="light"] .is-sub,[data-theme="light"] .is-hint,[data-theme="light"] .is-top,[data-theme="light"] .is-choice .ct i{color:#5a6472}',
      '[data-theme="light"] .is-ta{background:#f5f7fa;color:#0b1220;border-color:rgba(0,0,0,.15)}',
      '[data-theme="light"] .is-quote{background:#fff7ea;color:#7c4a03}',
      '[data-theme="light"] .is-res{background:#fef3c7;color:#92600a}',
      '[data-theme="light"] .is-fb{color:#333}',
      '[data-theme="light"] .is-safe{background:#eef5ff;color:#1e40af}',
      '[data-theme="light"] .is-lec{color:#92600a}',
      '@media(max-width:560px){.is-wrap{padding:14px 12px 96px}.is-h1{font-size:1.32rem}.is-prog .st span{font-size:.62rem}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function head(withProg) {
    var i = actIndex();
    var prog = '';
    if (withProg && i >= 0) {
      prog = '<div class="is-prog">' + ACTS.map(function (a, k) {
        return '<div class="st ' + (k === i ? 'on' : (k < i ? 'done' : '')) + '"><i></i><span>' + a.t + '</span></div>';
      }).join('') + '</div>';
    }
    return '<div class="is-top"><button class="is-x" onclick="ISTORIA.quit()">← К списку игр</button>' +
      '<button class="is-hard" onclick="ISTORIA.hard()">мне сейчас тяжело</button></div>' + prog;
  }

  // ===== Экран помощи (предохранитель) =====
  function hard() { renderHelp(true); }
  function renderHelp(manual) {
    ST.act = 'help';
    injectCSS();
    var c = container(); if (!c) return;
    track('is_safety', { manual: !!manual });
    c.innerHTML =
      '<div class="is-wrap">' +
        '<div class="is-top"><button class="is-x" onclick="ISTORIA.home()">← К списку игр</button></div>' +
        '<h1 class="is-h1">Ты важнее любой игры</h1>' +
        '<div class="is-safe" style="font-size:.98rem">Похоже, тема сейчас слишком тяжёлая или острая — и это не место для самостоятельной игры. Так и должно быть: с тяжёлым прошлым — насилием, потерей, тем, что до сих пор ранит, — работают не в тренажёре, а бережно и вживую.</div>' +
        '<div class="is-card"><div class="is-ch">Что можно сделать прямо сейчас</div>' +
          '<div class="is-fb">• Поговорить с Фреди — спокойно, без осуждения, в любое время.<br>' +
          '• Если совсем плохо и есть мысли причинить себе вред — позвони на линию психологической помощи <b>8-800-2000-122</b> (бесплатно, круглосуточно, анонимно).<br>' +
          '• С по-настоящему тяжёлой историей стоит прийти к живому психологу — это не слабость, а сильный ход.</div></div>' +
        '<button class="is-primary" onclick="(window.showSosScreen?window.showSosScreen():window.showFrediChat&&window.showFrediChat())">💙 Побыть с Фреди сейчас</button>' +
        '<button class="is-secondary" onclick="ISTORIA.home()">Вернуться к играм</button>' +
      '</div>';
  }

  // ===== Дом / интро =====
  function home() { renderIntro(); }
  function renderIntro() {
    injectCSS();
    ST = { act: 'intro', sphere: '', sphereT: '', desired: '', pattern: '', resource: '', scene: '', rewrite: '', timeline: '', busy: false };
    var c = container(); if (!c) return;
    var p = loadProg();
    c.innerHTML =
      '<div class="is-wrap">' +
        '<div class="is-top"><button class="is-x" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button><span>📖 бесплатно</span></div>' +
        '<h1 class="is-h1">📖 Другая история</h1>' +
        '<p class="is-sub">Прошлое как факт не изменить. Но его <b style="color:#e7eaf0">след в тебе</b> — можно. Вместе с Фреди ты найдёшь сцену из прошлого, которая до сих пор управляет настоящим, и проживёшь её иначе — с тем ресурсом, которого тогда не хватило.</p>' +
        (p.line ? '<div class="is-card"><div class="is-ch">Твоя прошлая история</div><div class="is-quote">' + esc(p.line) + '</div>' + (p.done ? '<div class="is-hint" style="margin-top:8px">Пройдено сессий: ' + p.done + '</div>' : '') + '</div>' : '') +
        '<div class="is-card"><div class="is-ch">Как это работает</div>' +
          '<div class="is-fb" style="font-size:.95rem">Наука о памяти: воспоминание при возврате к нему на несколько часов становится «пластичным» и пересобирается заново — <b>реконсолидация</b>. Если в этот момент прожить новый опыт, память закрепляется уже с ним. Мы не выдумываем, что «так было», — мы вносим <b>смысл и ресурс</b> и меняем то, как прошлое звучит сегодня. Пять шагов: понять → найти → прожить → протянуть → закрепить.</div></div>' +
        '<div class="is-safe">Бережно: это игра-тренажёр, а не терапия. Она про обычные «занозы», а не про тяжёлую травму. Если тема острая — кнопка «мне сейчас тяжело» вверху уведёт к живой помощи в любой момент.</div>' +
        '<button class="is-primary" onclick="ISTORIA.startFlow()">Начать бережно →</button>' +
      '</div>';
    track('game_open', { game: 'istoria' });
  }
  function startFlow() { ST.act = 'sphere'; renderSphere(); }

  // ===== Акт 1a: сфера =====
  function renderSphere() {
    injectCSS(); ST.act = 'sphere';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="is-wrap">' + head(true) +
        '<h1 class="is-h1">Где сейчас «жмёт»?</h1>' +
        '<p class="is-sub">Выбери сферу, в которой ты чаще всего наступаешь на одни и те же грабли.</p>' +
        SPHERES.map(function (s) {
          return '<button class="is-choice" onclick="ISTORIA.pickSphere(\'' + s.k + '\')"><span class="cem">' + s.em + '</span><span class="ct"><b>' + esc(s.t) + '</b><i>' + esc(s.d) + '</i></span></button>';
        }).join('') +
      '</div>';
  }
  function pickSphere(k) {
    var s = SPHERES.filter(function (x) { return x.k === k; })[0]; if (!s) return;
    ST.sphere = k; ST.sphereT = s.t; vibe(12);
    ST.act = 'desired'; renderDesired();
  }

  // ===== Акт 1b: желаемое состояние =====
  function renderDesired() {
    injectCSS();
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="is-wrap">' + head(true) +
        '<h1 class="is-h1">Каким ты хочешь быть?</h1>' +
        '<p class="is-sub">В этих ситуациях — <b style="color:#e7eaf0">' + esc(ST.sphereT.toLowerCase()) + '</b> — каким ты хотел бы себя чувствовать и вести? Одна-две фразы, своими словами.</p>' +
        '<textarea class="is-ta" id="isIn" placeholder="Например: спокойным и уверенным, говорить прямо, не сжиматься…"></textarea>' +
        '<button class="is-primary" onclick="ISTORIA.submitDesired()">Дальше →</button>' +
      '</div>';
    focusInput('isIn');
  }
  function submitDesired() {
    var v = val('isIn');
    if (v.length < 4) { toast('Опиши хотя бы парой слов', 'error'); return; }
    ST.desired = v; ST.act = 'pattern'; renderPatternLoad();
  }

  // ===== Акт 1c: паттерн настоящего (ИИ) =====
  async function renderPatternLoad() {
    injectCSS();
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="is-wrap">' + head(true) + spinner('Фреди подбирает, что именно повторяется…') + '</div>';
    var opts = SPHERE_PATTERNS[ST.sphere] || SPHERE_PATTERNS.own;
    if (ST.busy) return; ST.busy = true;
    try {
      var r = await aiGenerate(
        'Ты — тёплый проводник по методу изменения личной истории. Человек хочет в сфере «' + ST.sphereT + '» стать: «' + ST.desired + '».\n' +
        'Предложи 3 коротких формулировки ПОВТОРЯЮЩЕГОСЯ паттерна настоящего — как он, скорее всего, реагирует сейчас (от первого лица, «я …», по 4-8 слов, живым языком, без диагнозов).\n' +
        'Верни СТРОГО JSON: {"patterns":["...","...","..."]}. По-русски.',
        { max_tokens: 180, temperature: 0.6 });
      var res = parseJson(r && r.content);
      if (res && Array.isArray(res.patterns) && res.patterns.length) opts = res.patterns.slice(0, 4);
    } catch (e) {}
    ST.busy = false;
    renderPattern(opts);
  }
  function renderPattern(opts) {
    var c = container(); if (!c) return;
    ST._opts = opts;
    c.innerHTML =
      '<div class="is-wrap">' + head(true) +
        '<h1 class="is-h1">Что повторяется?</h1>' +
        '<p class="is-sub">Узнаёшь себя? Выбери, что ближе — или впиши свой вариант.</p>' +
        opts.map(function (o, i) { return '<button class="is-choice" onclick="ISTORIA.pickPattern(' + i + ')"><span class="cem">↻</span><span class="ct"><b>' + esc(o) + '</b></span></button>'; }).join('') +
        '<textarea class="is-ta" id="isIn" placeholder="Или свой паттерн: «я …»"></textarea>' +
        '<button class="is-secondary" onclick="ISTORIA.pickPatternOwn()">Взять свой вариант →</button>' +
      '</div>';
  }
  function pickPattern(i) { ST.pattern = ST._opts[i]; vibe(12); ST.act = 'resource'; renderResourceLoad(); }
  function pickPatternOwn() {
    var v = val('isIn');
    if (v.length < 4) { toast('Впиши свой паттерн или выбери из списка', 'error'); return; }
    ST.pattern = v; ST.act = 'resource'; renderResourceLoad();
  }

  // ===== Переход: недостающий ресурс + приглашение к сцене (ИИ) =====
  async function renderResourceLoad() {
    injectCSS();
    var c = container(); if (!c) return;
    c.innerHTML = '<div class="is-wrap">' + head(true) + spinner('Фреди ищет, чего тогда не хватило…') + '</div>';
    var resource = FALLBACK_RES[ST.sphere] || 'внутренняя опора';
    var hint = 'Вспомни ранний, обычный момент, где ты впервые почувствовал то же самое. Не обязательно драма — часто это мелочь: слова, взгляд, ситуация.';
    if (!ST.busy) {
      ST.busy = true;
      try {
        var r = await aiGenerate(
          'Ты — тёплый проводник по изменению личной истории. Сфера: «' + ST.sphereT + '». Желаемое: «' + ST.desired + '». Паттерн настоящего: «' + ST.pattern + '».\n' +
          'Назови в 3-6 словах, какого внутреннего РЕСУРСА человеку не хватило в прошлом (например: защита, разрешение, опора, право на голос, безопасность, «меня видят»). И дай одну тёплую фразу-приглашение вспомнить раннюю сцену, где этот дефицит зародился.\n' +
          'Верни СТРОГО JSON: {"resource":"...","invite":"..."}. По-русски, на «ты», бережно.',
          { max_tokens: 160, temperature: 0.5 });
        var res = parseJson(r && r.content);
        if (res && res.resource) resource = String(res.resource).slice(0, 60);
        if (res && res.invite) hint = String(res.invite).slice(0, 240);
      } catch (e) {}
      ST.busy = false;
    }
    ST.resource = resource;
    renderResource(hint);
  }
  function renderResource(hint) {
    ST.act = 'scene';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="is-wrap">' + head(true) +
        '<h1 class="is-h1">Чего тогда не хватило</h1>' +
        '<div class="is-res">🔑 ' + esc(ST.resource) + '</div>' +
        '<p class="is-sub" style="margin-top:14px">' + esc(hint) + '</p>' +
        '<div class="is-safe">Не ныряй в самое страшное. Возьми сцену, к которой можешь прикоснуться спокойно. Если поднимается слишком много — жми «мне сейчас тяжело».</div>' +
        '<textarea class="is-ta" id="isIn" style="min-height:110px" placeholder="Коротко опиши сцену: где ты, сколько тебе лет, что происходит, что ты чувствуешь…"></textarea>' +
        '<button class="is-primary" onclick="ISTORIA.submitScene()">Я вспомнил →</button>' +
      '</div>';
    focusInput('isIn');
  }

  // ===== Акт 2: сцена + проверка безопасности (ИИ) =====
  async function submitScene() {
    var v = val('isIn');
    if (v.length < 15) { toast('Опиши сцену чуть подробнее', 'error'); return; }
    if (ST.busy) return;
    ST.scene = v; ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="is-wrap">' + head(true) + spinner('Фреди бережно смотрит на сцену…') + '</div>';
    var res = null;
    try {
      var r = await aiGenerate(
        'Ты — бережный проводник по изменению личной истории и одновременно следишь за безопасностью. Человек описал раннюю сцену: «' + v + '».\n' +
        'Ресурс, которого не хватало: «' + ST.resource + '».\n' +
        'ЗАДАЧА 1 (безопасность): если сцена содержит тяжёлую травму — физическое или сексуальное насилие, смерть близкого, суицидальные темы, серьёзное жестокое обращение — поставь "acute":true (такое нельзя прорабатывать в игре-тренажёре, только со специалистом). Обычные детские обиды, критика, стыд, одиночество, неудачи — это "acute":false.\n' +
        'ЗАДАЧА 2 (если не acute): тепло отрази сцену в 1-2 фразах, назови младшего себя в ней и подтверди, чего именно ему не хватило.\n' +
        'Верни СТРОГО JSON: {"acute":false,"reflection":"одна-две тёплые фразы","younger":"как виден младший ты (короткая фраза)"}. По-русски, на «ты».',
        { max_tokens: 220, temperature: 0.45 });
      res = parseJson(r && r.content);
    } catch (e) { res = null; }
    ST.busy = false;
    if (res && res.acute === true) { renderHelp(false); return; }
    if (!res) res = { reflection: 'Спасибо, что доверил это. Маленький ты в той сцене остался с тем, что не смог тогда унести.', younger: 'маленький ты, которому не хватило опоры' };
    track('is_scene', {});
    renderRewriteIntro(res);
  }
  function renderRewriteIntro(res) {
    ST.act = 'rewrite';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="is-wrap">' + head(true) +
        '<h1 class="is-h1">Проживи иначе</h1>' +
        '<div class="is-quote">' + nl2br(res.reflection || '') + (res.younger ? '<br><br>Там — ' + esc(res.younger) + '.' : '') + '</div>' +
        '<p class="is-sub" style="margin-top:14px">Теперь — самое главное. Войди в ту сцену <b style="color:#e7eaf0">взрослым собой</b> — с ресурсом «' + esc(ST.resource) + '». Что ты делаешь, что говоришь маленькому себе? Кто ещё приходит на помощь? Как теперь заканчивается эта сцена?</p>' +
        '<textarea class="is-ta" id="isIn" style="min-height:130px" placeholder="Я подхожу к маленькому себе и…"></textarea>' +
        '<button class="is-primary" onclick="ISTORIA.submitRewrite()">Прожил →</button>' +
      '</div>';
    focusInput('isIn');
  }

  // ===== Акт 3 → углубление (ИИ) =====
  async function submitRewrite() {
    var v = val('isIn');
    if (v.length < 15) { toast('Побудь в сцене подольше — что именно происходит?', 'error'); return; }
    if (ST.busy) return;
    ST.rewrite = v; ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="is-wrap">' + head(true) + spinner('Фреди помогает прожить это глубже…') + '</div>';
    var res = null;
    try {
      var r = await aiGenerate(
        'Ты — тёплый режиссёр внутренней сцены. Человек переписал раннюю сцену, внеся ресурс «' + ST.resource + '»: «' + v + '».\n' +
        'Усиль новый опыт: тепло подтверди, что он сделал, и задай ОДИН вопрос, который поможет прожить это телом и до конца (что чувствует младший ты теперь? что меняется в теле, во взгляде? что он уносит с собой?).\n' +
        'Верни СТРОГО JSON: {"warm":"одна тёплая фраза-подтверждение","deepen":"один короткий вопрос"}. По-русски, на «ты».',
        { max_tokens: 180, temperature: 0.5 });
      res = parseJson(r && r.content);
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { warm: 'Ты дал маленькому себе то, чего он ждал годами. Побудь в этом ещё секунду.', deepen: 'Что чувствует маленький ты теперь — в теле, во взгляде?' };
    track('is_rewrite', {});
    renderTimeline(res);
  }

  // ===== Акт 4: протянуть к настоящему =====
  function renderTimeline(res) {
    ST.act = 'timeline';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="is-wrap">' + head(true) +
        '<h1 class="is-h1">Протяни до сегодня</h1>' +
        (res ? '<div class="is-quote">' + nl2br(res.warm || '') + (res.deepen ? '<br><br>' + esc(res.deepen) : '') + '</div>' : '') +
        '<p class="is-sub" style="margin-top:14px">А теперь пронеси этот новый опыт и ресурс «' + esc(ST.resource) + '» через жизнь — до сегодняшнего дня. Вспомни свой паттерн: <b style="color:#e7eaf0">«' + esc(ST.pattern) + '»</b>. Как он звучит и как ты действуешь <b style="color:#e7eaf0">теперь</b>, когда у тебя внутри есть это?</p>' +
        '<textarea class="is-ta" id="isIn" style="min-height:110px" placeholder="Теперь, когда критикуют, я…"></textarea>' +
        '<button class="is-primary" onclick="ISTORIA.submitTimeline()">Закрепить →</button>' +
      '</div>';
    focusInput('isIn');
  }
  async function submitTimeline() {
    var v = val('isIn');
    if (v.length < 10) { toast('Опиши, как теперь иначе', 'error'); return; }
    if (ST.busy) return;
    ST.timeline = v; ST.busy = true;
    var c = container();
    if (c) c.innerHTML = '<div class="is-wrap">' + head(true) + spinner('Фреди собирает твою новую историю…') + '</div>';
    var res = null;
    try {
      var r = await aiGenerate(
        'Ты — тёплый проводник. Итог сессии изменения личной истории.\n' +
        'Сфера: «' + ST.sphereT + '». Желаемое: «' + ST.desired + '». Старый паттерн: «' + ST.pattern + '». Ресурс: «' + ST.resource + '». Как теперь иначе: «' + v + '».\n' +
        'Сделай три вещи: (1) сформулируй НОВУЮ строчку истории о себе от первого лица — короткую, тёплую, в настоящем времени; (2) предложи ОДНО крошечное действие на ближайшие 24 часа, которое подтвердит новую историю в реальной жизни (конкретное, посильное); (3) дай одну фразу-напутствие.\n' +
        'Верни СТРОГО JSON: {"line":"новая строчка о себе","action":"микро-действие на 24 часа","note":"напутствие"}. По-русски, на «ты».',
        { max_tokens: 220, temperature: 0.5 });
      res = parseJson(r && r.content);
    } catch (e) { res = null; }
    ST.busy = false;
    if (!res) res = { line: 'Со мной всё в порядке. У меня есть опора, и я могу говорить своим голосом.', action: 'Сегодня в одном разговоре скажи вслух то, что раньше проглотил бы.', note: 'Возвращайся к этой истории — память закрепляет то, к чему возвращаются.' };
    renderFinish(res);
  }

  // ===== Акт 5: финал =====
  function renderFinish(res) {
    ST.act = 'finish';
    var c = container(); if (!c) return;
    var p = loadProg();
    p.done = (p.done || 0) + 1;
    p.line = res.line || p.line;
    p.title = p.done >= 3 ? '📖 Мастер историй' : '📖 Автор своей истории';
    saveProg(p);
    track('game_finish', { game: 'istoria', done: p.done });
    c.innerHTML =
      '<div class="is-wrap">' + head(true) +
        '<div style="text-align:center;margin:8px 0 14px"><span class="is-pill">' + esc(p.title) + '</span></div>' +
        '<div class="is-card"><div class="is-ch">📖 Твоя новая история</div><div class="is-quote" style="font-size:1.05rem">' + nl2br(res.line || '') + '</div></div>' +
        '<div class="is-card"><div class="is-ch">🎯 Мост в жизнь · 24 часа</div><div class="is-fb">' + nl2br(res.action || '') + '</div>' +
          '<div class="is-hint" style="margin-top:8px">Это и есть третий шаг: новый опыт закрепляется, когда ты подтверждаешь его действием в реальности.</div></div>' +
        (res.note ? '<div class="is-quote">💛 ' + nl2br(res.note) + '</div>' : '') +
        '<div class="is-card"><div class="is-ch">Чтобы закрепилось</div><div class="is-fb" style="font-size:.95rem">Память переписывается не с одного раза. Возвращайся к этой новой сцене в спокойные минуты — перед сном, на прогулке — ещё несколько раз в разные дни. И замечай в жизни моменты, где новая история уже сбывается.</div>' + lecLink('sostr') + '</div>' +
        '<div class="is-row"><button class="is-primary" onclick="ISTORIA.home()">🔁 Другая история</button><button class="is-secondary" onclick="(window.showFrediChat?window.showFrediChat():0)">Поговорить с Фреди</button></div>' +
      '</div>';
  }

  // ===== утилиты =====
  function spinner(txt) { return '<div style="text-align:center;padding:50px 0"><div style="font-size:2rem"><span class="is-spin"></span></div><p class="is-sub" style="margin-top:14px">' + esc(txt) + '</p></div>'; }
  function val(id) { return ((document.getElementById(id) || {}).value || '').trim(); }
  function focusInput(id) { setTimeout(function () { var el = document.getElementById(id); if (el) el.focus(); }, 60); }
  function lecLink(key) { var l = LEC[key]; return '<a class="is-lec" href="' + l.u + '" target="_blank" rel="noopener">📖 Лекция: ' + esc(l.t) + ' →</a>'; }
  function quit() {
    if (ST.act !== 'intro' && ST.act !== 'help' && ST.act !== 'finish' && !confirm('Выйти? Прогресс сессии не сохранится.')) return;
    if (window.showKonturScreen) window.showKonturScreen(); else home();
  }

  window.ISTORIA = {
    home: home, startFlow: startFlow,
    pickSphere: pickSphere, submitDesired: submitDesired,
    pickPattern: pickPattern, pickPatternOwn: pickPatternOwn,
    submitScene: submitScene, submitRewrite: submitRewrite, submitTimeline: submitTimeline,
    hard: hard, quit: quit, getState: function () { return ST; }
  };
  window.showIstoriaGame = home;
})();
