Okay, refactoring this large, bundled JavaScript file into exportable ES6 classes is a significant task. The original code uses a webpack-like IIFE structure with a custom module loader.

Here's a refactored version broken down into logical modules (files). This structure makes the code much more maintainable, readable, and testable.

**Assumptions:**

1.  **PIXI.js:** `PIXI` is assumed to be available globally or imported correctly in your project setup (e.g., `import * as PIXI from 'pixi.js';`).
2.  **TweenMax:** `TweenMax`, `TimelineMax`, `Quint`, `Elastic`, `Back`, `Expo`, `Linear` are assumed to be available globally (from GSAP library).
3.  **jQuery ($):** The `tweet` function uses jQuery (`$`). It's assumed to be available globally.
4.  **DOM Access:** The code accesses `document` and `window`.
5.  **File Structure:** You would save each block below into its corresponding `.js` file (e.g., `constants.js`, `gameState.js`, `Player.js`, etc.).
6.  **Entry Point:** You'll need an entry point file (e.g., `main.js` or `index.js`) to import `App.js` and instantiate it.

---

**1. `constants.js`**

```javascript
// constants.js
export const LANG = (() => {
    if (typeof document !== 'undefined') {
        switch (document.documentElement.lang) {
            case "ja": return "ja";
            default: return "en";
        }
    }
    return "en"; // Default if document is not available
})();

export const BASE_PATH = (() => {
    let base = "http://localhost/";
    if (typeof window !== 'undefined' && "baseUrl" in window) {
        base = window.baseUrl;
    }
    return base.replace(/^https?\:\/\/[^\/]+/, "").replace(/\/api\/$/, "");
})();

export const BGM_INFO = {
    boss_bison_bgm: { name: "boss_bison_bgm", start: 914888, end: 6111881 },
    boss_barlog_bgm: { name: "boss_barlog_bgm", start: 782400, end: 4315201 },
    boss_sagat_bgm: { name: "boss_sagat_bgm", start: 1635142, end: 6883739 },
    boss_vega_bgm: { name: "boss_vega_bgm", start: 513529, end: 4325295 },
    boss_goki_bgm: { name: "boss_goki_bgm", start: 864e3, end: 6130287 },
    boss_fang_bgm: { name: "boss_fang_bgm", start: 888672, end: 5802799 },
};

export const RESOURCE_PATHS = {
    recipe: "assets/game.json",
    game_ui: "assets/game_ui.json",
    game_asset: "assets/game_asset.json",
    voice_titlecall: "assets/sounds/scene_title/voice_titlecall.mp3",
    se_decision: "assets/sounds/ui/se_decision.mp3",
    // ... (add ALL other resource paths from the original 'i.RESOURCE')
    stage_end4: "assets/img/stage/stage_end4.png"
};

export const SCENE_NAMES = {
    LOAD: "LoadScene",
    TITLE: "TitleScene",
    HOWTOPLAY: "HowToPlayScene",
    DEMO: "DemoScene",
    ADV: "AdvScene",
    GAME: "GameScene",
    ENDING: "EndingScene",
    RESULT: "ResultScene",
};

export const STAGE_IDS = {
    PROLOGUE: 0,
    ENDING: 4,
    SPENDING: 5, // Special Ending?
};

export const GAME_DIMENSIONS = {
    WIDTH: 256,
    HEIGHT: 480,
    CENTER_X: 128,
    CENTER_Y: 240,
};

export const STAGE_DIMENSIONS = {
    WIDTH: typeof window !== 'undefined' ? window.innerWidth : GAME_DIMENSIONS.WIDTH,
    HEIGHT: typeof window !== 'undefined' ? window.innerHeight : GAME_DIMENSIONS.HEIGHT,
    CENTER_X: typeof window !== 'undefined' ? window.innerWidth / 2 : GAME_DIMENSIONS.CENTER_X,
    CENTER_Y: typeof window !== 'undefined' ? window.innerHeight / 2 : GAME_DIMENSIONS.CENTER_Y,
};

export const ANIMATION = {
    BASE_SPEED: 0.33,
};

export const FPS = 30;
```

**2. `gameState.js`**

```javascript
// gameState.js
import { SHOOT_MODES } from './Player.js'; // Assuming Player.js exports SHOOT_MODES

// Global Game State (Use with caution - consider state management libraries for larger apps)
export const gameState = {
    baseUrl: "",
    lowModeFlg: false,
    hitAreaFlg: false, // Renamed from hitarea for consistency
    debugFlg: typeof location !== 'undefined' ? "game.capcom.com" !== location.hostname : true,
    playerRef: null, // Renamed from player
    playerHp: 0,
    playerMaxHp: 0,
    caDamage: 0,
    combo: 0,
    maxCombo: 0,
    stageId: 0,
    akebonoCnt: 0,
    cagage: 0,
    score: 0,
    continueCnt: 0,
    highScore: 0,
    frame: 0,
    beforeHighScore: 0,
    shootMode: SHOOT_MODES.NORMAL, // Default value
    enemyBulletList: [],
    shortFlg: false, // Added based on usage in GameScene
};

// Function to load high score from cookie
export function loadHighScore() {
    if (typeof document !== 'undefined' && document.cookie) {
        document.cookie.split(";").forEach(function(cookiePart) {
            const [key, value] = cookiePart.trim().split("=");
            if (key === "afc2019_highScore" && value) {
                gameState.highScore = parseInt(value, 10) || 0;
                gameState.beforeHighScore = gameState.highScore; // Store initial high score
            }
        });
    }
}

// Function to save high score to cookie
export function saveHighScore() {
     if (typeof document !== 'undefined') {
        if (gameState.score > gameState.highScore) {
             gameState.highScore = gameState.score;
             // Set expiry carefully, this is just an example matching the original
             const expiryDate = new Date("Tue, 02 Apr 2019 07:00:00 UTC").toUTCString();
             document.cookie = `afc2019_highScore=${gameState.highScore}; expires=${expiryDate}; path=/; secure`;
         }
     }
}
```

**3. `globals.js`**

```javascript
// globals.js

// References to globally needed instances or data
export const globals = {
    resources: null, // Will be populated by loader
    gameManager: null, // Will be populated by App
    pixiApp: null, // Will be populated by App
    interactionManager: null // Will be populated by App
};
```

**4. `utils.js`**

```javascript
// utils.js
import * as Constants from './constants.js';
import { gameState, saveHighScore } from './gameState.js';

export function dlog(...args) {
    if (gameState.debugFlg) {
        console.log(...args);
    }
}

export function nowSec() {
    return Date.now();
}

export function tweet(scoreType = 0) { // 0 for high score, 1 for current score
    let shareUrl = "";
    let hashtags = "";
    let text = "";
    const currentScore = gameState.score;
    const bestScore = gameState.highScore;

    if (Constants.LANG === "ja") {
        shareUrl = encodeURIComponent("https://game.capcom.com/cfn/sfv/aprilfool/2019/?lang=ja");
        hashtags = encodeURIComponent("シャド研,SFVAE,aprilfool,エイプリルフール");
        text = scoreType === 1
            ? encodeURIComponent(`エイプリルフール 2019 世界大統領がSTGやってみた\n今回のSCORE:${currentScore}\nHISCORE:${bestScore}\n`)
            : encodeURIComponent(`エイプリルフール 2019 世界大統領がSTGやってみた\nHISCORE:${bestScore}\n`);
    } else {
        shareUrl = encodeURIComponent("https://game.capcom.com/cfn/sfv/aprilfool/2019/?lang=en");
        hashtags = encodeURIComponent("ShadalooCRI,SFVAE,aprilfool");
        text = scoreType === 1
            ? encodeURIComponent(`APRIL FOOL 2019 WORLD PRESIDENT CHALLENGES A STG\nSCORE:${currentScore}\nBEST:${bestScore}\n`)
            : encodeURIComponent(`APRIL FOOL 2019 WORLD PRESIDENT CHALLENGES A STG\nBEST:${bestScore}\n`);
    }

    const twitterUrl = `https://twitter.com/intent/tweet?url=${shareUrl}&hashtags=${hashtags}&text=${text}`;

    if (typeof window !== 'undefined') {
        const tweetWindow = window.open(twitterUrl, "tweetwindow", "width=650, height=470, personalbar=0, toolbar=0, scrollbars=1, sizable=1");
        if (!tweetWindow && typeof $ !== 'undefined') {
            // Fallback using jQuery if window.open failed (might be blocked)
            const formHtml = `<form id="tmpTweetForm" target="_blank" method="GET" action="https://twitter.com/intent/tweet">
                                <input type="hidden" name="url" value="${decodeURIComponent(shareUrl)}" />
                                <input type="hidden" name="hashtags" value="${decodeURIComponent(hashtags)}" />
                                <input type="hidden" name="text" value="${decodeURIComponent(text)}" />
                              </form>`;
             $(formHtml).appendTo($("body")).submit();
             $("#tmpTweetForm").remove();
        }
    } else {
        console.warn("Cannot open tweet window - window or $ not available.");
    }
}
```

**5. `soundManager.js`**

```javascript
// soundManager.js
import { gameState } from './gameState.js';
import { globals } from './globals.js';

const soundInstances = {}; // Store BGM instances if needed for stopping specific loops

export function play(soundName) {
    if (gameState.lowModeFlg || !globals.resources || !globals.resources[soundName]?.sound) return;
    try {
        // Stop previous instance if it exists and is playing (optional, depends on desired behavior)
        // if (soundInstances[soundName] && soundInstances[soundName].isPlaying) {
        //     soundInstances[soundName].stop();
        // }
        soundInstances[soundName] = globals.resources[soundName].sound.play();
    } catch (error) {
        console.error(`Error playing sound ${soundName}:`, error);
    }
}

export function bgmPlay(soundName, startMs, endMs) {
    if (gameState.lowModeFlg || !globals.resources || !globals.resources[soundName]?.sound) return;

    const sound = globals.resources[soundName].sound;
    const startSec = startMs / 1000; // PIXI Sound uses seconds
    const endSec = endMs / 1000;
    let firstPlay = true;

    function loop() {
        if (soundInstances[soundName] && soundInstances[soundName].isPlaying) {
             soundInstances[soundName].stop(); // Stop previous loop instance
        }

        const options = {
            start: firstPlay ? 0 : startSec, // Start from beginning only once
            end: endSec,
            loop: false // Manually loop using 'end' event
        };

        try {
            const instance = sound.play(options);
            instance.on('end', loop); // Re-trigger loop when segment ends
            // instance.on('progress', (progress, duration) => { /* Optional progress handling */ });
            soundInstances[soundName] = instance;
            firstPlay = false;
        } catch (error) {
             console.error(`Error playing BGM ${soundName}:`, error);
        }
    }

    loop(); // Start the first loop
}

export function stop(soundName) {
    if (gameState.lowModeFlg || !globals.resources || !globals.resources[soundName]?.sound) return;
    if (soundInstances[soundName] && soundInstances[soundName].isPlaying) {
        try {
            soundInstances[soundName].stop();
        } catch (error) {
             console.error(`Error stopping sound ${soundName}:`, error);
        }
    }
     // Also stop the source sound if needed, though stopping the instance is usually sufficient
    // globals.resources[soundName].sound.stop();
}

export function stopAll() {
     if (gameState.lowModeFlg) return;
     PIXI.sound.stopAll();
     for (const key in soundInstances) {
         delete soundInstances[key];
     }
}

export function pauseAll() {
    if (gameState.lowModeFlg) return;
    PIXI.sound.pauseAll();
}

export function resumeAll() {
     if (gameState.lowModeFlg) return;
     PIXI.sound.resumeAll();
}

// Example volume setting - apply during loading/initialization
export function setInitialVolumes() {
    if (gameState.lowModeFlg || !globals.resources) return;
    const volumes = {
        voice_titlecall: 0.7, se_decision: 0.75, se_correct: 0.9,
        se_cursor_sub: 0.9, se_cursor: 0.9, se_over: 0.9,
        adventure_bgm: 0.2, g_adbenture_voice0: 0.5, voice_thankyou: 0.7,
        se_explosion: 0.35, se_shoot: 0.3, se_shoot_b: 0.3, se_ca: 0.8,
        se_ca_explosion: 0.9, se_damage: 0.15, se_guard: 0.2,
        se_finish_akebono: 0.9, se_barrier_start: 0.9, se_barrier_end: 0.9,
        voice_round0: 0.7, voice_round1: 0.7, voice_round2: 0.7, voice_round3: 0.7,
        voice_fight: 0.7, voice_ko: 0.7, voice_another_fighter: 0.7,
        g_stage_voice_0: 0.55, g_stage_voice_1: 0.7, g_stage_voice_2: 0.45,
        g_stage_voice_3: 0.45, g_stage_voice_4: 0.55, g_damage_voice: 0.7,
        g_powerup_voice: 0.55, g_ca_voice: 0.7, boss_bison_bgm: 0.4,
        boss_bison_voice_add: 0.65, boss_bison_voice_ko: 0.9, boss_bison_voice_faint: 0.55,
        boss_bison_voice_faint_punch: 0.65, boss_bison_voice_punch: 0.65,
        boss_barlog_bgm: 0.4, boss_barlog_voice_add: 0.7, boss_barlog_voice_ko: 0.9,
        boss_barlog_voice_tama: 0.6, boss_barlog_voice_barcelona: 0.7,
        boss_sagat_bgm: 0.4, boss_sagat_voice_add: 0.9, boss_sagat_voice_ko: 0.9,
        boss_sagat_voice_tama0: 0.45, boss_sagat_voice_tama1: 0.65, boss_sagat_voice_kick: 0.65,
        boss_vega_bgm: 0.3, boss_vega_voice_add: 0.7, boss_vega_voice_ko: 0.9,
        boss_vega_voice_crusher: 0.7, boss_vega_voice_warp: 0.7, boss_vega_voice_tama: 0.7,
        boss_vega_voice_shoot: 0.7, boss_goki_bgm: 0.4, boss_goki_voice_add: 0.7,
        boss_goki_voice_ko: 0.9, boss_goki_voice_tama0: 0.7, boss_goki_voice_tama1: 0.7,
        boss_goki_voice_ashura: 0.7, boss_goki_voice_syungokusatu0: 0.7,
        boss_goki_voice_syungokusatu1: 0.7, boss_fang_bgm: 0.4, boss_fang_voice_add: 0.6,
        boss_fang_voice_ko: 0.9, boss_fang_voice_beam0: 0.6, boss_fang_voice_beam1: 0.6,
        boss_fang_voice_tama: 0.6, bgm_continue: 0.25, bgm_gameover: 0.3,
        voice_countdown0: 0.7, voice_countdown1: 0.7, voice_countdown2: 0.7,
        voice_countdown3: 0.7, voice_countdown4: 0.7, voice_countdown5: 0.7,
        voice_countdown6: 0.7, voice_countdown7: 0.7, voice_countdown8: 0.7,
        voice_countdown9: 0.7, voice_gameover: 0.7, g_continue_yes_voice0: 0.7,
        g_continue_yes_voice1: 0.7, g_continue_yes_voice2: 0.7,
        g_continue_no_voice0: 0.7, g_continue_no_voice1: 0.7, voice_congra: 0.7,
    };

    for (const soundName in volumes) {
        if (globals.resources[soundName]?.sound) {
            try {
                globals.resources[soundName].sound.volume = volumes[soundName];
            } catch (error) {
                 console.warn(`Could not set volume for ${soundName}:`, error);
            }
        }
    }
}
```

**6. `HitTester.js`**

```javascript
// HitTester.js
export class HitTester {
    static hitTestFunc(obj1, obj2) {
        if (!obj1 || !obj2 || !obj1.hitArea || !obj2.hitArea) {
            return false; // Cannot test without objects or hitAreas
        }

        // Get global positions and dimensions
        const bounds1 = obj1.getBounds();
        const bounds2 = obj2.getBounds();

        // Calculate global hitArea rectangles
        const hitArea1 = new PIXI.Rectangle(
            bounds1.x + obj1.hitArea.x,
            bounds1.y + obj1.hitArea.y,
            obj1.hitArea.width,
            obj1.hitArea.height
        );
        const hitArea2 = new PIXI.Rectangle(
            bounds2.x + obj2.hitArea.x,
            bounds2.y + obj2.hitArea.y,
            obj2.hitArea.width,
            obj2.hitArea.height
        );

        // Simple AABB (Axis-Aligned Bounding Box) collision check
        return hitArea1.x < hitArea2.x + hitArea2.width &&
               hitArea1.x + hitArea1.width > hitArea2.x &&
               hitArea1.y < hitArea2.y + hitArea2.height &&
               hitArea1.y + hitArea1.height > hitArea2.y;
    }

     // Original Center-based method (less accurate with PIXI transforms)
     /*
    static hitTestFuncCenterBased(obj1, obj2) {
        if (!obj1 || !obj2 || !obj1.hitArea || !obj2.hitArea) return false;

        const centerX1 = obj1.x + obj1.hitArea.x + obj1.hitArea.width / 2;
        const centerY1 = obj1.y + obj1.hitArea.y + obj1.hitArea.height / 2;
        const centerX2 = obj2.x + obj2.hitArea.x + obj2.hitArea.width / 2;
        const centerY2 = obj2.y + obj2.hitArea.y + obj2.hitArea.height / 2;

        const halfWidth1 = obj1.hitArea.width / 2;
        const halfHeight1 = obj1.hitArea.height / 2;
        const halfWidth2 = obj2.hitArea.width / 2;
        const halfHeight2 = obj2.hitArea.height / 2;

        const dx = centerX1 - centerX2;
        const dy = centerY1 - centerY2;

        const combinedHalfWidths = halfWidth1 + halfWidth2;
        const combinedHalfHeights = halfHeight1 + halfHeight2;

        return Math.abs(dx) < combinedHalfWidths && Math.abs(dy) < combinedHalfHeights;
    }
    */
}
```

**7. Base Classes (`BaseCast.js`, `BaseSprite.js`, `BaseUnit.js`, `BaseScene.js`)**

```javascript
// BaseCast.js (Original 'l')
export class BaseCast extends PIXI.Container {
    constructor(id) {
        super();
        this.id = id;
        this.on('added', this._onCastAdded);
        this.on('removed', this._onCastRemoved);
    }

    _onCastAdded(parent) {
        this.parentNode = parent; // Keep track if needed
        this.castAdded();
    }

