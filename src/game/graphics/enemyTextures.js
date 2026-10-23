import { ENEMY_SPRITES } from '../../data/sprites.js';
import { shade } from '../../utils/color.js';
import { OUTLINE, eyes, glowEyes, make, outlined } from './draw.js';
import { drawCultist, drawGhost, drawGriffin, drawHarpy, drawShadowLord, drawStormDragon, drawWraith } from './enemyTexturesExtra.js';

// Düşman çizimleri. Hepsi sola (oyuncuya) bakar; ayaklar tuvalin altındadır.
// phase: 0/1 → iki karelik yürüme/kanat animasyonu (ENEMY_SPRITES'ta frames: 2 olanlar).

/** Üst yarım elips noktaları (mantar şapkası gibi kubbeler için). */
function dome(cx, cy, rx, ry, steps = 18) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (i / steps) * Math.PI;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

/** Sol kanat noktalarını x ekseninde aynalayıp sağ kanadı üretir. */
const mirror = (points, width) => points.map(([x, y]) => [width - x, y]);

// ------------------------------------------------------------ Balçıklar, mantar

function drawSlime(g, w, h, _phase, { body, crystals = false }) {
  const s = outlined(g);
  const oy = h - 44;
  if (crystals) {
    s.poly([[18, oy + 14], [21, oy + 1], [26, oy + 14]], 0xe8fbff);
    s.poly([[29, oy + 12], [34, oy - 4], [38, oy + 12]], 0xd0f4ff);
    s.poly([[38, oy + 16], [43, oy + 6], [45, oy + 17]], 0xe8fbff);
  }
  s.ellipse(28, oy + 27, 52, 32, shade(body, 0.8));
  g.fillStyle(body);
  g.fillEllipse(28, oy + 24, 46, 26);
  g.fillStyle(0xffffff, 0.5);
  g.fillEllipse(38, oy + 15, 12, 6);
  g.fillStyle(0xffffff, 0.25);
  g.fillEllipse(14, oy + 30, 6, 10);
  eyes(g, [[18, oy + 24], [31, oy + 24]], 5.5);
  g.fillStyle(OUTLINE);
  g.fillEllipse(24, oy + 34, 8, 4);
}

function drawMushroom(g) {
  const s = outlined(g);
  s.ellipse(17, 50, 11, 7, 0x8a5a3a);
  s.ellipse(31, 50, 11, 7, 0x8a5a3a);
  s.rect(15, 26, 18, 22, 0xf2e6c8, 7);
  eyes(g, [[20, 35], [29, 35]], 3.6);
  g.lineStyle(2, OUTLINE);
  g.lineBetween(16, 29, 22, 31);
  g.lineBetween(33, 29, 27, 31);
  s.poly([...dome(24, 26, 23, 20), [47, 28], [1, 28]], 0xd8342c);
  g.fillStyle(0xe8c9a0);
  g.fillRect(4, 26, 40, 3);
  g.fillStyle(0xffffff);
  for (const [x, y, r] of [[14, 15, 4], [27, 9, 3.5], [36, 17, 3], [21, 21, 2.5], [8, 22, 2]]) g.fillCircle(x, y, r);
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(16, 10, 10, 4);
}

// ------------------------------------------------------------ Uçanlar

function drawBat(g, w, h, phase) {
  const s = outlined(g);
  const wingUp = [[26, 18], [4, 4], [10, 14], [2, 20], [16, 24]];
  const wingDown = [[26, 20], [6, 30], [12, 26], [8, 37], [20, 28]];
  const wing = phase === 0 ? wingUp : wingDown;
  s.poly(wing, 0x4a2c66);
  s.poly(mirror(wing, w), 0x4a2c66);
  g.lineStyle(1.5, 0x2e1a44);
  g.lineBetween(26, 19, wing[1][0] + 2, wing[1][1] + 2);
  g.lineBetween(w - 26, 19, w - wing[1][0] - 2, wing[1][1] + 2);
  s.poly([[25, 13], [24, 2], [30, 10]], 0x5e3a80);
  s.poly([[39, 13], [40, 2], [34, 10]], 0x5e3a80);
  s.ellipse(32, 21, 20, 22, 0x5e3a80);
  g.fillStyle(0x7d55a8);
  g.fillEllipse(32, 25, 10, 10);
  glowEyes(g, [[28, 19], [36, 19]], 2.2, 0xff3b3b);
  g.fillStyle(0xffffff);
  g.fillTriangle(28, 26, 30, 26, 29, 30);
  g.fillTriangle(34, 26, 36, 26, 35, 30);
}

