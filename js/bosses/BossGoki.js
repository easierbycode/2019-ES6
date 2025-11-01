// bosses/BossGoki.js
import { Boss } from './Boss.js';
import * as Constants from '../constants.js';
import * as Sound from '../soundManager.js';
import { gameState } from '../gameState.js';
import { globals } from '../globals.js';

export class BossGoki extends Boss {
    constructor(data) {
        const animFrames = {
            idle: data.anim.idle,
            syngoku: data.anim.syngoku, // Ashura Senku / Shun Goku Satsu startup/travel
            syngokuFinish: data.anim.syngokuFinish, // Finish pose normal
            syngokuFinishTen: data.anim.syngokuFinishTen, // Finish pose TEN
            shootA: data.anim.shootA, // Gohadoken
            shootB: data.anim.shootB // Zanku Hadoken (Air)
        };
        const explosionFrames = data.explosion;

        // Process bulletData textures
        if (data.bulletDataA?.texture && !(data.bulletDataA.texture[0] instanceof PIXI.Texture)) {
            data.bulletDataA.texture = data.bulletDataA.texture.map(f => PIXI.Texture.from(f));
            if (explosionFrames) data.bulletDataA.explosion = explosionFrames; // Add explosion for bullet hits
        }
        if (data.bulletDataB?.texture && !(data.bulletDataB.texture[0] instanceof PIXI.Texture)) {
            data.bulletDataB.texture = data.bulletDataB.texture.map(f => PIXI.Texture.from(f));
            if (explosionFrames) data.bulletDataB.explosion = explosionFrames;
        }


        super(data, animFrames, explosionFrames);

        // --- Goki Specific Setup ---
        this.bulletDataA = data.bulletDataA; // Gohadoken data
        this.bulletDataB = data.bulletDataB; // Zanku Hadoken data
        this.bulletData = this.bulletDataA; // Default

        this.unit.hitArea = new PIXI.Rectangle(
             -this.character.width / 2 + 15, -this.character.height / 2 + 20,
             this.character.width - 30, this.character.height - 24
        );
        if (this.dengerousBalloon) {
            this.dengerousBalloon.position.set(-this.character.width / 2 + 5, -this.character.height / 2 + 20);
        }

        // Preload SGS hit effect textures (or ensure they are loaded)
        this.shungokuHitEffectTextures = [];
        const gameAsset = PIXI.loader?.resources?.game_asset;
        if (gameAsset && gameAsset.textures) {
            for (let i = 0; i < 5; i++) {
                const tex = gameAsset.textures[`hit${i}.gif`];
                if (tex) {
                    this.shungokuHitEffectTextures.push(tex);
                } else {
                    console.warn(`BossGoki: hit effect texture 'hit${i}.gif' not found.`);
                }
            }
        } else {
             console.error("BossGoki: game_asset resource not found for hit effects.");
        }
    }

     // Goki uses a special entry animation in castAdded
     // Override onEntryComplete to allow shootStart after initial anim
     onEntryComplete() {
         this.playIdleAnim(); // Switch to idle after entry anim
         if(this.shootOn) this.shootStart(); // Start attacks if allowed
     }


    shootStart() {
        if (this.deadFlg || !this.shootOn) return;
        if (this.tlShoot) this.tlShoot.kill();

        const playerUnit = gameState.playerRef;
        const targetY = Constants.GAME_DIMENSIONS.HEIGHT / 4;
        const bottomY = Constants.GAME_DIMENSIONS.HEIGHT - this.unit.hitArea.height - this.unit.hitArea.y + 20; // Adjusted bottom Y

        let targetX = Constants.GAME_DIMENSIONS.CENTER_X;
        if (playerUnit) targetX = playerUnit.x;
        const halfHitboxWidth = this.unit.hitArea.width / 2;
        const minX = -this.character.width / 2 + halfHitboxWidth + this.unit.hitArea.x;
        const maxX = Constants.GAME_DIMENSIONS.WIDTH - this.character.width / 2 - halfHitboxWidth + this.unit.hitArea.x;
        targetX = Math.max(minX, Math.min(maxX, targetX));

        this.tlShoot = new TimelineMax({
            delay: 0.5,
            onComplete: this.shootStart,
            onCompleteScope: this
        });

        const patternRoll = Math.random();

        if (patternRoll < 0.35) { // Rapid Gohadoken (High)
            this.bulletData = this.bulletDataA;
            this.tlShoot
                .to(this, 0.4, { x: targetX })
                .addCallback(this.playShootAAnim, "+=0")
                .addCallback(() => { Sound.play("boss_goki_voice_tama0"); this.shoot(); }, "+=0.32")
                .addCallback(this.playShootAAnim, "+=0")
                .addCallback(() => { this.shoot(); }, "+=0.32") // No sound on rapid part?
                // ... repeat ...
                .addCallback(this.playShootAAnim, "+=0")
                .addCallback(() => { Sound.play("boss_goki_voice_tama0"); this.shoot(); }, "+=0.32")
                .addCallback(this.playIdleAnim, "+=0.3");

        } else if (patternRoll < 0.65) { // Zanku Hadoken (Air)
            this.bulletData = this.bulletDataB;
            this.tlShoot
                .to(this, 0.4, { x: targetX })
                .addCallback(this.playShootBAnimAndSound, "+=0")
                .addCallback(this.shoot, "+=0.4") // Delay before bullet emits
                .addCallback(this.playIdleAnim, "+=0.8");

        } else if (patternRoll < 0.9) { // Ashura Senku (Teleport) - Long downward
             this.tlShoot
                 .addCallback(this.playAshuraSenkuAnimAndSound, "+=0.4")
                 .to(this, 1.2, { y: bottomY }) // Move down
                 .to(this, 0.7, { // Move to random spot near top
                    x: Math.random() * (maxX - minX) + minX,
                    y: targetY
                 }, "+=0.2")
                 .addCallback(this.playIdleAnim, "+=0.3");

        } else { // Ashura Senku (Teleport) - Short diagonal
             const randomEndY = (Math.random() > 0.5) ? 60 : targetY; // End high or mid
             this.tlShoot
                 .addCallback(this.playAshuraSenkuAnimAndSound, "+=0")
                 .to(this, 0.7, {
                     x: Math.random() * (maxX - minX) + minX,
                     y: randomEndY
                 })
                 .addCallback(this.playIdleAnim, "+=0.3");
        }
         // Common pause
         this.tlShoot.addCallback(() => {}, "+=1.0");
    }

