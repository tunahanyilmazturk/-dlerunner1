import { Events } from '../../core/events.js';
import { formatNumber } from '../../utils/format.js';
import { el, rafThrottle, replayAnimation } from '../dom.js';

const BUY_AMOUNTS = [1, 10, 100, 'max'];

export class ShopView {
  constructor(ctx) {
    this.ctx = ctx;
    this.cards = new Map();
    this.element = el('section', { class: 'view shop' });
    this.build();

    const refresh = rafThrottle(() => this.refresh());
    ctx.bus.on(Events.GOLD_CHANGED, refresh);
    ctx.bus.on(Events.UPGRADE_PURCHASED, refresh);
    ctx.bus.on(Events.STAGE_CHANGED, refresh);
    this.refresh();
  }

  get buyAmount() {
    return this.ctx.state.settings.buyAmount;
  }

  build() {
    this.amountButtons = BUY_AMOUNTS.map((amount) =>
      el('button', {
        class: 'chip',
        type: 'button',
        text: amount === 'max' ? 'MAKS' : `x${amount}`,
        on: { click: () => this.setBuyAmount(amount) },
      }),
    );
    const toolbar = el('div', { class: 'shop-toolbar' }, [
      el('span', { class: 'muted', text: 'Satın alma:' }),
      el('div', { class: 'chip-group' }, this.amountButtons),
    ]);

    const list = el('div', { class: 'upgrade-list' });
    for (const upgrade of this.ctx.upgrades.list) {
      const card = this.buildCard(upgrade);
      this.cards.set(upgrade.id, card);
      list.append(card.root);
    }
    this.element.append(toolbar, list);
  }

  buildCard(upgrade) {
    const refs = {};
    refs.level = el('span', { class: 'upgrade-level' });
    refs.effect = el('div', { class: 'upgrade-effect' });
    refs.amount = el('span', { class: 'buy-amount' });
    refs.cost = el('span', { class: 'buy-cost' });
    refs.lock = el('div', { class: 'upgrade-lock' });
    refs.button = el(
      'button',
      { class: 'buy-btn', type: 'button', on: { click: () => this.buy(upgrade.id) } },
      [refs.amount, el('span', { class: 'buy-cost-row' }, [el('span', { class: 'coin-icon coin-icon--sm' }), refs.cost])],
    );
    refs.root = el('article', { class: 'upgrade-card' }, [
      el('div', { class: 'upgrade-icon', text: upgrade.icon }),
      el('div', { class: 'upgrade-info' }, [
        el('div', { class: 'upgrade-title' }, [el('span', { text: upgrade.name }), refs.level]),
        el('div', { class: 'upgrade-desc', text: upgrade.description }),
        refs.effect,
      ]),
      refs.button,
      refs.lock,
    ]);
    return refs;
  }

  setBuyAmount(amount) {
    this.ctx.updateSetting('buyAmount', amount);
    this.refresh();
  }

  buy(id) {
    const card = this.cards.get(id);
    if (this.ctx.upgrades.purchase(id, this.buyAmount)) {
      replayAnimation(card.root, 'bought');
    } else {
      replayAnimation(card.button, 'shake');
    }
  }

  refresh() {
    const { upgrades, economy } = this.ctx;
    this.amountButtons.forEach((btn, i) => btn.classList.toggle('active', BUY_AMOUNTS[i] === this.buyAmount));

    for (const upgrade of upgrades.list) {
      const card = this.cards.get(upgrade.id);
      const level = upgrades.level(upgrade.id);
      const unlocked = upgrades.isUnlocked(upgrade.id);
      const maxed = upgrades.isMaxed(upgrade.id);

      card.root.classList.toggle('locked', !unlocked);
      card.root.classList.toggle('maxed', maxed);
      card.lock.textContent = unlocked ? '' : `🔒 Aşama ${upgrade.unlockStage}'te açılır`;
      card.level.textContent = Number.isFinite(upgrade.maxLevel) ? `Sv. ${level}/${upgrade.maxLevel}` : `Sv. ${level}`;

      const current = upgrade.format(upgrade.value(level));
      if (maxed) {
        card.effect.textContent = current;
        card.amount.textContent = 'MAKS';
        card.cost.textContent = '—';
        card.button.disabled = true;
        continue;
      }

      const amount = upgrades.resolveAmount(upgrade.id, this.buyAmount);
      const cost = upgrades.costFor(upgrade.id, amount);
      const next = upgrade.format(upgrade.value(level + amount));
      card.effect.innerHTML = `${current} <span class="arrow">→</span> <strong>${next}</strong>`;
      card.amount.textContent = `+${amount}`;
      card.cost.textContent = formatNumber(cost);

      const affordable = economy.canAfford(cost);
      card.button.disabled = !unlocked || !affordable;
      card.root.classList.toggle('affordable', unlocked && affordable);
    }
  }
}
