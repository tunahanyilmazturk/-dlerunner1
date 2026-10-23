#!/usr/bin/env node
// Denge simülasyonu: oyunun saf mantık sistemlerini (systems/, data/, config/) Phaser
// olmadan çalıştırır. Sahnedeki savaş/hareket kuralları GameScene + EnemyManager ile aynıdır.
//
// Kullanım:
//   node tools/balance-sim.js                      → 120 dk, idle + aktif profil, 3 seed
//   node tools/balance-sim.js --minutes 60 --profile idle --seeds 1 --verbose
//
// Çıktı: kilometre taşları (aşama 5/10/20… ne zaman), 10 dakikalık zaman çizelgesi, duvarlar.

import * as BALANCE from '../src/config/balance.js';
import { GAME_WIDTH, STAGE, WORLD } from '../src/config/balance.js';
import { EventBus } from '../src/core/EventBus.js';
import { Events } from '../src/core/events.js';
import { createDefaultState } from '../src/core/GameState.js';
import { RELICS } from '../src/data/relics.js';
import { SLOTS } from '../src/data/equipment.js';
import { SKILLS } from '../src/data/skills.js';
import { ENEMY_SPRITES } from '../src/data/sprites.js';
import { UPGRADE_MAP } from '../src/data/upgrades.js';
import { AchievementSystem } from '../src/systems/AchievementSystem.js';
import { BossMechanics } from '../src/systems/BossMechanics.js';
import { attackHit, rollHit, tapHit } from '../src/systems/CombatSystem.js';
import { EconomySystem } from '../src/systems/EconomySystem.js';
import { EquipmentSystem } from '../src/systems/EquipmentSystem.js';
import { LevelSystem } from '../src/systems/LevelSystem.js';
import { PrestigeSystem } from '../src/systems/PrestigeSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { SkillSystem } from '../src/systems/SkillSystem.js';
import { PetSystem } from '../src/systems/PetSystem.js';
import { SkillTreeSystem } from '../src/systems/SkillTreeSystem.js';
import { StageSystem } from '../src/systems/StageSystem.js';
import { UpgradeSystem } from '../src/systems/UpgradeSystem.js';
import { formatNumber } from '../src/utils/format.js';

// ------------------------------------------------------------ Ayarlar

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]?.startsWith('--') ? true : (all[i + 1] ?? true)]);
    return pairs;
  }, []),
);
// Dosyayı değiştirmeden değer denemek için (birden fazla verilebilir):
//   --set ENEMY_SCALING.HP_GROWTH=1.2     config/balance.js değeri
//   --up damage.costGrowth=1.17           data/upgrades.js alanı
for (let i = 0; i < process.argv.length; i++) {
  const flag = process.argv[i];
  if (flag !== '--set' && flag !== '--up') continue;
  const [path, raw] = process.argv[i + 1].split('=');
  const [group, key] = path.split('.');
  const target = flag === '--set' ? BALANCE[group] : UPGRADE_MAP[group];
  target[key] = Number(raw);
  console.log(`(override) ${group}.${key} = ${raw}`);
}

const MINUTES = Number(args.minutes ?? 120);
const SEEDS = Number(args.seeds ?? 3);
const VERBOSE = Boolean(args.verbose);
const LOG_EVERY = Number(args.every ?? 10) * 60; // zaman çizelgesi aralığı (dk)
const PROFILES = {
  idle: { name: 'idle', tapsPerSec: 0 }, // sadece izleyen oyuncu
  active: { name: 'aktif', tapsPerSec: 3 }, // saniyede 3 dokunan oyuncu
};
const selectedProfiles = args.profile ? [PROFILES[args.profile]] : Object.values(PROFILES);

const DT = 0.05;
const COIN_DELAY = 1.1; // paranın HUD'a uçma süresi
const STALL_BEFORE_REBIRTH = 300; // yeni rekor gelmeden geçen bu kadar sn → rebirth
const MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];


function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Düşman yarı genişliği: Enemy.js ile aynı hesap (doku genişliği × ölçek × 0.42). */
function halfWidth(config) {
  const { type } = config;
  const scale = type.scale * (config.isBoss && type.scale === 1 ? 1.15 : 1) * (config.isElite ? BALANCE.ELITE.SCALE : 1);
  return ENEMY_SPRITES[type.texture].size[0] * scale * 0.42;
}

