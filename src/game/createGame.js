import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/balance.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { getRenderScale } from './renderScale.js';

export function createGame(ctx) {
  // Tuval render ölçeği kadar büyük; GameScene kamera zoom'u ile dünyayı 960x540'ta tutar
  const scale = getRenderScale();
  const game = new Phaser.Game({
    // Yüksek çözünürlüklü dokular WebGL kare/UV ayarına dayanır (draw.js) → canvas renderer kullanılmaz
    type: Phaser.WEBGL,
    parent: 'game-root',
    width: Math.round(GAME_WIDTH * scale),
    height: Math.round(GAME_HEIGHT * scale),
    backgroundColor: '#0b0806',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    // Ses kendi AudioDirector'ümüzde; Phaser ikinci bir AudioContext açmasın
    audio: { noAudio: true },
    scene: [BootScene, GameScene],
    callbacks: {
      // Sahneler ctx'e this.registry.get('ctx') ile ulaşır
      preBoot: (game) => game.registry.set('ctx', ctx),
    },
  });

  // Kapsayıcı boyutu değişince (ilk yerleşim, panel/mobil düzen) canvas'ı yeniden ölçeklendir
  const parent = document.getElementById('game-root');
  const observer = new ResizeObserver(() => game.scale?.refresh());
  game.events.once(Phaser.Core.Events.READY, () => {
    observer.observe(parent);
    game.scale.refresh();
  });
  game.events.once(Phaser.Core.Events.DESTROY, () => observer.disconnect());

  return game;
}
