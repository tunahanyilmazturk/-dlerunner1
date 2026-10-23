import { Events } from '../core/events.js';
import { PET, PETS, PET_MAP } from '../data/pets.js';

// Yoldaşlar: yumurta, kuluçka, seviye/EXP, besleme ve bonuslar. Phaser bilmez.
// Saldırı/iyileştirme zamanlaması GameScene (ve denge simülatörü) içinde, activeProfile'a göre.
export class PetSystem {
  constructor(state, bus) {
    this.state = state;
    this.bus = bus;
    this.cachedBonuses = null;
    this.upgrades = null;
    this.equipment = null;
  }

  attach({ upgrades, equipment }) {
    this.upgrades = upgrades;
    this.equipment = equipment;
  }

  get data() {
    return this.state.pets;
  }

  get list() {
    return PETS;
  }

  owned(id) {
    return this.data.owned[id] ?? null;
  }

  get ownedCount() {
    return Object.keys(this.data.owned).length;
  }

  get active() {
    return this.data.active && this.owned(this.data.active) ? PET_MAP[this.data.active] : null;
  }

  level(id) {
    return this.owned(id)?.level ?? 0;
  }

  xpToNext(level) {
    return Math.round(PET.XP_BASE * Math.pow(level, PET.XP_EXP));
  }

  isMaxed(id) {
    return this.level(id) >= PET.MAX_LEVEL;
  }

  /** Bir yoldaşın seviyesindeki bonus değeri (tam). */
  bonusValue(id, level = this.level(id)) {
    const { bonus } = PET_MAP[id];
    return level > 0 ? bonus.base + bonus.perLevel * (level - 1) : 0;
  }

  /** { damage, hpRegen, critDamage, gold }: aktif yoldaş tam, diğerleri koleksiyon oranında. */
  get bonuses() {
    if (!this.cachedBonuses) {
      const totals = { damage: 0, hpRegen: 0, critDamage: 0, gold: 0 };
      for (const id of Object.keys(this.data.owned)) {
        const ratio = id === this.data.active ? 1 : PET.COLLECTION_RATIO;
        totals[PET_MAP[id].bonus.stat] += this.bonusValue(id) * ratio;
      }
      this.cachedBonuses = totals;
    }
    return this.cachedBonuses;
  }

  /** Aktif yoldaşın sahnedeki davranışı (seviyeyle ölçeklenmiş) ya da null. */
  get activeProfile() {
    const pet = this.active;
    if (!pet) return null;
    const lv = this.level(pet.id) - 1;
    return {
      pet,
      attack: pet.attack ? { interval: pet.attack.interval, damageMult: pet.attack.damageMult + pet.attack.perLevel * lv, aoe: Boolean(pet.attack.aoe) } : null,
      heal: pet.heal ? { interval: pet.heal.interval, ratio: pet.heal.ratio + pet.heal.perLevel * lv } : null,
    };
  }

  // ------------------------------------------------------------ İşlemler

  changed() {
    this.cachedBonuses = null;
    this.upgrades?.invalidate();
    this.bus.emit(Events.PET_CHANGED, {});
  }

  /** Düşman öldüğünde: aktif yoldaşa EXP, boss/elitte yumurta şansı. İlk boss her zaman yumurta verir. */
  onKill(config, rng = Math.random) {
    if (this.active) this.addXp(this.active.id, PET.KILL_XP * (config.isBoss ? 10 : config.isElite ? 3 : 1));
    const firstEgg = config.isBoss && this.ownedCount === 0 && this.data.eggs === 0;
    const chance = config.isBoss ? PET.EGG_CHANCE_BOSS : config.isElite ? PET.EGG_CHANCE_ELITE : 0;
    if (firstEgg || (chance && rng() < chance)) {
      this.data.eggs++;
      this.bus.emit(Events.PET_EGG_FOUND, { eggs: this.data.eggs });
      this.bus.emit(Events.PET_CHANGED, {});
      return true;
    }
    return false;
  }

  /** @returns {boolean} seviye atladı mı */
  addXp(id, amount) {
    const pet = this.owned(id);
    if (!pet || pet.level >= PET.MAX_LEVEL) return false;
    pet.xp += amount;
    let leveled = false;
    while (pet.level < PET.MAX_LEVEL && pet.xp >= this.xpToNext(pet.level)) {
      pet.xp -= this.xpToNext(pet.level);
      pet.level++;
      leveled = true;
    }
    if (pet.level >= PET.MAX_LEVEL) pet.xp = 0;
    if (leveled) {
      this.bus.emit(Events.PET_LEVEL_UP, { pet: PET_MAP[id], level: pet.level });
      this.changed();
    }
    return leveled;
  }

  /** Yumurtayı açar. @returns { pet, isNew } ya da null */
  hatch(rng = Math.random) {
    if (this.data.eggs <= 0) return null;
    this.data.eggs--;
    this.data.hatched = (this.data.hatched ?? 0) + 1;
    // Sahip olunmayanlar iki kat ağırlıklı: koleksiyon daha hızlı tamamlanır
    const weights = PETS.map((p) => (this.owned(p.id) ? 1 : 2));
    let roll = rng() * weights.reduce((a, b) => a + b, 0);
    const pet = PETS.find((_, i) => (roll -= weights[i]) < 0) ?? PETS[0];

    const isNew = !this.owned(pet.id);
    if (isNew) {
      this.data.owned[pet.id] = { level: 1, xp: 0 };
      if (!this.active) this.data.active = pet.id;
    } else {
      this.addXp(pet.id, Math.ceil(this.xpToNext(this.level(pet.id)) * PET.DUPLICATE_XP_RATIO));
    }
    this.bus.emit(Events.PET_HATCHED, { pet, isNew, level: this.level(pet.id) });
    this.changed();
    return { pet, isNew };
  }

  setActive(id) {
    if (!this.owned(id) || this.data.active === id) return false;
    this.data.active = id;
    this.changed();
    return true;
  }

  feedCost(id) {
    return Math.ceil(PET.FEED_COST * (1 + this.level(id) * 0.2));
  }

  canFeed(id) {
    return Boolean(this.owned(id)) && !this.isMaxed(id) && (this.equipment?.data.shards ?? 0) >= this.feedCost(id);
  }

  /** Parça karşılığı EXP verir. */
  feed(id) {
    if (!this.canFeed(id)) return false;
    this.equipment.data.shards -= this.feedCost(id);
    this.addXp(id, PET.FEED_XP);
    this.bus.emit(Events.EQUIPMENT_CHANGED, {});
    this.bus.emit(Events.PET_CHANGED, {});
    return true;
  }
}
