import { GAME_HEIGHT, GAME_WIDTH } from '../../config/balance.js';
import { ZONES } from '../../data/zones.js';
import { shade } from '../../utils/color.js';
import { getWorldScale } from '../renderScale.js';
import { OUTLINE, make, makeCanvas, outlined, seeded, wrapX } from './draw.js';

let TILED = { tiled: true };
let WORLD_IMAGE = {};

// Bölge manzaraları. Her bölge için 5 kayan katman üretilir (uzak → ön plan):
//   far_i, mid_i, near_i, ground_i, fore_i  (ParallaxBackground bunları kaydırır)
// Ayrıca gök cismi (celestial_i), yıldız, kutup ışığı, bulut ve kenar karartması.
// Tüm katmanlar yatayda kesintisiz döşenir: dalgalar tam sayı frekanslı, kenara taşan nesneler
// karşı kenarda da çizilir (wrapX).

export const LAYER_SIZE = {
  far: [1024, 240],
  mid: [1024, 200],
  near: [1024, 150],
  ground: [256, 120],
  fore: [1024, 70],
};

// ------------------------------------------------------------ Ortak çizim parçaları

/** Döşenebilir sırt çizgisi; y(x) fonksiyonu döner (üstüne ağaç dikmek için). */
function ridge(g, w, h, base, waves, color) {
  const yAt = (x) => waves.reduce((y, [amp, freq, phase]) => y + amp * Math.sin((x / w) * Math.PI * 2 * freq + phase), base);
  const points = [];
  for (let x = 0; x <= w; x += 8) points.push({ x, y: yAt(x) });
  points.push({ x: w, y: h }, { x: 0, y: h });
  g.fillStyle(color);
  g.fillPoints(points, true);
  return yAt;
}

function peaks(g, w, h, list, color, { cap = null, capRatio = 0.22, shadeRight = 0.85 } = {}) {
  for (const [px, ph, pw] of list) {
    wrapX(w, px, pw, (x) => {
      g.fillStyle(color);
      g.fillTriangle(x - pw, h, x, h - ph, x + pw, h);
      g.fillStyle(shade(color, shadeRight));
      g.fillTriangle(x, h - ph, x + pw, h, x + pw * 0.15, h);
      if (cap) {
        g.fillStyle(cap);
        const f = capRatio;
        g.fillTriangle(x, h - ph, x - pw * f, h - ph + ph * f, x + pw * f, h - ph + ph * f * 1.1);
      }
    });
  }
}

function pine(g, x, base, size, color, snow = null) {
  g.fillStyle(shade(color, 0.6));
  g.fillRect(x - size * 0.08, base - size * 0.3, size * 0.16, size * 0.3);
  for (let i = 0; i < 3; i++) {
    const y = base - size * 0.25 - i * size * 0.25;
    const half = size * (0.42 - i * 0.1);
    g.fillStyle(shade(color, 1 - i * 0.06));
    g.fillTriangle(x - half, y, x, y - size * 0.4, x + half, y);
    if (snow) {
      g.fillStyle(snow);
      g.fillTriangle(x - half * 0.45, y - size * 0.22, x, y - size * 0.4, x + half * 0.45, y - size * 0.22);
    }
  }
}

function roundTree(g, x, base, size, color) {
  g.fillStyle(shade(color, 0.55));
  g.fillRect(x - size * 0.07, base - size * 0.45, size * 0.14, size * 0.45);
  g.fillStyle(color);
  g.fillCircle(x, base - size * 0.65, size * 0.32);
  g.fillCircle(x - size * 0.22, base - size * 0.5, size * 0.24);
  g.fillCircle(x + size * 0.22, base - size * 0.52, size * 0.24);
  g.fillStyle(shade(color, 1.15));
  g.fillCircle(x - size * 0.08, base - size * 0.74, size * 0.12);
}

function cactus(g, x, base, size, color) {
  const s = outlined(g);
  const w = size * 0.22;
  s.rect(x - w / 2, base - size, w, size, color, w / 2);
  s.rect(x - w * 2, base - size * 0.65, w * 0.8, size * 0.35, color, w * 0.4);
  s.rect(x - w * 2, base - size * 0.38, w * 2, w * 0.7, color, w * 0.3);
  s.rect(x + w * 1.2, base - size * 0.8, w * 0.8, size * 0.32, color, w * 0.4);
  s.rect(x, base - size * 0.55, w * 2, w * 0.7, color, w * 0.3);
  g.fillStyle(shade(color, 1.2));
  g.fillRect(x - w * 0.15, base - size * 0.92, w * 0.25, size * 0.8);
}

