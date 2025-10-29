// GameScene.js (Original 'Ki')
import { BaseScene } from './BaseScene.js';
import * as Constants from './constants.js';
import { gameState, saveHighScore } from './gameState.js';
import { globals } from './globals.js';
import * as Utils from './utils.js';
import * as Sound from './soundManager.js';
import { SHOOT_MODES, SHOOT_SPEEDS, ITEM_TYPES } from './constants.js';
import { Enemy } from './Enemy.js';
import { Bullet } from './Bullet.js';
import { AnimatedItem } from './AnimatedItem.js';
import { Player } from './Player.js';
// Import Boss classes
import { Boss } from './bosses/Boss.js'; // Assuming a base Boss class exists
import { BossBison } from './bosses/BossBison.js';
import { BossBarlog } from './bosses/BossBarlog.js';
import { BossSagat } from './bosses/BossSagat.js';
import { BossVega } from './bosses/BossVega.js';
import { BossGoki } from './bosses/BossGoki.js';
import { BossFang } from './bosses/BossFang.js';
// Import UI
import { HUD } from './ui/HUD.js';
import { GameTitle } from './ui/GameTitle.js'; // Renamed from Oi
import { CutinContainer } from './ui/CutinContainer.js';
import { StageBackground } from './ui/StageBackground.js';
import { BigNumberDisplay } from './ui/BigNumberDisplay.js'; // For boss timer
// Import Next Scenes
import { AdvScene } from './AdvScene.js';
import { ContinueScene } from './ContinueScene.js';


// export class GameScene extends BaseScene {
//     constructor() {
//         super(Constants.SCENE_NAMES.GAME);

//         // Game State
//         this.waveInterval = 80; // Frames between waves
//         this.waveCount = 0;
//         this.frameCnt = 0; // Counter for wave timing
//         this.stageScrollSpeed = 0.7; // Renamed from stageBgAmountMove
//         this.enemyWaveFlg = false;
//         this.theWorldFlg = false; // CA or special event freeze flag
//         this.sceneSwitch = 0; // 0 = continue/gameover, 1 = next stage

//         // Initialize properties to null or default values
//         this.player = null;
//         this.hud = null;
//         this.stageBg = null;
//         this.titleOverlay = null;
//         this.cutinCont = null;
//         this.cover = null;
//         this.boss = null;
//         this.bossTimerDisplay = null;
//         this.bossTimerText = null;
//         this.bossTimerCountDown = 99;
//         this.bossTimeAccumulator = 0; // Accumulator for boss timer (seconds)
//         this.bossTimerStartFlg = false;
//         this.caLine = null;
//         this.inputLayer = null;

//         // Containers - Define layering order here
//         this.backgroundContainer = new PIXI.Container(); // Layer 0: Backgrounds
//         this.backgroundContainer.name = "BackgroundContainer";
//         this.unitContainer = new PIXI.Container();       // Layer 1: Player, Enemies, Items
//         this.unitContainer.name = "UnitContainer";
//         this.bulletContainer = new PIXI.Container();     // Layer 2: Player Bullets, Enemy Bullets
//         this.bulletContainer.name = "BulletContainer";
//         this.inputContainer = new PIXI.Container();      // Layer 3: Input layer (blocks clicks to units/bullets)
//         this.inputContainer.name = "InputContainer";
//         this.hudContainer = new PIXI.Container();        // Layer 4: HUD elements
//         this.hudContainer.name = "HUDContainer";
//         this.overlayContainer = new PIXI.Container();    // Layer 5: Title Overlays, CA effects, Popups
//         this.overlayContainer.name = "OverlayContainer";

//         // Add containers in the correct Z-order
//         this.addChild(this.backgroundContainer);
//         this.addChild(this.unitContainer);
//         this.addChild(this.bulletContainer);
//         this.addChild(this.inputContainer); // Add input container
//         this.addChild(this.hudContainer);
//         this.addChild(this.overlayContainer);

//         // Entity Lists
//         this.enemies = [];
//         this.items = [];
//         this.playerBullets = [];
//         this.enemyBullets = [];

//         this.stageEnemyPositionList = [];
//         this.stageBgmName = '';

//         // Textures will be processed in run()
//         this.explosionTextures = null;
//         this.caExplosionTextures = null;
//         this.itemTextures = null;
//         this.stageBgTextures = null;

//         // Bound listener functions
//         this._onPointerDown = this._onPointerDown.bind(this);
//         this._onPointerMove = this._onPointerMove.bind(this);
//         this._onPointerUp = this._onPointerUp.bind(this);
//         this._onPointerUpOutside = this._onPointerUpOutside.bind(this);
//     }

//     // Helper to process frames safely using PIXI.loader.resources
//     processFrames(baseName, count) {
//         const frames = [];
//         const gameAsset = PIXI.loader && PIXI.loader.resources && PIXI.loader.resources.game_asset; // Access loader directly

//         if (!gameAsset || !gameAsset.textures) {
//             console.error(`GameScene.processFrames: 'game_asset' resource not found or missing textures.`);
//             return []; // Return empty array if resource missing
//         }

//         for (let i = 0; i < count; i++) {
//             const textureKey = `${baseName}${i}.gif`;
//             const texture = gameAsset.textures[textureKey];
//             if (texture && texture !== PIXI.Texture.EMPTY) {
//                 frames.push(texture);
//             } else {
//                 Utils.dlog(`GameScene.processFrames: Texture not found or invalid: ${textureKey}`);
//             }
//         }
//         return frames;
//     }

//     run() {
//         Utils.dlog("GameScene Run - Stage:", gameState.stageId);

//         // *** Ensure containers are visible ***
//         this.backgroundContainer.visible = true;
//         this.unitContainer.visible = true;
//         this.bulletContainer.visible = true;
//         this.inputContainer.visible = true; // Ensure input container itself is visible
//         this.hudContainer.visible = true;
//         this.overlayContainer.visible = true;
//         Utils.dlog(`Container visibility - BG: ${this.backgroundContainer.visible}, Unit: ${this.unitContainer.visible}, Bullet: ${this.bulletContainer.visible}, Input: ${this.inputContainer.visible}, HUD: ${this.hudContainer.visible}, Overlay: ${this.overlayContainer.visible}`);

//         // --- Process Textures (Now that resources are loaded) ---
//         this.explosionTextures = this.processFrames("explosion0", 7);
//         this.caExplosionTextures = this.processFrames("caExplosion0", 8);
//         this.itemTextures = {
//             [SHOOT_MODES.BIG]: this.processFrames("powerupBig", 2),
//             [SHOOT_MODES.THREE_WAY]: this.processFrames("powerup3way", 2),
//             [ITEM_TYPES.BARRIER]: this.processFrames("barrierItem", 2),
//             [SHOOT_SPEEDS.HIGH]: this.processFrames("speedupItem", 2),
//         };
//         this.stageBgTextures = [];
//         for (let i = 0; i < 5; i++) { // Assuming 5 stages max
//             const endTextureResource = PIXI.loader?.resources?.[`stage_end${i}`];
//             const loopTextureResource = PIXI.loader?.resources?.[`stage_loop${i}`];
//             const endTexture = endTextureResource ? endTextureResource.texture : null;
//             const loopTexture = loopTextureResource ? loopTextureResource.texture : null;
//             // Ensure textures are valid PIXI.Texture objects before adding
//             const validEndTexture = (endTexture instanceof PIXI.Texture && endTexture !== PIXI.Texture.EMPTY) ? endTexture : null;
//             const validLoopTexture = (loopTexture instanceof PIXI.Texture && loopTexture !== PIXI.Texture.EMPTY) ? loopTexture : null;
//             this.stageBgTextures.push([validEndTexture, validLoopTexture]);
//         }
//         // --- End Texture Processing ---


//         // --- Resource Check ---
//         const recipeResource = PIXI.loader?.resources?.recipe;
//         const gameUiResource = PIXI.loader?.resources?.game_ui;
//         const gameAssetResource = PIXI.loader?.resources?.game_asset;

//         if (!recipeResource || !recipeResource.data) {
//             console.error("GameScene Error: 'recipe' resource missing or failed to load.");
//             this.switchToScene(Constants.SCENE_NAMES.TITLE, TitleScene); // Go back to title on critical error
//             return;
//         }
//         if (!gameUiResource || !gameUiResource.textures) {
//             console.error("GameScene Error: 'game_ui' resource missing or failed to load.");
//             this.switchToScene(Constants.SCENE_NAMES.TITLE, TitleScene); // Go back to title on critical error
//             return;
//         }
//         // --- End Resource Check ---


//         // --- Setup Stage ---
//         this.stageBg = new StageBackground(this.stageBgTextures);
//         this.stageBg.init(gameState.stageId); // init handles missing textures internally
//         this.backgroundContainer.addChild(this.stageBg);

//         // --- Setup Player ---
//         const playerData = recipeResource.data.playerData;
//         if (!playerData) {
//             console.error("Player data not found in recipe!");
//             this.switchToScene(Constants.SCENE_NAMES.TITLE, TitleScene);
//             return;
//         }
//         // Ensure explosion/hit/guard frames are passed correctly (already processed)
//         playerData.explosion = this.explosionTextures;
//         playerData.hit = this.processFrames("hit", 5);
//         playerData.guard = this.processFrames("guard", 5);

//         this.player = new Player(playerData);
//         this.player.on(Player.CUSTOM_EVENT_BULLET_ADD, this.handlePlayerShoot.bind(this));
//         Utils.dlog(`Attached listener for ${Player.CUSTOM_EVENT_BULLET_ADD} to Player.`);
//         this.player.on(BaseUnit.CUSTOM_EVENT_DEAD, this.gameover.bind(this)); // Use BaseUnit event
//         this.player.on(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, this.gameoverComplete.bind(this)); // Use BaseUnit event
//         gameState.playerRef = this.player; // Update global reference
//         this.player.setUp(gameState.playerHp, gameState.shootMode, gameState.shootSpeed); // Use current game state
//         this.player.position.set(
//             Constants.GAME_DIMENSIONS.CENTER_X,
//             Constants.GAME_DIMENSIONS.HEIGHT - ((this.player.character && this.player.character.height) || 50) - 30
//         );
//         this.player.unitX = this.player.x; // Sync target position
//         this.unitContainer.addChild(this.player); // Add player to unit container
//         Utils.dlog(`Player added to ${this.player.parent && this.player.parent.name}.`);

//         // --- Setup HUD ---
//         this.hud = new HUD(); // Constructor accesses PIXI.loader.resources
//         this.hud.on(HUD.CUSTOM_EVENT_CA_FIRE, this.caFire.bind(this));
//         this.hud.setPercent(this.player.percent);
//         this.hud.scoreCount = gameState.score; // Use setter to initialize
//         this.hud.highScore = gameState.highScore;
//         this.hud.comboCount = gameState.combo; // Use setter
//         this.hud.maxCombCount = gameState.maxCombo; // Use setter
//         this.hud.cagageCount = gameState.cagage; // Use setter
//         this.hud.comboTimeCnt = 0; // Reset combo timer
//         this.hudContainer.addChild(this.hud);


//         // --- Setup Overlays ---
//         this.titleOverlay = new GameTitle(); // Constructor accesses PIXI.loader.resources
//         this.titleOverlay.on(GameTitle.EVENT_START, this.gameStart.bind(this));
//         this.overlayContainer.addChild(this.titleOverlay);

//         this.cutinCont = new CutinContainer(); // Constructor accesses PIXI.loader.resources

//         const coverTexture = gameAssetResource.textures["stagebgOver.gif"];
//         if (coverTexture && coverTexture !== PIXI.Texture.EMPTY) {
//             this.cover = new PIXI.extras.TilingSprite(coverTexture, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
//             this.overlayContainer.addChild(this.cover); // Add cover to overlay container
//         } else {
//             this.cover = null;
//         }

//         // --- Load Stage Data ---
//         const stageData = recipeResource.data[`stage${gameState.stageId}`];
//         if (stageData && stageData.enemylist) {
//             this.stageEnemyPositionList = [...stageData.enemylist].reverse(); // Clone and reverse
//             if (gameState.shortFlg) {
//                 this.stageEnemyPositionList = [
//                     ["00", "00", "A1", "A2", "A9", "00", "00", "00"],
//                     ["00", "00", "A3", "A3", "00", "00", "00", "00"]
//                 ];
//             }
//         } else {
//             console.warn(`Enemy list for stage ${gameState.stageId} not found.`);
//             this.stageEnemyPositionList = [];
//         }

//         // --- Reset State ---
//         this.enemyWaveFlg = false;
//         this.theWorldFlg = false; Utils.dlog(`theWorldFlg reset in run()`);
//         this.waveCount = 0;
//         this.waveTimeAccumulator = 0; // Reset wave timer
//         this.boss = null;
//         this.bossTimerStartFlg = false;
//         this.bossTimerCountDown = 99;
//         this.bossTimeAccumulator = 0; // Reset boss timer
//         this.enemies = [];
//         this.items = [];
//         this.playerBullets = [];
//         this.enemyBullets = [];

//         // --- Start BGM ---
//         const bossData = recipeResource.data.bossData && recipeResource.data.bossData[`boss${gameState.stageId}`];
//         this.stageBgmName = bossData ? `boss_${bossData.name}_bgm` : '';
//         const bgmPath = Constants.BGM_INFO[this.stageBgmName]; // Get path

//         if (bgmPath && PIXI.sound.exists(this.stageBgmName)) { // Check if sound exists
//             const bgmSound = PIXI.sound.find(this.stageBgmName);
//             const loopInfo = this.getBgmLoopInfo(this.stageBgmName); // Use helper

//             Utils.dlog(`Playing BGM ${this.stageBgmName} from ${loopInfo.startMs}ms to ${loopInfo.endMs}ms`);
//             Sound.bgmPlay(this.stageBgmName, loopInfo.startMs, loopInfo.endMs);

//         } else if (bgmPath) {
//             Utils.dlog(`BGM sound not loaded or found: ${this.stageBgmName}`);
//         } else {
//             Utils.dlog(`BGM path not found in Constants.BGM_INFO for: ${this.stageBgmName}`);
//         }

//         // --- Start Title Animation ---
//         this.titleOverlay.gameStart(gameState.stageId); // Start the "Round X... FIGHT!" animation

//         // Delay enabling HUD interaction
//         this.hud.caBtnDeactive(); // Start deactivated
//         TweenMax.delayedCall(2.6, () => {
//             const voiceKey = `g_stage_voice_${gameState.stageId}`;
//             Sound.play(voiceKey); // Sound manager handles non-existent sounds
//             this.hud.caBtnActive();
//         });

//         // --- Setup Input Handling ---
//         // Create or reuse input layer
//         if (!this.inputLayer) {
//             this.inputLayer = new PIXI.Graphics();
//             this.inputLayer.beginFill(0xFFFFFF, 0.0001); // Almost transparent, but catches events
//             this.inputLayer.drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
//             this.inputLayer.endFill();
//             this.inputLayer.interactive = true;
//             this.inputLayer.name = "InputLayer";
//             // Add inputLayer TO the inputContainer
//             this.inputContainer.addChild(this.inputLayer);
//             Utils.dlog("Input Layer created and added to inputContainer.");
//         } else {
//             this.inputLayer.interactive = true; // Re-enable if exists
//             if (this.inputLayer.parent !== this.inputContainer) {
//                 this.inputContainer.addChild(this.inputLayer);
//             }
//             // Clear previous listeners before adding new ones
//             this.inputLayer.off('pointerdown', this._onPointerDown);
//             this.inputLayer.off('pointermove', this._onPointerMove);
//             this.inputLayer.off('pointerup', this._onPointerUp);
//             this.inputLayer.off('pointerupoutside', this._onPointerUpOutside);
//             Utils.dlog("Input Layer re-enabled and listeners reset.");
//         }

//         // Attach listeners to the inputLayer
//         this.inputLayer.on('pointerdown', this._onPointerDown);
//         this.inputLayer.on('pointermove', this._onPointerMove);
//         this.inputLayer.on('pointerup', this._onPointerUp);
//         this.inputLayer.on('pointerupoutside', this._onPointerUpOutside);
//         Utils.dlog("Input listeners attached to inputLayer.");

