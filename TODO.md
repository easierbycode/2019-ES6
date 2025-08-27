TODO
====

Player - ondrag or keyup player disappears (double loop call from BaseScene?)

soliderA bullets need to be rotated (-90)

HUD - rename ca -> sp

soldierB - fix projectile angle and interval

remove handlePlayerShoot, create Bullet in Player.shoot()

Uncaught TypeError: explosionInstance.scale.copyFrom is not a function
    at BossBison.spawnDeathExplosion (Boss.js:241:34)

bossTimer starts at 0 and stays there

*(Refine StartButton pattern for other UI components like `HowtoButton`, `StaffrollButton`, etc. to ensure consistent texture loading and error handling.)*

pixi.min.js:15 Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently

refactor to Phaser 4.0.0-rc.1





versions
========
0.4 - big bullets colliding