function rock(g, x, base, size, color) {
  const s = outlined(g);
  s.poly([[x - size, base], [x - size * 0.7, base - size * 0.6], [x, base - size * 0.8], [x + size * 0.8, base - size * 0.4], [x + size, base]], color);
  g.fillStyle(shade(color, 1.25));
  g.fillTriangle(x - size * 0.6, base - size * 0.5, x - size * 0.1, base - size * 0.7, x - size * 0.2, base - size * 0.35);
}

function crystal(g, x, base, size, color) {
  const s = outlined(g);
  const shard = (dx, h, lean) =>
    s.poly([[x + dx - size * 0.18, base], [x + dx + lean, base - h], [x + dx + size * 0.18, base]], color);
  shard(-size * 0.3, size * 0.7, -size * 0.12);
  shard(size * 0.3, size * 0.6, size * 0.1);
  shard(0, size, 0);
  g.fillStyle(0xffffff, 0.75);
  g.fillTriangle(x - size * 0.05, base - size * 0.1, x, base - size * 0.95, x + size * 0.04, base - size * 0.1);
}

function bush(g, x, base, size, color) {
  g.fillStyle(shade(color, 0.7));
  g.fillCircle(x - size * 0.5, base - size * 0.35, size * 0.45);
  g.fillCircle(x + size * 0.5, base - size * 0.35, size * 0.45);
  g.fillStyle(color);
  g.fillCircle(x, base - size * 0.55, size * 0.6);
  g.fillStyle(shade(color, 1.2));
  g.fillCircle(x - size * 0.2, base - size * 0.75, size * 0.2);
}

function skull(g, x, base, size) {
  const s = outlined(g, { width: 1.5 });
  s.circle(x, base - size * 0.6, size * 0.5, 0xe8e0d0);
  s.rect(x - size * 0.3, base - size * 0.35, size * 0.6, size * 0.35, 0xe8e0d0, 2);
  g.fillStyle(OUTLINE);
  g.fillCircle(x - size * 0.2, base - size * 0.62, size * 0.13);
  g.fillCircle(x + size * 0.2, base - size * 0.62, size * 0.13);
}

function grassBlades(g, w, top, color, rng, density = 6) {
  g.fillStyle(color);
  for (let x = 2; x < w - 4; x += density) {
    const h = 4 + rng() * 7;
    g.fillTriangle(x, top + 2, x + 1.5 + rng(), top - h, x + 3, top + 2);
  }
}

function strata(g, w, y, color, amp, freq) {
  const points = [];
  for (let x = 0; x <= w; x += 8) points.push({ x, y: y + amp * Math.sin((x / w) * Math.PI * 2 * freq) });
  g.lineStyle(3, color, 0.6);
  g.strokePoints(points);
}

function scatter(rng, w, count, margin, fn) {
  for (let i = 0; i < count; i++) {
    const x = margin + rng() * (w - margin * 2);
    fn(x, rng);
  }
}

// ------------------------------------------------------------ Bölge ressamları

