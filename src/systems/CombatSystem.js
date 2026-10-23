/** Kritik şansını uygulayarak tek bir vuruş üretir. */
export function rollHit(baseDamage, stats, rng = Math.random) {
  const isCrit = rng() < stats.critChance;
  return {
    amount: isCrit ? baseDamage * stats.critDamage : baseDamage,
    isCrit,
  };
}

export const attackHit = (stats) => rollHit(stats.damage, stats);

export const tapHit = (stats) => rollHit(stats.damage * stats.tapMultiplier, stats);
