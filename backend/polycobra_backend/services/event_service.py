from datetime import datetime, timedelta
from typing import List, Optional
import requests
import json

from polycobra_backend.constants.third_party_endpoints import POLYMARKET_GAMMA_ROOT
from polycobra_backend.constants.coins import Coin

COIN_TO_SLUG = {
    Coin.BTC: 'bitcoin',
    Coin.ETH: 'ethereum',
    Coin.SOL: 'solana',
    Coin.XRP: 'ripple'
}


class UnsupportedOutcomeException(Exception):
    pass


class Market:

    def __init__(self, identifier: str, question: str, slug: str, yes_price: float, no_price: float):
        self.id: str = identifier
        self.question: str = question
        self.slug: str = slug
        self.yes_price: float = yes_price
        self.no_price: float = no_price

    def to_dict(self):
        return {
            'id': self.id,
            'question': self.question,
            'slug': self.slug,
            'yes_price': self.yes_price,
            'no_price': self.no_price
        }

    @staticmethod
    def parse(market_object: dict) -> "Market":
        outcomes = json.loads(market_object['outcomes'])

        yes_index = None
        no_index = None
        for i, outcome_name in enumerate(outcomes):
            if outcome_name == 'Yes':
                yes_index = i
            elif outcome_name == 'No':
                no_index = i

        if (yes_index is None) or (no_index is None):
            raise UnsupportedOutcomeException()

        assert yes_index != no_index

        outcome_prices = json.loads(market_object['outcomePrices'])
        yes_price = float(outcome_prices[yes_index])
        no_price = float(outcome_prices[no_index])

        return Market(market_object['id'],
                      market_object['question'],
                      market_object['slug'],
                      yes_price,
                      no_price)


class Event:

    def __init__(self, identifier: str, slug: str, title: str):
        self.id: str = identifier
        self.slug: str = slug
        self.title: str = title
        self.markets: List[Market] = []
        self.coin_tag: Optional[Coin] = None

    def add_market(self, market: Market):
        self.markets.append(market)

    def to_dict(self):
        result = {
            'id': self.id,
            'slug': self.slug,
            'title': self.title,
            'markets': []
        }

        for market in self.markets:
            result['markets'].append(market.to_dict())

        return result

    @staticmethod
    def parse(event_object: dict) -> "Event":
        event = Event(event_object['id'], event_object['slug'], event_object['title'])
        for market_object in event_object['markets']:
            event.add_market(Market.parse(market_object))

        for tag_object in event_object['tags']:
            for key, value in COIN_TO_SLUG.items():
                if tag_object['slug'] == value:
                    event.coin_tag = key
                    return event

        return event

def events_by_coin(coin: Coin):
    url = f'{POLYMARKET_GAMMA_ROOT}/events?tag_slug={COIN_TO_SLUG[coin]}&closed=false&order=startDate&ascending=false'
    data_list = requests.get(url).json()
    events = []
    for event_object in data_list:
        try:
            event = Event.parse(event_object)
        except UnsupportedOutcomeException:
            continue

        events.append(event)

    return events


def safe_get_event_by_slug(slug: str):
    url = f"{POLYMARKET_GAMMA_ROOT}/events?slug={slug}"
    try:
        response = requests.get(url)
        event_objects = response.json()
        if isinstance(event_objects, list) and len(event_objects) == 1:
            return Event.parse(event_objects[0])
    except Exception as e:
        print(f"❌ Failed to fetch event for slug '{slug}': {e}")
    return None

def get_multiple_events_by_slugs(slugs: List[str]):
    events = []
    for slug in slugs:
        event = safe_get_event_by_slug(slug)
        if event:
            events.append(event)
    return events

def get_upcoming_fridays(n: int = 2):
    today = datetime.utcnow()
    weekday = today.weekday()  # Monday=0, Friday=4, Sunday=6

    # Days until the next Friday
    days_ahead = (4 - weekday) % 7
    if days_ahead == 0:
        days_ahead = 7  # Always move forward, even if today is Friday

    base_friday = today + timedelta(days=days_ahead)

    fridays = [base_friday + timedelta(days=7 * i) for i in range(n)]
    return fridays

def generate_weekly_btc_slugs(n: int = 2):
    fridays = get_upcoming_fridays(n)
    slugs = []

    for friday in fridays:
        slug = f"bitcoin-price-on-{friday.strftime('%B').lower()}-{friday.day}"
        slug = slug.replace(" ", "-")
        slugs.append(slug)

    return slugs

# Unified fallback method
def get_fallback_events_for_coin(coin: Coin) -> List:
    if coin == Coin.BTC:
        slugs = generate_weekly_btc_slugs()
        return get_multiple_events_by_slugs(slugs)
    return []



if __name__ == '__main__':
    x = events_by_coin(Coin.BTC)
    print()
