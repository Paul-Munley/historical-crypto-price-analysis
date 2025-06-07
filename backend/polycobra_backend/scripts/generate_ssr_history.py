import requests
import time
import datetime
import json
import os
from typing import Dict, List

# Need to come back to this to pull the circ supply hx for USDT and USDC. Kept getting rate limited and no data for this date returned. This will allow you to add a chart to the SSR.

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
STABLECOINS = {
    "tether": "usdt",
    "usd-coin": "usdc"
}
DAYS_BACK = 365
OUTPUT_DIR = "./data"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def fetch_historical_data(coin_id: str, date_str: str) -> Dict:
    url = f"{COINGECKO_BASE}/coins/{coin_id}/history"
    params = {"date": date_str, "localization": "false"}

    for attempt in range(5):
        response = requests.get(url, params=params)
        if response.status_code == 429:
            print(f"Rate limited on {coin_id} {date_str}, retrying... (attempt {attempt + 1})")
            time.sleep(2 + attempt * 1.5)
            continue
        response.raise_for_status()
        return response.json()

    raise Exception(f"Rate limited repeatedly on {coin_id} {date_str}")


def get_formatted_date(days_ago: int) -> str:
    target_date = datetime.date.today() - datetime.timedelta(days=days_ago)
    return target_date.strftime("%d-%m-%Y")


def load_existing_history(file_path: str) -> Dict[str, float]:
    if not os.path.exists(file_path):
        return {}

    with open(file_path, "r") as f:
        try:
            data = json.load(f)
            return {entry["date"]: entry["supply"] for entry in data}
        except json.JSONDecodeError:
            return {}


def generate_supply_history(coin_id: str, short_name: str, days: int = DAYS_BACK) -> List[Dict]:
    history = []
    file_path = f"{OUTPUT_DIR}/{short_name}_supply_history.json"
    existing = load_existing_history(file_path)

    for day_offset in range(days):
        date_str = get_formatted_date(day_offset)
        iso_date = datetime.datetime.strptime(date_str, "%d-%m-%Y").strftime("%Y-%m-%d")

        if iso_date in existing:
            history.append({"date": iso_date, "supply": existing[iso_date]})
            continue

        print(f"[{short_name.upper()}] Fetching data for {date_str}...")

        try:
            data = fetch_historical_data(coin_id, date_str)
            supply = data["market_data"].get("circulating_supply", 0)
            if not supply:
                print(f"No supply data for {short_name.upper()} on {date_str}")
                continue

            history.append({
                "date": iso_date,
                "supply": round(supply, 2)
            })

        except Exception as e:
            print(f"Skipping {short_name.upper()} on {date_str}: {e}")
            continue

        time.sleep(1.1)  # between coins
    return list(sorted(history, key=lambda x: x["date"]))


if __name__ == "__main__":
    print("Generating stablecoin supply histories...")

    for coin_id, short_name in STABLECOINS.items():
        file_path = f"{OUTPUT_DIR}/{short_name}_supply_history.json"
        history = generate_supply_history(coin_id, short_name)
        with open(file_path, "w") as f:
            json.dump(history, f, indent=2)
        print(f"✅ Saved {len(history)} days to {file_path}")
        time.sleep(2)  # delay between coins
