// Phaser'dan bağımsız basit olay yolu. Oyun sahnesi ile DOM arayüzü birbirini
// tanımadan bu yol üzerinden konuşur.
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /** @returns {() => void} aboneliği iptal eden fonksiyon */
  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of [...handlers]) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] "${event}" dinleyicisinde hata`, err);
      }
    }
  }
}

export const bus = new EventBus();