    _onCastRemoved(parent) {
        this.parentNode = null; // Clear reference
        this.castRemoved();
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

// BaseSprite.js (Original 'K')
export class BaseSprite extends PIXI.Sprite {
     constructor(texture) {
        super(texture);
        this.on('added', this._onCastAdded);
        this.on('removed', this._onCastRemoved);
    }

     _onCastAdded(parent) {
        this.castAdded();
    }

     _onCastRemoved(parent) {
        this.castRemoved();
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

// BaseUnit.js (Original 'y')
import { BaseCast } from './BaseCast.js';
import { gameState } from './gameState.js';

export class BaseUnit extends BaseCast {
    static CUSTOM_EVENT_DEAD = "customEventdead";
    static CUSTOM_EVENT_DEAD_COMPLETE = "customEventdeadComplete";
    static CUSTOM_EVENT_TAMA_ADD = "customEventtamaadd"; // Tama = Bullet?

    constructor(animationFrames, explosionFrames = null) {
        super(); // id is not passed here, maybe add if needed

        this.shadowReverse = true;
        this.speed = 0;
        this.hp = 1;
        this.deadFlg = false;
        this.shadowOffsetY = 0;

        this.character = new PIXI.AnimatedSprite(animationFrames);
        this.character.animationSpeed = 0.1;
        this.character.anchor.set(0.5); // Center anchor often helps

        this.shadow = new PIXI.AnimatedSprite(animationFrames);
        this.shadow.animationSpeed = 0.1;
        this.shadow.tint = 0x000000;
        this.shadow.alpha = 0.5;
        this.shadow.anchor.set(0.5);

        this.unit = new PIXI.Container();
        this.unit.interactive = true; // Make unit interactive, not the base container
        this.unit.name = "unit";
        // Initial hitArea - subclasses should refine this
        this.unit.hitArea = new PIXI.Rectangle(
            -this.character.width / 2, -this.character.height / 2,
            this.character.width, this.character.height
        );


        if (explosionFrames) {
            this.explosion = new PIXI.AnimatedSprite(explosionFrames);
            this.explosion.anchor.set(0.5);
            const scaleFactor = Math.min(1, (this.character.height + 50) / this.explosion.height) + 0.2;
            this.explosion.scale.set(scaleFactor);
            this.explosion.animationSpeed = 0.4;
            this.explosion.loop = false;
            this.explosion.visible = false; // Hide initially
        } else {
            this.explosion = null;
        }

        this.addChild(this.unit);
        this.unit.addChild(this.shadow);
        this.unit.addChild(this.character);
        if(this.explosion) this.addChild(this.explosion); // Add explosion to main container
    }

    castAdded() {
        this.character.play();
        this.shadow.play();
        this.updateShadowPosition();

        if (gameState.hitAreaFlg) {
             this.drawHitbox();
        }
    }

    castRemoved() {
         // Ensure cleanup happens
         this.destroy();
    }

    updateShadowPosition() {
         if (this.shadowReverse) {
             this.shadow.scale.y = -1;
             this.shadow.y = this.character.y + this.character.height / 2 + this.shadow.height / 2 - this.shadowOffsetY; // Adjust based on anchor
         } else {
             this.shadow.scale.y = 1;
             this.shadow.y = this.character.y + this.character.height / 2 + this.shadow.height / 2 - this.shadowOffsetY; // Adjust based on anchor
         }
         this.shadow.x = this.character.x; // Keep X aligned
    }


    drawHitbox() {
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


// BaseScene.js (Original 'N')
import * as Utils from './utils.js';
import { globals } from './globals.js';
import { gameState } from './gameState.js';

export class BaseScene extends PIXI.Container {
    constructor(id) {
        super();
        this.id = id;
        this.ticker = globals.pixiApp.ticker; // Use the shared PIXI ticker
        this._loop = this.loop.bind(this); // Bind loop context once

        this.on('added', this._onSceneAdded);
        this.on('removed', this._onSceneRemoved);
    }

    _onSceneAdded(parent) {
        Utils.dlog(`${this.constructor.name}.sceneAdded() Start.`);
        this.run(); // Setup scene specifics
        this.ticker.add(this._loop);
        // Ticker might already be started globally
        // this.ticker.start();
        Utils.dlog(`${this.constructor.name}.sceneAdded() End.`);
    }

    _onSceneRemoved(parent) {
        Utils.dlog(`${this.constructor.name}.sceneRemoved() Start.`);
        this.ticker.remove(this._loop);
        // Don't stop the global ticker here
        // this.ticker.stop();

         // Clean up children recursively
         this.destroy({ children: true, texture: false, baseTexture: false });
         Utils.dlog(`${this.constructor.name}.sceneRemoved() End.`);
    }

    // To be overridden by subclasses for setup logic
    run() {}

    // To be overridden by subclasses for update logic
    loop(delta) { // delta is provided by PIXI.Ticker
        gameState.frame = (gameState.frame + 1) % 60; // Simple frame counter
        // Update children loops if they have one
        this.children.forEach(child => {
            if (typeof child.loop === 'function') {
                child.loop(delta);
            }
        });
    }

    // Utility to switch scene via the GameManager
    switchScene(sceneId, sceneClass) {
        if (globals.gameManager) {
            globals.gameManager.switchToScene(sceneClass, sceneId);
        } else {
             console.error("GameManager not available to switch scene.");
        }
    }

     // Override destroy for complete cleanup
     destroy(options) {
         this.off('added', this._onSceneAdded);
         this.off('removed', this._onSceneRemoved);
         // Ensure ticker function is removed if the scene is destroyed unexpectedly
         this.ticker.remove(this._loop);
         super.destroy(options);
     }
}
```

**8. Game Logic Classes (Example: `Player.js`, `Enemy.js`, `Bullet.js`)**

```javascript
// Bullet.js (Original 'S')
import { BaseUnit } from './BaseUnit.js';
import * as Sound from './soundManager.js';
import { gameState } from './gameState.js';
import { globals } from './globals.js';
import { SHOOT_MODES } from './Player.js'; // Assuming Player.js exports SHOOT_MODES

export class Bullet extends BaseUnit {
    constructor(data) {
        // Ensure textures are actual PIXI.Texture objects
        const textures = data.texture.map(frame => PIXI.Texture.from(frame));
        const explosionTextures = data.explosion ? data.explosion.map(frame => PIXI.Texture.from(frame)) : null;
        const guardTextures = data.guard ? data.guard.map(frame => PIXI.Texture.from(frame)) : null;

        super(textures, explosionTextures);

        this.name = data.name;
        this.unit.name = data.name; // Name the interactive part
        this.damage = data.damage;
        this.speed = data.speed;
        this.hp = data.hp;
        this.score = data.score;
        this.cagage = data.cagage; // CA Gauge fill amount
        this.guardTexture = guardTextures; // Textures for when hitting guard/barrier
        this.deadFlg = false;
        this.shadow.visible = false; // Bullets usually don't have shadows in this style

        // Adjust hitArea if needed (example)
        this.unit.hitArea = new PIXI.Rectangle(
            -this.character.width / 2, -this.character.height / 2,
            this.character.width, this.character.height
        );

        this.rotation = 0; // Store rotation if needed for movement
        this.targetX = null; // For special movement like 'meka'
        this.cont = 0; // Counter for special movement
        this.start = data.start || 0; // Start time/frame for special movement

        // Ensure anchor is centered for rotation
        this.unit.pivot.set(0, 0); // Reset pivot if needed
        this.character.anchor.set(0.5);
        if(this.explosion) this.explosion.anchor.set(0.5);

        // Bullets don't need reversed shadows
        this.shadowReverse = false;
        this.shadowOffsetY = 0;
    }

    loop(delta) {
        if (this.deadFlg) return;

        if (this.rotX !== undefined && this.rotY !== undefined) {
            // Movement based on fixed rotation (like FANG beam)
            this.x += this.rotX * this.speed * delta;
            this.y += this.rotY * this.speed * delta;
        } else if (this.name === 'meka') {
            // Special 'meka' movement
            this.cont++;
            if (this.cont >= this.start) {
                if (this.targetX === null && gameState.playerRef) {
                    this.targetX = gameState.playerRef.x;
                }
                 if (this.targetX !== null) {
                    this.x += 0.009 * (this.targetX - this.x) * delta * 60; // Adjust speed based on delta
                }
                 this.y += (Math.cos(this.cont / 5) + 2.5 * this.speed) * delta;
            }
        } else {
             // Standard bullet movement (e.g., upwards for player, downwards for enemy)
             // Assuming rotation is set correctly externally
             this.x += Math.cos(this.rotation) * this.speed * delta;
             this.y += Math.sin(this.rotation) * this.speed * delta;
        }

         // Off-screen check should be handled by the scene managing the bullets
    }

    onDamage(amount, hitType = 'normal') {
        if (this.deadFlg) return;

        this.hp -= amount;

        if (this.hp <= 0) {
            this.dead(hitType); // Pass hitType to dead method
            this.deadFlg = true;
        } else {
            // Hit flash effect
            this.character.tint = 0xFF0000;
            TweenMax.to(this.character, 0.1, {
                tint: 0xFFFFFF,
                delay: 0.1
            });
        }

        // Explosion/Guard effect
        if (this.explosion) {
            this.explosion.visible = true;
            this.explosion.onComplete = () => {
                 this.explosion.visible = false;
                 this.explosion.gotoAndStop(0);
                 // Don't remove child here, let the manager do it on deadComplete
            };

            this.explosion.x = this.character.x; // Position relative to character
            this.explosion.y = this.character.y - 10; // Offset slightly up

             if (hitType === 'infinity' && this.guardTexture) { // Check if guardTexture exists
                 this.explosion.textures = this.guardTexture;
                 Sound.stop('se_guard');
                 Sound.play('se_guard');
             } else {
                 this.explosion.textures = this.explosion.originalTextures; // Restore original explosion
                 // Play appropriate damage sound based on bullet type
                 if (this.name === SHOOT_MODES.NORMAL || this.name === SHOOT_MODES.THREE_WAY) {
                     Sound.stop('se_damage');
                     Sound.play('se_damage');
                 } else if (this.name === SHOOT_MODES.BIG) {
                      Sound.stop('se_damage'); // Or a different sound?
                      Sound.play('se_damage');
                 }
             }
            this.explosion.gotoAndPlay(0);
        } else if (hitType === 'infinity') {
             Sound.stop('se_guard');
             Sound.play('se_guard'); // Play guard sound even without visual effect
        } else {
             Sound.stop('se_damage');
             Sound.play('se_damage');
        }
    }

    dead(hitType) {
        if (this.deadFlg) return; // Prevent multiple dead calls
        this.deadFlg = true;
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD); // Notify manager

        this.character.visible = false; // Hide character
        this.shadow.visible = false;    // Hide shadow

        if (this.explosion && hitType !== 'infinity') { // Don't show explosion on guard hit
            this.explosion.visible = true;
            this.explosion.onComplete = () => this.explosionComplete();
            this.explosion.x = this.character.x;
            this.explosion.y = this.character.y - 10;
            this.explosion.gotoAndPlay(0);
        } else {
            // If no explosion or guard hit, complete immediately
            this.explosionComplete();
        }
    }

    explosionComplete() {
        // Make sure everything is hidden/stopped
        if (this.explosion) this.explosion.visible = false;
        this.character.visible = false;
        this.shadow.visible = false;
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE); // Notify manager cleanup is done
        // The actual removal from the stage is handled by the scene/manager
    }

     // Override castAdded/Removed if specific bullet logic is needed on add/remove
    // castAdded() {
    //     super.castAdded(); // Call parent method
    //     // ... bullet specific add logic
    // }

    // castRemoved() {
    //     super.castRemoved(); // Call parent method
    //     // ... bullet specific remove logic
    // }
}


// Player.js (Original 'M')
import { BaseUnit } from './BaseUnit.js';
import { Bullet } from './Bullet.js';
import * as Constants from './constants.js';
import { gameState } from './gameState.js';
import { globals } from './globals.js';
import * as Sound from './soundManager.js';

// Export constants directly
export const SHOOT_MODES = {
    NORMAL: "normal",
    BIG: "big",
    THREE_WAY: "3way"
};
export const SHOOT_SPEEDS = {
    NORMAL: "speed_normal",
    HIGH: "speed_high"
};
export const ITEM_TYPES = {
     BARRIER: "barrier"
};


export class Player extends BaseUnit {
    constructor(data) {
        // --- Texture Pre-processing ---
        // This should ideally happen ONCE during loading, not in constructor
        const processTextures = (texturePaths) => {
            return texturePaths.map(path => {
                const texture = PIXI.Texture.from(path);
                texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                return texture;
            });
        };

        const playerFrames = processTextures(data.texture);
        const explosionFrames = data.explosion ? processTextures(data.explosion) : null;

        super(playerFrames, explosionFrames);

        // --- Player Specific Data ---
        this.unit.name = data.name;
        this.maxHp = data.maxHp;
        this.hp = data.hp; // Set initial HP
        this._percent = this.hp / this.maxHp; // Use internal var for getter/setter

        // --- Bullet Data ---
        const hitFrames = data.hit ? processTextures(data.hit) : null;
        const guardFrames = data.guard ? processTextures(data.guard) : null;

        this.shootNormalData = {
            ...data.shootNormal,
            texture: processTextures(data.shootNormal.texture),
            explosion: hitFrames,
            guard: guardFrames
        };
        this.shootBigData = {
            ...data.shootBig,
            texture: processTextures(data.shootBig.texture),
            explosion: hitFrames,
            guard: guardFrames
        };
        this.shoot3wayData = {
            ...data.shoot3way,
            texture: this.shootNormalData.texture, // Uses normal bullet texture
            explosion: hitFrames,
            guard: guardFrames
        };

        // --- Barrier ---
        this.barrierFrames = data.barrier ? processTextures(data.barrier.texture) : null;
        this.barrierEffectTexture = data.barrierEffectTexture ? PIXI.Texture.from(data.barrierEffectTexture) : null;

        if (this.barrierFrames) {
            this.barrier = new PIXI.AnimatedSprite(this.barrierFrames);
            this.barrier.animationSpeed = 0.15;
            this.barrier.anchor.set(0.5);
            this.barrier.hitArea = new PIXI.Rectangle(-this.barrier.width / 2 + 2, -this.barrier.height / 2 + 2, this.barrier.width - 4, this.barrier.height - 4); // Centered hit area
            this.barrier.interactive = false;
            this.barrier.visible = false;
            this.addChild(this.barrier); // Add barrier to player container
        }

        if (this.barrierEffectTexture) {
            this.barrierEffect = new PIXI.Sprite(this.barrierEffectTexture);
            this.barrierEffect.anchor.set(0.5);
            this.barrierEffect.visible = false;
            this.addChild(this.barrierEffect); // Add effect to player container
        }

        // --- State & Control ---
        this.shootOn = false; // Renamed from shootOn = 0/1
        this.bulletList = []; // Managed by the scene, player only creates them
        this.bulletFrameCnt = 0;
        this.bulletIdCnt = 0;
        this.shootSpeedBoost = 0; // Renamed from shootSpeed
        this.shootIntervalBase = 0; // Renamed from shootInterval
        this.shootData = {}; // Current bullet data
        this.shootMode = SHOOT_MODES.NORMAL;

        this.unitX = Constants.GAME_DIMENSIONS.CENTER_X; // Target X position
        this.unitY = Constants.GAME_DIMENSIONS.HEIGHT - (this.character?.height || 50) - 30; // Target Y

        this.character.animationSpeed = 0.35;
        this.shadow.animationSpeed = 0.35;
        this.shadowOffsetY = 5;

        this.damageAnimationFlg = false;
        this.barrierFlg = false;
        this.screenDragFlg = false;
        this.keyDownFlg = false;
        this.keyDownCode = "";

        // --- Input Area ---
        // Use the interactionManager from globals, apply to the stage or a dedicated input layer
        this.dragAreaRect = null; // Create this in the scene, not the player

        // --- Event Listeners ---
        this.keyDownListener = this.onKeyDown.bind(this);
        this.keyUpListener = this.onKeyUp.bind(this);

         // Adjust hitArea based on actual sprite size
         this.unit.hitArea = new PIXI.Rectangle(
            -this.character.width / 2 + 7, // Adjust x based on anchor
            -this.character.height / 2 + 20, // Adjust y based on anchor
            this.character.width - 14,
            this.character.height - 40
         );

         this.updateShootData(); // Initialize shoot data
    }

    // --- Getters/Setters ---
    get percent() {
        return this._percent;
    }
    // Setter not strictly needed if only updated internally via onDamage
    // set percent(value) { this._percent = value; }

    // --- Input Handling ---
    // These should be attached/detached by the scene managing the player
    attachInputListeners() {
        if (typeof document !== 'undefined') {
            document.addEventListener("keydown", this.keyDownListener);
            document.addEventListener("keyup", this.keyUpListener);
        }
    }

    detachInputListeners() {
        if (typeof document !== 'undefined') {
            document.removeEventListener("keydown", this.keyDownListener);
            document.removeEventListener("keyup", this.keyUpListener);
        }
    }

     // Pointer events should be handled by the scene's input layer
     onScreenDragStart(event) {
         this.screenDragFlg = true;
         this.updateTargetX(event.data.global.x);
     }

     onScreenDragMove(event) {
         if (this.screenDragFlg) {
             this.updateTargetX(event.data.global.x);
         }
     }

     onScreenDragEnd(event) {
         this.screenDragFlg = false;
     }

     onKeyDown(event) {
         this.keyDownFlg = true;
         this.keyDownCode = event.keyCode;
         event.preventDefault();
     }

     onKeyUp(event) {
         this.keyDownFlg = false;
         event.preventDefault();
     }

    updateTargetX(globalX) {
         const halfHitboxWidth = this.unit.hitArea.width / 2;
         // Adjust target based on the object's center, not the global X directly
         let target = globalX - this.parent.x; // Adjust for container position if player is nested

         target = Math.max(halfHitboxWidth, target);
         target = Math.min(Constants.GAME_DIMENSIONS.WIDTH - halfHitboxWidth, target);
         this.unitX = target;
    }

    // --- Game Loop ---
    loop(delta) {
         if (this.deadFlg) return;

        // --- Movement ---
        if (this.keyDownFlg) {
            const moveSpeed = 6 * delta; // Adjust speed based on delta
            switch (this.keyDownCode) {
                case 37: // Left Arrow
                    this.unitX -= moveSpeed;
                    break;
                case 39: // Right Arrow
                     this.unitX += moveSpeed;
                     break;
            }
             // Clamp position based on center and hitArea width
             const halfHitboxWidth = this.unit.hitArea.width / 2;
             this.unitX = Math.max(halfHitboxWidth, this.unitX);
             this.unitX = Math.min(Constants.GAME_DIMENSIONS.WIDTH - halfHitboxWidth, this.unitX);
        }

         // Smooth movement towards target using lerp (linear interpolation)
         const lerpFactor = 0.09 * delta * 60; // Adjust lerp factor based on delta
         this.x += lerpFactor * (this.unitX - this.x);
         // Player Y is usually fixed or handled differently, lerping might not be desired
         // this.y += lerpFactor * (this.unitY - this.y);

         // Update barrier position relative to the player's current position
         if (this.barrier) {
            this.barrier.x = 0; // Relative to player center because of anchor
            this.barrier.y = -this.character.height / 2 + this.barrier.height / 2 - 15; // Adjust based on anchors
        }

         this.updateShadowPosition(); // Update shadow position based on character

        // --- Shooting ---
        this.bulletFrameCnt += delta * 60; // Increment frame count based on delta
        const interval = (this.shootIntervalBase - this.shootSpeedBoost);
        if (this.shootOn && interval > 0 && this.bulletFrameCnt >= interval) {
             this.shoot();
             this.bulletFrameCnt = 0; // Reset counter
        }
    }

     // Override BaseUnit's updateShadowPosition if Player's shadow behaves differently
     updateShadowPosition() {
         this.shadow.x = 0; // Centered due to anchor
         if (this.shadowReverse) {
             this.shadow.scale.y = -1;
             this.shadow.y = this.character.height / 2 + this.shadow.height / 2 - this.shadowOffsetY;
         } else {
             this.shadow.scale.y = 1;
             this.shadow.y = this.character.height / 2 + this.shadow.height / 2 - this.shadowOffsetY;
         }
     }


    // --- Shooting Logic ---
    shoot() {
         let bulletsData = [];
         const rotationRad = -90 * Math.PI / 180; // -90 degrees for upwards

         switch (this.shootMode) {
             case SHOOT_MODES.NORMAL: {
                 const data = { ...this.shootNormalData }; // Clone data
                 data.id = this.bulletIdCnt++;
                 data.rotation = rotationRad;
                 // Position relative to player center, adjusted for bullet size
                 data.startX = 0 + Math.cos(rotationRad + Math.PI/2) * 5 + 14 - this.character.width / 2;
                 data.startY = 0 + Math.sin(rotationRad + Math.PI/2) * 5 + 11 - this.character.height / 2;
                 bulletsData.push(data);
                 Sound.stop('se_shoot');
                 Sound.play('se_shoot');
                 break;
             }
             case SHOOT_MODES.BIG: {
                 const data = { ...this.shootBigData };
                 data.id = this.bulletIdCnt++;
                 data.rotation = rotationRad;
                 data.startX = 0 + Math.cos(rotationRad + Math.PI/2) * 5 + 10 - this.character.width / 2;
                 data.startY = 0 + Math.sin(rotationRad + Math.PI/2) * 5 + 22 - this.character.height / 2;
                 bulletsData.push(data);
                 Sound.stop('se_shoot_b');
                 Sound.play('se_shoot_b');
                 break;
             }
             case SHOOT_MODES.THREE_WAY: {
                 const angles = [-100, -90, -80]; // Degrees relative to horizontal
                 const offsets = [
                     { x: 6, y: 11 },
                     { x: 10, y: 11 },
                     { x: 14, y: 11 }
                 ];
                 angles.forEach((angle, index) => {
                     const angleRad = angle * Math.PI / 180;
                     const data = { ...this.shoot3wayData };
                     data.id = this.bulletIdCnt++;
                     data.rotation = angleRad;
                     // Adjust start position based on angle and offset
                     data.startX = 0 + Math.cos(angleRad + Math.PI/2) * 5 + offsets[index].x - this.character.width / 2;
                     data.startY = 0 + Math.sin(angleRad + Math.PI/2) * 5 + offsets[index].y - this.character.height / 2;
                     bulletsData.push(data);
                 });
                 Sound.stop('se_shoot');
                 Sound.play('se_shoot');
                 break;
             }
         }

         // Emit event for the scene to create bullets
         this.emit(Player.CUSTOM_EVENT_BULLET_ADD, bulletsData);
    }
    static CUSTOM_EVENT_BULLET_ADD = "playerBulletAdd"; // Define the event


    updateShootData() {
         switch (this.shootMode) {
             case SHOOT_MODES.NORMAL:
                 this.shootData = this.shootNormalData;
                 break;
             case SHOOT_MODES.BIG:
                 this.shootData = this.shootBigData;
                 break;
             case SHOOT_MODES.THREE_WAY:
                 this.shootData = this.shoot3wayData;
                 break;
         }
         this.shootIntervalBase = this.shootData.interval || 20; // Default interval if missing
    }

    shootModeChange(newMode) {
        if (this.shootMode === newMode) return; // No change
        this.shootMode = newMode;
        this.updateShootData();
        Sound.play('g_powerup_voice');
    }

    shootSpeedChange(newSpeedMode) {
        let newBoost = 0;
        switch (newSpeedMode) {
            case SHOOT_SPEEDS.NORMAL:
                newBoost = 0;
                break;
            case SHOOT_SPEEDS.HIGH:
                newBoost = 15; // Value from original code
                break;
        }
        if (this.shootSpeedBoost === newBoost) return; // No change
        this.shootSpeedBoost = newBoost;
        Sound.play('g_powerup_voice');
    }

    // --- Setup & State Management ---
    setUp(hp, shootMode, shootSpeedMode) {
        this.maxHp = gameState.playerMaxHp; // Use gameState maxHp
        this.hp = hp;
        this._percent = this.hp / this.maxHp;
        this.shootMode = shootMode;
        this.shootModeChange(shootMode); // Apply mode change logic
        this.shootSpeedChange(shootSpeedMode); // Apply speed change logic
        this.deadFlg = false;
        this.damageAnimationFlg = false;
        this.character.tint = 0xFFFFFF; // Reset tint
        this.character.alpha = 1;
        this.unit.visible = true; // Ensure unit is visible
    }

    shootStop() {
        this.shootOn = false;
    }

    shootStart() {
        this.shootOn = true;
        this.bulletFrameCnt = 0; // Reset counter when starting
    }

    // --- Barrier Logic ---
    barrierStart() {
        if (!this.barrier || this.barrierFlg) return; // No barrier sprite or already active

        Sound.play('se_barrier_start');
        this.barrierFlg = true;
        this.barrier.alpha = 0;
        this.barrier.visible = true;

        if (this.barrierEffect) {
             this.barrierEffect.x = this.barrier.x; // Position relative to barrier
             this.barrierEffect.y = this.barrier.y;
             this.barrierEffect.alpha = 1;
             this.barrierEffect.visible = true;
             this.barrierEffect.scale.set(0.5);
             TweenMax.to(this.barrierEffect.scale, 0.4, { x: 1, y: 1, ease: Quint.easeOut });
             TweenMax.to(this.barrierEffect, 0.5, { alpha: 0 });
        }

        // Kill previous timeline if exists
        if (this.barrierTimeline) {
            this.barrierTimeline.kill();
        }

        this.barrierTimeline = new TimelineMax({
            onComplete: () => {
                if(this.barrier) this.barrier.visible = false;
                if(this.barrierEffect) this.barrierEffect.visible = false;
                this.barrierFlg = false;
                Sound.play('se_barrier_end');
                this.barrierTimeline = null; // Clear reference
            }
        });

        // Recreate the blinking effect (simplified version)
         this.barrierTimeline
             .to(this.barrier, 0.3, { alpha: 1 }) // Fade in
             .to(this.barrier, 0.1, { alpha: 0, delay: 4.0, repeat: 10, yoyo: true }) // Blink fast towards end
             .to(this.barrier, 0.5, { alpha: 1, delay: 1.0}) // Stay solid longer
             .to(this.barrier, 0.1, { alpha: 0, delay: 0.5, repeat: 6, yoyo: true }) // Blink faster
             .to(this.barrier, 0.1, { alpha: 1, delay: 0.1}) // Last flicker
             .to(this.barrier, 0.1, { alpha: 0 }); // Fade out
    }

    barrierHitEffect() {
        if (!this.barrier) return;
        this.barrier.tint = 0xFF0000;
        TweenMax.to(this.barrier, 0.2, { tint: 0xFFFFFF });
        Sound.play('se_guard');
    }

    // --- Damage & Death ---
    onDamage(amount) {
        if (this.barrierFlg || this.damageAnimationFlg || this.deadFlg) {
             if (this.barrierFlg) this.barrierHitEffect(); // Show barrier hit even if no damage taken
             return;
        }

        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
        }
        this._percent = this.hp / this.maxHp;

        this.damageAnimationFlg = true; // Prevent rapid damage calls

        if (this.hp <= 0) {
             this.dead();
        } else {
             // Damage flicker/knockback animation
             const initialY = this.y;
             const damageTimeline = new TimelineMax({
                 onComplete: () => { this.damageAnimationFlg = false; this.y = initialY; } // Reset flag and position
             });

             // Flicker effect
             damageTimeline
                 .to(this.unit, 0.1, { alpha: 0.2, tint: 0xFF0000 })
                 .to(this.unit, 0.1, { alpha: 1.0, tint: 0xFFFFFF })
                 .to(this.unit, 0.1, { alpha: 0.2, tint: 0xFF0000 })
                 .to(this.unit, 0.1, { alpha: 1.0, tint: 0xFFFFFF })
                 .to(this.unit, 0.1, { alpha: 0.2, tint: 0xFF0000 })
                 .to(this.unit, 0.1, { alpha: 1.0, tint: 0xFFFFFF });

             // Small shake (optional) - apply to the main player object (this)
             damageTimeline
                .to(this, 0.05, { y: initialY + 2 }, 0) // Start shake simultaneously
                .to(this, 0.05, { y: initialY - 2 }, 0.05)
                .to(this, 0.05, { y: initialY + 2 }, 0.10)
                .to(this, 0.05, { y: initialY - 2 }, 0.15)
                .to(this, 0.05, { y: initialY }, 0.20);


             Sound.play('g_damage_voice');
             Sound.play('se_damage');
        }
    }

    dead() {
        if (this.deadFlg) return;
        this.deadFlg = true;
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD);
        this.shootStop();
        this.detachInputListeners(); // Stop listening to input

        this.unit.visible = false; // Hide the unit container (character + shadow)

        if (this.explosion) {
            this.explosion.visible = true;
            this.explosion.x = 0; // Position relative to player center
            this.explosion.y = 0;
            this.explosion.onComplete = () => this.explosionComplete();
            this.explosion.gotoAndPlay(0);
        } else {
            this.explosionComplete(); // Complete immediately if no explosion
        }

         // Clear existing bullets visually (manager should handle removal from list)
         // this.bulletList.forEach(bullet => bullet.destroy());
         // this.bulletList = [];

        Sound.play('se_explosion');
        Sound.play('g_continue_no_voice0'); // Assuming this is the death voice
    }

    explosionComplete() {
        if (this.explosion) this.explosion.visible = false;
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE);
        // Player object might be removed by the scene later
    }

    castAdded() {
        super.castAdded(); // BaseUnit castAdded
        this.attachInputListeners();
        this.damageAnimationFlg = false;
         this.unit.visible = true; // Ensure visibility on add
         this.deadFlg = false; // Reset dead flag
         this.hp = this.maxHp; // Reset HP? Or use gameState.playerHp?
         this._percent = 1.0;
    }

    castRemoved() {
        this.shootStop();
        this.detachInputListeners();
        // Kill timelines
        if (this.barrierTimeline) this.barrierTimeline.kill();
        // Let BaseUnit handle sprite destruction via its destroy method
        super.castRemoved();
    }

     // Override destroy for thorough cleanup
     destroy(options) {
         this.detachInputListeners();
         if (this.barrier) this.barrier.destroy();
         if (this.barrierEffect) this.barrierEffect.destroy();
         if (this.barrierTimeline) this.barrierTimeline.kill();
         // dragAreaRect is handled by the scene

         this.barrier = null;
         this.barrierEffect = null;
         this.barrierTimeline = null;
         this.keyDownListener = null;
         this.keyUpListener = null;
         this.bulletList = []; // Clear list

         super.destroy(options); // Call BaseUnit destroy
     }
}


// Enemy.js (Original 'Ye')
import { BaseUnit } from './BaseUnit.js';
import * as Sound from './soundManager.js';
import { gameState } from './gameState.js';
import { globals } from './globals.js';
import * as Constants from './constants.js';
import { SHOOT_MODES, SHOOT_SPEEDS, ITEM_TYPES } from './Player.js'; // Import item types
import { AnimatedItem } from './AnimatedItem.js'; // Import item class

export class Enemy extends BaseUnit {
    constructor(data) {
         // Texture Pre-processing (Ideally done once during loading)
        const processTextures = (texturePaths) => {
            if (!texturePaths) return null;
            return texturePaths.map(path => {
                const texture = PIXI.Texture.from(path);
                texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
                return texture;
            });
        };

        const enemyFrames = processTextures(data.texture);
        const explosionFrames = data.explosion ? processTextures(data.explosion) : null;
        if (data.tamaData && data.tamaData.texture) {
            data.tamaData.texture = processTextures(data.tamaData.texture);
        }

        super(enemyFrames, explosionFrames);

        this.name = data.name;
        this.unit.name = data.name; // Name the interactive part
        this.interval = data.interval; // Shoot interval
        this.score = data.score;
        this.hp = data.hp;
        this.speed = data.speed;
        this.cagage = data.cagage; // CA Gauge fill amount
        this.tamaData = data.tamaData; // Data for bullets this enemy shoots
        this.itemName = data.itemName;
        this.itemTextureFrames = data.itemTexture ? processTextures(data.itemTexture) : null; // Store frames

        // Filters
        this.whiteFilter = new PIXI.filters.ColorMatrixFilter();
        this.whiteFilter.matrix = [ // Matrix for white flash
            1, 1, 1, 1, 0, // R = R+G+B+A * 0 + 1 -> effectively 1
            1, 1, 1, 1, 0, // G
            1, 1, 1, 1, 0, // B
            0, 0, 0, 1, 0  // A
        ];
         this.whiteFilter.enabled = false; // Disable initially
         this.filters = [this.whiteFilter]; // Apply filter list

        // Specific Enemy Logic Flags/Properties
        this.shadowReverse = data.shadowReverse !== undefined ? data.shadowReverse : true; // Default based on original
        this.shadowOffsetY = data.shadowOffsetY || 0;
        this.shootFlg = true; // Can shoot initially
        this.hardleFlg = data.interval <= -1; // Is it just an obstacle?
        this.deadFlg = false;
        this.bulletFrameCnt = 0;
        this.posName = null; // For soliderB movement

         // Adjust hitArea based on name
         switch (this.name) {
             case "baraA":
             case "baraB":
                 this.shadow.visible = false;
                 // Keep default hitArea or define specific one
                 this.unit.hitArea = new PIXI.Rectangle(-this.character.width/2, -this.character.height/2, this.character.width, this.character.height);
                 break;
             case "drum":
                 this.unit.hitArea = new PIXI.Rectangle(-this.character.width / 2 + 7, -this.character.height / 2 + 2, this.character.width - 14, this.character.height - 4);
                 break;
             case "launchpad":
                 this.unit.hitArea = new PIXI.Rectangle(-this.character.width / 2 + 8, -this.character.height / 2 + 0, this.character.width - 16, this.character.height);
                 break;
             default:
                  // Default centered hit area
                  this.unit.hitArea = new PIXI.Rectangle(-this.character.width/2, -this.character.height/2, this.character.width, this.character.height);
         }

         this.updateShadowPosition(); // Set initial shadow position/scale
    }