     // --- Animation & Sound Helpers ---
     playIdleAnim() {
         this.playAnimation('idle', true);
     }
     playShootAAnim() { // Gohadoken
         this.playAnimation('shootA', false);
     }
     playShootBAnimAndSound() { // Zanku Hadoken
         this.playAnimation('shootB', false);
         Sound.play("boss_goki_voice_tama1");
     }
     playAshuraSenkuAnimAndSound() {
         this.playAnimation('syngoku', false); // Use syngoku anim for teleport
         Sound.play("boss_goki_voice_ashura");
     }
     playSyngokuFinishAnim(isTen) {
         const anim = isTen ? 'syngokuFinishTen' : 'syngokuFinish';
         this.playAnimation(anim, false);
     }

     // --- Shun Goku Satsu ---
     shungokusatsu(playerUnit, isTenFinish = false) {
         if (this.deadFlg) return; // Don't perform if dead

         Sound.play("boss_goki_voice_syngokusatu0");
         this.onTheWorld(true); // Freeze self actions

         // Black background - add to overlay container in GameScene?
         // Or add temporarily here
         const overlay = new PIXI.Graphics()
             .beginFill(0x000000, 0.9)
             .drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT)
             .endFill();
         this.addChild(overlay); // Add to boss container for now

         // Flash graphic
         const flash = new PIXI.Graphics()
             .beginFill(0xFFFFFF, 1)
             .drawRect(0, 0, Constants.GAME_DIMENSIONS.WIDTH, Constants.GAME_DIMENSIONS.HEIGHT)
             .endFill();
         flash.alpha = 0;
         this.addChild(flash);

         const sgsTimeline = new TimelineMax();
         const hitEffectDelay = 0.05;
         const numHits = 10; // Number of hit effects

         // Hit effects sequence
         for (let i = 0; i < numHits; i++) {
             sgsTimeline.addCallback(() => {
                 if (this.shungokuHitEffectTextures.length > 0) {
                     const hitEffect = new PIXI.extras.AnimatedSprite(this.shungokuHitEffectTextures);
                     // Position relative to player's *current* global position
                     const playerBounds = playerUnit.getBounds();
                     hitEffect.x = playerBounds.x + Math.random() * playerBounds.width;
                     hitEffect.y = playerBounds.y + Math.random() * playerBounds.height * 0.7; // Upper part
                     hitEffect.animationSpeed = 0.15;
                     hitEffect.loop = false;
                     hitEffect.anchor.set(0.5);
                     hitEffect.onComplete = () => hitEffect.destroy();
                     // Add effect to the main stage or overlay container for global positioning
                     globals.pixiApp.stage.addChild(hitEffect); // Add to stage temporarily
                     hitEffect.play();
                     Sound.play("se_damage");
                 }
                 // Screen flash
                 flash.alpha = 0.2;
                 TweenMax.to(flash, 0.06, { alpha: 0, delay: 0.01 });
             }, `+=${hitEffectDelay}`);
         }

         // Finish pose and fade out
         sgsTimeline
             .addCallback(() => this.playSyngokuFinishAnim(isTenFinish), "+=0.1") // Show finish pose
             .to(overlay, 0.3, { alpha: 0 }, "+=0.7") // Fade out black bg
             .addCallback(() => Sound.play("boss_goki_voice_syungokusatu1"), "-=0.15") // Finish sound
             .addCallback(() => {
                 // Cleanup visuals
                 if (overlay.parent) this.removeChild(overlay);
                 if (flash.parent) this.removeChild(flash);
                 this.playIdleAnim(); // Return to idle
                 // Unfreeze Goki actions? Or wait for GameScene? Assuming GameScene unfreezes.
                 // this.onTheWorld(false);
             }, "+=1.5"); // Delay before returning to idle
     }

    // Override onDead
    onDead() {
        Sound.play("boss_goki_voice_ko");
    }

    castAdded() {
        super.castAdded(); // Call base class method first
        this.tlShoot = new TimelineMax();
        // Goki starts with Ashura/SGS animation?
        this.playAnimation('syngoku', false); // Play entry animation
        this.moveFlg = true; // Ensure entry movement happens
        Sound.play("boss_goki_voice_add"); // Entry sound
    }

     castRemoved() {
         this.tlShoot?.kill();
         super.castRemoved();
     }
}
