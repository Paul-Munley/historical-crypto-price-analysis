import requests
import os
from dotenv import load_dotenv

load_dotenv()
GRAPH_API_KEY = os.getenv("GRAPH_API_KEY")

SUBGRAPH_URL = "https://gateway.thegraph.com/api/subgraphs/id/81Dm16JjuFSrqz813HysXoUPvzTwE7fsfPk2RTf66nyC"
GRAPHQL_QUERY = """
{
  markets(first: 1000, orderBy: creationTimestamp, orderDirection: desc) {
    id
    question
    outcomes {
      id
      name
      price
    }
  }
}
"""

def fetch_polymarket_crypto_markets():
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GRAPH_API_KEY}"  # <-- Replace this!
    }

    response = requests.post(SUBGRAPH_URL, headers=headers, json={"query": GRAPHQL_QUERY})
    print(response)

    if response.status_code != 200:
        raise Exception(f"Failed to fetch Polymarket markets: {response.status_code}, {response.text}")

    data = response.json()
    print("[DEBUG] Raw Polymarket response:", data)

    all_markets = data.get("data", {}).get("markets", [])
    print("[DEBUG] Raw Polymarket Questions:")
    for market in all_markets:
        print("-", market.get("question", ""))

    crypto_keywords = ["BTC", "ETH", "SOL", "XRP"]
    result = {coin: [] for coin in crypto_keywords}

    for market in all_markets:
        question = market.get("question", "").upper()
        for coin in crypto_keywords:
            if coin in question:
                result[coin].append(market)

    return result
