// ui/GotoTitleButton.js
import { BaseButton } from './BaseButton.js';

export class GotoTitleButton extends BaseButton {
    constructor() {
        // --- Access textures directly ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        let texDefault, texOver, texDown;

        if (uiTextures) {
            texDefault = uiTextures["gotoTitleBtn0.gif"] || PIXI.Texture.EMPTY;
            texOver = uiTextures["gotoTitleBtn1.gif"] || texDefault;
            texDown = uiTextures["gotoTitleBtn2.gif"] || texOver;
        } else {
            console.error("GotoTitleButton: 'game_ui' resource not found or textures missing!");
            texDefault = PIXI.Texture.EMPTY;
            texOver = PIXI.Texture.EMPTY;
            texDown = PIXI.Texture.EMPTY;
        }

        // Override click sound
        super(texDefault, texOver, texDown, 'se_over', 'se_correct');
    }

    onAction() {
        this.setEnabled(false); // Disable button after click
        this.emit('goto_title'); // Emit event for scene
    }

     // Reset enabled state when added
     castAdded() {
         super.castAdded();
         this.setEnabled(true);
     }
}