// ------------------------------------------------------------ Dünya

function createWorld() {
  const bus = new EventBus();
  const state = createDefaultState();
  const prestige = new PrestigeSystem(state, bus);
  const equipment = new EquipmentSystem(state, bus);
  const achievements = new AchievementSystem(state, bus);
  const level = new LevelSystem(state, bus);
  const skillTree = new SkillTreeSystem(state, bus);
  const economy = new EconomySystem(state, bus);
  const pets = new PetSystem(state, bus);
  const upgrades = new UpgradeSystem(state, bus, economy, { prestige, equipment, achievements, level, skillTree, pets });
  pets.attach({ upgrades, equipment });
  level.attach({ upgrades });
  skillTree.attach({ upgrades });
  const stages = new StageSystem(state, bus);
  const skills = new SkillSystem(state, bus, prestige, skillTree);
  const quests = new QuestSystem(state, bus);
  equipment.attach({ upgrades });
  achievements.attach({ upgrades, equipment });
  quests.attach({ economy, equipment, prestige });
  prestige.attach({ economy, upgrades, stages, skills });
  return { bus, state, prestige, equipment, achievements, economy, upgrades, stages, skills, quests, skillTree, pets };
}

// ------------------------------------------------------------ Satın alma yapay zekası

/** Oyuncunun "gücü": hasar × hayatta kalma × altın. Logaritmik artış / maliyet ile seçim yapılır. */
function powerScore(stats, profile) {
  const critFactor = 1 + stats.critChance * (stats.critDamage - 1);
  const dps = stats.damage * stats.attackSpeed * critFactor + stats.damage * stats.tapMultiplier * profile.tapsPerSec * critFactor;
  const toughness = stats.maxHp + stats.hpRegen * 8;
  return Math.log(dps) + 0.5 * Math.log(toughness) + 0.4 * Math.log(stats.goldMultiplier);
}

function buyUpgrades(w, profile, log) {
  const { upgrades, state, economy } = w;
  for (let guard = 0; guard < 200; guard++) {
    const base = powerScore(upgrades.stats, profile);
    let best = null;
    for (const u of upgrades.list) {
      if (!upgrades.isUnlocked(u.id) || upgrades.isMaxed(u.id)) continue;
      const cost = upgrades.costFor(u.id, 1);
      state.upgrades[u.id] = upgrades.level(u.id) + 1;
      upgrades.cachedStats = null;
      const gain = powerScore(upgrades.stats, profile) - base;
      state.upgrades[u.id] -= 1;
      upgrades.cachedStats = null;
      const ratio = gain / cost;
      if (!best || ratio > best.ratio) best = { id: u.id, cost, ratio };
    }
    if (!best || !economy.canAfford(best.cost)) return;
    upgrades.purchase(best.id, 1);
    log.purchases++;
  }
}

/** Yapay oyuncu YP'yi şu sırayla harcar: açık en üst kademedeki pasifler, sonra yetenek seviyeleri. */
function spendSkillPoints(w) {
  const { skillTree, skills } = w;
  const order = ['sharpness', 'toughness', 'swiftness', 'precision', 'greed', 'wisdom', 'executioner', 'ironwall', 'timelord'];
  for (let guard = 0; guard < 400 && skillTree.availablePoints > 0; guard++) {
    const passive = [...order].reverse().find((id) => skillTree.canLearn(id));
    if (passive && guard % 2 === 0) {
      skillTree.learn(passive);
      continue;
    }
    const skill = skills.list.filter((s) => skills.isUnlocked(s.id)).sort((a, b) => skills.rank(a.id) - skills.rank(b.id))[0];
    if (skill && skillTree.rankUp(skill.id, true)) continue;
    if (passive) skillTree.learn(passive);
    else break;
  }
}

