// ui/TwitterButton.js
import { BaseButton } from './BaseButton.js';
import * as Utils from '../utils.js'; // Import the tweet function

export class TwitterButton extends BaseButton {
    constructor(scoreType = 0) { // 0 for high score, 1 for current score

        // --- Access textures directly ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        let texDefault, texOver, texDown;

        if (uiTextures) {
            texDefault = uiTextures["twitterBtn0.gif"] || PIXI.Texture.EMPTY;
            texOver = uiTextures["twitterBtn1.gif"] || texDefault; // Fallback to default
            texDown = uiTextures["twitterBtn2.gif"] || texOver;   // Fallback to over
        } else {
            console.error("TwitterButton: 'game_ui' resource not found or textures missing!");
            texDefault = PIXI.Texture.EMPTY;
            texOver = PIXI.Texture.EMPTY;
            texDown = PIXI.Texture.EMPTY;
        }

        // Use default sounds
        super(texDefault, texOver, texDown);
        this.anchor.set(0.5); // Set anchor as in original

        this.scoreType = scoreType; // Store which score to tweet
    }

    onAction() {
        Utils.tweet(this.scoreType);
    }
}