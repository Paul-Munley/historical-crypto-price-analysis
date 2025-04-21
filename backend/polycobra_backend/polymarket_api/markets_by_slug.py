from typing import List

import requests
import json

from polycobra_backend.constants.endpoints import GAMMA_URL


def construct_url(slug: str):
    return f'{GAMMA_URL}/events?slug={slug}'


class Market:
    def __init__(self, yes_price: str, no_price: str, question: str):
        self.yes_price: str = yes_price
        self.no_price: str = no_price
        self.question: str = question

    @staticmethod
    def parse(market_object: dict):
        outcomes = json.loads(market_object['outcomes'])

        yes_index = None
        no_index = None
        for i, outcome_name in enumerate(outcomes):
            if outcome_name == 'Yes':
                yes_index = i
            elif outcome_name == 'No':
                no_index = i

        if (yes_index is None) or (no_index is None):
            raise NotImplemented

        assert yes_index != no_index

        outcome_prices = json.loads(market_object['outcomePrices'])
        yes_price = outcome_prices[yes_index]
        no_price = outcome_prices[no_index]

        return Market(yes_price, no_price, market_object['question'])

    def __str__(self):
        return json.dumps({'yes': self.yes_price, 'no': self.no_price, 'title': self.question}, indent=2)


def markets_by_slug(slug: str) -> List[Market]:
    data_list = requests.get(construct_url(slug)).json()
    if len(data_list) > 1:
        # the provided slug should only match one event
        raise NotImplemented
    data = data_list[0]

    markets = []
    for market_object in data['markets']:
        market = Market.parse(market_object)
        markets.append(market)

    return markets


if __name__ == '__main__':
    markets_by_slug('bitcoin-price-on-april-18')
