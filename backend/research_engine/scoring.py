from __future__ import annotations

from .fair_value import implied_ev
from .models import ContractSnapshot, EVScore, FairValueEstimate


def score_contract(snapshot: ContractSnapshot, fair_value: FairValueEstimate, slippage: float = 0.0) -> EVScore:
    tradable_yes = min(0.9999, max(0.0001, snapshot.odds_yes + slippage))
    fair_yes = fair_value.confidence_lower_bound_yes
    fair_no = 1.0 - fair_yes
    edge_yes = fair_yes - tradable_yes
    edge_no = fair_no - snapshot.odds_no
    ev_yes = implied_ev(fair_yes, tradable_yes)
    ev_no = implied_ev(fair_no, snapshot.odds_no)
    return EVScore(
        fair_value_yes=fair_yes,
        fair_value_no=fair_no,
        edge_yes=edge_yes,
        edge_no=edge_no,
        expected_value_yes=ev_yes,
        expected_value_no=ev_no,
        confidence_adjusted=True,
        metadata={
            "posterior_mean_yes": fair_value.probability_yes,
            "effective_sample_size": fair_value.effective_sample_size,
            "source_group": fair_value.source_group,
            "slippage": slippage,
        },
    )