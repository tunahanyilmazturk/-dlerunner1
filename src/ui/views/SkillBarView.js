import { Events } from '../../core/events.js';
import { SkillTreeSystem } from '../../systems/SkillTreeSystem.js';
import { el, replayAnimation } from '../dom.js';

const REJECT_MESSAGES = {
  locked: 'Bu yetenek henüz kilitli',
  noTarget: 'Menzilde düşman yok',
};

// Oyun alanının altındaki yetenek çubuğu. Bekleme süreleri her karede SkillSystem'den
// okunur; DOM sadece değer değiştiğinde güncellenir.
export class SkillBarView {
  constructor(root, ctx, ui) {
    this.root = root;
    this.ctx = ctx;
    this.ui = ui;
    this.slots = new Map();
    this.build();
    this.bind();
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  build() {
    for (const skill of this.ctx.skills.list) {
      const refs = { last: {} };
      refs.cooldown = el('span', { class: 'skill-cd' });
      refs.timer = el('span', { class: 'skill-timer' });
      refs.lock = el('span', { class: 'skill-lock' });
      refs.rank = el('span', { class: 'skill-rank' });
      refs.button = el(
        'button',
        {
          class: 'skill-btn',
          type: 'button',
          'aria-label': skill.name,
          on: { click: () => this.ctx.skills.activate(skill.id) },
        },
        [
          el('span', { class: 'skill-icon', text: skill.icon }),
          refs.cooldown,
          refs.timer,
          refs.lock,
          el('span', { class: 'skill-key', text: skill.hotkey }),
          refs.rank,
        ],
      );
      refs.auto = el('button', {
        class: 'skill-auto',
        type: 'button',
        text: 'OTO',
        title: 'Otomatik kullanım',
        on: { click: () => this.ctx.skills.setAutoCast(skill.id, !this.ctx.skills.isAutoCast(skill.id)) },
      });
      refs.info = el('span', { class: 'muted' });
      refs.root = el('div', { class: 'skill-slot', on: { mouseenter: () => this.renderInfo(skill) } }, [
        refs.button,
        refs.auto,
        el('div', { class: 'skill-tooltip' }, [el('strong', { text: skill.name }), el('p', { text: skill.description }), refs.info]),
      ]);
      this.slots.set(skill.id, refs);
      this.root.append(refs.root);
      this.renderAuto(skill.id);
      this.renderInfo(skill);
    }
  }

  bind() {
    const { bus, skills } = this.ctx;
    bus.on(Events.SKILL_AUTOCAST_CHANGED, ({ id }) => this.renderAuto(id));
    bus.on(Events.SKILL_ACTIVATED, ({ id }) => replayAnimation(this.slots.get(id).button, 'cast'));
    bus.on(Events.SKILL_REJECTED, ({ id, reason }) => {
      replayAnimation(this.slots.get(id).button, 'shake');
      if (REJECT_MESSAGES[reason]) this.ui.toast(REJECT_MESSAGES[reason], 'error');
    });

    document.addEventListener('keydown', (e) => {
      if (e.repeat || e.target.closest?.('input, textarea')) return;
      const skill = skills.list.find((s) => s.hotkey === e.key);
      if (skill) skills.activate(skill.id);
    });
  }

  /** Bekleme/süre yetenek seviyesi ve pasiflerle değişir; ipucu açılırken güncellenir. */
  renderInfo(skill) {
    const { skills } = this.ctx;
    const duration = skill.duration > 0 ? ` · Süre ${skills.durationFor(skill.id).toFixed(1)}sn` : '';
    this.slots.get(skill.id).info.textContent = `Bekleme ${skills.cooldownFor(skill.id).toFixed(1)}sn${duration} · Tuş ${skill.hotkey}`;
  }

  renderAuto(id) {
    const refs = this.slots.get(id);
    const on = this.ctx.skills.isAutoCast(id);
    refs.auto.classList.toggle('on', on);
    refs.auto.setAttribute('aria-pressed', String(on));
  }

  tick() {
    const { skills } = this.ctx;
    for (const skill of skills.list) {
      const refs = this.slots.get(skill.id);
      const unlocked = skills.isUnlocked(skill.id);
      const cd = skills.cooldownRemaining(skill.id);
      const active = skills.activeRemaining(skill.id);

      this.set(refs, 'unlocked', unlocked, (v) => {
        refs.root.classList.toggle('locked', !v);
        refs.lock.textContent = v ? '' : `🔒${skill.unlockStage}`;
        refs.auto.disabled = !v;
      });
      this.set(refs, 'ready', unlocked && cd <= 0, (v) => refs.root.classList.toggle('ready', v));
      this.set(refs, 'active', active > 0, (v) => refs.root.classList.toggle('active', v));
      this.set(refs, 'cd', Math.round((cd / skills.cooldownFor(skill.id)) * 200) / 200, (v) =>
        refs.cooldown.style.setProperty('--cd', v),
      );
      const label = active > 0 ? `${active.toFixed(1)}` : cd > 0 ? `${Math.ceil(cd)}` : '';
      this.set(refs, 'label', label, (v) => (refs.timer.textContent = v));
      const rank = skills.rank(skill.id);
      this.set(refs, 'rank', unlocked && rank > 1 ? SkillTreeSystem.rankLabel(rank) : '', (v) => (refs.rank.textContent = v));
    }
    requestAnimationFrame(this.tick);
  }

  /** Sadece değer değiştiyse DOM'a yaz. */
  set(refs, key, value, apply) {
    if (refs.last[key] === value) return;
    refs.last[key] = value;
    apply(value);
  }
}
