import { Events } from '../../core/events.js';
import { PET, PET_BONUS_LABELS } from '../../data/pets.js';
import { toCssColor } from '../../utils/color.js';
import { formatNumber } from '../../utils/format.js';
import { el, rafThrottle, replayAnimation } from '../dom.js';

const pct = (v) => `%${(v * 100).toFixed(v < 0.1 ? 1 : 0)}`;
const bonusText = (stat, value) => `${PET_BONUS_LABELS[stat]} ${stat === 'critDamage' ? `+x${value.toFixed(2)}` : `+${pct(value)}`}`;

// Yoldaşlar (Y): yumurta kuluçkası, koleksiyon kartları, aktif seçimi ve besleme.
export class PetsView {
  constructor(ctx, ui) {
    this.ctx = ctx;
    this.ui = ui;
    this.element = el('section', { class: 'view pets' });
    const render = rafThrottle(() => this.render());
    for (const event of [Events.PET_CHANGED, Events.EQUIPMENT_CHANGED, Events.TEXTURES_READY]) ctx.bus.on(event, render);
    this.render();
  }

  onMount() {
    this.updateBadge();
  }

  updateBadge() {
    const eggs = this.ctx.pets.data.eggs;
    this.setBadge?.(eggs > 0 ? `🥚${eggs}` : '');
  }

  portrait(pet, owned) {
    const url = this.ctx.textureUrl?.(`pet_${pet.id}_0`);
    if (!url) return el('span', { class: 'pet-emoji', text: owned ? pet.icon : '❔' });
    return el('img', { class: `pet-img${owned ? '' : ' unknown'}`, src: url, alt: '', draggable: 'false' });
  }

  render() {
    const { pets } = this.ctx;
    this.updateBadge();
    const eggs = pets.data.eggs;
    const hatchButton = el('button', {
      class: 'btn btn--primary',
      type: 'button',
      text: eggs > 0 ? `🥚 Yumurtayı aç (${eggs})` : 'Yumurta yok',
      disabled: eggs <= 0,
      on: { click: (e) => this.hatch(e.currentTarget) },
    });
    this.element.replaceChildren(
      el('div', { class: 'egg-header' }, [
        el('span', { class: `egg-icon${eggs > 0 ? ' wobble' : ''}`, text: '🥚' }),
        el('div', { class: 'egg-text' }, [
          el('strong', { text: `Kuluçka · ${pets.ownedCount}/${pets.list.length} yoldaş` }),
          el('span', { class: 'muted small', text: `Bosslar %${PET.EGG_CHANCE_BOSS * 100} şansla yumurta düşürür (ilk boss garanti).` }),
        ]),
        hatchButton,
      ]),
      el('p', { class: 'muted small', text: `Aktif yoldaş seni takip eder ve bonusunun tamamını verir; diğerleri %${PET.COLLECTION_RATIO * 100} koleksiyon bonusu sağlar.` }),
      el('div', { class: 'pet-grid' }, pets.list.map((pet) => this.card(pet))),
    );
  }

  card(pet) {
    const { pets } = this.ctx;
    const owned = pets.owned(pet.id);
    const active = pets.data.active === pet.id;
    if (!owned) {
      return el('div', { class: 'pet-card locked' }, [
        el('div', { class: 'pet-portrait' }, [this.portrait(pet, false)]),
        el('strong', { text: '???' }),
        el('span', { class: 'muted small', text: 'Yumurtadan çıkabilir' }),
      ]);
    }
    const level = owned.level;
    const maxed = pets.isMaxed(pet.id);
    const need = pets.xpToNext(level);
    const value = pets.bonusValue(pet.id);

    const behaviour = pet.attack
      ? `${pet.attack.aoe ? 'Tüm düşmanlara' : 'Öndekine'} x${(pet.attack.damageMult + pet.attack.perLevel * (level - 1)).toFixed(2)} hasar / ${pet.attack.interval}sn`
      : pet.heal
        ? `%${((pet.heal.ratio + pet.heal.perLevel * (level - 1)) * 100).toFixed(1)} can / ${pet.heal.interval}sn`
        : 'Pasif yoldaş';

    return el('div', { class: `pet-card${active ? ' active' : ''}`, style: { '--pet': toCssColor(pet.color) } }, [
      active ? el('span', { class: 'pet-active-tag', text: 'AKTİF' }) : null,
      el('div', { class: 'pet-portrait' }, [this.portrait(pet, true)]),
      el('strong', { class: 'pet-name', text: `${pet.icon} ${pet.name}` }),
      el('span', { class: 'pet-level', text: maxed ? `Sv. ${level} (maks.)` : `Sv. ${level}` }),
      el('div', { class: 'rank-bar', title: maxed ? '' : `${formatNumber(owned.xp)} / ${formatNumber(need)} EXP` }, [
        el('div', { class: 'rank-fill pet-xp', style: { width: maxed ? '100%' : `${(owned.xp / need) * 100}%` } }),
      ]),
      el('span', { class: 'muted small', text: pet.description }),
      el('span', { class: 'pet-stat', text: `${behaviour}` }),
      el('span', { class: 'pet-stat', text: `${bonusText(pet.bonus.stat, active ? value : value * PET.COLLECTION_RATIO)}${active ? '' : ' (koleksiyon)'}` }),
      el('div', { class: 'pet-actions' }, [
        el('button', {
          class: 'btn btn--small',
          type: 'button',
          text: active ? '✔ Aktif' : 'Aktif et',
          disabled: active,
          on: { click: () => pets.setActive(pet.id) },
        }),
        el('button', {
          class: 'btn btn--small',
          type: 'button',
          text: maxed ? 'Maks.' : `🍖 💠${formatNumber(pets.feedCost(pet.id))}`,
          title: `Besle: +${PET.FEED_XP} EXP`,
          disabled: !pets.canFeed(pet.id),
          on: {
            click: (e) => {
              if (!pets.feed(pet.id)) replayAnimation(e.currentTarget, 'shake');
            },
          },
        }),
      ]),
    ]);
  }

  hatch(button) {
    const result = this.ctx.pets.hatch();
    if (!result) {
      replayAnimation(button, 'shake');
      return;
    }
    const { pet, isNew } = result;
    this.ui.modal.open({
      title: isNew ? 'Yeni yoldaş!' : 'Tanıdık bir yüz',
      titleColor: toCssColor(pet.color),
      content: el('div', { class: 'hatch-result', style: { '--pet': toCssColor(pet.color) } }, [
        el('div', { class: 'pet-portrait big' }, [this.portrait(pet, true)]),
        el('strong', { text: `${pet.icon} ${pet.name}` }),
        el('p', { class: 'muted', text: isNew ? pet.description : `${pet.name} tekrar çıktı ve EXP kazandı (Sv. ${this.ctx.pets.level(pet.id)}).` }),
      ]),
      actions: [
        isNew && this.ctx.pets.data.active !== pet.id ? { label: 'Aktif et', variant: 'ghost', onClick: () => this.ctx.pets.setActive(pet.id) } : null,
        { label: 'Harika!', variant: 'primary' },
      ].filter(Boolean),
    });
  }
}
