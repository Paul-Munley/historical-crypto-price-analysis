from polycobra_backend.polymarket_api.markets_by_slug import markets_by_slug


def fetch_polymarket_crypto_markets():
    return {
        'BTC': markets_by_slug('bitcoin-price-on-april-18'),
        'ETH': markets_by_slug('ethereum-price-on-april-18'),
        'SOL': markets_by_slug('solana-above-120-on-april-18'),
        'XRP': markets_by_slug('ripple-above-2pt00-on-april-18')
    }
