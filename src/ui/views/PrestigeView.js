import { PRESTIGE } from '../../config/balance.js';
import { Events } from '../../core/events.js';
import { formatNumber } from '../../utils/format.js';
import { el, rafThrottle, replayAnimation } from '../dom.js';

export class PrestigeView {
  constructor(ctx, ui) {
    this.ctx = ctx;
    this.ui = ui;
    this.element = el('section', { class: 'view prestige' });

    const render = rafThrottle(() => this.render());
    ctx.bus.on(Events.STAGE_CHANGED, render);
    ctx.bus.on(Events.RELIC_PURCHASED, render);
    ctx.bus.on(Events.PRESTIGE_DONE, render);
    ctx.bus.on(Events.QUESTS_UPDATED, render); // günlük sandık Ruh Taşı verebilir
    this.render();
  }

  // WindowManager menü rozetini bağladıktan sonra çağırır
  onMount() {
    this.updateBadge();
  }

  updateBadge() {
    const pending = this.ctx.prestige.pendingSouls;
    this.setBadge?.(pending > 0 ? `+${formatNumber(pending)}` : '');
  }

  /** Görünümü etkileyen değerler; değişmediyse DOM'u yeniden kurma (butonlar tıklama ortasında kaybolmasın). */
  signature() {
    const { prestige, state } = this.ctx;
    const p = prestige.data;
    return [prestige.isUnlocked, state.bestStage, state.highestStage, p.souls, p.totalSouls, p.rebirths, JSON.stringify(p.relics)].join('|');
  }

  render() {
    const { prestige, state } = this.ctx;
    this.updateBadge();
    const signature = this.signature();
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    if (!prestige.isUnlocked) {
      this.element.replaceChildren(
        el('div', { class: 'prestige-locked' }, [
          el('div', { class: 'prestige-locked-icon', text: '🔮' }),
          el('h3', { text: 'Yeniden Doğuş' }),
          el('p', { text: `Aşama ${PRESTIGE.MIN_STAGE}'ye ulaştığında açılır.` }),
          el('p', { class: 'muted', text: `En iyi aşaman: ${state.bestStage}` }),
        ]),
      );
      return;
    }

    this.element.replaceChildren(this.renderSummary(), this.renderRebirth(), this.renderRelics());
  }

  renderSummary() {
    const { prestige } = this.ctx;
    const bonusPercent = Math.round((prestige.soulBonus - 1) * 100);
    return el('div', { class: 'prestige-summary' }, [
      el('div', { class: 'soul-count' }, [
        el('span', { class: 'soul-icon', text: '🔮' }),
        el('div', {}, [
          el('div', { class: 'soul-value', text: formatNumber(prestige.data.souls) }),
          el('div', { class: 'muted', text: 'Ruh Taşı' }),
        ]),
      ]),
      el('div', { class: 'soul-bonus' }, [
        el('strong', { text: `+%${formatNumber(bonusPercent)}` }),
        el('span', { class: 'muted', text: 'hasar ve altın' }),
        el('span', { class: 'muted', text: `Toplam ${formatNumber(prestige.data.totalSouls)} taş · ${prestige.data.rebirths} rebirth` }),
      ]),
    ]);
  }

