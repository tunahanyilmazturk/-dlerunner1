import assert from 'node:assert/strict';
import test from 'node:test';
import { attackHit, rollHit, tapHit } from '../src/systems/CombatSystem.js';

test('rollHit: zar kritik şansın altındaysa kritik vurur', () => {
  const hit = rollHit(100, { critChance: 0.5, critDamage: 2 }, () => 0.4);
  assert.equal(hit.isCrit, true);
  assert.equal(hit.amount, 200);
});

test('rollHit: zar kritik şansı geçerse normal vurur', () => {
  const hit = rollHit(100, { critChance: 0.5, critDamage: 2 }, () => 0.9);
  assert.equal(hit.isCrit, false);
  assert.equal(hit.amount, 100);
});

test('rollHit: kritik şans sınır değeri kritik sayılır değildir (rng == chance → normal)', () => {
  const hit = rollHit(100, { critChance: 0.5, critDamage: 2 }, () => 0.5);
  assert.equal(hit.isCrit, false);
});

test('attackHit: taban hasar stats.damage\'dan gelir', () => {
  const hit = attackHit({ damage: 10, critChance: 0, critDamage: 2 });
  assert.equal(hit.amount, 10);
});

test('tapHit: tapMultiplier uygulanır', () => {
  const hit = tapHit({ damage: 10, tapMultiplier: 0.3, critChance: 0, critDamage: 2 });
  assert.equal(hit.amount, 3);
});
