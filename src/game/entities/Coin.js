import { WORLD } from '../../config/balance.js';
import { clamp, randRange } from '../../utils/math.js';

// Düşen altınlar önce yere saçılır, sonra HUD'daki altın sayacına uçar.
// Altın, para sayaca ulaştığında hesaba eklenir.
export class CoinSpawner {
  /**
   * @param onCollect (amount) => void
   * @param getTarget () => {x, y} oyun koordinatında hedef
   */
  constructor(scene, onCollect, getTarget) {
    this.scene = scene;
    this.onCollect = onCollect;
    this.getTarget = getTarget;
  }

  spawn(x, y, totalGold) {
    const count = clamp(Math.ceil(Math.log10(totalGold + 1) * 2), 1, 6);
    const perCoin = totalGold / count;
    for (let i = 0; i < count; i++) this.spawnCoin(x, y, perCoin, i);
  }

  spawnCoin(x, y, amount, index) {
    const scene = this.scene;
    const coin = scene.add.image(x, y, 'coin').setDepth(25);
    const landX = x + randRange(-20, 60);
    const landY = WORLD.GROUND_Y - 8;

    scene.tweens.chain({
      targets: coin,
      tweens: [
        { y: y - randRange(30, 70), x: (x + landX) / 2, duration: 220, ease: 'Quad.out' },
        { y: landY, x: landX, duration: 320, ease: 'Bounce.out' },
        {
          // Hedef uçuş başladığı anda okunur (HUD yeri değişmiş olabilir)
          x: { getEnd: () => this.getTarget().x },
          y: { getEnd: () => this.getTarget().y },
          scale: 0.6,
          duration: 480,
          delay: 120 + index * 50,
          ease: 'Cubic.in',
        },
      ],
      onComplete: () => {
        coin.destroy();
        this.onCollect(amount);
      },
    });
  }
}
