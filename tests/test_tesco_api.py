import requests
import urllib.parse

query = "Garlic"
# Tesco uses this public autocomplete endpoint which doesn't seem heavily cloudflare protected for basic searches
url = f"https://www.tesco.com/groceries/en-GB/search?query={urllib.parse.quote(query)}"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
}

try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Content length: {len(response.text)}")
    if response.status_code == 200:
        # Check if the text contains standard anti-bot phrases or the actual content
        if "enable JavaScript" in response.text or "Cloudflare" in response.text:
            print("BLOCKED BY CLOUDFLARE/BOT PROTECTION")
        else:
            print("SUCCESS! Page fetched. Looking for price data inside inline JSON...")
            # Tesco usually stores hydration state in a window.app.state or similar script tag
            if 'price' in response.text.lower():
                print("Found 'price' keyword in HTML.")
            else:
                print("No price keyword found.")
    else:
        print("Failed to fetch.")
except Exception as e:
    print(f"Error: {e}")
