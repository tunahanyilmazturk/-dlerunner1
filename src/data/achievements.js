import { formatNumber } from '../utils/format.js';

// Kademeli başarımlar. Her kademe alındığında Parça verir ve kalıcı
// +hasar/altın bonusu ekler (ACHIEVEMENT.BONUS_PER_TIER).
//  - metric: data/metrics.js anahtarı
//  - tiers: her kademenin hedefi (artan sırada)
export const ACHIEVEMENTS = [
  {
    id: 'slayer',
    name: 'Katliamcı',
    icon: '⚔️',
    metric: 'kills',
    tiers: [50, 500, 5000, 50000, 500000],
    describe: (t) => `${formatNumber(t)} düşman yen`,
  },
  {
    id: 'bossHunter',
    name: 'Boss Avcısı',
    icon: '👹',
    metric: 'bossKills',
    tiers: [1, 10, 50, 250, 1000],
    describe: (t) => `${formatNumber(t)} boss yen`,
  },
  {
    id: 'explorer',
    name: 'Kaşif',
    icon: '🗺️',
    metric: 'bestStage',
    tiers: [10, 25, 50, 100, 200],
    describe: (t) => `Aşama ${t}'e ulaş`,
  },
  {
    id: 'veteran',
    name: 'Tecrübeli',
    icon: '⭐',
    metric: 'heroLevel',
    tiers: [10, 25, 50, 100, 200],
    describe: (t) => `Karakter seviyesi ${t}'e ulaş`,
  },
  {
    id: 'tycoon',
    name: 'Altın Babası',
    icon: '💰',
    metric: 'totalGold',
    tiers: [1e3, 1e5, 1e7, 1e9, 1e12],
    describe: (t) => `Toplam ${formatNumber(t)} altın kazan`,
  },
  {
    id: 'tapper',
    name: 'Hızlı Parmaklar',
    icon: '👆',
    metric: 'taps',
    tiers: [100, 1000, 10000, 50000, 200000],
    describe: (t) => `${formatNumber(t)} kez dokun`,
  },
  {
    id: 'caster',
    name: 'Büyü Ustası',
    icon: '🌀',
    metric: 'skillCasts',
    tiers: [10, 100, 1000, 5000, 20000],
    describe: (t) => `${formatNumber(t)} kez yetenek kullan`,
  },
  {
    id: 'collector',
    name: 'Koleksiyoncu',
    icon: '🎒',
    metric: 'itemsFound',
    tiers: [5, 50, 250, 1000, 5000],
    describe: (t) => `${formatNumber(t)} eşya bul`,
  },
  {
    id: 'legend',
    name: 'Efsane Avcısı',
    icon: '🌟',
    metric: 'legendaryFound',
    tiers: [1, 5, 20, 50, 100],
    describe: (t) => `${formatNumber(t)} Efsanevi eşya bul`,
  },
  {
    id: 'reborn',
    name: 'Ölümsüz Ruh',
    icon: '🔮',
    metric: 'rebirths',
    tiers: [1, 5, 20, 50, 100],
    describe: (t) => `${formatNumber(t)} kez yeniden doğ`,
  },
  {
    id: 'devoted',
    name: 'Sadık Savaşçı',
    icon: '📅',
    metric: 'dailyCompleted',
    tiers: [3, 21, 90, 300, 1000],
    describe: (t) => `${formatNumber(t)} günlük görev tamamla`,
  },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
