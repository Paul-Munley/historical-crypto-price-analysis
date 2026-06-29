from __future__ import annotations

from dataclasses import dataclass
import re


@dataclass(slots=True)
class SemanticsSpec:
    mode: str
    uses_intraday_high: bool
    uses_intraday_low: bool
    uses_close_only: bool
    comparison: str
    target_price: float | None = None
    lower_bound: float | None = None
    upper_bound: float | None = None
    threshold_label: str | None = None
    outcome_yes_label: str = "Yes"
    outcome_no_label: str = "No"


def _extract_price_levels(*texts: str) -> list[float]:
    values: list[float] = []
    seen: set[float] = set()
    dollar_pattern = re.compile(r"\$\s*((?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.(\d+))?")
    fallback_pattern = re.compile(r"(?<!\d)(\d{4,6})(?!\d)")

    for text in texts:
        if not text:
            continue
        for whole, decimal in dollar_pattern.findall(text):
            normalized = whole.replace(",", "")
            value = float(f"{normalized}.{decimal}" if decimal else normalized)
            if value in seen:
                continue
            seen.add(value)
            values.append(value)

    if values:
        return values

    for text in texts:
        if not text:
            continue
        for match in fallback_pattern.findall(text):
            value = float(str(match).replace(",", ""))
            if value in seen:
                continue
            seen.add(value)
            values.append(value)
    return values


def _fmt_price(value: float | None) -> str | None:
    if value is None:
        return None
    return f"{int(round(value)):,}"


def infer_semantics_from_question(
    question: str,
    *,
    event_title: str = "",
    slug: str = "",
    outcome_yes_label: str = "Yes",
    outcome_no_label: str = "No",
) -> SemanticsSpec:
    q = (question or "").lower()
    title = (event_title or "").lower()
    slug_text = (slug or "").lower()
    combined = " ".join([title, q, slug_text]).strip()
    levels = _extract_price_levels(question or "", slug or "")

    if outcome_yes_label.lower() == "up" and outcome_no_label.lower() == "down":
        return SemanticsSpec(
            mode="direction_up",
            uses_intraday_high=False,
            uses_intraday_low=False,
            uses_close_only=True,
            comparison=">=",
            threshold_label="Up/Down",
            outcome_yes_label=outcome_yes_label,
            outcome_no_label=outcome_no_label,
        )

    if "price on" in combined or "final close price" in combined:
        if "between" in q and len(levels) >= 2:
            lower_bound, upper_bound = sorted(levels[:2])
            return SemanticsSpec(
                mode="close_range",
                uses_intraday_high=False,
                uses_intraday_low=False,
                uses_close_only=True,
                comparison="range",
                lower_bound=lower_bound,
                upper_bound=upper_bound,
                threshold_label=f"{_fmt_price(lower_bound)}-{_fmt_price(upper_bound)}",
                outcome_yes_label=outcome_yes_label,
                outcome_no_label=outcome_no_label,
            )
        if ("<" in q or "below" in q or "under" in q) and levels:
            upper_bound = levels[0]
            return SemanticsSpec(
                mode="close_range",
                uses_intraday_high=False,
                uses_intraday_low=False,
                uses_close_only=True,
                comparison="range",
                upper_bound=upper_bound,
                threshold_label=f"<{_fmt_price(upper_bound)}",
                outcome_yes_label=outcome_yes_label,
                outcome_no_label=outcome_no_label,
            )
        if (">" in q or "above" in q or "over" in q) and levels:
            lower_bound = levels[0]
            return SemanticsSpec(
                mode="close_range",
                uses_intraday_high=False,
                uses_intraday_low=False,
                uses_close_only=True,
                comparison="range",
                lower_bound=lower_bound,
                threshold_label=f">{_fmt_price(lower_bound)}",
                outcome_yes_label=outcome_yes_label,
                outcome_no_label=outcome_no_label,
            )

    if "hit" in combined or "reach" in combined or "↑" in combined or "↓" in combined:
        target = levels[0] if levels else None
        if "↓" in combined or "below" in combined or "under" in combined:
            return SemanticsSpec(
                mode="hit_low",
                uses_intraday_high=False,
                uses_intraday_low=True,
                uses_close_only=False,
                comparison="<=",
                target_price=target,
                threshold_label=_fmt_price(target),
                outcome_yes_label=outcome_yes_label,
                outcome_no_label=outcome_no_label,
            )
        return SemanticsSpec(
            mode="hit_high",
            uses_intraday_high=True,
            uses_intraday_low=False,
            uses_close_only=False,
            comparison=">=",
            target_price=target,
            threshold_label=_fmt_price(target),
            outcome_yes_label=outcome_yes_label,
            outcome_no_label=outcome_no_label,
        )

    if "dip" in combined or "below" in combined or "under" in combined:
        target = levels[0] if levels else None
        return SemanticsSpec(
            mode="close_below",
            uses_intraday_high=False,
            uses_intraday_low=False,
            uses_close_only=True,
            comparison="<",
            target_price=target,
            threshold_label=_fmt_price(target),
            outcome_yes_label=outcome_yes_label,
            outcome_no_label=outcome_no_label,
        )

    if "above" in combined or "over" in combined:
        target = levels[0] if levels else None
        return SemanticsSpec(
            mode="close_above",
            uses_intraday_high=False,
            uses_intraday_low=False,
            uses_close_only=True,
            comparison=">",
            target_price=target,
            threshold_label=_fmt_price(target),
            outcome_yes_label=outcome_yes_label,
            outcome_no_label=outcome_no_label,
        )

    return SemanticsSpec(
        mode="close_to_close",
        uses_intraday_high=False,
        uses_intraday_low=False,
        uses_close_only=True,
        comparison=">=",
        outcome_yes_label=outcome_yes_label,
        outcome_no_label=outcome_no_label,
    )


def _scaled_level(level: float | None, start_price: float, current_price: float) -> float | None:
    if level is None or start_price <= 0 or current_price <= 0:
        return level
    return start_price * (level / current_price)


def outcome_occurs(
    semantics: SemanticsSpec,
    start_price: float,
    target_price: float,
    end_price: float,
    high_price: float | None = None,
    low_price: float | None = None,
    current_price: float | None = None,
) -> bool:
    current_spot = current_price if current_price is not None else start_price

    if semantics.mode == "direction_up":
        return end_price >= start_price

    if semantics.mode == "close_range":
        scaled_lower = _scaled_level(semantics.lower_bound, start_price, current_spot)
        scaled_upper = _scaled_level(semantics.upper_bound, start_price, current_spot)
        if scaled_lower is not None and end_price < scaled_lower:
            return False
        if scaled_upper is not None and end_price >= scaled_upper:
            return False
        return True

    scaled_target = _scaled_level(
        semantics.target_price if semantics.target_price is not None else target_price,
        start_price,
        current_spot,
    )
    if scaled_target is None:
        scaled_target = target_price

    if semantics.mode == "hit_high":
        reference_price = high_price if high_price is not None else end_price
        return reference_price >= scaled_target
    if semantics.mode == "hit_low":
        reference_price = low_price if low_price is not None else end_price
        return reference_price <= scaled_target
    if semantics.mode == "close_below":
        return end_price < scaled_target
    if semantics.mode == "close_above":
        return end_price > scaled_target
    if semantics.comparison == "<=":
        return end_price <= scaled_target
    return end_price >= scaled_target