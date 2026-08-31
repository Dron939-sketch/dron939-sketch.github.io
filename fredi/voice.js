// ============================================
// FREDI VOICE v2.0
// WebSocket-first с автоматическим fallback на HTTP
// Поддержка: iOS Safari, Android Chrome, Desktop
// ============================================

// ============================================
// АУДИО ПЛЕЕР
// ============================================

class AudioPlayer {
    constructor() {
        this.currentUrl = null;
        this.onPlayStart = null;
        this.onPlayEnd = null;
        this.onError = null;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this._unlocked = false;

        // Единственный персистентный Audio-элемент.
        // iOS Safari разрешает .play() только на том элементе,
        // которому play() уже вызывали во время user gesture.
        this.audio = new Audio();
        this.audio.preload = 'auto';
        this.audio.volume = 1.0;
        this.audio.playsInline = true;
        this.audio.setAttribute('playsinline', '');
        this.audio.setAttribute('webkit-playsinline', '');

        const unlock = () => {
            if (this._unlocked) return;
            this._unlocked = true;
            // Беззвучный data URI — короткий валидный mp3
            const silent = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAACpgCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID///////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAqaJ7Z/XAAAAAAAAAAAAAAAAAAAAAP/7kGQAD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
            this.audio.src = silent;
            const p = this.audio.play();
            if (p && p.then) p.then(() => { try { this.audio.pause(); this.audio.currentTime = 0; } catch {} }).catch(() => {});
            document.removeEventListener('touchstart', unlock, true);
            document.removeEventListener('touchend', unlock, true);
            document.removeEventListener('click', unlock, true);
        };
        document.addEventListener('touchstart', unlock, true);
        document.addEventListener('touchend', unlock, true);
        document.addEventListener('click', unlock, true);
    }

    // Принудительный unlock — вызывается из onTouchStart кнопки записи,
    // т.к. реальный user gesture именно там, а не на document
    primeForPlayback() {
        if (this._unlocked) return;
        this._unlocked = true;
        const silent = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAACpgCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID///////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAqaJ7Z/XAAAAAAAAAAAAAAAAAAAAAP/7kGQAD/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
        try {
            this.audio.src = silent;
            const p = this.audio.play();
            if (p && p.then) p.then(() => { try { this.audio.pause(); this.audio.currentTime = 0; } catch {} }).catch(() => {});
        } catch {}
    }

    async play(audioData, mimeType = 'audio/mpeg') {
        this.stop();
        let audioUrl = null;
        let isObjectUrl = false;

        try {
            if (typeof audioData === 'string' && audioData.startsWith('data:')) {
                const m = audioData.match(/^data:(audio\/[^;]+);base64,(.+)$/);
                if (m) {
                    const binary = atob(m[2]);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    audioUrl = URL.createObjectURL(new Blob([bytes], { type: m[1] }));
                    isObjectUrl = true;
                }
            } else if (typeof audioData === 'string' && audioData.startsWith('blob:')) {
                audioUrl = audioData;
            } else if (typeof audioData === 'string') {
                try {
                    const binary = atob(audioData);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    audioUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
                    isObjectUrl = true;
                } catch { audioUrl = audioData; }
            } else if (audioData instanceof Blob) {
                audioUrl = URL.createObjectURL(audioData);
                isObjectUrl = true;
            } else {
                throw new Error('Неизвестный формат аудио');
            }

            if (!audioUrl) throw new Error('Не удалось создать URL аудио');
            this.currentUrl = isObjectUrl ? audioUrl : null;

            return new Promise((resolve, reject) => {
                const cleanup = () => {
                    if (isObjectUrl && this.currentUrl) {
                        try { URL.revokeObjectURL(this.currentUrl); } catch {}
                        this.currentUrl = null;
                    }
                };
                this.audio.onended = () => {
                    cleanup();
                    if (this.onPlayEnd) this.onPlayEnd();
                    resolve();
                };
                this.audio.onerror = () => {
                    cleanup();
                    if (this.onError) this.onError('Не удалось воспроизвести аудио');
                    reject(new Error('Audio error'));
                };
                this.audio.src = audioUrl;
                this.audio.load();

                const doPlay = () => {
                    const p = this.audio.play();
                    if (p && p.then) {
                        p.then(() => { if (this.onPlayStart) this.onPlayStart(); })
                         .catch(err => {
                             cleanup();
                             if (this.onError) this.onError('Нажмите на экран для включения звука');
                             reject(err);
                         });
                    }
                };

                if (this.isIOS) {
                    this.audio.oncanplaythrough = doPlay;
                    setTimeout(doPlay, 300);
                } else {
                    this.audio.oncanplay = doPlay;
                    setTimeout(doPlay, 100);
                }
            });
        } catch (err) {
            if (this.onError) this.onError('Ошибка звука: ' + err.message);
            throw err;
        }
    }

    stop() {
        try { this.audio.pause(); } catch {}
        if (this.currentUrl) {
            try { URL.revokeObjectURL(this.currentUrl); } catch {}
            this.currentUrl = null;
        }
    }

    isPlaying() { return this.audio && !this.audio.paused && !this.audio.ended; }
    dispose() { this.stop(); }
}

// ============================================
// ИНДИКАТОР ЗАГРУЗКИ
// ============================================

class LoadingIndicator {
    constructor() {
        this.el = null;
        this.interval = null;
        this.dots = 0;
        this.isShowing = false;
    }

    show(message = 'Фреди думает') {
        this.remove();
        this.el = document.createElement('div');
        this.el.style.cssText = `
            position:fixed; bottom:max(100px,calc(env(safe-area-inset-bottom)+80px));
            left:50%; transform:translateX(-50%);
            background:rgba(10,10,10,0.95); backdrop-filter:blur(20px);
            -webkit-backdrop-filter:blur(20px); border-radius:50px;
            padding:12px 24px; border:1px solid rgba(224,224,224,0.2);
            z-index:9998; display:flex; align-items:center; gap:8px;
            pointer-events:none; font-size:14px; color:rgba(224,224,224,0.8);
            white-space:nowrap;
        `;
        this.msgEl = document.createElement('span');
        this.msgEl.textContent = message;
        this.dotsEl = document.createElement('span');
        this.dotsEl.textContent = '...';
        this.el.appendChild(this.msgEl);
        this.el.appendChild(this.dotsEl);
        document.body.appendChild(this.el);
        this.isShowing = true;
        this.interval = setInterval(() => {
            this.dots = (this.dots + 1) % 4;
            if (this.dotsEl) this.dotsEl.textContent = '.'.repeat(this.dots) + '\u00a0'.repeat(3 - this.dots);
        }, 400);
    }

    update(message) { if (this.msgEl) this.msgEl.textContent = message; }

