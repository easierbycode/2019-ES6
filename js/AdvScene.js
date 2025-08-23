// AdvScene.js
import { BaseScene } from './BaseScene.js';
import * as Constants from './constants.js';
import { gameState } from './gameState.js';
import * as Utils from './utils.js';
import * as Sound from './soundManager.js';
import { scenarioDataJA, scenarioDataEN } from './scenarioData.js'; // Import scenario data
import { ActionButton } from './ui/ActionButton.js';
// Import next scenes
import { GameScene } from './GameScene.js'; // Next is usually GameScene
import { EndingScene } from './EndingScene.js'; // Or EndingScene

export class AdvScene extends BaseScene {
    constructor() {
        super(Constants.SCENE_NAMES.ADV);

        this.scenario = Constants.LANG === 'ja' ? scenarioDataJA : scenarioDataEN;
        this.stageKey = '';
        this.currentPartIndex = 0;
        this.currentPartData = null;
        this.currentText = '';
        this.isTextComplete = false;
        this.charIndex = 0;
        this.endingFlg = false; // Determines if next scene is Ending or Game

        // UI Elements Initialized to null
        this.bgSprite = null;
        this.coverSprite = null;
        this.textBg = null;
        this.nameBg = null;
        this.textDisplay = null;
        this.nameDisplay = null;
        this.actionButton = null;

        this.typeTimer = 0; // Timer for typing effect using delta
        // Adjust typeInterval: Lower value = faster typing
        // e.g., 1 / Constants.FPS = add 1 char per frame approx
        // e.g., 0.5 / Constants.FPS = add 2 chars per frame approx
        this.typeInterval = 1.5 / Constants.FPS; // Approx 1 char every 1.5 frames at target FPS
    }

    run() {
        // --- Resource Check & Access ---
        const loadedResources = PIXI.loader?.resources; // Access the shared loader's resources
        const uiResource = loadedResources?.game_ui;
        this.uiTextures = uiResource?.textures; // Store as instance property
        const assetResource = loadedResources?.game_asset;
        this.assetTextures = assetResource?.textures; // Store as instance property

        Utils.dlog("--- AdvScene Run ---");

        if (!this.uiTextures) { // Check the instance property
             console.error("AdvScene cannot run: 'game_ui' resource not found or textures missing!");
             this._showError("Error: Story assets missing!");
             return;
        }
        if (!this.assetTextures) { // Check the instance property
             console.warn("AdvScene: 'game_asset' resource not found or textures missing (cover overlay unavailable).");
        }
        // --- End Resource Check ---


        Sound.bgmPlay('adventure_bgm', 24000 / 48, 792000 / 48); // Start BGM

        // --- Determine Stage and Ending Flag ---
        this.stageKey = `stage${gameState.stageId}`;
        this.endingFlg = false;
        if (gameState.stageId === Constants.STAGE_IDS.SPENDING) { // 5
            this.endingFlg = true;
        } else if (gameState.stageId === Constants.STAGE_IDS.ENDING) { // 4
            Sound.play('voice_thankyou');
            this.endingFlg = !(gameState.akebonoCnt >= 4 && gameState.continueCnt === 0);
            if (!this.endingFlg) {
                 this.stageKey = `stage${Constants.STAGE_IDS.SPENDING}`;
                 Utils.dlog("Using Special Ending Scenario (Stage 5)");
            }
        }

        if (!this.scenario[this.stageKey]) {
             console.error(`Scenario data not found for key: ${this.stageKey}. Falling back to stage0.`);
             this.stageKey = 'stage0'; // Use fallback scenario
        }
        // --- End Stage/Ending Flag ---


        // --- Create UI Elements ---
        this.bgSprite = new PIXI.Sprite(); // Texture set in loadPart
        this.addChild(this.bgSprite);

        // Text box background
        this.textBg = this._createRoundedRect(
            8, Constants.GAME_DIMENSIONS.CENTER_Y + 7,
            Constants.GAME_DIMENSIONS.WIDTH - 16, 180
        );
        this.addChild(this.textBg);

        // Speaker name background
        this.nameBg = this._createRoundedRect(
            16, Constants.GAME_DIMENSIONS.CENTER_Y - 5,
            80, 24
        );
        this.addChild(this.nameBg);

        // Text display field
        const textStyle = new PIXI.TextStyle({
            fontFamily: "sans-serif", fontSize: 16, fontWeight: "bold",
            lineHeight: 20, fill: 0xFFFFFF, wordWrap: true,
            wordWrapWidth: Constants.GAME_DIMENSIONS.WIDTH - 16 - 30, // textBg width - padding X
            breakWords: true, padding: 10,
            stroke: 0x000000, strokeThickness: 3
        });
        this.textDisplay = new PIXI.Text("", textStyle);
        this.textDisplay.position.set(this.textBg.x + 15, this.textBg.y + 10);
        this.addChild(this.textDisplay);

        // Speaker name display
        this.nameDisplay = new PIXI.Text("G", { ...textStyle, wordWrap: false, align: 'center', padding: 0 });
        this.nameDisplay.anchor.set(0.5);
        this.nameDisplay.position.set(this.nameBg.x + this.nameBg.width / 2, this.nameBg.y + this.nameBg.height / 2);
        this.addChild(this.nameDisplay);

        // Action button (for next/go)
        this.actionButton = new ActionButton(); // Constructor safely accesses loader resources
        this.actionButton.on('action_triggered', this.handleActionTrigger.bind(this));
         this.addChild(this.actionButton);

        // Cover Sprite (Overlay - from game_asset)
        const coverTexture = this.assetTextures ? this.assetTextures["stagebgOver.gif"] : null; // Use instance property

        if(coverTexture) {
            // Using extras for PIXI v4 TilingSprite
            this.coverSprite = new PIXI.extras.TilingSprite(
                coverTexture,
                Constants.GAME_DIMENSIONS.WIDTH,
                Constants.GAME_DIMENSIONS.HEIGHT // Initial height, adjusted in loadPart
            );
            this.addChild(this.coverSprite); // Add cover sprite on top
        } else {
             this.coverSprite = null; // Ensure it's null if missing
        }
        // --- End UI Elements ---

        // Load the first part of the scenario
        this.currentPartIndex = 0;
        this.loadPart(this.currentPartIndex);
    }

