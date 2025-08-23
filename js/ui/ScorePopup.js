// ScorePopup.js
import { BaseCast } from '../BaseCast.js';
import { SmallNumberDisplay } from './SmallNumberDisplay.js';
import * as Utils from '../utils.js';

export class ScorePopup extends BaseCast {
    constructor(score, multiplier) {
        super();

        const uiTextures = PIXI.loader?.resources?.game_ui?.textures;
        if (!uiTextures) {
            console.error("ScorePopup Error: 'game_ui' textures not found.");
            // Prevent further construction if textures are missing
            this.valid = false;
            return;
        }
        this.valid = true;

        // Display the base score value
        this.scoreDisplay = new SmallNumberDisplay(String(score).length); // Adjust digits based on score
        if (this.scoreDisplay.valid) {
            this.scoreDisplay.setNum(score);
            this.addChild(this.scoreDisplay);
        } else {
            console.error("ScorePopup failed: Base score SmallNumberDisplay invalid.");
            this.valid = false;
            return; // Stop if score display fails
        }

        let currentX = this.scoreDisplay.width + 2; // Position after the score

        // Add 'x' multiplier sprite if multiplier > 1
        if (multiplier > 1) {
            const multiplyTexture = uiTextures["smallNumKakeru.gif"];
            if (multiplyTexture && multiplyTexture !== PIXI.Texture.EMPTY) {
                const multiplySprite = new PIXI.Sprite(multiplyTexture);
                multiplySprite.x = currentX;
                this.addChild(multiplySprite);
                currentX += multiplySprite.width + 1; // Add spacing
            } else {
                 console.warn("ScorePopup: smallNumKakeru.gif texture not found.");
            }

            // Display the multiplier value using SmallNumberDisplay
            this.multiplierDisplay = new SmallNumberDisplay(String(multiplier).length);
            if (this.multiplierDisplay.valid) {
                this.multiplierDisplay.setNum(multiplier);
                this.multiplierDisplay.x = currentX;
                this.addChild(this.multiplierDisplay);
            } else {
                 console.error("ScorePopup failed: Multiplier SmallNumberDisplay invalid.");
                 // Continue without multiplier? If so, remove this return.
                 // If multiplier is critical, maybe mark as invalid: this.valid = false; return;
            }
        } else {
            this.multiplierDisplay = null; // Ensure it's null if no multiplier
        }

        this.alpha = 1; // Start visible for animation
    }

    // Call this to start the fade and rise animation
    animate() {
        if (!this.valid) return; // Don't animate if invalid

        const initialY = this.y;
        TweenMax.to(this, 0.8, {
            y: initialY - 20, // Move up
            alpha: 0, // Fade out
            ease: Power1.easeOut, // Optional easing
            onComplete: () => {
                // Attempt to remove from parent after animation
                if (this.parent) {
                    this.parent.removeChild(this);
                }
                // Destroy self and children after animation/removal
                this.destroy({ children: true });
            }
        });
    }

    castAdded() {}
    castRemoved() {
        // Ensure tweens are killed if removed prematurely
        TweenMax.killTweensOf(this);
    }

     // Override destroy to ensure child displays are cleaned up if needed
     destroy(options) {
         TweenMax.killTweensOf(this); // Kill any active animations
         // Destroy children explicitly if PIXI doesn't handle it automatically here
         // (though destroy({ children: true }) should suffice)
         // if (this.scoreDisplay) this.scoreDisplay.destroy();
         // if (this.multiplierDisplay) this.multiplierDisplay.destroy();
         this.scoreDisplay = null;
         this.multiplierDisplay = null;
         super.destroy(options); // Ensure children: true is passed if needed
     }
}