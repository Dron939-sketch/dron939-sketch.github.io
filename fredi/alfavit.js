// ============================================
// alfavit.js — Игра «Алфавит» нового кода НЛП (Гриндер).
// Классика: лист с буквами, под каждой пометка л/п/о. Произносишь букву
// вслух и одновременно даёшь ответ рукой. Здесь руки заменены кнопками:
// Л — левая, О — обе, П — правая. Ошибся — проход начинается заново.
// Три прохода: слева направо, справа налево, по столбцам сверху вниз.
// Жёсткий предел 5 минут — по правилам самой игры («и не дольше»).
// Механизм — загрузка рабочей памяти двойной задачей (см. лекцию
// /blog/lekciya-nk-igry.html): прерывает прокручивание и меняет
// состояние. Большего игра не обещает. Проверка локальная, без AI.
// Экспорт: window.showAlfavitGame, window.ALFAVIT
// ============================================
(function () {
  "use strict";

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }

  var LETTERS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');
  var MARKS = ['л', 'п', 'о'];
  var MARK_NAME = { 'л': 'левая', 'п': 'правая', 'о': 'обе' };
  var TIME_CAP = 5 * 60 * 1000; // «три-пять минут, и не дольше»

  var DIFF = {
    easy: { name: 'Разминка', em: '🌱', cells: 15, cols: 5, alpha: true },
    norm: { name: 'Классика', em: '⚖️', cells: 20, cols: 5, alpha: true },
    hard: { name: 'Вразброс', em: '🔥', cells: 25, cols: 5, alpha: false }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  var ST = { diff: 'norm', sheet: [], cols: 5, order: [], pos: 0, pass: 0,
             errors: 0, restarts: 0, t0: 0, capTimer: null, running: false };

  var PASSES = [
    { name: 'слева направо', hint: 'Идите по рядам, как читаете' },
    { name: 'справа налево', hint: 'Теперь в обратную сторону — привычка не поможет' },
    { name: 'сверху вниз', hint: 'По столбцам: первый столбец сверху вниз, потом второй' }
  ];

  // ---------- прогресс ----------
  function loadStats() { try { var s = JSON.parse(localStorage.getItem('alfavit_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, best: {}, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('alfavit_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('alfavit_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('alfavit_diff', d); } catch (e) {} ST.diff = d; }

  function injectCSS() {
    if (document.getElementById('alfCSS')) return;
    var s = document.createElement('style'); s.id = 'alfCSS';
    s.textContent = [
      '.alf-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.alf-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.alf-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:16px}',
      '.alf-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.alf-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.alf-ch{font-weight:700;margin-bottom:8px}',
      '.alf-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.alf-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.alf-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4}',
      '.alf-chip.on{border-color:#8b5cf6;background:rgba(139,92,246,.16);color:#fff}',
      '.alf-pass{text-align:center;color:#a78bfa;font-weight:700;margin:0 0 10px;font-size:1rem}',
      '.alf-grid{display:grid;gap:8px;margin:0 0 14px}',
      '.alf-cell{position:relative;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);border-radius:12px;padding:10px 4px 6px;text-align:center;user-select:none;transition:border-color .12s,background .12s}',
      '.alf-cell b{display:block;font-size:1.25rem;font-weight:800;line-height:1.15}',
      '.alf-cell i{display:block;font-style:normal;font-size:.78rem;color:#7fb0ff;font-weight:700}',
      '.alf-cell.cur{border-color:#8b5cf6;background:rgba(139,92,246,.22)}',
      '.alf-cell.done{opacity:.38}',
      '.alf-cell.err{border-color:#ef4444;background:rgba(239,68,68,.18)}',
      '.alf-say{text-align:center;color:#9ca3af;font-size:.88rem;margin:0 0 12px;min-height:1.2em}',
      '.alf-keys{display:flex;gap:10px}',
      '.alf-key{flex:1;border:none;border-radius:16px;padding:20px 6px;font-size:1.1rem;font-weight:800;color:#fff;cursor:pointer;background:linear-gradient(135deg,#8b5cf6,#3b82f6);box-shadow:0 8px 22px rgba(139,92,246,.35);transition:transform .08s ease}',
      '.alf-key:active{transform:scale(.95)}',
      '.alf-key small{display:block;font-size:.72rem;font-weight:600;opacity:.85;margin-top:3px}',
      '.alf-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#8b5cf6,#3b82f6);box-shadow:0 8px 22px rgba(139,92,246,.4);margin:0 0 10px}',
      '.alf-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.alf-danger{display:block;width:100%;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);border-radius:12px;padding:12px;font-size:.9rem;font-weight:600;color:#fca5a5;cursor:pointer;margin:10px 0 0}',
      '.alf-row{display:flex;gap:10px}.alf-row>*{flex:1;margin-bottom:0}',
      '.alf-res{display:flex;justify-content:space-between;border-radius:10px;padding:10px 14px;margin:0 0 8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);font-size:.95rem}',
      '.alf-res b{color:#f2f3f5}',
      '.alf-note{font-size:.85rem;color:#9ca3af;line-height:1.55}',
      '[data-theme="light"] .alf-wrap{color:#1f2430}',
      '[data-theme="light"] .alf-lead,[data-theme="light"] .alf-li{color:#4b5566}',
      '[data-theme="light"] .alf-card,[data-theme="light"] .alf-res{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .alf-cell{background:#fff;border-color:rgba(0,0,0,.12);color:#1f2430}',
      '[data-theme="light"] .alf-secondary,[data-theme="light"] .alf-chip{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.alf-wrap{padding:14px 12px 96px}.alf-cell b{font-size:1.1rem}.alf-key{padding:16px 4px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------- лист ----------
  function genSheet(d) {
    var letters = LETTERS.slice(0, Math.min(d.cells, LETTERS.length));
    if (!d.alpha) { // вразброс: алфавитный порядок больше не подсказывает
      for (var i = letters.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = letters[i]; letters[i] = letters[j]; letters[j] = t; }
    }
    var sheet = [], prev = '', run = 0;
    for (var k = 0; k < letters.length; k++) {
      var m;
      do { m = MARKS[rnd(3)]; } while (m === prev && run >= 2);
      run = (m === prev) ? run + 1 : 1; prev = m;
      sheet.push({ ch: letters[k], m: m });
    }
    return sheet;
  }

  function orderFor(pass, n, cols) {
    var idx = [], r, c, rows = Math.ceil(n / cols);
    if (pass === 0) { for (var i = 0; i < n; i++) idx.push(i); }
    else if (pass === 1) { for (var j = n - 1; j >= 0; j--) idx.push(j); }
    else { for (c = 0; c < cols; c++) for (r = 0; r < rows; r++) { var k = r * cols + c; if (k < n) idx.push(k); } }
    return idx;
  }

  // ---------- экраны ----------
  function home() {
    injectCSS(); stopAll(); ST.diff = loadDiff();
    track('feature_opened', { feature: 'alfavit' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var best = s.best && s.best[ST.diff];
      statsHtml = '<div class="alf-card"><div class="alf-ch">Ваша практика</div>' +
        '<div class="alf-li">Полных партий: <b>' + s.plays + '</b>' +
        (best ? ' · лучшее время «' + esc(DIFF[ST.diff].name) + '»: <b>' + fmtTime(best) + '</b>' : '') + '</div></div>';
    }
    c.innerHTML =
      '<div class="alf-wrap">' +
        '<button class="alf-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="alf-h1">🔤 Алфавит · новый код НЛП</div>' +
        '<div class="alf-lead">Самая известная игра нового кода, придумана Джоном Гриндером. Произносите букву <b>вслух</b> и одновременно жмёте кнопку по пометке под ней: <b>л</b> — левой рукой левую кнопку, <b>п</b> — правой правую, <b>о</b> — обе (среднюю). Речь и руки заняты разными задачами — внутренней болтовне негде развернуться. Это и есть смысл: три-пять минут игры прерывают прокручивание и меняют состояние.</div>' +
        statsHtml +
        '<div class="alf-card"><div class="alf-ch">Выберите лист</div>' +
          '<div class="alf-diff" style="margin-bottom:0">' + DIFF_ORDER.map(function (d) { return '<div class="alf-chip' + (ST.diff === d ? ' on' : '') + '" onclick="ALFAVIT.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>'; }).join('') + '</div></div>' +
        '<div class="alf-card"><div class="alf-ch">Правила — их три</div>' +
          '<div class="alf-li">1. Букву — <b>обязательно вслух</b>. Молча игра не работает: заняты должны быть и речь, и руки.</div>' +
          '<div class="alf-li">2. Ошиблись или задумались — проход начинается сначала. Это не наказание, это часть устройства.</div>' +
          '<div class="alf-li">3. Три прохода: слева направо, справа налево, сверху вниз. Дольше пяти минут не играют — игра сама остановится.</div></div>' +
        '<button class="alf-primary" onclick="ALFAVIT.start()">▶ Начать (' + DIFF[ST.diff].cells + ' букв, 3 прохода)</button>' +
        '<div class="alf-note">Честно о пределах: у самой игры нет независимых проверок — изучен только механизм двойной задачи, на который она опирается. Она меняет состояние на несколько минут, и это всё. С тяжёлыми воспоминаниями и паникой она не работает — это к специалисту, не к игре. Подробный разбор — в <a href="/blog/lekciya-nk-igry.html" style="color:#7fb0ff">лекции курса «Новый код НЛП»</a>.</div>' +
      '</div>';
  }
  function setDiff(d) { if (!DIFF[d]) return; saveDiff(d); vibe(20); home(); }

  function start() {
    injectCSS();
    var d = DIFF[ST.diff];
    ST.sheet = genSheet(d); ST.cols = d.cols;
    ST.pass = 0; ST.errors = 0; ST.restarts = 0;
    ST.order = orderFor(0, ST.sheet.length, ST.cols); ST.pos = 0;
    ST.t0 = Date.now(); ST.running = true;
    if (ST.capTimer) clearTimeout(ST.capTimer);
    ST.capTimer = setTimeout(capStop, TIME_CAP);
    track('game_round_start', { feature: 'alfavit', diff: ST.diff });
    render();
  }

  function render(errIdx) {
    var c = container(); if (!c) return;
    var cur = ST.order[ST.pos];
    var doneSet = {};
    for (var i = 0; i < ST.pos; i++) doneSet[ST.order[i]] = 1;
    var cells = ST.sheet.map(function (cell, i) {
      var cls = 'alf-cell' + (i === cur ? ' cur' : '') + (doneSet[i] ? ' done' : '') + (i === errIdx ? ' err' : '');
      return '<div class="' + cls + '"><b>' + cell.ch + '</b><i>' + cell.m + '</i></div>';
    }).join('');
    var p = PASSES[ST.pass];
    c.innerHTML =
      '<div class="alf-wrap">' +
        '<div class="alf-pass">Проход ' + (ST.pass + 1) + ' из 3 — ' + p.name + ' · ' + (ST.pos + 1) + '/' + ST.order.length + '</div>' +
        '<div class="alf-grid" style="grid-template-columns:repeat(' + ST.cols + ',1fr)">' + cells + '</div>' +
        '<div class="alf-say">Скажите <b style="color:#f2f3f5">«' + ST.sheet[cur].ch + '»</b> вслух — и жмите кнопку. ' + esc(p.hint) + '.</div>' +
        '<div class="alf-keys">' +
          '<button class="alf-key" onclick="ALFAVIT.press(\'л\')">Л<small>левая</small></button>' +
          '<button class="alf-key" onclick="ALFAVIT.press(\'о\')">О<small>обе</small></button>' +
          '<button class="alf-key" onclick="ALFAVIT.press(\'п\')">П<small>правая</small></button>' +
        '</div>' +
        '<button class="alf-danger" onclick="ALFAVIT.stop()">Прервать</button>' +
      '</div>';
  }

  function press(m) {
    if (!ST.running) return;
    var cur = ST.order[ST.pos];
    if (m === ST.sheet[cur].m) {
      vibe(15);
      ST.pos++;
      if (ST.pos >= ST.order.length) { nextPass(); return; }
      render();
    } else {
      ST.errors++; ST.restarts++;
      vibe([60, 40, 60]);
      render(cur);
      var pos0 = ST.pos;
      setTimeout(function () {
        if (!ST.running || ST.pos !== pos0) return;
        ST.pos = 0; // классическое правило: сбились — проход сначала
        toast('Сначала. Это и есть игра.', 'info');
        render();
      }, 450);
    }
  }

  function nextPass() {
    ST.pass++;
    if (ST.pass >= PASSES.length) { finish(false); return; }
    ST.order = orderFor(ST.pass, ST.sheet.length, ST.cols); ST.pos = 0;
    vibe([30, 30, 30]);
    toast('Проход ' + (ST.pass + 1) + ': ' + PASSES[ST.pass].name, 'success');
    render();
  }

  function capStop() {
    if (!ST.running) return;
    finish(true); // пять минут вышли — по правилам игра заканчивается
  }

  function fmtTime(ms) {
    var s = Math.round(ms / 1000);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function finish(byCap) {
    ST.running = false;
    if (ST.capTimer) { clearTimeout(ST.capTimer); ST.capTimer = null; }
    var ms = Date.now() - ST.t0;
    var full = !byCap;
    var st = loadStats();
    var isRec = false;
    if (full) {
      st.plays = (st.plays || 0) + 1;
      if (!st.best) st.best = {};
      if (!st.best[ST.diff] || ms < st.best[ST.diff]) { st.best[ST.diff] = ms; isRec = st.plays > 1; }
      saveStats(st);
    }
    track('game_round_finish', { feature: 'alfavit', diff: ST.diff, full: full, ms: ms, errors: ST.errors });
    var line = byCap
      ? 'Пять минут вышли — и по правилам этого достаточно. Игра меняет состояние, а не ставит рекорды на выносливость.'
      : ST.errors === 0 ? 'Чисто, без единого сбоя. Если было легко — берите лист «Вразброс».'
      : ST.errors <= 3 ? 'Хорошая партия: сбои и перезапуски — рабочая часть игры, а не брак.'
      : 'Много перезапусков — значит, лист попался в самый раз: на грани и есть эффект.';
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="alf-wrap">' +
        '<div class="alf-h1" style="font-size:1.2rem">🔤 ' + (byCap ? 'Время вышло' : 'Три прохода пройдены') + '</div>' +
        '<div class="alf-res"><span>⏱ Время</span><b>' + fmtTime(ms) + (isRec ? ' 🏆 рекорд' : '') + '</b></div>' +
        '<div class="alf-res"><span>🔁 Перезапусков</span><b>' + ST.restarts + '</b></div>' +
        '<div class="alf-res"><span>📄 Лист</span><b>' + esc(DIFF[ST.diff].name) + ', ' + ST.sheet.length + ' букв</b></div>' +
        '<div class="alf-card" style="color:#c8ccd4">' + esc(line) + '</div>' +
        '<div class="alf-card alf-note">Теперь — момент, ради которого всё делалось: состояние после игры. Не оценивайте его, просто возьмите в нём дело, которое откладывали. Если хочется понять, почему это работает, — <a href="/blog/lekciya-nk-igry.html" style="color:#7fb0ff">лекция про игры нового кода</a>; если хочется разобрать своё состояние словами — <a href="#" onclick="(window.renderDashboard||function(){})();return false" style="color:#7fb0ff">поговорите с Фреди</a>.</div>' +
        '<div class="alf-row"><button class="alf-primary" onclick="ALFAVIT.start()">🔁 Новый лист</button><button class="alf-secondary" onclick="ALFAVIT.home()">Меню</button></div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
  }

  function stop() { if (!ST.running) return; stopAll(); toast('Партия прервана', 'info'); home(); }
  function stopAll() { ST.running = false; if (ST.capTimer) { clearTimeout(ST.capTimer); ST.capTimer = null; } }

  window.ALFAVIT = { home: home, setDiff: setDiff, start: start, press: press, stop: stop, getState: function () { return ST; } };
  window.showAlfavitGame = home;
  console.log('✅ alfavit.js loaded (игра «Алфавит» нового кода)');
})();
