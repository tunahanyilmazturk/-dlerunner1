// Oyunun tüm denge (balance) sabitleri tek yerde. Ayar yaparken önce buraya bak.

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const SAVE_KEY = 'idle-blade-runner:save';
export const SAVE_VERSION = 3;

export const WORLD = {
  GROUND_Y: 440,
  PLAYER_X: 220,
  RUN_SPEED: 170, // px/sn, arka planın kayma hızı
  SPEED_EASE: 7, // koşma/durma geçiş yumuşaklığı
  SPAWN_X: GAME_WIDTH + 60,
  CONTACT_GAP: 16, // düşmanın oyuncuya en fazla yaklaşabileceği mesafe
  ATTACK_RANGE: 64, // oyuncunun vuruş menzili (düşmanın sol kenarına göre)
  ENEMY_GAP: 14, // sıradaki düşmanlar arası boşluk
  MAX_ALIVE_ENEMIES: 4,
  SPAWN_DELAY_MIN: 0.5,
  SPAWN_DELAY_MAX: 1.3,
};

export const STAGE = {
  ENEMIES_PER_STAGE: 10,
  BOSS_EVERY: 5,
  BOSS_TIME_LIMIT: 30,
  STAGES_PER_ZONE: 10,
  CLEAR_DELAY: 900, // ms
  FAIL_DELAY: 1600, // ms
};

// Simülasyonla ayarlandı (tools/balance-sim.js). Değiştirince simülasyonu tekrar çalıştır.
export const ENEMY_SCALING = {
  BASE_HP: 20,
  BASE_DAMAGE: 3,
  BASE_GOLD: 3,
  HP_GROWTH: 1.23, // oyuncu gücünden hızlı → zamanla duvarlar ve rebirth ihtiyacı
  DAMAGE_GROWTH: 1.15,
  GOLD_GROWTH: 1.11,
  BOSS_HP_MULT: 6,
  BOSS_DAMAGE_MULT: 1.8,
  BOSS_GOLD_MULT: 8,
};

// Boss mekanikleri (systems/BossMechanics.js). Hangi bossun hangisini kullandığı data/enemies.js'te.
export const BOSS_MECHANICS = {
  SLAM_INTERVAL: 8, // yere vurma arası (sn)
  SLAM_TELEGRAPH: 1.6, // uyarı süresi; bu sürede bossa INTERRUPT_RATIO kadar hasar verilirse vuruş iptal
  SLAM_MULT: 2.5, // vuruş hasarı = boss hasarı × SLAM_MULT
  INTERRUPT_RATIO: 0.07, // boss maks. canının oranı
  ENRAGE_AT: 0.3, // bu can oranının altında öfke
  ENRAGE_SPEED: 0.7, // saldırı aralığı çarpanı (daha hızlı)
  ENRAGE_DAMAGE: 1.25,
  SHIELD_AT: 0.5, // bu can oranında bir kez kalkan
  SHIELD_TIME: 3,
  SHIELD_REDUCTION: 0.7, // kalkan açıkken alınan hasar azaltma
};

// Elit düşman: normal düşmanın güçlü, ışıltılı versiyonu (boss aşamalarında çıkmaz)
export const ELITE = {
  CHANCE: 0.06,
  HP_MULT: 3.5,
  DAMAGE_MULT: 1.5,
  GOLD_MULT: 2.5,
  SCALE: 1.25,
  DROP_CHANCE: 0.25, // eşya düşürme şansı (normal düşman: EQUIPMENT.DROP_CHANCE)
};

// Karakter seviyesi: düşmanlar EXP verir, her seviye kalıcı +hasar ve +can (rebirth'te sıfırlanmaz)
export const HERO_LEVEL = {
  KILL_XP: 4, // aşama 1'de normal düşman başına EXP
  XP_STAGE_GROWTH: 1.15,
  BOSS_XP_MULT: 10,
  ELITE_XP_MULT: 3,
  LEVEL_BASE_XP: 25, // seviye 1 → 2 için gereken EXP
  LEVEL_XP_GROWTH: 1.17,
  BONUS_PER_LEVEL: 0.01, // seviye başına +%1 hasar ve maks. can (simülasyonla ayarlandı)
  MAX_LEVEL: 250,
};

export const ECONOMY = {
  GPS_WINDOW: 60, // altın/sn ortalaması için saniye penceresi
  GPS_MIN_SAMPLE: 10, // bu kadar saniye geçmeden kayıtlı değeri ezme
  OFFLINE_MIN_SECONDS: 60,
  OFFLINE_MAX_SECONDS: 8 * 3600,
  OFFLINE_EFFICIENCY: 0.5,
};

export const PRESTIGE = {
  MIN_STAGE: 20, // bu aşamaya ulaşmadan rebirth yapılamaz
  // Kazanılan Ruh Taşı = floor(SOUL_BASE * (aşama - SOUL_OFFSET) ^ SOUL_EXPONENT * ruh çarpanı)
  SOUL_BASE: 0.25,
  SOUL_OFFSET: 15,
  SOUL_EXPONENT: 1.3, // aşama 25 → 4, 30 → 8, 40 → 16, 60 → 35
  SOUL_BONUS: 0.05, // toplam kazanılan her Ruh Taşı: +%5 hasar ve altın
};

export const EQUIPMENT = {
  DROP_CHANCE: 0.05, // normal düşman başına eşya düşme şansı (10 yuva; simülasyonla ayarlandı)
  BOSS_DROP_CHANCE: 1,
  BOSS_MIN_RARITY: 1, // boss en az "Kaliteli" düşürür (RARITIES indeksi)
  INVENTORY_SIZE: 48, // kuşanılmamış eşya sınırı
  LEVEL_SCALING: 0.012, // eşya seviyesi (düştüğü aşama) başına stat artışı (10 yuva için kısıldı)
  ENHANCE_STEP: 0.1, // her güçlendirme +%10 stat
  MAX_ENHANCE: 10,
  MAX_DEFENSE: 0.5, // hasar azaltma üst sınırı
  MAX_RUN_SPEED: 1, // koşu hızı bonusu üst sınırı (+%100)
};

export const BLACKSMITH = {
  COMBINE_COUNT: 3, // aynı nadirlikten kaç eşya bir üst nadirliğe birleşir
  COMBINE_COST: [20, 60, 180, 500], // Sıradan→Kaliteli, …, Destansı→Efsanevi (Parça)
  REFORGE_MULT: 6, // yeniden dövme maliyeti = nadirlik shardBase * REFORGE_MULT * (1 + REFORGE_GROWTH * önceki dövme)
  REFORGE_GROWTH: 0.25,
};

export const ACHIEVEMENT = {
  BONUS_PER_TIER: 0.02, // alınan her başarım kademesi: +%2 hasar ve altın
  SHARDS_BASE: 10, // kademe ödülü = SHARDS_BASE * (kademe no)^2 Parça
};

export const QUESTS = {
  COUNT: 3, // günlük görev sayısı
  REROLLS: 1, // günlük ücretsiz görev değiştirme hakkı
  BONUS_SOULS: 2, // tüm görevler bitince verilen Ruh Taşı
  BONUS_ITEM_MIN_RARITY: 2, // tüm görevler bitince verilen eşyanın en düşük nadirliği (Nadir)
};

export const SAVE = {
  AUTOSAVE_INTERVAL: 10000, // ms
};
