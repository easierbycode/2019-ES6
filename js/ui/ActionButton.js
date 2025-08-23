// ui/ActionButton.js
import { BaseCast } from '../BaseCast.js'; // Assuming BaseCast extends PIXI.Container
import * as Constants from '../constants.js';
import * as Sound from '../soundManager.js';
// import { globals } from '../globals.js'; // Not needed for resources if constructor gets them

export class ActionButton extends BaseCast {
    constructor() {
        super(); // BaseCast ID not needed?

        // Transparent hit area covering the screen (or relevant part)
        // Make hitGra interactive right away
        this.hitGra = new PIXI.Graphics()
            .beginFill(0xFF00FF, 0) // Initially transparent magenta for debugging, change to 0 for production
            // .beginFill(0xFF00FF, 0.2) // Use for debugging visibility
            .drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT)
            .endFill();
        this.hitGra.interactive = true;  // Make the hit area interactive
        this.hitGra.buttonMode = true;   // Show hand cursor over hit area
        this.addChild(this.hitGra);

        // Text style
        const textStyle = new PIXI.TextStyle({
            fontSize: 16,
            fontFamily: "sans-serif", // Consider a more specific pixel font if available
            fontWeight: "bold",
            lineHeight: 18,
            fill: 0xFFFFFF, // White
            stroke: 0x000000, // Black stroke
            strokeThickness: 3,
            align: 'right'
        });

        this.actionText = new PIXI.Text("", textStyle);
        this.actionText.anchor.set(1.0, 1.0); // Anchor bottom-right
        this.actionText.position.set(Constants.GAME_DIMENSIONS.WIDTH - 10, Constants.GAME_DIMENSIONS.HEIGHT - 20);
        // Ensure text is not interactive itself, clicks go through to hitGra
        this.actionText.interactive = false;
        this.addChild(this.actionText);

        // Set initial state for the container itself
        this.interactive = false; // Start non-interactive until shown
        this.buttonMode = false; // Cursor only changes when hitGra is active
        this.visible = false; // Start hidden

        this.timeline = null; // For flashing animation

        // Bind the onAction method to ensure correct 'this' context
        this.onAction = this.onAction.bind(this);
    }

    setText(type) { // 'next' or 'go'
        let soundToPlay = null;
        if (type === 'next') {
             this.actionText.text = "Next▼";
             soundToPlay = 'se_cursor_sub';
        } else if (type === 'go') {
             this.actionText.text = "LET'S GO! ▶︎";
             soundToPlay = 'se_correct';
        } else {
             this.actionText.text = "";
        }

        if (soundToPlay) {
            Sound.play(soundToPlay);
        }
        this.startFlashing();
    }

    startFlashing() {
        this.stopFlashing(); // Kill previous animation
        this.actionText.alpha = 1; // Ensure visible before starting
        this.timeline = new TimelineMax({ repeat: -1, yoyo: true });
        this.timeline.to(this.actionText, 0.4, { delay: 0.2, alpha: 0.3 }); // Dim instead of fully invisible
    }

    stopFlashing() {
        if (this.timeline) {
            this.timeline.kill();
            this.timeline = null;
        }
        if (this.actionText) { // Check if text exists
            this.actionText.alpha = 1; // Ensure visible
        }
    }

    show() {
        console.log("ActionButton show() called"); // DEBUG
        this.visible = true;
        this.interactive = true; // Enable interaction on container
        if(this.hitGra) this.hitGra.interactive = true; // Ensure hitGra is interactive
        // Text is set via setText
    }

    hide() {
        console.log("ActionButton hide() called"); // DEBUG
        this.stopFlashing();
        this.visible = false;
        this.interactive = false; // Disable interaction on container
        if(this.hitGra) this.hitGra.interactive = false; // Ensure hitGra is not interactive
        if(this.actionText) this.actionText.text = "";
    }

    castAdded() {
        console.log("ActionButton castAdded"); // DEBUG
        // Ensure hitGra exists and is interactive before adding listener
        if (this.hitGra) {
            // Remove potential previous listener to prevent duplicates
            this.hitGra.off('pointerup', this.onAction); // Use bound method reference

            // Set interactive properties (redundant if set in constructor, but safe)
            this.hitGra.interactive = true;
            this.hitGra.buttonMode = true;

            // Add the listener using the bound method reference
            this.hitGra.on('pointerup', this.onAction);

            console.log("ActionButton pointerup listener attached to hitGra."); // DEBUG
        } else {
            console.error("ActionButton castAdded: hitGra does not exist!");
        }

        this.hide(); // Start hidden
    }

    castRemoved() {
        console.log("ActionButton castRemoved"); // DEBUG
        this.stopFlashing();
        // Remove listener when removed from stage
        if (this.hitGra) {
            this.hitGra.off('pointerup', this.onAction);
        }
    }

    onAction() {
        // Check if the button *container* itself is globally interactive before emitting
        if (!this.interactive || !this.visible) {
            console.log("ActionButton onAction called, but button is not interactive/visible. Ignoring."); // DEBUG
            return;
        }
        console.log("ActionButton onAction called, emitting action_triggered"); // DEBUG
        this.emit('action_triggered');
    }

    destroy(options) {
        console.log("ActionButton destroy"); // DEBUG
        this.stopFlashing();
        // Remove listeners explicitly to be safe
        if (this.hitGra) {
            this.hitGra.off('pointerup', this.onAction);
        }
        // PIXI will destroy children (hitGra, actionText)
        super.destroy(options);
    }
}