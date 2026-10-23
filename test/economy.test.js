import assert from 'node:assert/strict';
import test from 'node:test';
import { EventBus } from '../src/core/EventBus.js';
import { Events } from '../src/core/events.js';
import { createDefaultState } from '../src/core/GameState.js';
import { EconomySystem } from '../src/systems/EconomySystem.js';

const setup = () => {
  const state = createDefaultState();
  const bus = new EventBus();
  const economy = new EconomySystem(state, bus);
  return { state, bus, economy };
};

test('addGold: altın ve toplam istatistik artar, olay yayınlanır', () => {
  const { state, bus, economy } = setup();
  let event = null;
  bus.on(Events.GOLD_CHANGED, (e) => (event = e));
  economy.addGold(50);
  assert.equal(state.gold, 50);
  assert.equal(state.stats.totalGold, 50);
  assert.equal(event.delta, 50);
});

test('addGold: sıfır/negatif değerler yok sayılır', () => {
  const { state, economy } = setup();
  economy.addGold(0);
  economy.addGold(-5);
  assert.equal(state.gold, 0);
});

test('spend: yeterliyse düşer, değilse reddeder', () => {
  const { state, economy } = setup();
  economy.addGold(30);
  assert.equal(economy.spend(30), true);
  assert.equal(state.gold, 0);
  assert.equal(economy.spend(1), false);
});

test('altın/sn: yeterli örnek sonrası kovalardan ortalama hesaplar', () => {
  const { state, economy } = setup();
  economy.addGold(100, 'kill');
  for (let i = 0; i < 10; i++) economy.update(1);
  assert.ok(Math.abs(state.goldPerSecond - 10) < 1e-9); // 100 altın / 10 sn
});

test('altın/sn: GPS_MIN_SAMPLE dolmadan kayıtlı değeri ezmez', () => {
  const { state, economy } = setup();
  state.goldPerSecond = 999;
  economy.update(5); // 5 sn < 10 sn örnek sınırı
  assert.equal(state.goldPerSecond, 999);
});
