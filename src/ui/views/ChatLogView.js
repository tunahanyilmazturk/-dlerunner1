import { Events } from '../../core/events.js';
import { RARITIES } from '../../data/equipment.js';
import { RELIC_MAP } from '../../data/relics.js';
import { toCssColor } from '../../utils/color.js';
import { formatNumber, toRoman } from '../../utils/format.js';
import { el } from '../dom.js';

const BOSS_LOG = {
  interrupted: '💫 Bossu sersemlettin, yere vuruşu iptal oldu!',
  shieldStart: '🛡 Boss kalkan açtı (hasar azaldı)',
  enrage: '😡 Boss öfkelendi!',
};

// Sol alttaki yarı saydam olay kaydı (Metin2 sohbet kutusu gibi). Oyun olaylarını dinleyip
// kanallara göre satır ekler; sekmelerle süzülür, başlıktan küçültülür.
// Yeni bir kayıt türü: bind() içinde bir olaya this.add(kanal, metin, renk) bağla.

const CHANNELS = [
  { id: 'all', label: 'Tümü' },
  { id: 'combat', label: 'Savaş' },
  { id: 'loot', label: 'Ganimet' },
  { id: 'system', label: 'Sistem' },
];
const CHANNEL_COLORS = { combat: '#ff9a7a', loot: '#ffd36b', system: '#9fd0ff' };
const MAX_LINES = 120;
const STORAGE_KEY = 'idle-blade-runner:chatlog';

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

export class ChatLogView {
  constructor(root, ctx) {
    this.root = root;
    this.ctx = ctx;
    const prefs = loadPrefs();
    this.channel = prefs.channel ?? 'all';
    this.open = prefs.open ?? !window.matchMedia('(max-width: 900px)').matches;
    this.lines = [];
    this.stageGold = ctx.state.stats.totalGold;

    this.build();
    this.bind();
    this.add('system', 'Hoş geldin, kahraman! Kısayollar: U yükseltme · I envanter · Q görevler · P prestij · C karakter · Esc ayarlar', '#f3d58a');
    this.render();
  }

  build() {
    this.tabs = CHANNELS.map((c) =>
      el('button', { class: 'chat-tab', type: 'button', text: c.label, on: { click: () => this.setChannel(c.id) } }),
    );
    this.minButton = el('button', { class: 'chat-min', type: 'button', title: 'Küçült / büyüt', on: { click: () => this.toggle() } });
    this.body = el('div', { class: 'chat-body' });
    this.body.addEventListener('scroll', () => {
      // Kullanıcı yukarı kaydırdıysa yeni satırda zorla aşağı kaydırma
      this.stick = this.body.scrollTop + this.body.clientHeight >= this.body.scrollHeight - 8;
    });
    this.stick = true;
    this.root.append(el('div', { class: 'chat-head' }, [el('span', { class: 'chat-title', text: '💬 Kayıt' }), ...this.tabs, this.minButton]), this.body);
  }

  savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ channel: this.channel, open: this.open }));
    } catch {
      // tercih sadece bu oturumda kalır
    }
  }

  toggle(force) {
    this.open = force ?? !this.open;
    this.savePrefs();
    this.render();
  }

  setChannel(id) {
    this.channel = id;
    this.open = true;
    this.savePrefs();
    this.render();
  }

  /** Kayda satır ekler. color verilmezse kanal rengi kullanılır. */
  add(channel, text, color) {
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const line = { channel, text, color: color ?? CHANNEL_COLORS[channel], time };
    this.lines.push(line);
    if (this.lines.length > MAX_LINES) this.lines.shift();
    if (this.channel === 'all' || this.channel === channel) {
      this.body.append(this.renderLine(line));
      while (this.body.childElementCount > MAX_LINES) this.body.firstElementChild.remove();
      if (this.stick) this.body.scrollTop = this.body.scrollHeight;
    }
    if (!this.open) this.root.classList.add('unread');
  }

  renderLine({ channel, text, color, time }) {
    const tag = CHANNELS.find((c) => c.id === channel)?.label ?? '';
    return el('div', { class: 'chat-line' }, [
      el('span', { class: 'chat-time', text: time }),
      el('span', { class: 'chat-tag', text: `[${tag}]`, style: { color: CHANNEL_COLORS[channel] } }),
      el('span', { class: 'chat-text', text, style: { color } }),
    ]);
  }

  render() {
    this.root.classList.toggle('collapsed', !this.open);
    if (this.open) this.root.classList.remove('unread');
    this.minButton.textContent = this.open ? '▾' : '▴';
    this.tabs.forEach((tab, i) => tab.classList.toggle('active', CHANNELS[i].id === this.channel));
    const visible = this.lines.filter((l) => this.channel === 'all' || l.channel === this.channel);
    this.body.replaceChildren(...visible.map((l) => this.renderLine(l)));
    this.body.scrollTop = this.body.scrollHeight;
    this.stick = true;
  }

  bind() {
    const { bus, stages, state } = this.ctx;

    // Savaş
    bus.on(Events.BOSS_SPAWNED, (c) => this.add('combat', `⚠ Boss geldi: ${c.name}!`, '#ff6b6b'));
    bus.on(Events.ELITE_SPAWNED, (c) => this.add('combat', `⚠ ${c.name} yaklaşıyor`, '#ffd23f'));
    bus.on(Events.STAGE_CLEARED, ({ stage, isBoss }) => {
      const gold = state.stats.totalGold - this.stageGold;
      this.stageGold = state.stats.totalGold;
      if (isBoss) this.add('combat', `👑 ${stages.zoneInfo.zone.name} bossu yenildi! (Aşama ${stage})`, '#ffd23f');
      else this.add('combat', `Aşama ${stage} geçildi · +${formatNumber(gold)} altın`);
    });
    bus.on(Events.STAGE_FAILED, ({ reason, stage }) =>
      this.add('combat', reason === 'timeout' ? `⏱ Boss süresi doldu (Aşama ${stage}), geri çekiliyorsun` : `☠ Yenildin (Aşama ${stage}), geri çekiliyorsun`, '#ff6b6b'),
    );
    bus.on(Events.LEVEL_UP, ({ level }) => this.add('combat', `⭐ Seviye atladın! Artık Sv. ${level}`, '#ffd23f'));

    // Ganimet
    bus.on(Events.ITEM_DROPPED, ({ item, rarityIndex, outcome, shards }) => {
      const rarity = RARITIES[rarityIndex];
      const color = toCssColor(rarity.color);
      const name = `${rarity.name} ${item.name}`;
      if (outcome === 'equipped') this.add('loot', `${name} bulundu ve kuşanıldı ▲`, color);
      else if (outcome === 'stored') this.add('loot', `${name} bulundu`, color);
      else this.add('loot', `${name} parçalandı (+${shards} 💠)${outcome === 'full' ? ' — çanta dolu' : ''}`, color);
    });
    bus.on(Events.BOSS_MECHANIC, ({ type }) => {
      const text = BOSS_LOG[type];
      if (text) this.add('combat', text, '#ff9a6b');
    });
    bus.on(Events.PET_EGG_FOUND, () => this.add('loot', '🥚 Bir yoldaş yumurtası buldun! (Y)', '#ffe9a8'));
    bus.on(Events.PET_HATCHED, ({ pet, isNew, level }) => this.add('system', isNew ? `🐾 Yeni yoldaş: ${pet.name}` : `🐾 ${pet.name} tekrar çıktı (Sv. ${level})`, '#ffe9a8'));
    bus.on(Events.PET_LEVEL_UP, ({ pet, level }) => this.add('system', `🐾 ${pet.name} Sv. ${level} oldu`, '#ffe9a8'));
    bus.on(Events.ITEM_FORGED, ({ item, kind }) => {
      const rarity = RARITIES.find((r) => r.id === item.rarity);
      const text = kind === 'combine' ? `⚗️ Demirci: ${rarity.name} ${item.name} dövüldü` : `🔨 Demirci: ${item.name} yeniden dövüldü`;
      this.add('loot', text, toCssColor(rarity.color));
    });
    bus.on(Events.GOLD_CHANGED, ({ delta, source }) => {
      if (source === 'offline') this.add('loot', `🌙 Offline kazanç: +${formatNumber(delta)} altın`);
      if (source === 'quest') this.add('loot', `📜 Görev ödülü: +${formatNumber(delta)} altın`);
    });

    // Sistem
    bus.on(Events.STAGE_CHANGED, ({ zoneInfo }) => {
      if (zoneInfo.stageInZone === 1) this.add('system', `🗺 Yeni bölge: ${zoneInfo.label}`);
    });
    bus.on(Events.ACHIEVEMENT_REACHED, ({ achievement, tier }) => this.add('system', `🏆 Başarım: ${achievement.name} ${toRoman(tier)}`, '#ffd23f'));
    bus.on(Events.QUEST_COMPLETED, ({ template, quest }) => this.add('system', `📜 Görev tamamlandı: ${template.text(quest.target)}`));
    bus.on(Events.PRESTIGE_DONE, ({ gained, rebirths }) => this.add('system', `🔮 Yeniden doğdun (${rebirths}.) · +${gained} Ruh Taşı`, '#c9a7ff'));
    bus.on(Events.RELIC_PURCHASED, ({ id, level }) => this.add('system', `🔮 Relic güçlendi: ${RELIC_MAP[id]?.name ?? id} Sv. ${level}`, '#c9a7ff'));
  }
}
