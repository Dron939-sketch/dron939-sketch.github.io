/**
 * «Прислать результат на почту» — один блок на короткие тесты сайта.
 *
 * Зачем. Большой тест внутри приложения спрашивает почту на знакомстве и
 * шлёт разбор письмом; короткие тесты не спрашивали ничего. За неделю
 * 15.09.2026 они дали 84 прохождения против 52 стартов большого — вдвое
 * больше людей, и ни одного адреса. Человек читал результат и уходил:
 * позвать его обратно было нечем.
 *
 * На страницу передаётся только ключ теста, полоса результата и балл —
 * текст письма собирается на сервере, из нашего каталога. Иначе ручка
 * стала бы открытым ретранслятором: нашим именем можно было бы
 * разослать что угодно.
 *
 * Со страницы теста:
 *
 *     TestMail.mount({
 *       host: document.getElementById('resultBox'),
 *       test: 'phq9',      // ключ из backend/short_test_mail.py
 *       band: 'moderate',  // полоса результата оттуда же
 *       score: 12,         // балл, если у теста есть шкала
 *       goal: 'phq9_mail'  // цель Метрики, необязательно
 *     });
 */
(function () {
    'use strict';

    var API = 'https://ffred-ddd989.amvera.io';
    var KEY = 'fredi_test_email';

    function goal(id) {
        if (!id) return;
        try { window.ym(108138656, 'reachGoal', id); } catch (e) {}
    }

    function styles() {
        if (document.getElementById('test-mail-css')) return;
        var s = document.createElement('style');
        s.id = 'test-mail-css';
        s.textContent =
            '.tmail{margin:22px 0 6px;padding:18px 20px;border:1px solid #E3D9C7;' +
            'border-left:4px solid #E9A825;border-radius:14px;background:#FFFDF7}' +
            '.tmail b{display:block;margin-bottom:6px;font-size:1.02rem}' +
            '.tmail p{margin:0 0 12px;font-size:.95rem;color:#3c3c43}' +
            '.tmail form{display:flex;flex-wrap:wrap;gap:10px}' +
            '.tmail input{flex:1 1 220px;min-width:0;padding:12px 14px;font-size:1rem;' +
            'border:1px solid #D8D2C4;border-radius:12px;background:#fff;color:#1d1d1f}' +
            '.tmail input:focus{outline:none;border-color:#E9A825}' +
            '.tmail button{background:#E9A825;color:#1D1D1F;border:0;font-weight:700;' +
            'padding:12px 22px;border-radius:12px;font-size:1rem;cursor:pointer}' +
            '.tmail button:hover{background:#D6960F}' +
            '.tmail button[disabled]{opacity:.55;cursor:default}' +
            '.tmail small{display:block;margin-top:9px;color:#6e6e73;font-size:.83rem}' +
            '.tmail .tmail-done{margin:0;font-size:.95rem;color:#1d1d1f}';
        document.head.appendChild(s);
    }

    function looksLikeEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
    }

    function mount(opt) {
        opt = opt || {};
        if (!opt.host || !opt.test || !opt.band) return null;
        styles();

        var box = document.createElement('div');
        box.className = 'tmail';
        box.innerHTML =
            '<b>📩 Прислать результат на почту</b>' +
            '<p>' + (opt.note || 'Страницу вы закроете, а письмо останется: результат, ' +
                'что с ним делать и куда идти дальше.') + '</p>' +
            '<form novalidate>' +
            '<input type="email" inputmode="email" autocomplete="email" ' +
            'placeholder="ваша почта" aria-label="Электронная почта">' +
            '<button type="submit">Прислать</button>' +
            '</form>' +
            '<small>Только по делу: результат сейчас и одно письмо через три дня. ' +
            'Отписаться — в один клик из письма.</small>';

        var form = box.querySelector('form');
        var input = box.querySelector('input');
        var btn = box.querySelector('button');
        var hint = box.querySelector('small');

        // Тот же человек часто проходит несколько тестов подряд: второй
        // раз набирать адрес заново он не станет.
        try {
            var saved = window.localStorage.getItem(KEY);
            if (saved) input.value = saved;
        } catch (e) {}

        function say(text) { hint.textContent = text; }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var email = String(input.value || '').trim();
            if (!looksLikeEmail(email)) {
                say('Проверьте адрес — похоже, в нём опечатка.');
                input.focus();
                return;
            }
            btn.disabled = true;
            btn.textContent = 'Отправляю…';
            say('Письмо готовится.');
            try { window.localStorage.setItem(KEY, email); } catch (err) {}
            goal('test_mail_submit');
            goal(opt.goal);

            fetch(API + '/api/test/email-short', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    test: opt.test,
                    band: opt.band,
                    score: (typeof opt.score === 'number' ? opt.score : null),
                    email: email
                })
            }).then(function (r) { return r.json(); }).then(function (d) {
                if (d && d.success) {
                    goal('test_mail_sent');
                    form.remove();
                    var p = document.createElement('p');
                    p.className = 'tmail-done';
                    p.innerHTML = '✅ Отправили на <b>' + email.replace(/[<>&]/g, '') +
                        '</b>. Письмо приходит за пару минут; если его нет — ' +
                        'загляните в «Промоакции» и «Спам».';
                    box.insertBefore(p, hint);
                    say('');
                    return;
                }
                // Отписавшемуся письма не шлём — и врать, что отправили, тоже не станем.
                say(d && d.error === 'opted_out'
                    ? 'На этот адрес мы больше не пишем — вы отписались.'
                    : 'Отправить не вышло. Попробуйте ещё раз через минуту.');
                btn.disabled = false;
                btn.textContent = 'Прислать';
            }).catch(function () {
                say('Связь не отвечает. Попробуйте ещё раз через минуту.');
                btn.disabled = false;
                btn.textContent = 'Прислать';
            });
        });

        opt.host.appendChild(box);
        return box;
    }

    window.TestMail = { mount: mount };
})();
