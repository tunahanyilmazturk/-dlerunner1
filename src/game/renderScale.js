import { GAME_HEIGHT, GAME_WIDTH } from '../config/balance.js';

// Görüntü kalitesi. Oyun mantığı her zaman 960x540 koordinatlarında çalışır; ama tuval ve
// dokular "render ölçeği" kadar büyük üretilir, kamera zoom'u dünyayı ekrana sığdırır.
// Böylece büyük ekranda / yüksek DPI'da görüntü bulanıklaşmaz.

export const GRAPHICS_QUALITY = {
  auto: { label: 'Otomatik', scale: null },
  low: { label: 'Düşük', scale: 1 },
  medium: { label: 'Orta', scale: 1.5 },
  high: { label: 'Yüksek', scale: 2 },
  ultra: { label: 'Çok yüksek', scale: 3 },
};

const MAX_SCALE = 3;
const MAX_WORLD_SCALE = 2; // büyük manzara katmanları bellek için en fazla 2x

let renderScale = 1;
let quality = 'auto';

/** Tuvalin ekranda kaplayacağı boyut × ekran yoğunluğu (0.5 adımlarla, yukarı yuvarlanır). */
function autoScale() {
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  const needed = fit * dpr;
  return Math.min(MAX_SCALE, Math.max(1, Math.ceil(needed * 2 - 0.2) / 2));
}

/** main.js oyun oluşturulmadan önce bir kez çağırır. */
export function configureRenderScale(qualityKey = 'auto') {
  quality = GRAPHICS_QUALITY[qualityKey] ? qualityKey : 'auto';
  renderScale = GRAPHICS_QUALITY[quality].scale ?? autoScale();
  return renderScale;
}

export const getRenderScale = () => renderScale;
export const getWorldScale = () => Math.min(renderScale, MAX_WORLD_SCALE);
export const getQuality = () => quality;
export const isLowQuality = () => renderScale <= 1;