//         // Keyboard listeners are handled by Player.js - ensure they are attached
//         if (this.player) this.player.attachInputListeners(); // Attach keyboard listeners now player is added
//     }

//     // Helper to get BGM loop points (similar to original app_formatted logic)
//     getBgmLoopInfo(bgmName) {
//         const defaultLoop = { startMs: 0, endMs: 0 };
//         let loopInfoKey = null;

//         switch (bgmName) {
//             case 'boss_bison_bgm': loopInfoKey = 'boss_bison_bgm_info'; break;
//             case 'boss_barlog_bgm': loopInfoKey = 'boss_barlog_bgm_info'; break;
//             case 'boss_sagat_bgm': loopInfoKey = 'boss_sagat_bgm_info'; break;
//             case 'boss_vega_bgm': loopInfoKey = 'boss_vega_bgm_info'; break;
//             case 'boss_goki_bgm': loopInfoKey = 'boss_goki_bgm_info'; break;
//             case 'boss_fang_bgm': loopInfoKey = 'boss_fang_bgm_info'; break;
//             // Add other BGMs if they have specific loop points defined in constants
//         }

//         // Attempt to find loop info in Constants
//         const constLoopInfo = Constants[loopInfoKey];
//         if (constLoopInfo && typeof constLoopInfo.start === 'number' && typeof constLoopInfo.end === 'number') {
//             // Convert sample points (assuming 48kHz) to milliseconds
//             return {
//                 startMs: constLoopInfo.start / 48, // Samples / (samples/sec * 1000 ms/sec) = ms
//                 endMs: constLoopInfo.end / 48,
//             };
//         }


//         // Fallback if no specific info found
//         const sound = PIXI.sound.find(bgmName);
//         if (sound && sound.duration > 0) {
//             defaultLoop.endMs = sound.duration * 1000;
//         }
//         return defaultLoop;
//     }

//     // --- Input Layer Event Handlers ---
//     _onPointerDown(event) {
//         Utils.dlog("GameScene _onPointerDown");
//         if (this.player) this.player.onScreenDragStart(event); // Safely call player method
//     }
//     _onPointerMove(event) {
//         // Utils.dlog("GameScene _onPointerMove"); // LOGGING (too noisy)
//         if (this.player) this.player.onScreenDragMove(event); // Safely call player method
//     }
//     _onPointerUp(event) {
//         Utils.dlog("GameScene _onPointerUp");
//         if (this.player) this.player.onScreenDragEnd(event); // Safely call player method
//     }
//     _onPointerUpOutside(event) {
//         Utils.dlog("GameScene _onPointerUpOutside");
//         if (this.player) this.player.onScreenDragEnd(event); // Safely call player method
//     }

//     gameStart() { // Called by GameTitle overlay when "FIGHT" anim finishes
//         Utils.dlog("Game Started - Enabling Waves & Player Shoot");
//         this.enemyWaveFlg = true;
//         if (this.player) this.player.shootStart();
//     }

//     loop(delta) {
//         super.loop(delta); // BaseScene loop (updates frame counter)
//         if (this.theWorldFlg) return; // Freeze game

//         // Convert delta (likely fraction of 1/60s) to seconds
//         // const deltaSeconds = delta / 60;
//         const deltaSeconds = delta / Constants.FPS;

//         const scroll = this.stageScrollSpeed * delta;
//         this.stageBg.loop(scroll);
//         this.cover.tilePosition.y += scroll; // Scroll foreground overlay

//         // Player Loop (already handles movement, shooting logic internally)
//         // Player's loop is called by BaseScene's loop if it exists

//         // Update Player Bullets
//         for (let i = this.playerBullets.length - 1; i >= 0; i--) {
//             const bullet = this.playerBullets[i];
//             bullet.loop(delta);
//             // Check off-screen
//             if (bullet.y < -bullet.height || bullet.x < -bullet.width || bullet.x > Constants.GAME_DIMENSIONS.WIDTH) {
//                 this.removePlayerBullet(bullet, i);
//             }
//         }

//         // Update Enemy Bullets
//         for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
//             const bullet = this.enemyBullets[i];
//             bullet.loop(delta);
//             // Check off-screen
//             if (bullet.y > Constants.GAME_DIMENSIONS.HEIGHT || bullet.x < -bullet.width || bullet.x > Constants.GAME_DIMENSIONS.WIDTH) {
//                 this.removeEnemyBullet(bullet, i);
//             }
//         }

//         // Update Enemies
//         for (let i = this.enemies.length - 1; i >= 0; i--) {
//             const enemy = this.enemies[i];
//             if (!enemy || enemy.deadFlg) continue; // Check if enemy exists and skip dead ones
//             enemy.loop(delta, scroll * deltaSeconds); // Pass adjusted scroll

//             // Check off-screen (more generous bounds)
//             const bounds = enemy.getBounds(); // Use bounds for off-screen check
//             if (bounds.y > Constants.GAME_DIMENSIONS.HEIGHT + 50 || // Allow slightly below screen
//                 bounds.x + bounds.width < -50 || // Allow slightly left
//                 bounds.x > Constants.GAME_DIMENSIONS.WIDTH + 50) // Allow slightly right
//             {
//                 if (enemy !== this.boss) { // Don't remove boss this way
//                     Utils.dlog(`Removing off-screen enemy: ${enemy.name} [ID:${enemy.id}] at Y:${bounds.y.toFixed(1)}`);
//                     this.removeEnemy(enemy, i);
//                 }
//             }
//         }

//         // Update Items
//         for (let i = this.items.length - 1; i >= 0; i--) {
//             const item = this.items[i];
//             if (!item) continue;
//             // Item falling speed + stage scroll (adjust speed based on seconds)
//             // Original speed was 1. Increased base speed.
//             const itemSpeed = 2 * Constants.FPS; // Equiv to 2px/frame @ 60fps (increased from 1)
//             item.y += (itemSpeed + scroll) * deltaSeconds; // Apply speed * time
//             if (typeof item.loop === 'function') item.loop(delta); // For animation if method exists

//             // Check off-screen
//             if (item.y > Constants.GAME_DIMENSIONS.HEIGHT + item.height) { // Add item height buffer
//                 Utils.dlog(`Removing off-screen item: ${item.itemName}`);
//                 this.removeItem(item, i);
//             }
//         }

//         // Update HUD
//         if (this.hud) this.hud.loop(delta);

//         // Collision Detection
//         this.checkCollisions();

//         // Enemy Wave Logic
//         if (this.enemyWaveFlg) {
//             this.frameCnt += delta; // Increment frame counter based on delta and target FPS
//             if (this.frameCnt >= this.waveInterval) {
//                 this.enemyWave();
//                 this.frameCnt = 0; // Reset counter
//             }
//         }

//         // Boss Timer Logic
//         if (this.bossTimerStartFlg && this.boss) {
//             this.bossTimerFrameCnt += delta * Constants.FPS;
//             if (this.bossTimerFrameCnt >= Constants.FPS) { // Every second approx
//                 this.bossTimerFrameCnt = 0;
//                 this.bossTimerCountDown--;
//                 if (this.bossTimerDisplay) {
//                     this.bossTimerDisplay.setNum(this.bossTimerCountDown);
//                 }
//                 if (this.bossTimerCountDown <= 0) {
//                     this.bossTimerStartFlg = false;
//                     this.timeover(); // Changed from timeoverComplete
//                 }
//             }
//         }
//     } // End loop

//     // --- Collision Handling ---
//     checkCollisions() {
//         // --- PIXI v4 Hit Test ---
//         const hitTest = (obj1, obj2) => {
//             // Check if objects exist and are visible/renderable in the world hierarchy
//             if (!obj1 || !obj2 || !obj1.visible || !obj2.visible || !obj1.renderable || !obj2.renderable || !obj1.worldVisible || !obj2.worldVisible) {
//                 return false;
//             }
//             // Ensure hitArea exists on both objects
//             if (!obj1.hitArea || !obj2.hitArea) {
//                 return false;
//             }

//             // Get bounds relative to the world stage for accurate comparison
//             const bounds1 = obj1.getBounds(false); // Get non-cached bounds
//             const bounds2 = obj2.getBounds(false);

//             // Construct the world-space hit rectangles based on hitArea dimensions and world bounds
//             // Use hitArea width/height, but position it based on world bounds top-left
//             const hitArea1 = new PIXI.Rectangle(
//                 bounds1.x + (obj1.hitArea.x * obj1.scale.x), // Adjust x based on world position and hitarea offset + scale
//                 bounds1.y + (obj1.hitArea.y * obj1.scale.y), // Adjust y based on world position and hitarea offset + scale
//                 obj1.hitArea.width * obj1.scale.x,         // Scale hitArea width
//                 obj1.hitArea.height * obj1.scale.y        // Scale hitArea height
//             );
//             const hitArea2 = new PIXI.Rectangle(
//                 bounds2.x + (obj2.hitArea.x * obj2.scale.x),
//                 bounds2.y + (obj2.hitArea.y * obj2.scale.y),
//                 obj2.hitArea.width * obj2.scale.x,
//                 obj2.hitArea.height * obj2.scale.y
//             );

//             // AABB Check
//             const collision = hitArea1.x < hitArea2.x + hitArea2.width &&
//                 hitArea1.x + hitArea1.width > hitArea2.x &&
//                 hitArea1.y < hitArea2.y + hitArea2.height &&
//                 hitArea1.y + hitArea1.height > hitArea2.y;

//             return collision;
//         };
//         // --- End Hit Test ---

//         // Player Bullets vs Enemies
//         for (let i = this.playerBullets.length - 1; i >= 0; i--) {
//             const bullet = this.playerBullets[i];
//             if (!bullet || bullet.deadFlg) continue;

//             for (let j = this.enemies.length - 1; j >= 0; j--) {
//                 const enemy = this.enemies[j];
//                 if (!enemy || enemy.deadFlg) continue;

//                 // *** ADDED BOUNDARY CHECK ***
//                 // Only check collision if enemy's center Y is within reasonable screen bounds
//                 const enemyCenterY = enemy.y; // Assuming anchor 0.5, enemy.y is center
//                 if (enemyCenterY > 40 && // Enemy must be below this Y coord (prevent hitting top spawns)
//                     enemyCenterY < Constants.GAME_DIMENSIONS.HEIGHT) // Enemy must be above bottom
//                 {
//                     if (hitTest(bullet.unit, enemy.unit)) {
//                         Utils.dlog(`Collision DETECTED: PlayerBullet ${bullet.id} vs Enemy ${enemy.name}`);
//                         this.handlePlayerBulletHitEnemy(bullet, enemy, i, j);
//                         // Break inner loop if bullet should only hit one enemy? Depends on bullet type.
//                         if (bullet.deadFlg) break; // Break if bullet died
//                     }
//                 }
//                 // *** END BOUNDARY CHECK ***
//             }
//         }

//         // Enemy Bullets vs Player
//         if (this.player && !this.player.deadFlg && !this.player.barrierFlg) {
//             for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
//                 const bullet = this.enemyBullets[i];
//                 if (!bullet || bullet.deadFlg) continue;

//                 if (hitTest(bullet.unit, this.player.unit)) {
//                     Utils.dlog(`Collision DETECTED: EnemyBullet ${bullet.id} vs Player`);
//                     this.handleEnemyBulletHitPlayer(bullet, i);
//                 }
//             }
//         }

//         // Enemies vs Player (Collision/Suicide)
//         if (this.player && !this.player.deadFlg) {
//             for (let i = this.enemies.length - 1; i >= 0; i--) {
//                 const enemy = this.enemies[i];
//                 if (!enemy || enemy.deadFlg) continue;

//                 if (this.player.barrierFlg && this.player.barrier) { // Check barrier exists
//                     // Check enemy vs barrier
//                     if (hitTest(enemy.unit, this.player.barrier)) {
//                         Utils.dlog(`Collision: Enemy ${enemy.name} vs Barrier`);
//                         this.player.barrierHitEffect();
//                         enemy.onDamage(Infinity); // Instantly kill normal enemies hitting barrier
//                     }
//                 } else {
//                     // Check enemy vs player unit
//                     if (hitTest(enemy.unit, this.player.unit)) {
//                         Utils.dlog(`Collision: Enemy ${enemy.name} vs Player Unit`);
//                         if (enemy.name === 'goki' && this.boss === enemy) { // Check if it's the active Goki boss
//                             this.handleGokiGrab();
//                         } else {
//                             this.playerDamage(1); // Standard collision damage
//                             if (!this.player.deadFlg) { // Only damage enemy if player survives
//                                 enemy.onDamage(1); // Example: enemy takes 1 damage on collision
//                             }
//                         }
//                     }
//                 }
//             }
//         }


//         // Items vs Player
//         if (this.player && !this.player.deadFlg) {
//             for (let i = this.items.length - 1; i >= 0; i--) {
//                 const item = this.items[i];
//                 if (!item) continue;
//                 if (hitTest(item, this.player.unit)) {
//                     Utils.dlog(`Collision: Item ${item.itemName} vs Player`);
//                     this.handleItemPickup(item, i);
//                 }
//             }
//         }

//         // Player Bullets vs Enemy Bullets
//         for (let i = this.playerBullets.length - 1; i >= 0; i--) {
//             const pBullet = this.playerBullets[i];
//             if (!pBullet || pBullet.deadFlg) continue;

//             for (let j = this.enemyBullets.length - 1; j >= 0; j--) {
//                 const eBullet = this.enemyBullets[j];
//                 if (!eBullet || eBullet.deadFlg) continue;

//                 if (hitTest(pBullet.unit, eBullet.unit)) {
//                     Utils.dlog(`Collision DETECTED: PlayerBullet ${pBullet.id} vs EnemyBullet ${eBullet.id}`);
//                     pBullet.onDamage(1);
//                     eBullet.onDamage(1);
//                     if (pBullet.deadFlg) break;
//                 }
//             }
//         }
//     }

//     handlePlayerBulletHitEnemy(bullet, enemy, bulletIndex, enemyIndex) {
//         let enemyHPBeforeHit = enemy.hp;
//         let bulletDamage = bullet.damage;

//         if (bullet.name === SHOOT_MODES.BIG) {
//             // --- Apply damage to the enemy on every hit ---
//             enemy.onDamage(bulletDamage);

//             // --- Piercing/Multi-hit Logic (Damage the bullet less frequently) ---
//             const hitTrackerId = `bullet_${bullet.id}`;
//             if (!enemy[hitTrackerId]) enemy[hitTrackerId] = { count: 0, frame: 0 };
//             const tracker = enemy[hitTrackerId];
//             tracker.frame++;

//             // Damage the bullet only periodically to allow piercing
//             if (tracker.frame % 15 === 0 && tracker.count < 2) {
//                 tracker.count++;
//                 // Apply damage TO THE BULLET (making it potentially die)
//                 bullet.onDamage(1, enemyHPBeforeHit > 0 ? 'normal' : 'infinity');
//             }
//         } else {
//             // Normal hit processing (NOT BIG bullets)
//             enemy.onDamage(bulletDamage);
//             bullet.onDamage(1, enemyHPBeforeHit > 0 ? 'normal' : 'infinity');
//         }
//     }

//     handleEnemyBulletHitPlayer(bullet, bulletIndex) {
//         this.playerDamage(bullet.damage);
//         bullet.onDamage(1); // Bullet hits player
//     }

//     handleItemPickup(item, itemIndex) {
//         Sound.play('g_powerup_voice');
//         switch (item.itemName) {
//             case SHOOT_SPEEDS.HIGH:
//                 this.player.shootSpeedChange(SHOOT_SPEEDS.HIGH);
//                 break;
//             case ITEM_TYPES.BARRIER:
//                 this.player.barrierStart();
//                 break;
//             case SHOOT_MODES.NORMAL:
//             case SHOOT_MODES.BIG:
//             case SHOOT_MODES.THREE_WAY:
//                 if (this.player.shootMode !== item.itemName) {
//                     this.player.shootSpeedChange(SHOOT_SPEEDS.NORMAL);
//                 }
//                 this.player.shootModeChange(item.itemName);
//                 break;
//         }
//         this.removeItem(item, itemIndex);
//     }