const PAINTERS = {
  forest: {
    far(g, w, h, z) {
      peaks(g, w, h, [[40, 130, 140], [190, 175, 160], [360, 140, 150], [520, 190, 170], [700, 150, 150], [870, 180, 165]], shade(z.mountain, 1.18), { cap: 0xf4f8ff });
      peaks(g, w, h, [[110, 120, 130], [280, 160, 150], [450, 110, 120], [620, 150, 150], [800, 125, 140], [960, 140, 130]], z.mountain, { cap: 0xf4f8ff });
    },
    mid(g, w, h, z, rng) {
      const back = ridge(g, w, h, 95, [[18, 2, 0], [9, 5, 1]], shade(z.hill, 0.85));
      for (let x = 10; x < w; x += 22 + rng() * 30) {
        const size = 34 + rng() * 26;
        wrapX(w, x, 30, (px) => (rng() > 0.45 ? pine(g, px, back(px) + 6, size, shade(z.hill, 0.62)) : roundTree(g, px, back(px) + 8, size, shade(z.hill, 0.72))));
      }
      ridge(g, w, h, 150, [[10, 3, 2], [5, 7, 0]], z.hill);
    },
    near(g, w, h, z, rng) {
      for (let x = 20; x < w; x += 60 + rng() * 90) {
        wrapX(w, x, 40, (px) => bush(g, px, h - 10, 20 + rng() * 16, shade(z.grass, 0.78)));
      }
      scatter(rng, w, 7, 30, (x) => roundTree(g, x, h - 8, 110 + rng() * 30, shade(z.hill, 0.55)));
      scatter(rng, w, 10, 10, (x) => {
        const s = outlined(g, { width: 1.5 });
        s.rect(x - 2, h - 22, 4, 10, 0xf2e6c8, 1);
        s.ellipse(x, h - 22, 14, 8, rng() > 0.5 ? 0xe24c3c : 0xd9a35f);
      });
    },
    ground(g, w, h, z, rng) {
      g.fillStyle(z.dirt);
      g.fillRect(0, 14, w, h - 14);
      strata(g, w, 55, shade(z.dirt, 0.8), 4, 2);
      strata(g, w, 92, shade(z.dirt, 0.72), 3, 3);
      g.fillStyle(z.grass);
      g.fillRect(0, 6, w, 14);
      g.fillStyle(shade(z.grass, 0.75));
      g.fillRect(0, 18, w, 4);
      grassBlades(g, w, 8, z.grass, rng);
      grassBlades(g, w, 10, shade(z.grass, 1.15), rng, 11);
      scatter(rng, w, 6, 12, (x) => rock(g, x, 40 + rng() * 60, 5 + rng() * 5, shade(z.dirt, 1.25)));
    },
    fore(g, w, h, z, rng) {
      for (let x = 10; x < w; x += 30 + rng() * 60) {
        wrapX(w, x, 20, (px) => {
          g.fillStyle(shade(z.grass, 0.5));
          for (let i = 0; i < 6; i++) g.fillTriangle(px + i * 4 - 12, h, px + i * 4 - 10 + rng() * 4, h - 18 - rng() * 22, px + i * 4 - 6, h);
        });
      }
      scatter(rng, w, 6, 20, (x) => rock(g, x, h, 10 + rng() * 8, shade(z.dirt, 0.6)));
    },
  },

  desert: {
    far(g, w, h, z) {
      ridge(g, w, h, 150, [[22, 2, 0.5], [12, 3, 2]], shade(z.mountain, 1.25));
      for (const [px, size] of [[260, 120], [360, 80], [760, 100]]) {
        g.fillStyle(shade(z.mountain, 1.05));
        g.fillTriangle(px - size, 200, px, 200 - size * 0.9, px + size, 200);
        g.fillStyle(shade(z.mountain, 0.8));
        g.fillTriangle(px, 200 - size * 0.9, px + size, 200, px + size * 0.2, 200);
      }
      ridge(g, w, h, 190, [[14, 3, 1], [8, 5, 0]], shade(z.mountain, 1.1));
    },
    mid(g, w, h, z, rng) {
      for (let x = 40; x < w; x += 140 + rng() * 120) {
        const mw = 60 + rng() * 70;
        const mh = 50 + rng() * 60;
        wrapX(w, x, mw, (px) => {
          g.fillStyle(shade(z.mountain, 0.95));
          g.fillPoints([{ x: px - mw, y: h }, { x: px - mw * 0.7, y: h - mh }, { x: px + mw * 0.7, y: h - mh }, { x: px + mw, y: h }], true);
          g.fillStyle(shade(z.mountain, 0.8));
          g.fillRect(px - mw * 0.75, h - mh * 0.6, mw * 1.5, 4);
          g.fillRect(px - mw * 0.85, h - mh * 0.3, mw * 1.7, 4);
        });
      }
      ridge(g, w, h, 160, [[10, 2, 1], [6, 6, 0]], z.hill);
      scatter(rng, w, 8, 20, (x) => cactus(g, x, 168, 18 + rng() * 10, 0x4e8a44));
    },
    near(g, w, h, z, rng) {
      for (let x = 30; x < w; x += 110 + rng() * 140) wrapX(w, x, 40, (px) => cactus(g, px, h - 10, 50 + rng() * 40, 0x5a9a4a));
      scatter(rng, w, 6, 20, (x) => rock(g, x, h - 10, 12 + rng() * 10, shade(z.dirt, 1.2)));
      scatter(rng, w, 4, 20, (x) => skull(g, x, h - 12, 12));
    },
    ground(g, w, h, z, rng) {
      g.fillStyle(z.dirt);
      g.fillRect(0, 14, w, h - 14);
      g.fillStyle(z.grass);
      g.fillRect(0, 6, w, 16);
      g.lineStyle(2, shade(z.grass, 0.85), 0.8);
      for (let i = 0; i < 8; i++) {
        const x = rng() * w;
        g.beginPath();
        g.arc(x, 34 + rng() * 60, 14 + rng() * 10, Math.PI * 1.15, Math.PI * 1.85);
        g.strokePath();
      }
      strata(g, w, 70, shade(z.dirt, 0.85), 5, 2);
      scatter(rng, w, 10, 6, (x) => {
        g.fillStyle(shade(z.dirt, 0.75));
        g.fillCircle(x, 30 + rng() * 80, 1.5 + rng() * 2);
      });
    },
    fore(g, w, h, z, rng) {
      scatter(rng, w, 7, 20, (x) => rock(g, x, h, 9 + rng() * 10, shade(z.dirt, 0.65)));
      scatter(rng, w, 5, 20, (x) => {
        g.lineStyle(2, 0x8a6a3a);
        for (let i = 0; i < 5; i++) g.lineBetween(x, h, x - 12 + i * 6, h - 12 - rng() * 10);
      });
    },
  },

  ice: {
    far(g, w, h, z) {
      peaks(g, w, h, [[30, 150, 90], [130, 200, 100], [240, 160, 90], [350, 210, 110], [470, 170, 90], [580, 220, 110], [700, 160, 90], [810, 200, 100], [930, 170, 90]], shade(z.mountain, 1.15), {
        cap: 0xffffff,
        capRatio: 0.35,
      });
      peaks(g, w, h, [[80, 120, 90], [300, 140, 100], [520, 110, 90], [760, 140, 100], [990, 120, 90]], z.mountain, { cap: 0xeef6ff, capRatio: 0.4 });
    },
    mid(g, w, h, z, rng) {
      const back = ridge(g, w, h, 100, [[16, 2, 1], [8, 4, 0]], shade(z.hill, 0.92));
      for (let x = 10; x < w; x += 24 + rng() * 34) {
        const size = 30 + rng() * 26;
        wrapX(w, x, 30, (px) => pine(g, px, back(px) + 6, size, 0x2f5d5a, 0xf4fbff));
      }
      ridge(g, w, h, 155, [[9, 3, 2], [5, 6, 1]], z.hill);
    },
    near(g, w, h, z, rng) {
      for (let x = 30; x < w; x += 90 + rng() * 120) wrapX(w, x, 40, (px) => crystal(g, px, h - 10, 30 + rng() * 30, 0x9fe6ff));
      scatter(rng, w, 8, 20, (x) => {
        g.fillStyle(0xffffff);
        g.fillEllipse(x, h - 12, 50 + rng() * 40, 22);
        g.fillStyle(0xd6ecff);
        g.fillEllipse(x + 8, h - 8, 40, 12);
      });
    },
    ground(g, w, h, z, rng) {
      g.fillStyle(z.dirt);
      g.fillRect(0, 14, w, h - 14);
      g.lineStyle(1.5, 0xcfeaff, 0.6);
      for (let i = 0; i < 6; i++) {
        const x = rng() * w;
        const y = 40 + rng() * 60;
        g.lineBetween(x, y, x + 10 + rng() * 14, y + 6 + rng() * 8);
        g.lineBetween(x + 6, y + 3, x + 2, y + 14);
      }
      g.fillStyle(0xffffff);
      g.fillRect(0, 4, w, 18);
      g.fillStyle(0xd6ecff);
      for (let x = 0; x < w; x += 32) g.fillEllipse(x + 16, 22, 34, 8);
      g.fillStyle(0xffffff);
      for (let x = 0; x < w; x += 24) g.fillCircle(x + 12, 5, 6);
    },
    fore(g, w, h, z, rng) {
      for (let x = 20; x < w; x += 80 + rng() * 120) {
        wrapX(w, x, 40, (px) => {
          g.fillStyle(0xffffff);
          g.fillEllipse(px, h, 90 + rng() * 60, 40);
          g.fillStyle(0xd6ecff);
          g.fillEllipse(px + 14, h + 4, 70, 26);
        });
      }
      scatter(rng, w, 4, 20, (x) => crystal(g, x, h - 4, 18 + rng() * 10, 0xbfefff));
    },
  },

  lava: {
    far(g, w, h, z) {
      for (const [px, size] of [[150, 150], [520, 190], [860, 160]]) {
        wrapX(w, px, size * 1.3, (x) => {
          g.fillStyle(shade(z.mountain, 1.25));
          g.fillPoints([{ x: x - size * 1.3, y: h }, { x: x - size * 0.25, y: h - size }, { x: x + size * 0.25, y: h - size }, { x: x + size * 1.3, y: h }], true);
          g.fillStyle(0xff7a2b);
          g.fillEllipse(x, h - size, size * 0.5, 12);
          g.fillStyle(0xffd24d);
          g.fillEllipse(x, h - size, size * 0.25, 5);
          g.lineStyle(4, 0xff5a1f, 0.85);
          g.lineBetween(x - size * 0.1, h - size + 4, x - size * 0.35, h - size * 0.45);
          g.lineBetween(x + size * 0.12, h - size + 4, x + size * 0.4, h - size * 0.3);
          g.fillStyle(0x444444, 0.35);
          g.fillCircle(x + 10, h - size - 26, 18);
          g.fillCircle(x + 26, h - size - 50, 24);
        });
      }
    },
    mid(g, w, h, z, rng) {
      for (let x = 20; x < w; x += 50 + rng() * 70) {
        const sw = 20 + rng() * 20;
        const sh = 60 + rng() * 80;
        wrapX(w, x, sw, (px) => {
          g.fillStyle(shade(z.hill, 0.8));
          g.fillPoints([{ x: px - sw, y: h }, { x: px - sw * 0.3, y: h - sh }, { x: px + sw * 0.2, y: h - sh * 0.85 }, { x: px + sw, y: h }], true);
          g.lineStyle(2, 0xff6a2b, 0.8);
          g.lineBetween(px - sw * 0.2, h - sh * 0.7, px + sw * 0.1, h - sh * 0.3);
        });
      }
      ridge(g, w, h, 165, [[8, 3, 1], [5, 7, 0]], z.hill);
    },
    near(g, w, h, z, rng) {
      for (let x = 40; x < w; x += 120 + rng() * 140) {
        wrapX(w, x, 50, (px) => {
          g.fillStyle(0xff5a1f);
          g.fillEllipse(px, h - 12, 80, 18);
          g.fillStyle(0xffc14d);
          g.fillEllipse(px, h - 13, 50, 9);
        });
      }
      scatter(rng, w, 7, 20, (x) => {
        const s = outlined(g);
        const size = 30 + rng() * 40;
        s.poly([[x - size * 0.25, h - 8], [x - size * 0.05, h - 8 - size], [x + size * 0.25, h - 8]], 0x2a1a2e);
        g.fillStyle(0x6a4a8a, 0.7);
        g.fillTriangle(x - size * 0.12, h - 12, x - size * 0.04, h - size, x, h - 12);
      });
      scatter(rng, w, 3, 20, (x) => skull(g, x, h - 10, 12));
    },
    ground(g, w, h, z, rng) {
      g.fillStyle(z.dirt);
      g.fillRect(0, 12, w, h - 12);
      g.lineStyle(3, 0xff5a1f, 0.9);
      for (let i = 0; i < 4; i++) {
        let x = rng() * w;
        let y = 30 + rng() * 40;
        const pts = [{ x, y }];
        for (let k = 0; k < 4; k++) {
          x += 10 + rng() * 14;
          y += -8 + rng() * 16;
          pts.push({ x, y });
        }
        g.strokePoints(pts);
      }
      g.fillStyle(z.grass);
      g.fillRect(0, 6, w, 12);
      g.fillStyle(shade(z.grass, 0.7));
      g.fillRect(0, 16, w, 4);
      scatter(rng, w, 12, 4, (x) => {
        g.fillStyle(0xff8a3d, 0.9);
        g.fillCircle(x, 9 + rng() * 6, 1.2);
      });
    },
    fore(g, w, h, z, rng) {
      scatter(rng, w, 8, 20, (x) => {
        rock(g, x, h, 10 + rng() * 10, 0x1e1418);
        g.fillStyle(0xff6a2b, 0.8);
        g.fillRect(x - 6, h - 3, 12, 2);
      });
    },
  },
};

