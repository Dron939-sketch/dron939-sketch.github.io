// sound.js — беззвучный режим: Фреди отвечает текстом и молчит.
//
// Зачем. Формат разговора выбирает не приложение, а обстановка. Человек
// открывает Фреди в метро, в открытом офисе, рядом со спящим ребёнком —
// и получает голос из динамика. Дальше он не выключает звук, а закрывает
// вкладку: неуместность формата читается как «это не для меня сейчас»
// (замечание владельца 15.09.2026 — вероятная причина ухода после первого
// сообщения). Беззвучный режим оставляет тот же разговор, только текстом.
//
// Как устроено. Состояние живёт здесь и нигде больше, а запреты стоят у
// источников звука, а не у кнопок: voice.js не синтезирует и не играет,
// openers.js не проигрывает представление, app.js — приветствие. Поэтому
// два десятка модулей с «🔊 Озвучить» слушаются режима, не зная о нём.
//
// Выключенный звук — это ещё и не отправленный запрос: в беззвучном
// режиме /api/voice/process_stream просят не синтезировать (text_only),
// а textToSpeech не ходит в сеть вовсе. Синтез стоит денег и секунд,
// и платить за то, что никто не услышит, незачем.

(function () {
    'use strict';

    var KEY = 'fredi_sound_off';
    var _off = false;

    try { _off = localStorage.getItem(KEY) === '1'; } catch (e) {}

    function isOff() { return _off; }
    function isOn() { return !_off; }

    function set(off) {
        off = !!off;
        if (off === _off) return _off;
        _off = off;
        try { localStorage.setItem(KEY, off ? '1' : '0'); } catch (e) {}
        // Выключили звук посреди ответа — он должен замолчать сразу, а не
        // дочитать начатое: человек нажал именно потому, что уже неуместно.
        if (off) {
            try {
                if (window.voiceManager && typeof window.voiceManager.interrupt === 'function')
                    window.voiceManager.interrupt();
            } catch (e) {}
        }
        try {
            document.dispatchEvent(new CustomEvent('fredi:sound', { detail: { off: off } }));
        } catch (e) {}
        try {
            if (window.FrediTracker && window.FrediTracker.track)
                window.FrediTracker.track('sound_toggled', { off: off });
        } catch (e) {}
        return _off;
    }

    function toggle() { return set(!_off); }

    window.FrediSound = {
        isOff: isOff,
        isOn: isOn,
        set: set,
        toggle: toggle,
    };
})();
