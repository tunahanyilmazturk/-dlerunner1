import { RARITIES } from '../../data/equipment.js';
import { shade } from '../../utils/color.js';
import { OUTLINE, make, outlined } from './draw.js';

// Kahraman katmanlı çizilir. Gövde, pelerin ve tüm giyilen eşyalar aynı 64x80 tuvalde
// hizalıdır (ayaklar alt ortada) → üst üste koyunca karakter oluşur. Silah ayrı dokudur,
// eldeki tutma noktasından döner. Her eşya tipi × nadirlik için ayrı doku üretilir.

export const HERO_SIZE = { width: 64, height: 80 };
export const HERO_HAND = { x: 42, y: 50 }; // tuval koordinatı

const SKIN = 0xf2c79b;
const HAIR = 0x6b3e1f;
const TUNIC = 0x8a6a4a;
const PANTS = 0x34405e;
const BOOT = 0x4a2c18;
const LEATHER = 0x5a3a1a;
const WOOD = 0x7a4a24;
const DEFAULT_CAPE = 0xb83232;

// Nadirliğe göre malzeme renkleri: demir → çelik → mavi çelik → büyülü kristal → altın
export const GEAR_PALETTE = {
  common: { metal: 0x9aa3ad, light: 0xc9d0d6, dark: 0x5f6670, accent: 0x8b5a2b, cloth: 0x7d6a55, trim: 0xb59a6a, blade: 0xcfd6de },
  uncommon: { metal: 0xb8c4cc, light: 0xe6eef2, dark: 0x6e7a82, accent: 0x3fbf5a, cloth: 0x3f7a4a, trim: 0x8fe39f, blade: 0xe3eaf0 },
  rare: { metal: 0x7fa8f0, light: 0xc4dcff, dark: 0x3c5fa8, accent: 0x2f8fff, cloth: 0x2c4f9e, trim: 0x9cc4ff, blade: 0xb9d4ff },
  epic: { metal: 0xb48af0, light: 0xe2ccff, dark: 0x6a43a8, accent: 0xff5fd2, cloth: 0x5a2f99, trim: 0xd9b0ff, blade: 0xdcc4ff },
  legendary: { metal: 0xffc94d, light: 0xfff0b0, dark: 0xb07a1a, accent: 0xff5a2b, cloth: 0x9e2f1f, trim: 0xffd36b, blade: 0xfff0b8 },
};

// Silah dokusu boyutu ve tutma noktası (y). Dokular dikeydir; uç yukarıda.
export const WEAPON_SPECS = {
  default: { width: 14, height: 50, grip: 41 },
  sword: { width: 18, height: 64, grip: 53 },
  axe: { width: 30, height: 64, grip: 54 },
  spear: { width: 16, height: 82, grip: 64 },
  dagger: { width: 14, height: 42, grip: 33 },
  hammer: { width: 30, height: 70, grip: 60 },
};

// ------------------------------------------------------------ Gövde

// İki koşu karesindeki bacaklar [x, y, boy]; gövde ve ayakkabı katmanları aynı konumları kullanır
const LEG_POSITIONS = [
  [[25, 57, 21], [34, 55, 19]],
  [[27, 55, 19], [32, 57, 21]],
];

function drawBody(g, phase) {
  const s = outlined(g);
  for (const [x, y, h] of LEG_POSITIONS[phase]) {
    s.rect(x, y, 8, h - 6, PANTS, 2);
    s.rect(x - 2, y + h - 7, 12, 7, BOOT, 2);
  }
  s.rect(22, 33, 22, 25, TUNIC, 5);
  g.fillStyle(shade(TUNIC, 0.75));
  g.fillRect(22, 50, 22, 4);
  g.fillStyle(shade(TUNIC, 1.2));
  g.fillRect(25, 36, 5, 10);

  s.circle(33, 21, 11, SKIN);
  g.fillStyle(OUTLINE);
  g.fillEllipse(31, 13, 26, 14);
  g.fillStyle(HAIR);
  g.fillEllipse(31, 13, 23, 11);
  g.fillTriangle(21, 14, 24, 27, 28, 15);
  g.fillStyle(0x1b1b1b);
  g.fillRect(37, 19, 3, 4);
  g.fillStyle(0xe8a07a);
  g.fillCircle(39, 26, 2);
  g.fillStyle(0x7a3b2a);
  g.fillRect(36, 28, 4, 1.5);

  s.rect(38, 36, 7, 13, TUNIC, 3);
  s.circle(HERO_HAND.x, HERO_HAND.y, 3.5, SKIN);
}

