// ui/StaffrollButton.js
import { BaseButton } from './BaseButton.js';

export class StaffrollButton extends BaseButton {
    constructor() {
        // --- Access textures directly ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        let texDefault, texOver, texDown;

        if (uiTextures) {
            texDefault = uiTextures["staffrollBtn0.gif"] || PIXI.Texture.EMPTY;
            texOver = uiTextures["staffrollBtn1.gif"] || texDefault;
            texDown = uiTextures["staffrollBtn2.gif"] || texOver;
        } else {
            console.error("StaffrollButton: 'game_ui' resource not found or textures missing!");
            texDefault = PIXI.Texture.EMPTY;
            texOver = PIXI.Texture.EMPTY;
            texDown = PIXI.Texture.EMPTY;
        }


        super(texDefault, texOver, texDown);
    }

    onAction() {
        // Emit an event for the parent scene (TitleScene) to handle
        this.emit('show_staffroll');
    }
}