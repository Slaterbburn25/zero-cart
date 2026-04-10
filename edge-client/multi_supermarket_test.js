const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function testOtherSupermarkets() {
    console.log("=========================================");
    console.log("    🛒 Multi-Supermarket Stress Test");
    console.log("=========================================\n");

    const browser = await chromium.launch({ headless: false });
    
    // We will test 1 item across all 3 supermarkets to prove the URL routing works
    const testItem = "Semi Skimmed Milk";
    console.log(`[Target Item]: ${testItem}\n`);

    // ASDA Test
    console.log("--> 🟢 Navigating to ASDA...");
    const asdaPage = await browser.newPage();
    await asdaPage.goto(`https://groceries.asda.com/search/${encodeURIComponent(testItem)}`, { waitUntil: 'domcontentloaded' });
    console.log("    ✅ ASDA Search Loaded!\n");

    // Morrisons Test
    console.log("--> 🟡 Navigating to Morrisons...");
    const morrisonsPage = await browser.newPage();
    await morrisonsPage.goto(`https://groceries.morrisons.com/search?q=${encodeURIComponent(testItem)}`, { waitUntil: 'domcontentloaded' });
    console.log("    ✅ Morrisons Search Loaded!\n");

    // Sainsbury's Test
    console.log("--> 🟠 Navigating to Sainsbury's...");
    const sainsPage = await browser.newPage();
    await sainsPage.goto(`https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(testItem)}`, { waitUntil: 'domcontentloaded' });
    console.log("    ✅ Sainsbury's Search Loaded!\n");

    console.log("🎉 All 3 supermarkets successfully accessed! Leaving them open for you to verify.");
    
    // We intentionally leave the browser open so you can look at the 3 tabs!
    await new Promise(() => {}); 
}

testOtherSupermarkets();
