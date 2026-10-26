// ============================================
// lecfig.js — схемы лекций на телефоне
// Схема нарисована на 720 px; на экране 390 px она сжималась
// вдвое, и подписи выходили по 5–6 px (дизайнер фокус-группы,
// 26.10.2026). На узком экране схема держит ширину 640 px и
// листается внутри своей рамки, а над ней — подсказка.
// ============================================
(function () {
    'use strict';
    var MQ = '(max-width: 640px)';

    function css() {
        if (document.getElementById('lecfig-css')) return;
        var s = document.createElement('style');
        s.id = 'lecfig-css';
        s.textContent =
            '@media ' + MQ + '{' +
            'figure.lecfig{overflow-x:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}' +
            'figure.lecfig>svg,figure.lecfig>div>svg{min-width:640px}' +
            'figure.lecfig figcaption{position:sticky;left:0;max-width:calc(100vw - 72px)}' +
            '.lecfig-hint{position:sticky;left:0;display:block;font-size:.8rem;color:#667085;margin:0 0 8px}' +
            '}';
        document.head.appendChild(s);
    }

    function hints() {
        if (!window.matchMedia || !matchMedia(MQ).matches) return;
        var figs = document.querySelectorAll('figure.lecfig');
        for (var i = 0; i < figs.length; i++) {
            var f = figs[i];
            if (f.querySelector('.lecfig-hint') || f.scrollWidth <= f.clientWidth + 4) continue;
            var h = document.createElement('span');
            h.className = 'lecfig-hint';
            h.textContent = 'Схема шире экрана — листайте её вбок →';
            f.insertBefore(h, f.firstChild);
        }
    }

    css();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hints);
    else hints();
})();
