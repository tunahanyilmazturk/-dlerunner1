import { Events } from '../../core/events.js';
import { formatNumber } from '../../utils/format.js';
import { el, rafThrottle } from '../dom.js';

// Alt çubuğun sol tarafı: kayıt aç/kapa düğmesi + kaynak göstergeleri (Parça, Ruh Taşı).
export class BarLeftView {
  constructor(root, ctx, { onToggleLog }) {
    this.ctx = ctx;
    this.logButton = el('button', { class: 'bar-btn', type: 'button', title: 'Kaydı aç/kapat (Enter)', on: { click: onToggleLog } }, [
      el('span', { text: '💬' }),
      el('span', { class: 'bar-btn-label', text: 'Kayıt' }),
    ]);
    this.shards = el('span', { class: 'resource-value' });
    this.souls = el('span', { class: 'resource-value' });
    root.append(
      this.logButton,
      el('div', { class: 'resource', title: 'Parça (eşya güçlendirme)' }, [el('span', { text: '💠' }), this.shards]),
      el('div', { class: 'resource', title: 'Ruh Taşı (prestij)' }, [el('span', { text: '🔮' }), this.souls]),
    );

    const render = rafThrottle(() => this.render());
    for (const event of [Events.EQUIPMENT_CHANGED, Events.RELIC_PURCHASED, Events.PRESTIGE_DONE, Events.QUESTS_UPDATED]) ctx.bus.on(event, render);
    this.render();
  }

  render() {
    const { equipment, prestige } = this.ctx;
    this.shards.textContent = formatNumber(equipment.data.shards);
    this.souls.textContent = formatNumber(prestige.data.souls);
  }
}
