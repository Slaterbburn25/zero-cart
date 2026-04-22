const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.tesco.com/groceries/en-GB/search?query=Garlic', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const debugHtml = await page.evaluate(() => {
        let debugLog = [];
        let links = Array.from(document.querySelectorAll('a'));
        let validLinks = links.filter(a => a.href && a.innerText && a.innerText.length > 3).map(a => `${a.innerText.trim().slice(0,20)} -> ${a.href}`);
        return validLinks.join('\n');
    });

    fs.writeFileSync('scraper_debug.txt', debugHtml, 'utf-8');
    await browser.close();
})();
