import { Events } from '../core/events.js';
import { SKILL_RANK } from '../data/passives.js';
import { SKILLS, SKILL_MAP } from '../data/skills.js';

const LOW_HP_RATIO = 0.4;

// Yeteneklerin bekleme süresi, süreli etkileri ve otomatik kullanımı. Phaser bilmez:
// sahne her kare setContext() ile durumu bildirir, görsel etkiyi SKILL_ACTIVATED olayıyla çizer.
export class SkillSystem {
  constructor(state, bus, prestige, skillTree) {
    this.state = state;
    this.bus = bus;
    this.prestige = prestige;
    this.skillTree = skillTree;
    bus.on(Events.SKILL_TREE_CHANGED, () => (this.cachedModifiers = null));
    this.active = new Map(); // id → kalan süre (sn); kaydedilmez
    this.context = { hasTarget: false, hpRatio: 1 };
    this.cachedModifiers = null;
  }

  get list() {
    return SKILLS;
  }

  get(id) {
    return SKILL_MAP[id];
  }

  isUnlocked(id) {
    return this.state.bestStage >= this.get(id).unlockStage;
  }

  rank(id) {
    return this.skillTree.rank(id);
  }

  /** Relic, yetenek seviyesi ve pasif ağaç indirimleri uygulanmış bekleme süresi. */
  cooldownFor(id) {
    const k = this.rank(id) - 1;
    const treeCut = Math.min(0.5, this.skillTree.bonuses.cooldown);
    return this.get(id).cooldown * this.prestige.multipliers.cooldown * (1 - SKILL_RANK.COOLDOWN_PER_RANK * k) * (1 - treeCut);
  }

  durationFor(id) {
    return this.get(id).duration * (1 + SKILL_RANK.DURATION_PER_RANK * (this.rank(id) - 1));
  }

  /** Yetenek seviyesine göre güçlendirilmiş etki (GameScene ve simülatör bunu kullanır). */
  effectFor(id) {
    const k = this.rank(id) - 1;
    const e = { ...this.get(id).effect };
    if (e.damageMult) e.damageMult *= 1 + SKILL_RANK.DAMAGE_PER_RANK * k;
    if (e.summonMult) e.summonMult *= 1 + SKILL_RANK.DAMAGE_PER_RANK * k;
    if (e.attackSpeedMult) e.attackSpeedMult += 0.05 * k;
    if (e.goldMult) e.goldMult += 0.1 * k;
    if (e.healRatio) e.healRatio += 0.01 * k;
    if (e.freezeTime) e.freezeTime += 0.05 * k;
    return e;
  }

  /** Rebirth: aktif buff'ları bitir. */
  reset() {
    this.active.clear();
    this.cachedModifiers = null;
  }

  cooldownRemaining(id) {
    return this.state.skills.cooldowns[id] ?? 0;
  }

  activeRemaining(id) {
    return this.active.get(id) ?? 0;
  }

  isAutoCast(id) {
    return Boolean(this.state.skills.autoCast[id]);
  }

  setAutoCast(id, enabled) {
    this.state.skills.autoCast[id] = enabled;
    this.bus.emit(Events.SKILL_AUTOCAST_CHANGED, { id, enabled });
  }

  /** Sahne her kare çağırır: { hasTarget, hpRatio } */
  setContext(context) {
    this.context = context;
  }

  /** @returns {{ ok: boolean, reason?: 'locked' | 'cooldown' | 'noTarget' }} */
  canActivate(id) {
    const skill = this.get(id);
    if (!this.isUnlocked(id)) return { ok: false, reason: 'locked' };
    if (this.cooldownRemaining(id) > 0) return { ok: false, reason: 'cooldown' };
    if (skill.requiresTarget && !this.context.hasTarget) return { ok: false, reason: 'noTarget' };
    return { ok: true };
  }

  activate(id, source = 'manual') {
    const check = this.canActivate(id);
    if (!check.ok) {
      if (source === 'manual') this.bus.emit(Events.SKILL_REJECTED, { id, reason: check.reason });
      return false;
    }

    const skill = this.get(id);
    this.state.skills.cooldowns[id] = this.cooldownFor(id);
    if (skill.duration > 0) {
      this.active.set(id, this.durationFor(id));
      this.cachedModifiers = null;
    }
    this.state.stats.skillCasts++;
    this.bus.emit(Events.SKILL_ACTIVATED, { id, skill, effect: this.effectFor(id), source });
    return true;
  }

  update(dt) {
    const { cooldowns } = this.state.skills;
    for (const id of Object.keys(cooldowns)) {
      cooldowns[id] -= dt;
      if (cooldowns[id] <= 0) delete cooldowns[id];
    }

    for (const [id, remaining] of this.active) {
      const next = remaining - dt;
      if (next > 0) {
        this.active.set(id, next);
      } else {
        this.active.delete(id);
        this.cachedModifiers = null;
        this.bus.emit(Events.SKILL_ENDED, { id, skill: this.get(id) });
      }
    }

    for (const skill of SKILLS) {
      if (this.isAutoCast(skill.id) && this.shouldAutoCast(skill)) this.activate(skill.id, 'auto');
    }
  }

  shouldAutoCast(skill) {
    if (skill.auto === 'target') return this.context.hasTarget;
    if (skill.auto === 'lowHp') return this.context.hpRatio < LOW_HP_RATIO;
    return true;
  }

  /** Aktif buff'ların birleşik etkisi. */
  get modifiers() {
    if (!this.cachedModifiers) {
      const m = { attackSpeedMult: 1, goldMult: 1, invulnerable: false };
      for (const id of this.active.keys()) {
        const effect = this.effectFor(id);
        if (effect.attackSpeedMult) m.attackSpeedMult *= effect.attackSpeedMult;
        if (effect.goldMult) m.goldMult *= effect.goldMult;
        if (effect.invulnerable) m.invulnerable = true;
      }
      this.cachedModifiers = m;
    }
    return this.cachedModifiers;
  }

  /** Yükseltme statlarına aktif buff'ları uygular. */
  applyTo(stats) {
    const m = this.modifiers;
    if (m.attackSpeedMult === 1 && m.goldMult === 1) return stats;
    return {
      ...stats,
      attackSpeed: stats.attackSpeed * m.attackSpeedMult,
      goldMultiplier: stats.goldMultiplier * m.goldMult,
    };
  }
}
