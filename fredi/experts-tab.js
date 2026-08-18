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

  var API = (window.API_BASE_URL) || 'https://ffred-ddd989.amvera.io';
  var LS = 'fredi_admin_token';
  var LINK = 'https://lichnosty.ru/type/eksperty/';
  var DATA = [];

  function tok() { try { return localStorage.getItem(LS) || ''; } catch (e) { return ''; } }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function api(path, body) {
    var r = await fetch(API + path, {
      method: 'POST',
      headers: { 'X-Admin-Token': tok(), 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (r.status === 401) throw new Error('Неверный ADMIN_TOKEN');
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
        return name + ', привет. Мысль про твою работу — скажи, если мимо.\n\n' +
          'К тебе приходят по рекомендации: подруга сказала «сходи к ней». И дальше человек почти всегда делает одно и то же — вбивает имя в поиск. Не потому что не доверяет подруге. Просто одного мнения мало: чтобы решиться, нужно, чтобы то же самое подтвердилось откуда-то ещё.\n\n' +
          'Вот здесь и обрыв. Он находит профиль в соцсети — но это ты о себе, тот же источник, что и подруга. Или находит однофамильцев. Второго подтверждения нет, и решение откладывается на потом.\n\n' +
          'Есть справочник, где можно завести страницу в разделе «Эксперты»: ' + LINK + ' — кто ты, чем занимаешься, с какого года, что заканчивала. Площадка сторонняя, поэтому и работает как второй источник: человеку сказали — он проверил — сошлось.\n\n' +
          'Чего она не сделает: не заставит о тебе говорить. Разговоры — твоя работа, и ты её делаешь. Но упираются они ровно в том месте, где человек идёт проверять.\n\n' +
          'Посмотри, если откликнется. Не в тему — так и скажи, я не обижусь.';
      },
    },
    expert: {
      title: 'Практикующему специалисту',
      text: function (name) {
        return name + ', привет. Не по делу, но, кажется, тебе пригодится.\n\n' +
          'Тебя рекомендуют — и человек перед обращением идёт проверять имя в поиске. Одна рекомендация решения не даёт: нужно, чтобы она подтвердилась источником, который с ней не связан. Соцсети таким источником не работают — там ты говоришь о себе сам, а это то же самое мнение, только из первых рук.\n\n' +
          'Справочник как раз про это: страница в разделе «Эксперты» — ' + LINK + '. Образование, чем занимаешься, с какого года, ссылки на подтверждения. Сторонняя площадка, отдельная выдача, и её удобно давать ссылкой вместо «ну найдите меня в интернете».\n\n' +
          'Честно про предел: страница не приводит клиентов и не делает известным. Она закрывает шаг проверки — тот, на котором человек сейчас останавливается.\n\n' +
          'Если интересно — посмотри.';
      },
    },
    short: {
      title: 'Коротко, для дальних знакомых',
      text: function (name) {
        return name + ', привет. Тебя же рекомендуют — и человек потом идёт гуглить имя, чтобы убедиться. Находит соцсети, а это ты о себе, то есть тот же источник. Нужен второй, независимый.\n\n' +
          'Есть справочник с разделом «Эксперты»: ' + LINK + '. Страница о человеке: чем занимается, с какого года, подтверждения. Индексируется отдельно, её удобно давать ссылкой.\n\n' +
          'Подумал про тебя. Если не в тему — просто пропусти.';
      },
    },
  };

  function firstName(full) { return String(full || '').trim().split(/\s+/)[0] || 'Привет'; }

  function copyFor(row, key) {
    var t = TEMPLATES[key].text(firstName(row.name));
    // Первая строка всё равно дописывается руками — об этом сказано в подсказке
    // под таблицей, потому что одинаковые начала ВК и режет.
    if (navigator.clipboard) navigator.clipboard.writeText(t);
    return t;
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
        '<button id="expFind" style="padding:9px 18px;border-radius:8px;border:none;background:var(--accent-grad);color:#fff;font:inherit;font-weight:700;cursor:pointer">Разобрать друзей</button>' +
        '<span id="expStatus" style="font-size:12px;color:var(--text-dim)"></span>' +
      '</div>' +
      '<div id="expSummary" style="margin-bottom:12px"></div>' +
      '<div id="expList"></div>' +
      '<p style="color:var(--text-dim);font-size:12px;line-height:1.6;max-width:760px;margin:16px 0 0">' +
        'Кнопка кладёт текст в буфер — отправлять руками. Допишите каждому свою первую строку: ' +
        'одинаковые начала ВК распознаёт как рассылку. Десять-пятнадцать сообщений в день, не больше.</p>';

    var host = document.querySelector('main') || document.body;
    host.appendChild(sec);

    btn.addEventListener('click', function () {
      document.querySelectorAll('#navBar button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('main > section').forEach(function (s) { s.style.display = 'none'; });
      sec.style.display = '';
    });
    document.getElementById('expFind').addEventListener('click', find);
  }

  async function find() {
    var btn = document.getElementById('expFind');
    var status = document.getElementById('expStatus');
    btn.disabled = true; status.textContent = 'читаю друзей и профили…';
    try {
      var r = await api('/api/admin/vk/experts/preview', {
        min_nado: parseInt(document.getElementById('expNado').value, 10),
        min_hochet: parseInt(document.getElementById('expHochet').value, 10) || 0,
        limit: 300,
      });
      DATA = r.candidates || [];
      render(r);
      status.textContent = '';
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
      ' · из них горячие (надо ≥ 3 и захочет ≥ 3): <b style="color:var(--success)">' + r.hot + '</b></div>' +
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
            badge(c.nado, 'надо', 3) + badge(c.hochet, 'хочет', 3) +
            (c.contacted ? '<span style="font-size:11px;color:var(--success)">уже писали</span>' : '') +
          '</div>' +
          '<div style="font-size:12px;color:var(--text-dim);margin-top:3px">' +
            esc([c.profession, c.occupation, c.city].filter(Boolean).join(' · ')) + '</div>' +
          (c.status ? '<div style="font-size:11.5px;color:var(--text-dim);margin-top:2px;font-style:italic">«' + esc(c.status) + '»</div>' : '') +
          '<div style="font-size:11px;color:var(--text-dim);margin-top:4px">' + esc(c.why) + '</div>' +
          '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
            Object.keys(TEMPLATES).map(function (k) {
              return '<button data-copy="' + i + '" data-tpl="' + k + '" style="padding:5px 11px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--text);font:inherit;font-size:11.5px;cursor:pointer">' +
                esc(TEMPLATES[k].title) + '</button>';
            }).join('') +
            '<button data-mark="' + i + '" style="padding:5px 11px;border-radius:7px;border:1px solid rgba(52,211,153,0.4);background:transparent;color:var(--success);font:inherit;font-size:11.5px;cursor:pointer">Отметить «написал»</button>' +
          '</div>' +
        '</div></div>';
    }).join('');

    list.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        copyFor(DATA[+b.dataset.copy], b.dataset.tpl);
        var t = b.textContent; b.textContent = 'скопировано';
        setTimeout(function () { b.textContent = t; }, 1200);
      });
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
