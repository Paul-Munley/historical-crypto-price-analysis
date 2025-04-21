import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from analysis import run_analysis
from polymarket_api import fetch_polymarket_crypto_markets

from polycobra_backend.chatgpt_api.ask_question import ask_question
from polycobra_backend.polymarket_api.event_slugs_by_tag_slug import event_slugs_by_tag_slug
from polycobra_backend.constants.prompts import DOLLAR_VALUES_PARSE_PROMPT

app = Flask(__name__)
CORS(app)


@app.route('/event-slugs', methods=["GET"])
def event_slugs():
    tag_slugs = request.args.get('tag_slug', None)
    return event_slugs_by_tag_slug(tag_slugs)


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()

    cryptos = data.get("cryptos", [])
    print("[DEBUG] Cryptos: ", cryptos)

    date_ranges = data.get("dateRanges", [])
    rolling_days = data.get("days", 7)
    bet_type = data.get("betType", "multi-threshold")

    # Step 1: Run your occurrence % analysis
    analysis_results = run_analysis(cryptos, date_ranges, rolling_days)

    # Step 2: Fetch Polymarket data
    market_data = fetch_polymarket_crypto_markets()
    print("[DEBUG] Polymarket Market Data:", market_data)

    # Step 3: Merge model with PM outcomes + calculate EV
    combined_results = {}
    for coin in cryptos:
        occurrences = analysis_results.get(coin, {})
        polymarket_markets = market_data.get(coin, [])

        results = []
        for market in polymarket_markets:
            print('Question: ', market.question)

            # Example: pretend label = "$60,000 - $65,000", parse to 62.5k
            response = ask_question(DOLLAR_VALUES_PARSE_PROMPT + market.question)

            try:
                price_list = json.loads(response)
                print('     - resultant parsed list: ' + str(price_list))
            except Exception as e:
                print("Could not parse ChatGPT response: " + response)
                continue

            # for outcome in market["outcomes"]:
            for label in ['Yes', 'No']:
                # You can match outcome labels to thresholds or price ranges
                # For now we fake % change parsing and lookup (adjust as needed)

                if label == 'Yes':
                    price = float(market.yes_price)
                elif label == 'No':
                    price = float(market.no_price)

                if len(price_list) == 2:
                    avg_price = (float(price_list[0]) + float(price_list[1])) / 2
                else:
                    continue

                # Now compute % change vs. current/historic price range
                # Here we fake it — you'll want to calculate from actual price data
                fake_change = 50.0  # Placeholder
                occurred_pct = occurrences.get(fake_change, 0.0)

                yes_odds = price
                no_odds = 1 - price
                yes_ev = occurred_pct * 100 - (yes_odds * 100)
                no_ev = (100 - occurred_pct) - (no_odds * 100)

                results.append({
                    "change": fake_change,
                    "occurred": occurred_pct,
                    "yesOdds": yes_odds,
                    "yesEV": yes_ev,
                    "noOdds": no_odds,
                    "noEV": no_ev
                })

        combined_results[coin] = results

    return jsonify(combined_results)


if __name__ == "__main__":
    app.run(port=5001, debug=True)
