const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto("https://www.iceland.co.uk/search?q=pizza", { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const html = await page.evaluate(() => {
        return document.body.innerText.substring(0, 1000);
    });
    
    console.log("LINKS FOUND:\n", html);
    await browser.close();
})();
