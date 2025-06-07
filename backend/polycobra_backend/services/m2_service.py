import os
from dotenv import load_dotenv
import requests
from datetime import datetime
from typing import List, Dict

load_dotenv()
FRED_STL_API_KEY = os.getenv("FRED_STL_API_KEY")
FRED_API_BASE = "https://api.stlouisfed.org/fred"


def fetch_m2_series(start_date: str = "2020-01-01") -> List[Dict]:
    """
    Fetches monthly M2 money supply levels from FRED starting at a given date.
    Returns a list of observations with date and value.
    """
    url = f"{FRED_API_BASE}/series/observations"
    params = {
        "series_id": "M2SL",
        "api_key": FRED_STL_API_KEY,
        "file_type": "json",
        "observation_start": start_date,
        "frequency": "m"
    }

    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    # Filter & clean observations
    return [
        {
            "date": obs["date"],
            "value": float(obs["value"])
        }
        for obs in data.get("observations", [])
        if obs["value"] != "."
    ]

def calculate_yoy_growth(observations: List[Dict]) -> List[Dict]:
    """
    Adds YoY growth to each observation based on 12-month difference.
    """
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
    """
    Generates a simpler YoY-based summary string similar to YCharts.
    """
    current = observations[-1]
    last_month = observations[-2]
    year_ago = observations[-13]

    current_yoy = round(current["yoy_growth"], 2)
    last_month_yoy = round(last_month["yoy_growth"], 2)
    year_ago_yoy = round(year_ago["yoy_growth"], 2)

    long_term_avg = 6.85  # Optional: make this configurable if needed

    comparison = (
        "lower than" if current_yoy < long_term_avg else "higher than"
    )

    return (
        f"US M2 Money Supply YoY is at {current_yoy:.2f}%, "
        f"compared to {last_month_yoy:.2f}% last month and {year_ago_yoy:.2f}% last year. "
        f"This is {comparison} the long term average of {long_term_avg:.2f}%."
    )
