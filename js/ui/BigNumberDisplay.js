// ui/BigNumberDisplay.js
import { BaseCast } from '../BaseCast.js';

export class BigNumberDisplay extends BaseCast {
    constructor(maxDigits) {
        super();
        this.maxDigits = maxDigits;
        this.numSprites = [];
        this.textures = []; // Array to hold digit textures [0] to [9]
        let texturesAvailable = true;

        // --- Access textures directly from loader ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;

        if (uiTextures) {
            for (let i = 0; i <= 9; i++) {
                const tex = uiTextures[`bigNum${i}.gif`];
                this.textures[i] = tex || PIXI.Texture.EMPTY; // Use EMPTY if specific digit missing
                if (!tex) {
                    console.warn(`BigNumberDisplay: Texture 'bigNum${i}.gif' not found.`);
                    // texturesAvailable = false; // Option: treat as fatal error
                }
            }
        } else {
            console.error("BigNumberDisplay: 'game_ui' resource not found or textures missing.");
            texturesAvailable = false;
            // Fill textures array with EMPTY
            for (let i = 0; i <= 9; i++) this.textures[i] = PIXI.Texture.EMPTY;
        }
        // --- End access ---

        // Create sprite pool
        const digitWidth = this.textures[0]?.width || 12;
        const digitSpacing = digitWidth > 0 ? digitWidth - 1 : 11;

        for (let i = 0; i < this.maxDigits; i++) {
            // Use fallback texture if needed
            const sprite = new PIXI.Sprite(this.textures[0]);
            sprite.x = (this.maxDigits - 1 - i) * digitSpacing;
            sprite.visible = false;
            this.addChild(sprite);
            this.numSprites.push(sprite);
        }
        // Optionally hide the whole component if textures were missing
        // this.visible = texturesAvailable;
    }

    setNum(value) {
        const numStr = String(value);
        const len = numStr.length;

        for (let i = 0; i < this.maxDigits; i++) {
            const sprite = this.numSprites[i];
            if (!sprite) continue;

            const digitIndexInString = len - 1 - i;

            if (digitIndexInString >= 0) {
                const digitValue = parseInt(numStr[digitIndexInString], 10);
                const tex = this.textures[digitValue];

                if (!isNaN(digitValue) && tex && tex !== PIXI.Texture.EMPTY) {
                    sprite.texture = tex;
                    sprite.visible = true;
                } else {
                    sprite.texture = this.textures[0]; // Fallback to '0'
                    sprite.visible = true;
                }
            } else {
                sprite.visible = false; // Hide leading zeros
            }
        }
    }

    castAdded() {
        this.setNum(0);
    }
}