    remove() {
        if (this.interval) { clearInterval(this.interval); this.interval = null; }
        if (this.el) { try { this.el.remove(); } catch {} this.el = null; }
        this.isShowing = false;
        this.dots = 0;
    }
}

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const VoiceConfig = {
    apiBaseUrl: window.CONFIG?.API_BASE_URL || 'https://ffred-ddd989.amvera.io',

    // WebSocket включён — с автофallback на HTTP при неудаче
    useWebSocket: true,

    // iOS — всегда только HTTP (WebSocket с бинарными чанками нестабилен)
    forceHTTPoniOS: true,

    recording: {
        // 16000 Hz — оптимально для STT (DeepGram), iOS Safari принимает.
        // Раньше для iOS использовали 44100 — большие файлы и лишняя нагрузка.
        sampleRate: 16000,
        maxDuration: 60000,
        minDuration: 500,         // 500мс минимум для distress-tap
        chunkSize: 4096,
        format: 'wav',
        mimeType: 'audio/wav'
    },

    playback: { volume: 1.0 },

    voices: {
        coach:        { name: 'Филипп',            speed: 1.0, pitch: 1.0,  emotion: 'neutral'   },
        psychologist: { name: 'Эрмил',             speed: 0.9, pitch: 0.95, emotion: 'calm'      },
        trainer:      { name: 'Филипп (энергичный)', speed: 1.1, pitch: 1.05, emotion: 'energetic' }
    },

    ui: {
        autoStopAfterSilence: true,
        silenceTimeout: 4000,
        minVolumeToConsiderSpeech: 4
    },

    ws: {
        connectTimeout: 15000,  // мс до признания WS недоступным (Render = 10-30с)
        pingInterval: 25000,    // heartbeat
        maxRetries: 5,          // попыток переподключения WS
        retryDelay: 8000        // мс между попытками
    },

    diagnostics: {
        isIOS:                 /iPad|iPhone|iPod/.test(navigator.userAgent),
        isAndroid:             /Android/.test(navigator.userAgent),
        audioContextSupported: !!(window.AudioContext || window.webkitAudioContext),
        mediaRecorderSupported: !!window.MediaRecorder,
        getUserMediaSupported:  !!(navigator.mediaDevices?.getUserMedia)
    }
};

// ============================================
// РЕКОРДЕР
// ============================================

class VoiceRecorder {
    constructor(config = {}) {
        this.config    = { ...VoiceConfig.recording, ...config };
        this.isIOS     = VoiceConfig.diagnostics.isIOS;
        this.isAndroid = VoiceConfig.diagnostics.isAndroid;
        this.recording     = false;
        this.mediaStream   = null;
        this.audioCtx      = null;
        this.processor     = null;
        this.analyser      = null;
        this.wavData       = [];
        this.mediaRecorder = null;
        this.mrChunks      = [];
        this.rafId         = null;
        this.stopTimer     = null;
        this.silenceStart  = null;
        this.speechSeen    = false;
        this.onRecordingStart = null;
        this.onRecordingStop  = null;
        this.onVolumeChange   = null;
        this.onSpeechDetected = null;
        this.onError          = null;
    }

    async start() {
        if (this.recording) return false;
        try {
            // На iOS Safari MediaRecorder выдаёт fragmented MP4, который часто
            // невалиден для STT (см. WebKit Bug #216832 и issues с DeepGram/Whisper).
            // Поэтому ВЕЗДЕ используем ScriptProcessor → WAV — это работает на 100%
            // на всех браузерах, формат гарантированно валиден для бэкенда.
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                }
            });
            this.mediaStream = stream;
            this.wavData = [];
            this.mrChunks = [];
            this.speechSeen = false;
            this.silenceStart = null;
            this.recording = true;
            this._recordingStartTs = Date.now();
            this._actualSampleRate = null;

            await this._setupAudioPipeline(stream);

            this.stopTimer = setTimeout(() => this.stop(), this.config.maxDuration);
            if (this.onRecordingStart) this.onRecordingStart();
            return true;
        } catch (err) {
            this.recording = false;
            console.error('VoiceRecorder.start error:', err);
            const msgs = {
                NotAllowedError:  'Разрешите доступ к микрофону в настройках браузера',
                NotFoundError:    'Микрофон не найден',
                NotReadableError: 'Микрофон занят другим приложением'
            };
            if (this.onError) this.onError(msgs[err.name] || 'Не удалось запустить микрофон');
            return false;
        }
    }

    // Общая обработка PCM-чанка — одинаковая для worklet и legacy ветки.
    // Принимает Int16Array и precomputed sumAbs (worklet считает сам;
    // legacy путь считает в onaudioprocess).
    _handlePcmChunk(int16, sumAbs) {
        if (!this.recording) return;
        this.wavData.push(int16);
        const n = int16.length || 1;
        const vol = Math.min(100, (sumAbs / n / 32768) * 100);
        if (this.onVolumeChange) this.onVolumeChange(vol);
        const isSpeech = vol > VoiceConfig.ui.minVolumeToConsiderSpeech;
        if (isSpeech) {
            if (!this.speechSeen) { this.speechSeen = true; if (this.onSpeechDetected) this.onSpeechDetected(true); }
            this.silenceStart = null;
        } else if (this.speechSeen && !this.silenceStart) {
            this.silenceStart = Date.now();
        }
    }

    async _setupAudioPipeline(stream) {
        // Создаём AudioContext (та же логика что была: iOS не даёт жёстко
        // задать sampleRate, fallback на дефолт).
        const Ctx = window.AudioContext || window.webkitAudioContext;
        try {
            this.audioCtx = new Ctx({ sampleRate: this.config.sampleRate });
        } catch (e) {
            console.warn('AudioContext: fallback to default sampleRate', e?.message);
            this.audioCtx = new Ctx();
        }
        if (this.audioCtx.state === 'suspended') {
            try { await this.audioCtx.resume(); } catch (e) { console.warn('audioCtx.resume failed:', e); }
        }
        this._actualSampleRate = this.audioCtx.sampleRate;

        const src = this.audioCtx.createMediaStreamSource(stream);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        src.connect(this.analyser);

        // AudioWorkletNode — современный путь. iOS Safari < 14.5 и старые
        // Android-браузеры его не поддерживают → fallback на ScriptProcessor
        // (в Chrome он deprecated, но ещё работает; пометка от Chrome — это
        // именно warning, а не ошибка).
        const canWorklet = !!(this.audioCtx.audioWorklet
            && typeof AudioWorkletNode !== 'undefined');
        if (canWorklet) {
            try {
                await this._setupWorklet(src);
                console.log(`🎤 AudioWorklet sampleRate: ${this._actualSampleRate}`);
                this._startVolumeRaf();
                return;
            } catch (e) {
                console.warn('AudioWorklet setup failed, fallback to ScriptProcessor:', e);
            }
        }
        this._setupScriptProcessor(src);
        console.log(`🎤 ScriptProcessor sampleRate: ${this._actualSampleRate}`);
        this._startVolumeRaf();
    }

    async _setupWorklet(src) {
        // Воркет-модуль резолвится относительно URL текущего HTML-документа.
        // SW зарегистрирован под /fredi/, поэтому относительный путь —
        // 'voice-pcm-worklet.js' — указывает в /fredi/. ?v= — cache-bust
        // на случай если SW закешировал старую версию (он отдаёт .js с
        // cache:'reload', но подстраховка не лишняя).
        const url = new URL('voice-pcm-worklet.js', document.baseURI).toString();
        await this.audioCtx.audioWorklet.addModule(url);
        this.processor = new AudioWorkletNode(this.audioCtx, 'voice-pcm-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            channelCount: 1,
            processorOptions: { chunkSize: this.config.chunkSize },
        });
        this.processor.port.onmessage = (e) => {
            const d = e.data;
            if (!d || !d.int16) return;
            this._handlePcmChunk(d.int16, d.sumAbs);
        };
        src.connect(this.processor);
        // На iOS обязательно подключить к destination, иначе process()
        // не вызывается. На worklet та же история.
        this.processor.connect(this.audioCtx.destination);
    }

    _setupScriptProcessor(src) {
        // Deprecated, но нужен как fallback для iOS Safari < 14.5 и
        // старых Android-браузеров без AudioWorklet.
        this.processor = this.audioCtx.createScriptProcessor(this.config.chunkSize, 1, 1);
        this.processor.onaudioprocess = e => {
            if (!this.recording) return;
            const data = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(data.length);
            let sumAbs = 0;
            for (let i = 0; i < data.length; i++) {
                const s = Math.max(-1, Math.min(1, data[i]));
                int16[i] = s * 32767;
                sumAbs += Math.abs(int16[i]);
            }
            this._handlePcmChunk(int16, sumAbs);
        };
        src.connect(this.processor);
        // На iOS обязательно подключить процессор к destination иначе onaudioprocess не вызывается
        this.processor.connect(this.audioCtx.destination);
    }

    _setupAnalyser(stream) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            this._volCtx = ctx;
            const buf = new Uint8Array(analyser.frequencyBinCount);
            const tick = () => {
                if (!this.recording) return;
                analyser.getByteFrequencyData(buf);
                const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
                if (this.onVolumeChange) this.onVolumeChange(Math.min(100, (avg / 255) * 100));
                this.rafId = requestAnimationFrame(tick);
            };
            tick();
        } catch (e) { console.warn('Volume analyser failed:', e); }
    }

    _startVolumeRaf() {
        if (!this.analyser) return;
        const buf = new Uint8Array(this.analyser.frequencyBinCount);
        const tick = () => {
            if (!this.recording || !this.analyser) return;
            this.analyser.getByteFrequencyData(buf);
            const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
            if (this.onVolumeChange) this.onVolumeChange(Math.min(100, (avg / 255) * 100));
            this.rafId = requestAnimationFrame(tick);
        };
        tick();
    }

    stop() {
        if (!this.recording) return;
        this.recording = false;
        this.silenceStart = null;
        this.speechSeen = false;
        const durationMs = this._recordingStartTs ? (Date.now() - this._recordingStartTs) : 0;
        this._lastDurationMs = durationMs;

        if (this.stopTimer) { clearTimeout(this.stopTimer); this.stopTimer = null; }
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
        if (this.processor) { try { this.processor.disconnect(); } catch {} this.processor = null; }
        if (this.audioCtx)  { this.audioCtx.close().catch(() => {}); this.audioCtx = null; }
        if (this._volCtx)   { this._volCtx.close().catch(() => {}); this._volCtx = null; }
        this._stopStream();

        // Проверка длительности — единственный надёжный критерий "слишком короткое"
        if (durationMs < this.config.minDuration) {
            console.warn(`🎤 Recording too short: ${durationMs}ms < ${this.config.minDuration}ms`);
            if (this.onError) this.onError('Говорите немного дольше');
            if (this.onRecordingStop) this.onRecordingStop(null);
            return;
        }

        if (this.wavData.length > 0) {
            const blob = this._buildWav();
            console.log(`🎤 Recording finished: ${durationMs}ms, ${blob.size}b WAV @${this._actualSampleRate}Hz`);
            this._finish(blob);
        } else {
            console.warn('🎤 No audio data captured');
            if (this.onError) this.onError('Не удалось получить аудио');
            if (this.onRecordingStop) this.onRecordingStop(null);
        }
    }

    _stopStream() {
        if (this.mediaStream) { this.mediaStream.getTracks().forEach(t => { try { t.stop(); } catch {} }); this.mediaStream = null; }
    }

    _finish(blob) { this._stopStream(); if (this.onRecordingStop) this.onRecordingStop(blob); }

    _buildWav() {
        // Реальный sampleRate берём из AudioContext (на iOS он часто 48000
        // даже если запросили 16000). Это критично для корректного WAV,
        // иначе DeepGram расшифровывает речь "ускоренной/замедленной".
        const sr = this._actualSampleRate || this.config.sampleRate;

        let total = 0;
        for (const c of this.wavData) total += c.length;
        const MAX = Math.floor((this.config.maxDuration / 1000) * sr);
        if (total > MAX) total = MAX;
        const combined = new Int16Array(total);
        let offset = 0;
        for (const c of this.wavData) {
            if (offset >= total) break;
            const len = Math.min(c.length, total - offset);
            combined.set(c.subarray(0, len), offset);
            offset += len;
        }

        const buf = new ArrayBuffer(44 + combined.length * 2);
        const v   = new DataView(buf);
        const ws  = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
        ws(0, 'RIFF'); v.setUint32(4, 36 + combined.length * 2, true);
        ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true);
        v.setUint16(20, 1, true); v.setUint16(22, 1, true);  // PCM, mono
        v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);  // sample rate, byte rate
        v.setUint16(32, 2, true); v.setUint16(34, 16, true); // block align, bits per sample
        ws(36, 'data'); v.setUint32(40, combined.length * 2, true);
        for (let i = 0; i < combined.length; i++) v.setInt16(44 + i * 2, combined[i], true);
        return new Blob([buf], { type: 'audio/wav' });
    }

    isRecordingActive() { return this.recording; }
    dispose() { this.stop(); }
}