//     handleGokiGrab() {
//         if (!this.boss || this.boss.name !== 'goki' || this.theWorldFlg) return;
//         if (typeof this.boss.shungokusatsu !== 'function') return; // Ensure method exists

//         Utils.dlog("Goki Grab!");
//         this.hud.caBtnDeactive();
//         this.theWorldFlg = true; Utils.dlog(`theWorldFlg set TRUE in handleGokiGrab`);
//         if (this.boss) this.boss.onTheWorld(true);

//         this.playerBullets.forEach(b => this.removePlayerBullet(b, -1));

//         // Pass player's *unit* (PIXI.Container) for positioning/visuals
//         this.boss.shungokusatsu(this.player.unit, true);

//         // Hide player during animation
//         if (this.player) this.player.alpha = 0;
//         if (this.hud && this.hud.cagaBtn) this.hud.cagaBtn.alpha = 0;

//         TweenMax.delayedCall(1.8, () => { if (this.player) this.player.alpha = 1; });
//         TweenMax.delayedCall(1.9, () => { if (this.stageBg) this.stageBg.akebonoGokifinish(); });
//         TweenMax.delayedCall(2.7, () => { this.playerDamage(100); });
//         TweenMax.delayedCall(3.0, () => { if (this.titleOverlay) this.titleOverlay.akebonofinish(); });
//     }

//     // --- Spawning ---
//     enemyWave() {
//         if (this.waveCount >= this.stageEnemyPositionList.length) {
//             if (!this.boss && this.enemies.length === 0) { // Only add boss if no regular enemies left
//                 this.bossAdd();
//             }
//         } else {
//             this.spawnEnemyRow(this.stageEnemyPositionList[this.waveCount]);
//             this.waveCount++;
//         }
//     }

//     spawnEnemyRow(rowData) {
//         const recipeResource = PIXI.loader?.resources?.recipe;
//         if (!recipeResource || !recipeResource.data) return;

//         rowData.forEach((enemyCode, index) => {
//             if (enemyCode !== "00" && typeof enemyCode === 'string') {
//                 const typeId = enemyCode.substring(0, 1);
//                 const itemCode = enemyCode.substring(1);
//                 const enemyKey = `enemy${typeId}`;
//                 const enemyDataTemplate = recipeResource.data.enemyData && recipeResource.data.enemyData[enemyKey];

//                 if (enemyDataTemplate) {
//                     const enemyData = { ...enemyDataTemplate };
//                     enemyData.explosion = this.explosionTextures;

//                     switch (itemCode) {
//                         case '1': enemyData.itemName = SHOOT_MODES.BIG; break;
//                         case '2': enemyData.itemName = SHOOT_MODES.THREE_WAY; break;
//                         case '3': enemyData.itemName = SHOOT_SPEEDS.HIGH; break;
//                         case '9': enemyData.itemName = ITEM_TYPES.BARRIER; break;
//                         default: enemyData.itemName = null;
//                     }
//                     if (enemyData.itemName && this.itemTextures) {
//                         // Ensure the specific item texture exists
//                         enemyData.itemTexture = this.itemTextures[enemyData.itemName] || null;
//                     } else {
//                         enemyData.itemTexture = null;
//                     }
//                     // Ensure tamaData textures are processed (fallback)
//                     if (enemyData.tamaData && Array.isArray(enemyData.tamaData.texture) && typeof enemyData.tamaData.texture[0] === 'string') {
//                         enemyData.tamaData.texture = enemyData.tamaData.texture
//                             .map(frame => typeof frame === 'string' ? PIXI.Texture.from(frame) : frame)
//                             .filter(tex => tex instanceof PIXI.Texture && tex !== PIXI.Texture.EMPTY);
//                         if (enemyData.tamaData.texture.length === 0) {
//                             Utils.dlog(`Enemy ${enemyKey} tamaData texture processing failed or resulted in empty array.`);
//                             enemyData.tamaData = null; // Prevent errors if textures fail
//                         }
//                     }
//                     // Add explosion frames to tamaData if they exist
//                     if (enemyData.tamaData) {
//                         enemyData.tamaData.explosion = this.explosionTextures;
//                     }


//                     const enemy = new Enemy(enemyData);
//                     enemy.position.set(32 * index + 16, -32); // Initial position above screen
//                     enemy.on(BaseUnit.CUSTOM_EVENT_DEAD, this.handleEnemyRemoved.bind(this)); // Use BaseUnit event
//                     enemy.on(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, this.handleEnemyCleanup.bind(this)); // Use BaseUnit event
//                     enemy.on(BaseUnit.CUSTOM_EVENT_TAMA_ADD, this.handleEnemyShoot.bind(this)); // Use BaseUnit event
//                     Utils.dlog(`Attached listener ${BaseUnit.CUSTOM_EVENT_TAMA_ADD} to ${enemy.name}`);

//                     // *** DETAILED LOGGING BEFORE ADDING ***
//                     const enemyUnit = enemy.unit;
//                     const enemyCharacter = enemy.character;
//                     const enemyTextureValid = enemyCharacter && enemyCharacter.texture !== PIXI.Texture.EMPTY;
//                     const enemyHitArea = enemyUnit && enemyUnit.hitArea;
//                     const enemyHitAreaLog = enemyHitArea ? `HitArea(x:${enemyHitArea.x.toFixed(1)}, y:${enemyHitArea.y.toFixed(1)}, w:${enemyHitArea.width.toFixed(1)}, h:${enemyHitArea.height.toFixed(1)})` : 'No HitArea';
//                     const targetParent = this.unitContainer;
//                     const targetParentName = targetParent ? targetParent.name : 'null';
//                     const targetParentVisible = targetParent ? targetParent.visible : 'N/A';
//                     Utils.dlog(`PRE-ADD Enemy: ${enemy.name}, ID: ${enemy.id}, Pos: (${enemy.x.toFixed(1)}, ${enemy.y.toFixed(1)}), BaseVis: ${enemy.visible}, UnitVis: ${enemyUnit?.visible}, CharVis: ${enemyCharacter?.visible}, ExploVis: ${enemy.explosion?.visible}, TextureValid: ${enemyTextureValid}, ${enemyHitAreaLog}, TargetParent: ${targetParentName}, ParentVis: ${targetParentVisible}`);
//                     // *** END DETAILED LOGGING ***

//                     if (targetParent) { // Ensure container exists
//                         targetParent.addChild(enemy); // Add enemy to unit container
//                         this.enemies.push(enemy);
//                         // *** LOGGING AFTER ADDING ***
//                         Utils.dlog(`POST-ADD Enemy: ${enemy.name}, ID: ${enemy.id}, Parent: ${enemy.parent && enemy.parent.name}, WorldVis: ${enemy.worldVisible}`);
//                     } else {
//                         console.error(`Cannot add enemy ${enemy.name}: unitContainer is null!`);
//                         enemy.destroy(); // Clean up enemy if it can't be added
//                     }
//                 } else {
//                     console.warn(`Enemy data not found for key: ${enemyKey}`);
//                 }
//             }
//         });
//     }

//     bossAdd() {
//         if (this.boss) return;
//         const recipeResource = PIXI.loader?.resources?.recipe;
//         const gameUiResource = PIXI.loader?.resources?.game_ui;
//         if (!recipeResource || !recipeResource.data || !gameUiResource || !gameUiResource.textures) {
//             console.error("Cannot add boss: Recipe or Game UI resources missing.");
//             return;
//         }


//         Utils.dlog("Adding Boss for stage:", gameState.stageId);
//         this.enemyWaveFlg = false;
//         this.stageBg.bossScene();

//         let bossDataKey = `boss${gameState.stageId}`;
//         let BossClass = null;
//         let isGokiReplacement = false;

//         if (gameState.stageId === 3 && gameState.continueCnt === 0) {
//             bossDataKey = 'boss3'; // Vega data first
//             BossClass = BossVega;
//             isGokiReplacement = true;
//             Utils.dlog("Spawning Vega (pre-Goki)");
//         } else {
//             switch (gameState.stageId) {
//                 case 0: BossClass = BossBison; break;
//                 case 1: BossClass = BossBarlog; break;
//                 case 2: BossClass = BossSagat; break;
//                 case 3: BossClass = BossVega; bossDataKey = 'boss3'; break; // Vega if continued
//                 case 4: BossClass = BossFang; bossDataKey = 'boss4'; break;
//                 default: console.error("Invalid stage ID for boss:", gameState.stageId); return;
//             }
//             Utils.dlog(`Spawning Boss: ${BossClass ? BossClass.name : 'Unknown'}`);
//         }

//         let bossData = recipeResource.data.bossData && recipeResource.data.bossData[bossDataKey];
//         if (!bossData || !BossClass) {
//             console.error(`Boss data or class not found for key: ${bossDataKey}`);
//             return;
//         }

//         bossData = { ...bossData };
//         bossData.explosion = this.explosionTextures;
//         // Note: Boss constructors handle processing their own anim/tama textures

//         this.boss = new BossClass(bossData);
//         this.boss.on(BaseUnit.CUSTOM_EVENT_DEAD, this.handleBossRemoved.bind(this)); // Use BaseUnit event
//         this.boss.on(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, this.handleEnemyCleanup.bind(this)); // Use BaseUnit event
//         this.boss.on(BaseUnit.CUSTOM_EVENT_TAMA_ADD, this.handleEnemyShoot.bind(this)); // Use BaseUnit event
//         Utils.dlog(`Attached listener ${BaseUnit.CUSTOM_EVENT_TAMA_ADD} to ${this.boss.name}`);


//         if (isGokiReplacement) {
//             this.boss.gokiFlg = true;
//             this.boss.on(BossVega.CUSTOM_EVENT_GOKI, this.replaceVegaWithGoki.bind(this));
//             Utils.dlog("Vega Goki flag set, listening for replacement event.");
//         }

//         this.unitContainer.addChild(this.boss); // Add boss to unit container
//         this.enemies.push(this.boss);
//         Utils.dlog(`Boss ${this.boss.name} added to unitContainer. WorldVis: ${this.boss.worldVisible}`);


//         // Setup Boss Timer UI
//         const timeTextTexture = gameUiResource.textures["timeTxt.gif"];
//         if (timeTextTexture && timeTextTexture !== PIXI.Texture.EMPTY) {
//             this.bossTimerText = new PIXI.Sprite(timeTextTexture);
//             this.bossTimerText.position.set(Constants.GAME_DIMENSIONS.CENTER_X - this.bossTimerText.width, 58);
//             this.bossTimerText.alpha = 0;
//             this.hudContainer.addChild(this.bossTimerText);

//             this.bossTimerDisplay = new BigNumberDisplay(2); // Uses game_ui textures
//             this.bossTimerDisplay.position.set(this.bossTimerText.x + this.bossTimerText.width + 3, this.bossTimerText.y - 2);
//             this.bossTimerDisplay.setNum(this.bossTimerCountDown);
//             this.bossTimerDisplay.alpha = 0;
//             this.hudContainer.addChild(this.bossTimerDisplay);

//             // Animate timer UI in
//             TweenMax.to([this.bossTimerDisplay, this.bossTimerText], 0.2, {
//                 delay: this.boss.appearDuration || 6.0,
//                 alpha: 1,
//                 onComplete: () => {
//                     this.bossTimerStartFlg = true;
//                     this.bossTimeAccumulator = 0; // Reset timer accumulator
//                     Utils.dlog(`Boss timer started.`);
//                 }
//             });
//         } else {
//             console.warn("Could not create boss timer UI: timeTxt.gif missing.");
//         }
//     }

//     replaceVegaWithGoki() {
//         Utils.dlog("Replacing Vega with Goki!");
//         const currentVega = this.boss;
//         if (!currentVega || currentVega.name !== 'vega') return;
//         const recipeResource = PIXI.loader?.resources?.recipe;
//         if (!recipeResource || !recipeResource.data) return;


//         this.theWorldFlg = true; Utils.dlog(`theWorldFlg set TRUE in replaceVegaWithGoki`);
//         this.hud.caBtnDeactive();
//         if (currentVega.tlShoot) currentVega.tlShoot.pause();

//         this.playerBullets.forEach(b => this.removePlayerBullet(b, -1));

//         const gokiBossData = { ...recipeResource.data.bossData.bossExtra };
//         gokiBossData.explosion = this.explosionTextures;

//         const goki = new BossGoki(gokiBossData); // Constructor handles textures
//         goki.on(BaseUnit.CUSTOM_EVENT_DEAD, this.handleBossRemoved.bind(this)); // Use BaseUnit event
//         goki.on(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, this.handleEnemyCleanup.bind(this)); // Use BaseUnit event
//         goki.on(BaseUnit.CUSTOM_EVENT_TAMA_ADD, this.handleEnemyShoot.bind(this)); // Use BaseUnit event
//         Utils.dlog(`Attaching listener ${BaseUnit.CUSTOM_EVENT_TAMA_ADD} to ${goki.name}`);


//         goki.position.copyFrom(currentVega.position);
//         goki.alpha = 0;
//         this.unitContainer.addChild(goki); // Add goki to unit container

//         const tl = new TimelineMax();
//         tl.addCallback(() => { if (goki.playAshuraSenkuAnimAndSound) goki.playAshuraSenkuAnimAndSound(); }) // Play Goki's intro sound/anim if method exists
//             .to(currentVega, 1.0, {
//                 alpha: 0,
//                 onComplete: () => {
//                     const index = this.enemies.indexOf(currentVega);
//                     if (index > -1) this.enemies.splice(index, 1);
//                     if (currentVega.parent) this.unitContainer.removeChild(currentVega);
//                     currentVega.destroy();
//                 }
//             })
//             .to(goki, 0.5, { alpha: 1 }, "-=0.5")
//             .addCallback(() => {
//                 this.boss = goki;
//                 this.enemies.push(this.boss);
//                 this.theWorldFlg = false; Utils.dlog(`theWorldFlg set FALSE after Goki replace`);
//                 this.hud.caBtnActive();
//                 goki.shootStart();

//                 // Switch BGM
//                 Sound.stop(this.stageBgmName); // Stop Vega BGM
//                 const gokiBgmPath = Constants.BGM_INFO.boss_goki_bgm;
//                 if (gokiBgmPath && PIXI.sound.exists('boss_goki_bgm')) {
//                     this.stageBgmName = 'boss_goki_bgm';
//                     const loopInfo = this.getBgmLoopInfo(this.stageBgmName);
//                     Sound.bgmPlay(this.stageBgmName, loopInfo.startMs, loopInfo.endMs); // Pass ms to sound manager
//                 } else {
//                     console.warn("Could not switch BGM to Goki: sound missing or path invalid.");
//                 }
//             }, "+=0.5");
//     }

//     // --- Event Handlers ---
//     handlePlayerShoot(bulletsData) {
//         Utils.dlog(`GameScene.handlePlayerShoot called with ${bulletsData.length} bullets.`);
//         if (!this.player) return; // Safety check

//         bulletsData.forEach(data => {
//             const bullet = new Bullet(data); // Constructor handles textures
//             // Set position using player's current global position + offset data
//             bullet.position.set(this.player.x + data.startX, this.player.y + data.startY);
//             // bullet.rotation = data.rotation;
//             bullet.unit.rotation = data.rotation;

//             // DRJ::TODO - remove
//             bullet.rotX = 0;
//             bullet.rotY = data.rotation;

//             bullet.once(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, () => { // Use BaseUnit event
//                 Utils.dlog(`Player bullet DEAD_COMPLETE listener triggered: ${bullet.name}, ID: ${bullet.id}`);
//                 const index = this.playerBullets.indexOf(bullet);
//                 if (index > -1) this.removePlayerBullet(bullet, index);
//             });

