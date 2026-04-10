const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');

const targetCategories = [
    { query: 'Chicken Breast', estimated_protein: 30, estimated_cals: 165 },
    { query: 'Eggs', estimated_protein: 6, estimated_cals: 70 },
    { query: 'Broccoli', estimated_protein: 3, estimated_cals: 34 },
    { query: 'Rice', estimated_protein: 2.7, estimated_cals: 130 },
    { query: 'Beans', estimated_protein: 5, estimated_cals: 80 }
];

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.tesco.com/groceries/en-GB/search?query=Broccoli', { timeout: 60000 });
    await page.waitForTimeout(4000);
    
    // Extremely wide DOM search
    const textData = await page.evaluate(() => document.body.innerText);
    const regex = /([a-zA-Z\s]+Broccoli[\w\s]*?)\n.*?(£\d+\.\d{2})/gi;
    let match;
    const results = [];
    while ((match = regex.exec(textData)) !== null) {
        results.push({ name: match[1].trim(), price: parseFloat(match[2].replace('£', '')) });
    }
    
    console.log("Raw Text Extraction:", results.slice(0, 5));
    await browser.close();
})();
