import { Events } from '../core/events.js';
import { AudioEngine } from './AudioEngine.js';
import { buildTheme } from './music/themes.js';
import { MusicPlayer } from './music/MusicPlayer.js';
import { SFX } from './sfx.js';

// Hangi olayda hangi sesin çalacağını belirler. Oyun kodu ses bilmez; sadece olay
// yayınlar. Ses bağlamı ilk kullanıcı etkileşiminde açılır (tarayıcı autoplay kuralı).
const BOSS_MECHANIC_SFX = { telegraph: 'bossWarn', slam: 'thunder', interrupted: 'blocked', shieldStart: 'aegis', enrage: 'berserk' };

const EVENT_SFX = {
  [Events.ENEMY_KILLED]: () => 'kill',
  [Events.COIN_COLLECTED]: () => 'coin',
  [Events.UPGRADE_PURCHASED]: (e) => ['purchase', { level: e.level }],
  [Events.RELIC_PURCHASED]: () => 'relic',
  [Events.SKILL_REJECTED]: () => 'error',
  [Events.SKILL_ACTIVATED]: (e) => e.id,
  [Events.BOSS_SPAWNED]: () => 'bossSpawn',
  [Events.BOSS_MECHANIC]: (e) => BOSS_MECHANIC_SFX[e.type],
  [Events.ELITE_SPAWNED]: () => 'relic',
  [Events.STAGE_CLEARED]: (e) => (e.isBoss ? 'bossDefeat' : 'stageClear'),
  [Events.STAGE_FAILED]: (e) => (e.reason === 'death' ? 'death' : 'error'),
  [Events.ITEM_DROPPED]: (e) => (e.outcome === 'full' ? 'error' : ['loot', { rarity: e.rarityIndex }]),
  [Events.ITEM_FORGED]: (e) => (e.kind === 'combine' ? ['forge', { rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(e.item.rarity) }] : 'forge'),
  [Events.ACHIEVEMENT_REACHED]: () => 'achievement',
  [Events.PET_EGG_FOUND]: () => 'relic',
  [Events.PET_HATCHED]: () => 'achievement',
  [Events.PET_LEVEL_UP]: () => 'quest',
  [Events.LEVEL_UP]: () => 'levelUp',
  [Events.QUEST_COMPLETED]: () => 'quest',
  [Events.PRESTIGE_DONE]: () => 'rebirth',
  [Events.COMBAT_HIT]: (e) => (e.isCrit ? 'crit' : e.source === 'tap' ? 'tap' : 'hit'),
  [Events.PLAYER_DAMAGED]: (e) => (e.blocked ? 'blocked' : 'hurt'),
};

// Bu seçicilere uyan butonlara tıklanınca hafif bir "tık" sesi
const CLICK_SELECTOR = '.tab, .chip, .skill-auto, .btn, .toggle, .slot-tile, .item-tile';

export class AudioDirector {
  constructor(ctx) {
    this.ctx = ctx;
    this.engine = new AudioEngine();
    this.music = new MusicPlayer(this.engine);
    this.lastPlayed = new Map();
    this.unlocked = false;
  }

  get settings() {
    return this.ctx.state.settings.audio;
  }

  mount() {
    const { bus } = this.ctx;
    for (const [event, resolve] of Object.entries(EVENT_SFX)) {
      bus.on(event, (payload) => {
        const result = resolve(payload ?? {});
        if (!result) return;
        const [name, options] = Array.isArray(result) ? result : [result];
        this.play(name, options);
      });
    }
    bus.on(Events.STAGE_CHANGED, () => this.updateMusic());
    bus.on(Events.SETTINGS_CHANGED, ({ key }) => {
      if (key === 'audio') this.applySettings();
    });

    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });

    document.addEventListener('click', (e) => {
      if (e.target.closest?.(CLICK_SELECTOR)) this.play('click');
    });
    document.addEventListener('visibilitychange', () => {
      if (!this.unlocked) return;
      if (document.hidden) {
        this.music.stop();
        this.engine.suspend();
      } else {
        this.engine.resume().then(() => this.startMusic());
      }
    });
  }

  unlock() {
    if (this.unlocked) return;
    if (!this.engine.init()) return; // Web Audio yok
    this.unlocked = true;
    this.applySettings();
    this.engine.resume().then(() => {
      this.updateMusic();
      this.startMusic();
    });
  }

  applySettings() {
    const { master, music, sfx, muted } = this.settings;
    this.engine.setVolumes({ master, music, sfx, muted });
    if (this.unlocked) this.startMusic();
  }

  startMusic() {
    // Müzik sesi 0 ya da tamamen sessizse sekansörü boşuna çalıştırma
    const { music, muted } = this.settings;
    if (muted || music <= 0 || document.hidden) {
      this.music.stop();
      return;
    }
    this.updateMusic();
    this.music.start();
  }

  updateMusic() {
    const { stages } = this.ctx;
    this.music.setTheme(buildTheme(stages.zoneInfo.zoneIndex, { boss: stages.isBoss }));
  }

  play(name, options) {
    if (!this.unlocked || this.settings.muted || this.settings.sfx <= 0) return;
    const sfx = SFX[name];
    if (!sfx) return;
    const now = this.engine.now;
    if (now - (this.lastPlayed.get(name) ?? -Infinity) < sfx.throttle) return;
    this.lastPlayed.set(name, now);
    sfx.play(this.engine, options);
  }

  toggleMute() {
    this.ctx.updateAudioSetting('muted', !this.settings.muted);
  }
}
