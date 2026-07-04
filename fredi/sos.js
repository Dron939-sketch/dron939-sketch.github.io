// ============================================
// sos.js — «Мне плохо прямо сейчас»
// Короткий протокол стабилизации: дыхание →
// что происходит → 3 конкретных шага → чат.
// Никакой диагностики, только первая помощь.
// ============================================
(function () {
    'use strict';

    function container() { return document.getElementById('screenContainer'); }
    function track(ev, d) { try { if (window.FrediTracker) window.FrediTracker.track(ev, d || {}); } catch (e) {} }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function vibe(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

    var KINDS = [
        { key: 'panic', em: '😰', name: 'Паника / тревога', steps: [
            ['Заземление 5-4-3-2-1', 'Найдите глазами 5 предметов вокруг. Услышьте 4 звука. Поймайте 3 ощущения в теле. 2 запаха. 1 вкус. Не торопитесь — это возвращает мозг из «опасности» в «здесь и сейчас».'],
            ['Холод', 'Умойтесь холодной водой или приложите холодное к запястьям и щекам. Это включает нырятельный рефлекс — пульс замедляется сам.'],
            ['Назовите вслух', '«Это паника. Это пик. Он спадает за 2–3 минуты сам». Не боритесь с волной — пережидайте её. Она всегда спадает.']
        ]},
        { key: 'anger', em: '😡', name: 'Злость', steps: [
            ['20 минут без решений', 'Не отправляйте сообщений, не принимайте решений. Злость решает быстро и плохо — дайте коре мозга вернуться в игру.'],
            ['Дайте телу выход', '20 приседаний, быстрая ходьба или 10 раз медленно сожмите и разожмите кулаки. Адреналин должен сгореть в мышцах, а не в словах.'],
            ['Найдите «потому что»', 'Закончите фразу: «Я злюсь, потому что для меня важно …». Злость всегда охраняет что-то ценное — назовите что.']
        ]},
        { key: 'tears', em: '😢', name: 'Слёзы / обида', steps: [
            ['Разрешите себе', 'Слёзы — это разрядка нервной системы, а не слабость. 5–10 минут не сдерживайтесь — после станет физически легче.'],
            ['Тепло и опора', 'Тёплый напиток, плед, сядьте так, чтобы спина на что-то опиралась. Телу нужен сигнал «я в безопасности».'],
            ['Одна фраза', 'Произнесите или запишите: «Мне больно, потому что …». Названная боль занимает меньше места, чем безымянная.']
        ]},
        { key: 'numb', em: '🕳️', name: 'Пустота / оцепенение', steps: [
            ['Верните тело', 'Потрите ладони друг о друга до тепла. Потопайте ногами. Почувствуйте, как стопы давят на пол.'],
            ['Одно простое действие', 'Выпейте стакан воды, откройте окно, умойтесь. Одно действие — и заметьте, что вы его сделали.'],
            ['Тёплый контакт', 'Напишите одному человеку. Не «обсудить проблему» — просто «привет, как ты?». Контакт возвращает быстрее анализа.']
        ]},
        { key: 'loop', em: '🌀', name: 'Мысли по кругу', steps: [
            ['Выгрузите на бумагу', '3 минуты пишите всё, что крутится, — без редактуры и оценки. Мозг перестаёт повторять то, что уже записано.'],
            ['Назначьте встречу', 'Скажите себе: «Подумаю об этом сегодня в 19:00, 15 минут». Запланированная тревога отпускает — проверено в КПТ.'],
            ['Смените канал', '10 минут действия руками: душ, посуда, прогулка. Мысленная жвачка живёт в бездействии.']
        ]},
        { key: 'all', em: '⚡', name: 'Всё сразу / непонятно', steps: [
            ['Сначала тело', 'Стакан воды, ещё один круг дыхания, холодная вода на лицо. Пока тело в тревоге — разбираться бесполезно.'],
            ['Назовите 1–2 словами', 'Спросите себя: «Что я сейчас чувствую?». Страх? Усталость? Обида? Непонятный ком пугает сильнее названного.'],
            ['Один шаг на 5%', 'Что можно сделать за 5 минут, чтобы стало на 5% легче? Только это. Остальное — потом.']
        ]}
    ];

    var ST = { timer: null, cycle: 0, phase: 0 };

    function injectCSS() {
        if (document.getElementById('sos-styles')) return;
        var s = document.createElement('style');
        s.id = 'sos-styles';
        s.textContent = [
            '.sos-wrap{max-width:520px;margin:0 auto;padding:8px 4px 32px}',
            '.sos-ghost{background:none;border:none;color:#8b93a7;font-size:.92rem;cursor:pointer;padding:6px 0;margin-bottom:10px}',
            '.sos-h1{font-size:1.35rem;font-weight:800;color:var(--text-primary,#f2f3f5);margin:0 0 6px}',
            '.sos-lead{color:var(--text-secondary,#9aa1b0);line-height:1.6;margin:0 0 18px;font-size:.97rem}',
            '.sos-breath{display:flex;flex-direction:column;align-items:center;padding:26px 0 10px}',
            '.sos-circle{width:150px;height:150px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(56,189,248,.45),rgba(59,130,255,.15));border:2px solid rgba(56,189,248,.5);transition:transform 2.2s ease-in-out;transform:scale(.72)}',
            '.sos-circle.in{transform:scale(1.05)}',
            '.sos-circle.in2{transform:scale(1.18);transition-duration:1s}',
            '.sos-circle.out{transform:scale(.72);transition-duration:5.2s}',
            '.sos-phase{font-size:1.15rem;font-weight:700;color:var(--text-primary,#f2f3f5);margin:22px 0 4px;min-height:26px}',
            '.sos-count{color:var(--text-secondary,#9aa1b0);font-size:.9rem;margin-bottom:18px}',
            '.sos-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);border-radius:16px;padding:16px 18px;margin:0 0 12px;line-height:1.6}',
            '.sos-card b{display:block;margin-bottom:5px;color:var(--text-primary,#f2f3f5)}',
            '.sos-card span{color:var(--text-secondary,#c8ccd4);font-size:.95rem}',
            '.sos-chip{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:15px 16px;margin:0 0 10px;font-size:1rem;font-weight:600;color:var(--text-primary,#f2f3f5);cursor:pointer}',
            '.sos-chip:active{transform:scale(.98)}',
            '.sos-chip .em{font-size:1.4rem}',
            '.sos-primary{display:block;width:100%;border:none;border-radius:14px;padding:15px;font-size:1rem;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#00A8E8,#3A86FF);margin:14px 0 10px}',
            '.sos-secondary{display:block;width:100%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);border-radius:14px;padding:13px;font-size:.95rem;font-weight:600;color:var(--text-primary,#e5e7eb);cursor:pointer;margin:0 0 10px}',
            '.sos-help{border-top:1px solid rgba(255,255,255,.09);margin-top:20px;padding-top:14px;font-size:.82rem;line-height:1.6;color:var(--text-secondary,#8b93a7)}',
            '.sos-help b{color:var(--text-primary,#e5e7eb)}',
            '[data-theme="light"] .sos-card,[data-theme="light"] .sos-chip,[data-theme="light"] .sos-secondary{border-color:rgba(20,29,51,.14);background:rgba(20,29,51,.04)}',
            '[data-theme="light"] .sos-help{border-color:rgba(20,29,51,.12)}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function _helpLine() {
        return '<div class="sos-help"><b>Важно.</b> Если есть мысли о причинении себе вреда или ситуация угрожает жизни — сразу звоните <b>112</b>. Круглосуточная психологическая помощь: <b>8-495-989-50-50</b> (МЧС, бесплатно). Фреди — поддержка, но не замена экстренной помощи.</div>';
    }

    function _stopTimer() { if (ST.timer) { clearTimeout(ST.timer); ST.timer = null; } }

    // Экран 1: дыхание (физиологический вздох — двойной вдох + длинный выдох)
    function showSosScreen() {
        injectCSS();
        _stopTimer();
        track('sos_opened', {});
        try { if (window.FrediTracker && window.FrediTracker.openFeature) window.FrediTracker.openFeature('sos'); } catch (e) {}
        var c = container(); if (!c) return;
        ST.cycle = 0;
        c.innerHTML =
            '<div class="sos-wrap">' +
            '  <button class="sos-ghost" onclick="(window.renderDashboard||function(){})()">← На главную</button>' +
            '  <div class="sos-h1">Сейчас — только дыхание</div>' +
            '  <div class="sos-lead">Всё остальное подождёт минуту. Дышите вместе с кругом: два коротких вдоха носом — и долгий выдох ртом. Это самый быстрый физиологический способ снизить тревогу.</div>' +
            '  <div class="sos-breath">' +
            '    <div class="sos-circle" id="sosCircle"></div>' +
            '    <div class="sos-phase" id="sosPhase">приготовьтесь…</div>' +
            '    <div class="sos-count" id="sosCount">6 циклов · меньше минуты</div>' +
            '  </div>' +
            '  <button class="sos-secondary" onclick="SOS.pickScreen()">Пропустить дыхание →</button>' +
            _helpLine() +
            '</div>';
        ST.timer = setTimeout(_breathCycle, 1200);
    }

    function _breathCycle() {
        var circle = document.getElementById('sosCircle'), phase = document.getElementById('sosPhase'), count = document.getElementById('sosCount');
        if (!circle || !phase) return; // ушли с экрана
        if (ST.cycle >= 6) {
            track('sos_breath_done', {});
            phase.textContent = 'Хорошо. Ещё один обычный вдох-выдох…';
            ST.timer = setTimeout(pickScreen, 2500);
            return;
        }
        ST.cycle++;
        if (count) count.textContent = 'цикл ' + ST.cycle + ' из 6';
        circle.className = 'sos-circle in'; phase.textContent = 'Вдох носом…'; vibe(15);
        ST.timer = setTimeout(function () {
            if (!document.getElementById('sosCircle')) return;
            circle.className = 'sos-circle in2'; phase.textContent = '…и ещё чуть-чуть';
            ST.timer = setTimeout(function () {
                if (!document.getElementById('sosCircle')) return;
                circle.className = 'sos-circle out'; phase.textContent = 'Долгий выдох ртом…'; vibe(10);
                ST.timer = setTimeout(_breathCycle, 5400);
            }, 1100);
        }, 2300);
    }

    // Экран 2: что происходит
    function pickScreen() {
        _stopTimer();
        var c = container(); if (!c) return;
        var chips = KINDS.map(function (k) {
            return '<button class="sos-chip" onclick="SOS.kind(\'' + k.key + '\')"><span class="em">' + k.em + '</span>' + esc(k.name) + '</button>';
        }).join('');
        c.innerHTML =
            '<div class="sos-wrap">' +
            '  <button class="sos-ghost" onclick="SOS.open()">← Дыхание ещё раз</button>' +
            '  <div class="sos-h1">Что сейчас происходит?</div>' +
            '  <div class="sos-lead">Выберите ближайшее — дам три конкретных шага на ближайшие 10 минут.</div>' +
            chips +
            _helpLine() +
            '</div>';
    }

    // Экран 3: шаги
    function kind(key) {
        var k = null;
        for (var i = 0; i < KINDS.length; i++) if (KINDS[i].key === key) k = KINDS[i];
        if (!k) return pickScreen();
        track('sos_kind_selected', { kind: key });
        var c = container(); if (!c) return;
        var cards = k.steps.map(function (st, i) {
            return '<div class="sos-card"><b>' + (i + 1) + '. ' + esc(st[0]) + '</b><span>' + esc(st[1]) + '</span></div>';
        }).join('');
        c.innerHTML =
            '<div class="sos-wrap">' +
            '  <button class="sos-ghost" onclick="SOS.pickScreen()">← Выбрать другое</button>' +
            '  <div class="sos-h1">' + k.em + ' ' + esc(k.name) + '</div>' +
            '  <div class="sos-lead">Три шага, по порядку. Не нужно делать идеально — нужно просто делать.</div>' +
            cards +
            '  <button class="sos-primary" onclick="SOS.chat(\'' + key + '\')">💬 Рассказать Фреди, что происходит</button>' +
            '  <button class="sos-secondary" onclick="SOS.open()">Дыхание ещё раз</button>' +
            '  <button class="sos-secondary" onclick="SOS.better(\'' + key + '\')">Мне уже легче ✓</button>' +
            _helpLine() +
            '</div>';
    }

    function chat(key) {
        track('sos_chat', { kind: key });
        try { if (window.renderDashboard) window.renderDashboard(); } catch (e) {}
        setTimeout(function () {
            var btn = document.getElementById('mainVoiceBtn');
            if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            try { if (window.showToast) window.showToast('Расскажите голосом или текстом — Фреди рядом', 'info'); } catch (e) {}
        }, 300);
    }

    function better(key) {
        track('sos_better', { kind: key });
        try { if (window.showToast) window.showToast('Это вы справились. Возвращайтесь, если накатит снова', 'success'); } catch (e) {}
        try { if (window.renderDashboard) window.renderDashboard(); } catch (e) {}
    }

    window.showSosScreen = showSosScreen;
    window.SOS = { open: showSosScreen, pickScreen: pickScreen, kind: kind, chat: chat, better: better };
})();
