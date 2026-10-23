import Phaser from 'phaser';
import { ELITE, WORLD } from '../../config/balance.js';
import { ENEMY_SPRITES, firstFrame } from '../../data/sprites.js';
import { BossMechanics } from '../../systems/BossMechanics.js';

export class Enemy extends Phaser.GameObjects.Container {
  /** @param config StageSystem.buildEnemyConfig çıktısı */
  constructor(scene, x, config) {
    super(scene, x, WORLD.GROUND_Y);
    const { type } = config;

    this.config = config;
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.damage = config.damage;
    this.gold = config.gold;
    this.speed = config.speed;
    this.attackInterval = config.attackInterval;
    this.attackTimer = 0;
    this.dead = false;
    this.phase = Math.random() * Math.PI * 2;

    const scale = type.scale * (config.isBoss && type.scale === 1 ? 1.15 : 1) * (config.isElite ? ELITE.SCALE : 1);
    this.sprite = scene.add.sprite(0, 0, firstFrame(type.texture)).setOrigin(0.5, 1).setScale(scale);
    if (type.tint) this.sprite.setTint(type.tint);
    if (ENEMY_SPRITES[type.texture]?.frames) {
      // Hızlı düşmanlar daha hızlı adım atar; kareler rastgele fazdan başlar
      this.sprite.play({ key: `${type.texture}_walk`, frameRate: Phaser.Math.Clamp(type.speed / 8, 4, 12), startFrame: Math.round(Math.random()) });
    }

    this.flying = type.motion === 'fly';
    this.baseY = this.flying ? WORLD.GROUND_Y - type.flyHeight : WORLD.GROUND_Y;
    this.y = this.baseY;

    this.shadow = scene.add.image(0, WORLD.GROUND_Y - this.baseY + 2, 'shadow');
    this.shadow.setScale((this.sprite.displayWidth / 60) * 0.9, 1);

    this.halfWidth = this.sprite.displayWidth * 0.42;
    this.barWidth = Math.max(40, this.sprite.displayWidth * 0.8);
    this.barHeight = config.isBoss ? 9 : 6;
    this.hpBar = scene.add.graphics();
    this.hpBar.y = -this.sprite.displayHeight - 12;

    this.add([this.shadow, this.sprite, this.hpBar]);

    if (config.isElite) {
      // Elit: arkada altın ışıma + nabız
      this.aura = scene.add
        .image(0, -this.sprite.displayHeight / 2, 'glow')
        .setTint(0xffd23f)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale((this.sprite.displayWidth / 100) * 1.6);
      this.addAt(this.aura, 1);
      this.auraTween = scene.tweens.add({ targets: this.aura, alpha: { from: 0.9, to: 0.4 }, duration: 450, yoyo: true, repeat: -1 });
      this.crown = scene.add.image(-this.barWidth / 2 - 10, this.hpBar.y + this.barHeight / 2, 'elite_crown');
      this.add(this.crown);
    }

    // Boss mekanikleri (kural BossMechanics'te; burada sadece görünüm)
    this.mechanics = config.mechanics?.length ? new BossMechanics(config.mechanics) : null;
    if (this.mechanics) {
      this.warning = scene.add
        .text(0, this.hpBar.y - 26, '!', { fontFamily: 'Cinzel, serif', fontSize: '34px', fontStyle: 'bold', color: '#ff4d4d', stroke: '#2a0000', strokeThickness: 6, resolution: scene.cameras.main.zoom })
        .setOrigin(0.5)
        .setVisible(false);
      this.bossShield = scene.add
        .image(0, -this.sprite.displayHeight / 2, 'bubble')
        .setTint(0xc9a7ff)
        .setScale((this.sprite.displayWidth / 70) * 1.2)
        .setAlpha(0.8)
        .setVisible(false);
      this.add([this.bossShield, this.warning]);
    }

    this.drawHpBar();
    this.startMotion(type.motion);

    this.setDepth(config.isBoss ? 8 : 9);
    scene.add.existing(this);
  }

  get leftEdge() {
    return this.x - this.halfWidth;
  }

