// Manager.js (Original 'jn')
import { LoadScene } from './LoadScene.js';
import { globals } from './globals.js';
import { HitTester } from './HitTester.js';

export class Manager {
    constructor(pixiApp) {
        globals.pixiApp = pixiApp;
        globals.gameManager = this;

        // Interaction Manager in v4 is often directly on the renderer
        globals.interactionManager = pixiApp.renderer.plugins.interaction;

        // Overriding hitTest in v4's interaction manager might be complex
        // or unnecessary if default hit testing works. Test carefully.
        // The default might use getBounds().contains().
        // If custom logic IS needed, research PIXI v4 interaction plugin details.
        // For now, let's comment out the override.
        /*
        if (globals.interactionManager.hitTestRectangle) { // Check if property exists
             globals.interactionManager.hitTestRectangle = HitTester.hitTestFunc; // Use original function name?
             console.log("Attempted to apply custom hitTest function (PIXI v4).");
        } else {
             console.warn("Could not override interaction manager hitTestRectangle method (PIXI v4).");
        }
        */

        this.currentScene = null;
    }

    begin() {
        // Start by loading assets
        this.switchToScene(LoadScene, 'Load');
    }

    switchToScene(SceneClass, sceneId) {
        if (this.currentScene) {
            // Remove the old scene cleanly
            globals.pixiApp.stage.removeChild(this.currentScene);
            if (typeof this.currentScene.destroy === 'function') {
                this.currentScene.destroy({ children: true });
            }
            this.currentScene = null;
        }

         // Create and add the new scene
         this.currentScene = new SceneClass(sceneId); // Pass ID if needed
         globals.pixiApp.stage.addChild(this.currentScene);
         console.log(`Switched to scene: ${SceneClass.name} (ID: ${sceneId})`);
    }

    // The old addScene logic seemed more like scene definition registration,
    // which isn't needed with ES6 modules. switchToScene handles transitions.
}