// Bullet.js (Original 'S')
import { BaseUnit } from './BaseUnit.js';
import * as Sound from './soundManager.js';
import { gameState } from './gameState.js';
// Import all exports from constants.js into the Constants namespace
import * as Constants from './constants.js';
import * as Utils from './utils.js'; // Import Utils for logging

const { SHOOT_MODES } = Constants;


export class _Bullet extends BaseUnit {
    constructor(data) {
        // --- Assume textures are already PIXI.Texture objects ---
        // Textures should be processed *before* being passed to the Bullet constructor (e.g., in Player.js)
        const textures = Array.isArray(data.texture) ? data.texture.filter(t => t instanceof PIXI.Texture && t !== PIXI.Texture.EMPTY) : []; // Filter out EMPTY textures too
        const explosionTextures = Array.isArray(data.explosion) ? data.explosion.filter(t => t instanceof PIXI.Texture && t !== PIXI.Texture.EMPTY) : null;
        const guardTextures = Array.isArray(data.guard) ? data.guard.filter(t => t instanceof PIXI.Texture && t !== PIXI.Texture.EMPTY) : null;

        // --- Add Warning if textures are empty ---
        if (textures.length === 0) {
            Utils.dlog(`Bullet (${data.name || 'unknown'}): Created with NO valid main textures. Check asset paths/loading. Using EMPTY texture.`);
        }
        // --- End FIX ---

        // Ensure textures has at least one valid texture or fallback
        const validTextures = textures.length > 0 ? textures : [PIXI.Texture.EMPTY];

        super(validTextures, explosionTextures);

        this.name = data.name || 'unnamed_bullet'; // Default name if missing
        this.unit.name = this.name; // Name the interactive part
        this.damage = data.damage !== undefined ? data.damage : 1; // Default damage
        // this.speed = data.speed !== undefined ? data.speed : 5; // Default speed
        this.speed = data.speed !== undefined ? data.speed : 1; // Default speed
        this.hp = data.hp !== undefined ? data.hp : 1; // Default HP
        this.score = data.score || 0;
        this.cagage = data.cagage || 0; // CA Gauge fill amount
        this.guardTexture = guardTextures?.length > 0 ? guardTextures : null; // Use null if empty
        this.deadFlg = false;
        this.shadow.visible = false; // Bullets usually don't have shadows in this style

        // Adjust hitArea based on character size (even if EMPTY texture, width/height might be 0)
        // Use Math.max to ensure non-zero hit area for visibility/interaction checks
        const charWidth = this.character?.width || 1;
        const charHeight = this.character?.height || 1;
        this.unit.hitArea = new PIXI.Rectangle(
            -charWidth / 2,
            -charHeight / 2,
            Math.max(1, charWidth), // Ensure min 1 width
            Math.max(1, charHeight) // Ensure min 1 height
        );

        // *** LOGGING HitArea ***
        Utils.dlog(`Bullet (${this.name}, ID:${this.id}) HitArea set to: x:${this.unit.hitArea.x.toFixed(1)}, y:${this.unit.hitArea.y.toFixed(1)}, w:${this.unit.hitArea.width.toFixed(1)}, h:${this.unit.hitArea.height.toFixed(1)} (based on charW:${charWidth}, charH:${charHeight})`);
        // *** END LOGGING ***

        this.rotation = 0; // Store rotation if needed for movement
        this.targetX = null; // For special movement like 'meka'
        this.cont = 0; // Counter for special movement
        this.start = data.start || 0; // Start time/frame for special movement
        // Use provided ID or assign a unique one based on BaseUnit's counter
        this.id = data.id !== undefined ? data.id : `bullet_${this.id}`; // Reuse BaseUnit's ID

        // Ensure anchor is centered for rotation
        this.unit.pivot.set(0, 0); // Reset pivot if needed
        this.character.anchor.set(0.5);
        if (this.explosion) this.explosion.anchor.set(0.5);

        // Bullets don't need reversed shadows
        this.shadowReverse = false;
        this.shadowOffsetY = 0;

        // *** Explicitly set visibility ***
        this.visible = true;
        this.unit.visible = true;
        this.character.visible = true; // Ensure character sprite is visible

        // LOGGING
        Utils.dlog(`Bullet constructed: ${this.name}, ID: ${this.id}, Damage: ${this.damage}, Speed: ${this.speed}, Visible: ${this.visible}, UnitVis: ${this.unit.visible}, CharVis: ${this.character.visible}, Texture Valid: ${textures.length > 0}`);
    }

