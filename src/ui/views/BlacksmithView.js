import { BLACKSMITH } from '../../config/balance.js';
import { Events } from '../../core/events.js';
import { AFFIX_MAP, RARITIES, SLOT_MAP } from '../../data/equipment.js';
import { SETS, SET_MAP } from '../../data/sets.js';
import { toCssColor } from '../../utils/color.js';
import { formatNumber } from '../../utils/format.js';
import { el, rafThrottle, replayAnimation } from '../dom.js';
import { buildItemArt } from '../heroStack.js';

const TABS = [
  { id: 'combine', label: '⚗️ Birleştir' },
  { id: 'reforge', label: '🔨 Yeniden Döv' },
  { id: 'sets', label: '🛡 Setler' },
];

const COMBINE_PROBLEMS = {
  count: `${BLACKSMITH.COMBINE_COUNT} eşya seç`,
  invalid: 'Kuşanılı ya da kilitli eşya birleştirilemez',
  rarity: 'Eşyalar aynı nadirlikte olmalı',
  shards: 'Yeterli Parça yok',
};

const statText = (stat, value) => `${AFFIX_MAP[stat].label} ${AFFIX_MAP[stat].format(value)}`;

// Demirci (B): 3 eşyayı bir üst nadirliğe birleştirme, ek özellikleri yeniden zarlama
// ve bölge setlerinin bonus listesi. Tüm kurallar EquipmentSystem'de.
export class BlacksmithView {
  constructor(ctx, ui) {
    this.ctx = ctx;
    this.ui = ui;
    this.tab = 'combine';
    this.combineRarity = 0;
    this.selected = []; // birleştirme için seçilen eşya id'leri (sıra önemli: ilki yuvayı belirler)
    this.reforgeId = null;
    this.flashId = null; // son işlemde değişen eşya (vurgulanır)
    this.element = el('section', { class: 'view blacksmith' });

    const render = rafThrottle(() => this.render());
    ctx.bus.on(Events.EQUIPMENT_CHANGED, render);
    ctx.bus.on(Events.TEXTURES_READY, render);
    this.render();
  }

  get equipment() {
    return this.ctx.equipment;
  }

  art(item, size) {
    return buildItemArt(this.ctx.textureUrl, item, this.equipment.baseOf(item), size);
  }

  tile(item, { selected = false, onClick, extra = null } = {}) {
    const { equipment } = this;
    return el(
      'button',
      {
        class: `item-tile${selected ? ' is-selected' : ''}${item.id === this.flashId ? ' is-new' : ''}${item.locked ? ' is-locked' : ''}`,
        type: 'button',
        style: { '--rarity': toCssColor(equipment.rarityOf(item).color) },
        title: `${item.name}${item.enhance ? ` +${item.enhance}` : ''} · ${SLOT_MAP[item.slot].name} · Sv. ${item.level}${item.set ? ` · ${SET_MAP[item.set].name} seti` : ''}`,
        on: { click: onClick },
      },
      [
        this.art(item, 40),
        item.enhance ? el('span', { class: 'item-enhance', text: `+${item.enhance}` }) : null,
        item.set ? el('span', { class: 'item-set', text: SET_MAP[item.set].icon }) : null,
        equipment.isEquipped(item.id) ? el('span', { class: 'item-worn', text: 'K' }) : null,
        item.locked ? el('span', { class: 'item-lock', text: '🔒' }) : null,
        extra,
      ],
    );
  }

  render() {
    const { equipment } = this;
    // Artık geçersiz seçimleri temizle (eşya parçalanmış, kuşanılmış vb.)
    this.selected = this.selected.filter((id) => {
      const item = equipment.getItem(id);
      return item && equipment.isCombinable(item) && equipment.rarityIndex(item) === this.combineRarity;
    });
    if (this.reforgeId != null && !equipment.getItem(this.reforgeId)) this.reforgeId = null;

    const tabs = el(
      'div',
      { class: 'chip-group forge-tabs' },
      TABS.map((t) =>
        el('button', {
          class: `chip${t.id === this.tab ? ' active' : ''}`,
          type: 'button',
          text: t.label,
          on: {
            click: () => {
              this.tab = t.id;
              this.render();
            },
          },
        }),
      ),
    );
    const header = el('div', { class: 'forge-header' }, [
      el('span', { class: 'forge-anvil', text: '⚒️' }),
      el('span', { class: 'muted small', text: 'Demirci ateşi hazır.' }),
      el('span', { class: 'shard-count', text: `💠 ${formatNumber(equipment.data.shards)}` }),
    ]);
    const body = this.tab === 'combine' ? this.renderCombine() : this.tab === 'reforge' ? this.renderReforge() : this.renderSets();
    this.element.replaceChildren(header, tabs, body);
  }

  // ------------------------------------------------------------ Birleştir

