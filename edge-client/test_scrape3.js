const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');

const USER_DATA_DIR = path.join(__dirname, 'test-profile');

(async () => {
    const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: true,
        channel: 'chrome',
        viewport: null,
        ignoreDefaultArgs: ["--enable-automation"],
        args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
    });
    
    const page = await browser.newPage();
    await page.goto('https://www.tesco.com/groceries/en-GB/search?query=Broccoli', { timeout: 60000 });
    
    try {
        await page.waitForSelector('h3, h2', { timeout: 10000 });
        const rawItems = await page.$$eval('h3 a', headings => {
            return headings.slice(0, 5).map(a => {
                // Tesco structure typically has price within the same list item block
                const li = a.closest('li') || a.closest('div');
                if (!li) return null;
                const text = li.innerText;
                const priceMatch = text.match(/£(\d+\.\d{2})/);
                return {
                    name: a.innerText,
                    price: priceMatch ? parseFloat(priceMatch[1]) : null
                }
            }).filter(i => i && i.name && i.price);
        });
        console.log("Found:", rawItems);
    } catch(e) {
        console.log("Err:", e);
    }

    await browser.close();
})();
