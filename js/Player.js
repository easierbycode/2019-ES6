// Player.js (Original 'M')
import { BaseUnit } from './BaseUnit.js';
import { Bullet } from './Bullet.js';
import * as Constants from './constants.js';
// Import specific constants from constants.js
import { SHOOT_MODES, SHOOT_SPEEDS } from './constants.js';
import { gameState } from './gameState.js';
import * as Sound from './soundManager.js';
import * as Utils from './utils.js'; // Ensure Utils is imported


// export class Player extends BaseUnit {
//     // Define static events at the top of the class
//     static CUSTOM_EVENT_BULLET_ADD = "playerBulletAdd";

//     constructor(data) {
//         // --- Texture Pre-processing Helper ---
//         const processTextureArray = (textureInput) => {
//             if (!Array.isArray(textureInput)) return []; // Return empty if not array
//             return textureInput.map(item => {
//                 if (item instanceof PIXI.Texture) {
//                     // Already a texture, ensure scale mode and return if valid
//                     item.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
//                     return item !== PIXI.Texture.EMPTY ? item : null;
//                 }
//                 if (typeof item === 'string') {
//                     // Assume item is an alias in loaded resources or a path
//                     // Using PIXI.Texture.from handles both cases (cache check first)
//                     const texture = PIXI.Texture.from(item);
//                     if (texture && texture !== PIXI.Texture.EMPTY) {
//                         texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
//                         return texture;
//                     } else {
//                         console.warn(`Player.processTextureArray: Could not create/find texture from string: ${item}`);
//                         return null;
//                     }
//                 }
//                 // Log other invalid types
//                 console.warn("Player.processTextureArray: Invalid item in texture array:", item);
//                 return null;
//             }).filter(t => t !== null); // Filter out nulls (invalid items or EMPTY textures)
//         };
//         // --- End Helper ---

//         // Process base player texture array (likely strings)
//         const playerFrames = processTextureArray(data.texture);

//         // Use already processed textures for explosion, hit, guard if passed by GameScene
//         // Assume data.explosion, data.hit, data.guard might be pre-processed PIXI.Texture arrays
//         const explosionFrames = Array.isArray(data.explosion) ? data.explosion.filter(t => t instanceof PIXI.Texture && t !== PIXI.Texture.EMPTY) : null;
//         const hitFrames = Array.isArray(data.hit) ? data.hit.filter(t => t instanceof PIXI.Texture && t !== PIXI.Texture.EMPTY) : null;
//         const guardFrames = Array.isArray(data.guard) ? data.guard.filter(t => t instanceof PIXI.Texture && t !== PIXI.Texture.EMPTY) : null;

//         // Add safety check for playerFrames before calling super
//         if (playerFrames.length === 0) {
//             console.error("Player animation frames failed to load or process! Using fallback.");
//             // Use fallback texture array for super call
//             super([PIXI.Texture.EMPTY], explosionFrames);
//         } else {
//             super(playerFrames, explosionFrames);
//         }

//         // --- Player Specific Data ---
//         this.unit.name = data.name;
//         this.maxHp = data.maxHp;
//         this.hp = data.hp; // Set initial HP
//         this._percent = this.hp / this.maxHp; // Use internal var for getter/setter

//         // --- Bullet Data ---
//         // Process ONLY the bullet textures here, use pre-processed hit/guard frames
//         this.shootNormalData = {
//             ...(data.shootNormal || {}),
//             texture: processTextureArray(data.shootNormal?.texture), // Process potential strings
//             explosion: hitFrames, // Assume already textures
//             guard: guardFrames    // Assume already textures
//         };
//         this.shootBigData = {
//             ...(data.shootBig || {}),
//             texture: processTextureArray(data.shootBig?.texture), // Process potential strings
//             explosion: hitFrames, // Assume already textures
//             guard: guardFrames    // Assume already textures
//         };
//         this.shoot3wayData = {
//             ...(data.shoot3way || {}),
//             texture: this.shootNormalData.texture, // Use already processed normal textures
//             explosion: hitFrames, // Assume already textures
//             guard: guardFrames    // Assume already textures
//         };

//         // --- Barrier ---
//         // Process barrier frames (likely strings)
//         this.barrierFrames = processTextureArray(data.barrier?.texture);

