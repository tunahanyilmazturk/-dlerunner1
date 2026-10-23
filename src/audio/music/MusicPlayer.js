import { midiToFreq } from '../AudioEngine.js';
import { degreeToSemitones } from './themes.js';

const LOOKAHEAD = 0.12; // sn: bu kadar ilerisi önceden planlanır
const TICK_MS = 25;

// 16'lık adımlarla çalan küçük bir sekansör. Notalar Web Audio saatine göre
// önceden planlanır (setTimeout gecikmeleri ritmi bozmaz). Tema değişimi ölçü başında olur.
export class MusicPlayer {
  constructor(engine) {
    this.engine = engine;
    this.theme = null;
    this.pendingTheme = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  get playing() {
    return this.timer !== null;
  }

  setTheme(theme) {
    if (this.theme?.id === theme.id) {
      this.pendingTheme = null;
      return;
    }
    if (!this.theme || !this.playing) this.theme = theme;
    else this.pendingTheme = theme;
  }

  start() {
    if (this.playing || !this.theme || !this.engine.ready) return;
    this.step = 0;
    this.nextTime = this.engine.now + 0.1;
    this.timer = setInterval(() => this.schedule(this.engine.now + LOOKAHEAD), TICK_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  /** `until` saatine kadar olan adımları planlar (testlerde elle çağrılabilir). */
  schedule(until) {
    while (this.nextTime < until) {
      if (this.step % 16 === 0 && this.pendingTheme) {
        this.theme = this.pendingTheme;
        this.pendingTheme = null;
        this.step = 0;
      }
      this.playStep(this.step, this.nextTime);
      this.nextTime += 60 / this.theme.bpm / 4;
      this.step = (this.step + 1) % (16 * this.theme.progression.length);
    }
  }

  note(degree, octaveShift = 0) {
    const { root, scale } = this.theme;
    return midiToFreq(root + degreeToSemitones(scale, degree) + 12 * octaveShift);
  }

  playStep(step, time) {
    const e = this.engine;
    const bus = e.musicBus;
    const th = this.theme;
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = th.progression[bar];
    const sixteenth = 60 / th.bpm / 4;

    // Davullar
    if (th.kick[s]) e.tone({ bus, type: 'sine', freq: 150, freqEnd: 42, duration: 0.2, volume: 0.45, time });
    if (th.snare[s]) {
      e.noise({ bus, duration: 0.12, volume: 0.13, filter: 'bandpass', freq: 1800, q: 0.7, time });
      e.tone({ bus, type: 'triangle', freq: 190, freqEnd: 120, duration: 0.08, volume: 0.08, time });
    }
    if (th.hat[s]) e.noise({ bus, duration: 0.035, volume: 0.035, filter: 'highpass', freq: 7500, time });

    // Bas: akor kökü, iki oktav aşağıda
    if (th.bass[s]) {
      e.tone({ bus, type: 'triangle', freq: this.note(chord, -2), duration: sixteenth * 1.8, volume: th.boss ? 0.2 : 0.17, time });
    }

    // Arpej: akor seslerini 16'lıklarla dolaşır, çok kısık
    if (th.arp) {
      const tone = [0, 2, 4, 7][s % 4];
      e.tone({ bus, type: 'square', freq: this.note(chord + tone, 0), duration: sixteenth * 0.9, volume: 0.018, time });
    }

    // Melodi
    const degree = th.melody[bar][s];
    if (degree !== null && degree !== undefined) {
      e.tone({ bus, type: th.lead, freq: this.note(degree, 0), duration: sixteenth * 1.9, volume: th.lead === 'triangle' ? 0.08 : 0.04, attack: 0.01, time });
    }
  }
}
