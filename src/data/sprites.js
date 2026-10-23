// Düşman dokularının boyutları [genişlik, yükseklik]. TextureFactory bu boyutlarda çizer;
// denge simülatörü düşman genişliğini (çarpışma/sıralama) buradan hesaplar.
// frames: 2 → yürüme/kanat animasyonu için `${anahtar}_0` ve `${anahtar}_1` dokuları üretilir.
export const ENEMY_SPRITES = {
  enemy_slime: { size: [56, 44] },
  enemy_iceSlime: { size: [56, 50] },
  enemy_mushroom: { size: [48, 54] },
  enemy_bat: { size: [64, 40], frames: 2 },
  enemy_imp: { size: [58, 54], frames: 2 },
  enemy_goblin: { size: [50, 64], frames: 2 },
  enemy_skeleton: { size: [46, 66], frames: 2 },
  enemy_mummy: { size: [48, 66], frames: 2 },
  enemy_yeti: { size: [70, 80], frames: 2 },
  enemy_wolf: { size: [78, 50], frames: 2 },
  enemy_frostWolf: { size: [78, 50], frames: 2 },
  enemy_hellhound: { size: [80, 54], frames: 2 },
  enemy_scorpion: { size: [74, 50], frames: 2 },
  enemy_golem: { size: [72, 78] },
  enemy_frostGolem: { size: [72, 80] },
  enemy_magmaGolem: { size: [72, 78] },
  boss_ogre: { size: [116, 124] },
  boss_pharaoh: { size: [112, 132] },
  boss_frost: { size: [124, 128] },
  boss_demon: { size: [128, 130] },
  enemy_ghost: { size: [48, 52], frames: 2 },
  enemy_wraith: { size: [50, 70], frames: 2 },
  enemy_cultist: { size: [46, 66], frames: 2 },
  enemy_shadowWolf: { size: [78, 50], frames: 2 },
  enemy_treant: { size: [72, 78] },
  enemy_harpy: { size: [64, 48], frames: 2 },
  enemy_griffin: { size: [92, 60], frames: 2 },
  enemy_cloudGolem: { size: [72, 78] },
  boss_shadow: { size: [126, 130] },
  boss_dragon: { size: [140, 134] },
  enemy_shardling: { size: [40, 36], frames: 2 },
  enemy_crystalSpider: { size: [64, 44], frames: 2 },
  enemy_caveSnail: { size: [62, 46] },
  enemy_gemGolem: { size: [74, 82] },
  enemy_prismWisp: { size: [46, 46], frames: 2 },
  boss_crystalQueen: { size: [122, 132] },
};

/** Animasyonlu dokularda ilk kare anahtarı; diğerlerinde dokunun kendisi. */
export const firstFrame = (texture) => (ENEMY_SPRITES[texture]?.frames ? `${texture}_0` : texture);
