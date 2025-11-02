// Player.js (Original 'M')
import { BaseUnit } from './BaseUnit.js';
import { Bullet } from './Bullet.js';
import * as Constants from './constants.js';
// Import specific constants from constants.js
import { SHOOT_MODES, SHOOT_SPEEDS } from './constants.js';
import { gameState } from './gameState.js';
import * as Sound from './soundManager.js';
import * as Utils from './utils.js'; // Ensure Utils is imported


export class Player extends BaseUnit {
    static CUSTOM_EVENT_BULLET_ADD = "playerBulletAdd";

    constructor(data) {
        console.log("Player constructor called");
        // --- Texture Pre-processing ---
        // This should ideally happen ONCE during loading, not in constructor
        const processTextures = (texturePaths) => {
            return texturePaths.map(path => {
                const texture = PIXI.Texture.from(path);
                texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                return texture;
            });
        };

        const playerFrames = processTextures(data.texture);
        const explosionFrames = data.explosion ? processTextures(data.explosion) : null;

        super(playerFrames, explosionFrames);

        // --- Player Specific Data ---
        this.unit.name = data.name;
        this.maxHp = data.maxHp;
        this.hp = data.hp; // Set initial HP
        this._percent = this.hp / this.maxHp; // Use internal var for getter/setter

        // --- Bullet Data ---
        const hitFrames = data.hit ? processTextures(data.hit) : null;
        const guardFrames = data.guard ? processTextures(data.guard) : null;

        this.shootNormalData = {
            ...data.shootNormal,
            texture: processTextures(data.shootNormal.texture),
            explosion: hitFrames,
            guard: guardFrames
        };
        this.shootBigData = {
            ...data.shootBig,
            texture: processTextures(data.shootBig.texture),
            explosion: hitFrames,
            guard: guardFrames
        };
        this.shoot3wayData = {
            ...data.shoot3way,
            texture: this.shootNormalData.texture, // Uses normal bullet texture
            explosion: hitFrames,
            guard: guardFrames
        };

        // --- Barrier ---
        this.barrierFrames = data.barrier ? processTextures(data.barrier.texture) : null;
        this.barrierEffectTexture = data.barrierEffectTexture ? PIXI.Texture.from(data.barrierEffectTexture) : null;

        if (this.barrierFrames) {
            this.barrier = new PIXI.extras.AnimatedSprite(this.barrierFrames);
            this.barrier.animationSpeed = 0.15;
            this.barrier.anchor.set(0.5);
            this.barrier.hitArea = new PIXI.Rectangle(-this.barrier.width / 2 + 2, -this.barrier.height / 2 + 2, this.barrier.width - 4, this.barrier.height - 4); // Centered hit area
            this.barrier.interactive = false;
            this.barrier.visible = false;
            this.addChild(this.barrier); // Add barrier to player container
        }

        if (this.barrierEffectTexture) {
            this.barrierEffect = new PIXI.Sprite(this.barrierEffectTexture);
            this.barrierEffect.anchor.set(0.5);
            this.barrierEffect.visible = false;
            this.addChild(this.barrierEffect); // Add effect to player container
        }

        // --- State & Control ---
        this.shootOn = false; // Renamed from shootOn = 0/1
        this.bulletList = []; // Managed by the scene, player only creates them
        this.bulletFrameCnt = 0;
        this.bulletIdCnt = 0;
        this.shootSpeedBoost = 0; // Renamed from shootSpeed
        this.shootIntervalBase = 0; // Renamed from shootInterval
        this.shootData = {}; // Current bullet data
        this.shootMode = SHOOT_MODES.NORMAL;

        this.unitX = Constants.GAME_DIMENSIONS.CENTER_X; // Target X position
        this.unitY = Constants.GAME_DIMENSIONS.HEIGHT - (this.character?.height || 50) - 30; // Target Y

        this.character.animationSpeed = 0.35;
        this.shadow.animationSpeed = 0.35;
        this.shadowOffsetY = 5;

        // Initialize unit position (can be modified by animations like damage shake)
        this.unit.x = 0;
        this.unit.y = 0;

        this.damageAnimationFlg = false;
        this.barrierFlg = false;
        this.screenDragFlg = false;
        this.keyDownFlg = false;
        this.keyDownCode = "";

        // --- Input Area ---
        // Use the interactionManager from globals, apply to the stage or a dedicated input layer
        this.dragAreaRect = null; // Create this in the scene, not the player

        // --- Event Listeners ---
        this.keyDownListener = this.onKeyDown.bind(this);
        this.keyUpListener = this.onKeyUp.bind(this);
        this._listenersAttached = false; // Flag to track listener state

         // Adjust hitArea based on actual sprite size
         this.unit.hitArea = new PIXI.Rectangle(
            -this.character.width / 2 + 7, // Adjust x based on anchor
            -this.character.height / 2 + 20, // Adjust y based on anchor
            this.character.width - 14,
            this.character.height - 40
         );

         this.updateShootData(); // Initialize shoot data
    }

