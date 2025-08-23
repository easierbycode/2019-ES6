// ContinueScene.js
import { BaseScene } from './BaseScene.js';
import * as Constants from './constants.js';
// Import specific constants from constants.js
import { SHOOT_MODES, SHOOT_SPEEDS } from './constants.js';
import { gameState, saveHighScore } from './gameState.js';
import * as Utils from './utils.js';
import * as Sound from './soundManager.js';
import { ContinueYesButton } from './ui/ContinueYesButton.js';
import { ContinueNoButton } from './ui/ContinueNoButton.js';
import { BigNumberDisplay } from './ui/BigNumberDisplay.js';
import { TwitterButton } from './ui/TwitterButton.js';
import { GotoTitleButton } from './ui/GotoTitleButton.js';
import { TitleScene } from './TitleScene.js';
import { GameScene } from './GameScene.js';
import { LoadScene } from './LoadScene.js'; // For error fallback

export class ContinueScene extends BaseScene {
    constructor() {
        // *** FIX: Use SCENE_NAMES.RESULT as the ID passed to super ***
        super(Constants.SCENE_NAMES.RESULT);

        this.bg = null;
        this.continueTitle = null;
        this.loseFace = null;
        this.cntTextBg = null;
        this.cntText = null;
        this.yesBtn = null;
        this.noBtn = null;
        this.commentText = null;
        this.gameOverTxt = null;
        this.newRecordSprite = null;
        this.scoreContainer = null;
        this.scoreTitleTxt = null;
        this.scoreDisplay = null;
        this.twitterBtn = null;
        this.gotoTitleBtn = null;

        this.countdown = 9;
        this.countdownTimeline = null;
        this.sceneSwitch = 0;

        // Texture arrays
        this.countdownTextures = [];
        this.loseFaceTextures = { normal: [], gray: [], smile: [] };
    }

    run() {
        Utils.dlog("ContinueScene Run");
        Sound.bgmPlay('bgm_continue'); // Simpler play

        // --- Check Resources ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        const recipeResource = PIXI.loader?.resources?.recipe;

        if (!uiTextures || !recipeResource?.data) {
            console.error("ContinueScene Error: Required resources (game_ui, recipe) not loaded.");
            this.switchToScene(Constants.SCENE_NAMES.TITLE, TitleScene); // Go back to title on error
            return;
        }
        // --- End Check ---

        // Preload textures needed by the scene
        for (let i = 0; i <= 9; i++) {
            this.countdownTextures[i] = uiTextures[`countdown${i}.gif`] || PIXI.Texture.EMPTY;
        }
        this.loseFaceTextures.normal = [uiTextures["continueFace0.gif"], uiTextures["continueFace1.gif"]].filter(t=>t && t !== PIXI.Texture.EMPTY);
        this.loseFaceTextures.gray = [uiTextures["continueFace2.gif"]].filter(t=>t && t !== PIXI.Texture.EMPTY);
        this.loseFaceTextures.smile = [uiTextures["continueFace3.gif"]].filter(t=>t && t !== PIXI.Texture.EMPTY);


        // --- Create UI ---
        this.bg = new PIXI.Graphics().beginFill(0x000000).drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT).endFill();
        this.addChild(this.bg);

        this.continueTitle = new PIXI.Sprite(uiTextures["continueTitle.gif"] || PIXI.Texture.EMPTY);
        this.continueTitle.position.set(0, 70);
        this.addChild(this.continueTitle); // Add title to stage

        if(this.loseFaceTextures.normal.length > 0) {
            this.loseFace = new PIXI.extras.AnimatedSprite(this.loseFaceTextures.normal); // PIXI v4
            this.loseFace.position.set(20, this.continueTitle.y + this.continueTitle.height + 38);
            this.loseFace.animationSpeed = 0.05;
            this.loseFace.play();
            this.addChild(this.loseFace);
        } else {
            console.warn("ContinueScene: Lose face textures missing.");
        }

