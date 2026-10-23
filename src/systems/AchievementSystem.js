import { ACHIEVEMENT } from '../config/balance.js';
import { Events } from '../core/events.js';
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from '../data/achievements.js';
import { METRICS } from '../data/metrics.js';

const CHECK_INTERVAL = 1; // sn

// Kademeli başarımlar. Kademeler sayaçlara bakılarak hesaplanır; sadece "alınan"
// kademe sayısı kaydedilir. Alınan her kademe kalıcı hasar/altın bonusu verir.
export class AchievementSystem {
  constructor(state, bus) {
    this.state = state;
    this.bus = bus;
    this.reachedCache = new Map(); // id → son bilinen ulaşılan kademe (bildirim için)
    this.timer = 0;
    this.upgrades = null;
    this.equipment = null;
  }

  attach({ upgrades, equipment }) {
    this.upgrades = upgrades;
    this.equipment = equipment;
  }

  get list() {
    return ACHIEVEMENTS;
  }

  value(achievement) {
    return METRICS[achievement.metric](this.state);
  }

  claimedTiers(id) {
    return this.state.achievements.claimed[id] ?? 0;
  }

  reachedTiers(achievement) {
    const value = this.value(achievement);
    return achievement.tiers.filter((target) => value >= target).length;
  }

  rewardForTier(index) {
    return ACHIEVEMENT.SHARDS_BASE * Math.pow(index + 1, 2);
  }

  /** Arayüz için özet: ilerleme, sıradaki hedef, alınabilir ödül. */
  info(id) {
    const achievement = ACHIEVEMENT_MAP[id];
    const claimed = this.claimedTiers(id);
    const reached = this.reachedTiers(achievement);
    const total = achievement.tiers.length;
    const nextIndex = Math.min(reached, total - 1);
    let pendingShards = 0;
    for (let i = claimed; i < reached; i++) pendingShards += this.rewardForTier(i);
    return {
      achievement,
      value: this.value(achievement),
      claimed,
      reached,
      total,
      complete: reached >= total,
      target: achievement.tiers[nextIndex],
      nextIndex,
      claimable: reached > claimed,
      pendingShards,
    };
  }

  get totalClaimed() {
    return ACHIEVEMENTS.reduce((sum, a) => sum + this.claimedTiers(a.id), 0);
  }

  get totalTiers() {
    return ACHIEVEMENTS.reduce((sum, a) => sum + a.tiers.length, 0);
  }

  /** UpgradeSystem hasar ve altına uygular. */
  get multiplier() {
    return 1 + ACHIEVEMENT.BONUS_PER_TIER * this.totalClaimed;
  }

  get claimableCount() {
    return ACHIEVEMENTS.filter((a) => this.reachedTiers(a) > this.claimedTiers(a.id)).length;
  }

  /** Ulaşılmış tüm kademeleri alır. */
  claim(id) {
    const { claimed, reached, pendingShards } = this.info(id);
    if (reached <= claimed) return null;
    this.state.achievements.claimed[id] = reached;
    this.equipment.addShards(pendingShards);
    this.upgrades.invalidate();
    this.bus.emit(Events.ACHIEVEMENTS_UPDATED, {});
    return { tiers: reached - claimed, shards: pendingShards };
  }

  /** Açılışta mevcut kademeleri hatırla; eski başarımlar için bildirim çıkmasın. */
  prime() {
    for (const a of ACHIEVEMENTS) this.reachedCache.set(a.id, this.reachedTiers(a));
  }

  update(dt) {
    this.timer += dt;
    if (this.timer < CHECK_INTERVAL) return;
    this.timer = 0;

    for (const a of ACHIEVEMENTS) {
      const reached = this.reachedTiers(a);
      const previous = this.reachedCache.get(a.id) ?? reached;
      if (reached > previous) this.bus.emit(Events.ACHIEVEMENT_REACHED, { achievement: a, tier: reached });
      this.reachedCache.set(a.id, reached);
    }
    this.bus.emit(Events.ACHIEVEMENTS_UPDATED, {});
  }
}
