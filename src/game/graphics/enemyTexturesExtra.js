import { shade } from '../../utils/color.js';
import { OUTLINE, eyes, glowEyes, outlined } from './draw.js';

// Gölge Ormanı ve Gök Adaları düşmanları (enemyTextures.js ile aynı kurallar:
// sola bakarlar, ayaklar tuvalin altında, phase 0/1 iki karelik animasyon).

const mirror = (points, width) => points.map(([x, y]) => [width - x, y]);

// ------------------------------------------------------------ Gölge Ormanı

export function drawGhost(g, w, h, phase) {
  const s = outlined(g, { color: 0x1a1030 });
  const body = 0xcfc6ff;
  // Dalgalı etek: iki karede farklı
  const wave = phase === 0 ? [0, 5, 0, 5, 0] : [5, 0, 5, 0, 5];
  const skirt = [[6, 26]];
  for (let i = 0; i < 5; i++) skirt.push([8 + i * 9, h - 4 - wave[i]], [12 + i * 9, h - 10 + wave[i] * 0.4]);
  skirt.push([w - 6, 26]);
  g.fillStyle(0xb7a8ff, 0.25);
  g.fillCircle(w / 2, h / 2, w / 2);
  s.poly([[6, 26], ...skirt.slice(1), [w - 6, 26], [w - 10, 12], [w / 2, 2], [10, 12]], body);
  g.fillStyle(0xffffff, 0.45);
  g.fillEllipse(w / 2 - 6, 14, 14, 8);
  // Uzanan kollar
  s.poly([[6, 28], [-1 + 2, 34], [8, 36]], body);
  g.fillStyle(0x1a1030);
  g.fillEllipse(17, 20, 7, 10);
  g.fillEllipse(31, 20, 7, 10);
  g.fillEllipse(23, 32, 8, 6 + phase * 2);
  g.fillStyle(0x8ff0ff);
  g.fillCircle(16, 19, 1.5);
  g.fillCircle(30, 19, 1.5);
}

export function drawWraith(g, w, h, phase) {
  const s = outlined(g);
  const cloak = 0x2a1f3d;
  const tatters = phase === 0 ? [[12, h], [18, h - 8], [24, h - 1], [30, h - 9], [36, h], [42, h - 6]] : [[12, h - 6], [18, h], [24, h - 8], [30, h - 1], [36, h - 7], [42, h]];
  s.poly([[14, 22], [8, 44], ...tatters, [46, 44], [40, 22]], cloak);
  g.fillStyle(shade(cloak, 1.35));
  g.fillTriangle(26, 26, 20, h - 8, 32, h - 8);
  // Tırpan
  s.line(6, 18, 12, h - 4, 3, 0x5a4a3a);
  s.poly([[6, 16], [-1 + 1, 8], [-1 + 2, 22], [10, 22]], 0xcfd6de);
  g.fillStyle(0x9fe0ff, 0.5);
  g.fillTriangle(2, 10, 1, 20, 6, 18);
  // Kukuleta
  s.poly([[14, 26], [16, 6], [27, 0], [40, 8], [42, 28]], shade(cloak, 1.15));
  g.fillStyle(0x0a0612);
  g.fillEllipse(26, 18, 18, 16);
  glowEyes(g, [[21, 17], [30, 17]], 2, 0x7dff9a);
  // Kemikli el
  s.rect(9, 30 + phase, 7, 4, 0xe8e2d0, 2);
}

export function drawCultist(g, w, h, phase) {
  const s = outlined(g);
  const robe = 0x5a1a3a;
  const legs = phase === 0 ? [[16, 10], [27, 7]] : [[16, 7], [27, 10]];
  for (const [x, len] of legs) s.rect(x, h - len - 2, 7, len, 0x2a1020, 2);
  s.poly([[12, 26], [8, h - 6], [40, h - 6], [36, 26]], robe);
  g.fillStyle(0xd4a017);
  g.fillRect(9, h - 12, 30, 3);
  g.fillStyle(shade(robe, 0.7));
  g.fillTriangle(24, 30, 18, h - 8, 30, h - 8);
  // Asa ve kristal
  s.line(6, 20, 8, h - 2, 3, 0x4a3020);
  s.poly([[6, 6], [1, 14], [6, 22], [11, 14]], 0xb06bff);
  g.fillStyle(0xffffff, 0.7);
  g.fillTriangle(5, 10, 3, 14, 6, 15);
  g.fillStyle(0xb06bff, 0.35);
  g.fillCircle(6, 14, 10 + phase * 2);
  s.rect(6, 28, 10, 6, robe, 3);
  // Kukuleta ve maske
  s.poly([[12, 30], [14, 10], [24, 2], [36, 10], [38, 30]], shade(robe, 1.2));
  s.ellipse(24, 19, 15, 16, 0xe8dcc0);
  g.fillStyle(OUTLINE);
  g.fillTriangle(17, 16, 22, 16, 19.5, 20);
  g.fillTriangle(26, 16, 31, 16, 28.5, 20);
  g.fillStyle(0xb22222);
  g.fillRect(19, 24, 10, 2);
}

