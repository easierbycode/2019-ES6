// BaseCast.js
// Ensure PIXI is global for v4

export class BaseCast extends PIXI.Container {
    constructor(id) { // Keep id if some subclasses use it
        super();
        this.id = id;
        // Use arrow functions for listeners to maintain 'this' context easily
        this._onCastAdded = (parent) => {
            this.parentNode = parent; // Keep track if needed
            this.castAdded();
        };
        this._onCastRemoved = (parent) => {
            this.parentNode = null; // Clear reference
            this.castRemoved();
        };

        this.on('added', this._onCastAdded);
        this.on('removed', this._onCastRemoved);
    }

    // Methods to be overridden by subclasses
    castAdded() {}
    castRemoved() {}

    destroy(options) {
        // Ensure listeners are removed
        this.off('added', this._onCastAdded);
        this.off('removed', this._onCastRemoved);
        super.destroy(options);
    }
}