  renderCombine() {
    const { equipment } = this;
    const rarity = RARITIES[this.combineRarity];
    const next = RARITIES[this.combineRarity + 1];
    const candidates = equipment.items
      .filter((item) => equipment.isCombinable(item) && equipment.rarityIndex(item) === this.combineRarity)
      .sort((a, b) => equipment.power(a) - equipment.power(b));

    const chips = el(
      'div',
      { class: 'filter-row' },
      RARITIES.slice(0, -1).map((r, index) => {
        const count = equipment.items.filter((item) => equipment.isCombinable(item) && equipment.rarityIndex(item) === index).length;
        return el('button', {
          class: `chip rarity-chip${index === this.combineRarity ? ' active' : ''}`,
          type: 'button',
          style: { '--rarity': toCssColor(r.color) },
          text: `${r.name} (${count})`,
          on: {
            click: () => {
              this.combineRarity = index;
              this.selected = [];
              this.render();
            },
          },
        });
      }),
    );

    const slotsRow = [];
    for (let i = 0; i < BLACKSMITH.COMBINE_COUNT; i++) {
      const item = equipment.getItem(this.selected[i]);
      slotsRow.push(
        item
          ? this.tile(item, { selected: true, onClick: () => this.toggleSelect(item.id) })
          : el('div', { class: 'item-tile empty forge-slot', style: { '--rarity': toCssColor(rarity.color) } }, [el('span', { class: 'muted', text: '+' })]),
      );
    }
    const first = equipment.getItem(this.selected[0]);
    const result = el('div', { class: 'forge-result', style: { '--rarity': toCssColor(next.color) } }, [
      el('span', { class: 'forge-result-icon', text: first ? SLOT_MAP[first.slot].icon : '❔' }),
      el('span', { class: 'forge-result-name', text: `${next.name} ${first ? SLOT_MAP[first.slot].name : 'eşya'}` }),
    ]);

    const problem = equipment.combineProblem(this.selected);
    const cost = equipment.combineCost(this.combineRarity);
    const button = el('button', {
      class: 'btn btn--primary',
      type: 'button',
      text: `⚗️ Birleştir (💠 ${formatNumber(cost)})`,
      disabled: Boolean(problem),
      on: { click: (e) => this.combine(e.currentTarget) },
    });

    return el('div', { class: 'forge-panel' }, [
      el('p', { class: 'muted small', text: `Aynı nadirlikte ${BLACKSMITH.COMBINE_COUNT} eşya → ilk seçilenin yuvasında bir üst nadirlikte yeni eşya. Seviye en yüksek olanınki; setli parça seti devreder.` }),
      chips,
      el('div', { class: 'forge-row' }, [...slotsRow, el('span', { class: 'forge-arrow', text: '➜' }), result]),
      el('div', { class: 'forge-actions' }, [
        el('span', { class: 'muted small', text: problem ? COMBINE_PROBLEMS[problem] : 'Hazır!' }),
        el('button', { class: 'btn btn--small', type: 'button', text: 'Otomatik seç', disabled: candidates.length < BLACKSMITH.COMBINE_COUNT, on: { click: () => this.autoSelect(candidates) } }),
        button,
      ]),
      el('h3', { class: 'section-title', text: `Çantadaki ${rarity.name.toLowerCase()} eşyalar` }),
      candidates.length
        ? el('div', { class: 'inv-grid' }, candidates.map((item) => this.tile(item, { selected: this.selected.includes(item.id), onClick: () => this.toggleSelect(item.id) })))
        : el('div', { class: 'inv-empty muted', text: 'Birleştirilecek eşya yok (kuşanılı ve kilitli eşyalar listelenmez).' }),
    ]);
  }

  toggleSelect(id) {
    if (this.selected.includes(id)) this.selected = this.selected.filter((s) => s !== id);
    else if (this.selected.length < BLACKSMITH.COMBINE_COUNT) this.selected.push(id);
    this.render();
  }

  /** En zayıf 3 eşyayı seçer (aynı yuvadan 3 tane varsa onları tercih eder). */
  autoSelect(candidates) {
    const bySlot = new Map();
    for (const item of candidates) bySlot.set(item.slot, [...(bySlot.get(item.slot) ?? []), item]);
    const sameSlot = [...bySlot.values()].find((list) => list.length >= BLACKSMITH.COMBINE_COUNT);
    this.selected = (sameSlot ?? candidates).slice(0, BLACKSMITH.COMBINE_COUNT).map((item) => item.id);
    this.render();
  }

  combine(button) {
    const result = this.equipment.combine(this.selected);
    if (!result) {
      replayAnimation(button, 'shake');
      return;
    }
    this.selected = [];
    this.flashId = result.id;
    const rarity = this.equipment.rarityOf(result);
    this.ui.toast(`Dövüldü: ${rarity.name} ${result.name}${result.set ? ` (${SET_MAP[result.set].name})` : ''}`, 'success', toCssColor(rarity.color));
    this.render();
  }

