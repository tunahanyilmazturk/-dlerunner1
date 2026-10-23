import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, WORLD } from '../../config/balance.js';
import { ZONES } from '../../data/zones.js';
import { LAYER_SIZE } from '../graphics/worldTextures.js';
import { getWorldScale, isLowQuality } from '../renderScale.js';

// Kayan katmanlar (uzak → ön plan). factor: zemine göre kayma oranı.
// "fore" karakterlerin önünde, ekranın en altında kayar → derinlik hissi.
const LAYERS = [
  { name: 'far', y: WORLD.GROUND_Y - 270, factor: 0.12, depth: -80 },
  { name: 'mid', y: WORLD.GROUND_Y - 190, factor: 0.3, depth: -70 },
  { name: 'near', y: WORLD.GROUND_Y - 140, factor: 0.6, depth: -65 },
  { name: 'ground', y: WORLD.GROUND_Y - 8, factor: 1, depth: -60, height: GAME_HEIGHT - (WORLD.GROUND_Y - 8) },
  { name: 'fore', y: GAME_HEIGHT - LAYER_SIZE.fore[1], factor: 1.35, depth: 15 },
];

// Bölgeye özel gökyüzü ve ambiyans ayarları
const SCENERY = {
  forest: {
    celestial: { x: 760, y: 95, scale: 1 },
    clouds: { tint: 0xffffff, alpha: 0.85 },
    particles: [
      { texture: 'spark', depth: -55, x: { min: 0, max: GAME_WIDTH }, y: { min: 230, max: 430 }, lifespan: { min: 2500, max: 4500 }, speedX: { min: -30, max: 10 }, speedY: { min: -15, max: 15 }, scale: { start: 0.35, end: 0.05 }, alpha: { start: 1, end: 0 }, tint: 0xd8ff7a, frequency: 280, blendMode: 'ADD' },
      { texture: 'leaf', depth: 14, x: { min: 0, max: GAME_WIDTH + 100 }, y: -10, lifespan: 9000, speedX: { min: -90, max: -40 }, speedY: { min: 25, max: 55 }, rotate: { start: 0, end: 360 }, scale: { min: 0.7, max: 1.2 }, alpha: 0.9, tint: [0x7cc35a, 0xd9a35f, 0x9bd16b], frequency: 900 },
    ],
  },
  desert: {
    celestial: { x: 520, y: 115, scale: 1.35 },
    clouds: { tint: 0xffe2c0, alpha: 0.45 },
    particles: [
      { texture: 'spark', depth: -55, x: GAME_WIDTH + 10, y: { min: 300, max: 520 }, lifespan: 4500, speedX: { min: -260, max: -150 }, speedY: { min: -10, max: 10 }, scale: { min: 0.08, max: 0.22 }, alpha: { start: 0.6, end: 0 }, tint: 0xffe2b0, frequency: 45 },
    ],
  },
  ice: {
    celestial: { x: 790, y: 85, scale: 0.9 },
    stars: 0.8,
    aurora: true,
    clouds: { tint: 0xdde8ff, alpha: 0.4 },
    particles: [
      { texture: 'spark', depth: 14, x: { min: 0, max: GAME_WIDTH + 150 }, y: -10, lifespan: 9000, speedX: { min: -55, max: -15 }, speedY: { min: 25, max: 65 }, scale: { min: 0.15, max: 0.45 }, alpha: { start: 0.95, end: 0.6 }, frequency: 45 },
    ],
  },
  shadow: {
    celestial: { x: 220, y: 85, scale: 1.2 },
    stars: 1,
    clouds: { tint: 0x5a4a7a, alpha: 0.55 },
    particles: [
      { texture: 'spark', depth: -55, x: { min: 0, max: GAME_WIDTH }, y: { min: 250, max: 450 }, lifespan: { min: 3000, max: 5000 }, speedX: { min: -25, max: 5 }, speedY: { min: -20, max: 5 }, scale: { start: 0.3, end: 0.05 }, alpha: { start: 1, end: 0 }, tint: [0x7dff9a, 0xd06bff], frequency: 220, blendMode: 'ADD' },
      { texture: 'glow', depth: 14, x: { min: 0, max: GAME_WIDTH + 200 }, y: { min: 400, max: 520 }, lifespan: 8000, speedX: { min: -50, max: -20 }, scale: { min: 0.8, max: 1.6 }, alpha: { start: 0.12, end: 0 }, tint: 0x9a7aff, frequency: 500 },
    ],
  },
  sky: {
    celestial: { x: 820, y: 80, scale: 1.25 },
    clouds: { tint: 0xffffff, alpha: 1 },
    particles: [
      { texture: 'spark', depth: 14, x: GAME_WIDTH + 10, y: { min: 60, max: 420 }, lifespan: 3500, speedX: { min: -420, max: -260 }, speedY: { min: -6, max: 6 }, scale: { start: 0.6, end: 0.1 }, scaleY: 0.08, alpha: { start: 0.6, end: 0 }, tint: 0xffffff, frequency: 120 },
      { texture: 'leaf', depth: 14, x: { min: 0, max: GAME_WIDTH + 100 }, y: -10, lifespan: 8000, speedX: { min: -120, max: -60 }, speedY: { min: 20, max: 45 }, rotate: { start: 0, end: 360 }, scale: { min: 0.6, max: 1 }, alpha: 0.9, tint: [0xffb3d9, 0xffffff], frequency: 1100 },
    ],
  },
  lava: {
    celestial: { x: 700, y: 90, scale: 1.1 },
    stars: 0.5,
    clouds: { tint: 0x3a2a2a, alpha: 0.6 },
    particles: [
      { texture: 'spark', depth: 14, x: { min: 0, max: GAME_WIDTH }, y: GAME_HEIGHT + 10, lifespan: { min: 3000, max: 5000 }, speedX: { min: -40, max: 10 }, speedY: { min: -90, max: -35 }, scale: { start: 0.35, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xff7a2b, 0xffc14d, 0xff4a1f], frequency: 70, blendMode: 'ADD' },
    ],
  },
  crystal: {
    celestial: { x: 500, y: 110, scale: 1.15 },
    stars: 0.45,
    aurora: true,
    clouds: { tint: 0x2a2040, alpha: 0.5 },
    particles: [
      { texture: 'spark', depth: -55, x: { min: 0, max: GAME_WIDTH }, y: { min: 150, max: 430 }, lifespan: { min: 3000, max: 5000 }, speedX: { min: -20, max: 5 }, speedY: { min: -25, max: -5 }, scale: { start: 0.3, end: 0.05 }, alpha: { start: 1, end: 0 }, tint: [0x8fe8ff, 0xb06bff], frequency: 240, blendMode: 'ADD' },
      { texture: 'spark', depth: 14, x: { min: 0, max: GAME_WIDTH + 50 }, y: { min: 40, max: 140 }, lifespan: 6000, speedX: { min: -15, max: 5 }, speedY: { min: 15, max: 35 }, scale: { min: 0.1, max: 0.3 }, alpha: { start: 0.9, end: 0.2 }, tint: [0x8fe8ff, 0xd08fff], frequency: 90 },
    ],
  },
};

