// TitleScene.js
import { BaseScene } from './BaseScene.js';
import * as Constants from './constants.js';
import { gameState, saveHighScore } from './gameState.js';
import * as Utils from './utils.js';
import * as Sound from './soundManager.js';
import { StartButton } from './ui/StartButton.js';
import { HowtoButton } from './ui/HowtoButton.js';
import { StaffrollButton } from './ui/StaffrollButton.js';
import { TwitterButton } from './ui/TwitterButton.js';
import { StaffrollPanel } from './ui/StaffrollPanel.js'; // Import Panel
import { BigNumberDisplay } from './ui/BigNumberDisplay.js';
import { AdvScene } from './AdvScene.js'; // Import next scene

export class TitleScene extends BaseScene {
    constructor() {
        super(Constants.SCENE_NAMES.TITLE);

        // Initialize properties to null
        this.bg = null;
        this.titleGWrap = null;
        this.titleG = null;
        this.logo = null;
        this.subTitle = null;
        this.belt = null;
        this.startBtn = null;
        this.copyright = null;
        this.scoreTitleTxt = null;
        this.bigNumTxt = null; // High score display
        this.twitterBtn = null;
        this.howtoBtn = null;
        this.staffrollBtn = null;
        this.staffrollPanel = null; // Reference, created on demand
        this.cover = null;
        this.fadeOutBlack = null;

        this.introTimeline = null; // Store timeline reference
    }

    run() {
        Utils.dlog("TitleScene Run");

        // --- Check if resources are loaded ---
        const loadedResources = PIXI.loader?.resources; // Access the shared loader's resources
        if (!loadedResources) {
            console.error("TitleScene Error: PIXI.loader.resources is not available!");
            this.switchToScene(Constants.SCENE_NAMES.LOAD, LoadScene); // Go back? Or show error.
            return;
        }
        const uiResource = loadedResources.game_ui;
        const titleBgResource = loadedResources.title_bg;

        if (!uiResource || !uiResource.textures) {
             console.error("TitleScene Error: 'game_ui' resource not loaded or missing textures.");
             this.switchToScene(Constants.SCENE_NAMES.LOAD, LoadScene);
             return;
        }
        // --- End Check ---

        // --- Create Background ---
        const bgTexture = titleBgResource?.texture;
        if (bgTexture) {
            this.bg = new PIXI.extras.TilingSprite(bgTexture, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
            this.addChild(this.bg);
        } else {
            console.warn(`Title background texture resource 'title_bg' not found!`);
            const fallbackBg = new PIXI.Graphics().beginFill(0x111133).drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT).endFill();
            this.addChild(fallbackBg);
        }

        // --- Setup Rest of UI ---
        this.setupUI(); // Call setup method

        // --- Start Animation ---
        if (this.logo && this.subTitle && this.titleGWrap) {
            this.startIntroAnimation();
        } else {
             console.error("Cannot start intro animation because required UI elements failed to initialize.");
        }
    }

    // Setup UI elements, assuming resources are loaded
    setupUI() {
        Utils.dlog("Setting up TitleScene UI");
        const uiTextures = PIXI.loader.resources.game_ui.textures; // Assume checked in run()

        // Title GFX
        this.titleGWrap = new PIXI.Container();
        this.titleG = new PIXI.Sprite(uiTextures["titleG.gif"] || PIXI.Texture.EMPTY);
        this.titleGWrap.addChild(this.titleG);
        this.addChild(this.titleGWrap);

        // Logo
        this.logo = new PIXI.Sprite(uiTextures["logo.gif"] || PIXI.Texture.EMPTY);
        this.logo.anchor.set(0.5);
        this.addChild(this.logo);

        // Subtitle (Language Specific)
        const subTitleKey = `subTitle${Constants.LANG === 'ja' ? '' : 'En'}.gif`;
        this.subTitle = new PIXI.Sprite(uiTextures[subTitleKey] || PIXI.Texture.EMPTY);
        this.subTitle.anchor.set(0.5);
        this.addChild(this.subTitle);

        // Bottom Belt
        this.belt = new PIXI.Graphics().beginFill(0x000000).drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, 120).endFill();
        this.belt.y = Constants.GAME_DIMENSIONS.HEIGHT - 120;
        this.addChild(this.belt);

