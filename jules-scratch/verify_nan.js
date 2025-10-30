const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen for console events
  page.on('console', msg => {
    const text = msg.text();
    console.log(`Browser console: ${text}`);
    // Check for the specific error message
    if (text.includes('NaN')) {
      console.error('NaN value detected in browser console output.');
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.error(`Page error: ${error.message}`);
  });

  try {
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
    console.log('Page loaded successfully.');

    // Wait for the intro animation to complete (adjust time if needed)
    await page.waitForTimeout(4000);

    // Click the start button
    await page.mouse.click(128, 330);
    console.log('Clicked the start button.');

    // Wait for the "FIGHT" animation and scene transition
    await page.waitForTimeout(4000);

    // Take a screenshot
    await page.screenshot({ path: 'jules-scratch/screenshot.png' });
    console.log('Screenshot taken.');

  } catch (error) {
    console.error(`Failed to load page: ${error.message}`);
  } finally {
    await browser.close();
  }
})();
