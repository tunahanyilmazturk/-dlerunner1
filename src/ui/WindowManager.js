import { el } from './dom.js';
import { BlacksmithView } from './views/BlacksmithView.js';
import { EquipmentView } from './views/EquipmentView.js';
import { PetsView } from './views/PetsView.js';
import { PrestigeView } from './views/PrestigeView.js';
import { QuestsView } from './views/QuestsView.js';
import { SettingsView } from './views/SettingsView.js';
import { ShopView } from './views/ShopView.js';
import { SkillTreeView } from './views/SkillTreeView.js';
import { StatsView } from './views/StatsView.js';

// Metin2 tarzı oyun pencereleri: sağ alttaki menü ikonları (ve kısayol tuşları) pencereleri
// açıp kapatır. Pencereler başlık çubuğundan sürüklenir, tıklanan öne gelir, konum hatırlanır.
// Yeni pencere: WINDOWS listesine `element` alanı olan bir görünüm sınıfı ekle.
//
// Kısayollar fiziksel tuş koduyla (KeyboardEvent.code) eşleşir: klavye dili ne olursa olsun
// aynı tuş çalışır. Türkçe Q klavyede "I" etiketli tuş (ı/I) envanteri açar; ayrıca o tuşun
// ürettiği karakter (keys) de kabul edilir. Esc ayarları açar (açık pencere varsa önce onu kapatır).
const WINDOWS = [
  { id: 'shop', title: 'Yükseltmeler', icon: '⚒️', code: 'KeyU', label: 'U', View: ShopView, width: 390 },
  { id: 'equipment', title: 'Envanter', icon: '🎒', code: 'KeyI', keys: ['ı'], label: 'I', View: EquipmentView, width: 470 },
  { id: 'blacksmith', title: 'Demirci', icon: '🔨', code: 'KeyB', label: 'B', View: BlacksmithView, width: 430 },
  { id: 'pets', title: 'Yoldaşlar', icon: '🐾', code: 'KeyY', label: 'Y', View: PetsView, width: 440 },
  { id: 'skilltree', title: 'Yetenekler', icon: '📖', code: 'KeyK', label: 'K', View: SkillTreeView, width: 430 },
  { id: 'quests', title: 'Görevler', icon: '📜', code: 'KeyQ', label: 'Q', View: QuestsView, width: 390 },
  { id: 'prestige', title: 'Prestij', icon: '🔮', code: 'KeyP', label: 'P', View: PrestigeView, width: 390 },
  { id: 'stats', title: 'Karakter', icon: '📊', code: 'KeyC', label: 'C', View: StatsView, width: 340 },
  { id: 'settings', title: 'Ayarlar', icon: '⚙️', code: 'Escape', label: 'Esc', View: SettingsView, width: 360 },
];

const STORAGE_KEY = 'idle-blade-runner:windows';
const MOBILE_QUERY = window.matchMedia('(max-width: 900px)');

function loadPositions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function savePositions(positions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // depolama yoksa konumlar sadece bu oturumda kalır
  }
}

export class WindowManager {
  constructor(root, menubar, ctx, ui) {
    this.root = root;
    this.windows = new Map();
    this.positions = loadPositions();
    this.zIndex = 10;

    WINDOWS.forEach((def, index) => {
      const view = new def.View(ctx, ui);
      const closeButton = el('button', { class: 'window-close', type: 'button', title: 'Kapat (Esc)', text: '✕', on: { click: () => this.close(def.id) } });
      const titlebar = el('header', { class: 'window-titlebar' }, [
        el('span', { class: 'window-icon', text: def.icon }),
        el('span', { class: 'window-title', text: def.title }),
        el('kbd', { class: 'window-key', text: def.label }),
        closeButton,
      ]);
      const body = el('div', { class: 'window-body' }, [view.element]);
      const frame = el('section', { class: 'game-window', role: 'dialog', 'aria-label': def.title, hidden: true, style: { '--w': `${def.width}px` } }, [titlebar, body]);
      frame.addEventListener('pointerdown', () => this.focus(def.id));
      this.makeDraggable(def.id, frame, titlebar, closeButton);
      root.append(frame);

      const badge = el('span', { class: 'menu-badge', hidden: true });
      const button = el(
        'button',
        { class: 'menu-btn', type: 'button', title: `${def.title} (${def.label})`, on: { click: () => this.toggle(def.id) } },
        [el('span', { class: 'menu-icon', text: def.icon }), el('kbd', { class: 'menu-key', text: def.label }), badge],
      );
      menubar.append(button);

      view.element.hidden = false;
      view.setBadge = (text) => {
        badge.textContent = text;
        badge.hidden = !text;
      };
      view.onMount?.();
      this.windows.set(def.id, { def, view, frame, button, index });
    });

    document.addEventListener('keydown', (e) => this.onKey(e));
  }

