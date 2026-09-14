/**
 * «Обсудить результат с Фреди» — одна кнопка на все тесты страницы.
 *
 * Зачем. Раньше со страницы теста вела обычная ссылка на /fredi/, и
 * человек попадал в пустой чат: Фреди не знал ни что за тест, ни что
 * вышло, и начинал с «расскажите, что вас беспокоит». Человек, который
 * только что получил результат, вместо разбора получал анкету заново —
 * и уходил. Механизм передачи текста в приложении уже есть (openers.js,
 * параметр ?ask=), им пользуется большой тест; здесь он становится
 * доступен любому тесту на сайте.
 *
 * Как пользоваться со страницы теста:
 *
 *     FrediRazbor.mount({
 *       host: document.getElementById('resultBox'),   // куда вставить кнопку
 *       goal: 'revnost_open_fredi',                   // цель Метрики, необязательно
 *       text: function () { return 'Прошёл тест ...'; } // что отправить
 *     });
 *
 * text — функция или готовая строка. Вызывается сразу при mount():
 * его зовут уже после подсчёта результата, и собирать адрес в
 * обработчике клика нельзя — браузер успевает уйти по старому href.
 */
(function () {
    'use strict';

    // openers.js режет входящий текст до 600 знаков (ASK_MAX). Режем здесь
    // же и по границе предложения, иначе Фреди получает обрубок на
    // полуслове и переспрашивает вместо ответа.
    var MAX = 600;

    function trim(t) {
        t = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
        if (t.length <= MAX) return t;
        var cut = t.slice(0, MAX);
        var dot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
        return dot > MAX * 0.6 ? cut.slice(0, dot + 1) : cut;
    }

    function goal(id) {
        if (!id) return;
        try { window.ym(108138656, 'reachGoal', id); } catch (e) {}
    }

    function styles() {
        if (document.getElementById('fredi-razbor-css')) return;
        var s = document.createElement('style');
        s.id = 'fredi-razbor-css';
        s.textContent =
            '.frazbor{margin:22px 0 6px;padding:18px 20px;border:1px solid #C7D8FF;' +
            'border-left:4px solid #3A86FF;border-radius:14px;background:#F7FAFF}' +
            '.frazbor b{display:block;margin-bottom:6px;font-size:1.02rem}' +
            '.frazbor p{margin:0 0 12px;font-size:.95rem;color:#3c3c43}' +
            '.frazbor a{display:inline-block;background:#3A86FF;color:#fff;text-decoration:none;' +
            'font-weight:700;padding:13px 22px;border-radius:12px;font-size:1rem}' +
            '.frazbor a:hover{background:#1D4ED8}' +
            '.frazbor small{display:block;margin-top:8px;color:#6e6e73;font-size:.83rem}';
        document.head.appendChild(s);
    }

    function mount(opt) {
        opt = opt || {};
        var host = opt.host;
        if (!host || !opt.text) return null;
        if (typeof opt.text !== 'function') { var _t = opt.text; opt.text = function () { return _t; }; }
        styles();

        var box = document.createElement('div');
        box.className = 'frazbor';
        box.innerHTML =
            '<b>💬 Обсудить результат с Фреди</b>' +
            '<p>' + (opt.note || 'Он уже будет знать, что у вас вышло: не придётся объяснять заново. Разберёт, что это значит именно для вас, и поможет наметить первые шаги.') + '</p>' +
            '<a href="/fredi/">Обсудить — бесплатно</a>' +
            '<small>Без регистрации. Можно голосом.</small>';

        var a = box.querySelector('a');
        // Адрес собираем сразу: mount() зовут уже после подсчёта результата.
        // Собирать его в обработчике клика — ненадёжно: браузер успевает
        // уйти по старому href, и человек попадает в пустой чат (проверено
        // 14.09.2026, ask приходил пустым).
        var t = '';
        try { t = trim(opt.text()); } catch (err) {}
        if (t) a.href = '/fredi/?ask=' + encodeURIComponent(t);
        a.addEventListener('click', function () {
            goal(opt.goal);
            goal('open_fredi');
            goal('test_razbor_click');
        });

        host.appendChild(box);
        return box;
    }

    window.FrediRazbor = { mount: mount, trim: trim };
})();