function drawImp(g, w, h, phase) {
  const s = outlined(g);
  const wing = phase === 0 ? [[24, 26], [6, 8], [10, 20], [4, 26], [18, 32]] : [[24, 28], [6, 38], [12, 32], [8, 44], [20, 36]];
  s.poly(wing, 0x7a1a1a);
  s.poly(mirror(wing, w + 4), 0x7a1a1a);
  g.lineStyle(3 + 2, OUTLINE);
  g.lineBetween(36, 42, 50, 46);
  g.lineStyle(3, 0xc42a24);
  g.lineBetween(36, 42, 50, 46);
  s.poly([[50, 42], [57, 46], [50, 50]], 0xc42a24);
  s.ellipse(30, 38, 18, 20, 0xd8342c);
  s.rect(22, 44, 5, 9, 0xb02a24, 2);
  s.rect(32, 44, 5, 9, 0xb02a24, 2);
  s.circle(29, 21, 11, 0xd8342c);
  s.poly([[21, 14], [16, 2], [25, 11]], 0x2a1a1a);
  s.poly([[35, 12], [40, 1], [37, 13]], 0x2a1a1a);
  eyes(g, [[24, 20], [33, 20]], 3.2, { white: 0xffd23f });
  g.fillStyle(OUTLINE);
  g.fillRect(24, 27, 9, 2);
  g.fillStyle(0xffffff);
  g.fillTriangle(25, 27, 27, 27, 26, 30);
  g.fillTriangle(30, 27, 32, 27, 31, 30);
}

// ------------------------------------------------------------ İki ayaklılar

function walkLegs(phase, a, b) {
  return phase === 0 ? [a, b] : [b, a];
}

function drawGoblin(g, w, h, phase) {
  const s = outlined(g);
  const [l1, l2] = walkLegs(phase, [16, 48, 14], [28, 50, 12]);
  for (const [x, y, len] of [l1, l2]) {
    s.rect(x, y, 7, len, 0x3d5a2a, 2);
    s.ellipse(x + 2, h - 3, 12, 6, 0x5a3a1a);
  }
  s.rect(13, 30, 25, 21, 0x7a5230, 6);
  g.fillStyle(0x5a3a1a);
  g.fillRect(13, 44, 25, 4);
  g.fillStyle(0xd4a017);
  g.fillRect(23, 44, 4, 4);
  s.poly([[6, 46], [2, 25], [8, 24], [10, 44]], 0xcfd6de);
  s.rect(3, 42, 10, 3, 0x6b4423, 1);
  s.rect(8, 33, 8, 12, 0x7cc35a, 3);
  s.poly([[14, 17], [0, 9], [15, 25]], 0x7cc35a);
  s.poly([[37, 17], [50, 10], [36, 25]], 0x6aad4a);
  s.circle(25, 20, 13, 0x7cc35a);
  g.fillStyle(0x8fd46a);
  g.fillCircle(20, 14, 4);
  eyes(g, [[19, 19], [30, 19]], 3.6, { white: 0xffe066 });
  g.fillStyle(0x5a8a3a);
  g.fillEllipse(23, 25, 6, 4);
  g.fillStyle(OUTLINE);
  g.fillRect(18, 29, 12, 2);
  g.fillStyle(0xffffff);
  g.fillTriangle(19, 29, 22, 29, 20.5, 32);
  g.fillTriangle(26, 29, 29, 29, 27.5, 32);
}

