// bosses/Boss.js
import { BaseUnit } from '../BaseUnit.js'; // Adjust path as needed
import * as Constants from '../constants.js';
import { gameState } from '../gameState.js';
import { globals } from '../globals.js';
import * as Sound from '../soundManager.js';

export class Boss extends BaseUnit {
    // Define static properties if needed for events specific ONLY to bosses
    // static CUSTOM_EVENT_BOSS_SPECIFIC = "customEventBossSpecific";

    constructor(data, animFrames, explosionFrames) {
        // Ensure idleFrames exist and are PIXI.Textures
        const idleFramesProcessed = animFrames?.idle?.map(f => f instanceof PIXI.Texture ? f : PIXI.Texture.from(f));
        if (!idleFramesProcessed || idleFramesProcessed.length === 0) {
            console.error("Boss idle animation frames are missing!");
            // Fallback: create a placeholder if possible
        }
        const explosionFramesProcessed = explosionFrames?.map(f => f instanceof PIXI.Texture ? f : PIXI.Texture.from(f));

        super(idleFramesProcessed || [], explosionFramesProcessed); // Pass processed frames

        this.bossName = data.name; // Use different property to avoid collision with PIXI's name
        this.unit.name = "boss"; // Generic identifier for collision logic etc.
        this.interval = data.interval; // Attack interval
        this.score = data.score;
        this.maxHp = data.hp; // Store max HP if needed
        this.hp = data.hp;
        this.cagage = data.cagage;
        this.animList = {}; // Store all animations (processed textures)
        this.tamaData = data.tamaData; // Data for bullets

        // Pre-process all animation frames passed in animFrames object
        for (const key in animFrames) {
            if (Array.isArray(animFrames[key])) {
                this.animList[key] = animFrames[key].map(f => f instanceof PIXI.Texture ? f : PIXI.Texture.from(f));
            }
        }
        // Pre-process tamaData textures if necessary (should ideally be done in loader)
        if (this.tamaData?.texture && !(this.tamaData.texture[0] instanceof PIXI.Texture)) {
             this.tamaData.texture = this.tamaData.texture.map(frame => PIXI.Texture.from(frame));
        }
        // Add explosion data to tamaData if needed by Bullet class
        if(this.tamaData && explosionFramesProcessed) {
            this.tamaData.explosion = explosionFramesProcessed;
        }


        this.dengerousBalloon = null; // Create if textures exist
        const dangerFrames = [];
        const uiTextures = PIXI.loader?.resources?.game_ui?.textures; // Access directly from loader
        if (uiTextures) {
            for (let i = 0; i < 3; i++) {
                const tex = uiTextures[`boss_dengerous${i}.gif`];
                 if (tex) dangerFrames.push(tex);
            }
        } else {
             console.error("Boss: Cannot create danger balloon, game_ui textures not loaded!");
        }

        if (dangerFrames.length > 0) {
            this.dengerousBalloon = new PIXI.extras.AnimatedSprite(dangerFrames);
            this.dengerousBalloon.animationSpeed = 0.2;
            this.dengerousBalloon.anchor.set(0.5, 1.0); // Anchor bottom-center
            this.dengerousBalloon.scale.set(0);
            this.dengerousBalloon.visible = false;
            this.unit.addChild(this.dengerousBalloon); // Add to unit container for positioning relative to character
        }

        this.shadowReverse = data.shadowReverse !== undefined ? data.shadowReverse : true;
        this.shadowOffsetY = data.shadowOffsetY || 0;

        this.shootOn = true; // Flag to allow shooting patterns
        this.bulletFrameCnt = 0;
        this.moveFlg = false; // Controls initial entry animation
        this.deadFlg = false;
        this.dengerousFlg = false; // Controls "Danger" balloon state
        this.explotionCnt = 0; // Counter for death explosions

        // Default Boss hit area (can be overridden by subclasses)
         // Adjust based on anchor (assuming 0.5)
        this.unit.hitArea = new PIXI.Rectangle(
            -this.character.width / 2 + 5, -this.character.height / 2 + 5,
            this.character.width - 10, this.character.height - 10
        );


        this.tlShoot = null; // Timeline for attack patterns
        this.appearDuration = data.appearDuration || 6.0; // Time before timer starts (can be overridden)

        this.updateShadowPosition();
    }

