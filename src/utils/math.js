export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const lerp = (a, b, t) => a + (b - a) * t;

/** Kare hızından bağımsız yumuşak yaklaşma (üstel sönüm). */
export const approach = (current, target, rate, dt) => lerp(current, target, 1 - Math.exp(-rate * dt));

export const randRange = (min, max) => min + Math.random() * (max - min);

export const randInt = (min, max) => Math.floor(randRange(min, max + 1));

/** items: [{ weight, ... }] */
export function weightedPick(items, rng = Math.random) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}