function drawSkeleton(g, w, h, phase, { bone = 0xf0f0e6, glow = 0xff4040 } = {}) {
  const s = outlined(g);
  const legs = phase === 0 ? [[19, 46, 14, 65], [27, 46, 30, 63]] : [[19, 46, 21, 63], [27, 46, 24, 65]];
  for (const [x1, y1, x2, y2] of legs) {
    s.line(x1, y1, x2, y2, 4, bone);
    s.rect(x2 - 4, y2 - 3, 8, 3, bone, 1);
  }
  s.rect(15, 41, 17, 5, bone, 2);
  s.line(23, 27, 23, 43, 4, bone);
  for (let i = 0; i < 3; i++) s.line(14, 30 + i * 5, 32, 30 + i * 5, 3, bone);
  s.line(32, 29, 36, 42, 3.5, bone);
  s.poly([[9, 45], [5, 22], [8, 21], [12, 44]], 0x9a8f80);
  s.rect(5, 43, 10, 3, 0x6b4423, 1);
  s.line(15, 29, 10, 44, 3.5, bone);
  s.circle(23, 15, 12, bone);
  s.rect(17, 22, 12, 6, bone, 2);
  g.fillStyle(OUTLINE);
  g.fillCircle(18, 15, 3.8);
  g.fillCircle(28, 15, 3.8);
  glowEyes(g, [[18, 15], [28, 15]], 1.4, glow);
  g.fillStyle(OUTLINE);
  for (let i = 0; i < 4; i++) g.fillRect(18 + i * 3, 24, 1.2, 4);
}

function drawMummy(g, w, h, phase) {
  const s = outlined(g);
  const wrap = 0xe8dcc0;
  const [l1, l2] = walkLegs(phase, [16, 50, 16], [27, 52, 14]);
  for (const [x, y, len] of [l1, l2]) s.rect(x, y, 8, len, wrap, 3);
  s.rect(14, 28, 23, 26, wrap, 6);
  g.lineStyle(1.5, 0xb8a888);
  for (let i = 0; i < 6; i++) g.lineBetween(14, 31 + i * 4, 37, 29 + i * 4 + (i % 2 ? 3 : -1));
  s.rect(1, 31, 18, 7, wrap, 3);
  g.lineBetween(4, 31, 6, 38);
  g.lineBetween(10, 31, 12, 38);
  s.poly([[37, 34], [46, 44], [42, 46], [36, 39]], wrap);
  s.circle(25, 17, 12, wrap);
  g.lineStyle(1.5, 0xb8a888);
  g.lineBetween(14, 12, 36, 10);
  g.lineBetween(14, 22, 36, 24);
  g.fillStyle(0x2a2418);
  g.fillRect(15, 14, 20, 6);
  glowEyes(g, [[20, 17], [29, 17]], 2, 0x7dff6a);
}

function drawYeti(g, w, h, phase) {
  const s = outlined(g);
  const fur = 0xf0f4ff;
  const skin = 0x9fb8d8;
  const [l1, l2] = walkLegs(phase, [22, 62, 18], [42, 64, 16]);
  for (const [x, y, len] of [l1, l2]) {
    s.rect(x, y, 13, len, fur, 5);
    s.ellipse(x + 6, h - 3, 16, 6, skin);
  }
  s.ellipse(38, 46, 48, 44, fur);
  g.fillStyle(0xdbe6f5);
  g.fillEllipse(36, 50, 28, 26);
  g.fillStyle(0xffffff);
  for (let i = 0; i < 5; i++) g.fillTriangle(18 + i * 9, 27, 22 + i * 9, 21, 26 + i * 9, 28);
  s.ellipse(12, 48, 14, 34, fur);
  s.circle(11, 64, 7, skin);
  s.ellipse(62, 46, 12, 28, shade(fur, 0.93));
  s.circle(35, 19, 15, fur);
  s.poly([[24, 9], [20, 0], [28, 6]], 0xcfd6de);
  s.poly([[44, 8], [48, 0], [41, 5]], 0xcfd6de);
  s.ellipse(31, 22, 20, 16, skin);
  eyes(g, [[26, 19], [35, 19]], 3, { pupil: 0x123456 });
  g.fillStyle(OUTLINE);
  g.fillEllipse(30, 27, 10, 5);
  g.fillStyle(0xffffff);
  g.fillTriangle(26, 25, 28, 25, 27, 29);
  g.fillTriangle(32, 25, 34, 25, 33, 29);
}

// ------------------------------------------------------------ Dört ayaklılar

