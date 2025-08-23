// bosses/BossSagat.js
import { Boss } from './Boss.js';
import * as Constants from '../constants.js';
import * as Sound from '../soundManager.js';
import { gameState } from '../gameState.js';
import { globals } from '../globals.js';

export class BossSagat extends Boss {
    constructor(data) {
        const animFrames = {
            idle: data.anim.idle,
            charge: data.anim.charge,
            shoot: data.anim.shoot, // Tiger Shot anim
            attack: data.anim.attack // Tiger Knee anim
        };
        const explosionFrames = data.explosion;

        // Ensure TamaData textures are processed
        if (data.tamaDataA?.texture && !(data.tamaDataA.texture[0] instanceof PIXI.Texture)) {
            data.tamaDataA.texture = data.tamaDataA.texture.map(f => PIXI.Texture.from(f));
        }
        if (data.tamaDataB?.texture && !(data.tamaDataB.texture[0] instanceof PIXI.Texture)) {
            data.tamaDataB.texture = data.tamaDataB.texture.map(f => PIXI.Texture.from(f));
        }


        super(data, animFrames, explosionFrames);

        // --- Sagat Specific Setup ---
        this.tamaDataA = data.tamaDataA; // High Tiger Shot
        this.tamaDataB = data.tamaDataB; // Low Tiger Shot (Ground Tiger Shot)
        this.tamaData = this.tamaDataA; // Default to high shot

        this.unit.hitArea = new PIXI.Rectangle(
            -this.character.width / 2 + 20, -this.character.height / 2 + 20,
            this.character.width - 40, this.character.height - 20 // Slightly different from Barlog
        );
        // Adjust danger balloon if needed
        if (this.dengerousBalloon) {
             this.dengerousBalloon.position.set(-this.character.width / 2 + 20, -this.character.height / 2 + 20);
        }
    }

    shootStart() {
        if (this.deadFlg || !this.shootOn) return;
        if (this.tlShoot) this.tlShoot.kill();

        const playerUnit = gameState.playerRef;
        const targetY = Constants.GAME_DIMENSIONS.HEIGHT / 4;
        const bottomY = Constants.GAME_DIMENSIONS.HEIGHT - this.unit.hitArea.height - this.unit.hitArea.y + 10; // Adjusted bottom Y

        // Calculate target X
        let targetX = Constants.GAME_DIMENSIONS.CENTER_X;
        if (playerUnit) targetX = playerUnit.x;
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

        if (patternRoll < 0.3) { // High Tiger Shots (Sweep)
            this.tamaData = this.tamaDataA;
            this.tlShoot
                .to(this, 0.25, { x: minX + 20 }) // Move near left
                .addCallback(this.playChargeAnim, "+=0", null, this)
                .addCallback(this.playHighShootAnimAndSound, "+=0.25", null, this)
                .to(this, 0.25, { x: minX + 50 }) // Move slightly right
                .addCallback(this.playChargeAnim, "+=0", null, this)
                .addCallback(this.playHighShootAnimAndSound, "+=0.25", null, this)
                // ... repeat across the screen ...
                .to(this, 0.25, { x: maxX - 20 }) // Move near right
                .addCallback(this.playChargeAnim, "+=0", null, this)
                .addCallback(this.playHighShootAnimAndSound, "+=0.25", null, this)
                .addCallback(this.playIdleAnim, "+=0.3", null, this);

        } else if (patternRoll < 0.6) { // High Tiger Shots (Rapid Fire at Player)
            this.tamaData = this.tamaDataA;
            this.tlShoot
                .to(this, 0.25, { x: targetX }) // Move above player
                .addCallback(this.playChargeAnim, "+=0", null, this)
                .addCallback(this.playHighShootAnimAndSound, "+=0.2", null, this) // Shoot 1
                .addCallback(this.playChargeAnim, "+=0.2", null, this)
                .addCallback(this.playHighShootAnimAndSound, "+=0.2", null, this) // Shoot 2
                // ... repeat multiple times ...
                .addCallback(this.playChargeAnim, "+=0.2", null, this)
                .addCallback(this.playHighShootAnimAndSound, "+=0.2", null, this) // Shoot N
                .addCallback(this.playIdleAnim, "+=0.3", null, this);

        } else if (patternRoll < 0.8) { // Ground Tiger Shot (Low)
            this.tamaData = this.tamaDataB;
            this.tlShoot
                .to(this, 0.25, { x: targetX }) // Move above player
                .addCallback(this.playChargeAnim, "+=0", null, this)
                .addCallback(this.playLowShootAnimAndSound, "+=1.3", null, this) // Longer charge for low shot
                .addCallback(this.playIdleAnim, "+=0.3", null, this);

        } else { // Tiger Knee
             this.tlShoot
                 .to(this, 0.4, { x: targetX, y: targetY - 20 }) // Move near player, slightly up
                 .addCallback(this.playTigerKneeAnim, "+=0.0", null, this)
                 .to(this, 0.3, { y: bottomY }, "+=0.5") // Fly down
                 .addCallback(this.playTigerKneeVoice, "-=0.2", null, this) // Voice during dive
                 .to(this, 0.2, { y: targetY }, "+=0.05") // Return up
                 .addCallback(this.playIdleAnim, "+=0.0", null, this);
        }
        // Common pause
         this.tlShoot.addCallback(() => {}, "+=1.0");
    }

    // --- Animation & Sound Helpers ---
    playIdleAnim() {
        this.playAnimation('idle', true);
    }

    playChargeAnim() {
        this.playAnimation('charge', true); // Does charge loop?
    }

    playHighShootAnimAndSound() {
        this.playAnimation('shoot', false); // Tiger shot is usually not looped
        this.shoot();
        Sound.play("boss_sagat_voice_tama0");
    }

    playLowShootAnimAndSound() {
        this.playAnimation('shoot', false); // Reuse same shoot animation?
        this.shoot();
        Sound.play("boss_sagat_voice_tama1");
    }

    playTigerKneeAnim() {
        this.playAnimation('attack', true); // Tiger Knee might loop visually
    }

    playTigerKneeVoice() {
        Sound.play("boss_sagat_voice_kick");
    }

    // Override onDead
    onDead() {
        Sound.play("boss_sagat_voice_ko");
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