// ============================================
// TRANSPORT — WebSocket-first + HTTP fallback
// ============================================

class VoiceTransport {
    constructor(userId, apiBaseUrl) {
        this.userId     = userId;
        this.apiBaseUrl = apiBaseUrl;
        this.isIOS      = VoiceConfig.diagnostics.isIOS;
        this.currentMode = 'psychologist';

        // Состояние транспорта
        this._ws          = null;
        this._wsReady     = false;
        this._wsRetries   = 0;
        this._pingTimer   = null;
        this._audioChunks = [];  // буфер аудио-чанков от WS
        this._aiTextSoFar = '';  // накопленный текст ответа AI (стрим по чанкам)
        // Потоковая озвучка по предложениям (seq:true): каждый чанк — целый MP3,
        // играем сразу и последовательно, не дожидаясь конца ответа.
        this._seqQueue = [];
        this._seqPlaying = false;
        this._seqEnded = false;
        this._seqT0 = 0;  // метка времени первого seq-чанка (для лога скорости)
        this._wsResponseTimer = null;  // таймаут ожидания ответа по WS
        this._pendingAudioBlob = null; // блоб для повторной отправки через HTTP при разрыве WS

        // Режим: 'ws' | 'http'
        this._mode = 'http';

        // Callbacks
        this.onTranscript     = null;
        this.onAIResponse     = null;
        this.onAIPartial      = null;  // стриминговое обновление AI-текста
        this.onStatusChange   = null;
        this.onError          = null;
        this.onThinking       = null;
        this.onThinkingUpdate = null;
        this.onWeather        = null;
        this.onModeChange     = null;  // уведомить UI о смене транспорта
    }

    // ---- ПОДКЛЮЧЕНИЕ ----

    async connect() {
        // iOS — сразу HTTP, WebSocket нестабилен с бинарными данными
        if (this.isIOS || !VoiceConfig.useWebSocket) {
            return this._initHTTP('iOS или useWebSocket=false');
        }
        return this._connectWS();
    }

