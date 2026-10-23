import { PRESTIGE } from '../config/balance.js';
import { Events } from '../core/events.js';
import { RELICS, RELIC_MAP } from '../data/relics.js';

// Rebirth: koşuyu sıfırla, Ruh Taşı kazan. Ruh Taşları kalıcı relic'lere harcanır;
// toplam kazanılan taş sayısı ayrıca pasif hasar/altın bonusu verir.
export class PrestigeSystem {
  constructor(state, bus) {
    this.state = state;
    this.bus = bus;
    this.cachedMultipliers = null;
    this.systems = null;
  }

  /** Rebirth'ün sıfırlayacağı sistemler (GameContext bağlar). */
  attach(systems) {
    this.systems = systems;
  }

  get data() {
    return this.state.prestige;
  }

  get relics() {
    return RELICS;
  }

  get isUnlocked() {
    return this.state.bestStage >= PRESTIGE.MIN_STAGE;
  }

  /** Toplam kazanılan Ruh Taşı'ndan gelen pasif çarpan. */
  get soulBonus() {
    return 1 + PRESTIGE.SOUL_BONUS * this.data.totalSouls;
  }

  soulsForStage(stage) {
    if (stage < PRESTIGE.MIN_STAGE) return 0;
    const raw = PRESTIGE.SOUL_BASE * Math.pow(stage - PRESTIGE.SOUL_OFFSET, PRESTIGE.SOUL_EXPONENT);
    return Math.floor(raw * this.multipliers.soulGain);
  }

  get pendingSouls() {
    return this.soulsForStage(this.state.highestStage);
  }

  /** Bir sonraki Ruh Taşı'nın kazanılacağı aşama. */
  get nextSoulStage() {
    const current = this.pendingSouls;
    const from = Math.max(this.state.highestStage + 1, PRESTIGE.MIN_STAGE);
    for (let stage = from; stage < from + 500; stage++) {
      if (this.soulsForStage(stage) > current) return stage;
    }
    return null;
  }

  relicLevel(id) {
    return this.data.relics[id] ?? 0;
  }

  isRelicMaxed(id) {
    return this.relicLevel(id) >= RELIC_MAP[id].maxLevel;
  }

  relicCost(id) {
    const relic = RELIC_MAP[id];
    return Math.ceil(relic.baseCost * Math.pow(relic.costGrowth, this.relicLevel(id)));
  }

  canBuyRelic(id) {
    return !this.isRelicMaxed(id) && this.data.souls >= this.relicCost(id);
  }

  buyRelic(id) {
    if (!this.canBuyRelic(id)) return false;
    this.data.souls -= this.relicCost(id);
    this.data.relics[id] = this.relicLevel(id) + 1;
    this.invalidate();
    this.bus.emit(Events.RELIC_PURCHASED, { id, level: this.relicLevel(id) });
    return true;
  }

  /** Relic'ler + pasif bonusun birleşik etkisi. */
  get multipliers() {
    if (!this.cachedMultipliers) {
      const m = { damage: 1, gold: 1, maxHp: 1, cooldown: 1, soulGain: 1, startStage: 1 };
      for (const relic of RELICS) m[relic.modifier] = relic.value(this.relicLevel(relic.id));
      m.damage *= this.soulBonus;
      m.gold *= this.soulBonus;
      this.cachedMultipliers = m;
    }
    return this.cachedMultipliers;
  }

  invalidate() {
    this.cachedMultipliers = null;
    this.systems?.upgrades.invalidate();
  }

  /** @returns {number} kazanılan Ruh Taşı (0 ise rebirth yapılmadı) */
  rebirth() {
    const gained = this.pendingSouls;
    if (gained <= 0) return 0;

    const { state } = this;
    this.data.souls += gained;
    this.data.totalSouls += gained;
    this.data.rebirths++;
    this.cachedMultipliers = null;

    const startStage = Math.min(this.multipliers.startStage, state.bestStage);
    state.gold = 0;
    state.upgrades = {};
    state.stage = startStage;
    state.highestStage = startStage;
    state.skills.cooldowns = {};

    const { upgrades, stages, skills } = this.systems;
    skills.reset();
    stages.resetStage();
    upgrades.invalidate();

    // PRESTIGE_DONE önce: sahne yeniden başlatmaya hazırlanır, sonraki olaylarda geçiş efekti oynatmaz
    this.bus.emit(Events.PRESTIGE_DONE, { gained, startStage, rebirths: this.data.rebirths });
    this.bus.emit(Events.GOLD_CHANGED, { gold: 0, delta: 0, source: 'rebirth' });
    this.bus.emit(Events.STAGE_CHANGED, { stage: state.stage, zoneInfo: stages.zoneInfo });
    return gained;
  }
}
