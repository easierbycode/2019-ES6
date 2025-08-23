// ui/HUD.js
import { BaseCast } from '../BaseCast.js'; // Assuming BaseCast is in the parent directory
import * as Constants from '../constants.js';
import * as Utils from '../utils.js';
import * as Sound from '../soundManager.js'; // <<< ADDED IMPORT
import { SmallNumberDisplay } from './SmallNumberDisplay.js';
import { ComboNumberDisplay } from './ComboNumberDisplay.js';
import { CaButton } from './CaButton.js'; // Assuming CaButton is in the ui directory
import { ScorePopup } from './ScorePopup.js'; // Import ScorePopup


export class HUD extends BaseCast {
    static CUSTOM_EVENT_CA_FIRE = "customEventCaFire";

    constructor() {
        super('hud'); // Pass an ID to BaseCast

        // Texture loading is handled by constructors of child elements
        // (BigNumberDisplay, CaButton, etc.) or using PIXI.Texture.fromFrame

        // --- Create UI Elements ---
        const uiTextures = PIXI.loader?.resources?.game_ui?.textures; // Access textures safely

        this.hudBg = new PIXI.Sprite(uiTextures ? uiTextures["hudBg0.gif"] : PIXI.Texture.EMPTY);
        this.addChild(this.hudBg);

        this.hudDamageBg = new PIXI.Sprite(uiTextures ? uiTextures["hudBg1.gif"] : PIXI.Texture.EMPTY);
        this.hudDamageBg.alpha = 0; // Start hidden
        this.addChild(this.hudDamageBg);

        this.hpBar = new PIXI.Sprite(uiTextures ? uiTextures["hpBar.gif"] : PIXI.Texture.EMPTY);
        this.hpBar.position.set(49, 7);
        this.hpBar.scale.x = 1; // Start full
        this.addChild(this.hpBar);

        this.cagaBtn = new CaButton(); // CaButton constructor handles its textures
        this.cagaBtn.position.set(Constants.GAME_DIMENSIONS.WIDTH - 70, Constants.GAME_DIMENSIONS.CENTER_Y + 15);
        this.addChild(this.cagaBtn);

        this.scoreTitleTxt = new PIXI.Sprite(uiTextures ? uiTextures["smallScoreTxt.gif"] : PIXI.Texture.EMPTY);
        this.scoreTitleTxt.position.set(30, 25);
        this.addChild(this.scoreTitleTxt);

        this.scoreNumTxt = new SmallNumberDisplay(10); // SmallNumberDisplay handles textures
        this.scoreNumTxt.position.set(this.scoreTitleTxt.x + this.scoreTitleTxt.width + 2, this.scoreTitleTxt.y);
        this.addChild(this.scoreNumTxt);

        this.comboBar = new PIXI.Sprite(uiTextures ? uiTextures["comboBar.gif"] : PIXI.Texture.EMPTY);
        this.comboBar.position.set(149, 32);
        this.comboBar.scale.x = 0; // Start empty
        this.addChild(this.comboBar);

        this.comboNumTxt = new ComboNumberDisplay(); // ComboNumberDisplay handles textures
        this.comboNumTxt.position.set(194, 19);
        this.addChild(this.comboNumTxt);

        this.scoreViewWrap = new PIXI.Container();
        this.addChildAt(this.scoreViewWrap, 5); // Add on top

        // --- State ---
        this.comboTimeCnt = 0; // Seconds remaining for combo
        this.comboTimeoutSeconds = 3.0; // How long combo lasts
        this._comboCount = 0;
        this._maxComb = 0;
        this._scoreCount = 0;
        this._highScore = 0;
        this._cagageCount = 0;
        this.cagageFlg = false; // Is CA Ready?
        this.caFireFlg = false; // Is CA currently firing? (Used by GameScene)

        // --- Input Listeners ---
        // HUD listens for keyboard input for CA, Scene handles player movement
        this.onKeyUpListener = this.onKeyUp.bind(this);
        this._listenersAttached = false; // Track if attached
    }

    attachInputListeners() {
        if (this._listenersAttached || typeof document === 'undefined') return;
        document.addEventListener("keyup", this.onKeyUpListener);
        this._listenersAttached = true;
    }

    detachInputListeners() {
        if (!this._listenersAttached || typeof document === 'undefined') return;
        document.removeEventListener("keyup", this.onKeyUpListener);
        this._listenersAttached = false;
    }

    onKeyUp(event) {
        switch (event.keyCode) {
            case 32: // Space bar
                if (this.cagageFlg && this.cagaBtn && this.cagaBtn.interactive) { // Check button state too
                    this.caFire();
                }
                break;
        }
        event.preventDefault();
    }

    // --- Update Loop ---
    loop(delta) {
        this.comboTimeCnt -= .1,
            this.comboTimeCnt <= 0 && (this.comboTimeCnt = 0,
                1 == this.comboFlg && (this.comboCount = 0,
                    this.comboFlg = !1)),
            this.comboBar.scale.x = this.comboTimeCnt / 100
    }

    // --- CA Logic ---
    caPrepareOk() {
        this.cagageFlg = true;
        this.cagaBtn?.onPrepareOk(); // Safely call button method
        if (!this.caFireFlg) { // Don't activate if CA is already firing (unlikely state, but safe)
            this.caBtnActive();
        }
    }

    caFire() {
        Utils.dlog("HUD caFire triggered");
        if (!this.cagageFlg) return;

        Sound.play('se_ca'); // Play sound using imported module
        this.cagageCount = 0; // Reset CA gauge (use setter)
        this.cagaBtn?.triggerCaFire(); // Reset button visual state
        this.caBtnDeactive(); // Deactivate button input
        this.emit(HUD.CUSTOM_EVENT_CA_FIRE); // Emit event for GameScene
    }

