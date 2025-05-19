from typing import List, Dict
import requests
from datetime import datetime
from polycobra_backend.constants.coins import Coin

COINAPI_ROOT = "https://rest.coinapi.io/v1"
COINAPI_KEY = "b9e2a6aa-f61b-4050-b3de-70c828e574e3"
SECONDS_PER_DAY = 86400

# Maps coin label → CoinAPI format
SYMBOL_MAP = {
    "BTC": "BINANCE_SPOT_BTC_USDT",
    "ETH": "BINANCE_SPOT_ETH_USDT",
    "XRP": "BINANCE_SPOT_XRP_USDT",
    "DOGE": "BINANCE_SPOT_DOGE_USDT",
    "SOL": "BINANCE_SPOT_SOL_USDT",
}

def get_ticker_prices(coins: List[Coin]) -> Dict[Coin, float]:
    """
    Fetches the latest USD ticker prices for the given list of coins from CoinAPI.
    """
    prices: Dict[Coin, float] = {}

    for coin in coins:
        symbol_id = SYMBOL_MAP.get(coin.label.upper())
        if not symbol_id:
            raise ValueError(f"No CoinAPI symbol mapping for {coin.label}")

        url = f"{COINAPI_ROOT}/quotes/current?filter_symbol_id={symbol_id}"
        headers = {"X-CoinAPI-Key": COINAPI_KEY}

        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            raise Exception(f"Failed to fetch data for {coin.label}: {res.text}")

        data = res.json()

        # 🔍 Debug print to inspect structure
        print(f"[DEBUG] CoinAPI response for {coin.label}: {data}")

        if isinstance(data, list) and data:
            entry = data[0]
            price = entry.get("price_mid") or entry.get("price_ask") or entry.get("price_bid")

            # Fallback to last_trade if necessary
            if price is None and "last_trade" in entry and "price" in entry["last_trade"]:
                price = entry["last_trade"]["price"]

            if price is None:
                raise Exception(f"No usable price field found in response: {entry}")

            prices[coin] = float(price)
        else:
            raise Exception(f"Unexpected response structure for {coin.label}: {data}")

    return prices
    """
    Fetches the latest USD ticker prices for the given list of coins from CoinAPI.

    Args:
        coins (List[Coin]): A list of Coin enum members to retrieve prices for.

    Returns:
        Dict[Coin, float]: A dictionary mapping each Coin to its current USD price.
    """
    prices: Dict[Coin, float] = {}

    for coin in coins:
        symbol_id = SYMBOL_MAP.get(coin.label.upper())
        if not symbol_id:
            raise ValueError(f"No CoinAPI symbol mapping for {coin.label}")

        url = f"{COINAPI_ROOT}/quotes/current?filter_symbol_id={symbol_id}"
        headers = {"X-CoinAPI-Key": COINAPI_KEY}

        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            raise Exception(f"Failed to fetch data for {coin.label}: {res.text}")

        data = res.json()
        if isinstance(data, list) and data:
            prices[coin] = float(data[0]["price_mid"])
        else:
            raise Exception(f"Unexpected response structure for {coin.label}: {data}")

    return prices


def get_timestamp(date_string: str) -> str:
    return datetime.strptime(date_string, "%Y-%m-%d").isoformat()


def fetch_prices(symbol: str, start: str, end: str) -> List[float]:
    """
    Fetches historical daily closing prices for a symbol from CoinAPI.
    """
    symbol_id = SYMBOL_MAP.get(symbol.upper(), f"BINANCE_SPOT_{symbol.upper()}_USDT")
    period_id = "1DAY"
    time_start = get_timestamp(start)
    time_end = get_timestamp(end)

    url = (
        f"{COINAPI_ROOT}/ohlcv/{symbol_id}/history"
        f"?period_id={period_id}"
        f"&time_start={time_start}"
        f"&time_end={time_end}"
    )

    headers = {"X-CoinAPI-Key": COINAPI_KEY}

    print(f"[DEBUG] Requesting {symbol} from {start} to {end}")
    print(f"[DEBUG] Full URL: {url}")

    res = requests.get(url, headers=headers)
    if res.status_code != 200:
        raise Exception(f"Failed to fetch data: {res.status_code} {res.text}")

    data = res.json()
    prices = [entry["price_close"] for entry in data if "price_close" in entry]

    print(f"[DEBUG] Fetched {len(prices)} prices. Sample: {prices[:5]}")
    return prices


if __name__ == '__main__':
    print(get_ticker_prices([Coin.BTC]))
