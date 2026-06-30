from typing import List
import json
import math
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
from polycobra_backend.constants.coins import Coin
from polycobra_backend.services.event_service import (
    events_by_coin,
    get_fallback_events_for_coin,
    safe_get_event_by_slug,
    safe_get_event_by_market_slug,
)
from polycobra_backend.services.price_service import (
    fetch_binance_candles,
    fetch_candles,
    get_binance_ticker_price,
    get_ticker_prices,
    supports_direct_binance,
)
from polycobra_backend.services.parse_service import extract_threshold_from_question
from polycobra_backend.services.analysis_service import run_analysis
from polycobra_backend.services.m2_service import (fetch_m2_series, calculate_yoy_growth, generate_summary_string)
from polycobra_backend.services.lunarcrush_sentiment import fetch_btc_social_score
from polycobra_backend.services.dxy_service import (
    fetch_dxy_series, calculate_yoy_growth as calc_dxy_yoy, generate_summary_string as dxy_summary
)
from polycobra_backend.services.ssr_service import calculate_ssr
from research_engine.service import (
    run_research_analysis,
    run_research_analysis_from_legacy,
    run_research_backtest,
)

app = Flask(__name__)
CORS(app)

NEW_YORK_TZ = ZoneInfo("America/New_York")
TITLE_DATE_PATTERN = re.compile(r"\bon\s+([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?\b", re.IGNORECASE)
TITLE_MONTH_WINDOW_PATTERN = re.compile(r"\bin\s+([A-Za-z]+)(?:\s+(\d{4}))?\b", re.IGNORECASE)
MONTH_NAME_TO_NUMBER = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


class DateRange:
    def __init__(self, start, end):
        self.start: str = start
        self.end: str = end


def _normalize_event_to_analyze(raw_event_to_analyze):
    if isinstance(raw_event_to_analyze, str):
        return {"slug": raw_event_to_analyze.strip()}
    if isinstance(raw_event_to_analyze, dict):
        return raw_event_to_analyze
    return None


def _parse_iso_datetime(value: str | None):
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _infer_title_settlement_datetime(
    title: str | None,
    fallback_end_date: str | None,
    *,
    settlement_mode: str = "noon_et",
):
    if not title:
        return None

    match = TITLE_DATE_PATTERN.search(title)
    if not match:
        return None

    month_name, day_text, year_text = match.groups()
    month_number = MONTH_NAME_TO_NUMBER.get(month_name.lower())
    if month_number is None:
        return None

    fallback_end_dt = _parse_iso_datetime(fallback_end_date)
    inferred_year = int(year_text) if year_text else (
        fallback_end_dt.astimezone(NEW_YORK_TZ).year if fallback_end_dt else datetime.now(NEW_YORK_TZ).year
    )
    try:
        if settlement_mode == "end_of_day_et":
            local_dt = datetime(inferred_year, month_number, int(day_text), 0, 0, 0, tzinfo=NEW_YORK_TZ) + timedelta(days=1)
        else:
            local_dt = datetime(inferred_year, month_number, int(day_text), 12, 0, 0, tzinfo=NEW_YORK_TZ)
    except ValueError:
        return None
    return local_dt.astimezone(timezone.utc)


def _infer_month_window(title: str | None, fallback_end_date: str | None):
    if not title:
        return None

    match = TITLE_MONTH_WINDOW_PATTERN.search(title)
    if not match:
        return None

    month_name, year_text = match.groups()
    month_number = MONTH_NAME_TO_NUMBER.get(month_name.lower())
    if month_number is None:
        return None

    fallback_end_dt = _parse_iso_datetime(fallback_end_date)
    inferred_year = int(year_text) if year_text else (
        fallback_end_dt.astimezone(NEW_YORK_TZ).year if fallback_end_dt else datetime.now(NEW_YORK_TZ).year
    )

    try:
        local_start = datetime(inferred_year, month_number, 1, 0, 0, 0, tzinfo=NEW_YORK_TZ)
        if month_number == 12:
            next_month_local = datetime(inferred_year + 1, 1, 1, 0, 0, 0, tzinfo=NEW_YORK_TZ)
        else:
            next_month_local = datetime(inferred_year, month_number + 1, 1, 0, 0, 0, tzinfo=NEW_YORK_TZ)
    except ValueError:
        return None

    local_end = next_month_local - timedelta(minutes=1)
    return {
        "start": local_start.astimezone(timezone.utc),
        "end": local_end.astimezone(timezone.utc),
        "settlement": next_month_local.astimezone(timezone.utc),
        "label": f"{local_start.strftime('%b %-d, %Y %I:%M %p ET')} → {local_end.strftime('%b %-d, %Y %I:%M %p ET')}",
    }


