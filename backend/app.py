from flask import Flask, request, jsonify
from flask_cors import CORS
from cryptocompare import fetch_prices
from analysis import calculate_occurrences
# from scraper import fetch_polymarket_odds  # ❌ Disabled for now
import traceback

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()

        cryptos = data.get('cryptos', [])
        date_ranges = data.get('dateRanges', [])
        days = int(data.get('days', 0))
        thresholds = data.get('thresholds', {})

        if not cryptos or not date_ranges or days == 0 or not thresholds:
            return jsonify({"error": "Missing required data"}), 400

        print("Incoming date ranges:", date_ranges)

        # polymarket_odds = fetch_polymarket_odds()  # ❌ Disabled for now

        results = {}

        for coin in cryptos:
            coin_thresholds = [
                float(x.strip()) for x in thresholds.get(coin, "").split(",") if x.strip()
            ]
            if not coin_thresholds:
                continue

            all_prices = []

            for date_range in date_ranges:
                start = date_range.get("start")
                end = date_range.get("end")
                print(f"Date range: start={start}, end={end}")
                if start and end:
                    try:
                        print(f"[DEBUG] Requesting {coin.upper()} from {start} to {end}")
                        prices = fetch_prices(coin, "usd", start, end)
                        print(f"[DEBUG] Fetched {len(prices)} prices. Sample: {prices[:5]}")
                        all_prices += prices
                    except Exception as e:
                        print(f"Error fetching {coin} from {start} to {end}: {str(e)}")

            print(f"[DEBUG] {coin.lower()} prices length after appending: {len(all_prices)}")

            if all_prices:
                print(f"Analyzing {len(all_prices)} prices for {coin}")
                print(f"Thresholds: {coin_thresholds}, Days: {days}")
                coin_result = calculate_occurrences(all_prices, coin_thresholds, days)
                print(f"Coin result: {coin_result}")

                # ✅ Simple version without odds
                results[coin] = {
                    t: {
                        "occurred_percent": coin_result.get(t, 0),
                        "model_probability": round(coin_result.get(t, 0), 2)
                    }
                    for t in coin_thresholds
                }

        return jsonify(results)

    except Exception as e:
        print("Error in analyze route:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
