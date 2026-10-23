// Web Audio tabanlı küçük sentez motoru: hiç ses dosyası kullanmadan osilatör ve
// gürültüden efekt/müzik üretir. Ses zinciri:
//   [müzik sesleri] → musicBus ┐
//                               ├→ master → compressor → hoparlör
//   [efekt sesleri] → sfxBus   ┘

// 2 sn: noise() rastgele 0–0,5 sn ofsetten başlar, 1 sn'ye kadar olan sesler döngüsüz sığar
function createNoiseBuffer(context, seconds = 2) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

const SILENT = 0.0001; // exponentialRamp 0'a gidemez

// Müzik sürekli çaldığı için kısık, efektler kısa olduğu için güçlü karıştırılır.
// Ayarlardaki %100 bu seviyelere karşılık gelir. Varsayılan ayarlarla ölçüm (OfflineAudioContext):
// müzik tepe ≈ 0.06–0.13, vuruş ≈ 0.09, boss/rebirth ≈ 0.35, en kötü karışım < 0.4 (kırpılma yok).
const MUSIC_LEVEL = 0.35;
const SFX_LEVEL = 3.5;

export class AudioEngine {
  constructor() {
    this.context = null;
  }

  get ready() {
    return Boolean(this.context);
  }

  get now() {
    return this.context.currentTime;
  }

  /** Bağlamı oluşturur. Test için OfflineAudioContext verilebilir. */
  init(context = null) {
    if (this.context) return this.context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!context && !AudioContextClass) return null;
    const c = context ?? new AudioContextClass();
    this.context = c;

    this.master = c.createGain();
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.ratio.value = 4;
    this.musicBus = c.createGain();
    this.sfxBus = c.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.compressor).connect(c.destination);
    this.noiseBuffer = createNoiseBuffer(c);
    return c;
  }

  /** Tarayıcılar sesi ancak bir kullanıcı etkileşiminden sonra başlatır. */
  resume() {
    if (this.context?.state === 'suspended') return this.context.resume();
    return Promise.resolve();
  }

  suspend() {
    if (this.context?.state === 'running') return this.context.suspend();
    return Promise.resolve();
  }

  setVolumes({ master, music, sfx, muted }) {
    if (!this.context) return;
    const t = this.now;
    this.master.gain.setTargetAtTime(muted ? 0 : master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(music * MUSIC_LEVEL, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(sfx * SFX_LEVEL, t, 0.05);
  }

  envelope(gainNode, t, { volume, attack, duration }) {
    const g = gainNode.gain;
    g.setValueAtTime(SILENT, t);
    g.exponentialRampToValueAtTime(Math.max(SILENT, volume), t + attack);
    g.exponentialRampToValueAtTime(SILENT, t + duration);
  }

  /** Tek bir osilatör notası; freqEnd verilirse frekans kayar. */
  tone({ bus = this.sfxBus, type = 'sine', freq, freqEnd, time, duration = 0.1, volume = 0.3, attack = 0.005, detune = 0 }) {
    const c = this.context;
    const t = time ?? c.currentTime;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + duration);
    osc.detune.value = detune;

    const gain = c.createGain();
    this.envelope(gain, t, { volume, attack, duration });
    osc.connect(gain).connect(bus);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  /** Filtrelenmiş beyaz gürültü: vuruş, rüzgâr, patlama, zil sesleri. */
  noise({ bus = this.sfxBus, time, duration = 0.1, volume = 0.3, filter = 'highpass', freq = 1000, freqEnd, q = 1, attack = 0.002 }) {
    const c = this.context;
    const t = time ?? c.currentTime;
    const source = c.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = duration > 1;

    const biquad = c.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.setValueAtTime(freq, t);
    if (freqEnd) biquad.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    biquad.Q.value = q;

    const gain = c.createGain();
    this.envelope(gain, t, { volume, attack, duration });
    source.connect(biquad).connect(gain).connect(bus);
    source.start(t, Math.random() * 0.5);
    source.stop(t + duration + 0.02);
  }

  /** Notaları arka arkaya çalar: [frekans, ...] */
  arpeggio(freqs, { step = 0.06, time, ...toneOptions } = {}) {
    const t = time ?? this.now;
    freqs.forEach((freq, i) => this.tone({ ...toneOptions, freq, time: t + i * step }));
  }
}

export const midiToFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
