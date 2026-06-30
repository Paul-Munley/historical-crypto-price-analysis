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

    def __init__(self,
                 identifier: str,
                 question: str,
                 slug: str,
                 yes_price: float,
                 no_price: float,
                 title_hint: str | None = None,
                 yes_label: str = 'Yes',
                 no_label: str = 'No'):
        self.id: str = identifier
        self.question: str = question
        self.slug: str = slug
        self.yes_price: float = yes_price
        self.no_price: float = no_price
        self.title_hint: str | None = title_hint
        self.yes_label: str = yes_label
        self.no_label: str = no_label

    def to_dict(self):
        return {
            'id': self.id,
            'question': self.question,
            'slug': self.slug,
            'yes_price': self.yes_price,
            'no_price': self.no_price,
            'title_hint': self.title_hint,
            'yes_label': self.yes_label,
            'no_label': self.no_label,
        }

    @staticmethod
    def parse(market_object: dict) -> "Market":
        outcomes = json.loads(market_object['outcomes'])

        if len(outcomes) != 2:
            raise UnsupportedOutcomeException()

        yes_index = None
        no_index = None
        for i, outcome_name in enumerate(outcomes):
            if outcome_name == 'Yes':
                yes_index = i
            elif outcome_name == 'No':
                no_index = i
            elif outcome_name == 'Up':
                yes_index = i
            elif outcome_name == 'Down':
                no_index = i

        if (yes_index is None) or (no_index is None):
            yes_index = 0
            no_index = 1

        assert yes_index != no_index

        outcome_prices = json.loads(market_object['outcomePrices'])
        yes_price = float(outcome_prices[yes_index])
        no_price = float(outcome_prices[no_index])
        title_hint = (
            market_object.get('groupItemTitle')
            or market_object.get('title')
            or market_object.get('shortName')
            or market_object.get('subtitle')
            or market_object.get('description')
        )

        return Market(market_object['id'],
                      market_object['question'],
                      market_object['slug'],
                      yes_price,
                      no_price,
                      title_hint,
                      outcomes[yes_index],
                      outcomes[no_index])


class Event:

    def __init__(self,
                 identifier: str,
                 slug: str,
                 title: str,
                 start_date: str | None = None,
                 end_date: str | None = None):
        self.id: str = identifier
        self.slug: str = slug
        self.title: str = title
        self.start_date: str | None = start_date
        self.end_date: str | None = end_date
        self.markets: List[Market] = []
        self.coin_tag: Optional[Coin] = None

    def add_market(self, market: Market):
        self.markets.append(market)

    def to_dict(self):
        result = {
            'id': self.id,
            'slug': self.slug,
            'title': self.title,
            'startDate': self.start_date,
            'endDate': self.end_date,
            'markets': []
        }

        for market in self.markets:
            result['markets'].append(market.to_dict())

        return result

    @staticmethod
    def parse(event_object: dict) -> "Event":
        event = Event(
            event_object['id'],
            event_object['slug'],
            event_object['title'],
            event_object.get('startDate'),
            event_object.get('endDate'),
        )
        for market_object in event_object['markets']:
            event.add_market(Market.parse(market_object))

        Event._assign_coin_tag(event, event_object.get('tags', []))
        return event

    @staticmethod
    def _assign_coin_tag(event: "Event", tag_objects: list[dict]):
        for tag_object in tag_objects:
            for key, value in COIN_TO_SLUG.items():
                if tag_object['slug'] == value:
                    event.coin_tag = key
                    return

        return event

def events_by_coin(coin: Coin):
    aggregated_events_list = []
    for offset in range(0, 100):

        url = f'{POLYMARKET_GAMMA_ROOT}/events?tag_slug={COIN_TO_SLUG[coin]}&closed=false&order=startDate&ascending=false&offset={offset}'
        data_list = requests.get(url).json()
        events = []
        for event_object in data_list:
            print(event_object)
            try:
                event = Event.parse(event_object)
            except UnsupportedOutcomeException:
                continue

            events.append(event)
        aggregated_events_list += events

    return aggregated_events_list


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


def safe_get_event_by_market_slug(slug: str):
    url = f"{POLYMARKET_GAMMA_ROOT}/markets?slug={slug}"
    try:
        response = requests.get(url)
        market_objects = response.json()
        if not (isinstance(market_objects, list) and len(market_objects) == 1):
            return None

        market_object = market_objects[0]
        event_objects = market_object.get('events') or []
        if not event_objects:
            return None

        event_object = event_objects[0]
        event = Event(
            event_object['id'],
            event_object['slug'],
            event_object['title'],
            event_object.get('startDate'),
            event_object.get('endDate'),
        )
        event.add_market(Market.parse(market_object))
        Event._assign_coin_tag(event, event_object.get('tags', []))
        return event
    except Exception as e:
        print(f"❌ Failed to fetch market-backed event for slug '{slug}': {e}")
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
