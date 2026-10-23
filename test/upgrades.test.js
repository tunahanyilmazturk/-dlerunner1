import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultState } from '../src/core/GameState.js';
import { EventBus } from '../src/core/EventBus.js';
import { Events } from '../src/core/events.js';
import { EconomySystem } from '../src/systems/EconomySystem.js';
import { UpgradeSystem } from '../src/systems/UpgradeSystem.js';

// UpgradeSystem'in beklediği kaynak sistem arayüzü (hepsi çarpan 1 / toplam 0)
const stubSources = () => ({
  prestige: { multipliers: { damage: 1, gold: 1, maxHp: 1 } },
  equipment: {
    bonuses: { damage: 0, attackSpeed: 0, critChance: 0, critDamage: 0, gold: 0, maxHp: 0, hpRegen: 0, tap: 0, defense: 0, runSpeed: 0, xpGain: 0 },
  },
  achievements: { multiplier: 1 },
  level: { multiplier: 1 },
  skillTree: { bonuses: { damage: 0, maxHp: 0, attackSpeed: 0, critChance: 0, critDamage: 0, gold: 0, defense: 0, xp: 0 } },
  pets: { bonuses: { damage: 0, hpRegen: 0, critDamage: 0, gold: 0 } },
});

const setup = (gold = 0) => {
  const state = createDefaultState();
  state.gold = gold;
  const bus = new EventBus();
  const economy = new EconomySystem(state, bus);
  const upgrades = new UpgradeSystem(state, bus, economy, stubSources());
  return { state, bus, economy, upgrades };
};

test('costFor: geometrik seri toplamı (damage, seviye 0, 3 seviye)', () => {
  const { upgrades } = setup();
  // 8 + 8*1.2 + 8*1.44 = 29.12
  assert.ok(Math.abs(upgrades.costFor('damage', 3) - 29.12) < 1e-9);
});

test('costFor: kalan seviye maxLevel ile sınırlı', () => {
  const { state, upgrades } = setup();
  state.upgrades.attackSpeed = 39; // maxLevel 40
  assert.equal(upgrades.costFor('attackSpeed', 10), 25 * Math.pow(1.25, 39));
  state.upgrades.attackSpeed = 40;
  assert.equal(upgrades.costFor('attackSpeed', 1), Infinity);
});

test('maxAffordable: 100 altınla damage 6 seviye alınabilir (7. seviye 103 altın)', () => {
  const { upgrades } = setup(100);
  assert.equal(upgrades.maxAffordable('damage'), 6);
});

test('purchase: altını harcar, seviyeyi artırır, olay yayınlar', () => {
  const { state, bus, upgrades } = setup(100);
  let purchased = null;
  bus.on(Events.UPGRADE_PURCHASED, (e) => (purchased = e));
  assert.equal(upgrades.purchase('damage', 1), true);
  assert.equal(state.upgrades.damage, 1);
  assert.equal(state.gold, 92);
  assert.equal(purchased.amount, 1);
});

test('purchase: yetersiz altında almaz', () => {
  const { state, upgrades } = setup(5);
  assert.equal(upgrades.purchase('damage', 1), false);
  assert.equal(state.upgrades.damage, undefined);
  assert.equal(state.gold, 5);
});

test('purchase: "max" karşılanabilen kadarını alır', () => {
  const { state, upgrades } = setup(100);
  assert.equal(upgrades.purchase('damage', 'max'), true);
  assert.equal(state.upgrades.damage, 6);
});

test('purchase: kilitli yükseltme alınamaz (bestStage < unlockStage)', () => {
  const { state, upgrades } = setup(1e9);
  state.bestStage = 3; // critChance unlockStage 4
  assert.equal(upgrades.purchase('critChance', 1), false);
  state.bestStage = 4;
  assert.equal(upgrades.purchase('critChance', 1), true);
});

test('stats: seviye 0 temel değerler ve türetilmiş statlar', () => {
  const { upgrades } = setup();
  const s = upgrades.stats;
  assert.equal(s.damage, 5);
  assert.equal(s.attackSpeed, 1);
  assert.equal(s.maxHp, 100);
  assert.equal(s.hpRegen, 1);
  assert.equal(s.tapMultiplier, 0.25);
  assert.equal(s.goldMultiplier, 1);
  assert.equal(s.critChance, 0.05);
  assert.equal(s.critDamage, 1.5);
  assert.equal(s.damageReduction, 0);
  assert.equal(s.runSpeedMultiplier, 1);
  assert.equal(s.xpMultiplier, 1);
});

test('stats: kaynak çarpanları uygulanır ve önbellek alımda temizlenir', () => {
  const { state, upgrades } = setup(100);
  const sources = upgrades.sources;
  sources.prestige.multipliers.damage = 2;
  assert.equal(upgrades.stats.damage, 5 * 2);
  upgrades.purchase('damage', 1); // cachedStats sıfırlanır
  assert.equal(upgrades.stats.damage, 5 * 1.1 * 2);
});

test('dps: kritik dahil ortalama saniyelik hasar', () => {
  const { upgrades } = setup();
  // 5 hasar * 1 vuruş/sn * (1 + 0.05 * (1.5 - 1)) = 5.125
  assert.equal(upgrades.dps, 5.125);
});
