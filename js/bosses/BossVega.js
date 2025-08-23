// bosses/BossVega.js
import { Boss } from './Boss.js';
import * as Constants from '../constants.js';
import * as Sound from '../soundManager.js';
import { gameState } from '../gameState.js';
import { globals } from '../globals.js';

export class BossVega extends Boss {
    // Define event specific to Vega for Goki replacement
    static CUSTOM_EVENT_GOKI = "customEventGoki";

    constructor(data) {
        const animFrames = {
            idle: data.anim.idle,
            attack: data.anim.attack, // Psycho Crusher
            shoot: data.anim.shoot // Psycho Field / Teleport Shoot?
        };
        const explosionFrames = data.explosion;

         // Ensure TamaData textures are processed
         if (data.tamaDataA?.texture && !(data.tamaDataA.texture[0] instanceof PIXI.Texture)) {
             data.tamaDataA.texture = data.tamaDataA.texture.map(f => PIXI.Texture.from(f));
         }
         if (data.tamaDataB?.texture && !(data.tamaDataB.texture[0] instanceof PIXI.Texture)) {
             data.tamaDataB.texture = data.tamaDataB.texture.map(f => PIXI.Texture.from(f));
             data.tamaDataB.name = "psychoField"; // Assign name if needed by bullet logic
         }


        super(data, animFrames, explosionFrames);

        // --- Vega Specific Setup ---
        this.tamaDataA = data.tamaDataA; // Psycho Ball?
        this.tamaDataB = data.tamaDataB; // Psycho Field
        this.tamaData = this.tamaDataA; // Default

        this.unit.hitArea = new PIXI.Rectangle(
             -this.character.width / 2 + 20, -this.character.height / 2 + 13,
             this.character.width - 40, this.character.height - 20
        );
        if (this.dengerousBalloon) {
             this.dengerousBalloon.y = -this.character.height / 2 + 15;
        }

        // Blur Filter for Teleport
        this.vegaBlur = new PIXI.filters.BlurFilter();
        this.vegaBlur.blur = 0;
        this.vegaBlur.enabled = false; // Enable only when needed
        this.filters = [this.vegaBlur]; // Add to filters list

        this.gokiFlg = data.gokiFlg || false; // Flag for special pre-Goki version
    }


     // Override loop to potentially trigger Goki event
     loop(delta, stageScrollAmount) {
        super.loop(delta, stageScrollAmount); // Handle entry anim

        if (this.moveFlg || this.deadFlg) return; // Don't process patterns during entry/death

        // Trigger Goki event check (example: based on interval and flag)
        if (this.shootOn && this.bulletFrameCnt >= this.interval) {
            this.bulletFrameCnt = 0; // Reset counter
            this.shootOn = false; // Prevent re-trigger immediately

            if (this.gokiFlg) {
                 this.emit(BossVega.CUSTOM_EVENT_GOKI); // Signal GameScene to replace
                 // Don't start normal shoot pattern if gokiFlg is true
                 Utils.dlog("Vega emitting GOKI event");
            } else {
                 // Normal attack pattern start
                 Sound.play("boss_vega_voice_add");
                 TweenMax.delayedCall(1.0, this.shootStart.bind(this)); // Delay before pattern starts
            }
        }
     }


