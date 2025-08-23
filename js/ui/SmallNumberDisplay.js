// SmallNumberDisplay.js
import { BaseCast } from '../BaseCast.js';
import * as Utils from '../utils.js';

export class SmallNumberDisplay extends BaseCast {
    constructor(maxDigit) {
        super();
        this.maxDigit = maxDigit;
        this.textureList = [];
        this.numSpList = [];
        this.valid = true; // Flag to indicate successful initialization

        const uiTextures = PIXI.loader?.resources?.game_ui?.textures;
        if (!uiTextures) {
            console.error("SmallNumberDisplay Error: 'game_ui' textures not found.");
            this.valid = false;
            return;
        }

        for (let i = 0; i <= 9; i++) {
            const textureKey = `smallNum${i}.gif`;
            const texture = uiTextures[textureKey];
            if (!texture || texture === PIXI.Texture.EMPTY) {
                console.error(`SmallNumberDisplay Error: Texture not found for ${textureKey}`);
                this.valid = false;
                // Optionally push EMPTY texture as fallback
                this.textureList[i] = PIXI.Texture.EMPTY;
                // return; // Stop if any digit is missing? Or continue with fallback?
            } else {
                texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                this.textureList[i] = texture;
            }
        }

        const digitWidth = this.textureList[0]?.width || 6; // Use width of '0' or fallback
        const spacing = -2; // From original app_formatted.js

        for (let i = 0; i < this.maxDigit; i++) {
            const sprite = new PIXI.Sprite(this.textureList[0]); // Start with '0'
            // Position digits from right to left
            sprite.x = (this.maxDigit - 1 - i) * (digitWidth + spacing);
            sprite.alpha = 0.5; // Default inactive state
            this.addChild(sprite);
            this.numSpList[i] = sprite;
        }
    }

    setNum(num) {
        if (!this.valid) return;

        const numStr = String(num);
        const len = numStr.length;

        for (let i = 0; i < this.maxDigit; i++) {
            const sprite = this.numSpList[i];
            if (i < len) {
                // This digit position corresponds to a digit in the number
                const digitIndex = len - 1 - i; // Index within numStr (right to left)
                const digit = parseInt(numStr[digitIndex], 10);
                if (!isNaN(digit) && digit >= 0 && digit <= 9 && this.textureList[digit]) {
                    sprite.texture = this.textureList[digit];
                    sprite.alpha = 1; // Make active digit fully visible
                    sprite.visible = true;
                } else {
                    sprite.texture = this.textureList[0]; // Fallback to '0'
                    sprite.alpha = 0.5; // Keep inactive style
                    sprite.visible = true; // Still show the '0' placeholder
                }
            } else {
                // This digit position is beyond the number's length (leading zeros)
                sprite.texture = this.textureList[0];
                sprite.alpha = 0.5; // Keep inactive style
                sprite.visible = true; // Show placeholder '0'
            }
        }
    }

    // Optional: Implement castAdded/castRemoved if needed
    castAdded() {}
    castRemoved() {}
}