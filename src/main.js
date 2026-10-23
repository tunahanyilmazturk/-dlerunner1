import './styles/main.css';
import { AudioDirector } from './audio/AudioDirector.js';
import { createContext } from './core/GameContext.js';
import { createGame } from './game/createGame.js';
import { configureRenderScale } from './game/renderScale.js';
import { UIManager } from './ui/UIManager.js';

// Canvas yazıları fontu kullanmadan önce yüklenmiş olmalı
function waitForFonts(timeout = 1500) {
  if (!document.fonts?.load) return Promise.resolve();
  return Promise.race([
    Promise.all([document.fonts.load('700 20px "Fredoka"'), document.fonts.load('700 20px "Cinzel"')]),
    new Promise((resolve) => setTimeout(resolve, timeout)),
  ]).catch(() => {});
}

async function bootstrap() {
  await waitForFonts();

  const ctx = createContext();
  // Görüntü kalitesi (Ayarlar → Grafik); tuval ve dokular bu ölçekte üretilir
  const scale = configureRenderScale(ctx.state.settings.graphics);
  document.documentElement.dataset.renderScale = scale;
  const audio = new AudioDirector(ctx);
  audio.mount();
  ctx.audio = audio;
  const ui = new UIManager(ctx);
  ui.mount();
  const game = createGame(ctx);
  ctx.start();

  if (import.meta.env.DEV) window.__idle = { ctx, game, ui, audio };
}

bootstrap();
