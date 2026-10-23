import { STAGE } from '../../config/balance.js';
import { Events } from '../../core/events.js';
import { el, rafThrottle } from '../dom.js';

// Üst ortadaki bölge/aşama göstergesi (ilerleme + boss süresi).
// Karakter bilgileri (HP, EXP, altın) alt çubuktaki HeroFrameView'da.
export class HudView {
  constructor(root, ctx) {
    this.root = root;
    this.ctx = ctx;
    this.build();
    this.bind();
    this.renderStage();
  }

  build() {
    this.zoneLabel = el('div', { class: 'hud-zone' });
    this.stageLabel = el('div', { class: 'hud-stage' });
    this.progressFill = el('div', { class: 'bar-fill bar-fill--progress' });
    this.progressText = el('span', { class: 'bar-text' });
    this.bossFill = el('div', { class: 'bar-fill bar-fill--boss' });
    this.bossText = el('span', { class: 'bar-text' });
    this.bossBar = el('div', { class: 'bar bar--boss', hidden: true }, [this.bossFill, this.bossText]);

    this.root.append(
      el('div', { class: 'hud-card hud-center' }, [
        el('div', { class: 'hud-stage-row' }, [this.zoneLabel, this.stageLabel]),
        el('div', { class: 'bar' }, [this.progressFill, this.progressText]),
        this.bossBar,
      ]),
    );
  }

  bind() {
    const { bus } = this.ctx;
    const renderBoss = rafThrottle((e) => this.renderBossTimer(e));
    bus.on(Events.STAGE_PROGRESS, () => this.renderStage());
    bus.on(Events.STAGE_CHANGED, () => this.renderStage());
    bus.on(Events.BOSS_TIMER, renderBoss);
  }

  renderStage() {
    const { stages } = this.ctx;
    const { label, stageInZone } = stages.zoneInfo;
    this.zoneLabel.textContent = label;
    this.stageLabel.textContent = `Aşama ${stages.stage} · ${stageInZone}/${STAGE.STAGES_PER_ZONE}`;

    this.progressFill.style.width = `${(stages.kills / stages.required) * 100}%`;
    this.progressText.textContent = stages.isBoss ? '👑 Boss aşaması' : `${stages.kills} / ${stages.required} düşman`;
    this.root.classList.toggle('is-boss', stages.isBoss);

    this.bossBar.hidden = !stages.isBoss;
    if (stages.isBoss) this.renderBossTimer({ remaining: stages.bossTimer, total: STAGE.BOSS_TIME_LIMIT });
  }

  renderBossTimer({ remaining, total }) {
    this.bossFill.style.width = `${(remaining / total) * 100}%`;
    this.bossText.textContent = `⏱ ${remaining.toFixed(1)}sn`;
  }
}