    async _connectWS(isRetry = false) {
        // Передаём текущий режим как query param — бэкенд использует его при создании mode_instance
        const modeParam = this.currentMode ? `?mode=${this.currentMode}` : '';
        const wsUrl = this.apiBaseUrl.replace(/^https?/, 'wss').replace(/^http/, 'ws')
                    + `/ws/voice/${this.userId}${modeParam}`;

        console.log(`🔌 WS connect: ${wsUrl}${isRetry ? ' (retry)' : ''}`);

        return new Promise(resolve => {
            const timeout = setTimeout(() => {
                console.warn('⏱️ WS connect timeout → HTTP fallback');
                this._wsCleanup();
                this._initHTTP('timeout');
                resolve(false);
            }, VoiceConfig.ws.connectTimeout);

            try {
                this._ws = new WebSocket(wsUrl);
            } catch (e) {
                clearTimeout(timeout);
                console.warn('WS constructor error:', e.message, '→ HTTP fallback');
                this._initHTTP('constructor error');
                resolve(false);
                return;
            }

            this._ws.onopen = () => {
                clearTimeout(timeout);
                this._wsReady = true;
                this._mode = 'ws';
                this._wsRetries = 0;
                console.log('✅ WebSocket connected');
                this._startPing();
                if (this.onModeChange) this.onModeChange('ws');
                if (this.onStatusChange) this.onStatusChange('connected');
                resolve(true);
            };

            this._ws.onerror = () => {
                clearTimeout(timeout);
                console.warn('WS error → HTTP fallback');
                this._wsCleanup();
                this._initHTTP('ws error');
                resolve(false);
            };

            this._ws.onclose = (e) => {
                clearTimeout(timeout);
                const wasWS = this._mode === 'ws';
                this._wsReady = false;

                // 4002 = сервер закрыл из-за исчерпанного лимита (meter).
                // НЕ делаем HTTP-фоллбэк и НЕ реконнектим — иначе уйдёт
                // мёртвый запрос и юзер увидит «ошибку». Показываем пейволл
                // (дедуп: если meter_blocked-сообщение уже показало — повтора нет).
                if (e.code === 4002) {
                    this._pendingAudioBlob = null;
                    this._clearWsResponseTimer();
                    this._showMeterPaywall({ trial_exhausted: true });
                    if (this.onStatusChange) this.onStatusChange('idle');
                    return;
                }

                // Если ждали ответ по WS — повторяем через HTTP
                const pendingBlob = this._pendingAudioBlob;
                this._pendingAudioBlob = null;
                this._clearWsResponseTimer();
                if (pendingBlob) {
                    console.warn('WS closed while waiting for response → HTTP fallback');
                    this._initHTTP('ws closed during processing');
                    this._sendHTTP(pendingBlob);
                    return;
                }

                if (this._intentionalClose) {
                    this._intentionalClose = false;
                    return;  // намеренное закрытие — не делаем fallback
                }
                console.warn(`WS closed (code=${e.code})`);
                // 1012 = сервер перезагружается (деплой) — ждём дольше
                if (e.code === 1012) {
                    console.log('🔄 Сервер перезагружается, ждём 15с...');
                    setTimeout(() => {
                        this._wsRetries = 0;
                        this._connectWS().catch(() => {});
                    }, 15000);
                    return;
                }
                if (wasWS) {
                    this._tryReconnectWS();
                }
            };

            this._ws.onmessage = e => this._handleWsMessage(e.data);
        });
    }

    _tryReconnectWS() {
        if (this._wsRetries >= VoiceConfig.ws.maxRetries) {
            console.warn(`WS max retries (${VoiceConfig.ws.maxRetries}) → постоянный HTTP`);
            this._initHTTP('max retries');
            return;
        }
        this._wsRetries++;
        const delay = VoiceConfig.ws.retryDelay * this._wsRetries;
        console.log(`🔄 WS retry ${this._wsRetries}/${VoiceConfig.ws.maxRetries} через ${delay}мс`);
        setTimeout(() => this._connectWS(true), delay);
    }

    _initHTTP(reason = '') {
        this._mode = 'http';
        this._wsReady = false;
        console.log(`📡 HTTP mode${reason ? ' (' + reason + ')' : ''}`);
        if (this.onModeChange) this.onModeChange('http');
        if (this.onStatusChange) this.onStatusChange('connected');
        // Через 30с пробуем вернуться на WS — сервер мог подняться после деплоя
        if (!this._wsRecoveryTimer) {
            this._wsRecoveryTimer = setTimeout(() => {
                this._wsRecoveryTimer = null;
                if (this._mode === 'http') {
                    console.log('🔄 Попытка восстановить WS...');
                    this._wsRetries = 0;
                    this._connectWS().catch(() => {});
                }
            }, 30000);
        }
        return false;
    }

    _wsCleanup(intentional = false) {
        this._stopPing();
        this._clearWsResponseTimer();
        if (this._wsRecoveryTimer) { clearTimeout(this._wsRecoveryTimer); this._wsRecoveryTimer = null; }
        this._intentionalClose = intentional;
        if (this._ws) {
            try { this._ws.close(1000, 'mode_change'); } catch {}
            this._ws = null;
        }
        this._wsReady = false;
    }

    // ---- PING / PONG ----

    _startPing() {
        this._stopPing();
        this._pingTimer = setInterval(() => {
            if (this._ws?.readyState === WebSocket.OPEN) {
                this._ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }
        }, VoiceConfig.ws.pingInterval);
    }

    _stopPing() {
        if (this._pingTimer) { clearInterval(this._pingTimer); this._pingTimer = null; }
    }

    // ---- ОБРАБОТКА WS СООБЩЕНИЙ ----

