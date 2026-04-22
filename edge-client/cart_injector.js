const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PAYLOAD_FILE = path.join(__dirname, 'pending_inject.json');

async function injectCart() {
    console.log('[Edge Injector] 🚀 Initializing Cart Injection Drone...');

    if (!fs.existsSync(PAYLOAD_FILE)) {
        console.error('[Edge Injector] ❌ Error: pending_inject.json not found. Aborting.');
        process.exit(1);
    }

    const cartData = JSON.parse(fs.readFileSync(PAYLOAD_FILE, 'utf-8'));
    
    // We expect cartData to be an object with 'basket_summary' and 'basket_items'
    if (!cartData.basket_items || !Array.isArray(cartData.basket_items)) {
        console.error('[Edge Injector] ❌ Error: Invalid Cart Schema. Aborting.');
        process.exit(1);
    }

    console.log(`[Edge Injector] Target: ${cartData.basket_items.length} items to inject.`);

    // 1 & 2. Launch an internal persistent Chrome Profile managed by ZeroCart
    console.log('[Edge Injector] 🚀 Initializing Dedicated ZeroCart Browser Profile...');
    
    // Instead of hijacking OS Chrome (which crashes if open), we use a dedicated local folder.
    // The user logs in ONCE, and this folder permanently saves the Tesco session cookies forever.
    const userDataDir = path.join(__dirname, 'zerocart_chrome_profile');
    
    let context;
    try {
        context = await chromium.launchPersistentContext(userDataDir, {
            channel: 'chrome',
            headless: false,
            viewport: null, // Maximize natively
            args: [
                '--disable-blink-features=AutomationControlled',
                '--start-maximized'
            ]
        });
    } catch (lockError) {
        console.error('[Edge Injector] ❌ Failed to launch browser context.');
        process.exit(1);
    }

    const page = context.pages()[0] || await context.newPage();

    // 3. Authentication Gate: Redirect user to strictly log in
    console.log('\n======================================================');
    console.log('[Edge Injector] 🛑 AUTOMATION PAUSED: Login Required!');
    console.log('[Edge Injector] If you are already logged in via your profile, this will instantly bypass.');
    console.log('======================================================\n');
    
    // Check if basket is primarily Iceland to route to Iceland's auth gate
    const isIcelandBasket = cartData.basket_items.some(i => i.url.includes('iceland.co.uk'));
    
    if (isIcelandBasket) {
        await page.goto('https://www.iceland.co.uk/account/login', { waitUntil: 'domcontentloaded' });
    } else {
        await page.goto('https://www.tesco.com/account/auth/en-GB/login', { waitUntil: 'domcontentloaded' });
    }
    
    // Indefinite Wait: The script halts execution completely while the browser is on any auth page.
    await page.waitForFunction(() => {
        const url = window.location.href;
        // Tesco login is a multi-step flow: /login -> /challenges (password) -> /auth bypass
        return !url.includes('login') && !url.includes('register') && !url.includes('challenges') && !url.includes('auth');
    }, { timeout: 0, polling: 1500 }); // Check every 1.5 seconds

    console.log('[Edge Injector] 🟢 Authentication bypassed successfully! Resuming Edge injection sequences...');
    await page.waitForTimeout(2000); // Buffer to let React re-hydrate the new signed-in state dashboard

    // 4. Inject Items Loop
    for (let i = 0; i < cartData.basket_items.length; i++) {
        const item = cartData.basket_items[i];
        
        // Skip fallback/hallucinated items securely
        if (!item.url || item.url.includes('search?query=') || item.sku.includes('LIVE_FALLBACK')) {
            console.log(`[Edge Injector] ⚠️ Skipping ambiguous item: ${item.item_name}`);
            continue;
        }

        console.log(`[Edge Injector] (${i + 1}/${cartData.basket_items.length}) Navigating to: ${item.item_name}`);
        
        try {
            await page.goto(item.url, { waitUntil: 'domcontentloaded' });
            
            // Random humanized scroll
            await page.mouse.wheel(0, Math.floor(Math.random() * 400) + 200);
            await page.waitForTimeout(Math.floor(Math.random() * 1000) + 1000); // 1-2s delay

            // Find the universal 'Add' button OR the generic '+' button if already in cart
            // Tesco often uses a highly specific span or specific form for product additions.
            // Using a generic locator that targets common 'Add' or '+' buttons across PDPs:
            
            // Typical PDP Add logic
            // data-testid="add-btn" or button containing "Add" or button containing "+"
            // Since we're blind injecting, we wrap this in a safe try-catch
            for (let click_loop = 0; click_loop < item.quantity; click_loop++) {
                
                try {
                    const isIceland = item.url.includes('iceland.co.uk');
                    
                    if (isIceland) {
                        // Playwright evaluates Iceland UI
                        const icelandAddBtn = await page.$('button[data-testid="add-to-basket"]') || await page.$('button.add-to-basket') || await page.$('button:has-text("Add")') || await page.$('button[title*="Add"]');
                        if (icelandAddBtn) {
                            await icelandAddBtn.click();
                            await page.waitForTimeout(800 + Math.random() * 500);
                            continue;
                        }
                    } else {
                        // Playwright evaluates Tesco UI
                        const addBtn = await page.$('button span:has-text("Add")') || await page.$('button:has-text("Add")');
                        if (addBtn) {
                            await addBtn.click();
                            await page.waitForTimeout(800 + Math.random() * 500);
                            continue; // Successfully clicked "Add"
                        }
                        
                        const plusBtn = await page.$('button[title*="Add"]') || await page.$('button[aria-label*="dd"]');
                        if (plusBtn) {
                            await plusBtn.click();
                            await page.waitForTimeout(800 + Math.random() * 500);
                        }
                    }
                } catch (btnErr) {
                    console.log(`[Edge Injector] 🐛 Failed to click Add for ${item.item_name}`);
                    break; 
                }
            }
            
            console.log(`[Edge Injector] ✅ Added ${item.quantity}x ${item.item_name}`);
            
        } catch (e) {
            console.log(`[Edge Injector] ❌ Page Load Timeout on ${item.url}`);
        }
    }

    console.log('[Edge Injector] 🏁 Injection complete. Delivering to Trolley...');
    
    // 5. Hand off to the Trolley for manual Slot Selection
    const isIcelandCart = cartData.basket_items.some(i => i.url.includes('iceland.co.uk'));
    
    if (isIcelandCart) {
        await page.goto('https://www.iceland.co.uk/cart', { waitUntil: 'domcontentloaded' });
    } else {
        await page.goto('https://www.tesco.com/shop/en-GB/trolley', { waitUntil: 'domcontentloaded' });
    }
    
    console.log('\n======================================================');
    console.log('[Edge Injector] 🛑 AUTOMATION PAUSED: Please select your Delivery/Whoosh slot manually!');
    console.log('[Edge Injector] The drone is actively watching. When Tesco asks for Recommendations, it will strike.');
    console.log('======================================================\n');
    
    try {
        // Wait indefinitely until the URL hits the /recommendations bypass gate
        // We use page.waitForURL since playwright has a native hook for it, or just function
        await page.waitForFunction(() => {
            return window.location.href.includes('/recommendations');
        }, { timeout: 0, polling: 1000 });
        
        console.log('[Edge Injector] 🎯 Upsell Trap Detected! Bypassing Recommendations...');
        
        // Let the upsell UI settle
        await page.waitForTimeout(1500);
        
        // Dynamically find and click the 'Continue checkout' button to skip upsells
        const skipBtn = await page.$('a[href*="/order-summary"]') || await page.$('button:has-text("Continue checkout")') || await page.$('button:has-text("Continue to checkout")') || await page.$('button:has-text("Continue")');
        
        if (skipBtn) {
            await skipBtn.click();
        } else {
            // Fallback hard-warp if button is architecturally obscured
            await page.goto('https://www.tesco.com/checkout/en-GB/groceries/order-summary?basketType=GROCERY', { waitUntil: 'domcontentloaded' });
        }
        
    } catch (e) {
        console.log('[Edge Injector] ⚠️ Recommendation Bypass gracefully aborted.');
    }

    console.log('\n======================================================');
    console.log('[Edge Injector] 🛑 FINAL TERMINAL: Awaiting Front-End Payment Authorization.');
    console.log('======================================================\n');
    
    // IMPORTANT: Deliberately do NOT close the browser to allow human payment input

    
    // Cleanup the payload so it doesn't accidentally run stale data next time
    // try {
    //     fs.unlinkSync(PAYLOAD_FILE);
    // } catch (e) {
    //     // Ignored
    // }
}

injectCart().catch(err => {
    console.error('[Edge Injector] FATAL CRASH: ', err);
    process.exit(1);
});