  isOpen(id) {
    return !this.windows.get(id).frame.hidden;
  }

  toggle(id) {
    if (this.isOpen(id)) this.close(id);
    else this.open(id);
  }

  open(id) {
    const w = this.windows.get(id);
    if (!w.frame.hidden) return this.focus(id);
    // Mobilde ekran dar: aynı anda tek pencere
    if (MOBILE_QUERY.matches) for (const other of this.windows.keys()) if (other !== id) this.close(other);
    w.frame.hidden = false;
    this.applyPosition(id);
    this.focus(id);
    w.button.classList.add('active');
    w.view.onShow?.();
  }

  close(id) {
    const w = this.windows.get(id);
    if (w.frame.hidden) return;
    w.frame.hidden = true;
    w.button.classList.remove('active');
    w.view.onHide?.();
  }

  focus(id) {
    const w = this.windows.get(id);
    w.frame.style.zIndex = ++this.zIndex;
    for (const other of this.windows.values()) other.frame.classList.toggle('focused', other === w);
  }

  /** En üstteki açık pencere. */
  get topmost() {
    let top = null;
    for (const w of this.windows.values()) {
      if (!w.frame.hidden && (!top || Number(w.frame.style.zIndex) > Number(top.frame.style.zIndex))) top = w;
    }
    return top;
  }

  onKey(e) {
    if (e.repeat || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea, select')) return;
    if (document.querySelector('.modal-backdrop')) return;
    if (e.code === 'Escape' || e.key === 'Escape') {
      // Açık pencere varsa önce en üsttekini kapat; yoksa ayarları aç
      const top = this.topmost;
      if (top) this.close(top.def.id);
      else this.open('settings');
      return;
    }
    const def = WINDOWS.find((d) => d.code === e.code || d.keys?.includes(e.key));
    if (!def) return;
    e.preventDefault();
    this.toggle(def.id);
  }

  // ------------------------------------------------------------ Konum ve sürükleme

  applyPosition(id) {
    const { frame, index } = this.windows.get(id);
    if (MOBILE_QUERY.matches) {
      frame.style.left = frame.style.top = frame.style.maxHeight = '';
      return;
    }
    const area = this.root.getBoundingClientRect();
    const saved = this.positions[id];
    // Varsayılan: sağda, menü ikonlarının üstünde; her pencere biraz kaydırılmış
    const width = frame.offsetWidth;
    const x = saved?.x ?? area.width - width - 16 - (index % 3) * 26;
    const y = saved?.y ?? 64 + (index % 3) * 26;
    this.moveTo(frame, x, y);
  }

  moveTo(frame, x, y) {
    const area = this.root.getBoundingClientRect();
    const maxX = Math.max(0, area.width - frame.offsetWidth);
    const maxY = Math.max(0, area.height - 120);
    const top = Math.min(maxY, Math.max(0, y));
    frame.style.left = `${Math.min(maxX, Math.max(0, x))}px`;
    frame.style.top = `${top}px`;
    // Alt çubuğun arkasına taşmasın: kalan yüksekliğe sığ, içerik kaydırılır
    frame.style.maxHeight = `${area.height - top - 8}px`;
  }

  makeDraggable(id, frame, handle, closeButton) {
    let start = null;
    handle.addEventListener('pointerdown', (e) => {
      if (MOBILE_QUERY.matches || e.button !== 0 || closeButton.contains(e.target)) return;
      start = { px: e.clientX, py: e.clientY, x: frame.offsetLeft, y: frame.offsetTop };
      handle.setPointerCapture(e.pointerId);
      frame.classList.add('dragging');
    });
    handle.addEventListener('pointermove', (e) => {
      if (!start) return;
      this.moveTo(frame, start.x + e.clientX - start.px, start.y + e.clientY - start.py);
    });
    const end = () => {
      if (!start) return;
      start = null;
      frame.classList.remove('dragging');
      this.positions[id] = { x: frame.offsetLeft, y: frame.offsetTop };
      savePositions(this.positions);
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    // Çift tıklama: varsayılan konuma dön
    handle.addEventListener('dblclick', () => {
      delete this.positions[id];
      savePositions(this.positions);
      this.applyPosition(id);
    });
  }
}
