import { SHOOT_MODES } from './constants.js'; // Import from constants

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
             // Set expiry far in the future (e.g., 10 years)
             const expiryDate = new Date();
             expiryDate.setFullYear(expiryDate.getFullYear() + 10);
             document.cookie = `afc2019_highScore=${gameState.highScore}; expires=${expiryDate.toUTCString()}; path=/; secure`;
         }
     }
}