// Gölge Ormanı: çıplak, kıvrık ağaçlar, mor sis ve parlayan mantarlar
function deadTree(g, x, base, size, color, rng) {
  const s = outlined(g, { width: 1.5 });
  s.poly([[x - size * 0.06, base], [x - size * 0.03, base - size * 0.7], [x + size * 0.03, base - size * 0.7], [x + size * 0.07, base]], color);
  const branches = 4;
  for (let i = 0; i < branches; i++) {
    const y = base - size * (0.4 + i * 0.12);
    const dir = i % 2 === 0 ? -1 : 1;
    const len = size * (0.28 - i * 0.04) * (0.8 + rng() * 0.4);
    s.line(x, y, x + dir * len, y - len * 0.6, Math.max(1.5, size * 0.025), color);
  }
}

function glowShroom(g, x, base, size, color) {
  g.fillStyle(color, 0.25);
  g.fillCircle(x, base - size, size * 1.4);
  const s = outlined(g, { width: 1.2 });
  s.rect(x - size * 0.15, base - size, size * 0.3, size, 0xd8d0e8, 1);
  s.ellipse(x, base - size, size * 1.2, size * 0.7, color);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(x - size * 0.2, base - size * 1.05, size * 0.12);
}

PAINTERS.shadow = {
  far(g, w, h, z) {
    peaks(g, w, h, [[60, 150, 150], [260, 120, 130], [430, 175, 170], [640, 130, 140], [820, 165, 160], [990, 130, 140]], shade(z.mountain, 1.25));
    // Uzak harabe kulesi
    wrapX(w, 640, 40, (x) => {
      g.fillStyle(shade(z.mountain, 0.8));
      g.fillRect(x - 14, h - 170, 28, 170);
      g.fillTriangle(x - 20, h - 170, x, h - 205, x + 20, h - 170);
      g.fillStyle(0xd06bff, 0.8);
      g.fillRect(x - 3, h - 150, 6, 9);
    });
    peaks(g, w, h, [[150, 110, 140], [360, 100, 120], [540, 130, 150], [760, 105, 130], [930, 115, 140]], z.mountain);
  },
  mid(g, w, h, z, rng) {
    const back = ridge(g, w, h, 110, [[14, 2, 1], [8, 5, 0]], shade(z.hill, 0.9));
    for (let x = 10; x < w; x += 26 + rng() * 34) {
      const size = 60 + rng() * 40;
      wrapX(w, x, 40, (px) => deadTree(g, px, back(px) + 6, size, shade(z.hill, 0.6), rng));
    }
    ridge(g, w, h, 160, [[8, 3, 2], [4, 7, 0]], z.hill);
    // Sis bandı
    g.fillStyle(0x9a7aff, 0.12);
    g.fillRect(0, h - 60, w, 30);
  },
  near(g, w, h, z, rng) {
    scatter(rng, w, 6, 40, (x) => deadTree(g, x, h - 6, 120 + rng() * 40, 0x1a1422, rng));
    scatter(rng, w, 9, 10, (x) => glowShroom(g, x, h - 8, 6 + rng() * 5, rng() > 0.5 ? 0x7dff9a : 0xd06bff));
    scatter(rng, w, 3, 20, (x) => {
      // Mezar taşı
      const s = outlined(g, { width: 1.5 });
      s.rect(x - 8, h - 30, 16, 24, 0x5a566a, 7);
      g.fillStyle(0x3a364a);
      g.fillRect(x - 1, h - 26, 2, 10);
      g.fillRect(x - 5, h - 22, 10, 2);
    });
  },
  ground(g, w, h, z, rng) {
    g.fillStyle(z.dirt);
    g.fillRect(0, 14, w, h - 14);
    strata(g, w, 60, shade(z.dirt, 0.75), 4, 2);
    strata(g, w, 95, shade(z.dirt, 0.65), 3, 3);
    g.fillStyle(z.grass);
    g.fillRect(0, 6, w, 14);
    g.fillStyle(shade(z.grass, 0.7));
    g.fillRect(0, 18, w, 4);
    grassBlades(g, w, 8, z.grass, rng);
    scatter(rng, w, 5, 10, (x) => skull(g, x, 50 + rng() * 50, 6));
    scatter(rng, w, 10, 4, (x) => {
      g.fillStyle(0x7dff9a, 0.7);
      g.fillCircle(x, 10 + rng() * 6, 1);
    });
  },
  fore(g, w, h, z, rng) {
    for (let x = 10; x < w; x += 40 + rng() * 70) {
      wrapX(w, x, 30, (px) => {
        g.fillStyle(0x0c0812);
        for (let i = 0; i < 5; i++) g.fillTriangle(px + i * 5 - 12, h, px + i * 5 - 9 + rng() * 4, h - 16 - rng() * 26, px + i * 5 - 6, h);
      });
    }
    g.fillStyle(0xb7a8ff, 0.1);
    g.fillRect(0, h - 26, w, 26);
  },
};

