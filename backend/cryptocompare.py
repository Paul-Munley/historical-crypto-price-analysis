import requests
from datetime import datetime
from typing import List

# Updated symbol mappings including SOLANA → SOL
SYMBOL_MAP = {
    "bitcoin": "BTC",
    "ethereum": "ETH",
    "ripple": "XRP",
    "cardano": "ADA",
    "dogecoin": "DOGE",
    "litecoin": "LTC",
    "solana": "SOL",  # ✅ Add SOL mapping
    # Add others here as needed
}

def fetch_prices(symbol: str, currency: str, start: str, end: str) -> List[float]:
    # Normalize and map coin name to its ticker symbol
    symbol = SYMBOL_MAP.get(symbol.lower(), symbol.upper())  # fallback to .upper()

    start_ts = int(datetime.strptime(start, "%Y-%m-%d").timestamp())
    end_ts = int(datetime.strptime(end, "%Y-%m-%d").timestamp())

    limit = (end_ts - start_ts) // 86400
    if limit > 2000:
        raise ValueError("CryptoCompare max limit is 2000 days per request.")

    url = (
        f"https://min-api.cryptocompare.com/data/v2/histoday"
        f"?fsym={symbol}&tsym={currency.upper()}&toTs={end_ts}&limit={limit}"
    )

    print(f"[DEBUG] Requesting {symbol} from {start} to {end} (limit={limit})")
    print(f"[DEBUG] Full URL: {url}")

    res = requests.get(url)
    if res.status_code != 200:
        raise Exception(f"Failed to fetch data: {res.text}")

    data = res.json().get("Data", {}).get("Data", [])
    prices = [day["close"] for day in data if "close" in day]

    print(f"[DEBUG] Fetched {len(prices)} prices. Sample: {prices[:5]}")
    return prices