        // Start Button (Constructor accesses loader)
        this.startBtn = new StartButton();
        this.startBtn.on('start_game', this.titleStart.bind(this)); // Listen for custom event
        // this.startBtn.interactive is handled by the button itself and the intro animation
        this.startBtn.alpha = 0; // Start hidden
        this.addChild(this.startBtn);

        // Copyright
        this.copyright = new PIXI.Sprite(uiTextures["titleCopyright.gif"] || PIXI.Texture.EMPTY);
        this.copyright.y = Constants.GAME_DIMENSIONS.HEIGHT - (this.copyright.texture?.height || 10) - 6;
        this.addChild(this.copyright);

        // High Score Display
        this.scoreTitleTxt = new PIXI.Sprite(uiTextures["hiScoreTxt.gif"] || PIXI.Texture.EMPTY);
        this.scoreTitleTxt.position.set(32, this.copyright.y - 66);
        this.addChild(this.scoreTitleTxt);

        this.bigNumTxt = new BigNumberDisplay(10); // Constructor accesses loader
        this.bigNumTxt.position.set(this.scoreTitleTxt.x + this.scoreTitleTxt.width + 3, this.scoreTitleTxt.y - 2);
        this.bigNumTxt.setNum(gameState.highScore);
        this.addChild(this.bigNumTxt);

        // Twitter Button (Constructor accesses loader)
        this.twitterBtn = new TwitterButton(0); // 0 for high score tweet
        this.twitterBtn.position.set(Constants.GAME_DIMENSIONS.CENTER_X, this.copyright.y - (this.twitterBtn.texture?.height || 20) / 2 - 14);
        this.addChild(this.twitterBtn);

        // Howto Button (Constructor accesses loader)
        this.howtoBtn = new HowtoButton();
        this.howtoBtn.position.set(15, 10);
        this.howtoBtn.scale.y = 0;
        this.addChild(this.howtoBtn);

        // Staffroll Button (Constructor accesses loader)
        this.staffrollBtn = new StaffrollButton();
        this.staffrollBtn.position.set(Constants.GAME_DIMENSIONS.WIDTH - (this.staffrollBtn.texture?.width || 50) - 15, 10);
        this.staffrollBtn.scale.y = 0;
        this.staffrollBtn.on('show_staffroll', this.showStaffroll.bind(this));
        this.addChild(this.staffrollBtn);