        this.cntTextBg = new PIXI.Sprite(uiTextures["countdownBg.gif"] || PIXI.Texture.EMPTY);
        this.cntTextBg.position.set((this.loseFace?.x || 0) + (this.loseFace?.width || 0) + 15, this.continueTitle.y + this.continueTitle.height + 30);
        this.addChild(this.cntTextBg);

        this.cntText = new PIXI.Sprite(this.countdownTextures[9] || PIXI.Texture.EMPTY);
        this.cntText.position.set(this.cntTextBg.x, this.cntTextBg.y);
        this.cntText.alpha = 0;
        this.addChild(this.cntText);

        // Buttons (Constructors access textures safely)
        this.yesBtn = new ContinueYesButton();
        this.yesBtn.position.set(Constants.GAME_DIMENSIONS.CENTER_X - this.yesBtn.width / 2 - 50, Constants.GAME_DIMENSIONS.CENTER_Y + 70);
        this.yesBtn.on('continue_yes', this.selectYes.bind(this));
        this.addChild(this.yesBtn);

        this.noBtn = new ContinueNoButton();
        this.noBtn.position.set(Constants.GAME_DIMENSIONS.CENTER_X - this.noBtn.width / 2 + 50, Constants.GAME_DIMENSIONS.CENTER_Y + 70);
        this.noBtn.on('continue_no', this.selectNo.bind(this));
        this.addChild(this.noBtn);

