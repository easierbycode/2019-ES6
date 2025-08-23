// ui/HowtoButton.js
import { BaseButton } from './BaseButton.js';

export class HowtoButton extends BaseButton {
    constructor() {
        // --- Access textures directly from PIXI loader ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        let texDefault, texOver, texDown;

        if (uiTextures) {
            texDefault = uiTextures["howtoBtn0.gif"] || PIXI.Texture.EMPTY;
            texOver = uiTextures["howtoBtn1.gif"] || texDefault;
            texDown = uiTextures["howtoBtn2.gif"] || texOver;
        } else {
            console.error("HowtoButton: 'game_ui' resource not found or textures missing!");
            texDefault = PIXI.Texture.EMPTY;
            texOver = PIXI.Texture.EMPTY;
            texDown = PIXI.Texture.EMPTY;
        }

        super(texDefault, texOver, texDown); // Sounds default to se_over, se_cursor
    }

    onAction() {
        // Original logic to open a modal - assuming this function exists globally
        if (typeof window !== 'undefined' && typeof window.howtoModalOpen === 'function') {
            window.howtoModalOpen();
        } else {
            console.warn("window.howtoModalOpen is not defined.");
            // Optional: emit an event for the scene to handle
            this.emit('show_howto_modal');
        }
    }
}