    _handleWsMessage(raw) {
        try {
            const msg = JSON.parse(raw);

            switch (msg.type) {
                case 'text':
                    this._clearWsResponseTimer();
                    this._pendingAudioBlob = null;
                    if (!msg.data) break;
                    if (msg.data.includes('Вы:')) {
                        if (this.onTranscript) this.onTranscript(msg.data.replace('🎤 Вы: ', '').trim());
                    } else {
                        // Ответ AI приходит по кусочку (стрим). Копим в один текст
                        // и рисуем как ОДНО растущее сообщение (onAIPartial), иначе
                        // каждый фрагмент («сло», «ги») встаёт отдельной строкой и
                        // растягивает экран столбиком.
                        this._aiTextSoFar += msg.data.replace('🧠 Фреди: ', '');
                        if (this.onAIPartial) this.onAIPartial(this._aiTextSoFar);
                        else if (this.onAIResponse) this.onAIResponse(this._aiTextSoFar.trim());
                    }
                    break;

                case 'audio':
                    this._clearWsResponseTimer();
                    this._pendingAudioBlob = null;
                    // Новый путь: per-sentence стрим. Каждый чанк — целый MP3
                    // одного предложения; проигрываем по мере прихода.
                    if (msg.seq) {
                        if (msg.is_final) {
                            this._seqEnded = true;
                            this._drainSeq();
                            try {
                                if (window.FrediMeter && typeof window.FrediMeter.recordUsage === 'function')
                                    window.FrediMeter.recordUsage(15);
                            } catch (e) {}
                        } else if (msg.data) {
                            this._enqueueSeq(msg.data);
                        }
                        break;
                    }
                    if (msg.is_final) {
                        // Конец стрима — собираем все чанки и играем
                        if (this._audioChunks.length > 0 || msg.data) {
                            if (msg.data) this._audioChunks.push(msg.data);
                            this._flushAudio();
                            // Голосовой обмен завершён — списываем расход в счётчик
                            // (как fetch-патч делает для текста). WS-путь идёт мимо
                            // window.fetch, поэтому раньше голос НЕ учитывался вовсе:
                            // дневной лимит от голоса не рос и пейволл по минутам не
                            // наступал. 15с/обмен — та же цена, что у текстового AI.
                            try {
                                if (window.FrediMeter && typeof window.FrediMeter.recordUsage === 'function')
                                    window.FrediMeter.recordUsage(15);
                            } catch (e) {}
                        }
                    } else if (msg.data) {
                        // Защита от переполнения памяти (>10MB)
                        const totalSize = this._audioChunks.reduce((s, c) => s + c.length, 0);
                        if (totalSize > 10 * 1024 * 1024) {
                            console.warn('Audio chunks exceeded 10MB, flushing');
                            this._flushAudio();
                        }
                        // Накапливаем чанки
                        this._audioChunks.push(msg.data);
                    }
                    break;

                case 'status':
                    // Текст ответа полностью пришёл ДО озвучки: на 'speaking'
                    // (и на 'idle') фиксируем накопленный ответ как финальное
                    // сообщение и сбрасываем аккумулятор до следующего хода.
                    if ((msg.status === 'speaking' || msg.status === 'idle') && this._aiTextSoFar) {
                        if (this.onAIResponse) this.onAIResponse(this._aiTextSoFar.trim());
                        this._aiTextSoFar = '';
                    }
                    if (this.onStatusChange) this.onStatusChange(msg.status);
                    break;

                case 'error':
                    this._clearWsResponseTimer();
                    this._pendingAudioBlob = null;
                    if (this.onError) this.onError(msg.error);
                    if (this.onStatusChange) this.onStatusChange('idle');
                    break;

                case 'meter_blocked':
                    // Лимит исчерпан — показываем пейволл, а не «ошибку».
                    // Сервер следом закроет WS кодом 4002; HTTP-фоллбэк и
                    // реконнект подавляются в onclose (см. ветку e.code===4002).
                    this._clearWsResponseTimer();
                    this._pendingAudioBlob = null;
                    this._showMeterPaywall(msg);
                    if (this.onStatusChange) this.onStatusChange('idle');
                    break;

                case 'thinking':
                    if (this.onThinkingUpdate) this.onThinkingUpdate(msg.message || 'Фреди думает');
                    break;

                case 'action':
                    // Бэкенд сигналит UI выполнить действие (например, открыть
                    // тест после согласия юзера в BasicMode).
                    if (msg.action === 'open_test' && typeof window.startTest === 'function') {
                        try { window.startTest(); }
                        catch (e) { console.warn('startTest call failed:', e); }
                    }
                    break;

                case 'pong':
                    // heartbeat ответ — OK
                    break;

                case 'ping':
                    if (this._ws?.readyState === WebSocket.OPEN)
                        this._ws.send(JSON.stringify({ type: 'pong', timestamp: msg.timestamp }));
                    break;

                case 'chunk_ack':
                    // подтверждение чанка — OK
                    break;
            }
        } catch (e) {
            console.error('WS message parse error:', e);
        }
    }

    // Собираем накопленные base64-чанки в один Blob и воспроизводим
    async _flushAudio() {
        if (!this._audioChunks.length) return;
        const chunks = [...this._audioChunks];
        this._audioChunks = [];

        try {
            // Склеиваем base64 чанки → один ArrayBuffer
            const byteArrays = chunks
                .filter(c => c && c.length > 0)
                .map(c => {
                    const binary = atob(c);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    return bytes;
                });

            if (!byteArrays.length) return;

            const totalLen = byteArrays.reduce((s, a) => s + a.length, 0);
            const combined = new Uint8Array(totalLen);
            let offset = 0;
            for (const arr of byteArrays) { combined.set(arr, offset); offset += arr.length; }

            const blob = new Blob([combined], { type: 'audio/mpeg' });
            const url  = URL.createObjectURL(blob);

            if (this._onPlayAudio) await this._onPlayAudio(url);

        } catch (e) {
            console.error('_flushAudio error:', e);
        }
    }

    // ---- Потоковая озвучка по предложениям (seq) ----
    // Каждый чанк — целый MP3 одного предложения. Кладём в очередь и
    // проигрываем последовательно, начиная сразу, не дожидаясь конца ответа.
    _enqueueSeq(b64) {
        try {
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
            // Диагностика скорости: время до первого звука на клиенте.
            if (!this._seqT0) {
                this._seqT0 = Date.now();
                console.log('🎙️ VOICE_LAT client: first seq chunk received, bytes=' + bytes.length);
            }
            this._seqQueue.push(url);
        } catch (e) {
            console.error('seq enqueue error:', e);
            return;
        }
        this._drainSeq();
    }

    async _drainSeq() {
        if (this._seqPlaying) return;
        this._seqPlaying = true;
        let _played = 0;
        try {
            while (this._seqQueue.length) {
                const url = this._seqQueue.shift();
                // «Speaking» держим до последнего предложения (стрим завершён и
                // очередь пуста), чтобы статус не мигал между фразами.
                const isLast = this._seqEnded && this._seqQueue.length === 0;
                const _tp = Date.now();
                try {
                    if (this._onPlayAudio) await this._onPlayAudio(url, { keepSpeaking: !isLast });
                    if (_played === 0)
                        console.log('🎙️ VOICE_LAT client: first playback started +' + (Date.now() - this._seqT0) + 'ms after first chunk');
                } catch (e) {
                    console.error('seq play error:', e);
                }
                _played++;
                try { URL.revokeObjectURL(url); } catch {}
            }
        } finally {
            this._seqPlaying = false;
        }
        // Если пока играли последний, подъехал новый чанк — доиграть.
        if (this._seqQueue.length) this._drainSeq();
    }

    // ---- ОТПРАВКА АУДИО ----

    async sendAudio(audioBlob) {
        // Минимальный размер блоба синхронизирован с бэкендским порогом
        // (main.py: if len(audio_bytes) < 1000) — иначе сервер вернёт 400
        // «Аудио файл слишком короткий» уже после network round-trip, а
        // юзер увидит generic «Ошибка соединения». Лучше отлавливать на
        // фронте и сразу подсказывать «Удерживай кнопку дольше».
        if (!audioBlob || audioBlob.size < 1000) {
            if (this.onError) this.onError('Слишком короткая запись — удерживай кнопку дольше');
            return false;
        }

        // Сброс флага дедупа пейволла на каждую новую отправку.
        this._meterBlockedHandled = false;
        // Новый ход — сбрасываем накопленный текст ответа AI и очередь озвучки.
        this._aiTextSoFar = '';
        this._seqQueue = [];
        this._seqEnded = false;
        this._seqT0 = 0;

        // Предчек дневного лимита ДО отправки: если минуты исчерпаны —
        // показываем пейволл сразу, не гоняя заведомо блокируемый запрос.
        // Раньше запрос уходил, сервер рвал WS (4002) / возвращал 402, а
        // фронт показывал generic «Ошибка» вместо предложения подписки.
        try {
            if (window.FrediMeter && typeof window.FrediMeter.checkCanSend === 'function') {
                const chk = await window.FrediMeter.checkCanSend();
                if (chk && chk.can_send === false) {
                    this._showMeterPaywall(chk);
                    if (this.onStatusChange) this.onStatusChange('idle');
                    return false;
                }
            }
        } catch (e) { /* предчек необязателен — упадём на серверную проверку */ }

        // Как и в текстовом чате: пока сервер не подтвердил, кто это,
        // реплику отправлять нельзя — она уйдёт на временный id.
        try { if (window.identityReady) await window.identityReady(); } catch (e) {}
        try { if (window.USER_ID) this.userId = window.USER_ID; } catch (e) {}

        console.log(`📤 sendAudio: ${audioBlob.size}b (${audioBlob.type}) via ${this._mode.toUpperCase()}`);

        if (this._mode === 'ws' && this._wsReady && this._ws?.readyState === WebSocket.OPEN) {
            return this._sendWS(audioBlob);
        }
        return this._sendHTTP(audioBlob);
    }

