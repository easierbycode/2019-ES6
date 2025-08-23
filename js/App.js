// App.js
import * as Constants from './constants.js';
import { gameState, loadHighScore } from './gameState.js';
import { globals } from './globals.js';
import * as Utils from './utils.js';
import { Manager } from './Manager.js';

export class App {
    constructor() {
        Utils.dlog("App constructor start.");
        this.init();
    }

    init() {
        Utils.dlog("App init.");
        // Optionally set base URL if needed elsewhere, though constants.js handles it now
        gameState.baseUrl = Constants.BASE_PATH;

        // Create PIXI Application
        const app = new PIXI.Application({
            width: Constants.GAME_DIMENSIONS.WIDTH,
            height: Constants.GAME_DIMENSIONS.HEIGHT,
            antialias: false, // Pixelated style
            transparent: false,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            backgroundColor: 0x000000, // Black background
        });
        globals.pixiApp = app; // Store globally

        // Add the canvas to the DOM
        const canvasContainer = document.getElementById("canvas"); // Ensure this div exists in your HTML
        if (canvasContainer) {
            canvasContainer.appendChild(app.view);
        } else {
            console.error("Canvas container div not found!");
            document.body.appendChild(app.view); // Fallback: append to body
        }

        // Initialize the Game Manager
        const manager = new Manager(app);
        globals.gameManager = manager; // Store globally

        // Start the game loading process
        manager.begin();

        Utils.dlog("App init complete.");
    }
}