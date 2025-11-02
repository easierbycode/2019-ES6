// GameScene.js (Original 'Ki')
import { BaseScene } from './BaseScene.js';
import { BaseUnit } from './BaseUnit.js';
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
        // this.playerBullets = []; // No longer used - Player manages its own bullets
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
        // Listen for player bullet creation events
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
        // this.playerBullets = []; // No longer used - Player manages its own bullets
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
        if (!this.inputLayer) {
            this.inputLayer = new PIXI.Graphics();
            this.inputLayer.beginFill(0xFFFFFF, 0); // Transparent
            this.inputLayer.drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
            this.inputLayer.endFill();
            this.inputLayer.interactive = true;
            this.addChild(this.inputLayer); // Add on top, but behind HUD/Overlays potentially
            console.log("Input Layer created");
        } else {
            // Clear existing listeners before re-attaching
            this.inputLayer.removeAllListeners('pointerdown');
            this.inputLayer.removeAllListeners('pointermove');
            this.inputLayer.removeAllListeners('pointerup');
            this.inputLayer.removeAllListeners('pointerupoutside');
            this.inputLayer.interactive = true;
            console.log("Input Layer reused, listeners cleared");
        }

        // Attach listeners to the inputLayer
        this.inputLayer.on('pointerdown', this.player.onScreenDragStart, this.player);
        this.inputLayer.on('pointermove', this.player.onScreenDragMove, this.player);
        this.inputLayer.on('pointerup', this.player.onScreenDragEnd, this.player);
        this.inputLayer.on('pointerupoutside', this.player.onScreenDragEnd, this.player);
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

        // Update Player Bullets (managed by player now)
        if (this.player && this.player.bulletList) {
            for (let i = this.player.bulletList.length - 1; i >= 0; i--) {
                const bullet = this.player.bulletList[i];
                bullet.loop(delta);
                // Check off-screen using global position (bullets are children of player)
                const globalPos = bullet.getGlobalPosition();
                if (globalPos.y < -bullet.height || globalPos.x < -bullet.width || globalPos.x > Constants.GAME_DIMENSIONS.WIDTH + bullet.width) {
                    this.player.bulletRemove(bullet);
                    this.player.bulletRemoveComplete(bullet);
                }
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
            if (typeof item.loop === 'function') {
                item.loop(delta); // For animation
            }

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
            this.bossTimerFrameCnt += delta;
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
        // Player Bullets vs Enemies (bullets managed by player)
        if (this.player && this.player.bulletList) {
            for (let i = this.player.bulletList.length - 1; i >= 0; i--) {
                const bullet = this.player.bulletList[i];
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

        // Player Bullets vs Enemy Bullets
        if (this.player && this.player.bulletList) {
            for (let i = this.player.bulletList.length - 1; i >= 0; i--) {
                const playerBullet = this.player.bulletList[i];
                if (playerBullet.deadFlg) continue;

                for (let j = this.enemyBullets.length - 1; j >= 0; j--) {
                    const enemyBullet = this.enemyBullets[j];
                    if (enemyBullet.deadFlg) continue;

                    if (hitTest(playerBullet.unit, enemyBullet.unit)) {
                        // Both bullets take damage and are destroyed
                        playerBullet.onDamage(Infinity);
                        enemyBullet.onDamage(Infinity);
                        break; // Player bullet is destroyed, move to next player bullet
                    }
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

        // Stop player bullets (managed by player now)
        if (this.player && this.player.bulletList) {
            [...this.player.bulletList].forEach(b => {
                this.player.bulletRemove(b);
                this.player.bulletRemoveComplete(b);
            });
        }

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
                    if (enemyData.bulletData?.texture && !(enemyData.bulletData.texture[0] instanceof PIXI.Texture)) {
                        // If bulletData textures haven't been processed, do it now (fallback)
                        enemyData.bulletData.texture = this.processFrames(enemyData.bulletData.texture[0].replace(/\d+\.gif$/, ''), enemyData.bulletData.texture.length);
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
        // Add any other necessary textures (bulletData, anims - ideally pre-process)


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

        // Stop player bullets (managed by player now)
        if (this.player && this.player.bulletList) {
            [...this.player.bulletList].forEach(b => {
                this.player.bulletRemove(b);
                this.player.bulletRemoveComplete(b);
            });
        }

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
    handlePlayerShoot(bullets) {
        if (!bullets || bullets.length === 0) return;

        bullets.forEach(bullet => {
            // Convert bullet position from player-relative to world coordinates
            const worldPos = this.player.toGlobal(new PIXI.Point(bullet.unit.x, bullet.unit.y));
            bullet.x = worldPos.x;
            bullet.y = worldPos.y;

            // Add to bulletContainer instead of player
            this.bulletContainer.addChild(bullet);

            // Listen for bullet death to remove it
            bullet.on(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, () => {
                const index = this.player.bulletList.findIndex(b => b.id === bullet.id);
                if (index > -1) {
                    this.player.bulletList.splice(index, 1);
                }
                this.bulletContainer.removeChild(bullet);
                bullet.destroy();
            });
        });
    }

    handleEnemyShoot(enemyContext) {
        const bulletData = { ...enemyContext.bulletData }; // Clone base data
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
                // Set movement direction and visual rotation
                bullet.rotation = 90 * Math.PI / 180; // Straight down (movement direction)
                bullet.character.rotation = -Math.PI / 2; // Rotate sprite 90 degrees CCW to point down
                bullet.speed = bulletData.speed || 3; // Use default speed if not specified

                bullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => this.removeEnemyBulletById(bullet.id));
                this.bulletContainer.addChild(bullet);
                this.enemyBullets.push(bullet);
                break;
        }
    }

    // Called when enemy CUSTOM_EVENT_DEAD is fired
    handleEnemyRemoved(enemy, index = -1) {
        if (!enemy || !this.hud) return;
        Utils.dlog(`Enemy removed callback for ${enemy.name} [ID:${enemy.id}]`);

        // Mirror original enemyRemove logic order
        this.hud.comboCount = 1;
        this.hud.scoreCount = enemy.score;
        this.hud.cagageCount = this.hud.cagageCount + enemy.cagage;
        this.hud.scoreView(enemy);

        if (enemy.itemName) {
            const itemTextures = enemy.itemTextureFrames && enemy.itemTextureFrames.length > 0
                ? enemy.itemTextureFrames
                : null;

            if (itemTextures) {
                const item = new AnimatedItem(itemTextures, enemy.itemName);
                const unitX = enemy.unit ? enemy.unit.x : 0;
                const unitY = enemy.unit ? enemy.unit.y : 0;
                item.x = enemy.x + unitX;
                item.y = enemy.y + unitY;
                item.name = enemy.itemName;

                this.unitContainer.addChild(item);
                this.items.push(item);
                Utils.dlog(`Dropped item ${item.itemName} from ${enemy.name}`);
            } else {
                Utils.dlog(`Item drop for ${enemy.name} skipped: textures missing or invalid.`);
            }
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
        if (this.player) {
            this.player.shootStop();
            // Clear player bullets (managed by player now)
            if (this.player.bulletList) {
                [...this.player.bulletList].forEach(b => {
                    this.player.removeChild(b);
                });
            }
        }
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
        // No longer used - Player manages its own bullets
        // this.removeEntity(bullet, this.playerBullets, index);
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

        // Clear existing bullets (managed by player now)
        if (this.player && this.player.bulletList) {
            [...this.player.bulletList].forEach(b => {
                this.player.bulletRemove(b);
                this.player.bulletRemoveComplete(b);
            });
        }
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
        if (this.stageBgmName) Sound.stop(this.stageBgmName);

        TweenMax.killTweensOf(this);
        if (this.player) TweenMax.killTweensOf(this.player);
        if (this.boss) TweenMax.killTweensOf(this.boss);

        if (this.player) this.player.detachInputListeners();
        if (this.inputLayer) {
            this.inputLayer.interactive = false;
            this.inputLayer.off('pointerdown', this._onPointerDown);
            this.inputLayer.off('pointermove', this._onPointerMove);
            this.inputLayer.off('pointerup', this._onPointerUp);
            this.inputLayer.off('pointerupoutside', this._onPointerUpOutside);
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

        super.destroy({ children: true, texture: false, baseTexture: false });
    }
}
