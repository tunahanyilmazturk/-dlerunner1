import { midiToFreq } from './AudioEngine.js';

// Sentezlenmiş ses efektleri. Her efekt:
//  - throttle: aynı efektin iki çalınışı arasındaki en kısa süre (sn); hızlı tekrarlar boğulmasın
//  - play(engine, options): engine.tone / engine.noise ile sesi kurar
// Yeni efekt eklemek için buraya bir giriş ekle, AudioDirector'da bir olaya bağla.

const vary = (value, amount = 0.06) => value * (1 + (Math.random() * 2 - 1) * amount);
const notes = (...midis) => midis.map(midiToFreq);

export const SFX = {
  hit: {
    throttle: 0.05,
    play: (e) => {
      e.noise({ duration: 0.06, volume: 0.18, filter: 'highpass', freq: vary(2600) });
      e.tone({ type: 'square', freq: vary(240), freqEnd: 110, duration: 0.06, volume: 0.06 });
    },
  },

  crit: {
    throttle: 0.06,
    play: (e) => {
      e.noise({ duration: 0.12, volume: 0.25, filter: 'bandpass', freq: 3500, freqEnd: 900, q: 0.8 });
      e.tone({ type: 'sawtooth', freq: vary(880), freqEnd: 220, duration: 0.14, volume: 0.09 });
      e.tone({ type: 'square', freq: vary(1320), duration: 0.05, volume: 0.05 });
    },
  },

  tap: {
    throttle: 0.04,
    play: (e) => {
      e.tone({ type: 'triangle', freq: vary(900, 0.1), freqEnd: 500, duration: 0.05, volume: 0.08 });
      e.noise({ duration: 0.03, volume: 0.08, filter: 'highpass', freq: 4000 });
    },
  },

  kill: {
    throttle: 0.05,
    play: (e) => {
      const base = vary(520, 0.08);
      e.tone({ type: 'triangle', freq: base, freqEnd: base * 2, duration: 0.09, volume: 0.12 });
      e.noise({ duration: 0.12, volume: 0.08, filter: 'lowpass', freq: 1200, freqEnd: 300 });
    },
  },

  coin: {
    throttle: 0.07,
    play: (e) => {
      const t = e.now;
      const pitch = vary(1, 0.04);
      e.tone({ type: 'square', freq: 1318 * pitch, duration: 0.05, volume: 0.04, time: t });
      e.tone({ type: 'square', freq: 1976 * pitch, duration: 0.09, volume: 0.04, time: t + 0.05 });
    },
  },

  hurt: {
    throttle: 0.12,
    play: (e) => {
      e.tone({ type: 'sawtooth', freq: vary(210), freqEnd: 80, duration: 0.14, volume: 0.1 });
      e.noise({ duration: 0.1, volume: 0.1, filter: 'lowpass', freq: 800 });
    },
  },

  blocked: {
    throttle: 0.12,
    play: (e) => e.tone({ type: 'sine', freq: vary(1500), freqEnd: 1100, duration: 0.12, volume: 0.07 }),
  },

  death: {
    throttle: 1,
    play: (e) => {
      e.tone({ type: 'sawtooth', freq: 440, freqEnd: 55, duration: 0.8, volume: 0.14 });
      e.tone({ type: 'square', freq: 220, freqEnd: 40, duration: 0.8, volume: 0.06, detune: 12 });
    },
  },

  purchase: {
    throttle: 0.06,
    play: (e, { level = 0 } = {}) => {
      // Seviye arttıkça hafifçe tizleşir: art arda alımlar "tırmanıyor" gibi duyulur
      const lift = Math.min(12, level % 13);
      e.arpeggio(notes(72 + lift, 76 + lift, 79 + lift), { type: 'square', duration: 0.07, volume: 0.05, step: 0.04 });
    },
  },

  relic: {
    throttle: 0.1,
    play: (e) => e.arpeggio(notes(67, 71, 74, 79), { type: 'triangle', duration: 0.18, volume: 0.09, step: 0.06 }),
  },

  error: {
    throttle: 0.15,
    play: (e) => e.tone({ type: 'square', freq: 150, freqEnd: 100, duration: 0.16, volume: 0.07 }),
  },

  click: {
    throttle: 0.04,
    play: (e) => e.tone({ type: 'triangle', freq: 1200, freqEnd: 800, duration: 0.03, volume: 0.05 }),
  },

  stageClear: {
    throttle: 0.3,
    play: (e) => e.arpeggio(notes(72, 79), { type: 'triangle', duration: 0.12, volume: 0.06, step: 0.08 }),
  },

  bossSpawn: {
    throttle: 1,
    play: (e) => {
      e.tone({ type: 'sawtooth', freq: 55, duration: 1.2, volume: 0.16, attack: 0.15 });
      e.tone({ type: 'sawtooth', freq: 82.4, duration: 1.2, volume: 0.1, attack: 0.15, detune: 8 });
      e.noise({ duration: 1, volume: 0.12, filter: 'lowpass', freq: 200, freqEnd: 1500, attack: 0.3 });
    },
  },

  bossDefeat: {
    throttle: 1,
    play: (e) => {
      e.arpeggio(notes(60, 64, 67, 72, 76, 79, 84), { type: 'square', duration: 0.22, volume: 0.06, step: 0.07 });
      e.noise({ duration: 0.5, volume: 0.15, filter: 'lowpass', freq: 2500, freqEnd: 200 });
    },
  },

  // ---------------------------------------------------- Yetenekler

  bladeStorm: {
    throttle: 0.3,
    play: (e) => {
      const t = e.now;
      for (let i = 0; i < 3; i++) {
        e.noise({ duration: 0.22, volume: 0.2, filter: 'bandpass', freq: 500, freqEnd: 4000, q: 2, time: t + i * 0.09 });
      }
      e.tone({ type: 'sawtooth', freq: 180, freqEnd: 720, duration: 0.35, volume: 0.06 });
    },
  },

  thunder: {
    throttle: 0.3,
    play: (e) => {
      e.noise({ duration: 0.08, volume: 0.35, filter: 'highpass', freq: 3000 });
      e.noise({ duration: 0.9, volume: 0.3, filter: 'lowpass', freq: 1200, freqEnd: 80 });
      e.tone({ type: 'sine', freq: 70, freqEnd: 35, duration: 0.7, volume: 0.25 });
    },
  },

  berserk: {
    throttle: 0.3,
    play: (e) => {
      e.tone({ type: 'sawtooth', freq: 110, freqEnd: 440, duration: 0.45, volume: 0.1 });
      e.tone({ type: 'square', freq: 165, freqEnd: 660, duration: 0.45, volume: 0.05, detune: -10 });
      e.noise({ duration: 0.4, volume: 0.1, filter: 'bandpass', freq: 300, freqEnd: 2000 });
    },
  },

  aegis: {
    throttle: 0.3,
    play: (e) => {
      for (const freq of notes(76, 80, 83, 88)) e.tone({ type: 'sine', freq, duration: 0.9, volume: 0.06, attack: 0.08 });
    },
  },

  goldRush: {
    throttle: 0.3,
    play: (e) => e.arpeggio(notes(84, 88, 91, 96, 91, 96, 100), { type: 'square', duration: 0.06, volume: 0.04, step: 0.045 }),
  },

  poisonBlade: {
    throttle: 0.3,
    play: (e) => {
      // Islak "fıs" + aşağı kayan kabarcık sesleri
      e.noise({ duration: 0.3, volume: 0.16, filter: 'bandpass', freq: 1800, freqEnd: 600, q: 3 });
      const t = e.now;
      for (let i = 0; i < 4; i++) e.tone({ type: 'sine', freq: vary(520 - i * 70, 0.1), freqEnd: 260, duration: 0.08, volume: 0.06, time: t + 0.05 + i * 0.07 });
    },
  },

  frostWave: {
    throttle: 0.3,
    play: (e) => {
      e.noise({ duration: 0.7, volume: 0.18, filter: 'highpass', freq: 5000, freqEnd: 1500 });
      for (const freq of notes(88, 91, 95)) e.tone({ type: 'triangle', freq, duration: 0.6, volume: 0.04, attack: 0.02 });
    },
  },

  spiritBlades: {
    throttle: 0.3,
    play: (e) => {
      e.tone({ type: 'sine', freq: 330, freqEnd: 990, duration: 0.6, volume: 0.07, attack: 0.1 });
      e.tone({ type: 'sine', freq: 335, freqEnd: 1000, duration: 0.6, volume: 0.05, attack: 0.1, detune: 12 });
      e.noise({ duration: 0.5, volume: 0.06, filter: 'bandpass', freq: 800, freqEnd: 3000, q: 4 });
    },
  },

  // ---------------------------------------------------- Ganimet ve ilerleme

  loot: {
    throttle: 0.1,
    play: (e, { rarity = 0 } = {}) => {
      // Nadirlik arttıkça daha uzun ve parlak arpej
      const sets = [
        [79],
        [79, 84],
        [79, 83, 86, 91],
        [76, 80, 83, 88, 92],
        [72, 76, 79, 84, 88, 91, 96],
      ];
      e.arpeggio(notes(...sets[rarity]), { type: rarity >= 3 ? 'triangle' : 'square', duration: 0.14 + rarity * 0.04, volume: 0.05 + rarity * 0.012, step: 0.06 });
      if (rarity >= 3) e.noise({ duration: 0.8, volume: 0.05, filter: 'highpass', freq: 6000, attack: 0.2 });
    },
  },

  bossWarn: {
    throttle: 0.5,
    play: (e) => {
      const t = e.now;
      for (let i = 0; i < 3; i++) e.tone({ type: 'square', freq: 880, freqEnd: 660, duration: 0.12, volume: 0.06, time: t + i * 0.2 });
    },
  },

  forge: {
    throttle: 0.15,
    play: (e, { rarity = 0 } = {}) => {
      // Örs üstünde iki çekiç darbesi, birleştirmede nadirliğe göre parıltı
      const t = e.now;
      for (let i = 0; i < 2; i++) {
        e.tone({ type: 'square', freq: vary(1400), freqEnd: 900, duration: 0.12, volume: 0.07, time: t + i * 0.16 });
        e.noise({ duration: 0.08, volume: 0.2, filter: 'highpass', freq: 4000, time: t + i * 0.16 });
      }
      if (rarity > 0) e.arpeggio(notes(...[79, 83, 86, 91, 95].slice(0, rarity + 1)), { type: 'triangle', duration: 0.18, volume: 0.05, step: 0.07 });
    },
  },

  levelUp: {
    throttle: 0.4,
    play: (e) => {
      e.arpeggio(notes(72, 76, 79, 84, 88), { type: 'square', duration: 0.16, volume: 0.06, step: 0.055 });
      e.noise({ duration: 0.6, volume: 0.06, filter: 'highpass', freq: 5000, attack: 0.1 });
    },
  },

  achievement: {
    throttle: 0.5,
    play: (e) => e.arpeggio(notes(67, 72, 76, 79, 84), { type: 'triangle', duration: 0.3, volume: 0.09, step: 0.09 }),
  },

  quest: {
    throttle: 0.5,
    play: (e) => e.arpeggio(notes(81, 88), { type: 'sine', duration: 0.35, volume: 0.1, step: 0.12 }),
  },

  rebirth: {
    throttle: 2,
    play: (e) => {
      e.noise({ duration: 1.6, volume: 0.15, filter: 'bandpass', freq: 200, freqEnd: 6000, q: 1.5, attack: 0.4 });
      e.tone({ type: 'sawtooth', freq: 65, freqEnd: 520, duration: 1.4, volume: 0.08, attack: 0.3 });
      for (const freq of notes(60, 67, 72, 76)) e.tone({ type: 'triangle', freq, duration: 2, volume: 0.06, attack: 0.6, time: e.now + 1 });
    },
  },
};