function drawCape(g, color) {
  const s = outlined(g);
  s.poly([[25, 34], [12, 68], [19, 73], [31, 63]], color);
  g.lineStyle(1.5, shade(color, 0.75));
  g.lineBetween(22, 42, 16, 68);
}

// ------------------------------------------------------------ Zırhlar

function drawPlate(g, p, ri) {
  const s = outlined(g);
  s.rect(21, 32, 24, 25, p.metal, 6);
  g.fillStyle(p.light, 0.8);
  g.fillRoundedRect(24, 35, 6, 12, 3);
  g.fillStyle(p.dark);
  g.fillRect(21, 49, 24, 5);
  g.fillStyle(p.accent);
  g.fillRect(31, 49, 5, 5);
  s.rect(23, 55, 9, 7, p.dark, 2);
  s.rect(34, 55, 9, 7, p.dark, 2);
  s.circle(40, 36, 6, p.metal);
  g.fillStyle(p.light, 0.7);
  g.fillCircle(38, 34, 2);
  s.rect(38, 41, 7, 7, p.metal, 2);
  if (ri >= 2) {
    s.circle(33, 41, 3, p.accent);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(32, 40, 1);
  }
  if (ri >= 3) {
    g.lineStyle(1.5, p.trim);
    g.strokeRoundedRect(23, 34, 20, 14, 4);
    s.poly([[36, 31], [44, 26], [46, 33]], p.trim); // omuz dikeni
  }
}

function drawRobe(g, p, ri) {
  const s = outlined(g);
  s.poly([[21, 33], [45, 33], [49, 68], [17, 68]], p.cloth);
  g.fillStyle(p.trim);
  g.fillRect(19, 64, 28, 3);
  g.fillRect(31, 34, 4, 33);
  g.fillStyle(p.accent);
  g.fillRect(21, 48, 25, 4);
  s.poly([[27, 32], [33, 38], [39, 32]], p.trim);
  s.rect(38, 36, 7, 13, p.cloth, 3);
  g.fillStyle(p.trim);
  g.fillRect(38, 45, 7, 3);
  if (ri >= 2) s.circle(33, 50, 2.8, p.trim);
  if (ri >= 3) {
    g.fillStyle(p.trim, 0.8);
    for (const [x, y] of [[24, 58], [41, 58], [26, 40]]) g.fillCircle(x, y, 1.5);
  }
}

// ------------------------------------------------------------ Başlıklar

function drawHelm(g, p, ri) {
  const s = outlined(g);
  s.poly([[27, 8], [19, 1], [30, 1], [37, 6]], p.accent); // tüy
  s.rect(21, 7, 25, 14, p.metal, 7);
  g.fillStyle(p.light, 0.8);
  g.fillRoundedRect(24, 9, 7, 5, 2);
  g.fillStyle(p.dark);
  g.fillRect(21, 16, 25, 3);
  s.rect(21, 17, 6, 11, p.metal, 2); // yanak koruması
  s.rect(41, 17, 3, 8, p.metal, 1); // burun koruması
  if (ri >= 2) {
    g.fillStyle(p.accent);
    g.fillCircle(33, 12, 2);
  }
}

function drawCrown(g, p, ri) {
  const s = outlined(g);
  s.poly([[22, 14], [22, 6], [26, 10], [29, 2], [33, 9], [37, 2], [40, 10], [44, 6], [44, 14]], p.metal);
  g.fillStyle(p.dark);
  g.fillRect(22, 12, 22, 2);
  g.fillStyle(p.accent);
  for (const [x, y] of [[26, 11], [33, 8], [40, 11]]) g.fillCircle(x, y, ri >= 2 ? 2.2 : 1.6);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(32, 7, 0.9);
}

function drawAmulet(g, p) {
  const s = outlined(g, { width: 1.5 });
  g.lineStyle(1.5, p.trim);
  g.beginPath();
  g.moveTo(27, 32);
  g.lineTo(33, 39);
  g.lineTo(39, 32);
  g.strokePath();
  s.circle(33, 41, 3.4, p.accent);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(32, 40, 1.1);
}

// ------------------------------------------------------------ Yeni zırh / başlık tipleri

const HIDE = 0x7a5232; // deri

