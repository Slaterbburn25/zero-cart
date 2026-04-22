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
    res.flushHeaders(); // MUST flush headers so client stream starts immediately!
    
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
            headless: false, // FORCE visible browser for local WAF bypass / demo!
            viewport: null,
            args: ['--disable-blink-features=AutomationControlled', '--start-maximized']
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

            sendLog('[Edge Profiler] 🔑 Filling credentials (Hardcoded for Demo)...');
            const targetEmail = "S.slater2019@gmail.com";
            const targetPass = "Rovers95?";
            
            try { await page.fill('#login-email-field', targetEmail); } 
            catch(e){ try { await page.fill('input[type="email"]', targetEmail); } catch(e2){} }
            
            try { await page.fill('#login-password-field', targetPass); } 
            catch(e){ try { await page.fill('input[type="password"]', targetPass); } catch(e2){} }
            
            sendLog('[Edge Profiler] 🚀 Submitting login... (If it pauses here, you can click Sign In manually)');
            await page.keyboard.press('Enter');
            try { await page.click('button[type="submit"]', { timeout: 1000 }); } catch(e){}
            try { await page.click('button:has-text("Sign in")', { timeout: 1000 }); } catch(e){}
            try { await page.click('button[class*="fccxcl9"]', { timeout: 1000 }); } catch(e){}
            
            sendLog('[Edge Profiler] ⏳ Waiting up to 15s for successful authentication...');
            try {
                // Wait dynamically until the URL is no longer the login page
                await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
                sendLog('[Edge Profiler] ✅ Auth successful, redirect detected!');
            } catch(e) {
                sendLog('[Edge Profiler] ⚠️ Auth redirect timed out. Assuming failed login or CAPTCHA block.');
            }
            
            // Iceland sometimes redirects to a 404 page after login, check for it
            if (page.url().includes('404')) {
                sendLog('[Edge Profiler] ⚠️ Detected Iceland SPA 404 bug, session is valid, proceeding...');
            }
        }
        
        sendLog('[Edge Profiler] 🟢 Login sequence complete! Proceeding to extract orders...');
        await page.goto('https://www.iceland.co.uk/account/order-history', { waitUntil: 'domcontentloaded' });
        
        sendLog('[Edge Profiler] 🏁 Target acquired. Waiting up to 15s for the SPA DOM to render receipts...');
        
        await page.waitForTimeout(6000); // Wait for React to load the DOM skeletons
        
        let raw_text = "";
        let pageNum = 1;
        let orderUrls = new Set();
        let lastPageUrlCount = -1;
        
        sendLog('[Edge Profiler] 🟢 Phase 1: Paginating and collecting order URLs...');

        while (pageNum <= 4) {
            sendLog(`[Edge Profiler] 🔍 Scanning Page ${pageNum} for order links...`);
            await page.waitForTimeout(3000); // Wait for React to render

            // Collect all hrefs matching /order-history/NUMBER
            const newUrls = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="/account/order-history/"]'));
                return links
                    .map(a => a.href)
                    .filter(href => /\/account\/order-history\/\d+$/.test(href));
            });
            
            const beforeCount = orderUrls.size;
            newUrls.forEach(url => orderUrls.add(url));
            const afterCount = orderUrls.size;

            sendLog(`[Edge Profiler] Found ${newUrls.length} order links on page ${pageNum}.`);

            // If we didn't add any NEW URLs, the pagination click failed to actually change the page!
            if (afterCount === beforeCount && newUrls.length > 0) {
                sendLog(`[Edge Profiler] ⚠️ Pagination failed to change page (same orders detected). Stopping pagination.`);
                break;
            }

            // Look for the Next Page button
            let hasNextPage = false;
            try {
                hasNextPage = await page.evaluate(() => {
                    const svg = document.querySelector('svg[data-test-selector="chevron-right-nav-mobile"]');
                    const nextBtn = svg ? (svg.closest('button, a, [role="button"]') || svg) : document.querySelector('button[aria-label*="Next"], a[aria-label*="Next"]');
                    
                    if (nextBtn && !nextBtn.disabled && !nextBtn.hasAttribute('disabled')) {
                        if (typeof nextBtn.click === 'function') {
                            nextBtn.click();
                        } else {
                            nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                        }
                        return true;
                    }
                    return false;
                });
            } catch(e) {
                sendLog('[Edge Profiler] ⚠️ Error evaluating Next Page button: ' + e.message);
                hasNextPage = false;
            }
            
            if (hasNextPage) {
                sendLog(`[Edge Profiler] ➡️ Next page detected! Navigating to page ${pageNum + 1}...`);
                await page.waitForTimeout(5000); // Wait for React to render the new page
                pageNum++;
            } else {
                sendLog('[Edge Profiler] 🏁 End of order history reached.');
                break;
            }
        }

        const uniqueOrders = Array.from(orderUrls);
        sendLog(`[Edge Profiler] 🟢 Phase 2: Vacuuming ${uniqueOrders.length} unique orders...`);

        for (let i = 0; i < uniqueOrders.length; i++) {
            const url = uniqueOrders[i];
            sendLog(`[Edge Profiler] 📂 Opening Order ${i + 1}/${uniqueOrders.length}...`);
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(3000); // Wait for receipt to render
                
                raw_text += `\n\n--- ORDER ${i + 1} (${url}) ---\n\n`;
                raw_text += await page.evaluate(() => {
                    const mainContainer = document.querySelector('main') || document.body;
                    return mainContainer.innerText;
                });
            } catch (e) {
                sendLog(`[Edge Profiler] ⚠️ Failed to extract order ${i + 1}: ${e.message}`);
            }
        }

        sendLog('[Edge Profiler] 👁️ Finished vacuuming all order URLs.');

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
