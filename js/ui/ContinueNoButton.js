// ui/ContinueNoButton.js
import { BaseButton } from './BaseButton.js';

export class ContinueNoButton extends BaseButton {
    constructor() {
        // --- Access textures directly ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        let texDefault, texOver, texDown;

        if (uiTextures) {
            texDefault = uiTextures["continueNo.gif"] || PIXI.Texture.EMPTY;
            texOver = uiTextures["continueNoOver.gif"] || texDefault;
            texDown = uiTextures["continueNoDown.gif"] || texOver;
        } else {
            console.error("ContinueNoButton: 'game_ui' resource not found or textures missing!");
            texDefault = PIXI.Texture.EMPTY;
            texOver = PIXI.Texture.EMPTY;
            texDown = PIXI.Texture.EMPTY;
        }

        // Uses default sounds (se_over, se_cursor)
        super(texDefault, texOver, texDown);
    }

    onAction() {
        // Emit event for ContinueScene to handle
        this.emit('continue_no');
    }
}