// ============================================
// lestnica.js — Тренажёр «Лестница» — конструктор лестницы экспозиции.
// Спутник курса «Страхи и фобии» (/blog/lektorij/strahi-i-fobii/, лекция 5).
// Что делает: человек называет тему страха, набирает 6–10 ступеней с
// оценкой СУД (0–100), конструктор проверяет стройку локально (нижняя
// ступень не выше 35, разрывы больше 20, ступени-близнецы), Фреди (AI)
// разбирает формулировки — ищет спрятанные подстраховки и нечёткие
// прогнозы. Дальше режим прохождения: отметить заход с пиковым СУД и
// СУД на выходе — лист побед копится в localStorage.
// Ядро локальное; AI — только разбор лестницы и ободрение захода.
// Экспорт: window.showLestnicaGame, window.LESTNICA
// ============================================
(function () {
  "use strict";

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 380, temperature: opts.temperature == null ? 0.4 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  var EXAMPLES = ['звонки незнакомым', 'лифт', 'выступления', 'метро', 'полёты', 'разговор с начальником', 'знакомиться', 'водить машину'];

  // ---------- хранение ----------
  function load() {
    try { var s = JSON.parse(localStorage.getItem('lestnica_v1') || 'null'); if (s && s.steps) return s; } catch (e) {}
    return { theme: '', steps: [], log: [] }; // steps: {t, sud}; log: {date, step, peak, out, note}
  }
  function save(s) { try { localStorage.setItem('lestnica_v1', JSON.stringify(s)); } catch (e) {} }
  var ST = load();

  function injectCSS() {
    if (document.getElementById('lestnicaCSS')) return;
    var st = document.createElement('style');
    st.id = 'lestnicaCSS';
    st.textContent =
      '.lst-wrap{max-width:640px;margin:0 auto;padding:18px 14px 40px;color:#e8ebf1}' +
      '.lst-h{font-size:1.35rem;font-weight:700;margin:6px 0 4px}' +
      '.lst-sub{color:#98a1b3;font-size:.92rem;margin:0 0 14px;line-height:1.5}' +
      '.lst-card{background:#15171c;border:1px solid #262a33;border-radius:14px;padding:14px 16px;margin:10px 0}' +
      '.lst-note{font-size:.9rem;color:#aab2c0;line-height:1.55}' +
      '.lst-row{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}' +
      '.lst-primary{flex:1;min-width:150px;background:#3A86FF;border:none;color:#fff;font-weight:700;font-size:1rem;padding:13px 16px;border-radius:12px;cursor:pointer}' +
      '.lst-secondary{background:none;border:1px solid #3a3f4b;color:#c8ccd4;padding:12px 16px;border-radius:12px;cursor:pointer}' +
      '.lst-input{width:100%;background:#0f1115;border:1px solid #2a2f3a;border-radius:10px;color:#e8ebf1;padding:11px 12px;font-size:1rem;box-sizing:border-box}' +
      '.lst-chip{display:inline-block;background:#1b1e26;border:1px solid #2a2f3a;border-radius:20px;color:#aab2c0;padding:5px 12px;margin:3px;font-size:.85rem;cursor:pointer}' +
      '.lst-step{display:flex;align-items:center;gap:10px;background:#171a21;border:1px solid #262a33;border-radius:12px;padding:10px 12px;margin:6px 0}' +
      '.lst-step.done{border-color:#2e7d32;opacity:.85}' +
      '.lst-sud{flex:none;width:44px;height:44px;border-radius:10px;background:#0f1115;border:1px solid #2a2f3a;display:grid;place-items:center;font-weight:700;color:#7fb0ff}' +
      '.lst-step .t{flex:1;font-size:.95rem;line-height:1.4}' +
      '.lst-step .x{background:none;border:none;color:#5c6678;cursor:pointer;font-size:1.05rem;padding:4px}' +
      '.lst-warn{border-left:3px solid #e0a030;padding:8px 12px;background:#1c1912;border-radius:8px;margin:6px 0;font-size:.88rem;color:#d8c9a0}' +
      '.lst-ok{border-left:3px solid #2e7d32;padding:8px 12px;background:#121c13;border-radius:8px;margin:6px 0;font-size:.88rem;color:#a9d0ab}' +
      '.lst-slider{width:100%}' +
      '.lst-log{font-size:.88rem;color:#aab2c0;border-top:1px dashed #262a33;padding:8px 0 0;margin-top:8px}' +
      '.lst-ai{white-space:pre-wrap;font-size:.92rem;line-height:1.55;color:#cdd3dd}';
    document.head.appendChild(st);
  }

  // ---------- локальная проверка стройки ----------
  function auditSteps(steps) {
    var out = [];
    var s = steps.slice().sort(function (a, b) { return a.sud - b.sud; });
    if (s.length < 6) out.push({ k: 'warn', t: 'Ступеней ' + s.length + ' — рабочая лестница начинается с шести: раздробите крупные (длительностью, дистанцией, компанией или снятием подстраховок).' });
    if (s.length > 10) out.push({ k: 'warn', t: 'Ступеней ' + s.length + ' — больше десяти обычно значит две темы в одной лестнице. Одна тема — одна лестница.' });
    if (s.length && s[0].sud > 35) out.push({ k: 'warn', t: 'Нижняя ступень — ' + s[0].sud + ' СУД. Начинать лучше с 20–30: ранний лёгкий успех — часть механизма, а не поблажка.' });
    for (var i = 1; i < s.length; i++) {
      var gap = s[i].sud - s[i - 1].sud;
      if (gap > 20) out.push({ k: 'warn', t: 'Разрыв ' + gap + ' СУД между «' + s[i - 1].t + '» (' + s[i - 1].sud + ') и «' + s[i].t + '» (' + s[i].sud + ') — вставьте промежуточную ступень.' });
      if (gap >= 0 && gap < 5 && i > 0) out.push({ k: 'warn', t: 'Ступени-близнецы: «' + s[i - 1].t + '» и «' + s[i].t + '» почти равны по СУД — лестница должна подниматься, а не топтаться.' });
    }
    if (!out.length && s.length) out.push({ k: 'ok', t: 'Конструкция чистая: ' + s.length + ' ступеней, нижняя ' + s[0].sud + ' СУД, разрывов больше 20 нет. Можно назначать первый заход.' });
    return out;
  }

  // ---------- экраны ----------
  function home() {
    injectCSS();
    track('lestnica_open');
    var c = container(); if (!c) return;
    var chips = EXAMPLES.map(function (e) { return '<span class="lst-chip" onclick="LESTNICA.theme(\'' + esc(e) + '\')">' + esc(e) + '</span>'; }).join('');
    var hasSteps = ST.steps.length > 0;
    c.innerHTML =
      '<div class="lst-wrap">' +
      '<div class="lst-h">🪜 Лестница</div>' +
      '<p class="lst-sub">Конструктор лестницы экспозиции — главного инструмента против страхов и фобий. Ступени от «неуютно» до «пока немыслимо», проверка стройки и лист побед. Как этим пользоваться — <a href="/blog/lekciya-strah-5-ekspoziciya.html" style="color:#7fb0ff">лекция 5 курса «Страхи и фобии»</a>.</p>' +
      '<div class="lst-card"><div class="lst-note"><b>Правила коротко.</b> Одна тема — одна лестница. 6–10 ступеней с шагом 10–20 СУД (0 — спокойствие, 100 — максимум вашей паники). Нижняя — выполнима на этой неделе. Подстраховки («только с телефоном», «только с водой») снимаются отдельными ступенями.</div></div>' +
      '<div class="lst-card">' +
      '<div style="font-weight:600;margin-bottom:8px">Тема лестницы</div>' +
      '<input class="lst-input" id="lstTheme" placeholder="например: звонки незнакомым людям" value="' + esc(ST.theme) + '" onchange="LESTNICA.theme(this.value)">' +
      '<div style="margin-top:8px">' + chips + '</div>' +
      '</div>' +
      (hasSteps ? '' :
        '<div class="lst-card lst-note">⚠️ Если тема — паника чаще раза в неделю, страх после травмы или страх за здоровье, лестницу строят вместе со специалистом по КПТ. Конструктор — для страхов, с которыми безопасно работать самостоятельно; границы описаны в курсе.</div>') +
      '<div class="lst-row"><button class="lst-primary" onclick="LESTNICA.build()">' + (hasSteps ? '🪜 К моей лестнице (' + ST.steps.length + ' ступеней)' : '🪜 Строить лестницу') + '</button></div>' +
      (ST.log.length ? '<div class="lst-card"><b>📗 Лист побед: ' + ST.log.length + '</b><div class="lst-note">Последняя: ' + esc(ST.log[ST.log.length - 1].step) + ' — пик ' + ST.log[ST.log.length - 1].peak + ', выход ' + ST.log[ST.log.length - 1].out + '</div></div>' : '') +
      '</div>';
  }

  function setTheme(v) { ST.theme = String(v || '').slice(0, 80); save(ST); var el = document.getElementById('lstTheme'); if (el) el.value = ST.theme; }

  function build() {
    injectCSS();
    var c = container(); if (!c) return;
    if (!ST.theme) { toast('Сначала назовите тему', 'info'); home(); return; }
    var sorted = ST.steps.slice().sort(function (a, b) { return a.sud - b.sud; });
    var rows = sorted.map(function (s, i) {
      var idx = ST.steps.indexOf(s);
      return '<div class="lst-step' + (s.done ? ' done' : '') + '">' +
        '<span class="lst-sud">' + s.sud + '</span>' +
        '<span class="t">' + esc(s.t) + (s.done ? ' ✅' : '') + '</span>' +
        (s.done ? '' : '<button class="x" title="пройдена" onclick="LESTNICA.pass(' + idx + ')">☑️</button>') +
        '<button class="x" title="удалить" onclick="LESTNICA.del(' + idx + ')">✕</button>' +
        '</div>';
    }).join('');
    var audit = auditSteps(ST.steps).map(function (a) {
      return '<div class="lst-' + a.k + '">' + esc(a.t) + '</div>';
    }).join('');
    c.innerHTML =
      '<div class="lst-wrap">' +
      '<div class="lst-h">🪜 ' + esc(ST.theme) + '</div>' +
      '<p class="lst-sub">Добавляйте ступени — список сам сортируется по СУД. Отмечайте пройденные галочкой: заход попадает в лист побед.</p>' +
      '<div class="lst-card">' +
      '<input class="lst-input" id="lstStepText" placeholder="ступень: что именно сделать (конкретно, как встречу)">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-top:10px">' +
      '<input type="range" min="5" max="100" step="5" value="40" class="lst-slider" id="lstStepSud" oninput="document.getElementById(\'lstSudVal\').textContent=this.value">' +
      '<span class="lst-sud" id="lstSudVal">40</span></div>' +
      '<div class="lst-row"><button class="lst-primary" onclick="LESTNICA.add()">+ Добавить ступень</button></div>' +
      '</div>' +
      (rows ? '<div style="margin:10px 0">' + rows + '</div>' : '<div class="lst-card lst-note">Пока пусто. Берите пункты из своего списка избеганий — включая подстраховки: «то же, но без телефона в руке» — это отдельная ступень.</div>') +
      (ST.steps.length ? audit : '') +
      (ST.steps.length >= 4 ? '<div class="lst-row"><button class="lst-primary" onclick="LESTNICA.review()">🤖 Разбор лестницы Фреди</button><button class="lst-secondary" onclick="LESTNICA.copy()">📋 Скопировать</button></div>' : '') +
      '<div id="lstAI"></div>' +
      (ST.log.length ? '<div class="lst-card"><b>📗 Лист побед</b>' + ST.log.slice(-5).reverse().map(function (l) {
        return '<div class="lst-log">' + esc(l.date) + ' · ' + esc(l.step) + ' · пик ' + l.peak + ' → выход ' + l.out + '</div>';
      }).join('') + '</div>' : '') +
      '<div class="lst-row"><button class="lst-secondary" onclick="LESTNICA.home()">← Меню</button></div>' +
      '</div>';
  }

  function add() {
    var t = (document.getElementById('lstStepText') || {}).value || '';
    var sud = parseInt((document.getElementById('lstStepSud') || {}).value || '40', 10);
    t = t.trim();
    if (t.length < 5) { toast('Опишите ступень конкретнее', 'info'); return; }
    if (ST.steps.length >= 12) { toast('Больше 12 ступеней — это уже две лестницы', 'info'); return; }
    ST.steps.push({ t: t.slice(0, 120), sud: sud, done: false });
    save(ST); track('lestnica_add', { sud: sud, n: ST.steps.length });
    build();
  }

  function del(i) { if (ST.steps[i]) { ST.steps.splice(i, 1); save(ST); build(); } }

  function markPass(i) {
    var s = ST.steps[i]; if (!s) return;
    var peak = prompt('Пиковый СУД на ступени «' + s.t + '»? (0–100)', String(s.sud));
    if (peak == null) return;
    var out = prompt('СУД на выходе — когда закончили?', '20');
    if (out == null) return;
    s.done = true;
    ST.log.push({ date: new Date().toISOString().slice(0, 10), step: s.t, peak: parseInt(peak, 10) || 0, out: parseInt(out, 10) || 0 });
    save(ST); track('lestnica_pass', { peak: peak, out: out });
    toast('В лист побед ✍️', 'success');
    build();
  }

  async function review() {
    var box = document.getElementById('lstAI');
    if (!box) return;
    box.innerHTML = '<div class="lst-card lst-note">Фреди смотрит лестницу…</div>';
    var lines = ST.steps.slice().sort(function (a, b) { return a.sud - b.sud; })
      .map(function (s) { return s.sud + ' СУД — ' + s.t; }).join('\n');
    try {
      var r = await aiGenerate(
        'Ты — Фреди, наставник курса «Страхи и фобии» (метод: градуированная экспозиция, КПТ). ' +
        'Человек строит лестницу экспозиции. Тема: «' + ST.theme + '». Ступени (СУД 0–100):\n' + lines +
        '\nРазбери как тренер, по-русски, на «вы», без воды, максимум 6 коротких пунктов: ' +
        '1) есть ли в формулировках спрятанные подстраховки/талисманы («с телефоном», «если кто-то рядом») — назови и предложи ступень их снятия; ' +
        '2) какие ступени сформулированы неконкретно (нельзя понять, сделана или нет) — предложи точнее; ' +
        '3) чего не хватает между разрывами; 4) одобри то, что построено хорошо. ' +
        'Не давай медицинских советов; если тема выглядит как паника/травма/здоровье — мягко напомни, что такие лестницы строят со специалистом.',
        { max_tokens: 420 });
      var txt = (r && (r.content || r.text || r.response)) || 'Не получилось получить разбор — попробуйте позже.';
      box.innerHTML = '<div class="lst-card"><b>🤖 Разбор Фреди</b><div class="lst-ai">' + esc(txt) + '</div></div>';
      track('lestnica_review');
    } catch (e) {
      box.innerHTML = '<div class="lst-card lst-note">Сеть не отвечает. Локальная проверка выше уже показала конструкцию; разбор Фреди можно запросить позже.</div>';
    }
  }

  function copy() {
    var lines = ['Лестница: ' + ST.theme].concat(
      ST.steps.slice().sort(function (a, b) { return a.sud - b.sud; })
        .map(function (s, i) { return (i + 1) + '. [' + s.sud + ' СУД] ' + s.t + (s.done ? ' ✅' : ''); }));
    try { navigator.clipboard.writeText(lines.join('\n')); toast('Скопировано', 'success'); }
    catch (e) { toast('Не вышло скопировать', 'info'); }
  }

  window.LESTNICA = { home: home, theme: setTheme, build: build, add: add, del: del, pass: markPass, review: review, copy: copy };
  window.showLestnicaGame = home;
  console.log('✅ lestnica.js loaded (конструктор лестницы экспозиции)');
})();
