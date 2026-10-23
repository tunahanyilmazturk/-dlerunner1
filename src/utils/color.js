/** Rengi açar (>1) veya koyulaştırır (<1). */
export function shade(color, factor) {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

export function toCssColor(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}
