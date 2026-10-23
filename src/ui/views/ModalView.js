import { el } from '../dom.js';

export class ModalView {
  constructor(root) {
    this.root = root;
    this.current = null;
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !this.current) return;
      // Esc modalda tüketilir: arkadaki pencereler/ayarlar tetiklenmesin
      e.preventDefault();
      if (this.current.dismissible) this.close();
    });
  }

  /**
   * actions: [{ label, variant: 'primary' | 'ghost' | 'danger', onClick, disabled }]
   * onClick false dönerse modal açık kalır.
   */
  open({ title, titleColor, content, actions = [], dismissible = true }) {
    this.close();

    const footer = el(
      'div',
      { class: 'modal-actions' },
      actions.map((action) =>
        el('button', {
          class: `btn btn--${action.variant ?? 'ghost'}`,
          type: 'button',
          text: action.label,
          disabled: action.disabled,
          on: {
            click: () => {
              if (action.onClick?.() === false) return;
              this.close();
            },
          },
        }),
      ),
    );

    const dialog = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
      el('h2', { class: 'modal-title', text: title, style: titleColor ? { color: titleColor } : undefined }),
      el('div', { class: 'modal-content' }, [content]),
      footer,
    ]);
    const backdrop = el('div', {
      class: 'modal-backdrop',
      on: {
        click: (e) => {
          if (e.target === backdrop && dismissible) this.close();
        },
      },
    }, [dialog]);

    this.root.append(backdrop);
    this.current = { backdrop, dismissible };
    footer.querySelector('.btn--primary')?.focus();
  }

  close() {
    this.current?.backdrop.remove();
    this.current = null;
  }
}