    // Показ пейволла (исчерпан лимит) — единая точка для WS/HTTP-веток.
    // Дедуп через _meterBlockedHandled: один пейволл на одну отправку,
    // даже если прилетит и meter_blocked-сообщение, и close 4002.
    _showMeterPaywall(data) {
        if (this._meterBlockedHandled) return;
        this._meterBlockedHandled = true;
        this._pendingAudioBlob = null;
        this._clearWsResponseTimer();
        if (this.onThinking) this.onThinking(false);
        const d = data || {};
        // Отдаём стене ВСЁ, что прислал сервер. Раньше payload собирался
        // из шести полей руками и терял block_reason с trial-полями —
        // человеку с пустым общим запасом стена говорила «завтра снова
        // будут минуты», которых не будет (см. аналитику 31.08: блок
        // daily и блок trial одному юзеру с разницей в 12 секунд).
        const payload = Object.assign({}, d, {
            trial_exhausted: !!(d.trial_exhausted || d.reason === 'trial_exhausted'),
        });
        try {
            if (window.FrediMeter && typeof window.FrediMeter.showFatigueModal === 'function') {
                window.FrediMeter.showFatigueModal(payload);
            } else if (this.onError) {
                this.onError(d.message || 'Дневной лимит исчерпан. Оформите Premium, чтобы продолжить.');
            }
        } catch (e) {
            if (this.onError) this.onError('Дневной лимит исчерпан.');
        }
    }

    // ---- WEBSOCKET ПУТЬ ----

    async _sendWS(audioBlob) {
        try {
            if (this.onThinking) this.onThinking(true);
            if (this.onStatusChange) this.onStatusChange('processing');

            // Конвертируем Blob → ArrayBuffer → Base64
            // Используем чанки чтобы не переполнять стек (btoa+spread падает на >64KB)
            const arrayBuffer = await audioBlob.arrayBuffer();
            const uint8 = new Uint8Array(arrayBuffer);
            let base64 = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8.length; i += chunkSize) {
                const chunk = uint8.subarray(i, i + chunkSize);
                base64 += String.fromCharCode.apply(null, chunk);
            }
            base64 = btoa(base64);

            this._audioChunks = []; // сбрасываем буфер
            this._pendingAudioBlob = audioBlob; // сохраняем для повторной отправки при разрыве

            // Таймаут: если за 50с ответ не пришёл — фоллбэк на HTTP
            this._clearWsResponseTimer();
            this._wsResponseTimer = setTimeout(() => {
                console.warn('⏱️ WS response timeout → HTTP fallback');
                this._pendingAudioBlob = null;
                this._wsCleanup();
                this._initHTTP('response timeout');
                this._sendHTTP(audioBlob);
            }, 50000);

            this._ws.send(JSON.stringify({
                type: 'audio_chunk',
                data: base64,
                is_final: true,
                chunk_index: 1
            }));

            return true;
        } catch (e) {
            console.error('WS send error:', e, '→ HTTP fallback');
            this._pendingAudioBlob = null;
            this._clearWsResponseTimer();
            // При ошибке отправки — падаем на HTTP
            this._wsCleanup();
            this._initHTTP('send error');
            return this._sendHTTP(audioBlob);
        }
    }

    _clearWsResponseTimer() {
        if (this._wsResponseTimer) { clearTimeout(this._wsResponseTimer); this._wsResponseTimer = null; }
    }

    // ---- HTTP ПУТЬ ----

    async _sendHTTP(audioBlob, attempt = 0) {
        const MAX_ATTEMPTS = 2;
        const formData = new FormData();
        formData.append('user_id', String(this.userId));

        let ext = 'wav';
        const t = audioBlob.type || '';
        if (t.includes('mp4')) ext = 'mp4';
        else if (t.includes('aac')) ext = 'aac';
        else if (t.includes('webm')) ext = 'webm';
        else if (t.includes('ogg')) ext = 'ogg';

        formData.append('voice', audioBlob, `audio.${ext}`);
        formData.append('mode', this.currentMode || 'psychologist');
        formData.append('ios_device', this.isIOS ? 'true' : 'false');
        formData.append('user_agent', navigator.userAgent);

        const voiceConf = VoiceConfig.voices[this.currentMode];
        if (voiceConf) {
            formData.append('voice_speed', String(voiceConf.speed));
            formData.append('voice_pitch', String(voiceConf.pitch));
            formData.append('voice_emotion', voiceConf.emotion);
        }

        if (this.onStatusChange) this.onStatusChange('processing');
        if (this.onThinking) this.onThinking(true);

        // Метрики латентности: точки между отправкой и доходом фронту.
        // Шлём в FrediTracker через _emitLatency, чтобы в дашборде была
        // реальная картина (раньше угадывали по комментариям и логам).
        const _t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const _emitLatency = (event, extra) => {
            try {
                if (!window.FrediTracker || !window.FrediTracker.track) return;
                const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                const payload = Object.assign({
                    ms: Math.round(now - _t0),
                    blob_kb: Math.round(audioBlob.size / 1024),
                    blob_type: audioBlob.type || '',
                    transport: 'http_stream',
                    mode: this.currentMode || '',
                }, extra || {});
                window.FrediTracker.track(event, payload);
            } catch (e) {}
        };

        try {
            const ctrl = new AbortController();
            const tid  = setTimeout(() => ctrl.abort(), 90000);

            // Используем streaming-эндпоинт: NDJSON, юзер слышит первое
            // предложение через ~11с вместо 14.5с (TTS per-sentence
            // параллельно с проигрыванием).
            const resp = await fetch(`${this.apiBaseUrl}/api/voice/process_stream`, {
                method: 'POST', body: formData, signal: ctrl.signal
            });
            clearTimeout(tid);

            // 402 = дневной лимит исчерпан (meter_guard). Это не ошибка —
            // показываем пейволл вместо generic-тоста «Ошибка».
            if (resp.status === 402) {
                const data = await resp.json().catch(() => ({}));
                this._showMeterPaywall(data);
                if (this.onStatusChange) this.onStatusChange('idle');
                return false;
            }

            // 400 = бэк понял запрос, но валидация не прошла. На этом
            // эндпоинте два сценария:
            //   • «Аудио файл слишком короткий» — юзер быстро нажал-отпустил
            //   • «Не удалось распознать речь» — тихо/невнятно/шум
            // Раньше валилось в catch как HTTP 400 → generic «Ошибка
            // соединения», и юзер не понимал что делать. По аналитике это и
            // был «первый запрос — ошибка». Показываем конкретный текст из
            // тела ответа + НЕ ретраим (ретрай заведомо упадёт так же).
            if (resp.status === 400) {
                const data = await resp.json().catch(() => ({}));
                let msg = data && data.error;
                if (!msg) msg = 'Не удалось распознать речь';
                if (/коротк/i.test(msg))     msg = 'Слишком короткая запись — удерживай кнопку дольше';
                if (/распознать/i.test(msg)) msg = 'Не расслышал. Скажи громче и чётче, пожалуйста';
                if (this.onError) this.onError(msg);
                if (this.onStatusChange) this.onStatusChange('idle');
                if (this.onThinking) this.onThinking(false);
                return false;
            }

            if (!resp.ok) {
                const body = await resp.text().catch(() => '');
                throw new Error(`HTTP ${resp.status}: ${body.substring(0, 100)}`);
            }

            // Парсим NDJSON-стрим: каждая строка = JSON-событие.
            const reader = resp.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let firstAudioPlayed = false;
            let fullText = '';
            let pendingAction = null;

            // Очередь воспроизведения: ставим .play в цепочку через .then,
            // чтобы предложения проигрывались строго последовательно
            // (без перекрытия).
            let playbackChain = Promise.resolve();

            const enqueueAudio = (b64) => {
                if (!b64 || !this._onPlayAudio) return;
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
                playbackChain = playbackChain
                    .then(() => this._onPlayAudio(url))
                    .catch(err => { console.warn('play chunk failed:', err); })
                    .finally(() => { try { URL.revokeObjectURL(url); } catch {} });
            };

            let _firstTranscriptEmitted = false;
            const handleEvent = (ev) => {
                if (!ev || typeof ev !== 'object') return;
                if (ev.type === 'transcript') {
                    if (!_firstTranscriptEmitted) {
                        _firstTranscriptEmitted = true;
                        _emitLatency('voice_latency_transcript', { text_length: (ev.text || '').length });
                    }
                    if (ev.text && this.onTranscript) this.onTranscript(ev.text);
                } else if (ev.type === 'audio') {
                    if (!firstAudioPlayed) {
                        firstAudioPlayed = true;
                        _emitLatency('voice_latency_first_audio', { text_length: (ev.text || '').length });
                        // Первый аудио-чанк: гасим thinking-бабл в чате и
                        // переключаем САМУ КНОПКУ на «🔊 Фреди отвечает…»,
                        // чтобы прогресс ответа был виден без прокрутки вниз.
                        if (this.onThinking) this.onThinking(false);
                        if (this.onStatusChange) this.onStatusChange('speaking');
                    }
                    if (ev.text) fullText += (fullText ? ' ' : '') + ev.text;
                    // Стриминговый показ AI-текста в чате: бабл создаётся при
                    // первом аудио-чанке с текстом и дописывается по мере прихода
                    // предложений. Раньше onAIResponse(fullText) вызывался ПОСЛЕ
                    // окончания стрима — голос уже играл, а текст ответа в чате
                    // ещё не появлялся. UX-разрыв в 5-15 секунд.
                    if (fullText && this.onAIPartial) this.onAIPartial(fullText);
                    enqueueAudio(ev.b64);
                } else if (ev.type === 'done') {
                    if (ev.full_text) fullText = ev.full_text;
                    if (ev.action) pendingAction = ev.action;
                    _emitLatency('voice_latency_done', { text_length: (fullText || '').length });
                } else if (ev.type === 'error') {
                    throw new Error(ev.message || 'Server stream error');
                }
            };

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let idx;
                while ((idx = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.slice(0, idx).trim();
                    buffer = buffer.slice(idx + 1);
                    if (!line) continue;
                    try {
                        handleEvent(JSON.parse(line));
                    } catch (e) {
                        console.warn('NDJSON parse skip:', e, line.substring(0, 120));
                    }
                }
            }
            // Finalise tail.
            if (buffer.trim()) {
                try { handleEvent(JSON.parse(buffer.trim())); } catch {}
            }

            if (this.onThinking) this.onThinking(false);

            if (fullText && this.onAIResponse) {
                this.onAIResponse(fullText);
            }

            if (pendingAction === 'open_test' && typeof window.startTest === 'function') {
                try { window.startTest(); }
                catch (e) { console.warn('startTest call failed:', e); }
            }

            // Дождёмся, пока вся очередь аудио проиграется до конца.
            try { await playbackChain; } catch {}

            if (this.onStatusChange) this.onStatusChange('idle');
            return true;

        } catch (err) {
            if (this.onThinking) this.onThinking(false);
            console.error(`HTTP error (attempt ${attempt + 1}):`, err.name, err.message);

            if (attempt < MAX_ATTEMPTS && err.name !== 'AbortError') {
                await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                return this._sendHTTP(audioBlob, attempt + 1);
            }

            let msg = 'Ошибка соединения';
            if (err.name === 'AbortError')             msg = 'Сервер не отвечает (таймаут)';
            else if (err.message.includes('500'))      msg = 'Ошибка сервера. Попробуйте позже.';
            else if (err.message.includes('429'))      msg = 'Слишком много запросов. Подождите.';
            else if (err.message.includes('Network') ||
                     err.message.includes('fetch'))    msg = 'Нет соединения с интернетом';

            if (this.onError) this.onError(msg);
            if (this.onStatusChange) this.onStatusChange('idle');
            return false;
        }
    }

    // ---- ПРОЧЕЕ ----

    async getWeather() {
        try {
            const r = await fetch(`${this.apiBaseUrl}/api/weather/${this.userId}`);
            const d = await r.json();
            if (d.success && d.weather && this.onWeather) this.onWeather(d.weather);
            return d.weather || null;
        } catch { return null; }
    }

    getMode() { return this._mode; }
    isWS()    { return this._mode === 'ws' && this._wsReady; }

    disconnect() {
        this._wsCleanup();
        this._stopPing();
    }
}