    loop(delta, stageScrollAmount) {
        if (this.deadFlg) return;

        this.bulletFrameCnt += delta * 60; // Update based on delta

        // Shooting
        if (this.shootFlg && !this.hardleFlg && this.interval > 0 && this.bulletFrameCnt >= this.interval) {
            this.shoot();
            this.bulletFrameCnt = 0; // Reset counter
        }

        // Movement
        this.y += (this.speed + stageScrollAmount) * delta; // Move down plus stage scroll

        switch (this.name) {
            case "soliderA":
                if (this.y >= Constants.GAME_DIMENSIONS.HEIGHT / 1.5 && gameState.playerRef) {
                    // Move towards player X
                    this.x += 0.005 * (gameState.playerRef.x - this.x) * delta * 60;
                }
                break;
            case "soliderB":
                 // Complex entry and horizontal movement
                 if (this.y <= 10) { // Initial entry position check
                    if(this.posName === null) { // Set initial side only once
                        this.posName = this.x >= Constants.GAME_DIMENSIONS.CENTER_X ? "right" : "left";
                        this.x = this.posName === "right" ? Constants.GAME_DIMENSIONS.WIDTH + this.character.width / 2 : -this.character.width / 2;
                    }
                 } else if (this.y >= Constants.GAME_DIMENSIONS.HEIGHT / 3) {
                     // Horizontal movement after reaching a certain Y
                     const horizontalSpeed = 1 * delta * 60;
                     if (this.posName === "right") {
                         this.x -= horizontalSpeed;
                     } else if (this.posName === "left") {
                         this.x += horizontalSpeed;
                     }
                 }
                break;
        }
         // Keep shadow updated
         this.updateShadowPosition();
    }

    shoot() {
        // Emit event for the scene/manager to handle bullet creation
        this.emit(BaseUnit.CUSTOM_EVENT_TAMA_ADD, this); // Pass self as context
        Sound.stop('se_shoot'); // Assuming generic enemy shoot sound
        Sound.play('se_shoot');
    }