const WOLF_PALETTES = {
  wolf: { fur: 0x8a8f99, belly: 0xc9ccd2, eye: 0xffd23f },
  frostWolf: { fur: 0xbfe0ff, belly: 0xffffff, eye: 0x5ff3ff },
  hellhound: { fur: 0x3a2226, belly: 0x5a2a2a, eye: 0xffb347, mane: true },
  shadowWolf: { fur: 0x3a3352, belly: 0x5a5078, eye: 0xd06bff },
};

function drawWolf(g, w, h, phase, pal) {
  const s = outlined(g);
  const oy = h - 50;
  const legDark = shade(pal.fur, 0.8);
  const legSets = phase === 0 ? [[20, 18], [31, 14], [53, 14], [63, 18]] : [[20, 14], [31, 18], [53, 18], [63, 14]];
  for (const [x, len] of legSets) {
    s.rect(x, oy + 32, 6, len, legDark, 2);
    s.ellipse(x + 2, oy + 32 + len, 9, 4, shade(pal.fur, 0.6));
  }
  s.poly([[64, oy + 24], [w - 1, oy + 10], [w - 4, oy + 26], [66, oy + 32]], pal.fur);
  s.ellipse(45, oy + 28, 48, 22, pal.fur);
  g.fillStyle(pal.belly);
  g.fillEllipse(42, oy + 35, 32, 8);
  if (pal.mane) {
    for (let i = 0; i < 6; i++) {
      const x = 22 + i * 8;
      s.poly([[x, oy + 20], [x + 4, oy + 4 - (i % 2) * 4], [x + 8, oy + 20]], 0xff7a2b);
      g.fillStyle(0xffd24d);
      g.fillTriangle(x + 2, oy + 20, x + 4, oy + 10, x + 6, oy + 20);
    }
  }
  s.poly([[14, oy + 11], [17, oy], [23, oy + 12]], shade(pal.fur, 0.85));
  s.circle(18, oy + 20, 11, pal.fur);
  s.poly([[10, oy + 17], [0, oy + 22], [2, oy + 28], [14, oy + 28]], pal.fur);
  g.fillStyle(OUTLINE);
  g.fillCircle(2, oy + 22, 2.5);
  s.poly([[19, oy + 13], [22, oy + 1], [27, oy + 13]], pal.fur);
  glowEyes(g, [[13, oy + 18]], 2, pal.eye);
  g.fillStyle(0xffffff);
  g.fillTriangle(5, oy + 27, 7, oy + 27, 6, oy + 30);
  g.fillTriangle(10, oy + 27, 12, oy + 27, 11, oy + 30);
}

function drawScorpion(g, w, h, phase) {
  const s = outlined(g);
  const shell = 0xc77d3a;
  const dark = shade(shell, 0.7);
  const legOffsets = phase === 0 ? [0, 4, 0] : [4, 0, 4];
  legOffsets.forEach((off, i) => {
    const x = 26 + i * 9;
    s.line(x, h - 12, x - 6 + off, h - 1, 2.5, dark);
    s.line(x + 4, h - 12, x + 10 - off, h - 1, 2.5, dark);
  });
  const tail = [[56, 32, 6], [62, 24, 5.5], [64, 15, 5], [60, 7, 4.5], [52, 4, 4]];
  for (const [x, y, r] of tail) s.circle(x, y, r, shell);
  s.poly([[48, 3], [38, 6], [47, 10]], 0x2a1a10);
  s.ellipse(38, 36, 36, 16, shell);
  s.ellipse(56, 35, 14, 12, shell);
  g.fillStyle(shade(shell, 1.2));
  for (let i = 0; i < 3; i++) g.fillRect(28 + i * 9, 30, 6, 3);
  s.line(24, 36, 12, 32, 4, shell);
  s.poly([[12, 27], [0, 24], [5, 31], [0, 38], [12, 36]], shell);
  g.fillStyle(OUTLINE);
  g.fillCircle(22, 33, 1.8);
  g.fillCircle(26, 32, 1.8);
}

// ------------------------------------------------------------ Golemler

const GOLEM_PALETTES = {
  stone: { rock: 0x8a919b, dark: 0x6d737c, glow: 0x5ff3ff, extra: 'moss' },
  frost: { rock: 0xbcd4ea, dark: 0x8aa6c4, glow: 0x9ff3ff, extra: 'snow' },
  magma: { rock: 0x3a2c2e, dark: 0x261c1e, glow: 0xff7a2b, extra: 'lava' },
  bark: { rock: 0x4a3a2e, dark: 0x33281f, glow: 0x7dff9a, extra: 'moss' },
  cloud: { rock: 0xf2f7ff, dark: 0xc6d6ea, glow: 0x5fb4ff, extra: 'snow' },
};

