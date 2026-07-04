// ============================================
// progress.js — «Продолжить чтение»
// На странице статьи запоминает позицию прокрутки,
// на главной блога показывает полосу «Вы остановились на…».
// Всё в localStorage, без сервера.
// ============================================
(function () {
    'use strict';
    var KEY = 'blog_progress_v1';

    function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
    function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 12))); } catch (e) {} }

    var path = location.pathname;

    // ---- Страница статьи: запоминаем позицию ----
    if (/^\/blog\/[^\/]+\.html$/.test(path)) {
        var slug = path.split('/').pop().replace('.html', '');
        var t = null;
        function snap() {
            var h = document.documentElement.scrollHeight - innerHeight;
            if (h < 400) return;
            var pct = Math.min(99, Math.round(scrollY / h * 100));
            var list = load().filter(function (x) { return x.s !== slug; });
            if (pct >= 8 && pct < 92) {
                var title = (document.querySelector('h1') || {}).textContent || slug;
                list.unshift({ s: slug, t: title.trim().slice(0, 90), p: pct, y: Math.round(scrollY), at: Date.now() });
            }
            // дочитанное (>92%) просто убираем из списка
            save(list);
        }
        addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(snap, 400); }, { passive: true });
        addEventListener('beforeunload', snap);

        // вернулись в недочитанную статью — предлагаем продолжить с места
        var rec = load().filter(function (x) { return x.s === slug; })[0];
        if (rec && rec.y > 600) {
            var bar = document.createElement('div');
            bar.id = 'resumeBar';
            bar.innerHTML = '<span>Вы остановились на ' + rec.p + '%</span><button id="resumeGo">Продолжить чтение ↓</button><button id="resumeX" aria-label="Закрыть">✕</button>';
            var css = document.createElement('style');
            css.textContent =
                '#resumeBar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:90;display:flex;align-items:center;gap:12px;background:#1D1D1F;color:#fff;border-radius:40px;padding:10px 10px 10px 20px;box-shadow:0 10px 30px rgba(0,0,0,.3);font-size:.9rem;max-width:92vw}' +
                '#resumeGo{border:none;background:#3A86FF;color:#fff;border-radius:30px;padding:9px 16px;font-size:.85rem;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}' +
                '#resumeX{border:none;background:none;color:#8E8E93;font-size:1rem;cursor:pointer;padding:4px 6px}';
            document.head.appendChild(css);
            document.body.appendChild(bar);
            document.getElementById('resumeGo').addEventListener('click', function () {
                scrollTo({ top: rec.y, behavior: 'smooth' });
                bar.remove();
            });
            document.getElementById('resumeX').addEventListener('click', function () { bar.remove(); });
            setTimeout(function () { var b = document.getElementById('resumeBar'); if (b) b.remove(); }, 15000);
        }
        return;
    }

    // ---- Главная блога: полоса «Продолжить чтение» ----
    if (/^\/blog\/?(index\.html)?$/.test(path)) {
        var mount = document.getElementById('continueReading');
        if (!mount) return;
        var items = load().filter(function (x) { return x.p >= 8 && x.p < 92; }).slice(0, 3);
        if (!items.length) return;
        var css2 = document.createElement('style');
        css2.textContent =
            '.cr-wrap{margin:26px 0 0}' +
            '.cr-title{font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7fb0ff;margin:0 0 10px}' +
            '.cr-item{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.13);border-radius:12px;padding:11px 14px;margin:0 0 8px;text-decoration:none;transition:border-color .15s}' +
            '.cr-item:hover{border-color:#5B9BFF}' +
            '.cr-item b{color:#EAF0FB;font-weight:600;font-size:.92rem;line-height:1.35;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
            '.cr-pct{flex-shrink:0;color:#8891A4;font-size:.78rem}' +
            '.cr-ring{flex-shrink:0;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:.66rem;font-weight:700;color:#fff;background:conic-gradient(#3A86FF var(--p),rgba(255,255,255,.14) 0)}';
        document.head.appendChild(css2);
        mount.className = 'cr-wrap';
        mount.innerHTML = '<p class="cr-title">Продолжить чтение</p>' + items.map(function (x) {
            return '<a class="cr-item" href="/blog/' + x.s + '.html"><span class="cr-ring" style="--p:' + x.p + '%">' + x.p + '%</span><b>' + x.t.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</b><span class="cr-pct">открыть →</span></a>';
        }).join('');
    }
})();
