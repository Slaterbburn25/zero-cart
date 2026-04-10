const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');
const os = require('os');

// Use the isolated test profile that mirrors human behavior to defeat ASDA firewalls
const USER_DATA_DIR = path.join(__dirname, 'test-profile');

async function injectCart() {
    console.log("⚡ ZeroCart ASDA Edge Agent Triggered ⚡\n");

    console.log("1. Contacting Local Math Engine for the perfectly calculated £90 ASDA basket...");
    let response;
    try {
        response = await fetch("http://127.0.0.1:8000/api/v1/optimize_basket?user_id=1", { method: 'POST' });
    } catch (e) {
        console.error("❌ Failed to reach the local backend. Is the Python uvicorn server running?");
        return;
    }

    const data = await response.json();
    if (data.status !== "success") {
        console.log("Math engine failed to build basket.");
        return;
    }

    const basket = data.basket;
    console.log(`✅ Basket mathematically verified! Total Cost: £${data.summary.total_cost}. Preparing to inject ${basket.length} items.\n`);

    console.log("2. Launching Symbiote Browser (Commandeering authenticated Chrome state)...");
    
    let browser;
    try {
        browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless: false,       
            channel: 'chrome',     
            viewport: null, 
            ignoreDefaultArgs: ["--enable-automation"],
            args: [
                "--start-maximized",
                "--disable-blink-features=AutomationControlled",
                "--test-type",
                "--no-sandbox",
                "--excludeSwitches=enable-automation"
            ]
        });
    } catch (e) {
        console.error("\n❌ FATAL BIND ERROR: Google Chrome is currently open somewhere on your PC.");
        return;
    }

    const pages = browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    console.log("\n3. Navigating to ASDA & Executing Basket Injection...");
    
    // Auto-accept cookies if they block the screen (ASDA specific)
    await page.goto("https://groceries.asda.com/", { timeout: 60000 });
    try {
        const cookieButton = await page.waitForSelector('button:has-text("Accept All Cookies")', { timeout: 5000 });
        if (cookieButton) {
            await cookieButton.click();
            await page.waitForTimeout(1000);
            console.log("      [*] Cleared the ASDA cookie overlay.");
        }
    } catch (e) {}
    
    for (const item of basket) {
        // AI String Normalization: The Math Engine calculates using Tesco mock data. 
        // We strip the word 'Tesco' so ASDA actually understands what we are searching for!
        const genericName = item.item_name.replace(/Tesco /gi, '');
        console.log(` ---> Executing DOM UI Click: Adding [${item.quantity}x] ${genericName}`);
        
        try {
            // ASDA uses /search/[query] route for looking up items
            await page.goto(`https://groceries.asda.com/search/${encodeURIComponent(genericName)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // General wait for item grid
            await page.waitForTimeout(3500); 
            
            // Look for ASDA's generic Add to Cart buttons
            const addButton = page.locator('button:has-text("Add")').first();
            await addButton.waitFor({ state: 'visible', timeout: 5000 });
            
            // Loop the physical click the exact number of times the math engine requested
            for (let i = 0; i < item.quantity; i++) {
                await addButton.click();
                await page.waitForTimeout(800); // ASDA frontend reacts a bit slower than Tesco, so we wait 800ms
            }
            console.log(`      [+] Successfully clicked Add to Cart ${item.quantity} times on ASDA!`);
        } catch (e) {
            console.log(`      [!] Could not locate ASDA add button for ${genericName}. Skipping to maintain speed.`);
        }
    }

    console.log("\n4. 🛑 THE ASDA PAYMENT HANDOFF 🛑");
    await page.bringToFront();
    await page.waitForTimeout(999999999);
}

injectCart();
