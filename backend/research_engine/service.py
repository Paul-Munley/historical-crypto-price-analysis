from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict
from typing import Any

from .backtest import run_long_only_backtest
from .fair_value import confidence_adjusted_probability
from .models import ContractSnapshot
from .scoring import score_contract
from .semantics import infer_semantics_from_question, outcome_occurs


def _build_family_key(snapshot: ContractSnapshot) -> str:
    base = snapshot.question.lower()
    cleaned = " ".join(base.replace("$", "").replace("?", "").split())
    return f"{snapshot.category}|{snapshot.archetype}|{snapshot.end_date}|{cleaned}"


def _group_outcomes_by_bucket(history_rows: list[dict[str, Any]]) -> dict[tuple[str, str, str], list[float]]:
    grouped: defaultdict[tuple[str, str, str], list[float]] = defaultdict(list)
    for row in history_rows:
        key = (
            str(row.get("category", "")),
            str(row.get("archetype", "")),
            str(row.get("probability_bucket", "")),
        )
        grouped[key].append(float(row.get("resolved_value", 0.0)))
    return grouped


def _probability_bucket(probability: float) -> str:
    value = max(0.0, min(0.999999, float(probability)))
    lower = int(value * 10) / 10
    upper = min(1.0, lower + 0.1)
    return f"{lower:.1f}-{upper:.1f}"


def _sort_contract_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def _to_numeric(value: Any) -> float:
        if isinstance(value, (int, float)):
            return float(value)
        try:
            return float(str(value).replace(",", ""))
        except (TypeError, ValueError):
            return float("-inf")

    return sorted(
        rows,
        key=lambda row: (_to_numeric(row.get("change")), _to_numeric(row.get("threshold"))),
        reverse=True,
    )


def _binary_outcomes_from_candle_windows(
    event_title: str,
    question: str,
    slug: str,
    outcome_yes_label: str,
    outcome_no_label: str,
    historical_candles: list[dict[str, Any]],
    current_price: float,
    rolling_steps: int,
) -> list[float]:
    semantics = infer_semantics_from_question(
        question,
        event_title=event_title,
        slug=slug,
        outcome_yes_label=outcome_yes_label,
        outcome_no_label=outcome_no_label,
    )
    total_windows = max(0, len(historical_candles) - rolling_steps)
    outcomes: list[float] = []
    for idx in range(total_windows):
        start_price = float(historical_candles[idx]["close"])
        end_price = float(historical_candles[idx + rolling_steps]["close"])
        window = historical_candles[idx + 1: idx + rolling_steps + 1]
        high_price = max(float(candle["high"]) for candle in window) if window else end_price
        low_price = min(float(candle["low"]) for candle in window) if window else end_price
        occurred = outcome_occurs(
            semantics=semantics,
            start_price=start_price,
            target_price=semantics.target_price or 0.0,
            end_price=end_price,
            high_price=high_price,
            low_price=low_price,
            current_price=current_price,
        )
        outcomes.append(1.0 if occurred else 0.0)
    return outcomes


