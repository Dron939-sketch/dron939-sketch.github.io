// ============================================
// door.js — закреплённая дверь из статьи в Фреди
//
// Зачем. За неделю 27.09–03.10 поиск и прямые заходы привели в блог
// 1 200 визитов, а до разговора с Фреди из них дошли 24. Блок
// «Поговорить с Фреди» стоит после «Частых вопросов», то есть под
// самым концом статьи, и на телефоне (половина визитов, 172 секунды на
// странице против 99 на компьютере) до него доезжают единицы.
//
// Что делает. Когда человек прочитал четверть статьи или провёл на ней
// двадцать секунд, снизу появляется полоса «Обсудить это с Фреди».
// Ведёт туда же, куда и блок: /fredi/?from=<статья>&ask=«Я только что
// из статьи …» — в приложении это не автоотправка, а подсказка над
// полем ввода (fredi/openers.js, _articleDoor): своё первое сообщение
// продолжали 56 % против 12 % у автоотправки. Если в статье есть блок
// с готовым вопросом (tools/ask_doors.py), полоса берёт его адрес, и
// путь остаётся тем же, что у блока.
//
// Полоса прячется, пока на экране сам блок или нижняя кнопка «Поговорить
// с Фреди» (две одинаковые двери рядом — хуже одной), не появляется,
// пока висит «Вы остановились на N %» из progress.js, и после ✕ не
// возвращается до конца сессии браузера.
//
// Счёт. Лимит целей Метрики (200) исчерпан, поэтому показ и клик идут
// параметрами визита (ym 'params', blog_door: shown / click), а приход в
// приложение отличим по &door=bar в адресе. Клик по ссылке ловит и
// общий обработчик fredi-track там, где он есть.
// ============================================
(function () {
    'use strict';
    var path = location.pathname;
    if (!/^\/blog\/[^\/]+\.html$/.test(path) || /\/index\.html$/.test(path)) return;
    // 250 из 1 771 статей свёрстаны без .article-content (<main> или
    // <article> без класса) — поэтому любой из контейнеров.
    if (!document.querySelector('.article-content, article, main')) return;
    var KEY = 'blog_door_v1';
    try { if (sessionStorage.getItem(KEY) === 'x') return; } catch (e) {}

    var COUNTER = 108138656;
    function param(v) { try { if (typeof ym === 'function') ym(COUNTER, 'params', { blog_door: v }); } catch (e) {} }

    var isLecture = /^\/blog\/lekciya-/.test(path);
    var h1 = document.querySelector('h1');
    var title = ((h1 && h1.textContent) || '').replace(/\s+/g, ' ').trim();
    var box = document.querySelector('.fredi-ask-box a[href^="/fredi/"]');
    var href = box ? box.getAttribute('href') : '';
    if (!href) {
        if (!title) return;
        var ask = 'Я только что из ' + (isLecture ? 'лекции' : 'статьи') + ' «' + title.slice(0, 160) +
            '». Помогите разобраться именно в моей ситуации.';
        href = '/fredi/?from=' + encodeURIComponent(path) + '&ask=' + encodeURIComponent(ask);
    }
    href += (href.indexOf('?') >= 0 ? '&' : '?') + 'door=bar';

    var shown = false, built = false, bar = null, hiddenByBlock = false;

    function build() {
        if (built) return;
        built = true;
        var css = document.createElement('style');
        css.textContent =
            '#frediDoor{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:95;display:flex;align-items:center;gap:8px;' +
                'background:#1D1D1F;color:#fff;border-radius:40px;padding:8px 8px 8px 18px;box-shadow:0 10px 30px rgba(0,0,0,.3);' +
                'max-width:92vw;box-sizing:border-box;font-family:inherit;opacity:0;transition:opacity .25s,transform .25s}' +
            '#frediDoor.on{opacity:1}' +
            '#frediDoor.off{opacity:0;pointer-events:none}' +
            '#frediDoorGo{display:flex;flex-direction:column;min-width:0;color:#fff;text-decoration:none;line-height:1.25}' +
            '#frediDoorGo b{font-size:.95rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '#frediDoorGo span{font-size:.75rem;color:#B5B9C4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '#frediDoorBtn{flex-shrink:0;border:none;background:#3A86FF;color:#fff;border-radius:30px;padding:10px 16px;font-size:.85rem;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;text-decoration:none}' +
            '#frediDoorX{flex-shrink:0;border:none;background:none;color:#8E8E93;font-size:1rem;cursor:pointer;padding:6px 8px;font-family:inherit}' +
            '@media(max-width:600px){#frediDoor{left:12px;right:12px;transform:none;max-width:none;bottom:calc(10px + env(safe-area-inset-bottom,0px));padding-left:14px}}';
        document.head.appendChild(css);
        bar = document.createElement('div');
        bar.id = 'frediDoor';
        bar.setAttribute('role', 'complementary');
        bar.setAttribute('aria-label', 'Обсудить статью с Фреди');
        bar.innerHTML =
            '<a id="frediDoorGo" href=""><b>Обсудить это с Фреди</b><span>' +
                (isLecture ? 'по теме лекции' : 'по теме статьи') + ' · без регистрации</span></a>' +
            '<a id="frediDoorBtn" href="">Открыть →</a>' +
            '<button id="frediDoorX" type="button" aria-label="Закрыть">✕</button>';
        document.body.appendChild(bar);
        var links = bar.querySelectorAll('a');
        for (var i = 0; i < links.length; i++) {
            links[i].setAttribute('href', href);
            links[i].addEventListener('click', function () { param('click'); });
        }
        document.getElementById('frediDoorX').addEventListener('click', function () {
            try { sessionStorage.setItem(KEY, 'x'); } catch (e) {}
            bar.remove();
            bar = null;
            document.body.style.paddingBottom = '';
        });
        // Чтобы полоса не накрывала последние строки и ссылки подвала.
        document.body.style.paddingBottom = '76px';
        watchBlocks();
    }

    // Пока на экране блок «Поговорить с Фреди» или нижние кнопки —
    // полоса не нужна, дверь и так перед глазами.
    function watchBlocks() {
        if (!('IntersectionObserver' in window)) return;
        var targets = [];
        var b1 = document.querySelector('.fredi-ask-box');
        var b2 = document.querySelector('.cta-block');
        if (b1) targets.push(b1);
        if (b2) targets.push(b2);
        if (!targets.length) return;
        var visible = {};
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) { visible[en.target.className] = en.isIntersecting; });
            var any = false;
            for (var k in visible) if (visible[k]) any = true;
            hiddenByBlock = any;
            if (bar) bar.className = (shown && !any) ? 'on' : 'off';
        }, { threshold: 0.15 });
        targets.forEach(function (t) { io.observe(t); });
    }

    function show() {
        if (shown) return;
        if (document.getElementById('resumeBar')) { setTimeout(show, 3000); return; }
        shown = true;
        build();
        if (!bar) return;
        bar.className = hiddenByBlock ? 'off' : 'on';
        param('shown');
    }

    var t0 = Date.now();
    function onScroll() {
        var h = document.documentElement.scrollHeight - innerHeight;
        if (h < 600) return;
        if (scrollY / h >= 0.25) { removeEventListener('scroll', onScroll); show(); }
    }
    addEventListener('scroll', onScroll, { passive: true });
    setTimeout(function () { removeEventListener('scroll', onScroll); show(); }, 20000);
    void t0;
})();
