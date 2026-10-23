import { Events } from '../core/events.js';
import { formatNumber, formatTime } from '../utils/format.js';
import { el } from './dom.js';
import { WindowManager } from './WindowManager.js';
import { AudioButtonView } from './views/AudioButtonView.js';
import { BarLeftView } from './views/BarLeftView.js';
import { ChatLogView } from './views/ChatLogView.js';
import { HeroFrameView } from './views/HeroFrameView.js';
import { QuestTrackerView } from './views/QuestTrackerView.js';
import { HudView } from './views/HudView.js';
import { ModalView } from './views/ModalView.js';
import { SkillBarView } from './views/SkillBarView.js';
import { ToastView } from './views/ToastView.js';

export class UIManager {
  constructor(ctx) {
    this.ctx = ctx;
  }

  mount() {
    const { ctx } = this;
    this.modal = new ModalView(document.getElementById('modal-root'));
    this.toasts = new ToastView(document.getElementById('toasts'), ctx.bus);
    this.hud = new HudView(document.getElementById('hud'), ctx);
    this.heroFrame = new HeroFrameView(document.getElementById('hero-frame'), ctx);
    this.skillBar = new SkillBarView(document.getElementById('skillbar'), ctx, this);
    this.audioButton = new AudioButtonView(document.querySelector('.stage-area'), ctx);
    this.windows = new WindowManager(document.getElementById('windows'), document.getElementById('menubar'), ctx, this);
    this.heroFrame.avatar.addEventListener('click', () => this.windows.toggle('stats'));
    this.questTracker = new QuestTrackerView(document.getElementById('quest-tracker'), ctx, this);
    this.chatLog = new ChatLogView(document.getElementById('chatlog'), ctx);
    this.barLeft = new BarLeftView(document.getElementById('bar-left'), ctx, { onToggleLog: () => this.chatLog.toggle() });

    // Enter: kaydı aç/kapat (Metin2'deki sohbet kutusu gibi)
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Enter' || e.repeat || e.defaultPrevented || e.target.closest?.('input, textarea, select, button')) return;
      if (document.querySelector('.modal-backdrop')) return;
      this.chatLog.toggle();
    });

    ctx.bus.on(Events.OFFLINE_EARNINGS, (result) => this.showOfflineEarnings(result));
  }

  toast(message, type = 'info', color) {
    this.ctx.bus.emit(Events.TOAST, { message, type, color });
  }

  showOfflineEarnings({ cappedSeconds, gold, capped }) {
    const content = el('div', { class: 'offline' }, [
      el('div', { class: 'offline-icon', text: '🌙' }),
      el('p', {}, ['Sen yokken kahramanın ', el('strong', { text: formatTime(cappedSeconds) }), ' boyunca savaştı.']),
      el('div', { class: 'offline-gold' }, [el('span', { class: 'coin-icon' }), `+${formatNumber(gold)}`]),
      capped ? el('p', { class: 'muted', text: 'Offline kazanç en fazla 8 saat birikir.' }) : null,
    ]);
    this.modal.open({
      title: 'Tekrar hoş geldin!',
      content,
      dismissible: false,
      actions: [
        {
          label: 'Topla',
          variant: 'primary',
          onClick: () => this.ctx.economy.addGold(gold, 'offline'),
        },
      ],
    });
  }
}
