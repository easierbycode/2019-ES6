// Enemy.js (Original 'Ye')
import { BaseUnit } from './BaseUnit.js';
import * as Sound from './soundManager.js';
import { gameState } from './gameState.js';
import { globals } from './globals.js';
import * as Constants from './constants.js';
// Import specific constants from constants.js
import { SHOOT_MODES, SHOOT_SPEEDS, ITEM_TYPES } from './constants.js';
import { AnimatedItem } from './AnimatedItem.js'; // Import item class
import * as Utils from './utils.js'; // Import Utils for logging

export class Enemy extends BaseUnit {
    constructor(data) {
        // --- Texture Pre-processing Helper ---
        const processTextures = (textureInput) => {
            if (!textureInput) return null;
            if (!Array.isArray(textureInput)) { // Handle potential single string path
                textureInput = [textureInput];
            }
            return textureInput.map(item => {
                if (item instanceof PIXI.Texture) {
                    // Already a texture, ensure scale mode and return if valid
                    if (!item.baseTexture) { // Add check for baseTexture existence
                        console.warn("Enemy.processTextureArray: Texture missing baseTexture:", item);
                        return null;
                    }
                    item.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                    return item !== PIXI.Texture.EMPTY ? item : null;
                }
                if (typeof item === 'string') {
                    // Assume item is an alias in loaded resources or a path
                    // Using PIXI.Texture.from handles both cases (cache check first)
                    const texture = PIXI.Texture.from(item);
                    if (texture && texture !== PIXI.Texture.EMPTY) {
                        if (!texture.baseTexture) { // Check after creating from string
                            console.warn(`Enemy.processTextureArray: Texture from string '${item}' missing baseTexture.`);
                            return null;
                        }
                        texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                        return texture;
                    } else {
                        console.warn(`Enemy.processTextureArray: Could not create/find texture from string: ${item}`);
                        return null;
                    }
                }
                // Log other invalid types
                console.warn("Enemy.processTextureArray: Invalid item in texture array:", item);
                return null;
            }).filter(t => t !== null); // Filter out nulls (invalid items or EMPTY textures)
        };
        // --- End Helper ---

        // Process base enemy texture array (likely strings)
        const enemyFrames = processTextures(data.texture);
        Utils.dlog(`Enemy (${data.name || 'unknown'}) Processed Enemy Frames Count: ${enemyFrames?.length}`);

        // Use already processed textures for explosion if passed by GameScene
        const explosionFrames = Array.isArray(data.explosion) ? data.explosion.filter(t => t instanceof PIXI.Texture && t !== PIXI.Texture.EMPTY) : null;
        Utils.dlog(`Enemy (${data.name || 'unknown'}) Received Explosion Frames Count: ${explosionFrames?.length}`);

        // TamaData Texture Processing: Process texture paths within tamaData if they exist and are strings.
        let processedTamaData = null;
        if (data.tamaData) {
            processedTamaData = { ...data.tamaData }; // Clone tamaData
            if (processedTamaData.texture) {
                const processedTamaTextures = processTextures(processedTamaData.texture);
                Utils.dlog(`Enemy (${data.name || 'unknown'}) Processed Tama Frames Count: ${processedTamaTextures?.length}`);
                processedTamaData.texture = processedTamaTextures; // Assign processed textures
                if (!processedTamaData.texture || processedTamaData.texture.length === 0) {
                    Utils.dlog(`Enemy (${data.name || 'unknown'}): tamaData texture processing failed or resulted in empty array.`);
                    // Keep tamaData but with empty/null texture array, handle in shoot logic
                    processedTamaData.texture = [];
                }
            }
            // Add explosion frames to tamaData if passed from GameScene
            if (explosionFrames) {
                processedTamaData.explosion = explosionFrames;
            }
        }

        // Add safety check for enemyFrames before calling super
        if (!enemyFrames || enemyFrames.length === 0) {
            console.error(`Enemy (${data.name || 'unknown'}) animation frames failed to load or process! Using fallback.`);
            // Use fallback texture array for super call
            super([PIXI.Texture.EMPTY], explosionFrames);
        } else {
            super(enemyFrames, explosionFrames);
        }

        // --- LOGGING Immediately After super() ---
        const charWidthLog = this.character?.width || 'N/A';
        const charHeightLog = this.character?.height || 'N/A';
        const charTextureValidLog = this.character?.texture?.valid ?? 'N/A';
        Utils.dlog(`Enemy (${data.name || 'unknown'}, ID:${this.id}) POST-SUPER: CharDims=(${charWidthLog}x${charHeightLog}), CharTexValid=${charTextureValidLog}, BaseVis=${this.visible}, UnitVis=${this.unit?.visible}, CharVis=${this.character?.visible}, ExploVis=${this.explosion?.visible}`);
        // --- END LOGGING ---

        // --- Enemy Specific Data ---
        this.name = data.name || 'unnamed_enemy'; // Add default name
        this.unit.name = this.name; // Name the interactive part
        this.interval = data.interval; // Shoot interval (in frames)
        this.score = data.score;
        this.hp = data.hp;
        this.speed = data.speed;
        this.cagage = data.cagage; // CA Gauge fill amount
        this.tamaData = processedTamaData; // Use the processed tamaData
        this.itemName = data.itemName;
        // *** FIX: Assume data.itemTexture is already a processed array of PIXI.Texture objects ***
        this.itemTextureFrames = Array.isArray(data.itemTexture) ? data.itemTexture.filter(t => t instanceof PIXI.Texture && t !== PIXI.Texture.EMPTY) : null;
        if (data.itemTexture && !this.itemTextureFrames) {
            Utils.dlog(`Enemy (${this.name}): itemTexture was provided but was not a valid Texture array after filtering.`);
        } else if (this.itemTextureFrames) {
            Utils.dlog(`Enemy (${this.name}): Stored ${this.itemTextureFrames.length} item texture frames.`);
        }

        // Filters
        this.whiteFilter = new PIXI.filters.ColorMatrixFilter();
        this.whiteFilter.matrix = [ // Matrix for white flash
            1, 1, 1, 1, 0, // R = R+G+B+A * 0 + 1 -> effectively 1
            1, 1, 1, 1, 0, // G
            1, 1, 1, 1, 0, // B
            0, 0, 0, 1, 0  // A
        ];
        this.whiteFilter.enabled = false; // Disable initially
        this.filters = [this.whiteFilter]; // Apply filter list

        // Specific Enemy Logic Flags/Properties
        this.shadowReverse = data.shadowReverse !== undefined ? data.shadowReverse : true; // Default based on original
        this.shadowOffsetY = data.shadowOffsetY || 0;
        this.shootFlg = true; // Can shoot initially
        this.hardleFlg = data.interval <= -1; // Is it just an obstacle?
        this.deadFlg = false;
        // *** REMOVED: timeAccumulatorShoot ***
        this.bulletFrameCnt = 0; // *** ADDED: Frame counter for shooting ***
        this.posName = null; // For soliderB movement
        this._internalFrameCount = 0; // Internal counter for periodic logging

        // Adjust hitArea based on name
        // Ensure character dimensions are valid before setting hitArea
        const charWidth = Math.max(1, this.character?.width || 1);
        const charHeight = Math.max(1, this.character?.height || 1);

        switch (this.name) {
            case "baraA":
            case "baraB":
                if (this.shadow) this.shadow.visible = false; // Check if shadow exists
                // Keep default hitArea or define specific one
                if (this.unit) this.unit.hitArea = new PIXI.Rectangle(-charWidth / 2, -charHeight / 2, charWidth, charHeight); // Check if unit exists
                break;
            case "drum":
                if (this.unit) this.unit.hitArea = new PIXI.Rectangle(-charWidth / 2 + 7, -charHeight / 2 + 2, charWidth - 14, charHeight - 4);
                break;
            case "launchpad":
                if (this.unit) this.unit.hitArea = new PIXI.Rectangle(-charWidth / 2 + 8, -charHeight / 2 + 0, charWidth - 16, charHeight);
                break;
            default:
                // Default centered hit area
                if (this.unit) this.unit.hitArea = new PIXI.Rectangle(-charWidth / 2, -charHeight / 2, charWidth, charHeight);
        }

        this.updateShadowPosition(); // Set initial shadow position

        // Ensure visibility after setup
        this.visible = true;
        if (this.unit) this.unit.visible = true;
        if (this.character) this.character.visible = true;

        // *** DETAILED LOGGING at Constructor END ***
        const textureValid = this.character?.texture !== PIXI.Texture.EMPTY;
        const hitAreaLog = this.unit?.hitArea ? `HitArea(x:${this.unit.hitArea.x.toFixed(1)}, y:${this.unit.hitArea.y.toFixed(1)}, w:${this.unit.hitArea.width.toFixed(1)}, h:${this.unit.hitArea.height.toFixed(1)})` : 'No HitArea';
        Utils.dlog(`Enemy (${this.name}, ID:${this.id}) CONSTRUCTOR END: BaseVis=${this.visible}, UnitVis=${this.unit?.visible}, CharVis=${this.character?.visible}, TextureValid=${textureValid}, ${hitAreaLog}`);
        // *** END LOGGING ***
    }

