// ============================================================
// odi.js — «ОДИ: игра всерьёз» — оргдеятельностная игра по
// Г.П. Щедровицкому с Фреди в роли игротехника.
//
// Мультиплеер: хост создаёт игру (тема из списка или своя),
// делится ссылкой-приглашением /fredi/?m=odi&join=КОД, компания
// играет с телефонов. 6 этапов: самоопределение → версии →
// проблематизация → проект → рефлексия → итоговый протокол.
// Синхронизация — поллинг /api/odi/state каждые 3 секунды.
// Бесплатно, без регистрации для приглашённых (вход по имени).
// Экспорт: window.showOdiScreen, window.ODI
// ============================================================
(function () {
  'use strict';

  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || 'https://ffred-ddd989.amvera.io'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  // Фреди разделяет абзацы «||» (бэкенд схлопывает \n)
  function fmtText(s) { return esc(s).replace(/\s*\|\|\s*/g, '<br><br>'); }

  async function call(path, opts) {
    var r = await fetch(api() + path, Object.assign({
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    }, opts || {}));
    var d = null;
    try { d = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error((d && d.detail) || ('Ошибка ' + r.status));
    return d;
  }

  var SITE = 'https://meysternlp.ru';
  var TOPICS = [
    { key: 'buksuem', em: '🌀', title: 'Почему наше общее дело буксует' },
    { key: 'razvitie', em: '🧭', title: 'Куда нам развиваться дальше' },
    { key: 'konflikt', em: '⚡', title: 'Наш повторяющийся конфликт' },
    { key: 'budushee', em: '🏡', title: 'Наше общее будущее' },
    { key: 'dengi', em: '💰', title: 'Деньги в нашей жизни' },
    { key: 'klient', em: '🎯', title: 'Наш продукт глазами клиента' }
  ];
  var STAGE_NAMES = ['Сбор', 'Самоопределение', 'Версии', 'Проблематизация', 'Проект', 'Рефлексия', 'Итог'];

  // ---------- состояние ----------
  var ST = {
    screen: 'home', code: '', token: '', meId: 0, topic: '',
    game: null, members: [], answered: [], msgs: [], lastId: 0,
    timer: null, busy: false, joinCode: '', topicKey: ''
  };

  function loadSess() { try { return JSON.parse(localStorage.getItem('odi_sess') || 'null'); } catch (e) { return null; } }
  function saveSess(s) { try { localStorage.setItem('odi_sess', JSON.stringify(s)); } catch (e) {} }
  function clearSess() { try { localStorage.removeItem('odi_sess'); } catch (e) {} }

  function stopPoll() { if (ST.timer) { clearInterval(ST.timer); ST.timer = null; } }

  // ---------- стили ----------
  function injectCSS() {
    if (document.getElementById('odi-css')) return;
    var st = document.createElement('style'); st.id = 'odi-css';
    st.textContent = [
      '.od-wrap{max-width:680px;margin:0 auto;padding:18px 16px 120px;color:#e7eaf0;font-size:1rem;line-height:1.6}',
      '.od-top{display:flex;justify-content:space-between;align-items:center;color:#8b93a7;font-size:.86rem;margin-bottom:14px;gap:10px}',
      '.od-x{background:none;border:none;color:#8b93a7;font-size:.9rem;cursor:pointer;padding:0;flex-shrink:0}',
      '.od-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:0 0 6px}',
      '.od-sub{color:#aab2c4;margin:0 0 14px}',
      '.od-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px;margin:0 0 12px}',
      '.od-card b{color:#fff;font-weight:600}',
      '.od-ch{font-weight:700;color:#fff;margin-bottom:8px}',
      '.od-in{width:100%;box-sizing:border-box;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;font:15px/1.5 inherit;padding:11px 13px;margin-bottom:10px}',
      '.od-in:focus{outline:none;border-color:#a78bfa}',
      '.od-ta{width:100%;box-sizing:border-box;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;font:15px/1.5 inherit;padding:11px 13px;resize:vertical;min-height:64px}',
      '.od-ta:focus{outline:none;border-color:#a78bfa}',
      '.od-topic{display:block;width:100%;text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:11px 14px;margin:0 0 8px;color:#e7eaf0;font:inherit;font-size:.94rem;cursor:pointer;transition:.15s}',
      '.od-topic.sel{border-color:#a78bfa;background:rgba(167,139,250,.13)}',
      '.od-primary{width:100%;margin-top:12px;padding:14px 16px;border:none;border-radius:12px;background:linear-gradient(135deg,#7c5cff,#a78bfa);color:#fff;font:700 1rem inherit;cursor:pointer}',
      '.od-primary:disabled{opacity:.5;cursor:default}',
      '.od-secondary{width:100%;margin-top:10px;padding:12px 16px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:transparent;color:#cdd4e2;font:600 .95rem inherit;cursor:pointer}',
      '.od-stagebar{display:flex;gap:4px;margin:0 0 10px}',
      '.od-stage{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.14)}',
      '.od-stage.on{background:#a78bfa}',
      '.od-members{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}',
      '.od-mem{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);font-size:.82rem;color:#cdd4e2}',
      '.od-mem.done{border-color:rgba(52,211,153,.5);color:#6ee7b7}',
      '.od-feed{margin:0 0 12px}',
      '.od-msg{margin:0 0 10px;border-radius:14px;padding:12px 14px;font-size:.95rem;line-height:1.6}',
      '.od-msg .who{font-size:.76rem;letter-spacing:.04em;text-transform:uppercase;color:#8b93a7;margin-bottom:5px;font-weight:700}',
      '.od-msg.fredi{background:rgba(124,92,255,.10);border:1px solid rgba(167,139,250,.35);color:#e6e0ff}',
      '.od-msg.fredi .who{color:#b7a5ff}',
      '.od-msg.user{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#dfe4ee}',
      '.od-msg.me{border-color:rgba(52,211,153,.4);background:rgba(52,211,153,.06)}',
      '.od-msg.system{background:none;border:none;color:#8b93a7;font-size:.82rem;text-align:center;padding:4px}',
      '.od-invite{background:rgba(167,139,250,.08);border:1px dashed rgba(167,139,250,.45);border-radius:12px;padding:12px 14px;margin:0 0 12px;text-align:center}',
      '.od-code{font-size:1.6rem;font-weight:800;letter-spacing:.2em;color:#fff;margin:4px 0}',
      '.od-hint{color:#8b93a7;font-size:.85rem;margin:6px 2px}',
      '.od-ask{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);border-radius:12px;padding:11px 13px;margin:0 0 10px;font-size:.9rem;color:#fde8b5}',
      '.od-spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:odspin .7s linear infinite;vertical-align:-2px;margin-right:6px}',
      '@keyframes odspin{to{transform:rotate(360deg)}}',
      '.od-row{display:flex;gap:10px;margin-top:10px}',
      '.od-row>*{flex:1;margin-top:0}',
      '[data-theme="light"] .od-wrap{color:#1d1d1f}',
      '[data-theme="light"] .od-card,[data-theme="light"] .od-topic,[data-theme="light"] .od-msg.user{background:#fff;border-color:rgba(0,0,0,.12);color:#1d1d1f}',
      '[data-theme="light"] .od-card b,[data-theme="light"] .od-ch,[data-theme="light"] .od-code{color:#0b1220}',
      '[data-theme="light"] .od-sub,[data-theme="light"] .od-hint,[data-theme="light"] .od-top{color:#5a6472}',
      '[data-theme="light"] .od-in,[data-theme="light"] .od-ta{background:#f5f7fa;color:#0b1220;border-color:rgba(0,0,0,.15)}',
      '[data-theme="light"] .od-msg.fredi{background:rgba(124,92,255,.07);color:#3b2f66}',
      '[data-theme="light"] .od-topic.sel{background:rgba(124,92,255,.1)}',
      '[data-theme="light"] .od-ask{color:#7a5b00;background:rgba(251,191,36,.12)}',
      '@media(max-width:560px){.od-wrap{padding:14px 12px 120px}.od-h1{font-size:1.3rem}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function copyText(text, okMsg) {
    var done = function () { toast(okMsg || 'Скопировано', 'success'); };
    if (typeof window.copyToClipboard === 'function') { window.copyToClipboard(text).then(done).catch(done); return; }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done).catch(done); return; }
    var el = document.createElement('textarea'); el.value = text;
    el.style.cssText = 'position:fixed;opacity:0;left:-9999px';
    document.body.appendChild(el); el.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(el);
  }

  // ---------- дом ----------
  function home() {
    injectCSS(); stopPoll();
    ST.screen = 'home';
    var c = container(); if (!c) return;
    // приглашение из ссылки /fredi/?m=odi&join=КОД
    var joinFromUrl = '';
    try { joinFromUrl = (new URLSearchParams(location.search).get('join') || '').toUpperCase(); } catch (e) {}
    var sess = loadSess();
    var resume = '';
    if (sess && sess.code && sess.token) {
      resume = '<div class="od-card" style="border-color:rgba(167,139,250,.4)"><div class="od-ch">▶ Твоя игра ' + esc(sess.code) + '</div>' +
        '<div style="color:#aab2c4;font-size:.9rem">«' + esc(sess.topic || 'ОДИ') + '»</div>' +
        '<button class="od-primary" onclick="ODI.resume()">Вернуться в игру</button></div>';
    }
    c.innerHTML =
      '<div class="od-wrap">' +
        '<div class="od-top"><button class="od-x" onclick="ODI.exit()">← К списку игр</button><span>🧠 для компании · бесплатно</span></div>' +
        '<h1 class="od-h1">🧠 ОДИ: игра всерьёз</h1>' +
        '<p class="od-sub">Оргдеятельностная игра по методу Г.П. Щедровицкого. Не спор и не совещание — машина коллективного мышления. Фреди — игротехник: ведёт этапы, атакует слабые версии и собирает из выживших идей общий проект. 30–60 минут, от 2 до 12 человек.</p>' +
        resume +
        '<div class="od-card">' +
          '<div class="od-ch">Создать игру</div>' +
          '<input class="od-in" id="odName" placeholder="Твоё имя" autocomplete="off" maxlength="60">' +
          '<div class="od-hint" style="margin-bottom:8px">Тема — из списка или своя:</div>' +
          TOPICS.map(function (t) { return '<button class="od-topic" id="odT_' + t.key + '" onclick="ODI.pickTopic(\'' + t.key + '\')">' + t.em + ' ' + esc(t.title) + '</button>'; }).join('') +
          '<textarea class="od-ta" id="odCustom" placeholder="…или впиши свою тему: над чем думаем всерьёз?"></textarea>' +
          '<button class="od-primary" id="odCreateBtn" onclick="ODI.create()">Создать и получить ссылку</button>' +
        '</div>' +
        '<div class="od-card">' +
          '<div class="od-ch">Войти по приглашению</div>' +
          '<input class="od-in" id="odJoinCode" placeholder="Код игры (например A1B2C3)" autocomplete="off" maxlength="12" value="' + esc(joinFromUrl) + '" style="text-transform:uppercase">' +
          '<input class="od-in" id="odJoinName" placeholder="Твоё имя" autocomplete="off" maxlength="60">' +
          '<button class="od-primary" onclick="ODI.join()">Войти в игру</button>' +
        '</div>' +
        '<div class="od-card"><div class="od-ch">Как это устроено</div>' +
          '<div style="color:#aab2c4;font-size:.9rem;line-height:1.6">6 этапов: <b>самоопределение</b> (кто ты в теме) → <b>версии</b> (как выглядит ситуация с твоей позиции) → <b>проблематизация</b> (Фреди бьёт по версиям — по идеям, не по людям) → <b>проект</b> (ходы, которые сдвигают) → <b>рефлексия</b> → <b>итоговый протокол</b>. Ведущий переключает этапы, когда все высказались.</div>' +
        '</div>' +
      '</div>';
    if (joinFromUrl) {
      var el = document.getElementById('odJoinName');
      if (el) setTimeout(function () { el.focus(); }, 80);
    }
    track('game_open', { game: 'odi' });
  }

  function pickTopic(key) {
    ST.topicKey = ST.topicKey === key ? '' : key;
    TOPICS.forEach(function (t) {
      var b = document.getElementById('odT_' + t.key);
      if (b) b.className = 'od-topic' + (t.key === ST.topicKey ? ' sel' : '');
    });
  }

  async function create() {
    if (ST.busy) return;
    var name = ((document.getElementById('odName') || {}).value || '').trim();
    var custom = ((document.getElementById('odCustom') || {}).value || '').trim();
    if (!name) { toast('Впиши имя', 'error'); return; }
    if (!ST.topicKey && !custom) { toast('Выбери тему или впиши свою', 'error'); return; }
    ST.busy = true;
    var btn = document.getElementById('odCreateBtn'); if (btn) { btn.disabled = true; btn.innerHTML = '<span class="od-spin"></span>Создаю…'; }
    try {
      var d = await call('/api/odi/create', { method: 'POST', body: JSON.stringify({ name: name, topic_key: ST.topicKey || null, topic_custom: custom || null }) });
      ST.code = d.code; ST.token = d.token; ST.meId = d.member_id; ST.topic = d.topic;
      saveSess({ code: d.code, token: d.token, name: name, topic: d.topic });
      ST.msgs = []; ST.lastId = 0;
      track('odi_create', { topic: ST.topicKey || 'custom' });
      game();
    } catch (e) {
      toast(e.message || 'Не получилось создать', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Создать и получить ссылку'; }
    }
    ST.busy = false;
  }

  async function join() {
    if (ST.busy) return;
    var code = ((document.getElementById('odJoinCode') || {}).value || '').trim().toUpperCase();
    var name = ((document.getElementById('odJoinName') || {}).value || '').trim();
    if (!code) { toast('Впиши код игры', 'error'); return; }
    if (!name) { toast('Впиши имя', 'error'); return; }
    ST.busy = true;
    try {
      var d = await call('/api/odi/join', { method: 'POST', body: JSON.stringify({ code: code, name: name }) });
      ST.code = d.code; ST.token = d.token; ST.meId = d.member_id; ST.topic = d.topic;
      saveSess({ code: d.code, token: d.token, name: name, topic: d.topic });
      ST.msgs = []; ST.lastId = 0;
      track('odi_join', {});
      game();
    } catch (e) { toast(e.message || 'Не получилось войти', 'error'); }
    ST.busy = false;
  }

  function resume() {
    var s = loadSess();
    if (!s) { home(); return; }
    ST.code = s.code; ST.token = s.token; ST.topic = s.topic || '';
    ST.msgs = []; ST.lastId = 0;
    game();
  }

  // ---------- игровой экран ----------
  function game() {
    injectCSS();
    ST.screen = 'game';
    renderShell();
    poll(true);
    stopPoll();
    ST.timer = setInterval(function () { poll(false); }, 3000);
  }

  function renderShell() {
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="od-wrap">' +
        '<div class="od-top"><button class="od-x" onclick="ODI.leave()">← Выйти</button><span id="odStageLbl">🧠 ОДИ · ' + esc(ST.code) + '</span></div>' +
        '<div class="od-stagebar" id="odStagebar"></div>' +
        '<div id="odTopic" style="font-weight:700;color:#fff;margin:0 0 10px;font-size:1.05rem"></div>' +
        '<div class="od-members" id="odMembers"></div>' +
        '<div id="odInvite"></div>' +
        '<div id="odAsk"></div>' +
        '<div class="od-feed" id="odFeed"></div>' +
        '<div id="odInput"></div>' +
        '<div id="odHost"></div>' +
      '</div>';
  }

  async function poll(first) {
    if (ST.screen !== 'game') return;
    var d;
    try {
      d = await call('/api/odi/state/' + encodeURIComponent(ST.code) + '?token=' + encodeURIComponent(ST.token) + '&after=' + ST.lastId, { method: 'GET' });
    } catch (e) {
      if (first) { toast(e.message || 'Игра недоступна', 'error'); clearSess(); stopPoll(); home(); }
      return;
    }
    var stageChanged = !ST.game || ST.game.stage !== d.game.stage || ST.game.busy !== d.game.busy || ST.game.status !== d.game.status;
    var membersChanged = JSON.stringify(ST.members) !== JSON.stringify(d.members) || JSON.stringify(ST.answered) !== JSON.stringify(d.answered);
    ST.game = d.game; ST.members = d.members; ST.answered = d.answered;
    ST.topic = d.game.topic;
    if (d.me) ST.meId = d.me.id;
    ST.isHost = d.me && d.me.is_host;
    var newMsgs = d.messages || [];
    if (newMsgs.length) {
      newMsgs.forEach(function (m) { ST.msgs.push(m); ST.lastId = Math.max(ST.lastId, m.id); });
    }
    if (first || stageChanged || membersChanged) renderMeta();
    if (newMsgs.length || first) renderFeed(newMsgs.length > 0 && !first);
    if (first || stageChanged) { renderInput(); renderHost(); }
  }

  function renderMeta() {
    var g = ST.game; if (!g) return;
    var lbl = document.getElementById('odStageLbl');
    if (lbl) lbl.textContent = '🧠 Этап ' + g.stage + '/6 · ' + (STAGE_NAMES[g.stage] || '');
    var bar = document.getElementById('odStagebar');
    if (bar) {
      var h = '';
      for (var i = 1; i <= 6; i++) h += '<div class="od-stage' + (i <= g.stage ? ' on' : '') + '"></div>';
      bar.innerHTML = h;
    }
    var t = document.getElementById('odTopic');
    if (t) t.textContent = '«' + g.topic + '»';
    var mm = document.getElementById('odMembers');
    if (mm) {
      mm.innerHTML = ST.members.map(function (m) {
        var done = g.stage >= 1 && ST.answered.indexOf(m.id) >= 0;
        return '<span class="od-mem' + (done ? ' done' : '') + '">' + (m.is_host ? '⭐ ' : '') + esc(m.name) + (done ? ' ✓' : '') + '</span>';
      }).join('');
    }
    var inv = document.getElementById('odInvite');
    if (inv) {
      if (g.stage === 0) {
        var link = SITE + '/fredi/?m=odi&join=' + ST.code;
        inv.innerHTML =
          '<div class="od-invite"><div style="color:#b7a5ff;font-size:.82rem">Код игры</div>' +
            '<div class="od-code">' + esc(ST.code) + '</div>' +
            '<div class="od-hint">Отправь ссылку компании — вход без регистрации:</div>' +
            '<div class="od-row">' +
              '<button class="od-secondary" onclick="ODI.copyLink()">🔗 Скопировать ссылку</button>' +
              '<button class="od-secondary" onclick="ODI.copyCode()">Код</button>' +
            '</div>' +
          '</div>';
      } else inv.innerHTML = '';
    }
    var ask = document.getElementById('odAsk');
    if (ask) {
      if (g.status !== 'finished' && g.stage >= 1 && g.stage_ask) {
        ask.innerHTML = '<div class="od-ask">✍️ ' + esc(g.stage_ask) + '</div>';
      } else ask.innerHTML = '';
    }
  }

  function renderFeed(scroll) {
    var f = document.getElementById('odFeed'); if (!f) return;
    f.innerHTML = ST.msgs.map(function (m) {
      if (m.kind === 'system') return '<div class="od-msg system">' + esc(m.text) + '</div>';
      if (m.kind === 'fredi') return '<div class="od-msg fredi"><div class="who">🧙 Фреди · игротехник · ' + esc(STAGE_NAMES[m.stage] || '') + '</div>' + fmtText(m.text) + '</div>';
      var mine = m.member_id === ST.meId;
      return '<div class="od-msg user' + (mine ? ' me' : '') + '"><div class="who">' + esc(m.author) + '</div>' + fmtText(m.text) + '</div>';
    }).join('');
    if (scroll) { try { f.lastElementChild && f.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' }); } catch (e) {} }
  }

  function renderInput() {
    var el = document.getElementById('odInput'); if (!el) return;
    var g = ST.game;
    if (!g || g.status === 'finished' || g.stage < 1) {
      if (g && g.status === 'finished') {
        el.innerHTML =
          '<div class="od-row">' +
            '<button class="od-secondary" onclick="ODI.copyProtocol()">📋 Скопировать итог</button>' +
            '<button class="od-secondary" onclick="ODI.newGame()">Новая игра</button>' +
          '</div>';
      } else el.innerHTML = '';
      return;
    }
    el.innerHTML =
      '<textarea class="od-ta" id="odSay" placeholder="Твой ход на этом этапе…"></textarea>' +
      '<button class="od-primary" id="odSayBtn" onclick="ODI.say()" style="margin-top:8px">Сказать</button>';
  }

  function renderHost() {
    var el = document.getElementById('odHost'); if (!el) return;
    var g = ST.game;
    if (!g || !ST.isHost || g.status === 'finished') { el.innerHTML = ''; return; }
    var nextName = STAGE_NAMES[g.stage + 1] || 'Итог';
    var btnText = g.stage === 0 ? '▶ Начать игру (Фреди откроет её докладом)' : 'Дальше: ' + nextName + ' →';
    if (g.busy) {
      el.innerHTML = '<button class="od-secondary" disabled style="margin-top:10px"><span class="od-spin"></span>Фреди делает ход…</button>';
    } else {
      el.innerHTML =
        '<button class="od-secondary" onclick="ODI.advance()" style="margin-top:10px;border-color:rgba(167,139,250,.5);color:#b7a5ff">' + btnText + '</button>' +
        (g.stage >= 1 ? '<div class="od-hint" style="text-align:center">Переключай, когда все высказались (✓ у имён)</div>' : '');
    }
  }

  async function say() {
    var ta = document.getElementById('odSay');
    var text = (ta && ta.value || '').trim();
    if (!text) { toast('Напиши свой ход', 'error'); return; }
    var btn = document.getElementById('odSayBtn'); if (btn) btn.disabled = true;
    try {
      await call('/api/odi/say', { method: 'POST', body: JSON.stringify({ code: ST.code, token: ST.token, text: text }) });
      if (ta) ta.value = '';
      vibe(15);
      poll(false);
    } catch (e) { toast(e.message || 'Не отправилось', 'error'); }
    if (btn) btn.disabled = false;
  }

  async function advance() {
    if (ST.busy) return;
    ST.busy = true;
    var el = document.getElementById('odHost');
    if (el) el.innerHTML = '<button class="od-secondary" disabled style="margin-top:10px"><span class="od-spin"></span>Фреди делает ход…</button>';
    try {
      await call('/api/odi/advance', { method: 'POST', body: JSON.stringify({ code: ST.code, token: ST.token }) });
      vibe(20);
      track('odi_advance', { stage: (ST.game && ST.game.stage || 0) + 1 });
    } catch (e) { toast(e.message || 'Не переключилось', 'error'); }
    ST.busy = false;
    poll(false);
  }

  function copyLink() { copyText(SITE + '/fredi/?m=odi&join=' + ST.code, 'Ссылка-приглашение скопирована'); }
  function copyCode() { copyText(ST.code, 'Код скопирован'); }
  function copyProtocol() {
    var final = null;
    for (var i = ST.msgs.length - 1; i >= 0; i--) {
      if (ST.msgs[i].kind === 'fredi') { final = ST.msgs[i]; break; }
    }
    var text = 'ОДИ «' + (ST.game && ST.game.topic || '') + '»\n\n' +
      (final ? final.text.replace(/\s*\|\|\s*/g, '\n\n') : '') +
      '\n\n— сыграно с Фреди-игротехником · ' + SITE + '/fredi/';
    copyText(text, 'Итоговый протокол скопирован');
  }

  function newGame() { clearSess(); stopPoll(); ST.msgs = []; ST.lastId = 0; ST.game = null; home(); }
  function leave() {
    stopPoll();
    if (ST.game && ST.game.status === 'finished') clearSess();
    if (window.showKonturScreen) window.showKonturScreen(); else home();
  }
  function exit() { stopPoll(); if (window.showKonturScreen) window.showKonturScreen(); }

  window.ODI = {
    home: home, pickTopic: pickTopic, create: create, join: join, resume: resume,
    say: say, advance: advance, copyLink: copyLink, copyCode: copyCode,
    copyProtocol: copyProtocol, newGame: newGame, leave: leave, exit: exit,
    getState: function () { return ST; }
  };
  window.showOdiScreen = home;
})();
