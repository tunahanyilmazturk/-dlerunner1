import { ECONOMY } from '../config/balance.js';
import { Events } from '../core/events.js';

export class EconomySystem {
  constructor(state, bus) {
    this.state = state;
    this.bus = bus;
    // Son GPS_WINDOW saniyedeki kazancı saniyelik kovalarda tutar (altın/sn ortalaması için)
    this.buckets = new Array(ECONOMY.GPS_WINDOW).fill(0);
    this.bucketIndex = 0;
    this.bucketTimer = 0;
    this.sampledSeconds = 0;
  }

  get gold() {
    return this.state.gold;
  }

  canAfford(amount) {
    return this.state.gold >= amount;
  }

  addGold(amount, source = 'kill') {
    if (!(amount > 0)) return;
    this.state.gold += amount;
    this.state.stats.totalGold += amount;
    if (source === 'kill') this.buckets[this.bucketIndex] += amount;
    this.bus.emit(Events.GOLD_CHANGED, { gold: this.state.gold, delta: amount, source });
  }

  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.state.gold -= amount;
    this.bus.emit(Events.GOLD_CHANGED, { gold: this.state.gold, delta: -amount, source: 'spend' });
    return true;
  }

  update(dt) {
    this.bucketTimer += dt;
    while (this.bucketTimer >= 1) {
      this.bucketTimer -= 1;
      this.sampledSeconds = Math.min(this.sampledSeconds + 1, ECONOMY.GPS_WINDOW);
      this.bucketIndex = (this.bucketIndex + 1) % ECONOMY.GPS_WINDOW;
      this.buckets[this.bucketIndex] = 0;

      // Yeni açılıştan hemen sonra kayıtlı değeri sıfırlamamak için yeterli örnek bekle
      if (this.sampledSeconds >= ECONOMY.GPS_MIN_SAMPLE) {
        const total = this.buckets.reduce((sum, v) => sum + v, 0);
        this.state.goldPerSecond = total / this.sampledSeconds;
        this.bus.emit(Events.GPS_CHANGED, { goldPerSecond: this.state.goldPerSecond });
      }
    }
  }
}