function drawLeather(g, p, ri) {
  const s = outlined(g);
  s.rect(21, 32, 24, 24, HIDE, 5);
  g.fillStyle(shade(HIDE, 1.2));
  g.fillRoundedRect(24, 35, 6, 11, 3);
  g.lineStyle(2.5, shade(HIDE, 0.65));
  g.lineBetween(23, 34, 43, 54);
  g.fillStyle(p.trim);
  for (const [x, y] of [[26, 38], [32, 44], [38, 50], [41, 36]]) g.fillCircle(x, y, 1.3);
  s.ellipse(40, 35, 13, 9, shade(HIDE, 0.85));
  s.rect(38, 38, 7, 10, HIDE, 3);
  s.rect(23, 55, 9, 6, shade(HIDE, 0.8), 2);
  s.rect(34, 55, 9, 6, shade(HIDE, 0.8), 2);
  if (ri >= 2) s.circle(33, 44, 2.6, p.accent);
}

function drawHood(g, p, ri) {
  const s = outlined(g);
  s.poly([[20, 26], [20, 12], [27, 4], [38, 4], [45, 11], [45, 19], [40, 13], [33, 10], [26, 13], [24, 28]], p.cloth);
  g.lineStyle(1.5, p.trim);
  g.lineBetween(26, 13, 33, 10);
  g.lineBetween(33, 10, 40, 13);
  g.fillStyle(shade(p.cloth, 0.75));
  g.fillTriangle(20, 14, 22, 26, 24, 16);
  if (ri >= 3) s.circle(33, 9, 2, p.accent);
}

// ------------------------------------------------------------ Kalkan, eldiven, kemer, ayakkabı, takılar

// Kalkan arkadaki kolda: gövdenin arkasında çizilir (katman sırası Player.js'te)
function drawShield(g, base, p, ri) {
  const s = outlined(g);
  if (base === 'tower') {
    s.rect(7, 30, 18, 32, p.metal, 5);
    g.fillStyle(p.light, 0.6);
    g.fillRoundedRect(9, 32, 4, 26, 2);
    g.fillStyle(p.accent);
    g.fillRect(14, 34, 4, 24);
    g.fillRect(9, 43, 14, 4);
    if (ri >= 3) s.circle(16, 45, 2.5, p.light);
  } else {
    s.circle(17, 46, 11, p.metal);
    g.lineStyle(2, p.dark);
    g.strokeCircle(17, 46, 7.5);
    s.circle(17, 46, 3.2, p.accent);
    g.fillStyle(p.light, 0.7);
    g.fillCircle(13, 41, 2.2);
    if (ri >= 3) for (const a of [0, 1.57, 3.14, 4.71]) g.fillCircle(17 + Math.cos(a) * 9, 46 + Math.sin(a) * 9, 1.2);
  }
}

function drawGloves(g, base, p, ri) {
  const s = outlined(g);
  const [hx, hy] = [HERO_HAND.x, HERO_HAND.y];
  if (base === 'gauntlet') {
    s.rect(37, 40, 9, 9, p.metal, 2);
    g.fillStyle(p.light, 0.6);
    g.fillRect(38, 41, 3, 6);
    s.circle(hx, hy, 4.6, p.metal);
    g.lineStyle(1.2, p.dark);
    g.lineBetween(hx - 3, hy - 1, hx + 3, hy - 1);
  } else {
    s.rect(37, 43, 9, 6, shade(HIDE, 0.8), 2);
    g.lineStyle(1, p.trim);
    g.lineBetween(38, 46, 45, 46);
    s.circle(hx, hy, 4.2, HIDE);
  }
  if (ri >= 2) s.circle(41.5, 45, 1.6, p.accent);
}

function drawBelt(g, base, p, ri) {
  const s = outlined(g, { width: 1.5 });
  if (base === 'sash') {
    s.rect(21, 48, 24, 6, p.cloth, 2);
    s.poly([[39, 52], [46, 62], [42, 63], [37, 54]], p.cloth);
    g.fillStyle(p.trim);
    g.fillRect(21, 50, 24, 1.5);
  } else {
    s.rect(21, 49, 24, 5, 0x4a2c18, 1);
    s.rect(30, 48, 7, 7, p.metal, 1);
    g.fillStyle(0x2a1a10);
    g.fillRect(32, 50, 3, 3);
  }
  if (ri >= 2) {
    g.fillStyle(p.accent);
    g.fillCircle(25, 51.5, 1.3);
    g.fillCircle(41, 51.5, 1.3);
  }
}