        // Cover/Overlay
        const coverTexture = uiTextures["stagebgOver.gif"];
        if (coverTexture) {
            // Use PIXI.extras for v4
            this.cover = new PIXI.extras.TilingSprite(coverTexture, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
            this.addChild(this.cover);
        }

        // Fade Out Graphic
        this.fadeOutBlack = new PIXI.Graphics().beginFill(0x000000).drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT).endFill();
        this.fadeOutBlack.alpha = 0;
        this.fadeOutBlack.visible = false;
        this.addChild(this.fadeOutBlack);
    }

    startIntroAnimation() {
        Utils.dlog("Starting Title Intro Animation");

        // Initial states
        if(this.titleGWrap) this.titleGWrap.position.set(Constants.GAME_DIMENSIONS.WIDTH, 100);
        if(this.logo) {
            const logoInitialX = Constants.GAME_DIMENSIONS.CENTER_X;
            const logoInitialY = -this.logo.height;
            this.logo.position.set(logoInitialX, logoInitialY);
            this.logo.scale.set(2);
        }
        if(this.subTitle) {
            const subTitleInitialX = Constants.GAME_DIMENSIONS.CENTER_X;
            const subTitleInitialY = -(this.logo?.height || 0) - (this.subTitle.texture?.height || 20);
            this.subTitle.position.set(subTitleInitialX, subTitleInitialY);
            this.subTitle.scale.set(3);
        }
        if(this.howtoBtn) this.howtoBtn.scale.y = 0;
        if(this.staffrollBtn) this.staffrollBtn.scale.y = 0;
        if(this.startBtn) this.startBtn.alpha = 0;

        if (this.introTimeline) this.introTimeline.kill();

        this.introTimeline = new TimelineMax({
            onComplete: () => { Utils.dlog("Title Intro Animation Complete"); this.introTimeline = null; },
            onKill: () => { this.introTimeline = null; }
        });

        if (this.titleGWrap && this.titleG) {
            this.introTimeline.to(this.titleGWrap, 2, { x: Constants.GAME_DIMENSIONS.CENTER_X - this.titleG.width / 2 + 5, y: 20, ease: Quint.easeOut }, "+=0.0")
        }
        if (this.logo) {
            this.introTimeline
                .to(this.logo, 0.9, { y: 75, ease: Quint.easeIn }, "-=1.8")
                .to(this.logo.scale, 0.9, { x: 1, y: 1, ease: Quint.easeIn }, "<")
        }
        if (this.subTitle) {
            this.introTimeline
                .to(this.subTitle, 0.9, { y: 130, ease: Quint.easeIn }, "-=1.7")
                .to(this.subTitle.scale, 0.9, { x: 1, y: 1, ease: Quint.easeIn }, "<")
        }

        this.introTimeline.addCallback(() => Sound.play('voice_titlecall'), "-=0.5");

        if (this.startBtn) {
            this.introTimeline
                .to(this.startBtn, 0.1, { alpha: 1 }, "+=0.2")
                .addCallback(() => {
                    if(this.startBtn) {
                        this.startBtn.interactive = true;
                        this.startBtn.startFlashingAnimation?.(); // Correct method name
                    }
                }, "+=0.1");
        }
        if (this.howtoBtn) {
             this.introTimeline.to(this.howtoBtn.scale, 0.3, { y: 1, ease: Elastic.easeOut.config(1, 0.6) }, "+=0.2");
        }
        if (this.staffrollBtn) {
            this.introTimeline.to(this.staffrollBtn.scale, 0.3, { y: 1, ease: Elastic.easeOut.config(1, 0.6) }, "-=0.15");
        }
    }

    loop(delta) {
        super.loop(delta);
        if (this.bg?.tilePosition) {
            this.bg.tilePosition.x += 0.5 * delta * (60 / Constants.FPS);
        }
    }

    showStaffroll() {
        Utils.dlog("Showing Staffroll Panel...");
        if (!PIXI.loader?.resources?.game_ui?.textures) {
            console.error("Cannot show staffroll: game_ui textures not loaded!");
            return;
        }
        if (!this.staffrollPanel || this.staffrollPanel.destroyed) {
             this.staffrollPanel = new StaffrollPanel(); // Constructor accesses loader
        }
        if (this.staffrollPanel.valid) { // Only add if valid
            this.addChild(this.staffrollPanel);
        } else {
            console.error("StaffrollPanel failed to initialize, not adding.");
            // Optionally destroy the invalid panel instance
            if (this.staffrollPanel && !this.staffrollPanel.destroyed) {
                this.staffrollPanel.destroy();
                this.staffrollPanel = null;
            }
        }
    }

    titleStart() {
        Utils.dlog("Title Start triggered");
        if (!this.startBtn?.interactive) return;

        this.startBtn.interactive = false;
        this.startBtn.buttonMode = false;
        this.howtoBtn?.setEnabled?.(false);
        this.staffrollBtn?.setEnabled?.(false);
        this.twitterBtn?.setEnabled?.(false);

        this.fadeOutBlack.visible = true;
        this.fadeOutBlack.alpha = 0;
        TweenMax.to(this.fadeOutBlack, 1, {
            alpha: 1,
            onComplete: () => {
                // Reset Game State
                const playerData = PIXI.loader?.resources?.recipe?.data?.playerData;
                gameState.caDamage = playerData?.caDamage || 10;
                gameState.playerMaxHp = playerData?.maxHp || 3;
                gameState.playerHp = gameState.playerMaxHp;
                gameState.shootMode = playerData?.defaultShootName || 'normal';
                gameState.shootSpeed = playerData?.defaultShootSpeed || 'speed_normal';
                gameState.combo = 0;
                gameState.maxCombo = 0;
                gameState.score = 0;
                gameState.cagage = 0;
                gameState.stageId = 0;
                gameState.continueCnt = 0;
                gameState.akebonoCnt = 0;
                gameState.shortFlg = false;
                // --- End Reset ---
                this.switchScene(Constants.SCENE_NAMES.ADV, AdvScene);
            }
        });
    }

     destroy(options) {
         Utils.dlog("Destroying TitleScene");
         this.introTimeline?.kill();
         if(this.fadeOutBlack) TweenMax.killTweensOf(this.fadeOutBlack);
         if (this.staffrollPanel && !this.staffrollPanel.destroyed) {
             this.staffrollPanel.destroy({ children: true });
         }
         this.staffrollPanel = null;
         super.destroy({ children: true, texture: false, baseTexture: false });
     }
}