function manageMeta(w) {
  const { quests, achievements, equipment, prestige, pets } = w;
  spendSkillPoints(w);
  // Yumurtaları aç; en güçlü saldıran yoldaşı aktif et
  while (pets.data.eggs > 0) pets.hatch();
  const preferred = ['dragonWhelp', 'wolfPup', 'goldCat', 'fairy'].find((id) => pets.owned(id));
  if (preferred) pets.setActive(preferred);
  for (const q of quests.list) quests.claim(q.id);
  quests.claimBonus();
  for (const a of achievements.list) achievements.claim(a.id);

  // Kuşanılı eşyaları ucuzdan pahalıya güçlendir
  const equipped = SLOTS.map((s) => s.id).map((s) => equipment.equippedItem(s)).filter(Boolean);
  for (let guard = 0; guard < 20; guard++) {
    const target = equipped.filter((i) => equipment.canEnhance(i)).sort((a, b) => equipment.enhanceCost(a) - equipment.enhanceCost(b))[0];
    if (!target) break;
    equipment.enhance(target.id);
  }
  if (equipment.inventory.length > 20) equipment.salvageWeak();

  // Relic: en ucuzu al (hasar/altın/can/ruh öncelikli)
  for (let guard = 0; guard < 50; guard++) {
    const options = RELICS.filter((r) => prestige.canBuyRelic(r.id)).sort((a, b) => prestige.relicCost(a.id) - prestige.relicCost(b.id));
    if (!options.length) break;
    prestige.buyRelic(options[0].id);
  }
}

// ------------------------------------------------------------ Simülasyon