//             // Ensure bulletContainer exists before adding
//             if (this.bulletContainer) {
//                 this.bulletContainer.addChild(bullet);
//                 this.playerBullets.push(bullet);
//                 // LOGGING
//                 Utils.dlog(`Added player bullet: ${bullet.name}, ID: ${bullet.id} at (${bullet.x.toFixed(1)}, ${bullet.y.toFixed(1)}), Visible: ${bullet.visible}, Parent: ${bullet.parent && bullet.parent.name}, WorldVis: ${bullet.worldVisible}`);
//             } else {
//                 console.error("Cannot add player bullet: bulletContainer does not exist!");
//                 bullet.destroy(); // Destroy bullet if it can't be added
//             }
//         });
//     }

//     handleEnemyShoot(enemyContext) {
//         Utils.dlog(`GameScene.handleEnemyShoot called by ${enemyContext && enemyContext.name}`);
//         // Ensure tamaData exists and has texture before proceeding
//         const enemyTamaData = enemyContext && enemyContext.tamaData;
//         const tamaTexture = enemyTamaData && enemyTamaData.texture;
//         if (!enemyTamaData || !tamaTexture || !Array.isArray(tamaTexture) || tamaTexture.length === 0) {
//             Utils.dlog(`Skipping enemy shoot: Invalid tamaData for ${enemyContext && enemyContext.name}`);
//             return; // Cannot spawn bullet without valid data
//         }

//         // Clone data and add explosion textures
//         const tamaData = { ...enemyTamaData };
//         tamaData.explosion = this.explosionTextures;

//         // --- Specific bullet logic ---
//         const spawnBullet = (data, config = {}) => {
//             const bullet = new Bullet(data); // Constructor logs creation
//             bullet.position.set(config.x !== undefined ? config.x : enemyContext.x, config.y !== undefined ? config.y : enemyContext.y);
//             bullet.rotation = config.rotation !== undefined ? config.rotation : (Math.PI / 2); // Default down (PI/2 radians)
//             if (config.rotX !== undefined) bullet.rotX = config.rotX;
//             if (config.rotY !== undefined) bullet.rotY = config.rotY;
//             // Rotate standard enemy bullet sprites 90 degrees CCW
//             if (config.characterRotation === undefined && data.name !== 'beam' && data.name !== 'smoke' && data.name !== 'meka' && data.name !== 'psychoField') {
//                 if (bullet.character) bullet.character.rotation = -Math.PI / 2; // Rotate sprite visually
//             } else if (config.characterRotation !== undefined) {
//                 if (bullet.character) bullet.character.rotation = config.characterRotation; // Apply specific rotation if provided
//             }
//             if (config.hitArea && bullet.unit) bullet.unit.hitArea = config.hitArea.clone();
//             if (config.speed !== undefined) bullet.speed = config.speed;
//             if (config.start !== undefined) bullet.start = config.start;
//             if (config.targetX !== undefined) bullet.targetX = config.targetX;
//             if (config.scale) bullet.scale.copyFrom(config.scale);
//             if (config.loop === false && bullet.character) bullet.character.loop = false;
//             if (config.onComplete && bullet.character) bullet.character.onComplete = config.onComplete;

//             bullet.once(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, () => { // Use BaseUnit event
//                 Utils.dlog(`Enemy bullet DEAD_COMPLETE listener triggered: ${bullet.name}, ID: ${bullet.id}`);
//                 this.removeEnemyBulletById(bullet.id)
//             });

//             if (this.bulletContainer) { // Check if container exists
//                 this.bulletContainer.addChild(bullet);
//                 this.enemyBullets.push(bullet);
//                 // LOGGING
//                 Utils.dlog(`Added enemy bullet: ${bullet.name}, ID: ${bullet.id} at (${bullet.x.toFixed(1)}, ${bullet.y.toFixed(1)}), Visible: ${bullet.visible}, Parent: ${bullet.parent && bullet.parent.name}, WorldVis: ${bullet.worldVisible}`);
//             } else {
//                 console.error("Cannot add enemy bullet: bulletContainer does not exist!");
//                 bullet.destroy(); // Destroy bullet if it can't be added
//             }

//             return bullet;
//         };


//         switch (tamaData.name) {
//             case 'beam': // FANG beam
//                 const beamCount = enemyContext.tamaData.cnt = (enemyContext.tamaData.cnt === undefined ? 0 : (enemyContext.tamaData.cnt + 1) % 3);
//                 const beamAngles = [105, 90, 75];
//                 const beamOffsets = [{ x: 121, y: 50 }, { x: 141, y: 50 }];
//                 const beamHitAreas = [
//                     new PIXI.Rectangle(-1.35 * tamaData.texture[0].height, -10, tamaData.texture[0].height, tamaData.texture[0].width / 2),
//                     new PIXI.Rectangle(-0.5 * tamaData.texture[0].height, 0, tamaData.texture[0].height, tamaData.texture[0].width / 2),
//                     new PIXI.Rectangle(-0.15 * tamaData.texture[0].height, -5, tamaData.texture[0].height, tamaData.texture[0].width / 2)
//                 ];
//                 beamOffsets.forEach(offset => {
//                     const angleRad = beamAngles[beamCount] * Math.PI / 180;
//                     spawnBullet(tamaData, {
//                         x: enemyContext.x + offset.x, y: enemyContext.y + offset.y,
//                         characterRotation: angleRad, rotX: Math.cos(angleRad), rotY: Math.sin(angleRad),
//                         hitArea: beamHitAreas[beamCount]
//                     });
//                 });
//                 break;
//             case 'smoke': // FANG smoke
//                 const smokeAngle = (60 * Math.random() + 60) * Math.PI / 180;
//                 spawnBullet(tamaData, {
//                     x: enemyContext.x + (enemyContext.unit ? enemyContext.unit.width / 2 : 0) - 50, y: enemyContext.y + 45,
//                     rotX: Math.cos(smokeAngle), rotY: Math.sin(smokeAngle),
//                     loop: false,
//                     onComplete: () => { if (this.character && this.character.gotoAndPlay) this.character.gotoAndPlay(6); },
//                     hitArea: new PIXI.Rectangle(-tamaData.texture[0].width / 2 + 20, -tamaData.texture[0].height / 2 + 20, tamaData.texture[0].width - 40, tamaData.texture[0].height - 40)
//                 });
//                 break;
//             case 'meka': // FANG meka swarm
//                 const numMekas = 32;
//                 for (let i = 0; i < numMekas; i++) {
//                     const unitHitArea = enemyContext.unit && enemyContext.unit.hitArea;
//                     const startX = enemyContext.x + (unitHitArea ? unitHitArea.x + unitHitArea.width / 2 : 0);
//                     const startY = enemyContext.y + (unitHitArea ? unitHitArea.y + unitHitArea.height : 0);
//                     const bullet = spawnBullet(tamaData, {
//                         x: startX,
//                         y: startY,
//                         start: 10 * i,
//                         scale: new PIXI.Point(0, 0), // Use PIXI.Point for scale
//                     });
//                     bullet.playerRef = this.player; // Pass reference

//                     const targetX = enemyContext.x + (unitHitArea ? unitHitArea.x + Math.random() * unitHitArea.width : 0);
//                     const targetY = enemyContext.y + (unitHitArea ? unitHitArea.y + Math.random() * unitHitArea.height : 0);
//                     TweenMax.to(bullet, 0.3, { x: targetX, y: targetY, delay: i * 0.01 });
//                     TweenMax.to(bullet.scale, 0.3, { x: 1, y: 1, delay: i * 0.01 });
//                 }
//                 break;
//             case 'psychoField': // VEGA field
//                 const numFieldBullets = 72;
//                 const radius = 50;
//                 for (let i = 0; i < numFieldBullets; i++) {
//                     const angle = (i / numFieldBullets) * 360 * Math.PI / 180;
//                     const unitHitArea = enemyContext.unit && enemyContext.unit.hitArea;
//                     const centerX = enemyContext.x + (unitHitArea ? unitHitArea.width / 2 : 0);
//                     const centerY = enemyContext.y + (unitHitArea ? unitHitArea.height / 2 : 0);
//                     spawnBullet(tamaData, {
//                         rotX: Math.cos(angle), rotY: Math.sin(angle),
//                         x: centerX + radius * Math.cos(angle),
//                         y: centerY + radius * Math.sin(angle)
//                     });
//                 }
//                 break;
//             default: // Standard bullet
//                 Utils.dlog(`Spawning default bullet for ${enemyContext.name}. TamaData Speed: ${tamaData.speed}`);
//                 const unitHitArea = enemyContext.unit && enemyContext.unit.hitArea;
//                 const textureWidth = tamaData.texture[0] ? tamaData.texture[0].width : 10;
//                 let config = {
//                     x: enemyContext.x + (unitHitArea ? unitHitArea.x + unitHitArea.width / 2 - textureWidth / 2 : 0),
//                     y: enemyContext.y + (unitHitArea ? unitHitArea.y + unitHitArea.height / 2 : 0),
//                     rotation: 90 * Math.PI / 180, // Default straight down
//                     speed: tamaData.speed || 3
//                 };

//                 // AIMING Logic for soliderB
//                 if (enemyContext.name === 'soliderB' && gameState.playerRef) {
//                     const dx = gameState.playerRef.x - config.x;
//                     const dy = gameState.playerRef.y - config.y;
//                     // config.rotation = Math.atan2(dy, dx); // Calculate angle towards player
//                     config.rotY = Math.atan2(dy, dx); // Calculate angle towards player
//                     // Utils.dlog(`soliderB aiming at player. Angle: ${config.rotation.toFixed(2)} radians`);
//                     Utils.dlog(`soliderB aiming at player. Angle: ${config.rotY.toFixed(2)} radians`);
//                 }

//                 spawnBullet(tamaData, config);
//                 break;
//         }
//     }

//     // Called when enemy CUSTOM_EVENT_DEAD is fired
//     handleEnemyRemoved(enemy, index = -1) {
//         if (!enemy || !this.hud) return;
//         Utils.dlog(`Enemy removed callback for ${enemy.name} [ID:${enemy.id}]`);

//         // Show score popup FIRST, using the current combo multiplier
//         this.hud.scoreView(enemy);

//         // THEN update the HUD state
//         this.hud.comboCount = 1; // Use setter (increments by 1)
//         this.hud.cagageCount = this.hud.cagageCount + enemy.cagage; // Use setter
//         this.hud.scoreCount = enemy.score; // Use setter (applies multiplier)

//         const item = enemy.dropItem();
//         if (item) {
//             this.unitContainer.addChild(item); // Add item to unit container
//             this.items.push(item);
//             Utils.dlog(`Dropped item ${item.itemName} from ${enemy.name}`);
//         }
//     }

//     // Called when enemy CUSTOM_EVENT_DEAD_COMPLETE is fired
//     handleEnemyCleanup(enemy) {
//         Utils.dlog(`Enemy cleanup callback for ${enemy.name} [ID:${enemy.id}]`);
//         const index = this.enemies.indexOf(enemy);
//         if (index > -1) {
//             this.removeEnemy(enemy, index);
//         }
//         if (enemy === this.boss) {
//             Utils.dlog("Boss cleanup - calling bossDefeated.");
//             this.bossDefeated();
//         }
//     }

//     handleBossRemoved(bossInstance) {
//         if (!bossInstance || !this.hud) return;
//         Utils.dlog(`Boss removed callback for ${bossInstance.name}`);
//         this.theWorldFlg = true; Utils.dlog(`theWorldFlg set TRUE in handleBossRemoved`);
//         this.bossTimerStartFlg = false;

//         // Show score popup first
//         this.hud.scoreView(bossInstance);

//         // Update HUD state
//         this.hud.comboCount = 1; // Use setter
//         this.hud.cagageCount = this.hud.cagageCount + bossInstance.cagage; // Use setter
//         this.hud.scoreCount = bossInstance.score; // Use setter

//         this.hud.caBtnDeactive(true);

//         if (this.player) this.player.shootStop();
//         this.playerBullets.forEach(b => this.removePlayerBullet(b, -1));
//         this.enemyBullets.forEach(b => this.removeEnemyBullet(b, -1));
//     }

//     bossDefeated() {
//         Utils.dlog("Boss Defeated - Stage Clear Sequence Start");

//         if (this.bossTimerDisplay && this.bossTimerDisplay.parent) this.hudContainer.removeChild(this.bossTimerDisplay);
//         if (this.bossTimerText && this.bossTimerText.parent) this.hudContainer.removeChild(this.bossTimerText);
//         this.bossTimerDisplay = null;
//         this.bossTimerText = null;

//         TweenMax.delayedCall(0.5, () => {
//             if (this.hud.caFireFlg) {
//                 if (this.stageBg) this.stageBg.akebonofinish();
//                 if (this.titleOverlay) this.titleOverlay.akebonofinish();
//                 gameState.akebonoCnt++;
//             } else {
//                 if (this.titleOverlay) this.titleOverlay.stageClear();
//             }
//         });

//         TweenMax.delayedCall(3.0, this.stageClear.bind(this));
//     }

//     // --- Removals ---
//     removeEntity(entity, list, index) {
//         if (!entity) return;
//         const name = entity.name || 'unnamed';
//         const id = entity.id || 'no_id';
//         // Utils.dlog(`Attempting to remove ${name} (ID: ${id}) from list.`); // Too noisy
//         entity.removeAllListeners(); // Remove all listeners before destroying

//         if (entity.parent) {
//             // Utils.dlog(`Removing ${name} from parent ${entity.parent.name}`);
//             entity.parent.removeChild(entity);
//         } else {
//             // Utils.dlog(`Entity ${name} has no parent.`);
//         }
//         // Safely remove from array if index is valid
//         if (index > -1 && list[index] === entity) {
//             list.splice(index, 1);
//             // Utils.dlog(`Spliced ${name} from list using index ${index}.`);
//         } else {
//             // Fallback: find and remove if index was bad (e.g., -1 passed)
//             const actualIndex = list.indexOf(entity);
//             if (actualIndex > -1) {
//                 list.splice(actualIndex, 1);
//                 // Utils.dlog(`Spliced ${name} from list using indexOf (${actualIndex}).`);
//             } else {
//                 // Utils.dlog(`Could not find ${name} in list to splice.`);
//             }
//         }
//         // Check if destroy exists before calling
//         if (typeof entity.destroy === 'function' && !entity.destroyed) {
//             // Utils.dlog(`Destroying ${name}.`);
//             entity.destroy({ children: true });
//         } else {
//             // Utils.dlog(`Not destroying ${name} (no destroy function or already destroyed).`);
//         }
//     }

//     removeEnemy(enemy, index) {
//         // Utils.dlog(`Removing Enemy: ${enemy ? enemy.name : 'null'}, Index: ${index}`); // Can be noisy
//         this.removeEntity(enemy, this.enemies, index);
//     }
//     removeItem(item, index) {
//         // Utils.dlog(`Removing Item: ${item ? item.itemName : 'null'}, Index: ${index}`);
//         this.removeEntity(item, this.items, index);
//     }
//     removePlayerBullet(bullet, index) {
//         // Utils.dlog(`Removing Player Bullet: ${bullet ? bullet.name : 'null'}, ID: ${bullet ? bullet.id : 'null'}, Index: ${index}`); // Too noisy
//         this.removeEntity(bullet, this.playerBullets, index);
//     }
//     removeEnemyBullet(bullet, index) {
//         // Utils.dlog(`Removing Enemy Bullet: ${bullet ? bullet.name : 'null'}, ID: ${bullet ? bullet.id : 'null'}, Index: ${index}`); // Too noisy
//         this.removeEntity(bullet, this.enemyBullets, index);
//     }
//     removeEnemyBulletById(id) {
//         const index = this.enemyBullets.findIndex(b => b && b.id === id); // Add safety check for b
//         if (index > -1) this.removeEnemyBullet(this.enemyBullets[index], index);
//     }
//     removePlayerBulletById(id) {
//         const index = this.playerBullets.findIndex(b => b && b.id === id); // Add safety check for b
//         if (index > -1) this.removePlayerBullet(this.playerBullets[index], index);
//     }