// Gök Adaları: süzülen adalar, bulut denizi, şelaleler
function island(g, x, y, width, z, rng, { trees = true } = {}) {
  const s = outlined(g, { width: 1.5 });
  const depth = width * 0.55;
  s.poly([[x - width / 2, y], [x - width * 0.3, y + depth * 0.5], [x - width * 0.05, y + depth], [x + width * 0.2, y + depth * 0.6], [x + width / 2, y]], z.dirt);
  g.fillStyle(shade(z.dirt, 0.75));
  g.fillTriangle(x - width * 0.1, y + 4, x - width * 0.05, y + depth * 0.9, x + width * 0.1, y + 4);
  s.rect(x - width / 2, y - 6, width, 9, z.grass, 4);
  if (trees) {
    const count = Math.max(1, Math.round(width / 50));
    for (let i = 0; i < count; i++) roundTree(g, x - width * 0.3 + (i + 0.5) * ((width * 0.6) / count), y - 4, 26 + rng() * 18, shade(z.hill, 0.85));
  }
  // Şelale
  if (rng() > 0.5) {
    g.fillStyle(0xe6f6ff, 0.75);
    g.fillRect(x + width * 0.3, y, 4, depth * 1.6);
    g.fillStyle(0xffffff, 0.4);
    g.fillRect(x + width * 0.3 + 1, y, 1.5, depth * 1.6);
  }
}