    onDamage(amount) {
         if (this.deadFlg) return;

        if (this.hp === Infinity || this.hp === 'infinity') { // Handle indestructible (like hurdles)
            // White flash effect
            this.whiteFilter.enabled = true;
             TweenMax.to(this.whiteFilter, 0.1, {
                 enabled: false, // Directly control enabled property
                 delay: 0.1,
                 onComplete: () => { this.whiteFilter.enabled = false; } // Ensure it's off
            });
             // Optionally play a specific 'ping' sound for indestructible hits
             // Sound.play('se_indestructible_hit');
            return; // No HP reduction
        }

        this.hp -= amount;

        if (this.hp <= 0) {
            this.dead();
        } else {
            // Standard hit flash
            this.character.tint = 0xFF0000;
            TweenMax.to(this.character, 0.1, {
                tint: 0xFFFFFF, // Back to white
                delay: 0.1
            });
        }
    }

    dead() {
        if (this.deadFlg || this.hp === Infinity || this.hp === 'infinity') return; // Already dead or indestructible

        this.deadFlg = true;
        this.shootFlg = false; // Stop shooting
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD, this); // Notify manager, pass self

        this.character.visible = false; // Hide main sprite
        this.shadow.visible = false;    // Hide shadow

        if (this.explosion) {
            this.explosion.visible = true;
            this.explosion.x = 0; // Relative to container center
            this.explosion.y = 0;
            this.explosion.onComplete = () => this.explosionComplete();
            this.explosion.gotoAndPlay(0);
            Sound.stop('se_damage'); // Stop damage sound if playing
            Sound.play('se_explosion');
        } else {
            // If no explosion, complete immediately
            this.explosionComplete();
        }
    }

    explosionComplete() {
        if (this.explosion) this.explosion.visible = false;
        this.visible = false; // Hide the whole container after explosion (or let manager remove)
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, this); // Notify manager
    }

     // Item Drop Logic (Called by manager/scene upon CUSTOM_EVENT_DEAD)
     dropItem() {
         if (this.itemName && this.itemTextureFrames) {
             const item = new AnimatedItem(this.itemTextureFrames, this.itemName);
             item.x = this.x;
             item.y = this.y;
             return item; // Return the item for the scene to add
         }
         return null;
     }

     // Override destroy for thorough cleanup
    destroy(options) {
        if (this.whiteFilter) this.whiteFilter = null; // Remove filter reference
        this.filters = null;
        // BaseUnit destroy will handle sprites
        super.destroy(options);
    }
}
```

**9. Scene Classes (Example: `TitleScene.js`, `LoadScene.js`, `GameScene.js`)**

```javascript
// LoadScene.js (Original 'Rn')
import { BaseScene } from './BaseScene.js';
import * as Constants from './constants.js';
import { gameState, loadHighScore } from './gameState.js';
import { globals } from './globals.js';
import * as Utils from './utils.js';
import * as Sound from './soundManager.js';
import { ModeButton } from './ui/ModeButton.js'; // Assuming ModeButton.js exists
import { RecommendButton } from './ui/RecommendButton.js'; // Assuming RecommendButton.js exists
import { TitleScene } from './TitleScene.js'; // Import next scene

export class LoadScene extends BaseScene {
    constructor() {
        super(Constants.SCENE_NAMES.LOAD);

        this.loadingBg = null;
        this.loadingG = null;
        this.recommendModal = null;
        this.recommendModalCloseBtn = null;
        this.loadingBgFlipCnt = 0;
        this.resourceLoader = new PIXI.Loader();

        // Preload minimal assets for the selection screen
        this.preloadLoader = new PIXI.Loader();
        this.preloadLoader.add('mode_select_ui', `${gameState.baseUrl || Constants.BASE_PATH}assets/title_ui.json`); // Use gameState or Constants
        this.preloadLoader.add('loading_anim', `${gameState.baseUrl || Constants.BASE_PATH}assets/img/loading/loading.json`); // Assuming loading anim is also in a spritesheet
        this.preloadLoader.add('loading_bg', `${gameState.baseUrl || Constants.BASE_PATH}assets/img/loading/loading_bg.png`);
        this.preloadLoader.add('recommend_modal_ja', `${gameState.baseUrl || Constants.BASE_PATH}assets/img/ui/recommendModal.gif`);
        this.preloadLoader.add('recommend_modal_en', `${gameState.baseUrl || Constants.BASE_PATH}assets/img/ui/recommendModal_en.gif`);
        this.preloadLoader.add('recommend_modal_close', `${gameState.baseUrl || Constants.BASE_PATH}assets/img/ui/recommendModalCloseBtn.gif`);


        // Load high score initially
        loadHighScore();
    }

    run() {
        this.preloadLoader.load((loader, resources) => {
            this.setupModeSelection(resources);
        });
    }

    setupModeSelection(resources) {
         // Loading BG (TilingSprite might be better if it needs to tile)
         this.loadingTexture = resources.loading_bg.texture;
         this.loadingBg = new PIXI.Sprite(this.loadingTexture);
         this.loadingBg.alpha = 0.09;
         this.loadingBg.name = "omote"; // For rotation logic
         this.addChild(this.loadingBg);

        // Loading Animation (Placeholder if needed before main load)
        const loadingFrames = Object.keys(resources.loading_anim.textures).map(key => resources.loading_anim.textures[key]);
        this.loadingG = new PIXI.AnimatedSprite(loadingFrames);
        this.loadingG.anchor.set(0.5);
        this.loadingG.x = Constants.GAME_DIMENSIONS.CENTER_X;
        this.loadingG.y = Constants.GAME_DIMENSIONS.CENTER_Y;
        this.loadingG.animationSpeed = 0.15;
        this.loadingG.visible = false; // Hide initially
        this.addChild(this.loadingG);

        // Mode Selection UI
        this.modeTitle = new PIXI.Sprite(resources.mode_select_ui.textures["modeSelectTxt.gif"]);
        this.modeTitle.position.set(44, 83);
        this.addChild(this.modeTitle);

        this.playPcBtn = new ModeButton([
            resources.mode_select_ui.textures["playBtnPc0.gif"],
            resources.mode_select_ui.textures["playBtnPc1.gif"]
        ]);
        this.playPcBtn.position.set(44, this.modeTitle.y + this.modeTitle.height + 40);
        this.playPcBtn.on('pointerup', () => this.loadStart(false));
        this.addChild(this.playPcBtn);

        this.playPcTxt = new PIXI.Sprite(resources.mode_select_ui.textures["playBtnPcTxt.gif"]);
        this.playPcTxt.position.set(44, this.playPcBtn.y + this.playPcBtn.height + 2);
        this.addChild(this.playPcTxt);

        this.playSpBtn = new ModeButton([
            resources.mode_select_ui.textures["playBtnSp0.gif"],
            resources.mode_select_ui.textures["playBtnSp1.gif"]
        ]);
        this.playSpBtn.position.set(44, this.playPcTxt.y + 20);
        this.playSpBtn.on('pointerup', () => this.loadStart(true));
        this.addChild(this.playSpBtn);

        this.playSpTxt = new PIXI.Sprite(resources.mode_select_ui.textures["playBtnSpTxt.gif"]);
        this.playSpTxt.position.set(44, this.playSpBtn.y + this.playSpBtn.height + 2);
        this.addChild(this.playSpTxt);

        // Recommend Button & Modal
        const recommendBtnKey = `recommendBtn0${Constants.LANG === 'ja' ? '' : '_en'}.gif`;
        const recommendBtnDownKey = `recommendBtn1${Constants.LANG === 'ja' ? '' : '_en'}.gif`;
        this.recommendBtn = new RecommendButton([
            resources.mode_select_ui.textures[recommendBtnKey],
            resources.mode_select_ui.textures[recommendBtnDownKey]
        ]);
        this.recommendBtn.position.set(40, this.playSpTxt.y + 100);
        this.recommendBtn.on('pointerup', () => this.recommendModalOpen());
        this.addChild(this.recommendBtn);

        const modalTexture = resources[`recommend_modal_${Constants.LANG}`]?.texture || resources.recommend_modal_ja.texture;
        this.recommendModal = new PIXI.Sprite(modalTexture);
        this.recommendModal.anchor.set(0.5);
        this.recommendModal.position.set(Constants.GAME_DIMENSIONS.CENTER_X, Constants.GAME_DIMENSIONS.CENTER_Y);
        this.recommendModal.interactive = true; // Block clicks behind
        this.recommendModal.visible = false;
        this.recommendModal.scale.set(0);
        this.addChild(this.recommendModal);

        this.recommendModalCloseBtn = new PIXI.Sprite(resources.recommend_modal_close.texture);
        this.recommendModalCloseBtn.anchor.set(1.0, 0.0); // Top-right corner
        this.recommendModalCloseBtn.position.set(this.recommendModal.width / 2 - 2, -this.recommendModal.height / 2 + 2);
        this.recommendModalCloseBtn.interactive = true;
        this.recommendModalCloseBtn.buttonMode = true;
        this.recommendModalCloseBtn.on('pointerup', () => this.recommendModalClose());
        this.recommendModal.addChild(this.recommendModalCloseBtn);
    }


    loop(delta) {
        super.loop(delta); // BaseScene loop

        // Rotate background texture
        if (this.loadingBg && this.loadingTexture) {
             this.loadingBgFlipCnt += delta;
             if (this.loadingBgFlipCnt >= 6) { // Approx every 6 frames at 60fps
                 this.loadingBgFlipCnt = 0;
                 if (this.loadingBg.name === "ura") {
                     this.loadingBg.name = "omote";
                     this.loadingTexture.rotate = 0;
                 } else {
                     this.loadingBg.name = "ura";
                     this.loadingTexture.rotate = 8; // PIXI uses values 0, 2, 4, 6, 8, ... for rotation
                 }
             }
        }
    }

    recommendModalOpen() {
        if (!this.recommendModal) return;
        this.recommendModal.visible = true;
        this.recommendModal.scale.set(0.05, 0.05); // Start small
        TweenMax.to(this.recommendModal.scale, 0.15, { y: 1, ease: Quint.easeOut });
        TweenMax.to(this.recommendModal.scale, 0.15, { x: 1, delay: 0.12, ease: Back.easeOut });
    }

    recommendModalClose() {
        if (!this.recommendModal) return;
        // Optional: Add closing animation
        TweenMax.to(this.recommendModal.scale, 0.15, { x: 0, y: 0, ease: Quint.easeIn, onComplete: () => {
             this.recommendModal.visible = false;
        }});
    }

    loadStart(isLowMode) {
        gameState.lowModeFlg = isLowMode;

        // Hide selection UI, show loading animation
        this.modeTitle.visible = false;
        this.playPcBtn.visible = false;
        this.playSpBtn.visible = false;
        this.playPcTxt.visible = false;
        this.playSpTxt.visible = false;
        this.recommendBtn.visible = false;
        this.recommendModal.visible = false;

        if (this.loadingG) {
            this.loadingG.visible = true;
            this.loadingG.play();
        }
         if(this.loadingBg) {
            this.loadingBg.alpha = 1.0; // Make BG opaque during load
            this.loadingTexture.rotate = 0; // Reset rotation
        }

        // Add main game assets to the loader
        for (const key in Constants.RESOURCE_PATHS) {
            const path = Constants.RESOURCE_PATHS[key];
            const fullPath = `${gameState.baseUrl || Constants.BASE_PATH}${path}`;
            const isSound = path.endsWith('.mp3');

             if (!gameState.lowModeFlg || !isSound) { // Load non-sounds in low mode, all in normal mode
                // Check if already added by preloadLoader
                 if (!this.resourceLoader.resources[key] && !this.preloadLoader.resources[key]) {
                    this.resourceLoader.add(key, fullPath);
                }
            }
        }

        this.resourceLoader.on('progress', this.loadProgress.bind(this));
        this.resourceLoader.on('complete', this.loadComplete.bind(this));
        this.resourceLoader.load();
    }

    loadProgress(loader, resource) {
        Utils.dlog(`Resource Loading: ${loader.progress.toFixed(0)}%`);
        // TODO: Update a visual progress bar if desired
    }

    loadComplete(loader, resources) {
        Utils.dlog("Load Complete!");
        globals.resources = { ...this.preloadLoader.resources, ...resources }; // Combine preloaded and main resources

        if (!gameState.lowModeFlg) {
             Sound.setInitialVolumes(); // Set volumes after loading sounds

             // Add visibility change listener for sound pausing/resuming
             if (typeof document !== 'undefined') {
                document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
             }
        }

        // Fade out loading screen and switch scene
        const fadeTarget = this.loadingG || this; // Fade animation or whole scene
        TweenMax.to(fadeTarget, 0.3, { alpha: 0, delay: 0.2, onComplete: () => {
             this.switchScene(Constants.SCENE_NAMES.TITLE, TitleScene);
        }});
         if (this.loadingBg && fadeTarget !== this.loadingBg) {
             TweenMax.to(this.loadingBg, 0.3, { alpha: 0, delay: 0.2 });
         }
    }

     handleVisibilityChange() {
         if (typeof document === 'undefined') return;
         if (document.visibilityState === 'hidden') {
             Sound.pauseAll();
         } else if (document.visibilityState === 'visible') {
             Sound.resumeAll();
         }
     }

    // Override destroy for proper cleanup
     destroy(options) {
         if (typeof document !== 'undefined') {
             document.removeEventListener("visibilitychange", this.handleVisibilityChange);
         }
         if (this.resourceLoader) {
            this.resourceLoader.reset(); // Clear loader listeners
            this.resourceLoader = null;
         }
         if (this.preloadLoader) {
             this.preloadLoader.reset();
             this.preloadLoader = null;
         }
         // PIXI container destroy will handle children
         super.destroy(options);
     }
}


// TitleScene.js (Original 'mn')
import { BaseScene } from './BaseScene.js';
import * as Constants from './constants.js';
import { gameState, saveHighScore } from './gameState.js';
import { globals } from './globals.js';
import * as Utils from './utils.js';
import * as Sound from './soundManager.js';
import { StartButton } from './ui/StartButton.js';
import { HowtoButton } from './ui/HowtoButton.js';
import { StaffrollButton } from './ui/StaffrollButton.js';
import { TwitterButton } from './ui/TwitterButton.js';
import { StaffrollPanel } from './ui/StaffrollPanel.js';
import { BigNumberDisplay } from './ui/BigNumberDisplay.js';
import { AdvScene } from './AdvScene.js'; // Import next scene


export class TitleScene extends BaseScene {
    constructor() {
        super(Constants.SCENE_NAMES.TITLE);
        // Initialize properties
        this.bg = null;
        this.titleGWrap = null;
        this.titleG = null;
        this.logo = null;
        this.subTitle = null;
        this.belt = null;
        this.startBtn = null;
        this.copyright = null;
        this.scoreTitleTxt = null;
        this.bigNumTxt = null;
        this.twitterBtn = null;
        this.howtoBtn = null;
        this.staffrollBtn = null;
        this.staffrollPanel = null;
        this.cover = null;
        this.fadeOutBlack = null;
    }

