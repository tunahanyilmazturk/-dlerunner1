import assert from 'node:assert/strict';
import test from 'node:test';
import { BOSS_MECHANICS as M } from '../src/config/balance.js';
import { BossMechanics } from '../src/systems/BossMechanics.js';

const types = (events) => events.map((e) => e.type);

test('slam: temas yoksa telegraph başlamaz', () => {
  const mech = new BossMechanics(['slam']);
  const events = mech.update(10, false);
  assert.deepEqual(types(events), []);
  assert.equal(mech.telegraphing, false);
});

test('slam: ilk uyarı SLAM_INTERVAL*0.6 sonra gelir', () => {
  const mech = new BossMechanics(['slam']);
  assert.deepEqual(types(mech.update(M.SLAM_INTERVAL * 0.6 - 0.1, true)), []);
  const events = mech.update(0.2, true);
  assert.deepEqual(types(events), ['telegraph']);
  assert.equal(mech.telegraphing, true);
});

test('slam: telegraph süresi dolunca slam vurur', () => {
  const mech = new BossMechanics(['slam']);
  mech.update(M.SLAM_INTERVAL * 0.6 + 0.1, true); // telegraph başlar
  const events = mech.update(M.SLAM_TELEGRAPH, true);
  assert.deepEqual(types(events), ['slam']);
  assert.equal(events[0].mult, M.SLAM_MULT);
  assert.equal(mech.telegraphing, false);
});

test('slam: telegraph sırasında yeterli hasar vuruşu iptal eder', () => {
  const mech = new BossMechanics(['slam']);
  const maxHp = 1000;
  mech.update(M.SLAM_INTERVAL * 0.6 + 0.1, true);
  assert.deepEqual(types(mech.onDamage(maxHp * M.INTERRUPT_RATIO - 1, 900, maxHp)), []);
  const events = mech.onDamage(2, 898, maxHp);
  assert.deepEqual(types(events), ['interrupted']);
  // İptal sonrası süre dolsa bile slam gelmez
  assert.deepEqual(types(mech.update(M.SLAM_TELEGRAPH + 1, true)), []);
});

test('shield: can %50 altına ilk inişte bir kez açılır', () => {
  const mech = new BossMechanics(['shield']);
  assert.deepEqual(types(mech.onDamage(100, 600, 1000)), []); // %60 — henüz açılmaz
  const events = mech.onDamage(100, 500, 1000); // tam %50
  assert.deepEqual(types(events), ['shieldStart']);
  assert.equal(mech.damageTakenMult, 1 - M.SHIELD_REDUCTION);
  // Tekrar açılmaz
  assert.deepEqual(types(mech.onDamage(100, 400, 1000)), []);
});

test('shield: süre dolunca shieldEnd ve hasar çarpanı normale döner', () => {
  const mech = new BossMechanics(['shield']);
  mech.onDamage(100, 400, 1000);
  assert.equal(mech.shielded, true);
  assert.deepEqual(types(mech.update(M.SHIELD_TIME - 0.1, true)), []);
  assert.deepEqual(types(mech.update(0.2, true)), ['shieldEnd']);
  assert.equal(mech.damageTakenMult, 1);
});

test('enrage: can %30 altında bir kez tetiklenir', () => {
  const mech = new BossMechanics(['enrage']);
  assert.deepEqual(types(mech.onDamage(100, 310, 1000)), []);
  assert.deepEqual(types(mech.onDamage(20, 290, 1000)), ['enrage']);
  assert.equal(mech.enraged, true);
  assert.equal(mech.damageMult, M.ENRAGE_DAMAGE);
  assert.equal(mech.attackIntervalMult, M.ENRAGE_SPEED);
  assert.deepEqual(types(mech.onDamage(10, 200, 1000)), []); // tekrar tetiklenmez
});

test('ölüm vuruşu shield/enrage tetiklemez (hp <= 0)', () => {
  const mech = new BossMechanics(['shield', 'enrage']);
  const events = mech.onDamage(1000, 0, 1000);
  assert.deepEqual(types(events), []);
});

test('mekanik listesi boşsa hiçbir şey olmaz', () => {
  const mech = new BossMechanics([]);
  assert.deepEqual(mech.update(100, true), []);
  assert.deepEqual(mech.onDamage(500, 10, 1000), []);
});
