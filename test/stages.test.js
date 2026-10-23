import assert from 'node:assert/strict';
import test from 'node:test';
import { ENEMY_SCALING, STAGE } from '../src/config/balance.js';
import { EventBus } from '../src/core/EventBus.js';
import { Events } from '../src/core/events.js';
import { createDefaultState } from '../src/core/GameState.js';
import { buildEnemyConfig, isBossStage, StageSystem } from '../src/systems/StageSystem.js';

const setup = (stage = 1) => {
  const state = createDefaultState();
  state.stage = stage;
  const bus = new EventBus();
  const stages = new StageSystem(state, bus);
  return { state, bus, stages };
};

test('isBossStage: her 5. aşama boss', () => {
  assert.equal(isBossStage(5), true);
  assert.equal(isBossStage(10), true);
  assert.equal(isBossStage(4), false);
  assert.equal(isBossStage(1), false);
});

test('buildEnemyConfig: düşman statları üstel ölçeklenir', () => {
  const slime = buildEnemyConfig('slime', 1, false);
  assert.equal(slime.maxHp, ENEMY_SCALING.BASE_HP * 0.8); // 16
  assert.equal(slime.damage, ENEMY_SCALING.BASE_DAMAGE * 0.8);
  const slime10 = buildEnemyConfig('slime', 10, false);
  assert.ok(Math.abs(slime10.maxHp / slime.maxHp - Math.pow(ENEMY_SCALING.HP_GROWTH, 9)) < 1e-9);
});

test('buildEnemyConfig: boss ve elit çarpanları uygulanır', () => {
  const normal = buildEnemyConfig('slime', 5, false);
  const elite = buildEnemyConfig('slime', 5, false, true);
  const boss = buildEnemyConfig('forestOgre', 5, true);
  assert.ok(Math.abs(elite.maxHp / normal.maxHp - 3.5) < 1e-9);
  assert.ok(Math.abs(boss.maxHp - ENEMY_SCALING.BASE_HP * Math.pow(ENEMY_SCALING.HP_GROWTH, 4) * 6) < 1e-9);
  assert.equal(boss.mechanics.length > 0, true);
  assert.equal(elite.mechanics.length, 0); // elit boss mekaniği taşımaz
});

test('aşama akışı: 10 öldürme → STAGE_CLEARED, advance sonraki aşamaya geçer', () => {
  const { state, bus, stages } = setup();
  let cleared = null;
  let changed = null;
  bus.on(Events.STAGE_CLEARED, (e) => (cleared = e));
  bus.on(Events.STAGE_CHANGED, (e) => (changed = e));
  for (let i = 0; i < STAGE.ENEMIES_PER_STAGE; i++) stages.registerKill({ isBoss: false });
  assert.equal(cleared.stage, 1);
  assert.equal(stages.busy, true);
  assert.equal(state.stats.stagesCleared, 1);
  stages.advance();
  assert.equal(state.stage, 2);
  assert.equal(state.highestStage, 2);
  assert.equal(changed.stage, 2);
  assert.equal(stages.busy, false);
});

test('boss aşaması: tek öldürme yeterli, süre dolunca timeout', () => {
  const { bus, stages } = setup(5);
  assert.equal(stages.isBoss, true);
  assert.equal(stages.required, 1);
  let failed = null;
  bus.on(Events.STAGE_FAILED, (e) => (failed = e));
  stages.nextEnemy(); // boss doğdu sayılır
  stages.update(STAGE.BOSS_TIME_LIMIT + 0.5);
  assert.equal(failed.reason, 'timeout');
});

test('yenilgi: fail → retreat bir aşama geri çeker', () => {
  const { state, stages } = setup(7);
  stages.fail('death');
  assert.equal(state.stats.deaths, 1);
  stages.retreat();
  assert.equal(state.stage, 6);
  assert.equal(stages.busy, false);
});

test('yenilgi: aşama 1\'de retreat 1\'in altına inmez', () => {
  const { state, stages } = setup(1);
  stages.fail('death');
  stages.retreat();
  assert.equal(state.stage, 1);
});

test('canSpawn: busy iken ve limit doluyken doğurmaz', () => {
  const { stages } = setup();
  stages.spawned = STAGE.ENEMIES_PER_STAGE;
  assert.equal(stages.canSpawn(), false);
});
