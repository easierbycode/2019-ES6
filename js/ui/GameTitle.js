// ui/GameTitle.js (Handles Round/Fight/Clear/KO overlays)
import { BaseCast } from '../BaseCast.js';
import * as Constants from '../constants.js';
import * as Sound from '../soundManager.js';

export class GameTitle extends BaseCast {
    static EVENT_START = "gameTitleStartSignal"; // Emitted when "FIGHT" animation completes

    constructor() {
        super();
        this.interactive = false;

        // --- Access textures directly ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        if (!uiTextures) {
            console.error("GameTitle: game_ui textures not loaded!");
            // Create minimal elements or return?
        }

        // Backgrounds (for dimming/effects)
        this.gameStartBg = this._createOverlayBg(0xFFFFFF, 0.2);
        this.stageClearBg = this._createOverlayBg(0xFFFFFF, 0.4);
        this.stageTimeoverBg = this._createOverlayBg(0xFFFFFF, 0.4);
        this.blackBg = this._createOverlayBg(0x000000, 1.0);

        // Sprites (Use fallback EMPTY texture if specific one is missing)
        this.stageNumList = [];
        if (uiTextures) {
            for (let i = 0; i < 4; i++) {
                const tex = uiTextures[`stageNum${i + 1}.gif`];
                if (tex && tex !== PIXI.Texture.EMPTY) {
                     tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                     this.stageNumList[i] = tex;
                } else {
                    console.warn(`GameTitle: Texture 'stageNum${i + 1}.gif' missing.`);
                    this.stageNumList[i] = PIXI.Texture.EMPTY;
                }
            }
        }

        this.stageNum = new PIXI.Sprite(); // Texture set later
        this.stageNum.position.set(0, Constants.GAME_DIMENSIONS.CENTER_Y - 20);
        this.stageNum.visible = false;
        this.addChild(this.stageNum);