function runSim({ minutes, profile, seed }) {
  Math.random = mulberry32(seed);
  const w = createWorld();
  const { bus, state, stages, upgrades, skills, equipment, economy, prestige, pets } = w;

  w.achievements.prime();
  w.quests.ensureToday();
  for (const s of SKILLS) skills.setAutoCast(s.id, true);

  const log = {
    milestones: {},
    timeline: [],
    deaths: 0,
    bossTimeouts: 0,
    rebirths: [],
    purchases: 0,
    longestStall: 0,
    unlocks: {},
  };

  let t = 0;
  let enemies = [];
  let spawnCooldown = 0.6;
  let worldSpeed = WORLD.RUN_SPEED;
  let attackTimer = 0;
  let maxHp = upgrades.stats.maxHp;
  let hp = maxHp;
  let recoveringUntil = -1;
  let advanceAt = null;
  let pendingGold = [];
  let tapAccumulator = 0;
  let summonTimer = 0;
  let petAttackTimer = 0;
  let petHealTimer = 0;
  let lastRecordAt = 0;
  let lastRecord = state.highestStage;

  bus.on(Events.STAGE_CLEARED, () => (advanceAt = t + STAGE.CLEAR_DELAY / 1000));
  bus.on(Events.STAGE_FAILED, ({ reason }) => {
    recoveringUntil = t + STAGE.FAIL_DELAY / 1000;
    enemies = [];
    if (reason === 'death') log.deaths++;
    else log.bossTimeouts++;
  });
  bus.on(Events.STATS_CHANGED, (s) => {
    const gained = Math.max(0, s.maxHp - maxHp);
    maxHp = s.maxHp;
    hp = Math.min(maxHp, hp + gained);
  });
  bus.on(Events.SKILL_ACTIVATED, ({ skill, effect }) => castSkill(skill, effect));

  const visible = (e) => e.x - e.hw < GAME_WIDTH;

  function kill(enemy) {
    enemies.splice(enemies.indexOf(enemy), 1);
    const stats = skills.applyTo(upgrades.stats);
    pendingGold.push({ at: t + COIN_DELAY, amount: enemy.cfg.gold * stats.goldMultiplier });
    const item = equipment.rollDrop(enemy.cfg.stage, enemy.cfg);
    if (item) equipment.addItem(item);
    pets.onKill(enemy.cfg);
    stages.registerKill(enemy.cfg);
  }

  function hit(enemy, h) {
    if (!enemies.includes(enemy)) return;
    const amount = h.amount * (enemy.boss?.damageTakenMult ?? 1);
    enemy.hp -= amount;
    if (enemy.boss) enemy.boss.onDamage(amount, enemy.hp, enemy.cfg.maxHp);
    if (enemy.hp <= 0) kill(enemy);
  }

  function damagePlayer(amount) {
    if (skills.modifiers.invulnerable) return;
    hp -= amount * (1 - upgrades.stats.damageReduction);
    if (hp <= 0) {
      hp = 0;
      stages.fail('death');
    }
  }

  function castSkill(skill, effect = skill.effect) {
    const stats = upgrades.stats;
    if (effect.type === 'dot') {
      if (enemies[0]) (enemies[0].dots ??= []).push({ perTick: (stats.damage * effect.damageMult) / effect.ticks, ticks: effect.ticks, interval: effect.tickInterval, timer: 0 });
    } else if (effect.type === 'freeze') {
      for (const e of enemies.filter(visible)) {
        e.frozen = Math.max(e.frozen ?? 0, effect.freezeTime);
        hit(e, rollHit(stats.damage * effect.damageMult, stats));
      }
    } else if (effect.type === 'aoe') {
      for (const e of enemies.filter(visible)) hit(e, rollHit(stats.damage * effect.damageMult, stats));
    } else if (effect.type === 'strike') {
      if (enemies[0]) hit(enemies[0], rollHit(stats.damage * effect.damageMult, stats));
    } else if (effect.healRatio) {
      hp = Math.min(maxHp, hp + maxHp * effect.healRatio);
    }
  }

  const end = minutes * 60;
  let nextAi = 0;
  let nextLog = 0;

  while (t < end) {
    t += DT;

    if (advanceAt !== null && t >= advanceAt) {
      advanceAt = null;
      stages.advance();
    }
    if (recoveringUntil > 0 && t >= recoveringUntil) {
      recoveringUntil = -1;
      hp = maxHp;
      attackTimer = 0;
      stages.retreat();
    }
    const recovering = recoveringUntil > 0;

    state.stats.playTime += DT;
    economy.update(DT);
    stages.update(DT);
    w.achievements.update(DT);
    w.quests.update(DT);

    const front = enemies[0];
    const engaged = !recovering && front && front.x - front.hw <= WORLD.PLAYER_X + WORLD.ATTACK_RANGE;
    skills.setContext({ hasTarget: !recovering && Boolean(front) && front.x - front.hw < GAME_WIDTH - 20, hpRatio: hp / maxHp });
    skills.update(DT);
    const stats = skills.applyTo(upgrades.stats);

    if (!recovering) hp = Math.min(maxHp, hp + stats.hpRegen * DT);

    const targetSpeed = engaged || recovering ? 0 : WORLD.RUN_SPEED * stats.runSpeedMultiplier;
    worldSpeed += (targetSpeed - worldSpeed) * (1 - Math.exp(-WORLD.SPEED_EASE * DT));
    if (worldSpeed < 1) worldSpeed = 0;

    // Doğma (EnemyManager.updateSpawning)
    spawnCooldown -= DT;
    const last = enemies[enemies.length - 1];
    if (
      spawnCooldown <= 0 &&
      stages.canSpawn() &&
      enemies.length < WORLD.MAX_ALIVE_ENEMIES &&
      (!last || last.x + last.hw <= WORLD.SPAWN_X - 40)
    ) {
      const cfg = stages.nextEnemy();
      const hw = halfWidth(cfg);
      enemies.push({ cfg, hw, x: WORLD.SPAWN_X + hw, hp: cfg.maxHp, atk: 0, boss: cfg.mechanics?.length ? new BossMechanics(cfg.mechanics) : null });
      spawnCooldown = WORLD.SPAWN_DELAY_MIN + Math.random() * (WORLD.SPAWN_DELAY_MAX - WORLD.SPAWN_DELAY_MIN);
    }

    // Hareket (EnemyManager.update)
    let minLeft = WORLD.PLAYER_X + WORLD.CONTACT_GAP;
    for (const e of enemies) {
      e.x = Math.max(e.x - (worldSpeed + (e.frozen > 0 ? 0 : e.cfg.speed)) * DT, minLeft + e.hw);
      if (e.frozen > 0) e.frozen -= DT;
      minLeft = e.x + e.hw + WORLD.ENEMY_GAP;
    }

    // Zehir tikleri ve Ruh Kılıçları (GameScene.updateDots / updateSummons ile aynı)
    for (const e of [...enemies]) {
      if (!e.dots?.length) continue;
      for (const dot of e.dots) {
        dot.timer += DT;
        while (dot.timer >= dot.interval && dot.ticks > 0 && enemies.includes(e)) {
          dot.timer -= dot.interval;
          dot.ticks--;
          hit(e, rollHit(dot.perTick, upgrades.stats));
        }
      }
      e.dots = e.dots.filter((d) => d.ticks > 0);
    }
    if (skills.activeRemaining('spiritBlades') > 0 && !recovering) {
      const effect = skills.effectFor('spiritBlades');
      summonTimer += DT;
      if (summonTimer >= effect.summonInterval) {
        summonTimer = 0;
        if (enemies[0] && visible(enemies[0])) hit(enemies[0], rollHit(upgrades.stats.damage * effect.summonMult, upgrades.stats));
      }
    }

    // Yoldaş (GameScene.updatePet ile aynı)
    const pet = pets.activeProfile;
    if (pet && !recovering) {
      if (pet.attack) {
        petAttackTimer += DT;
        if (petAttackTimer >= pet.attack.interval && enemies[0] && visible(enemies[0])) {
          petAttackTimer = 0;
          const targets = pet.attack.aoe ? enemies.filter(visible) : [enemies[0]];
          for (const e of targets) hit(e, rollHit(upgrades.stats.damage * pet.attack.damageMult, upgrades.stats));
        }
      }
      if (pet.heal) {
        petHealTimer += DT;
        if (petHealTimer >= pet.heal.interval) {
          petHealTimer = 0;
          hp = Math.min(maxHp, hp + maxHp * pet.heal.ratio);
        }
      }
    }

    // Oyuncu saldırısı
    const interval = 1 / stats.attackSpeed;
    attackTimer = Math.min(attackTimer + DT, interval);
    if (engaged && attackTimer >= interval) {
      attackTimer = 0;
      hit(front, attackHit(stats));
    }

    // Dokunma
    if (profile.tapsPerSec && !recovering && enemies[0] && visible(enemies[0])) {
      tapAccumulator += DT * profile.tapsPerSec;
      while (tapAccumulator >= 1 && enemies[0]) {
        tapAccumulator -= 1;
        state.stats.taps++;
        hit(enemies[0], tapHit(stats));
      }
    }

    // Düşman saldırısı (boss mekanikleri GameScene.updateBoss ile aynı)
    const attacker = enemies[0];
    const contact = attacker && !recovering && !(attacker.frozen > 0) && attacker.x - attacker.hw <= WORLD.PLAYER_X + WORLD.CONTACT_GAP + 2;
    if (attacker?.boss && !recovering) {
      for (const ev of attacker.boss.update(DT, contact)) {
        if (ev.type === 'slam') {
          log.slams = (log.slams ?? 0) + 1;
          damagePlayer(attacker.cfg.damage * attacker.boss.damageMult * ev.mult);
        }
      }
    }
    if (contact && enemies[0] === attacker) {
      attacker.atk += DT;
      const boss = attacker.boss;
      if (attacker.atk >= attacker.cfg.attackInterval * (boss?.attackIntervalMult ?? 1)) {
        attacker.atk = 0;
        damagePlayer(attacker.cfg.damage * (boss?.damageMult ?? 1));
      }
    } else if (attacker) {
      attacker.atk = 0;
    }

    // Uçan paralar
    if (pendingGold.length && pendingGold[0].at <= t) {
      const arrived = pendingGold.filter((g) => g.at <= t);
      pendingGold = pendingGold.filter((g) => g.at > t);
      for (const g of arrived) economy.addGold(g.amount, 'kill');
    }

    // Kayıtlar
    if (state.highestStage > lastRecord) {
      log.longestStall = Math.max(log.longestStall, t - lastRecordAt);
      lastRecord = state.highestStage;
      lastRecordAt = t;
    }
    for (const m of MILESTONES) if (state.bestStage >= m && log.milestones[m] === undefined) log.milestones[m] = t;
    for (const s of SKILLS) if (skills.isUnlocked(s.id) && log.unlocks[s.id] === undefined) log.unlocks[s.id] = t;

    // Oyuncu kararları (saniyede bir)
    if (t >= nextAi) {
      nextAi = t + 1;
      manageMeta(w);
      buyUpgrades(w, profile, log);

      const stalled = t - lastRecordAt > STALL_BEFORE_REBIRTH;
      if (stalled && prestige.pendingSouls > 0 && recoveringUntil < 0 && advanceAt === null) {
        const gained = prestige.pendingSouls;
        log.rebirths.push({ t, stage: state.highestStage, gained });
        prestige.rebirth();
        enemies = [];
        hp = maxHp;
        lastRecord = state.highestStage;
        lastRecordAt = t;
        manageMeta(w);
      }
    }

    if (t >= nextLog) {
      nextLog += LOG_EVERY;
      const s = upgrades.stats;
      log.timeline.push({
        min: Math.round(t / 60),
        stage: state.stage,
        best: state.bestStage,
        gold: state.gold,
        gps: state.goldPerSecond,
        dps: upgrades.dps,
        maxHp: s.maxHp,
        // Ortalama düşmanı (çarpan 1) öldürme süresi: duvarların göstergesi
        ttk: (BALANCE.ENEMY_SCALING.BASE_HP * Math.pow(BALANCE.ENEMY_SCALING.HP_GROWTH, state.stage - 1)) / upgrades.dps,
        enemyDmg: BALANCE.ENEMY_SCALING.BASE_DAMAGE * Math.pow(BALANCE.ENEMY_SCALING.DAMAGE_GROWTH, state.stage - 1),
        deaths: log.deaths,
        heroLevel: state.hero.level,
        souls: prestige.data.totalSouls,
        levels: { ...state.upgrades },
        gear: SLOTS.map((s) => s.id).map((slot) => equipment.equippedItem(slot)?.rarity?.[0]?.toUpperCase() ?? '-').join(''),
      });
    }
  }
  log.longestStall = Math.max(log.longestStall, t - lastRecordAt);
  log.final = { stage: state.stage, best: state.bestStage, souls: prestige.data.totalSouls, claimedTiers: w.achievements.totalClaimed };
  return log;
}

