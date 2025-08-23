// ui/StaffrollPanel.js
import { BaseCast } from '../BaseCast.js';
import * as Constants from '../constants.js';
import { StaffrollCloseButton } from './StaffrollCloseButton.js';
import { LinkButton } from './LinkButton.js';

export class StaffrollPanel extends BaseCast {
    constructor() {
        super();
        this.valid = true; // Assume valid initially
        this.interactive = true; // Block clicks behind it

        // Initialize properties to null
        this.bg = null;
        this.wakingG = null;
        this.namePanelBg = null;
        this.namePanel = null;
        this.namePanelMask = null;
        this.closeBtn = null;
        this.openTl = null;
        this.closeTl = null;

        // --- Access textures directly ---
        const uiResource = PIXI.loader?.resources?.game_ui;
        const uiTextures = uiResource?.textures;
        // --- End access ---

        if (!uiTextures) {
            console.error("StaffrollPanel Constructor: 'game_ui' resource not found or textures missing! Panel invalid.");
            this.valid = false;
            return; // Stop constructor execution
        }

        // --- Create UI Elements ---
        this.bg = new PIXI.Graphics()
            .beginFill(0x000000, 0.9)
            .drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT)
            .endFill();
        this.addChild(this.bg);

        // G Animation
        const gFrames = [];
        for (let i = 0; i < 8; i++) {
            const tex = uiTextures[`staffrollG${i}.gif`];
            if (tex) gFrames.push(tex);
        }
        if (gFrames.length > 0) {
            this.wakingG = new PIXI.extras.AnimatedSprite(gFrames); // PIXI v4
            this.wakingG.animationSpeed = 0.2;
            this.wakingG.anchor.set(0.5, 0);
            this.wakingG.x = Constants.GAME_DIMENSIONS.CENTER_X;
            this.wakingG.y = 55;
            this.addChild(this.wakingG);
        } else {
             console.warn("StaffrollPanel: G animation frames missing.");
        }

        // Name Panel and Mask
        const panelTexture = uiTextures["staffrollName.gif"];
        if (panelTexture && panelTexture !== PIXI.Texture.EMPTY) {
            const panelWidth = panelTexture.width;
            const panelHeight = panelTexture.height;
            const panelX = 15;
            const panelY = 90;

            this.namePanelBg = new PIXI.Graphics()
                .beginFill(0x464646, 0.66)
                .drawRect(0, 0, panelWidth, panelHeight)
                .endFill();
            this.namePanelBg.position.set(panelX, panelY);
            this.addChild(this.namePanelBg);

            this.namePanel = new PIXI.Sprite(panelTexture);
            this.namePanel.position.set(panelX, panelY);
            this.addChild(this.namePanel);

            this.namePanelMask = new PIXI.Graphics()
                .beginFill(0xFF00FF)
                .drawRect(0, 0, panelWidth, panelHeight)
                .endFill();
            this.namePanelMask.position.set(panelX, panelY);
            this.addChild(this.namePanelMask);
            this.namePanel.mask = this.namePanelMask;

            // Add Link Buttons - relies on namePanel being created
            this.addLinkButton("staffrollTwitterBtn.gif", "https://twitter.com/takaNakayama", 165, 28);
            this.addLinkButton("staffrollTwitterBtn.gif", "https://twitter.com/bengasu", 131, 186);
            this.addLinkButton("staffrollTwitterBtn.gif", "https://twitter.com/rereibara", 178, 214);
            this.addLinkButton("staffrollLinkBtn.gif", "https://magazine.jp.square-enix.com/biggangan/introduction/highscoregirl/", 153, 239);
            this.addLinkButton("staffrollLinkBtn.gif", "http://hi-score-girl.com/", 161, 265);

        } else {
            console.error("StaffrollPanel: staffrollName.gif texture missing! Cannot create name panel.");
            this.valid = false; // Mark panel as invalid if core element missing
        }