    // --- Getters/Setters ---
    get percent() {
        return this._percent;
    }
    // Setter not strictly needed if only updated internally via onDamage
    // set percent(value) { this._percent = value; }

    // --- Input Handling ---
    // These should be attached/detached by the scene managing the player
    attachInputListeners() {
        if (this._listenersAttached || typeof document === 'undefined') return; // Don't attach multiple times
        console.log("Attaching Player keyboard listeners.");
        document.addEventListener("keydown", this.keyDownListener);
        document.addEventListener("keyup", this.keyUpListener);
        this._listenersAttached = true;
    }

    detachInputListeners() {
        if (!this._listenersAttached || typeof document === 'undefined') return; // Don't detach if not attached
        console.log("Detaching Player keyboard listeners.");
        document.removeEventListener("keydown", this.keyDownListener);
        document.removeEventListener("keyup", this.keyUpListener);
        this._listenersAttached = false;
    }

     // Pointer events should be handled by the scene's input layer
     onScreenDragStart(event) {
         this.screenDragFlg = true;
         this.updateTargetX(event.data.global.x);
     }

     onScreenDragMove(event) {
         if (this.screenDragFlg) {
             this.updateTargetX(event.data.global.x);
         }
     }

     onScreenDragEnd(event) {
         this.screenDragFlg = false;
     }

     onKeyDown(event) {
         this.keyDownFlg = true;
         this.keyDownCode = event.keyCode;
         event.preventDefault();
     }

     onKeyUp(event) {
         this.keyDownFlg = false;
         event.preventDefault();
     }

    updateTargetX(globalX) {
        if (!this.parent) {
            return;
        }
         const halfHitboxWidth = this.unit.hitArea.width / 2;
         // Adjust target based on the object's center, not the global X directly
         let target = globalX - this.parent.x; // Adjust for container position if player is nested

         target = Math.max(halfHitboxWidth, target);
         target = Math.min(Constants.GAME_DIMENSIONS.WIDTH - halfHitboxWidth, target);
         this.unitX = target;
    }

    // --- Game Loop ---
    loop(delta) {
         if (this.deadFlg) return;
        // --- Movement ---
        if (this.keyDownFlg) {
            const moveSpeed = 6 * delta; // Adjust speed based on delta
            switch (this.keyDownCode) {
                case 37: // Left Arrow
                    this.unitX -= moveSpeed;
                    break;
                case 39: // Right Arrow
                     this.unitX += moveSpeed;
                     break;
            }
             // Clamp position based on center and hitArea width
             const halfHitboxWidth = this.unit.hitArea.width / 2;
             this.unitX = Math.max(halfHitboxWidth, this.unitX);
             this.unitX = Math.min(Constants.GAME_DIMENSIONS.WIDTH - halfHitboxWidth, this.unitX);
        }

         // Smooth movement towards target using lerp (linear interpolation)
         // Delta is typically 1.0 at 60fps, so we just use 0.09 as the lerp factor
         const lerpFactor = 0.09; // Keep constant for smooth movement
         this.x += lerpFactor * (this.unitX - this.x);
         // Player Y is usually fixed or handled differently, lerping might not be desired
         // this.y += lerpFactor * (this.unitY - this.y);

         // Update barrier position relative to the player's current position
         if (this.barrier) {
            this.barrier.x = 0; // Relative to player center because of anchor
            this.barrier.y = -this.character.height / 2 + this.barrier.height / 2 - 15; // Adjust based on anchors
        }

         this.updateShadowPosition(); // Update shadow position based on character

        // --- Shooting (Frame-based) ---
        this.bulletFrameCnt++; // Increment frame counter
        const shootInterval = this.shootIntervalBase - this.shootSpeedBoost;
        if (shootInterval <= 0) { // Prevent division by zero or negative interval
            Utils.dlog("Warning: Player shoot interval is zero or negative, shooting every frame.");
            if (this.shootOn) this.shoot();
        } else if (this.shootOn && this.bulletFrameCnt % shootInterval === 0) {
            this.shoot();
        }
    }