  get rightEdge() {
    return this.x + this.halfWidth;
  }

  get centerY() {
    return this.y - this.sprite.displayHeight / 2;
  }

  startMotion(motion) {
    const tweens = this.scene.tweens;
    if (motion === 'squish') {
      this.motionTween = tweens.add({
        targets: this.sprite,
        scaleY: this.sprite.scaleY * 0.82,
        scaleX: this.sprite.scaleX * 1.1,
        duration: 260,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    } else if (motion === 'fly') {
      // Kanat çırpma animasyonla; burada hafif öne-arkaya yatma
      this.motionTween = tweens.add({
        targets: this.sprite,
        angle: { from: -6, to: 6 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    } else if (motion === 'hop') {
      this.motionTween = tweens.chain({
        targets: this.sprite,
        loop: -1,
        tweens: [
          { scaleY: this.sprite.scaleY * 0.8, scaleX: this.sprite.scaleX * 1.12, duration: 120, ease: 'Quad.out' },
          { y: -18, scaleY: this.sprite.scaleY * 1.08, scaleX: this.sprite.scaleX * 0.94, duration: 220, ease: 'Quad.out' },
          { y: 0, scaleY: this.sprite.scaleY, scaleX: this.sprite.scaleX, duration: 200, ease: 'Quad.in' },
        ],
      });
    } else {
      this.motionTween = tweens.add({
        targets: this.sprite,
        angle: { from: -4, to: 4 },
        duration: 220,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  /** Can barı: koyu çerçeve, geriden süzülen beyaz "hasar izi" ve üstte parlak şerit. */
  drawHpBar() {
    const g = this.hpBar;
    const w = this.barWidth;
    const h = this.barHeight;
    const ratio = Math.max(0, this.hp / this.maxHp);
    const trail = Math.max(ratio, this.trailRatio ?? 1);
    const color = this.config.isBoss ? 0xff4d6d : this.config.isElite ? 0xffc83d : 0xe74c3c;
    g.clear();
    g.fillStyle(0x120c08, 0.85);
    g.fillRoundedRect(-w / 2 - 2, -2, w + 4, h + 4, 3);
    if (trail > ratio) {
      g.fillStyle(0xfff2d6, 0.85);
      g.fillRect(-w / 2 + w * ratio, 0, w * (trail - ratio), h);
    }
    if (ratio > 0) {
      g.fillStyle(color);
      g.fillRoundedRect(-w / 2, 0, w * ratio, h, 2);
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(-w / 2 + 1, 1, Math.max(0, w * ratio - 2), Math.max(1, h * 0.3));
    }
  }

  /** Hasar izi kısa bir beklemeden sonra gerçek cana doğru akar. */
  animateTrail() {
    this.trailTween?.stop();
    this.trailTween = this.scene.tweens.add({
      targets: this,
      trailRatio: Math.max(0, this.hp / this.maxHp),
      delay: 180,
      duration: 380,
      ease: 'Quad.in',
      onUpdate: () => this.drawHpBar(),
    });
  }

  /** @returns {boolean} öldü mü */
  takeDamage(amount) {
    if (this.dead) return false;
    this.trailRatio = Math.max(this.trailRatio ?? 1, this.hp / this.maxHp);
    this.hp -= amount;
    this.drawHpBar();
    this.animateTrail();
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.sprite.active) this.restoreTint();
    });
    return this.hp <= 0;
  }

  // ------------------------------------------------------------ Durum etkileri

  /** Zamanla hasar (zehir). perTick: tik başı hasar, interval: tikler arası sn. */
  addDot({ perTick, ticks, interval, color }) {
    this.dots = this.dots ?? [];
    this.dots.push({ perTick, ticks, interval, timer: 0 });
    this.sprite.setTint(color);
    this.dotTint = color;
  }

  /** Sahne her kare çağırır; bu karede düşen tikleri döndürür. */
  tickDots(dt) {
    if (!this.dots?.length) return [];
    const ticks = [];
    for (const dot of this.dots) {
      dot.timer += dt;
      while (dot.timer >= dot.interval && dot.ticks > 0) {
        dot.timer -= dot.interval;
        dot.ticks--;
        ticks.push({ amount: dot.perTick });
      }
    }
    this.dots = this.dots.filter((d) => d.ticks > 0);
    if (!this.dots.length) this.restoreTint();
    return ticks;
  }

  get frozen() {
    return this.frozenTime > 0;
  }

  freeze(seconds) {
    this.frozenTime = Math.max(this.frozenTime ?? 0, seconds);
    this.motionTween?.pause();
    this.sprite.anims?.pause();
    this.sprite.setTint(0x9fe6ff);
  }

  /** Yere vurma uyarısı: kırmızı "!" ve çömelme. */
  showTelegraph(duration) {
    this.warning.setVisible(true).setScale(0.4);
    this.scene.tweens.add({ targets: this.warning, scale: 1, duration: 200, ease: 'Back.out' });
    this.warningTween = this.scene.tweens.add({ targets: this.warning, alpha: { from: 1, to: 0.35 }, duration: 160, yoyo: true, repeat: -1 });
    this.restScaleY = this.sprite.scaleY;
    this.telegraphTween = this.scene.tweens.add({ targets: this.sprite, scaleY: this.sprite.scaleY * 0.88, duration: duration * 1000, ease: 'Quad.in' });
    this.sprite.setTint(0xff9a9a);
  }

  clearTelegraph() {
    this.warningTween?.stop();
    this.warning?.setVisible(false).setAlpha(1);
    if (this.telegraphTween) {
      this.telegraphTween.stop();
      this.telegraphTween = null;
      this.sprite.scaleY = this.restScaleY;
    }
    this.restoreTint();
  }

  setBossShield(on) {
    this.shieldTween?.stop();
    this.bossShield.setVisible(on).setAlpha(0.8);
    if (on) this.shieldTween = this.scene.tweens.add({ targets: this.bossShield, alpha: 0.45, duration: 300, yoyo: true, repeat: -1 });
  }

  setEnraged() {
    if (!this.aura) {
      this.aura = this.scene.add
        .image(0, -this.sprite.displayHeight / 2, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale((this.sprite.displayWidth / 100) * 1.8);
      this.addAt(this.aura, 1);
    }
    this.aura.setTint(0xff2a2a);
    this.auraTween?.stop();
    this.auraTween = this.scene.tweens.add({ targets: this.aura, alpha: { from: 1, to: 0.5 }, duration: 220, yoyo: true, repeat: -1 });
    if (this.motionTween) this.motionTween.timeScale = 1.6;
    this.restoreTint();
  }

  restoreTint() {
    if (this.frozen) return this.sprite.setTint(0x9fe6ff);
    if (this.mechanics?.telegraphing) return this.sprite.setTint(0xff9a9a);
    if (this.mechanics?.enraged) return this.sprite.setTint(0xffb0a0);
    if (this.dots?.length) return this.sprite.setTint(this.dotTint);
    if (this.config.type.tint) this.sprite.setTint(this.config.type.tint);
    else this.sprite.clearTint();
  }

  playAttack() {
    this.scene.tweens.add({
      targets: this.sprite,
      x: -12,
      duration: 80,
      yoyo: true,
      ease: 'Quad.out',
    });
  }

  update(dt, time) {
    if (this.frozenTime > 0) {
      this.frozenTime -= dt;
      if (this.frozenTime <= 0) {
        this.motionTween?.resume();
        this.sprite.anims?.resume();
        this.restoreTint();
      }
      return;
    }
    if (this.flying) this.y = this.baseY + Math.sin(time * 0.004 + this.phase) * 8;
  }

  die() {
    this.dead = true;
    this.motionTween?.stop();
    this.auraTween?.stop();
    this.trailTween?.stop();
    this.warningTween?.stop();
    this.shieldTween?.stop();
    this.warning?.setVisible(false);
    this.bossShield?.setVisible(false);
    this.sprite.anims?.stop();
    this.hpBar.setVisible(false);
    this.crown?.setVisible(false);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y - 18,
      angle: 25,
      duration: 320,
      ease: 'Quad.out',
      onComplete: () => this.destroy(),
    });
  }
}
