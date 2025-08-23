// ComboNumberDisplay.js
import { BaseCast } from '../BaseCast.js';
import * as Utils from '../utils.js';

export class ComboNumberDisplay extends BaseCast {
    constructor() {
        super();
        this.numTextureList = [];
        this.nowDisplayNumList = [];
        this.valid = true; // Flag for initialization success

        const uiTextures = PIXI.loader?.resources?.game_ui?.textures;
        if (!uiTextures) {
            console.error("ComboNumberDisplay Error: 'game_ui' textures not found.");
            this.valid = false;
            return;
        }

        for (let i = 0; i <= 9; i++) {
            const textureKey = `comboNum${i}.gif`;
            const texture = uiTextures[textureKey];
            if (!texture || texture === PIXI.Texture.EMPTY) {
                console.error(`ComboNumberDisplay Error: Texture not found for ${textureKey}`);
                // Use EMPTY as fallback? Or stop? Using EMPTY for now.
                this.numTextureList[i] = PIXI.Texture.EMPTY;
                this.valid = false; // Mark as invalid if any digit fails
            } else {
                this.numTextureList[i] = texture;
            }
        }
    }

    setNum(num) {
        if (!this.valid) return;

        // Clear previous digits
        this.nowDisplayNumList.forEach(sprite => this.removeChild(sprite));
        this.nowDisplayNumList = [];

        const numStr = String(num);
        let currentX = 0;
        const spacing = 0; // Adjust spacing if needed

        for (let i = 0; i < numStr.length; i++) {
            const digit = parseInt(numStr[i], 10);
            if (!isNaN(digit) && digit >= 0 && digit <= 9 && this.numTextureList[digit]) {
                const sprite = new PIXI.Sprite(this.numTextureList[digit]);
                sprite.x = currentX;
                this.addChild(sprite);
                this.nowDisplayNumList.push(sprite);
                currentX += sprite.width + spacing;
            } else {
                console.warn(`ComboNumberDisplay: Invalid digit or missing texture for digit ${numStr[i]}`);
                 // Add a placeholder or skip? Skipping for now.
            }
        }
    }

    // Optional: Implement castAdded/castRemoved if needed
    castAdded() {}
    castRemoved() {}
}