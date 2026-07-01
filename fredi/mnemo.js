// ============================================
// mnemo.js — Игра «Мнемо». Тренажёр памяти на реальных мнемотехниках.
// Не «запомни как-нибудь», а освой конкретный способ и примени его:
//   🏛️ Дворец памяти  — метод локусов (Симонид Кеосский): образы по знакомым местам.
//   🔗 Цепочка-история — метод связей: слова сшиваются в один абсурдный сюжет.
//   🔢 Числа           — образы цифр (графические коды) + чанкинг (Миллер 7±2).
//   🃏 Пары            — метод ассоциаций: два понятия склеиваются ярким образом.
// Цикл раунда: выучи → применить технику → вспомни (ввод) → честная оценка.
// Голос Фреди (TTS) для проговаривания материала. AI не требуется — проверка точная, локально.
// Экспорт: window.showMnemoGame, window.MNEMO
// ============================================
(function () {
  "use strict";

  // ---------- утилиты ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е').replace(/[^0-9a-zа-я]/g, ''); }
  function digitsOnly(s) { return String(s == null ? '' : s).replace(/[^0-9]/g, ''); }
  function ttsOk() { return !!(window.voiceManager && typeof window.voiceManager.textToSpeech === 'function'); }
  function speak(text) { if (!ttsOk() || !text) return false; try { window.voiceManager.textToSpeech(String(text), window.currentMode || 'basic'); return true; } catch (e) { return false; } }
  function stopSpeak() { try { if (window.voiceManager && typeof window.voiceManager.interrupt === 'function') window.voiceManager.interrupt(); } catch (e) {} }

  // ============================================================
  // КОНТЕНТ-БАНКИ
  // ============================================================
  // Конкретные, легко-образные существительные (для дворца и цепочки).
  var NOUNS = [
    'яблоко', 'гитара', 'слон', 'зонт', 'свеча', 'ключ', 'корабль', 'подушка', 'барабан', 'ананас',
    'робот', 'лягушка', 'шляпа', 'ножницы', 'фонарь', 'кактус', 'чайник', 'велосипед', 'скрипка', 'медведь',
    'ракета', 'тыква', 'зеркало', 'метла', 'якорь', 'гриб', 'колокол', 'паук', 'лампочка', 'топор',
    'книга', 'монета', 'перо', 'мяч', 'замок', 'змея', 'фонтан', 'снеговик', 'компас', 'бабочка',
    'гвоздь', 'арбуз', 'крокодил', 'маяк', 'орех', 'пингвин', 'самокат', 'корона'
  ];

  // Знакомый маршрут по дому — опоры (локусы) для метода локусов.
  var LOCI_ROUTE = [
    'у входной двери', 'на вешалке в прихожей', 'на кухонном столе', 'в холодильнике',
    'на диване в гостиной', 'на экране телевизора', 'на подоконнике', 'на подушке в спальне'
  ];

  // Пары для метода ассоциаций — две проверяемые базы.
  var PAIR_SETS = {
    caps: {
      title: 'Столицы мира', promptLabel: 'Страна', answerLabel: 'Столица',
      hintOne: 'Свяжи страну и столицу ярким образом: например, «Норвегия — Осло»: норка грызёт ОСЛА.',
      pairs: [
        ['Франция', 'Париж'], ['Япония', 'Токио'], ['Египет', 'Каир'], ['Бразилия', 'Бразилиа'],
        ['Австралия', 'Канберра'], ['Канада', 'Оттава'], ['Норвегия', 'Осло'], ['Греция', 'Афины'],
        ['Турция', 'Анкара'], ['Испания', 'Мадрид'], ['Португалия', 'Лиссабон'], ['Польша', 'Варшава'],
        ['Китай', 'Пекин'], ['Финляндия', 'Хельсинки'], ['Швеция', 'Стокгольм'], ['Венгрия', 'Будапешт']
      ]
    },
    eng: {
      title: 'Английские слова', promptLabel: 'English', answerLabel: 'Перевод',
      hintOne: 'Найди созвучие и образ: «bridge — мост»: по мосту едет БРИЧКА; «feather — перо»: ФЕ­дя держит перо.',
      pairs: [
        ['apple', 'яблоко'], ['table', 'стол'], ['window', 'окно'], ['bridge', 'мост'],
        ['river', 'река'], ['mountain', 'гора'], ['garden', 'сад'], ['letter', 'письмо'],
        ['morning', 'утро'], ['feather', 'перо'], ['candle', 'свеча'], ['mirror', 'зеркало'],
        ['thunder', 'гром'], ['honey', 'мёд'], ['needle', 'игла'], ['shadow', 'тень']
      ]
    }
  };

  // Графические образы цифр — на что похожа цифра (для запоминания чисел).
  var DIGIT_SHAPES = [
    ['0', 'колесо / яйцо'], ['1', 'свеча / столб'], ['2', 'лебедь'], ['3', 'чайка / усы'],
    ['4', 'парус / стул'], ['5', 'крючок / серп'], ['6', 'вишенка на ножке'], ['7', 'коса / топор'],
    ['8', 'снеговик / матрёшка'], ['9', 'головастик / шарик на нитке']
  ];

  // ============================================================
  // РЕЖИМЫ
  // ============================================================
  var MODES = {
    loci: {
      emoji: '🏛️', name: 'Дворец памяти', tech: 'Метод локусов',
      lead: 'Древнейшая техника (её приписывают поэту Симониду). Ты «раскладываешь» слова по знакомым местам своего дома, а вспоминаешь — мысленно проходя маршрут. Мозг силён в пространстве — этим и пользуемся.'
    },
    story: {
      emoji: '🔗', name: 'Цепочка-история', tech: 'Метод связей',
      lead: 'Сшей все слова в одну абсурдную историю, где каждое цепляется за следующее. Чем нелепее и ярче картинка — тем крепче держится. Вспоминаешь, «просматривая» сюжет.'
    },
    numbers: {
      emoji: '🔢', name: 'Числа', tech: 'Образы цифр + чанкинг',
      lead: 'Цифры абстрактны — превращаем их в картинки (на что похожа цифра) и режем длинное число на группы по 3 (чанкинг, магическое 7±2 Миллера). Из образов лепим мини-сценку.'
    },
    pairs: {
      emoji: '🃏', name: 'Пары', tech: 'Метод ассоциаций',
      lead: 'Два понятия (страна–столица, слово–перевод) склеиваются одним ярким образом через созвучие. Так учат иностранные слова, имена, термины.'
    }
  };
  var MODE_ORDER = ['loci', 'story', 'numbers', 'pairs'];

  // сложность: сколько элементов и сколько секунд на запоминание
  var DIFF = {
    easy: { name: 'Разминка', em: '🌱' },
    norm: { name: 'Норма', em: '⚖️' },
    hard: { name: 'Челлендж', em: '🔥' }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];
  var CFG = {
    loci:    { count: { easy: 5, norm: 6, hard: 8 },  per: { easy: 8, norm: 6, hard: 4 } },
    story:   { count: { easy: 6, norm: 8, hard: 12 }, per: { easy: 7, norm: 5, hard: 3.5 } },
    numbers: { count: { easy: 8, norm: 12, hard: 16 },per: { easy: 4, norm: 3, hard: 2 } },
    pairs:   { count: { easy: 5, norm: 6, hard: 8 },  per: { easy: 9, norm: 7, hard: 5 } }
  };

  // ---------- состояние ----------
  var ST = { mode: null, diff: 'norm', material: null, memSec: 0, tick: null, t0: 0, phase: 'idle' };

  // ============================================================
  // ПРОГРЕСС / ОЧКИ
  // ============================================================
  function loadStats() { try { var s = JSON.parse(localStorage.getItem('mnemo_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {} return { plays: 0, scored: 0, streak: 0, best: {}, last: [] }; }
  function saveStats(s) { try { localStorage.setItem('mnemo_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('mnemo_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('mnemo_diff', d); } catch (e) {} ST.diff = d; }
  function recordScore(mode, score, pct) {
    var s = loadStats();
    s.plays = (s.plays || 0) + 1; s.scored = (s.scored || 0) + 1;
    if (!s.best) s.best = {};
    if (!s.best[mode] || score > s.best[mode]) s.best[mode] = score;
    s.streak = score >= 7 ? (s.streak || 0) + 1 : 0;
    s.last = (s.last || []).concat(score).slice(-10);
    saveStats(s);
    return s;
  }
  function avgScore(s) { var a = (s && s.last) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
  function rank(s) {
    if (!s || !s.scored) return { t: 'Новичок памяти', sub: 'Пройди первый раунд — и техника начнёт формироваться' };
    var a = avgScore(s);
    if (a >= 9) return { t: '🏆 Мастер памяти', sub: 'Техники работают на автомате. Ты помнишь то, что другие записывают' };
    if (a >= 7.5) return { t: '🧠 Сильная память', sub: 'Образы яркие, маршруты держатся. Поднимай сложность' };
    if (a >= 5) return { t: '🌿 Память крепнет', sub: 'Техника пошла. Делай образы абсурднее — будет цепче' };
    return { t: '🌱 Учишься удерживать', sub: 'Главное — применяешь способ, а не зубришь. Так и куётся навык' };
  }

  // ============================================================
  // CSS
  // ============================================================
  function injectCSS() {
    if (document.getElementById('mnCSS')) return;
    var s = document.createElement('style'); s.id = 'mnCSS';
    s.textContent = [
      '.mn-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.mn-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.mn-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.mn-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.mn-ghost:hover{color:#c8ccd4}',
      '.mn-btn{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border-radius:16px;padding:18px;margin:0 0 12px;color:#f2f3f5;cursor:pointer;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}',
      '.mn-btn:hover{transform:translateY(-2px);border-color:rgba(16,185,129,.5);box-shadow:0 10px 26px rgba(0,0,0,.28)}',
      '.mn-btn .em{font-size:1.5rem;margin-right:8px;vertical-align:-2px}',
      '.mn-btn b{font-size:1.06rem;font-weight:700}',
      '.mn-btn .tech{float:right;font-size:.72rem;font-weight:700;color:#6ee7b7;background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.3);border-radius:20px;padding:3px 9px}',
      '.mn-btn .rec{float:right;clear:right;margin-top:6px;font-size:.72rem;font-weight:700;color:#facc15}',
      '.mn-btn small{display:block;margin-top:8px;color:#a7adba;font-size:.9rem;line-height:1.5}',
      '.mn-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.mn-ch{font-weight:700;margin-bottom:8px;color:#f2f3f5}',
      '.mn-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.mn-tbl{width:100%;border-collapse:collapse;margin:6px 0 2px;font-size:.92rem}',
      '.mn-tbl td{padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top;color:#c8ccd4}',
      '.mn-tbl td:first-child{white-space:nowrap;font-weight:700;color:#f2f3f5;width:1%;padding-right:14px}',
      // статистика
      '.mn-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.mn-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.mn-stat b{display:block;font-size:1.35rem;font-weight:800;color:#6ee7b7}',
      '.mn-stat span{font-size:.72rem;color:#9ca3af}',
      '.mn-rank{border:1px solid rgba(16,185,129,.4);background:linear-gradient(135deg,rgba(16,185,129,.14),rgba(14,165,233,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.mn-rank b{font-size:1.02rem}.mn-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      // сложность-чипы
      '.mn-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.mn-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4;transition:border-color .15s ease}',
      '.mn-chip.on{border-color:#10b981;background:rgba(16,185,129,.16);color:#fff}',
      // элементы для запоминания
      '.mn-items{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0 14px}',
      '.mn-item{border:1px solid rgba(16,185,129,.35);background:rgba(16,185,129,.08);border-radius:12px;padding:12px 14px;font-size:1.05rem;font-weight:600;flex:1 1 140px;text-align:center}',
      '.mn-loci{display:flex;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);border-radius:12px;padding:12px 14px;margin:0 0 10px}',
      '.mn-loci .place{flex:1;color:#a7adba;font-size:.92rem}',
      '.mn-loci .word{font-size:1.1rem;font-weight:700;color:#6ee7b7}',
      '.mn-loci .n{width:26px;height:26px;flex:0 0 26px;border-radius:50%;background:rgba(16,185,129,.2);color:#6ee7b7;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:.85rem}',
      '.mn-num{font-size:2rem;font-weight:800;letter-spacing:.12em;text-align:center;font-variant-numeric:tabular-nums;margin:8px 0 12px;color:#6ee7b7}',
      '.mn-num small{display:inline-block;margin:0 6px}',
      // таймер
      '.mn-timer{text-align:center;font-size:1.9rem;font-weight:800;font-variant-numeric:tabular-nums;margin:6px 0 4px}',
      '.mn-timer.warn{color:#f59e0b}.mn-timer.hot{color:#ef4444}',
      '.mn-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 14px}',
      '.mn-bar i{display:block;height:100%;background:linear-gradient(90deg,#10b981,#0ea5e9);transition:width .25s linear}',
      // ввод при вспоминании
      '.mn-field{margin:0 0 10px}',
      '.mn-field label{display:block;font-size:.85rem;color:#a7adba;margin-bottom:4px}',
      '.mn-inp{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);border-radius:10px;padding:12px 12px;font-size:1rem;color:#f2f3f5;font-family:inherit}',
      '.mn-inp:focus{outline:none;border-color:#10b981}',
      // результат
      '.mn-res{display:flex;align-items:center;gap:10px;border-radius:10px;padding:10px 12px;margin:0 0 8px;font-size:.95rem}',
      '.mn-res.ok{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.35)}',
      '.mn-res.no{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.32)}',
      '.mn-res .mk{font-size:1.1rem}',
      '.mn-res .corr{color:#f87171;font-size:.85rem;margin-left:auto;text-align:right}',
      '.mn-score{text-align:center;font-size:1.15rem;font-weight:800;margin:0 0 12px;color:#6ee7b7}',
      // кнопки
      '.mn-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#10b981,#0ea5e9);box-shadow:0 8px 22px rgba(16,185,129,.4);margin:0 0 10px;transition:transform .15s ease}',
      '.mn-primary:hover{transform:translateY(-1px)}.mn-primary:active{transform:scale(.98)}',
      '.mn-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.mn-secondary:hover{border-color:rgba(255,255,255,.28)}',
      '.mn-row{display:flex;gap:10px}.mn-row>*{flex:1;margin-bottom:0}',
      '.mn-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      // светлая тема
      '[data-theme="light"] .mn-wrap{color:#1f2430}',
      '[data-theme="light"] .mn-lead{color:#4b5566}',
      '[data-theme="light"] .mn-btn{background:#fff;border-color:rgba(0,0,0,.08);color:#1f2430;box-shadow:0 2px 10px rgba(0,0,0,.05)}',
      '[data-theme="light"] .mn-btn small{color:#6b7280}',
      '[data-theme="light"] .mn-card,[data-theme="light"] .mn-stat,[data-theme="light"] .mn-loci{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .mn-ch,[data-theme="light"] .mn-tbl td:first-child{color:#1f2430}',
      '[data-theme="light"] .mn-li,[data-theme="light"] .mn-tbl td,[data-theme="light"] .mn-loci .place{color:#4b5566}',
      '[data-theme="light"] .mn-inp{background:#f7f8fa;border-color:rgba(0,0,0,.12);color:#1f2430}',
      '[data-theme="light"] .mn-secondary,[data-theme="light"] .mn-chip{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .mn-item{background:rgba(16,185,129,.08);color:#0f766e}',
      // моб
      '@media(max-width:560px){.mn-wrap{padding:14px 12px 96px}.mn-h1{font-size:1.3rem}.mn-btn{padding:16px}.mn-num{font-size:1.6rem}.mn-item{flex-basis:110px;font-size:.98rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ============================================================
  // ХАБ ИГРЫ
  // ============================================================
  function home() {
    injectCSS();
    stopAll();
    ST.diff = loadDiff();
    track('feature_opened', { feature: 'mnemo' });
    var c = container(); if (!c) return;
    var s = loadStats(), statsHtml = '';
    if (s.plays) {
      var rk = rank(s), av = avgScore(s);
      statsHtml =
        '<div class="mn-rank"><b>' + esc(rk.t) + '</b><span>' + esc(rk.sub) + '</span></div>' +
        '<div class="mn-stats">' +
          '<div class="mn-stat"><b>' + s.plays + '</b><span>раундов</span></div>' +
          '<div class="mn-stat"><b>' + (s.streak || 0) + '</b><span>серия ≥7</span></div>' +
          '<div class="mn-stat"><b>' + (av ? av.toFixed(1) : '—') + '</b><span>ср. балл</span></div>' +
        '</div>';
    }
    var modesHtml = MODE_ORDER.map(function (k) {
      var m = MODES[k], best = s.best && s.best[k];
      return '<button class="mn-btn" onclick="MNEMO.intro(\'' + k + '\')">' +
        '<span class="tech">' + esc(m.tech) + '</span>' +
        (best ? '<span class="rec">★ рекорд ' + best + '/10</span>' : '') +
        '<span class="em">' + m.emoji + '</span><b>' + esc(m.name) + '</b>' +
        '<small>' + esc(m.lead) + '</small></button>';
    }).join('');
    c.innerHTML =
      '<div class="mn-wrap">' +
        '<button class="mn-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="mn-h1">🧠 Мнемо — тренажёр памяти</div>' +
        '<div class="mn-lead">Память — это навык, а не «дар». Здесь ты не зубришь, а осваиваешь конкретные мнемотехники, которыми пользуются чемпионы памяти: раскладываешь образы по дворцу памяти, сшиваешь слова в историю, превращаешь цифры в картинки. Каждый раунд: <b>выучи → примени технику → вспомни → честная оценка</b>.</div>' +
        statsHtml +
        '<button class="mn-secondary" onclick="MNEMO.theory()">📚 Как это работает: наука памяти</button>' +
        modesHtml +
        (s.plays ? '' : '<div class="mn-flag">💡 Секрет всех техник: образ должен быть ярким, движущимся и абсурдным. Скучное не запоминается.</div>') +
      '</div>';
  }

  function theory() {
    injectCSS();
    var c = container(); if (!c) return;
    var shapes = DIGIT_SHAPES.map(function (d) { return '<tr><td>' + d[0] + '</td><td>' + esc(d[1]) + '</td></tr>'; }).join('');
    c.innerHTML =
      '<div class="mn-wrap">' +
        '<button class="mn-ghost" onclick="MNEMO.home()">← Назад</button>' +
        '<div class="mn-h1">Как работает память</div>' +
        '<div class="mn-card"><div class="mn-ch">Три опоры мнемоники</div>' +
          '<div class="mn-li">1. <b>Образ вместо слова.</b> Мозг помнит картинки лучше слов (эффект превосходства образа). Любую абстракцию переводим в яркую сцену.</div>' +
          '<div class="mn-li">2. <b>Пространство.</b> Пространственная память необычайно сильна — метод локусов (дворец памяти) превращает список в маршрут по знакомым местам. Технику приписывают поэту Симониду Кеосскому; ей больше двух тысяч лет.</div>' +
          '<div class="mn-li">3. <b>Связь.</b> Разрозненное не держится — сцепляем элементы в историю или пару, где одно тянет за собой другое.</div>' +
        '</div>' +
        '<div class="mn-card"><div class="mn-ch">Почему числа такие трудные</div>' +
          'Кратковременная память удерживает лишь несколько единиц зараз (Джордж Миллер, 1956: «магическое число 7±2»; по более поздним данным — ближе к 4). Спасение — <b>чанкинг</b>: режем длинное число на группы по 3 и каждой группе даём образ. Цифры превращаем в картинки по форме:</div>' +
        '<div class="mn-card"><table class="mn-tbl"><tbody>' + shapes + '</tbody></table>' +
          '<div class="mn-li" style="color:#9ca3af;font-size:.85rem;margin-top:6px">Пример: 314 → «чайка (3) на парусе (4)… нет, 3-1-4: усы, свеча, стул» — слепи из образов короткую сценку.</div></div>' +
        '<div class="mn-card" style="border-color:rgba(16,185,129,.4)"><div class="mn-ch">Что закрепляет надолго</div>' +
          'Один раз запомнить мало — работает <b>интервальное повторение</b> (борьба с кривой забывания Эббингауза): повтори через час, через день, через неделю. Игра даёт первый — самый важный — навык кодирования; повторяй сильные образы, и они останутся.</div>' +
        '<button class="mn-primary" onclick="MNEMO.home()">К режимам →</button>' +
      '</div>';
  }

  // ============================================================
  // ГЕНЕРАЦИЯ МАТЕРИАЛА
  // ============================================================
  function genMaterial(mode, diff) {
    var n = CFG[mode].count[diff];
    if (mode === 'loci') {
      return { items: shuffle(NOUNS).slice(0, n), spots: LOCI_ROUTE.slice(0, n) };
    }
    if (mode === 'story') {
      return { items: shuffle(NOUNS).slice(0, n) };
    }
    if (mode === 'numbers') {
      var d = ''; for (var i = 0; i < n; i++) d += String(rnd(10));
      return { digits: d };
    }
    // pairs
    var key = rnd(2) === 0 ? 'caps' : 'eng';
    var set = PAIR_SETS[key];
    return { setKey: key, set: set, pairs: shuffle(set.pairs).slice(0, n) };
  }
  function memSeconds(mode, diff) {
    var n = CFG[mode].count[diff], per = CFG[mode].per[diff];
    return Math.round((mode === 'numbers' ? digitsCount(diff) : n) * per);
    function digitsCount() { return CFG.numbers.count[diff]; }
  }

  // ============================================================
  // ЭКРАН — ИНТРО РЕЖИМА (техника + сложность + старт)
  // ============================================================
  function intro(mode) {
    injectCSS();
    stopAll();
    var m = MODES[mode]; if (!m) return;
    ST.mode = mode; ST.phase = 'intro';
    if (!DIFF[ST.diff]) ST.diff = loadDiff();
    var n = CFG[mode].count[ST.diff];
    var sec = memSeconds(mode, ST.diff);
    var howList = {
      loci: ['Возьми знакомый маршрут по дому (он уже готов ниже).', 'Каждое слово ярко «положи» в своё место: пусть слон сидит на кухонном столе и ест лампочку.', 'Вспоминая — мысленно пройди маршрут по порядку.'],
      story: ['Сшей слова в одну историю в том же порядке.', 'Каждое слово пусть действует со следующим: абсурдно, крупно, в движении.', 'Вспоминая — «прокрути» историю от начала.'],
      numbers: ['Разбей число на группы по 3 (чанкинг).', 'Каждую цифру представь картинкой по форме (см. подсказку), слепи из группы сценку.', 'Вспоминая — раскодируй сценки обратно в цифры.'],
      pairs: ['Для каждой пары найди созвучие и один яркий образ, где оба слова встречаются.', 'Чем нелепее склейка — тем крепче.', 'Вспоминая — по первому слову всплывёт образ, а с ним и второе.']
    }[mode];
    var diffHtml = DIFF_ORDER.map(function (dk) {
      return '<div class="mn-chip' + (ST.diff === dk ? ' on' : '') + '" onclick="MNEMO.setDiff(\'' + dk + '\',\'' + mode + '\')">' + DIFF[dk].em + ' ' + esc(DIFF[dk].name) + '</div>';
    }).join('');
    var whatUnit = mode === 'numbers' ? (CFG.numbers.count[ST.diff] + ' цифр') : mode === 'pairs' ? (n + ' пар') : (n + ' слов');
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="mn-wrap">' +
        '<button class="mn-ghost" onclick="MNEMO.home()">← К режимам</button>' +
        '<div class="mn-h1">' + m.emoji + ' ' + esc(m.name) + '</div>' +
        '<div class="mn-lead" style="margin-bottom:12px">' + esc(m.lead) + '</div>' +
        '<div class="mn-card"><div class="mn-ch">Как играть этой техникой</div>' +
          howList.map(function (x, i) { return '<div class="mn-li">' + (i + 1) + '. ' + esc(x) + '</div>'; }).join('') + '</div>' +
        '<div class="mn-diff">' + diffHtml + '</div>' +
        '<div class="mn-card" style="text-align:center;color:#a7adba;font-size:.92rem">Запомнить: <b style="color:#6ee7b7">' + whatUnit + '</b> · на запоминание <b style="color:#6ee7b7">' + sec + ' сек</b></div>' +
        '<button class="mn-primary" onclick="MNEMO.memorize()">▶ Показать материал</button>' +
      '</div>';
  }
  function setDiff(d, mode) { if (!DIFF[d]) return; saveDiff(d); vibe(20); intro(mode); }

  // ============================================================
  // ЭКРАН — ЗАПОМИНАНИЕ
  // ============================================================
  function memorize() {
    var mode = ST.mode, m = MODES[mode]; if (!m) return;
    ST.material = genMaterial(mode, ST.diff);
    ST.memSec = memSeconds(mode, ST.diff);
    ST.phase = 'memorize'; ST.t0 = Date.now();
    track('mnemo_memorize', { feature: 'mnemo', mode: mode, diff: ST.diff });

    var body = '', speakText = '';
    if (mode === 'loci') {
      body = ST.material.items.map(function (w, i) {
        return '<div class="mn-loci"><div class="n">' + (i + 1) + '</div><div class="place">' + esc(ST.material.spots[i]) + '</div><div class="word">' + esc(w) + '</div></div>';
      }).join('');
      speakText = ST.material.items.map(function (w, i) { return ST.material.spots[i] + ' — ' + w; }).join('. ');
    } else if (mode === 'story') {
      body = '<div class="mn-items">' + ST.material.items.map(function (w, i) { return '<div class="mn-item">' + (i + 1) + '. ' + esc(w) + '</div>'; }).join('') + '</div>';
      speakText = ST.material.items.join(', ');
    } else if (mode === 'numbers') {
      var d = ST.material.digits, groups = [];
      for (var i = 0; i < d.length; i += 3) groups.push(d.slice(i, i + 3));
      body = '<div class="mn-num">' + groups.map(function (g) { return '<small>' + g + '</small>'; }).join('') + '</div>' +
        '<div class="mn-card"><div class="mn-ch">Образы цифр</div><table class="mn-tbl"><tbody>' +
        DIGIT_SHAPES.map(function (x) { return '<tr><td>' + x[0] + '</td><td>' + esc(x[1]) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      speakText = groups.join('. ');
    } else {
      body = ST.material.pairs.map(function (p, i) {
        return '<div class="mn-loci"><div class="n">' + (i + 1) + '</div><div class="place">' + esc(p[0]) + '</div><div class="word">' + esc(p[1]) + '</div></div>';
      }).join('');
      body = '<div class="mn-card" style="color:#a7adba;font-size:.9rem">💡 ' + esc(ST.material.set.hintOne) + '</div>' + body;
      speakText = ST.material.pairs.map(function (p) { return p[0] + ' — ' + p[1]; }).join('. ');
    }
    ST._speak = speakText;

    var mm = Math.floor(ST.memSec / 60), ss = ST.memSec % 60;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="mn-wrap">' +
        '<div class="mn-h1" style="font-size:1.2rem">' + m.emoji + ' Запоминай — ' + esc(m.name) + '</div>' +
        '<div class="mn-timer" id="mnTimer">' + mm + ':' + ('0' + ss).slice(-2) + '</div>' +
        '<div class="mn-bar"><i id="mnBar" style="width:100%"></i></div>' +
        body +
        (ttsOk() ? '<button class="mn-secondary" onclick="MNEMO.sayMaterial()">🔊 Прочитать вслух</button>' : '') +
        '<button class="mn-primary" onclick="MNEMO.recall()">✅ Запомнил — проверить меня</button>' +
      '</div>';
    startTimer();
  }
  function sayMaterial() { if (!speak(ST._speak)) toast('🔊 Озвучка недоступна', 'info'); }

  function startTimer() {
    if (ST.tick) clearInterval(ST.tick);
    ST.tick = setInterval(function () {
      var el = Math.floor((Date.now() - ST.t0) / 1000);
      var left = Math.max(0, ST.memSec - el);
      var t = document.getElementById('mnTimer'), bar = document.getElementById('mnBar');
      if (t) { t.textContent = Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2); t.className = 'mn-timer' + (left <= 5 ? ' hot' : (left <= 10 ? ' warn' : '')); }
      if (bar) bar.style.width = (ST.memSec ? (left / ST.memSec * 100) : 0) + '%';
      if (left <= 0) { toast('⏱ Время вышло — вспоминаем!', 'info'); vibe([60, 40, 60]); recall(); }
    }, 250);
  }

  // ============================================================
  // ЭКРАН — ВСПОМИНАНИЕ (ввод)
  // ============================================================
  function recall() {
    if (ST.phase === 'recall') return;
    if (ST.tick) { clearInterval(ST.tick); ST.tick = null; }
    stopSpeak();
    ST.phase = 'recall';
    var mode = ST.mode, m = MODES[mode], mat = ST.material;
    var body = '';
    if (mode === 'loci') {
      body = mat.spots.map(function (sp, i) {
        return '<div class="mn-field"><label>' + (i + 1) + '. Что лежало ' + esc(sp) + '?</label><input class="mn-inp" id="mnIn' + i + '" autocomplete="off" autocapitalize="off"></div>';
      }).join('');
    } else if (mode === 'story') {
      body = mat.items.map(function (_, i) {
        return '<div class="mn-field"><label>Слово ' + (i + 1) + '</label><input class="mn-inp" id="mnIn' + i + '" autocomplete="off" autocapitalize="off"></div>';
      }).join('');
    } else if (mode === 'numbers') {
      body = '<div class="mn-field"><label>Введи всё число (цифры подряд, пробелы можно)</label><input class="mn-inp" id="mnNum" inputmode="numeric" autocomplete="off" style="font-size:1.3rem;letter-spacing:.1em;text-align:center"></div>';
    } else {
      body = mat.pairs.map(function (p, i) {
        return '<div class="mn-field"><label>' + esc(mat.set.promptLabel) + ': <b style="color:#6ee7b7">' + esc(p[0]) + '</b> → ' + esc(mat.set.answerLabel) + '?</label><input class="mn-inp" id="mnIn' + i + '" autocomplete="off" autocapitalize="off"></div>';
      }).join('');
    }
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="mn-wrap">' +
        '<div class="mn-h1" style="font-size:1.2rem">✍️ Вспоминай — ' + esc(m.name) + '</div>' +
        '<div class="mn-lead" style="margin-bottom:14px">' + (mode === 'loci' ? 'Мысленно пройди маршрут и впиши, что где лежало.' : mode === 'story' ? 'Прокрути историю и впиши слова по порядку.' : mode === 'numbers' ? 'Раскодируй свои сценки обратно в цифры.' : 'По первому слову вспомни образ — и второе слово.') + '</div>' +
        body +
        '<button class="mn-primary" onclick="MNEMO.check()">Проверить →</button>' +
      '</div>';
    var first = document.getElementById('mnIn0') || document.getElementById('mnNum');
    if (first && first.focus) { try { first.focus(); } catch (e) {} }
  }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '') : ''; }

  // ============================================================
  // ЭКРАН — РЕЗУЛЬТАТ (точная проверка + очки)
  // ============================================================
  function check() {
    if (ST.phase !== 'recall') return;
    ST.phase = 'result';
    var mode = ST.mode, m = MODES[mode], mat = ST.material;
    var rows = [], correct = 0, total = 0;

    if (mode === 'numbers') {
      var got = digitsOnly(val('mnNum')), exp = mat.digits;
      total = exp.length;
      for (var i = 0; i < exp.length; i++) if (got[i] === exp[i]) correct++;
      var gd = '', ed = '';
      for (var j = 0; j < exp.length; j++) {
        var okc = got[j] === exp[j];
        gd += '<span style="color:' + (okc ? '#6ee7b7' : '#f87171') + '">' + (got[j] || '·') + '</span>';
        ed += exp[j];
        if ((j + 1) % 3 === 0) { gd += '&nbsp;'; ed += ' '; }
      }
      rows.push('<div class="mn-res ' + (correct === total ? 'ok' : 'no') + '"><span>Ты ввёл:&nbsp;</span><span style="letter-spacing:.08em">' + gd + '</span></div>');
      rows.push('<div class="mn-res ok"><span>Верно:&nbsp;&nbsp;&nbsp;&nbsp;</span><span style="letter-spacing:.08em;color:#6ee7b7">' + esc(ed.trim()) + '</span></div>');
    } else {
      var list = mode === 'pairs' ? mat.pairs.map(function (p) { return { q: p[0], a: p[1] }; })
              : mode === 'loci' ? mat.items.map(function (w, i) { return { q: mat.spots[i], a: w }; })
              : mat.items.map(function (w, i) { return { q: 'Слово ' + (i + 1), a: w }; });
      total = list.length;
      list.forEach(function (it, i) {
        var got = val('mnIn' + i), ok = norm(got) !== '' && norm(got) === norm(it.a);
        if (ok) correct++;
        rows.push('<div class="mn-res ' + (ok ? 'ok' : 'no') + '"><span class="mk">' + (ok ? '✅' : '❌') + '</span>' +
          '<span>' + (mode === 'pairs' ? esc(it.q) + ' → ' : '') + '<b>' + esc(got || '—') + '</b></span>' +
          (ok ? '' : '<span class="corr">верно: ' + esc(it.a) + '</span>') + '</div>');
      });
    }

    var pct = total ? Math.round(correct / total * 100) : 0;
    var score = Math.max(0, Math.min(10, Math.round(pct / 10)));
    var st = recordScore(mode, score, pct);
    var isRec = st.best[mode] === score && score > 0;
    var line = pct === 100 ? 'Идеально! 🎯' : pct >= 70 ? 'Крепко держится 💪' : pct >= 40 ? 'Уже кое-что — усиль образы' : 'Образы были слабые. Сделай их ярче и абсурднее';
    if (score >= 8) vibe([40, 40, 40]);

    var tip = {
      loci: 'Совет: если место «потерялось» — образ был спокойным. Заставь слово ДЕЙСТВОВАТь в этом месте: пусть слон ломает кухонный стол.',
      story: 'Совет: провалы там, где связь между словами была вялой. Пусть каждое слово физически сталкивается со следующим.',
      numbers: 'Совет: держи ровно 3 цифры в группе и делай из них одну сценку — так группа помнится как один образ.',
      pairs: 'Совет: если пара не всплыла — не хватило созвучия. Найди в слове знакомый корень или похожее звучание.'
    }[mode];

    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="mn-wrap">' +
        '<div class="mn-h1" style="font-size:1.2rem">' + m.emoji + ' Результат — ' + esc(m.name) + '</div>' +
        '<div class="mn-score">Вспомнил ' + correct + ' из ' + total + ' · ' + pct + '% · память ' + score + '/10' + (isRec ? ' 🏆 рекорд!' : '') + (score >= 7 && st.streak > 1 ? ' · серия ' + st.streak + ' 🔥' : '') + '</div>' +
        '<div class="mn-card" style="text-align:center;color:#c8ccd4">' + esc(line) + '</div>' +
        rows.join('') +
        '<div class="mn-card" style="color:#a7adba;font-size:.9rem;margin-top:8px">💡 ' + esc(tip) + '</div>' +
        '<div class="mn-row">' +
          '<button class="mn-primary" onclick="MNEMO.intro(\'' + mode + '\')">🔁 Ещё раунд</button>' +
          '<button class="mn-secondary" onclick="MNEMO.home()">К режимам</button>' +
        '</div>' +
      '</div>';
    try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {}
    track('mnemo_result', { feature: 'mnemo', mode: mode, diff: ST.diff, pct: pct, score: score });
  }

  // ---------- служебное ----------
  function stopAll() { if (ST.tick) { clearInterval(ST.tick); ST.tick = null; } stopSpeak(); }

  // ---------- экспорт ----------
  window.MNEMO = {
    home: home, theory: theory, intro: intro, setDiff: setDiff,
    memorize: memorize, sayMaterial: sayMaterial, recall: recall, check: check,
    getState: function () { return ST; }
  };
  window.showMnemoGame = home;
  console.log('✅ mnemo.js loaded (игра «Мнемо»: тренажёр памяти)');
})();
