from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ContractSnapshot:
    market_id: str
    slug: str
    question: str
    category: str
    archetype: str
    event_slug: str | None
    threshold: float
    side: str
    odds_yes: float
    odds_no: float
    current_price: float
    resolution_price: float | None = None
    timestamp: str | None = None
    end_date: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class MarketContext:
    horizon_days: int
    semantics_mode: str
    rolling_unit: str
    current_spot: float
    family_key: str | None = None
    event_cluster: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class FairValueEstimate:
    probability_yes: float
    confidence_lower_bound_yes: float
    effective_sample_size: int
    source_group: str
    uncertainty_penalty: float
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class EVScore:
    fair_value_yes: float
    fair_value_no: float
    edge_yes: float
    edge_no: float
    expected_value_yes: float
    expected_value_no: float
    confidence_adjusted: bool
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class BacktestTrade:
    trade_id: int
    timestamp: str
    market_id: str
    slug: str
    side: str
    entry_price: float
    exit_price: float
    stake_usd: float
    pnl_usd: float
    fair_value: float
    edge: float
    expected_value: float
    category: str
    archetype: str
    family_key: str | None
    event_cluster: str | None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class BacktestSummary:
    trade_count: int
    total_pnl_usd: float
    avg_pnl_usd: float
    win_rate: float | None
    avg_edge: float | None
    avg_expected_value: float | None
    max_concurrent_trades: int
    metadata: dict[str, Any] = field(default_factory=dict)