function cloudBank(g, w, y, color, alpha, rng, size = 40) {
  g.fillStyle(color, alpha);
  for (let x = -20; x < w + 40; x += size * 0.7 + rng() * size * 0.5) wrapX(w, x, size, (px) => g.fillCircle(px, y + rng() * 10, size * (0.6 + rng() * 0.5)));
  g.fillRect(0, y + 6, w, 200);
}

PAINTERS.sky = {
  far(g, w, h, z, rng) {
    cloudBank(g, w, h - 60, 0xffffff, 0.55, rng, 60);
    for (const [px, py, width] of [[130, 120, 120], [470, 90, 90], [800, 130, 140]]) wrapX(w, px, width, (x) => island(g, x, py, width, { ...z, dirt: shade(z.mountain, 0.9), grass: shade(z.hill, 1.2), hill: z.mountain }, rng, { trees: false }));
  },
  mid(g, w, h, z, rng) {
    for (let x = 60; x < w; x += 220 + rng() * 120) {
      const width = 110 + rng() * 80;
      wrapX(w, x, width, (px) => island(g, px, 70 + rng() * 40, width, z, rng));
    }
    cloudBank(g, w, h - 40, 0xf4f9ff, 0.9, rng, 45);
  },
  near(g, w, h, z, rng) {
    cloudBank(g, w, h - 26, 0xffffff, 0.95, rng, 34);
    scatter(rng, w, 5, 30, (x) => {
      // Rüzgâr değirmeni / taş sütun
      const s = outlined(g, { width: 1.5 });
      s.rect(x - 6, h - 80, 12, 64, 0xe8e2d6, 3);
      s.rect(x - 9, h - 84, 18, 6, 0xd6cbb6, 2);
      g.fillStyle(0xffd23f);
      g.fillCircle(x, h - 90, 3);
    });
  },
  ground(g, w, h, z, rng) {
    // Ada zemini: üstte çimen, altı bulutlara karışan toprak
    g.fillStyle(z.dirt);
    g.fillRect(0, 14, w, h - 14);
    strata(g, w, 50, shade(z.dirt, 0.85), 4, 2);
    g.fillStyle(0xffffff, 0.85);
    for (let x = 0; x < w; x += 18) g.fillCircle(x + rng() * 6, h - 10 + rng() * 6, 14 + rng() * 6);
    g.fillRect(0, h - 8, w, 8);
    g.fillStyle(z.grass);
    g.fillRect(0, 6, w, 14);
    g.fillStyle(shade(z.grass, 0.78));
    g.fillRect(0, 18, w, 4);
    grassBlades(g, w, 8, z.grass, rng);
    grassBlades(g, w, 10, shade(z.grass, 1.12), rng, 10);
    scatter(rng, w, 6, 6, (x) => {
      g.fillStyle(rng() > 0.5 ? 0xffffff : 0xffe066);
      g.fillCircle(x, 9 + rng() * 5, 1.6);
    });
  },
  fore(g, w, h, z, rng) {
    for (let x = 20; x < w; x += 90 + rng() * 120) {
      wrapX(w, x, 50, (px) => {
        g.fillStyle(0xffffff, 0.9);
        g.fillEllipse(px, h, 110 + rng() * 60, 44);
        g.fillStyle(0xe8f4ff);
        g.fillEllipse(px + 16, h + 6, 80, 26);
      });
    }
  },
};

