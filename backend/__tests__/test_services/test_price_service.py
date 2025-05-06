import unittest
from unittest.mock import patch, Mock
from typing import Dict

from polycobra_backend.constants.coins import Coin
from polycobra_backend.services.price_service import get_ticker_prices


class TestGetTickerPrices(unittest.TestCase):

    @patch('polycobra_backend.services.price_service.requests.get')
    def test_get_ticker_prices_success(self, mock_get):
        # Mocked API response
        mock_response = {
            'Data': {
                'BTC-USD': {'PRICE': '27500.45'},
                'ETH-USD': {'PRICE': '1820.15'}
            }
        }

        # Setup mock
        mock_get.return_value = Mock(status_code=200)
        mock_get.return_value.json.return_value = mock_response

        # Call function with mocked Coin enum
        coins = [Coin.BTC, Coin.ETH]  # assuming these exist

        prices: Dict[Coin, float] = get_ticker_prices(coins)

        # Assertions
        self.assertAlmostEqual(prices[Coin.BTC], 27500.45)
        self.assertAlmostEqual(prices[Coin.ETH], 1820.15)
        self.assertEqual(mock_get.call_count, 1)

    @patch('polycobra_backend.services.price_service.requests.get')
    def test_get_ticker_prices_with_invalid_coin(self, mock_get):
        # Mocked API with one valid, one invalid coin (won't match Coin enum)
        mock_response = {
            'Data': {
                'DOGE-USD': {'PRICE': '0.088'},  # Assume no Coin.DOGE defined
            }
        }
        mock_get.return_value = Mock(status_code=200)
        mock_get.return_value.json.return_value = mock_response

        with self.assertRaises(ValueError):
            get_ticker_prices([Coin.BTC])  # BTC defined, DOGE in response triggers .from_label() fail