        const fightTex = uiTextures ? uiTextures["stageFight.gif"] : null;
        if(fightTex && fightTex !== PIXI.Texture.EMPTY) fightTex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
        this.stageFight = new PIXI.Sprite(fightTex || PIXI.Texture.EMPTY);
        this.stageFight.anchor.set(0.5);
        this.stageFight.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y + (this.stageFight.height / 2) - 20);
        this.stageFight.visible = false;
        this.addChild(this.stageFight);

        this.stageClearText = new PIXI.Sprite(uiTextures?.["stageclear.gif"] || PIXI.Texture.EMPTY);
        this.stageClearText.anchor.set(0.5, 1.0);
        this.stageClearText.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y);
        this.stageClearText.visible = false;
        this.addChild(this.stageClearText);

        this.stageTimeoverText = new PIXI.Sprite(uiTextures?.["stageTimeover.gif"] || PIXI.Texture.EMPTY);
        this.stageTimeoverText.anchor.set(0.5, 1.0);
        this.stageTimeoverText.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y);
        this.stageTimeoverText.visible = false;
        this.addChild(this.stageTimeoverText);

        // K.O. Letters
        this.knockoutK = new PIXI.Sprite(uiTextures?.["knockoutK.gif"] || PIXI.Texture.EMPTY);
        this.knockoutK.anchor.set(1.0, 0.5);
        this.knockoutK.position.set(Constants.GAME_DIMENSIONS.CENTER_X - 2, Constants.GAME_DIMENSIONS.CENTER_Y);
        this.knockoutK.visible = false;
        this.addChild(this.knockoutK);

        this.knockoutO = new PIXI.Sprite(uiTextures?.["knockoutO.gif"] || PIXI.Texture.EMPTY);
        this.knockoutO.anchor.set(0.0, 0.5);
        this.knockoutO.position.set(Constants.GAME_DIMENSIONS.CENTER_X + 2, Constants.GAME_DIMENSIONS.CENTER_Y);
        this.knockoutO.visible = false;
        this.addChild(this.knockoutO);

        this.visible = false; // Start hidden
    }

    _createOverlayBg(color, alpha) {
        const bg = new PIXI.Graphics()
            .beginFill(color, alpha)
            .drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT)
            .endFill();
        bg.visible = false;
        this.addChild(bg);
        return bg;
    }

    gameStart(stageId) {
        this.visible = true;
        this._hideAllElements();

        let displayStageNum = stageId;
        let isGokiIntro = false;

        if (stageId === 4) {
             displayStageNum = 3;
             isGokiIntro = true;
             this.blackBg.visible = true;
             this.blackBg.alpha = 1.0;
             Sound.play('voice_another_fighter');
        } else if (stageId < 0 || stageId >= this.stageNumList.length) {
             console.warn(`Invalid stageId for GameTitle: ${stageId}`);
             displayStageNum = 0;
        }

        this.gameStartBg.visible = true;
        this.gameStartBg.alpha = 0;
        this.stageNum.texture = this.stageNumList[displayStageNum] || PIXI.Texture.EMPTY;
        this.stageNum.visible = true;
        this.stageNum.alpha = 0;
        this.stageFight.visible = true;
        this.stageFight.alpha = 0;
        this.stageFight.scale.set(1.2);

        const tl = new TimelineMax({
            onComplete: () => {
                this.gameStartBg.visible = false;
                this.visible = false;
                this.emit(GameTitle.EVENT_START);
            }
        });

        if (isGokiIntro) {
             tl.to(this.blackBg, 0.3, { alpha: 0 }, "+=2.7");
        }

        tl.to(this.gameStartBg, 0.3, { alpha: 1 }, isGokiIntro ? "+=0" : "+=0")
          .addCallback(() => Sound.play(`voice_round${displayStageNum}`), "+=0")
          .to(this.stageNum, 0.3, { alpha: 1 })
          .to(this.stageNum, 0.1, { alpha: 0, delay: 1.0 })
          .to(this.stageFight, 0.2, { alpha: 1 }, "-=0.1")
          .to(this.stageFight.scale, 0.2, { x: 1, y: 1 }, "<")
          .addCallback(() => Sound.play('voice_fight'), "+=0")
          .to(this.stageFight.scale, 0.2, { x: 1.5, y: 1.5, delay: 0.4 })
          .to(this.stageFight, 0.2, { alpha: 0 }, "<")
          .to(this.gameStartBg, 0.2, { alpha: 0 }, "-=0.1");
    }

    akebonofinish() {
        this.visible = true;
        this._hideAllElements();

        this.knockoutK.visible = true;
        this.knockoutK.scale.set(0);
        this.knockoutO.visible = true;
        this.knockoutO.scale.set(0);

        const tl = new TimelineMax();
        tl.to(this.knockoutK.scale, 0.4, { x: 1, y: 1, ease: Back.easeOut.config(2.5) })
          .to(this.knockoutO.scale, 0.4, { x: 1, y: 1, ease: Back.easeOut.config(2.5) }, "-=0.25");

        Sound.play('voice_ko');
        Sound.play('se_finish_akebono');
    }

    stageClear() {
        this.visible = true;
        this._hideAllElements();

        this.stageClearBg.visible = true;
        this.stageClearBg.alpha = 0;
        this.stageClearText.visible = true;
        this.stageClearText.alpha = 0;
        this.stageClearText.y = Constants.GAME_DIMENSIONS.CENTER_Y + 20;

        TweenMax.to(this.stageClearBg, 0.5, { delay: 0.3, alpha: 0.4 });
        TweenMax.to(this.stageClearText, 0.8, { delay: 0.5, alpha: 1, y: Constants.GAME_DIMENSIONS.CENTER_Y, ease: Power1.easeOut });
    }

    timeover() {
        this.visible = true;
        this._hideAllElements();

        this.stageTimeoverBg.visible = true;
        this.stageTimeoverBg.alpha = 0;
        this.stageTimeoverText.visible = true;
        this.stageTimeoverText.alpha = 0;
        this.stageTimeoverText.y = Constants.GAME_DIMENSIONS.CENTER_Y + 20;

        TweenMax.to(this.stageTimeoverBg, 0.5, { delay: 0.3, alpha: 0.4 });
        TweenMax.to(this.stageTimeoverText, 0.8, { delay: 0.5, alpha: 1, y: Constants.GAME_DIMENSIONS.CENTER_Y, ease: Power1.easeOut });
    }

    _hideAllElements() {
        if(this.gameStartBg) this.gameStartBg.visible = false;
        if(this.stageClearBg) this.stageClearBg.visible = false;
        if(this.stageTimeoverBg) this.stageTimeoverBg.visible = false;
        if(this.blackBg) this.blackBg.visible = false;
        if(this.stageNum) this.stageNum.visible = false;
        if(this.stageFight) this.stageFight.visible = false;
        if(this.stageClearText) this.stageClearText.visible = false;
        if(this.stageTimeoverText) this.stageTimeoverText.visible = false;
        if(this.knockoutK) this.knockoutK.visible = false;
        if(this.knockoutO) this.knockoutO.visible = false;
    }

    castAdded() {
        this.visible = false;
        this._hideAllElements();
    }

     destroy(options) {
         // Kill all tweens targeting elements within this container
         if(this.gameStartBg) TweenMax.killTweensOf(this.gameStartBg);
         if(this.stageClearBg) TweenMax.killTweensOf(this.stageClearBg);
         if(this.stageTimeoverBg) TweenMax.killTweensOf(this.stageTimeoverBg);
         if(this.blackBg) TweenMax.killTweensOf(this.blackBg);
         if(this.stageNum) TweenMax.killTweensOf(this.stageNum);
         if(this.stageFight) TweenMax.killTweensOf(this.stageFight);
         if(this.stageClearText) TweenMax.killTweensOf(this.stageClearText);
         if(this.stageTimeoverText) TweenMax.killTweensOf(this.stageTimeoverText);
         if(this.knockoutK) TweenMax.killTweensOf(this.knockoutK);
         if(this.knockoutO) TweenMax.killTweensOf(this.knockoutO);
         super.destroy(options);
     }
}