def _resolve_settlement_datetime(event_to_analyze: dict, event):
    event_title = str(event_to_analyze.get("title") or getattr(event, "title", "") or "")
    title_lower = event_title.lower()
    fallback_end_date = event_to_analyze.get("endDate") or getattr(event, "end_date", None)

    monthly_window = _infer_month_window(event_title, fallback_end_date)
    if monthly_window is not None and "hit" in title_lower:
        return {
            "datetime": monthly_window["settlement"],
            "label": monthly_window["settlement"].astimezone(NEW_YORK_TZ).strftime("%b %-d, %Y %I:%M %p ET"),
            "source": "title_inferred_month_window_et",
            "window_start": monthly_window["start"],
            "window_end": monthly_window["end"],
            "window_label": monthly_window["label"],
        }

    settlement_mode = "end_of_day_et" if "hit" in title_lower else "noon_et"
    title_settlement_dt = _infer_title_settlement_datetime(
        event_title,
        fallback_end_date,
        settlement_mode=settlement_mode,
    )
    if title_settlement_dt is not None:
        return {
            "datetime": title_settlement_dt,
            "label": title_settlement_dt.astimezone(NEW_YORK_TZ).strftime("%b %-d, %Y %I:%M %p ET"),
            "source": f"title_inferred_{settlement_mode}",
            "window_start": None,
            "window_end": None,
            "window_label": None,
        }

    fallback_dt = _parse_iso_datetime(fallback_end_date)
    if fallback_dt is not None:
        return {
            "datetime": fallback_dt,
            "label": fallback_dt.astimezone(NEW_YORK_TZ).strftime("%b %-d, %Y %I:%M %p ET"),
            "source": "event_end_date",
            "window_start": None,
            "window_end": None,
            "window_label": None,
        }

    return {
        "datetime": None,
        "label": None,
        "source": "unavailable",
        "window_start": None,
        "window_end": None,
        "window_label": None,
    }


def _infer_rolling_steps(settlement_dt: datetime | None, rolling_unit: str, fallback_steps: int) -> int:
    if settlement_dt is None:
        return fallback_steps

    now_utc = datetime.now(timezone.utc)
    remaining_seconds = max(0.0, (settlement_dt - now_utc).total_seconds())
    if remaining_seconds <= 0:
        return max(1, fallback_steps)

    unit_seconds = {
        "days": 86_400,
        "hours": 3_600,
        "minutes": 60,
    }.get(rolling_unit, 86_400)

    return max(1, math.ceil(remaining_seconds / unit_seconds))


def _format_remaining_horizon(settlement_dt: datetime | None) -> str | None:
    if settlement_dt is None:
        return None

    remaining_seconds = max(0, int(math.ceil((settlement_dt - datetime.now(timezone.utc)).total_seconds())))
    if remaining_seconds <= 0:
        return "expired"

    days, remainder = divmod(remaining_seconds, 86_400)
    hours, remainder = divmod(remainder, 3_600)
    minutes, _ = divmod(remainder, 60)

    parts: list[str] = []
    if days:
        parts.append(f"{days} day{'s' if days != 1 else ''}")
    if hours:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes or not parts:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")

    return " ".join(parts[:2])


def _build_horizon_metadata(
    settlement_info: dict,
    rolling_unit: str,
    requested_steps: int,
    applied_steps: int,
    use_auto_horizon: bool,
) -> dict:
    unit_label = rolling_unit[:-1] if rolling_unit.endswith("s") else rolling_unit
    inferred_display = _format_remaining_horizon(settlement_info.get("datetime"))
    effective_mode = "auto" if use_auto_horizon and inferred_display and inferred_display != "expired" else "manual"

    if effective_mode == "auto":
        analysis_horizon_label = (
            f"Auto horizon: {inferred_display} ({applied_steps} {unit_label} step"
            f"{'s' if applied_steps != 1 else ''})"
        )
    else:
        reason_suffix = " (auto inference unavailable)" if use_auto_horizon and inferred_display == "expired" else ""
        analysis_horizon_label = (
            f"Manual horizon: {applied_steps} {unit_label} step"
            f"{'s' if applied_steps != 1 else ''}{reason_suffix}"
        )

    return {
        "mode": effective_mode,
        "rolling_unit": rolling_unit,
        "requested_steps": requested_steps,
        "applied_steps": applied_steps,
        "end_date": settlement_info.get("datetime").isoformat() if settlement_info.get("datetime") else None,
        "inferred_display": inferred_display,
        "label": analysis_horizon_label,
        "settlement_label": settlement_info.get("label"),
        "settlement_source": settlement_info.get("source"),
        "window_start": settlement_info.get("window_start").isoformat() if settlement_info.get("window_start") else None,
        "window_end": settlement_info.get("window_end").isoformat() if settlement_info.get("window_end") else None,
        "window_label": settlement_info.get("window_label"),
    }


