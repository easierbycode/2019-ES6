TODO
====

boss0 destroy error:
TypeError: Cannot read properties of null (reading 'off')
    at e.destroy (http://localhost:8001/games/2019/js/pixi.min.js:14:22046)
    at e.destroy (http://localhost:8001/games/2019/js/pixi.min.js:17:18407)
    at explosionInstance.onComplete (http://localhost:8001/games/2019/js/bosses/Boss.js:252:31)
    at e.update (http://localhost:8001/games/2019/js/pixi.min.js:17:17953)
    at t.emit (http://localhost:8001/games/2019/js/pixi.min.js:16:20131)
    at t.update (http://localhost:8001/games/2019/js/pixi.min.js:16:19110)
    at _tick (http://localhost:8001/games/2019/js/pixi.min.js:16:17293)

add gamepad support to continue screen, minimally start should click YES buttton

HUD - rename ca -> sp

remove handlePlayerShoot, create Bullet in Player.shoot()

Uncaught TypeError: explosionInstance.scale.copyFrom is not a function
    at BossBison.spawnDeathExplosion (Boss.js:241:34)

*(Refine StartButton pattern for other UI components like `HowtoButton`, `StaffrollButton`, etc. to ensure consistent texture loading and error handling.)*

pixi.min.js:15 Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently

refactor to Phaser 4.0.0-rc.5



versions
========
0.4 - big bullets colliding