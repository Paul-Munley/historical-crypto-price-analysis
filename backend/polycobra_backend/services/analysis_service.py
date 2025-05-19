from typing import List, Dict
import json

from polycobra_backend.services.price_service import fetch_prices, get_ticker_prices
from polycobra_backend.services.event_service import Event, get_event


class ExpectedValue:
    def __init__(self, occurred_percentage, polymarket_odds):
        # Avoid divide-by-zero
        if polymarket_odds in [0, 1]:
            self.yesEv = 0
            self.noEv = 0
        else:
            # Calculate YES EV
            yes_payout = (1 - polymarket_odds) / polymarket_odds
            self.yesEv = round((occurred_percentage * yes_payout) - (1 - occurred_percentage), 2)

            # Calculate NO EV
            no_payout = polymarket_odds / (1 - polymarket_odds)
            self.noEv = round(((1 - occurred_percentage) * no_payout) - occurred_percentage, 2)

        self.yesOdds = polymarket_odds
        self.noOdds = 1 - polymarket_odds


    def __str__(self):
        return json.dumps({'yes': self.yesEv, 'no': self.noEv})


def run_analysis(date_ranges: any,
                 thresholds_by_question: any,
                 event_to_analyze: any,
                 rolling_days: any):

    event: Event = get_event(event_to_analyze)

    historical_prices = []
    for date_range in date_ranges:
        historical_prices += fetch_prices(event.coin_tag.label,
                                          date_range.start,
                                          date_range.end)

    current_price = get_ticker_prices([event.coin_tag])[event.coin_tag]

    target_prices = []
    polymarket_odds = []
    for market in event.markets:
        target_prices.append(float(thresholds_by_question[market.slug]))
        polymarket_odds.append(market.yes_price)

    percent_changes = calculate_percent_changes(current_price, target_prices)

    # "threshold satisfaction occurrence rates"
    tsors = calculate_occurrences(historical_prices, percent_changes, rolling_days)

    tsors_list = [tsors[t] for t in percent_changes]
    expected_values = calculate_expected_values(tsors_list, polymarket_odds)

    result = []
    for i, expected_value in enumerate(expected_values):
        result.append({
            'threshold': target_prices[i],
            'change': percent_changes[i],
            'occurred': tsors_list[i],
            'yesOdds': expected_value.yesOdds,
            'noOdds': expected_value.noOdds,
            'yesEV': expected_value.yesEv,
            'noEV': expected_value.noEv
        })

    return result


def calculate_percent_changes(current_price: float, target_prices: List[float]):
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