//         // Handle single barrier effect texture string or pre-processed texture
//         this.barrierEffectTexture = null;
//         if (typeof data.barrierEffectTexture === 'string') {
//             this.barrierEffectTexture = PIXI.Texture.from(data.barrierEffectTexture);
//             if (!this.barrierEffectTexture || this.barrierEffectTexture === PIXI.Texture.EMPTY) {
//                 console.warn(`Could not load barrierEffectTexture: ${data.barrierEffectTexture}`);
//                 this.barrierEffectTexture = null;
//             }
//         } else if (data.barrierEffectTexture instanceof PIXI.Texture && data.barrierEffectTexture !== PIXI.Texture.EMPTY) {
//             this.barrierEffectTexture = data.barrierEffectTexture; // Assume pre-processed
//         }

//         // Create Barrier AnimatedSprite
//         if (this.barrierFrames && this.barrierFrames.length > 0) {
//             this.barrier = new PIXI.extras.AnimatedSprite(this.barrierFrames);
//             this.barrier.animationSpeed = 0.15;
//             this.barrier.anchor.set(0.5);
//             // Ensure width/height are available before setting hitArea
//             if (this.barrier.width > 0 && this.barrier.height > 0) {
//                 this.barrier.hitArea = new PIXI.Rectangle(-this.barrier.width / 2 + 2, -this.barrier.height / 2 + 2, this.barrier.width - 4, this.barrier.height - 4); // Centered hit area
//             } else {
//                 console.warn("Barrier created with zero dimensions, hitArea might be inaccurate.");
//                 this.barrier.hitArea = new PIXI.Rectangle(0, 0, 0, 0);
//             }
//             this.barrier.interactive = false;
//             this.barrier.visible = false;
//             this.addChild(this.barrier); // Add barrier to player container
//         } else {
//             this.barrier = null; // Ensure null if frames missing
//         }

//         // Create Barrier Effect Sprite
//         if (this.barrierEffectTexture) {
//             this.barrierEffect = new PIXI.Sprite(this.barrierEffectTexture);
//             this.barrierEffect.anchor.set(0.5);
//             this.barrierEffect.visible = false;
//             this.addChild(this.barrierEffect); // Add effect to player container
//         } else {
//             this.barrierEffect = null; // Ensure null if texture missing
//         }

//         // --- State & Control ---
//         this.shootOn = false; // Renamed from shootOn = 0/1
//         this.bulletList = []; // Managed by the scene, player only creates them
//         // *** REMOVED: timeAccumulatorShoot ***
//         this.bulletFrameCnt = 0; // *** ADDED: Frame counter for shooting ***
//         this.bulletIdCnt = 0;
//         this.shootSpeedBoost = 0; // Boost amount (in frames to subtract from interval)
//         this.shootIntervalBase = 0; // Base interval (in frames)
//         // *** REMOVED: shootIntervalSeconds ***
//         this.shootData = {}; // Current bullet data
//         this.shootMode = SHOOT_MODES.NORMAL;

//         this.unitX = Constants.GAME_DIMENSIONS.CENTER_X; // Target X position
//         this.unitY = Constants.GAME_DIMENSIONS.HEIGHT - (this.character?.height || 50) - 30; // Target Y

//         this.character.animationSpeed = 0.35;
//         this.shadow.animationSpeed = 0.35;
//         this.shadowOffsetY = 5;

//         this.damageAnimationFlg = false;
//         this.barrierFlg = false;
//         this.screenDragFlg = false;
//         this.keyDownFlg = false;
//         this.keyDownCode = null; // Initialize to null

//         // --- Input Area ---
//         // Input is handled by the GameScene's inputLayer and key listeners
//         this.dragAreaRect = null; // Not used by Player directly

//         // --- Event Listeners (Bound in constructor for consistent reference) ---
//         this.keyDownListener = this.onKeyDown.bind(this);
//         this.keyUpListener = this.onKeyUp.bind(this);
//         this._listenersAttached = false; // Flag to track listener state

//         // Adjust hitArea based on actual sprite size
//         this.unit.hitArea = new PIXI.Rectangle(
//             -this.character.width / 2 + 7, // Adjust x based on anchor
//             -this.character.height / 2 + 20, // Adjust y based on anchor
//             this.character.width - 14,
//             this.character.height - 40
//         );

//         // *** LOGGING HitArea ***
//         Utils.dlog(`Player HitArea set to: x:${this.unit.hitArea.x.toFixed(1)}, y:${this.unit.hitArea.y.toFixed(1)}, w:${this.unit.hitArea.width.toFixed(1)}, h:${this.unit.hitArea.height.toFixed(1)}`);
//         // *** END LOGGING ***

//         this.updateShootData(); // Initialize shoot data
//         this.updateShadowPosition(); // Set initial shadow position
//     }