// ------------------------------------------------------------ Gök Adaları

export function drawHarpy(g, w, h, phase) {
  const s = outlined(g);
  const feather = 0x8a6ad1;
  const wingUp = [[30, 22], [6, 2], [12, 12], [0, 14], [12, 22], [4, 28], [22, 30]];
  const wingDown = [[30, 24], [6, 40], [12, 34], [0, 34], [12, 28], [4, 24], [22, 22]];
  const wing = phase === 0 ? wingUp : wingDown;
  s.poly(wing, feather);
  s.poly(mirror(wing, w), shade(feather, 0.8));
  // Pençeli bacaklar
  s.line(26, 36, 24, 46, 3, 0xd9a35f);
  s.line(36, 36, 38, 46, 3, 0xd9a35f);
  s.ellipse(32, 30, 18, 18, shade(feather, 1.15));
  g.fillStyle(0xe8dcff);
  g.fillEllipse(32, 34, 10, 10);
  // İnsan yüzü ve saç
  s.circle(32, 14, 8, 0xf2c9a6);
  g.fillStyle(0x4a2a6a);
  g.fillEllipse(34, 8, 18, 8);
  g.fillTriangle(38, 8, 46, 18, 40, 16);
  eyes(g, [[29, 14]], 1.8, { white: 0xffe066, pupil: 0x6a0000 });
  g.fillStyle(0xd9a35f);
  g.fillTriangle(25, 16, 28, 15, 28, 18);
}

export function drawGriffin(g, w, h, phase) {
  const s = outlined(g);
  const fur = 0xd9a35f;
  const legs = phase === 0 ? [[22, 14], [32, 11], [58, 11], [66, 14]] : [[22, 11], [32, 14], [58, 14], [66, 11]];
  for (const [x, len] of legs) s.rect(x, h - len - 2, 6, len, shade(fur, 0.8), 2);
  // Kuyruk
  s.poly([[70, 30], [w - 1, 18], [w - 4, 32], [72, 38]], fur);
  s.ellipse(50, 34, 46, 24, fur);
  // Kanat
  const wing = phase === 0 ? [[44, 26], [62, 2], [70, 10], [76, 6], [74, 22], [58, 32]] : [[44, 26], [64, 12], [72, 18], [80, 16], [74, 30], [58, 34]];
  s.poly(wing, 0xf2ead8);
  g.lineStyle(1.5, 0xc9bca0);
  g.lineBetween(52, 26, 68, 12);
  g.lineBetween(56, 30, 72, 22);
  // Kartal başı
  s.circle(22, 22, 12, 0xffffff);
  s.poly([[12, 20], [0, 26], [10, 30]], 0xffc93d);
  g.fillStyle(OUTLINE);
  g.fillTriangle(2, 26, 6, 26, 6, 28);
  s.poly([[22, 11], [28, 2], [30, 12]], 0xffffff);
  glowEyes(g, [[18, 20]], 2.2, 0xffb347);
}

// ------------------------------------------------------------ Bosslar

