const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
    const b = await chromium.launch({headless: true});
    const p = await b.newPage();
    await p.goto('https://www.tesco.com/groceries/en-GB/search?query=Broccoli', { timeout: 60000 });
    await p.waitForTimeout(5000);
    
    const items = await p.$$eval('h3 a', anchors => anchors.map(a => a.innerText));
    console.log("H3 A:", items);
    
    // Also try a generic class name search
    const prices = await p.$$eval('.styled__PriceText-sc-v0jvpn-1', prices => prices.map(p => p.innerText));
    console.log("PRICES:", prices);
    
    await b.close();
})();
