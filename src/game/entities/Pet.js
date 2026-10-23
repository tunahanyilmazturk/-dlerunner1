import Phaser from 'phaser';
import { WORLD } from '../../config/balance.js';
import { PET_SPRITES } from '../graphics/petTextures.js';

const FOLLOW_X = WORLD.PLAYER_X - 48;
const FLY_HEIGHT = 64;

// Karakteri arkadan takip eden yoldaş. Davranış zamanlaması GameScene'de;
// burada sadece görünüm, süzülme ve saldırı/iyileştirme animasyonları var.
export class Pet extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, FOLLOW_X, WORLD.GROUND_Y);
    this.shadow = scene.add.image(0, 2, 'shadow').setScale(0.5, 0.8);
    this.glow = scene.add.image(0, -14, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(0.4).setAlpha(0.5);
    this.sprite = scene.add.sprite(0, 0, 'pet_wolfPup_0').setOrigin(0.5, 1);
    this.add([this.shadow, this.glow, this.sprite]);
    this.petId = null;
    this.phase = Math.random() * Math.PI * 2;
    this.setDepth(10).setVisible(false);
    scene.add.existing(this);
  }

  /** @param pet data/pets.js kaydı ya da null (yoldaş yok) */
  setPet(pet) {
    if (!pet) {
      this.petId = null;
      this.setVisible(false);
      return;
    }
    this.setVisible(true);
    if (pet.id === this.petId) return;
    this.petId = pet.id;
    this.flying = PET_SPRITES[pet.id].flying;
    this.sprite.play(`pet_${pet.id}_move`);
    this.glow.setTint(pet.color);
    this.sprite.y = this.flying ? -FLY_HEIGHT + 20 : 0;
    this.glow.y = this.sprite.y - this.sprite.displayHeight / 2;
    this.shadow.setScale(this.flying ? 0.35 : 0.5, this.flying ? 0.6 : 0.8).setAlpha(this.flying ? 0.5 : 1);
    // Belirme efekti
    this.sprite.setScale(0.2);
    this.scene.tweens.add({ targets: this.sprite, scale: 1, duration: 300, ease: 'Back.out' });
  }

  get mouth() {
    return { x: this.x + this.sprite.displayWidth / 2, y: this.y + this.sprite.y - this.sprite.displayHeight * 0.6 };
  }

  setRunning(running) {
    if (running) this.sprite.anims.resume();
    else if (!this.flying) this.sprite.anims.pause();
  }

  update(time) {
    if (!this.visible || this.busy) return;
    const bob = this.flying ? Math.sin(time * 0.004 + this.phase) * 6 : 0;
    this.sprite.y = (this.flying ? -FLY_HEIGHT + 20 : 0) + bob;
    this.glow.y = this.sprite.y - this.sprite.displayHeight / 2;
  }

  /** Isırma: hedefe atılıp geri döner. onHit vuruş anında çağrılır. */
  lunge(targetX, onHit) {
    this.busy = true;
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { x: Math.min(targetX - 30, WORLD.PLAYER_X + 70), duration: 140, ease: 'Quad.in', onComplete: onHit },
        { x: FOLLOW_X, duration: 260, ease: 'Quad.out' },
      ],
      onComplete: () => (this.busy = false),
    });
  }

  /** Nefes/büyü: kısa öne eğilme. */
  pulse() {
    this.scene.tweens.add({ targets: this.sprite, scaleX: 1.15, scaleY: 0.9, duration: 90, yoyo: true, ease: 'Quad.out' });
  }
}