export function drawShadowLord(g) {
  const s = outlined(g, { width: 2.5 });
  const cloak = 0x1e1530;
  // Arkadaki gölge alevleri
  g.fillStyle(0x6a3aa8, 0.35);
  for (const [x, y, r] of [[30, 40, 26], [94, 36, 28], [62, 20, 30], [20, 80, 20], [104, 84, 22]]) g.fillCircle(x, y, r);
  // Pelerin
  s.poly([[34, 42], [16, 124], [30, 116], [44, 128], [62, 118], [80, 128], [96, 116], [110, 124], [92, 42]], cloak);
  g.fillStyle(0x3a2a5a);
  g.fillTriangle(63, 50, 44, 120, 82, 120);
  // Zırh göğüs
  s.rect(42, 46, 42, 40, 0x3a3a52, 10);
  g.fillStyle(0xb06bff);
  g.fillCircle(63, 62, 6);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(61, 60, 2);
  // Omuzluklar (dikenli)
  for (const x of [34, 92]) {
    s.circle(x, 48, 13, 0x2a2a40);
    s.poly([[x - 6, 40], [x, 24], [x + 6, 40]], 0x2a2a40);
  }
  // Kılıç
  s.line(14, 30, 26, 112, 5, 0x9a8fff);
  s.rect(10, 100, 22, 5, 0x3a3a52, 2);
  g.fillStyle(0xd9c2ff, 0.6);
  g.fillRect(17, 36, 2, 60);
  s.rect(18, 86, 14, 12, 0x3a3a52, 5);
  // Taçlı miğfer
  s.circle(63, 26, 18, 0x2a2a40);
  for (const [x, y] of [[48, 10], [56, 4], [63, 0], [70, 4], [78, 10]]) s.poly([[x - 4, y + 12], [x, y], [x + 4, y + 12]], 0xb06bff);
  g.fillStyle(0x0a0612);
  g.fillRoundedRect(50, 22, 26, 10, 4);
  glowEyes(g, [[57, 27], [69, 27]], 2.8, 0xd06bff);
}

export function drawStormDragon(g, w, h) {
  const s = outlined(g, { width: 2.5 });
  const scale = 0x3a7fd1;
  const belly = 0xbfe8ff;
  // Kanatlar
  const wing = [[70, 50], [96, 2], [104, 18], [122, 10], [118, 34], [w - 1, 40], [104, 58], [84, 64]];
  s.poly(wing, shade(scale, 0.7));
  g.lineStyle(2, shade(scale, 0.5));
  g.lineBetween(76, 52, 98, 8);
  g.lineBetween(84, 56, 118, 16);
  g.lineBetween(92, 60, 128, 42);
  // Kuyruk
  s.poly([[96, 92], [w - 2, 110], [w - 8, 124], [124, 112], [92, 104]], scale);
  s.poly([[w - 10, 104], [w - 1, 96], [w - 2, 116]], 0xffe066);
  // Bacaklar
  s.rect(52, 100, 16, h - 104, shade(scale, 0.8), 5);
  s.rect(82, 100, 16, h - 104, shade(scale, 0.8), 5);
  for (const x of [52, 82]) for (let i = 0; i < 3; i++) s.poly([[x + i * 5, h - 4], [x + 2 + i * 5, h], [x + 5 + i * 5, h - 4]], 0xffffff);
  // Gövde
  s.ellipse(76, 84, 64, 46, scale);
  g.fillStyle(belly);
  g.fillEllipse(70, 92, 40, 26);
  g.lineStyle(1.5, 0x8fc6e8);
  for (let i = 0; i < 4; i++) g.lineBetween(54, 84 + i * 6, 86, 84 + i * 6);
  // Boyun ve kafa
  s.poly([[50, 70], [34, 36], [52, 30], [66, 66]], scale);
  s.ellipse(32, 34, 40, 28, scale);
  s.poly([[16, 30], [-1 + 2, 38], [4, 46], [22, 44]], scale);
  g.fillStyle(OUTLINE);
  g.fillCircle(6, 39, 1.8);
  g.fillRect(4, 44, 16, 2);
  g.fillStyle(0xffffff);
  for (let i = 0; i < 3; i++) g.fillTriangle(6 + i * 5, 44, 9 + i * 5, 44, 7.5 + i * 5, 48);
  // Boynuzlar ve yele
  s.poly([[36, 22], [44, 0], [48, 20]], 0xffe066);
  s.poly([[26, 22], [24, 4], [32, 20]], 0xffe066);
  for (let i = 0; i < 4; i++) s.poly([[44 + i * 6, 34 + i * 6], [56 + i * 6, 26 + i * 6], [50 + i * 6, 40 + i * 6]], 0x7fe0ff);
  glowEyes(g, [[22, 32]], 3.2, 0xffffff);
  // Şimşek parıltısı
  g.lineStyle(2.5, 0xffe066, 0.9);
  g.strokePoints([{ x: 104, y: 70 }, { x: 112, y: 80 }, { x: 106, y: 82 }, { x: 116, y: 96 }]);
}
