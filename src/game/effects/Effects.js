import { GAME_WIDTH, WORLD } from '../../config/balance.js';
import { formatNumber } from '../../utils/format.js';
import { randRange } from '../../utils/math.js';
import { getRenderScale } from '../renderScale.js';

const FONT = '"Fredoka", "Trebuchet MS", sans-serif';
const TITLE_FONT = '"Cinzel", Georgia, serif';

const DAMAGE_STYLES = {
  normal: { color: '#ffffff', size: 20 },
  crit: { color: '#ffd23f', size: 28 },
  tap: { color: '#7fe7ff', size: 20 },
  player: { color: '#ff6b6b', size: 18 },
  skill: { color: '#c9a7ff', size: 26 },
  dot: { color: '#9dff7a', size: 16 },
  summon: { color: '#d9c2ff', size: 17 },
  pet: { color: '#ffb36b', size: 17 },
  heal: { color: '#7dff9a', size: 17 },
};

const MAX_POOLED_TEXTS = 40;

/** Tüm oyun yazıları için ortak stil: render ölçeğinde çizilir → büyük ekranda keskin. */
export function textStyle(size, color, stroke = 5) {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: '700',
    color,
    stroke: '#1a1020',
    strokeThickness: stroke,
    resolution: getRenderScale(),
  };
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.textPool = []; // tekrar kullanılabilir uçan yazılar (her vuruşta yeni Text üretmemek için)
  }

  /** Havuzdan bir yazı alır (yoksa üretir) ve stilini ayarlar. */
  takeText(x, y, label, size, color, depth) {
    const text = this.textPool.pop() ?? this.scene.add.text(0, 0, '', textStyle(size, color)).setOrigin(0.5);
    text.setStyle(textStyle(size, color)).setText(label).setPosition(x, y).setDepth(depth).setAlpha(1).setScale(1).setVisible(true).setActive(true);
    return text;
  }

  releaseText(text) {
    text.setVisible(false).setActive(false);
    if (this.textPool.length < MAX_POOLED_TEXTS) this.textPool.push(text);
    else text.destroy();
  }

  slash(x, y, isCrit) {
    const slash = this.scene.add
      .image(x, y, 'slash')
      .setDepth(20)
      .setAngle(randRange(-30, 30))
      .setScale(0.6)
      .setTint(isCrit ? 0xffd23f : 0xffffff);
    this.scene.tweens.add({
      targets: slash,
      scale: isCrit ? 1.4 : 1.05,
      alpha: 0,
      duration: 180,
      ease: 'Quad.out',
      onComplete: () => slash.destroy(),
    });
  }

  ripple(x, y) {
    const ring = this.scene.add.image(x, y, 'ring').setDepth(21).setScale(0.2).setTint(0x7fe7ff);
    this.scene.tweens.add({
      targets: ring,
      scale: 0.9,
      alpha: 0,
      duration: 260,
      onComplete: () => ring.destroy(),
    });
  }

  damageText(x, y, amount, kind = 'normal') {
    const style = DAMAGE_STYLES[kind];
    const label = formatNumber(amount) + (kind === 'crit' ? '!' : '');
    const startX = x + randRange(-12, 12);
    const text = this.takeText(startX, y, label, style.size, style.color, 30);
    // Kritik: büyük patlayıp küçülür; normal: hafif yay çizerek yükselir
    const big = kind === 'crit' || kind === 'skill';
    this.scene.tweens.add({
      targets: text,
      y: y - 46,
      x: startX + randRange(-14, 14),
      alpha: { from: 1, to: 0 },
      scale: { from: big ? 1.5 : 1, to: 0.9 },
      duration: big ? 900 : 750,
      ease: 'Cubic.out',
      onComplete: () => this.releaseText(text),
    });
  }

  /** Sayı olmayan kısa yazılar (yetenek adı, "Engellendi" vb.) */
  floatText(x, y, label, color = '#ffffff', size = 18) {
    const text = this.takeText(x, y, label, size, color, 31);
    this.scene.tweens.add({
      targets: text,
      y: y - 36,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Cubic.out',
      onComplete: () => this.releaseText(text),
    });
  }

  /** Buz Dalgası: yerde yayılan buz halkası ve kristal parçaları */
  frostNova(x, y, color) {
    for (let i = 0; i < 2; i++) {
      const ring = this.scene.add.image(x, y, 'ring').setDepth(19).setTint(color).setBlendMode('ADD').setScale(0.4, 0.15);
      this.scene.tweens.add({ targets: ring, scaleX: 9 + i * 3, scaleY: 3, alpha: 0, delay: i * 120, duration: 600, ease: 'Quad.out', onComplete: () => ring.destroy() });
    }
    this.burst(x, y, 0xe8fbff, 24);
  }

  /** Ruh Kılıcı: oyuncudan hedefe uçan hayalet bıçak */
  /** Ejder Yavrusu: hedeflere uçan ateş topları. */
  fireBreath(fromX, fromY, targets, color = 0xff7a3d) {
    targets.forEach(({ x, y }, i) => {
      for (let k = 0; k < 3; k++) {
        const flame = this.scene.add
          .image(fromX, fromY, 'spark')
          .setDepth(21)
          .setTint(k === 0 ? 0xfff1a0 : color)
          .setBlendMode('ADD')
          .setScale(0.9 - k * 0.2);
        this.scene.tweens.add({
          targets: flame,
          x: x + randRange(-8, 8),
          y: y + randRange(-10, 10),
          scale: 0.2,
          delay: i * 60 + k * 35,
          duration: 260,
          ease: 'Quad.in',
          onComplete: () => {
            flame.destroy();
            if (k === 0) this.burst(x, y, color, 6);
          },
        });
      }
    });
  }

  spiritStrike(fromX, fromY, toX, toY) {
    const blade = this.scene.add.image(fromX, fromY, 'spark').setDepth(21).setTint(0xc9a7ff).setBlendMode('ADD').setScale(1.2, 0.35);
    blade.rotation = Math.atan2(toY - fromY, toX - fromX);
    this.scene.tweens.add({ targets: blade, x: toX, y: toY, duration: 140, ease: 'Quad.in', onComplete: () => blade.destroy() });
  }

  /** Kılıç Fırtınası: oyuncunun etrafında dönen kesikler + ekrana yayılan halka */
  whirlwind(x, y, color) {
    for (let i = 0; i < 3; i++) {
      const slash = this.scene.add
        .image(x, y, 'slash')
        .setDepth(20)
        .setTint(color)
        .setBlendMode('ADD')
        .setAngle(i * 120)
        .setScale(0.8 + i * 0.25);
      this.scene.tweens.add({
        targets: slash,
        angle: slash.angle + 540,
        scale: slash.scale * 1.6,
        alpha: 0,
        duration: 450,
        ease: 'Quad.out',
        onComplete: () => slash.destroy(),
      });
    }
    const ring = this.scene.add.image(x, y, 'ring').setDepth(19).setTint(color).setScale(0.5);
    this.scene.tweens.add({
      targets: ring,
      scale: 14,
      alpha: 0,
      duration: 500,
      ease: 'Quad.out',
      onComplete: () => ring.destroy(),
    });
  }

  /** Yukarıdan hedefe zikzak yıldırım çizer. */
  lightning(x, y, color) {
    const g = this.scene.add.graphics().setDepth(22).setBlendMode('ADD');
    const points = [{ x: x + randRange(-40, 40), y: 0 }];
    const steps = 8;
    for (let i = 1; i < steps; i++) {
      points.push({ x: x + randRange(-22, 22), y: (y * i) / steps });
    }
    points.push({ x, y });

    g.lineStyle(10, color, 0.35);
    g.strokePoints(points);
    g.lineStyle(4, 0xffffff, 1);
    g.strokePoints(points);

    const flash = this.scene.add.image(x, y, 'glow').setDepth(21).setTint(color).setBlendMode('ADD').setScale(2);
    this.scene.tweens.add({
      targets: [g, flash],
      alpha: 0,
      duration: 260,
      ease: 'Quad.in',
      onComplete: () => {
        g.destroy();
        flash.destroy();
      },
    });
  }

  /** Eşya düşüşü: zıplayan mücevher, Nadir ve üstünde ışık sütunu, sonra çantaya uçar. */
  lootDrop(x, y, color, rarityIndex) {
    const scene = this.scene;
    const landX = x + randRange(10, 50);
    const landY = WORLD.GROUND_Y - 14;
    const loot = scene.add.image(x, y, 'loot').setTint(color).setDepth(26);
    const glow = scene.add.image(x, y, 'glow').setTint(color).setBlendMode('ADD').setDepth(25).setScale(0.6);

    let beam = null;
    if (rarityIndex >= 2) {
      beam = scene.add.image(landX, WORLD.GROUND_Y, 'beam').setOrigin(0.5, 1).setTint(color).setBlendMode('ADD').setDepth(18).setAlpha(0);
      scene.tweens.chain({
        targets: beam,
        tweens: [
          { alpha: 0.85, scaleX: 1.4, duration: 180, delay: 600 },
          { alpha: 0, duration: 300, delay: 650 },
        ],
      });
    }

    // Işıma mücevheri takip eder
    scene.tweens.add({
      targets: glow,
      scale: rarityIndex >= 3 ? 1.1 : 0.7,
      duration: 1900,
      onUpdate: () => glow.setPosition(loot.x, loot.y),
    });

    scene.tweens.chain({
      targets: loot,
      tweens: [
        { x: (x + landX) / 2, y: y - 80, angle: 180, duration: 260, ease: 'Quad.out' },
        { x: landX, y: landY, angle: 360, duration: 380, ease: 'Bounce.out' },
        { y: landY - 6, duration: 300, yoyo: true, repeat: 1, ease: 'Sine.inOut' },
        { x: GAME_WIDTH - 24, y: 40, scale: 0.4, alpha: 0.3, duration: 480, ease: 'Cubic.in' },
      ],
      onComplete: () => {
        loot.destroy();
        glow.destroy();
        beam?.destroy();
      },
    });
  }

  burst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const spark = this.scene.add.image(x, y, 'spark').setDepth(19).setTint(color).setScale(randRange(0.4, 1));
      const angle = randRange(0, Math.PI * 2);
      const dist = randRange(25, 70);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 10,
        alpha: 0,
        scale: 0.1,
        duration: randRange(300, 520),
        ease: 'Quad.out',
        onComplete: () => spark.destroy(),
      });
    }
  }

  banner(title, { subtitle = '', color = '#ffffff', duration = 1400 } = {}) {
    this.activeBanner?.destroy();
    const container = this.scene.add.container(GAME_WIDTH / 2, 150).setDepth(40);
    // Başlık Metin2 havası için Cinzel (arayüz pencereleriyle aynı yazı tipi)
    const main = this.scene.add
      .text(0, 0, title, {
        ...textStyle(40, color, 8),
        fontFamily: TITLE_FONT,
        shadow: { offsetX: 0, offsetY: 3, color: '#000', blur: 6, fill: true, stroke: true },
      })
      .setOrigin(0.5);
    container.add(main);
    if (subtitle) {
      const sub = this.scene.add.text(0, 38, subtitle, { ...textStyle(19, '#f3e9d2'), fontStyle: '600' }).setOrigin(0.5);
      container.add(sub);
    }

    this.activeBanner = container;
    container.setScale(0.6).setAlpha(0);
    this.scene.tweens.chain({
      targets: container,
      tweens: [
        { scale: 1, alpha: 1, duration: 220, ease: 'Back.out' },
        { alpha: 0, y: 130, duration: 300, delay: duration, ease: 'Quad.in' },
      ],
      onComplete: () => {
        container.destroy();
        if (this.activeBanner === container) this.activeBanner = null;
      },
    });
  }
}
