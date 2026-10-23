import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, STAGE, WORLD } from '../../config/balance.js';
import { Events } from '../../core/events.js';
import { attackHit, rollHit, tapHit } from '../../systems/CombatSystem.js';
import { toCssColor } from '../../utils/color.js';
import { getRenderScale } from '../renderScale.js';
import { approach } from '../../utils/math.js';
import { Effects } from '../effects/Effects.js';
import { CoinSpawner } from '../entities/Coin.js';
import { Pet } from '../entities/Pet.js';
import { Player } from '../entities/Player.js';
import { EnemyManager } from '../world/EnemyManager.js';
import { ParallaxBackground } from '../world/ParallaxBackground.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  /** @param data { rebirth?: { gained, startStage } } rebirth sonrası yeniden başlatmada gelir */
  create(data = {}) {
    this.ctx = this.registry.get('ctx');
    const { stages, upgrades, economy } = this.ctx;

    // Tuval render ölçeğinde büyük; zoom ile dünya hep 960x540 koordinatında kalır
    this.cameras.main.setZoom(getRenderScale()).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    this.zoneIndex = stages.zoneInfo.zoneIndex;
    this.background = new ParallaxBackground(this, this.zoneIndex);
    // Can azalınca kenarlarda kırmızı nabız (kenar karartma dokusunun kırmızı dolgulu kopyası)
    this.danger = this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(37).setTintFill(0xff2a2a).setAlpha(0);
    this.player = new Player(this, WORLD.PLAYER_X, WORLD.GROUND_Y);
    this.player.setMaxHp(upgrades.stats.maxHp, { refill: true });
    this.player.setEquipment(this.ctx.equipment.appearance);
    this.pet = new Pet(this);
    this.pet.setPet(this.ctx.pets.active);
    this.petAttackTimer = 0;
    this.petHealTimer = 0;
    this.enemies = new EnemyManager(this, stages);
    this.effects = new Effects(this);
    this.coins = new CoinSpawner(
      this,
      (amount) => {
        economy.addGold(amount, 'kill');
        this.ctx.bus.emit(Events.COIN_COLLECTED, { amount });
      },
      () => this.getCoinTargetPoint(),
    );

    this.worldSpeed = WORLD.RUN_SPEED;
    this.attackTimer = 0;
    this.recovering = false;
    this.rebirthing = false;
    this.lastHp = -1;

    this.input.on('pointerdown', this.handleTap, this);
    this.bindEvents();
    this.registerDevTools();

    if (data.rebirth) {
      this.cameras.main.fadeIn(600, 0, 0, 0);
      this.effects.banner('YENİDEN DOĞUŞ', {
        subtitle: `+${data.rebirth.gained} Ruh Taşı · Aşama ${data.rebirth.startStage}'ten başlıyorsun`,
        color: '#c9a7ff',
        duration: 2200,
      });
    } else {
      const { label, stageInZone } = stages.zoneInfo;
      this.effects.banner(label, { subtitle: `Aşama ${stages.stage} · ${stageInZone}/${STAGE.STAGES_PER_ZONE}` });
    }
  }

  onLevelUp(level) {
    const { x, y } = this.player;
    this.effects.floatText(x, y - 110, `SEVİYE ${level}!`, '#ffd23f', 24);
    this.effects.burst(x, y - 36, 0xffd23f, 18);
    const ring = this.add.image(x, y - 4, 'ring').setTint(0xffd23f).setScale(0.3, 0.12).setDepth(9).setBlendMode('ADD');
    this.tweens.add({ targets: ring, scaleX: 2.2, scaleY: 0.7, alpha: 0, duration: 600, ease: 'Quad.out', onComplete: () => ring.destroy() });
    const pillar = this.add.image(x, y, 'beam').setOrigin(0.5, 1).setTint(0xffd23f).setScale(2, 0.8).setAlpha(0).setDepth(9).setBlendMode('ADD');
    this.tweens.chain({ targets: pillar, tweens: [{ alpha: 0.8, duration: 120 }, { alpha: 0, duration: 500 }], onComplete: () => pillar.destroy() });
    this.player.refill?.();
  }

  onRebirth(rebirth) {
    this.recovering = true;
    this.rebirthing = true;
    this.time.removeAllEvents(); // bekleyen aşama geçişi/yenilgi çağrıları yeni koşuyu bozmasın
    this.enemies.clear();
    const cam = this.cameras.main;
    cam.fadeOut(400, 20, 0, 40);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({ rebirth }));
  }

  bindEvents() {
    const { bus } = this.ctx;
    const subscriptions = [
      bus.on(Events.STATS_CHANGED, (stats) => this.player.setMaxHp(stats.maxHp)),
      bus.on(Events.EQUIPMENT_CHANGED, () => this.player.setEquipment(this.ctx.equipment.appearance)),
      bus.on(Events.PET_CHANGED, () => this.pet.setPet(this.ctx.pets.active)),
      bus.on(Events.PET_EGG_FOUND, () => this.effects.floatText(this.player.x + 40, this.player.y - 120, '🥚 Yumurta bulundu!', '#ffe9a8', 20)),
      bus.on(Events.PET_LEVEL_UP, ({ pet, level }) => this.effects.floatText(this.pet.x, this.pet.y - 70, `${pet.name} Sv. ${level}!`, '#ffd23f', 16)),
      bus.on(Events.STAGE_CLEARED, (e) => this.onStageCleared(e)),
      bus.on(Events.STAGE_FAILED, (e) => this.onStageFailed(e)),
      bus.on(Events.STAGE_CHANGED, (e) => this.onStageChanged(e)),
      bus.on(Events.PRESTIGE_DONE, (e) => this.onRebirth(e)),
      bus.on(Events.LEVEL_UP, ({ level }) => this.onLevelUp(level)),
      bus.on(Events.ELITE_SPAWNED, (config) => this.effects.floatText(GAME_WIDTH - 110, 210, `⚠ ${config.name}`, '#ffd23f', 20)),
      bus.on(Events.SKILL_ACTIVATED, (e) => this.castSkill(e.skill, e.effect)),
      bus.on(Events.SKILL_ENDED, (e) => this.endSkill(e.skill)),
      bus.on(Events.BOSS_SPAWNED, (config) => {
        this.effects.banner(`BOSS: ${config.name}`, {
          subtitle: `${STAGE.BOSS_TIME_LIMIT} saniyede yen!`,
          color: '#ff5d73',
        });
        // Kısa kamera yaklaşması: boss gelişine vurgu
        const cam = this.cameras.main;
        const base = getRenderScale();
        cam.zoomTo(base * 1.06, 260, 'Sine.easeInOut');
        this.time.delayedCall(700, () => cam.zoomTo(base, 400, 'Sine.easeInOut'));
      }),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => subscriptions.forEach((off) => off()));
  }

  registerDevTools() {
    if (!import.meta.env.DEV) return;
    // G: altın hilesi, N: aşamayı atla, R: yetenek bekleme sürelerini sıfırla (sadece geliştirme modunda)
    this.input.keyboard.on('keydown-G', () => this.ctx.economy.addGold(Math.max(1000, this.ctx.state.gold), 'cheat'));
    this.input.keyboard.on('keydown-R', () => (this.ctx.state.skills.cooldowns = {}));
    // L: Destansı+ eşya düşür
    this.input.keyboard.on('keydown-L', () => {
      const { equipment, stages } = this.ctx;
      const item = equipment.generate(stages.stage, { minRarity: 3 });
      this.effects.lootDrop(this.player.x + 80, this.player.centerY, equipment.rarityOf(item).color, equipment.rarityIndex(item));
      equipment.addItem(item);
    });
    this.input.keyboard.on('keydown-N', () => {
      if (this.ctx.stages.busy) return;
      this.enemies.clear();
      this.ctx.stages.busy = true;
      this.ctx.stages.advance();
    });
  }

  update(time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const { state, economy, stages, upgrades, skills } = this.ctx;

    state.stats.playTime += dt;
    economy.update(dt);
    stages.update(dt);
    this.ctx.achievements.update(dt);
    this.ctx.quests.update(dt);

    const front = this.enemies.front;
    const engaged = !this.recovering && front && this.enemies.isInAttackRange(front);

    skills.setContext({
      hasTarget: !this.recovering && Boolean(front) && front.leftEdge < GAME_WIDTH - 20,
      hpRatio: this.player.hp / this.player.maxHp,
    });
    skills.update(dt);
    const stats = skills.applyTo(upgrades.stats);

    if (!this.recovering) this.player.heal(stats.hpRegen * dt);

    this.worldSpeed = approach(this.worldSpeed, engaged || this.recovering ? 0 : WORLD.RUN_SPEED * stats.runSpeedMultiplier, WORLD.SPEED_EASE, dt);
    if (this.worldSpeed < 1) this.worldSpeed = 0;
    this.player.setRunning(this.worldSpeed > 25 && !this.recovering);
    this.pet.setRunning(this.worldSpeed > 25 && !this.recovering);
    this.pet.update(time);

    this.background.update(dt, this.worldSpeed);
    this.enemies.update(dt, this.worldSpeed, time);

    // Oyuncu saldırısı: süre birikir, hedef menzildeyse vurur
    const interval = 1 / stats.attackSpeed;
    this.attackTimer = Math.min(this.attackTimer + dt, interval);
    if (engaged && this.attackTimer >= interval) {
      this.attackTimer = 0;
      this.player.playAttack();
      this.applyDamage(front, attackHit(stats), 'attack');
    }

    this.updateDots(dt);
    this.updateSummons(dt);
    this.updatePet(dt);

    // Düşman saldırısı: sadece oyuncuya temas eden öndeki düşman vurur (donmuşsa vuramaz)
    const attacker = this.enemies.front;
    const contact = attacker && !this.recovering && !attacker.frozen && this.enemies.isInContact(attacker);
    if (attacker?.mechanics && !this.recovering) this.updateBoss(attacker, dt, contact);
    if (contact && this.enemies.front === attacker && !attacker.dead) {
      attacker.attackTimer += dt;
      const mech = attacker.mechanics;
      if (attacker.attackTimer >= attacker.attackInterval * (mech?.attackIntervalMult ?? 1)) {
        attacker.attackTimer = 0;
        this.enemyAttack(attacker, mech?.damageMult ?? 1);
      }
    } else if (attacker) {
      attacker.attackTimer = 0;
    }

    this.emitHp();
    this.updateDanger(time, dt);
  }

  handleTap(pointer) {
    if (this.recovering) return;
    const target = this.enemies.front;
    if (!target || target.leftEdge > GAME_WIDTH) return;

    this.ctx.state.stats.taps++;
    this.effects.ripple(pointer.worldX, pointer.worldY);
    this.applyDamage(target, tapHit(this.ctx.upgrades.stats), 'tap');
  }

  applyDamage(enemy, hit, source) {
    const { settings } = this.ctx.state;
    // Boss kalkanı gelen hasarı azaltır
    const shieldMult = enemy.mechanics?.damageTakenMult ?? 1;
    if (shieldMult !== 1) hit = { ...hit, amount: hit.amount * shieldMult };
    if (source !== 'dot') this.effects.slash(enemy.x, enemy.centerY, hit.isCrit);
    this.ctx.bus.emit(Events.COMBAT_HIT, { isCrit: hit.isCrit, source });
    if (settings.damageNumbers) {
      const kind = hit.isCrit ? 'crit' : source === 'attack' ? 'normal' : source;
      this.effects.damageText(enemy.x, enemy.centerY - 20, hit.amount, kind);
    }
    if (hit.isCrit && settings.screenShake) this.cameras.main.shake(90, 0.004);

    const died = enemy.takeDamage(hit.amount);
    if (enemy.mechanics && !died) this.handleBossEvents(enemy, enemy.mechanics.onDamage(hit.amount, enemy.hp, enemy.maxHp));
    if (died) this.killEnemy(enemy);
  }

  /** Boss mekanik zamanlayıcıları (simülatörle aynı kurallar). */
  updateBoss(boss, dt, contact) {
    this.handleBossEvents(boss, boss.mechanics.update(dt, contact));
  }

  handleBossEvents(boss, events) {
    const { screenShake } = this.ctx.state.settings;
    // Art arda gelen uyarılar üst üste binmesin: kısa sürede ikincisi daha yukarıda
    const say = (text, color, size) => {
      const stacked = this.time.now - (boss.lastSayAt ?? -Infinity) < 1200;
      boss.lastSayAt = this.time.now;
      this.effects.floatText(boss.x, boss.y - boss.sprite.displayHeight - (stacked ? 82 : 50), text, color, size);
    };
    for (const ev of events) {
      if (ev.type === 'telegraph') {
        boss.showTelegraph(ev.duration);
        say('Yere vuracak! Saldır!', '#ff6b6b', 18);
      } else if (ev.type === 'slam') {
        boss.clearTelegraph();
        boss.playAttack();
        this.effects.burst(this.player.x + 20, this.player.y - 4, 0xb08a5a, 18);
        const ring = this.add.image(this.player.x + 20, this.player.y - 2, 'ring').setTint(0xff6b4d).setScale(0.3, 0.1).setDepth(9).setBlendMode('ADD');
        this.tweens.add({ targets: ring, scaleX: 2.6, scaleY: 0.6, alpha: 0, duration: 450, ease: 'Quad.out', onComplete: () => ring.destroy() });
        if (screenShake) this.cameras.main.shake(260, 0.014);
        this.enemyAttack(boss, boss.mechanics.damageMult * ev.mult);
      } else if (ev.type === 'interrupted') {
        boss.clearTelegraph();
        say('SERSEMLEDİ!', '#ffd23f', 22);
        this.tweens.add({ targets: boss.sprite, angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 3 });
      } else if (ev.type === 'shieldStart') {
        boss.setBossShield(true);
        say('KALKAN!', '#c9a7ff', 22);
      } else if (ev.type === 'shieldEnd') {
        boss.setBossShield(false);
      } else if (ev.type === 'enrage') {
        boss.setEnraged();
        say('ÖFKELENDİ!', '#ff4d4d', 24);
        if (screenShake) this.cameras.main.shake(200, 0.008);
      }
      this.ctx.bus.emit(Events.BOSS_MECHANIC, { type: ev.type });
    }
  }

  killEnemy(enemy) {
    const stats = this.ctx.skills.applyTo(this.ctx.upgrades.stats);
    this.enemies.remove(enemy);
    enemy.die();
    this.effects.burst(enemy.x, enemy.centerY, enemy.config.type.deathColor, enemy.config.isBoss ? 28 : 10);
    if (enemy.config.isBoss && this.ctx.state.settings.screenShake) this.cameras.main.shake(250, 0.01);
    this.coins.spawn(enemy.x, enemy.centerY, enemy.gold * stats.goldMultiplier);
    this.dropLoot(enemy);
    this.ctx.pets.onKill(enemy.config);
    this.ctx.stages.registerKill(enemy.config);
  }

  dropLoot(enemy) {
    const { equipment } = this.ctx;
    const item = equipment.rollDrop(enemy.config.stage, enemy.config);
    if (!item) return;
    // Eşya hemen eklenir; animasyon sadece görsel (sahne yeniden başlasa da kaybolmaz)
    const rarity = equipment.rarityOf(item);
    this.effects.lootDrop(enemy.x, enemy.centerY, rarity.color, equipment.rarityIndex(item));
    equipment.addItem(item);
  }

  enemyAttack(enemy, mult = 1) {
    enemy.playAttack();
    if (this.ctx.skills.modifiers.invulnerable) {
      this.effects.floatText(this.player.x, this.player.centerY - 40, 'Engellendi', '#9fd8ff', 16);
      this.ctx.bus.emit(Events.PLAYER_DAMAGED, { amount: 0, blocked: true });
      return;
    }
    // Kalkan/ekipmandan gelen hasar azaltma
    const damage = enemy.damage * mult * (1 - this.ctx.upgrades.stats.damageReduction);
    this.ctx.bus.emit(Events.PLAYER_DAMAGED, { amount: damage, blocked: false });
    const died = this.player.takeDamage(damage);
    if (this.ctx.state.settings.damageNumbers) {
      this.effects.damageText(this.player.x, this.player.centerY - 30, damage, 'player');
    }
    if (died) this.ctx.stages.fail('death');
  }

  /** effect: SkillSystem.effectFor çıktısı (yetenek seviyesiyle güçlenmiş) */
  castSkill(skill, effect = skill.effect) {
    const { color } = skill;
    const stats = this.ctx.upgrades.stats;
    const { screenShake } = this.ctx.state.settings;
    this.effects.floatText(this.player.x, this.player.y - 100, skill.name, toCssColor(color), 20);

    if (effect.type === 'aoe') {
      this.effects.whirlwind(this.player.x, this.player.centerY, color);
      if (screenShake) this.cameras.main.shake(200, 0.006);
      const targets = this.enemies.enemies.filter((e) => e.leftEdge < GAME_WIDTH);
      targets.forEach((enemy, i) => {
        this.time.delayedCall(i * 70, () => {
          if (!enemy.dead) this.applyDamage(enemy, rollHit(stats.damage * effect.damageMult, stats), 'skill');
        });
      });
    } else if (effect.type === 'strike') {
      const target = this.enemies.front;
      if (!target) return;
      this.effects.lightning(target.x, target.centerY, color);
      this.cameras.main.flash(120, 255, 250, 210);
      if (screenShake) this.cameras.main.shake(150, 0.008);
      this.applyDamage(target, rollHit(stats.damage * effect.damageMult, stats), 'skill');
    } else if (effect.type === 'dot') {
      const target = this.enemies.front;
      if (!target) return;
      this.effects.burst(target.x, target.centerY, color, 12);
      // Zehir: toplam hasar tik sayısına bölünür, her tikte ayrı kritik zarı
      target.addDot({ perTick: (stats.damage * effect.damageMult) / effect.ticks, ticks: effect.ticks, interval: effect.tickInterval, color });
    } else if (effect.type === 'freeze') {
      this.effects.frostNova(this.player.x + 120, this.player.centerY, color);
      if (screenShake) this.cameras.main.shake(160, 0.005);
      for (const enemy of this.enemies.enemies.filter((e) => e.leftEdge < GAME_WIDTH)) {
        enemy.freeze(effect.freezeTime);
        this.applyDamage(enemy, rollHit(stats.damage * effect.damageMult, stats), 'skill');
      }
    } else if (effect.type === 'buff') {
      if (effect.healRatio) this.player.heal(this.player.maxHp * effect.healRatio);
      if (effect.invulnerable) this.player.setShield(true);
      else if (effect.summonMult) this.player.setSpiritBlades(true, color);
      else this.player.setAura(skill.id, color, true);
    }
  }

  /** Ruh Kılıçları aktifken düzenli aralıkla öndeki düşmana vurur. */
  updateSummons(dt) {
    const { skills, upgrades } = this.ctx;
    if (!skills.activeRemaining('spiritBlades') || this.recovering) return;
    const effect = skills.effectFor('spiritBlades');
    this.summonTimer = (this.summonTimer ?? 0) + dt;
    if (this.summonTimer < effect.summonInterval) return;
    this.summonTimer = 0;
    const target = this.enemies.front;
    if (!target || target.leftEdge > GAME_WIDTH) return;
    const stats = upgrades.stats;
    this.effects.spiritStrike(this.player.x + 10, this.player.centerY - 20, target.x, target.centerY);
    this.applyDamage(target, rollHit(stats.damage * effect.summonMult, stats), 'summon');
  }

  /** Aktif yoldaş: saldırı (ısırma / ateş) ve iyileştirme zamanlayıcıları. Simülatörle aynı kural. */
  updatePet(dt) {
    const profile = this.ctx.pets.activeProfile;
    if (!profile || this.recovering) return;
    const stats = this.ctx.upgrades.stats;
    const { attack, heal, pet } = profile;
    if (attack) {
      this.petAttackTimer += dt;
      const target = this.enemies.front;
      if (this.petAttackTimer >= attack.interval && target && target.leftEdge < GAME_WIDTH) {
        this.petAttackTimer = 0;
        if (attack.aoe) {
          const targets = this.enemies.enemies.filter((e) => e.leftEdge < GAME_WIDTH);
          const { x, y } = this.pet.mouth;
          this.pet.pulse();
          this.effects.fireBreath(x, y, targets.map((e) => ({ x: e.x, y: e.centerY })), pet.color);
          // Vuruşlar ateş toplarının varışıyla aynı anda
          targets.forEach((enemy, i) =>
            this.time.delayedCall(260 + i * 60, () => {
              if (!enemy.dead) this.applyDamage(enemy, rollHit(stats.damage * attack.damageMult, stats), 'pet');
            }),
          );
        } else {
          this.pet.lunge(target.x - target.halfWidth, () => {
            if (!target.dead) this.applyDamage(target, rollHit(stats.damage * attack.damageMult, stats), 'pet');
          });
        }
      }
    }
    if (heal) {
      this.petHealTimer += dt;
      if (this.petHealTimer >= heal.interval) {
        this.petHealTimer = 0;
        const amount = this.player.maxHp * heal.ratio;
        if (this.player.hp < this.player.maxHp) {
          this.player.heal(amount);
          this.pet.pulse();
          this.effects.burst(this.player.x, this.player.centerY, pet.color, 8);
          if (this.ctx.state.settings.damageNumbers) this.effects.damageText(this.player.x, this.player.centerY - 40, amount, 'heal');
        }
      }
    }
  }

  /** Zehir gibi zamanla hasar etkileri. */
  updateDots(dt) {
    const stats = this.ctx.upgrades.stats;
    for (const enemy of [...this.enemies.enemies]) {
      for (const tick of enemy.tickDots(dt)) {
        if (enemy.dead) break;
        this.applyDamage(enemy, rollHit(tick.amount, stats), 'dot');
      }
    }
  }

  endSkill(skill) {
    if (skill.effect.invulnerable) this.player.setShield(false);
    else if (skill.effect.summonMult) this.player.setSpiritBlades(false);
    else this.player.setAura(skill.id, skill.color, false);
  }

  onStageCleared({ isBoss }) {
    if (isBoss) this.effects.banner('BOSS YENİLDİ!', { color: '#ffd23f' });
    this.time.delayedCall(STAGE.CLEAR_DELAY, () => this.ctx.stages.advance());
  }

  onStageFailed({ reason }) {
    this.recovering = true;
    this.enemies.clear();
    if (reason === 'death') this.player.playDeath();
    this.effects.banner(reason === 'timeout' ? 'Süre doldu!' : 'Yenildin!', {
      subtitle: 'Bir aşama geri çekilip güçleniyorsun…',
      color: '#ff6b6b',
    });

    this.time.delayedCall(STAGE.FAIL_DELAY, () => {
      this.player.refill();
      this.recovering = false;
      this.attackTimer = 0;
      this.ctx.stages.retreat();
    });
  }

  onStageChanged({ stage, zoneInfo }) {
    const subtitle = `Aşama ${stage} · ${zoneInfo.stageInZone}/${STAGE.STAGES_PER_ZONE}`;
    if (this.rebirthing || zoneInfo.zoneIndex === this.zoneIndex) return;

    this.zoneIndex = zoneInfo.zoneIndex;
    const cam = this.cameras.main;
    cam.fadeOut(250, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.background.setZone(this.zoneIndex);
      cam.fadeIn(350, 0, 0, 0);
      this.effects.banner(zoneInfo.label, { subtitle });
    });
  }

  updateDanger(time, dt) {
    const ratio = this.player.hp / this.player.maxHp;
    const target = ratio < 0.3 && !this.recovering ? 0.45 + 0.3 * Math.sin(time * 0.009) : 0;
    this.danger.alpha = approach(this.danger.alpha, target, 8, dt);
  }

  emitHp() {
    const hp = Math.ceil(this.player.hp);
    if (hp === this.lastHp && this.player.maxHp === this.lastMaxHp) return;
    this.lastHp = hp;
    this.lastMaxHp = this.player.maxHp;
    this.ctx.bus.emit(Events.PLAYER_HP_CHANGED, { hp: this.player.hp, maxHp: this.player.maxHp });
  }

  /** HUD'daki altın ikonunun DOM konumunu oyun koordinatına çevirir. */
  getCoinTargetPoint() {
    const target = this.ctx.getCoinTarget();
    const rect = this.game.canvas.getBoundingClientRect();
    if (!target || rect.width === 0) return { x: 40, y: 30 };
    return {
      x: ((target.x - rect.left) * GAME_WIDTH) / rect.width,
      y: ((target.y - rect.top) * GAME_HEIGHT) / rect.height,
    };
  }
}
