// ============================================
// dvapotoka.js — Игра «Два потока».
// Тренажёр двух уровней мышления вслух:
//   Уровень 1 — беглость и пересказ (быстрое, автоматическое — Система 1 по Канеману);
//   Уровень 2 — порождение нового на ходу (медленное усилие — Система 2 / продуктивное мышление).
// Суть: начать говорить РАНЬШЕ, чем придумал конец, и думать в процессе речи.
// 4 режима: Эхо · Экспромт · Сказка-конструктор · Двойная нагрузка.
// Фишки: голос Фреди (TTS), очки «потока» с рекордами и сериями, 3 уровня сложности,
//        обратный отсчёт, защита от повторов заданий.
// Голос: window.voiceManager (STT + TTS). AI-разбор: POST /api/ai/generate (stateless).
// Экспорт: window.showDvaPotokaGame, window.DVAPOTOKA
// ============================================
(function () {
  "use strict";

  // ---------- утилиты ----------
  function api() { return (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || ''; }
  function uid() { return (window.CONFIG && window.CONFIG.USER_ID) || window.USER_ID || 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(t, k) { if (typeof window.showToast === 'function') window.showToast(t, k || 'info'); }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  async function aiGenerate(prompt, opts) {
    opts = opts || {};
    var body = { user_id: uid(), prompt: prompt, max_tokens: opts.max_tokens || 400, temperature: opts.temperature == null ? 0.7 : opts.temperature };
    if (typeof window.apiCall === 'function') {
      return await window.apiCall('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) });
    }
    var r = await fetch(api() + '/api/ai/generate', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  }
  function clean(s) {
    s = String(s || '').trim();
    s = s.replace(/^(ФРЕДИ|FREDI|Фреди)\s*[:：]\s*/i, '');
    return s.trim();
  }
  // ---------- озвучка (голос Фреди, TTS) ----------
  function ttsOk() { return !!(window.voiceManager && typeof window.voiceManager.textToSpeech === 'function'); }
  function speak(text) { if (!ttsOk() || !text) return false; try { window.voiceManager.textToSpeech(String(text), window.currentMode || 'basic'); return true; } catch (e) { return false; } }
  function stopSpeak() { try { if (window.voiceManager && typeof window.voiceManager.interrupt === 'function') window.voiceManager.interrupt(); } catch (e) {} }

  // ============================================================
  // КОНТЕНТ-БАНКИ
  // ============================================================
  // Уровень 1 — «Эхо»: короткий факт, который надо тут же пересказать своими словами.
  var FACTS = [
    'У осьминога три сердца и голубая кровь. Два сердца качают кровь через жабры, а третье — по всему телу. Когда осьминог плывёт, главное сердце останавливается, поэтому плавать ему тяжело, и он предпочитает ползать.',
    'Мёд — единственный продукт, который не портится. В древних гробницах находили горшочки с мёдом, которому больше трёх тысяч лет, и он был пригоден в пищу. Секрет — почти нет воды и очень много сахара, в такой среде бактерии не выживают.',
    'Банан с точки зрения ботаники — это ягода, а клубника — нет. У ягоды плод развивается из одной завязи, что верно для банана. А у клубники «семечки» снаружи — это отдельные плодики, поэтому она ягодой не считается.',
    'Эйфелева башня летом становится выше примерно на пятнадцать сантиметров. Металл на жаре расширяется, и конструкция немного вырастает. Зимой она снова уменьшается — башня буквально дышит вместе с погодой.',
    'Молния в несколько раз горячее поверхности Солнца. Воздух в канале разряда мгновенно нагревается до десятков тысяч градусов. Именно резкое расширение этого раскалённого воздуха мы и слышим как раскат грома.',
    'У улитки около двенадцати тысяч зубов, расположенных на языке-тёрке. Она не жуёт ими, а соскабливает пищу. При этом зубы стираются и постоянно отрастают заново, как конвейер.',
    'Венера — единственная планета, которая вращается вокруг оси в обратную сторону. Там солнце восходит на западе и заходит на востоке. А сутки на Венере длиннее её года: один оборот вокруг оси дольше, чем оборот вокруг Солнца.',
    'Группа розовых фламинго называется «пылание». Свой цвет они получают из пищи — рачков и водорослей с особым пигментом. Если фламинго перестать так кормить, он побледнеет и станет почти белым.',
    'Человеческий нос способен различать больше триллиона запахов. Долго считалось, что около десяти тысяч, но новые исследования показали цифру в разы большую. Мы просто редко называем запахи словами, поэтому кажется, что их мало.',
    'Кровь у мечехвоста голубого цвета и ценится дороже золота. В ней есть вещество, мгновенно сворачивающееся при встрече с бактериями. Медицина использует его, чтобы проверять чистоту вакцин и лекарств.',
    'Акулы древнее деревьев. Они появились в океанах примерно четыреста миллионов лет назад — раньше, чем на суше выросли первые настоящие деревья. То есть акулы плавали в мире, где деревьев ещё не существовало.',
    'Сердце синего кита размером с небольшой автомобиль. Оно весит около шестисот килограммов, а по крупным сосудам этого гиганта мог бы проплыть ребёнок. Бьётся оно медленно — несколько ударов в минуту.',
    'Ленивцы переваривают пищу так медленно, что один съеденный лист может усваиваться до месяца. Из-за этого они почти всё время малоподвижны и спускаются с дерева на землю лишь раз в несколько дней.',
    'Вомбаты испражняются кубиками. Их кишечник формирует помёт кубической формы, чтобы он не скатывался — так вомбаты метят территорию, оставляя метки на камнях и брёвнах, где округлое просто упало бы вниз.',
    'Слоны — единственные крупные животные, которые не умеют прыгать. Их вес и строение ног таковы, что в полёте они никогда не отрывают все четыре ноги от земли одновременно.',
    'В невесомости нельзя нормально плакать. Слёзы не стекают по щекам, а собираются в дрожащий шар прямо у глаз. Космонавтам приходится смахивать эту «водяную линзу» рукой.',
    'Чайная ложка вещества нейтронной звезды весила бы примерно как гора. Материя там сжата настолько плотно, что крошечный её объём тянет на миллиарды тонн.',
    'У гигантского кальмара самый большой глаз в живой природе — размером примерно с футбольный мяч. Такие глаза помогают ему замечать слабый свет и очертания хищников в глубокой тьме океана.',
    'Обычный лист бумаги трудно сложить пополам больше семи-восьми раз руками. С каждым сложением толщина удваивается, а площадь уменьшается вдвое — сопротивление растёт лавинообразно.',
    'Язык хамелеона выстреливает быстрее, чем разгоняется спортивный автомобиль. За доли секунды он раскрывается на длину, превышающую тело животного, и липким кончиком хватает добычу.'
  ];

  // Уровень 1→2 — «Экспромт»: повод/слово, с которого надо СРАЗУ начать тост или мини-историю.
  var IMPROMPTU = [
    'связка ключей', 'первый снег', 'старый чемодан', 'день рождения кота',
    'встреча выпускников', 'соседский вай-фай', 'потерянный носок', 'утренний кофе',
    'новоселье', 'дождь в отпуске', 'сломанный зонт', 'случайный попутчик',
    'бабушкин рецепт', 'последний автобус', 'найденная монетка', 'запах моря',
    'первый рабочий день', 'старая фотография', 'застрявший лифт', 'ночное небо',
    'подгоревший ужин', 'внезапный выходной', 'новая книга', 'дорога домой',
    'потерянные перчатки', 'запах свежего хлеба', 'старый плейлист', 'незнакомый номер',
    'последний кусок торта', 'перегоревшая лампочка', 'попутный ветер', 'чужой зонт',
    'первое свидание', 'сдача мелочью', 'ночной поезд', 'забытый пароль',
    'капля дождя на стекле', 'новая ручка', 'пустой холодильник', 'встреча спустя годы'
  ];

  // Уровень 2 — «Сказка-конструктор»: неожиданные вбросы, которые надо вплести в сюжет на ходу.
  var THROWINS = [
    'появляется дракон', 'звонит сломанный телефон', 'друг предаёт героя', 'заговорил чайник',
    'внезапно пошёл дождь', 'герой теряет память', 'в стене открывается дверь', 'старик даёт карту',
    'зеркало начинает врать', 'осталась последняя монета', 'приходит письмо без подписи', 'исчезают все тени',
    'кот заводит философский спор', 'ключ не подходит к замку', 'звучит песня из прошлого', 'через пропасть тянется мост',
    'запретную комнату всё-таки открыли', 'появляется двойник героя', 'часы пошли назад', 'данное обещание нельзя сдержать',
    'начинается гроза', 'герой находит старую монету', 'появляется незнакомец в плаще', 'город погружается в туман',
    'оживает каменная статуя', 'внезапно пропадает весь звук', 'герой слышит свой голос из будущего', 'дорога раздваивается',
    'падает звезда', 'кто-то стучит в окно', 'заканчивается еда', 'к герою прибивается зверь-спутник',
    'рушится единственный мост', 'кто-то называет героя чужим именем'
  ];
  var TALE_STARTERS = [
    'В одном королевстве, где никогда не заходило солнце…',
    'Жил-был человек, который боялся собственной тени…',
    'На краю леса стоял дом с единственным окном…',
    'Однажды часы на башне пробили тринадцать раз…',
    'В деревне, куда не вела ни одна дорога…',
    'У старого рыбака была лодка, которая помнила всё…',
    'В городе, где давным-давно запретили мечтать…',
    'Девочка нашла дверь там, где вчера была ровная стена…',
    'За семью холмами жил мальчик, у которого не было имени…',
    'Когда часы пробили полночь, все двери в доме исчезли…',
    'Однажды море отступило и не вернулось к утру…',
    'В библиотеке была книга, которую невозможно было дочитать…',
    'Каждую ночь на площади появлялся фонарщик, которого днём никто не помнил…',
    'У девочки был карандаш, который рисовал только правду…'
  ];

  // Уровень 2 — «Двойная нагрузка»: короткие вопросы-помехи во время рассказа тоста.
  var INTERRUPTS = [
    'Какого это было цвета?', 'А почему именно так?', 'Кто ещё там был?', 'Сколько было времени?',
    'Что ты почувствовал в тот момент?', 'А что было прямо перед этим?', 'Чем это пахло?', 'А если бы вышло наоборот?',
    'Что случилось дальше?', 'Тебе это понравилось?', 'Где именно всё происходило?', 'Какой был звук?',
    'Что сказала бы твоя мама?', 'Сколько это стоило?', 'А ты потом не пожалел?', 'Кто оказался прав?',
    'А кто это придумал?', 'Тебе тогда было страшно?', 'Сколько вас было?', 'А что бы ты изменил?',
    'Где именно ты стоял?', 'Какая была погода?', 'А это правда было?', 'Что ты держал в руках?',
    'Кто засмеялся первым?', 'А чем всё закончилось на самом деле?'
  ];
  var DUAL_TOPICS = [
    'расскажи тост за настоящую дружбу', 'расскажи историю про свой лучший день',
    'произнеси тост за смелость', 'расскажи, как ты однажды рискнул и не прогадал',
    'тост за родителей', 'история про случай, который всё изменил',
    'тост за мечту, которая сбылась', 'расскажи про место, куда хочется вернуться',
    'тост за учителя, который тебя изменил', 'история про самый смешной провал',
    'тост за путешествие, которое запомнилось', 'расскажи про подарок, который не забыть',
    'тост за момент, когда ты был по-настоящему свободен'
  ];

  // ============================================================
  // РЕЖИМЫ
  // ============================================================
  var MODES = {
    echo: {
      emoji: '🔁', name: 'Эхо', level: 'Уровень 1', dur: 45,
      lead: 'Беглость и пересказ. Услышь или прочитай факт один раз — и сразу перескажи вслух своими словами, без пауз и «эээ». Тренируем быстрый доступ к готовому.',
      cta: 'Показать факт', hint: 'Не заучивай дословно. Понял суть — говори своими словами, будто рассказываешь другу.'
    },
    impromptu: {
      emoji: '🥂', name: 'Экспромт', level: 'Уровень 1 → 2', dur: 60,
      lead: 'Мост между уровнями. Тебе выпадет повод — и надо НЕМЕДЛЕННО начать тост или мини-историю. Главное правило: начни говорить раньше, чем придумал концовку. Думай ртом.',
      cta: 'Вытянуть повод', hint: 'Первую фразу говори сразу, ещё не зная финала. Сюжет догонит.'
    },
    tale: {
      emoji: '📖', name: 'Сказка-конструктор', level: 'Уровень 2', dur: 120,
      lead: 'Порождение на ходу. Начинай сказку с выпавшего зачина. По ходу Фреди подкидывает неожиданный элемент — впутывай его в сюжет немедленно и логично, не теряя нить.',
      cta: 'Начать сказку', hint: 'Не сопротивляйся вбросам. Самый дикий поворот — обычно самый интересный.'
    },
    dual: {
      emoji: '🧩', name: 'Двойная нагрузка', level: 'Уровень 2 · высший', dur: 75,
      lead: 'Оба потока разом. Говоришь тост — а Фреди перебивает мелкими вопросами. Отвечай на них, не бросая основную речь: язык ведёт линию (Система 1), ум держит смысл (Система 2).',
      cta: 'Начать тост', hint: 'Ответил на вопрос-помеху — и тут же вернись к главной мысли, будто и не прерывался.'
    }
  };
  var MODE_ORDER = ['echo', 'impromptu', 'tale', 'dual'];

  // ---------- сложность ----------
  var DIFF = {
    easy: { name: 'Разминка', em: '🌱', timeMult: 1.4, throwMult: 1.4 },
    norm: { name: 'Норма',    em: '⚖️', timeMult: 1.0, throwMult: 1.0 },
    hard: { name: 'Челлендж', em: '🔥', timeMult: 0.7, throwMult: 0.62 }
  };
  var DIFF_ORDER = ['easy', 'norm', 'hard'];

  // ---------- состояние раунда ----------
  var ST = { mode: null, prompt: '', diff: 'norm', running: false, dur: 0, t0: 0, tick: null,
             transcript: '', extras: [], extraBag: [], extraTimer: null, cdTimer: null, done: false, feedback: '' };
  var _last = { echo: null, impromptu: null, tale: null, dual: null };

  // ============================================================
  // ПРОГРЕСС / ОЧКИ (localStorage)
  // ============================================================
  function loadStats() {
    try { var s = JSON.parse(localStorage.getItem('dvapotoka_stats') || 'null'); if (s && typeof s === 'object') return s; } catch (e) {}
    return { plays: 0, scored: 0, streak: 0, best: {}, lastScores: [] };
  }
  function saveStats(s) { try { localStorage.setItem('dvapotoka_stats', JSON.stringify(s)); } catch (e) {} }
  function loadDiff() { try { var d = localStorage.getItem('dvapotoka_diff'); if (DIFF[d]) return d; } catch (e) {} return 'norm'; }
  function saveDiff(d) { try { localStorage.setItem('dvapotoka_diff', d); } catch (e) {} ST.diff = d; }
  function bumpPlays() { var s = loadStats(); s.plays = (s.plays || 0) + 1; saveStats(s); return s.plays; }
  function recordScore(mode, score) {
    var s = loadStats();
    s.scored = (s.scored || 0) + 1;
    if (!s.best) s.best = {};
    if (!s.best[mode] || score > s.best[mode]) s.best[mode] = score;
    s.streak = score >= 7 ? (s.streak || 0) + 1 : 0;
    s.lastScores = (s.lastScores || []).concat(score).slice(-10);
    saveStats(s);
    return s;
  }
  function avgFlow(s) { var a = (s && s.lastScores) || []; if (!a.length) return 0; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
  function flowRank(s) {
    if (!s || !s.scored) return { t: 'Новичок потока', sub: 'Сыграй первый раунд с голосом — и Фреди оценит твой поток' };
    var a = avgFlow(s);
    if (a >= 8.5) return { t: '🏆 Мастер импровизации', sub: 'Оба потока в балансе. Держишь линию и порождаешь новое одновременно' };
    if (a >= 7) return { t: '🎯 Два потока в балансе', sub: 'Говоришь и думаешь разом — почти без сбоев' };
    if (a >= 5) return { t: '🌊 Держишь линию', sub: 'Уже не зависаешь. Дальше — плавность и неожиданные повороты' };
    return { t: '🌱 Разминаешься', sub: 'Главное — начал. Беглость и смелость приходят с раундами' };
  }

  // ============================================================
  // CSS
  // ============================================================
  function injectCSS() {
    if (document.getElementById('dpCSS')) return;
    var s = document.createElement('style'); s.id = 'dpCSS';
    s.textContent = [
      '.dp-wrap{max-width:720px;margin:0 auto;padding:18px 16px 90px;color:#f2f3f5}',
      '.dp-h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}',
      '.dp-lead{font-size:1rem;line-height:1.6;color:#c8ccd4;margin-bottom:18px}',
      '.dp-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
      '.dp-ghost:hover{color:#c8ccd4}',
      '.dp-btn{display:block;width:100%;text-align:left;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border-radius:16px;padding:18px;margin:0 0 12px;color:#f2f3f5;cursor:pointer;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}',
      '.dp-btn:hover{transform:translateY(-2px);border-color:rgba(99,102,241,.5);box-shadow:0 10px 26px rgba(0,0,0,.28)}',
      '.dp-btn .em{font-size:1.5rem;margin-right:8px;vertical-align:-2px}',
      '.dp-btn b{font-size:1.06rem;font-weight:700}',
      '.dp-btn .lvl{float:right;font-size:.72rem;font-weight:700;color:#8bd3ff;background:rgba(59,130,255,.14);border:1px solid rgba(59,130,255,.3);border-radius:20px;padding:3px 9px}',
      '.dp-btn .rec{float:right;clear:right;margin-top:6px;font-size:.72rem;font-weight:700;color:#facc15}',
      '.dp-btn small{display:block;margin-top:8px;color:#a7adba;font-size:.9rem;line-height:1.5}',
      '.dp-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
      '.dp-ch{font-weight:700;margin-bottom:8px;color:#f2f3f5}',
      '.dp-li{margin:6px 0;color:#c8ccd4;font-size:.95rem}',
      '.dp-tbl{width:100%;border-collapse:collapse;margin:6px 0 2px;font-size:.92rem}',
      '.dp-tbl td{padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top;color:#c8ccd4}',
      '.dp-tbl td:first-child{white-space:nowrap;font-weight:700;color:#f2f3f5;width:1%;padding-right:14px}',
      // статистика
      '.dp-stats{display:flex;gap:10px;margin:0 0 14px}',
      '.dp-stat{flex:1;text-align:center;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:14px;padding:12px 6px}',
      '.dp-stat b{display:block;font-size:1.35rem;font-weight:800;color:#8bd3ff}',
      '.dp-stat span{font-size:.72rem;color:#9ca3af}',
      '.dp-rank{border:1px solid rgba(99,102,241,.4);background:linear-gradient(135deg,rgba(99,102,241,.14),rgba(14,165,233,.05));border-radius:14px;padding:12px 16px;margin:0 0 14px}',
      '.dp-rank b{font-size:1.02rem}.dp-rank span{display:block;font-size:.85rem;color:#a7adba;margin-top:2px}',
      // главная карточка задания
      '.dp-prompt{border:1px solid rgba(99,102,241,.4);background:linear-gradient(160deg,rgba(99,102,241,.16),rgba(99,102,241,.04));border-radius:18px;padding:22px;margin:4px 0 14px;font-size:1.22rem;line-height:1.55;font-weight:600;text-align:center}',
      '.dp-prompt .tag{display:block;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a5b4ff;margin-bottom:10px}',
      // сложность-чипы
      '.dp-diff{display:flex;gap:8px;margin:0 0 14px}',
      '.dp-chip{flex:1;text-align:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);border-radius:12px;padding:10px 6px;cursor:pointer;font-size:.86rem;font-weight:600;color:#c8ccd4;transition:border-color .15s ease}',
      '.dp-chip.on{border-color:#6366f1;background:rgba(99,102,241,.16);color:#fff}',
      '.dp-chip small{display:block;font-size:.68rem;color:#9ca3af;font-weight:500;margin-top:2px}',
      // таймер
      '.dp-timer{text-align:center;font-size:2.1rem;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:.02em;margin:6px 0 4px}',
      '.dp-timer.warn{color:#f59e0b}.dp-timer.hot{color:#ef4444}',
      '.dp-bar{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:0 0 14px}',
      '.dp-bar i{display:block;height:100%;background:linear-gradient(90deg,#6366f1,#0ea5e9);transition:width .25s linear}',
      // обратный отсчёт
      '.dp-cd{text-align:center;padding:38px 0}',
      '.dp-cd .n{font-size:5rem;font-weight:800;line-height:1;color:#6366f1;animation:dpPop .4s ease}',
      '.dp-cd .go{font-size:3rem;font-weight:800;color:#10b981}',
      '.dp-cd .lbl{margin-top:14px;color:#a7adba;font-size:1rem}',
      // вброс
      '.dp-throw{border:1px dashed rgba(245,158,11,.55);background:rgba(245,158,11,.1);border-radius:14px;padding:14px 16px;margin:0 0 12px;font-size:1.05rem;font-weight:700;color:#fbbf24;text-align:center;animation:dpPop .35s ease}',
      '@keyframes dpPop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}',
      '@keyframes dpPulse{0%,100%{box-shadow:0 4px 14px rgba(239,68,68,.5)}50%{box-shadow:0 4px 22px rgba(239,68,68,.85)}}',
      // микрофон
      '.dp-mic{width:66px;height:66px;border-radius:50%;border:none;background:linear-gradient(135deg,#10b981,#0e8f6f);color:#fff;font-size:1.7rem;cursor:pointer;line-height:1;box-shadow:0 4px 14px rgba(16,185,129,.45);transition:transform .15s ease}',
      '.dp-mic:hover{transform:translateY(-1px)}.dp-mic:active{transform:scale(.94)}',
      '.dp-mic.rec{background:linear-gradient(135deg,#ef4444,#b91c1c);animation:dpPulse 1.1s ease-in-out infinite}',
      '.dp-mic.off{opacity:.4;cursor:default}',
      '.dp-miclabel{text-align:center;color:#a7adba;font-size:.9rem;margin:8px 0 14px;min-height:1.2em}',
      '.dp-live{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);border-radius:14px;padding:12px 14px;margin:0 0 14px;min-height:52px;color:#d7dae2;font-size:.95rem;line-height:1.55;white-space:pre-wrap}',
      '.dp-live.empty{color:#6b7280;font-style:italic}',
      // кнопки
      '.dp-primary{display:block;width:100%;border:none;border-radius:14px;padding:16px;font-size:1.05rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#6366f1,#0ea5e9);box-shadow:0 8px 22px rgba(99,102,241,.4);margin:0 0 10px;transition:transform .15s ease}',
      '.dp-primary:hover{transform:translateY(-1px)}.dp-primary:active{transform:scale(.98)}',
      '.dp-danger{background:linear-gradient(135deg,#ef4444,#b91c1c);box-shadow:0 8px 22px rgba(239,68,68,.4)}',
      '.dp-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:14px;font-size:.98rem;font-weight:600;color:#e5e7eb;cursor:pointer;margin:0 0 10px}',
      '.dp-secondary:hover{border-color:rgba(255,255,255,.28)}',
      '.dp-row{display:flex;gap:10px}.dp-row>*{flex:1;margin-bottom:0}',
      '.dp-verdict{background:linear-gradient(135deg,rgba(99,102,241,.14),rgba(14,165,233,.05));border:1px solid rgba(99,102,241,.4);border-radius:16px;padding:16px 18px;margin:4px 0 12px;line-height:1.6;font-size:.97rem}',
      '.dp-score{text-align:center;font-size:1.05rem;font-weight:800;margin:0 0 12px;color:#8bd3ff}',
      '.dp-typing{color:#8b93a7;font-size:.92rem;padding:8px 2px}',
      '.dp-flag{font-size:.8rem;color:#9ca3af;text-align:center;margin-top:6px}',
      // светлая тема
      '[data-theme="light"] .dp-wrap{color:#1f2430}',
      '[data-theme="light"] .dp-lead{color:#4b5566}',
      '[data-theme="light"] .dp-btn{background:#fff;border-color:rgba(0,0,0,.08);color:#1f2430;box-shadow:0 2px 10px rgba(0,0,0,.05)}',
      '[data-theme="light"] .dp-btn small{color:#6b7280}',
      '[data-theme="light"] .dp-card,[data-theme="light"] .dp-stat{background:#fff;border-color:rgba(0,0,0,.08)}',
      '[data-theme="light"] .dp-ch,[data-theme="light"] .dp-tbl td:first-child{color:#1f2430}',
      '[data-theme="light"] .dp-li,[data-theme="light"] .dp-tbl td{color:#4b5566}',
      '[data-theme="light"] .dp-prompt{background:linear-gradient(160deg,rgba(99,102,241,.1),rgba(99,102,241,.03));color:#1f2430}',
      '[data-theme="light"] .dp-live{background:#f7f8fa;border-color:rgba(0,0,0,.08);color:#374151}',
      '[data-theme="light"] .dp-secondary,[data-theme="light"] .dp-chip{background:#f2f4f7;border-color:rgba(0,0,0,.1);color:#374151}',
      '[data-theme="light"] .dp-miclabel{color:#6b7280}',
      // мобильная адаптация
      '@media(max-width:560px){.dp-wrap{padding:14px 12px 96px}.dp-h1{font-size:1.3rem}.dp-prompt{font-size:1.1rem;padding:18px}.dp-btn{padding:16px}.dp-timer{font-size:1.9rem}.dp-cd .n{font-size:4rem}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ============================================================
  // ЭКРАН 0 — ХАБ ИГРЫ
  // ============================================================
  function home() {
    injectCSS();
    stopAll();
    ST.diff = loadDiff();
    track('feature_opened', { feature: 'dvapotoka' });
    var c = container(); if (!c) return;
    var s = loadStats();
    var statsHtml = '';
    if (s.plays) {
      var rk = flowRank(s), av = avgFlow(s);
      statsHtml =
        '<div class="dp-rank"><b>' + esc(rk.t) + '</b><span>' + esc(rk.sub) + '</span></div>' +
        '<div class="dp-stats">' +
          '<div class="dp-stat"><b>' + s.plays + '</b><span>раундов</span></div>' +
          '<div class="dp-stat"><b>' + (s.streak || 0) + '</b><span>серия ≥7</span></div>' +
          '<div class="dp-stat"><b>' + (av ? av.toFixed(1) : '—') + '</b><span>ср. поток</span></div>' +
        '</div>';
    }
    var modesHtml = MODE_ORDER.map(function (k) {
      var m = MODES[k], best = s.best && s.best[k];
      return '<button class="dp-btn" onclick="DVAPOTOKA.round(\'' + k + '\')">' +
        '<span class="lvl">' + esc(m.level) + '</span>' +
        (best ? '<span class="rec">★ рекорд ' + best + '/10</span>' : '') +
        '<span class="em">' + m.emoji + '</span><b>' + esc(m.name) + '</b>' +
        '<small>' + esc(m.lead) + '</small></button>';
    }).join('');
    c.innerHTML =
      '<div class="dp-wrap">' +
        '<button class="dp-ghost" onclick="(window.showKonturScreen||function(){})()">← К списку игр</button>' +
        '<div class="dp-h1">🎙️ Два потока</div>' +
        '<div class="dp-lead">Игра про то, как говорить и думать одновременно. У мышления есть два уровня: <b>первый</b> — быстро выдать готовое (пересказать факт, произнести привычный тост), <b>второй</b> — родить новое прямо в момент речи. Мастерство — когда язык уже говорит, а смысл ещё рождается. Здесь ты тренируешь оба и переход между ними — вслух, с Фреди.</div>' +
        statsHtml +
        '<button class="dp-secondary" onclick="DVAPOTOKA.theory()">📚 Что за «два уровня» и почему это работает</button>' +
        modesHtml +
        (s.plays ? '' : '<div class="dp-flag">💡 Совет: включи звук — в режиме «Эхо» Фреди читает факт вслух, а в конце разбирает твою речь.</div>') +
      '</div>';
  }

  // ============================================================
  // ЭКРАН — ТЕОРИЯ
  // ============================================================
  function theory() {
    injectCSS();
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="dp-wrap">' +
        '<button class="dp-ghost" onclick="DVAPOTOKA.home()">← Назад</button>' +
        '<div class="dp-h1">Два уровня мышления</div>' +
        '<div class="dp-card"><div class="dp-ch">В чём разница</div>' +
          '<table class="dp-tbl"><tbody>' +
          '<tr><td>Уровень 1</td><td>Транслируешь готовое: пересказ фактов, чужое мнение, заученный тост. Быстро, автоматически, почти без усилия — то, что Канеман называл <b>Системой 1</b>.</td></tr>' +
          '<tr><td>Уровень 2</td><td>Порождаешь новое: строишь мысль, сюжет или аргумент прямо на ходу. Медленно, с усилием — <b>Система 2</b>. В психологии это же различают как репродуктивное и продуктивное мышление.</td></tr>' +
          '</tbody></table></div>' +
        '<div class="dp-card"><div class="dp-ch">Что мы проверили</div>' +
          '<div class="dp-li">• <b>Система 1 / Система 2</b> — модель Даниэля Канемана (книга «Думай медленно… решай быстро»): быстрое интуитивное и медленное аналитическое мышление. Это устоявшаяся, реальная концепция.</div>' +
          '<div class="dp-li">• <b>Репродуктивное vs продуктивное</b> мышление — различение из гештальт-психологии (Макс Вертгеймер): применение готового против создания нового решения.</div>' +
          '<div class="dp-li">• <b>Важный нюанс:</b> импровизация вслух (тост, сказка на ходу) — это <i>не</i> чистый уровень 1. Это как раз тренировка перехода: рот уже говорит на автоматизме (1), а ум параллельно конструирует новое (2).</div>' +
        '</div>' +
        '<div class="dp-card" style="border-color:rgba(99,102,241,.4)"><div class="dp-ch">Цель игры</div>' +
          'Научиться <b>не зависать</b> (беглость уровня 1) и одновременно <b>строить на ходу</b> (порождение уровня 2). Высший навык — оба потока разом: язык ведёт линию, ум держит смысл. Именно это отличает того, кто «умеет говорить», от того, кто просто помнит заготовки.</div>' +
        '<button class="dp-primary" onclick="DVAPOTOKA.home()">К режимам игры →</button>' +
      '</div>';
  }

  // ============================================================
  // ВЫБОР ЗАДАНИЯ (без повтора предыдущего)
  // ============================================================
  function pickPrompt(modeKey) {
    var bank = modeKey === 'echo' ? FACTS : modeKey === 'impromptu' ? IMPROMPTU : modeKey === 'tale' ? TALE_STARTERS : DUAL_TOPICS;
    var p, guard = 0;
    do { p = rand(bank); guard++; } while (bank.length > 1 && p === _last[modeKey] && guard < 12);
    _last[modeKey] = p;
    return p;
  }

  // ============================================================
  // ЭКРАН — ПОДГОТОВКА РАУНДА
  // ============================================================
  function round(modeKey, keepPrompt) {
    injectCSS();
    stopAll();
    var m = MODES[modeKey]; if (!m) return;
    if (!keepPrompt || ST.mode !== modeKey || !ST.prompt) {
      ST.prompt = pickPrompt(modeKey);
      if (modeKey === 'tale') ST.extraBag = shuffle(THROWINS);
      else if (modeKey === 'dual') ST.extraBag = shuffle(INTERRUPTS);
    }
    ST.mode = modeKey; ST.done = false; ST.transcript = ''; ST.extras = []; ST.feedback = '';
    if (!DIFF[ST.diff]) ST.diff = loadDiff();

    var promptTag, promptText;
    if (modeKey === 'echo') { promptTag = 'Перескажи этот факт'; promptText = ST.prompt; }
    else if (modeKey === 'impromptu') { promptTag = 'Твой повод для тоста / истории'; promptText = '«' + ST.prompt + '»'; }
    else if (modeKey === 'tale') { promptTag = 'Начни сказку с этого зачина'; promptText = ST.prompt; }
    else { promptTag = 'Тема твоего тоста'; promptText = cap(ST.prompt); }

    var dur = Math.round(m.dur * DIFF[ST.diff].timeMult);
    var diffHtml = DIFF_ORDER.map(function (d) {
      return '<div class="dp-chip' + (ST.diff === d ? ' on' : '') + '" onclick="DVAPOTOKA.setDiff(\'' + d + '\',\'' + modeKey + '\')">' + DIFF[d].em + ' ' + esc(DIFF[d].name) + '</div>';
    }).join('');

    var echoHear = (modeKey === 'echo' && ttsOk())
      ? '<button class="dp-secondary" onclick="DVAPOTOKA.hearFact()">🔊 Услышать факт голосом Фреди</button>'
      : '';

    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="dp-wrap">' +
        '<button class="dp-ghost" onclick="DVAPOTOKA.home()">← К режимам</button>' +
        '<div class="dp-h1">' + m.emoji + ' ' + esc(m.name) + '</div>' +
        '<div class="dp-lead" style="margin-bottom:12px">' + esc(m.lead) + '</div>' +
        '<div class="dp-prompt"><span class="tag">' + esc(promptTag) + '</span>' + esc(promptText) + '</div>' +
        echoHear +
        '<div class="dp-diff">' + diffHtml + '</div>' +
        '<div class="dp-card" style="font-size:.92rem;color:#a7adba">💡 ' + esc(m.hint) + '</div>' +
        '<button class="dp-primary" onclick="DVAPOTOKA.start()">▶ Поехали — ' + dur + ' сек</button>' +
        '<button class="dp-secondary" onclick="DVAPOTOKA.round(\'' + modeKey + '\')">🎲 Другое задание</button>' +
      '</div>';
  }
  function setDiff(d, modeKey) { if (!DIFF[d]) return; saveDiff(d); vibe(20); round(modeKey, true); }
  function hearFact() { if (!speak(ST.prompt)) toast('🔊 Озвучка недоступна в этом браузере', 'info'); else toast('🔊 Слушай…', 'info'); }

  // ============================================================
  // СТАРТ: обратный отсчёт 3-2-1 → раунд
  // ============================================================
  function start() {
    var m = MODES[ST.mode]; if (!m) return;
    stopSpeak();
    var c = container(); if (!c) return;
    var n = 3;
    var paint = function () {
      c.innerHTML =
        '<div class="dp-wrap"><div class="dp-cd">' +
          (n > 0 ? '<div class="n">' + n + '</div>' : '<div class="go">Говори!</div>') +
          '<div class="lbl">' + (n > 0 ? 'Приготовься…' : '') + '</div>' +
          '</div>' +
          '<button class="dp-secondary" onclick="DVAPOTOKA.begin()">Пропустить отсчёт →</button>' +
        '</div>';
    };
    paint(); vibe(20);
    ST.cdTimer = setInterval(function () {
      n--; if (n >= 0) { paint(); vibe(n === 0 ? 60 : 20); }
      if (n < 0) { clearInterval(ST.cdTimer); ST.cdTimer = null; begin(); }
    }, 800);
  }

  // ============================================================
  // ЭКРАН — ИДЁТ РАУНД
  // ============================================================
  function begin() {
    if (ST.cdTimer) { clearInterval(ST.cdTimer); ST.cdTimer = null; }
    var m = MODES[ST.mode]; if (!m) return;
    ST.running = true; ST.done = false; ST.dur = Math.round(m.dur * DIFF[ST.diff].timeMult);
    ST.t0 = Date.now(); ST.transcript = ''; ST.extras = [];
    track('game_round_start', { feature: 'dvapotoka', mode: ST.mode, diff: ST.diff });
    vibe(40);

    var promptLine;
    if (ST.mode === 'echo') promptLine = 'Перескажи своими словами';
    else if (ST.mode === 'impromptu') promptLine = 'Повод: «' + ST.prompt + '»';
    else if (ST.mode === 'tale') promptLine = ST.prompt;
    else promptLine = 'Тост: ' + ST.prompt;

    var mm = Math.floor(ST.dur / 60), ss = ST.dur % 60;
    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="dp-wrap">' +
        '<div class="dp-prompt" style="font-size:1.02rem"><span class="tag">' + esc(m.name) + ' · ' + DIFF[ST.diff].em + '</span>' + esc(promptLine) + '</div>' +
        '<div class="dp-timer" id="dpTimer">' + mm + ':' + ('0' + ss).slice(-2) + '</div>' +
        '<div class="dp-bar"><i id="dpBar" style="width:100%"></i></div>' +
        '<div id="dpExtras"></div>' +
        '<div style="text-align:center"><button class="dp-mic" id="dpMic" title="Говорить вслух">🎤</button></div>' +
        '<div class="dp-miclabel" id="dpMicLabel">Нажми и говори вслух — Фреди слушает</div>' +
        '<div class="dp-live empty" id="dpLive">Здесь появится расшифровка твоей речи…</div>' +
        '<button class="dp-primary dp-danger" onclick="DVAPOTOKA.finish()">■ Готово — разбор</button>' +
      '</div>';

    initMic();
    startTimer();
    if (ST.mode === 'tale' || ST.mode === 'dual') startExtras();
  }

  function startTimer() {
    if (ST.tick) clearInterval(ST.tick);
    ST.tick = setInterval(function () {
      var el = Math.floor((Date.now() - ST.t0) / 1000);
      var left = Math.max(0, ST.dur - el);
      var t = document.getElementById('dpTimer'), bar = document.getElementById('dpBar');
      if (t) {
        t.textContent = Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2);
        t.className = 'dp-timer' + (left <= 5 ? ' hot' : (left <= 15 ? ' warn' : ''));
      }
      if (bar) bar.style.width = (ST.dur ? (left / ST.dur * 100) : 0) + '%';
      if (left <= 0) { toast('⏱ Время! Смотри разбор', 'info'); vibe([60, 40, 60]); finish(); }
    }, 250);
  }

  // вбросы (сказка) / помехи (двойная нагрузка)
  function startExtras() {
    var base = ST.mode === 'tale' ? 20000 : 15000;
    var every = Math.round(base * DIFF[ST.diff].throwMult);
    var first = Math.round((ST.mode === 'tale' ? 12000 : 10000) * DIFF[ST.diff].throwMult);
    var push = function () {
      if (!ST.running) return;
      if (!ST.extraBag.length) ST.extraBag = shuffle(ST.mode === 'tale' ? THROWINS : INTERRUPTS);
      var item = ST.extraBag.shift();
      ST.extras.push(item);
      var box = document.getElementById('dpExtras');
      if (box) {
        var label = ST.mode === 'tale' ? '🎲 Вплети сейчас: ' : '❓ Ответь, не бросая рассказ: ';
        box.innerHTML = '<div class="dp-throw">' + label + esc(item) + '</div>';
      }
      vibe(60);
      toast((ST.mode === 'tale' ? '🎲 ' : '❓ ') + item, 'info');
    };
    ST.extraTimer = setTimeout(function tickExtra() {
      push();
      ST.extraTimer = setTimeout(tickExtra, every);
    }, first);
  }

  // ============================================================
  // МИКРОФОН (voiceManager, STT-only)
  // ============================================================
  var _rec = { on: false, savedT: null, savedC: null };
  function initMic() {
    var mic = document.getElementById('dpMic');
    if (!mic) return;
    if (!window.voiceManager || typeof window.voiceManager.startRecording !== 'function') {
      mic.classList.add('off');
      var lbl = document.getElementById('dpMicLabel');
      if (lbl) lbl.textContent = '🎤 Голос недоступен в этом браузере — говори вслух сам, потом жми «Готово»';
      mic.onclick = function () { toast('🎤 Голосовой ввод недоступен здесь. Игра работает и без него — говори вслух и жми «Готово».', 'info'); };
      return;
    }
    mic.onclick = function () { _rec.on ? stopVoice() : startVoice(); };
  }
  function setLive() {
    var live = document.getElementById('dpLive');
    if (!live) return;
    if (ST.transcript.trim()) { live.textContent = ST.transcript.trim(); live.classList.remove('empty'); }
    else { live.textContent = 'Здесь появится расшифровка твоей речи…'; live.classList.add('empty'); }
  }
  async function startVoice() {
    var mic = document.getElementById('dpMic'), lbl = document.getElementById('dpMicLabel');
    if (!window.voiceManager) return;
    stopSpeak();
    _rec.savedT = window.voiceManager.onTranscript;
    _rec.savedC = window.voiceManager.onTranscriptComplete;
    window.voiceManager.sttOnly = true;
    window.voiceManager.onTranscript = function (text) {
      if (!text) return;
      ST.transcript = ST.transcript ? (ST.transcript + ' ' + text) : text;
      setLive();
    };
    window.voiceManager.onTranscriptComplete = function () {};
    _rec.on = true;
    if (mic) { mic.classList.add('rec'); mic.textContent = '⏹'; }
    if (lbl) lbl.innerHTML = '<span style="color:#ef4444;font-weight:600">🔴 слушаю…</span> говори не останавливаясь';
    vibe(40);
    var ok = await window.voiceManager.startRecording();
    if (!ok) { stopVoice(); toast('🎤 Нет доступа к микрофону', 'error'); }
  }
  function stopVoice() {
    if (!_rec.on) return;
    try { if (window.voiceManager && window.voiceManager.stopRecording) window.voiceManager.stopRecording(); } catch (e) {}
    _rec.on = false;
    var mic = document.getElementById('dpMic'); if (mic) { mic.classList.remove('rec'); mic.textContent = '🎤'; }
    var lbl = document.getElementById('dpMicLabel'); if (lbl) lbl.textContent = 'Пауза. Жми 🎤 чтобы продолжить, или «Готово» для разбора';
    setTimeout(function () {
      if (window.voiceManager) {
        if (_rec.savedT !== null) window.voiceManager.onTranscript = _rec.savedT;
        if (_rec.savedC !== null) window.voiceManager.onTranscriptComplete = _rec.savedC;
        window.voiceManager.sttOnly = false;
        _rec.savedT = null; _rec.savedC = null;
      }
    }, 600);
  }

  // ============================================================
  // ЗАВЕРШЕНИЕ + РАЗБОР ОТ ФРЕДИ
  // ============================================================
  function stopTimers() {
    if (ST.tick) { clearInterval(ST.tick); ST.tick = null; }
    if (ST.extraTimer) { clearTimeout(ST.extraTimer); ST.extraTimer = null; }
    if (ST.cdTimer) { clearInterval(ST.cdTimer); ST.cdTimer = null; }
  }
  function stopAll() {
    ST.running = false;
    stopTimers();
    if (_rec.on) stopVoice();
    stopSpeak();
  }

  async function finish() {
    if (ST.done) return;
    ST.done = true; ST.running = false;
    stopTimers();
    if (_rec.on) stopVoice();
    var plays = bumpPlays();
    var said = ST.transcript.trim();
    track('game_round_finish', { feature: 'dvapotoka', mode: ST.mode, diff: ST.diff, spoke: !!said });

    var m = MODES[ST.mode];
    var c = container(); if (!c) return;

    var head =
      '<div class="dp-wrap">' +
        '<div class="dp-h1">' + m.emoji + ' Разбор — ' + esc(m.name) + '</div>' +
        (said
          ? '<div class="dp-card"><div class="dp-ch">Что ты сказал</div><div style="color:#c8ccd4;white-space:pre-wrap;line-height:1.55">' + esc(said) + '</div></div>'
          : '<div class="dp-card">🎤 Речь не распозналась (или ты говорил без микрофона). Ничего страшного — оцени себя по подсказке ниже и сыграй ещё раз.</div>');

    if (!said) {
      c.innerHTML = head + selfCheckCard() + tailButtons();
      scrollTop();
      return;
    }

    c.innerHTML = head + '<div class="dp-typing" id="dpTyping">🎙️ Фреди слушает и разбирает…</div>' + tailButtons();
    scrollTop();

    var v = '';
    try {
      var r = await aiGenerate(buildFeedbackPrompt(said), { temperature: 0.6, max_tokens: 420 });
      v = (r && r.success && r.content) ? clean(r.content) : '';
    } catch (e) { v = ''; }

    var typ = document.getElementById('dpTyping');
    if (!v) { if (typ) typ.outerHTML = selfCheckCard(); return; }

    // вытащить оценку потока
    var score = null, mm = v.match(/(\d{1,2})\s*\/\s*10/) || v.match(/[Оо]ценка[^\d]{0,12}(\d{1,2})/);
    if (mm) { score = parseInt(mm[1], 10); if (score < 0 || score > 10) score = null; }
    ST.feedback = v.replace(/\s*Оценка потока:\s*\d{1,2}\s*\/\s*10\.?\s*$/i, '').trim();

    var scoreHtml = '';
    if (score != null) {
      var st = recordScore(ST.mode, score);
      var extra = (score >= 7 && st.streak > 1) ? ' · серия ' + st.streak + ' 🔥' : '';
      var isRec = st.best[ST.mode] === score;
      scoreHtml = '<div class="dp-score">🌊 Поток: ' + score + '/10' + (isRec ? ' — новый рекорд! 🏆' : '') + extra + '</div>';
      if (score >= 8) vibe([40, 40, 40]);
    }

    var speakBtn = ttsOk() ? '<button class="dp-secondary" onclick="DVAPOTOKA.hearVerdict()">🔊 Озвучить разбор</button>' : '';
    if (typ) typ.outerHTML = scoreHtml + '<div class="dp-verdict">' + esc(ST.feedback).replace(/\n/g, '<br>') + '</div>' + speakBtn;
  }

  function hearVerdict() { if (!speak(ST.feedback)) toast('🔊 Озвучка недоступна', 'info'); }
  function scrollTop() { try { var sc = document.getElementById('screenContainer'); if (sc) sc.scrollTop = 0; } catch (e) {} }

  function selfCheckCard() {
    var m = MODES[ST.mode];
    var rows = {
      echo: ['<b>Беглость</b> — говорил без пауз и «эээ»?', '<b>Точность</b> — сохранил суть факта, не переврал?', '<b>Свои слова</b> — пересказал, а не зазубрил дословно?'],
      impromptu: ['<b>Мгновенный старт</b> — начал говорить сразу, не залипнув?', '<b>Связность</b> — довёл до внятного финала?', '<b>Живость</b> — не свалился в шаблонный «выпьем за…»?'],
      tale: ['<b>Непрерывность</b> — не замолкал надолго?', '<b>Интеграция</b> — вплёл каждый вброс, не потеряв нить?', '<b>Сюжет</b> — история осталась цельной, а не рассыпалась?'],
      dual: ['<b>Двойной поток</b> — отвечал на помехи, не бросая тост?', '<b>Возврат</b> — легко подхватывал главную линию после вопроса?', '<b>Смысл</b> — тост не развалился под перебиваниями?']
    }[ST.mode] || [];
    return '<div class="dp-card"><div class="dp-ch">Оцени себя честно</div>' +
      rows.map(function (r) { return '<div class="dp-li">☐ ' + r + '</div>'; }).join('') +
      '<div class="dp-li" style="margin-top:8px;color:#8bd3ff">💡 ' + esc(m.hint) + '</div>' +
      '<div class="dp-li" style="color:#9ca3af;font-size:.85rem">Включи микрофон в следующий раз — тогда Фреди даст живой разбор и оценку потока.</div></div>';
  }

  function tailButtons() {
    return '<div class="dp-row">' +
        '<button class="dp-primary" onclick="DVAPOTOKA.round(\'' + ST.mode + '\')">🔁 Ещё раунд</button>' +
        '<button class="dp-secondary" onclick="DVAPOTOKA.home()">К режимам</button>' +
      '</div>';
  }

  // системный промпт разбора
  function buildFeedbackPrompt(said) {
    var m = MODES[ST.mode];
    var task, criteria;
    if (ST.mode === 'echo') {
      task = 'Игрок услышал факт и должен был тут же пересказать его своими словами вслух. Исходный факт: «' + ST.prompt + '».';
      criteria = 'Оцени УРОВЕНЬ 1 (беглость и пересказ): сохранил ли суть, не переврал ли, говорил ли своими словами, а не зубрёжкой.';
    } else if (ST.mode === 'impromptu') {
      task = 'Игрок должен был мгновенно, без подготовки, произнести тост или мини-историю на повод: «' + ST.prompt + '».';
      criteria = 'Оцени ПЕРЕХОД с уровня 1 на 2: сумел ли начать сразу и при этом придумать живой сюжет на ходу, а не выдать шаблон.';
    } else if (ST.mode === 'tale') {
      task = 'Игрок сочинял сказку вслух, начав с зачина: «' + ST.prompt + '». По ходу ему подкидывали неожиданные элементы: ' + (ST.extras.length ? ST.extras.map(function (e) { return '«' + e + '»'; }).join(', ') : '(не успели подкинуть)') + '. Их нужно было вплести в сюжет.';
      criteria = 'Оцени УРОВЕНЬ 2 (порождение на ходу): вплёл ли неожиданные элементы логично, удержал ли цельность сюжета, не рассыпалась ли история.';
    } else {
      task = 'Игрок произносил тост на тему «' + ST.prompt + '», а его перебивали вопросами-помехами: ' + (ST.extras.length ? ST.extras.map(function (e) { return '«' + e + '»'; }).join(', ') : '(не успели перебить)') + '. Нужно было отвечать на них, не бросая основную речь.';
      criteria = 'Оцени ВЫСШИЙ навык (два потока разом): держал ли основную линию тоста, отвечая на помехи, легко ли возвращался к главной мысли.';
    }
    return [
      'Ты — Фреди, доброжелательный, но честный тренер речи и мышления. Ты ведёшь игру «Два потока» о двух уровнях мышления: уровень 1 — беглая трансляция готового (Система 1 по Канеману), уровень 2 — порождение нового прямо в момент речи (Система 2).',
      'РЕЖИМ: «' + m.name + '» — ' + m.level + '.',
      'ЗАДАНИЕ: ' + task,
      'ЧТО СКАЗАЛ ИГРОК (расшифровка речи, возможны ошибки распознавания — не придирайся к ним): «' + said + '»',
      'ЗАДАЧА РАЗБОРА: ' + criteria,
      'ФОРМАТ ОТВЕТА (по-русски, тепло, на «ты», без воды, 4–6 строк):',
      '1) Одна фраза — что реально получилось хорошо (конкретно, из его текста).',
      '2) Одна фраза — где просел (пауза, шаблон, потерял нить, недовплёл — что именно).',
      '3) Один конкретный микро-совет на следующий раунд.',
      '4) ОБЯЗАТЕЛЬНО последней строкой ровно в формате: «Оценка потока: N/10» — где N честная целая оценка навыка в этом режиме от 1 до 10.',
      'Не пиши вступлений вроде «Разбираю». Не хвали пусто. Говори по существу.'
    ].join('\n');
  }

  // ---------- экспорт ----------
  window.DVAPOTOKA = {
    home: home, theory: theory, round: round, setDiff: setDiff,
    hearFact: hearFact, start: start, begin: begin, finish: finish, hearVerdict: hearVerdict
  };
  window.showDvaPotokaGame = home;   // deep-link / кнопка в хабе «Игры»
  console.log('✅ dvapotoka.js loaded (игра «Два потока» v2: голос, очки, сложность)');
})();
