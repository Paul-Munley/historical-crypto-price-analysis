import requests
import datetime
from typing import List, Dict

def fetch_btc_social_score(days: int = 30) -> List[Dict]:
    """
    Fetch BTC social_score from LunarCrush and simulate 30-day historical trend.

    Since LunarCrush doesn't offer historical data in API v4, we simulate a fake trend
    for chart development/testing purposes.
    """
    url = "https://lunarcrush.com/api4/public/coins/data/v1?symbol=BTC"

    try:
        res = requests.get(url)
        res.raise_for_status()
        btc_data = res.json().get("BTC", {})
        today_score = btc_data.get("social_score", None)
    except Exception as e:
        print(f"[ERROR] Unable to fetch BTC social score: {e}")
        return []

    if today_score is None:
        return []

    # Simulate historical data based on today's score ± random variation
    import random

    data = []
    for i in reversed(range(days)):
        date = (datetime.date.today() - datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        variation = random.randint(-100000, 100000)
        score = max(0, today_score + variation)
        data.append({"date": date, "score": score})

    return data
