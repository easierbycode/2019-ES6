// index.js or main.js
import { App } from './App.js';

// Ensure PIXI and GSAP are loaded before this runs

// Wait for the DOM to be ready (optional but good practice)
document.addEventListener('DOMContentLoaded', () => {
    new App();
});