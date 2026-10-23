import { EQUIPMENT } from '../../config/balance.js';
import { Events } from '../../core/events.js';
import { AFFIX_MAP, RARITIES, SLOTS, SLOT_MAP } from '../../data/equipment.js';
import { SET_MAP } from '../../data/sets.js';
import { toCssColor } from '../../utils/color.js';
import { formatNumber } from '../../utils/format.js';
import { el, rafThrottle } from '../dom.js';
import { buildHeroStack, buildItemArt } from '../heroStack.js';

const AUTO_SALVAGE_OPTIONS = [
  { value: -1, label: 'Kapalı' },
  { value: 0, label: 'Sıradan' },
  { value: 1, label: 'Kaliteli ve altı' },
  { value: 2, label: 'Nadir ve altı' },
];

const SORTS = {
  rarity: { label: 'Nadirlik', compare: (eq, a, b) => eq.rarityIndex(b) - eq.rarityIndex(a) || eq.power(b) - eq.power(a) },
  power: { label: 'Güç', compare: (eq, a, b) => eq.power(b) - eq.power(a) },
  level: { label: 'Seviye', compare: (eq, a, b) => b.level - a.level || eq.power(b) - eq.power(a) },
  newest: { label: 'Yeni', compare: (_eq, a, b) => b.id - a.id },
};

const PREFS_KEY = 'idle-blade-runner:inventory';
const rarityColor = (equipment, item) => toCssColor(equipment.rarityOf(item).color);

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) ?? {};
  } catch {
    return {};
  }
}

// Envanter: Metin2 tarzı karakter bebeği (solda/sağda 5'er yuva, ortada karakter),
// bonus özeti, filtrelenip sıralanabilen çanta ve eşya detay penceresi.
export class EquipmentView {
  constructor(ctx, ui) {
    this.ctx = ctx;
    this.ui = ui;
    const prefs = loadPrefs();
    this.filter = prefs.filter ?? 'all';
    this.sort = SORTS[prefs.sort] ? prefs.sort : 'rarity';
    this.element = el('section', { class: 'view equipment' });
    this.build();

    const render = rafThrottle(() => this.render());
    ctx.bus.on(Events.EQUIPMENT_CHANGED, render);
    ctx.bus.on(Events.TEXTURES_READY, () => {
      this.renderHero(true);
      this.render();
    });
    ctx.bus.on(Events.ITEM_DROPPED, (e) => this.notifyDrop(e));
    this.render();
  }

  onMount() {
    this.updateBadge();
  }

  updateBadge() {
    const count = this.ctx.equipment.upgradeCount;
    this.setBadge?.(count > 0 ? `▲${count}` : '');
  }

  savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ filter: this.filter, sort: this.sort }));
    } catch {
      // tercih sadece bu oturumda kalır
    }
  }

  art(item, size) {
    return buildItemArt(this.ctx.textureUrl, item, this.ctx.equipment.baseOf(item), size);
  }

  // ------------------------------------------------------------ Kurulum

  // Araç çubukları bir kez kurulur (açık bir <select> yeni drop gelince kapanmasın);
  // yuvalar, bonuslar ve çanta her değişimde yeniden çizilir.
  build() {
    const { equipment } = this.ctx;

    this.heroEl = el('div', { class: 'hero-preview doll-hero', title: 'Kuşanılan eşyalar karakterinde görünür' });
    this.leftSlots = el('div', { class: 'doll-column' });
    this.rightSlots = el('div', { class: 'doll-column' });
    this.powerEl = el('span', { class: 'doll-power' });
    this.bonusEl = el('div', { class: 'equip-bonus' });
    this.countEl = el('span', { class: 'inv-count' });
    this.shardEl = el('span', { class: 'shard-count' });
    this.gridEl = el('div', { class: 'inv-grid' });

    const autoEquip = el('input', {
      type: 'checkbox',
      checked: equipment.data.autoEquip,
      on: { change: (e) => equipment.setAutoEquip(e.target.checked) },
    });
    const autoSalvage = el(
      'select',
      { class: 'select', on: { change: (e) => equipment.setAutoSalvage(Number(e.target.value)) } },
      AUTO_SALVAGE_OPTIONS.map((o) => el('option', { value: o.value, selected: o.value === equipment.data.autoSalvage, text: o.label })),
    );

    // Filtre: Tümü + her yuva
    this.filterButtons = [{ id: 'all', icon: '◈', name: 'Tümü' }, ...SLOTS].map((s) =>
      el('button', {
        class: 'filter-chip',
        type: 'button',
        title: s.name,
        text: s.icon,
        dataset: { filter: s.id },
        on: {
          click: () => {
            this.filter = s.id;
            this.savePrefs();
            this.render();
          },
        },
      }),
    );
    const sortSelect = el(
      'select',
      {
        class: 'select',
        on: {
          change: (e) => {
            this.sort = e.target.value;
            this.savePrefs();
            this.render();
          },
        },
      },
      Object.entries(SORTS).map(([id, s]) => el('option', { value: id, selected: id === this.sort, text: s.label })),
    );

    this.element.append(
      el('div', { class: 'doll' }, [this.leftSlots, this.heroEl, this.rightSlots]),
      el('div', { class: 'doll-actions' }, [
        this.powerEl,
        el('button', { class: 'btn btn--small btn--primary', type: 'button', text: '⬆ En iyileri kuşan', on: { click: () => this.equipBest() } }),
      ]),
      this.bonusEl,
      el('div', { class: 'section-head' }, [el('h3', { class: 'section-title', text: 'Çanta' }), el('span', {}, ['🎒 ', this.countEl, '  ', this.shardEl])]),
      el('div', { class: 'inv-toolbar' }, [
        el('div', { class: 'filter-row' }, this.filterButtons),
        el('div', { class: 'inv-toolbar-row' }, [
          el('label', { class: 'select-label' }, [el('span', { class: 'muted', text: 'Sırala' }), sortSelect]),
          el('button', { class: 'btn btn--small', type: 'button', text: '♻️ Zayıfları parçala', on: { click: () => this.salvageWeak() } }),
        ]),
        el('div', { class: 'inv-toolbar-row' }, [
          el('label', { class: 'toggle toggle--inline' }, [el('span', { class: 'muted', text: 'Oto kuşan' }), autoEquip, el('span', { class: 'toggle-switch' })]),
          el('label', { class: 'select-label' }, [el('span', { class: 'muted', text: 'Oto parçala' }), autoSalvage]),
        ]),
      ]),
      this.gridEl,
    );
  }

  // ------------------------------------------------------------ Çizim

  /** Karakter önizlemesi; görünüm değişmediyse yeniden kurulmaz. */
  renderHero(force = false) {
    const { equipment, textureUrl } = this.ctx;
    const stack = buildHeroStack(textureUrl, equipment.appearance);
    if (!stack || (!force && stack.signature === this.heroSignature)) return;
    this.heroSignature = stack.signature;
    this.heroEl.replaceChildren(stack.element, el('div', { class: 'hero-shadow' }));
  }

  slotBox(slot) {
    const { equipment } = this.ctx;
    const item = equipment.equippedItem(slot.id);
    if (!item) {
      return el('div', { class: 'doll-slot empty', title: `${slot.name} (boş)` }, [
        el('span', { class: 'doll-slot-ghost', text: slot.icon }),
        el('span', { class: 'doll-slot-label', text: slot.name }),
      ]);
    }
    return el(
      'button',
      {
        class: 'doll-slot',
        type: 'button',
        title: `${slot.name}: ${item.name}${item.enhance ? ` +${item.enhance}` : ''} (Sv. ${item.level})`,
        style: { '--rarity': rarityColor(equipment, item) },
        on: { pointerdown: () => this.openDetail(item.id) },
      },
      [
        this.art(item, 46),
        item.enhance ? el('span', { class: 'item-enhance', text: `+${item.enhance}` }) : null,
        el('span', { class: 'doll-slot-label', text: slot.name }),
      ],
    );
  }

  render() {
    const { equipment } = this.ctx;
    this.updateBadge();
    this.renderHero();

    this.leftSlots.replaceChildren(...SLOTS.filter((s) => s.side === 'left').map((s) => this.slotBox(s)));
    this.rightSlots.replaceChildren(...SLOTS.filter((s) => s.side === 'right').map((s) => this.slotBox(s)));

    const totalPower = SLOTS.reduce((sum, s) => sum + equipment.power(equipment.equippedItem(s.id)), 0);
    const filled = SLOTS.filter((s) => equipment.equippedItem(s.id)).length;
    this.powerEl.textContent = `⚡ Güç ${formatNumber(totalPower)} · ${filled}/${SLOTS.length} yuva`;

    const bonusChips = Object.entries(equipment.bonuses)
      .filter(([, value]) => value > 0)
      .map(([stat, value]) => el('span', { class: 'chip-stat', text: `${AFFIX_MAP[stat].label} ${AFFIX_MAP[stat].format(value)}` }));
    const setChips = equipment.activeSets.map(({ set, count, tiers }) =>
      el('span', {
        class: 'chip-stat chip-set',
        style: { '--set': toCssColor(set.color) },
        title: tiers.map((t) => `${t.active ? '✔' : '✖'} ${t.pieces}: ${Object.entries(t.stats).map(([s, v]) => `${AFFIX_MAP[s].label} ${AFFIX_MAP[s].format(v)}`).join(', ')}`).join('\n'),
        text: `${set.icon} ${set.name} ${count}/6`,
      }),
    );
    this.bonusEl.replaceChildren(...setChips, ...(bonusChips.length ? bonusChips : [el('span', { class: 'muted', text: 'Düşmanlar eşya düşürür; bosslar her zaman.' })]));

    // Filtre düğmeleri: seçili + o yuvada daha iyi eşya varsa işaret
    for (const button of this.filterButtons) {
      const id = button.dataset.filter;
      button.classList.toggle('active', id === this.filter);
      button.classList.toggle('has-upgrade', id !== 'all' && equipment.inventory.some((i) => i.slot === id && equipment.isUpgrade(i)));
    }

    const inventory = equipment.inventory
      .filter((item) => this.filter === 'all' || item.slot === this.filter)
      .sort((a, b) => SORTS[this.sort].compare(equipment, a, b));
    this.countEl.textContent = `${equipment.inventory.length}/${equipment.capacity}`;
    this.countEl.classList.toggle('full', equipment.isFull);
    this.shardEl.textContent = `💠 ${formatNumber(equipment.data.shards)}`;

    const tiles = inventory.map((item) =>
      el(
        'button',
        {
          class: `item-tile${equipment.isUpgrade(item) ? ' is-upgrade' : ''}${item.locked ? ' is-locked' : ''}`,
          type: 'button',
          style: { '--rarity': rarityColor(equipment, item) },
          title: `${item.name} · ${SLOT_MAP[item.slot].name} · Sv. ${item.level}`,
          on: { pointerdown: () => this.openDetail(item.id) },
        },
        [
          this.art(item, 40),
          item.enhance ? el('span', { class: 'item-enhance', text: `+${item.enhance}` }) : null,
          item.set ? el('span', { class: 'item-set', text: SET_MAP[item.set].icon }) : null,
          equipment.isUpgrade(item) ? el('span', { class: 'item-up', text: '▲' }) : null,
          item.locked ? el('span', { class: 'item-lock', text: '🔒' }) : null,
        ],
      ),
    );
    // Filtre yokken boş yuvaları da göster (kapasite hissi)
    if (this.filter === 'all') {
      const empty = Math.max(0, equipment.capacity - inventory.length);
      for (let i = 0; i < empty; i++) tiles.push(el('div', { class: 'item-tile empty' }));
    } else if (!tiles.length) {
      tiles.push(el('div', { class: 'inv-empty muted', text: `Çantada ${SLOT_MAP[this.filter].name.toLowerCase()} yok.` }));
    }
    this.gridEl.replaceChildren(...tiles);
  }

  // ------------------------------------------------------------ Detay penceresi

  openDetail(id) {
    const { equipment } = this.ctx;
    const item = equipment.getItem(id);
    if (!item) return;

    const rarity = equipment.rarityOf(item);
    const equipped = equipment.isEquipped(id);
    const current = equipment.equippedItem(item.slot);
    const currentStats = current && !equipped ? equipment.itemStats(current) : [];
    const diff = equipment.compare(item);

    const statRows = equipment.itemStats(item).map(({ stat, value, main }) => {
      const affix = AFFIX_MAP[stat];
      const other = currentStats.find((s) => s.stat === stat);
      const delta = other ? value - other.value : null;
      return el('div', { class: `item-stat${main ? ' main' : ''}` }, [
        el('span', { text: affix.label }),
        el('span', {}, [
          affix.format(value),
          delta !== null && Math.abs(delta) > 1e-6
            ? el('span', { class: delta > 0 ? 'delta up' : 'delta down', text: ` (${delta > 0 ? '+' : '-'}${affix.format(Math.abs(delta)).replace('+', '')})` })
            : null,
        ]),
      ]);
    });

    const powerLine = el('div', { class: 'item-power' }, [
      `Güç ${formatNumber(equipment.power(item))}`,
      !equipped && current ? el('span', { class: diff >= 0 ? 'delta up' : 'delta down', text: ` ${diff >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(diff))}` }) : null,
      !current && !equipped ? el('span', { class: 'delta up', text: ' · yuva boş' }) : null,
      equipped ? el('span', { class: 'muted', text: ' · kuşanılı' }) : null,
    ]);

    const content = el('div', { class: 'item-detail', style: { '--rarity': toCssColor(rarity.color) } }, [
      el('div', { class: 'item-detail-head' }, [
        el('span', { class: 'item-detail-icon' }, [this.art(item, 56)]),
        el('div', {}, [
          el('div', { class: 'item-rarity', text: `${rarity.name} ${SLOT_MAP[item.slot].name}` }),
          el('div', { class: 'muted', text: `Seviye ${item.level} · Güçlendirme +${item.enhance}/${EQUIPMENT.MAX_ENHANCE}` }),
        ]),
      ]),
      el('div', { class: 'item-stats' }, statRows),
      item.set ? this.setInfo(item.set) : null,
      powerLine,
    ]);

    const reopen = () => {
      this.openDetail(id);
      return false;
    };
    const maxed = item.enhance >= EQUIPMENT.MAX_ENHANCE;
    const actions = [];
    if (!equipped && !item.locked) {
      actions.push({
        label: `♻️ +${formatNumber(equipment.salvageValue(item))} 💠`,
        variant: 'danger',
        onClick: () => {
          const shards = equipment.salvage(id);
          if (shards) this.ui.toast(`Parçalandı: +${formatNumber(shards)} 💠`, 'info');
        },
      });
    }
    actions.push({
      label: item.locked ? '🔓 Kilidi aç' : '🔒 Kilitle',
      variant: 'ghost',
      onClick: () => {
        equipment.toggleLock(id);
        return reopen();
      },
    });
    actions.push({
      label: maxed ? 'Maks. güç' : `⬆️ Güçlendir (💠 ${formatNumber(equipment.enhanceCost(item))})`,
      variant: 'ghost',
      disabled: !equipment.canEnhance(item),
      onClick: () => {
        equipment.enhance(id);
        return reopen();
      },
    });
    actions.push(
      equipped
        ? {
            label: 'Çıkar',
            variant: 'primary',
            onClick: () => {
              if (!equipment.unequip(item.slot)) {
                this.ui.toast('Çanta dolu', 'error');
                return false;
              }
              return true;
            },
          }
        : { label: 'Kuşan', variant: 'primary', onClick: () => equipment.equip(id) },
    );

    this.ui.modal.open({
      title: item.name + (item.enhance ? ` +${item.enhance}` : ''),
      titleColor: toCssColor(rarity.color),
      content,
      actions,
    });
  }

  /** Detay penceresinde set adı, kuşanılı parça sayısı ve kademeler. */
  setInfo(setId) {
    const set = SET_MAP[setId];
    const count = this.ctx.equipment.setCounts[setId] ?? 0;
    return el('div', { class: 'item-set-info', style: { '--set': toCssColor(set.color) } }, [
      el('strong', { text: `${set.icon} ${set.name} Seti (${count}/6)` }),
      ...set.tiers.map((tier) =>
        el('div', {
          class: `set-tier${count >= tier.pieces ? ' active' : ''}`,
          text: `${tier.pieces} parça: ${Object.entries(tier.stats).map(([s, v]) => `${AFFIX_MAP[s].label} ${AFFIX_MAP[s].format(v)}`).join(' · ')}`,
        }),
      ),
    ]);
  }

  // ------------------------------------------------------------ İşlemler

  equipBest() {
    const changed = this.ctx.equipment.equipBest();
    this.ui.toast(changed ? `${changed} yuva güncellendi ▲` : 'Zaten en iyileri kuşanılı', changed ? 'success' : 'info');
  }

  salvageWeak() {
    const { count, shards } = this.ctx.equipment.salvageWeak();
    this.ui.toast(count ? `${count} eşya parçalandı: +${formatNumber(shards)} 💠` : 'Parçalanacak zayıf eşya yok', count ? 'success' : 'info');
  }

  notifyDrop({ item, outcome, shards }) {
    const { equipment } = this.ctx;
    const rarity = equipment.rarityOf(item);
    const index = equipment.rarityIndex(item);
    const color = toCssColor(rarity.color);

    if (outcome === 'full') {
      this.ui.toast(`Çanta dolu! ${item.name} parçalandı (+${shards} 💠)`, 'error');
    } else if (outcome === 'equipped') {
      this.ui.toast(`${rarity.name} ${item.name} kuşanıldı ▲`, 'success', color);
    } else if (outcome === 'stored' && index >= RARITIES.findIndex((r) => r.id === 'rare')) {
      // Sohbet kaydı her eşyayı yazar; bildirim sadece Nadir ve üstü için
      this.ui.toast(`${rarity.name} ${item.name} bulundu`, 'info', color);
    }
  }
}
