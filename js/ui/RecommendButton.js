// ui/RecommendButton.js
import { BaseButton } from './BaseButton.js';
import * as Sound from '../soundManager.js';

/**
 * Button to show the recommendation modal.
 * Relies on textures being passed in, assumed to be loaded.
 */
export class RecommendButton extends BaseButton {
    /**
     * @param {Array<PIXI.Texture>} textures - Array containing [defaultTexture, downTexture].
     */
    constructor(textures) {
         let texDefault, texDown;

         if (Array.isArray(textures) && textures.length >= 2 && textures[0] instanceof PIXI.Texture) {
             texDefault = textures[0];
             texDown = textures[1] instanceof PIXI.Texture ? textures[1] : texDefault;
         } else {
            console.error("RecommendButton requires an array of at least 2 valid PIXI.Texture objects.");
            texDefault = PIXI.Texture.EMPTY; // Fallback
            texDown = PIXI.Texture.EMPTY;
        }

        // Recommend button only seemed to have default/down states
        super(texDefault, texDefault, texDown);
    }

    onAction() {
        // Emit event for LoadScene to open the modal
        this.emit('show_recommend');
    }

    // Override hover/out like ModeButton if desired
    _onPointerOver() {
        if (!this.interactive) return;
        this.alpha = 0.7;
        if (this.soundOver) Sound.play(this.soundOver);
    }

    _onPointerOut() {
        if (!this.interactive) return;
        this.alpha = 1.0;
        this.texture = this.textureDefault;
    }
}