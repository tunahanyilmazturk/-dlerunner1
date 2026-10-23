import { Events } from '../../core/events.js';
import { PASSIVES, PASSIVE_TIERS, SKILL_RANK } from '../../data/passives.js';
import { SkillTreeSystem } from '../../systems/SkillTreeSystem.js';
import { el, rafThrottle, replayAnimation } from '../dom.js';

// Yetenekler penceresi (K): Yetenek Puanı, aktif yetenek seviyeleri ve 3 kademeli pasif ağaç.
export class SkillTreeView {
  constructor(ctx, ui) {
    this.ctx = ctx;
    this.ui = ui;
    this.element = el('section', { class: 'view skilltree' });

    const render = rafThrottle(() => this.render());
    for (const event of [Events.SKILL_TREE_CHANGED, Events.LEVEL_UP, Events.STAGE_CHANGED]) ctx.bus.on(event, render);
    this.render();
  }

  onMount() {
    this.updateBadge();
  }

  updateBadge() {
    const points = this.ctx.skillTree.availablePoints;
    this.setBadge?.(points > 0 ? String(points) : '');
  }

  render() {
    const { skillTree } = this.ctx;
    this.updateBadge();
    this.element.replaceChildren(
      el('div', { class: 'sp-header' }, [
        el('div', { class: 'sp-count' }, [el('span', { class: 'sp-value', text: String(skillTree.availablePoints) }), el('span', { class: 'muted', text: ' Yetenek Puanı' })]),
        el('span', { class: 'muted small', text: `Her seviye +1 YP · Harcanan ${skillTree.spentPoints}` }),
        el('button', { class: 'btn btn--small', type: 'button', text: '↺ Sıfırla', disabled: skillTree.spentPoints === 0, on: { click: () => this.confirmReset() } }),
      ]),
      el('h3', { class: 'section-title', text: 'Aktif Yetenekler' }),
      el('div', { class: 'skill-rows' }, this.ctx.skills.list.map((s) => this.skillRow(s))),
      el('div', { class: 'section-head' }, [el('h3', { class: 'section-title', text: 'Pasif Ağaç' }), el('span', { class: 'muted small', text: 'Üst kademeler, toplam harcanan puanla açılır' })]),
      el('div', { class: 'passive-tree' }, PASSIVE_TIERS.map((tier) => this.tierRow(tier))),
    );
  }

  skillRow(skill) {
    const { skills, skillTree } = this.ctx;
    const unlocked = skills.isUnlocked(skill.id);
    const rank = skills.rank(skill.id);
    const effect = skills.effectFor(skill.id);
    const summary = [];
    if (effect.damageMult) summary.push(`x${effect.damageMult.toFixed(1)} hasar`);
    if (effect.summonMult) summary.push(`x${effect.summonMult.toFixed(2)} vuruş`);
    if (effect.attackSpeedMult) summary.push(`x${effect.attackSpeedMult.toFixed(2)} hız`);
    if (effect.goldMult) summary.push(`x${effect.goldMult.toFixed(1)} altın`);
    if (effect.healRatio) summary.push(`%${Math.round(effect.healRatio * 100)} can`);
    if (effect.freezeTime) summary.push(`${effect.freezeTime.toFixed(1)}sn donma`);
    if (skill.duration) summary.push(`${skills.durationFor(skill.id).toFixed(1)}sn`);
    summary.push(`${skills.cooldownFor(skill.id).toFixed(1)}sn bekleme`);

    const plus = el('button', {
      class: 'rank-btn',
      type: 'button',
      text: '+',
      title: rank >= SKILL_RANK.MAX ? 'Maks. seviye' : 'Seviye yükselt (1 YP)',
      disabled: !skillTree.canRankUp(skill.id, unlocked),
      on: {
        click: (e) => {
          if (!skillTree.rankUp(skill.id, unlocked)) replayAnimation(e.currentTarget, 'shake');
        },
      },
    });
    return el('div', { class: `skill-row${unlocked ? '' : ' locked'}` }, [
      el('span', { class: 'skill-row-icon', text: skill.icon }),
      el('div', { class: 'skill-row-info' }, [
        el('div', { class: 'skill-row-title' }, [
          el('span', { text: skill.name }),
          el('span', { class: 'rank-tag', text: unlocked ? `Sv. ${SkillTreeSystem.rankLabel(rank)}` : `🔒 Aşama ${skill.unlockStage}` }),
        ]),
        el('div', { class: 'rank-bar' }, [el('div', { class: 'rank-fill', style: { width: `${(rank / SKILL_RANK.MAX) * 100}%` } })]),
        el('div', { class: 'muted small', text: unlocked ? summary.join(' · ') : skill.description }),
      ]),
      plus,
    ]);
  }

  tierRow(tier) {
    const { skillTree } = this.ctx;
    const open = skillTree.isTierOpen(tier.tier);
    const nodes = PASSIVES.filter((p) => p.tier === tier.tier).map((p) => {
      const rank = skillTree.passiveRank(p.id);
      const can = skillTree.canLearn(p.id);
      return el(
        'button',
        {
          class: `passive-node${rank > 0 ? ' learned' : ''}${rank >= p.maxRank ? ' maxed' : ''}${can ? ' can' : ''}`,
          type: 'button',
          disabled: !open,
          title: `${p.name}: ${p.format(p.perRank * rank)} → ${p.format(p.perRank * Math.min(p.maxRank, rank + 1))} (1 YP)`,
          on: {
            click: (e) => {
              if (!skillTree.learn(p.id)) replayAnimation(e.currentTarget, 'shake');
            },
          },
        },
        [
          el('span', { class: 'passive-icon', text: p.icon }),
          el('span', { class: 'passive-name', text: p.name }),
          el('span', { class: 'passive-rank', text: `${rank}/${p.maxRank}` }),
          el('span', { class: 'passive-value', text: rank ? p.format(p.perRank * rank) : p.format(p.perRank) }),
        ],
      );
    });
    return el('div', { class: `tier${open ? '' : ' closed'}` }, [
      el('div', { class: 'tier-label' }, [el('strong', { text: tier.name }), el('span', { class: 'muted small', text: open ? 'Açık' : `🔒 ${tier.requires} puan` })]),
      el('div', { class: 'tier-nodes' }, nodes),
    ]);
  }

  confirmReset() {
    this.ui.modal.open({
      title: 'Yetenek puanları sıfırlansın mı?',
      content: 'Tüm yetenek seviyeleri ve pasifler geri alınır, puanlar iade edilir. Ücretsizdir.',
      actions: [
        { label: 'Vazgeç', variant: 'ghost' },
        { label: 'Sıfırla', variant: 'danger', onClick: () => this.ctx.skillTree.reset() },
      ],
    });
  }
}
