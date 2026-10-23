import { ENEMY_SPRITES } from '../../data/sprites.js';
import { createCharacterTextures } from './characterTextures.js';
import { createEnemyTextures } from './enemyTextures.js';
import { createFxTextures } from './fxTextures.js';
import { PET_SPRITES, createPetTextures } from './petTextures.js';
import { createWorldTextures } from './worldTextures.js';

// Tüm görseller kodla üretilir; böylece hiç asset dosyası olmadan oyun çalışır.
// Gerçek sprite'lara geçerken BootScene.preload içinde aynı anahtarlarla PNG yüklemen yeterli;
// draw.make() var olan dokuyu ezmez.
//
//   characterTextures → kahraman katmanları + nadirliğe göre ekipman
//   enemyTextures     → düşmanlar ve bosslar (data/sprites.js boyutlarında)
//   worldTextures     → bölge manzaraları, gökyüzü, kenar karartması
//   petTextures       → yoldaşlar (iki kareli)
//   fxTextures        → para, kesik, kıvılcım, ışıma, kalkan…
export function generateTextures(scene) {
  createFxTextures(scene);
  createCharacterTextures(scene);
  createEnemyTextures(scene);
  createPetTextures(scene);
  createWorldTextures(scene);
}

export function createAnimations(scene) {
  scene.anims.create({
    key: 'hero_run',
    frames: [{ key: 'hero_body_0' }, { key: 'hero_body_1' }],
    frameRate: 8,
    repeat: -1,
  });

  for (const [id, def] of Object.entries(PET_SPRITES)) {
    scene.anims.create({ key: `pet_${id}_move`, frames: [{ key: `pet_${id}_0` }, { key: `pet_${id}_1` }], frameRate: def.flying ? 10 : 8, repeat: -1 });
  }

  // İki kareli düşmanlar: `${doku}_walk`
  for (const [texture, def] of Object.entries(ENEMY_SPRITES)) {
    if (!def.frames) continue;
    scene.anims.create({
      key: `${texture}_walk`,
      frames: Array.from({ length: def.frames }, (_, i) => ({ key: `${texture}_${i}` })),
      frameRate: 6,
      repeat: -1,
    });
  }
}
