const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');
const os = require('os');

const USER_DATA_DIR = path.join(__dirname, 'test-profile');

async function setupLogins() {
    console.log("==================================================");
    console.log("     🛒 ZeroCart Local Session Authenticator");
    console.log("==================================================");
    console.log("Because ZeroCart uses a mathematically isolated 'test-profile'");
    console.log("to protect your real data, it currently has no saved passwords.");
    console.log("\nINSTRUCTIONS:");
    console.log("1. I am opening a blank Google Chrome window now.");
    console.log("2. Navigate to ASDA (or Tesco) and manually write out your login details.");
    console.log("3. Check the 'Remember Me' box.");
    console.log("4. Once you are successfully logged in, just physically close the Chrome window.");
    console.log("   ZeroCart will forever save those cookies so the automated bot never gets blocked again!\n");

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
        console.error("❌ Google Chrome is currently open somewhere on your PC. Please close it first.");
        return;
    }

    const pages = browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    
    // We navigate to ASDA for convenience, but you can go anywhere
    await page.goto("https://groceries.asda.com/login");

    console.log("[*] Awaiting your manual login. Close the Chrome window window when you are finished...");
    
    // The script will effectively pause here forever until you physically close the Chromium instance
    await browser.waitForEvent('disconnected', { timeout: 0 });
    console.log("\n✅ Cookies permanently saved to the ZeroCart test-profile!");
}

setupLogins();