function drawGolem(g, w, h, _phase, pal) {
  const s = outlined(g);
  const oy = h - 78;
  s.rect(16, oy + 58, 15, 20, pal.dark, 4);
  s.rect(41, oy + 58, 15, 20, pal.dark, 4);
  s.rect(10, oy + 26, 52, 36, pal.rock, 10);
  s.circle(12, oy + 32, 10, pal.rock);
  s.circle(60, oy + 32, 10, pal.rock);
  s.rect(1, oy + 36, 14, 26, pal.dark, 6);
  s.rect(57, oy + 36, 14, 26, pal.dark, 6);
  s.rect(23, oy + 6, 26, 22, pal.rock, 7);
  g.fillStyle(shade(pal.rock, 1.18));
  g.fillRoundedRect(14, oy + 29, 12, 8, 4);
  glowEyes(g, [[30, oy + 16], [42, oy + 16]], 3, pal.glow);

  const cracks = [[[24, oy + 34], [31, oy + 42], [27, oy + 52]], [[46, oy + 30], [52, oy + 40], [47, oy + 48]]];
  g.lineStyle(pal.extra === 'lava' ? 3 : 2, pal.extra === 'lava' ? pal.glow : pal.dark);
  for (const crack of cracks) g.strokePoints(crack.map(([x, y]) => ({ x, y })));
  if (pal.extra === 'lava') {
    g.fillStyle(pal.glow);
    g.fillCircle(36, oy + 44, 5);
    g.fillStyle(0xffe08a);
    g.fillCircle(36, oy + 44, 2.5);
  } else if (pal.extra === 'snow') {
    g.fillStyle(0xffffff);
    g.fillEllipse(36, oy + 8, 26, 7);
    g.fillEllipse(12, oy + 24, 18, 6);
    g.fillEllipse(60, oy + 24, 18, 6);
    s.poly([[44, oy + 26], [48, oy + 14], [52, oy + 27]], 0xd6f4ff);
  } else {
    g.fillStyle(0x5f8f4a);
    g.fillEllipse(40, oy + 27, 14, 5);
    g.fillEllipse(58, oy + 24, 10, 4);
  }
}

// ------------------------------------------------------------ Bosslar

function drawOgre(g) {
  const s = outlined(g, { width: 2.5 });
  const skin = 0x6b8e23;
  s.rect(38, 96, 17, 28, shade(skin, 0.8), 5);
  s.rect(63, 96, 17, 28, shade(skin, 0.8), 5);
  s.ellipse(60, 74, 80, 62, skin);
  g.fillStyle(0x8fb043);
  g.fillEllipse(62, 80, 46, 36);
  s.rect(33, 90, 55, 11, 0x6b4423, 3);
  g.fillStyle(0xd4a017);
  g.fillRect(56, 91, 9, 9);
  s.ellipse(98, 70, 20, 40, shade(skin, 0.9));
  s.rect(6, 40, 12, 60, 0x5a3a1a, 4);
  s.circle(12, 38, 15, 0x6b4423);
  for (const [x, y] of [[0, 32], [10, 22], [24, 32], [14, 50]]) s.poly([[x, y], [x + 4, y - 6], [x + 8, y]], 0xcccccc);
  s.ellipse(24, 74, 22, 40, skin);
  s.circle(60, 34, 23, skin);
  s.poly([[42, 22], [34, 0], [49, 15]], 0xf5f0dc);
  s.poly([[78, 22], [86, 0], [71, 15]], 0xf5f0dc);
  eyes(g, [[52, 30], [68, 30]], 5, { white: 0xff5040 });
  g.lineStyle(3, OUTLINE);
  g.lineBetween(44, 22, 56, 26);
  g.lineBetween(76, 22, 64, 26);
  g.fillStyle(OUTLINE);
  g.fillEllipse(60, 44, 22, 7);
  s.poly([[50, 44], [53, 44], [51.5, 34]], 0xf5f0dc);
  s.poly([[67, 44], [70, 44], [68.5, 34]], 0xf5f0dc);
}

