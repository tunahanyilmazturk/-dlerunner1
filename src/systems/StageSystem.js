import { ELITE, ENEMY_SCALING, STAGE } from '../config/balance.js';
import { Events } from '../core/events.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { getZoneInfo } from '../data/zones.js';
import { weightedPick } from '../utils/math.js';

export function isBossStage(stage) {
  return stage % STAGE.BOSS_EVERY === 0;
}

export function buildEnemyConfig(typeId, stage, isBoss, isElite = false) {
  const type = ENEMY_TYPES[typeId];
  const s = stage - 1;
  const S = ENEMY_SCALING;
  const rank = (bossMult, eliteMult) => (isBoss ? bossMult : isElite ? eliteMult : 1);
  return {
    typeId,
    type,
    name: isElite ? `Elit ${type.name}` : type.name,
    isBoss,
    isElite,
    stage,
    maxHp: S.BASE_HP * Math.pow(S.HP_GROWTH, s) * type.hpMult * rank(S.BOSS_HP_MULT, ELITE.HP_MULT),
    damage: S.BASE_DAMAGE * Math.pow(S.DAMAGE_GROWTH, s) * type.damageMult * rank(S.BOSS_DAMAGE_MULT, ELITE.DAMAGE_MULT),
    gold: S.BASE_GOLD * Math.pow(S.GOLD_GROWTH, s) * type.goldMult * rank(S.BOSS_GOLD_MULT, ELITE.GOLD_MULT),
    speed: type.speed,
    attackInterval: type.attackInterval,
    mechanics: isBoss ? (type.mechanics ?? []) : [],
  };
}

// Aşama ilerleyişinin saf mantığı (Phaser bilmez). Sahne bu sınıfa
// "düşman doğurabilir miyim / öldü / öldüm" der, bu sınıf da olay yayınlar.
export class StageSystem {
  constructor(state, bus) {
    this.state = state;
    this.bus = bus;
    this.resetStage();
  }

  get stage() {
    return this.state.stage;
  }

  get isBoss() {
    return isBossStage(this.stage);
  }

  get zoneInfo() {
    return getZoneInfo(this.stage);
  }

  get required() {
    return this.isBoss ? 1 : STAGE.ENEMIES_PER_STAGE;
  }

  resetStage() {
    this.kills = 0;
    this.spawned = 0;
    this.busy = false; // aşama geçişi / yenilgi sırasında true
    this.bossTimer = this.isBoss ? STAGE.BOSS_TIME_LIMIT : 0;
    this.emitProgress();
  }

  canSpawn() {
    return !this.busy && this.spawned < this.required;
  }

  nextEnemy() {
    const { zone } = this.zoneInfo;
    const typeId = this.isBoss ? zone.boss : weightedPick(zone.enemies).type;
    this.spawned++;
    const isElite = !this.isBoss && Math.random() < ELITE.CHANCE;
    const config = buildEnemyConfig(typeId, this.stage, this.isBoss, isElite);
    if (config.isBoss) this.bus.emit(Events.BOSS_SPAWNED, config);
    if (config.isElite) this.bus.emit(Events.ELITE_SPAWNED, config);
    return config;
  }

  registerKill(config) {
    if (this.busy) return;
    this.kills++;
    this.state.stats.totalKills++;
    if (config.isBoss) this.state.stats.bossKills++;
    this.bus.emit(Events.ENEMY_KILLED, config);
    this.emitProgress();

    if (this.kills >= this.required) {
      this.busy = true;
      this.state.stats.stagesCleared++;
      this.bus.emit(Events.STAGE_CLEARED, { stage: this.stage, isBoss: this.isBoss });
    }
  }

  advance() {
    this.state.stage++;
    this.state.highestStage = Math.max(this.state.highestStage, this.state.stage);
    this.state.bestStage = Math.max(this.state.bestStage, this.state.stage);
    this.resetStage();
    this.bus.emit(Events.STAGE_CHANGED, { stage: this.stage, zoneInfo: this.zoneInfo });
  }

  /** reason: 'death' | 'timeout' */
  fail(reason) {
    if (this.busy) return;
    this.busy = true;
    if (reason === 'death') this.state.stats.deaths++;
    this.bus.emit(Events.STAGE_FAILED, { reason, stage: this.stage, isBoss: this.isBoss });
  }

  /** Yenilgiden sonra bir aşama geri çekil ve orada güçlen. */
  retreat() {
    this.state.stage = Math.max(1, this.state.stage - 1);
    this.resetStage();
    this.bus.emit(Events.STAGE_CHANGED, { stage: this.stage, zoneInfo: this.zoneInfo });
  }

  update(dt) {
    if (!this.isBoss || this.busy || this.spawned === 0) return;
    this.bossTimer = Math.max(0, this.bossTimer - dt);
    this.bus.emit(Events.BOSS_TIMER, { remaining: this.bossTimer, total: STAGE.BOSS_TIME_LIMIT });
    if (this.bossTimer <= 0) this.fail('timeout');
  }

  emitProgress() {
    this.bus.emit(Events.STAGE_PROGRESS, {
      stage: this.stage,
      kills: this.kills,
      required: this.required,
      isBoss: this.isBoss,
    });
  }
}
