import { shade } from '../../utils/color.js';
import { OUTLINE, eyes, make, outlined } from './draw.js';

// Yoldaş çizimleri. Hepsi sağa (koşu yönüne) bakar; ayaklar tuvalin altında.
// İki kare: `pet_<id>_0` / `pet_<id>_1` (yürüme ya da kanat çırpma).
export const PET_SPRITES = {
  wolfPup: { size: [42, 32], flying: false },
  fairy: { size: [30, 30], flying: true },
  dragonWhelp: { size: [46, 36], flying: true },
  goldCat: { size: [38, 30], flying: false },
  wiseOwl: { size: [34, 32], flying: true },
};

const look = 0.35; // göz bebekleri sağa bakar

function drawWolfPup(g, w, h, phase) {
  const s = outlined(g, { width: 1.5 });
  const fur = 0xb8c4d6;
  const legs = phase === 0 ? [[9, 7], [15, 5], [25, 5], [31, 7]] : [[9, 5], [15, 7], [25, 7], [31, 5]];
  for (const [x, len] of legs) s.rect(x, h - 4 - len, 4, len + 2, shade(fur, 0.8), 1.5);
  // Kuyruk
  s.poly([[6, 15], [0, 6 + phase * 2], [3, 18]], fur);
  s.ellipse(20, 18, 28, 14, fur);
  g.fillStyle(0xeef2f8);
  g.fillEllipse(22, 22, 16, 5);
  // Kafa
  s.poly([[29, 6], [31, -1 + 3], [35, 7]], shade(fur, 0.85));
  s.circle(33, 12, 7.5, fur);
  s.poly([[38, 10], [w - 1, 13], [w - 2, 17], [37, 17]], 0xdfe6f0);
  g.fillStyle(OUTLINE);
  g.fillCircle(w - 2, 13.5, 1.6);
  s.poly([[34, 6], [37, -1 + 3], [39, 8]], fur);
  eyes(g, [[35, 11]], 2.1, { look, pupil: 0x2a5fa8 });
  g.fillStyle(0xff9aa8, 0.6);
  g.fillCircle(31, 15, 1.8);
}

function drawFairy(g, w, h, phase) {
  // Yarı saydam kanatlar
  const up = phase === 0;
  g.fillStyle(0xd9fff0, 0.55);
  g.fillEllipse(9, up ? 8 : 14, 14, up ? 16 : 10);
  g.fillEllipse(21, up ? 8 : 14, 14, up ? 16 : 10);
  g.lineStyle(1, 0x7fe0b0, 0.9);
  g.strokeEllipse(9, up ? 8 : 14, 14, up ? 16 : 10);
  g.strokeEllipse(21, up ? 8 : 14, 14, up ? 16 : 10);
  const s = outlined(g, { width: 1.5 });
  // Elbise
  s.poly([[15, 13], [9, 25], [21, 25]], 0x5fd18a);
  g.fillStyle(0x9dffb8);
  g.fillTriangle(15, 15, 12, 23, 18, 23);
  // Kafa ve saç
  s.circle(15, 10, 5.5, 0xffe0c8);
  g.fillStyle(0xffd24d);
  g.fillEllipse(14, 6, 11, 5);
  g.fillCircle(10, 9, 2.5);
  eyes(g, [[17, 10]], 1.4, { look, pupil: 0x2a8a50 });
  // Asa ucunda ışık
  s.line(21, 18, 26, 12, 1.2, 0xc89a5a);
  g.fillStyle(0xfff7a8, 0.5);
  g.fillCircle(26.5, 11.5, 3.5);
  g.fillStyle(0xffffff);
  g.fillCircle(26.5, 11.5, 1.6);
}

function drawDragonWhelp(g, w, h, phase) {
  const s = outlined(g, { width: 1.5 });
  const body = 0xff7a3d;
  const belly = 0xffd07a;
  const wing = phase === 0 ? [[18, 14], [8, 0], [12, 6], [4, 6], [10, 12], [2, 14], [14, 19]] : [[18, 15], [6, 22], [11, 19], [4, 26], [12, 22], [8, 30], [16, 20]];
  s.poly(wing, shade(body, 0.75));
  // Kuyruk
  s.poly([[12, 22], [1, 26], [4, 29], [0, 33], [8, 29], [14, 27]], body);
  s.ellipse(21, 22, 22, 15, body);
  g.fillStyle(belly);
  g.fillEllipse(23, 26, 14, 6);
  // Bacaklar
  s.rect(17, 27, 4, 6, shade(body, 0.8), 1.5);
  s.rect(25, 27, 4, 6, shade(body, 0.8), 1.5);
  // Boyun ve kafa
  s.poly([[26, 18], [32, 10], [36, 14], [30, 22]], body);
  s.ellipse(37, 11, 14, 11, body);
  s.poly([[41, 9], [w - 1, 12], [w - 2, 15], [41, 16]], body);
  g.fillStyle(OUTLINE);
  g.fillCircle(w - 4, 11.5, 1);
  // Boynuzlar
  s.poly([[33, 7], [30, 0], [36, 5]], 0xfff1d0);
  s.poly([[37, 6], [37, -1 + 1], [40, 6]], 0xfff1d0);
  eyes(g, [[39, 10]], 2, { look, pupil: 0x7a1a00, white: 0xfff59a });
  // Sırt dikenleri
  g.fillStyle(0xffd07a);
  for (const x of [15, 20, 25]) g.fillTriangle(x - 2, 15, x, 11, x + 2, 15);
}

