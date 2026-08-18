// ============================================
// perehod.js — Симулятор «Переход»: месяц из десяти решений.
//
// Не тест с вариантами, а прогон месяца со сквозными последствиями.
// У игрока четыре ресурса — деньги, силы, доверие близких и три паузы
// на весь месяц. Каждое решение тратит и меняет их, а следующая сцена
// приходит уже в изменившемся состоянии.
//
// Три механики, ради которых всё это затевалось:
//
//   1. Усталость закрывает вдумчивые ходы. Когда сил меньше 35, варианты
//      «посчитать» и «уточнить» становятся недоступны — ровно как в
//      жизни. Это буквальное проигрывание тезиса восьмой лекции курса:
//      состояние решает раньше вас.
//   2. Паузы конечны. Пауза ломает почти любой приём, но её три на
//      месяц, поэтому приходится выбирать, где она нужнее.
//   3. Не все сцены — манипуляции. Две из десяти честные, и пауза с
//      отказом там стоит денег или возможности. Игра наказывает и
//      наивность, и паранойю: цель не «никому не верить», а различать.
//
// Экспорт: window.showPerehodGame, window.PEREHOD
// ============================================
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
  function container() { return document.getElementById('screenContainer'); }
  function vibe(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rub(n) {
    var s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (n < 0 ? '−' : '') + s + ' ₽';
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---------------------------------------------------------------- рисунки
  // Сцены рисованные, а не фотографические: на маленьком экране схема
  // читается быстрее снимка, а собственная тёмная панель делает картинку
  // одинаковой в светлой и тёмной теме приложения.
  var P = {
    bg: '#0E1219', panel: '#171D28', line: '#2C3546', txt: '#C8CEDA',
    dim: '#7C8798', blue: '#3B82FF', warm: '#F5A524', bad: '#EF4444', good: '#10B981'
  };

  function frame(inner, h) {
    return '<svg class="pe-art" viewBox="0 0 640 ' + (h || 200) + '" role="img" aria-hidden="true" ' +
      'style="width:100%;height:auto;display:block">' +
      '<rect width="640" height="' + (h || 200) + '" rx="16" fill="' + P.bg + '"/>' + inner + '</svg>';
  }

  var ART = {
    // Витрина кредита: крупный платёж и мелкая ставка рядом.
    bank: function () {
      return frame(
        '<rect x="196" y="24" width="248" height="152" rx="18" fill="' + P.panel + '" stroke="' + P.line + '"/>' +
        '<rect x="212" y="44" width="216" height="86" rx="10" fill="#0B0F16"/>' +
        '<text x="320" y="86" text-anchor="middle" font-size="30" font-weight="700" fill="' + P.warm + '">9 400 ₽</text>' +
        '<text x="320" y="106" text-anchor="middle" font-size="12" fill="' + P.dim + '">в месяц — как раз по силам</text>' +
        '<text x="320" y="124" text-anchor="middle" font-size="8" fill="#4A5568">ставка 14,9% · срок 5 лет · переплата 214 000 ₽</text>' +
        '<circle cx="126" cy="100" r="34" fill="none" stroke="' + P.bad + '" stroke-width="3" ' +
          'stroke-dasharray="150 64" transform="rotate(-90 126 100)"/>' +
        '<text x="126" y="96" text-anchor="middle" font-size="13" fill="' + P.txt + '">до конца</text>' +
        '<text x="126" y="112" text-anchor="middle" font-size="13" fill="' + P.txt + '">недели</text>' +
        '<path d="M488 78 q22 -20 44 0" stroke="' + P.dim + '" stroke-width="2" fill="none"/>' +
        '<circle cx="510" cy="104" r="18" fill="' + P.panel + '" stroke="' + P.line + '"/>' +
        '<path d="M502 104 h16 M510 96 v16" stroke="' + P.dim + '" stroke-width="2"/>', 200);
    },
    // Подписка: один щелчок на входе, двенадцать списаний на выходе.
    sub: function () {
      var dots = '';
      for (var i = 0; i < 12; i++) {
        dots += '<circle cx="' + (150 + i * 30) + '" cy="150" r="7" fill="' +
          (i === 0 ? P.good : 'rgba(239,68,68,.55)') + '"/>';
      }
      return frame(
        '<rect x="150" y="34" width="340" height="76" rx="14" fill="' + P.panel + '" stroke="' + P.line + '"/>' +
        '<text x="176" y="66" font-size="15" fill="' + P.txt + '">Пробный месяц бесплатно</text>' +
        '<text x="176" y="90" font-size="12" fill="' + P.dim + '">отмена в любой момент</text>' +
        '<rect x="404" y="56" width="60" height="30" rx="15" fill="rgba(16,185,129,.25)" stroke="' + P.good + '"/>' +
        '<circle cx="449" cy="71" r="11" fill="' + P.good + '"/>' +
        dots +
        '<text x="320" y="182" text-anchor="middle" font-size="12" fill="' + P.dim + '">один зелёный месяц, одиннадцать оплаченных</text>', 200);
    },
    // Полка: последняя вещь и очередь за спиной.
    shop: function () {
      return frame(
        '<rect x="120" y="40" width="400" height="96" rx="12" fill="' + P.panel + '" stroke="' + P.line + '"/>' +
        '<rect x="146" y="60" width="80" height="56" rx="8" fill="#0B0F16" stroke="' + P.line + '" stroke-dasharray="4 4"/>' +
        '<rect x="264" y="60" width="80" height="56" rx="8" fill="#0B0F16" stroke="' + P.line + '" stroke-dasharray="4 4"/>' +
        '<rect x="382" y="60" width="80" height="56" rx="8" fill="' + P.warm + '" opacity=".9"/>' +
        '<text x="422" y="94" text-anchor="middle" font-size="12" font-weight="700" fill="#1A1200">последняя</text>' +
        '<circle cx="180" cy="164" r="9" fill="' + P.dim + '"/><circle cx="206" cy="164" r="9" fill="' + P.dim + '"/>' +
        '<circle cx="232" cy="164" r="9" fill="' + P.dim + '"/><circle cx="258" cy="164" r="9" fill="' + P.dim + '"/>' +
        '<text x="290" y="169" font-size="12" fill="' + P.dim + '">«все берут именно её»</text>', 200);
    },
    // Мастер: маленький подарок и большой счёт.
    master: function () {
      return frame(
        '<rect x="120" y="96" width="70" height="52" rx="8" fill="' + P.panel + '" stroke="' + P.line + '"/>' +
        '<path d="M120 112 h70 M155 96 v52" stroke="' + P.good + '" stroke-width="2"/>' +
        '<text x="155" y="170" text-anchor="middle" font-size="11" fill="' + P.dim + '">розетка даром</text>' +
        '<path d="M210 122 h60" stroke="' + P.dim + '" stroke-width="2"/>' +
        '<path d="M270 122 l-10 -6 v12 z" fill="' + P.dim + '"/>' +
        '<rect x="292" y="36" width="220" height="140" rx="10" fill="' + P.panel + '" stroke="' + P.line + '"/>' +
        '<text x="316" y="70" font-size="14" fill="' + P.txt + '">Проводка в коридоре</text>' +
        '<path d="M316 88 h172 M316 106 h172 M316 124 h120" stroke="' + P.line + '" stroke-width="2"/>' +
        '<text x="488" y="156" text-anchor="end" font-size="20" font-weight="700" fill="' + P.warm + '">48 000 ₽</text>', 200);
    },
    // Честное предложение: документ без часов и без давления.
    offer: function () {
      return frame(
        '<rect x="180" y="30" width="280" height="146" rx="12" fill="' + P.panel + '" stroke="' + P.blue + '"/>' +
        '<text x="206" y="62" font-size="14" fill="' + P.txt + '">Проект на три месяца</text>' +
        '<path d="M206 82 l8 8 16 -18" stroke="' + P.good + '" stroke-width="2.5" fill="none"/>' +
        '<text x="240" y="88" font-size="12" fill="' + P.dim + '">сроки и деньги названы сразу</text>' +
        '<path d="M206 112 l8 8 16 -18" stroke="' + P.good + '" stroke-width="2.5" fill="none"/>' +
        '<text x="240" y="118" font-size="12" fill="' + P.dim + '">ответ можно дать на неделе</text>' +
        '<path d="M206 142 l8 8 16 -18" stroke="' + P.good + '" stroke-width="2.5" fill="none"/>' +
        '<text x="240" y="148" font-size="12" fill="' + P.dim + '">условия одинаковы для всех</text>' +
        '<circle cx="96" cy="100" r="30" fill="none" stroke="' + P.blue + '" stroke-width="2.5"/>' +
        '<path d="M96 82 v20 l14 8" stroke="' + P.blue + '" stroke-width="2.5" fill="none"/>' +
        '<text x="96" y="152" text-anchor="middle" font-size="11" fill="' + P.dim + '">никто не торопит</text>', 200);
    },
    // Кухня: раковина и две реплики, идущие друг в друга.
    kitchen: function () {
      return frame(
        '<rect x="60" y="104" width="180" height="64" rx="10" fill="' + P.panel + '" stroke="' + P.line + '"/>' +
        '<ellipse cx="150" cy="128" rx="52" ry="14" fill="#0B0F16"/>' +
        '<circle cx="128" cy="122" r="12" fill="' + P.line + '"/><circle cx="152" cy="118" r="14" fill="' + P.line + '"/>' +
        '<circle cx="174" cy="124" r="11" fill="' + P.line + '"/>' +
        '<path d="M300 44 h150 a10 10 0 0 1 10 10 v40 a10 10 0 0 1 -10 10 h-120 l-18 18 v-18 h-12 a10 10 0 0 1 -10 -10 v-40 a10 10 0 0 1 10 -10z" ' +
          'fill="rgba(239,68,68,.16)" stroke="' + P.bad + '"/>' +
        '<text x="316" y="76" font-size="13" fill="' + P.txt + '">«ты опять ничего…»</text>' +
        '<path d="M470 108 h-150 a10 10 0 0 0 -10 10 v36 a10 10 0 0 0 10 10 h118 l18 16 v-16 h14 a10 10 0 0 0 10 -10 v-36 a10 10 0 0 0 -10 -10z" ' +
          'fill="rgba(245,165,36,.14)" stroke="' + P.warm + '"/>' +
        '<text x="330" y="140" font-size="13" fill="' + P.txt + '">«а я вообще-то…»</text>', 200);
    },
    // Мать: звонок и груз долга.
    mother: function () {
      return frame(
        '<rect x="240" y="26" width="160" height="120" rx="16" fill="' + P.panel + '" stroke="' + P.line + '"/>' +
        '<circle cx="320" cy="70" r="24" fill="rgba(59,130,255,.18)" stroke="' + P.blue + '"/>' +
        '<text x="320" y="76" text-anchor="middle" font-size="18">📞</text>' +
        '<text x="320" y="116" text-anchor="middle" font-size="13" fill="' + P.txt + '">мама</text>' +
        '<path d="M320 150 v18" stroke="' + P.dim + '" stroke-width="2"/>' +
        '<rect x="268" y="168" width="104" height="22" rx="6" fill="rgba(239,68,68,.18)" stroke="' + P.bad + '"/>' +
        '<text x="320" y="184" text-anchor="middle" font-size="11" fill="' + P.txt + '">«я всю жизнь…»</text>' +
        '<text x="120" y="96" font-size="12" fill="' + P.dim + '">вина</text>' +
        '<path d="M150 92 h60" stroke="' + P.bad + '" stroke-width="2"/>' +
        '<path d="M210 92 l-10 -6 v12 z" fill="' + P.bad + '"/>' +
        '<text x="470" y="96" font-size="12" fill="' + P.dim + '">«все нормальные»</text>', 200);
    },
    // Ночь: письмо, которое хочется отправить сейчас.
    night: function () {
      return frame(
        '<rect x="170" y="34" width="300" height="120" rx="10" fill="' + P.panel + '" stroke="' + P.line + '"/>' +
        '<rect x="186" y="50" width="268" height="70" rx="6" fill="#0B0F16"/>' +
        '<path d="M202 68 h180 M202 86 h214 M202 104 h150" stroke="#38414F" stroke-width="3"/>' +
        '<rect x="376" y="126" width="78" height="22" rx="11" fill="' + P.bad + '"/>' +
        '<text x="415" y="141" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">Отправить</text>' +
        '<rect x="150" y="154" width="340" height="8" rx="4" fill="' + P.line + '"/>' +
        '<text x="96" y="60" font-size="22" font-weight="700" fill="' + P.warm + '">23:47</text>' +
        '<text x="96" y="80" font-size="11" fill="' + P.dim + '">сил осталось мало</text>' +
        '<circle cx="536" cy="112" r="16" fill="none" stroke="' + P.dim + '" stroke-width="2"/>' +
        '<path d="M536 100 v12 h10" stroke="' + P.dim + '" stroke-width="2" fill="none"/>', 200);
    },
    // Вложение: график вверх и обрыв пунктиром.
    invest: function () {
      return frame(
        '<path d="M90 160 L200 128 L300 96 L400 62" stroke="' + P.good + '" stroke-width="3" fill="none"/>' +
        '<path d="M400 62 L470 40" stroke="' + P.good + '" stroke-width="3" fill="none" opacity=".5"/>' +
        '<path d="M470 40 L520 170" stroke="' + P.bad + '" stroke-width="3" stroke-dasharray="7 6" fill="none"/>' +
        '<circle cx="400" cy="62" r="6" fill="' + P.good + '"/>' +
        '<text x="120" y="60" font-size="20" font-weight="700" fill="' + P.good + '">+20% в месяц</text>' +
        '<text x="120" y="82" font-size="12" fill="' + P.dim + '">«я сам полгода получаю»</text>' +
        '<text x="470" y="188" text-anchor="middle" font-size="11" fill="' + P.bad + '">вход закрывается в воскресенье</text>' +
        '<path d="M60 170 h520" stroke="' + P.line + '" stroke-width="1.5"/>', 200);
    },
    // Начальник: авторитет и срок вместо разбора.
    boss: function () {
      return frame(
        '<rect x="90" y="60" width="460" height="18" rx="9" fill="' + P.panel + '" stroke="' + P.line + '"/>' +
        '<circle cx="170" cy="120" r="26" fill="' + P.panel + '" stroke="' + P.warm + '" stroke-width="2"/>' +
        '<text x="170" y="126" text-anchor="middle" font-size="16">🗣️</text>' +
        '<text x="212" y="112" font-size="14" fill="' + P.txt + '">«я двадцать лет в профессии»</text>' +
        '<text x="212" y="134" font-size="12" fill="' + P.dim + '">«обсуждать некогда, сдаём в пятницу»</text>' +
        '<circle cx="500" cy="122" r="30" fill="none" stroke="' + P.bad + '" stroke-width="3" ' +
          'stroke-dasharray="120 68" transform="rotate(-90 500 122)"/>' +
        '<text x="500" y="127" text-anchor="middle" font-size="12" fill="' + P.txt + '">пт</text>', 200);
    },
    // Врач: честная услуга, где спешка настоящая.
    clinic: function () {
      return frame(
        '<rect x="200" y="34" width="240" height="132" rx="14" fill="' + P.panel + '" stroke="' + P.blue + '"/>' +
        '<path d="M320 62 v44 M298 84 h44" stroke="' + P.blue + '" stroke-width="6" stroke-linecap="round"/>' +
        '<text x="320" y="134" text-anchor="middle" font-size="13" fill="' + P.txt + '">результат анализов</text>' +
        '<text x="320" y="154" text-anchor="middle" font-size="11" fill="' + P.dim + '">повторить приём на этой неделе</text>' +
        '<text x="106" y="104" font-size="12" fill="' + P.dim + '">срочность</text>' +
        '<text x="106" y="122" font-size="12" fill="' + P.good + '">настоящая</text>' +
        '<path d="M500 74 v56" stroke="' + P.line + '" stroke-width="2"/>' +
        '<text x="524" y="106" font-size="11" fill="' + P.dim + '">без скидок</text>', 200);
    }
  };

  // ---------------------------------------------------------------- сцены
  // Порядок фиксированный: месяц идёт по дням, силы садятся, и поздние
  // сцены встречают человека уже уставшим. В этом и смысл — перемешивать
  // нельзя, иначе исчезает накопление.
  var SCENES = [
    {
      id: 'bank', day: 2, area: 'dengi', art: 'bank', honest: false,
      who: 'Звонок из банка',
      line: 'Вам одобрен кредит на выгодных условиях, платёж всего 9 400 в месяц. Одобрение действует до конца недели, потом система его снимет.',
      marks: [
        { q: 'платёж всего 9 400 в месяц', l: 'маленькое число вместо полной суммы' },
        { q: 'до конца недели', l: 'дефицит: срок на раздумье' },
        { q: 'система его снимет', l: 'безличная сила: отказывает не человек' }
      ],
      cost: 3,
      opts: [
        { t: 'Согласиться: платёж по карману', own: 0, mech: 'дефицит + маленькое число',
          eff: { money: -18000, energy: -4 },
          why: 'Решение приняли за вас дважды: показали сумму за месяц вместо переплаты и поставили срок. За год из бюджета уйдёт 18 000, а всего переплата составит 214 000.' },
        { t: 'Спросить полную сумму выплат и переплату', own: 2, need: 35, mech: 'вопрос об устройстве',
          eff: { energy: -5 },
          why: 'Тот самый вопрос, который витрина не задаёт. Услышав «переплата 214 000», человек обычно решает иначе — и это решение уже его.' },
        { t: 'Резко отказать и бросить трубку', own: 1, mech: 'защита без понимания',
          eff: { energy: -6, trust: 0 },
          why: 'Вас не поймали, но вы ничего не узнали: в следующий раз при похожем звонке будет так же неуютно. Отказ по форме, а не по устройству.' }
      ],
      pause: { own: 2, eff: { energy: 6 },
        why: 'Сутки — и одобрение либо доживёт до завтра, либо покажет себя изготовленным. Ни один честный кредит за ночь не исчезает.' }
    },
    {
      id: 'sub', day: 5, area: 'dengi', art: 'sub', honest: false,
      who: 'Приложение',
      line: 'Пробный месяц бесплатно, отмена в любой момент. Нужно только привязать карту — это займёт десять секунд.',
      marks: [
        { q: 'отмена в любой момент', l: 'обещание лёгкого выхода' },
        { q: 'займёт десять секунд', l: 'разница усилий: вход в одно нажатие' }
      ],
      cost: 2,
      opts: [
        { t: 'Подключить, потом разберусь', own: 0, mech: 'разница усилий',
          eff: { money: -17880, energy: -2 },
          why: 'Вход в одно нажатие, выход — через четыре экрана. Расчёт на то, что отменять вы будете в раздражении и отложите. За год это 17 880 рублей.' },
        { t: 'Подключить и сразу поставить напоминание за три дня', own: 2, mech: 'вы обезвредили механизм',
          eff: { energy: -3 },
          why: 'Пробный период честен ровно до тех пор, пока вы помните дату. Напоминание возвращает решение вам и стоит полминуты.' },
        { t: 'Посчитать годовую стоимость и решить по ней', own: 2, need: 35, mech: 'перевод в год',
          eff: { energy: -4 },
          why: '«399 в месяц» и «почти восемнадцать тысяч в год» ощущаются по-разному, хотя это одно и то же число.' }
      ],
      pause: { own: 1, eff: { energy: 6 },
        why: 'Пауза здесь работает, но избыточна: подписка не давит сроком. Хватило бы напоминания — а паузу лучше приберечь для того, что торопит.' }
    },
    {
      id: 'offer', day: 8, area: 'vliyanie', art: 'offer', honest: true,
      who: 'Знакомый по работе',
      line: 'Есть проект на три месяца. Деньги и сроки вот такие, условия для всех одинаковые. Ответь на неделе, мне не горит.',
      marks: [
        { q: 'условия для всех одинаковые', l: 'нет исключительности — признак честного' },
        { q: 'Ответь на неделе, мне не горит', l: 'нет спешки: приём без неё не работает' }
      ],
      cost: 3,
      honestNote: 'Здесь нет ни одного приёма: сроки названы, срочности нет, условия общие. Отказ «на всякий случай» стоит возможности.',
      opts: [
        { t: 'Уточнить объём и сказать «да»', own: 2, mech: 'решение по содержанию',
          eff: { money: 40000, energy: -4 },
          why: 'Вы отреагировали на суть, а не на форму. Предложение честное: сроки названы, спешки нет, условия общие — проверять было нечего, кроме самого содержания.' },
        { t: 'Отказаться: наверняка какой-то подвох', own: 0, mech: 'паранойя вместо проверки',
          eff: { energy: -4, trust: -5 },
          why: 'Это не переход, а другая крайность: теперь вами управляет подозрительность. Цель — различать, а не отказывать по умолчанию. Возможность потеряна.' },
        { t: 'Согласиться не глядя — человек хороший', own: 1, mech: 'доверие вместо разбора',
          eff: { money: 40000, energy: -6 },
          why: 'В этот раз повезло: предложение и правда честное. Но решение вы приняли по симпатии, а не по содержанию, и в следующий раз тот же ход сработает против вас.' }
      ],
      pause: { own: 1, eff: { energy: 6 },
        why: 'Пауза не повредила, но и не понадобилась: вам её сами предложили. Одна из трёх потрачена там, где ничто не давило.' }
    },
    {
      id: 'shop', day: 11, area: 'vliyanie', art: 'shop', honest: false,
      who: 'Продавец',
      line: 'Эту модель разобрали, осталась последняя. Все берут именно её, вон и коллеги ваши брали на прошлой неделе.',
      marks: [
        { q: 'осталась последняя', l: 'дефицит' },
        { q: 'Все берут именно её', l: 'социальное доказательство' },
        { q: 'коллеги ваши', l: 'близкая группа: «такие же, как вы»' }
      ],
      cost: 3,
      opts: [
        { t: 'Взять, пока не разобрали', own: 0, mech: 'дефицит + социальное доказательство',
          eff: { money: -34000, energy: -4 },
          why: 'Два приёма подряд: сначала ограничили время, потом подменили ваш критерий чужим поведением. Вопрос «зачем мне эта вещь» в разговоре так и не прозвучал.' },
        { t: 'Спросить, что изменится, если приду завтра', own: 2, mech: 'проверка дефицита',
          eff: { energy: -3 },
          why: 'Настоящий дефицит переживёт вопрос спокойно, изготовленный начнёт нервничать. Ответ продавца — и есть ваша информация.' },
        { t: 'Уточнить, чем эта модель лучше для моей задачи', own: 2, need: 35, mech: 'возврат к своему критерию',
          eff: { energy: -5 },
          why: 'Вы вернули разговор туда, где решение принимаете вы: к тому, зачем вам вещь. Дефицит без вашего критерия просто повисает в воздухе.' }
      ],
      pause: { own: 2, eff: { energy: 6 },
        why: 'Сутки на решение — и «последняя» либо найдётся, либо появится такая же в другом месте. Так бывает почти всегда.' }
    },
    {
      id: 'kitchen', day: 14, area: 'otnosheniya', art: 'kitchen', honest: false,
      who: 'Вечер, кухня',
      line: 'Оба устали, в раковине посуда с утра. Вы открываете рот, чтобы что-то сказать.',
      marks: [],
      selfNote: 'Подсвечивать нечего: здесь никто вас не обрабатывает. Приёмы — «опять», ' +
        '«ничего», «всегда» — в этой сцене ваши собственные. Обобщение в первой фразе ' +
        'запускает оборону, и дальше разговор идёт уже не про посуду.',
      cost: 4,
      opts: [
        { t: '«Ты опять ничего не сделал»', own: 0, mech: 'оценка запускает круг',
          eff: { trust: -18, energy: -10 },
          why: 'Обобщение «опять» и преувеличение «ничего» требуют обороны. Через две реплики посуда из разговора исчезнет, останется спор о том, кто больше устаёт.' },
        { t: '«Я вымотана, раковина меня добивает. Помоешь, пока я укладываю?»', own: 2, need: 30, mech: 'описание и просьба',
          eff: { trust: 4, energy: -3 },
          why: 'С оценкой можно спорить, с описанием — нет. Просьба смотрит в будущее и называет конкретное действие, поэтому оборона не запускается.' },
        { t: 'Промолчать и вымыть самой', own: 1, mech: 'медленный шаг того же круга',
          eff: { trust: -4, energy: -12 },
          why: 'Невысказанное копится и вернётся на следующем обороте — обычно в удвоенном размере и не про посуду.' }
      ],
      pause: { own: 1, eff: { energy: 6, trust: 2 },
        why: 'Отложить разговор до утра — рабочий ход, но паузу здесь можно было и не тратить: достаточно было изменить первую фразу.' }
    },
    {
      id: 'master', day: 17, area: 'vliyanie', art: 'master', honest: false,
      who: 'Мастер после ремонта',
      line: 'Я вам тут бесплатно розетку поменял, мелочь, но пусть будет. Кстати, могу и проводку в коридоре — материал сегодня недорогой.',
      marks: [
        { q: 'бесплатно розетку поменял', l: 'взаимность: услуга авансом' },
        { q: 'материал сегодня недорогой', l: 'мягкий дефицит' }
      ],
      cost: 3,
      opts: [
        { t: 'Согласиться — человек ведь помог', own: 0, mech: 'взаимность',
          eff: { money: -48000, energy: -5 },
          why: 'Мелкая услуга авансом сделала крупный отказ неловким. Долг вы почувствовали, хотя ни о чём не просили, и заплатили за него 48 000.' },
        { t: 'Поблагодарить и сказать, что решение приму отдельно', own: 2, mech: 'разделение благодарности и обязательства',
          eff: { energy: -3 },
          why: '«Спасибо, это было полезно» и «поэтому я должен купить» — два разных предложения. Вы их разделили, и это ровно то, чего приём не выдерживает.' },
        { t: 'Спросить цену и согласиться, если недорого', own: 1, mech: 'частично ваше',
          eff: { money: -48000, energy: -6 },
          why: 'Цену вы уточнили, но решение принимается в чужом темпе и на чужой территории: вы всё ещё отвечаете на предложение, а не на свою потребность.' }
      ],
      pause: { own: 2, eff: { energy: 6 },
        why: 'Сутки убирают и неловкость, и «сегодняшний недорогой материал». Если предложение честное, оно доживёт до завтра.' }
    },
    {
      id: 'clinic', day: 20, area: 'golova', art: 'clinic', honest: true,
      who: 'Врач',
      line: 'По анализам есть отклонение. Нужно повторить приём на этой неделе — не откладывайте, пожалуйста.',
      marks: [
        { q: 'на этой неделе', l: 'срочность из вашей жизни, а не из чужого предложения' }
      ],
      cost: 3,
      honestNote: 'Настоящая срочность приходит из вашей жизни: здоровье, безопасность, сроки, о которых вы знали. Изготовленная — из чужого предложения.',
      opts: [
        { t: 'Записаться сразу', own: 2, mech: 'различение настоящей срочности',
          eff: { energy: -3 },
          why: 'Пауза — инструмент против изготовленной спешки, а не универсальное правило. Здесь срочность идёт из вашей жизни, и откладывать её нечем.' },
        { t: 'Взять сутки на подумать: везде торопят', own: 0, mech: 'правило вместо различения',
          eff: { energy: -4, trust: -2 },
          why: 'Правило, применённое не глядя, работает против вас. Врачу невыгодно ваше плохое здоровье — направление выгоды противоположно тому, что мы разбирали в манипуляциях.' },
        { t: 'Спросить, что будет, если ничего не делать', own: 2, need: 30, mech: 'вопрос о последствиях',
          eff: { energy: -4 },
          why: 'Правильный вопрос к любому, кто описывает вашу проблему. Честный специалист спокойно ответит, где риск реален, — и вы примете решение с открытыми глазами.' }
      ],
      pause: { own: 0, eff: { energy: -2 },
        why: 'Пауза потрачена там, где она вредит: отложенный приём не делает диагноз мягче. Паузу берут против чужой спешки, а не против своей жизни.' }
    },
    {
      id: 'mother', day: 23, area: 'otnosheniya', art: 'mother', honest: false,
      who: 'Мама по телефону',
      line: 'Я всю жизнь на вас потратила, а ты приезжаешь раз в месяц. Все нормальные дети звонят каждый день.',
      marks: [
        { q: 'Я всю жизнь на вас потратила', l: 'взаимность: неоплатный долг' },
        { q: 'Все нормальные дети', l: 'социальное доказательство плюс ярлык' }
      ],
      cost: 4,
      opts: [
        { t: 'Пообещать звонить каждый день', own: 0, mech: 'взаимность + ярлык',
          eff: { trust: -6, energy: -10 },
          why: 'Обещание дано из вины и почти наверняка не выдержится. Невыполненное обещание усилит следующий заход — круг станет туже.' },
        { t: '«Мне тоже не хватает. Давай по вторникам и субботам»', own: 2, need: 30, mech: 'конкретная договорённость',
          eff: { trust: 8, energy: -4 },
          why: 'Вы ответили на настоящую просьбу — о близости, — но в объёме, который выдержите. Выполнимая договорённость лечит круг, невыполнимая кормит его.' },
        { t: 'Сказать, что это манипуляция', own: 0, mech: 'разоблачение',
          eff: { trust: -14, energy: -9 },
          why: 'С близкими называние приёма вслух почти всегда запускает круг: человек защищается от диагноза, а не отвечает на просьбу. Обсуждать это стоит отдельно и не в момент давления.' }
      ],
      pause: { own: 2, eff: { energy: 6, trust: 2 },
        why: '«Я подумаю, как перестроить неделю, и скажу завтра» — пауза без диагноза. Решение возвращается вам, а отношения не задеты.' }
    },
    {
      id: 'invest', day: 26, area: 'dengi', art: 'invest', honest: false,
      who: 'Знакомый',
      line: 'Доходность двадцать процентов в месяц, я сам полгода получаю. Вход закрывается в воскресенье, потом только по знакомству.',
      marks: [
        { q: 'я сам полгода получаю', l: 'социальное доказательство от близкого' },
        { q: 'Вход закрывается в воскресенье', l: 'дефицит' },
        { q: 'только по знакомству', l: 'исключительность' }
      ],
      cost: 3,
      opts: [
        { t: 'Вложить немного, чтобы попробовать', own: 0, mech: 'дефицит + доверие к знакомому',
          eff: { money: -50000, energy: -6 },
          why: '«Немного» — способ согласиться, не признавая, что согласился. Приёмы сработали полностью, а вопрос об устройстве дохода так и не прозвучал.' },
        { t: 'Спросить, откуда берётся доходность', own: 2, need: 35, mech: 'вопрос об устройстве',
          eff: { energy: -4 },
          why: 'Главный вопрос про любые деньги: за счёт чего именно они появляются. Нет внятного ответа — нет и вложения, как бы ни был симпатичен человек.' },
        { t: 'Отказаться: похоже на пирамиду', own: 1, mech: 'ярлык вместо разбора',
          eff: { energy: -4 },
          why: 'Вывод, скорее всего, верный, но сделан по форме. В следующий раз форма будет другой, а устройство тем же — и ярлык не сработает.' }
      ],
      pause: { own: 2, eff: { energy: 6 },
        why: 'Закрывающийся вход — почти всегда изготовленная срочность. Пауза проверяет это бесплатно и без ссоры со знакомым.' }
    },
    {
      id: 'night', day: 29, area: 'golova', art: 'night', honest: false,
      who: 'Без четверти полночь',
      line: 'Вы устали, злитесь после переписки и держите палец над кнопкой «Отправить» на резком письме коллеге.',
      marks: [],
      selfNote: 'Собеседника в кадре нет — и разбирать нечего, кроме собственного состояния. ' +
        'Ровно тот случай, ради которого в HUD висят силы: в ноль сил решения не становятся ' +
        'умнее, они становятся необратимыми.',
      cost: 2,
      opts: [
        { t: 'Отправить — пусть знает', own: 0, mech: 'необратимое решение в плохом состоянии',
          eff: { trust: -16, energy: -8 },
          why: 'Письмо нельзя отменить. В таком состоянии это худший тип решения: необратимое, принятое на эмоции и защищаемое потом задним числом.' },
        { t: 'Сохранить в черновики и перечитать утром', own: 2, mech: 'обратимое вместо необратимого',
          eff: { energy: -1, trust: 2 },
          why: 'Текст не пропадёт, а утром вы прочтёте его глазами человека, который спал. В плохом состоянии допустимы только обратимые решения.' },
        { t: 'Переписать помягче и отправить сейчас', own: 1, mech: 'полумера',
          eff: { trust: -4, energy: -6 },
          why: 'Смягчение помогает, но решение всё равно принимается в том состоянии, из-за которого письмо и появилось.' }
      ],
      pause: { own: 2, eff: { energy: 6, trust: 2 },
        why: 'Ровно тот случай, ради которого пауза и придумана: до утра ничего не изменится, кроме вашей способности думать.' }
    }
  ];

  var AREA_NAME = { dengi: 'Деньги', vliyanie: 'Влияние', otnosheniya: 'Отношения', golova: 'Состояние' };
  var AREA_LEC = {
    dengi: ['Лекция 5. Деньги: считать, а не чувствовать', '/blog/lekciya-perehod-dengi.html'],
    vliyanie: ['Лекция 6. Влияние: узнать приём в момент применения', '/blog/lekciya-perehod-vliyanie.html'],
    otnosheniya: ['Лекция 7. Отношения: круг вместо правоты', '/blog/lekciya-perehod-otnosheniya.html'],
    golova: ['Лекция 8. Своя голова: состояние решает раньше вас', '/blog/lekciya-perehod-golova.html']
  };
  var START = { money: 60000, energy: 100, trust: 100, pauses: 3 };
  var BEST_KEY = 'perehod_best_v2';

  var ST = null;

  // ---------------------------------------------------------------- стили
  function styles() {
    if (document.getElementById('pe-styles')) return;
    var s = document.createElement('style');
    s.id = 'pe-styles';
    s.textContent = [
      // Палитра — из переменных приложения: экран бывает и тёмным, и светлым.
      '.pe-wrap{max-width:660px;margin:0 auto;padding:14px 14px 44px;color:var(--text-primary,#e8eaee)}',
      '.pe-h1{font-size:1.55rem;font-weight:700;margin:0 0 10px;color:var(--text-primary,#fff);letter-spacing:-.01em}',
      '.pe-lead{color:var(--text-secondary,#a8b0bd);font-size:.95rem;line-height:1.62;margin:0 0 16px}',
      '.pe-card{background:var(--bg-secondary,rgba(127,127,127,.07));border:1px solid var(--border-color,rgba(127,127,127,.20));border-radius:16px;padding:16px 18px;margin:0 0 12px}',
      '.pe-in{animation:peIn .32s cubic-bezier(.2,.7,.3,1) both}',
      '@keyframes peIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
      '@media (prefers-reduced-motion:reduce){.pe-in{animation:none}}',

      // строка ресурсов
      '.pe-hud{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 10px}',
      '.pe-res{background:var(--bg-secondary,rgba(127,127,127,.07));border:1px solid var(--border-color,rgba(127,127,127,.20));border-radius:12px;padding:8px 6px;text-align:center}',
      '.pe-res b{display:block;font-size:.95rem;font-variant-numeric:tabular-nums;color:var(--text-primary,#fff);transition:color .3s}',
      '.pe-res span{font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text-secondary,#8b94a3)}',
      '.pe-res.low b{color:#ef4444}',
      '.pe-res.warn b{color:#f59e0b}',

      // шкала «кто решает»
      '.pe-scale{margin:0 0 12px}',
      '.pe-scale-l{display:flex;justify-content:space-between;font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text-secondary,#8b94a3);margin-bottom:5px}',
      '.pe-track{position:relative;height:10px;border-radius:6px;background:linear-gradient(90deg,rgba(239,68,68,.35),rgba(127,127,127,.25),rgba(16,185,129,.4))}',
      '.pe-knob{position:absolute;top:-4px;width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid #3b82ff;transform:translateX(-50%);transition:left .55s cubic-bezier(.2,.7,.3,1);box-shadow:0 2px 8px rgba(0,0,0,.35)}',

      '.pe-day{font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;color:var(--text-secondary,#8b94a3);margin:2px 0 8px}',
      '.pe-art{border-radius:14px;margin:0 0 12px;box-shadow:0 6px 18px rgba(0,0,0,.18)}',
      '.pe-who{font-size:.76rem;letter-spacing:.08em;text-transform:uppercase;color:#3b82ff;font-weight:700;margin:0 0 6px}',
      '.pe-line{font-size:1.02rem;line-height:1.6;color:var(--text-primary,#fff);margin:0}',
      '.pe-mark{background:rgba(245,165,36,.22);border-bottom:2px solid #f59e0b;border-radius:3px;padding:0 2px}',
      '.pe-marklab{display:block;font-size:.8rem;color:var(--text-secondary,#9aa3b2);margin-top:6px;padding-left:14px;border-left:2px solid #f59e0b}',

      '.pe-opt{display:block;width:100%;text-align:left;background:var(--bg-secondary,rgba(127,127,127,.06));border:1px solid var(--border-color,rgba(127,127,127,.22));color:var(--text-primary,#e8eaee);border-radius:13px;padding:13px 15px;margin:8px 0;font:inherit;font-size:.97rem;line-height:1.45;cursor:pointer;transition:border-color .15s,background .15s,transform .1s}',
      '.pe-opt:hover{border-color:#3b82ff;background:rgba(59,130,255,.10)}',
      '.pe-opt:active{transform:scale(.995)}',
      '.pe-opt.lock{opacity:.55;cursor:not-allowed;border-style:dashed}',
      '.pe-opt.lock:hover{border-color:var(--border-color,rgba(127,127,127,.22));background:var(--bg-secondary,rgba(127,127,127,.06))}',
      '.pe-lockwhy{display:block;font-size:.78rem;color:#f59e0b;margin-top:5px}',
      '.pe-pause{display:block;width:100%;text-align:center;background:rgba(59,130,255,.12);border:1px dashed #3b82ff;color:var(--text-primary,#e8eaee);border-radius:13px;padding:12px;margin:12px 0 0;font:inherit;font-size:.95rem;font-weight:600;cursor:pointer}',
      '.pe-pause[disabled]{opacity:.45;cursor:not-allowed;border-style:solid}',

      '.pe-verdict{border-radius:13px;padding:14px 16px;margin:0 0 12px;font-size:.96rem;line-height:1.55;color:var(--text-primary,#e8eaee)}',
      '.pe-own2{background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.45)}',
      '.pe-own1{background:rgba(217,119,6,.14);border:1px solid rgba(217,119,6,.45)}',
      '.pe-own0{background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.45)}',
      '.pe-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}',
      '.pe-chip{font-size:.82rem;font-weight:600;border-radius:9px;padding:4px 9px;font-variant-numeric:tabular-nums}',
      '.pe-chip.up{background:rgba(16,185,129,.18);color:#0f9d76}',
      '.pe-chip.down{background:rgba(239,68,68,.18);color:#e05252}',
      '.pe-mech{font-size:.83rem;color:var(--text-secondary,#9aa3b2);margin-top:8px}',

      '.pe-btn{display:inline-block;background:#3b82ff;color:#fff;border:none;border-radius:12px;padding:13px 22px;font:inherit;font-weight:600;cursor:pointer;margin-top:10px;transition:background .15s,transform .12s}',
      '.pe-btn:hover{background:#2b6fe0}',
      '.pe-btn.sec{background:transparent;border:1px solid var(--border-color,rgba(127,127,127,.35));color:var(--text-secondary,#c8ccd4);margin-left:8px}',

      '.pe-score{font-size:2.1rem;font-weight:700;color:var(--text-primary,#fff);margin:0;font-variant-numeric:tabular-nums}',
      '.pe-sum{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0 0}',
      '.pe-sumi{background:var(--bg-secondary,rgba(127,127,127,.06));border-radius:12px;padding:10px 12px}',
      '.pe-sumi b{display:block;font-size:1.15rem;font-variant-numeric:tabular-nums;color:var(--text-primary,#fff)}',
      '.pe-sumi span{font-size:.76rem;color:var(--text-secondary,#8b94a3)}',
      '.pe-arow{display:flex;justify-content:space-between;font-size:.9rem;color:var(--text-primary,#c8ccd4);margin:8px 0 4px}',
      '.pe-bar{height:8px;border-radius:6px;background:rgba(127,127,127,.20);overflow:hidden}',
      '.pe-bar>i{display:block;height:100%;background:linear-gradient(90deg,#3b82ff,#6366f1);width:0;transition:width .8s cubic-bezier(.2,.7,.3,1)}',
      '.pe-link{color:#3b82ff;text-decoration:none;font-weight:600}',
      '.pe-link:hover{text-decoration:underline}',
      '.pe-note{font-size:.85rem;color:var(--text-secondary,#9aa3b2);line-height:1.55}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ------------------------------------------------------------ вспомогалки
  function hud() {
    function res(val, label, cls) {
      return '<div class="pe-res ' + (cls || '') + '"><b>' + val + '</b><span>' + label + '</span></div>';
    }
    var eCls = ST.energy < 35 ? 'low' : (ST.energy < 55 ? 'warn' : '');
    var tCls = ST.trust < 60 ? 'low' : (ST.trust < 80 ? 'warn' : '');
    return '<div class="pe-hud">' +
      res(rub(ST.money).replace(' ₽', ''), 'бюджет, ₽') +
      res(ST.energy, 'силы', eCls) +
      res(ST.trust, 'доверие', tCls) +
      res(ST.pauses, 'паузы', ST.pauses ? '' : 'warn') +
      '</div>';
  }

  function scale() {
    return '<div class="pe-scale"><div class="pe-scale-l"><span>решают за вас</span><span>решаете вы</span></div>' +
      '<div class="pe-track"><i class="pe-knob" style="left:' + clamp(ST.author, 3, 97) + '%"></i></div></div>';
  }

  function xray(sc) {
    var html = esc(sc.line);
    (sc.marks || []).forEach(function (m) {
      html = html.replace(esc(m.q), '<mark class="pe-mark">' + esc(m.q) + '</mark>');
    });
    var labs = (sc.marks || []).map(function (m) {
      return '<span class="pe-marklab">«' + esc(m.q) + '» — ' + esc(m.l) + '</span>';
    }).join('');
    return { line: html, labs: labs };
  }

  function apply(eff) {
    eff = eff || {};
    if (eff.money) ST.money += eff.money;
    if (eff.energy) ST.energy = clamp(ST.energy + eff.energy, 0, 100);
    if (eff.trust) ST.trust = clamp(ST.trust + eff.trust, 0, 100);
  }

  function chips(eff) {
    var out = [];
    if (eff.money) out.push('<span class="pe-chip ' + (eff.money > 0 ? 'up' : 'down') + '">' + rub(eff.money) + '</span>');
    if (eff.energy) out.push('<span class="pe-chip ' + (eff.energy > 0 ? 'up' : 'down') + '">' + (eff.energy > 0 ? '+' : '−') + Math.abs(eff.energy) + ' сил</span>');
    if (eff.trust) out.push('<span class="pe-chip ' + (eff.trust > 0 ? 'up' : 'down') + '">' + (eff.trust > 0 ? '+' : '−') + Math.abs(eff.trust) + ' доверия</span>');
    return out.length ? '<div class="pe-chips">' + out.join('') + '</div>' : '';
  }

  // ---------------------------------------------------------------- экраны
  function home() {
    styles();
    var c = container(); if (!c) return;
    track('game_open', { feature: 'perehod', game: 'perehod' });
    var best = lsGet(BEST_KEY);
    c.innerHTML =
      '<div class="pe-wrap pe-in">' +
        '<div class="pe-h1">🎚️ Переход</div>' +
        '<p class="pe-lead">Месяц вашей жизни: десять решений с первого по двадцать девятое число. ' +
        'Звонок из банка, последняя вещь на полке, мама по телефону, письмо без четверти полночь.<br><br>' +
        'Это не тест с правильными ответами. Игра показывает, <b>кто принял решение</b> — вы или тот, ' +
        'кто выстроил сцену, — и во что это обошлось.</p>' +
        '<div class="pe-card"><b>Что вы тратите</b>' +
          '<div class="pe-mech" style="margin-top:8px">' +
          '<b>Бюджет</b> — ' + rub(START.money) + ' свободных на месяц: плохие решения уносят настоящие суммы.<br>' +
          '<b>Силы</b> — падают к концу месяца. Когда их мало, вдумчивые ходы становятся недоступны: ' +
          'ровно так это работает и в жизни.<br>' +
          '<b>Доверие</b> — то, что остаётся у близких после ваших реплик.<br>' +
          '<b>Паузы</b> — три на весь месяц. Сутки на размышление ломают почти любой приём, но их мало, ' +
          'и не в каждой сцене они уместны.</div></div>' +
        '<div class="pe-card"><b>Осторожно с недоверием</b>' +
          '<div class="pe-mech" style="margin-top:8px">Не все десять сцен — манипуляции. Две из них честные, ' +
          'и отказ «на всякий случай» стоит там денег или возможности. Задача не «никому не верить», ' +
          'а различать.</div></div>' +
        (best ? '<div class="pe-note" style="margin:10px 0 0">Ваш прошлый результат: ' + esc(best) + '</div>' : '') +
        '<button class="pe-btn" onclick="PEREHOD.start()">Начать месяц</button>' +
        '<a class="pe-btn sec" href="/blog/lektorij/perehod/" style="text-decoration:none">Курс «Переход»</a>' +
      '</div>';
  }

  function start() {
    styles();
    ST = { i: 0, money: START.money, energy: START.energy, trust: START.trust,
           pauses: START.pauses, author: 50, log: [] };
    track('game_round_start', { feature: 'perehod', scenes: SCENES.length });
    scene();
  }

  function scene() {
    var c = container(); if (!c) return;
    var sc = SCENES[ST.i];

    var opts = sc.opts.map(function (o, k) {
      var locked = o.need && ST.energy < o.need;
      return '<button class="pe-opt' + (locked ? ' lock' : '') + '"' +
        (locked ? ' disabled' : ' onclick="PEREHOD.pick(' + k + ')"') + '>' +
        esc(o.t) +
        (locked ? '<span class="pe-lockwhy">На это сейчас нет сил: нужно ' + o.need + ', у вас ' + ST.energy + '</span>' : '') +
        '</button>';
    }).join('');

    var pauseBtn = '<button class="pe-pause"' + (ST.pauses > 0 ? ' onclick="PEREHOD.pause()"' : ' disabled') + '>' +
      (ST.pauses > 0 ? 'Взять сутки на размышление · осталось ' + ST.pauses : 'Паузы закончились') + '</button>';

    c.innerHTML =
      '<div class="pe-wrap pe-in">' +
        hud() + scale() +
        '<div class="pe-day">День ' + sc.day + ' · сцена ' + (ST.i + 1) + ' из ' + SCENES.length + ' · ' + esc(AREA_NAME[sc.area]) + '</div>' +
        ART[sc.art]() +
        // реплика идёт без подсветки: различить приём — это и есть задача игрока.
        // Разметку он увидит в разборе, когда решение уже принято.
        '<div class="pe-card"><div class="pe-who">' + esc(sc.who) + '</div>' +
          '<p class="pe-line">' + esc(sc.line) + '</p></div>' +
        opts + pauseBtn +
      '</div>';
    try { c.scrollTop = 0; } catch (e) {}
  }

  function resolve(o, isPause) {
    var sc = SCENES[ST.i];
    var eff = {};
    Object.keys(o.eff || {}).forEach(function (k) { eff[k] = o.eff[k]; });
    eff.energy = (eff.energy || 0) - sc.cost;   // сама сцена тоже стоит сил
    apply(eff);
    ST.author = clamp(ST.author + (o.own === 2 ? 9 : (o.own === 1 ? 0 : -11)), 0, 100);
    if (isPause) ST.pauses--;
    ST.log.push({ id: sc.id, area: sc.area, own: o.own, honest: !!sc.honest, mech: o.mech || 'пауза' });

    var x = xray(sc);
    var head = o.own === 2 ? 'Решение приняли вы' : (o.own === 1 ? 'Наполовину ваше' : 'Решили за вас');
    var best = sc.opts.filter(function (q) { return q.own === 2; })[0];
    vibe(o.own === 2 ? 12 : 26);

    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pe-wrap pe-in">' +
        hud() + scale() +
        '<div class="pe-day">День ' + sc.day + ' · разбор</div>' +
        '<div class="pe-verdict pe-own' + o.own + '"><b>' + head + '.</b> ' + esc(o.why) + chips(eff) +
          '<div class="pe-mech">Сработало: ' + esc(o.mech || 'пауза') + '</div></div>' +
        (x.labs
          ? '<div class="pe-card"><b>Рентген реплики</b><p class="pe-line" style="font-size:.95rem;margin:8px 0 10px">' + x.line + '</p>' + x.labs + '</div>'
          : (sc.selfNote
            ? '<div class="pe-card"><b>Рентген реплики</b><div class="pe-mech" style="margin-top:8px">' + esc(sc.selfNote) + '</div></div>'
            : '')) +
        (sc.honest ? '<div class="pe-card"><b>Это была честная сцена</b><div class="pe-mech" style="margin-top:8px">' + esc(sc.honestNote) + '</div></div>' : '') +
        (o.own < 2 && best && !isPause
          ? '<div class="pe-card"><b>Ход, который вернул бы решение вам</b><div class="pe-mech" style="margin-top:8px">«' + esc(best.t) + '». ' + esc(best.why) + '</div></div>'
          : '') +
        '<button class="pe-btn" onclick="PEREHOD.next()">' + (ST.i + 1 < SCENES.length ? 'Следующий день' : 'Итог месяца') + '</button>' +
      '</div>';
    try { c.scrollTop = 0; } catch (e) {}
  }

  function pick(k) { resolve(SCENES[ST.i].opts[k], false); }
  function pause() {
    if (ST.pauses <= 0) return;
    var p = SCENES[ST.i].pause;
    resolve({ t: 'Взять сутки', own: p.own, eff: p.eff, why: p.why, mech: 'пауза' }, true);
  }
  function next() {
    ST.i++;
    if (ST.i >= SCENES.length) return finale();
    scene();
  }

  // карта месяца: десять узлов на общей линии
  function mapSvg() {
    var w = 640, h = 120, x0 = 40, dx = (w - 80) / (SCENES.length - 1);
    var pts = ST.log.map(function (r, i) {
      var y = 88 - r.own * 26;
      return { x: x0 + i * dx, y: y, own: r.own, day: SCENES[i].day };
    });
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x + ' ' + p.y; }).join(' ');
    var nodes = pts.map(function (p) {
      var col = p.own === 2 ? P.good : (p.own === 1 ? P.warm : P.bad);
      return '<circle cx="' + p.x + '" cy="' + p.y + '" r="7" fill="' + col + '"/>' +
             '<text x="' + p.x + '" y="112" text-anchor="middle" font-size="9" fill="' + P.dim + '">' + p.day + '</text>';
    }).join('');
    return frame(
      '<text x="40" y="24" font-size="11" fill="' + P.dim + '">решали вы</text>' +
      '<text x="40" y="80" font-size="11" fill="' + P.dim + '">решали за вас</text>' +
      '<path d="M40 36 H600 M40 88 H600" stroke="' + P.line + '" stroke-width="1" stroke-dasharray="3 5"/>' +
      '<path d="' + path + '" stroke="' + P.blue + '" stroke-width="2.5" fill="none" opacity=".8"/>' + nodes, h);
  }

  function finale() {
    var own2 = ST.log.filter(function (r) { return r.own === 2; }).length;
    var total = ST.log.reduce(function (a, r) { return a + r.own; }, 0);
    var pct = Math.round(100 * total / (SCENES.length * 2));
    var spent = START.money - ST.money;

    // точность суждения: манипуляции распознаны и честные сцены не испорчены
    var manip = ST.log.filter(function (r) { return !r.honest; });
    var honest = ST.log.filter(function (r) { return r.honest; });
    var manipOk = manip.filter(function (r) { return r.own === 2; }).length;
    var honestOk = honest.filter(function (r) { return r.own === 2; }).length;

    var byArea = {};
    ST.log.forEach(function (r) {
      byArea[r.area] = byArea[r.area] || { got: 0, max: 0 };
      byArea[r.area].got += r.own; byArea[r.area].max += 2;
    });
    var weak = null;
    Object.keys(byArea).forEach(function (a) {
      var v = byArea[a].got / byArea[a].max;
      if (weak === null || v < weak.v) weak = { a: a, v: v };
    });

    var verdict;
    if (honestOk < honest.length && manipOk >= manip.length - 1)
      verdict = 'Приёмы вы видите хорошо — а вот честные предложения зацепило заодно. Это вторая крайность: правило, применённое не глядя, тоже решает за вас. Различать, а не отказывать.';
    else if (pct >= 80)
      verdict = 'Месяц прожит на своей стороне: вы держали и деньги, и разговоры, и себя в позднее время. Дальше растёт не знание приёмов, а внимание к собственному состоянию.';
    else if (pct >= 55)
      verdict = 'Половину сцен вы удержали. Смотрите на карту: провалы почти наверняка сгруппировались там, где силы были на нуле, — это не про ум, это про состояние.';
    else if (pct >= 30)
      verdict = 'В большинстве сцен решение принимали не вы. Хорошая новость: почти все ходы, которые вас поймали, ломаются одной привычкой — сутками на размышление.';
    else
      verdict = 'Месяц выстроили за вас. Начните не с приёмов, а с паузы: она одна обесценивает половину того, что здесь произошло.';

    var rows = Object.keys(byArea).map(function (a) {
      var v = Math.round(100 * byArea[a].got / byArea[a].max);
      return '<div class="pe-arow"><span>' + esc(AREA_NAME[a]) + '</span><span>' + v + '%</span></div>' +
        '<div class="pe-bar"><i data-w="' + v + '"></i></div>';
    }).join('');

    var lec = weak ? AREA_LEC[weak.a] : null;
    var line = own2 + ' из ' + SCENES.length + ' · ' + rub(-spent) + ' · силы ' + ST.energy;
    var prev = lsGet(BEST_KEY);
    lsSet(BEST_KEY, line);

    var c = container(); if (!c) return;
    c.innerHTML =
      '<div class="pe-wrap pe-in">' +
        '<div class="pe-day">Месяц закончился</div>' +
        '<div class="pe-card"><div class="pe-score">' + own2 + ' из ' + SCENES.length + '</div>' +
          '<div class="pe-mech" style="margin-top:2px">решений, где выбор вернулся вам · общий счёт ' + pct + '%</div>' +
          '<div class="pe-sum">' +
            '<div class="pe-sumi"><b>' + rub(ST.money) + '</b><span>' +
              (ST.money < 0 ? 'в минусе к концу месяца'
                : ST.money > START.money ? 'на старте было ' + rub(START.money)
                : 'осталось из ' + rub(START.money)) + '</span></div>' +
            '<div class="pe-sumi"><b>' + rub(-spent) + '</b><span>' +
              (spent >= 0 ? 'ушло за месяц' : 'пришло за месяц') + '</span></div>' +
            '<div class="pe-sumi"><b>' + ST.energy + '</b><span>сил к концу месяца</span></div>' +
            '<div class="pe-sumi"><b>' + ST.trust + '</b><span>доверия близких</span></div>' +
          '</div></div>' +
        '<div class="pe-card"><b>Карта месяца</b><div style="margin-top:10px">' + mapSvg() + '</div>' +
          '<div class="pe-mech">Каждая точка — день и решение. Верхняя линия — решали вы, нижняя — решали за вас.</div></div>' +
        '<div class="pe-card">' + esc(verdict) + '</div>' +
        '<div class="pe-card"><b>Точность различения</b>' +
          '<div class="pe-mech" style="margin-top:8px">Манипуляций распознано: <b>' + manipOk + ' из ' + manip.length + '</b>. ' +
          'Честных предложений не испорчено: <b>' + honestOk + ' из ' + honest.length + '</b>. ' +
          'Второе число важно не меньше первого: подозрительность ко всему — это не переход, а другая сторона той же несвободы.</div></div>' +
        '<div class="pe-card"><b>По областям</b><div style="margin-top:10px">' + rows + '</div></div>' +
        (lec ? '<div class="pe-card"><b>С чего начать</b><div class="pe-mech" style="margin-top:8px">Слабее всего — «' +
          esc(AREA_NAME[weak.a]) + '». Это разбирается здесь: <a class="pe-link" href="' + lec[1] + '">' + esc(lec[0]) + '</a></div></div>' : '') +
        (prev ? '<div class="pe-note">Прошлый заход: ' + esc(prev) + '</div>' : '') +
        '<button class="pe-btn" onclick="PEREHOD.start()">Прожить месяц заново</button>' +
        '<a class="pe-btn sec" href="/blog/lektorij/perehod/" style="text-decoration:none">Весь курс</a>' +
      '</div>';

    // полосы областей заполняются после отрисовки — иначе перехода не видно
    setTimeout(function () {
      var bars = document.querySelectorAll('.pe-bar > i');
      for (var i = 0; i < bars.length; i++) bars[i].style.width = bars[i].getAttribute('data-w') + '%';
    }, 60);

    try { c.scrollTop = 0; } catch (e) {}
    track('game_round_finish', {
      feature: 'perehod', score: pct, own: own2, spent: spent,
      energy: ST.energy, trust: ST.trust, manip_ok: manipOk, honest_ok: honestOk
    });
  }

  window.PEREHOD = { home: home, start: start, pick: pick, pause: pause, next: next,
                     getState: function () { return ST; } };
  window.showPerehodGame = home;
  console.log('✅ perehod.js loaded (симулятор «Переход», месяц из десяти решений)');
})();