  renderRebirth() {
    const { prestige, state } = this.ctx;
    const pending = prestige.pendingSouls;
    const next = prestige.nextSoulStage;
    const startStage = Math.min(prestige.multipliers.startStage, state.bestStage);

    const button = el('button', {
      class: 'btn btn--rebirth',
      type: 'button',
      disabled: pending <= 0,
      text: pending > 0 ? `Yeniden Doğ  (+${formatNumber(pending)} 🔮)` : 'Henüz taş kazanmadın',
      on: { click: () => this.confirmRebirth() },
    });

    return el('div', { class: 'rebirth-card' }, [
      el('h3', { text: 'Yeniden Doğuş' }),
      el('dl', { class: 'stat-list' }, [
        el('dt', { text: 'Bu koşudaki en yüksek aşama' }),
        el('dd', { text: String(state.highestStage) }),
        el('dt', { text: 'Kazanılacak Ruh Taşı' }),
        el('dd', { class: 'soul-text', text: `+${formatNumber(pending)}` }),
        el('dt', { text: 'Sonraki taş' }),
        el('dd', { text: next ? `Aşama ${next}` : '—' }),
        el('dt', { text: 'Başlangıç aşaması' }),
        el('dd', { text: String(startStage) }),
      ]),
      button,
      el('p', {
        class: 'muted',
        text: 'Altın, yükseltmeler ve aşama sıfırlanır. Ruh Taşları, relic\'ler, açılan yetenekler ve istatistikler kalır.',
      }),
    ]);
  }

  renderRelics() {
    const { prestige } = this.ctx;
    const list = el('div', { class: 'upgrade-list' });

    for (const relic of prestige.relics) {
      const level = prestige.relicLevel(relic.id);
      const maxed = prestige.isRelicMaxed(relic.id);
      const cost = prestige.relicCost(relic.id);
      const affordable = prestige.canBuyRelic(relic.id);
      const current = relic.format(relic.value(level));

      const effect = el('div', { class: 'upgrade-effect' });
      effect.innerHTML = maxed
        ? current
        : `${current} <span class="arrow">→</span> <strong>${relic.format(relic.value(level + 1))}</strong>`;

      const button = el(
        'button',
        {
          class: 'buy-btn buy-btn--soul',
          type: 'button',
          disabled: !affordable,
          on: {
            click: () => {
              if (!prestige.buyRelic(relic.id)) replayAnimation(button, 'shake');
            },
          },
        },
        [
          el('span', { class: 'buy-amount', text: maxed ? 'MAKS' : '+1' }),
          el('span', { class: 'buy-cost-row', text: maxed ? '—' : `🔮 ${formatNumber(cost)}` }),
        ],
      );

      const levelText = Number.isFinite(relic.maxLevel) ? `Sv. ${level}/${relic.maxLevel}` : `Sv. ${level}`;
      list.append(
        el('article', { class: `upgrade-card${affordable ? ' affordable affordable--soul' : ''}${maxed ? ' maxed' : ''}` }, [
          el('div', { class: 'upgrade-icon', text: relic.icon }),
          el('div', { class: 'upgrade-info' }, [
            el('div', { class: 'upgrade-title' }, [el('span', { text: relic.name }), el('span', { class: 'upgrade-level', text: levelText })]),
            el('div', { class: 'upgrade-desc', text: relic.description }),
            effect,
          ]),
          button,
        ]),
      );
    }

    return el('div', { class: 'relics' }, [el('h3', { class: 'section-title', text: 'Relic\'ler (kalıcı)' }), list]);
  }

  confirmRebirth() {
    const { prestige } = this.ctx;
    const pending = prestige.pendingSouls;
    if (pending <= 0) return;
    this.ui.modal.open({
      title: 'Yeniden doğmak istiyor musun?',
      content: el('div', {}, [
        el('p', {}, ['', el('strong', { class: 'soul-text', text: `+${formatNumber(pending)} Ruh Taşı` }), ' kazanacaksın.']),
        el('p', { class: 'muted', text: 'Altın, yükseltmeler ve aşama sıfırlanacak. Bu işlem geri alınamaz.' }),
      ]),
      actions: [
        { label: 'Vazgeç', variant: 'ghost' },
        {
          label: 'Yeniden Doğ',
          variant: 'primary',
          onClick: () => {
            const gained = prestige.rebirth();
            if (gained > 0) {
              this.ctx.saveNow();
              this.ui.toast(`+${formatNumber(gained)} Ruh Taşı kazandın!`, 'success');
            }
          },
        },
      ],
    });
  }
}
