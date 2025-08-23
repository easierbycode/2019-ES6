// ui/StageBackground.js
import { BaseCast } from '../BaseCast.js';
import * as Constants from '../constants.js';
// No longer need globals

export class StageBackground extends BaseCast {
    /**
     * @param {Array<Array<PIXI.Texture>>} allStageTextures - Array of [endTexture, loopTexture] pairs for each stage.
     */
    constructor(allStageTextures) {
        super();
        this.allStageTextures = allStageTextures; // Store [ [end0, loop0], [end1, loop1], ... ]

        this.bgLoop = null; // TilingSprite for looping part
        this.bgEnd = null; // Sprite for the top end part
        this.akebonoBg = null; // AnimatedSprite for finish effect
        this.akebonoTen = null; // Sprite for 'Ten' character
        this.akebonoTenShock = null; // Sprite for 'Ten' shockwave

        this.scrollAmount = 0;
        this.scrollCount = 0;
        this.moveFlg = false;
        this.bossAppearFlg = false;
    }

    init(stageId) {
        this.removeChildren();
        this.bgLoop = null;
        this.bgEnd = null;
        this.akebonoBg = null;
        this.akebonoTen = null;
        this.akebonoTenShock = null;

        if (stageId < 0 || !this.allStageTextures || stageId >= this.allStageTextures.length) {
            console.error(`Invalid stageId or missing textures for StageBackground: ${stageId}`);
            return;
        }

        const textures = this.allStageTextures[stageId];
        const endTexture = textures[0]; // Might be undefined
        const loopTexture = textures[1]; // Might be undefined

        if (!loopTexture) {
             console.error(`Looping texture missing for stage ${stageId}`);
             // Create a fallback graphic?
             const fallback = new PIXI.Graphics().beginFill(0x222222).drawRect(0,0,Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT).endFill();
             this.addChild(fallback);
        } else {
            // Using extras for PIXI v4 TilingSprite
            this.bgLoop = new PIXI.extras.TilingSprite(loopTexture, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
            this.addChild(this.bgLoop);
        }

        if (endTexture) {
            this.bgEnd = new PIXI.Sprite(endTexture);
            this.bgEnd.y = -this.bgEnd.height; // Position off-screen top
            this.addChild(this.bgEnd);
        } else {
             console.warn(`End texture missing for stage ${stageId}`);
             this.bgEnd = null;
        }

        // Reset state for new stage
        this.moveFlg = true;
        this.bossAppearFlg = false;
        this.scrollAmount = 0;
        this.scrollCount = 0;
        if (this.bgLoop?.tilePosition) this.bgLoop.tilePosition.y = 0; // Use optional chaining
    }

    loop(scrollDelta) {
        this.scrollAmount = scrollDelta;

        if (this.moveFlg && this.bgLoop?.tilePosition) {
            this.bgLoop.tilePosition.y += this.scrollAmount;
        }

        if (this.bossAppearFlg) {
             const bossScrollSpeed = this.scrollAmount;
             this.scrollCount += bossScrollSpeed;

             if (this.bgLoop) this.bgLoop.y += bossScrollSpeed;
             if (this.bgEnd) this.bgEnd.y += bossScrollSpeed;

             const endTargetY = 0;
             if (this.bgEnd && this.bgEnd.y >= endTargetY) {
                 const overshoot = this.bgEnd.y - endTargetY;
                 if(this.bgLoop) this.bgLoop.y -= overshoot;
                 this.bgEnd.y = endTargetY;

                 this.bossAppearFlg = false;
                 this.moveFlg = false;
                 console.log("Boss background transition complete.");
             }
        }
    }

    bossScene() {
        this.moveFlg = false;
        if (this.bgEnd) {
             this.bossAppearFlg = true;
             this.scrollCount = 0;
        } else {
             console.warn("Cannot start bossScene transition, no end texture loaded.");
        }
    }

    _createAkebonoBg() {
        if (this.akebonoBg) return; // Already created

        // Access textures directly
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        if (!uiTextures) {
             console.error("Cannot create Akebono BG: game_ui textures not loaded.");
             return;
        }

        const frames = [];
        for (let i = 0; i < 3; i++) {
            const tex = uiTextures[`akebonoBg${i}.gif`];
            if (tex && tex !== PIXI.Texture.EMPTY) frames.push(tex);
        }
        if (frames.length > 0) {
            this.akebonoBg = new PIXI.extras.AnimatedSprite(frames);
            this.akebonoBg.animationSpeed = 0.7;
            this.akebonoBg.loop = false;
            this.akebonoBg.onComplete = () => { this.akebonoBg?.stop(); };
            this.addChild(this.akebonoBg);
        } else {
             console.warn("Akebono BG frames missing.");
        }
    }

    akebonofinish() {
        this._createAkebonoBg();
        this.akebonoBg?.gotoAndPlay(0); // Use optional chaining
    }

    akebonoGokifinish() {
        this.akebonofinish(); // Play the standard effect first

        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        if (!uiTextures) return; // Need textures for Ten

        const tenTexture = uiTextures["akebonoTen.gif"];

        if (tenTexture && tenTexture !== PIXI.Texture.EMPTY) {
            if (this.akebonoTen || this.akebonoTenShock) { // Prevent creating duplicates
                if (this.akebonoTen?.parent) this.removeChild(this.akebonoTen);
                if (this.akebonoTenShock?.parent) this.removeChild(this.akebonoTenShock);
                this.akebonoTen = null;
                this.akebonoTenShock = null;
            }

            this.akebonoTen = new PIXI.Sprite(tenTexture);
            this.akebonoTen.anchor.set(0.5);
            this.akebonoTen.position.set(27 + tenTexture.width / 2, 113 + tenTexture.height / 2);
            this.akebonoTen.scale.set(1.2);
            this.addChild(this.akebonoTen);

            this.akebonoTenShock = new PIXI.Sprite(tenTexture);
            this.akebonoTenShock.anchor.set(0.5);
            this.akebonoTenShock.position.copyFrom(this.akebonoTen.position);
            this.akebonoTenShock.alpha = 0;
            this.addChild(this.akebonoTenShock);

            const tl = new TimelineMax({
                 onComplete: () => {
                     if (this.akebonoTen?.parent) this.removeChild(this.akebonoTen);
                     if (this.akebonoTenShock?.parent) this.removeChild(this.akebonoTenShock);
                     this.akebonoTen = null;
                     this.akebonoTenShock = null;
                 }
            });
            tl.to(this.akebonoTen.scale, 0.3, { x: 1, y: 1, ease: Quint.easeIn })
              .set(this.akebonoTenShock, { alpha: 1 }, "+=0")
              .to(this.akebonoTenShock, 0.6, { alpha: 0, ease: Quint.easeOut })
              .to(this.akebonoTenShock.scale, 0.4, { x: 1.5, y: 1.5, ease: Quint.easeOut }, "-=0.6")
              .to(this.akebonoTen, 0.3, { alpha: 0, ease: Quint.easeOut }, "-=0.4");
        } else {
             console.warn("Akebono 'Ten' texture missing.");
        }
    }

    destroy(options) {
        this.allStageTextures = null;
        super.destroy(options);
    }
}