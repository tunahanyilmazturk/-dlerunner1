import { QUESTS } from '../config/balance.js';
import { Events } from '../core/events.js';
import { METRICS } from '../data/metrics.js';
import { QUEST_TEMPLATES, QUEST_TEMPLATE_MAP } from '../data/quests.js';

const CHECK_INTERVAL = 1; // sn

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Yerel saate göre gün anahtarı: 2026-10-23 */
export function dayKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Günlük görevler: her gün (yerel gece yarısı) yenilenir. İlerleme, görev
// verildiği andaki sayaç değerine (baseline) göre hesaplanır.
export class QuestSystem {
  constructor(state, bus) {
    this.state = state;
    this.bus = bus;
    this.timer = 0;
    this.systems = null;
  }

  attach(systems) {
    this.systems = systems; // { economy, equipment, prestige }
  }

  get data() {
    return this.state.quests;
  }

  get list() {
    return this.data.list;
  }

  template(quest) {
    return QUEST_TEMPLATE_MAP[quest.templateId];
  }

  msUntilReset(now = new Date()) {
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return next - now;
  }

  /** Gün değiştiyse yeni görevleri verir. */
  ensureToday() {
    const today = dayKey();
    if (this.data.day === today && this.list.length) return false;
    this.data.day = today;
    this.data.list = shuffled(QUEST_TEMPLATES)
      .slice(0, QUESTS.COUNT)
      .map((t) => this.createQuest(t));
    this.data.rerollsLeft = QUESTS.REROLLS;
    this.data.bonusClaimed = false;
    this.bus.emit(Events.QUESTS_UPDATED, { reset: true });
    return true;
  }

  createQuest(template) {
    const target = template.target(this.state);
    return {
      id: `${template.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      templateId: template.id,
      target,
      baseline: METRICS[template.metric](this.state),
      reward: template.reward(this.state, target),
      claimed: false,
      notified: false,
    };
  }

  progress(quest) {
    const current = METRICS[this.template(quest).metric](this.state);
    return Math.min(quest.target, Math.max(0, current - quest.baseline));
  }

  isComplete(quest) {
    return this.progress(quest) >= quest.target;
  }

  get(id) {
    return this.list.find((q) => q.id === id) ?? null;
  }

  claim(id) {
    const quest = this.get(id);
    if (!quest || quest.claimed || !this.isComplete(quest)) return null;
    quest.claimed = true;
    const { economy, equipment } = this.systems;
    economy.addGold(quest.reward.gold, 'quest');
    equipment.addShards(quest.reward.shards);
    this.state.stats.dailyCompleted++;
    this.bus.emit(Events.QUESTS_UPDATED, {});
    return quest.reward;
  }

  canReroll(quest) {
    return this.data.rerollsLeft > 0 && !quest.claimed && !this.isComplete(quest);
  }

  reroll(id) {
    const quest = this.get(id);
    if (!quest || !this.canReroll(quest)) return false;
    const used = new Set(this.list.map((q) => q.templateId));
    const candidates = QUEST_TEMPLATES.filter((t) => !used.has(t.id));
    if (!candidates.length) return false;
    const replacement = this.createQuest(candidates[Math.floor(Math.random() * candidates.length)]);
    this.list.splice(this.list.indexOf(quest), 1, replacement);
    this.data.rerollsLeft--;
    this.bus.emit(Events.QUESTS_UPDATED, {});
    return true;
  }

  get canClaimBonus() {
    return this.list.length > 0 && !this.data.bonusClaimed && this.list.every((q) => q.claimed);
  }

  /** Günün tüm görevleri bitince: Ruh Taşı + Nadir+ eşya. */
  claimBonus() {
    if (!this.canClaimBonus) return null;
    this.data.bonusClaimed = true;
    const { prestige, equipment } = this.systems;
    prestige.data.souls += QUESTS.BONUS_SOULS;
    prestige.data.totalSouls += QUESTS.BONUS_SOULS;
    prestige.invalidate();
    const item = equipment.generate(Math.max(1, this.state.bestStage), { minRarity: QUESTS.BONUS_ITEM_MIN_RARITY });
    equipment.addItem(item);
    this.bus.emit(Events.QUESTS_UPDATED, {});
    return { souls: QUESTS.BONUS_SOULS, item };
  }

  get claimableCount() {
    return this.list.filter((q) => !q.claimed && this.isComplete(q)).length + (this.canClaimBonus ? 1 : 0);
  }

  update(dt) {
    this.timer += dt;
    if (this.timer < CHECK_INTERVAL) return;
    this.timer = 0;

    this.ensureToday();
    for (const quest of this.list) {
      if (!quest.notified && this.isComplete(quest)) {
        quest.notified = true;
        this.bus.emit(Events.QUEST_COMPLETED, { quest, template: this.template(quest) });
      }
    }
    this.bus.emit(Events.QUESTS_UPDATED, {});
  }
}