     // Override BaseUnit's updateShadowPosition if Player's shadow behaves differently
     updateShadowPosition() {
         this.shadow.x = 0; // Centered due to anchor
         if (this.shadowReverse) {
             this.shadow.scale.y = -1;
             this.shadow.y = this.character.height / 2 + this.shadow.height / 2 - this.shadowOffsetY;
         } else {
             this.shadow.scale.y = 1;
             this.shadow.y = this.character.height / 2 + this.shadow.height / 2 - this.shadowOffsetY;
         }
     }


    // --- Shooting Logic ---
    shoot() {
        const bullets = [];

        switch (this.shootMode) {
            case SHOOT_MODES.NORMAL:
                {
                    const bullet = new Bullet(this.shootNormalData);
                    bullet.unit.rotation = 270 * Math.PI / 180;
                    bullet.unit.x = this.unit.x + 5 * Math.cos(bullet.unit.rotation) - 2;
                    bullet.unit.y = this.unit.y + 5 * Math.sin(bullet.unit.rotation) - 15;
                    bullet.name = SHOOT_MODES.NORMAL;
                    bullet.id = this.bulletIdCnt++;
                    bullet.shadowReverse = false;
                    bullet.shadowOffsetY = 0;
                    bullets.push(bullet);
                    this.bulletList.push(bullet);
                    Sound.stop('se_shoot');
                    Sound.play('se_shoot');
                    break;
                }
            case SHOOT_MODES.BIG:
                {
                    const bullet = new Bullet(this.shootBigData);
                    bullet.unit.rotation = 270 * Math.PI / 180;
                    bullet.unit.x = this.unit.x + 5 * Math.cos(bullet.unit.rotation) + 0;
                    bullet.unit.y = this.unit.y + 5 * Math.sin(bullet.unit.rotation) - 15;
                    bullet.name = SHOOT_MODES.BIG;
                    bullet.id = this.bulletIdCnt++;
                    bullet.shadowReverse = false;
                    bullet.shadowOffsetY = 0;
                    bullets.push(bullet);
                    this.bulletList.push(bullet);
                    Sound.stop('se_shoot_b');
                    Sound.play('se_shoot_b');
                    break;
                }
            case SHOOT_MODES.THREE_WAY:
                {
                    for (let i = 0; i < 3; i++) {
                        const bullet = new Bullet(this.shoot3wayData);
                        if (i === 0) {
                            bullet.unit.rotation = 280 * Math.PI / 180;
                            bullet.unit.x = this.unit.x + 5 * Math.cos(bullet.unit.rotation) + 4;
                            bullet.unit.y = this.unit.y + 5 * Math.sin(bullet.unit.rotation) - 15;
                        } else if (i === 1) {
                            bullet.unit.rotation = 270 * Math.PI / 180;
                            bullet.unit.x = this.unit.x + 5 * Math.cos(bullet.unit.rotation) + 0;
                            bullet.unit.y = this.unit.y + 5 * Math.sin(bullet.unit.rotation) - 15;
                        } else if (i === 2) {
                            bullet.unit.rotation = 260 * Math.PI / 180;
                            bullet.unit.x = this.unit.x + 5 * Math.cos(bullet.unit.rotation) - 4;
                            bullet.unit.y = this.unit.y + 5 * Math.sin(bullet.unit.rotation) - 15;
                        }
                        bullet.id = this.bulletIdCnt++;
                        bullet.shadowReverse = false;
                        bullet.shadowOffsetY = 0;
                        bullets.push(bullet);
                        this.bulletList.push(bullet);
                    }
                    Sound.stop('se_shoot');
                    Sound.play('se_shoot');
                    break;
                }
        }

        // Emit event with bullet objects for GameScene to add to bulletContainer
        this.emit(Player.CUSTOM_EVENT_BULLET_ADD, bullets);
    }

