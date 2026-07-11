// ============================================
// rol.js — Игра «Смени роль». Симулятор смены роли через поведение.
// Тезис: роль определяет поведение, а поведение определяет роль.
// Роль держится на повторяющихся микро-поступках. Чтобы выйти из роли,
// менять нечего, кроме поведения — по одному наблюдаемому действию.
// В каждой сцене старая роль тянет на автопилот; игрок пишет НОВОЕ
// поведение; «шкала роли» едет от старой роли к новой. Финальный разбор —
// Фреди (AI) с локальным фолбэком.
// Экспорт: window.showRolGame, window.ROL
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 420, temperature: opts.temperature == null ? 0.5 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // ============================================================
  // РОЛИ. У каждой: old (роль, из которой выходим) + oldEm,
  // signs (как роль видна в поведении), target (роль, в которую входим),
  // targetEm, look (какое поведение двигает роль), oldRe (маркеры старого
  // поведения — для локальной оценки), scenes[] {sit, auto}.
  // ============================================================
  var ROLES = [
    {
      id: 'udobnyj', old: 'Удобный', oldEm: '😇', target: 'Со своим голосом', targetEm: '🙂',
      signs: 'Соглашается, когда не хочет. Извиняется без вины. Своё желание проглатывает, чужое ставит выше. Спасает непрошено, лишь бы не разочаровать.',
      look: 'Назвать своё вслух, сказать «нет» без пяти оправданий, попросить прямо, вернуть чужое чужому.',
      oldRe: /(всё\s?равно|как все|как всем|неважно|не важно|потом скажу|ладно уж|извини|прости|да ничего|мне не сложно|как скажешь)/i,
      scenes: [
        { sit: 'Компания решает, куда пойти. Все поворачиваются к тебе: «тебе же всё равно?»', auto: 'Старая роль: «да мне без разницы, как всем удобно».' },
        { sit: 'Коллега молча скидывает тебе свою часть отчёта — уже не в первый раз.', auto: 'Старая роль: молча берёшь и тянешь, глотая злость.' },
        { sit: 'Тебя перебили на середине фразы, и разговор поехал дальше без тебя.', auto: 'Старая роль: замолкаешь — «ладно, потом скажу» (и не скажешь).' },
        { sit: 'Приятель просит денег в долг. Тебе неудобно, отдаст он вряд ли.', auto: 'Старая роль: даёшь через силу и потом злишься на себя.' }
      ]
    },
    {
      id: 'nevidimka', old: 'Невидимка', oldEm: '🫥', target: 'Видимый', targetEm: '🙋',
      signs: 'Молчит на встречах. Не показывает свою работу. Садится с краю. Ждёт, когда заметят сами — и обижается, что не замечают.',
      look: 'Сказать первым, пока не передумал. Показать результат прямо. Занять место, а не край. Назвать свой вклад вслух.',
      oldRe: /(вдруг глупость|промолч|ничего не скаж|подожду|заметят сами|если спрос|потом как-нибудь|неудобно лезть)/i,
      scenes: [
        { sit: 'На совещании у тебя есть хорошая идея. Обсуждают как раз это.', auto: 'Старая роль: держишь при себе — «вдруг скажу глупость».' },
        { sit: 'Ты сделал сильную работу, но команда об этом не знает.', auto: 'Старая роль: ждёшь, что заметят и оценят сами.' },
        { sit: 'Ты в новой компании, где почти никого не знаешь.', auto: 'Старая роль: стоишь у стены с телефоном в руке.' },
        { sit: 'Хвалят проект, большой кусок которого сделал именно ты.', auto: 'Старая роль: молчишь, будто тебя это не касается.' }
      ]
    },
    {
      id: 'atlant', old: 'Тот, кто тащит всё', oldEm: '🏋️', target: 'Тот, кто выбирает', targetEm: '🧭',
      signs: 'Подхватывает чужое. Не делегирует — «проще самому». Не уходит вовремя. Держит на себе то, что могло бы держаться без него.',
      look: 'Отдать задачу и не перепроверять. Встать и уйти вовремя. Держать паузу, пока возьмётся кто-то ещё. Не вмешиваться, когда справятся без тебя.',
      oldRe: /(проще самому|сам сделаю|сам быстрее|возьму на себя|доделаю|подхвач|никто кроме меня|придётся мне)/i,
      scenes: [
        { sit: 'Есть задача, которую спокойно сделал бы коллега — просто медленнее тебя.', auto: 'Старая роль: делаешь сам — «так быстрее и надёжнее».' },
        { sit: '20:00, дел ещё много, дома ждут.', auto: 'Старая роль: остаёшься — «ещё чуть-чуть добью».' },
        { sit: 'В группе повисла задача, все молчат и смотрят в стол.', auto: 'Старая роль: первым тянешь руку и берёшь всё.' },
        { sit: 'Близкий взялся за дело и делает его по-своему, медленнее тебя.', auto: 'Старая роль: перехватываешь и доделываешь за него.' }
      ]
    },
    {
      id: 'shut', old: 'Шут', oldEm: '🤡', target: 'Тот, кого слышат всерьёз', targetEm: '🗣️',
      signs: 'Шутит в напряжённый момент, чтобы разрядить. Обесценивает своё смехом. Не разрешает себе быть серьёзным — на серьёзном стало бы видно, что внутри.',
      look: 'Выдержать неловкую паузу и сказать всерьёз. Принять комплимент без шутки. Ответить правду о своём состоянии. Сказать важное — и не отступить «это шутка».',
      oldRe: /(ха-?ха|шучу|это шутка|конечно шутка|прикол|да ладно тебе|отшуч|посмеш|ну ты понял)/i,
      scenes: [
        { sit: 'Разговор свернул на серьёзное и личное. Стало неуютно.', auto: 'Старая роль: сбиваешь напряжение шуткой.' },
        { sit: 'Тебе сделали тёплый, искренний комплимент.', auto: 'Старая роль: отшучиваешься — «да это случайно вышло».' },
        { sit: 'Тебе правда тяжело, а тебя спрашивают: «как ты?»', auto: 'Старая роль: «да отлично, ха-ха, что мне сделается».' },
        { sit: 'Ты высказал важную для себя мысль, повисла тишина.', auto: 'Старая роль: добавляешь «ну это я так, шучу, конечно».' }
      ]
    },
    {
      id: 'zhertva', old: 'Страдалец', oldEm: '😞', target: 'Автор', targetEm: '✍️',
      signs: 'Жалуется вместо действия. Ждёт, что заметят и спасут. Намекает вместо просьбы. «От меня ничего не зависит» — и потому не делает первый шаг.',
      look: 'Сказать прямо, чего хочешь. Одно конкретное действие вместо жалобы. Попросить, а не намекать. Назвать «что я сделаю дальше» — один шаг.',
      oldRe: /(вечно мне|как всегда не везёт|от меня ничего|ничего не зависит|никто не|почему я|за что мне|опять я|бесполезно|всё равно не)/i,
      scenes: [
        { sit: 'В отношениях давно что-то не так, и это копится.', auto: 'Старая роль: обижаешься молча и ждёшь, что догадаются.' },
        { sit: 'Работа не радует уже который месяц.', auto: 'Старая роль: жалуешься по кругу — тем же людям, теми же словами.' },
        { sit: 'Ты вымотан, и тебе правда нужна помощь по дому.', auto: 'Старая роль: тяжело вздыхаешь и гремишь посудой — авось поймут.' },
        { sit: 'Планы сорвались не по твоей вине.', auto: 'Старая роль: «ну конечно, вечно мне так везёт».' }
      ]
    }
  ];

  var ST = { role: null, step: 0, answers: [], busy: false, done: false };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('rol_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, best: {} }; }
  function saveStats(s) { try { localStorage.setItem('rol_stats', JSON.stringify(s)); } catch (e) {} }

  // ---- локальная оценка одного поведения: 0 (то же/пусто), 1 (робко), 2 (двигает роль) ----
  var ACTION_RE = /(скаж|говорю|назову|попрош|отвеч|встан|уйд|уйду|уход|отда|верну|покаж|предлож|спрош|сдела|напиш|позвон|подойд|заговор|заявл|обознач|откаж|остановл|положу|поставл|выйд|выберу|решу|сообщ|признаю)/i;
  function scoreLocal(role, text) {
    var t = String(text || '').trim();
    if (t.length < 8) return 0;
    if (role.oldRe.test(t)) return t.length >= 24 && ACTION_RE.test(t) ? 1 : 0;
    var act = ACTION_RE.test(t);
    var firstPerson = /(^|\s)(я|мне|мой|моё|моя|мои)(\s|$|,)/i.test(t) || act;
    if (act && t.length >= 14) return 2;
    if ((act || firstPerson) && t.length >= 10) return 1;
    return 1;
  }

  function injectCSS() {
    if (document.getElementById('rolCSS')) return;
    var s = document.createElement('style'); s.id = 'rolCSS';
    s.textContent = [
      '.rol-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.rol-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.rol-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.rol-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.rol-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.rol-ch{font-weight:700;margin-bottom:8px}',
      '.rol-role{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px 16px;margin:0 0 10px;color:#f2f3f5;cursor:pointer;font-size:1rem}',
      '.rol-role:hover{border-color:rgba(124,108,240,.55)}',
      '.rol-role b{font-weight:700}',
      '.rol-role .arr{color:#a79bff;font-weight:700}',
      '.rol-role small{display:block;color:#9ca3af;font-size:.85rem;margin-top:5px;line-height:1.45}',
      '.rol-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.9rem;margin:0 0 10px}',
      '.rol-meter{margin:0 0 14px}',
      '.rol-meter-lbl{display:flex;justify-content:space-between;font-size:.8rem;color:#9ca3af;margin-bottom:6px}',
      '.rol-meter-lbl .from{color:#f0a3a3}.rol-meter-lbl .to{color:#a79bff}',
      '.rol-bar{height:12px;border-radius:8px;background:linear-gradient(90deg,rgba(239,68,68,.18),rgba(124,108,240,.18));position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.1)}',
      '.rol-bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7c6cf0,#a79bff);transition:width .5s ease}',
      '.rol-sit{border:1px solid rgba(124,108,240,.35);background:rgba(124,108,240,.08);border-radius:14px;padding:14px 16px;margin:0 0 10px;font-size:1rem;line-height:1.55;color:#e9e6ff}',
      '.rol-auto{border:1px dashed rgba(239,68,68,.4);background:rgba(239,68,68,.06);border-radius:12px;padding:11px 14px;margin:0 0 12px;font-size:.9rem;line-height:1.5;color:#fca5a5}',
      '.rol-ta{width:100%;min-height:70px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);border-radius:12px;padding:12px 14px;color:inherit;font-size:.98rem;font-family:inherit;line-height:1.5;resize:vertical;box-sizing:border-box;margin:6px 0 10px}',
      '.rol-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#7c6cf0,#5b8def);box-shadow:0 8px 22px rgba(124,108,240,.32);margin:0 0 10px}',
      '.rol-primary[disabled]{opacity:.6;cursor:default}',
      '.rol-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:13px;font-size:.95rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.rol-row{display:flex;gap:10px}.rol-row>*{flex:1;margin-bottom:0}',
      '.rol-hint{border:1px solid rgba(56,189,248,.35);background:rgba(56,189,248,.08);border-radius:12px;padding:12px 14px;margin:0 0 10px;font-size:.88rem;line-height:1.55;color:#bae6fd}',
      '.rol-done{border:1px solid rgba(52,211,153,.35);background:rgba(52,211,153,.08);border-radius:12px;padding:11px 14px;margin:0 0 10px;font-size:.92rem;line-height:1.5;color:#a7f3d0}',
      '.rol-flash{text-align:center;font-size:.9rem;margin:0 0 10px}',
      '.rol-verdict{border:1px solid rgba(124,108,240,.4);background:linear-gradient(135deg,rgba(124,108,240,.12),rgba(91,141,239,.05));border-radius:14px;padding:14px 16px;margin:0 0 12px;line-height:1.6;font-size:.95rem}',
      '.rol-shift{text-align:center;font-size:1.3rem;font-weight:800;margin:0 0 4px;color:#a79bff}',
      '.rol-mini{font-size:.82rem;color:#9ca3af;margin:0 0 6px}',
      '.rol-li{margin:6px 0;line-height:1.55}',
      '[data-theme="light"] .rol-wrap{color:#1f2430}',
      '[data-theme="light"] .rol-lead{color:#4b5566}',
      '[data-theme="light"] .rol-card{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .rol-secondary,[data-theme="light"] .rol-role{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .rol-ta{background:#fff;border-color:rgba(0,0,0,.15);color:#1f2430}',
      '[data-theme="light"] .rol-sit{color:#3b2f7a}',
      '[data-theme="light"] .rol-auto{color:#b91c1c}',
      '@media(max-width:560px){.rol-wrap{padding:14px 12px 96px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); ST.role = null; ST.done = false;
    track('feature_opened', { feature: 'rol' });
    var c = container(); if (!c) return;
    var s = loadStats();
    c.innerHTML =
      '<div class="rol-wrap">' +
        '<button class="rol-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="rol-h1">🎭 Смени роль</div>' +
        '<div class="rol-lead">Роль определяет поведение, а поведение определяет роль. Мы застреваем в роли не потому, что «такие», а потому, что снова и снова делаем одно и то же — и другие, и мы сами перестаём видеть варианты. Хорошая новость: у роли нет другой опоры, кроме поведения. Меняешь поступки — по одному, наблюдаемому — и роль едет следом.</div>' +
        (s.plays ? '<div class="rol-card" style="text-align:center">Сыграно: <b>' + s.plays + '</b> · лучший сдвиг роли: <b>' + (Object.keys(s.best || {}).length ? Math.max.apply(null, Object.keys(s.best).map(function (k) { return s.best[k]; })) : '—') + '%</b></div>' : '') +
        '<button class="rol-secondary" onclick="ROL.about()">📖 Какие бывают роли и как наблюдать поведение</button>' +
        '<div class="rol-ch" style="margin:6px 0 10px">Из какой роли хочешь выйти:</div>' +
        ROLES.map(function (r) {
          return '<button class="rol-role" onclick="ROL.start(\'' + r.id + '\')">' + r.oldEm + ' <b>' + esc(r.old) + '</b> <span class="arr">→</span> ' + r.targetEm + ' ' + esc(r.target) + '<small>' + esc(r.signs) + '</small></button>';
        }).join('') +
        '<div class="rol-card" style="font-size:.88rem;color:#9ca3af">💡 Роль не меняют уговорами себя («буду увереннее»). Её меняют конкретным поступком в конкретной сцене. Здесь ты отрепетируешь такие поступки заранее — чтобы в жизни рука уже знала, что делать.</div>' +
      '</div>';
  }

  function about() {
    injectCSS();
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="rol-wrap">' +
        '<button class="rol-ghost" onclick="ROL.home()">← Назад</button>' +
        '<div class="rol-h1" style="font-size:1.3rem">Роль и поведение</div>' +
        '<div class="rol-card"><div class="rol-ch">Что такое роль</div>Роль — это устойчивый набор ожиданий и поступков, которые ты играешь в системе: в семье, в компании, на работе. У роли есть «сценарий»: что тебе положено чувствовать, говорить и делать, чтобы остаться собой в глазах других. Роль удобна — она экономит выбор. И она же клетка, когда сценарий перестаёт тебе подходить, а ты всё играешь по нему.</div>' +
        '<div class="rol-card"><div class="rol-ch">Что такое поведение</div>Поведение — это то, что <b>видно со стороны</b>. Не «я добрый» и не «я неуверенный» (это оценки, их камера не снимет), а конкретные действия: «уступил очередь», «промолчал на встрече», «согласился, хотя не хотел». Черта — вывод; поведение — факт. Роль собрана из фактов, а не из выводов.</div>' +
        '<div class="rol-card" style="border-color:rgba(124,108,240,.3)"><div class="rol-ch">Петля: роль ⇄ поведение</div>Роль диктует поведение: «я же удобный» — и ты снова уступаешь. Но и наоборот — повторяющееся поведение <b>достраивает</b> роль: другие видят уступки и ждут их снова, а ты по своим же поступкам делаешь вывод, кто ты (теория самовосприятия Бэма, 1972). Значит, у петли есть вход: сменить наблюдаемое поведение — и через время роль поедет за ним.</div>' +
        '<div class="rol-card"><div class="rol-ch">Роль решает больше, чем кажется</div>Роль и поведение тянут за собой род занятий, место в иерархии, профессию, дело, за которое берёшься. «Тот, кто тащит всё» и «тот, кто выбирает» окажутся на разных должностях, даже с одним дипломом. Меняя роль, ты меняешь не настроение — траекторию.</div>' +
        '<div class="rol-card"><div class="rol-ch">Как наблюдать поведение (тренировка на день)</div>' +
          '<div class="rol-li">• Лови <b>глаголы, а не оценки</b>. «Я промолчал», «я согласился», «я пошутил» — это данные о роли.</div>' +
          '<div class="rol-li">• Замечай момент <b>развилки</b>: где потянуло на автопилот роли — и был другой вариант.</div>' +
          '<div class="rol-li">• Спрашивай: <b>что записала бы камера?</b> Если ответ — прилагательное, копай до действия.</div>' +
          '<div class="rol-li">• Один сдвиг за раз. Роль едет не от решения «стать другим», а от одного нового поступка, повторённого несколько раз.</div>' +
        '</div>' +
        '<button class="rol-primary" onclick="ROL.home()">Выбрать роль и тренироваться →</button>' +
      '</div>';
  }

  function start(id) {
    injectCSS();
    var r = null; ROLES.forEach(function (x) { if (x.id === id) r = x; });
    if (!r) return;
    ST.role = r; ST.step = 0; ST.answers = []; ST.done = false;
    track('game_round_start', { feature: 'rol', role: id });
    render();
  }

  function meterPct() {
    var r = ST.role; if (!r) return 0;
    var max = r.scenes.length * 2, got = 0;
    ST.answers.forEach(function (a) { got += a.score; });
    return Math.round((got / max) * 100);
  }

  function render() {
    var c = container(); if (!c) return;
    var r = ST.role, total = r.scenes.length;
    var sc = r.scenes[ST.step];
    var pct = meterPct();
    var last = ST.answers.length ? ST.answers[ST.answers.length - 1] : null;
    var flash = '';
    if (last && last.justAdded) {
      flash = last.score >= 2 ? '<div class="rol-flash" style="color:#a7f3d0">✓ Это поступок, а не намерение — роль поехала</div>'
            : last.score === 1 ? '<div class="rol-flash" style="color:#fcd34d">↗ Шаг в сторону есть, но помягче — сделай его конкретнее</div>'
            : '<div class="rol-flash" style="color:#fca5a5">↺ Это всё ещё старая роль. Что сделала бы новая?</div>';
      last.justAdded = false;
    }
    c.innerHTML =
      '<div class="rol-wrap">' +
        '<div class="rol-top"><span>' + r.oldEm + ' ' + esc(r.old) + ' → ' + r.targetEm + ' ' + esc(r.target) + ' · сцена ' + (ST.step + 1) + ' из ' + total + '</span><button style="background:none;border:none;color:#8b93a7;font-size:.88rem;cursor:pointer;padding:0" onclick="ROL.home()">✕ Выйти</button></div>' +
        '<div class="rol-meter"><div class="rol-meter-lbl"><span class="from">' + r.oldEm + ' ' + esc(r.old) + '</span><span>' + pct + '%</span><span class="to">' + esc(r.target) + ' ' + r.targetEm + '</span></div><div class="rol-bar"><i style="width:' + pct + '%"></i></div></div>' +
        flash +
        '<div class="rol-sit">🎬 ' + esc(sc.sit) + '</div>' +
        '<div class="rol-auto">↩ ' + esc(sc.auto) + '</div>' +
        '<div style="font-size:.92rem;color:#c8ccd4;margin:0 0 4px">Что сделает <b>новая</b> роль? Опиши конкретный поступок — то, что увидела бы камера:</div>' +
        '<textarea class="rol-ta" id="rolTA" placeholder="Новое поведение: одно конкретное действие или фраза…"></textarea>' +
        '<button class="rol-primary" id="rolSend" onclick="ROL.send()">' + (ST.step < total - 1 ? 'Сделать так →' : 'Сделать так — и к разбору →') + '</button>' +
        '<div class="rol-row"><button class="rol-secondary" onclick="ROL.hint()">💡 Какое поведение двигает роль</button><button class="rol-secondary" onclick="ROL.home()">✖ Выйти</button></div>' +
        '<div id="rolHint"></div>' +
      '</div>';
    try { var el = document.getElementById('rolTA'); if (el) el.focus(); } catch (e) {}
  }

  function hint() {
    var box = document.getElementById('rolHint'); if (!box || !ST.role) return;
    box.innerHTML = '<div class="rol-hint"><b>Поведение новой роли «' + esc(ST.role.target) + '»:</b><br>' + esc(ST.role.look) +
      '<br><br>Проверь себя: в твоём ответе есть <b>глагол-действие</b> (сказал, сделал, ушёл, попросил)? Если только «постараюсь быть увереннее» — это ещё намерение, не поступок.</div>';
  }

  function send() {
    if (ST.busy || !ST.role) return;
    var ta = document.getElementById('rolTA');
    var text = ta ? String(ta.value || '').trim() : '';
    if (!text) { if (typeof window.showToast === 'function') window.showToast('Опиши новое поведение', 'info'); return; }
    var r = ST.role, total = r.scenes.length;
    var score = scoreLocal(r, text);
    ST.answers.push({ sit: r.scenes[ST.step].sit, text: text, score: score, justAdded: true });
    vibe(score >= 2 ? [25, 30, 25] : 15);
    if (ST.step < total - 1) { ST.step++; render(); }
    else finish();
  }

  function localVerdict() {
    var pct = meterPct();
    var strong = ST.answers.filter(function (a) { return a.score >= 2; }).length;
    var weak = ST.answers.filter(function (a) { return a.score === 0; }).length;
    var notes = [];
    if (strong >= 3) notes.push('Почти в каждой сцене ты выбрал наблюдаемый поступок, а не намерение — именно так роль и сдвигается.');
    else if (strong >= 1) notes.push('Там, где ты назвал конкретное действие, роль поехала. Там, где остался общий настрой, — осталась на месте.');
    if (weak >= 2) notes.push('Пара ответов — это ещё старая роль в новой обёртке: тянет на привычное. Это нормально, самое ценное — заметить, где именно тянет.');
    notes.push('Возьми в жизнь одно поведение из сыгранных — самое неудобное — и повтори его в ближайшие дни хотя бы трижды. Роль меняется от повтора, а не от одного раза.');
    return { shift: pct, text: notes.join(' ') };
  }

  async function finish() {
    if (ST.busy) return; ST.busy = true;
    var c = container(); if (!c) return;
    var r = ST.role;
    c.innerHTML = '<div class="rol-wrap"><div class="rol-h1" style="font-size:1.2rem">🎭 Разбор…</div><div class="rol-card">Фреди смотрит, сдвинулась ли роль…</div></div>';
    var transcript = ST.answers.map(function (a, i) { return (i + 1) + ') Сцена: ' + a.sit + '\n   Новое поведение: «' + a.text + '»'; }).join('\n');
    var verdictText = '', shift = null;
    try {
      var resp = await aiGenerate(
        'Ты — Фреди, тёплый и точный психолог. Человек тренируется выйти из роли «' + r.old + '» в роль «' + r.target + '». Роль держится на повторяющемся наблюдаемом поведении; сменить роль = сменить поступки.\n' +
        'Вот сцены и его новые варианты поведения:\n' + transcript + '\n\n' +
        'Оцени по-русски, на «ты», без нотаций. Формат ответа строго:\nСДВИГ: N%\n(где N 0–100 — насколько эти поступки реально двигают роль, а не остаются тем же старым поведением в новой обёртке)\nЗатем 3–4 коротких фразы: какой поступок самый сильный и почему; где (если было) осталась старая роль; и ОДНО конкретное микро-поведение, которое стоит взять в жизнь на неделю, чтобы роль поехала.',
        { max_tokens: 460 });
      var t = (resp && resp.success && resp.content) ? String(resp.content).trim() : '';
      var m = t.match(/СДВИГ:\s*(\d{1,3})/i);
      if (m) { shift = Math.max(0, Math.min(100, parseInt(m[1], 10))); verdictText = t.replace(/СДВИГ:\s*\d{1,3}\s*%?\.?/i, '').trim(); }
      else if (t) { verdictText = t; }
    } catch (e) {}
    if (shift == null) { var lv = localVerdict(); shift = lv.shift; if (!verdictText) verdictText = lv.text; }
    ST.busy = false; ST.done = true;
    var s = loadStats(); s.plays = (s.plays || 0) + 1; if (!s.best) s.best = {};
    if (!s.best[r.id] || shift > s.best[r.id]) s.best[r.id] = shift; saveStats(s);
    if (shift >= 70) vibe([40, 40, 40]);
    var line = shift >= 80 ? 'Роль поехала: ты действовал как «' + r.target + '»' : shift >= 55 ? 'Сдвиг есть — новая роль проступает' : shift >= 30 ? 'Начало положено, старая роль ещё держит' : 'Роль пока на месте — но теперь ты видишь, где вход';
    c.innerHTML =
      '<div class="rol-wrap">' +
        '<div class="rol-h1" style="font-size:1.2rem">🎭 ' + r.oldEm + ' ' + esc(r.old) + ' → ' + r.targetEm + ' ' + esc(r.target) + '</div>' +
        '<div class="rol-shift">Сдвиг роли: ' + shift + '%</div>' +
        '<div class="rol-bar" style="margin:0 0 12px"><i style="width:' + shift + '%"></i></div>' +
        '<div class="rol-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        '<div class="rol-verdict">💬 ' + esc(verdictText).replace(/\n/g, '<br>') + '</div>' +
        '<div class="rol-card" style="font-size:.9rem;color:#9ca3af">💡 Перенос в жизнь: роль в голове не переспоришь — её переигрывают в конкретной сцене. Выбери одно поведение отсюда и поймай в жизни момент, когда потянет на старое. Один поступок против роли — и петля начинает крутиться в другую сторону.</div>' +
        '<div class="rol-row"><button class="rol-primary" onclick="ROL.start(\'' + r.id + '\')" style="margin:0">🔁 Ещё раз</button><button class="rol-secondary" onclick="ROL.home()">Другая роль</button></div>' +
      '</div>';
    try { var el = document.getElementById('screenContainer'); if (el) el.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'rol', role: r.id, shift: shift });
  }

  window.ROL = { home: home, about: about, start: start, send: send, hint: hint, finish: finish, getState: function () { return ST; } };
  window.showRolGame = home;
  console.log('✅ rol.js loaded (игра «Смени роль»)');
})();