def _window_fetch_date_range(window_start_iso: str | None) -> tuple[str, str] | None:
    if not window_start_iso:
        return None

    start_dt = _parse_iso_datetime(window_start_iso)
    if start_dt is None:
        return None

    now_utc = datetime.now(timezone.utc)
    if now_utc <= start_dt:
        return None

    start_str = start_dt.astimezone(timezone.utc).strftime("%Y-%m-%d")
    end_str = (now_utc + timedelta(days=1)).strftime("%Y-%m-%d")
    return start_str, end_str


def _should_prefer_direct_binance(event, event_to_analyze: dict, request_data: dict) -> bool:
    if not bool(request_data.get("preferDirectBinance", True)):
        return False
    if event is None or event.coin_tag is None:
        return False
    if not supports_direct_binance(event.coin_tag.label):
        return False

    combined = " ".join(
        [
            str(event.title),
            str(event_to_analyze.get("title", "")),
            str(event_to_analyze.get("slug", "")),
        ]
    ).lower()
    return any(token in combined for token in ["bitcoin", "ethereum", "solana", "ripple", "xrp", "price on", "above", "below", "hit"])


@app.route('/events', methods=["GET"])
def event_slugs():
    coin: Coin = Coin.from_label(request.args.get('coin', None))
    slug: str = request.args.get('slug', None)

    if coin and slug:
        raise ValueError("Cannot specify both slug and coin")

    if coin:
        # Primary method
        events = events_by_coin(coin)

        # Add fallback events
        events += get_fallback_events_for_coin(coin)

        # Deduplicate by slug
        seen = set()
        deduped_events = []
        for event in events:
            if event.slug not in seen:
                seen.add(event.slug)
                deduped_events.append(event)

        result = [event.to_dict() for event in deduped_events]

    elif slug:
        event = safe_get_event_by_slug(slug)
        if event is None:
            event = safe_get_event_by_market_slug(slug)

        if event is None:
            return jsonify({"error": f"No event or market found for slug '{slug}'"}), 404

        result = [event.to_dict()]

    else:
        raise ValueError("Must specify either slug or coin")

    return Response(json.dumps(result, sort_keys=False), mimetype='application/json')


@app.route('/ticker-prices', methods=["GET"])
def ticker_prices():
    tickers = request.args.get('tickers', None)

    coins: List[Coin] = []
    for ticker in tickers.split(','):
        coins.append(Coin.from_label(ticker))

    result = {}
    for key, value in get_ticker_prices(coins).items():
        result[key.label] = value

    return result


