import { ACHIEVEMENT, QUESTS } from '../../config/balance.js';
import { Events } from '../../core/events.js';
import { formatNumber, formatTime, toRoman } from '../../utils/format.js';
import { el, rafThrottle, replayAnimation } from '../dom.js';

// Günlük görevler + başarımlar. Kartlar sadece yapı değişince (alındı, değiştirildi,
// tamamlandı, gün döndü) yeniden kurulur; ilerleme çubukları yerinde güncellenir.
// Böylece her saniye gelen güncelleme bir tıklamayı yarıda kesmez.
export class QuestsView {
  constructor(ctx, ui) {
    this.ctx = ctx;
    this.ui = ui;
    this.element = el('section', { class: 'view quests' });
    this.live = []; // { fill, text, get: () => [value, target] }
    this.lastKey = null;

    const render = rafThrottle(() => this.render());
    ctx.bus.on(Events.QUESTS_UPDATED, render);
    ctx.bus.on(Events.ACHIEVEMENTS_UPDATED, render);
    ctx.bus.on(Events.QUEST_COMPLETED, ({ template, quest }) =>
      this.ui.toast(`📜 Görev tamamlandı: ${template.text(quest.target)}`, 'success'),
    );
    ctx.bus.on(Events.ACHIEVEMENT_REACHED, ({ achievement, tier }) =>
      this.ui.toast(`🏆 Başarım: ${achievement.name} ${toRoman(tier)}`, 'success', '#ffd23f'),
    );
    this.render();
  }

  onMount() {
    this.updateBadge();
  }

  updateBadge() {
    const count = this.ctx.quests.claimableCount + this.ctx.achievements.claimableCount;
    this.setBadge?.(count > 0 ? String(count) : '');
  }

  structureKey() {
    const { quests, achievements } = this.ctx;
    const questPart = quests.list.map((q) => `${q.id}:${q.claimed}:${quests.isComplete(q)}`).join(',');
    const achPart = achievements.list
      .map((a) => `${achievements.claimedTiers(a.id)}/${achievements.reachedTiers(a)}`)
      .join(',');
    return [quests.data.day, questPart, quests.data.rerollsLeft, quests.data.bonusClaimed, achPart].join('|');
  }

