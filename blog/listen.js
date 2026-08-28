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

    // Скорости чтения, общие для серверного плеера и браузерного голоса.
    // 1,1 — самая ходовая: чуть бодрее обычной, а голос ещё не «частит».
    // 1,5 убрана: на ней лекция перестаёт слушаться и начинает проматываться.
    var RATES = [1, 1.1, 1.25, 1.75];
    function rateLabel(r) { return String(r).replace('.', ',') + '×'; }

    // ===== Режим 1: серверная озвучка (Yandex SpeechKit, mp3 с кэшем) =====
    // Генерируется один раз, дальше отдаётся файл. Если бэкенд недоступен
    // или ключ не настроен — тихо падаем в режим 2 (голос браузера).
    function tryServerAudio() {
        return fetch(API + '/api/tts/blog/' + slug + '/status')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d || !d.enabled) return false;
                cssServer();
                renderServer(d.ready, d.v || 0, d.url || '');
                return true;
            })
            .catch(function () { return false; });
    }

    function cssServer() {
        if (document.getElementById('lsn2-css')) return;
        var s = document.createElement('style');
        s.id = 'lsn2-css';
        s.textContent =
            '#listenBox{position:relative;overflow:hidden;background:linear-gradient(135deg,#EAF2FF 0%,#F3F8FF 55%,#FFFFFF 100%);border:1px solid #CFE0FB;border-radius:18px;padding:18px 20px;margin:24px 0 6px;box-shadow:0 12px 32px rgba(58,134,255,.12)}' +
            '.lsn2-row{display:flex;align-items:center;gap:16px;position:relative;z-index:1}' +
            '.lsn2-play{position:relative;flex-shrink:0;width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(145deg,#3A86FF,#2E6FE0);color:#fff;font-size:1.35rem;line-height:1;cursor:pointer;display:grid;place-items:center;box-shadow:0 6px 18px rgba(58,134,255,.45);transition:transform .12s}' +
            '.lsn2-play:hover{transform:scale(1.06)}' +
            '.lsn2-play:active{transform:scale(.95)}' +
            '.lsn2-play[disabled]{cursor:wait}' +
            '.lsn2-play::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(58,134,255,.5);animation:lsnPulse 2s ease-out infinite;pointer-events:none}' +
            '.lsn2-play.busy{background:linear-gradient(145deg,#8AB4FF,#6E9FF0)}' +
            '.lsn2-play.busy::after{inset:-4px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:lsnSpin .8s linear infinite}' +
            '@keyframes lsnPulse{0%{transform:scale(.9);opacity:.7}100%{transform:scale(1.4);opacity:0}}' +
            '@keyframes lsnSpin{to{transform:rotate(360deg)}}' +
            '.lsn2-txt{flex:1;min-width:0}' +
            '.lsn2-badge{display:inline-block;font-size:.66rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#2E6FE0;background:#DCEAFF;border-radius:6px;padding:2px 8px;margin-bottom:7px}' +
            '.lsn2-t{font-size:1.06rem;color:#1D1D1F;font-weight:700;line-height:1.25}' +
            '.lsn2-sub{font-size:.82rem;color:#5A6472;margin-top:3px;line-height:1.4}' +
            '.lsn2-eq{display:flex;align-items:flex-end;gap:3px;height:28px;flex-shrink:0}' +
            '.lsn2-eq i{display:block;width:4px;border-radius:2px;background:linear-gradient(#5B9BFF,#3A86FF);animation:lsnEq 1s ease-in-out infinite}' +
            '.lsn2-eq i:nth-child(1){animation-delay:-.4s}.lsn2-eq i:nth-child(2){animation-delay:-.9s}.lsn2-eq i:nth-child(3){animation-delay:-.2s}.lsn2-eq i:nth-child(4){animation-delay:-.6s}.lsn2-eq i:nth-child(5){animation-delay:0s}' +
            '@keyframes lsnEq{0%,100%{height:6px}50%{height:26px}}' +
            '#listenBox audio{width:100%;margin-top:14px;display:block;position:relative;z-index:1}' +
            '.lsn2-rate{position:relative;z-index:1;margin-top:8px;border:1px solid #CFE0FB;background:#fff;border-radius:10px;padding:6px 12px;font-size:.82rem;font-weight:600;color:#2E6FE0;cursor:pointer;font-family:inherit}' +
            '.lsn2-rate:hover{background:#F3F8FF}' +
            '@media(max-width:600px){#listenBox{padding:16px}.lsn2-eq{display:none}.lsn2-t{font-size:1rem}.lsn2-play{width:52px;height:52px}}' +
            '@media(prefers-reduced-motion:reduce){.lsn2-play::after,.lsn2-eq i{animation:none}}';
        document.head.appendChild(s);
    }

    function goal(name) {
        try { if (typeof ym === 'function') ym(108138656, 'reachGoal', name, { slug: slug }); } catch (e) {}
    }

    // Адрес mp3 больше не собирается на клиенте: сервер выдаёт его подписанным
    // и на несколько часов. Угадать нельзя, вставить на чужой сайт — тоже.
    function audioUrl(signed, vv) {
        // подписи нет — бэкенд старой версии: играем по прежнему адресу
        var base = signed || ('/api/tts/blog/' + slug + '.mp3');
        return API + base + (base.indexOf('?') < 0 ? '?' : '&') + 'v=' + vv;
    }

    // Убираем из плеера всё, что предлагает сохранить файл: пункт «Скачать»
    // в меню Chrome и контекстное меню на самом элементе.
    function lockAudio(a) {
        // скорость воспроизведения оставляем: лекцию слушают и на 1,25×
        a.setAttribute('controlsList', 'nodownload');
        a.setAttribute('disablePictureInPicture', '');
        a.setAttribute('oncontextmenu', 'return false');
        a.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
        return a;
    }

    function renderServer(ready, v, signedUrl) {
        var isLecture = slug.indexOf('lekciya-') === 0;
        box.innerHTML =
            '<div class="lsn2-row">' +
            '<button class="lsn2-play" id="lsn2Go" aria-label="Слушать">▶</button>' +
            '<div class="lsn2-txt">' +
            '<span class="lsn2-badge">🎧 Аудиоверсия</span>' +
            '<div class="lsn2-t">' + (isLecture ? 'Лекцию читает Фреди' : 'Слушайте статью голосом Фреди') + '</div>' +
            '<div class="lsn2-sub" id="lsn2Sub">' +
            (ready
                ? 'Нажмите ▶ — слушайте как подкаст, хоть в дороге'
                : (isLecture ? 'Живое чтение · озвучит за пару минут, потом играет мгновенно' : 'Голос Фреди · можно слушать в дороге')) +
            '</div></div>' +
            '<div class="lsn2-eq" aria-hidden="true"><i style="height:10px"></i><i style="height:20px"></i><i style="height:8px"></i><i style="height:24px"></i><i style="height:14px"></i></div>' +
            '</div>';
        var subEl = document.getElementById('lsn2Sub');
        function setStatus(t) { if (subEl) subEl.textContent = t; }
        // Готовую лекцию греем заранее (preload) уже при открытии страницы,
        // чтобы по ▶ она играла из готового mp3 почти мгновенно, а не ждала
        // загрузку файла. Для неготовых — ничего не грузим (пойдёт генерация).
        var preAudio = null;
        if (ready) {
            preAudio = lockAudio(document.createElement('audio'));
            preAudio.preload = 'auto';
            preAudio.src = audioUrl(signedUrl, v);
        }
        document.getElementById('lsn2Go').addEventListener('click', function () {
            var btn = this;
            btn.disabled = true;
            btn.classList.add('busy');
            btn.textContent = '';
            goal('listen_tts_start');

            function play(vv, url) {
                var audio = preAudio || lockAudio(document.createElement('audio'));
                if (!preAudio) {
                    audio.preload = 'auto';
                    // v меняется при переозвучке — иначе браузер вечно играет
                    // старый закэшированный голос (mp3 отдаётся с immutable)
                    audio.src = audioUrl(url || signedUrl, vv);
                }
                preAudio = null;
                audio.controls = true;

                // Своя кнопка скорости. У родных контролов список свой,
                // браузерный: там нет 1,1 и есть 1,5 — а на полутора лекция
                // перестаёт слушаться и начинает проматываться.
                var speed = document.createElement('button');
                speed.className = 'lsn2-rate';
                speed.type = 'button';
                var ri = 0;
                speed.textContent = rateLabel(RATES[ri]);
                speed.setAttribute('aria-label', 'Скорость чтения');
                speed.addEventListener('click', function () {
                    ri = (ri + 1) % RATES.length;
                    audio.playbackRate = RATES[ri];
                    speed.textContent = rateLabel(RATES[ri]);
                });
                // load() при восстановлении сбрасывает скорость на обычную —
                // возвращаем выбранную, иначе лекция незаметно замедляется.
                audio.addEventListener('loadeddata', function () {
                    if (audio.playbackRate !== RATES[ri]) audio.playbackRate = RATES[ri];
                });

                var readyShown = false;
                function onReady() {
                    if (readyShown) return;  // после восстановления canplay приходит снова
                    readyShown = true;
                    btn.parentElement.style.display = 'none';
                    audio.play().catch(function () {});
                    goal('listen_tts_play');
                }
                audio.addEventListener('canplay', onReady);

                // Сколько успели проиграть. Ошибка в середине лекции — не повод
                // начинать сначала: возвращаемся ровно на эту секунду.
                var heard = 0, started = false, retries = 0, recovering = false;
                audio.addEventListener('playing', function () { started = true; });
                audio.addEventListener('timeupdate', function () {
                    if (audio.currentTime > 0) {
                        // звук реально идёт — прошлые восстановления прощаем,
                        // иначе две долгие паузы съедают весь лимит и третья
                        // получает «обновите страницу» на ровном месте
                        if (audio.currentTime > heard + 1) retries = 0;
                        heard = audio.currentTime;
                        recovering = false;
                    }
                });

                // Слушатель ставил лекцию на паузу над заданием, браузер за это
                // время отпустил соединение, и на возобновлении ушёл новый
                // запрос диапазона. Если он не прошёл, старый обработчик сносил
                // плеер и включал чтение статьи браузерным голосом с самого
                // начала: голос менялся, место терялось. Берём свежую подпись
                // и возвращаемся на ту же секунду.
                function recover() {
                    if (recovering) return;
                    if (retries >= 2) {
                        setStatus('Не удалось продолжить — обновите страницу');
                        return;
                    }
                    recovering = true;
                    retries++;
                    var at = heard;
                    goal('listen_tts_resume');
                    fetch(API + '/api/tts/blog/' + slug + '/status')
                        .then(function (r) { return r.json(); })
                        .then(function (d) {
                            if (!d || !d.ready) throw new Error('not ready');
                            audio.src = audioUrl(d.url || signedUrl, d.v || vv);
                            audio.load();
                            audio.addEventListener('loadedmetadata', function once() {
                                audio.removeEventListener('loadedmetadata', once);
                                try { audio.currentTime = at; } catch (e) {}
                                audio.play().catch(function () {});
                            });
                        })
                        .catch(function () {
                            recovering = false;
                            setStatus('Не удалось продолжить — обновите страницу');
                        });
                }

                audio.addEventListener('error', function () {
                    // До первого звука ошибка означает «сервер не смог» —
                    // тогда браузерный голос честнее молчания.
                    if (!started) {
                        box.innerHTML = '';
                        initBrowserTTS();
                        return;
                    }
                    recover();
                });

                // Не всякий обрыв доходит до события error: часть браузеров
                // (мобильный Safari прежде всего) после долгой паузы молча
                // не отдаёт звук — currentTime стоит, ошибки нет. Ловим это
                // сторожем: сняли с паузы — ждём три секунды движения; не
                // пошло — восстанавливаемся тем же путём, что и при ошибке.
                audio.addEventListener('play', function () {
                    if (!started) return;
                    var wasAt = audio.currentTime;
                    setTimeout(function () {
                        if (!audio.paused && !audio.ended && !recovering &&
                            audio.currentTime === wasAt) recover();
                    }, 3000);
                });
                // Прогрев мог упасть ещё до клика — сеть моргнула на загрузке
                // страницы. Событие error тогда отгремело без слушателя, и клик
                // оставлял вечный спиннер. Даём файлу второй заход: слушатель
                // ошибки уже на месте, повторный провал честно уведёт
                // в браузерный голос.
                if (audio.error) {
                    audio.src = audioUrl(url || signedUrl, vv);
                    audio.load();
                }
                box.appendChild(audio);
                box.appendChild(speed);
                if (audio.readyState >= 3) onReady();  // уже прогрелось — играем сразу
            }

            if (ready) {
                setStatus('Загружаю аудио…');
                play(v);
                return;
            }

            // Генерация идёт на сервере минуты (рерайт + синтез голосом
            // Фреди): пинаем её и поллим статус, а не держим соединение.
            setStatus(isLecture ? 'Фреди готовит лекцию… это займёт пару минут' : 'Готовлю озвучку… ~1–2 мин');
            fetch(audioUrl(signedUrl, v)).then(function (r) {
                if (r.status === 200) { play(v); return; }
                var tries = 0;
                var t = setInterval(function () {
                    if (++tries > 75) { clearInterval(t); box.innerHTML = ''; initBrowserTTS(); return; }
                    fetch(API + '/api/tts/blog/' + slug + '/status')
                        .then(function (rr) { return rr.json(); })
                        .then(function (d) {
                            if (d && d.error) { clearInterval(t); box.innerHTML = ''; initBrowserTTS(); return; }
                            // подпись берём свежую: пока шла генерация, окно могло смениться
                            if (d && d.ready) { clearInterval(t); play(d.v || v, d.url); }
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
        rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
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