function drawBoots(g, base, p, ri, phase) {
  const s = outlined(g);
  for (const [x, y, h] of LEG_POSITIONS[phase]) {
    if (base === 'greaves') {
      s.rect(x - 1, y + h - 16, 10, 12, p.metal, 2);
      s.rect(x - 2, y + h - 6, 12, 6, p.dark, 2);
      s.circle(x + 4, y + h - 16, 3, p.light);
    } else {
      s.rect(x - 2, y + h - 11, 12, 11, shade(HIDE, 0.75), 2);
      g.fillStyle(p.trim);
      g.fillRect(x - 2, y + h - 11, 12, 2);
      g.fillStyle(0x1a1008);
      g.fillRect(x - 2, y + h - 2, 12, 2);
    }
    if (ri >= 3) {
      g.fillStyle(p.accent);
      g.fillCircle(x + 4, y + h - 7, 1.2);
    }
  }
}

function drawNecklace(g, base, p) {
  if (base === 'talisman') return drawAmulet(g, p);
  const s = outlined(g, { width: 1.2 });
  g.fillStyle(p.trim);
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    g.fillCircle(27 + 12 * t, 32 + Math.sin(t * Math.PI) * 6, 0.9);
  }
  s.circle(33, 39.5, 2.6, p.accent);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(32.3, 38.8, 0.8);
}

function drawEarring(g, base, p) {
  if (base === 'hoop') {
    g.lineStyle(2.4, OUTLINE);
    g.strokeCircle(26.5, 29, 2.6);
    g.lineStyle(1.4, p.metal);
    g.strokeCircle(26.5, 29, 2.6);
  } else {
    g.lineStyle(1, p.trim);
    g.lineBetween(26.5, 25.5, 26.5, 28);
    outlined(g, { width: 1 }).circle(26.5, 29.5, 1.9, p.accent);
  }
}

// Takı ikonları (envanter için; karakter üzerinde küçük kaldıkları için ayrı çizilir)
function drawJewelIcon(g, base, p, ri) {
  const s = outlined(g, { width: 1.5 });
  const gem = (x, y, r) => {
    s.circle(x, y, r, p.accent);
    g.fillStyle(0xffffff, 0.75);
    g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.35);
  };
  if (base === 'ring' || base === 'signet') {
    g.lineStyle(5, OUTLINE);
    g.strokeCircle(16, 20, 8);
    g.lineStyle(3, p.metal);
    g.strokeCircle(16, 20, 8);
    if (base === 'signet') {
      s.rect(10, 6, 12, 9, p.metal, 2);
      g.fillStyle(p.accent);
      g.fillRect(13, 8.5, 6, 4);
    } else gem(16, 10, 4 + ri * 0.3);
  } else if (base === 'earring' || base === 'hoop') {
    g.lineStyle(3.5, OUTLINE);
    g.beginPath();
    g.arc(16, 9, 5, Math.PI, Math.PI * 2.2);
    g.strokePath();
    g.lineStyle(2, p.trim);
    g.beginPath();
    g.arc(16, 9, 5, Math.PI, Math.PI * 2.2);
    g.strokePath();
    if (base === 'hoop') {
      g.lineStyle(5, OUTLINE);
      g.strokeCircle(16, 21, 7);
      g.lineStyle(3, p.metal);
      g.strokeCircle(16, 21, 7);
      gem(16, 28, 2.5);
    } else gem(16, 21, 5);
  } else {
    g.fillStyle(p.trim);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      g.fillCircle(5 + 22 * t, 6 + Math.sin(t * Math.PI) * 12, 1.2);
    }
    if (base === 'talisman') {
      s.circle(16, 22, 7, p.metal);
      s.circle(16, 22, 4, p.accent);
      g.fillStyle(OUTLINE);
      g.fillCircle(16, 22, 1.6);
    } else gem(16, 22, 5);
  }
}

// ------------------------------------------------------------ Silahlar

