from __future__ import annotations

from collections import defaultdict

from .models import BacktestSummary, BacktestTrade


def run_long_only_backtest(
    candidates: list[dict],
    stake_usd: float = 100.0,
    max_concurrent_trades: int = 2,
    max_active_per_family: int = 1,
) -> tuple[list[BacktestTrade], BacktestSummary]:
    ordered = sorted(candidates, key=lambda row: (row.get("timestamp") or "", -(row.get("edge") or 0.0)))
    active: list[dict] = []
    active_families: defaultdict[str, int] = defaultdict(int)
    trades: list[BacktestTrade] = []
    trade_id = 1

    for row in ordered:
        current_ts = row.get("timestamp") or ""
        survivors = []
        active_families = defaultdict(int)
        for pos in active:
            if (pos.get("end_date") or "") > current_ts:
                survivors.append(pos)
                family = pos.get("family_key") or ""
                active_families[family] += 1
        active = survivors

        family_key = row.get("family_key") or ""
        if len(active) >= max_concurrent_trades:
            continue
        if family_key and active_families[family_key] >= max_active_per_family:
            continue

        entry_price = float(row.get("entry_price", row.get("odds_yes", 0.0)))
        exit_price = float(row.get("resolution_price", 0.0))
        qty = 0.0 if entry_price <= 0 else stake_usd / entry_price
        pnl_usd = qty * (exit_price - entry_price)

        trades.append(
            BacktestTrade(
                trade_id=trade_id,
                timestamp=str(current_ts),
                market_id=str(row.get("market_id", "")),
                slug=str(row.get("slug", "")),
                side="long_yes",
                entry_price=entry_price,
                exit_price=exit_price,
                stake_usd=stake_usd,
                pnl_usd=pnl_usd,
                fair_value=float(row.get("fair_value_yes", 0.0)),
                edge=float(row.get("edge", 0.0)),
                expected_value=float(row.get("expected_value", 0.0)),
                category=str(row.get("category", "")),
                archetype=str(row.get("archetype", "")),
                family_key=family_key or None,
                event_cluster=row.get("event_cluster"),
                metadata={"effective_sample_size": row.get("effective_sample_size")},
            )
        )
        active.append(row)
        if family_key:
            active_families[family_key] += 1
        trade_id += 1

    trade_count = len(trades)
    total_pnl = sum(t.pnl_usd for t in trades)
    wins = [t for t in trades if t.pnl_usd > 0]
    summary = BacktestSummary(
        trade_count=trade_count,
        total_pnl_usd=total_pnl,
        avg_pnl_usd=(total_pnl / trade_count) if trade_count else 0.0,
        win_rate=(len(wins) / trade_count) if trade_count else None,
        avg_edge=(sum(t.edge for t in trades) / trade_count) if trade_count else None,
        avg_expected_value=(sum(t.expected_value for t in trades) / trade_count) if trade_count else None,
        max_concurrent_trades=max_concurrent_trades,
        metadata={
            "max_active_per_family": max_active_per_family,
        },
    )
    return trades, summary