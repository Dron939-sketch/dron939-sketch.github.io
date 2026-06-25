// voice-pcm-worklet.js — AudioWorklet процессор для записи голоса.
// Заменяет ScriptProcessorNode (deprecated). Работает в отдельном
// AudioWorkletGlobalScope, связь с main thread — через port.postMessage.
//
// Получает Float32 чанки от микрофона (входы process()), конвертит в
// Int16 PCM и шлёт через port. На main thread (voice.js) обработчик
// складывает в wavData и считает громкость / детектирует тишину —
// та же логика, что была в ScriptProcessor.onaudioprocess.
//
// Важное отличие AudioWorklet: process() вызывается с фиксированным
// chunk size 128 фреймов. Чтобы не дробить трафик port'а на каждые
// 128 фреймов, буферизуем на worklet-стороне до chunkSize (передаётся
// через processorOptions при создании ноды).
class VoicePcmProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opt = (options && options.processorOptions) || {};
    this._chunkSize = Math.max(128, opt.chunkSize | 0 || 4096);
    this._buffer = new Float32Array(this._chunkSize);
    this._filled = 0;
  }

  _flush() {
    const n = this._filled;
    if (!n) return;
    const int16 = new Int16Array(n);
    let sumAbs = 0;
    for (let i = 0; i < n; i++) {
      const s = Math.max(-1, Math.min(1, this._buffer[i]));
      const v = s * 32767;
      int16[i] = v;
      sumAbs += v < 0 ? -v : v;
    }
    // Transferable buffer — без копии.
    this.port.postMessage({ int16, sumAbs, frames: n }, [int16.buffer]);
    this._filled = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) {
      // Источник ещё не готов — продолжаем работать.
      return true;
    }
    const ch = input[0]; // mono
    const cs = this._chunkSize;
    let i = 0;
    while (i < ch.length) {
      const take = Math.min(ch.length - i, cs - this._filled);
      this._buffer.set(ch.subarray(i, i + take), this._filled);
      this._filled += take;
      i += take;
      if (this._filled >= cs) this._flush();
    }
    return true; // не убивать узел
  }
}

registerProcessor('voice-pcm-processor', VoicePcmProcessor);
