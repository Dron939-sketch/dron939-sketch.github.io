// ============================================
// advokat.js — Игра «Адвокат дьявола». Гибкость мышления и аргументация.
// Фреди даёт тезис — ты убедительно защищаешь заданную сторону (в т.ч. ту,
// с которой можешь быть не согласен). Это стилменинг: умение построить
// сильнейшую версию чужой позиции. Фреди-судья оценивает довод.
// AI-судья + голос (STT).
// Экспорт: window.showAdvokatGame, window.ADVOKAT
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
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function ttsOk() { return !!(window.voiceManager && typeof window.voiceManager.textToSpeech === 'function'); }
  function stopSpeak() { try { if (window.voiceManager && typeof window.voiceManager.interrupt === 'function') window.voiceManager.interrupt(); } catch (e) {} }
  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 380, temperature: opts.temperature == null ? 0.6 : opts.temperature };
    if (typeof window.apiCall === 'function') return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }

  // Пары полярных позиций. Игрок защищает одну из сторон.
  var TOPICS = [
    ['Удалённая работа лучше офисной', 'Офис лучше удалённой работы'],
    ['Оценки в школе нужно отменить', 'Оценки в школе необходимы'],
    ['Путешествия важнее, чем накопления', 'Накопления важнее, чем путешествия'],
    ['Лучше быть мастером в одном деле', 'Лучше быть разносторонним универсалом'],
    ['Художественная литература полезнее нон-фикшна', 'Нон-фикшн полезнее художественной литературы'],
    ['Жить в городе лучше, чем в деревне', 'Жить в деревне лучше, чем в городе'],
    ['Ранние подъёмы делают продуктивнее', 'Режим совы не хуже режима жаворонка'],
    ['Деньги действительно приносят счастье', 'Деньги не приносят счастья'],
    ['Искусственный интеллект надо строго регулировать', 'ИИ надо развивать свободно, без жёстких рамок'],
    ['Критика полезнее похвалы', 'Похвала полезнее критики'],
    ['Соцсети приносят больше вреда, чем пользы', 'Соцсети приносят больше пользы, чем вреда'],
    ['Общее образование важнее ранней специализации', 'Ранняя специализация важнее широкого кругозора'],
    ['Электромобили — однозначно будущее транспорта', 'У электромобилей больше минусов, чем принято думать'],
    ['Лучше синица в руках', 'Лучше журавль в небе — рискуй ради большого']
  ];

  var DIFF = {
    easy: { name: 'Лояльный судья', em: '🌱', strict: 'Суди мягко и ободряюще, придирайся минимально.' },
    norm: { name: 'Обычный судья', em: '⚖️', strict: 'Суди честно и сбалансированно.' },
    hard: { name: 'Строгий судья', em: '🔥', strict: 'Суди строго, как придирчивый оппонент на дебатах: за слабые места снижай без поблажек.' }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  var ST = { diff: 'norm', thesis: '', other: '', transcript: '', feedback: '', busy: false, done: true };
  var _rec = { on: false, savedT: null, savedC: null };

  function loadStats() { try { var s = JSON.parse(localStorage.getItem('advokat_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, streak: 0, best: 0, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('advokat_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('advokat_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('advokat_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(score) { var s = loadStats(); s.plays = (s.plays || 0) + 1; if (score > (s.best || 0)) s.best = score; s.streak = score >= 7 ? (s.streak || 0) + 1 : 0; s.last = (s.last || []).concat(score).slice(-10); saveStats(s); return s; }
  function avg(s) { var a = (s && s.last) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }

  function injectCSS() {
    if (document.getElementById('adCSS')) return;
    var s = document.createElement('style'); s.id = 'adCSS';
    s.textContent = [
      '.ad-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.ad-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.ad-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.ad-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.ad-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.ad-ch{font-weight:700;margin-bottom:8px}',
      '.ad-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.ad-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.ad-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.ad-stat b{display:block;font-size:1.35rem;font-weight:800;color:#fb923c}',
      '.ad-stat span{font-size:.72rem;color:#9ca3af}',
      '.ad-rank{border:1px solid rgba(251,146,60,.4);background:linear-gradient(135deg,rgba(251,146,60,.14),rgba(239,68,68,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.ad-rank b{font-size:1.02rem}.ad-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      '.ad-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.ad-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.82rem;font-weight:600;color:#c8ccd4}',
      '.ad-chip.on{border-color:#f97316;background:rgba(251,146,60,.16);color:#fff}',
      '.ad-thesis{border:1px solid rgba(251,146,60,.4);background:linear-gradient(160deg,rgba(251,146,60,.14),rgba(251,146,60,.03));border-radius:16px;padding:20px;margin:0 0 12px;text-align:center}',
      '.ad-thesis .tag{display:block;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fdba74;margin-bottom:8px}',
      '.ad-thesis .th{font-size:1.25rem;font-weight:700;line-height:1.4}',
      '.ad-other{text-align:center;color:#9ca3af;font-size:.9rem;margin:0 0 14px}',
      '.ad-ta{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:12px;padding:12px;font-size:1rem;color:#f2f3f5;font-family:inherit;resize:none;min-height:120px;margin:0 0 10px}',
      '.ad-ta:focus{outline:none;border-color:#f97316}',
      '.ad-microw{display:flex;gap:8px;align-items:center;margin:0 0 10px}',
      '.ad-mic{flex:0 0 46px;height:46px;border-radius:50%;border:none;background:linear-gradient(135deg,#10b981,#0e8f6f);color:#fff;font-size:1.2rem;cursor:pointer}',
      '.ad-mic.rec{background:linear-gradient(135deg,#ef4444,#b91c1c)}.ad-mic.off{opacity:.4}',
      '.ad-miclabel{color:#9ca3af;font-size:.85rem}',
      '.ad-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#f97316,#ef4444);box-shadow:0 8px 22px rgba(249,115,22,.35);margin:0 0 10px}',
      '.ad-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.ad-row{display:flex;gap:10px}.ad-row>*{flex:1;margin-bottom:0}',
      '.ad-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#fb923c}',
      '.ad-verdict{background:linear-gradient(135deg,rgba(251,146,60,.13),rgba(239,68,68,.04));border:1px solid rgba(251,146,60,.4);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6;font-size:.97rem}',
      '.ad-typing{color:#8b93a7;font-size:.92rem;padding:8px 2px}',
      '.ad-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      '[data-theme="light"] .ad-wrap{color:#1f2430}',
      '[data-theme="light"] .ad-lead,[data-theme="light"] .ad-li{color:#4b5566}',
      '[data-theme="light"] .ad-card,[data-theme="light"] .ad-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .ad-secondary,[data-theme="light"] .ad-chip,[data-theme="light"] .ad-ta{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '@media(max-width:560px){.ad-wrap{padding:14px 12px 96px}.ad-thesis .th{font-size:1.1rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function home() {
    injectCSS(); stopVoice(); stopSpeak(); ST.done = true; ST.diff = loadDiff();
    track('feature_opened', { feature: 'advokat' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var a = avg(s), rk = a >= 8.5 ? 'Мастер аргумента ⚖️' : a >= 6.5 ? 'Гибкий ум' : a >= 4 ? 'Учишься смотреть с другой стороны' : 'Разминаешь гибкость';
      statsHtml = '<div class="ad-rank"><b>' + rk + '</b><span>Средний балл ' + (a ? a.toFixed(1) : '—') + ' · гибкость мышления растёт</span></div>' +
        '<div class="ad-stats"><div class="ad-stat"><b>' + s.plays + '</b><span>раундов</span></div><div class="ad-stat"><b>' + (s.streak || 0) + '</b><span>серия ≥7</span></div><div class="ad-stat"><b>' + (s.best || '—') + '</b><span>рекорд</span></div></div>';
    }
    c.innerHTML =
      '<div class="ad-wrap">' +
        '<button class="ad-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="ad-h1">⚖️ Адвокат дьявола</div>' +
        '<div class="ad-lead">Тренажёр гибкости мышления. Фреди даёт тезис — и ты должен <b>убедительно защитить</b> заданную сторону, даже если сам с ней не согласен. Это «стилменинг»: умение построить сильнейшую версию чужой позиции. Кто умеет — тот не в плену своих мнений и видит спор целиком.</div>' +
        statsHtml +
        '<div class="ad-diff">' + DIFF_ORDER.map(function (d) { return '<div class="ad-chip' + (ST.diff === d ? ' on' : '') + '" onclick="ADVOKAT.setDiff(\'' + d + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>'; }).join('') + '</div>' +
        '<div class="ad-card"><div class="ad-ch">Как получить высокий балл</div>' +
          '<div class="ad-li">• Дай <b>2–3 разных довода</b>, а не один повторённый.</div>' +
          '<div class="ad-li">• Приводи примеры и представь, кому и почему это выгодно.</div>' +
          '<div class="ad-li">• Не поддавайся своему мнению — защищай именно заданную сторону честно и сильно.</div></div>' +
        '<button class="ad-primary" onclick="ADVOKAT.start()">▶ Дай тезис</button>' +
        (s.plays ? '' : '<div class="ad-flag">💡 Можно говорить вслух — нажми 🎤, Фреди распознает речь и оценит её.</div>') +
      '</div>';
  }
  function setDiff(d) { if (!DIFF[d]) return; saveDiff(d); vibe(20); home(); }

  function start() {
    injectCSS();
    var pair = shuffle(TOPICS)[0];
    var side = Math.random() < 0.5 ? 0 : 1;
    ST.thesis = pair[side]; ST.other = pair[1 - side];
    ST.transcript = ''; ST.feedback = ''; ST.done = false; ST.busy = false;
    track('game_round_start', { feature: 'advokat', diff: ST.diff });
    renderPlay();
  }

  function renderPlay() {
    var c = container(); if (!c) return;
    var micOff = !(window.voiceManager && typeof window.voiceManager.startRecording === 'function');
    c.innerHTML =
      '<div class="ad-wrap">' +
        '<button class="ad-ghost" onclick="ADVOKAT.home()">← меню</button>' +
        '<div class="ad-thesis"><span class="tag">Защити эту позицию</span><div class="th">«' + esc(ST.thesis) + '»</div></div>' +
        '<div class="ad-other">даже если сам скорее думаешь: «' + esc(ST.other) + '»</div>' +
        '<textarea class="ad-ta" id="adIn" placeholder="Приведи сильнейшие доводы за эту позицию…"></textarea>' +
        '<div class="ad-microw"><button class="ad-mic' + (micOff ? ' off' : '') + '" id="adMic" onclick="ADVOKAT.mic()" title="Говорить вслух">🎤</button><span class="ad-miclabel" id="adMicLabel">' + (micOff ? 'печатай ответ' : 'или наговори вслух') + '</span></div>' +
        '<button class="ad-primary" onclick="ADVOKAT.judge()">⚖️ На суд Фреди</button>' +
        '<button class="ad-secondary" onclick="ADVOKAT.start()">🎲 Другой тезис</button>' +
      '</div>';
  }

  async function judge() {
    if (ST.busy || ST.done) return;
    stopVoice();
    var el = document.getElementById('adIn');
    var arg = ((el ? el.value : '') + ' ' + ST.transcript).trim();
    if (arg.length < 12) { toast('Напиши или наговори довод посильнее', 'info'); return; }
    ST.busy = true; ST.done = true;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="ad-wrap">' +
        '<div class="ad-thesis"><span class="tag">Ты защищал</span><div class="th">«' + esc(ST.thesis) + '»</div></div>' +
        '<div class="ad-card"><div class="ad-ch">Твой довод</div><div style="color:#c8ccd4;white-space:pre-wrap;line-height:1.55">' + esc(arg) + '</div></div>' +
        '<div class="ad-typing" id="adTyping">⚖️ Фреди взвешивает аргумент…</div>' +
        '<div class="ad-row"><button class="ad-primary" onclick="ADVOKAT.start()" style="margin:0">🔁 Новый тезис</button><button class="ad-secondary" onclick="ADVOKAT.home()">Меню</button></div>' +
      '</div>';
    try { var scr = document.getElementById('screenContainer'); if (scr) scr.scrollTop = 0; } catch (e) {}
    var v = '';
    try {
      var p = [
        'Ты — Фреди, судья на тренировке гибкости мышления (игра «Адвокат дьявола»). ' + DIFF[ST.diff].strict,
        'Игрок должен был убедительно защитить позицию: «' + ST.thesis + '» (противоположная ей — «' + ST.other + '»).',
        'Вот его аргументация (расшифровка речи возможна с ошибками — не придирайся к ним): «' + arg + '»',
        'Оцени именно КАЧЕСТВО защиты этой стороны (а не согласен ли ты с ней): убедительность, число разных доводов, примеры, логика.',
        'Ответь по-русски, на «ты», тепло, 4–6 строк:',
        '1) Самый сильный ход в его аргументе (конкретно).',
        '2) Где слабо: повтор, общие слова, упущенный сильный довод — назови этот довод.',
        '3) Один приём, как усилить в следующий раз.',
        '4) ОБЯЗАТЕЛЬНО последней строкой строго: «Сила аргумента: N/10» — целое от 1 до 10.'
      ].join('\n');
      var r = await aiGenerate(p, { max_tokens: 380, temperature: 0.6 });
      v = (r && r.success && r.content) ? String(r.content).trim() : '';
    } catch (e) { v = ''; }
    ST.busy = false;
    var typ = document.getElementById('adTyping');
    if (!v) { if (typ) typ.outerHTML = '<div class="ad-card">Связь подвисла. Но сам себя проверь: дал ли ты 2–3 разных довода с примерами? Если да — засчитай себе сильный раунд и сыграй ещё.</div>'; return; }
    var score = null, m = v.match(/(\d{1,2})\s*\/\s*10/) || v.match(/[Сс]ила[^\d]{0,14}(\d{1,2})/);
    if (m) { score = parseInt(m[1], 10); if (score < 0 || score > 10) score = null; }
    ST.feedback = v.replace(/\s*Сила аргумента:\s*\d{1,2}\s*\/\s*10\.?\s*$/i, '').trim();
    var scoreHtml = '';
    if (score != null) {
      var st = recordScore(score);
      var isRec = st.best === score;
      scoreHtml = '<div class="ad-score">⚖️ Сила аргумента: ' + score + '/10' + (isRec ? ' 🏆 рекорд!' : '') + (score >= 7 && st.streak > 1 ? ' · серия ' + st.streak + ' 🔥' : '') + '</div>';
      if (score >= 8) vibe([40, 40, 40]);
    }
    if (typ) typ.outerHTML = scoreHtml + '<div class="ad-verdict">' + esc(ST.feedback).replace(/\n/g, '<br>') + '</div>';
  }

  // ---------- голос ----------
  function mic() { _rec.on ? stopVoice() : startVoice(); }
  async function startVoice() {
    var el = document.getElementById('adMic'), inp = document.getElementById('adIn'), lbl = document.getElementById('adMicLabel');
    if (!window.voiceManager || typeof window.voiceManager.startRecording !== 'function') { toast('🎤 Голос недоступен в этом браузере', 'info'); return; }
    _rec.savedT = window.voiceManager.onTranscript; _rec.savedC = window.voiceManager.onTranscriptComplete;
    window.voiceManager.sttOnly = true;
    window.voiceManager.onTranscript = function (text) { if (!text || !inp) return; inp.value = inp.value ? (inp.value + ' ' + text) : text; };
    window.voiceManager.onTranscriptComplete = function () {};
    _rec.on = true; if (el) el.classList.add('rec'); if (lbl) lbl.textContent = '🔴 слушаю…';
    vibe(30);
    var ok = await window.voiceManager.startRecording();
    if (!ok) { stopVoice(); toast('🎤 Нет доступа к микрофону', 'error'); }
  }
  function stopVoice() {
    if (!_rec.on) return;
    try { if (window.voiceManager && window.voiceManager.stopRecording) window.voiceManager.stopRecording(); } catch (e) {}
    _rec.on = false; var el = document.getElementById('adMic'); if (el) el.classList.remove('rec');
    var lbl = document.getElementById('adMicLabel'); if (lbl) lbl.textContent = 'или наговори вслух';
    setTimeout(function () { if (window.voiceManager) { if (_rec.savedT !== null) window.voiceManager.onTranscript = _rec.savedT; if (_rec.savedC !== null) window.voiceManager.onTranscriptComplete = _rec.savedC; window.voiceManager.sttOnly = false; _rec.savedT = null; _rec.savedC = null; } }, 500);
  }

  window.ADVOKAT = { home: home, setDiff: setDiff, start: start, judge: judge, mic: mic, getState: function () { return ST; } };
  window.showAdvokatGame = home;
  console.log('✅ advokat.js loaded (игра «Адвокат дьявола»)');
})();
