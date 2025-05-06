from typing import List, Dict
import json

from polycobra_backend.constants.coins import Coin
from polycobra_backend.services.price_service import fetch_prices


class ExpectedValue:
    def __init__(self, occurred_percentage, polymarket_odds):
        self.yes = round(((occurred_percentage * (1 / polymarket_odds)) - (1 - occurred_percentage)) * 100, 2)
        self.no = round((((1 - occurred_percentage) * (1 / (1 - polymarket_odds))) - occurred_percentage) * 100, 2)

    def __str__(self):
        return json.dumps({'yes': self.yes, 'no': self.no})


def run_analysis():
    current_prices = {
        Coin.BTC: 96715.01,
        Coin.ETH: 1840.96,
        Coin.SOL: 148.01,
        Coin.XRP: 2.20
    }

    target_prices = {
        Coin.BTC: [
            97000.00,
            96715.01,
            99000.00,
            100000.00,
            110000.00,
            120000.00,
            130000.00
        ],
        Coin.ETH: [
            2000.00,
            3000.00,
            4000.00,
            5000.00,
            6000.00,
            7000.00,
            8000.00
        ],
        Coin.SOL: [
            150.00,
            160.00,
            170.00,
            180.00,
            190.00,
            200.00,
            210.00
        ],
        Coin.XRP: [
            3.00,
            4.00,
            5.00,
            6.00,
            7.00,
            8.00,
            9.00
        ]
    }

    polymarket_odds_by_coin = {
        Coin.BTC: [
            10.00,
            9.00,
            8.00,
            7.00,
            6.00,
            5.00,
            4.00
        ]
    }

    rolling_days = 3

    historical_prices = fetch_prices('BTC', 'USD', '2024-01-01', '2024-02-01')

    current_price = current_prices[Coin.BTC]
    target_prices = target_prices[Coin.BTC]
    polymarket_odds = polymarket_odds_by_coin[Coin.BTC]

    thresholds = calculate_thresholds(current_price, target_prices)

    # "threshold satisfaction occurrence rates"
    tsors = calculate_occurrences(historical_prices, thresholds, rolling_days)

    tsors_list = [tsors[t] for t in thresholds]
    expected_values = calculate_expected_values(tsors_list, polymarket_odds)

    print()


def calculate_thresholds(current_price: float, target_prices: List[float]):
    thresholds = []
    for target_price in target_prices:
        threshold = ((target_price - current_price) / current_price) * 100
        thresholds.append(round(threshold, 2))

    return thresholds


def calculate_occurrences(historical_prices: List[float], thresholds: List[float], rolling_days: int) -> Dict[float, float]:
    total_windows = len(historical_prices) - rolling_days
    occurrences = {t: 0 for t in thresholds}
    for i in range(total_windows):
        start_price = historical_prices[i]

        # Skip if start_price is zero to avoid divide-by-zero errors
        if start_price == 0:
            continue

        found = set()
        for j in range(1, rolling_days + 1):
            end_price = historical_prices[i + j]

            percent_change = ((end_price - start_price) / start_price) * 100

            for threshold in thresholds:
                if threshold in found:
                    continue

                if 0 <= threshold <= percent_change:
                    occurrences[threshold] += 1
                    found.add(threshold)

                elif 0 > threshold >= percent_change:
                    occurrences[threshold] += 1
                    found.add(threshold)

    return {
        t: round((occurrences[t] / total_windows) * 100, 2)
        if total_windows > 0 else "N/A"
        for t in thresholds
    }


def calculate_expected_values(occurred_percentages: List[float], polymarket_odds_list: List[float]):
    if len(occurred_percentages) != len(polymarket_odds_list):
        raise ValueError('occurred_percentages and polymarket_odds arrays must have equal length')

    expected_values = []
    for occurred_percentage, polymarket_odds in list(zip(occurred_percentages, polymarket_odds_list)):
        expected_values.append(ExpectedValue(occurred_percentage, polymarket_odds))

    return expected_values


if __name__ == '__main__':
    run_analysis()
