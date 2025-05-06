from typing import List
import json
from flask import Flask, request, Response, jsonify
from flask_cors import CORS

from polycobra_backend.constants.coins import Coin
from polycobra_backend.services.event_service import Event, events_by_coin
from polycobra_backend.services.price_service import get_ticker_prices
from polycobra_backend.services.parse_service import extract_threshold_from_question

app = Flask(__name__)
CORS(app)


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

    cryptos = data.get("cryptos", [])
    print("[DEBUG] Cryptos: ", cryptos)

    date_ranges = data.get("dateRanges", [])
    rolling_days = data.get("days", 7)
    bet_type = data.get("betType", "multi-threshold")

    # Step 1: Run your occurrence % analysis
    # analysis_results = run_analysis(cryptos, date_ranges, rolling_days)

    # Step 2: Fetch Polymarket data
    # market_data = fetch_polymarket_crypto_markets()
    print("[DEBUG] Polymarket Market Data:", market_data)

                # results.append({
                #     "change": fake_change,
                #     "occurred": occurred_pct,
                #     "yesOdds": yes_odds,
                #     "yesEV": yes_ev,
                #     "noOdds": no_odds,
                #     "noEV": no_ev
                # })
    return {}


if __name__ == "__main__":
    app.run(port=5001, debug=True)