//     // --- Getters/Setters ---
//     get percent() {
//         return this._percent;
//     }
//     // Setter not strictly needed if only updated internally via onDamage
//     // set percent(value) { this._percent = value; }

//     // --- Input Handling ---
//     // These should be attached/detached by the scene managing the player
//     attachInputListeners() {
//         if (this._listenersAttached || typeof document === 'undefined') return; // Don't attach multiple times or if document missing
//         Utils.dlog("Attaching Player keyboard listeners."); // LOGGING
//         document.addEventListener("keydown", this.keyDownListener);
//         document.addEventListener("keyup", this.keyUpListener);
//         this._listenersAttached = true;
//     }

//     detachInputListeners() {
//         if (!this._listenersAttached || typeof document === 'undefined') return; // Don't detach if not attached or document missing
//         Utils.dlog("Detaching Player keyboard listeners."); // LOGGING
//         document.removeEventListener("keydown", this.keyDownListener);
//         document.removeEventListener("keyup", this.keyUpListener);
//         this._listenersAttached = false;
//     }

//     // Pointer events should be handled by the scene's input layer
//     onScreenDragStart(event) {
//         Utils.dlog("Player onScreenDragStart"); // LOGGING
//         this.screenDragFlg = true;
//         this.updateTargetX(event.data.global.x);
//     }

//     onScreenDragMove(event) {
//         // Utils.dlog("Player onScreenDragMove"); // LOGGING (too noisy)
//         if (this.screenDragFlg) {
//             this.updateTargetX(event.data.global.x);
//         }
//     }

//     onScreenDragEnd(event) {
//         Utils.dlog("Player onScreenDragEnd"); // LOGGING
//         this.screenDragFlg = false;
//     }

//     onKeyDown(event) {
//         Utils.dlog(`Player onKeyDown: ${event.keyCode}`); // LOGGING
//         this.keyDownFlg = true;
//         this.keyDownCode = event.keyCode;
//         event.preventDefault();
//     }

//     onKeyUp(event) {
//         Utils.dlog(`Player onKeyUp: ${event.keyCode}`); // LOGGING
//         this.keyDownFlg = false;
//         this.keyDownCode = null; // Clear key code on release
//         event.preventDefault();
//     }

//     updateTargetX(globalX) {
//         const halfHitboxWidth = this.unit.hitArea.width / 2;
//         // Adjust target based on the object's center relative to its parent container
//         let parentX = this.parent?.x || 0;
//         let target = globalX - parentX;

//         // Clamp target based on sprite center and hit area
//         const minAllowedX = halfHitboxWidth + this.unit.hitArea.x; // Left boundary for center
//         const maxAllowedX = Constants.GAME_DIMENSIONS.WIDTH - (halfHitboxWidth - this.unit.hitArea.x); // Right boundary for center
//         target = Math.max(minAllowedX, target);
//         target = Math.min(maxAllowedX, target);
//         this.unitX = target;
//         // Utils.dlog(`Player updateTargetX: globalX=${globalX.toFixed(1)}, target=${target.toFixed(1)}`); // LOGGING (too noisy)
//     }

//     // --- Game Loop ---
//     loop(delta) {
//         if (this.deadFlg) return;

//         // Convert delta (likely fraction of 1/60s) to seconds
//         const deltaSeconds = delta / 60.0;
//         const moveSpeedFactor = deltaSeconds * Constants.FPS; // Factor for frame-based speeds

//         // --- Movement ---
//         if (this.keyDownFlg && this.keyDownCode !== null) { // Check if code is set
//             const moveSpeed = 6 * moveSpeedFactor; // Speed adjusted for game FPS
//             switch (this.keyDownCode) {
//                 case 37: // Left Arrow
//                     this.unitX -= moveSpeed;
//                     break;
//                 case 39: // Right Arrow
//                     this.unitX += moveSpeed;
//                     break;
//             }
//             // Clamp position based on center and hitArea width
//             const halfHitboxWidth = this.unit.hitArea.width / 2;
//             const minAllowedX = halfHitboxWidth + this.unit.hitArea.x; // Left boundary for center
//             const maxAllowedX = Constants.GAME_DIMENSIONS.WIDTH - (halfHitboxWidth - this.unit.hitArea.x); // Right boundary for center
//             this.unitX = Math.max(minAllowedX, this.unitX);
//             this.unitX = Math.min(maxAllowedX, this.unitX);
//         }

