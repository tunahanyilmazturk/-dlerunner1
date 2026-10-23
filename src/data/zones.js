import { STAGE } from '../config/balance.js';
import { toRoman } from '../utils/format.js';

// Her bölge STAGE.STAGES_PER_ZONE aşama sürer. Bölgeler bitince döngü başa
// döner ve isimlerine "II", "III" eklenir (zorluk aşama numarasıyla artmaya devam eder).
export const ZONES = [
  {
    id: 'forest',
    name: 'Yeşil Orman',
    sky: [0x5fb4f0, 0xd6f0ff],
    mountain: 0x6f8fa8,
    hill: 0x4f9a52,
    grass: 0x5cbf4a,
    dirt: 0x7a5230,
    snowCaps: true,
    enemies: [
      { type: 'slime', weight: 4 },
      { type: 'mushroom', weight: 3 },
      { type: 'goblin', weight: 3 },
      { type: 'wolf', weight: 2 },
      { type: 'bat', weight: 2 },
    ],
    boss: 'forestOgre',
  },
  {
    id: 'desert',
    name: 'Kızıl Çöl',
    sky: [0xf08a4b, 0xffe2b8],
    mountain: 0xb5654a,
    hill: 0xd9a35f,
    grass: 0xe8c27a,
    dirt: 0x9c6a3c,
    snowCaps: false,
    enemies: [
      { type: 'scorpion', weight: 4 },
      { type: 'mummy', weight: 3 },
      { type: 'skeleton', weight: 3 },
      { type: 'goblin', weight: 2 },
      { type: 'bat', weight: 2 },
    ],
    boss: 'sandPharaoh',
  },
  {
    id: 'ice',
    name: 'Buzul Vadisi',
    sky: [0x7ea6e8, 0xeef5ff],
    mountain: 0x8fa6c0,
    hill: 0xc7dcec,
    grass: 0xeef6ff,
    dirt: 0x6f86a0,
    snowCaps: true,
    enemies: [
      { type: 'iceSlime', weight: 3 },
      { type: 'frostWolf', weight: 3 },
      { type: 'yeti', weight: 2 },
      { type: 'frostGolem', weight: 2 },
      { type: 'skeleton', weight: 1 },
    ],
    boss: 'frostGiant',
  },
  {
    id: 'lava',
    name: 'Lav Diyarı',
    sky: [0x2a0c18, 0xa8322a],
    mountain: 0x4a2328,
    hill: 0x6b2a22,
    grass: 0x5a3a30,
    dirt: 0x2d1a17,
    snowCaps: false,
    enemies: [
      { type: 'imp', weight: 3 },
      { type: 'hellhound', weight: 3 },
      { type: 'ashSkeleton', weight: 3 },
      { type: 'magmaGolem', weight: 2 },
    ],
    boss: 'fireDemon',
  },
  {
    id: 'shadow',
    name: 'Gölge Ormanı',
    sky: [0x120c24, 0x4a3a6a],
    mountain: 0x2a2440,
    hill: 0x23303a,
    grass: 0x3a4a46,
    dirt: 0x211a26,
    snowCaps: false,
    enemies: [
      { type: 'ghost', weight: 3 },
      { type: 'cultist', weight: 3 },
      { type: 'shadowWolf', weight: 3 },
      { type: 'wraith', weight: 2 },
      { type: 'treant', weight: 2 },
    ],
    boss: 'shadowLord',
  },
  {
    id: 'sky',
    name: 'Gök Adaları',
    sky: [0x5aaef0, 0xfff1dc],
    mountain: 0xbcd2ec,
    hill: 0x7fc87a,
    grass: 0x9be27e,
    dirt: 0x8a6e5a,
    snowCaps: false,
    enemies: [
      { type: 'harpy', weight: 3 },
      { type: 'stormSprite', weight: 3 },
      { type: 'griffin', weight: 2 },
      { type: 'skyGuard', weight: 2 },
      { type: 'cloudGolem', weight: 2 },
    ],
    boss: 'stormDragon',
  },
  {
    id: 'crystal',
    name: 'Kristal Mağarası',
    sky: [0x080614, 0x2a1a48],
    mountain: 0x2e2450,
    hill: 0x27324e,
    grass: 0x46528a,
    dirt: 0x191226,
    snowCaps: false,
    enemies: [
      { type: 'shardling', weight: 4 },
      { type: 'crystalSpider', weight: 3 },
      { type: 'prismWisp', weight: 3 },
      { type: 'caveSnail', weight: 2 },
      { type: 'gemGolem', weight: 2 },
    ],
    boss: 'crystalQueen',
  },
];

export function getZoneInfo(stage) {
  const index = Math.floor((stage - 1) / STAGE.STAGES_PER_ZONE);
  const zoneIndex = index % ZONES.length;
  const cycle = Math.floor(index / ZONES.length);
  const zone = ZONES[zoneIndex];
  return {
    zone,
    zoneIndex,
    cycle,
    stageInZone: ((stage - 1) % STAGE.STAGES_PER_ZONE) + 1,
    label: cycle > 0 ? `${zone.name} ${toRoman(cycle + 1)}` : zone.name,
  };
}
