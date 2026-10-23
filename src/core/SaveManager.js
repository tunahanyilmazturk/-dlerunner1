import { hydrateState } from './GameState.js';

export class SaveManager {
  constructor(key) {
    this.key = key;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      return hydrateState(JSON.parse(raw));
    } catch (err) {
      console.warn('[Save] Kayıt okunamadı, yeni oyun başlatılıyor.', err);
      return null;
    }
  }

  save(state) {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
      return true;
    } catch (err) {
      console.warn('[Save] Kayıt yazılamadı.', err);
      return false;
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // depolama erişilemezse yapacak bir şey yok
    }
  }

  exportString(state) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  }

  importString(text) {
    const json = decodeURIComponent(escape(atob(text.trim())));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.gold !== 'number') {
      throw new Error('Geçersiz kayıt verisi');
    }
    return hydrateState(parsed);
  }
}
