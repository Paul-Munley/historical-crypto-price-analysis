from typing import List, Dict
import requests
from datetime import datetime

from polycobra_backend.constants.third_party_endpoints import COINDESK_ROOT, COIN_MARKET_CAP_ROOT
from polycobra_backend.constants.coins import Coin

CMC_KEY = 'feb05f2a-3d5f-4db4-be8a-4ea89bd64521'

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


def fetch_prices(symbol: str, start: str, end: str) -> List[float]:
    # Coindesk format: "BTC-USD"
    instrument = SYMBOL_MAP.get(symbol.lower(), f"{symbol.upper()}-USD")
    market = "kraken"

    start_ts = get_timestamp(start)
    end_ts = get_timestamp(end)

    # Calculate the number of days to fetch
    num_days = (end_ts - start_ts) // 86400
    if num_days > 30:
        raise ValueError("Coindesk API limit is 30 days per request.")

    url = (
        "https://data-api.coindesk.com/spot/v1/historical/days"
        f"?market={market}"
        f"&instrument={instrument}"
        f"&limit={num_days}"
        f"&aggregate=1"
        f"&fill=true"
        f"&apply_mapping=true"
        f"&response_format=JSON"
        f"&to_ts={end_ts}"
    )

    print(f"[DEBUG] Requesting {symbol} from {start} to {end} (days={num_days})")
    print(f"[DEBUG] Full URL: {url}")

    res = requests.get(url)
    if res.status_code != 200:
        raise Exception(f"Failed to fetch data: {res.text}")

    data = res.json().get("Data", [])
    prices = [entry["CLOSE"] for entry in data if "CLOSE" in entry]

    print(f"[DEBUG] Fetched {len(prices)} prices. Sample: {prices[:5]}")
    return prices


if __name__ == '__main__':
    print(get_ticker_prices([Coin.BTC]))
