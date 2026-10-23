import { EQUIPMENT } from '../config/balance.js';
import { Events } from '../core/events.js';
import { UPGRADES, UPGRADE_MAP } from '../data/upgrades.js';

export class UpgradeSystem {
  /** sources: statları çarpan sistemler → { prestige, equipment, achievements, level } */
  constructor(state, bus, economy, sources) {
    this.state = state;
    this.bus = bus;
    this.economy = economy;
    this.sources = sources;
    this.cachedStats = null;
  }

  /** Statları yeniden hesaplat (relic/rebirth sonrası). */
  invalidate() {
    this.cachedStats = null;
    this.bus.emit(Events.STATS_CHANGED, this.stats);
  }

  get list() {
    return UPGRADES;
  }

  get(id) {
    return UPGRADE_MAP[id];
  }

  level(id) {
    return this.state.upgrades[id] ?? 0;
  }

  isUnlocked(id) {
    return this.state.bestStage >= (this.get(id).unlockStage ?? 1);
  }

  remainingLevels(id) {
    return this.get(id).maxLevel - this.level(id);
  }

  isMaxed(id) {
    return this.remainingLevels(id) <= 0;
  }

  /** amount seviyenin toplam maliyeti (geometrik seri toplamı). */
  costFor(id, amount = 1) {
    const u = this.get(id);
    const n = Math.min(amount, this.remainingLevels(id));
    if (n <= 0) return Infinity;
    const g = u.costGrowth;
    const first = u.baseCost * Math.pow(g, this.level(id));
    return (first * (Math.pow(g, n) - 1)) / (g - 1);
  }

  maxAffordable(id) {
    const u = this.get(id);
    const g = u.costGrowth;
    const first = u.baseCost * Math.pow(g, this.level(id));
    const n = Math.floor(Math.log((this.economy.gold * (g - 1)) / first + 1) / Math.log(g));
    return Math.max(0, Math.min(n, this.remainingLevels(id)));
  }

  /** buyAmount: 1 | 10 | 100 | 'max' → gerçekten alınacak seviye sayısı */
  resolveAmount(id, buyAmount) {
    const remaining = this.remainingLevels(id);
    if (remaining <= 0) return 0;
    if (buyAmount === 'max') return Math.max(1, this.maxAffordable(id));
    return Math.min(buyAmount, remaining);
  }

  purchase(id, buyAmount = 1) {
    if (!this.isUnlocked(id) || this.isMaxed(id)) return false;
    let amount = this.resolveAmount(id, buyAmount);
    let cost = this.costFor(id, amount);
    // Kayan nokta yuvarlaması 'max' hesabını bir seviye aşırabilir
    while (amount > 1 && cost > this.economy.gold) {
      amount--;
      cost = this.costFor(id, amount);
    }
    if (!this.economy.spend(cost)) return false;

    this.state.upgrades[id] = this.level(id) + amount;
    this.cachedStats = null;
    this.bus.emit(Events.UPGRADE_PURCHASED, { id, level: this.level(id), amount, cost });
    this.bus.emit(Events.STATS_CHANGED, this.stats);
    return true;
  }

  get stats() {
    if (!this.cachedStats) {
      const stats = {};
      for (const u of UPGRADES) stats[u.stat] = u.value(this.level(u.id));
      const { prestige, equipment, achievements, level, skillTree, pets } = this.sources;
      const m = prestige.multipliers;
      stats.damage *= m.damage;
      stats.goldMultiplier *= m.gold;
      stats.maxHp *= m.maxHp;

      stats.damage *= achievements.multiplier;
      stats.goldMultiplier *= achievements.multiplier;

      stats.damage *= level.multiplier;
      stats.maxHp *= level.multiplier;

      // Pasif yetenek ağacı
      const t = skillTree.bonuses;
      stats.damage *= 1 + t.damage;
      stats.maxHp *= 1 + t.maxHp;
      stats.attackSpeed *= 1 + t.attackSpeed;
      stats.critChance += t.critChance;
      stats.critDamage += t.critDamage;
      stats.goldMultiplier *= 1 + t.gold;

      // Yoldaşlar (aktif tam, diğerleri koleksiyon oranında)
      const p = pets?.bonuses;
      if (p) {
        stats.damage *= 1 + p.damage;
        stats.hpRegen *= 1 + p.hpRegen;
        stats.critDamage += p.critDamage;
        stats.goldMultiplier *= 1 + p.gold;
      }

      const b = equipment.bonuses;
      stats.damage *= 1 + b.damage;
      stats.attackSpeed *= 1 + b.attackSpeed;
      stats.critChance = Math.min(0.95, stats.critChance + b.critChance);
      stats.critDamage += b.critDamage;
      stats.goldMultiplier *= 1 + b.gold;
      stats.maxHp *= 1 + b.maxHp;
      stats.hpRegen *= 1 + b.hpRegen;
      stats.tapMultiplier *= 1 + b.tap;
      // Sadece ekipmandan gelen statlar (GameScene ve denge simülatörü kullanır)
      stats.damageReduction = Math.min(EQUIPMENT.MAX_DEFENSE, b.defense + t.defense);
      stats.runSpeedMultiplier = 1 + Math.min(EQUIPMENT.MAX_RUN_SPEED, b.runSpeed);
      stats.xpMultiplier = (1 + b.xpGain) * (1 + t.xp) * (1 + (p?.xpGain ?? 0));
      this.cachedStats = Object.freeze(stats);
    }
    return this.cachedStats;
  }

  /** Kritikleri hesaba katan ortalama saniyelik hasar. */
  get dps() {
    const s = this.stats;
    return s.damage * s.attackSpeed * (1 + s.critChance * (s.critDamage - 1));
  }
}
