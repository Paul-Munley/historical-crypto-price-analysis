from typing import List, Dict
import json

from polycobra_backend.services.price_service import fetch_prices, get_ticker_prices
from polycobra_backend.services.event_service import Event, safe_get_event_by_slug, safe_get_event_by_market_slug
from polycobra_backend.services.parse_service import extract_threshold_from_question


class ExpectedValue:
    def __init__(self, occurred_percentage, polymarket_odds):
        if polymarket_odds in [0, 1]:
            self.yesEv = 0
            self.noEv = 0
        else:
            yes_payout = (1 - polymarket_odds) / polymarket_odds
            self.yesEv = round(((occurred_percentage * yes_payout) - (1 - occurred_percentage)) * 100, 1)

            no_payout = polymarket_odds / (1 - polymarket_odds)
            self.noEv = round((((1 - occurred_percentage) * no_payout) - occurred_percentage) * 100, 1)

        self.yesOdds = polymarket_odds
        self.noOdds = 1 - polymarket_odds

    def __str__(self):
        return json.dumps({'yes': self.yesEv, 'no': self.noEv})


def passes_all_momentum_filters(historical_prices, index, filters):
    for f in filters:
        lookback_candles = f.get("lookbackCandles")
        min_change = f.get("minPercentChange")
        max_change = f.get("maxPercentChange")

        if lookback_candles is None:
            continue

        if index < lookback_candles:
            return False

        current_price = historical_prices[index]
        past_price = historical_prices[index - lookback_candles]

        actual_change = ((current_price - past_price) / past_price) * 100

        if min_change is not None and actual_change < min_change:
            return False
        if max_change is not None and actual_change > max_change:
            return False

    return True


def _resolve_market_threshold(market, thresholds_by_question: dict):
    threshold_value = thresholds_by_question.get(market.slug)
    if threshold_value not in [None, ""]:
        return float(threshold_value)

    parsed_threshold = extract_threshold_from_question(str(market.question))
    if parsed_threshold in [None, -1]:
        return None

    thresholds_by_question[market.slug] = parsed_threshold
    return float(parsed_threshold)


def run_analysis(date_ranges: any,
                 thresholds_by_question: any,
                 event_to_analyze: any,
                 rolling_days: any,
                 momentum_confluence: dict = None,
                 rolling_unit: str = "days",
                 use_hit_logic: bool = False):

    event: Event = safe_get_event_by_slug(event_to_analyze["slug"])
    if event is None:
        event = safe_get_event_by_market_slug(event_to_analyze["slug"])
    if event is None:
        raise ValueError(f"Could not resolve event for slug '{event_to_analyze.get('slug')}'")
    if event.coin_tag is None:
        raise ValueError(f"Resolved event '{event.slug}' is missing a coin tag")

    unsupported_market = next(
        (
            market for market in event.markets
            if getattr(market, "yes_label", "Yes") != "Yes"
            or getattr(market, "no_label", "No") != "No"
            or "between" in str(market.question).lower()
            or "hit" in str(market.question).lower()
        ),
        None,
    )
    if unsupported_market is not None:
        raise ValueError(
            "Legacy analyze only supports simple close-above/close-below threshold ladders. "
            "Use the research engine for range, hit, or directional contracts."
        )

    historical_prices = []
    for date_range in date_ranges:
        historical_prices += fetch_prices(event.coin_tag.label,
                                          date_range.start,
                                          date_range.end,
                                          rolling_unit)

    current_price = get_ticker_prices([event.coin_tag])[event.coin_tag]

    print(f"[DEBUG] event_to_analyze: {event_to_analyze}")

    target_prices = []
    polymarket_odds = []
    for market in event.markets:
        threshold_value = _resolve_market_threshold(market, thresholds_by_question)
        if threshold_value is None:
            continue

        target_prices.append(threshold_value)
        polymarket_odds.append(market.yes_price)

    if not target_prices:
        raise ValueError("No usable market thresholds were available for the selected event")

    percent_changes = calculate_percent_changes(current_price, target_prices)

    already_met_flags = []
    for target in target_prices:
        already_met = current_price >= target
        already_met_flags.append(already_met)
        print(f"Current: {current_price}, Target: {target}, Already Met: {already_met}")

    if event_to_analyze.get("duration_type") == "daily":
        tsors = calculate_occurrences(
        historical_prices=historical_prices,
        current_price=current_price,
        target_prices=target_prices,
        thresholds=percent_changes,
        rolling_days=rolling_days,
        momentum_confluence=momentum_confluence
    )
        print("Using FIXED INTERVAL logic")
    else:
        tsors = calculate_occurrences(
            historical_prices=historical_prices,
            current_price=current_price,
            target_prices=target_prices,
            thresholds=percent_changes,
            rolling_days=rolling_days,
            momentum_confluence=momentum_confluence
        )


    tsors_list = [tsors["occurrences"][t] for t in target_prices]
    sample_size = tsors["sample_size"]
    expected_values = calculate_expected_values(tsors_list, polymarket_odds)

    result = []
    for i, expected_value in enumerate(expected_values):
        if use_hit_logic and already_met_flags[i]:
            result.append({
                'threshold': target_prices[i],
                'change': percent_changes[i],
                'occurred': 0.0,
                'yesOdds': polymarket_odds[i],
                'noOdds': 1 - polymarket_odds[i],
                'yesEV': 0.0,
                'noEV': 0.0
            })
        else:
            result.append({
                'threshold': target_prices[i],
                'change': percent_changes[i],
                'occurred': tsors_list[i],
                'yesOdds': expected_value.yesOdds,
                'noOdds': expected_value.noOdds,
                'yesEV': expected_value.yesEv,
                'noEV': expected_value.noEv
            })

    return {
        "results": result,
        "sampleSize": sample_size
    }


