// Eşya setleri: her bölgenin kendi seti vardır. Nadir ve üstü eşyalar düştükleri
// bölgenin setinden olabilir. Aynı setten kuşanılan parça sayısı 2/4/6'ya ulaşınca
// o kademenin bonusu eklenir (statlar AFFIXES ile aynı anahtarları kullanır).
export const SET_CHANCE = { rare: 0.25, epic: 0.4, legendary: 0.6 };

export const SETS = [
  {
    id: 'forest',
    name: 'Korucu',
    icon: '🌿',
    color: 0x6fd36b,
    tiers: [
      { pieces: 2, stats: { gold: 0.15 } },
      { pieces: 4, stats: { attackSpeed: 0.1 } },
      { pieces: 6, stats: { damage: 0.25, hpRegen: 0.3 } },
    ],
  },
  {
    id: 'desert',
    name: 'Firavun',
    icon: '🏺',
    color: 0xffc35a,
    tiers: [
      { pieces: 2, stats: { gold: 0.2 } },
      { pieces: 4, stats: { critChance: 0.03 } },
      { pieces: 6, stats: { critDamage: 0.6, damage: 0.15 } },
    ],
  },
  {
    id: 'ice',
    name: 'Buzul',
    icon: '❄️',
    color: 0x8fd8ff,
    tiers: [
      { pieces: 2, stats: { maxHp: 0.15 } },
      { pieces: 4, stats: { defense: 0.05 } },
      { pieces: 6, stats: { damage: 0.25, maxHp: 0.2 } },
    ],
  },
  {
    id: 'lava',
    name: 'Cehennem',
    icon: '🔥',
    color: 0xff6a3d,
    tiers: [
      { pieces: 2, stats: { damage: 0.1 } },
      { pieces: 4, stats: { critDamage: 0.4 } },
      { pieces: 6, stats: { attackSpeed: 0.15, damage: 0.2 } },
    ],
  },
  {
    id: 'shadow',
    name: 'Gölge',
    icon: '🌑',
    color: 0xb07aff,
    tiers: [
      { pieces: 2, stats: { critChance: 0.02 } },
      { pieces: 4, stats: { damage: 0.15 } },
      { pieces: 6, stats: { critDamage: 0.8, critChance: 0.03 } },
    ],
  },
  {
    id: 'sky',
    name: 'Fırtına',
    icon: '⚡',
    color: 0x7fe0ff,
    tiers: [
      { pieces: 2, stats: { runSpeed: 0.1 } },
      { pieces: 4, stats: { attackSpeed: 0.12 } },
      { pieces: 6, stats: { damage: 0.3, xpGain: 0.2 } },
    ],
  },
  {
    id: 'crystal',
    name: 'Prizma',
    icon: '💎',
    color: 0x8fe8ff,
    tiers: [
      { pieces: 2, stats: { defense: 0.03 } },
      { pieces: 4, stats: { critDamage: 0.35 } },
      { pieces: 6, stats: { damage: 0.25, critChance: 0.02 } },
    ],
  },
];

export const SET_MAP = Object.fromEntries(SETS.map((s) => [s.id, s]));
