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
    await page.waitForTimeout(5000);
    
    // Attempt to dump the text content of the product list
    const lists = await page.$$eval('ul, ol', elements => {
        let best = null;
        for (let el of elements) {
            if (el.innerText && el.innerText.includes('Broccoli')) {
                best = el.innerHTML;
                break;
            }
        }
        return best ? best.substring(0, 1000) : "Not found";
    });
    
    console.log("HTML Dump:", lists);
    await browser.close();
})();