//     // --- Game State Changes ---
//     playerDamage(amount) {
//         if (this.player && !this.player.deadFlg) {
//             const shakeIntensity = 4;
//             const shakeDuration = 0.05;
//             new TimelineMax()
//                 .to(this, shakeDuration, { x: shakeIntensity, y: -shakeIntensity / 2 })
//                 .to(this, shakeDuration, { x: -shakeIntensity / 2, y: shakeIntensity })
//                 .to(this, shakeDuration, { x: shakeIntensity / 2, y: -shakeIntensity })
//                 .to(this, shakeDuration, { x: -shakeIntensity, y: shakeIntensity / 2 })
//                 .to(this, shakeDuration, { x: 0, y: 0 });

//             this.player.onDamage(amount);
//             if (this.hud) this.hud.onDamage(this.player.percent);
//         }
//     }

//     caFire() {
//         if (this.theWorldFlg || !(this.hud && this.hud.cagageFlg)) return;

//         Utils.dlog("CA Fire!");
//         this.theWorldFlg = true; Utils.dlog(`theWorldFlg set TRUE in caFire`);
//         this.hud.caFireFlg = true;
//         if (this.boss) this.boss.onTheWorld(true);
//         if (this.player) this.player.shootStop();

//         this.playerBullets.forEach(b => this.removePlayerBullet(b, -1));
//         // Optionally clear enemy bullets: this.enemyBullets.forEach(b => this.removeEnemyBullet(b, -1));

//         if (this.cutinCont) {
//             this.overlayContainer.addChild(this.cutinCont);
//             this.cutinCont.start();
//         }

//         if (!this.caLine) {
//             this.caLine = new PIXI.Graphics().beginFill(0xFF0000).drawRect(-1.5, 0, 3, 1).endFill();
//             this.caLine.pivot.y = 0;
//         }
//         this.caLine.scale.y = 1;
//         this.caLine.position.set(this.player.x, this.player.y);
//         this.overlayContainer.addChild(this.caLine);

//         const tl = new TimelineMax();
//         tl.addCallback(() => Sound.play('g_ca_voice'), 0.2)
//             .addCallback(() => { if (this.cutinCont && this.cutinCont.parent) this.overlayContainer.removeChild(this.cutinCont); }, 1.9)
//             .to(this.caLine.scale, 0.3, { y: Constants.GAME_DIMENSIONS.HEIGHT * 2, ease: Power1.easeIn }, 1.9)
//             .addCallback(() => Sound.play('se_ca'), "<")
//             .to(this.caLine, 0.1, { alpha: 0 }, "+=0.1")
//             .addCallback(() => { this.triggerCAExplosions(); this.applyCADamage(); }, "-=0.05")
//             .addCallback(() => {
//                 if (this.caLine && this.caLine.parent) this.overlayContainer.removeChild(this.caLine);
//                 this.theWorldFlg = false; Utils.dlog(`theWorldFlg set FALSE after CA finish`);
//                 if (this.hud) this.hud.caFireFlg = false;
//                 if (this.boss && this.boss.hp > 0) this.boss.onTheWorld(false);
//                 // --- FIX: Restart shooting if player is alive ---
//                 if (this.player && !this.player.deadFlg && this.sceneSwitch === 0) { // Only restart if game is ongoing
//                     this.player.shootStart();
//                     Utils.dlog("Restarted player shooting after CA");
//                 }
//                 // --- END FIX ---
//             }, "+=1.0");

//         if (this.hud) this.hud.cagageCount = 0; // Use setter
//     }

//     triggerCAExplosions() {
//         const numExplosions = 64;
//         const explosionsPerRow = 8;
//         const explosionWidth = 30;
//         const explosionHeight = 45;
//         const startY = Constants.GAME_DIMENSIONS.HEIGHT - 120;

//         for (let i = 0; i < numExplosions; i++) {
//             const row = Math.floor(i / explosionsPerRow);
//             const col = i % explosionsPerRow;
//             const offsetX = (row % 2 === 0) ? -explosionWidth / 2 : -explosionWidth;
//             const posX = col * explosionWidth + offsetX;
//             const posY = startY - row * explosionHeight;

//             if (!this.caExplosionTextures || this.caExplosionTextures.length === 0) continue;

//             const explosion = new PIXI.extras.AnimatedSprite(this.caExplosionTextures);
//             explosion.animationSpeed = 0.2;
//             explosion.loop = false;
//             explosion.anchor.set(0.5);
//             explosion.position.set(posX, posY);
//             explosion.onComplete = () => explosion.destroy();

//             TweenMax.delayedCall(i * 0.01, () => {
//                 this.overlayContainer.addChild(explosion);
//                 explosion.play();
//                 if (i % 16 === 0) Sound.play('se_ca_explosion');
//             });
//         }
//     }

//     applyCADamage() {
//         const damageAmount = gameState.caDamage;
//         // Create a copy because enemies might be removed during iteration
//         const targets = [...this.enemies];

//         targets.forEach((enemy, index) => {
//             if (enemy && !enemy.deadFlg && enemy.parent) {
//                 const bounds = enemy.getBounds();
//                 if (bounds.y + bounds.height > 20 && bounds.y < Constants.GAME_DIMENSIONS.HEIGHT &&
//                     bounds.x + bounds.width > 0 && bounds.x < Constants.GAME_DIMENSIONS.WIDTH) {
//                     TweenMax.delayedCall(index * 0.005, () => {
//                         if (enemy && !enemy.deadFlg) {
//                             const hpBefore = enemy.hp;
//                             enemy.onDamage(damageAmount);
//                             if (enemy.hp <= 0 && hpBefore > 0) { // Check if it died from THIS hit
//                                 // handleEnemyRemoved will be called via the DEAD event now
//                                 // this.handleEnemyRemoved(enemy);
//                             }
//                         }
//                     });
//                 }
//             }
//         });
//     }

//     stageClear() {
//         Utils.dlog("GameScene.stageClear()");
//         if (this.theWorldFlg && this.sceneSwitch !== 0) return;

//         this.theWorldFlg = true; Utils.dlog(`theWorldFlg set TRUE in stageClear`);
//         this.sceneSwitch = 1;

//         // Store state safely, checking for player/hud existence
//         gameState.playerHp = this.player ? this.player.hp : 0;
//         gameState.cagage = this.hud ? this.hud.cagageCount : 0;
//         gameState.score = this.hud ? this.hud.scoreCount : 0;
//         gameState.maxCombo = this.hud ? this.hud.maxCombCount : 0;
//         gameState.shootMode = this.player ? this.player.shootMode : SHOOT_MODES.NORMAL;
//         gameState.shootSpeed = this.player && this.player.shootSpeedBoost > 0 ? SHOOT_SPEEDS.HIGH : SHOOT_SPEEDS.NORMAL;

//         if (this.player) this.player.shootStop();
//         if (this.hud) this.hud.caBtnDeactive(true);

//         saveHighScore();

//         TweenMax.delayedCall(2.3, () => {
//             gameState.stageId++;
//             this.switchScene(Constants.SCENE_NAMES.ADV, AdvScene);
//         });
//     }

//     gameover() {
//         Utils.dlog("GameScene.gameover()");
//         if (this.theWorldFlg) return;

//         this.theWorldFlg = true; Utils.dlog(`theWorldFlg set TRUE in gameover`);
//         this.sceneSwitch = 0;

//         gameState.score = this.hud ? this.hud.scoreCount : 0;
//         gameState.maxCombo = this.hud ? this.hud.maxCombCount : 0;
//         if (this.hud) this.hud.caBtnDeactive();
//         if (this.boss) this.boss.onTheWorld(true);
//         if (this.player) this.player.detachInputListeners(); // Detach keyboard listeners
//         if (this.inputLayer) this.inputLayer.interactive = false; // Disable screen input

//         saveHighScore();
//     }

//     gameoverComplete() {
//         Utils.dlog("GameScene.gameoverComplete() - Switching Scene");
//         TweenMax.delayedCall(1.0, () => {
//             this.switchScene(Constants.SCENE_NAMES.RESULT, ContinueScene); // Use RESULT name for ContinueScene
//         });
//     }

//     timeover() {
//         Utils.dlog("GameScene.timeover()");
//         if (this.theWorldFlg) return;

//         this.theWorldFlg = true; Utils.dlog(`theWorldFlg set TRUE in timeover`);
//         this.sceneSwitch = 0;

//         gameState.score = this.hud ? this.hud.scoreCount : 0;
//         gameState.maxCombo = this.hud ? this.hud.maxCombCount : 0;
//         if (this.hud) this.hud.caBtnDeactive();
//         if (this.boss) this.boss.onTheWorld(true);
//         if (this.player) this.player.detachInputListeners(); // Detach keyboard listeners
//         if (this.inputLayer) this.inputLayer.interactive = false; // Disable screen input

//         saveHighScore();

//         if (this.titleOverlay) this.titleOverlay.timeover();

//         TweenMax.to(this.player, 0.5, {
//             alpha: 0,
//             delay: 1.5,
//             onComplete: () => {
//                 this.switchScene(Constants.SCENE_NAMES.RESULT, ContinueScene); // Use RESULT name for ContinueScene
//             }
//         });
//     }

//     // Override destroy for thorough cleanup
//     destroy(options) {
//         Utils.dlog(`Destroying GameScene - Stage ${gameState.stageId}`);
//         if (this.stageBgmName) Sound.stop(this.stageBgmName);

//         TweenMax.killTweensOf(this);
//         if (this.player) TweenMax.killTweensOf(this.player);
//         if (this.boss) TweenMax.killTweensOf(this.boss);

//         if (this.player) this.player.detachInputListeners(); // Ensure keyboard listeners detached
//         if (this.inputLayer) {
//             this.inputLayer.interactive = false; // Ensure it's non-interactive before destroying
//             // Explicitly remove listeners added in run()
//             this.inputLayer.off('pointerdown', this._onPointerDown);
//             this.inputLayer.off('pointermove', this._onPointerMove);
//             this.inputLayer.off('pointerup', this._onPointerUp);
//             this.inputLayer.off('pointerupoutside', this._onPointerUpOutside);
//             // No need to remove from inputContainer if the whole scene is destroyed
//         }


//         // Clear arrays - iterate backwards for safe removal
//         for (let i = this.playerBullets.length - 1; i >= 0; i--) this.removePlayerBullet(this.playerBullets[i], i);
//         for (let i = this.enemyBullets.length - 1; i >= 0; i--) this.removeEnemyBullet(this.enemyBullets[i], i);
//         for (let i = this.items.length - 1; i >= 0; i--) this.removeItem(this.items[i], i);
//         for (let i = this.enemies.length - 1; i >= 0; i--) this.removeEnemy(this.enemies[i], i);

//         this.enemies = [];
//         this.items = [];
//         this.playerBullets = [];
//         this.enemyBullets = [];
//         this.stageEnemyPositionList = [];

//         // Nullify references
//         this.player = null;
//         this.hud = null;
//         this.stageBg = null;
//         this.titleOverlay = null;
//         this.cutinCont = null;
//         this.cover = null;
//         this.boss = null;
//         this.bossTimerDisplay = null;
//         this.bossTimerText = null;
//         this.caLine = null;
//         this.inputLayer = null; // Nullify input layer ref

//         super.destroy({ children: true, texture: false, baseTexture: false }); // Ensure children are destroyed
//     }
// }



// --- Resource Check ---
let gameUiResource;
let gameAssetResource;
let recipeResource;


export class GameScene extends BaseScene {
    constructor() {
        super(Constants.SCENE_NAMES.GAME);

        // --- Resource Check ---
        gameUiResource = PIXI.loader?.resources?.game_ui;
        gameAssetResource = PIXI.loader?.resources?.game_asset;
        recipeResource = PIXI.loader?.resources?.recipe;

        this.waveInterval = 80; // Frames between waves
        this.waveCount = 0;
        this.frameCnt = 0; // Counter for wave timing
        this.stageScrollSpeed = 0.7; // Renamed from stageBgAmountMove
        this.enemyWaveFlg = false;
        this.theWorldFlg = false; // CA or special event freeze flag
        this.sceneSwitch = 0; // 0 = continue/gameover, 1 = next stage

        this.player = null;
        this.hud = null;
        this.stageBg = null;
        this.titleOverlay = null; // Renamed from title
        this.cutinCont = null;
        this.cover = null; // Foreground overlay?
        this.boss = null;
        this.bossTimerDisplay = null;
        this.bossTimerText = null;
        this.bossTimerCountDown = 99;
        this.bossTimerFrameCnt = 0;
        this.bossTimerStartFlg = false;
        this.caLine = null;

        // Containers
        this.backgroundContainer = new PIXI.Container(); // For stageBg
        this.unitContainer = new PIXI.Container(); // For player, enemies, items
        this.bulletContainer = new PIXI.Container(); // For all bullets
        this.hudContainer = new PIXI.Container(); // For HUD elements
        this.overlayContainer = new PIXI.Container(); // For title, cutins, effects

        this.addChild(this.backgroundContainer);
        this.addChild(this.unitContainer);
        this.addChild(this.bulletContainer);
        this.addChild(this.hudContainer);
        this.addChild(this.overlayContainer);

        // Entity Lists
        this.enemies = [];
        this.items = [];
        this.playerBullets = [];
        this.enemyBullets = []; // Use gameState.enemyBulletList ? Original used D.enemyBulletList but wasn't populated

        this.stageEnemyPositionList = []; // Loaded in run()
        this.stageBgmName = '';

        // Pre-process textures (should be done in Loader ideally)
        this.explosionTextures = this.processFrames("explosion0", 7);
        this.caExplosionTextures = this.processFrames("caExplosion0", 8);
        this.itemTextures = {
            [SHOOT_MODES.BIG]: this.processFrames("powerupBig", 2),
            [SHOOT_MODES.THREE_WAY]: this.processFrames("powerup3way", 2),
            [ITEM_TYPES.BARRIER]: this.processFrames("barrierItem", 2),
            [SHOOT_SPEEDS.HIGH]: this.processFrames("speedupItem", 2),
        };
        this.stageBgTextures = [];
        for (let i = 0; i < 5; i++) { // Assuming 5 stages max
            this.stageBgTextures.push([
                PIXI.loader?.resources?.[`stage_end${i}`]?.texture,
                PIXI.loader?.resources?.[`stage_loop${i}`]?.texture
            ]);
        }
    }

    processFrames(baseName, count) {
        const frames = [];
        for (let i = 0; i < count; i++) {
            // Assuming textures are in game_asset.json
            const texture = gameAssetResource?.textures[`${baseName}${i}.gif`];
            if (texture) {
                frames.push(texture);
            } else {
                console.warn(`Texture not found: ${baseName}${i}.gif`);
            }
        }
        return frames;
    }

