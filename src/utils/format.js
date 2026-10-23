const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Büyük sayıları idle oyunlarına uygun kısaltır: 12.5K, 3.40M, 1.00e+40 */
export function formatNumber(value) {
  if (!Number.isFinite(value)) return '∞';
  const sign = value < 0 ? '-' : '';
  const n = Math.abs(value);
  if (n < 1000) {
    return sign + (n < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString());
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIXES.length) return sign + n.toExponential(2);
  const scaled = n / Math.pow(1000, tier);
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return sign + scaled.toFixed(digits) + SUFFIXES[tier];
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) return `${hours}sa ${minutes}dk`;
  if (minutes > 0) return `${minutes}dk ${seconds}sn`;
  return `${seconds}sn`;
}

export function formatPercent(ratio, digits = 0) {
  return `%${(ratio * 100).toFixed(digits)}`;
}

export function toRoman(num) {
  const map = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let n = num;
  let out = '';
  for (const [value, letter] of map) {
    while (n >= value) {
      out += letter;
      n -= value;
    }
  }
  return out || String(num);
}