//         // Smooth movement towards target using lerp (linear interpolation)
//         // Adjust lerp factor based on delta for smoother movement independent of frame rate
//         const lerpFactor = 1 - Math.pow(0.1, deltaSeconds * 60); // Adjusted for 60fps base
//         const diffX = this.unitX - this.x;
//         if (Math.abs(diffX) > 0.1) { // Only move if there's a noticeable difference
//             this.x += diffX * lerpFactor;
//         } else {
//             this.x = this.unitX; // Snap to target if close enough
//         }

//         // Keep Y position fixed (or handle separately if needed)
//         this.y = this.unitY;


//         // Update barrier position relative to the player's current position
//         if (this.barrier && this.barrier.visible) {
//             this.barrier.x = 0; // Relative to player center because of anchor
//             this.barrier.y = -this.character.height / 2 + this.barrier.height / 2 - 15; // Adjust based on anchors
//         }

//         this.updateShadowPosition(); // Update shadow position based on character

//         // --- Shooting (Frame-based) ---
//         this.bulletFrameCnt++; // Increment frame counter
//         const shootInterval = this.shootIntervalBase - this.shootSpeedBoost;
//         if (shootInterval <= 0) { // Prevent division by zero or negative interval
//             Utils.dlog("Warning: Player shoot interval is zero or negative, shooting every frame.");
//             if (this.shootOn) this.shoot();
//         } else if (this.shootOn && this.bulletFrameCnt % shootInterval === 0) {
//             this.shoot();
//         }

//         for (var t = 0; t < this.bulletList.length; t++) {
//             var e = this.bulletList[t];
//             e.unit.x += 3.5 * Math.cos(e.unit.rotation),
//                 e.unit.y += 3.5 * Math.sin(e.unit.rotation),
//                 (e.unit.y <= 40 || e.unit.x <= -e.unit.width || e.unit.x >= i.GAME_WIDTH) && (this.bulletRemove(e),
//                     this.bulletRemoveComplete(e))
//         }
//     }

//     bulletRemove(t) {
//         for (var e = 0; e < this.bulletList.length; e++)
//             t.id == this.bulletList[e].id && this.bulletList.splice(e, 1)
//     }

//     bulletRemoveComplete(t) {
//         this.removeChild(t)
//     }

//     // Override BaseUnit's updateShadowPosition if Player's shadow behaves differently
//     updateShadowPosition() {
//         // Ensure character and shadow exist
//         if (!this.character || !this.shadow) return;

//         if (this.shadowReverse) {
//             this.shadow.scale.y = -1;
//             // Adjust based on anchor (0.5)
//             this.shadow.y = this.character.height / 2 + this.shadow.height / 2 - this.shadowOffsetY;
//         } else {
//             this.shadow.scale.y = 1;
//             // Adjust based on anchor (0.5)
//             this.shadow.y = this.character.height / 2 + this.shadow.height / 2 - this.shadowOffsetY;
//         }
//         this.shadow.x = 0; // Keep X aligned due to anchor 0.5
//     }


//     // --- Shooting Logic ---
//     shoot() {
//         let bulletsData = [];
//         const rotationRad = -90 * Math.PI / 180; // -90 degrees for upwards
//         // const rotationRad = 270 * Math.PI / 180; // 270 degrees for upwards

//         switch (this.shootMode) {
//             case SHOOT_MODES.NORMAL: {
//                 const data = { ...this.shootNormalData }; // Clone data
//                 data.id = this.bulletIdCnt++;
//                 data.rotation = rotationRad;
//                 // Position relative to player center, adjusted for bullet size
//                 data.startX = 0 + Math.cos(rotationRad + Math.PI / 2) * 5 + 14 - this.character.width / 2;
//                 data.startY = 0 + Math.sin(rotationRad + Math.PI / 2) * 5 + 11 - this.character.height / 2;
//                 bulletsData.push(data);
//                 Sound.stop('se_shoot');
//                 Sound.play('se_shoot');
//                 break;
//             }
//             case SHOOT_MODES.BIG: {
//                 const data = { ...this.shootBigData };
//                 data.id = this.bulletIdCnt++;
//                 data.rotation = rotationRad;
//                 data.startX = 0 + Math.cos(rotationRad + Math.PI / 2) * 5 + 10 - this.character.width / 2;
//                 data.startY = 0 + Math.sin(rotationRad + Math.PI / 2) * 5 + 22 - this.character.height / 2;
//                 bulletsData.push(data);
//                 Sound.stop('se_shoot_b');
//                 Sound.play('se_shoot_b');
//                 break;
//             }
//             case SHOOT_MODES.THREE_WAY: {
//                 const angles = [-100, -90, -80]; // Degrees relative to horizontal
//                 const offsets = [
//                     { x: 6, y: 11 },
//                     { x: 10, y: 11 },
//                     { x: 14, y: 11 }
//                 ];
//                 angles.forEach((angle, index) => {
//                     const angleRad = angle * Math.PI / 180;
//                     const data = { ...this.shoot3wayData };
//                     data.id = this.bulletIdCnt++;
//                     data.rotation = angleRad;

