// Tüm olay isimleri burada tanımlı; yazım hatalarını önler.
export const Events = Object.freeze({
  // Ekonomi
  GOLD_CHANGED: 'economy:gold-changed',
  GPS_CHANGED: 'economy:gps-changed',
  COIN_COLLECTED: 'economy:coin-collected',

  // Yükseltmeler
  UPGRADE_PURCHASED: 'upgrades:purchased',
  STATS_CHANGED: 'upgrades:stats-changed',

  // Aşama / dalga
  STAGE_CHANGED: 'stage:changed',
  STAGE_PROGRESS: 'stage:progress',
  STAGE_CLEARED: 'stage:cleared',
  STAGE_FAILED: 'stage:failed',
  BOSS_SPAWNED: 'stage:boss-spawned',
  ELITE_SPAWNED: 'stage:elite-spawned',
  BOSS_TIMER: 'stage:boss-timer',
  ENEMY_KILLED: 'stage:enemy-killed',

  // Yetenekler
  SKILL_ACTIVATED: 'skills:activated',
  SKILL_ENDED: 'skills:ended',
  SKILL_REJECTED: 'skills:rejected',
  SKILL_AUTOCAST_CHANGED: 'skills:autocast-changed',
  SKILL_TREE_CHANGED: 'skills:tree-changed',

  // Prestige
  PRESTIGE_DONE: 'prestige:done',
  RELIC_PURCHASED: 'prestige:relic-purchased',

  // Ekipman
  ITEM_DROPPED: 'equipment:item-dropped',
  EQUIPMENT_CHANGED: 'equipment:changed',
  ITEM_FORGED: 'equipment:item-forged', // { item, kind: 'combine' | 'reforge' }
  BOSS_MECHANIC: 'boss:mechanic', // { type: 'telegraph' | 'slam' | 'interrupted' | 'shieldStart' | 'shieldEnd' | 'enrage' }
  PET_CHANGED: 'pets:changed',
  PET_EGG_FOUND: 'pets:egg-found', // { eggs }
  PET_HATCHED: 'pets:hatched', // { pet, isNew, level }
  PET_LEVEL_UP: 'pets:level-up', // { pet, level }

  // Başarımlar / görevler
  ACHIEVEMENTS_UPDATED: 'achievements:updated',
  ACHIEVEMENT_REACHED: 'achievements:reached',
  QUESTS_UPDATED: 'quests:updated',
  QUEST_COMPLETED: 'quests:completed',

  // Karakter seviyesi
  XP_CHANGED: 'hero:xp-changed',
  LEVEL_UP: 'hero:level-up',

  // Oyuncu / savaş (ses ve efektler için)
  PLAYER_HP_CHANGED: 'player:hp-changed',
  PLAYER_DAMAGED: 'player:damaged',
  COMBAT_HIT: 'combat:hit',

  // Sistem
  TEXTURES_READY: 'system:textures-ready',
  OFFLINE_EARNINGS: 'system:offline-earnings',
  GAME_SAVED: 'system:saved',
  SETTINGS_CHANGED: 'system:settings-changed',
  TOAST: 'ui:toast',
});
