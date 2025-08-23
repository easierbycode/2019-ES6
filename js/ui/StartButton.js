// ui/StartButton.js
import { BaseCast } from '../BaseCast.js';
import * as Constants from '../constants.js';
import * as Sound from '../soundManager.js';

export class StartButton extends BaseCast {
    constructor() {
        super();

        // --- Access textures directly from PIXI loader ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        // Use texture from the sheet, with fallback to EMPTY
        let imgTexture = PIXI.Texture.EMPTY;
        if (uiTextures) {
             imgTexture = uiTextures["titleStartText.gif"] || PIXI.Texture.EMPTY;
             if (imgTexture === PIXI.Texture.EMPTY) {
                 console.error("StartButton: Texture 'titleStartText.gif' not found!");
             }
        } else {
             console.error("StartButton: 'game_ui' resource not found or textures missing!");
        }

        this.img = new PIXI.Sprite(imgTexture);
        this.img.anchor.set(0.5);
        this.img.position.set(Constants.GAME_DIMENSIONS.CENTER_X, 330);
        this.addChild(this.img);

        // Flash cover doesn't need textures
        this.flashCover = new PIXI.Graphics()
            .beginFill(0xFFFFFF, 1)
            .drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT - 120)
            .endFill();
        this.flashCover.alpha = 0;
        this.addChild(this.flashCover);

        // Only make interactive if the image texture is valid
        if (imgTexture !== PIXI.Texture.EMPTY) {
            this.interactive = true;
            this.buttonMode = true;
            this.hitArea = new PIXI.Rectangle(0, 50, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT - 170);

            // Bind listeners only if interactive
            this._onPointerOver = this._onPointerOver.bind(this);
            this._onPointerOut = this._onPointerOut.bind(this);
            this._onPointerDown = this._onPointerDown.bind(this);
            this._onPointerUp = this._onPointerUp.bind(this);
            this._onPointerUpOutside = this._onPointerOut.bind(this); // Use pointerOut logic
        } else {
             this.interactive = false;
             this.buttonMode = false;
        }

        this.tl = null; // Animation timeline
    }

    _onPointerOver(event) {
        if (!this.interactive) return;
        this.img.scale.set(1.05);
    }

    _onPointerOut(event) {
        if (!this.interactive) return;
        this.img.scale.set(1.0);
    }

    _onPointerDown(event) {
        if (!this.interactive) return;
        // Optional: Add visual feedback for down state
    }

    _onPointerUp(event) {
        if (!this.interactive) return;
        // Check if still over the button when released
        const isOver = this.hitArea.contains(event.data.global.x, event.data.global.y);

        if (isOver) {
            TweenMax.killTweensOf(this.flashCover); // Stop any previous flash
            Sound.play('se_decision');
            this.flash(); // Trigger flash effect
            this.emit('start_game'); // Emit event for TitleScene
        } else {
            this.img.scale.set(1.0); // Reset scale if pointer slid off
        }
    }

    flash() {
        this.flashCover.alpha = 0.3;
        TweenMax.to(this.flashCover, 1.5, { alpha: 0 });
    }

    startFlashingAnimation() {
        if (!this.interactive) return; // Don't flash if button is invalid
        if (this.tl) this.tl.kill();
        this.img.alpha = 1; // Ensure visible before starting
        this.tl = new TimelineMax({ repeat: -1, yoyo: true });
        this.tl.to(this.img, 0.3, { delay: 0.1, alpha: 0 })
            .to(this.img, 0.8, { alpha: 1 });
    }

    stopFlashingAnimation() {
        if (this.tl) {
            this.tl.kill();
            this.tl = null;
        }
        this.img.alpha = 1;
    }


    castAdded() {
        if (this.interactive) { // Only add listeners if interactive
            this.on('pointerover', this._onPointerOver);
            this.on('pointerout', this._onPointerOut);
            this.on('pointerdown', this._onPointerDown);
            this.on('pointerup', this._onPointerUp);
            this.on('pointerupoutside', this._onPointerUpOutside);
            this.startFlashingAnimation();
        } else {
             this.visible = false; // Hide if invalid
        }
    }

    castRemoved() {
        this.stopFlashingAnimation();
        this.off('pointerover', this._onPointerOver);
        this.off('pointerout', this._onPointerOut);
        this.off('pointerdown', this._onPointerDown);
        this.off('pointerup', this._onPointerUp);
        this.off('pointerupoutside', this._onPointerUpOutside);
    }

    destroy(options) {
        this.stopFlashingAnimation();
        super.destroy(options);
    }
}