function drawGoldCat(g, w, h, phase) {
  const s = outlined(g, { width: 1.5 });
  const fur = 0xffc93d;
  const legs = phase === 0 ? [[8, 6], [14, 4], [23, 4], [29, 6]] : [[8, 4], [14, 6], [23, 6], [29, 4]];
  for (const [x, len] of legs) s.rect(x, h - 4 - len, 4, len + 2, shade(fur, 0.82), 1.5);
  // Kıvrık kuyruk
  g.lineStyle(5, OUTLINE);
  g.beginPath();
  g.arc(6, 10, 6, Math.PI * 0.4, Math.PI * 1.6 + phase * 0.3, false);
  g.strokePath();
  g.lineStyle(2.5, fur);
  g.beginPath();
  g.arc(6, 10, 6, Math.PI * 0.4, Math.PI * 1.6 + phase * 0.3, false);
  g.strokePath();
  s.ellipse(19, 19, 26, 13, fur);
  // Çizgiler
  g.fillStyle(shade(fur, 0.75));
  for (const x of [13, 18, 23]) g.fillRect(x, 13, 2, 5);
  // Kafa ve kulaklar
  s.poly([[26, 7], [27, 0], [31, 5]], fur);
  s.poly([[33, 5], [36, 0], [37, 8]], fur);
  s.circle(31, 11, 7.5, fur);
  g.fillStyle(0xffeab0);
  g.fillEllipse(33, 14, 8, 5);
  eyes(g, [[30, 10], [35, 10]], 1.8, { look, pupil: 0x2f7a2f });
  g.fillStyle(0xff8aa0);
  g.fillTriangle(33, 13, 35, 13, 34, 14.5);
  // Boyunda altın çan
  s.circle(29, 19, 2.2, 0xfff2a0);
}

function drawWiseOwl(g, w, h, phase) {
  const s = outlined(g, { width: 1.5 });
  const feather = 0x7a8ab8;
  const belly = 0xc8d4f0;
  // Kanatlar (çırpma)
  const up = phase === 0;
  s.ellipse(5, up ? 14 : 18, 9, up ? 14 : 8, shade(feather, 0.8));
  s.ellipse(29, up ? 14 : 18, 9, up ? 14 : 8, shade(feather, 0.8));
  // Gövde
  s.ellipse(17, 18, 20, 22, feather);
  g.fillStyle(belly);
  g.fillEllipse(17, 21, 12, 13);
  g.fillStyle(shade(belly, 0.85));
  for (const y of [18, 22]) for (const x of [14, 17, 20]) g.fillCircle(x, y, 1.2);
  // Kulak tüyleri
  s.poly([[11, 10], [9, 1], [14, 7]], feather);
  s.poly([[23, 10], [25, 1], [20, 7]], feather);
  // Büyük gözler
  eyes(g, [[13, 11], [21, 11]], 3.4, { look, pupil: 0x1a2a5a, white: 0xfff4d0 });
  // Gagа
  s.poly([[15, 13], [19, 13], [17, 16]], 0xe8a03d);
  // Ayaklar (uçarken toplu)
  s.rect(14, 27, 3, 4, 0xe8a03d, 1);
  s.rect(18, 27, 3, 4, 0xe8a03d, 1);
}

const DRAWERS = { wolfPup: drawWolfPup, fairy: drawFairy, dragonWhelp: drawDragonWhelp, goldCat: drawGoldCat, wiseOwl: drawWiseOwl };

export function createPetTextures(scene) {
  for (const [id, def] of Object.entries(PET_SPRITES)) {
    const [w, h] = def.size;
    for (let f = 0; f < 2; f++) make(scene, `pet_${id}_${f}`, w, h, (g) => DRAWERS[id](g, w, h, f));
  }
}
