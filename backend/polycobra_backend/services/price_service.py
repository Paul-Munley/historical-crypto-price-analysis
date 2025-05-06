from typing import List, Dict
import requests
from datetime import datetime

from polycobra_backend.constants.third_party_endpoints import COINDESK_ROOT, CRYPTOCOMPARE_ROOT
from polycobra_backend.constants.coins import Coin

SECONDS_PER_DAY = 86400

# Updated symbol mappings including SOLANA → SOL
SYMBOL_MAP = {
    "bitcoin": "BTC",
    "ethereum": "ETH",
    "ripple": "XRP",
    "cardano": "ADA",
    "dogecoin": "DOGE",
    "litecoin": "LTC",
    "solana": "SOL"
}


def get_ticker_prices(coins: List[Coin]) -> Dict[Coin, float]:
    """
    Fetches the latest USD ticker prices for the given list of coins from the Coindesk API.

    Args:
        coins (List[Coin]): A list of Coin enum members to retrieve prices for.

    Returns:
        Dict[Coin, float]: A dictionary mapping each Coin to its current USD price.
    """

    formatted_ticker_list: str = ','.join([f"{coin.value}-USD" for coin in coins])
    url = f"{COINDESK_ROOT}/spot/v1/latest/tick?market=coinbase&instruments={formatted_ticker_list}"

    data_by_coin: Dict[str, any] = requests.get(url).json()['Data']

    ticker_prices: Dict[Coin, float] = {}
    for coin_str, coin_data in data_by_coin.items():
        coin = Coin.from_label(coin_str.split('-')[0])
        ticker_prices[coin] = float(coin_data['PRICE'])

    return ticker_prices


def get_timestamp(date_string: str) -> int:
    return int(datetime.strptime(date_string, "%Y-%m-%d").timestamp())


def fetch_prices(symbol: str, currency: str, start: str, end: str) -> List[float]:
    # Normalize and map coin name to its ticker symbol
    symbol = SYMBOL_MAP.get(symbol.lower(), symbol.upper())  # fallback to .upper()

    start_ts = get_timestamp(start)
    end_ts = get_timestamp(end)

    limit = (end_ts - start_ts) // SECONDS_PER_DAY
    if limit > 2000:
        raise ValueError("CryptoCompare max limit is 2000 days per request.")

    url = f"https://{CRYPTOCOMPARE_ROOT}?fsym={symbol}&tsym={currency.upper()}&toTs={end_ts}&limit={limit}"

    print(f"[DEBUG] Requesting {symbol} from {start} to {end} (limit={limit})")
    print(f"[DEBUG] Full URL: {url}")

    res = requests.get(url)
    if res.status_code != 200:
        raise Exception(f"Failed to fetch data: {res.text}")

    data = res.json().get("Data", {}).get("Data", [])
    prices = [day["close"] for day in data if "close" in day]

    print(f"[DEBUG] Fetched {len(prices)} prices. Sample: {prices[:5]}")
    return prices


if __name__ == '__main__':
    print(get_ticker_prices([Coin.BTC]))