    // Bullet management now handled by GameScene
    // bulletRemove and bulletRemoveComplete methods no longer needed

    updateShootData() {
         switch (this.shootMode) {
             case SHOOT_MODES.NORMAL:
                 this.shootData = this.shootNormalData;
                 break;
             case SHOOT_MODES.BIG:
                 this.shootData = this.shootBigData;
                 break;
             case SHOOT_MODES.THREE_WAY:
                 this.shootData = this.shoot3wayData;
                 break;
         }
         this.shootIntervalBase = this.shootData.interval || 20; // Default interval if missing
    }

    shootModeChange(newMode) {
        if (this.shootMode === newMode) return; // No change
        this.shootMode = newMode;
        this.updateShootData();
        Sound.play('g_powerup_voice');
    }

    shootSpeedChange(newSpeedMode) {
        let newBoost = 0;
        switch (newSpeedMode) {
            case SHOOT_SPEEDS.NORMAL:
                newBoost = 0;
                break;
            case SHOOT_SPEEDS.HIGH:
                newBoost = 15; // Value from original code
                break;
        }
        if (this.shootSpeedBoost === newBoost) return; // No change
        this.shootSpeedBoost = newBoost;
        Sound.play('g_powerup_voice');
    }

    // --- Setup & State Management ---
    setUp(hp, shootMode, shootSpeedMode) {
        this.maxHp = gameState.playerMaxHp; // Use gameState maxHp
        this.hp = hp;
        this._percent = this.hp / this.maxHp;
        this.shootMode = shootMode;
        this.shootModeChange(shootMode); // Apply mode change logic
        this.shootSpeedChange(shootSpeedMode); // Apply speed change logic
        this.deadFlg = false;
        this.damageAnimationFlg = false;
        this.character.tint = 0xFFFFFF; // Reset tint
        this.character.alpha = 1;
        this.unit.visible = true; // Ensure unit is visible
        // Ensure unit position starts at origin (can be modified by animations like damage shake)
        this.unit.x = 0;
        this.unit.y = 0;
    }

    shootStop() {
        this.shootOn = false;
    }

    shootStart() {
        this.shootOn = true;
        this.bulletFrameCnt = 0; // Reset counter when starting
    }

    // --- Barrier Logic ---
    barrierStart() {
        if (!this.barrier || this.barrierFlg) return; // No barrier sprite or already active

        Sound.play('se_barrier_start');
        this.barrierFlg = true;
        this.barrier.alpha = 0;
        this.barrier.visible = true;

        if (this.barrierEffect) {
             this.barrierEffect.x = this.barrier.x; // Position relative to barrier
             this.barrierEffect.y = this.barrier.y;
             this.barrierEffect.alpha = 1;
             this.barrierEffect.visible = true;
             this.barrierEffect.scale.set(0.5);
             TweenMax.to(this.barrierEffect.scale, 0.4, { x: 1, y: 1, ease: Quint.easeOut });
             TweenMax.to(this.barrierEffect, 0.5, { alpha: 0 });
        }

        // Kill previous timeline if exists
        if (this.barrierTimeline) {
            this.barrierTimeline.kill();
        }

        this.barrierTimeline = new TimelineMax({
            onComplete: () => {
                if(this.barrier) this.barrier.visible = false;
                if(this.barrierEffect) this.barrierEffect.visible = false;
                this.barrierFlg = false;
                Sound.play('se_barrier_end');
                this.barrierTimeline = null; // Clear reference
            }
        });

        // Recreate the blinking effect (simplified version)
         this.barrierTimeline
             .to(this.barrier, 0.3, { alpha: 1 }) // Fade in
             .to(this.barrier, 0.1, { alpha: 0, delay: 4.0, repeat: 10, yoyo: true }) // Blink fast towards end
             .to(this.barrier, 0.5, { alpha: 1, delay: 1.0}) // Stay solid longer
             .to(this.barrier, 0.1, { alpha: 0, delay: 0.5, repeat: 6, yoyo: true }) // Blink faster
             .to(this.barrier, 0.1, { alpha: 1, delay: 0.1}) // Last flicker
             .to(this.barrier, 0.1, { alpha: 0 }); // Fade out
    }

