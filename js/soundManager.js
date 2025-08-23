// soundManager.js - Adapted for pixi-sound v2.x / v3.x (for PIXI v4)
// WITH ADDED SAFETY CHECKS

import { gameState } from './gameState.js';
// Assumes PIXI and PIXI.sound are globally available from script tags

// --- Constants ---
const BGM_FALLBACK_LOOP = true; // Whether to loop entire BGM if segment points invalid or duration is bad

// --- State ---
let soundInstances = {}; // Store active BGM instances for loop management

// --- Utility ---
function checkPixiSound() {
    if (typeof PIXI === 'undefined' || typeof PIXI.sound === 'undefined') {
        console.error("PIXI or PIXI.sound is not defined. Ensure pixi.js and a compatible pixi-sound.js (v2/v3 for PIXI v4) are loaded correctly IN ORDER before game scripts.");
        return false;
    }
    return true;
}

// --- Playback Controls ---

export function play(soundName, optionsOrCallback = null) {
    if (!checkPixiSound() || gameState.lowModeFlg) return null;

    if (!PIXI.sound.exists(soundName)) {
        // console.warn(`Sound.play: Sound alias not found: ${soundName}`); // Too noisy for missing sounds
        return null;
    }
    try {
        // Play and forget for short SFX
        const instance = PIXI.sound.play(soundName, optionsOrCallback);
        return instance;
    } catch (error) {
        console.error(`Error playing sound ${soundName}:`, error);
        return null;
    }
}

export function bgmPlay(soundName, startMs = null, endMs = null) {
    if (!checkPixiSound() || gameState.lowModeFlg) return;
    if (!PIXI.sound.exists(soundName)) {
        console.warn(`Sound.bgmPlay: BGM sound alias not found: ${soundName}`);
        return;
    }

    stop(soundName); // Stop previous instance

    const sound = PIXI.sound.find(soundName);
    if (!sound) {
        console.warn(`Sound.bgmPlay: Could not find sound object for ${soundName}`);
        return;
    }

    const soundDuration = sound.duration || 0;
    let startSec = 0;
    let endSec = soundDuration;
    let useFullLoop = true; // Default to full loop

    // --- Duration Validity Check ---
    if (!isFinite(soundDuration) || soundDuration <= 0) {
        console.warn(`BGM ${soundName} has invalid duration (${soundDuration}). Will attempt full loop: ${BGM_FALLBACK_LOOP}`);
        startSec = 0;
        endSec = 0; // Set endSec to 0 as duration is invalid
        useFullLoop = true;
    } else {
        // --- Calculate and Validate Loop Points (only if duration is valid) ---
        useFullLoop = false; // Assume segment loop initially if duration is valid

        if (typeof startMs === 'number' && isFinite(startMs) &&
            typeof endMs === 'number' && isFinite(endMs))
        {
            startSec = startMs / 1000.0;
            endSec = endMs / 1000.0;

            // Validate loop points against the valid duration
            if (startSec >= 0 && startSec < soundDuration &&
                endSec > startSec && endSec <= soundDuration + 0.1) // Allow slight overshoot for end
            {
                // Valid points found, keep useFullLoop = false
                if (!isFinite(startSec) || !isFinite(endSec)) { // Final finiteness check after calculations
                     console.warn(`Calculated loop points for ${soundName} are non-finite. Start: ${startSec}, End: ${endSec}. Playing full loop: ${BGM_FALLBACK_LOOP}`);
                     startSec = 0; endSec = soundDuration; useFullLoop = true;
                } else {
                    console.log(`Using BGM segment loop for ${soundName}. Start: ${startSec}, End: ${endSec}`);
                }
            } else {
                 console.warn(`Invalid BGM loop points provided for ${soundName}. Start: ${startSec}, End: ${endSec}, Duration: ${soundDuration}. Playing full loop: ${BGM_FALLBACK_LOOP}`);
                 startSec = 0; endSec = soundDuration; useFullLoop = true;
            }
        } else {
            // No valid loop points provided, use full loop
            startSec = 0;
            endSec = soundDuration;
            useFullLoop = true;
             // Optional: Log if points were expected but invalid format
            // if (startMs !== null || endMs !== null) {
            //     console.log(`BGM loop points for ${soundName} were provided but invalid type/value. Playing full loop.`);
            // }
        }
    }
    // --- End Loop Point Logic ---


    if (useFullLoop) {
        console.log(`Playing full BGM loop for ${soundName}. Loop enabled: ${BGM_FALLBACK_LOOP}`);
        try {
            const instance = PIXI.sound.play(soundName, { loop: BGM_FALLBACK_LOOP });
            soundInstances[soundName] = { instance: instance, stopped: false, name: soundName }; // Store name for potential stop later
        } catch (error) {
             console.error(`Error playing full BGM loop for ${soundName}:`, error);
        }
        return;
    }

    // --- Segment Looping Logic ---
    // Final check: Ensure startSec and endSec are finite before using them in segment loop
    if (!isFinite(startSec) || !isFinite(endSec)) {
        console.error(`Cannot play BGM segment for ${soundName}: Calculated loop points are non-finite. Start: ${startSec}, End: ${endSec}. Falling back to full loop.`);
        // Fallback to full loop
        try {
            const instance = PIXI.sound.play(soundName, { loop: BGM_FALLBACK_LOOP });
            soundInstances[soundName] = { instance: instance, stopped: false, name: soundName };
        } catch (error) {
             console.error(`Error playing fallback full BGM loop for ${soundName} after non-finite segment points:`, error);
        }
        return;
    }

    console.log(`Attempting BGM segment play for ${soundName}. Start: ${startSec}, End: ${endSec}`);

    // Function for segment looping
    const playLoopSegment = () => {
        // Check if sound still exists and is supposed to be playing
        if (!checkPixiSound() || gameState.lowModeFlg || !soundInstances[soundName] || soundInstances[soundName].stopped) {
            if (soundInstances[soundName]) delete soundInstances[soundName];
            return;
        }

        // --- FINAL FINITENESS CHECK before play call ---
         if (!isFinite(startSec) || !isFinite(endSec)) {
             console.error(`playLoopSegment: loop points became non-finite for ${soundName}. Aborting loop. Start: ${startSec}, End: ${endSec}`);
             if (soundInstances[soundName]) delete soundInstances[soundName];
             return;
         }
        // ---

        try {
            // Play the segment once
            const options = {
                start: startSec,
                end: endSec, // pixi-sound v2/v3 uses 'end'
                loop: false, // We handle loop manually with 'complete'
                complete: function(instanceRef) { // Get instance reference in callback
                    // Check again before looping
                    // Important: Check if the COMPLETED instance is the one we expect
                    if (soundInstances[soundName] && soundInstances[soundName].instance === instanceRef && !soundInstances[soundName].stopped) {
                        playLoopSegment(); // Recurse to play the segment again
                    } else {
                         // Clean up if stopped or instance changed
                         if (soundInstances[soundName]) delete soundInstances[soundName];
                    }
                }
            };

            // console.log(`Playing segment ${soundName} with options:`, options); // DEBUG
            const instance = PIXI.sound.play(soundName, options);

            // Update the tracker with the latest instance
            if (soundInstances[soundName]) {
                 soundInstances[soundName].instance = instance;
            } else {
                 // Should not happen if stop() wasn't called, but safety check
                 console.warn(`soundInstances[${soundName}] missing during loop segment playback, stopping instance.`);
                 instance.stop();
            }
        } catch (error) {
            console.error(`Error playing/looping BGM segment ${soundName}:`, error);
             if (soundInstances[soundName]) delete soundInstances[soundName];
        }
    };

    // Initial tracker setup and start
    soundInstances[soundName] = { instance: null, stopped: false, name: soundName };
    playLoopSegment();
}