// ============================================
// VOICE MANAGER — главный класс
// ============================================

class VoiceManager {
    constructor(userId, config = {}) {
        this.userId      = userId;
        this.config      = { ...VoiceConfig, ...config };
        this.isIOS       = VoiceConfig.diagnostics.isIOS;
        this.currentMode = 'psychologist';

        this.isRecording  = false;
        this.isAISpeaking = false;

        // Callbacks для app.js
        this.onTranscript     = null;
        this.onAIResponse     = null;
        this.onAIPartial      = null;  // стриминговое обновление AI-текста
        this.onStatusChange   = null;
        this.onError          = null;
        this.onRecordingStart = null;
        this.onRecordingStop  = null;
        this.sttOnly          = false; // true = только распознавание, без AI ответа
        this.onVolumeChange   = null;
        this.onThinking       = null;
        this.onSpeechDetected = null;
        this.onWeather        = null;
        this.onTransportMode  = null;  // 'ws' | 'http' — для UI-индикатора

        this._loading   = new LoadingIndicator();
        this._player    = new AudioPlayer();
        this._transport = null;
        this._rec       = null;
        this._modeSwitching = false;

        console.log('🎤 VoiceManager v2.0, diagnostics:', VoiceConfig.diagnostics);
        this._init();
    }

    _init() {
        // Плеер
        this._player.onPlayStart = () => { this.isAISpeaking = true; this._status('speaking'); };
        this._player.onPlayEnd   = () => { this.isAISpeaking = false; this._status('idle'); };
        this._player.onError     = msg => { if (this.onError) this.onError(msg); };

        // Транспорт
        const apiUrl = this.config.apiBaseUrl || VoiceConfig.apiBaseUrl;
        this._transport = new VoiceTransport(this.userId, apiUrl);
        this._transport.currentMode = this.currentMode;

        // Колбэки транспорта
        this._transport.onTranscript    = t => { if (this.onTranscript) this.onTranscript(t); };
        this._transport.onAIResponse    = a => { if (this.onAIResponse) this.onAIResponse(a); };
        // Стриминговый текст AI: бабл в чате обновляется по мере прихода
        // предложений из NDJSON, не дожидаясь конца стрима.
        this._transport.onAIPartial     = a => { if (this.onAIPartial) this.onAIPartial(a); };
        this._transport.onThinking      = b => {
            if (b) this._loading.show('Фреди думает');
            else   this._loading.remove();
            if (this.onThinking) this.onThinking(b);
        };
        this._transport.onThinkingUpdate = m => { this._loading.update(m); };
        this._transport.onStatusChange  = s => {
            if (s === 'speaking') { this.isAISpeaking = true; this._loading.remove(); }
            else if (s === 'idle') { this.isAISpeaking = false; this._loading.remove(); }
            this._status(s);
        };
        this._transport.onError = e => {
            this._loading.remove();
            if (this.onError) this.onError(e);
        };
        this._transport.onWeather    = w => { if (this.onWeather) this.onWeather(w); };
        this._transport.onModeChange = m => {
            console.log(`🔀 Transport mode: ${m.toUpperCase()}`);
            if (this.onTransportMode) this.onTransportMode(m);
        };

        // Плеер для транспорта (и WS и HTTP используют один)
        // Используем this._player — у него персистентный Audio-элемент
        // который unlocked при user gesture (нажатие кнопки записи)
        this._transport._onPlayAudio = async (url, opts) => {
            const keepSpeaking = !!(opts && opts.keepSpeaking);
            this.isAISpeaking = true;
            this._status('speaking');
            try {
                await this._player.play(url);
            } catch (e) {
                console.error('Audio playback error:', e);
            } finally {
                // При посегментном стриме держим статус «speaking» между
                // сегментами — сбрасываем только на последнем.
                if (!keepSpeaking) {
                    this.isAISpeaking = false;
                    this._status('idle');
                }
            }
        };

        // Рекордер
        this._rec = new VoiceRecorder(this.config.recording);

        this._rec.onRecordingStart = () => {
            this.isRecording = true;
            // Захватываем sttOnly на момент старта записи, чтобы внешний код не мог
            // мутировать флаг в процессе (например, через restoreHandlers по таймауту).
            this._sttOnlyLocked = !!this.sttOnly;
            console.log('[voice] 🎙️ start recording | sttOnly locked =', this._sttOnlyLocked);
            this._status('recording');
            if (this.onRecordingStart) this.onRecordingStart();
        };

        this._rec.onRecordingStop = async (blob) => {
            this.isRecording = false;
            this._status('idle');
            // Берём флаг, захваченный при старте — он гарантированно не меняется.
            const useSttOnly = (typeof this._sttOnlyLocked === 'boolean') ? this._sttOnlyLocked : !!this.sttOnly;
            console.log('[voice] ⏹ stop recording | sttOnly effective =', useSttOnly, '| current sttOnly =', this.sttOnly);
            if (this.onRecordingStop) this.onRecordingStop(blob);
            if (blob && !useSttOnly) {
                await this._transport.sendAudio(blob);
            } else if (blob && useSttOnly) {
                // STT only: отправляем на распознавание без AI
                try {
                    const form = new FormData();
                    form.append('file', blob, 'voice.wav');
                    form.append('user_id', String(this.userId));
                    const resp = await fetch(`${this._transport.apiBaseUrl}/api/voice/stt`, {
                        method: 'POST', body: form
                    });
                    const data = await resp.json();
                    const text = data && data.text;
                    console.log('[voice] STT-only response:', { ok: resp.ok, has_text: !!text, length: (text || '').length });
                    if (text) {
                        if (this.onTranscript) this.onTranscript(text);
                        // Важно: вызываем и финал, чтобы UI показал тост/подсветку
                        if (this.onTranscriptComplete) this.onTranscriptComplete(text);
                    } else {
                        // Пусть UI покажет «не удалось распознать» через onTranscriptComplete с пустой строкой.
                        if (this.onTranscriptComplete) this.onTranscriptComplete('');
                    }
                } catch(e) {
                    console.warn('[voice] STT-only error:', e);
                    if (this.onTranscriptComplete) this.onTranscriptComplete('');
                }
            }
        };

        this._rec.onVolumeChange   = v => { if (this.onVolumeChange) this.onVolumeChange(v); };
        this._rec.onSpeechDetected = d => { if (this.onSpeechDetected) this.onSpeechDetected(d); };
        this._rec.onError          = e => {
            this.isRecording = false;
            this._status('idle');
            if (this.onError) this.onError(e);
        };

        // Подключаемся асинхронно — не блокируем инит
        this._transport.connect().then(ok => {
            console.log(`🔌 Transport connected via ${this._transport.getMode().toUpperCase()}`);
        }).catch(e => console.warn('Transport connect error:', e));
    }