    run() {
         // Create Background
         const bgTexture = globals.resources.title_bg?.texture; // Use loaded texture
         if (bgTexture) {
            this.bg = new PIXI.TilingSprite(bgTexture, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
            this.addChild(this.bg);
         } else {
             console.warn("Title background texture not found!");
         }

         // Title GFX
         this.titleGWrap = new PIXI.Container();
         this.titleG = new PIXI.Sprite(globals.resources.game_ui.textures["titleG.gif"]);
         this.titleGWrap.addChild(this.titleG);
         this.addChild(this.titleGWrap);

         // Logo
         this.logo = new PIXI.Sprite(globals.resources.game_ui.textures["logo.gif"]);
         this.logo.anchor.set(0.5);
         this.addChild(this.logo);

         // Subtitle (Language Specific)
         const subTitleKey = `subTitle${Constants.LANG === 'ja' ? '' : 'En'}.gif`;
         this.subTitle = new PIXI.Sprite(globals.resources.game_ui.textures[subTitleKey]);
         this.subTitle.anchor.set(0.5);
         this.addChild(this.subTitle);

         // Bottom Belt
         this.belt = new PIXI.Graphics();
         this.belt.beginFill(0x000000);
         this.belt.drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, 120);
         this.belt.y = Constants.GAME_DIMENSIONS.HEIGHT - 120;
         this.addChild(this.belt);

         // Start Button
         this.startBtn = new StartButton(); // Uses textures from game_ui.json
         this.startBtn.on('pointerup', this.titleStart.bind(this));
         this.startBtn.interactive = false; // Enable after animation
         this.startBtn.alpha = 0;
         this.addChild(this.startBtn);

         // Copyright
         this.copyright = new PIXI.Sprite(globals.resources.game_ui.textures["titleCopyright.gif"]);
         this.copyright.y = Constants.GAME_DIMENSIONS.HEIGHT - this.copyright.height - 6;
         this.addChild(this.copyright);

         // High Score Display
         this.scoreTitleTxt = new PIXI.Sprite(globals.resources.game_ui.textures["hiScoreTxt.gif"]);
         this.scoreTitleTxt.position.set(32, this.copyright.y - 66);
         this.addChild(this.scoreTitleTxt);

         this.bigNumTxt = new BigNumberDisplay(10); // Uses textures from game_ui.json
         this.bigNumTxt.position.set(this.scoreTitleTxt.x + this.scoreTitleTxt.width + 3, this.scoreTitleTxt.y - 2);
         this.bigNumTxt.setNum(gameState.highScore);
         this.addChild(this.bigNumTxt);

         // Twitter Button
         this.twitterBtn = new TwitterButton(); // Uses textures from game_ui.json
         this.twitterBtn.position.set(Constants.GAME_DIMENSIONS.CENTER_X, this.copyright.y - this.twitterBtn.height / 2 - 14);
         this.twitterBtn.on('pointerup', this.tweet.bind(this));
         this.addChild(this.twitterBtn);

         // Howto Button
         this.howtoBtn = new HowtoButton(); // Uses textures from game_ui.json
         this.howtoBtn.position.set(15, 10);
         this.howtoBtn.scale.y = 0; // Start scaled down
         // HowtoButton's internal logic handles window.howtoModalOpen()
         this.addChild(this.howtoBtn);

         // Staffroll Button & Panel
         this.staffrollBtn = new StaffrollButton(); // Uses textures from game_ui.json
         this.staffrollBtn.position.set(Constants.GAME_DIMENSIONS.WIDTH - this.staffrollBtn.width - 15, 10);
         this.staffrollBtn.scale.y = 0;
         this.staffrollBtn.on('pointerup', this.showStaffroll.bind(this));
         this.addChild(this.staffrollBtn);

         // Cover/Overlay
         const coverTexture = globals.resources.game_ui.textures["stagebgOver.gif"];
         if (coverTexture) {
            this.cover = new PIXI.TilingSprite(coverTexture, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
            this.addChild(this.cover);
         }

         // Fade Out Graphic
         this.fadeOutBlack = new PIXI.Graphics();
         this.fadeOutBlack.beginFill(0x000000);
         this.fadeOutBlack.drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
         this.fadeOutBlack.alpha = 0;
         this.fadeOutBlack.visible = false; // Only show when needed
         this.addChild(this.fadeOutBlack);

         // Start Animation
         this.startIntroAnimation();
    }

    startIntroAnimation() {
        // Initial positions for animation
        this.titleGWrap.position.set(Constants.GAME_DIMENSIONS.WIDTH, 100);
        this.logo.position.set(this.logo.width / 2, -this.logo.height / 2); // Assuming anchor 0.5
        this.logo.scale.set(2);
        this.subTitle.position.set(this.subTitle.width / 2, -this.logo.height / 2); // Assuming anchor 0.5
        this.subTitle.scale.set(3);

        const tl = new TimelineMax({
            onComplete: () => {
                // Animation complete actions if needed
            }
        });

        tl.to(this.titleGWrap, 2, { x: Constants.GAME_DIMENSIONS.CENTER_X - this.titleG.width / 2 + 5, y: 20, ease: Quint.easeOut }, "+=0.0")
          .to(this.logo, 0.9, { y: 75, ease: Quint.easeIn }, "-=1.8") // Start logo anim earlier
          .to(this.logo.scale, 0.9, { x: 1, y: 1, ease: Quint.easeIn }, "<") // Run concurrently with y anim
          .to(this.subTitle, 0.9, { y: 130, ease: Quint.easeIn }, "-=1.7") // Start subtitle slightly after logo
          .to(this.subTitle.scale, 0.9, { x: 1, y: 1, ease: Quint.easeIn }, "<") // Run concurrently
          .addCallback(() => Sound.play('voice_titlecall'), "-=0.5") // Play sound during anim
          .to(this.startBtn, 0.1, { alpha: 1 }, "+=0.2") // Show start button
          .addCallback(() => {
              this.startBtn.interactive = true;
              this.startBtn.flash(); // Call flash method on button
          }, "+=0.1")
          .to(this.howtoBtn.scale, 0.3, { y: 1, ease: Elastic.easeOut }, "+=0.2") // Animate buttons in
          .to(this.staffrollBtn.scale, 0.3, { y: 1, ease: Elastic.easeOut }, "-=0.15");
    }


    loop(delta) {
        super.loop(delta);
        if (this.bg) {
            this.bg.tilePosition.x += 0.5 * delta; // Scroll background
        }
    }

    tweet() {
        Utils.tweet(0); // 0 for high score tweet
    }

    showStaffroll() {
        // Create panel only when needed
         if (!this.staffrollPanel || this.staffrollPanel.destroyed) {
            this.staffrollPanel = new StaffrollPanel(); // Uses textures from game_ui.json
        }
         // Ensure it's on top (or manage z-index better)
         this.addChild(this.staffrollPanel);
         // Panel's internal castAdded handles entry animation
    }

    titleStart() {
        if (!this.startBtn.interactive) return; // Prevent multiple clicks

        this.startBtn.interactive = false;
        this.startBtn.buttonMode = false;
        // Disable other buttons
        this.howtoBtn.interactive = false;
        this.staffrollBtn.interactive = false;
        this.twitterBtn.interactive = false;


        this.fadeOutBlack.visible = true;
        this.fadeOutBlack.alpha = 0;
        TweenMax.to(this.fadeOutBlack, 1, {
            alpha: 1,
            onComplete: () => {
                this.switchScene(Constants.SCENE_NAMES.ADV, AdvScene); // Switch to AdvScene
            }
        });
    }

     // Override destroy
     destroy(options) {
         // Kill tweens associated with this scene if any are running globally
         // TweenMax.killTweensOf(this.logo); // Example
         // PIXI Container destroy should handle children
         super.destroy(options);
     }
}

// GameScene.js (Original 'Ki')
import { BaseScene } from './BaseScene.js';
import * as Constants from './constants.js';
import { gameState, saveHighScore } from './gameState.js';
import { globals } from './globals.js';
import * as Utils from './utils.js';
import * as Sound from './soundManager.js';
import { Player, SHOOT_MODES, SHOOT_SPEEDS, ITEM_TYPES } from './Player.js';
import { Enemy } from './Enemy.js';
import { Bullet } from './Bullet.js';
import { AnimatedItem } from './AnimatedItem.js';
// Import Boss classes
import { Boss } from './bosses/Boss.js'; // Assuming a base Boss class exists
import { BossBison } from './bosses/BossBison.js';
import { BossBarlog } from './bosses/BossBarlog.js';
import { BossSagat } from './bosses/BossSagat.js';
import { BossVega } from './bosses/BossVega.js';
import { BossGoki } from './bosses/BossGoki.js';
import { BossFang } from './bosses/BossFang.js';
// Import UI
import { HUD } from './ui/HUD.js';
import { GameTitle } from './ui/GameTitle.js'; // Renamed from Oi
import { CutinContainer } from './ui/CutinContainer.js';
import { StageBackground } from './ui/StageBackground.js';
import { BigNumberDisplay } from './ui/BigNumberDisplay.js'; // For boss timer
// Import Next Scenes
import { AdvScene } from './AdvScene.js';
import { ContinueScene } from './ContinueScene.js';


export class GameScene extends BaseScene {
    constructor() {
        super(Constants.SCENE_NAMES.GAME);

        this.waveInterval = 80; // Frames between waves
        this.waveCount = 0;
        this.frameCnt = 0; // Counter for wave timing
        this.stageScrollSpeed = 0.7; // Renamed from stageBgAmountMove
        this.enemyWaveFlg = false;
        this.theWorldFlg = false; // CA or special event freeze flag
        this.sceneSwitch = 0; // 0 = continue/gameover, 1 = next stage

        this.player = null;
        this.hud = null;
        this.stageBg = null;
        this.titleOverlay = null; // Renamed from title
        this.cutinCont = null;
        this.cover = null; // Foreground overlay?
        this.boss = null;
        this.bossTimerDisplay = null;
        this.bossTimerText = null;
        this.bossTimerCountDown = 99;
        this.bossTimerFrameCnt = 0;
        this.bossTimerStartFlg = false;
        this.caLine = null;

        // Containers
        this.backgroundContainer = new PIXI.Container(); // For stageBg
        this.unitContainer = new PIXI.Container(); // For player, enemies, items
        this.bulletContainer = new PIXI.Container(); // For all bullets
        this.hudContainer = new PIXI.Container(); // For HUD elements
        this.overlayContainer = new PIXI.Container(); // For title, cutins, effects

        this.addChild(this.backgroundContainer);
        this.addChild(this.unitContainer);
        this.addChild(this.bulletContainer);
        this.addChild(this.hudContainer);
        this.addChild(this.overlayContainer);

        // Entity Lists
        this.enemies = [];
        this.items = [];
        this.playerBullets = [];
        this.enemyBullets = []; // Use gameState.enemyBulletList ? Original used D.enemyBulletList but wasn't populated

        this.stageEnemyPositionList = []; // Loaded in run()
        this.stageBgmName = '';

        // Pre-process textures (should be done in Loader ideally)
        this.explosionTextures = this.processFrames("explosion0", 7);
        this.caExplosionTextures = this.processFrames("caExplosion0", 8);
        this.itemTextures = {
            [SHOOT_MODES.BIG]: this.processFrames("powerupBig", 2),
            [SHOOT_MODES.THREE_WAY]: this.processFrames("powerup3way", 2),
            [ITEM_TYPES.BARRIER]: this.processFrames("barrierItem", 2),
            [SHOOT_SPEEDS.HIGH]: this.processFrames("speedupItem", 2),
        };
         this.stageBgTextures = [];
         for (let i = 0; i < 5; i++) { // Assuming 5 stages max
            this.stageBgTextures.push([
                 globals.resources[`stage_end${i}`]?.texture,
                 globals.resources[`stage_loop${i}`]?.texture
            ]);
         }
    }

    processFrames(baseName, count) {
        const frames = [];
        for (let i = 0; i < count; i++) {
             // Assuming textures are in game_asset.json
             const texture = globals.resources.game_asset?.textures[`${baseName}${i}.gif`];
             if (texture) {
                frames.push(texture);
             } else {
                 console.warn(`Texture not found: ${baseName}${i}.gif`);
             }
        }
        return frames;
    }

    run() {
        Utils.dlog("GameScene Run - Stage:", gameState.stageId);

        // --- Setup Stage ---
        this.stageBg = new StageBackground(this.stageBgTextures);
        this.stageBg.init(gameState.stageId);
        this.backgroundContainer.addChild(this.stageBg);

        // --- Setup Player ---
        const playerData = globals.resources.recipe?.data?.playerData;
        if (!playerData) {
            console.error("Player data not found!");
            return; // Cannot proceed
        }
        playerData.explosion = this.explosionTextures; // Add pre-processed textures
        playerData.hit = this.processFrames("hit", 5);
        playerData.guard = this.processFrames("guard", 5);
        // Ensure bullet textures are pre-processed here if not done in loader
        // playerData.shootNormal.texture = ...
        // playerData.shootBig.texture = ...
        // playerData.barrier.texture = ...
        // playerData.barrierEffectTexture = ...


        this.player = new Player(playerData);
        this.player.on(Player.CUSTOM_EVENT_BULLET_ADD, this.handlePlayerShoot.bind(this));
        this.player.on(Player.CUSTOM_EVENT_DEAD, this.gameover.bind(this));
        this.player.on(Player.CUSTOM_EVENT_DEAD_COMPLETE, this.gameoverComplete.bind(this));
        gameState.playerRef = this.player; // Update global reference
        this.player.setUp(gameState.playerHp, gameState.shootMode, gameState.shootSpeed); // Use current game state
        this.player.position.set(
            Constants.GAME_DIMENSIONS.CENTER_X,
            Constants.GAME_DIMENSIONS.HEIGHT - (this.player.character?.height || 50) - 30
        );
        this.player.unitX = this.player.x; // Sync target position
        this.unitContainer.addChild(this.player);

        // --- Setup HUD ---
        this.hud = new HUD();
        this.hud.on(HUD.CUSTOM_EVENT_CA_FIRE, this.caFire.bind(this));
        this.hud.setPercent(this.player.percent);
        this.hud.scoreCount = gameState.score;
        this.hud.highScore = gameState.highScore;
        this.hud.comboCount = gameState.combo;
        this.hud.maxCombCount = gameState.maxCombo; // Use maxCombCount setter
        this.hud.cagageCount = gameState.cagage;
        this.hud.comboTimeCnt = 0; // Reset combo timer
        this.hudContainer.addChild(this.hud);


        // --- Setup Overlays ---
        this.titleOverlay = new GameTitle(); // Uses game_ui.json textures
        this.titleOverlay.on(GameTitle.EVENT_START, this.gameStart.bind(this));
        this.overlayContainer.addChild(this.titleOverlay);

        this.cutinCont = new CutinContainer(); // Uses game_ui.json textures

        const coverTexture = globals.resources.game_ui.textures["stagebgOver.gif"];
         if (coverTexture) {
             this.cover = new PIXI.TilingSprite(coverTexture, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
             this.overlayContainer.addChild(this.cover); // Add cover to overlay container
         }

        // --- Load Stage Data ---
        const stageData = globals.resources.recipe?.data?.[`stage${gameState.stageId}`];
        if (stageData?.enemylist) {
            this.stageEnemyPositionList = [...stageData.enemylist].reverse(); // Clone and reverse
            // Apply short flag if needed
            if (gameState.shortFlg) {
                 this.stageEnemyPositionList = [
                    ["00", "00", "A1", "A2", "A9", "00", "00", "00"],
                    ["00", "00", "A3", "A3", "00", "00", "00", "00"]
                 ];
             }
        } else {
            console.warn(`Enemy list for stage ${gameState.stageId} not found.`);
            this.stageEnemyPositionList = [];
        }

        // --- Reset State ---
        this.enemyWaveFlg = false;
        this.theWorldFlg = false;
        this.waveCount = 0;
        this.frameCnt = 0;
        this.boss = null;
        this.bossTimerStartFlg = false;
        this.bossTimerCountDown = 99;
        this.enemies = [];
        this.items = [];
        this.playerBullets = [];
        this.enemyBullets = [];

        // --- Start BGM ---
        const bossData = globals.resources.recipe?.data?.bossData?.[`boss${gameState.stageId}`];
        this.stageBgmName = bossData ? `boss_${bossData.name}_bgm` : '';
        const bgmInfo = Constants.BGM_INFO[this.stageBgmName];

        if (bgmInfo) {
             const startMs = bgmInfo.start / 48; // Original code divides by 48e3, maybe sampling rate related? Use ms directly.
             const endMs = bgmInfo.end / 48;
            if (gameState.stageId === Constants.STAGE_IDS.ENDING) { // Special handling for stage 4 BGM start
                TweenMax.delayedCall(3, () => Sound.bgmPlay(bgmInfo.name, startMs, endMs));
            } else {
                Sound.bgmPlay(bgmInfo.name, startMs, endMs);
            }
        } else {
             console.warn(`BGM info not found for ${this.stageBgmName}`);
        }

        // --- Start Title Animation ---
        this.titleOverlay.gameStart(gameState.stageId); // Start the "Round X... FIGHT!" animation

        // Delay enabling HUD interaction
        this.hud.caBtnDeactive(); // Start deactivated
        TweenMax.delayedCall(2.6, () => {
             const voiceKey = `g_stage_voice_${gameState.stageId}`;
             if (Sound.hasOwnProperty(voiceKey)) Sound.play(voiceKey); // Check if voice exists
             this.hud.caBtnActive();
        });

         // --- Setup Input Handling for Player ---
         // Add a transparent interactive graphic covering the game area
         this.inputLayer = new PIXI.Graphics();
         this.inputLayer.beginFill(0xFFFFFF, 0); // Transparent
         this.inputLayer.drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT);
         this.inputLayer.endFill();
         this.inputLayer.interactive = true;
         this.inputLayer.on('pointerdown', this.player.onScreenDragStart, this.player);
         this.inputLayer.on('pointermove', this.player.onScreenDragMove, this.player);
         this.inputLayer.on('pointerup', this.player.onScreenDragEnd, this.player);
         this.inputLayer.on('pointerupoutside', this.player.onScreenDragEnd, this.player);
         this.addChild(this.inputLayer); // Add on top, but behind HUD/Overlays potentially
         this.setChildIndex(this.inputLayer, this.children.length - 3); // Place behind HUD and Overlay containers

         this.player.attachInputListeners(); // Attach keyboard listeners
    }

     gameStart() { // Called by GameTitle overlay when "FIGHT" anim finishes
        Utils.dlog("Game Started - Enabling Waves & Player Shoot");
        this.enemyWaveFlg = true;
        if (this.player) this.player.shootStart();
    }


    loop(delta) {
        super.loop(delta); // BaseScene loop (updates frame counter)

        if (this.theWorldFlg) return; // Freeze game

        const scroll = this.stageScrollSpeed * delta;
        this.stageBg.loop(scroll);
        this.cover.tilePosition.y += scroll; // Scroll foreground overlay


        // Player Loop (already handles movement, shooting logic internally)
        // Player's loop is called by BaseScene's loop if it exists

        // Update Player Bullets
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const bullet = this.playerBullets[i];
            bullet.loop(delta);
             // Check off-screen
             if (bullet.y < -bullet.height || bullet.x < -bullet.width || bullet.x > Constants.GAME_DIMENSIONS.WIDTH) {
                 this.removePlayerBullet(bullet, i);
             }
        }