    shootStart() {
        if (this.deadFlg || this.gokiFlg || !this.shootOn) return; // Don't run if dead, Goki replacement pending, or stopped
        if (this.tlShoot) this.tlShoot.kill();

        const playerUnit = gameState.playerRef;
        const targetY = Constants.GAME_DIMENSIONS.HEIGHT / 4;
        const bottomY = Constants.GAME_DIMENSIONS.HEIGHT - 15; // Near bottom

        let targetX = Constants.GAME_DIMENSIONS.CENTER_X;
        if (playerUnit) targetX = playerUnit.x;
        const halfHitboxWidth = this.unit.hitArea.width / 2;
        const minX = -this.character.width / 2 + halfHitboxWidth + this.unit.hitArea.x;
        const maxX = Constants.GAME_DIMENSIONS.WIDTH - this.character.width / 2 - halfHitboxWidth + this.unit.hitArea.x;
        targetX = Math.max(minX, Math.min(maxX, targetX));

        this.tlShoot = new TimelineMax({
            // No delay here, delay was handled in loop check
            onComplete: () => { this.shootOn = true; }, // Allow triggering next pattern after completion
            onCompleteScope: this
        });

        const patternRoll = Math.random();

        if (patternRoll < 0.1) { // Teleport sequence
             this.tlShoot
                 .addCallback(this.teleportOut, "+=0")
                 .addCallback(() => { this.x = minX + 20; }, "+=0.1") // Move instantly while blurred
                 .addCallback(this.teleportIn, "+=0")
                 .addCallback(this.teleportOut, "+=0.3")
                 .addCallback(() => { this.x = maxX - 20; }, "+=0.1")
                 .addCallback(this.teleportIn, "+=0")
                 .addCallback(this.teleportOut, "+=0.3")
                 .addCallback(() => { this.x = Math.random() * (maxX - minX) + minX; }, "+=0.1")
                 .addCallback(this.teleportIn, "+=0")
                 .addCallback(() => {}, "+=0.5"); // Pause

        } else if (patternRoll < 0.4) { // Psycho Ball Rain (Teleport + Shoot)
            this.tamaData = this.tamaDataA;
            this.tlShoot
                .addCallback(this.teleportOut, "+=0")
                .addCallback(() => { this.x = minX + 10; this.playPsychoShootSound(); this.playShootAnim(); this.shoot(); }, "+=0.1")
                .addCallback(this.teleportIn, "+=0")
                .addCallback(this.teleportOut, "+=0.4")
                .addCallback(() => { this.x = maxX - 10; this.playShootAnim(); this.shoot(); }, "+=0.1") // No sound on rapid fire?
                .addCallback(this.teleportIn, "+=0")
                 // ... repeat teleporting and shooting across screen ...
                .addCallback(this.teleportOut, "+=0.4")
                .addCallback(() => { this.x = Constants.GAME_DIMENSIONS.CENTER_X; this.playPsychoShootSound(); this.playShootAnim(); this.shoot(); }, "+=0.1")
                .addCallback(this.teleportIn, "+=0")
                .addCallback(this.playIdleAnim, "+=0.5") // Back to idle after sequence
                .addCallback(() => {}, "+=3.0"); // Longer pause

        } else if (patternRoll < 0.7) { // Psycho Field Attack
            this.tamaData = this.tamaDataB; // Set bullet type to Field
            this.tlShoot
                .to(this, 0.3, { x: Constants.GAME_DIMENSIONS.CENTER_X, y: targetY + 10 })
                .addCallback(this.playPsychoFieldAnimAndSound, "+=0.5")
                .addCallback(this.shoot, "+=0.3") // Emit field bullet 1
                .addCallback(this.shoot, "+=1.0") // Emit field bullet 2
                .addCallback(this.shoot, "+=1.0") // Emit field bullet 3
                // ... repeat ...
                .addCallback(this.playIdleAnim, "+=1.0") // Back to idle
                .addCallback(() => {}, "+=2.0"); // Pause

        } else { // Psycho Crusher
            this.tlShoot
                .addCallback(this.teleportOut, "+=0")
                .addCallback(() => { this.x = targetX; }, "+=0.1") // Move above player
                .addCallback(this.teleportIn, "+=0")
                .to(this, 0.2, { y: targetY - 20 }) // Small move up
                .addCallback(this.playAttackAnimAndSound, "+=0") // Start crusher anim/sound
                .to(this, 0.9, { y: bottomY }) // Fly down
                .addCallback(this.playIdleAnim, "+=0") // Back to idle near bottom?
                .addCallback(() => { // Warp back to top
                     this.x = Constants.GAME_DIMENSIONS.CENTER_X;
                     this.y = -this.character.height;
                     this.teleportOut(); // Start blur out
                 }, "+=0.1")
                 .addCallback(this.teleportIn, "+=0.1") // Arrive blurred
                 .to(this, 1.0, { y: targetY }) // Move down into position
                .addCallback(() => {}, "+=0.5"); // Pause
        }
    }

    // --- Animation & Sound Helpers ---
     teleportOut() {
         Sound.play("boss_vega_voice_warp");
         this.vegaBlur.enabled = true;
         TweenMax.to(this.vegaBlur, 0.1, { blur: 15 }); // Blur quickly
     }
     teleportIn() {
         // Assumes position is already set while blurred
         TweenMax.to(this.vegaBlur, 0.1, { blur: 0, onComplete:() => { this.vegaBlur.enabled = false; }}); // Unblur quickly
     }

    playIdleAnim() {
        this.playAnimation('idle', true);
    }

     playShootAnim() { // Animation for Psycho Ball / Field Emission
         this.playAnimation('shoot', true); // Does it loop?
     }
     playPsychoShootSound() {
         Sound.play("boss_vega_voice_tama");
     }

    playPsychoFieldAnimAndSound() {
        this.playAnimation('shoot', true); // Reuse shoot animation?
        Sound.play("boss_vega_voice_shoot"); // Specific sound for field?
    }

    playAttackAnimAndSound() { // Psycho Crusher
        this.playAnimation('attack', true); // Crusher loops visually
        Sound.play("boss_vega_voice_crusher");
    }

    // Override onDead
    onDead() {
        Sound.play("boss_vega_voice_ko");
    }

     castAdded() {
         super.castAdded();
         this.tlShoot = new TimelineMax();
         this.vegaBlur.enabled = false; // Ensure filter is off initially
         this.vegaBlur.blur = 0;
     }

     castRemoved() {
         this.tlShoot?.kill();
         super.castRemoved();
     }
     // Override destroy
     destroy(options) {
        this.vegaBlur = null; // Remove filter reference
        this.filters = null;
        super.destroy(options);
     }
}