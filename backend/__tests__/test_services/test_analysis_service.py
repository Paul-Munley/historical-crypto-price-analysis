from unittest import TestCase

from polycobra_backend.services.analysis_service import calculate_occurrences, calculate_percent_changes


class TestAnalysisService(TestCase):

    def test_1(self):
        prices = [10, 20, 30, 20, 40, 30, 40, 20, 10]
        thresholds = [100, 200, 300]
        days = 16

        occurrences = calculate_occurrences(prices, thresholds, days)

        self.assertDictEqual(occurrences,
                             {
                                 100: 50.00,
                                 200: 16.67,
                                 300: 0.00
                             })

    def test_single_target_price(self):
        current = 100.0
        targets = [110.0]
        expected = [10.0]  # (110 - 100) / 100 * 100
        result = calculate_percent_changes(current, targets)
        self.assertEqual(result, expected)

    def test_multiple_target_prices(self):
        current = 100.0
        targets = [90.0, 100.0, 110.0]
        expected = [-10.0, 0.0, 10.0]
        result = calculate_percent_changes(current, targets)
        self.assertEqual(result, expected)

    def test_empty_target_list(self):
        result = calculate_percent_changes(100.0, [])
        self.assertEqual(result, [])

    def test_high_precision(self):
        current = 99.99
        targets = [100.99]
        expected = [((100.99 - 99.99) / 99.99) * 100]
        result = calculate_percent_changes(current, targets)
        self.assertAlmostEqual(result[0], expected[0], places=5)

    def test_zero_current_price(self):
        with self.assertRaises(ZeroDivisionError):
            calculate_percent_changes(0.0, [100.0])
