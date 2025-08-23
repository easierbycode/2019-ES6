// ui/BaseButton.js
import { BaseSprite } from '../BaseSprite.js'; // Adjust path if needed
import * as Sound from '../soundManager.js';
// No longer need globals or getTexture

export class BaseButton extends BaseSprite {
    constructor(textureDefault, textureOver = null, textureDown = null, soundOver = 'se_over', soundClick = 'se_cursor') {
        // Ensure textures are actual PIXI.Texture objects
        const texDefault = textureDefault instanceof PIXI.Texture ? textureDefault : PIXI.Texture.EMPTY;
        const texOver = textureOver ? (textureOver instanceof PIXI.Texture ? textureOver : PIXI.Texture.EMPTY) : texDefault;
        const texDown = textureDown ? (textureDown instanceof PIXI.Texture ? textureDown : PIXI.Texture.EMPTY) : texOver; // Fallback down to over

        super(texDefault); // Initialize BaseSprite with default texture

        this.textureDefault = texDefault;
        this.textureOver = texOver;
        this.textureDown = texDown;

        this.soundOver = soundOver;
        this.soundClick = soundClick;

        // Enable interaction only if default texture is valid
        if (texDefault !== PIXI.Texture.EMPTY) {
            this.interactive = true;
            this.buttonMode = true;
        } else {
            this.interactive = false;
            this.buttonMode = false;
            console.warn(`BaseButton created with invalid default texture.`);
        }


        // Bind listeners
        this._onPointerOver = this._onPointerOver.bind(this);
        this._onPointerOut = this._onPointerOut.bind(this);
        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onPointerUpOutside = this._onPointerUpOutside.bind(this);
    }

    _onPointerOver() {
        if (!this.interactive) return;
        if (this.texture !== this.textureDown) { // Don't change texture if pointer slides back over while down
            this.texture = this.textureOver;
        }
        if (this.soundOver) Sound.play(this.soundOver);
        this.emit('button_over'); // Emit event if needed
    }

    _onPointerOut() {
        if (!this.interactive) return;
        this.texture = this.textureDefault;
        this.emit('button_out'); // Emit event if needed
    }

    _onPointerDown() {
        if (!this.interactive) return;
        this.texture = this.textureDown;
        this.emit('button_down'); // Emit event if needed
    }

    _onPointerUp(event) { // Receive the event object
        if (!this.interactive) return;

        // Check if still over the button when released
        // Use the global position from the event data
        const isOver = this.containsPoint(event.data.global);

        if(isOver) {
            this.texture = this.textureOver; // Go to over state if still hovering
            if (this.soundClick) Sound.play(this.soundClick);
            this.onAction(); // Execute the button's specific action
            this.emit('button_click'); // Emit generic click event
        } else {
             this.texture = this.textureDefault; // Go to default if pointer slid off
        }
    }

     _onPointerUpOutside() {
         if (!this.interactive) return;
         this.texture = this.textureDefault; // Reset texture if released outside
         this.emit('button_upoutside');
     }

    // Method to be overridden by subclasses for specific click action
    onAction() {
        console.warn(`onAction() not implemented for button: ${this.constructor.name}`);
    }

    // Activate/Deactivate button interactivity
    setEnabled(enabled) {
        // Only allow enabling if the texture is valid
        if (enabled && this.textureDefault === PIXI.Texture.EMPTY) {
            enabled = false;
            console.warn("Cannot enable button with invalid texture.");
        }

        this.interactive = enabled;
        this.buttonMode = enabled;
        this.alpha = enabled ? 1.0 : 0.5; // Example: Dim when disabled
        if(!enabled) {
            this.texture = this.textureDefault; // Reset texture if disabled
        }
    }


    // Add listeners when added to stage
    castAdded() {
        // Add listeners only if interactive (texture was valid)
        if (this.interactive) {
            this.on('pointerover', this._onPointerOver);
            this.on('pointerout', this._onPointerOut);
            this.on('pointerdown', this._onPointerDown);
            this.on('pointerup', this._onPointerUp);
            this.on('pointerupoutside', this._onPointerUpOutside);
        }
    }

    // Remove listeners when removed (or destroyed)
    castRemoved() {
       // Listeners removed by PIXI destroy
    }

     destroy(options) {
        // Explicitly remove listeners to be safe, though PIXI should handle it
        this.off('pointerover', this._onPointerOver);
        this.off('pointerout', this._onPointerOut);
        this.off('pointerdown', this._onPointerDown);
        this.off('pointerup', this._onPointerUp);
        this.off('pointerupoutside', this._onPointerUpOutside);
        super.destroy(options);
    }
}