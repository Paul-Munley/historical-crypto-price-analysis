import requests


def get_coinpaprika_id(symbol: str) -> str:
    symbol = symbol.lower()
    known_ids = {
        "bitcoin": "btc-bitcoin",
        "ethereum": "eth-ethereum",
        "solana": "sol-solana",
        "ripple": "xrp-xrp",
        "dogecoin": "doge-dogecoin",
        "cardano": "ada-cardano",
        "litecoin": "ltc-litecoin",
        "chainlink": "link-chainlink",
    }
    return known_ids.get(symbol, f"{symbol[:3]}-{symbol}")


def fetch_prices(coin: str, currency: str, start_date: str, end_date: str) -> list[float]:
    coin_id = get_coinpaprika_id(coin)
    url = f"https://api.coinpaprika.com/v1/coins/{coin_id}/ohlcv/historical"
    params = {
        "start": start_date,
        "end": end_date
    }

    response = requests.get(url, params=params)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch data: {response.text}")

    data = response.json()
    return [entry["close"] for entry in data if "close" in entry]