    _status(s) { if (this.onStatusChange) this.onStatusChange(s); }

    startRecording() {
        // Unlock плеера прямо здесь — это вызывается из обработчика
        // нажатия кнопки, т.е. внутри user gesture (критично для iOS)
        this._player.primeForPlayback();
        if (this.isAISpeaking) {
            this._player.stop();
            this.isAISpeaking = false;
        }
        return this._rec.start();
    }

    stopRecording() { return this._rec.stop(); }

    async textToSpeech(text, mode) {
        try {
            const params = new URLSearchParams();
            params.append('text', text);
            params.append('mode', mode || this.currentMode);
            const vc = this.config.voices?.[mode || this.currentMode];
            if (vc) {
                params.append('speed', String(vc.speed));
                params.append('pitch', String(vc.pitch));
                params.append('emotion', vc.emotion);
            }
            const resp = await fetch(`${this._transport.apiBaseUrl}/api/voice/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            if (!resp.ok) throw new Error(`TTS HTTP ${resp.status}`);
            const blob = await resp.blob();
            await this._player.play(blob);
        } catch (e) {
            console.error('TTS error:', e);
            if (this.onError) this.onError('Ошибка синтеза речи');
        }
    }

    interrupt() {
        this._player.stop();
        this._loading.remove();
        this.isAISpeaking = false;
        this._status('idle');
    }

    setMode(mode) {
        if (this._modeSwitching) return;
        this._modeSwitching = true;
        this.currentMode = mode;
        if (this._transport) {
            this._transport.currentMode = mode;
            // Если WS активен — переподключаемся с новым mode
            // чтобы бэкенд создал правильный mode_instance
            if (this._transport.isWS()) {
                console.log(`🔄 Переподключение WS для режима: ${mode}`);
                this._transport._wsCleanup(true);  // intentional — не делать fallback
                setTimeout(() => {
                    this._transport._connectWS().catch(e => console.warn('WS reconnect failed:', e));
                    this._modeSwitching = false;
                }, 300);  // небольшая задержка чтобы старый WS успел закрыться
            } else {
                this._modeSwitching = false;
            }
        } else {
            this._modeSwitching = false;
        }
    }

    async getWeather()    { return this._transport?.getWeather(); }
    isRecordingActive()   { return this._rec?.isRecordingActive() || false; }
    isSpeaking()          { return this.isAISpeaking; }
    getCurrentMode()      { return this.currentMode; }
    getTransportMode()    { return this._transport?.getMode() || 'http'; }

    dispose() {
        this._loading.remove();
        this._player.dispose();
        this._rec?.dispose();
        this._transport?.disconnect();
    }
}

// ============================================
// ЭКСПОРТ
// ============================================

if (typeof window !== 'undefined') {
    window.AudioPlayer      = AudioPlayer;
    window.LoadingIndicator = LoadingIndicator;
    window.VoiceRecorder    = VoiceRecorder;
    window.VoiceTransport   = VoiceTransport;
    window.VoiceManager     = VoiceManager;
    window.VoiceConfig      = VoiceConfig;

    window.checkVoiceSupport = () => {
        const d = VoiceConfig.diagnostics;
        console.table(d);
        return d;
    };
}

console.log('✅ voice.js v2.0 загружен. Режим: WS-first + HTTP fallback');
