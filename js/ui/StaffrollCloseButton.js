// ui/StaffrollCloseButton.js
import { BaseSprite } from '../BaseSprite.js';
import * as Sound from '../soundManager.js';

export class StaffrollCloseButton extends BaseSprite {
    constructor() {
        // --- Access texture directly ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        let tex;
        if (uiTextures) {
            tex = uiTextures["staffrollCloseBtn.gif"];
        }

        if (!tex) {
             console.error("StaffrollCloseButton: Texture 'staffrollCloseBtn.gif' not found in game_ui resource!");
             tex = PIXI.Texture.EMPTY; // Use fallback
        }

        super(tex); // Initialize BaseSprite with the texture

        this.anchor.set(0.5);

        // Enable interaction only if texture is valid
        if (tex !== PIXI.Texture.EMPTY) {
            this.interactive = true;
            this.buttonMode = true;
            // Bind listeners
            this._onPointerOver = this._onPointerOver.bind(this);
            this._onPointerOut = this._onPointerOut.bind(this);
            this._onPointerUp = this._onPointerUp.bind(this);
            this._onPointerUpOutside = this._onPointerOut.bind(this); // Use pointerOut logic
        } else {
             this.interactive = false;
             this.buttonMode = false;
        }
    }

    _onPointerOver() {
        if (!this.interactive) return;
        Sound.play('se_over');
        TweenMax.killTweensOf(this);
        TweenMax.to(this, 0.3, { rotation: Math.PI * 2, ease: Power1.easeInOut });
    }

    _onPointerOut() {
        if (!this.interactive) return;
        TweenMax.killTweensOf(this);
        TweenMax.to(this, 0.3, { rotation: 0, ease: Power1.easeInOut });
    }

    _onPointerUp(event) {
        if (!this.interactive) return;
        // Check if still over the button when released
        const isOver = this.containsPoint(event.data.global);

        TweenMax.killTweensOf(this);
        TweenMax.to(this, 0.1, { rotation: 0 }); // Quick snap back

        if (isOver) {
            Sound.play('se_cursor');
            this.emit('close_staffroll');
        }
    }

    castAdded() {
        // Add listeners only if the texture was valid during construction
        if (this.interactive) {
            this.on('pointerover', this._onPointerOver);
            this.on('pointerout', this._onPointerOut);
            this.on('pointerup', this._onPointerUp);
            this.on('pointerupoutside', this._onPointerUpOutside);
        } else {
             this.visible = false;
        }
    }

    castRemoved() {
       // Listeners removed by PIXI destroy
    }

     destroy(options) {
         TweenMax.killTweensOf(this);
         this.off('pointerover', this._onPointerOver);
         this.off('pointerout', this._onPointerOut);
         this.off('pointerup', this._onPointerUp);
         this.off('pointerupoutside', this._onPointerUpOutside);
         super.destroy(options);
     }
}