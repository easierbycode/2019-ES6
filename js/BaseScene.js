// BaseScene.js
// Ensure PIXI is global, Utils, globals, gameState are imported or global
import * as Constants from './constants.js';
import * as Utils from './utils.js';
import { globals } from './globals.js';
import { gameState } from './gameState.js';


export class BaseScene extends PIXI.Container {
constructor(id) {
super();
this.id = id;
// Use shared ticker in v4
this.ticker = PIXI.ticker.shared;
this._loop = this.loop.bind(this); // Bind loop context once
this._isLooping = false; // Track if the loop is currently added to the ticker

// Use arrow functions for listeners
    this._onSceneAdded = (parent) => {
        Utils.dlog(`${this.constructor.name} (${this.id}) sceneAdded() Start.`);
        try {
            this.run(); // Setup scene specifics
            Utils.dlog(`${this.constructor.name} (${this.id}) run() completed.`); // Log after run
        } catch (error) {
             console.error(`Error during ${this.constructor.name}.run():`, error);
             // Optionally handle the error further, e.g., switch to an error scene
             return; // Prevent adding ticker if run fails
        }
        Utils.dlog(`${this.constructor.name} (${this.id}) - Adding loop to ticker.`); // Log before add
        this.ticker.add(this._loop); // Add the loop function
        this._isLooping = true;
        Utils.dlog(`${this.constructor.name} (${this.id}) - Loop added to ticker. isLooping: ${this._isLooping}`); // Log after add
        Utils.dlog(`${this.constructor.name} (${this.id}) sceneAdded() End.`);
    };

    this._onSceneRemoved = (parent) => {
        Utils.dlog(`${this.constructor.name} (${this.id}) sceneRemoved() Start.`);
        if (this._isLooping) {
            Utils.dlog(`${this.constructor.name} (${this.id}) - Removing loop from ticker (in sceneRemoved).`); // Log before remove
            this.ticker.remove(this._loop); // Remove from ticker
            this._isLooping = false;
            Utils.dlog(`${this.constructor.name} (${this.id}) - Loop removed from ticker (in sceneRemoved). isLooping: ${this._isLooping}`); // Log after remove
        } else {
             Utils.dlog(`${this.constructor.name} (${this.id}) - Loop already removed or never added (in sceneRemoved).`);
        }

        // Clean up children recursively - PIXI v4 destroy might need explicit children=true
        // Note: Calling destroy here might interfere if PIXI's removeChild also calls it.
        // It might be safer to let PIXI handle destroy on removeChild.
        // However, explicitly calling it ensures cleanup if removed differently.
        // Test carefully. Let's remove the explicit destroy here for now.
        // this.destroy({ children: true, texture: false, baseTexture: false });
        Utils.dlog(`${this.constructor.name} (${this.id}) sceneRemoved() End.`);
    };


    this.on('added', this._onSceneAdded);
    this.on('removed', this._onSceneRemoved);
}

// To be overridden by subclasses for setup logic
run() {}

// To be overridden by subclasses for update logic
loop(delta) { // delta is provided by PIXI.Ticker
    // *** Add console log here to check if it's being called ***
    // Utils.dlog(`${this.constructor.name} (${this.id}) loop called, delta: ${delta.toFixed(4)}`); // Log entry

    if (typeof gameState !== 'undefined') {
         gameState.frame = (gameState.frame + 1) % Constants.FPS; // Simple frame counter
    }

    // --- Improved Child Loop Iteration ---
    // Function to recursively call loop on children
    const updateChildLoop = (child, currentDelta) => {
        if (!child) return;

        // Call the child's loop method directly if it exists
        if (typeof child.loop === 'function') {
            try {
                // Utils.dlog(`Calling loop on child: ${child.name || child.constructor.name}`); // Noisy
                child.loop(currentDelta);
            } catch (error) {
                console.error(`Error in loop of child ${child.name || child.constructor.name}:`, error);
            }
        }
        // If the child is a container AND doesn't have its own loop method,
        // iterate through its children recursively.
        // This handles cases like GameScene's unitContainer, bulletContainer etc.
        // which don't have their own loop but contain children that might.
        else if (child instanceof PIXI.Container && child.children.length > 0) {
             // Utils.dlog(`Iterating children of container: ${child.name || child.constructor.name}`); // Noisy
             for (let i = 0; i < child.children.length; i++) {
                 updateChildLoop(child.children[i], currentDelta);
             }
        }
    };

    // Iterate through the direct children of the scene
    for (let i = 0; i < this.children.length; i++) {
        updateChildLoop(this.children[i], delta);
    }
    // --- End Improved Child Loop Iteration ---
}

// Utility to switch scene via the GameManager
switchScene(sceneId, SceneClass) {
    // Access manager via globals
    if (globals.gameManager) {
        globals.gameManager.switchToScene(SceneClass, sceneId);
    } else {
         console.error("GameManager not available to switch scene.");
    }
}

 // Override destroy for complete cleanup
 destroy(options) {
     Utils.dlog(`${this.constructor.name} (${this.id}) destroy() Start.`);
     // Ensure listeners are removed
     this.off('added', this._onSceneAdded);
     this.off('removed', this._onSceneRemoved);
     // Ensure ticker function is removed if the scene is destroyed unexpectedly
      if (this._isLooping) {
          Utils.dlog(`${this.constructor.name} (${this.id}) - Removing loop from ticker (in destroy).`); // Log before remove
          this.ticker.remove(this._loop);
          this._isLooping = false;
          Utils.dlog(`${this.constructor.name} (${this.id}) - Loop removed from ticker (in destroy). isLooping: ${this._isLooping}`); // Log after remove
      } else {
          Utils.dlog(`${this.constructor.name} (${this.id}) - Loop already removed or never added (in destroy).`);
      }
     // Let PIXI handle destroying children if options.children is true
     super.destroy(options);
     Utils.dlog(`${this.constructor.name} (${this.id}) destroyed.`);
 }

}