export function stop(soundName) {
    if (!checkPixiSound() || gameState.lowModeFlg) return;

    // Mark instance tracker as stopped to prevent looping
    if (soundInstances[soundName]) {
        soundInstances[soundName].stopped = true;
        // Optional: Immediately stop the current instance if it exists
        // soundInstances[soundName].instance?.stop();
        delete soundInstances[soundName]; // Remove tracker
    }

    // Tell pixi-sound to stop all instances of this sound alias
    if (PIXI.sound.exists(soundName)) {
        try {
            PIXI.sound.stop(soundName);
        } catch (error) {
            console.error(`Error stopping sound ${soundName}:`, error);
        }
    }
}

export function stopAll() {
    if (!checkPixiSound() || gameState.lowModeFlg) return;
     // Mark all tracked instances as stopped
     for (const name in soundInstances) {
        if(soundInstances[name]) soundInstances[name].stopped = true;
     }
     soundInstances = {}; // Clear tracker
     try { PIXI.sound.stopAll(); } catch(e) { console.error("Error stopping all sounds:", e); }
}

export function pauseAll() {
    if (!checkPixiSound() || gameState.lowModeFlg) return;
     try { PIXI.sound.pauseAll(); } catch(e) { console.error("Error pausing all sounds:", e); }
}

export function resumeAll() {
    if (!checkPixiSound() || gameState.lowModeFlg) return;
     try { PIXI.sound.resumeAll(); } catch(e) { console.error("Error resuming all sounds:", e); }
}

// Helper to set volume for a specific sound alias
export function setVolume(soundName, volumeValue) {
    if (!checkPixiSound() || gameState.lowModeFlg) return;
     if (PIXI.sound.exists(soundName)) {
        try {
            PIXI.sound.volume(soundName, Math.max(0, Math.min(1, volumeValue)));
        } catch (error) {
             console.warn(`Could not set volume for ${soundName}:`, error);
        }
     } else {
         // console.warn(`Cannot set volume: Sound '${soundName}' not found.`); // Can be noisy
     }
}

export function setInitialVolumes() {
    if (!checkPixiSound() || gameState.lowModeFlg) return;
    console.log("Setting initial sound volumes (pixi-sound v2/v3)...");
    const volumes = { /* ... your full volume map ... */
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
        setVolume(soundName, volumes[soundName]);
    }
}

// Add listener for browser tab visibility change
function handleVisibilityChange() {
    if (typeof document === 'undefined') return;
    // Added check here as well
    if (!checkPixiSound()) return;
    try {
        if (document.hidden || document.visibilityState === 'hidden') {
            pauseAll();
        } else if (document.visibilityState === 'visible') {
            resumeAll();
        }
    } catch (e) {
         console.error("Error handling visibility change:", e);
    }
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    window._soundManagerVisibilityHandlerAttached = window._soundManagerVisibilityHandlerAttached || false;
    if (!window._soundManagerVisibilityHandlerAttached) {
         document.removeEventListener("visibilitychange", handleVisibilityChange);
         document.addEventListener("visibilitychange", handleVisibilityChange, false);
         window._soundManagerVisibilityHandlerAttached = true;
         console.log("SoundManager visibility handler attached.");
    }
}