    run() {
        Utils.dlog("GameScene Run - Stage:", gameState.stageId);

        // --- Setup Stage ---
        this.stageBg = new StageBackground(this.stageBgTextures);
        this.stageBg.init(gameState.stageId);
        this.backgroundContainer.addChild(this.stageBg);

        // --- Setup Player ---
        const playerData = recipeResource.data?.playerData;
        if (!playerData) {
            console.error("Player data not found!");
            return; // Cannot proceed
        }
        playerData.explosion = this.explosionTextures; // Add pre-processed textures
        playerData.hit = this.processFrames("hit", 5);
        playerData.guard = this.processFrames("guard", 5);
        // Ensure bullet textures are pre-processed here if not done in loader
        // playerData.shootNormal.texture = ...
        // playerData.shootBig.texture = ...
        // playerData.barrier.texture = ...
        // playerData.barrierEffectTexture = ...


        this.player = new Player(playerData);
        this.player.on(Player.CUSTOM_EVENT_BULLET_ADD, this.handlePlayerShoot.bind(this));
        this.player.on(Player.CUSTOM_EVENT_DEAD, this.gameover.bind(this));
        this.player.on(Player.CUSTOM_EVENT_DEAD_COMPLETE, this.gameoverComplete.bind(this));
        gameState.playerRef = this.player; // Update global reference
        this.player.setUp(gameState.playerHp, gameState.shootMode, gameState.shootSpeed); // Use current game state
        this.player.position.set(
            Constants.GAME_DIMENSIONS.CENTER_X,
            Constants.GAME_DIMENSIONS.HEIGHT - (this.player.character?.height || 50) - 30
        );
        this.player.unitX = this.player.x; // Sync target position
        this.unitContainer.addChild(this.player);

        // --- Setup HUD ---
        this.hud = new HUD();
        this.hud.on(HUD.CUSTOM_EVENT_CA_FIRE, this.caFire.bind(this));
        this.hud.setPercent(this.player.percent);
        this.hud.scoreCount = gameState.score;
        this.hud.highScore = gameState.highScore;
        this.hud.comboCount = gameState.combo;
        this.hud.maxCombCount = gameState.maxCombo; // Use maxCombCount setter
        this.hud.cagageCount = gameState.cagage;
        this.hud.comboTimeCnt = 0; // Reset combo timer
        this.hudContainer.addChild(this.hud);


        // --- Setup Overlays ---
        this.titleOverlay = new GameTitle(); // Uses game_ui.json textures
        this.titleOverlay.on(GameTitle.EVENT_START, this.gameStart.bind(this));
        this.overlayContainer.addChild(this.titleOverlay);

        this.cutinCont = new CutinContainer(); // Uses game_ui.json textures

        const coverTexture = gameAssetResource.textures["stagebgOver.gif"];
        if (coverTexture) {
            this.cover = new PIXI.extras.TilingSprite(coverTexture, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
            this.overlayContainer.addChild(this.cover); // Add cover to overlay container
        }

        // --- Load Stage Data ---
        const stageData = recipeResource.data?.[`stage${gameState.stageId}`];
        if (stageData?.enemylist) {
            this.stageEnemyPositionList = [...stageData.enemylist].reverse(); // Clone and reverse
            // Apply short flag if needed
            if (gameState.shortFlg) {
                this.stageEnemyPositionList = [
                    ["00", "00", "A1", "A2", "A9", "00", "00", "00"],
                    ["00", "00", "A3", "A3", "00", "00", "00", "00"]
                ];
            }
        } else {
            console.warn(`Enemy list for stage ${gameState.stageId} not found.`);
            this.stageEnemyPositionList = [];
        }

        // --- Reset State ---
        this.enemyWaveFlg = false;
        this.theWorldFlg = false;
        this.waveCount = 0;
        this.frameCnt = 0;
        this.boss = null;
        this.bossTimerStartFlg = false;
        this.bossTimerCountDown = 99;
        this.enemies = [];
        this.items = [];
        this.playerBullets = [];
        this.enemyBullets = [];

        // --- Start BGM ---
        const bossData = recipeResource.data?.bossData?.[`boss${gameState.stageId}`];
        this.stageBgmName = bossData ? `boss_${bossData.name}_bgm` : '';
        const bgmInfo = Constants.BGM_INFO[this.stageBgmName];

        if (bgmInfo) {
            const startMs = bgmInfo.start / 48; // Original code divides by 48e3, maybe sampling rate related? Use ms directly.
            const endMs = bgmInfo.end / 48;
            if (gameState.stageId === Constants.STAGE_IDS.ENDING) { // Special handling for stage 4 BGM start
                TweenMax.delayedCall(3, () => Sound.bgmPlay(bgmInfo.name, startMs, endMs));
            } else {
                Sound.bgmPlay(bgmInfo.name, startMs, endMs);
            }
        } else {
            console.warn(`BGM info not found for ${this.stageBgmName}`);
        }

        // --- Start Title Animation ---
        this.titleOverlay.gameStart(gameState.stageId); // Start the "Round X... FIGHT!" animation

        // Delay enabling HUD interaction
        this.hud.caBtnDeactive(); // Start deactivated
        TweenMax.delayedCall(2.6, () => {
            const voiceKey = `g_stage_voice_${gameState.stageId}`;
            Sound.play(voiceKey); // Sound.play checks if voice exists
            this.hud.caBtnActive();
        });

        // --- Setup Input Handling for Player ---
        // Add a transparent interactive graphic covering the game area
        this.inputLayer = new PIXI.Graphics();
        this.inputLayer.beginFill(0xFFFFFF, 0); // Transparent
        this.inputLayer.drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
        this.inputLayer.endFill();
        this.inputLayer.interactive = true;
        this.inputLayer.on('pointerdown', this.player.onScreenDragStart, this.player);
        this.inputLayer.on('pointermove', this.player.onScreenDragMove, this.player);
        this.inputLayer.on('pointerup', this.player.onScreenDragEnd, this.player);
        this.inputLayer.on('pointerupoutside', this.player.onScreenDragEnd, this.player);
        this.addChild(this.inputLayer); // Add on top, but behind HUD/Overlays potentially
        this.setChildIndex(this.inputLayer, this.children.length - 3); // Place behind HUD and Overlay containers

        this.player.attachInputListeners(); // Attach keyboard listeners
    }

    gameStart() { // Called by GameTitle overlay when "FIGHT" anim finishes
        Utils.dlog("Game Started - Enabling Waves & Player Shoot");
        this.enemyWaveFlg = true;
        if (this.player) this.player.shootStart();
    }


    loop(delta) {
        super.loop(delta); // BaseScene loop (updates frame counter)

        if (this.theWorldFlg) return; // Freeze game

        const scroll = this.stageScrollSpeed * delta;
        this.stageBg.loop(scroll);
        this.cover.tilePosition.y += scroll; // Scroll foreground overlay


        // Player Loop (already handles movement, shooting logic internally)
        // Player's loop is called by BaseScene's loop if it exists

        // Update Player Bullets
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const bullet = this.playerBullets[i];
            bullet.loop(delta);
            // Check off-screen
            if (bullet.y < -bullet.height || bullet.x < -bullet.width || bullet.x > Constants.GAME_DIMENSIONS.WIDTH) {
                this.removePlayerBullet(bullet, i);
            }
        }

        // Update Enemy Bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.loop(delta);
            // Check off-screen
            if (bullet.y > Constants.GAME_DIMENSIONS.HEIGHT || bullet.x < -bullet.width || bullet.x > Constants.GAME_DIMENSIONS.WIDTH) {
                this.removeEnemyBullet(bullet, i);
            }
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.deadFlg) continue; // Skip dead enemies waiting for removal
            enemy.loop(delta, scroll);

