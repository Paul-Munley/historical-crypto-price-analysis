from typing import List
import json
from flask import Flask, request, Response, jsonify
from flask_cors import CORS

from polycobra_backend.constants.coins import Coin
from polycobra_backend.services.event_service import Event, events_by_coin
from polycobra_backend.services.price_service import get_ticker_prices
from polycobra_backend.services.parse_service import extract_threshold_from_question
from polycobra_backend.services.analysis_service import run_analysis
from polycobra_backend.services.m2_service import (fetch_m2_series, calculate_yoy_growth, generate_summary_string)
from polycobra_backend.services.lunarcrush_sentiment import fetch_btc_social_score
from polycobra_backend.services.dxy_service import (
    fetch_dxy_series, calculate_yoy_growth as calc_dxy_yoy, generate_summary_string as dxy_summary
)
from polycobra_backend.services.ssr_service import calculate_ssr

app = Flask(__name__)
CORS(app)


class DateRange:
    def __init__(self, start, end):
        self.start: str = start
        self.end: str = end


@app.route('/events', methods=["GET"])
def event_slugs():
    coin: Coin = Coin.from_label(request.args.get('coin', None))
    events: List[Event] = events_by_coin(coin)

    result = []
    for event in events:
        result.append(event.to_dict())

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
    data = request.get_json()

    date_ranges = [DateRange(x['start'], x['end']) for x in data['dateRanges']]
    thresholds_by_question: dict = data['thresholdsByQuestion']
    event_to_analyze: str = data['eventToAnalyze']
    days: int = data['days']
    momentum_confluence: dict = data.get('momentumConfluence', None)

    return run_analysis(date_ranges, thresholds_by_question, event_to_analyze, days, momentum_confluence)

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