        // Comment Text
        const commentKey = Constants.LANG === 'ja' ? "continueComment" : "continueCommentEn";
        const comments = recipeResource.data[commentKey] || ["Continue?"];
        const comment = comments[Math.floor(Math.random() * comments.length)];
        const commentStyle = new PIXI.TextStyle({
            fontFamily: "sans-serif", fontSize: 15, fontWeight: "bold",
            lineHeight: 17, fill: 0xFFFFFF, wordWrap: true,
            wordWrapWidth: 230, breakWords: true, align: 'center', padding: 10
        });
        this.commentText = new PIXI.Text(comment, commentStyle);
        this.commentText.anchor.set(0.5, 0);
        this.commentText.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.HEIGHT - 120);
        this.addChild(this.commentText);

        // Fade-in & Start Countdown
        [this.continueTitle, this.loseFace, this.cntTextBg, this.yesBtn, this.noBtn, this.commentText].forEach(el => { if(el) el.alpha = 0; });
        TweenMax.to([this.continueTitle, this.loseFace, this.cntTextBg, this.yesBtn, this.noBtn, this.commentText].filter(el => el), 0.8, { alpha: 1 });
        this.startCountdown();
    }

    startCountdown() {
        this.countdown = 9;
        if(this.countdownTimeline) this.countdownTimeline.kill(); // Ensure previous is stopped
        this.countdownTimeline = null;
        this.onCountdownTick();
    }

    onCountdownTick() {
        if (this.countdown < 0) {
             this.selectNo();
             return;
        }
        if (this.countdownTimeline) this.countdownTimeline.kill();

        this.countdownTimeline = new TimelineMax({
            onComplete: this.onCountdownTick,
            onCompleteScope: this
        });

        this.countdownTimeline
            .to(this.cntText, 0.4, { alpha: 0, delay: 0.4 })
            .addCallback(() => {
                if (this.countdown >= 0 && this.countdown <= 9 && this.cntText) {
                    this.cntText.texture = this.countdownTextures[this.countdown] || PIXI.Texture.EMPTY;
                    Sound.play(`voice_countdown${this.countdown}`);
                }
                this.countdown--;
            }, "+=0")
            .to(this.cntText, 0.8, { alpha: 1 });
    }

    selectYes() {
        if (this.sceneSwitch !== 0) return;
        Utils.dlog("Continue Selected: YES");
        this.stopCountdown();
        this.sceneSwitch = 1;

        const yesVoiceIndex = Math.floor(Math.random() * 3);
        Sound.play(`g_continue_yes_voice${yesVoiceIndex}`);

        if(this.loseFace && this.loseFaceTextures.smile.length > 0) {
            this.loseFace.textures = this.loseFaceTextures.smile;
            this.loseFace.play();
        }

        this.nextSceneAnim();
    }

    selectNo() {
        if (this.sceneSwitch !== 0 && this.countdownTimeline) return;
        Utils.dlog("Continue Selected: NO / TIMEOUT");
        this.stopCountdown();
        this.sceneSwitch = 0;

        Sound.stop('bgm_continue');
        Sound.play('bgm_gameover'); // PIXI.sound handles low mode check
        Sound.play('voice_gameover');

        // Hide continue elements
        if(this.yesBtn) this.yesBtn.visible = false;
        if(this.noBtn) this.noBtn.visible = false;
        if(this.commentText) this.commentText.visible = false;

        if(this.cntText) {
            this.cntText.texture = this.countdownTextures[0] || PIXI.Texture.EMPTY;
            this.cntText.alpha = 0.2;
        }
        if (this.loseFace && this.loseFaceTextures.gray.length > 0) {
            this.loseFace.textures = this.loseFaceTextures.gray;
            this.loseFace.stop();
        }

        const uiTextures = PIXI.loader?.resources?.game_ui?.textures;
        if (!uiTextures) return; // Cannot show game over without UI

        this.gameOverTxt = new PIXI.Sprite(uiTextures["continueGameOver.gif"] || PIXI.Texture.EMPTY);
        this.gameOverTxt.anchor.set(0.5);
        this.gameOverTxt.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y - 35);
        this.gameOverTxt.alpha = 0;
        this.addChild(this.gameOverTxt);

        const gameOverTimeline = new TimelineMax({
            onComplete: this.showGameOverScore,
            onCompleteScope: this
        });

        const startY = this.y;
        gameOverTimeline
             .to(this, 0.07, { y: startY + 10 })
             .addCallback(() => { if (this.bg) this.bg.tint = 0x770000; }, "+=0")
             .to(this, 0.07, { y: startY - 5 })
             .addCallback(() => { if (this.bg) this.bg.tint = 0x000000; }, "+=0")
             .to(this, 0.07, { y: startY + 3 })
             .addCallback(() => { if (this.bg) this.bg.tint = 0x770000; }, "+=0")
             .to(this, 0.07, { y: startY })
             .addCallback(() => { if (this.bg) this.bg.tint = 0x000000; }, "+=0");

        gameOverTimeline.to(this.gameOverTxt, 1.0, { alpha: 1.5, delay: 0.3 }, 0);

        const noVoiceIndex = Math.floor(Math.random() * 2);
        gameOverTimeline.addCallback(() => Sound.play(`g_continue_no_voice${noVoiceIndex}`), "+=0");
    }

    showGameOverScore() {
        Utils.dlog("Showing Game Over Score");
        const uiTextures = PIXI.loader?.resources?.game_ui?.textures;
        if (!uiTextures) return;

        const isNewRecord = gameState.score > gameState.beforeHighScore;
        let scoreYPos = (this.loseFace?.y || 0) + (this.loseFace?.height || 0) + 30;

        if (isNewRecord) {
            Utils.dlog("New High Score on Game Over!");
            this.newRecordSprite = new PIXI.Sprite(uiTextures["continueNewrecord.gif"] || PIXI.Texture.EMPTY);
            this.newRecordSprite.position.set(0, (this.loseFace?.y || 0) + (this.loseFace?.height || 0) + 10);
            this.addChild(this.newRecordSprite);
            this.newRecordSprite.alpha = 0;
            TweenMax.to(this.newRecordSprite, 0.5, { alpha: 1, delay: 0.2 });
            scoreYPos = this.newRecordSprite.y + this.newRecordSprite.height + 10;
        }

        this.scoreContainer = new PIXI.Container();
        this.scoreContainer.position.set(32, scoreYPos);
        this.scoreContainer.alpha = 0;
        this.addChild(this.scoreContainer);

        this.scoreTitleTxt = new PIXI.Sprite(uiTextures["scoreTxt.gif"] || PIXI.Texture.EMPTY);
        this.scoreContainer.addChild(this.scoreTitleTxt);

        this.scoreDisplay = new BigNumberDisplay(10); // Constructor handles textures
        this.scoreDisplay.position.set(this.scoreTitleTxt.x + this.scoreTitleTxt.width + 3, this.scoreTitleTxt.y - 2);
        this.scoreDisplay.setNum(gameState.score);
        this.scoreContainer.addChild(this.scoreDisplay);

        this.twitterBtn = new TwitterButton(1); // Constructor handles textures
        this.twitterBtn.position.set(Constants.GAME_DIMENSIONS.CENTER_X, this.scoreContainer.y + 35);
        this.twitterBtn.alpha = 0;
        this.addChild(this.twitterBtn);

        this.gotoTitleBtn = new GotoTitleButton(); // Constructor handles textures
        this.gotoTitleBtn.position.set(Constants.GAME_DIMENSIONS.CENTER_X - this.gotoTitleBtn.width / 2, Constants.GAME_DIMENSIONS.CENTER_Y + 160);
        this.gotoTitleBtn.on('goto_title', this.nextSceneAnim.bind(this));
        this.gotoTitleBtn.alpha = 0;
        this.addChild(this.gotoTitleBtn);

        TweenMax.to([this.scoreContainer, this.twitterBtn, this.gotoTitleBtn].filter(el => el), 0.5, { alpha: 1, delay: 0.5 });
    }

    stopCountdown() {
        this.countdownTimeline?.kill();
        this.countdownTimeline = null;
        if (this.countdown >= 0 && this.countdown <= 9) {
            Sound.stop(`voice_countdown${this.countdown}`);
        }
    }

    nextSceneAnim() {
        this.yesBtn?.setEnabled(false);
        this.noBtn?.setEnabled(false);
        this.gotoTitleBtn?.setEnabled(false);
        this.twitterBtn?.setEnabled(false);

        TweenMax.to(this, 1.0, {
            alpha: 0,
            delay: 0.3,
            onComplete: this.goToNextScene,
            onCompleteScope: this
        });
    }

    goToNextScene() {
        Utils.dlog("Leaving ContinueScene");
        Sound.stop('bgm_continue');
        Sound.stop('bgm_gameover');

        let nextSceneClass = TitleScene;
        let nextSceneId = Constants.SCENE_NAMES.TITLE;

        if (this.sceneSwitch === 1) { // Continue (Yes)
            nextSceneClass = GameScene;
            nextSceneId = Constants.SCENE_NAMES.GAME;
            // Reset player state for continue
            const recipeData = PIXI.loader?.resources?.recipe?.data;
            gameState.playerMaxHp = recipeData?.playerData?.maxHp || 3; // Use recipe default or fallback
            gameState.playerHp = gameState.playerMaxHp;
            gameState.shootMode = recipeData?.playerData?.defaultShootName || SHOOT_MODES.NORMAL;
            gameState.shootSpeed = recipeData?.playerData?.defaultShootSpeed || SHOOT_SPEEDS.NORMAL;
            gameState.continueCnt++;
            gameState.score = 0; // Reset score
            gameState.cagage = 0;
            gameState.combo = 0;
            // Max combo persists
        }

        this.switchScene(nextSceneId, nextSceneClass);
    }

    destroy(options) {
        Utils.dlog("Destroying ContinueScene");
        this.stopCountdown();
        TweenMax.killTweensOf(this);
        if(this.gameOverTxt) TweenMax.killTweensOf(this.gameOverTxt);
        if(this.newRecordSprite) TweenMax.killTweensOf(this.newRecordSprite);
        if(this.scoreContainer) TweenMax.killTweensOf(this.scoreContainer);
        if(this.twitterBtn) TweenMax.killTweensOf(this.twitterBtn);
        if(this.gotoTitleBtn) TweenMax.killTweensOf(this.gotoTitleBtn);

        super.destroy({ children: true, texture: false, baseTexture: false }); // Ensure children destroyed
    }
}