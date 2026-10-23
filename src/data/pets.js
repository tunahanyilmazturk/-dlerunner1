// Evcil hayvanlar (yoldaşlar). Bosslardan (ve nadiren elitlerden) yumurta düşer; yumurta
// kuluçkada açılınca rastgele bir yoldaş çıkar. Aynı yoldaş tekrar çıkarsa ona EXP olur.
//  - Aktif yoldaş: karakteri takip eder, saldırır/iyileştirir ve bonusunun tamamını verir.
//  - Diğer sahip olunan yoldaşlar: bonuslarının PET.COLLECTION_RATIO kadarını verir.
//  - attack.damageMult / heal.ratio: seviye 1 değeri; her seviye perLevel ekler.
//  - bonus: stat anahtarı UpgradeSystem'deki pet uygulamasıyla eşleşir.
export const PET = {
  EGG_CHANCE_BOSS: 0.3,
  EGG_CHANCE_ELITE: 0.02,
  MAX_LEVEL: 30,
  XP_BASE: 25, // seviye atlama EXP'si = XP_BASE * seviye^XP_EXP
  XP_EXP: 1.4,
  KILL_XP: 1, // aktif yoldaşa düşman başına EXP (elit x3, boss x10)
  FEED_XP: 25, // bir besleme kaç EXP verir
  FEED_COST: 12, // besleme maliyeti (Parça) = FEED_COST * (1 + seviye * 0.2)
  DUPLICATE_XP_RATIO: 0.6, // aynı yoldaş çıkarsa: bir sonraki seviyenin bu oranı kadar EXP
  COLLECTION_RATIO: 0.25,
};

export const PETS = [
  {
    id: 'wolfPup',
    name: 'Kurt Yavrusu',
    icon: '🐺',
    color: 0xb8c4d6,
    description: 'Öndeki düşmana atılıp ısırır.',
    attack: { interval: 1.4, damageMult: 0.6, perLevel: 0.06 },
    bonus: { stat: 'damage', base: 0.03, perLevel: 0.01 },
  },
  {
    id: 'fairy',
    name: 'Orman Perisi',
    icon: '🧚',
    color: 0x9dff9d,
    description: 'Düzenli aralıkla canını iyileştirir.',
    heal: { interval: 3, ratio: 0.03, perLevel: 0.002 },
    bonus: { stat: 'hpRegen', base: 0.1, perLevel: 0.03 },
  },
  {
    id: 'dragonWhelp',
    name: 'Ejder Yavrusu',
    icon: '🐉',
    color: 0xff7a3d,
    description: 'Ekrandaki tüm düşmanlara ateş püskürtür.',
    attack: { interval: 3, damageMult: 0.8, perLevel: 0.08, aoe: true },
    bonus: { stat: 'critDamage', base: 0.1, perLevel: 0.02 },
  },
  {
    id: 'goldCat',
    name: 'Altın Kedi',
    icon: '🐱',
    color: 0xffd23f,
    description: 'Uğur getirir: çok daha fazla altın.',
    bonus: { stat: 'gold', base: 0.12, perLevel: 0.03 },
  },
  {
    id: 'wiseOwl',
    name: 'Bilge Baykuş',
    icon: '🦉',
    color: 0x9ab8ff,
    description: 'Bilgelik bahşeder: daha fazla deneyim.',
    bonus: { stat: 'xpGain', base: 0.08, perLevel: 0.02 },
  },
];

export const PET_MAP = Object.fromEntries(PETS.map((p) => [p.id, p]));

export const PET_BONUS_LABELS = {
  damage: 'Hasar',
  hpRegen: 'Can yenileme',
  critDamage: 'Kritik hasar',
  gold: 'Altın',
  xpGain: 'Deneyim',
};
