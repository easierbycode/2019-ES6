// BaseUnit.js
import { BaseCast } from './BaseCast.js'; // Correct import
import { gameState } from './gameState.js';
import * as Utils from './utils.js'; // Import Utils for logging

let baseUnitIdCounter = 0; // Simple counter for unique IDs

// Ensure BaseCast is defined before this or imported correctly
export class BaseUnit extends BaseCast { // BaseCast should extend PIXI.Container
    static CUSTOM_EVENT_DEAD = "customEventdead";
    static CUSTOM_EVENT_DEAD_COMPLETE = "customEventdeadComplete";
    static CUSTOM_EVENT_TAMA_ADD = "customEventtamaadd";

    constructor(animationFrames, explosionFrames = null) {
        super();
        this.id = `unit_${baseUnitIdCounter++}`; // Assign a unique ID

        // Ensure frames are textures
        const animFrames = Array.isArray(animationFrames) ? animationFrames.filter(t => t instanceof PIXI.Texture) : [];
        const exploFrames = Array.isArray(explosionFrames) ? explosionFrames.filter(t => t instanceof PIXI.Texture) : [];

        this.shadowReverse = true;
        this.speed = 0;
        this.hp = 1;
        this.deadFlg = false;
        this.shadowOffsetY = 0;

        // Use PIXI.extras.AnimatedSprite for v4
        // Ensure PIXI.extras exists before using it
        if (typeof PIXI === 'undefined' || typeof PIXI.extras === 'undefined' || typeof PIXI.extras.AnimatedSprite === 'undefined') {
             throw new Error("BaseUnit requires PIXI with PIXI.extras.AnimatedSprite (likely from PIXI v4).");
        }

        this.character = new PIXI.extras.AnimatedSprite(animFrames.length > 0 ? animFrames : [PIXI.Texture.EMPTY]);
        this.character.animationSpeed = 0.1;
        this.character.anchor.set(0.5);
        // Ensure character starts visible
        this.character.visible = true;
        this.character.name = `character_${this.id}`;

        this.shadow = new PIXI.extras.AnimatedSprite(animFrames.length > 0 ? animFrames : [PIXI.Texture.EMPTY]);
        this.shadow.animationSpeed = 0.1;
        this.shadow.tint = 0x000000;
        this.shadow.alpha = 0.5;
        this.shadow.anchor.set(0.5);
        // Ensure shadow starts visible (though may be hidden by specific units like Bullet)
        this.shadow.visible = true;
        this.shadow.name = `shadow_${this.id}`;

        this.unit = new PIXI.Container();
        this.unit.interactive = true; // Set based on subclass needs?
        this.unit.name = `unit_${this.id}`;
        // Set hitArea AFTER character is created and has dimensions
        // Use Math.max to ensure non-zero hit area if texture is empty
        const charWidth = this.character.width || 1;
        const charHeight = this.character.height || 1;
        this.unit.hitArea = new PIXI.Rectangle(
            -charWidth / 2, -charHeight / 2,
             Math.max(1, charWidth), Math.max(1, charHeight)
        );
        // Ensure unit starts visible
        this.unit.visible = true;

        if (exploFrames.length > 0) {
            this.explosion = new PIXI.extras.AnimatedSprite(exploFrames);
            this.explosion.anchor.set(0.5);
            // Store original textures for potential restoration (e.g., in Bullet)
            this.explosion.originalTextures = exploFrames;
            // Calculate scale based on character size AFTER character is created
            const scaleFactor = Math.min(1, (charHeight + 50) / this.explosion.height) + 0.2;
            this.explosion.scale.set(scaleFactor);
            this.explosion.animationSpeed = 0.4;
            this.explosion.loop = false;
            this.explosion.visible = false; // Explosion starts hidden
            this.explosion.name = `explosion_${this.id}`;
            Utils.dlog(`BaseUnit (${this.id}) Explosion created. Initial visibility: ${this.explosion.visible}`);
        } else {
            this.explosion = null;
            Utils.dlog(`BaseUnit (${this.id}) No explosion frames provided.`);
        }

        this.addChild(this.unit);
        this.unit.addChild(this.shadow);
        this.unit.addChild(this.character);
        if(this.explosion) this.addChild(this.explosion); // Add explosion to main container, not unit

        // Ensure the BaseUnit container itself is visible
        this.visible = true;
        Utils.dlog(`BaseUnit (${this.id}) CONSTRUCTOR END: BaseVis=${this.visible}, UnitVis=${this.unit.visible}, CharVis=${this.character.visible}, ExploVis=${this.explosion?.visible}`);
    }

