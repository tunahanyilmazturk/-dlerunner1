import { BLACKSMITH, ELITE, EQUIPMENT } from '../config/balance.js';
import { Events } from '../core/events.js';
import { AFFIXES, AFFIX_MAP, PREFIXES, RARITIES, SLOTS, SLOT_MAP } from '../data/equipment.js';
import { SETS, SET_CHANCE, SET_MAP } from '../data/sets.js';
import { getZoneInfo } from '../data/zones.js';
import { weightedPick } from '../utils/math.js';

const pickOne = (list, rng) => list[Math.floor(rng() * list.length)];

// base alanı olmayan çok eski eşyalar için ikon → tip (ikonlar sonradan değişti)
const LEGACY_BASES = { armor: { '🛡️': 'plate' }, necklace: { '📿': 'talisman' } };

function shuffled(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rollValue(affix, base, rarity, level, rng) {
  const levelScale = affix.scales ? 1 + level * EQUIPMENT.LEVEL_SCALING : 1;
  return base * rarity.statMult * (0.85 + rng() * 0.3) * levelScale;
}

// Eşya üretimi, envanter, kuşanma, güçlendirme ve parçalama. Phaser bilmez.
// Kuşanılan eşyaların toplam bonusu UpgradeSystem.stats içinde uygulanır.
export class EquipmentSystem {
  constructor(state, bus) {
    this.state = state;
    this.bus = bus;
    this.cachedBonuses = null;
    this.upgrades = null;
  }

  attach({ upgrades }) {
    this.upgrades = upgrades;
  }

  get data() {
    return this.state.equipment;
  }

  get items() {
    return this.data.items;
  }

  get inventory() {
    return this.items.filter((item) => !this.isEquipped(item.id));
  }

  get capacity() {
    return EQUIPMENT.INVENTORY_SIZE;
  }

  get isFull() {
    return this.inventory.length >= this.capacity;
  }

  rarityOf(item) {
    return RARITIES.find((r) => r.id === item.rarity);
  }

  rarityIndex(item) {
    return RARITIES.findIndex((r) => r.id === item.rarity);
  }

  getItem(id) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  /** Görsel tip (sword/axe/…); eski kayıtlarda alan yoksa ikondan bulunur. */
  baseOf(item) {
    if (item.base) return item.base;
    const slot = SLOT_MAP[item.slot];
    return LEGACY_BASES[item.slot]?.[item.icon] ?? (slot.bases.find((b) => b.icon === item.icon) ?? slot.bases[0]).id;
  }

  /** Her yuvaya çantadaki en güçlü eşyayı kuşanır. @returns {number} değişen yuva sayısı */
  equipBest() {
    let changed = 0;
    for (const slot of SLOTS) {
      const best = this.items
        .filter((item) => item.slot === slot.id)
        .sort((a, b) => this.power(b) - this.power(a))[0];
      if (best && this.data.equipped[slot.id] !== best.id) {
        this.data.equipped[slot.id] = best.id;
        changed++;
      }
    }
    if (changed) this.changed();
    return changed;
  }

  /** Karakter görünümü için kuşanılı eşyaların özeti: { weapon: { base, rarity, rarityIndex, enhance } | null, ... } */
  get appearance() {
    return Object.fromEntries(
      SLOTS.map((slot) => {
        const item = this.equippedItem(slot.id);
        return [
          slot.id,
          item ? { base: this.baseOf(item), rarity: item.rarity, rarityIndex: this.rarityIndex(item), enhance: item.enhance } : null,
        ];
      }),
    );
  }

  equippedItem(slot) {
    const id = this.data.equipped[slot];
    return id == null ? null : this.getItem(id);
  }

  isEquipped(id) {
    return Object.values(this.data.equipped).includes(id);
  }

  // ------------------------------------------------------------ Üretim

  rollRarity(rng, minIndex = 0) {
    const index = RARITIES.indexOf(weightedPick(RARITIES, rng));
    return RARITIES[Math.max(index, minIndex)];
  }

  /** Düşman öldüğünde çağrılır; şans tutmazsa null döner. */
  rollDrop(stage, { isBoss = false, isElite = false } = {}, rng = Math.random) {
    const chance = isBoss ? EQUIPMENT.BOSS_DROP_CHANCE : isElite ? ELITE.DROP_CHANCE : EQUIPMENT.DROP_CHANCE;
    if (rng() >= chance) return null;
    return this.generate(stage, { minRarity: isBoss ? EQUIPMENT.BOSS_MIN_RARITY : 0 }, rng);
  }

  /**
   * @param level eşya seviyesi (düştüğü aşama)
   * @param options.rarity nadirliği zorla (birleştirme) · options.set seti zorla (null: setsiz)
   */
  generate(level, { slot, minRarity = 0, rarity: forcedRarity, set } = {}, rng = Math.random) {
    const slotDef = slot ? SLOT_MAP[slot] : pickOne(SLOTS, rng);
    const rarity = forcedRarity ? RARITIES.find((r) => r.id === forcedRarity) : this.rollRarity(rng, minRarity);
    const base = pickOne(slotDef.bases, rng);
    const prefixes = PREFIXES[rarity.id];
    const prefix = prefixes.length ? `${pickOne(prefixes, rng)} ` : '';
    const mainAffix = AFFIX_MAP[slotDef.mainStat];
    const setId = set !== undefined ? set : this.rollSet(level, rarity, rng);

    const item = {
      id: this.data.nextId++,
      slot: slotDef.id,
      base: base.id,
      name: prefix + base.name,
      icon: base.icon,
      rarity: rarity.id,
      level,
      enhance: 0,
      locked: false,
      main: { stat: slotDef.mainStat, value: rollValue(mainAffix, slotDef.mainBase, rarity, level, rng) },
      affixes: this.rollAffixes(slotDef, rarity, level, rng),
    };
    if (setId) item.set = setId;
    return item;
  }

  rollAffixes(slotDef, rarity, level, rng) {
    return shuffled(
      AFFIXES.filter((a) => a.stat !== slotDef.mainStat),
      rng,
    )
      .slice(0, rarity.affixes)
      .map((a) => ({ stat: a.stat, value: rollValue(a, a.base, rarity, level, rng) }));
  }

  /** Nadir ve üstü eşyalar düştükleri bölgenin setinden olabilir. */
  rollSet(level, rarity, rng) {
    const chance = SET_CHANCE[rarity.id] ?? 0;
    if (!chance || rng() >= chance) return null;
    const zoneId = getZoneInfo(Math.max(1, level)).zone.id;
    return SET_MAP[zoneId] ? zoneId : null;
  }

  // ------------------------------------------------------------ Değerler

  /** Güçlendirme dahil eşyanın tüm statları; ilki ana stat. */
  itemStats(item) {
    const mult = 1 + EQUIPMENT.ENHANCE_STEP * item.enhance;
    return [
      { stat: item.main.stat, value: item.main.value * mult, main: true },
      ...item.affixes.map((a) => ({ stat: a.stat, value: a.value * mult, main: false })),
    ];
  }

  /** Karşılaştırma için tek sayılık güç puanı. */
  power(item) {
    if (!item) return 0;
    return this.itemStats(item).reduce((sum, { stat, value }) => sum + value * AFFIX_MAP[stat].weight, 0) * 100;
  }

  /** Aynı yuvadaki kuşanılı eşyaya göre güç farkı. */
  compare(item) {
    const current = this.equippedItem(item.slot);
    if (current?.id === item.id) return 0;
    return this.power(item) - this.power(current);
  }

  isUpgrade(item) {
    return !this.isEquipped(item.id) && this.compare(item) > 1e-6;
  }

  get upgradeCount() {
    return this.inventory.filter((item) => this.isUpgrade(item)).length;
  }

  /** Kuşanılı eşyaların stat toplamı (set bonusları dahil): { damage: 0.35, critChance: 0.02, ... } */
  get bonuses() {
    if (!this.cachedBonuses) {
      const totals = Object.fromEntries(AFFIXES.map((a) => [a.stat, 0]));
      for (const slot of SLOTS) {
        const item = this.equippedItem(slot.id);
        if (!item) continue;
        for (const { stat, value } of this.itemStats(item)) totals[stat] += value;
      }
      for (const { tiers } of this.activeSets) {
        for (const tier of tiers) if (tier.active) for (const [stat, value] of Object.entries(tier.stats)) totals[stat] += value;
      }
      this.cachedBonuses = totals;
    }
    return this.cachedBonuses;
  }

  /** Kuşanılı set parçası sayıları: { forest: 3, ... } */
  get setCounts() {
    const counts = {};
    for (const slot of SLOTS) {
      const set = this.equippedItem(slot.id)?.set;
      if (set) counts[set] = (counts[set] ?? 0) + 1;
    }
    return counts;
  }

  /** En az bir parçası kuşanılı setler ve kademe durumları. */
  get activeSets() {
    const counts = this.setCounts;
    return SETS.filter((set) => counts[set.id]).map((set) => ({
      set,
      count: counts[set.id],
      tiers: set.tiers.map((tier) => ({ ...tier, active: counts[set.id] >= tier.pieces })),
    }));
  }

  enhanceCostAt(item, enhance) {
    return Math.ceil(this.rarityOf(item).shardBase * Math.pow(enhance + 1, 1.5));
  }

  enhanceCost(item) {
    return this.enhanceCostAt(item, item.enhance);
  }

  canEnhance(item) {
    return item.enhance < EQUIPMENT.MAX_ENHANCE && this.data.shards >= this.enhanceCost(item);
  }

  salvageValue(item) {
    let spent = 0;
    for (let e = 0; e < item.enhance; e++) spent += this.enhanceCostAt(item, e);
    return Math.ceil(this.rarityOf(item).salvage * (1 + item.level * 0.03) + spent * 0.5);
  }

  // ------------------------------------------------------------ İşlemler

  changed() {
    this.cachedBonuses = null;
    this.upgrades?.invalidate();
    this.bus.emit(Events.EQUIPMENT_CHANGED, {});
  }

  /** Yeni düşen eşyayı ayarlara göre kuşanır, çantaya koyar ya da parçalar. */
  addShards(amount) {
    if (!(amount > 0)) return;
    this.data.shards += amount;
    this.bus.emit(Events.EQUIPMENT_CHANGED, {});
  }

  addItem(item) {
    this.state.stats.itemsFound++;
    if (item.rarity === 'legendary') this.state.stats.legendaryFound++;
    const wantsEquip = this.data.autoEquip && this.compare(item) > 1e-6;
    const autoSalvage = this.rarityIndex(item) <= this.data.autoSalvage;

    if (!wantsEquip && (autoSalvage || this.isFull)) {
      const shards = this.salvageValue(item);
      this.data.shards += shards;
      this.state.stats.itemsSalvaged++;
      this.bus.emit(Events.ITEM_DROPPED, {
        item,
        rarityIndex: this.rarityIndex(item),
        outcome: autoSalvage ? 'salvaged' : 'full',
        shards,
      });
      this.bus.emit(Events.EQUIPMENT_CHANGED, {});
      return;
    }

    this.items.push(item);
    if (wantsEquip) {
      this.data.equipped[item.slot] = item.id;
      this.changed();
    } else {
      this.bus.emit(Events.EQUIPMENT_CHANGED, {});
    }
    this.bus.emit(Events.ITEM_DROPPED, { item, rarityIndex: this.rarityIndex(item), outcome: wantsEquip ? 'equipped' : 'stored' });
  }

  equip(id) {
    const item = this.getItem(id);
    if (!item) return false;
    this.data.equipped[item.slot] = id;
    this.changed();
    return true;
  }

  unequip(slot) {
    if (this.data.equipped[slot] == null || this.isFull) return false;
    this.data.equipped[slot] = null;
    this.changed();
    return true;
  }

  enhance(id) {
    const item = this.getItem(id);
    if (!item || !this.canEnhance(item)) return false;
    this.data.shards -= this.enhanceCost(item);
    item.enhance++;
    if (this.isEquipped(id)) this.changed();
    else this.bus.emit(Events.EQUIPMENT_CHANGED, {});
    return true;
  }

  toggleLock(id) {
    const item = this.getItem(id);
    if (!item) return;
    item.locked = !item.locked;
    this.bus.emit(Events.EQUIPMENT_CHANGED, {});
  }

  /** @returns {number} kazanılan Parça (0 ise parçalanamadı) */
  salvage(id, { silent = false } = {}) {
    const item = this.getItem(id);
    if (!item || item.locked || this.isEquipped(id)) return 0;
    const shards = this.salvageValue(item);
    this.items.splice(this.items.indexOf(item), 1);
    this.data.shards += shards;
    this.state.stats.itemsSalvaged++;
    if (!silent) this.bus.emit(Events.EQUIPMENT_CHANGED, {});
    return shards;
  }

  /** Kilitsiz ve kuşanılıdan zayıf tüm çanta eşyalarını parçalar. */
  salvageWeak() {
    let count = 0;
    let shards = 0;
    for (const item of this.inventory) {
      if (item.locked || this.compare(item) > 0) continue;
      shards += this.salvage(item.id, { silent: true });
      count++;
    }
    if (count) this.bus.emit(Events.EQUIPMENT_CHANGED, {});
    return { count, shards };
  }

  // ------------------------------------------------------------ Demirci

  /** Birleştirmeye uygun mu: çantada, kilitsiz, en üst nadirlikte değil. */
  isCombinable(item) {
    return !this.isEquipped(item.id) && !item.locked && this.rarityIndex(item) < RARITIES.length - 1;
  }

  combineCost(rarityIndex) {
    return BLACKSMITH.COMBINE_COST[rarityIndex] ?? Infinity;
  }

  /** @returns {null|string} sorun yoksa null, yoksa sebep (count/invalid/rarity/shards) */
  combineProblem(ids) {
    const items = [...new Set(ids)].map((id) => this.getItem(id)).filter(Boolean);
    if (items.length !== BLACKSMITH.COMBINE_COUNT) return 'count';
    if (!items.every((item) => this.isCombinable(item))) return 'invalid';
    if (new Set(items.map((item) => item.rarity)).size > 1) return 'rarity';
    if (this.data.shards < this.combineCost(this.rarityIndex(items[0]))) return 'shards';
    return null;
  }

  /**
   * 3 aynı nadirlikte eşya → ilk eşyanın yuvasında bir üst nadirlikte yeni eşya.
   * Seviye en yükseğinki; setli bir parça varsa set ondan devralınır.
   * @returns yeni eşya ya da null
   */
  combine(ids, rng = Math.random) {
    if (this.combineProblem(ids)) return null;
    const items = ids.map((id) => this.getItem(id));
    const index = this.rarityIndex(items[0]);
    this.data.shards -= this.combineCost(index);
    const setSource = items.find((item) => item.set);
    const result = this.generate(
      Math.max(...items.map((item) => item.level)),
      { slot: items[0].slot, rarity: RARITIES[index + 1].id, ...(setSource ? { set: setSource.set } : {}) },
      rng,
    );
    for (const item of items) this.items.splice(this.items.indexOf(item), 1);
    this.items.push(result);
    this.state.stats.itemsFound++;
    if (result.rarity === 'legendary') this.state.stats.legendaryFound++;
    this.bus.emit(Events.ITEM_FORGED, { item: result, kind: 'combine' });
    this.bus.emit(Events.EQUIPMENT_CHANGED, {});
    return result;
  }

  reforgeCost(item) {
    return Math.ceil(this.rarityOf(item).shardBase * BLACKSMITH.REFORGE_MULT * (1 + BLACKSMITH.REFORGE_GROWTH * (item.reforged ?? 0)));
  }

  canReforge(item) {
    return Boolean(item) && this.rarityOf(item).affixes > 0 && this.data.shards >= this.reforgeCost(item);
  }

  /** Ek özellikleri yeniden zarlar (ana stat, seviye, güçlendirme ve set korunur). */
  reforge(id, rng = Math.random) {
    const item = this.getItem(id);
    if (!this.canReforge(item)) return false;
    this.data.shards -= this.reforgeCost(item);
    item.affixes = this.rollAffixes(SLOT_MAP[item.slot], this.rarityOf(item), item.level, rng);
    item.reforged = (item.reforged ?? 0) + 1;
    this.bus.emit(Events.ITEM_FORGED, { item, kind: 'reforge' });
    if (this.isEquipped(id)) this.changed();
    else this.bus.emit(Events.EQUIPMENT_CHANGED, {});
    return true;
  }

  setAutoEquip(enabled) {
    this.data.autoEquip = enabled;
  }

  setAutoSalvage(rarityIndex) {
    this.data.autoSalvage = rarityIndex;
  }
}