//                     // Adjust start position based on angle and offset
//                     data.startX = 0 + Math.cos(angleRad + Math.PI / 2) * 5 + offsets[index].x - this.character.width / 2;
//                     data.startY = 0 + Math.sin(angleRad + Math.PI / 2) * 5 + offsets[index].y - this.character.height / 2;
//                     bulletsData.push(data);
//                 });
//                 Sound.stop('se_shoot');
//                 Sound.play('se_shoot');
//                 break;
//             }
//         }

//         // Emit event for the scene to create bullets
//         this.emit(Player.CUSTOM_EVENT_BULLET_ADD, bulletsData);
//     }


//     updateShootData() {
//         switch (this.shootMode) {
//             case SHOOT_MODES.NORMAL:
//                 this.shootData = this.shootNormalData;
//                 break;
//             case SHOOT_MODES.BIG:
//                 this.shootData = this.shootBigData;
//                 break;
//             case SHOOT_MODES.THREE_WAY:
//                 this.shootData = this.shoot3wayData;
//                 break;
//             default: // Fallback to normal if mode is invalid
//                 Utils.dlog(`Invalid shootMode '${this.shootMode}', defaulting to NORMAL.`); // LOGGING
//                 this.shootMode = SHOOT_MODES.NORMAL;
//                 this.shootData = this.shootNormalData;
//                 break;
//         }
//         // Use a slightly higher default interval (in frames)
//         this.shootIntervalBase = this.shootData?.interval || 30;
//         // Recalculate interval in seconds whenever base or boost changes
//         // ** REMOVED shootIntervalSeconds calculation **
//         Utils.dlog(`Player shoot data updated: Mode=${this.shootMode}, Base Interval=${this.shootIntervalBase} frames`); // LOGGING
//     }

//     shootModeChange(newMode) {
//         if (this.shootMode === newMode) return; // No change
//         this.shootMode = newMode;
//         this.updateShootData();
//         Sound.play('g_powerup_voice');
//     }

//     shootSpeedChange(newSpeedMode) {
//         let newBoost = 0;
//         switch (newSpeedMode) {
//             case SHOOT_SPEEDS.NORMAL:
//                 newBoost = 0;
//                 break;
//             case SHOOT_SPEEDS.HIGH:
//                 newBoost = 15; // Value from original code (frame boost)
//                 break;
//         }
//         if (this.shootSpeedBoost === newBoost) return; // No change
//         this.shootSpeedBoost = newBoost;
//         this.updateShootData(); // Recalculate interval in seconds
//         Sound.play('g_powerup_voice');
//     }

//     // --- Setup & State Management ---
//     setUp(hp, shootMode, shootSpeedMode) {
//         this.maxHp = gameState.playerMaxHp; // Use gameState maxHp
//         this.hp = hp;
//         this._percent = this.hp / this.maxHp;
//         this.shootMode = shootMode;
//         this.shootModeChange(shootMode); // Apply mode change logic
//         this.shootSpeedChange(shootSpeedMode); // Apply speed change logic
//         this.deadFlg = false;
//         this.damageAnimationFlg = false;
//         this.character.tint = 0xFFFFFF; // Reset tint
//         this.character.alpha = 1;
//         this.unit.visible = true; // Ensure unit is visible
//         this.attachInputListeners(); // Ensure listeners are attached on setup
//         this.bulletFrameCnt = 0; // Reset shoot timer
//         Utils.dlog(`Player setUp: HP=${this.hp}, Mode=${this.shootMode}, Speed=${shootSpeedMode}`); // LOGGING
//     }

//     shootStop() {
//         this.shootOn = false;
//         Utils.dlog("Player shootStop"); // LOGGING
//     }

//     shootStart() {
//         this.shootOn = true;
//         this.bulletFrameCnt = 0; // Reset timer when starting
//         Utils.dlog("Player shootStart"); // LOGGING
//     }

//     // --- Barrier Logic ---
//     barrierStart() {
//         if (!this.barrier || this.barrierFlg) return; // No barrier sprite or already active