    // --- Core Logic ---
    loop(delta, stageScrollAmount) {
        if (this.deadFlg) return;
        this.bulletFrameCnt += delta * 60; // Update based on delta

        // Entry Animation
        if (this.moveFlg) {
             const targetY = Constants.GAME_DIMENSIONS.HEIGHT / 4; // Default target Y
             const entrySpeed = 1 * delta * 60; // Adjust speed as needed
             this.y += entrySpeed;
             if (this.y >= targetY) {
                 this.y = targetY;
                 this.moveFlg = false;
                 this.onEntryComplete(); // Hook for subclasses
                 if(this.shootOn) this.shootStart(); // Start attack patterns only if shootOn is true
             }
        }

        this.updateShadowPosition(); // Keep shadow updated
    }

    // To be overridden: start attack patterns
    shootStart() {
        console.warn(`shootStart() not implemented for boss: ${this.bossName}`);
    }

     // Hook for when entry animation finishes
     onEntryComplete() {}

     playAnimation(animName, loop = true) {
         if (this.animList[animName]) {
            // Check if textures actually changed to avoid unnecessary resets
            if (this.character.textures !== this.animList[animName]) {
                this.character.textures = this.animList[animName];
                 if(this.shadow) this.shadow.textures = this.animList[animName]; // Shadow uses same anim
            }
             this.character.loop = loop;
             if(this.shadow) this.shadow.loop = loop;

             // Only restart if not already playing or if textures changed
             if(!this.character.playing || this.character.textures !== this.animList[animName]) {
                 this.character.gotoAndPlay(0);
                 if(this.shadow) this.shadow.gotoAndPlay(0);
             }
         } else {
              console.warn(`Animation not found: ${animName} for boss ${this.bossName}`);
              // Fallback to idle?
              if (animName !== 'idle' && this.animList['idle']) {
                  this.playAnimation('idle', true);
              }
         }
     }

    // --- State & Events ---
    onTheWorld(freeze) {
        if (freeze) {
            this.tlShoot?.pause();
            this.character?.stop();
            this.shadow?.stop();
            if(this.dengerousBalloon) this.dengerousBalloon.stop();
        } else {
            // Resume only if alive and not frozen by other means
            if (this.hp > 0 && !this.deadFlg) {
                 this.tlShoot?.resume();
                 this.character?.play();
                 this.shadow?.play();
                  if(this.dengerousBalloon && this.dengerousBalloon.visible) this.dengerousBalloon.play();
            }
        }
    }

    onDamage(amount) {
        if (this.deadFlg) return;

        this.hp -= amount;

        if (this.hp <= 0) {
            this.hp = 0; // Clamp HP
            this.dead(); // Call dead method
        } else {
            // Damage Flash
            TweenMax.killTweensOf(this.character, { tint: true }); // Kill previous tint tween
            this.character.tint = 0xFF8080; // Lighter red tint
            TweenMax.to(this.character, 0.1, {
                 tint: 0xFFFFFF, // Back to white
                 delay: 0.2
            });

            // Show Danger Balloon if HP is low enough for CA KO AND CA is ready
            // Note: We might not know if player CA is ready here. Assume low HP is the trigger.
            if (this.hp <= gameState.caDamage && !this.dengerousFlg && this.dengerousBalloon) {
                this.dengerousFlg = true;
                this.dengerousBalloon.visible = true;
                this.dengerousBalloon.scale.set(0); // Reset scale before animation
                this.dengerousBalloon.gotoAndPlay(0);
                TweenMax.to(this.dengerousBalloon.scale, 1, { x: 1, y: 1, ease: Elastic.easeOut });
            }
        }
    }

    dead() {
        if (this.deadFlg) return;
        this.deadFlg = true;
        this.shootOn = false; // Stop trying to start new attack patterns
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD, this); // Notify manager

        this.character?.stop();
        this.shadow?.stop();
        this.tlShoot?.kill(); // Stop attack patterns
        if (this.dengerousBalloon) this.dengerousBalloon.visible = false; // Hide danger balloon

        Sound.stop('se_damage'); // Stop any ongoing damage sound

        this.explotionCnt = 0;
        const numExplosions = 5;