        // Update Enemy Bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.loop(delta, scroll); // Enemy bullets might need scroll amount
             // Check off-screen
            if (bullet.y > Constants.GAME_DIMENSIONS.HEIGHT || bullet.x < -bullet.width || bullet.x > Constants.GAME_DIMENSIONS.WIDTH) {
                this.removeEnemyBullet(bullet, i);
            }
        }

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.deadFlg) continue; // Skip dead enemies waiting for removal
            enemy.loop(delta, scroll);

             // Check off-screen
             const bounds = enemy.getBounds(); // Use bounds for off-screen check
            if (bounds.y > Constants.GAME_DIMENSIONS.HEIGHT || bounds.x + bounds.width < 0 || bounds.x > Constants.GAME_DIMENSIONS.WIDTH) {
                 if (enemy !== this.boss) { // Don't remove boss this way
                    this.removeEnemy(enemy, i);
                 }
            }
        }

        // Update Items
        for (let i = this.items.length - 1; i >= 0; i--) {
             const item = this.items[i];
             item.y += (1 + scroll) * delta; // Item falling speed + stage scroll
             item.loop(delta); // For animation

             // Check off-screen
             if (item.y > Constants.GAME_DIMENSIONS.HEIGHT) {
                this.removeItem(item, i);
             }
        }

        // Collision Detection
        this.checkCollisions();

        // Enemy Wave Logic
        if (this.enemyWaveFlg) {
            this.frameCnt += delta * Constants.FPS; // Increment frame counter based on delta and target FPS
            if (this.frameCnt >= this.waveInterval) {
                this.enemyWave();
                this.frameCnt = 0; // Reset counter
            }
        }

        // Boss Timer Logic
        if (this.bossTimerStartFlg && this.boss) {
             this.bossTimerFrameCnt += delta * Constants.FPS;
             if (this.bossTimerFrameCnt >= Constants.FPS) { // Every second approx
                this.bossTimerFrameCnt = 0;
                 this.bossTimerCountDown--;
                 if (this.bossTimerDisplay) {
                     this.bossTimerDisplay.setNum(this.bossTimerCountDown);
                 }
                 if (this.bossTimerCountDown <= 0) {
                    this.bossTimerStartFlg = false;
                     this.timeover(); // Changed from timeoverComplete
                }
            }
        }
    } // End loop

     // --- Collision Handling ---
     checkCollisions() {
         // Player Bullets vs Enemies
         for (let i = this.playerBullets.length - 1; i >= 0; i--) {
             const bullet = this.playerBullets[i];
             if (bullet.deadFlg) continue;

             for (let j = this.enemies.length - 1; j >= 0; j--) {
                 const enemy = this.enemies[j];
                 if (enemy.deadFlg) continue;

                 // Check visibility and basic distance? Optional optimization
                 // if (!enemy.visible || Math.abs(bullet.x - enemy.x) > 100) continue;

                 if (globals.interactionManager.hitTestRectangle(bullet.unit, enemy.unit)) {
                    this.handlePlayerBulletHitEnemy(bullet, enemy, i, j);
                    // Break inner loop if bullet should only hit one enemy? Depends on bullet type.
                    // if (bullet.piercing <= 0) break; // Example for non-piercing bullets
                 }
             }
         }

         // Enemy Bullets vs Player
         if (!this.player.deadFlg && !this.player.barrierFlg) { // Only check if player alive and no barrier
            for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
                 const bullet = this.enemyBullets[i];
                 if (bullet.deadFlg) continue;

                 if (globals.interactionManager.hitTestRectangle(bullet.unit, this.player.unit)) {
                     this.handleEnemyBulletHitPlayer(bullet, i);
                 }
             }
         }

         // Enemies vs Player (Collision/Suicide)
         if (!this.player.deadFlg) {
             for (let i = this.enemies.length - 1; i >= 0; i--) {
                 const enemy = this.enemies[i];
                 if (enemy.deadFlg) continue;

                 if (this.player.barrierFlg) {
                     // Check enemy vs barrier
                     if (globals.interactionManager.hitTestRectangle(enemy.unit, this.player.barrier)) {
                         this.player.barrierHitEffect();
                         enemy.onDamage(Infinity); // Instantly kill normal enemies hitting barrier
                         if (enemy.hp <= 0 && enemy !== this.boss) { // Don't auto-kill boss
                             this.handleEnemyRemoved(enemy, i); // Process score/item drop etc.
                         }
                     }
                 } else {
                     // Check enemy vs player unit
                     if (globals.interactionManager.hitTestRectangle(enemy.unit, this.player.unit)) {
                         if (enemy.name === 'goki') { // Special Goki grab
                             this.handleGokiGrab();
                         } else {
                              this.playerDamage(1); // Standard collision damage
                              // Optionally damage/kill the enemy too
                              enemy.onDamage(1); // Example: enemy takes 1 damage on collision
                              if (enemy.hp <= 0 && enemy !== this.boss) {
                                  this.handleEnemyRemoved(enemy, i);
                              }
                         }
                     }
                 }
             }
         }


         // Items vs Player
         if (!this.player.deadFlg) {
            for (let i = this.items.length - 1; i >= 0; i--) {
                const item = this.items[i];
                 if (globals.interactionManager.hitTestRectangle(item, this.player.unit)) { // Item is usually a simple sprite/animSprite
                    this.handleItemPickup(item, i);
                }
            }
         }
     }

    handlePlayerBulletHitEnemy(bullet, enemy, bulletIndex, enemyIndex) {
        let enemyHPBeforeHit = enemy.hp;
        let bulletDamage = bullet.damage;

         // Special handling for BIG bullets (damage over time / multiple hits)
        if (bullet.name === SHOOT_MODES.BIG) {
             // Track hits per bullet ID per enemy
             const hitTrackerId = `bullet_${bullet.id}`;
             if (!enemy[hitTrackerId]) {
                 enemy[hitTrackerId] = { count: 0, frame: 0 };
             }
             const tracker = enemy[hitTrackerId];
             tracker.frame++;

             // Apply damage only on specific frames (e.g., every 15 frames, max 2 hits)
             if (tracker.frame % 15 === 0 && tracker.count < 2) {
                 tracker.count++;
                 enemy.onDamage(bulletDamage);
                 // Bullet takes damage only if enemy was alive before this hit tick
                 bullet.onDamage(1, enemyHPBeforeHit > 0 ? 'normal' : 'infinity');
             } else if (tracker.count >= 2) {
                 // Stop checking this bullet against this enemy if max hits reached
             }

        } else {
             // Normal hit processing
             enemy.onDamage(bulletDamage);
             bullet.onDamage(1, enemyHPBeforeHit > 0 ? 'normal' : 'infinity'); // Bullet hits
        }

        // Check if enemy died from this hit
         if (enemy.hp <= 0 && enemyHPBeforeHit > 0) {
             this.handleEnemyRemoved(enemy, enemyIndex);
         }

         // Check if bullet died from this hit
         if (bullet.hp <= 0 && !bullet.deadFlg) { // Ensure bullet dead method isn't called twice
            // Bullet's onDamage calls dead(), which emits event.
            // No need to call removePlayerBullet here, wait for DEAD_COMPLETE.
         }
    }

     handleEnemyBulletHitPlayer(bullet, bulletIndex) {
         this.playerDamage(bullet.damage);
         bullet.onDamage(1); // Bullet hits player
         if (bullet.hp <= 0 && !bullet.deadFlg) {
             // Wait for DEAD_COMPLETE event
         }
     }

     handleItemPickup(item, itemIndex) {
         Sound.play('g_powerup_voice'); // Generic item pickup sound?
         switch (item.itemName) { // Assuming AnimatedItem stores the original itemName
             case SHOOT_SPEEDS.HIGH:
                 this.player.shootSpeedChange(SHOOT_SPEEDS.HIGH);
                 break;
             case ITEM_TYPES.BARRIER:
                 this.player.barrierStart();
                 break;
             case SHOOT_MODES.NORMAL:
             case SHOOT_MODES.BIG:
             case SHOOT_MODES.THREE_WAY:
                  // Reset speed if changing weapon type
                  if(this.player.shootMode !== item.itemName) {
                      this.player.shootSpeedChange(SHOOT_SPEEDS.NORMAL);
                  }
                  this.player.shootModeChange(item.itemName);
                 break;
         }
         this.removeItem(item, itemIndex);
     }

      handleGokiGrab() {
         if (!this.boss || this.boss.name !== 'goki' || this.theWorldFlg) return;

         Utils.dlog("Goki Grab!");
         this.hud.caBtnDeactive();
         this.theWorldFlg = true; // Freeze game
         if(this.boss) this.boss.onTheWorld(true); // Tell boss world is frozen

         // Stop player bullets
         this.playerBullets.forEach(b => this.removePlayerBullet(b, -1)); // Use -1 index to avoid splice issues

         this.boss.shungokusatsu(this.player.unit, true); // Trigger Goki's animation

         // Hide player during animation
         this.player.alpha = 0;
         this.hud.cagaBtn.alpha = 0; // Hide CA button too

         // Sequence the rest of the events
         TweenMax.delayedCall(1.8, () => {
             if(this.player) this.player.alpha = 1; // Player reappears (visually damaged)
         });
         TweenMax.delayedCall(1.9, () => {
             if(this.stageBg) this.stageBg.akebonoGokifinish(); // Background effect
         });
         TweenMax.delayedCall(2.7, () => {
             if(this.player) this.playerDamage(100); // Apply massive damage
         });
         TweenMax.delayedCall(3.0, () => {
             if(this.titleOverlay) this.titleOverlay.akebonofinish(); // K.O. overlay
             // No need to unfreeze here, gameover sequence will take over
         });
     }

     // --- Spawning ---
     enemyWave() {
         if (this.waveCount >= this.stageEnemyPositionList.length) {
             if (!this.boss) { // Spawn boss only if not already present
                 this.bossAdd();
             }
         } else {
             this.spawnEnemyRow(this.stageEnemyPositionList[this.waveCount]);
             this.waveCount++;
         }
     }

     spawnEnemyRow(rowData) {
         rowData.forEach((enemyCode, index) => {
             if (enemyCode !== "00" && typeof enemyCode === 'string') {
                 const typeId = enemyCode.substring(0, 1);
                 const itemCode = enemyCode.substring(1); // 0, 1, 2, 3, 9 etc.
                 const enemyKey = `enemy${typeId}`;
                 const enemyDataTemplate = globals.resources.recipe?.data?.enemyData?.[enemyKey];

                 if (enemyDataTemplate) {
                     const enemyData = { ...enemyDataTemplate }; // Clone data
                     enemyData.explosion = this.explosionTextures; // Add textures

                     // Determine item drop
                     switch (itemCode) {
                         case '1': enemyData.itemName = SHOOT_MODES.BIG; break;
                         case '2': enemyData.itemName = SHOOT_MODES.THREE_WAY; break;
                         case '3': enemyData.itemName = SHOOT_SPEEDS.HIGH; break;
                         case '9': enemyData.itemName = ITEM_TYPES.BARRIER; break;
                         default:  enemyData.itemName = null;
                     }
                     if (enemyData.itemName) {
                         enemyData.itemTexture = this.itemTextures[enemyData.itemName];
                     } else {
                         enemyData.itemTexture = null;
                     }
                     if(enemyData.tamaData?.texture && !Array.isArray(enemyData.tamaData.texture[0])) {
                         // If tamaData textures haven't been processed, do it now (fallback)
                         enemyData.tamaData.texture = this.processFrames(enemyData.tamaData.texture[0].replace(/\d+\.gif$/, ''), enemyData.tamaData.texture.length);
                     }


                     const enemy = new Enemy(enemyData);
                     enemy.position.set(32 * index + 16, -32); // Position based on index, start off-screen top
                     enemy.on(Enemy.CUSTOM_EVENT_DEAD, this.handleEnemyRemoved.bind(this)); // Listen for dead event
                     enemy.on(Enemy.CUSTOM_EVENT_DEAD_COMPLETE, this.handleEnemyCleanup.bind(this));
                     enemy.on(Enemy.CUSTOM_EVENT_TAMA_ADD, this.handleEnemyShoot.bind(this));

                     this.unitContainer.addChild(enemy);
                     this.enemies.push(enemy);
                 } else {
                      console.warn(`Enemy data not found for key: ${enemyKey}`);
                 }
             }
         });
     }

     bossAdd() {
        if (this.boss) return; // Already added

        Utils.dlog("Adding Boss for stage:", gameState.stageId);
        this.enemyWaveFlg = false; // Stop normal waves
        this.stageBg.bossScene(); // Transition background

        let bossDataKey = `boss${gameState.stageId}`;
        let BossClass = null;
        let isGokiReplacement = false;

        // Special Goki appearance logic
        if (gameState.stageId === 3 && gameState.continueCnt === 0) {
             bossDataKey = 'boss3'; // Vega data first
             BossClass = BossVega;
             isGokiReplacement = true; // Flag to spawn Goki later
             Utils.dlog("Spawning Vega (pre-Goki)");
        } else {
             // Normal boss selection
             switch (gameState.stageId) {
                case 0: BossClass = BossBison; break;
                case 1: BossClass = BossBarlog; break;
                case 2: BossClass = BossSagat; break;
                case 3: BossClass = BossVega; bossDataKey = 'boss3'; break; // Vega if continued
                case 4: BossClass = BossFang; bossDataKey = 'boss4'; break;
                default: console.error("Invalid stage ID for boss:", gameState.stageId); return;
             }
             Utils.dlog(`Spawning Boss: ${BossClass?.name || 'Unknown'}`);
        }


        let bossData = globals.resources.recipe?.data?.bossData?.[bossDataKey];
        if (!bossData || !BossClass) {
            console.error(`Boss data or class not found for key: ${bossDataKey}`);
            return;
        }

        bossData = { ...bossData }; // Clone data
        bossData.explosion = this.explosionTextures;
        // Add any other necessary textures (tamaData, anims - ideally pre-process)


        this.boss = new BossClass(bossData);
        this.boss.on(Boss.CUSTOM_EVENT_DEAD, this.handleBossRemoved.bind(this)); // Use base Boss event
        this.boss.on(Boss.CUSTOM_EVENT_DEAD_COMPLETE, this.handleEnemyCleanup.bind(this)); // Use generic cleanup
        this.boss.on(Boss.CUSTOM_EVENT_TAMA_ADD, this.handleEnemyShoot.bind(this));

         if (isGokiReplacement) {
             // Handle Vega -> Goki transition
             this.boss.gokiFlg = true; // Tell Vega instance it's the pre-Goki version
             this.boss.on(BossVega.CUSTOM_EVENT_GOKI, this.replaceVegaWithGoki.bind(this));
             Utils.dlog("Vega Goki flag set, listening for replacement event.");
         }

        this.unitContainer.addChild(this.boss);
        this.enemies.push(this.boss); // Add boss to the enemy list for collisions

        // Setup Boss Timer UI (delay its appearance)
         this.bossTimerText = new PIXI.Sprite(globals.resources.game_ui.textures["timeTxt.gif"]);
         this.bossTimerText.position.set(Constants.GAME_DIMENSIONS.CENTER_X - this.bossTimerText.width, 58);
         this.bossTimerText.alpha = 0;
         this.hudContainer.addChild(this.bossTimerText); // Add to HUD container

         this.bossTimerDisplay = new BigNumberDisplay(2); // 2 digits for timer
         this.bossTimerDisplay.position.set(this.bossTimerText.x + this.bossTimerText.width + 3, this.bossTimerText.y - 2);
         this.bossTimerDisplay.setNum(this.bossTimerCountDown);
         this.bossTimerDisplay.alpha = 0;
         this.hudContainer.addChild(this.bossTimerDisplay);

         // Animate timer UI in after a delay
         TweenMax.to([this.bossTimerDisplay, this.bossTimerText], 0.2, {
             delay: this.boss.appearDuration || 6.0, // Use boss appear time or default
             alpha: 1,
             onComplete: () => {
                 this.bossTimerStartFlg = true;
                 this.bossTimerFrameCnt = 0; // Reset timer frame count
             }
         });
    }

     replaceVegaWithGoki() {
         Utils.dlog("Replacing Vega with Goki!");
         const currentVega = this.boss;
         if (!currentVega || currentVega.name !== 'vega') return; // Safety check

         this.theWorldFlg = true; // Freeze during transition
         this.hud.caBtnDeactive();
         currentVega.tlShoot?.pause(); // Pause Vega's actions

          // Stop player bullets
         this.playerBullets.forEach(b => this.removePlayerBullet(b, -1));

         // Goki's intro animation/sequence (from original code)
         const gokiBossData = { ...globals.resources.recipe.data.bossData.bossExtra }; // Goki is 'bossExtra'
         gokiBossData.explosion = this.explosionTextures;
         // Pre-process Goki anim/tama textures if needed

         const goki = new BossGoki(gokiBossData);
         goki.on(Boss.CUSTOM_EVENT_DEAD, this.handleBossRemoved.bind(this));
         goki.on(Boss.CUSTOM_EVENT_DEAD_COMPLETE, this.handleEnemyCleanup.bind(this));
         goki.on(Boss.CUSTOM_EVENT_TAMA_ADD, this.handleEnemyShoot.bind(this));

         // Position Goki off-screen initially? Or at Vega's spot?
         goki.position.copyFrom(currentVega.position);
         goki.alpha = 0; // Start invisible
         this.unitContainer.addChild(goki);


         const tl = new TimelineMax();
         tl.addCallback(() => goki.toujou()) // Play Goki's intro sound
           .to(currentVega, 1.0, { // Fade out Vega
               alpha: 0,
               onComplete: () => {
                   const index = this.enemies.indexOf(currentVega);
                   if (index > -1) this.enemies.splice(index, 1);
                   this.unitContainer.removeChild(currentVega);
                   currentVega.destroy(); // Clean up Vega
               }
           })
           .to(goki, 0.5, { alpha: 1 }, "-=0.5") // Fade in Goki
           .addCallback(() => {
                 this.boss = goki; // Set Goki as the current boss
                 this.enemies.push(this.boss); // Add Goki to collision list
                 this.theWorldFlg = false; // Unfreeze game
                 this.hud.caBtnActive();
                 goki.shootStart(); // Start Goki's attack patterns

                 // Switch BGM
                 Sound.stop(this.stageBgmName); // Stop Vega BGM
                 const gokiBgmInfo = Constants.BGM_INFO.boss_goki_bgm;
                 if (gokiBgmInfo) {
                     this.stageBgmName = gokiBgmInfo.name;
                     Sound.bgmPlay(gokiBgmInfo.name, gokiBgmInfo.start / 48, gokiBgmInfo.end / 48);
                 }
           }, "+=0.5"); // Delay before unfreezing

     }

    // --- Event Handlers ---
     handlePlayerShoot(bulletsData) {
        bulletsData.forEach(data => {
            const bullet = new Bullet(data);
            bullet.position.set(this.player.x + data.startX, this.player.y + data.startY);
            bullet.rotation = data.rotation; // Set initial rotation

            // Listen for bullet death to remove it
            bullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => {
                 const index = this.playerBullets.indexOf(bullet);
                 if (index > -1) {
                     this.removePlayerBullet(bullet, index);
                 } else {
                      // Bullet might already be removed, log warning if needed
                      // Utils.dlog("Attempted to remove already removed player bullet:", bullet.id);
                 }
            });

            this.bulletContainer.addChild(bullet);
            this.playerBullets.push(bullet);
        });
    }

    handleEnemyShoot(enemyContext) {
         const tamaData = { ...enemyContext.tamaData }; // Clone base data
         if (!tamaData || !tamaData.texture) return; // No bullet data

         tamaData.explosion = this.explosionTextures; // Add explosion effect

         // Specific bullet spawning logic based on enemy/tama name
         switch (tamaData.name) {
            case 'beam': // FANG beam
                // Needs special handling for rotation and positioning based on 'cnt'
                 const beamCount = tamaData.cnt = (tamaData.cnt === undefined ? 0 : (tamaData.cnt + 1) % 3); // Cycle 0, 1, 2
                 const angles = [105, 90, 75]; // Angles in degrees
                 const offsets = [{ x: 121, y: 50 }, { x: 141, y: 50 }]; // Emitter points
                 const hitAreas = [ // Define hit areas relative to anchor (0.5)
                     new PIXI.Rectangle(-1.35 * tamaData.texture[0].height, -10, tamaData.texture[0].height, tamaData.texture[0].width / 2), // 105 deg
                     new PIXI.Rectangle(-0.5 * tamaData.texture[0].height, 0, tamaData.texture[0].height, tamaData.texture[0].width / 2), // 90 deg
                     new PIXI.Rectangle(-0.15 * tamaData.texture[0].height, -5, tamaData.texture[0].height, tamaData.texture[0].width / 2) // 75 deg
                 ];

                 offsets.forEach(offset => {
                     const bullet = new Bullet(tamaData);
                     const angleRad = angles[beamCount] * Math.PI / 180;
                     bullet.character.rotation = angleRad; // Rotate the visual sprite
                     bullet.rotation = angleRad; // Store for movement logic if not using rotX/Y
                     bullet.rotX = Math.cos(angleRad); // Store for beam movement
                     bullet.rotY = Math.sin(angleRad);
                     bullet.position.set(enemyContext.x + offset.x, enemyContext.y + offset.y);
                     // Apply specific hit area AFTER creating bullet
                     bullet.unit.hitArea = hitAreas[beamCount].clone();

                     bullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => this.removeEnemyBulletById(bullet.id));
                     this.bulletContainer.addChild(bullet);
                     this.enemyBullets.push(bullet);
                 });
                 break;
             case 'smoke': // FANG smoke
                  const smokeAngle = (60 * Math.random() + 60) * Math.PI / 180; // Random angle 60-120 deg
                  const smokeBullet = new Bullet(tamaData);
                  smokeBullet.unit.hitArea = new PIXI.Rectangle(-smokeBullet.character.width/2 + 20, -smokeBullet.character.height/2 + 20, smokeBullet.character.width - 40, smokeBullet.character.height - 40);
                  smokeBullet.rotX = Math.cos(smokeAngle);
                  smokeBullet.rotY = Math.sin(smokeAngle);
                  smokeBullet.position.set(enemyContext.x + enemyContext.unit.width / 2 - 50, enemyContext.y + 45); // Adjust start pos
                  smokeBullet.character.loop = false;
                  smokeBullet.character.onComplete = () => smokeBullet.character.gotoAndPlay(6); // Loop end animation

                  smokeBullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => this.removeEnemyBulletById(bullet.id));
                  this.bulletContainer.addChild(smokeBullet);
                  this.enemyBullets.push(smokeBullet);
                 break;
            case 'meka': // FANG meka swarm
                 const numMekas = 32;
                 for (let i = 0; i < numMekas; i++) {
                     const mekaBullet = new Bullet(tamaData);
                     mekaBullet.start = 10 * i; // Stagger start time
                     mekaBullet.playerRef = this.player; // Give reference for targeting
                     mekaBullet.position.set(enemyContext.x + enemyContext.unit.hitArea.x + enemyContext.unit.hitArea.width / 2,
                                           enemyContext.y + enemyContext.unit.hitArea.y + enemyContext.unit.hitArea.height);
                     mekaBullet.scale.set(0); // Start scaled down

                     const targetX = enemyContext.x + enemyContext.unit.hitArea.x + Math.random() * (enemyContext.unit.hitArea.width);
                     const targetY = enemyContext.y + enemyContext.unit.hitArea.y + Math.random() * enemyContext.unit.hitArea.height;

                     TweenMax.to(mekaBullet, 0.3, { x: targetX, y: targetY, delay: i * 0.01 }); // Initial spread
                     TweenMax.to(mekaBullet.scale, 0.3, { x: 1, y: 1, delay: i * 0.01 });

                     mekaBullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => this.removeEnemyBulletById(bullet.id));
                     this.bulletContainer.addChild(mekaBullet);
                     this.enemyBullets.push(mekaBullet);
                 }
                 break;
            case 'psychoField': // VEGA field
                 const numFieldBullets = 72;
                 const radius = 50;
                 for (let i = 0; i < numFieldBullets; i++) {
                     const fieldBullet = new Bullet(tamaData);
                     const angle = (i / numFieldBullets) * 360 * Math.PI / 180;
                     fieldBullet.rotX = Math.cos(angle);
                     fieldBullet.rotY = Math.sin(angle);
                     fieldBullet.position.set(
                         enemyContext.x + enemyContext.unit.hitArea.width / 2 + radius * fieldBullet.rotX,
                         enemyContext.y + enemyContext.unit.hitArea.height / 2 + radius * fieldBullet.rotY
                     );
                      fieldBullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => this.removeEnemyBulletById(bullet.id));
                     this.bulletContainer.addChild(fieldBullet);
                     this.enemyBullets.push(fieldBullet);
                 }
                 break;

            default: // Standard enemy bullet
                const bullet = new Bullet(tamaData);
                 // Position relative to the enemy that fired it
                 bullet.position.set(
                     enemyContext.x + enemyContext.unit.hitArea.x + enemyContext.unit.hitArea.width / 2 - bullet.unit.width / 2,
                     enemyContext.y + enemyContext.unit.hitArea.y + enemyContext.unit.hitArea.height / 2 // Center Y? Or bottom?
                 );
                 // Determine bullet direction (e.g., towards player or straight down)
                 bullet.rotation = 90 * Math.PI / 180; // Straight down
                 bullet.speed = tamaData.speed || 3; // Use default speed if not specified

                 bullet.on(Bullet.CUSTOM_EVENT_DEAD_COMPLETE, () => this.removeEnemyBulletById(bullet.id));
                 this.bulletContainer.addChild(bullet);
                 this.enemyBullets.push(bullet);
                 break;
         }
    }

    handleEnemyRemoved(enemy, index = -1) { // Called on Enemy.CUSTOM_EVENT_DEAD
        if (!enemy) return;

        // Add score, combo, CA gauge
        this.hud.comboCount += 1; // Use increment setter
        this.hud.scoreCount += enemy.score; // Use increment setter (handles ratio)
        this.hud.cagageCount += enemy.cagage; // Use increment setter
        this.hud.scoreView(enemy); // Show score popup

        // Drop item
        const item = enemy.dropItem();
        if (item) {
             this.unitContainer.addChild(item);
             this.items.push(item);
        }

         // The enemy object itself is not removed from the array or stage yet.
         // This happens in handleEnemyCleanup after the death animation.
    }

    handleEnemyCleanup(enemy) { // Called on Enemy.CUSTOM_EVENT_DEAD_COMPLETE
         const index = this.enemies.indexOf(enemy);
         if (index > -1) {
             this.removeEnemy(enemy, index);
         }
         if (enemy === this.boss) {
             // Boss defeated - trigger stage clear sequence
             this.bossDefeated();
         }
    }

    handleBossRemoved(bossInstance) { // Called on Boss.CUSTOM_EVENT_DEAD
         if (!bossInstance) return;
         this.theWorldFlg = true; // Freeze game during boss death sequence
         this.bossTimerStartFlg = false; // Stop timer

         // Give final score/CA bonus
         this.hud.comboCount += 1;
         this.hud.scoreCount += bossInstance.score;
         this.hud.cagageCount += bossInstance.cagage;
         this.hud.scoreView(bossInstance);
         this.hud.caBtnDeactive(true); // Deactivate CA button permanently for the stage

         // Stop player shooting and clear bullets
         if (this.player) this.player.shootStop();
         this.playerBullets.forEach(b => this.removePlayerBullet(b, -1));
         this.enemyBullets.forEach(b => this.removeEnemyBullet(b, -1));

          // Boss death animation is handled within the Boss class 'dead' method
          // We wait for CUSTOM_EVENT_DEAD_COMPLETE (handled by handleEnemyCleanup)
          // to trigger the stage clear sequence.
    }

     bossDefeated() {
        // Called from handleEnemyCleanup when the boss's DEAD_COMPLETE event fires
        Utils.dlog("Boss Defeated - Stage Clear Sequence Start");

        // Ensure timer UI is removed
        if (this.bossTimerDisplay) this.hudContainer.removeChild(this.bossTimerDisplay);
        if (this.bossTimerText) this.hudContainer.removeChild(this.bossTimerText);
        this.bossTimerDisplay = null;
        this.bossTimerText = null;


        // Show Stage Clear / K.O. overlays
        TweenMax.delayedCall(0.5, () => { // Short delay after explosion finishes
            if (this.hud.caFireFlg) { // Check if CA was the finishing blow
                this.stageBg.akebonofinish();
                this.titleOverlay.akebonofinish();
                gameState.akebonoCnt++;
            } else {
                this.titleOverlay.stageClear(); // Normal stage clear text
            }
        });


        // Delay transition to next scene/result
        TweenMax.delayedCall(3.0, () => { // Wait longer after clear text appears
            this.stageClear();
        });
     }

    // --- Removals ---
    removeEntity(entity, list, index) {
        if (!entity) return;
        // Remove listeners first
        entity.removeAllListeners();
         // Remove from PIXI container
         if (entity.parent) {
             entity.parent.removeChild(entity);
         }
         // Remove from internal list if index is valid
         if (index > -1 && list[index] === entity) {
            list.splice(index, 1);
         }
         // Destroy the entity to free memory
         entity.destroy({ children: true });
    }

     removeEnemy(enemy, index) {
        this.removeEntity(enemy, this.enemies, index);
     }

     removeItem(item, index) {
        this.removeEntity(item, this.items, index);
     }

     removePlayerBullet(bullet, index) {
         this.removeEntity(bullet, this.playerBullets, index);
     }

     removeEnemyBullet(bullet, index) {
         this.removeEntity(bullet, this.enemyBullets, index);
     }
     // Helper to remove by ID if index is unknown (e.g., from event)
     removeEnemyBulletById(id) {
         const index = this.enemyBullets.findIndex(b => b.id === id);
         if (index > -1) this.removeEnemyBullet(this.enemyBullets[index], index);
     }


    // --- Game State Changes ---
     playerDamage(amount) {
         if (this.player && !this.player.deadFlg) {
             // Screen shake effect
             const shakeIntensity = 4;
             const shakeDuration = 0.05;
             new TimelineMax()
                 .to(this, shakeDuration, { x: shakeIntensity, y: -shakeIntensity/2 })
                 .to(this, shakeDuration, { x: -shakeIntensity/2, y: shakeIntensity })
                 .to(this, shakeDuration, { x: shakeIntensity/2, y: -shakeIntensity })
                 .to(this, shakeDuration, { x: -shakeIntensity, y: shakeIntensity/2 })
                 .to(this, shakeDuration, { x: 0, y: 0 }); // Return to center

             this.player.onDamage(amount);
             this.hud.onDamage(this.player.percent); // Update HUD HP bar
         }
     }

     caFire() {
        if (this.theWorldFlg || !this.hud.cagageFlg) return; // Prevent CA during freeze or if not ready

        Utils.dlog("CA Fire!");
        this.theWorldFlg = true;
        this.hud.caFireFlg = true; // Mark that CA is active
        if (this.boss) this.boss.onTheWorld(true); // Freeze boss
        if (this.player) this.player.shootStop(); // Stop player shooting

        // Clear existing bullets (optional, depends on design)
        this.playerBullets.forEach(b => this.removePlayerBullet(b, -1));
        // Consider clearing enemy bullets too?
        // this.enemyBullets.forEach(b => this.removeEnemyBullet(b, -1));

        // Show Cutin
        this.overlayContainer.addChild(this.cutinCont);
        this.cutinCont.start();

        // Setup CA Line graphic
        if (!this.caLine) {
            this.caLine = new PIXI.Graphics()
                .beginFill(0xFF0000) // Red
                .drawRect(-1.5, 0, 3, 1) // Start as thin line at pivot
                .endFill();
            this.caLine.pivot.y = 0; // Pivot at the top
        }
        this.caLine.scale.y = 1; // Reset scale
        this.caLine.position.set(this.player.x, this.player.y); // Start at player
        this.overlayContainer.addChild(this.caLine);


        // CA Timeline
        const tl = new TimelineMax();
        tl.addCallback(() => Sound.play('g_ca_voice'), 0.2)
          .addCallback(() => { // Remove cutin after it finishes
              if (this.cutinCont.parent) this.overlayContainer.removeChild(this.cutinCont);
          }, 1.9) // Matches original delay calculation (0.2 + 1.7)
          .to(this.caLine.scale, 0.3, { // Expand line upwards
              y: Constants.GAME_DIMENSIONS.HEIGHT * 2, // Make sure it covers screen
              ease: Power1.easeIn // Fast expansion
          }, 1.9) // Start expanding after cutin removal
           .addCallback(() => Sound.play('se_ca'), "<") // Play sound as line expands
          .to(this.caLine, 0.1, { alpha: 0 }, "+=0.1") // Quickly fade line
          .addCallback(() => { // Start explosions slightly before line fades
                this.triggerCAExplosions();
                this.applyCADamage();
          }, "-=0.05")
          .addCallback(() => { // Cleanup and unfreeze
                if (this.caLine.parent) this.overlayContainer.removeChild(this.caLine);
                this.theWorldFlg = false;
                this.hud.caFireFlg = false;
                 // Resume boss only if it's still alive
                if (this.boss && this.boss.hp > 0) {
                    this.boss.onTheWorld(false);
                }
                // Don't restart player shooting here, maybe resume on user input?
          }, "+=1.0"); // Total duration approx 1.9 + 0.3 + 1.0 = 3.2s

        // Reset HUD CA gauge
         this.hud.cagageCount = 0;
     }

    triggerCAExplosions() {
         const numExplosions = 64;
         const explosionsPerRow = 8;
         const explosionWidth = 30;
         const explosionHeight = 45;
         const startY = Constants.GAME_DIMENSIONS.HEIGHT - 120;

         for (let i = 0; i < numExplosions; i++) {
             const row = Math.floor(i / explosionsPerRow);
             const col = i % explosionsPerRow;
             const offsetX = (row % 2 === 0) ? -explosionWidth/2 : -explosionWidth; // Stagger rows
             const posX = col * explosionWidth + offsetX;
             const posY = startY - row * explosionHeight;

             const explosion = new PIXI.AnimatedSprite(this.caExplosionTextures);
             explosion.animationSpeed = 0.2;
             explosion.loop = false;
             explosion.anchor.set(0.5);
             explosion.position.set(posX, posY);
             explosion.onComplete = () => explosion.destroy(); // Auto-destroy

             // Delay start of each explosion
             TweenMax.delayedCall(i * 0.01, () => {
                 this.overlayContainer.addChild(explosion); // Add to overlay container
                 explosion.play();
                 if (i % 16 === 0) Sound.play('se_ca_explosion'); // Play sound periodically
             });
         }
     }

     applyCADamage() {
         const damageAmount = gameState.caDamage;
         const targets = [...this.enemies]; // Damage all current enemies

         targets.forEach((enemy, index) => {
             // Check if enemy is on screen and alive
             if (enemy && !enemy.deadFlg && enemy.parent) {
                 const bounds = enemy.getBounds();
                 if (bounds.y + bounds.height > 20 && bounds.y < Constants.GAME_DIMENSIONS.HEIGHT &&
                     bounds.x + bounds.width > 0 && bounds.x < Constants.GAME_DIMENSIONS.WIDTH)
                 {
                     // Apply damage with slight delay for effect
                     TweenMax.delayedCall(index * 0.005, () => {
                         if (enemy && !enemy.deadFlg) { // Double check enemy is still valid
                             enemy.onDamage(damageAmount);
                             // Check if enemy died AFTER applying damage
                             if (enemy.hp <= 0) {
                                 this.handleEnemyRemoved(enemy);
                             }
                         }
                     });
                 }
             }
         });
     }

    stageClear() {
        Utils.dlog("GameScene.stageClear()");
        if (this.theWorldFlg && this.sceneSwitch !== 0) return; // Already transitioning

        this.theWorldFlg = true; // Prevent further updates
        this.sceneSwitch = 1; // Mark for transitioning to next stage/adv

        // Store player state for next stage
        gameState.playerHp = this.player.hp;
        gameState.cagage = this.hud.cagageCount;
        gameState.score = this.hud.scoreCount;
        gameState.combo = this.hud.comboCount; // Store current combo? Original didn't seem to.
        gameState.maxCombo = this.hud.maxCombCount; // Store max combo
        gameState.shootMode = this.player.shootMode;
        gameState.shootSpeed = this.player.shootSpeedBoost === 0 ? SHOOT_SPEEDS.NORMAL : SHOOT_SPEEDS.HIGH;


        if (this.player) this.player.shootStop();
        this.hud.caBtnDeactive(true); // isClear = true

        saveHighScore(); // Save potentially new high score

        // Wait for animations, then switch scene
        TweenMax.delayedCall(2.3, () => { // Matches original delay
             gameState.stageId++; // Increment stage ID *before* switching
             this.switchScene(Constants.SCENE_NAMES.ADV, AdvScene); // Go to adventure scene
        });
    }

    gameover() { // Called on Player.CUSTOM_EVENT_DEAD
        Utils.dlog("GameScene.gameover()");
        if (this.theWorldFlg) return; // Already in gameover sequence

        this.theWorldFlg = true;
        this.sceneSwitch = 0; // Mark for transitioning to continue/gameover

        gameState.score = this.hud.scoreCount; // Store final score
        gameState.maxCombo = this.hud.maxCombCount; // Store max combo
        this.hud.caBtnDeactive();
        if (this.boss) this.boss.onTheWorld(true); // Freeze boss
        if (this.player) this.player.detachInputListeners(); // Stop player input
        this.inputLayer.interactive = false; // Disable screen input layer

        saveHighScore();

        // Player death animation is handled within Player class
        // Wait for Player.CUSTOM_EVENT_DEAD_COMPLETE before switching scene
    }

    gameoverComplete() { // Called on Player.CUSTOM_EVENT_DEAD_COMPLETE
        Utils.dlog("GameScene.gameoverComplete() - Switching Scene");
        // Boss should already be frozen from gameover()
        // Remove player graphic explicitly? Player.destroy handles internals.
        // if (this.player && this.player.parent) this.unitContainer.removeChild(this.player);

        TweenMax.delayedCall(1.0, () => { // Shorter delay after player explosion finishes
             this.switchScene(Constants.SCENE_NAMES.LOAD, ContinueScene); // Go to Continue/GameOver scene
        });
    }

     timeover() {
         Utils.dlog("GameScene.timeover()");
         if (this.theWorldFlg) return; // Already ending

         this.theWorldFlg = true;
         this.sceneSwitch = 0; // Go to continue/gameover screen

         gameState.score = this.hud.scoreCount;
         gameState.maxCombo = this.hud.maxCombCount;
         this.hud.caBtnDeactive();
         if (this.boss) this.boss.onTheWorld(true);
         if (this.player) this.player.detachInputListeners();
         this.inputLayer.interactive = false;

         saveHighScore();

         this.titleOverlay.timeover(); // Show "TIME OVER"

         // Fade out player and switch scene
         TweenMax.to(this.player, 0.5, {
             alpha: 0,
             delay: 1.5, // Wait a bit after "TIME OVER" appears
             onComplete: () => {
                  this.switchScene(Constants.SCENE_NAMES.LOAD, ContinueScene);
             }
         });
     }

    // Override destroy for thorough cleanup
    destroy(options) {
        Utils.dlog(`Destroying GameScene - Stage ${gameState.stageId}`);
        // Stop all sounds associated with this scene
        if (this.stageBgmName) Sound.stop(this.stageBgmName);

        // Kill all tweens targetting objects in this scene
        TweenMax.killTweensOf(this);
        if(this.player) TweenMax.killTweensOf(this.player);
        if(this.boss) TweenMax.killTweensOf(this.boss);
        // etc. for other animated elements

         // Ensure player listeners are removed
         if (this.player) {
            this.player.detachInputListeners();
            // Player destroy called by PIXI cascade
         }
         if (this.inputLayer) {
            this.inputLayer.off('pointerdown');
            this.inputLayer.off('pointermove');
            this.inputLayer.off('pointerup');
            this.inputLayer.off('pointerupoutside');
            // InputLayer destroy called by PIXI cascade
         }


        // Clear arrays
        this.enemies = [];
        this.items = [];
        this.playerBullets = [];
        this.enemyBullets = [];
        this.stageEnemyPositionList = [];

         // Nullify references
        this.player = null;
        this.hud = null;
        this.stageBg = null;
        this.titleOverlay = null;
        this.cutinCont = null;
        this.cover = null;
        this.boss = null;
        this.bossTimerDisplay = null;
        this.bossTimerText = null;
        this.caLine = null;
        this.inputLayer = null;


        // Call base destroy, which handles children
        super.destroy(options);
    }
}
```

**10. UI Components (`ui/` directory)**

Create separate files for each UI component (`HowtoButton.js`, `StaffrollButton.js`, `StartButton.js`, `HUD.js`, etc.) following the pattern:

```javascript
// Example: ui/StartButton.js (Original 'jt')
import { BaseCast } from '../BaseCast.js'; // Adjust path as needed
import * as Constants from '../constants.js';
import * as Sound from '../soundManager.js';

