import { HERO_HAND, heroLayers, itemVisual } from '../game/graphics/characterTextures.js';
import { toCssColor } from '../utils/color.js';
import { el } from './dom.js';

/**
 * Oyundaki kahraman katman dokularını (64x80, hizalı) DOM'da üst üste koyar.
 * Envanter önizlemesi ve sol üstteki avatar bunu kullanır; ölçek/kırpma CSS ile yapılır.
 * @param textureUrl ctx.textureUrl (dokular hazır değilse null döner)
 */
export function buildHeroStack(textureUrl, appearance, { weapon: showWeapon = true } = {}) {
  if (!textureUrl) return null;
  const layers = heroLayers(appearance);
  const img = (key, extra = {}) => (key ? el('img', { src: textureUrl(key), alt: '', draggable: 'false', class: 'hero-layer', ...extra }) : null);

  // Arkadan öne (Player.js ile aynı sıra); kalkan silahla birlikte gösterilir
  const children = [
    img(layers.cape),
    showWeapon ? img(layers.shield) : null,
    img(layers.body),
    img(layers.boots?.[0]),
    img(layers.armor),
    img(layers.belt),
    img(layers.gloves),
    img(layers.necklace),
    img(layers.earring),
    img(layers.helmet),
  ];

  if (showWeapon) {
    const { weapon } = layers;
    const { width: ww, height: wh, grip } = weapon.spec;
    const style = {
      left: `${HERO_HAND.x - ww / 2}px`,
      top: `${HERO_HAND.y - grip}px`,
      width: `${ww}px`,
      height: `${wh}px`,
      transformOrigin: `${ww / 2}px ${grip}px`,
    };
    if (weapon.glow) {
      children.push(el('div', { class: 'hero-weapon-glow', style: { ...style, '--glow': toCssColor(weapon.glow.color), opacity: weapon.glow.alpha } }));
    }
    children.push(img(weapon.key, { class: 'hero-weapon', style }));
    if (layers.ringGlow) {
      children.push(el('div', { class: 'hero-ring-glow', style: { left: `${HERO_HAND.x}px`, top: `${HERO_HAND.y}px`, '--glow': toCssColor(layers.ringGlow) } }));
    }
  }

  return { element: el('div', { class: 'hero-stage' }, children), signature: JSON.stringify(layers) + showWeapon };
}

/**
 * Envanter ikonu: eşyanın gerçek dokusu (gövde katmanından kırpılmış bölge, silah ya da takı).
 * Dokular hazır değilse emoji ikonuna düşer.
 */
export function buildItemArt(textureUrl, item, baseId, size = 40) {
  if (!textureUrl) return el('span', { class: 'item-icon', text: item.icon });
  const visual = itemVisual(item.slot, baseId, item.rarity);
  const url = textureUrl(visual.key);
  if (!url) return el('span', { class: 'item-icon', text: item.icon });

  const [tw, th] = visual.size;
  const [cx, cy, cw, ch] = visual.crop ?? [0, 0, tw, th];
  // Kırpılan bölge kutuya sığacak şekilde ölçeklenir
  const k = (size * 0.86) / Math.max(cw, ch);
  return el('span', {
    class: 'item-art',
    style: {
      width: `${cw * k}px`,
      height: `${ch * k}px`,
      backgroundImage: `url(${url})`,
      backgroundSize: `${tw * k}px ${th * k}px`,
      backgroundPosition: `${-cx * k}px ${-cy * k}px`,
      transform: visual.rotate ? `rotate(${visual.rotate}deg)` : undefined,
    },
  });
}
