import { formatNumber } from '../utils/format.js';
import { randInt } from '../utils/math.js';

// Günlük görev şablonları. Her gün QUESTS.COUNT tanesi rastgele seçilir.
//  - metric: data/metrics.js anahtarı; ilerleme = görev verildiğinden beri artış
//  - target(state): hedef sayı (oyuncunun gücüne göre ölçeklenebilir)
//  - reward(state): { gold, shards }

const stepped = (min, max, step = 1) => randInt(min / step, max / step) * step;

/** 2 anlamlı basamağa yuvarlar: 12345 → 12000 */
function niceRound(n) {
  const magnitude = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1));
  return Math.round(n / magnitude) * magnitude;
}

// Altın ödülü oyuncunun kazanç hızına göre ölçeklenir (≈ 5 dakikalık kazanç)
const goldReward = (state, mult) => niceRound(Math.max(100, state.goldPerSecond * 300 * mult));

export const QUEST_TEMPLATES = [
  {
    id: 'kills',
    icon: '⚔️',
    metric: 'kills',
    text: (t) => `${formatNumber(t)} düşman yen`,
    target: () => stepped(100, 250, 10),
    reward: (s) => ({ gold: goldReward(s, 1), shards: 20 }),
  },
  {
    id: 'bosses',
    icon: '👹',
    metric: 'bossKills',
    text: (t) => `${t} boss yen`,
    target: () => randInt(3, 6),
    reward: (s) => ({ gold: goldReward(s, 1.5), shards: 30 }),
  },
  {
    id: 'stages',
    icon: '🗺️',
    metric: 'stagesCleared',
    text: (t) => `${t} aşama geç`,
    target: () => stepped(10, 25, 5),
    reward: (s) => ({ gold: goldReward(s, 1.2), shards: 25 }),
  },
  {
    id: 'gold',
    icon: '💰',
    metric: 'totalGold',
    text: (t) => `${formatNumber(t)} altın topla`,
    target: (s) => niceRound(Math.max(1000, s.goldPerSecond * 900)),
    reward: (s) => ({ gold: goldReward(s, 1), shards: 20 }),
  },
  {
    id: 'skills',
    icon: '🌀',
    metric: 'skillCasts',
    text: (t) => `${t} kez yetenek kullan`,
    target: () => stepped(15, 35, 5),
    reward: (s) => ({ gold: goldReward(s, 1), shards: 20 }),
  },
  {
    id: 'taps',
    icon: '👆',
    metric: 'taps',
    text: (t) => `${t} kez düşmana dokun`,
    target: () => stepped(150, 400, 50),
    reward: (s) => ({ gold: goldReward(s, 0.8), shards: 15 }),
  },
  {
    id: 'items',
    icon: '🎒',
    metric: 'itemsFound',
    text: (t) => `${t} eşya bul`,
    target: () => randInt(3, 6),
    reward: (s) => ({ gold: goldReward(s, 1.2), shards: 30 }),
  },
  {
    id: 'salvage',
    icon: '♻️',
    metric: 'itemsSalvaged',
    text: (t) => `${t} eşya parçala`,
    target: () => randInt(3, 8),
    reward: (s) => ({ gold: goldReward(s, 1), shards: 25 }),
  },
  {
    id: 'interrupts',
    icon: '👊',
    metric: 'bossInterrupts',
    text: (t) => `${t} kez bossu sersemlet`,
    target: () => randInt(1, 3),
    reward: (s) => ({ gold: goldReward(s, 1.5), shards: 30 }),
  },
  {
    id: 'eggs',
    icon: '🥚',
    metric: 'eggsHatched',
    text: (t) => `${t} yoldaş yumurtası aç`,
    target: () => randInt(1, 3),
    reward: (s) => ({ gold: goldReward(s, 1.2), shards: 35 }),
  },
];

export const QUEST_TEMPLATE_MAP = Object.fromEntries(QUEST_TEMPLATES.map((q) => [q.id, q]));
