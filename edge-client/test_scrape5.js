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
    await page.goto('https://www.tesco.com/groceries/en-GB/search?query=Chicken', { timeout: 60000 });
    await page.waitForTimeout(4000);
    
    const products = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const productLinks = anchors.filter(a => a.href.includes('/products/') && a.innerText.length > 5);
        
        return productLinks.map(a => {
            // Traverse up looking for a price string
            let parent = a.parentElement;
            let priceStr = null;
            for(let i=0; i<5; i++) {
                if(!parent) break;
                if(parent.innerText && parent.innerText.includes('£')) {
                    const match = parent.innerText.match(/£(\d+\.\d{2})/);
                    if(match) {
                        priceStr = match[1];
                        break;
                    }
                }
                parent = parent.parentElement;
            }
            return { name: a.innerText.trim(), price: priceStr };
        }).filter(item => item.price !== null);
    });
    
    console.log("Found Products:", products);
    await browser.close();
})();
