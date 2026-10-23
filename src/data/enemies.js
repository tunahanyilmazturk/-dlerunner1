// Düşman tipleri. Çarpanlar ENEMY_SCALING taban değerleriyle çarpılır.
//  - texture: data/sprites.js'teki doku anahtarı (çizimi game/graphics/enemyTextures.js)
//  - motion: 'walk' (animasyon + sallanma) | 'squish' (balçık) | 'hop' (zıplama) | 'fly' (kanat + süzülme)
//  - tint: aynı dokunun renk varyantı için (opsiyonel)
//  - mechanics: bosslar için ['slam' | 'enrage' | 'shield'] (systems/BossMechanics.js)
// Bölge havuzlarındaki ortalama can çarpanı ~1 civarında tutulur (denge simülasyonu buna göre ayarlı).
export const ENEMY_TYPES = {
  // ---------------------------------------------------- Yeşil Orman
  slime: { name: 'Balçık', texture: 'enemy_slime', hpMult: 0.8, damageMult: 0.8, goldMult: 1, speed: 30, attackInterval: 1.4, scale: 1, motion: 'squish', deathColor: 0x5ad15a },
  mushroom: { name: 'Zehirli Mantar', texture: 'enemy_mushroom', hpMult: 0.9, damageMult: 0.9, goldMult: 1, speed: 26, attackInterval: 1.3, scale: 1, motion: 'hop', deathColor: 0xe24c3c },
  goblin: { name: 'Goblin', texture: 'enemy_goblin', hpMult: 1, damageMult: 1.1, goldMult: 1.1, speed: 50, attackInterval: 1.2, scale: 1, motion: 'walk', deathColor: 0x7cc35a },
  wolf: { name: 'Kurt', texture: 'enemy_wolf', hpMult: 0.85, damageMult: 1.2, goldMult: 1.1, speed: 85, attackInterval: 0.9, scale: 1, motion: 'walk', deathColor: 0x9aa1ab },
  bat: { name: 'Yarasa', texture: 'enemy_bat', hpMult: 0.6, damageMult: 0.7, goldMult: 0.9, speed: 90, attackInterval: 1.0, scale: 1, motion: 'fly', flyHeight: 60, deathColor: 0x8e5bc2 },

  // ---------------------------------------------------- Kızıl Çöl
  scorpion: { name: 'Dev Akrep', texture: 'enemy_scorpion', hpMult: 1.1, damageMult: 1.4, goldMult: 1.2, speed: 45, attackInterval: 1.4, scale: 1, motion: 'walk', deathColor: 0xc77d3a },
  mummy: { name: 'Mumya', texture: 'enemy_mummy', hpMult: 1.3, damageMult: 1, goldMult: 1.3, speed: 22, attackInterval: 1.6, scale: 1, motion: 'walk', deathColor: 0xe8dcc0 },
  skeleton: { name: 'İskelet', texture: 'enemy_skeleton', hpMult: 1.2, damageMult: 1.3, goldMult: 1.2, speed: 40, attackInterval: 1.3, scale: 1, motion: 'walk', deathColor: 0xf0f0e6 },

  // ---------------------------------------------------- Buzul Vadisi
  iceSlime: { name: 'Buz Balçığı', texture: 'enemy_iceSlime', hpMult: 1, damageMult: 0.9, goldMult: 1.1, speed: 28, attackInterval: 1.4, scale: 1, motion: 'squish', deathColor: 0x8fe3ff },
  frostWolf: { name: 'Buz Kurdu', texture: 'enemy_frostWolf', hpMult: 1, damageMult: 1.3, goldMult: 1.2, speed: 85, attackInterval: 0.9, scale: 1, motion: 'walk', deathColor: 0xbfe0ff },
  yeti: { name: 'Yeti', texture: 'enemy_yeti', hpMult: 1.8, damageMult: 1.5, goldMult: 1.6, speed: 30, attackInterval: 1.6, scale: 1, motion: 'walk', deathColor: 0xf0f4ff },
  frostGolem: { name: 'Buz Golemi', texture: 'enemy_frostGolem', hpMult: 2.2, damageMult: 1.6, goldMult: 1.8, speed: 20, attackInterval: 1.8, scale: 1, motion: 'walk', deathColor: 0xbcd4ea },

  // ---------------------------------------------------- Lav Diyarı
  imp: { name: 'Ateş Cini', texture: 'enemy_imp', hpMult: 0.8, damageMult: 1.2, goldMult: 1.1, speed: 95, attackInterval: 0.9, scale: 1, motion: 'fly', flyHeight: 55, deathColor: 0xff5a2b },
  hellhound: { name: 'Cehennem Tazısı', texture: 'enemy_hellhound', hpMult: 1.2, damageMult: 1.5, goldMult: 1.4, speed: 90, attackInterval: 0.8, scale: 1, motion: 'walk', deathColor: 0xff7a2b },
  magmaGolem: { name: 'Magma Golemi', texture: 'enemy_magmaGolem', hpMult: 2.4, damageMult: 1.8, goldMult: 1.9, speed: 18, attackInterval: 1.9, scale: 1, motion: 'walk', deathColor: 0xff7a2b },
  ashSkeleton: { name: 'Kül İskeleti', texture: 'enemy_skeleton', tint: 0x9a8a8a, hpMult: 1.3, damageMult: 1.4, goldMult: 1.3, speed: 40, attackInterval: 1.2, scale: 1, motion: 'walk', deathColor: 0x8a7a7a },

  // ---------------------------------------------------- Gölge Ormanı
  ghost: { name: 'Hayalet', texture: 'enemy_ghost', hpMult: 0.8, damageMult: 1.3, goldMult: 1.1, speed: 70, attackInterval: 1.0, scale: 1, motion: 'fly', flyHeight: 45, deathColor: 0xcfc6ff },
  wraith: { name: 'Ruh Emici', texture: 'enemy_wraith', hpMult: 1.2, damageMult: 1.6, goldMult: 1.3, speed: 45, attackInterval: 1.1, scale: 1, motion: 'walk', deathColor: 0x7dff9a },
  cultist: { name: 'Karanlık Tarikatçı', texture: 'enemy_cultist', hpMult: 1.1, damageMult: 1.4, goldMult: 1.3, speed: 38, attackInterval: 1.3, scale: 1, motion: 'walk', deathColor: 0xb06bff },
  shadowWolf: { name: 'Gölge Kurdu', texture: 'enemy_shadowWolf', hpMult: 0.9, damageMult: 1.5, goldMult: 1.2, speed: 90, attackInterval: 0.85, scale: 1, motion: 'walk', deathColor: 0x5a5078 },
  treant: { name: 'Kara Ağaç', texture: 'enemy_treant', hpMult: 2.3, damageMult: 1.6, goldMult: 1.9, speed: 18, attackInterval: 1.9, scale: 1, motion: 'walk', deathColor: 0x4a3a2e },

  // ---------------------------------------------------- Gök Adaları
  harpy: { name: 'Harpi', texture: 'enemy_harpy', hpMult: 0.9, damageMult: 1.4, goldMult: 1.2, speed: 95, attackInterval: 0.95, scale: 1, motion: 'fly', flyHeight: 60, deathColor: 0x8a6ad1 },
  stormSprite: { name: 'Fırtına Ruhu', texture: 'enemy_imp', tint: 0x9fe8ff, hpMult: 0.8, damageMult: 1.3, goldMult: 1.1, speed: 100, attackInterval: 0.9, scale: 1, motion: 'fly', flyHeight: 70, deathColor: 0x7fe0ff },
  griffin: { name: 'Grifon', texture: 'enemy_griffin', hpMult: 1.4, damageMult: 1.6, goldMult: 1.5, speed: 70, attackInterval: 1.1, scale: 1, motion: 'walk', deathColor: 0xd9a35f },
  cloudGolem: { name: 'Bulut Golemi', texture: 'enemy_cloudGolem', hpMult: 2.4, damageMult: 1.7, goldMult: 2, speed: 18, attackInterval: 1.9, scale: 1, motion: 'walk', deathColor: 0xf2f7ff },
  skyGuard: { name: 'Göksel Muhafız', texture: 'enemy_skeleton', tint: 0xfff0a0, hpMult: 1.3, damageMult: 1.5, goldMult: 1.4, speed: 42, attackInterval: 1.2, scale: 1, motion: 'walk', deathColor: 0xfff0a0 },

  // ---------------------------------------------------- Kristal Mağarası
  shardling: { name: 'Kıymık', texture: 'enemy_shardling', hpMult: 0.7, damageMult: 1, goldMult: 0.9, speed: 75, attackInterval: 1.0, scale: 1, motion: 'hop', deathColor: 0x8fe8ff },
  crystalSpider: { name: 'Kristal Örümcek', texture: 'enemy_crystalSpider', hpMult: 0.9, damageMult: 1.5, goldMult: 1.2, speed: 80, attackInterval: 0.9, scale: 1, motion: 'walk', deathColor: 0xb06bff },
  caveSnail: { name: 'Obsidyen Sümükböceği', texture: 'enemy_caveSnail', hpMult: 1.6, damageMult: 1.2, goldMult: 1.4, speed: 16, attackInterval: 1.8, scale: 1, motion: 'squish', deathColor: 0x4a6a9a },
  gemGolem: { name: 'Yakut Golem', texture: 'enemy_gemGolem', hpMult: 2.0, damageMult: 1.7, goldMult: 1.8, speed: 20, attackInterval: 1.8, scale: 1, motion: 'walk', deathColor: 0xff5a8a },
  prismWisp: { name: 'Prizma Ruhu', texture: 'enemy_prismWisp', hpMult: 0.7, damageMult: 1.4, goldMult: 1.1, speed: 95, attackInterval: 0.95, scale: 1, motion: 'fly', flyHeight: 55, deathColor: 0xd08fff },

  // ---------------------------------------------------- Eski / ortak
  golem: { name: 'Golem', texture: 'enemy_golem', hpMult: 2.2, damageMult: 1.6, goldMult: 1.8, speed: 20, attackInterval: 1.8, scale: 1, motion: 'walk', deathColor: 0x9aa1ab },

  // ---------------------------------------------------- Bosslar
  forestOgre: { name: 'Orman Devi', texture: 'boss_ogre', mechanics: ['slam'], hpMult: 1, damageMult: 1, goldMult: 1, speed: 25, attackInterval: 1.6, scale: 1, motion: 'walk', deathColor: 0x6b8e23 },
  sandPharaoh: { name: 'Kum Firavunu', texture: 'boss_pharaoh', mechanics: ['slam', 'shield'], hpMult: 1.1, damageMult: 1, goldMult: 1, speed: 20, attackInterval: 1.7, scale: 1, motion: 'walk', deathColor: 0xffc94d },
  frostGiant: { name: 'Buz Devi', texture: 'boss_frost', mechanics: ['slam', 'enrage'], hpMult: 1.2, damageMult: 1.1, goldMult: 1, speed: 22, attackInterval: 1.7, scale: 1, motion: 'walk', deathColor: 0xcff4ff },
  fireDemon: { name: 'Ateş İblisi', texture: 'boss_demon', mechanics: ['slam', 'enrage', 'shield'], hpMult: 1.3, damageMult: 1.25, goldMult: 1.1, speed: 28, attackInterval: 1.4, scale: 1, motion: 'walk', deathColor: 0xff6a3d },
  shadowLord: { name: 'Gölge Lordu', texture: 'boss_shadow', mechanics: ['slam', 'enrage', 'shield'], hpMult: 1.35, damageMult: 1.3, goldMult: 1.15, speed: 26, attackInterval: 1.4, scale: 1, motion: 'walk', deathColor: 0xb06bff },
  stormDragon: { name: 'Fırtına Ejderhası', texture: 'boss_dragon', mechanics: ['slam', 'enrage', 'shield'], hpMult: 1.45, damageMult: 1.35, goldMult: 1.2, speed: 30, attackInterval: 1.3, scale: 1, motion: 'walk', deathColor: 0x7fe0ff },
  crystalQueen: { name: 'Kristal Kraliçe', texture: 'boss_crystalQueen', mechanics: ['slam', 'enrage', 'shield'], hpMult: 1.4, damageMult: 1.3, goldMult: 1.2, speed: 26, attackInterval: 1.5, scale: 1, motion: 'walk', deathColor: 0x8fe8ff },
};

// Eski kayıtlarda/simülasyonlarda geçebilecek boss anahtarı
ENEMY_TYPES.sandGolem = ENEMY_TYPES.sandPharaoh;