  render() {
    this.updateBadge();
    const key = this.structureKey();
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.build();
    }
    this.updateLive();
  }

  build() {
    this.live = [];
    this.timerEl = el('span', { class: 'muted' });
    this.element.replaceChildren(
      el('div', { class: 'section-head' }, [el('h3', { class: 'section-title', text: 'Günlük Görevler' }), this.timerEl]),
      ...this.ctx.quests.list.map((q) => this.buildQuest(q)),
      this.buildBonus(),
      this.buildAchievementHeader(),
      ...this.ctx.achievements.list.map((a) => this.buildAchievement(a.id)),
    );
  }

  progressBar(get, extraClass = '') {
    const fill = el('div', { class: `bar-fill bar-fill--progress ${extraClass}` });
    const text = el('span', { class: 'bar-text' });
    this.live.push({ fill, text, get });
    return el('div', { class: 'bar' }, [fill, text]);
  }

  updateLive() {
    for (const { fill, text, get } of this.live) {
      const [value, target] = get();
      fill.style.width = `${Math.min(1, value / target) * 100}%`;
      text.textContent = `${formatNumber(value)} / ${formatNumber(target)}`;
    }
    if (this.timerEl) this.timerEl.textContent = `Yenilenme: ${formatTime(this.ctx.quests.msUntilReset() / 1000)}`;
  }

  buildQuest(quest) {
    const { quests } = this.ctx;
    const template = quests.template(quest);
    const complete = quests.isComplete(quest);

    const actions = [];
    if (quest.claimed) {
      actions.push(el('span', { class: 'claimed-tag', text: '✓ Alındı' }));
    } else if (complete) {
      actions.push(
        el('button', { class: 'btn btn--primary btn--small', type: 'button', text: 'Topla', on: { click: (e) => this.claimQuest(quest, e.currentTarget) } }),
      );
    } else if (quests.canReroll(quest)) {
      actions.push(
        el('button', {
          class: 'btn btn--small',
          type: 'button',
          text: '🔄 Değiştir',
          title: `Günde ${QUESTS.REROLLS} değiştirme hakkı`,
          on: { click: () => quests.reroll(quest.id) },
        }),
      );
    }

    return el('article', { class: `quest-card${complete && !quest.claimed ? ' ready' : ''}${quest.claimed ? ' done' : ''}` }, [
      el('div', { class: 'upgrade-icon', text: template.icon }),
      el('div', { class: 'quest-info' }, [
        el('div', { class: 'quest-title', text: template.text(quest.target) }),
        this.progressBar(() => [quests.progress(quest), quest.target], complete ? 'bar-fill--done' : ''),
        el('div', { class: 'quest-reward muted' }, [
          el('span', { class: 'coin-icon coin-icon--sm' }),
          ` ${formatNumber(quest.reward.gold)} · 💠 ${quest.reward.shards}`,
        ]),
      ]),
      el('div', { class: 'quest-actions' }, actions),
    ]);
  }

  buildBonus() {
    const { quests } = this.ctx;
    const done = quests.list.filter((q) => q.claimed).length;
    const claimed = quests.data.bonusClaimed;
    return el('div', { class: `quest-bonus${quests.canClaimBonus ? ' ready' : ''}${claimed ? ' done' : ''}` }, [
      el('span', { class: 'quest-bonus-icon', text: '🎁' }),
      el('div', { class: 'quest-info' }, [
        el('div', { class: 'quest-title', text: 'Günlük sandık' }),
        el('div', { class: 'muted', text: `Tüm görevleri bitir: +${QUESTS.BONUS_SOULS} 🔮 Ruh Taşı ve Nadir+ eşya (${done}/${quests.list.length})` }),
      ]),
      claimed
        ? el('span', { class: 'claimed-tag', text: '✓ Alındı' })
        : el('button', {
            class: 'btn btn--primary btn--small',
            type: 'button',
            text: 'Aç',
            disabled: !quests.canClaimBonus,
            on: { click: () => this.claimBonus() },
          }),
    ]);
  }

  buildAchievementHeader() {
    const { achievements } = this.ctx;
    const bonus = Math.round((achievements.multiplier - 1) * 100);
    return el('div', { class: 'section-head' }, [
      el('h3', { class: 'section-title', text: `Başarımlar ${achievements.totalClaimed}/${achievements.totalTiers}` }),
      el('span', { class: 'muted', text: `Bonus: +%${bonus} hasar ve altın` }),
    ]);
  }

  buildAchievement(id) {
    const { achievements } = this.ctx;
    const info = achievements.info(id);
    const { achievement } = info;
    const stars = achievement.tiers.map((_, i) =>
      el('span', { class: `star${i < info.claimed ? ' on' : i < info.reached ? ' ready' : ''}`, text: '★' }),
    );

    let action;
    if (info.claimable) {
      action = el('button', {
        class: 'btn btn--primary btn--small',
        type: 'button',
        text: `Topla 💠${formatNumber(info.pendingShards)}`,
        on: { click: (e) => this.claimAchievement(id, e.currentTarget) },
      });
    } else if (info.complete) {
      action = el('span', { class: 'claimed-tag', text: '✓ Tamam' });
    } else {
      action = el('span', { class: 'muted small', text: `💠 ${achievements.rewardForTier(info.nextIndex)}` });
    }

    return el('article', { class: `achievement-card${info.claimable ? ' ready' : ''}${info.complete && !info.claimable ? ' done' : ''}` }, [
      el('div', { class: 'upgrade-icon', text: achievement.icon }),
      el('div', { class: 'quest-info' }, [
        el('div', { class: 'quest-title' }, [el('span', { text: achievement.name }), el('span', { class: 'stars' }, stars)]),
        el('div', { class: 'muted small', text: info.complete ? 'Tüm kademeler tamamlandı' : achievement.describe(info.target) }),
        info.complete ? null : this.progressBar(() => [achievements.value(achievement), achievements.info(id).target]),
      ]),
      el('div', { class: 'quest-actions' }, [action]),
    ]);
  }

  claimQuest(quest, button) {
    const reward = this.ctx.quests.claim(quest.id);
    if (!reward) return replayAnimation(button, 'shake');
    this.ui.toast(`+${formatNumber(reward.gold)} altın · +${reward.shards} 💠`, 'success');
  }

  claimAchievement(id, button) {
    const result = this.ctx.achievements.claim(id);
    if (!result) return replayAnimation(button, 'shake');
    this.ui.toast(
      `+${formatNumber(result.shards)} 💠 · Kalıcı bonus +%${Math.round(result.tiers * ACHIEVEMENT.BONUS_PER_TIER * 100)}`,
      'success',
    );
  }

  claimBonus() {
    const result = this.ctx.quests.claimBonus();
    if (!result) return;
    this.ui.toast(`🎁 +${result.souls} 🔮 Ruh Taşı ve ${result.item.name}!`, 'success', '#c9a7ff');
  }
}