    castAdded() {
        // Check if sprites exist and have multiple frames before playing
        if (this.character && this.character.textures.length > 1) this.character.play();
        if (this.shadow && this.shadow.textures.length > 1) this.shadow.play();
        this.updateShadowPosition();

        // Access gameState via import
        if (typeof gameState !== 'undefined' && gameState.hitAreaFlg) {
             this.drawHitbox();
        }
        // LOGGING visibility status when added
        this.visible = true; // Explicitly set visible on add
        this.unit.visible = true;
        this.character.visible = true;
        // Check parent visibility too
        const parentName = this.parent ? this.parent.name || 'Unnamed Parent' : 'No Parent';
        const parentVisible = this.parent ? this.parent.visible : 'N/A';
        const parentWorldVisible = this.parent ? this.parent.worldVisible : 'N/A';
        Utils.dlog(`${this.constructor.name} (${this.name || this.id || 'unknown'}) castAdded. BaseVis: ${this.visible}, UnitVis: ${this.unit?.visible}, CharVis: ${this.character?.visible}. Parent: ${parentName} (vis=${parentVisible}, worldVis=${parentWorldVisible}), WorldVis: ${this.worldVisible}`);
    }

    castRemoved() {
         // Let destroy handle cleanup
         Utils.dlog(`${this.constructor.name} (${this.name || this.id || 'unknown'}) castRemoved.`);
    }

    updateShadowPosition() {
         // Ensure character and shadow exist
         if (!this.character || !this.shadow) return;

         if (this.shadowReverse) {
             this.shadow.scale.y = -1;
             // Adjust based on anchor (0.5)
             this.shadow.y = this.character.height / 2 + this.shadow.height / 2 - this.shadowOffsetY;
         } else {
             this.shadow.scale.y = 1;
             // Adjust based on anchor (0.5)
             this.shadow.y = this.character.height / 2 + this.shadow.height / 2 - this.shadowOffsetY;
         }
         this.shadow.x = 0; // Keep X aligned due to anchor 0.5
    }


    drawHitbox() {
        if (!this.unit || !this.unit.hitArea) return; // Safety check
        if (this.hitbox) this.unit.removeChild(this.hitbox);
        this.hitbox = new PIXI.Graphics();
        this.hitbox.lineStyle(1, 0xFF0000, 0.7); // Red, slightly transparent
        this.hitbox.drawRect(
            this.unit.hitArea.x,
            this.unit.hitArea.y,
            this.unit.hitArea.width,
            this.unit.hitArea.height
        );
        this.unit.addChild(this.hitbox);
    }

     // Override destroy to ensure sprites are also destroyed
     destroy(options) {
         Utils.dlog(`${this.constructor.name} (${this.name || this.id || 'unknown'}) destroy called.`);
         if (this.character) this.character.destroy();
         if (this.shadow) this.shadow.destroy();
         if (this.explosion) this.explosion.destroy();
         if (this.unit) this.unit.destroy({ children: true }); // Destroy unit container and its children
         if (this.hitbox) this.hitbox.destroy();

         this.character = null;
         this.shadow = null;
         this.explosion = null;
         this.unit = null;
         this.hitbox = null;

         super.destroy(options); // Call BaseCast destroy
     }
}