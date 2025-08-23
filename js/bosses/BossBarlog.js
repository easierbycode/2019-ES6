// bosses/BossBarlog.js
import { Boss } from './Boss.js';
import * as Constants from '../constants.js';
import * as Sound from '../soundManager.js';
import { gameState } from '../gameState.js';
import { globals } from '../globals.js';

export class BossBarlog extends Boss {
    constructor(data) {
        const animFrames = {
            idle: data.anim.idle,
            charge: data.anim.charge,
            attack: data.anim.attack,
            shoot: data.anim.shoot // Rolling Crystal Flash
        };
        const explosionFrames = data.explosion;
        super(data, animFrames, explosionFrames);

        // --- Barlog Specific Setup ---
        this.unit.hitArea = new PIXI.Rectangle(
            -this.character.width / 2 + 30, -this.character.height / 2 + 20,
            this.character.width - 60, this.character.height - 30
        );
        if (this.dengerousBalloon) {
            this.dengerousBalloon.x = -this.character.width / 2 + 30; // Adjust X based on anchor
            this.dengerousBalloon.y = -this.character.height / 2 + 20; // Adjust Y based on anchor
        }
    }

    shootStart() {
        if (this.deadFlg || !this.shootOn) return;
        if (this.tlShoot) this.tlShoot.kill();

        const playerUnit = gameState.playerRef; // Get reference to player
        const targetY = Constants.GAME_DIMENSIONS.HEIGHT / 4;
        const bottomY = Constants.GAME_DIMENSIONS.HEIGHT - this.unit.hitArea.height - this.unit.hitArea.y - 10;

        // Calculate target X based on player, clamped to screen edges
        let targetX = Constants.GAME_DIMENSIONS.CENTER_X; // Default if no player
        if (playerUnit) {
             targetX = playerUnit.x; // Target player's current X
        }
        const halfHitboxWidth = this.unit.hitArea.width / 2;
        const minX = -this.character.width / 2 + halfHitboxWidth + this.unit.hitArea.x;
        const maxX = Constants.GAME_DIMENSIONS.WIDTH - this.character.width / 2 - halfHitboxWidth + this.unit.hitArea.x;
        targetX = Math.max(minX, Math.min(maxX, targetX));


        this.tlShoot = new TimelineMax({
            delay: 0.5,
            onComplete: this.shootStart,
            onCompleteScope: this
        });

        const patternRoll = Math.random();

        if (patternRoll < 0.3) { // Random Move
            const randomX = Math.random() * (Constants.GAME_DIMENSIONS.WIDTH - this.unit.width) + this.unit.width / 2; // Centered X
            const randomY = Math.random() * (Constants.GAME_DIMENSIONS.HEIGHT - 400) + 60; // Random Y in upper area
            this.tlShoot
                .addCallback(this.playIdleAnim, "+=0.0", null, this)
                .to(this, 0.6, { x: randomX, y: randomY })
                .addCallback(this.stopIdleAnim, "+=0.1", null, this); // Stop anim after move

        } else if (patternRoll < 0.8) { // Rolling Crystal Flash (Shoot)
            this.tlShoot
                .addCallback(this.playIdleAnim, "+=0.0", null, this)
                .to(this, 0.3, { x: targetX }) // Move above player
                .addCallback(this.playShootAnimAndSound, "+=0.4", null, this) // Play shoot anim and sound
                .addCallback(this.stopIdleAnim, "+=0.5", null, this); // Stop animation after a bit

        } else { // Barcelona Attack (Flying Claw Dive)
            this.tlShoot
                .addCallback(this.playIdleAnim, "+=0.0", null, this)
                .to(this, 0.5, { x: targetX }) // Move above player
                .addCallback(this.playChargeAnim, "+=0.0", null, this) // Start charge animation
                .addCallback(this.playAttackAnimAndSound, "+=0.7", null, this) // Switch to attack anim+sound
                .to(this, 0.3, { y: targetY - 70 }, "+=0.0") // Fly up slightly
                .to(this, 0.6, { y: bottomY }, "+=0.1") // Dive down
                .to(this, 0.2, { y: targetY }, "+=0.0") // Return up quickly
                .addCallback(this.stopIdleAnim, "+=0.0", null, this); // Stop animation
        }
         // Common pause at the end
         this.tlShoot.addCallback(() => {}, "+=1.0");
    }

    // --- Animation & Sound Helpers ---
    playIdleAnim() {
        this.playAnimation('idle', true);
    }
     stopIdleAnim() { // Stop looping idle anim
         this.playAnimation('idle', false);
         this.character.stop();
         if(this.shadow) this.shadow.stop();
     }

    playChargeAnim() {
        this.playAnimation('charge', true);
    }

    playAttackAnimAndSound() {
        this.playAnimation('attack', true); // Should attack loop?
        Sound.play("boss_barlog_voice_barcelona");
    }

    playShootAnimAndSound() {
        this.playAnimation('shoot', true); // Should shoot loop?
        this.shoot(); // Emit bullet add event
        Sound.play("boss_barlog_voice_tama");
    }

    // Override onDead
    onDead() {
        Sound.play("boss_barlog_voice_ko");
    }

    castAdded() {
        super.castAdded();
        this.tlShoot = new TimelineMax();
    }

     castRemoved() {
         this.tlShoot?.kill();
         super.castRemoved();
     }
}