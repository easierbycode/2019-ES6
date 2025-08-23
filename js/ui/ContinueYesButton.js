// ui/ContinueYesButton.js
import { BaseButton } from './BaseButton.js';

export class ContinueYesButton extends BaseButton {
    constructor() {
        // --- Access textures directly ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        let texDefault, texOver, texDown;

        if (uiTextures) {
            texDefault = uiTextures["continueYes.gif"] || PIXI.Texture.EMPTY;
            texOver = uiTextures["continueYesOver.gif"] || texDefault;
            texDown = uiTextures["continueYesDown.gif"] || texOver;
        } else {
            console.error("ContinueYesButton: 'game_ui' resource not found or textures missing!");
            texDefault = PIXI.Texture.EMPTY;
            texOver = PIXI.Texture.EMPTY;
            texDown = PIXI.Texture.EMPTY;
        }

        // Override the click sound
        super(texDefault, texOver, texDown, 'se_over', 'se_correct');
    }

    onAction() {
        // Emit event for ContinueScene to handle
        this.emit('continue_yes');
        // Play random G voice in the ContinueScene when handling the event
    }
}