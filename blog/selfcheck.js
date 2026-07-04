// ============================================
// selfcheck.js — встроенные мини-тесты в статьях
// Самопроверка из 5 вопросов «да/нет» с уровневым
// результатом. Конфиг лежит в самой статье:
// <div class="selfcheck"><script type="application/json">{...}</script></div>
// Не диагностика — самонаблюдение с понятным следующим шагом.
// ============================================
(function () {
    'use strict';

    function injectCSS() {
        if (document.getElementById('selfcheck-css')) return;
        var s = document.createElement('style');
        s.id = 'selfcheck-css';
        s.textContent = [
            '.sc-card{background:linear-gradient(135deg,#F0F7FF,#FAFCFF);border:1px solid #BFDBFE;border-radius:20px;padding:26px 28px;margin:40px 0;font-family:inherit}',
            '.sc-eyebrow{display:inline-flex;align-items:center;gap:7px;background:rgba(58,134,255,.12);color:#2563EB;border-radius:30px;padding:4px 14px;font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:12px}',
            '.sc-title{font-size:1.25rem;font-weight:600;color:#1D1D1F;margin:0 0 4px;line-height:1.35}',
            '.sc-sub{color:#6E6E73;font-size:.9rem;margin:0 0 18px}',
            '.sc-dots{display:flex;gap:6px;margin:0 0 16px}',
            '.sc-dot{width:26px;height:5px;border-radius:5px;background:#DBEAFE;transition:background .2s}',
            '.sc-dot.on{background:#3A86FF}',
            '.sc-q{font-size:1.1rem;color:#1D1D1F;line-height:1.55;margin:0 0 18px;min-height:52px}',
            '.sc-row{display:flex;gap:12px;flex-wrap:wrap}',
            '.sc-btn{flex:1;min-width:110px;border:1.5px solid #BFDBFE;background:#fff;color:#1D1D1F;border-radius:12px;padding:13px 18px;font-size:1rem;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}',
            '.sc-btn:hover{border-color:#3A86FF;background:#F0F7FF}',
            '.sc-btn:active{transform:scale(.97)}',
            '.sc-res{border-radius:14px;padding:18px 20px;margin:0 0 14px;border:1px solid}',
            '.sc-res.g{background:#F0FDF4;border-color:#BBF7D0}',
            '.sc-res.y{background:#FFFBEB;border-color:#FDE68A}',
            '.sc-res.r{background:#FEF2F2;border-color:#FECACA}',
            '.sc-res-t{font-weight:700;font-size:1.08rem;margin:0 0 6px}',
            '.sc-res.g .sc-res-t{color:#15803D}',
            '.sc-res.y .sc-res-t{color:#B45309}',
            '.sc-res.r .sc-res-t{color:#B91C1C}',
            '.sc-res-d{color:#374151;font-size:.98rem;line-height:1.6;margin:0}',
            '.sc-score{display:inline-block;font-size:.82rem;color:#6E6E73;margin:0 0 10px}',
            '.sc-acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}',
            '.sc-link{display:inline-block;background:#3A86FF;color:#fff !important;text-decoration:none;padding:10px 18px;border-radius:30px;font-size:.9rem;font-weight:600}',
            '.sc-link.o{background:transparent;border:1.5px solid #3A86FF;color:#3A86FF !important}',
            '.sc-again{background:none;border:none;color:#6E6E73;font-size:.85rem;cursor:pointer;padding:8px 0 0;font-family:inherit;text-decoration:underline}',
            '.sc-disc{color:#8E8E93;font-size:.78rem;margin:14px 0 0;line-height:1.5}',
            '@media(max-width:560px){.sc-card{padding:20px 18px}.sc-btn{min-width:90px}}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function goal(name, params) {
        try { if (typeof ym === 'function') ym(108138656, 'reachGoal', name, params || {}); } catch (e) {}
    }

    function esc(t) {
        return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }

    function initOne(box) {
        var cfgEl = box.querySelector('script[type="application/json"]');
        if (!cfgEl) return;
        var cfg;
        try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }
        if (!cfg || !cfg.q || !cfg.q.length || !cfg.levels) return;

        var slug = location.pathname.split('/').pop().replace('.html', '');
        var st = { i: 0, yes: 0, started: false };

        function dots() {
            var h = '';
            for (var k = 0; k < cfg.q.length; k++) h += '<span class="sc-dot' + (k < st.i ? ' on' : '') + '"></span>';
            return '<div class="sc-dots">' + h + '</div>';
        }

        function head() {
            return '<span class="sc-eyebrow">🧪 Мини-тест</span>' +
                '<p class="sc-title">' + esc(cfg.title) + '</p>' +
                '<p class="sc-sub">' + cfg.q.length + ' вопросов · меньше минуты · отвечайте, как есть</p>';
        }

        function question() {
            if (!st.started) { st.started = true; goal('selfcheck_start', { slug: slug }); }
            box.innerHTML = head() + dots() +
                '<p class="sc-q">' + (st.i + 1) + '. ' + esc(cfg.q[st.i]) + '</p>' +
                '<div class="sc-row"><button class="sc-btn" data-v="1">Да</button><button class="sc-btn" data-v="0">Нет</button></div>' +
                '<p class="sc-disc">Это самонаблюдение, а не диагноз. Точную картину даёт только очная работа со специалистом.</p>';
            box.querySelectorAll('.sc-btn').forEach(function (b) {
                b.addEventListener('click', function () {
                    st.yes += +b.dataset.v;
                    st.i++;
                    if (st.i < cfg.q.length) question(); else result();
                });
            });
        }

        function result() {
            var lvl = cfg.levels[cfg.levels.length - 1];
            for (var k = 0; k < cfg.levels.length; k++) {
                if (st.yes <= cfg.levels[k].max) { lvl = cfg.levels[k]; break; }
            }
            goal('selfcheck_done', { slug: slug, score: st.yes });
            var links = (lvl.links || []).map(function (l, idx) {
                return '<a class="sc-link' + (idx ? ' o' : '') + '" href="' + esc(l[1]) + '">' + esc(l[0]) + '</a>';
            }).join('');
            box.innerHTML = head() +
                '<span class="sc-score">Ответов «да»: ' + st.yes + ' из ' + cfg.q.length + '</span>' +
                '<div class="sc-res ' + (lvl.c || 'y') + '"><p class="sc-res-t">' + esc(lvl.t) + '</p><p class="sc-res-d">' + esc(lvl.d) + '</p></div>' +
                (links ? '<div class="sc-acts">' + links + '</div>' : '') +
                '<button class="sc-again">Пройти ещё раз</button>' +
                '<p class="sc-disc">Это самонаблюдение, а не диагноз. Точную картину даёт только очная работа со специалистом.</p>';
            var again = box.querySelector('.sc-again');
            if (again) again.addEventListener('click', function () { st.i = 0; st.yes = 0; question(); });
        }

        box.classList.add('sc-card');
        question();
    }

    function boot() {
        var boxes = document.querySelectorAll('.selfcheck');
        if (!boxes.length) return;
        injectCSS();
        boxes.forEach(initOne);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
