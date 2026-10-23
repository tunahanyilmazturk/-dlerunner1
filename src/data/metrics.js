// Başarım ve görevlerin takip ettiği sayaçlar. Hepsi kayıtlı durumdan okunur;
// yeni bir sayaç eklemek için önce GameState'e alanını ekle, sonra buraya okuyucusunu.
export const METRICS = {
  kills: (s) => s.stats.totalKills,
  bossKills: (s) => s.stats.bossKills,
  stagesCleared: (s) => s.stats.stagesCleared,
  totalGold: (s) => s.stats.totalGold,
  taps: (s) => s.stats.taps,
  skillCasts: (s) => s.stats.skillCasts,
  itemsFound: (s) => s.stats.itemsFound,
  itemsSalvaged: (s) => s.stats.itemsSalvaged,
  legendaryFound: (s) => s.stats.legendaryFound,
  dailyCompleted: (s) => s.stats.dailyCompleted,
  bossInterrupts: (s) => s.stats.bossInterrupts,
  eggsHatched: (s) => s.pets.hatched,
  petLevels: (s) => Object.values(s.pets.owned).reduce((sum, p) => sum + p.level, 0),
  relicLevels: (s) => Object.values(s.prestige.relics).reduce((sum, l) => sum + l, 0),
  bestStage: (s) => s.bestStage,
  heroLevel: (s) => s.hero.level,
  rebirths: (s) => s.prestige.rebirths,
};
