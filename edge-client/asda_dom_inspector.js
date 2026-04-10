const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log("Navigating to ASDA search for milk...");
    await page.goto("https://groceries.asda.com/search/milk", { waitUntil: 'domcontentloaded' });
    
    // Give ASDA time to load products
    await page.waitForTimeout(4000);
    
    // Dump all buttons that might be 'Add'
    const buttons = await page.$$eval('button, a', elements => elements.map(el => ({
        text: el.innerText ? el.innerText.trim().replace(/\n/g, ' ') : '',
        className: el.className,
        id: el.id,
        tagName: el.tagName,
        ariaLabel: el.getAttribute('aria-label') || 'none',
        dataAutoId: el.getAttribute('data-auto-id') || 'none'
    })).filter(b => b.text.toLowerCase().includes('add') || b.ariaLabel.toLowerCase().includes('add')));
    
    console.log(JSON.stringify(buttons.slice(0, 5), null, 2));

    await browser.close();
})();