export class StartButton extends BaseCast {
    constructor() {
        super(); // BaseCast doesn't take ID here

        this.img = new PIXI.Sprite(globals.resources.game_ui.textures["titleStartText.gif"]);
        this.img.anchor.set(0.5);
        this.img.position.set(Constants.GAME_DIMENSIONS.CENTER_X, 330);
        this.addChild(this.img);

        this.flashCover = new PIXI.Graphics()
            .beginFill(0xFFFFFF, 1)
            .drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT - 120) // Adjust height?
            .endFill();
        this.flashCover.alpha = 0;
        this.addChild(this.flashCover);

        this.interactive = true;
        this.buttonMode = true;
        this.hitArea = new PIXI.Rectangle(0, 50, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT - 170); // Original hit area

        this.tl = null; // For animation timeline

        // Bind methods
        this.onOver = this.onOver.bind(this);
        this.onOut = this.onOut.bind(this);
        this.onDown = this.onDown.bind(this);
        this.onUp = this.onUp.bind(this); // This will likely be overridden or handled by the scene
    }

    onOver(event) {
        this.img.scale.set(1.05);
    }

    onOut(event) {
        this.img.scale.set(1.0);
    }

    onDown(event) {
        // No visual change in original code, maybe add one?
    }

    onUp(event) {
        // Scene's pointerup handler will manage the action
        TweenMax.killTweensOf(this.flashCover); // Stop any previous flash
        Sound.play('se_decision');
        this.flash(); // Trigger flash effect
        // Do NOT switch scene here, let the TitleScene handle it
    }

    flash() {
        this.flashCover.alpha = 0.3;
        TweenMax.to(this.flashCover, 1.5, { alpha: 0 });
    }

    startFlashingAnimation() {
         if(this.tl) this.tl.kill(); // Ensure previous animation is stopped
         this.tl = new TimelineMax({ repeat: -1, yoyo: true });
         this.tl.to(this.img, 0.3, { delay: 0.1, alpha: 0 })
               .to(this.img, 0.8, { alpha: 1 });
    }

    stopFlashingAnimation() {
        if (this.tl) {
            this.tl.kill();
            this.tl = null;
        }
        this.img.alpha = 1; // Ensure it's visible
    }


    castAdded() {
        this.on('pointerover', this.onOver);
        this.on('pointerout', this.onOut);
        this.on('pointerdown', this.onDown);
        this.on('pointerupoutside', this.onOut);
        // pointerup is handled by the scene calling this button

        this.startFlashingAnimation();
    }

    castRemoved() {
        this.stopFlashingAnimation();
        this.off('pointerover', this.onOver);
        this.off('pointerout', this.onOut);
        this.off('pointerdown', this.onDown);
        this.off('pointerupoutside', this.onOut);
        // No need to remove pointerup listener if it wasn't added here
    }

     // Override destroy
     destroy(options) {
         this.stopFlashingAnimation();
         // Listeners removed automatically by PIXI on destroy
         super.destroy(options);
     }
}
```

*(Repeat this pattern for `HowtoButton`, `StaffrollButton`, `TwitterButton`, `BigNumberDisplay`, `HUD`, etc.)*

**11. Boss Classes (`bosses/` directory)**

Create a base `Boss.js` and then specific boss files.

```javascript
// bosses/Boss.js (Base class, refactored from 'Ze')
import { BaseUnit } from '../BaseUnit.js';
import * as Constants from '../constants.js';
import { gameState } from '../gameState.js';
import { globals } from '../globals.js';
import * as Sound from '../soundManager.js';

