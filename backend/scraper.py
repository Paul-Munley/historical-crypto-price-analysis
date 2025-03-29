import re
import time
from playwright.sync_api import sync_playwright

COINS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "XRP": "xrp"
}

def fetch_polymarket_odds():
    odds = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        for symbol, coin in COINS.items():
            odds[symbol] = {}
            try:
                url = f"https://polymarket.com/event/what-price-will-{coin}-hit-by-march-31"
                print(f"[DEBUG] Visiting: {url}")
                page.goto(url, timeout=30000)

                # Wait for markets to load
                page.wait_for_selector("a[href^='/market/']", timeout=15000)
                market_links = page.query_selector_all("a[href^='/market/']")

                for link in market_links:
                    label = link.inner_text().strip()
                    match = re.search(r"\$(\d+(?:,\d+)*(?:\.\d+)?)", label)
                    if match:
                        price_str = match.group(1).replace(",", "")
                        price = float(price_str)
                        # Look for Yes/No market odds within the child elements
                        yes_elem = link.query_selector("[data-testid='market-yes-price']")
                        no_elem = link.query_selector("[data-testid='market-no-price']")

                        if yes_elem and no_elem:
                            yes = yes_elem.inner_text().replace("%", "").strip()
                            no = no_elem.inner_text().replace("%", "").strip()
                            odds[symbol][price] = {
                                "yes": float(yes) if yes else None,
                                "no": float(no) if no else None
                            }
            except Exception as e:
                print(f"[ERROR] Failed to scrape {symbol}: {e}")

        browser.close()
    print("[DEBUG] Polymarket Odds:", odds)
    return odds