    caBtnActive() {
        this.cagaBtn?.setEnabled(true); // *** FIX: Use setEnabled instead of onActive ***
        this.cagaBtn?.on('pointerup', this.caFire, this); // Add listener
        this.attachInputListeners(); // Listen for spacebar
    }

    caBtnDeactive(isClear = false) {
        this.cagaBtn?.off('pointerup', this.caFire, this); // Remove listener
        this.cagaBtn?.setEnabled(false); // *** FIX: Disable interaction ***
        this.cagaBtn?.onDeactivate(); // *** FIX: Reset visuals ***
        if (this.cagaBtn) this.cagaBtn.isClear = isClear; // Pass flag for visual state
        this.detachInputListeners(); // Stop listening for spacebar
    }

    // --- Visual Updates ---
    onDamage(playerPercent) {
        this.setPercent(playerPercent); // Update HP bar display

        // Damage flash effect on HUD background
        if (this.hudDamageBg && this.hudDamageBg.alpha === 0) { // Prevent overlapping flashes
            TweenMax.to(this.hudDamageBg, 0.1, { alpha: 1, yoyo: true, repeat: 3 });
        }
        // HP Bar flash
        if (this.hpBar) {
            TweenMax.fromTo(this.hpBar, 0.1, { tint: 0xFF0000 }, { tint: 0xFFFFFF, yoyo: true, repeat: 1, overwrite: "auto" });
        }
    }

    recovery(playerPercent) {
        this.setPercent(playerPercent); // Update HP bar display
        // Optional: Add a recovery flash effect
    }

    setPercent(percent) {
        if (this.hpBar) {
            TweenMax.to(this.hpBar.scale, 0.5, { x: Math.max(0, Math.min(1, percent)) }); // Clamp value 0-1
        }
    }

    // Score popup display logic
    scoreView(enemyContext) {
        if (!enemyContext || !this.scoreViewWrap) return;

        // Use ratio from HUD state
        const ratio = Math.max(1, Math.ceil(this._comboCount / 10));
        const scorePopup = new ScorePopup(enemyContext.score, ratio); // Use dedicated ScorePopup class

        // Check if scorePopup was created successfully
        if (!scorePopup || !scorePopup.children || scorePopup.children.length === 0) {
            Utils.dlog("ScorePopup creation failed or is empty, skipping display.");
            return;
        }


        // Position based on enemy's center in its container
        const enemyBounds = enemyContext.getBounds(); // Get world bounds
        const scorePos = this.scoreViewWrap.toLocal(new PIXI.Point(enemyBounds.x + enemyBounds.width / 2, enemyBounds.y)); // Convert world to local

        scorePopup.x = scorePos.x - scorePopup.width / 2;
        scorePopup.y = scorePos.y - scorePopup.height;
        this.scoreViewWrap.addChild(scorePopup);

        scorePopup.animate(); // Start the popup animation
    }

    // --- Getters & Setters ---
    get cagageCount() { return this._cagageCount; }
    set cagageCount(value) {
        if (this.caFireFlg) return; // Don't change gauge while firing CA
        this._cagageCount = Math.max(0, Math.min(100, value));
        const percent = this._cagageCount / 100;
        this.cagaBtn?.setPercent(percent); // Update button visual
        if (percent >= 1 && !this.cagageFlg) {
            this.caPrepareOk();
        } else if (percent < 1 && this.cagageFlg) {
            this.cagageFlg = false; // No longer ready
            this.caBtnDeactive(); // Deactivate button
        }
    }

    get scoreCount() { return this._scoreCount; }
    set scoreCount(value) {
        // Calculate multiplier based on current combo
        const ratio = Math.max(1, Math.ceil(this._comboCount / 10));
        const scoreToAdd = value * ratio;
        this._scoreCount += scoreToAdd;
        this.scoreNumTxt?.setNum(this._scoreCount); // Update display

        // Update high score if needed
        if (this._scoreCount > this._highScore) {
            this._highScore = this._scoreCount;
            // Optionally update a high score display if HUD shows it
        }
    }

    get highScore() { return this._highScore; }
    set highScore(value) {
        this._highScore = value;
        // Update display if needed
    }

    get comboCount() { return this._comboCount; }
    set comboCount(t) {
        0 == t ? this._comboCount = 0 : (this.comboTimeCnt = 100,
            this._comboCount += t,
            this.comboFlg = !0),
            this.comboNumTxt.setNum(this._comboCount),
            this._comboCount >= this._maxComb && (this._maxComb = this._comboCount)
    }

    get maxCombCount() { return this._maxComb; }
    set maxCombCount(value) { this._maxComb = value; }


    // --- Cleanup ---
    castAdded() {
        super.castAdded(); // Call BaseCast method
        // Initial activation depends on the cagageCount being set,
        // so don't explicitly call caBtnActive here. Let the setter handle it.
        // Set initial state based on current cagage
        this.cagageCount = this._cagageCount;
    }

    castRemoved() {
        super.castRemoved(); // Call BaseCast method
        this.caBtnDeactive(); // Ensure listeners are removed
        // Clean up tweens
        TweenMax.killTweensOf(this.hudDamageBg);
        TweenMax.killTweensOf(this.hpBar.scale);
        TweenMax.killTweensOf(this.hpBar);
        this.scoreViewWrap.children.forEach(child => {
            if (child instanceof ScorePopup) {
                TweenMax.killTweensOf(child); // Kill ScorePopup animations specifically
            }
        });
    }

    destroy(options) {
        this.detachInputListeners(); // Ensure detachment
        this.onKeyUpListener = null;
        // Child elements are destroyed by PIXI cascade if children:true
        super.destroy(options);
    }
}