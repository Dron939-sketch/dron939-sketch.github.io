// ============================================
// kontur.js — Модуль «О чём ты умеешь думать»
// Тренажёр мышления: интро + тест-диагностика + игра с Фреди.
// Опора: статья и игра КОНТУР (meysternlp.ru/kontur).
// AI: POST /api/ai/generate {user_id, prompt} -> {success, content} (stateless).
// Экспорт: window.showKonturScreen
// ============================================
(function () {
  "use strict";

  // ---------- утилиты ----------
  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }

  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 420, temperature: opts.temperature == null ? 0.7 : opts.temperature };
    // используем глобальный apiCall, если есть (он добавляет авторизацию/метрики); иначе fetch
    if (typeof window.apiCall === 'function') {
      return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    }
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ---------- БАЗА ЗНАНИЙ: 12 областей мышления + инструменты ----------
  var THEMES = {
    TIME:   { name: 'Время и жизнь',        tools: ['главное vs важное', 'необратимость (время не возвращается)', 'чьё время ты тратишь — своё или заёмное', 'фазы жизни, а не календарный возраст'] },
    DECIDE: { name: 'Решения и риск',        tools: ['обратимое vs необратимое', 'три контр-сценария вместо одного', 'вероятность × ущерб', '«достаточно для следующего шага»'] },
    MONEY:  { name: 'Деньги и ресурсы',      tools: ['доход vs капитал vs поток', 'цена за результат, а не за час', 'полная стоимость владения', 'буфер vs инвестиция'] },
    CRAFT:  { name: 'Дело и мастерство',     tools: ['что решено, что открыто в области', 'цепочка ценности', 'моё «легко» = чужое «трудно»', '10% работы, дающие 80% результата'] },
    RELAT:  { name: 'Отношения и близость',  tools: ['факт vs интерпретация', 'круг влияния vs круг забот', 'цикл конфликта: триггер→чувство→реакция', 'что зависит от меня, даже если другой не изменится'] },
    FAMILY: { name: 'Семья и род',           tools: ['что передаётся словами, а что молчанием', 'обязанность vs выбор', 'роль vs идентичность', 'наследуемый паттерн'] },
    SELF:   { name: 'Самопознание',          tools: ['черта vs поведение (наблюдай факт)', 'своё vs заёмное хотение', 'теневая сторона (что не люблю — что-то даёт)', '«должен» vs «хочу»'] },
    POWER:  { name: 'Власть и влияние',      tools: ['5 источников власти', 'власть-над vs власть-к', 'влияние без полномочий', 'объём реальной власти'] },
    IDEAS:  { name: 'Идеи и устройство мира',tools: ['4 причины (из чего, кто, как, зачем)', 'модель vs мнение', 'что бы опровергло мою идею', 'аналогия и её пределы'] },
    SOCIETY:{ name: 'Люди и общество',       tools: ['стимулы, а не намерения', 'системный эффект vs личный выбор', 'кому это выгодно', 'норма vs закон'] },
    MEANING:{ name: 'Смысл и ценности',      tools: ['смысл vs удовольствие', 'ценность как выбор между двумя хорошими', 'memento mori как ясность', 'процесс vs результат'] },
    BEAUTY: { name: 'Красота и форма',       tools: ['вкус как сигнал ценностей', 'форма следует за функцией — или нет', 'усвоенное vs своё', 'деталь, которая всё держит'] }
  };
  var THEME_ORDER = Object.keys(THEMES);

  // ---------- БАЗА ЗНАНИЙ: 12 линз ----------
  var LENSES = {
    PROCESS:  { name: 'Процесс',     q: 'Что в этой теме происходит во времени — фазы, скорость, инерция?' },
    STRUCT:   { name: 'Структура',   q: 'Из чего тема состоит и как части связаны между собой?' },
    LINKS:    { name: 'Связи',       q: 'С чем тема соединена снаружи — что от неё зависит и от чего она?' },
    HIER:     { name: 'Иерархия',    q: 'Что в теме выше, что ниже; что главное, что подчинённое?' },
    CAUSE:    { name: 'Причины',     q: 'Откуда это взялось — глубинная причина, а не поверхностная?' },
    PURPOSE:  { name: 'Назначение',  q: 'Зачем это существует, какую функцию выполняет?' },
    CYCLE:    { name: 'Циклы',       q: 'Что в теме повторяется — ритмы, петли, где ты в цикле сейчас?' },
    BOUND:    { name: 'Границы',     q: 'Где тема начинается и кончается; что в неё НЕ входит?' },
    CONTEXT:  { name: 'Контекст',    q: 'В какой среде тема живёт; что меняется, если контекст другой?' },
    PERSP:    { name: 'Перспективы', q: 'Глазами кого ещё можно посмотреть — минимум три точки зрения?' },
    PARADOX:  { name: 'Парадоксы',   q: 'Где в теме не сходится; какое противоречие ты обходишь?' },
    EVOLVE:   { name: 'Эволюция',    q: 'Во что тема развивается — если не трогать и если заниматься?' }
  };
  var LENS_ORDER = Object.keys(LENSES);

  // ---------- ТЕСТ: вопросы (портирование логики с сайта) ----------
  var Q = [
    { axis: 'T', limit: 3, prompt: 'Вечер, дел нет, никто не дёргает. Куда мысль уходит сама собой?', hint: 'До 3 — куда реально тянет.', opts: [
      { t: 'Сколько у меня времени и на что оно уходит', s: { TIME: 2 } },
      { t: 'Решение, которое давно висит', s: { DECIDE: 2 } },
      { t: 'Деньги: где взять, куда вложить, как не потерять', s: { MONEY: 2 } },
      { t: 'Как сделать своё дело лучше', s: { CRAFT: 2 } },
      { t: 'Конкретные люди и что между нами', s: { RELAT: 2 } },
      { t: 'Родители, дети, семья', s: { FAMILY: 2 } },
      { t: 'Почему я такой, какой есть', s: { SELF: 2 } },
      { t: 'Кто на самом деле решает и как устроена власть', s: { POWER: 2 } },
      { t: 'Как устроена какая-то вещь, идея, система', s: { IDEAS: 2 } },
      { t: 'Почему люди и общество такие', s: { SOCIETY: 2 } },
      { t: 'Зачем всё это, в чём смысл', s: { MEANING: 2 } },
      { t: 'Как сделать красиво — образ, форма, звук', s: { BEAUTY: 2 } } ] },
    { axis: 'T', limit: 1, prompt: 'На что залипаешь в ленте дольше, чем собирался?', hint: 'Один, самый честный.', opts: [
      { t: 'Деньги, бизнес, как люди поднимаются', s: { MONEY: 3 } },
      { t: 'Психология, отношения, разборы людей', s: { RELAT: 2, SELF: 1 } },
      { t: 'Наука, технологии, как всё устроено', s: { IDEAS: 3 } },
      { t: 'Политика, общество, «как на самом деле»', s: { POWER: 2, SOCIETY: 1 } },
      { t: 'Ремесло, мастера за работой', s: { CRAFT: 3 } },
      { t: 'Искусство, дизайн, музыка, кино', s: { BEAUTY: 3 } },
      { t: 'Философия, смысл, духовное', s: { MEANING: 2, SELF: 1 } },
      { t: 'Здоровье, тело, продуктивность', s: { TIME: 2, SELF: 1 } } ] },
    { axis: 'T', limit: 2, prompt: 'О чём заводишься в споре так, что трудно остановиться?', hint: 'До 2.', opts: [
      { t: 'Деньги и кто чего достоин', s: { MONEY: 2, POWER: 1 } },
      { t: 'Как надо жить, что главное', s: { MEANING: 2 } },
      { t: 'Отношения, кто кому что должен', s: { RELAT: 2, FAMILY: 1 } },
      { t: 'Справедливость и устройство общества', s: { SOCIETY: 2, POWER: 1 } },
      { t: 'Как правильно делать дело', s: { CRAFT: 2 } },
      { t: 'Идеи и теории', s: { IDEAS: 2 } },
      { t: 'Воспитание, семья', s: { FAMILY: 2 } },
      { t: 'Вкус: что красиво, что пошло', s: { BEAUTY: 2 } } ] },
    { axis: 'T', limit: 1, prompt: 'О чём думал в последний раз, когда не мог уснуть?', hint: 'Мысль приходит без спроса — самый честный маркер.', opts: [
      { t: 'Прокручивал нерешённое — какой выбор', s: { DECIDE: 3 } },
      { t: 'Деньги, как свести концы или подняться', s: { MONEY: 3 } },
      { t: 'Разговор/конфликт с человеком', s: { RELAT: 3 } },
      { t: 'Тревога за родных или старые обиды', s: { FAMILY: 3 } },
      { t: 'Себя — кто я, туда ли иду', s: { SELF: 3 } },
      { t: 'Работу, проект, как лучше', s: { CRAFT: 3 } },
      { t: 'Время — что уходит, что не успел', s: { TIME: 3 } },
      { t: 'Большое — смысл, зачем всё', s: { MEANING: 3 } },
      { t: 'Не помню / сплю быстро', s: {} } ] },
    { axis: 'O', limit: 2, prompt: 'Где замечаешь чужую ошибку раньше, чем человек договорит?', hint: 'Видеть ошибку = иметь модель. До 2.', opts: [
      { t: 'В разговорах про деньги', s: { MONEY: 2 } },
      { t: 'В рассуждениях о людях и отношениях', s: { RELAT: 2 } },
      { t: 'Когда говорят о моём деле', s: { CRAFT: 2 } },
      { t: 'Про власть и «как всё устроено»', s: { POWER: 2 } },
      { t: 'Про науку, идеи, факты', s: { IDEAS: 2 } },
      { t: 'Про общество и справедливость', s: { SOCIETY: 2 } },
      { t: 'Про смысл, ценности, веру', s: { MEANING: 2 } },
      { t: 'Про вкус, искусство, форму', s: { BEAUTY: 2 } },
      { t: 'О воспитании и семье', s: { FAMILY: 2 } },
      { t: 'О времени, планах, приоритетах', s: { TIME: 2 } } ] },
    { axis: 'O', limit: 2, prompt: 'По какому вопросу к тебе приходят за советом?', hint: 'Внешнее признание компетенции. До 2.', opts: [
      { t: 'Деньги, работа, как поступить', s: { MONEY: 1, CRAFT: 1 } },
      { t: 'Отношения, как быть с человеком', s: { RELAT: 2 } },
      { t: 'Решения — помоги взвесить', s: { DECIDE: 2 } },
      { t: 'Профессиональное в моей области', s: { CRAFT: 2 } },
      { t: 'Семья, дети, родители', s: { FAMILY: 2 } },
      { t: 'Понять себя/другого', s: { SELF: 2 } },
      { t: 'Как что устроено, объясни', s: { IDEAS: 2 } },
      { t: 'Вкус: помоги выбрать красиво', s: { BEAUTY: 2 } },
      { t: 'Ко мне редко приходят за советом', s: {} } ] },
    { axis: 'O', limit: 2, prompt: 'О чём можешь говорить час — углубляясь и не повторяясь?', hint: 'Выносливость мысли. До 2.', opts: [
      { t: 'Время, жизнь, как её проживать', s: { TIME: 2 } },
      { t: 'Деньги и как они работают', s: { MONEY: 2 } },
      { t: 'Моё дело и мастерство', s: { CRAFT: 2 } },
      { t: 'Люди и отношения', s: { RELAT: 2 } },
      { t: 'Власть, влияние, решения', s: { POWER: 2 } },
      { t: 'Идеи, теории, устройство мира', s: { IDEAS: 2 } },
      { t: 'Общество и почему оно такое', s: { SOCIETY: 2 } },
      { t: 'Смысл, ценности, мировоззрение', s: { MEANING: 2 } },
      { t: 'Красота, искусство, форма', s: { BEAUTY: 2 } },
      { t: 'Себя и свою внутреннюю кухню', s: { SELF: 2 } } ] },
    { axis: 'O', limit: 2, prompt: 'В какой теме ты изменил мнение, разобравшись глубже?', hint: 'Мнение менялось от работы мысли — признак думания. До 2.', opts: [
      { t: 'О деньгах и достатке', s: { MONEY: 2 } },
      { t: 'Об отношениях и близости', s: { RELAT: 2 } },
      { t: 'О себе и своих мотивах', s: { SELF: 2 } },
      { t: 'О семье и родителях', s: { FAMILY: 2 } },
      { t: 'О власти и устройстве мира', s: { POWER: 1, SOCIETY: 1 } },
      { t: 'О своём деле', s: { CRAFT: 2 } },
      { t: 'О смысле, вере, ценностях', s: { MEANING: 2 } },
      { t: 'Об идеях, науке, картине мира', s: { IDEAS: 2 } },
      { t: 'Ни в какой — взгляды устойчивы', s: {} } ] }
  ];

  // ---------- состояние ----------
  var ST = { answers: null, result: null, cur: 0, theme: null, lens: null, history: [], busy: false };

  function container() { return document.getElementById('screenContainer'); }
  function injectCSS() {
    if (document.getElementById('ktCSS')) return;
    var s = document.createElement('style'); s.id = 'ktCSS';
    // Стили dark-first (приложение по умолчанию тёмное, переменной --surface в нём НЕТ),
    // плюс отдельные оверрайды для светлой темы [data-theme="light"] — как в dreams.js/anchors.js.
    s.textContent = [
      // ---------- БАЗА (тёмная тема) ----------
      '.kt-wrap{max-width:720px;margin:0 auto;padding:18px 16px 80px;color:#f2f3f5}',
      '.kt-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.01em;margin:6px 0 10px;line-height:1.15;color:#fff}',
      '.kt-lead{font-size:1rem;color:#a0a3b0;line-height:1.55;margin-bottom:16px}',
      '.kt-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:18px;margin-bottom:12px;color:#f2f3f5}',
      '.kt-card b,.kt-card strong{color:#fff}',
      '.kt-btn{display:block;width:100%;text-align:left;padding:16px 18px;border-radius:14px;border:1.5px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#f2f3f5;font:600 1rem Inter,sans-serif;cursor:pointer;margin-bottom:10px;transition:all .15s}',
      '.kt-btn:hover{border-color:#3A86FF;transform:translateY(-1px)}',
      '.kt-btn .em{font-size:1.4rem;margin-right:10px}',
      '.kt-btn small{display:block;font-weight:400;color:#9a9da8;margin-top:3px;font-size:.85rem}',
      '.kt-primary{background:#3A86FF!important;color:#fff!important;border:none!important;text-align:center}',
      '.kt-primary small{color:rgba(255,255,255,.85)!important}',
      '.kt-primary:hover{background:#1d6fed!important}',
      '.kt-ghost{background:transparent;border:none;color:#5fa0ff;font-weight:600;cursor:pointer;padding:10px;font-size:.95rem}',
      '.kt-opt{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1.5px solid rgba(255,255,255,.14);border-radius:12px;margin-bottom:8px;cursor:pointer;font-size:.96rem;line-height:1.4;background:rgba(255,255,255,.05);color:#f2f3f5}',
      '.kt-opt.sel{border-color:#3A86FF;background:rgba(58,134,255,.18)}',
      '.kt-opt .mk{flex:0 0 20px;height:20px;border:2px solid rgba(255,255,255,.35);border-radius:6px;margin-top:1px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px}',
      '.kt-opt.sel .mk{background:#3A86FF;border-color:#3A86FF}',
      '.kt-prog{height:6px;background:rgba(255,255,255,.14);border-radius:99px;overflow:hidden;margin-bottom:6px}',
      '.kt-prog>i{display:block;height:100%;background:linear-gradient(90deg,#3A86FF,#6366f1);width:0;transition:width .3s}',
      '.kt-plabel{font-size:12px;color:#9a9da8;margin-bottom:16px}',
      '.kt-nav{display:flex;justify-content:space-between;gap:10px;margin-top:14px}',
      '.kt-q{font-size:1.2rem;font-weight:700;line-height:1.25;margin-bottom:4px;color:#fff}',
      '.kt-qh{font-size:.85rem;color:#9a9da8;margin-bottom:14px}',
      '.kt-axis{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:3px 9px;border-radius:6px;margin-bottom:12px}',
      '.kt-axis.t{background:rgba(245,158,11,.2);color:#fcd34d}',
      '.kt-axis.o{background:rgba(58,134,255,.2);color:#93c5fd}',
      '.kt-dom{margin-bottom:11px}',
      '.kt-dom-top{display:flex;justify-content:space-between;font-size:.92rem;margin-bottom:4px}',
      '.kt-dom-tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}',
      '.kt-bar{height:6px;background:rgba(255,255,255,.12);border-radius:99px;overflow:hidden;margin:2px 0}',
      '.kt-bar>i{display:block;height:100%;border-radius:99px}',
      '.kt-decl{background:linear-gradient(135deg,#0B1220,#24305a);color:#fff;border-radius:14px;padding:18px;margin:14px 0;line-height:1.5;border:1px solid rgba(58,134,255,.3)}',
      '.kt-decl b{color:#fff}',
      '.kt-chat{display:flex;flex-direction:column;gap:10px;margin:12px 0}',
      '.kt-msg{max-width:85%;padding:11px 14px;border-radius:14px;font-size:.96rem;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}',
      '.kt-msg.f{align-self:flex-start;background:rgba(58,134,255,.18);color:#eaf1ff;border-bottom-left-radius:4px}',
      '.kt-msg.u{align-self:flex-end;background:#3A86FF;color:#fff;border-bottom-right-radius:4px}',
      '.kt-msg.sys{align-self:center;background:transparent;color:#8a8d98;font-size:.82rem;font-style:italic;text-align:center;max-width:95%}',
      '.kt-typing{align-self:flex-start;color:#9a9da8;font-size:.85rem;font-style:italic;padding:6px 4px}',
      '.kt-inrow{display:flex;gap:8px;align-items:flex-end;margin-top:8px}',
      '.kt-ta{flex:1;resize:none;padding:12px 14px;border-radius:14px;border:1.5px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#f2f3f5;font:400 1rem Inter,sans-serif;max-height:140px;min-height:46px;line-height:1.4}',
      '.kt-ta::placeholder{color:#7a7d88}',
      '.kt-send{flex:0 0 46px;height:46px;border-radius:50%;border:none;background:#3A86FF;color:#fff;font-size:1.2rem;cursor:pointer}',
      '.kt-send:disabled{opacity:.5;cursor:not-allowed}',
      '.kt-chip{display:inline-block;padding:6px 12px;border-radius:20px;border:1.5px solid rgba(255,255,255,.18);margin:3px;font-size:.86rem;cursor:pointer;background:rgba(255,255,255,.05);color:#f2f3f5}',
      '.kt-chip.sel{border-color:#3A86FF;background:rgba(58,134,255,.2);color:#bcd5ff;font-weight:600}',
      // ---------- ОВЕРРАЙДЫ СВЕТЛОЙ ТЕМЫ ----------
      '[data-theme="light"] .kt-wrap{color:#1c1c1e}',
      '[data-theme="light"] .kt-h1,[data-theme="light"] .kt-q{color:#0b1220}',
      '[data-theme="light"] .kt-lead,[data-theme="light"] .kt-qh,[data-theme="light"] .kt-plabel{color:#5a5a5e}',
      '[data-theme="light"] .kt-card{background:#fff;border-color:rgba(0,0,0,.1);color:#1c1c1e}',
      '[data-theme="light"] .kt-card b,[data-theme="light"] .kt-card strong{color:#0b1220}',
      '[data-theme="light"] .kt-btn{background:#fff;border-color:rgba(0,0,0,.12);color:#1c1c1e}',
      '[data-theme="light"] .kt-btn small{color:#6c6c70}',
      '[data-theme="light"] .kt-primary{background:#3A86FF!important;color:#fff!important}',
      '[data-theme="light"] .kt-ghost{color:#1d6fed}',
      '[data-theme="light"] .kt-opt{background:#fff;border-color:rgba(0,0,0,.12);color:#1c1c1e}',
      '[data-theme="light"] .kt-opt.sel{background:rgba(58,134,255,.08);border-color:#3A86FF}',
      '[data-theme="light"] .kt-opt .mk{border-color:rgba(0,0,0,.25)}',
      '[data-theme="light"] .kt-prog,[data-theme="light"] .kt-bar{background:rgba(0,0,0,.1)}',
      '[data-theme="light"] .kt-axis.t{background:rgba(245,158,11,.14);color:#b45309}',
      '[data-theme="light"] .kt-axis.o{background:rgba(58,134,255,.14);color:#1d6fed}',
      '[data-theme="light"] .kt-msg.f{background:rgba(58,134,255,.1);color:#0b1220}',
      '[data-theme="light"] .kt-msg.sys{color:#8a8a8e}',
      '[data-theme="light"] .kt-typing{color:#8a8a8e}',
      '[data-theme="light"] .kt-ta{background:#fff;border-color:rgba(0,0,0,.15);color:#1c1c1e}',
      '[data-theme="light"] .kt-ta::placeholder{color:#9a9a9e}',
      '[data-theme="light"] .kt-chip{background:#fff;border-color:rgba(0,0,0,.14);color:#1c1c1e}',
      '[data-theme="light"] .kt-chip.sel{background:rgba(58,134,255,.1);color:#1d6fed}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ============================================================
  // ЭКРАН 0 — ХАБ
  // ============================================================
  function showKonturScreen() {
    injectCSS();
    track('feature_opened', { feature: 'kontur' });
    var c = container(); if (!c) return;
    var hot = (loadResult() || {}).hotName;
    c.innerHTML =
      '<div class="kt-wrap">' +
        '<div class="kt-h1">🧠 О чём ты умеешь думать</div>' +
        '<div class="kt-lead">Большинство на вопрос «о чём ты умеешь думать?» отвечают «обо всём». Это то же самое, что «что умею руками? — Всё»: не широта, а отсутствие различения. Здесь ты узнаешь свой настоящий, короткий список — и научишься его расширять. Думать вместе с Фреди.</div>' +
        '<button class="kt-btn" onclick="KONTUR.intro()"><span class="em">📖</span>Зачем это нужно<small>Коротко и по делу: что не так с «обо всём» и как это чинится</small></button>' +
        '<button class="kt-btn" onclick="KONTUR.test()"><span class="em">🧭</span>Пройти тест-диагностику<small>8 вопросов → честная карта: о чём ты думаешь уже сейчас</small></button>' +
        '<button class="kt-btn" onclick="KONTUR.game()"><span class="em">🎮</span>Играть с Фреди' + (hot ? ('<small>Твоя горячая тема по тесту: ' + esc(hot) + '</small>') : '<small>Выбери тему — и Фреди проведёт тебя через настоящее думание</small>') + '</button>' +
        '<div class="kt-card" style="margin-top:14px;font-size:.9rem;color:var(--text-secondary,#777)">💡 <b>Главная подсказка модуля:</b> человек умеет думать о том, о чём он больше всего думает. Не о прочитанном один раз — о том, куда возвращается сотни раз. Этот модуль даёт повод возвращаться правильно.</div>' +
      '</div>';
  }

  // ============================================================
  // ЭКРАН — ИНТРО (зачем)
  // ============================================================
  function intro() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="kt-wrap">' +
        '<button class="kt-ghost" onclick="KONTUR.home()">← Назад</button>' +
        '<div class="kt-h1">Зачем этот модуль</div>' +
        '<div class="kt-card"><b>Проблема.</b> «Иметь мысли» и «уметь думать» — разные вещи. Мысли есть у всех и обо всём: это быстрая, автоматическая работа мозга (Канеман называл это Системой 1). А «уметь думать о Х» — это медленное усилие (Система 2): держать одну мысль дольше, чем хочется, и не сваливаться в готовое мнение.</div>' +
        '<div class="kt-card"><b>4 признака настоящего думания.</b><br>1. <b>Конкретная тема</b> — не «жизнь», а «как я принимаю решения о деньгах».<br>2. <b>Инструменты</b> — понятия и различения, а не только «нравится/правильно».<br>3. <b>Выносливость</b> — не уходишь в готовый ответ через 5 секунд.<br>4. <b>Видишь то, чего не видит новичок</b> в этой теме.</div>' +
        '<div class="kt-card"><b>Как модуль это развивает.</b><br>• <b>Тест</b> показывает, о чём ты думаешь уже сейчас — куда мысль идёт сама и где есть инструменты.<br>• <b>Игра с Фреди</b> — тренажёр: Фреди берёт тему и не даёт тебе соскользнуть в мнение. Подсовывает инструменты, поворачивает тему разными гранями (линзами), ловит, когда ты отвечаешь на автомате, и в конце честно говорит — думал ты или вспоминал готовое.</div>' +
        '<div class="kt-card" style="border-color:rgba(58,134,255,.3)"><b>Что ты получишь.</b> Не «правильные ответы» (их тут нет), а <b>навык</b>: держать мысль, видеть тему с 12 сторон, отличать своё думание от чужих мнений в своей голове. Это переносится на деньги, отношения, работу — на любую тему жизни.</div>' +
        '<button class="kt-btn kt-primary" onclick="KONTUR.test()">Начать с теста →</button>' +
        '<button class="kt-ghost" style="width:100%;margin-top:6px" onclick="KONTUR.game()">или сразу играть с Фреди</button>' +
      '</div>';
  }

  // ============================================================
  // ЭКРАН — ТЕСТ
  // ============================================================
  function test() {
    ST.answers = Q.map(function () { return []; });
    ST.cur = 0;
    renderQ();
  }
  function renderQ() {
    var c = container(); if (!c) return;
    var q = Q[ST.cur], sel = ST.answers[ST.cur];
    var pct = (ST.cur / Q.length) * 100;
    var html = '<div class="kt-wrap">' +
      '<div class="kt-prog"><i style="width:' + pct + '%"></i></div>' +
      '<div class="kt-plabel">Вопрос ' + (ST.cur + 1) + ' из ' + Q.length + (q.limit > 1 ? (' · до ' + q.limit) : '') + '</div>' +
      '<span class="kt-axis ' + (q.axis === 'T' ? 't' : 'o') + '">' + (q.axis === 'T' ? 'Куда идёт мысль' : 'Где есть инструменты') + '</span>' +
      '<div class="kt-q">' + esc(q.prompt) + '</div><div class="kt-qh">' + esc(q.hint) + '</div>';
    q.opts.forEach(function (o, i) {
      var on = sel.indexOf(i) > -1;
      html += '<div class="kt-opt' + (on ? ' sel' : '') + '" onclick="KONTUR.pick(' + i + ')"><span class="mk">' + (on ? '✓' : '') + '</span><span>' + esc(o.t) + '</span></div>';
    });
    html += '<div class="kt-nav"><button class="kt-ghost" onclick="KONTUR.qback()">' + (ST.cur === 0 ? '← В меню' : '← Назад') + '</button>' +
      '<button class="kt-btn kt-primary" style="width:auto;margin:0;padding:12px 24px" onclick="KONTUR.qnext()"' + (sel.length === 0 ? ' disabled' : '') + '>' + (ST.cur === Q.length - 1 ? 'Карта →' : 'Далее →') + '</button></div>';
    html += '</div>';
    c.innerHTML = html;
  }
  function pick(i) {
    var q = Q[ST.cur], sel = ST.answers[ST.cur], p = sel.indexOf(i);
    if (p > -1) sel.splice(p, 1);
    else if (q.limit === 1) ST.answers[ST.cur] = [i];
    else if (sel.length < q.limit) sel.push(i);
    else { toast('Можно выбрать до ' + q.limit, 'info'); return; }
    renderQ();
  }
  function qback() { if (ST.cur > 0) { ST.cur--; renderQ(); } else showKonturScreen(); }
  function qnext() { if (ST.answers[ST.cur].length === 0) return; if (ST.cur < Q.length - 1) { ST.cur++; renderQ(); } else showResult(); }

  function compute() {
    var s = {}; THEME_ORDER.forEach(function (d) { s[d] = { t: 0, o: 0 }; });
    Q.forEach(function (q, qi) {
      ST.answers[qi].forEach(function (i) {
        var sc = q.opts[i].s || {};
        for (var k in sc) { s[k][q.axis === 'T' ? 't' : 'o'] += sc[k]; }
      });
    });
    var maxT = 1, maxO = 1;
    THEME_ORDER.forEach(function (d) { if (s[d].t > maxT) maxT = s[d].t; if (s[d].o > maxO) maxO = s[d].o; });
    return THEME_ORDER.map(function (d) {
      var tn = s[d].t / maxT, on = s[d].o / maxO, q;
      if (s[d].t === 0 && s[d].o === 0) q = 'OFF';
      else if (tn >= 0.5 && on >= 0.5) q = 'MASTER';
      else if (tn >= 0.5 && on < 0.5) q = 'HOT';
      else if (tn < 0.5 && on >= 0.5) q = 'SLEEP';
      else q = 'LOW';
      return { d: d, t: s[d].t, o: s[d].o, tn: tn, on: on, q: q, sum: s[d].t + s[d].o };
    });
  }
  var TAG = { MASTER: { c: '#16A34A', t: 'умею думать' }, HOT: { c: '#F59E0B', t: 'горячее' }, SLEEP: { c: '#3A86FF', t: 'спящее' }, LOW: { c: '#94A3B8', t: '' }, OFF: { c: '#94A3B8', t: '' } };

  function showResult() {
    var c = container(); if (!c) return;
    var rows = compute();
    var master = rows.filter(function (r) { return r.q === 'MASTER'; }).sort(function (a, b) { return b.sum - a.sum; });
    var hot = rows.filter(function (r) { return r.q === 'HOT'; }).sort(function (a, b) { return b.t - a.t; });
    var sleep = rows.filter(function (r) { return r.q === 'SLEEP'; }).sort(function (a, b) { return b.o - a.o; });
    var total = ST.answers.reduce(function (a, b) { return a + b.length; }, 0);

    // запоминаем горячую/мастер тему для игры
    var focus = hot[0] || master[0] || null;
    saveResult({ hot: focus ? focus.d : null, hotName: focus ? THEMES[focus.d].name : null, ts: Date.now() });

    var html = '<div class="kt-wrap"><div class="kt-h1">Твоя карта мышления</div>';
    if (total < 4) {
      html += '<div class="kt-card">Ты выбрал слишком мало, чтобы карта была честной. Пройди заново и отвечай смелее — выбирай даже то, в чём не уверен.</div>' +
        '<button class="kt-btn kt-primary" onclick="KONTUR.test()">Пройти заново</button><button class="kt-ghost" style="width:100%" onclick="KONTUR.home()">В меню</button></div>';
      c.innerHTML = html; return;
    }
    if (master.length) {
      var nm = master.slice(0, 3).map(function (r) { return THEMES[r.d].name.toLowerCase(); });
      html += '<div class="kt-decl">Скажи вслух: <b>«Я умею думать о ' + listRu(nm) + '»</b>.<br><span style="font-size:.85rem;color:#9CA3AF">Это твой настоящий список. Он короче, чем «обо всём» — и поэтому в нём есть опора.</span></div>';
    } else if (hot.length) {
      html += '<div class="kt-decl"><b>Ты много думаешь — но пока по кругу.</b><br><span style="font-size:.85rem;color:#9CA3AF">Есть тяга, не хватает инструментов. Это самая удобная стартовая точка: где огонь, навык растёт быстрее.</span></div>';
    } else {
      html += '<div class="kt-card">Сильных контуров пока не видно — и это норма, большинство живёт в Системе 1. Зато ясно, куда направить тренировку.</div>';
    }
    html += groupHtml('О чём ты умеешь думать сейчас', 'Тяга есть, и инструменты есть — здесь ты реально думаешь.', master);
    html += groupHtml('Думаешь много — но по кругу', 'Мысль идёт сама, но крутится без инструментов. Сюда играть в первую очередь.', hot);
    html += groupHtml('Умеешь, но забросил', 'Инструменты есть, тяги мало. Реши: возвращать или отпустить.', sleep);

    if (focus) {
      html += '<button class="kt-btn kt-primary" onclick="KONTUR.gameWith(\'' + focus.d + '\')">🎮 Сыграть с Фреди про «' + esc(THEMES[focus.d].name) + '» →</button>';
    } else {
      html += '<button class="kt-btn kt-primary" onclick="KONTUR.game()">🎮 Выбрать тему и сыграть с Фреди →</button>';
    }
    html += '<button class="kt-ghost" style="width:100%" onclick="KONTUR.test()">Пройти заново</button>';
    html += '<button class="kt-ghost" style="width:100%" onclick="KONTUR.home()">В меню</button></div>';
    c.innerHTML = html;
    track('feature_opened', { feature: 'kontur_test_done' });
  }
  function groupHtml(title, desc, arr) {
    if (!arr.length) return '';
    var h = '<div class="kt-card"><div style="font-weight:700;margin-bottom:3px">' + title + '</div><div style="font-size:.85rem;color:var(--text-secondary,#888);margin-bottom:12px">' + desc + '</div>';
    arr.forEach(function (r) {
      h += '<div class="kt-dom"><div class="kt-dom-top"><span>' + esc(THEMES[r.d].name) + '</span><span class="kt-dom-tag" style="color:' + TAG[r.q].c + '">' + TAG[r.q].t + '</span></div>' +
        '<div class="kt-bar"><i style="width:' + Math.round(r.tn * 100) + '%;background:#F59E0B"></i></div>' +
        '<div class="kt-bar"><i style="width:' + Math.round(r.on * 100) + '%;background:#3A86FF"></i></div></div>';
    });
    h += '<div style="font-size:11px;color:var(--text-secondary,#999);margin-top:4px">оранжевая — тяга · синяя — инструменты</div></div>';
    return h;
  }
  function listRu(a) { if (a.length === 1) return a[0]; if (a.length === 2) return a[0] + ' и ' + a[1]; return a.slice(0, -1).join(', ') + ' и ' + a[a.length - 1]; }

  // ============================================================
  // ЭКРАН — ИГРА С ФРЕДИ
  // ============================================================
  function game() {
    var c = container(); if (!c) return;
    var html = '<div class="kt-wrap"><button class="kt-ghost" onclick="KONTUR.home()">← Назад</button>' +
      '<div class="kt-h1">🎮 Игра с Фреди</div>' +
      '<div class="kt-lead">Выбери тему — Фреди будет не отвечать за тебя, а заставлять тебя думать: подсовывать инструменты, поворачивать тему гранями и ловить, когда ты соскальзываешь в готовое мнение.</div>' +
      '<div class="kt-card"><div style="font-weight:700;margin-bottom:8px">1. Тема</div><div id="ktThemes">';
    THEME_ORDER.forEach(function (d) { html += '<span class="kt-chip" data-th="' + d + '" onclick="KONTUR.selTheme(\'' + d + '\')">' + esc(THEMES[d].name) + '</span>'; });
    html += '</div></div>' +
      '<div class="kt-card"><div style="font-weight:700;margin-bottom:8px">2. Линза <span style="font-weight:400;color:var(--text-secondary,#999);font-size:.85rem">— угол атаки (можно пропустить)</span></div><div id="ktLenses">';
    html += '<span class="kt-chip sel" data-ln="" onclick="KONTUR.selLens(\'\')">без линзы</span>';
    LENS_ORDER.forEach(function (l) { html += '<span class="kt-chip" data-ln="' + l + '" onclick="KONTUR.selLens(\'' + l + '\')">' + esc(LENSES[l].name) + '</span>'; });
    html += '</div></div>' +
      '<button class="kt-btn kt-primary" id="ktStartBtn" onclick="KONTUR.startGame()" disabled>Выбери тему, чтобы начать</button></div>';
    c.innerHTML = html;
    ST.theme = null; ST.lens = '';
  }
  function gameWith(d) { game(); selTheme(d); }
  function selTheme(d) {
    ST.theme = d;
    document.querySelectorAll('#ktThemes .kt-chip').forEach(function (ch) { ch.classList.toggle('sel', ch.getAttribute('data-th') === d); });
    var b = document.getElementById('ktStartBtn'); if (b) { b.disabled = false; b.textContent = 'Думать про «' + THEMES[d].name + '» с Фреди →'; }
  }
  function selLens(l) {
    ST.lens = l;
    document.querySelectorAll('#ktLenses .kt-chip').forEach(function (ch) { ch.classList.toggle('sel', ch.getAttribute('data-ln') === l); });
  }

  function startGame() {
    if (!ST.theme) { toast('Сначала выбери тему', 'info'); return; }
    ST.history = [];
    track('feature_opened', { feature: 'kontur_game', theme: ST.theme, lens: ST.lens || '' });
    renderChat();
    firstFrediMove();
  }

  function renderChat() {
    var c = container(); if (!c) return;
    var th = THEMES[ST.theme];
    var sub = th.name + (ST.lens ? (' · линза «' + LENSES[ST.lens].name + '»') : '');
    var html = '<div class="kt-wrap">' +
      '<button class="kt-ghost" onclick="KONTUR.game()">← Сменить тему</button>' +
      '<div style="font-weight:700;font-size:1.05rem">🎮 ' + esc(th.name) + '</div>' +
      '<div style="font-size:.82rem;color:var(--text-secondary,#888);margin-bottom:6px">' + esc(sub) + '</div>' +
      '<div class="kt-chat" id="ktChat"></div>' +
      '<div id="ktTyping"></div>' +
      '<div class="kt-inrow"><textarea class="kt-ta" id="ktInput" rows="1" placeholder="Думай вслух…" oninput="KONTUR.grow(this)"></textarea>' +
      '<button class="kt-send" id="ktSend" onclick="KONTUR.send()">➤</button></div>' +
      '<div style="text-align:center;margin-top:10px"><button class="kt-ghost" onclick="KONTUR.verdict()">Завершить и получить вердикт Фреди</button></div>' +
      '</div>';
    c.innerHTML = html;
    paintChat();
  }
  function paintChat() {
    var box = document.getElementById('ktChat'); if (!box) return;
    box.innerHTML = ST.history.map(function (m) {
      if (m.role === 'sys') return '<div class="kt-msg sys">' + esc(m.text) + '</div>';
      return '<div class="kt-msg ' + (m.role === 'fredi' ? 'f' : 'u') + '">' + esc(m.text) + '</div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = sc.scrollHeight; } catch (e) {}
  }
  function grow(el) { el.style.height = 'auto'; el.style.height = Math.min(140, el.scrollHeight) + 'px'; }
  function typing(on) {
    var t = document.getElementById('ktTyping');
    if (t) t.innerHTML = on ? '<div class="kt-typing">Фреди думает…</div>' : '';
  }

  // системный промпт-ядро: «загруженные мыслительные алгоритмы»
  function buildPrompt(mode) {
    var th = THEMES[ST.theme];
    var lensTxt = ST.lens ? ('\nЛИНЗА (обязательно поворачивай тему через неё): «' + LENSES[ST.lens].name + '» — ' + LENSES[ST.lens].q) : '';
    var rules =
      'Ты — Фреди в роли ВЕДУЩЕГО тренажёра мышления (не психолог сейчас, а тренер мысли).\n' +
      'Твоя единственная цель: заставить человека ДУМАТЬ о теме «' + th.name + '», а не выдавать готовые мнения.\n' +
      'ИНСТРУМЕНТЫ ТЕМЫ (подсовывай их по одному, когда человек застрял или выдал поверхностное): ' + th.tools.join('; ') + '.' + lensTxt + '\n\n' +
      'ЖЁСТКИЕ ПРАВИЛА:\n' +
      '1. НИКОГДА не думай за него и не давай готовых выводов. Ты задаёшь вопросы и подсовываешь по одному инструменту.\n' +
      '2. После каждого ответа сначала про себя оцени: это мысль или мнение? Мнение = быстрое, общее, без инструмента. Если мнение — мягко ткни: «это первое, что пришло. А если глубже / через этот инструмент?».\n' +
      '3. Если человек думает — углубляй: «а где ты можешь быть неправ?», «а с другой стороны?», «доведи до конца».\n' +
      '4. Удерживай на ОДНОЙ мысли, не давай перескакивать.\n' +
      '5. Отвечай КОРОТКО: 2–4 предложения, ровно один вопрос за раз. Живой язык, на «ты», без канцелярита и без списков.\n' +
      '6. Не хвали автоматически («отлично!»). Хвали только за реальное усилие и точность.\n';
    var hist = ST.history.filter(function (m) { return m.role !== 'sys'; }).map(function (m) { return (m.role === 'fredi' ? 'ФРЕДИ' : 'ЧЕЛОВЕК') + ': ' + m.text; }).join('\n');
    if (mode === 'first') {
      return rules + '\nНачни игру: задай короткий парадокс-вход или острый вопрос по теме, который собьёт с автоматического ответа и заставит задуматься. Только реплика Фреди, без префиксов.';
    }
    if (mode === 'verdict') {
      return rules + '\nДИАЛОГ:\n' + hist + '\n\nИгра окончена. Дай человеку короткий честный ВЕРДИКТ (4–6 предложений): думал он (Система 2) или больше выдавал мнения (Система 1)? Опирайся на признаки: скорость, новизна для него, конкретность, использование инструментов, готовность спорить с собой. Отметь 1 сильный момент и 1 точку роста. Заверши одним вопросом, который ему стоит додумать самому. Тон — прямой, тёплый, без лести.';
    }
    return rules + '\nДИАЛОГ:\n' + hist + '\n\nОтветь как Фреди-ведущий на последнюю реплику человека. Только реплика, без префиксов.';
  }

  async function firstFrediMove() {
    typing(true);
    try {
      var r = await aiGenerate(buildPrompt('first'), { temperature: 0.8, max_tokens: 200 });
      var txt = (r && r.success && r.content) ? clean(r.content) : fallbackFirst();
      ST.history.push({ role: 'fredi', text: txt });
    } catch (e) {
      ST.history.push({ role: 'fredi', text: fallbackFirst() });
    }
    typing(false); paintChat();
  }
  function fallbackFirst() {
    var th = THEMES[ST.theme];
    return 'Давай про «' + th.name.toLowerCase() + '». Не торопись с готовым ответом. Скажи: что в этой теме ты на самом деле НЕ понимаешь — то, на что нет лёгкого ответа?';
  }

  async function send() {
    if (ST.busy) return;
    var inp = document.getElementById('ktInput'); if (!inp) return;
    var txt = inp.value.trim(); if (!txt) return;
    ST.history.push({ role: 'user', text: txt });
    inp.value = ''; grow(inp);
    paintChat();
    ST.busy = true; var sb = document.getElementById('ktSend'); if (sb) sb.disabled = true;
    typing(true);
    try {
      var r = await aiGenerate(buildPrompt('turn'), { temperature: 0.75, max_tokens: 260 });
      var reply = (r && r.success && r.content) ? clean(r.content) : 'Поясни последнюю мысль конкретнее — на примере из своей жизни. Где это у тебя проявляется?';
      ST.history.push({ role: 'fredi', text: reply });
      track('message_sent', { feature: 'kontur_game' });
    } catch (e) {
      ST.history.push({ role: 'fredi', text: 'Связь подвисла. Но ты не жди меня — додумай вслух: что в этом главное и где ты можешь ошибаться?' });
    }
    typing(false); ST.busy = false; if (sb) sb.disabled = false;
    paintChat();
  }

  async function verdict() {
    var userTurns = ST.history.filter(function (m) { return m.role === 'user'; }).length;
    if (userTurns < 2) { toast('Сначала пройди хотя бы пару кругов с Фреди', 'info'); return; }
    ST.history.push({ role: 'sys', text: '— Фреди подводит итог —' });
    paintChat(); typing(true);
    try {
      var r = await aiGenerate(buildPrompt('verdict'), { temperature: 0.6, max_tokens: 400 });
      var v = (r && r.success && r.content) ? clean(r.content) : 'Главное ты сделал — удержал мысль дольше, чем привычно. Где сегодня ты заметил, что отвечаешь на автомате? Вот там в следующий раз и копай.';
      ST.history.push({ role: 'fredi', text: v });
    } catch (e) {
      ST.history.push({ role: 'fredi', text: 'Связь подвела, но вердикт прост: если было трудно и ты заметил новое — ты думал. Если легко и привычно — это было мнение. Honest?' });
    }
    typing(false); paintChat();
    track('feature_opened', { feature: 'kontur_verdict' });
  }

  function clean(s) {
    s = String(s || '').trim();
    s = s.replace(/^(ФРЕДИ|FREDI|Фреди)\s*[:：]\s*/i, '');
    s = s.replace(/^["«»\s]+|["«»\s]+$/g, function (m) { return m.replace(/[«»"]/g, '').trim() ? m : ''; });
    return s.trim();
  }

  // ---------- хранение результата теста ----------
  function saveResult(o) { try { localStorage.setItem('kontur_result', JSON.stringify(o)); } catch (e) {} ST.result = o; }
  function loadResult() { if (ST.result) return ST.result; try { return JSON.parse(localStorage.getItem('kontur_result') || 'null'); } catch (e) { return null; } }

  // ---------- экспорт ----------
  window.KONTUR = {
    home: showKonturScreen, intro: intro, test: test, game: game, gameWith: gameWith,
    pick: pick, qback: qback, qnext: qnext, selTheme: selTheme, selLens: selLens,
    startGame: startGame, send: send, verdict: verdict, grow: grow
  };
  window.showKonturScreen = showKonturScreen;
  console.log('✅ kontur.js loaded (модуль «О чём ты умеешь думать»)');
})();