    loop(delta, stageScrollAmount) {
        if (this.deadFlg) return;

        this._internalFrameCount++; // Increment internal frame counter

        // Convert delta (likely fraction of 1/60s) to seconds
        const deltaSeconds = delta / 60.0;

        // *** ADDED: Stop shooting if too low on screen (moved from GameScene) ***
        if (this.y > Constants.GAME_DIMENSIONS.HEIGHT - 100) {
            if (this.shootFlg) {
                Utils.dlog(`Enemy ${this.name} [ID:${this.id}] stopping shoot (Y=${this.y.toFixed(0)})`);
                this.shootFlg = false;
            }
        }
        // --- END ADDED ---

        // Shooting (Frame-based)
        this.bulletFrameCnt++; // Increment frame counter
        // *** ADDED BOUNDARY CHECK FOR SHOOTING ***
        const canShoot = this.shootFlg && !this.hardleFlg && this.interval > 0 && this.y > -this.character.height; // Only shoot if mostly on screen from top
        // *** END BOUNDARY CHECK ***

        if (canShoot && (this.bulletFrameCnt % this.interval === 0)) {
            Utils.dlog(`Enemy ${this.name} [ID:${this.id}] SHOOT condition PASSED (frame count): shootFlg=${this.shootFlg}, hardle=${this.hardleFlg}, interval=${this.interval}, frameCnt=${this.bulletFrameCnt}, Y=${this.y.toFixed(0)}`);
            this.shoot();
        } else if (this._internalFrameCount % 120 === 0 && this.interval > 0 && !this.hardleFlg && this.shootFlg) { // Log periodically if eligible but interval not met or offscreen
            Utils.dlog(`Enemy ${this.name} [ID:${this.id}] shoot pending/blocked: shootFlg=${this.shootFlg}, hardle=${this.hardleFlg}, interval=${this.interval}, frameCnt=${this.bulletFrameCnt}, canShoot=${canShoot}, Y=${this.y.toFixed(0)}`);
        }


        // Movement (adjust speed based on seconds)
        // Speed might represent pixels per frame, so adjust by deltaSeconds * targetFPS
        const moveSpeedFactor = deltaSeconds * Constants.FPS; // Factor to adjust speeds defined per-frame
        const stageScrollAdjusted = stageScrollAmount > 0 ? (stageScrollAmount / delta) * moveSpeedFactor : 0; // Adjust stage scroll influence
        this.y += (this.speed * moveSpeedFactor) + stageScrollAdjusted; // Apply moveSpeedFactor to enemy speed

        switch (this.name) {
            case "soliderA":
                if (this.y >= Constants.GAME_DIMENSIONS.HEIGHT / 1.5 && gameState.playerRef) {
                    // Adjust speed calculation using lerp for smoother following
                    const followSpeed = 0.005; // Adjust this factor
                    const targetX = gameState.playerRef.x;
                    this.x += (targetX - this.x) * followSpeed * moveSpeedFactor; // Lerp towards player X
                }
                break;
            case "soliderB":
                // Complex entry and horizontal movement
                if (this.y <= 10) { // Initial entry position check
                    if (this.posName === null) { // Set initial side only once
                        this.posName = this.x >= Constants.GAME_DIMENSIONS.CENTER_X ? "right" : "left";
                        this.x = this.posName === "right" ? Constants.GAME_DIMENSIONS.WIDTH + this.character.width / 2 : -this.character.width / 2;
                    }
                } else if (this.y >= Constants.GAME_DIMENSIONS.HEIGHT / 3) {
                    // Horizontal movement after reaching a certain Y
                    const horizontalSpeed = 1 * moveSpeedFactor; // Adjust speed based on factor
                    if (this.posName === "right") {
                        this.x -= horizontalSpeed;
                    } else if (this.posName === "left") {
                        this.x += horizontalSpeed;
                    }
                }
                break;
        }
        // Keep shadow updated
        this.updateShadowPosition();
    }

