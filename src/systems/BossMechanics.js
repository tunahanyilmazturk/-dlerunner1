import { BOSS_MECHANICS as M } from '../config/balance.js';

// Tek bir bossun savaş mekanikleri. Phaser bilmez: GameScene ve denge simülatörü aynı
// sınıfı kullanır, dönen olaylara göre görsel/etki uygular.
//   slam    : düzenli aralıkla uyarı (telegraph) → ağır vuruş. Uyarı sırasında yeterli hasar
//             verilirse vuruş iptal olur ("sersemletildi") — aktif oynayana ödül.
//   enrage  : can ENRAGE_AT altına inince saldırı hızı ve hasar artar.
//   shield  : can SHIELD_AT altına ilk inişte SHIELD_TIME sn hasar azaltan kalkan.
export class BossMechanics {
  /** @param mechanics ['slam', 'enrage', 'shield'] alt kümesi */
  constructor(mechanics = []) {
    this.has = new Set(mechanics);
    this.slamTimer = M.SLAM_INTERVAL * 0.6; // ilk vuruş biraz daha erken
    this.telegraph = 0; // > 0: uyarı sürüyor
    this.interruptDamage = 0;
    this.enraged = false;
    this.shieldUsed = false;
    this.shieldTime = 0;
  }

  get telegraphing() {
    return this.telegraph > 0;
  }

  get shielded() {
    return this.shieldTime > 0;
  }

  /** Gelen hasar çarpanı (kalkan). */
  get damageTakenMult() {
    return this.shielded ? 1 - M.SHIELD_REDUCTION : 1;
  }

  get attackIntervalMult() {
    return this.enraged ? M.ENRAGE_SPEED : 1;
  }

  get damageMult() {
    return this.enraged ? M.ENRAGE_DAMAGE : 1;
  }

  /**
   * @param engaged boss oyuncuyla temas halinde mi (vuruş zamanlayıcısı sadece temasta işler)
   * @returns olay listesi: { type: 'telegraph' | 'slam' | 'shieldEnd', ... }
   */
  update(dt, engaged) {
    const events = [];
    if (this.shieldTime > 0) {
      this.shieldTime -= dt;
      if (this.shieldTime <= 0) events.push({ type: 'shieldEnd' });
    }
    if (!this.has.has('slam') || !engaged) return events;

    if (this.telegraph > 0) {
      this.telegraph -= dt;
      if (this.telegraph <= 0) {
        this.telegraph = 0;
        events.push({ type: 'slam', mult: M.SLAM_MULT });
      }
      return events;
    }
    this.slamTimer -= dt;
    if (this.slamTimer <= 0) {
      this.slamTimer = M.SLAM_INTERVAL;
      this.telegraph = M.SLAM_TELEGRAPH;
      this.interruptDamage = 0;
      events.push({ type: 'telegraph', duration: M.SLAM_TELEGRAPH });
    }
    return events;
  }

  /**
   * Boss hasar aldıktan sonra çağrılır (amount: uygulanan hasar).
   * @returns olay listesi: { type: 'interrupted' | 'enrage' | 'shieldStart', ... }
   */
  onDamage(amount, hp, maxHp) {
    const events = [];
    if (this.telegraph > 0) {
      this.interruptDamage += amount;
      if (this.interruptDamage >= maxHp * M.INTERRUPT_RATIO) {
        this.telegraph = 0;
        events.push({ type: 'interrupted' });
      }
    }
    const ratio = hp / maxHp;
    if (hp > 0 && this.has.has('shield') && !this.shieldUsed && ratio <= M.SHIELD_AT) {
      this.shieldUsed = true;
      this.shieldTime = M.SHIELD_TIME;
      events.push({ type: 'shieldStart', duration: M.SHIELD_TIME });
    }
    if (hp > 0 && this.has.has('enrage') && !this.enraged && ratio <= M.ENRAGE_AT) {
      this.enraged = true;
      events.push({ type: 'enrage' });
    }
    return events;
  }
}