@app.route('/extract-threshold', methods=["GET"])
def extract_threshold():
    question = request.args.get('question', None)

    computed_threshold = extract_threshold_from_question(question)

    return jsonify({
        'threshold': computed_threshold
    })


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}

    try:
        date_ranges = [DateRange(x['start'], x['end']) for x in data.get('dateRanges', [])]
        thresholds_by_question: dict = data.get('thresholdsByQuestion', {})
        raw_event_to_analyze = data.get('eventToAnalyze')
        days: int = int(data.get('days', 0))
        momentum_confluence: dict = data.get('momentumConfluence', None)
        rolling_unit: str = data.get('rollingUnit', 'days')
        use_hit_logic: bool = bool(data.get('use_hit_logic', False))
    except (TypeError, ValueError, KeyError) as exc:
        return jsonify({"error": f"Invalid request payload: {exc}"}), 400

    event_to_analyze = _normalize_event_to_analyze(raw_event_to_analyze)
    if event_to_analyze is None:
        return jsonify({"error": "eventToAnalyze must be a string or object"}), 400

    if not event_to_analyze.get("slug"):
        return jsonify({"error": "eventToAnalyze.slug is required"}), 400

    try:
        return run_analysis(
            date_ranges,
            thresholds_by_question,
            event_to_analyze,
            days,
            momentum_confluence,
            rolling_unit,
            use_hit_logic
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Unexpected analysis failure: {exc}"}), 500


@app.route("/research/analyze", methods=["POST"])
def research_analyze():
    data = request.get_json() or {}
    if data.get("contracts"):
        return jsonify(
            run_research_analysis(
                contracts=data.get("contracts", []),
                historical_rows=data.get("historicalRows", []),
                confidence_quantile=float(data.get("confidenceQuantile", 0.20)),
                slippage=float(data.get("slippage", 0.02)),
            )
        )

    date_ranges = [DateRange(x['start'], x['end']) for x in data.get('dateRanges', [])]
    thresholds_by_question: dict = data.get('thresholdsByQuestion', {})
    event_to_analyze: dict = data.get('eventToAnalyze', {})

    if not event_to_analyze or not event_to_analyze.get("slug"):
        return jsonify({"error": "eventToAnalyze.slug is required for legacy research analysis"}), 400

    event = safe_get_event_by_slug(event_to_analyze["slug"])
    if event is None:
        event = safe_get_event_by_market_slug(event_to_analyze["slug"])
    if event is None:
        return jsonify({"error": f"Could not resolve event for slug '{event_to_analyze['slug']}'"}), 400
    historical_candles = []
    rolling_unit = data.get('rollingUnit', 'days')
    requested_steps = int(data.get('days', 8))
    settlement_info = _resolve_settlement_datetime(event_to_analyze, event)
    use_auto_horizon = bool(data.get("autoRollingSteps", True))
    rolling_steps = _infer_rolling_steps(settlement_info.get("datetime"), rolling_unit, requested_steps) if use_auto_horizon else requested_steps
    horizon_metadata = _build_horizon_metadata(
        settlement_info,
        rolling_unit,
        requested_steps,
        rolling_steps,
        use_auto_horizon,
    )
    history_source_label = "CoinAPI proxy candles"
    prefer_direct_binance = _should_prefer_direct_binance(event, event_to_analyze, data)
    direct_binance_interval = {'days': '1d', 'hours': '1h', 'minutes': '1m'}.get(rolling_unit, '1m')
    direct_binance_error = None

    if prefer_direct_binance:
        try:
            for date_range in date_ranges:
                historical_candles += fetch_binance_candles(event.coin_tag.label, date_range.start, date_range.end, rolling_unit)
            current_price = get_binance_ticker_price(event.coin_tag.label)
            history_source_label = f"Direct Binance {direct_binance_interval} candles"
        except Exception as exc:
            direct_binance_error = str(exc)
            historical_candles = []

    if not historical_candles:
        for date_range in date_ranges:
            historical_candles += fetch_candles(event.coin_tag.label, date_range.start, date_range.end, rolling_unit)
        current_price = get_ticker_prices([event.coin_tag])[event.coin_tag]
        if direct_binance_error:
            history_source_label = (
                f"CoinAPI proxy candles (direct Binance unavailable: {direct_binance_error})"
            )

    current_window_candles = None
    current_window_range = _window_fetch_date_range(horizon_metadata.get("window_start"))
    if current_window_range is not None:
        window_start_str, window_end_str = current_window_range
        try:
            if prefer_direct_binance and supports_direct_binance(event.coin_tag.label):
                current_window_candles = fetch_binance_candles(
                    event.coin_tag.label,
                    window_start_str,
                    window_end_str,
                    rolling_unit,
                )
            else:
                current_window_candles = fetch_candles(
                    event.coin_tag.label,
                    window_start_str,
                    window_end_str,
                    rolling_unit,
                )
        except Exception:
            current_window_candles = None

    return jsonify(
        run_research_analysis_from_legacy(
            event_to_analyze=event_to_analyze,
            event_markets=event.markets,
            thresholds_by_question=thresholds_by_question,
            historical_candles=historical_candles,
            current_window_candles=current_window_candles,
            current_price=current_price,
            rolling_steps=rolling_steps,
            confidence_quantile=float(data.get("confidenceQuantile", 0.20)),
            slippage=float(data.get("slippage", 0.02)),
            history_source_label=history_source_label,
            horizon_metadata=horizon_metadata,
        )
    )


@app.route("/research/backtest", methods=["POST"])
def research_backtest():
    data = request.get_json() or {}
    return jsonify(
        run_research_backtest(
            scored_contracts=data.get("scoredContracts", []),
            edge_threshold=float(data.get("edgeThreshold", 0.01)),
            stake_usd=float(data.get("stakeUsd", 100.0)),
            max_concurrent_trades=int(data.get("maxConcurrentTrades", 2)),
            max_active_per_family=int(data.get("maxActivePerFamily", 1)),
        )
    )



# Dashboard

@app.route("/api/m2", methods=["GET"])
def get_m2_data():
    raw_data = fetch_m2_series()
    yoy_data = calculate_yoy_growth(raw_data)
    summary = generate_summary_string(yoy_data)
    return {
        "data": yoy_data,
        "summary": summary
    }

@app.route("/api/btc-social-score", methods=["GET"])
def get_btc_social_score():
    days = int(request.args.get("days", 30))
    data = fetch_btc_social_score(days=days)
    return jsonify(data)

@app.route("/api/dxy", methods=["GET"])
def get_dxy_data():
    raw_data = fetch_dxy_series()
    yoy_data = calc_dxy_yoy(raw_data)
    summary = dxy_summary(yoy_data)
    return {
        "data": yoy_data,
        "summary": summary
    }

@app.route("/api/ssr", methods=["GET"])
def get_ssr():
    return calculate_ssr()


if __name__ == "__main__":
    app.run(port=5001, debug=True)
