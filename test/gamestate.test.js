import assert from 'node:assert/strict';
import test from 'node:test';
import { SAVE_VERSION } from '../src/config/balance.js';
import { createDefaultState, hydrateState } from '../src/core/GameState.js';

test('hydrateState: boş veriye varsayılanları doldurur', () => {
  const state = hydrateState({});
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.gold, 0);
  assert.equal(state.hero.level, 1);
  assert.equal(state.equipment.equipped.weapon, null);
  assert.equal(state.settings.audio.master, 0.8);
});

test('hydrateState: v1 → v2 migration highestStage\'i bestStage yapar', () => {
  const state = hydrateState({ version: 1, highestStage: 42, stage: 30 });
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.bestStage, 42);
  assert.equal(state.highestStage, 42);
});

test('hydrateState: v3 migration tılsımı yüzükten kolyeye taşır', () => {
  const raw = {
    version: 2,
    bestStage: 10,
    equipment: {
      items: [
        { id: 7, slot: 'ring', base: 'talisman', icon: '📿' },
        { id: 8, slot: 'ring', base: 'ring', icon: '💍' },
      ],
      equipped: { ring: 7, necklace: null },
    },
  };
  const state = hydrateState(raw);
  const talisman = state.equipment.items.find((i) => i.id === 7);
  const ring = state.equipment.items.find((i) => i.id === 8);
  assert.equal(talisman.slot, 'necklace');
  assert.equal(ring.slot, 'ring');
  assert.equal(state.equipment.equipped.ring, null);
  assert.equal(state.equipment.equipped.necklace, 7);
});

test('hydrateState: kolye doluysa tılsım kuşanılmış halini korur (kolye envantere düşer)', () => {
  const state = hydrateState({
    version: 2,
    equipment: {
      items: [
        { id: 7, slot: 'ring', base: 'talisman', icon: '📿' },
        { id: 9, slot: 'necklace', base: 'necklace', icon: '📿' },
      ],
      equipped: { ring: 7, necklace: 9 },
    },
  });
  // Mevcut davranış: taşınan tılsım kolye yuvasına kuşanılır, eski kolye (9) yuvadan iner ama kaybolmaz
  assert.equal(state.equipment.equipped.necklace, 7);
  assert.ok(state.equipment.items.some((i) => i.id === 9));
});

test('hydrateState: eksik iç içe alanlar varsayılanla birleşir, verilen değerler korunur', () => {
  const state = hydrateState({ version: SAVE_VERSION, gold: 500, settings: { damageNumbers: false } });
  assert.equal(state.gold, 500);
  assert.equal(state.settings.damageNumbers, false);
  assert.equal(state.settings.audio.music, 0.45); // verilmeyen iç alan varsayılandan gelir
  assert.equal(state.stats.totalKills, 0);
});

test('hydrateState: dizi alanlar birleştirilmez, kayıttaki haliyle kalır', () => {
  const items = [{ id: 1, slot: 'weapon', base: 'sword' }];
  const state = hydrateState({ version: SAVE_VERSION, equipment: { items } });
  assert.deepEqual(state.equipment.items, items);
});

test('createDefaultState: kritik alanlar mevcut', () => {
  const s = createDefaultState();
  for (const key of ['gold', 'upgrades', 'stage', 'hero', 'stats', 'equipment', 'skills', 'prestige', 'settings']) {
    assert.ok(key in s, `${key} eksik`);
  }
});