// ------------------------------------------------------------ Gök

function celestial(c, w, h, { body, glow, craters }) {
  const cx = w / 2;
  const cy = h / 2;
  const halo = c.createRadialGradient(cx, cy, w * 0.12, cx, cy, w / 2);
  halo.addColorStop(0, glow);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = halo;
  c.fillRect(0, 0, w, h);
  c.fillStyle = body;
  c.beginPath();
  c.arc(cx, cy, w * 0.16, 0, Math.PI * 2);
  c.fill();
  if (craters) {
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (const [dx, dy, r] of [[-10, -6, 7], [12, 8, 5], [4, -14, 4]]) {
      c.beginPath();
      c.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
      c.fill();
    }
  }
}

const CELESTIALS = {
  forest: { body: '#fff6c8', glow: 'rgba(255,240,170,0.55)' },
  desert: { body: '#ffe08a', glow: 'rgba(255,170,90,0.6)' },
  ice: { body: '#eef4ff', glow: 'rgba(200,220,255,0.45)', craters: true },
  lava: { body: '#ff5a3c', glow: 'rgba(255,60,40,0.5)', craters: true },
  shadow: { body: '#e8d8ff', glow: 'rgba(180,120,255,0.45)', craters: true },
  sky: { body: '#fffbe6', glow: 'rgba(255,230,160,0.7)' },
};

