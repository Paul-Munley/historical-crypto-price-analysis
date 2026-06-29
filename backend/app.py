from typing import List
import json
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
from polycobra_backend.constants.coins import Coin
from polycobra_backend.services.event_service import (
    events_by_coin,
    get_fallback_events_for_coin,
    safe_get_event_by_slug,
    safe_get_event_by_market_slug,
)
from polycobra_backend.services.price_service import fetch_candles, get_ticker_prices
from polycobra_backend.services.parse_service import extract_threshold_from_question
from polycobra_backend.services.analysis_service import run_analysis
from polycobra_backend.services.m2_service import (fetch_m2_series, calculate_yoy_growth, generate_summary_string)
from polycobra_backend.services.lunarcrush_sentiment import fetch_btc_social_score
from polycobra_backend.services.dxy_service import (
    fetch_dxy_series, calculate_yoy_growth as calc_dxy_yoy, generate_summary_string as dxy_summary
)
from polycobra_backend.services.ssr_service import calculate_ssr
from research_engine.service import (
    run_research_analysis,
    run_research_analysis_from_legacy,
    run_research_backtest,
)

app = Flask(__name__)
CORS(app)


class DateRange:
    def __init__(self, start, end):
        self.start: str = start
        self.end: str = end


def _normalize_event_to_analyze(raw_event_to_analyze):
    if isinstance(raw_event_to_analyze, str):
        return {"slug": raw_event_to_analyze.strip()}
    if isinstance(raw_event_to_analyze, dict):
        return raw_event_to_analyze
    return None


@app.route('/events', methods=["GET"])
def event_slugs():
    coin: Coin = Coin.from_label(request.args.get('coin', None))
    slug: str = request.args.get('slug', None)

    if coin and slug:
        raise ValueError("Cannot specify both slug and coin")

    if coin:
        # Primary method
        events = events_by_coin(coin)

        # Add fallback events
        events += get_fallback_events_for_coin(coin)

        # Deduplicate by slug
        seen = set()
        deduped_events = []
        for event in events:
            if event.slug not in seen:
                seen.add(event.slug)
                deduped_events.append(event)

        result = [event.to_dict() for event in deduped_events]

    elif slug:
        event = safe_get_event_by_slug(slug)
        if event is None:
            event = safe_get_event_by_market_slug(slug)

        if event is None:
            return jsonify({"error": f"No event or market found for slug '{slug}'"}), 404

        result = [event.to_dict()]

    else:
        raise ValueError("Must specify either slug or coin")

    return Response(json.dumps(result, sort_keys=False), mimetype='application/json')


@app.route('/ticker-prices', methods=["GET"])
def ticker_prices():
    tickers = request.args.get('tickers', None)

    coins: List[Coin] = []
    for ticker in tickers.split(','):
        coins.append(Coin.from_label(ticker))

    result = {}
    for key, value in get_ticker_prices(coins).items():
        result[key.label] = value

    return result