        // Trigger multiple explosions using the base class explosion animation
        for (let i = 0; i < numExplosions; i++) {
            TweenMax.delayedCall(i * 0.25, this.spawnDeathExplosion.bind(this, i === numExplosions - 1));
        }

        // Screen Shake Effect (apply to the boss container itself)
         const startX = this.x;
         const startY = this.y;
         const shakeTl = new TimelineMax();
         for(let i=0; i<2; i++) { // Repeat shake sequence
            shakeTl.to(this, 0.08, { x: startX + 4, y: startY - 2 })
                   .to(this, 0.07, { x: startX - 3, y: startY + 1 })
                   .to(this, 0.05, { x: startX + 2, y: startY - 1 })
                   .to(this, 0.05, { x: startX - 2, y: startY + 1 })
                   .to(this, 0.04, { x: startX + 1, y: startY + 1 })
                   .to(this, 0.04, { x: startX, y: startY }); // Return center briefly
        }


        // Fade out the main unit container (character + shadow) after shaking/explosions start
        TweenMax.to(this.unit, 1.0, { delay: 0.5, alpha: 0 });

        this.onDead(); // Hook for subclasses (e.g., play specific KO voice)
    }

     spawnDeathExplosion(isLast) {
         // Use the explosion sprite created in BaseUnit constructor
         if (!this.explosion?.textures) return;

         // Clone the explosion sprite for multiple instances
         const explosionInstance = new PIXI.extras.AnimatedSprite(this.explosion.textures);
         explosionInstance.scale.copyFrom(this.explosion.scale); // Use pre-calculated scale
         explosionInstance.animationSpeed = this.explosion.animationSpeed;
         explosionInstance.loop = false;
         explosionInstance.anchor.set(0.5);
         // Position relative to the boss's unit container origin (center because of anchor 0.5)
         explosionInstance.x = (Math.random() - 0.5) * this.unit.hitArea.width;
         explosionInstance.y = (Math.random() - 0.5) * this.unit.hitArea.height;

         explosionInstance.onComplete = () => {
            this.explosionComplete(explosionInstance, isLast && (this.explotionCnt === 5));
            explosionInstance.destroy(); // Clean up clone
         };

         this.unit.addChild(explosionInstance); // Add explosions to the unit container
         explosionInstance.play();
         Sound.play('se_explosion');
     }

    explosionComplete(explosionInstance, isVeryLast) {
        this.explotionCnt++;
        if (isVeryLast) {
            // Only emit DEAD_COMPLETE after the final explosion finishes
             if(this.unit) this.unit.visible = false; // Ensure unit is hidden
             this.visible = false;
            this.emit(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, this);
        }
    }

    // Hook for subclasses
    onDead() {}

    // Emit event for scene/manager to handle bullet creation
    shoot() {
        this.emit(BaseUnit.CUSTOM_EVENT_TAMA_ADD, this);
        // Base boss doesn't play a sound here, subclasses should.
    }


    castAdded() {
        super.castAdded(); // BaseUnit castAdded
        this.unit.alpha = 1; // Ensure visible
        this.unit.visible = true;
        this.visible = true;
        this.deadFlg = false; // Reset flags
        this.dengerousFlg = false;
        this.hp = this.maxHp; // Reset HP

        // Start entry animation
        this.x = Constants.GAME_DIMENSIONS.CENTER_X;
        this.y = -this.character.height; // Start off-screen top
        this.moveFlg = true; // Enable entry movement

        if (this.dengerousBalloon) {
             this.dengerousBalloon.visible = false; // Ensure balloon is hidden initially
             this.dengerousBalloon.stop();
        }
        // Make sure base animation is playing
        this.playAnimation('idle');
    }

    castRemoved() {
        this.tlShoot?.kill(); // Kill timelines on removal
        // Let BaseUnit handle sprite destruction via its destroy method
        super.castRemoved();
    }

     // Override destroy for thorough cleanup
     destroy(options) {
         if (this.tlShoot) {
            this.tlShoot.kill();
            this.tlShoot = null;
         }
         if (this.dengerousBalloon) {
             // Destroyed by PIXI cascade if child of unit
             this.dengerousBalloon = null;
         }
         this.animList = {};
         this.tamaData = null;

         super.destroy(options); // Call BaseUnit destroy
     }
}