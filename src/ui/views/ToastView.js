import { Events } from '../../core/events.js';
import { el } from '../dom.js';

export class ToastView {
  constructor(root, bus) {
    this.root = root;
    bus.on(Events.TOAST, ({ message, type = 'info', duration = 2200, color }) => this.show(message, type, duration, color));
  }

  show(message, type, duration, color) {
    const toast = el('div', {
      class: `toast toast--${type}`,
      text: message,
      style: color ? { borderColor: color, color } : undefined,
    });
    // Aynı anda çok fazla bildirim birikmesin
    while (this.root.children.length >= 4) this.root.firstElementChild.remove();
    this.root.append(toast);
    setTimeout(() => {
      toast.classList.add('leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }
}