//         Sound.play('se_barrier_start');
//         this.barrierFlg = true;
//         this.barrier.alpha = 0;
//         this.barrier.visible = true;
//         this.barrier.play?.(); // Ensure animation plays if it's AnimatedSprite

//         if (this.barrierEffect) {
//             this.barrierEffect.x = 0; // Position relative to player center
//             this.barrierEffect.y = -this.character.height / 2 + this.barrier.height / 2 - 15;
//             this.barrierEffect.alpha = 1;
//             this.barrierEffect.visible = true;
//             this.barrierEffect.scale.set(0.5);
//             TweenMax.to(this.barrierEffect.scale, 0.4, { x: 1, y: 1, ease: Quint.easeOut });
//             TweenMax.to(this.barrierEffect, 0.5, { alpha: 0 });
//         }

//         // Kill previous timeline if exists
//         if (this.barrierTimeline) {
//             this.barrierTimeline.kill();
//         }

//         // Original timeline values from app_formatted.js
//         this.barrierTimeline = new TimelineMax({
//             onComplete: () => {
//                 if (this.barrier) this.barrier.visible = false;
//                 if (this.barrierEffect) this.barrierEffect.visible = false;
//                 this.barrierFlg = false;
//                 Sound.play('se_barrier_end');
//                 this.barrierTimeline = null; // Clear reference
//             }
//         });

//         this.barrierTimeline
//             .to(this.barrier, 0.3, { alpha: 1 }, "+=0")
//             .call(() => { if (this.barrier) this.barrier.alpha = 0 }, null, "+=4.0")
//             .to(this.barrier, 1, { alpha: 1 }, "+=0")
//             .call(() => { if (this.barrier) this.barrier.alpha = 0 }, null, "+=1")
//             .to(this.barrier, 1, { alpha: 1 }, "+=0")
//             .call(() => { if (this.barrier) this.barrier.alpha = 0 }, null, "+=0.5")
//             .to(this.barrier, 0.5, { alpha: 1 }, "+=0")
//             .call(() => { if (this.barrier) this.barrier.alpha = 0 }, null, "+=0.5")
//             .to(this.barrier, 0.5, { alpha: 1 }, "+=0")
//             .call(() => { if (this.barrier) this.barrier.alpha = 0 }, null, "+=0.1")
//             .call(() => { if (this.barrier) this.barrier.alpha = 1 }, null, "+=0.1")
//             .call(() => { if (this.barrier) this.barrier.alpha = 0 }, null, "+=0.1")
//             .call(() => { if (this.barrier) this.barrier.alpha = 1 }, null, "+=0.1")
//             .call(() => { if (this.barrier) this.barrier.alpha = 0 }, null, "+=0.1")
//             .call(() => { if (this.barrier) this.barrier.alpha = 1 }, null, "+=0.1")
//             .call(() => { if (this.barrier) this.barrier.alpha = 0 }, null, "+=0.1")
//             .call(() => { if (this.barrier) this.barrier.alpha = 1 }, null, "+=0.1")
//             .call(() => { if (this.barrier) this.barrier.alpha = 0 }, null, "+=0.1"); // End of timeline from app_formatted.js
//     }

//     barrierHitEffect() {
//         if (!this.barrier) return;
//         this.barrier.tint = 0xFF0000;
//         TweenMax.to(this.barrier, 0.2, { tint: 0xFFFFFF });
//         Sound.play('se_guard');
//     }

//     // --- Damage & Death ---
//     onDamage(amount) {
//         if (this.barrierFlg || this.damageAnimationFlg || this.deadFlg) {
//             if (this.barrierFlg) this.barrierHitEffect(); // Show barrier hit even if no damage taken
//             return;
//         }
//         Utils.dlog(`Player taking damage: ${amount}`); // LOGGING

//         this.hp -= amount;
//         if (this.hp <= 0) {
//             this.hp = 0;
//         }
//         this._percent = this.hp / this.maxHp;

//         this.damageAnimationFlg = true; // Prevent rapid damage calls