// ------------------------------------------------------------ Rapor

const mmss = (sec) => (sec === undefined ? '  —  ' : `${String(Math.floor(sec / 60)).padStart(3)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`);
const median = (values) => {
  const v = values.filter((x) => x !== undefined).sort((a, b) => a - b);
  if (!v.length) return undefined;
  return v.length < values.length / 2 ? undefined : v[Math.floor(v.length / 2)];
};

for (const profile of selectedProfiles) {
  const runs = [];
  for (let seed = 1; seed <= SEEDS; seed++) runs.push(runSim({ minutes: MINUTES, profile, seed }));

  console.log(`\n=== Profil: ${profile.name} · ${MINUTES} dk · ${SEEDS} seed ===`);
  console.log('Kilometre taşları (medyan dk:sn → en iyi aşamaya ilk ulaşma)');
  console.log(MILESTONES.map((m) => `  aşama ${String(m).padStart(3)}: ${mmss(median(runs.map((r) => r.milestones[m])))}`).join('\n'));
  console.log(
    'Yetenek açılışı: ' +
      SKILLS.map((s) => `${s.name} ${mmss(median(runs.map((r) => r.unlocks[s.id])))?.trim()}`).join(' · '),
  );
  for (const [i, r] of runs.entries()) {
    const rebirths = r.rebirths.map((b) => `${mmss(b.t).trim()} (aşama ${b.stage}, +${b.gained})`).join(', ') || 'yok';
    console.log(
      `  seed ${i + 1}: son aşama ${r.final.stage}, en iyi ${r.final.best}, ölüm ${r.deaths}, boss süre ${r.bossTimeouts}, ` +
        `en uzun duvar ${mmss(r.longestStall).trim()}, rebirth: ${rebirths}, başarım kademesi ${r.final.claimedTiers}`,
    );
  }
  if (VERBOSE || SEEDS === 1) {
    console.log('Zaman çizelgesi (seed 1):');
    console.log('   dk  aşama  en iyi     altın   altın/sn       dps    ttk(sn)    maxHp  düş.hsr  ölüm   sv  ruh  ekipman  seviyeler');
    for (const row of runs[0].timeline) {
      const lv = Object.entries(row.levels)
        .map(([k, v]) => `${k.slice(0, 3)}${v}`)
        .join(' ');
      console.log(
        `  ${String(row.min).padStart(3)}  ${String(row.stage).padStart(5)}  ${String(row.best).padStart(6)}  ${formatNumber(row.gold).padStart(8)}  ${formatNumber(row.gps).padStart(9)}  ${formatNumber(row.dps).padStart(8)}  ${row.ttk.toFixed(2).padStart(8)}  ${formatNumber(row.maxHp).padStart(7)}  ${formatNumber(row.enemyDmg).padStart(7)}  ${String(row.deaths).padStart(4)}  ${String(row.heroLevel).padStart(3)}  ${String(row.souls).padStart(3)}  ${row.gear.padEnd(7)}  ${lv}`,
      );
    }
  }
}