def run_research_analysis(
    contracts: list[dict[str, Any]],
    historical_rows: list[dict[str, Any]],
    confidence_quantile: float = 0.20,
    slippage: float = 0.02,
) -> dict[str, Any]:
    grouped = _group_outcomes_by_bucket(historical_rows)
    results: list[dict[str, Any]] = []

    for contract in contracts:
        snapshot = ContractSnapshot(
            market_id=str(contract.get("market_id", "")),
            slug=str(contract.get("slug", "")),
            question=str(contract.get("question", "")),
            category=str(contract.get("category", "")),
            archetype=str(contract.get("archetype", "binary_yes_no")),
            event_slug=contract.get("event_slug"),
            threshold=float(contract.get("threshold", 0.0)),
            side=str(contract.get("side", "yes")),
            odds_yes=float(contract.get("odds_yes", 0.0)),
            odds_no=float(contract.get("odds_no", 1.0 - float(contract.get("odds_yes", 0.0)))),
            current_price=float(contract.get("current_price", 0.0)),
            resolution_price=contract.get("resolution_price"),
            timestamp=contract.get("timestamp"),
            end_date=contract.get("end_date"),
            metadata=contract.get("metadata", {}),
        )
        semantics = infer_semantics_from_question(
            snapshot.question,
            event_title=str(contract.get("event_title", "")),
            slug=snapshot.slug,
            outcome_yes_label=str(contract.get("yes_label", "Yes")),
            outcome_no_label=str(contract.get("no_label", "No")),
        )
        bucket_key = (
            snapshot.category,
            snapshot.archetype,
            str(contract.get("probability_bucket", "")),
        )
        grouped_outcomes = grouped.get(bucket_key, [])
        fair_value = confidence_adjusted_probability(
            grouped_outcomes,
            prior_mean=0.5,
            prior_strength=8.0,
            quantile=confidence_quantile,
            source_group="category_archetype_bucket",
        )
        score = score_contract(snapshot, fair_value, slippage=slippage)
        results.append(
            {
                "market_id": snapshot.market_id,
                "slug": snapshot.slug,
                "question": snapshot.question,
                "yes_label": semantics.outcome_yes_label,
                "no_label": semantics.outcome_no_label,
                "yesOdds": snapshot.odds_yes,
                "noOdds": snapshot.odds_no,
                "threshold": contract.get("threshold", snapshot.threshold),
                "category": snapshot.category,
                "archetype": snapshot.archetype,
                "event_slug": snapshot.event_slug,
                "timestamp": snapshot.timestamp,
                "end_date": snapshot.end_date,
                "entry_price": min(0.9999, snapshot.odds_yes + slippage),
                "resolution_price": snapshot.resolution_price,
                "semantics_mode": semantics.mode,
                "fair_value_yes": score.fair_value_yes,
                "fair_value_no": score.fair_value_no,
                "edge_yes": score.edge_yes,
                "edge_no": score.edge_no,
                "expected_value_yes": score.expected_value_yes,
                "expected_value_no": score.expected_value_no,
                "effective_sample_size": fair_value.effective_sample_size,
                "confidence_lower_bound_yes": fair_value.confidence_lower_bound_yes,
                "source_group": fair_value.source_group,
                "family_key": _build_family_key(snapshot),
            }
        )

    return {
        "results": _sort_contract_rows(results),
        "config": {
            "confidence_quantile": confidence_quantile,
            "slippage": slippage,
        },
    }