export class ParallaxBackground {
  constructor(scene, zoneIndex) {
    this.scene = scene;

    this.sky = scene.add.graphics().setDepth(-100);
    this.stars = scene.add.image(0, 0, 'stars').setOrigin(0).setDepth(-98);
    this.aurora = scene.add.image(0, 10, 'aurora').setOrigin(0).setDepth(-97).setBlendMode(Phaser.BlendModes.ADD);
    this.celestial = scene.add.image(0, 0, 'celestial_0').setDepth(-96);

    // Katman dokuları yüksek çözünürlükte (worldScale x); tileScale ile mantıksal boyuta küçültülür.
    // tilePosition doku pikseli cinsinden olduğu için kaydırma da worldScale ile çarpılır.
    this.worldScale = getWorldScale();
    const tiled = (y, height, key, depth) =>
      scene.add.tileSprite(0, y, GAME_WIDTH, height, key).setOrigin(0).setDepth(depth).setTileScale(1 / this.worldScale);

    this.clouds = tiled(30, 140, 'clouds', -90);
    this.layers = LAYERS.map((def) => {
      const height = def.height ?? LAYER_SIZE[def.name][1];
      return { ...def, sprite: tiled(def.y, height, `${def.name}_0`, def.depth) };
    });

    this.vignette = scene.add.image(0, 0, 'vignette').setOrigin(0).setDepth(36);
    this.emitters = [];
    this.setZone(zoneIndex);
  }

  setZone(zoneIndex) {
    const zone = ZONES[zoneIndex];
    const scenery = SCENERY[zone.id] ?? SCENERY.forest;

    const [top, bottom] = zone.sky;
    this.sky.clear();
    this.sky.fillGradientStyle(top, top, bottom, bottom, 1);
    this.sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.stars.setVisible(Boolean(scenery.stars)).setAlpha(scenery.stars ?? 0);
    this.aurora.setVisible(Boolean(scenery.aurora));
    this.auroraTween?.stop();
    if (scenery.aurora) {
      this.auroraTween = this.scene.tweens.add({ targets: this.aurora, alpha: { from: 0.35, to: 0.85 }, duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    const { x, y, scale } = scenery.celestial;
    this.celestial.setTexture(`celestial_${zoneIndex}`).setPosition(x, y).setScale(scale);
    this.clouds.setTint(scenery.clouds.tint).setAlpha(scenery.clouds.alpha);

    for (const layer of this.layers) layer.sprite.setTexture(`${layer.name}_${zoneIndex}`);

    this.emitters.forEach((emitter) => emitter.destroy());
    // Düşük kalitede ambiyans parçacıkları seyreltilir
    const density = isLowQuality() ? 2.5 : 1;
    this.emitters = scenery.particles.map(({ texture, depth, frequency, ...config }) =>
      this.scene.add.particles(0, 0, texture, { ...config, frequency: frequency * density }).setDepth(depth),
    );
  }

  update(dt, speed) {
    const s = this.worldScale;
    this.clouds.tilePositionX += (speed * 0.04 + 6) * dt * s;
    for (const layer of this.layers) layer.sprite.tilePositionX += speed * layer.factor * dt * s;
  }
}