//         if (this.hp <= 0) {
//             this.dead();
//         } else {
//             // Damage animation timeline based on app_formatted.js
//             const initialY = this.y; // Store initial Y if needed, though original didn't move player Y
//             const damageTimeline = new TimelineMax({
//                 onComplete: () => {
//                     this.damageAnimationFlg = false;
//                     // this.y = initialY; // No Y movement in original
//                     if (this.unit) this.unit.alpha = 1; // Ensure alpha is reset
//                     if (this.unit) this.unit.tint = 0xFFFFFF; // Ensure tint is reset
//                 }
//             });
//             damageTimeline
//                 .to(this.unit, 0.15, { delay: 0, tint: 0xFF0000, alpha: 0.2 })
//                 .to(this.unit, 0.15, { delay: 0, tint: 0xFFFFFF, alpha: 1 })
//                 .to(this.unit, 0.15, { delay: 0.05, tint: 0xFF0000, alpha: 0.2 })
//                 .to(this.unit, 0.15, { delay: 0, tint: 0xFFFFFF, alpha: 1 })
//                 .to(this.unit, 0.15, { delay: 0.05, tint: 0xFF0000, alpha: 0.2 })
//                 .to(this.unit, 0.15, { delay: 0, tint: 0xFFFFFF, alpha: 1 })
//                 .to(this.unit, 0.15, { delay: 0.05, tint: 0xFF0000, alpha: 0.2 })
//                 .to(this.unit, 0.15, { delay: 0, tint: 0xFFFFFF, alpha: 1 });

//             Sound.play('g_damage_voice');
//             Sound.play('se_damage');
//         }
//     }

//     dead() {
//         if (this.deadFlg) return;
//         Utils.dlog("Player dead"); // LOGGING
//         this.deadFlg = true;
//         this.emit(BaseUnit.CUSTOM_EVENT_DEAD);
//         this.shootStop();
//         this.detachInputListeners(); // Stop listening to input

//         this.unit.visible = false; // Hide the unit container (character + shadow)
//         if (this.barrier) this.barrier.visible = false; // Hide barrier too

//         if (this.explosion) {
//             this.explosion.visible = true;
//             this.explosion.x = 0; // Position relative to player center
//             this.explosion.y = 0;
//             this.explosion.onComplete = () => this.explosionComplete();
//             this.explosion.gotoAndPlay(0);
//         } else {
//             this.explosionComplete(); // Complete immediately if no explosion
//         }

//         Sound.play('se_explosion');
//         Sound.play('g_continue_no_voice0'); // Assuming this is the death voice
//     }

//     explosionComplete() {
//         Utils.dlog("Player explosionComplete"); // LOGGING
//         if (this.explosion) this.explosion.visible = false;
//         this.emit(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE);
//         // Player object might be removed by the scene later
//     }

//     castAdded() {
//         super.castAdded(); // BaseUnit castAdded
//         Utils.dlog("Player castAdded"); // LOGGING
//         this.attachInputListeners(); // Attach listeners when added
//         this.damageAnimationFlg = false;
//         this.unit.visible = true; // Ensure visibility on add
//         this.character.visible = true; // Ensure character sprite is visible too
//         this.deadFlg = false; // Reset dead flag
//         this.hp = gameState.playerHp || this.maxHp; // Use current gameState HP or maxHP
//         this._percent = this.hp / this.maxHp;
//         this.character.tint = 0xFFFFFF; // Reset tint
//         this.character.alpha = 1;
//         this.shadow.alpha = 0.5; // Reset shadow alpha
//         this.bulletFrameCnt = 0; // Reset shoot timer
//     }

//     castRemoved() {
//         Utils.dlog("Player castRemoved"); // LOGGING
//         this.shootStop();
//         this.detachInputListeners(); // Detach listeners when removed
//         // Kill timelines
//         if (this.barrierTimeline) {
//             this.barrierTimeline.kill();
//             this.barrierTimeline = null;
//         }
//         // Let BaseUnit handle sprite destruction via its destroy method
//         super.castRemoved();
//     }

//     // Override destroy for thorough cleanup
//     destroy(options) {
//         Utils.dlog("Player destroy"); // LOGGING
//         this.detachInputListeners(); // Ensure detached on destroy
//         if (this.barrier) this.barrier.destroy();
//         if (this.barrierEffect) this.barrierEffect.destroy();
//         if (this.barrierTimeline) {
//             this.barrierTimeline.kill();
//             this.barrierTimeline = null;
//         }
//         // dragAreaRect is handled by the scene

//         this.barrier = null;
//         this.barrierEffect = null;
//         this.barrierTimeline = null;
//         this.keyDownListener = null;
//         this.keyUpListener = null;
//         this.bulletList = []; // Clear list

//         // Clear texture references
//         this.shootNormalData = null;
//         this.shootBigData = null;
//         this.shoot3wayData = null;
//         this.barrierFrames = null;
//         this.barrierEffectTexture = null;

//         super.destroy(options); // Call BaseUnit destroy
//     }
// }

