// ui/CutinContainer.js
import { BaseCast } from '../BaseCast.js';
import * as Constants from '../constants.js';
import { globals } from '../globals.js';

export class CutinContainer extends BaseCast {
    constructor() {
        super();
        this.valid = true; // Assume valid initially

        const uiTextures = PIXI.loader?.resources?.game_ui?.textures; // Still need this for bg/flash? Maybe not.
        const assetTextures = PIXI.loader?.resources?.game_asset?.textures; // <<< Access game_asset textures

        if (!assetTextures) {
            console.error("CutinContainer: game_asset textures not loaded!");
            // Avoid creating child elements if resources are missing
            this.valid = false;
            return;
        }
        // Keep uiTextures check if needed for other elements (like bg/flash, though they are graphics now)
        // if (!uiTextures) {
        //     console.warn("CutinContainer: game_ui textures not loaded (may affect background/flash if they used textures).");
        // }


        // Dim Background
        this.cutinBg = new PIXI.Graphics()
            .beginFill(0x000000, 0.9)
            .drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT)
            .endFill();
        this.addChild(this.cutinBg);

        // Cutin Sprite (texture changes during animation)
        this.cutin = new PIXI.Sprite(PIXI.Texture.EMPTY); // Start with no texture
        this.cutin.y = Constants.GAME_DIMENSIONS.CENTER_Y - 71; // Original Y position
        // Center horizontally? Original didn't specify x, assume 0?
        // this.cutin.x = Constants.GAME_DIMENSIONS.CENTER_X;
        // this.cutin.anchor.set(0.5); // Set anchor if positioning requires it
        this.addChild(this.cutin);

        // Final Flash Graphic
        this.flash = new PIXI.Graphics()
            .beginFill(0xF0E0D0, 1) // Original color 15658734
            .drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT)
            .endFill();
        this.flash.alpha = 0; // Start hidden
        this.addChild(this.flash);

        // Store frame textures - Load from assetTextures now
        this.cutinFrames = [];
        for (let i = 0; i < 9; i++) {
            const textureName = `cutin${i}.gif`;
            const tex = assetTextures[textureName]; // <<< Use assetTextures
            if (tex && tex !== PIXI.Texture.EMPTY) {
                this.cutinFrames.push(tex);
            } else {
                // Add specific warning here, inside the loop
                console.warn(`CutinContainer: Texture '${textureName}' not found in game_asset textures!`);
                // Optionally add placeholder: this.cutinFrames.push(PIXI.Texture.EMPTY);
            }
        }
        // Check after the loop if *any* frames were loaded
        if (this.cutinFrames.length === 0) {
             console.error("CutinContainer: No valid cutin frames loaded from game_asset! Container invalid.");
             this.valid = false; // Mark as invalid if no frames loaded at all
        }

        this.timeline = null;
        this.onCompleteCallback = null; // Store callback reference

        this.visible = false; // Start hidden by default
    }

    /**
     * Starts the cut-in animation sequence.
     * @param {function} [onCompleteCallback=null] - Optional function to call when the animation finishes.
     * @returns {gsap.core.Timeline | null} The GSAP Timeline instance or null if invalid.
     */
    start(onCompleteCallback = null) {
        if (!this.valid) {
            console.warn("CutinContainer.start() called, but container is invalid (missing textures).");
            return null;
        }

        this.stop(); // Stop any previous animation

        this.onCompleteCallback = onCompleteCallback;

        // Reset state
        this.visible = true;
        this.cutinBg.alpha = 0;
        this.flash.alpha = 0;
        this.cutin.texture = PIXI.Texture.EMPTY;
        if(this.cutin.parent !== this) this.addChild(this.cutin); // Ensure children are present
        if(this.cutinBg.parent !== this) this.addChild(this.cutinBg);
        if(this.flash.parent !== this) this.addChild(this.flash);


        this.timeline = new TimelineMax({
             onComplete: this._onAnimationComplete,
             onCompleteScope: this,
             onKill: () => { this.timeline = null; } // Clear reference on kill
        });

        // --- Build Timeline ---
        let currentTime = 0; // Relative time within the timeline

        // 1. Fade in Background
        this.timeline.to(this.cutinBg, 0.25, { alpha: 0.9 }, currentTime);
        currentTime += 0.25;

        // 2. Sequence Cutin Frames
        // Delays *after* displaying the frame (based on original code's structure)
        const frameDelays = [0.00, 0.08, 0.08, 0.08, 0.08, 0.08, 0.30, 0.10, 0.10];

        this.cutinFrames.forEach((frame, index) => {
            // Schedule texture change at the current time
            this.timeline.addCallback(() => {
                // Check if container/sprite still exists before setting texture
                if (this.cutin && !this.cutin.destroyed) {
                    this.cutin.texture = frame;
                }
            }, currentTime);

            // Increment current time by the delay for *this* frame
            // Ensure we don't go out of bounds on frameDelays
            const delay = (index < frameDelays.length) ? frameDelays[index] : 0.08;
            currentTime += delay;
        });

        // 3. Final Flash
        // The flash starts slightly after the last frame is scheduled to appear.
        // Adjust timing as needed based on visual inspection.
        const flashStartTime = currentTime + 0.1; // Start flash slightly after last frame set
        this.timeline.to(this.flash, 0.3, { alpha: 1 }, flashStartTime);

        return this.timeline;
    }

    /**
     * Stops the current animation and hides the container.
     */
    stop() {
        if (this.timeline) {
            this.timeline.kill(); // Kill stops and removes tweens/callbacks
            this.timeline = null;
        }
        this.visible = false; // Hide the container
    }

    _onAnimationComplete() {
        this.timeline = null; // Clear timeline reference
        if (this.onCompleteCallback) {
            try {
                this.onCompleteCallback();
            } catch (e) {
                console.error("Error in CutinContainer onComplete callback:", e);
            }
        }
        // GameScene usually removes it after completion, so hiding here might be redundant.
        // this.visible = false;
    }

    castAdded() {
        // Reset state when added (optional, if start() isn't always called immediately)
        this.stop(); // Ensure no animation is running
        this.visible = false; // Start hidden
        if(this.valid) { // Only reset visuals if valid
            this.cutinBg.alpha = 0;
            this.flash.alpha = 0;
            this.cutin.texture = PIXI.Texture.EMPTY;
        }
    }

    castRemoved() {
        this.stop(); // Clean up animation on removal
    }

     destroy(options) {
        this.stop(); // Ensure timeline is killed before destroying
        this.cutinFrames = null; // Clear texture array reference
        this.onCompleteCallback = null;
        // PIXI handles destroying children (bg, cutin, flash)
        super.destroy(options);
     }
}