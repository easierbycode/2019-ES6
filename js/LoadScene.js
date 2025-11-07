// LoadScene.js
import { BaseScene } from './BaseScene.js';
import * as Constants from './constants.js';
import { gameState, loadHighScore } from './gameState.js';
import { globals } from './globals.js'; // Removed getResource, getTexture
import * as Utils from './utils.js';
import * as Sound from './soundManager.js';
import { ModeButton } from './ui/ModeButton.js';
import { RecommendButton } from './ui/RecommendButton.js';
import { TitleScene } from './TitleScene.js';

export class LoadScene extends BaseScene {
    constructor() {
        super(Constants.SCENE_NAMES.LOAD);

        this.loadingBg = null;
        this.loadingG = null; // The animated loading sprite
        this.loadingTexture = null; // Texture for the static BG
        this.loadingBgFlipCnt = 0;
        this.recommendModal = null;
        this.recommendModalCloseBtn = null;
        this.modeTitle = null; // Add modeTitle property for the check
        this.errorText = null; // For displaying errors

        // --- Listener Function/Binding Storage ---
        // Store references to the actual functions used as listeners
        this._boundPreloadErrorHandler = null;
        this._boundSetupCompleteListener = null;
        this._boundMainLoadErrorHandler = null;
        this._boundMainLoadCompleteListener = null;
        // Store references to the binding objects returned by .once()
        this._preloadErrorBinding = null;
        this._setupCompleteBinding = null;
        this._mainLoadErrorBinding = null;
        this._mainLoadCompleteBinding = null;
        // Store reference to the binding object returned by .add() for progress
        this._progressBinding = null;
        // Store reference to the binding object returned by .add() for progress
        this._progressBinding = null;
        // --- End Function/Binding Storage ---

        // Use the shared PIXI loader (v4 singleton)
        this.resourceLoader = PIXI.loader;

        // --- Bind event handler methods in the constructor ---
        this.loadStart = this.loadStart.bind(this);
        this.loadProgress = this.loadProgress.bind(this); // Bound for use with .off()
        this.loadComplete = this.loadComplete.bind(this);
        this.recommendModalOpen = this.recommendModalOpen.bind(this);
        this.recommendModalClose = this.recommendModalClose.bind(this);
        // setupModeSelection is NOT bound here, called directly or via arrow func
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        // -------------------------------------------------------

        loadHighScore();
    }

    run() {
        // *** ADD CHECK: Prevent re-running setup logic ***
        if (this.modeTitle) {
            Utils.dlog("LoadScene.run() called again after setup, skipping.");
            return;
        }
        // *** END CHECK ***

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

        // Add error handler specifically for the preload phase
        const preloadErrorHandler = (err, loader, resource) => {
             console.error(`Preload Error: ${err.message} on resource: ${resource?.url || 'unknown'}`);
             this.showError("Failed to load critical UI assets.");
             // Remove the success handler if preload fails
             if (this._boundSetupCompleteListener) {
                 loader.onComplete.off(this._boundSetupCompleteListener); // Use .off()
                 this._boundSetupCompleteListener = null;
             }
        };
        // Store the bound function reference
        this._boundPreloadErrorHandler = preloadErrorHandler.bind(this);
        // Use once and store the returned binding object
        this._preloadErrorBinding = this.resourceLoader.onError.once(this._boundPreloadErrorHandler);


        // Attach the 'complete' listener using 'once' and store the binding
        Utils.dlog(`Attaching 'complete' listener for setupModeSelection.`); // DEBUG LOG
        this._boundSetupCompleteListener = (loader, resources) => {
             Utils.dlog("LoadScene setup 'complete' listener (bound fn) fired."); // LOGGING
             // Remove the preload error handler using its binding
             if (this._preloadErrorBinding) {
                 this._preloadErrorBinding.detach();
                 this._preloadErrorBinding = null;
             }
             this._boundPreloadErrorHandler = null; // Clear function ref too

             // Call setup
             this.setupModeSelection(loader, resources);

             // Clear setup complete refs
             this._boundSetupCompleteListener = null;
             this._setupCompleteBinding = null; // We are currently executing this, so clear the binding ref
         };
         this._setupCompleteBinding = this.resourceLoader.once('complete', this._boundSetupCompleteListener);
         Utils.dlog("Attached 'complete' listener binding for setup.");

        // Always call load() if not currently loading.
        if (!this.resourceLoader.loading) {
            Utils.dlog("Calling preload phase loader.load()...");
            this.resourceLoader.load();
        } else {
            Utils.dlog("Preload phase loader already running, waiting for 'complete' event.");
        }
    }

