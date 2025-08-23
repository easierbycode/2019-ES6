// ui/ModeButton.js
import { BaseButton } from './BaseButton.js';
import * as Sound from '../soundManager.js';

/**
 * Button for selecting PC (Normal) or SP (Low) mode.
 * Relies on textures being passed in, assumed to be loaded.
 */
export class ModeButton extends BaseButton {
    /**
     * @param {Array<PIXI.Texture>} textures - Array containing [defaultTexture, downTexture].
     */
    constructor(textures) {
        let texDefault, texDown;

        if (Array.isArray(textures) && textures.length >= 2 && textures[0] instanceof PIXI.Texture) {
            texDefault = textures[0];
            texDown = textures[1] instanceof PIXI.Texture ? textures[1] : texDefault; // Fallback down to default
        } else {
            console.error("ModeButton requires an array of at least 2 valid PIXI.Texture objects.");
            texDefault = PIXI.Texture.EMPTY; // Fallback
            texDown = PIXI.Texture.EMPTY;
        }

        // Mode buttons only seem to have default and down states in original
        // Use texDefault for the 'over' state as well.
        super(texDefault, texDefault, texDown);
    }

    onAction() {
        // Emit an event for LoadScene to handle
        // LoadScene determines the mode based on which button instance was clicked.
        this.emit('mode_selected');
    }

     // Override hover/out for different visual feedback if needed
     _onPointerOver() {
         if (!this.interactive) return;
         this.alpha = 0.7; // Dim slightly on hover
         if (this.soundOver) Sound.play(this.soundOver);
     }

     _onPointerOut() {
         if (!this.interactive) return;
         this.alpha = 1.0;
         this.texture = this.textureDefault; // Ensure reset if down state was active
     }
}