function drawWeapon(g, base, p, ri) {
  const s = outlined(g, { width: 1.5 });
  if (base === 'default') {
    s.poly([[7, 2], [10, 8], [10, 34], [4, 34], [4, 8]], 0xb08a5a);
    s.rect(1, 34, 12, 3, 0x6b4423, 1);
    s.rect(5, 37, 4, 10, 0x4a2c18, 1);
  } else if (base === 'sword') {
    const top = ri >= 3 ? 1 : 4;
    s.poly([[9, top], [13, top + 7], [13, 45], [5, 45], [5, top + 7]], p.blade);
    g.fillStyle(shade(p.blade, 0.78));
    g.fillRect(8.2, top + 8, 1.6, 35);
    s.rect(1, 45, 16, 4, ri >= 1 ? p.metal : 0x8a8f99, 2);
    s.rect(7, 49, 4, 10, LEATHER, 1);
    s.circle(9, 61, 2.4, p.accent);
  } else if (base === 'axe') {
    s.rect(15, 6, 4, 56, WOOD, 1.5);
    s.poly([[15, 8], [4, 2], [0, 14], [3, 28], [15, 22]], p.blade);
    g.lineStyle(2, p.light);
    g.lineBetween(2, 5, 1, 25);
    s.poly([[19, 10], [27, 14], [19, 19]], p.dark);
    g.fillStyle(p.accent);
    g.fillRect(15, 30, 4, 3);
    g.fillRect(15, 46, 4, 3);
  } else if (base === 'spear') {
    s.rect(6, 14, 4, 66, WOOD, 1.5);
    s.poly([[8, 0], [13, 13], [8, 19], [3, 13]], p.blade);
    g.fillStyle(p.light, 0.8);
    g.fillTriangle(8, 2, 10, 12, 8, 16);
    s.rect(4, 18, 8, 3, p.metal, 1);
    g.fillStyle(p.accent);
    g.fillTriangle(6, 22, 10, 22, 8, 31);
  } else if (base === 'dagger') {
    s.poly([[7, 0], [11, 8], [10, 28], [4, 28], [3, 8]], p.blade);
    g.fillStyle(shade(p.blade, 0.8));
    g.fillRect(6.4, 6, 1.4, 20);
    s.rect(0, 28, 14, 3, p.metal, 1);
    s.rect(5, 31, 4, 8, LEATHER, 1);
    s.circle(7, 40, 2, p.accent);
  } else if (base === 'hammer') {
    s.rect(13, 14, 4, 54, WOOD, 1.5);
    s.rect(1, 3, 28, 14, p.metal, 3);
    g.fillStyle(p.light, 0.7);
    g.fillRect(3, 5, 24, 3);
    g.fillStyle(p.accent);
    g.fillRect(12, 3, 6, 14);
    s.circle(15, 67, 2.2, p.accent);
  }
}

// ------------------------------------------------------------ Üretim

const key = {
  body: (phase) => `hero_body_${phase}`,
  cape: (rarity) => `hero_cape_${rarity ?? 'default'}`,
  armor: (base, rarity) => `hero_armor_${base}_${rarity}`,
  helmet: (base, rarity) => `hero_helmet_${base}_${rarity}`,
  shield: (base, rarity) => `hero_shield_${base}_${rarity}`,
  gloves: (base, rarity) => `hero_gloves_${base}_${rarity}`,
  belt: (base, rarity) => `hero_belt_${base}_${rarity}`,
  boots: (base, rarity, phase) => `hero_boots_${base}_${rarity}_${phase}`,
  necklace: (base, rarity) => `hero_necklace_${base}_${rarity}`,
  earring: (base, rarity) => `hero_earring_${base}_${rarity}`,
  icon: (base, rarity) => `icon_${base}_${rarity}`,
  weapon: (base, rarity) => (base === 'default' ? 'hero_weapon_default' : `hero_weapon_${base}_${rarity}`),
};

// Gövde katmanı çizicileri: yuva → { tip: çizim }
const LAYER_DRAWERS = {
  armor: { plate: drawPlate, robe: drawRobe, leather: drawLeather },
  helmet: { helm: drawHelm, crown: drawCrown, hood: drawHood },
};

