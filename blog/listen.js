// ============================================
// listen.js — «Слушать статью» на Web Speech API
// Без сервера и трафика: голос синтезирует браузер.
// Кнопка появляется только если есть русский голос.
// ============================================
(function () {
    'use strict';
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;

    var box = document.getElementById('listenBox');
    if (!box) return;

    var chunks = [], idx = 0, playing = false, rate = 1, voice = null, total = 0;

    function collect() {
        var root = document.querySelector('.article-content') || document.querySelector('article') || document.body;
        var h1 = document.querySelector('h1');
        var els = root.querySelectorAll('h2, h3, p, li');
        var out = [];
        if (h1) out.push(h1.textContent.trim());
        els.forEach(function (el) {
            if (el.closest('.selfcheck, .related-articles, .author-block, .author-box, .fredi-ask-box, .game-link-box, .cta-block, nav, .toc-block')) return;
            var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (t.length > 2) out.push(t);
        });
        return out;
    }

    function pickVoice() {
        var vs = speechSynthesis.getVoices() || [];
        var ru = vs.filter(function (v) { return /^ru/i.test(v.lang); });
        if (!ru.length) return null;
        // предпочитаем «улучшенные» голоса, если система их отдаёт
        ru.sort(function (a, b) { return (b.localService === false) - (a.localService === false); });
        return ru[0];
    }

    function fmt() {
        var min = Math.max(1, Math.round((total - idx) * 0.32 / rate));
        return '~' + min + ' мин осталось';
    }

    function render() {
        var pct = total ? Math.round(idx / total * 100) : 0;
        box.innerHTML =
            '<button class="lsn-btn" id="lsnToggle" aria-label="' + (playing ? 'Пауза' : 'Слушать статью') + '">' + (playing ? '⏸' : '▶') + '</button>' +
            '<div class="lsn-mid"><div class="lsn-t">' + (playing ? 'Читаю вслух · ' + fmt() : (idx > 0 && idx < total ? 'Пауза · ' + fmt() : '🎧 Слушать статью')) + '</div>' +
            '<div class="lsn-bar"><i style="width:' + pct + '%"></i></div></div>' +
            '<button class="lsn-rate" id="lsnRate">' + rate.toFixed(2).replace(/\.?0+$/, '') + '×</button>';
        document.getElementById('lsnToggle').addEventListener('click', toggle);
        document.getElementById('lsnRate').addEventListener('click', cycleRate);
    }

    function speakNext() {
        if (idx >= total) { playing = false; idx = 0; render(); return; }
        var u = new SpeechSynthesisUtterance(chunks[idx]);
        if (voice) u.voice = voice;
        u.lang = 'ru-RU';
        u.rate = rate;
        u.onend = function () { if (playing) { idx++; render(); speakNext(); } };
        u.onerror = function () { if (playing) { idx++; speakNext(); } };
        speechSynthesis.speak(u);
    }

    function toggle() {
        if (playing) {
            playing = false;
            speechSynthesis.cancel();
            render();
            track('listen_pause');
        } else {
            voice = voice || pickVoice();
            playing = true;
            render();
            speakNext();
            track(idx === 0 ? 'listen_start' : 'listen_resume');
        }
    }

    function cycleRate() {
        var rates = [1, 1.25, 1.5, 1.75];
        rate = rates[(rates.indexOf(rate) + 1) % rates.length];
        if (playing) { speechSynthesis.cancel(); render(); speakNext(); } else render();
    }

    function track(name) {
        try { if (typeof ym === 'function') ym(108138656, 'reachGoal', name, { slug: location.pathname.split('/').pop() }); } catch (e) {}
    }

    function css() {
        if (document.getElementById('lsn-css')) return;
        var s = document.createElement('style');
        s.id = 'lsn-css';
        s.textContent =
            '#listenBox{display:flex;align-items:center;gap:14px;background:#F5F5F7;border:1px solid #E0E0E0;border-radius:14px;padding:12px 16px;margin:18px 0 4px}' +
            '.lsn-btn{width:44px;height:44px;border-radius:50%;border:none;background:#3A86FF;color:#fff;font-size:1.05rem;cursor:pointer;flex-shrink:0;display:grid;place-items:center}' +
            '.lsn-btn:active{transform:scale(.94)}' +
            '.lsn-mid{flex:1;min-width:0}' +
            '.lsn-t{font-size:.9rem;color:#1D1D1F;font-weight:500;margin-bottom:6px}' +
            '.lsn-bar{height:5px;border-radius:5px;background:#E0E0E0;overflow:hidden}' +
            '.lsn-bar i{display:block;height:100%;background:#3A86FF;transition:width .3s}' +
            '.lsn-rate{border:1px solid #D0D5DD;background:#fff;border-radius:10px;padding:8px 12px;font-size:.85rem;font-weight:600;color:#1D1D1F;cursor:pointer;font-family:inherit}';
        document.head.appendChild(s);
    }

    function boot() {
        voice = pickVoice();
        if (!voice && speechSynthesis.getVoices().length > 0) { box.style.display = 'none'; return; }
        chunks = collect();
        total = chunks.length;
        if (total < 3) { box.style.display = 'none'; return; }
        css();
        render();
    }

    if (speechSynthesis.getVoices().length) boot();
    else {
        var booted = false;
        speechSynthesis.onvoiceschanged = function () { if (!booted) { booted = true; boot(); } };
        setTimeout(function () { if (!booted) { booted = true; boot(); } }, 1500);
    }

    window.addEventListener('beforeunload', function () { try { speechSynthesis.cancel(); } catch (e) {} });
})();
