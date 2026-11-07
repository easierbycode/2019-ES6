// LoadScene.js
import { BaseScene } from './BaseScene.js';
import * as Constants from './constants.js';
import { gameState, loadHighScore } from './gameState.js';
import { globals } from './globals.js';
import * as Utils from './utils.js';
import * as Sound from './soundManager.js';
import { ModeButton } from './ui/ModeButton.js';
import { RecommendButton } from './ui/RecommendButton.js';
import { TitleScene } from './TitleScene.js';

export class LoadScene extends BaseScene {
    constructor() {
        super(Constants.SCENE_NAMES.LOAD);

        this.loadingBg = null;
        this.loadingG = null;
        this.loadingTexture = null;
        this.recommendModal = null;
        this.recommendModalCloseBtn = null;
        this.loadingBgFlipCnt = 0;
        this.errorText = null;

        // Use the shared PIXI loader (v4 singleton)
        this.resourceLoader = PIXI.loader;
        this.preloadLoader = PIXI.loader;

        // Preload minimal assets for the selection screen
        this.preloadLoader.add('mode_select_ui', `${gameState.baseUrl || Constants.BASE_PATH}assets/title_ui.json`);
        this.preloadLoader.add('loading_bg', `${gameState.baseUrl || Constants.BASE_PATH}assets/img/loading/loading_bg.png`);

        // Attach error handler for preload loader
        this.preloadLoader.onError.add((err, loader, resource) => {
            console.error(`Preload Error: ${err?.message || err} on resource: ${resource?.url || 'unknown'}`);
            this.showError("Error: Failed to load critical assets.");
        });

        // Load high score initially
        loadHighScore();
    }

    showError(message) {
        if (this.errorText && this.errorText.parent) {
            this.removeChild(this.errorText);
            this.errorText.destroy();
        }
        const errorStyle = new PIXI.TextStyle({
            fill: 0xff0000,
            fontSize: 16,
            wordWrap: true,
            wordWrapWidth: Constants.GAME_DIMENSIONS.WIDTH - 20,
            align: 'center',
            stroke: 0xffffff,
            strokeThickness: 1
        });
        this.errorText = new PIXI.Text(message, errorStyle);
        this.errorText.anchor.set(0.5);
        this.errorText.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y);
        this.addChild(this.errorText);