        // Close Button (Constructor checks texture)
        this.closeBtn = new StaffrollCloseButton();
        if (this.closeBtn.texture && this.closeBtn.texture !== PIXI.Texture.EMPTY) {
             this.closeBtn.anchor.set(1.0, 0.5);
             this.closeBtn.x = Constants.GAME_DIMENSIONS.WIDTH - 15;
             this.closeBtn.y = 102;
             this.closeBtn.on('close_staffroll', this.close.bind(this));
             this.addChild(this.closeBtn);
        } else {
             console.warn("StaffrollPanel: Close button failed to initialize or is invalid.");
             this.closeBtn = null; // Ensure it's null if invalid
        }
    }

    addLinkButton(textureName, url, x, y) {
        if (!this.valid || !this.namePanel) return; // Check if panel is valid and namePanel exists

        const button = new LinkButton(textureName, url); // Constructor handles texture check
        if (button.interactive) { // Check if button became interactive (texture was valid)
            button.position.set(x, y);
            this.namePanel.addChild(button);
        } else {
             console.warn(`StaffrollPanel: Failed to add LinkButton for ${url}.`);
             // Optionally destroy the invalid button instance
             button.destroy();
        }
    }

    openAnimation() {
        if (!this.valid) {
            console.warn("Cannot open invalid StaffrollPanel.");
            return;
        }
        if (this.openTl) this.openTl.kill();
        if (this.closeTl) this.closeTl.kill();

        // Reset states safely
        if(this.bg) this.bg.alpha = 0;
        if (this.wakingG) {
            this.wakingG.alpha = 1;
            this.wakingG.y = -this.wakingG.height;
        }
        if(this.namePanelBg) this.namePanelBg.scale.y = 0;
        if (this.namePanel) { // Check if namePanel exists
             this.namePanel.y = (this.namePanelBg?.y || 90) + (this.namePanel.height); // Start below mask
        }
        if (this.closeBtn) {
            this.closeBtn.visible = true;
            this.closeBtn.alpha = 0;
            this.closeBtn.rotation = Math.PI * 2;
            this.closeBtn.scale.set(2);
        }

        this.openTl = new TimelineMax({
            onKill: () => { this.openTl = null; }
        });

        if (this.bg) this.openTl.to(this.bg, 0.2, { alpha: 0.9 });

        if (this.wakingG) {
            this.openTl.to(this.wakingG, 0.8, { y: 55, ease: Power1.easeOut }, "-=0.1");
            this.wakingG.gotoAndPlay(0); // Start G animation
        }

        if(this.namePanelBg) this.openTl.to(this.namePanelBg.scale, 1.0, { y: 1, ease: Elastic.easeOut.config(1, 0.5) }, "-=0.7");
        if(this.namePanel) this.openTl.to(this.namePanel, 1.0, { y: this.namePanelBg?.y || 90, ease: Quint.easeOut }, "<+0.2");

        if (this.closeBtn) {
            this.openTl
                .to(this.closeBtn, 0.6, { rotation: 0, alpha: 1, ease: Power1.easeOut }, "-=0.8")
                .to(this.closeBtn.scale, 0.6, { x: 1, y: 1, ease: Back.easeOut.config(1.7) }, "<");
        }
    }

    close() {
        if (!this.valid) {
            console.warn("Cannot close invalid StaffrollPanel.");
             if (this.parent) this.parent.removeChild(this); // Just remove if invalid
            return;
        }
        if (this.openTl) this.openTl.kill();
        if (this.closeTl && this.closeTl.isActive()) return;

        if(this.closeBtn) this.closeBtn.interactive = false; // Disable immediately

        this.closeTl = new TimelineMax({
            onComplete: () => {
                this.closeTl = null;
                if (this.parent) this.parent.removeChild(this);
            },
             onKill: () => { this.closeTl = null; }
        });

        const panelOffscreenY = (this.namePanelBg?.y || 90) + (this.namePanel?.height || 300);
        const duration = 0.8;

        if(this.namePanel) this.closeTl.to(this.namePanel, duration * 0.6, { y: panelOffscreenY, ease: Quint.easeIn }, 0);
        if(this.namePanelBg) this.closeTl.to(this.namePanelBg.scale, duration, { y: 0, ease: Quint.easeOut }, 0.1);
        if(this.bg) this.closeTl.to(this.bg, duration * 0.4, { alpha: 0 }, duration * 0.5);
        if (this.wakingG) this.closeTl.to(this.wakingG, duration * 0.8, { alpha: 0, y: 100, ease: Power1.easeIn }, 0.15);
    }

    castAdded() {
        if (!this.valid) {
            console.error("StaffrollPanel added to stage but is invalid. Removing.");
            if (this.parent) this.parent.removeChild(this);
            this.destroy(); // Destroy invalid instance
            return;
        }
        this.openAnimation();
    }

    castRemoved() {
        this.openTl?.kill();
        this.closeTl?.kill();
        this.wakingG?.stop(); // Use optional chaining
    }

     destroy(options) {
         this.openTl?.kill();
         this.closeTl?.kill();
         super.destroy(options);
     }
}