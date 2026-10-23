import { make, makeCanvas, outlined } from './draw.js';

// Efekt dokuları (çoğu beyaz çizilir, kullanırken renklendirilir).
export function createFxTextures(scene) {
  make(scene, 'coin', 20, 20, (g) => {
    g.fillStyle(0x7a4a10);
    g.fillCircle(10, 10, 10);
    g.fillStyle(0xffc83d);
    g.fillCircle(10, 10, 8);
    g.fillStyle(0xd99a1e);
    g.fillRect(9, 5, 2, 10);
    g.fillStyle(0xffe9a8);
    g.fillCircle(7, 7, 2.5);
  });

  make(scene, 'slash', 90, 90, (g) => {
    g.lineStyle(7, 0xffffff, 1);
    g.beginPath();
    g.arc(45, 45, 36, -Math.PI * 0.4, Math.PI * 0.4);
    g.strokePath();
    g.lineStyle(3, 0xffffff, 0.6);
    g.beginPath();
    g.arc(45, 45, 27, -Math.PI * 0.3, Math.PI * 0.3);
    g.strokePath();
  });

  make(scene, 'spark', 10, 10, (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(5, 5, 5);
  });

  make(scene, 'ring', 64, 64, (g) => {
    g.lineStyle(4, 0xffffff, 1);
    g.strokeCircle(32, 32, 28);
  });

  make(scene, 'bubble', 120, 120, (g) => {
    g.fillStyle(0x9fd8ff, 0.18);
    g.fillCircle(60, 60, 56);
    g.lineStyle(3, 0xbfe6ff, 0.9);
    g.strokeCircle(60, 60, 56);
    g.lineStyle(4, 0xffffff, 0.6);
    g.beginPath();
    g.arc(60, 60, 46, Math.PI * 1.1, Math.PI * 1.4);
    g.strokePath();
  });

  // Yumuşak ışıma (radyal gradyan)
  makeCanvas(scene, 'glow', 100, 100, (c, w, h) => {
    const grad = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
  });

  // Ganimet mücevheri
  make(scene, 'loot', 26, 30, (g) => {
    g.fillStyle(0xffffff);
    g.fillPoints([{ x: 13, y: 0 }, { x: 26, y: 11 }, { x: 13, y: 30 }, { x: 0, y: 11 }], true);
    g.fillStyle(0x000000, 0.18);
    g.fillPoints([{ x: 13, y: 11 }, { x: 26, y: 11 }, { x: 13, y: 30 }], true);
    g.fillStyle(0xffffff, 0.7);
    g.fillPoints([{ x: 13, y: 2 }, { x: 19, y: 10 }, { x: 13, y: 10 }, { x: 7, y: 10 }], true);
  });

  makeCanvas(scene, 'beam', 30, 200, (c, w, h) => {
    const grad = c.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,0.8)');
    c.fillStyle = grad;
    c.fillRect(4, 0, w - 8, h);
  });

  make(scene, 'shadow', 60, 14, (g) => {
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(30, 7, 60, 14);
  });

  // Elit düşman işareti: can barının solunda altın taç
  make(scene, 'elite_crown', 20, 14, (g) => {
    const s = outlined(g, { width: 1.5 });
    s.poly([[2, 13], [2, 4], [6, 8], [10, 1], [14, 8], [18, 4], [18, 13]], 0xffd23f);
    g.fillStyle(0xff5a2b);
    g.fillCircle(10, 9, 1.8);
  });

  // Yaprak (orman ambiyans parçacığı)
  make(scene, 'leaf', 10, 6, (g) => {
    g.fillStyle(0xffffff);
    g.fillEllipse(5, 3, 10, 5);
  });
}
