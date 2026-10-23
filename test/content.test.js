import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultState } from '../src/core/GameState.js';
import { EventBus } from '../src/core/EventBus.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';
import { METRICS } from '../src/data/metrics.js';
import { PET_BONUS_LABELS, PETS } from '../src/data/pets.js';
import { QUEST_TEMPLATES } from '../src/data/quests.js';
import { RELICS } from '../src/data/relics.js';
import { SKILLS, SKILL_MAP } from '../src/data/skills.js';
import { ENEMY_SPRITES } from '../src/data/sprites.js';
import { ZONES } from '../src/data/zones.js';
import { PetSystem } from '../src/systems/PetSystem.js';
import { PrestigeSystem } from '../src/systems/PrestigeSystem.js';
import { SkillSystem } from '../src/systems/SkillSystem.js';

// ------------------------------------------------------------ İçerik bütünlüğü (veri dosyaları arası referanslar)

test('bölge havuzlarındaki her düşman tanımlı ve dokusu var', () => {
  for (const zone of ZONES) {
    for (const { type } of zone.enemies) {
      assert.ok(ENEMY_TYPES[type], `${zone.id}: bilinmeyen düşman ${type}`);
      assert.ok(ENEMY_SPRITES[ENEMY_TYPES[type].texture], `${type}: doku yok`);
    }
    assert.ok(ENEMY_TYPES[zone.boss], `${zone.id}: bilinmeyen boss ${zone.boss}`);
    assert.ok(ENEMY_SPRITES[ENEMY_TYPES[zone.boss].texture], `${zone.boss}: doku yok`);
  }
});

test('her görev ve başarım tanımlı bir metrik okur', () => {
  for (const q of QUEST_TEMPLATES) assert.ok(METRICS[q.metric], `görev ${q.id}: metrik yok`);
  for (const a of ACHIEVEMENTS) assert.ok(METRICS[a.metric], `başarım ${a.id}: metrik yok`);
});

test('yetenek kısayolları benzersiz ve her yoldaş bonusunun etiketi var', () => {
  assert.equal(new Set(SKILLS.map((s) => s.hotkey)).size, SKILLS.length);
  for (const pet of PETS) assert.ok(PET_BONUS_LABELS[pet.bonus.stat], `${pet.id}: etiket yok`);
});

test('her relic çarpanı multipliers anahtarına karşılık gelir', () => {
  const state = createDefaultState();
  const prestige = new PrestigeSystem(state, new EventBus());
  for (const relic of RELICS) assert.notEqual(prestige.multipliers[relic.modifier], undefined, `${relic.id}: ${relic.modifier} yok`);
});

// ------------------------------------------------------------ Yeni içerik

test('kristal bölgesi: 7. bölge, 5 düşman + Kristal Kraliçe', () => {
  assert.equal(ZONES.length, 7);
  const crystal = ZONES[6];
  assert.equal(crystal.id, 'crystal');
  assert.equal(crystal.enemies.length, 5);
  assert.equal(crystal.boss, 'crystalQueen');
  assert.deepEqual(ENEMY_TYPES.crystalQueen.mechanics, ['slam', 'enrage', 'shield']);
});

test('Kader Kesiği: execute kuralı veride tanımlı', () => {
  const { effect } = SKILL_MAP.fateEdge;
  assert.equal(effect.type, 'strike');
  assert.equal(effect.damageMult, 10);
  assert.equal(effect.executeBelow, 0.35);
  assert.equal(effect.executeMult, 4);
});

test('effectFor: Büyü Kitabı çarpanı hasar yeteneklerine uygulanır', () => {
  const state = createDefaultState();
  const skills = new SkillSystem(state, new EventBus(), { multipliers: { skillDamage: 1.3, cooldown: 1 } }, { rank: () => 1, bonuses: { cooldown: 0 } });
  assert.ok(Math.abs(skills.effectFor('fateEdge').damageMult - 13) < 1e-9);
  assert.ok(Math.abs(skills.effectFor('thunder').damageMult - 26) < 1e-9);
  assert.ok(Math.abs(skills.effectFor('spiritBlades').summonMult - 1.56) < 1e-9);
  // Execute eşiği ve çarpanı çarpılmaz
  assert.equal(skills.effectFor('fateEdge').executeBelow, 0.35);
  assert.equal(skills.effectFor('fateEdge').executeMult, 4);
});

test('Büyü Kitabı relic\'i: alımda skillDamage çarpanı', () => {
  const state = createDefaultState();
  const prestige = new PrestigeSystem(state, new EventBus());
  assert.equal(prestige.multipliers.skillDamage, 1);
  state.prestige.souls = 10;
  assert.equal(prestige.buyRelic('grimoire'), true);
  assert.equal(prestige.multipliers.skillDamage, 1.15);
});

test('Bilge Baykuş: aktifken tam, pasifken koleksiyon oranında xpGain', () => {
  const state = createDefaultState();
  const bus = new EventBus();
  const pets = new PetSystem(state, bus);
  state.pets.owned.wiseOwl = { level: 1, xp: 0 };
  state.pets.active = 'wiseOwl';
  assert.equal(pets.bonuses.xpGain, 0.08);
  state.pets.active = null;
  pets.changed();
  assert.equal(pets.bonuses.xpGain, 0.08 * 0.25);
});

test('yeni metrikler kayıtlı durumdan okunur', () => {
  const state = createDefaultState();
  state.stats.bossInterrupts = 7;
  state.pets.hatched = 3;
  state.pets.owned = { wolfPup: { level: 2, xp: 0 }, fairy: { level: 4, xp: 0 } };
  state.prestige.relics = { ancestorBlade: 2, grimoire: 3 };
  assert.equal(METRICS.bossInterrupts(state), 7);
  assert.equal(METRICS.eggsHatched(state), 3);
  assert.equal(METRICS.petLevels(state), 6);
  assert.equal(METRICS.relicLevels(state), 5);
});
