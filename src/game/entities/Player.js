import Phaser from 'phaser';
import { clamp } from '../../utils/math.js';
import { HERO_HAND, HERO_SIZE, heroLayers } from '../graphics/characterTextures.js';

const SWORD_REST_ANGLE = 50;
// Tuvaldeki el noktası → kap (ayak altı orta) koordinatı
const HAND = { x: HERO_HAND.x - HERO_SIZE.width / 2, y: HERO_HAND.y - HERO_SIZE.height };

// Katmanlar: gölge → [rig: pelerin, gövde, zırh, kolye, başlık, silah pivotu, yüzük ışığı] → kalkan
// "rig" koşarken yukarı-aşağı sallanır; silah pivotu el noktasında döner.
export class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);

    this.shadow = scene.add.image(0, 2, 'shadow');
    this.rig = scene.add.container(0, 0);

    const layer = () => scene.add.image(0, 0, 'hero_body_0').setOrigin(0.5, 1).setVisible(false);
    this.cape = layer().setTexture('hero_cape_default').setVisible(true);
    this.shieldGear = layer(); // kalkan arkadaki kolda, gövdenin arkasında
    this.body = scene.add.sprite(0, 0, 'hero_body_0').setOrigin(0.5, 1);
    this.boots = layer();
    this.armor = layer();
    this.belt = layer();
    this.gloves = layer();
    this.necklace = layer();
    this.earring = layer();
    this.helmet = layer();
    // Ayakkabılar gövdenin koşu karesini takip eder
    this.bootFrames = null;
    this.body.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_anim, frame) => this.syncBoots(frame.index - 1));

    this.weaponPivot = scene.add.container(HAND.x, HAND.y).setAngle(SWORD_REST_ANGLE);
    this.weaponGlow = scene.add.image(0, -20, 'glow').setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.weapon = scene.add.image(0, 0, 'hero_weapon_default');
    this.weaponPivot.add([this.weaponGlow, this.weapon]);

    this.ringGlow = scene.add.image(HAND.x, HAND.y, 'glow').setScale(0.22).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);

    this.rig.add([
      this.cape,
      this.shieldGear,
      this.body,
      this.boots,
      this.armor,
      this.belt,
      this.gloves,
      this.necklace,
      this.earring,
      this.helmet,
      this.weaponPivot,
      this.ringGlow,
    ]);

    this.shield = scene.add.image(0, -36, 'bubble').setVisible(false);
    this.add([this.shadow, this.rig, this.shield]);
    this.auras = new Map();

    this.maxHp = 1;
    this.hp = 1;
    this.running = false;
    this.swingTween = null;
    this.sparkleTimer = null;
    this.bladeLength = 30;

    this.bobTween = scene.tweens.add({
      targets: this.rig,
      y: -3,
      duration: 125,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.setDepth(10);
    scene.add.existing(this);
    this.setRunning(true);
    this.setEquipment({});
  }

  syncBoots(phase) {
    if (this.bootFrames) this.boots.setTexture(this.bootFrames[phase] ?? this.bootFrames[0]);
  }

  get alive() {
    return this.hp > 0;
  }

  get centerY() {
    return this.y - 36;
  }

  /** EquipmentSystem.appearance → görünüm. Kuşanma değişince çağrılır. */
  setEquipment(appearance) {
    const layers = heroLayers(appearance);
    const show = (image, keyName) => {
      image.setVisible(Boolean(keyName));
      if (keyName) image.setTexture(keyName);
    };
    this.cape.setTexture(layers.cape);
    show(this.shieldGear, layers.shield);
    show(this.armor, layers.armor);
    show(this.belt, layers.belt);
    show(this.gloves, layers.gloves);
    show(this.necklace, layers.necklace);
    show(this.earring, layers.earring);
    show(this.helmet, layers.helmet);
    this.bootFrames = layers.boots;
    show(this.boots, layers.boots?.[0]);
    this.syncBoots(this.body.anims.currentFrame ? this.body.anims.currentFrame.index - 1 : 0);

    const { weapon } = layers;
    this.weapon.setTexture(weapon.key).setOrigin(0.5, weapon.spec.grip / weapon.spec.height);
    this.bladeLength = weapon.spec.grip;
    this.weaponGlow.setVisible(Boolean(weapon.glow)).setPosition(0, -weapon.spec.grip * 0.6);
    if (weapon.glow) this.weaponGlow.setTint(weapon.glow.color).setAlpha(weapon.glow.alpha).setScale(0.35, weapon.spec.grip / 80);

    this.ringGlow.setVisible(Boolean(layers.ringGlow));
    if (layers.ringGlow) this.ringGlow.setTint(layers.ringGlow);

    this.setSparkle(weapon.sparkle);
  }

  /** Efsanevi silah: uçtan sürekli kıvılcım saçar. */
  setSparkle(color) {
    this.sparkleTimer?.remove();
    this.sparkleTimer = null;
    if (!color) return;
    this.sparkleTimer = this.scene.time.addEvent({
      delay: 140,
      loop: true,
      callback: () => {
        if (!this.visible || !this.alive) return;
        const tip = this.weaponPivot.getWorldTransformMatrix().transformPoint(0, -this.bladeLength + Math.random() * 20);
        const spark = this.scene.add
          .image(tip.x, tip.y, 'spark')
          .setTint(color)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.3 + Math.random() * 0.3)
          .setDepth(11);
        this.scene.tweens.add({
          targets: spark,
          y: tip.y - 12 - Math.random() * 10,
          x: tip.x + 6 - Math.random() * 18,
          alpha: 0,
          scale: 0.05,
          duration: 500,
          onComplete: () => spark.destroy(),
        });
      },
    });
  }

  setRunning(running) {
    if (running === this.running) return;
    this.running = running;
    if (running) {
      this.body.play('hero_run');
      this.bobTween.resume();
    } else {
      this.body.anims.stop();
      this.body.setTexture('hero_body_0');
      this.syncBoots(0);
      this.bobTween.pause();
      this.rig.y = 0;
    }
  }

  setMaxHp(maxHp, { refill = false } = {}) {
    const gained = Math.max(0, maxHp - this.maxHp);
    this.maxHp = maxHp;
    this.hp = refill ? maxHp : clamp(this.hp + gained, 0, maxHp);
  }

  heal(amount) {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  refill() {
    this.hp = this.maxHp;
    this.rig.setAlpha(1);
  }

  /** @returns {boolean} öldü mü */
  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    // Yumuşak kırmızı flaş (tam siluet yerine renklendirme) + küçük geri tepme
    const flashed = [this.body, this.boots, this.armor, this.belt, this.gloves, this.helmet, this.cape, this.shieldGear];
    flashed.forEach((image) => image.setTint(0xff7a7a));
    this.scene.time.delayedCall(110, () => flashed.forEach((image) => image.clearTint()));
    this.scene.tweens.add({ targets: this.rig, x: -4, duration: 60, yoyo: true, ease: 'Quad.out' });
    return this.hp <= 0;
  }

  playAttack() {
    this.swingTween?.stop();
    this.weaponPivot.setAngle(-50);
    this.swingTween = this.scene.tweens.chain({
      targets: this.weaponPivot,
      tweens: [
        { angle: 135, duration: 90, ease: 'Quad.out' },
        { angle: SWORD_REST_ANGLE, duration: 160, ease: 'Sine.inOut' },
      ],
    });
    // Vuruşla birlikte gövde hafifçe öne atılır
    this.lungeTween?.stop();
    this.rig.x = 0;
    this.lungeTween = this.scene.tweens.add({ targets: this.rig, x: 5, duration: 70, yoyo: true, ease: 'Quad.out' });
  }

  playDeath() {
    this.setRunning(false);
    this.scene.tweens.add({
      targets: this.rig,
      alpha: 0.25,
      duration: 120,
      yoyo: true,
      repeat: 3,
    });
  }

  /** Ruh Kılıçları: karakterin etrafında dönen 3 hayalet bıçak. */
  setSpiritBlades(on, color = 0xc9a7ff) {
    this.spiritTween?.stop();
    this.spirits?.destroy();
    this.spirits = null;
    if (!on) return;
    this.spirits = this.scene.add.container(0, -36);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const blade = this.scene.add
        .image(Math.cos(angle) * 34, Math.sin(angle) * 14, 'hero_weapon_default')
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.85)
        .setScale(0.7)
        .setAngle(90);
      this.spirits.add(blade);
    }
    this.add(this.spirits);
    // Kabın açısı döndükçe bıçaklar yörüngede gezer
    this.spiritTween = this.scene.tweens.add({ targets: this.spirits, angle: 360, duration: 1400, repeat: -1 });
  }

  setShield(on) {
    this.shieldTween?.stop();
    this.shield.setVisible(on).setScale(1).setAlpha(1);
    if (on) {
      this.shieldTween = this.scene.tweens.add({
        targets: this.shield,
        scale: 1.08,
        alpha: 0.75,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  /** Süreli buff'lar için karakterin arkasında renkli ışıma. */
  setAura(id, color, on) {
    const existing = this.auras.get(id);
    if (!on) {
      existing?.tween.stop();
      existing?.image.destroy();
      this.auras.delete(id);
      return;
    }
    if (existing) return;
    const image = this.scene.add
      .image(0, -34, 'glow')
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.1 + this.auras.size * 0.25);
    this.addAt(image, 1);
    const tween = this.scene.tweens.add({
      targets: image,
      alpha: { from: 1, to: 0.5 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });
    this.auras.set(id, { image, tween });
  }

  preDestroy() {
    this.sparkleTimer?.remove();
    super.preDestroy();
  }
}
