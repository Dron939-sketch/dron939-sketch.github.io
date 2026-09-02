// ============================================
// danetki.js — Игра «Данетки». Латеральное мышление: разгадай ситуацию,
// задавая Фреди вопросы, на которые он отвечает только «да / нет / неважно».
// Фреди — оракул: держит разгадку, отвечает по правилам, судит твою версию.
// AI: POST /api/ai/generate. Голос (STT) для вопросов вслух.
// Экспорт: window.showDanetkiGame, window.DANETKI
// ============================================
(function () {
  "use strict";

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || ''; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 120, temperature: opts.temperature == null ? 0.3 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // Банк ситуаций. facts — опорные истины, чтобы Фреди отвечал согласованно.
  var BANK = [
    { r: 'Ромео и Джульетта лежат мёртвыми на полу в луже воды и осколках стекла. В комнате был только кот.',
      s: 'Ромео и Джульетта — рыбки. Кот столкнул со стола аквариум, тот разбился, вода вытекла, рыбки погибли.',
      facts: ['Ромео и Джульетта — рыбки, а не люди', 'разбился аквариум', 'вода — из аквариума', 'кот виновник', 'убийства человека не было'] },
    { r: 'Человека нашли мёртвым посреди пустого поля. При нём — закрытый рюкзак.',
      s: 'Это парашютист. Парашют (в рюкзаке) не раскрылся, и человек разбился при падении.',
      facts: ['это парашютист', 'рюкзак — это ранец парашюта', 'парашют не раскрылся', 'он упал с высоты', 'смерть от падения'] },
    { r: 'Мужчина зашёл в бар и попросил стакан воды. Бармен вдруг наставил на него ружьё. Мужчина сказал «спасибо» и ушёл.',
      s: 'У мужчины была икота. Он просил воды, чтобы избавиться от неё. Бармен решил помочь иначе — напугал ружьём, икота от испуга прошла. Мужчина поблагодарил.',
      facts: ['у мужчины была икота', 'вода была нужна от икоты', 'бармен хотел помочь', 'испуг вылечил икоту', 'выстрела не было', 'вражды между ними нет'] },
    { r: 'Мужчина толкал свою машину, остановился у отеля — и тут же понял, что разорён.',
      s: 'Они играли в «Монополию». Его фишка-машинка встала на клетку с чужим отелем, и пришлось платить — денег не осталось.',
      facts: ['это игра «Монополия»', 'машина — игровая фишка', 'отель — на игровом поле', 'разорение — игровое', 'реальных денег он не терял'] },
    { r: 'Каждое утро мужчина спускается на лифте с 10-го этажа. Вечером едет только до 7-го, а дальше идёт пешком. Но в дождливые дни доезжает до 10-го.',
      s: 'Мужчина очень низкого роста. Он дотягивается только до кнопки «7». В дождь у него зонт, которым он дотягивается до кнопки «10».',
      facts: ['мужчина маленького роста', 'не достаёт до верхних кнопок', 'кнопка 7 — предел его руки', 'в дождь помогает зонт', 'здоровье и лифт исправны'] },
    { r: 'В запертой изнутри комнате нашли повешенного мужчину. Под ним — только лужа воды.',
      s: 'Он встал на большую глыбу льда, чтобы повеситься. Лёд растаял и превратился в лужу — поэтому под ногами не оказалось никакой опоры.',
      facts: ['он встал на глыбу льда', 'лёд растаял в лужу', 'это опора, которая исчезла', 'комната была заперта им самим', 'посторонних не было'] },
    { r: 'На лужайке лежат кусок угля, морковка и несколько веточек. Никто их туда не клал.',
      s: 'Это растаявший снеговик. Уголь был глазами/пуговицами, морковка — носом, ветки — руками. Снег растаял, а «начинка» осталась.',
      facts: ['был снеговик', 'он растаял', 'морковка — нос', 'уголь — глаза или пуговицы', 'ветки — руки', 'людей рядом не было'] },
    { r: 'Женщина в чёрном с ног до головы идёт по чёрной дороге. У машины без фар выключены огни, но водитель успевает её объехать.',
      s: 'Дело происходит днём. При дневном свете водитель прекрасно видит женщину, поэтому фары не нужны.',
      facts: ['сейчас день, светло', 'фары не нужны днём', 'водитель видит её при свете', 'ночью тут ни при чём', 'ничего сверхъестественного'] },
    { r: 'Человек в маске ждёт. К нему бежит другой человек. От того, добежит ли он, зависит очень многое.',
      s: 'Это бейсбол. Человек в маске — кэтчер у «дома», бегущий — игрок, пытающийся достичь базы. От этого зависит очко.',
      facts: ['это бейсбол', 'маска — у кэтчера', 'бежит игрок к базе («дому»)', 'на кону очко в игре', 'опасности для жизни нет'] }
  ];

  var DIFF = { any: { name: 'Случайная', em: '🎲' } };

  var ST = { puzzle: null, history: [], qCount: 0, solved: false, done: false, busy: false };
  var _rec = { on: false, savedT: null, savedC: null };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('danetki_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, solved: 0, streak: 0, last: [], bestQ: 0 }; }
  function saveStats(s) { try { localStorage.setItem('danetki_stats', JSON.stringify(s)); } catch (e) {} }
  function recordSolve(qs) { var s = loadStats(); s.plays = (s.plays || 0) + 1; s.solved = (s.solved || 0) + 1; s.streak = (s.streak || 0) + 1; if (!s.bestQ || qs < s.bestQ) s.bestQ = qs; s.last = (s.last || []).concat(1).slice(-20); saveStats(s); return s; }
  function recordGiveup() { var s = loadStats(); s.plays = (s.plays || 0) + 1; s.streak = 0; s.last = (s.last || []).concat(0).slice(-20); saveStats(s); return s; }

  function injectCSS() {
    if (document.getElementById('dnCSS')) return;
    var s = document.createElement('style'); s.id = 'dnCSS';
    s.textContent = [
      '.dn-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.dn-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.dn-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.dn-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.dn-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.dn-ch{font-weight:700;margin-bottom:8px}',
      '.dn-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.dn-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.dn-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.dn-stat b{display:block;font-size:1.35rem;font-weight:800;color:#34d399}',
      '.dn-stat span{font-size:.72rem;color:#9ca3af}',
      '.dn-riddle{border:1px solid rgba(52,211,153,.35);background:rgba(52,211,153,.08);border-radius:14px;padding:18px;margin:0 0 14px;font-size:1.1rem;line-height:1.55;font-weight:500}',
      '.dn-top{display:flex;justify-content:space-between;color:#9ca3af;font-size:.88rem;margin:0 0 10px}',
      '.dn-chat{margin:0 0 14px}',
      '.dn-msg{max-width:88%;padding:10px 14px;border-radius:14px;margin:0 0 8px;line-height:1.5;font-size:.96rem}',
      '.dn-msg.you{margin-left:auto;background:rgba(52,211,153,.16);border:1px solid rgba(52,211,153,.3)}',
      '.dn-msg.f{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}',
      '.dn-msg.f b{color:#34d399}',
      '.dn-msg.sys{background:none;border:none;color:#9ca3af;font-size:.85rem;text-align:center;max-width:100%}',
      '.dn-input{display:flex;gap:8px;align-items:flex-end;margin:0 0 10px}',
      '.dn-ta{flex:1;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:12px;font-size:1rem;color:#f2f3f5;font-family:inherit;resize:none;min-height:46px;max-height:120px}',
      '.dn-ta:focus{outline:none;border-color:#10b981}',
      '.dn-mic{flex:0 0 46px;height:46px;border-radius:50%;border:none;background:linear-gradient(135deg,#10b981,#0e8f6f);color:#fff;font-size:1.2rem;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,.4)}',
      '.dn-mic.rec{background:linear-gradient(135deg,#ef4444,#b91c1c)}',
      '.dn-mic.off{opacity:.4}',
      '.dn-btns{display:flex;gap:8px;margin:0 0 10px}',
      '.dn-ask{flex:2;border:none;border-radius:12px;padding:13px;font-size:1rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#10b981,#0ea5e9)}',
      '.dn-solve{flex:1;border:1px solid rgba(251,191,36,.5);border-radius:12px;padding:13px;font-size:.95rem;font-weight:700;color:#fbbf24;background:rgba(251,191,36,.1);cursor:pointer}',
      '.dn-give{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:11px;font-size:.9rem;font-weight:600;color:#9ca3af;cursor:pointer;margin:0 0 10px}',
      '.dn-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#10b981,#0ea5e9);box-shadow:0 8px 22px rgba(16,185,129,.35);margin:0 0 10px}',
      '.dn-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.dn-win{border:1px solid rgba(52,211,153,.5);background:linear-gradient(135deg,rgba(52,211,153,.16),rgba(14,165,233,.05));border-radius:16px;padding:16px 18px;margin:0 0 14px;line-height:1.6}',
      '.dn-typing{color:#8b93a7;font-size:.9rem;padding:4px 2px}',
      '.dn-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .dn-wrap{color:#1f2430}',
      '[data-theme="light"] .dn-lead,[data-theme="light"] .dn-li{color:#4b5566}',
      '[data-theme="light"] .dn-card,[data-theme="light"] .dn-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .dn-ta,[data-theme="light"] .dn-secondary{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .dn-msg.f{background:#f2f4f7;border-color:rgba(0,0,0,.08)}',
      '@media(max-width:560px){.dn-wrap{padding:14px 12px 96px}.dn-riddle{font-size:1.02rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); stopVoice(); ST.done = true;
    track('feature_opened', { feature: 'danetki' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var rate = s.plays ? Math.round((s.solved || 0) / s.plays * 100) : 0;
      var rk = rate >= 80 ? 'Щёлкаешь загадки 🕵️' : rate >= 50 ? 'Мыслишь вбок' : 'Расширяешь угол зрения';
      statsHtml = '<div class="dn-stats"><div class="dn-stat"><b>' + (s.solved || 0) + '</b><span>разгадано</span></div><div class="dn-stat"><b>' + (s.streak || 0) + '</b><span>серия</span></div><div class="dn-stat"><b>' + (s.bestQ || '—') + '</b><span>рекорд вопросов</span></div></div>' +
        '<div class="dn-card" style="text-align:center;color:#c8ccd4">' + rk + ' · раскрыто ' + rate + '% ситуаций</div>';
    }
    c.innerHTML =
      '<div class="dn-wrap">' +
        '<button class="dn-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="dn-h1">🕵️ Данетки</div>' +
        '<div class="dn-lead">Тренажёр латерального мышления — умения смотреть на ситуацию под неожиданным углом и проверять догадки. Дана странная сцена. Ты задаёшь Фреди вопросы, а он отвечает только <b>«да», «нет»</b> или <b>«неважно»</b>. Собери из ответов картину и назови разгадку.</div>' +
        statsHtml +
        '<div class="dn-card"><div class="dn-ch">Как играть</div>' +
          '<div class="dn-li">1. Задавай вопросы, на которые можно ответить да/нет: «Он был жив?», «Это происходило на улице?».</div>' +
          '<div class="dn-li">2. Двигайся от общего к частному. Проверяй смелые гипотезы.</div>' +
          '<div class="dn-li">3. Когда поймёшь — жми «Разгадка» и опиши, что произошло.</div></div>' +
        '<button class="dn-primary" onclick="DANETKI.start()">▶ Дай ситуацию</button>' +
        (s.plays ? '' : '<div class="dn-flag">💡 Ключ к данеткам — ставить под сомнение очевидное: «а точно ли это люди? точно ли это ночь?».</div>') +
      '</div>';
  }

  function start() {
    injectCSS();
    ST.puzzle = shuffle(BANK)[0];
    ST.history = []; ST.qCount = 0; ST.solved = false; ST.done = false; ST.busy = false;
    track('game_round_start', { feature: 'danetki' });
    render();
  }

  function render() {
    var c = container(); if (!c) return;
    var micOff = !(window.voiceManager && typeof window.voiceManager.startRecording === 'function');
    c.innerHTML =
      '<div class="dn-wrap">' +
        '<div class="dn-top"><span onclick="DANETKI.home()" style="cursor:pointer">← меню</span><span>Вопросов задано: ' + ST.qCount + '</span></div>' +
        '<div class="dn-riddle">' + esc(ST.puzzle.r) + '</div>' +
        '<div class="dn-chat" id="dnChat"></div>' +
        '<div id="dnTyping"></div>' +
        '<div class="dn-input">' +
          '<textarea class="dn-ta" id="dnIn" rows="1" placeholder="Задай вопрос (да/нет) или опиши разгадку…"></textarea>' +
          '<button class="dn-mic' + (micOff ? ' off' : '') + '" id="dnMic" onclick="DANETKI.mic()" title="Спросить голосом">🎤</button>' +
        '</div>' +
        '<div class="dn-btns">' +
          '<button class="dn-ask" onclick="DANETKI.ask()">❓ Спросить</button>' +
          '<button class="dn-solve" onclick="DANETKI.solve()">💡 Разгадка</button>' +
        '</div>' +
        '<button class="dn-give" onclick="DANETKI.giveUp()">Сдаюсь — показать ответ</button>' +
      '</div>';
    paintChat();
  }
  function paintChat() {
    var box = document.getElementById('dnChat'); if (!box) return;
    box.innerHTML = ST.history.map(function (m) {
      if (m.role === 'sys') return '<div class="dn-msg sys">' + esc(m.text) + '</div>';
      return '<div class="dn-msg ' + (m.role === 'you' ? 'you' : 'f') + '">' + (m.role === 'fredi' ? '<b>Фреди:</b> ' : '') + esc(m.text) + '</div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }
  function typing(on) { var t = document.getElementById('dnTyping'); if (t) t.innerHTML = on ? '<div class="dn-typing">Фреди думает…</div>' : ''; }
  function readInput() { var e = document.getElementById('dnIn'); var v = e ? String(e.value || '').trim() : ''; if (e) e.value = ''; return v; }

  async function ask() {
    if (ST.busy || ST.done) return;
    var q = readInput(); if (!q) { toast('Задай вопрос', 'info'); return; }
    stopVoice();
    ST.history.push({ role: 'you', text: q }); ST.qCount++; paintChat();
    ST.busy = true; typing(true);
    var ans = '';
    try {
      var p = 'Ты ведущий игры «данетки». Загаданная ситуация: «' + ST.puzzle.r + '». Полная разгадка (игроку НЕ показывай и НЕ пересказывай): «' + ST.puzzle.s + '». Опорные факты: ' + ST.puzzle.facts.join('; ') + '. Игрок задал вопрос: «' + q + '». Ответь СТРОГО одним из: «Да», «Нет», «Неважно», «И да, и нет». Можно добавить максимум 3-4 слова лёгкой подсказки, если игрок близок. Никогда не раскрывай разгадку целиком. Отвечай кратко, по-русски.';
      var r = await aiGenerate(p, { max_tokens: 40, temperature: 0.2 });
      ans = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { ans = ''; }
    ST.busy = false; typing(false);
    ST.history.push({ role: 'fredi', text: ans || '(связь подвисла — спроси ещё раз)' });
    paintChat();
    track('message_sent', { feature: 'danetki' });
  }

  async function solve() {
    if (ST.busy || ST.done) return;
    var g = readInput(); if (!g) { toast('Опиши свою разгадку', 'info'); return; }
    stopVoice();
    ST.history.push({ role: 'you', text: '💡 Моя версия: ' + g }); paintChat();
    ST.busy = true; typing(true);
    var verdict = '', ok = false;
    try {
      var p = 'Ты судья игры «данетки». Правильная разгадка: «' + ST.puzzle.s + '». Игрок предложил версию: «' + g + '». Совпадает ли версия по СУТИ с правильной разгадкой (мелкие детали не важны)? Ответь так: первым словом строго SOLVED (если суть верна) или NO (если нет), затем через тире короткий дружелюбный комментарий по-русски.';
      var r = await aiGenerate(p, { max_tokens: 80, temperature: 0.2 });
      verdict = (r && r.success && r.content) ? String(r.content).trim() : '';
      ok = /^\s*SOLVED/i.test(verdict);
    } catch (e) { verdict = ''; }
    ST.busy = false; typing(false);
    var comment = verdict.replace(/^\s*(SOLVED|NO)\s*[-—:]*\s*/i, '').trim();
    if (ok) { win(comment); }
    else {
      ST.history.push({ role: 'fredi', text: (comment || 'Не совсем. Копай дальше — задавай ещё вопросы.') });
      paintChat();
    }
  }

  function win(comment) {
    ST.done = true; ST.solved = true;
    var st = recordSolve(ST.qCount);
    vibe([40, 40, 40]);
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="dn-wrap">' +
        '<div class="dn-h1" style="font-size:1.25rem">🎉 Разгадано!</div>' +
        '<div class="dn-win"><b>' + esc(comment || 'В точку!') + '</b><br><br>💡 Разгадка: ' + esc(ST.puzzle.s) + '</div>' +
        '<div class="dn-card" style="text-align:center;color:#c8ccd4">Задано вопросов: <b>' + ST.qCount + '</b>' + (st.bestQ === ST.qCount ? ' 🏆 личный рекорд!' : '') + ' · серия: ' + st.streak + ' 🔥</div>' +
        '<button class="dn-primary" onclick="DANETKI.start()">🎲 Новая ситуация</button>' +
        '<button class="dn-secondary" onclick="DANETKI.home()">В меню</button>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'danetki', solved: true, qs: ST.qCount });
  }

  function giveUp() {
    if (ST.done) return;
    ST.done = true;
    recordGiveup();
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="dn-wrap">' +
        '<div class="dn-h1" style="font-size:1.25rem">Разгадка</div>' +
        '<div class="dn-card" style="border-color:rgba(52,211,153,.4)">💡 ' + esc(ST.puzzle.s) + '</div>' +
        '<div class="dn-card" style="color:#a7adba;font-size:.92rem">Не расстраивайся: данетки тренируют привычку сомневаться в очевидном. В следующий раз пробуй сразу проверить самое базовое допущение — «а это точно люди? точно сейчас? точно всерьёз?».</div>' +
        '<button class="dn-primary" onclick="DANETKI.start()">🎲 Ещё ситуация</button>' +
        '<button class="dn-secondary" onclick="DANETKI.home()">В меню</button>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('game_round_finish', { feature: 'danetki', solved: false, qs: ST.qCount });
  }

  // ---------- голос ----------
  function mic() { _rec.on ? stopVoice() : startVoice(); }
  async function startVoice() {
    var el = document.getElementById('dnMic'), inp = document.getElementById('dnIn');
    if (!window.voiceManager || typeof window.voiceManager.startRecording !== 'function') { toast('🎤 Голос недоступен в этом браузере', 'info'); return; }
    _rec.savedT = window.voiceManager.onTranscript; _rec.savedC = window.voiceManager.onTranscriptComplete;
    window.voiceManager.sttOnly = true;
    window.voiceManager.onTranscript = function (text) { if (!text || !inp) return; inp.value = inp.value ? (inp.value + ' ' + text) : text; };
    window.voiceManager.onTranscriptComplete = function () {};
    _rec.on = true; if (el) el.classList.add('rec');
    vibe(30);
    var ok = await window.voiceManager.startRecording();
    if (!ok) { stopVoice(); toast('🎤 Нет доступа к микрофону', 'error'); }
  }
  function stopVoice() {
    if (!_rec.on) return;
    try { if (window.voiceManager && window.voiceManager.stopRecording) window.voiceManager.stopRecording(); } catch (e) {}
    _rec.on = false; var el = document.getElementById('dnMic'); if (el) el.classList.remove('rec');
    setTimeout(function () { if (window.voiceManager) { if (_rec.savedT !== null) window.voiceManager.onTranscript = _rec.savedT; if (_rec.savedC !== null) window.voiceManager.onTranscriptComplete = _rec.savedC; window.voiceManager.sttOnly = false; _rec.savedT = null; _rec.savedC = null; } }, 500);
  }

  window.DANETKI = { home: home, start: start, ask: ask, solve: solve, giveUp: giveUp, mic: mic, getState: function () { return ST; } };
  window.showDanetkiGame = home;
  console.log('✅ danetki.js loaded (игра «Данетки»)');
})();