export class Boss extends BaseUnit {
    constructor(data, animFrames, explosionFrames) {
         // Ensure animFrames.idle exists and is an array
        const idleFrames = animFrames?.idle?.map(frame => PIXI.Texture.from(frame));
        if (!idleFrames || idleFrames.length === 0) {
             console.error("Boss idle animation frames are missing!");
             // Provide fallback frames?
         }
         const explosion = explosionFrames?.map(frame => PIXI.Texture.from(frame));

        super(idleFrames || [], explosion); // Pass processed frames

        this.bossName = data.name; // Use different property to avoid collision
        this.unit.name = "boss"; // Generic identifier
        this.interval = data.interval; // Attack interval
        this.score = data.score;
        this.hp = data.hp;
        this.cagage = data.cagage;
        this.animList = {}; // Store all animations
        this.tamaData = data.tamaData; // Data for bullets

        // Pre-process all animation frames passed in animFrames object
        for (const key in animFrames) {
            if (Array.isArray(animFrames[key])) {
                this.animList[key] = animFrames[key].map(frame => PIXI.Texture.from(frame));
            }
        }
        // Pre-process tamaData textures if necessary
        if (this.tamaData?.texture && typeof this.tamaData.texture[0] === 'string') {
             this.tamaData.texture = this.tamaData.texture.map(frame => PIXI.Texture.from(frame));
             // Add explosion data to tamaData if needed by Bullet class
             if(explosion) this.tamaData.explosion = explosion;
        }


        this.dengerousBalloon = null; // Create if textures exist
        const dangerFrames = [];
        for (let i = 0; i < 3; i++) {
            const tex = globals.resources.game_ui?.textures[`boss_dengerous${i}.gif`];
            if (tex) dangerFrames.push(tex);
        }
        if (dangerFrames.length > 0) {
            this.dengerousBalloon = new PIXI.AnimatedSprite(dangerFrames);
            this.dengerousBalloon.animationSpeed = 0.2;
            this.dengerousBalloon.anchor.set(0.5, 1.0); // Anchor bottom-center
            this.dengerousBalloon.scale.set(0);
            this.dengerousBalloon.visible = false;
            this.unit.addChild(this.dengerousBalloon); // Add to unit container
        }

        this.shadowReverse = data.shadowReverse !== undefined ? data.shadowReverse : true;
        this.shadowOffsetY = data.shadowOffsetY || 0;

        this.shootOn = true; // Flag to allow shooting patterns
        this.bulletFrameCnt = 0;
        this.moveFlg = false; // Controls initial entry animation
        this.deadFlg = false;
        this.dengerousFlg = false; // Controls "Danger" balloon state
        this.explotionCnt = 0; // Counter for death explosions

        // Default Boss hit area (can be overridden by subclasses)
        this.unit.hitArea = new PIXI.Rectangle(
            -this.character.width / 2 + 5, -this.character.height / 2 + 5,
            this.character.width - 10, this.character.height - 10
        );

        this.tlShoot = null; // Timeline for attack patterns
        this.appearDuration = 6.0; // Default time before timer starts

         this.updateShadowPosition();
    }

    // --- Core Logic ---
     loop(delta, stageScrollAmount) {
        if (this.deadFlg) return;
        this.bulletFrameCnt += delta * 60; // Update based on delta

        // Entry Animation
        if (this.moveFlg) {
             // Example: Move down until reaching target Y
             const targetY = Constants.GAME_DIMENSIONS.HEIGHT / 4;
             const entrySpeed = 1 * delta * 60; // Adjust speed
             this.y += entrySpeed;
             if (this.y >= targetY) {
                 this.y = targetY;
                 this.moveFlg = false;
                 this.onEntryComplete(); // Hook for subclasses
                 this.shootStart();     // Start attack patterns
             }
        }

         // Keep shadow updated
         this.updateShadowPosition();
         // Subclasses should implement specific attack patterns in their loop or shootStart methods
    }

    // To be overridden: start attack patterns
    shootStart() {
        console.warn(`shootStart() not implemented for boss: ${this.bossName}`);
    }
     // Hook for when entry animation finishes
     onEntryComplete() {}

     playAnimation(animName, loop = true) {
         if (this.animList[animName]) {
             this.character.textures = this.animList[animName];
             this.shadow.textures = this.animList[animName]; // Assuming shadow uses same anim
             this.character.loop = loop;
             this.shadow.loop = loop;
             this.character.gotoAndPlay(0);
             this.shadow.gotoAndPlay(0);
         } else {
              console.warn(`Animation not found: ${animName} for boss ${this.bossName}`);
         }
     }


    // --- State & Events ---
    onTheWorld(freeze) {
        if (freeze) {
            this.tlShoot?.pause();
            this.character?.stop();
            this.shadow?.stop();
        } else {
            // Resume only if alive and not frozen by other means
            if (this.hp > 0 && !this.deadFlg) {
                 this.tlShoot?.resume();
                 this.character?.play();
                 this.shadow?.play();
            }
        }
    }

    onDamage(amount) {
        if (this.deadFlg) return;

        this.hp -= amount;

        if (this.hp <= 0) {
            this.hp = 0; // Clamp HP
            this.dead();
        } else {
            // Damage Flash
            TweenMax.killTweensOf(this.character, { tint: true }); // Kill previous tint tween
            this.character.tint = 0xFF8080; // Lighter red tint
            TweenMax.to(this.character, 0.1, {
                 tint: 0xFFFFFF, // Back to white
                 delay: 0.2
            });

            // Show Danger Balloon if HP is low and CA is ready
            if (this.hp <= gameState.caDamage && !this.dengerousFlg && this.dengerousBalloon) {
                this.dengerousFlg = true;
                this.dengerousBalloon.visible = true;
                this.dengerousBalloon.scale.set(0); // Reset scale before animation
                this.dengerousBalloon.gotoAndPlay(0);
                TweenMax.to(this.dengerousBalloon.scale, 1, { x: 1, y: 1, ease: Elastic.easeOut });
            }
        }
    }

    dead() {
        if (this.deadFlg) return;
        this.deadFlg = true;
        this.emit(BaseUnit.CUSTOM_EVENT_DEAD, this); // Notify manager

        this.character?.stop();
        this.shadow?.stop();
        this.tlShoot?.kill(); // Stop attack patterns
        if (this.dengerousBalloon) this.dengerousBalloon.visible = false; // Hide danger balloon

        Sound.stop('se_damage'); // Stop any ongoing damage sound

        this.explotionCnt = 0;
        const numExplosions = 5; // Number of explosions in sequence

        // Trigger multiple explosions
        for (let i = 0; i < numExplosions; i++) {
            TweenMax.delayedCall(i * 0.25, this.spawnDeathExplosion.bind(this, i === numExplosions - 1));
        }

        // Screen Shake
         const startX = this.x;
         const startY = this.y;
         const shakeTl = new TimelineMax();
         for(let i=0; i<2; i++) { // Repeat shake sequence twice
            shakeTl.to(this, 0.08, { x: startX + 4, y: startY - 2 })
                   .to(this, 0.07, { x: startX - 3, y: startY + 1 })
                   .to(this, 0.05, { x: startX + 2, y: startY - 1 })
                   .to(this, 0.05, { x: startX - 2, y: startY + 1 })
                   .to(this, 0.04, { x: startX + 1, y: startY + 1 })
                   .to(this, 0.04, { x: startX, y: startY }); // Return to center briefly
        }


        // Fade out the main unit after shaking and explosions start
        TweenMax.to(this.unit, 1.0, { delay: 0.5, alpha: 0 });

        this.onDead(); // Hook for subclasses (e.g., play specific KO voice)
    }

    spawnDeathExplosion(isLast) {
         if (!this.explosion?.textures) return; // Check if explosion animation exists

         const explosion = new PIXI.AnimatedSprite(this.explosion.textures);
         explosion.scale.set(1.0); // Or adjust scale as needed
         explosion.animationSpeed = 0.15;
         explosion.loop = false;
         explosion.anchor.set(0.5);
         // Random position within hit area (relative to unit center)
         explosion.x = (Math.random() - 0.5) * this.unit.hitArea.width;
         explosion.y = (Math.random() - 0.5) * this.unit.hitArea.height;

         explosion.onComplete = () => {
            this.explosionComplete(explosion, isLast && (this.explotionCnt === 5)); // Pass flag if this is the very last one
            explosion.destroy(); // Clean up PIXI object
        };

         this.unit.addChild(explosion); // Add to boss unit container
         explosion.play();
         Sound.play('se_explosion');
    }


    explosionComplete(explosionInstance, isVeryLast) {
        // explosionInstance.destroy() // Handled by onComplete lambda
        this.explotionCnt++;

        if (isVeryLast) {
            // Hide unit container explicitly AFTER all explosions finish
             if(this.unit) this.unit.visible = false;
             this.visible = false; // Hide the whole boss container
            this.emit(BaseUnit.CUSTOM_EVENT_DEAD_COMPLETE, this); // Notify manager ONLY after last explosion
        }
    }

    // Hook for subclasses
    onDead() {}

    castAdded() {
        super.castAdded(); // BaseUnit castAdded
        this.unit.alpha = 1; // Ensure visible
        this.unit.visible = true;
        this.visible = true;
        this.deadFlg = false; // Reset flags
        this.dengerousFlg = false;
        this.hp = this.hp || 100; // Reset HP if needed

        // Start entry animation
        this.x = Constants.GAME_DIMENSIONS.CENTER_X;
        this.y = -this.character.height; // Start off-screen top
        this.moveFlg = true;

        if(this.dengerousBalloon) {
             this.dengerousBalloon.visible = false; // Ensure balloon is hidden initially
             this.dengerousBalloon.stop();
        }
    }

    castRemoved() {
        this.tlShoot?.kill(); // Kill timelines on removal
        // Let BaseUnit handle sprite destruction via its destroy method
        super.castRemoved();
    }

     // Override destroy for thorough cleanup
     destroy(options) {
         if (this.tlShoot) {
            this.tlShoot.kill();
            this.tlShoot = null;
         }
         if (this.dengerousBalloon) {
             // Destroy called by PIXI cascade if it's a child of unit
             this.dengerousBalloon = null;
         }
         // animList textures are managed by PIXI loader cache, don't destroy here
         this.animList = {};
         this.tamaData = null;

         super.destroy(options); // Call BaseUnit destroy
     }
}
```

*(Create specific boss files like `BossBison.js`, `BossGoki.js` extending `Boss.js` and implementing their unique `loop`, `shootStart`, animation methods, and `onDead` hooks.)*

**12. `Manager.js` (Original 'jn')**

```javascript
// Manager.js (Original 'jn')
import { LoadScene } from './LoadScene.js';
import { globals } from './globals.js';
import { HitTester } from './HitTester.js';

export class Manager {
    constructor(pixiApp) {
        globals.pixiApp = pixiApp;
        globals.gameManager = this; // Set global reference

        // Setup Interaction Manager using the app's renderer
        globals.interactionManager = pixiApp.renderer.plugins.interaction;
        // Apply custom hit testing IF PIXI version allows/needs it.
        // Modern PIXI interaction might handle this differently. Check PIXI docs.
        // For older PIXI v4 style:
        if (globals.interactionManager.hitTest) {
             globals.interactionManager.hitTest = HitTester.hitTestFunc;
             console.log("Applied custom hitTest function.");
        } else {
             console.warn("Could not override interaction manager hitTest method.");
        }


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
             // Destroy should be called automatically via 'removed' event in BaseScene
             // this.currentScene.destroy({ children: true });
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
```

**13. `App.js` (Main Application Class)**

```javascript
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
```

**14. `index.js` (Entry Point)**

```javascript
// index.js or main.js
import { App } from './App.js';

// Ensure PIXI and GSAP are loaded before this runs

// Wait for the DOM to be ready (optional but good practice)
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
```

**To Use This Refactoring:**

1.  **Save Files:** Create the specified `.js` files (and subdirectories like `ui/`, `bosses/`) and paste the corresponding code into them.
2.  **Complete TODOs:** Fill in the missing `RESOURCE_PATHS` in `constants.js`. Complete the refactoring for all the UI components and Boss classes following the examples.
3.  **HTML:** Ensure you have an HTML file (`index.html`) that includes the PIXI.js library, GSAP (TweenMax), jQuery (if needed), and your entry point script (`index.js` or `main.js`) declared as `type="module"`. You also need a `<div id="canvas"></div>`.
4.  **Module Bundler (Recommended):** For a real project, use a bundler like Webpack, Rollup, or Parcel. This handles dependencies, optimizations, and browser compatibility. You'd configure the bundler with `index.js` as the entry point.
5.  **Serve:** Serve the HTML file using a local web server (like `live-server` for Node.js, or Python's `http.server`). You cannot run ES6 modules directly from the `file:///` protocol.

This refactoring provides a much clearer structure. Remember to complete the remaining class implementations based on the provided examples.