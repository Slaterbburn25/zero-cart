const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log("Navigating to Tesco search...");
    await page.goto("https://www.tesco.com/groceries/en-GB/search?query=milk", { waitUntil: 'domcontentloaded' });
    
    // Give it a second to load products
    await page.waitForTimeout(3000);
    
    // Dump all buttons on the page
    const buttons = await page.$$eval('button, a', elements => elements.map(el => ({
        text: el.innerText.trim().replace(/\n/g, ' '),
        className: el.className,
        id: el.id,
        dataAuto: el.getAttribute('data-auto') || 'none',
        tagName: el.tagName
    })).filter(b => b.text.toLowerCase().includes('add') || b.text.toLowerCase().includes('trolley') || b.text.toLowerCase().includes('basket')));
    
    console.log(JSON.stringify(buttons, null, 2));
    
    // Also check if we are blocked
    const pageTitle = await page.title();
    console.log("Page Title: ", pageTitle);
    
    if (pageTitle.includes('Access Denied')) {
        console.log("🛑 We are being blocked by Akamai WAF.");
    }

    await browser.close();
})();
