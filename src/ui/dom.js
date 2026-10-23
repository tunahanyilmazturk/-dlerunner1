/**
 * Küçük DOM yardımcısı: el('div', { class: 'card', on: { click } }, [child, 'metin'])
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'on') Object.entries(value).forEach(([event, fn]) => node.addEventListener(event, fn));
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style') {
      // '--degisken' biçimindeki CSS değişkenleri sadece setProperty ile atanabilir
      for (const [prop, v] of Object.entries(value)) {
        if (prop.startsWith('--')) node.style.setProperty(prop, v);
        else node.style[prop] = v;
      }
    }
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Bir karede en fazla bir kez çalışır; sık gelen olaylarda DOM'u yormaz. */
export function rafThrottle(fn) {
  let scheduled = false;
  let lastArgs;
  return (...args) => {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fn(...lastArgs);
    });
  };
}

/** CSS animasyonunu yeniden tetikler. */
export function replayAnimation(node, className) {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}