            // Check off-screen
            const bounds = enemy.getBounds(); // Use bounds for off-screen check
            if (bounds.y > Constants.GAME_DIMENSIONS.HEIGHT || bounds.x + bounds.width < 0 || bounds.x > Constants.GAME_DIMENSIONS.WIDTH) {
                if (enemy !== this.boss) { // Don't remove boss this way
                    this.removeEnemy(enemy, i);
                }
            }
        }

        // Update Items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += (1 + scroll) * delta; // Item falling speed + stage scroll
            item.loop(delta); // For animation

            // Check off-screen
            if (item.y > Constants.GAME_DIMENSIONS.HEIGHT) {
                this.removeItem(item, i);
            }
        }

        // Collision Detection
        this.checkCollisions();

        // Enemy Wave Logic
        if (this.enemyWaveFlg) {
            this.frameCnt += delta; // Increment frame counter based on delta and target FPS
            if (this.frameCnt >= this.waveInterval) {
                this.enemyWave();
                this.frameCnt = 0; // Reset counter
            }
        }

        // Boss Timer Logic
        if (this.bossTimerStartFlg && this.boss) {
            this.bossTimerFrameCnt += delta * Constants.FPS;
            if (this.bossTimerFrameCnt >= Constants.FPS) { // Every second approx
                this.bossTimerFrameCnt = 0;
                this.bossTimerCountDown--;
                if (this.bossTimerDisplay) {
                    this.bossTimerDisplay.setNum(this.bossTimerCountDown);
                }
                if (this.bossTimerCountDown <= 0) {
                    this.bossTimerStartFlg = false;
                    this.timeover(); // Changed from timeoverComplete
                }
            }
        }
    } // End loop

    // --- Collision Handling ---
    checkCollisions() {
        // --- PIXI v4 Hit Test ---
        const hitTest = (obj1, obj2) => {
            // Check if objects exist and are visible/renderable in the world hierarchy
            if (!obj1 || !obj2 || !obj1.visible || !obj2.visible || !obj1.renderable || !obj2.renderable || !obj1.worldVisible || !obj2.worldVisible) {
                return false;
            }
            // Ensure hitArea exists on both objects
            if (!obj1.hitArea || !obj2.hitArea) {
                return false;
            }

            // Get bounds relative to the world stage for accurate comparison
            const bounds1 = obj1.getBounds(false); // Get non-cached bounds
            const bounds2 = obj2.getBounds(false);

            // Construct the world-space hit rectangles based on hitArea dimensions and world bounds
            // Use hitArea width/height, but position it based on world bounds top-left
            const hitArea1 = new PIXI.Rectangle(
                bounds1.x + (obj1.hitArea.x * obj1.scale.x), // Adjust x based on world position and hitarea offset + scale
                bounds1.y + (obj1.hitArea.y * obj1.scale.y), // Adjust y based on world position and hitarea offset + scale
                obj1.hitArea.width * obj1.scale.x,         // Scale hitArea width
                obj1.hitArea.height * obj1.scale.y        // Scale hitArea height
            );
            const hitArea2 = new PIXI.Rectangle(
                bounds2.x + (obj2.hitArea.x * obj2.scale.x),
                bounds2.y + (obj2.hitArea.y * obj2.scale.y),
                obj2.hitArea.width * obj2.scale.x,
                obj2.hitArea.height * obj2.scale.y
            );

            // AABB Check
            const collision = hitArea1.x < hitArea2.x + hitArea2.width &&
                hitArea1.x + hitArea1.width > hitArea2.x &&
                hitArea1.y < hitArea2.y + hitArea2.height &&
                hitArea1.y + hitArea1.height > hitArea2.y;

            return collision;
        };
        // --- End Hit Test ---
        // Player Bullets vs Enemies
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const bullet = this.playerBullets[i];
            if (bullet.deadFlg) continue;

            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (enemy.deadFlg) continue;

                // Check visibility and basic distance? Optional optimization
                // if (!enemy.visible || Math.abs(bullet.x - enemy.x) > 100) continue;

                if (hitTest(bullet.unit, enemy.unit)) {
                    this.handlePlayerBulletHitEnemy(bullet, enemy, i, j);
                    // Break inner loop if bullet should only hit one enemy? Depends on bullet type.
                    if (bullet.deadFlg) break; // Break if bullet died
                }
            }
        }

        // Enemy Bullets vs Player
        if (!this.player.deadFlg && !this.player.barrierFlg) { // Only check if player alive and no barrier
            for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
                const bullet = this.enemyBullets[i];
                if (bullet.deadFlg) continue;

                if (hitTest(bullet.unit, this.player.unit)) {
                    this.handleEnemyBulletHitPlayer(bullet, i);
                }
            }
        }

        // Enemies vs Player (Collision/Suicide)
        if (!this.player.deadFlg) {
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                if (enemy.deadFlg) continue;

                if (this.player.barrierFlg) {
                    // Check enemy vs barrier
                    if (hitTest(enemy.unit, this.player.barrier)) {
                        this.player.barrierHitEffect();
                        enemy.onDamage(Infinity); // Instantly kill normal enemies hitting barrier
                        if (enemy.hp <= 0 && enemy !== this.boss) { // Don't auto-kill boss
                            this.handleEnemyRemoved(enemy, i); // Process score/item drop etc.
                        }
                    }
                } else {
                    // Check enemy vs player unit
                    if (hitTest(enemy.unit, this.player.unit)) {
                        if (enemy.name === 'goki') { // Special Goki grab
                            this.handleGokiGrab();
                        } else {
                            this.playerDamage(1); // Standard collision damage
                            // Optionally damage/kill the enemy too
                            enemy.onDamage(1); // Example: enemy takes 1 damage on collision
                            if (enemy.hp <= 0 && enemy !== this.boss) {
                                this.handleEnemyRemoved(enemy, i);
                            }
                        }
                    }
                }
            }
        }


        // Items vs Player
        if (!this.player.deadFlg) {
            for (let i = this.items.length - 1; i >= 0; i--) {
                const item = this.items[i];
                if (hitTest(item, this.player.unit)) { // Item is usually a simple sprite/animSprite
                    this.handleItemPickup(item, i);
                }
            }
        }
    }

    handlePlayerBulletHitEnemy(bullet, enemy, bulletIndex, enemyIndex) {
        let enemyHPBeforeHit = enemy.hp;
        let bulletDamage = bullet.damage;

        // Special handling for BIG bullets (damage over time / multiple hits)
        if (bullet.name === SHOOT_MODES.BIG) {
            // Track hits per bullet ID per enemy
            const hitTrackerId = `bullet_${bullet.id}`;
            if (!enemy[hitTrackerId]) {
                enemy[hitTrackerId] = { count: 0, frame: 0 };
            }
            const tracker = enemy[hitTrackerId];
            tracker.frame++;

            // Apply damage only on specific frames (e.g., every 15 frames, max 2 hits)
            if (tracker.frame % 15 === 0 && tracker.count < 2) {
                tracker.count++;
                enemy.onDamage(bulletDamage);
                // Bullet takes damage only if enemy was alive before this hit tick
                bullet.onDamage(1, enemyHPBeforeHit > 0 ? 'normal' : 'infinity');
            } else if (tracker.count >= 2) {
                // Stop checking this bullet against this enemy if max hits reached
            }

        } else {
            // Normal hit processing
            enemy.onDamage(bulletDamage);
            bullet.onDamage(1, enemyHPBeforeHit > 0 ? 'normal' : 'infinity'); // Bullet hits
        }

        // Check if enemy died from this hit
        if (enemy.hp <= 0 && enemyHPBeforeHit > 0) {
            this.handleEnemyRemoved(enemy, enemyIndex);
        }

        // Check if bullet died from this hit
        if (bullet.hp <= 0 && !bullet.deadFlg) { // Ensure bullet dead method isn't called twice
            // Bullet's onDamage calls dead(), which emits event.
            // No need to call removePlayerBullet here, wait for DEAD_COMPLETE.
        }
    }

    handleEnemyBulletHitPlayer(bullet, bulletIndex) {
        this.playerDamage(bullet.damage);
        bullet.onDamage(1); // Bullet hits player
        if (bullet.hp <= 0 && !bullet.deadFlg) {
            // Wait for DEAD_COMPLETE event
        }
    }

    handleItemPickup(item, itemIndex) {
        Sound.play('g_powerup_voice'); // Generic item pickup sound?
        switch (item.itemName) { // Assuming AnimatedItem stores the original itemName
            case SHOOT_SPEEDS.HIGH:
                this.player.shootSpeedChange(SHOOT_SPEEDS.HIGH);
                break;
            case ITEM_TYPES.BARRIER:
                this.player.barrierStart();
                break;
            case SHOOT_MODES.NORMAL:
            case SHOOT_MODES.BIG:
            case SHOOT_MODES.THREE_WAY:
                // Reset speed if changing weapon type
                if (this.player.shootMode !== item.itemName) {
                    this.player.shootSpeedChange(SHOOT_SPEEDS.NORMAL);
                }
                this.player.shootModeChange(item.itemName);
                break;
        }
        this.removeItem(item, itemIndex);
    }

    handleGokiGrab() {
        if (!this.boss || this.boss.name !== 'goki' || this.theWorldFlg) return;

        Utils.dlog("Goki Grab!");
        this.hud.caBtnDeactive();
        this.theWorldFlg = true; // Freeze game
        if (this.boss) this.boss.onTheWorld(true); // Tell boss world is frozen

        // Stop player bullets
        this.playerBullets.forEach(b => this.removePlayerBullet(b, -1)); // Use -1 index to avoid splice issues

        this.boss.shungokusatsu(this.player.unit, true); // Trigger Goki's animation

        // Hide player during animation
        this.player.alpha = 0;
        this.hud.cagaBtn.alpha = 0; // Hide CA button too

        // Sequence the rest of the events
        TweenMax.delayedCall(1.8, () => {
            if (this.player) this.player.alpha = 1; // Player reappears (visually damaged)
        });
        TweenMax.delayedCall(1.9, () => {
            if (this.stageBg) this.stageBg.akebonoGokifinish(); // Background effect
        });
        TweenMax.delayedCall(2.7, () => {
            if (this.player) this.playerDamage(100); // Apply massive damage
        });
        TweenMax.delayedCall(3.0, () => {
            if (this.titleOverlay) this.titleOverlay.akebonofinish(); // K.O. overlay
            // No need to unfreeze here, gameover sequence will take over
        });
    }

    // --- Spawning ---
    enemyWave() {
        if (this.waveCount >= this.stageEnemyPositionList.length) {
            if (!this.boss) { // Spawn boss only if not already present
                this.bossAdd();
            }
        } else {
            this.spawnEnemyRow(this.stageEnemyPositionList[this.waveCount]);
            this.waveCount++;
        }
    }

    spawnEnemyRow(rowData) {
        rowData.forEach((enemyCode, index) => {
            if (enemyCode !== "00" && typeof enemyCode === 'string') {
                const typeId = enemyCode.substring(0, 1);
                const itemCode = enemyCode.substring(1); // 0, 1, 2, 3, 9 etc.
                const enemyKey = `enemy${typeId}`;
                const enemyDataTemplate = recipeResource.data?.enemyData?.[enemyKey];

                if (enemyDataTemplate) {
                    const enemyData = { ...enemyDataTemplate }; // Clone data
                    enemyData.explosion = this.explosionTextures; // Add textures

                    // Determine item drop
                    switch (itemCode) {
                        case '1': enemyData.itemName = SHOOT_MODES.BIG; break;
                        case '2': enemyData.itemName = SHOOT_MODES.THREE_WAY; break;
                        case '3': enemyData.itemName = SHOOT_SPEEDS.HIGH; break;
                        case '9': enemyData.itemName = ITEM_TYPES.BARRIER; break;
                        default: enemyData.itemName = null;
                    }
                    if (enemyData.itemName) {
                        enemyData.itemTexture = this.itemTextures[enemyData.itemName];
                    } else {
                        enemyData.itemTexture = null;
                    }
                    if (enemyData.tamaData?.texture && !(enemyData.tamaData.texture[0] instanceof PIXI.Texture)) {
                        // If tamaData textures haven't been processed, do it now (fallback)
                        enemyData.tamaData.texture = this.processFrames(enemyData.tamaData.texture[0].replace(/\d+\.gif$/, ''), enemyData.tamaData.texture.length);
                    }


                    const enemy = new Enemy(enemyData);
                    enemy.position.set(32 * index + 16, -32); // Position based on index, start off-screen top
                    enemy.on(Enemy.CUSTOM_EVENT_DEAD, this.handleEnemyRemoved.bind(this)); // Listen for dead event
                    enemy.on(Enemy.CUSTOM_EVENT_DEAD_COMPLETE, this.handleEnemyCleanup.bind(this));
                    enemy.on(Enemy.CUSTOM_EVENT_TAMA_ADD, this.handleEnemyShoot.bind(this));

                    this.unitContainer.addChild(enemy);
                    this.enemies.push(enemy);
                } else {
                    console.warn(`Enemy data not found for key: ${enemyKey}`);
                }
            }
        });
    }

    bossAdd() {
        if (this.boss) return; // Already added

        Utils.dlog("Adding Boss for stage:", gameState.stageId);
        this.enemyWaveFlg = false; // Stop normal waves
        this.stageBg.bossScene(); // Transition background

        let bossDataKey = `boss${gameState.stageId}`;
        let BossClass = null;
        let isGokiReplacement = false;

        // Special Goki appearance logic
        if (gameState.stageId === 3 && gameState.continueCnt === 0) {
            bossDataKey = 'boss3'; // Vega data first
            BossClass = BossVega;
            isGokiReplacement = true; // Flag to spawn Goki later
            Utils.dlog("Spawning Vega (pre-Goki)");
        } else {
            // Normal boss selection
            switch (gameState.stageId) {
                case 0: BossClass = BossBison; break;
                case 1: BossClass = BossBarlog; break;
                case 2: BossClass = BossSagat; break;
                case 3: BossClass = BossVega; bossDataKey = 'boss3'; break; // Vega if continued
                case 4: BossClass = BossFang; bossDataKey = 'boss4'; break;
                default: console.error("Invalid stage ID for boss:", gameState.stageId); return;
            }
            Utils.dlog(`Spawning Boss: ${BossClass?.name || 'Unknown'}`);
        }


        let bossData = globals.resources.recipe?.data?.bossData?.[bossDataKey];
        if (!bossData || !BossClass) {
            console.error(`Boss data or class not found for key: ${bossDataKey}`);
            return;
        }

        bossData = { ...bossData }; // Clone data
        bossData.explosion = this.explosionTextures;
        // Add any other necessary textures (tamaData, anims - ideally pre-process)


        this.boss = new BossClass(bossData);
        this.boss.on(Boss.CUSTOM_EVENT_DEAD, this.handleBossRemoved.bind(this)); // Use base Boss event
        this.boss.on(Boss.CUSTOM_EVENT_DEAD_COMPLETE, this.handleEnemyCleanup.bind(this)); // Use generic cleanup
        this.boss.on(Boss.CUSTOM_EVENT_TAMA_ADD, this.handleEnemyShoot.bind(this));

        if (isGokiReplacement) {
            // Handle Vega -> Goki transition
            this.boss.gokiFlg = true; // Tell Vega instance it's the pre-Goki version
            this.boss.on(BossVega.CUSTOM_EVENT_GOKI, this.replaceVegaWithGoki.bind(this));
            Utils.dlog("Vega Goki flag set, listening for replacement event.");
        }

        this.unitContainer.addChild(this.boss);
        this.enemies.push(this.boss); // Add boss to the enemy list for collisions

        // Setup Boss Timer UI (delay its appearance)
        this.bossTimerText = new PIXI.Sprite(globals.resources.game_ui.textures["timeTxt.gif"]);
        this.bossTimerText.position.set(Constants.GAME_DIMENSIONS.CENTER_X - this.bossTimerText.width, 58);
        this.bossTimerText.alpha = 0;
        this.hudContainer.addChild(this.bossTimerText); // Add to HUD container

        this.bossTimerDisplay = new BigNumberDisplay(2); // 2 digits for timer
        this.bossTimerDisplay.position.set(this.bossTimerText.x + this.bossTimerText.width + 3, this.bossTimerText.y - 2);
        this.bossTimerDisplay.setNum(this.bossTimerCountDown);
        this.bossTimerDisplay.alpha = 0;
        this.hudContainer.addChild(this.bossTimerDisplay);

        // Animate timer UI in after a delay
        TweenMax.to([this.bossTimerDisplay, this.bossTimerText], 0.2, {
            delay: this.boss.appearDuration || 6.0, // Use boss appear time or default
            alpha: 1,
            onComplete: () => {
                this.bossTimerStartFlg = true;
                this.bossTimerFrameCnt = 0; // Reset timer frame count
            }
        });
    }

    replaceVegaWithGoki() {
        Utils.dlog("Replacing Vega with Goki!");
        const currentVega = this.boss;
        if (!currentVega || currentVega.name !== 'vega') return; // Safety check

        this.theWorldFlg = true; // Freeze during transition
        this.hud.caBtnDeactive();
        currentVega.tlShoot?.pause(); // Pause Vega's actions

        // Stop player bullets
        this.playerBullets.forEach(b => this.removePlayerBullet(b, -1));

        // Goki's intro animation/sequence (from original code)
        const gokiBossData = { ...globals.resources.recipe.data.bossData.bossExtra }; // Goki is 'bossExtra'
        gokiBossData.explosion = this.explosionTextures;
        // Pre-process Goki animation/bullet textures if needed

        const goki = new BossGoki(gokiBossData);
        goki.on(Boss.CUSTOM_EVENT_DEAD, this.handleBossRemoved.bind(this));
        goki.on(Boss.CUSTOM_EVENT_DEAD_COMPLETE, this.handleEnemyCleanup.bind(this));
        goki.on(Boss.CUSTOM_EVENT_TAMA_ADD, this.handleEnemyShoot.bind(this));

        // Position Goki off-screen initially? Or at Vega's spot?
        goki.position.copyFrom(currentVega.position);
        goki.alpha = 0; // Start invisible
        this.unitContainer.addChild(goki);


        const tl = new TimelineMax();
        tl.addCallback(() => goki.toujou()) // Play Goki's intro sound
            .to(currentVega, 1.0, { // Fade out Vega
                alpha: 0,
                onComplete: () => {
                    const index = this.enemies.indexOf(currentVega);
                    if (index > -1) this.enemies.splice(index, 1);
                    this.unitContainer.removeChild(currentVega);
                    currentVega.destroy(); // Clean up Vega
                }
            })
            .to(goki, 0.5, { alpha: 1 }, "-=0.5") // Fade in Goki
            .addCallback(() => {
                this.boss = goki; // Set Goki as the current boss
                this.enemies.push(this.boss); // Add Goki to collision list
                this.theWorldFlg = false; // Unfreeze game
                this.hud.caBtnActive();
                goki.shootStart(); // Start Goki's attack patterns

                // Switch BGM
                Sound.stop(this.stageBgmName); // Stop Vega BGM
                const gokiBgmInfo = Constants.BGM_INFO.boss_goki_bgm;
                if (gokiBgmInfo) {
                    this.stageBgmName = gokiBgmInfo.name;
                    Sound.bgmPlay(gokiBgmInfo.name, gokiBgmInfo.start / 48, gokiBgmInfo.end / 48);
                }
            }, "+=0.5"); // Delay before unfreezing

    }

    // --- Event Handlers ---
    handlePlayerShoot(bulletsData) {
        bulletsData.forEach(data => {
            const bullet = new Bullet(data);
            bullet.position.set(this.player.x + data.startX, this.player.y + data.startY);
            bullet.rotation = data.rotation; // Set initial rotation

            // Listen for bullet death to remove it
            bullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => {
                const index = this.playerBullets.indexOf(bullet);
                if (index > -1) {
                    this.removePlayerBullet(bullet, index);
                } else {
                    // Bullet might already be removed, log warning if needed
                    // Utils.dlog("Attempted to remove already removed player bullet:", bullet.id);
                }
            });

            this.bulletContainer.addChild(bullet);
            this.playerBullets.push(bullet);
        });
    }

    handleEnemyShoot(enemyContext) {
        const bulletData = { ...enemyContext.tamaData }; // Clone base data
        if (!bulletData || !bulletData.texture) return; // No bullet data

        bulletData.explosion = this.explosionTextures; // Add explosion effect

        // Specific bullet spawning logic based on enemy bullet type
        switch (bulletData.name) {
            case 'beam': // FANG beam
                // Needs special handling for rotation and positioning based on 'cnt'
                const beamCount = bulletData.cnt = (bulletData.cnt === undefined ? 0 : (bulletData.cnt + 1) % 3); // Cycle 0, 1, 2
                const angles = [105, 90, 75]; // Angles in degrees
                const offsets = [{ x: 121, y: 50 }, { x: 141, y: 50 }]; // Emitter points
                const hitAreas = [ // Define hit areas relative to anchor (0.5)
                    new PIXI.Rectangle(-1.35 * bulletData.texture[0].height, -10, bulletData.texture[0].height, bulletData.texture[0].width / 2), // 105 deg
                    new PIXI.Rectangle(-0.5 * bulletData.texture[0].height, 0, bulletData.texture[0].height, bulletData.texture[0].width / 2), // 90 deg
                    new PIXI.Rectangle(-0.15 * bulletData.texture[0].height, -5, bulletData.texture[0].height, bulletData.texture[0].width / 2) // 75 deg
                ];

                offsets.forEach(offset => {
                    const bullet = new Bullet(bulletData);
                    const angleRad = angles[beamCount] * Math.PI / 180;
                    bullet.character.rotation = angleRad; // Rotate the visual sprite
                    bullet.rotation = angleRad; // Store for movement logic if not using rotX/Y
                    bullet.rotX = Math.cos(angleRad); // Store for beam movement
                    bullet.rotY = Math.sin(angleRad);
                    bullet.position.set(enemyContext.x + offset.x, enemyContext.y + offset.y);
                    // Apply specific hit area AFTER creating bullet
                    bullet.unit.hitArea = hitAreas[beamCount].clone();

                    bullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => this.removeEnemyBulletById(bullet.id));
                    this.bulletContainer.addChild(bullet);
                    this.enemyBullets.push(bullet);
                });
                break;
            case 'smoke': // FANG smoke
                const smokeAngle = (60 * Math.random() + 60) * Math.PI / 180; // Random angle 60-120 deg
                const smokeBullet = new Bullet(bulletData);
                smokeBullet.unit.hitArea = new PIXI.Rectangle(-smokeBullet.character.width / 2 + 20, -smokeBullet.character.height / 2 + 20, smokeBullet.character.width - 40, smokeBullet.character.height - 40);
                smokeBullet.rotX = Math.cos(smokeAngle);
                smokeBullet.rotY = Math.sin(smokeAngle);
                smokeBullet.position.set(enemyContext.x + enemyContext.unit.width / 2 - 50, enemyContext.y + 45); // Adjust start pos
                smokeBullet.character.loop = false;
                smokeBullet.character.onComplete = () => smokeBullet.character.gotoAndPlay(6); // Loop end animation

                smokeBullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => this.removeEnemyBulletById(bullet.id));
                this.bulletContainer.addChild(smokeBullet);
                this.enemyBullets.push(smokeBullet);
                break;
            case 'meka': // FANG meka swarm
                const numMekas = 32;
                for (let i = 0; i < numMekas; i++) {
                    const mekaBullet = new Bullet(bulletData);
                    mekaBullet.start = 10 * i; // Stagger start time
                    mekaBullet.playerRef = this.player; // Give reference for targeting
                    mekaBullet.position.set(enemyContext.x + enemyContext.unit.hitArea.x + enemyContext.unit.hitArea.width / 2,
                        enemyContext.y + enemyContext.unit.hitArea.y + enemyContext.unit.hitArea.height);
                    mekaBullet.scale.set(0); // Start scaled down

                    const targetX = enemyContext.x + enemyContext.unit.hitArea.x + Math.random() * (enemyContext.unit.hitArea.width);
                    const targetY = enemyContext.y + enemyContext.unit.hitArea.y + Math.random() * enemyContext.unit.hitArea.height;

                    TweenMax.to(mekaBullet, 0.3, { x: targetX, y: targetY, delay: i * 0.01 }); // Initial spread
                    TweenMax.to(mekaBullet.scale, 0.3, { x: 1, y: 1, delay: i * 0.01 });

                    mekaBullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => this.removeEnemyBulletById(bullet.id));
                    this.bulletContainer.addChild(mekaBullet);
                    this.enemyBullets.push(mekaBullet);
                }
                break;
            case 'psychoField': // VEGA field
                const numFieldBullets = 72;
                const radius = 50;
                for (let i = 0; i < numFieldBullets; i++) {
                    const fieldBullet = new Bullet(bulletData);
                    const angle = (i / numFieldBullets) * 360 * Math.PI / 180;
                    fieldBullet.rotX = Math.cos(angle);
                    fieldBullet.rotY = Math.sin(angle);
                    fieldBullet.position.set(
                        enemyContext.x + enemyContext.unit.hitArea.width / 2 + radius * fieldBullet.rotX,
                        enemyContext.y + enemyContext.unit.hitArea.height / 2 + radius * fieldBullet.rotY
                    );
                    fieldBullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => this.removeEnemyBulletById(bullet.id));
                    this.bulletContainer.addChild(fieldBullet);
                    this.enemyBullets.push(fieldBullet);
                }
                break;

            default: // Standard enemy bullet
                const bullet = new Bullet(bulletData);
                // Position relative to the enemy that fired it
                bullet.position.set(
                    enemyContext.x + enemyContext.unit.hitArea.x + enemyContext.unit.hitArea.width / 2 - bullet.unit.width / 2,
                    enemyContext.y + enemyContext.unit.hitArea.y + enemyContext.unit.hitArea.height / 2 // Center Y? Or bottom?
                );
                // Determine bullet direction (e.g., towards player or straight down)
                bullet.rotation = 90 * Math.PI / 180; // Straight down
                bullet.speed = bulletData.speed || 3; // Use default speed if not specified

                bullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => this.removeEnemyBulletById(bullet.id));
                this.bulletContainer.addChild(bullet);
                this.enemyBullets.push(bullet);
                break;
        }
    }

    _handleEnemyRemoved(enemy, index = -1) { // Called on Enemy.CUSTOM_EVENT_DEAD
        if (!enemy) return;

        // Add score, combo, CA gauge
        this.hud.comboCount += 1; // Use increment setter
        this.hud.scoreCount += enemy.score; // Use increment setter (handles ratio)
        this.hud.cagageCount += enemy.cagage; // Use increment setter
        this.hud.scoreView(enemy); // Show score popup

        // Drop item
        const item = enemy.dropItem();
        if (item) {
            this.unitContainer.addChild(item);
            this.items.push(item);
        }

        // The enemy object itself is not removed from the array or stage yet.
        // This happens in handleEnemyCleanup after the death animation.
    }

    // Called when enemy CUSTOM_EVENT_DEAD is fired
    handleEnemyRemoved(enemy, index = -1) {
        if (!enemy || enemy.deadFlg || !this.hud) return;
        Utils.dlog(`Enemy removed callback for ${enemy.name} [ID:${enemy.id}]`);

        // Show score popup FIRST, using the current combo multiplier
        this.hud.scoreView(enemy);

        // THEN update the HUD state
        this.hud.comboCount = 1; // Use setter (increments by 1)
        this.hud.cagageCount = this.hud.cagageCount + enemy.cagage; // Use setter
        this.hud.scoreCount = enemy.score; // Use setter (applies multiplier)

        const item = enemy.dropItem();
        if (item) {
            this.unitContainer.addChild(item); // Add item to unit container
            this.items.push(item);
            Utils.dlog(`Dropped item ${item.itemName} from ${enemy.name}`);
        }
    }

    handleEnemyCleanup(enemy) { // Called on Enemy.CUSTOM_EVENT_DEAD_COMPLETE
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.removeEnemy(enemy, index);
        }
        if (enemy === this.boss) {
            // Boss defeated - trigger stage clear sequence
            this.bossDefeated();
        }
    }

    handleBossRemoved(bossInstance) { // Called on Boss.CUSTOM_EVENT_DEAD
        if (!bossInstance) return;
        this.theWorldFlg = true; // Freeze game during boss death sequence
        this.bossTimerStartFlg = false; // Stop timer

        // Give final score/CA bonus
        this.hud.comboCount += 1;
        this.hud.scoreCount += bossInstance.score;
        this.hud.cagageCount += bossInstance.cagage;
        this.hud.scoreView(bossInstance);
        this.hud.caBtnDeactive(true); // Deactivate CA button permanently for the stage

        // Stop player shooting and clear bullets
        if (this.player) this.player.shootStop();
        this.playerBullets.forEach(b => this.removePlayerBullet(b, -1));
        this.enemyBullets.forEach(b => this.removeEnemyBullet(b, -1));

        // Boss death animation is handled within the Boss class 'dead' method
        // We wait for CUSTOM_EVENT_DEAD_COMPLETE (handled by handleEnemyCleanup)
        // to trigger the stage clear sequence.
    }

    bossDefeated() {
        // Called from handleEnemyCleanup when the boss's DEAD_COMPLETE event fires
        Utils.dlog("Boss Defeated - Stage Clear Sequence Start");

        // Ensure timer UI is removed
        if (this.bossTimerDisplay) this.hudContainer.removeChild(this.bossTimerDisplay);
        if (this.bossTimerText) this.hudContainer.removeChild(this.bossTimerText);
        this.bossTimerDisplay = null;
        this.bossTimerText = null;


        // Show Stage Clear / K.O. overlays
        TweenMax.delayedCall(0.5, () => { // Short delay after explosion finishes
            if (this.hud.caFireFlg) { // Check if CA was the finishing blow
                this.stageBg.akebonofinish();
                this.titleOverlay.akebonofinish();
                gameState.akebonoCnt++;
            } else {
                this.titleOverlay.stageClear(); // Normal stage clear text
            }
        });


        // Delay transition to next scene/result
        TweenMax.delayedCall(3.0, () => { // Wait longer after clear text appears
            this.stageClear();
        });
    }

    // --- Removals ---
    removeEntity(entity, list, index) {
        if (!entity) return;
        // Remove listeners first
        entity.removeAllListeners();
        // Remove from PIXI container
        if (entity.parent) {
            entity.parent.removeChild(entity);
        }
        // Remove from internal list if index is valid
        if (index > -1 && list[index] === entity) {
            list.splice(index, 1);
        }
        // Destroy the entity to free memory
        entity.destroy({ children: true });
    }

    removeEnemy(enemy, index) {
        this.removeEntity(enemy, this.enemies, index);
    }

    removeItem(item, index) {
        this.removeEntity(item, this.items, index);
    }

    removePlayerBullet(bullet, index) {
        this.removeEntity(bullet, this.playerBullets, index);
    }

    removeEnemyBullet(bullet, index) {
        this.removeEntity(bullet, this.enemyBullets, index);
    }
    // Helper to remove by ID if index is unknown (e.g., from event)
    removeEnemyBulletById(id) {
        const index = this.enemyBullets.findIndex(b => b.id === id);
        if (index > -1) this.removeEnemyBullet(this.enemyBullets[index], index);
    }


    // --- Game State Changes ---
    playerDamage(amount) {
        if (this.player && !this.player.deadFlg) {
            // Screen shake effect
            const shakeIntensity = 4;
            const shakeDuration = 0.05;
            new TimelineMax()
                .to(this, shakeDuration, { x: shakeIntensity, y: -shakeIntensity / 2 })
                .to(this, shakeDuration, { x: -shakeIntensity / 2, y: shakeIntensity })
                .to(this, shakeDuration, { x: shakeIntensity / 2, y: -shakeIntensity })
                .to(this, shakeDuration, { x: -shakeIntensity, y: shakeIntensity / 2 })
                .to(this, shakeDuration, { x: 0, y: 0 }); // Return to center

            this.player.onDamage(amount);
            this.hud.onDamage(this.player.percent); // Update HUD HP bar
        }
    }

    caFire() {
        if (this.theWorldFlg || !this.hud.cagageFlg) return; // Prevent CA during freeze or if not ready

        Utils.dlog("CA Fire!");
        this.theWorldFlg = true;
        this.hud.caFireFlg = true; // Mark that CA is active
        if (this.boss) this.boss.onTheWorld(true); // Freeze boss
        if (this.player) this.player.shootStop(); // Stop player shooting

        // Clear existing bullets (optional, depends on design)
        this.playerBullets.forEach(b => this.removePlayerBullet(b, -1));
        // Consider clearing enemy bullets too?
        // this.enemyBullets.forEach(b => this.removeEnemyBullet(b, -1));

        // Show Cutin
        this.overlayContainer.addChild(this.cutinCont);
        this.cutinCont.start();

        // Setup CA Line graphic
        if (!this.caLine) {
            this.caLine = new PIXI.Graphics()
                .beginFill(0xFF0000) // Red
                .drawRect(-1.5, 0, 3, 1) // Start as thin line at pivot
                .endFill();
            this.caLine.pivot.y = 0; // Pivot at the top
        }
        this.caLine.scale.y = 1; // Reset scale
        this.caLine.position.set(this.player.x, this.player.y); // Start at player
        this.overlayContainer.addChild(this.caLine);


        // CA Timeline
        const tl = new TimelineMax();
        tl.addCallback(() => Sound.play('g_ca_voice'), 0.2)
            .addCallback(() => { // Remove cutin after it finishes
                if (this.cutinCont.parent) this.overlayContainer.removeChild(this.cutinCont);
            }, 1.9) // Matches original delay calculation (0.2 + 1.7)
            .to(this.caLine.scale, 0.3, { // Expand line upwards
                y: Constants.GAME_DIMENSIONS.HEIGHT * 2, // Make sure it covers screen
                ease: Power1.easeIn // Fast expansion
            }, 1.9) // Start expanding after cutin removal
            .addCallback(() => Sound.play('se_ca'), "<") // Play sound as line expands
            .to(this.caLine, 0.1, { alpha: 0 }, "+=0.1") // Quickly fade line
            .addCallback(() => { // Start explosions slightly before line fades
                this.triggerCAExplosions();
                this.applyCADamage();
            }, "-=0.05")
            .addCallback(() => { // Cleanup and unfreeze
                if (this.caLine.parent) this.overlayContainer.removeChild(this.caLine);
                this.theWorldFlg = false;
                this.hud.caFireFlg = false;
                // Resume boss only if it's still alive
                if (this.boss && this.boss.hp > 0) {
                    this.boss.onTheWorld(false);
                }
                // Don't restart player shooting here, maybe resume on user input?
            }, "+=1.0"); // Total duration approx 1.9 + 0.3 + 1.0 = 3.2s

        // Reset HUD CA gauge
        this.hud.cagageCount = 0;
    }

    triggerCAExplosions() {
        const numExplosions = 64;
        const explosionsPerRow = 8;
        const explosionWidth = 30;
        const explosionHeight = 45;
        const startY = Constants.GAME_DIMENSIONS.HEIGHT - 120;

        for (let i = 0; i < numExplosions; i++) {
            const row = Math.floor(i / explosionsPerRow);
            const col = i % explosionsPerRow;
            const offsetX = (row % 2 === 0) ? -explosionWidth / 2 : -explosionWidth; // Stagger rows
            const posX = col * explosionWidth + offsetX;
            const posY = startY - row * explosionHeight;

            const explosion = new PIXI.AnimatedSprite(this.caExplosionTextures);
            explosion.animationSpeed = 0.2;
            explosion.loop = false;
            explosion.anchor.set(0.5);
            explosion.position.set(posX, posY);
            explosion.onComplete = () => explosion.destroy(); // Auto-destroy

            // Delay start of each explosion
            TweenMax.delayedCall(i * 0.01, () => {
                this.overlayContainer.addChild(explosion); // Add to overlay container
                explosion.play();
                if (i % 16 === 0) Sound.play('se_ca_explosion'); // Play sound periodically
            });
        }
    }

    applyCADamage() {
        const damageAmount = gameState.caDamage;
        const targets = [...this.enemies]; // Damage all current enemies

        targets.forEach((enemy, index) => {
            // Check if enemy is on screen and alive
            if (enemy && !enemy.deadFlg && enemy.parent) {
                const bounds = enemy.getBounds();
                if (bounds.y + bounds.height > 20 && bounds.y < Constants.GAME_DIMENSIONS.HEIGHT &&
                    bounds.x + bounds.width > 0 && bounds.x < Constants.GAME_DIMENSIONS.WIDTH) {
                    // Apply damage with slight delay for effect
                    TweenMax.delayedCall(index * 0.005, () => {
                        if (enemy && !enemy.deadFlg) { // Double check enemy is still valid
                            enemy.onDamage(damageAmount);
                            // Check if enemy died AFTER applying damage
                            if (enemy.hp <= 0) {
                                this.handleEnemyRemoved(enemy);
                            }
                        }
                    });
                }
            }
        });
    }

    stageClear() {
        Utils.dlog("GameScene.stageClear()");
        if (this.theWorldFlg && this.sceneSwitch !== 0) return; // Already transitioning

        this.theWorldFlg = true; // Prevent further updates
        this.sceneSwitch = 1; // Mark for transitioning to next stage/adv

        // Store player state for next stage
        gameState.playerHp = this.player.hp;
        gameState.cagage = this.hud.cagageCount;
        gameState.score = this.hud.scoreCount;
        gameState.combo = this.hud.comboCount; // Store current combo? Original didn't seem to.
        gameState.maxCombo = this.hud.maxCombCount; // Store max combo
        gameState.shootMode = this.player.shootMode;
        gameState.shootSpeed = this.player.shootSpeedBoost === 0 ? SHOOT_SPEEDS.NORMAL : SHOOT_SPEEDS.HIGH;


        if (this.player) this.player.shootStop();
        this.hud.caBtnDeactive(true); // isClear = true

        saveHighScore(); // Save potentially new high score

        // Wait for animations, then switch scene
        TweenMax.delayedCall(2.3, () => { // Matches original delay
            gameState.stageId++; // Increment stage ID *before* switching
            this.switchScene(Constants.SCENE_NAMES.ADV, AdvScene); // Go to adventure scene
        });
    }

    gameover() { // Called on Player.CUSTOM_EVENT_DEAD
        Utils.dlog("GameScene.gameover()");
        if (this.theWorldFlg) return; // Already in gameover sequence

        this.theWorldFlg = true;
        this.sceneSwitch = 0; // Mark for transitioning to continue/gameover

        gameState.score = this.hud.scoreCount; // Store final score
        gameState.maxCombo = this.hud.maxCombCount; // Store max combo
        this.hud.caBtnDeactive();
        if (this.boss) this.boss.onTheWorld(true); // Freeze boss
        if (this.player) this.player.detachInputListeners(); // Stop player input
        this.inputLayer.interactive = false; // Disable screen input layer

        saveHighScore();

        // Player death animation is handled within Player class
        // Wait for Player.CUSTOM_EVENT_DEAD_COMPLETE before switching scene
    }

    gameoverComplete() { // Called on Player.CUSTOM_EVENT_DEAD_COMPLETE
        Utils.dlog("GameScene.gameoverComplete() - Switching Scene");
        // Boss should already be frozen from gameover()
        // Remove player graphic explicitly? Player.destroy handles internals.
        // if (this.player && this.player.parent) this.unitContainer.removeChild(this.player);

        TweenMax.delayedCall(1.0, () => { // Shorter delay after player explosion finishes
            this.switchScene(Constants.SCENE_NAMES.LOAD, ContinueScene); // Go to Continue/GameOver scene
        });
    }

    timeover() {
        Utils.dlog("GameScene.timeover()");
        if (this.theWorldFlg) return; // Already ending

        this.theWorldFlg = true;
        this.sceneSwitch = 0; // Go to continue/gameover screen

        gameState.score = this.hud.scoreCount;
        gameState.maxCombo = this.hud.maxCombCount;
        this.hud.caBtnDeactive();
        if (this.boss) this.boss.onTheWorld(true);
        if (this.player) this.player.detachInputListeners();
        this.inputLayer.interactive = false;

        saveHighScore();

        this.titleOverlay.timeover(); // Show "TIME OVER"

        // Fade out player and switch scene
        TweenMax.to(this.player, 0.5, {
            alpha: 0,
            delay: 1.5, // Wait a bit after "TIME OVER" appears
            onComplete: () => {
                this.switchScene(Constants.SCENE_NAMES.LOAD, ContinueScene);
            }
        });
    }

    // Override destroy for thorough cleanup
    destroy(options) {
        Utils.dlog(`Destroying GameScene - Stage ${gameState.stageId}`);
        // Stop all sounds associated with this scene
        if (this.stageBgmName) Sound.stop(this.stageBgmName);

        // Kill all tweens targetting objects in this scene
        TweenMax.killTweensOf(this);
        if (this.player) TweenMax.killTweensOf(this.player);
        if (this.boss) TweenMax.killTweensOf(this.boss);
        // etc. for other animated elements

        // Ensure player listeners are removed
        if (this.player) {
            this.player.detachInputListeners();
            // Player destroy called by PIXI cascade
        }
        if (this.inputLayer) {
            this.inputLayer.off('pointerdown');
            this.inputLayer.off('pointermove');
            this.inputLayer.off('pointerup');
            this.inputLayer.off('pointerupoutside');
            // InputLayer destroy called by PIXI cascade
        }


        // Clear arrays
        this.enemies = [];
        this.items = [];
        this.playerBullets = [];
        this.enemyBullets = [];
        this.stageEnemyPositionList = [];

        // Nullify references
        this.player = null;
        this.hud = null;
        this.stageBg = null;
        this.titleOverlay = null;
        this.cutinCont = null;
        this.cover = null;
        this.boss = null;
        this.bossTimerDisplay = null;
        this.bossTimerText = null;
        this.caLine = null;
        this.inputLayer = null;


        // Call base destroy, which handles children
        super.destroy(options);
    }
}