function createSkyTextures(scene) {
  make(scene, 'clouds', 512, 140, (g) => {
    const clusters = [[70, 45, 1], [240, 80, 0.8], [400, 40, 1.1]];
    for (const [x, y, s] of clusters) {
      g.fillStyle(0xdde6f0, 0.9);
      g.fillRoundedRect(x - 10 * s, y + 6 * s, 72 * s, 16 * s, 8 * s);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(x, y, 22 * s);
      g.fillCircle(x + 24 * s, y - 8 * s, 26 * s);
      g.fillCircle(x + 50 * s, y, 20 * s);
      g.fillRoundedRect(x - 10 * s, y, 72 * s, 16 * s, 8 * s);
    }
  }, TILED);

  makeCanvas(scene, 'stars', GAME_WIDTH, 300, (c, w, h) => {
    const rng = seeded(99);
    for (let i = 0; i < 140; i++) {
      c.fillStyle = `rgba(255,255,255,${0.3 + rng() * 0.7})`;
      const r = rng() < 0.1 ? 1.6 : 0.9;
      c.beginPath();
      c.arc(rng() * w, rng() * h, r, 0, Math.PI * 2);
      c.fill();
    }
  }, WORLD_IMAGE);

  makeCanvas(scene, 'aurora', GAME_WIDTH, 200, (c, w, h) => {
    for (let x = 0; x < w; x += 3) {
      const wave = Math.sin(x / 90) * 30 + Math.sin(x / 37) * 12;
      const top = 40 + wave;
      const grad = c.createLinearGradient(0, top, 0, top + 110);
      const a = 0.25 + 0.2 * Math.sin(x / 50);
      grad.addColorStop(0, 'rgba(120,255,200,0)');
      grad.addColorStop(0.3, `rgba(120,255,200,${a})`);
      grad.addColorStop(1, 'rgba(90,160,255,0)');
      c.fillStyle = grad;
      c.fillRect(x, top, 3, 110);
    }
  }, WORLD_IMAGE);

  makeCanvas(scene, 'vignette', GAME_WIDTH, GAME_HEIGHT, (c, w, h) => {
    const grad = c.createRadialGradient(w / 2, h * 0.45, h * 0.35, w / 2, h * 0.45, w * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
  }, WORLD_IMAGE);
}

export function createWorldTextures(scene) {
  // Büyük katmanlar bellek için en fazla 2x üretilir; TileSprite kaynakları kare ayarı almaz
  TILED = { tiled: true, scale: getWorldScale() };
  WORLD_IMAGE = { scale: getWorldScale() };
  createSkyTextures(scene);
  ZONES.forEach((zone, i) => {
    const painter = PAINTERS[zone.id] ?? PAINTERS.forest;
    Object.entries(LAYER_SIZE).forEach(([layer, [w, h]], li) => {
      // Her katmana ayrı tohum: aynı bölge her açılışta aynı görünür
      make(scene, `${layer}_${i}`, w, h, (g) => painter[layer](g, w, h, zone, seeded(1000 + i * 37 + li * 11)), TILED);
    });
    makeCanvas(scene, `celestial_${i}`, 220, 220, (c, w, h) => celestial(c, w, h, CELESTIALS[zone.id] ?? CELESTIALS.forest), WORLD_IMAGE);
  });
}
