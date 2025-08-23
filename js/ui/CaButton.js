// ui/CaButton.js
import { BaseCast } from '../BaseCast.js';
import * as Constants from '../constants.js';
// No longer need globals

export class CaButton extends BaseCast {
    constructor() {
        super();

        // --- Access textures directly ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        if (!uiTextures) {
            console.error("CaButton: game_ui textures not loaded!");
            // Maybe add a visual indicator of the error or return early
            return;
        }

        // Backgrounds
        this.hudCabtnBg1 = new PIXI.Sprite(uiTextures["hudCabtnBg1.gif"] || PIXI.Texture.EMPTY);
        this.hudCabtnBg1.anchor.set(0.5);
        this.hudCabtnBg1.position.set(32, 32); // Adjust based on actual texture size if not 64x64
        this.hudCabtnBg1.alpha = 0;
        this.addChild(this.hudCabtnBg1);

        this.hudCabtnBg0 = new PIXI.Sprite(uiTextures["hudCabtnBg0.gif"] || PIXI.Texture.EMPTY);
        this.hudCabtnBg0.position.set(0, 0);
        this.hudCabtnBg0.alpha = 0;
        this.addChild(this.hudCabtnBg0);

        // Bar Background (100% state)
        this.caGageBarBg = new PIXI.Sprite(uiTextures["hudCabtn100per.gif"] || PIXI.Texture.EMPTY);
        this.addChild(this.caGageBarBg);

        // Fill Bar (0% state) - will be revealed by mask
        this.caGageBar = new PIXI.Sprite(uiTextures["hudCabtn0per.gif"] || PIXI.Texture.EMPTY);
        this.addChild(this.caGageBar);

        // Get dimensions AFTER creating sprites
        const barWidth = this.caGageBarBg.width || 67; // Use texture width or default
        const barHeight = this.caGageBarBg.height || 67;
        const maskHeight = 50; // From original code
        const maskY = 58; // From original code
        const maskX = 8; // From original code

        // Mask - Position relative to this container's origin (0,0)
        this.caGageBarMask = new PIXI.Graphics()
            .beginFill(0xFF00FF)
            .drawRect(maskX, maskY - maskHeight, barWidth - (2*maskX), maskHeight) // Adjust rect based on sprite dimensions
            .endFill();
        this.addChild(this.caGageBarMask);
        this.caGageBar.mask = this.caGageBarMask;
        this.caGageBarMask.scale.y = 0; // Start empty

        // Hover/Click Feedback Circle
        this.overCircle = new PIXI.Graphics()
            .beginFill(0xFFFFFF)
            .drawCircle(barWidth / 2, barHeight / 2, (barWidth / 2) - 5) // Center circle dynamically
            .endFill();
        this.overCircle.alpha = 0;
        this.addChild(this.overCircle);

        // State
        this.okFlg = false;
        this.isClear = false;
        this._isEnabled = false;

        // Pulsing Animation Timeline
        this.timeline = new TimelineMax({ paused: true, repeat: -1, yoyo: true });
        this.timeline.to(this.hudCabtnBg1, 0.4, { alpha: 1 });

        // Hit Area (relative to top-left origin of this container)
        this.hitArea = new PIXI.Rectangle(5, 5, barWidth - 10, barHeight - 12);