def calculate_percent_changes(current_price: float, target_prices: List[float]):
    thresholds = []
    for target_price in target_prices:
        threshold = ((target_price - current_price) / current_price) * 100
        thresholds.append(round(threshold, 2))
    return thresholds


def calculate_occurrences(
    historical_prices: List[float],
    current_price: float,
    target_prices: List[float],
    thresholds: List[float],
    rolling_days: int,
    momentum_confluence: dict = None
) -> Dict[float, float]:
    """
    Preserves intended strategy:
    - Convert target prices to % change relative to current price.
    - For each rolling window, calculate % change and compare against each threshold %.
    """
    total_windows = len(historical_prices) - rolling_days
    occurrences = {t: 0 for t in target_prices}

    for i in range(total_windows):
        start_price = historical_prices[i]
        end_price = historical_prices[i + rolling_days]

        if start_price == 0:
            continue

        if momentum_confluence and "filters" in momentum_confluence:
            filters = momentum_confluence["filters"]
            if not passes_all_momentum_filters(historical_prices, i, filters):
                continue

        for t in target_prices:
            analog_target = start_price * (t / current_price) if current_price else t
            if end_price >= analog_target:
                occurrences[t] += 1

    return {
        "occurrences": {
            t: round((occurrences[t] / total_windows) * 100, 2) if total_windows > 0 else "N/A"
            for t in target_prices
        },
        "sample_size": total_windows
    }



def calculate_fixed_occurrences(historical_prices: List[float],
                                current_price: float,
                                target_prices: List[float],
                                interval_size: int) -> Dict[float, float]:
    occurrences = {t: 0 for t in target_prices}
    total_windows = 0

    for i in range(0, len(historical_prices) - interval_size):
        end_price = historical_prices[i + interval_size]

        for target in target_prices:
            if end_price >= target:
                occurrences[target] += 1

        total_windows += 1

    print(f"Total fixed windows: {total_windows}")
    print(f"Sample thresholds: {target_prices}")

    return {
        "occurrences": {
            t: round((occurrences[t] / total_windows) * 100, 2) if total_windows > 0 else "N/A"
            for t in target_prices
        },
        "sample_size": total_windows
    }


def calculate_expected_values(occurred_percentages: List[float], polymarket_odds_list: List[float]):
    if len(occurred_percentages) != len(polymarket_odds_list):
        raise ValueError('occurred_percentages and polymarket_odds arrays must have equal length')

    expected_values = []
    for occurred_percentage, polymarket_odds in zip(occurred_percentages, polymarket_odds_list):
        expected_values.append(ExpectedValue(occurred_percentage / 100, polymarket_odds))
    return expected_values


if __name__ == '__main__':
    run_analysis()
