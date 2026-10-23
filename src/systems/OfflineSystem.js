import { ECONOMY } from '../config/balance.js';

/** Son kayıttan bu yana geçen süreye göre offline kazancı hesaplar; yoksa null. */
export function calculateOfflineEarnings(state, now) {
  const seconds = (now - (state.lastSaved ?? now)) / 1000;
  if (seconds < ECONOMY.OFFLINE_MIN_SECONDS) return null;

  const cappedSeconds = Math.min(seconds, ECONOMY.OFFLINE_MAX_SECONDS);
  const gold = state.goldPerSecond * cappedSeconds * ECONOMY.OFFLINE_EFFICIENCY;
  if (!(gold > 0)) return null;

  return {
    seconds,
    cappedSeconds,
    gold,
    capped: seconds > ECONOMY.OFFLINE_MAX_SECONDS,
  };
}