    // Helper to create rounded rectangle graphics
    _createRoundedRect(x, y, width, height, radius = 6, color = 0x000000, alpha = 0.8, lineColor = 0xFFFFFF, lineThickness = 2) {
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(lineThickness, lineColor, 1);
        graphics.beginFill(color, alpha);
        graphics.drawRoundedRect(0, 0, width, height, radius);
        graphics.endFill();
        graphics.position.set(x, y);
        return graphics;
    }

     // Helper to display error message if setup fails
     _showError(message) {
         const errorText = new PIXI.Text(message, { fill: 0xff0000, fontSize: 16, wordWrap: true, wordWrapWidth: Constants.GAME_DIMENSIONS.WIDTH - 20 });
         errorText.anchor.set(0.5);
         errorText.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y);
         this.addChild(errorText);
     }


    // Loads data and background for a specific part of the scenario
    loadPart(partIndex) {
        const loadedResources = PIXI.loader.resources; // Assume loaded

        // Validate part index and scenario data
        if (!this.scenario[this.stageKey] || partIndex >= this.scenario[this.stageKey].part.length) {
            console.error(`Invalid part index ${partIndex} for stage ${this.stageKey}. Attempting to proceed.`);
            this.goToNextScene();
            return;
        }

        this.currentPartIndex = partIndex;
        this.currentPartData = this.scenario[this.stageKey].part[partIndex];
        this.currentText = this.currentPartData.text || ""; // Ensure text is a string
        this.isTextComplete = false;
        this.charIndex = 0;
        this.typeTimer = 0; // Reset typing timer
        this.textDisplay.text = ""; // Clear previous text
        this.actionButton.hide();

        // Load Background Image (from game_ui)
        const bgKey = this.currentPartData.bg; // "0", "1", "Done", etc.
        const bgTextureName = `advBg${bgKey}.gif`;
        // Use instance property this.uiTextures
        const bgTexture = this.uiTextures ? this.uiTextures[bgTextureName] : null;

        if (bgTexture && bgTexture !== PIXI.Texture.EMPTY) {
            this.bgSprite.texture = bgTexture;
            this.bgSprite.visible = true;
            // Adjust height, ensuring it doesn't exceed game height
            this.bgSprite.height = Math.min(bgTexture.height, Constants.GAME_DIMENSIONS.HEIGHT);
            this.bgSprite.width = Constants.GAME_DIMENSIONS.WIDTH; // Ensure width matches game

             // Adjust cover position based on new BG height
             if(this.coverSprite) {
                this.coverSprite.y = this.bgSprite.height;
                this.coverSprite.height = Math.max(0, Constants.GAME_DIMENSIONS.HEIGHT - this.bgSprite.height);
                this.coverSprite.visible = this.coverSprite.height > 0; // Hide if BG covers whole screen
             }
        } else {
            // Handle missing background texture
            if (this.uiTextures) { // Check if the texture map exists
                 console.warn(`AdvScene: Background texture not found: ${bgTextureName} in game_ui`);
            } else {
                 // This case shouldn't happen due to check in run(), but good failsafe
                 console.error(`AdvScene: Cannot load part background, game_ui resource missing entirely.`);
            }
            this.bgSprite.visible = false; // Hide sprite if texture missing
            if(this.coverSprite) { // Cover full screen if no BG
                this.coverSprite.y = 0;
                this.coverSprite.height = Constants.GAME_DIMENSIONS.HEIGHT;
                this.coverSprite.visible = true;
            }
        }

        // Play voice associated with specific background change?
        if (bgKey === "Done") { // Assuming "Done" corresponds to advBgDone.gif
            Sound.play('g_adbenture_voice0');
        }
    }

    // Main update loop
    loop(delta) {
        super.loop(delta); // Base scene loop (e.g., frame counter)

        // Text Typing Effect using delta time
        if (!this.isTextComplete) {
            this.typeTimer += delta; // Accumulate delta time

            // Add characters based on accumulated time
            while (this.typeTimer >= this.typeInterval && this.charIndex < this.currentText.length) {
                this.textDisplay.text += this.currentText[this.charIndex];
                this.charIndex++;
                this.typeTimer -= this.typeInterval; // Consume the interval time
            }

            // Check if text completed in this loop
            if (this.charIndex >= this.currentText.length) {
                this.isTextComplete = true;
                this.typeTimer = 0; // Reset timer
                this.showActionButton(); // Show button when text is done
            }
        }

        // Scroll cover overlay if it exists and is visible
        if (this.coverSprite && this.coverSprite.visible && this.coverSprite.tilePosition) {
             // Adjust speed as needed; ensure it syncs with FPS target
             const scrollSpeed = 0.5;
             this.coverSprite.tilePosition.y += scrollSpeed * delta * (60 / Constants.FPS);
        }
    }

    // Shows the action button (Next/Go)
    showActionButton() {
        const isLastPart = (this.currentPartIndex >= this.scenario[this.stageKey].part.length - 1);
        const buttonType = isLastPart ? 'go' : 'next';
        console.log("Showing ActionButton, Type:", buttonType); // DEBUG
        this.actionButton.show(); // Ensure this sets visible = true, interactive = true
        this.actionButton.setText(buttonType);
         console.log("ActionButton visible:", this.actionButton.visible, "interactive:", this.actionButton.interactive); // DEBUG
    }

    // Handles clicks on the action button area
    handleActionTrigger() {
        if (!this.actionButton || !this.actionButton.visible) return; // Ignore if button not active

        if (!this.isTextComplete) {
            // --- Skip Typing ---
            this.textDisplay.text = this.currentText; // Instantly show full text
            this.charIndex = this.currentText.length;
            this.isTextComplete = true;
            this.typeTimer = 0;
            this.showActionButton(); // Ensure button shows correct text ('next' or 'go')
            Sound.play('se_cursor_sub'); // Sound for skipping text
        } else {
            // --- Advance Part or Scene ---
            const isLastPart = (this.currentPartIndex >= this.scenario[this.stageKey].part.length - 1);
            if (isLastPart) {
                // ActionButton already played 'se_correct' via setText('go')
                this.goToNextScene();
            } else {
                // ActionButton already played 'se_cursor_sub' via setText('next')
                this.loadPart(this.currentPartIndex + 1); // Load next part
            }
        }
    }

    // Transitions to the next scene (Game or Ending)
    goToNextScene() {
        Sound.stop('adventure_bgm');
        // Determine next scene based on endingFlg set in run()
        const nextSceneClass = this.endingFlg ? EndingScene : GameScene;
        const nextSceneId = this.endingFlg ? Constants.SCENE_NAMES.ENDING : Constants.SCENE_NAMES.GAME;
        Utils.dlog(`AdvScene switching to: ${nextSceneClass.name}`);
        this.switchScene(nextSceneId, nextSceneClass);
    }

    // Cleanup when scene is removed/destroyed
     destroy(options) {
        Utils.dlog("Destroying AdvScene");
        Sound.stop('adventure_bgm'); // Ensure BGM stops
        // Children are destroyed by PIXI cascade
        // Remove listeners added by this scene (actionButton listener is on the button itself)
        super.destroy(options);
     }
}