def run_research_analysis_from_legacy(
    event_to_analyze: dict[str, Any],
    event_markets: list[Any],
    thresholds_by_question: dict[str, Any],
    historical_candles: list[dict[str, Any]],
    current_price: float,
    rolling_steps: int,
    confidence_quantile: float = 0.20,
    slippage: float = 0.02,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    total_windows = max(0, len(historical_candles) - rolling_steps)

    for market in event_markets:
        odds_yes = float(getattr(market, "yes_price", 0.0))
        odds_no = 1.0 - odds_yes
        semantics = infer_semantics_from_question(
            str(market.question),
            event_title=str(event_to_analyze.get("title", "")),
            slug=str(getattr(market, "slug", "")),
            outcome_yes_label=str(getattr(market, "yes_label", "Yes")),
            outcome_no_label=str(getattr(market, "no_label", "No")),
        )
        if semantics.mode == "close_to_close":
            threshold_value = thresholds_by_question.get(market.slug)
            if threshold_value in [None, ""]:
                continue
            semantics.target_price = float(threshold_value)
            semantics.threshold_label = str(float(threshold_value))

        binary_outcomes = _binary_outcomes_from_candle_windows(
            event_title=str(event_to_analyze.get("title", "")),
            question=str(market.question),
            slug=str(getattr(market, "slug", "")),
            outcome_yes_label=str(getattr(market, "yes_label", "Yes")),
            outcome_no_label=str(getattr(market, "no_label", "No")),
            historical_candles=historical_candles,
            current_price=current_price,
            rolling_steps=rolling_steps,
        )
        fair_value = confidence_adjusted_probability(
            binary_outcomes,
            prior_mean=0.5,
            prior_strength=8.0,
            quantile=confidence_quantile,
            source_group="legacy_close_windows",
        )
        target_price = float(semantics.target_price or semantics.lower_bound or semantics.upper_bound or 0.0)
        snapshot = ContractSnapshot(
            market_id=str(getattr(market, "id", market.slug)),
            slug=str(market.slug),
            question=str(market.question),
            category=str(event_to_analyze.get("category", "Crypto")),
            archetype=str(event_to_analyze.get("archetype", "binary_yes_no")),
            event_slug=event_to_analyze.get("slug"),
            threshold=target_price,
            side="yes",
            odds_yes=odds_yes,
            odds_no=odds_no,
            current_price=current_price,
            resolution_price=None,
            timestamp=None,
            end_date=event_to_analyze.get("endDate"),
            metadata={
                "probability_bucket": _probability_bucket(odds_yes),
                "history_mode": "ohlc_window",
                "yes_label": semantics.outcome_yes_label,
                "no_label": semantics.outcome_no_label,
            },
        )
        score = score_contract(snapshot, fair_value, slippage=slippage)
        occurred_pct = (sum(binary_outcomes) / len(binary_outcomes) * 100) if binary_outcomes else 0.0
        percent_change = ((target_price - current_price) / current_price * 100) if current_price and target_price else 0.0
        results.append(
            {
                "market_id": snapshot.market_id,
                "slug": snapshot.slug,
                "question": snapshot.question,
                "yes_label": semantics.outcome_yes_label,
                "no_label": semantics.outcome_no_label,
                "category": snapshot.category,
                "archetype": snapshot.archetype,
                "event_slug": snapshot.event_slug,
                "timestamp": snapshot.timestamp,
                "end_date": snapshot.end_date,
                "threshold": semantics.threshold_label or target_price,
                "change": round(percent_change, 2),
                "occurred": round(occurred_pct, 2),
                "yesOdds": odds_yes,
                "noOdds": odds_no,
                "entry_price": min(0.9999, odds_yes + slippage),
                "resolution_price": None,
                "semantics_mode": semantics.mode,
                "history_mode": "ohlc_window",
                "fair_value_yes": score.fair_value_yes,
                "fair_value_no": score.fair_value_no,
                "edge_yes": score.edge_yes,
                "edge_no": score.edge_no,
                "expected_value_yes": score.expected_value_yes * 100,
                "expected_value_no": score.expected_value_no * 100,
                "effective_sample_size": fair_value.effective_sample_size,
                "confidence_lower_bound_yes": fair_value.confidence_lower_bound_yes,
                "source_group": fair_value.source_group,
                "family_key": _build_family_key(snapshot),
            }
        )

    return {
        "results": _sort_contract_rows(results),
        "sampleSize": total_windows,
        "warnings": [
            "Research comparison is using normalized OHLC windows from the legacy CoinAPI data source. Threshold ladders are scaled relative to the current spot so probabilities stay comparable across regimes."
        ],
        "config": {
            "confidence_quantile": confidence_quantile,
            "slippage": slippage,
            "rolling_steps": rolling_steps,
        },
    }


def run_research_backtest(
    scored_contracts: list[dict[str, Any]],
    edge_threshold: float = 0.01,
    stake_usd: float = 100.0,
    max_concurrent_trades: int = 2,
    max_active_per_family: int = 1,
) -> dict[str, Any]:
    filtered = []
    for row in scored_contracts:
        edge_yes = float(row.get("edge_yes", 0.0))
        if edge_yes < edge_threshold:
            continue
        filtered.append(
            {
                "market_id": row.get("market_id"),
                "slug": row.get("slug"),
                "timestamp": row.get("timestamp"),
                "end_date": row.get("end_date"),
                "entry_price": row.get("entry_price", row.get("odds_yes")),
                "resolution_price": row.get("resolution_price", 0.0),
                "fair_value_yes": row.get("fair_value_yes", 0.0),
                "edge": edge_yes,
                "expected_value": row.get("expected_value_yes", 0.0),
                "category": row.get("category"),
                "archetype": row.get("archetype"),
                "family_key": row.get("family_key"),
                "event_cluster": row.get("event_slug"),
                "effective_sample_size": row.get("effective_sample_size"),
            }
        )

    trades, summary = run_long_only_backtest(
        filtered,
        stake_usd=stake_usd,
        max_concurrent_trades=max_concurrent_trades,
        max_active_per_family=max_active_per_family,
    )
    return {
        "summary": {
            "trade_count": summary.trade_count,
            "total_pnl_usd": summary.total_pnl_usd,
            "avg_pnl_usd": summary.avg_pnl_usd,
            "win_rate": summary.win_rate,
            "avg_edge": summary.avg_edge,
            "avg_expected_value": summary.avg_expected_value,
        },
        "trades": [asdict(trade) for trade in trades],
    }