    shoot() {
        Utils.dlog(`Enemy ${this.name} [ID:${this.id}] attempting to shoot.`);
        // Ensure tamaData exists and is valid before emitting
        if (!this.tamaData || !this.tamaData.texture || this.tamaData.texture.length === 0) {
            Utils.dlog(`Enemy ${this.name} [ID:${this.id}] cannot shoot: Invalid or missing tamaData/textures.`);
            return;
        }
        // Emit event for the scene/manager to handle bullet creation
        Utils.dlog(`Enemy ${this.name} [ID:${this.id}] emitting ${BaseUnit.CUSTOM_EVENT_TAMA_ADD}`);
        this.emit(BaseUnit.CUSTOM_EVENT_TAMA_ADD, this); // Pass self as context
        Sound.stop('se_shoot'); // Assuming generic enemy shoot sound
        Sound.play('se_shoot');
    }

    onDamage(amount) {
        if (this.deadFlg || !this.character) return; // Add character check

        if (this.hp === Infinity || this.hp === 'infinity') { // Handle indestructible (like hurdles)
            // White flash effect
            this.whiteFilter.enabled = true;
            TweenMax.to(this.whiteFilter, 0.1, {
                enabled: false, // Directly control enabled property
                delay: 0.1,
                onComplete: () => { this.whiteFilter.enabled = false; } // Ensure it's off
            });
            // Optionally play a specific 'ping' sound for indestructible hits
            // Sound.play('se_indestructible_hit');
            return; // No HP reduction
        }

        this.hp -= amount;

        if (this.hp <= 0) {
            this.dead();
        } else {
            // Standard hit flash
            this.character.tint = 0xFF0000;
            TweenMax.to(this.character, 0.1, {
                tint: 0xFFFFFF, // Back to white
                delay: 0.1
            });
        }
    }

