const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.tesco.com/groceries/en-GB/search?query=Garlic', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const products = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/groceries/en-GB/products/"]'));
        
        // Filter out image links by only getting ones with decent text
        const validLinks = links.filter(a => a.innerText && a.innerText.length > 5);
        
        let results = [];
        const seenTitles = new Set();
        
        for (let a of validLinks) {
            let title = a.innerText.trim();
            if (seenTitles.has(title)) continue;
            seenTitles.add(title);
            
            // Climb up the DOM tree from the link until we find a price
            let parent = a.parentElement;
            let priceStr = null;
            let climbCount = 0;
            
            while (parent && climbCount < 8) {
                let text = parent.innerText || "";
                let matches = text.match(/£(\d+\.\d{2})/g);
                if (matches && matches.length > 0) {
                     priceStr = matches[0];
                     break;
                }
                parent = parent.parentElement;
                climbCount++;
            }
            if (priceStr) {
                results.push({ title: title, price: priceStr });
            }
        }
        return results;
    });

    console.log(JSON.stringify(products.slice(0, 5), null, 2));
    await browser.close();
})();
