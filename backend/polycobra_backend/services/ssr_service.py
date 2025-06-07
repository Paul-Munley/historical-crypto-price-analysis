import requests
from typing import Dict

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# CoinGecko IDs for the tokens we care about
STABLECOIN_IDS = ["tether", "usd-coin", "dai"]
BTC_ID = "bitcoin"

def fetch_coin_data(coin_id: str) -> Dict:
    url = f"{COINGECKO_BASE}/coins/{coin_id}"
    params = {
        "localization": "false",
        "tickers": "false",
        "market_data": "true"
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()

def get_btc_market_cap() -> float:
    btc_data = fetch_coin_data(BTC_ID)
    return btc_data["market_data"]["market_cap"]["usd"]

def get_total_stablecoin_supply() -> float:
    total_supply = 0
    for coin_id in STABLECOIN_IDS:
        data = fetch_coin_data(coin_id)
        supply = data["market_data"]["circulating_supply"]
        total_supply += supply
    return total_supply

def calculate_ssr() -> Dict:
    btc_market_cap = get_btc_market_cap()
    stablecoin_supply = get_total_stablecoin_supply()
    ssr = round(btc_market_cap / stablecoin_supply, 2)

    summary = (
        f"SSR is at {ssr}, calculated as BTC market cap divided by total circulating "
        f"supply of USDT, USDC, and DAI. A lower SSR suggests more stablecoin dry powder."
    )

    return {
        "value": ssr,
        "summary": summary
    }