    barrierHitEffect() {
        if (!this.barrier) return;
        this.barrier.tint = 0xFF0000;
        TweenMax.to(this.barrier, 0.2, { tint: 0xFFFFFF });
        Sound.play('se_guard');
    }

    // --- Damage & Death ---
    onDamage(amount) {
        if (this.barrierFlg || this.damageAnimationFlg || this.deadFlg) {
             if (this.barrierFlg) this.barrierHitEffect(); // Show barrier hit even if no damage taken
             return;
        }

        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
        }
        this._percent = this.hp / this.maxHp;

        this.damageAnimationFlg = true; // Prevent rapid damage calls

        if (this.hp <= 0) {
             this.dead();
        } else {
             // Damage flicker/knockback animation
             const initialY = this.y;
             const damageTimeline = new TimelineMax({
                 onComplete: () => { this.damageAnimationFlg = false; this.y = initialY; } // Reset flag and position
             });

             // Flicker effect
             damageTimeline
                 .to(this.unit, 0.1, { alpha: 0.2, tint: 0xFF0000 })
                 .to(this.unit, 0.1, { alpha: 1.0, tint: 0xFFFFFF })
                 .to(this.unit, 0.1, { alpha: 0.2, tint: 0xFF0000 })
                 .to(this.unit, 0.1, { alpha: 1.0, tint: 0xFFFFFF })
                 .to(this.unit, 0.1, { alpha: 0.2, tint: 0xFF0000 })
                 .to(this.unit, 0.1, { alpha: 1.0, tint: 0xFFFFFF });

             // Small shake (optional) - apply to the main player object (this)
             damageTimeline
                .to(this, 0.05, { y: initialY + 2 }, 0) // Start shake simultaneously
                .to(this, 0.05, { y: initialY - 2 }, 0.05)
                .to(this, 0.05, { y: initialY + 2 }, 0.10)
                .to(this, 0.05, { y: initialY - 2 }, 0.15)
                .to(this, 0.05, { y: initialY }, 0.20);


             Sound.play('g_damage_voice');
             Sound.play('se_damage');
        }
    }

    dead() {
        if (this.deadFlg) return;
        this.deadFlg = true;
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD);
        this.shootStop();
        this.detachInputListeners(); // Stop listening to input

        this.unit.visible = false; // Hide the unit container (character + shadow)

        if (this.explosion) {
            this.explosion.visible = true;
            this.explosion.x = 0; // Position relative to player center
            this.explosion.y = 0;
            this.explosion.onComplete = () => this.explosionComplete();
            this.explosion.gotoAndPlay(0);
        } else {
            this.explosionComplete(); // Complete immediately if no explosion
        }

         // Clear existing bullets visually (manager should handle removal from list)
         // this.bulletList.forEach(bullet => bullet.destroy());
         // this.bulletList = [];

        Sound.play('se_explosion');
        Sound.play('g_continue_no_voice0'); // Assuming this is the death voice
    }

    explosionComplete() {
        if (this.explosion) this.explosion.visible = false;
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE);
        // Player object might be removed by the scene later
    }

    castAdded() {
        super.castAdded(); // BaseUnit castAdded
        this.attachInputListeners();
        this.damageAnimationFlg = false;
         this.unit.visible = true; // Ensure visibility on add
         this.deadFlg = false; // Reset dead flag
         this.hp = this.maxHp; // Reset HP? Or use gameState.playerHp?
         this._percent = 1.0;
    }

    castRemoved() {
        this.shootStop();
        this.detachInputListeners();
        // Kill timelines
        if (this.barrierTimeline) this.barrierTimeline.kill();
        // Let BaseUnit handle sprite destruction via its destroy method
        super.castRemoved();
    }

     // Override destroy for thorough cleanup
     destroy(options) {
        console.log("Player destroy called");
         this.detachInputListeners();
         if (this.barrier) this.barrier.destroy();
         if (this.barrierEffect) this.barrierEffect.destroy();
         if (this.barrierTimeline) this.barrierTimeline.kill();
         // dragAreaRect is handled by the scene

         this.barrier = null;
         this.barrierEffect = null;
         this.barrierTimeline = null;
         this.keyDownListener = null;
         this.keyUpListener = null;
         this.bulletList = []; // Clear list

         super.destroy(options); // Call BaseUnit destroy
     }
}