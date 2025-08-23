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