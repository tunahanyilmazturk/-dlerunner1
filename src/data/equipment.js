// Ekipman verileri: nadirlikler, yuvalar, eşya tipleri ve rastgele özellikler (affix).

// weight: düşme ağırlığı · statMult: stat çarpanı · affixes: ek özellik sayısı
// salvage: parçalayınca verilen taban Parça · shardBase: güçlendirme maliyeti tabanı
export const RARITIES = [
  { id: 'common', name: 'Sıradan', color: 0xb0b4c0, weight: 60, statMult: 1, affixes: 0, salvage: 1, shardBase: 2 },
  { id: 'uncommon', name: 'Kaliteli', color: 0x4fd16b, weight: 25, statMult: 1.5, affixes: 1, salvage: 3, shardBase: 3 },
  { id: 'rare', name: 'Nadir', color: 0x4f9bff, weight: 10, statMult: 2.2, affixes: 2, salvage: 8, shardBase: 5 },
  { id: 'epic', name: 'Destansı', color: 0xb36bff, weight: 4, statMult: 3.2, affixes: 3, salvage: 20, shardBase: 8 },
  { id: 'legendary', name: 'Efsanevi', color: 0xffa23d, weight: 1, statMult: 5, affixes: 4, salvage: 50, shardBase: 12 },
];

const pct = (v) => `+%${(v * 100).toFixed(v < 0.1 ? 1 : 0)}`;

// Eşyalarda görülebilecek statlar. UpgradeSystem bunları yükseltme statlarına uygular.
//  - base: Sıradan, seviye 0'da ortalama ek özellik değeri
//  - scales: eşya seviyesiyle büyür mü (kritik şans, hasar azaltma gibi sınırlı statlar büyümez)
//  - weight: eşyaları karşılaştırırken kullanılan "güç" ağırlığı
export const AFFIXES = [
  { stat: 'damage', label: 'Hasar', base: 0.05, scales: true, weight: 1, format: pct },
  { stat: 'attackSpeed', label: 'Saldırı hızı', base: 0.03, scales: true, weight: 1.3, format: pct },
  { stat: 'critChance', label: 'Kritik şans', base: 0.01, scales: false, weight: 4, format: pct },
  { stat: 'critDamage', label: 'Kritik hasar', base: 0.08, scales: true, weight: 0.6, format: (v) => `+x${v.toFixed(2)}` },
  { stat: 'gold', label: 'Altın', base: 0.05, scales: true, weight: 0.5, format: pct },
  { stat: 'maxHp', label: 'Maks. can', base: 0.05, scales: true, weight: 0.6, format: pct },
  { stat: 'hpRegen', label: 'Can yenileme', base: 0.08, scales: true, weight: 0.4, format: pct },
  { stat: 'tap', label: 'Dokunma hasarı', base: 0.08, scales: true, weight: 0.2, format: pct },
  { stat: 'defense', label: 'Hasar azaltma', base: 0.015, scales: false, weight: 3, format: pct },
  { stat: 'runSpeed', label: 'Koşu hızı', base: 0.03, scales: false, weight: 0.8, format: pct },
  { stat: 'xpGain', label: 'EXP kazancı', base: 0.05, scales: true, weight: 0.3, format: pct },
];

export const AFFIX_MAP = Object.fromEntries(AFFIXES.map((a) => [a.stat, a]));