    loop(delta) {
        if (this.deadFlg) return;

        if (this.rotX !== undefined && this.rotY !== undefined) {
            // Movement based on fixed rotation (like FANG beam)
            this.x += this.rotX * this.speed * delta;
            this.y += this.rotY * this.speed * delta;
        } else if (this.name === 'meka') {
            // Special 'meka' movement
            this.cont++;
            if (this.cont >= this.start) {
                if (this.targetX === null && gameState.playerRef) {
                    this.targetX = gameState.playerRef.x;
                }
                 if (this.targetX !== null) {
                    this.x += 0.009 * (this.targetX - this.x) * delta * 60; // Adjust speed based on delta
                }
                 this.y += (Math.cos(this.cont / 5) + 2.5 * this.speed) * delta;
            }
        } else {
             // Standard bullet movement using unit.rotation (matches app_formatted.js)
             // Movement based on unit.rotation like original: e.unit.x += 3.5 * Math.cos(e.unit.rotation)
             this.unit.x += this.speed * Math.cos(this.unit.rotation) * delta;
             this.unit.y += this.speed * Math.sin(this.unit.rotation) * delta;
        }

         // Off-screen check should be handled by the scene managing the bullets
    }

    onDamage(amount, hitType = 'normal') {
        if (this.deadFlg) return;
        Utils.dlog(`Bullet ${this.id} onDamage: amount=${amount}, hitType=${hitType}, HP before=${this.hp}`); // LOGGING

        this.hp -= amount;

        if (this.hp <= 0) {
            this.dead(hitType); // Pass hitType to dead method
            // Removed setting deadFlg here, moved to dead()
        } else {
            // Hit flash effect
            this.character.tint = 0xFF0000;
            TweenMax.to(this.character, 0.1, {
                tint: 0xFFFFFF,
                delay: 0.1
            });
        }

        // Explosion/Guard effect
        if (this.explosion) {
            this.explosion.visible = true;
            this.explosion.onComplete = () => {
                if (this.explosion) { // Check if explosion still exists
                    this.explosion.visible = false;
                    this.explosion.gotoAndStop(0);
                }
                // Don't remove child here, let the manager do it on deadComplete
            };

            this.explosion.x = this.character.x; // Position relative to character
            this.explosion.y = this.character.y - 10; // Offset slightly up
            this.explosion.rotation = -Math.PI / 2; // Rotate 90 degrees CCW

            if (hitType === 'infinity' && this.guardTexture) { // Check if guardTexture exists
                this.explosion.textures = this.guardTexture;
                Sound.stop('se_guard');
                Sound.play('se_guard');
            } else {
                // Ensure explosion.originalTextures exists before assigning
                if (this.explosion.originalTextures) {
                    this.explosion.textures = this.explosion.originalTextures;
                } else {
                    Utils.dlog("Bullet explosion missing original textures."); // Handle missing original textures
                }
                // Play appropriate damage sound based on bullet type
                if (this.name === Constants.SHOOT_MODES.NORMAL || this.name === Constants.SHOOT_MODES.THREE_WAY) {
                    Sound.stop('se_damage');
                    Sound.play('se_damage');
                } else if (this.name === Constants.SHOOT_MODES.BIG) {
                    Sound.stop('se_damage'); // Or a different sound?
                    Sound.play('se_damage');
                }
            }
            this.explosion.gotoAndPlay(0);
        } else if (hitType === 'infinity') {
            Sound.stop('se_guard');
            Sound.play('se_guard'); // Play guard sound even without visual effect
        } else {
            Sound.stop('se_damage');
            Sound.play('se_damage');
        }
    }

    dead(hitType) {
        if (this.deadFlg) return; // Prevent multiple dead calls
        this.deadFlg = true; // Set flag here
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD); // Notify manager
        Utils.dlog(`Bullet dead: ${this.name}, ID: ${this.id}, hitType: ${hitType}`); // LOGGING

        this.character.visible = false; // Hide character
        this.shadow.visible = false;    // Hide shadow

