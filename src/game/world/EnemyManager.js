import { WORLD } from '../../config/balance.js';
import { randRange } from '../../utils/math.js';
import { Enemy } from '../entities/Enemy.js';

// Düşmanları doğurur ve sıraya dizer. Düşmanlar dünyayla birlikte sola kayar,
// ayrıca kendi hızlarıyla yürür; öndekinin ve oyuncunun içinden geçemezler.
export class EnemyManager {
  constructor(scene, stages) {
    this.scene = scene;
    this.stages = stages;
    this.enemies = []; // soldan sağa sıralı, sadece canlılar
    this.spawnCooldown = 0.6;
  }

  get front() {
    return this.enemies[0] ?? null;
  }

  get count() {
    return this.enemies.length;
  }

  update(dt, worldSpeed, time) {
    this.updateSpawning(dt);

    let minLeft = WORLD.PLAYER_X + WORLD.CONTACT_GAP;
    for (const enemy of this.enemies) {
      // Donmuş düşman kendi hızıyla yürümez (dünya kaymaya devam eder)
      const desiredX = enemy.x - (worldSpeed + (enemy.frozen ? 0 : enemy.speed)) * dt;
      enemy.x = Math.max(desiredX, minLeft + enemy.halfWidth);
      minLeft = enemy.rightEdge + WORLD.ENEMY_GAP;
      enemy.update(dt, time);
    }
  }

  updateSpawning(dt) {
    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0) return;
    if (!this.stages.canSpawn() || this.enemies.length >= WORLD.MAX_ALIVE_ENEMIES) return;

    const last = this.enemies[this.enemies.length - 1];
    if (last && last.rightEdge > WORLD.SPAWN_X - 40) return;

    const config = this.stages.nextEnemy();
    const enemy = new Enemy(this.scene, WORLD.SPAWN_X, config);
    enemy.x += enemy.halfWidth;
    this.enemies.push(enemy);
    this.spawnCooldown = randRange(WORLD.SPAWN_DELAY_MIN, WORLD.SPAWN_DELAY_MAX);
  }

  isInContact(enemy) {
    return enemy.leftEdge <= WORLD.PLAYER_X + WORLD.CONTACT_GAP + 2;
  }

  isInAttackRange(enemy) {
    return enemy.leftEdge <= WORLD.PLAYER_X + WORLD.ATTACK_RANGE;
  }

  remove(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) this.enemies.splice(index, 1);
  }

  /** Yenilgide tüm düşmanları ödül vermeden yok eder. */
  clear() {
    for (const enemy of this.enemies) enemy.die();
    this.enemies = [];
    this.spawnCooldown = 0.8;
  }
}