// Yuvalar. Her yuvanın sabit bir ana statı vardır (mainBase = Sıradan, seviye 0 değeri).
//  - side/order: envanterdeki karakter bebeğinde solda/sağda kaçıncı sırada durduğu
//  - bases: o yuvanın eşya tipleri; id görsel çizimi seçer (characterTextures.js)
export const SLOTS = [
  {
    id: 'weapon',
    name: 'Silah',
    icon: '⚔️',
    side: 'right',
    mainStat: 'damage',
    mainBase: 0.12,
    bases: [
      { id: 'sword', name: 'Kılıç', icon: '🗡️' },
      { id: 'axe', name: 'Balta', icon: '🪓' },
      { id: 'spear', name: 'Mızrak', icon: '🔱' },
      { id: 'dagger', name: 'Hançer', icon: '🔪' },
      { id: 'hammer', name: 'Savaş Çekici', icon: '🔨' },
    ],
  },
  {
    id: 'shield',
    name: 'Kalkan',
    icon: '🛡️',
    side: 'right',
    mainStat: 'defense',
    mainBase: 0.04,
    bases: [
      { id: 'buckler', name: 'Kalkan', icon: '🛡️' },
      { id: 'tower', name: 'Kule Kalkanı', icon: '🛡️' },
    ],
  },
  {
    id: 'helmet',
    name: 'Miğfer',
    icon: '⛑️',
    side: 'left',
    mainStat: 'hpRegen',
    mainBase: 0.2,
    bases: [
      { id: 'helm', name: 'Miğfer', icon: '⛑️' },
      { id: 'crown', name: 'Taç', icon: '👑' },
      { id: 'hood', name: 'Başlık', icon: '🧢' },
    ],
  },
  {
    id: 'armor',
    name: 'Zırh',
    icon: '🦺',
    side: 'left',
    mainStat: 'maxHp',
    mainBase: 0.15,
    bases: [
      { id: 'plate', name: 'Plaka Zırh', icon: '🦺' },
      { id: 'robe', name: 'Cübbe', icon: '🥋' },
      { id: 'leather', name: 'Deri Zırh', icon: '🧥' },
    ],
  },
  {
    id: 'gloves',
    name: 'Eldiven',
    icon: '🧤',
    side: 'left',
    mainStat: 'attackSpeed',
    mainBase: 0.05,
    bases: [
      { id: 'leatherGloves', name: 'Eldiven', icon: '🧤' },
      { id: 'gauntlet', name: 'Demir Eldiven', icon: '🧤' },
    ],
  },
  {
    id: 'belt',
    name: 'Kemer',
    icon: '🎗️',
    side: 'left',
    mainStat: 'maxHp',
    mainBase: 0.08,
    bases: [
      { id: 'belt', name: 'Kemer', icon: '🎗️' },
      { id: 'sash', name: 'Kuşak', icon: '🎀' },
    ],
  },
  {
    id: 'boots',
    name: 'Ayakkabı',
    icon: '👢',
    side: 'left',
    mainStat: 'runSpeed',
    mainBase: 0.06,
    bases: [
      { id: 'boots', name: 'Çizme', icon: '👢' },
      { id: 'greaves', name: 'Çelik Çizme', icon: '🥾' },
    ],
  },
  {
    id: 'necklace',
    name: 'Kolye',
    icon: '📿',
    side: 'right',
    mainStat: 'critDamage',
    mainBase: 0.12,
    bases: [
      { id: 'necklace', name: 'Kolye', icon: '📿' },
      { id: 'talisman', name: 'Tılsım', icon: '🧿' },
    ],
  },
  {
    id: 'earring',
    name: 'Küpe',
    icon: '✨',
    side: 'right',
    mainStat: 'critChance',
    mainBase: 0.015,
    bases: [
      { id: 'earring', name: 'Küpe', icon: '✨' },
      { id: 'hoop', name: 'Halka Küpe', icon: '⭕' },
    ],
  },
  {
    id: 'ring',
    name: 'Yüzük',
    icon: '💍',
    side: 'right',
    mainStat: 'gold',
    mainBase: 0.12,
    bases: [
      { id: 'ring', name: 'Yüzük', icon: '💍' },
      { id: 'signet', name: 'Mühür', icon: '🔘' },
    ],
  },
];

export const SLOT_MAP = Object.fromEntries(SLOTS.map((s) => [s.id, s]));

export const PREFIXES = {
  common: [],
  uncommon: ['Sağlam', 'Keskin', 'Hafif', 'Dayanıklı', 'Cilalı'],
  rare: ['Parlak', 'Usta İşi', 'Büyülü', 'Kartal', 'Ay Işığı'],
  epic: ['Kadim', 'Gölge', 'Fırtına', 'Kan Lordu', 'Buzkıran'],
  legendary: ['Ejder', 'Göksel', 'Kıyamet', 'Anka', 'Titan'],
};
