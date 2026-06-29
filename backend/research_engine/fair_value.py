from __future__ import annotations

from typing import Iterable

from scipy.stats import beta as beta_dist

from .models import FairValueEstimate


def payout_multiple(probability: float) -> float:
    if probability <= 0 or probability >= 1:
        return 0.0
    return (1.0 - probability) / probability


def implied_ev(win_probability: float, market_probability: float) -> float:
    if market_probability <= 0 or market_probability >= 1:
        return 0.0
    win_prob = max(0.0, min(1.0, win_probability))
    loss_prob = 1.0 - win_prob
    return (win_prob * payout_multiple(market_probability)) - loss_prob


def beta_lower_bound(successes: float, trials: int, quantile: float, alpha_prior: float, beta_prior: float) -> float:
    alpha = successes + alpha_prior
    beta = max(1e-9, trials - successes + beta_prior)
    return float(beta_dist.ppf(quantile, alpha, beta))


def confidence_adjusted_probability(
    binary_outcomes: Iterable[float],
    prior_mean: float = 0.5,
    prior_strength: float = 8.0,
    quantile: float = 0.20,
    source_group: str = "local_bucket",
) -> FairValueEstimate:
    outcomes = [float(x) for x in binary_outcomes]
    trials = len(outcomes)
    if trials == 0:
        return FairValueEstimate(
            probability_yes=prior_mean,
            confidence_lower_bound_yes=max(0.0, min(1.0, prior_mean * 0.5)),
            effective_sample_size=0,
            source_group=source_group,
            uncertainty_penalty=prior_strength,
            metadata={"posterior_mean": prior_mean},
        )

    successes = sum(outcomes)
    alpha_prior = max(1e-9, prior_mean * prior_strength)
    beta_prior = max(1e-9, (1.0 - prior_mean) * prior_strength)
    posterior_mean = (successes + alpha_prior) / (trials + alpha_prior + beta_prior)
    lower_bound = beta_lower_bound(successes, trials, quantile, alpha_prior, beta_prior)
    return FairValueEstimate(
        probability_yes=posterior_mean,
        confidence_lower_bound_yes=lower_bound,
        effective_sample_size=trials,
        source_group=source_group,
        uncertainty_penalty=posterior_mean - lower_bound,
        metadata={
            "posterior_mean": posterior_mean,
            "successes": successes,
            "trials": trials,
            "quantile": quantile,
        },
    )