  // ------------------------------------------------------------ Yeniden döv

  renderReforge() {
    const { equipment } = this;
    const items = equipment.items
      .filter((item) => equipment.rarityOf(item).affixes > 0)
      .sort((a, b) => Number(equipment.isEquipped(b.id)) - Number(equipment.isEquipped(a.id)) || equipment.rarityIndex(b) - equipment.rarityIndex(a) || equipment.power(b) - equipment.power(a));
    const item = equipment.getItem(this.reforgeId);

    let detail;
    if (item) {
      const rarity = equipment.rarityOf(item);
      detail = el('div', { class: 'forge-detail', style: { '--rarity': toCssColor(rarity.color) } }, [
        el('div', { class: 'forge-detail-head' }, [
          this.art(item, 48),
          el('div', {}, [
            el('div', { class: 'item-rarity', text: `${item.name}${item.enhance ? ` +${item.enhance}` : ''}` }),
            el('div', { class: 'muted small', text: `${rarity.name} ${SLOT_MAP[item.slot].name} · Sv. ${item.level} · Güç ${formatNumber(equipment.power(item))}` }),
          ]),
        ]),
        el(
          'div',
          { class: `item-stats${item.id === this.flashId ? ' rerolled' : ''}` },
          equipment.itemStats(item).map(({ stat, value, main }) =>
            el('div', { class: `item-stat${main ? ' main' : ''}` }, [el('span', { text: AFFIX_MAP[stat].label + (main ? ' (sabit)' : '') }), el('span', { text: AFFIX_MAP[stat].format(value) })]),
          ),
        ),
        el('div', { class: 'forge-actions' }, [
          el('span', { class: 'muted small', text: `Dövme sayısı: ${item.reforged ?? 0}` }),
          el('button', {
            class: 'btn btn--primary',
            type: 'button',
            text: `🔨 Yeniden Döv (💠 ${formatNumber(equipment.reforgeCost(item))})`,
            disabled: !equipment.canReforge(item),
            on: { click: (e) => this.reforge(item, e.currentTarget) },
          }),
        ]),
      ]);
    } else {
      detail = el('div', { class: 'forge-detail empty muted', text: 'Ek özelliklerini yeniden zarlamak için bir eşya seç. Ana stat, seviye, güçlendirme ve set korunur.' });
    }

    return el('div', { class: 'forge-panel' }, [
      detail,
      el('h3', { class: 'section-title', text: 'Eşyalar (K = kuşanılı)' }),
      items.length
        ? el(
            'div',
            { class: 'inv-grid' },
            items.map((i) =>
              this.tile(i, {
                selected: i.id === this.reforgeId,
                onClick: () => {
                  this.reforgeId = i.id;
                  this.flashId = null;
                  this.render();
                },
              }),
            ),
          )
        : el('div', { class: 'inv-empty muted', text: 'Ek özellikli (Kaliteli ve üstü) eşyan yok.' }),
    ]);
  }

  reforge(item, button) {
    const before = this.equipment.power(item);
    if (!this.equipment.reforge(item.id)) {
      replayAnimation(button, 'shake');
      return;
    }
    const diff = this.equipment.power(item) - before;
    this.flashId = item.id;
    this.ui.toast(`Yeniden dövüldü · Güç ${diff >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(diff))}`, diff >= 0 ? 'success' : 'info');
    this.render();
  }

  // ------------------------------------------------------------ Setler

  renderSets() {
    const counts = this.equipment.setCounts;
    const owned = {};
    for (const item of this.equipment.items) if (item.set) owned[item.set] = (owned[item.set] ?? 0) + 1;

    return el('div', { class: 'forge-panel set-list' }, [
      el('p', { class: 'muted small', text: 'Nadir ve üstü eşyalar düştükleri bölgenin setinden olabilir. Aynı setten 2/4/6 parça kuşanınca bonuslar açılır.' }),
      ...SETS.map((set) => {
        const count = counts[set.id] ?? 0;
        return el('div', { class: `set-card${count ? ' worn' : ''}`, style: { '--set': toCssColor(set.color) } }, [
          el('div', { class: 'set-card-head' }, [
            el('span', { class: 'set-icon', text: set.icon }),
            el('strong', { text: `${set.name} Seti` }),
            el('span', { class: 'muted small', text: `Kuşanılı ${count}/6 · Sahip ${owned[set.id] ?? 0}` }),
          ]),
          el(
            'div',
            { class: 'set-tiers' },
            set.tiers.map((tier) =>
              el('div', { class: `set-tier${count >= tier.pieces ? ' active' : ''}` }, [
                el('span', { class: 'set-pieces', text: `${tier.pieces} parça` }),
                el('span', { text: Object.entries(tier.stats).map(([stat, value]) => statText(stat, value)).join(' · ') }),
              ]),
            ),
          ),
        ]);
      }),
    ]);
  }
}