        if (this.explosion && hitType !== 'infinity') { // Don't show explosion on guard hit
            Utils.dlog(`Bullet ${this.id} showing explosion.`); // LOGGING
            this.explosion.visible = true;
            this.explosion.rotation = -Math.PI / 2; // Ensure rotation is set for death explosion too
            this.explosion.onComplete = () => this.explosionComplete();
            this.explosion.x = this.character.x;
            this.explosion.y = this.character.y - 10;
            this.explosion.gotoAndPlay(0);
        } else {
            Utils.dlog(`Bullet ${this.id} skipping explosion (hitType=${hitType}, hasExplosion=${!!this.explosion}).`); // LOGGING
            // If no explosion or guard hit, complete immediately
            this.explosionComplete();
        }
    }

    explosionComplete() {
        Utils.dlog(`Bullet explosionComplete: ${this.name}, ID: ${this.id}`); // LOGGING
        // Make sure everything is hidden/stopped
        if (this.explosion) this.explosion.visible = false;
        this.character.visible = false;
        this.shadow.visible = false;
        this.visible = false; // Hide the main bullet container
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE); // Notify manager cleanup is done
        // The actual removal from the stage is handled by the scene/manager
    }

    // Override castAdded/Removed if specific bullet logic is needed on add/remove
    castAdded() {
        super.castAdded(); // Call parent method
        this.visible = true; // Ensure visible on add
        this.unit.visible = true;
        this.character.visible = true;
        this.deadFlg = false; // Reset dead flag
        this.hp = this.hp <= 0 ? 1 : this.hp; // Reset HP if it was 0 or less
        Utils.dlog(`Bullet castAdded: ${this.name}, ID: ${this.id}, Visible: ${this.visible}`); // LOGGING
    }

    castRemoved() {
        Utils.dlog(`Bullet castRemoved: ${this.name}, ID: ${this.id}`); // LOGGING
        super.castRemoved(); // Call parent method
    }

    destroy(options) {
        Utils.dlog(`Bullet destroy called: ${this.name}, ID: ${this.id}`); // LOGGING
        super.destroy(options);
    }
}

export class Bullet extends BaseUnit {
    
    constructor(data) {
        // --- Assume textures are already PIXI.Texture objects ---
        // Textures should be processed *before* being passed to the Bullet constructor (e.g., in Player.js)
        const textures = Array.isArray(data.texture) ? data.texture.filter(t => t instanceof PIXI.Texture && t !== PIXI.Texture.EMPTY) : []; // Filter out EMPTY textures too
        const explosionTextures = Array.isArray(data.explosion) ? data.explosion.filter(t => t instanceof PIXI.Texture && t !== PIXI.Texture.EMPTY) : null;
        const guardTextures = Array.isArray(data.guard) ? data.guard.filter(t => t instanceof PIXI.Texture && t !== PIXI.Texture.EMPTY) : null;

        // --- Add Warning if textures are empty ---
        if (textures.length === 0) {
            Utils.dlog(`Bullet (${data.name || 'unknown'}): Created with NO valid main textures. Check asset paths/loading. Using EMPTY texture.`);
        }
        // --- End FIX ---

        // Ensure textures has at least one valid texture or fallback
        const validTextures = textures.length > 0 ? textures : [PIXI.Texture.EMPTY];

        super(validTextures, explosionTextures);

        this.name = data.name || 'unnamed_bullet'; // Default name if missing
        this.unit.name = this.name; // Name the interactive part
        this.damage = data.damage !== undefined ? data.damage : 1; // Default damage
        // this.speed = data.speed !== undefined ? data.speed : 5; // Default speed
        this.speed = data.speed !== undefined ? data.speed : 1; // Default speed
        this.hp = data.hp !== undefined ? data.hp : 1; // Default HP
        this.score = data.score || 0;
        this.cagage = data.cagage || 0; // CA Gauge fill amount
        this.guardTexture = guardTextures?.length > 0 ? guardTextures : null; // Use null if empty
        this.deadFlg = false;
        this.shadow.visible = false; // Bullets usually don't have shadows in this style

        // Adjust hitArea based on character size (even if EMPTY texture, width/height might be 0)
        // Use Math.max to ensure non-zero hit area for visibility/interaction checks
        const charWidth = this.character?.width || 1;
        const charHeight = this.character?.height || 1;
        this.unit.hitArea = new PIXI.Rectangle(
            -charWidth / 2,
            -charHeight / 2,
            Math.max(1, charWidth), // Ensure min 1 width
            Math.max(1, charHeight) // Ensure min 1 height
        );

        // *** LOGGING HitArea ***
        Utils.dlog(`Bullet (${this.name}, ID:${this.id}) HitArea set to: x:${this.unit.hitArea.x.toFixed(1)}, y:${this.unit.hitArea.y.toFixed(1)}, w:${this.unit.hitArea.width.toFixed(1)}, h:${this.unit.hitArea.height.toFixed(1)} (based on charW:${charWidth}, charH:${charHeight})`);
        // *** END LOGGING ***

        this.rotation = 0; // Store rotation if needed for movement
        this.targetX = null; // For special movement like 'meka'
        this.cont = 0; // Counter for special movement
        this.start = data.start || 0; // Start time/frame for special movement
        // Use provided ID or assign a unique one based on BaseUnit's counter
        this.id = data.id !== undefined ? data.id : `bullet_${this.id}`; // Reuse BaseUnit's ID

        // Ensure anchor is centered for rotation
        this.unit.pivot.set(0, 0); // Reset pivot if needed
        this.character.anchor.set(0.5);
        if (this.explosion) this.explosion.anchor.set(0.5);

        // Bullets don't need reversed shadows
        this.shadowReverse = false;
        this.shadowOffsetY = 0;

        // *** Explicitly set visibility ***
        this.visible = true;
        this.unit.visible = true;
        this.character.visible = true; // Ensure character sprite is visible

        // LOGGING
        Utils.dlog(`Bullet constructed: ${this.name}, ID: ${this.id}, Damage: ${this.damage}, Speed: ${this.speed}, Visible: ${this.visible}, UnitVis: ${this.unit.visible}, CharVis: ${this.character.visible}, Texture Valid: ${textures.length > 0}`);
    }