        // Bind listeners
        this._onPointerOver = this._onPointerOver.bind(this);
        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onPointerUpOutside = this._onPointerUpOutside.bind(this);
    }

    setPercent(percent) {
         percent = Math.max(0, Math.min(1, percent));
         if (this.caGageBarMask) { // Check if mask exists
             this.caGageBarMask.scale.y = percent;
         }

         if (percent >= 1 && !this.okFlg) {
             this.okFlg = true;
             this.onPrepareOk();
         } else if (percent < 1 && this.okFlg) {
             this.okFlg = false;
             this.onDeactivate(); // Call unified deactivation logic
         }
    }

    onPrepareOk() { // Renamed from onPrepearOk
        if (!this.hudCabtnBg0 || !this.hudCabtnBg1) return; // Safety check
        this.hudCabtnBg0.alpha = 1;
        this.hudCabtnBg1.alpha = 1;
        this.hudCabtnBg1.scale.set(1.4);
        TweenMax.to(this.hudCabtnBg1.scale, 0.5, { x: 1, y: 1, ease: Back.easeOut.config(1.7) });
        this.timeline?.restart();

        if (!this.isClear) {
            this.setEnabled(true);
        }
    }

    onDeactivate() { // Unified deactivation logic
        this.setEnabled(false);
        this.timeline?.pause();
        if(this.hudCabtnBg0) this.hudCabtnBg0.alpha = 0;
        if(this.hudCabtnBg1) this.hudCabtnBg1.alpha = 0;
        this.okFlg = false; // Ensure flag is reset
    }

    triggerCaFire() { // Renamed from caFire
        if (!this.okFlg) return; // Check if actually ready
        this.okFlg = false;
        this.timeline?.pause();
        if(this.hudCabtnBg1) this.hudCabtnBg1.alpha = 0;
        if(this.hudCabtnBg0) this.hudCabtnBg0.alpha = 0;
        this.setEnabled(false);
        this.setPercent(0);
    }

    // Add resetVisuals method if needed by HUD logic
    resetVisuals() {
        this.timeline?.pause();
        if(this.hudCabtnBg0) this.hudCabtnBg0.alpha = 0;
        if(this.hudCabtnBg1) this.hudCabtnBg1.alpha = 0;
        this.setPercent(this.okFlg ? 1 : 0); // Reflect current state
    }


    setEnabled(enabled) {
        if (this._isEnabled === enabled) return;

        this._isEnabled = enabled;
        this.interactive = enabled;
        this.buttonMode = enabled;

        if (enabled && this.okFlg) {
            this.on('pointerover', this._onPointerOver);
            this.on('pointerdown', this._onPointerDown);
            this.on('pointerup', this._onPointerUp);
            this.on('pointerupoutside', this._onPointerUpOutside);
        } else {
            this.off('pointerover', this._onPointerOver);
            this.off('pointerdown', this._onPointerDown);
            this.off('pointerup', this._onPointerUp);
            this.off('pointerupoutside', this._onPointerUpOutside);
            // Ensure hover effect is off when disabled
            TweenMax.killTweensOf(this.overCircle);
            this.overCircle.alpha = 0;
        }
    }

     _onPointerOver(event) {
         if (!this.interactive) return;
         TweenMax.killTweensOf(this.overCircle); // Kill previous fade out
         TweenMax.to(this.overCircle, 0.1, { alpha: 0.65 });
     }

     _onPointerDown(event) {
         if (!this.interactive) return;
         const startX = this.x;
         const startY = this.y;
         TweenMax.killTweensOf(this, { x: true, y: true });
         TweenMax.to(this, 0.01, { x: startX, y: startY - 1, delay: 0 });
         TweenMax.to(this, 0.01, { x: startX - 1, y: startY + 1, delay: 0.05 });
         TweenMax.to(this, 0.01, { x: startX + 1, y: startY - 1, delay: 0.10 });
         TweenMax.to(this, 0.01, { x: startX, y: startY, delay: 0.15 });
     }

     _onPointerUp(event) {
         if (!this.interactive || !this.okFlg) return; // Check if enabled and ready
          // Check if pointer is still over the button
          const globalPoint = event.data.global;
          const localPoint = this.toLocal(globalPoint);
          const isOver = this.hitArea.contains(localPoint.x, localPoint.y);

         if (isOver) {
             this.emit('ca_button_click'); // Emit event for HUD
             // Fade out hover effect on click release
             TweenMax.to(this.overCircle, 0.3, { alpha: 0 });
         } else {
             // Reset hover effect if pointer slid off
             this.overCircle.alpha = 0;
         }
     }

      _onPointerUpOutside(event) {
           if (!this.interactive) return;
           this.overCircle.alpha = 0; // Ensure hover effect is off
      }


    castAdded() {
        this.setEnabled(false); // Start disabled
        this.setPercent(0); // Ensure mask is reset
    }

    castRemoved() {
        this.timeline?.kill();
        this.setEnabled(false);
    }

     destroy(options) {
        this.timeline?.kill();
        this.setEnabled(false);
        super.destroy(options);
     }
}