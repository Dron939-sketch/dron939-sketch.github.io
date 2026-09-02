// fredi/experts-tab.js — вкладка «🏅 Эксперты»: разбор своего списка друзей
// под предложение о странице в справочнике.
//
// Зачем отдельно от «Клиентов» и от прогрева. Прогрев (drip) читает друзей
// через friends.get, а он отдаёт только имя, пол, возраст и признак «можно ли
// писать». По этим полям видно «женщина 34 года», но не видно, мастер это с
// частной практикой или бухгалтер в найме. Ручка /experts/preview делает
// второй проход через users.get с occupation, career, site, status — и
// раскладывает людей по двум шкалам.
//
// Две шкалы, а не одна сумма. «Надо» — профессия, где человека ищут по имени.
// «Захочет» — уже вкладывается в присутствие. Человек с «надо 3, захочет 0» и
// человек с «надо 0, захочет 6» дают одинаковую сумму, а предлагать им нужно
// разное, поэтому в таблице они стоят раздельно.
//
// Вкладка ничего не отправляет. Она готовит текст под конкретного человека и
// кладёт его в буфер: отправляет админ руками. Это не осторожность ради
// осторожности — ВК режет серии одинаковых сообщений со ссылками, а вручную
// написанная первая строка ещё и работает лучше.
(function () {
  'use strict';

  var API = (window.API_BASE_URL) || '';
  var LS = 'fredi_admin_token';
  var LINK = 'https://lichnosty.ru/type/eksperty/';
  var DATA = [];
  var LAST = null;
  var AI_MODE = false;

  function tok() { try { return localStorage.getItem(LS) || ''; } catch (e) { return ''; } }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function api(path, body) {
    var r;
    try {
      r = await fetch(API + path, {
      method: 'POST',
      headers: { 'X-Admin-Token': tok(), 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      });
    } catch (e) {
      // Браузер отдаёт «Failed to fetch» и на не выкатившийся сервер (404 без
      // CORS-заголовков блокируется как сетевая ошибка), и на оборванный по
      // таймауту долгий запрос. Различить их из JS нельзя — называем обе.
      throw new Error('Сервер не ответил. Либо бэкенд ещё не выкатился, либо запрос шёл слишком долго и оборвался — попробуйте ещё раз через минуту.');
    }
    if (r.status === 401) throw new Error('Неверный ADMIN_TOKEN');
    if (r.status === 404) throw new Error('Этой ручки на сервере ещё нет — бэкенд не выкатился. Подождите деплой.');
    var j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error((j && (j.detail && (j.detail.message || j.detail.error) || j.error)) || ('HTTP ' + r.status));
    return j;
  }

  // ---- тексты ---------------------------------------------------------
  // Ход один во всех трёх: о человеке узнают со слов других, и одного
  // источника мало — решение принимается, когда сказанное подтвердилось
  // откуда-то ещё. Соцсеть вторым источником не работает: это тот же голос.
  var TEMPLATES = {
    master: {
      title: 'Мастеру и частной практике',
      text: function (name) {
        return name + ', привет.\n\n' +
          'Человек считает правдой то, что узнал из двух не связанных между собой источников.\n\n' +
          'Вспомни, как сама кого-нибудь выбирала — стоматолога, например. Подруга посоветовала, ты согласилась, а потом всё равно полезла смотреть, что за человек. Не потому что не доверяешь подруге. Просто одного источника мало: пока сказанное не подтвердилось откуда-то ещё, это остаётся чужим мнением, а решать тебе.\n\n' +
          'А теперь то же самое происходит с тобой. Тебя порекомендовали — и человек идёт проверять.\n\n' +
          'Вот здесь обрыв. Он находит твой профиль в соцсети — но это ты о себе, тот же источник, что и подруга. Или находит однофамильцев. Второго подтверждения нет, и запись откладывается на потом.\n\n' +
          'Есть справочник, где можно завести страницу в разделе «Эксперты»:\n' + LINK + '\n' +
          'Кто ты, чем занимаешься, с какого года, что заканчивала. Площадка сторонняя — поэтому и работает как второй источник.\n\n' +
          'Чего она не сделает: не приведёт клиентов и не заставит о тебе говорить. Разговоры — твоя работа, и ты её делаешь. Страница закрывает только шаг проверки — тот самый, на котором сейчас останавливаются.\n\n' +
          'Посмотри, если откликнется. Не в тему — так и скажи, я не обижусь.';
      },
    },
    expert: {
      title: 'Практикующему специалисту',
      text: function (name) {
        return name + ', привет.\n\n' +
          'Человек считает правдой то, что узнал из двух не связанных между собой источников.\n\n' +
          'Ты это за собой наверняка замечал. Когда тебе кого-то советуют — врача, юриста, подрядчика, — ты киваешь, а потом всё равно идёшь смотреть сам. Рекомендация даёт кандидата, но не даёт решения: решение появляется, когда сказанное подтверждается откуда-то ещё.\n\n' +
          'С тобой делают ровно то же. Тебя рекомендуют — и человек перед обращением проверяет имя в поиске.\n\n' +
          'И упирается. Соцсети вторым источником не работают: там ты говоришь о себе сам, а это то же самое мнение, только из первых рук. Проверка не засчитывается.\n\n' +
          'Справочник как раз про это — страница в разделе «Эксперты»:\n' + LINK + '\n' +
          'Образование, чем занимаешься, с какого года, ссылки на подтверждения. Сторонняя площадка, отдельная выдача, и её удобно давать ссылкой вместо «найдите меня в интернете».\n\n' +
          'Честно про предел: страница не приводит клиентов и не делает известным. Она закрывает шаг проверки — тот, на котором человек сейчас останавливается.\n\n' +
          'Если интересно — посмотри.';
      },
    },
    short: {
      title: 'Коротко, для дальних знакомых',
      text: function (name) {
        return name + ', привет.\n\n' +
          'Человек считает правдой то, что узнал из двух не связанных между собой источников.\n\n' +
          'Ты и сам так делаешь: посоветовали мастера — всё равно пошёл смотреть. С тобой то же самое, только теперь проверяют тебя. И находят соцсети, а это ты о себе — тот же источник, что и рекомендация.\n\n' +
          'Есть справочник с разделом «Эксперты»:\n' + LINK + '\n' +
          'Страница о человеке: чем занимается, с какого года, подтверждения. Индексируется отдельно, её удобно давать ссылкой.\n\n' +
          'Клиентов она не приведёт — закрывает только шаг проверки. Подумал про тебя. Если не в тему — просто скажи.';
      },
    },
  };

  function firstName(full) { return String(full || '').trim().split(/\s+/)[0] || 'Привет'; }

  // ---- окно отправки ---------------------------------------------------
  // Текст показывается целиком и правится перед отправкой. Это не
  // формальность: одинаковые сообщения — ровно то, на что срабатывает
  // антиспам ВК, а дописанная своими словами первая строка ещё и читается
  // как письмо человеку, а не как рассылка.
  var LEFT_TODAY = null;

  function openCompose(idx, tplKey) {
    var c = DATA[idx];
    var back = document.createElement('div');
    back.id = 'expModal';
    back.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.62);' +
      'display:flex;align-items:center;justify-content:center;padding:20px';
    back.innerHTML =
      '<div style="background:var(--surface);border:1px solid var(--border-hi,var(--border));border-radius:16px;' +
        'width:min(680px,100%);max-height:88vh;overflow:auto;padding:20px 22px;box-shadow:0 24px 60px rgba(0,0,0,.5)">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">' +
          '<b style="font-size:15px">' + esc(c.name) + '</b>' +
          '<a href="' + esc(c.url) + '" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent)">профиль ↗</a>' +
          '<span style="margin-left:auto;font-size:11.5px;color:var(--text-dim)" id="expLeft"></span>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text-dim);margin-bottom:10px">' +
          esc([c.profession, c.occupation, c.city].filter(Boolean).join(' · ')) + '</div>' +
        '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">' +
          (c.message ? '<button data-swap="ai" style="padding:5px 10px;border-radius:7px;font-size:11.5px;cursor:pointer;font:inherit;' +
            'border:1px solid var(--accent);background:rgba(167,139,250,.14);color:var(--text)">Письмо от ИИ</button>' : '') +
          Object.keys(TEMPLATES).map(function (k) {
            return '<button data-swap="' + k + '" style="padding:5px 10px;border-radius:7px;font-size:11.5px;cursor:pointer;font:inherit;' +
              'border:1px solid ' + (!c.message && k === tplKey ? 'var(--accent)' : 'var(--border)') + ';' +
              'background:' + (!c.message && k === tplKey ? 'rgba(167,139,250,.14)' : 'transparent') + ';color:var(--text)">' +
              esc(TEMPLATES[k].title) + '</button>';
          }).join('') +
          '<button id="expRegen" style="padding:5px 10px;border-radius:7px;font-size:11.5px;cursor:pointer;font:inherit;' +
            'border:1px solid var(--border);background:transparent;color:var(--text-dim)">Написать заново</button>' +
        '</div>' +
        '<textarea id="expText" spellcheck="true" style="width:100%;min-height:280px;padding:12px 14px;border-radius:10px;' +
          'border:1px solid var(--border);background:rgba(255,255,255,.03);color:var(--text);font:inherit;' +
          'font-size:13px;line-height:1.55;resize:vertical"></textarea>' +
        '<div style="display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap">' +
          '<span id="expCount" style="font-size:11.5px;color:var(--text-dim)"></span>' +
          '<span style="font-size:11.5px;color:var(--warn,#f5a524)">Допишите первую строку своими словами — одинаковые начала ВК режет.</span>' +
        '</div>' +
        '<div id="expErr" style="font-size:12px;color:#f87171;margin-top:8px;min-height:14px"></div>' +
        '<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;flex-wrap:wrap">' +
          '<button id="expCancel" style="padding:9px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text);font:inherit;cursor:pointer">Отмена</button>' +
          '<button id="expCopy" style="padding:9px 16px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text);font:inherit;cursor:pointer">Скопировать</button>' +
          '<button id="expSend" style="padding:9px 20px;border-radius:8px;border:none;background:var(--accent-grad);color:#fff;font:inherit;font-weight:700;cursor:pointer">Отправить</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(back);

    var ta = back.querySelector('#expText');
    function fill(key) {
      // Письмо от модели написано под конкретного человека и с его зацепкой —
      // оно всегда лучше общей заготовки, поэтому показывается первым.
      ta.value = (key === 'ai' && c.message) ? c.message : TEMPLATES[key].text(firstName(c.name));
      count();
    }
    function count() {
      back.querySelector('#expCount').textContent = ta.value.length + ' знаков';
    }
    fill(c.message ? 'ai' : tplKey);
    ta.addEventListener('input', count);
    // Курсор в начало: первое, что нужно сделать, — дописать свою строку.
    ta.focus(); ta.setSelectionRange(0, 0);
    if (LEFT_TODAY !== null) {
      back.querySelector('#expLeft').textContent = 'сегодня осталось ' + LEFT_TODAY;
    }

    back.querySelectorAll('[data-swap]').forEach(function (b) {
      b.addEventListener('click', function () {
        fill(b.dataset.swap);
        back.querySelectorAll('[data-swap]').forEach(function (x) {
          var on = x === b;
          x.style.borderColor = on ? 'var(--accent)' : 'var(--border)';
          x.style.background = on ? 'rgba(167,139,250,.14)' : 'transparent';
        });
      });
    });

    function close() { back.remove(); }
    back.querySelector('#expCancel').addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', function esc2(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); }
    });
    back.querySelector('#expRegen').addEventListener('click', async function () {
      var rb = back.querySelector('#expRegen');
      rb.disabled = true; rb.textContent = 'пишу…';
      try {
        var r = await api('/api/admin/vk/experts/ai-message', {
          vk_id: c.vk_id, name: c.name, occupation: c.occupation || c.profession || '',
          city: c.city || '', hook: c.hook || '', refresh: true,
        });
        c.message = r.text; ta.value = r.text; count();
      } catch (e) { back.querySelector('#expErr').textContent = e.message; }
      finally { rb.disabled = false; rb.textContent = 'Написать заново'; }
    });
    back.querySelector('#expCopy').addEventListener('click', function () {
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value);
      var b = back.querySelector('#expCopy'); b.textContent = 'скопировано';
      setTimeout(function () { b.textContent = 'Скопировать'; }, 1200);
    });

    back.querySelector('#expSend').addEventListener('click', async function () {
      var btn = back.querySelector('#expSend');
      var err = back.querySelector('#expErr');
      btn.disabled = true; btn.textContent = 'отправляю…'; err.textContent = '';
      try {
        var r = await api('/api/admin/vk/experts/send', { vk_id: c.vk_id, text: ta.value });
        LEFT_TODAY = r.left_today;
        c.contacted = true; c.contacted_status = 'sent';
        close();
        if (LAST) {
          LAST.sent_today = r.sent_today;
          LAST.daily_cap = r.daily_cap;
          LAST.left_today = r.left_today;
          render(LAST);
        }
      } catch (e) {
        err.textContent = e.message;
        btn.disabled = false; btn.textContent = 'Отправить';
      }
    });
  }

  // ---- интерфейс -------------------------------------------------------
  function injectUI() {
    var nav = document.getElementById('navBar');
    if (!nav) return setTimeout(injectUI, 500);
    if (document.getElementById('expTabBtn')) return;

    var btn = document.createElement('button');
    btn.id = 'expTabBtn'; btn.dataset.tab = 'experts'; btn.textContent = '🏅 Эксперты';
    btn.style.cssText = 'flex:0 0 auto';
    var vkBtn = document.getElementById('vkTabBtn');
    if (vkBtn && vkBtn.nextSibling) nav.insertBefore(btn, vkBtn.nextSibling); else nav.appendChild(btn);

    var sec = document.createElement('section');
    sec.id = 'expertsTab'; sec.style.display = 'none';
    sec.innerHTML =
      '<h2>Кандидаты на страницу в справочнике</h2>' +
      '<p style="color:var(--text-dim);font-size:12.5px;line-height:1.6;max-width:760px;margin:0 0 14px">' +
        'Разбор своего списка друзей. <b>Надо</b> — профессия, где человека ищут по имени: клиент гуглит фамилию перед записью. ' +
        '<b>Захочет</b> — уже вкладывается в присутствие: заполнена карьера, есть сайт, зовёт клиентов в профиле. ' +
        'Нужны те, у кого высоки обе: первым предложение полезно, вторые им займутся.</p>' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">' +
        '<label style="font-size:12px;color:var(--text-dim)">надо ≥ ' +
          '<select id="expNado" style="margin-left:4px;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font:inherit">' +
          '<option value="3">3 — ищут по имени всегда</option><option value="2" selected>2 — ищут часто</option><option value="0">0 — все подряд</option></select></label>' +
        '<label style="font-size:12px;color:var(--text-dim)">захочет ≥ ' +
          '<input id="expHochet" type="number" value="1" min="0" max="9" style="width:64px;margin-left:4px;padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font:inherit"></label>' +
        '<button id="expAi" style="padding:9px 18px;border-radius:8px;border:none;background:var(--accent-grad);color:#fff;font:inherit;font-weight:700;cursor:pointer">Разобрать с ИИ</button>' +
        '<button id="expFind" style="padding:9px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text);font:inherit;cursor:pointer" title="Только правила, без модели — быстро и бесплатно">Без ИИ</button>' +
        '<span id="expStatus" style="font-size:12px;color:var(--text-dim)"></span>' +
      '</div>' +
      '<div id="expSummary" style="margin-bottom:12px"></div>' +
      '<div id="expList"></div>' +
      '<p style="color:var(--text-dim);font-size:12px;line-height:1.6;max-width:760px;margin:16px 0 0">' +
        'Кнопка открывает письмо: текст видно целиком и его можно править перед отправкой. ' +
        'Допишите каждому свою первую строку — одинаковые начала ВК распознаёт как рассылку. ' +
        'Дневной потолок стоит на пятнадцати: аккаунт теряется целиком, а не по одному адресату.</p>';

    var host = document.querySelector('main') || document.body;
    host.appendChild(sec);

    btn.addEventListener('click', function () {
      document.querySelectorAll('#navBar button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('main > section').forEach(function (s) { s.style.display = 'none'; });
      sec.style.display = '';
    });
    document.getElementById('expFind').addEventListener('click', function () { find(false); });
    document.getElementById('expAi').addEventListener('click', function () { find(true); });
  }

  async function find(useAi) {
    var btn = document.getElementById(useAi ? 'expAi' : 'expFind');
    var status = document.getElementById('expStatus');
    btn.disabled = true;
    status.textContent = useAi
      ? 'читаю профили, разбираю моделью и пишу письма — это займёт минуту-другую…'
      : 'читаю друзей и профили…';
    try {
      var r = await api(useAi ? '/api/admin/vk/experts/ai' : '/api/admin/vk/experts/preview', {
        min_nado: parseInt(document.getElementById('expNado').value, 10),
        min_hochet: parseInt(document.getElementById('expHochet').value, 10) || 0,
        limit: 300,
      });
      AI_MODE = !!useAi;
      DATA = r.candidates || [];
      LAST = r;
      if (typeof r.left_today === 'number') LEFT_TODAY = r.left_today;
      render(r);
      status.textContent = r.ai
        ? ('модель разобрала ' + r.ai.ranked + ', написала писем ' + r.ai.written +
           (r.ai.queue_left ? ' · ещё не разобрано ' + r.ai.queue_left + ', нажмите повторно' : '') +
           // Без этого «разобрала 0» приходится расследовать по логам сервера.
           ((r.ai.errors && r.ai.errors.length) ? ' · модель отвечает ошибкой: ' + r.ai.errors[0] : ''))
        : '';
    } catch (e) {
      status.textContent = 'не вышло: ' + e.message;
    } finally { btn.disabled = false; }
  }

  function badge(n, label, hi) {
    var color = n >= hi ? '52,211,153' : (n > 0 ? '167,139,250' : '148,163,184');
    return '<span style="background:rgba(' + color + ',0.16);color:rgba(' + color + ',1);' +
      'padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap">' +
      label + ' ' + n + '</span>';
  }

  function render(r) {
    var sum = document.getElementById('expSummary');
    var skipped = Object.keys(r.skipped || {})
      .filter(function (k) { return r.skipped[k]; })
      .map(function (k) { return k + ' — ' + r.skipped[k]; }).join(', ');
    sum.innerHTML =
      '<div style="font-size:13px;color:var(--text)">Подходят: <b>' + r.total + '</b>' +
      ' · горячие (' + (r.ai ? 'оценка ИИ ≥ 8' : 'надо ≥ 3 и захочет ≥ 3') + '): ' +
      '<b style="color:var(--success)">' + r.hot + '</b>' +
      (r.ai ? ' · писем готово: <b>' + r.ai.written + '</b>' : '') + '</div>' +
      (r.daily_cap ? '<div style="font-size:12px;margin-top:4px;color:' +
        (r.left_today <= 3 ? '#f5a524' : 'var(--text-dim)') + '">отправлено сегодня: <b>' +
        r.sent_today + '</b> из ' + r.daily_cap + ' · осталось ' + r.left_today + '</div>' : '') +
      (skipped ? '<div style="font-size:11.5px;color:var(--text-dim);margin-top:4px">не разбирались: ' + esc(skipped) + '</div>' : '');

    var list = document.getElementById('expList');
    if (!DATA.length) {
      list.innerHTML = '<div style="padding:16px;color:var(--text-dim);font-size:12.5px">— по этим порогам никого —</div>';
      return;
    }
    list.innerHTML = DATA.map(function (c, i) {
      return '<div style="display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.05)' +
          (c.contacted ? ';opacity:.5' : '') + '">' +
        (c.photo ? '<img src="' + esc(c.photo) + '" alt="" style="width:44px;height:44px;border-radius:50%;flex:0 0 auto">' : '') +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
            '<a href="' + esc(c.url) + '" target="_blank" rel="noopener" style="font-weight:600;color:var(--text);text-decoration:none">' + esc(c.name) + '</a>' +
            (typeof c.fit === 'number' && AI_MODE ? badge(c.fit, 'ИИ', 8) : '') +
            badge(c.nado, 'надо', 3) + badge(c.hochet, 'хочет', 3) +
            (c.contacted ? '<span style="font-size:11px;color:var(--success)">уже писали</span>' : '') +
          '</div>' +
          '<div style="font-size:12px;color:var(--text-dim);margin-top:3px">' +
            esc([c.profession, c.occupation, c.city].filter(Boolean).join(' · ')) + '</div>' +
          (c.status ? '<div style="font-size:11.5px;color:var(--text-dim);margin-top:2px;font-style:italic">«' + esc(c.status) + '»</div>' : '') +
          (c.hook ? '<div style="font-size:11.5px;color:var(--accent);margin-top:4px">зацепка: ' + esc(c.hook) + '</div>' : '') +
          '<div style="font-size:11px;color:var(--text-dim);margin-top:4px">' +
            esc([c.ai_why, c.why].filter(Boolean).join(' · ')) +
            (c.message ? ' · <span style="color:var(--success)">письмо готово</span>' : '') + '</div>' +
          '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
            Object.keys(TEMPLATES).map(function (k) {
              return '<button data-open="' + i + '" data-tpl="' + k + '" style="padding:5px 11px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--text);font:inherit;font-size:11.5px;cursor:pointer">' +
                esc(TEMPLATES[k].title) + '</button>';
            }).join('') +
            '<button data-mark="' + i + '" style="padding:5px 11px;border-radius:7px;border:1px solid rgba(52,211,153,0.4);background:transparent;color:var(--success);font:inherit;font-size:11.5px;cursor:pointer">Отметить «написал»</button>' +
          '</div>' +
        '</div></div>';
    }).join('');

    list.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () { openCompose(+b.dataset.open, b.dataset.tpl); });
    });
    list.querySelectorAll('[data-mark]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var c = DATA[+b.dataset.mark];
        b.disabled = true;
        try {
          await api('/api/admin/vk/outreach-mark', { vk_id: c.vk_id, status: 'sent', category: 'lichnosty' });
          c.contacted = true;
          b.textContent = 'отмечен';
        } catch (e) { b.disabled = false; alert('Не вышло: ' + e.message); }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectUI);
  else injectUI();
})();
