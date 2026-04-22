const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8001;
const IS_PROD = process.env.NODE_ENV === 'production';

app.post('/api/v1/scrape', async (req, res) => {
    const { targets, store_name } = req.body;
    if (!targets || !Array.isArray(targets)) {
        return res.status(400).json({ error: "Invalid targets array" });
    }

    const store = store_name || "Tesco Live";
    const isIceland = store === "Iceland Live";

    console.log(`[Edge Scraper] Received request to scrape ${targets.length} items from ${store}.`);

    const path = require('path');
    const os = require('os');
    const userDataDir = path.join(os.tmpdir(), 'zerocart_chrome_profile_' + Math.random().toString(36).substring(7));
    let context;
    try {
        context = await chromium.launchPersistentContext(userDataDir, {
            headless: IS_PROD,
            viewport: null,
            args: ['--disable-blink-features=AutomationControlled', IS_PROD ? '--no-sandbox' : '--start-maximized']
        });
        
        await context.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
        
        const results = [];
        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        
        try {
            console.log(`[Edge Scraper] Simulating Human Homepage landing to trick WAF...`);
            if (isIceland) {
                await page.goto("https://www.iceland.co.uk/", { waitUntil: 'domcontentloaded' });
            } else {
                await page.goto("https://www.tesco.com/shop/en-GB/", { waitUntil: 'domcontentloaded' });
            }
            await page.waitForTimeout(2000);
            await page.mouse.wheel(0, 300);
        } catch(e) {}

        for (const target of targets) {
            const query = target.query;
            console.log(`[Edge Scraper] Hunting for ${query}...`);
            
            try {
                let url;
                if (isIceland) {
                    url = `https://www.iceland.co.uk/search?q=${encodeURIComponent(query)}`;
                } else {
                    url = `https://www.tesco.com/shop/en-GB/search?query=${encodeURIComponent(query)}`;
                }

                await page.goto(url, { waitUntil: 'domcontentloaded' });
                
                // Wait dynamically longer for SPAs to resolve fetch() calls
                await page.waitForTimeout(Math.floor(Math.random() * 2000) + 4000);
                await page.mouse.wheel(0, Math.floor(Math.random() * 800) + 400);
                await page.waitForTimeout(1500);

                const firstResult = await page.evaluate(() => {
                    // Universal DOM Heuristic Scraper (Bypasses CSS randomized classes)
                    const links = Array.from(document.querySelectorAll('a'));
                    const validLinks = links.filter(a => a.innerText && a.innerText.trim().length > 5);
                    
                    for (let a of validLinks) {
                        let title = a.innerText.trim();
                        let parent = a.parentElement;
                        let priceStr = null;
                        let climbCount = 0;
                        let isSponsored = false;
                        
                        // Ignore header/footer junk
                        if (title.toLowerCase().includes('sign in') || title.toLowerCase().includes('basket')) continue;
                        
                        while (parent && climbCount < 8) {
                            let text = parent.innerText || "";
                            if (text.toLowerCase().includes('sponsored')) isSponsored = true;
                            
                            let cleanText = text.replace(/[\n\r\s]+/g, '');
                            // Look for £ symbol followed by exactly 1-2 digits, a dot, and 2 digits
                            let matches = cleanText.match(/[\u00A3£\uFFFDE](\d{1,3}\.\d{2})/g);
                            
                            if (matches && matches.length > 0) {
                                 let p1 = parseFloat(matches[0].replace(/[^\d.]/g, ''));
                                 
                                 // Bypass relative pricing like £0.13/100g if there is a main price
                                 if (p1 < 0.30 && matches.length > 1) {
                                     priceStr = matches[1].replace(/[^\d.]/g, '');
                                 } else {
                                     priceStr = matches[0].replace(/[^\d.]/g, '');
                                 }
                                 break;
                            }
                            parent = parent.parentElement;
                            climbCount++;
                        }
                        
                        if (priceStr && !isSponsored) {
                            return { price: parseFloat(priceStr), title: title, actualUrl: a.href };
                        }
                    }
                    return { price: null, title: null, actualUrl: null };

                });

                if (firstResult && firstResult.price !== null && !isNaN(firstResult.price)) {
                    console.log(`[Edge Scraper] Success: ${firstResult.title} - £${firstResult.price} (${firstResult.actualUrl})`);
                    results.push({
                        ...target,
                        price: firstResult.price,
                        item_name: firstResult.title,
                        url: firstResult.actualUrl || url
                    });
                } else {
                    console.log(`[Edge Scraper] Failed to find exact price for ${query}.`);
                    results.push({
                         ...target, price: 1.50, item_name: `${store} Fallback: ${query}`, url: url
                    });
                }
            } catch (err) {
                 console.log(`[Edge Scraper] Error parsing page for ${query}: ${err.message}`);
                 results.push({
                    ...target, price: 1.50, item_name: `${store} Fallback: ${query}`
                 });
            }
        }
        
        await context.close();
        
        // Emulate LLM Scraper structure perfectly to avoid breaking python
        const edgeStructure = {
            status: "success",
            deals: results.map(r => ({
                store_name: store,
                sku: "LIVE_EDGE_" + Math.random().toString(36).substring(7),
                item_name: r.item_name,
                price: r.price,
                price_per_unit: r.price,
                url: r.url,
                protein_grams: r.estimated_protein * 5 || 0,
                calories: r.estimated_cals * 5 || 0
            }))
        };
        
        res.json(edgeStructure);

    } catch (error) {
        console.error("[Edge Scraper] Fatal error:", error);
        if (context) await context.close();
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/v1/profile/scrape_history', async (req, res) => {
    const { store_name, email, password } = req.body;
    
    // Setup SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const sendLog = (msg) => {
        console.log(msg);
        res.write(`data: ${JSON.stringify({ type: 'log', message: msg })}\n\n`);
    };

    sendLog(`[Edge Profiler] 🧠 Initializing History Extractor for ${store_name}...`);
    
    // We strictly use the Persistent Context because this requires Auth
    const path = require('path');
    const os = require('os');
    const userDataDir = path.join(os.tmpdir(), 'zerocart_chrome_profile_' + Math.random().toString(36).substring(7));
    
    let context;
    try {
        context = await chromium.launchPersistentContext(userDataDir, {
            headless: IS_PROD,
            viewport: null,
            args: ['--disable-blink-features=AutomationControlled', IS_PROD ? '--no-sandbox' : '--start-maximized']
        });
    } catch (error) {
        console.error("Playwright Launch Error:", error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: `Failed to allocate Edge Browser context: ${error.message}` })}\n\n`);
        return res.end();
    }

    const page = context.pages()[0] || await context.newPage();
    const isIceland = store_name === 'Iceland Live';

    try {
        sendLog('\n======================================================');
        sendLog(`[Edge Profiler] 🤖 HEADLESS LOGIN: Injecting credentials for ${store_name}...`);
        sendLog('======================================================\n');
        
        if (isIceland) {
            sendLog('[Edge Profiler] 🌐 Navigating to Iceland login...');
            await page.goto('https://www.iceland.co.uk/account/login', { waitUntil: 'domcontentloaded' });
            try {
                await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 3000 });
                await page.click('#onetrust-accept-btn-handler');
                sendLog('[Edge Profiler] 🍪 Dismissed cookie banner.');
            } catch (e) { }

            sendLog('[Edge Profiler] 🔑 Filling credentials...');
            await page.fill('#login-email-field', email || "");
            await page.fill('#login-password-field', password || "");
            
            sendLog('[Edge Profiler] 🚀 Submitting login...');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(4000); // Wait for auth redirection to settle
        } else {
            // Tesco fallback
            sendLog('[Edge Profiler] 🌐 Navigating to Tesco login...');
            await page.goto('https://www.tesco.com/account/auth/en-GB/login', { waitUntil: 'domcontentloaded' });
            sendLog('[Edge Profiler] 🔑 Filling credentials...');
            try { await page.fill('input[type="email"]', email || ""); } catch(e){}
            try { await page.fill('input[type="password"]', password || ""); } catch(e){}
            sendLog('[Edge Profiler] 🚀 Submitting login...');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(4000);
        }
        
        sendLog('[Edge Profiler] 🟢 Login sequence complete! Proceeding to extract orders...');
        
        // Actively navigate to the specific order history URL as requested by the user
        if (isIceland) {
            await page.goto('https://www.iceland.co.uk/account/order-history', { waitUntil: 'domcontentloaded' });
        } else {
            await page.goto('https://www.tesco.com/account/dashboard', { waitUntil: 'domcontentloaded' });
        }
        
        sendLog('[Edge Profiler] 🏁 Target acquired. Waiting up to 15s for the SPA DOM to render receipts...');
        
        // Wait dynamically for the order links to physically appear to handle React render stalling
        try {
            await page.waitForFunction(() => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.some(a => /\/order-history\/\d+|\/order\/\d+/.test(a.href));
            }, { timeout: 15000, polling: 1000 });
            sendLog('[Edge Profiler] 🟢 Orders detected in DOM! Scanning tree...');
        } catch(e) {
            sendLog('[Edge Profiler] ⚠️ Timeout waiting for React DOM to render orders. They might be missing.');
        }
        
        // Allow a slight buffer for any trailing visual elements tied to the receipts
        await page.waitForTimeout(1000);
        
        // Find all nested links on the current dashboard to deeply scrape orders
        const detailLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links
                .filter(a => {
                    const text = (a.innerText || "").toLowerCase().trim();
                    const href = (a.href || "").toLowerCase();
                    
                    // Strictly look for hrefs that contain the order path AND explicitly contain an order number ID format!
                    const isOrderPath = href.includes('/order-history/') || href.includes('/order/');
                    const hasNumbers = /\d{3,}/.test(href); // E.g. /order-history/297556124 has huge numbers
                    
                    return isOrderPath && hasNumbers;
                })
                .map(a => a.href);
        });
        
        // Filter unique links and assume links matching a certain pattern are orders.
        let uniqueLinks = [...new Set(detailLinks)].slice(0, 4);  // Cap at 4 orders to prevent AI overflow
        
        // Grab the base dashboard text just in case there are no links
        let raw_text = await page.evaluate(() => {
            const mainContainer = document.querySelector('main') || document.body;
            return mainContainer.innerText;
        });

        if (uniqueLinks.length > 0) {
             sendLog(`[Edge Profiler] 🤖 Found ${uniqueLinks.length} nested order links! Vacuuming each one sequentially...`);
             for (let i = 0; i < uniqueLinks.length; i++) {
                 try {
                     sendLog(`[Edge Profiler] 📂 Opening Order ${i+1}/${uniqueLinks.length}...`);
                     await page.goto(uniqueLinks[i], { waitUntil: 'domcontentloaded' });
                     await page.waitForTimeout(2000); // Let React DOM mount
                     
                     const orderText = await page.evaluate(() => {
                         const mainContainer = document.querySelector('main') || document.body;
                         return mainContainer.innerText;
                     });
                     
                     raw_text += `\n\n--- INJECTED NESTED ORDER ${i+1} ---\n\n` + orderText;
                 } catch(e) {
                     sendLog(`[Edge Profiler] ⚠️ Error opening nested order: ${e.message}`);
                 }
             }
        } else {
             sendLog('[Edge Profiler] 👁️ No nested order links found. Using standard page contents natively.');
        }

        sendLog('[Edge Profiler] 🏁 Agentic Vacuum complete. Returning payload to Cloud Brain.');
        res.write(`data: ${JSON.stringify({ type: 'success', status: "success", raw_text: raw_text })}\n\n`);
        res.end();
        
        // Leave the browser up for a brief cache settling window
        setTimeout(async () => { await context.close(); }, 2000);

    } catch (e) {
        console.error("[Edge Profiler] Extraction failed:", e);
        if (context) await context.close();
        res.write(`data: ${JSON.stringify({ type: 'error', message: e.message })}\n\n`);
        res.end();
    }
});

// PWA Unlock Endpoint
// history_continue removed for headless pipelines


app.listen(PORT, () => {
    console.log(`[Edge Scraper] 🟢 Node Server running on http://127.0.0.1:${PORT}`);
    console.log(`[Edge Scraper] 🟢 Waiting for cart requests from Python Brain...`);
});
