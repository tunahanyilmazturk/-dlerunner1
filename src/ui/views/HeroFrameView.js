import { Events } from '../../core/events.js';
import { formatNumber } from '../../utils/format.js';
import { el, rafThrottle, replayAnimation } from '../dom.js';
import { buildHeroStack } from '../heroStack.js';

// Alt çubuğun sol tarafı (Metin2 tarzı): yuvarlak avatar + seviye rozeti, HP ve EXP barları, altın.
// Avatar oyundaki katman dokularıyla çizilir, yani kuşanılan başlık/zırh burada da görünür.
export class HeroFrameView {
  constructor(root, ctx) {
    this.root = root;
    this.ctx = ctx;
    this.build();
    this.bind();

    const { stats } = ctx.upgrades;
    this.renderHp({ hp: stats.maxHp, maxHp: stats.maxHp });
    this.renderXp();
    this.renderGold();

    // Paraların uçacağı nokta
    ctx.getCoinTarget = () => {
      const rect = this.coinIcon.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
  }

  build() {
    this.avatarInner = el('div', { class: 'hero-avatar-inner' });
    this.levelBadge = el('div', { class: 'hero-level-badge' });
    this.avatar = el('div', { class: 'hero-avatar', title: 'Karakter (C)' }, [this.avatarInner, this.levelBadge]);

    this.levelText = el('span', { class: 'hero-level-text' });
    this.hpFill = el('div', { class: 'bar-fill bar-fill--hp' });
    this.hpText = el('span', { class: 'bar-text' });
    this.xpFill = el('div', { class: 'bar-fill bar-fill--xp' });
    this.xpText = el('span', { class: 'bar-text' });
    this.coinIcon = el('span', { class: 'coin-icon coin-icon--sm' });
    this.goldValue = el('span', { class: 'hero-gold-value' });
    this.gpsValue = el('span', { class: 'hero-gps' });

    this.root.append(
      this.avatar,
      el('div', { class: 'hero-info' }, [
        el('div', { class: 'hero-name-row' }, [el('span', { class: 'hero-name', text: 'Kahraman' }), this.levelText]),
        el('div', { class: 'bar bar--hp', title: 'Can' }, [this.hpFill, this.hpText]),
        el('div', { class: 'bar bar--xp', title: 'Tecrübe' }, [this.xpFill, this.xpText]),
        el('div', { class: 'hero-gold' }, [this.coinIcon, this.goldValue, this.gpsValue]),
      ]),
    );
  }

  bind() {
    const { bus } = this.ctx;
    const renderHp = rafThrottle((e) => this.renderHp(e));
    const renderXp = rafThrottle(() => this.renderXp());
    const renderGold = rafThrottle(() => this.renderGold());
    const renderAvatar = rafThrottle(() => this.renderAvatar());

    bus.on(Events.PLAYER_HP_CHANGED, renderHp);
    bus.on(Events.XP_CHANGED, renderXp);
    bus.on(Events.LEVEL_UP, () => {
      renderXp();
      replayAnimation(this.levelBadge, 'level-up');
      replayAnimation(this.avatar, 'level-up');
    });
    bus.on(Events.GOLD_CHANGED, renderGold);
    bus.on(Events.GPS_CHANGED, renderGold);
    bus.on(Events.COIN_COLLECTED, () => replayAnimation(this.coinIcon, 'pulse'));
    bus.on(Events.EQUIPMENT_CHANGED, renderAvatar);
    bus.on(Events.TEXTURES_READY, () => this.renderAvatar(true));
  }

  renderAvatar(force = false) {
    const stack = buildHeroStack(this.ctx.textureUrl, this.ctx.equipment.appearance, { weapon: false });
    if (!stack || (!force && stack.signature === this.avatarSignature)) return;
    this.avatarSignature = stack.signature;
    this.avatarInner.replaceChildren(stack.element);
  }

  renderHp({ hp, maxHp }) {
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    this.hpFill.style.width = `${ratio * 100}%`;
    this.hpFill.classList.toggle('low', ratio < 0.3);
    this.hpText.textContent = `${formatNumber(Math.ceil(hp))} / ${formatNumber(maxHp)}`;
  }

  renderXp() {
    const { level } = this.ctx;
    this.levelBadge.textContent = level.level;
    this.levelText.textContent = `Sv. ${level.level}`;
    this.xpFill.style.width = `${level.progress * 100}%`;
    this.xpText.textContent = level.isMaxed ? 'MAKS' : `%${(level.progress * 100).toFixed(1)}`;
  }

  renderGold() {
    const { state } = this.ctx;
    this.goldValue.textContent = formatNumber(state.gold);
    this.gpsValue.textContent = `+${formatNumber(state.goldPerSecond)}/sn`;
  }
}
