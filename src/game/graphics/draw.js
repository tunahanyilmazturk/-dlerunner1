// Doku üretiminde kullanılan ortak yardımcılar.
import { getRenderScale } from '../renderScale.js';

export const OUTLINE = 0x1a1020; // tüm karakterlerde aynı koyu dış hat → tutarlı çizgi film stili

// Yüksek çözünürlüklü dokular: çizim kodu her zaman mantıksal boyutta (ör. 64x80) çalışır,
// ama doku render ölçeği kadar büyük üretilir. Ardından karenin boyutu mantıksal boyuta
// ayarlanıp UV'ler tüm dokuyu kapsayacak şekilde açılır → sprite mantıksal boyutta,
// fakat yüksek çözünürlükle çizilir (oyun kodunda hiçbir ölçek değişmez).
//
// tiled: true → TileSprite kaynağı. TileSprite karenin kesim alanını kendi desenine kopyaladığı
// için bu dokuların karesi ayarlanmaz; ParallaxBackground onları tileScale ile küçültür.

function fitFrame(scene, key, width, height) {
  const frame = scene.textures.get(key).get();
  frame.setSize(width, height, 0, 0);
  frame.u0 = 0;
  frame.v0 = 0;
  frame.u1 = 1;
  frame.v1 = 1;
}

/** Graphics ile çizip dokuya dönüştürür; anahtar zaten varsa (ör. PNG yüklendiyse) dokunmaz. */
export function make(scene, key, width, height, draw, { scale = getRenderScale(), tiled = false } = {}) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.setScale(scale);
  draw(g, width, height);
  g.generateTexture(key, Math.ceil(width * scale), Math.ceil(height * scale));
  g.destroy();
  if (!tiled) fitFrame(scene, key, width, height);
}

/** Canvas 2D ile çizer: radyal gradyan, yumuşak ışık gibi Graphics'in zor yaptığı işler için. */
export function makeCanvas(scene, key, width, height, draw, { scale = getRenderScale(), tiled = false } = {}) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, Math.ceil(width * scale), Math.ceil(height * scale));
  const context = texture.getContext();
  context.scale(scale, scale);
  draw(context, width, height);
  texture.refresh();
  if (!tiled) fitFrame(scene, key, width, height);
}

/** Sabit tohumlu rastgele sayı: aynı tohum her açılışta aynı manzarayı üretir. */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Dış hatlı şekil çizicileri. Önce koyu dış hat (biraz büyük), sonra dolgu çizilir.
 *   const s = outlined(g); s.circle(10, 10, 6, 0xff0000);
 */
export function outlined(g, { color = OUTLINE, width = 2 } = {}) {
  const w = width;
  return {
    circle(x, y, r, fill) {
      g.fillStyle(color);
      g.fillCircle(x, y, r + w);
      g.fillStyle(fill);
      g.fillCircle(x, y, r);
    },
    ellipse(x, y, ew, eh, fill) {
      g.fillStyle(color);
      g.fillEllipse(x, y, ew + w * 2, eh + w * 2);
      g.fillStyle(fill);
      g.fillEllipse(x, y, ew, eh);
    },
    rect(x, y, rw, rh, fill, radius = 0) {
      g.fillStyle(color);
      if (radius > 0) g.fillRoundedRect(x - w, y - w, rw + w * 2, rh + w * 2, radius + w);
      else g.fillRect(x - w, y - w, rw + w * 2, rh + w * 2);
      g.fillStyle(fill);
      if (radius > 0) g.fillRoundedRect(x, y, rw, rh, radius);
      else g.fillRect(x, y, rw, rh);
    },
    poly(points, fill) {
      const pts = points.map(([x, y]) => ({ x, y }));
      g.lineStyle(w * 2, color);
      g.strokePoints(pts, true, true);
      g.fillStyle(fill);
      g.fillPoints(pts, true);
    },
    /** Kalın dış hatlı çizgi (kemik, sap, bacak). */
    line(x1, y1, x2, y2, thickness, fill) {
      g.lineStyle(thickness + w * 2, color);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(thickness, fill);
      g.lineBetween(x1, y1, x2, y2);
    },
  };
}

/** Basit gözler: beyaz göz + sola bakan göz bebeği (düşmanlar oyuncuya bakar). */
export function eyes(g, points, radius, { pupil = 0x111111, white = 0xffffff, look = -0.35 } = {}) {
  for (const [x, y] of points) {
    g.fillStyle(OUTLINE);
    g.fillCircle(x, y, radius + 1.5);
    g.fillStyle(white);
    g.fillCircle(x, y, radius);
    g.fillStyle(pupil);
    g.fillCircle(x + radius * look, y + radius * 0.1, radius * 0.55);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x + radius * look - radius * 0.2, y - radius * 0.25, radius * 0.18);
  }
}

/** Parlayan göz (iskelet, golem, mumya). */
export function glowEyes(g, points, radius, color) {
  for (const [x, y] of points) {
    g.fillStyle(color, 0.35);
    g.fillCircle(x, y, radius * 2);
    g.fillStyle(color);
    g.fillCircle(x, y, radius);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(x, y, radius * 0.4);
  }
}

/** Döşenebilir dokularda kenara taşan nesneyi karşı kenarda da çizer. */
export function wrapX(width, x, margin, drawAt) {
  drawAt(x);
  if (x < margin) drawAt(x + width);
  if (x > width - margin) drawAt(x - width);
}
