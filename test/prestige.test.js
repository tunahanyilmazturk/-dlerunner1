import assert from 'node:assert/strict';
import test from 'node:test';
import { PRESTIGE } from '../src/config/balance.js';
import { EventBus } from '../src/core/EventBus.js';
import { Events } from '../src/core/events.js';
import { createDefaultState } from '../src/core/GameState.js';
import { PrestigeSystem } from '../src/systems/PrestigeSystem.js';

const setup = () => {
  const state = createDefaultState();
  const bus = new EventBus();
  const prestige = new PrestigeSystem(state, bus);
  const calls = { invalidated: 0, stageReset: 0, skillReset: 0 };
  prestige.attach({
    upgrades: { invalidate: () => calls.invalidated++ },
    stages: { resetStage: () => calls.stageReset++, zoneInfo: { label: 'x', stageInZone: 1 } },
    skills: { reset: () => calls.skillReset++ },
  });
  return { state, bus, prestige, calls };
};

test('soulsForStage: MIN_STAGE altında 0, formül README tablosuyla tutarlı', () => {
  const { prestige } = setup();
  assert.equal(prestige.soulsForStage(PRESTIGE.MIN_STAGE - 1), 0);
  assert.equal(prestige.soulsForStage(25), 4);
  assert.equal(prestige.soulsForStage(30), 8);
  assert.equal(prestige.soulsForStage(40), 16);
  assert.equal(prestige.soulsForStage(60), 35);
});

test('rebirth: Ruh Taşı kazandırır, koşuyu sıfırlar, kalıcıları korur', () => {
  const { state, bus, prestige, calls } = setup();
  state.highestStage = 30;
  state.bestStage = 30;
  state.gold = 5000;
  state.upgrades = { damage: 10 };
  state.stage = 30;
  let done = null;
  bus.on(Events.PRESTIGE_DONE, (e) => (done = e));
  const gained = prestige.rebirth();
  assert.equal(gained, 8);
  assert.equal(done.gained, 8);
  assert.equal(state.prestige.souls, 8);
  assert.equal(state.prestige.totalSouls, 8);
  assert.equal(state.prestige.rebirths, 1);
  assert.equal(state.gold, 0);
  assert.deepEqual(state.upgrades, {});
  assert.equal(state.stage, 1); // startStage relic yok → 1
  assert.equal(state.highestStage, 1);
  assert.equal(state.bestStage, 30); // tüm zamanlar korunur
  assert.equal(calls.invalidated, 1);
  assert.equal(calls.stageReset, 1);
  assert.equal(calls.skillReset, 1);
});

test('rebirth: kazanç 0 ise hiçbir şey yapmaz', () => {
  const { state, prestige } = setup();
  state.highestStage = 10;
  assert.equal(prestige.rebirth(), 0);
  assert.equal(state.prestige.rebirths, 0);
});

test('soulBonus: toplam taş başına +%5 pasif çarpan', () => {
  const { state, prestige } = setup();
  state.prestige.totalSouls = 10;
  assert.equal(prestige.soulBonus, 1.5);
  assert.equal(prestige.multipliers.damage, 1.5);
  assert.equal(prestige.multipliers.gold, 1.5);
});

test('buyRelic: maliyeti düşer, seviye ve çarpan günceller', () => {
  const { state, prestige, calls } = setup();
  state.prestige.souls = 5;
  assert.equal(prestige.relicCost('ancestorBlade'), 1);
  assert.equal(prestige.buyRelic('ancestorBlade'), true);
  assert.equal(state.prestige.souls, 4);
  assert.equal(prestige.relicLevel('ancestorBlade'), 1);
  assert.equal(calls.invalidated, 1);
  assert.equal(prestige.multipliers.damage, 1.25);
  // Maliyet büyür: 1. seviye → ceil(1 * 1.6) = 2
  assert.equal(prestige.relicCost('ancestorBlade'), 2);
});

test('buyRelic: yetersiz taşta reddeder', () => {
  const { prestige } = setup();
  assert.equal(prestige.buyRelic('soulHarvest'), false); // maliyet 5, taş 0
});
