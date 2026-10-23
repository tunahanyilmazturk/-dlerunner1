// Pasif yetenek ağacı. 3 kademe; üst kademeler ağaçta toplam bu kadar puan harcanınca açılır.
// Her düğüm Yetenek Puanı ile seviye atlar; perRank değeri SkillTreeSystem.bonuses'a eklenir.
//  - stat: damage | maxHp | attackSpeed | critChance | critDamage | gold | xp | defense | cooldown
export const PASSIVE_TIERS = [
  { tier: 1, name: 'Temel', requires: 0 },
  { tier: 2, name: 'Usta', requires: 10 },
  { tier: 3, name: 'Efsane', requires: 25 },
];

const pct = (v) => `+%${(v * 100).toFixed(v < 0.1 ? 1 : 0)}`;

export const PASSIVES = [
  { id: 'sharpness', tier: 1, name: 'Keskinlik', icon: '🗡️', stat: 'damage', perRank: 0.02, maxRank: 10, format: pct },
  { id: 'toughness', tier: 1, name: 'Kalın Deri', icon: '🛡️', stat: 'maxHp', perRank: 0.03, maxRank: 10, format: pct },
  { id: 'swiftness', tier: 1, name: 'Çevik Adımlar', icon: '💨', stat: 'attackSpeed', perRank: 0.015, maxRank: 10, format: pct },
  { id: 'precision', tier: 2, name: 'Hassasiyet', icon: '🎯', stat: 'critChance', perRank: 0.01, maxRank: 10, format: pct },
  { id: 'greed', tier: 2, name: 'Açgözlülük', icon: '💰', stat: 'gold', perRank: 0.03, maxRank: 10, format: pct },
  { id: 'wisdom', tier: 2, name: 'Bilgelik', icon: '📖', stat: 'xp', perRank: 0.05, maxRank: 10, format: pct },
  { id: 'executioner', tier: 3, name: 'Cellat', icon: '💀', stat: 'critDamage', perRank: 0.06, maxRank: 10, format: (v) => `+x${v.toFixed(1)}` },
  { id: 'ironwall', tier: 3, name: 'Demir Duvar', icon: '🧱', stat: 'defense', perRank: 0.01, maxRank: 10, format: pct },
  { id: 'timelord', tier: 3, name: 'Zamanın Efendisi', icon: '⏳', stat: 'cooldown', perRank: 0.02, maxRank: 10, format: (v) => `-%${Math.round(v * 100)} bekleme` },
];

export const PASSIVE_MAP = Object.fromEntries(PASSIVES.map((p) => [p.id, p]));

// Aktif yetenek seviyeleri
export const SKILL_RANK = {
  MAX: 20,
  DAMAGE_PER_RANK: 0.08, // hasar çarpanı +%8 / seviye (simülasyonla ayarlandı)
  DURATION_PER_RANK: 0.04, // süre +%4 / seviye
  COOLDOWN_PER_RANK: 0.01, // bekleme -%1 / seviye
};