export class Player extends BaseUnit {
    constructor(data) {
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
        if (typeof document !== 'undefined') {
            document.addEventListener("keydown", this.keyDownListener);
            document.addEventListener("keyup", this.keyUpListener);
        }
    }

    detachInputListeners() {
        if (typeof document !== 'undefined') {
            document.removeEventListener("keydown", this.keyDownListener);
            document.removeEventListener("keyup", this.keyUpListener);
        }
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
         const lerpFactor = 0.09 * delta * 60; // Adjust lerp factor based on delta
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
         switch (this.shootMode) {
             case SHOOT_MODES.NORMAL: {
                 const bullet = new Bullet(this.shootNormalData);
                 bullet.unit.rotation = 270 * Math.PI / 180; // Rotation for movement and visual (matches app_formatted.js)
                 bullet.unit.x = this.unit.x + 5 * Math.sin(bullet.unit.rotation) + 14;
                 bullet.unit.y = this.unit.y + 5 * Math.sin(bullet.unit.rotation) + 11;
                 bullet.name = SHOOT_MODES.NORMAL;
                 bullet.id = this.bulletIdCnt++;
                 bullet.shadowReverse = false;
                 bullet.shadowOffsetY = 0;
                 bullet.on(BaseUnit.CUSTOM_EVENT_DEAD, this.bulletRemove.bind(this, bullet));
                 bullet.on(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, this.bulletRemoveComplete.bind(this, bullet));
                 this.addChild(bullet);
                 this.bulletList.push(bullet);
                 Sound.stop('se_shoot');
                 Sound.play('se_shoot');
                 break;
             }
             case SHOOT_MODES.BIG: {
                 const bullet = new Bullet(this.shootBigData);
                 bullet.unit.rotation = 270 * Math.PI / 180; // Rotation for movement and visual (matches app_formatted.js)
                 bullet.unit.x = this.unit.x + 5 * Math.sin(bullet.unit.rotation) + 10;
                 bullet.unit.y = this.unit.y + 5 * Math.sin(bullet.unit.rotation) + 22;
                 bullet.name = SHOOT_MODES.BIG;
                 bullet.id = this.bulletIdCnt++;
                 bullet.shadowReverse = false;
                 bullet.shadowOffsetY = 0;
                 bullet.on(BaseUnit.CUSTOM_EVENT_DEAD, this.bulletRemove.bind(this, bullet));
                 bullet.on(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, this.bulletRemoveComplete.bind(this, bullet));
                 this.addChild(bullet);
                 this.bulletList.push(bullet);
                 Sound.stop('se_shoot_b');
                 Sound.play('se_shoot_b');
                 break;
             }
             case SHOOT_MODES.THREE_WAY: {
                 for (let i = 0; i < 3; i++) {
                     const bullet = new Bullet(this.shoot3wayData);
                     if (i === 0) {
                         bullet.unit.rotation = 280 * Math.PI / 180;
                         bullet.unit.x = this.unit.x + 5 * Math.cos(bullet.unit.rotation) + 14;
                         bullet.unit.y = this.unit.y + 5 * Math.sin(bullet.unit.rotation) + 11;
                     } else if (i === 1) {
                         bullet.unit.rotation = 270 * Math.PI / 180;
                         bullet.unit.x = this.unit.x + 5 * Math.cos(bullet.unit.rotation) + 10;
                         bullet.unit.y = this.unit.y + 5 * Math.sin(bullet.unit.rotation) + 11;
                     } else if (i === 2) {
                         bullet.unit.rotation = 260 * Math.PI / 180;
                         bullet.unit.x = this.unit.x + 5 * Math.cos(bullet.unit.rotation) + 6;
                         bullet.unit.y = this.unit.y + 5 * Math.sin(bullet.unit.rotation) + 11;
                     }
                     bullet.id = this.bulletIdCnt++;
                     bullet.shadowReverse = false;
                     bullet.shadowOffsetY = 0;
                     bullet.on(BaseUnit.CUSTOM_EVENT_DEAD, this.bulletRemove.bind(this, bullet));
                     bullet.on(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, this.bulletRemoveComplete.bind(this, bullet));
                     this.addChild(bullet);
                     this.bulletList.push(bullet);
                 }
                 Sound.stop('se_shoot');
                 Sound.play('se_shoot');
                 break;
             }
         }
    }

    bulletRemove(bullet) {
        for (let i = 0; i < this.bulletList.length; i++) {
            if (bullet.id === this.bulletList[i].id) {
                this.bulletList.splice(i, 1);
                break;
            }
        }
    }

    bulletRemoveComplete(bullet) {
        this.removeChild(bullet);
    }

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