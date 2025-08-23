// BaseSprite.js (Original 'K')
// Ensure PIXI is global for v4

export class BaseSprite extends PIXI.Sprite {
    constructor(texture) {
       super(texture);
       // Use arrow functions for listeners
       this._onCastAdded = (parent) => {
           this.castAdded();
       };
       this._onCastRemoved = (parent) => {
           this.castRemoved();
       };

       this.on('added', this._onCastAdded);
       this.on('removed', this._onCastRemoved);
   }

   // Methods to be overridden by subclasses
   castAdded() {}
   castRemoved() {}

   destroy(options) {
       this.off('added', this._onCastAdded);
       this.off('removed', this._onCastRemoved);
       super.destroy(options);
   }
}