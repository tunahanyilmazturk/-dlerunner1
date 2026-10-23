import { Events } from '../../core/events.js';
import { formatNumber } from '../../utils/format.js';
import { el, rafThrottle } from '../dom.js';

const STORAGE_KEY = 'idle-blade-runner:quest-tracker-open';

function loadOpen() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === null ? !window.matchMedia('(max-width: 900px)').matches : value === '1';
  } catch {
    return true;
  }
}

// Karakter çerçevesinin altında aktif günlük görevler (MMO "görev takipçisi").
// Başlığa tıklayınca açılır/kapanır; bir göreve tıklayınca Görevler penceresi açılır.
export class QuestTrackerView {
  constructor(root, ctx, ui) {
    this.root = root;
    this.ctx = ctx;
    this.ui = ui;
    this.open = loadOpen();
    this.rows = [];
    this.lastKey = null;

    this.countEl = el('span', { class: 'tracker-count' });
    this.arrow = el('span', { class: 'tracker-arrow' });
    this.header = el('button', { class: 'tracker-header', type: 'button', title: 'Görevleri aç/kapat', on: { click: () => this.toggle() } }, [
      el('span', { class: 'tracker-title', text: '📜 Günlük Görevler' }),
      this.countEl,
      this.arrow,
    ]);
    this.list = el('div', { class: 'tracker-list' });
    root.append(this.header, this.list);

    const render = rafThrottle(() => this.render());
    ctx.bus.on(Events.QUESTS_UPDATED, render);
    this.render();
  }

  toggle() {
    // Mobilde oyun alanı küçük: takipçi sadece başlık, dokununca Görevler penceresi açılır
    if (window.matchMedia('(max-width: 900px)').matches) {
      this.ui.windows.open('quests');
      return;
    }
    this.open = !this.open;
    try {
      localStorage.setItem(STORAGE_KEY, this.open ? '1' : '0');
    } catch {
      // tercih sadece bu oturumda kalır
    }
    this.render();
  }

  render() {
    const { quests } = this.ctx;
    const done = quests.list.filter((q) => q.claimed).length;
    const ready = quests.claimableCount;
    this.countEl.textContent = ready ? `${ready} hazır` : `${done}/${quests.list.length}`;
    this.countEl.classList.toggle('ready', ready > 0);
    this.arrow.textContent = this.open ? '▾' : '▸';
    this.root.classList.toggle('collapsed', !this.open);
    if (!this.open) return;

    // Yapı değişmediyse sadece çubukları güncelle (her saniye yeniden kurmamak için)
    const key = quests.list.map((q) => `${q.id}:${q.claimed}:${quests.isComplete(q)}`).join('|') + quests.data.bonusClaimed;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.build();
    }
    for (const { quest, fill, text } of this.rows) {
      const progress = quests.progress(quest);
      fill.style.width = `${(progress / quest.target) * 100}%`;
      text.textContent = `${formatNumber(progress)}/${formatNumber(quest.target)}`;
    }
  }

  build() {
    const { quests } = this.ctx;
    this.rows = [];
    const items = quests.list.map((quest) => {
      const template = quests.template(quest);
      const complete = quests.isComplete(quest);
      const fill = el('div', { class: `bar-fill ${complete ? 'bar-fill--done' : 'bar-fill--progress'}` });
      const text = el('span', { class: 'bar-text' });
      this.rows.push({ quest, fill, text });
      return el(
        'button',
        {
          class: `tracker-item${quest.claimed ? ' done' : complete ? ' ready' : ''}`,
          type: 'button',
          title: 'Görevler penceresini aç (Q)',
          on: { click: () => this.ui.windows.open('quests') },
        },
        [
          el('span', { class: 'tracker-icon', text: quest.claimed ? '✓' : template.icon }),
          el('span', { class: 'tracker-body' }, [
            el('span', { class: 'tracker-text', text: template.text(quest.target) }),
            quest.claimed ? null : el('span', { class: 'bar tracker-bar' }, [fill, text]),
          ]),
          complete && !quest.claimed ? el('span', { class: 'tracker-claim', text: 'Topla!' }) : null,
        ],
      );
    });
    if (quests.canClaimBonus) {
      items.push(el('button', { class: 'tracker-item ready', type: 'button', on: { click: () => this.ui.windows.open('quests') } }, [el('span', { class: 'tracker-icon', text: '🎁' }), el('span', { class: 'tracker-text', text: 'Günlük sandık hazır!' })]));
    }
    this.list.replaceChildren(...items);
  }
}