function drawPharaoh(g) {
  const s = outlined(g, { width: 2.5 });
  const wrap = 0xe8dcc0;
  const gold = 0xffc94d;
  const blue = 0x2f4fa8;
  s.rect(40, 102, 14, 30, wrap, 5);
  s.rect(60, 102, 14, 30, wrap, 5);
  s.poly([[30, 52], [84, 52], [92, 108], [22, 108]], 0xf2e6c8);
  for (let i = 0; i < 5; i++) {
    g.fillStyle(i % 2 ? blue : gold);
    g.fillRect(26 + i * 2, 70 + i * 8, 62 - i * 4, 4);
  }
  s.poly([[28, 50], [86, 50], [80, 64], [34, 64]], gold);
  g.fillStyle(blue);
  for (let i = 0; i < 6; i++) g.fillRect(34 + i * 8, 52, 4, 10);
  s.rect(6, 20, 6, 98, 0x8a6a2a, 2);
  s.circle(9, 14, 8, gold);
  g.fillStyle(blue);
  g.fillCircle(9, 14, 3.5);
  s.rect(10, 58, 24, 10, wrap, 4);
  s.poly([[32, 20], [82, 20], [92, 60], [22, 60]], gold);
  g.fillStyle(blue);
  for (let i = 0; i < 6; i++) g.fillRect(24 + i * 11, 28 + (i % 2) * 4, 5, 30);
  s.rect(40, 14, 34, 34, 0x3a5a5a, 10);
  s.poly([[42, 18], [57, 2], [72, 18]], gold);
  s.poly([[54, 10], [57, 0], [60, 10]], 0x3fbf5a);
  glowEyes(g, [[50, 28], [64, 28]], 3, 0x6ff7ff);
  s.rect(53, 46, 8, 14, gold, 2);
  g.fillStyle(blue);
  g.fillRect(53, 50, 8, 3);
}

function drawFrostGiant(g) {
  const s = outlined(g, { width: 2.5 });
  const skin = 0x8fb8e8;
  const ice = 0xcff4ff;
  s.rect(42, 100, 18, 28, shade(skin, 0.8), 6);
  s.rect(68, 100, 18, 28, shade(skin, 0.8), 6);
  s.ellipse(64, 74, 78, 60, skin);
  s.rect(40, 88, 50, 12, 0x5a6a8a, 3);
  s.ellipse(104, 70, 20, 42, shade(skin, 0.9));
  s.poly([[30, 52], [22, 26], [42, 44]], ice);
  s.poly([[96, 50], [108, 22], [90, 42]], ice);
  s.poly([[10, 112], [0, 30], [8, 14], [20, 30], [16, 112]], ice);
  g.fillStyle(0xffffff, 0.7);
  g.fillTriangle(6, 100, 8, 24, 11, 100);
  s.ellipse(22, 70, 22, 42, skin);
  s.circle(64, 34, 22, skin);
  g.fillStyle(0xffffff);
  g.fillPoints([{ x: 46, y: 40 }, { x: 82, y: 40 }, { x: 76, y: 66 }, { x: 64, y: 72 }, { x: 52, y: 66 }], true);
  for (const [x, hgt] of [[48, 16], [56, 24], [64, 30], [72, 24], [80, 16]]) s.poly([[x - 4, 16], [x, 16 - hgt], [x + 4, 16]], ice);
  eyes(g, [[56, 30], [71, 30]], 4.5, { pupil: 0x1a4a8a, white: 0xe8fbff });
}