        if (this.loadingG) {
            this.loadingG.visible = false;
        }
    }

    run() {
        const baseUrl = gameState.baseUrl || Constants.BASE_PATH;
        Utils.dlog("LoadScene Run");

        // Define assets needed JUST for the mode select screen + loading anim
        const preloadAssets = [
            { name: 'mode_select_ui', url: `${baseUrl}assets/title_ui.json` },
            { name: 'loadingFrame0', url: `${baseUrl}assets/img/loading/loading0.gif` },
            { name: 'loadingFrame1', url: `${baseUrl}assets/img/loading/loading1.gif` },
            { name: 'loadingFrame2', url: `${baseUrl}assets/img/loading/loading2.gif` },
            { name: 'loading_bg', url: `${baseUrl}assets/img/loading/loading_bg.png` }
        ];

        // Add preload assets if not already loaded or loading
        preloadAssets.forEach(asset => {
            const resourceExists = !!this.resourceLoader.resources[asset.name];
            if (!resourceExists && !this.resourceLoader.loading) {
                Utils.dlog(`Preloading: ${asset.name}`);
                this.resourceLoader.add(asset.name, asset.url);
            } else if (resourceExists) {
                Utils.dlog(`Asset already loaded, skipping preload add: ${asset.name}`);
            } else {
                Utils.dlog(`Loader busy, skipping preload add: ${asset.name}`);
            }
        });

        this.preloadLoader.load((loader, resources) => {
            this.setupModeSelection(resources || loader.resources);
        });
    }

    setupModeSelection(resources) {
        const res = resources || this.preloadLoader?.resources || PIXI.loader.resources;

        // Loading BG (TilingSprite might be better if it needs to tile)
        if (res?.loading_bg?.texture) {
            this.loadingTexture = res.loading_bg.texture;
            this.loadingBg = new PIXI.Sprite(this.loadingTexture);
            this.loadingBg.alpha = 0.09;
            this.loadingBg.name = "omote"; // For rotation logic
            this.addChild(this.loadingBg);
        }

        // Loading Animation - Access .texture directly for individual images
        const loadingFrames = [];
        if (res?.loadingFrame0?.texture) loadingFrames.push(res.loadingFrame0.texture);
        if (res?.loadingFrame1?.texture) loadingFrames.push(res.loadingFrame1.texture);
        if (res?.loadingFrame2?.texture) loadingFrames.push(res.loadingFrame2.texture);

        if (loadingFrames.length > 0) {
            this.loadingG = new PIXI.extras.AnimatedSprite(loadingFrames);
            this.loadingG.anchor.set(0.5);
            this.loadingG.x = Constants.GAME_DIMENSIONS.CENTER_X;
            this.loadingG.y = Constants.GAME_DIMENSIONS.CENTER_Y;
            this.loadingG.animationSpeed = 0.15;
            this.loadingG.visible = false; // Hide initially
            this.addChild(this.loadingG);
        }

        // --- Mode Selection UI ---
        const uiTextures = res?.mode_select_ui?.textures;
        if (!uiTextures) {
            console.error("mode_select_ui sheet failed to load or parse. Cannot create UI.");
            this.showError("Error: UI assets failed to load.");
            return;
        }

        // Mode Selection UI
        if (uiTextures["modeSelectTxt.gif"]) {
            this.modeTitle = new PIXI.Sprite(uiTextures["modeSelectTxt.gif"]);
            this.modeTitle.position.set(44, 83);
            this.addChild(this.modeTitle);
        }

        const titleY = this.modeTitle ? this.modeTitle.y + this.modeTitle.height : 83;

        this.playPcBtn = new ModeButton([
            uiTextures["playBtnPc0.gif"] || PIXI.Texture.EMPTY,
            uiTextures["playBtnPc1.gif"] || PIXI.Texture.EMPTY
        ]);
        this.playPcBtn.position.set(44, titleY + 40);
        this.playPcBtn.on('pointerup', () => this.loadStart(false));
        this.addChild(this.playPcBtn);

        this.playPcTxt = new PIXI.Sprite(uiTextures["playBtnPcTxt.gif"] || PIXI.Texture.EMPTY);
        this.playPcTxt.position.set(44, this.playPcBtn.y + this.playPcBtn.height + 2);
        this.addChild(this.playPcTxt);

        this.playSpBtn = new ModeButton([
            uiTextures["playBtnSp0.gif"] || PIXI.Texture.EMPTY,
            uiTextures["playBtnSp1.gif"] || PIXI.Texture.EMPTY
        ]);
        this.playSpBtn.position.set(44, this.playPcTxt.y + 20);
        this.playSpBtn.on('pointerup', () => this.loadStart(true));
        this.addChild(this.playSpBtn);

        this.playSpTxt = new PIXI.Sprite(uiTextures["playBtnSpTxt.gif"] || PIXI.Texture.EMPTY);
        this.playSpTxt.position.set(44, this.playSpBtn.y + this.playSpBtn.height + 2);
        this.addChild(this.playSpTxt);

        // Recommend Button & Modal
        const recommendBtnKey = `recommendBtn0${Constants.LANG === 'ja' ? '' : '_en'}.gif`;
        const recommendBtnDownKey = `recommendBtn1${Constants.LANG === 'ja' ? '' : '_en'}.gif`;
        this.recommendBtn = new RecommendButton([
            uiTextures[recommendBtnKey] || PIXI.Texture.EMPTY,
            uiTextures[recommendBtnDownKey] || PIXI.Texture.EMPTY
        ]);
        this.recommendBtn.position.set(40, this.playSpTxt.y + 100);
        this.recommendBtn.on('pointerup', () => this.recommendModalOpen());
        this.addChild(this.recommendBtn);

        const modalTexture = uiTextures[`recommendModal_${Constants.LANG}.gif`] || uiTextures[`recommendModal${Constants.LANG === 'ja' ? '' : '_en'}.gif`] || uiTextures['recommendModal.gif'];
        if (modalTexture) {
            this.recommendModal = new PIXI.Sprite(modalTexture);
            this.recommendModal.anchor.set(0.5);
            this.recommendModal.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y);
            this.recommendModal.interactive = true; // Block clicks behind
            this.recommendModal.visible = false;
            this.recommendModal.scale.set(0);
            this.addChild(this.recommendModal);

            if (uiTextures["recommendModalCloseBtn.gif"]) {
                this.recommendModalCloseBtn = new PIXI.Sprite(uiTextures["recommendModalCloseBtn.gif"]);
                this.recommendModalCloseBtn.anchor.set(1.0, 0.0); // Top-right corner
                this.recommendModalCloseBtn.position.set(this.recommendModal.width / 2 - 2, -this.recommendModal.height / 2 + 2);
                this.recommendModalCloseBtn.interactive = true;
                this.recommendModalCloseBtn.buttonMode = true;
                this.recommendModalCloseBtn.on('pointerup', () => this.recommendModalClose());
                this.recommendModal.addChild(this.recommendModalCloseBtn);
            }
        }
    }

    loop(delta) {
        super.loop(delta); // BaseScene loop

        // Rotate background texture
        if (this.loadingBg && this.loadingTexture) {
            this.loadingBgFlipCnt += delta;
            if (this.loadingBgFlipCnt >= 6) { // Approx every 6 frames at 60fps
                this.loadingBgFlipCnt = 0;
                if (this.loadingBg.name === "ura") {
                    this.loadingBg.name = "omote";
                    this.loadingTexture.rotate = 0;
                } else {
                    this.loadingBg.name = "ura";
                    this.loadingTexture.rotate = 8; // PIXI uses values 0, 2, 4, 6, 8, ... for rotation
                }
            }
        }
    }

    recommendModalOpen() {
        if (!this.recommendModal) return;
        this.recommendModal.visible = true;
        this.recommendModal.scale.set(0.05, 0.05); // Start small
        TweenMax.to(this.recommendModal.scale, 0.15, { y: 1, ease: Quint.easeOut });
        TweenMax.to(this.recommendModal.scale, 0.15, { x: 1, delay: 0.12, ease: Back.easeOut });
    }

    recommendModalClose() {
        if (!this.recommendModal) return;
        TweenMax.to(this.recommendModal.scale, 0.15, {
            x: 0, y: 0, ease: Quint.easeIn, onComplete: () => {
                if (this.recommendModal) this.recommendModal.visible = false;
            }
        });
    }

    loadStart(isLowMode) {
        gameState.lowModeFlg = isLowMode;

        // Hide selection UI, show loading animation
        if (this.modeTitle) this.modeTitle.visible = false;
        if (this.playPcBtn) this.playPcBtn.visible = false;
        if (this.playSpBtn) this.playSpBtn.visible = false;
        if (this.playPcTxt) this.playPcTxt.visible = false;
        if (this.playSpTxt) this.playSpTxt.visible = false;
        if (this.recommendBtn) this.recommendBtn.visible = false;
        if (this.recommendModal) this.recommendModal.visible = false;

        if (this.loadingG) {
            this.loadingG.visible = true;
            this.loadingG.play();
        }
        if (this.loadingBg && this.loadingTexture) {
            this.loadingBg.alpha = 1.0; // Make BG opaque during load
            this.loadingTexture.rotate = 0; // Reset rotation
        }

        // Add main game assets to the loader
        for (const key in Constants.RESOURCE_PATHS) {
            const path = Constants.RESOURCE_PATHS[key];
            const fullPath = `${gameState.baseUrl || Constants.BASE_PATH}${path}`;
            const isSound = path.endsWith('.mp3');

            if (!gameState.lowModeFlg || !isSound) { // Load non-sounds in low mode, all in normal mode
                // Check if already added by preloadLoader
                if (!this.resourceLoader.resources[key] && !this.preloadLoader.resources[key]) {
                    this.resourceLoader.add(key, fullPath);
                }
            }
        }

        this.resourceLoader.onError.once((err, loader, resource) => {
            console.error(`Main Load Error: ${err?.message || err} on resource: ${resource?.url || 'unknown'}`);
            this.showError("Failed to load game assets.");
        });

        this.resourceLoader.on('progress', this.loadProgress.bind(this));
        this.resourceLoader.on('complete', this.loadComplete.bind(this));
        this.resourceLoader.load();
    }

    loadProgress(loader, resource) {
        Utils.dlog(`Resource Loading: ${loader.progress.toFixed(0)}%`);
    }

    loadComplete(loader, resources) {
        Utils.dlog("Load Complete!");
        globals.resources = { ...this.preloadLoader.resources, ...resources }; // Combine preloaded and main resources

        if (!gameState.lowModeFlg) {
            Sound.setInitialVolumes(); // Set volumes after loading sounds

            // Add visibility change listener for sound pausing/resuming
            if (typeof document !== 'undefined') {
                document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
            }
        }

        // Fade out loading screen and switch scene
        const fadeTarget = this.loadingG || this; // Fade animation or whole scene
        TweenMax.to(fadeTarget, 0.3, {
            alpha: 0, delay: 0.2, onComplete: () => {
                this.switchScene(Constants.SCENE_NAMES.TITLE, TitleScene);
            }
        });
        if (this.loadingBg && fadeTarget !== this.loadingBg) {
            TweenMax.to(this.loadingBg, 0.3, { alpha: 0, delay: 0.2 });
        }
    }

    handleVisibilityChange() {
        if (typeof document === 'undefined') return;
        if (document.visibilityState === 'hidden') {
            Sound.pauseAll();
        } else if (document.visibilityState === 'visible') {
            Sound.resumeAll();
        }
    }

    // Override destroy for proper cleanup
    destroy(options) {
        if (typeof document !== 'undefined') {
            document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        }
        if (this.resourceLoader) {
            this.resourceLoader.reset(); // Clear loader listeners
            this.resourceLoader = null;
        }
        if (this.preloadLoader) {
            this.preloadLoader.reset();
            this.preloadLoader = null;
        }
        // PIXI container destroy will handle children
        super.destroy(options);
    }
}
