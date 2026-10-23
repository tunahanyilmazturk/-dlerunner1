import { Events } from '../../core/events.js';
import { el } from '../dom.js';

// Oyun alanının sağ üst köşesindeki hızlı sessize alma düğmesi (+ M tuşu).
export class AudioButtonView {
  constructor(root, ctx) {
    this.ctx = ctx;
    this.button = el('button', {
      class: 'audio-btn',
      type: 'button',
      title: 'Sesi aç/kapat (M)',
      on: { click: () => ctx.audio.toggleMute() },
    });
    root.append(this.button);
    this.render();

    ctx.bus.on(Events.SETTINGS_CHANGED, ({ key }) => {
      if (key === 'audio') this.render();
    });
    document.addEventListener('keydown', (e) => {
      if (e.repeat || e.target.closest?.('input, textarea')) return;
      if (e.code === 'KeyM') ctx.audio.toggleMute();
    });
  }

  render() {
    const muted = this.ctx.state.settings.audio.muted;
    this.button.textContent = muted ? '🔇' : '🔊';
    this.button.classList.toggle('muted', muted);
    this.button.setAttribute('aria-pressed', String(muted));
  }
}
