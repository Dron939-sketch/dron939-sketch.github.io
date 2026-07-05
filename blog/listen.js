// ============================================
// listen.js — «Слушать статью» на Web Speech API
// Без сервера и трафика: голос синтезирует браузер.
// Кнопка появляется только если есть русский голос.
// ============================================
(function () {
    'use strict';

    var box = document.getElementById('listenBox');
    if (!box) return;

    var API = 'https://ffred-ddd989.amvera.io';
    var slug = location.pathname.split('/').pop().replace('.html', '');

    // ===== Режим 1: серверная озвучка (Yandex SpeechKit, mp3 с кэшем) =====
    // Генерируется один раз, дальше отдаётся файл. Если бэкенд недоступен
    // или ключ не настроен — тихо падаем в режим 2 (голос браузера).
    function tryServerAudio() {
        return fetch(API + '/api/tts/blog/' + slug + '/status')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d || !d.enabled) return false;
                cssServer();
                renderServer(d.ready, d.v || 0);
                return true;
            })
            .catch(function () { return false; });
    }

    function cssServer() {
        if (document.getElementById('lsn2-css')) return;
        var s = document.createElement('style');
        s.id = 'lsn2-css';
        s.textContent =
            '#listenBox{background:#F5F5F7;border:1px solid #E0E0E0;border-radius:14px;padding:12px 16px;margin:18px 0 4px}' +
            '.lsn2-row{display:flex;align-items:center;gap:12px}' +
            '.lsn2-t{font-size:.9rem;color:#1D1D1F;font-weight:500}' +
            '.lsn2-sub{font-size:.76rem;color:#6E6E73;margin-top:2px}' +
            '.lsn2-btn{border:none;background:#3A86FF;color:#fff;border-radius:30px;padding:10px 20px;font-size:.9rem;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}' +
            '.lsn2-btn[disabled]{opacity:.6;cursor:wait}' +
            '#listenBox audio{width:100%;margin-top:10px;display:block}';
        document.head.appendChild(s);
    }

    function goal(name) {
        try { if (typeof ym === 'function') ym(108138656, 'reachGoal', name, { slug: slug }); } catch (e) {}
    }

    function renderServer(ready, v) {
        var isLecture = slug.indexOf('lekciya-') === 0;
        box.innerHTML =
            '<div class="lsn2-row"><div style="flex:1"><div class="lsn2-t">🎧 ' +
            (isLecture ? 'Лекцию читает Фреди' : 'Аудиоверсия статьи') + '</div>' +
            '<div class="lsn2-sub">' + (isLecture ? 'Голос Фреди · живое чтение' : 'Голос Фреди') +
            ' · можно слушать в дороге</div></div>' +
            '<button class="lsn2-btn" id="lsn2Go">' + (ready ? '▶ Слушать' : '▶ Озвучить и слушать') + '</button></div>';
        document.getElementById('lsn2Go').addEventListener('click', function () {
            var btn = this;
            btn.disabled = true;
            goal('listen_tts_start');

            function play(vv) {
                var audio = document.createElement('audio');
                audio.controls = true;
                audio.preload = 'auto';
                // v меняется при переозвучке — иначе браузер вечно играет
                // старый закэшированный голос (mp3 отдаётся с immutable)
                audio.src = API + '/api/tts/blog/' + slug + '.mp3?v=' + vv;
                audio.addEventListener('canplay', function () {
                    btn.parentElement.style.display = 'none';
                    audio.play().catch(function () {});
                    goal('listen_tts_play');
                });
                audio.addEventListener('error', function () {
                    // сервер не смог — откатываемся на браузерный голос
                    box.innerHTML = '';
                    initBrowserTTS();
                });
                box.appendChild(audio);
            }

            if (ready) {
                btn.textContent = 'Загружаю…';
                play(v);
                return;
            }

            // Генерация идёт на сервере минуты (рерайт + синтез голосом
            // Фреди): пинаем её и поллим статус, а не держим соединение.
            btn.textContent = isLecture ? 'Фреди готовит лекцию… это займёт пару минут' : 'Готовлю озвучку… ~1–2 мин';
            fetch(API + '/api/tts/blog/' + slug + '.mp3?v=' + v).then(function (r) {
                if (r.status === 200) { play(v); return; }
                var tries = 0;
                var t = setInterval(function () {
                    if (++tries > 75) { clearInterval(t); box.innerHTML = ''; initBrowserTTS(); return; }
                    fetch(API + '/api/tts/blog/' + slug + '/status')
                        .then(function (rr) { return rr.json(); })
                        .then(function (d) {
                            if (d && d.error) { clearInterval(t); box.innerHTML = ''; initBrowserTTS(); return; }
                            if (d && d.ready) { clearInterval(t); play(d.v || v); }
                        })
                        .catch(function () {});
                }, 8000);
            }).catch(function () { box.innerHTML = ''; initBrowserTTS(); });
        });
    }

    // ===== Режим 2: браузерный синтез (как раньше) =====
    function initBrowserTTS() {
        if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
            box.style.display = 'none';
            return;
        }
        legacyInit();
    }

    tryServerAudio().then(function (ok) { if (!ok) initBrowserTTS(); });

    function legacyInit() {

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
    } // конец legacyInit
})();