export function createCharacterTextures(scene) {
  const { width: W, height: H } = HERO_SIZE;
  make(scene, key.body(0), W, H, (g) => drawBody(g, 0));
  make(scene, key.body(1), W, H, (g) => drawBody(g, 1));
  make(scene, key.cape(null), W, H, (g) => drawCape(g, DEFAULT_CAPE));

  const spec = WEAPON_SPECS.default;
  make(scene, key.weapon('default'), spec.width, spec.height, (g) => drawWeapon(g, 'default'));

  RARITIES.forEach((rarity, ri) => {
    const r = rarity.id;
    const p = GEAR_PALETTE[r];
    make(scene, key.cape(r), W, H, (g) => drawCape(g, p.cloth));
    for (const [slot, drawers] of Object.entries(LAYER_DRAWERS)) {
      for (const [base, draw] of Object.entries(drawers)) make(scene, key[slot](base, r), W, H, (g) => draw(g, p, ri));
    }
    for (const base of ['buckler', 'tower']) make(scene, key.shield(base, r), W, H, (g) => drawShield(g, base, p, ri));
    for (const base of ['leatherGloves', 'gauntlet']) make(scene, key.gloves(base, r), W, H, (g) => drawGloves(g, base, p, ri));
    for (const base of ['belt', 'sash']) make(scene, key.belt(base, r), W, H, (g) => drawBelt(g, base, p, ri));
    for (const base of ['boots', 'greaves']) {
      for (const phase of [0, 1]) make(scene, key.boots(base, r, phase), W, H, (g) => drawBoots(g, base, p, ri, phase));
    }
    for (const base of ['necklace', 'talisman']) make(scene, key.necklace(base, r), W, H, (g) => drawNecklace(g, base, p));
    for (const base of ['earring', 'hoop']) make(scene, key.earring(base, r), W, H, (g) => drawEarring(g, base, p));
    for (const base of ['ring', 'signet', 'earring', 'hoop', 'necklace', 'talisman']) make(scene, key.icon(base, r), 32, 32, (g) => drawJewelIcon(g, base, p, ri));
    for (const base of ['sword', 'axe', 'spear', 'dagger', 'hammer']) {
      const ws = WEAPON_SPECS[base];
      make(scene, key.weapon(base, r), ws.width, ws.height, (g) => drawWeapon(g, base, p, ri));
    }
  });
}

/**
 * Kuşanılı eşya özetinden (EquipmentSystem.appearance) çizilecek katmanları üretir.
 * Oyundaki Player ve arayüzdeki karakter önizlemesi aynı fonksiyonu kullanır.
 * Sıra (arkadan öne): cape, shield, body, boots, armor, belt, gloves, necklace, earring, helmet, silah.
 */
export function heroLayers(appearance) {
  const { weapon, armor, helmet, shield, gloves, belt, boots, necklace, earring, ring } = appearance;
  const weaponBase = weapon ? weapon.base : 'default';
  const weaponPalette = weapon ? GEAR_PALETTE[weapon.rarity] : null;
  const glowStrength = weapon ? Math.min(0.9, (weapon.rarityIndex >= 2 ? 0.2 + weapon.rarityIndex * 0.14 : 0) + weapon.enhance * 0.04) : 0;
  const layer = (slot, item) => (item ? key[slot](item.base, item.rarity) : null);

  return {
    cape: key.cape(armor?.rarity ?? null),
    shield: layer('shield', shield),
    body: key.body(0),
    boots: boots ? [key.boots(boots.base, boots.rarity, 0), key.boots(boots.base, boots.rarity, 1)] : null,
    armor: layer('armor', armor),
    belt: layer('belt', belt),
    gloves: layer('gloves', gloves),
    necklace: layer('necklace', necklace),
    earring: layer('earring', earring),
    helmet: layer('helmet', helmet),
    ringGlow: ring ? GEAR_PALETTE[ring.rarity].accent : null,
    weapon: {
      key: key.weapon(weaponBase, weapon?.rarity),
      spec: WEAPON_SPECS[weaponBase],
      glow: glowStrength > 0 ? { color: weaponPalette.accent, alpha: glowStrength } : null,
      sparkle: weapon?.rarityIndex === 4 ? weaponPalette.light : null,
    },
  };
}

// Envanter ikonları: gövde katmanlarının ilgili bölgesi kırpılır [x, y, w, h] (64x80 tuvalde)
const ICON_CROPS = {
  helmet: [14, 0, 36, 32],
  armor: [13, 28, 40, 40],
  shield: [4, 28, 30, 36],
  gloves: [32, 37, 18, 18],
  belt: [17, 42, 34, 24],
  boots: [18, 54, 30, 26],
};
const JEWELRY = new Set(['necklace', 'earring', 'ring']);

/**
 * Bir eşyanın envanter görseli: hangi doku, hangi bölge.
 * @returns {{ key, size: [w, h], crop?: [x, y, w, h], rotate?: number }}
 */
export function itemVisual(slot, base, rarity) {
  if (slot === 'weapon') {
    const ws = WEAPON_SPECS[base] ?? WEAPON_SPECS.sword;
    return { key: key.weapon(base, rarity), size: [ws.width, ws.height], rotate: 45 };
  }
  if (JEWELRY.has(slot)) return { key: key.icon(base, rarity), size: [32, 32] };
  const keyName = slot === 'boots' ? key.boots(base, rarity, 0) : key[slot](base, rarity);
  return { key: keyName, size: [HERO_SIZE.width, HERO_SIZE.height], crop: ICON_CROPS[slot] };
}
