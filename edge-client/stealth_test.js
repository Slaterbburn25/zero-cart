const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Go to Tesco and take a screenshot to see what defensive wall we hit
  await page.goto("https://www.tesco.com/groceries", { waitUntil: 'load' });
  await page.screenshot({ path: 'tesco-stealth-test.png' });
  
  await browser.close();
})();
