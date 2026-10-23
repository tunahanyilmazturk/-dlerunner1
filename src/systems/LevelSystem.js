import { HERO_LEVEL } from '../config/balance.js';
import { Events } from '../core/events.js';

// Karakter seviyesi. ENEMY_KILLED olayını dinler, EXP verir, seviye atlatır.
// Seviye rebirth'te sıfırlanmaz; her seviye hasar ve maks. cana kalıcı bonus verir.
export class LevelSystem {
  constructor(state, bus) {
    this.state = state;
    this.bus = bus;
    this.upgrades = null;
    bus.on(Events.ENEMY_KILLED, (config) => this.gain(this.xpForKill(config) * (this.upgrades?.stats.xpMultiplier ?? 1)));
  }

  attach({ upgrades }) {
    this.upgrades = upgrades;
  }

  get level() {
    return this.state.hero.level;
  }

  get xp() {
    return this.state.hero.xp;
  }

  get isMaxed() {
    return this.level >= HERO_LEVEL.MAX_LEVEL;
  }

  /** Bu seviyeden bir sonrakine gereken EXP. */
  xpToNext(level = this.level) {
    return Math.round(HERO_LEVEL.LEVEL_BASE_XP * Math.pow(HERO_LEVEL.LEVEL_XP_GROWTH, level - 1));
  }

  get progress() {
    return this.isMaxed ? 1 : this.xp / this.xpToNext();
  }

  xpForKill(config) {
    const rank = config.isBoss ? HERO_LEVEL.BOSS_XP_MULT : config.isElite ? HERO_LEVEL.ELITE_XP_MULT : 1;
    return HERO_LEVEL.KILL_XP * Math.pow(HERO_LEVEL.XP_STAGE_GROWTH, config.stage - 1) * rank;
  }

  /** Hasar ve maks. can çarpanı (UpgradeSystem uygular). */
  get multiplier() {
    return 1 + HERO_LEVEL.BONUS_PER_LEVEL * (this.level - 1);
  }

  gain(amount) {
    if (!(amount > 0) || this.isMaxed) return;
    const hero = this.state.hero;
    hero.xp += amount;
    let leveled = false;
    while (!this.isMaxed && hero.xp >= this.xpToNext()) {
      hero.xp -= this.xpToNext();
      hero.level++;
      leveled = true;
      this.bus.emit(Events.LEVEL_UP, { level: hero.level });
    }
    if (this.isMaxed) hero.xp = 0;
    if (leveled) this.upgrades?.invalidate();
    this.bus.emit(Events.XP_CHANGED, { level: hero.level, xp: hero.xp, need: this.xpToNext(), gained: amount });
  }
}
