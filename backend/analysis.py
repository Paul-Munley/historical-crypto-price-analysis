from cryptocompare import fetch_prices  # Ensure this is at the top of the file
from typing import Dict, List
import statistics

def calculate_occurrences(prices: List[float], thresholds: List[float], days: int) -> Dict[float, float]:
    total_windows = 0
    occurrences = {t: 0 for t in thresholds}

    for i in range(len(prices) - days):
        start_price = prices[i]

        # ✅ Skip if start_price is zero to avoid divide-by-zero errors
        if start_price == 0:
            continue

        found = set()

        for j in range(1, days + 1):
            end_price = prices[i + j]

            pct_change = ((end_price - start_price) / start_price) * 100

            for threshold in thresholds:
                if threshold >= 0 and pct_change >= threshold and threshold not in found:
                    occurrences[threshold] += 1
                    found.add(threshold)
                elif threshold < 0 and pct_change <= threshold and threshold not in found:
                    occurrences[threshold] += 1
                    found.add(threshold)

        total_windows += 1

    return {
        t: round((occurrences[t] / total_windows) * 100, 2)
        if total_windows > 0 else "N/A"
        for t in thresholds
    }

def aggregate_results_per_coin(coin_results: List[Dict]) -> Dict:
    if not coin_results:
        return {}

    thresholds = list(coin_results[0]["results"].keys())

    per_coin = [
        {"coin": result["coin"], "results": result["results"]} for result in coin_results
    ]

    average = {
        t: round(statistics.mean([r["results"][t] for r in coin_results if isinstance(r["results"][t], (int, float))]), 2)
        for t in thresholds
    }

    return {
        "per_coin": per_coin,
        "average": average
    }


def run_analysis(cryptos: List[str], date_ranges: List[Dict], days: int) -> Dict[str, Dict[float, float]]:
    """
    Given a list of coins, date ranges, and rolling day window,
    return a dict of % change occurrence rates for common thresholds.
    """
    thresholds = [-50, -40, -30, -20, -10, 10, 20, 30, 40, 50]  # Example default thresholds
    results = {}

    for coin in cryptos:
        all_prices = []

        for range_entry in date_ranges:
            start = range_entry["start"]
            end = range_entry["end"]

            price_data = fetch_prices(coin, 'USD', start, end)
            all_prices.extend(price_data)

        if all_prices:
            result = calculate_occurrences(all_prices, thresholds, days)
            results[coin] = result
        else:
            results[coin] = {}

    return results