function drawDemon(g) {
  const s = outlined(g, { width: 2.5 });
  const red = 0xb22222;
  const wing = [[46, 48], [2, 6], [12, 30], [0, 44], [16, 54], [6, 72], [40, 66]];
  s.poly(wing, 0x4a0f14);
  s.poly(mirror(wing, 128), 0x4a0f14);
  g.lineStyle(2, 0x2a0a0e);
  g.lineBetween(46, 50, 4, 10);
  g.lineBetween(82, 50, 124, 10);
  g.lineStyle(6, OUTLINE);
  g.lineBetween(84, 100, 116, 120);
  g.lineStyle(4, red);
  g.lineBetween(84, 100, 116, 120);
  s.poly([[114, 114], [126, 124], [112, 126]], red);
  s.rect(42, 96, 17, 34, 0x8e1b1b, 5);
  s.rect(68, 96, 17, 34, 0x8e1b1b, 5);
  s.rect(34, 44, 60, 58, red, 16);
  g.fillStyle(0xd94a2b);
  g.fillRoundedRect(46, 56, 36, 30, 8);
  g.lineStyle(2, 0x8e1b1b);
  g.lineBetween(64, 58, 64, 84);
  g.lineBetween(48, 70, 80, 70);
  s.ellipse(28, 70, 18, 38, red);
  g.fillStyle(0xff7a2b, 0.5);
  g.fillCircle(24, 92, 14);
  g.fillStyle(0xffc14d);
  g.fillCircle(24, 92, 7);
  s.circle(64, 32, 21, 0xc0392b);
  s.poly([[48, 22], [32, 4], [40, 0], [54, 16]], 0x1a1a1a);
  s.poly([[80, 22], [96, 4], [88, 0], [74, 16]], 0x1a1a1a);
  glowEyes(g, [[56, 30], [72, 30]], 3.5, 0xffd23f);
  g.fillStyle(OUTLINE);
  g.fillRect(52, 40, 24, 5);
  g.fillStyle(0xffffff);
  for (let i = 0; i < 5; i++) g.fillTriangle(53 + i * 5, 40, 56 + i * 5, 40, 54.5 + i * 5, 44);
}

// ------------------------------------------------------------ Kayıt

const DRAWERS = {
  enemy_slime: (g, w, h, p) => drawSlime(g, w, h, p, { body: 0x5ad15a }),
  enemy_iceSlime: (g, w, h, p) => drawSlime(g, w, h, p, { body: 0x8fe3ff, crystals: true }),
  enemy_mushroom: drawMushroom,
  enemy_bat: drawBat,
  enemy_imp: drawImp,
  enemy_goblin: drawGoblin,
  enemy_skeleton: drawSkeleton,
  enemy_mummy: drawMummy,
  enemy_yeti: drawYeti,
  enemy_wolf: (g, w, h, p) => drawWolf(g, w, h, p, WOLF_PALETTES.wolf),
  enemy_frostWolf: (g, w, h, p) => drawWolf(g, w, h, p, WOLF_PALETTES.frostWolf),
  enemy_hellhound: (g, w, h, p) => drawWolf(g, w, h, p, WOLF_PALETTES.hellhound),
  enemy_scorpion: drawScorpion,
  enemy_golem: (g, w, h, p) => drawGolem(g, w, h, p, GOLEM_PALETTES.stone),
  enemy_frostGolem: (g, w, h, p) => drawGolem(g, w, h, p, GOLEM_PALETTES.frost),
  enemy_magmaGolem: (g, w, h, p) => drawGolem(g, w, h, p, GOLEM_PALETTES.magma),
  boss_ogre: drawOgre,
  boss_pharaoh: drawPharaoh,
  boss_frost: drawFrostGiant,
  boss_demon: drawDemon,
  enemy_ghost: drawGhost,
  enemy_wraith: drawWraith,
  enemy_cultist: drawCultist,
  enemy_shadowWolf: (g, w, h, p) => drawWolf(g, w, h, p, WOLF_PALETTES.shadowWolf),
  enemy_treant: (g, w, h, p) => drawGolem(g, w, h, p, GOLEM_PALETTES.bark),
  enemy_harpy: drawHarpy,
  enemy_griffin: drawGriffin,
  enemy_cloudGolem: (g, w, h, p) => drawGolem(g, w, h, p, GOLEM_PALETTES.cloud),
  boss_shadow: drawShadowLord,
  boss_dragon: drawStormDragon,
};

export function createEnemyTextures(scene) {
  for (const [key, def] of Object.entries(ENEMY_SPRITES)) {
    const [w, h] = def.size;
    const draw = DRAWERS[key];
    if (!draw) continue;
    if (def.frames) {
      for (let f = 0; f < def.frames; f++) make(scene, `${key}_${f}`, w, h, (g) => draw(g, w, h, f));
    } else {
      make(scene, key, w, h, (g) => draw(g, w, h, 0));
    }
  }
}
