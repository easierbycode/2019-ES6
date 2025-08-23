// EndingScene.js
import { BaseScene } from './BaseScene.js';
import * as Constants from './constants.js';
import { gameState, saveHighScore } from './gameState.js';
import * as Utils from './utils.js';
import * as Sound from './soundManager.js';
import { BigNumberDisplay } from './ui/BigNumberDisplay.js';
import { TwitterButton } from './ui/TwitterButton.js';
import { GotoTitleButton } from './ui/GotoTitleButton.js';
import { TitleScene } from './TitleScene.js'; // Import next scene

export class EndingScene extends BaseScene {
    constructor() {
        super(Constants.SCENE_NAMES.ENDING); // Or RESULT?

        // Initialize properties
        this.bg = null;
        this.congraInfoBg = null;
        this.congraTxt = null;
        this.congraTxtEffect = null;
        this.newRecordSprite = null;
        this.scoreContainer = null;
        this.scoreTitleTxt = null;
        this.scoreDisplay = null;
        this.twitterBtn = null;
        this.gotoTitleBtn = null;

        this.entryTimeline = null;
        this.isNewRecord = false;
    }

    run() {
        Utils.dlog("EndingScene Run");

        // --- Check Resources ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;

        if (!uiTextures) {
            console.error("EndingScene Error: 'game_ui' resource not loaded.");
            this.switchToScene(Constants.SCENE_NAMES.TITLE, TitleScene);
            return;
        }
        // --- End Check ---

        this.isNewRecord = gameState.score > gameState.beforeHighScore; // Use beforeHighScore set in loadHighScore
        if (this.isNewRecord) {
            Utils.dlog("New High Score achieved!");
            saveHighScore();
        }

        // Create Background Animation
        const bgFrames = ["congraBg0.gif", "congraBg1.gif", "congraBg2.gif"]
            .map(name => uiTextures[name])
            .filter(tex => tex && tex !== PIXI.Texture.EMPTY);

        if (bgFrames.length > 0) {
            this.bg = new PIXI.extras.AnimatedSprite(bgFrames); // PIXI v4
            this.bg.animationSpeed = 0.1;
            this.bg.alpha = 0;
            this.bg.play();
            this.addChild(this.bg);
        } else {
            console.warn("EndingScene background animation frames missing.");
            const fallbackBg = new PIXI.Graphics().beginFill(0x111133).drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT).endFill();
            this.addChild(fallbackBg);
        }

        // Congratulation Text Animation
        const congraFrames = ["congraTxt0.gif", "congraTxt1.gif", "congraTxt2.gif"]
            .map(name => {
                const tex = uiTextures[name];
                if (tex && tex !== PIXI.Texture.EMPTY) {
                    tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                    return tex;
                }
                return null;
            })
            .filter(tex => tex);

        if (congraFrames.length > 0) {
            this.congraTxt = new PIXI.extras.AnimatedSprite(congraFrames);
            this.congraTxt.animationSpeed = 0.2;
            this.congraTxt.anchor.set(0.5);
            this.congraTxt.play();
            this.addChild(this.congraTxt);

            this.congraTxtEffect = new PIXI.Sprite(congraFrames[0]);
            this.congraTxtEffect.anchor.set(0.5);
            this.congraTxtEffect.visible = false;
            this.addChild(this.congraTxtEffect);
        } else {
             console.warn("EndingScene congratulation text animation frames missing.");
        }

        // Info Panel Background
        this.congraInfoBg = new PIXI.Sprite(uiTextures["congraInfoBg.gif"] || PIXI.Texture.EMPTY);
        this.congraInfoBg.anchor.set(0, 0.5);
        this.congraInfoBg.position.set(0, 210);
        this.congraInfoBg.alpha = 0;
        this.addChild(this.congraInfoBg);

        // Score Display Area
        this.scoreContainer = new PIXI.Container();
        this.scoreContainer.position.set(32, Constants.GAME_DIMENSIONS.CENTER_Y - 23);
        this.scoreContainer.scale.set(1, 0);
        this.addChild(this.scoreContainer);

        this.scoreTitleTxt = new PIXI.Sprite(uiTextures["scoreTxt.gif"] || PIXI.Texture.EMPTY);
        this.scoreContainer.addChild(this.scoreTitleTxt);

        this.scoreDisplay = new BigNumberDisplay(10); // Constructor handles textures
        this.scoreDisplay.position.set(this.scoreTitleTxt.x + this.scoreTitleTxt.width + 3, this.scoreTitleTxt.y - 2);
        this.scoreDisplay.setNum(gameState.score);
        this.scoreContainer.addChild(this.scoreDisplay);

        // "New Record" Sprite (Conditional)
        if (this.isNewRecord) {
            this.newRecordSprite = new PIXI.Sprite(uiTextures["continueNewrecord.gif"] || PIXI.Texture.EMPTY);
            this.newRecordSprite.position.set(0, Constants.GAME_DIMENSIONS.CENTER_Y - 40);
            this.newRecordSprite.scale.set(1, 0);
            this.addChild(this.newRecordSprite);
        }

