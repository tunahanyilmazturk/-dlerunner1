import { SAVE_VERSION } from '../config/balance.js';

// Kaydedilen her şey bu şemadadır. Yeni alan eklerken buraya varsayılanını ekle;
// eski kayıtlar yüklenirken eksik alanlar otomatik tamamlanır.
export function createDefaultState() {
  return {
    version: SAVE_VERSION,
    gold: 0,
    upgrades: {},
    stage: 1,
    highestStage: 1, // bu koşudaki en yüksek aşama (rebirth'te sıfırlanır)
    bestStage: 1, // tüm zamanların en yüksek aşaması (kilit açılmaları buna bakar)
    goldPerSecond: 0,
    lastSaved: Date.now(),
    hero: {
      level: 1,
      xp: 0, // mevcut seviyedeki EXP
    },
    stats: {
      totalKills: 0,
      bossKills: 0,
      totalGold: 0,
      deaths: 0,
      taps: 0,
      skillCasts: 0,
      itemsFound: 0,
      itemsSalvaged: 0,
      legendaryFound: 0,
      stagesCleared: 0,
      dailyCompleted: 0,
      bossInterrupts: 0,
      playTime: 0,
    },
    achievements: {
      claimed: {}, // id → alınmış kademe sayısı
    },
    quests: {
      day: '', // görevlerin verildiği gün (yerel tarih)
      list: [],
      rerollsLeft: 1,
      bonusClaimed: false,
    },
    equipment: {
      items: [], // tüm eşyalar (kuşanılanlar dahil)
      // yuva → eşya id (yuvalar data/equipment.js SLOTS)
      equipped: { weapon: null, shield: null, helmet: null, armor: null, gloves: null, belt: null, boots: null, necklace: null, earring: null, ring: null },
      shards: 0, // parçalamadan gelen, güçlendirmede harcanan para birimi
      nextId: 1,
      autoEquip: true, // daha güçlü eşyayı otomatik kuşan
      autoSalvage: -1, // bu nadirlik indeksine kadar olanları otomatik parçala (-1 = kapalı)
    },
    skillTree: {
      ranks: {}, // aktif yetenek id → seviye (1–20); yoksa 1
      passives: {}, // pasif düğüm id → seviye
    },
    pets: {
      owned: {}, // yoldaş id → { level, xp } (data/pets.js)
      active: null, // karakteri takip eden yoldaş
      eggs: 0, // açılmamış yumurta
      hatched: 0,
    },
    skills: {
      cooldowns: {}, // id → kalan bekleme süresi (sn)
      autoCast: {}, // id → otomatik kullanım açık mı
    },
    prestige: {
      souls: 0, // harcanabilir Ruh Taşı
      totalSouls: 0, // toplam kazanılan (pasif bonus buna bakar)
      rebirths: 0,
      relics: {},
    },
    settings: {
      damageNumbers: true,
      screenShake: true,
      buyAmount: 1,
      graphics: 'auto', // renderScale.js → GRAPHICS_QUALITY anahtarı
      audio: {
        master: 0.8,
        music: 0.45,
        sfx: 0.7,
        muted: false,
      },
    },
  };
}

// Kayıt sürümü yükseldiğinde eski veriyi dönüştürecek fonksiyonlar.
const MIGRATIONS = {
  // v2: prestige eklendi; kilitler artık tüm zamanların en iyi aşamasına bakıyor
  2: (data) => ({ ...data, bestStage: data.highestStage ?? 1 }),
  // v3: 10 ekipman yuvası; tılsımlar yüzük yuvasından kolye yuvasına taşındı
  3: (data) => {
    const eq = data.equipment;
    if (!eq?.items) return data;
    for (const item of eq.items) {
      const isTalisman = item.slot === 'ring' && (item.base === 'talisman' || item.icon === '📿');
      if (!isTalisman) continue;
      item.slot = 'necklace';
      item.base = 'talisman';
      if (eq.equipped?.ring === item.id) {
        eq.equipped.ring = null;
        eq.equipped.necklace = item.id;
      }
    }
    return data;
  },
};

export function hydrateState(raw) {
  let data = { ...raw };
  let version = Number(data.version) || 0;
  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version + 1];
    if (migrate) data = migrate(data);
    version++;
  }
  data.version = SAVE_VERSION;
  return mergeDeep(createDefaultState(), data);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(target[key])) {
      target[key] = mergeDeep(target[key], value);
    } else if (value !== undefined) {
      target[key] = value;
    }
  }
  return target;
}
