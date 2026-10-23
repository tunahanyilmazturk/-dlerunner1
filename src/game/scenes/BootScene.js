import Phaser from 'phaser';
import { Events } from '../../core/events.js';
import { createAnimations, generateTextures } from '../graphics/TextureFactory.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Gerçek sprite/ses dosyaları eklenince burada yükle (aynı anahtarla):
    // this.load.image('enemy_slime', 'assets/sprites/slime.png');
  }

  create() {
    generateTextures(this);
    createAnimations(this);

    // DOM arayüzü (karakter önizlemesi) oyun dokularını resim olarak kullanabilsin
    const ctx = this.registry.get('ctx');
    const cache = new Map();
    // Dokular yüksek çözünürlüklü üretilip karesi mantıksal boyuta ayarlandığı için (draw.js)
    // getBase64 sadece sol üst parçayı keserdi; kaynak tuvalin tamamı alınır.
    const toUrl = (key) => {
      if (!this.textures.exists(key)) return null;
      const source = this.textures.get(key).getSourceImage();
      return source instanceof HTMLCanvasElement ? source.toDataURL() : this.textures.getBase64(key);
    };
    ctx.textureUrl = (key) => {
      if (!cache.has(key)) cache.set(key, toUrl(key));
      return cache.get(key);
    };
    ctx.bus.emit(Events.TEXTURES_READY, {});

    this.scene.start('GameScene');
  }
}