        // Twitter Button (Constructor handles textures)
        this.twitterBtn = new TwitterButton(1); // Type 1 for current score
        this.twitterBtn.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y + 15);
        this.twitterBtn.scale.set(0);
        this.addChild(this.twitterBtn);

        // Goto Title Button (Constructor handles textures)
        this.gotoTitleBtn = new GotoTitleButton();
        this.gotoTitleBtn.position.set(Constants.GAME_DIMENSIONS.CENTER_X - this.gotoTitleBtn.width / 2, Constants.GAME_DIMENSIONS.HEIGHT - this.gotoTitleBtn.height - 13);
        this.gotoTitleBtn.on('goto_title', this.nextSceneAnim.bind(this));
        this.addChild(this.gotoTitleBtn);

        // Start Entry Animation
        this.startAnimation();
    }

    startAnimation() {
        if (this.entryTimeline) this.entryTimeline.kill();

        // Initial states
        const congraStartX = Constants.GAME_DIMENSIONS.WIDTH + (this.congraTxt?.width || 200) / 2;
        const congraMidY = Constants.GAME_DIMENSIONS.CENTER_Y - 32;
        const congraFinalY = Constants.GAME_DIMENSIONS.CENTER_Y - 60;
        const blurFilter = new PIXI.filters.BlurFilter(10);

        if(this.bg) this.bg.filters = [blurFilter];
        if(this.congraTxt) {
             this.congraTxt.scale.set(5);
             this.congraTxt.position.set(congraStartX, congraMidY);
        }
        if(this.congraTxtEffect) {
            this.congraTxtEffect.position.set(Constants.GAME_DIMENSIONS.CENTER_X, congraFinalY);
            this.congraTxtEffect.visible = false;
            this.congraTxtEffect.alpha = 1;
            this.congraTxtEffect.scale.set(1);
        }
        if(this.congraInfoBg) this.congraInfoBg.alpha = 0;
        if(this.scoreContainer) this.scoreContainer.scale.y = 0;
        if(this.newRecordSprite) this.newRecordSprite.scale.y = 0;
        if(this.twitterBtn) this.twitterBtn.scale.set(0);

        this.entryTimeline = new TimelineMax({
             onKill: () => { this.entryTimeline = null; }
        });

        if (this.congraTxt) {
             this.entryTimeline.to(this.congraTxt, 2.5, { x: -(this.congraTxt.width - Constants.GAME_DIMENSIONS.WIDTH), ease: Linear.easeNone });
        }

        if (this.bg) {
            this.entryTimeline
                .addCallback(() => Sound.play('voice_congra'), "-=2.0")
                .to(this.bg, 0.8, { alpha: 1 }, "-=0.3")
                .to(blurFilter, 0.8, { blur: 0, onUpdate:()=>{ if(this.bg) this.bg.filters = [blurFilter] } }, "<");
        }

        if (this.congraTxt && this.congraTxtEffect) {
             this.entryTimeline
                 .addCallback(() => {
                     Sound.play('se_ca');
                     this.congraTxt.position.set(Constants.GAME_DIMENSIONS.CENTER_X, congraFinalY);
                     this.congraTxt.scale.set(3);
                 }, "+=0")
                 .to(this.congraTxt.scale, 0.5, { x: 1, y: 1, ease: Expo.easeIn })
                 .set(this.congraTxtEffect, { visible: true }, "+=0")
                 .to(this.congraTxtEffect.scale, 1.0, { x: 1.5, y: 1.5, ease: Expo.easeOut }, "<")
                 .to(this.congraTxtEffect, 1.0, { alpha: 0, ease: Expo.easeOut }, "<");
        }

        if(this.congraInfoBg) this.entryTimeline.to(this.congraInfoBg, 0.3, { alpha: 1 }, "-=0.8");
        if (this.newRecordSprite) this.entryTimeline.to(this.newRecordSprite.scale, 0.5, { y: 1, ease: Elastic.easeOut.config(1, 0.6) }, "-=0.2");
        if(this.scoreContainer) this.entryTimeline.to(this.scoreContainer.scale, 0.5, { y: 1, ease: Elastic.easeOut.config(1, 0.6) }, "-=0.25");
        if(this.twitterBtn) this.entryTimeline.to(this.twitterBtn.scale, 0.5, { x: 1, y: 1, ease: Elastic.easeOut.config(1, 0.6) }, "-=0.25");
    }

    nextSceneAnim() {
        if (this.gotoTitleBtn) this.gotoTitleBtn.setEnabled(false);
        if (this.twitterBtn) this.twitterBtn.setEnabled(false);

        TweenMax.to(this, 1.0, {
            alpha: 0,
            delay: 0.3,
            onComplete: () => {
                this.switchScene(Constants.SCENE_NAMES.TITLE, TitleScene);
            }
        });
    }

    loop(delta) {
        super.loop(delta);
    }

    destroy(options) {
        this.entryTimeline?.kill();
        TweenMax.killTweensOf(this); // Kill scene fade if active
        super.destroy({ children: true, texture: false, baseTexture: false }); // Ensure children destroyed
    }
}