     // Helper to display error message
     showError(message) {
         // Remove existing error message if any
         if (this.errorText && this.errorText.parent) {
            this.removeChild(this.errorText);
            this.errorText.destroy();
         }
         const errorStyle = new PIXI.TextStyle({ fill: 0xff0000, fontSize: 16, wordWrap: true, wordWrapWidth: Constants.GAME_DIMENSIONS.WIDTH - 20, align: 'center', stroke: 0xffffff, strokeThickness: 1 });
         this.errorText = new PIXI.Text(message, errorStyle);
         this.errorText.anchor.set(0.5);
         this.errorText.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y);
         this.addChild(this.errorText);
         // Hide loading indicator if error occurs
         if (this.loadingG) this.loadingG.visible = false;
     }


    // setupModeSelection no longer needs to be bound
    setupModeSelection(loader, resources) {
        Utils.dlog("--- setupModeSelection (Preload Complete) ---");
        Utils.dlog("Preload Complete. Resources available:", Object.keys(resources || loader.resources)); // List keys

        // Prevent running setup multiple times if 'complete' fires unexpectedly
        if (this.modeTitle) {
            Utils.dlog("setupModeSelection called again, skipping duplicate setup.");
            return;
        }

        // Access resources directly from the `resources` argument or `loader.resources`
        const res = resources || loader.resources; // Fallback to loader.resources

        // Loading BG (Should have .texture)
        if (!res.loading_bg || !res.loading_bg.texture) {
            console.error("loading_bg resource or texture missing!");
             this.showError("Error: Loading background missing.");
        } else {
            this.loadingTexture = res.loading_bg.texture;
            this.loadingBg = new PIXI.Sprite(this.loadingTexture);
            this.loadingBg.alpha = 0.09;
            this.loadingBg.name = "omote";
            this.addChild(this.loadingBg);
        }

        // Loading Animation - Access .texture directly for individual images
        const loadingFrames = [];
        if (res.loadingFrame0 && res.loadingFrame0.texture) loadingFrames.push(res.loadingFrame0.texture);
        if (res.loadingFrame1 && res.loadingFrame1.texture) loadingFrames.push(res.loadingFrame1.texture);
        if (res.loadingFrame2 && res.loadingFrame2.texture) loadingFrames.push(res.loadingFrame2.texture);

        if (loadingFrames.length > 0) {
            this.loadingG = new PIXI.extras.AnimatedSprite(loadingFrames);
            this.loadingG.anchor.set(0.5);
            this.loadingG.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y);
            this.loadingG.animationSpeed = 0.15;
            this.loadingG.visible = false; // Start hidden
            this.addChild(this.loadingG);
        } else {
            console.error("Loading animation frames failed to load!");
            const placeholder = new PIXI.Graphics().beginFill(0xff0000).drawCircle(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y, 30);
            this.addChild(placeholder);
            this.loadingG = placeholder;
             this.showError("Error: Loading animation missing.");
        }

        // --- Mode Selection UI ---
        const uiTextures = res.mode_select_ui?.textures;
        if (!uiTextures) {
            console.error("mode_select_ui sheet failed to load or parse. Cannot create UI.");
            this.showError("Error: UI assets failed to load.");
            return;
        }

        // Mode Title
        this.modeTitle = new PIXI.Sprite(uiTextures["modeSelectTxt.gif"] || PIXI.Texture.EMPTY);
        this.modeTitle.position.set(44, 83);
        this.addChild(this.modeTitle);

        // PC Button
        this.playPcBtn = new ModeButton([
            uiTextures["playBtnPc0.gif"],
            uiTextures["playBtnPc1.gif"]
        ]);
        this.playPcBtn.position.set(44, this.modeTitle.y + this.modeTitle.height + 40);
        this.playPcBtn.on('mode_selected', () => this.loadStart(false));
        this.addChild(this.playPcBtn);

        this.playPcTxt = new PIXI.Sprite(uiTextures["playBtnPcTxt.gif"]);
        this.playPcTxt.position.set(44, this.playPcBtn.y + this.playPcBtn.height + 2);
        this.addChild(this.playPcTxt);

        // SP Button
        this.playSpBtn = new ModeButton([
            uiTextures["playBtnSp0.gif"],
            uiTextures["playBtnSp1.gif"]
        ]);
        this.playSpBtn.position.set(44, this.playPcTxt.y + 20);
        this.playSpBtn.on('mode_selected', () => this.loadStart(true));
        this.addChild(this.playSpBtn);

        this.playSpTxt = new PIXI.Sprite(uiTextures["playBtnSpTxt.gif"]);
        this.playSpTxt.position.set(44, this.playSpBtn.y + this.playSpBtn.height + 2);
        this.addChild(this.playSpTxt);

        // Recommend Button
        const recommendBtnKey = `recommendBtn0${Constants.LANG === 'ja' ? '' : '_en'}.gif`;
        const recommendBtnDownKey = `recommendBtn1${Constants.LANG === 'ja' ? '' : '_en'}.gif`;
        this.recommendBtn = new RecommendButton([
            uiTextures[recommendBtnKey],
            uiTextures[recommendBtnDownKey]
        ]);
        this.recommendBtn.position.set(40, this.playSpTxt.y + 100);
        this.recommendBtn.on('show_recommend', this.recommendModalOpen); // Use bound method
        this.addChild(this.recommendBtn);

        // Modal setup
        const modalTextureKey = `recommendModal${Constants.LANG === 'ja' ? '' : '_en'}.gif`;
        const modalTexture = uiTextures[modalTextureKey] || uiTextures["recommendModal.gif"];
        const closeBtnTexture = uiTextures["recommendModalCloseBtn.gif"];

        if (modalTexture && modalTexture !== PIXI.Texture.EMPTY && closeBtnTexture && closeBtnTexture !== PIXI.Texture.EMPTY) {
            this.recommendModal = new PIXI.Sprite(modalTexture);
            this.recommendModal.anchor.set(0.5);
            this.recommendModal.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y);
            this.recommendModal.interactive = true;
            this.recommendModal.visible = false;
            this.recommendModal.scale.set(0);
            this.addChild(this.recommendModal);

            this.recommendModalCloseBtn = new PIXI.Sprite(closeBtnTexture);
            this.recommendModalCloseBtn.anchor.set(1.0, 0.0);
            const modalWidth = modalTexture.width;
            const modalHeight = modalTexture.height;
            this.recommendModalCloseBtn.position.set(modalWidth / 2 - 2, -modalHeight / 2 + 2);
            this.recommendModalCloseBtn.interactive = true;
            this.recommendModalCloseBtn.buttonMode = true;
            this.recommendModalCloseBtn.on('pointerup', this.recommendModalClose); // Use bound method
            this.recommendModal.addChild(this.recommendModalCloseBtn);
        } else {
            console.error("Recommendation modal textures missing from title_ui.json!");
        }
    }

    recommendModalOpen() {
        if (!this.recommendModal) return;
        Utils.dlog("Opening recommend modal");
        this.recommendModal.visible = true;
        this.recommendModal.scale.set(0.05, 0.05);
        TweenMax.to(this.recommendModal.scale, 0.15, { y: 1, ease: Quint.easeOut });
        TweenMax.to(this.recommendModal.scale, 0.15, { x: 1, delay: 0.12, ease: Back.easeOut.config(1.7) });
    }

    recommendModalClose() {
        if (!this.recommendModal) return;
        Utils.dlog("Closing recommend modal");
        TweenMax.to(this.recommendModal.scale, 0.15, {
            x: 0, y: 0, ease: Quint.easeIn, onComplete: () => {
                if (this.recommendModal) this.recommendModal.visible = false;
            }
        });
    }

    loadStart(isLowMode) {
        // *** ADD CHECK: Prevent re-running if already loading/loaded ***
        // Check if loader is active OR loading indicator is visible (indicating load has started)
        if (this.resourceLoader.loading || this.loadingG?.visible) {
            Utils.dlog(`LoadScene.loadStart() called again while already loading/loaded, skipping.`);
            return;
        }
        // *** END CHECK ***

        gameState.lowModeFlg = isLowMode;
        Utils.dlog(`Starting main load (Low Mode: ${isLowMode})`);

        // Hide mode selection UI immediately
        if (this.modeTitle) this.modeTitle.visible = false;
        if (this.playPcBtn) this.playPcBtn.visible = false;
        if (this.playSpBtn) this.playSpBtn.visible = false;
        if (this.playPcTxt) this.playPcTxt.visible = false;
        if (this.playSpTxt) this.playSpTxt.visible = false;
        if (this.recommendBtn) this.recommendBtn.visible = false;
        if (this.recommendModal) this.recommendModal.visible = false;

        if (this.loadingG) {
            this.loadingG.visible = true;
            if(this.loadingG.play) this.loadingG.play();
        }
        if (this.loadingBg) {
            this.loadingBg.alpha = 1.0;
            this.loadingBg.rotation = 0;
        }

        const loader = this.resourceLoader;
        const baseUrl = gameState.baseUrl || Constants.BASE_PATH;
        let assetsAdded = false;

        // --- Add Assets ---
        // Use a helper to avoid adding if already loaded
        const addAssetIfNeeded = (key, path) => {
            if (!loader.resources[key] && path) {
                Utils.dlog(`Adding to main load: ${key}`);
                loader.add(key, `${baseUrl}${path}`);
                return true;
            } else if (!path) {
                console.error(`Constants.RESOURCE_PATHS.${key} is not defined!`);
            }
            return false;
        };

        assetsAdded = addAssetIfNeeded('title_bg', Constants.RESOURCE_PATHS.title_bg) || assetsAdded;
        assetsAdded = addAssetIfNeeded('game_ui', Constants.RESOURCE_PATHS.game_ui) || assetsAdded;
        assetsAdded = addAssetIfNeeded('game_asset', Constants.RESOURCE_PATHS.game_asset) || assetsAdded;
        assetsAdded = addAssetIfNeeded('recipe', Constants.RESOURCE_PATHS.recipe) || assetsAdded;

        for (const key in Constants.RESOURCE_PATHS) {
            if (['mode_select_ui', 'loadingFrame0', 'loadingFrame1', 'loadingFrame2', 'loading_bg', 'title_bg', 'game_ui', 'game_asset', 'recipe'].includes(key) || loader.resources[key]) {
                continue;
            }

            const path = Constants.RESOURCE_PATHS[key];
            const isSound = /\.(mp3|wav|ogg)$/i.test(path);
            const isImage = /\.(png|jpg|jpeg|gif)$/i.test(path);

            if (gameState.lowModeFlg && isSound) continue;

            if (isSound || (isImage && (key.startsWith('stage_loop') || key.startsWith('stage_end')))) {
                assetsAdded = addAssetIfNeeded(key, path) || assetsAdded;
            }
        }
        // --- End Add Assets ---

        // --- Remove Old Listeners ---
        Utils.dlog("loadStart: Removing old listeners...");
        // Detach progress listener (added with add()) using its binding object
        if (this._progressBinding) {
            try {
                this._progressBinding.detach();
                Utils.dlog("Detached progress listener binding.");
            } catch (e) {
                console.warn(`Error detaching progress listener binding in loadStart: ${e.message}`);
            }
            this._progressBinding = null; // Clear binding reference after detaching
        } else {
            Utils.dlog("Progress listener binding not found or already detached.");
        }
        // Also clear the function reference if necessary
        // this.loadProgress = null; // Optionally clear function ref if no longer needed

        // Detach 'once' listeners using their binding objects if they exist
        if (this._setupCompleteBinding) {
             try {
                this._setupCompleteBinding.detach();
                Utils.dlog("Detached setup complete binding.");
             } catch (e) { console.warn("Error detaching setup complete binding in loadStart:", e); }
             this._setupCompleteBinding = null;
             this._boundSetupCompleteListener = null;
        }
        if (this._mainLoadCompleteBinding) {
             try {
                this._mainLoadCompleteBinding.detach();
                Utils.dlog("Detached main load complete binding.");
             } catch (e) { console.warn("Error detaching main load complete binding in loadStart:", e); }
             this._mainLoadCompleteBinding = null;
             this._boundMainLoadCompleteListener = null;
        }
        if (this._preloadErrorBinding) {
             try {
                this._preloadErrorBinding.detach();
                Utils.dlog("Detached preload error binding.");
             } catch (e) { console.warn("Error detaching preload error binding in loadStart:", e); }
             this._preloadErrorBinding = null;
             this._boundPreloadErrorHandler = null;
        }
        if (this._mainLoadErrorBinding) {
             try {
                this._mainLoadErrorBinding.detach();
                Utils.dlog("Detached main load error binding.");
             } catch (e) { console.warn("Error detaching main load error binding in loadStart:", e); }
             this._mainLoadErrorBinding = null;
             this._boundMainLoadErrorHandler = null;
        }
        // --- End Remove Old ---

        // --- Add New Listeners ---
        // Error handler for the main load phase
        const mainLoadErrorHandler = (err, ldr, res) => {
            console.error(`Main Load Error: ${err.message} on resource: ${res?.url || 'unknown'}`);
            this.showError("Failed to load game assets.");
            // Remove the success handler binding if load fails
            if (this._mainLoadCompleteBinding) {
                this._mainLoadCompleteBinding.detach();
                this._mainLoadCompleteBinding = null;
            }
            // Clear refs
            this._boundMainLoadCompleteListener = null;
            this._boundMainLoadErrorHandler = null;
            this._mainLoadErrorBinding = null; // Currently executing this, clear binding ref
        };
        this._boundMainLoadErrorHandler = mainLoadErrorHandler.bind(this);

        // Complete handler for the main load phase
        this._boundMainLoadCompleteListener = (completedLoader, loadedResources) => {
            Utils.dlog("Main load 'complete' listener (bound fn) fired."); // LOGGING
            // Remove the error handler binding on success
            if (this._mainLoadErrorBinding) {
                this._mainLoadErrorBinding.detach();
                this._mainLoadErrorBinding = null;
            }
            this._boundMainLoadErrorHandler = null; // Clear function ref

            // Call actual complete logic
            this.loadComplete(completedLoader, loadedResources);

            // Clear complete refs
            this._boundMainLoadCompleteListener = null;
            this._mainLoadCompleteBinding = null; // We are executing this, clear binding ref
        };

        // Add progress listener by function ref (for easier removal if needed)
        loader.onProgress.add(this.loadProgress);

        // Add 'once' listeners and store bindings
        this._mainLoadErrorBinding = loader.onError.once(this._boundMainLoadErrorHandler);
        this._mainLoadCompleteBinding = loader.onComplete.once(this._boundMainLoadCompleteListener);
        Utils.dlog("Attached 'progress', 'error', and 'complete' listeners for main load.");

         // Store the binding for the progress listener
         this._progressBinding = loader.onProgress.handlers()[loader.onProgress.handlers().length - 1]; // Get the last added binding
         if (!this._progressBinding) {
             console.error("Failed to get binding for progress listener!");
         }
         // --- End Add New ---

        // Always call load() if not currently loading.
        if (!loader.loading) {
            Utils.dlog("Calling main loader.load()");
            loader.load();
        } else {
            Utils.dlog("Main loader is already loading, waiting for 'complete' event.");
        }
    }

    loadProgress(loader, resource) {
        Utils.dlog(`Resource Loading: ${loader.progress.toFixed(0)}% (${resource?.name || resource?.url})`);
        // TODO: Update a visual progress bar if desired
    }

    loadComplete(loader, resources) {
        Utils.dlog("Load Complete!");

        // Remove progress listener (using binding reference)
        if (this._progressBinding) {
             try {
                this._progressBinding.detach();
                Utils.dlog("Detached progress listener binding in loadComplete.");
             } catch (e) { console.warn("Error detaching progress binding in loadComplete:", e); }
             this._progressBinding = null;
        }
        // 'once' listeners (error, complete) remove themselves automatically after firing.
        // We clear the references in their respective handlers.
        this._boundMainLoadCompleteListener = null;
        this._mainLoadCompleteBinding = null;
        this._boundMainLoadErrorHandler = null;
        this._mainLoadErrorBinding = null;

        if (!gameState.lowModeFlg) {
             Sound.setInitialVolumes();
             document.removeEventListener("visibilitychange", this.handleVisibilityChange); // Remove previous if any
             document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
        }

        const fadeTarget = this.loadingG || this;
        TweenMax.to(fadeTarget, 0.3, {
            alpha: 0, delay: 0.2, onComplete: () => {
                this.switchScene(Constants.SCENE_NAMES.TITLE, TitleScene);
            }
        });
        if (this.loadingBg) {
            TweenMax.to(this.loadingBg, 0.3, { alpha: 0, delay: 0.2 });
        }
    }

    handleVisibilityChange() {
        if (typeof document === 'undefined') return;
        Utils.dlog(`Visibility changed to: ${document.visibilityState}`);
        try {
            if (document.hidden || document.visibilityState === 'hidden') {
                Sound.pauseAll();
            } else if (document.visibilityState === 'visible') {
                Sound.resumeAll();
            }
        } catch (e) {
             console.error("Error handling visibility change:", e);
        }
    }

    destroy(options) {
        Utils.dlog("Destroying LoadScene");
        // Clean up shared loader listeners added by this scene
        if (this.resourceLoader) {
        // Use .detach() with the binding reference for 'once' and 'add' listeners.
            if (this._progressBinding) {
                 try { this._progressBinding.detach(); } catch (e) { console.warn("Error detaching progress listener binding:", e); }
                 this._progressBinding = null;
                 this.loadProgress = null; // Clear function ref too
            }
            if (this._setupCompleteBinding) {
                try { this._setupCompleteBinding.detach(); } catch (e) { console.warn("Error detaching setup complete listener:", e); }
                this._setupCompleteBinding = null;
                this._boundSetupCompleteListener = null;
            }
            if (this._mainLoadCompleteBinding) {
                 try { this._mainLoadCompleteBinding.detach(); } catch (e) { console.warn("Error detaching main complete listener:", e); }
                 this._mainLoadCompleteBinding = null;
                 this._boundMainLoadCompleteListener = null;
            }
            if (this._preloadErrorBinding) {
                 try { this._preloadErrorBinding.detach(); } catch (e) { console.warn("Error detaching preload error listener:", e); }
                 this._preloadErrorBinding = null;
                 this._boundPreloadErrorHandler = null;
            }
            if (this._mainLoadErrorBinding) {
                 try { this._mainLoadErrorBinding.detach(); } catch (e) { console.warn("Error detaching main error listener:", e); }
                 this._mainLoadErrorBinding = null;
                 this._boundMainLoadErrorHandler = null;
            }
        }
        if (typeof document !== 'undefined') {
            document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        }

        // --- Safely remove button listeners ---
        if (this.recommendModalCloseBtn) {
             try { this.recommendModalCloseBtn.off('pointerup', this.recommendModalClose); } catch(e) { console.warn("Error removing modal close listener", e); }
        }
        if (this.playPcBtn) {
             try { this.playPcBtn.off('mode_selected'); } catch(e) { console.warn("Error removing PC button listener", e); }
        }
        if (this.playSpBtn) {
              try { this.playSpBtn.off('mode_selected'); } catch(e) { console.warn("Error removing SP button listener", e); }
        }
        if (this.recommendBtn) {
              try { this.recommendBtn.off('show_recommend'); } catch(e) { console.warn("Error removing recommend button listener", e); }
        }
        // --- End button listener removal ---

        super.destroy(options);
    }
}
