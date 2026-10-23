import { Events } from '../core/events.js';
import { PASSIVES, PASSIVE_MAP, PASSIVE_TIERS, SKILL_RANK } from '../data/passives.js';
import { SKILL_MAP } from '../data/skills.js';

// Yetenek ağacı: karakter seviyesi başına 1 Yetenek Puanı (YP). Puanlar aktif yetenek
// seviyelerine (1–20) ve 3 kademeli pasif ağaca harcanır. Rebirth'te sıfırlanmaz
// (seviye de sıfırlanmadığı için). Sıfırlama ücretsizdir.
export class SkillTreeSystem {
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
    return this.state.skillTree;
  }

  get earnedPoints() {
    return Math.max(0, this.state.hero.level - 1);
  }

  get spentPoints() {
    const active = Object.values(this.data.ranks).reduce((sum, r) => sum + (r - 1), 0);
    const passive = Object.values(this.data.passives).reduce((sum, r) => sum + r, 0);
    return active + passive;
  }

  get availablePoints() {
    return this.earnedPoints - this.spentPoints;
  }

  // ------------------------------------------------------------ Aktif yetenekler

  /** Açık yetenek en az 1. seviyededir. */
  rank(skillId) {
    return this.data.ranks[skillId] ?? 1;
  }

  canRankUp(skillId, unlocked) {
    return unlocked && this.rank(skillId) < SKILL_RANK.MAX && this.availablePoints > 0;
  }

  rankUp(skillId, unlocked) {
    if (!this.canRankUp(skillId, unlocked)) return false;
    this.data.ranks[skillId] = this.rank(skillId) + 1;
    this.changed({ skillId });
    return true;
  }

  // ------------------------------------------------------------ Pasif ağaç

  passiveRank(id) {
    return this.data.passives[id] ?? 0;
  }

  /** Kademe, ağaçta (aktif + pasif) toplam bu kadar puan harcanınca açılır. */
  isTierOpen(tier) {
    return this.spentPoints >= PASSIVE_TIERS.find((t) => t.tier === tier).requires;
  }

  canLearn(id) {
    const passive = PASSIVE_MAP[id];
    return this.isTierOpen(passive.tier) && this.passiveRank(id) < passive.maxRank && this.availablePoints > 0;
  }

  learn(id) {
    if (!this.canLearn(id)) return false;
    this.data.passives[id] = this.passiveRank(id) + 1;
    this.changed({ passiveId: id });
    return true;
  }

  /** Tüm puanları geri verir. */
  reset() {
    this.data.ranks = {};
    this.data.passives = {};
    this.changed({ reset: true });
  }

  /** Pasiflerin toplam bonusu: { damage: 0.12, cooldown: 0.04, ... } */
  get bonuses() {
    if (!this.cachedBonuses) {
      const b = { damage: 0, maxHp: 0, attackSpeed: 0, critChance: 0, critDamage: 0, gold: 0, xp: 0, defense: 0, cooldown: 0 };
      for (const p of PASSIVES) b[p.stat] += p.perRank * this.passiveRank(p.id);
      this.cachedBonuses = b;
    }
    return this.cachedBonuses;
  }

  changed(detail) {
    this.cachedBonuses = null;
    this.upgrades?.invalidate();
    this.bus.emit(Events.SKILL_TREE_CHANGED, detail);
  }

  /** Bir yetenek için okunabilir seviye etiketi (Metin2 gibi: 1–9, M1–M10, G). */
  static rankLabel(rank) {
    if (rank < 10) return String(rank);
    if (rank < 20) return `M${rank - 9}`;
    return 'G';
  }

  static skillName(id) {
    return SKILL_MAP[id]?.name ?? id;
  }
}
