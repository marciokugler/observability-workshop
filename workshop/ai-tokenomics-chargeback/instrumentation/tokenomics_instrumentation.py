"""OpenTelemetry helpers for AI tokenomics and chargeback workshops.

The helper enriches the active AI span with low-cardinality owner dimensions, token
usage, and an optional internal cost estimate. It intentionally avoids prompt text, raw
user identifiers, session IDs, and request IDs.

Splunk AI Agent Monitoring should be the first place to look for token usage and
estimated cost. These helpers fill the attribution gap that the platform cannot infer
from an LLM response: business unit, cost center, tenant, workload, and outcome.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, MutableMapping

from opentelemetry import trace

REQUIRED_DIMENSIONS = (
    "ai.team",
    "ai.business_unit",
    "ai.cost_center",
    "ai.tenant.id",
    "ai.user.id",
    "ai.workload.name",
    "ai.product_area",
    "ai.outcome.category",
    "deployment.environment",
    "gen_ai.request.model",
)

UNKNOWN = "unknown"


@dataclass(frozen=True)
class TokenRate:
    input_usd_per_1k: float
    output_usd_per_1k: float


DEFAULT_RATE_CARD: Mapping[str, TokenRate] = {
    "meta/llama-3.2-1b-instruct": TokenRate(
        input_usd_per_1k=0.0000013,
        output_usd_per_1k=0.0000158,
    ),
    "default": TokenRate(
        input_usd_per_1k=0.0000013,
        output_usd_per_1k=0.0000158,
    ),
}


def dimensions_from_headers(
    headers: Mapping[str, str],
    defaults: Mapping[str, str] | None = None,
) -> dict[str, str]:
    """Build safe chargeback dimensions from request headers and defaults."""

    defaults = defaults or {}
    dimensions = {
        "ai.team": headers.get("x-ai-team") or defaults.get("ai.team", UNKNOWN),
        "ai.business_unit": headers.get("x-ai-business-unit")
        or defaults.get("ai.business_unit", UNKNOWN),
        "ai.cost_center": headers.get("x-ai-cost-center")
        or defaults.get("ai.cost_center", UNKNOWN),
        "ai.tenant.id": headers.get("x-ai-tenant-id")
        or defaults.get("ai.tenant.id", UNKNOWN),
        "ai.user.id": headers.get("x-ai-user-id")
        or defaults.get("ai.user.id", UNKNOWN),
        "ai.workload.name": defaults.get("ai.workload.name", UNKNOWN),
        "ai.product_area": defaults.get("ai.product_area", UNKNOWN),
        "ai.outcome.category": headers.get("x-ai-outcome-category")
        or defaults.get("ai.outcome.category", UNKNOWN),
        "deployment.environment": defaults.get("deployment.environment", UNKNOWN),
    }
    return normalize_dimensions(dimensions)


def normalize_dimensions(dimensions: Mapping[str, str]) -> dict[str, str]:
    """Return bounded, string-only business attributes."""

    normalized: MutableMapping[str, str] = {}
    for key in REQUIRED_DIMENSIONS:
        value = dimensions.get(key, UNKNOWN)
        normalized[key] = _safe_dimension_value(value)
    return dict(normalized)


def estimate_request_cost_usd(
    prompt_tokens: int,
    completion_tokens: int,
    model: str,
    rate_card: Mapping[str, TokenRate] = DEFAULT_RATE_CARD,
) -> float:
    """Estimate request cost from a simple per-1k-token rate card."""

    rate = rate_card.get(model, rate_card["default"])
    input_cost = (prompt_tokens / 1000.0) * rate.input_usd_per_1k
    output_cost = (completion_tokens / 1000.0) * rate.output_usd_per_1k
    return input_cost + output_cost


def record_llm_chargeback(
    *,
    prompt_tokens: int,
    completion_tokens: int,
    model: str,
    dimensions: Mapping[str, str],
    rate_card: Mapping[str, TokenRate] = DEFAULT_RATE_CARD,
) -> float:
    """Attach attribution, usage, and internal cost attributes to the active span.

    Supported AI instrumentation can populate token usage and cost views without these
    custom metrics. The local Ollama path is intentionally minimal: it records token
    counts as span attributes because the response contains the usage numbers, then
    adds business context so Splunk dashboards can answer "who owns this request?"
    """

    total_tokens = prompt_tokens + completion_tokens
    attributes = normalize_dimensions(
        {
            **dimensions,
            "gen_ai.request.model": model,
        }
    )
    estimated_cost = estimate_request_cost_usd(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        model=model,
        rate_card=rate_card,
    )

    span = trace.get_current_span()
    if span and span.is_recording():
        for key, value in attributes.items():
            span.set_attribute(key, value)
        span.set_attribute("gen_ai.usage.prompt_tokens", prompt_tokens)
        span.set_attribute("gen_ai.usage.completion_tokens", completion_tokens)
        span.set_attribute("gen_ai.usage.input_tokens", prompt_tokens)
        span.set_attribute("gen_ai.usage.output_tokens", completion_tokens)
        span.set_attribute("gen_ai.usage.total_tokens", total_tokens)
        span.set_attribute("ai.request.estimated_cost_usd", estimated_cost)

    return estimated_cost


def _safe_dimension_value(value: object) -> str:
    text = str(value or UNKNOWN).strip().lower()
    if not text:
        return UNKNOWN
    return text[:128]
