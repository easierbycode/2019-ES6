// bosses/BossFang.js
import { Boss } from './Boss.js';
import * as Constants from '../constants.js';
import * as Sound from '../soundManager.js';
import { gameState } from '../gameState.js';
import { globals } from '../globals.js';

export class BossFang extends Boss {
    constructor(data) {
        const animFrames = {
            idle: data.anim.idle,
            wait: data.anim.wait, // Waiting pose
            charge: data.anim.charge, // Charge for beam?
            shoot: data.anim.shoot // Beam firing anim
        };
        const explosionFrames = data.explosion;

        // Process bulletData textures
        if (data.bulletDataA?.texture && !(data.bulletDataA.texture[0] instanceof PIXI.Texture)) {
            data.bulletDataA.texture = data.bulletDataA.texture.map(f => PIXI.Texture.from(f));
            data.bulletDataA.name = "beam"; // Assign names for logic
            data.bulletDataA.cnt = 0;
        }
        if (data.bulletDataB?.texture && !(data.bulletDataB.texture[0] instanceof PIXI.Texture)) {
            data.bulletDataB.texture = data.bulletDataB.texture.map(f => PIXI.Texture.from(f));
            data.bulletDataB.name = "smoke";
        }
        if (data.bulletDataC?.texture && !(data.bulletDataC.texture[0] instanceof PIXI.Texture)) {
            data.bulletDataC.texture = data.bulletDataC.texture.map(f => PIXI.Texture.from(f));
            data.bulletDataC.name = "meka";
        }


        super(data, animFrames, explosionFrames);

        // --- Fang Specific Setup ---
        this.bulletDataA = data.bulletDataA; // Beam
        this.bulletDataB = data.bulletDataB; // Smoke Cloud
        this.bulletDataC = data.bulletDataC; // Meka Drones
        this.bulletData = this.bulletDataA; // Default

        // Fang has no shadow
        if (this.shadow) {
            this.unit.removeChild(this.shadow);
            this.shadow.destroy();
            this.shadow = null;
        }

        this.unit.hitArea = new PIXI.Rectangle(
            -this.character.width / 2 + 35, -this.character.height / 2 + 55,
            this.character.width - 70, this.character.height - 70
        );
        if (this.dengerousBalloon) {
             this.dengerousBalloon.position.set(-this.character.width / 2 + 70, -this.character.height / 2 + 40);
        }
         // Fang has slower entry speed?
         this.entrySpeed = 0.7 * 60; // Adjust base speed
         this.appearDuration = 7.0; // Slightly longer appear time maybe
    }

     // Override loop for slower entry
     loop(delta, stageScrollAmount) {
         if (this.deadFlg) return;
         this.bulletFrameCnt += delta * 60;

         if (this.moveFlg) {
             const targetY = 48; // Fang's target Y
             const speed = this.entrySpeed * delta;
             this.y += speed;
             if (this.y >= targetY) {
                 this.y = targetY;
                 this.moveFlg = false;
                 this.onEntryComplete();
                 if(this.shootOn) this.shootStart();
             }
         }
         // No shadow to update
     }


    shootStart() {
        if (this.deadFlg || !this.shootOn) return;
        if (this.tlShoot) this.tlShoot.kill();

        this.tlShoot = new TimelineMax({
            delay: 0.5,
            onComplete: this.shootStart,
            onCompleteScope: this
        });

        const patternRoll = Math.random();

        if (patternRoll < 0.3) { // Beam Attack
            this.bulletData = this.bulletDataA;
            this.bulletData.cnt = 0; // Reset beam counter for sequence
            this.tlShoot
                .addCallback(this.playChargeAnim, "+=0")
                .addCallback(this.playBeamShootAnimAndSound, "+=0.5") // Shoot beam 1 (105 deg)
                .addCallback(this.playBeamShootAnimAndSound, "+=0.5") // Shoot beam 2 (90 deg)
                .addCallback(this.playBeamShootAnimAndSound, "+=0.5") // Shoot beam 3 (75 deg)
                .addCallback(this.playIdleAnim, "+=0.3")
                .addCallback(() => {}, "+=1.0"); // Pause

        } else if (patternRoll < 0.7) { // Meka Drone Swarm
            this.bulletData = this.bulletDataC;
            this.tlShoot
                .addCallback(this.playMekaDeploySound, "+=0.0")
                .addCallback(this.shoot, "+=0.1") // Emit all drones at once
                .addCallback(this.playWaitAnim, "+=0.5") // Go into wait pose
                .addCallback(() => {}, "+=4.0"); // Long wait while drones attack

        } else { // Smoke Cloud Attack
            this.bulletData = this.bulletDataB;
            this.tlShoot
                .addCallback(this.playSmokeSound, "+=0")
                .addCallback(this.playWaitAnim, "+=1.0") // Wait pose
                .addCallback(this.shoot, "+=0.3") // Emit cloud 1
                .addCallback(this.shoot, "+=0.3") // Emit cloud 2
                // ... repeat multiple times ...
                .addCallback(this.shoot, "+=0.3") // Emit cloud N
                .addCallback(this.playIdleAnim, "+=1.0") // Back to idle after sequence ends
                .addCallback(() => {}, "+=5.0"); // Long pause after smoke clears
        }
    }

    // --- Animation & Sound Helpers ---
    playIdleAnim() {
        this.playAnimation('idle', true);
    }
     playWaitAnim() {
         this.playAnimation('wait', true);
     }
    playChargeAnim() {
        this.playAnimation('charge', true); // Or false if it's a one-shot charge anim
    }
    playBeamShootAnimAndSound() {
        this.playAnimation('shoot', false); // Beam anim likely not looped
        this.shoot(); // Emits TAMA_ADD, GameScene handles logic based on bulletData.name and cnt
        Sound.play("boss_fang_voice_beam0"); // Sound for each beam segment
    }
    playMekaDeploySound() {
        Sound.play("boss_fang_voice_beam1"); // Sound for drone deploy
    }
    playSmokeSound() {
        Sound.play("boss_fang_voice_tama"); // Sound for smoke cloud
    }


    // Override onDead
    onDead() {
        Sound.play("boss_fang_voice_ko");
    }

    castAdded() {
        super.castAdded(); // Handles base setup and entry flag
        this.tlShoot = new TimelineMax();
        this.y = -249; // Specific starting Y for Fang
    }

     castRemoved() {
         this.tlShoot?.kill();
         super.castRemoved();
     }
}
