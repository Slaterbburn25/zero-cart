const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');
const os = require('os');

// For testing without crashing when your normal Chrome is open, we use an isolated profile
const USER_DATA_DIR = path.join(__dirname, 'test-profile');

async function injectCart() {
    console.log("⚡ ZeroCart Edge Agent Triggered ⚡\n");

    console.log("1. Contacting Local Math Engine for the perfectly calculated £90 basket...");
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
            headless: false,       // The bot MUST be visible to the user
            channel: 'chrome',     // Bypasses default Playwright binaries and uses your actual Google Chrome
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

    console.log("\n3. Navigating to Tesco & Executing Basket Injection...");
    
    await page.goto("https://www.tesco.com/groceries", { timeout: 60000 });
    
    // Auto-accept cookies if they block the screen
    try {
        const cookieButton = await page.waitForSelector('button:has-text("Accept all cookies")', { timeout: 5000 });
        if (cookieButton) {
            await cookieButton.click();
            await page.waitForTimeout(1000);
            console.log("      [*] Cleared the Tesco cookie overlay.");
        }
    } catch (e) {
        // No cookie banner found, proceed normally
    }
    
    for (const item of basket) {
        console.log(` ---> Executing DOM UI Click: Adding [${item.quantity}x] ${item.item_name}`);
        
        await page.goto(`https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(item.item_name)}`, { waitUntil: 'domcontentloaded' });
        
        try {
            // Wait for the results grid to appear
            await page.waitForSelector('.product-list, [data-auto="product-list"]', { timeout: 5000 }).catch(() => {});
            
            // The exact button selector currently used by Tesco production DOM
            const addButton = page.locator('button[data-auto="ddsweb-quantity-controls-add-button"]').first();
            await addButton.waitFor({ state: 'visible', timeout: 3000 });
            
            // Loop the physical click the exact number of times the math engine requested
            for (let i = 0; i < item.quantity; i++) {
                await addButton.click();
                await page.waitForTimeout(500); // 500ms delay between multiple clicks on the same item
            }
            console.log(`      [+] Successfully clicked Add to Cart ${item.quantity} times!`);
        } catch (e) {
            console.log(`      [!] Could not locate add button for ${item.item_name}. Skipping to maintain speed.`);
        }
        
        await page.waitForTimeout(1500); 
    }

    console.log("\n4. 🛑 THE PAYMENT HANDOFF 🛑");
    await page.bringToFront();
    await page.waitForTimeout(999999999);
}

injectCart();
