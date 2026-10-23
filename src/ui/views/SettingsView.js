import { Events } from '../../core/events.js';
import { GRAPHICS_QUALITY, getRenderScale } from '../../game/renderScale.js';
import { el } from '../dom.js';

const TOGGLES = [
  { key: 'damageNumbers', label: 'Hasar sayıları', hint: 'Vuruşlarda uçan sayıları göster' },
  { key: 'screenShake', label: 'Ekran sarsıntısı', hint: 'Kritik ve boss vuruşlarında sars' },
];

export class SettingsView {
  constructor(ctx, ui) {
    this.ctx = ctx;
    this.ui = ui;
    this.element = el('section', { class: 'view settings' });
    this.build();
    ctx.bus.on(Events.GAME_SAVED, ({ at }) => {
      this.savedAt.textContent = `Son kayıt: ${new Date(at).toLocaleTimeString('tr-TR')}`;
    });
  }

  build() {
    const toggles = TOGGLES.map(({ key, label, hint }) => {
      const input = el('input', {
        type: 'checkbox',
        checked: this.ctx.state.settings[key],
        on: { change: (e) => this.ctx.updateSetting(key, e.target.checked) },
      });
      return el('label', { class: 'toggle' }, [
        el('div', {}, [el('div', { class: 'toggle-label', text: label }), el('div', { class: 'muted', text: hint })]),
        input,
        el('span', { class: 'toggle-switch' }),
      ]);
    });

    this.savedAt = el('p', { class: 'muted' });

    const saveActions = el('div', { class: 'button-grid' }, [
      el('button', { class: 'btn', type: 'button', text: '💾 Kaydet', on: { click: () => this.manualSave() } }),
      el('button', { class: 'btn', type: 'button', text: '📤 Dışa aktar', on: { click: () => this.exportSave() } }),
      el('button', { class: 'btn', type: 'button', text: '📥 İçe aktar', on: { click: () => this.importSave() } }),
      el('button', { class: 'btn btn--danger', type: 'button', text: '🗑️ Sıfırla', on: { click: () => this.confirmReset() } }),
    ]);

    this.element.append(
      this.buildAudioGroup(),
      el('div', { class: 'settings-group' }, [el('h3', { text: 'Görsel' }), this.buildGraphicsRow(), ...toggles]),
      el('div', { class: 'settings-group' }, [el('h3', { text: 'Kayıt' }), saveActions, this.savedAt]),
      el('p', { class: 'muted version', text: 'Idle Blade Runner v0.1.0' }),
    );
  }

  /** Grafik kalitesi: tuval/doku çözünürlüğü. Dokular açılışta üretildiği için yeniden yükleme gerekir. */
  buildGraphicsRow() {
    const current = this.ctx.state.settings.graphics ?? 'auto';
    const select = el(
      'select',
      {
        class: 'select',
        on: {
          change: (e) => {
            this.ctx.updateSetting('graphics', e.target.value);
            this.ui.modal.open({
              title: 'Grafik kalitesi',
              content: 'Yeni kalite sayfa yenilenince uygulanır. Şimdi yenilensin mi? (İlerleme kaydedildi.)',
              actions: [
                { label: 'Sonra', variant: 'ghost' },
                { label: 'Yenile', variant: 'primary', onClick: () => location.reload() },
              ],
            });
          },
        },
      },
      Object.entries(GRAPHICS_QUALITY).map(([key, q]) =>
        el('option', { value: key, selected: key === current, text: q.scale ? `${q.label} (${q.scale}x)` : `${q.label} (şu an ${getRenderScale()}x)` }),
      ),
    );
    return el('label', { class: 'toggle' }, [
      el('div', {}, [el('div', { class: 'toggle-label', text: 'Grafik kalitesi' }), el('div', { class: 'muted', text: 'Yüksek: büyük ekranda daha keskin, daha çok bellek' })]),
      select,
    ]);
  }

  buildAudioGroup() {
    const audio = this.ctx.state.settings.audio;
    const mute = el('input', {
      type: 'checkbox',
      checked: audio.muted,
      on: { change: (e) => this.ctx.updateAudioSetting('muted', e.target.checked) },
    });
    // Düğmeyle (M tuşu / 🔊) değişirse bu kutu da güncellensin
    this.ctx.bus.on(Events.SETTINGS_CHANGED, ({ audioKey, value }) => {
      if (audioKey === 'muted') mute.checked = value;
    });

    const sliders = [
      { key: 'master', label: 'Genel ses' },
      { key: 'music', label: 'Müzik' },
      { key: 'sfx', label: 'Efektler' },
    ].map(({ key, label }) => {
      const output = el('span', { class: 'slider-value', text: `%${Math.round(audio[key] * 100)}` });
      const input = el('input', {
        type: 'range',
        class: 'slider',
        min: 0,
        max: 100,
        step: 5,
        value: Math.round(audio[key] * 100),
        on: {
          // Sürüklerken anlık uygula, bırakınca kaydet
          input: (e) => {
            output.textContent = `%${e.target.value}`;
            this.ctx.updateAudioSetting(key, e.target.value / 100, { save: false });
          },
          change: () => this.ctx.saveNow(),
        },
      });
      return el('label', { class: 'slider-row' }, [el('span', { class: 'toggle-label', text: label }), input, output]);
    });

    return el('div', { class: 'settings-group' }, [
      el('h3', { text: 'Ses' }),
      el('label', { class: 'toggle' }, [
        el('div', {}, [el('div', { class: 'toggle-label', text: 'Sessiz' }), el('div', { class: 'muted', text: 'Tüm sesleri kapat (kısayol: M)' })]),
        mute,
        el('span', { class: 'toggle-switch' }),
      ]),
      ...sliders,
    ]);
  }

  manualSave() {
    this.ctx.saveNow();
    this.ui.toast('Oyun kaydedildi', 'success');
  }

  exportSave() {
    const code = this.ctx.exportSave();
    const textarea = el('textarea', { class: 'save-code', readonly: true, rows: 6 }, [code]);
    navigator.clipboard?.writeText(code).then(
      () => this.ui.toast('Kayıt kodu panoya kopyalandı', 'success'),
      () => {},
    );
    this.ui.modal.open({
      title: 'Kayıt kodu',
      content: el('div', {}, [el('p', { class: 'muted', text: 'Bu kodu sakla; başka cihazda içe aktarabilirsin.' }), textarea]),
      actions: [{ label: 'Kapat', variant: 'primary' }],
    });
    textarea.select();
  }

  importSave() {
    const textarea = el('textarea', { class: 'save-code', rows: 6, placeholder: 'Kayıt kodunu buraya yapıştır…' });
    this.ui.modal.open({
      title: 'Kayıt içe aktar',
      content: el('div', {}, [el('p', { class: 'muted', text: 'Mevcut ilerlemenin üzerine yazılır.' }), textarea]),
      actions: [
        { label: 'Vazgeç', variant: 'ghost' },
        {
          label: 'İçe aktar',
          variant: 'primary',
          onClick: () => {
            try {
              this.ctx.importSave(textarea.value);
            } catch {
              this.ui.toast('Kayıt kodu geçersiz', 'error');
              return false;
            }
            return true;
          },
        },
      ],
    });
  }

  confirmReset() {
    this.ui.modal.open({
      title: 'İlerleme sıfırlansın mı?',
      content: 'Tüm altın, yükseltme ve aşamalar silinecek. Bu işlem geri alınamaz.',
      actions: [
        { label: 'Vazgeç', variant: 'ghost' },
        { label: 'Evet, sıfırla', variant: 'danger', onClick: () => this.ctx.resetProgress() },
      ],
    });
  }
}
