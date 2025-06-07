import os
from dotenv import load_dotenv
import requests
from datetime import datetime
from typing import List, Dict

load_dotenv()
FRED_STL_API_KEY = os.getenv("FRED_STL_API_KEY")
FRED_API_BASE = "https://api.stlouisfed.org/fred"

def fetch_dxy_series(start_date: str = "2020-01-01") -> List[Dict]:
    url = f"{FRED_API_BASE}/series/observations"
    params = {
        "series_id": "DTWEXBGS",
        "api_key": FRED_STL_API_KEY,
        "file_type": "json",
        "observation_start": start_date,
        "frequency": "m"
    }

    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    return [
        {
            "date": obs["date"],
            "value": float(obs["value"])
        }
        for obs in data.get("observations", [])
        if obs["value"] != "."
    ]

def calculate_yoy_growth(observations: List[Dict]) -> List[Dict]:
    enriched = []
    for i in range(12, len(observations)):
        current = observations[i]
        previous = observations[i - 12]
        yoy_growth = ((current["value"] - previous["value"]) / previous["value"]) * 100
        enriched.append({
            "date": current["date"],
            "value": current["value"],
            "yoy_growth": round(yoy_growth, 2)
        })
    return enriched

def generate_summary_string(observations: List[Dict]) -> str:
    current = observations[-1]
    last_month = observations[-2]
    year_ago = observations[-13]

    current_yoy = round(current["yoy_growth"], 2)
    last_month_yoy = round(last_month["yoy_growth"], 2)
    year_ago_yoy = round(year_ago["yoy_growth"], 2)

    long_term_avg = 2.90  # Based on long-term DXY YoY behavior historically

    comparison = "lower than" if current_yoy < long_term_avg else "higher than"

    return (
        f"DXY YoY is at {current_yoy:.2f}%, compared to {last_month_yoy:.2f}% last month "
        f"and {year_ago_yoy:.2f}% last year. This is {comparison} the long term average of {long_term_avg:.2f}%."
    )