    dead() {
        if (this.deadFlg || this.hp === Infinity || this.hp === 'infinity') return; // Already dead or indestructible

        this.deadFlg = true;
        this.shootFlg = false; // Stop shooting
        Utils.dlog(`Enemy ${this.name} [ID:${this.id}] dead, emitting DEAD event.`);
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD, this); // Notify manager, pass self

        if (this.unit) this.unit.visible = false;        // Hide unit (prevents collision detection)
        if (this.character) this.character.visible = false; // Hide main sprite
        if (this.shadow) this.shadow.visible = false;    // Hide shadow

        if (this.explosion) {
            // *** LOGGING before showing explosion ***
            Utils.dlog(`Enemy ${this.name} [ID:${this.id}] triggering explosion. Explosion object exists: ${!!this.explosion}, Current visibility: ${this.explosion.visible}`);
            this.explosion.visible = true;
            this.explosion.x = 0; // Relative to container center
            this.explosion.y = 0;
            this.explosion.onComplete = () => this.explosionComplete();
            this.explosion.gotoAndPlay(0);
            Sound.stop('se_damage'); // Stop damage sound if playing
            Sound.play('se_explosion');
        } else {
            // If no explosion, complete immediately
            Utils.dlog(`Enemy ${this.name} [ID:${this.id}] has no explosion sprite.`);
            this.explosionComplete();
        }
    }

    explosionComplete() {
        Utils.dlog(`Enemy ${this.name} [ID:${this.id}] explosion complete, emitting DEAD_COMPLETE event.`);
        if (this.explosion) this.explosion.visible = false;
        this.visible = false; // Hide the whole container after explosion (or let manager remove)
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, this); // Notify manager
    }

    // Item Drop Logic (Called by GameScene upon CUSTOM_EVENT_DEAD)
    dropItem() {
        // Use the processed itemTextureFrames stored during construction
        Utils.dlog(`Enemy ${this.name} dropItem: itemName=${this.itemName}, textureFrames exists=${!!this.itemTextureFrames}, frameCount=${this.itemTextureFrames?.length}`);
        if (this.itemName && this.itemTextureFrames && this.itemTextureFrames.length > 0) {
            const item = new AnimatedItem(this.itemTextureFrames, this.itemName);
            item.x = this.x;
            item.y = this.y;
            Utils.dlog(`Creating item ${item.itemName} at (${item.x.toFixed(1)}, ${item.y.toFixed(1)})`);
            return item; // Return the item for the scene to add
        }
        Utils.dlog(`No item dropped for ${this.name}.`);
        return null;
    }

    // Override destroy for thorough cleanup
    destroy(options) {
        Utils.dlog(`Enemy ${this.name} [ID:${this.id}] destroy called.`);
        if (this.whiteFilter) this.whiteFilter = null; // Remove filter reference
        this.filters = null;
        // Stop any running tweens targeting this enemy
        if (this.character) TweenMax.killTweensOf(this.character);
        // BaseUnit destroy will handle sprites
        super.destroy(options);
    }
}