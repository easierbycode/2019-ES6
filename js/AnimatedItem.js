// AnimatedItem.js
// Ensure PIXI is globally available and PIXI.extras is defined

// --- Safety Check ---
if (typeof PIXI === 'undefined' || typeof PIXI.extras === 'undefined' || typeof PIXI.extras.AnimatedSprite === 'undefined') {
    throw new Error("AnimatedItem.js requires PIXI with PIXI.extras.AnimatedSprite (likely from PIXI v4). Ensure pixi.js is loaded and initialized before this script.");
}
// --- End Safety Check ---


/**
 * Represents an animated item drop (like powerups).
 */
export class AnimatedItem extends PIXI.extras.AnimatedSprite {
    /**
     * @param {Array<PIXI.Texture>} textures - Array of textures for the animation.
     * @param {string} itemName - The type name of the item (e.g., 'big', 'barrier', 'speed_high').
     */
    constructor(textures, itemName) {
        const validTextures = textures?.filter(t => t instanceof PIXI.Texture);

        // Call super constructor - MUST be called even with fallback
        if (!validTextures || validTextures.length === 0) {
            console.error(`AnimatedItem: Invalid or missing textures for item: ${itemName}. Using EMPTY.`);
            super([PIXI.Texture.EMPTY]); // Pass an array with Empty texture
        } else {
            super(validTextures);
        }

        this.itemName = itemName;
        this.animationSpeed = 0.08;
        this.anchor.set(0.5);
        this.loop = true;
        this.interactive = false; // Items usually aren't directly interactive

        // --- ADDED: Explicit Hit Area ---
        // Calculate width/height AFTER super() has potentially set them based on textures
        // Use Math.max to prevent 0x0 hitArea if texture is empty or fails to load dimensions
        const itemWidth = Math.max(1, this.width);
        const itemHeight = Math.max(1, this.height);
        // Set hitArea relative to the anchor point (0.5, 0.5)
        this.hitArea = new PIXI.Rectangle(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight);
        console.log(`AnimatedItem (${this.itemName}) created. HitArea: (${this.hitArea.x}, ${this.hitArea.y}, ${this.hitArea.width}, ${this.hitArea.height})`);
        // --- END ADDED ---

        if (this.textures && this.textures.length > 1) {
            this.play();
        }
    }

    // Add loop method if items need specific update logic (e.g., bobbing)
    loop(delta) {
        // No-op placeholder; GameScene expects items to expose loop().
        // Extend this method if items require per-frame behavior.
    }
}
