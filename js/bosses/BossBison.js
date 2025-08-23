// bosses/BossBison.js
import { Boss } from './Boss.js';
import * as Constants from '../constants.js';
import * as Sound from '../soundManager.js';
import { globals } from '../globals.js'; // Needed for PIXI access

export class BossBison extends Boss {
    constructor(data) {
        // Prepare animation frames structure for the base Boss class
        const animFrames = {
            idle: data.anim.idle, // Expecting arrays of texture paths/objects
            attack: data.anim.attack
        };
        const explosionFrames = data.explosion; // Pass explosion frames

        super(data, animFrames, explosionFrames); // Call base Boss constructor

        // --- Bison Specific Setup ---
        this.unit.hitArea = new PIXI.Rectangle(
            -this.character.width / 2 + 10, -this.character.height / 2 + 20,
            this.character.width - 20, this.character.height - 30
        );
        if (this.dengerousBalloon) {
            this.dengerousBalloon.y = -this.character.height / 2 + 20; // Adjust based on anchor
        }
    }

    // Override loop for specific movement/timing if needed,
    // but patterns are in shootStart for Bison
    // loop(delta, stageScrollAmount) {
    //     super.loop(delta, stageScrollAmount); // Handle entry anim
    //     if (this.moveFlg || this.deadFlg) return;
    //     // Add custom loop logic if attack patterns weren't timeline based
    // }

    shootStart() {
        if (this.deadFlg || !this.shootOn) return;
        if (this.tlShoot) this.tlShoot.kill(); // Kill previous timeline

        const targetY = Constants.GAME_DIMENSIONS.HEIGHT / 4; // Standard boss Y
        const bottomY = Constants.GAME_DIMENSIONS.HEIGHT - this.unit.hitArea.height - this.unit.hitArea.y - 10; // Calc bottom Y dynamically

        this.tlShoot = new TimelineMax({
            delay: 0.5, // Delay before starting pattern
            onComplete: this.shootStart, // Loop the pattern
            onCompleteScope: this
        });

        const patternRoll = Math.random();

        if (patternRoll < 0.6) { // Psycho Crusher Downwards
            // Target player X or random X? Original targeted random-ish X
             const targetX = Math.random() * (Constants.GAME_DIMENSIONS.WIDTH - this.unit.hitArea.width) + this.unit.hitArea.x;
            // const targetX = gameState.playerRef ? gameState.playerRef.x : Constants.GAME_DIMENSIONS.CENTER_X; // Alternative: target player
            this.tlShoot
                .to(this, 0.3, { x: targetX })
                .addCallback(this.playStraightAttackAnim, "+=0", null, this)
                .to(this, 0.5, { y: targetY - 10 }) // Move up slightly?
                .addCallback(this.playStraightAttackVoice, "+=0", null, this)
                .to(this, 0.35, { y: bottomY }) // Dash down
                .to(this, 0.2, { y: targetY }) // Return up
                .addCallback(this.playIdleAnim, "+=0.05", null, this)
                .addCallback(() => {}, "+=0.5"); // Pause between attacks

        } else { // Head Stomp pattern (Left or Right start)
            const startX = (patternRoll < 0.8) ? 0 : Constants.GAME_DIMENSIONS.WIDTH - this.unit.hitArea.width + this.unit.hitArea.x*2; // Start left or right edge
            const endX = (startX === 0) ? Constants.GAME_DIMENSIONS.WIDTH - this.unit.hitArea.width + this.unit.hitArea.x*2 : 0;

            this.tlShoot
                .to(this, 0.4, { x: startX, y: targetY - 20 }) // Move to corner slightly up
                .to(this, 0.4, { x: endX, y: targetY }, "+=0.2") // Diagonal move 1
                .addCallback(this.playFaintVoice, "-=0.2", null, this) // Voice during move
                .to(this, 0.4, { x: startX, y: targetY + 30 }) // Diagonal move 2
                .to(this, 0.4, { x: endX, y: targetY + 60 }) // Diagonal move 3
                .addCallback(this.playFaintAttackAnimAndVoice, "+=0", null, this) // Switch anim for stomp
                .to(this, 0.3, { x: endX, y: bottomY }, "+=0.2") // Stomp down
                .to(this, 0.2, { y: targetY }) // Return up
                .addCallback(this.playIdleAnim, "+=0.05", null, this)
                .addCallback(() => {}, "+=1.0"); // Longer pause
        }
    }

    // --- Animation & Sound Helpers ---
    playIdleAnim() {
        this.playAnimation('idle', true);
    }

    playStraightAttackAnim() {
        this.playAnimation('attack', true); // Should attack loop? Original did.
    }

    playStraightAttackVoice() {
        Sound.play("boss_bison_voice_punch");
    }

    playFaintVoice() {
        Sound.play("boss_bison_voice_faint");
    }

    playFaintAttackAnimAndVoice() {
        this.playAnimation('attack', true); // Reuse attack anim for stomp
        Sound.play("boss_bison_voice_faint_punch");
    }

    // Override onDead to play specific KO sound
    onDead() {
        Sound.play("boss_bison_voice_ko");
        // Base class dead() handles visuals and event emitting
    }

    // Override castAdded/Removed if needed for specific timeline setup/cleanup
    castAdded() {
        super.castAdded(); // Call base class method first
        // Bison specific setup if any
        this.tlShoot = new TimelineMax(); // Initialize timeline here
    }

    castRemoved() {
        this.tlShoot?.kill(); // Ensure timeline is killed
        super.castRemoved();
    }
     // Override destroy if necessary
     // destroy(options) {
     //    this.tlShoot?.kill();
     //    super.destroy(options);
     // }
}