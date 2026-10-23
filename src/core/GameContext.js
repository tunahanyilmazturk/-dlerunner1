import { SAVE, SAVE_KEY } from '../config/balance.js';
import { bus } from './EventBus.js';
import { Events } from './events.js';
import { createDefaultState } from './GameState.js';
import { SaveManager } from './SaveManager.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import { AchievementSystem } from '../systems/AchievementSystem.js';
import { EquipmentSystem } from '../systems/EquipmentSystem.js';
import { LevelSystem } from '../systems/LevelSystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { PrestigeSystem } from '../systems/PrestigeSystem.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { PetSystem } from '../systems/PetSystem.js';
import { SkillTreeSystem } from '../systems/SkillTreeSystem.js';
import { StageSystem } from '../systems/StageSystem.js';
import { calculateOfflineEarnings } from '../systems/OfflineSystem.js';

// Oyunun "beyni": durum + sistemler. Phaser sahnesi ve DOM arayüzü bu nesneyi paylaşır.
export function createContext() {
  const save = new SaveManager(SAVE_KEY);
  const state = save.load() ?? createDefaultState();

  const prestige = new PrestigeSystem(state, bus);
  const equipment = new EquipmentSystem(state, bus);
  const achievements = new AchievementSystem(state, bus);
  const level = new LevelSystem(state, bus);
  const skillTree = new SkillTreeSystem(state, bus);
  const economy = new EconomySystem(state, bus);
  const pets = new PetSystem(state, bus);
  const upgrades = new UpgradeSystem(state, bus, economy, { prestige, equipment, achievements, level, skillTree, pets });
  pets.attach({ upgrades, equipment });
  level.attach({ upgrades });
  skillTree.attach({ upgrades });
  const stages = new StageSystem(state, bus);
  const skills = new SkillSystem(state, bus, prestige, skillTree);
  const quests = new QuestSystem(state, bus);

  equipment.attach({ upgrades });
  achievements.attach({ upgrades, equipment });
  quests.attach({ economy, equipment, prestige });
  prestige.attach({ economy, upgrades, stages, skills });

  let resetting = false;
  let autosaveId = null;

  const ctx = {
    bus,
    state,
    save,
    economy,
    upgrades,
    stages,
    skills,
    prestige,
    equipment,
    achievements,
    quests,
    level,
    skillTree,
    pets,

    // HUD tarafından doldurulur: altın ikonunun ekran koordinatı
    getCoinTarget: () => null,

    saveNow() {
      if (resetting) return;
      state.lastSaved = Date.now();
      if (save.save(state)) bus.emit(Events.GAME_SAVED, { at: state.lastSaved });
    },

    exportSave() {
      ctx.saveNow();
      return save.exportString(state);
    },

    importSave(text) {
      const data = save.importString(text);
      resetting = true;
      save.save(data);
      location.reload();
    },

    resetProgress() {
      resetting = true;
      save.clear();
      location.reload();
    },

    updateSetting(key, value) {
      state.settings[key] = value;
      bus.emit(Events.SETTINGS_CHANGED, { key, value });
      ctx.saveNow();
    },

    /** Ses ayarı; save=false ile kaydırıcı sürüklenirken her adımda kaydetmez. */
    updateAudioSetting(key, value, { save = true } = {}) {
      state.settings.audio[key] = value;
      bus.emit(Events.SETTINGS_CHANGED, { key: 'audio', audioKey: key, value });
      if (save) ctx.saveNow();
    },

    checkOffline() {
      const result = calculateOfflineEarnings(state, Date.now());
      if (result) bus.emit(Events.OFFLINE_EARNINGS, result);
    },

    start() {
      achievements.prime();
      quests.ensureToday();
      ctx.checkOffline();
      ctx.saveNow();
      autosaveId = setInterval(() => ctx.saveNow(), SAVE.AUTOSAVE_INTERVAL);
      window.addEventListener('beforeunload', () => ctx.saveNow());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          ctx.saveNow();
        } else {
          // Sekme arka plandayken oyun döngüsü durur; geçen süreyi offline kazanç say
          ctx.checkOffline();
          ctx.saveNow();
        }
      });
    },

    stop() {
      clearInterval(autosaveId);
    },
  };

  return ctx;
}