@app.route('/extract-threshold', methods=["GET"])
def extract_threshold():
    question = request.args.get('question', None)

    computed_threshold = extract_threshold_from_question(question)

    return jsonify({
        'threshold': computed_threshold
    })


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}

    try:
        date_ranges = [DateRange(x['start'], x['end']) for x in data.get('dateRanges', [])]
        thresholds_by_question: dict = data.get('thresholdsByQuestion', {})
        raw_event_to_analyze = data.get('eventToAnalyze')
        days: int = int(data.get('days', 0))
        momentum_confluence: dict = data.get('momentumConfluence', None)
        rolling_unit: str = data.get('rollingUnit', 'days')
        use_hit_logic: bool = bool(data.get('use_hit_logic', False))
    except (TypeError, ValueError, KeyError) as exc:
        return jsonify({"error": f"Invalid request payload: {exc}"}), 400

    event_to_analyze = _normalize_event_to_analyze(raw_event_to_analyze)
    if event_to_analyze is None:
        return jsonify({"error": "eventToAnalyze must be a string or object"}), 400

    if not event_to_analyze.get("slug"):
        return jsonify({"error": "eventToAnalyze.slug is required"}), 400

    try:
        return run_analysis(
            date_ranges,
            thresholds_by_question,
            event_to_analyze,
            days,
            momentum_confluence,
            rolling_unit,
            use_hit_logic
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Unexpected analysis failure: {exc}"}), 500


@app.route("/research/analyze", methods=["POST"])
def research_analyze():
    data = request.get_json() or {}
    if data.get("contracts"):
        return jsonify(
            run_research_analysis(
                contracts=data.get("contracts", []),
                historical_rows=data.get("historicalRows", []),
                confidence_quantile=float(data.get("confidenceQuantile", 0.20)),
                slippage=float(data.get("slippage", 0.02)),
            )
        )

    date_ranges = [DateRange(x['start'], x['end']) for x in data.get('dateRanges', [])]
    thresholds_by_question: dict = data.get('thresholdsByQuestion', {})
    event_to_analyze: dict = data.get('eventToAnalyze', {})
    rolling_steps: int = int(data.get('days', 8))

    if not event_to_analyze or not event_to_analyze.get("slug"):
        return jsonify({"error": "eventToAnalyze.slug is required for legacy research analysis"}), 400

    event = safe_get_event_by_slug(event_to_analyze["slug"])
    if event is None:
        event = safe_get_event_by_market_slug(event_to_analyze["slug"])
    if event is None:
        return jsonify({"error": f"Could not resolve event for slug '{event_to_analyze['slug']}'"}), 400
    historical_candles = []
    rolling_unit = data.get('rollingUnit', 'days')
    for date_range in date_ranges:
        historical_candles += fetch_candles(event.coin_tag.label, date_range.start, date_range.end, rolling_unit)

    current_price = get_ticker_prices([event.coin_tag])[event.coin_tag]
    return jsonify(
        run_research_analysis_from_legacy(
            event_to_analyze=event_to_analyze,
            event_markets=event.markets,
            thresholds_by_question=thresholds_by_question,
            historical_candles=historical_candles,
            current_price=current_price,
            rolling_steps=rolling_steps,
            confidence_quantile=float(data.get("confidenceQuantile", 0.20)),
            slippage=float(data.get("slippage", 0.02)),
        )
    )


@app.route("/research/backtest", methods=["POST"])
def research_backtest():
    data = request.get_json() or {}
    return jsonify(
        run_research_backtest(
            scored_contracts=data.get("scoredContracts", []),
            edge_threshold=float(data.get("edgeThreshold", 0.01)),
            stake_usd=float(data.get("stakeUsd", 100.0)),
            max_concurrent_trades=int(data.get("maxConcurrentTrades", 2)),
            max_active_per_family=int(data.get("maxActivePerFamily", 1)),
        )
    )



# Dashboard

@app.route("/api/m2", methods=["GET"])
def get_m2_data():
    raw_data = fetch_m2_series()
    yoy_data = calculate_yoy_growth(raw_data)
    summary = generate_summary_string(yoy_data)
    return {
        "data": yoy_data,
        "summary": summary
    }

@app.route("/api/btc-social-score", methods=["GET"])
def get_btc_social_score():
    days = int(request.args.get("days", 30))
    data = fetch_btc_social_score(days=days)
    return jsonify(data)

@app.route("/api/dxy", methods=["GET"])
def get_dxy_data():
    raw_data = fetch_dxy_series()
    yoy_data = calc_dxy_yoy(raw_data)
    summary = dxy_summary(yoy_data)
    return {
        "data": yoy_data,
        "summary": summary
    }

@app.route("/api/ssr", methods=["GET"])
def get_ssr():
    return calculate_ssr()


if __name__ == "__main__":
    app.run(port=5001, debug=True)