    loop(delta) {
        if (this.deadFlg) return;

        if (this.rotX !== undefined && this.rotY !== undefined) {
            // Movement based on fixed rotation (like FANG beam)
            this.x += this.rotX * this.speed * delta;
            this.y += this.rotY * this.speed * delta;
        } else if (this.name === 'meka') {
            // Special 'meka' movement
            this.cont++;
            if (this.cont >= this.start) {
                if (this.targetX === null && gameState.playerRef) {
                    this.targetX = gameState.playerRef.x;
                }
                 if (this.targetX !== null) {
                    this.x += 0.009 * (this.targetX - this.x) * delta * 60; // Adjust speed based on delta
                }
                 this.y += (Math.cos(this.cont / 5) + 2.5 * this.speed) * delta;
            }
        } else {
             // Standard bullet movement using unit.rotation (matches app_formatted.js)
             // Movement based on unit.rotation like original: e.unit.x += 3.5 * Math.cos(e.unit.rotation)
             this.unit.x += this.speed * Math.cos(this.unit.rotation) * delta;
             this.unit.y += this.speed * Math.sin(this.unit.rotation) * delta;
        }

         // Off-screen check should be handled by the scene managing the bullets
    }

    onDamage(amount, hitType = 'normal') {
        if (this.deadFlg) return;

        this.hp -= amount;

        if (this.hp <= 0) {
            this.dead(hitType); // Pass hitType to dead method
            this.deadFlg = true;
        } else {
            // Hit flash effect
            this.character.tint = 0xFF0000;
            TweenMax.to(this.character, 0.1, {
                tint: 0xFFFFFF,
                delay: 0.1
            });
        }

        // Explosion/Guard effect
        if (this.explosion) {
            this.explosion.visible = true;
            this.explosion.onComplete = () => {
                 this.explosion.visible = false;
                 this.explosion.gotoAndStop(0);
                 // Don't remove child here, let the manager do it on deadComplete
            };

            this.explosion.x = this.character.x; // Position relative to character
            this.explosion.y = this.character.y - 10; // Offset slightly up

             if (hitType === 'infinity' && this.guardTexture) { // Check if guardTexture exists
                 this.explosion.textures = this.guardTexture;
                 Sound.stop('se_guard');
                 Sound.play('se_guard');
             } else {
                 this.explosion.textures = this.explosion.originalTextures; // Restore original explosion
                 // Play appropriate damage sound based on bullet type
                 if (this.name === SHOOT_MODES.NORMAL || this.name === SHOOT_MODES.THREE_WAY) {
                     Sound.stop('se_damage');
                     Sound.play('se_damage');
                 } else if (this.name === SHOOT_MODES.BIG) {
                      Sound.stop('se_damage'); // Or a different sound?
                      Sound.play('se_damage');
                 }
             }
            this.explosion.gotoAndPlay(0);
        } else if (hitType === 'infinity') {
             Sound.stop('se_guard');
             Sound.play('se_guard'); // Play guard sound even without visual effect
        } else {
             Sound.stop('se_damage');
             Sound.play('se_damage');
        }
    }

    dead(hitType) {
        if (this.deadFlg) return; // Prevent multiple dead calls
        this.deadFlg = true;
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD); // Notify manager

        this.character.visible = false; // Hide character
        this.shadow.visible = false;    // Hide shadow

        if (this.explosion && hitType !== 'infinity') { // Don't show explosion on guard hit
            this.explosion.visible = true;
            this.explosion.onComplete = () => this.explosionComplete();
            this.explosion.x = this.character.x;
            this.explosion.y = this.character.y - 10;
            this.explosion.gotoAndPlay(0);
        } else {
            // If no explosion or guard hit, complete immediately
            this.explosionComplete();
        }
    }

    explosionComplete() {
        // Make sure everything is hidden/stopped
        if (this.explosion) this.explosion.visible = false;
        this.character.visible = false;
        this.shadow.visible = false;
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE); // Notify manager cleanup is done
        // The actual removal from the stage is handled by the scene/manager
    }

     // Override castAdded/Removed if specific bullet logic is needed on add/remove
    // castAdded() {
    //     super.castAdded(); // Call parent method
    //     // ... bullet specific add logic
    // }

    // castRemoved() {
    //     super.castRemoved(); // Call parent method
    //     // ... bullet specific remove logic
    // }
}