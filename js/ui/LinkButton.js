// ui/LinkButton.js
import { BaseSprite } from '../BaseSprite.js';
import * as Sound from '../soundManager.js';

export class LinkButton extends BaseSprite {
    constructor(textureName, url) {
        // --- Access texture directly ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        let texture;
        if (uiTextures) {
            texture = uiTextures[textureName];
        }

        if (!texture) {
            console.error(`LinkButton: Texture '${textureName}' not found in game_ui resource!`);
            texture = PIXI.Texture.EMPTY; // Use fallback
        }

        super(texture); // Initialize BaseSprite

        this.url = url;
        this.defaultTint = 0xFFFFFF;
        this.hoverTint = 0xAAAAAA;

        // Enable interaction only if texture is valid
        if (texture !== PIXI.Texture.EMPTY) {
            this.interactive = true;
            this.buttonMode = true;
            // Bind listeners
            this._onPointerOver = this._onPointerOver.bind(this);
            this._onPointerOut = this._onPointerOut.bind(this);
            this._onPointerUp = this._onPointerUp.bind(this);
            this._onPointerUpOutside = this._onPointerOut.bind(this); // Use pointerOut logic
        } else {
            this.interactive = false; // Disable if texture missing
            this.buttonMode = false;
        }
    }

    _onPointerOver() {
        if (!this.interactive) return;
        Sound.play('se_over');
        this.tint = this.hoverTint;
    }

    _onPointerOut() {
        if (!this.interactive) return;
        this.tint = this.defaultTint;
    }

    _onPointerUp(event) { // Receive event
        if (!this.interactive) return;
        // Check if still over the button when released
        const isOver = this.containsPoint(event.data.global);

        this.tint = this.defaultTint; // Reset tint regardless

        if (isOver) {
            Sound.play('se_cursor');
            if (this.url && typeof window !== 'undefined') {
                window.open(this.url, '_blank');
            } else {
                 console.warn("Cannot open link, URL or window missing:", this.url);
            }
            this.emit('link_clicked', this.url);
        }
    }

    castAdded() {
        // Add listeners only if interactive (texture was valid)
        if (this.interactive) {
            this.on('pointerover', this._onPointerOver);
            this.on('pointerout', this._onPointerOut);
            this.on('pointerup', this._onPointerUp);
            this.on('pointerupoutside', this._onPointerUpOutside);
        } else {
             this.visible = false; // Hide if invalid
        }
    }

    castRemoved() {
       // Listeners removed by PIXI destroy
    }

    destroy(options) {
        this.off('pointerover', this._onPointerOver);
        this.off('pointerout', this._onPointerOut);
        this.off('pointerup', this._onPointerUp);
        this.off('pointerupoutside', this._onPointerUpOutside);
        super.destroy(options);
    }
}